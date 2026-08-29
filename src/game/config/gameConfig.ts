export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const BOARD = {
  left: 24,
  right: 366,
  floor: 720,
  dangerLine: 180,
} as const;

export const PHYSICS = {
  restitution: 0.25,
  friction: 0.08,
  frictionAir: 0.02,
  density: 0.002,
} as const;
