import { CompositorNode, NodeConnection, NodeGraph, NodeData } from '../types/editor';

// Default starter node graph
export function createDefaultNodeGraph(id: string, name: string): NodeGraph {
  const mediaIn: CompositorNode = {
    id: 'node-media-in',
    type: 'media_in',
    title: 'MediaIn 1',
    x: 80,
    y: 180,
    inputs: [],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
    bypass: false,
    data: {},
    isViewer1: true,
  };

  const chromaKey: CompositorNode = {
    id: 'node-chroma-key',
    type: 'chroma_key',
    title: 'DeltaKeyer 1',
    x: 280,
    y: 180,
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Matte Out', type: 'image', direction: 'output' }],
    bypass: false,
    data: {
      keyColor: '#00ff00',
      tolerance: 0.42,
      softness: 0.15,
      despill: 0.7,
    },
  };

  const colorGrade: CompositorNode = {
    id: 'node-color-grade',
    type: 'color_grade',
    title: 'ColorCorrector 1',
    x: 480,
    y: 180,
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Color Out', type: 'image', direction: 'output' }],
    bypass: false,
    data: {
      liftR: 0,
      liftG: 0,
      liftB: 0,
      gammaR: 0,
      gammaG: 0,
      gammaB: 0,
      gainR: 0.05,
      gainG: 0.02,
      gainB: -0.04,
      exposure: 0.2,
      contrast: 1.15,
      saturation: 1.25,
      temperature: 8,
      tint: -4,
    },
  };

  const glowNode: CompositorNode = {
    id: 'node-glow',
    type: 'glow',
    title: 'SoftGlow 1',
    x: 680,
    y: 180,
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Glow Out', type: 'image', direction: 'output' }],
    bypass: false,
    data: {
      glowIntensity: 0.6,
      glowThreshold: 0.7,
    },
  };

  const mediaOut: CompositorNode = {
    id: 'node-media-out',
    type: 'media_out',
    title: 'MediaOut 1',
    x: 880,
    y: 180,
    inputs: [{ id: 'in-img', name: 'Input', type: 'image', direction: 'input' }],
    outputs: [],
    bypass: false,
    data: {},
    isViewer2: true,
  };

  const connections: NodeConnection[] = [
    {
      id: 'conn-1',
      fromNodeId: 'node-media-in',
      fromPortId: 'out-img',
      toNodeId: 'node-chroma-key',
      toPortId: 'in-img',
    },
    {
      id: 'conn-2',
      fromNodeId: 'node-chroma-key',
      fromPortId: 'out-img',
      toNodeId: 'node-color-grade',
      toPortId: 'in-img',
    },
    {
      id: 'conn-3',
      fromNodeId: 'node-color-grade',
      fromPortId: 'out-img',
      toNodeId: 'node-glow',
      toPortId: 'in-img',
    },
    {
      id: 'conn-4',
      fromNodeId: 'node-glow',
      fromPortId: 'out-img',
      toNodeId: 'node-media-out',
      toPortId: 'in-img',
    },
  ];

  return {
    id,
    name,
    nodes: [mediaIn, chromaKey, colorGrade, glowNode, mediaOut],
    connections,
  };
}

// Available Node Templates for adding into the graph
export interface NodeTemplate {
  type: CompositorNode['type'];
  title: string;
  category: 'Color' | 'Composite' | 'Filter' | 'Transform' | 'Generate';
  description: string;
  defaultData: NodeData;
  inputs: { id: string; name: string; type: 'image' | 'mask'; direction: 'input' }[];
  outputs: { id: string; name: string; type: 'image' | 'mask'; direction: 'output' }[];
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'color_grade',
    title: 'ColorCorrector',
    category: 'Color',
    description: 'Lift / Gamma / Gain wheels, exposure, contrast, temperature and saturation.',
    defaultData: {
      liftR: 0,
      liftG: 0,
      liftB: 0,
      gammaR: 0,
      gammaG: 0,
      gammaB: 0,
      gainR: 0,
      gainG: 0,
      gainB: 0,
      exposure: 0,
      contrast: 1.0,
      saturation: 1.0,
      temperature: 0,
      tint: 0,
    },
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
  {
    type: 'chroma_key',
    title: 'DeltaKeyer',
    category: 'Composite',
    description: 'Professional green/blue screen extraction with edge despill and matte softness.',
    defaultData: {
      keyColor: '#00ff00',
      tolerance: 0.42,
      softness: 0.15,
      despill: 0.7,
    },
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
  {
    type: 'transform',
    title: 'Transform',
    category: 'Transform',
    description: '2D spatial transformation: position, scale, rotation, and axis inversion.',
    defaultData: {
      posX: 0,
      posY: 0,
      scale: 1.0,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
  {
    type: 'blur',
    title: 'GaussianBlur',
    category: 'Filter',
    description: 'High-speed cinematic gaussian blur filter.',
    defaultData: {
      blurRadius: 12,
    },
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
  {
    type: 'glow',
    title: 'SoftGlow',
    category: 'Filter',
    description: 'Organic optical bloom with luminance threshold and diffusion.',
    defaultData: {
      glowIntensity: 0.75,
      glowThreshold: 0.65,
    },
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
  {
    type: 'vignette',
    title: 'Vignette',
    category: 'Filter',
    description: 'Lens falloff shading to draw focus toward screen center.',
    defaultData: {
      vignetteAmount: 0.65,
      vignetteFeather: 0.5,
    },
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
  {
    type: 'mask',
    title: 'PowerWindow Mask',
    category: 'Transform',
    description: 'Feathered elliptical or rectangular matte mask for localized color & effects.',
    defaultData: {
      maskShape: 'ellipse',
      maskRadiusX: 0.4,
      maskRadiusY: 0.4,
      maskFeather: 0.25,
      maskInvert: false,
    },
    inputs: [{ id: 'in-img', name: 'Source', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Matte Out', type: 'image', direction: 'output' }],
  },
  {
    type: 'text_title',
    title: 'TextPlus',
    category: 'Generate',
    description: 'Motion graphic title layer with typography styling and shadow.',
    defaultData: {
      text: 'CINEMATIC SEQUENCE',
      fontSize: 48,
      textColor: '#ffffff',
      fontFamily: 'Plus Jakarta Sans',
      textShadow: true,
    },
    inputs: [{ id: 'in-img', name: 'Background', type: 'image', direction: 'input' }],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
  {
    type: 'merge_blend',
    title: 'Merge',
    category: 'Composite',
    description: 'Layer compositing node with Screen, Multiply, Overlay, and Add blend modes.',
    defaultData: {
      blendMode: 'over',
      blendMix: 1.0,
    },
    inputs: [
      { id: 'in-bg', name: 'Background', type: 'image', direction: 'input' },
      { id: 'in-fg', name: 'Foreground', type: 'image', direction: 'input' },
    ],
    outputs: [{ id: 'out-img', name: 'Output', type: 'image', direction: 'output' }],
  },
];

// Execute Node Graph and Render into Target Canvas
export function renderNodeGraphToCanvas(
  targetCanvas: HTMLCanvasElement,
  graph: NodeGraph,
  sourceCanvas: HTMLCanvasElement,
  targetNodeId?: string // If supplied, render specifically up to this node!
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const width = targetCanvas.width;
  const height = targetCanvas.height;

  // We maintain a cache of rendered node canvases
  const nodeCanvasCache = new Map<string, HTMLCanvasElement>();

  // Topological sorting of nodes
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find incoming connections
    const incoming = graph.connections.filter((c) => c.toNodeId === nodeId);
    for (const conn of incoming) {
      visit(conn.fromNodeId);
    }
    order.push(nodeId);
  }

  // Target node: if specified, trace back from it; otherwise trace back from MediaOut
  let terminalNodeId = targetNodeId;
  if (!terminalNodeId) {
    const mediaOut = graph.nodes.find((n) => n.type === 'media_out');
    terminalNodeId = mediaOut ? mediaOut.id : graph.nodes[graph.nodes.length - 1]?.id;
  }

  if (terminalNodeId) {
    visit(terminalNodeId);
  } else {
    // If empty graph, just copy source
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    return;
  }

  // Helper to create an offscreen canvas
  function createBuffer(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }

  // Process nodes in topological order
  for (const nodeId of order) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const buffer = createBuffer();
    const bCtx = buffer.getContext('2d');
    if (!bCtx) continue;

    // If node is bypassed, simply pass through input buffer
    if (node.bypass) {
      const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
      if (incoming && nodeCanvasCache.has(incoming.fromNodeId)) {
        bCtx.drawImage(nodeCanvasCache.get(incoming.fromNodeId)!, 0, 0, width, height);
      } else {
        bCtx.drawImage(sourceCanvas, 0, 0, width, height);
      }
      nodeCanvasCache.set(nodeId, buffer);
      continue;
    }

    switch (node.type) {
      case 'media_in': {
        bCtx.drawImage(sourceCanvas, 0, 0, width, height);
        break;
      }

      case 'media_out': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        if (incoming && nodeCanvasCache.has(incoming.fromNodeId)) {
          bCtx.drawImage(nodeCanvasCache.get(incoming.fromNodeId)!, 0, 0, width, height);
        } else {
          bCtx.drawImage(sourceCanvas, 0, 0, width, height);
        }
        break;
      }

      case 'chroma_key': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        bCtx.drawImage(inputImg, 0, 0, width, height);

        // Pixel-level keying
        const imgData = bCtx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const tolerance = (node.data.tolerance ?? 0.4) * 255;
        const softness = (node.data.softness ?? 0.15) * 255;
        const despill = node.data.despill ?? 0.7;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Green keying metric: green dominance over red and blue
          const maxRB = Math.max(r, b);
          const greenDiff = g - maxRB;

          if (greenDiff > tolerance - softness) {
            if (greenDiff >= tolerance) {
              // Completely keyed out
              data[i + 3] = 0;
            } else {
              // Soft edge falloff
              const alphaRatio = 1 - (greenDiff - (tolerance - softness)) / softness;
              data[i + 3] = Math.floor(data[i + 3] * Math.max(0, Math.min(1, alphaRatio)));
            }
          }

          // Despill: suppress green reflection on edges
          if (g > maxRB && data[i + 3] > 0) {
            data[i + 1] = Math.floor(g * (1 - despill) + maxRB * despill);
          }
        }
        bCtx.putImageData(imgData, 0, 0);
        break;
      }

      case 'color_grade': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        bCtx.drawImage(inputImg, 0, 0, width, height);

        const imgData = bCtx.getImageData(0, 0, width, height);
        const d = imgData.data;

        const liftR = (node.data.liftR ?? 0) * 80;
        const liftG = (node.data.liftG ?? 0) * 80;
        const liftB = (node.data.liftB ?? 0) * 80;
        const gainR = 1 + (node.data.gainR ?? 0);
        const gainG = 1 + (node.data.gainG ?? 0);
        const gainB = 1 + (node.data.gainB ?? 0);
        const exposureMult = Math.pow(2, node.data.exposure ?? 0);
        const contrast = node.data.contrast ?? 1.0;
        const saturation = node.data.saturation ?? 1.0;
        const temp = (node.data.temperature ?? 0) * 0.5;
        const tint = (node.data.tint ?? 0) * 0.5;

        for (let i = 0; i < d.length; i += 4) {
          let r = d[i];
          let g = d[i + 1];
          let b = d[i + 2];

          // 1. Exposure & Gain
          r = r * exposureMult * gainR + liftR;
          g = g * exposureMult * gainG + liftG;
          b = b * exposureMult * gainB + liftB;

          // 2. Temperature & Tint
          r += temp;
          b -= temp;
          g += tint;

          // 3. Contrast around midpoint 128
          r = (r - 128) * contrast + 128;
          g = (g - 128) * contrast + 128;
          b = (b - 128) * contrast + 128;

          // 4. Saturation
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          r = luma + (r - luma) * saturation;
          g = luma + (g - luma) * saturation;
          b = luma + (b - luma) * saturation;

          d[i] = Math.max(0, Math.min(255, r));
          d[i + 1] = Math.max(0, Math.min(255, g));
          d[i + 2] = Math.max(0, Math.min(255, b));
        }

        bCtx.putImageData(imgData, 0, 0);
        break;
      }

      case 'blur': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        const r = node.data.blurRadius ?? 10;
        bCtx.filter = `blur(${r}px)`;
        bCtx.drawImage(inputImg, 0, 0, width, height);
        bCtx.filter = 'none';
        break;
      }

      case 'glow': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        // Base image
        bCtx.drawImage(inputImg, 0, 0, width, height);

        // Additive blurred bloom
        const intensity = node.data.glowIntensity ?? 0.6;
        bCtx.save();
        bCtx.globalCompositeOperation = 'screen';
        bCtx.filter = `blur(18px) brightness(${1 + intensity})`;
        bCtx.globalAlpha = Math.min(1, intensity);
        bCtx.drawImage(inputImg, 0, 0, width, height);
        bCtx.restore();
        break;
      }

      case 'transform': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        const posX = (node.data.posX ?? 0) * (width / 2);
        const posY = (node.data.posY ?? 0) * (height / 2);
        const scale = node.data.scale ?? 1.0;
        const rot = ((node.data.rotation ?? 0) * Math.PI) / 180;
        const flipH = node.data.flipH ? -1 : 1;
        const flipV = node.data.flipV ? -1 : 1;

        bCtx.save();
        bCtx.translate(width / 2 + posX, height / 2 + posY);
        bCtx.rotate(rot);
        bCtx.scale(scale * flipH, scale * flipV);
        bCtx.drawImage(inputImg, -width / 2, -height / 2, width, height);
        bCtx.restore();
        break;
      }

      case 'vignette': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        bCtx.drawImage(inputImg, 0, 0, width, height);

        const amount = node.data.vignetteAmount ?? 0.6;
        const radius = Math.max(width, height) * 0.7;
        const vigGrad = bCtx.createRadialGradient(width / 2, height / 2, radius * 0.3, width / 2, height / 2, radius);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${amount})`);

        bCtx.fillStyle = vigGrad;
        bCtx.fillRect(0, 0, width, height);
        break;
      }

      case 'mask': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        bCtx.drawImage(inputImg, 0, 0, width, height);

        // Power window mask clipping
        const shape = node.data.maskShape ?? 'ellipse';
        const rx = (node.data.maskRadiusX ?? 0.4) * (width / 2);
        const ry = (node.data.maskRadiusY ?? 0.4) * (height / 2);
        const invert = node.data.maskInvert ?? false;

        bCtx.save();
        bCtx.globalCompositeOperation = invert ? 'destination-out' : 'destination-in';
        bCtx.beginPath();
        if (shape === 'ellipse') {
          bCtx.ellipse(width / 2, height / 2, rx, ry, 0, 0, Math.PI * 2);
        } else {
          bCtx.rect(width / 2 - rx, height / 2 - ry, rx * 2, ry * 2);
        }
        bCtx.fillStyle = '#ffffff';
        bCtx.fill();
        bCtx.restore();
        break;
      }

      case 'text_title': {
        const incoming = graph.connections.find((c) => c.toNodeId === nodeId);
        const inputImg = incoming && nodeCanvasCache.has(incoming.fromNodeId)
          ? nodeCanvasCache.get(incoming.fromNodeId)!
          : sourceCanvas;

        bCtx.drawImage(inputImg, 0, 0, width, height);

        const text = node.data.text || 'CINEMATIC SEQUENCE';
        const fontSize = node.data.fontSize || 42;
        const textColor = node.data.textColor || '#ffffff';

        bCtx.save();
        bCtx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';

        if (node.data.textShadow) {
          bCtx.shadowColor = 'rgba(0,0,0,0.85)';
          bCtx.shadowBlur = 16;
          bCtx.shadowOffsetX = 0;
          bCtx.shadowOffsetY = 4;
        }

        bCtx.fillStyle = textColor;
        bCtx.fillText(text, width / 2, height / 2);
        bCtx.restore();
        break;
      }

      case 'merge_blend': {
        const bgConn = graph.connections.find((c) => c.toNodeId === nodeId && c.toPortId === 'in-bg');
        const fgConn = graph.connections.find((c) => c.toNodeId === nodeId && c.toPortId === 'in-fg');

        const bgImg = bgConn && nodeCanvasCache.has(bgConn.fromNodeId)
          ? nodeCanvasCache.get(bgConn.fromNodeId)!
          : sourceCanvas;

        const fgImg = fgConn && nodeCanvasCache.has(fgConn.fromNodeId)
          ? nodeCanvasCache.get(fgConn.fromNodeId)!
          : null;

        bCtx.drawImage(bgImg, 0, 0, width, height);

        if (fgImg) {
          bCtx.save();
          const mode = node.data.blendMode || 'over';
          if (mode === 'screen') bCtx.globalCompositeOperation = 'screen';
          else if (mode === 'multiply') bCtx.globalCompositeOperation = 'multiply';
          else if (mode === 'add') bCtx.globalCompositeOperation = 'lighter';
          else if (mode === 'overlay') bCtx.globalCompositeOperation = 'overlay';
          else bCtx.globalCompositeOperation = 'source-over';

          bCtx.globalAlpha = node.data.blendMix ?? 1.0;
          bCtx.drawImage(fgImg, 0, 0, width, height);
          bCtx.restore();
        }
        break;
      }
    }

    nodeCanvasCache.set(nodeId, buffer);
  }

  // Draw final result buffer to target canvas
  const finalCanvas = terminalNodeId ? nodeCanvasCache.get(terminalNodeId) : null;
  if (finalCanvas) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(finalCanvas, 0, 0, width, height);
  } else {
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
  }
}
