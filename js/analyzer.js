/* analyzer.js — BPM detection, mood analysis & basic ID3v2 tag parsing */

const Analyzer = {
    ctx: null,

    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    ensureCtx() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    /* ============================================================
       Main entry — analyse a File, return metadata + blobs
       ============================================================ */
    async analyzeFile(file) {
        this.ensureCtx();
        const arrayBuffer = await file.arrayBuffer();

        /* Try ID3 tags first */
        const tags = this.parseID3(arrayBuffer);

        /* Decode audio for BPM / mood */
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));

        const bpm  = this.detectBPM(audioBuffer);
        const mood = this.analyzeMood(audioBuffer);
        const nameParts = this.parseFilename(file.name, file.webkitRelativePath);

        return {
            name:       tags.title  || nameParts.title,
            artist:     tags.artist || nameParts.artist,
            album:      tags.album  || nameParts.album,
            genre:      tags.genre  || 'Unknown Genre',
            bpm,
            mood,
            moodX:      mood,                          // 0 = sad … 1 = happy
            moodY:      this.normalizeBPM(bpm),        // 0 = slow … 1 = fast
            duration:   audioBuffer.duration,
            fileName:   file.name,
            hasArtwork: !!tags.artworkBlob,
            /* extra blobs handed back separately */
            _audioBlob:   new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' }),
            _artworkBlob: tags.artworkBlob || null
        };
    },

    /* ============================================================
       BPM detection  (autocorrelation of onset energy envelope)
       ============================================================ */
    detectBPM(buf) {
        const data = buf.getChannelData(0);
        const sr   = buf.sampleRate;

        /* Use a 20-second slice from the middle */
        const start = Math.floor(Math.max(0, buf.duration / 2 - 10) * sr);
        const end   = Math.min(data.length, start + 20 * sr);
        const seg   = data.subarray(start, end);

        /* Build onset-strength envelope (energy in short windows) */
        const winMs  = 10;                        // 10 ms windows
        const winSz  = Math.floor(sr * winMs / 1000);
        const env = [];
        for (let i = 0; i < seg.length - winSz; i += winSz) {
            let e = 0;
            for (let j = 0; j < winSz; j++) e += seg[i + j] * seg[i + j];
            env.push(e / winSz);
        }

        /* Half-wave rectified first-difference (onset detection function) */
        const onset = new Float32Array(env.length);
        for (let i = 1; i < env.length; i++) {
            onset[i] = Math.max(0, env[i] - env[i - 1]);
        }

        /* Subtract the mean so autocorrelation isn't biased by DC offset */
        const mean = onset.reduce((a, b) => a + b, 0) / onset.length;
        for (let i = 0; i < onset.length; i++) onset[i] -= mean;

        /* Autocorrelation over lag range corresponding to 40–200 BPM */
        const minLag = Math.floor(60 / (200 * winMs / 1000));  // 200 BPM
        const maxLag = Math.ceil(60 / (40 * winMs / 1000));    //  40 BPM
        const N = onset.length;
        const corr = [];

        for (let lag = minLag; lag <= Math.min(maxLag, N - 1); lag++) {
            let sum = 0;
            for (let i = 0; i < N - lag; i++) sum += onset[i] * onset[i + lag];
            corr.push({ lag, val: sum / (N - lag) });
        }

        if (corr.length === 0) return 120;           // fallback

        /* Find all peaks in the autocorrelation */
        const peaks = [];
        for (let i = 1; i < corr.length - 1; i++) {
            if (corr[i].val > corr[i - 1].val && corr[i].val > corr[i + 1].val) {
                peaks.push(corr[i]);
            }
        }

        if (peaks.length === 0) return 120;           // fallback

        /* Score each peak: raw correlation strength + musical-range bonus.
           Strongly prefer the 70–145 BPM range where most music sits.
           Also check if a peak at half-tempo exists (harmonic consistency). */
        let bestBpm = 120, bestScore = -Infinity;

        for (const pk of peaks) {
            const bpm = 60 / (pk.lag * winMs / 1000);
            let score = pk.val;

            /* Strong preference for the common tempo range */
            if (bpm >= 70 && bpm <= 145) score *= 2.0;
            else if (bpm >= 55 && bpm <= 165) score *= 1.3;

            /* Check for harmonic support: is there also a peak near 2× this lag? */
            const dblLag = pk.lag * 2;
            const halfPeak = peaks.find(p => Math.abs(p.lag - dblLag) <= 2);
            if (halfPeak) score *= 1.4;

            if (score > bestScore) { bestScore = score; bestBpm = bpm; }
        }

        /* Final sanity clamp */
        while (bestBpm > 170) bestBpm /= 2;
        while (bestBpm < 55)  bestBpm *= 2;
        return Math.round(bestBpm);
    },

    /* ============================================================
       Mood analysis  (spectral brightness + energy → 0‒1 score)
       ============================================================ */
    analyzeMood(buf) {
        const data = buf.getChannelData(0);
        const sr   = buf.sampleRate;
        const segLen  = Math.floor(sr * 2);           // 2-second segments
        const numSegs = Math.min(10, Math.floor(data.length / segLen));
        if (numSegs === 0) return 0.5;

        let totalZCR = 0, totalEnergy = 0, totalHF = 0;

        for (let s = 0; s < numSegs; s++) {
            const off = Math.floor((data.length - segLen) * s / Math.max(1, numSegs - 1));
            let crossings = 0, energy = 0, hfEnergy = 0;

            for (let i = 1; i < segLen; i++) {
                if ((data[off + i] >= 0) !== (data[off + i - 1] >= 0)) crossings++;
                energy += data[off + i] * data[off + i];
                const diff = data[off + i] - data[off + i - 1];
                hfEnergy += diff * diff;
            }

            totalZCR    += crossings / segLen;
            totalEnergy += Math.sqrt(energy / segLen);
            totalHF     += hfEnergy / (energy + 1e-8);
        }

        const zcrN = Math.min(1, (totalZCR / numSegs) * 5);
        const engN = Math.min(1, (totalEnergy / numSegs) * 3);
        const hfN  = Math.min(1, totalHF / numSegs);

        const raw = zcrN * 0.4 + engN * 0.3 + hfN * 0.3;
        /* Spread the typical 0.2–0.7 cluster across the full 0–1 range */
        return Math.min(1, Math.max(0, (raw - 0.2) / 0.6));
    },

    normalizeBPM(bpm) {
        /* Tighter range so typical 70–170 BPM spreads across full 0–1 */
        return Math.min(1, Math.max(0, (bpm - 70) / 100));
    },

    /* ============================================================
       Filename parser — best-effort artist / title / album
       ============================================================ */
    parseFilename(filename, relativePath) {
        const name = filename.replace(/\.[^/.]+$/, '');
        let album = 'Unknown Album';

        if (relativePath) {
            const parts = relativePath.split('/').filter(Boolean);
            if (parts.length >= 2) album = parts[parts.length - 2];
        }

        /* "Artist - Title" */
        const dash = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (dash) return { artist: dash[1].trim(), title: dash[2].trim(), album };

        /* "01 Title" or "01. Title" */
        const num = name.match(/^\d+\.?\s*(.+)$/);
        if (num) return { artist: 'Unknown Artist', title: num[1].trim(), album };

        return { artist: 'Unknown Artist', title: name.trim(), album };
    },

    /* ============================================================
       Minimal ID3v2 tag parser  (title, artist, album, artwork)
       ============================================================ */
    parseID3(buffer) {
        const result = { title: null, artist: null, album: null, genre: null, artworkBlob: null };

        try {
            const dv  = new DataView(buffer);
            if (dv.byteLength < 10) return result;
            /* Check "ID3" header */
            if (dv.getUint8(0) !== 0x49 || dv.getUint8(1) !== 0x44 || dv.getUint8(2) !== 0x33) return result;

            const ver  = dv.getUint8(3);
            const size = this._synchsafe(dv, 6);
            let pos = 10;
            const limit = Math.min(10 + size, dv.byteLength);

            while (pos + 10 < limit) {
                const fid = String.fromCharCode(dv.getUint8(pos), dv.getUint8(pos+1), dv.getUint8(pos+2), dv.getUint8(pos+3));
                if (fid.charCodeAt(0) === 0) break;                     // padding
                const fsz = ver >= 4 ? this._synchsafe(dv, pos + 4) : dv.getUint32(pos + 4);
                if (fsz === 0 || pos + 10 + fsz > buffer.byteLength) break;

                const frameStart = pos + 10;
                if (fid === 'TIT2') result.title  = this._readText(dv, frameStart, fsz);
                if (fid === 'TPE1') result.artist = this._readText(dv, frameStart, fsz);
                if (fid === 'TALB') result.album  = this._readText(dv, frameStart, fsz);
                if (fid === 'TCON') result.genre  = this._readText(dv, frameStart, fsz);
                if (fid === 'APIC') result.artworkBlob = this._readAPIC(buffer, frameStart, fsz);

                pos += 10 + fsz;
            }
        } catch { /* ignore parse errors */ }
        return result;
    },

    _synchsafe(dv, off) {
        return (dv.getUint8(off) << 21) | (dv.getUint8(off+1) << 14) |
               (dv.getUint8(off+2) << 7)  | dv.getUint8(off+3);
    },

    _readText(dv, off, sz) {
        if (sz < 2) return null;
        const enc = dv.getUint8(off);
        const bytes = new Uint8Array(dv.buffer, off + 1, sz - 1);
        const dec = (enc === 1 || enc === 2) ? 'utf-16' : 'utf-8';
        return new TextDecoder(dec).decode(bytes).replace(/\0/g, '').trim() || null;
    },

    _readAPIC(buf, off, sz) {
        try {
            const dv = new DataView(buf);
            let p = off + 1;                                 // skip encoding byte
            let mime = '';
            while (p < off + sz && dv.getUint8(p) !== 0) { mime += String.fromCharCode(dv.getUint8(p)); p++; }
            p++;                                              // null terminator
            p++;                                              // picture type byte
            while (p < off + sz && dv.getUint8(p) !== 0) p++; // skip description
            p++;                                              // null terminator
            if (p >= off + sz) return null;
            return new Blob([buf.slice(p, off + sz)], { type: mime || 'image/jpeg' });
        } catch { return null; }
    }
};
