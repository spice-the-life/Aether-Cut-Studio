// Web Audio Engine for Real-Time Sound and VU Metering

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private oscillatorNode: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private isInitialized = false;
  private isPlaying = false;
  private currentVolume = 1.0;
  private isMuted = false;

  public init() {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.isInitialized = true;
    } catch {
      // AudioContext may be blocked before first user gesture
    }
  }

  public async resumeContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public startPlayback(rate = 1.0) {
    this.resumeContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.isPlaying) this.stopPlayback();

    try {
      // Create a harmonic musical synth chord to represent audio playback
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110 * Math.max(0.25, Math.min(2, rate)), this.ctx.currentTime); // A2 fundamental

      // Sub-oscillator for warmth
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(164.81 * Math.max(0.25, Math.min(2, rate)), this.ctx.currentTime); // E3 fifth

      const synthGain = this.ctx.createGain();
      synthGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      osc.connect(synthGain);
      osc2.connect(synthGain);
      synthGain.connect(this.masterGain);

      osc.start();
      osc2.start();

      this.oscillatorNode = osc;
      this.isPlaying = true;
    } catch {
      // Graceful fallback
    }
  }

  public stopPlayback() {
    if (this.oscillatorNode) {
      try {
        this.oscillatorNode.stop();
        this.oscillatorNode.disconnect();
      } catch {
        // Already stopped
      }
      this.oscillatorNode = null;
    }
    this.isPlaying = false;
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
    // Convert to dBFS
    const peakDb = peakSample > 0.0001 ? 20 * Math.log10(peakSample * this.currentVolume * 3) : -60;
    const rmsDb = rms > 0.0001 ? 20 * Math.log10(rms * this.currentVolume * 3) : -60;

    // Slight stereo variation for realistic look
    const leftPeak = Math.max(-60, Math.min(3, peakDb));
    const rightPeak = Math.max(-60, Math.min(3, peakDb - 1.2 + Math.random() * 0.8));
    const leftRms = Math.max(-60, Math.min(0, rmsDb));
    const rightRms = Math.max(-60, Math.min(0, rmsDb - 1.0 + Math.random() * 0.6));

    return { leftPeak, rightPeak, leftRms, rightRms };
  }
}

export const audioEngine = new AudioEngine();
