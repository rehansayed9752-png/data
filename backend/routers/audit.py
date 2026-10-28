from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AccessAuditLogModel, get_db
from models.schemas import AuditLogItemSchema, VerifyAuditChainResponse
from services.audit_service import GENESIS_HASH, compute_audit_hash, log_audit_event

router = APIRouter(prefix="/audit-logs", tags=["audit"])

@router.get("", response_model=List[AuditLogItemSchema])
async def get_audit_logs(
    case_id: Optional[str] = Query(None),
    officer_id: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(AccessAuditLogModel).order_by(AccessAuditLogModel.seq_id.desc()).limit(limit)
    if case_id:
        query = query.where(AccessAuditLogModel.case_id == case_id)
    if officer_id:
        query = query.where(AccessAuditLogModel.officer_id == officer_id)
    if action_type:
        query = query.where(AccessAuditLogModel.action_type == action_type)

    result = await db.execute(query)
    logs = result.scalars().all()
    return logs

@router.get("/verify-chain", response_model=VerifyAuditChainResponse)
async def verify_chain(
    request: Request,
    officer_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Recalculates every SHA-256 hash in sequence to verify cryptographic integrity.
    """
    query = select(AccessAuditLogModel).order_by(AccessAuditLogModel.seq_id.asc())
    result = await db.execute(query)
    records = result.scalars().all()

    tampered_ids: List[int] = []
    latest_hash = GENESIS_HASH

    for i, row in enumerate(records):
        expected_prev_hash = GENESIS_HASH if i == 0 else records[i - 1].row_hash
        if row.prev_hash != expected_prev_hash:
            tampered_ids.append(row.seq_id)

        # Recalculate row hash
        calc_hash = compute_audit_hash(
            prev_hash=row.prev_hash,
            officer_id=row.officer_id,
            case_id=row.case_id,
            action_type=row.action_type,
            timestamp_iso=row.created_at.isoformat(),
            details=row.details_json,
        )

        if calc_hash != row.row_hash:
            tampered_ids.append(row.seq_id)

        latest_hash = row.row_hash

    is_valid = len(tampered_ids) == 0

    # Log audit verification action
    verifier_officer_id = officer_id or (records[0].officer_id if records else "SYSTEM")
    await log_audit_event(
        session=db,
        officer_id=verifier_officer_id,
        action_type="VERIFIED_AUDIT_CHAIN",
        resource_target="access_audit_logs",
        details={
            "total_records": len(records),
            "is_valid": is_valid,
            "tampered_seq_ids": tampered_ids,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return VerifyAuditChainResponse(
        is_valid=is_valid,
        total_records_verified=len(records),
        genesis_hash=GENESIS_HASH,
        latest_chain_hash=latest_hash,
        tampered_seq_ids=tampered_ids,
        verified_at=datetime.now(timezone.utc),
    )
