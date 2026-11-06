# app/db/init_sqlite.py
import argparse
from app.db.session import engine
# Важно: импортировать модели, чтобы они зарегистрировались в Base.metadata
from app.models import Base  # noqa: F401
import app.models.zone      # noqa: F401
import app.models.spot      # noqa: F401
import app.models.device    # noqa: F401
import app.models.event     # noqa: F401
import app.models.snapshot  # noqa: F401

def create_tables():
    Base.metadata.create_all(bind=engine)

def drop_tables():
    Base.metadata.drop_all(bind=engine)

def main():
    parser = argparse.ArgumentParser(description="Init SQLite DB (create/drop tables).")
    parser.add_argument("--reset", action="store_true", help="Drop all tables before create.")
    args = parser.parse_args()

    if args.reset:
        drop_tables()
    create_tables()
    print("DB schema initialized.")

if __name__ == "__main__":
    main()
