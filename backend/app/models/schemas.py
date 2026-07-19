"""
Pydantic schemas for API request/response models.

These manually-authored models can extend auto-generated models
from the OpenAPI spec (see shared/README.md for codegen workflow).
"""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

# ─── Enums ───────────────────────────────────────────────────────


class MessageRole(str, Enum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"


class IntentType(str, Enum):
    """Supported intent taxonomy for the classifier."""

    FEE_WAIVER = "FEE_WAIVER"
    LIMIT_INCREASE = "LIMIT_INCREASE"
    CARD_REPLACEMENT = "CARD_REPLACEMENT"
    ESCALATE = "ESCALATE"
    GREETING = "GREETING"


class ActionType(str, Enum):
    CARD_LOOKUP = "card_lookup"
    TRANSACTION_QUERY = "transaction_query"
    DISPUTE_FILED = "dispute_filed"
    LIMIT_CHANGE = "limit_change"
    PAYMENT_SCHEDULED = "payment_scheduled"
    VERIFICATION_REQUIRED = "verification_required"


class ActionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"
    COMPLETED = "completed"


# ─── Intent Classification ───────────────────────────────────────


class IntentClassification(BaseModel):
    """Result of the intent classifier (keyword or LLM)."""

    intent: IntentType
    confidence: float = Field(ge=0.0, le=1.0)
    entities: dict = Field(default_factory=dict)


class HandoffPacket(BaseModel):
    """Structured escalation handoff packet."""

    intent: str
    confidence: float
    failed_node: str
    break_reason: str
    customer_id: str | None = None
    slots: dict = Field(default_factory=dict)
    checks_passed: list[str] = Field(default_factory=list)
    checks_failed: list[str] = Field(default_factory=list)
    policy_result: dict | None = None
    summary: str | None = None
    timestamp: str

# ─── Chat Models ─────────────────────────────────────────────────


class ChatMessage(BaseModel):
    """A single message in the conversation."""

    id: UUID = Field(default_factory=uuid4)
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict | None = None


class AgentAction(BaseModel):
    """An action performed or proposed by the agent."""

    type: ActionType
    status: ActionStatus
    details: dict | None = None


class ChatRequest(BaseModel):
    """Incoming chat message from the frontend."""

    session_id: UUID
    message: str = Field(..., min_length=1, max_length=4096)


class ChatResponse(BaseModel):
    """Agent response returned to the frontend."""

    session_id: UUID
    message: ChatMessage
    intent: IntentClassification | None = None
    actions: list[AgentAction] = Field(default_factory=list)
    handoff_packet: HandoffPacket | None = None
