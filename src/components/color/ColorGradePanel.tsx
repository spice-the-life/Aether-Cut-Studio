import React from 'react';
import { CompositorNode } from '../../types/editor';
import { RotateCcw } from 'lucide-react';

interface ColorGradePanelProps {
  activeNode: CompositorNode | null;
  onUpdateNodeData: (nodeId: string, data: Partial<CompositorNode['data']>) => void;
  onOpenScopes: () => void;
}

interface ColorWheelProps {
  label: string;
  r: number;
  g: number;
  b: number;
  master: number;
  onChange: (r: number, g: number, b: number, master: number) => void;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ label, r, g, b, master, onChange }) => {
  // Map r, g, b offset to 2D coordinate inside circular puck
  const cx = 50;
  const cy = 50;
  const radius = 38;

  // Derive puck position from r and b
  const puckX = cx + (r * radius * 4);
  const puckY = cy - (b * radius * 4);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();

    const updateFromPointer = (clientX: number, clientY: number) => {
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      const dist = Math.sqrt(x * x + y * y);
      const maxDist = rect.width * 0.38;
      const clampedDist = Math.min(dist, maxDist);
      const angle = Math.atan2(y, x);

      const normX = (Math.cos(angle) * clampedDist) / maxDist;
      const normY = (Math.sin(angle) * clampedDist) / maxDist;

      // Map to R, G, B offsets
      const newR = Number((normX * 0.25).toFixed(3));
      const newB = Number((-normY * 0.25).toFixed(3));
      const newG = Number(((-normX * 0.5 - normY * 0.5) * 0.15).toFixed(3));

      onChange(newR, newG, newB, master);
    };

    updateFromPointer(e.clientX, e.clientY);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromPointer(ev.clientX, ev.clientY);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div className="flex flex-col items-center bg-[#171922] p-2.5 rounded-lg border border-[#252835] w-48">
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{label}</span>
        <button
          onClick={() => onChange(0, 0, 0, 0)}
          className="text-[#64748b] hover:text-white p-0.5 rounded hover:bg-[#202330]"
          title="Reset Wheel"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* SVG Color Wheel */}
      <div className="relative w-28 h-28 cursor-crosshair">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full select-none"
          onPointerDown={handlePointerDown}
        >
          <defs>
            <radialGradient id={`wheelGrad-${label}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#252836" />
              <stop offset="100%" stopColor="#12141a" />
            </radialGradient>
          </defs>

          {/* Outer ring */}
          <circle cx={cx} cy={cy} r={radius} fill={`url(#wheelGrad-${label})`} stroke="#333849" strokeWidth="1.5" />

          {/* Color hints */}
          <text x={cx + radius - 6} y={cy + 3} fill="#ef4444" fontSize="8" fontWeight="bold">R</text>
          <text x={cx - radius + 2} y={cy + 3} fill="#06b6d4" fontSize="8" fontWeight="bold">C</text>
          <text x={cx - 3} y={cy - radius + 8} fill="#3b82f6" fontSize="8" fontWeight="bold">B</text>
          <text x={cx - 3} y={cy + radius - 2} fill="#eab308" fontSize="8" fontWeight="bold">Y</text>
          <text x={cx - radius * 0.6} y={cy + radius * 0.6} fill="#22c55e" fontSize="8" fontWeight="bold">G</text>
          <text x={cx + radius * 0.5} y={cy - radius * 0.4} fill="#ec4899" fontSize="8" fontWeight="bold">M</text>

          {/* Crosshair */}
          <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="#475569" strokeWidth="0.8" />
          <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} stroke="#475569" strokeWidth="0.8" />

          {/* Center Indicator Puck */}
          <circle
            cx={Math.max(cx - radius + 4, Math.min(cx + radius - 4, puckX))}
            cy={Math.max(cy - radius + 4, Math.min(cy + radius - 4, puckY))}
            r={5}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="1.5"
            className="drop-shadow"
          />
        </svg>
      </div>

      {/* Master Luminance Slider */}
      <div className="w-full mt-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
          <span>Y Master</span>
          <span className="font-mono">{master >= 0 ? `+${master.toFixed(2)}` : master.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={master}
          onChange={(e) => onChange(r, g, b, parseFloat(e.target.value))}
          className="w-full h-1 bg-[#252835] rounded appearance-none cursor-pointer"
        />
      </div>

      {/* R G B values */}
      <div className="grid grid-cols-3 gap-1 w-full mt-2 text-center text-[10px] font-mono text-slate-400">
        <div>R: <span className="text-red-400">{r >= 0 ? `+${r.toFixed(2)}` : r.toFixed(2)}</span></div>
        <div>G: <span className="text-green-400">{g >= 0 ? `+${g.toFixed(2)}` : g.toFixed(2)}</span></div>
        <div>B: <span className="text-blue-400">{b >= 0 ? `+${b.toFixed(2)}` : b.toFixed(2)}</span></div>
      </div>
    </div>
  );
};

export const ColorGradePanel: React.FC<ColorGradePanelProps> = ({
  activeNode,
  onUpdateNodeData,
  onOpenScopes,
}) => {
  if (!activeNode || activeNode.type !== 'color_grade') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#8e93a6]">
        <div className="w-12 h-12 rounded-full bg-[#1b1d27] flex items-center justify-center mb-3">
          <RotateCcw className="w-6 h-6 text-[#60a5fa]" />
        </div>
        <h4 className="text-sm font-semibold text-white mb-1">Select a ColorCorrector Node</h4>
        <p className="text-xs max-w-sm text-[#8e93a6]">
          Switch to the Nodes tab or click any ColorCorrector node in the graph to unlock 3-way Lift/Gamma/Gain color wheels, curves, and primaries.
        </p>
      </div>
    );
  }

  const d = activeNode.data;

  // Preset LUTs
  const applyPreset = (preset: 'teal_orange' | 'bleach' | 'golden' | 'film_bw' | 'reset') => {
    switch (preset) {
      case 'teal_orange':
        onUpdateNodeData(activeNode.id, {
          liftR: -0.06,
          liftG: -0.02,
          liftB: 0.12,
          gainR: 0.14,
          gainG: 0.05,
          gainB: -0.12,
          contrast: 1.25,
          saturation: 1.35,
          temperature: 12,
        });
        break;
      case 'bleach':
        onUpdateNodeData(activeNode.id, {
          liftR: 0.02,
          liftG: 0.02,
          liftB: 0.04,
          gainR: 0.08,
          gainG: 0.08,
          gainB: 0.08,
          contrast: 1.45,
          saturation: 0.55,
          exposure: 0.2,
        });
        break;
      case 'golden':
        onUpdateNodeData(activeNode.id, {
          liftR: 0.04,
          liftG: 0.02,
          liftB: -0.05,
          gainR: 0.18,
          gainG: 0.1,
          gainB: -0.15,
          contrast: 1.12,
          saturation: 1.2,
          temperature: 25,
        });
        break;
      case 'film_bw':
        onUpdateNodeData(activeNode.id, {
          liftR: 0,
          liftG: 0,
          liftB: 0,
          gainR: 0.05,
          gainG: 0.05,
          gainB: 0.05,
          contrast: 1.35,
          saturation: 0,
          exposure: 0.1,
        });
        break;
      case 'reset':
        onUpdateNodeData(activeNode.id, {
          liftR: 0,
          liftG: 0,
          liftB: 0,
          liftMaster: 0,
          gammaR: 0,
          gammaG: 0,
          gammaB: 0,
          gammaMaster: 0,
          gainR: 0,
          gainG: 0,
          gainB: 0,
          gainMaster: 0,
          exposure: 0,
          contrast: 1.0,
          saturation: 1.0,
          temperature: 0,
          tint: 0,
        });
        break;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111217] overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-[#222532] bg-[#14161f]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white tracking-wide">3-WAY COLOR WHEELS & PRIMARIES</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-blue-400 font-mono">{activeNode.title}</span>
        </div>

        {/* LUT Presets & Scopes Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#1a1c26] p-1 rounded-md border border-[#272a38]">
            <span className="text-[10px] text-slate-400 px-1 font-medium">LUTs:</span>
            <button
              onClick={() => applyPreset('teal_orange')}
              className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-[#2b2e3e] transition-colors"
            >
              Teal & Orange
            </button>
            <button
              onClick={() => applyPreset('golden')}
              className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-[#2b2e3e] transition-colors"
            >
              Golden Hour
            </button>
            <button
              onClick={() => applyPreset('bleach')}
              className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-[#2b2e3e] transition-colors"
            >
              Bleach Bypass
            </button>
            <button
              onClick={() => applyPreset('film_bw')}
              className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-[#2b2e3e] transition-colors"
            >
              B&W Film
            </button>
            <button
              onClick={() => applyPreset('reset')}
              className="text-[11px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-[#2b2e3e] transition-colors"
            >
              Reset All
            </button>
          </div>

          <button
            onClick={onOpenScopes}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#252836] hover:bg-[#323649] text-xs font-medium text-white rounded-md border border-[#34384a] transition-colors"
          >
            <span>Live Video Scopes</span>
          </button>
        </div>
      </div>

      {/* Main Color Workspace */}
      <div className="p-6 flex flex-col gap-6">
        {/* Wheels Row */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <ColorWheel
            label="Lift (Shadows)"
            r={d.liftR ?? 0}
            g={d.liftG ?? 0}
            b={d.liftB ?? 0}
            master={d.liftMaster ?? 0}
            onChange={(r, g, b, master) =>
              onUpdateNodeData(activeNode.id, { liftR: r, liftG: g, liftB: b, liftMaster: master })
            }
          />
          <ColorWheel
            label="Gamma (Midtones)"
            r={d.gammaR ?? 0}
            g={d.gammaG ?? 0}
            b={d.gammaB ?? 0}
            master={d.gammaMaster ?? 0}
            onChange={(r, g, b, master) =>
              onUpdateNodeData(activeNode.id, { gammaR: r, gammaG: g, gammaB: b, gammaMaster: master })
            }
          />
          <ColorWheel
            label="Gain (Highlights)"
            r={d.gainR ?? 0}
            g={d.gainG ?? 0}
            b={d.gainB ?? 0}
            master={d.gainMaster ?? 0}
            onChange={(r, g, b, master) =>
              onUpdateNodeData(activeNode.id, { gainR: r, gainG: g, gainB: b, gainMaster: master })
            }
          />
        </div>

        {/* Primaries Numeric Sliders */}
        <div className="bg-[#171922] p-5 rounded-xl border border-[#252835] grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Exposure */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>Exposure</span>
              <span className="font-mono text-blue-400">
                {(d.exposure ?? 0) >= 0 ? `+${(d.exposure ?? 0).toFixed(2)}` : (d.exposure ?? 0).toFixed(2)} EV
              </span>
            </div>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.05}
              value={d.exposure ?? 0}
              onChange={(e) => onUpdateNodeData(activeNode.id, { exposure: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#252835] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>Contrast</span>
              <span className="font-mono text-blue-400">{(d.contrast ?? 1.0).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.02}
              value={d.contrast ?? 1.0}
              onChange={(e) => onUpdateNodeData(activeNode.id, { contrast: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#252835] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>Saturation</span>
              <span className="font-mono text-blue-400">{(d.saturation ?? 1.0).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.02}
              value={d.saturation ?? 1.0}
              onChange={(e) => onUpdateNodeData(activeNode.id, { saturation: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#252835] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Temperature */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>Temp</span>
              <span className="font-mono text-amber-400">
                {(d.temperature ?? 0) >= 0 ? `+${(d.temperature ?? 0).toFixed(0)}` : (d.temperature ?? 0).toFixed(0)}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={50}
              step={1}
              value={d.temperature ?? 0}
              onChange={(e) => onUpdateNodeData(activeNode.id, { temperature: parseInt(e.target.value, 10) })}
              className="w-full h-1 bg-[#252835] rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Tint */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>Tint</span>
              <span className="font-mono text-fuchsia-400">
                {(d.tint ?? 0) >= 0 ? `+${(d.tint ?? 0).toFixed(0)}` : (d.tint ?? 0).toFixed(0)}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={50}
              step={1}
              value={d.tint ?? 0}
              onChange={(e) => onUpdateNodeData(activeNode.id, { tint: parseInt(e.target.value, 10) })}
              className="w-full h-1 bg-[#252835] rounded appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
