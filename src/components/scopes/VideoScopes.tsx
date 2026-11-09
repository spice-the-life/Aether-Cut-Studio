import React, { useRef, useEffect, useState } from 'react';

interface VideoScopesProps {
  sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoScopes: React.FC<VideoScopesProps> = ({ sourceCanvasRef, isOpen, onClose }) => {
  const [scopeType, setScopeType] = useState<'waveform' | 'parade' | 'vectorscope' | 'histogram'>('waveform');
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let animId: number;

    const renderScope = () => {
      const srcCanvas = sourceCanvasRef.current;
      const scopeCanvas = scopeCanvasRef.current;
      if (!srcCanvas || !scopeCanvas) {
        animId = requestAnimationFrame(renderScope);
        return;
      }

      const sCtx = srcCanvas.getContext('2d');
      const ctx = scopeCanvas.getContext('2d');
      if (!sCtx || !ctx) {
        animId = requestAnimationFrame(renderScope);
        return;
      }

      const sw = srcCanvas.width;
      const sh = srcCanvas.height;
      if (sw === 0 || sh === 0) {
        animId = requestAnimationFrame(renderScope);
        return;
      }

      // Sample a downscaled image for 60fps performance
      const sampleW = 160;
      const sampleH = 90;
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const oCtx = offscreen.getContext('2d');
      if (!oCtx) {
        animId = requestAnimationFrame(renderScope);
        return;
      }

      oCtx.drawImage(srcCanvas, 0, 0, sampleW, sampleH);
      const imgData = oCtx.getImageData(0, 0, sampleW, sampleH);
      const data = imgData.data;

      const cw = scopeCanvas.width;
      const ch = scopeCanvas.height;

      // Clear dark scope background
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, cw, ch);

      if (scopeType === 'waveform') {
        // Draw IRE grid lines (0, 25, 50, 75, 100 IRE)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

        const ireLevels = [100, 75, 50, 25, 0];
        ireLevels.forEach((ire) => {
          const y = Math.floor(ch - (ire / 100) * (ch - 24) - 12);
          ctx.beginPath();
          ctx.moveTo(30, y);
          ctx.lineTo(cw - 8, y);
          ctx.stroke();
          ctx.fillText(`${ire}`, 6, y + 3);
        });

        // Plot luma points
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        const usableH = ch - 24;
        for (let y = 0; y < sampleH; y++) {
          for (let x = 0; x < sampleW; x++) {
            const idx = (y * sampleW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            const px = 30 + (x / sampleW) * (cw - 38);
            const py = ch - 12 - luma * usableH;
            ctx.fillRect(px, py, 1.5, 1.5);
          }
        }
      } else if (scopeType === 'parade') {
        // RGB Parade: Red, Green, Blue in 3 columns
        const colW = (cw - 36) / 3;
        const usableH = ch - 24;

        // Column lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        [0, 1, 2].forEach((cIdx) => {
          const xStart = 30 + cIdx * colW;
          ctx.strokeRect(xStart, 12, colW - 6, usableH);

          // Labels
          ctx.font = '10px "JetBrains Mono", monospace';
          const names = ['RED', 'GREEN', 'BLUE'];
          const colors = ['#f87171', '#4ade80', '#60a5fa'];
          ctx.fillStyle = colors[cIdx];
          ctx.fillText(names[cIdx], xStart + 8, 24);
        });

        // Draw points for each channel
        for (let y = 0; y < sampleH; y++) {
          for (let x = 0; x < sampleW; x++) {
            const idx = (y * sampleW + x) * 4;
            const r = data[idx] / 255;
            const g = data[idx + 1] / 255;
            const b = data[idx + 2] / 255;

            const relX = (x / sampleW) * (colW - 12);

            // Red
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(30 + relX, ch - 12 - r * usableH, 1.2, 1.2);

            // Green
            ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
            ctx.fillRect(30 + colW + relX, ch - 12 - g * usableH, 1.2, 1.2);

            // Blue
            ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
            ctx.fillRect(30 + colW * 2 + relX, ch - 12 - b * usableH, 1.2, 1.2);
          }
        }
      } else if (scopeType === 'vectorscope') {
        // Vectorscope polar plot
        const cx = cw / 2;
        const cy = ch / 2;
        const radius = Math.min(cx, cy) - 24;

        // Concentric circles
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // Skin tone line (~57 degrees)
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.beginPath();
        const skinAngle = -0.99; // rad
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(skinAngle) * radius, cy + Math.sin(skinAngle) * radius);
        ctx.stroke();

        // Color targets: R, Mg, B, Cy, G, Yl
        const targets = [
          { name: 'R', angle: -0.65, color: '#ef4444' },
          { name: 'Mg', angle: -1.75, color: '#ec4899' },
          { name: 'B', angle: -2.85, color: '#3b82f6' },
          { name: 'Cy', angle: 2.45, color: '#06b6d4' },
          { name: 'G', angle: 1.4, color: '#22c55e' },
          { name: 'Yl', angle: 0.35, color: '#eab308' },
        ];
        ctx.font = '10px "JetBrains Mono", monospace';
        targets.forEach((t) => {
          const tx = cx + Math.cos(t.angle) * radius * 0.75;
          const ty = cy + Math.sin(t.angle) * radius * 0.75;
          ctx.strokeStyle = t.color;
          ctx.strokeRect(tx - 4, ty - 4, 8, 8);
          ctx.fillStyle = t.color;
          ctx.fillText(t.name, tx + 6, ty + 3);
        });

        // Plot UV points
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // YCbCr / UV conversion
          const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
          const v = 0.615 * r - 0.51499 * g - 0.10001 * b;

          const px = cx + (u / 128) * radius * 1.5;
          const py = cy - (v / 128) * radius * 1.5;
          ctx.fillRect(px, py, 1.5, 1.5);
        }
      } else {
        // Histogram: R, G, B bins
        const binsR = new Array(256).fill(0);
        const binsG = new Array(256).fill(0);
        const binsB = new Array(256).fill(0);

        for (let i = 0; i < data.length; i += 4) {
          binsR[data[i]]++;
          binsG[data[i + 1]]++;
          binsB[data[i + 2]]++;
        }

        const maxVal = Math.max(...binsR, ...binsG, ...binsB, 1);
        const usableW = cw - 36;
        const usableH = ch - 30;

        // Draw curves
        const drawChannel = (bins: number[], color: string) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 256; i++) {
            const x = 30 + (i / 255) * usableW;
            const h = (bins[i] / maxVal) * usableH;
            const y = ch - 12 - h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        };

        drawChannel(binsR, 'rgba(239, 68, 68, 0.8)');
        drawChannel(binsG, 'rgba(34, 197, 94, 0.8)');
        drawChannel(binsB, 'rgba(59, 130, 246, 0.8)');

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(30, 12, usableW, usableH);
      }

      animId = requestAnimationFrame(renderScope);
    };

    animId = requestAnimationFrame(renderScope);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, scopeType, sourceCanvasRef]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-4 z-40 w-96 rounded-xl border border-[#2b2e3a] bg-[#14161d]/95 p-3 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#262833]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-wide text-white">VIDEO SCOPES</span>
        </div>
        {/* Scope Type Tabs */}
        <div className="flex items-center gap-1 rounded bg-[#1c1e28] p-0.5">
          {(['waveform', 'parade', 'vectorscope', 'histogram'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setScopeType(type)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                scopeType === type ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#8e93a6] hover:text-white'
              }`}
            >
              {type === 'waveform' ? 'Wave' : type === 'parade' ? 'Parade' : type === 'vectorscope' ? 'Vector' : 'Hist'}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-xs text-[#8e93a6] hover:text-white px-1.5 py-0.5 rounded hover:bg-[#252835]"
        >
          ✕
        </button>
      </div>

      {/* Scope Canvas */}
      <div className="mt-2 overflow-hidden rounded-lg border border-[#222530] bg-[#0b0c10]">
        <canvas ref={scopeCanvasRef} width={360} height={200} className="w-full h-auto block" />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-[#6b7280]">
        <span>Calibration: Rec.709 Luma</span>
        <span>Real-Time 60 FPS</span>
      </div>
    </div>
  );
};
