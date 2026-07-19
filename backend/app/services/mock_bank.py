"""
Mock Bank API — seeded data for testing policy execution.

Provides 5 seeded customers to cover the main graph pathways:
- CUST-01: Auto-approve fee waiver (Platinum, high tenure/spend)
- CUST-02: Auto-approve limit increase (Low utilization, perfect payments)
- CUST-03: Escalate limit increase (High risk/utilization)
- CUST-04: Card replacement (Stolen, auto-approve digital card)
- CUST-05: Escalate (fallback for low confidence/unidentified)
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ─── Seed Data ───────────────────────────────────────────────────

# We now use the real Supabase database instead of an in-memory list.


# ─── Data Access ─────────────────────────────────────────────────

def get_customer_by_card(card_last_four: str) -> dict | None:
    """Look up a customer by the last 4 digits of their card.
    
    In a real system, this would query a core banking database,
    likely cross-referencing with the authenticated session's user ID.
    """
    from app.db.supabase import get_db
    try:
        res = get_db().table("bank_customers").select("*").eq("card_last_four", str(card_last_four)).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        logger.error(f"Supabase fetch error: {e}")
    return None

def get_customer_by_id(customer_id: str) -> dict | None:
    """Look up a customer by their unique ID."""
    from app.db.supabase import get_db
    try:
        res = get_db().table("bank_customers").select("*").eq("id", str(customer_id)).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        logger.error(f"Supabase fetch error by ID: {e}")
    return None


def execute_bank_action(intent: str, customer_id: str, slots: dict, policy_result: dict) -> dict:
    """Execute an approved action against the mock banking core.
    
    Args:
        intent: The flow intent (e.g., FEE_WAIVER)
        customer_id: The ID of the customer
        slots: Collected slot values
        policy_result: Output of the policy engine evaluation
        
    Returns:
        dict: Execution result details to be merged into response templates.
    """
    logger.info(f"Executing {intent} for {customer_id}...")

    from app.db.supabase import get_db
    db = get_db()

    # Fetch from Supabase
    try:
        res = db.table("bank_customers").select("*").eq("id", customer_id).execute()
        if not res.data:
            return {"error": f"Customer {customer_id} not found in banking core"}
        cust = res.data[0]
    except Exception as e:
        logger.error(f"Supabase fetch error: {e}")
        return {"error": "Database error while fetching customer"}

    result = {}

    if intent == "FEE_WAIVER":
        # Action: Apply statement credit
        cust["fee_waivers_this_year"] += 1
        try:
            db.table("bank_customers").update({"fee_waivers_this_year": cust["fee_waivers_this_year"]}).eq("id", customer_id).execute()
        except Exception as e:
            logger.error(f"Failed to update fee_waivers: {e}")
        result = {
            "status": "completed",
            "action": "statement_credit",
            "amount": cust["annual_fee_usd"],
            "transaction_id": f"TX-FW-{datetime.utcnow().timestamp():.0f}"
        }

    elif intent == "LIMIT_INCREASE":
        # Action: Update credit limit
        if "new_limit" in policy_result.get("details", {}):
            new_limit = policy_result["details"]["new_limit"]
            cust["credit_limit_usd"] = new_limit
            cust["last_limit_change_date"] = datetime.utcnow().isoformat()
            try:
                db.table("bank_customers").update({
                    "credit_limit_usd": new_limit,
                    "last_limit_change_date": cust["last_limit_change_date"]
                }).eq("id", customer_id).execute()
            except Exception as e:
                logger.error(f"Failed to update limit: {e}")
            result = {
                "status": "completed",
                "action": "limit_updated",
                "new_limit": new_limit,
                "effective_date": "immediately"
            }
        else:
            return {"error": "Missing new_limit in policy_result details"}

    elif intent == "CARD_REPLACEMENT":
        # Action: Reissue card
        cust["replacements_this_year"] += 1
        try:
            db.table("bank_customers").update({"replacements_this_year": cust["replacements_this_year"]}).eq("id", customer_id).execute()
        except Exception as e:
            logger.error(f"Failed to update replacements: {e}")
        reason = slots.get("reason", "unknown")

        result = {
            "status": "completed",
            "action": "card_reissued",
            "frozen": policy_result.get("details", {}).get("freeze_card", False),
            "digital_card_issued": policy_result.get("details", {}).get("offer_digital", False),
            "shipping": "expedited" if cust["loyalty_tier"] in ["platinum", "gold"] else "standard"
        }
    else:
        return {"error": f"Unknown action execution for intent {intent}"}

    logger.info(f"Action executed successfully: {result}")
    return result
