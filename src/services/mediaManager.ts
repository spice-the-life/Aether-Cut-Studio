import { MediaItem } from '../types/editor';
import { drawSyntheticFrame, generateThumbnailDataUrl } from './sampleMedia';

class MediaManager {
  private videoPool = new Map<string, HTMLVideoElement>();
  private imagePool = new Map<string, HTMLImageElement>();

  // Register an uploaded file and extract real metadata (duration, resolution, poster thumbnail)
  // Guaranteed never to hang by using strict race timeout and immediate fallback
  public async registerUploadedFile(file: File, id: string): Promise<Partial<MediaItem>> {
    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');
    const isAudio = file.type.startsWith('audio');
    const objectUrl = URL.createObjectURL(file);

    if (isVideo) {
      return new Promise((resolve) => {
        let hasResolved = false;

        const safeResolve = (data: Partial<MediaItem>) => {
          if (!hasResolved) {
            hasResolved = true;
            resolve(data);
          }
        };

        // Safety timeout: if browser iframe delays video seek, resolve immediately in 600ms
        const timer = setTimeout(() => {
          safeResolve({
            type: 'video',
            duration: 12,
            resolution: { width: 1920, height: 1080 },
            thumbnailUrl: generateThumbnailDataUrl(file.name, '#2563eb', 'city'),
            sourceUrl: objectUrl,
            isUploaded: true,
          });
        }, 650);

        try {
          const video = document.createElement('video');
          video.preload = 'auto';
          video.muted = true;
          video.playsInline = true;
          video.crossOrigin = 'anonymous';
          video.src = objectUrl;

          video.onloadedmetadata = () => {
            const duration = Math.max(1, video.duration || 10);
            const width = video.videoWidth || 1920;
            const height = video.videoHeight || 1080;

            // Attempt fast seek for frame extraction
            try {
              video.currentTime = Math.min(0.5, duration * 0.1);
            } catch {
              clearTimeout(timer);
              safeResolve({
                type: 'video',
                duration,
                resolution: { width, height },
                thumbnailUrl: generateThumbnailDataUrl(file.name, '#2563eb', 'city'),
                sourceUrl: objectUrl,
                videoElement: video,
                isUploaded: true,
              });
            }
          };

          video.onseeked = () => {
            clearTimeout(timer);
            let thumbnailUrl = '';
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 320;
              canvas.height = 180;
              const ctx = canvas.getContext('2d');
              if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                ctx.fillStyle = '#0f1118';
                ctx.fillRect(0, 0, 320, 180);

                const aspect = video.videoWidth / video.videoHeight;
                const targetAspect = 320 / 180;
                let dw = 320;
                let dh = 180;
                let dx = 0;
                let dy = 0;

                if (aspect > targetAspect) {
                  dh = 320 / aspect;
                  dy = (180 - dh) / 2;
                } else {
                  dw = 180 * aspect;
                  dx = (320 - dw) / 2;
                }

                ctx.drawImage(video, dx, dy, dw, dh);
                thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
              }
            } catch {
              // Canvas security or format fallback
            }

            this.videoPool.set(id, video);

            safeResolve({
              type: 'video',
              duration: Math.max(1, video.duration || 10),
              resolution: { width: video.videoWidth || 1920, height: video.videoHeight || 1080 },
              thumbnailUrl: thumbnailUrl || generateThumbnailDataUrl(file.name, '#2563eb', 'city'),
              sourceUrl: objectUrl,
              videoElement: video,
              isUploaded: true,
            });
          };

          video.onerror = () => {
            clearTimeout(timer);
            safeResolve({
              type: 'video',
              duration: 15,
              resolution: { width: 1920, height: 1080 },
              thumbnailUrl: generateThumbnailDataUrl(file.name, '#2563eb', 'city'),
              sourceUrl: objectUrl,
              isUploaded: true,
            });
          };

          video.load();
        } catch {
          clearTimeout(timer);
          safeResolve({
            type: 'video',
            duration: 12,
            resolution: { width: 1920, height: 1080 },
            thumbnailUrl: generateThumbnailDataUrl(file.name, '#2563eb', 'city'),
            sourceUrl: objectUrl,
            isUploaded: true,
          });
        }
      });
    } else if (isImage) {
      return new Promise((resolve) => {
        let hasResolved = false;
        const safeResolve = (data: Partial<MediaItem>) => {
          if (!hasResolved) {
            hasResolved = true;
            resolve(data);
          }
        };

        const timer = setTimeout(() => {
          safeResolve({
            type: 'image',
            duration: 10,
            resolution: { width: 1920, height: 1080 },
            thumbnailUrl: objectUrl,
            sourceUrl: objectUrl,
            isUploaded: true,
          });
        }, 500);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = objectUrl;

        img.onload = () => {
          clearTimeout(timer);
          this.imagePool.set(id, img);
          safeResolve({
            type: 'image',
            duration: 10,
            resolution: { width: img.naturalWidth || 1920, height: img.naturalHeight || 1080 },
            thumbnailUrl: objectUrl,
            sourceUrl: objectUrl,
            imageElement: img,
            isUploaded: true,
          });
        };

        img.onerror = () => {
          clearTimeout(timer);
          safeResolve({
            type: 'image',
            duration: 10,
            resolution: { width: 1920, height: 1080 },
            thumbnailUrl: objectUrl,
            sourceUrl: objectUrl,
            isUploaded: true,
          });
        };
      });
    } else {
      // Audio
      return new Promise((resolve) => {
        let hasResolved = false;
        const safeResolve = (data: Partial<MediaItem>) => {
          if (!hasResolved) {
            hasResolved = true;
            resolve(data);
          }
        };

        const timer = setTimeout(() => {
          safeResolve({
            type: 'audio',
            duration: 20,
            resolution: { width: 0, height: 0 },
            sourceUrl: objectUrl,
            isUploaded: true,
          });
        }, 400);

        const audio = new Audio();
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
          clearTimeout(timer);
          safeResolve({
            type: 'audio',
            duration: Math.max(1, audio.duration || 20),
            resolution: { width: 0, height: 0 },
            sourceUrl: objectUrl,
            isUploaded: true,
          });
        };
        audio.onerror = () => {
          clearTimeout(timer);
          safeResolve({
            type: 'audio',
            duration: 20,
            resolution: { width: 0, height: 0 },
            sourceUrl: objectUrl,
            isUploaded: true,
          });
        };
      });
    }
  }

  // Draw media frame into destination canvas at specified clip time
  public drawFrame(
    ctx: CanvasRenderingContext2D,
    mediaItem: MediaItem | undefined,
    clipLocalTime: number,
    targetWidth: number,
    targetHeight: number
  ) {
    if (!mediaItem) {
      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      return;
    }

    // Check if this is an uploaded real video
    if (mediaItem.videoElement || this.videoPool.has(mediaItem.id)) {
      const video = mediaItem.videoElement || this.videoPool.get(mediaItem.id)!;
      const vDuration = video.duration || mediaItem.duration || 10;
      const seekTime = Math.max(0, clipLocalTime % vDuration);

      if (Math.abs(video.currentTime - seekTime) > 0.05) {
        try {
          video.currentTime = seekTime;
        } catch {
          // Ignore seek errors
        }
      }

      const vWidth = video.videoWidth || 1920;
      const vHeight = video.videoHeight || 1080;
      const vAspect = vWidth / (vHeight || 1);
      const targetAspect = targetWidth / targetHeight;

      let dw = targetWidth;
      let dh = targetHeight;
      let dx = 0;
      let dy = 0;

      if (vAspect > targetAspect) {
        dh = targetWidth / vAspect;
        dy = (targetHeight - dh) / 2;
      } else {
        dw = targetHeight * vAspect;
        dx = (targetWidth - dw) / 2;
      }

      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      try {
        if (video.readyState >= 1) {
          ctx.drawImage(video, dx, dy, dw, dh);
        } else {
          // If video frame not yet buffered, draw procedural placeholder with clip name
          drawSyntheticFrame(ctx, targetWidth, targetHeight, 'clip-cyberpunk', clipLocalTime);
        }
      } catch {
        drawSyntheticFrame(ctx, targetWidth, targetHeight, 'clip-cyberpunk', clipLocalTime);
      }
      return;
    }

    // Check if this is an uploaded real image
    if (mediaItem.imageElement || this.imagePool.has(mediaItem.id)) {
      const img = mediaItem.imageElement || this.imagePool.get(mediaItem.id)!;
      const iWidth = img.naturalWidth || 1920;
      const iHeight = img.naturalHeight || 1080;
      const iAspect = iWidth / (iHeight || 1);
      const targetAspect = targetWidth / targetHeight;

      let dw = targetWidth;
      let dh = targetHeight;
      let dx = 0;
      let dy = 0;

      if (iAspect > targetAspect) {
        dh = targetWidth / iAspect;
        dy = (targetHeight - dh) / 2;
      } else {
        dw = targetHeight * iAspect;
        dx = (targetWidth - dw) / 2;
      }

      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      try {
        ctx.drawImage(img, dx, dy, dw, dh);
      } catch {
        drawSyntheticFrame(ctx, targetWidth, targetHeight, 'clip-nebula', clipLocalTime);
      }
      return;
    }

    // Synthetic media generator
    drawSyntheticFrame(ctx, targetWidth, targetHeight, mediaItem.id, clipLocalTime);
  }
}

export const mediaManager = new MediaManager();
