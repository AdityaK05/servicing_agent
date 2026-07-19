"""
Supabase client initialization.

Provides a singleton async Supabase client for database operations.
"""

from supabase import Client, create_client

from app.config import settings


def get_supabase_client() -> Client:
    """Create and return a Supabase client instance.

    Returns:
        Configured Supabase client.

    Raises:
        ValueError: If Supabase URL or key is not configured.
    """
    key = settings.supabase_service_role_key or settings.supabase_anon_key
    if not settings.supabase_url or not key:
        raise ValueError(
            "SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set."
        )

    return create_client(settings.supabase_url, key)


# Lazy singleton — initialized on first access
_client: Client | None = None


def get_db() -> Client:
    """Get the singleton Supabase client."""
    global _client
    if _client is None:
        _client = get_supabase_client()
    return _client
