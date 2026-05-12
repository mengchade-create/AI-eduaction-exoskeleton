"""FastAPI application entrypoint."""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings


def get_app_version() -> str:
    """Return package version, falling back when the package is not installed."""

    try:
        return version("exokids-api")
    except PackageNotFoundError:
        return "0.0.0+unknown"


settings = get_settings()

app = FastAPI(title="ExoKids API", version=get_app_version())
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
