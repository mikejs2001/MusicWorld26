/* vuMeters.js — six meter styles: needle, warm, blue, LCD, LED, spectrum */

const VUMeters = {
    leftCanvas: null,
    rightCanvas: null,
    style: 'needle',

    /* smoothed levels, needle velocities & peak hold */
    lL: 0, lR: 0,
    vL: 0, vR: 0,
    pL: 0, pR: 0,

    /* spectrum analyser state */
    _freqData: null,
    _specBands: null,
    _specPeaks: null,

    /* ─── colour themes for needle variants ─── */
    _THEMES: {
        needle: {
            bezelBase: '#1a1a1a',
            bezelGrad: ['#3a3a3a', '#2a2a2a', '#1a1a1a', '#2e2e2e'],
            faceGrad: ['#f7f2e2', '#f0ebd8', '#e6dfca'],
            glowColor: null,
            arcColor: '#777',
            tickColor: '#333', tickLabelColor: '#333',
            redColor: '#c00',
            needleColor: '#111', tipColor: '#c00',
            pivotGrad: ['#888', '#555', '#222'],
            textColor: '#666', vuTextColor: '#444',
            screwGrad: ['#aaa', '#666', '#333'],
            reflectionAlpha: 0.07,
        },
        warm: {
            bezelBase: '#1a1408',
            bezelGrad: ['#4a3820', '#2e2010', '#1a1408', '#3a2a18'],
            faceGrad: ['#2a2010', '#1e1608', '#1a1205'],
            glowColor: 'rgba(255,170,50,0.20)',
            arcColor: 'rgba(255,210,140,0.65)',
            tickColor: 'rgba(255,210,140,0.75)',
            tickLabelColor: 'rgba(255,220,160,0.9)',
            redColor: '#ff4444',
            needleColor: 'rgba(255,240,220,0.95)', tipColor: '#ff7722',
            pivotGrad: ['#aa8844', '#775522', '#442200'],
            textColor: 'rgba(255,190,100,0.6)',
            vuTextColor: 'rgba(255,170,60,0.5)',
            screwGrad: ['#886633', '#553311', '#331100'],
            reflectionAlpha: 0.03,
        },
        blue: {
            bezelBase: '#0a1418',
            bezelGrad: ['#2a3a40', '#1a2a30', '#0a1418', '#1e2e35'],
            faceGrad: ['#0e222a', '#0a1a22', '#081418'],
            glowColor: 'rgba(0,180,230,0.16)',
            arcColor: 'rgba(140,220,255,0.6)',
            tickColor: 'rgba(140,220,255,0.7)',
            tickLabelColor: 'rgba(160,230,255,0.9)',
            redColor: '#ff4444',
            needleColor: 'rgba(220,245,255,0.95)', tipColor: '#00ccee',
            pivotGrad: ['#558899', '#335566', '#112233'],
            textColor: 'rgba(100,200,240,0.6)',
            vuTextColor: 'rgba(80,180,220,0.5)',
            screwGrad: ['#557788', '#334455', '#112233'],
            reflectionAlpha: 0.03,
        },
    },

    init(leftCanvas, rightCanvas) {
        this.leftCanvas  = leftCanvas;
        this.rightCanvas = rightCanvas;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const landscape = document.body.classList.contains('landscape');
        const isNeedle = (this.style === 'needle' || this.style === 'warm' || this.style === 'blue');
        const isSpectrum = this.style === 'spectrum';

        if (isSpectrum) {
            /* Spectrum: single canvas spanning full width */
            const parent = this.leftCanvas.parentElement;
            let w;
            const ratio = landscape ? 0.55 : 0.4;
            if (landscape) {
                w = Math.floor(window.innerWidth - 30);
                const maxH = Math.floor(window.innerHeight * 0.78);
                const h0 = Math.floor(w * ratio);
                if (h0 > maxH) w = Math.floor(maxH / ratio);
            } else {
                w = Math.floor(Math.min(500, parent.clientWidth - 20));
            }
            const h = Math.floor(w * ratio);
            const dpr = window.devicePixelRatio;
            this.leftCanvas.width  = w * dpr;
            this.leftCanvas.height = h * dpr;
            this.leftCanvas.style.width  = w + 'px';
            this.leftCanvas.style.height = h + 'px';
            this.leftCanvas.style.maxWidth = w + 'px';
            this.leftCanvas.style.display = '';
            this.rightCanvas.style.display = 'none';
        } else {
            this.leftCanvas.style.display = '';
            this.rightCanvas.style.display = '';
            this.leftCanvas.style.maxWidth = '';
            [this.leftCanvas, this.rightCanvas].forEach(c => {
                const parent = c.parentElement;
                let w;
                if (landscape) {
                    const maxH = Math.floor(window.innerHeight * 0.75);
                    const hRatio = isNeedle ? 0.75 : 0.8;
                    w = Math.floor(maxH / hRatio);
                    w = Math.min(w, Math.floor(window.innerWidth / 2 - 20));
                } else {
                    w = Math.floor(Math.min(240, parent.clientWidth / 2 - 10));
                }
                const h = isNeedle ? Math.floor(w * 0.75) : Math.floor(w * 0.8);
                const dpr = window.devicePixelRatio;
                c.width  = w * dpr;
                c.height = h * dpr;
                c.style.width  = w + 'px';
                c.style.height = h + 'px';
            });
        }
    },

    setStyle(s) { this.style = s; this.resize(); },

    update(leftLevel, rightLevel, freqData) {
        /* Spring-damper ballistics for needle styles */
        const k = 0.08, d = 0.42;

        this.vL += k * (leftLevel - this.lL) - d * this.vL;
        this.lL += this.vL;
        this.lL = Math.max(0, this.lL);

        this.vR += k * (rightLevel - this.lR) - d * this.vR;
        this.lR += this.vR;
        this.lR = Math.max(0, this.lR);

        /* Peak hold */
        if (leftLevel  > this.pL) this.pL = leftLevel;  else this.pL *= 0.993;
        if (rightLevel > this.pR) this.pR = rightLevel;  else this.pR *= 0.993;

        /* Spectrum band smoothing */
        if (freqData) {
            this._freqData = freqData;
            const bands = 32;
            if (!this._specBands || this._specBands.length !== bands) {
                this._specBands = new Float32Array(bands);
                this._specPeaks = new Float32Array(bands);
            }
            const binsPerBand = Math.floor(freqData.length / bands);
            for (let b = 0; b < bands; b++) {
                let sum = 0;
                const start = b * binsPerBand;
                for (let i = start; i < start + binsPerBand && i < freqData.length; i++) {
                    sum += freqData[i];
                }
                const val = sum / (binsPerBand * 255);
                this._specBands[b] += (val - this._specBands[b]) * 0.35;
                if (this._specBands[b] > this._specPeaks[b]) {
                    this._specPeaks[b] = this._specBands[b];
                } else {
                    this._specPeaks[b] *= 0.97;
                }
            }
        } else {
            if (this._specBands) {
                for (let b = 0; b < this._specBands.length; b++) {
                    this._specBands[b] *= 0.9;
                    this._specPeaks[b] *= 0.95;
                }
            }
        }
    },

    draw() {
        if (this.style === 'spectrum') {
            /* Spectrum uses a single full-width canvas */
            const ctx = this.leftCanvas.getContext('2d');
            const w = this.leftCanvas.width, h = this.leftCanvas.height;
            ctx.clearRect(0, 0, w, h);
            this._drawSpectrum(ctx, w, h);
            return;
        }

        const levels = [this.lL, this.lR];
        const peaks  = [this.pL, this.pR];
        const canvases = [this.leftCanvas, this.rightCanvas];
        const labels = ['L', 'R'];

        canvases.forEach((cv, i) => {
            const ctx = cv.getContext('2d');
            const w = cv.width, h = cv.height;
            ctx.clearRect(0, 0, w, h);

            switch (this.style) {
                case 'needle':  this._drawNeedleMeter(ctx, w, h, levels[i], peaks[i], labels[i], this._THEMES.needle); break;
                case 'warm':    this._drawNeedleMeter(ctx, w, h, levels[i], peaks[i], labels[i], this._THEMES.warm);   break;
                case 'blue':    this._drawNeedleMeter(ctx, w, h, levels[i], peaks[i], labels[i], this._THEMES.blue);   break;
                case 'lcd':     this._drawLCD(ctx, w, h, levels[i], peaks[i], labels[i]); break;
                case 'led':     this._drawLED(ctx, w, h, levels[i], peaks[i], labels[i]); break;
            }
        });
    },

    /* Render a static preview for the settings picker */
    drawPreview(canvas, style) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const level = 0.55, pk = 0.65;
        switch (style) {
            case 'needle':  this._drawNeedleMeter(ctx, w, h, level, pk, 'L', this._THEMES.needle); break;
            case 'warm':    this._drawNeedleMeter(ctx, w, h, level, pk, 'L', this._THEMES.warm);   break;
            case 'blue':    this._drawNeedleMeter(ctx, w, h, level, pk, 'L', this._THEMES.blue);   break;
            case 'lcd':     this._drawLCD(ctx, w, h, level, pk, 'L'); break;
            case 'led':     this._drawLED(ctx, w, h, level, pk, 'L'); break;
            case 'spectrum': this._drawSpectrumPreview(ctx, w, h); break;
        }
    },

    /* ================ THEMED NEEDLE METER ================ */
    _drawNeedleMeter(ctx, w, h, level, peak, label, t) {
        const dpr = window.devicePixelRatio;
        const m = 8 * dpr;

        /* ── Outer bezel ── */
        ctx.fillStyle = t.bezelBase;
        ctx.fillRect(0, 0, w, h);

        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, t.bezelGrad[0]);
        bg.addColorStop(0.04, t.bezelGrad[1]);
        bg.addColorStop(0.96, t.bezelGrad[2]);
        bg.addColorStop(1, t.bezelGrad[3]);
        this._roundRect(ctx, 2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr, 6 * dpr, bg);

        /* ── Face plate ── */
        const faceX = m, faceY = m, faceW = w - 2 * m, faceH = h - 2 * m;
        const fg = ctx.createLinearGradient(faceX, faceY, faceX, faceY + faceH);
        fg.addColorStop(0, t.faceGrad[0]);
        fg.addColorStop(0.35, t.faceGrad[1]);
        fg.addColorStop(1, t.faceGrad[2]);
        this._roundRect(ctx, faceX, faceY, faceW, faceH, 4 * dpr, fg);

        /* Pivot geometry */
        const cx = w / 2;
        const cy = h - m - 12 * dpr;
        const r = Math.min((w - 2 * m) / 2 - 8 * dpr, cy - m - 32 * dpr);

        const toRad = Math.PI / 180;
        const tipXY = (deg, rad) => [
            cx + Math.sin(deg * toRad) * rad,
            cy - Math.cos(deg * toRad) * rad
        ];
        const sweep = 55;

        /* ── Backlight glow (warm / blue) ── */
        if (t.glowColor) {
            ctx.save();
            const glow = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy - r * 0.3, r * 1.1);
            glow.addColorStop(0, t.glowColor);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(faceX, faceY, faceW, faceH);
            ctx.restore();
        }

        /* ── Scale arc ── */
        ctx.beginPath();
        for (let d = -sweep; d <= sweep; d += 1) {
            const [x, y] = tipXY(d, r);
            d === -sweep ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = t.arcColor;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();

        /* ── Red zone arc ── */
        const redStart = -sweep + 2 * sweep * 0.7;
        ctx.beginPath();
        for (let d = redStart; d <= sweep; d += 1) {
            const [x, y] = tipXY(d, r - 4 * dpr);
            d <= redStart + 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = t.redColor;
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
            ctx.strokeStyle = red ? t.redColor : t.tickColor;
            ctx.lineWidth = (major ? 2 : 1.2) * dpr;
            ctx.stroke();

            if (major) {
                const [lx, ly] = tipXY(deg, r + 18 * dpr);
                ctx.fillStyle = red ? t.redColor : t.tickLabelColor;
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

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 4 * dpr;
        ctx.shadowOffsetX = 2 * dpr;
        ctx.shadowOffsetY = 2 * dpr;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = t.needleColor;
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        /* Crisp needle on top */
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = t.needleColor;
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        /* Needle tip arrowhead */
        const tipLen = 6 * dpr, tipW = 2.5 * dpr;
        const [t1x, t1y] = tipXY(needleDeg, r - 2 * dpr);
        const [t2x, t2y] = tipXY(needleDeg, r - 2 * dpr - tipLen);
        const perpX = -(t1y - t2y), perpY = (t1x - t2x);
        const pLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        ctx.beginPath();
        ctx.moveTo(t1x, t1y);
        ctx.lineTo(t2x + perpX / pLen * tipW, t2y + perpY / pLen * tipW);
        ctx.lineTo(t2x - perpX / pLen * tipW, t2y - perpY / pLen * tipW);
        ctx.closePath();
        ctx.fillStyle = t.tipColor;
        ctx.fill();

        /* ── Pivot ── */
        const pg = ctx.createRadialGradient(cx - dpr, cy - dpr, 0, cx, cy, 5 * dpr);
        pg.addColorStop(0, t.pivotGrad[0]);
        pg.addColorStop(0.4, t.pivotGrad[1]);
        pg.addColorStop(1, t.pivotGrad[2]);
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 0.5 * dpr;
        ctx.stroke();

        /* ── Labels ── */
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = t.textColor;
        ctx.font = `bold ${10 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, h - 3 * dpr);
        ctx.fillStyle = t.vuTextColor;
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.fillText('VU', cx, m + 14 * dpr);

        /* ── Glass reflection ── */
        if (t.reflectionAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = t.reflectionAlpha;
            ctx.beginPath();
            ctx.ellipse(
                faceX + faceW * 0.35, faceY + faceH * 0.22,
                faceW * 0.28, faceH * 0.15,
                -0.3, 0, Math.PI * 2
            );
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.restore();
        }

        /* ── Face border ── */
        ctx.strokeStyle = t.bezelGrad[1];
        ctx.lineWidth = 1.5 * dpr;
        this._strokeRoundRect(ctx, faceX, faceY, faceW, faceH, 4 * dpr);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5 * dpr;
        this._strokeRoundRect(ctx, faceX + dpr, faceY + dpr, faceW - 2 * dpr, faceH - 2 * dpr, 3 * dpr);

        /* ── Corner screws ── */
        const screwR = 2.5 * dpr;
        const screwOff = m + 6 * dpr;
        [[screwOff, screwOff], [w - screwOff, screwOff],
         [screwOff, h - screwOff], [w - screwOff, h - screwOff]].forEach(([sx, sy]) => {
            const sg = ctx.createRadialGradient(sx - 0.5 * dpr, sy - 0.5 * dpr, 0, sx, sy, screwR);
            sg.addColorStop(0, t.screwGrad[0]);
            sg.addColorStop(0.6, t.screwGrad[1]);
            sg.addColorStop(1, t.screwGrad[2]);
            ctx.beginPath();
            ctx.arc(sx, sy, screwR, 0, Math.PI * 2);
            ctx.fillStyle = sg;
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx - screwR * 0.6, sy);
            ctx.lineTo(sx + screwR * 0.6, sy);
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 0.8 * dpr;
            ctx.stroke();
        });
    },

    /* ================ LCD ================ */
    _drawLCD(ctx, w, h, level, peak, label) {
        const dpr = window.devicePixelRatio;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, w, h);

        const bz = 6 * dpr;
        this._roundRect(ctx, bz, bz, w - 2 * bz, h - 2 * bz, 3 * dpr, '#8B9A6B');
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.lineWidth = dpr;
        this._strokeRoundRect(ctx, bz + dpr, bz + dpr, w - 2 * bz - 2 * dpr, h - 2 * bz - 2 * dpr, 2 * dpr);

        const pad = bz + 8 * dpr, cols = 30, gap = 1.5 * dpr;
        const scaleH = 12 * dpr, labelH = 14 * dpr;
        const barW = (w - 2 * pad - (cols - 1) * gap) / cols;
        const barH = h - 2 * pad - scaleH - labelH;
        const baseY = pad + scaleH;

        const ink = '#3D4A2A';
        ctx.fillStyle = ink;
        ctx.font = `${7 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        [{db:-20,frac:0},{db:-10,frac:0.33},{db:-5,frac:0.5},{db:-3,frac:0.6},{db:0,frac:0.78},{db:3,frac:1}].forEach(({db,frac}) => {
            const col = Math.round(frac * (cols - 1));
            const x = pad + col * (barW + gap) + barW / 2;
            ctx.fillText(String(db), x, pad + scaleH - 3 * dpr);
            ctx.fillRect(x - 0.5 * dpr, pad + scaleH - 1.5 * dpr, dpr, 2 * dpr);
        });

        for (let i = 0; i < cols; i++) {
            const frac = (i + 1) / cols;
            const x = pad + i * (barW + gap);
            const active = level >= frac;
            const isPeak = peak > 0 && Math.abs(frac - peak) < 1 / cols;
            ctx.fillStyle = (active || isPeak) ? '#2A331A' : '#7D8B5F';
            ctx.fillRect(x, baseY, barW, barH);
        }

        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let sy = bz; sy < h - bz; sy += 2 * dpr) {
            ctx.fillRect(bz, sy, w - 2 * bz, dpr * 0.6);
        }

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

        const pad = 10 * dpr, scaleW = 22 * dpr, rows = 20, gap = 3 * dpr;
        const labelH = 16 * dpr;
        const ledH = (h - 2 * pad - labelH - (rows - 1) * gap) / rows;
        const ledW = w - 2 * pad - scaleW;

        ctx.fillStyle = '#555';
        ctx.font = `${7 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        [{db:'+3',frac:1},{db:'0',frac:0.78},{db:'-3',frac:0.6},{db:'-5',frac:0.5},{db:'-10',frac:0.33},{db:'-20',frac:0.05}].forEach(({db,frac}) => {
            const row = Math.round(frac * (rows - 1));
            const y = h - pad - labelH - (row + 1) * (ledH + gap) + gap + ledH / 2 + 3 * dpr;
            ctx.fillText(db, pad + ledW + 4 * dpr, y);
        });

        for (let i = 0; i < rows; i++) {
            const frac = (i + 1) / rows;
            const y = h - pad - labelH - (i + 1) * (ledH + gap) + gap;
            const active = level >= frac;
            const isPeak = peak > 0 && Math.abs(frac - peak) < 1 / rows;

            let onColor, offColor;
            if (frac < 0.6)      { onColor = '#00e676'; offColor = '#0a1a0a'; }
            else if (frac < 0.8) { onColor = '#ffea00'; offColor = '#1a1a0a'; }
            else                 { onColor = '#ff1744'; offColor = '#1a0a0a'; }

            const rr = Math.min(ledH / 2, 3 * dpr);

            if (active || isPeak) {
                ctx.save();
                ctx.shadowColor = onColor;
                ctx.shadowBlur = 8 * dpr;
                this._roundRect(ctx, pad, y, ledW, ledH, rr, onColor);
                ctx.restore();
                this._roundRect(ctx, pad, y, ledW, ledH, rr, onColor);
                const hlG = ctx.createLinearGradient(pad, y, pad, y + ledH);
                hlG.addColorStop(0, 'rgba(255,255,255,0.25)');
                hlG.addColorStop(0.5, 'rgba(255,255,255,0)');
                hlG.addColorStop(1, 'rgba(0,0,0,0.15)');
                this._roundRect(ctx, pad, y, ledW, ledH, rr, hlG);
            } else {
                this._roundRect(ctx, pad, y, ledW, ledH, rr, offColor);
                const offG = ctx.createLinearGradient(pad, y, pad, y + ledH);
                offG.addColorStop(0, 'rgba(255,255,255,0.03)');
                offG.addColorStop(1, 'rgba(0,0,0,0.05)');
                this._roundRect(ctx, pad, y, ledW, ledH, rr, offG);
            }
        }

        ctx.fillStyle = '#555';
        ctx.font = `bold ${10 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, pad + ledW / 2, h - 3 * dpr);
    },

    /* ================ SPECTRUM ANALYSER ================ */
    _drawSpectrum(ctx, w, h) {
        const dpr = window.devicePixelRatio;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        const pad = 10 * dpr;
        const labelH = 16 * dpr;
        const bands = this._specBands;
        if (!bands) return;

        const numBars = bands.length;
        const gap = 2 * dpr;
        const barW = (w - 2 * pad - (numBars - 1) * gap) / numBars;
        const maxH = h - 2 * pad - labelH;

        /* Frequency labels */
        const sampleRate = 44100;
        const binCount = 128;
        const hzPerBin = sampleRate / (binCount * 2);
        const binsPerBand = Math.floor(binCount / bands.length);

        ctx.font = `${7 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#444';

        for (let i = 0; i < numBars; i++) {
            const x = pad + i * (barW + gap);
            const val = Math.min(1, bands[i] * 1.4);
            const barH = val * maxH;
            const y = pad + maxH - barH;

            /* Bar gradient: green → yellow → red */
            if (barH > 1) {
                const grad = ctx.createLinearGradient(x, pad + maxH, x, pad);
                grad.addColorStop(0, '#00c853');
                grad.addColorStop(0.5, '#00e676');
                grad.addColorStop(0.7, '#ffea00');
                grad.addColorStop(0.9, '#ff9100');
                grad.addColorStop(1, '#ff1744');
                ctx.fillStyle = grad;

                /* Glow */
                ctx.save();
                ctx.shadowColor = val > 0.7 ? '#ff9100' : '#00e676';
                ctx.shadowBlur = 4 * dpr;
                ctx.fillRect(x, y, barW, barH);
                ctx.restore();
                ctx.fillStyle = grad;
                ctx.fillRect(x, y, barW, barH);
            }

            /* Peak marker */
            const peakVal = Math.min(1, (this._specPeaks[i] || 0) * 1.4);
            if (peakVal > 0.02) {
                const peakY = pad + maxH - peakVal * maxH;
                ctx.fillStyle = '#fff';
                ctx.fillRect(x, peakY, barW, 1.5 * dpr);
            }

            /* Freq label (every 4th bar) */
            if (i % 4 === 0) {
                const freqHz = (i * binsPerBand + binsPerBand / 2) * hzPerBin;
                const freqLabel = freqHz >= 1000 ? `${(freqHz / 1000).toFixed(1)}k` : `${Math.round(freqHz)}`;
                ctx.fillStyle = '#444';
                ctx.fillText(freqLabel, x + barW / 2, h - pad + 2 * dpr);
            }
        }

        /* Channel labels */
        ctx.fillStyle = '#555';
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('L', pad, h - 2 * dpr);
        ctx.textAlign = 'right';
        ctx.fillText('R', w - pad, h - 2 * dpr);
    },

    /* Static preview spectrum for the settings picker */
    _drawSpectrumPreview(ctx, w, h) {
        const dpr = window.devicePixelRatio;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        const pad = 6 * dpr;
        const numBars = 16;
        const gap = 2 * dpr;
        const barW = (w - 2 * pad - (numBars - 1) * gap) / numBars;
        const maxH = h - 2 * pad - 10 * dpr;

        /* Fake music-like spectrum shape: loud bass, gradual rolloff */
        const shape = [0.8, 0.9, 0.85, 0.7, 0.75, 0.65, 0.6, 0.55,
                       0.5, 0.55, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2];

        for (let i = 0; i < numBars; i++) {
            const x = pad + i * (barW + gap);
            const val = shape[i];
            const barH = val * maxH;
            const y = pad + maxH - barH;

            const grad = ctx.createLinearGradient(x, pad + maxH, x, pad);
            grad.addColorStop(0, '#00c853');
            grad.addColorStop(0.5, '#00e676');
            grad.addColorStop(0.7, '#ffea00');
            grad.addColorStop(0.9, '#ff9100');
            grad.addColorStop(1, '#ff1744');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barW, barH);

            /* Peak dot */
            ctx.fillStyle = '#fff';
            ctx.fillRect(x, y - 3 * dpr, barW, 1.5 * dpr);
        }
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
