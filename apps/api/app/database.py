import os

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def make_engine(url: str | None = None) -> Engine:
    database_url = url or os.environ.get(
        "DATABASE_URL", "postgresql+psycopg://piksa:change-me@localhost:5432/piksa"
    )
    return create_engine(database_url, pool_pre_ping=True)
