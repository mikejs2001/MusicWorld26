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
  channel.postMessage(msg);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// When display tab opens late it sends 'hello' — reply with current song state
channel.onmessage = (e) => {
  if (e.data.type === 'hello' && currentSong) {
    channel.postMessage({ type: 'song', ...currentSong, lyrics, duration: getDur() });
    // Also send current time so display doesn't start from 0
    channel.postMessage({ type: 'time', t: getTime(), duration: getDur() });
    if (!isPlaying) channel.postMessage({ type: 'pause', t: getTime() });
  }
};

let currentSong = null; // track {title, artist} for re-broadcast

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
  setLyricsStatus('searching');
  // Pre-fill the manual edit form
  document.getElementById('edit-artist').value = artist || '';
  document.getElementById('edit-title').value  = title  || '';

  const result = await fetchLyrics(title, artist, dur);
  lyrics = result;
  currentSong = { title, artist };
  send({ type: 'song', title, artist, lyrics: result, duration: dur || 0 });

  if (result.length) {
    setLyricsStatus('found');
  } else {
    setLyricsStatus('notfound');
  }
}

function setLyricsStatus(state) {
  const el = document.getElementById('lyrics-status');
  const editEl = document.getElementById('lyrics-edit');
  if (!el) return;
  if (state === 'searching') {
    el.textContent = '🔍 Finding lyrics…';
    el.className = 'lyrics-status searching';
    editEl.hidden = true;
  } else if (state === 'found') {
    el.textContent = '✓ Lyrics found';
    el.className = 'lyrics-status found';
    editEl.hidden = true;
  } else {
    el.textContent = '✗ No lyrics — edit title/artist below';
    el.className = 'lyrics-status notfound';
    editEl.hidden = false;
  }
}

document.getElementById('btn-find-lyrics').addEventListener('click', async () => {
  const artist = document.getElementById('edit-artist').value.trim();
  const title  = document.getElementById('edit-title').value.trim();
  if (!title) return;
  await fetchAndSendLyrics(title, artist, getDur());
});

async function fetchLyrics(title, artist, dur) {
  try {
    // 1. Exact match with duration
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

// ── Storage browser ─────────────────────────────────────────
let browseFiles = []; // files in currently-browsed folder

// Shortcut buttons map to Termux ~/storage/* symlinks (created by termux-setup-storage)
const SHORTCUTS = {
  music:     '~/storage/music',
  downloads: '~/storage/downloads',
  home:      '~',
};

document.querySelectorAll('.browse-sc').forEach(btn => {
  btn.addEventListener('click', () => browseDir(SHORTCUTS[btn.dataset.path]));
});

async function browseDir(pathArg) {
  const listEl = document.getElementById('browse-list');
  const pathEl = document.getElementById('browse-path');
  listEl.innerHTML = '<p class="empty-msg">Loading…</p>';

  try {
    const r = await fetch(`/api/browse?path=${encodeURIComponent(pathArg || '')}`);
    if (!r.ok) { listEl.innerHTML = `<p class="empty-msg">Can't read folder</p>`; return; }
    const data = await r.json();
    browseFiles = data.files || [];

    // Show shortened path
    const home = data.current.replace(/^\/data\/data\/com\.termux\/files\/home/, '~');
    pathEl.textContent = home;

    let html = '';

    if (data.parent) {
      html += `<div class="bi bi-dir" data-path="${esc(data.parent)}">📁 ..</div>`;
    }
    for (const d of data.dirs) {
      // Each folder: click name = navigate, click ＋ = add all tracks inside
      html += `<div class="bi bi-dir-row">
        <span class="bi-dir-name" data-path="${esc(d.path)}">📁 ${esc(d.name)}</span>
        <button class="bi-dir-add" data-path="${esc(d.path)}" title="Add all tracks in this folder">＋</button>
      </div>`;
    }
    if (data.files.length) {
      html += `<div class="bi bi-add-all">＋ Add all ${data.files.length} track${data.files.length > 1 ? 's' : ''} in this folder</div>`;
      for (const f of data.files) {
        html += `<div class="bi bi-file" data-path="${esc(f.path)}" data-name="${esc(f.name)}">🎵 ${esc(f.name)}</div>`;
      }
    } else if (!data.dirs.length) {
      html = '<p class="empty-msg">No audio files here</p>';
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll('.bi-dir-name').forEach(el => {
      el.addEventListener('click', () => browseDir(el.dataset.path));
    });
    listEl.querySelectorAll('.bi-dir').forEach(el => {
      el.addEventListener('click', () => browseDir(el.dataset.path));
    });
    listEl.querySelectorAll('.bi-dir-add').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); addFolderToQueue(btn.dataset.path); });
    });
    listEl.querySelectorAll('.bi-file').forEach(el => {
      el.addEventListener('click', () => addStreamFile(el.dataset.path, el.dataset.name));
    });
    const addAllEl = listEl.querySelector('.bi-add-all');
    if (addAllEl) addAllEl.addEventListener('click', () => {
      browseFiles.forEach(f => addStreamFile(f.path, f.name));
    });
  } catch (e) {
    listEl.innerHTML = '<p class="empty-msg">Error reading folder</p>';
  }
}

function addStreamFile(filePath, fileName) {
  const { artist, title } = parseFilename(fileName);
  const url = `/api/stream?path=${encodeURIComponent(filePath)}`;
  addToQueue({ type: 'local', file: null, url, title, artist, duration: 0 });
}

async function addFolderToQueue(folderPath) {
  try {
    const r = await fetch(`/api/browse?path=${encodeURIComponent(folderPath)}`);
    if (!r.ok) return;
    const data = await r.json();
    data.files.forEach(f => addStreamFile(f.path, f.name));
  } catch (_) {}
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
