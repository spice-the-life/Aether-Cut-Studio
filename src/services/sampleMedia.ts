import { MediaItem } from '../types/editor';

// Generate synthetic audio waveform bars
export function generateWaveform(sampleCount = 60, seed = 1): number[] {
  const bars: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const val =
      Math.sin(i * 0.15 * seed) * 0.4 +
      Math.sin(i * 0.35 + seed) * 0.3 +
      Math.random() * 0.3;
    bars.push(Math.max(0.08, Math.min(0.98, Math.abs(val))));
  }
  return bars;
}

// Generate high-fidelity canvas thumbnail for media items
export function generateThumbnailDataUrl(title: string, color: string, iconType: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Cinematic dark background gradient
  const grad = ctx.createLinearGradient(0, 0, 480, 270);
  grad.addColorStop(0, '#0a0b0e');
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, '#06070a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 270);

  // Subtle studio grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 480; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 270);
    ctx.stroke();
  }

  // Draw scene graphics
  if (iconType === 'greenscreen') {
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(240, 95, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(160, 270);
    ctx.quadraticCurveTo(240, 150, 320, 270);
    ctx.fill();
  } else if (iconType === 'city') {
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(240, 180, 100, 0, Math.PI, true);
    ctx.fill();
  } else if (iconType === 'nebula') {
    const radial = ctx.createRadialGradient(240, 135, 10, 240, 135, 120);
    radial.addColorStop(0, 'rgba(99, 102, 241, 0.7)');
    radial.addColorStop(0.6, 'rgba(30, 27, 75, 0.4)');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 480, 270);
  }

  // 16:9 Letterbox bar accents
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 480, 24);
  ctx.fillRect(0, 246, 480, 24);

  // Clean title in bottom bar
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 16, 262);

  return canvas.toDataURL('image/jpeg', 0.88);
}

// Draw dynamic video frames at timeline time `t`
export function drawSyntheticFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mediaId: string,
  time: number
) {
  ctx.save();

  if (mediaId === 'clip-greenscreen') {
    // Green screen background with cyber presenter
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, width, height);

    const sway = Math.sin(time * 2) * (width * 0.02);
    const headX = width * 0.5 + sway;
    const headY = height * 0.4;
    const headR = height * 0.12;

    ctx.fillStyle = '#1c1e24';
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(headX - headR * 1.8, height);
    ctx.quadraticCurveTo(headX, headY + headR * 0.8, headX + headR * 1.8, height);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.fillRect(headX - headR * 0.5, headY - 4, headR, 8);
  } else if (mediaId === 'clip-cyberpunk') {
    // Cyberpunk Tokyo City
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0b12');
    grad.addColorStop(0.6, '#1a102b');
    grad.addColorStop(1, '#070914');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.lineWidth = 1.5;
    const horizon = height * 0.65;
    const offset = (time * 80) % 40;

    for (let y = horizon; y < height; y += (y - horizon) * 0.25 + 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = -width; x < width * 2; x += 60) {
      ctx.beginPath();
      ctx.moveTo(width / 2, horizon);
      ctx.lineTo(x + offset, height);
      ctx.stroke();
    }

    const sunGrad = ctx.createRadialGradient(width / 2, horizon - 20, 5, width / 2, horizon - 20, height * 0.25);
    sunGrad.addColorStop(0, '#f43f5e');
    sunGrad.addColorStop(0.8, '#a855f7');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width / 2, horizon - 20, height * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#06070d';
    const buildingCount = 14;
    const bWidth = width / buildingCount;
    for (let i = 0; i < buildingCount; i++) {
      const bHeight = ((Math.sin(i * 1.7) + 1.2) * 0.5) * (height * 0.28);
      ctx.fillRect(i * bWidth, horizon - bHeight, bWidth + 2, bHeight);

      ctx.fillStyle = (i % 2 === 0) ? '#fde047' : '#38bdf8';
      for (let wy = horizon - bHeight + 10; wy < horizon - 10; wy += 14) {
        if (Math.sin(wy + i * 3) > 0) {
          ctx.fillRect(i * bWidth + 4, wy, 4, 6);
        }
      }
      ctx.fillStyle = '#06070d';
    }
  } else if (mediaId === 'clip-nebula') {
    // Deep Cosmic Nebula
    const grad = ctx.createRadialGradient(
      width * 0.5 + Math.sin(time) * 40,
      height * 0.5 + Math.cos(time * 0.8) * 30,
      20,
      width * 0.5,
      height * 0.5,
      width * 0.6
    );
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(0.4, '#1e1b4b');
    grad.addColorStop(1, '#030712');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const starCount = 60;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2 + time * 0.05;
      const dist = (i * 17) % (width * 0.45);
      const sx = width * 0.5 + Math.cos(angle) * dist;
      const sy = height * 0.5 + Math.sin(angle) * (dist * 0.6);
      const size = (i % 3) + 1;
      const alpha = 0.4 + Math.sin(time * 3 + i) * 0.4;
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1.0;
  } else if (mediaId === 'clip-falls') {
    // Mountain Falls
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0369a1');
    grad.addColorStop(0.4, '#0284c7');
    grad.addColorStop(0.7, '#064e3b');
    grad.addColorStop(1, '#022c22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const waterW = width * 0.18;
    const waterX = width * 0.41;
    ctx.fillRect(waterX, height * 0.3, waterW, height * 0.7);

    ctx.fillStyle = '#bae6fd';
    for (let i = 0; i < 20; i++) {
      const py = ((time * 300 + i * 40) % (height * 0.7)) + height * 0.3;
      const px = waterX + (i * 11) % waterW;
      ctx.fillRect(px, py, 3, 18);
    }
  } else {
    // Golden Hour Horizon
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#c2410c');
    grad.addColorStop(0.4, '#d97706');
    grad.addColorStop(0.65, '#075985');
    grad.addColorStop(1, '#082f49');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Initial Sample Media Library with Apple FCP Pro Clip Palettes
export const INITIAL_SAMPLE_MEDIA: MediaItem[] = [
  {
    id: 'clip-cyberpunk',
    name: 'Cyberpunk_City_4K.mov',
    type: 'video',
    duration: 24,
    fps: 24,
    resolution: { width: 3840, height: 2160 },
    color: '#24344d', // Professional Apple Space Slate
    thumbnailUrl: generateThumbnailDataUrl('Cyberpunk City 4K', '#1e293b', 'city'),
    sourceUrl: 'synthetic:clip-cyberpunk',
    tags: ['4K UHD', 'B-Roll', 'Cinematic'],
    waveformData: generateWaveform(60, 2),
  },
  {
    id: 'clip-greenscreen',
    name: 'SciFi_Hologram_Key.mov',
    type: 'video',
    duration: 18,
    fps: 24,
    resolution: { width: 3840, height: 2160 },
    color: '#1e3831', // Apple Deep Emerald
    thumbnailUrl: generateThumbnailDataUrl('SciFi Hologram Key', '#064e3b', 'greenscreen'),
    sourceUrl: 'synthetic:clip-greenscreen',
    tags: ['Chroma Key', 'VFX', 'Actor'],
    waveformData: generateWaveform(50, 4),
  },
  {
    id: 'clip-nebula',
    name: 'Deep_Space_Nebula.mov',
    type: 'video',
    duration: 30,
    fps: 24,
    resolution: { width: 3840, height: 2160 },
    color: '#2a2842', // Apple Deep Obsidian Indigo
    thumbnailUrl: generateThumbnailDataUrl('Deep Space Nebula', '#1e1b4b', 'nebula'),
    sourceUrl: 'synthetic:clip-nebula',
    tags: ['Space', 'Cosmic', '4K'],
    waveformData: generateWaveform(75, 5),
  },
  {
    id: 'clip-falls',
    name: 'Emerald_Falls_Drone.mov',
    type: 'video',
    duration: 20,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    color: '#1b3842', // Apple Muted Cyan Teal
    thumbnailUrl: generateThumbnailDataUrl('Emerald Falls Drone', '#0e7490', 'nature'),
    sourceUrl: 'synthetic:clip-falls',
    tags: ['Nature', 'Drone', 'FHD'],
    waveformData: generateWaveform(50, 7),
  },
  {
    id: 'clip-golden',
    name: 'Golden_Hour_Coast.mov',
    type: 'video',
    duration: 26,
    fps: 24,
    resolution: { width: 3840, height: 2160 },
    color: '#3d2e1c', // Apple Deep Bronze
    thumbnailUrl: generateThumbnailDataUrl('Golden Hour Coast', '#78350f', 'sunset'),
    sourceUrl: 'synthetic:clip-golden',
    tags: ['4K UHD', 'Landscape', 'Sunset'],
    waveformData: generateWaveform(65, 9),
  },
  {
    id: 'audio-cinematic-theme',
    name: 'Aether_Symphony_Theme.wav',
    type: 'audio',
    duration: 35,
    fps: 0,
    resolution: { width: 0, height: 0 },
    color: '#172b22', // Apple Forest Green
    thumbnailUrl: generateThumbnailDataUrl('Aether Symphony Theme', '#064e3b', 'audio'),
    sourceUrl: 'synthetic:audio-cinematic-theme',
    tags: ['Audio 48kHz', 'Soundtrack'],
    waveformData: generateWaveform(90, 11),
  },
  {
    id: 'audio-riser-whoosh',
    name: 'Cinematic_Impact_Whoosh.wav',
    type: 'audio',
    duration: 8,
    fps: 0,
    resolution: { width: 0, height: 0 },
    color: '#382024', // Apple Deep Ruby
    thumbnailUrl: generateThumbnailDataUrl('Cinematic Impact Whoosh', '#881337', 'audio'),
    sourceUrl: 'synthetic:audio-riser-whoosh',
    tags: ['SFX', 'Impact'],
    waveformData: generateWaveform(30, 13),
  },
];
