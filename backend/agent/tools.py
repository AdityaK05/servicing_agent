"""
Tool definitions for the LangGraph agent.

Each tool is a callable that the agent can invoke during execution.
Tools interact with external systems (Supabase, card APIs, etc.).
"""

from langchain_core.tools import tool


@tool
def lookup_card(card_last_four: str) -> dict:
    """Look up card details by last four digits.

    Args:
        card_last_four: Last 4 digits of the card number.

    Returns:
        Card details including status, type, and limit.
    """
    # TODO: Query Supabase or card API
    return {"status": "not_implemented"}


@tool
def query_transactions(card_id: str, limit: int = 10) -> list[dict]:
    """Query recent transactions for a card.

    Args:
        card_id: The card identifier.
        limit: Maximum number of transactions to return.

    Returns:
        List of transaction records.
    """
    # TODO: Query transaction history
    return []


@tool
def file_dispute(transaction_id: str, reason: str) -> dict:
    """File a dispute for a specific transaction.

    Args:
        transaction_id: The transaction to dispute.
        reason: Reason for the dispute.

    Returns:
        Dispute confirmation with case ID.
    """
    # TODO: Create dispute record
    return {"status": "not_implemented"}


@tool
def update_card_limit(card_id: str, new_limit: float) -> dict:
    """Request a credit limit change.

    Args:
        card_id: The card identifier.
        new_limit: Requested new credit limit.

    Returns:
        Limit change request status.
    """
    # TODO: Submit limit change request
    return {"status": "not_implemented"}
