/* library.js — IndexedDB wrapper for track & audio storage */

const Library = {
    db: null,
    DB_NAME: 'MusicWorld26',
    DB_VERSION: 1,

    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('tracks')) {
                    db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('audio')) {
                    db.createObjectStore('audio', { keyPath: 'trackId' });
                }
                if (!db.objectStoreNames.contains('artwork')) {
                    db.createObjectStore('artwork', { keyPath: 'trackId' });
                }
            };

            req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            req.onerror = (e) => reject(e.target.error);
        });
    },

    /* ---------- tracks ---------- */

    async addTrack(meta, audioBlob, artworkBlob) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['tracks', 'audio', 'artwork'], 'readwrite');
            const trackReq = tx.objectStore('tracks').add(meta);

            trackReq.onsuccess = () => {
                const id = trackReq.result;
                tx.objectStore('audio').put({ trackId: id, blob: audioBlob });
                if (artworkBlob) {
                    tx.objectStore('artwork').put({ trackId: id, blob: artworkBlob });
                }
                resolve(id);
            };
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    async getAllTracks() {
        return new Promise((resolve, reject) => {
            const req = this.db.transaction('tracks', 'readonly').objectStore('tracks').getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async getAudio(trackId) {
        return new Promise((resolve, reject) => {
            const req = this.db.transaction('audio', 'readonly').objectStore('audio').get(trackId);
            req.onsuccess = () => resolve(req.result?.blob);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async getArtwork(trackId) {
        return new Promise((resolve, reject) => {
            const req = this.db.transaction('artwork', 'readonly').objectStore('artwork').get(trackId);
            req.onsuccess = () => resolve(req.result?.blob);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async updateTrack(track) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('tracks', 'readwrite');
            tx.objectStore('tracks').put(track);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    async removeTrack(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['tracks', 'audio', 'artwork'], 'readwrite');
            tx.objectStore('tracks').delete(id);
            tx.objectStore('audio').delete(id);
            tx.objectStore('artwork').delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    async clearAll() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['tracks', 'audio', 'artwork'], 'readwrite');
            tx.objectStore('tracks').clear();
            tx.objectStore('audio').clear();
            tx.objectStore('artwork').clear();
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    }
};
