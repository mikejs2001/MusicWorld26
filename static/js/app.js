const audio = new Audio();
let currentPlaylist = [];
let currentTrackIndex = -1;
let isPlaying = false;

// DOM elements
const moodGrid = document.getElementById("mood-grid");
const trackList = document.getElementById("track-list");
const playlistTitle = document.getElementById("playlist-title");
const playlistEmpty = document.getElementById("playlist-empty");
const trackCount = document.getElementById("track-count");
const uploadArea = document.getElementById("upload-area");
const fileInput = document.getElementById("file-input");
const uploadStatus = document.getElementById("upload-status");
const playerBar = document.getElementById("player-bar");
const playerTrackName = document.getElementById("player-track-name");
const btnPrev = document.getElementById("btn-prev");
const btnPlay = document.getElementById("btn-play");
const btnNext = document.getElementById("btn-next");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");
const timeElapsed = document.getElementById("time-elapsed");
const timeDuration = document.getElementById("time-duration");

// Load moods on startup
async function loadMoods() {
    const res = await fetch("/api/moods");
    const moods = await res.json();

    moodGrid.innerHTML = "";
    for (const [key, mood] of Object.entries(moods)) {
        const btn = document.createElement("div");
        btn.className = "mood-btn";
        btn.style.color = mood.color;
        btn.dataset.mood = key;
        btn.innerHTML = `
            <span class="mood-icon">${mood.icon}</span>
            <span class="mood-label">${mood.label}</span>
            <span class="mood-desc">${mood.description}</span>
        `;
        btn.addEventListener("click", () => selectMood(key, btn));
        moodGrid.appendChild(btn);
    }
}

// Select a mood and load matching playlist
async function selectMood(moodKey, btn) {
    document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    playlistTitle.textContent = `${btn.querySelector(".mood-label").textContent} Playlist`;
    trackList.innerHTML = '<div class="loading"><span class="spinner"></span>Finding tracks...</div>';
    playlistEmpty.style.display = "none";
    trackCount.textContent = "";

    const res = await fetch(`/api/mood/${moodKey}`);
    if (!res.ok) {
        const err = await res.json();
        trackList.innerHTML = "";
        playlistEmpty.textContent = err.error || "No tracks found";
        playlistEmpty.style.display = "block";
        return;
    }

    const data = await res.json();
    currentPlaylist = data.tracks;

    if (currentPlaylist.length === 0) {
        trackList.innerHTML = "";
        playlistEmpty.textContent = "No tracks match this mood yet. Upload some music!";
        playlistEmpty.style.display = "block";
        return;
    }

    trackCount.textContent = `${currentPlaylist.length} track${currentPlaylist.length !== 1 ? "s" : ""}`;
    renderPlaylist();
}

function renderPlaylist() {
    trackList.innerHTML = "";
    playlistEmpty.style.display = "none";

    currentPlaylist.forEach((track, i) => {
        const li = document.createElement("li");
        li.className = "track-item" + (i === currentTrackIndex ? " playing" : "");
        li.innerHTML = `
            <span class="track-num">${i + 1}</span>
            <div class="track-info">
                <div class="track-title">${track.title}</div>
                <div class="track-meta">${track.bpm} BPM &middot; Energy ${Math.round(track.energy * 100)}%</div>
            </div>
            <span class="track-match">${Math.round(track.mood_score * 100)}% match</span>
        `;
        li.addEventListener("click", () => playTrack(i));
        trackList.appendChild(li);
    });
}

// Playback
function playTrack(index) {
    if (index < 0 || index >= currentPlaylist.length) return;

    currentTrackIndex = index;
    const track = currentPlaylist[index];

    audio.src = `/audio/${track.filename}`;
    audio.play();
    isPlaying = true;

    playerTrackName.textContent = track.title;
    btnPlay.textContent = "\u23f8";
    playerBar.classList.add("visible");

    renderPlaylist();
}

function togglePlay() {
    if (!audio.src) return;
    if (isPlaying) {
        audio.pause();
        btnPlay.textContent = "\u25b6";
    } else {
        audio.play();
        btnPlay.textContent = "\u23f8";
    }
    isPlaying = !isPlaying;
}

function playNext() {
    if (currentTrackIndex < currentPlaylist.length - 1) {
        playTrack(currentTrackIndex + 1);
    }
}

function playPrev() {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
    } else if (currentTrackIndex > 0) {
        playTrack(currentTrackIndex - 1);
    }
}

// Player controls
btnPlay.addEventListener("click", togglePlay);
btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);

audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = pct + "%";
        timeElapsed.textContent = formatTime(audio.currentTime);
        timeDuration.textContent = formatTime(audio.duration);
    }
});

audio.addEventListener("ended", playNext);

progressBar.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
});

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

// File upload
uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    if (files.length) uploadFiles(files);
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length) uploadFiles(fileInput.files);
});

async function uploadFiles(files) {
    let uploaded = 0;
    let failed = 0;

    for (const file of files) {
        uploadStatus.innerHTML = `<span class="spinner"></span>Uploading ${file.name}...`;

        const form = new FormData();
        form.append("file", file);

        try {
            const res = await fetch("/api/upload", { method: "POST", body: form });
            const data = await res.json();

            if (res.ok) {
                uploaded++;
                uploadStatus.innerHTML = `<span class="spinner"></span>${file.name} uploaded, analyzing audio...`;
            } else {
                failed++;
                uploadStatus.textContent = data.error || "Upload failed";
            }
        } catch {
            failed++;
            uploadStatus.textContent = "Upload error — server unreachable";
        }
    }

    const total = uploaded + failed;
    if (uploaded > 0) {
        uploadStatus.textContent = `${uploaded}/${total} track${total > 1 ? "s" : ""} uploaded and being analyzed. Refresh moods in a moment.`;
    }

    fileInput.value = "";
}

// Init
loadMoods();
