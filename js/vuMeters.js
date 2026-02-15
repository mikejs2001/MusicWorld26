/* vuMeters.js — three retro VU meter styles: needle, LCD, LED */

const VUMeters = {
    leftCanvas: null,
    rightCanvas: null,
    style: 'needle',       // 'needle' | 'lcd' | 'led'

    /* smoothed levels & peak hold */
    lL: 0, lR: 0,
    pL: 0, pR: 0,

    init(leftCanvas, rightCanvas) {
        this.leftCanvas  = leftCanvas;
        this.rightCanvas = rightCanvas;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        [this.leftCanvas, this.rightCanvas].forEach(c => {
            const parent = c.parentElement;
            const w = Math.floor(Math.min(240, parent.clientWidth / 2 - 10));
            const h = this.style === 'needle' ? Math.floor(w * 0.65) : Math.floor(w * 0.8);
            const dpr = window.devicePixelRatio;
            c.width  = w * dpr;
            c.height = h * dpr;
            c.style.width  = w + 'px';
            c.style.height = h + 'px';
        });
    },

    setStyle(s) { this.style = s; this.resize(); },

    update(leftLevel, rightLevel) {
        /* Smoothing */
        this.lL += (leftLevel  - this.lL) * 0.35;
        this.lR += (rightLevel - this.lR) * 0.35;
        /* Peak hold with slow decay */
        if (leftLevel  > this.pL) this.pL = leftLevel;  else this.pL *= 0.993;
        if (rightLevel > this.pR) this.pR = rightLevel;  else this.pR *= 0.993;
    },

    draw() {
        const levels = [this.lL, this.lR];
        const peaks  = [this.pL, this.pR];
        const canvases = [this.leftCanvas, this.rightCanvas];
        const labels = ['L', 'R'];

        canvases.forEach((cv, i) => {
            const ctx = cv.getContext('2d');
            const w = cv.width, h = cv.height;
            ctx.clearRect(0, 0, w, h);

            switch (this.style) {
                case 'needle': this._drawNeedle(ctx, w, h, levels[i], peaks[i], labels[i]); break;
                case 'lcd':    this._drawLCD(ctx, w, h, levels[i], peaks[i], labels[i]); break;
                case 'led':    this._drawLED(ctx, w, h, levels[i], peaks[i], labels[i]); break;
            }
        });
    },

    /* ================ NEEDLE ================ */
    _drawNeedle(ctx, w, h, level, peak, label) {
        const dpr = window.devicePixelRatio;

        /* Meter face */
        const m = 8 * dpr;
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, w, h);
        this._roundRect(ctx, m, m, w - 2 * m, h - 2 * m, 6 * dpr, '#f5f0e0');

        /* Arc parameters — sweep from upper-left to upper-right above pivot */
        const cx = w / 2;
        const cy = h - 16 * dpr;
        const r  = Math.min(w, h) * 0.5;
        const aStart = Math.PI * 1.18;          // upper-left
        const aEnd   = Math.PI * 1.82;          // upper-right

        /* Scale arc */
        ctx.beginPath();
        ctx.arc(cx, cy, r, aStart, aEnd);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = dpr;
        ctx.stroke();

        /* Tick marks & dB labels */
        const ticks = [-20, -10, -7, -5, -3, -1, 0, 1, 2, 3];
        ticks.forEach((db, j) => {
            const frac = j / (ticks.length - 1);
            const a = aStart + (aEnd - aStart) * frac;
            const inner = r - 7 * dpr, outer = r + 2 * dpr;
            const red = db >= 1;

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
            ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
            ctx.strokeStyle = red ? '#c00' : '#444';
            ctx.lineWidth = (j % 2 === 0 ? 2 : 1) * dpr;
            ctx.stroke();

            if (j % 2 === 0) {
                ctx.fillStyle = red ? '#c00' : '#444';
                ctx.font = `${9 * dpr}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(String(db),
                    cx + Math.cos(a) * (r + 12 * dpr),
                    cy + Math.sin(a) * (r + 12 * dpr) + 3 * dpr);
            }
        });

        /* Red zone arc */
        ctx.beginPath();
        ctx.arc(cx, cy, r - 3 * dpr, aStart + (aEnd - aStart) * 0.7, aEnd);
        ctx.strokeStyle = '#c00';
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();

        /* Needle */
        const clamped = Math.min(1, Math.max(0, level));
        const nAngle  = aStart + (aEnd - aStart) * clamped;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(nAngle) * (r - 4 * dpr), cy + Math.sin(nAngle) * (r - 4 * dpr));
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        /* Pivot */
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();

        /* Labels */
        ctx.fillStyle = '#666';
        ctx.font = `bold ${10 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, h - 3 * dpr);
        ctx.fillStyle = '#444';
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.fillText('VU', cx, m + 13 * dpr);

        /* Border */
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1.5 * dpr;
        this._strokeRoundRect(ctx, m, m, w - 2 * m, h - 2 * m, 6 * dpr);
    },

    /* ================ LCD (monochrome old-LCD style) ================ */
    _drawLCD(ctx, w, h, level, peak, label) {
        const dpr = window.devicePixelRatio;

        /* Dark bezel */
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, w, h);

        /* LCD panel background — warm olive-green like a classic LCD */
        const bz = 6 * dpr;
        this._roundRect(ctx, bz, bz, w - 2 * bz, h - 2 * bz, 3 * dpr, '#8B9A6B');

        /* Inner bevel shadow for depth */
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.lineWidth = dpr;
        this._strokeRoundRect(ctx, bz + dpr, bz + dpr, w - 2 * bz - 2 * dpr, h - 2 * bz - 2 * dpr, 2 * dpr);

        const pad   = bz + 8 * dpr;
        const cols  = 30;
        const gap   = 1.5 * dpr;
        const scaleH = 12 * dpr;
        const labelH = 14 * dpr;
        const barW  = (w - 2 * pad - (cols - 1) * gap) / cols;
        const barH  = h - 2 * pad - scaleH - labelH;
        const baseY = pad + scaleH;

        /* dB scale markings */
        const ink = '#3D4A2A';
        ctx.fillStyle = ink;
        ctx.font = `${7 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        const dbMarks = [
            { db: -20, frac: 0 },
            { db: -10, frac: 0.33 },
            { db: -5,  frac: 0.5 },
            { db: -3,  frac: 0.6 },
            { db:  0,  frac: 0.78 },
            { db:  3,  frac: 1 }
        ];
        dbMarks.forEach(({ db, frac }) => {
            const col = Math.round(frac * (cols - 1));
            const x = pad + col * (barW + gap) + barW / 2;
            ctx.fillText(String(db), x, pad + scaleH - 3 * dpr);
            /* Small tick below the number */
            ctx.fillRect(x - 0.5 * dpr, pad + scaleH - 1.5 * dpr, dpr, 2 * dpr);
        });

        /* Bars — monochrome: ghost segments vs dark active segments */
        const ghostColor  = '#7D8B5F';
        const activeColor = '#2A331A';

        for (let i = 0; i < cols; i++) {
            const frac = (i + 1) / cols;
            const x = pad + i * (barW + gap);
            const active = level >= frac;
            const isPeak = peak > 0 && Math.abs(frac - peak) < 1 / cols;

            ctx.fillStyle = (active || isPeak) ? activeColor : ghostColor;
            ctx.fillRect(x, baseY, barW, barH);
        }

        /* Channel label & "dB" text */
        ctx.fillStyle = ink;
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(label, pad, h - bz - 3 * dpr);
        ctx.textAlign = 'right';
        ctx.font = `${8 * dpr}px sans-serif`;
        ctx.fillText('dB', w - pad, h - bz - 3 * dpr);
    },

    /* ================ LED ================ */
    _drawLED(ctx, w, h, level, peak, label) {
        const dpr = window.devicePixelRatio;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        const pad    = 10 * dpr;
        const scaleW = 22 * dpr;              // space for dB labels on right
        const rows   = 20;
        const gap    = 3 * dpr;
        const labelH = 16 * dpr;
        const ledH   = (h - 2 * pad - labelH - (rows - 1) * gap) / rows;
        const ledW   = w - 2 * pad - scaleW;

        /* dB scale markings on the right */
        const dbMarks = [
            { db:  '+3', frac: 1 },
            { db:   '0', frac: 0.78 },
            { db:  '-3', frac: 0.6 },
            { db:  '-5', frac: 0.5 },
            { db: '-10', frac: 0.33 },
            { db: '-20', frac: 0.05 }
        ];
        ctx.fillStyle = '#555';
        ctx.font = `${7 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        dbMarks.forEach(({ db, frac }) => {
            const row = Math.round(frac * (rows - 1));
            const y = h - pad - labelH - (row + 1) * (ledH + gap) + gap + ledH / 2 + 3 * dpr;
            ctx.fillText(db, pad + ledW + 4 * dpr, y);
        });

        /* LED segments */
        for (let i = 0; i < rows; i++) {
            const frac  = (i + 1) / rows;
            const y     = h - pad - labelH - (i + 1) * (ledH + gap) + gap;
            const active = level >= frac;
            const isPeak = peak > 0 && Math.abs(frac - peak) < 1 / rows;

            let onColor, offColor;
            if (frac < 0.6)      { onColor = '#00e676'; offColor = '#0a1a0a'; }
            else if (frac < 0.8) { onColor = '#ffea00'; offColor = '#1a1a0a'; }
            else                 { onColor = '#ff1744'; offColor = '#1a0a0a'; }

            ctx.fillStyle = active ? onColor : (isPeak ? onColor : offColor);

            /* Rounded LED segments */
            const r = Math.min(ledH / 2, 3 * dpr);
            this._roundRect(ctx, pad, y, ledW, ledH, r, ctx.fillStyle);
        }

        /* Label */
        ctx.fillStyle = '#555';
        ctx.font = `bold ${10 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, (pad + ledW / 2), h - 3 * dpr);
    },

    /* helpers */
    _roundRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    },
    _strokeRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.stroke();
    }
};
