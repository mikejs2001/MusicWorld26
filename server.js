const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
