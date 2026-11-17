import React, { useEffect } from 'react';
import { PlatformOS } from '../../types/editor';
import { Keyboard } from 'lucide-react';

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
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mod = os === 'mac' ? '⌘' : 'Ctrl+';

  const shortcuts = [
    {
      category: 'Project & History Safety',
      items: [
        { key: `${mod}Z`, desc: 'Undo last edit or gesture' },
        { key: os === 'mac' ? '⌘⇧Z' : 'Ctrl+Shift+Z / Y', desc: 'Redo undone edit' },
        { key: `${mod}S`, desc: 'Save Project (.aethercut.json)' },
        { key: `${mod}O`, desc: 'Open Project (.aethercut.json)' },
        { key: `${mod}E`, desc: 'Open Deliver / Export modal' },
      ],
    },
    {
      category: 'Playback & Shuttling',
      items: [
        { key: 'Space', desc: 'Play / Pause playback' },
        { key: 'J', desc: 'Shuttle reverse (1x, 2x, 4x)' },
        { key: 'K', desc: 'Stop / Pause shuttle' },
        { key: 'L', desc: 'Shuttle forward (1x, 2x, 4x)' },
        { key: '← / →', desc: 'Step back / forward 1 frame' },
        { key: '⇧← / ⇧→', desc: 'Jump back / forward 1 second' },
        { key: 'I / O', desc: 'Set In / Out mark points' },
      ],
    },
    {
      category: 'Timeline Tools & Editing',
      items: [
        { key: 'A / B / T', desc: 'Select / Blade / Trim tool' },
        { key: `${mod}B`, desc: 'Split clip at playhead' },
        { key: `${mod}T`, desc: 'Add Cross Dissolve at cut' },
        { key: 'W / E', desc: 'Insert / Append selected media' },
        { key: 'N / M', desc: 'Toggle Snapping / Mute track' },
        { key: '⇧Z', desc: 'Fit entire timeline to view' },
        { key: 'Delete / ⌫', desc: 'Ripple delete selected item' },
      ],
    },
    {
      category: 'Workstation & Accessibility',
      items: [
        { key: `${mod}1 / ${mod}4`, desc: 'Toggle Browser / Inspector' },
        { key: 'Shift+F', desc: 'Toggle Theater Monitor mode' },
        { key: 'S', desc: 'Toggle live Video Scopes' },
        { key: '↑ / ↓', desc: 'Navigate track lanes (when focused)' },
        { key: '?', desc: 'Open / Close Shortcuts reference' },
        { key: 'Esc', desc: 'Close active dialog or clear selection' },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-[#151722] border border-[#2b2e40] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header with OS switch */}
        <div className="px-6 py-4 border-b border-[#242738] bg-[#181a27] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-blue-400" aria-hidden="true" />
            <h2
              id="shortcuts-modal-title"
              className="text-sm font-bold text-white tracking-wide uppercase"
            >
              KEYBOARD SHORTCUTS &amp; DESKTOP MAPPINGS
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Platform shortcut display"
              className="flex items-center gap-1 bg-[#12141c] p-1 rounded-lg border border-[#262939]"
            >
              {(['mac', 'windows', 'linux'] as const).map((platform) => (
                <button
                  key={platform}
                  type="button"
                  aria-pressed={os === platform}
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

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Keyboard Shortcuts"
              className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-[#232638]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((cat) => (
            <div key={cat.category} className="bg-[#191c28] p-4 rounded-xl border border-[#262939]">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
                {cat.category}
              </h3>
              <div className="space-y-2">
                {cat.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300">{item.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#10121a] border border-[#2d3246] font-mono text-slate-300 text-[11px] font-semibold whitespace-nowrap shrink-0">
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
          <span>Every shortcut shown is active in the workstation</span>
          <button
            type="button"
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
