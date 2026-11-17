import React, { useRef, useEffect, useState } from 'react';
import { PlayheadState } from '../../types/editor';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
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
  Film,
  Sparkles,
  Captions,
} from 'lucide-react';
import { audioEngine } from '../../engine/audioEngine';

export interface MonitorStatusInfo {
  activeClipName: string | null;
  activeTrackLabel: string | null;
  activeOverlayName: string | null;
  activeAudioCount: number;
  activeSubtitleText: string | null;
  subtitlesEnabled: boolean;
  isTimelineEmpty: boolean;
  isPlayheadOnGap: boolean;
  resolutionLabel: string;
}

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
  monitorStatus?: MonitorStatusInfo;
  onLoadDemoProject?: () => void;
  onOpenSubtitles?: () => void;
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
  monitorStatus,
  onLoadDemoProject,
  onOpenSubtitles,
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
              type="button"
              onClick={onToggleBrowser}
              aria-pressed={isBrowserOpen}
              aria-label={isBrowserOpen ? 'Hide Media Browser (⌘1)' : 'Show Media Browser (⌘1)'}
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
          <div role="group" aria-label="Aspect ratio guides" className="flex items-center gap-0.5 bg-[#0a0b0e] p-0.5 rounded-lg border border-[#1d1f2b]">
            {(['16:9', '2.39:1', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                aria-pressed={aspectGuide === ratio}
                aria-label={`Aspect ratio guide ${ratio}`}
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
            type="button"
            aria-pressed={showSafeZones}
            aria-label="Toggle Action and Title Safe Margins"
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
            type="button"
            aria-pressed={isDualView}
            aria-label="Toggle Split Dual View"
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
            type="button"
            aria-label="Toggle Video Scopes (S)"
            onClick={onOpenScopes}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-300 hover:text-white rounded-lg border border-[#1f212c] bg-[#111218] hover:bg-[#181a24] transition-colors"
            title="Toggle Video Scopes (S)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Scopes</span>
          </button>

          {/* Theater Full View */}
          {onToggleTheater && (
            <button
              type="button"
              aria-pressed={isTheaterMode}
              aria-label={isTheaterMode ? 'Restore Normal Layout' : 'Full Theater Monitor (Shift+F)'}
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
              type="button"
              aria-pressed={isInspectorOpen}
              aria-label={isInspectorOpen ? 'Hide Inspector (⌘4)' : 'Show Inspector (⌘4)'}
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
            {/* Top-Left Corner HUD: Monitor Title + Active Clip / Track Status */}
            <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 pointer-events-none max-w-[60%]">
              <div className="inline-flex items-center gap-2 bg-[#0c0e15]/88 border border-[#242838] px-2.5 py-1 rounded-md text-[10px] font-mono backdrop-blur-md shadow-md">
                <span className="text-amber-300 font-bold tracking-wide uppercase shrink-0">
                  {viewer2Title}
                </span>
                {monitorStatus && (
                  <>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    {monitorStatus.activeClipName ? (
                      <span className="text-slate-200 truncate">
                        <span className="text-[#0a84ff] font-bold">{monitorStatus.activeTrackLabel}</span>{' '}
                        {monitorStatus.activeClipName}
                        {monitorStatus.activeOverlayName ? ` + ${monitorStatus.activeOverlayName}` : ''}
                      </span>
                    ) : monitorStatus.isTimelineEmpty ? (
                      <span className="text-slate-400">No clips loaded</span>
                    ) : (
                      <span className="text-slate-400">
                        Gap · {monitorStatus.activeAudioCount > 0 ? `${monitorStatus.activeAudioCount} Audio active` : 'No video at playhead'}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Top-Right Corner HUD: Format, FPS, Speed, Audio & CC Status */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-2 bg-[#0c0e15]/88 border border-[#242838] px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 backdrop-blur-md shadow-md pointer-events-none tabular-nums">
              <span>{monitorStatus?.resolutionLabel || '1280×720'}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span>{fps} FPS</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className={playhead.playbackRate !== 1 ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                {playhead.playbackRate.toFixed(1)}x
              </span>
              {playhead.loop && (
                <>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-blue-400 font-semibold">LOOP</span>
                </>
              )}
              {monitorStatus && (
                <>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className={monitorStatus.subtitlesEnabled ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
                    CC {monitorStatus.subtitlesEnabled ? 'ON' : 'OFF'}
                  </span>
                </>
              )}
            </div>

            {/* Bottom-Left Corner HUD: Playback & Range Telemetry */}
            {(playhead.inPoint !== null || playhead.outPoint !== null || isMuted || monitorStatus?.activeSubtitleText) && (
              <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-2 bg-[#0c0e15]/88 border border-[#242838] px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 backdrop-blur-md shadow-md pointer-events-none tabular-nums max-w-[75%]">
                {(playhead.inPoint !== null || playhead.outPoint !== null) && (
                  <span>
                    Range {playhead.inPoint !== null ? formatTimecode(playhead.inPoint, fps).slice(3) : '--:--:--'}
                    {' → '}
                    {playhead.outPoint !== null ? formatTimecode(playhead.outPoint, fps).slice(3) : '--:--:--'}
                  </span>
                )}
                {isMuted && (
                  <span className="text-red-400 font-semibold">Audio Muted</span>
                )}
                {monitorStatus?.activeSubtitleText && (
                  <span className="text-cyan-300 truncate flex items-center gap-1">
                    <Captions className="w-3 h-3 shrink-0" />
                    <span className="truncate">{monitorStatus.activeSubtitleText}</span>
                  </span>
                )}
              </div>
            )}

            {/* Video Canvas */}
            <canvas
              ref={viewer2CanvasRef}
              width={1280}
              height={720}
              className="w-full h-full object-contain block"
            />

            {/* Empty-Stage Guidance Overlay (when timeline has no clips and no active subtitle) */}
            {monitorStatus?.isTimelineEmpty && (
              <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-10">
                <div className="max-w-md w-full rounded-xl bg-[#0c0e15]/88 border border-[#23273a] px-5 py-4 text-center backdrop-blur-md shadow-2xl pointer-events-auto">
                  <div className="w-9 h-9 mx-auto mb-2.5 rounded-lg bg-[#141a29] border border-[#263452] flex items-center justify-center text-[#0a84ff]">
                    <Film className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    Program Stage Ready
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Import video or audio from the Event Browser (<span className="font-mono text-slate-300">W</span> to insert), generate AI Voiceovers, or load sample footage to preview frames here.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    {onLoadDemoProject && (
                      <button
                        onClick={onLoadDemoProject}
                        className="px-3 py-1.5 rounded-md bg-[#0a84ff] hover:bg-[#0071e3] text-white text-[11px] font-semibold transition-colors shadow-sm"
                      >
                        Load 4K Demo Project
                      </button>
                    )}
                    {onOpenSubtitles && (
                      <button
                        onClick={onOpenSubtitles}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161924] hover:bg-[#1e2232] border border-[#282d42] text-slate-200 text-[11px] font-semibold transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>AI Voiceover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Playhead Gap Guidance Overlay (when timeline has media, but playhead is over empty gap) */}
            {!monitorStatus?.isTimelineEmpty && monitorStatus?.isPlayheadOnGap && !monitorStatus?.activeSubtitleText && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="rounded-lg bg-[#0b0d14]/82 border border-[#232738] px-4 py-2 text-center backdrop-blur-sm shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-300">
                    No Video Clip at {formatTimecode(playhead.currentTime, fps).slice(3)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {monitorStatus.activeAudioCount > 0
                      ? `${monitorStatus.activeAudioCount} audio track${monitorStatus.activeAudioCount > 1 ? 's' : ''} active in this gap`
                      : 'Scrub timeline or press W to insert a clip here'}
                  </div>
                </div>
              </div>
            )}

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
        <div role="group" aria-label="Playback transport controls" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onShuttle(-2)}
            aria-label="Shuttle Reverse (J)"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Shuttle Reverse [J]"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSeek(Math.max(0, playhead.currentTime - 1 / fps))}
            aria-label="Step Back 1 Frame (Left Arrow)"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Step Back 1 Frame [Left Arrow]"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Big Hero Play / Pause Button in Apple Blue */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playhead.isPlaying ? 'Pause Playback (Space)' : 'Play Playback (Space)'}
            aria-pressed={playhead.isPlaying}
            className="w-9 h-9 rounded-full bg-[#0a84ff] hover:bg-[#0071e3] text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-transform active:scale-95"
            title="Play / Pause [Spacebar]"
          >
            {playhead.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => onSeek(Math.min(playhead.duration, playhead.currentTime + 1 / fps))}
            aria-label="Step Forward 1 Frame (Right Arrow)"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Step Forward 1 Frame [Right Arrow]"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onShuttle(2)}
            aria-label="Shuttle Forward (L)"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a1c26]"
            title="Shuttle Forward [L]"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLoop}
            aria-pressed={playhead.loop}
            aria-label="Loop Playback"
            className={`p-1.5 rounded-lg transition-colors ${
              playhead.loop ? 'text-blue-400 bg-blue-950/40' : 'text-slate-400 hover:text-white'
            }`}
            title="Loop Playback"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={isMuted}
            aria-label="Mute Preview Audio"
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
