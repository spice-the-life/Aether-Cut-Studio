import React, { useState, useRef, useEffect } from 'react';
import {
  MediaItem,
  PlayheadState,
  SpeakerProfile,
  SubtitleCue,
  SubtitleStyle,
  TimelineClip,
  VoiceName,
  VoiceoverSentence,
  VoiceStyle,
} from '../../types/editor';
import {
  extractAudioWavFromMediaItem,
  formatSRTTimestamp,
  parseSRT,
  serializeSRT,
} from '../../utils/srt';
import {
  parseScriptIntoSentences,
  processWavWithSpeedAndPitch,
  recalcSentenceTimestamps,
} from '../../utils/voiceoverAudio';
import {
  Captions,
  Download,
  FileUp,
  Mic,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Play,
  Film,
  FileText,
  X,
  AlertCircle,
  Loader2,
  Volume2,
  RefreshCw,
  Palette,
  Users,
  Pause,
} from 'lucide-react';

export type SubtitlesModalTab = 'srt' | 'ai' | 'voiceover' | 'styling' | 'speakers';

interface SubtitlesModalProps {
  isOpen: boolean;
  initialTab?: SubtitlesModalTab;
  onClose: () => void;
  subtitles: SubtitleCue[];
  subtitleStyle: SubtitleStyle;
  onUpdateSubtitles: (cues: SubtitleCue[]) => void;
  onUpdateSubtitleStyle: (updates: Partial<SubtitleStyle>) => void;
  onSeek: (time: number) => void;
  playhead: PlayheadState;
  mediaItems: MediaItem[];
  clips: TimelineClip[];
  speakers: SpeakerProfile[];
  onUpdateSpeakers: (speakers: SpeakerProfile[]) => void;
  voiceoverSentences: VoiceoverSentence[];
  onUpdateVoiceoverSentences: (sentences: VoiceoverSentence[]) => void;
  onCommitVoiceoverToTimeline: (
    sentences: VoiceoverSentence[],
    targetTrackId: 'track-a1' | 'track-a2',
    syncSubtitles: boolean,
    replaceExistingSubtitles: boolean
  ) => void;
}

const LANGUAGES = [
  'Auto-detect',
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Japanese',
  'Korean',
  'Mandarin Chinese',
];

const VOICE_OPTIONS: Array<{ id: VoiceName; label: string; desc: string }> = [
  { id: 'Kore', label: 'Female Narrator (Kore)', desc: 'Clear, warm & articulate' },
  { id: 'Charon', label: 'Male Narrator (Charon)', desc: 'Deep & authoritative' },
  { id: 'Puck', label: 'Upbeat Host (Puck)', desc: 'Crisp & conversational' },
  { id: 'Fenrir', label: 'Bold Trailer (Fenrir)', desc: 'Resonant & dramatic' },
  { id: 'Zephyr', label: 'Smooth Studio (Zephyr)', desc: 'Balanced & natural' },
];

const VOICE_STYLES: VoiceStyle[] = [
  'Natural',
  'Energetic',
  'Calm',
  'Dramatic',
  'Robotic',
  'Narrator',
];

const SPEAKER_COLORS = ['#30d158', '#0a84ff', '#bf5af2', '#ff9f0a', '#ff375f', '#64d2ff'];

export const SubtitlesModal: React.FC<SubtitlesModalProps> = ({
  isOpen,
  initialTab = 'srt',
  onClose,
  subtitles,
  subtitleStyle,
  onUpdateSubtitles,
  onUpdateSubtitleStyle,
  onSeek,
  playhead,
  mediaItems,
  clips,
  speakers,
  onUpdateSpeakers,
  voiceoverSentences,
  onUpdateVoiceoverSentences,
  onCommitVoiceoverToTimeline,
}) => {
  const [activeTab, setActiveTab] = useState<SubtitlesModalTab>(initialTab);
  const [aiSource, setAiSource] = useState<'media' | 'mic' | 'script'>('media');
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [language, setLanguage] = useState<string>('Auto-detect');
  const [scriptPrompt, setScriptPrompt] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [alignAtPlayhead, setAlignAtPlayhead] = useState<boolean>(false);

  const [isDraggingSrt, setIsDraggingSrt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>('');

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{
    base64: string;
    mimeType: string;
    url: string;
    duration: number;
  } | null>(null);

  // AI Voiceover Studio state
  const DEFAULT_VO_SCRIPT =
    'Welcome to AetherCut Studio! Create amazing videos with powerful editing tools.';
  const [voScript, setVoScript] = useState<string>(DEFAULT_VO_SCRIPT);
  const [voMultiSpeaker, setVoMultiSpeaker] = useState<boolean>(false);
  const [voVoiceName, setVoVoiceName] = useState<VoiceName>('Kore');
  const [voStyle, setVoStyle] = useState<VoiceStyle>('Natural');
  const [voSpeed, setVoSpeed] = useState<number>(1.0);
  const [voPitch, setVoPitch] = useState<number>(0);
  const [voCustomPersona, setVoCustomPersona] = useState<string>('');
  const [voTargetTrack, setVoTargetTrack] = useState<'track-a1' | 'track-a2'>('track-a1');
  const [voAnchorAtPlayhead, setVoAnchorAtPlayhead] = useState<boolean>(false);
  const [voSyncSubtitles, setVoSyncSubtitles] = useState<boolean>(true);
  const [isGeneratingVo, setIsGeneratingVo] = useState<boolean>(false);
  const [regeneratingSentenceId, setRegeneratingSentenceId] = useState<string | null>(null);
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);
  const [testingSpeakerId, setTestingSpeakerId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const srtInputRef = useRef<HTMLInputElement | null>(null);
  const audioUploadInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen || voiceoverSentences.length === 0) return;
    if (voScript === DEFAULT_VO_SCRIPT) {
      const uniqueSpeakers = new Set(voiceoverSentences.map((s) => s.speakerId));
      const usePrefix = uniqueSpeakers.size > 1;
      if (usePrefix) setVoMultiSpeaker(true);
      setVoScript(
        voiceoverSentences
          .map((s) => {
            if (!usePrefix) return s.text;
            const spk = speakers.find((p) => p.id === s.speakerId);
            return spk ? `${spk.name}: ${s.text}` : s.text;
          })
          .join('\n')
      );
    }
  }, [isOpen, voiceoverSentences, speakers, voScript]);

  const uploadedAvMedia = mediaItems.filter(
    (m) => m.isUploaded && (m.type === 'video' || m.type === 'audio')
  );

  useEffect(() => {
    if (!selectedMediaId && uploadedAvMedia.length > 0) {
      setSelectedMediaId(uploadedAvMedia[0].id);
    }
  }, [uploadedAvMedia.length, selectedMediaId]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stopPreviewAudio = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPlayingSentenceId(null);
  };

  const playSentencePreview = (sentence: VoiceoverSentence) => {
    if (!sentence.processedBlobUrl) return;
    if (playingSentenceId === sentence.id) {
      stopPreviewAudio();
      return;
    }
    stopPreviewAudio();
    const audio = new Audio(sentence.processedBlobUrl);
    previewAudioRef.current = audio;
    setPlayingSentenceId(sentence.id);
    audio.onended = () => {
      setPlayingSentenceId(null);
      previewAudioRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingSentenceId(null);
    });
  };

  const mergeOrReplaceCues = (incoming: SubtitleCue[]) => {
    if (replaceExisting) {
      onUpdateSubtitles(incoming);
    } else {
      const combined = [...subtitles, ...incoming]
        .sort((a, b) => a.start - b.start)
        .map((c, idx) => ({ ...c, index: idx + 1 }));
      onUpdateSubtitles(combined);
    }
    if (!subtitleStyle.enabled) {
      onUpdateSubtitleStyle({ enabled: true });
    }
  };

  const handleImportSrtFile = async (file: File) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsed = parseSRT(text);
      if (parsed.length === 0) {
        setErrorMessage(
          'No valid subtitle cues found in this file. Ensure it uses standard .srt format (HH:MM:SS,mmm --> HH:MM:SS,mmm).'
        );
        return;
      }
      const shifted = alignAtPlayhead
        ? parsed.map((c) => ({
            ...c,
            start: Number((c.start + playhead.currentTime).toFixed(3)),
            end: Number((c.end + playhead.currentTime).toFixed(3)),
          }))
        : parsed;

      mergeOrReplaceCues(shifted);
      setStatusMessage(`Imported ${shifted.length} subtitle cues from ${file.name}.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to read .srt subtitle file.'
      );
    }
  };

  const handleExportSrt = () => {
    if (subtitles.length === 0) return;
    const content = serializeSRT(subtitles);
    const blob = new Blob([content], { type: 'application/x-subrip;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AetherCut_Subtitles_v1.3.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddCueAtPlayhead = () => {
    const start = Number(playhead.currentTime.toFixed(2));
    const end = Number((start + 2.5).toFixed(2));
    const newCue: SubtitleCue = {
      id: `sub-manual-${Date.now()}`,
      index: subtitles.length + 1,
      start,
      end,
      text: 'New subtitle caption',
    };
    const next = [...subtitles, newCue]
      .sort((a, b) => a.start - b.start)
      .map((c, idx) => ({ ...c, index: idx + 1 }));
    onUpdateSubtitles(next);
    if (!subtitleStyle.enabled) onUpdateSubtitleStyle({ enabled: true });
  };

  const callAiSubtitlesEndpoint = async (payload: Record<string, unknown>) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/ai/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate AI subtitles.');
      }

      const cues: SubtitleCue[] = Array.isArray(data.cues) ? data.cues : [];
      if (data.transcript) setLastTranscript(data.transcript);

      if (cues.length === 0) {
        setStatusMessage(data.message || 'No speech or subtitle cues were produced.');
        return;
      }

      mergeOrReplaceCues(cues);
      setStatusMessage(`Generated ${cues.length} timed AI subtitle cues.`);
      setActiveTab('srt');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'AI subtitle generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromMedia = async () => {
    const item = mediaItems.find((m) => m.id === selectedMediaId);
    if (!item) {
      setErrorMessage('Select an uploaded video or audio clip first, or upload an audio file below.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage('Extracting audio track from media...');
    const extracted = await extractAudioWavFromMediaItem(item, 180);
    if (!extracted) {
      setErrorMessage(
        `Could not extract an audio track from "${item.name}". It may have no audio stream. Try Microphone Voiceover or Script mode.`
      );
      setStatusMessage(null);
      return;
    }

    const matchingClip = clips.find((c) => c.mediaId === item.id);
    const startOffset = alignAtPlayhead
      ? playhead.currentTime
      : matchingClip
      ? matchingClip.start
      : 0;

    await callAiSubtitlesEndpoint({
      mode: 'audio',
      audioBase64: extracted.base64,
      mimeType: extracted.mimeType,
      language,
      timelineDuration: extracted.duration,
      startOffset,
    });
  };

  const handleDirectAudioFileUpload = async (file: File) => {
    setErrorMessage(null);
    setStatusMessage(`Reading "${file.name}" for transcription...`);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      const mimeType = file.type || 'audio/mp3';

      await callAiSubtitlesEndpoint({
        mode: 'audio',
        audioBase64: base64,
        mimeType,
        language,
        timelineDuration: Math.max(10, playhead.duration),
        startOffset: alignAtPlayhead ? playhead.currentTime : 0,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to read audio file.');
    }
  };

  const startMicRecording = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setRecordedAudio(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      recordingChunksRef.current = [];
      setRecordingSeconds(0);
      const startedAt = Date.now();

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordingChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        const actualDuration = Math.max(1.5, Number(((Date.now() - startedAt) / 1000).toFixed(2)));
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          setRecordedAudio({
            base64: result,
            mimeType: 'audio/webm',
            url,
            duration: actualDuration,
          });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.round((Date.now() - startedAt) / 1000));
      }, 250);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `Microphone access failed: ${err.message}`
          : 'Microphone access was denied.'
      );
    }
  };

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleGenerateFromRecordedAudio = async () => {
    if (!recordedAudio) return;
    await callAiSubtitlesEndpoint({
      mode: 'audio',
      audioBase64: recordedAudio.base64,
      mimeType: recordedAudio.mimeType,
      language,
      timelineDuration: Math.max(2, recordedAudio.duration),
      startOffset: alignAtPlayhead ? playhead.currentTime : 0,
    });
  };

  const handleGenerateFromScript = async () => {
    if (!scriptPrompt.trim() && clips.length === 0) {
      setErrorMessage('Enter dialogue, narration text, or a scene description to generate subtitles.');
      return;
    }

    await callAiSubtitlesEndpoint({
      mode: 'script',
      language,
      promptOrScript:
        scriptPrompt.trim() ||
        'Generate fitting cinematic narration subtitles matched to each timeline clip.',
      timelineDuration: Math.max(6, playhead.duration),
      startOffset: alignAtPlayhead ? playhead.currentTime : 0,
      clipsContext: clips.map((c) => ({
        name: c.name,
        start: c.start,
        duration: c.duration,
        type: c.trackType,
      })),
    });
  };

  // ======================== AI VOICEOVER SYNTHESIS ========================

  const synthesizeSingleSentence = async (
    text: string,
    speakerId: string,
    useActiveOverrides: boolean
  ) => {
    const spk = speakers.find((s) => s.id === speakerId) || speakers[0];
    const voiceName = useActiveOverrides && !voMultiSpeaker ? voVoiceName : spk.voiceName;
    const style = useActiveOverrides && !voMultiSpeaker ? voStyle : spk.style;
    const speed = useActiveOverrides && !voMultiSpeaker ? voSpeed : spk.speed;
    const pitch = useActiveOverrides && !voMultiSpeaker ? voPitch : spk.pitch;
    const customPersona =
      useActiveOverrides && !voMultiSpeaker ? voCustomPersona : spk.customPersona;

    const resp = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceName,
        style,
        speed,
        pitch,
        customPersona,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.error || 'Voiceover synthesis failed.');
    }

    const processed = await processWavWithSpeedAndPitch(data.audioBase64, speed, pitch);
    return {
      rawAudioBase64: data.audioBase64 as string,
      processedBlobUrl: processed.blobUrl,
      duration: processed.duration,
      waveformData: processed.waveformData,
    };
  };

  const handleLoadSubtitlesIntoVoiceover = () => {
    setErrorMessage(null);
    if (subtitles.length === 0) {
      setErrorMessage('No subtitles exist on S1 yet. Import an .srt file or generate AI subtitles first.');
      return;
    }
    const defaultSpk = speakers[0]?.id || 'spk-narrator';
    const hasSpeakers = subtitles.some((c) => c.speakerId);
    if (hasSpeakers) setVoMultiSpeaker(true);

    const formattedLines = subtitles.map((c) => {
      const spk = speakers.find((s) => s.id === c.speakerId);
      return spk ? `${spk.name}: ${c.text}` : c.text;
    });
    setVoScript(formattedLines.join('\n'));

    const draftSentences: VoiceoverSentence[] = subtitles.map((c, idx) => ({
      id: c.voiceoverSentenceId || `vo-sent-${Date.now()}-${idx}`,
      index: idx + 1,
      speakerId: c.speakerId || defaultSpk,
      text: c.text,
      start: c.start,
      duration: Math.max(0.5, Number((c.end - c.start).toFixed(3))),
      subtitleId: c.id,
      status: 'idle',
    }));
    onUpdateVoiceoverSentences(draftSentences);
    setStatusMessage(`Loaded ${subtitles.length} S1 subtitle lines into AI Voiceover.`);
  };

  const handleGenerateAllVoiceover = async () => {
    if (!voScript.trim() && voiceoverSentences.length === 0) {
      setErrorMessage('Enter a script or load S1 subtitles first.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsGeneratingVo(true);
    stopPreviewAudio();

    try {
      const defaultSpeakerId = speakers[0]?.id || 'spk-narrator';
      const parsed = parseScriptIntoSentences(
        voScript,
        defaultSpeakerId,
        speakers,
        voMultiSpeaker
      );

      if (parsed.length === 0) {
        setErrorMessage('No spoken sentences found in your script.');
        setIsGeneratingVo(false);
        return;
      }

      const anchorStart = voAnchorAtPlayhead ? playhead.currentTime : 0;
      const initialRows: VoiceoverSentence[] = parsed.map((item, idx) => ({
        id: voiceoverSentences[idx]?.id || `vo-sent-${Date.now()}-${idx}`,
        index: idx + 1,
        speakerId: item.speakerId,
        text: item.text,
        start: anchorStart,
        duration: 2.0,
        status: 'generating',
      }));

      onUpdateVoiceoverSentences(initialRows);

      let working = [...initialRows];
      for (let i = 0; i < working.length; i++) {
        const row = working[i];
        try {
          const synth = await synthesizeSingleSentence(row.text, row.speakerId, true);
          working = working.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  ...synth,
                  status: 'ready' as const,
                  error: undefined,
                }
              : r
          );
          working = recalcSentenceTimestamps(working, anchorStart, 0.18);
          onUpdateVoiceoverSentences(working);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Generation failed';
          working = working.map((r, idx) =>
            idx === i ? { ...r, status: 'error' as const, error: msg } : r
          );
          onUpdateVoiceoverSentences(working);
          setErrorMessage(msg);
          break;
        }
      }

      const readyCount = working.filter((s) => s.status === 'ready').length;
      if (readyCount > 0) {
        onCommitVoiceoverToTimeline(working, voTargetTrack, voSyncSubtitles, true);
        setStatusMessage(
          `Generated ${readyCount} voiceover clip${readyCount === 1 ? '' : 's'} on ${
            voTargetTrack === 'track-a1' ? 'A1' : 'A2'
          }${voSyncSubtitles ? ' and synced S1 subtitles' : ''}.`
        );
      }
    } finally {
      setIsGeneratingVo(false);
    }
  };

  const handleRegenerateSingleSentence = async (sentenceId: string) => {
    const target = voiceoverSentences.find((s) => s.id === sentenceId);
    if (!target || !target.text.trim()) return;

    setErrorMessage(null);
    setStatusMessage(null);
    setRegeneratingSentenceId(sentenceId);
    stopPreviewAudio();

    try {
      onUpdateVoiceoverSentences(
        voiceoverSentences.map((s) =>
          s.id === sentenceId ? { ...s, status: 'generating', error: undefined } : s
        )
      );

      const synth = await synthesizeSingleSentence(target.text, target.speakerId, true);
      const anchorStart = voiceoverSentences[0]?.start ?? (voAnchorAtPlayhead ? playhead.currentTime : 0);

      const updatedRaw = voiceoverSentences.map((s) =>
        s.id === sentenceId
          ? {
              ...s,
              ...synth,
              status: 'ready' as const,
              error: undefined,
            }
          : s
      );
      const recalculated = recalcSentenceTimestamps(updatedRaw, anchorStart, 0.18);
      onUpdateVoiceoverSentences(recalculated);
      onCommitVoiceoverToTimeline(recalculated, voTargetTrack, voSyncSubtitles, true);

      setStatusMessage(
        `Regenerated sentence #${target.index} (${synth.duration.toFixed(2)}s) and synced timeline.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sentence regeneration failed.';
      onUpdateVoiceoverSentences(
        voiceoverSentences.map((s) =>
          s.id === sentenceId ? { ...s, status: 'error', error: msg } : s
        )
      );
      setErrorMessage(msg);
    } finally {
      setRegeneratingSentenceId(null);
    }
  };

  const handleTestSpeakerVoice = async (speaker: SpeakerProfile) => {
    setErrorMessage(null);
    setTestingSpeakerId(speaker.id);
    stopPreviewAudio();
    try {
      const synth = await synthesizeSingleSentence(
        `Hello, I am ${speaker.name}. Testing voice settings in AetherCut Studio.`,
        speaker.id,
        false
      );
      const audio = new Audio(synth.processedBlobUrl);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setTestingSpeakerId(null);
        previewAudioRef.current = null;
      };
      await audio.play();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to audition speaker voice.');
      setTestingSpeakerId(null);
    }
  };

  const handleAddSpeaker = () => {
    const idx = speakers.length + 1;
    const nextSpeaker: SpeakerProfile = {
      id: `spk-${Date.now()}`,
      name: `Speaker ${idx}`,
      color: SPEAKER_COLORS[(idx - 1) % SPEAKER_COLORS.length],
      voiceName: VOICE_OPTIONS[(idx - 1) % VOICE_OPTIONS.length].id,
      style: 'Natural',
      speed: 1.0,
      pitch: 0,
      customPersona: '',
    };
    onUpdateSpeakers([...speakers, nextSpeaker]);
  };

  const previewSampleText =
    subtitles[0]?.text ||
    'Welcome to AetherCut Studio — live subtitle styling preview.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subtitles-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#151722] border border-[#2b2e40] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#242738] bg-[#181a27] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Captions className="w-5 h-5 text-[#0a84ff] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="subtitles-modal-title"
                className="text-sm font-bold text-white tracking-wide uppercase truncate"
              >
                Subtitles &amp; AI Captions Studio
              </h2>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                .SRT Editor · AI Transcription · AI Voiceover · Multi-Speaker Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 5 Single-Line Tabs */}
            <div
              role="tablist"
              aria-label="Subtitles Studio sections"
              className="flex items-center bg-[#0f1118] p-0.5 rounded-lg border border-[#252838] gap-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'srt'}
                onClick={() => setActiveTab('srt')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'srt'
                    ? 'bg-[#0a84ff] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SRT Editor ({subtitles.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ai'}
                onClick={() => setActiveTab('ai')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  activeTab === 'ai'
                    ? 'bg-[#0a84ff] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Subtitles</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'voiceover'}
                onClick={() => setActiveTab('voiceover')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  activeTab === 'voiceover'
                    ? 'bg-[#0a84ff] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>AI Voiceover</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'styling'}
                onClick={() => setActiveTab('styling')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  activeTab === 'styling'
                    ? 'bg-[#0a84ff] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Subtitle Styling</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'speakers'}
                onClick={() => setActiveTab('speakers')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  activeTab === 'speakers'
                    ? 'bg-[#0a84ff] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Speaker Management</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Subtitles Studio"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#232638] shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status / Error Banner */}
        {(errorMessage || statusMessage) && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b shrink-0 ${
              errorMessage
                ? 'bg-red-950/60 border-red-800/50 text-red-200'
                : 'bg-blue-950/50 border-blue-800/40 text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {errorMessage ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <Captions className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span>{errorMessage || statusMessage}</span>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setStatusMessage(null);
              }}
              className="text-slate-400 hover:text-white ml-4"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
          {/* ==================== TAB 1: SRT EDITOR ==================== */}
          {activeTab === 'srt' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingSrt(true);
                  }}
                  onDragLeave={() => setIsDraggingSrt(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingSrt(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImportSrtFile(file);
                  }}
                  className={`lg:col-span-2 rounded-xl border border-dashed p-4 flex items-center justify-between gap-4 transition-colors ${
                    isDraggingSrt
                      ? 'border-[#0a84ff] bg-blue-950/20'
                      : 'border-[#2c3044] bg-[#11121a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#181b28] border border-[#262a3e] flex items-center justify-center shrink-0">
                      <FileUp className="w-5 h-5 text-[#0a84ff]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Import .SRT Subtitle File</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Drop a SubRip (.srt) file here or browse from your computer
                      </div>
                    </div>
                  </div>

                  <input
                    ref={srtInputRef}
                    type="file"
                    accept=".srt,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportSrtFile(file);
                      e.target.value = '';
                    }}
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => srtInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Browse .srt
                    </button>
                    <button
                      onClick={handleExportSrt}
                      disabled={subtitles.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1f2c] hover:bg-[#262a3b] disabled:opacity-40 border border-[#2c3144] text-slate-200 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export .srt</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#242738] bg-[#11121a] p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Voice &amp; Display Quick Actions</span>
                    <button
                      onClick={() =>
                        onUpdateSubtitleStyle({ enabled: !subtitleStyle.enabled })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        subtitleStyle.enabled
                          ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-blue-300'
                          : 'bg-[#191b26] border-[#292d3f] text-slate-500'
                      }`}
                    >
                      {subtitleStyle.enabled ? 'CC ON' : 'CC OFF'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleLoadSubtitlesIntoVoiceover();
                        setActiveTab('voiceover');
                      }}
                      disabled={subtitles.length === 0}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#16271d] hover:bg-[#1d3527] disabled:opacity-40 border border-[#284d37] text-emerald-300 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Read with AI Voice</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('styling')}
                      className="px-3 py-1.5 bg-[#1a1d2a] hover:bg-[#24283a] border border-[#2a2e42] text-slate-200 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      Style
                    </button>
                  </div>
                </div>
              </div>

              {/* Cue List Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Subtitle Track S1 ({subtitles.length} cues)
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alignAtPlayhead}
                      onChange={(e) => setAlignAtPlayhead(e.target.checked)}
                      className="accent-[#0a84ff]"
                    />
                    <span className="tabular-nums">
                      Shift import to playhead ({playhead.currentTime.toFixed(1)}s)
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddCueAtPlayhead}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#1b1e2c] hover:bg-[#24283a] border border-[#2b3044] rounded-md text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0a84ff]" />
                    <span>Add Cue at Playhead</span>
                  </button>
                  {subtitles.length > 0 && (
                    <button
                      onClick={() => onUpdateSubtitles([])}
                      className="px-2.5 py-1 bg-[#1b161b] hover:bg-red-950/50 border border-[#362228] rounded-md text-xs font-semibold text-red-300 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Cue Table */}
              {subtitles.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-[#262a3a] bg-[#101118]">
                  <Captions className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">No Subtitles Loaded</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Import an .srt file above, add manual cues, generate AI Subtitles, or create voiced captions in AI Voiceover.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#242738] bg-[#101118] divide-y divide-[#1b1e2a] max-h-[320px] overflow-y-auto">
                  {subtitles.map((cue, idx) => (
                    <div
                      key={cue.id}
                      className="p-2.5 flex items-start gap-2.5 hover:bg-[#151722] transition-colors"
                    >
                      <button
                        onClick={() => onSeek(cue.start)}
                        className="mt-1 px-1.5 py-0.5 rounded bg-[#1a1d2a] hover:bg-[#0a84ff] text-slate-300 hover:text-white text-[10px] font-mono tabular-nums flex items-center gap-1 shrink-0 transition-colors"
                        title={`Seek to ${formatSRTTimestamp(cue.start)}`}
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>#{idx + 1}</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          value={cue.start}
                          onChange={(e) => {
                            const nextStart = Math.max(0, parseFloat(e.target.value) || 0);
                            onUpdateSubtitles(
                              subtitles.map((c) =>
                                c.id === cue.id
                                  ? { ...c, start: nextStart, end: Math.max(nextStart + 0.25, c.end) }
                                  : c
                              )
                            );
                          }}
                          className="w-16 px-1.5 py-1 bg-[#0b0c12] border border-[#252838] rounded text-[11px] font-mono text-slate-200 tabular-nums"
                          title="Start (seconds)"
                        />
                        <span className="text-slate-600 text-xs">→</span>
                        <input
                          type="number"
                          step={0.1}
                          min={cue.start + 0.25}
                          value={cue.end}
                          onChange={(e) => {
                            const nextEnd = Math.max(cue.start + 0.25, parseFloat(e.target.value) || 0);
                            onUpdateSubtitles(
                              subtitles.map((c) => (c.id === cue.id ? { ...c, end: nextEnd } : c))
                            );
                          }}
                          className="w-16 px-1.5 py-1 bg-[#0b0c12] border border-[#252838] rounded text-[11px] font-mono text-slate-200 tabular-nums"
                          title="End (seconds)"
                        />
                      </div>

                      <textarea
                        rows={1}
                        value={cue.text}
                        onChange={(e) =>
                          onUpdateSubtitles(
                            subtitles.map((c) =>
                              c.id === cue.id ? { ...c, text: e.target.value } : c
                            )
                          )
                        }
                        className="flex-1 px-2.5 py-1 bg-[#0b0c12] border border-[#252838] focus:border-[#0a84ff] focus:outline-none rounded text-xs text-white resize-y min-h-[28px]"
                      />

                      <button
                        onClick={() =>
                          onUpdateSubtitles(
                            subtitles
                              .filter((c) => c.id !== cue.id)
                              .map((c, i) => ({ ...c, index: i + 1 }))
                          )
                        }
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-[#1e2130] shrink-0"
                        title="Delete Cue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ==================== TAB 2: AI SUBTITLES ==================== */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <button
                  onClick={() => setAiSource('media')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    aiSource === 'media'
                      ? 'border-[#0a84ff] bg-[#162033] text-white'
                      : 'border-[#252838] bg-[#11121a] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Film className="w-4 h-4 text-[#0a84ff]" />
                    <span>Clip / Audio File</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Transcribe dialogue from an uploaded video or audio file.
                  </p>
                </button>

                <button
                  onClick={() => setAiSource('mic')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    aiSource === 'mic'
                      ? 'border-[#0a84ff] bg-[#162033] text-white'
                      : 'border-[#252838] bg-[#11121a] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span>Microphone Voiceover</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Dictate narration live and align timed .srt captions.
                  </p>
                </button>

                <button
                  onClick={() => setAiSource('script')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    aiSource === 'script'
                      ? 'border-[#0a84ff] bg-[#162033] text-white'
                      : 'border-[#252838] bg-[#11121a] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Script / Scene Prompts</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Auto-time narration or silent B-roll captions across timeline.
                  </p>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#11121a] border border-[#242738]">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Target Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer py-1.5">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="accent-[#0a84ff]"
                    />
                    <span>Replace existing subtitles</span>
                  </label>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer py-1.5">
                    <input
                      type="checkbox"
                      checked={alignAtPlayhead}
                      onChange={(e) => setAlignAtPlayhead(e.target.checked)}
                      className="accent-[#0a84ff]"
                    />
                    <span className="tabular-nums">
                      Start at playhead ({playhead.currentTime.toFixed(1)}s)
                    </span>
                  </label>
                </div>
              </div>

              {aiSource === 'media' && (
                <div className="p-4 rounded-xl bg-[#11121a] border border-[#242738] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Transcribe Media from Project or Disk
                    </span>
                    <input
                      ref={audioUploadInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleDirectAudioFileUpload(f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => audioUploadInputRef.current?.click()}
                      disabled={isGenerating}
                      className="px-2.5 py-1 bg-[#1b1e2c] hover:bg-[#24283a] border border-[#2b3044] rounded-md text-[11px] font-semibold text-slate-200 transition-colors"
                    >
                      Upload Audio File (.mp3 / .wav)
                    </button>
                  </div>

                  {uploadedAvMedia.length > 0 ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedMediaId}
                        onChange={(e) => setSelectedMediaId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                      >
                        {uploadedAvMedia.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.type.toUpperCase()} · {Math.round(m.duration)}s)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleGenerateFromMedia}
                        disabled={isGenerating || !selectedMediaId}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0a84ff] hover:bg-[#0071e3] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>{isGenerating ? 'Transcribing...' : 'Generate AI Subtitles'}</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      No uploaded video/audio clips in the Event Browser yet. Import a video/audio
                      clip into the Event Browser, click &ldquo;Upload Audio File&rdquo; above, or
                      switch to Microphone / Script mode.
                    </p>
                  )}
                </div>
              )}

              {aiSource === 'mic' && (
                <div className="p-4 rounded-xl bg-[#11121a] border border-[#242738] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Microphone Recording</div>
                      <div className="text-[11px] text-slate-400">
                        Record your voiceover directly and convert it into timed .srt subtitles.
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        {Math.floor(recordingSeconds / 60)}:
                        {String(recordingSeconds % 60).padStart(2, '0')}
                      </span>
                      {!isRecording ? (
                        <button
                          onClick={startMicRecording}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Start Recording</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopMicRecording}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop Recording</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {recordedAudio && (
                    <div className="pt-2 border-t border-[#202332] flex flex-wrap items-center justify-between gap-3">
                      <audio controls src={recordedAudio.url} className="h-8 flex-1 min-w-[200px]" />
                      <button
                        onClick={handleGenerateFromRecordedAudio}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0a84ff] hover:bg-[#0071e3] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>{isGenerating ? 'Transcribing...' : 'Transcribe to Subtitles'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {aiSource === 'script' && (
                <div className="p-4 rounded-xl bg-[#11121a] border border-[#242738] space-y-3">
                  <div>
                    <label className="text-xs font-bold text-white block mb-1">
                      Script, Dialogue, or Scene Notes
                    </label>
                    <textarea
                      rows={4}
                      value={scriptPrompt}
                      onChange={(e) => setScriptPrompt(e.target.value)}
                      placeholder="Paste narration or describe what happens in your edit (e.g., Opening aerial shot over neon cyberpunk city, then hologram calibration sequence, ending at Emerald Falls)..."
                      className="w-full px-3 py-2 bg-[#0b0c12] border border-[#262a3a] focus:border-[#0a84ff] focus:outline-none rounded-lg text-xs text-white placeholder-slate-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      Aware of {clips.length} timeline clip{clips.length === 1 ? '' : 's'} ({playhead.duration.toFixed(0)}s sequence)
                    </span>
                    <button
                      onClick={handleGenerateFromScript}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0a84ff] hover:bg-[#0071e3] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{isGenerating ? 'Generating...' : 'Generate Timed Subtitles'}</span>
                    </button>
                  </div>
                </div>
              )}

              {lastTranscript && (
                <div className="p-3 rounded-xl bg-[#101118] border border-[#232636] space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Latest Transcript
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{lastTranscript}</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: AI VOICEOVER STUDIO ==================== */}
          {activeTab === 'voiceover' && (
            <div className="space-y-4">
              {/* Top Two-Column Studio Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Script Input & Subtitle Loader */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-[#11121a] border border-[#242738] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">Your Script or Subtitle Lines</div>
                      <div className="text-[11px] text-slate-400">
                        Type a script, read S1 subtitles aloud, or use &ldquo;Speaker: dialogue&rdquo; lines.
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleLoadSubtitlesIntoVoiceover}
                        className="px-2.5 py-1 bg-[#182236] hover:bg-[#1f2c46] border border-[#2a3b5c] text-blue-300 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap"
                        title="Load existing S1 subtitles into script editor"
                      >
                        Load S1 Subtitles ({subtitles.length})
                      </button>
                      <button
                        onClick={() => {
                          setVoMultiSpeaker(true);
                          setVoScript(
                            'Narrator: Welcome to AetherCut Studio.\nHost: Create amazing videos with powerful editing tools.\nGuest: Every sentence renders directly onto your timeline!'
                          );
                        }}
                        className="px-2 py-1 bg-[#191b26] hover:bg-[#222534] border border-[#282c3e] text-slate-300 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap"
                      >
                        Multi-Speaker Sample
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    value={voScript}
                    onChange={(e) => setVoScript(e.target.value)}
                    placeholder="Welcome to AetherCut Studio! Create amazing videos with powerful editing tools."
                    className="w-full px-3 py-2.5 bg-[#0b0c12] border border-[#262a3a] focus:border-[#0a84ff] focus:outline-none rounded-lg text-xs text-white placeholder-slate-500 leading-relaxed resize-y"
                  />

                  {/* Speaker Mode + Target Track + Sync Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0d0e15] border border-[#222536]">
                      <span className="text-[11px] font-semibold text-slate-300">Cast Mode</span>
                      <div className="flex items-center bg-[#151722] p-0.5 rounded border border-[#252838]">
                        <button
                          onClick={() => setVoMultiSpeaker(false)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            !voMultiSpeaker ? 'bg-[#0a84ff] text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Single Voice
                        </button>
                        <button
                          onClick={() => setVoMultiSpeaker(true)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            voMultiSpeaker ? 'bg-[#0a84ff] text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Multi-Speaker
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0d0e15] border border-[#222536]">
                      <span className="text-[11px] font-semibold text-slate-300">Insert Track</span>
                      <div className="flex items-center bg-[#151722] p-0.5 rounded border border-[#252838]">
                        <button
                          onClick={() => setVoTargetTrack('track-a1')}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                            voTargetTrack === 'track-a1'
                              ? 'bg-[#30d158]/25 text-emerald-300 border border-[#30d158]/60'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          A1 Dialogue
                        </button>
                        <button
                          onClick={() => setVoTargetTrack('track-a2')}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                            voTargetTrack === 'track-a2'
                              ? 'bg-[#30d158]/25 text-emerald-300 border border-[#30d158]/60'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          A2 Score/SFX
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={voSyncSubtitles}
                          onChange={(e) => setVoSyncSubtitles(e.target.checked)}
                          className="accent-[#0a84ff]"
                        />
                        <span>Sync S1 subtitles to voice timing</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={voAnchorAtPlayhead}
                          onChange={(e) => setVoAnchorAtPlayhead(e.target.checked)}
                          className="accent-[#0a84ff]"
                        />
                        <span className="tabular-nums">
                          Start at playhead ({playhead.currentTime.toFixed(1)}s)
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleGenerateAllVoiceover}
                      disabled={isGeneratingVo}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0a84ff] hover:bg-[#0071e3] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      {isGeneratingVo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      <span>
                        {isGeneratingVo ? 'Synthesizing...' : 'Generate Voiceover & Sync'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Right: Voice Selection, Style, Speed & Pitch */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-[#11121a] border border-[#242738] space-y-3.5">
                  {voMultiSpeaker ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Multi-Speaker Cast Active</span>
                        <button
                          onClick={() => setActiveTab('speakers')}
                          className="text-[11px] font-semibold text-[#0a84ff] hover:underline"
                        >
                          Manage Speakers →
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Prefix lines with a speaker name (e.g. <span className="font-mono text-slate-200">Host: Hello</span>) or assign each sentence&apos;s speaker directly below.
                      </p>
                      <div className="space-y-1.5">
                        {speakers.map((spk) => (
                          <div
                            key={spk.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0d0e15] border border-[#222536] text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: spk.color }}
                              />
                              <span className="font-semibold text-white truncate">{spk.name}</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                              {spk.voiceName} · {spk.style} · {spk.speed.toFixed(2)}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-bold text-white block mb-1.5">
                          Voice Selection
                        </label>
                        <select
                          value={voVoiceName}
                          onChange={(e) => setVoVoiceName(e.target.value as VoiceName)}
                          className="w-full px-2.5 py-1.5 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                        >
                          {VOICE_OPTIONS.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label} — {v.desc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">Voice Style</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {VOICE_STYLES.map((st) => (
                            <button
                              key={st}
                              onClick={() => setVoStyle(st)}
                              className={`py-1 px-2 rounded-md text-[11px] font-semibold border transition-colors ${
                                voStyle === st
                                  ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-blue-300'
                                  : 'bg-[#161822] border-[#252838] text-slate-400 hover:text-white'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Speaking Speed</span>
                            <span className="font-mono text-cyan-400 tabular-nums">
                              {voSpeed.toFixed(2)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.6}
                            max={1.8}
                            step={0.05}
                            value={voSpeed}
                            onChange={(e) => setVoSpeed(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-[#252838] rounded appearance-none cursor-pointer accent-[#0a84ff]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Voice Pitch</span>
                            <span className="font-mono text-cyan-400 tabular-nums">
                              {voPitch > 0 ? `+${voPitch}` : voPitch} st
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-6}
                            max={6}
                            step={1}
                            value={voPitch}
                            onChange={(e) => setVoPitch(parseInt(e.target.value, 10))}
                            className="w-full h-1.5 bg-[#252838] rounded appearance-none cursor-pointer accent-[#0a84ff]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">
                            Custom Voice Persona (Optional)
                          </label>
                          <input
                            type="text"
                            value={voCustomPersona}
                            onChange={(e) => setVoCustomPersona(e.target.value)}
                            placeholder="e.g., Warm documentary host with crisp diction"
                            className="w-full px-2.5 py-1.5 bg-[#0b0c12] border border-[#252838] focus:border-[#0a84ff] focus:outline-none rounded-lg text-xs text-white placeholder-slate-500"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sentence-by-Sentence Timeline Clips & Regenerate Section */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Generated Sentence Clips ({voiceoverSentences.length})
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      Each sentence becomes an independent clip on {voTargetTrack === 'track-a1' ? 'A1' : 'A2'} and synced caption on S1.
                    </span>
                  </div>

                  {voiceoverSentences.some((s) => s.status === 'ready') && (
                    <button
                      onClick={() => {
                        onCommitVoiceoverToTimeline(
                          voiceoverSentences,
                          voTargetTrack,
                          voSyncSubtitles,
                          true
                        );
                        setStatusMessage('Re-synced sentence audio clips and S1 subtitles to timeline.');
                      }}
                      className="px-3 py-1 bg-[#182236] hover:bg-[#202d47] border border-[#2c4166] text-blue-300 rounded-md text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      Re-Sync to Timeline
                    </button>
                  )}
                </div>

                {voiceoverSentences.length === 0 ? (
                  <div className="py-8 text-center rounded-xl border border-dashed border-[#262a3a] bg-[#101118]">
                    <Volume2 className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-300">
                      No Voiceover Sentences Generated Yet
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click &ldquo;Generate Voiceover &amp; Sync&rdquo; above to synthesize each sentence, preview audio, or regenerate individual lines.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#242738] bg-[#101118] divide-y divide-[#1b1e2a] max-h-[260px] overflow-y-auto">
                    {voiceoverSentences.map((sentence) => {
                      const spk = speakers.find((p) => p.id === sentence.speakerId) || speakers[0];
                      const isRowBusy =
                        sentence.status === 'generating' || regeneratingSentenceId === sentence.id;
                      const isPlayingThis = playingSentenceId === sentence.id;

                      return (
                        <div
                          key={sentence.id}
                          className="p-2.5 flex flex-wrap md:flex-nowrap items-center gap-2.5 hover:bg-[#151722] transition-colors"
                        >
                          {/* Play Preview & Sentence Index */}
                          <button
                            onClick={() => playSentencePreview(sentence)}
                            disabled={sentence.status !== 'ready' || !sentence.processedBlobUrl}
                            className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums flex items-center gap-1.5 shrink-0 border transition-colors ${
                              isPlayingThis
                                ? 'bg-[#0a84ff] border-[#0a84ff] text-white'
                                : 'bg-[#1a1d2a] border-[#292d40] text-slate-200 hover:bg-[#23273a] disabled:opacity-40'
                            }`}
                            title="Play / Pause Sentence Audio"
                          >
                            {isPlayingThis ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            <span>#{sentence.index}</span>
                          </button>

                          {/* Speaker Assignment */}
                          <select
                            value={sentence.speakerId}
                            onChange={(e) => {
                              const nextSpeakerId = e.target.value;
                              setVoMultiSpeaker(true);
                              onUpdateVoiceoverSentences(
                                voiceoverSentences.map((s) =>
                                  s.id === sentence.id ? { ...s, speakerId: nextSpeakerId } : s
                                )
                              );
                            }}
                            style={{ borderLeftColor: spk?.color || '#30d158', borderLeftWidth: '3px' }}
                            className="px-2 py-1 bg-[#181a26] border border-[#282c3e] rounded text-[11px] font-semibold text-white shrink-0"
                            title="Assign Speaker Voice"
                          >
                            {speakers.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name}
                              </option>
                            ))}
                          </select>

                          {/* Editable Sentence Text */}
                          <input
                            type="text"
                            value={sentence.text}
                            onChange={(e) => {
                              const nextText = e.target.value;
                              onUpdateVoiceoverSentences(
                                voiceoverSentences.map((s) =>
                                  s.id === sentence.id ? { ...s, text: nextText } : s
                                )
                              );
                            }}
                            className="flex-1 min-w-[180px] px-2.5 py-1 bg-[#0b0c12] border border-[#252838] focus:border-[#0a84ff] focus:outline-none rounded text-xs text-white"
                          />

                          {/* Waveform + Timing */}
                          <div className="flex items-center gap-2 shrink-0">
                            {sentence.waveformData && sentence.waveformData.length > 0 && (
                              <div className="hidden sm:flex items-end gap-px h-5 w-16 px-1 bg-[#0b0c12] rounded border border-[#202332]">
                                {sentence.waveformData.slice(0, 16).map((amp, wIdx) => (
                                  <div
                                    key={wIdx}
                                    className="flex-1 rounded-t-xs bg-emerald-400/80"
                                    style={{ height: `${Math.max(15, amp * 100)}%` }}
                                  />
                                ))}
                              </div>
                            )}
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums w-24 text-right">
                              {sentence.start.toFixed(1)}s · {sentence.duration.toFixed(2)}s
                            </span>
                          </div>

                          {/* Regenerate Single Sentence Button */}
                          <button
                            onClick={() => handleRegenerateSingleSentence(sentence.id)}
                            disabled={isRowBusy || isGeneratingVo}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#181c2b] hover:bg-[#22283d] disabled:opacity-50 border border-[#2d334c] rounded text-[11px] font-semibold text-slate-200 transition-colors shrink-0 whitespace-nowrap"
                            title="Regenerate only this sentence without re-recording the rest"
                          >
                            {isRowBusy ? (
                              <Loader2 className="w-3 h-3 animate-spin text-[#0a84ff]" />
                            ) : (
                              <RefreshCw className="w-3 h-3 text-emerald-400" />
                            )}
                            <span>{isRowBusy ? 'Working...' : 'Regenerate'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: SUBTITLE STYLING ==================== */}
          {activeTab === 'styling' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Live 16:9 Viewer Caption Preview */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Live Caption Preview
                  </span>
                  <button
                    onClick={() =>
                      onUpdateSubtitleStyle({ enabled: !subtitleStyle.enabled })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                      subtitleStyle.enabled
                        ? 'bg-[#0a84ff]/20 border-[#0a84ff] text-blue-300'
                        : 'bg-[#191b26] border-[#292d3f] text-slate-500'
                    }`}
                  >
                    {subtitleStyle.enabled ? 'Subtitles Enabled (CC ON)' : 'Subtitles Hidden (CC OFF)'}
                  </button>
                </div>

                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#262a3d] bg-linear-to-br from-[#0b101b] via-[#121826] to-[#0a0c12] flex items-center justify-center">
                  {/* Subtle film framing guide */}
                  <div className="absolute inset-4 border border-dashed border-white/10 rounded pointer-events-none" />
                  <div className="text-[11px] font-mono text-slate-600 select-none">
                    1920 × 1080 Master Monitor Safe Frame
                  </div>

                  {subtitleStyle.enabled && (
                    <div
                      className={`absolute left-0 right-0 px-6 flex justify-center pointer-events-none ${
                        subtitleStyle.position === 'top'
                          ? 'top-6'
                          : subtitleStyle.position === 'center'
                          ? 'top-1/2 -translate-y-1/2'
                          : 'bottom-6'
                      }`}
                    >
                      <div
                        style={{
                          fontFamily: subtitleStyle.fontFamily,
                          fontSize: `${Math.round(subtitleStyle.fontSize * 0.72)}px`,
                          color: subtitleStyle.color,
                          backgroundColor:
                            subtitleStyle.background === 'box' || subtitleStyle.background === 'bar'
                              ? `${subtitleStyle.backgroundColor}${Math.round(
                                  (subtitleStyle.backgroundOpacity ?? 0.82) * 255
                                )
                                  .toString(16)
                                  .padStart(2, '0')}`
                              : 'transparent',
                          textShadow:
                            subtitleStyle.background === 'shadow'
                              ? '0 2px 10px rgba(0,0,0,0.95)'
                              : 'none',
                          width: subtitleStyle.background === 'bar' ? '100%' : 'auto',
                        }}
                        className={`text-center font-semibold leading-snug px-4 py-1.5 ${
                          subtitleStyle.background === 'box' ? 'rounded-lg' : ''
                        }`}
                      >
                        {previewSampleText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Typography & Background Controls */}
              <div className="lg:col-span-5 p-4 rounded-xl border border-[#242738] bg-[#11121a] space-y-4">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Typography &amp; Background
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Font Family</label>
                  <select
                    value={subtitleStyle.fontFamily}
                    onChange={(e) =>
                      onUpdateSubtitleStyle({ fontFamily: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                  >
                    <option value='"Plus Jakarta Sans", Inter, system-ui, sans-serif'>
                      Plus Jakarta Sans
                    </option>
                    <option value='Inter, system-ui, sans-serif'>Inter Clean</option>
                    <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
                    <option value='Georgia, serif'>Georgia Serif</option>
                    <option value='Impact, "Arial Black", sans-serif'>Bold Title Display</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Font Size</span>
                    <span className="font-mono text-cyan-400 tabular-nums">
                      {subtitleStyle.fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={52}
                    step={2}
                    value={subtitleStyle.fontSize}
                    onChange={(e) =>
                      onUpdateSubtitleStyle({ fontSize: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1.5 bg-[#242838] rounded appearance-none cursor-pointer accent-[#0a84ff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Position</label>
                    <select
                      value={subtitleStyle.position}
                      onChange={(e) =>
                        onUpdateSubtitleStyle({
                          position: e.target.value as SubtitleStyle['position'],
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                    >
                      <option value="bottom">Bottom Safe</option>
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Background Style</label>
                    <select
                      value={subtitleStyle.background}
                      onChange={(e) =>
                        onUpdateSubtitleStyle({
                          background: e.target.value as SubtitleStyle['background'],
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                    >
                      <option value="box">Rounded Box</option>
                      <option value="bar">Full Bar</option>
                      <option value="shadow">Drop Shadow</option>
                      <option value="none">Plain Text</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Text Color</span>
                  <div className="flex items-center gap-2">
                    {['#ffffff', '#fde047', '#67e8f9', '#fca5a5'].map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateSubtitleStyle({ color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full border ${
                          subtitleStyle.color === c
                            ? 'border-white ring-2 ring-[#0a84ff]'
                            : 'border-slate-600'
                        }`}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={subtitleStyle.color}
                      onChange={(e) => onUpdateSubtitleStyle({ color: e.target.value })}
                      className="w-6 h-6 rounded border border-[#34394e] cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                {(subtitleStyle.background === 'box' || subtitleStyle.background === 'bar') && (
                  <div className="space-y-3 pt-2 border-t border-[#202332]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Background Color</span>
                      <input
                        type="color"
                        value={subtitleStyle.backgroundColor}
                        onChange={(e) =>
                          onUpdateSubtitleStyle({ backgroundColor: e.target.value })
                        }
                        className="w-6 h-6 rounded border border-[#34394e] cursor-pointer bg-transparent"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Background Opacity</span>
                        <span className="font-mono text-cyan-400 tabular-nums">
                          {Math.round(subtitleStyle.backgroundOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={subtitleStyle.backgroundOpacity}
                        onChange={(e) =>
                          onUpdateSubtitleStyle({
                            backgroundOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-1.5 bg-[#242838] rounded appearance-none cursor-pointer accent-[#0a84ff]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 5: SPEAKER MANAGEMENT ==================== */}
          {activeTab === 'speakers' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Multi-Speaker Cast &amp; Voice Profiles
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Assign unique AI voices, styles, speed, and pitch to each character. Use &ldquo;Name: dialogue&rdquo; in AI Voiceover scripts.
                  </p>
                </div>
                <button
                  onClick={handleAddSpeaker}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Speaker</span>
                </button>
              </div>

              <div className="space-y-3">
                {speakers.map((spk) => {
                  const updateSpk = (patch: Partial<SpeakerProfile>) => {
                    onUpdateSpeakers(
                      speakers.map((s) => (s.id === spk.id ? { ...s, ...patch } : s))
                    );
                  };
                  const isTesting = testingSpeakerId === spk.id;

                  return (
                    <div
                      key={spk.id}
                      className="p-4 rounded-xl border border-[#242738] bg-[#11121a] space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                          <input
                            type="color"
                            value={spk.color}
                            onChange={(e) => updateSpk({ color: e.target.value })}
                            className="w-6 h-6 rounded border border-[#34394e] cursor-pointer bg-transparent shrink-0"
                            title="Speaker Color"
                          />
                          <input
                            type="text"
                            value={spk.name}
                            onChange={(e) => updateSpk({ name: e.target.value })}
                            className="px-2.5 py-1 bg-[#0b0c12] border border-[#252838] focus:border-[#0a84ff] focus:outline-none rounded text-xs font-bold text-white w-44"
                            placeholder="Character Name"
                          />
                          <span className="text-[11px] font-mono text-slate-500">
                            {spk.voiceName} · {spk.style}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestSpeakerVoice(spk)}
                            disabled={isTesting}
                            className="flex items-center gap-1.5 px-3 py-1 bg-[#182236] hover:bg-[#202d47] border border-[#2c4166] text-blue-300 rounded-md text-xs font-semibold transition-colors"
                          >
                            {isTesting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            <span>{isTesting ? 'Playing...' : 'Test Voice'}</span>
                          </button>

                          {speakers.length > 1 && (
                            <button
                              onClick={() =>
                                onUpdateSpeakers(speakers.filter((s) => s.id !== spk.id))
                              }
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-[#1e2130]"
                              title="Remove Speaker"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Voice</label>
                          <select
                            value={spk.voiceName}
                            onChange={(e) =>
                              updateSpk({ voiceName: e.target.value as VoiceName })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                          >
                            {VOICE_OPTIONS.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Style</label>
                          <select
                            value={spk.style}
                            onChange={(e) =>
                              updateSpk({ style: e.target.value as VoiceStyle })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#181a26] border border-[#282c3e] rounded-lg text-xs text-white"
                          >
                            {VOICE_STYLES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">Speed</span>
                            <span className="font-mono text-cyan-400 tabular-nums">
                              {spk.speed.toFixed(2)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.6}
                            max={1.8}
                            step={0.05}
                            value={spk.speed}
                            onChange={(e) => updateSpk({ speed: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-[#242838] rounded appearance-none cursor-pointer accent-[#0a84ff] mt-1.5"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">Pitch</span>
                            <span className="font-mono text-cyan-400 tabular-nums">
                              {spk.pitch > 0 ? `+${spk.pitch}` : spk.pitch} st
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-6}
                            max={6}
                            step={1}
                            value={spk.pitch}
                            onChange={(e) => updateSpk({ pitch: parseInt(e.target.value, 10) })}
                            className="w-full h-1.5 bg-[#242838] rounded appearance-none cursor-pointer accent-[#0a84ff] mt-1.5"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={spk.customPersona}
                          onChange={(e) => updateSpk({ customPersona: e.target.value })}
                          placeholder="Optional vocal persona note (e.g., Confident sci-fi AI with calm pacing)"
                          className="w-full px-2.5 py-1.5 bg-[#0b0c12] border border-[#252838] focus:border-[#0a84ff] focus:outline-none rounded-lg text-xs text-white placeholder-slate-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#242738] bg-[#181a27] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>
            Subtitles render live on S1 and generated voiceovers play directly from A1/A2.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#242838] hover:bg-[#31364b] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
