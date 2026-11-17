import React, { useState, useEffect, useRef } from 'react';
import {
  MediaItem,
  PlayheadState,
  Resolution,
  SubtitleCue,
  SubtitleStyle,
  TimelineClip,
  TimelineTrack,
  ToastNotification,
} from '../../types/editor';
import { audioEngine } from '../../engine/audioEngine';
import { Download, Film, Cpu, Volume2, Captions } from 'lucide-react';

interface DeliverModalProps {
  isOpen: boolean;
  onClose: () => void;
  playhead: PlayheadState;
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  subtitles: SubtitleCue[];
  subtitleStyle: SubtitleStyle;
  renderFrameAtTime: (time: number, width?: number, height?: number) => HTMLCanvasElement | null;
  onNotify?: (toast: Omit<ToastNotification, 'id'>) => void;
}

function pickRecorderMimeType(preferredFormat: 'mp4' | 'webm'): {
  mimeType: string;
  actualExt: 'mp4' | 'webm';
} {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', actualExt: 'webm' };
  }

  const mp4Candidates = [
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
  ];
  const webmCandidates = [
    'video/webm; codecs=vp9,opus',
    'video/webm; codecs=vp8,opus',
    'video/webm; codecs=vp9',
    'video/webm',
  ];

  if (preferredFormat === 'mp4') {
    for (const candidate of mp4Candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return { mimeType: candidate, actualExt: 'mp4' };
      }
    }
  }

  for (const candidate of webmCandidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return { mimeType: candidate, actualExt: 'webm' };
    }
  }

  return { mimeType: 'video/webm', actualExt: 'webm' };
}

export const DeliverModal: React.FC<DeliverModalProps> = ({
  isOpen,
  onClose,
  playhead,
  clips,
  tracks,
  mediaItems,
  subtitles,
  subtitleStyle,
  renderFrameAtTime,
  onNotify,
}) => {
  const [format, setFormat] = useState<'mp4' | 'webm'>('webm');
  const [resolution, setResolution] = useState<Resolution>({
    width: 1920,
    height: 1080,
    label: '1080p FHD (1920x1080)',
  });
  const [fps, setFps] = useState(24);
  const [bitrateMbps, setBitrateMbps] = useState(25);
  const [exportRange, setExportRange] = useState<'entire' | 'in_out'>('entire');

  // Render State
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadExt, setDownloadExt] = useState<'mp4' | 'webm'>('webm');
  const [renderedSizeMb, setRenderedSizeMb] = useState<number | null>(null);
  const [renderedMeta, setRenderedMeta] = useState<string | null>(null);

  const cancelRequestedRef = useRef(false);
  const downloadUrlRef = useRef<string | null>(null);

  useEffect(() => {
    downloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRendering) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isRendering, onClose]);

  const hasValidInOut =
    playhead.inPoint !== null &&
    playhead.outPoint !== null &&
    playhead.outPoint > playhead.inPoint + 0.25;

  const activeAudioClipCount = clips.filter((c) => {
    if (c.trackType !== 'audio' || c.muted || c.volume === 0) return false;
    const tr = tracks.find((t) => t.id === c.trackId);
    return !tr?.muted;
  }).length;

  const activeSubtitlesEnabled = subtitleStyle.enabled && subtitles.length > 0;

  const startRender = async () => {
    cancelRequestedRef.current = false;
    setIsRendering(true);
    setProgress(0);
    setCurrentFrame(0);
    setRenderedMeta(null);
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
    setDownloadUrl(null);
    setRenderedSizeMb(null);

    const startTime = exportRange === 'in_out' && hasValidInOut ? playhead.inPoint! : 0;
    const endTime =
      exportRange === 'in_out' && hasValidInOut
        ? playhead.outPoint!
        : Math.max(5, playhead.duration);
    const duration = Math.max(1, endTime - startTime);
    const frameCount = Math.max(1, Math.floor(duration * fps));
    setTotalFrames(frameCount);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = resolution.width;
    exportCanvas.height = resolution.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      setIsRendering(false);
      onNotify?.({
        level: 'error',
        title: 'Export initialization failed',
        message: 'Could not create an offscreen 2D canvas context for rendering.',
      });
      return;
    }

    let exportAudioCtx: AudioContext | null = null;
    let combinedStream: MediaStream | null = null;
    let audioSource: AudioBufferSourceNode | null = null;

    try {
      // 1. Offline Audio Mixdown across A1/A2 active clips
      const { buffer: mixedAudioBuffer, activeClipCount: muxedAudioClips } =
        await audioEngine.renderOfflineMix(startTime, duration, clips, tracks, mediaItems, 48000);

      // 2. Create real-time MediaStream combining Video Canvas + Mixed Audio Bus
      const videoStream = exportCanvas.captureStream(fps);
      const tracksToCombine: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      exportAudioCtx = new AudioCtx({ sampleRate: 48000 });
      if (exportAudioCtx.state === 'suspended') {
        await exportAudioCtx.resume().catch(() => {});
      }

      const audioDest = exportAudioCtx.createMediaStreamDestination();
      audioSource = exportAudioCtx.createBufferSource();
      audioSource.buffer = mixedAudioBuffer;
      audioSource.connect(audioDest);

      const audioTracks = audioDest.stream.getAudioTracks();
      tracksToCombine.push(...audioTracks);
      combinedStream = new MediaStream(tracksToCombine);

      const { mimeType, actualExt } = pickRecorderMimeType(format);
      if (format === 'mp4' && actualExt !== 'mp4') {
        onNotify?.({
          level: 'info',
          title: 'Browser encoded as WebM (VP9/Opus)',
          message: 'Native MP4 MediaRecorder is unavailable in this browser; using WebM with audio.',
        });
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: bitrateMbps * 1_000_000,
        audioBitsPerSecond: 192_000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recorderFinishedPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, {
            type: actualExt === 'mp4' ? 'video/mp4' : 'video/webm',
          });
          resolve(blob);
        };
      });

      // Draw initial frame before starting capture
      const firstFrame = renderFrameAtTime(startTime, resolution.width, resolution.height);
      if (firstFrame) {
        ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(firstFrame, 0, 0, exportCanvas.width, exportCanvas.height);
      }

      mediaRecorder.start(100);
      audioSource.start(0);
      const startPerf = performance.now();

      for (let f = 0; f < frameCount; f++) {
        if (cancelRequestedRef.current) break;

        const t = startTime + f / fps;
        const sourceFrame = renderFrameAtTime(t, resolution.width, resolution.height);
        if (sourceFrame) {
          ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
          ctx.drawImage(sourceFrame, 0, 0, exportCanvas.width, exportCanvas.height);
        }

        setCurrentFrame(f + 1);
        setProgress(Math.round(((f + 1) / frameCount) * 100));

        // Pace render accurately to target FPS so video frames align 1:1 with audio stream
        const targetElapsedMs = ((f + 1) / fps) * 1000;
        const waitMs = Math.max(0, Math.round(startPerf + targetElapsedMs - performance.now()));
        await new Promise((r) => setTimeout(r, waitMs));
      }

      try {
        audioSource.stop();
      } catch {
        // already stopped
      }

      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      const outputBlob = await recorderFinishedPromise;

      if (cancelRequestedRef.current) {
        onNotify?.({
          level: 'info',
          title: 'Render cancelled',
          message: 'Export render was stopped before completion.',
        });
        return;
      }

      const url = URL.createObjectURL(outputBlob);
      downloadUrlRef.current = url;
      setDownloadUrl(url);
      setDownloadExt(actualExt);
      setRenderedSizeMb(Number((outputBlob.size / (1024 * 1024)).toFixed(2)));
      setRenderedMeta(
        `${resolution.width}×${resolution.height} · ${fps} fps · ${
          muxedAudioClips > 0 ? `${muxedAudioClips} audio clip${muxedAudioClips > 1 ? 's' : ''}` : 'Silent audio track'
        }${activeSubtitlesEnabled ? ` · ${subtitles.length} burn-in captions` : ''}`
      );
      onNotify?.({
        level: 'success',
        title: 'Export render completed',
        message: `Rendered ${frameCount} frames (${resolution.width}×${resolution.height}) with audio${
          activeSubtitlesEnabled ? ' and subtitles' : ''
        }.`,
      });
    } catch (err) {
      onNotify?.({
        level: 'error',
        title: 'Render export failed',
        message: err instanceof Error ? err.message : 'Browser MediaRecorder failed during encoding.',
      });
    } finally {
      if (combinedStream) {
        combinedStream.getTracks().forEach((tr) => tr.stop());
      }
      if (exportAudioCtx) {
        await exportAudioCtx.close().catch(() => {});
      }
      setIsRendering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deliver-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRendering) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#151722] border border-[#2b2e40] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#242738] bg-[#181a27] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-blue-400" aria-hidden="true" />
            <h2
              id="deliver-modal-title"
              className="text-sm font-bold text-white tracking-wide uppercase"
            >
              DELIVER &amp; RENDER QUEUE (MULTI-PLATFORM EXPORTER)
            </h2>
          </div>
          <button
            type="button"
            disabled={isRendering}
            onClick={onClose}
            aria-label="Close Deliver Modal"
            className="text-slate-400 hover:text-white disabled:opacity-40 px-2 py-1 rounded hover:bg-[#232638]"
          >
            ✕
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Resolution &amp; Aspect Ratio
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { width: 3840, height: 2160, label: '4K UHD (3840x2160)' },
                { width: 1920, height: 1080, label: '1080p FHD (1920x1080)' },
                { width: 1280, height: 720, label: '720p HD (1280x720)' },
                { width: 1080, height: 1920, label: '9:16 Vertical (Reels/Shorts)' },
                { width: 1080, height: 1080, label: '1:1 Square (Social)' },
              ].map((res) => (
                <button
                  key={res.label}
                  disabled={isRendering}
                  onClick={() => setResolution(res)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors disabled:opacity-60 ${
                    resolution.label === res.label
                      ? 'border-blue-500 bg-blue-600/20 text-white font-semibold'
                      : 'border-[#282c3e] bg-[#1a1d2b] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block truncate">{res.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Codec & Bitrate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Container Format</label>
              <select
                value={format}
                disabled={isRendering}
                onChange={(e) => setFormat(e.target.value as 'mp4' | 'webm')}
                className="w-full px-3 py-2 bg-[#1a1d2b] border border-[#282c3e] rounded-lg text-xs text-white"
              >
                <option value="webm">WebM (VP9 + Opus Audio)</option>
                <option value="mp4">MP4 (H.264 + AAC Audio)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Frame Rate</label>
              <select
                value={fps}
                disabled={isRendering}
                onChange={(e) => setFps(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-[#1a1d2b] border border-[#282c3e] rounded-lg text-xs text-white"
              >
                <option value="24">24 fps (Cinematic Standard)</option>
                <option value="30">30 fps (Web / Broadcast)</option>
                <option value="60">60 fps (Smooth High Motion)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Bitrate</span>
                <span className="font-mono text-blue-400 tabular-nums">{bitrateMbps} Mbps</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                step={5}
                disabled={isRendering}
                value={bitrateMbps}
                onChange={(e) => setBitrateMbps(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-[#282c3e] rounded-lg appearance-none cursor-pointer mt-1.5"
              />
            </div>
          </div>

          {/* Render Range */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Export Range</label>
            <div className="flex gap-2">
              <button
                disabled={isRendering}
                onClick={() => setExportRange('entire')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border ${
                  exportRange === 'entire'
                    ? 'border-blue-500 bg-blue-600/20 text-white'
                    : 'border-[#282c3e] bg-[#1a1d2b] text-slate-400'
                }`}
              >
                Entire Timeline ({Math.max(5, playhead.duration).toFixed(1)}s)
              </button>
              <button
                disabled={isRendering || !hasValidInOut}
                onClick={() => setExportRange('in_out')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border disabled:opacity-50 ${
                  exportRange === 'in_out'
                    ? 'border-blue-500 bg-blue-600/20 text-white'
                    : 'border-[#282c3e] bg-[#1a1d2b] text-slate-400'
                }`}
              >
                In to Out Range (
                {hasValidInOut
                  ? `${(playhead.outPoint! - playhead.inPoint!).toFixed(1)}s`
                  : 'Set I/O points'}
                )
              </button>
            </div>
          </div>

          {/* Audio + Subtitle Burn-In Summary */}
          <div className="flex flex-wrap items-center gap-4 px-3.5 py-2.5 rounded-xl bg-[#10121a] border border-[#242738] text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Audio Mix:{' '}
                <strong className="text-white">
                  {activeAudioClipCount > 0
                    ? `${activeAudioClipCount} active audio clip${activeAudioClipCount > 1 ? 's' : ''} (48kHz Stereo)`
                    : 'No active A1/A2 clips (Silent track)'}
                </strong>
              </span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <Captions className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Subtitles:{' '}
                <strong className="text-white">
                  {activeSubtitlesEnabled
                    ? `Burn-in enabled (${subtitles.length} cues)`
                    : subtitles.length > 0
                    ? 'CC Hidden (Toggle CC on S1 to burn in)'
                    : 'None'}
                </strong>
              </span>
            </span>
          </div>

          {/* Progress & Result Box */}
          {(isRendering || downloadUrl) && (
            <div className="p-4 rounded-xl bg-[#111219] border border-[#252837] space-y-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-white">
                  {isRendering ? 'Rendering Video + Audio Sequence...' : 'Render Completed!'}
                </span>
                <span className="font-mono text-blue-400 tabular-nums">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-[#1f2231] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                <span>
                  Frame {currentFrame} of {totalFrames}
                </span>
                {renderedMeta && <span className="text-slate-300">{renderedMeta}</span>}
                {renderedSizeMb !== null && <span>File Size: ~{renderedSizeMb} MB</span>}
              </div>

              {downloadUrl && (
                <div className="pt-2 flex justify-end">
                  <a
                    href={downloadUrl}
                    download={`AetherCut_${resolution.width}x${resolution.height}_${Date.now()}.${downloadExt}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Master {resolution.width === 1920 ? '1080p ' : ''}Video File</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#242738] bg-[#181a27] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Native canvas + Web Audio muxed encoding · Zero watermarks
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isRendering) {
                  cancelRequestedRef.current = true;
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              {isRendering ? 'Stop Render' : 'Cancel'}
            </button>
            <button
              disabled={isRendering}
              onClick={startRender}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              <Cpu className="w-4 h-4" />
              <span>{isRendering ? 'Rendering...' : 'Start Render Queue'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
