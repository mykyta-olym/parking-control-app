#!/usr/bin/env sh
set -e

APP_USER=${APP_USER:-appuser}
DB_DIR="/app/SQLite"

# Ensure SQLite dir exists and is writable by APP_USER (handles mounted volume owned by root)
mkdir -p "$DB_DIR"
chown -R "$APP_USER":"$APP_USER" "$DB_DIR"

run_as_appuser() {
  su -s /bin/sh "$APP_USER" -c "$*"
}

# Initialize and seed demo data (idempotent with --reset)
run_as_appuser "python -m app.db.init_sqlite --reset"
run_as_appuser "python -m app.db.seed_demo --reset"

exec su -s /bin/sh "$APP_USER" -c "uvicorn app.main:app --host 0.0.0.0 --port 8000"
