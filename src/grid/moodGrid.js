/**
 * 2D Mood Grid: Canvas-based rendering with dynamic scaling and interaction.
 * X-axis: Sad (0) → Happy (1) (valence)
 * Y-axis: Slow (0) → Fast (1) (BPM)
 */

export class MoodGrid {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tracks = [];
    this.showDots = true;

    // Scaling bounds (updated dynamically)
    this.bpmMin = 0;
    this.bpmMax = 1;
    this.valenceMin = 0;
    this.valenceMax = 1;

    // Selection state
    this.selectedMood = null; // { x, y } normalized 0-1
    this.hoveredTrack = null;

    // Padding ratio (fraction of canvas for the outer border)
    this.padding = 0.05;

    // Bind events
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onResize = this._onResize.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);

    this._resizeObserver = new ResizeObserver(this._onResize);
    this._resizeObserver.observe(canvas.parentElement);

    this._onResize();

    // Callbacks
    this.onMoodSelected = null; // (moodPoint: {x, y}) => void
  }

  setTracks(tracks) {
    this.tracks = tracks.filter((t) => t.analyzed && t.bpm != null && t.valence != null);
    this.recalculateScaling();
    this.render();
  }

  recalculateScaling() {
    const analyzed = this.tracks;
    if (analyzed.length === 0) {
      this.bpmMin = 60;
      this.bpmMax = 180;
      this.valenceMin = 0;
      this.valenceMax = 1;
      return;
    }

    const bpms = analyzed.map((t) => t.bpm).sort((a, b) => a - b);
    const valences = analyzed.map((t) => t.valence).sort((a, b) => a - b);

    // Use 5th-95th percentile for robust scaling
    const p5 = (arr) => arr[Math.floor(arr.length * 0.05)] ?? arr[0];
    const p95 = (arr) => arr[Math.ceil(arr.length * 0.95) - 1] ?? arr[arr.length - 1];

    this.bpmMin = p5(bpms);
    this.bpmMax = p95(bpms);
    this.valenceMin = p5(valences);
    this.valenceMax = p95(valences);

    // Ensure non-zero ranges
    if (this.bpmMax - this.bpmMin < 1) {
      this.bpmMin -= 10;
      this.bpmMax += 10;
    }
    if (this.valenceMax - this.valenceMin < 0.01) {
      this.valenceMin = Math.max(0, this.valenceMin - 0.1);
      this.valenceMax = Math.min(1, this.valenceMax + 0.1);
    }
  }

  /** Convert track data to normalized grid position */
  trackToGrid(track) {
    const range = (v, min, max) => Math.max(0, Math.min(1, (v - min) / (max - min)));
    return {
      x: range(track.valence, this.valenceMin, this.valenceMax),
      y: range(track.bpm, this.bpmMin, this.bpmMax),
    };
  }

  /** Convert canvas pixel position to normalized mood coordinates */
  canvasToMood(canvasX, canvasY) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pad = this.padding;

    const innerW = w * (1 - 2 * pad);
    const innerH = h * (1 - 2 * pad);
    const innerX = w * pad;
    const innerY = h * pad;

    const x = Math.max(0, Math.min(1, (canvasX - innerX) / innerW));
    const y = Math.max(0, Math.min(1, 1 - (canvasY - innerY) / innerH)); // Flip Y: bottom=0

    return { x, y };
  }

  /** Convert normalized mood coordinates to canvas pixel position */
  moodToCanvas(mx, my) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pad = this.padding;

    const innerW = w * (1 - 2 * pad);
    const innerH = h * (1 - 2 * pad);
    const innerX = w * pad;
    const innerY = h * pad;

    return {
      cx: innerX + mx * innerW,
      cy: innerY + (1 - my) * innerH,
    };
  }

  render() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    const w = canvas.width;
    const h = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    // Grid background
    const pad = this.padding;
    const innerX = w * pad;
    const innerY = h * pad;
    const innerW = w * (1 - 2 * pad);
    const innerH = h * (1 - 2 * pad);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      // Vertical
      const gx = innerX + frac * innerW;
      ctx.beginPath();
      ctx.moveTo(gx, innerY);
      ctx.lineTo(gx, innerY + innerH);
      ctx.stroke();
      // Horizontal
      const gy = innerY + frac * innerH;
      ctx.beginPath();
      ctx.moveTo(innerX, gy);
      ctx.lineTo(innerX + innerW, gy);
      ctx.stroke();
    }

    // Draw center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(innerX + innerW / 2, innerY);
    ctx.lineTo(innerX + innerW / 2, innerY + innerH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(innerX, innerY + innerH / 2);
    ctx.lineTo(innerX + innerW, innerY + innerH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw track dots
    if (this.showDots) {
      for (const track of this.tracks) {
        const { x, y } = this.trackToGrid(track);
        const { cx, cy } = this.moodToCanvas(x, y);
        const isHovered = this.hoveredTrack === track.id;

        ctx.beginPath();
        ctx.arc(cx, cy, isHovered ? 6 * dpr : 4 * dpr, 0, Math.PI * 2);

        // Color based on energy/valence
        const hue = 120 + track.valence * 60; // green to yellow-green
        const lightness = 40 + (track.energy || 0.5) * 20;
        ctx.fillStyle = isHovered
          ? 'rgba(255, 255, 255, 0.95)'
          : `hsla(${hue}, 70%, ${lightness}%, 0.75)`;
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = 'rgba(29, 185, 84, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // Draw selection ring
    if (this.selectedMood) {
      const { cx, cy } = this.moodToCanvas(this.selectedMood.x, this.selectedMood.y);

      // Outer glow
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(29, 185, 84, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, 10 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    // Hovered track tooltip
    if (this.hoveredTrack) {
      const track = this.tracks.find((t) => t.id === this.hoveredTrack);
      if (track) {
        const { x, y } = this.trackToGrid(track);
        const { cx, cy } = this.moodToCanvas(x, y);
        const label = `${track.title} — ${track.bpm} BPM`;

        ctx.font = `${11 * dpr}px -apple-system, sans-serif`;
        const metrics = ctx.measureText(label);
        const tw = metrics.width + 12 * dpr;
        const th = 20 * dpr;

        let tx = cx - tw / 2;
        let ty = cy - 14 * dpr - th;
        // Keep on screen
        tx = Math.max(2, Math.min(w - tw - 2, tx));
        ty = Math.max(2, ty);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 4 * dpr);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, tx + 6 * dpr, ty + th / 2);
      }
    }
  }

  _onPointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (e.clientX - rect.left) * dpr;
    const canvasY = (e.clientY - rect.top) * dpr;

    this.selectedMood = this.canvasToMood(canvasX, canvasY);
    this.render();

    this.onMoodSelected?.(this.selectedMood);
  }

  _onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (e.clientX - rect.left) * dpr;
    const canvasY = (e.clientY - rect.top) * dpr;

    // Check if hovering over a track dot
    let closestId = null;
    let closestDist = Infinity;
    const threshold = 10 * dpr;

    for (const track of this.tracks) {
      const { x, y } = this.trackToGrid(track);
      const { cx, cy } = this.moodToCanvas(x, y);
      const dist = Math.sqrt((canvasX - cx) ** 2 + (canvasY - cy) ** 2);
      if (dist < threshold && dist < closestDist) {
        closestDist = dist;
        closestId = track.id;
      }
    }

    if (closestId !== this.hoveredTrack) {
      this.hoveredTrack = closestId;
      this.canvas.style.cursor = closestId ? 'pointer' : 'crosshair';
      this.render();
    }
  }

  _onResize() {
    const parent = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(parent.clientWidth, parent.clientHeight);

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';

    this.render();
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this._resizeObserver?.disconnect();
  }
}
