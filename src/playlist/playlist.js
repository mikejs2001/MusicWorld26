/**
 * Playlist generation: Euclidean distance-based mood matching.
 */

export class PlaylistManager {
  constructor() {
    this.tracks = [];
    this.queue = [];
    this.currentIndex = -1;
    this.recentlyPlayed = []; // Track IDs
    this.maxRecent = 50;
    this.continuous = false;
    this.shuffle = false;   // 'off' or 'on'
    this.repeat = 'off';    // 'off', 'all', 'one'
    this._originalQueue = []; // pre-shuffle order

    // Callbacks
    this.onQueueChanged = null;
    this.onTrackChanged = null;
  }

  setTracks(tracks) {
    this.tracks = tracks.filter((t) => t.analyzed && t.bpm != null && t.valence != null);
  }

  /**
   * Generate playlist from a mood point on the grid.
   * @param {{ x: number, y: number }} moodPoint - Normalized mood (x=valence, y=bpm position)
   * @param {number} size - Number of tracks (0 = continuous mode)
   * @param {{ bpmMin: number, bpmMax: number, valenceMin: number, valenceMax: number }} scaling
   */
  generateFromMood(moodPoint, size, scaling) {
    this.continuous = size === 0;
    const targetSize = this.continuous ? 25 : size;

    // Convert mood point back to absolute values for distance calculation
    const targetValence = scaling.valenceMin + moodPoint.x * (scaling.valenceMax - scaling.valenceMin);
    const targetBpm = scaling.bpmMin + moodPoint.y * (scaling.bpmMax - scaling.bpmMin);

    // Normalize factors for distance calc
    const bpmRange = scaling.bpmMax - scaling.bpmMin || 1;
    const valenceRange = scaling.valenceMax - scaling.valenceMin || 1;

    // Calculate distances
    const scored = this.tracks
      .filter((t) => !this.recentlyPlayed.includes(t.id))
      .map((t) => {
        const dx = (t.valence - targetValence) / valenceRange;
        const dy = (t.bpm - targetBpm) / bpmRange;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { track: t, distance };
      })
      .sort((a, b) => a.distance - b.distance);

    // If not enough tracks after filtering recently played, include them
    let selected = scored.slice(0, targetSize);
    if (selected.length < targetSize) {
      const allScored = this.tracks
        .map((t) => {
          const dx = (t.valence - targetValence) / valenceRange;
          const dy = (t.bpm - targetBpm) / bpmRange;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return { track: t, distance };
        })
        .sort((a, b) => a.distance - b.distance);
      selected = allScored.slice(0, targetSize);
    }

    this.queue = selected.map((s) => s.track);
    this._originalQueue = [...this.queue];
    if (this.shuffle) this._shuffleQueue();
    this.currentIndex = this.queue.length > 0 ? 0 : -1;
    this._moodPoint = moodPoint;
    this._scaling = scaling;
    this._targetSize = targetSize;

    this.onQueueChanged?.(this.queue, this.currentIndex);
    return this.queue;
  }

  getCurrentTrack() {
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) return null;
    return this.queue[this.currentIndex];
  }

  next() {
    if (this.queue.length === 0) return null;

    // Repeat one: restart current track
    if (this.repeat === 'one') {
      this.onQueueChanged?.(this.queue, this.currentIndex);
      this.onTrackChanged?.(this.getCurrentTrack());
      return this.getCurrentTrack();
    }

    // Add current to recently played
    const current = this.getCurrentTrack();
    if (current) {
      this.recentlyPlayed.push(current.id);
      if (this.recentlyPlayed.length > this.maxRecent) {
        this.recentlyPlayed.shift();
      }
    }

    this.currentIndex++;

    // Continuous mode: refill queue when running low
    if (this.continuous && this.currentIndex >= this.queue.length - 3) {
      this._refillQueue();
    }

    if (this.currentIndex >= this.queue.length) {
      // Repeat all: loop back to start
      if (this.repeat === 'all') {
        this.currentIndex = 0;
      } else {
        this.currentIndex = this.queue.length - 1;
        return null;
      }
    }

    this.onQueueChanged?.(this.queue, this.currentIndex);
    this.onTrackChanged?.(this.getCurrentTrack());
    return this.getCurrentTrack();
  }

  previous() {
    if (this.queue.length === 0) return null;

    this.currentIndex = Math.max(0, this.currentIndex - 1);
    this.onQueueChanged?.(this.queue, this.currentIndex);
    this.onTrackChanged?.(this.getCurrentTrack());
    return this.getCurrentTrack();
  }

  jumpTo(index) {
    if (index < 0 || index >= this.queue.length) return null;
    this.currentIndex = index;
    this.onQueueChanged?.(this.queue, this.currentIndex);
    this.onTrackChanged?.(this.getCurrentTrack());
    return this.getCurrentTrack();
  }

  _refillQueue() {
    if (!this._moodPoint || !this._scaling) return;

    const targetValence =
      this._scaling.valenceMin + this._moodPoint.x * (this._scaling.valenceMax - this._scaling.valenceMin);
    const targetBpm = this._scaling.bpmMin + this._moodPoint.y * (this._scaling.bpmMax - this._scaling.bpmMin);
    const bpmRange = this._scaling.bpmMax - this._scaling.bpmMin || 1;
    const valenceRange = this._scaling.valenceMax - this._scaling.valenceMin || 1;

    const existingIds = new Set(this.queue.map((t) => t.id));

    const candidates = this.tracks
      .filter((t) => !existingIds.has(t.id) && !this.recentlyPlayed.includes(t.id))
      .map((t) => {
        const dx = (t.valence - targetValence) / valenceRange;
        const dy = (t.bpm - targetBpm) / bpmRange;
        return { track: t, distance: Math.sqrt(dx * dx + dy * dy) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    for (const c of candidates) {
      this.queue.push(c.track);
    }
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    if (this.queue.length === 0) return this.shuffle;

    const currentTrack = this.getCurrentTrack();
    if (this.shuffle) {
      this._shuffleQueue();
    } else {
      this.queue = [...this._originalQueue];
    }
    // Restore position of currently playing track
    if (currentTrack) {
      this.currentIndex = this.queue.findIndex((t) => t.id === currentTrack.id);
      if (this.currentIndex < 0) this.currentIndex = 0;
    }
    this.onQueueChanged?.(this.queue, this.currentIndex);
    return this.shuffle;
  }

  cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(this.repeat);
    this.repeat = modes[(idx + 1) % modes.length];
    return this.repeat;
  }

  _shuffleQueue() {
    // Fisher-Yates shuffle
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  clear() {
    this.queue = [];
    this._originalQueue = [];
    this.currentIndex = -1;
    this.onQueueChanged?.(this.queue, this.currentIndex);
  }
}
