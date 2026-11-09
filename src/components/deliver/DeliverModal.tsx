import React, { useState, useRef } from 'react';
import { PlayheadState, ProjectSettings, Resolution } from '../../types/editor';
import {
  Download,
  CheckCircle2,
  Film,
  HardDrive,
  Cpu,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';

interface DeliverModalProps {
  isOpen: boolean;
  onClose: () => void;
  playhead: PlayheadState;
  renderFrameAtTime: (time: number) => HTMLCanvasElement | null;
}

export const DeliverModal: React.FC<DeliverModalProps> = ({
  isOpen,
  onClose,
  playhead,
  renderFrameAtTime,
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
  const [renderedSizeMb, setRenderedSizeMb] = useState<number | null>(null);

  const startRender = async () => {
    setIsRendering(true);
    setProgress(0);
    setDownloadUrl(null);
    setRenderedSizeMb(null);

    const startTime = exportRange === 'in_out' && playhead.inPoint !== null ? playhead.inPoint : 0;
    const endTime =
      exportRange === 'in_out' && playhead.outPoint !== null
        ? playhead.outPoint
        : Math.max(5, playhead.duration);
    const duration = Math.max(1, endTime - startTime);
    const frameCount = Math.floor(duration * fps);
    setTotalFrames(frameCount);

    // Setup an offscreen export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = resolution.width;
    exportCanvas.height = resolution.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      setIsRendering(false);
      return;
    }

    try {
      // Setup MediaRecorder from canvas stream
      const stream = exportCanvas.captureStream(fps);
      const mimeType =
        format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')
          ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
          : 'video/webm; codecs=vp9';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
        videoBitsPerSecond: bitrateMbps * 1000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recorderFinishedPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
          resolve(blob);
        };
      });

      mediaRecorder.start();

      // Step frame by frame through the timeline
      for (let f = 0; f < frameCount; f++) {
        const t = startTime + f / fps;
        const sourceFrame = renderFrameAtTime(t);
        if (sourceFrame) {
          ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
          ctx.drawImage(sourceFrame, 0, 0, exportCanvas.width, exportCanvas.height);
        }

        setCurrentFrame(f + 1);
        setProgress(Math.round(((f + 1) / frameCount) * 100));

        // Yield to browser execution
        await new Promise((r) => setTimeout(r, 16));
      }

      mediaRecorder.stop();
      const outputBlob = await recorderFinishedPromise;
      const url = URL.createObjectURL(outputBlob);
      setDownloadUrl(url);
      setRenderedSizeMb(Number((outputBlob.size / (1024 * 1024)).toFixed(2)));
    } catch (err) {
      console.error('Render error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#151722] border border-[#2b2e40] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#242738] bg-[#181a27] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              DELIVER & RENDER QUEUE (MULTI-PLATFORM EXPORTER)
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">
            ✕
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Resolution & Aspect Ratio
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
                  onClick={() => setResolution(res)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
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
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#1a1d2b] border border-[#282c3e] rounded-lg text-xs text-white"
              >
                <option value="webm">WebM (VP9 / High Compatibility)</option>
                <option value="mp4">MP4 (H.264 / AAC)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Frame Rate</label>
              <select
                value={fps}
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
                <span className="font-mono text-blue-400">{bitrateMbps} Mbps</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                step={5}
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
                onClick={() => setExportRange('entire')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border ${
                  exportRange === 'entire'
                    ? 'border-blue-500 bg-blue-600/20 text-white'
                    : 'border-[#282c3e] bg-[#1a1d2b] text-slate-400'
                }`}
              >
                Entire Timeline ({playhead.duration.toFixed(1)}s)
              </button>
              <button
                onClick={() => setExportRange('in_out')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border ${
                  exportRange === 'in_out'
                    ? 'border-blue-500 bg-blue-600/20 text-white'
                    : 'border-[#282c3e] bg-[#1a1d2b] text-slate-400'
                }`}
              >
                In to Out Range (
                {playhead.inPoint !== null && playhead.outPoint !== null
                  ? `${(playhead.outPoint - playhead.inPoint).toFixed(1)}s`
                  : 'Set I/O points'}
                )
              </button>
            </div>
          </div>

          {/* Progress & Result Box */}
          {(isRendering || downloadUrl) && (
            <div className="p-4 rounded-xl bg-[#111219] border border-[#252837] space-y-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-white">
                  {isRendering ? 'Rendering Sequence...' : 'Render Completed!'}
                </span>
                <span className="font-mono text-blue-400">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-[#1f2231] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>
                  Frame {currentFrame} of {totalFrames}
                </span>
                {renderedSizeMb && <span>File Size: ~{renderedSizeMb} MB</span>}
              </div>

              {downloadUrl && (
                <div className="pt-2 flex justify-end">
                  <a
                    href={downloadUrl}
                    download={`AetherCut_Render_${Date.now()}.${format}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Master Video File</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#242738] bg-[#181a27] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Native hardware canvas encoding · Zero watermarks
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
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
