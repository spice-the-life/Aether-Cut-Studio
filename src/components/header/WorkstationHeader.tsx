import React from 'react';
import { WorkspaceMode, PlatformOS, PlayheadState, formatTimecode } from '../../types/editor';
import {
  Download,
  Share2,
  Sparkles,
  PanelLeft,
  PanelRight,
  ArrowDownToLine,
  Tag,
  Star,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Cpu,
  Monitor,
  Volume2,
  Sliders,
  Palette,
  Keyboard,
  FolderArchive,
  Zap,
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
  onOpenDesktopRelease?: () => void;
  onOpenInstallers?: () => void;
  onOpenInstantInstall?: () => void;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  workspace,
  onSelectWorkspace,
  onOpenDeliver,
  onOpenShortcuts,
  os,
  playhead = { currentTime: 0, duration: 30, isPlaying: false, playbackRate: 1, loop: true, inPoint: null, outPoint: null, snapping: true, magneticMode: true },
  fps = 24,
  isBrowserOpen = true,
  onToggleBrowser,
  isInspectorOpen = false,
  onToggleInspector,
  onOpenDesktopRelease,
  onOpenInstallers,
  onOpenInstantInstall,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-1.5 border-b border-[#21232d] bg-[#14151b] select-none shrink-0 z-30 h-11">
      {/* Zone 1: macOS Traffic Lights & Apple FCP Toolbar Action Icons */}
      <div className="flex items-center gap-3">
        {/* macOS Window Controls */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-[#242735]">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer hover:opacity-85 shadow-xs" title="Close" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-pointer hover:opacity-85 shadow-xs" title="Minimize" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-pointer hover:opacity-85 shadow-xs" title="Zoom / Fullscreen" />
        </div>

        {/* Browser Toggle Button (FCP Sidebar Icon) */}
        {onToggleBrowser && (
          <button
            onClick={onToggleBrowser}
            className={`p-1.5 rounded-md border transition-colors ${
              isBrowserOpen
                ? 'bg-[#1e2230] border-[#2e3448] text-[#0a84ff]'
                : 'border-[#242634] bg-[#161720] text-slate-400 hover:text-white'
            }`}
            title="Toggle Event Browser (⌘1)"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* FCP Quick Action Icons */}
        <div className="hidden lg:flex items-center gap-1 bg-[#101117] p-0.5 rounded-md border border-[#232533]">
          <button
            onClick={() => {
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) fileInput.click();
            }}
            className="p-1 hover:bg-[#1d202d] rounded text-slate-300 hover:text-white transition-colors"
            title="Import Media (⌘I)"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-blue-400" />
          </button>
          <button
            className="p-1 hover:bg-[#1d202d] rounded text-slate-400 hover:text-white transition-colors"
            title="Keyword Collections (⌘K)"
          >
            <Tag className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            className="p-1 hover:bg-[#1d202d] rounded text-slate-400 hover:text-amber-400 transition-colors"
            title="Favorite Clip Range (F)"
          >
            <Star className="w-3.5 h-3.5 text-amber-400/80" />
          </button>
        </div>

        {/* AetherCut Studio Wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-100 tracking-tight font-sans whitespace-nowrap">
            AetherCut Studio
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            {os === 'mac' ? 'Pro' : `${os.toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* Zone 2: ICONIC CENTRAL FCP ROUNDED LCD TIMECODE COCKPIT */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 px-3 py-0.5 rounded-lg bg-[#0a0b10] border border-[#222533] shadow-inner">
          {/* Background Render Progress Meter (FCP Signature Pie Wheel) */}
          <div className="flex items-center gap-1.5" title="Background Render Status: 100% Ready">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-[#0a84ff] flex items-center justify-center animate-spin-slow">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0a84ff]" />
            </div>
          </div>

          {/* Project Title & Status */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 font-sans">
              <span className="text-slate-300 font-bold">Project 1</span>
              <span>·</span>
              <span>1080p24 ProRes</span>
            </div>

            {/* Big High-Precision LCD Timecode */}
            <div className="font-mono text-sm font-bold tracking-widest text-slate-100 tabular-nums">
              {formatTimecode(playhead.currentTime, fps)}
            </div>
          </div>

          <div className="h-5 w-px bg-[#1f2230]" />

          {/* In / Out Mark Duration Summary */}
          <div className="text-[10px] font-mono text-slate-400 tabular-nums text-right">
            {playhead.outPoint !== null && playhead.inPoint !== null
              ? `${(playhead.outPoint - playhead.inPoint).toFixed(2)}s`
              : `${playhead.duration.toFixed(0)}s TOTAL`}
          </div>
        </div>
      </div>

      {/* Zone 3: Workspace Switchers, FCP Panel Toggles & Share */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Workspace Switcher Segmented Tabs */}
        <nav className="hidden xl:flex items-center bg-[#0d0e14] p-0.5 rounded-md border border-[#222430]">
          <button
            onClick={() => onSelectWorkspace('edit')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              workspace === 'edit'
                ? 'bg-[#222534] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#171923]'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => onSelectWorkspace('transitions')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              workspace === 'transitions'
                ? 'bg-[#222534] text-amber-300 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#171923]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Transitions</span>
          </button>
          <button
            onClick={() => onSelectWorkspace('nodes')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              workspace === 'nodes'
                ? 'bg-[#222534] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#171923]'
            }`}
          >
            Nodes
          </button>
          <button
            onClick={() => onSelectWorkspace('color')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              workspace === 'color'
                ? 'bg-[#222534] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#171923]'
            }`}
          >
            Color
          </button>
          <button
            onClick={() => onSelectWorkspace('audio')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              workspace === 'audio'
                ? 'bg-[#222534] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#171923]'
            }`}
          >
            Audio
          </button>
        </nav>

        {/* FCP 3-Pane Toggle Buttons */}
        <div className="flex items-center gap-1 bg-[#101117] p-0.5 rounded-md border border-[#222533]">
          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`p-1.5 rounded transition-colors ${
                isInspectorOpen
                  ? 'bg-[#1e2230] text-[#0a84ff]'
                  : 'text-slate-400 hover:text-white hover:bg-[#1a1c26]'
              }`}
              title="Toggle Inspector (⌘4)"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenShortcuts}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a1c26] rounded transition-colors"
            title="Shortcuts [?]"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* All Installers (.exe, .dmg, .app) */}
        {onOpenInstallers && (
          <button
            onClick={onOpenInstallers}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white bg-[#1a1c26] hover:bg-[#222534] border border-[#2c3044] rounded-md transition-colors whitespace-nowrap shadow-xs cursor-pointer"
            title="Browse All Official Release Files (.exe, .dmg, .app, .tar.gz)"
          >
            <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
            <span>v1.2 Installers</span>
          </button>
        )}

        {/* Instant 1-Click Desktop Install Button */}
        {onOpenInstantInstall && (
          <button
            onClick={onOpenInstantInstall}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-[#0a84ff] to-[#0071e3] hover:from-[#1a8cff] hover:to-[#007bf0] border border-blue-400/30 rounded-md transition-all whitespace-nowrap shadow-sm shadow-blue-500/20 cursor-pointer"
            title="Install AetherCut Studio Instantly to your Desktop"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
            <span>Install App</span>
          </button>
        )}

        {/* Share / Export (Iconic Apple Final Cut Pro Share Button) */}
        <button
          onClick={onOpenDeliver}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] rounded-md shadow-sm shadow-blue-500/25 transition-colors whitespace-nowrap"
          title="Share / Export Movie (⌘E)"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
};
