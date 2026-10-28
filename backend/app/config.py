"""All configuration comes from environment variables (or a .env file)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database ---------------------------------------------------------
    # Default: a local SQLite file — kuch install karne ki zaroorat nahi.
    # Production me Postgres daal do (Supabase / Render Postgres):
    #   DATABASE_URL=postgresql://user:pass@host:5432/dbname
    DATABASE_URL: str = "sqlite:///./leads.db"

    APP_NAME: str = "VyomAcre Leads API"
    APP_ENV: str = "development"

    # --- CORS -------------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Admin (single admin, no user table needed) -----------------------
    ADMIN_EMAIL: str = "admin@vyomacre.com"
    ADMIN_PASSWORD: str = "change-me-please"
    SECRET_KEY: str = "dev-secret-change-me-in-production"
    TOKEN_TTL_HOURS: int = 12

    # --- Notifications ----------------------------------------------------
    NOTIFY_EMAIL_TO: str = ""          # comma-separated: you,teamleader@...
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_NAME: str = "VyomAcre"

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    APP_BASE_URL: str = ""              # link used inside alert emails

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
