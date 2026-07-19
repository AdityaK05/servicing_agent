"""
Application settings loaded from environment variables.

Uses Pydantic BaseSettings for validation and .env file support.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ─── App ─────────────────────────────────────────────────────
    app_env: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    # ─── Groq ────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_classifier_model: str = "llama-3.1-8b-instant"

    # ─── Supabase ────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
