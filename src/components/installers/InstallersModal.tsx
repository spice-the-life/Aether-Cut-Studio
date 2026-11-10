import React, { useState } from 'react';
import {
  X,
  Download,
  FolderArchive,
  Apple,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
  PackageCheck,
  HardDrive,
  FileBox,
  Layers,
  Archive,
} from 'lucide-react';

interface InstallersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlatformFilter = 'all' | 'windows' | 'macos';

interface InstallerItem {
  id: string;
  name: string;
  version: '1.1' | '1.0' | '0.9-beta';
  platform: 'windows' | 'macos' | 'all';
  format: '.exe' | '.dmg' | '.app' | '.tar.gz';
  size: string;
  desc: string;
  relPath: string;
  downloadUrl: string;
  tag: string;
  tagColor: string;
}

const INSTALLER_ITEMS: InstallerItem[] = [
  // Version 1.1 (New Release)
  {
    id: 'win-v11',
    name: 'AetherCut-Studio-Setup-1.1.0.exe',
    version: '1.1',
    platform: 'windows',
    format: '.exe',
    size: '64.3 MB',
    desc: 'Windows 10 / 11 (64-bit) NSIS setup wizard with Desktop & Start Menu shortcuts',
    relPath: 'Installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe',
    downloadUrl: '/installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe',
    tag: 'v1.1 Latest',
    tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'mac-dmg-v11',
    name: 'AetherCut-Studio-1.1.0.dmg',
    version: '1.1',
    platform: 'macos',
    format: '.dmg',
    size: '72.1 MB',
    desc: 'macOS Disk Image (Apple Silicon M1/M2/M3/M4 & Intel 64-bit) drag-and-drop installer',
    relPath: 'Installers/v1.1/AetherCut-Studio-1.1.0.dmg',
    downloadUrl: '/installers/v1.1/AetherCut-Studio-1.1.0.dmg',
    tag: 'v1.1 Latest',
    tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'mac-app-v11',
    name: 'AetherCut Studio.app',
    version: '1.1',
    platform: 'macos',
    format: '.app',
    size: '68.5 MB',
    desc: 'Complete standalone macOS Application Bundle with Info.plist v1.1.0 & native launcher',
    relPath: 'Installers/v1.1/AetherCut Studio.app',
    downloadUrl: '/installers/v1.1/AetherCut-Studio-1.1.0-macOS.app.tar.gz',
    tag: 'App Bundle',
    tagColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 'bundle-v11',
    name: 'AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz',
    version: '1.1',
    platform: 'all',
    format: '.tar.gz',
    size: '198.4 MB',
    desc: 'All-in-One Multi-Platform Package containing .exe (Windows), .dmg (macOS), and .app bundle',
    relPath: 'Installers/v1.1/AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz',
    downloadUrl: '/installers/v1.1/AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz',
    tag: 'Complete Bundle',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },

  // Version 1.0 (Previous Stable)
  {
    id: 'win-v10',
    name: 'AetherCut-Studio-Setup-1.0.0.exe',
    version: '1.0',
    platform: 'windows',
    format: '.exe',
    size: '64.3 MB',
    desc: 'Windows 10 / 11 (64-bit) NSIS setup wizard (Version 1.0)',
    relPath: 'Installers/v1.0/AetherCut-Studio-Setup-1.0.0.exe',
    downloadUrl: '/installers/v1.0/AetherCut-Studio-Setup-1.0.0.exe',
    tag: 'Version 1.0',
    tagColor: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
  },
  {
    id: 'mac-dmg-v10',
    name: 'AetherCut-Studio-1.0.0.dmg',
    version: '1.0',
    platform: 'macos',
    format: '.dmg',
    size: '72.1 MB',
    desc: 'macOS Disk Image installer (Version 1.0)',
    relPath: 'Installers/v1.0/AetherCut-Studio-1.0.0.dmg',
    downloadUrl: '/installers/v1.0/AetherCut-Studio-1.0.0.dmg',
    tag: 'Version 1.0',
    tagColor: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
  },

  // Version 0.9 Beta
  {
    id: 'win-v09',
    name: 'AetherCut-Studio-Beta-0.9.0.exe',
    version: '0.9-beta',
    platform: 'windows',
    format: '.exe',
    size: '62.8 MB',
    desc: 'Windows Beta release channel build with experimental video filters and node graphs',
    relPath: 'Installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.exe',
    downloadUrl: '/installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.exe',
    tag: 'Beta 0.9',
    tagColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 'mac-dmg-v09',
    name: 'AetherCut-Studio-Beta-0.9.0.dmg',
    version: '0.9-beta',
    platform: 'macos',
    format: '.dmg',
    size: '69.4 MB',
    desc: 'macOS Beta release channel disk image with early Metal GPU acceleration preview',
    relPath: 'Installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.dmg',
    downloadUrl: '/installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.dmg',
    tag: 'Beta 0.9',
    tagColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
];

export const InstallersModal: React.FC<InstallersModalProps> = ({ isOpen, onClose }) => {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [selectedVersion, setSelectedVersion] = useState<'all' | '1.1' | '1.0' | '0.9-beta'>('1.1');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyPath = (path: string, id: string) => {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = INSTALLER_ITEMS.filter((item) => {
    if (platformFilter !== 'all' && item.platform !== 'all' && item.platform !== platformFilter) {
      return false;
    }
    if (selectedVersion !== 'all' && item.version !== selectedVersion) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-3xl rounded-xl bg-[#14151e] border border-[#26293a] shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212433] flex items-center justify-between bg-[#171822]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/40">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  AetherCut Studio · Version 1.1 Release
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  New Release (v1.1)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1e2334] text-blue-300 border border-[#2b3550]">
                  /Installers/v1.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official releases for Windows (.exe), macOS (.dmg & .app), and Complete All-in-One Bundle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#202230] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 border-b border-[#1f2230] bg-[#101118] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Platform Segmented Tabs */}
          <div className="flex items-center gap-1 bg-[#161824] p-0.5 rounded-md border border-[#252838]">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                platformFilter === 'all'
                  ? 'bg-[#0a84ff] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Platforms
            </button>
            <button
              onClick={() => setPlatformFilter('windows')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                platformFilter === 'windows'
                  ? 'bg-[#0a84ff] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⊞</span>
              <span>Windows (.exe)</span>
            </button>
            <button
              onClick={() => setPlatformFilter('macos')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                platformFilter === 'macos'
                  ? 'bg-[#0a84ff] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span></span>
              <span>macOS (.app & .dmg)</span>
            </button>
          </div>

          {/* Version Filter Pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedVersion('1.1')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                selectedVersion === '1.1'
                  ? 'bg-[#182a20] text-emerald-300 border-[#254d35]'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              v1.1 (New Release)
            </button>
            <button
              onClick={() => setSelectedVersion('1.0')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                selectedVersion === '1.0'
                  ? 'bg-[#1e2334] text-white border-[#344062]'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              v1.0 (Stable)
            </button>
            <button
              onClick={() => setSelectedVersion('0.9-beta')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                selectedVersion === '0.9-beta'
                  ? 'bg-[#2a2215] text-amber-300 border-[#523e1f]'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              v0.9 (Beta)
            </button>
            <button
              onClick={() => setSelectedVersion('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                selectedVersion === 'all'
                  ? 'bg-[#1e2334] text-white border-[#344062]'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              All Versions
            </button>
          </div>
        </div>

        {/* Installers List */}
        <div className="p-5 flex flex-col gap-3 overflow-y-auto max-h-[62vh]">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                item.version === '1.1'
                  ? 'bg-[#0f121b] border-[#293248] hover:border-[#3b486b]'
                  : 'bg-[#0e1017] border-[#222533] hover:border-[#2d3246]'
              }`}
            >
              {/* File Info */}
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`p-2 rounded-md shrink-0 mt-0.5 ${
                    item.platform === 'windows'
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : item.platform === 'macos'
                      ? 'bg-slate-700/30 text-slate-200 border border-slate-600/40'
                      : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  {item.platform === 'windows' ? (
                    <span className="font-bold text-sm block leading-none">⊞</span>
                  ) : item.platform === 'macos' ? (
                    <span className="font-bold text-sm block leading-none"></span>
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {item.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {item.size}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {item.desc}
                  </p>

                  <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                    <span className="truncate">{item.relPath}</span>
                    <button
                      onClick={() => copyPath(item.relPath, item.id)}
                      className="p-0.5 hover:text-white text-slate-500 transition-colors"
                      title="Copy Path"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400 inline" />
                      ) : (
                        <Copy className="w-3 h-3 inline" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <a
                  href={item.downloadUrl}
                  download={item.name}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-colors ${
                    item.format === '.tar.gz' && item.platform === 'all'
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
                      : 'bg-[#0a84ff] hover:bg-[#0071e3] text-white shadow-blue-500/20'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {item.format === '.tar.gz' && item.platform === 'all'
                      ? 'Download All'
                      : `Download ${item.format}`}
                  </span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#212433] bg-[#171822] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              All installers stored in <code>/Installers/v1.1</code> and verified with SHA-256
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs font-semibold text-white bg-[#222534] hover:bg-[#2c3044] border border-[#34384e] rounded-md transition-colors self-end sm:self-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
