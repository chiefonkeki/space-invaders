/**
 * 80s Synthwave Procedural Audio Engine
 * Built with Web Audio API: synthesizes retro drum machines, arpeggiated basslines,
 * polyphonic synth pads, and analog lead synthesizers.
 */

export interface TrackMeta {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  duration: number; // simulated track length in seconds
}

export const TRACK_LIST: TrackMeta[] = [
  {
    id: 'track-1',
    title: 'Neon Highway 1984',
    artist: 'Vector Runner',
    genre: 'Outrun Synthwave',
    bpm: 104,
    duration: 184,
  },
  {
    id: 'track-2',
    title: 'Cyber City Drift',
    artist: 'Laser Grid',
    genre: 'Darksynth / Electro',
    bpm: 120,
    duration: 210,
  },
  {
    id: 'track-3',
    title: 'Midnight Cassette Dreams',
    artist: 'Palm Springs Club',
    genre: 'Chill Vaporwave',
    bpm: 88,
    duration: 195,
  },
];

class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;

  private isPlaying: boolean = false;
  private currentTrackIndex: number = 0;
  private volume: number = 0.7;
  private isMuted: boolean = false;
  private currentTime: number = 0;
  private loopTimer: number | null = null;
  private stepIndex: number = 0;

  // Track sequence step tables
  private stepInterval: number | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Lazy AudioContext on first user interaction
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  private ensureAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public play() {
    const ctx = this.ensureAudioContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.stepIndex = 0;
    this.startSequencer(ctx);
    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    if (this.stepInterval !== null) {
      window.clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % TRACK_LIST.length;
    this.currentTime = 0;
    this.stepIndex = 0;
    if (this.isPlaying) {
      this.pause();
      this.play();
    } else {
      this.notify();
    }
  }

  public prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + TRACK_LIST.length) % TRACK_LIST.length;
    this.currentTime = 0;
    this.stepIndex = 0;
    if (this.isPlaying) {
      this.pause();
      this.play();
    } else {
      this.notify();
    }
  }

  public setTrack(index: number) {
    if (index >= 0 && index < TRACK_LIST.length) {
      this.currentTrackIndex = index;
      this.currentTime = 0;
      this.stepIndex = 0;
      if (this.isPlaying) {
        this.pause();
        this.play();
      } else {
        this.notify();
      }
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: TRACK_LIST[this.currentTrackIndex],
      currentTrackIndex: this.currentTrackIndex,
      volume: this.volume,
      isMuted: this.isMuted,
      currentTime: this.currentTime,
    };
  }

  // --- Web Audio Synthesizer Instruments ---

  private playKick(ctx: AudioContext, time: number) {
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  private playSnare(ctx: AudioContext, time: number, isClap: boolean = false) {
    if (!this.masterGain) return;
    // White noise buffer for retro snare/clap body
    const bufferSize = ctx.sampleRate * 0.2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = isClap ? 'bandpass' : 'highpass';
    filter.frequency.setValueAtTime(isClap ? 1200 : 900, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.2);

    // Tonal snap
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);

    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playHiHat(ctx: AudioContext, time: number, open: boolean = false) {
    if (!this.masterGain) return;
    const bufferSize = ctx.sampleRate * (open ? 0.2 : 0.05);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.18 : 0.04));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + (open ? 0.2 : 0.05));
  }

  private playBassNote(ctx: AudioContext, freq: number, time: number, duration: number) {
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    sub.type = 'triangle';
    sub.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + duration);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    sub.start(time);
    osc.stop(time + duration);
    sub.stop(time + duration);
  }

  private playLeadNote(ctx: AudioContext, freq: number, time: number, duration: number) {
    if (!this.masterGain || freq <= 0) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-6, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(7, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + duration);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  private playPadChord(ctx: AudioContext, freqs: number[], time: number, duration: number) {
    const master = this.masterGain;
    if (!master) return;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(Math.random() * 8 - 4, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  // --- Sequencer loop ---

  private startSequencer(ctx: AudioContext) {
    const track = TRACK_LIST[this.currentTrackIndex];
    const secondsPerBeat = 60 / track.bpm;
    const stepDuration = secondsPerBeat / 4; // 16th note steps

    // 16-step patterns for 3 different tracks
    // Note frequencies (Hz)
    const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.0, A3 = 220.0, B3 = 246.94;
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25;

    // Pattern definitions per track: 32 steps per cycle
    const patterns = [
      // Track 1: Neon Highway 1984 (Am - F - C - G)
      {
        bass: [
          A3, A3, A3, A3, A3, A3, A3, A3,  F3, F3, F3, F3, F3, F3, F3, F3,
          C3, C3, C3, C3, C3, C3, C3, C3,  G3, G3, G3, G3, G3, G3, G3, G3,
        ],
        pad: [
          [A3, C4, E4], null, null, null, null, null, null, null,
          [F3, A3, C4], null, null, null, null, null, null, null,
          [C4, E4, G4], null, null, null, null, null, null, null,
          [G3, B3, D4], null, null, null, null, null, null, null,
        ],
        lead: [
          E4, 0, G4, 0, A4, 0, E4, 0,  C4, 0, D4, 0, E4, 0, 0, 0,
          G4, 0, A4, 0, C5, 0, A4, 0,  G4, 0, E4, 0, D4, 0, 0, 0,
        ],
        kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      },
      // Track 2: Cyber City Drift (Dm - Bb - F - C)
      {
        bass: [
          D3, D3, D4, D3, D3, D3, D4, D3,  B3*0.94, B3*0.94, B3*1.88, B3*0.94, B3*0.94, B3*0.94, B3*1.88, B3*0.94,
          F3, F3, F4, F3, F3, F3, F4, F3,  C3, C3, C4, C3, C3, C3, C4, C3,
        ],
        pad: [
          [D3, F3, A3], null, null, null, null, null, null, null,
          [B3*0.94, D4, F4], null, null, null, null, null, null, null,
          [F3, A3, C4], null, null, null, null, null, null, null,
          [C3, E3, G3], null, null, null, null, null, null, null,
        ],
        lead: [
          A4, 0, F4, 0, D4, 0, A4, 0,  D5, 0, C5, 0, A4, 0, F4, 0,
          A4, 0, C5, 0, D5, 0, F4, 0,  E4, 0, D4, 0, C4, 0, 0, 0,
        ],
        kick:  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      },
      // Track 3: Midnight Cassette Dreams (Em - C - G - D)
      {
        bass: [
          E3, 0, E3, 0, E3, 0, E3, 0,  C3, 0, C3, 0, C3, 0, C3, 0,
          G3, 0, G3, 0, G3, 0, G3, 0,  D3, 0, D3, 0, D3, 0, D3, 0,
        ],
        pad: [
          [E3, G3, B3, D4], null, null, null, null, null, null, null,
          [C3, E3, G3, B3], null, null, null, null, null, null, null,
          [G3, B3, D4, F4], null, null, null, null, null, null, null,
          [D3, F3*1.06, A3, C4], null, null, null, null, null, null, null,
        ],
        lead: [
          B4, 0, 0, 0, G4, 0, 0, 0,  E4, 0, G4, 0, B4, 0, 0, 0,
          D5, 0, 0, 0, B4, 0, 0, 0,  A4, 0, G4, 0, E4, 0, 0, 0,
        ],
        kick:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      },
    ];

    const currentPattern = patterns[this.currentTrackIndex % patterns.length];

    this.stepInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 32;

      // Drums
      if (currentPattern.kick[step]) {
        this.playKick(this.ctx, now);
      }
      if (currentPattern.snare[step]) {
        this.playSnare(this.ctx, now, this.currentTrackIndex === 2);
      }
      if (currentPattern.hihat[step]) {
        this.playHiHat(this.ctx, now, step % 4 === 2);
      }

      // Bassline
      const bassFreq = currentPattern.bass[step];
      if (bassFreq > 0) {
        this.playBassNote(this.ctx, bassFreq, now, stepDuration * 0.9);
      }

      // Pad chord
      const padChord = currentPattern.pad[step];
      if (padChord) {
        this.playPadChord(this.ctx, padChord, now, stepDuration * 7.5);
      }

      // Lead melody
      const leadFreq = currentPattern.lead[step];
      if (leadFreq > 0) {
        this.playLeadNote(this.ctx, leadFreq, now, stepDuration * 1.5);
      }

      this.stepIndex++;
      this.currentTime = (this.currentTime + stepDuration) % track.duration;

      // Periodic state sync to UI
      if (this.stepIndex % 4 === 0) {
        this.notify();
      }
    }, stepDuration * 1000);
  }

  public getVisualizerData(dataArray: Uint8Array): void {
    if (this.analyser) {
      // Cast for TS compatibility with DOM Lib
      this.analyser.getByteFrequencyData(dataArray as unknown as Uint8Array<ArrayBuffer>);
    } else {
      dataArray.fill(0);
    }
  }

  public getTimeDomainData(dataArray: Uint8Array): void {
    if (this.analyser) {
      // Cast for TS compatibility with DOM Lib
      this.analyser.getByteTimeDomainData(dataArray as unknown as Uint8Array<ArrayBuffer>);
    } else {
      dataArray.fill(128);
    }
  }
}

export const musicEngine = new SynthEngine();
