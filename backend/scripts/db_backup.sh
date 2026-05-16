#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-sqlite:///./healthhub.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

ts="$(date +%Y%m%d_%H%M%S)"

if [[ "$DB_URL" == sqlite* ]]; then
  src="${DB_URL#sqlite:///}"
  dst="$BACKUP_DIR/healthhub_${ts}.db"
  cp "$src" "$dst"
  echo "Created SQLite backup: $dst"
else
  dst="$BACKUP_DIR/postgres_${ts}.sql"
  pg_dump "$DB_URL" > "$dst"
  echo "Created PostgreSQL backup: $dst"
fi

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete
