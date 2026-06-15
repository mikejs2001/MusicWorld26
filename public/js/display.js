let currentSong = null;
let lyrics = [];
let lastKnownTime = 0;
let lastKnownAt = performance.now();
let isPlaying = false;
let totalDuration = 0;
let lastLineIndex = -2;
let syncOffset = 0;
let displayState = 'waiting'; // 'waiting' | 'cued' | 'countdown' | 'playing'
let ws = null;
let _syncHideTimer = null;

// ── Sync: BroadcastChannel (same browser) + WebSocket (cross-device) ──

const channel = new BroadcastChannel('karaoke');
channel.onmessage = (e) => handleMessage(e.data);

function connectWS() {
  if (location.protocol === 'file:') return;
  try {
    ws = new WebSocket(`ws://${location.host}`);
    ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
    ws.onclose   = () => { ws = null; setTimeout(connectWS, 3000); };
    ws.onerror   = () => ws.close();
  } catch (_) {}
}

function sendToDJ(msg) {
  channel.postMessage(msg);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function handleMessage(msg) {
  hideCastHint();
  switch (msg.type) {
    case 'cue':
      currentSong  = { title: msg.title || '', artist: msg.artist || '' };
      lyrics       = [];
      totalDuration = 0;
      displayState = 'cued';
      updateSongInfo();
      showCued();
      setStatus('○ Ready', '#ffd700');
      break;
    case 'countdown':
      displayState = 'countdown';
      showCountdown(msg.n);
      break;
    case 'song':
      currentSong   = { title: msg.title || '', artist: msg.artist || '' };
      lyrics        = msg.lyrics || [];
      totalDuration = msg.duration || 0;
      lastKnownTime = 0;
      lastKnownAt   = performance.now();
      isPlaying     = true;
      lastLineIndex = -2;
      displayState  = 'playing';
      updateSongInfo();
      clearCurrentLine();
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
      updateSyncPanel();
      break;
    case 'clear':
      currentSong = null;
      lyrics = [];
      displayState = 'waiting';
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
  if (displayState !== 'playing') return;

  const t   = getTime();
  const idx = findLineIndex(t);

  if (totalDuration > 0) {
    document.getElementById('progress-fill').style.width =
      Math.min(100, (t / totalDuration) * 100) + '%';
  }

  const currLine = idx >= 0               ? lyrics[idx]     : null;
  const prevLine = idx > 0               ? lyrics[idx - 1] : null;
  const nextLine = idx < lyrics.length - 1 ? lyrics[idx + 1] : null;

  if (idx !== lastLineIndex) {
    lastLineIndex = idx;
    setText('lyric-prev', prevLine ? prevLine.text : '');
    setText('lyric-next', nextLine ? nextLine.text : '');
    buildCurrentLine(currLine, nextLine);
  }

  animateCurrentLine(currLine, nextLine, t);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}

function clearCurrentLine() {
  const c = document.getElementById('lyric-current-container');
  c.innerHTML = '';
  c.dataset.mode = '';
  setText('lyric-prev', '');
  setText('lyric-next', '');
}

function buildCurrentLine(line, nextLine) {
  const container = document.getElementById('lyric-current-container');
  if (!line || !line.text) { container.innerHTML = ''; container.dataset.mode = ''; return; }

  container.dataset.mode = 'words';
  if (line.words && line.words.length > 0) {
    container.innerHTML = line.words
      .map(w => `<span class="word" data-time="${w.time}">${esc(w.text)}</span>`)
      .join(' ');
  } else {
    // No word timestamps — distribute timing across words by character length
    const rawEnd = nextLine ? nextLine.time : line.time + 5;
    const end = Math.min(rawEnd, line.time + 7);
    const words = line.text.split(/\s+/).filter(Boolean);
    const totalChars = words.reduce((s, w) => s + w.length, 0) || 1;
    let cumTime = line.time;
    container.innerHTML = words.map(w => {
      const wt = cumTime;
      cumTime += (w.length / totalChars) * (end - line.time);
      return `<span class="word" data-time="${wt.toFixed(3)}">${esc(w)}</span>`;
    }).join(' ');
  }
}

function animateCurrentLine(line, nextLine, t) {
  const container = document.getElementById('lyric-current-container');
  if (!line || container.dataset.mode !== 'words') return;
  container.querySelectorAll('.word').forEach(span => {
    span.classList.toggle('sung', t >= parseFloat(span.dataset.time));
  });
}

// ── Cued screen ─────────────────────────────────────────────

function showCued() {
  clearCurrentLine();
  document.getElementById('progress-fill').style.width = '0%';
  const c = document.getElementById('lyric-current-container');
  c.innerHTML = `<button class="start-btn" id="start-btn">▶ TAP TO START</button>`;
  document.getElementById('start-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    sendToDJ({ type: 'start' });
  });
}

// ── Countdown screen ────────────────────────────────────────

function showCountdown(n) {
  const c = document.getElementById('lyric-current-container');
  c.dataset.mode = '';
  setText('lyric-prev', '');
  setText('lyric-next', '');
  if (n > 0) {
    c.innerHTML = `<span class="countdown-num">${n}</span>`;
    setStatus('● Starting…', '#4ade80');
  } else {
    c.innerHTML = '';
    // 'song' message arrives from DJ immediately after this to start lyric display
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
  clearCurrentLine();
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

// ── Sync panel on display ───────────────────────────────────

function dispAdjSync(delta) {
  syncOffset = Math.round((syncOffset + delta) * 10) / 10;
  updateSyncPanel();
  sendToDJ({ type: 'offset', value: syncOffset });
  _armSyncHide();
}

function dispResetSync() {
  syncOffset = 0;
  updateSyncPanel();
  sendToDJ({ type: 'offset', value: 0 });
  _armSyncHide();
}

function updateSyncPanel() {
  const el = document.getElementById('sp-val');
  if (el) el.textContent = (syncOffset >= 0 ? '+' : '') + syncOffset.toFixed(1) + 's';
}

function _armSyncHide() {
  clearTimeout(_syncHideTimer);
  _syncHideTimer = setTimeout(() => {
    document.getElementById('sync-panel')?.classList.add('hidden');
  }, 5000);
}

// Tap anywhere on screen to show sync panel (ignore taps on interactive elements)
document.body.addEventListener('click', (e) => {
  if (e.target.closest('#start-btn, #sync-panel')) return;
  const panel = document.getElementById('sync-panel');
  const nowHidden = panel.classList.toggle('hidden');
  if (!nowHidden) _armSyncHide();
  else clearTimeout(_syncHideTimer);
});

// ── Init ────────────────────────────────────────────────────
connectWS();
requestAnimationFrame(render);
channel.postMessage({ type: 'hello' });
