import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGenAIClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Open Settings > Secrets in AI Studio to set your Gemini API key.'
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { status?: number; statusCode?: number })?.status ??
        (err as { statusCode?: number })?.statusCode;
      if (status && status < 500 && status !== 429) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 600 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

function formatSrtTimestamp(seconds: number): string {
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

interface RawCue {
  start: number;
  end: number;
  text: string;
}

function normalizeAndSerializeSrt(
  rawCues: RawCue[],
  startOffset: number,
  maxDuration: number
) {
  const cleaned = rawCues
    .filter((c) => c && typeof c.text === 'string' && c.text.trim().length > 0)
    .map((c, idx) => {
      const start = Math.max(0, Number(c.start) || 0) + startOffset;
      const rawEnd = Math.max(start + 0.6, (Number(c.end) || start + 2.5) + startOffset);
      const end = maxDuration > 0 ? Math.min(startOffset + maxDuration, rawEnd) : rawEnd;
      return {
        id: `sub-ai-${Date.now()}-${idx}`,
        index: idx + 1,
        start: Number(start.toFixed(3)),
        end: Number(Math.max(start + 0.5, end).toFixed(3)),
        text: c.text.trim(),
      };
    })
    .sort((a, b) => a.start - b.start)
    .map((c, idx) => ({ ...c, index: idx + 1 }));

  const srt = cleaned
    .map(
      (c) =>
        `${c.index}\n${formatSrtTimestamp(c.start)} --> ${formatSrtTimestamp(c.end)}\n${c.text}`
    )
    .join('\n\n');

  return { cues: cleaned, srt };
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const anyErr = err as { status?: number; statusCode?: number; message?: string };
  const status = anyErr?.statusCode || anyErr?.status || 500;
  const rawMessage = anyErr?.message || 'Unexpected error calling Gemini API.';

  if (status === 403 || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        'Gemini API key permission denied or invalid. Please check your key in the Settings > Secrets panel.',
    };
  }
  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Gemini API rate limit or quota reached. Please wait a moment and try again, or check Settings > Secrets.',
    };
  }
  if (status === 404 || rawMessage.includes('NOT_FOUND')) {
    return {
      status: 404,
      message: `Requested Gemini model was not found: ${rawMessage}`,
    };
  }
  return { status, message: rawMessage };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, version: '1.3.0' });
  });

  app.post('/api/ai/subtitles', async (req, res) => {
    try {
      const {
        mode = 'audio',
        audioBase64,
        mimeType = 'audio/webm',
        language = 'Auto-detect',
        promptOrScript = '',
        timelineDuration = 30,
        startOffset = 0,
        clipsContext = [],
      } = req.body ?? {};

      const ai = getGenAIClient();
      const safeDuration = Math.max(2, Number(timelineDuration) || 30);
      const safeOffset = Math.max(0, Number(startOffset) || 0);
      const langDirective =
        language && language !== 'Auto-detect'
          ? `Write all subtitle lines in ${language}.`
          : 'Preserve the original spoken language.';

      let transcript = '';
      let rawCues: RawCue[] = [];

      if (mode === 'audio') {
        if (!audioBase64 || typeof audioBase64 !== 'string') {
          res.status(400).json({ error: 'Missing audio data for transcription.' });
          return;
        }

        const cleanBase64 = audioBase64.includes(',')
          ? audioBase64.split(',')[1]
          : audioBase64;
        const cleanMimeType =
          String(mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

        const audioPart = {
          inlineData: {
            mimeType: cleanMimeType,
            data: cleanBase64,
          },
        };

        const textPart = {
          text: `Listen carefully to the audio and transcribe all spoken words accurately into timed subtitle cues within 0 to ${safeDuration.toFixed(2)} seconds.
Match each cue's start and end timestamps (in seconds) closely to when those words are actually spoken.
Keep each cue concise (1-2 short lines, max ~42 chars per line), non-overlapping, and chronological.
If the audio contains only silence or no recognizable speech, return an empty cues array and an empty transcript string.
${langDirective}${promptOrScript ? `\nContext hint: ${promptOrScript}` : ''}`,
        };

        const audioResp = await withRetry(() =>
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: { parts: [audioPart, textPart] },
            config: {
              systemInstruction:
                'You are a professional broadcast speech-to-text transcriber and subtitle timing editor. Never invent words that are not spoken in the audio.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  transcript: {
                    type: Type.STRING,
                    description: 'Full verbatim spoken transcript, or empty string if silent.',
                  },
                  cues: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        start: {
                          type: Type.NUMBER,
                          description: 'Cue start time in seconds from 0.',
                        },
                        end: {
                          type: Type.NUMBER,
                          description: 'Cue end time in seconds, greater than start.',
                        },
                        text: {
                          type: Type.STRING,
                          description: 'Subtitle caption text (1-2 short lines).',
                        },
                      },
                      required: ['start', 'end', 'text'],
                    },
                  },
                },
                required: ['transcript', 'cues'],
              },
            },
          })
        );

        const jsonText = (audioResp.text ?? '{"transcript":"","cues":[]}').trim();
        let parsed: { transcript?: string; cues?: RawCue[] } = { transcript: '', cues: [] };
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          parsed = { transcript: '', cues: [] };
        }

        transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
        rawCues = Array.isArray(parsed.cues) ? parsed.cues : [];

        if (!transcript && rawCues.length === 0) {
          res.json({
            cues: [],
            srt: '',
            transcript: '',
            message: 'No clear speech was detected in the audio track.',
          });
          return;
        }
      } else {
        const clipSummary =
          Array.isArray(clipsContext) && clipsContext.length > 0
            ? `Timeline clips:\n${clipsContext
                .map(
                  (c: { name?: string; start?: number; duration?: number; type?: string }) =>
                    `- ${c.name || 'Clip'} (${c.type || 'video'}): ${Number(c.start || 0).toFixed(1)}s to ${(
                      Number(c.start || 0) + Number(c.duration || 5)
                    ).toFixed(1)}s`
                )
                .join('\n')}`
            : '';

        const segmentationPrompt = `Generate timed, broadcast-ready video subtitles spanning between 0 and ${safeDuration.toFixed(2)} seconds based on the provided script/scene notes and timeline clips.
Keep each subtitle cue concise (1-2 short lines, max ~42 chars per line), non-overlapping, and naturally paced across the timeline.
${langDirective}

${clipSummary}

Script / Scene Description:
"""
${String(promptOrScript || 'Cinematic video sequence narration').trim()}
"""`;

        const segmentResp = await withRetry(() =>
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: segmentationPrompt,
            config: {
              systemInstruction:
                'You are a professional broadcast subtitler and caption timing editor. Output strictly timed, readable subtitle cues.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  cues: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        start: {
                          type: Type.NUMBER,
                          description: 'Cue start time in seconds from 0.',
                        },
                        end: {
                          type: Type.NUMBER,
                          description: 'Cue end time in seconds, greater than start.',
                        },
                        text: {
                          type: Type.STRING,
                          description: 'Subtitle caption text (1-2 short lines).',
                        },
                      },
                      required: ['start', 'end', 'text'],
                    },
                  },
                },
                required: ['cues'],
              },
            },
          })
        );

        const jsonText = (segmentResp.text ?? '{"cues":[]}').trim();
        let parsed: { cues?: RawCue[] } = { cues: [] };
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          parsed = { cues: [] };
        }

        rawCues = Array.isArray(parsed.cues) ? parsed.cues : [];
      }

      const { cues, srt } = normalizeAndSerializeSrt(rawCues, safeOffset, safeDuration);

      res.json({
        cues,
        srt,
        transcript: transcript || cues.map((c) => c.text).join(' '),
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']);

  const STYLE_DESCRIPTIONS: Record<string, string> = {
    Natural: 'Natural, conversational, clear and authentic speech',
    Energetic: 'Energetic, upbeat, enthusiastic, bright and dynamic delivery',
    Calm: 'Calm, soothing, relaxed, warm and steady pacing',
    Dramatic: 'Dramatic, cinematic, rich emotional emphasis and resonance',
    Robotic: 'Crisp, synthetic, measured, precision AI robotic vocal cadence',
    Narrator: 'Polished documentary narrator, authoritative, articulate and balanced',
  };

  app.post('/api/ai/tts', async (req, res) => {
    try {
      const {
        text,
        voiceName = 'Kore',
        style = 'Natural',
        customPersona = '',
        speed = 1.0,
        pitch = 0,
        multiSpeaker,
      } = req.body ?? {};

      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text script is required to generate voiceover audio.' });
        return;
      }

      const ai = getGenAIClient('v1beta');
      const safeVoice = ALLOWED_VOICES.has(String(voiceName)) ? String(voiceName) : 'Kore';
      const baseStyle = STYLE_DESCRIPTIONS[String(style)] || STYLE_DESCRIPTIONS.Natural;
      const speedNum = Number(speed) || 1.0;
      const pitchNum = Number(pitch) || 0;
      const pacingHint =
        speedNum >= 1.2
          ? 'brisk pace'
          : speedNum <= 0.85
          ? 'slow deliberate pace'
          : 'steady pace';
      const pitchHint =
        pitchNum >= 2
          ? 'slightly higher vocal register'
          : pitchNum <= -2
          ? 'deeper vocal register'
          : '';
      const fullStyle = [baseStyle, pacingHint, pitchHint, String(customPersona || '').trim()]
        .filter(Boolean)
        .join(', ');

      let response;

      if (Array.isArray(multiSpeaker) && multiSpeaker.length === 2) {
        const speakerLines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        const parts = speakerLines.map((line) => {
          const match = line.match(/^([^:]{1,30}):\s*(.+)$/);
          const matchedSpeaker = match
            ? multiSpeaker.find(
                (s: { speaker?: string }) =>
                  s.speaker?.toLowerCase() === match[1].trim().toLowerCase()
              )
            : undefined;
          const spk = matchedSpeaker || multiSpeaker[0];
          return {
            text: match ? `${spk.speaker}: ${match[2].trim()}` : `${spk.speaker}: ${line}`,
            speechMetadata: {
              speaker: String(spk.speaker || 'Speaker 1'),
              style: String(spk.style || fullStyle),
            },
          };
        });

        response = await withRetry(() =>
          ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [{ role: 'user', parts }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: multiSpeaker.map(
                    (s: { speaker?: string; voiceName?: string }) => ({
                      speaker: String(s.speaker || 'Speaker'),
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName: ALLOWED_VOICES.has(String(s.voiceName))
                            ? String(s.voiceName)
                            : 'Kore',
                        },
                      },
                    })
                  ),
                },
              },
            },
          })
        );
      } else {
        response = await withRetry(() =>
          ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: text.trim(),
                    speechMetadata: {
                      style: fullStyle,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: safeVoice },
                },
              },
            },
          })
        );
      }

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'TTS model returned no audio data. Please try again.' });
        return;
      }

      const rawBytes = Buffer.from(base64Audio, 'base64');
      const rawMime = String(inlineData?.mimeType || 'audio/wav');
      const isRiffWav =
        rawBytes.length >= 44 && rawBytes.subarray(0, 4).toString('ascii') === 'RIFF';

      let wavBytes: Buffer;
      let sampleRate = 24000;
      let byteRate = 48000;

      if (isRiffWav) {
        wavBytes = rawBytes;
        sampleRate = wavBytes.readUInt32LE(24) || 24000;
        byteRate = wavBytes.readUInt32LE(28) || sampleRate * 2;
      } else {
        const rateMatch = rawMime.match(/rate=(\d+)/i);
        sampleRate = rateMatch ? Math.max(8000, parseInt(rateMatch[1], 10)) : 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const header = Buffer.alloc(44);
        header.write('RIFF', 0, 'ascii');
        header.writeUInt32LE(36 + rawBytes.length, 4);
        header.write('WAVE', 8, 'ascii');
        header.write('fmt ', 12, 'ascii');
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36, 'ascii');
        header.writeUInt32LE(rawBytes.length, 40);
        wavBytes = Buffer.concat([header, rawBytes]);
      }

      const pcmBytes = Math.max(0, wavBytes.length - 44);
      const duration = Number(Math.max(0.4, pcmBytes / Math.max(1, byteRate)).toFixed(3));

      res.json({
        audioBase64: isRiffWav ? base64Audio : wavBytes.toString('base64'),
        mimeType: 'audio/wav',
        sampleRate,
        duration,
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AetherCut Studio v1.3.0 running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
