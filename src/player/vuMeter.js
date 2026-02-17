/**
 * VU Meter rendering: Analog Needle, LCD Bars, and LED Bars styles.
 * Driven by Web Audio API AnalyserNode data.
 */

export class VUMeter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyser = null;
    this.style = 'analog'; // 'analog' | 'lcd' | 'led'
    this.dataArray = null;
    this._animFrame = null;
    this._smoothedLevel = 0;
    this._peakLevel = 0;
    this._peakDecay = 0;
  }

  setAnalyser(analyser) {
    this.analyser = analyser;
    if (analyser) {
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
  }

  setStyle(style) {
    this.style = style;
  }

  start() {
    if (this._animFrame) return;
    this._animate();
  }

  stop() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  _animate() {
    this._animFrame = requestAnimationFrame(() => this._animate());
    this._update();
    this._render();
  }

  _update() {
    if (!this.analyser || !this.dataArray) {
      this._smoothedLevel *= 0.9;
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate RMS level from frequency data
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 255;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);

    // Smooth the level
    const smoothing = 0.7;
    this._smoothedLevel = this._smoothedLevel * smoothing + rms * (1 - smoothing);

    // Peak hold with decay
    if (this._smoothedLevel > this._peakLevel) {
      this._peakLevel = this._smoothedLevel;
      this._peakDecay = 0;
    } else {
      this._peakDecay++;
      if (this._peakDecay > 30) {
        this._peakLevel *= 0.97;
      }
    }
  }

  _render() {
    switch (this.style) {
      case 'analog':
        this._renderAnalog();
        break;
      case 'lcd':
        this._renderLCD();
        break;
      case 'led':
        this._renderLED();
        break;
    }
  }

  _renderAnalog() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // Meter face
    const centerX = w / 2;
    const centerY = h * 0.85;
    const radius = Math.min(w, h) * 0.7;

    // Arc background
    const startAngle = Math.PI * 1.2;
    const endAngle = Math.PI * 1.8;

    // Scale markings
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    const numMarks = 10;
    for (let i = 0; i <= numMarks; i++) {
      const frac = i / numMarks;
      const angle = startAngle + frac * (endAngle - startAngle);
      const innerR = radius * 0.75;
      const outerR = radius * (i % 5 === 0 ? 0.9 : 0.85);

      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * innerR, centerY + Math.sin(angle) * innerR);
      ctx.lineTo(centerX + Math.cos(angle) * outerR, centerY + Math.sin(angle) * outerR);
      ctx.stroke();
    }

    // Color zones on arc
    // Green zone (0 - 70%)
    ctx.strokeStyle = 'rgba(29, 185, 84, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.82, startAngle, startAngle + 0.7 * (endAngle - startAngle));
    ctx.stroke();

    // Yellow zone (70 - 85%)
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius * 0.82,
      startAngle + 0.7 * (endAngle - startAngle),
      startAngle + 0.85 * (endAngle - startAngle)
    );
    ctx.stroke();

    // Red zone (85 - 100%)
    ctx.strokeStyle = 'rgba(229, 57, 53, 0.5)';
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius * 0.82,
      startAngle + 0.85 * (endAngle - startAngle),
      endAngle
    );
    ctx.stroke();

    // VU label
    ctx.fillStyle = '#888';
    ctx.font = `${Math.max(8, w * 0.08)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('VU', centerX, centerY - radius * 0.25);

    // Needle
    const level = Math.min(1, this._smoothedLevel * 1.5);
    const needleAngle = startAngle + level * (endAngle - startAngle);
    const needleLen = radius * 0.88;

    // Needle shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX + 1, centerY + 1);
    ctx.lineTo(
      centerX + Math.cos(needleAngle) * needleLen + 1,
      centerY + Math.sin(needleAngle) * needleLen + 1
    );
    ctx.stroke();

    // Needle
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(needleAngle) * needleLen,
      centerY + Math.sin(needleAngle) * needleLen
    );
    ctx.stroke();

    // Needle pivot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _renderLCD() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    if (!this.analyser || !this.dataArray) return;

    // Get frequency data for bar display
    this.analyser.getByteFrequencyData(this.dataArray);

    const numBars = 16;
    const barGap = 2;
    const barWidth = (w - barGap * (numBars + 1)) / numBars;
    const maxBarHeight = h - 8;

    for (let i = 0; i < numBars; i++) {
      // Sample frequency bins
      const binIndex = Math.floor((i / numBars) * this.dataArray.length);
      const value = this.dataArray[binIndex] / 255;

      const barHeight = value * maxBarHeight;
      const x = barGap + i * (barWidth + barGap);
      const y = h - 4 - barHeight;

      // LCD-style gradient
      const gradient = ctx.createLinearGradient(0, h - 4, 0, 4);
      gradient.addColorStop(0, '#1db954');
      gradient.addColorStop(0.6, '#b8e986');
      gradient.addColorStop(0.85, '#ffd700');
      gradient.addColorStop(1, '#e53935');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // LCD segment lines
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 1;
      const segHeight = 3;
      for (let sy = h - 4; sy > y; sy -= segHeight + 1) {
        ctx.beginPath();
        ctx.moveTo(x, sy);
        ctx.lineTo(x + barWidth, sy);
        ctx.stroke();
      }
    }
  }

  _renderLED() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    const level = Math.min(1, this._smoothedLevel * 1.5);
    const peakLevel = Math.min(1, this._peakLevel * 1.5);

    const numLeds = 12;
    const ledGap = 2;
    const ledHeight = (h - ledGap * (numLeds + 1)) / numLeds;
    const ledWidth = w - 16;
    const x = 8;

    for (let i = 0; i < numLeds; i++) {
      const ledFrac = (i + 1) / numLeds;
      const y = h - ledGap - (i + 1) * (ledHeight + ledGap);
      const isLit = level >= ledFrac;
      const isPeak = Math.abs(peakLevel - ledFrac) < 1 / numLeds;

      let color;
      if (ledFrac <= 0.6) {
        color = isLit || isPeak ? '#1db954' : '#0d3d1e';
      } else if (ledFrac <= 0.85) {
        color = isLit || isPeak ? '#ffd700' : '#3d3500';
      } else {
        color = isLit || isPeak ? '#e53935' : '#3d0d0d';
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, ledWidth, ledHeight, 2);
      ctx.fill();

      // Glow effect for lit LEDs
      if (isLit) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fillRect(x, y, ledWidth, ledHeight);
        ctx.shadowBlur = 0;
      }
    }
  }

  destroy() {
    this.stop();
  }
}
