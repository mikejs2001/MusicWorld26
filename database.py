"""SQLite database for storing tracks and their analyzed features."""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "musicworld.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            title TEXT NOT NULL,
            filepath TEXT NOT NULL UNIQUE,
            bpm REAL,
            energy REAL,
            danceability REAL,
            valence REAL,
            acousticness REAL,
            analyzed INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()


def add_track(filename, title, filepath):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO tracks (filename, title, filepath) VALUES (?, ?, ?)",
            (filename, title, filepath),
        )
        conn.commit()
        track_id = conn.execute(
            "SELECT id FROM tracks WHERE filepath = ?", (filepath,)
        ).fetchone()["id"]
    finally:
        conn.close()
    return track_id


def update_track_features(track_id, features):
    conn = get_db()
    try:
        conn.execute(
            """UPDATE tracks SET
                bpm = ?, energy = ?, danceability = ?, valence = ?,
                acousticness = ?, analyzed = 1
            WHERE id = ?""",
            (
                features["bpm"],
                features["energy"],
                features["danceability"],
                features["valence"],
                features["acousticness"],
                track_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def get_all_tracks():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM tracks WHERE analyzed = 1 ORDER BY title"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_track_by_id(track_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
