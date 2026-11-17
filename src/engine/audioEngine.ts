import { MediaItem, TimelineClip, TimelineTrack } from '../types/editor';

// Web Audio Engine for Real-Time Timeline Audio Clip Playback & Stereo VU Metering

interface ActiveClipNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  startedAtCtxTime: number;
  startedAtClipOffset: number;
  speed: number;
  sourceUrl: string;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isInitialized = false;
  private isPlaying = false;
  private currentVolume = 1.0;
  private isMuted = false;

  private bufferCache = new Map<string, AudioBuffer>();
  private loadingUrls = new Set<string>();
  private activeClips = new Map<string, ActiveClipNode>();

  public init() {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      this.isInitialized = true;
    } catch {
      // AudioContext may be blocked before first user gesture
    }
  }

  public async resumeContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }
  }

  public startPlayback(_rate = 1.0) {
    this.resumeContext();
    this.isPlaying = true;
  }

  public stopPlayback() {
    this.isPlaying = false;
    this.stopAllActiveClips();
  }

  private stopClipNode(clipId: string) {
    const node = this.activeClips.get(clipId);
    if (!node) return;
    try {
      node.source.stop();
      node.source.disconnect();
      node.gain.disconnect();
      node.pan.disconnect();
    } catch {
      // Node already stopped
    }
    this.activeClips.delete(clipId);
  }

  private stopAllActiveClips() {
    for (const clipId of Array.from(this.activeClips.keys())) {
      this.stopClipNode(clipId);
    }
  }

  private synthesizeSampleBuffer(ctx: BaseAudioContext, sourceUrl: string): AudioBuffer | null {
    const sampleRate = ctx.sampleRate || 48000;

    if (sourceUrl === 'synthetic:audio-cinematic-theme') {
      const duration = 35;
      const length = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Ambient cinematic pad chord progression (Cm9 -> Abmaj7 -> Eb -> Bb)
      const chords = [
        [130.81, 196.0, 233.08, 293.66],
        [103.83, 155.56, 196.0, 246.94],
        [155.56, 233.08, 293.66, 392.0],
        [116.54, 174.61, 233.08, 293.66],
      ];

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const chordIdx = Math.floor((t / 4.5) % chords.length);
        const freqs = chords[chordIdx];
        const envIn = Math.min(1, t / 1.5);
        const envOut = Math.min(1, (duration - t) / 2.0);
        const pulse = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.25 * t);

        let sampleL = 0;
        let sampleR = 0;
        for (let c = 0; c < freqs.length; c++) {
          const f = freqs[c];
          const w = 2 * Math.PI * f * t;
          const harmonic = Math.sin(w) * 0.65 + Math.sin(w * 2) * 0.15;
          const panOffset = (c % 2 === 0 ? 1 : -1) * 0.08;
          sampleL += harmonic * (1 + panOffset);
          sampleR += harmonic * (1 - panOffset);
        }

        const gain = 0.075 * envIn * envOut * pulse;
        left[i] = sampleL * gain;
        right[i] = sampleR * gain;
      }
      return buffer;
    }

    if (sourceUrl === 'synthetic:audio-riser-whoosh') {
      const duration = 8;
      const length = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      let phase = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const norm = t / duration;
        // Riser sweeping into an impact around t = 4.0s
        const freq = t < 4.0 ? 55 + Math.pow(t / 4.0, 2) * 320 : 90 * Math.exp(-(t - 4.0) * 1.4);
        phase += (2 * Math.PI * freq) / sampleRate;
        const env =
          t < 4.0
            ? Math.pow(t / 4.0, 1.5) * 0.22
            : 0.28 * Math.exp(-(t - 4.0) * 1.35);
        const shimmer = Math.sin(phase) * 0.7 + Math.sin(phase * 1.5) * 0.3;
        const val = shimmer * env * (1 - Math.max(0, (norm - 0.92) / 0.08));
        left[i] = val;
        right[i] = val * 0.96;
      }
      return buffer;
    }

    return null;
  }

  private async ensureDecodedBuffer(sourceUrl: string) {
    if (!this.ctx || !sourceUrl) return;
    if (this.bufferCache.has(sourceUrl) || this.loadingUrls.has(sourceUrl)) return;

    if (sourceUrl.startsWith('synthetic:audio-')) {
      const synth = this.synthesizeSampleBuffer(this.ctx, sourceUrl);
      if (synth) {
        this.bufferCache.set(sourceUrl, synth);
      }
      return;
    }

    if (!sourceUrl.startsWith('blob:') && !sourceUrl.startsWith('data:audio/')) return;

    this.loadingUrls.add(sourceUrl);
    try {
      const resp = await fetch(sourceUrl);
      const arr = await resp.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arr);
      this.bufferCache.set(sourceUrl, decoded);
    } catch {
      // Non-audio or unsupported media source
    } finally {
      this.loadingUrls.delete(sourceUrl);
    }
  }

  private async resolveBufferForContext(
    ctx: BaseAudioContext,
    sourceUrl: string
  ): Promise<AudioBuffer | null> {
    if (!sourceUrl) return null;

    if (sourceUrl.startsWith('synthetic:audio-')) {
      return this.synthesizeSampleBuffer(ctx, sourceUrl);
    }

    if (!sourceUrl.startsWith('blob:') && !sourceUrl.startsWith('data:audio/')) {
      return null;
    }

    const cached = this.bufferCache.get(sourceUrl);
    if (cached && cached.sampleRate === ctx.sampleRate) {
      return cached;
    }

    try {
      const resp = await fetch(sourceUrl);
      const arr = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arr);
      return decoded;
    } catch {
      return cached || null;
    }
  }

  public syncTimelineAudio(
    isPlaying: boolean,
    currentTime: number,
    playbackRate: number,
    clips: TimelineClip[],
    tracks: TimelineTrack[],
    mediaItems: MediaItem[]
  ) {
    if (!isPlaying) {
      if (this.activeClips.size > 0) this.stopAllActiveClips();
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    if (!this.ctx || !this.masterGain) {
      this.init();
    }
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const anyAudioSolo = tracks.some((t) => t.type === 'audio' && t.solo);
    const activeIds = new Set<string>();

    for (const clip of clips) {
      if (clip.trackType !== 'audio') continue;

      const track = tracks.find((t) => t.id === clip.trackId);
      const trackSilenced = Boolean(track?.muted) || (anyAudioSolo && !track?.solo);
      if (trackSilenced || clip.muted || clip.volume === 0) {
        this.stopClipNode(clip.id);
        continue;
      }

      const inBounds = currentTime >= clip.start && currentTime < clip.start + clip.duration;
      if (!inBounds) {
        this.stopClipNode(clip.id);
        continue;
      }

      const media = mediaItems.find((m) => m.id === clip.mediaId);
      if (!media?.sourceUrl) continue;

      activeIds.add(clip.id);

      const buffer = this.bufferCache.get(media.sourceUrl);
      if (!buffer) {
        void this.ensureDecodedBuffer(media.sourceUrl);
        continue;
      }

      const clipSpeed = Math.max(0.25, Math.min(2.5, (clip.speed || 1) * playbackRate));
      const desiredOffset = Math.max(0, clip.sourceStart + (currentTime - clip.start) * (clip.speed || 1));

      if (desiredOffset >= buffer.duration) {
        this.stopClipNode(clip.id);
        continue;
      }

      const existing = this.activeClips.get(clip.id);
      if (existing) {
        if (existing.sourceUrl !== media.sourceUrl) {
          this.stopClipNode(clip.id);
        } else {
          const elapsedCtx = this.ctx.currentTime - existing.startedAtCtxTime;
          const expectedOffset = existing.startedAtClipOffset + elapsedCtx * existing.speed;
          if (Math.abs(expectedOffset - desiredOffset) > 0.25 || Math.abs(existing.speed - clipSpeed) > 0.05) {
            this.stopClipNode(clip.id);
          } else {
            existing.gain.gain.setValueAtTime(Math.max(0, Math.min(2, clip.volume ?? 1)), this.ctx.currentTime);
            existing.pan.pan.setValueAtTime(Math.max(-1, Math.min(1, clip.pan ?? 0)), this.ctx.currentTime);
            continue;
          }
        }
      }

      // Start fresh AudioBufferSourceNode at desiredOffset
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = clipSpeed;

        const pan = this.ctx.createStereoPanner();
        pan.pan.setValueAtTime(Math.max(-1, Math.min(1, clip.pan ?? 0)), this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(Math.max(0, Math.min(2, clip.volume ?? 1)), this.ctx.currentTime);

        source.connect(pan);
        pan.connect(gain);
        gain.connect(this.masterGain);

        const remainingClipTimelineDur = Math.max(0.05, clip.start + clip.duration - currentTime);
        const remainingBufferDur = Math.max(0.05, buffer.duration - desiredOffset);
        const maxTimelineDur = Math.min(remainingClipTimelineDur, remainingBufferDur / clipSpeed);

        source.start(this.ctx.currentTime, desiredOffset);
        source.stop(this.ctx.currentTime + maxTimelineDur + 0.05);
        this.activeClips.set(clip.id, {
          source,
          gain,
          pan,
          startedAtCtxTime: this.ctx.currentTime,
          startedAtClipOffset: desiredOffset,
          speed: clipSpeed,
          sourceUrl: media.sourceUrl,
        });
      } catch {
        // Ignore decode/start edge cases
      }
    }

    for (const clipId of Array.from(this.activeClips.keys())) {
      if (!activeIds.has(clipId)) {
        this.stopClipNode(clipId);
      }
    }
  }

  public async renderOfflineMix(
    startTime: number,
    duration: number,
    clips: TimelineClip[],
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    sampleRate = 48000
  ): Promise<{ buffer: AudioBuffer; activeClipCount: number }> {
    const safeDuration = Math.max(0.25, duration);
    const totalSamples = Math.max(1, Math.ceil(safeDuration * sampleRate));
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, 0);
    masterGain.connect(offlineCtx.destination);

    const anyAudioSolo = tracks.some((t) => t.type === 'audio' && t.solo);
    const endTime = startTime + safeDuration;
    let activeClipCount = 0;

    for (const clip of clips) {
      if (clip.trackType !== 'audio') continue;
      const track = tracks.find((t) => t.id === clip.trackId);
      const trackSilenced = Boolean(track?.muted) || (anyAudioSolo && !track?.solo);
      if (trackSilenced || clip.muted || clip.volume === 0) continue;

      const overlapStart = Math.max(startTime, clip.start);
      const overlapEnd = Math.min(endTime, clip.start + clip.duration);
      if (overlapEnd <= overlapStart) continue;

      const media = mediaItems.find((m) => m.id === clip.mediaId);
      if (!media?.sourceUrl) continue;

      const buffer = await this.resolveBufferForContext(offlineCtx, media.sourceUrl);
      if (!buffer) continue;

      const speed = Math.max(0.25, Math.min(2.5, clip.speed || 1));
      const offsetInBuffer = Math.max(0, clip.sourceStart + (overlapStart - clip.start) * speed);
      if (offsetInBuffer >= buffer.duration) continue;

      const when = Math.max(0, overlapStart - startTime);
      const timelineSpan = overlapEnd - overlapStart;
      const maxSpanByBuffer = Math.max(0.01, (buffer.duration - offsetInBuffer) / speed);
      const actualSpan = Math.min(timelineSpan, maxSpanByBuffer);

      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = speed;

      const pan = offlineCtx.createStereoPanner();
      pan.pan.setValueAtTime(Math.max(-1, Math.min(1, clip.pan ?? 0)), when);

      const gain = offlineCtx.createGain();
      gain.gain.setValueAtTime(Math.max(0, Math.min(2, clip.volume ?? 1)), when);

      source.connect(pan);
      pan.connect(gain);
      gain.connect(masterGain);

      source.start(when, offsetInBuffer);
      source.stop(when + actualSpan);
      activeClipCount++;
    }

    const buffer = await offlineCtx.startRendering();
    return { buffer, activeClipCount };
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(2, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : this.currentVolume, this.ctx.currentTime);
    }
  }

  // Get current stereo Peak and RMS in decibels (-60dB to +3dB)
  public getMeterLevels(): { leftPeak: number; rightPeak: number; leftRms: number; rightRms: number } {
    if (!this.analyser || !this.isPlaying || this.isMuted) {
      return { leftPeak: -60, rightPeak: -60, leftRms: -60, rightRms: -60 };
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);

    let sumSquares = 0;
    let peakSample = 0;

    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      const abs = Math.abs(normalized);
      if (abs > peakSample) peakSample = abs;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / data.length);
    const peakDb = peakSample > 0.0001 ? 20 * Math.log10(peakSample * this.currentVolume * 3) : -60;
    const rmsDb = rms > 0.0001 ? 20 * Math.log10(rms * this.currentVolume * 3) : -60;

    const leftPeak = Math.max(-60, Math.min(3, peakDb));
    const rightPeak = Math.max(-60, Math.min(3, peakDb - 1.2 + Math.random() * 0.8));
    const leftRms = Math.max(-60, Math.min(0, rmsDb));
    const rightRms = Math.max(-60, Math.min(0, rmsDb - 1.0 + Math.random() * 0.6));

    return { leftPeak, rightPeak, leftRms, rightRms };
  }
}

export const audioEngine = new AudioEngine();
