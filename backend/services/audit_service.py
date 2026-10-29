import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AccessAuditLogModel, OfficerModel

logger = logging.getLogger("forensic_ai.audit")

GENESIS_HASH = "0" * 64


def format_canonical_iso(dt: datetime) -> str:
    """Returns canonical UTC ISO-8601 string across all SQL dialects (PostgreSQL/SQLite)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat()


def compute_audit_hash(
    prev_hash: str,
    officer_id: str,
    case_id: Optional[str],
    action_type: str,
    timestamp_iso: str,
    details: Dict[str, Any],
) -> str:
    canonical_details = json.dumps(details, sort_keys=True, separators=(",", ":"))
    payload = f"{prev_hash}|{officer_id}|{case_id or 'GLOBAL'}|{action_type}|{timestamp_iso}|{canonical_details}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def log_audit_event(
    session: AsyncSession,
    officer_id: str,
    action_type: str,
    resource_target: str,
    case_id: Optional[str] = None,
    case_number: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: str = "127.0.0.1",
    user_agent: str = "ForensicTerminal/1.0",
) -> AccessAuditLogModel:
    details = details or {}
    now = datetime.now(timezone.utc)
    timestamp_iso = format_canonical_iso(now)

    # Get officer details
    officer_stmt = select(OfficerModel).where(OfficerModel.id == officer_id)
    officer_res = await session.execute(officer_stmt)
    officer = officer_res.scalar_one_or_none()
    badge_number = officer.badge_number if officer else "UNKNOWN_BADGE"
    officer_name = officer.full_name if officer else "Unknown Officer"

    # Fetch the latest log record to get prev_hash
    last_log_stmt = select(AccessAuditLogModel).order_by(AccessAuditLogModel.seq_id.desc()).limit(1)
    last_log_res = await session.execute(last_log_stmt)
    last_log = last_log_res.scalar_one_or_none()
    prev_hash = last_log.row_hash if last_log else GENESIS_HASH
    next_seq = (last_log.seq_id + 1) if (last_log and last_log.seq_id is not None) else 1

    row_hash = compute_audit_hash(
        prev_hash=prev_hash,
        officer_id=officer_id,
        case_id=case_id,
        action_type=action_type,
        timestamp_iso=timestamp_iso,
        details=details,
    )

    audit_entry = AccessAuditLogModel(
        seq_id=next_seq,
        officer_id=officer_id,
        badge_number=badge_number,
        officer_name=officer_name,
        case_id=case_id,
        case_number=case_number,
        action_type=action_type,
        resource_target=resource_target,
        ip_address=ip_address,
        user_agent=user_agent,
        details_json=details,
        prev_hash=prev_hash,
        row_hash=row_hash,
        created_at=now,
    )

    session.add(audit_entry)
    await session.commit()
    await session.refresh(audit_entry)

    logger.info(
        f"[AUDIT] {action_type} by {badge_number} on {resource_target} (Hash: {row_hash[:12]}...)"
    )
    return audit_entry
