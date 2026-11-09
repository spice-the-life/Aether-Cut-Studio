import React, { useState, useRef, useEffect } from 'react';
import {
  CompositorNode,
  NodeConnection,
  NodeGraph,
  NodeType,
} from '../../types/editor';
import { NODE_TEMPLATES, NodeTemplate } from '../../engine/nodeRenderer';
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Wand2,
  Sliders,
  Type,
  Maximize,
  Filter,
} from 'lucide-react';

interface NodeCompositorProps {
  graph: NodeGraph;
  selectedNodeId: string | null;
  viewer1NodeId: string | null;
  viewer2NodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSetViewer1: (nodeId: string) => void;
  onSetViewer2: (nodeId: string) => void;
  onUpdateGraph: (newGraph: NodeGraph) => void;
}

export const NodeCompositor: React.FC<NodeCompositorProps> = ({
  graph,
  selectedNodeId,
  viewer1NodeId,
  viewer2NodeId,
  onSelectNode,
  onSetViewer1,
  onSetViewer2,
  onUpdateGraph,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging nodes
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wiring connections
  const [wireStart, setWireStart] = useState<{
    nodeId: string;
    portId: string;
    portType: 'image' | 'mask';
    direction: 'input' | 'output';
    x: number;
    y: number;
  } | null>(null);
  const [wireCurrent, setWireCurrent] = useState<{ x: number; y: number } | null>(null);

  // Add Node Palette Modal
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMenuSearch, setAddMenuSearch] = useState('');
  const [addMenuPos, setAddMenuPos] = useState({ x: 200, y: 150 });

  // Spacebar panning key listener
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      } else if (e.key === 'Tab' || (e.shiftKey && e.code === 'KeyA')) {
        e.preventDefault();
        setIsAddMenuOpen((prev) => !prev);
      } else if (selectedNodeId) {
        if (e.key === '1') {
          onSetViewer1(selectedNodeId);
        } else if (e.key === '2') {
          onSetViewer2(selectedNodeId);
        } else if (e.key.toLowerCase() === 'd') {
          // Bypass toggle (Nuke standard)
          toggleBypass(selectedNodeId);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          deleteNode(selectedNodeId);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeId, graph]);

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      // Middle click or space+left click
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    } else if (e.button === 0 && e.target === containerRef.current) {
      onSelectNode(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggedNodeId) {
      const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
      const newY = (e.clientY - pan.y) / zoom - dragOffset.y;

      onUpdateGraph({
        ...graph,
        nodes: graph.nodes.map((n) => (n.id === draggedNodeId ? { ...n, x: Math.round(newX), y: Math.round(newY) } : n)),
      });
    } else if (wireStart) {
      setWireCurrent({
        x: (e.clientX - pan.x) / zoom,
        y: (e.clientY - pan.y) / zoom,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
    setWireStart(null);
    setWireCurrent(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || true) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(2.5, Math.max(0.4, zoom * zoomFactor));
      setZoom(newZoom);
    }
  };

  // Node operations
  const toggleBypass = (nodeId: string) => {
    onUpdateGraph({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === nodeId ? { ...n, bypass: !n.bypass } : n)),
    });
  };

  const deleteNode = (nodeId: string) => {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node || node.type === 'media_in' || node.type === 'media_out') return; // protect terminal nodes

    onUpdateGraph({
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      connections: graph.connections.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId),
    });
    if (selectedNodeId === nodeId) onSelectNode(null);
  };

  const addNodeFromTemplate = (template: NodeTemplate) => {
    const newId = `node-${template.type}-${Date.now().toString().slice(-4)}`;
    const newNode: CompositorNode = {
      id: newId,
      type: template.type,
      title: `${template.title} ${graph.nodes.filter((n) => n.type === template.type).length + 1}`,
      x: Math.round((addMenuPos.x - pan.x) / zoom),
      y: Math.round((addMenuPos.y - pan.y) / zoom),
      inputs: [...template.inputs],
      outputs: [...template.outputs],
      bypass: false,
      data: { ...template.defaultData },
    };

    onUpdateGraph({
      ...graph,
      nodes: [...graph.nodes, newNode],
    });
    onSelectNode(newId);
    setIsAddMenuOpen(false);
    setAddMenuSearch('');
  };

  // Wiring
  const handleStartWire = (
    e: React.MouseEvent,
    node: CompositorNode,
    portId: string,
    portType: 'image' | 'mask',
    direction: 'input' | 'output'
  ) => {
    e.stopPropagation();
    const portX = direction === 'output' ? node.x + 160 : node.x;
    const portY = node.y + 36;

    setWireStart({
      nodeId: node.id,
      portId,
      portType,
      direction,
      x: portX,
      y: portY,
    });
  };

  const handleEndWire = (
    e: React.MouseEvent,
    targetNode: CompositorNode,
    targetPortId: string,
    targetDirection: 'input' | 'output'
  ) => {
    e.stopPropagation();
    if (!wireStart) return;
    if (wireStart.nodeId === targetNode.id) return; // No self loops
    if (wireStart.direction === targetDirection) return; // Must connect out to in

    const fromNode = wireStart.direction === 'output' ? wireStart.nodeId : targetNode.id;
    const fromPort = wireStart.direction === 'output' ? wireStart.portId : targetPortId;
    const toNode = wireStart.direction === 'output' ? targetNode.id : wireStart.nodeId;
    const toPort = wireStart.direction === 'output' ? targetPortId : wireStart.portId;

    // Remove existing connection going to that input port (single input constraint)
    const filteredConns = graph.connections.filter((c) => !(c.toNodeId === toNode && c.toPortId === toPort));

    const newConnection: NodeConnection = {
      id: `conn-${Date.now()}`,
      fromNodeId: fromNode,
      fromPortId: fromPort,
      toNodeId: toNode,
      toPortId: toPort,
    };

    onUpdateGraph({
      ...graph,
      connections: [...filteredConns, newConnection],
    });

    setWireStart(null);
    setWireCurrent(null);
  };

  const removeConnection = (connId: string) => {
    onUpdateGraph({
      ...graph,
      connections: graph.connections.filter((c) => c.id !== connId),
    });
  };

  // Node Color Coding
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'media_in':
      case 'media_out':
        return { border: '#3b82f6', bg: '#1e293b', header: '#2563eb' };
      case 'chroma_key':
        return { border: '#10b981', bg: '#064e3b', header: '#059669' };
      case 'color_grade':
        return { border: '#f59e0b', bg: '#451a03', header: '#d97706' };
      case 'glow':
      case 'blur':
      case 'vignette':
        return { border: '#06b6d4', bg: '#164e63', header: '#0891b2' };
      case 'transform':
      case 'mask':
        return { border: '#a855f7', bg: '#3b0764', header: '#9333ea' };
      case 'text_title':
        return { border: '#ec4899', bg: '#500724', header: '#db2777' };
      case 'merge_blend':
        return { border: '#6366f1', bg: '#1e1b4b', header: '#4f46e5' };
      default:
        return { border: '#64748b', bg: '#1e293b', header: '#475569' };
    }
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'media_in':
      case 'media_out':
        return <Layers className="w-3.5 h-3.5" />;
      case 'chroma_key':
        return <Wand2 className="w-3.5 h-3.5" />;
      case 'color_grade':
        return <Sliders className="w-3.5 h-3.5" />;
      case 'transform':
        return <Maximize className="w-3.5 h-3.5" />;
      case 'text_title':
        return <Type className="w-3.5 h-3.5" />;
      default:
        return <Filter className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none node-grid-canvas bg-[#101218] ${
        isSpacePressed || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* Top Toolbar overlay */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-[#171922]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#262938] shadow-lg">
        <button
          onClick={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            setAddMenuPos({ x: (rect?.width ?? 600) / 2 - 140, y: 100 });
            setIsAddMenuOpen(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold rounded transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Node</span>
          <kbd className="ml-1 text-[10px] font-mono opacity-80 bg-blue-700/60 px-1 py-0.2 rounded">Tab</kbd>
        </button>

        <div className="h-4 w-px bg-[#2c3042]" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 text-[#8e93a6]">
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="p-1 hover:text-white rounded hover:bg-[#242838]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1 hover:text-white rounded hover:bg-[#242838]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 30 });
            }}
            className="p-1 hover:text-white rounded hover:bg-[#242838]"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Shortcuts quick hint */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-3 bg-[#171922]/80 px-3 py-1 rounded border border-[#252835] text-[11px] text-slate-400">
        <span><kbd className="text-slate-200 font-mono">1</kbd> Viewer 1</span>
        <span><kbd className="text-slate-200 font-mono">2</kbd> Viewer 2</span>
        <span><kbd className="text-slate-200 font-mono">D</kbd> Bypass</span>
        <span><kbd className="text-slate-200 font-mono">Space+Drag</kbd> Pan</span>
      </div>

      {/* SVG Canvas for Bezier Wires */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full z-10"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        <defs>
          <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

        {/* Existing Connections */}
        {graph.connections.map((conn) => {
          const fromNode = graph.nodes.find((n) => n.id === conn.fromNodeId);
          const toNode = graph.nodes.find((n) => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;

          const startX = fromNode.x + 160;
          const startY = fromNode.y + 42;
          const endX = toNode.x;
          const endY = toNode.y + 42;

          const dx = Math.abs(endX - startX) * 0.5 + 20;
          const path = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

          return (
            <g key={conn.id} className="pointer-events-auto group cursor-pointer" onClick={() => removeConnection(conn.id)}>
              {/* Invisible thicker hit-test stroke */}
              <path d={path} fill="none" stroke="transparent" strokeWidth="14" />
              {/* Visible wire */}
              <path
                d={path}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
                className="group-hover:stroke-red-400 transition-colors drop-shadow"
              />
            </g>
          );
        })}

        {/* Active Drawing Wire */}
        {wireStart && wireCurrent && (
          <path
            d={`M ${wireStart.x} ${wireStart.y} C ${wireStart.x + Math.abs(wireCurrent.x - wireStart.x) * 0.5 + 20} ${
              wireStart.y
            }, ${wireCurrent.x - Math.abs(wireCurrent.x - wireStart.x) * 0.5 - 20} ${wireCurrent.y}, ${wireCurrent.x} ${
              wireCurrent.y
            }`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />
        )}
      </svg>

      {/* Nodes Layer */}
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {graph.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isV1 = viewer1NodeId === node.id;
          const isV2 = viewer2NodeId === node.id;
          const colors = getNodeColor(node.type);

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              onMouseDown={(e) => {
                if (e.button === 0 && !isSpacePressed) {
                  e.stopPropagation();
                  setDraggedNodeId(node.id);
                  setDragOffset({
                    x: (e.clientX - pan.x) / zoom - node.x,
                    y: (e.clientY - pan.y) / zoom - node.y,
                  });
                  onSelectNode(node.id);
                }
              }}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: '160px',
              }}
              className={`absolute rounded-lg border shadow-xl transition-shadow ${
                isSelected
                  ? 'border-blue-400 ring-2 ring-blue-500/40 shadow-blue-500/20'
                  : 'border-[#2d3142] hover:border-slate-500'
              } ${node.bypass ? 'opacity-60 grayscale' : 'opacity-100'} bg-[#161822] cursor-move`}
            >
              {/* Node Header */}
              <div
                className="flex items-center justify-between px-2 py-1.5 rounded-t-lg border-b border-[#2d3142]"
                style={{ backgroundColor: colors.bg }}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span style={{ color: colors.border }}>{getNodeIcon(node.type)}</span>
                  <span className="text-[11px] font-bold text-white truncate">{node.title}</span>
                </div>

                {/* Viewer 1 & 2 indicators & bypass */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetViewer1(node.id);
                    }}
                    className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-colors ${
                      isV1 ? 'bg-cyan-500 text-black shadow-sm' : 'bg-[#232737] text-slate-400 hover:text-white'
                    }`}
                    title="Output to Viewer 1 (Key: 1)"
                  >
                    1
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetViewer2(node.id);
                    }}
                    className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-colors ${
                      isV2 ? 'bg-amber-500 text-black shadow-sm' : 'bg-[#232737] text-slate-400 hover:text-white'
                    }`}
                    title="Output to Viewer 2 (Key: 2)"
                  >
                    2
                  </button>
                </div>
              </div>

              {/* Node Body & Ports */}
              <div className="relative py-3 px-2 flex items-center justify-between min-h-[46px]">
                {/* Inputs (Left side) */}
                <div className="flex flex-col gap-2 -ml-3.5">
                  {node.inputs.map((inp) => (
                    <div
                      key={inp.id}
                      onMouseUp={(e) => handleEndWire(e, node, inp.id, 'input')}
                      className="group flex items-center gap-1"
                      title={`Input: ${inp.name}`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 border-[#161822] ${
                          inp.type === 'mask' ? 'bg-purple-500' : 'bg-blue-400'
                        } hover:scale-125 transition-transform cursor-crosshair`}
                      />
                      <span className="text-[9px] text-slate-400 font-mono hidden group-hover:block ml-0.5">
                        {inp.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Center Node Status / Type */}
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] text-[#71778f] uppercase tracking-wider font-mono">
                    {node.type.replace('_', ' ')}
                  </span>
                  {node.bypass && (
                    <span className="text-[9px] text-amber-400 font-semibold font-mono">BYPASSED</span>
                  )}
                </div>

                {/* Outputs (Right side) */}
                <div className="flex flex-col gap-2 -mr-3.5">
                  {node.outputs.map((out) => (
                    <div
                      key={out.id}
                      onMouseDown={(e) => handleStartWire(e, node, out.id, out.type, 'output')}
                      className="group flex items-center gap-1 flex-row-reverse"
                      title={`Output: ${out.name}`}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 border-[#161822] bg-emerald-400 hover:scale-125 transition-transform cursor-crosshair"
                      />
                      <span className="text-[9px] text-slate-400 font-mono hidden group-hover:block mr-0.5">
                        {out.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Quick Actions (Bypass & Delete) */}
              <div className="px-2 py-1 bg-[#12141c] rounded-b-lg border-t border-[#232634] flex items-center justify-between text-[10px] text-slate-400">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBypass(node.id);
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#222533] ${
                    node.bypass ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Bypass (Key: D)"
                >
                  {node.bypass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{node.bypass ? 'Off' : 'Active'}</span>
                </button>

                {node.type !== 'media_in' && node.type !== 'media_out' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-[#222533]"
                    title="Delete Node"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Node Quick Search Palette (Tab / Shift+A) */}
      {isAddMenuOpen && (
        <div
          className="absolute z-50 w-72 rounded-xl border border-[#2b2e3e] bg-[#141620]/95 p-3 shadow-2xl backdrop-blur-xl"
          style={{ left: addMenuPos.x, top: addMenuPos.y }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#252838]">
            <span className="text-xs font-bold text-white">SELECT TOOL / NODE</span>
            <button
              onClick={() => setIsAddMenuOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            autoFocus
            placeholder="Type tool name (e.g. Blur, Keyer)..."
            value={addMenuSearch}
            onChange={(e) => setAddMenuSearch(e.target.value)}
            className="w-full mt-2 px-3 py-1.5 bg-[#1b1e2b] border border-[#2e3244] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />

          <div className="mt-2 max-h-60 overflow-y-auto flex flex-col gap-1">
            {NODE_TEMPLATES.filter(
              (t) =>
                t.title.toLowerCase().includes(addMenuSearch.toLowerCase()) ||
                t.category.toLowerCase().includes(addMenuSearch.toLowerCase()) ||
                t.description.toLowerCase().includes(addMenuSearch.toLowerCase())
            ).map((template) => (
              <button
                key={template.type}
                onClick={() => addNodeFromTemplate(template)}
                className="flex flex-col items-start p-2 rounded-lg hover:bg-[#202332] text-left transition-colors border border-transparent hover:border-[#2f3448]"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-white">{template.title}</span>
                  <span className="text-[10px] text-blue-400 font-mono">{template.category}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
