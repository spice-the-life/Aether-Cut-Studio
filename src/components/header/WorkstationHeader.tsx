import React, { useRef } from 'react';
import { WorkspaceMode, PlatformOS, PlayheadState, formatTimecode } from '../../types/editor';
import {
  Share2,
  Sparkles,
  PanelLeft,
  PanelRight,
  ArrowDownToLine,
  Keyboard,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';

interface WorkstationHeaderProps {
  workspace: WorkspaceMode;
  onSelectWorkspace: (ws: WorkspaceMode) => void;
  onOpenDeliver: () => void;
  onOpenShortcuts: () => void;
  os: PlatformOS;
  playhead?: PlayheadState;
  fps?: number;
  isBrowserOpen?: boolean;
  onToggleBrowser?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSaveProject?: () => void;
  onLoadProjectFile?: (file: File) => void;
  onResetLayout?: () => void;
  projectName?: string;
  hasUnsavedChanges?: boolean;
  lastSavedAt?: string | null;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  workspace,
  onSelectWorkspace,
  onOpenDeliver,
  onOpenShortcuts,
  os,
  playhead = {
    currentTime: 0,
    duration: 30,
    isPlaying: false,
    playbackRate: 1,
    loop: true,
    inPoint: null,
    outPoint: null,
    snapping: true,
    magneticMode: true,
  },
  fps = 24,
  isBrowserOpen = true,
  onToggleBrowser,
  isInspectorOpen = false,
  onToggleInspector,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSaveProject,
  onLoadProjectFile,
  onResetLayout,
  projectName = 'Project 1',
  hasUnsavedChanges = false,
  lastSavedAt = null,
}) => {
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const mod = os === 'mac' ? '⌘' : 'Ctrl+';

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-1.5 border-b border-[#21232d] bg-[#14151b] select-none shrink-0 z-30 h-11">
      {/* Zone 1: Window Controls, Panel Toggles, History, Project Save/Load & Wordmark */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* macOS Window Controls */}
        <div className="hidden sm:flex items-center gap-1.5 pr-2 border-r border-[#242735]" aria-hidden="true">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
        </div>

        {/* Browser Toggle Button */}
        {onToggleBrowser && (
          <button
            type="button"
            onClick={onToggleBrowser}
            aria-pressed={isBrowserOpen}
            aria-label={`Toggle Event Browser (${mod}1)`}
            className={`p-1.5 rounded-md border transition-colors ${
              isBrowserOpen
                ? 'bg-[#1e2230] border-[#2e3448] text-[#0a84ff]'
                : 'border-[#242634] bg-[#161720] text-slate-400 hover:text-white'
            }`}
            title={`Toggle Event Browser (${mod}1)`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Undo / Redo History Controls */}
        <div
          role="group"
          aria-label="History controls"
          className="flex items-center gap-0.5 bg-[#101117] p-0.5 rounded-md border border-[#232533]"
        >
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={`Undo (${mod}Z)`}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#1d202d] disabled:opacity-35 disabled:pointer-events-none transition-colors"
            title={`Undo (${mod}Z)`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label={`Redo (${mod}Shift+Z)`}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#1d202d] disabled:opacity-35 disabled:pointer-events-none transition-colors"
            title={`Redo (${mod}Shift+Z)`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Project Import / Save / Open Controls */}
        <div
          role="group"
          aria-label="Project and media controls"
          className="flex items-center gap-0.5 bg-[#101117] p-0.5 rounded-md border border-[#232533]"
        >
          <button
            type="button"
            onClick={() => {
              const fileInput = document.querySelector('input[data-media-upload="true"]') as HTMLInputElement | null;
              if (fileInput) fileInput.click();
            }}
            aria-label="Import Media"
            className="p-1 hover:bg-[#1d202d] rounded text-slate-300 hover:text-white transition-colors"
            title="Import Media"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-blue-400" />
          </button>

          {onSaveProject && (
            <button
              type="button"
              onClick={onSaveProject}
              aria-label={`Save Project (${mod}S)`}
              className="p-1 hover:bg-[#1d202d] rounded text-slate-300 hover:text-white transition-colors relative"
              title={`Save Project Bundle (${mod}S)`}
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}

          {onLoadProjectFile && (
            <>
              <input
                ref={projectFileInputRef}
                type="file"
                accept=".json,.aethercut.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onLoadProjectFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => projectFileInputRef.current?.click()}
                aria-label={`Open Project (${mod}O)`}
                className="p-1 hover:bg-[#1d202d] rounded text-slate-300 hover:text-white transition-colors"
                title={`Open Project Bundle (${mod}O)`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
              </button>
            </>
          )}

          {onResetLayout && (
            <button
              type="button"
              onClick={onResetLayout}
              aria-label="Reset Workspace Layout"
              className="hidden xl:inline-flex p-1 hover:bg-[#1d202d] rounded text-slate-400 hover:text-white transition-colors"
              title="Reset Workspace Panel Sizes"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* AetherCut Studio Wordmark */}
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-100 tracking-tight font-sans whitespace-nowrap">
            AetherCut Studio
          </span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider whitespace-nowrap">
            v1.3 · {os === 'mac' ? 'Pro' : os.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Zone 2: Central LCD Timecode & Project Save Status Cockpit */}
      <div className="flex items-center justify-center shrink-0">
        <div className="flex items-center gap-3 px-3 py-0.5 rounded-lg bg-[#0a0b10] border border-[#222533] shadow-inner">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 font-sans whitespace-nowrap">
              <span className="text-slate-300 font-bold">{projectName}</span>
              <span aria-hidden="true">·</span>
              <span>1080p24 ProRes</span>
              <span aria-hidden="true">·</span>
              <span className={hasUnsavedChanges ? 'text-amber-300' : 'text-emerald-400'}>
                {hasUnsavedChanges ? 'Unsaved' : lastSavedAt ? 'Saved' : 'Ready'}
              </span>
            </div>

            <div className="font-mono text-sm font-bold tracking-widest text-slate-100 tabular-nums">
              {formatTimecode(playhead.currentTime, fps)}
            </div>
          </div>

          <div className="h-5 w-px bg-[#1f2230]" />

          <div className="text-[10px] font-mono text-slate-400 tabular-nums text-right whitespace-nowrap">
            {playhead.outPoint !== null && playhead.inPoint !== null
              ? `${(playhead.outPoint - playhead.inPoint).toFixed(2)}s`
              : `${playhead.duration.toFixed(0)}s TOTAL`}
          </div>
        </div>
      </div>

      {/* Zone 3: Workspace Switchers, Inspector, Shortcuts & Share */}
      <div className="flex items-center gap-2 shrink-0">
        <nav
          role="tablist"
          aria-label="Workspaces"
          className="hidden xl:flex items-center bg-[#0d0e14] p-0.5 rounded-md border border-[#222430]"
        >
          {(
            [
              { id: 'edit', label: 'Edit' },
              { id: 'transitions', label: 'Transitions', icon: true },
              { id: 'nodes', label: 'Nodes' },
              { id: 'color', label: 'Color' },
              { id: 'audio', label: 'Audio' },
            ] as const
          ).map((tab) => {
            const active = workspace === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectWorkspace(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                  active
                    ? tab.id === 'transitions'
                      ? 'bg-[#222534] text-amber-300 shadow-xs'
                      : 'bg-[#222534] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#171923]'
                }`}
              >
                {'icon' in tab && tab.icon && <Sparkles className="w-3 h-3 text-amber-400" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 bg-[#101117] p-0.5 rounded-md border border-[#222533]">
          {onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              aria-pressed={isInspectorOpen}
              aria-label={`Toggle Inspector (${mod}4)`}
              className={`p-1.5 rounded transition-colors ${
                isInspectorOpen
                  ? 'bg-[#1e2230] text-[#0a84ff]'
                  : 'text-slate-400 hover:text-white hover:bg-[#1a1c26]'
              }`}
              title={`Toggle Inspector (${mod}4)`}
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Keyboard Shortcuts (?)"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a1c26] rounded transition-colors"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenDeliver}
          aria-label={`Share and Export Movie (${mod}E)`}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] rounded-md shadow-sm shadow-blue-500/25 transition-colors whitespace-nowrap"
          title={`Share / Export Movie (${mod}E)`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
};
