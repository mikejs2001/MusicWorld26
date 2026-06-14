const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|wma|3gp|3ga|amr|aiff|aif|ape|alac)$/i;

// ── State ────────────────────────────────────────────────────
const loading = []; // tracks being processed (right panel)
const queue   = []; // tracks ready to play   (left panel)
let currentIndex = -1;
let lyrics    = [];
let isPlaying = false;
let source    = null; // 'local' | 'youtube'
let ytPlayer  = null;
let ytApiReady  = false;
let pendingYTItem = null;
let tickInterval  = null;
let currentSong   = null;

// ── DOM shortcuts ─────────────────────────────────────────────
const audioEl   = document.getElementById('audio-player');
const seekBar   = document.getElementById('seek-bar');
const timeCur   = document.getElementById('time-current');
const timeTot   = document.getElementById('time-total');
const btnPlay   = document.getElementById('btn-play');
const npArtist  = document.getElementById('np-artist');
const npTitle   = document.getElementById('np-title');
const queueList = document.getElementById('queue-list');

// ── Sync: BroadcastChannel (same browser) + WebSocket (cross-device) ──
const channel = new BroadcastChannel('karaoke');
let ws = null;

function openDisplay() {
  window.open('/display.html', 'karaoke-display');
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

channel.onmessage = (e) => {
  if (e.data.type === 'hello' && currentSong) {
    channel.postMessage({ type: 'song', ...currentSong, lyrics, duration: getDur() });
    channel.postMessage({ type: 'time', t: getTime(), duration: getDur() });
    if (!isPlaying) channel.postMessage({ type: 'pause', t: getTime() });
  }
};

function setSyncStatus(state) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  if (state === 'open') { el.textContent = '● Display open'; el.style.color = '#4ade80'; }
}

// ── Processing pipeline (right panel) ────────────────────────

function addToLoading(item) {
  item.loadStatus = 'queued';
  loading.push(item);
  renderLoading();
  processItem(item);
}

async function processItem(item) {
  // Step 1: auto-discover artist if missing
  if (!item.artist) {
    item.loadStatus = 'finding-artist';
    renderLoading();
    const found = await discoverArtist(item.title);
    if (found) { item.artist = found; item.artistDiscovered = true; }
  }

  // Step 2: find exact synced lyrics (karaoke requires syncedLyrics)
  item.loadStatus = 'finding-lyrics';
  renderLoading();
  const result = await findExactLyrics(item.title, item.artist, item.duration || 0);

  if (result) {
    item.lyrics     = result.lines;
    item.lyricsMeta = result.meta;
    // Update artist/title to what LRCLIB confirmed, if it improved on what we had
    if (result.meta.artistName && !item.artist) item.artist = result.meta.artistName;
    item.loadStatus = 'ready';
    renderLoading();
    setTimeout(() => promoteToQueue(item), 700);
  } else {
    item.loadStatus = 'notfound';
    renderLoading();
  }
}

async function processItemLyricsOnly(item) {
  item.loadStatus = 'finding-lyrics';
  renderLoading();
  const result = await findExactLyrics(item.title, item.artist, item.duration || 0);
  if (result) {
    item.lyrics     = result.lines;
    item.lyricsMeta = result.meta;
    item.loadStatus = 'ready';
    renderLoading();
    setTimeout(() => promoteToQueue(item), 700);
  } else {
    item.loadStatus = 'notfound';
    renderLoading();
  }
}

// Search LRCLIB by title only and return the artist of the first matching result
async function discoverArtist(title) {
  try {
    const r = await fetch(`/api/lyrics/search?${new URLSearchParams({ track_name: title })}`);
    if (!r.ok) return null;
    const results = await r.json();
    const normTitle = normalize(title);
    const match = results.find(x => x.syncedLyrics && normalize(x.trackName) === normTitle);
    return match ? match.artistName : null;
  } catch (_) { return null; }
}

// Returns { lines, meta } or null — only accepts syncedLyrics (karaoke-grade)
async function findExactLyrics(title, artist, duration) {
  // 1. LRCLIB /get — their primary exact-lookup endpoint
  try {
    const p = new URLSearchParams({ track_name: title });
    if (artist)    p.set('artist_name', artist);
    if (duration > 0) p.set('duration', Math.round(duration));
    const r = await fetch(`/api/lyrics?${p}`);
    if (r.ok) {
      const data = await r.json();
      if (data.syncedLyrics) {
        return { lines: parseLRC(data.syncedLyrics), meta: { trackName: data.trackName, artistName: data.artistName } };
      }
    }
  } catch (_) {}

  // 2. /get without duration (in case duration caused a miss)
  if (duration > 0 && artist) {
    try {
      const r = await fetch(`/api/lyrics?${new URLSearchParams({ track_name: title, artist_name: artist })}`);
      if (r.ok) {
        const data = await r.json();
        if (data.syncedLyrics) {
          return { lines: parseLRC(data.syncedLyrics), meta: { trackName: data.trackName, artistName: data.artistName } };
        }
      }
    } catch (_) {}
  }

  // 3. Search — only accept if normalized title AND artist both match
  try {
    const p = new URLSearchParams({ track_name: title });
    if (artist) p.set('artist_name', artist);
    const r = await fetch(`/api/lyrics/search?${p}`);
    if (r.ok) {
      const results   = await r.json();
      const normTitle  = normalize(title);
      const normArtist = normalize(artist);
      const match = results.find(x =>
        x.syncedLyrics &&
        normalize(x.trackName) === normTitle &&
        (!artist || normalize(x.artistName) === normArtist)
      );
      if (match) {
        return { lines: parseLRC(match.syncedLyrics), meta: { trackName: match.trackName, artistName: match.artistName } };
      }
    }
  } catch (_) {}

  return null;
}

function normalize(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\[.*?\]/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function promoteToQueue(item) {
  const idx = loading.indexOf(item);
  if (idx !== -1) loading.splice(idx, 1);
  queue.push(item);
  renderLoading();
  renderQueue();
}

function removeFromLoading(idx) {
  loading.splice(idx, 1);
  renderLoading();
}

function toggleLoadEdit(idx) {
  if (!loading[idx]) return;
  loading[idx]._showEdit = !loading[idx]._showEdit;
  renderLoading();
}

function retryLoadItem(idx) {
  const item = loading[idx];
  if (!item) return;
  if (item._showEdit) {
    const row = document.querySelector(`.loading-item[data-li="${idx}"]`);
    if (row) {
      const a = row.querySelector('.li-input-artist');
      const t = row.querySelector('.li-input-title');
      if (a) item.artist = a.value.trim();
      if (t) item.title  = t.value.trim();
    }
    item._showEdit = false;
    item.artistDiscovered = false;
  }
  processItemLyricsOnly(item);
}

function renderLoading() {
  const el = document.getElementById('loading-list');
  if (!el) return;
  if (!loading.length) {
    el.innerHTML = '<p class="empty-msg">Nothing processing</p>';
    return;
  }
  el.innerHTML = loading.map((item, i) => {
    const st = item.loadStatus;
    let statusHtml;
    if (st === 'queued' || st === 'finding-artist' || st === 'finding-lyrics') {
      const msg = st === 'finding-artist' ? 'Finding artist…'
                : st === 'finding-lyrics' ? 'Finding lyrics…'
                : 'Waiting…';
      statusHtml = `<span class="li-spin">↻</span><span class="li-msg">${msg}</span>`;
    } else if (st === 'ready') {
      statusHtml = `<span class="li-ok">✓ Ready</span>`;
    } else {
      statusHtml = `<span class="li-fail">✗ No lyrics</span>`;
    }

    const editForm = item._showEdit ? `
      <div class="li-edit-form">
        <input class="li-input-artist url-input" placeholder="Artist" value="${esc(item.artist || '')}">
        <input class="li-input-title  url-input" placeholder="Title"  value="${esc(item.title  || '')}">
        <button class="btn btn-sm btn-primary" onclick="retryLoadItem(${i})">Try again</button>
      </div>` : '';

    return `<div class="loading-item ls-${st}" data-li="${i}">
      <div class="li-row">
        <div class="li-info">
          <div class="li-title-text">${esc(item.title || 'Unknown')}</div>
          ${item.artist ? `<div class="li-artist-text">${esc(item.artist)}${item.artistDiscovered ? '<em class="li-auto"> (auto)</em>' : ''}</div>` : ''}
        </div>
        <div class="li-status-col">${statusHtml}</div>
        ${st === 'notfound' ? `<button class="btn btn-sm li-edit-btn" onclick="toggleLoadEdit(${i})" title="Edit &amp; retry">✎</button>` : ''}
        <button class="btn btn-sm li-del-btn" onclick="removeFromLoading(${i})" title="Remove">×</button>
      </div>
      ${editForm}
    </div>`;
  }).join('');
}

// ── Ready queue (left panel) ──────────────────────────────────
function renderQueue() {
  if (!queue.length) {
    queueList.innerHTML = '<p class="empty-msg">Processed tracks appear here — click to play</p>';
    return;
  }
  queueList.innerHTML = queue.map((item, i) => `
    <div class="queue-item ${i === currentIndex ? 'playing' : ''}" data-i="${i}">
      <span class="qi-num">${i === currentIndex ? '♪' : i + 1}</span>
      <span class="qi-info">
        <span class="qi-title">${esc(item.title || 'Unknown')}</span>
        ${item.artist ? `<span class="qi-artist">${esc(item.artist)}</span>` : ''}
      </span>
      <button class="qi-del" onclick="removeFromQueue(${i})">×</button>
    </div>
  `).join('');

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

// ── Playback ──────────────────────────────────────────────────
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
  pushItemLyrics(item);
  startTick();
}

function pushItemLyrics(item) {
  lyrics = item.lyrics || [];
  currentSong = { title: item.title, artist: item.artist };
  document.getElementById('edit-artist').value = item.artist || '';
  document.getElementById('edit-title').value  = item.title  || '';
  send({ type: 'song', title: item.title, artist: item.artist, lyrics, duration: getDur() });
  setLyricsStatus('found', item.lyricsMeta || null, lyrics);
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
      onReady(e) { e.target.playVideo(); isPlaying = true; pushItemLyrics(item); startTick(); },
      onStateChange(e) {
        if      (e.data === YT.PlayerState.PLAYING) { isPlaying = true;  send({ type: 'resume', t: e.target.getCurrentTime() }); }
        else if (e.data === YT.PlayerState.PAUSED)  { isPlaying = false; send({ type: 'pause',  t: e.target.getCurrentTime() }); }
        else if (e.data === YT.PlayerState.ENDED)   { nextSong(); }
        btnPlay.textContent = isPlaying ? '⏸' : '▶';
      }
    }
  });
}

window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  if (pendingYTItem) { createYTPlayer(pendingYTItem); pendingYTItem = null; }
};

// ── Tick (time sync to display) ───────────────────────────────
function startTick() {
  clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    if (!isPlaying) return;
    const t = getTime(), dur = getDur();
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
  document.getElementById('lp-prev').textContent    = idx > 0               ? lyrics[idx - 1].text : '';
  document.getElementById('lp-current').textContent = idx >= 0              ? lyrics[idx].text     : '';
  document.getElementById('lp-next').textContent    = idx < lyrics.length - 1 ? lyrics[idx + 1].text : '';
}

// ── Lyrics status + manual override ──────────────────────────
async function fetchAndSendLyrics(title, artist, dur) {
  setLyricsStatus('searching', null, null);
  const result = await findExactLyrics(title, artist, dur);
  const item = queue[currentIndex];
  if (result) {
    if (item) { item.lyrics = result.lines; item.lyricsMeta = result.meta; }
    lyrics = result.lines;
    currentSong = { title, artist };
    send({ type: 'song', title, artist, lyrics: result.lines, duration: dur || 0 });
    setLyricsStatus('found', result.meta, result.lines);
  } else {
    if (item) { item.lyrics = []; item.lyricsMeta = null; }
    lyrics = [];
    setLyricsStatus('notfound', null, null);
  }
}

function setLyricsStatus(state, meta, lines) {
  const el      = document.getElementById('lyrics-status');
  const editEl  = document.getElementById('lyrics-edit');
  const matchEl = document.getElementById('lyrics-match');
  if (!el) return;

  if (state === 'searching') {
    el.textContent = '🔍 Finding lyrics…';
    el.className = 'lyrics-status searching';
    editEl.hidden = true; matchEl.hidden = true;
  } else if (state === 'found' && meta) {
    el.textContent = '✓ Lyrics found';
    el.className = 'lyrics-status found';
    editEl.hidden = true;
    document.getElementById('match-artist').textContent = meta.artistName || '—';
    document.getElementById('match-title').textContent  = meta.trackName  || '—';
    const preview = (lines || []).filter(l => l.text).slice(0, 3).map(l => l.text).join(' / ');
    document.getElementById('match-preview').textContent = preview ? `"${preview}"` : '';
    matchEl.hidden = false;
  } else {
    el.textContent = state === 'notfound' ? '✗ No lyrics found' : '';
    el.className = 'lyrics-status notfound';
    matchEl.hidden = true; editEl.hidden = false;
  }
}

document.getElementById('btn-find-lyrics').addEventListener('click', async () => {
  const artist = document.getElementById('edit-artist').value.trim();
  const title  = document.getElementById('edit-title').value.trim();
  if (!title) return;
  await fetchAndSendLyrics(title, artist, getDur());
});

document.getElementById('btn-wrong-lyrics').addEventListener('click', () => {
  document.getElementById('lyrics-match').hidden = true;
  document.getElementById('lyrics-edit').hidden  = false;
});

// ── Lyrics sync offset ────────────────────────────────────────
let syncOffset = 0;

function adjustSync(delta) {
  syncOffset = Math.round((syncOffset + delta) * 10) / 10;
  document.getElementById('sync-val').textContent =
    (syncOffset >= 0 ? '+' : '') + syncOffset.toFixed(1) + 's';
  send({ type: 'offset', value: syncOffset });
}

// ── Player controls ───────────────────────────────────────────
btnPlay.addEventListener('click', () => {
  if (source === 'local') {
    if (isPlaying) audioEl.pause(); else audioEl.play();
  } else if (source === 'youtube' && ytPlayer) {
    const s = ytPlayer.getPlayerState();
    if (s === YT.PlayerState.PLAYING) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
  }
});

document.getElementById('btn-next').addEventListener('click', nextSong);
document.getElementById('btn-prev').addEventListener('click', () => { if (currentIndex > 0) playSong(currentIndex - 1); });

function nextSong() {
  if (currentIndex < queue.length - 1) playSong(currentIndex + 1);
  else { stopAll(); send({ type: 'clear' }); npTitle.textContent = 'Queue finished'; }
}

audioEl.addEventListener('ended', nextSong);
audioEl.addEventListener('pause', () => { isPlaying = false; btnPlay.textContent = '▶'; send({ type: 'pause',  t: audioEl.currentTime }); });
audioEl.addEventListener('play',  () => { isPlaying = true;  btnPlay.textContent = '⏸'; send({ type: 'resume', t: audioEl.currentTime }); });

seekBar.addEventListener('input', () => {
  const dur = getDur();
  const t   = (seekBar.value / 100) * dur;
  if (source === 'local') audioEl.currentTime = t;
  else if (source === 'youtube' && ytPlayer) ytPlayer.seekTo(t, true);
  send({ type: 'time', t });
});

document.getElementById('volume-bar').addEventListener('input', e => { audioEl.volume = +e.target.value; });

// ── File pickers ──────────────────────────────────────────────
document.getElementById('file-input').addEventListener('change', e => {
  Array.from(e.target.files).forEach(addLocalFile);
  e.target.value = '';
});

document.getElementById('folder-input').addEventListener('change', e => {
  const audioFiles = Array.from(e.target.files).filter(f => AUDIO_EXT.test(f.name));
  if (!audioFiles.length) { showToast('No audio files found in that folder'); return; }
  audioFiles.sort((a, b) => a.name.localeCompare(b.name));
  audioFiles.forEach(addLocalFile);
  showToast(`Queuing ${audioFiles.length} track${audioFiles.length !== 1 ? 's' : ''} for processing…`);
  e.target.value = '';
});

function addLocalFile(file) {
  const { artist, title } = parseFilename(file.name);
  const url  = URL.createObjectURL(file);
  const item = { type: 'local', file, url, title, artist, duration: 0 };
  const tmp  = new Audio(url);
  tmp.addEventListener('loadedmetadata', () => { item.duration = tmp.duration; }, { once: true });
  addToLoading(item);
}

// ── YouTube add ───────────────────────────────────────────────
document.getElementById('btn-add-yt').addEventListener('click', addYouTube);
document.getElementById('yt-url').addEventListener('keydown', e => { if (e.key === 'Enter') addYouTube(); });

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
    addToLoading({ type: 'youtube', videoId, title, artist, url, duration: 0 });
    inp.value = '';
  } finally {
    btn.disabled = false; btn.textContent = 'Add';
  }
}

// ── Music library (./music folder on server) ──────────────────
async function loadLibrary() {
  const libEl = document.getElementById('music-library');
  try {
    const files = await fetch('/api/music').then(r => r.json());
    if (!files.length) { libEl.innerHTML = '<p class="empty-msg">Drop MP3s into the ./music folder</p>'; return; }
    libEl.innerHTML = files.map(f =>
      `<div class="lib-item" data-url="${esc(f.url)}" data-name="${esc(f.name)}">♫ ${esc(f.name)}</div>`
    ).join('');
    libEl.querySelectorAll('.lib-item').forEach(el => {
      el.addEventListener('click', () => {
        const { artist, title } = parseFilename(el.dataset.name);
        addToLoading({ type: 'local', file: null, url: el.dataset.url, title, artist, duration: 0 });
      });
    });
  } catch (_) {
    libEl.innerHTML = '<p class="empty-msg">Could not load library</p>';
  }
}

// ── Helpers ───────────────────────────────────────────────────
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

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-show'));
  setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, 2800);
}

// ── Init ──────────────────────────────────────────────────────
connectWS();
loadLibrary();
renderQueue();
renderLoading();
