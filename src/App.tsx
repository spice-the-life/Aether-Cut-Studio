import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  WorkspaceMode,
  PlatformOS,
  ToolMode,
  MediaItem,
  TimelineClip,
  TimelineTrack,
  TimelineTransition,
  SubtitleCue,
  SubtitleStyle,
  SpeakerProfile,
  VoiceoverSentence,
  TransitionType,
  NodeGraph,
  PlayheadState,
  ToastNotification,
  WorkspaceLayoutSettings,
} from './types/editor';
import { INITIAL_SAMPLE_MEDIA } from './services/sampleMedia';
import { mediaManager } from './services/mediaManager';
import { renderTransitionBlend } from './engine/transitionRenderer';
import { createDefaultNodeGraph, renderNodeGraphToCanvas } from './engine/nodeRenderer';
import { audioEngine } from './engine/audioEngine';
import { parseSRT, serializeSRT } from './utils/srt';
import {
  DEFAULT_WORKSPACE_LAYOUT,
  deserializeAndHydrateProjectBundle,
  loadProjectAutosave,
  loadWorkspaceLayout,
  resetWorkspaceLayout,
  saveProjectAutosave,
  saveWorkspaceLayout,
  serializeProjectBundle,
} from './utils/projectStorage';

// Components
import { WorkstationHeader } from './components/header/WorkstationHeader';
import { MediaPool } from './components/media/MediaPool';
import { TransitionsBrowser } from './components/browser/TransitionsBrowser';
import { DualViewer, MonitorStatusInfo } from './components/viewer/DualViewer';
import { MagneticTimeline } from './components/timeline/MagneticTimeline';
import { NodeCompositor } from './components/nodes/NodeCompositor';
import { ColorGradePanel } from './components/color/ColorGradePanel';
import { AudioMixer } from './components/audio/AudioMixer';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { VideoScopes } from './components/scopes/VideoScopes';
import { DeliverModal } from './components/deliver/DeliverModal';
import { ShortcutsModal } from './components/shortcuts/ShortcutsModal';
import { SubtitlesModal } from './components/subtitles/SubtitlesModal';
import { ToastStack } from './components/ui/ToastStack';

interface EditorSnapshot {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  transitions: TimelineTransition[];
  subtitles: SubtitleCue[];
  subtitleStyle: SubtitleStyle;
  speakers: SpeakerProfile[];
  voiceoverSentences: VoiceoverSentence[];
  nodeGraph: NodeGraph;
  mediaItems: MediaItem[];
}

const DEFAULT_SPEAKERS: SpeakerProfile[] = [
  {
    id: 'spk-narrator',
    name: 'Narrator',
    color: '#30d158',
    voiceName: 'Kore',
    style: 'Narrator',
    speed: 1.0,
    pitch: 0,
    customPersona: '',
  },
  {
    id: 'spk-host',
    name: 'Host',
    color: '#0a84ff',
    voiceName: 'Puck',
    style: 'Energetic',
    speed: 1.05,
    pitch: 1,
    customPersona: '',
  },
  {
    id: 'spk-guest',
    name: 'Guest',
    color: '#bf5af2',
    voiceName: 'Charon',
    style: 'Natural',
    speed: 1.0,
    pitch: -1,
    customPersona: '',
  },
];

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  enabled: true,
  fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
  fontSize: 28,
  position: 'bottom',
  background: 'box',
  backgroundColor: '#0a0b10',
  backgroundOpacity: 0.82,
  color: '#ffffff',
};

const MAX_HISTORY_STEPS = 60;

export default function App() {
  const initialLayoutRef = useRef<WorkspaceLayoutSettings>(loadWorkspaceLayout());

  // Active Workspace
  const [workspace, setWorkspace] = useState<WorkspaceMode>('edit');

  // Platform OS detection
  const [os, setOs] = useState<PlatformOS>(() => {
    if (typeof navigator !== 'undefined') {
      const p = navigator.userAgent.toLowerCase();
      if (p.includes('mac')) return 'mac';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
    }
    return 'mac';
  });

  // Persisted Workspace Layout State
  const [isBrowserOpen, setIsBrowserOpen] = useState(initialLayoutRef.current.isBrowserOpen);
  const [isInspectorOpen, setIsInspectorOpen] = useState(initialLayoutRef.current.isInspectorOpen);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(initialLayoutRef.current.timelineHeight);
  const [browserWidth, setBrowserWidth] = useState(initialLayoutRef.current.browserWidth);
  const [trackHeaderWidth, setTrackHeaderWidth] = useState(
    initialLayoutRef.current.trackHeaderWidth
  );
  const [subtitleLaneHeight, setSubtitleLaneHeight] = useState(
    initialLayoutRef.current.subtitleLaneHeight
  );

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const durationMs = toast.durationMs ?? (toast.level === 'error' ? 6000 : 3800);
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  // Project Identity & Save Status
  const [projectName, setProjectName] = useState('Project 1');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isHydratedFromStorage, setIsHydratedFromStorage] = useState(false);
  const projectOpenInputRef = useRef<HTMLInputElement | null>(null);

  // Media Library
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

  // Timeline Tracks (restoring persisted heights)
  const [tracks, setTracks] = useState<TimelineTrack[]>(() => {
    const th = initialLayoutRef.current.trackHeights || {};
    return [
      {
        id: 'track-v2',
        name: 'V2 (Connected B-Roll)',
        type: 'video',
        locked: false,
        muted: false,
        solo: false,
        height: th['track-v2'] ?? 44,
      },
      {
        id: 'track-v1',
        name: 'V1 (Primary Magnetic)',
        type: 'video',
        locked: false,
        muted: false,
        solo: false,
        height: th['track-v1'] ?? 44,
      },
      {
        id: 'track-a1',
        name: 'A1 (Master Dialogue)',
        type: 'audio',
        locked: false,
        muted: false,
        solo: false,
        height: th['track-a1'] ?? 38,
      },
      {
        id: 'track-a2',
        name: 'A2 (Score & SFX)',
        type: 'audio',
        locked: false,
        muted: false,
        solo: false,
        height: th['track-a2'] ?? 38,
      },
    ];
  });

  // Core Timeline & Studio State
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [transitions, setTransitions] = useState<TimelineTransition[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE);
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>(DEFAULT_SPEAKERS);
  const [voiceoverSentences, setVoiceoverSentences] = useState<VoiceoverSentence[]>([]);
  const [nodeGraph, setNodeGraph] = useState<NodeGraph>(() =>
    createDefaultNodeGraph('graph-greenscreen', 'SciFi Keyer & Color Grade')
  );

  // Selections
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-v1');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-chroma-key');
  const [viewer1NodeId, setViewer1NodeId] = useState<string | null>('node-media-in');
  const [viewer2NodeId, setViewer2NodeId] = useState<string | null>('node-media-out');

  // Playhead & Transport State
  const [playhead, setPlayhead] = useState<PlayheadState>({
    currentTime: 0.0,
    duration: 30,
    isPlaying: false,
    playbackRate: 1,
    loop: true,
    inPoint: null,
    outPoint: null,
    snapping: true,
    magneticMode: true,
  });

  // Tools & Modals
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [fitTrigger, setFitTrigger] = useState(0);
  const [isScopesOpen, setIsScopesOpen] = useState(false);
  const [isDeliverOpen, setIsDeliverOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [subtitlesModalTab, setSubtitlesModalTab] = useState<
    'srt' | 'ai' | 'voiceover' | 'styling' | 'speakers' | null
  >(null);

  // Viewer Canvases
  const viewer1CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewer2CanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ==================== UNDO / REDO HISTORY SYSTEM ====================
  const [historyPast, setHistoryPast] = useState<EditorSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorSnapshot[]>([]);
  const transactionStartSnapshotRef = useRef<EditorSnapshot | null>(null);
  const lastCoalescedRef = useRef<{ key: string; time: number } | null>(null);

  const captureSnapshot = useCallback((): EditorSnapshot => {
    return {
      tracks: tracks.map((t) => ({ ...t })),
      clips: clips.map((c) => ({ ...c })),
      transitions: transitions.map((tr) => ({ ...tr })),
      subtitles: subtitles.map((s) => ({ ...s })),
      subtitleStyle: { ...subtitleStyle },
      speakers: speakers.map((sp) => ({ ...sp })),
      voiceoverSentences: voiceoverSentences.map((v) => ({ ...v })),
      nodeGraph: {
        ...nodeGraph,
        nodes: nodeGraph.nodes.map((n) => ({ ...n, data: { ...n.data } })),
        connections: nodeGraph.connections.map((cn) => ({ ...cn })),
      },
      mediaItems: [...mediaItems],
    };
  }, [tracks, clips, transitions, subtitles, subtitleStyle, speakers, voiceoverSentences, nodeGraph, mediaItems]);

  const snapshotsEqual = (a: EditorSnapshot, b: EditorSnapshot) => {
    return (
      JSON.stringify({
        t: a.tracks,
        c: a.clips,
        tr: a.transitions,
        s: a.subtitles,
        ss: a.subtitleStyle,
        sp: a.speakers,
        vo: a.voiceoverSentences.map((v) => `${v.id}:${v.text}:${v.start}:${v.duration}:${v.speakerId}:${v.status}`),
        ng: a.nodeGraph,
        m: a.mediaItems.map((i) => i.id),
      }) ===
      JSON.stringify({
        t: b.tracks,
        c: b.clips,
        tr: b.transitions,
        s: b.subtitles,
        ss: b.subtitleStyle,
        sp: b.speakers,
        vo: b.voiceoverSentences.map((v) => `${v.id}:${v.text}:${v.start}:${v.duration}:${v.speakerId}:${v.status}`),
        ng: b.nodeGraph,
        m: b.mediaItems.map((i) => i.id),
      })
    );
  };

  const applySnapshot = useCallback((snap: EditorSnapshot) => {
    setTracks(snap.tracks);
    setClips(snap.clips);
    setTransitions(snap.transitions);
    setSubtitles(snap.subtitles);
    setSubtitleStyle(snap.subtitleStyle);
    setSpeakers(snap.speakers);
    setVoiceoverSentences(snap.voiceoverSentences);
    setNodeGraph(snap.nodeGraph);
    setMediaItems(snap.mediaItems);
    setHasUnsavedChanges(true);
  }, []);

  const recordUndoCheckpoint = useCallback(() => {
    lastCoalescedRef.current = null;
    const snap = captureSnapshot();
    setHistoryPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), snap]);
    setHistoryFuture([]);
    setHasUnsavedChanges(true);
  }, [captureSnapshot]);

  const recordCoalescedCheckpoint = useCallback(
    (key: string) => {
      const now = performance.now();
      if (lastCoalescedRef.current && lastCoalescedRef.current.key === key && now - lastCoalescedRef.current.time < 550) {
        lastCoalescedRef.current.time = now;
        setHasUnsavedChanges(true);
        return;
      }
      lastCoalescedRef.current = { key, time: now };
      const snap = captureSnapshot();
      setHistoryPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), snap]);
      setHistoryFuture([]);
      setHasUnsavedChanges(true);
    },
    [captureSnapshot]
  );

  const handleBeginTransaction = useCallback(() => {
    lastCoalescedRef.current = null;
    if (!transactionStartSnapshotRef.current) {
      transactionStartSnapshotRef.current = captureSnapshot();
    }
  }, [captureSnapshot]);

  const handleCommitTransaction = useCallback(() => {
    const startSnap = transactionStartSnapshotRef.current;
    transactionStartSnapshotRef.current = null;
    if (!startSnap) return;
    const endSnap = captureSnapshot();
    if (!snapshotsEqual(startSnap, endSnap)) {
      setHistoryPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), startSnap]);
      setHistoryFuture([]);
      setHasUnsavedChanges(true);
    }
  }, [captureSnapshot]);

  const handleUndo = useCallback(() => {
    lastCoalescedRef.current = null;
    if (historyPast.length === 0) return;
    const current = captureSnapshot();
    const target = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [current, ...prev.slice(0, MAX_HISTORY_STEPS - 1)]);
    applySnapshot(target);
  }, [historyPast, captureSnapshot, applySnapshot]);

  const handleRedo = useCallback(() => {
    lastCoalescedRef.current = null;
    if (historyFuture.length === 0) return;
    const current = captureSnapshot();
    const target = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), current]);
    applySnapshot(target);
  }, [historyFuture, captureSnapshot, applySnapshot]);

  // ==================== WORKSPACE LAYOUT PERSISTENCE ====================
  useEffect(() => {
    const trackHeights: Record<string, number> = {};
    for (const tr of tracks) trackHeights[tr.id] = tr.height;
    saveWorkspaceLayout({
      browserWidth,
      timelineHeight,
      trackHeaderWidth,
      subtitleLaneHeight,
      trackHeights,
      isBrowserOpen,
      isInspectorOpen,
    });
  }, [
    browserWidth,
    timelineHeight,
    trackHeaderWidth,
    subtitleLaneHeight,
    tracks,
    isBrowserOpen,
    isInspectorOpen,
  ]);

  const handleResetLayout = useCallback(() => {
    const defaults = resetWorkspaceLayout();
    setBrowserWidth(defaults.browserWidth);
    setTimelineHeight(defaults.timelineHeight);
    setTrackHeaderWidth(defaults.trackHeaderWidth);
    setSubtitleLaneHeight(defaults.subtitleLaneHeight);
    setIsBrowserOpen(defaults.isBrowserOpen);
    setIsInspectorOpen(defaults.isInspectorOpen);
    setTracks((prev) =>
      prev.map((tr) => ({
        ...tr,
        height: defaults.trackHeights[tr.id] ?? (tr.type === 'video' ? 44 : 38),
      }))
    );
    addToast({
      level: 'info',
      title: 'Workspace layout reset',
      message: 'Panel widths and track heights restored to factory defaults.',
    });
  }, [addToast]);

  // ==================== PROJECT SAVE / LOAD & INDEXEDDB AUTOSAVE ====================
  // Restore autosave once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedBundle = await loadProjectAutosave();
        if (!savedBundle || cancelled) {
          setIsHydratedFromStorage(true);
          return;
        }
        const hasContent =
          savedBundle.clips.length > 0 ||
          savedBundle.subtitles.length > 0 ||
          savedBundle.mediaItems.length > 0 ||
          (savedBundle.voiceoverSentences?.length ?? 0) > 0;

        if (hasContent) {
          const hydrated = await deserializeAndHydrateProjectBundle(savedBundle);
          if (cancelled) return;
          setProjectName(hydrated.bundle.projectName);
          setTracks(hydrated.bundle.tracks);
          setClips(hydrated.bundle.clips);
          setTransitions(hydrated.bundle.transitions);
          setSubtitles(hydrated.bundle.subtitles);
          setSubtitleStyle(hydrated.bundle.subtitleStyle);
          if (hydrated.bundle.speakers.length > 0) {
            setSpeakers(hydrated.bundle.speakers);
          }
          setVoiceoverSentences(hydrated.bundle.voiceoverSentences || []);
          setNodeGraph(hydrated.bundle.nodeGraph);
          setMediaItems(hydrated.mediaItems);
          setPlayhead(hydrated.bundle.playhead);
          setLastSavedAt(hydrated.bundle.savedAt);
          setHasUnsavedChanges(false);

          if (hydrated.unlinkedMediaNames.length > 0) {
            addToast({
              level: 'warning',
              title: 'Session restored with unlinked media',
              message: `${hydrated.unlinkedMediaNames.length} oversized file(s) need re-importing.`,
            });
          } else {
            addToast({
              level: 'info',
              title: 'Previous editing session restored',
              message: `${hydrated.bundle.clips.length} clip(s) · ${hydrated.bundle.subtitles.length} subtitle(s)`,
            });
          }
        }
      } catch {
        // Ignore corrupt autosave gracefully
      } finally {
        if (!cancelled) setIsHydratedFromStorage(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  // Debounced autosave to IndexedDB whenever project state changes
  useEffect(() => {
    if (!isHydratedFromStorage) return;
    const timer = window.setTimeout(async () => {
      try {
        const { bundle } = await serializeProjectBundle({
          projectName,
          tracks,
          clips,
          transitions,
          subtitles,
          subtitleStyle,
          speakers,
          voiceoverSentences,
          nodeGraph,
          playhead,
          mediaItems,
        });
        const res = await saveProjectAutosave(bundle);
        if (res.ok) {
          setLastSavedAt(bundle.savedAt);
        }
      } catch {
        // Silent background autosave guard; explicit Save notifies errors
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    isHydratedFromStorage,
    projectName,
    tracks,
    clips,
    transitions,
    subtitles,
    subtitleStyle,
    speakers,
    voiceoverSentences,
    nodeGraph,
    playhead.duration,
    mediaItems,
  ]);

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && (clips.length > 0 || subtitles.length > 0)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges, clips.length, subtitles.length]);

  const handleSaveProjectBundle = useCallback(async () => {
    try {
      const { bundle, skippedLargeMediaNames } = await serializeProjectBundle({
        projectName,
        tracks,
        clips,
        transitions,
        subtitles,
        subtitleStyle,
        speakers,
        voiceoverSentences,
        nodeGraph,
        playhead,
        mediaItems,
      });
      const idbResult = await saveProjectAutosave(bundle);
      if (!idbResult.ok) {
        addToast({
          level: 'warning',
          title: 'Browser autosave unavailable',
          message: idbResult.error || 'Downloading project file directly.',
        });
      }

      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}.aethercut.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setHasUnsavedChanges(false);
      setLastSavedAt(bundle.savedAt);

      if (skippedLargeMediaNames.length > 0) {
        addToast({
          level: 'warning',
          title: 'Project saved (oversized media linked by name)',
          message: `${skippedLargeMediaNames.slice(0, 2).join(', ')} exceeded 15 MB embed limit.`,
        });
      } else {
        addToast({
          level: 'success',
          title: 'Project saved',
          message: `Downloaded ${projectName.replace(/\s+/g, '_')}.aethercut.json`,
        });
      }
    } catch (err) {
      addToast({
        level: 'error',
        title: 'Could not save project',
        message: err instanceof Error ? err.message : 'Unexpected serialization error.',
      });
    }
  }, [
    projectName,
    tracks,
    clips,
    transitions,
    subtitles,
    subtitleStyle,
    speakers,
    voiceoverSentences,
    nodeGraph,
    playhead,
    mediaItems,
    addToast,
  ]);

  const handleLoadProjectFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const hydrated = await deserializeAndHydrateProjectBundle(parsed);

        setProjectName(hydrated.bundle.projectName);
        setTracks(hydrated.bundle.tracks);
        setClips(hydrated.bundle.clips);
        setTransitions(hydrated.bundle.transitions);
        setSubtitles(hydrated.bundle.subtitles);
        setSubtitleStyle(hydrated.bundle.subtitleStyle);
        if (hydrated.bundle.speakers.length > 0) {
          setSpeakers(hydrated.bundle.speakers);
        }
        setVoiceoverSentences(hydrated.bundle.voiceoverSentences || []);
        setNodeGraph(hydrated.bundle.nodeGraph);
        setMediaItems(hydrated.mediaItems);
        setPlayhead(hydrated.bundle.playhead);
        setSelectedClipId(null);
        setSelectedTransitionId(null);
        setSelectedSubtitleId(null);
        setHistoryPast([]);
        setHistoryFuture([]);
        setHasUnsavedChanges(false);
        setLastSavedAt(hydrated.bundle.savedAt);

        await saveProjectAutosave(hydrated.bundle);

        if (hydrated.unlinkedMediaNames.length > 0) {
          addToast({
            level: 'warning',
            title: 'Project loaded with offline media',
            message: `Re-import oversized files: ${hydrated.unlinkedMediaNames.join(', ')}`,
          });
        } else {
          addToast({
            level: 'success',
            title: `Loaded "${hydrated.bundle.projectName}"`,
            message: `${hydrated.bundle.clips.length} clip(s) · ${hydrated.bundle.subtitles.length} subtitle(s)`,
          });
        }
      } catch (err) {
        addToast({
          level: 'error',
          title: 'Failed to load project file',
          message:
            err instanceof Error
              ? err.message
              : 'The selected file is not a valid .aethercut.json bundle.',
        });
      }
    },
    [addToast]
  );

  // Track updates (height resizing stays layout-only, mute/lock/solo updates record undo checkpoints)
  const handleUpdateTrack = useCallback(
    (trackId: string, updates: Partial<TimelineTrack>) => {
      if ('muted' in updates || 'locked' in updates || 'solo' in updates) {
        recordUndoCheckpoint();
      }
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, ...updates } : t)));
    },
    [recordUndoCheckpoint]
  );

  // Timeline Vertical Resizing
  const handleTimelineResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = timelineHeight;

    const handlePointerMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startY;
      const nextHeight = Math.max(140, Math.min(500, startHeight - deltaY));
      setTimelineHeight(nextHeight);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Browser Horizontal Resizing
  const handleBrowserResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = browserWidth;

    const handlePointerMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startX;
      const nextWidth = Math.max(280, Math.min(650, startWidth + deltaX));
      setBrowserWidth(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // 1-Click Sample Project Loader
  const handleLoadSampleProject = useCallback(() => {
    recordUndoCheckpoint();
    setMediaItems(INITIAL_SAMPLE_MEDIA);
    setClips([
      {
        id: 'clip-inst-1',
        mediaId: 'clip-cyberpunk',
        trackId: 'track-v1',
        trackType: 'video',
        start: 0,
        duration: 6,
        sourceStart: 0,
        name: 'Cyberpunk_City_4K.mov',
        color: '#24344d',
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: 'graph-1',
      },
      {
        id: 'clip-inst-2',
        mediaId: 'clip-greenscreen',
        trackId: 'track-v2',
        trackType: 'video',
        start: 2,
        duration: 7,
        sourceStart: 0,
        name: 'SciFi_Hologram_Key.mov',
        color: '#1e3831',
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: 'graph-greenscreen',
      },
      {
        id: 'clip-inst-3',
        mediaId: 'clip-nebula',
        trackId: 'track-v1',
        trackType: 'video',
        start: 6,
        duration: 8,
        sourceStart: 0,
        name: 'Deep_Space_Nebula.mov',
        color: '#2a2842',
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: 'graph-3',
      },
      {
        id: 'clip-inst-4',
        mediaId: 'clip-falls',
        trackId: 'track-v1',
        trackType: 'video',
        start: 14,
        duration: 6,
        sourceStart: 0,
        name: 'Emerald_Falls_Drone.mov',
        color: '#1b3842',
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: 'graph-4',
      },
      {
        id: 'clip-inst-5',
        mediaId: 'audio-cinematic-theme',
        trackId: 'track-a1',
        trackType: 'audio',
        start: 0,
        duration: 20,
        sourceStart: 0,
        name: 'Aether_Symphony_Theme.wav',
        color: '#162e24',
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: 'graph-a1',
      },
      {
        id: 'clip-inst-6',
        mediaId: 'audio-riser-whoosh',
        trackId: 'track-a2',
        trackType: 'audio',
        start: 5.5,
        duration: 4,
        sourceStart: 0,
        name: 'Cinematic_Impact_Whoosh.wav',
        color: '#382026',
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: 'graph-a2',
      },
    ]);
    setTransitions([
      {
        id: 'trans-1',
        type: 'cross_dissolve',
        trackId: 'track-v1',
        fromClipId: 'clip-inst-1',
        toClipId: 'clip-inst-3',
        cutTime: 6.0,
        duration: 1.2,
        alignment: 'center',
      },
      {
        id: 'trans-2',
        type: 'glitch',
        trackId: 'track-v1',
        fromClipId: 'clip-inst-3',
        toClipId: 'clip-inst-4',
        cutTime: 14.0,
        duration: 0.8,
        alignment: 'center',
      },
    ]);
    setSelectedClipId('clip-inst-2');
    setSelectedTransitionId('trans-1');
    setPlayhead((prev) => ({ ...prev, currentTime: 6.0, duration: 24 }));
    addToast({
      level: 'success',
      title: '4K Demo Project loaded',
      message: '6 timeline clips and 2 transitions added.',
    });
  }, [recordUndoCheckpoint, addToast]);

  // Playback Loop
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (playhead.isPlaying) {
        setPlayhead((prev) => {
          let nextTime = prev.currentTime + dt * prev.playbackRate;
          const endLimit = prev.outPoint !== null ? prev.outPoint : prev.duration;
          const startLimit = prev.inPoint !== null ? prev.inPoint : 0;

          if (nextTime >= endLimit) {
            if (prev.loop) {
              nextTime = startLimit;
            } else {
              audioEngine.stopPlayback();
              return { ...prev, currentTime: endLimit, isPlaying: false };
            }
          } else if (nextTime < startLimit) {
            nextTime = prev.loop ? endLimit : startLimit;
            if (!prev.loop) {
              audioEngine.stopPlayback();
              return { ...prev, currentTime: startLimit, isPlaying: false };
            }
          }
          return { ...prev, currentTime: nextTime };
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playhead.isPlaying]);

  // Sync Web Audio Engine
  useEffect(() => {
    audioEngine.syncTimelineAudio(
      playhead.isPlaying,
      playhead.currentTime,
      playhead.playbackRate,
      clips,
      tracks,
      mediaItems
    );
  }, [playhead.isPlaying, playhead.currentTime, playhead.playbackRate, clips, tracks, mediaItems]);

  // Frame Renderer for timestamp `t` (supports native targetWidth x targetHeight for 1080p/4K export)
  const renderFrameAtTime = useCallback(
    (t: number, targetWidth = 1280, targetHeight = 720): HTMLCanvasElement | null => {
      const w = Math.max(320, Math.round(targetWidth));
      const h = Math.max(240, Math.round(targetHeight));

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;

      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = w;
      baseCanvas.height = h;
      const baseCtx = baseCanvas.getContext('2d');
      if (!baseCtx) return offscreen;

      let inTransition = false;
      for (const tr of transitions) {
        if (tr.trackId !== 'track-v1') continue;

        const halfDuration = tr.duration / 2;
        const tStart =
          tr.alignment === 'start'
            ? tr.cutTime
            : tr.alignment === 'end'
            ? tr.cutTime - tr.duration
            : tr.cutTime - halfDuration;
        const tEnd =
          tr.alignment === 'start'
            ? tr.cutTime + tr.duration
            : tr.alignment === 'end'
            ? tr.cutTime
            : tr.cutTime + halfDuration;

        if (t >= tStart && t <= tEnd) {
          const fromClip = clips.find((c) => c.id === tr.fromClipId);
          const toClip = clips.find((c) => c.id === tr.toClipId);

          if (fromClip && toClip) {
            inTransition = true;
            const progress = (t - tStart) / tr.duration;

            const bufA = document.createElement('canvas');
            bufA.width = w;
            bufA.height = h;
            const ctxA = bufA.getContext('2d');
            if (ctxA) {
              const mediaA = mediaItems.find((m) => m.id === fromClip.mediaId);
              mediaManager.drawFrame(
                ctxA,
                mediaA,
                t - fromClip.start + fromClip.sourceStart,
                w,
                h
              );
            }

            const bufB = document.createElement('canvas');
            bufB.width = w;
            bufB.height = h;
            const ctxB = bufB.getContext('2d');
            if (ctxB) {
              const mediaB = mediaItems.find((m) => m.id === toClip.mediaId);
              mediaManager.drawFrame(
                ctxB,
                mediaB,
                t - toClip.start + toClip.sourceStart,
                w,
                h
              );
            }

            renderTransitionBlend(baseCtx, w, h, bufA, bufB, tr.type, progress);
            break;
          }
        }
      }

      if (!inTransition) {
        const activeV1Clip = clips.find(
          (c) => c.trackId === 'track-v1' && t >= c.start && t < c.start + c.duration
        );
        if (activeV1Clip) {
          const mediaItem = mediaItems.find((m) => m.id === activeV1Clip.mediaId);
          mediaManager.drawFrame(
            baseCtx,
            mediaItem,
            t - activeV1Clip.start + activeV1Clip.sourceStart,
            w,
            h
          );
        } else {
          baseCtx.fillStyle = '#0a0a0d';
          baseCtx.fillRect(0, 0, w, h);
        }
      }

      const activeV2Clip = clips.find(
        (c) => c.trackId === 'track-v2' && t >= c.start && t < c.start + c.duration
      );

      if (activeV2Clip) {
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = w;
        overlayCanvas.height = h;
        const oCtx = overlayCanvas.getContext('2d');
        if (oCtx) {
          const mediaItem = mediaItems.find((m) => m.id === activeV2Clip.mediaId);
          mediaManager.drawFrame(
            oCtx,
            mediaItem,
            t - activeV2Clip.start + activeV2Clip.sourceStart,
            w,
            h
          );
        }

        const processedOverlay = document.createElement('canvas');
        processedOverlay.width = w;
        processedOverlay.height = h;
        renderNodeGraphToCanvas(
          processedOverlay,
          nodeGraph,
          overlayCanvas,
          viewer2NodeId || undefined
        );

        ctx.drawImage(baseCanvas, 0, 0, w, h);
        ctx.drawImage(processedOverlay, 0, 0, w, h);
      } else {
        renderNodeGraphToCanvas(offscreen, nodeGraph, baseCanvas, viewer2NodeId || undefined);
      }

      // Burn-in Subtitle Cues (scaled cleanly to target resolution)
      if (subtitleStyle.enabled && subtitles.length > 0) {
        const activeCues = subtitles.filter((cue) => t >= cue.start && t <= cue.end);
        if (activeCues.length > 0) {
          const scale = h / 720;
          const textToDraw = activeCues.map((c) => c.text).join('\n');
          const fontSize = Math.round((subtitleStyle.fontSize || 28) * scale);
          const fontFamily =
            subtitleStyle.fontFamily || '"Plus Jakarta Sans", Inter, system-ui, sans-serif';
          ctx.save();
          ctx.font = `600 ${fontSize}px ${fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const maxTextWidth = w * 0.82;
          const rawLines = textToDraw.split('\n');
          const wrappedLines: string[] = [];
          for (const rawLine of rawLines) {
            const words = rawLine.split(/\s+/);
            let currentLine = '';
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
                wrappedLines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) wrappedLines.push(currentLine);
          }

          const lineHeight = fontSize * 1.32;
          const totalHeight = wrappedLines.length * lineHeight;
          const marginY = Math.round(68 * scale);
          const baseCenterY =
            subtitleStyle.position === 'top'
              ? marginY + totalHeight / 2
              : subtitleStyle.position === 'center'
              ? h / 2
              : h - marginY - totalHeight / 2;

          const hexToRgba = (hex: string, alpha: number) => {
            const clean = hex.replace('#', '');
            const full =
              clean.length === 3
                ? clean
                    .split('')
                    .map((ch) => ch + ch)
                    .join('')
                : clean.padEnd(6, '0').slice(0, 6);
            const r = parseInt(full.slice(0, 2), 16) || 10;
            const g = parseInt(full.slice(2, 4), 16) || 11;
            const b = parseInt(full.slice(4, 6), 16) || 16;
            return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
          };

          if (subtitleStyle.background === 'box' || subtitleStyle.background === 'bar') {
            let maxLineWidth = 0;
            for (const line of wrappedLines) {
              maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
            }
            const padX = Math.round(24 * scale);
            const padY = Math.round(12 * scale);
            const boxH = totalHeight + padY * 2;
            const boxY = baseCenterY - boxH / 2;

            ctx.fillStyle = hexToRgba(
              subtitleStyle.backgroundColor || '#0a0b10',
              subtitleStyle.backgroundOpacity ?? 0.82
            );

            if (subtitleStyle.background === 'bar') {
              ctx.fillRect(0, boxY, w, boxH);
            } else {
              const boxW = maxLineWidth + padX * 2;
              const boxX = w / 2 - boxW / 2;
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, Math.round(8 * scale));
              ctx.fill();
            }
          } else if (subtitleStyle.background === 'shadow') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
            ctx.shadowBlur = Math.round(12 * scale);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = Math.round(2 * scale);
          }

          ctx.fillStyle = subtitleStyle.color || '#ffffff';
          const startY = baseCenterY - ((wrappedLines.length - 1) * lineHeight) / 2;
          wrappedLines.forEach((line, idx) => {
            const ly = startY + idx * lineHeight;
            if (subtitleStyle.background === 'shadow') {
              ctx.lineWidth = Math.max(2, Math.round(4 * scale));
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
              ctx.strokeText(line, w / 2, ly);
            }
            ctx.fillText(line, w / 2, ly);
          });
          ctx.restore();
        }
      }

      return offscreen;
    },
    [clips, transitions, mediaItems, nodeGraph, viewer2NodeId, subtitles, subtitleStyle]
  );

  // Update Viewers
  useEffect(() => {
    const t = playhead.currentTime;

    const v2Canvas = viewer2CanvasRef.current;
    if (v2Canvas) {
      const v2Ctx = v2Canvas.getContext('2d');
      if (v2Ctx) {
        const frame = renderFrameAtTime(t);
        if (frame) {
          v2Ctx.clearRect(0, 0, 1280, 720);
          v2Ctx.drawImage(frame, 0, 0, 1280, 720);
        }
      }
    }

    const v1Canvas = viewer1CanvasRef.current;
    if (v1Canvas) {
      const v1Ctx = v1Canvas.getContext('2d');
      if (v1Ctx) {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = 1280;
        sourceCanvas.height = 720;
        const sCtx = sourceCanvas.getContext('2d');
        if (sCtx) {
          const activeV2 = clips.find((c) => c.trackId === 'track-v2');
          const media = activeV2 ? mediaItems.find((m) => m.id === activeV2.mediaId) : undefined;
          mediaManager.drawFrame(sCtx, media, t, 1280, 720);
        }

        renderNodeGraphToCanvas(v1Canvas, nodeGraph, sourceCanvas, viewer1NodeId || undefined);
      }
    }
  }, [
    playhead.currentTime,
    nodeGraph,
    viewer1NodeId,
    viewer2NodeId,
    renderFrameAtTime,
    clips,
    mediaItems,
  ]);

  // Playback Controls
  const togglePlay = useCallback(() => {
    setPlayhead((prev) => {
      const next = !prev.isPlaying;
      if (next) {
        audioEngine.startPlayback(prev.playbackRate);
      } else {
        audioEngine.stopPlayback();
      }
      return { ...prev, isPlaying: next };
    });
  }, []);

  const handleShuttle = useCallback((rate: number) => {
    setPlayhead((prev) => ({ ...prev, playbackRate: rate, isPlaying: true }));
    audioEngine.startPlayback(rate);
  }, []);

  const handleStopShuttle = useCallback(() => {
    setPlayhead((prev) => ({ ...prev, isPlaying: false, playbackRate: 1 }));
    audioEngine.stopPlayback();
  }, []);

  const handleSeek = useCallback((newTime: number) => {
    setPlayhead((prev) => ({
      ...prev,
      currentTime: Math.max(0, Math.min(prev.duration, newTime)),
    }));
  }, []);

  // Node graph updates (coalesced across continuous wheel/slider drags)
  const handleUpdateNodeData = useCallback(
    (nodeId: string, dataUpdates: Partial<any>) => {
      recordCoalescedCheckpoint(`node-${nodeId}-${Object.keys(dataUpdates).join(',')}`);
      setNodeGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...dataUpdates } } : n
        ),
      }));
    },
    [recordCoalescedCheckpoint]
  );

  const handleToggleNodeBypass = useCallback(
    (nodeId: string) => {
      recordUndoCheckpoint();
      setNodeGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, bypass: !n.bypass } : n)),
      }));
    },
    [recordUndoCheckpoint]
  );

  // Timeline Editing Operations
  const handleSplitClipAtPlayhead = useCallback(() => {
    const activeClip = clips.find(
      (c) => playhead.currentTime > c.start && playhead.currentTime < c.start + c.duration
    );
    if (!activeClip) {
      addToast({
        level: 'info',
        title: 'No clip under playhead',
        message: 'Position the playhead inside a clip to split it.',
      });
      return;
    }

    const track = tracks.find((t) => t.id === activeClip.trackId);
    if (track?.locked) {
      addToast({
        level: 'warning',
        title: `${track.name} is locked`,
        message: 'Unlock the track to split clips.',
      });
      return;
    }

    const cutOffset = playhead.currentTime - activeClip.start;
    if (cutOffset <= 0.1 || activeClip.duration - cutOffset <= 0.1) return;

    recordUndoCheckpoint();
    const firstClip: TimelineClip = {
      ...activeClip,
      duration: Number(cutOffset.toFixed(2)),
    };
    const secondClip: TimelineClip = {
      ...activeClip,
      id: `clip-${Date.now()}`,
      start: Number(playhead.currentTime.toFixed(2)),
      duration: Number((activeClip.duration - cutOffset).toFixed(2)),
      sourceStart: Number((activeClip.sourceStart + cutOffset).toFixed(2)),
    };

    setClips(clips.map((c) => (c.id === activeClip.id ? firstClip : c)).concat(secondClip));
    setSelectedClipId(secondClip.id);
  }, [clips, tracks, playhead.currentTime, recordUndoCheckpoint, addToast]);

  const handleDeleteSelectedClip = useCallback(() => {
    if (!selectedClipId) return;
    const targetClip = clips.find((c) => c.id === selectedClipId);
    if (!targetClip) return;

    const track = tracks.find((t) => t.id === targetClip.trackId);
    if (track?.locked) {
      addToast({
        level: 'warning',
        title: `${track.name} is locked`,
        message: 'Unlock the track before deleting clips.',
      });
      return;
    }

    recordUndoCheckpoint();
    const remaining = clips.filter((c) => c.id !== selectedClipId);

    setTransitions((prev) =>
      prev.filter((t) => t.fromClipId !== selectedClipId && t.toClipId !== selectedClipId)
    );

    if (playhead.magneticMode) {
      const v1Clips = remaining
        .filter((c) => c.trackId === 'track-v1')
        .sort((a, b) => a.start - b.start);
      let cumulative = 0;
      const realigned = v1Clips.map((c) => {
        const u = { ...c, start: cumulative };
        cumulative += c.duration;
        return u;
      });

      setClips(
        remaining.map((c) => {
          const match = realigned.find((m) => m.id === c.id);
          return match || c;
        })
      );
    } else {
      setClips(remaining);
    }
    setSelectedClipId(null);
  }, [selectedClipId, clips, tracks, playhead.magneticMode, recordUndoCheckpoint, addToast]);

  const handleDeleteSelectedTransition = useCallback(() => {
    if (!selectedTransitionId) return;
    recordUndoCheckpoint();
    setTransitions((prev) => prev.filter((t) => t.id !== selectedTransitionId));
    setSelectedTransitionId(null);
  }, [selectedTransitionId, recordUndoCheckpoint]);

  const handleAddTransitionAtCut = useCallback(
    (type: TransitionType) => {
      const v1Track = tracks.find((t) => t.id === 'track-v1');
      if (v1Track?.locked) {
        addToast({
          level: 'warning',
          title: `${v1Track.name} is locked`,
          message: 'Unlock V1 before adding transitions.',
        });
        return;
      }

      const v1Clips = clips
        .filter((c) => c.trackId === 'track-v1')
        .sort((a, b) => a.start - b.start);
      let bestCut: { from: TimelineClip; to: TimelineClip; cutTime: number } | null = null;
      let minDistance = Infinity;

      for (let i = 0; i < v1Clips.length - 1; i++) {
        const c1 = v1Clips[i];
        const c2 = v1Clips[i + 1];
        const cut = c1.start + c1.duration;
        const dist = Math.abs(playhead.currentTime - cut);

        if (dist < minDistance && dist < 4.0) {
          minDistance = dist;
          bestCut = { from: c1, to: c2, cutTime: cut };
        }
      }

      if (!bestCut && v1Clips.length >= 2) {
        bestCut = {
          from: v1Clips[0],
          to: v1Clips[1],
          cutTime: v1Clips[0].start + v1Clips[0].duration,
        };
      }

      if (!bestCut) {
        addToast({
          level: 'info',
          title: 'Two adjacent clips needed on V1',
          message: 'Place two clips back-to-back on V1 to apply a cut transition.',
        });
        return;
      }

      recordUndoCheckpoint();
      const filtered = transitions.filter((t) => Math.abs(t.cutTime - bestCut!.cutTime) > 0.2);
      const newTr: TimelineTransition = {
        id: `trans-${Date.now()}`,
        type,
        trackId: 'track-v1',
        fromClipId: bestCut.from.id,
        toClipId: bestCut.to.id,
        cutTime: bestCut.cutTime,
        duration: 1.0,
        alignment: 'center',
      };

      setTransitions([...filtered, newTr]);
      setSelectedTransitionId(newTr.id);
      setSelectedClipId(null);
      setPlayhead((p) => ({ ...p, currentTime: bestCut!.cutTime }));
    },
    [tracks, clips, transitions, playhead.currentTime, recordUndoCheckpoint, addToast]
  );

  const handleInsertClipAtPlayhead = useCallback(
    (item: MediaItem) => {
      const isVideo = item.type === 'video' || item.type === 'image';
      const targetTrackId = isVideo
        ? selectedTrackId === 'track-v2'
          ? 'track-v2'
          : 'track-v1'
        : selectedTrackId === 'track-a2'
        ? 'track-a2'
        : 'track-a1';

      const track = tracks.find((t) => t.id === targetTrackId);
      if (track?.locked) {
        addToast({
          level: 'warning',
          title: `${track.name} is locked`,
          message: 'Unlock the track or select another lane before inserting clips.',
        });
        return;
      }

      recordUndoCheckpoint();
      const insertTime = Number(playhead.currentTime.toFixed(2));
      const itemDuration = item.duration || 10;

      let updatedClips = [...clips];
      if (playhead.magneticMode && targetTrackId === 'track-v1') {
        updatedClips = updatedClips.map((c) => {
          if (c.trackId === 'track-v1' && c.start >= insertTime) {
            return { ...c, start: Number((c.start + itemDuration).toFixed(2)) };
          }
          return c;
        });
      }

      const newClip: TimelineClip = {
        id: `clip-inst-${Date.now()}`,
        mediaId: item.id,
        trackId: targetTrackId,
        trackType: isVideo ? 'video' : 'audio',
        start: insertTime,
        duration: itemDuration,
        sourceStart: 0,
        name: item.name,
        color: item.color,
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: `graph-${Date.now()}`,
      };

      setClips([...updatedClips, newClip]);
      setSelectedClipId(newClip.id);
      setSelectedTransitionId(null);
      setPlayhead((prev) => ({
        ...prev,
        duration: Math.max(prev.duration, insertTime + itemDuration + 3),
      }));
    },
    [
      selectedTrackId,
      tracks,
      playhead.currentTime,
      playhead.magneticMode,
      clips,
      recordUndoCheckpoint,
      addToast,
    ]
  );

  const handleAppendClipToTimeline = useCallback(
    (item: MediaItem) => {
      const isVideo = item.type === 'video' || item.type === 'image';
      const targetTrackId = isVideo
        ? selectedTrackId === 'track-v2'
          ? 'track-v2'
          : 'track-v1'
        : selectedTrackId === 'track-a2'
        ? 'track-a2'
        : 'track-a1';

      const track = tracks.find((t) => t.id === targetTrackId);
      if (track?.locked) {
        addToast({
          level: 'warning',
          title: `${track.name} is locked`,
          message: 'Unlock the track or select another lane before appending clips.',
        });
        return;
      }

      recordUndoCheckpoint();
      const existing = clips.filter((c) => c.trackId === targetTrackId);
      const lastEnd = existing.reduce((max, c) => Math.max(max, c.start + c.duration), 0);
      const itemDuration = item.duration || 10;

      const newClip: TimelineClip = {
        id: `clip-inst-${Date.now()}`,
        mediaId: item.id,
        trackId: targetTrackId,
        trackType: isVideo ? 'video' : 'audio',
        start: lastEnd,
        duration: itemDuration,
        sourceStart: 0,
        name: item.name,
        color: item.color,
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: `graph-${Date.now()}`,
      };

      setClips([...clips, newClip]);
      setSelectedClipId(newClip.id);
      setSelectedTransitionId(null);
      setPlayhead((prev) => ({
        ...prev,
        currentTime: lastEnd,
        duration: Math.max(prev.duration, lastEnd + itemDuration + 2),
      }));
    },
    [selectedTrackId, tracks, clips, recordUndoCheckpoint, addToast]
  );

  const handleDropMediaOnTimeline = useCallback(
    (mediaId: string, trackId: string, startTime: number) => {
      const item = mediaItems.find((m) => m.id === mediaId);
      const track = tracks.find((t) => t.id === trackId);
      if (!item || !track) return;
      if (track.locked) {
        addToast({
          level: 'warning',
          title: `${track.name} is locked`,
          message: 'Unlock the track before dropping clips.',
        });
        return;
      }

      recordUndoCheckpoint();
      const itemDuration = item.duration || 8;
      const newClip: TimelineClip = {
        id: `clip-drop-${Date.now()}`,
        mediaId: item.id,
        trackId: track.id,
        trackType: track.type,
        start: Math.max(0, Number(startTime.toFixed(2))),
        duration: itemDuration,
        sourceStart: 0,
        name: item.name,
        color: item.color,
        volume: 1,
        pan: 0,
        opacity: 1,
        speed: 1,
        nodeGraphId: `graph-${Date.now()}`,
      };

      setClips((prev) => [...prev, newClip]);
      setSelectedClipId(newClip.id);
      setSelectedTransitionId(null);
      setSelectedSubtitleId(null);
      setSelectedTrackId(track.id);
      setPlayhead((prev) => ({
        ...prev,
        duration: Math.max(prev.duration, newClip.start + itemDuration + 3),
      }));
    },
    [mediaItems, tracks, recordUndoCheckpoint, addToast]
  );

  const handleUpdateSubtitlesWithDuration = useCallback((nextCues: SubtitleCue[]) => {
    setSubtitles(nextCues);
    setHasUnsavedChanges(true);
    if (nextCues.length > 0) {
      const maxEnd = nextCues.reduce((m, c) => Math.max(m, c.end), 0);
      setPlayhead((prev) => ({ ...prev, duration: Math.max(prev.duration, Math.ceil(maxEnd + 2)) }));
    }
  }, []);

  const handleQuickImportSrt = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseSRT(text);
      if (parsed.length > 0) {
        recordUndoCheckpoint();
        handleUpdateSubtitlesWithDuration(parsed);
        setSubtitleStyle((prev) => ({ ...prev, enabled: true }));
        addToast({
          level: 'success',
          title: `Imported ${parsed.length} subtitle cue${parsed.length > 1 ? 's' : ''}`,
          message: `Loaded from ${file.name} onto S1.`,
        });
      } else {
        addToast({
          level: 'warning',
          title: 'No valid SRT cues found',
          message: `Opened SRT Editor so you can inspect or paste ${file.name}.`,
        });
        setSubtitlesModalTab('srt');
      }
    } catch (err) {
      addToast({
        level: 'error',
        title: 'Failed to read subtitle file',
        message: err instanceof Error ? err.message : 'Unable to parse .SRT text.',
      });
      setSubtitlesModalTab('srt');
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
    addToast({
      level: 'success',
      title: 'Exported .SRT captions',
      message: `${subtitles.length} subtitle cues downloaded.`,
    });
  };

  const handleAddSubtitleAtPlayhead = () => {
    recordUndoCheckpoint();
    const start = Number(playhead.currentTime.toFixed(2));
    const end = Number((start + 2.5).toFixed(2));
    const newCue: SubtitleCue = {
      id: `sub-manual-${Date.now()}`,
      index: subtitles.length + 1,
      start,
      end,
      text: 'New caption',
    };
    const next = [...subtitles, newCue]
      .sort((a, b) => a.start - b.start)
      .map((c, idx) => ({ ...c, index: idx + 1 }));
    handleUpdateSubtitlesWithDuration(next);
    setSubtitleStyle((prev) => ({ ...prev, enabled: true }));
    setSelectedSubtitleId(newCue.id);
    setSelectedClipId(null);
    setSelectedTransitionId(null);
  };

  const handleCommitVoiceoverToTimeline = (
    readySentences: VoiceoverSentence[],
    targetTrackId: 'track-a1' | 'track-a2',
    syncSubtitles: boolean,
    replaceExistingSubtitles: boolean
  ) => {
    const readyList = readySentences.filter((s) => s.status === 'ready' && s.processedBlobUrl);
    if (readyList.length === 0) return;

    const targetTrack = tracks.find((t) => t.id === targetTrackId);
    if (targetTrack?.locked) {
      addToast({
        level: 'warning',
        title: `${targetTrack.name} is locked`,
        message: 'Unlock the track or choose the other audio lane to insert voiceovers.',
      });
      return;
    }

    recordUndoCheckpoint();
    const voiceGroupId = 'vo-group-active';
    const generatedMedia: MediaItem[] = [];
    const generatedClips: TimelineClip[] = [];

    for (const s of readyList) {
      const spk = speakers.find((p) => p.id === s.speakerId) || speakers[0];
      const mediaId = s.mediaId || `vo-media-${s.id}`;
      const clipId = s.clipId || `vo-clip-${s.id}`;
      const labelSnippet = s.text.length > 28 ? `${s.text.slice(0, 28)}...` : s.text;
      const clipName = `#${s.index} ${spk?.name || 'Voice'}: ${labelSnippet}`;

      generatedMedia.push({
        id: mediaId,
        name: clipName,
        type: 'audio',
        duration: s.duration,
        fps: 24,
        resolution: { width: 0, height: 0 },
        color: spk?.color || '#30d158',
        thumbnailUrl: '',
        sourceUrl: s.processedBlobUrl!,
        tags: ['AI Voiceover', spk?.name || 'Voice'],
        waveformData: s.waveformData,
        isUploaded: true,
      });

      generatedClips.push({
        id: clipId,
        mediaId,
        trackId: targetTrackId,
        trackType: 'audio',
        start: Number(s.start.toFixed(3)),
        duration: Number(s.duration.toFixed(3)),
        sourceStart: 0,
        name: clipName,
        color: spk?.color || '#30d158',
        volume: 1.0,
        pan: 0,
        opacity: 1.0,
        speed: 1.0,
        nodeGraphId: 'graph-greenscreen',
        voiceoverGroupId: voiceGroupId,
        voiceoverSentenceId: s.id,
      });
    }

    setMediaItems((prev) => [
      ...prev.filter((m) => !m.id.startsWith('vo-media-')),
      ...generatedMedia,
    ]);

    setClips((prev) => [
      ...prev.filter((c) => c.voiceoverGroupId !== voiceGroupId),
      ...generatedClips,
    ]);

    let maxEnd = generatedClips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);

    if (syncSubtitles) {
      const syncedCues: SubtitleCue[] = readyList.map((s, idx) => ({
        id: s.subtitleId || `sub-vo-${s.id}`,
        index: idx + 1,
        start: Number(s.start.toFixed(3)),
        end: Number((s.start + s.duration).toFixed(3)),
        text: s.text,
        speakerId: s.speakerId,
        voiceoverSentenceId: s.id,
      }));

      setSubtitles((prev) => {
        const nextCues = replaceExistingSubtitles
          ? syncedCues
          : [...prev.filter((c) => !c.voiceoverSentenceId), ...syncedCues]
              .sort((a, b) => a.start - b.start)
              .map((c, idx) => ({ ...c, index: idx + 1 }));
        const subMax = nextCues.reduce((m, c) => Math.max(m, c.end), 0);
        maxEnd = Math.max(maxEnd, subMax);
        return nextCues;
      });
      setSubtitleStyle((prev) => ({ ...prev, enabled: true }));
    }

    setPlayhead((prev) => ({
      ...prev,
      duration: Math.max(prev.duration, Math.ceil(maxEnd + 2)),
    }));
    addToast({
      level: 'success',
      title: `Inserted ${generatedClips.length} voiceover clip${generatedClips.length > 1 ? 's' : ''}`,
      message: `Added to ${targetTrackId === 'track-a1' ? 'A1' : 'A2'}${syncSubtitles ? ' and synced to S1 captions' : ''}.`,
    });
  };

  // ==================== CENTRALIZED KEYBOARD SHORTCUTS ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const lowerKey = e.key.toLowerCase();

      // Modifier shortcuts first
      if (mod && lowerKey === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && lowerKey === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (mod && lowerKey === 's') {
        e.preventDefault();
        handleSaveProjectBundle();
        return;
      }
      if (mod && lowerKey === 'o') {
        e.preventDefault();
        projectOpenInputRef.current?.click();
        return;
      }
      if (mod && lowerKey === 'e') {
        e.preventDefault();
        setIsDeliverOpen(true);
        return;
      }
      if (mod && e.key === '1') {
        e.preventDefault();
        setIsBrowserOpen((prev) => !prev);
        return;
      }
      if (mod && e.key === '4') {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
        return;
      }
      if (mod && lowerKey === 'b') {
        e.preventDefault();
        handleSplitClipAtPlayhead();
        return;
      }
      if (mod && lowerKey === 't') {
        e.preventDefault();
        handleAddTransitionAtCut('cross_dissolve');
        return;
      }

      // Skip single-key shortcuts if any modifier except Shift is active
      if (mod || e.altKey) return;

      // Modal guard for single-key shortcuts (except Escape / ?)
      const anyModalOpen =
        isDeliverOpen || isShortcutsOpen || subtitlesModalTab !== null;
      if (anyModalOpen) {
        if (e.key === '?' && isShortcutsOpen) {
          e.preventDefault();
          setIsShortcutsOpen(false);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (lowerKey === 'j') {
        e.preventDefault();
        setPlayhead((prev) => {
          const nextRate =
            prev.isPlaying && prev.playbackRate < 0
              ? Math.max(-4, prev.playbackRate * 2)
              : -1;
          audioEngine.startPlayback(nextRate);
          return { ...prev, isPlaying: true, playbackRate: nextRate };
        });
      } else if (lowerKey === 'k') {
        e.preventDefault();
        handleStopShuttle();
      } else if (lowerKey === 'l') {
        e.preventDefault();
        setPlayhead((prev) => {
          const nextRate =
            prev.isPlaying && prev.playbackRate > 0
              ? Math.min(4, prev.playbackRate * 2)
              : 1;
          audioEngine.startPlayback(nextRate);
          return { ...prev, isPlaying: true, playbackRate: nextRate };
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 1.0 : 1 / 24;
        handleSeek(playhead.currentTime - delta);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 1.0 : 1 / 24;
        handleSeek(playhead.currentTime + delta);
      } else if (lowerKey === 'i') {
        e.preventDefault();
        setPlayhead((p) => ({ ...p, inPoint: p.currentTime }));
      } else if (lowerKey === 'o') {
        e.preventDefault();
        setPlayhead((p) => ({ ...p, outPoint: p.currentTime }));
      } else if (lowerKey === 'a') {
        setToolMode('select');
      } else if (lowerKey === 'b') {
        setToolMode('blade');
      } else if (lowerKey === 't') {
        setToolMode('trim');
      } else if (lowerKey === 'n') {
        setPlayhead((p) => ({ ...p, snapping: !p.snapping }));
      } else if (lowerKey === 'm') {
        if (selectedTrackId && selectedTrackId !== 'track-s1') {
          const targetTr = tracks.find((tr) => tr.id === selectedTrackId);
          if (targetTr) {
            handleUpdateTrack(selectedTrackId, { muted: !targetTr.muted });
          }
        }
      } else if (e.shiftKey && lowerKey === 'z') {
        e.preventDefault();
        setFitTrigger((c) => c + 1);
      } else if (e.shiftKey && lowerKey === 'f') {
        e.preventDefault();
        setIsTheaterMode((prev) => !prev);
      } else if (lowerKey === 's') {
        e.preventDefault();
        setIsScopesOpen((prev) => !prev);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (lowerKey === 'w') {
        if (selectedMediaId) {
          const item = mediaItems.find((m) => m.id === selectedMediaId);
          if (item) handleInsertClipAtPlayhead(item);
        }
      } else if (lowerKey === 'e') {
        if (selectedMediaId) {
          const item = mediaItems.find((m) => m.id === selectedMediaId);
          if (item) handleAppendClipToTimeline(item);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedSubtitleId) {
          recordUndoCheckpoint();
          handleUpdateSubtitlesWithDuration(
            subtitles
              .filter((s) => s.id !== selectedSubtitleId)
              .map((s, idx) => ({ ...s, index: idx + 1 }))
          );
          setSelectedSubtitleId(null);
        } else if (selectedTransitionId) {
          handleDeleteSelectedTransition();
        } else if (selectedClipId) {
          handleDeleteSelectedClip();
        }
      } else if (e.key === 'Escape') {
        if (isScopesOpen) {
          setIsScopesOpen(false);
        } else {
          setSelectedClipId(null);
          setSelectedTransitionId(null);
          setSelectedSubtitleId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleSaveProjectBundle,
    handleSplitClipAtPlayhead,
    handleAddTransitionAtCut,
    togglePlay,
    handleStopShuttle,
    handleSeek,
    playhead.currentTime,
    selectedTrackId,
    tracks,
    handleUpdateTrack,
    selectedMediaId,
    mediaItems,
    handleInsertClipAtPlayhead,
    handleAppendClipToTimeline,
    selectedSubtitleId,
    subtitles,
    handleUpdateSubtitlesWithDuration,
    selectedTransitionId,
    handleDeleteSelectedTransition,
    selectedClipId,
    handleDeleteSelectedClip,
    recordUndoCheckpoint,
    isDeliverOpen,
    isShortcutsOpen,
    subtitlesModalTab,
    isScopesOpen,
  ]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  const selectedMedia = selectedClip
    ? mediaItems.find((m) => m.id === selectedClip.mediaId) || null
    : null;
  const selectedTransition = transitions.find((t) => t.id === selectedTransitionId) || null;
  const selectedSubtitle = subtitles.find((s) => s.id === selectedSubtitleId) || null;
  const selectedNode = nodeGraph.nodes.find((n) => n.id === selectedNodeId) || null;

  // Live Monitor Telemetry Status
  const tNow = playhead.currentTime;
  const activeV1Clip = clips.find(
    (c) => c.trackId === 'track-v1' && tNow >= c.start && tNow < c.start + c.duration
  );
  const activeV2Clip = clips.find(
    (c) => c.trackId === 'track-v2' && tNow >= c.start && tNow < c.start + c.duration
  );
  const activeAudioClips = clips.filter(
    (c) => c.trackType === 'audio' && tNow >= c.start && tNow < c.start + c.duration
  );
  const activeSubCues = subtitleStyle.enabled
    ? subtitles.filter((s) => tNow >= s.start && tNow <= s.end)
    : [];
  const monitorStatus: MonitorStatusInfo = {
    activeClipName: activeV1Clip?.name || activeV2Clip?.name || null,
    activeTrackLabel: activeV1Clip ? 'V1' : activeV2Clip ? 'V2' : null,
    activeOverlayName: activeV1Clip && activeV2Clip ? activeV2Clip.name : null,
    activeAudioCount: activeAudioClips.length,
    activeSubtitleText:
      activeSubCues.length > 0 ? activeSubCues.map((c) => c.text).join(' ') : null,
    subtitlesEnabled: subtitleStyle.enabled,
    isTimelineEmpty: clips.length === 0 && subtitles.length === 0,
    isPlayheadOnGap: !activeV1Clip && !activeV2Clip,
    resolutionLabel: '1280×720',
  };

  const showLeftBrowser = isBrowserOpen && !isTheaterMode;
  const showRightInspector = isInspectorOpen && !isTheaterMode;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#111217] text-slate-200 overflow-hidden font-sans select-none">
      {/* Hidden input for Ctrl/Cmd+O shortcut */}
      <input
        ref={projectOpenInputRef}
        type="file"
        accept=".json,.aethercut.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLoadProjectFile(file);
          e.target.value = '';
        }}
      />

      {/* Workstation Header */}
      <WorkstationHeader
        workspace={workspace}
        onSelectWorkspace={setWorkspace}
        onOpenDeliver={() => setIsDeliverOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        os={os}
        playhead={playhead}
        fps={24}
        isBrowserOpen={showLeftBrowser}
        onToggleBrowser={() => setIsBrowserOpen((prev) => !prev)}
        isInspectorOpen={showRightInspector}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSaveProject={handleSaveProjectBundle}
        onLoadProjectFile={handleLoadProjectFile}
        onResetLayout={handleResetLayout}
        projectName={projectName}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 flex overflow-hidden relative">
        {(workspace === 'edit' || workspace === 'transitions') && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              {showLeftBrowser && (
                <div
                  style={{ width: `${browserWidth}px` }}
                  className="h-full flex flex-col shrink-0 border-r border-[#1f212c] z-10 overflow-hidden"
                >
                  {workspace === 'transitions' ? (
                    <TransitionsBrowser
                      onApplyTransition={handleAddTransitionAtCut}
                      selectedTransitionType={selectedTransition?.type || null}
                    />
                  ) : (
                    <MediaPool
                      mediaItems={mediaItems}
                      selectedMediaId={selectedMediaId}
                      onSelectMediaId={setSelectedMediaId}
                      onPreviewMediaItem={(item) => setSelectedMediaId(item.id)}
                      onAddMediaItem={(item) => {
                        recordUndoCheckpoint();
                        setMediaItems((prev) => [item, ...prev]);
                      }}
                      onInsertClipAtPlayhead={handleInsertClipAtPlayhead}
                      onAppendClipToTimeline={handleAppendClipToTimeline}
                      onLoadDemoMedia={handleLoadSampleProject}
                      onClose={() => setIsBrowserOpen(false)}
                      onNotify={addToast}
                    />
                  )}
                </div>
              )}

              {showLeftBrowser && (
                <div
                  onPointerDown={handleBrowserResizeStart}
                  onDoubleClick={() => setBrowserWidth(DEFAULT_WORKSPACE_LAYOUT.browserWidth)}
                  className="w-2 -mx-1 h-full cursor-col-resize z-20 group flex items-center justify-center shrink-0 hover:bg-[#0a84ff]/25 active:bg-[#0a84ff]/40 transition-colors"
                  title="Drag to resize browser width (Double-click to reset)"
                >
                  <div className="w-0.5 h-10 rounded-full bg-[#2a2e42] group-hover:bg-[#0a84ff] transition-colors" />
                </div>
              )}

              <DualViewer
                viewer1CanvasRef={viewer1CanvasRef}
                viewer2CanvasRef={viewer2CanvasRef}
                playhead={playhead}
                fps={24}
                onTogglePlay={togglePlay}
                onSeek={handleSeek}
                onShuttle={handleShuttle}
                onToggleLoop={() => setPlayhead((p) => ({ ...p, loop: !p.loop }))}
                onSetInPoint={() => setPlayhead((p) => ({ ...p, inPoint: p.currentTime }))}
                onSetOutPoint={() => setPlayhead((p) => ({ ...p, outPoint: p.currentTime }))}
                onOpenScopes={() => setIsScopesOpen(true)}
                viewer1Title={
                  nodeGraph.nodes.find((n) => n.id === viewer1NodeId)?.title || 'Viewer 1'
                }
                viewer2Title="Master Video Monitor"
                isBrowserOpen={showLeftBrowser}
                onToggleBrowser={() => setIsBrowserOpen((prev) => !prev)}
                isInspectorOpen={showRightInspector}
                onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
                isTheaterMode={isTheaterMode}
                onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
                monitorStatus={monitorStatus}
                onLoadDemoProject={handleLoadSampleProject}
                onOpenSubtitles={() => setSubtitlesModalTab('voiceover')}
              />

              {showRightInspector && (
                <div className="w-80 h-full flex flex-col shrink-0 border-l border-[#22242f] z-10">
                  <InspectorPanel
                    selectedNode={null}
                    selectedClip={selectedClip}
                    selectedTransition={selectedTransition}
                    selectedSubtitle={selectedSubtitle}
                    subtitleStyle={subtitleStyle}
                    selectedMedia={selectedMedia}
                    onUpdateNodeData={handleUpdateNodeData}
                    onUpdateClip={(clipId, updates) => {
                      recordCoalescedCheckpoint(`clip-${clipId}-${Object.keys(updates).join(',')}`);
                      setClips((prev) =>
                        prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
                      );
                    }}
                    onUpdateTransition={(transId, updates) => {
                      recordCoalescedCheckpoint(`trans-${transId}-${Object.keys(updates).join(',')}`);
                      setTransitions((prev) =>
                        prev.map((t) => (t.id === transId ? { ...t, ...updates } : t))
                      );
                    }}
                    onDeleteTransition={handleDeleteSelectedTransition}
                    onUpdateSubtitle={(subId, updates) => {
                      recordCoalescedCheckpoint(`sub-${subId}-${Object.keys(updates).join(',')}`);
                      setSubtitles((prev) =>
                        prev.map((s) => (s.id === subId ? { ...s, ...updates } : s))
                      );
                    }}
                    onUpdateSubtitleStyle={(updates) => {
                      recordCoalescedCheckpoint(`substyle-${Object.keys(updates).join(',')}`);
                      setSubtitleStyle((prev) => ({ ...prev, ...updates }));
                    }}
                    onDeleteSubtitle={(subId) => {
                      recordUndoCheckpoint();
                      setSubtitles((prev) =>
                        prev
                          .filter((s) => s.id !== subId)
                          .map((s, idx) => ({ ...s, index: idx + 1 }))
                      );
                      setSelectedSubtitleId(null);
                    }}
                    onToggleNodeBypass={handleToggleNodeBypass}
                  />
                </div>
              )}
            </div>

            <div
              onPointerDown={handleTimelineResizeStart}
              onDoubleClick={() => setTimelineHeight(DEFAULT_WORKSPACE_LAYOUT.timelineHeight)}
              className="h-2 -my-1 w-full cursor-row-resize z-30 group flex items-center justify-center shrink-0 hover:bg-[#0a84ff]/25 active:bg-[#0a84ff]/40 transition-colors bg-[#0e0f14]"
              title="Drag up or down to resize timeline height (Double-click to reset)"
            >
              <div className="w-12 h-0.5 rounded-full bg-[#2a2e42] group-hover:bg-[#0a84ff] transition-colors" />
            </div>

            <MagneticTimeline
              timelineHeight={timelineHeight}
              trackHeaderWidth={trackHeaderWidth}
              subtitleLaneHeight={subtitleLaneHeight}
              fitTrigger={fitTrigger}
              onTrackHeaderWidthChange={setTrackHeaderWidth}
              onSubtitleLaneHeightChange={setSubtitleLaneHeight}
              onBeginTransaction={handleBeginTransaction}
              onCommitTransaction={handleCommitTransaction}
              onDropMediaOnTimeline={handleDropMediaOnTimeline}
              onNotify={addToast}
              onLoadDemoProject={handleLoadSampleProject}
              tracks={tracks}
              clips={clips}
              transitions={transitions}
              mediaItems={mediaItems}
              playhead={playhead}
              selectedMediaId={selectedMediaId}
              selectedClipId={selectedClipId}
              selectedTransitionId={selectedTransitionId}
              selectedTrackId={selectedTrackId}
              toolMode={toolMode}
              fps={24}
              onSelectClip={setSelectedClipId}
              onSelectTransition={setSelectedTransitionId}
              onSelectTrack={setSelectedTrackId}
              onUpdateTrack={handleUpdateTrack}
              onUpdateClips={(next) => {
                setClips(next);
                setHasUnsavedChanges(true);
              }}
              onUpdateTransitions={(next) => {
                setTransitions(next);
                setHasUnsavedChanges(true);
              }}
              onSeek={handleSeek}
              onChangeTool={setToolMode}
              onToggleMagnetic={() =>
                setPlayhead((p) => ({ ...p, magneticMode: !p.magneticMode }))
              }
              onToggleSnapping={() => setPlayhead((p) => ({ ...p, snapping: !p.snapping }))}
              onSplitClipAtPlayhead={handleSplitClipAtPlayhead}
              onDeleteSelectedClip={handleDeleteSelectedClip}
              onDeleteSelectedTransition={handleDeleteSelectedTransition}
              onAddTransitionAtPlayhead={handleAddTransitionAtCut}
              subtitles={subtitles}
              selectedSubtitleId={selectedSubtitleId}
              subtitleStyle={subtitleStyle}
              onSelectSubtitle={setSelectedSubtitleId}
              onUpdateSubtitles={handleUpdateSubtitlesWithDuration}
              onToggleSubtitles={() => {
                recordUndoCheckpoint();
                setSubtitleStyle((prev) => ({ ...prev, enabled: !prev.enabled }));
              }}
              onOpenSubtitlesModal={(tab) => setSubtitlesModalTab(tab)}
              onQuickImportSrt={handleQuickImportSrt}
              onExportSrt={handleExportSrt}
              onAddSubtitleAtPlayhead={handleAddSubtitleAtPlayhead}
            />
          </div>
        )}

        {workspace === 'nodes' && (
          <div className="flex-1 flex h-full overflow-hidden">
            <div className="w-[45%] h-full flex flex-col border-r border-[#242738]">
              <DualViewer
                viewer1CanvasRef={viewer1CanvasRef}
                viewer2CanvasRef={viewer2CanvasRef}
                playhead={playhead}
                fps={24}
                onTogglePlay={togglePlay}
                onSeek={handleSeek}
                onShuttle={handleShuttle}
                onToggleLoop={() => setPlayhead((p) => ({ ...p, loop: !p.loop }))}
                onSetInPoint={() => setPlayhead((p) => ({ ...p, inPoint: p.currentTime }))}
                onSetOutPoint={() => setPlayhead((p) => ({ ...p, outPoint: p.currentTime }))}
                onOpenScopes={() => setIsScopesOpen(true)}
                viewer1Title={
                  nodeGraph.nodes.find((n) => n.id === viewer1NodeId)?.title || 'Node 1'
                }
                viewer2Title={
                  nodeGraph.nodes.find((n) => n.id === viewer2NodeId)?.title || 'Node 2'
                }
              />
            </div>

            <div className="flex-1 h-full relative">
              <NodeCompositor
                graph={nodeGraph}
                selectedNodeId={selectedNodeId}
                viewer1NodeId={viewer1NodeId}
                viewer2NodeId={viewer2NodeId}
                onSelectNode={setSelectedNodeId}
                onSetViewer1={setViewer1NodeId}
                onSetViewer2={setViewer2NodeId}
                onUpdateGraph={(nextGraph) => {
                  recordUndoCheckpoint();
                  setNodeGraph(nextGraph);
                }}
              />
            </div>

            <InspectorPanel
              selectedNode={selectedNode}
              selectedClip={selectedClip}
              selectedTransition={null}
              selectedMedia={selectedMedia}
              onUpdateNodeData={handleUpdateNodeData}
              onUpdateClip={(clipId, updates) => {
                recordCoalescedCheckpoint(`clip-${clipId}-${Object.keys(updates).join(',')}`);
                setClips((prev) =>
                  prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
                );
              }}
              onUpdateTransition={(transId, updates) => {
                recordCoalescedCheckpoint(`trans-${transId}-${Object.keys(updates).join(',')}`);
                setTransitions((prev) =>
                  prev.map((t) => (t.id === transId ? { ...t, ...updates } : t))
                );
              }}
              onDeleteTransition={handleDeleteSelectedTransition}
              onToggleNodeBypass={handleToggleNodeBypass}
            />
          </div>
        )}

        {workspace === 'color' && (
          <div className="flex-1 flex h-full overflow-hidden">
            <div className="w-[50%] h-full flex flex-col border-r border-[#242738]">
              <DualViewer
                viewer1CanvasRef={viewer1CanvasRef}
                viewer2CanvasRef={viewer2CanvasRef}
                playhead={playhead}
                fps={24}
                onTogglePlay={togglePlay}
                onSeek={handleSeek}
                onShuttle={handleShuttle}
                onToggleLoop={() => setPlayhead((p) => ({ ...p, loop: !p.loop }))}
                onSetInPoint={() => setPlayhead((p) => ({ ...p, inPoint: p.currentTime }))}
                onSetOutPoint={() => setPlayhead((p) => ({ ...p, outPoint: p.currentTime }))}
                onOpenScopes={() => setIsScopesOpen(true)}
                viewer1Title="Grade Input"
                viewer2Title="Color Graded Master"
              />
            </div>

            <div className="flex-1 h-full">
              <ColorGradePanel
                activeNode={nodeGraph.nodes.find((n) => n.type === 'color_grade') || null}
                onUpdateNodeData={handleUpdateNodeData}
                onOpenScopes={() => setIsScopesOpen(true)}
              />
            </div>
          </div>
        )}

        {workspace === 'audio' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="h-64 border-b border-[#242738]">
              <DualViewer
                viewer1CanvasRef={viewer1CanvasRef}
                viewer2CanvasRef={viewer2CanvasRef}
                playhead={playhead}
                fps={24}
                onTogglePlay={togglePlay}
                onSeek={handleSeek}
                onShuttle={handleShuttle}
                onToggleLoop={() => setPlayhead((p) => ({ ...p, loop: !p.loop }))}
                onSetInPoint={() => setPlayhead((p) => ({ ...p, inPoint: p.currentTime }))}
                onSetOutPoint={() => setPlayhead((p) => ({ ...p, outPoint: p.currentTime }))}
                onOpenScopes={() => setIsScopesOpen(true)}
                viewer2Title="Audio Master Monitor"
              />
            </div>

            <div className="flex-1 overflow-hidden">
              <AudioMixer
                tracks={tracks}
                clips={clips}
                onUpdateClip={(clipId, updates) => {
                  recordCoalescedCheckpoint(`mixer-clip-${clipId}-${Object.keys(updates).join(',')}`);
                  setClips((prev) =>
                    prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
                  );
                }}
                onUpdateTrack={handleUpdateTrack}
              />
            </div>
          </div>
        )}
      </main>

      <VideoScopes
        sourceCanvasRef={viewer2CanvasRef}
        isOpen={isScopesOpen}
        onClose={() => setIsScopesOpen(false)}
      />

      <DeliverModal
        isOpen={isDeliverOpen}
        onClose={() => setIsDeliverOpen(false)}
        playhead={playhead}
        clips={clips}
        tracks={tracks}
        mediaItems={mediaItems}
        subtitles={subtitles}
        subtitleStyle={subtitleStyle}
        renderFrameAtTime={renderFrameAtTime}
        onNotify={addToast}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        os={os}
        onSetOs={setOs}
      />

      <SubtitlesModal
        isOpen={subtitlesModalTab !== null}
        initialTab={subtitlesModalTab || 'srt'}
        onClose={() => setSubtitlesModalTab(null)}
        subtitles={subtitles}
        subtitleStyle={subtitleStyle}
        onUpdateSubtitles={(nextCues) => {
          recordUndoCheckpoint();
          handleUpdateSubtitlesWithDuration(nextCues);
        }}
        onUpdateSubtitleStyle={(updates) => {
          recordUndoCheckpoint();
          setSubtitleStyle((prev) => ({ ...prev, ...updates }));
        }}
        onSeek={handleSeek}
        playhead={playhead}
        mediaItems={mediaItems}
        clips={clips}
        speakers={speakers}
        onUpdateSpeakers={(nextSpeakers) => {
          recordUndoCheckpoint();
          setSpeakers(nextSpeakers);
        }}
        voiceoverSentences={voiceoverSentences}
        onUpdateVoiceoverSentences={setVoiceoverSentences}
        onCommitVoiceoverToTimeline={handleCommitVoiceoverToTimeline}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
