// ── State ──────────────────────────────────────────────────
const queue = [];
let currentIndex = -1;
let lyrics = [];
let isPlaying = false;
let source = null; // 'local' | 'youtube'
let ytPlayer = null;
let ytApiReady = false;
let pendingYTItem = null;
let tickInterval = null;

// ── DOM shortcuts ───────────────────────────────────────────
const audioEl  = document.getElementById('audio-player');
const seekBar  = document.getElementById('seek-bar');
const timeCur  = document.getElementById('time-current');
const timeTot  = document.getElementById('time-total');
const btnPlay  = document.getElementById('btn-play');
const npArtist = document.getElementById('np-artist');
const npTitle  = document.getElementById('np-title');
const queueList = document.getElementById('queue-list');

// ── Sync: BroadcastChannel (same browser) + WebSocket (cross-device) ──
const channel = new BroadcastChannel('karaoke');
let displayTabOpen = false;
let ws = null;

function openDisplay() {
  window.open('/display.html', 'karaoke-display');
  displayTabOpen = true;
  setSyncStatus('open');
}

function connectWS() {
  if (location.protocol === 'file:') return;
  try {
    ws = new WebSocket(`ws://${location.host}`);
    ws.onclose = () => setTimeout(connectWS, 3000);
    ws.onerror = () => ws.close();
  } catch (_) {}
}

function send(msg) {
  // BroadcastChannel reaches any display tab in this browser (Chromecast use-case)
  channel.postMessage(msg);
  // WebSocket reaches display on a separate device
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function setSyncStatus(state) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  if (state === 'open') { el.textContent = '● Display open'; el.style.color = '#4ade80'; }
}

// ── Queue ───────────────────────────────────────────────────
function addToQueue(item) {
  queue.push(item);
  renderQueue();
  if (currentIndex === -1) playSong(0);
}

function renderQueue() {
  if (queue.length === 0) {
    queueList.innerHTML = '<p class="empty-msg">Queue is empty — add some songs!</p>';
    return;
  }
  queueList.innerHTML = queue.map((item, i) => `
    <div class="queue-item ${i === currentIndex ? 'playing' : ''}" data-i="${i}">
      <span class="qi-num">${i === currentIndex ? '♪' : i + 1}</span>
      <span class="qi-info">
        <span class="qi-title">${esc(item.title || 'Unknown')}</span>
        ${item.artist ? `<span class="qi-artist">${esc(item.artist)}</span>` : ''}
      </span>
      <span class="qi-type">${item.type === 'youtube' ? 'YT' : '♫'}</span>
      <button class="qi-del" onclick="removeFromQueue(${i})">×</button>
    </div>`).join('');

  queueList.querySelectorAll('.queue-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.classList.contains('qi-del')) return;
      playSong(parseInt(el.dataset.i));
    });
  });
}

function removeFromQueue(idx) {
  if (idx === currentIndex) nextSong();
  queue.splice(idx, 1);
  if (currentIndex > idx) currentIndex--;
  renderQueue();
}

// ── Playback ────────────────────────────────────────────────
async function playSong(idx) {
  if (idx < 0 || idx >= queue.length) return;
  currentIndex = idx;
  const item = queue[idx];

  stopAll();

  npArtist.textContent = item.artist || '';
  npTitle.textContent  = item.title  || 'Loading…';
  btnPlay.textContent  = '⏸';
  renderQueue();

  if (item.type === 'youtube') playYouTube(item);
  else await playLocal(item);
}

function stopAll() {
  clearInterval(tickInterval);
  audioEl.pause();
  audioEl.removeAttribute('src');
  if (ytPlayer) { try { ytPlayer.stopVideo(); } catch (_) {} }
  isPlaying = false;
}

async function playLocal(item) {
  source = 'local';
  document.getElementById('yt-player-container').hidden = true;

  audioEl.src = item.url || URL.createObjectURL(item.file);
  audioEl.volume = +document.getElementById('volume-bar').value;
  await audioEl.play().catch(() => {});
  isPlaying = true;

  const dur = audioEl.duration || item.duration || 0;
  fetchAndSendLyrics(item.title, item.artist, dur);
  startTick();
}

function playYouTube(item) {
  source = 'youtube';
  document.getElementById('yt-player-container').hidden = false;

  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    ytPlayer.loadVideoById(item.videoId);
  } else if (ytApiReady) {
    createYTPlayer(item);
  } else {
    pendingYTItem = item;
  }
}

function createYTPlayer(item) {
  ytPlayer = new YT.Player('yt-player', {
    height: '140', width: '248',
    videoId: item.videoId,
    playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady(e) {
        e.target.playVideo();
        isPlaying = true;
        const dur = e.target.getDuration();
        fetchAndSendLyrics(item.title, item.artist, dur);
        startTick();
      },
      onStateChange(e) {
        if (e.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
          send({ type: 'resume', t: e.target.getCurrentTime() });
        } else if (e.data === YT.PlayerState.PAUSED) {
          isPlaying = false;
          send({ type: 'pause', t: e.target.getCurrentTime() });
        } else if (e.data === YT.PlayerState.ENDED) {
          nextSong();
        }
        btnPlay.textContent = isPlaying ? '⏸' : '▶';
      }
    }
  });
}

window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  if (pendingYTItem) { createYTPlayer(pendingYTItem); pendingYTItem = null; }
};

// ── Tick (time sync to display) ─────────────────────────────
function startTick() {
  clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    if (!isPlaying) return;
    const t   = getTime();
    const dur = getDur();
    send({ type: 'time', t, duration: dur });
    updateSeekUI(t, dur);
    updateLyricsPreview(t);
  }, 200);
}

function getTime() {
  if (source === 'local') return audioEl.currentTime;
  if (source === 'youtube' && ytPlayer) { try { return ytPlayer.getCurrentTime(); } catch (_) {} }
  return 0;
}

function getDur() {
  if (source === 'local') return audioEl.duration || 0;
  if (source === 'youtube' && ytPlayer) { try { return ytPlayer.getDuration(); } catch (_) {} }
  return 0;
}

function updateSeekUI(t, dur) {
  timeCur.textContent = fmt(t);
  timeTot.textContent = fmt(dur);
  if (dur > 0) seekBar.value = (t / dur) * 100;
}

function updateLyricsPreview(t) {
  if (!lyrics.length) return;
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= t) idx = i; else break;
  }
  document.getElementById('lp-prev').textContent    = idx > 0               ? lyrics[idx-1].text : '';
  document.getElementById('lp-current').textContent = idx >= 0              ? lyrics[idx].text   : '';
  document.getElementById('lp-next').textContent    = idx < lyrics.length-1 ? lyrics[idx+1].text : '';
}

// ── Lyrics fetch ────────────────────────────────────────────
async function fetchAndSendLyrics(title, artist, dur) {
  const result = await fetchLyrics(title, artist, dur);
  lyrics = result;
  send({ type: 'song', title, artist, lyrics: result, duration: dur || 0 });
}

async function fetchLyrics(title, artist, dur) {
  try {
    // 1. Exact match
    const p = new URLSearchParams({ track_name: title });
    if (artist) p.set('artist_name', artist);
    if (dur)    p.set('duration', Math.round(dur));
    let r = await fetch(`/api/lyrics?${p}`);

    // 2. Without duration
    if (!r.ok && dur) {
      const p2 = new URLSearchParams({ track_name: title });
      if (artist) p2.set('artist_name', artist);
      r = await fetch(`/api/lyrics?${p2}`);
    }

    // 3. Search fallback
    if (!r.ok) {
      const q = [artist, title].filter(Boolean).join(' ');
      r = await fetch(`/api/lyrics/search?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        const results = await r.json();
        if (results.length) {
          const best = results[0];
          return best.syncedLyrics ? parseLRC(best.syncedLyrics) : plainLines(best.plainLyrics);
        }
      }
      return [];
    }

    const data = await r.json();
    if (data.syncedLyrics) return parseLRC(data.syncedLyrics);
    if (data.plainLyrics)  return plainLines(data.plainLyrics);
  } catch (e) {
    console.warn('Lyrics fetch failed:', e);
  }
  return [];
}

function plainLines(text) {
  if (!text) return [];
  return text.split('\n').filter(l => l.trim())
    .map((line, i) => ({ time: i * 4, text: line.trim(), words: [] }));
}

// ── Controls ────────────────────────────────────────────────
btnPlay.addEventListener('click', () => {
  if (source === 'local') {
    if (isPlaying) { audioEl.pause(); }
    else           { audioEl.play(); }
  } else if (source === 'youtube' && ytPlayer) {
    const s = ytPlayer.getPlayerState();
    if (s === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  }
});

document.getElementById('btn-next').addEventListener('click', nextSong);
document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentIndex > 0) playSong(currentIndex - 1);
});

function nextSong() {
  if (currentIndex < queue.length - 1) playSong(currentIndex + 1);
  else { stopAll(); send({ type: 'clear' }); npTitle.textContent = 'Queue finished'; }
}

audioEl.addEventListener('ended',  nextSong);
audioEl.addEventListener('pause',  () => { isPlaying = false; btnPlay.textContent = '▶'; send({ type: 'pause',  t: audioEl.currentTime }); });
audioEl.addEventListener('play',   () => { isPlaying = true;  btnPlay.textContent = '⏸'; send({ type: 'resume', t: audioEl.currentTime }); });

seekBar.addEventListener('input', () => {
  const dur = getDur();
  const t   = (seekBar.value / 100) * dur;
  if (source === 'local') audioEl.currentTime = t;
  else if (source === 'youtube' && ytPlayer) ytPlayer.seekTo(t, true);
  send({ type: 'time', t });
});

document.getElementById('volume-bar').addEventListener('input', e => {
  audioEl.volume = +e.target.value;
});

// ── File picker ─────────────────────────────────────────────
document.getElementById('file-input').addEventListener('change', e => {
  Array.from(e.target.files).forEach(addLocalFile);
  e.target.value = '';
});

function addLocalFile(file) {
  const { artist, title } = parseFilename(file.name);
  const url = URL.createObjectURL(file);
  // Peek at duration
  const tmp = new Audio(url);
  tmp.addEventListener('loadedmetadata', () => {
    const item = queue.find(q => q.file === file);
    if (item) item.duration = tmp.duration;
  }, { once: true });
  addToQueue({ type: 'local', file, url, title, artist, duration: 0 });
}

// ── YouTube add ─────────────────────────────────────────────
document.getElementById('btn-add-yt').addEventListener('click', addYouTube);
document.getElementById('yt-url').addEventListener('keydown', e => {
  if (e.key === 'Enter') addYouTube();
});

async function addYouTube() {
  const inp = document.getElementById('yt-url');
  const url = inp.value.trim();
  if (!url) return;
  const videoId = extractYTId(url);
  if (!videoId) { showMsg('add-msg', 'Invalid YouTube URL'); return; }

  const btn = document.getElementById('btn-add-yt');
  btn.disabled = true; btn.textContent = 'Loading…';
  try {
    const r = await fetch(`/api/ytinfo?url=${encodeURIComponent(url)}`);
    const info = r.ok ? await r.json() : {};
    const { artist, title } = parseYTTitle(info.title || videoId);
    addToQueue({ type: 'youtube', videoId, title, artist, url });
    inp.value = '';
  } finally {
    btn.disabled = false; btn.textContent = 'Add to Queue';
  }
}

// ── Music library (server ./music folder) ───────────────────
async function loadLibrary() {
  const libEl = document.getElementById('music-library');
  try {
    const files = await fetch('/api/music').then(r => r.json());
    if (!files.length) {
      libEl.innerHTML = '<p class="empty-msg">Drop MP3s into the ./music folder</p>';
      return;
    }
    libEl.innerHTML = files.map(f =>
      `<div class="lib-item" data-url="${esc(f.url)}" data-name="${esc(f.name)}">♫ ${esc(f.name)}</div>`
    ).join('');
    libEl.querySelectorAll('.lib-item').forEach(el => {
      el.addEventListener('click', () => {
        const { artist, title } = parseFilename(el.dataset.name);
        addToQueue({ type: 'local', file: null, url: el.dataset.url, title, artist, duration: 0 });
      });
    });
  } catch (e) {
    libEl.innerHTML = '<p class="empty-msg">Could not load library</p>';
  }
}

// ── Helpers ─────────────────────────────────────────────────
function extractYTId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function parseYTTitle(title) {
  const clean = title
    .replace(/\s*\([^)]*(?:official|video|audio|lyrics|hd|4k|mv|live|music)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(?:official|video|audio|lyrics|hd|4k)[^\]]*\]/gi, '')
    .trim();
  const m = clean.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: clean || title };
}

function parseFilename(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]+/, '');
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: base };
}

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showMsg(id, text) {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; setTimeout(() => el.textContent = '', 3000); }
}

// ── Init ─────────────────────────────────────────────────────
connectWS();
loadLibrary();
renderQueue();
