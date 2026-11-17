import { SpeakerProfile, VoiceoverSentence } from '../types/editor';

export function parseScriptIntoSentences(
  script: string,
  defaultSpeakerId: string,
  speakers: SpeakerProfile[],
  multiSpeakerMode: boolean
): Array<{ speakerId: string; text: string }> {
  const lines = script
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: Array<{ speakerId: string; text: string }> = [];

  for (const line of lines) {
    let speakerId = defaultSpeakerId;
    let body = line;

    const speakerMatch = line.match(/^([^:]{1,32}):\s*(.+)$/);
    if (speakerMatch) {
      const candidateName = speakerMatch[1].trim().toLowerCase();
      const matched = speakers.find((s) => s.name.trim().toLowerCase() === candidateName);
      if (matched) {
        speakerId = matched.id;
        body = speakerMatch[2].trim();
      } else if (multiSpeakerMode) {
        body = speakerMatch[2].trim();
      }
    }

    // Split long lines into natural sentences while keeping abbreviations safe enough for narration
    const splitSentences = body
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(])/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (splitSentences.length === 0 && body) {
      items.push({ speakerId, text: body });
    } else {
      for (const s of splitSentences) {
        items.push({ speakerId, text: s });
      }
    }
  }

  return items;
}

function olaTimeStretch(input: Float32Array, stretchFactor: number): Float32Array {
  if (Math.abs(stretchFactor - 1.0) < 0.01 || input.length < 1024) {
    return input;
  }

  const winSize = 1024;
  const synHop = 256;
  const anaHop = synHop / stretchFactor;
  const outLength = Math.max(winSize, Math.round(input.length * stretchFactor));

  const out = new Float32Array(outLength + winSize);
  const norm = new Float32Array(outLength + winSize);

  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
  }

  let anaPos = 0;
  let synPos = 0;

  while (Math.floor(anaPos) + winSize < input.length && synPos + winSize < out.length) {
    const aIdx = Math.floor(anaPos);
    for (let i = 0; i < winSize; i++) {
      const w = hann[i];
      out[synPos + i] += input[aIdx + i] * w;
      norm[synPos + i] += w;
    }
    anaPos += anaHop;
    synPos += synHop;
  }

  const result = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    result[i] = norm[i] > 1e-4 ? out[i] / norm[i] : out[i];
  }
  return result;
}

function resampleLinear(input: Float32Array, ratio: number): Float32Array {
  if (Math.abs(ratio - 1.0) < 0.005) return input;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[idx + 1] ?? s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

function encodeMonoPcmToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const numBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + numBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numBytes, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function extractWaveformPeaksFromPcm(samples: Float32Array, bars = 48): number[] {
  if (samples.length === 0) return Array.from({ length: bars }, () => 0.15);
  const step = Math.max(1, Math.floor(samples.length / bars));
  const peaks: number[] = [];
  let maxPeak = 0.001;

  for (let i = 0; i < bars; i++) {
    const start = i * step;
    const end = Math.min(samples.length, start + step);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const a = Math.abs(samples[j]);
      if (a > peak) peak = a;
    }
    if (peak > maxPeak) maxPeak = peak;
    peaks.push(peak);
  }

  return peaks.map((p) => Number(Math.max(0.08, Math.min(1, p / maxPeak)).toFixed(2)));
}

export async function processWavWithSpeedAndPitch(
  base64Wav: string,
  speed: number,
  pitchSemitones: number
): Promise<{
  blobUrl: string;
  duration: number;
  waveformData: number[];
}> {
  const cleanB64 = base64Wav.includes(',') ? base64Wav.split(',')[1] : base64Wav;
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const tempCtx = new AudioCtx();

  try {
    const decoded = await tempCtx.decodeAudioData(bytes.buffer.slice(0));
    const sampleRate = decoded.sampleRate || 24000;
    const rawChannel = decoded.getChannelData(0);

    const clampedSpeed = Math.max(0.55, Math.min(1.9, Number(speed) || 1.0));
    const clampedPitch = Math.max(-6, Math.min(6, Number(pitchSemitones) || 0));

    let finalPcm: Float32Array;
    if (Math.abs(clampedSpeed - 1.0) < 0.02 && Math.abs(clampedPitch) < 0.1) {
      finalPcm = rawChannel;
    } else {
      const pitchRatio = Math.pow(2, clampedPitch / 12);
      const stretchFactor = pitchRatio / clampedSpeed;
      const stretched = olaTimeStretch(rawChannel, stretchFactor);
      finalPcm = resampleLinear(stretched, pitchRatio);
    }

    const wavBlob = encodeMonoPcmToWavBlob(finalPcm, sampleRate);
    const blobUrl = URL.createObjectURL(wavBlob);
    const duration = Number(Math.max(0.35, finalPcm.length / sampleRate).toFixed(3));
    const waveformData = extractWaveformPeaksFromPcm(finalPcm, 48);

    return { blobUrl, duration, waveformData };
  } finally {
    await tempCtx.close().catch(() => {});
  }
}

export function recalcSentenceTimestamps(
  sentences: VoiceoverSentence[],
  anchorStart: number,
  gapSeconds = 0.18
): VoiceoverSentence[] {
  let cursor = Math.max(0, anchorStart);
  return sentences.map((s, idx) => {
    const start = Number(cursor.toFixed(3));
    const dur = Math.max(0.4, s.duration || 1.5);
    cursor += dur + gapSeconds;
    return {
      ...s,
      index: idx + 1,
      start,
      duration: Number(dur.toFixed(3)),
    };
  });
}
