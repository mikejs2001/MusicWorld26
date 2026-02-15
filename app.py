"""MusicWorld26 - Mood-Based Music Selector.

Upload tracks, they get analyzed for audio features,
then select your mood and get a matching playlist.
"""

import os
import threading

from flask import Flask, jsonify, request, send_from_directory

from analyzer import analyze_track
from database import add_track, get_all_tracks, get_track_by_id, init_db, update_track_features
from moods import MOODS, get_tracks_for_mood

app = Flask(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".m4a"}


def allowed_file(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return send_from_directory("templates", "index.html")


@app.route("/api/moods")
def list_moods():
    result = {}
    for key, mood in MOODS.items():
        result[key] = {
            "label": mood["label"],
            "description": mood["description"],
            "color": mood["color"],
            "icon": mood["icon"],
        }
    return jsonify(result)


@app.route("/api/tracks")
def list_tracks():
    tracks = get_all_tracks()
    return jsonify(tracks)


@app.route("/api/upload", methods=["POST"])
def upload_track():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"File type not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    filename = file.filename
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Avoid overwriting
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(filepath):
        filename = f"{base}_{counter}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        counter += 1

    file.save(filepath)

    title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()
    track_id = add_track(filename, title, filepath)

    # Analyze in background so upload returns quickly
    def do_analysis():
        try:
            features = analyze_track(filepath)
            update_track_features(track_id, features)
        except Exception as e:
            print(f"Analysis failed for {filename}: {e}")

    thread = threading.Thread(target=do_analysis)
    thread.start()

    return jsonify({"id": track_id, "filename": filename, "title": title, "status": "analyzing"})


@app.route("/api/mood/<mood_key>")
def mood_playlist(mood_key):
    if mood_key not in MOODS:
        return jsonify({"error": "Unknown mood"}), 400

    tracks = get_all_tracks()
    if not tracks:
        return jsonify({"error": "No analyzed tracks in library"}), 404

    playlist = get_tracks_for_mood(tracks, mood_key)
    return jsonify({
        "mood": MOODS[mood_key]["label"],
        "tracks": playlist,
    })


@app.route("/api/track/<int:track_id>")
def track_info(track_id):
    track = get_track_by_id(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404
    return jsonify(track)


@app.route("/audio/<path:filename>")
def serve_audio(filename):
    return send_from_directory(UPLOAD_DIR, filename)


if __name__ == "__main__":
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
