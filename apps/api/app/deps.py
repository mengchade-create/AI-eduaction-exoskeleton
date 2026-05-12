"""FastAPI dependency helpers."""

from collections.abc import Iterator

from sqlmodel import Session

from app.db.session import engine


def get_db() -> Iterator[Session]:
    """Yield a SQLModel session."""

    with Session(engine) as session:
        yield session
