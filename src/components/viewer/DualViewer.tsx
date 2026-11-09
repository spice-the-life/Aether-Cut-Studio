import React, { useRef, useEffect, useState } from 'react';
import { PlayheadState } from '../../types/editor';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Maximize2,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  SplitSquareVertical,
  Square,
  Repeat,
  Tv,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize,
  Columns,
} from 'lucide-react';
import { audioEngine } from '../../engine/audioEngine';

interface DualViewerProps {
  viewer1CanvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewer2CanvasRef: React.RefObject<HTMLCanvasElement | null>;
  playhead: PlayheadState;
  fps: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onShuttle: (rate: number) => void;
  onToggleLoop: () => void;
  onSetInPoint: () => void;
  onSetOutPoint: () => void;
  onOpenScopes: () => void;
  viewer1Title?: string;
  viewer2Title?: string;
  isBrowserOpen?: boolean;
  onToggleBrowser?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

export function formatTimecode(seconds: number, fps = 24): string {
  const totalFrames = Math.max(0, Math.floor(seconds * fps));
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

export const DualViewer: React.FC<DualViewerProps> = ({
  viewer1CanvasRef,
  viewer2CanvasRef,
  playhead,
  fps,
  onTogglePlay,
  onSeek,
  onShuttle,
  onToggleLoop,
  onSetInPoint,
  onSetOutPoint,
  onOpenScopes,
  viewer1Title = 'Viewer 1 (Source / Node)',
  viewer2Title = 'Master Video Monitor',
  isBrowserOpen = true,
  onToggleBrowser,
  isInspectorOpen = false,
  onToggleInspector,
  isTheaterMode = false,
  onToggleTheater,
}) => {
  const [isDualView, setIsDualView] = useState(false);
  const [aspectGuide, setAspectGuide] = useState<'16:9' | '2.39:1' | '9:16' | '1:1'>('16:9');
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [audioMeter, setAudioMeter] = useState({ leftPeak: -60, rightPeak: -60, leftRms: -60, rightRms: -60 });
  const [isMuted, setIsMuted] = useState(false);

  // Meter update loop
  useEffect(() => {
    let animId: number;
    const pollMeters = () => {
      const levels = audioEngine.getMeterLevels();
      setAudioMeter(levels);
      animId = requestAnimationFrame(pollMeters);
    };
    animId = requestAnimationFrame(pollMeters);
    return () => cancelAnimationFrame(animId);
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.setMute(next);
  };

  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 92 + (db / 3) * 8;
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 92));
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#08090c] border-b border-[#1f212c] min-w-0 select-none overflow-hidden">
      {/* Viewer Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#1c1e28] bg-[#111218] shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Toggle Browser Button */}
          {onToggleBrowser && (
            <button
              onClick={onToggleBrowser}
              className={`p-1.5 rounded-md border transition-colors ${
                isBrowserOpen
                  ? 'bg-[#1c1e2a] border-[#292c3d] text-blue-400'
                  : 'bg-[#12131a] border-[#20222e] text-slate-400 hover:text-white'
              }`}
              title={isBrowserOpen ? 'Hide Media Browser (⌘1)' : 'Show Media Browser (⌘1)'}
            >
              {isBrowserOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-blue-400" />}
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wider uppercase font-sans">
              {isDualView ? 'DUAL VIEWER (A / B SPLIT)' : viewer2Title}
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs font-mono text-blue-400 font-bold tracking-wider tabular-nums bg-[#08090d] px-2 py-0.5 rounded border border-[#1f212c]">
              {formatTimecode(playhead.currentTime, fps)}
            </span>
          </div>
        </div>

        {/* View Controls & Scopes */}
        <div className="flex items-center gap-1.5">
          {/* Aspect Ratio Guides Selector */}
          <div className="flex items-center gap-0.5 bg-[#0a0b0e] p-0.5 rounded-lg border border-[#1d1f2b]">
            {(['16:9', '2.39:1', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectGuide(ratio)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  aspectGuide === ratio
                    ? 'bg-[#0a84ff] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Aspect Guide: ${ratio}`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {/* Action & Title Safe Margins */}
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showSafeZones
                ? 'border-blue-500 bg-blue-950/40 text-blue-300'
                : 'border-[#1f212c] bg-[#111218] text-slate-400 hover:text-white'
            }`}
            title="Toggle Action & Title Safe Margins"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          {/* Dual Split View Toggle */}
          <button
            onClick={() => setIsDualView(!isDualView)}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border transition-colors ${
              isDualView
                ? 'bg-blue-600/30 border-blue-500 text-white'
                : 'border-[#1f212c] bg-[#111218] hover:bg-[#181a24] text-slate-300'
            }`}
            title="Toggle Split Dual View"
          >
            {isDualView ? <SplitSquareVertical className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            <span>{isDualView ? 'Dual' : 'Single'}</span>
          </button>

          {/* Scopes */}
          <button
            onClick={onOpenScopes}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-300 hover:text-white rounded-lg border border-[#1f212c] bg-[#111218] hover:bg-[#181a24] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Scopes</span>
          </button>

          {/* Theater Full View */}
          {onToggleTheater && (
            <button
              onClick={onToggleTheater}
              className={`p-1.5 rounded-lg border transition-colors ${
                isTheaterMode
                  ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                  : 'border-[#1f212c] bg-[#111218] text-slate-400 hover:text-white'
              }`}
              title={isTheaterMode ? 'Restore Normal Layout' : 'Full Theater Monitor (Shift+F)'}
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle Inspector Button */}
          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`p-1.5 rounded-md border transition-colors ${
                isInspectorOpen
                  ? 'bg-[#1c1e2a] border-[#292c3d] text-blue-400'
                  : 'bg-[#12131a] border-[#20222e] text-slate-400 hover:text-white'
              }`}
              title={isInspectorOpen ? 'Hide Inspector (⌘4)' : 'Show Inspector (⌘4)'}
            >
              {isInspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5 text-blue-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Full-Width Video Stage Viewport */}
      <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden min-h-0 bg-[#050608]">
        <div className={`w-full h-full flex items-center justify-center gap-2 ${isDualView ? 'flex-row' : ''}`}>
          {/* Viewer 1 (Node / Source Inspection) */}
          {isDualView && (
            <div className="flex-1 h-full flex flex-col items-center justify-center relative rounded-xl border border-[#1f212c] bg-black overflow-hidden shadow-2xl">
              <div className="absolute top-2 left-2 z-20 bg-cyan-950/85 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 font-bold backdrop-blur-md shadow">
                VIEWER 1: {viewer1Title}
              </div>
              <canvas
                ref={viewer1CanvasRef}
                width={1280}
                height={720}
                className="w-full h-full object-contain block"
              />
            </div>
          )}

          {/* Viewer 2 (Master Video Monitor Hero Canvas) */}
          <div className="flex-1 h-full flex flex-col items-center justify-center relative rounded-xl border border-[#1c1e28] bg-[#030406] overflow-hidden shadow-2xl">
            <div className="absolute top-2 left-2 z-20 bg-[#0e1017]/90 border border-[#222430] px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 font-bold backdrop-blur-md shadow">
              {viewer2Title}
            </div>

            {/* Video Canvas */}
            <canvas
              ref={viewer2CanvasRef}
              width={1280}
              height={720}
              className="w-full h-full object-contain block"
            />

            {/* Aspect Ratio Guides Overlay */}
            {aspectGuide === '2.39:1' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                <div className="h-[12%] w-full bg-black/95 border-b border-white/20" />
                <div className="h-[12%] w-full bg-black/95 border-t border-white/20" />
              </div>
            )}
            {aspectGuide === '9:16' && (
              <div className="absolute inset-0 pointer-events-none flex justify-center">
                <div className="w-[30%] h-full border-x-2 border-dashed border-amber-400/60 bg-black/35" />
              </div>
            )}
            {aspectGuide === '1:1' && (
              <div className="absolute inset-0 pointer-events-none flex justify-center">
                <div className="w-[56.25%] h-full border-x-2 border-dashed border-cyan-400/60 bg-black/30" />
              </div>
            )}

            {/* Action / Title Safe Margins */}
            {showSafeZones && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[90%] h-[90%] border border-cyan-400/40 relative">
                  <span className="absolute top-1 left-1 text-[8px] font-mono text-cyan-400/80">90% ACTION SAFE</span>
                </div>
                <div className="absolute w-[80%] h-[80%] border border-amber-400/40">
                  <span className="absolute top-1 left-1 text-[8px] font-mono text-amber-400/80">80% TITLE SAFE</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Stereo Audio VU Meter Strip (Apple FCP Signature Slim) */}
        <div className="w-4 h-44 ml-1.5 flex flex-col items-center justify-between bg-[#0a0b0f] border border-[#1c1e28] rounded-md p-1 shadow-lg shrink-0">
          <div className="flex gap-0.5 h-full w-full justify-center">
            {/* Left Channel */}
            <div className="w-1.5 h-full bg-[#12131a] rounded-xs relative flex flex-col justify-end overflow-hidden">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 rounded-xs transition-all duration-75"
                style={{ height: `${dbToPercent(audioMeter.leftPeak)}%` }}
              />
            </div>
            {/* Right Channel */}
            <div className="w-1.5 h-full bg-[#12131a] rounded-xs relative flex flex-col justify-end overflow-hidden">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 rounded-xs transition-all duration-75"
                style={{ height: `${dbToPercent(audioMeter.rightPeak)}%` }}
              />
            </div>
          </div>
          <span className="text-[7px] font-mono text-slate-500 mt-1 font-bold">dB</span>
        </div>
      </div>

      {/* Transport Controls Bar */}
      <div className="px-4 py-1.5 border-t border-[#1c1e28] bg-[#111218] flex items-center justify-between shrink-0">
        {/* In / Out points */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSetInPoint}
            className="px-2 py-0.5 bg-[#171822] hover:bg-[#202230] border border-[#222432] text-[11px] font-mono font-bold text-slate-300 rounded"
            title="Mark In [I]"
          >
            [ IN
          </button>
          <button
            onClick={onSetOutPoint}
            className="px-2 py-0.5 bg-[#171822] hover:bg-[#202230] border border-[#222432] text-[11px] font-mono font-bold text-slate-300 rounded"
            title="Mark Out [O]"
          >
            OUT ]
          </button>
          {playhead.inPoint !== null && playhead.outPoint !== null && (
            <span className="text-[10px] text-slate-400 font-mono ml-1 tabular-nums">
              ({(playhead.outPoint - playhead.inPoint).toFixed(2)}s)
            </span>
          )}
        </div>

        {/* Center Transport Shuttling Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onShuttle(-2)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Shuttle Reverse [J]"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSeek(Math.max(0, playhead.currentTime - 1 / fps))}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Step Back 1 Frame [Left Arrow]"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Big Hero Play / Pause Button in Apple Blue */}
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-[#0a84ff] hover:bg-[#0071e3] text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-transform active:scale-95"
            title="Play / Pause [Spacebar]"
          >
            {playhead.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => onSeek(Math.min(playhead.duration, playhead.currentTime + 1 / fps))}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Step Forward 1 Frame [Right Arrow]"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onShuttle(2)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Shuttle Forward [L]"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded-lg transition-colors ${
              playhead.loop ? 'text-blue-400 bg-blue-950/40' : 'text-slate-400 hover:text-white'
            }`}
            title="Loop Playback"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg transition-colors ${
              isMuted ? 'text-red-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Mute Preview Audio"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
