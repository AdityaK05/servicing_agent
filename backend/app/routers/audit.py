"""
Audit router — tamper-evident audit trail endpoints.

Routes:
    GET /api/audit/{session_id}        — Full audit chain for a session
    GET /api/audit/{session_id}/verify — Recompute hashes, check for tampering
"""

from fastapi import APIRouter, HTTPException, Request, Header
from app.services.audit import audit_logger
from app.limiter import limiter

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/{session_id}")
@limiter.limit("10/minute")
async def get_audit_chain(request: Request, session_id: str, x_user_id: str | None = Header(default=None)):
    """Retrieve the complete audit trail for a session.

    Returns the ordered list of hash-chained audit entries.
    Note: In production, session_id ownership would be strictly checked against x_user_id.
    """
    if not x_user_id:
        # Require authentication to view audit logs
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")
    chain = audit_logger.get_chain(session_id)

    if not chain:
        raise HTTPException(
            status_code=404,
            detail=f"No audit trail found for session {session_id}",
        )

    return {
        "session_id": session_id,
        "entries": chain,
        "total": len(chain),
    }


@router.get("/{session_id}/verify")
@limiter.limit("5/minute")
async def verify_audit_chain(request: Request, session_id: str):
    """Verify the integrity of a session's audit chain.

    Recomputes all SHA-256 hashes and checks for tampering.

    Returns:
        tampered: true if any hash doesn't match, false if chain is intact.
    """
    result = audit_logger.verify_chain(session_id)

    if result["total_entries"] == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No audit trail found for session {session_id}",
        )

    return result
