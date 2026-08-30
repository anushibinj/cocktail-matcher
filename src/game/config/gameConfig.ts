export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const BOARD = {
  left: 24,
  right: 366,
  ceiling: 180,
  spawnBase: 720,
  dangerLine: 180,
  spawnY: 700,
} as const;

export const PHYSICS = {
  gravity: 1.2,
  restitution: 0.22,
  friction: 0.12,
  frictionAir: 0.018,
  density: 0.002,
} as const;

export const SPAWN = {
  weights: [
    { level: 0, weight: 55 },
    { level: 1, weight: 30 },
    { level: 2, weight: 15 },
  ],
} as const;

export const GAME_OVER = {
  gracePeriodMs: 2000,
  settledSpeedThreshold: 0.8,
} as const;

export const UI = {
  headerHeight: 120,
} as const;
