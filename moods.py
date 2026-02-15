"""Mood definitions and matching logic.

Each mood is defined as a target profile of audio features.
Tracks are scored by how closely they match the target profile.
"""

import math

# Each mood maps to ideal feature values and weights.
# Features: bpm (normalized 0-1 over 60-180 range), energy, danceability, valence, acousticness
MOODS = {
    "happy": {
        "label": "Happy",
        "description": "Upbeat and cheerful",
        "color": "#FFD700",
        "icon": "\u2600\ufe0f",
        "targets": {"bpm_norm": 0.6, "energy": 0.65, "danceability": 0.6, "valence": 0.85, "acousticness": 0.4},
        "weights": {"bpm_norm": 1.0, "energy": 1.0, "danceability": 1.0, "valence": 2.0, "acousticness": 0.5},
    },
    "sad": {
        "label": "Sad",
        "description": "Melancholy and reflective",
        "color": "#4A6FA5",
        "icon": "\U0001f327\ufe0f",
        "targets": {"bpm_norm": 0.2, "energy": 0.25, "danceability": 0.2, "valence": 0.15, "acousticness": 0.7},
        "weights": {"bpm_norm": 1.0, "energy": 1.5, "danceability": 0.8, "valence": 2.0, "acousticness": 1.0},
    },
    "energetic": {
        "label": "Energetic",
        "description": "High energy, get moving",
        "color": "#FF4500",
        "icon": "\u26a1",
        "targets": {"bpm_norm": 0.8, "energy": 0.9, "danceability": 0.8, "valence": 0.65, "acousticness": 0.15},
        "weights": {"bpm_norm": 1.5, "energy": 2.0, "danceability": 1.5, "valence": 0.5, "acousticness": 1.0},
    },
    "relaxed": {
        "label": "Relaxed",
        "description": "Calm and peaceful",
        "color": "#77DD77",
        "icon": "\U0001f343",
        "targets": {"bpm_norm": 0.25, "energy": 0.2, "danceability": 0.25, "valence": 0.55, "acousticness": 0.75},
        "weights": {"bpm_norm": 1.5, "energy": 2.0, "danceability": 1.0, "valence": 0.5, "acousticness": 1.5},
    },
    "romantic": {
        "label": "Romantic",
        "description": "Love and tenderness",
        "color": "#FF69B4",
        "icon": "\u2764\ufe0f",
        "targets": {"bpm_norm": 0.3, "energy": 0.35, "danceability": 0.35, "valence": 0.6, "acousticness": 0.65},
        "weights": {"bpm_norm": 1.0, "energy": 1.5, "danceability": 0.8, "valence": 1.5, "acousticness": 1.5},
    },
    "angry": {
        "label": "Angry",
        "description": "Intense and aggressive",
        "color": "#CC0000",
        "icon": "\U0001f525",
        "targets": {"bpm_norm": 0.75, "energy": 0.9, "danceability": 0.5, "valence": 0.2, "acousticness": 0.1},
        "weights": {"bpm_norm": 1.0, "energy": 2.0, "danceability": 0.5, "valence": 1.5, "acousticness": 1.0},
    },
    "party": {
        "label": "Party",
        "description": "Dance floor ready",
        "color": "#FF00FF",
        "icon": "\U0001f389",
        "targets": {"bpm_norm": 0.7, "energy": 0.8, "danceability": 0.9, "valence": 0.75, "acousticness": 0.1},
        "weights": {"bpm_norm": 1.0, "energy": 1.0, "danceability": 2.5, "valence": 1.0, "acousticness": 1.0},
    },
    "focus": {
        "label": "Focus",
        "description": "Concentration and study",
        "color": "#6A5ACD",
        "icon": "\U0001f9e0",
        "targets": {"bpm_norm": 0.4, "energy": 0.35, "danceability": 0.3, "valence": 0.45, "acousticness": 0.6},
        "weights": {"bpm_norm": 1.0, "energy": 2.0, "danceability": 1.5, "valence": 0.5, "acousticness": 1.0},
    },
}


def normalize_bpm(bpm):
    """Normalize BPM to 0-1 range (60-180 BPM mapped to 0-1)."""
    return max(0.0, min(1.0, (bpm - 60.0) / 120.0))


def score_track_for_mood(track, mood_key):
    """Score how well a track matches a mood. Lower = better match."""
    mood = MOODS[mood_key]
    targets = mood["targets"]
    weights = mood["weights"]

    track_features = {
        "bpm_norm": normalize_bpm(track["bpm"]),
        "energy": track["energy"],
        "danceability": track["danceability"],
        "valence": track["valence"],
        "acousticness": track["acousticness"],
    }

    # Weighted Euclidean distance
    total = 0.0
    for feature, target in targets.items():
        diff = track_features[feature] - target
        total += weights[feature] * (diff ** 2)

    return math.sqrt(total)


def get_tracks_for_mood(tracks, mood_key, limit=20):
    """Return tracks sorted by how well they match the given mood."""
    scored = [(t, score_track_for_mood(t, mood_key)) for t in tracks]
    scored.sort(key=lambda x: x[1])
    return [
        {**track, "mood_score": round(1.0 - min(score / 2.0, 1.0), 2)}
        for track, score in scored[:limit]
    ]
