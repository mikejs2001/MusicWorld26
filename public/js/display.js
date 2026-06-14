let currentSong = null;
let lyrics = [];
let lastKnownTime = 0;
let lastKnownAt = performance.now();
let isPlaying = false;
let totalDuration = 0;
let lastLineIndex = -2; // force initial render
let syncOffset = 0;    // seconds; positive = lyrics fire earlier

// ── Sync: BroadcastChannel (same browser) + WebSocket (cross-device) ──

const channel = new BroadcastChannel('karaoke');
channel.onmessage = (e) => handleMessage(e.data);

function connectWS() {
  // Only attempt WebSocket when served over http (not file://)
  if (location.protocol === 'file:') return;
  try {
    const ws = new WebSocket(`ws://${location.host}`);
    ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
    ws.onclose   = () => setTimeout(connectWS, 3000);
    ws.onerror   = () => ws.close();
  } catch (_) {}
}

function handleMessage(msg) {
  hideCastHint();
  switch (msg.type) {
    case 'song':
      currentSong   = { title: msg.title || '', artist: msg.artist || '' };
      lyrics        = msg.lyrics || [];
      totalDuration = msg.duration || 0;
      lastKnownTime = 0;
      lastKnownAt   = performance.now();
      isPlaying     = true;
      lastLineIndex = -2;
      updateSongInfo();
      setStatus('● LIVE', '#4ade80');
      break;
    case 'time':
      lastKnownTime = msg.t;
      lastKnownAt   = performance.now();
      if (msg.duration) totalDuration = msg.duration;
      isPlaying = true;
      break;
    case 'pause':
      if (msg.t !== undefined) lastKnownTime = msg.t;
      isPlaying = false;
      break;
    case 'resume':
      if (msg.t !== undefined) { lastKnownTime = msg.t; lastKnownAt = performance.now(); }
      isPlaying = true;
      break;
    case 'offset':
      syncOffset = msg.value || 0;
      break;
    case 'clear':
      currentSong = null;
      lyrics = [];
      showWaiting();
      break;
  }
}

// ── Time interpolation ──────────────────────────────────────

function getTime() {
  const base = lastKnownTime + (isPlaying ? (performance.now() - lastKnownAt) / 1000 : 0);
  return base + syncOffset;
}

function findLineIndex(t) {
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= t) idx = i;
    else break;
  }
  return idx;
}

// ── Render loop (60 fps) ────────────────────────────────────

function render() {
  requestAnimationFrame(render);
  if (!currentSong) return;

  const t   = getTime();
  const idx = findLineIndex(t);

  if (totalDuration > 0) {
    document.getElementById('progress-fill').style.width =
      Math.min(100, (t / totalDuration) * 100) + '%';
  }

  const currLine = idx >= 0              ? lyrics[idx]     : null;
  const prevLine = idx > 0              ? lyrics[idx - 1] : null;
  const nextLine = idx < lyrics.length - 1 ? lyrics[idx + 1] : null;

  if (idx !== lastLineIndex) {
    lastLineIndex = idx;
    setText('lyric-prev', prevLine ? prevLine.text : '');
    setText('lyric-next', nextLine ? nextLine.text : '');
    buildCurrentLine(currLine);
  }

  animateCurrentLine(currLine, nextLine, t);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}

function buildCurrentLine(line) {
  const container = document.getElementById('lyric-current-container');
  if (!line || !line.text) { container.innerHTML = ''; container.dataset.mode = ''; return; }

  if (line.words && line.words.length > 0) {
    container.dataset.mode = 'words';
    container.innerHTML = line.words
      .map(w => `<span class="word" data-time="${w.time}">${esc(w.text)}</span>`)
      .join(' ');
  } else {
    container.dataset.mode = 'fill';
    const t = esc(line.text);
    container.innerHTML =
      `<span class="fill-base">${t}<span class="fill-fg" id="fill-fg">${t}</span></span>`;
  }
}

function animateCurrentLine(line, nextLine, t) {
  const container = document.getElementById('lyric-current-container');
  if (!line || !container.dataset.mode) return;

  if (container.dataset.mode === 'words') {
    container.querySelectorAll('.word').forEach(span => {
      span.classList.toggle('sung', t >= parseFloat(span.dataset.time));
    });
  } else {
    const fg = document.getElementById('fill-fg');
    if (!fg) return;
    const start = line.time;
    const end   = nextLine ? nextLine.time : line.time + 5;
    const pct   = Math.max(0, Math.min(100, ((t - start) / (end - start)) * 100));
    fg.style.width = pct + '%';
  }
}

// ── UI helpers ──────────────────────────────────────────────

function updateSongInfo() {
  if (!currentSong) return;
  const parts = [currentSong.artist, currentSong.title].filter(Boolean);
  document.getElementById('song-info').textContent = parts.join(' — ');
}

function showWaiting() {
  document.getElementById('song-info').textContent = 'Waiting for DJ…';
  ['lyric-prev', 'lyric-next'].forEach(id => setText(id, ''));
  const c = document.getElementById('lyric-current-container');
  c.innerHTML = ''; c.dataset.mode = '';
  document.getElementById('progress-fill').style.width = '0%';
  setStatus('○ Waiting…', '#888');
}

function setStatus(text, color) {
  const el = document.getElementById('status');
  if (el) { el.textContent = text; el.style.color = color; }
}

function hideCastHint() {
  const el = document.getElementById('cast-hint');
  if (el) el.style.display = 'none';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Init ────────────────────────────────────────────────────
connectWS();
requestAnimationFrame(render);
// Ask DJ console to re-send current song state (handles opening display tab late)
channel.postMessage({ type: 'hello' });
