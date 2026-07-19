"""
Escalation summary generator — ONE Groq call to produce a handoff packet.

When the chain-breaker fires and routes to `escalate`, this module generates
a concise summary combining conversation history, customer snapshot, and
which policy checks passed/failed and why.

Token optimization:
    - max_tokens capped at 200
    - Conversation history truncated to last 6 messages
    - Uses the cheap llama-3.1-8b-instant model
"""

import logging
from datetime import UTC, datetime

from agent.classifier_prompt import CLASSIFIER_MODEL
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

# ─── System Prompt ───────────────────────────────────────────────

ESCALATION_SYSTEM_PROMPT = """\
You are a concise handoff summarizer for a credit card servicing system.

Given a customer interaction that requires human escalation, produce a SHORT handoff summary.

## Output Format (plain text, not JSON)

SUMMARY: One sentence describing what the customer needs.
INTENT: The classified intent.
FAILED AT: Which processing step failed and why.
CUSTOMER: Key customer details (if available).
ACTION NEEDED: What the human agent should do next.

## Rules
- Be factual and concise. Max 4-5 lines.
- Do NOT apologize or add filler.
- Include specific numbers (account age, utilization %, etc.) when available.
- If customer data is missing, say "Customer not yet identified."
"""

ESCALATION_MAX_TOKENS = 200
ESCALATION_TEMPERATURE = 0.1


# ─── Handoff Packet Builder ──────────────────────────────────────


def build_handoff_packet(state: dict) -> dict:
    """Build a structured handoff packet from the agent state.

    This is the synchronous part — assembles all available context
    into a packet that can be displayed to the user AND sent to LLM.

    Args:
        state: The LangGraph AgentState dict.

    Returns:
        Structured handoff packet dict.
    """
    intent = state.get("intent", "UNKNOWN")
    confidence = state.get("confidence", 0.0)
    failed_node = state.get("failed_node", "unknown")
    break_reason = state.get("break_reason", "")
    slots = state.get("slots", {})
    policy_result = state.get("policy_result", {})
    customer_id = state.get("customer_id", "")

    # Build policy checks summary
    checks_passed = []
    checks_failed = []

    if failed_node == "collect_slots":
        if intent == "ESCALATE":
            checks_failed.append("User requested human escalation")
        elif confidence < 0.7:
            checks_failed.append(f"Intent confidence too low ({confidence:.0%})")
        else:
            checks_failed.append(f"Missing required slots: {state.get('slots_missing', [])}")
    elif failed_node == "check_eligibility":
        checks_passed.append("Intent classification")
        checks_passed.append("Slot collection")
        checks_failed.append(break_reason)
    elif failed_node == "apply_policy":
        checks_passed.append("Intent classification")
        checks_passed.append("Slot collection")
        checks_passed.append("Customer identification")
        policy_reason = policy_result.get("reason", break_reason)
        checks_failed.append(f"Policy check: {policy_reason}")
    elif failed_node == "execute_action":
        checks_passed.append("Intent classification")
        checks_passed.append("Slot collection")
        checks_passed.append("Customer identification")
        checks_passed.append("Policy approval")
        checks_failed.append(f"Execution: {break_reason}")
    else:
        checks_failed.append(break_reason or "Unknown failure")

    return {
        "intent": intent,
        "confidence": confidence,
        "failed_node": failed_node,
        "break_reason": break_reason,
        "customer_id": customer_id or None,
        "slots": {k: v for k, v in slots.items() if v is not None},
        "checks_passed": checks_passed,
        "checks_failed": checks_failed,
        "policy_result": {
            "eligible": policy_result.get("eligible"),
            "reason": policy_result.get("reason"),
        } if policy_result else None,
        "timestamp": datetime.now(UTC).isoformat(),
        "summary": None,  # Filled by generate_escalation_summary
    }


def _build_context_message(state: dict, packet: dict) -> str:
    """Build the user message for the LLM summarization call.

    Truncates conversation history to last 6 messages.
    """
    parts = []

    # Conversation history (last 6 messages)
    messages = state.get("messages", [])
    recent = messages[-6:] if len(messages) > 6 else messages
    if recent:
        parts.append("CONVERSATION (last messages):")
        for msg in recent:
            if hasattr(msg, "content"):
                role = getattr(msg, "type", "unknown")
                parts.append(f"  [{role}]: {msg.content[:200]}")

    # Customer snapshot
    parts.append(f"\nINTENT: {packet['intent']} (confidence: {packet['confidence']:.0%})")
    parts.append(f"FAILED AT: {packet['failed_node']}")
    parts.append(f"REASON: {packet['break_reason']}")

    if packet.get("slots"):
        parts.append(f"SLOTS: {packet['slots']}")

    if packet.get("customer_id"):
        parts.append(f"CUSTOMER ID: {packet['customer_id']}")

    if packet.get("checks_passed"):
        parts.append(f"CHECKS PASSED: {', '.join(packet['checks_passed'])}")
    if packet.get("checks_failed"):
        parts.append(f"CHECKS FAILED: {', '.join(packet['checks_failed'])}")

    if packet.get("policy_result") and packet["policy_result"].get("reason"):
        parts.append(f"POLICY REASON: {packet['policy_result']['reason']}")

    return "\n".join(parts)


# ─── Public API ──────────────────────────────────────────────────


async def generate_escalation_summary(state: dict) -> dict:
    """Generate a complete handoff packet with LLM summary.

    Combines deterministic packet building with one cheap Groq call
    for the human-readable summary.

    Args:
        state: The LangGraph AgentState dict.

    Returns:
        Complete handoff packet with `summary` field populated.
    """
    packet = build_handoff_packet(state)

    try:
        context = _build_context_message(state, packet)

        summary = await llm_service.chat_completion(
            messages=[
                {"role": "system", "content": ESCALATION_SYSTEM_PROMPT},
                {"role": "user", "content": context},
            ],
            model=CLASSIFIER_MODEL,  # llama-3.1-8b-instant — cheap & fast
            temperature=ESCALATION_TEMPERATURE,
            max_tokens=ESCALATION_MAX_TOKENS,
        )

        packet["summary"] = summary.strip()

    except Exception as e:
        logger.warning("Escalation summary LLM call failed: %s", e)
        # Fallback: build a deterministic summary
        packet["summary"] = (
            f"Customer requested {packet['intent'].lower().replace('_', ' ')}. "
            f"Processing failed at {packet['failed_node']}: {packet['break_reason']}. "
            f"Manual review required."
        )

    return packet
