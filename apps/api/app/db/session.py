"""SQLModel engine and session helpers."""

from collections.abc import Iterator

from sqlmodel import Session, create_engine

from app.config import get_settings


engine = create_engine(get_settings().database_url, pool_pre_ping=True)


def get_session() -> Iterator[Session]:
    """Yield a database session."""

    with Session(engine) as session:
        yield session
