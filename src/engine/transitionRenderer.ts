import { TransitionType } from '../types/editor';

export interface TransitionDescriptor {
  type: TransitionType;
  name: string;
  category: 'Dissolve' | 'Wipe' | 'Slide' | 'Stylized';
  description: string;
  defaultDuration: number;
}

export const TRANSITION_LIBRARY: TransitionDescriptor[] = [
  {
    type: 'cross_dissolve',
    name: 'Cross Dissolve',
    category: 'Dissolve',
    description: 'Classic cinema standard linear luminance cross-fade between outgoing and incoming clips.',
    defaultDuration: 1.0,
  },
  {
    type: 'dip_black',
    name: 'Dip to Black',
    category: 'Dissolve',
    description: 'Fades outgoing clip down to solid black, then fades up into incoming clip.',
    defaultDuration: 1.2,
  },
  {
    type: 'dip_white',
    name: 'Dip to White',
    category: 'Dissolve',
    description: 'High-energy camera flash transition that dissolves through pure white.',
    defaultDuration: 0.8,
  },
  {
    type: 'wipe_left',
    name: 'Wipe Left',
    category: 'Wipe',
    description: 'Directional horizontal wipe revealing the incoming clip from right to left.',
    defaultDuration: 1.0,
  },
  {
    type: 'wipe_right',
    name: 'Wipe Right',
    category: 'Wipe',
    description: 'Classic motion wipe traversing across the frame from left to right.',
    defaultDuration: 1.0,
  },
  {
    type: 'slide_left',
    name: 'Push Slide',
    category: 'Slide',
    description: 'Incoming clip dynamically pushes the outgoing clip off the canvas.',
    defaultDuration: 0.9,
  },
  {
    type: 'glitch',
    name: 'Optical Glitch',
    category: 'Stylized',
    description: 'Digital chromatic aberration and RGB split with horizontal signal noise.',
    defaultDuration: 0.7,
  },
];

// Blend Buffer A and Buffer B according to transition type and progress (0.0 to 1.0)
export function renderTransitionBlend(
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bufferA: HTMLCanvasElement,
  bufferB: HTMLCanvasElement,
  type: TransitionType,
  progress: number // 0.0 at transition start, 1.0 at transition end
) {
  const p = Math.max(0, Math.min(1, progress));
  targetCtx.clearRect(0, 0, width, height);

  switch (type) {
    case 'cross_dissolve': {
      // Draw Outgoing Clip A
      targetCtx.save();
      targetCtx.globalAlpha = 1.0;
      targetCtx.drawImage(bufferA, 0, 0, width, height);

      // Draw Incoming Clip B with increasing alpha
      targetCtx.globalAlpha = p;
      targetCtx.drawImage(bufferB, 0, 0, width, height);
      targetCtx.restore();
      break;
    }

    case 'dip_black': {
      targetCtx.save();
      if (p <= 0.5) {
        // Fade A to black
        const alpha = 1 - p * 2;
        targetCtx.fillStyle = '#000000';
        targetCtx.fillRect(0, 0, width, height);
        targetCtx.globalAlpha = alpha;
        targetCtx.drawImage(bufferA, 0, 0, width, height);
      } else {
        // Fade B from black
        const alpha = (p - 0.5) * 2;
        targetCtx.fillStyle = '#000000';
        targetCtx.fillRect(0, 0, width, height);
        targetCtx.globalAlpha = alpha;
        targetCtx.drawImage(bufferB, 0, 0, width, height);
      }
      targetCtx.restore();
      break;
    }

    case 'dip_white': {
      targetCtx.save();
      if (p <= 0.5) {
        // Fade A into pure white flash
        targetCtx.drawImage(bufferA, 0, 0, width, height);
        targetCtx.fillStyle = '#ffffff';
        targetCtx.globalAlpha = p * 2;
        targetCtx.fillRect(0, 0, width, height);
      } else {
        // Fade B from white flash
        targetCtx.drawImage(bufferB, 0, 0, width, height);
        targetCtx.fillStyle = '#ffffff';
        targetCtx.globalAlpha = (1 - p) * 2;
        targetCtx.fillRect(0, 0, width, height);
      }
      targetCtx.restore();
      break;
    }

    case 'wipe_left': {
      targetCtx.save();
      // Draw buffer A underneath
      targetCtx.drawImage(bufferA, 0, 0, width, height);

      // Clip and draw buffer B coming in from right
      const revealX = width * (1 - p);
      targetCtx.beginPath();
      targetCtx.rect(revealX, 0, width - revealX, height);
      targetCtx.clip();
      targetCtx.drawImage(bufferB, 0, 0, width, height);

      // Subtle edge line
      targetCtx.restore();
      targetCtx.save();
      targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      targetCtx.lineWidth = 2;
      targetCtx.beginPath();
      targetCtx.moveTo(revealX, 0);
      targetCtx.lineTo(revealX, height);
      targetCtx.stroke();
      targetCtx.restore();
      break;
    }

    case 'wipe_right': {
      targetCtx.save();
      // Draw buffer A underneath
      targetCtx.drawImage(bufferA, 0, 0, width, height);

      // Clip and draw buffer B coming in from left
      const revealW = width * p;
      targetCtx.beginPath();
      targetCtx.rect(0, 0, revealW, height);
      targetCtx.clip();
      targetCtx.drawImage(bufferB, 0, 0, width, height);

      // Subtle edge line
      targetCtx.restore();
      targetCtx.save();
      targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      targetCtx.lineWidth = 2;
      targetCtx.beginPath();
      targetCtx.moveTo(revealW, 0);
      targetCtx.lineTo(revealW, height);
      targetCtx.stroke();
      targetCtx.restore();
      break;
    }

    case 'slide_left': {
      targetCtx.save();
      // Buffer A slides left
      const offsetX = -p * width;
      targetCtx.drawImage(bufferA, offsetX, 0, width, height);

      // Buffer B pushes in from right
      targetCtx.drawImage(bufferB, offsetX + width, 0, width, height);

      // Seam shadow
      const grad = targetCtx.createLinearGradient(offsetX + width - 20, 0, offsetX + width, 0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      targetCtx.fillStyle = grad;
      targetCtx.fillRect(offsetX + width - 20, 0, 20, height);
      targetCtx.restore();
      break;
    }

    case 'glitch': {
      // Optical Glitch: Chromatic RGB Split & Digital Slices
      targetCtx.save();

      // Pick source frame: Buffer A during first half, Buffer B during second half
      const activeBuf = p < 0.5 ? bufferA : bufferB;
      const intensity = Math.sin(p * Math.PI); // peak glitch at midpoint

      targetCtx.drawImage(activeBuf, 0, 0, width, height);

      if (intensity > 0.05) {
        // Red channel offset
        const redOffset = Math.sin(p * 24) * 25 * intensity;
        targetCtx.globalCompositeOperation = 'screen';
        targetCtx.drawImage(activeBuf, redOffset, 0, width, height);

        // Blue channel offset
        const blueOffset = -Math.cos(p * 18) * 20 * intensity;
        targetCtx.drawImage(activeBuf, blueOffset, 0, width, height);

        // Horizontal glitch bars
        targetCtx.globalCompositeOperation = 'source-over';
        targetCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let y = 0; y < height; y += 32) {
          if (Math.sin(y + p * 50) > 0.4) {
            const barH = 4 + (y % 12);
            const sliceOffset = Math.sin(y * 0.1 + p * 20) * 40 * intensity;
            targetCtx.drawImage(activeBuf, 0, y, width, barH, sliceOffset, y, width, barH);
          }
        }
      }

      targetCtx.restore();
      break;
    }

    default: {
      targetCtx.drawImage(p < 0.5 ? bufferA : bufferB, 0, 0, width, height);
    }
  }
}
