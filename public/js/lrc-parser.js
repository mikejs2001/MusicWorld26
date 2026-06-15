// Parse LRC text into [{time, text, words}]
// Supports both standard [mm:ss.xx] and enhanced <mm:ss.xx> word timestamps
function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines = [];

  for (const raw of lrcText.split('\n')) {
    const m = raw.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/);
    if (!m) continue;

    const time = +m[1] * 60 + +m[2] + +m[3] / (m[3].length === 2 ? 100 : 1000);
    const rawText = m[4];

    // Parse word-level timestamps if present
    const words = [];
    const wordRe = /<(\d{2}):(\d{2})\.(\d{2,3})>\s*([^<]*)/g;
    let wm;
    while ((wm = wordRe.exec(rawText)) !== null) {
      const wTime = +wm[1] * 60 + +wm[2] + +wm[3] / (wm[3].length === 2 ? 100 : 1000);
      const wText = wm[4].trimEnd();
      if (wText) words.push({ time: wTime, text: wText });
    }

    const text = rawText.replace(/<[^>]+>/g, '').trim();
    lines.push({ time, text, words });
  }

  return lines.sort((a, b) => a.time - b.time);
}
