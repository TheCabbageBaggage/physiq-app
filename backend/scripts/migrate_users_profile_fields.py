#!/usr/bin/env python3
"""Add user profile extension columns to users table (SQLite)."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "healthhub.db"
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads" / "profiles"

USER_COLUMNS = {
    "birth_date": "DATE",
    "gender": "VARCHAR",
    "phone": "VARCHAR",
    "address": "VARCHAR",
    "city": "VARCHAR",
    "postal_code": "VARCHAR",
    "country": "VARCHAR",
    "profile_image_url": "VARCHAR",
}


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if not table_exists(cur, "users"):
        print(f"Table 'users' not found in {DB_PATH}. Start the backend once to initialize schema, then rerun.")
        conn.close()
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Ensured upload directory: {UPLOAD_DIR}")
        return

    for col, col_type in USER_COLUMNS.items():
        if not column_exists(cur, "users", col):
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
            print(f"Added users.{col}")
        else:
            print(f"Exists users.{col}")

    conn.commit()
    conn.close()

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Ensured upload directory: {UPLOAD_DIR}")


if __name__ == "__main__":
    main()
