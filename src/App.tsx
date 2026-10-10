/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SpaceInvadersCanvas } from './game/SpaceInvadersCanvas';
import { MusicPlayer } from './components/MusicPlayer';
import { musicEngine } from './audio/synthEngine';
import bgImage from './assets/images/vaporwave_synth_backdrop_1791619332015.jpg';
import {
  Gamepad2,
  Disc,
  HelpCircle,
  Trophy,
  Sparkles,
  Volume2,
  Tv,
} from 'lucide-react';

export default function App() {
  const [scanlinesEnabled, setScanlinesEnabled] = useState<boolean>(true);
  const [activeModal, setActiveModal] = useState<'none' | 'manual' | 'scores'>('none');

  const toggleScanlines = () => {
    setScanlinesEnabled((prev) => !prev);
  };

  const handleStartMusicAndGame = () => {
    // If music is paused, start music
    const state = musicEngine.getState();
    if (!state.isPlaying) {
      musicEngine.play();
    }
    // Scroll smoothly to arcade center
    const arcadeEl = document.getElementById('arcade-station');
    if (arcadeEl) {
      arcadeEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#090214] text-slate-100 flex flex-col relative selection:bg-pink-500 selection:text-white font-sans">
      {/* Vaporwave Background Image with Atmospheric Gradient Scrim */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={bgImage}
          alt="80s synthwave horizon background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-bottom opacity-40 brightness-90 filter"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090214]/90 via-[#0b0318]/75 to-[#090214]/95" />
      </div>

      {/* Global CRT Scanlines (if enabled) */}
      {scanlinesEnabled && (
        <div className="fixed inset-0 crt-scanlines pointer-events-none z-40 opacity-40" />
      )}

      {/* Top Bar Contract (Zone 1: Brand, Zone 2: Nav, Zone 3: CTA) */}
      <header className="relative z-30 w-full border-b border-purple-500/20 bg-[#0d041c]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <a
            href="/"
            className="font-synth font-black text-lg md:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-400 whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          >
            VAPOR INVADERS
          </a>

          {/* Zone 2: 4 single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider uppercase text-purple-200/80">
            <a
              href="#arcade-station"
              className="hover:text-pink-400 transition-colors whitespace-nowrap shrink-0"
            >
              Play Arcade
            </a>
            <a
              href="#music-deck"
              className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
            >
              Soundtrack
            </a>
            <button
              onClick={() => setActiveModal('scores')}
              className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 text-left"
            >
              High Scores
            </button>
            <button
              onClick={() => setActiveModal('manual')}
              className="hover:text-pink-400 transition-colors whitespace-nowrap shrink-0 text-left"
            >
              How to Play
            </button>
          </nav>

          {/* Zone 3: Primary Action CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleStartMusicAndGame}
              className="px-4 py-2 text-xs font-synth font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 rounded-lg shadow-[0_0_15px_rgba(255,42,133,0.4)] transition-all active:scale-95 whitespace-nowrap shrink-0 border border-pink-400/50"
            >
              INSERT COIN
            </button>
          </div>
        </div>
      </header>

      {/* Hero Sub-strip & VHS Timestamp */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-6 pt-4 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-purple-300/70 border-b border-purple-500/10">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-pink-400 font-semibold">ARCADE SYSTEM 1984</span>
          <span aria-hidden="true">·</span>
          <span>HI-FI SYNTHWAVE AUDIO</span>
          <span aria-hidden="true">·</span>
          <span className="text-cyan-400">RETRO CRT ENGINE</span>
        </div>

        <div className="mt-1 sm:mt-0 font-vhs text-cyan-300 tracking-widest text-sm flex items-center gap-3">
          <span>OCT 10 1984</span>
          <span className="text-pink-400">PLAY ▶ 00:00:00</span>
          <span>SP 120min</span>
        </div>
      </div>

      {/* Main Content Arena */}
      <main className="relative z-20 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col items-center">
        {/* Arcade Console Station */}
        <section id="arcade-station" className="w-full flex flex-col items-center">
          {/* Section Introduction */}
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-synth font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-200 to-cyan-300 drop-shadow-[0_0_12px_rgba(255,42,133,0.5)]">
              DEFEND THE NEON GRID
            </h1>
            <p className="text-xs md:text-sm text-purple-200/80 mt-1 max-w-md mx-auto">
              Classic Space Invaders arcade action powered by real-time analog synthwave beats.
            </p>
          </div>

          {/* Central Space Invaders Game Window */}
          <div className="w-full max-w-xl">
            <SpaceInvadersCanvas
              scanlinesEnabled={scanlinesEnabled}
              onToggleScanlines={toggleScanlines}
            />
          </div>
        </section>

        {/* Music Player Cassette Station */}
        <section id="music-deck" className="w-full max-w-xl mt-6">
          <div className="flex items-center justify-between px-1 mb-2 text-xs">
            <div className="flex items-center gap-2">
              <Disc className="w-4 h-4 text-pink-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="font-synth font-bold text-pink-300 tracking-wider">
                CASSETTE SOUNDTRACK
              </span>
            </div>
            <span className="font-mono text-[11px] text-cyan-400">3 SYNTH-WAVE CHANNELS</span>
          </div>

          {/* Cassette Deck Component */}
          <MusicPlayer />
        </section>

        {/* Arcade Scoring & Track Guide Bento Strip */}
        <section className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Invader Target Values */}
          <div className="p-4 rounded-xl bg-[#120526]/80 border border-pink-500/30 backdrop-blur-md">
            <div className="text-xs font-arcade text-pink-400 mb-3 flex items-center justify-between">
              <span>TARGET INTEL</span>
              <span className="text-[10px] text-purple-400">PTS</span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-purple-500/20">
                <span className="text-amber-300">Mystery UFO</span>
                <span className="text-white font-bold">50 - 300</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-purple-500/20">
                <span className="text-pink-400">Squid Vanguard</span>
                <span className="text-white font-bold">30</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-purple-500/20">
                <span className="text-cyan-400">Crab Enforcer</span>
                <span className="text-white font-bold">20</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-purple-300">Octopus Drone</span>
                <span className="text-white font-bold">10</span>
              </div>
            </div>
          </div>

          {/* Card 2: Soundtrack Lineup */}
          <div className="p-4 rounded-xl bg-[#120526]/80 border border-purple-500/30 backdrop-blur-md">
            <div className="text-xs font-arcade text-cyan-400 mb-3 flex items-center justify-between">
              <span>TAPE ROSTER</span>
              <span className="text-[10px] text-purple-400">BPM</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="py-1 border-b border-purple-500/20 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-white text-[11px]">Neon Highway 1984</div>
                  <div className="text-[10px] text-purple-300">Outrun Synthwave</div>
                </div>
                <span className="font-mono text-cyan-300">104</span>
              </div>
              <div className="py-1 border-b border-purple-500/20 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-white text-[11px]">Cyber City Drift</div>
                  <div className="text-[10px] text-purple-300">Electro Darksynth</div>
                </div>
                <span className="font-mono text-cyan-300">120</span>
              </div>
              <div className="py-1 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-white text-[11px]">Midnight Cassette</div>
                  <div className="text-[10px] text-purple-300">Chill Vaporwave</div>
                </div>
                <span className="font-mono text-cyan-300">88</span>
              </div>
            </div>
          </div>

          {/* Card 3: Defense & Mechanics */}
          <div className="p-4 rounded-xl bg-[#120526]/80 border border-pink-500/30 backdrop-blur-md">
            <div className="text-xs font-arcade text-amber-300 mb-3 flex items-center justify-between">
              <span>FIELD TACTICS</span>
              <span className="text-[10px] text-purple-400">v1.0</span>
            </div>
            <ul className="text-xs text-purple-200/90 space-y-2 leading-relaxed">
              <li>
                <strong className="text-pink-300">Ablative Bunkers:</strong> 4 defensive barriers absorb enemy laser fire and erode pixel-by-pixel.
              </li>
              <li>
                <strong className="text-cyan-300">Panic Velocity:</strong> Alien swarm steps accelerate exponentially as their ranks thin.
              </li>
              <li>
                <strong className="text-amber-300">Audio Sync:</strong> The soundtrack and arcade SFX run on isolated synthesizers for optimal mix.
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-purple-500/20 bg-[#070110]/90 py-6 px-6 text-center text-xs text-purple-300/60 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-synth font-bold text-pink-400">VAPOR INVADERS</span>
            <span>·</span>
            <span>80s Arcade & Synthwave Audio Experience</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveModal('manual')}
              className="hover:text-pink-300 transition-colors"
            >
              Game Manual
            </button>
            <button
              onClick={() => setActiveModal('scores')}
              className="hover:text-cyan-300 transition-colors"
            >
              Hall of Fame
            </button>
            <button
              onClick={toggleScanlines}
              className="hover:text-amber-300 transition-colors"
            >
              CRT Scanlines: {scanlinesEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </footer>

      {/* Manual / How to Play Modal */}
      {activeModal === 'manual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#140628] border-2 border-pink-500/60 rounded-xl p-6 shadow-[0_0_30px_rgba(255,42,133,0.5)]">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
              <h3 className="font-arcade text-sm text-pink-400">PILOT MANUAL // 1984</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-purple-300 hover:text-white font-mono text-sm"
              >
                [ESC / CLOSE]
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-purple-100 leading-relaxed font-sans">
              <p>
                Welcome to <strong className="text-cyan-300">Vapor Invaders</strong>. Alien forces are descending through the neon grid toward the defense perimeter.
              </p>
              <div className="p-3 bg-purple-950/60 rounded border border-purple-700/40 font-mono text-[11px]">
                <div className="text-amber-300 font-bold mb-1">KEYBOARD CONTROLS:</div>
                <div>· Move Left: [A] or [Left Arrow]</div>
                <div>· Move Right: [D] or [Right Arrow]</div>
                <div>· Fire Cannon: [Spacebar] or [W] / [Up Arrow]</div>
                <div>· Pause Game: [P] or [Escape]</div>
              </div>
              <p>
                <strong>Bunkers:</strong> Take cover beneath the four defensive shields. Beware that shots from both your laser and alien weapons will gradually chip away at their integrity.
              </p>
              <p>
                <strong>Synthwave Music:</strong> Use the cassette deck controls to switch between three custom analog tracks, adjust volume, or toggle the real-time audio visualizer between neon frequency bars and oscilloscope waveforms.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-synth text-xs font-bold rounded-lg shadow-[0_0_10px_#ff2a85]"
              >
                RETURN TO ARCADE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hall of Fame / High Scores Modal */}
      {activeModal === 'scores' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#140628] border-2 border-cyan-500/60 rounded-xl p-6 shadow-[0_0_30px_rgba(5,217,232,0.4)]">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-300" />
                <h3 className="font-arcade text-xs text-cyan-400">HALL OF FAME</h3>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="text-purple-300 hover:text-white font-mono text-sm"
              >
                [CLOSE]
              </button>
            </div>
            <div className="mt-4 space-y-2 font-arcade text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <span>1ST · TOP PILOT</span>
                <span className="tabular-nums">
                  {localStorage.getItem('vapor_invaders_highscore') || '2500'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-purple-900/30 text-purple-200">
                <span>2ND · VECTOR_RUNNER</span>
                <span className="tabular-nums">2150</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-purple-900/30 text-purple-200">
                <span>3RD · LASER_GRID</span>
                <span className="tabular-nums">1820</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-purple-900/30 text-purple-200">
                <span>4TH · PALM_CLUB</span>
                <span className="tabular-nums">1450</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-purple-900/30 text-purple-200">
                <span>5TH · OUTRUN_84</span>
                <span className="tabular-nums">1100</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-synth text-xs font-bold rounded-lg shadow-[0_0_10px_#05d9e8]"
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
