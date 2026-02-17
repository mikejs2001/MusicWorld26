/**
 * Audio analysis: BPM detection (onset + autocorrelation) and mood estimation.
 * All processing is deterministic and repeatable.
 */

import { getTrack, updateTrack, getAllTracks } from '../db/store.js';
import { getFileFromHandle } from '../import/importer.js';

// --- FFT Implementation (radix-2 Cooley-Tukey) ---

function fftReal(signal) {
  const n = signal.length;
  // Pad to next power of 2 if needed
  const size = nextPow2(n);
  const re = new Float32Array(size);
  const im = new Float32Array(size);
  for (let i = 0; i < n; i++) re[i] = signal[i];
  fftInPlace(re, im, false);
  return { re, im };
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function fftInPlace(re, im, inverse) {
  const n = re.length;
  // Bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = ((inverse ? -1 : 1) * 2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const a = i + j;
        const b = i + j + halfLen;
        const tRe = curRe * re[b] - curIm * im[b];
        const tIm = curRe * im[b] + curIm * re[b];
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

function computeMagnitudes(re, im, count) {
  const mags = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return mags;
}

// --- Windowing ---

function hannWindow(size) {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

// --- Audio Utilities ---

function mixToMono(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i];
    }
  }

  if (numChannels > 1) {
    const scale = 1 / numChannels;
    for (let i = 0; i < length; i++) mono[i] *= scale;
  }

  return mono;
}

function downsample(samples, factor) {
  const len = Math.floor(samples.length / factor);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = samples[i * factor];
  }
  return out;
}

// --- Onset Detection (Spectral Flux) ---

function computeOnsetEnvelope(samples, sampleRate) {
  const frameSize = 1024;
  const hopSize = 512;
  const window = hannWindow(frameSize);
  const numFrames = Math.floor((samples.length - frameSize) / hopSize);

  if (numFrames < 2) return new Float32Array(0);

  const envelope = new Float32Array(numFrames);
  let prevMags = null;
  const fftSize = nextPow2(frameSize);
  const numBins = fftSize >> 1;

  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;

    // Windowed frame
    const re = new Float32Array(fftSize);
    const im = new Float32Array(fftSize);
    for (let j = 0; j < frameSize; j++) {
      re[j] = samples[start + j] * window[j];
    }

    fftInPlace(re, im, false);
    const mags = computeMagnitudes(re, im, numBins);

    if (prevMags) {
      let flux = 0;
      for (let j = 0; j < numBins; j++) {
        const diff = mags[j] - prevMags[j];
        if (diff > 0) flux += diff;
      }
      envelope[i] = flux;
    }

    prevMags = mags;
  }

  return { envelope, hopSize };
}

// --- Autocorrelation ---

function autocorrelate(signal, minLag, maxLag) {
  const n = signal.length;
  const result = new Float32Array(maxLag - minLag + 1);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    const count = n - lag;
    for (let i = 0; i < count; i++) {
      sum += signal[i] * signal[i + lag];
    }
    result[lag - minLag] = sum / count;
  }

  return result;
}

// --- Peak Detection ---

function findPeaks(acf, minLag) {
  const peaks = [];

  for (let i = 1; i < acf.length - 1; i++) {
    if (acf[i] > acf[i - 1] && acf[i] > acf[i + 1] && acf[i] > 0) {
      peaks.push({ lag: i + minLag, value: acf[i] });
    }
  }

  // Sort by strength
  peaks.sort((a, b) => b.value - a.value);
  return peaks.slice(0, 10);
}

// --- BPM Detection ---

function detectBPM(audioBuffer) {
  const samples = mixToMono(audioBuffer);
  const sr = audioBuffer.sampleRate;

  // Downsample to ~11025 Hz for faster processing
  const dsFactor = Math.max(1, Math.floor(sr / 11025));
  const dsSamples = dsFactor > 1 ? downsample(samples, dsFactor) : samples;
  const dsSr = sr / dsFactor;

  // Limit analysis to first 60 seconds for performance
  const maxSamples = Math.min(dsSamples.length, dsSr * 60);
  const analysisBuffer = dsSamples.subarray(0, maxSamples);

  // Compute onset envelope
  const { envelope, hopSize } = computeOnsetEnvelope(analysisBuffer, dsSr);

  if (envelope.length < 10) {
    return { bpm: 120, bpmConfidence: 0, bpmCandidates: [] };
  }

  // Normalize envelope
  let maxEnv = 0;
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] > maxEnv) maxEnv = envelope[i];
  }
  if (maxEnv > 0) {
    for (let i = 0; i < envelope.length; i++) envelope[i] /= maxEnv;
  }

  // Threshold: keep values above mean
  let mean = 0;
  for (let i = 0; i < envelope.length; i++) mean += envelope[i];
  mean /= envelope.length;
  for (let i = 0; i < envelope.length; i++) {
    envelope[i] = Math.max(0, envelope[i] - mean);
  }

  // Autocorrelation with BPM range 50-220
  const minBPM = 50;
  const maxBPM = 220;
  const envelopeRate = dsSr / hopSize; // frames per second
  const minLag = Math.max(1, Math.floor((60 / maxBPM) * envelopeRate));
  const maxLag = Math.min(envelope.length - 1, Math.ceil((60 / minBPM) * envelopeRate));

  if (minLag >= maxLag) {
    return { bpm: 120, bpmConfidence: 0, bpmCandidates: [] };
  }

  const acf = autocorrelate(envelope, minLag, maxLag);
  const peaks = findPeaks(acf, minLag);

  if (peaks.length === 0) {
    return { bpm: 120, bpmConfidence: 0, bpmCandidates: [] };
  }

  // Convert peaks to BPM candidates
  const candidates = peaks.map((p) => ({
    bpm: Math.round(((60 * envelopeRate) / p.lag) * 10) / 10,
    strength: p.value,
  }));

  // Apply half/double time preference: prefer 70-150 BPM range
  const preferred = adjustHalfDoubleTime(candidates);

  // Confidence based on relative peak strength
  const maxStrength = Math.max(...candidates.map((c) => c.strength));
  const confidence = maxStrength > 0 ? Math.min(1, preferred[0].strength / maxStrength) : 0;

  return {
    bpm: Math.round(preferred[0].bpm),
    bpmConfidence: Math.round(confidence * 100) / 100,
    bpmCandidates: preferred.slice(0, 5).map((c) => ({
      bpm: Math.round(c.bpm),
      strength: Math.round(c.strength * 1000) / 1000,
    })),
  };
}

function adjustHalfDoubleTime(candidates) {
  const IDEAL_MIN = 70;
  const IDEAL_MAX = 150;

  return candidates
    .map((c) => {
      let bpm = c.bpm;
      let adjusted = false;

      // Try to bring BPM into preferred range
      if (bpm < IDEAL_MIN && bpm * 2 <= 220) {
        bpm *= 2;
        adjusted = true;
      } else if (bpm > IDEAL_MAX && bpm / 2 >= 50) {
        bpm /= 2;
        adjusted = true;
      }

      // Score: prefer values in ideal range
      const inRange = bpm >= IDEAL_MIN && bpm <= IDEAL_MAX;
      const rangeBonus = inRange ? 1.2 : 1.0;
      const adjustPenalty = adjusted ? 0.9 : 1.0;

      return {
        bpm,
        strength: c.strength * rangeBonus * adjustPenalty,
        original: c.bpm,
      };
    })
    .sort((a, b) => b.strength - a.strength);
}

// --- Mood/Valence Estimation ---

function estimateValence(audioBuffer) {
  const samples = mixToMono(audioBuffer);
  const sr = audioBuffer.sampleRate;

  // Use a subsample for efficiency (first 30 seconds)
  const maxSamples = Math.min(samples.length, sr * 30);
  const analysis = samples.subarray(0, maxSamples);

  const frameSize = 2048;
  const hopSize = 1024;
  const window = hannWindow(frameSize);
  const numFrames = Math.floor((analysis.length - frameSize) / hopSize);

  if (numFrames < 2) return { valence: 0.5, energy: 0.5 };

  let totalCentroid = 0;
  let totalFlatness = 0;
  let totalRMS = 0;
  const fftSize = nextPow2(frameSize);
  const numBins = fftSize >> 1;

  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;

    // Windowed frame
    const re = new Float32Array(fftSize);
    const im = new Float32Array(fftSize);
    for (let j = 0; j < frameSize; j++) {
      re[j] = analysis[start + j] * window[j];
    }

    fftInPlace(re, im, false);
    const mags = computeMagnitudes(re, im, numBins);

    // Spectral centroid (normalized 0-1)
    let magSum = 0;
    let weightedSum = 0;
    for (let j = 0; j < numBins; j++) {
      magSum += mags[j];
      weightedSum += mags[j] * j;
    }
    const centroid = magSum > 0 ? weightedSum / magSum / numBins : 0.5;
    totalCentroid += centroid;

    // Spectral flatness: geometric mean / arithmetic mean
    let logSum = 0;
    let arithmeticSum = 0;
    let nonZero = 0;
    for (let j = 0; j < numBins; j++) {
      if (mags[j] > 1e-10) {
        logSum += Math.log(mags[j]);
        nonZero++;
      }
      arithmeticSum += mags[j];
    }
    const geomMean = nonZero > 0 ? Math.exp(logSum / nonZero) : 0;
    const arithMean = arithmeticSum / numBins;
    const flatness = arithMean > 0 ? geomMean / arithMean : 0;
    totalFlatness += flatness;

    // RMS
    let rms = 0;
    for (let j = start; j < start + frameSize && j < analysis.length; j++) {
      rms += analysis[j] * analysis[j];
    }
    rms = Math.sqrt(rms / frameSize);
    totalRMS += rms;
  }

  const avgCentroid = totalCentroid / numFrames;
  const avgFlatness = totalFlatness / numFrames;
  const avgRMS = totalRMS / numFrames;

  // Map to valence (0 = sad, 1 = happy)
  // Higher centroid (brighter) → happier
  // Lower flatness (more tonal) → happier
  // Moderate energy → slightly happier
  const centroidScore = Math.min(1, avgCentroid * 3); // Scale up, typically 0-0.3
  const tonalScore = 1 - Math.min(1, avgFlatness * 2);
  const energyScore = Math.min(1, avgRMS * 5); // Scale up, typically 0-0.2

  const valence = 0.5 * centroidScore + 0.3 * tonalScore + 0.2 * energyScore;

  return {
    valence: Math.round(Math.max(0, Math.min(1, valence)) * 1000) / 1000,
    energy: Math.round(Math.max(0, Math.min(1, energyScore)) * 1000) / 1000,
  };
}

// --- Main Analysis Pipeline ---

/**
 * Decode an audio file to an AudioBuffer using OfflineAudioContext.
 */
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new OfflineAudioContext(1, 1, 44100);
  return audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Analyze a single track: detect BPM and estimate mood.
 */
export async function analyzeTrack(trackId) {
  const track = await getTrack(trackId);
  if (!track || !track.fileHandle) {
    throw new Error(`Track not found or no file handle: ${trackId}`);
  }

  const file = await getFileFromHandle(track.fileHandle);
  const audioBuffer = await decodeAudioFile(file);

  // Update duration if it was missing
  const duration = audioBuffer.duration;

  const bpmResult = detectBPM(audioBuffer);
  const moodResult = estimateValence(audioBuffer);

  const analysisData = {
    bpm: bpmResult.bpm,
    bpmConfidence: bpmResult.bpmConfidence,
    bpmCandidates: bpmResult.bpmCandidates,
    valence: moodResult.valence,
    energy: moodResult.energy,
    duration: duration,
    analyzed: true,
    analyzedAt: Date.now(),
  };

  await updateTrack(trackId, analysisData);
  return analysisData;
}

/**
 * Analyze all unanalyzed tracks in the library.
 * @param {function} onProgress - Callback: ({ current, total, trackName })
 * @param {AbortSignal} signal
 */
export async function analyzeAllUnanalyzed(onProgress, signal) {
  const tracks = await getAllTracks();
  const unanalyzed = tracks.filter((t) => !t.analyzed);

  for (let i = 0; i < unanalyzed.length; i++) {
    if (signal?.aborted) break;

    const track = unanalyzed[i];
    onProgress?.({ current: i + 1, total: unanalyzed.length, trackName: track.title });

    try {
      await analyzeTrack(track.id);
    } catch (err) {
      console.warn(`Analysis failed for ${track.title}:`, err);
    }
  }
}

/**
 * Reanalyze all tracks (including already analyzed ones).
 * @param {function} onProgress
 * @param {AbortSignal} signal
 */
export async function reanalyzeAll(onProgress, signal) {
  const tracks = await getAllTracks();

  for (let i = 0; i < tracks.length; i++) {
    if (signal?.aborted) break;

    const track = tracks[i];
    onProgress?.({ current: i + 1, total: tracks.length, trackName: track.title });

    try {
      await analyzeTrack(track.id);
    } catch (err) {
      console.warn(`Reanalysis failed for ${track.title}:`, err);
    }
  }
}
