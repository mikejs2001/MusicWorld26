/* moodGrid.js — 2-D mood/tempo grid with dot plotting & click-to-select */

const MoodGrid = {
    canvas: null,
    ctx:    null,
    tracks: [],          // array of { id, moodX, moodY, name, … }
    selection: null,     // { x, y } normalised 0‒1  (null = no selection)
    selectionRadius: 0.12,
    hoverPos: null,

    init(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this._bindEvents();
        this.resize();
    },

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        this.canvas.width  = size * window.devicePixelRatio;
        this.canvas.height = size * window.devicePixelRatio;
        this.canvas.style.width  = size + 'px';
        this.canvas.style.height = size + 'px';
        this.draw();
    },

    setTracks(tracks) {
        this.tracks = tracks;
        this.draw();
    },

    /* ---------- drawing ---------- */

    draw() {
        const c   = this.ctx;
        const w   = this.canvas.width;
        const h   = this.canvas.height;
        const dpr = window.devicePixelRatio;
        c.clearRect(0, 0, w, h);

        /* Background */
        c.fillStyle = '#111';
        c.fillRect(0, 0, w, h);

        /* Subtle grid lines */
        c.strokeStyle = '#1e1e1e';
        c.lineWidth = dpr;
        for (let i = 0.25; i < 1; i += 0.25) {
            c.beginPath(); c.moveTo(i * w, 0); c.lineTo(i * w, h); c.stroke();
            c.beginPath(); c.moveTo(0, i * h); c.lineTo(w, i * h); c.stroke();
        }

        /* Centre crosshair */
        c.strokeStyle = '#2a2a2a';
        c.lineWidth = dpr;
        c.setLineDash([4 * dpr, 4 * dpr]);
        c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
        c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
        c.setLineDash([]);

        /* Selection highlight ring */
        if (this.selection) {
            const sx = this.selection.x * w;
            const sy = (1 - this.selection.y) * h;
            const sr = this.selectionRadius * w;

            c.beginPath();
            c.arc(sx, sy, sr, 0, Math.PI * 2);
            c.fillStyle = 'rgba(0,230,118,.08)';
            c.fill();
            c.strokeStyle = '#00e676';
            c.lineWidth = 2 * dpr;
            c.stroke();

            /* Small crosshair at centre of selection */
            c.strokeStyle = 'rgba(0,230,118,.5)';
            c.lineWidth = dpr;
            c.beginPath(); c.moveTo(sx - 6 * dpr, sy); c.lineTo(sx + 6 * dpr, sy); c.stroke();
            c.beginPath(); c.moveTo(sx, sy - 6 * dpr); c.lineTo(sx, sy + 6 * dpr); c.stroke();
        }

        /* Hover crosshair */
        if (this.hoverPos && !this.selection) {
            const hx = this.hoverPos.x * w;
            const hy = (1 - this.hoverPos.y) * h;
            c.strokeStyle = 'rgba(255,255,255,.12)';
            c.lineWidth = dpr;
            c.setLineDash([3 * dpr, 3 * dpr]);
            c.beginPath(); c.moveTo(hx, 0); c.lineTo(hx, h); c.stroke();
            c.beginPath(); c.moveTo(0, hy); c.lineTo(w, hy); c.stroke();
            c.setLineDash([]);
        }

        /* Track dots */
        this.tracks.forEach(t => {
            const tx = t.moodX * w;
            const ty = (1 - t.moodY) * h;        // flip Y so fast = top
            const r  = 4 * dpr;

            /* Colour by mood position — green/blue ↔ orange/red */
            const hue = 120 + (1 - t.moodX) * 120;       // 120 (green) → 240 (blue) for sad
            const satPct = 70 + t.moodY * 30;
            c.fillStyle = `hsl(${hue * t.moodX + 30 * (1 - t.moodX)}, ${satPct}%, 55%)`;

            /* Highlight if inside selection radius */
            let highlighted = false;
            if (this.selection) {
                const dx = t.moodX - this.selection.x;
                const dy = t.moodY - this.selection.y;
                if (Math.sqrt(dx * dx + dy * dy) <= this.selectionRadius) highlighted = true;
            }

            c.beginPath();
            c.arc(tx, ty, highlighted ? r * 1.5 : r, 0, Math.PI * 2);
            c.globalAlpha = highlighted ? 1 : 0.65;
            c.fill();
            c.globalAlpha = 1;

            if (highlighted) {
                c.strokeStyle = '#fff';
                c.lineWidth = dpr;
                c.stroke();
            }
        });

        /* Empty-state message toggle */
        const msg = document.getElementById('grid-empty-msg');
        if (msg) {
            msg.classList.toggle('hidden', this.tracks.length > 0);
        }
    },

    /* ---------- interaction ---------- */

    _bindEvents() {
        const selectAt = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (clientX - rect.left) / rect.width;
            const y = 1 - (clientY - rect.top) / rect.height;   // flip Y
            this.selection = { x, y };
            this.draw();
            if (this.onSelect) this.onSelect(x, y);
        };

        this.canvas.addEventListener('click', (e) => {
            selectAt(e.clientX, e.clientY);
        });

        /* Touch support for mobile */
        this.canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 0) return;
            const t = e.changedTouches[0];
            e.preventDefault();          // prevent delayed click / scroll
            selectAt(t.clientX, t.clientY);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.hoverPos = {
                x: (e.clientX - rect.left) / rect.width,
                y: 1 - (e.clientY - rect.top) / rect.height
            };
            this.draw();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoverPos = null;
            this.draw();
        });

        window.addEventListener('resize', () => this.resize());
    },

    /* Return track IDs sorted by distance to selection */
    getTracksNearSelection(count) {
        if (!this.selection) return [];
        const sx = this.selection.x;
        const sy = this.selection.y;

        const sorted = this.tracks
            .map(t => {
                const dx = t.moodX - sx;
                const dy = t.moodY - sy;
                return { id: t.id, dist: Math.sqrt(dx * dx + dy * dy), track: t };
            })
            .sort((a, b) => a.dist - b.dist);

        if (count === 0) return sorted.map(s => s.id);          // continuous = all, nearest first
        return sorted.slice(0, count).map(s => s.id);
    },

    clearSelection() {
        this.selection = null;
        this.draw();
    }
};
