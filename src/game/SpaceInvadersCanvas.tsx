import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alien,
  Bullet,
  Bunker,
  BunkerPixel,
  FloatingText,
  GameStatus,
  Particle,
  Ufo,
} from './types';
import {
  CRAB_SPRITE,
  OCTOPUS_SPRITE,
  PLAYER_SPRITE,
  SQUID_SPRITE,
  UFO_SPRITE,
  drawPixelMatrix,
} from './sprites';
import { soundFx } from '../audio/soundFx';
import {
  Trophy,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Tv,
  ArrowLeft,
  ArrowRight,
  Crosshair,
} from 'lucide-react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;

const STORAGE_KEY_HIGHSCORE = 'vapor_invaders_highscore';

interface SpaceInvadersCanvasProps {
  onGameActiveChange?: (active: boolean) => void;
  scanlinesEnabled: boolean;
  onToggleScanlines: () => void;
}

export const SpaceInvadersCanvas: React.FC<SpaceInvadersCanvasProps> = ({
  scanlinesEnabled,
  onToggleScanlines,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High score from local storage
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
    return saved ? parseInt(saved, 10) : 2500;
  });

  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [gameStatus, setGameStatus] = useState<GameStatus>('ATTRACT');
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => soundFx.getIsMuted());

  // Input states
  const keysRef = useRef<{ left: boolean; right: boolean; shoot: boolean }>({
    left: false,
    right: false,
    shoot: false,
  });

  // Game internal mutable state for 60fps loop
  const gameStateRef = useRef<{
    player: {
      x: number;
      y: number;
      width: number;
      height: number;
      speed: number;
      invulnerable: number;
      alive: boolean;
    };
    aliens: Alien[];
    alienDir: number;
    alienStepTime: number;
    alienStepTimer: number;
    stepSoundIndex: number;
    alienBombTimer: number;
    bullets: Bullet[];
    bunkers: Bunker[];
    ufo: Ufo;
    ufoSpawnTimer: number;
    particles: Particle[];
    floatingTexts: FloatingText[];
    lastTime: number;
    waveTransitionTimer: number;
    respawnTimer: number;
  }>({
    player: {
      x: CANVAS_WIDTH / 2 - 20,
      y: CANVAS_HEIGHT - 65,
      width: 38,
      height: 22,
      speed: 300,
      invulnerable: 0,
      alive: true,
    },
    aliens: [],
    alienDir: 1,
    alienStepTime: 0.75,
    alienStepTimer: 0.75,
    stepSoundIndex: 0,
    alienBombTimer: 2.0,
    bullets: [],
    bunkers: [],
    ufo: {
      x: -60,
      y: 50,
      width: 48,
      height: 22,
      vx: 0,
      points: 100,
      active: false,
    },
    ufoSpawnTimer: 18,
    particles: [],
    floatingTexts: [],
    lastTime: performance.now(),
    waveTransitionTimer: 0,
    respawnTimer: 0,
  });

  // Bunker generator
  const createBunkers = useCallback((): Bunker[] => {
    const bunkers: Bunker[] = [];
    const bunkerCount = 4;
    const bunkerWidth = 60;
    const bunkerHeight = 44;
    const pixelSize = 6;
    const spacing = (CANVAS_WIDTH - bunkerCount * bunkerWidth) / (bunkerCount + 1);
    const bunkerY = CANVAS_HEIGHT - 160;

    for (let b = 0; b < bunkerCount; b++) {
      const startX = spacing + b * (bunkerWidth + spacing);
      const pixels: BunkerPixel[] = [];

      const rows = 7;
      const cols = 10;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Carve arch in bottom center
          const isBottomArch = r >= 4 && c >= 3 && c <= 6;
          // Carve top sloped corners
          const isTopCorner = (r === 0 && (c === 0 || c === cols - 1)) ||
                              (r === 1 && (c === 0 || c === cols - 1));

          if (!isBottomArch && !isTopCorner) {
            pixels.push({
              x: startX + c * pixelSize,
              y: bunkerY + r * pixelSize,
              width: pixelSize,
              height: pixelSize,
              health: 3,
            });
          }
        }
      }

      bunkers.push({
        x: startX,
        y: bunkerY,
        width: bunkerWidth,
        height: bunkerHeight,
        pixels,
      });
    }

    return bunkers;
  }, []);

  // Alien Fleet generator
  const createAliens = useCallback((currentWave: number): Alien[] => {
    const aliens: Alien[] = [];
    const rows = 5;
    const cols = 11;
    const alienWidth = 32;
    const alienHeight = 22;
    const paddingX = 14;
    const paddingY = 16;
    const fleetWidth = cols * alienWidth + (cols - 1) * paddingX;
    const startX = (CANVAS_WIDTH - fleetWidth) / 2;
    const startY = 110 + Math.min(60, (currentWave - 1) * 15);

    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: 'squid' | 'crab' | 'octopus' = 'octopus';
        let points = 10;
        let color = '#b537f2'; // Vapor lavender

        if (r === 0) {
          type = 'squid';
          points = 30;
          color = '#ff2a85'; // Neon hot pink
        } else if (r === 1 || r === 2) {
          type = 'crab';
          points = 20;
          color = '#05d9e8'; // Neon cyan
        }

        aliens.push({
          id: id++,
          row: r,
          col: c,
          x: startX + c * (alienWidth + paddingX),
          y: startY + r * (alienHeight + paddingY),
          width: alienWidth,
          height: alienHeight,
          type,
          points,
          color,
          alive: true,
          frame: 0,
        });
      }
    }

    return aliens;
  }, []);

  // Initialize new game session
  const initGame = useCallback((targetWave: number = 1) => {
    const gs = gameStateRef.current;
    gs.player.x = CANVAS_WIDTH / 2 - 20;
    gs.player.alive = true;
    gs.player.invulnerable = 2.0;
    gs.aliens = createAliens(targetWave);
    gs.alienDir = 1;
    gs.alienStepTime = Math.max(0.2, 0.75 - (targetWave - 1) * 0.05);
    gs.alienStepTimer = gs.alienStepTime;
    gs.stepSoundIndex = 0;
    gs.alienBombTimer = 1.8;
    gs.bullets = [];
    gs.bunkers = createBunkers();
    gs.particles = [];
    gs.floatingTexts = [];
    gs.ufo = {
      x: -60,
      y: 55,
      width: 48,
      height: 22,
      vx: 0,
      points: 100,
      active: false,
    };
    gs.ufoSpawnTimer = 15 + Math.random() * 10;
    gs.waveTransitionTimer = 0;
    gs.respawnTimer = 0;
  }, [createAliens, createBunkers]);

  // Start / Restart game
  const handleStartGame = () => {
    setScore(0);
    setWave(1);
    setLives(3);
    initGame(1);
    setGameStatus('PLAYING');
  };

  const handleResumeGame = () => {
    if (gameStatus === 'PAUSED') {
      setGameStatus('PLAYING');
    }
  };

  const handlePauseToggle = () => {
    if (gameStatus === 'PLAYING') {
      setGameStatus('PAUSED');
      soundFx.stopUfoSiren();
    } else if (gameStatus === 'PAUSED') {
      setGameStatus('PLAYING');
    }
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) {
        // Prevent default window scrolling when gaming
        e.preventDefault();
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = true;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = true;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        keysRef.current.shoot = true;
        if (gameStatus === 'ATTRACT' || gameStatus === 'GAME_OVER') {
          handleStartGame();
        }
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        handlePauseToggle();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = false;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = false;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        keysRef.current.shoot = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus]);

  // Check and update High Score
  const addScore = useCallback((pts: number) => {
    setScore((prev) => {
      const nextScore = prev + pts;
      if (nextScore > highScore) {
        setHighScore(nextScore);
        localStorage.setItem(STORAGE_KEY_HIGHSCORE, nextScore.toString());
      }
      return nextScore;
    });
  }, [highScore]);

  // Spawn explosion particles
  const spawnExplosion = useCallback((x: number, y: number, color: string, count = 16) => {
    const particles = gameStateRef.current.particles;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.5,
      });
    }
  }, []);

  // Main 60fps Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = (currentTime: number) => {
      const gs = gameStateRef.current;
      const dt = Math.min((currentTime - gs.lastTime) / 1000, 0.1);
      gs.lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // Update Phase
      if (gameStatus === 'PLAYING') {
        // 1. Update Player Movement
        if (gs.player.alive) {
          if (keysRef.current.left) {
            gs.player.x -= gs.player.speed * dt;
          }
          if (keysRef.current.right) {
            gs.player.x += gs.player.speed * dt;
          }
          // Clamp player within boundaries
          gs.player.x = Math.max(16, Math.min(CANVAS_WIDTH - gs.player.width - 16, gs.player.x));

          // Player Shooting (1 shot on screen classic Space Invaders rule)
          const playerBulletExists = gs.bullets.some((b) => b.isPlayer);
          if (keysRef.current.shoot && !playerBulletExists) {
            gs.bullets.push({
              x: gs.player.x + gs.player.width / 2 - 2,
              y: gs.player.y - 8,
              width: 4,
              height: 12,
              vy: -580,
              isPlayer: true,
              color: '#05d9e8',
            });
            soundFx.playShoot();
          }

          if (gs.player.invulnerable > 0) {
            gs.player.invulnerable -= dt;
          }
        } else {
          // Player respawn countdown
          gs.respawnTimer -= dt;
          if (gs.respawnTimer <= 0 && lives > 0) {
            gs.player.alive = true;
            gs.player.x = CANVAS_WIDTH / 2 - 20;
            gs.player.invulnerable = 2.0;
          }
        }

        // 2. Update Alien Movement (Stepping Swarm)
        const aliveAliens = gs.aliens.filter((a) => a.alive);

        if (aliveAliens.length === 0) {
          // Wave Cleared!
          soundFx.playWaveClear();
          soundFx.stopUfoSiren();
          setGameStatus('WAVE_CLEAR');
          setTimeout(() => {
            setWave((w) => {
              const nextWave = w + 1;
              initGame(nextWave);
              setGameStatus('PLAYING');
              return nextWave;
            });
          }, 1500);
        } else {
          gs.alienStepTimer -= dt;

          // Alien Step Speed accelerates as aliens are eliminated
          // 55 down to 1 alien -> stepTime scales from 0.75 down to 0.05
          const speedFactor = aliveAliens.length / 55;
          const currentStepRate = Math.max(0.06, gs.alienStepTime * (0.15 + 0.85 * speedFactor));

          if (gs.alienStepTimer <= 0) {
            gs.alienStepTimer = currentStepRate;

            // Check if any alive alien reached left or right border
            let needDropAndReverse = false;
            const minX = Math.min(...aliveAliens.map((a) => a.x));
            const maxX = Math.max(...aliveAliens.map((a) => a.x + a.width));

            if (gs.alienDir > 0 && maxX >= CANVAS_WIDTH - 20) {
              needDropAndReverse = true;
            } else if (gs.alienDir < 0 && minX <= 20) {
              needDropAndReverse = true;
            }

            if (needDropAndReverse) {
              gs.alienDir *= -1;
              const dropAmount = 16;
              aliveAliens.forEach((a) => {
                a.y += dropAmount;
              });

              // Check if aliens invaded defense line (game over trigger)
              const lowestAlienY = Math.max(...aliveAliens.map((a) => a.y + a.height));
              if (lowestAlienY >= gs.player.y - 10) {
                soundFx.playPlayerHit();
                soundFx.stopUfoSiren();
                setGameStatus('GAME_OVER');
              }
            } else {
              const stepShift = 12 * gs.alienDir;
              aliveAliens.forEach((a) => {
                a.x += stepShift;
                a.frame = 1 - a.frame; // toggle animation frame
              });
            }

            // Play iconic marching pitch step
            soundFx.playInvaderStep(gs.stepSoundIndex);
            gs.stepSoundIndex = (gs.stepSoundIndex + 1) % 4;
          }

          // 3. Alien Bomb Dropping
          gs.alienBombTimer -= dt;
          if (gs.alienBombTimer <= 0) {
            // Pick a random alive bottom-most alien
            const columnsWithAliens = new Map<number, Alien>();
            aliveAliens.forEach((alien) => {
              const existing = columnsWithAliens.get(alien.col);
              if (!existing || alien.row > existing.row) {
                columnsWithAliens.set(alien.col, alien);
              }
            });

            const shootingCandidates = Array.from(columnsWithAliens.values());
            if (shootingCandidates.length > 0) {
              const shooter = shootingCandidates[Math.floor(Math.random() * shootingCandidates.length)];
              gs.bullets.push({
                x: shooter.x + shooter.width / 2 - 2,
                y: shooter.y + shooter.height + 2,
                width: 4,
                height: 12,
                vy: 240 + wave * 15,
                isPlayer: false,
                color: '#ff2a85',
              });
            }

            // Reset bomb timer
            gs.alienBombTimer = Math.max(0.6, 2.0 - wave * 0.15 - (55 - aliveAliens.length) * 0.02);
          }
        }

        // 4. Mystery UFO
        if (!gs.ufo.active) {
          gs.ufoSpawnTimer -= dt;
          if (gs.ufoSpawnTimer <= 0) {
            gs.ufo.active = true;
            const fromLeft = Math.random() > 0.5;
            gs.ufo.x = fromLeft ? -50 : CANVAS_WIDTH + 10;
            gs.ufo.vx = fromLeft ? 140 : -140;
            const mysteryScores = [50, 100, 150, 300];
            gs.ufo.points = mysteryScores[Math.floor(Math.random() * mysteryScores.length)];
            soundFx.startUfoSiren();
          }
        } else {
          gs.ufo.x += gs.ufo.vx * dt;
          if (
            (gs.ufo.vx > 0 && gs.ufo.x > CANVAS_WIDTH + 40) ||
            (gs.ufo.vx < 0 && gs.ufo.x < -60)
          ) {
            gs.ufo.active = false;
            gs.ufoSpawnTimer = 18 + Math.random() * 15;
            soundFx.stopUfoSiren();
          }
        }

        // 5. Update Bullets & Collisions
        for (let i = gs.bullets.length - 1; i >= 0; i--) {
          const b = gs.bullets[i];
          b.y += b.vy * dt;

          // Out of screen
          if (b.y < 30 || b.y > CANVAS_HEIGHT) {
            gs.bullets.splice(i, 1);
            continue;
          }

          let bulletConsumed = false;

          // Collide with Bunkers
          for (const bunker of gs.bunkers) {
            for (let pIdx = bunker.pixels.length - 1; pIdx >= 0; pIdx--) {
              const px = bunker.pixels[pIdx];
              if (
                b.x < px.x + px.width &&
                b.x + b.width > px.x &&
                b.y < px.y + px.height &&
                b.y + b.height > px.y
              ) {
                px.health--;
                if (px.health <= 0) {
                  bunker.pixels.splice(pIdx, 1);
                }
                spawnExplosion(px.x + px.width / 2, px.y + px.height / 2, '#ffe600', 4);
                soundFx.playBunkerHit();
                gs.bullets.splice(i, 1);
                bulletConsumed = true;
                break;
              }
            }
            if (bulletConsumed) break;
          }
          if (bulletConsumed) continue;

          // If Player Bullet: check hit against Aliens or UFO
          if (b.isPlayer) {
            // Hit UFO
            if (
              gs.ufo.active &&
              b.x < gs.ufo.x + gs.ufo.width &&
              b.x + b.width > gs.ufo.x &&
              b.y < gs.ufo.y + gs.ufo.height &&
              b.y + b.height > gs.ufo.y
            ) {
              gs.ufo.active = false;
              gs.ufoSpawnTimer = 20 + Math.random() * 10;
              spawnExplosion(gs.ufo.x + gs.ufo.width / 2, gs.ufo.y + gs.ufo.height / 2, '#ffe600', 25);
              soundFx.playUfoHit();
              addScore(gs.ufo.points);
              gs.floatingTexts.push({
                x: gs.ufo.x,
                y: gs.ufo.y,
                text: `+${gs.ufo.points}`,
                color: '#ffe600',
                life: 1.2,
                maxLife: 1.2,
              });
              gs.bullets.splice(i, 1);
              continue;
            }

            // Hit Aliens
            for (const alien of gs.aliens) {
              if (
                alien.alive &&
                b.x < alien.x + alien.width &&
                b.x + b.width > alien.x &&
                b.y < alien.y + alien.height &&
                b.y + b.height > alien.y
              ) {
                alien.alive = false;
                spawnExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.color, 14);
                soundFx.playAlienHit();
                addScore(alien.points);
                gs.floatingTexts.push({
                  x: alien.x,
                  y: alien.y,
                  text: `+${alien.points}`,
                  color: alien.color,
                  life: 0.8,
                  maxLife: 0.8,
                });
                gs.bullets.splice(i, 1);
                bulletConsumed = true;
                break;
              }
            }
          } else {
            // Alien Bomb: check hit against Player
            if (
              gs.player.alive &&
              gs.player.invulnerable <= 0 &&
              b.x < gs.player.x + gs.player.width &&
              b.x + b.width > gs.player.x &&
              b.y < gs.player.y + gs.player.height &&
              b.y + b.height > gs.player.y
            ) {
              gs.player.alive = false;
              spawnExplosion(gs.player.x + gs.player.width / 2, gs.player.y + gs.player.height / 2, '#05d9e8', 30);
              soundFx.playPlayerHit();
              gs.bullets.splice(i, 1);

              setLives((prevLives) => {
                const nextLives = prevLives - 1;
                if (nextLives <= 0) {
                  soundFx.stopUfoSiren();
                  setGameStatus('GAME_OVER');
                } else {
                  gs.respawnTimer = 1.2;
                }
                return nextLives;
              });
              continue;
            }
          }
        }

        // 6. Update Particles
        for (let i = gs.particles.length - 1; i >= 0; i--) {
          const p = gs.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) {
            gs.particles.splice(i, 1);
          }
        }

        // 7. Update Floating Texts
        for (let i = gs.floatingTexts.length - 1; i >= 0; i--) {
          const ft = gs.floatingTexts[i];
          ft.y -= 25 * dt;
          ft.life -= dt;
          if (ft.life <= 0) {
            gs.floatingTexts.splice(i, 1);
          }
        }
      }

      // ==========================================
      // RENDER PHASE
      // ==========================================

      // Background
      ctx.fillStyle = '#0b0416';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle vaporwave grid floor line
      ctx.strokeStyle = '#b537f2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, CANVAS_HEIGHT - 35);
      ctx.lineTo(CANVAS_WIDTH - 16, CANVAS_HEIGHT - 35);
      ctx.stroke();

      // Top HUD line
      ctx.strokeStyle = '#ff2a85';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, 42);
      ctx.lineTo(CANVAS_WIDTH - 16, 42);
      ctx.stroke();

      // Draw Top HUD Stats
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff2a85';
      ctx.fillText('SCORE', 20, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(score.toString().padStart(5, '0'), 20, 38);

      ctx.fillStyle = '#ffe600';
      ctx.fillText('HIGH SCORE', CANVAS_WIDTH / 2 - 60, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(highScore.toString().padStart(5, '0'), CANVAS_WIDTH / 2 - 30, 38);

      ctx.fillStyle = '#05d9e8';
      ctx.fillText('WAVE', CANVAS_WIDTH - 90, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`0${wave}`, CANVAS_WIDTH - 80, 38);

      // Draw Mystery UFO
      if (gs.ufo.active) {
        drawPixelMatrix(ctx, UFO_SPRITE, gs.ufo.x, gs.ufo.y, gs.ufo.width, gs.ufo.height, '#ffe600', true);
      }

      // Draw Aliens
      gs.aliens.forEach((alien) => {
        if (!alien.alive) return;
        if (alien.type === 'squid') {
          const sprite = alien.frame === 0 ? SQUID_SPRITE.frame0 : SQUID_SPRITE.frame1;
          drawPixelMatrix(ctx, sprite, alien.x, alien.y, alien.width, alien.height, alien.color, true);
        } else if (alien.type === 'crab') {
          const sprite = alien.frame === 0 ? CRAB_SPRITE.frame0 : CRAB_SPRITE.frame1;
          drawPixelMatrix(ctx, sprite, alien.x, alien.y, alien.width, alien.height, alien.color, true);
        } else {
          const sprite = alien.frame === 0 ? OCTOPUS_SPRITE.frame0 : OCTOPUS_SPRITE.frame1;
          drawPixelMatrix(ctx, sprite, alien.x, alien.y, alien.width, alien.height, alien.color, true);
        }
      });

      // Draw Bunkers
      gs.bunkers.forEach((bunker) => {
        bunker.pixels.forEach((pixel) => {
          let alpha = 1.0;
          if (pixel.health === 2) alpha = 0.7;
          if (pixel.health === 1) alpha = 0.4;

          ctx.fillStyle = `rgba(5, 217, 232, ${alpha})`;
          ctx.fillRect(pixel.x, pixel.y, pixel.width, pixel.height);
        });
      });

      // Draw Bullets
      gs.bullets.forEach((bullet) => {
        ctx.save();
        ctx.fillStyle = bullet.color;
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.restore();
      });

      // Draw Player Cannon
      if (gs.player.alive) {
        const blink = gs.player.invulnerable > 0 && Math.floor(Date.now() / 80) % 2 === 0;
        if (!blink) {
          drawPixelMatrix(ctx, PLAYER_SPRITE, gs.player.x, gs.player.y, gs.player.width, gs.player.height, '#05d9e8', true);
        }
      }

      // Draw Particles
      gs.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
      });

      // Draw Floating Scores
      gs.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = ft.life / ft.maxLife;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Bottom Bar HUD: Lives & Credits
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#05d9e8';
      ctx.fillText(`${lives} LIVES`, 20, CANVAS_HEIGHT - 14);

      // Render mini player icons for lives
      for (let l = 0; l < lives; l++) {
        drawPixelMatrix(ctx, PLAYER_SPRITE, 100 + l * 26, CANVAS_HEIGHT - 22, 18, 11, '#05d9e8', false);
      }

      ctx.fillStyle = '#ff2a85';
      ctx.fillText('CREDIT 01', CANVAS_WIDTH - 120, CANVAS_HEIGHT - 14);

      // State Overlays: Attract / Game Over / Paused / Wave Clear
      if (gameStatus === 'ATTRACT') {
        ctx.fillStyle = 'rgba(11, 4, 22, 0.88)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.textAlign = 'center';

        // Title
        ctx.save();
        ctx.font = '22px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff2a85';
        ctx.shadowColor = '#ff2a85';
        ctx.shadowBlur = 14;
        ctx.fillText('SPACE INVADERS', CANVAS_WIDTH / 2, 160);
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillStyle = '#05d9e8';
        ctx.shadowColor = '#05d9e8';
        ctx.fillText('SYNTHWAVE ARCADE 1984', CANVAS_WIDTH / 2, 200);
        ctx.restore();

        // Points Table
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffe600';
        ctx.fillText('* SCORE ADVANCE TABLE *', CANVAS_WIDTH / 2, 260);

        // Mystery UFO
        drawPixelMatrix(ctx, UFO_SPRITE, CANVAS_WIDTH / 2 - 80, 290, 36, 16, '#ffe600', true);
        ctx.fillStyle = '#ffe600';
        ctx.textAlign = 'left';
        ctx.fillText('= ? MYSTERY', CANVAS_WIDTH / 2 - 30, 303);

        // Squid
        drawPixelMatrix(ctx, SQUID_SPRITE.frame0, CANVAS_WIDTH / 2 - 76, 330, 28, 20, '#ff2a85', true);
        ctx.fillStyle = '#ff2a85';
        ctx.fillText('= 30 POINTS', CANVAS_WIDTH / 2 - 30, 345);

        // Crab
        drawPixelMatrix(ctx, CRAB_SPRITE.frame0, CANVAS_WIDTH / 2 - 76, 370, 28, 20, '#05d9e8', true);
        ctx.fillStyle = '#05d9e8';
        ctx.fillText('= 20 POINTS', CANVAS_WIDTH / 2 - 30, 385);

        // Octopus
        drawPixelMatrix(ctx, OCTOPUS_SPRITE.frame0, CANVAS_WIDTH / 2 - 76, 410, 28, 20, '#b537f2', true);
        ctx.fillStyle = '#b537f2';
        ctx.fillText('= 10 POINTS', CANVAS_WIDTH / 2 - 30, 425);

        // Instructions
        ctx.textAlign = 'center';
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        const blinkText = Math.floor(Date.now() / 450) % 2 === 0;
        if (blinkText) {
          ctx.fillStyle = '#05d9e8';
          ctx.fillText('PRESS SPACE OR TAP FIRE TO PLAY', CANVAS_WIDTH / 2, 500);
        }

        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillStyle = '#a855f7';
        ctx.fillText('CONTROLS: [A/D] OR [ARROWS] TO MOVE · [SPACE] FIRE', CANVAS_WIDTH / 2, 550);
        ctx.fillText('[P] PAUSE · CASSETTE DECK CONTROLS SYNTH AUDIO', CANVAS_WIDTH / 2, 575);

        ctx.textAlign = 'left';
      } else if (gameStatus === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(11, 4, 22, 0.88)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.textAlign = 'center';
        ctx.font = '26px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff2a85';
        ctx.shadowColor = '#ff2a85';
        ctx.shadowBlur = 18;
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 260);

        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText(`FINAL SCORE: ${score}`, CANVAS_WIDTH / 2, 320);
        ctx.fillStyle = '#ffe600';
        ctx.fillText(`HIGH SCORE: ${highScore}`, CANVAS_WIDTH / 2, 355);

        const blinkReplay = Math.floor(Date.now() / 450) % 2 === 0;
        if (blinkReplay) {
          ctx.fillStyle = '#05d9e8';
          ctx.fillText('PRESS SPACE OR TAP RESTART', CANVAS_WIDTH / 2, 430);
        }

        ctx.textAlign = 'left';
      } else if (gameStatus === 'PAUSED') {
        ctx.fillStyle = 'rgba(11, 4, 22, 0.75)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.textAlign = 'center';
        ctx.font = '22px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 14;
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 320);

        ctx.font = '11px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText('PRESS [P] OR TAP RESUME', CANVAS_WIDTH / 2, 370);

        ctx.textAlign = 'left';
      } else if (gameStatus === 'WAVE_CLEAR') {
        ctx.textAlign = 'center';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.fillStyle = '#05d9e8';
        ctx.shadowColor = '#05d9e8';
        ctx.shadowBlur = 16;
        ctx.fillText(`WAVE ${wave} CLEARED!`, CANVAS_WIDTH / 2, 330);
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffe600';
        ctx.fillText('+500 BONUS POINTS', CANVAS_WIDTH / 2, 370);
        ctx.textAlign = 'left';
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      soundFx.stopUfoSiren();
    };
  }, [gameStatus, score, highScore, wave, lives, initGame, addScore, spawnExplosion]);

  // Touch control handlers for mobile
  const handleTouchLeftStart = () => { keysRef.current.left = true; };
  const handleTouchLeftEnd = () => { keysRef.current.left = false; };
  const handleTouchRightStart = () => { keysRef.current.right = true; };
  const handleTouchRightEnd = () => { keysRef.current.right = false; };
  const handleTouchFireStart = () => {
    keysRef.current.shoot = true;
    if (gameStatus === 'ATTRACT' || gameStatus === 'GAME_OVER') {
      handleStartGame();
    }
  };
  const handleTouchFireEnd = () => { keysRef.current.shoot = false; };

  const handleToggleSfx = () => {
    soundFx.toggleMute();
    setSfxMuted(soundFx.getIsMuted());
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Top Arcade Header Bar with high score and cabinet badge */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-purple-950/40 border-t border-x border-pink-500/30 rounded-t-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-arcade text-xs text-pink-400 tracking-wider">VAPOR-84</span>
          <span className="text-pink-500/40 text-xs">/</span>
          <span className="font-mono text-xs text-cyan-300">STAGE {wave}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-arcade">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span className="tabular-nums">{highScore}</span>
          </div>

          <button
            onClick={handleToggleSfx}
            title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
            className="text-pink-400 hover:text-pink-200 transition-colors p-1"
          >
            {sfxMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleScanlines}
            title="Toggle CRT Scanlines"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors border ${
              scanlinesEnabled
                ? 'border-pink-500/80 bg-pink-500/20 text-pink-300'
                : 'border-slate-700 bg-slate-800/40 text-slate-400'
            }`}
          >
            <Tv className="w-3 h-3" />
            <span>CRT</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Arcade Cabinet Window */}
      <div className="relative w-full aspect-[6/7] max-h-[640px] bg-[#0b0416] border-2 border-pink-500/60 shadow-[0_0_25px_rgba(255,42,133,0.35),inset_0_0_15px_rgba(5,217,232,0.2)] overflow-hidden">
        {/* Actual 2D Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block object-contain"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Scanlines Overlay */}
        {scanlinesEnabled && (
          <div className="absolute inset-0 crt-scanlines pointer-events-none" />
        )}

        {/* CRT Curved Vignette */}
        <div className="absolute inset-0 crt-vignette pointer-events-none" />

        {/* Rolling scan beam */}
        {scanlinesEnabled && (
          <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-white/0 via-pink-400/5 to-white/0 pointer-events-none animate-scan-roll" />
        )}

        {/* Overlay Action Buttons when Attract or Game Over */}
        {gameStatus === 'ATTRACT' && (
          <div className="absolute bottom-6 inset-x-0 flex justify-center z-10">
            <button
              onClick={handleStartGame}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-arcade text-xs rounded-lg shadow-[0_0_15px_#ff2a85] transition-transform active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>INSERT COIN / PLAY</span>
            </button>
          </div>
        )}

        {gameStatus === 'GAME_OVER' && (
          <div className="absolute bottom-10 inset-x-0 flex justify-center z-10">
            <button
              onClick={handleStartGame}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-arcade text-xs rounded-lg shadow-[0_0_15px_#05d9e8] transition-transform active:scale-95 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}

        {gameStatus === 'PAUSED' && (
          <div className="absolute bottom-16 inset-x-0 flex justify-center z-10">
            <button
              onClick={handleResumeGame}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-pink-500 text-white font-arcade text-xs rounded-lg shadow-[0_0_15px_#ffe600] transition-transform active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>RESUME GAME</span>
            </button>
          </div>
        )}
      </div>

      {/* Arcade Bezel Base / Virtual Touch Controls for Mobile/Tablet */}
      <div className="w-full bg-[#120626] border-b border-x border-pink-500/30 rounded-b-xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between gap-4">
          {/* Movement touch buttons */}
          <div className="flex items-center gap-2">
            <button
              onTouchStart={handleTouchLeftStart}
              onTouchEnd={handleTouchLeftEnd}
              onMouseDown={handleTouchLeftStart}
              onMouseUp={handleTouchLeftEnd}
              onMouseLeave={handleTouchLeftEnd}
              className="w-14 h-12 bg-purple-900/60 hover:bg-purple-800 active:bg-pink-600/80 border border-purple-500/40 rounded-lg flex items-center justify-center text-pink-300 active:text-white transition-all select-none shadow-[0_0_8px_rgba(181,55,242,0.3)]"
              aria-label="Move Left"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onTouchStart={handleTouchRightStart}
              onTouchEnd={handleTouchRightEnd}
              onMouseDown={handleTouchRightStart}
              onMouseUp={handleTouchRightEnd}
              onMouseLeave={handleTouchRightEnd}
              className="w-14 h-12 bg-purple-900/60 hover:bg-purple-800 active:bg-pink-600/80 border border-purple-500/40 rounded-lg flex items-center justify-center text-pink-300 active:text-white transition-all select-none shadow-[0_0_8px_rgba(181,55,242,0.3)]"
              aria-label="Move Right"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick status & key guidance */}
          <div className="hidden sm:flex flex-col items-center text-center">
            <span className="font-arcade text-[10px] text-pink-400">KEYBOARD: [A/D] MOVE</span>
            <span className="font-arcade text-[9px] text-cyan-400 mt-1">[SPACE] FIRE · [P] PAUSE</span>
          </div>

          {/* Fire touch button */}
          <div>
            <button
              onTouchStart={handleTouchFireStart}
              onTouchEnd={handleTouchFireEnd}
              onMouseDown={handleTouchFireStart}
              onMouseUp={handleTouchFireEnd}
              onMouseLeave={handleTouchFireEnd}
              className="px-6 h-12 bg-gradient-to-r from-pink-600 to-rose-600 active:from-pink-500 active:to-yellow-500 text-white font-arcade text-xs rounded-lg flex items-center gap-2 border border-pink-400 shadow-[0_0_12px_rgba(255,42,133,0.5)] transition-all select-none active:scale-95"
              aria-label="Fire Laser"
            >
              <Crosshair className="w-4 h-4" />
              <span>FIRE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
