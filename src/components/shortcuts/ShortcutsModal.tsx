import React from 'react';
import { PlatformOS } from '../../types/editor';
import { Keyboard, Command, Monitor } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  os: PlatformOS;
  onSetOs: (os: PlatformOS) => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  os,
  onSetOs,
}) => {
  if (!isOpen) return null;

  const mod = os === 'mac' ? '⌘' : 'Ctrl+';
  const opt = os === 'mac' ? '⌥' : 'Alt+';

  const shortcuts = [
    {
      category: 'Playback & Shuttling',
      items: [
        { key: 'Space', desc: 'Play / Pause playback' },
        { key: 'J', desc: 'Shuttle reverse (1x, 2x, 4x)' },
        { key: 'K', desc: 'Stop / Pause shuttle' },
        { key: 'L', desc: 'Shuttle forward (1x, 2x, 4x)' },
        { key: '← / →', desc: 'Step back / forward 1 frame' },
        { key: 'I / O', desc: 'Set In / Out mark points' },
      ],
    },
    {
      category: 'Timeline Tools & Editing',
      items: [
        { key: 'A', desc: 'Select / Pointer tool' },
        { key: 'B', desc: 'Blade / Razor cutting tool' },
        { key: 'T', desc: 'Trim / Ripple tool' },
        { key: `${mod}B`, desc: 'Razor cut clip at playhead' },
        { key: 'N', desc: 'Toggle magnetic snapping' },
        { key: 'Delete / ⌫', desc: 'Ripple delete selected clip' },
        { key: 'Hover', desc: 'FCP Skimming playhead preview' },
      ],
    },
    {
      category: 'Node Compositor & VFX',
      items: [
        { key: 'Tab or Shift+A', desc: 'Open Add Node search palette' },
        { key: '1', desc: 'Connect selected node to Viewer 1' },
        { key: '2', desc: 'Connect selected node to Viewer 2' },
        { key: 'D', desc: 'Bypass / Enable selected node' },
        { key: 'Space + Drag', desc: 'Pan node graph canvas' },
        { key: 'Scroll Wheel', desc: 'Zoom node graph in / out' },
      ],
    },
    {
      category: 'Workstation & Scopes',
      items: [
        { key: `${mod}1 - 5`, desc: 'Switch Workspace (Edit, Nodes, Color, Audio, Deliver)' },
        { key: 'S', desc: 'Toggle live Video Scopes' },
        { key: 'F11', desc: 'Toggle Fullscreen Mode' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#151722] border border-[#2b2e40] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header with OS switch */}
        <div className="px-6 py-4 border-b border-[#242738] bg-[#181a27] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              KEYBOARD SHORTCUTS & DESKTOP MAPPINGS
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* OS selector tabs */}
            <div className="flex items-center gap-1 bg-[#12141c] p-1 rounded-lg border border-[#262939]">
              {(['mac', 'windows', 'linux'] as const).map((platform) => (
                <button
                  key={platform}
                  onClick={() => onSetOs(platform)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    os === platform
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {platform === 'mac' ? 'macOS' : platform === 'windows' ? 'Windows' : 'Linux'}
                </button>
              ))}
            </div>

            <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1">
              ✕
            </button>
          </div>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((cat) => (
            <div key={cat.category} className="bg-[#191c28] p-4 rounded-xl border border-[#262939]">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
                {cat.category}
              </h3>
              <div className="space-y-2">
                {cat.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{item.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#10121a] border border-[#2d3246] font-mono text-slate-300 text-[11px] font-semibold">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#242738] bg-[#181a27] flex items-center justify-between text-xs text-slate-400">
          <span>Cross-platform compliant · Works seamlessly in browser or installed desktop PWA</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252838] hover:bg-[#32364a] text-white rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
