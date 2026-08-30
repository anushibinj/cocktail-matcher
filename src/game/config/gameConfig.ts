import { SpawnDistribution } from '../../types/game';

export const GAME_CONFIG = {
  // Canvas dimensions
  WIDTH: 720,
  HEIGHT: 1280,

  // Board Container Geometry
  BOARD: {
    WIDTH: 580,
    HEIGHT: 780,
    CENTER_X: 360,
    BOTTOM_Y: 1120,
    WALL_THICKNESS: 24,
    CORNER_RADIUS: 28,
    // Derived bounds
    get LEFT(): number { return this.CENTER_X - this.WIDTH / 2; },     // 70
    get RIGHT(): number { return this.CENTER_X + this.WIDTH / 2; },   // 650
    get TOP(): number { return this.BOTTOM_Y - this.HEIGHT; },         // 340
    get FLOOR_Y(): number { return this.BOTTOM_Y; }                    // 1120
  },

  // Danger & Spawning Heights
  DANGER_LINE_Y: 390,
  SPAWN_Y: 250,
  DROP_COOLDOWN_MS: 500,
  DANGER_GRACE_PERIOD_MS: 2000,

  // Physics Tuning (Matter.js)
  PHYSICS: {
    GRAVITY_Y: 1.7,
    DEFAULT_RESTITUTION: 0.15,
    DEFAULT_FRICTION: 0.08,
    DEFAULT_FRICTION_AIR: 0.002,
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
