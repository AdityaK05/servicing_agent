"""
LangGraph flow definition — chain-breaker architecture.

One shared StateGraph for all 3 flows (fee waiver, limit increase, card replacement).
Flow-specific behavior is driven by policies.json config, not separate graphs.

Chain-breaker: if ANY node's check fails or confidence < 0.7, the graph
short-circuits to `escalate` immediately — no further processing.

Graph shape:
    collect_slots → check_eligibility → apply_policy → execute_action → confirm
         ↓ (break)       ↓ (break)          ↓ (break)       ↓ (break)
                              escalate → END
"""

import logging

from langgraph.graph import END, StateGraph

from agent.escalation import generate_escalation_summary
from agent.policy_engine import (
    check_required_slots,
    evaluate_eligibility,
    get_global_config,
    get_intent_policy,
    render_response,
)
from agent.state import AgentState
from app.services.audit import audited

logger = logging.getLogger(__name__)


# ─── Chain Breaker Helper ────────────────────────────────────────

def _break_chain(state: AgentState, node: str, reason: str) -> dict:
    """Mark the chain as broken. Used by any node to short-circuit to escalation.

    Args:
        state: Current agent state.
        node: Name of the node that triggered the break.
        reason: Human-readable reason for the break.

    Returns:
        Partial state update that will route to the escalate node.
    """
    logger.warning("Chain broken at '%s': %s", node, reason)
    return {
        "chain_broken": True,
        "break_reason": reason,
        "failed_node": node,
        "status": "escalated",
    }


# ─── Node: collect_slots ─────────────────────────────────────────

@audited
def collect_slots(state: AgentState) -> dict:
    """Collect required slots for the current intent flow.

    Merges entities from the classifier into slots. Identifies any
    missing required slots based on the intent's policy config.

    Chain-break: if intent is ESCALATE or confidence < min_confidence.
    """
    intent = state.get("intent", "ESCALATE")
    confidence = state.get("confidence", 0.0)
    entities = state.get("entities", {})
    global_config = get_global_config()

    # ─── Chain break: escalate intent ────────────────────────
    if intent == "ESCALATE":
        return _break_chain(state, "collect_slots", "User requested or requires human escalation")

    # ─── Chain break: low confidence ─────────────────────────
    min_conf = global_config.get("min_confidence", 0.7)
    if confidence < min_conf:
        return _break_chain(
            state, "collect_slots",
            f"Confidence {confidence:.2f} below threshold {min_conf}"
        )

    # ─── Merge entities into slots ───────────────────────────
    slots = {**state.get("slots", {})}
    for key, value in entities.items():
        if value is not None and key not in slots:
            slots[key] = value

    # ─── Check for missing slots ─────────────────────────────
    missing = check_required_slots(intent, slots)

    if missing:
        # Generate slot collection prompt
        policy = get_intent_policy(intent)
        templates = policy.get("response_templates", {})
        prompt = templates.get("collecting_slots", f"I need a few more details: {', '.join(missing)}")

        return {
            "slots": slots,
            "slots_missing": missing,
            "response_text": prompt,
            "status": "in_progress",
            "chain_broken": False,
        }

    return {
        "slots": slots,
        "slots_missing": [],
        "chain_broken": False,
    }


# ─── Node: check_eligibility ─────────────────────────────────────

@audited
def check_eligibility(state: AgentState) -> dict:
    """Check customer eligibility using the deterministic policy engine.

    Chain-break: if chain is already broken, or customer not found,
    or policy evaluation fails.
    """
    # ─── Respect prior chain break ───────────────────────────
    if state.get("chain_broken"):
        return {}

    # ─── Check for missing slots (need them to proceed) ──────
    if state.get("slots_missing"):
        return _break_chain(
            state, "check_eligibility",
            f"Missing required slots: {state['slots_missing']}"
        )

    intent = state.get("intent", "ESCALATE")
    slots = state.get("slots", {})

    # ─── Need customer data — placeholder until mock_bank ────
    # This will be replaced when execute_action/mock_bank is wired.
    # For now, we need customer_id to have been resolved upstream.
    customer_id = state.get("customer_id", "")
    if not customer_id:
        # Try to resolve from card_last_four in slots
        card = slots.get("card_last_four")
        if not card:
            return _break_chain(
                state, "check_eligibility",
                "No customer_id or card_last_four to identify customer"
            )
        # customer lookup will be done here once mock_bank is wired
        # For now, return a placeholder that downstream can handle
        return {
            "customer_id": f"pending_{card}",
            "chain_broken": False,
        }

    return {"chain_broken": False}


# ─── Node: apply_policy ──────────────────────────────────────────

@audited
def apply_policy(state: AgentState) -> dict:
    """Run the deterministic policy engine against customer + slots.

    Chain-break: if customer not found, or eligibility check returns ineligible.
    """
    # ─── Respect prior chain break ───────────────────────────
    if state.get("chain_broken"):
        return {}

    intent = state.get("intent", "ESCALATE")
    slots = state.get("slots", {})

    # ─── Get customer data from mock bank ────────────────────
    try:
        from app.services.mock_bank import get_customer_by_id, get_customer_by_card
        
        customer_id = state.get("customer_id")
        if customer_id:
            customer = get_customer_by_id(customer_id)
        else:
            card = slots.get("card_last_four", "")
            customer = get_customer_by_card(card)
    except (ImportError, Exception):
        customer = None

    if customer is None:
        return _break_chain(
            state, "apply_policy",
            f"Customer not found for ID {state.get('customer_id')} or card ending {slots.get('card_last_four', 'N/A')}"
        )

    # ─── Evaluate policy ─────────────────────────────────────
    result = evaluate_eligibility(intent, customer, slots)

    if not result.eligible:
        # Generate denial response from template
        response = render_response(intent, result.template_key, result.template_vars)
        return {
            "eligibility": "ineligible",
            "policy_result": result.to_dict(),
            "response_text": response,
            "customer_id": customer.get("id", ""),
            "status": "completed",
            "chain_broken": True,
            "break_reason": f"Policy denied: {result.reason}",
            "failed_node": "apply_policy",
        }

    eligibility = "auto_approved" if result.auto_approved else "eligible"

    return {
        "eligibility": eligibility,
        "policy_result": result.to_dict(),
        "customer_id": customer.get("id", ""),
        "chain_broken": False,
    }


# ─── Node: execute_action ────────────────────────────────────────

@audited
def execute_action(state: AgentState) -> dict:
    """Execute the approved action against the mock bank API.

    Chain-break: if chain is already broken, or execution fails.
    """
    # ─── Respect prior chain break ───────────────────────────
    if state.get("chain_broken"):
        return {}

    intent = state.get("intent", "ESCALATE")
    slots = state.get("slots", {})
    policy_result = state.get("policy_result", {})

    try:
        from app.services.mock_bank import execute_bank_action
        result = execute_bank_action(intent, state.get("customer_id", ""), slots, policy_result)
    except ImportError:
        # mock_bank not yet wired — return placeholder
        result = {"status": "executed", "note": "mock_bank not yet implemented"}
    except Exception as e:
        return _break_chain(state, "execute_action", f"Execution failed: {e}")

    if result.get("error"):
        return _break_chain(state, "execute_action", result["error"])

    return {
        "action_result": result,
        "chain_broken": False,
    }


# ─── Node: confirm ───────────────────────────────────────────────

@audited
def confirm(state: AgentState) -> dict:
    """Generate the final confirmation response using policy templates.

    Chain-break: if chain is already broken (just passes through).
    """
    # ─── Respect prior chain break ───────────────────────────
    if state.get("chain_broken"):
        return {}

    intent = state.get("intent", "ESCALATE")
    policy_result = state.get("policy_result", {})
    template_key = policy_result.get("template_key", "approved")
    template_vars = policy_result.get("template_vars", {})

    # Merge any action_result data into template vars
    action_result = state.get("action_result", {})
    merged_vars = {**template_vars, **action_result}

    response = render_response(intent, template_key, merged_vars)

    return {
        "response_text": response,
        "status": "completed",
    }


# ─── Node: escalate ──────────────────────────────────────────────

@audited
async def escalate(state: AgentState) -> dict:
    """Terminal node for chain-broken flows. Generates escalation response and handoff packet."""
    intent = state.get("intent", "ESCALATE")
    failed_node = state.get("failed_node", "unknown")
    break_reason = state.get("break_reason", "")

    # Pick the right escalation template
    policy = get_intent_policy(intent)
    templates = policy.get("response_templates", {})

    # Try intent-specific escalation template, then ESCALATE policy
    escalate_policy = get_intent_policy("ESCALATE")
    escalate_templates = escalate_policy.get("response_templates", {})

    if "escalated" in templates:
        response = templates["escalated"]
    elif state.get("confidence", 1.0) < get_global_config().get("min_confidence", 0.7):
        response = escalate_templates.get("low_confidence", escalate_templates.get("default", ""))
    else:
        response = render_response(
            "ESCALATE", "chain_break", {"failed_node": failed_node}
        )

    logger.info(
        "Escalated: node=%s reason=%s intent=%s",
        failed_node, break_reason, intent,
    )

    # Generate handoff packet
    handoff = await generate_escalation_summary(state)

    return {
        "response_text": response,
        "status": "escalated",
        "handoff_packet": handoff,
    }


# ─── Routing Functions ───────────────────────────────────────────

def _should_escalate(state: AgentState) -> str:
    """Conditional edge: route to 'escalate' if chain_broken, else continue."""
    if state.get("chain_broken"):
        return "escalate"
    return "continue"


def _after_collect_slots(state: AgentState) -> str:
    """After slot collection: escalate, or stop if missing slots, or continue."""
    if state.get("chain_broken"):
        return "escalate"
    if state.get("slots_missing"):
        # Missing slots → respond with prompt, don't continue chain
        return "respond_slots"
    return "continue"


# ─── Graph Builder ────────────────────────────────────────────────

def build_graph():
    """Build and compile the servicing agent StateGraph.

    Single shared graph shape for all intents:

        collect_slots ──→ check_eligibility ──→ apply_policy ──→ execute_action ──→ confirm ──→ END
             │ (break)         │ (break)          │ (break)         │ (break)
             └──────────────── ↓ ─────────────────↓────────────────↓──────────────→ escalate ──→ END
             │ (missing slots)
             └──→ END (respond with slot prompt)

    Returns:
        Compiled LangGraph ready for invocation.
    """
    builder = StateGraph(AgentState)

    # ─── Register nodes ──────────────────────────────────────
    builder.add_node("collect_slots", collect_slots)
    builder.add_node("check_eligibility", check_eligibility)
    builder.add_node("apply_policy", apply_policy)
    builder.add_node("execute_action", execute_action)
    builder.add_node("confirm", confirm)
    builder.add_node("escalate", escalate)

    # ─── Entry point ─────────────────────────────────────────
    builder.set_entry_point("collect_slots")

    # ─── Conditional edges (chain-breaker logic) ─────────────

    # After collect_slots: escalate / stop for missing slots / continue
    builder.add_conditional_edges(
        "collect_slots",
        _after_collect_slots,
        {
            "escalate": "escalate",
            "respond_slots": END,     # Return slot-prompt to user, re-enter on next message
            "continue": "check_eligibility",
        },
    )

    # After check_eligibility: escalate or continue
    builder.add_conditional_edges(
        "check_eligibility",
        _should_escalate,
        {"escalate": "escalate", "continue": "apply_policy"},
    )

    # After apply_policy: escalate (denied or error) or continue
    builder.add_conditional_edges(
        "apply_policy",
        _should_escalate,
        {"escalate": "escalate", "continue": "execute_action"},
    )

    # After execute_action: escalate or continue
    builder.add_conditional_edges(
        "execute_action",
        _should_escalate,
        {"escalate": "escalate", "continue": "confirm"},
    )

    # Terminal edges
    builder.add_edge("confirm", END)
    builder.add_edge("escalate", END)

    from langgraph.checkpoint.memory import MemorySaver
    memory = MemorySaver()
    return builder.compile(checkpointer=memory)


# Compiled graph singleton
graph = build_graph()
