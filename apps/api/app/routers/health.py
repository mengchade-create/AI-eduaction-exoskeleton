"""Health check endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlmodel import Session

from app._version import get_app_version
from app.deps import get_db


router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health() -> dict[str, str]:
    return {"status": "ok", "version": get_app_version()}


@router.get("/db")
def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="db_unavailable") from exc
    return {"db": "ok"}
