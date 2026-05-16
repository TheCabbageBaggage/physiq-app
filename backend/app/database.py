"""Database configuration with SQLite/PostgreSQL support."""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./healthhub.db")
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

engine_kwargs = {"pool_pre_ping": True}
if IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL;")
        cur.execute("PRAGMA synchronous=NORMAL;")
        cur.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
