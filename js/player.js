/* player.js — audio playback engine with Web Audio analyser for VU meters */

const Player = {
    audioCtx:   null,
    analyser:   null,
    source:     null,
    audio:      new Audio(),
    freqData:   null,

    playlist:     [],          // array of track IDs
    playlistIdx:  -1,
    continuous:   false,
    isPlaying:    false,

    /* callbacks set by app.js */
    onTrackChange: null,
    onPlayStateChange: null,
    onTimeUpdate: null,

    init() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

        /* Connect HTML Audio element → analyser → destination */
        this.source = this.audioCtx.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);

        /* Events */
        this.audio.addEventListener('ended', () => this._onEnded());
        this.audio.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) this.onTimeUpdate(this.audio.currentTime, this.audio.duration);
        });
    },

    /* ---------- playlist control ---------- */

    setPlaylist(ids, continuous) {
        this.playlist    = ids;
        this.playlistIdx = -1;
        this.continuous  = continuous;
    },

    async playIndex(idx) {
        if (idx < 0 || idx >= this.playlist.length) return;
        this.playlistIdx = idx;

        const trackId = this.playlist[idx];
        const blob = await Library.getAudio(trackId);
        if (!blob) return;

        /* Revoke previous object URL */
        if (this.audio.src && this.audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.audio.src);
        }

        this.audio.src = URL.createObjectURL(blob);
        this.audio.load();

        if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

        await this.audio.play();
        this.isPlaying = true;
        if (this.onTrackChange) this.onTrackChange(trackId, idx);
        if (this.onPlayStateChange) this.onPlayStateChange(true);
    },

    async start() {
        if (this.playlist.length === 0) return;
        await this.playIndex(0);
    },

    async togglePlayPause() {
        if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

        if (this.audio.paused) {
            await this.audio.play();
            this.isPlaying = true;
        } else {
            this.audio.pause();
            this.isPlaying = false;
        }
        if (this.onPlayStateChange) this.onPlayStateChange(this.isPlaying);
    },

    async next() {
        if (this.playlistIdx + 1 < this.playlist.length) {
            await this.playIndex(this.playlistIdx + 1);
        } else if (this.continuous && this.playlist.length > 0) {
            await this.playIndex(0);               // loop
        }
    },

    async prev() {
        /* If more than 3 s in, restart; otherwise go back */
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
        } else if (this.playlistIdx > 0) {
            await this.playIndex(this.playlistIdx - 1);
        }
    },

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        if (this.onPlayStateChange) this.onPlayStateChange(false);
    },

    /* ---------- audio data for VU meters ---------- */

    getLevels() {
        this.analyser.getByteFrequencyData(this.freqData);
        const half = Math.floor(this.freqData.length / 2);
        let sumL = 0, sumR = 0;

        /* Simple split: lower bins → "left feel", upper → "right feel"
           (We don't have true stereo separation from a mono analyser,
            so we simulate stereo by slightly offsetting the frequency ranges.) */
        for (let i = 0; i < half; i++) {
            sumL += this.freqData[i];
            sumR += this.freqData[i + Math.floor(half * 0.15)];
        }

        const maxVal = half * 255;
        return {
            left:  Math.min(1, (sumL / maxVal) * 2.5),
            right: Math.min(1, (sumR / maxVal) * 2.5)
        };
    },

    /* ---------- internal ---------- */

    _onEnded() {
        if (this.playlistIdx + 1 < this.playlist.length) {
            this.playIndex(this.playlistIdx + 1);
        } else if (this.continuous && this.playlist.length > 0) {
            this.playIndex(0);
        } else {
            this.isPlaying = false;
            if (this.onPlayStateChange) this.onPlayStateChange(false);
        }
    }
};
