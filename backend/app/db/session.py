# app/db/session.py
from app.core.config import get_settings
from contextlib import contextmanager
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

DB_URL = get_settings().DB_URL

connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}

engine: Engine = create_engine(
    DB_URL,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args,
)
# pragma
if DB_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON;")
        cur.execute("PRAGMA journal_mode=WAL;")
        cur.execute("PRAGMA synchronous=NORMAL;")
        cur.close()

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
)

def get_session():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

@contextmanager
def session_scope():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_db():
    """FastAPI dependency: yields a DB session and ensures closing."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
