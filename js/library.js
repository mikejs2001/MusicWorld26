/* library.js — IndexedDB wrapper for track & audio storage */

const Library = {
    db: null,
    DB_NAME: 'MusicWorld26',
    DB_VERSION: 2,

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

    /* Re-open the database if the connection was lost or init failed */
    async ensureDb() {
        if (!this.db) await this.init();
    },

    /* ---------- tracks ---------- */

    async addTrack(meta, audioBlob, artworkBlob) {
        await this.ensureDb();

        /* Step 1: store track metadata (small, should always succeed) */
        const trackId = await new Promise((resolve, reject) => {
            const tx = this.db.transaction('tracks', 'readwrite');
            const req = tx.objectStore('tracks').add(meta);
            tx.oncomplete = () => resolve(req.result);
            tx.onerror    = (e) => reject(e.target.error);
            tx.onabort    = ()  => reject(tx.error || new Error('Track metadata transaction aborted'));
        });

        /* Step 2: store audio blob separately — if this fails (e.g. quota)
           the track metadata is still saved so the library isn't empty */
        try {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(['audio', 'artwork'], 'readwrite');
                tx.objectStore('audio').put({ trackId, blob: audioBlob });
                if (artworkBlob) {
                    tx.objectStore('artwork').put({ trackId, blob: artworkBlob });
                }
                tx.oncomplete = () => resolve();
                tx.onerror    = (e) => reject(e.target.error);
                tx.onabort    = ()  => reject(tx.error || new Error('Blob storage aborted'));
            });
        } catch (err) {
            console.warn('Audio blob storage failed for track', trackId, err);
        }

        return trackId;
    },

    async getAllTracks() {
        await this.ensureDb();
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
        /* Close the current connection, delete the entire database,
           then re-initialise so the app is ready for fresh data. */
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        await new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(this.DB_NAME);
            req.onsuccess = () => resolve();
            req.onerror   = (e) => reject(e.target.error);
            req.onblocked = () => resolve();   // resolve even if blocked
        });
        await this.init();
    }
};
