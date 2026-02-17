/**
 * IndexedDB storage for track metadata/analysis and LocalStorage for preferences.
 */

const DB_NAME = 'MusicWorld26';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';

let dbInstance = null;

export async function openDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        const store = db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
        store.createIndex('artist', 'artist', { unique: false });
        store.createIndex('album', 'album', { unique: false });
        store.createIndex('bpm', 'bpm', { unique: false });
        store.createIndex('valence', 'valence', { unique: false });
        store.createIndex('analyzed', 'analyzed', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error(`IndexedDB error: ${event.target.error}`));
    };
  });
}

function txStore(mode) {
  return dbInstance.transaction(TRACKS_STORE, mode).objectStore(TRACKS_STORE);
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addTrack(track) {
  const db = await openDB();
  const store = txStore('readwrite');
  return promisifyRequest(store.put(track));
}

export async function getTrack(id) {
  const db = await openDB();
  const store = txStore('readonly');
  return promisifyRequest(store.get(id));
}

export async function getAllTracks() {
  const db = await openDB();
  const store = txStore('readonly');
  return promisifyRequest(store.getAll());
}

export async function updateTrack(id, data) {
  const existing = await getTrack(id);
  if (!existing) throw new Error(`Track not found: ${id}`);
  const updated = { ...existing, ...data };
  const store = txStore('readwrite');
  return promisifyRequest(store.put(updated));
}

export async function deleteTrack(id) {
  const db = await openDB();
  const store = txStore('readwrite');
  return promisifyRequest(store.delete(id));
}

export async function clearAllTracks() {
  const db = await openDB();
  const store = txStore('readwrite');
  return promisifyRequest(store.clear());
}

export async function getUnanalyzedTracks() {
  const tracks = await getAllTracks();
  return tracks.filter((t) => !t.analyzed);
}

export async function getTrackCount() {
  const db = await openDB();
  const store = txStore('readonly');
  return promisifyRequest(store.count());
}

// --- LocalStorage Preferences ---

const PREFS_PREFIX = 'mw26_';

export function getPreference(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(PREFS_PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function setPreference(key, value) {
  try {
    localStorage.setItem(PREFS_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function removePreference(key) {
  localStorage.removeItem(PREFS_PREFIX + key);
}
