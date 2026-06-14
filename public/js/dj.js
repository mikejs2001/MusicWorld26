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
  item.lyricsStatus = 'searching';
  item.lyrics = [];
  queue.push(item);
  renderQueue();
  if (currentIndex === -1) playSong(0);

  // Fetch lyrics in the background as soon as track is queued
  fetchLyrics(item.title, item.artist, 0).then(({ lines, meta }) => {
    item.lyrics      = lines;
    item.lyricsMeta  = meta;
    item.lyricsStatus = lines.length ? 'found' : 'notfound';
    renderQueue();
    // If this track is already playing, push lyrics to display now
    if (queue[currentIndex] === item) {
      lyrics = lines;
      currentSong = { title: item.title, artist: item.artist };
      send({ type: 'song', title: item.title, artist: item.artist, lyrics: lines, duration: getDur() });
      setLyricsStatus(item.lyricsStatus, meta, lines);
    }
  });
}

const LYRICS_ICON = { found: '✓', searching: '…', notfound: '✗' };

function renderQueue() {
  if (queue.length === 0) {
    queueList.innerHTML = '<p class="empty-msg">Queue is empty — add some songs!</p>';
    return;
  }
  queueList.innerHTML = queue.map((item, i) => {
    const ls = item.lyricsStatus || 'searching';
    return `<div class="queue-item ${i === currentIndex ? 'playing' : ''}" data-i="${i}">
      <span class="qi-num">${i === currentIndex ? '♪' : i + 1}</span>
      <span class="qi-info">
        <span class="qi-title">${esc(item.title || 'Unknown')}</span>
        ${item.artist ? `<span class="qi-artist">${esc(item.artist)}</span>` : ''}
      </span>
      <span class="qi-lyr qi-lyr-${ls}" title="${ls === 'found' ? 'Lyrics ready' : ls === 'searching' ? 'Finding lyrics…' : 'No lyrics found'}">${LYRICS_ICON[ls]}</span>
      <button class="qi-del" onclick="removeFromQueue(${i})">×</button>
    </div>`;
  }).join('');

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

  pushItemLyrics(item);
  startTick();
}

function pushItemLyrics(item) {
  lyrics = item.lyrics || [];
  currentSong = { title: item.title, artist: item.artist };
  // Pre-fill the edit form with filename-parsed values
  document.getElementById('edit-artist').value = item.artist || '';
  document.getElementById('edit-title').value  = item.title  || '';
  send({ type: 'song', title: item.title, artist: item.artist, lyrics, duration: getDur() });
  setLyricsStatus(item.lyricsStatus || 'searching', item.lyricsMeta || null, lyrics);
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
        pushItemLyrics(item);
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

// Returns { lines, meta: { trackName, artistName } }
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

    // 3. Structured search fallback — keeps artist separate so LRCLIB filters properly
    if (!r.ok) {
      const sp = new URLSearchParams({ track_name: title });
      if (artist) sp.set('artist_name', artist);
      r = await fetch(`/api/lyrics/search?${sp}`);
      // If structured search finds nothing and we had an artist, try title-only search
      if (r.ok) {
        let results = await r.json();
        if (!results.length && artist) {
          const r2 = await fetch(`/api/lyrics/search?track_name=${encodeURIComponent(title)}`);
          if (r2.ok) results = await r2.json();
        }
        if (results.length) {
          // Prefer result where artist matches (case-insensitive)
          const artistLower = (artist || '').toLowerCase();
          const best = results.find(x => (x.artistName || '').toLowerCase().includes(artistLower))
                    || results[0];
          const lines = best.syncedLyrics ? parseLRC(best.syncedLyrics) : plainLines(best.plainLyrics);
          return { lines, meta: { trackName: best.trackName, artistName: best.artistName } };
        }
      }
      return { lines: [], meta: null };
    }

    const data = await r.json();
    const lines = data.syncedLyrics ? parseLRC(data.syncedLyrics) : plainLines(data.plainLyrics);
    return { lines, meta: { trackName: data.trackName, artistName: data.artistName } };
  } catch (e) {
    console.warn('Lyrics fetch failed:', e);
  }
  return { lines: [], meta: null };
}

function plainLines(text) {
  if (!text) return [];
  return text.split('\n').filter(l => l.trim())
    .map((line, i) => ({ time: i * 4, text: line.trim(), words: [] }));
}

async function fetchAndSendLyrics(title, artist, dur) {
  setLyricsStatus('searching', null, null);
  const { lines, meta } = await fetchLyrics(title, artist, dur);
  const item = queue[currentIndex];
  if (item) { item.lyrics = lines; item.lyricsMeta = meta; item.lyricsStatus = lines.length ? 'found' : 'notfound'; renderQueue(); }
  lyrics = lines;
  currentSong = { title, artist };
  send({ type: 'song', title, artist, lyrics: lines, duration: dur || 0 });
  setLyricsStatus(lines.length ? 'found' : 'notfound', meta, lines);
}

function setLyricsStatus(state, meta, lines) {
  const el      = document.getElementById('lyrics-status');
  const editEl  = document.getElementById('lyrics-edit');
  const matchEl = document.getElementById('lyrics-match');
  if (!el) return;

  if (state === 'searching') {
    el.textContent = '🔍 Finding lyrics…';
    el.className = 'lyrics-status searching';
    editEl.hidden = true;
    matchEl.hidden = true;
  } else if (state === 'found' && meta) {
    el.textContent = '✓ Lyrics found';
    el.className = 'lyrics-status found';
    editEl.hidden = true;
    // Show what was matched so user can verify
    document.getElementById('match-artist').textContent = meta.artistName || '—';
    document.getElementById('match-title').textContent  = meta.trackName  || '—';
    // Show first 3 lyric lines as a preview
    const preview = (lines || []).filter(l => l.text).slice(0, 3).map(l => l.text).join(' / ');
    document.getElementById('match-preview').textContent = preview ? `"${preview}"` : '';
    matchEl.hidden = false;
  } else {
    el.textContent = '✗ No lyrics — edit title/artist below';
    el.className = 'lyrics-status notfound';
    matchEl.hidden = true;
    editEl.hidden = false;
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
  document.getElementById('lyrics-edit').hidden = false;
});

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
      btn.addEventListener('click', (e) => { e.stopPropagation(); addFolderToQueue(btn, btn.dataset.path); });
    });
    listEl.querySelectorAll('.bi-file').forEach(el => {
      el.addEventListener('click', () => addStreamFile(el.dataset.path, el.dataset.name));
    });
    const addAllEl = listEl.querySelector('.bi-add-all');
    if (addAllEl) addAllEl.addEventListener('click', () => {
      browseFiles.forEach(f => addStreamFile(f.path, f.name));
      showToast(`Added ${browseFiles.length} track${browseFiles.length > 1 ? 's' : ''} to queue`);
    });
  } catch (e) {
    listEl.innerHTML = '<p class="empty-msg">Error reading folder</p>';
  }
}

function addStreamFile(filePath, fileName) {
  const { artist, title } = parseFilename(fileName);
  const url = `/api/stream?path=${encodeURIComponent(filePath)}`;
  const item = { type: 'local', file: null, url, title, artist, duration: 0 };
  addToQueue(item);

  // Enrich with ID3 tags — overwrites filename parse and re-fetches lyrics if artist/title improved
  fetch(`/api/metadata?path=${encodeURIComponent(filePath)}`)
    .then(r => r.ok ? r.json() : null)
    .then(meta => {
      if (!meta) return;
      const newTitle  = meta.title  || title;
      const newArtist = meta.artist || artist;
      const improved  = newTitle !== title || newArtist !== artist;
      item.title    = newTitle;
      item.artist   = newArtist;
      if (meta.duration) item.duration = meta.duration;
      if (!improved) return;
      renderQueue();
      // Re-fetch lyrics now we have proper tags (especially when artist was missing)
      if (!artist || item.lyricsStatus === 'notfound') {
        item.lyricsStatus = 'searching';
        item.lyrics = [];
        renderQueue();
        fetchLyrics(newTitle, newArtist, meta.duration || 0).then(({ lines, meta: lm }) => {
          item.lyrics = lines;
          item.lyricsMeta = lm;
          item.lyricsStatus = lines.length ? 'found' : 'notfound';
          renderQueue();
          if (queue[currentIndex] === item) {
            lyrics = lines;
            currentSong = { title: newTitle, artist: newArtist };
            send({ type: 'song', title: newTitle, artist: newArtist, lyrics: lines, duration: getDur() });
            setLyricsStatus(item.lyricsStatus, lm, lines);
            document.getElementById('edit-artist').value = newArtist;
            document.getElementById('edit-title').value  = newTitle;
          }
        });
      }
    })
    .catch(() => {});
}

async function addFolderToQueue(btn, folderPath) {
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const r = await fetch(`/api/browse?path=${encodeURIComponent(folderPath)}`);
    if (!r.ok) { btn.textContent = '✗'; setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000); return; }
    const data = await r.json();
    if (!data.files.length) { showToast('No audio files found in that folder'); btn.textContent = orig; btn.disabled = false; return; }
    data.files.forEach(f => addStreamFile(f.path, f.name));
    btn.textContent = `+${data.files.length}`;
    showToast(`Added ${data.files.length} track${data.files.length > 1 ? 's' : ''} to queue`);
  } catch (_) {
    btn.textContent = '✗';
  } finally {
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2500);
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

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-show'));
  setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, 2800);
}

// ── Init ─────────────────────────────────────────────────────
connectWS();
loadLibrary();
renderQueue();
