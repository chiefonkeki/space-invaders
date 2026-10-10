export type GameStatus = 'ATTRACT' | 'PLAYING' | 'PAUSED' | 'WAVE_CLEAR' | 'GAME_OVER';

export interface Alien {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'squid' | 'crab' | 'octopus';
  points: number;
  color: string;
  alive: boolean;
  frame: number;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isPlayer: boolean;
  color: string;
}

export interface BunkerPixel {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number; // 3 = full, 2 = cracked, 1 = crumbling, 0 = destroyed
}

export interface Bunker {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: BunkerPixel[];
}

export interface Ufo {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  points: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}
