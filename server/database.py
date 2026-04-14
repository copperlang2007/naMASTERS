import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent / "sessions.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT,
                started_at TEXT,
                ended_at TEXT,
                transcript_json TEXT
            )
            """
        )
