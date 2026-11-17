import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MediaItem,
  TimelineClip,
  TimelineTrack,
  TimelineTransition,
  SubtitleCue,
  SubtitleStyle,
  ToolMode,
  PlayheadState,
  TransitionType,
  ToastNotification,
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
  SlidersHorizontal,
  ChevronDown,
  ListFilter,
  Search,
  Captions,
  FileUp,
  Download,
  Plus,
  Mic,
  GripVertical,
} from 'lucide-react';

interface MagneticTimelineProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  transitions: TimelineTransition[];
  mediaItems?: MediaItem[];
  playhead: PlayheadState;
  selectedMediaId?: string | null;
  selectedClipId: string | null;
  selectedTransitionId: string | null;
  selectedTrackId?: string | null;
  toolMode: ToolMode;
  fps: number;
  timelineHeight?: number;
  trackHeaderWidth?: number;
  subtitleLaneHeight?: number;
  fitTrigger?: number;
  onTrackHeaderWidthChange?: (width: number) => void;
  onSubtitleLaneHeightChange?: (height: number) => void;
  onBeginTransaction?: () => void;
  onCommitTransaction?: () => void;
  onDropMediaOnTimeline?: (mediaId: string, trackId: string, startTime: number) => void;
  onNotify?: (toast: Omit<ToastNotification, 'id'>) => void;
  onLoadDemoProject?: () => void;
  onSelectClip: (clipId: string | null) => void;
  onSelectTransition: (transitionId: string | null) => void;
  onSelectTrack?: (trackId: string) => void;
  onUpdateTrack?: (trackId: string, updates: Partial<TimelineTrack>) => void;
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
  subtitles?: SubtitleCue[];
  selectedSubtitleId?: string | null;
  subtitleStyle?: SubtitleStyle;
  onSelectSubtitle?: (id: string | null) => void;
  onUpdateSubtitles?: (cues: SubtitleCue[]) => void;
  onToggleSubtitles?: () => void;
  onOpenSubtitlesModal?: (tab: 'srt' | 'ai' | 'voiceover' | 'styling' | 'speakers') => void;
  onQuickImportSrt?: (file: File) => void;
  onExportSrt?: () => void;
  onAddSubtitleAtPlayhead?: () => void;
}

interface TimelineClipCardProps {
  clip: TimelineClip;
  track: TimelineTrack;
  topOffset: number;
  pixelsPerSecond: number;
  isSelected: boolean;
  toolMode: ToolMode;
  clipAppearanceMode: 'equal' | 'filmstrip' | 'waveform';
  rawWave?: number[];
  onClipClick: (e: React.MouseEvent, clip: TimelineClip) => void;
  onClipMouseDown: (e: React.MouseEvent, clip: TimelineClip) => void;
  onTrimMouseDown: (e: React.MouseEvent, clip: TimelineClip, edge: 'start' | 'end') => void;
  onVolumeMouseDown: (e: React.MouseEvent, clip: TimelineClip) => void;
}

const TimelineClipCard = React.memo<TimelineClipCardProps>(
  ({
    clip,
    track,
    topOffset,
    pixelsPerSecond,
    isSelected,
    toolMode,
    clipAppearanceMode,
    rawWave,
    onClipClick,
    onClipMouseDown,
    onTrimMouseDown,
    onVolumeMouseDown,
  }) => {
    const leftPx = clip.start * pixelsPerSecond;
    const widthPx = Math.max(24, clip.duration * pixelsPerSecond);
    const clipH = track.height - 6;
    const filmstripH =
      clip.trackType !== 'video'
        ? 0
        : clipAppearanceMode === 'filmstrip'
        ? Math.max(12, clipH - 18)
        : clipAppearanceMode === 'waveform'
        ? 0
        : Math.floor(clipH * 0.48);
    const audioH = Math.max(12, clipH - filmstripH - 16);
    const volRatio = Math.max(0, Math.min(2.0, clip.volume ?? 1.0)) / 2.0;
    const volBottomPx = Math.round(volRatio * Math.max(6, audioH - 4));
    const barCount = Math.max(6, Math.min(64, Math.floor(widthPx / 4)));
    const filmstripCount = Math.min(20, Math.floor(widthPx / 36));

    const waveHeights = useMemo(() => {
      const heights: number[] = new Array(barCount);
      for (let i = 0; i < barCount; i++) {
        let amp = 0.3;
        if (rawWave && rawWave.length > 0) {
          const idx = Math.min(rawWave.length - 1, Math.floor((i / barCount) * rawWave.length));
          amp = Math.max(0.14, Math.min(1, rawWave[idx] * 1.15));
        } else {
          const harmonic =
            Math.abs(Math.sin(i * 0.65)) * 0.55 + Math.abs(Math.cos(i * 1.37)) * 0.35 + 0.12;
          amp = Math.max(0.16, Math.min(0.98, harmonic));
        }
        heights[i] = Math.round(amp * 92);
      }
      return heights;
    }, [barCount, rawWave]);

    return (
      <div
        onClick={(e) => onClipClick(e, clip)}
        onMouseDown={(e) => onClipMouseDown(e, clip)}
        style={{
          top: `${topOffset + 3}px`,
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          height: `${clipH}px`,
        }}
        className={`group absolute rounded-[5px] flex flex-col overflow-hidden select-none transition-colors duration-100 ${
          track.locked
            ? 'cursor-not-allowed opacity-85'
            : toolMode === 'blade'
            ? 'cursor-crosshair'
            : 'cursor-move'
        } ${
          isSelected
            ? 'border-2 border-[#ffcc00] ring-2 ring-[#ffcc00]/35 shadow-xl shadow-black/75 z-20 brightness-105'
            : 'border border-[#2b3145] hover:border-slate-300/90 hover:brightness-110 hover:shadow-md hover:shadow-black/50 z-10'
        } ${clip.trackType === 'video' ? 'bg-[#151c27]' : 'bg-[#10241b]'}`}
        title={`${clip.name} (${clip.duration.toFixed(2)}s)${track.locked ? ' · Track Locked' : ''}`}
      >
        {!isSelected && (
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] pointer-events-none transition-colors z-10" />
        )}

        {/* Left Trim Handle */}
        <div
          onMouseDown={(e) => onTrimMouseDown(e, clip, 'start')}
          className={`absolute left-0 top-0 bottom-0 w-2.5 cursor-w-resize z-30 transition-colors flex items-center justify-center ${
            isSelected
              ? 'bg-[#ffcc00] text-black font-bold text-[10px]'
              : 'bg-white/0 group-hover:bg-white/15 hover:bg-[#ffcc00]/80 hover:text-black'
          }`}
          title="Drag to trim clip In point"
        >
          {isSelected ? (
            <span>[</span>
          ) : (
            <span className="w-0.5 h-3.5 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Top Clip Header Ribbon */}
        <div
          className="px-2.5 py-0.5 text-[10px] font-bold text-white truncate flex items-center justify-between border-b border-black/25 shrink-0"
          style={{ backgroundColor: clip.color || '#24344d' }}
        >
          <span className="truncate tracking-tight font-sans text-slate-100 drop-shadow-xs">
            {clip.name}
          </span>
          <span className="text-[9px] font-mono text-slate-200/90 tabular-nums pl-1 shrink-0">
            {clip.duration.toFixed(1)}s
          </span>
        </div>

        {/* Filmstrip Ribbon */}
        {clip.trackType === 'video' && filmstripH > 10 && (
          <div
            style={{ height: `${filmstripH}px` }}
            className="flex items-center overflow-hidden gap-1 px-1.5 bg-[#0b0e14]/85 border-b border-black/35 shrink-0"
          >
            {Array.from({ length: filmstripCount }).map((_, fIdx) => (
              <div
                key={fIdx}
                className="h-full w-8 rounded-xs bg-[#161a24] border border-[#23293a] shrink-0 flex items-center justify-center overflow-hidden"
              >
                <div
                  className="w-full h-full opacity-70"
                  style={{
                    backgroundColor: clip.color || '#24344d',
                    filter: `brightness(${0.85 + (fIdx % 3) * 0.15})`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Waveform & Volume Rubberband */}
        <div
          style={{ height: `${audioH}px` }}
          className="relative flex-1 bg-[#080d12] flex items-end px-1.5 pb-0.5 overflow-hidden group/audio"
        >
          <div className="absolute left-0 right-0 top-1/2 border-t border-white/[0.08] pointer-events-none" />
          <div className="w-full h-full flex items-end gap-[1.5px]">
            {waveHeights.map((heightPct, i) => (
              <div
                key={i}
                style={{ height: `${heightPct}%` }}
                className={`flex-1 rounded-t-[1px] relative overflow-hidden ${
                  clip.trackType === 'video'
                    ? 'bg-[#38bdf8]/85 group-hover:bg-[#38bdf8]'
                    : 'bg-[#34d399]/90 group-hover:bg-[#34d399]'
                }`}
              >
                <div
                  className={`h-[1.5px] w-full ${
                    clip.trackType === 'video' ? 'bg-sky-200/90' : 'bg-emerald-200/95'
                  }`}
                />
              </div>
            ))}
          </div>

          <div
            onMouseDown={(e) => onVolumeMouseDown(e, clip)}
            style={{ bottom: `${volBottomPx}px` }}
            className="absolute left-0 right-0 h-[3px] bg-slate-200/85 hover:bg-[#ffcc00] group-hover/audio:bg-white cursor-row-resize z-20 flex items-center justify-center shadow-xs transition-colors"
            title={`Volume: ${
              (clip.volume ?? 1.0) === 0
                ? '-∞ dB'
                : `${(20 * Math.log10(clip.volume ?? 1.0)).toFixed(1)} dB`
            } (Drag up/down)`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover/audio:opacity-100" />
          </div>
        </div>

        {/* Right Trim Handle */}
        <div
          onMouseDown={(e) => onTrimMouseDown(e, clip, 'end')}
          className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-e-resize z-30 transition-colors flex items-center justify-center ${
            isSelected
              ? 'bg-[#ffcc00] text-black font-bold text-[10px]'
              : 'bg-white/0 group-hover:bg-white/15 hover:bg-[#ffcc00]/80 hover:text-black'
          }`}
          title="Drag to trim clip Out point"
        >
          {isSelected ? (
            <span>]</span>
          ) : (
            <span className="w-0.5 h-3.5 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    );
  }
);

interface SubtitleClipCardProps {
  cue: SubtitleCue;
  cueIdx: number;
  pixelsPerSecond: number;
  subtitleLaneHeight: number;
  isSelected: boolean;
  isInlineEditing: boolean;
  editingText: string;
  toolMode: ToolMode;
  onEditingTextChange: (text: string) => void;
  onCommitInlineEdit: (cueId: string, nextText: string) => void;
  onCancelInlineEdit: () => void;
  onClickCue: (e: React.MouseEvent, cue: SubtitleCue) => void;
  onDoubleClickCue: (e: React.MouseEvent, cue: SubtitleCue) => void;
  onMouseDownCue: (e: React.MouseEvent, cue: SubtitleCue) => void;
  onMouseDownEdge: (e: React.MouseEvent, cue: SubtitleCue, edge: 'start' | 'end') => void;
}

const SubtitleClipCard = React.memo<SubtitleClipCardProps>(
  ({
    cue,
    cueIdx,
    pixelsPerSecond,
    subtitleLaneHeight,
    isSelected,
    isInlineEditing,
    editingText,
    toolMode,
    onEditingTextChange,
    onCommitInlineEdit,
    onCancelInlineEdit,
    onClickCue,
    onDoubleClickCue,
    onMouseDownCue,
    onMouseDownEdge,
  }) => {
    const leftPx = cue.start * pixelsPerSecond;
    const widthPx = Math.max(32, (cue.end - cue.start) * pixelsPerSecond);
    const cueDur = Math.max(0.1, cue.end - cue.start);

    return (
      <div
        onClick={(e) => onClickCue(e, cue)}
        onDoubleClick={(e) => onDoubleClickCue(e, cue)}
        onMouseDown={(e) => onMouseDownCue(e, cue)}
        style={{
          top: '4px',
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          height: `${Math.max(26, subtitleLaneHeight - 8)}px`,
        }}
        className={`group absolute rounded-[5px] flex flex-col overflow-hidden select-none z-20 transition-colors duration-100 ${
          toolMode === 'blade' ? 'cursor-crosshair' : 'cursor-move'
        } ${
          isSelected
            ? 'bg-[#0e324d] border-2 border-[#ffcc00] ring-2 ring-[#ffcc00]/35 text-white shadow-lg'
            : 'bg-[#102438] border border-cyan-500/45 hover:border-cyan-300 hover:bg-[#132d45] hover:shadow-md text-cyan-100'
        }`}
        title={`${cue.text} (${cue.start.toFixed(2)}s - ${cue.end.toFixed(2)}s · Double-click to edit inline)`}
      >
        {/* Left Trim Bracket */}
        <div
          onMouseDown={(e) => onMouseDownEdge(e, cue, 'start')}
          className={`absolute left-0 top-0 bottom-0 w-2.5 cursor-w-resize z-30 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-[#ffcc00] text-black font-bold text-[9px]'
              : 'bg-cyan-400/0 group-hover:bg-cyan-400/25 hover:bg-cyan-300/70'
          }`}
          title="Drag to trim caption start time"
        >
          {isSelected ? (
            <span>[</span>
          ) : (
            <span className="w-0.5 h-3 rounded-full bg-cyan-200/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Caption Header */}
        <div className="px-2.5 py-0.5 bg-[#163a5a] border-b border-black/25 flex items-center justify-between text-[9px] font-mono text-cyan-200 shrink-0">
          <span className="truncate font-bold">#{cueIdx + 1}</span>
          <span className="tabular-nums text-cyan-300/80">{cueDur.toFixed(1)}s</span>
        </div>

        {/* Caption Body */}
        <div className="flex-1 px-2.5 flex items-center min-w-0">
          {isInlineEditing ? (
            <input
              autoFocus
              type="text"
              value={editingText}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => onEditingTextChange(e.target.value)}
              onBlur={() => onCommitInlineEdit(cue.id, editingText)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  onCommitInlineEdit(cue.id, editingText);
                } else if (e.key === 'Escape') {
                  onCancelInlineEdit();
                }
              }}
              className="w-full bg-[#091522] text-white text-[10px] px-1 py-0.5 rounded border border-cyan-400 focus:outline-none"
            />
          ) : (
            <span className="text-[10px] font-medium truncate w-full">{cue.text}</span>
          )}
        </div>

        {/* Right Trim Bracket */}
        <div
          onMouseDown={(e) => onMouseDownEdge(e, cue, 'end')}
          className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-e-resize z-30 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-[#ffcc00] text-black font-bold text-[9px]'
              : 'bg-cyan-400/0 group-hover:bg-cyan-400/25 hover:bg-cyan-300/70'
          }`}
          title="Drag to trim caption end time"
        >
          {isSelected ? (
            <span>]</span>
          ) : (
            <span className="w-0.5 h-3 rounded-full bg-cyan-200/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    );
  }
);

export const MagneticTimeline: React.FC<MagneticTimelineProps> = ({
  tracks,
  clips,
  transitions,
  mediaItems = [],
  playhead,
  selectedMediaId = null,
  selectedClipId,
  selectedTransitionId,
  selectedTrackId = 'track-v1',
  toolMode,
  fps,
  timelineHeight = 224,
  trackHeaderWidth: controlledTrackHeaderWidth = 240,
  subtitleLaneHeight: controlledSubtitleLaneHeight = 44,
  fitTrigger = 0,
  onTrackHeaderWidthChange,
  onSubtitleLaneHeightChange,
  onBeginTransaction,
  onCommitTransaction,
  onDropMediaOnTimeline,
  onNotify,
  onLoadDemoProject,
  onSelectClip,
  onSelectTransition,
  onSelectTrack,
  onUpdateTrack,
  onUpdateClips,
  onUpdateTransitions,
  onSeek,
  onChangeTool,
  onToggleMagnetic,
  onToggleSnapping,
  onSplitClipAtPlayhead,
  onAddTransitionAtPlayhead,
  subtitles = [],
  selectedSubtitleId = null,
  subtitleStyle,
  onSelectSubtitle,
  onUpdateSubtitles,
  onToggleSubtitles,
  onOpenSubtitlesModal,
  onQuickImportSrt,
  onExportSrt,
  onAddSubtitleAtPlayhead,
}) => {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const timelineContentRef = useRef<HTMLDivElement | null>(null);
  const trackHeaderRef = useRef<HTMLDivElement | null>(null);
  const srtQuickInputRef = useRef<HTMLInputElement | null>(null);
  const skimmerLineRef = useRef<HTMLDivElement | null>(null);
  const transactionActiveRef = useRef<boolean>(false);

  // Zoom scale: pixels per second (default 54px/sec) with smooth rAF interpolation
  const [pixelsPerSecond, setPixelsPerSecond] = useState(54);
  const [targetZoomPps, setTargetZoomPps] = useState(54);
  const ppsRef = useRef(54);
  const zoomRafRef = useRef<number | null>(null);

  // Viewport culling window
  const [scrollWindow, setScrollWindow] = useState({ left: 0, width: 1600 });

  useEffect(() => {
    ppsRef.current = pixelsPerSecond;
  }, [pixelsPerSecond]);

  useEffect(() => {
    const el = timelineContentRef.current;
    if (!el) return;
    const updateSize = () => {
      setScrollWindow((prev) => ({ ...prev, width: el.clientWidth || 1600 }));
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const animateZoomTo = useCallback((nextTarget: number, durationMs = 170) => {
    const clampedTarget = Math.max(24, Math.min(150, Math.round(nextTarget)));
    setTargetZoomPps(clampedTarget);

    if (zoomRafRef.current) {
      cancelAnimationFrame(zoomRafRef.current);
      zoomRafRef.current = null;
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const startPps = ppsRef.current;
    if (reducedMotion || Math.abs(clampedTarget - startPps) < 0.25) {
      setPixelsPerSecond(clampedTarget);
      ppsRef.current = clampedTarget;
      return;
    }

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startPps + (clampedTarget - startPps) * eased;
      ppsRef.current = current;
      setPixelsPerSecond(current);

      if (t < 1) {
        zoomRafRef.current = requestAnimationFrame(step);
      } else {
        ppsRef.current = clampedTarget;
        setPixelsPerSecond(clampedTarget);
        zoomRafRef.current = null;
      }
    };

    zoomRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => {
      if (zoomRafRef.current) cancelAnimationFrame(zoomRafRef.current);
    };
  }, []);

  // Respond to Shift+Z Fit Timeline trigger from App centralized shortcut handler
  useEffect(() => {
    if (fitTrigger === 0) return;
    if (timelineContentRef.current && playhead.duration > 0) {
      const containerWidth = timelineContentRef.current.clientWidth - 100;
      const fitPps = Math.max(24, Math.min(150, Math.floor(containerWidth / playhead.duration)));
      animateZoomTo(fitPps);
    }
  }, [fitTrigger, playhead.duration, animateZoomTo]);

  // Dragging & Trimming states
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartClipStart, setDragStartClipStart] = useState(0);

  const [trimmingEdge, setTrimmingEdge] = useState<{
    clipId: string;
    edge: 'start' | 'end';
    initialStart: number;
    initialDuration: number;
    startX: number;
  } | null>(null);

  const [resizingTransition, setResizingTransition] = useState<{
    transitionId: string;
    initialDuration: number;
    startX: number;
  } | null>(null);

  const [draggingSubtitle, setDraggingSubtitle] = useState<{
    id: string;
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const [resizingSubtitle, setResizingSubtitle] = useState<{
    id: string;
    edge: 'start' | 'end';
    startX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const [editingSubtitleId, setEditingSubtitleId] = useState<string | null>(null);
  const [editingSubtitleText, setEditingSubtitleText] = useState<string>('');

  const [draggingVolumeClipId, setDraggingVolumeClipId] = useState<string | null>(null);
  const [dragVolumeInitialY, setDragVolumeInitialY] = useState(0);
  const [dragVolumeInitialVol, setDragVolumeInitialVol] = useState(1);
  const [volumeTooltip, setVolumeTooltip] = useState<{ db: string; x: number; y: number } | null>(
    null
  );

  // Precision Snapping & Drag HUD states
  const [snapLineTime, setSnapLineTime] = useState<number | null>(null);
  const [precisionHud, setPrecisionHud] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // Media Browser -> Timeline Drop Preview
  const [dropPreview, setDropPreview] = useState<{
    trackId: string;
    start: number;
    duration: number;
    name: string;
    valid: boolean;
    reason?: string;
  } | null>(null);

  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = useState(false);
  const [clipAppearanceMode, setClipAppearanceMode] = useState<'equal' | 'filmstrip' | 'waveform'>(
    'equal'
  );
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [indexSearchQuery, setIndexSearchQuery] = useState('');

  // Persisted/Controlled Header Width & Subtitle Lane Height
  const [localTrackHeaderWidth, setLocalTrackHeaderWidth] = useState(controlledTrackHeaderWidth);
  const trackHeaderWidth = onTrackHeaderWidthChange
    ? controlledTrackHeaderWidth
    : localTrackHeaderWidth;
  const setTrackHeaderWidth = onTrackHeaderWidthChange || setLocalTrackHeaderWidth;

  const [localSubtitleLaneHeight, setLocalSubtitleLaneHeight] = useState(
    controlledSubtitleLaneHeight
  );
  const subtitleLaneHeight = onSubtitleLaneHeightChange
    ? controlledSubtitleLaneHeight
    : localSubtitleLaneHeight;
  const setSubtitleLaneHeight = onSubtitleLaneHeightChange || setLocalSubtitleLaneHeight;

  const [isResizingTrackHeader, setIsResizingTrackHeader] = useState(false);
  const [resizingTrackId, setResizingTrackId] = useState<string | null>(null);

  // Track Y offsets cache
  const trackOffsets = useMemo(() => {
    const map = new Map<string, number>();
    let y = subtitleLaneHeight;
    for (const tr of tracks) {
      map.set(tr.id, y);
      y += tr.height;
    }
    return map;
  }, [tracks, subtitleLaneHeight]);

  // Media lookup map for O(1) resolution
  const mediaById = useMemo(() => {
    const map = new Map<string, MediaItem>();
    for (const m of mediaItems) map.set(m.id, m);
    return map;
  }, [mediaItems]);

  const startGestureTransaction = useCallback(() => {
    if (!transactionActiveRef.current) {
      transactionActiveRef.current = true;
      onBeginTransaction?.();
    }
  }, [onBeginTransaction]);

  const endGestureTransaction = useCallback(() => {
    if (transactionActiveRef.current) {
      transactionActiveRef.current = false;
      onCommitTransaction?.();
    }
  }, [onCommitTransaction]);

  // Helper: Find closest snap target in timeline seconds using 10px screen tolerance
  const findSnapTime = useCallback(
    (
      candidateTime: number,
      excludeClipId?: string,
      excludeSubtitleId?: string
    ): { snapped: number; didSnap: boolean } => {
      if (!playhead.snapping) return { snapped: candidateTime, didSnap: false };
      const tolerance = Math.max(0.08, 10 / pixelsPerSecond);
      const targets: number[] = [0, playhead.currentTime];
      if (playhead.inPoint !== null) targets.push(playhead.inPoint);
      if (playhead.outPoint !== null) targets.push(playhead.outPoint);

      for (const c of clips) {
        if (c.id === excludeClipId) continue;
        targets.push(c.start, c.start + c.duration);
      }
      for (const s of subtitles) {
        if (s.id === excludeSubtitleId) continue;
        targets.push(s.start, s.end);
      }

      let bestTime = candidateTime;
      let bestDist = tolerance;
      let didSnap = false;

      for (const target of targets) {
        const d = Math.abs(candidateTime - target);
        if (d < bestDist) {
          bestDist = d;
          bestTime = target;
          didSnap = true;
        }
      }

      return { snapped: bestTime, didSnap };
    },
    [playhead.snapping, playhead.currentTime, playhead.inPoint, playhead.outPoint, pixelsPerSecond, clips, subtitles]
  );

  const handleTrackHeaderResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = trackHeaderWidth;
    setIsResizingTrackHeader(true);

    const handlePointerMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startX;
      const nextWidth = Math.max(170, Math.min(440, startWidth + deltaX));
      setTrackHeaderWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingTrackHeader(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleTrackHeightResizeStart = (
    e: React.PointerEvent,
    trackId: string,
    initialHeight: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    setResizingTrackId(trackId);

    const handlePointerMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startY;
      const nextHeight = Math.round(Math.max(32, Math.min(120, initialHeight + deltaY)));
      if (trackId === 'track-s1') {
        setSubtitleLaneHeight(nextHeight);
      } else {
        onUpdateTrack?.(trackId, { height: nextHeight });
      }
    };

    const handlePointerUp = () => {
      setResizingTrackId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Resolve track under pointer Y inside timelineContentRef
  const resolveTrackAtClientY = useCallback(
    (clientY: number): TimelineTrack | null => {
      const el = timelineContentRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const rulerH = 28; // h-7
      const yInCanvas = clientY - rect.top + el.scrollTop - rulerH;
      if (yInCanvas < subtitleLaneHeight) return null;

      let cursor = subtitleLaneHeight;
      for (const tr of tracks) {
        if (yInCanvas >= cursor && yInCanvas <= cursor + tr.height) {
          return tr;
        }
        cursor += tr.height;
      }
      return null;
    },
    [tracks, subtitleLaneHeight]
  );

  // Scrubbing & Skimming
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (timelineContentRef.current) {
      const rect = timelineContentRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + timelineContentRef.current.scrollLeft;
      const clickedTime = Math.max(0, Math.min(playhead.duration, clickX / pixelsPerSecond));
      onSeek(clickedTime);
      onSelectClip(null);
      onSelectTransition(null);
      onSelectSubtitle?.(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update skimmer directly via DOM ref (zero React re-renders during hover!)
    if (timelineContentRef.current && skimmerLineRef.current) {
      const rect = timelineContentRef.current.getBoundingClientRect();
      const hoverX = e.clientX - rect.left + timelineContentRef.current.scrollLeft;
      const clampedX = Math.max(0, Math.min(playhead.duration * pixelsPerSecond, hoverX));
      skimmerLineRef.current.style.opacity = '1';
      skimmerLineRef.current.style.transform = `translate3d(${clampedX}px, 0, 0)`;
    }

    // Volume Rubberband Drag
    if (draggingVolumeClipId) {
      const deltaY = dragVolumeInitialY - e.clientY;
      const deltaVol = deltaY / 30;
      const newVol = Math.max(0, Math.min(2.0, dragVolumeInitialVol + deltaVol));
      const dbValue = newVol === 0 ? '-∞ dB' : `${(20 * Math.log10(newVol)).toFixed(1)} dB`;
      const displayDb = newVol >= 1.0 && newVol > 0 ? `+${dbValue}` : dbValue;

      setVolumeTooltip({ db: displayDb, x: e.clientX, y: e.clientY - 28 });
      onUpdateClips(
        clips.map((c) =>
          c.id === draggingVolumeClipId ? { ...c, volume: Number(newVol.toFixed(2)) } : c
        )
      );
      return;
    }

    // Clip Dragging (with Start + End edge snapping + compatible cross-track movement)
    if (draggingClipId) {
      const activeClip = clips.find((c) => c.id === draggingClipId);
      if (!activeClip) return;

      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      const rawStart = Math.max(0, dragStartClipStart + deltaTime);

      const startSnap = findSnapTime(rawStart, draggingClipId);
      const endSnap = findSnapTime(rawStart + activeClip.duration, draggingClipId);

      let newStart = rawStart;
      let activeSnapTime: number | null = null;

      if (startSnap.didSnap && (!endSnap.didSnap || Math.abs(startSnap.snapped - rawStart) <= Math.abs(endSnap.snapped - (rawStart + activeClip.duration)))) {
        newStart = startSnap.snapped;
        activeSnapTime = startSnap.snapped;
      } else if (endSnap.didSnap) {
        newStart = Math.max(0, endSnap.snapped - activeClip.duration);
        activeSnapTime = endSnap.snapped;
      }

      // Cross-track compatibility check
      const hoveredTrack = resolveTrackAtClientY(e.clientY);
      let nextTrackId = activeClip.trackId;
      if (
        hoveredTrack &&
        hoveredTrack.type === activeClip.trackType &&
        !hoveredTrack.locked
      ) {
        nextTrackId = hoveredTrack.id;
      }

      setSnapLineTime(activeSnapTime);
      setPrecisionHud({
        x: e.clientX,
        y: e.clientY - 34,
        label: `${formatTimecode(newStart, fps).slice(3)} → ${formatTimecode(
          newStart + activeClip.duration,
          fps
        ).slice(3)} · ${nextTrackId.replace('track-', '').toUpperCase()}`,
      });

      onUpdateClips(
        clips.map((c) =>
          c.id === draggingClipId
            ? { ...c, start: Number(newStart.toFixed(2)), trackId: nextTrackId }
            : c
        )
      );
      return;
    }

    // Clip Trimming (with edge snapping + precision HUD)
    if (trimmingEdge) {
      const deltaX = e.clientX - trimmingEdge.startX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (trimmingEdge.edge === 'start') {
        const rawStart = Math.max(0, trimmingEdge.initialStart + deltaTime);
        const snap = findSnapTime(rawStart, trimmingEdge.clipId);
        const potentialStart = snap.didSnap ? snap.snapped : rawStart;
        const maxEnd = trimmingEdge.initialStart + trimmingEdge.initialDuration;
        const potentialDuration = maxEnd - potentialStart;

        if (potentialDuration > 0.3 && potentialStart >= 0) {
          setSnapLineTime(snap.didSnap ? snap.snapped : null);
          setPrecisionHud({
            x: e.clientX,
            y: e.clientY - 34,
            label: `In ${formatTimecode(potentialStart, fps).slice(3)} · Dur ${potentialDuration.toFixed(2)}s`,
          });
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
        const rawEnd = trimmingEdge.initialStart + trimmingEdge.initialDuration + deltaTime;
        const snap = findSnapTime(rawEnd, trimmingEdge.clipId);
        const targetEnd = snap.didSnap ? snap.snapped : rawEnd;
        const potentialDuration = targetEnd - trimmingEdge.initialStart;

        if (potentialDuration > 0.3) {
          setSnapLineTime(snap.didSnap ? snap.snapped : null);
          setPrecisionHud({
            x: e.clientX,
            y: e.clientY - 34,
            label: `Out ${formatTimecode(targetEnd, fps).slice(3)} · Dur ${potentialDuration.toFixed(2)}s`,
          });
          onUpdateClips(
            clips.map((c) =>
              c.id === trimmingEdge.clipId
                ? { ...c, duration: Number(potentialDuration.toFixed(2)) }
                : c
            )
          );
        }
      }
      return;
    }

    // Transition Resizing
    if (resizingTransition) {
      const deltaX = e.clientX - resizingTransition.startX;
      const deltaTime = (deltaX / pixelsPerSecond) * 2;
      const newDuration = Math.max(0.3, Math.min(4.0, resizingTransition.initialDuration + deltaTime));

      setPrecisionHud({
        x: e.clientX,
        y: e.clientY - 34,
        label: `Transition ${newDuration.toFixed(2)}s`,
      });
      onUpdateTransitions(
        transitions.map((t) =>
          t.id === resizingTransition.transitionId
            ? { ...t, duration: Number(newDuration.toFixed(2)) }
            : t
        )
      );
      return;
    }

    // Subtitle Dragging with dual-edge snapping
    if (draggingSubtitle && onUpdateSubtitles) {
      const deltaTime = (e.clientX - draggingSubtitle.startX) / pixelsPerSecond;
      const cueDur = draggingSubtitle.initialEnd - draggingSubtitle.initialStart;
      const rawStart = Math.max(0, draggingSubtitle.initialStart + deltaTime);

      const startSnap = findSnapTime(rawStart, undefined, draggingSubtitle.id);
      const endSnap = findSnapTime(rawStart + cueDur, undefined, draggingSubtitle.id);
      let nextStart = rawStart;
      let activeSnap: number | null = null;

      if (startSnap.didSnap) {
        nextStart = startSnap.snapped;
        activeSnap = startSnap.snapped;
      } else if (endSnap.didSnap) {
        nextStart = Math.max(0, endSnap.snapped - cueDur);
        activeSnap = endSnap.snapped;
      }

      const nextEnd = nextStart + cueDur;
      setSnapLineTime(activeSnap);
      setPrecisionHud({
        x: e.clientX,
        y: e.clientY - 34,
        label: `Caption ${formatTimecode(nextStart, fps).slice(3)} → ${formatTimecode(
          nextEnd,
          fps
        ).slice(3)}`,
      });
      onUpdateSubtitles(
        subtitles.map((s) =>
          s.id === draggingSubtitle.id
            ? { ...s, start: Number(nextStart.toFixed(2)), end: Number(nextEnd.toFixed(2)) }
            : s
        )
      );
      return;
    }

    // Subtitle Edge Resizing
    if (resizingSubtitle && onUpdateSubtitles) {
      const deltaTime = (e.clientX - resizingSubtitle.startX) / pixelsPerSecond;
      if (resizingSubtitle.edge === 'start') {
        const rawStart = Math.max(
          0,
          Math.min(resizingSubtitle.initialEnd - 0.3, resizingSubtitle.initialStart + deltaTime)
        );
        const snap = findSnapTime(rawStart, undefined, resizingSubtitle.id);
        const nextStart =
          snap.didSnap && snap.snapped <= resizingSubtitle.initialEnd - 0.3
            ? snap.snapped
            : rawStart;
        setSnapLineTime(snap.didSnap ? nextStart : null);
        setPrecisionHud({
          x: e.clientX,
          y: e.clientY - 34,
          label: `In ${formatTimecode(nextStart, fps).slice(3)}`,
        });
        onUpdateSubtitles(
          subtitles.map((s) =>
            s.id === resizingSubtitle.id ? { ...s, start: Number(nextStart.toFixed(2)) } : s
          )
        );
      } else {
        const rawEnd = Math.max(
          resizingSubtitle.initialStart + 0.3,
          resizingSubtitle.initialEnd + deltaTime
        );
        const snap = findSnapTime(rawEnd, undefined, resizingSubtitle.id);
        const nextEnd =
          snap.didSnap && snap.snapped >= resizingSubtitle.initialStart + 0.3
            ? snap.snapped
            : rawEnd;
        setSnapLineTime(snap.didSnap ? nextEnd : null);
        setPrecisionHud({
          x: e.clientX,
          y: e.clientY - 34,
          label: `Out ${formatTimecode(nextEnd, fps).slice(3)}`,
        });
        onUpdateSubtitles(
          subtitles.map((s) =>
            s.id === resizingSubtitle.id ? { ...s, end: Number(nextEnd.toFixed(2)) } : s
          )
        );
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingClipId && playhead.magneticMode) {
      const v1Clips = clips
        .filter((c) => c.trackId === 'track-v1')
        .sort((a, b) => a.start - b.start);
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

    endGestureTransaction();
    setDraggingClipId(null);
    setTrimmingEdge(null);
    setResizingTransition(null);
    setDraggingSubtitle(null);
    setResizingSubtitle(null);
    setDraggingVolumeClipId(null);
    setVolumeTooltip(null);
    setSnapLineTime(null);
    setPrecisionHud(null);
  };

  // Drag-and-drop from Event Browser -> Timeline Lanes
  const handleTimelineDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-aethercut-media')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const el = timelineContentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const hoverX = e.clientX - rect.left + el.scrollLeft;
    const rawTime = Math.max(0, hoverX / pixelsPerSecond);
    const snap = findSnapTime(rawTime);
    const snappedTime = snap.snapped;
    setSnapLineTime(snap.didSnap ? snappedTime : null);

    // Peek at dragged media metadata from selectedMediaId or fallback parsing
    const draggedMedia = mediaItems.find((m) => m.id === selectedMediaId) || mediaItems[0];
    const targetTrack = resolveTrackAtClientY(e.clientY);
    if (!targetTrack) {
      setDropPreview(null);
      return;
    }

    const mediaKind = draggedMedia?.type || (targetTrack.type === 'audio' ? 'audio' : 'video');
    const isMediaVideo = mediaKind === 'video' || mediaKind === 'image';
    const isCompatible =
      (isMediaVideo && targetTrack.type === 'video') ||
      (!isMediaVideo && targetTrack.type === 'audio');

    let valid = true;
    let reason: string | undefined;
    if (targetTrack.locked) {
      valid = false;
      reason = `${targetTrack.name} locked`;
    } else if (!isCompatible) {
      valid = false;
      reason = isMediaVideo ? 'Video requires V1/V2' : 'Audio requires A1/A2';
    }

    setDropPreview({
      trackId: targetTrack.id,
      start: Number(snappedTime.toFixed(2)),
      duration: draggedMedia?.duration || 8,
      name: draggedMedia?.name || 'Media Clip',
      valid,
      reason,
    });
  };

  const handleTimelineDrop = (e: React.DragEvent) => {
    const rawJson = e.dataTransfer.getData('application/x-aethercut-media');
    if (!rawJson) return;
    e.preventDefault();
    setSnapLineTime(null);
    setDropPreview(null);

    try {
      const payload = JSON.parse(rawJson) as {
        mediaId: string;
        name: string;
        type: 'video' | 'audio' | 'image';
        duration: number;
      };
      const el = timelineContentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const hoverX = e.clientX - rect.left + el.scrollLeft;
      const rawTime = Math.max(0, hoverX / pixelsPerSecond);
      const snap = findSnapTime(rawTime);

      const hoveredTrack = resolveTrackAtClientY(e.clientY);
      const isVideoLike = payload.type === 'video' || payload.type === 'image';
      const fallbackTrackId = isVideoLike ? 'track-v1' : 'track-a1';
      const targetTrack = hoveredTrack || tracks.find((t) => t.id === fallbackTrackId);

      if (!targetTrack) return;
      if (targetTrack.locked) {
        onNotify?.({
          level: 'warning',
          title: `${targetTrack.name} is locked`,
          message: 'Unlock the track before dropping clips onto it.',
        });
        return;
      }

      const compatible =
        (isVideoLike && targetTrack.type === 'video') ||
        (!isVideoLike && targetTrack.type === 'audio');

      if (!compatible) {
        onNotify?.({
          level: 'warning',
          title: 'Incompatible track lane',
          message: isVideoLike
            ? 'Video and image clips must be dropped onto V1 or V2.'
            : 'Audio clips must be dropped onto A1 or A2.',
        });
        return;
      }

      onDropMediaOnTimeline?.(payload.mediaId, targetTrack.id, Number(snap.snapped.toFixed(2)));
    } catch {
      onNotify?.({
        level: 'error',
        title: 'Drag-and-drop failed',
        message: 'Could not read dragged media payload.',
      });
    }
  };

  // Clip callbacks memoized so TimelineClipCard stays memoized
  const handleClipClick = useCallback(
    (e: React.MouseEvent, clip: TimelineClip) => {
      e.stopPropagation();
      const track = tracks.find((t) => t.id === clip.trackId);

      if (toolMode === 'blade') {
        if (track?.locked) {
          onNotify?.({
            level: 'warning',
            title: `${track.name} is locked`,
            message: 'Unlock the track to split clips with the Blade tool.',
          });
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const cutOffset = clickX / pixelsPerSecond;

        if (cutOffset > 0.2 && cutOffset < clip.duration - 0.2) {
          onBeginTransaction?.();
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
          onSelectSubtitle?.(null);
          onCommitTransaction?.();
        }
      } else {
        onSelectClip(clip.id);
        onSelectTransition(null);
        onSelectSubtitle?.(null);
      }
    },
    [
      tracks,
      toolMode,
      pixelsPerSecond,
      clips,
      onBeginTransaction,
      onCommitTransaction,
      onUpdateClips,
      onSelectClip,
      onSelectTransition,
      onSelectSubtitle,
      onNotify,
    ]
  );

  const handleClipMouseDown = useCallback(
    (e: React.MouseEvent, clip: TimelineClip) => {
      if (toolMode === 'select' && e.button === 0) {
        e.stopPropagation();
        onSelectClip(clip.id);
        onSelectTransition(null);
        onSelectSubtitle?.(null);

        const track = tracks.find((t) => t.id === clip.trackId);
        if (track?.locked) {
          onNotify?.({
            level: 'warning',
            title: `${track.name} is locked`,
            message: 'Unlock the track to move or reorder clips.',
          });
          return;
        }

        startGestureTransaction();
        setDraggingClipId(clip.id);
        setDragStartX(e.clientX);
        setDragStartClipStart(clip.start);
      }
    },
    [
      toolMode,
      tracks,
      onSelectClip,
      onSelectTransition,
      onSelectSubtitle,
      onNotify,
      startGestureTransaction,
    ]
  );

  const handleTrimMouseDown = useCallback(
    (e: React.MouseEvent, clip: TimelineClip, edge: 'start' | 'end') => {
      e.stopPropagation();
      onSelectClip(clip.id);
      const track = tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) {
        onNotify?.({
          level: 'warning',
          title: `${track.name} is locked`,
          message: 'Unlock the track to trim clip edges.',
        });
        return;
      }

      startGestureTransaction();
      setTrimmingEdge({
        clipId: clip.id,
        edge,
        initialStart: clip.start,
        initialDuration: clip.duration,
        startX: e.clientX,
      });
    },
    [tracks, onSelectClip, onNotify, startGestureTransaction]
  );

  const handleVolumeMouseDown = useCallback(
    (e: React.MouseEvent, clip: TimelineClip) => {
      e.stopPropagation();
      const track = tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) {
        onNotify?.({
          level: 'warning',
          title: `${track.name} is locked`,
          message: 'Unlock the track to adjust clip volume.',
        });
        return;
      }

      startGestureTransaction();
      setDraggingVolumeClipId(clip.id);
      setDragVolumeInitialY(e.clientY);
      setDragVolumeInitialVol(clip.volume ?? 1.0);
    },
    [tracks, onNotify, startGestureTransaction]
  );

  // Subtitle handlers
  const handleClickCue = useCallback(
    (e: React.MouseEvent, cue: SubtitleCue) => {
      e.stopPropagation();
      const cueDur = Math.max(0.1, cue.end - cue.start);
      if (toolMode === 'blade' && onUpdateSubtitles && cueDur > 0.6) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const cutOffset = clickX / pixelsPerSecond;
        if (cutOffset > 0.25 && cutOffset < cueDur - 0.25) {
          onBeginTransaction?.();
          const splitTime = Number((cue.start + cutOffset).toFixed(2));
          const firstCue: SubtitleCue = { ...cue, end: splitTime };
          const secondCue: SubtitleCue = {
            id: `sub-split-${Date.now()}`,
            index: cue.index + 1,
            start: splitTime,
            end: cue.end,
            text: cue.text,
          };
          const nextList = subtitles
            .flatMap((s) => (s.id === cue.id ? [firstCue, secondCue] : [s]))
            .sort((a, b) => a.start - b.start)
            .map((s, idx) => ({ ...s, index: idx + 1 }));
          onUpdateSubtitles(nextList);
          onSelectSubtitle?.(secondCue.id);
          onCommitTransaction?.();
          return;
        }
      }
      onSelectSubtitle?.(cue.id);
      onSelectClip(null);
      onSelectTransition(null);
      onSeek(cue.start);
    },
    [
      toolMode,
      pixelsPerSecond,
      subtitles,
      onBeginTransaction,
      onCommitTransaction,
      onUpdateSubtitles,
      onSelectSubtitle,
      onSelectClip,
      onSelectTransition,
      onSeek,
    ]
  );

  const handleDoubleClickCue = useCallback(
    (e: React.MouseEvent, cue: SubtitleCue) => {
      e.stopPropagation();
      onSelectSubtitle?.(cue.id);
      setEditingSubtitleId(cue.id);
      setEditingSubtitleText(cue.text);
    },
    [onSelectSubtitle]
  );

  const handleMouseDownCue = useCallback(
    (e: React.MouseEvent, cue: SubtitleCue) => {
      if (editingSubtitleId === cue.id) return;
      if (toolMode === 'select' && e.button === 0) {
        e.stopPropagation();
        onSelectSubtitle?.(cue.id);
        onSelectClip(null);
        onSelectTransition(null);
        startGestureTransaction();
        setDraggingSubtitle({
          id: cue.id,
          startX: e.clientX,
          initialStart: cue.start,
          initialEnd: cue.end,
        });
      }
    },
    [editingSubtitleId, toolMode, onSelectSubtitle, onSelectClip, onSelectTransition, startGestureTransaction]
  );

  const handleMouseDownCueEdge = useCallback(
    (e: React.MouseEvent, cue: SubtitleCue, edge: 'start' | 'end') => {
      e.stopPropagation();
      onSelectSubtitle?.(cue.id);
      onSelectClip(null);
      onSelectTransition(null);
      startGestureTransaction();
      setResizingSubtitle({
        id: cue.id,
        edge,
        startX: e.clientX,
        initialStart: cue.start,
        initialEnd: cue.end,
      });
    },
    [onSelectSubtitle, onSelectClip, onSelectTransition, startGestureTransaction]
  );

  const handleCommitInlineEdit = useCallback(
    (cueId: string, nextText: string) => {
      if (onUpdateSubtitles && nextText.trim()) {
        onBeginTransaction?.();
        onUpdateSubtitles(
          subtitles.map((s) => (s.id === cueId ? { ...s, text: nextText.trim() } : s))
        );
        onCommitTransaction?.();
      }
      setEditingSubtitleId(null);
    },
    [subtitles, onUpdateSubtitles, onBeginTransaction, onCommitTransaction]
  );

  const handleCancelInlineEdit = useCallback(() => {
    setEditingSubtitleId(null);
  }, []);

  const timelineWidth = Math.max(1800, playhead.duration * pixelsPerSecond + 600);

  // Horizontal viewport culling window in seconds (with 240px overscan buffer)
  const visibleStartSec = Math.max(0, (scrollWindow.left - 240) / pixelsPerSecond);
  const visibleEndSec = (scrollWindow.left + scrollWindow.width + 240) / pixelsPerSecond;

  const visibleRulerAndGrid = useMemo(() => {
    const step = pixelsPerSecond < 35 ? 5 : pixelsPerSecond < 70 ? 2 : 1;
    const maxSec = Math.ceil(playhead.duration + 12);
    const startSec = Math.max(0, Math.floor(visibleStartSec / step) * step);
    const endSec = Math.min(maxSec, Math.ceil(visibleEndSec / step) * step);

    const rulerTicks: React.ReactNode[] = [];
    const gridLines: React.ReactNode[] = [];

    for (let sec = startSec; sec <= endSec; sec += step) {
      const x = sec * pixelsPerSecond;
      rulerTicks.push(
        <div key={sec} className="absolute top-0 flex flex-col items-start" style={{ left: `${x}px` }}>
          <span className="text-[10px] font-mono text-slate-400 pl-1 font-medium tracking-tight tabular-nums">
            {formatTimecode(sec, fps).slice(3)}
          </span>
          <div className="w-px h-3 bg-[#383d4f] mt-0.5" />
        </div>
      );
      gridLines.push(
        <div
          key={`grid-${sec}`}
          style={{ left: `${x}px` }}
          className="absolute top-0 bottom-0 w-px bg-[#191c28]/70"
        />
      );

      if (pixelsPerSecond >= 40) {
        for (let sub = 1; sub <= 3; sub++) {
          const subX = (sec + (sub * step) / 4) * pixelsPerSecond;
          rulerTicks.push(
            <div
              key={`${sec}-${sub}`}
              className="absolute top-3 w-px h-1.5 bg-[#252838]"
              style={{ left: `${subX}px` }}
            />
          );
        }
      }
    }
    return { rulerTicks, gridLines };
  }, [pixelsPerSecond, playhead.duration, visibleStartSec, visibleEndSec, fps]);

  const visibleClips = useMemo(
    () =>
      clips.filter(
        (c) =>
          c.id === selectedClipId ||
          c.id === draggingClipId ||
          c.id === trimmingEdge?.clipId ||
          (c.start + c.duration >= visibleStartSec && c.start <= visibleEndSec)
      ),
    [clips, selectedClipId, draggingClipId, trimmingEdge?.clipId, visibleStartSec, visibleEndSec]
  );

  const visibleSubtitles = useMemo(
    () =>
      subtitles.filter(
        (s) =>
          s.id === selectedSubtitleId ||
          s.id === editingSubtitleId ||
          (s.end >= visibleStartSec && s.start <= visibleEndSec)
      ),
    [subtitles, selectedSubtitleId, editingSubtitleId, visibleStartSec, visibleEndSec]
  );

  // Keyboard arrow navigation across track lanes
  const orderedTrackIds = useMemo(() => ['track-s1', ...tracks.map((t) => t.id)], [tracks]);
  const handleTrackHeaderKeyDown = (e: React.KeyboardEvent, trackId: string) => {
    const idx = orderedTrackIds.indexOf(trackId);
    if (e.key === 'ArrowDown' && idx >= 0 && idx < orderedTrackIds.length - 1) {
      e.preventDefault();
      onSelectTrack?.(orderedTrackIds[idx + 1]);
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      onSelectTrack?.(orderedTrackIds[idx - 1]);
    }
  };

  return (
    <section
      aria-label="Magnetic Timeline"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (skimmerLineRef.current) skimmerLineRef.current.style.opacity = '0';
        if (draggingVolumeClipId) {
          endGestureTransaction();
          setDraggingVolumeClipId(null);
          setVolumeTooltip(null);
        }
      }}
      style={{ height: `${timelineHeight}px` }}
      className="flex flex-col bg-[#101117] border-t border-[#20222e] select-none text-slate-200 shrink-0 overflow-hidden relative"
    >
      {/* Floating Volume Gain HUD */}
      {volumeTooltip && (
        <div
          style={{ left: `${volumeTooltip.x}px`, top: `${volumeTooltip.y}px` }}
          className="fixed pointer-events-none z-50 px-2 py-0.5 rounded bg-[#1e2230] border border-[#ffcc00] text-[#ffcc00] font-mono text-[11px] font-bold shadow-lg transform -translate-x-1/2 tabular-nums"
        >
          {volumeTooltip.db}
        </div>
      )}

      {/* Floating Precision Drag / Trim HUD */}
      {precisionHud && (
        <div
          style={{ left: `${precisionHud.x}px`, top: `${precisionHud.y}px` }}
          className="fixed pointer-events-none z-50 px-2 py-0.5 rounded bg-[#0c111d]/95 border border-cyan-400/70 text-cyan-200 font-mono text-[10px] font-bold shadow-lg transform -translate-x-1/2 tabular-nums whitespace-nowrap"
        >
          {precisionHud.label}
        </div>
      )}

      {/* TIMELINE TOOLBAR */}
      <div
        role="toolbar"
        aria-label="Timeline editing tools"
        className="px-3 py-1.5 border-b border-[#1c1e28] bg-[#14151e] flex items-center justify-between gap-2 shrink-0 h-10 z-20"
      >
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar">
          {/* Group 1: Index & Core Editing Tools */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsIndexOpen((prev) => !prev)}
              aria-pressed={isIndexOpen}
              aria-label="Toggle Timeline Index Drawer"
              className={`h-7 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isIndexOpen
                  ? 'bg-[#1a263d] border-[#2e4c7d] text-[#60a5fa] shadow-xs'
                  : 'border-[#252838] bg-[#10121a] text-slate-300 hover:text-white hover:bg-[#191c28] hover:border-[#34394f]'
              }`}
              title="Toggle Timeline Index Drawer — Search & jump to clips"
            >
              <ListFilter className="w-3.5 h-3.5 shrink-0" />
              <span>Index</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsToolMenuOpen((prev) => !prev)}
                aria-expanded={isToolMenuOpen}
                aria-haspopup="menu"
                aria-label={`Active editing tool: ${toolMode}`}
                className={`h-7 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  toolMode === 'blade'
                    ? 'bg-red-950/70 border-red-600/80 text-red-200'
                    : toolMode === 'trim'
                    ? 'bg-amber-950/70 border-amber-600/80 text-amber-200'
                    : 'bg-[#182032] border-[#2d3e5e] text-white hover:bg-[#1f2940]'
                }`}
                title="Pointer Tool Selector — Switch between Select (A), Trim (T), or Blade (B)"
              >
                {toolMode === 'select' && (
                  <MousePointer className="w-3.5 h-3.5 text-[#0a84ff] shrink-0" />
                )}
                {toolMode === 'blade' && <Scissors className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                {toolMode === 'trim' && <Move className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                <span className="capitalize">{toolMode}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {isToolMenuOpen && (
                <div
                  role="menu"
                  onMouseLeave={() => setIsToolMenuOpen(false)}
                  className="absolute top-full left-0 mt-1 w-44 rounded-md bg-[#161822] border border-[#2b3044] shadow-xl py-1 z-50 text-xs font-medium"
                >
                  <button
                    type="button"
                    role="menuitem"
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
                    type="button"
                    role="menuitem"
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
                    type="button"
                    role="menuitem"
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

            <button
              type="button"
              onClick={onSplitClipAtPlayhead}
              aria-label="Split Clip at Playhead (⌘B)"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-[#252838] bg-[#10121a] text-slate-300 hover:text-white hover:bg-[#191c28] hover:border-[#34394f] transition-colors shrink-0"
              title="Split Clip at Playhead (⌘B / Ctrl+B)"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onAddTransitionAtPlayhead?.('cross_dissolve')}
              aria-label="Apply Cross Dissolve Transition at Nearest Cut (⌘T)"
              className="h-7 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold rounded-md border border-[#44351c] bg-[#1e180f] text-amber-300 hover:bg-[#2b2112] hover:border-amber-500/70 transition-colors whitespace-nowrap shrink-0"
              title="Apply Cross Dissolve Transition at Nearest Cut (⌘T)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>⌘T</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#262a3d] shrink-0" />

          {/* Group 2: Snapping & Magnetic */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleSnapping}
              aria-pressed={playhead.snapping}
              aria-label={`Snapping (${playhead.snapping ? 'ON' : 'OFF'})`}
              className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${
                playhead.snapping
                  ? 'bg-[#0a84ff]/20 border-[#0a84ff]/70 text-[#60a5fa] shadow-xs'
                  : 'border-[#252838] bg-[#10121a] text-slate-500 hover:text-slate-200 hover:bg-[#191c28]'
              }`}
              title={`Snapping (${playhead.snapping ? 'ON' : 'OFF'}) — Snap clips & cues to edges and playhead [N]`}
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleMagnetic}
              aria-pressed={playhead.magneticMode}
              className={`h-7 flex items-center px-2.5 rounded-md border text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                playhead.magneticMode
                  ? 'bg-[#0a84ff]/20 border-[#0a84ff]/70 text-blue-200 shadow-xs'
                  : 'border-[#252838] bg-[#10121a] text-slate-500 hover:text-slate-200 hover:bg-[#191c28]'
              }`}
              title={`Magnetic Storyline (${playhead.magneticMode ? 'ON' : 'OFF'}) — Auto-close gaps on V1 primary storyline`}
            >
              Magnetic
            </button>
          </div>

          <div className="h-4 w-px bg-[#262a3d] shrink-0" />

          {/* Group 3: AI & CC Cluster */}
          <div className="flex items-center gap-1 pl-1.5 pr-1 h-7 rounded-md bg-[#0d111a] border border-[#222a3d] shrink-0">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 px-1 select-none shrink-0">
              AI &amp; CC
            </span>

            <input
              ref={srtQuickInputRef}
              type="file"
              accept=".srt,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onQuickImportSrt) onQuickImportSrt(file);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => srtQuickInputRef.current?.click()}
              className="h-[22px] flex items-center gap-1 px-2 rounded border border-[#24293a] bg-[#131722] text-slate-300 hover:text-white hover:bg-[#1b2030] text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
              title="Import existing .SRT subtitle file onto S1 lane"
            >
              <FileUp className="w-3.5 h-3.5 text-[#0a84ff] shrink-0" />
              <span>.SRT</span>
            </button>

            {onOpenSubtitlesModal && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenSubtitlesModal('ai')}
                  className="h-[22px] flex items-center gap-1 px-2 rounded border border-[#283c5c] bg-[#132036] text-blue-200 hover:text-white hover:bg-[#1a2b48] text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                  title="AI Subtitles — Transcribe audio or video into timed S1 captions"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                  <span>AI Subtitles</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSubtitlesModal('voiceover')}
                  className="h-[22px] flex items-center gap-1 px-2 rounded border border-[#234733] bg-[#11261c] text-emerald-200 hover:text-white hover:bg-[#173527] text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                  title="AI Voiceover Studio — Multi-speaker Text-to-Speech synced to S1 & A1/A2"
                >
                  <Mic className="w-3.5 h-3.5 text-[#30d158] shrink-0" />
                  <span>AI Voice</span>
                </button>
              </>
            )}

            {onAddSubtitleAtPlayhead && (
              <button
                type="button"
                onClick={onAddSubtitleAtPlayhead}
                className="h-[22px] flex items-center gap-1 px-2 rounded border border-[#24293a] bg-[#131722] text-slate-300 hover:text-white hover:bg-[#1b2030] text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                title="Insert editable caption clip on S1 at current playhead"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Caption</span>
              </button>
            )}

            {onExportSrt && subtitles.length > 0 && (
              <button
                type="button"
                onClick={onExportSrt}
                className="h-[22px] flex items-center gap-1 px-2 rounded border border-[#24293a] bg-[#131722] text-slate-300 hover:text-white hover:bg-[#1b2030] text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                title="Download current S1 captions as an .SRT subtitle file"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Export</span>
              </button>
            )}

            {onToggleSubtitles && (
              <button
                type="button"
                onClick={onToggleSubtitles}
                aria-pressed={!!subtitleStyle?.enabled}
                className={`h-[22px] flex items-center gap-1 px-2 rounded border text-[11px] font-mono font-bold transition-colors whitespace-nowrap shrink-0 ${
                  subtitleStyle?.enabled
                    ? 'bg-[#0a84ff]/25 border-[#0a84ff]/80 text-blue-200'
                    : 'border-[#24293a] bg-[#131722] text-slate-500 hover:text-slate-300'
                }`}
                title={`Closed Captions Burn-In Overlay (${subtitleStyle?.enabled ? 'ON' : 'OFF'})`}
              >
                <Captions className="w-3.5 h-3.5 shrink-0" />
                <span>CC</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Timecode */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-mono text-slate-300 tabular-nums">
            {formatTimecode(playhead.currentTime, fps)}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">
            {formatTimecode(playhead.duration, fps)}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAppearanceMenuOpen((prev) => !prev)}
              aria-expanded={isAppearanceMenuOpen}
              aria-label="Clip Appearance"
              className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors ${
                isAppearanceMenuOpen
                  ? 'bg-[#1a263d] border-[#2e4c7d] text-[#60a5fa]'
                  : 'border-[#252838] bg-[#10121a] text-slate-400 hover:text-white hover:bg-[#191c28]'
              }`}
              title="Clip Appearance — Switch between Filmstrip, 50/50, or Waveform emphasis"
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
                  {(['filmstrip', 'equal', 'waveform'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={clipAppearanceMode === mode}
                      onClick={() => setClipAppearanceMode(mode)}
                      className={`py-1 text-[10px] font-semibold rounded text-center transition-colors ${
                        clipAppearanceMode === mode
                          ? 'bg-[#0a84ff] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode === 'filmstrip' ? 'Filmstrip' : mode === 'equal' ? '50 / 50' : 'Waveform'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 h-7 px-1.5 rounded-md border border-[#252838] bg-[#10121a] text-slate-400">
            <button
              type="button"
              onClick={() => {
                if (timelineContentRef.current && playhead.duration > 0) {
                  const containerWidth = timelineContentRef.current.clientWidth - 100;
                  const fitPps = Math.max(
                    24,
                    Math.min(150, Math.floor(containerWidth / playhead.duration))
                  );
                  animateZoomTo(fitPps);
                }
              }}
              aria-label="Fit Entire Timeline to Window (Shift+Z)"
              className="h-[22px] px-1.5 text-slate-300 hover:text-white hover:bg-[#1b1f2e] rounded text-[10px] font-mono transition-colors"
              title="Fit Entire Timeline to Window (⇧Z)"
            >
              ⇧Z
            </button>
            <button
              type="button"
              onClick={() => animateZoomTo(targetZoomPps - 18)}
              aria-label="Zoom Out Timeline"
              className="h-[22px] w-[22px] flex items-center justify-center rounded hover:bg-[#1b1f2e] hover:text-white transition-colors"
              title="Zoom Out Timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              aria-label="Timeline zoom level"
              min={24}
              max={150}
              step={2}
              value={Math.round(targetZoomPps)}
              onChange={(e) => animateZoomTo(parseInt(e.target.value, 10), 90)}
              className="w-20 h-1 bg-[#222534] rounded-lg appearance-none cursor-pointer accent-[#0a84ff]"
              title={`Timeline Zoom (${Math.round(pixelsPerSecond)} px/s)`}
            />
            <button
              type="button"
              onClick={() => animateZoomTo(targetZoomPps + 18)}
              aria-label="Zoom In Timeline"
              className="h-[22px] w-[22px] flex items-center justify-center rounded hover:bg-[#1b1f2e] hover:text-white transition-colors"
              title="Zoom In Timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="h-7 flex items-center gap-1.5 px-2 rounded-md bg-[#0d0e14] border border-[#222536]"
            title="Master Stereo Audio Level (L / R)"
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-9 h-1.5 bg-[#171922] rounded-xs flex overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: playhead.isPlaying ? '68%' : '15%' }}
                />
              </div>
              <div className="w-9 h-1.5 bg-[#171922] rounded-xs flex overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: playhead.isPlaying ? '64%' : '12%' }}
                />
              </div>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* TIMELINE BODY */}
      <div className="flex-1 flex overflow-hidden relative">
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
                  aria-label="Filter timeline index clips"
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
                    type="button"
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

        {/* Track Lanes Header */}
        <div
          ref={trackHeaderRef}
          role="listbox"
          aria-label="Timeline track lanes"
          onScroll={(e) => {
            if (
              timelineContentRef.current &&
              timelineContentRef.current.scrollTop !== e.currentTarget.scrollTop
            ) {
              timelineContentRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          style={{ width: `${trackHeaderWidth}px` }}
          className="flex flex-col bg-[#12131b] border-r border-[#20222e] z-20 shrink-0 overflow-y-auto no-scrollbar"
        >
          <div className="sticky top-0 z-30 h-7 border-b border-[#202330] bg-[#161722] px-3 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans truncate">
              LANES &amp; ROLES
            </span>
            <span className="text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
              {fps} FPS
            </span>
          </div>

          {/* S1 Subtitle Track Header */}
          <div
            role="option"
            tabIndex={0}
            aria-selected={selectedTrackId === 'track-s1'}
            onClick={() => onSelectTrack?.('track-s1')}
            onKeyDown={(e) => handleTrackHeaderKeyDown(e, 'track-s1')}
            style={{ height: `${subtitleLaneHeight}px` }}
            className={`relative px-3 border-b flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors shrink-0 ${
              selectedTrackId === 'track-s1'
                ? 'bg-[#122638] border-[#1f4f73] ring-1 ring-inset ring-cyan-400/50'
                : 'bg-[#11131d] border-[#1c1e2a] hover:bg-[#151927]'
            }`}
            title="Click to select S1 Subtitles lane · Drag bottom edge to resize height"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                  selectedTrackId === 'track-s1'
                    ? 'bg-cyan-300 ring-2 ring-cyan-400/40 scale-110'
                    : 'bg-cyan-400'
                }`}
              />
              <div className="min-w-0 flex-1 flex flex-col">
                <span
                  className={`text-[11px] font-bold truncate ${
                    selectedTrackId === 'track-s1' ? 'text-white' : 'text-cyan-200'
                  }`}
                >
                  S1 (Subtitles)
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tight truncate">
                  {selectedTrackId === 'track-s1'
                    ? 'Selected · Double-click clip to edit'
                    : 'Double-click clip to edit'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-slate-400 shrink-0">
              <span className="text-[10px] font-mono tabular-nums text-slate-400">
                {subtitles.length}
              </span>
              {onOpenSubtitlesModal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSubtitlesModal('srt');
                  }}
                  aria-label="Open Subtitle Studio"
                  className="p-1 rounded hover:text-white hover:bg-[#1c2436] transition-colors"
                  title="Open Subtitle Studio (.SRT Import / Export / Styling)"
                >
                  <Captions className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              )}
            </div>

            <div
              onPointerDown={(e) => handleTrackHeightResizeStart(e, 'track-s1', subtitleLaneHeight)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSubtitleLaneHeight(44);
              }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize z-30 group/resize flex items-center justify-center"
              title="Drag to resize S1 track height (Double-click to reset)"
            >
              <div
                className={`w-10 h-0.5 rounded-full transition-colors ${
                  resizingTrackId === 'track-s1'
                    ? 'bg-cyan-400'
                    : 'bg-transparent group-hover/resize:bg-cyan-400/80'
                }`}
              />
            </div>
          </div>

          {tracks.map((t) => {
            const isPrimary = t.id === 'track-v1';
            const isTrackSelected = selectedTrackId === t.id;
            const defaultTrackH = t.type === 'video' ? 44 : 38;
            return (
              <div
                key={t.id}
                role="option"
                tabIndex={0}
                aria-selected={isTrackSelected}
                onClick={() => onSelectTrack?.(t.id)}
                onKeyDown={(e) => handleTrackHeaderKeyDown(e, t.id)}
                style={{ height: `${t.height}px` }}
                className={`relative px-3 border-b flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors shrink-0 ${
                  isTrackSelected
                    ? t.type === 'video'
                      ? 'bg-[#172236] border-[#29436b] ring-1 ring-inset ring-[#0a84ff]/55'
                      : 'bg-[#12241d] border-[#1f4d39] ring-1 ring-inset ring-[#30d158]/50'
                    : isPrimary
                    ? 'bg-[#151722] border-[#1c1e2a] hover:bg-[#191d2b]'
                    : 'bg-[#12131b] border-[#1c1e2a] hover:bg-[#171925]'
                }`}
                title={`Click to select ${t.name} · Drag bottom edge to resize track height`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                      t.type === 'video' ? 'bg-[#0a84ff]' : 'bg-[#30d158]'
                    } ${
                      isTrackSelected
                        ? t.type === 'video'
                          ? 'ring-2 ring-[#0a84ff]/45 scale-110'
                          : 'ring-2 ring-[#30d158]/45 scale-110'
                        : ''
                    }`}
                  />
                  <div className="min-w-0 flex-1 flex flex-col">
                    <span
                      className={`text-[11px] font-bold truncate ${
                        isTrackSelected || isPrimary ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {t.name}
                    </span>
                    {(isPrimary || isTrackSelected) && (
                      <span
                        className={`text-[9px] font-mono uppercase tracking-tight truncate ${
                          t.type === 'video' ? 'text-blue-400' : 'text-emerald-400'
                        }`}
                      >
                        {isTrackSelected && isPrimary
                          ? 'Selected · Primary Storyline'
                          : isTrackSelected
                          ? 'Selected Track'
                          : 'Primary Storyline'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-500 shrink-0">
                  <button
                    type="button"
                    aria-pressed={t.muted}
                    aria-label={t.muted ? `Unmute ${t.name}` : `Mute ${t.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTrack?.(t.id, { muted: !t.muted });
                    }}
                    className={`p-1 rounded hover:text-white hover:bg-[#1d2233] transition-colors ${
                      t.muted ? 'text-red-400 bg-red-950/40' : ''
                    }`}
                    title={t.muted ? `Unmute ${t.name}` : `Mute ${t.name} (M)`}
                  >
                    {t.muted ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-pressed={t.locked}
                    aria-label={t.locked ? `Unlock ${t.name}` : `Lock ${t.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTrack?.(t.id, { locked: !t.locked });
                    }}
                    className={`p-1 rounded hover:text-white hover:bg-[#1d2233] transition-colors ${
                      t.locked ? 'text-amber-400 bg-amber-950/40' : ''
                    }`}
                    title={t.locked ? `Unlock ${t.name}` : `Lock ${t.name}`}
                  >
                    {t.locked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div
                  onPointerDown={(e) => handleTrackHeightResizeStart(e, t.id, t.height)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onUpdateTrack?.(t.id, { height: defaultTrackH });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize z-30 group/resize flex items-center justify-center"
                  title={`Drag to resize ${t.name} height (Double-click to reset to ${defaultTrackH}px)`}
                >
                  <div
                    className={`w-10 h-0.5 rounded-full transition-colors ${
                      resizingTrackId === t.id
                        ? t.type === 'video'
                          ? 'bg-[#0a84ff]'
                          : 'bg-[#30d158]'
                        : 'bg-transparent group-hover/resize:bg-[#0a84ff]/80'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Resizable Horizontal Divider */}
        <div
          onPointerDown={handleTrackHeaderResizeStart}
          onDoubleClick={() => setTrackHeaderWidth(240)}
          className={`w-2.5 -ml-1 cursor-col-resize z-30 group flex flex-col items-center justify-center shrink-0 border-r border-[#1e2230] transition-colors relative ${
            isResizingTrackHeader
              ? 'bg-[#0a84ff]/30 border-r-[#0a84ff]'
              : 'bg-[#10121a]/80 hover:bg-[#0a84ff]/20'
          }`}
          title="Drag horizontally to resize track labels width (Double-click to reset to 240px)"
        >
          <div
            className={`w-1 h-12 rounded-full flex items-center justify-center transition-colors ${
              isResizingTrackHeader
                ? 'bg-[#0a84ff] text-white shadow-sm shadow-[#0a84ff]/50'
                : 'bg-[#2a3046] text-slate-400 group-hover:bg-[#0a84ff] group-hover:text-white'
            }`}
          >
            <GripVertical className="w-2.5 h-2.5" />
          </div>
          {isResizingTrackHeader && (
            <div className="absolute top-1.5 left-3 px-1.5 py-0.5 rounded bg-[#0c111d] border border-[#0a84ff]/70 text-[9px] font-mono text-blue-200 shadow-lg pointer-events-none tabular-nums whitespace-nowrap">
              {trackHeaderWidth}px
            </div>
          )}
        </div>

        {/* Timeline Canvas Viewport */}
        <div
          ref={timelineContentRef}
          onScroll={(e) => {
            const target = e.currentTarget;
            if (trackHeaderRef.current && trackHeaderRef.current.scrollTop !== target.scrollTop) {
              trackHeaderRef.current.scrollTop = target.scrollTop;
            }
            setScrollWindow({ left: target.scrollLeft, width: target.clientWidth || 1600 });
          }}
          onMouseDown={handleTimelineMouseDown}
          onDragOver={handleTimelineDragOver}
          onDragLeave={() => {
            setDropPreview(null);
            setSnapLineTime(null);
          }}
          onDrop={handleTimelineDrop}
          className="flex-1 flex flex-col overflow-x-auto overflow-y-auto relative bg-[#0c0d13] cursor-pointer"
        >
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            className="sticky top-0 z-30 h-7 border-b border-[#232636] bg-[#151620] relative shrink-0"
            style={{ width: `${timelineWidth}px` }}
          >
            {visibleRulerAndGrid.rulerTicks}
          </div>

          {/* Track Lanes Canvas */}
          <div className="relative flex-1" style={{ width: `${timelineWidth}px` }}>
            {/* Culled Vertical Gridlines */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {visibleRulerAndGrid.gridLines}
            </div>

            {/* S1 Subtitle Lane Row */}
            <div
              style={{ height: `${subtitleLaneHeight}px` }}
              className={`w-full border-b relative transition-colors flex items-center ${
                selectedTrackId === 'track-s1'
                  ? 'border-cyan-500/45 bg-[#102131]/65'
                  : 'border-[#202436] bg-[#101420]/70'
              }`}
            >
              {subtitles.length === 0 && (
                <span className="ml-4 text-[10px] font-mono text-slate-600 select-none pointer-events-none tracking-tight">
                  S1 · Captions &amp; Synced Subtitles — Import .SRT, generate AI Subtitles, or click + Caption
                </span>
              )}
            </div>

            {/* Track Lane Rows */}
            {tracks.map((t, tIdx) => {
              const isPrimary = t.id === 'track-v1';
              const isTrackSelected = selectedTrackId === t.id;
              const laneHasClips = clips.some((c) => c.trackId === t.id);
              const emptyLaneHint =
                t.id === 'track-v2'
                  ? 'V2 · Connected B-Roll & Node Overlays'
                  : t.id === 'track-v1'
                  ? 'V1 · Primary Magnetic Storyline — Drag media here or press W'
                  : t.id === 'track-a1'
                  ? 'A1 · Dialogue & AI Voiceover Track'
                  : 'A2 · Music Score & Sound Effects';
              return (
                <div
                  key={t.id}
                  style={{ height: `${t.height}px` }}
                  className={`w-full border-b relative transition-colors flex items-center ${
                    isTrackSelected
                      ? t.type === 'video'
                        ? 'border-[#2c4b7d] bg-[#142034]/55'
                        : 'border-[#22523d] bg-[#11241c]/50'
                      : isPrimary
                      ? 'border-[#222535] bg-[#131520]/65'
                      : tIdx % 2 === 0
                      ? 'border-[#1b1e2a] bg-[#0f1018]/65'
                      : 'border-[#1b1e2a] bg-[#0c0d14]/65'
                  }`}
                >
                  {!laneHasClips && (
                    <span className="ml-4 text-[10px] font-mono text-slate-600/90 select-none pointer-events-none tracking-tight">
                      {emptyLaneHint}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Empty Timeline State Prompt */}
            {clips.length === 0 && subtitles.length === 0 && !dropPreview && (
              <div className="sticky left-0 w-full max-w-[calc(100vw-280px)] flex items-center justify-center pointer-events-none z-10 -mt-32 py-3">
                <div className="rounded-lg bg-[#12141e]/92 border border-[#272c40] px-4 py-2.5 text-center backdrop-blur-md shadow-xl pointer-events-auto">
                  <div className="text-xs font-semibold text-slate-200">Timeline Ready</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Drag clips from the Event Browser, insert with{' '}
                    <span className="font-mono text-slate-200">W</span>, or load demo footage.
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    {onLoadDemoProject && (
                      <button
                        type="button"
                        onClick={onLoadDemoProject}
                        className="px-2.5 py-1 bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        Load 4K Demo Project
                      </button>
                    )}
                    {onOpenSubtitlesModal && (
                      <button
                        type="button"
                        onClick={() => onOpenSubtitlesModal('voiceover')}
                        className="px-2.5 py-1 bg-[#161b28] hover:bg-[#1e2537] border border-[#283148] text-emerald-300 rounded text-[11px] font-semibold transition-colors"
                      >
                        Open AI Voiceover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Media Drop Ghost Preview */}
            {dropPreview && (() => {
              const targetTrack = tracks.find((tr) => tr.id === dropPreview.trackId);
              const topOffset = trackOffsets.get(dropPreview.trackId);
              if (!targetTrack || topOffset === undefined) return null;
              return (
                <div
                  style={{
                    top: `${topOffset + 3}px`,
                    left: `${dropPreview.start * pixelsPerSecond}px`,
                    width: `${Math.max(48, dropPreview.duration * pixelsPerSecond)}px`,
                    height: `${targetTrack.height - 6}px`,
                  }}
                  className={`absolute rounded-[5px] border-2 border-dashed pointer-events-none z-30 flex items-center px-2.5 text-[10px] font-mono backdrop-blur-xs ${
                    dropPreview.valid
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                      : 'border-red-400 bg-red-500/20 text-red-200'
                  }`}
                >
                  <span className="truncate font-semibold">
                    {dropPreview.valid
                      ? `${dropPreview.name} @ ${formatTimecode(dropPreview.start, fps).slice(3)}`
                      : dropPreview.reason}
                  </span>
                </div>
              );
            })()}

            {/* Connected Clips Secondary Storyline Pins */}
            {visibleClips
              .filter((c) => c.trackId === 'track-v2')
              .map((c) => {
                const leftPx = c.start * pixelsPerSecond;
                const v2Height = tracks.find((tr) => tr.id === 'track-v2')?.height ?? 44;
                return (
                  <div
                    key={`conn-${c.id}`}
                    style={{
                      left: `${leftPx + 8}px`,
                      top: `${subtitleLaneHeight + v2Height - 4}px`,
                      height: '12px',
                    }}
                    className="absolute w-0.5 bg-blue-500/50 border-l border-dashed border-blue-400/70 pointer-events-none z-10"
                  />
                );
              })}

            {/* Culled Subtitle Clips */}
            {visibleSubtitles.map((cue) => (
              <SubtitleClipCard
                key={cue.id}
                cue={cue}
                cueIdx={cue.index - 1}
                pixelsPerSecond={pixelsPerSecond}
                subtitleLaneHeight={subtitleLaneHeight}
                isSelected={selectedSubtitleId === cue.id}
                isInlineEditing={editingSubtitleId === cue.id}
                editingText={editingSubtitleText}
                toolMode={toolMode}
                onEditingTextChange={setEditingSubtitleText}
                onCommitInlineEdit={handleCommitInlineEdit}
                onCancelInlineEdit={handleCancelInlineEdit}
                onClickCue={handleClickCue}
                onDoubleClickCue={handleDoubleClickCue}
                onMouseDownCue={handleMouseDownCue}
                onMouseDownEdge={handleMouseDownCueEdge}
              />
            ))}

            {/* Culled & Memoized Timeline Clips */}
            {visibleClips.map((clip) => {
              const track = tracks.find((t) => t.id === clip.trackId);
              const topOffset = trackOffsets.get(clip.trackId);
              if (!track || topOffset === undefined) return null;
              const linkedMedia = mediaById.get(clip.mediaId);
              return (
                <TimelineClipCard
                  key={clip.id}
                  clip={clip}
                  track={track}
                  topOffset={topOffset}
                  pixelsPerSecond={pixelsPerSecond}
                  isSelected={selectedClipId === clip.id}
                  toolMode={toolMode}
                  clipAppearanceMode={clipAppearanceMode}
                  rawWave={linkedMedia?.waveformData}
                  onClipClick={handleClipClick}
                  onClipMouseDown={handleClipMouseDown}
                  onTrimMouseDown={handleTrimMouseDown}
                  onVolumeMouseDown={handleVolumeMouseDown}
                />
              );
            })}

            {/* Transitions Overlay */}
            {transitions.map((tr) => {
              const track = tracks.find((t) => t.id === tr.trackId);
              const topOffset = trackOffsets.get(tr.trackId);
              if (!track || topOffset === undefined) return null;

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
                    onSelectSubtitle?.(null);
                  }}
                  style={{
                    top: `${topOffset + 4}px`,
                    left: `${leftPx}px`,
                    width: `${transWidthPx}px`,
                    height: `${track.height - 8}px`,
                  }}
                  className={`absolute rounded-md border flex items-center justify-between px-2 cursor-pointer transition-colors z-30 ${
                    isSelected
                      ? 'border-[#ffcc00] bg-amber-500/40 shadow-lg shadow-amber-500/30 ring-2 ring-[#ffcc00]'
                      : 'border-amber-600/70 bg-[#291b0f]/80 hover:bg-[#382414] hover:border-amber-400'
                  }`}
                  title={`${tr.type.replace('_', ' ').toUpperCase()} (${tr.duration.toFixed(2)}s)`}
                >
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startGestureTransaction();
                      setResizingTransition({
                        transitionId: tr.id,
                        initialDuration: tr.duration,
                        startX: e.clientX,
                      });
                    }}
                    className="w-2.5 h-full -ml-2 cursor-w-resize hover:bg-amber-400/50 rounded-l"
                  />

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
                    <span className="text-[9px] font-mono text-amber-300/80 tabular-nums">
                      {tr.duration.toFixed(1)}s
                    </span>
                  </div>

                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startGestureTransaction();
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

            {/* Magnetic Snap Vertical Guide Line */}
            {snapLineTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-cyan-300 pointer-events-none z-40 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                style={{ left: `${snapLineTime * pixelsPerSecond}px` }}
              />
            )}

            {/* Direct-DOM Orange Skimmer Needle (Zero React Re-Renders on Mouse Hover) */}
            <div
              ref={skimmerLineRef}
              style={{ opacity: 0, transform: 'translate3d(0px, 0, 0)' }}
              className="absolute top-0 left-0 bottom-0 w-0.5 bg-[#ff9f0a]/90 pointer-events-none z-40 shadow-[0_0_6px_rgba(255,159,10,0.45)] transition-opacity duration-75"
            >
              <div className="w-2.5 h-2.5 -ml-1 bg-[#ff9f0a] rotate-45 shadow-sm border border-black/50" />
            </div>

            {/* Main Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[#38bdf8] pointer-events-none z-50 shadow-[0_0_0_1.5px_rgba(5,7,12,0.92),0_0_12px_rgba(10,132,255,0.85)]"
              style={{ left: `${playhead.currentTime * pixelsPerSecond}px` }}
            >
              <div className="w-3.5 h-3.5 -ml-[6px] -mt-0.5 bg-[#0a84ff] rotate-45 rounded-[2px] shadow-[0_0_0_1.5px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.85)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
