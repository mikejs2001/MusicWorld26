/* vuMeters.js — six meter styles inspired by classic hi-fi:
   needle  = Technics-style silver precision meter
   warm    = Marantz-style vintage amber meter
   blue    = Pioneer-style fluorescent blue meter
   lcd     = Casio-style green LCD
   led     = vertical LED bar meter
   spectrum = frequency spectrum analyser
*/

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
        const k = 0.08, d = 0.42;

        this.vL += k * (leftLevel - this.lL) - d * this.vL;
        this.lL += this.vL;
        this.lL = Math.max(0, this.lL);

        this.vR += k * (rightLevel - this.lR) - d * this.vR;
        this.lR += this.vR;
        this.lR = Math.max(0, this.lR);

        if (leftLevel  > this.pL) this.pL = leftLevel;  else this.pL *= 0.993;
        if (rightLevel > this.pR) this.pR = rightLevel;  else this.pR *= 0.993;

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
                case 'needle':  this._drawTechnics(ctx, w, h, levels[i], peaks[i], labels[i]); break;
                case 'warm':    this._drawMarantz(ctx, w, h, levels[i], peaks[i], labels[i]); break;
                case 'blue':    this._drawPioneer(ctx, w, h, levels[i], peaks[i], labels[i]); break;
                case 'lcd':     this._drawLCD(ctx, w, h, levels[i], peaks[i], labels[i]); break;
                case 'led':     this._drawLED(ctx, w, h, levels[i], peaks[i], labels[i]); break;
            }
        });
    },

    drawPreview(canvas, style) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const level = 0.55, pk = 0.65;
        switch (style) {
            case 'needle':  this._drawTechnics(ctx, w, h, level, pk, 'L'); break;
            case 'warm':    this._drawMarantz(ctx, w, h, level, pk, 'L'); break;
            case 'blue':    this._drawPioneer(ctx, w, h, level, pk, 'L'); break;
            case 'lcd':     this._drawLCD(ctx, w, h, level, pk, 'L'); break;
            case 'led':     this._drawLED(ctx, w, h, level, pk, 'L'); break;
            case 'spectrum': this._drawSpectrumPreview(ctx, w, h); break;
        }
    },


    /* ================================================================
       TECHNICS-STYLE — Brushed silver face, precision engineering,
       thin black needle, clean Helvetica-style labels, no screws.
       Inspired by Technics SU-V / SE-A series amplifiers.
       ================================================================ */
    _drawTechnics(ctx, w, h, level, peak, label) {
        const dpr = window.devicePixelRatio;
        const m = 6 * dpr;

        /* ── Outer bezel — dark gunmetal ── */
        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(0, 0, w, h);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#3e3e3e');
        bg.addColorStop(0.03, '#2c2c2c');
        bg.addColorStop(0.97, '#181818');
        bg.addColorStop(1, '#2a2a2a');
        this._roundRect(ctx, 1.5 * dpr, 1.5 * dpr, w - 3 * dpr, h - 3 * dpr, 4 * dpr, bg);

        /* ── Face plate — brushed silver aluminium ── */
        const fX = m, fY = m, fW = w - 2 * m, fH = h - 2 * m;
        const fg = ctx.createLinearGradient(fX, fY, fX, fY + fH);
        fg.addColorStop(0,    '#e8e4dc');
        fg.addColorStop(0.15, '#e0dcd2');
        fg.addColorStop(0.5,  '#d5d0c6');
        fg.addColorStop(0.85, '#ccc7bc');
        fg.addColorStop(1,    '#c4bfb4');
        this._roundRect(ctx, fX, fY, fW, fH, 3 * dpr, fg);

        /* Brushed-metal horizontal texture */
        ctx.save();
        ctx.globalAlpha = 0.035;
        for (let sy = fY; sy < fY + fH; sy += dpr) {
            ctx.fillStyle = (sy / dpr) % 3 < 1 ? '#000' : '#fff';
            ctx.fillRect(fX, sy, fW, dpr * 0.4);
        }
        ctx.restore();

        /* ── Geometry ── */
        const cx = w / 2;
        const cy = h - m - 10 * dpr;
        const r = Math.min((w - 2 * m) / 2 - 6 * dpr, cy - m - 26 * dpr);
        const toRad = Math.PI / 180;
        const tipXY = (deg, rad) => [
            cx + Math.sin(deg * toRad) * rad,
            cy - Math.cos(deg * toRad) * rad
        ];
        const sweep = 50;

        /* ── Scale arc — thin precise line ── */
        ctx.beginPath();
        for (let d = -sweep; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r);
            d === -sweep ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.8 * dpr;
        ctx.stroke();

        /* ── Red zone — thin red line above arc ── */
        const redStart = -sweep + 2 * sweep * 0.72;
        ctx.beginPath();
        for (let d = redStart; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r + 4 * dpr);
            d <= redStart + 0.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#c00';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();

        /* ── Tick marks — outside arc, thin and precise ── */
        const ticks = [-20, -10, -7, -5, -3, -1, 0, 1, 2, 3];
        ticks.forEach((db, j) => {
            const frac = j / (ticks.length - 1);
            const deg  = -sweep + 2 * sweep * frac;
            const red  = db >= 1;
            const major = (j % 2 === 0);

            const [ix, iy] = tipXY(deg, r);
            const [ox, oy] = tipXY(deg, r + (major ? 8 : 5) * dpr);

            ctx.beginPath();
            ctx.moveTo(ix, iy); ctx.lineTo(ox, oy);
            ctx.strokeStyle = red ? '#c00' : '#555';
            ctx.lineWidth = (major ? 1.5 : 0.7) * dpr;
            ctx.stroke();

            if (major) {
                const [lx, ly] = tipXY(deg, r + 15 * dpr);
                ctx.fillStyle = red ? '#c00' : '#444';
                ctx.font = `${8 * dpr}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(db), lx, ly);
            }
        });

        /* ── Needle — thin black with subtle shadow ── */
        const clamped = Math.min(1.15, Math.max(0, level));
        const needleDeg = -sweep + 2 * sweep * clamped;
        const [nx, ny] = tipXY(needleDeg, r - 2 * dpr);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 3 * dpr;
        ctx.shadowOffsetX = 1 * dpr;
        ctx.shadowOffsetY = 1 * dpr;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.2 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.2 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        /* Red tip triangle */
        const tipLen = 5 * dpr, tipW = 2 * dpr;
        const [t1x, t1y] = tipXY(needleDeg, r - 2 * dpr);
        const [t2x, t2y] = tipXY(needleDeg, r - 2 * dpr - tipLen);
        const perpX = -(t1y - t2y), perpY = (t1x - t2x);
        const pLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        ctx.beginPath();
        ctx.moveTo(t1x, t1y);
        ctx.lineTo(t2x + perpX / pLen * tipW, t2y + perpY / pLen * tipW);
        ctx.lineTo(t2x - perpX / pLen * tipW, t2y - perpY / pLen * tipW);
        ctx.closePath();
        ctx.fillStyle = '#c00';
        ctx.fill();

        /* ── Small dark pivot ── */
        const pg = ctx.createRadialGradient(cx - dpr, cy - dpr, 0, cx, cy, 3.5 * dpr);
        pg.addColorStop(0, '#666');
        pg.addColorStop(0.5, '#333');
        pg.addColorStop(1, '#111');
        ctx.beginPath();
        ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();

        /* ── Labels — clean layout ── */
        ctx.textBaseline = 'alphabetic';
        ctx.font = `600 ${8 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#777';
        ctx.fillText('VU', cx, m + 11 * dpr);

        ctx.font = `${9 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#555';
        ctx.fillText(label, fX + 6 * dpr, h - m - 2 * dpr);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#999';
        ctx.font = `${7 * dpr}px sans-serif`;
        ctx.fillText('dB', fX + fW - 6 * dpr, h - m - 2 * dpr);

        /* ── Face inset border ── */
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.5 * dpr;
        this._strokeRoundRect(ctx, fX, fY, fW, fH, 3 * dpr);
    },


    /* ================================================================
       MARANTZ-STYLE — Dark face with warm amber/gold backlit scale,
       dual concentric arcs, inward ticks, white needle, gold pivot.
       Inspired by Marantz 2270 / 2325 / 2285 receivers.
       ================================================================ */
    _drawMarantz(ctx, w, h, level, peak, label) {
        const dpr = window.devicePixelRatio;
        const m = 10 * dpr;

        /* ── Outer bezel — deep walnut/brown ── */
        ctx.fillStyle = '#1a1208';
        ctx.fillRect(0, 0, w, h);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0,    '#5a4428');
        bg.addColorStop(0.04, '#3a2818');
        bg.addColorStop(0.5,  '#2a1c10');
        bg.addColorStop(0.96, '#1a1208');
        bg.addColorStop(1,    '#3a2818');
        this._roundRect(ctx, 2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr, 6 * dpr, bg);

        /* Subtle wood-grain texture on bezel */
        ctx.save();
        ctx.globalAlpha = 0.06;
        for (let sy = 0; sy < h; sy += dpr * 2) {
            const offset = Math.sin(sy * 0.02) * 3 * dpr;
            ctx.fillStyle = '#000';
            ctx.fillRect(offset, sy, w, dpr * 0.5);
        }
        ctx.restore();

        /* ── Face plate — deep black ── */
        const fX = m, fY = m, fW = w - 2 * m, fH = h - 2 * m;
        const fg = ctx.createLinearGradient(fX, fY, fX, fY + fH);
        fg.addColorStop(0,   '#1a1510');
        fg.addColorStop(0.3, '#12100a');
        fg.addColorStop(1,   '#0e0c08');
        this._roundRect(ctx, fX, fY, fW, fH, 4 * dpr, fg);

        /* ── Geometry ── */
        const cx = w / 2;
        const cy = h - m - 14 * dpr;
        const r = Math.min((w - 2 * m) / 2 - 10 * dpr, cy - m - 34 * dpr);
        const toRad = Math.PI / 180;
        const tipXY = (deg, rad) => [
            cx + Math.sin(deg * toRad) * rad,
            cy - Math.cos(deg * toRad) * rad
        ];
        const sweep = 55;

        /* ── Warm amber backlight glow ── */
        ctx.save();
        const glow = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy - r * 0.3, r * 1.2);
        glow.addColorStop(0, 'rgba(255,170,50,0.25)');
        glow.addColorStop(0.6, 'rgba(255,140,30,0.08)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(fX, fY, fW, fH);
        ctx.restore();

        /* ── Dual concentric arcs — thick amber ── */
        /* Outer arc */
        ctx.beginPath();
        for (let d = -sweep; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r + 6 * dpr);
            d === -sweep ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,200,100,0.5)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();

        /* Inner arc */
        ctx.beginPath();
        for (let d = -sweep; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r);
            d === -sweep ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,210,140,0.7)';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();

        /* ── Red zone — amber-red gradient arc ── */
        const redStart = -sweep + 2 * sweep * 0.7;
        ctx.beginPath();
        for (let d = redStart; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r + 3 * dpr);
            d <= redStart + 0.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ff5533';
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();

        /* ── Tick marks — extend INWARD from inner arc ── */
        const ticks = [-20, -10, -7, -5, -3, -1, 0, 1, 2, 3];
        ticks.forEach((db, j) => {
            const frac = j / (ticks.length - 1);
            const deg  = -sweep + 2 * sweep * frac;
            const red  = db >= 1;
            const major = (j % 2 === 0);

            /* Ticks go inward (from arc toward pivot) */
            const [ox, oy] = tipXY(deg, r);
            const [ix, iy] = tipXY(deg, r - (major ? 10 : 6) * dpr);

            ctx.beginPath();
            ctx.moveTo(ox, oy); ctx.lineTo(ix, iy);
            ctx.strokeStyle = red ? '#ff5533' : 'rgba(255,210,140,0.8)';
            ctx.lineWidth = (major ? 1.8 : 1) * dpr;
            ctx.stroke();

            /* Labels — OUTSIDE the outer arc */
            if (major) {
                const [lx, ly] = tipXY(deg, r + 16 * dpr);
                ctx.fillStyle = red ? '#ff5533' : 'rgba(255,220,160,0.9)';
                ctx.font = `bold ${9 * dpr}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(db), lx, ly);
            }
        });

        /* ── Needle — white/cream, tapered, with amber tip ── */
        const clamped = Math.min(1.15, Math.max(0, level));
        const needleDeg = -sweep + 2 * sweep * clamped;
        const [nx, ny] = tipXY(needleDeg, r - 4 * dpr);

        /* Tapered needle: draw as a thin filled triangle */
        const baseW = 2.5 * dpr;
        const perpNx = -(ny - cy), perpNy = (nx - cx);
        const perpLen = Math.sqrt(perpNx * perpNx + perpNy * perpNy) || 1;
        const bx = perpNx / perpLen * baseW;
        const by = perpNy / perpLen * baseW;

        ctx.save();
        ctx.shadowColor = 'rgba(255,180,80,0.3)';
        ctx.shadowBlur = 6 * dpr;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(cx + bx, cy + by);
        ctx.lineTo(cx - bx, cy - by);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,240,220,0.95)';
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(cx + bx, cy + by);
        ctx.lineTo(cx - bx, cy - by);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,240,220,0.95)';
        ctx.fill();

        /* Amber tip dot */
        const [tdx, tdy] = tipXY(needleDeg, r - 6 * dpr);
        ctx.beginPath();
        ctx.arc(tdx, tdy, 2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ff8822';
        ctx.fill();

        /* ── Large gold pivot ── */
        const pvR = 6 * dpr;
        const pvG = ctx.createRadialGradient(cx - dpr, cy - dpr, 0, cx, cy, pvR);
        pvG.addColorStop(0, '#ddb866');
        pvG.addColorStop(0.3, '#aa8844');
        pvG.addColorStop(0.7, '#775522');
        pvG.addColorStop(1, '#442200');
        ctx.beginPath();
        ctx.arc(cx, cy, pvR, 0, Math.PI * 2);
        ctx.fillStyle = pvG;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,100,0.3)';
        ctx.lineWidth = 0.5 * dpr;
        ctx.stroke();

        /* ── Labels — gold vintage text ── */
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(255,190,100,0.7)';
        ctx.font = `bold ${11 * dpr}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('VU', cx, m + 16 * dpr);

        ctx.fillStyle = 'rgba(255,200,120,0.6)';
        ctx.font = `bold ${9 * dpr}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, h - 3 * dpr);

        /* ── Decorative corner dots (gold accents) ── */
        const dotR = 1.5 * dpr;
        const dotOff = m + 5 * dpr;
        [[dotOff, dotOff], [w - dotOff, dotOff],
         [dotOff, h - dotOff], [w - dotOff, h - dotOff]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
            ctx.fillStyle = '#aa8844';
            ctx.fill();
        });

        /* ── Face border — subtle gold inset ── */
        ctx.strokeStyle = 'rgba(255,200,120,0.15)';
        ctx.lineWidth = 1 * dpr;
        this._strokeRoundRect(ctx, fX, fY, fW, fH, 4 * dpr);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1.5 * dpr;
        this._strokeRoundRect(ctx, fX - 0.5 * dpr, fY - 0.5 * dpr, fW + dpr, fH + dpr, 4.5 * dpr);
    },


    /* ================================================================
       PIONEER-STYLE — Dark navy face, fluorescent cyan/blue backlit
       scale, wide 60° sweep, rectangular block ticks, white needle
       with cyan glow, peak LED indicator.
       Inspired by Pioneer SX-1250 / SX-980 / SA-9800 receivers.
       ================================================================ */
    _drawPioneer(ctx, w, h, level, peak, label) {
        const dpr = window.devicePixelRatio;
        const m = 7 * dpr;

        /* ── Outer bezel — dark metallic blue-black ── */
        ctx.fillStyle = '#0a1018';
        ctx.fillRect(0, 0, w, h);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0,    '#2a3440');
        bg.addColorStop(0.03, '#1a2430');
        bg.addColorStop(0.97, '#0a1018');
        bg.addColorStop(1,    '#1e2a35');
        this._roundRect(ctx, 1.5 * dpr, 1.5 * dpr, w - 3 * dpr, h - 3 * dpr, 5 * dpr, bg);

        /* ── Face plate — dark navy ── */
        const fX = m, fY = m, fW = w - 2 * m, fH = h - 2 * m;
        const fg = ctx.createLinearGradient(fX, fY, fX, fY + fH);
        fg.addColorStop(0,   '#0c1a24');
        fg.addColorStop(0.3, '#081420');
        fg.addColorStop(1,   '#06101a');
        this._roundRect(ctx, fX, fY, fW, fH, 3 * dpr, fg);

        /* ── Geometry ── */
        const cx = w / 2;
        const cy = h - m - 12 * dpr;
        const r = Math.min((w - 2 * m) / 2 - 8 * dpr, cy - m - 30 * dpr);
        const toRad = Math.PI / 180;
        const tipXY = (deg, rad) => [
            cx + Math.sin(deg * toRad) * rad,
            cy - Math.cos(deg * toRad) * rad
        ];
        const sweep = 60;

        /* ── Fluorescent cyan glow ── */
        ctx.save();
        const glow = ctx.createRadialGradient(cx, cy - r * 0.15, r * 0.1, cx, cy - r * 0.25, r * 1.15);
        glow.addColorStop(0, 'rgba(0,200,255,0.22)');
        glow.addColorStop(0.5, 'rgba(0,160,220,0.08)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(fX, fY, fW, fH);
        ctx.restore();

        /* ── Scale arc — bright cyan with glow ── */
        ctx.save();
        ctx.shadowColor = 'rgba(0,200,255,0.4)';
        ctx.shadowBlur = 6 * dpr;
        ctx.beginPath();
        for (let d = -sweep; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r);
            d === -sweep ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(100,220,255,0.8)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
        ctx.restore();

        /* Crisp arc on top */
        ctx.beginPath();
        for (let d = -sweep; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r);
            d === -sweep ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(140,230,255,0.7)';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();

        /* ── Red zone ── */
        const redStart = -sweep + 2 * sweep * 0.7;
        ctx.beginPath();
        for (let d = redStart; d <= sweep; d += 0.5) {
            const [x, y] = tipXY(d, r - 5 * dpr);
            d <= redStart + 0.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();

        /* ── Tick marks — rectangular blocks (Pioneer style) ── */
        const ticks = [-20, -10, -7, -5, -3, -1, 0, 1, 2, 3];
        ticks.forEach((db, j) => {
            const frac = j / (ticks.length - 1);
            const deg  = -sweep + 2 * sweep * frac;
            const red  = db >= 1;
            const major = (j % 2 === 0);

            /* Draw rectangular blocks instead of lines */
            const blockLen = (major ? 8 : 5) * dpr;
            const blockW = (major ? 2.5 : 1.5) * dpr;
            const [ox, oy] = tipXY(deg, r + 2 * dpr);
            const [ex, ey] = tipXY(deg, r + 2 * dpr + blockLen);

            /* Direction vector */
            const dx = ex - ox, dy = ey - oy;
            const dl = Math.sqrt(dx * dx + dy * dy) || 1;
            const px = -dy / dl * blockW / 2, py = dx / dl * blockW / 2;

            ctx.beginPath();
            ctx.moveTo(ox + px, oy + py);
            ctx.lineTo(ox - px, oy - py);
            ctx.lineTo(ex - px, ey - py);
            ctx.lineTo(ex + px, ey + py);
            ctx.closePath();
            ctx.fillStyle = red ? '#ff4444' : 'rgba(140,230,255,0.8)';
            ctx.fill();

            if (major) {
                const [lx, ly] = tipXY(deg, r + 2 * dpr + blockLen + 8 * dpr);
                ctx.fillStyle = red ? '#ff4444' : 'rgba(180,240,255,0.9)';
                ctx.font = `bold ${8.5 * dpr}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(db), lx, ly);
            }
        });

        /* ── Needle — bright white with cyan glow ── */
        const clamped = Math.min(1.15, Math.max(0, level));
        const needleDeg = -sweep + 2 * sweep * clamped;
        const [nx, ny] = tipXY(needleDeg, r - 2 * dpr);

        /* Cyan glow layer */
        ctx.save();
        ctx.shadowColor = 'rgba(0,200,255,0.5)';
        ctx.shadowBlur = 8 * dpr;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = 'rgba(100,220,255,0.6)';
        ctx.lineWidth = 2.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        /* Crisp white needle */
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = 'rgba(220,245,255,0.95)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineCap = 'round';
        ctx.stroke();

        /* Cyan tip */
        const [t1x, t1y] = tipXY(needleDeg, r - 2 * dpr);
        const [t2x, t2y] = tipXY(needleDeg, r - 2 * dpr - 6 * dpr);
        const perpX = -(t1y - t2y), perpY = (t1x - t2x);
        const pL = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        ctx.beginPath();
        ctx.moveTo(t1x, t1y);
        ctx.lineTo(t2x + perpX / pL * 2.5 * dpr, t2y + perpY / pL * 2.5 * dpr);
        ctx.lineTo(t2x - perpX / pL * 2.5 * dpr, t2y - perpY / pL * 2.5 * dpr);
        ctx.closePath();
        ctx.fillStyle = '#00ccee';
        ctx.fill();

        /* ── Peak LED indicator — small red dot at peak position ── */
        if (peak > 0.02) {
            const peakDeg = -sweep + 2 * sweep * Math.min(1.15, peak);
            const [px, py] = tipXY(peakDeg, r + 1 * dpr);
            ctx.save();
            ctx.shadowColor = '#ff2244';
            ctx.shadowBlur = 6 * dpr;
            ctx.beginPath();
            ctx.arc(px, py, 2 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#ff2244';
            ctx.fill();
            ctx.restore();
            ctx.beginPath();
            ctx.arc(px, py, 2 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4466';
            ctx.fill();
        }

        /* ── Pivot — metallic blue-silver ── */
        const pvG = ctx.createRadialGradient(cx - dpr, cy - dpr, 0, cx, cy, 5 * dpr);
        pvG.addColorStop(0, '#88aacc');
        pvG.addColorStop(0.4, '#446688');
        pvG.addColorStop(1, '#112233');
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = pvG;
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.3)';
        ctx.lineWidth = 0.5 * dpr;
        ctx.stroke();

        /* ── Labels ── */
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(100,200,240,0.7)';
        ctx.font = `bold ${8 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL', cx, m + 12 * dpr);

        ctx.fillStyle = 'rgba(140,220,255,0.6)';
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(label, fX + 5 * dpr, h - m - 2 * dpr);

        /* PEAK label near top-right */
        ctx.textAlign = 'right';
        ctx.fillStyle = peak > 0.7 ? '#ff4466' : 'rgba(255,100,120,0.4)';
        ctx.font = `${7 * dpr}px sans-serif`;
        ctx.fillText('PEAK', fX + fW - 5 * dpr, m + 12 * dpr);

        /* ── Face border ── */
        ctx.strokeStyle = 'rgba(100,200,255,0.1)';
        ctx.lineWidth = 1 * dpr;
        this._strokeRoundRect(ctx, fX, fY, fW, fH, 3 * dpr);
        ctx.strokeStyle = '#1a2a35';
        ctx.lineWidth = 1.5 * dpr;
        this._strokeRoundRect(ctx, fX - 0.5 * dpr, fY - 0.5 * dpr, fW + dpr, fH + dpr, 3.5 * dpr);
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

            if (barH > 1) {
                const grad = ctx.createLinearGradient(x, pad + maxH, x, pad);
                grad.addColorStop(0, '#00c853');
                grad.addColorStop(0.5, '#00e676');
                grad.addColorStop(0.7, '#ffea00');
                grad.addColorStop(0.9, '#ff9100');
                grad.addColorStop(1, '#ff1744');
                ctx.fillStyle = grad;

                ctx.save();
                ctx.shadowColor = val > 0.7 ? '#ff9100' : '#00e676';
                ctx.shadowBlur = 4 * dpr;
                ctx.fillRect(x, y, barW, barH);
                ctx.restore();
                ctx.fillStyle = grad;
                ctx.fillRect(x, y, barW, barH);
            }

            const peakVal = Math.min(1, (this._specPeaks[i] || 0) * 1.4);
            if (peakVal > 0.02) {
                const peakY = pad + maxH - peakVal * maxH;
                ctx.fillStyle = '#fff';
                ctx.fillRect(x, peakY, barW, 1.5 * dpr);
            }

            if (i % 4 === 0) {
                const freqHz = (i * binsPerBand + binsPerBand / 2) * hzPerBin;
                const freqLabel = freqHz >= 1000 ? `${(freqHz / 1000).toFixed(1)}k` : `${Math.round(freqHz)}`;
                ctx.fillStyle = '#444';
                ctx.fillText(freqLabel, x + barW / 2, h - pad + 2 * dpr);
            }
        }

        ctx.fillStyle = '#555';
        ctx.font = `bold ${9 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('L', pad, h - 2 * dpr);
        ctx.textAlign = 'right';
        ctx.fillText('R', w - pad, h - 2 * dpr);
    },

    _drawSpectrumPreview(ctx, w, h) {
        const dpr = window.devicePixelRatio;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        const pad = 6 * dpr;
        const numBars = 16;
        const gap = 2 * dpr;
        const barW = (w - 2 * pad - (numBars - 1) * gap) / numBars;
        const maxH = h - 2 * pad - 10 * dpr;

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
