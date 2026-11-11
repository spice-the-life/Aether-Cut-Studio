import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Zap,
  Monitor,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Laptop,
  Check,
  Copy,
} from 'lucide-react';

interface InstantInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onTriggerInstall?: () => void;
  isInstalled?: boolean;
}

export const InstantInstallModal: React.FC<InstantInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerInstall,
  isInstalled = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccess(true);
      }
    } else if (onTriggerInstall) {
      onTriggerInstall();
    }
  };

  const copyBatUrl = () => {
    navigator.clipboard.writeText('https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg rounded-2xl bg-[#14151e] border border-[#26293a] shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#212433] flex items-center justify-between bg-[#171822]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0a84ff] to-[#30d158] text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Instant Desktop Install
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Zero Setup
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instantly install AetherCut Studio to your PC or Mac in seconds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#202230] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4">
          {installedSuccess || isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">
                  AetherCut Studio is Installed!
                </p>
                <p className="text-xs text-emerald-300/90 mt-1">
                  You can now launch it anytime directly from your Start Menu, Desktop shortcut, or Taskbar in a dedicated high-performance window.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Option 1: 1-Click Instant Install (Primary) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#121624] to-[#161a2c] border border-blue-500/30 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] border border-blue-500/30">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Option 1: 1-Click Instant Install
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Installs directly into Windows or macOS without downloading any 100MB files.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pl-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Adds desktop icon & Windows Start Menu shortcut</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Runs in standalone frameless app window at 60fps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Never fails with "can't run on your PC"</span>
                  </div>
                </div>

                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#0a84ff] to-[#0071e3] hover:from-[#1a8cff] hover:to-[#007bf0] rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer mt-1"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Install AetherCut Studio Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option 2: 1-Click Desktop Launcher (.bat) */}
              <div className="p-3.5 rounded-xl bg-[#0f1118] border border-[#222533] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        AetherCut-Studio-Launcher.bat
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#1c1e2a] text-slate-400 border border-[#2b2e40]">
                        1.3 KB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      Double-click to open in native desktop window immediately
                    </p>
                  </div>
                </div>

                <a
                  href="/installers/v1.1/AetherCut-Studio-Launcher.bat"
                  download="AetherCut-Studio-Launcher.bat"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-[#1e2130] hover:bg-[#282c40] border border-[#30354c] rounded-lg transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download .bat</span>
                </a>
              </div>
            </>
          )}

          {/* Browser Address Bar Tip */}
          <div className="p-3 rounded-xl bg-[#11131a] border border-[#1f2230] text-[11px] text-slate-400 flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-300">Quick tip for Chrome & Edge users: </span>
              <span>
                You can also click the small <strong>Install (💻)</strong> icon in your browser address bar on the right to install instantly with 1 click.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#212433] bg-[#171822] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Works on Windows 10, Windows 11 & macOS</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#222534] hover:bg-[#2c3044] border border-[#34384e] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
