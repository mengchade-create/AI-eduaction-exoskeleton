"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app._version import get_app_version
from app.config import get_settings
from app.routers import health


settings = get_settings()

app = FastAPI(title="ExoKids API", version=get_app_version())
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
