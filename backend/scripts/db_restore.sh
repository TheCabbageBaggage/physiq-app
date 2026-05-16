#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

BACKUP_FILE="$1"
DB_URL="${DATABASE_URL:-sqlite:///./healthhub.db}"

if [[ "$DB_URL" == sqlite* ]]; then
  dst="${DB_URL#sqlite:///}"
  cp "$BACKUP_FILE" "$dst"
  echo "Restored SQLite DB from $BACKUP_FILE to $dst"
else
  psql "$DB_URL" < "$BACKUP_FILE"
  echo "Restored PostgreSQL DB from $BACKUP_FILE"
fi
