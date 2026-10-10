import React, { useEffect, useRef, useState } from 'react';
import { TRACK_LIST, TrackMeta, musicEngine } from '../audio/synthEngine';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Disc3,
  Activity,
  Sliders,
  Music,
} from 'lucide-react';

export const MusicPlayer: React.FC = () => {
  const [engineState, setEngineState] = useState(() => musicEngine.getState());
  const [visualizerMode, setVisualizerMode] = useState<'bars' | 'wave'>('bars');
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state from engine
  useEffect(() => {
    const unsubscribe = musicEngine.subscribe(() => {
      setEngineState(musicEngine.getState());
    });
    return unsubscribe;
  }, []);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    let animId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const renderVisualizer = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (visualizerMode === 'bars') {
        musicEngine.getVisualizerData(freqData);

        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength / 2; i++) {
          const val = engineState.isPlaying ? freqData[i] : (Math.sin(Date.now() / 300 + i) * 6 + 10);
          const percent = val / 255;
          const barHeight = Math.max(3, percent * (canvas.height - 4));

          // Neon gradient from Cyan to Hot Pink
          const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
          grad.addColorStop(0, '#05d9e8');
          grad.addColorStop(0.5, '#b537f2');
          grad.addColorStop(1, '#ff2a85');

          ctx.fillStyle = grad;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

          // Glowing peak cap
          if (engineState.isPlaying && val > 30) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, canvas.height - barHeight - 2, barWidth - 2, 1.5);
          }

          x += barWidth;
        }
      } else {
        // Oscilloscope Waveform
        musicEngine.getTimeDomainData(timeData);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#05d9e8';
        ctx.shadowColor = '#05d9e8';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = engineState.isPlaying ? timeData[i] / 128.0 : 1.0 + Math.sin(Date.now() / 400 + i * 0.2) * 0.05;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(renderVisualizer);
    };

    animId = requestAnimationFrame(renderVisualizer);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engineState.isPlaying, visualizerMode]);

  const currentTrack = engineState.currentTrack;
  const progressPercent = (engineState.currentTime / currentTrack.duration) * 100;

  return (
    <div className="w-full bg-[#120624]/90 border border-purple-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(181,55,242,0.25)] backdrop-blur-md flex flex-col gap-3">
      {/* Cassette Deck Shell */}
      <div className="relative bg-gradient-to-b from-[#1c0836] to-[#0e041d] border border-pink-500/30 rounded-lg p-3.5 overflow-hidden">
        {/* Cassette tape sticker header */}
        <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block px-1.5 py-0.5 bg-pink-500/20 text-pink-300 font-mono text-[10px] rounded border border-pink-500/40">
              STEREO HI-FI
            </span>
            <span className="font-vhs text-cyan-400 text-sm tracking-wider">
              {engineState.isPlaying ? 'PLAY ▶' : 'PAUSED ❚❚'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-amber-300 tabular-nums">
              {formatTime(engineState.currentTime)} / {formatTime(currentTrack.duration)}
            </span>
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Music className="w-3.5 h-3.5" />
              <span>TRACKS</span>
            </button>
          </div>
        </div>

        {/* Cassette Tape Face Window with Dual Spinning Reels */}
        <div className="my-3 p-2 bg-[#090212] border border-pink-500/30 rounded-md relative flex items-center justify-between px-6">
          {/* Left Reel */}
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full border-2 border-pink-400/80 bg-purple-950/70 flex items-center justify-center relative shadow-[0_0_10px_rgba(255,42,133,0.3)] ${
                engineState.isPlaying ? 'animate-spin-reel' : ''
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-slate-900 border border-cyan-400 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-pink-400" />
              </div>
              {/* Spoke teeth */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 bg-pink-400/30" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-90">
                <div className="w-full h-0.5 bg-pink-400/30" />
              </div>
            </div>
            <span className="text-[9px] font-mono text-purple-400 mt-1">SUPPLY</span>
          </div>

          {/* Center Tape Label & Wave Visualizer */}
          <div className="flex-1 max-w-[220px] mx-4 flex flex-col items-center text-center">
            <div className="w-full px-2 py-1 bg-gradient-to-r from-pink-900/40 via-purple-900/40 to-cyan-900/40 border border-purple-500/30 rounded text-[10px]">
              <div className="font-synth font-bold text-pink-300 truncate tracking-wide text-xs">
                {currentTrack.title}
              </div>
              <div className="text-cyan-300/80 text-[10px] truncate">
                {currentTrack.artist} · {currentTrack.genre}
              </div>
            </div>

            {/* Visualizer Canvas in cassette window */}
            <div className="w-full h-9 mt-2 bg-[#05010a] rounded border border-purple-800/60 overflow-hidden relative">
              <canvas
                ref={visualizerCanvasRef}
                width={200}
                height={36}
                className="w-full h-full block"
              />
            </div>
          </div>

          {/* Right Reel */}
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full border-2 border-cyan-400/80 bg-purple-950/70 flex items-center justify-center relative shadow-[0_0_10px_rgba(5,217,232,0.3)] ${
                engineState.isPlaying ? 'animate-spin-reel' : ''
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-slate-900 border border-pink-400 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              {/* Spoke teeth */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 bg-cyan-400/30" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-90">
                <div className="w-full h-0.5 bg-cyan-400/30" />
              </div>
            </div>
            <span className="text-[9px] font-mono text-cyan-400 mt-1">TAKEUP</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-purple-950/80 h-1.5 rounded-full overflow-hidden border border-purple-800/40">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 transition-all duration-300 shadow-[0_0_8px_#ff2a85]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Playlist Drawer (Collapsible) */}
      {showPlaylist && (
        <div className="bg-[#170a2c] border border-pink-500/30 rounded-lg p-2.5 flex flex-col gap-1.5 animate-fadeIn">
          <div className="text-[10px] font-arcade text-pink-400 pb-1 border-b border-purple-800/40 flex justify-between">
            <span>SYNTHWAVE CASSETTE TRACKS</span>
            <span>3 SONGS</span>
          </div>
          {TRACK_LIST.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => musicEngine.setTrack(idx)}
              className={`flex items-center justify-between p-2 rounded text-left text-xs transition-colors ${
                engineState.currentTrackIndex === idx
                  ? 'bg-pink-600/20 border border-pink-500/50 text-white'
                  : 'hover:bg-purple-900/30 text-purple-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-pink-400 text-[11px]">0{idx + 1}.</span>
                <div className="truncate">
                  <div className="font-semibold text-slate-100 truncate">{t.title}</div>
                  <div className="text-[10px] text-cyan-400">{t.artist} · {t.bpm} BPM</div>
                </div>
              </div>
              <span className="font-mono text-[10px] text-purple-300 ml-2">
                {formatTime(t.duration)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Music Player Controls Toolbar */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* Playback buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => musicEngine.prevTrack()}
            title="Previous Track"
            className="w-8 h-8 rounded-lg bg-purple-900/50 hover:bg-purple-800 text-pink-300 flex items-center justify-center transition-all border border-purple-500/30 hover:border-pink-500 active:scale-95"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => musicEngine.togglePlay()}
            title={engineState.isPlaying ? 'Pause Synth Music' : 'Play Synth Music'}
            className="px-4 h-9 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white flex items-center gap-2 transition-all shadow-[0_0_12px_#ff2a85] active:scale-95 font-synth font-semibold text-xs"
          >
            {engineState.isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>PLAY</span>
              </>
            )}
          </button>

          <button
            onClick={() => musicEngine.nextTrack()}
            title="Next Track"
            className="w-8 h-8 rounded-lg bg-purple-900/50 hover:bg-purple-800 text-pink-300 flex items-center justify-center transition-all border border-purple-500/30 hover:border-pink-500 active:scale-95"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Visualizer Mode Switcher */}
        <div className="flex items-center gap-1 bg-purple-950/60 p-1 rounded-lg border border-purple-700/40 text-[10px]">
          <button
            onClick={() => setVisualizerMode('bars')}
            className={`px-2 py-1 rounded transition-colors ${
              visualizerMode === 'bars'
                ? 'bg-pink-500/30 text-pink-200 border border-pink-500/40'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            BARS
          </button>
          <button
            onClick={() => setVisualizerMode('wave')}
            className={`px-2 py-1 rounded transition-colors ${
              visualizerMode === 'wave'
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            WAVE
          </button>
        </div>

        {/* Music Volume Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => musicEngine.toggleMute()}
            className="text-pink-300 hover:text-white transition-colors"
            title={engineState.isMuted ? 'Unmute Music' : 'Mute Music'}
          >
            {engineState.isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={engineState.isMuted ? 0 : engineState.volume}
            onChange={(e) => musicEngine.setVolume(parseFloat(e.target.value))}
            className="w-20 sm:w-24 h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-pink-500"
            title={`Music Volume: ${Math.round(engineState.volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
