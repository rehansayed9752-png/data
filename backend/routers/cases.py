import random
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.database import CaseModel, OfficerModel, SketchIterationModel, get_db
from models.schemas import (
    CaseDetailSchema,
    CaseSummarySchema,
    CreateCaseRequest,
    FacialStateJSON,
)
from services.audit_service import log_audit_event

router = APIRouter(prefix="/cases", tags=["cases"])

@router.get("", response_model=List[CaseSummarySchema])
async def list_cases(
    request: Request,
    officer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(CaseModel).order_by(CaseModel.created_at.desc())
    if status:
        query = query.where(CaseModel.status == status)

    result = await db.execute(query)
    cases = result.scalars().all()

    summaries = []
    for c in cases:
        # Get count and latest iteration image
        iter_query = select(SketchIterationModel).where(SketchIterationModel.case_id == c.id).order_by(SketchIterationModel.iteration_number.desc())
        iter_res = await db.execute(iter_query)
        iterations = iter_res.scalars().all()
        latest_img = iterations[0].image_url if iterations else None

        summaries.append(
            CaseSummarySchema(
                id=c.id,
                case_number=c.case_number,
                title=c.title,
                incident_date=c.incident_date,
                location=c.location,
                witness_alias=c.witness_alias,
                status=c.status,
                render_style=c.render_style,
                case_seed=c.case_seed,
                current_iteration_id=c.current_iteration_id,
                latest_image_url=latest_img,
                iteration_count=len(iterations),
                created_at=c.created_at,
            )
        )
    return summaries

@router.post("", response_model=CaseDetailSchema, status_code=201)
async def create_case(
    case_req: CreateCaseRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Pick lead officer (or fallback to first seeded officer)
    officer_id = case_req.lead_officer_id
    if not officer_id:
        officer_res = await db.execute(select(OfficerModel).limit(1))
        lead_officer = officer_res.scalar_one_or_none()
        if not lead_officer:
            raise HTTPException(status_code=500, detail="No officers configured in database.")
        officer_id = lead_officer.id

    case_id = str(uuid.uuid4())
    random_num = random.randint(1000, 9999)
    case_number = f"CASE-2026-{random_num}"
    case_seed = random.randint(100000, 999999999)

    initial_facial_state = FacialStateJSON().model_dump()

    new_case = CaseModel(
        id=case_id,
        case_number=case_number,
        title=case_req.title,
        location=case_req.location,
        witness_alias=case_req.witness_alias,
        render_style=case_req.render_style,
        case_seed=case_seed,
        current_facial_state=initial_facial_state,
        lead_officer_id=officer_id,
    )
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)

    # Log to audit log
    await log_audit_event(
        session=db,
        officer_id=officer_id,
        action_type="CREATED_CASE_FILE",
        resource_target=f"case:{case_number}",
        case_id=case_id,
        case_number=case_number,
        details={
            "title": case_req.title,
            "location": case_req.location,
            "witness_alias": case_req.witness_alias,
            "render_style": case_req.render_style,
            "case_seed": case_seed,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return new_case

@router.get("/{case_id}", response_model=CaseDetailSchema)
async def get_case(
    case_id: str,
    request: Request,
    officer_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(CaseModel)
        .options(selectinload(CaseModel.iterations))
        .where(CaseModel.id == case_id)
    )
    result = await db.execute(query)
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case file not found")

    # Audit view
    active_officer_id = officer_id or case.lead_officer_id
    await log_audit_event(
        session=db,
        officer_id=active_officer_id,
        action_type="OPENED_CASE_FILE",
        resource_target=f"case:{case.case_number}",
        case_id=case.id,
        case_number=case.case_number,
        details={"iteration_count": len(case.iterations)},
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return case
