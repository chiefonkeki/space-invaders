/**
 * 80s Space Invaders Arcade Synthesizer Sound Effects
 * High fidelity synthesized retro sound FX via Web Audio API.
 */

class SoundFxManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private volume: number = 0.6;
  private isMuted: boolean = false;

  // Persistent UFO oscillator if active
  private ufoOsc: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;
  private ufoLfo: OscillatorNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume() {
    return this.volume;
  }

  public getIsMuted() {
    return this.isMuted;
  }

  // Player laser shot
  public playShoot() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Iconic 4-step descending invader march beeps (step: 0, 1, 2, 3)
  public playInvaderStep(step: number) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const pitches = [175, 155, 138, 123];
    const freq = pitches[step % 4];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Invader destroyed
  public playAlienHit() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Noise buffer
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    noise.start(now);
    noise.stop(now + 0.15);
  }

  // Shield bunker hit
  public playBunkerHit() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Player ship explosion
  public playPlayerHit() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Deep crunchy rumble
    const bufferSize = ctx.sampleRate * 0.6;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.55);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    noise.start(now);
    noise.stop(now + 0.6);

    // Warped pitch tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // UFO Mystery Saucer loop
  public startUfoSiren() {
    if (this.isMuted || this.ufoOsc) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    this.ufoOsc = ctx.createOscillator();
    this.ufoGain = ctx.createGain();
    this.ufoLfo = ctx.createOscillator();

    const lfoGain = ctx.createGain();

    this.ufoOsc.type = 'sawtooth';
    this.ufoOsc.frequency.setValueAtTime(450, now);

    // LFO to modulate UFO frequency
    this.ufoLfo.type = 'sine';
    this.ufoLfo.frequency.setValueAtTime(6, now); // 6 Hz warble

    lfoGain.gain.setValueAtTime(150, now);

    this.ufoLfo.connect(this.ufoOsc.frequency);

    this.ufoGain.gain.setValueAtTime(0.18, now);

    this.ufoOsc.connect(this.ufoGain);
    this.ufoGain.connect(this.sfxGain!);

    this.ufoOsc.start(now);
    this.ufoLfo.start(now);
  }

  public stopUfoSiren() {
    if (this.ufoOsc) {
      try {
        this.ufoOsc.stop();
        this.ufoLfo?.stop();
        this.ufoOsc.disconnect();
        this.ufoLfo?.disconnect();
      } catch {
        // Safe ignore
      }
      this.ufoOsc = null;
      this.ufoLfo = null;
      this.ufoGain = null;
    }
  }

  // UFO bonus destroyed
  public playUfoHit() {
    this.stopUfoSiren();
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chords.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);

      gain.gain.setValueAtTime(0.25, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  }

  // Wave victory
  public playWaveClear() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.3, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }
}

export const soundFx = new SoundFxManager();
