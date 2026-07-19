"""
Agent state schema.

Defines the TypedDict that flows through the LangGraph graph.
Every node reads from and writes to this state.
"""

from typing import Annotated, Literal

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """State that persists across the LangGraph execution.

    Attributes:
        messages: Conversation history (appended via add_messages reducer).
        session_id: UUID of the current chat session.
        intent: Classified intent (FEE_WAIVER, LIMIT_INCREASE, etc.).
        confidence: Classifier confidence score (0.0–1.0).
        entities: Extracted entities from the user message.
        slots: Collected slot values for the current flow.
        slots_missing: Slot keys still needed before proceeding.
        customer_id: Resolved customer identifier.
        eligibility: Result from policy engine check.
        policy_result: Detailed policy evaluation output.
        action_result: Result from execute_action node.
        response_text: Final response text to send to the user.
        chain_broken: Whether the chain was short-circuited.
        break_reason: Reason the chain was broken (for audit trail).
        failed_node: Which node triggered the chain break.
        status: Overall flow status.
    """

    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str

    # ─── Classification ──────────────────────────────────────
    intent: str
    confidence: float
    entities: dict

    # ─── Slot Collection ─────────────────────────────────────
    slots: dict
    slots_missing: list[str]

    # ─── Customer Context ────────────────────────────────────
    customer_id: str

    # ─── Policy Engine ───────────────────────────────────────
    eligibility: Literal["eligible", "ineligible", "auto_approved", "pending"]
    policy_result: dict

    # ─── Execution ───────────────────────────────────────────
    action_result: dict
    response_text: str

    # ─── Chain Breaker ───────────────────────────────────────
    chain_broken: bool
    break_reason: str
    failed_node: str
    status: Literal["in_progress", "completed", "escalated", "error"]
    handoff_packet: dict
