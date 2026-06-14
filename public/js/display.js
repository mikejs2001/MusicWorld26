let currentSong = null;
let lyrics = [];
let lastKnownTime = 0;
let lastKnownAt = performance.now();
let isPlaying = false;
let totalDuration = 0;
let lastLineIndex = -2; // force initial render

function connect() {
  const ws = new WebSocket(`ws://${location.host}`);

  ws.onopen = () => setStatus('● LIVE', '#4ade80');
  ws.onclose = () => { setStatus('○ Reconnecting…', '#f59e0b'); setTimeout(connect, 2000); };
  ws.onerror = () => ws.close();

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'song':
        currentSong = { title: msg.title || '', artist: msg.artist || '' };
        lyrics = msg.lyrics || [];
        totalDuration = msg.duration || 0;
        lastKnownTime = 0;
        lastKnownAt = performance.now();
        isPlaying = true;
        lastLineIndex = -2;
        updateSongInfo();
        break;
      case 'time':
        lastKnownTime = msg.t;
        lastKnownAt = performance.now();
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
      case 'clear':
        currentSong = null;
        lyrics = [];
        showWaiting();
        break;
    }
  };
}

function getTime() {
  if (!isPlaying) return lastKnownTime;
  return lastKnownTime + (performance.now() - lastKnownAt) / 1000;
}

function findLineIndex(t) {
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= t) idx = i;
    else break;
  }
  return idx;
}

// Render loop — runs at 60 fps
function render() {
  requestAnimationFrame(render);
  if (!currentSong) return;

  const t = getTime();
  const idx = findLineIndex(t);

  // Update progress bar
  if (totalDuration > 0) {
    document.getElementById('progress-fill').style.width =
      Math.min(100, (t / totalDuration) * 100) + '%';
  }

  const currLine = idx >= 0 ? lyrics[idx] : null;
  const prevLine = idx > 0 ? lyrics[idx - 1] : null;
  const nextLine = idx < lyrics.length - 1 ? lyrics[idx + 1] : null;

  // Update static lines only when they change
  if (idx !== lastLineIndex) {
    lastLineIndex = idx;
    setText('lyric-prev', prevLine ? prevLine.text : '');
    setText('lyric-next', nextLine ? nextLine.text : '');
    buildCurrentLine(currLine);
  }

  // Update fill / word highlights every frame
  animateCurrentLine(currLine, nextLine, t);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el.textContent !== text) el.textContent = text;
}

function buildCurrentLine(line) {
  const container = document.getElementById('lyric-current-container');
  if (!line || !line.text) { container.innerHTML = ''; container.dataset.mode = ''; return; }

  if (line.words && line.words.length > 0) {
    container.dataset.mode = 'words';
    container.innerHTML = line.words
      .map((w, i) => `<span class="word" data-time="${w.time}" data-i="${i}">${esc(w.text)}</span>`)
      .join(' '); // hair space between word spans
  } else {
    container.dataset.mode = 'fill';
    const t = esc(line.text);
    container.innerHTML = `<span class="fill-base" data-text="${t}">${t}<span class="fill-fg" id="fill-fg">${t}</span></span>`;
  }
}

function animateCurrentLine(line, nextLine, t) {
  const container = document.getElementById('lyric-current-container');
  if (!line || !container.dataset.mode) return;

  if (container.dataset.mode === 'words') {
    container.querySelectorAll('.word').forEach(span => {
      const wt = parseFloat(span.dataset.time);
      span.classList.toggle('sung', t >= wt);
    });
  } else {
    const fg = document.getElementById('fill-fg');
    if (!fg) return;
    const start = line.time;
    const end = nextLine ? nextLine.time : line.time + 5;
    const pct = Math.max(0, Math.min(100, ((t - start) / (end - start)) * 100));
    fg.style.width = pct + '%';
  }
}

function updateSongInfo() {
  if (!currentSong) return;
  const parts = [currentSong.artist, currentSong.title].filter(Boolean);
  document.getElementById('song-info').textContent = parts.join(' — ');
}

function showWaiting() {
  document.getElementById('song-info').textContent = 'Waiting for DJ…';
  ['lyric-prev', 'lyric-next'].forEach(id => setText(id, ''));
  const c = document.getElementById('lyric-current-container');
  c.innerHTML = '';
  c.dataset.mode = '';
  document.getElementById('progress-fill').style.width = '0%';
}

function setStatus(text, color) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.color = color;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

connect();
requestAnimationFrame(render);
