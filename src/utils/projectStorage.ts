import {
  MediaItem,
  NodeGraph,
  PlayheadState,
  ProjectBundle,
  SerializedMediaItem,
  SpeakerProfile,
  SubtitleCue,
  SubtitleStyle,
  TimelineClip,
  TimelineTrack,
  TimelineTransition,
  VoiceoverSentence,
  WorkspaceLayoutSettings,
} from '../types/editor';
import { mediaManager } from '../services/mediaManager';

const LAYOUT_STORAGE_KEY = 'aethercut_workspace_layout_v1';
const IDB_NAME = 'aethercut_studio_db';
const IDB_VERSION = 1;
const IDB_STORE = 'projects';
const IDB_AUTOSAVE_KEY = 'autosave_latest';
const MAX_EMBED_BYTES = 15 * 1024 * 1024; // 15 MB per uploaded media item

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutSettings = {
  browserWidth: 390,
  timelineHeight: 224,
  trackHeaderWidth: 240,
  subtitleLaneHeight: 44,
  trackHeights: {
    'track-v2': 44,
    'track-v1': 44,
    'track-a1': 38,
    'track-a2': 38,
  },
  isBrowserOpen: true,
  isInspectorOpen: false,
};

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function loadWorkspaceLayout(): WorkspaceLayoutSettings {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WORKSPACE_LAYOUT, trackHeights: { ...DEFAULT_WORKSPACE_LAYOUT.trackHeights } };
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayoutSettings>;
    const trackHeights: Record<string, number> = { ...DEFAULT_WORKSPACE_LAYOUT.trackHeights };
    if (parsed.trackHeights && typeof parsed.trackHeights === 'object') {
      for (const [k, v] of Object.entries(parsed.trackHeights)) {
        trackHeights[k] = clampNumber(v, 32, 120, trackHeights[k] ?? 44);
      }
    }
    return {
      browserWidth: clampNumber(parsed.browserWidth, 280, 650, DEFAULT_WORKSPACE_LAYOUT.browserWidth),
      timelineHeight: clampNumber(parsed.timelineHeight, 140, 500, DEFAULT_WORKSPACE_LAYOUT.timelineHeight),
      trackHeaderWidth: clampNumber(parsed.trackHeaderWidth, 170, 440, DEFAULT_WORKSPACE_LAYOUT.trackHeaderWidth),
      subtitleLaneHeight: clampNumber(parsed.subtitleLaneHeight, 32, 120, DEFAULT_WORKSPACE_LAYOUT.subtitleLaneHeight),
      trackHeights,
      isBrowserOpen: typeof parsed.isBrowserOpen === 'boolean' ? parsed.isBrowserOpen : DEFAULT_WORKSPACE_LAYOUT.isBrowserOpen,
      isInspectorOpen: typeof parsed.isInspectorOpen === 'boolean' ? parsed.isInspectorOpen : DEFAULT_WORKSPACE_LAYOUT.isInspectorOpen,
    };
  } catch {
    return { ...DEFAULT_WORKSPACE_LAYOUT, trackHeights: { ...DEFAULT_WORKSPACE_LAYOUT.trackHeights } };
  }
}

export function saveWorkspaceLayout(settings: WorkspaceLayoutSettings): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(settings));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unable to persist workspace layout' };
  }
}

export function resetWorkspaceLayout(): WorkspaceLayoutSettings {
  try {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_WORKSPACE_LAYOUT, trackHeights: { ...DEFAULT_WORKSPACE_LAYOUT.trackHeights } };
}

async function blobUrlToDataUrl(url: string): Promise<{ dataUrl?: string; skippedLargeFile?: boolean }> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    if (blob.size > MAX_EMBED_BYTES) {
      return { skippedLargeFile: true };
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed reading media blob'));
      reader.readAsDataURL(blob);
    });
    return { dataUrl };
  } catch {
    return {};
  }
}

export interface SerializeBundleParams {
  projectName: string;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  transitions: TimelineTransition[];
  subtitles: SubtitleCue[];
  subtitleStyle: SubtitleStyle;
  speakers: SpeakerProfile[];
  voiceoverSentences?: VoiceoverSentence[];
  nodeGraph: NodeGraph;
  playhead: PlayheadState;
  mediaItems: MediaItem[];
}

export async function serializeProjectBundle(
  params: SerializeBundleParams
): Promise<{ bundle: ProjectBundle; skippedLargeMediaNames: string[] }> {
  const skippedLargeMediaNames: string[] = [];

  const serializedMedia: SerializedMediaItem[] = await Promise.all(
    params.mediaItems.map(async (item) => {
      let embeddedDataUrl: string | undefined;
      if (item.sourceUrl && item.sourceUrl.startsWith('blob:')) {
        const res = await blobUrlToDataUrl(item.sourceUrl);
        if (res.dataUrl) {
          embeddedDataUrl = res.dataUrl;
        } else if (res.skippedLargeFile) {
          skippedLargeMediaNames.push(item.name);
        }
      } else if (item.sourceUrl && item.sourceUrl.startsWith('data:')) {
        embeddedDataUrl = item.sourceUrl;
      }

      return {
        id: item.id,
        name: item.name,
        type: item.type,
        duration: item.duration,
        fps: item.fps,
        resolution: item.resolution,
        color: item.color,
        thumbnailUrl: item.thumbnailUrl,
        sourceUrl: item.sourceUrl.startsWith('blob:') ? '' : item.sourceUrl,
        tags: item.tags,
        waveformData: item.waveformData,
        isUploaded: item.isUploaded,
        embeddedDataUrl,
      };
    })
  );

  const embeddedMediaIds = new Set(
    serializedMedia.filter((m) => Boolean(m.embeddedDataUrl)).map((m) => m.id)
  );

  const serializedVoiceovers: VoiceoverSentence[] | undefined =
    params.voiceoverSentences && params.voiceoverSentences.length > 0
      ? params.voiceoverSentences.map((s) => ({
          ...s,
          processedBlobUrl: undefined,
          rawAudioBase64:
            s.mediaId && embeddedMediaIds.has(s.mediaId) ? undefined : s.rawAudioBase64,
        }))
      : undefined;

  const bundle: ProjectBundle = {
    schemaVersion: 1,
    projectName: params.projectName || 'Project 1',
    savedAt: new Date().toISOString(),
    tracks: params.tracks,
    clips: params.clips,
    transitions: params.transitions,
    subtitles: params.subtitles,
    subtitleStyle: params.subtitleStyle,
    speakers: params.speakers,
    voiceoverSentences: serializedVoiceovers,
    nodeGraph: params.nodeGraph,
    playhead: { ...params.playhead, isPlaying: false },
    mediaItems: serializedMedia,
  };

  return { bundle, skippedLargeMediaNames };
}

export interface HydratedProjectResult {
  bundle: ProjectBundle;
  mediaItems: MediaItem[];
  unlinkedMediaNames: string[];
}

export function validateProjectBundle(raw: unknown): ProjectBundle {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Project file is not a valid JSON object.');
  }
  const obj = raw as Partial<ProjectBundle>;
  if (obj.schemaVersion !== 1) {
    throw new Error(`Unsupported project schema version (${String(obj.schemaVersion ?? 'unknown')}).`);
  }
  if (!Array.isArray(obj.tracks) || !Array.isArray(obj.clips) || !Array.isArray(obj.subtitles)) {
    throw new Error('Project file is missing required timeline tracks, clips, or subtitles.');
  }
  if (!obj.nodeGraph || !Array.isArray(obj.nodeGraph.nodes) || !Array.isArray(obj.nodeGraph.connections)) {
    throw new Error('Project file has an invalid compositor node graph.');
  }
  if (!obj.playhead || typeof obj.playhead.currentTime !== 'number') {
    throw new Error('Project file is missing valid playhead state.');
  }

  return {
    schemaVersion: 1,
    projectName: typeof obj.projectName === 'string' && obj.projectName.trim() ? obj.projectName : 'Project 1',
    savedAt: typeof obj.savedAt === 'string' ? obj.savedAt : new Date().toISOString(),
    tracks: obj.tracks,
    clips: obj.clips,
    transitions: Array.isArray(obj.transitions) ? obj.transitions : [],
    subtitles: obj.subtitles,
    subtitleStyle: obj.subtitleStyle || {
      enabled: true,
      fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
      fontSize: 28,
      position: 'bottom',
      background: 'box',
      backgroundColor: '#0a0b10',
      backgroundOpacity: 0.82,
      color: '#ffffff',
    },
    speakers: Array.isArray(obj.speakers) ? obj.speakers : [],
    voiceoverSentences: Array.isArray(obj.voiceoverSentences) ? obj.voiceoverSentences : undefined,
    nodeGraph: obj.nodeGraph,
    playhead: { ...obj.playhead, isPlaying: false },
    mediaItems: Array.isArray(obj.mediaItems) ? obj.mediaItems : [],
  };
}

export async function deserializeAndHydrateProjectBundle(
  raw: unknown
): Promise<HydratedProjectResult> {
  const bundle = validateProjectBundle(raw);
  const unlinkedMediaNames: string[] = [];

  const mediaItems: MediaItem[] = await Promise.all(
    bundle.mediaItems.map(async (item) => {
      if (item.embeddedDataUrl) {
        try {
          const res = await fetch(item.embeddedDataUrl);
          const blob = await res.blob();
          const mimeType =
            blob.type ||
            (item.type === 'video'
              ? 'video/mp4'
              : item.type === 'image'
              ? 'image/png'
              : 'audio/wav');
          const file = new File([blob], item.name, { type: mimeType });
          const registered = await mediaManager.registerUploadedFile(file, item.id);
          return {
            id: item.id,
            name: item.name,
            type: item.type,
            duration: item.duration || registered.duration || 10,
            fps: item.fps || 24,
            resolution: registered.resolution || item.resolution || { width: 1920, height: 1080 },
            color: item.color || '#24344d',
            thumbnailUrl: item.thumbnailUrl || registered.thumbnailUrl || '',
            sourceUrl: registered.sourceUrl || '',
            tags: item.tags || [],
            waveformData: item.waveformData,
            videoElement: registered.videoElement,
            imageElement: registered.imageElement,
            isUploaded: item.isUploaded ?? true,
          };
        } catch {
          unlinkedMediaNames.push(item.name);
        }
      } else if (item.isUploaded && !item.sourceUrl) {
        unlinkedMediaNames.push(item.name);
      }

      return {
        id: item.id,
        name: item.name,
        type: item.type,
        duration: item.duration,
        fps: item.fps || 24,
        resolution: item.resolution || { width: 1920, height: 1080 },
        color: item.color || '#24344d',
        thumbnailUrl: item.thumbnailUrl || '',
        sourceUrl: item.sourceUrl || '',
        tags: item.tags || [],
        waveformData: item.waveformData,
        isUploaded: item.isUploaded,
      };
    })
  );

  const mediaById = new Map(mediaItems.map((m) => [m.id, m]));
  if (Array.isArray(bundle.voiceoverSentences) && bundle.voiceoverSentences.length > 0) {
    bundle.voiceoverSentences = await Promise.all(
      bundle.voiceoverSentences.map(async (s) => {
        const linkedMedia = s.mediaId ? mediaById.get(s.mediaId) : undefined;
        if (linkedMedia?.sourceUrl) {
          return {
            ...s,
            processedBlobUrl: linkedMedia.sourceUrl,
            waveformData: s.waveformData || linkedMedia.waveformData,
            status: 'ready' as const,
          };
        }
        if (s.rawAudioBase64) {
          try {
            const clean = s.rawAudioBase64.includes(',')
              ? s.rawAudioBase64.split(',')[1]
              : s.rawAudioBase64;
            const bin = atob(clean);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            const blobUrl = URL.createObjectURL(new Blob([arr], { type: 'audio/wav' }));
            return { ...s, processedBlobUrl: blobUrl, status: 'ready' as const };
          } catch {
            // fallback cleanly
          }
        }
        return {
          ...s,
          processedBlobUrl: undefined,
          status: s.status === 'generating' ? 'idle' : s.status,
        };
      })
    );
  }

  return { bundle, mediaItems, unlinkedMediaNames };
}

function openProjectDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser context.'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed opening project database.'));
  });
}

export async function saveProjectAutosave(
  bundle: ProjectBundle
): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await openProjectDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(bundle, IDB_AUTOSAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed.'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
    });
    db.close();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to write local project autosave.',
    };
  }
}

export async function loadProjectAutosave(): Promise<ProjectBundle | null> {
  try {
    const db = await openProjectDb();
    const record = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_AUTOSAVE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error || new Error('Failed reading autosave.'));
    });
    db.close();
    if (!record) return null;
    return validateProjectBundle(record);
  } catch {
    return null;
  }
}

export async function clearProjectAutosave(): Promise<void> {
  try {
    const db = await openProjectDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(IDB_AUTOSAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed clearing autosave.'));
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}
