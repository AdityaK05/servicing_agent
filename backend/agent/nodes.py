"""
Graph node functions.

Each function receives the AgentState and returns a partial state update.
Keep nodes focused — one responsibility per node.
"""

from agent.state import AgentState


async def process_message(state: AgentState) -> dict:
    """Parse and enrich the incoming user message.

    Responsibilities:
        - Extract entities (card numbers, dates, amounts)
        - Build/update user context
        - Prepare messages for the LLM

    Returns:
        Partial state update with enriched user_context.
    """
    # TODO: Implement message processing
    return {"user_context": state.get("user_context", {})}


async def route_intent(state: AgentState) -> dict:
    """Classify the user's intent and determine required actions.

    Responsibilities:
        - Call LLM for intent classification
        - Map intent → action type(s)
        - Populate pending_actions

    Returns:
        Partial state update with pending_actions.
    """
    # TODO: Implement intent routing via Groq
    return {"pending_actions": []}


async def execute_action(state: AgentState) -> dict:
    """Execute pending actions and generate the agent response.

    Responsibilities:
        - Execute each pending action (API calls, DB writes)
        - Generate natural language response
        - Move actions from pending to completed

    Returns:
        Partial state update with messages and completed_actions.
    """
    # TODO: Implement action execution
    return {
        "pending_actions": [],
        "completed_actions": state.get("completed_actions", []),
    }
