/**
 * Library import system: folder selection, recursive scanning, metadata extraction.
 * Uses File System Access API and music-metadata-browser.
 */

import * as musicMetadata from 'music-metadata-browser';
import { addTrack, getTrack } from '../db/store.js';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.weba']);

function getExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

function generateId(relativePath) {
  // Simple hash based on path for deduplication
  let hash = 0;
  for (let i = 0; i < relativePath.length; i++) {
    hash = ((hash << 5) - hash + relativePath.charCodeAt(i)) | 0;
  }
  return 'trk_' + Math.abs(hash).toString(36) + '_' + relativePath.length.toString(36);
}

/**
 * Recursively scan a directory handle and collect audio files.
 */
async function scanDirectory(dirHandle, path = '', files = []) {
  for await (const entry of dirHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;

    if (entry.kind === 'file') {
      const ext = getExtension(entry.name);
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        files.push({ handle: entry, path: entryPath, name: entry.name });
      }
    } else if (entry.kind === 'directory') {
      await scanDirectory(entry, entryPath, files);
    }
  }
  return files;
}

/**
 * Extract metadata from a File using music-metadata-browser.
 */
async function extractMetadata(file, relativePath) {
  try {
    const metadata = await musicMetadata.parseBlob(file, { skipPostHeaders: true });
    const common = metadata.common || {};
    const format = metadata.format || {};

    let artworkUrl = null;
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      const blob = new Blob([pic.data], { type: pic.format });
      artworkUrl = URL.createObjectURL(blob);
    }

    return {
      title: common.title || file.name.replace(/\.[^.]+$/, ''),
      artist: common.artist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      duration: format.duration || 0,
      sampleRate: format.sampleRate || 44100,
      artworkUrl,
      artworkData: common.picture?.[0]
        ? { data: Array.from(common.picture[0].data), format: common.picture[0].format }
        : null,
    };
  } catch {
    return {
      title: file.name.replace(/\.[^.]+$/, ''),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: 0,
      sampleRate: 44100,
      artworkUrl: null,
      artworkData: null,
    };
  }
}

/**
 * Import tracks from a folder selection.
 * @param {function} onProgress - Callback: ({ phase, current, total, trackName })
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<number>} Number of newly imported tracks
 */
export async function importFromFolder(onProgress, signal) {
  // Open directory picker
  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'read' });
  } catch (err) {
    if (err.name === 'AbortError') return 0;
    throw err;
  }

  // Scan for audio files
  onProgress?.({ phase: 'scanning', current: 0, total: 0, trackName: '' });
  const audioFiles = await scanDirectory(dirHandle);

  if (audioFiles.length === 0) {
    onProgress?.({ phase: 'done', current: 0, total: 0, trackName: '' });
    return 0;
  }

  let imported = 0;
  const total = audioFiles.length;

  for (let i = 0; i < audioFiles.length; i++) {
    if (signal?.aborted) break;

    const entry = audioFiles[i];
    const id = generateId(entry.path);

    // Skip if already imported
    const existing = await getTrack(id);
    if (existing && existing.analyzed) {
      onProgress?.({ phase: 'importing', current: i + 1, total, trackName: entry.name, skipped: true });
      continue;
    }

    try {
      const file = await entry.handle.getFile();
      const meta = await extractMetadata(file, entry.path);

      const track = {
        id,
        fileName: entry.name,
        relativePath: entry.path,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        duration: meta.duration,
        sampleRate: meta.sampleRate,
        artworkData: meta.artworkData,
        // Analysis fields - to be filled by analyzer
        bpm: null,
        bpmConfidence: null,
        bpmCandidates: null,
        valence: null,
        energy: null,
        analyzed: false,
        // Store file handle for later playback
        fileHandle: entry.handle,
        importedAt: Date.now(),
      };

      await addTrack(track);
      imported++;

      onProgress?.({ phase: 'importing', current: i + 1, total, trackName: entry.name });
    } catch (err) {
      console.warn(`Failed to import ${entry.name}:`, err);
      onProgress?.({ phase: 'importing', current: i + 1, total, trackName: entry.name, error: true });
    }
  }

  onProgress?.({ phase: 'done', current: total, total, trackName: '' });
  return imported;
}

/**
 * Re-read a file from its stored handle (for playback).
 */
export async function getFileFromHandle(fileHandle) {
  try {
    // Request permission if needed
    const permission = await fileHandle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') {
      const newPermission = await fileHandle.requestPermission({ mode: 'read' });
      if (newPermission !== 'granted') {
        throw new Error('File permission denied');
      }
    }
    return await fileHandle.getFile();
  } catch (err) {
    throw new Error(`Cannot read file: ${err.message}`);
  }
}
