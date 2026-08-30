import { SpawnDistribution } from '../../types/game';

export const GAME_CONFIG = {
  // Canvas dimensions
  WIDTH: 720,
  HEIGHT: 1280,

  // Board / Table Container Geometry (Upward Merge Layout)
  BOARD: {
    WIDTH: 580,
    HEIGHT: 860,
    CENTER_X: 360,
    TOP_Y: 200,
    BOTTOM_Y: 1080,
    WALL_THICKNESS: 24,
    CORNER_RADIUS: 28,
    // Bounds
    get LEFT(): number { return this.CENTER_X - this.WIDTH / 2; },     // 70
    get RIGHT(): number { return this.CENTER_X + this.WIDTH / 2; },   // 650
    get TOP(): number { return this.TOP_Y; },                          // 200
    get BOTTOM(): number { return this.BOTTOM_Y; }                     // 1080
  },

  // Launcher & Danger Heights (Upward Layout: Launch from Bottom, Stack at Top)
  SPAWN_Y: 1010,
  DANGER_LINE_Y: 890,
  DROP_COOLDOWN_MS: 450,
  DANGER_GRACE_PERIOD_MS: 2000,

  // Physics Tuning (Calm, soft-settling upward sliding)
  PHYSICS: {
    GRAVITY_Y: -1.2,
    DEFAULT_RESTITUTION: 0.05,
    DEFAULT_FRICTION: 0.15,
    DEFAULT_FRICTION_AIR: 0.015,
    DEFAULT_DENSITY: 0.002
  },

  // Spawn probabilities (Weights sum to 100)
  SPAWN_DISTRIBUTION: [
    { level: 0, weight: 55 },
    { level: 1, weight: 30 },
    { level: 2, weight: 15 }
  ] as SpawnDistribution[],

  // LocalStorage Key
  STORAGE_KEY: 'cocktail_merge_save_v1'
} as const;
