/* vuMeters.js — three retro VU meter styles: needle, LCD, LED */

const VUMeters = {
    leftCanvas: null,
    rightCanvas: null,
    style: 'needle',       // 'needle' | 'lcd' | 'led'

    /* smoothed levels, needle velocities & peak hold */
    lL: 0, lR: 0,
    vL: 0, vR: 0,
    pL: 0, pR: 0,

    init(leftCanvas, rightCanvas) {
        this.leftCanvas  = leftCanvas;
        this.rightCanvas = rightCanvas;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const landscape = document.body.classList.contains('landscape');
        [this.leftCanvas, this.rightCanvas].forEach(c => {
            const parent = c.parentElement;
            let w;
            if (landscape) {
                /* Landscape: VU meters are the hero — fill most of the viewport height */
                const maxH = Math.floor(window.innerHeight * 0.75);
                const hRatio = this.style === 'needle' ? 0.75 : 0.8;
                w = Math.floor(maxH / hRatio);
                /* Cap to half the viewport width (two meters side by side).
                   Use window.innerWidth, NOT parent.clientWidth — the parent
                   may not have finished its CSS grid reflow yet after an
                   orientation change, so its clientWidth can be stale. */
                w = Math.min(w, Math.floor(window.innerWidth / 2 - 20));
            } else {
                w = Math.floor(Math.min(240, parent.clientWidth / 2 - 10));
            }
            const h = this.style === 'needle' ? Math.floor(w * 0.75) : Math.floor(w * 0.8);
            const dpr = window.devicePixelRatio;
            c.width  = w * dpr;
            c.height = h * dpr;
            c.style.width  = w + 'px';
            c.style.height = h + 'px';
        });
    },

    setStyle(s) { this.style = s; this.resize(); },

    update(leftLevel, rightLevel) {
        /* Spring-damper ballistics — models real VU needle inertia.
           The needle overshoots on transients then settles, just like
           a physical meter movement with ~300ms integration time. */
        const k = 0.08;     // spring stiffness
        const d = 0.42;     // damping (underdamped → overshoot)

        this.vL += k * (leftLevel - this.lL) - d * this.vL;
        this.lL += this.vL;
        this.lL = Math.max(0, this.lL);

        this.vR += k * (rightLevel - this.lR) - d * this.vR;
        this.lR += this.vR;
        this.lR = Math.max(0, this.lR);

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
        const m = 8 * dpr;

        /* ── Outer bezel — dark metallic frame ── */
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, w, h);

        /* Metallic bevel (top edge catches light, bottom stays dark) */
        const bevelG = ctx.createLinearGradient(0, 0, 0, h);
        bevelG.addColorStop(0, '#3a3a3a');
        bevelG.addColorStop(0.04, '#2a2a2a');
        bevelG.addColorStop(0.96, '#1a1a1a');
        bevelG.addColorStop(1, '#2e2e2e');
        this._roundRect(ctx, 2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr, 6 * dpr, bevelG);

        /* ── Face plate — warm aged cream with gradient ── */
        const faceX = m, faceY = m, faceW = w - 2 * m, faceH = h - 2 * m;
        const faceG = ctx.createLinearGradient(faceX, faceY, faceX, faceY + faceH);
        faceG.addColorStop(0, '#f7f2e2');
        faceG.addColorStop(0.35, '#f0ebd8');
        faceG.addColorStop(1, '#e6dfca');
        this._roundRect(ctx, faceX, faceY, faceW, faceH, 4 * dpr, faceG);

        /* Pivot at bottom-centre of face */
        const cx = w / 2;
        const cy = h - m - 12 * dpr;

        /* Radius — fill as much of the face as possible, leaving room for labels */
        const r = Math.min(
            (w - 2 * m) / 2 - 8 * dpr,
            cy - m - 32 * dpr
        );

        const toRad = Math.PI / 180;
        const tipXY = (deg, rad) => [
            cx + Math.sin(deg * toRad) * rad,
            cy - Math.cos(deg * toRad) * rad
        ];

        const sweep = 55;

        /* ── Scale arc ── */
        ctx.beginPath();
        for (let d = -sweep; d <= sweep; d += 1) {
            const [x, y] = tipXY(d, r);
            d === -sweep ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();

        /* ── Red zone arc (last 30 %) ── */
        ctx.beginPath();
        const redStart = -sweep + 2 * sweep * 0.7;
        for (let d = redStart; d <= sweep; d += 1) {
            const [x, y] = tipXY(d, r - 4 * dpr);
            d <= redStart + 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#c00';
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();

        /* ── Tick marks & dB labels ── */
        const ticks = [-20, -10, -7, -5, -3, -1, 0, 1, 2, 3];
        ticks.forEach((db, j) => {
            const frac = j / (ticks.length - 1);
            const deg  = -sweep + 2 * sweep * frac;
            const red  = db >= 1;
            const major = (j % 2 === 0);

            const [ix, iy] = tipXY(deg, r);
            const [ox, oy] = tipXY(deg, r + (major ? 10 : 6) * dpr);

            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ox, oy);
            ctx.strokeStyle = red ? '#c00' : '#333';
            ctx.lineWidth = (major ? 2 : 1.2) * dpr;
            ctx.stroke();

            if (major) {
                const [lx, ly] = tipXY(deg, r + 18 * dpr);
                ctx.fillStyle = red ? '#c00' : '#333';
                ctx.font = `bold ${9 * dpr}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(db), lx, ly);
            }
        });

        /* ── Needle with drop shadow ── */
        const clamped = Math.min(1.15, Math.max(0, level));
        const needleDeg = -sweep + 2 * sweep * clamped;
        const [nx, ny] = tipXY(needleDeg, r - 2 * dpr);

        /* Shadow layer (offset down-right) */
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 4 * dpr;
        ctx.shadowOffsetX = 2 * dpr;
        ctx.shadowOffsetY = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        /* Needle line itself (crisp, on top of shadow) */
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        /* Needle tip — tiny red arrowhead */
        const tipLen = 6 * dpr;
        const tipW   = 2.5 * dpr;
        const [t1x, t1y] = tipXY(needleDeg, r - 2 * dpr);
        const [t2x, t2y] = tipXY(needleDeg, r - 2 * dpr - tipLen);
        const perpX = -(t1y - t2y);
        const perpY =  (t1x - t2x);
        const pLen  = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        ctx.beginPath();
        ctx.moveTo(t1x, t1y);
        ctx.lineTo(t2x + perpX / pLen * tipW, t2y + perpY / pLen * tipW);
        ctx.lineTo(t2x - perpX / pLen * tipW, t2y - perpY / pLen * tipW);
        ctx.closePath();
        ctx.fillStyle = '#c00';
        ctx.fill();

        /* ── Pivot — metallic gradient ── */
        const pivG = ctx.createRadialGradient(
            cx - dpr, cy - dpr, 0,
            cx, cy, 5 * dpr
        );
        pivG.addColorStop(0, '#888');
        pivG.addColorStop(0.4, '#555');
        pivG.addColorStop(1, '#222');
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = pivG;
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 0.5 * dpr;
        ctx.stroke();

        /* ── Text labels ── */
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#666';
        ctx.font = `bold ${10 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, h - 3 * dpr);
        ctx.fillStyle = '#444';
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.fillText('VU', cx, m + 14 * dpr);

        /* ── Glass reflection — subtle elliptical highlight ── */
        ctx.save();
        ctx.globalAlpha = 0.07;
        ctx.beginPath();
        ctx.ellipse(
            faceX + faceW * 0.35, faceY + faceH * 0.22,
            faceW * 0.28, faceH * 0.15,
            -0.3, 0, Math.PI * 2
        );
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();

        /* ── Face border ── */
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1.5 * dpr;
        this._strokeRoundRect(ctx, faceX, faceY, faceW, faceH, 4 * dpr);

        /* Inner edge highlight for depth */
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5 * dpr;
        this._strokeRoundRect(ctx, faceX + dpr, faceY + dpr, faceW - 2 * dpr, faceH - 2 * dpr, 3 * dpr);

        /* ── Corner screws ── */
        const screwR = 2.5 * dpr;
        const screwOff = m + 6 * dpr;
        const screws = [
            [screwOff, screwOff],
            [w - screwOff, screwOff],
            [screwOff, h - screwOff],
            [w - screwOff, h - screwOff]
        ];
        screws.forEach(([sx, sy]) => {
            const sg = ctx.createRadialGradient(sx - 0.5 * dpr, sy - 0.5 * dpr, 0, sx, sy, screwR);
            sg.addColorStop(0, '#aaa');
            sg.addColorStop(0.6, '#666');
            sg.addColorStop(1, '#333');
            ctx.beginPath();
            ctx.arc(sx, sy, screwR, 0, Math.PI * 2);
            ctx.fillStyle = sg;
            ctx.fill();
            /* Slot */
            ctx.beginPath();
            ctx.moveTo(sx - screwR * 0.6, sy);
            ctx.lineTo(sx + screwR * 0.6, sy);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 0.8 * dpr;
            ctx.stroke();
        });
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

        /* ── Scanline overlay — CRT-era LCD pixel grid ── */
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let sy = bz; sy < h - bz; sy += 2 * dpr) {
            ctx.fillRect(bz, sy, w - 2 * bz, dpr * 0.6);
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

            const rr = Math.min(ledH / 2, 3 * dpr);

            if (active || isPeak) {
                /* Glow/bloom — draw shadow first, then crisp segment on top */
                ctx.save();
                ctx.shadowColor = onColor;
                ctx.shadowBlur = 8 * dpr;
                this._roundRect(ctx, pad, y, ledW, ledH, rr, onColor);
                ctx.restore();
                /* Crisp segment over the glow */
                this._roundRect(ctx, pad, y, ledW, ledH, rr, onColor);
                /* Specular highlight on the LED surface */
                const hlG = ctx.createLinearGradient(pad, y, pad, y + ledH);
                hlG.addColorStop(0, 'rgba(255,255,255,0.25)');
                hlG.addColorStop(0.5, 'rgba(255,255,255,0)');
                hlG.addColorStop(1, 'rgba(0,0,0,0.15)');
                this._roundRect(ctx, pad, y, ledW, ledH, rr, hlG);
            } else {
                this._roundRect(ctx, pad, y, ledW, ledH, rr, offColor);
                /* Subtle surface texture on unlit LEDs */
                const offG = ctx.createLinearGradient(pad, y, pad, y + ledH);
                offG.addColorStop(0, 'rgba(255,255,255,0.03)');
                offG.addColorStop(1, 'rgba(0,0,0,0.05)');
                this._roundRect(ctx, pad, y, ledW, ledH, rr, offG);
            }
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
