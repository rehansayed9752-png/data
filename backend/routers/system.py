from typing import Any, Dict
from fastapi import APIRouter
from services.gemini_key_pool import key_pool

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/key-pool-status")
async def get_key_pool_status() -> Dict[str, Any]:
    """
    Live Health & Pool Diagnostics Endpoint (USP #2):
    Returns real-time status across all configured Google AI Studio keys in the pool,
    including masked key identifiers, health status, cooldown timers, request metrics,
    and auto-failover rate-limit counters.
    """
    return key_pool.get_pool_status()
