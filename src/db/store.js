/**
 * IndexedDB storage for track metadata/analysis and audio blobs.
 * LocalStorage for UI preferences.
 */

const DB_NAME = 'MusicWorld26';
const DB_VERSION = 2;
const TRACKS_STORE = 'tracks';
const BLOBS_STORE = 'audioBlobs';

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
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE, { keyPath: 'id' });
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

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Tracks Store ---

export async function addTrack(track) {
  const db = await openDB();
  const store = db.transaction(TRACKS_STORE, 'readwrite').objectStore(TRACKS_STORE);
  return promisifyRequest(store.put(track));
}

export async function getTrack(id) {
  const db = await openDB();
  const store = db.transaction(TRACKS_STORE, 'readonly').objectStore(TRACKS_STORE);
  return promisifyRequest(store.get(id));
}

export async function getAllTracks() {
  const db = await openDB();
  const store = db.transaction(TRACKS_STORE, 'readonly').objectStore(TRACKS_STORE);
  return promisifyRequest(store.getAll());
}

export async function updateTrack(id, data) {
  const existing = await getTrack(id);
  if (!existing) throw new Error(`Track not found: ${id}`);
  const updated = { ...existing, ...data };
  const db = await openDB();
  const store = db.transaction(TRACKS_STORE, 'readwrite').objectStore(TRACKS_STORE);
  return promisifyRequest(store.put(updated));
}

export async function deleteTrack(id) {
  const db = await openDB();
  const tx = db.transaction([TRACKS_STORE, BLOBS_STORE], 'readwrite');
  tx.objectStore(TRACKS_STORE).delete(id);
  tx.objectStore(BLOBS_STORE).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllTracks() {
  const db = await openDB();
  const tx = db.transaction([TRACKS_STORE, BLOBS_STORE], 'readwrite');
  tx.objectStore(TRACKS_STORE).clear();
  tx.objectStore(BLOBS_STORE).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTrackCount() {
  const db = await openDB();
  const store = db.transaction(TRACKS_STORE, 'readonly').objectStore(TRACKS_STORE);
  return promisifyRequest(store.count());
}

// --- Audio Blob Store ---

export async function storeAudioBlob(trackId, fileOrBlob) {
  const db = await openDB();
  const store = db.transaction(BLOBS_STORE, 'readwrite').objectStore(BLOBS_STORE);
  // Store as Blob for efficient IndexedDB storage (browsers handle blobs natively)
  const blob = fileOrBlob instanceof Blob ? fileOrBlob : new Blob([fileOrBlob]);
  return promisifyRequest(store.put({ id: trackId, blob, type: blob.type }));
}

export async function getStoredAudioBlob(trackId) {
  const db = await openDB();
  const store = db.transaction(BLOBS_STORE, 'readonly').objectStore(BLOBS_STORE);
  const record = await promisifyRequest(store.get(trackId));
  return record ? record.blob : null;
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
    // localStorage full or unavailable
  }
}

export function removePreference(key) {
  localStorage.removeItem(PREFS_PREFIX + key);
}
