"""
Chat router — handles conversation endpoints.

Routes:
    POST /api/chat        — Send a message, classify intent, return agent response
    GET  /api/chat/history — Retrieve session chat history (stub)
"""

import logging

import re
from fastapi import APIRouter, HTTPException, Request, Depends

from agent.classifier import classify_intent, _extract_entities_basic
from app.models.schemas import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    MessageRole,
)
from app.api.auth import get_current_user
from fastapi.security import HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

from agent.graph import graph
from langchain_core.messages import HumanMessage
from app.limiter import limiter

def sanitize_input(text: str) -> str:
    """Basic prompt injection sanitization: strip XML/HTML tags and limit length."""
    sanitized = re.sub(r'<[^>]*>', '', text)
    return sanitized[:4096].strip()

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def send_message(
    request: Request, 
    chat_req: ChatRequest,
    current_user = Depends(get_current_user)
):
    """Process a user message: classify intent → generate response."""
    try:
        # Sanitize prompt injection
        safe_message = sanitize_input(chat_req.message)

        config = {"configurable": {"thread_id": str(chat_req.session_id)}}
        state_snapshot = await graph.aget_state(config)
        current_state = state_snapshot.values if state_snapshot else {}

        if current_state.get("status") == "in_progress":
            # Flow is already active, bypass intent classification to retain context
            entities = _extract_entities_basic(safe_message)
            initial_state = {
                "messages": [HumanMessage(content=safe_message)],
                "entities": entities,
                "customer_id": current_user.id,
            }
            # Fallback values for metadata
            intent_val = current_state.get("intent", "UNKNOWN")
            conf_val = current_state.get("confidence", 0.0)
        else:
            # Fresh turn (either very first turn, or previous flow completed/escalated)
            classification = await classify_intent(safe_message)
            logger.info(
                "session=%s intent=%s confidence=%.2f",
                chat_req.session_id,
                classification.intent.value,
                classification.confidence,
            )
            
            if classification.intent.value == "GREETING":
                agent_message = ChatMessage(
                    role=MessageRole.AGENT,
                    content="You're very welcome! Let me know if there's anything else I can help you with today (like fee waivers, limit increases, or card replacements).",
                    metadata={"intent": "GREETING", "confidence": classification.confidence, "status": "completed"}
                )
                return ChatResponse(
                    session_id=chat_req.session_id,
                    message=agent_message,
                    intent={"intent": "GREETING", "confidence": classification.confidence, "entities": classification.entities},
                )
            
            # Clear old messages to prevent hallucination from previous flows
            from langchain_core.messages import RemoveMessage
            messages_update = []
            for m in current_state.get("messages", []):
                if m.id:
                    messages_update.append(RemoveMessage(id=m.id))
            messages_update.append(HumanMessage(content=safe_message))

            # Reset all flow-specific state fields to prevent bleed from previous flows
            initial_state = {
                "messages": messages_update,
                "intent": classification.intent.value,
                "confidence": classification.confidence,
                "entities": classification.entities,
                "slots": {},
                "slots_missing": [],
                "customer_id": current_user.id,
                "policy_result": {},
                "action_result": {},
                "chain_broken": False,
                "break_reason": "",
                "failed_node": "",
                "status": "in_progress",
                "handoff_packet": {},
            }
            intent_val = classification.intent.value
            conf_val = classification.confidence

        # ─── Invoke Graph ────────────────────────────────────────────────
        # We use ainvoke to support our async escalate node
        final_state = await graph.ainvoke(initial_state, config)

        logger.info(
            "Graph finished: session=%s status=%s chain_broken=%s",
            chat_req.session_id,
            final_state.get("status"),
            final_state.get("chain_broken"),
        )

        response_text = final_state.get("response_text", "An unexpected error occurred.")
        handoff_packet = final_state.get("handoff_packet")
        if not handoff_packet:
            handoff_packet = None

        agent_message = ChatMessage(
            role=MessageRole.AGENT,
            content=response_text,
            metadata={
                "intent": intent_val,
                "confidence": conf_val,
                "status": final_state.get("status"),
            },
        )

        return ChatResponse(
            session_id=chat_req.session_id,
            message=agent_message,
            intent={
                "intent": intent_val,
                "confidence": conf_val,
                "entities": final_state.get("entities", {})
            },
            handoff_packet=handoff_packet,
        )

    except Exception as e:
        logger.error("Chat endpoint error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chat/history")
@limiter.limit("30/minute")
async def get_history(request: Request, session_id: str):
    """Retrieve chat history for a given session."""
    # TODO: Query Supabase for session messages
    raise HTTPException(status_code=501, detail="History not yet implemented")
