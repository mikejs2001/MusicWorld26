const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseFile } = require('music-metadata');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Proxy LRCLIB to avoid any CORS issues
app.get('/api/lyrics', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.track_name) params.set('track_name', req.query.track_name);
    if (req.query.artist_name) params.set('artist_name', req.query.artist_name);
    if (req.query.album_name) params.set('album_name', req.query.album_name);
    if (req.query.duration) params.set('duration', req.query.duration);
    const response = await fetch(`https://lrclib.net/api/get?${params}`);
    if (!response.ok) return res.status(404).json({ error: 'Not found' });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lyrics/search', async (req, res) => {
  try {
    const response = await fetch(`https://lrclib.net/api/search?${new URLSearchParams(req.query)}`);
    if (!response.ok) return res.status(404).json([]);
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// YouTube oEmbed proxy
app.get('/api/ytinfo', async (req, res) => {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(req.query.url)}&format=json`;
    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ title: '' });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List music files in ./music directory
app.get('/api/music', (req, res) => {
  const musicDir = path.join(__dirname, 'music');
  if (!fs.existsSync(musicDir)) {
    fs.mkdirSync(musicDir, { recursive: true });
    return res.json([]);
  }
  const files = fs.readdirSync(musicDir)
    .filter(f => /\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(f))
    .map(f => ({ name: f, url: `/music/${encodeURIComponent(f)}` }));
  res.json(files);
});

// Serve music files (Express handles range requests for seeking)
app.get('/music/:file', (req, res) => {
  const filePath = path.join(__dirname, 'music', decodeURIComponent(req.params.file));
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// ── Storage browser (for Android / Termux) ──────────────────────────────────

// Directories we allow browsing — home dir covers ~/storage/* symlinks on Android
const ALLOWED_ROOTS = [
  os.homedir(),
  '/sdcard',
  '/storage/emulated/0',
  '/storage/emulated/legacy',
];

function isAllowedPath(p) {
  const resolved = path.resolve(p);
  return ALLOWED_ROOTS.some(root => resolved === root || resolved.startsWith(root + path.sep));
}

// Expand ~ to home directory (path.resolve does NOT do this)
function expandHome(p) {
  if (!p) return os.homedir();
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

// All common audio formats including WMA, 3GP common on Android
const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|wma|3gp|3ga|amr|aiff|aif|ape|alac)$/i;

app.get('/api/browse', (req, res) => {
  const raw    = req.query.path || '~';
  const target = path.resolve(expandHome(raw));
  console.log(`[browse] raw="${raw}" → target="${target}"`);

  if (!isAllowedPath(target)) return res.status(403).json({ error: 'Access denied' });

  try {
    const entries = fs.readdirSync(target, { withFileTypes: true });
    console.log(`[browse] readdirSync returned ${entries.length} entries`);
    const dirs = [], files = [];
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(target, e.name);
      let isDir = false, isFile = false;
      let statErr = null;
      try {
        // statSync follows symlinks — necessary for ~/storage/* on Android
        const stat = fs.statSync(full);
        isDir  = stat.isDirectory();
        isFile = stat.isFile();
      } catch (err) {
        statErr = err.message;
        // statSync failed (permission, broken symlink) — fall back to dirent type
        isDir  = e.isDirectory();
        isFile = e.isFile();
      }
      const extMatch = AUDIO_EXT.test(e.name);
      console.log(`[browse]   "${e.name}" isDir=${isDir} isFile=${isFile} extMatch=${extMatch}${statErr ? ' statErr='+statErr : ''}`);
      if (isDir) dirs.push({ name: e.name, path: full });
      else if (isFile && extMatch) files.push({ name: e.name, path: full });
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[browse] found ${dirs.length} dirs, ${files.length} audio files`);

    const parent = path.dirname(target);
    // Include unique non-matching extensions so the client can show a helpful message
    const unknownExts = [...new Set(
      entries
        .filter(e => !e.name.startsWith('.'))
        .map(e => { const m = e.name.match(/\.([^.]+)$/); return m ? m[1].toLowerCase() : null; })
        .filter(ext => ext && !AUDIO_EXT.test('.' + ext))
    )];
    res.json({
      current: target,
      parent: isAllowedPath(parent) && parent !== target ? parent : null,
      dirs,
      files,
      unknownExts,  // non-audio extensions found (useful for debugging empty folders)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read ID3/audio tags from a file
app.get('/api/metadata', async (req, res) => {
  const filePath = path.resolve(expandHome(req.query.path || ''));
  if (!isAllowedPath(filePath)) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    const meta = await parseFile(filePath, { duration: true, skipCovers: true });
    res.json({
      title:    meta.common.title    || null,
      artist:   meta.common.artist   || null,
      album:    meta.common.album    || null,
      duration: meta.format.duration || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stream any audio file within allowed paths (supports range requests for seeking)
app.get('/api/stream', (req, res) => {
  const filePath = path.resolve(expandHome(req.query.path || ''));
  if (!isAllowedPath(filePath)) return res.status(403).send('Access denied');
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// WebSocket: relay all messages between DJ and display clients
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('message', (data) => {
    for (const client of clients) {
      if (client !== ws && client.readyState === 1) client.send(data);
    }
  });
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  console.log('\n🎤  Karaoke server started!\n');
  console.log(`  DJ Console  →  http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  TV Display  →  http://${ip}:${PORT}/display.html`));
  console.log('\n  Drop MP3 files into the ./music folder to add to the library.\n');
});
