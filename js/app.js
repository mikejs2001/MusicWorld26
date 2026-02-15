/* app.js — main controller: wires views, menu, player & mood grid together */

(async function () {
    'use strict';

    /* ============================================================
       Init
       ============================================================ */
    await Library.init();
    Analyzer.init();
    Player.init();

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    /* Canvases */
    MoodGrid.init($('#mood-grid-canvas'));
    VUMeters.init($('#vu-canvas-left'), $('#vu-canvas-right'));

    /* Load persisted settings */
    let vuStyle = localStorage.getItem('mw26_vu') || 'needle';
    let bgStyle = localStorage.getItem('mw26_bg') || 'blur';
    VUMeters.setStyle(vuStyle);
    applyBgStyle();

    /* Restore radio buttons */
    const vuRadio = $(`input[name="vu-style"][value="${vuStyle}"]`);
    if (vuRadio) vuRadio.checked = true;
    const bgRadio = $(`input[name="bg-style"][value="${bgStyle}"]`);
    if (bgRadio) bgRadio.checked = true;

    /* Load existing library into mood grid */
    await refreshGrid();

    /* ============================================================
       Navigation
       ============================================================ */
    $$('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.menu-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.view').forEach(v => v.classList.remove('active'));
            $(`#view-${btn.dataset.view}`).classList.add('active');
            if (btn.dataset.view === 'mood-grid') MoodGrid.resize();
            if (btn.dataset.view === 'add-tracks') renderTrackList();
        });
    });

    /* ============================================================
       Mood Grid — selection & playlist generation
       ============================================================ */
    MoodGrid.onSelect = () => {
        $('#btn-play-selection').disabled = false;
        $('#btn-play-selection').textContent = 'Play from here';
    };

    $('#btn-play-selection').addEventListener('click', async () => {
        const size = Number($('#playlist-size').value);
        const ids  = MoodGrid.getTracksNearSelection(size);
        if (ids.length === 0) return;

        Player.setPlaylist(ids, size === 0);
        await Player.start();
        showPlayer();
    });

    /* ============================================================
       Add Tracks
       ============================================================ */
    $('#btn-add-files').addEventListener('click', () => $('#file-input').click());
    $('#btn-add-folder').addEventListener('click', () => $('#folder-input').click());

    $('#file-input').addEventListener('change', (e) => importFiles(Array.from(e.target.files)));
    $('#folder-input').addEventListener('change', (e) => importFiles(Array.from(e.target.files)));

    async function importFiles(files) {
        /* Filter to audio files */
        files = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav|flac|aac|wma|opus)$/i.test(f.name));
        if (files.length === 0) return;

        const prog     = $('#analysis-progress');
        const fill     = $('#progress-fill');
        const text     = $('#progress-text');
        const status   = $('#analysis-status');
        prog.hidden    = false;
        status.textContent = 'Analysing tracks…';

        for (let i = 0; i < files.length; i++) {
            text.textContent  = `${i + 1} / ${files.length}`;
            fill.style.width  = `${((i + 1) / files.length) * 100}%`;
            status.textContent = `Analysing: ${files[i].name}`;

            try {
                const result = await Analyzer.analyzeFile(files[i]);
                const meta = { ...result };
                delete meta._audioBlob;
                delete meta._artworkBlob;
                await Library.addTrack(meta, result._audioBlob, result._artworkBlob);
            } catch (err) {
                console.warn('Skipping', files[i].name, err);
            }
        }

        status.textContent = 'Done!';
        setTimeout(() => { prog.hidden = true; }, 1500);

        await refreshGrid();
        renderTrackList();

        /* Reset file inputs so re-selecting same files works */
        $('#file-input').value  = '';
        $('#folder-input').value = '';
    }

    /* ============================================================
       Track list in Add Tracks view
       ============================================================ */
    async function renderTrackList() {
        const tracks = await Library.getAllTracks();
        $('#track-count').textContent = `(${tracks.length} track${tracks.length !== 1 ? 's' : ''})`;

        const list = $('#track-list');
        list.innerHTML = '';

        tracks.forEach(t => {
            const el = document.createElement('div');
            el.className = 'track-item';
            const hue = 120 + (1 - t.moodX) * 120;
            el.innerHTML = `
                <span class="dot" style="background:hsl(${hue * t.moodX + 30 * (1 - t.moodX)},70%,55%)"></span>
                <div class="meta">
                    <div class="title">${esc(t.name)}</div>
                    <div class="artist">${esc(t.artist)}</div>
                </div>
                <span class="bpm">${t.bpm} bpm</span>
                <button class="remove-btn" data-id="${t.id}" title="Remove">&times;</button>
            `;
            list.appendChild(el);
        });

        /* Remove buttons */
        list.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await Library.removeTrack(Number(btn.dataset.id));
                await refreshGrid();
                renderTrackList();
            });
        });
    }

    /* ============================================================
       Settings
       ============================================================ */
    $$('input[name="vu-style"]').forEach(r => {
        r.addEventListener('change', () => {
            vuStyle = r.value;
            localStorage.setItem('mw26_vu', vuStyle);
            VUMeters.setStyle(vuStyle);
        });
    });

    $$('input[name="bg-style"]').forEach(r => {
        r.addEventListener('change', () => {
            bgStyle = r.value;
            localStorage.setItem('mw26_bg', bgStyle);
            applyBgStyle();
        });
    });

    $('#btn-clear-library').addEventListener('click', async () => {
        if (!confirm('Clear your entire music library? This cannot be undone.')) return;
        await Library.clearAll();
        await refreshGrid();
        renderTrackList();
    });

    $('#btn-reanalyze').addEventListener('click', async () => {
        alert('To re-analyse, please clear the library and re-add your music folders. (Full re-analysis from stored audio is planned for a future update.)');
    });

    /* ============================================================
       Player UI
       ============================================================ */
    const playerEl   = $('#player');
    const miniEl     = $('#mini-player');
    let   currentTrack = null;

    function showPlayer() {
        playerEl.classList.remove('hidden');
        miniEl.classList.add('hidden');
    }
    function minimisePlayer() {
        playerEl.classList.add('hidden');
        miniEl.classList.remove('hidden');
    }

    $('#btn-minimize').addEventListener('click', minimisePlayer);
    $('#mini-expand').addEventListener('click', showPlayer);

    /* Transport — full player */
    $('#btn-play-pause').addEventListener('click', () => Player.togglePlayPause());
    $('#btn-next').addEventListener('click', () => Player.next());
    $('#btn-prev').addEventListener('click', () => Player.prev());
    $('#btn-stop').addEventListener('click', () => { Player.stop(); playerEl.classList.add('hidden'); miniEl.classList.add('hidden'); });

    /* Transport — mini player */
    $('#mini-play-pause').addEventListener('click', () => Player.togglePlayPause());
    $('#mini-next').addEventListener('click', () => Player.next());
    $('#mini-prev').addEventListener('click', () => Player.prev());

    /* Callbacks from Player */
    Player.onTrackChange = async (trackId) => {
        currentTrack = await Library.getTrack(trackId);
        if (!currentTrack) return;

        $('#now-playing-name').textContent   = currentTrack.name;
        $('#now-playing-artist').textContent = currentTrack.artist;
        $('#mini-track-name').textContent    = currentTrack.name;
        $('#mini-track-artist').textContent  = currentTrack.artist;

        /* Artwork background */
        const artBlob = await Library.getArtwork(trackId);
        if (artBlob) {
            const url = URL.createObjectURL(artBlob);
            $('#player-bg').style.backgroundImage = `url(${url})`;
        } else {
            $('#player-bg').style.backgroundImage = 'none';
        }
        applyBgStyle();
    };

    Player.onPlayStateChange = (playing) => {
        const icon = playing ? '\u23F8' : '\u25B6';     // ⏸ or ▶
        $('#btn-play-pause').innerHTML   = icon;
        $('#mini-play-pause').innerHTML  = icon;
        $('#btn-play-pause').classList.toggle('playing', playing);
    };

    Player.onTimeUpdate = (cur, dur) => {
        if (!isFinite(dur)) return;
        const rem = Math.max(0, dur - cur);
        const m   = Math.floor(rem / 60);
        const s   = Math.floor(rem % 60).toString().padStart(2, '0');
        $('#now-playing-countdown').textContent = `${m}:${s}`;
    };

    Library.getTrack = async function (id) {
        return new Promise((resolve, reject) => {
            const req = this.db.transaction('tracks', 'readonly').objectStore('tracks').get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror   = (e) => reject(e.target.error);
        });
    };

    /* ============================================================
       VU Meter animation loop
       ============================================================ */
    function vuLoop() {
        if (Player.isPlaying) {
            const { left, right } = Player.getLevels();
            VUMeters.update(left, right);
        } else {
            VUMeters.update(0, 0);
        }
        VUMeters.draw();
        requestAnimationFrame(vuLoop);
    }
    vuLoop();

    /* ============================================================
       Helpers
       ============================================================ */
    async function refreshGrid() {
        const tracks = await Library.getAllTracks();
        MoodGrid.setTracks(tracks);
    }

    function applyBgStyle() {
        const bg = $('#player-bg');
        bg.className = '';
        bg.classList.add(bgStyle);
    }

    function esc(str) {
        const el = document.createElement('span');
        el.textContent = str;
        return el.innerHTML;
    }

})();
