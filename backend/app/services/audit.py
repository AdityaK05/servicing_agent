"""
Immutable audit logger with SHA-256 hash chain.

Usage:
    from app.services.audit import audit_logger, audited

    # Decorator approach (preferred — one line per node):
    @audited
    def my_node(state: AgentState) -> dict: ...

    # Manual approach:
    audit_logger.log_step(session_id, "node_name", input_snapshot, output_snapshot, "reason")

    # Verification:
    chain = audit_logger.get_chain(session_id)
    result = audit_logger.verify_chain(session_id)
"""

import functools
import hashlib
import json
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger(__name__)


class AuditLogger:
    """Immutable audit trail with SHA-256 hash chaining.

    Each entry's hash = SHA256(entry_content + prev_hash), forming
    a tamper-evident chain per session. Stores to Supabase `audit_log`
    table with in-memory fallback when Supabase is unavailable.
    """

    TABLE_NAME = "audit_log"

    def __init__(self):
        self._memory_store: dict[str, list[dict]] = {}
        self._use_supabase = True

    # ─── Core Logging ────────────────────────────────────────

    def log_step(
        self,
        session_id: str,
        node: str,
        input_snapshot: dict,
        output_snapshot: dict,
        decision_reason: str,
    ) -> dict:
        """Write a hash-chained audit entry.

        Args:
            session_id: UUID of the chat session.
            node: Name of the graph node.
            input_snapshot: Relevant input state (sanitized).
            output_snapshot: Node's return value (sanitized).
            decision_reason: Human-readable reason for the decision.

        Returns:
            The complete audit entry with hash.
        """
        # Get previous hash
        prev_hash = self._get_prev_hash(session_id)

        # Build entry
        entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "session_id": session_id,
            "node": node,
            "input": self._sanitize(input_snapshot),
            "output": self._sanitize(output_snapshot),
            "decision_reason": decision_reason,
            "prev_hash": prev_hash,
        }

        # Compute hash
        entry["hash"] = self._compute_hash(entry, prev_hash)

        # Persist
        self._store(session_id, entry)

        logger.debug(
            "Audit: session=%s node=%s hash=%s",
            session_id, node, entry["hash"][:12],
        )

        return entry

    # ─── Retrieval ───────────────────────────────────────────

    def get_chain(self, session_id: str) -> list[dict]:
        """Retrieve the full audit chain for a session.

        Returns:
            Ordered list of audit entries, oldest first.
        """
        # Try Supabase first
        if self._use_supabase:
            try:
                from app.db.supabase import get_db
                result = (
                    get_db()
                    .table(self.TABLE_NAME)
                    .select("*")
                    .eq("session_id", session_id)
                    .order("timestamp", desc=False)
                    .execute()
                )
                if result.data:
                    return result.data
            except Exception as e:
                logger.debug("Supabase read failed, using memory: %s", e)

        return self._memory_store.get(session_id, [])

    # ─── Verification ────────────────────────────────────────

    def verify_chain(self, session_id: str) -> dict:
        """Recompute all hashes and check for tampering.

        Returns:
            {
                "session_id": str,
                "total_entries": int,
                "tampered": bool,
                "first_tampered_index": int | None,
                "verified_at": str,
            }
        """
        chain = self.get_chain(session_id)

        if not chain:
            return {
                "session_id": session_id,
                "total_entries": 0,
                "tampered": False,
                "first_tampered_index": None,
                "verified_at": datetime.now(UTC).isoformat(),
            }

        prev_hash = "GENESIS"
        first_tampered = None

        for i, entry in enumerate(chain):
            expected_hash = self._compute_hash(entry, prev_hash)
            if entry.get("hash") != expected_hash:
                first_tampered = i
                break
            prev_hash = entry["hash"]

        return {
            "session_id": session_id,
            "total_entries": len(chain),
            "tampered": first_tampered is not None,
            "first_tampered_index": first_tampered,
            "verified_at": datetime.now(UTC).isoformat(),
        }

    # ─── Internals ───────────────────────────────────────────

    def _get_prev_hash(self, session_id: str) -> str:
        """Get the hash of the last entry in the chain, or 'GENESIS'."""
        chain = self.get_chain(session_id)
        if chain:
            return chain[-1].get("hash", "GENESIS")
        return "GENESIS"

    def _compute_hash(self, entry: dict, prev_hash: str) -> str:
        """SHA-256(canonical_entry_content + prev_hash)."""
        # Build canonical content string (deterministic key order)
        content_keys = ["timestamp", "session_id", "node", "input", "output", "decision_reason"]
        content_parts = []
        for key in content_keys:
            val = entry.get(key, "")
            content_parts.append(f"{key}={json.dumps(val, sort_keys=True, default=str)}")

        content = "|".join(content_parts) + "|prev=" + prev_hash
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def _sanitize(self, data: Any) -> dict:
        """Sanitize state data for audit storage.

        Removes large/non-serializable fields (messages list, etc.)
        and ensures JSON-safe output.
        """
        if not isinstance(data, dict):
            return {"value": str(data)}

        sanitized = {}
        skip_keys = {"messages", "_internal"}
        for key, value in data.items():
            if key in skip_keys:
                continue
            try:
                json.dumps(value, default=str)
                sanitized[key] = value
            except (TypeError, ValueError):
                sanitized[key] = str(value)

        return sanitized

    def _store(self, session_id: str, entry: dict) -> None:
        """Persist entry to Supabase, falling back to in-memory."""
        # Always store in memory (serves as cache)
        if session_id not in self._memory_store:
            self._memory_store[session_id] = []
        self._memory_store[session_id].append(entry)

        # Try Supabase
        if self._use_supabase:
            try:
                from app.db.supabase import get_db
                get_db().table(self.TABLE_NAME).insert(entry).execute()
            except Exception as e:
                logger.debug("Supabase write failed, entry in memory only: %s", e)


# ─── Singleton ───────────────────────────────────────────────────
audit_logger = AuditLogger()


# ─── Decorator ───────────────────────────────────────────────────

def audited(func: Callable) -> Callable:
    """Decorator that auto-logs a graph node's input/output to the audit trail.

    Wraps a LangGraph node function (sync or async) so that every invocation is recorded
    with the node name, sanitized input state, output, and decision reason.

    Usage:
        @audited
        def collect_slots(state: AgentState) -> dict: ...
    """
    import inspect

    if inspect.iscoroutinefunction(func):
        @functools.wraps(func)
        async def async_wrapper(state: dict) -> dict:
            session_id = state.get("session_id", "unknown")
            node_name = func.__name__

            input_snapshot = {
                "intent": state.get("intent"),
                "confidence": state.get("confidence"),
                "chain_broken": state.get("chain_broken"),
                "slots": state.get("slots"),
                "eligibility": state.get("eligibility"),
                "customer_id": state.get("customer_id"),
            }

            output = await func(state)
            decision_reason = _extract_decision_reason(output, state)

            audit_logger.log_step(
                session_id=session_id,
                node=node_name,
                input_snapshot=input_snapshot,
                output_snapshot=output,
                decision_reason=decision_reason,
            )
            return output

        return async_wrapper
    else:
        @functools.wraps(func)
        def sync_wrapper(state: dict) -> dict:
            session_id = state.get("session_id", "unknown")
            node_name = func.__name__

            input_snapshot = {
                "intent": state.get("intent"),
                "confidence": state.get("confidence"),
                "chain_broken": state.get("chain_broken"),
                "slots": state.get("slots"),
                "eligibility": state.get("eligibility"),
                "customer_id": state.get("customer_id"),
            }

            output = func(state)
            decision_reason = _extract_decision_reason(output, state)

            audit_logger.log_step(
                session_id=session_id,
                node=node_name,
                input_snapshot=input_snapshot,
                output_snapshot=output,
                decision_reason=decision_reason,
            )
            return output

        return sync_wrapper


def _extract_decision_reason(output: dict, state: dict) -> str:
    """Extract a human-readable decision reason from node output."""
    if not isinstance(output, dict):
        return "no_output"

    if output.get("chain_broken"):
        return f"CHAIN_BREAK: {output.get('break_reason', 'unknown')}"

    if output.get("eligibility"):
        return f"eligibility={output['eligibility']}"

    if output.get("slots_missing"):
        return f"collecting_slots: missing={output['slots_missing']}"

    if output.get("status"):
        return f"status={output['status']}"

    if output.get("response_text"):
        return "response_generated"

    return "pass_through"
