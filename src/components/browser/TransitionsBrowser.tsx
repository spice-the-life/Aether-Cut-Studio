import React, { useState } from 'react';
import { TransitionType } from '../../types/editor';
import { TRANSITION_LIBRARY, TransitionDescriptor } from '../../engine/transitionRenderer';
import { Sparkles, Layers, Sliders, Play, Check } from 'lucide-react';

interface TransitionsBrowserProps {
  onApplyTransition: (type: TransitionType) => void;
  selectedTransitionType: TransitionType | null;
}

export const TransitionsBrowser: React.FC<TransitionsBrowserProps> = ({
  onApplyTransition,
  selectedTransitionType,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Dissolve' | 'Wipe' | 'Slide' | 'Stylized'>('All');
  const [hoveredType, setHoveredType] = useState<TransitionType | null>(null);

  const categories = ['All', 'Dissolve', 'Wipe', 'Slide', 'Stylized'] as const;

  const filteredTransitions = TRANSITION_LIBRARY.filter(
    (t) => activeCategory === 'All' || t.category === activeCategory
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#0e0f14] select-none text-slate-300">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[#1f212c] bg-[#13141a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white tracking-wider uppercase font-sans">TRANSITIONS BROWSER</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">FCP Engine</span>
      </div>

      {/* Category Filter */}
      <div className="px-3 py-2 border-b border-[#1c1e28] bg-[#111218] flex items-center gap-1 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-[#1e202c] text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#161822]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Transitions Grid */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {filteredTransitions.map((t) => {
          const isSelected = selectedTransitionType === t.type;
          const isHovered = hoveredType === t.type;

          return (
            <div
              key={t.type}
              onClick={() => onApplyTransition(t.type)}
              onMouseEnter={() => setHoveredType(t.type)}
              onMouseLeave={() => setHoveredType(null)}
              className={`group rounded-xl border p-2.5 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#0a84ff] bg-[#141926] ring-1 ring-blue-500/60'
                  : 'border-[#1e202b] bg-[#12131a] hover:border-slate-500 hover:bg-[#171922]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Transition Icon Graphic */}
                  <div className="w-7 h-7 rounded-lg bg-[#181a24] border border-[#262838] flex items-center justify-center text-amber-400 font-mono text-xs font-bold shrink-0">
                    {t.type === 'cross_dissolve' ? '⧖' : t.type.includes('dip') ? '◐' : t.type.includes('wipe') ? '▥' : t.type.includes('slide') ? '⇄' : '⚡'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                      {t.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums">{t.category} · {t.defaultDuration}s</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyTransition(t.type);
                  }}
                  className="px-2.5 py-1 bg-[#1c1e2a] hover:bg-[#0a84ff] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1 border border-[#262838]"
                >
                  <span>Apply</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {t.description}
              </p>

              {/* Animated miniature preview bar */}
              <div className="mt-2.5 w-full h-1 rounded-full bg-[#0a0b0e] overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-300 ${
                    isHovered ? 'w-full animate-pulse' : 'w-1/3'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Shortcut hint */}
      <div className="px-3.5 py-2 border-t border-[#1f212c] bg-[#111218] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span>Click to insert at playhead cut</span>
        <kbd className="px-1.5 py-0.5 rounded bg-[#0a0b0e] border border-[#222430] font-mono text-slate-300 text-[10px]">
          ⌘T
        </kbd>
      </div>
    </div>
  );
};
