"""Core configuration module for SubscriptNova."""
import os
from typing import List
from dotenv import load_dotenv

# Load .env file from backend root or parent
load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "SubscriptNova")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "t")

    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "subscriptnova_super_secret_dev_key_change_in_production_32chars!"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./subscriptnova.db")

    # CORS
    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

settings = Settings()

