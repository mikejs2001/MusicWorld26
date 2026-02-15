"""Audio track analyzer - extracts mood-relevant features from audio files."""

import librosa
import numpy as np


def analyze_track(file_path):
    """Analyze an audio file and return mood-relevant features.

    Returns a dict with:
        bpm: tempo in beats per minute
        energy: 0.0-1.0 how loud/intense the track is
        danceability: 0.0-1.0 how steady and strong the beat is
        valence: 0.0-1.0 estimate of positive vs negative feel
        acousticness: 0.0-1.0 how acoustic vs electronic
    """
    y, sr = librosa.load(file_path, sr=22050, duration=120)

    # BPM
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(np.atleast_1d(tempo)[0])

    # Energy - based on RMS loudness, normalized
    rms = librosa.feature.rms(y=y)[0]
    energy = float(np.clip(np.mean(rms) / 0.1, 0.0, 1.0))

    # Danceability - based on beat strength and regularity
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    pulse = librosa.beat.plp(onset_envelope=onset_env, sr=sr)
    danceability = float(np.clip(np.mean(pulse), 0.0, 1.0))

    # Valence estimate - major vs minor key tendency using chroma
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    # Simple heuristic: major thirds vs minor thirds presence
    major_strength = float(np.mean(chroma[4]))  # E (major third from C)
    minor_strength = float(np.mean(chroma[3]))  # Eb (minor third from C)
    valence_raw = major_strength / (major_strength + minor_strength + 1e-6)
    # Combine with spectral brightness for better estimate
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    brightness = float(np.clip(np.mean(spectral_centroid) / 5000.0, 0.0, 1.0))
    valence = float(np.clip((valence_raw * 0.6 + brightness * 0.4), 0.0, 1.0))

    # Acousticness - based on spectral flatness and zero crossing rate
    spectral_flatness = librosa.feature.spectral_flatness(y=y)[0]
    zcr = librosa.feature.zero_crossing_rate(y=y)[0]
    acousticness = float(np.clip(
        1.0 - (np.mean(spectral_flatness) * 5 + np.mean(zcr) * 2) / 2,
        0.0, 1.0
    ))

    return {
        "bpm": round(bpm, 1),
        "energy": round(energy, 3),
        "danceability": round(danceability, 3),
        "valence": round(valence, 3),
        "acousticness": round(acousticness, 3),
    }
