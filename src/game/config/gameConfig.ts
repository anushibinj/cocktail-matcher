import { SpawnDistribution } from '../../types/game';

// Design reference: the game's whole layout (board, drink radii, HUD, modals)
// is tuned against a 720x1280 (9:16) virtual canvas. Phaser's FIT scale mode
// then maps that canvas onto the real viewport, so on a device *shorter and
// relatively wider* than 9:16 (tablets) the fit is height-bound and looks
// fine, but on a device *taller and narrower* than 9:16 (most modern phones,
// which run closer to 19.5:9 / 20:9) the fit becomes width-bound, leaving
// large empty letterbox bars above and below the board.
//
// Fix: stretch the virtual canvas HEIGHT to match the device's own aspect
// ratio whenever that device is taller than the 9:16 reference, so the board
// fills the full screen height with no letterboxing. Devices at or below the
// reference ratio (tablets, older/wider phones, desktop windows) are left
// exactly as before — this only changes behavior for the "too tall, too
// narrow" case the reference design didn't anticipate.
const REFERENCE_WIDTH = 720;
const REFERENCE_HEIGHT = 1280;
const REFERENCE_ASPECT = REFERENCE_HEIGHT / REFERENCE_WIDTH; // 1.7778 (9:16)
const MAX_ASPECT = 2.4; // cap for extreme/edge-case aspect ratios (very tall+narrow phones)

function computeCanvasHeight(): number {
  if (typeof window === 'undefined') {
    return REFERENCE_HEIGHT;
  }

  const viewportAspect = window.innerHeight / window.innerWidth;
  if (viewportAspect <= REFERENCE_ASPECT) {
    return REFERENCE_HEIGHT;
  }

  return Math.round(REFERENCE_WIDTH * Math.min(viewportAspect, MAX_ASPECT));
}

const CANVAS_HEIGHT = computeCanvasHeight();

// Scales a Y-coordinate tuned against the 1280-tall reference design so
// vertical layout (board extent, spawn/danger lines, HUD) stretches to fill
// the taller canvas on narrow/tall devices instead of leaving a gap at the
// bottom. A no-op whenever CANVAS_HEIGHT === REFERENCE_HEIGHT.
const scaleY = (referenceValue: number): number =>
  Math.round((referenceValue / REFERENCE_HEIGHT) * CANVAS_HEIGHT);

export const GAME_CONFIG = {
  // Canvas dimensions
  WIDTH: REFERENCE_WIDTH,
  HEIGHT: CANVAS_HEIGHT,

  // Board / Table Container Geometry (Upward Merge Layout)
  BOARD: {
    WIDTH: 580,
    HEIGHT: scaleY(860),
    CENTER_X: 360,
    TOP_Y: scaleY(200),
    BOTTOM_Y: scaleY(1080),
    WALL_THICKNESS: 24,
    CORNER_RADIUS: 28,
    // Bounds
    get LEFT(): number { return this.CENTER_X - this.WIDTH / 2; },     // 70
    get RIGHT(): number { return this.CENTER_X + this.WIDTH / 2; },   // 650
    get TOP(): number { return this.TOP_Y; },
    get BOTTOM(): number { return this.BOTTOM_Y; }
  },

  // Launcher & Danger Heights (Upward Layout: Launch from Bottom, Stack at Top)
  SPAWN_Y: scaleY(1010),
  // 890 left roughly 54% of the board height as a "safe" buffer below the
  // ceiling; sustained random play never filled anywhere close to that much
  // of it (observed settled-pile front stayed around 25-30% of the height
  // even after 200+ careless drops), so overflow was effectively unreachable
  // without deliberately stacking in one spot. Moved closer to the ceiling
  // so a disorganized pile becomes genuinely risky.
  DANGER_LINE_Y: scaleY(540),
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

  // Spawn probabilities (Weights sum to 100). Spread across 5 tiers rather
  // than just 2-3: with only a couple of tiers in circulation, any two
  // neighboring drinks have a high chance of matching by pure luck, so
  // careless placement merges about as well as careful aiming. A wider pool
  // makes matches something you have to set up on purpose.
  SPAWN_DISTRIBUTION: [
    { level: 0, weight: 30 },
    { level: 1, weight: 25 },
    { level: 2, weight: 20 },
    { level: 3, weight: 15 },
    { level: 4, weight: 10 }
  ] as SpawnDistribution[],

  // LocalStorage Key
  STORAGE_KEY: 'cocktail_merge_save_v1'
} as const;
