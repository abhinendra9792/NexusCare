from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables or backend/.env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NexusCare API"
    app_env: str = "development"
    database_url: str = "sqlite:///./nexuscare.db"
    frontend_origin: str = "http://localhost:5173"
    max_upload_size_mb: int = Field(default=5, ge=1, le=20)

    # SecretStr hides the key if settings are ever printed or logged.
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = None
    ai_timeout_seconds: float = Field(default=30, ge=5, le=120)
    ai_max_retries: int = Field(default=2, ge=0, le=3)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]

    @property
    def gemini_configured(self) -> bool:
        has_key = bool(self.gemini_api_key and self.gemini_api_key.get_secret_value().strip())
        return has_key and bool(self.gemini_model)


@lru_cache
def get_settings() -> Settings:
    return Settings()