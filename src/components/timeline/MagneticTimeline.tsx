import React, { useState, useRef, useEffect } from 'react';
import {
  TimelineClip,
  TimelineTrack,
  TimelineTransition,
  ToolMode,
  PlayheadState,
  TransitionType,
  formatTimecode,
} from '../../types/editor';
import {
  MousePointer,
  Scissors,
  Move,
  Magnet,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Sparkles,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  ListFilter,
  Maximize2,
  Volume1,
  Layers,
  Search,
  Check,
} from 'lucide-react';

interface MagneticTimelineProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  transitions: TimelineTransition[];
  playhead: PlayheadState;
  selectedClipId: string | null;
  selectedTransitionId: string | null;
  toolMode: ToolMode;
  fps: number;
  timelineHeight?: number;
  onLoadDemoProject?: () => void;
  onSelectClip: (clipId: string | null) => void;
  onSelectTransition: (transitionId: string | null) => void;
  onUpdateClips: (clips: TimelineClip[]) => void;
  onUpdateTransitions: (transitions: TimelineTransition[]) => void;
  onSeek: (time: number) => void;
  onChangeTool: (tool: ToolMode) => void;
  onToggleMagnetic: () => void;
  onToggleSnapping: () => void;
  onSplitClipAtPlayhead: () => void;
  onDeleteSelectedClip: () => void;
  onDeleteSelectedTransition: () => void;
  onAddTransitionAtPlayhead?: (type: TransitionType) => void;
}

export const MagneticTimeline: React.FC<MagneticTimelineProps> = ({
  tracks,
  clips,
  transitions,
  playhead,
  selectedClipId,
  selectedTransitionId,
  toolMode,
  fps,
  timelineHeight = 224,
  onLoadDemoProject,
  onSelectClip,
  onSelectTransition,
  onUpdateClips,
  onUpdateTransitions,
  onSeek,
  onChangeTool,
  onToggleMagnetic,
  onToggleSnapping,
  onSplitClipAtPlayhead,
  onDeleteSelectedClip,
  onDeleteSelectedTransition,
  onAddTransitionAtPlayhead,
}) => {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const timelineContentRef = useRef<HTMLDivElement | null>(null);

  // Zoom scale: pixels per second (default 54px/sec)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(54);

  // Skimmer (Iconic FCP Orange line)
  const [skimmerTime, setSkimmerTime] = useState<number | null>(null);

  // Dragging clips
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartClipStart, setDragStartClipStart] = useState(0);

  // Trimming clips (start or end edge)
  const [trimmingEdge, setTrimmingEdge] = useState<{
    clipId: string;
    edge: 'start' | 'end';
    initialStart: number;
    initialDuration: number;
    startX: number;
  } | null>(null);

  // Resizing transition duration
  const [resizingTransition, setResizingTransition] = useState<{
    transitionId: string;
    initialDuration: number;
    startX: number;
  } | null>(null);

  // FCP Volume Rubberband Dragging
  const [draggingVolumeClipId, setDraggingVolumeClipId] = useState<string | null>(null);
  const [dragVolumeInitialY, setDragVolumeInitialY] = useState(0);
  const [dragVolumeInitialVol, setDragVolumeInitialVol] = useState(1);
  const [volumeTooltip, setVolumeTooltip] = useState<{ db: string; x: number; y: number } | null>(null);

  // FCP Tool Dropdown Menu open state
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);

  // FCP Clip Appearance Popover open state
  const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = useState(false);
  const [clipAppearanceMode, setClipAppearanceMode] = useState<'equal' | 'filmstrip' | 'waveform'>('equal');

  // FCP Timeline Index Drawer open state
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [indexSearchQuery, setIndexSearchQuery] = useState('');

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'a' || e.key === 'A') {
        onChangeTool('select');
      } else if (e.key === 'b' || e.key === 'B') {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          onSplitClipAtPlayhead();
        } else {
          onChangeTool('blade');
        }
      } else if (e.key === 't' || e.key === 'T') {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          onAddTransitionAtPlayhead?.('cross_dissolve');
        } else {
          onChangeTool('trim');
        }
      } else if (e.key === 'n' || e.key === 'N') {
        onToggleSnapping();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTransitionId) {
          onDeleteSelectedTransition();
        } else if (selectedClipId) {
          onDeleteSelectedClip();
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          // Shift-Z: FCP Fit timeline to window
          e.preventDefault();
          if (timelineContentRef.current && playhead.duration > 0) {
            const containerWidth = timelineContentRef.current.clientWidth - 100;
            const fitPps = Math.max(24, Math.min(150, Math.floor(containerWidth / playhead.duration)));
            setPixelsPerSecond(fitPps);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onChangeTool,
    onToggleSnapping,
    onDeleteSelectedClip,
    onDeleteSelectedTransition,
    onSplitClipAtPlayhead,
    onAddTransitionAtPlayhead,
    selectedClipId,
    selectedTransitionId,
    playhead.duration,
  ]);

  // Scrubbing & Skimming
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (timelineContentRef.current) {
      const rect = timelineContentRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + timelineContentRef.current.scrollLeft;
      const clickedTime = Math.max(0, Math.min(playhead.duration, clickX / pixelsPerSecond));
      onSeek(clickedTime);
      onSelectClip(null);
      onSelectTransition(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (timelineContentRef.current) {
      const rect = timelineContentRef.current.getBoundingClientRect();
      const hoverX = e.clientX - rect.left + timelineContentRef.current.scrollLeft;
      const hoverTime = Math.max(0, Math.min(playhead.duration, hoverX / pixelsPerSecond));
      setSkimmerTime(hoverTime);
    }

    // Volume Rubberband Drag
    if (draggingVolumeClipId) {
      const deltaY = dragVolumeInitialY - e.clientY;
      const deltaVol = deltaY / 30; // 30px = 1.0 volume change
      const newVol = Math.max(0, Math.min(2.0, dragVolumeInitialVol + deltaVol));
      const dbValue = newVol === 0 ? '-∞ dB' : `${(20 * Math.log10(newVol)).toFixed(1)} dB`;
      const displayDb = newVol >= 1.0 && newVol > 0 ? `+${dbValue}` : dbValue;

      setVolumeTooltip({ db: displayDb, x: e.clientX, y: e.clientY - 28 });
      onUpdateClips(
        clips.map((c) => (c.id === draggingVolumeClipId ? { ...c, volume: Number(newVol.toFixed(2)) } : c))
      );
      return;
    }

    // Clip Dragging
    if (draggingClipId) {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      let newStart = Math.max(0, dragStartClipStart + deltaTime);

      if (playhead.snapping) {
        if (Math.abs(newStart - playhead.currentTime) < 0.25) {
          newStart = playhead.currentTime;
        }
        for (const other of clips) {
          if (other.id === draggingClipId) continue;
          if (Math.abs(newStart - (other.start + other.duration)) < 0.25) {
            newStart = other.start + other.duration;
            break;
          }
          if (Math.abs(newStart - other.start) < 0.25) {
            newStart = other.start;
            break;
          }
        }
      }

      onUpdateClips(
        clips.map((c) => (c.id === draggingClipId ? { ...c, start: Number(newStart.toFixed(2)) } : c))
      );
    }

    // Clip Trimming
    if (trimmingEdge) {
      const deltaX = e.clientX - trimmingEdge.startX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (trimmingEdge.edge === 'start') {
        const potentialStart = trimmingEdge.initialStart + deltaTime;
        const potentialDuration = trimmingEdge.initialDuration - deltaTime;
        if (potentialDuration > 0.3 && potentialStart >= 0) {
          onUpdateClips(
            clips.map((c) =>
              c.id === trimmingEdge.clipId
                ? {
                    ...c,
                    start: Number(potentialStart.toFixed(2)),
                    duration: Number(potentialDuration.toFixed(2)),
                  }
                : c
            )
          );
        }
      } else {
        const potentialDuration = trimmingEdge.initialDuration + deltaTime;
        if (potentialDuration > 0.3) {
          onUpdateClips(
            clips.map((c) =>
              c.id === trimmingEdge.clipId
                ? { ...c, duration: Number(potentialDuration.toFixed(2)) }
                : c
            )
          );
        }
      }
    }

    // Transition Resizing
    if (resizingTransition) {
      const deltaX = e.clientX - resizingTransition.startX;
      const deltaTime = (deltaX / pixelsPerSecond) * 2;
      const newDuration = Math.max(0.3, Math.min(4.0, resizingTransition.initialDuration + deltaTime));

      onUpdateTransitions(
        transitions.map((t) =>
          t.id === resizingTransition.transitionId ? { ...t, duration: Number(newDuration.toFixed(2)) } : t
        )
      );
    }
  };

  const handleMouseUp = () => {
    if (draggingClipId && playhead.magneticMode) {
      // Magnetic ripple sort by start time on primary storyline (track-v1)
      const v1Clips = clips.filter((c) => c.trackId === 'track-v1').sort((a, b) => a.start - b.start);
      let cumulative = 0;
      const magneticRealigned = v1Clips.map((c) => {
        const updated = { ...c, start: cumulative };
        cumulative += c.duration;
        return updated;
      });

      onUpdateClips(
        clips.map((c) => {
          const match = magneticRealigned.find((m) => m.id === c.id);
          return match || c;
        })
      );
    }

    setDraggingClipId(null);
    setTrimmingEdge(null);
    setResizingTransition(null);
    setDraggingVolumeClipId(null);
    setVolumeTooltip(null);
  };

  // Blade cut at clicked position
  const handleClipClick = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();

    if (toolMode === 'blade') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const cutOffset = clickX / pixelsPerSecond;

      if (cutOffset > 0.2 && cutOffset < clip.duration - 0.2) {
        const firstClip: TimelineClip = {
          ...clip,
          duration: Number(cutOffset.toFixed(2)),
        };
        const secondClip: TimelineClip = {
          ...clip,
          id: `clip-${Date.now()}`,
          start: Number((clip.start + cutOffset).toFixed(2)),
          duration: Number((clip.duration - cutOffset).toFixed(2)),
          sourceStart: Number((clip.sourceStart + cutOffset).toFixed(2)),
        };

        onUpdateClips(clips.map((c) => (c.id === clip.id ? firstClip : c)).concat(secondClip));
        onSelectClip(secondClip.id);
      }
    } else {
      onSelectClip(clip.id);
      onSelectTransition(null);
    }
  };

  const timelineWidth = Math.max(1800, playhead.duration * pixelsPerSecond + 600);

  // Time ruler ticks with authentic Apple FCP graduation marks
  const renderRulerTicks = () => {
    const ticks = [];
    const step = pixelsPerSecond < 35 ? 5 : pixelsPerSecond < 70 ? 2 : 1;
    const count = Math.ceil(playhead.duration + 12);

    for (let sec = 0; sec <= count; sec += step) {
      const x = sec * pixelsPerSecond;
      ticks.push(
        <div key={sec} className="absolute top-0 flex flex-col items-start" style={{ left: `${x}px` }}>
          <span className="text-[10px] font-mono text-slate-400 pl-1 font-medium tracking-tight">
            {formatTimecode(sec, fps).slice(3)}
          </span>
          <div className="w-px h-3 bg-[#383d4f] mt-0.5" />
        </div>
      );

      // Intermediate mini frame ticks
      if (pixelsPerSecond >= 40) {
        for (let sub = 1; sub <= 3; sub++) {
          const subX = (sec + (sub * step) / 4) * pixelsPerSecond;
          ticks.push(
            <div
              key={`${sec}-${sub}`}
              className="absolute top-3 w-px h-1.5 bg-[#252838]"
              style={{ left: `${subX}px` }}
            />
          );
        }
      }
    }
    return ticks;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setSkimmerTime(null);
        if (draggingVolumeClipId) {
          setDraggingVolumeClipId(null);
          setVolumeTooltip(null);
        }
      }}
      style={{ height: `${timelineHeight}px` }}
      className="flex flex-col bg-[#101117] border-t border-[#20222e] select-none text-slate-200 shrink-0 overflow-hidden relative"
    >
      {/* Floating FCP Volume Gain HUD Badge */}
      {volumeTooltip && (
        <div
          style={{ left: `${volumeTooltip.x}px`, top: `${volumeTooltip.y}px` }}
          className="fixed pointer-events-none z-50 px-2 py-0.5 rounded bg-[#1e2230] border border-[#ffcc00] text-[#ffcc00] font-mono text-[11px] font-bold shadow-lg transform -translate-x-1/2"
        >
          {volumeTooltip.db}
        </div>
      )}

      {/* APPLE FINAL CUT PRO TIMELINE TOOLBAR */}
      <div className="px-3 py-1 border-b border-[#1c1e28] bg-[#14151e] flex items-center justify-between shrink-0 h-9 z-20">
        {/* Left Side: Index, Tool Selector Dropdown, Snapping, Clip Appearance */}
        <div className="flex items-center gap-2">
          {/* Timeline Index Button (⌘⇧2) */}
          <button
            onClick={() => setIsIndexOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border transition-colors ${
              isIndexOpen
                ? 'bg-[#1e2334] border-[#2e3752] text-[#0a84ff]'
                : 'border-[#222533] bg-[#12131b] text-slate-400 hover:text-white hover:bg-[#181a24]'
            }`}
            title="Timeline Index (⌘⇧2)"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span className="text-[11px]">Index</span>
          </button>

          <div className="h-4 w-px bg-[#242738]" />

          {/* FCP Tool Selector Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsToolMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border transition-colors ${
                toolMode === 'blade'
                  ? 'bg-red-950/60 border-red-700/80 text-red-300'
                  : toolMode === 'trim'
                  ? 'bg-amber-950/60 border-amber-700/80 text-amber-300'
                  : 'bg-[#181b26] border-[#292e42] text-white hover:bg-[#1f2332]'
              }`}
              title="Tool Selector (Click to switch)"
            >
              {toolMode === 'select' && <MousePointer className="w-3.5 h-3.5 text-[#0a84ff]" />}
              {toolMode === 'blade' && <Scissors className="w-3.5 h-3.5 text-red-400" />}
              {toolMode === 'trim' && <Move className="w-3.5 h-3.5 text-amber-400" />}
              <span className="text-[11px] capitalize">{toolMode}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu Modal */}
            {isToolMenuOpen && (
              <div
                onMouseLeave={() => setIsToolMenuOpen(false)}
                className="absolute top-full left-0 mt-1 w-44 rounded-md bg-[#161822] border border-[#2b3044] shadow-xl py-1 z-50 text-xs font-medium"
              >
                <button
                  onClick={() => {
                    onChangeTool('select');
                    setIsToolMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#202434] transition-colors ${
                    toolMode === 'select' ? 'text-[#0a84ff] font-bold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-3.5 h-3.5" />
                    <span>Select</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">A</span>
                </button>
                <button
                  onClick={() => {
                    onChangeTool('trim');
                    setIsToolMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#202434] transition-colors ${
                    toolMode === 'trim' ? 'text-amber-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Move className="w-3.5 h-3.5" />
                    <span>Trim</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">T</span>
                </button>
                <button
                  onClick={() => {
                    onChangeTool('blade');
                    setIsToolMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#202434] transition-colors ${
                    toolMode === 'blade' ? 'text-red-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Blade</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">B</span>
                </button>
              </div>
            )}
          </div>

          {/* Blade at Playhead Split Button */}
          <button
            onClick={onSplitClipAtPlayhead}
            className="p-1 hover:bg-[#1c1f2c] rounded border border-[#222533] text-slate-400 hover:text-white transition-colors"
            title="Blade at Playhead (⌘B)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          {/* Quick Cross Dissolve Button */}
          <button
            onClick={() => onAddTransitionAtPlayhead?.('cross_dissolve')}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border border-[#3b321c] bg-[#221b10] text-amber-300 hover:bg-[#2e2314] transition-colors"
            title="Add Default Transition (⌘T)"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[11px]">⌘T</span>
          </button>

          <div className="h-4 w-px bg-[#242738]" />

          {/* FCP Snapping Toggle (N) */}
          <button
            onClick={onToggleSnapping}
            className={`p-1 rounded border transition-colors ${
              playhead.snapping
                ? 'bg-[#1b263b] border-[#29426d] text-[#0a84ff]'
                : 'border-[#222533] text-slate-500 hover:text-slate-300 hover:bg-[#181a24]'
            }`}
            title="Snapping [N] (Blue = ON)"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* FCP Magnetic Timeline Toggle */}
          <button
            onClick={onToggleMagnetic}
            className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors ${
              playhead.magneticMode
                ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                : 'border-[#222533] text-slate-500 hover:text-slate-300 hover:bg-[#181a24]'
            }`}
            title="Magnetic Timeline: Ripple auto-close primary storyline gaps"
          >
            Magnetic
          </button>
        </div>

        {/* Center: Playhead Position Indicator */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {formatTimecode(playhead.currentTime, fps)}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
            {formatTimecode(playhead.duration, fps)}
          </span>
        </div>

        {/* Right Side: Clip Appearance Popover, Fit View (⇧Z), Zoom Slider, Audio Meters */}
        <div className="flex items-center gap-3">
          {/* FCP Clip Appearance Popover Button */}
          <div className="relative">
            <button
              onClick={() => setIsAppearanceMenuOpen((prev) => !prev)}
              className={`p-1 rounded border transition-colors ${
                isAppearanceMenuOpen
                  ? 'bg-[#1e2334] border-[#2e3752] text-[#0a84ff]'
                  : 'border-[#222533] text-slate-400 hover:text-white hover:bg-[#181a24]'
              }`}
              title="Clip Appearance & Waveform Sizing"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {isAppearanceMenuOpen && (
              <div
                onMouseLeave={() => setIsAppearanceMenuOpen(false)}
                className="absolute top-full right-0 mt-1 w-52 rounded-md bg-[#161822] border border-[#2b3044] shadow-xl p-2.5 z-50 text-xs flex flex-col gap-2"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Clip Appearance
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[#10121a] p-1 rounded border border-[#222636]">
                  <button
                    onClick={() => setClipAppearanceMode('filmstrip')}
                    className={`py-1 text-[10px] font-semibold rounded text-center transition-colors ${
                      clipAppearanceMode === 'filmstrip'
                        ? 'bg-[#0a84ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Filmstrip
                  </button>
                  <button
                    onClick={() => setClipAppearanceMode('equal')}
                    className={`py-1 text-[10px] font-semibold rounded text-center transition-colors ${
                      clipAppearanceMode === 'equal'
                        ? 'bg-[#0a84ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    50 / 50
                  </button>
                  <button
                    onClick={() => setClipAppearanceMode('waveform')}
                    className={`py-1 text-[10px] font-semibold rounded text-center transition-colors ${
                      clipAppearanceMode === 'waveform'
                        ? 'bg-[#0a84ff] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Waveform
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FCP Zoom Slider with Shift-Z Fit Button */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={() => {
                if (timelineContentRef.current && playhead.duration > 0) {
                  const containerWidth = timelineContentRef.current.clientWidth - 100;
                  const fitPps = Math.max(24, Math.min(150, Math.floor(containerWidth / playhead.duration)));
                  setPixelsPerSecond(fitPps);
                }
              }}
              className="p-1 text-slate-400 hover:text-white hover:bg-[#1a1c26] rounded text-[10px] font-mono border border-[#222533]"
              title="Fit Timeline (⇧Z)"
            >
              ⇧Z
            </button>
            <ZoomOut className="w-3.5 h-3.5" />
            <input
              type="range"
              min={24}
              max={150}
              step={2}
              value={pixelsPerSecond}
              onChange={(e) => setPixelsPerSecond(parseInt(e.target.value, 10))}
              className="w-24 h-1 bg-[#222534] rounded-lg appearance-none cursor-pointer accent-[#0a84ff]"
            />
            <ZoomIn className="w-3.5 h-3.5" />
          </div>

          {/* FCP Stereo Audio Meter Mini Display */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#0d0e14] border border-[#20222f]" title="Audio VU Meters: L/R">
            <div className="flex flex-col gap-0.5">
              <div className="w-10 h-1.5 bg-[#171922] rounded-xs flex overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: playhead.isPlaying ? '68%' : '15%' }}
                />
              </div>
              <div className="w-10 h-1.5 bg-[#171922] rounded-xs flex overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: playhead.isPlaying ? '64%' : '12%' }}
                />
              </div>
            </div>
            <Volume2 className="w-3 h-3 text-slate-500" />
          </div>
        </div>
      </div>

      {/* TIMELINE BODY (Timeline Index Drawer + Track Header Sidebar + Timeline Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* FCP Timeline Index Drawer (Collapsible) */}
        {isIndexOpen && (
          <div className="w-56 flex flex-col bg-[#13141c] border-r border-[#202332] z-30 shrink-0 text-xs">
            <div className="p-2 border-b border-[#202332] flex items-center justify-between bg-[#161824]">
              <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
                Timeline Index
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{clips.length} clips</span>
            </div>
            <div className="p-1.5 border-b border-[#202332]">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter clips..."
                  value={indexSearchQuery}
                  onChange={(e) => setIndexSearchQuery(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 text-[11px] bg-[#0c0d14] border border-[#252838] rounded text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-[#0a84ff]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#1b1d2a]">
              {clips
                .filter((c) => c.name.toLowerCase().includes(indexSearchQuery.toLowerCase()))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectClip(c.id);
                      onSeek(c.start);
                    }}
                    className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-[#1a1c28] transition-colors ${
                      selectedClipId === c.id ? 'bg-[#1b2234] text-[#0a84ff] font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-1">
                      <div className="truncate text-[11px]">{c.name}</div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {formatTimecode(c.start, fps).slice(3)}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 tabular-nums">
                      {c.duration.toFixed(1)}s
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Traditional Numbered Track Lanes Header (Apple FCP Titanium Sidebar) */}
        <div className="w-48 flex flex-col bg-[#12131b] border-r border-[#20222e] z-20 shrink-0">
          <div className="h-7 border-b border-[#202330] bg-[#161722] px-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
              LANES & ROLES
            </span>
            <span className="text-[10px] font-mono text-slate-500 tabular-nums">{fps} FPS</span>
          </div>

          {tracks.map((t) => {
            const isPrimary = t.id === 'track-v1';
            return (
              <div
                key={t.id}
                style={{ height: `${t.height}px` }}
                className={`px-3 border-b border-[#1c1e2a] flex items-center justify-between text-xs transition-colors ${
                  isPrimary
                    ? 'bg-[#151722] border-l-2 border-l-[#0a84ff]'
                    : 'bg-[#12131b]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      t.type === 'video' ? 'bg-[#0a84ff]' : 'bg-[#30d158]'
                    }`}
                  />
                  <div className="truncate flex flex-col">
                    <span className={`text-[11px] font-bold truncate ${isPrimary ? 'text-white' : 'text-slate-300'}`}>
                      {t.name}
                    </span>
                    {isPrimary && (
                      <span className="text-[9px] font-mono text-blue-400 uppercase tracking-tight">
                        Primary Storyline
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                  <button
                    onClick={() => {
                      t.muted = !t.muted;
                      onUpdateClips([...clips]);
                    }}
                    className={`p-1 rounded hover:text-white hover:bg-[#1a1c26] transition-colors ${
                      t.muted ? 'text-red-400 bg-red-950/30' : ''
                    }`}
                    title={t.muted ? 'Unmute' : 'Mute (M)'}
                  >
                    {t.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      t.locked = !t.locked;
                      onUpdateClips([...clips]);
                    }}
                    className={`p-1 rounded hover:text-white hover:bg-[#1a1c26] transition-colors ${
                      t.locked ? 'text-amber-400 bg-amber-950/30' : ''
                    }`}
                    title={t.locked ? 'Unlock' : 'Lock'}
                  >
                    {t.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Canvas Viewport */}
        <div
          ref={timelineContentRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative bg-[#0d0e14] cursor-pointer"
        >
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            className="h-7 border-b border-[#232636] bg-[#151620] relative shrink-0"
            style={{ width: `${timelineWidth}px` }}
          >
            {renderRulerTicks()}
          </div>

          {/* Track Lanes Canvas */}
          <div className="relative flex-1" style={{ width: `${timelineWidth}px` }}>
            {/* Horizontal Track Divider Lines */}
            {tracks.map((t) => {
              const isPrimary = t.id === 'track-v1';
              return (
                <div
                  key={t.id}
                  style={{ height: `${t.height}px` }}
                  className={`w-full border-b relative ${
                    isPrimary
                      ? 'border-[#222535] bg-[#13151f]/60'
                      : 'border-[#1b1d28] bg-[#0f1017]/40'
                  }`}
                />
              );
            })}

            {/* Empty Timeline State Prompt */}
            {clips.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-slate-500">
                <span className="text-xs font-semibold text-slate-400">Timeline is empty</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Drag clips here, import media from computer, or press W to insert at playhead
                </span>
                {onLoadDemoProject && (
                  <button
                    onClick={onLoadDemoProject}
                    className="mt-2.5 px-3 py-1 bg-[#151722] hover:bg-[#1f2232] border border-[#262838] text-blue-400 hover:text-blue-300 rounded text-xs font-semibold pointer-events-auto transition-colors shadow-sm"
                  >
                    + Load 4K Demo Project
                  </button>
                )}
              </div>
            )}

            {/* Connected Clips Secondary Storyline Pins (from V2 down to V1) */}
            {clips
              .filter((c) => c.trackId === 'track-v2')
              .map((c) => {
                const leftPx = c.start * pixelsPerSecond;
                return (
                  <div
                    key={`conn-${c.id}`}
                    style={{ left: `${leftPx + 8}px`, top: '48px', height: '52px' }}
                    className="absolute w-0.5 bg-blue-500/40 border-l border-dashed border-blue-400/60 pointer-events-none z-10"
                  />
                );
              })}

            {/* AUTHENTIC FINAL CUT PRO CLIPS WITH DUAL-ZONE & RUBBERBAND */}
            {clips.map((clip) => {
              const track = tracks.find((t) => t.id === clip.trackId);
              if (!track) return null;

              let topOffset = 0;
              for (const tr of tracks) {
                if (tr.id === clip.trackId) break;
                topOffset += tr.height;
              }

              const leftPx = clip.start * pixelsPerSecond;
              const widthPx = Math.max(24, clip.duration * pixelsPerSecond);
              const isSelected = selectedClipId === clip.id;

              // Proportional height split between filmstrip and audio
              const clipH = track.height - 6;
              const filmstripH =
                clipAppearanceMode === 'filmstrip'
                  ? clipH - 18
                  : clipAppearanceMode === 'waveform'
                  ? 16
                  : Math.floor(clipH * 0.52);
              const audioH = clipH - filmstripH - 16; // 16px is top header

              // Volume level line position: clip.volume (0 to 2, 1.0 is default mid)
              const volRatio = Math.max(0, Math.min(2.0, clip.volume ?? 1.0)) / 2.0;
              // 0% volume is at bottom of audioH, 100% volume is at top
              const volBottomPx = Math.round(volRatio * Math.max(8, audioH - 4));

              return (
                <div
                  key={clip.id}
                  onClick={(e) => handleClipClick(e, clip)}
                  onMouseDown={(e) => {
                    if (toolMode === 'select' && e.button === 0) {
                      e.stopPropagation();
                      setDraggingClipId(clip.id);
                      setDragStartX(e.clientX);
                      setDragStartClipStart(clip.start);
                      onSelectClip(clip.id);
                      onSelectTransition(null);
                    }
                  }}
                  style={{
                    top: `${topOffset + 3}px`,
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                    height: `${clipH}px`,
                  }}
                  className={`group absolute rounded-[5px] flex flex-col overflow-hidden cursor-move select-none transition-shadow ${
                    isSelected
                      ? 'border-2 border-[#ffcc00] ring-1 ring-[#ffcc00]/50 shadow-lg shadow-black/60 z-20'
                      : 'border border-[#262a3a] hover:border-slate-400 z-10'
                  } ${clip.trackType === 'video' ? 'bg-[#151c27]' : 'bg-[#12221a]'}`}
                >
                  {/* Left Trim Bracket (Authentic FCP Yellow Bracket on selection) */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setTrimmingEdge({
                        clipId: clip.id,
                        edge: 'start',
                        initialStart: clip.start,
                        initialDuration: clip.duration,
                        startX: e.clientX,
                      });
                    }}
                    className={`absolute left-0 top-0 bottom-0 w-2 cursor-w-resize z-30 transition-colors flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#ffcc00] text-black font-bold text-[9px] w-2.5'
                        : 'hover:bg-white/40'
                    }`}
                    title="Trim In Point"
                  >
                    {isSelected && <span>[</span>}
                  </div>

                  {/* Top FCP Clip Header Ribbon */}
                  <div
                    className="px-2 py-0.5 text-[10px] font-bold text-white truncate flex items-center justify-between border-b border-black/20 shrink-0"
                    style={{ backgroundColor: clip.color || '#24344d' }}
                  >
                    <span className="truncate tracking-tight font-sans text-slate-100 drop-shadow-xs">
                      {clip.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-300 tabular-nums pl-1">
                      {clip.duration.toFixed(1)}s
                    </span>
                  </div>

                  {/* Dual-Zone Middle: Filmstrip Ribbon */}
                  {clip.trackType === 'video' && filmstripH > 10 && (
                    <div
                      style={{ height: `${filmstripH}px` }}
                      className="flex items-center overflow-hidden gap-1 px-1 bg-[#0b0e14]/80 border-b border-black/30 shrink-0"
                    >
                      {Array.from({ length: Math.min(20, Math.floor(widthPx / 36)) }).map((_, fIdx) => (
                        <div
                          key={fIdx}
                          className="h-full w-8 rounded-xs bg-[#161a24] border border-[#23293a] shrink-0 flex items-center justify-center overflow-hidden"
                        >
                          <div
                            className="w-full h-full opacity-60"
                            style={{
                              backgroundColor: clip.color || '#24344d',
                              filter: `brightness(${0.85 + (fIdx % 3) * 0.15})`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dual-Zone Bottom: Audio Waveform with Draggable Volume Rubberband */}
                  <div
                    style={{ height: `${audioH}px` }}
                    className="relative flex-1 bg-[#090d13] flex items-end px-1 pb-0.5 overflow-hidden group/audio"
                  >
                    {/* Audio Waveforms */}
                    <div className="w-full h-full flex items-end gap-0.5 opacity-85">
                      {Array.from({ length: Math.min(50, Math.floor(widthPx / 4)) }).map((_, i) => (
                        <div
                          key={i}
                          style={{ height: `${15 + Math.sin(i * 0.8) * 65}%` }}
                          className={`flex-1 rounded-t-xs ${
                            clip.trackType === 'video' ? 'bg-[#3b82f6]' : 'bg-[#30d158]'
                          }`}
                        />
                      ))}
                    </div>

                    {/* FCP SIGNATURE DRAGGABLE VOLUME RUBBERBAND */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingVolumeClipId(clip.id);
                        setDragVolumeInitialY(e.clientY);
                        setDragVolumeInitialVol(clip.volume ?? 1.0);
                      }}
                      style={{ bottom: `${volBottomPx}px` }}
                      className="absolute left-0 right-0 h-[3px] bg-slate-300 hover:bg-[#ffcc00] group-hover/audio:bg-white cursor-row-resize z-20 flex items-center justify-center shadow-xs transition-colors"
                      title={`Volume: ${(clip.volume ?? 1.0) === 0 ? '-∞ dB' : `${(20 * Math.log10(clip.volume ?? 1.0)).toFixed(1)} dB`} (Drag up/down)`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover/audio:opacity-100" />
                    </div>
                  </div>

                  {/* Right Trim Bracket (Authentic FCP Yellow Bracket on selection) */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setTrimmingEdge({
                        clipId: clip.id,
                        edge: 'end',
                        initialStart: clip.start,
                        initialDuration: clip.duration,
                        startX: e.clientX,
                      });
                    }}
                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-e-resize z-30 transition-colors flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#ffcc00] text-black font-bold text-[9px] w-2.5'
                        : 'hover:bg-white/40'
                    }`}
                    title="Trim Out Point"
                  >
                    {isSelected && <span>]</span>}
                  </div>
                </div>
              );
            })}

            {/* TRANSITIONS OVERLAY: Interactive transition blocks at cut points */}
            {transitions.map((tr) => {
              const track = tracks.find((t) => t.id === tr.trackId);
              if (!track) return null;

              let topOffset = 0;
              for (const t of tracks) {
                if (t.id === tr.trackId) break;
                topOffset += t.height;
              }

              const transWidthPx = tr.duration * pixelsPerSecond;
              const leftPx = (tr.cutTime - tr.duration / 2) * pixelsPerSecond;
              const isSelected = selectedTransitionId === tr.id;

              return (
                <div
                  key={tr.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTransition(tr.id);
                    onSelectClip(null);
                  }}
                  style={{
                    top: `${topOffset + 4}px`,
                    left: `${leftPx}px`,
                    width: `${transWidthPx}px`,
                    height: `${track.height - 8}px`,
                  }}
                  className={`absolute rounded-md border flex items-center justify-between px-2 cursor-pointer transition-all z-30 ${
                    isSelected
                      ? 'border-[#ffcc00] bg-amber-500/40 shadow-lg shadow-amber-500/30 ring-2 ring-[#ffcc00]'
                      : 'border-amber-600/70 bg-[#291b0f]/80 hover:bg-[#382414] hover:border-amber-400'
                  }`}
                  title={`${tr.type.replace('_', ' ').toUpperCase()} (${tr.duration.toFixed(2)}s)`}
                >
                  {/* Left Resize Grip */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingTransition({
                        transitionId: tr.id,
                        initialDuration: tr.duration,
                        startX: e.clientX,
                      });
                    }}
                    className="w-2.5 h-full -ml-2 cursor-w-resize hover:bg-amber-400/50 rounded-l"
                  />

                  {/* Center Label */}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-amber-300 font-mono text-xs font-bold">
                      {tr.type === 'cross_dissolve'
                        ? '⧖'
                        : tr.type.includes('dip')
                        ? '◐'
                        : tr.type.includes('wipe')
                        ? '▥'
                        : tr.type.includes('slide')
                        ? '⇄'
                        : '⚡'}
                    </span>
                    <span className="text-[10px] font-bold text-amber-200 uppercase truncate">
                      {tr.type.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] font-mono text-amber-300/80">
                      {tr.duration.toFixed(1)}s
                    </span>
                  </div>

                  {/* Right Resize Grip */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingTransition({
                        transitionId: tr.id,
                        initialDuration: tr.duration,
                        startX: e.clientX,
                      });
                    }}
                    className="w-2.5 h-full -mr-2 cursor-e-resize hover:bg-amber-400/50 rounded-r"
                  />
                </div>
              );
            })}

            {/* Skimmer Line (Apple FCP Signature Orange Needle) */}
            {skimmerTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#ff9f0a] pointer-events-none z-40"
                style={{ left: `${skimmerTime * pixelsPerSecond}px` }}
              >
                <div className="w-2.5 h-2.5 -ml-1 bg-[#ff9f0a] rotate-45 shadow-sm" />
              </div>
            )}

            {/* Main Playhead (Apple FCP Blue Needle with Diamond Head) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#0a84ff] pointer-events-none z-50 shadow-md"
              style={{ left: `${playhead.currentTime * pixelsPerSecond}px` }}
            >
              <div className="w-3.5 h-3.5 -ml-1.5 bg-[#0a84ff] rotate-45 rounded-xs shadow-lg border border-white/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
