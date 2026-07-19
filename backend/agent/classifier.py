"""
Intent classifier — fast keyword pre-filter with Groq LLM fallback.

Flow:
    1. Keyword dict lookup (zero-latency, catches obvious intents)
    2. If no keyword match → Groq LLM call (llama-3.1-8b-instant)
    3. Returns structured IntentClassification in both paths
"""

import json
import logging
import re

from agent.classifier_prompt import (
    CLASSIFIER_MAX_TOKENS,
    CLASSIFIER_MODEL,
    CLASSIFIER_SYSTEM_PROMPT,
    CLASSIFIER_TEMPERATURE,
)
from app.models.schemas import IntentClassification, IntentType
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

# ─── Keyword Pre-filter ──────────────────────────────────────────
# Maps keyword patterns → (intent, base_confidence).
# Checked in order; first match wins. Patterns are case-insensitive.

KEYWORD_RULES: list[tuple[re.Pattern, IntentType, float]] = [
    # Fee waiver
    (re.compile(r"\b(waive|waiver|annual\s*fee|fee\s*credit|fee\s*refund)\b", re.I),
     IntentType.FEE_WAIVER, 0.85),
    # Limit increase
    (re.compile(r"\b(limit\s*increase|raise\s*(my\s*)?limit|higher\s*limit|credit\s*limit|increase\s*(my\s*)?limit)\b", re.I),
     IntentType.LIMIT_INCREASE, 0.85),
    # Card replacement
    (re.compile(r"\b(replace|replacement|lost\s*card|stolen\s*card|damaged\s*card|new\s*card|reissue|card\s*(was\s*)?(lost|stolen|damaged))\b", re.I),
     IntentType.CARD_REPLACEMENT, 0.85),
    # Escalate
    (re.compile(r"\b(human|agent|manager|supervisor|escalate|speak\s*to|talk\s*to\s*(a\s*)?(person|human|agent|manager))\b", re.I),
     IntentType.ESCALATE, 0.90),
    # Greeting / Small Talk
    (re.compile(r"\b(hi|hello|hey|thanks|thank\s*you|bye|goodbye|morning|afternoon|great)\b", re.I),
     IntentType.GREETING, 0.95),
]


def _keyword_classify(message: str) -> IntentClassification | None:
    """Attempt fast keyword-based classification.

    Returns None if no keyword rule matches.
    """
    for pattern, intent, confidence in KEYWORD_RULES:
        if pattern.search(message):
            return IntentClassification(
                intent=intent,
                confidence=confidence,
                entities=_extract_entities_basic(message),
            )
    return None


def _extract_entities_basic(message: str) -> dict:
    """Extract simple entities via regex (card digits, dollar amounts)."""
    entities: dict = {
        "card_last_four": None,
        "amount": None,
        "reason": None,
    }

    # Last-four digits of card
    card_match = re.search(r"\b(\d{4})\b", message)
    if card_match:
        entities["card_last_four"] = card_match.group(1)

    # Dollar amount
    amount_match = re.search(r"\$?([\d,]+(?:\.\d{2})?)", message)
    if amount_match:
        raw = amount_match.group(1).replace(",", "")
        # Avoid matching 4-digit card numbers as amounts
        if raw != entities.get("card_last_four"):
            entities["amount"] = raw

    return entities


# ─── LLM Fallback ────────────────────────────────────────────────

async def _llm_classify(message: str) -> IntentClassification:
    """Classify via Groq LLM when keyword lookup fails."""
    try:
        raw = await llm_service.chat_completion(
            messages=[
                {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            model=CLASSIFIER_MODEL,
            temperature=CLASSIFIER_TEMPERATURE,
            max_tokens=CLASSIFIER_MAX_TOKENS,
        )

        parsed = json.loads(raw.strip())
        return IntentClassification(
            intent=IntentType(parsed["intent"]),
            confidence=float(parsed.get("confidence", 0.5)),
            entities=parsed.get("entities", {}),
        )

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("LLM classifier parse error: %s — raw: %s", e, raw if "raw" in dir() else "N/A")
        return IntentClassification(
            intent=IntentType.ESCALATE,
            confidence=0.3,
            entities={"reason": "classification_error"},
        )

    except Exception as e:
        logger.error("LLM classifier call failed: %s", e)
        return IntentClassification(
            intent=IntentType.ESCALATE,
            confidence=0.1,
            entities={"reason": "service_unavailable"},
        )


# ─── Public API ──────────────────────────────────────────────────

async def classify_intent(message: str) -> IntentClassification:
    """Classify user intent: keyword pre-filter → LLM fallback.

    Args:
        message: Raw user message text.

    Returns:
        IntentClassification with intent, confidence, and extracted entities.
    """
    # Fast path — keyword match
    result = _keyword_classify(message)
    if result is not None:
        logger.info("Keyword match: %s (%.2f)", result.intent.value, result.confidence)
        return result

    # Slow path — LLM
    logger.info("No keyword match, falling back to LLM classifier")
    return await _llm_classify(message)
