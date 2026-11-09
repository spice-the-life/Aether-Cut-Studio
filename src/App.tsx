import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  WorkspaceMode,
  PlatformOS,
  ToolMode,
  MediaItem,
  TimelineClip,
  TimelineTrack,
  TimelineTransition,
  TransitionType,
  NodeGraph,
  PlayheadState,
} from './types/editor';
import { INITIAL_SAMPLE_MEDIA } from './services/sampleMedia';
import { mediaManager } from './services/mediaManager';
import { renderTransitionBlend } from './engine/transitionRenderer';
import { createDefaultNodeGraph, renderNodeGraphToCanvas } from './engine/nodeRenderer';
import { audioEngine } from './engine/audioEngine';

// Components
import { WorkstationHeader } from './components/header/WorkstationHeader';
import { MediaPool } from './components/media/MediaPool';
import { TransitionsBrowser } from './components/browser/TransitionsBrowser';
import { DualViewer } from './components/viewer/DualViewer';
import { MagneticTimeline } from './components/timeline/MagneticTimeline';
import { NodeCompositor } from './components/nodes/NodeCompositor';
import { ColorGradePanel } from './components/color/ColorGradePanel';
import { AudioMixer } from './components/audio/AudioMixer';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { VideoScopes } from './components/scopes/VideoScopes';
import { DeliverModal } from './components/deliver/DeliverModal';
import { ShortcutsModal } from './components/shortcuts/ShortcutsModal';

export default function App() {
  // Active Workspace: Edit / Transitions / Nodes / Color / Audio / Deliver
  const [workspace, setWorkspace] = useState<WorkspaceMode>('edit');

  // Platform OS detection (macOS, Windows, Linux)
  const [os, setOs] = useState<PlatformOS>(() => {
    if (typeof navigator !== 'undefined') {
      const p = navigator.userAgent.toLowerCase();
      if (p.includes('mac')) return 'mac';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
    }
    return 'mac';
  });

  // Layout Panel Visibility (Default FCP layout: Left Browser + Big Hero Monitor; Inspector closed by default)
  const [isBrowserOpen, setIsBrowserOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Media Library (Initialized empty per user request)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

  // Dynamic Workspace Dimensions (Draggable Splitters)
  const [timelineHeight, setTimelineHeight] = useState(224);
  const [browserWidth, setBrowserWidth] = useState(390);

  // Timeline Tracks (Primary Magnetic Storyline V1 + Connected V2 B-Roll)
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    { id: 'track-v2', name: 'V2 (Connected B-Roll)', type: 'video', locked: false, muted: false, solo: false, height: 44 },
    { id: 'track-v1', name: 'V1 (Primary Magnetic)', type: 'video', locked: false, muted: false, solo: false, height: 44 },
    { id: 'track-a1', name: 'A1 (Master Dialogue)', type: 'audio', locked: false, muted: false, solo: false, height: 38 },
    { id: 'track-a2', name: 'A2 (Score & SFX)', type: 'audio', locked: false, muted: false, solo: false, height: 38 },
  ]);

  // Timeline Clips (Initialized clean and empty)
  const [clips, setClips] = useState<TimelineClip[]>([]);

  // Timeline Transitions (Initialized clean and empty)
  const [transitions, setTransitions] = useState<TimelineTransition[]>([]);

  // Selections
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-chroma-key');
  const [viewer1NodeId, setViewer1NodeId] = useState<string | null>('node-media-in');
  const [viewer2NodeId, setViewer2NodeId] = useState<string | null>('node-media-out');

  // Node Compositor Graph
  const [nodeGraph, setNodeGraph] = useState<NodeGraph>(() =>
    createDefaultNodeGraph('graph-greenscreen', 'SciFi Keyer & Color Grade')
  );

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

  // Timeline Vertical Resizing (Drag up/down between 140px and 500px)
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

  // Browser Horizontal Resizing (Drag left/right between 280px and 650px)
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

  // 1-Click Sample Project / Demo Footage Loader
  const handleLoadSampleProject = () => {
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
  };

  // Tools
  const [toolMode, setToolMode] = useState<ToolMode>('select');

  // Modals & Panels
  const [isScopesOpen, setIsScopesOpen] = useState(false);
  const [isDeliverOpen, setIsDeliverOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Viewer Canvases
  const viewer1CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewer2CanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard shortcut listeners for layout and clip inserting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setIsBrowserOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === '4') {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      } else if (e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsTheaterMode((prev) => !prev);
      } else if (e.key === 'w' || e.key === 'W') {
        // Final Cut Pro standard: Insert at playhead
        if (selectedMediaId) {
          const item = mediaItems.find((m) => m.id === selectedMediaId);
          if (item) handleInsertClipAtPlayhead(item);
        }
      } else if (e.key === 'e' || e.key === 'E') {
        // Final Cut Pro standard: Append to timeline end
        if (selectedMediaId) {
          const item = mediaItems.find((m) => m.id === selectedMediaId);
          if (item) handleAppendClipToTimeline(item);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMediaId, mediaItems, playhead.currentTime]);

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
          }
          return { ...prev, currentTime: nextTime };
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playhead.isPlaying]);

  // Frame Renderer for a given timestamp `t`
  const renderFrameAtTime = useCallback(
    (t: number): HTMLCanvasElement | null => {
      const offscreen = document.createElement('canvas');
      offscreen.width = 1280;
      offscreen.height = 720;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;

      // Base canvas for Track V1
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = 1280;
      baseCanvas.height = 720;
      const baseCtx = baseCanvas.getContext('2d');
      if (!baseCtx) return offscreen;

      // 1. Check if time `t` falls within an active transition on Track V1
      let inTransition = false;
      for (const tr of transitions) {
        if (tr.trackId !== 'track-v1') continue;

        const halfDuration = tr.duration / 2;
        const tStart = tr.alignment === 'start' ? tr.cutTime : tr.alignment === 'end' ? tr.cutTime - tr.duration : tr.cutTime - halfDuration;
        const tEnd = tr.alignment === 'start' ? tr.cutTime + tr.duration : tr.alignment === 'end' ? tr.cutTime : tr.cutTime + halfDuration;

        if (t >= tStart && t <= tEnd) {
          const fromClip = clips.find((c) => c.id === tr.fromClipId);
          const toClip = clips.find((c) => c.id === tr.toClipId);

          if (fromClip && toClip) {
            inTransition = true;
            const progress = (t - tStart) / tr.duration;

            // Render Buffer A (Outgoing Clip)
            const bufA = document.createElement('canvas');
            bufA.width = 1280;
            bufA.height = 720;
            const ctxA = bufA.getContext('2d');
            if (ctxA) {
              const mediaA = mediaItems.find((m) => m.id === fromClip.mediaId);
              mediaManager.drawFrame(ctxA, mediaA, t - fromClip.start + fromClip.sourceStart, 1280, 720);
            }

            // Render Buffer B (Incoming Clip)
            const bufB = document.createElement('canvas');
            bufB.width = 1280;
            bufB.height = 720;
            const ctxB = bufB.getContext('2d');
            if (ctxB) {
              const mediaB = mediaItems.find((m) => m.id === toClip.mediaId);
              mediaManager.drawFrame(ctxB, mediaB, t - toClip.start + toClip.sourceStart, 1280, 720);
            }

            // Blend through transition engine
            renderTransitionBlend(baseCtx, 1280, 720, bufA, bufB, tr.type, progress);
            break;
          }
        }
      }

      // If not in transition, draw active base clip on V1
      if (!inTransition) {
        const activeV1Clip = clips.find(
          (c) => c.trackId === 'track-v1' && t >= c.start && t < c.start + c.duration
        );
        if (activeV1Clip) {
          const mediaItem = mediaItems.find((m) => m.id === activeV1Clip.mediaId);
          mediaManager.drawFrame(baseCtx, mediaItem, t - activeV1Clip.start + activeV1Clip.sourceStart, 1280, 720);
        } else {
          baseCtx.fillStyle = '#0a0a0d';
          baseCtx.fillRect(0, 0, 1280, 720);
        }
      }

      // 2. Check for active connected overlay clip on Track V2 (e.g. Hologram green screen)
      const activeV2Clip = clips.find(
        (c) => c.trackId === 'track-v2' && t >= c.start && t < c.start + c.duration
      );

      if (activeV2Clip) {
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = 1280;
        overlayCanvas.height = 720;
        const oCtx = overlayCanvas.getContext('2d');
        if (oCtx) {
          const mediaItem = mediaItems.find((m) => m.id === activeV2Clip.mediaId);
          mediaManager.drawFrame(oCtx, mediaItem, t - activeV2Clip.start + activeV2Clip.sourceStart, 1280, 720);
        }

        // Run overlay through node graph
        const processedOverlay = document.createElement('canvas');
        processedOverlay.width = 1280;
        processedOverlay.height = 720;
        renderNodeGraphToCanvas(processedOverlay, nodeGraph, overlayCanvas, viewer2NodeId || undefined);

        // Composite over base V1 track
        ctx.drawImage(baseCanvas, 0, 0, 1280, 720);
        ctx.drawImage(processedOverlay, 0, 0, 1280, 720);
      } else {
        // Single track: run directly through node graph
        renderNodeGraphToCanvas(offscreen, nodeGraph, baseCanvas, viewer2NodeId || undefined);
        return offscreen;
      }

      return offscreen;
    },
    [clips, transitions, mediaItems, nodeGraph, viewer2NodeId]
  );

  // Update Viewers whenever playhead.currentTime, nodeGraph, or clips change
  useEffect(() => {
    const t = playhead.currentTime;

    // 1. Render Viewer 2 (Timeline Master Output)
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

    // 2. Render Viewer 1 (Specific Node Inspection)
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
  }, [playhead.currentTime, nodeGraph, viewer1NodeId, viewer2NodeId, renderFrameAtTime, clips, mediaItems]);

  // Audio Playback Controls
  const togglePlay = () => {
    const next = !playhead.isPlaying;
    setPlayhead((prev) => ({ ...prev, isPlaying: next }));
    if (next) {
      audioEngine.startPlayback(playhead.playbackRate);
    } else {
      audioEngine.stopPlayback();
    }
  };

  const handleShuttle = (rate: number) => {
    setPlayhead((prev) => ({ ...prev, playbackRate: rate, isPlaying: true }));
    audioEngine.startPlayback(rate);
  };

  const handleSeek = (newTime: number) => {
    setPlayhead((prev) => ({ ...prev, currentTime: newTime }));
  };

  // Node graph updates
  const handleUpdateNodeData = (nodeId: string, dataUpdates: Partial<any>) => {
    setNodeGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...dataUpdates } } : n)),
    }));
  };

  const handleToggleNodeBypass = (nodeId: string) => {
    setNodeGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, bypass: !n.bypass } : n)),
    }));
  };

  // Timeline operations
  const handleSplitClipAtPlayhead = () => {
    const activeClip = clips.find(
      (c) => playhead.currentTime > c.start && playhead.currentTime < c.start + c.duration
    );
    if (!activeClip) return;

    const cutOffset = playhead.currentTime - activeClip.start;
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
  };

  const handleDeleteSelectedClip = () => {
    if (!selectedClipId) return;
    const remaining = clips.filter((c) => c.id !== selectedClipId);

    setTransitions((prev) => prev.filter((t) => t.fromClipId !== selectedClipId && t.toClipId !== selectedClipId));

    if (playhead.magneticMode) {
      const v1Clips = remaining.filter((c) => c.trackId === 'track-v1').sort((a, b) => a.start - b.start);
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
  };

  const handleDeleteSelectedTransition = () => {
    if (!selectedTransitionId) return;
    setTransitions((prev) => prev.filter((t) => t.id !== selectedTransitionId));
    setSelectedTransitionId(null);
  };

  const handleAddTransitionAtCut = (type: TransitionType) => {
    const v1Clips = clips.filter((c) => c.trackId === 'track-v1').sort((a, b) => a.start - b.start);
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
      bestCut = { from: v1Clips[0], to: v1Clips[1], cutTime: v1Clips[0].start + v1Clips[0].duration };
    }

    if (bestCut) {
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
    }
  };

  // Final Cut Pro standard: Insert directly at playhead (W)
  const handleInsertClipAtPlayhead = (item: MediaItem) => {
    const isVideo = item.type === 'video' || item.type === 'image';
    const targetTrackId = isVideo ? 'track-v1' : 'track-a1';
    const insertTime = Number(playhead.currentTime.toFixed(2));
    const itemDuration = item.duration || 10;

    let updatedClips = [...clips];

    if (playhead.magneticMode && targetTrackId === 'track-v1') {
      // Ripple-shift existing clips that start at or after insert point
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
  };

  // Final Cut Pro standard: Append to timeline end (E)
  const handleAppendClipToTimeline = (item: MediaItem) => {
    const isVideo = item.type === 'video' || item.type === 'image';
    const targetTrackId = isVideo ? 'track-v1' : 'track-a1';

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
  };

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  const selectedMedia = selectedClip ? mediaItems.find((m) => m.id === selectedClip.mediaId) || null : null;
  const selectedTransition = transitions.find((t) => t.id === selectedTransitionId) || null;
  const selectedNode = nodeGraph.nodes.find((n) => n.id === selectedNodeId) || null;

  const showLeftBrowser = isBrowserOpen && !isTheaterMode;
  const showRightInspector = isInspectorOpen && !isTheaterMode;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#111217] text-slate-200 overflow-hidden font-sans select-none">
      {/* 3-Zone Apple FCP Native Header */}
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
      />

      {/* Main Workspace Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* WORKSPACE 1 & 2: TIMELINE EDIT & TRANSITIONS */}
        {(workspace === 'edit' || workspace === 'transitions') && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Upper Workstation Stage (Left Browser + Center Hero Dual Viewer + Right Inspector) */}
            <div className="flex-1 flex min-h-0 overflow-hidden relative">
              {/* Left Browser: Media Pool or Transitions Browser (Spacious dedicated FCP Event Browser) */}
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
                      onPreviewMediaItem={(item) => {
                        setSelectedMediaId(item.id);
                      }}
                      onAddMediaItem={(item) => setMediaItems((prev) => [item, ...prev])}
                      onInsertClipAtPlayhead={handleInsertClipAtPlayhead}
                      onAppendClipToTimeline={handleAppendClipToTimeline}
                      onLoadDemoMedia={handleLoadSampleProject}
                      onClose={() => setIsBrowserOpen(false)}
                    />
                  )}
                </div>
              )}

              {/* Horizontal Resizable Splitter Handle between Browser and Viewer */}
              {showLeftBrowser && (
                <div
                  onPointerDown={handleBrowserResizeStart}
                  onDoubleClick={() => setBrowserWidth(390)}
                  className="w-2 -mx-1 h-full cursor-col-resize z-20 group flex items-center justify-center shrink-0 hover:bg-[#0a84ff]/25 active:bg-[#0a84ff]/40 transition-colors"
                  title="Drag to resize browser width (Double-click to reset)"
                >
                  <div className="w-0.5 h-10 rounded-full bg-[#2a2e42] group-hover:bg-[#0a84ff] transition-colors" />
                </div>
              )}

              {/* Center Full-Width Hero Dual / Program Viewer */}
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
                viewer1Title={nodeGraph.nodes.find((n) => n.id === viewer1NodeId)?.title || 'Viewer 1'}
                viewer2Title="Master Video Monitor"
                isBrowserOpen={showLeftBrowser}
                onToggleBrowser={() => setIsBrowserOpen((prev) => !prev)}
                isInspectorOpen={showRightInspector}
                onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
                isTheaterMode={isTheaterMode}
                onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
              />

              {/* Right Context Inspector (Collapsible) */}
              {showRightInspector && (
                <div className="w-80 h-full flex flex-col shrink-0 border-l border-[#22242f] z-10">
                  <InspectorPanel
                    selectedNode={null}
                    selectedClip={selectedClip}
                    selectedTransition={selectedTransition}
                    selectedMedia={selectedMedia}
                    onUpdateNodeData={handleUpdateNodeData}
                    onUpdateClip={(clipId, updates) =>
                      setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c)))
                    }
                    onUpdateTransition={(transId, updates) =>
                      setTransitions((prev) => prev.map((t) => (t.id === transId ? { ...t, ...updates } : t)))
                    }
                    onDeleteTransition={handleDeleteSelectedTransition}
                    onToggleNodeBypass={handleToggleNodeBypass}
                  />
                </div>
              )}
            </div>

            {/* Vertical Resizable Splitter Handle between Upper Stage and Timeline */}
            <div
              onPointerDown={handleTimelineResizeStart}
              onDoubleClick={() => setTimelineHeight(224)}
              className="h-2 -my-1 w-full cursor-row-resize z-30 group flex items-center justify-center shrink-0 hover:bg-[#0a84ff]/25 active:bg-[#0a84ff]/40 transition-colors bg-[#0e0f14]"
              title="Drag up or down to resize timeline height (Double-click to reset)"
            >
              <div className="w-12 h-0.5 rounded-full bg-[#2a2e42] group-hover:bg-[#0a84ff] transition-colors" />
            </div>

            {/* Bottom Magnetic Timeline */}
            <MagneticTimeline
              timelineHeight={timelineHeight}
              onLoadDemoProject={handleLoadSampleProject}
              tracks={tracks}
              clips={clips}
              transitions={transitions}
              playhead={playhead}
              selectedClipId={selectedClipId}
              selectedTransitionId={selectedTransitionId}
              toolMode={toolMode}
              fps={24}
              onSelectClip={setSelectedClipId}
              onSelectTransition={setSelectedTransitionId}
              onUpdateClips={setClips}
              onUpdateTransitions={setTransitions}
              onSeek={handleSeek}
              onChangeTool={setToolMode}
              onToggleMagnetic={() => setPlayhead((p) => ({ ...p, magneticMode: !p.magneticMode }))}
              onToggleSnapping={() => setPlayhead((p) => ({ ...p, snapping: !p.snapping }))}
              onSplitClipAtPlayhead={handleSplitClipAtPlayhead}
              onDeleteSelectedClip={handleDeleteSelectedClip}
              onDeleteSelectedTransition={handleDeleteSelectedTransition}
              onAddTransitionAtPlayhead={handleAddTransitionAtCut}
            />
          </div>
        )}

        {/* WORKSPACE 3: NODES (Fusion / Nuke Style Compositing) */}
        {workspace === 'nodes' && (
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Left Dual Viewer */}
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
                viewer1Title={nodeGraph.nodes.find((n) => n.id === viewer1NodeId)?.title || 'Node 1'}
                viewer2Title={nodeGraph.nodes.find((n) => n.id === viewer2NodeId)?.title || 'Node 2'}
              />
            </div>

            {/* Center Node Compositor Graph */}
            <div className="flex-1 h-full relative">
              <NodeCompositor
                graph={nodeGraph}
                selectedNodeId={selectedNodeId}
                viewer1NodeId={viewer1NodeId}
                viewer2NodeId={viewer2NodeId}
                onSelectNode={setSelectedNodeId}
                onSetViewer1={setViewer1NodeId}
                onSetViewer2={setViewer2NodeId}
                onUpdateGraph={setNodeGraph}
              />
            </div>

            {/* Right Node Inspector */}
            <InspectorPanel
              selectedNode={selectedNode}
              selectedClip={selectedClip}
              selectedTransition={null}
              selectedMedia={selectedMedia}
              onUpdateNodeData={handleUpdateNodeData}
              onUpdateClip={(clipId, updates) =>
                setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c)))
              }
              onUpdateTransition={(transId, updates) =>
                setTransitions((prev) => prev.map((t) => (t.id === transId ? { ...t, ...updates } : t)))
              }
              onDeleteTransition={handleDeleteSelectedTransition}
              onToggleNodeBypass={handleToggleNodeBypass}
            />
          </div>
        )}

        {/* WORKSPACE 4: COLOR GRADING */}
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

        {/* WORKSPACE 5: FAIRLIGHT AUDIO MIXER */}
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
                onUpdateClip={(clipId, updates) =>
                  setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c)))
                }
                onUpdateTrack={(trackId, updates) =>
                  setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, ...updates } : t)))
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Video Scopes Monitor */}
      <VideoScopes
        sourceCanvasRef={viewer2CanvasRef}
        isOpen={isScopesOpen}
        onClose={() => setIsScopesOpen(false)}
      />

      {/* Deliver / Export Modal */}
      <DeliverModal
        isOpen={isDeliverOpen}
        onClose={() => setIsDeliverOpen(false)}
        playhead={playhead}
        renderFrameAtTime={renderFrameAtTime}
      />

      {/* Multi-Platform Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        os={os}
        onSetOs={setOs}
      />
    </div>
  );
}
