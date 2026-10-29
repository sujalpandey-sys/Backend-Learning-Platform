from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings validated using Pydantic Settings.
    Reads from environment variables and an optional .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_NAME: str = "Backend Learning Platform API"
    APP_ENV: Literal["development", "staging", "production", "testing"] = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite:///./task_management.db"

    # Security & Auth
    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS configuration
    CORS_ORIGINS: list[str] | str = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Redis Cache (Optional with graceful fallback)
    REDIS_URL: str | None = None
    CACHE_TTL_SECONDS: int = 120

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_production_secret(cls, v: str, info) -> str:
        """
        Enforce that known development placeholders are strictly rejected in production.
        """
        app_env = info.data.get("APP_ENV", "development")
        insecure_placeholders = {
            "development_secret_key_needs_to_be_at_least_32_chars_long_12345",
            "changeme_secret_key_at_least_32_characters_long",
            "secret",
            "password",
        }
        if app_env == "production" and (v in insecure_placeholders or len(v) < 32):
            raise ValueError(
                "Insecure JWT_SECRET_KEY placeholder or too short key used in production environment!"
            )
        return v


settings = Settings()
