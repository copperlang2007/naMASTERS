import json
import os
import sqlite3
import uuid

DB_PATH = os.getenv("DB_PATH", "sessions.db")


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            session_id          TEXT PRIMARY KEY,
            agent_name          TEXT,
            started_at          TEXT,
            ended_at            TEXT,
            duration_seconds    INTEGER,
            transcript          TEXT,
            score               TEXT,
            overall_score       REAL,
            discovery_checklist TEXT,
            compliance_flags    TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def save_session(
    agent_name: str,
    started_at: str,
    ended_at: str,
    duration_seconds: int,
    transcript: list,
    score: dict,
) -> str:
    session_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT INTO sessions
                (session_id, agent_name, started_at, ended_at, duration_seconds,
                 transcript, score, overall_score, discovery_checklist, compliance_flags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                agent_name,
                started_at,
                ended_at,
                duration_seconds,
                json.dumps(transcript),
                json.dumps(score),
                float(score.get("overall_score", 0)),
                json.dumps(score.get("discovery_checklist", {})),
                json.dumps(score.get("compliance_flags", [])),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return session_id
