/**
 * Audio player using Web Audio API.
 * Provides playback controls and analyser nodes for VU meters.
 */

import { getFileFromHandle } from '../import/importer.js';

export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.analyserLeft = null;
    this.analyserRight = null;
    this.gainNode = null;
    this.splitter = null;

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    this.currentTrack = null;
    this.isPlaying = false;
    this.duration = 0;
    this.currentTime = 0;

    // Callbacks
    this.onStateChange = null; // (isPlaying) => void
    this.onTimeUpdate = null; // (currentTime, duration) => void
    this.onTrackEnd = null; // () => void
    this.onError = null; // (error) => void

    this._setupAudioElement();
  }

  _ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();

      // Create analyser nodes for left and right channels
      this.analyserLeft = this.audioContext.createAnalyser();
      this.analyserLeft.fftSize = 256;
      this.analyserLeft.smoothingTimeConstant = 0.8;

      this.analyserRight = this.audioContext.createAnalyser();
      this.analyserRight.fftSize = 256;
      this.analyserRight.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.splitter = this.audioContext.createChannelSplitter(2);

      // Connect: source → gain → splitter → analysers → destination
      this.gainNode.connect(this.splitter);
      this.splitter.connect(this.analyserLeft, 0);
      this.splitter.connect(this.analyserRight, 1);
      this.gainNode.connect(this.audioContext.destination);

      // Connect audio element
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
      this.sourceNode.connect(this.gainNode);
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  _setupAudioElement() {
    this.audioElement.addEventListener('timeupdate', () => {
      this.currentTime = this.audioElement.currentTime;
      this.duration = this.audioElement.duration || 0;
      this.onTimeUpdate?.(this.currentTime, this.duration);
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.onStateChange?.(false);
      this.onTrackEnd?.();
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.onStateChange?.(true);
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.onStateChange?.(false);
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      this.onError?.(e);
    });
  }

  /**
   * Load a track for playback.
   * @param {object} track - Track object with fileHandle
   */
  async loadTrack(track) {
    this._ensureContext();

    // Revoke previous object URL
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
      this._objectUrl = null;
    }

    try {
      const file = await getFileFromHandle(track.fileHandle);
      this._objectUrl = URL.createObjectURL(file);
      this.audioElement.src = this._objectUrl;
      this.currentTrack = track;
      this.audioElement.load();
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  async play() {
    this._ensureContext();
    try {
      await this.audioElement.play();
    } catch (err) {
      this.onError?.(err);
    }
  }

  pause() {
    this.audioElement.pause();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time) {
    if (isFinite(time) && this.audioElement.duration) {
      this.audioElement.currentTime = Math.max(0, Math.min(time, this.audioElement.duration));
    }
  }

  seekPercent(percent) {
    if (this.audioElement.duration) {
      this.seek(percent * this.audioElement.duration);
    }
  }

  setVolume(vol) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  getAnalysers() {
    return {
      left: this.analyserLeft,
      right: this.analyserRight,
    };
  }

  destroy() {
    this.audioElement.pause();
    this.audioElement.src = '';
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
