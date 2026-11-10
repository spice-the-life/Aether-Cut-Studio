import React, { useState } from 'react';
import {
  Download,
  Github,
  Monitor,
  Check,
  Copy,
  ExternalLink,
  X,
  FileCode,
  Sparkles,
  Terminal,
  ShieldCheck,
  Package,
} from 'lucide-react';

interface DesktopReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopReleaseModal: React.FC<DesktopReleaseModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const gitTagCommand = 'git tag v1.1.0 && git push origin v1.1.0';
  const buildCommand = 'npm run package:win';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-2xl rounded-xl bg-[#14151e] border border-[#26293a] shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#212433] flex items-center justify-between bg-[#171822]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/40">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  AetherCut Studio · Version 1.1 (.exe)
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready for GitHub
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Windows 64-bit setup installer and automated CI/CD release pipeline
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

        {/* Modal Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          {/* Target File Info Card */}
          <div className="p-4 rounded-lg bg-[#0d0e14] border border-[#222533] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-[#1e2334] text-[#0a84ff] border border-[#2f3852] shrink-0 mt-0.5 sm:mt-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="font-mono text-xs font-bold text-white">
                  AetherCut-Studio-Setup-1.1.0.exe
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans">
                  <span>Version 1.1 (v1.1.0)</span>
                  <span>·</span>
                  <span>Windows 10 / 11 (x64)</span>
                  <span>·</span>
                  <span>NSIS Installer</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <span className="text-[10px] font-mono text-slate-400 bg-[#161822] px-2 py-1 rounded border border-[#242738]">
                release/
              </span>
            </div>
          </div>

          {/* GitHub Actions Automated Release Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Github className="w-3.5 h-3.5 text-slate-400" />
                <span>1. Automated GitHub Actions Release</span>
              </div>
              <span className="text-[10px] font-mono text-blue-400">.github/workflows/release-exe.yml</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Your repository is pre-configured with a GitHub Actions workflow. When you push the <code className="text-blue-300">v1.0.0</code> tag, GitHub builds and publishes the <code className="text-blue-300">.exe</code> installer to your GitHub Releases automatically.
            </p>

            <div className="relative group bg-[#090a0f] p-3 rounded-lg border border-[#202332]">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 overflow-x-auto pr-8">
                <code>{gitTagCommand}</code>
              </div>
              <button
                onClick={() => copyToClipboard(gitTagCommand, 1)}
                className="absolute right-2 top-2 p-1.5 rounded bg-[#171924] hover:bg-[#202334] text-slate-300 hover:text-white border border-[#262a3c] transition-colors"
                title="Copy Command"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Local Package Command Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>2. Local Windows Build Command</span>
            </div>
            <p className="text-[11px] text-slate-400">
              To build the installer on a local Windows development machine directly:
            </p>

            <div className="relative group bg-[#090a0f] p-3 rounded-lg border border-[#202332]">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 overflow-x-auto pr-8">
                <code>{buildCommand}</code>
              </div>
              <button
                onClick={() => copyToClipboard(buildCommand, 2)}
                className="absolute right-2 top-2 p-1.5 rounded bg-[#171924] hover:bg-[#202334] text-slate-300 hover:text-white border border-[#262a3c] transition-colors"
                title="Copy Command"
              >
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Desktop Features Included */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="p-2.5 rounded-md bg-[#10121a] border border-[#1f2230] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Native Windows NSIS Setup Wizard</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#10121a] border border-[#1f2230] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Hardware-accelerated WebGL playback</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#10121a] border border-[#1f2230] flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Desktop & Start Menu Shortcuts</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#10121a] border border-[#1f2230] flex items-center gap-2">
              <Monitor className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Offline Standalone Executable</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#212433] bg-[#171822] flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            Version 1.0 (v1.0.0) · Electron & NSIS
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0a84ff] hover:bg-[#0071e3] rounded-md transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
