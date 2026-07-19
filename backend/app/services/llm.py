"""
Groq LLM service — wraps the Groq client for use by the agent.
"""

from groq import AsyncGroq

from app.config import settings


class LLMService:
    """Async wrapper around the Groq API."""

    def __init__(self):
        self._client: AsyncGroq | None = None

    @property
    def client(self) -> AsyncGroq:
        if self._client is None:
            self._client = AsyncGroq(api_key=settings.groq_api_key)
        return self._client

    async def chat_completion(self, messages: list[dict], **kwargs) -> str:
        """Send a chat completion request to Groq.

        Args:
            messages: List of message dicts with 'role' and 'content' keys.
            **kwargs: Additional parameters forwarded to the Groq API.

        Returns:
            The assistant's response content.
        """
        model = kwargs.pop("model", settings.groq_model)
        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs,
        )
        return response.choices[0].message.content or ""


# Singleton instance
llm_service = LLMService()
