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
       Mood analysis  (chromagram key detection → 0‒1 valence)

       Detects whether the music is in a major key (happy) or
       minor key (sad) by correlating a chromagram against the
       Krumhansl-Kessler key profiles.  This is the single
       strongest predictor of perceived valence in tonal music.
       ============================================================ */
    analyzeMood(buf) {
        const data = buf.getChannelData(0);
        const sr   = buf.sampleRate;
        const N    = 8192;                             // FFT window size
        const numSegs = Math.min(24, Math.floor(data.length / N));
        if (numSegs === 0) return 0.5;

        /* Accumulate a chromagram (12 pitch classes) across segments */
        const chroma = new Float32Array(12);

        for (let s = 0; s < numSegs; s++) {
            const off = Math.floor((data.length - N) * s / Math.max(1, numSegs - 1));

            /* Hann-windowed segment */
            const win = new Float32Array(N);
            for (let i = 0; i < N; i++)
                win[i] = data[off + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));

            const mag = this._fft(win);

            /* Map FFT bins → pitch classes (C2 65 Hz – C7 2100 Hz) */
            for (let bin = 1; bin < N / 2; bin++) {
                const freq = bin * sr / N;
                if (freq < 65 || freq > 2100) continue;
                const midi = 12 * Math.log2(freq / 440) + 69;
                const pc   = ((Math.round(midi) % 12) + 12) % 12;
                chroma[pc] += mag[bin] * mag[bin];        // accumulate energy
            }
        }

        /* Normalise to unit sum */
        const sum = chroma.reduce((a, b) => a + b, 0);
        if (sum === 0) return 0.5;
        for (let i = 0; i < 12; i++) chroma[i] /= sum;

        /* Krumhansl-Kessler key profiles (C-major / C-minor templates) */
        const major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
        const minor = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

        /* Try all 12 rotations, keep best Pearson r for major & minor */
        let bestMaj = -2, bestMin = -2;
        for (let root = 0; root < 12; root++) {
            const rot = new Float32Array(12);
            for (let i = 0; i < 12; i++) rot[i] = chroma[(i + root) % 12];
            bestMaj = Math.max(bestMaj, this._pearson(rot, major));
            bestMin = Math.max(bestMin, this._pearson(rot, minor));
        }

        /* Mode difference → valence: major = happy (→1), minor = sad (→0)
           Typical |diff| is 0.05–0.25 for tonal music */
        const diff = bestMaj - bestMin;
        return Math.min(1, Math.max(0, diff / 0.4 + 0.5));
    },

    /* Radix-2 Cooley-Tukey FFT → magnitude spectrum (first N/2 bins) */
    _fft(signal) {
        const N    = signal.length;
        const bits = Math.round(Math.log2(N));
        const re   = new Float32Array(N);
        const im   = new Float32Array(N);

        /* Bit-reversal permutation */
        for (let i = 0; i < N; i++) {
            let rev = 0;
            for (let j = 0; j < bits; j++) rev = (rev << 1) | ((i >> j) & 1);
            re[rev] = signal[i];
        }

        /* Butterfly stages */
        for (let size = 2; size <= N; size *= 2) {
            const half  = size >> 1;
            const angle = -2 * Math.PI / size;
            for (let i = 0; i < N; i += size) {
                for (let j = 0; j < half; j++) {
                    const cos = Math.cos(angle * j);
                    const sin = Math.sin(angle * j);
                    const k   = i + j + half;
                    const tr  = re[k] * cos - im[k] * sin;
                    const ti  = re[k] * sin + im[k] * cos;
                    re[k]     = re[i + j] - tr;
                    im[k]     = im[i + j] - ti;
                    re[i + j] += tr;
                    im[i + j] += ti;
                }
            }
        }

        /* Magnitude of first N/2 bins */
        const mag = new Float32Array(N >> 1);
        for (let i = 0; i < mag.length; i++)
            mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        return mag;
    },

    /* Pearson correlation coefficient between two arrays */
    _pearson(x, y) {
        const n = x.length;
        let mx = 0, my = 0;
        for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
        mx /= n; my /= n;

        let num = 0, dx2 = 0, dy2 = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - mx, dy = y[i] - my;
            num += dx * dy;
            dx2 += dx * dx;
            dy2 += dy * dy;
        }
        const den = Math.sqrt(dx2 * dy2);
        return den > 0 ? num / den : 0;
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
            if (parts.length >= 2) album = this._cleanField(parts[parts.length - 2]);
        }

        /* "Artist - Title" */
        const dash = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (dash) return { artist: this._cleanField(dash[1]), title: this._cleanField(dash[2]), album };

        /* "01 Title" or "01. Title" */
        const num = name.match(/^\d+\.?\s*(.+)$/);
        if (num) return { artist: 'Unknown Artist', title: this._cleanField(num[1]), album };

        return { artist: 'Unknown Artist', title: this._cleanField(name), album };
    },

    /** Clean a filename-derived field: strip suffixes, underscores → spaces, title-case */
    _cleanField(text) {
        if (!text) return text;
        text = text.trim()
            .replace(/[_\s]+(observer|remaster(?:ed)?|mono|stereo|explicit|clean|bonus(?:[_\s]*track)?)$/i, '')
            .replace(/_/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const lc = text.toLowerCase();
        if (text === lc || text === text.toUpperCase()) {
            const small = new Set(['a','an','the','and','but','or','for','nor','on','at','to','in','of','with','by','is','vs']);
            text = lc.split(' ').map((w, i) => {
                if (i > 0 && small.has(w)) return w;
                return w.charAt(0).toUpperCase() + w.slice(1);
            }).join(' ');
        }
        return text;
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
