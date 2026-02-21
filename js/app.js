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

    /* ============================================================
       Display-name formatter
       Cleans up filenames formatted for older systems:
         the_great_pretender  →  The Great Pretender
         my_song_observer     →  My Song
       Only applies title-case when text looks auto-formatted
       (all-lowercase or all-uppercase). Mixed-case ID3 tags
       are left as-is.
       ============================================================ */
    const _smallWords = new Set([
        'a','an','the','and','but','or','for','nor',
        'on','at','to','in','of','with','by','is','vs'
    ]);
    function formatDisplay(text) {
        if (!text || text === 'Unknown Artist' || text === 'Unknown Album') return text;
        /* strip known system suffixes */
        text = text.replace(/[_\s]+(observer|remaster(?:ed)?|mono|stereo|explicit|clean|bonus(?:[_\s]*track)?)$/i, '');
        /* underscores → spaces, collapse whitespace */
        text = text.replace(/_/g, ' ').replace(/\s{2,}/g, ' ').trim();
        /* only title-case if the text looks auto-formatted */
        const lc = text.toLowerCase();
        if (text === lc || text === text.toUpperCase()) {
            text = lc.split(' ').map((w, i) => {
                if (i > 0 && _smallWords.has(w)) return w;
                return w.charAt(0).toUpperCase() + w.slice(1);
            }).join(' ');
        }
        return text;
    }

    /* ============================================================
       Fetch album artwork from iTunes Search API (free, no key)
       Returns a Blob on success and caches it in IndexedDB.
       Returns null silently on failure so the player just shows
       a black background.
       ============================================================ */
    async function fetchArtwork(trackName, artistName, trackId) {
        try {
            const term = encodeURIComponent(`${artistName} ${trackName}`.trim());
            const resp = await fetch(
                `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`
            );
            if (!resp.ok) return null;
            const data = await resp.json();
            if (!data.results || !data.results.length) return null;

            /* Get the highest-res artwork available (swap 100x100 → 600x600) */
            const artUrl = data.results[0].artworkUrl100
                ?.replace('100x100bb', '600x600bb');
            if (!artUrl) return null;

            const imgResp = await fetch(artUrl);
            if (!imgResp.ok) return null;
            const blob = await imgResp.blob();

            /* Cache in IndexedDB so we don't re-fetch next time */
            if (trackId) {
                const tx = Library.db.transaction('artwork', 'readwrite');
                tx.objectStore('artwork').put({ trackId, blob });
            }
            return blob;
        } catch {
            return null;
        }
    }

    /* Canvases */
    MoodGrid.init($('#mood-grid-canvas'));
    VUMeters.init($('#vu-canvas-left'), $('#vu-canvas-right'));

    /* Load persisted settings */
    let vuStyle = localStorage.getItem('mw26_vu') || 'needle';
    let bgStyle = localStorage.getItem('mw26_bg') || 'blur';
    VUMeters.setStyle(vuStyle);
    applyBgStyle();

    /* Restore background radio */
    const bgRadio = $(`input[name="bg-style"][value="${bgStyle}"]`);
    if (bgRadio) bgRadio.checked = true;

    /* Build the visual meter picker */
    const meterStyles = [
        { id: 'needle',   name: 'Technics' },
        { id: 'warm',     name: 'Marantz' },
        { id: 'blue',     name: 'Pioneer' },
        { id: 'lcd',      name: 'LCD' },
        { id: 'led',      name: 'LED Bars' },
        { id: 'spectrum', name: 'Spectrum' },
    ];
    const picker = $('#meter-picker');
    const dpr = window.devicePixelRatio || 1;
    meterStyles.forEach(({ id, name }) => {
        const card = document.createElement('div');
        card.className = 'meter-card' + (id === vuStyle ? ' active' : '');
        card.dataset.style = id;

        const cv = document.createElement('canvas');
        const isNeedle = (id === 'needle' || id === 'warm' || id === 'blue');
        const pw = 150, ph = isNeedle ? Math.floor(pw * 0.75) : Math.floor(pw * 0.8);
        cv.width  = pw * dpr;
        cv.height = ph * dpr;
        cv.style.width  = pw + 'px';
        cv.style.height = ph + 'px';
        VUMeters.drawPreview(cv, id);

        const lbl = document.createElement('div');
        lbl.className = 'meter-label';
        lbl.textContent = name;

        card.appendChild(cv);
        card.appendChild(lbl);
        picker.appendChild(card);

        card.addEventListener('click', () => {
            picker.querySelectorAll('.meter-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            vuStyle = id;
            localStorage.setItem('mw26_vu', id);
            VUMeters.setStyle(id);
        });
    });

    /* Load existing library into mood grid */
    await refreshGrid();

    /* ============================================================
       Splash screen — tap to enter fullscreen & dismiss
       ============================================================ */
    const splash = $('#splash');
    if (splash) {
        splash.addEventListener('click', () => {
            document.documentElement.requestFullscreen().catch(() => {});
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 500);
        }, { once: true });
    }

    /* ============================================================
       Navigation — three-dot dropdown
       ============================================================ */
    const menuDotsBtn = $('#menu-dots');
    const menuDropdown = $('#menu-dropdown');

    menuDotsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !menuDropdown.classList.contains('hidden');
        menuDropdown.classList.toggle('hidden', open);
        menuDotsBtn.setAttribute('aria-expanded', !open);
    });

    /* Close dropdown when tapping anywhere outside */
    document.addEventListener('click', () => {
        menuDropdown.classList.add('hidden');
        menuDotsBtn.setAttribute('aria-expanded', 'false');
    });

    $$('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.menu-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.view').forEach(v => v.classList.remove('active'));
            $(`#view-${btn.dataset.view}`).classList.add('active');
            if (btn.dataset.view === 'mood-grid') MoodGrid.resize();
            if (btn.dataset.view === 'browse') renderBrowse();
            if (btn.dataset.view === 'add-tracks') renderTrackList();
            /* Close the dropdown after selection */
            menuDropdown.classList.add('hidden');
            menuDotsBtn.setAttribute('aria-expanded', 'false');
        });
    });

    /* ============================================================
       Fullscreen toggle
       ============================================================ */
    const btnFS = $('#btn-fullscreen');
    function updateFSLabel() {
        btnFS.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
    }

    btnFS.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
        menuDropdown.classList.add('hidden');
        menuDotsBtn.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('fullscreenchange', updateFSLabel);

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
                    <div class="artist">${esc(t.artist)} &middot; ${esc(t.genre || 'Unknown Genre')}</div>
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
       Browse view — Artists / Albums / Genres
       ============================================================ */
    let browseTab = 'artists';
    let browseAllTracks = [];

    $$('.browse-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.browse-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            browseTab = tab.dataset.tab;
            showBrowseList();
        });
    });

    $('#browse-back').addEventListener('click', () => {
        $('#browse-detail').classList.add('hidden');
        $('#browse-content').style.display = '';
        $('#browse-tabs').style.display = '';
    });

    $('#browse-play-all').addEventListener('click', async () => {
        const ids = Array.from($('#browse-detail-tracks').querySelectorAll('.track-item'))
            .map(el => Number(el.dataset.id))
            .filter(id => id);
        if (ids.length === 0) return;
        Player.setPlaylist(ids, false);
        await Player.start();
        showPlayer();
    });

    $('#browse-show-grid').addEventListener('click', () => {
        const ids = new Set(
            Array.from($('#browse-detail-tracks').querySelectorAll('.track-item'))
                .map(el => Number(el.dataset.id))
        );
        const filtered = browseAllTracks.filter(t => ids.has(t.id));
        MoodGrid.setTracks(filtered);
        /* Switch to mood grid view */
        $$('.menu-btn').forEach(b => b.classList.remove('active'));
        $$('.view').forEach(v => v.classList.remove('active'));
        $('[data-view="mood-grid"]').classList.add('active');
        $('#view-mood-grid').classList.add('active');
        MoodGrid.resize();
    });

    async function renderBrowse() {
        browseAllTracks = await Library.getAllTracks();
        showBrowseList();
        /* Reset to list view */
        $('#browse-detail').classList.add('hidden');
        $('#browse-content').style.display = '';
        $('#browse-tabs').style.display = '';
    }

    function showBrowseList() {
        const list = $('#browse-list');
        list.innerHTML = '';

        if (browseAllTracks.length === 0) {
            list.innerHTML = '<p style="color:#555;padding:20px;text-align:center">No tracks in library.</p>';
            return;
        }

        /* Group tracks by the selected tab */
        const groups = {};
        browseAllTracks.forEach(t => {
            let key;
            if (browseTab === 'artists')  key = t.artist || 'Unknown Artist';
            else if (browseTab === 'albums') key = t.album || 'Unknown Album';
            else key = t.genre || 'Unknown Genre';
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        /* Sort by name */
        const sorted = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));

        const icons = { artists: '&#9834;', albums: '&#128191;', genres: '&#9836;' };

        sorted.forEach(([name, tracks]) => {
            const card = document.createElement('div');
            card.className = 'browse-card';
            card.innerHTML = `
                <div class="browse-icon">${icons[browseTab]}</div>
                <div class="browse-info">
                    <div class="browse-name">${esc(name)}</div>
                    <div class="browse-count">${tracks.length} track${tracks.length !== 1 ? 's' : ''}</div>
                </div>
            `;
            card.addEventListener('click', () => showBrowseDetail(name, tracks));
            list.appendChild(card);
        });
    }

    function showBrowseDetail(name, tracks) {
        $('#browse-content').style.display = 'none';
        $('#browse-tabs').style.display = 'none';
        $('#browse-detail').classList.remove('hidden');
        $('#browse-detail-title').textContent = name;

        const list = $('#browse-detail-tracks');
        list.innerHTML = '';

        tracks.forEach(t => {
            const el = document.createElement('div');
            el.className = 'track-item';
            el.dataset.id = t.id;
            el.innerHTML = `
                <div class="meta">
                    <div class="title">${esc(t.name)}</div>
                    <div class="artist">${esc(t.artist)} &middot; ${esc(t.album || 'Unknown Album')}</div>
                </div>
                <span class="bpm">${t.bpm} bpm</span>
            `;
            el.addEventListener('click', async () => {
                Player.setPlaylist([t.id], false);
                await Player.start();
                showPlayer();
            });
            list.appendChild(el);
        });
    }

    /* ============================================================
       Settings
       ============================================================ */
    $$('input[name="bg-style"]').forEach(r => {
        r.addEventListener('change', () => {
            bgStyle = r.value;
            localStorage.setItem('mw26_bg', bgStyle);
            applyBgStyle();
        });
    });

    $('#btn-clear-library').addEventListener('click', async () => {
        if (!confirm('Clear your entire music library? This cannot be undone.')) return;

        /* Stop any playing audio and hide player */
        Player.stop();
        playerEl.classList.add('hidden');
        miniEl.classList.add('hidden');

        /* Clear all visuals immediately for instant feedback */
        $('#track-list').innerHTML = '';
        $('#track-count').textContent = '(0 tracks)';
        MoodGrid.clearSelection();
        MoodGrid.setTracks([]);
        $('#btn-play-selection').disabled = true;
        $('#btn-play-selection').textContent = 'Select a mood on the grid';

        /* Delete and re-create the database */
        try {
            await Library.clearAll();
        } catch (err) {
            console.warn('clearAll error (library visuals already cleared):', err);
        }

        /* Re-render to confirm everything is empty */
        await renderTrackList();
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
        $('#main-content').style.paddingBottom = '';
    }
    function minimisePlayer() {
        playerEl.classList.add('hidden');
        miniEl.classList.remove('hidden');
        $('#main-content').style.paddingBottom = '60px';
    }

    $('#btn-minimize').addEventListener('click', minimisePlayer);
    $('#mini-expand').addEventListener('click', showPlayer);

    /* Transport — full player */
    $('#btn-play-pause').addEventListener('click', () => Player.togglePlayPause());
    $('#btn-next').addEventListener('click', () => Player.next());
    $('#btn-prev').addEventListener('click', () => Player.prev());
    $('#btn-stop').addEventListener('click', () => { Player.stop(); playerEl.classList.add('hidden'); miniEl.classList.add('hidden'); $('#main-content').style.paddingBottom = ''; });

    /* Transport — mini player */
    $('#mini-play-pause').addEventListener('click', () => Player.togglePlayPause());
    $('#mini-next').addEventListener('click', () => Player.next());
    $('#mini-prev').addEventListener('click', () => Player.prev());

    /* Callbacks from Player */
    Player.onTrackChange = async (trackId) => {
        currentTrack = await Library.getTrack(trackId);
        if (!currentTrack) return;

        const dispName   = formatDisplay(currentTrack.name);
        const dispArtist = formatDisplay(currentTrack.artist);
        const rawAlbum   = currentTrack.album;
        const dispAlbum  = (rawAlbum && rawAlbum !== 'Unknown Album')
            ? formatDisplay(rawAlbum) : '';

        $('#now-playing-name').textContent   = dispName;
        $('#now-playing-artist').textContent = dispArtist;
        $('#now-playing-album').textContent  = dispAlbum;
        $('#mini-track-name').textContent    = dispName;
        $('#mini-track-artist').textContent  = dispArtist;

        /* Artwork background — try local, then fetch from iTunes */
        let artBlob = await Library.getArtwork(trackId);
        if (!artBlob) {
            artBlob = await fetchArtwork(dispName, dispArtist, trackId);
        }
        if (artBlob) {
            const url = URL.createObjectURL(artBlob);
            $('#player-bg-fill').style.backgroundImage = `url(${url})`;
            $('#player-bg-art').style.backgroundImage  = `url(${url})`;
        } else {
            $('#player-bg-fill').style.backgroundImage = 'none';
            $('#player-bg-art').style.backgroundImage  = 'none';
        }
        applyBgStyle();
    };

    Player.onPlayStateChange = (playing) => {
        const icon = playing
            ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 21,12 6,21"/></svg>';
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
            const freqData = Player.getFrequencyData();
            VUMeters.update(left, right, freqData);
        } else {
            VUMeters.update(0, 0, null);
        }
        VUMeters.draw();
        requestAnimationFrame(vuLoop);
    }
    vuLoop();

    /* ============================================================
       Orientation — strict portrait/landscape switching
       ============================================================ */
    function updateOrientation() {
        const isLandscape = screen.orientation
            ? screen.orientation.type.startsWith('landscape')
            : window.innerWidth > window.innerHeight;

        document.body.classList.toggle('landscape', isLandscape);
        document.body.classList.toggle('playing', Player.isPlaying);

        /* Resize canvases after layout settles.
           Double rAF: first frame applies the class, second frame
           lets the CSS grid/flexbox reflow finish so element
           dimensions are final before we measure them. */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                VUMeters.resize();
                MoodGrid.resize();
            });
        });
    }

    if (screen.orientation) {
        screen.orientation.addEventListener('change', updateOrientation);
    }
    window.addEventListener('resize', updateOrientation);
    updateOrientation();

    /* Keep body.playing in sync whenever play state changes */
    const _origPlayState = Player.onPlayStateChange;
    Player.onPlayStateChange = (playing) => {
        if (_origPlayState) _origPlayState(playing);
        document.body.classList.toggle('playing', playing);
    };

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
