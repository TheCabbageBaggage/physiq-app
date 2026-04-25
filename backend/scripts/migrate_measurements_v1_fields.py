"""One-off SQLite migration for V1-compatible measurement fields."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "healthhub.db"


def column_exists(cur: sqlite3.Cursor, table: str, column: str) -> bool:
    cur.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cur.fetchall())


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    alters = {
        "body_fat_percent": "REAL",
        "muscle_mass_percent": "REAL",
        "stomach_circumference_cm": "REAL",
        "skeletal_muscle_mass_kg": "REAL",
        "visceral_fat_level": "INTEGER",
        "bmr_kcal": "REAL",
        "source_type": "TEXT DEFAULT 'manual'",
        "is_user_corrected": "INTEGER DEFAULT 0",
    }

    for col, col_type in alters.items():
        if not column_exists(cur, "measurements", col):
            cur.execute(f"ALTER TABLE measurements ADD COLUMN {col} {col_type}")

    if column_exists(cur, "measurements", "body_fat_percentage"):
        cur.execute(
            "UPDATE measurements SET body_fat_percent = COALESCE(body_fat_percent, body_fat_percentage)"
        )

    if column_exists(cur, "measurements", "waist_circumference_cm"):
        cur.execute(
            "UPDATE measurements SET stomach_circumference_cm = COALESCE(stomach_circumference_cm, waist_circumference_cm)"
        )

    cur.execute("UPDATE measurements SET source_type = COALESCE(source_type, source, 'manual')")
    conn.commit()
    conn.close()
    print(f"Migration complete: {DB_PATH}")


if __name__ == "__main__":
    main()
