"""
Deterministic policy engine — reads rules from /config/policies.json.

This is NOT an LLM call. Pure rule evaluation for auditability.
Every decision is traceable to a specific threshold in the config.
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

# ─── Load Policy Config ──────────────────────────────────────────

_POLICIES_PATH = Path(__file__).resolve().parent.parent / "config" / "policies.json"


def _load_policies() -> dict:
    """Load and cache policies from JSON config."""
    with open(_POLICIES_PATH) as f:
        return json.load(f)


# Loaded once at import time; restart to pick up changes.
POLICIES = _load_policies()


def get_global_config() -> dict:
    """Return global policy thresholds."""
    return POLICIES.get("global", {})


def get_intent_policy(intent: str) -> dict:
    """Return policy config for a specific intent."""
    return POLICIES.get(intent, {})


# ─── Slot Validation ─────────────────────────────────────────────


def check_required_slots(intent: str, slots: dict) -> list[str]:
    """Return list of missing required slot keys for the given intent.

    Args:
        intent: The classified intent string (e.g., "FEE_WAIVER").
        slots: Currently collected slot values.

    Returns:
        List of missing slot key names. Empty list = all slots present.
    """
    policy = get_intent_policy(intent)
    required = policy.get("slots_required", [])
    return [key for key in required if not slots.get(key)]


# ─── Eligibility Evaluation ──────────────────────────────────────


class PolicyResult:
    """Structured result from a policy evaluation."""

    def __init__(
        self,
        eligible: bool,
        auto_approved: bool = False,
        reason: str = "",
        template_key: str = "",
        template_vars: dict | None = None,
        details: dict | None = None,
    ):
        self.eligible = eligible
        self.auto_approved = auto_approved
        self.reason = reason
        self.template_key = template_key
        self.template_vars = template_vars or {}
        self.details = details or {}

    def to_dict(self) -> dict:
        return {
            "eligible": self.eligible,
            "auto_approved": self.auto_approved,
            "reason": self.reason,
            "template_key": self.template_key,
            "template_vars": self.template_vars,
            "details": self.details,
        }


def evaluate_eligibility(intent: str, customer: dict, slots: dict) -> PolicyResult:
    """Evaluate whether a customer is eligible for the requested action.

    This is the core deterministic rules engine. Each intent has its own
    evaluation function that checks thresholds from policies.json.

    Args:
        intent: Classified intent.
        customer: Customer profile from the bank API.
        slots: Collected slot values.

    Returns:
        PolicyResult with eligibility decision, reason, and template info.
    """
    evaluators = {
        "FEE_WAIVER": _evaluate_fee_waiver,
        "LIMIT_INCREASE": _evaluate_limit_increase,
        "CARD_REPLACEMENT": _evaluate_card_replacement,
    }

    evaluator = evaluators.get(intent)
    if evaluator is None:
        return PolicyResult(
            eligible=False,
            reason="no_policy_defined",
            template_key="escalated",
        )

    try:
        return evaluator(customer, slots)
    except Exception as e:
        logger.error("Policy evaluation error for %s: %s", intent, e)
        return PolicyResult(
            eligible=False,
            reason=f"evaluation_error: {e}",
            template_key="escalated",
        )


# ─── Fee Waiver Rules ────────────────────────────────────────────


def _evaluate_fee_waiver(customer: dict, slots: dict) -> PolicyResult:
    """Check fee waiver eligibility against policy thresholds."""
    policy = get_intent_policy("FEE_WAIVER")
    rules = policy["eligibility"]
    auto = policy["auto_approve"]

    account_age = customer.get("account_age_months", 0)
    tier = str(customer.get("loyalty_tier", "basic")).lower()
    waivers_this_year = customer.get("fee_waivers_this_year", 0)
    annual_spend = customer.get("annual_spend_usd", 0)
    fee_amount = customer.get("annual_fee_usd", 0)

    # Check: account age
    if account_age < rules["min_account_age_months"]:
        return PolicyResult(
            eligible=False,
            reason="account_too_new",
            template_key="denied_age",
            template_vars={"account_age_months": account_age},
        )

    # Check: loyalty tier
    tier_order = ["basic", "silver", "gold", "platinum"]
    min_tier_idx = tier_order.index(rules["min_loyalty_tier"])
    customer_tier_idx = tier_order.index(tier) if tier in tier_order else 0
    if customer_tier_idx < min_tier_idx:
        return PolicyResult(
            eligible=False,
            reason="tier_too_low",
            template_key="denied_tier",
            template_vars={"loyalty_tier": tier},
        )

    # Check: waiver limit
    if waivers_this_year >= rules["max_waivers_per_year"]:
        return PolicyResult(
            eligible=False,
            reason="waiver_limit_reached",
            template_key="denied_limit",
            template_vars={"next_eligible_date": _next_year_date()},
        )

    # Check: annual spend minimum
    if annual_spend < rules["annual_spend_minimum_usd"]:
        return PolicyResult(
            eligible=False,
            reason="spend_below_minimum",
            template_key="denied_spend",
            template_vars={"annual_spend": f"{annual_spend:,.0f}"},
        )

    # Auto-approve check
    if tier in auto["loyalty_tiers"] and account_age >= auto["min_account_age_months"]:
        return PolicyResult(
            eligible=True,
            auto_approved=True,
            reason="auto_approved_by_tier_and_tenure",
            template_key="approved",
            template_vars={"fee_amount": f"{fee_amount:,.0f}"},
        )

    # Manual approve (eligible but not auto)
    return PolicyResult(
        eligible=True,
        auto_approved=False,
        reason="eligible_manual_review",
        template_key="approved",
        template_vars={"fee_amount": f"{fee_amount:,.0f}"},
    )


# ─── Limit Increase Rules ────────────────────────────────────────


def _evaluate_limit_increase(customer: dict, slots: dict) -> PolicyResult:
    """Check limit increase eligibility against policy thresholds."""
    policy = get_intent_policy("LIMIT_INCREASE")
    rules = policy["eligibility"]
    auto = policy["auto_approve"]

    account_age = customer.get("account_age_months", 0)
    utilization = customer.get("utilization_percent", 100)
    on_time = customer.get("on_time_payment_percent", 0)
    current_limit = customer.get("credit_limit_usd", 0)
    last_limit_change = customer.get("last_limit_change_date")
    risk_tier = str(customer.get("risk_tier", "high")).lower()

    requested_amount = slots.get("amount")

    # Check: account age
    if account_age < rules["min_account_age_months"]:
        return PolicyResult(
            eligible=False,
            reason="account_too_new",
            template_key="denied_age",
            template_vars={"account_age_months": account_age},
        )

    # Check: utilization
    if utilization > rules["max_utilization_percent"]:
        return PolicyResult(
            eligible=False,
            reason="utilization_too_high",
            template_key="denied_utilization",
            template_vars={"utilization_percent": f"{utilization:.0f}"},
        )

    # Check: payment history
    if on_time < rules["min_on_time_payments_percent"]:
        return PolicyResult(
            eligible=False,
            reason="payment_history_insufficient",
            template_key="denied_payments",
            template_vars={"on_time_percent": f"{on_time:.0f}"},
        )

    # Check: cooldown
    if last_limit_change:
        cooldown_end = datetime.fromisoformat(last_limit_change) + timedelta(
            days=rules["cooldown_days"]
        )
        if datetime.utcnow() < cooldown_end:
            return PolicyResult(
                eligible=False,
                reason="cooldown_active",
                template_key="denied_cooldown",
                template_vars={"cooldown_end_date": cooldown_end.strftime("%Y-%m-%d")},
            )

    # Determine max increase from risk tier
    risk_config = policy.get("risk_tiers", {}).get(risk_tier, {})
    max_increase_pct = risk_config.get(
        "max_increase_percent", rules["max_increase_percent"]
    )
    max_new_limit = current_limit * (1 + max_increase_pct / 100)

    # Check: requested amount exceeds cap
    if requested_amount:
        try:
            requested = float(str(requested_amount).replace(",", ""))
            if requested > max_new_limit:
                return PolicyResult(
                    eligible=False,
                    reason="requested_exceeds_cap",
                    template_key="denied_amount",
                    template_vars={
                        "max_increase_percent": max_increase_pct,
                        "max_new_limit": f"{max_new_limit:,.0f}",
                    },
                )
        except ValueError:
            pass

    # Auto-approve check
    new_limit = max_new_limit  # Default to max if no specific amount requested
    if requested_amount:
        try:
            new_limit = min(float(str(requested_amount).replace(",", "")), max_new_limit)
        except ValueError:
            new_limit = max_new_limit

    increase_pct = ((new_limit - current_limit) / current_limit * 100) if current_limit > 0 else 0

    if (
        increase_pct <= auto["max_increase_percent"]
        and on_time >= auto["min_on_time_payments_percent"]
        and utilization <= auto["max_utilization_percent"]
    ):
        return PolicyResult(
            eligible=True,
            auto_approved=True,
            reason="auto_approved_by_profile",
            template_key="approved",
            template_vars={
                "current_limit": f"{current_limit:,.0f}",
                "new_limit": f"{new_limit:,.0f}",
            },
            details={"new_limit": new_limit, "increase_pct": increase_pct},
        )

    return PolicyResult(
        eligible=True,
        auto_approved=False,
        reason="eligible_manual_review",
        template_key="approved",
        template_vars={
            "current_limit": f"{current_limit:,.0f}",
            "new_limit": f"{new_limit:,.0f}",
        },
        details={"new_limit": new_limit, "increase_pct": increase_pct},
    )


# ─── Card Replacement Rules ──────────────────────────────────────


def _evaluate_card_replacement(customer: dict, slots: dict) -> PolicyResult:
    """Check card replacement eligibility against policy thresholds."""
    policy = get_intent_policy("CARD_REPLACEMENT")
    rules = policy["eligibility"]
    auto = policy["auto_approve"]

    replacements_this_year = customer.get("replacements_this_year", 0)
    reason = (slots.get("reason") or "").lower()

    # Check: replacement limit
    if replacements_this_year >= rules["max_replacements_per_year"]:
        return PolicyResult(
            eligible=False,
            reason="replacement_limit_reached",
            template_key="denied_limit",
            template_vars={"max_replacements": rules["max_replacements_per_year"]},
        )

    # Auto-approve for valid reasons
    is_auto = reason in [r.lower() for r in auto.get("reasons", [])]
    is_stolen = reason == "stolen"

    template = "approved_stolen" if is_stolen else "approved"

    return PolicyResult(
        eligible=True,
        auto_approved=is_auto,
        reason=f"{'auto_' if is_auto else ''}approved_{reason or 'general'}",
        template_key=template,
        template_vars={
            "card_last_four": slots.get("card_last_four", "****"),
            "delivery_estimate": "3-5 business days",
        },
        details={
            "freeze_card": is_stolen and rules.get("freeze_on_stolen", True),
            "offer_digital": rules.get("offer_digital_card", True),
        },
    )


# ─── Helpers ─────────────────────────────────────────────────────


def _next_year_date() -> str:
    """Return date string one year from now."""
    return (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%d")


def render_response(intent: str, template_key: str, variables: dict) -> str:
    """Render a response template from policies.json with variable substitution.

    Args:
        intent: The intent to look up templates for.
        template_key: Which template within the intent to render.
        variables: Dict of values to substitute into the template.

    Returns:
        Rendered response string, or a fallback if template not found.
    """
    policy = get_intent_policy(intent)
    templates = policy.get("response_templates", {})
    template = templates.get(template_key, "")

    if not template:
        return f"Your {intent.lower().replace('_', ' ')} request has been processed."

    try:
        # Support both {var} and ${var} substitution
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{key}}}", str(value))
            result = result.replace(f"${{{key}}}", str(value))
        return result
    except Exception as e:
        logger.warning("Template render error: %s", e)
        return template
