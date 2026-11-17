import { MediaItem, SubtitleCue } from '../types/editor';

/**
 * Parse an SRT timestamp like "00:01:23,450" or "00:01:23.450" into seconds.
 */
export function parseSRTTimestamp(ts: string): number {
  const cleaned = ts.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseFloat(parts[0]) || 0;
  const minutes = parseFloat(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return Math.max(0, hours * 3600 + minutes * 60 + seconds);
}

/**
 * Format seconds into standard SRT timestamp "HH:MM:SS,mmm".
 */
export function formatSRTTimestamp(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(safe * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

/**
 * Parse a raw .srt string into normalized SubtitleCue[].
 */
export function parseSRT(content: string): SubtitleCue[] {
  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const lines = blocks[bIdx]
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    if (lines.length === 0) continue;

    // Locate the arrow timing line (handles missing index line or extra sequence headers)
    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [rawStart, rawEndPart] = timeLine.split('-->');
    if (!rawStart || !rawEndPart) continue;

    // Some SRT files include positioning coordinates after end timestamp
    const rawEnd = rawEndPart.trim().split(/\s+/)[0];
    const start = parseSRTTimestamp(rawStart);
    const end = Math.max(start + 0.25, parseSRTTimestamp(rawEnd));

    const textLines = lines.slice(timeLineIdx + 1);
    const rawText = textLines.join('\n').replace(/<[^>]+>/g, '').trim();
    if (!rawText) continue;

    cues.push({
      id: `sub-srt-${Date.now()}-${cues.length}`,
      index: cues.length + 1,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text: rawText,
    });
  }

  return cues
    .sort((a, b) => a.start - b.start)
    .map((c, idx) => ({ ...c, index: idx + 1 }));
}

/**
 * Serialize SubtitleCue[] into a valid .srt file string.
 */
export function serializeSRT(cues: SubtitleCue[]): string {
  const sorted = [...cues]
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);

  return sorted
    .map(
      (cue, idx) =>
        `${idx + 1}\n${formatSRTTimestamp(cue.start)} --> ${formatSRTTimestamp(
          Math.max(cue.start + 0.25, cue.end)
        )}\n${cue.text.trim()}`
    )
    .join('\n\n');
}

/**
 * Encode an AudioBuffer (mono Float32Array) into a compact 16kHz 16-bit PCM WAV Blob/base64.
 */
function encodeMonoWavBase64(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Decode an uploaded audio or video MediaItem into a 16kHz mono WAV base64 payload
 * suitable for server-side Gemini transcription.
 */
export async function extractAudioWavFromMediaItem(
  item: MediaItem,
  maxSeconds = 180
): Promise<{ base64: string; mimeType: string; duration: number } | null> {
  if (!item.sourceUrl || item.sourceUrl === 'synthetic') return null;

  try {
    const response = await fetch(item.sourceUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) return null;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const targetRate = 16000;
      const clippedDuration = Math.min(decoded.duration, maxSeconds);
      const targetLength = Math.max(1, Math.floor(clippedDuration * targetRate));

      const offlineCtx = new OfflineAudioContext(1, targetLength, targetRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineCtx.destination);
      source.start(0);

      const rendered = await offlineCtx.startRendering();
      const channelData = rendered.getChannelData(0);
      const base64 = encodeMonoWavBase64(channelData, targetRate);
      return {
        base64,
        mimeType: 'audio/wav',
        duration: clippedDuration,
      };
    } finally {
      await ctx.close().catch(() => {});
    }
  } catch {
    return null;
  }
}
