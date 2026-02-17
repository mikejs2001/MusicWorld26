/**
 * Library import system: file input selection, metadata extraction.
 * Uses built-in ID3 parser (no npm dependencies) and stores audio blobs in IndexedDB.
 * Works on both desktop and mobile (Android).
 */

import { addTrack, getTrack, storeAudioBlob, getStoredAudioBlob } from '../db/store.js';

const SUPPORTED_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/flac', 'audio/x-flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a',
  'audio/ogg', 'audio/webm',
]);

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.weba', '.webm']);

function getExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot).toLowerCase() : '';
}

function isAudioFile(file) {
  if (SUPPORTED_TYPES.has(file.type)) return true;
  return SUPPORTED_EXTENSIONS.has(getExtension(file.name));
}

function generateId(name, size) {
  let hash = 0;
  const key = name + ':' + size;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return 'trk_' + Math.abs(hash).toString(36) + '_' + size.toString(36);
}

// --- Lightweight ID3v2 / ID3v1 Parser ---

function readUTF8(data, offset, length) {
  const bytes = data.subarray(offset, offset + length);
  return new TextDecoder('utf-8').decode(bytes).replace(/\0+$/, '');
}

function readUTF16(data, offset, length) {
  const bytes = data.subarray(offset, offset + length);
  // Check BOM
  const bom = (bytes[0] << 8) | bytes[1];
  const encoding = bom === 0xfffe ? 'utf-16le' : 'utf-16be';
  const start = (bom === 0xfeff || bom === 0xfffe) ? 2 : 0;
  return new TextDecoder(encoding).decode(bytes.subarray(start)).replace(/\0+$/, '');
}

function readID3String(data, offset, length, encoding) {
  if (length <= 0) return '';
  switch (encoding) {
    case 0: // ISO-8859-1
      return readUTF8(data, offset, length);
    case 1: // UTF-16 with BOM
      return readUTF16(data, offset, length);
    case 2: // UTF-16BE
      return new TextDecoder('utf-16be').decode(data.subarray(offset, offset + length)).replace(/\0+$/, '');
    case 3: // UTF-8
      return readUTF8(data, offset, length);
    default:
      return readUTF8(data, offset, length);
  }
}

function parseID3v2(data) {
  const result = { title: '', artist: '', album: '', artwork: null };

  // Check ID3v2 header: "ID3"
  if (data[0] !== 0x49 || data[1] !== 0x44 || data[2] !== 0x33) return result;

  const version = data[3]; // 3 or 4
  const headerSize =
    ((data[6] & 0x7f) << 21) |
    ((data[7] & 0x7f) << 14) |
    ((data[8] & 0x7f) << 7) |
    (data[9] & 0x7f);

  let offset = 10;
  const end = Math.min(10 + headerSize, data.length);

  // Skip extended header if present
  const flags = data[5];
  if (flags & 0x40) {
    const extSize = (data[10] << 24) | (data[11] << 16) | (data[12] << 8) | data[13];
    offset += (version === 4) ? extSize : extSize + 4;
  }

  while (offset < end - 10) {
    const frameId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);

    // Stop at padding
    if (frameId === '\0\0\0\0') break;

    let frameSize;
    if (version === 4) {
      frameSize =
        ((data[offset + 4] & 0x7f) << 21) |
        ((data[offset + 5] & 0x7f) << 14) |
        ((data[offset + 6] & 0x7f) << 7) |
        (data[offset + 7] & 0x7f);
    } else {
      frameSize =
        (data[offset + 4] << 24) |
        (data[offset + 5] << 16) |
        (data[offset + 6] << 8) |
        data[offset + 7];
    }

    if (frameSize <= 0 || offset + 10 + frameSize > end) break;

    const frameData = data.subarray(offset + 10, offset + 10 + frameSize);

    if (frameId === 'TIT2' && frameSize > 1) {
      result.title = readID3String(frameData, 1, frameSize - 1, frameData[0]);
    } else if (frameId === 'TPE1' && frameSize > 1) {
      result.artist = readID3String(frameData, 1, frameSize - 1, frameData[0]);
    } else if (frameId === 'TALB' && frameSize > 1) {
      result.album = readID3String(frameData, 1, frameSize - 1, frameData[0]);
    } else if (frameId === 'APIC' && frameSize > 10) {
      try {
        const encoding = frameData[0];
        // Find end of MIME type (null-terminated)
        let i = 1;
        while (i < frameData.length && frameData[i] !== 0) i++;
        const mimeType = readUTF8(frameData, 1, i - 1) || 'image/jpeg';
        i++; // skip picture type byte
        i++; // skip null after picture type
        // Skip description (null-terminated)
        if (encoding === 0 || encoding === 3) {
          while (i < frameData.length && frameData[i] !== 0) i++;
          i++;
        } else {
          // UTF-16: look for double null
          while (i < frameData.length - 1 && !(frameData[i] === 0 && frameData[i + 1] === 0)) i += 2;
          i += 2;
        }
        if (i < frameData.length) {
          const imageData = frameData.slice(i);
          result.artwork = { data: Array.from(imageData), format: mimeType };
        }
      } catch {
        // Skip artwork on parse error
      }
    }

    offset += 10 + frameSize;
  }

  return result;
}

function parseID3v1(data) {
  const result = { title: '', artist: '', album: '' };

  // ID3v1 is at the last 128 bytes
  if (data.length < 128) return result;
  const tag = data.subarray(data.length - 128);

  if (tag[0] !== 0x54 || tag[1] !== 0x41 || tag[2] !== 0x47) return result; // "TAG"

  result.title = readUTF8(tag, 3, 30).trim();
  result.artist = readUTF8(tag, 33, 30).trim();
  result.album = readUTF8(tag, 63, 30).trim();

  return result;
}

/**
 * Extract metadata from a File object.
 */
async function extractMetadata(file) {
  const cleanName = file.name.replace(/\.[^.]+$/, '');

  try {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Try ID3v2 first (most MP3s)
    let meta = parseID3v2(data);

    // Fallback to ID3v1
    if (!meta.title && !meta.artist) {
      const v1 = parseID3v1(data);
      if (v1.title) meta = { ...meta, ...v1 };
    }

    return {
      title: meta.title || cleanName,
      artist: meta.artist || 'Unknown Artist',
      album: meta.album || 'Unknown Album',
      artworkData: meta.artwork || null,
    };
  } catch {
    return {
      title: cleanName,
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      artworkData: null,
    };
  }
}

/**
 * Trigger a file picker and import selected audio files.
 * Uses <input type="file"> for universal browser compatibility (including Android).
 * @param {function} onProgress - Callback: ({ phase, current, total, trackName })
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<number>} Number of newly imported tracks
 */
export async function importFiles(onProgress, signal) {
  // Create file input
  const files = await pickAudioFiles();
  if (!files || files.length === 0) return 0;

  onProgress?.({ phase: 'scanning', current: 0, total: files.length, trackName: '' });

  let imported = 0;
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) break;

    const file = files[i];
    const id = generateId(file.name, file.size);

    // Skip if already imported and analyzed
    const existing = await getTrack(id);
    if (existing && existing.analyzed) {
      onProgress?.({ phase: 'importing', current: i + 1, total, trackName: file.name, skipped: true });
      continue;
    }

    try {
      onProgress?.({ phase: 'importing', current: i + 1, total, trackName: file.name });

      const meta = await extractMetadata(file);

      const track = {
        id,
        fileName: file.name,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        duration: 0,
        artworkData: meta.artworkData,
        // Analysis fields — filled by analyzer
        bpm: null,
        bpmConfidence: null,
        bpmCandidates: null,
        valence: null,
        energy: null,
        analyzed: false,
        importedAt: Date.now(),
      };

      await addTrack(track);

      // Store audio blob separately for playback + analysis
      await storeAudioBlob(id, file);

      imported++;
    } catch (err) {
      console.warn(`Failed to import ${file.name}:`, err);
      onProgress?.({ phase: 'importing', current: i + 1, total, trackName: file.name, error: true });
    }
  }

  onProgress?.({ phase: 'done', current: total, total, trackName: '' });
  return imported;
}

/**
 * Open a file picker dialog for audio files. Works on Android and desktop.
 */
function pickAudioFiles() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,.mp3,.wav,.flac,.aac,.m4a,.ogg,.weba';

    // Also try webkitdirectory for desktop browsers that support folder selection
    // On Android this is ignored, so it gracefully falls back to multi-file
    if (!('ontouchstart' in window)) {
      input.webkitdirectory = true;
    }

    input.addEventListener('change', () => {
      const allFiles = Array.from(input.files || []);
      const audioFiles = allFiles.filter(isAudioFile);
      resolve(audioFiles);
    });

    // User cancelled
    input.addEventListener('cancel', () => resolve([]));

    // Also handle the case where the dialog is closed without selection
    // by using a focus listener as a fallback
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) resolve([]);
        window.removeEventListener('focus', onFocus);
      }, 500);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
}

/**
 * Get audio blob for a track (for playback or analysis).
 */
export async function getAudioBlob(trackId) {
  return getStoredAudioBlob(trackId);
}
