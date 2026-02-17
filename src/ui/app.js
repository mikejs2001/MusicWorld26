/**
 * Main application controller: wires together all modules and manages UI state.
 */

import { openDB, getAllTracks, clearAllTracks, getPreference, setPreference } from '../db/store.js';
import { importFiles } from '../import/importer.js';
import { analyzeAllUnanalyzed, reanalyzeAll } from '../analysis/analyzer.js';
import { MoodGrid } from '../grid/moodGrid.js';
import { PlaylistManager } from '../playlist/playlist.js';
import { AudioPlayer } from '../player/player.js';
import { VUMeter } from '../player/vuMeter.js';

export class App {
  constructor() {
    this.moodGrid = null;
    this.playlist = new PlaylistManager();
    this.player = new AudioPlayer();
    this.vuLeft = null;
    this.vuRight = null;
    this.tracks = [];
    this._importAbort = null;
    this._analyzeAbort = null;
  }

  async init() {
    await openDB();

    this._initMoodGrid();
    this._initVUMeters();
    this._initPlayerControls();
    this._initPlaylist();
    this._initMenu();
    this._initSettings();
    this._loadSettings();

    await this._refreshLibrary();
  }

  // --- Library ---

  async _refreshLibrary() {
    this.tracks = await getAllTracks();
    const analyzed = this.tracks.filter((t) => t.analyzed);

    this.moodGrid.setTracks(analyzed);
    this.playlist.setTracks(analyzed);

    const emptyState = document.getElementById('empty-state');
    const gridContainer = document.getElementById('grid-container');
    if (analyzed.length === 0) {
      emptyState.classList.remove('hidden');
      gridContainer.style.opacity = '0.2';
    } else {
      emptyState.classList.add('hidden');
      gridContainer.style.opacity = '1';
    }
  }

  // --- Import ---

  async _startImport() {
    this._closeAllOverlays();

    this._importAbort = new AbortController();

    // The file picker opens immediately — overlay shows after files are selected
    let filesSelected = false;

    try {
      const imported = await importFiles((progress) => {
        // Show overlay once files are actually being imported
        if (!filesSelected && progress.phase === 'importing') {
          filesSelected = true;
          document.getElementById('import-overlay').classList.remove('hidden');
        }

        const statusEl = document.getElementById('import-status');
        const fillEl = document.getElementById('import-progress-fill');
        const detailEl = document.getElementById('import-detail');

        if (progress.phase === 'scanning') {
          statusEl.textContent = `Found ${progress.total} audio files...`;
          fillEl.style.width = '0%';
          detailEl.textContent = '';
        } else if (progress.phase === 'importing') {
          const pct = Math.round((progress.current / progress.total) * 100);
          statusEl.textContent = `Importing: ${progress.current} / ${progress.total}`;
          fillEl.style.width = pct + '%';
          detailEl.textContent = progress.trackName;
        } else if (progress.phase === 'done') {
          statusEl.textContent = 'Import complete!';
          fillEl.style.width = '100%';
        }
      }, this._importAbort.signal);

      if (!filesSelected) return; // User cancelled file picker

      const overlay = document.getElementById('import-overlay');
      const statusEl = document.getElementById('import-status');
      const fillEl = document.getElementById('import-progress-fill');
      const detailEl = document.getElementById('import-detail');

      if (imported > 0) {
        statusEl.textContent = 'Analyzing tracks...';
        fillEl.style.width = '0%';

        this._analyzeAbort = new AbortController();
        await analyzeAllUnanalyzed((progress) => {
          const pct = Math.round((progress.current / progress.total) * 100);
          statusEl.textContent = `Analyzing: ${progress.current} / ${progress.total}`;
          fillEl.style.width = pct + '%';
          detailEl.textContent = progress.trackName;
        }, this._analyzeAbort.signal);

        statusEl.textContent = `Done! Imported and analyzed ${imported} tracks.`;
        fillEl.style.width = '100%';
      } else {
        statusEl.textContent = 'No new tracks found.';
      }

      await this._refreshLibrary();

      setTimeout(() => {
        overlay.classList.add('hidden');
      }, 1500);
    } catch (err) {
      if (err.name !== 'AbortError') {
        const statusEl = document.getElementById('import-status');
        statusEl.textContent = `Error: ${err.message}`;
        console.error('Import error:', err);
      }
    }
  }

  _cancelImport() {
    this._importAbort?.abort();
    this._analyzeAbort?.abort();
    document.getElementById('import-overlay').classList.add('hidden');
  }

  // --- Mood Grid ---

  _initMoodGrid() {
    const canvas = document.getElementById('mood-grid');
    this.moodGrid = new MoodGrid(canvas);

    this.moodGrid.onMoodSelected = (moodPoint) => {
      const sizeSelect = document.getElementById('playlist-size');
      const size = parseInt(sizeSelect.value, 10);

      const scaling = {
        bpmMin: this.moodGrid.bpmMin,
        bpmMax: this.moodGrid.bpmMax,
        valenceMin: this.moodGrid.valenceMin,
        valenceMax: this.moodGrid.valenceMax,
      };

      const queue = this.playlist.generateFromMood(moodPoint, size, scaling);

      if (queue.length > 0) {
        this._renderPlaylist();
        this._loadAndPlayTrack(queue[0]);
      }
    };
  }

  // --- VU Meters ---

  _initVUMeters() {
    const leftCanvas = document.getElementById('vu-left');
    const rightCanvas = document.getElementById('vu-right');

    const dpr = window.devicePixelRatio || 1;
    for (const c of [leftCanvas, rightCanvas]) {
      c.width = 100 * dpr;
      c.height = 80 * dpr;
    }

    this.vuLeft = new VUMeter(leftCanvas);
    this.vuRight = new VUMeter(rightCanvas);
  }

  _connectVUMeters() {
    const analysers = this.player.getAnalysers();
    if (analysers.left) {
      this.vuLeft.setAnalyser(analysers.left);
      this.vuRight.setAnalyser(analysers.right);
      this.vuLeft.start();
      this.vuRight.start();
    }
  }

  // --- Player Controls ---

  _initPlayerControls() {
    const btnPlay = document.getElementById('btn-play');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const seekBar = document.getElementById('seek-bar');

    btnPlay.addEventListener('click', () => {
      if (!this.player.currentTrack) return;
      this.player.togglePlay();
    });

    btnPrev.addEventListener('click', () => {
      const track = this.playlist.previous();
      if (track) this._loadAndPlayTrack(track);
    });

    btnNext.addEventListener('click', () => {
      const track = this.playlist.next();
      if (track) this._loadAndPlayTrack(track);
    });

    let isSeeking = false;
    seekBar.addEventListener('input', () => {
      isSeeking = true;
      const pct = seekBar.value / 1000;
      this.player.seekPercent(pct);
    });
    seekBar.addEventListener('change', () => {
      isSeeking = false;
    });

    this.player.onTimeUpdate = (current, duration) => {
      if (!isSeeking) {
        seekBar.value = duration > 0 ? Math.round((current / duration) * 1000) : 0;
      }
      document.getElementById('time-elapsed').textContent = this._formatTime(current);
      document.getElementById('time-remaining').textContent =
        '-' + this._formatTime(Math.max(0, duration - current));
    };

    this.player.onStateChange = (isPlaying) => {
      btnPlay.innerHTML = isPlaying ? '&#9646;&#9646;' : '&#9654;';
    };

    this.player.onTrackEnd = () => {
      const next = this.playlist.next();
      if (next) {
        this._loadAndPlayTrack(next);
      }
    };
  }

  async _loadAndPlayTrack(track) {
    try {
      await this.player.loadTrack(track);
      this._connectVUMeters();
      await this.player.play();
      this._updateNowPlaying(track);
      this._renderPlaylist();
    } catch (err) {
      console.error('Playback error:', err);
      const next = this.playlist.next();
      if (next) this._loadAndPlayTrack(next);
    }
  }

  _updateNowPlaying(track) {
    document.getElementById('track-title').textContent = track.title;
    document.getElementById('track-artist').textContent = track.artist;

    const artworkEl = document.getElementById('artwork-img');
    if (track.artworkData) {
      const blob = new Blob([new Uint8Array(track.artworkData.data)], {
        type: track.artworkData.format,
      });
      const url = URL.createObjectURL(blob);
      artworkEl.style.backgroundImage = `url(${url})`;

      if (getPreference('bgMode', 'artwork') === 'artwork') {
        const gridPanel = document.getElementById('grid-panel');
        gridPanel.style.backgroundImage = `url(${url})`;
        gridPanel.style.backgroundSize = 'cover';
        gridPanel.style.backgroundPosition = 'center';
      }
    } else {
      artworkEl.style.backgroundImage = '';
    }
  }

  _formatTime(seconds) {
    if (!isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // --- Playlist UI ---

  _initPlaylist() {
    const sizeSelect = document.getElementById('playlist-size');
    sizeSelect.addEventListener('change', () => {
      if (this.moodGrid.selectedMood) {
        this.moodGrid.onMoodSelected(this.moodGrid.selectedMood);
      }
    });
  }

  _renderPlaylist() {
    const listEl = document.getElementById('playlist-tracks');
    const queue = this.playlist.queue;
    const currentIndex = this.playlist.currentIndex;

    listEl.innerHTML = '';

    queue.forEach((track, i) => {
      const li = document.createElement('li');
      if (i === currentIndex) li.classList.add('active');

      li.innerHTML = `
        <span class="track-num">${i + 1}</span>
        <div class="track-info">
          <span class="track-name">${this._escapeHtml(track.title)}</span>
          <span class="track-meta">${this._escapeHtml(track.artist)} &middot; ${track.bpm} BPM</span>
        </div>
      `;

      li.addEventListener('click', () => {
        const t = this.playlist.jumpTo(i);
        if (t) this._loadAndPlayTrack(t);
      });

      listEl.appendChild(li);
    });

    const activeEl = listEl.querySelector('.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Menu ---

  _initMenu() {
    const menuBtn = document.getElementById('menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');

    menuBtn.addEventListener('click', () => {
      this._closeAllOverlays();
      menuOverlay.classList.remove('hidden');
    });

    menuOverlay.querySelector('.overlay-close').addEventListener('click', () => {
      menuOverlay.classList.add('hidden');
    });

    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) menuOverlay.classList.add('hidden');
    });

    document.getElementById('menu-add-tracks').addEventListener('click', () => {
      menuOverlay.classList.add('hidden');
      this._startImport();
    });

    document.getElementById('menu-reanalyse').addEventListener('click', async () => {
      this._closeAllOverlays();
      const overlay = document.getElementById('import-overlay');
      overlay.classList.remove('hidden');

      const statusEl = document.getElementById('import-status');
      const fillEl = document.getElementById('import-progress-fill');
      const detailEl = document.getElementById('import-detail');

      this._analyzeAbort = new AbortController();
      await reanalyzeAll((progress) => {
        const pct = Math.round((progress.current / progress.total) * 100);
        statusEl.textContent = `Reanalyzing: ${progress.current} / ${progress.total}`;
        fillEl.style.width = pct + '%';
        detailEl.textContent = progress.trackName;
      }, this._analyzeAbort.signal);

      statusEl.textContent = 'Reanalysis complete!';
      fillEl.style.width = '100%';
      await this._refreshLibrary();

      setTimeout(() => overlay.classList.add('hidden'), 1500);
    });

    document.getElementById('menu-rebuild-index').addEventListener('click', async () => {
      this._closeAllOverlays();
      await this._refreshLibrary();
    });

    document.getElementById('menu-clear-library').addEventListener('click', async () => {
      if (confirm('Clear entire library? This cannot be undone.')) {
        await clearAllTracks();
        this.playlist.clear();
        await this._refreshLibrary();
        this._closeAllOverlays();
      }
    });

    document.getElementById('empty-add-btn').addEventListener('click', () => {
      this._startImport();
    });

    document.getElementById('import-cancel').addEventListener('click', () => {
      this._cancelImport();
    });
  }

  // --- Settings ---

  _initSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');

    settingsBtn.addEventListener('click', () => {
      this._closeAllOverlays();
      settingsOverlay.classList.remove('hidden');
    });

    settingsOverlay.querySelector('.overlay-close').addEventListener('click', () => {
      settingsOverlay.classList.add('hidden');
    });

    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden');
    });

    document.getElementById('setting-vu-style').addEventListener('change', (e) => {
      const style = e.target.value;
      setPreference('vuStyle', style);
      this.vuLeft.setStyle(style);
      this.vuRight.setStyle(style);
    });

    document.getElementById('setting-bg-mode').addEventListener('change', (e) => {
      const mode = e.target.value;
      setPreference('bgMode', mode);
      this._applyBgMode(mode);
    });

    document.getElementById('setting-dark-mode').addEventListener('change', (e) => {
      const dark = e.target.checked;
      setPreference('darkMode', dark);
      document.body.classList.toggle('light-mode', !dark);
    });

    document.getElementById('setting-show-dots').addEventListener('change', (e) => {
      const show = e.target.checked;
      setPreference('showDots', show);
      this.moodGrid.showDots = show;
      this.moodGrid.render();
    });
  }

  _loadSettings() {
    const vuStyle = getPreference('vuStyle', 'analog');
    const bgMode = getPreference('bgMode', 'artwork');
    const darkMode = getPreference('darkMode', true);
    const showDots = getPreference('showDots', true);

    document.getElementById('setting-vu-style').value = vuStyle;
    document.getElementById('setting-bg-mode').value = bgMode;
    document.getElementById('setting-dark-mode').checked = darkMode;
    document.getElementById('setting-show-dots').checked = showDots;

    this.vuLeft.setStyle(vuStyle);
    this.vuRight.setStyle(vuStyle);
    this.vuLeft.start();
    this.vuRight.start();

    document.body.classList.toggle('light-mode', !darkMode);
    this.moodGrid.showDots = showDots;
    this._applyBgMode(bgMode);
  }

  _applyBgMode(mode) {
    document.body.classList.remove('bg-artwork', 'bg-gradient');
    const gridPanel = document.getElementById('grid-panel');

    if (mode === 'artwork') {
      document.body.classList.add('bg-artwork');
    } else if (mode === 'gradient') {
      document.body.classList.add('bg-gradient');
      gridPanel.style.backgroundImage = '';
    } else {
      gridPanel.style.backgroundImage = '';
    }
  }

  _closeAllOverlays() {
    document.querySelectorAll('.overlay').forEach((el) => {
      el.classList.add('hidden');
    });
  }
}
