"""Typed application settings (12-factor): environment variables or a `.env` file.

See `.env.example` in the repository root for every option.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
INSECURE_KEY = "dev-insecure-secret-change-me-0123456789abcdef"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", str(BACKEND_DIR / ".env"), str(BACKEND_DIR.parent / ".env")),
        extra="ignore"
    )

    ENV: str = "development"                      # development | production
    APP_NAME: str = "CampusLink"
    DATABASE_URL: str = Field("sqlite:///./campuslink.db", validation_alias=AliasChoices("DATABASE_URL", "CAMPUSLINK_DB"))
    MONGODB_URI: str = Field("", validation_alias=AliasChoices("MONGODB_URI", "MONGO_URI"))
    GOOGLE_CLIENT_ID: str = Field("", validation_alias=AliasChoices("GOOGLE_CLIENT_ID", "VITE_GOOGLE_CLIENT_ID"))
    GOOGLE_CLIENT_SECRET: str = Field("", validation_alias=AliasChoices("GOOGLE_CLIENT_SECRET", "GOOGLE_SECRET"))
    SECRET_KEY: str = INSECURE_KEY
    ACCESS_TOKEN_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:8000"   # comma-separated

    SEED_DEMO_DATA: bool = False                  # synthetic campus data + demo accounts
    DEMO_MODE: bool = False                       # show demo credentials on the login page
    ADMIN_EMAIL: str = "admin@campuslink.edu"     # first admin (created only when no users exist)
    ADMIN_PASSWORD: str = "Admin@123"

    HOLIDAYS: str = ""                            # "YYYY-MM-DD:Name,..." added to the scheduler calendar
    AUTOMATION_INTERVAL_MINUTES: int = 60         # scheduled workflow automation; 0 = off
    LOGIN_ATTEMPTS_PER_MINUTE: int = 10
    API_REQUESTS_PER_MINUTE: int = 1200           # per client IP
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False

    MODEL_DIR: str = str(BACKEND_DIR / "data" / "models")
    UPLOAD_DIR: str = str(BACKEND_DIR / "data" / "uploads")   # resume PDFs (mount a persistent volume)
    RESUME_MAX_MB: int = 5
    RESUME_MAX_PAGES: int = 10
    TORCH_THREADS: int = 0                        # CPU threads for PyTorch; 0 = auto (all cores, max 8)
    LLM_QUANTIZE: bool = True                     # int8 dynamic quantisation of the LLM's Linear layers (faster on CPU)
    LLM_MAX_NEW_TOKENS: int = 200
    LLM_BACKEND: str = "transformers"             # transformers | ollama | none
    LLM_MODEL: str = "Qwen/Qwen2.5-0.5B-Instruct"
    LLM_AUTOLOAD: bool = True
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    def validate_for_production(self) -> None:
        if not self.is_production:
            return
        problems = []
        if self.SECRET_KEY == INSECURE_KEY or len(self.SECRET_KEY) < 32 or "change-me" in self.SECRET_KEY.lower():
            problems.append("SECRET_KEY must be set to a random string of at least 32 characters")
        if self.ADMIN_PASSWORD == "Admin@123" or "change-me" in self.ADMIN_PASSWORD.lower():
            problems.append("ADMIN_PASSWORD must be changed from the default")
        if self.DEMO_MODE:
            problems.append("DEMO_MODE must be false in production")
        if problems:
            raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
