export type WorkspaceMode = 'edit' | 'transitions' | 'nodes' | 'color' | 'audio' | 'deliver';

export type PlatformOS = 'mac' | 'windows' | 'linux';

export type ToolMode = 'select' | 'blade' | 'trim' | 'slip' | 'zoom';

export interface Resolution {
  width: number;
  height: number;
  label: string;
}

export type TransitionType =
  | 'cross_dissolve'
  | 'dip_black'
  | 'dip_white'
  | 'wipe_left'
  | 'wipe_right'
  | 'slide_left'
  | 'glitch';

export interface TimelineTransition {
  id: string;
  type: TransitionType;
  trackId: string;
  fromClipId: string;
  toClipId: string;
  cutTime: number; // Cut boundary in timeline seconds
  duration: number; // Transition duration in seconds (e.g. 1.0s)
  alignment: 'center' | 'start' | 'end';
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  duration: number; // in seconds
  fps: number;
  resolution: { width: number; height: number };
  color: string;
  thumbnailUrl: string;
  sourceUrl: string; // Blob or sample generator
  tags: string[];
  waveformData?: number[];
  videoElement?: HTMLVideoElement;
  imageElement?: HTMLImageElement;
  isUploaded?: boolean;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackId: string;
  trackType: 'video' | 'audio';
  start: number; // timeline start in seconds
  duration: number; // in seconds
  sourceStart: number; // in-point in seconds
  name: string;
  color: string;
  volume: number; // 0 to 2
  pan: number; // -1 to +1
  opacity: number; // 0 to 1
  speed: number;
  muted?: boolean;
  locked?: boolean;
  nodeGraphId: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio';
  locked: boolean;
  muted: boolean;
  solo: boolean;
  height: number;
}

// Node Compositing Graph System
export type NodeType =
  | 'media_in'
  | 'color_grade'
  | 'transform'
  | 'blur'
  | 'glow'
  | 'chroma_key'
  | 'text_title'
  | 'vignette'
  | 'mask'
  | 'merge_blend'
  | 'media_out';

export interface NodePort {
  id: string;
  name: string;
  type: 'image' | 'mask';
  direction: 'input' | 'output';
}

export interface NodeData {
  // Transform
  posX?: number;
  posY?: number;
  scale?: number;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;

  // Color Grade
  liftR?: number;
  liftG?: number;
  liftB?: number;
  liftMaster?: number;
  gammaR?: number;
  gammaG?: number;
  gammaB?: number;
  gammaMaster?: number;
  gainR?: number;
  gainG?: number;
  gainB?: number;
  gainMaster?: number;
  exposure?: number; // -3 to +3
  contrast?: number; // 0 to 2
  saturation?: number; // 0 to 2
  temperature?: number; // -100 to +100
  tint?: number; // -100 to +100

  // Blur & Glow
  blurRadius?: number; // 0 to 40
  glowIntensity?: number; // 0 to 2
  glowThreshold?: number; // 0 to 1

  // Chroma Keyer
  keyColor?: string; // hex '#00ff00'
  tolerance?: number; // 0.1 to 0.8
  softness?: number; // 0 to 0.5
  despill?: number; // 0 to 1

  // Text Title
  text?: string;
  fontSize?: number;
  textColor?: string;
  fontFamily?: string;
  textShadow?: boolean;

  // Vignette
  vignetteAmount?: number; // 0 to 1
  vignetteFeather?: number; // 0 to 1

  // Mask
  maskShape?: 'ellipse' | 'rect';
  maskRadiusX?: number;
  maskRadiusY?: number;
  maskFeather?: number;
  maskInvert?: boolean;

  // Merge / Blend
  blendMode?: 'over' | 'screen' | 'multiply' | 'add' | 'overlay' | 'lighten' | 'darken';
  blendMix?: number; // 0 to 1
}

export interface CompositorNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  inputs: NodePort[];
  outputs: NodePort[];
  bypass: boolean;
  data: NodeData;
  isViewer1?: boolean;
  isViewer2?: boolean;
}

export interface NodeConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface NodeGraph {
  id: string;
  name: string;
  nodes: CompositorNode[];
  connections: NodeConnection[];
}

export interface PlayheadState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  loop: boolean;
  inPoint: number | null;
  outPoint: number | null;
  snapping: boolean;
  magneticMode: boolean;
}

export interface ProjectSettings {
  name: string;
  resolution: Resolution;
  fps: number;
  audioSampleRate: number;
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
