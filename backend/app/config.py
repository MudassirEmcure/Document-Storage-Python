"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/document_storage"

    # JWT
    JWT_SECRET: str = "change-me"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Azure AD OIDC
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_TENANT_ID: str = ""
    AZURE_REDIRECT_URI: str = "http://localhost:8000/auth/sso/callback"

    # SMTP
    SMTP_HOST: str = "smtp.office365.com"
    SMTP_PORT: int = 25
    SMTP_USER: str = "Emcure.MendixAD@emcure.com"
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "Emcure.MendixAD@emcure.com"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Emcure Employee API
    EMCURE_EMPLOYEE_API_URL: str = "https://ad-prod-darwinsvc-prod.apps.emart.oneemcure.local/adintegratorservices/rest/v1/getselectedemployees"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
