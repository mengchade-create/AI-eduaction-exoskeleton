"""Runtime configuration for the ExoKids API."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """Application settings loaded from environment variables."""

    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://exokids:change-me-please-postgres-password@localhost:5432/exokids",
    )


def get_settings() -> Settings:
    """Return API settings."""

    return Settings()
