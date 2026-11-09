import React from 'react';
import {
  CompositorNode,
  TimelineClip,
  TimelineTransition,
  MediaItem,
  TransitionType,
} from '../../types/editor';
import {
  Sliders,
  Maximize,
  Volume2,
  Film,
  Type,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface InspectorPanelProps {
  selectedNode: CompositorNode | null;
  selectedClip: TimelineClip | null;
  selectedTransition: TimelineTransition | null;
  selectedMedia: MediaItem | null;
  onUpdateNodeData: (nodeId: string, data: Partial<CompositorNode['data']>) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onUpdateTransition: (transitionId: string, updates: Partial<TimelineTransition>) => void;
  onDeleteTransition: (transitionId: string) => void;
  onToggleNodeBypass: (nodeId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  selectedClip,
  selectedTransition,
  selectedMedia,
  onUpdateNodeData,
  onUpdateClip,
  onUpdateTransition,
  onDeleteTransition,
  onToggleNodeBypass,
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-[#101117] text-slate-200 select-none overflow-y-auto">
      {/* Inspector Header */}
      <div className="px-3.5 py-2.5 border-b border-[#1f212c] flex items-center justify-between bg-[#13141a] shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold tracking-wider text-white uppercase font-sans">INSPECTOR</span>
        </div>

        {selectedNode && (
          <button
            onClick={() => onToggleNodeBypass(selectedNode.id)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
              selectedNode.bypass
                ? 'border-amber-600/50 bg-amber-950/40 text-amber-300'
                : 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300'
            }`}
            title="Toggle Node Bypass"
          >
            {selectedNode.bypass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{selectedNode.bypass ? 'Bypassed' : 'Active'}</span>
          </button>
        )}
      </div>

      <div className="p-3.5 space-y-5">
        {/* CASE 1: TRANSITION INSPECTOR */}
        {selectedTransition ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#242738]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  TRANSITION INSPECTOR
                </h3>
              </div>
              <button
                onClick={() => onDeleteTransition(selectedTransition.id)}
                className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-[#202334]"
                title="Delete Transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Transition Type Selector */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Transition Effect</label>
              <select
                value={selectedTransition.type}
                onChange={(e) =>
                  onUpdateTransition(selectedTransition.id, {
                    type: e.target.value as TransitionType,
                  })
                }
                className="w-full px-3 py-2 bg-[#1a1d2b] border border-[#2e3348] rounded-lg text-xs text-white font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="cross_dissolve">Cross Dissolve (Standard)</option>
                <option value="dip_black">Dip to Black</option>
                <option value="dip_white">Dip to White (Flash)</option>
                <option value="wipe_left">Wipe Left</option>
                <option value="wipe_right">Wipe Right</option>
                <option value="slide_left">Push Slide Left</option>
                <option value="glitch">Optical RGB Glitch</option>
              </select>
            </div>

            {/* Transition Duration */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium">Duration</span>
                <span className="font-mono text-amber-400 font-bold">
                  {selectedTransition.duration.toFixed(2)}s
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={3.0}
                step={0.05}
                value={selectedTransition.duration}
                onChange={(e) =>
                  onUpdateTransition(selectedTransition.id, {
                    duration: parseFloat(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-[#282c3e] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Transition Alignment */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Cut Alignment</label>
              <div className="flex gap-1.5">
                {(['center', 'start', 'end'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => onUpdateTransition(selectedTransition.id, { alignment: align })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      selectedTransition.alignment === align
                        ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                        : 'border-[#282c3e] bg-[#1a1d2b] text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'center' ? 'Center on Cut' : align === 'start' ? 'Start on Cut' : 'End on Cut'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111219] border border-[#242738] text-[11px] text-slate-400 leading-relaxed">
              Transitions blend outgoing and incoming video tracks seamlessly across the magnetic timeline.
            </div>
          </div>
        ) : selectedNode ? (
          /* CASE 2: NODE INSPECTOR */
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#242738]">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedNode.title}</h3>
                <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider">
                  {selectedNode.type.replace('_', ' ')} NODE
                </span>
              </div>
            </div>

            {/* Transform Node */}
            {selectedNode.type === 'transform' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Scale</span>
                    <span className="font-mono text-blue-400">{(selectedNode.data.scale ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.05}
                    value={selectedNode.data.scale ?? 1.0}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { scale: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Pos X</span>
                      <span className="font-mono text-blue-400">{(selectedNode.data.posX ?? 0).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.02}
                      value={selectedNode.data.posX ?? 0}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { posX: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Pos Y</span>
                      <span className="font-mono text-blue-400">{(selectedNode.data.posY ?? 0).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.02}
                      value={selectedNode.data.posY ?? 0}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { posY: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Rotation</span>
                    <span className="font-mono text-blue-400">{(selectedNode.data.rotation ?? 0).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={selectedNode.data.rotation ?? 0}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { rotation: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onUpdateNodeData(selectedNode.id, { flipH: !selectedNode.data.flipH })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${
                      selectedNode.data.flipH
                        ? 'border-blue-500 bg-blue-600/30 text-white'
                        : 'border-[#2d3144] hover:bg-[#202332] text-slate-400'
                    }`}
                  >
                    Flip Horizontal
                  </button>
                  <button
                    onClick={() => onUpdateNodeData(selectedNode.id, { flipV: !selectedNode.data.flipV })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${
                      selectedNode.data.flipV
                        ? 'border-blue-500 bg-blue-600/30 text-white'
                        : 'border-[#2d3144] hover:bg-[#202332] text-slate-400'
                    }`}
                  >
                    Flip Vertical
                  </button>
                </div>
              </div>
            )}

            {/* Chroma Keyer Node */}
            {selectedNode.type === 'chroma_key' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-400">Target Key Color</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">{selectedNode.data.keyColor || '#00ff00'}</span>
                      <input
                        type="color"
                        value={selectedNode.data.keyColor || '#00ff00'}
                        onChange={(e) => onUpdateNodeData(selectedNode.id, { keyColor: e.target.value })}
                        className="w-6 h-6 rounded border border-[#3b3f54] cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Tolerance</span>
                    <span className="font-mono text-emerald-400">{(selectedNode.data.tolerance ?? 0.42).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.8}
                    step={0.01}
                    value={selectedNode.data.tolerance ?? 0.42}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { tolerance: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Softness</span>
                    <span className="font-mono text-emerald-400">{(selectedNode.data.softness ?? 0.15).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.4}
                    step={0.01}
                    value={selectedNode.data.softness ?? 0.15}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { softness: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Green Edge Despill</span>
                    <span className="font-mono text-emerald-400">{(selectedNode.data.despill ?? 0.7).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedNode.data.despill ?? 0.7}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { despill: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Blur & Glow */}
            {selectedNode.type === 'blur' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Radius</span>
                  <span className="font-mono text-blue-400">{selectedNode.data.blurRadius ?? 12} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={selectedNode.data.blurRadius ?? 12}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { blurRadius: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer"
                />
              </div>
            )}

            {selectedNode.type === 'glow' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Glow Intensity</span>
                  <span className="font-mono text-cyan-400">{(selectedNode.data.glowIntensity ?? 0.6).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={selectedNode.data.glowIntensity ?? 0.6}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { glowIntensity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}

            {/* Title / Text */}
            {selectedNode.type === 'text_title' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Title Text</label>
                  <input
                    type="text"
                    value={selectedNode.data.text || ''}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { text: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#1a1d29] border border-[#2b3042] rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Font Size</span>
                    <span className="font-mono text-pink-400">{selectedNode.data.fontSize ?? 42} pt</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={120}
                    step={2}
                    value={selectedNode.data.fontSize ?? 42}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { fontSize: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer accent-pink-500"
                  />
                </div>
              </div>
            )}
          </div>
        ) : selectedClip ? (
          /* CASE 3: TIMELINE CLIP INSPECTOR */
          <div className="space-y-5">
            <div className="pb-3 border-b border-[#242738]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedClip.color }} />
                <h3 className="text-sm font-bold text-white truncate">{selectedClip.name}</h3>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                <span>In: {selectedClip.start.toFixed(2)}s</span>
                <span>·</span>
                <span>Duration: {selectedClip.duration.toFixed(2)}s</span>
              </div>
            </div>

            {/* Video Section */}
            {selectedClip.trackType === 'video' && (
              <div className="space-y-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Film className="w-3.5 h-3.5 text-blue-400" />
                  VIDEO PROPERTIES
                </span>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Opacity</span>
                    <span className="font-mono text-blue-400">{Math.round(selectedClip.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={selectedClip.opacity}
                    onChange={(e) => onUpdateClip(selectedClip.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Playback Rate</span>
                    <span className="font-mono text-blue-400">{selectedClip.speed}x</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => onUpdateClip(selectedClip.id, { speed: rate })}
                        className={`flex-1 py-1 text-xs font-semibold rounded-lg border ${
                          selectedClip.speed === rate
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-[#2d3144] hover:bg-[#202332] text-slate-400'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Audio Section */}
            <div className="space-y-4 pt-3 border-t border-[#242738]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                AUDIO MIX
              </span>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Volume</span>
                  <span className="font-mono text-emerald-400">
                    {selectedClip.volume === 0 ? '-inf dB' : `${(20 * Math.log10(selectedClip.volume)).toFixed(1)} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.02}
                  value={selectedClip.volume}
                  onChange={(e) => onUpdateClip(selectedClip.id, { volume: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Pan</span>
                  <span className="font-mono text-emerald-400">
                    {selectedClip.pan === 0
                      ? 'Center'
                      : selectedClip.pan < 0
                      ? `L ${Math.abs(Math.round(selectedClip.pan * 100))}%`
                      : `R ${Math.round(selectedClip.pan * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={selectedClip.pan}
                  onChange={(e) => onUpdateClip(selectedClip.id, { pan: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-[#272b3b] rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>
        ) : (
          /* CASE 4: EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <Sliders className="w-8 h-8 mb-3 text-slate-600" />
            <span className="text-xs font-bold text-slate-300">No Item Selected</span>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[210px] leading-relaxed">
              Click a clip, transition block, or node in the workspace to adjust its parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
