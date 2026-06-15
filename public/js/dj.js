const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|wma|3gp|3ga|amr|aiff|aif|ape|alac)$/i;

// ── Persistence ───────────────────────────────────────────────
// Queue metadata → localStorage.  Folder handles → IndexedDB.

let _idb = null;
function openIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((res, rej) => {
    const r = indexedDB.open('karaoke', 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('folders', { keyPath: 'id' });
    r.onsuccess = e => { _idb = e.target.result; res(_idb); };
    r.onerror   = () => rej(r.error);
  });
}
function idbTx(mode) { return openIDB().then(db => db.transaction('folders', mode).objectStore('folders')); }
async function idbGetAll() {
  const store = await idbTx('readonly');
  return new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); });
}
async function idbPut(val) {
  const db = await openIDB();
  return new Promise((res, rej) => { const tx = db.transaction('folders', 'readwrite'); tx.objectStore('folders').put(val); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function idbClearAll() {
  const db = await openIDB();
  return new Promise((res, rej) => { const tx = db.transaction('folders', 'readwrite'); tx.objectStore('folders').clear(); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}

function saveQueue() {
  try {
    localStorage.setItem('karaoke-q', JSON.stringify(queue.map(item => ({
      type:             item.type,
      title:            item.title,
      artist:           item.artist,
      artistDiscovered: item.artistDiscovered || false,
      lyrics:           item.lyrics   || [],
      lyricsMeta:       item.lyricsMeta || null,
      bpm:              item.bpm      || null,
      videoId:          item.videoId  || null,
      url:   (item.url && !item.url.startsWith('blob:')) ? item.url : null,
      fileName: item.fileName || null,
      folderId: item.folderId || null,
    }))));
  } catch (_) {}
}

let _pendingRelink = []; // saved items waiting for folder permission

async function restoreLibrary() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('karaoke-q') || '[]'); } catch (_) {}
  if (!saved.length) return;

  // Stable-URL items (YouTube, /music/ server library) restore immediately
  for (const item of saved.filter(x => x.url)) {
    queue.push({ ...item, lyrics: item.lyrics || [], lyricsStatus: 'found' });
  }
  renderQueue();

  // Local file items need a folder handle
  _pendingRelink = saved.filter(x => !x.url && x.fileName && x.folderId);
  if (!_pendingRelink.length) return;

  // Try to relink silently (no prompt) if permission is already granted
  try {
    const folders = await idbGetAll();
    for (const { id, handle } of folders) {
      const perm = await handle.queryPermission({ mode: 'read' }).catch(() => 'denied');
      if (perm === 'granted') await _relinkFromHandle(id, handle);
    }
  } catch (_) {}

  const still = _pendingRelink.filter(x => !x._relinked);
  if (still.length) showRestoreBar(still.length);
  renderQueue();
}

async function _relinkFromHandle(folderId, dirHandle) {
  const fileMap = new Map();
  try {
    for await (const [name, fh] of dirHandle.entries()) {
      if (AUDIO_EXT.test(name)) fileMap.set(name, fh);
    }
  } catch (_) { return; }

  for (const item of _pendingRelink.filter(x => x.folderId === folderId && !x._relinked)) {
    const fh = fileMap.get(item.fileName);
    if (!fh) continue;
    try {
      const file = await fh.getFile();
      queue.push({
        type: 'local', file,
        url:  URL.createObjectURL(file),
        title: item.title, artist: item.artist,
        artistDiscovered: item.artistDiscovered,
        lyrics: item.lyrics || [], lyricsMeta: item.lyricsMeta,
        lyricsStatus: 'found',
        fileName: item.fileName, folderId: item.folderId,
      });
      item._relinked = true;
    } catch (_) {}
  }
}

async function requestFolderRestore() {
  // Requires a user gesture — called from button click
  const folders = await idbGetAll().catch(() => []);
  let count = 0;
  for (const { id, handle } of folders) {
    if (!_pendingRelink.some(x => x.folderId === id && !x._relinked)) continue;
    try {
      const perm = await handle.requestPermission({ mode: 'read' });
      if (perm !== 'granted') continue;
      const before = queue.length;
      await _relinkFromHandle(id, handle);
      count += queue.length - before;
    } catch (_) {}
  }
  renderQueue();
  saveQueue();
  if (!_pendingRelink.some(x => !x._relinked)) hideRestoreBar();
  showToast(count ? `${count} track${count !== 1 ? 's' : ''} restored` : 'Could not restore — select the folder again');
}

function showRestoreBar(n) {
  const el = document.getElementById('restore-bar');
  if (el) { el.hidden = false; el.querySelector('.restore-count').textContent = n; }
}
function hideRestoreBar() {
  const el = document.getElementById('restore-bar');
  if (el) el.hidden = true;
}

async function clearLibrary() {
  if (!confirm('Clear all tracks from the library?')) return;
  stopAll();
  send({ type: 'clear' });
  queue.length = 0;
  loading.length = 0;
  _pendingRelink = [];
  currentIndex = -1;
  currentSong  = null;
  lyrics       = [];
  localStorage.removeItem('karaoke-q');
  await idbClearAll().catch(() => {});
  hideRestoreBar();
  npArtist.textContent = '';
  npTitle.textContent  = 'Select a track to play';
  document.getElementById('lyrics-status').textContent = '';
  document.getElementById('lyrics-match').hidden = true;
  document.getElementById('lyrics-edit').hidden  = true;
  document.getElementById('yt-player-container').hidden = true;
  renderQueue();
  renderLoading();
}

// ── State ────────────────────────────────────────────────────
const loading = []; // tracks being processed (right panel)
const queue   = []; // tracks ready to play   (left panel)
let currentIndex  = -1;
let lyrics        = [];
let isPlaying     = false;
let songCued      = false;   // loaded but not yet started
let source        = null;    // 'local' | 'youtube'
let ytPlayer      = null;
let ytApiReady    = false;
let ytReadyForPlay = false;  // YT player finished loading
let pendingYTPlay  = false;  // countdown fired before YT was ready
let pendingYTItem  = null;
let tickInterval   = null;
let currentSong    = null;
let _counting      = false;
let _countdownTimer = null;

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
    if (songCued || _counting) {
      channel.postMessage({ type: 'cue', title: currentSong.title, artist: currentSong.artist });
    } else {
      channel.postMessage({ type: 'song', ...currentSong, lyrics, duration: getDur() });
      channel.postMessage({ type: 'time', t: getTime(), duration: getDur() });
      if (!isPlaying) channel.postMessage({ type: 'pause', t: getTime() });
    }
    channel.postMessage({ type: 'offset', value: syncOffset });
  }
  if (e.data.type === 'start') startWithCountdown();
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

  // Step 2: find exact synced lyrics
  item.loadStatus = 'finding-lyrics';
  renderLoading();
  let result = await findExactLyrics(item.title, item.artist, item.duration || 0);

  // Step 3: if still nothing and the filename had two parts, try them swapped —
  // handles "Title - Artist" files where the order is reversed
  if (!result && item.artist && item.title && !item.artistDiscovered) {
    result = await findExactLyrics(item.artist, item.title, item.duration || 0);
    if (result) [item.title, item.artist] = [item.artist, item.title];
  }

  if (result) {
    item.lyrics     = result.lines;
    item.lyricsMeta = result.meta;
    if (result.meta.artistName && !item.artist) item.artist = result.meta.artistName;
    // Step 4: BPM lookup (using confirmed title+artist for best accuracy)
    item.loadStatus = 'finding-bpm';
    renderLoading();
    item.bpm = await fetchBPM(item.title, item.artist);
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

async function fetchBPM(title, artist) {
  try {
    const p = new URLSearchParams({ track_name: title });
    if (artist) p.set('artist_name', artist);
    const r = await fetch(`/api/bpm?${p}`);
    if (r.ok) { const d = await r.json(); return d.bpm || null; }
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
  saveQueue();
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
    if (st === 'queued' || st === 'finding-artist' || st === 'finding-lyrics' || st === 'finding-bpm') {
      const msg = st === 'finding-artist' ? 'Finding artist…'
                : st === 'finding-lyrics' ? 'Finding lyrics…'
                : st === 'finding-bpm'    ? 'Finding BPM…'
                : 'Waiting…';
      statusHtml = `<span class="li-spin">↻</span><span class="li-msg">${msg}</span>`;
    } else if (st === 'ready') {
      statusHtml = `<span class="li-ok">✓ Ready${item.bpm ? ` · ${item.bpm} BPM` : ''}</span>`;
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
        <span class="qi-artist">${[item.artist, item.bpm ? item.bpm + ' BPM' : ''].filter(Boolean).join(' · ')}</span>
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
  saveQueue();
}

// ── Playback ──────────────────────────────────────────────────

// Load a song into position without starting it; display shows START button
async function playSong(idx) {
  if (idx < 0 || idx >= queue.length) return;
  currentIndex = idx;
  const item = queue[idx];

  stopAll();
  npArtist.textContent = item.artist || '';
  npTitle.textContent  = item.title  || 'Loading…';
  btnPlay.textContent  = '▶';
  songCued = true;
  renderQueue();

  lyrics = item.lyrics || [];
  currentSong = { title: item.title, artist: item.artist };
  source = item.type === 'youtube' ? 'youtube' : 'local';
  document.getElementById('edit-artist').value = item.artist || '';
  document.getElementById('edit-title').value  = item.title  || '';
  setLyricsStatus('found', item.lyricsMeta || null, lyrics);

  if (item.type === 'youtube') {
    document.getElementById('yt-player-container').hidden = false;
    ytReadyForPlay = false;
    pendingYTPlay  = false;
    if (ytPlayer && typeof ytPlayer.cueVideoById === 'function') {
      ytPlayer.cueVideoById(item.videoId);
      ytReadyForPlay = true;
    } else if (ytApiReady) {
      createYTPlayer(item);
    } else {
      pendingYTItem = item;
    }
  } else {
    document.getElementById('yt-player-container').hidden = true;
    audioEl.src = item.url || URL.createObjectURL(item.file);
    audioEl.volume = +document.getElementById('volume-bar').value;
    audioEl.load();
  }

  send({ type: 'cue', title: item.title, artist: item.artist });
}

// 3-2-1 countdown then start audio
function startWithCountdown() {
  if (_counting || !currentSong) return;
  _counting = true;
  songCued  = false;
  btnPlay.textContent = '…';
  let n = 3;

  const tick = () => {
    send({ type: 'countdown', n });
    if (n === 0) {
      _counting = false;
      _countdownTimer = null;
      if (source === 'local') {
        audioEl.play().catch(() => {});
        isPlaying = true;
        btnPlay.textContent = '⏸';
        pushLyricsNow();
        startTick();
      } else if (source === 'youtube') {
        btnPlay.textContent = '⏸';
        if (ytPlayer && ytReadyForPlay) {
          try { ytPlayer.playVideo(); isPlaying = true; pushLyricsNow(); startTick(); } catch (_) {}
        } else {
          pendingYTPlay = true; // will start when player fires onReady
        }
      }
      return;
    }
    n--;
    _countdownTimer = setTimeout(tick, 1000);
  };
  tick();
}

function stopAll() {
  _counting = false;
  if (_countdownTimer) { clearTimeout(_countdownTimer); _countdownTimer = null; }
  songCued = false;
  pendingYTPlay  = false;
  ytReadyForPlay = false;
  clearInterval(tickInterval);
  audioEl.pause();
  audioEl.removeAttribute('src');
  if (ytPlayer) { try { ytPlayer.stopVideo(); } catch (_) {} }
  isPlaying = false;
}

// Send the 'song' message to display (after countdown ends)
function pushLyricsNow() {
  send({ type: 'song', title: currentSong.title, artist: currentSong.artist, lyrics, duration: getDur() });
  send({ type: 'offset', value: syncOffset });
  setLyricsStatus('found', queue[currentIndex]?.lyricsMeta || null, lyrics);
}

function pushItemLyrics(item) {
  lyrics = item.lyrics || [];
  currentSong = { title: item.title, artist: item.artist };
  document.getElementById('edit-artist').value = item.artist || '';
  document.getElementById('edit-title').value  = item.title  || '';
  send({ type: 'song', title: item.title, artist: item.artist, lyrics, duration: getDur() });
  setLyricsStatus('found', item.lyricsMeta || null, lyrics);
}

function createYTPlayer(item) {
  ytReadyForPlay = false;
  ytPlayer = new YT.Player('yt-player', {
    height: '140', width: '248',
    playerVars: { autoplay: 0, rel: 0, modestbranding: 1 },
    events: {
      onReady(e) {
        e.target.cueVideoById(item.videoId);
        ytReadyForPlay = true;
        if (pendingYTPlay) {
          pendingYTPlay = false;
          try { e.target.playVideo(); isPlaying = true; pushLyricsNow(); startTick(); } catch (_) {}
        }
      },
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

// ── Tick (time sync to display) ───────────────────────────────
function startTick() {
  clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    if (!isPlaying) return;
    const t = getTime(), dur = getDur();
    send({ type: 'time', t, duration: dur });
    updateSeekUI(t, dur);
    updateLyricsPreview(t);
  }, 50);
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
let syncOffset = (function () {
  const v = parseFloat(localStorage.getItem('karaoke-sync'));
  return isNaN(v) ? 0 : v;
})();

function _showSync() {
  const el = document.getElementById('sync-val');
  if (el) el.textContent = (syncOffset >= 0 ? '+' : '') + syncOffset.toFixed(1) + 's';
}

function adjustSync(delta) {
  syncOffset = Math.round((syncOffset + delta) * 10) / 10;
  _showSync();
  send({ type: 'offset', value: syncOffset });
  try { localStorage.setItem('karaoke-sync', String(syncOffset)); } catch (_) {}
}

function resetSync() {
  syncOffset = 0;
  _showSync();
  send({ type: 'offset', value: 0 });
  try { localStorage.setItem('karaoke-sync', '0'); } catch (_) {}
}

// ── Player controls ───────────────────────────────────────────
btnPlay.addEventListener('click', () => {
  if (_counting) return; // don't interrupt countdown
  if (songCued) { startWithCountdown(); return; }
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

// Fallback: webkitdirectory input (no persistence for local files)
document.getElementById('folder-input').addEventListener('change', e => {
  const audioFiles = Array.from(e.target.files).filter(f => AUDIO_EXT.test(f.name));
  if (!audioFiles.length) { showToast('No audio files found in that folder'); return; }
  audioFiles.sort((a, b) => a.name.localeCompare(b.name));
  audioFiles.forEach(f => addLocalFile(f, null));
  showToast(`Queuing ${audioFiles.length} track${audioFiles.length !== 1 ? 's' : ''} for processing…`);
  e.target.value = '';
});

// Primary: File System Access API — handle stored in IndexedDB for session restore
async function pickFolder() {
  if (!('showDirectoryPicker' in window)) {
    document.getElementById('folder-input').click();
    return;
  }
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    const folderId  = 'f' + Date.now();
    await idbPut({ id: folderId, handle: dirHandle });

    const pairs = [];
    for await (const [name, fh] of dirHandle.entries()) {
      if (AUDIO_EXT.test(name)) {
        try { pairs.push({ file: await fh.getFile(), folderId }); } catch (_) {}
      }
    }
    if (!pairs.length) { showToast('No audio files found in that folder'); return; }
    pairs.sort((a, b) => a.file.name.localeCompare(b.file.name));
    pairs.forEach(({ file }) => addLocalFile(file, folderId));
    showToast(`Queuing ${pairs.length} track${pairs.length !== 1 ? 's' : ''} for processing…`);
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Could not access folder');
  }
}

function addLocalFile(file, folderId) {
  const { artist, title } = parseFilename(file.name);
  const url  = URL.createObjectURL(file);
  const item = { type: 'local', file, url, title, artist, duration: 0, fileName: file.name, folderId };
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

function decamel(s) {
  return s
    .replace(/_/g, ' ')                          // underscores → spaces
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')      // camelCase → camel Case
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // ABCDef → ABC Def
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFilename(name) {
  let base = name.replace(/\.[^.]+$/, '');  // strip extension

  // Strip leading track numbers in any of these formats:
  // "01 - ", "1-01 ", "- 1-01 ", "01. ", "1_", "- 01 " etc.
  base = base.replace(/^[-\s]*\d+[-.\s_]*\d*[-.\s_]+/, '');

  // Standard spaced separator: "Artist - Title" or "Title - Artist"
  let m = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };

  // Space-dash with NO space after: "Toxic -Britney Spears"
  m = base.match(/^(.+?)\s+[-–—](\w.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };

  // No spaces at all → compressed format: SisterSledge-Frankie, Sister_Sledge_Frankie
  if (!/\s/.test(base)) {
    m = base.match(/^(.+?)[-_](.+)$/);
    if (m) return { artist: decamel(m[1]).trim(), title: decamel(m[2]).trim() };
    return { artist: '', title: decamel(base) };
  }

  // Has spaces but no recognised separator → use whole string as title
  return { artist: '', title: base };
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
restoreLibrary();
_showSync();
