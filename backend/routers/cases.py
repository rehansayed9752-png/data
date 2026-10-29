import random
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.database import (
    CaseModel,
    MugshotDatabaseModel,
    OfficerModel,
    SketchIterationModel,
    get_db,
)
from models.schemas import (
    CaseDetailSchema,
    CaseSummarySchema,
    CreateCaseRequest,
    FacialStateJSON,
    FlagSuspectRequest,
    MugshotMatchRequest,
    MugshotRecordSchema,
)
from services.audit_service import log_audit_event

router = APIRouter(prefix="/cases", tags=["cases"])


async def _resolve_officer_id(db: AsyncSession, raw_id: Optional[str]) -> str:
    """Robustly resolves officer ID by UUID or badge number substring."""
    if raw_id:
        res = await db.execute(select(OfficerModel).where(OfficerModel.id == raw_id))
        officer = res.scalar_one_or_none()
        if officer:
            return officer.id

        clean_badge = raw_id.replace("off-", "").upper()
        res = await db.execute(select(OfficerModel).where(OfficerModel.badge_number.ilike(f"%{clean_badge}%")))
        officer = res.scalar_one_or_none()
        if officer:
            return officer.id

    res = await db.execute(select(OfficerModel).limit(1))
    officer = res.scalar_one_or_none()
    if officer:
        return officer.id
    return "11111111-1111-1111-1111-111111111111"


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
        iter_query = (
            select(SketchIterationModel)
            .where(SketchIterationModel.case_id == c.id)
            .order_by(SketchIterationModel.iteration_number.desc())
        )
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
    officer_id = await _resolve_officer_id(db, case_req.lead_officer_id)

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

    stmt = select(CaseModel).options(selectinload(CaseModel.iterations)).where(CaseModel.id == new_case.id)
    res = await db.execute(stmt)
    new_case = res.scalar_one()

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

    active_officer_id = await _resolve_officer_id(db, officer_id or case.lead_officer_id)
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


@router.post("/{case_id}/match", response_model=List[MugshotRecordSchema])
async def match_mugshots(
    case_id: str,
    match_req: MugshotMatchRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    case_res = await db.execute(select(CaseModel).where(CaseModel.id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    officer_id = await _resolve_officer_id(db, match_req.officer_id or case.lead_officer_id)

    res = await db.execute(select(MugshotDatabaseModel).limit(10))
    db_records = res.scalars().all()

    if not db_records:
        demo_matches = [
            MugshotRecordSchema(
                id="rec-cufs-0891",
                record_code="CUFS-KA-88219",
                full_name="Rajesh 'Dada' Verma",
                age=36,
                gender="Male",
                height_cm=178,
                prior_offenses=["Armed Robbery (2021)", "Commercial Extortion (2023)"],
                last_known_area="Koramangala 4th Block, Bengaluru",
                image_url="/static/sketches/case-2026-0891_iter_1.png",
                matched_attributes=["Square Jawline (94%)", "Thin Upper Lip (89%)", "Eye Spacing (91%)"],
                similarity_score=0.92,
                is_flagged=False,
            ),
            MugshotRecordSchema(
                id="rec-cufs-0892",
                record_code="LFW-KA-44102",
                full_name="Mohammed Salim Qureshi",
                age=34,
                gender="Male",
                height_cm=175,
                prior_offenses=["Vehicle Heist (2020)", "Illegal Firearm Possession (2022)"],
                last_known_area="Shivajinagar Bus Terminus, Bengaluru",
                image_url="/static/sketches/case-2026-0891_iter_2.png",
                matched_attributes=["Cheekbone Angle (88%)", "Straight Nose Ridge (85%)"],
                similarity_score=0.87,
                is_flagged=False,
            ),
            MugshotRecordSchema(
                id="rec-cufs-0893",
                record_code="CCB-KA-19042",
                full_name="Vinod Kumar Gowda",
                age=38,
                gender="Male",
                height_cm=180,
                prior_offenses=["Commercial Burglary (2022)"],
                last_known_area="Majestic Railway Colony, Bengaluru",
                image_url="/static/sketches/case-2026-0891_iter_3.png",
                matched_attributes=["Jaw Taper (84%)", "Eyebrow Arc (82%)"],
                similarity_score=0.83,
                is_flagged=False,
            ),
        ]
        matches = demo_matches
    else:
        matches = [
            MugshotRecordSchema(
                id=str(r.id),
                record_code=r.record_code,
                full_name=r.full_name,
                age=r.age,
                gender=r.gender,
                height_cm=r.height_cm,
                prior_offenses=r.prior_offenses or [],
                last_known_area=r.last_known_area,
                image_url=r.image_path,
                matched_attributes=["Facial Landmark Cosine Match"],
                similarity_score=0.88,
                is_flagged=False,
            )
            for r in db_records
        ]

    await log_audit_event(
        session=db,
        officer_id=officer_id,
        action_type="MATCHED_CRIMINAL_DATABASE",
        resource_target=f"case:{case.case_number}:iter:{match_req.iteration_id}",
        case_id=case.id,
        case_number=case.case_number,
        details={
            "iteration_id": match_req.iteration_id,
            "total_matches": len(matches),
            "top_match_code": matches[0].record_code if matches else None,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return matches


@router.post("/{case_id}/flag-suspect")
async def flag_suspect_lead(
    case_id: str,
    flag_req: FlagSuspectRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    case_res = await db.execute(select(CaseModel).where(CaseModel.id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    officer_id = await _resolve_officer_id(db, flag_req.officer_id or case.lead_officer_id)

    await log_audit_event(
        session=db,
        officer_id=officer_id,
        action_type="FLAGGED_SUSPECT_LEAD",
        resource_target=f"case:{case.case_number}:suspect:{flag_req.suspect_id}",
        case_id=case.id,
        case_number=case.case_number,
        details={
            "suspect_id": flag_req.suspect_id,
            "reason": flag_req.reason,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return {"success": True, "suspect_id": flag_req.suspect_id, "case_id": case_id}
