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
export const REFERENCE_WIDTH = 720;
export const REFERENCE_HEIGHT = 1280;
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
// bottom. A no-op whenever canvasHeight === REFERENCE_HEIGHT.
export const scaleY = (referenceValue: number, canvasHeight: number = CANVAS_HEIGHT): number =>
  Math.round((referenceValue / REFERENCE_HEIGHT) * canvasHeight);

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
    get LEFT(): number {
      return this.CENTER_X - this.WIDTH / 2;
    }, // 70
    get RIGHT(): number {
      return this.CENTER_X + this.WIDTH / 2;
    }, // 650
    get TOP(): number {
      return this.TOP_Y;
    },
    get BOTTOM(): number {
      return this.BOTTOM_Y;
    }
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

// Named UI anchors, grouped by component. X values are in the fixed
// 720-wide reference space; Y values that sit relative to the bottom of the
// screen are scaled via scaleY() so they follow the stretched canvas.
// Modal offsets are relative to the card's center (the canvas center).
// Built from a height argument so the layout can be recomputed for a new
// canvas height later; LAYOUT is the layout for the current canvas.
export function getLayout(canvasHeight: number) {
  const sy = (referenceValue: number): number => scaleY(referenceValue, canvasHeight);

  return {
    HUD: {
      // Top-right sound / music / pause cluster
      BUTTONS: {
        Y: 48,
        SIZE: 42,
        SOUND_X: 560,
        MUSIC_X: 614,
        PAUSE_X: 668
      },
      // SCORE (left) and BEST (right) cards near the bottom edge
      SCORE_CARDS: {
        Y: sy(1190),
        WIDTH: 200,
        HEIGHT: 72,
        SCORE_X: 220,
        BEST_X: 500,
        LABEL_OFFSET_Y: -18,
        VALUE_OFFSET_Y: 12
      }
    },

    MENU: {
      TITLE_Y: canvasHeight * 0.28,
      BEST_CARD: { Y: canvasHeight * 0.54, WIDTH: 240, HEIGHT: 76 },
      PLAY_BUTTON: { Y: canvasHeight * 0.68, WIDTH: 280, HEIGHT: 78 },
      TIP_Y: canvasHeight * 0.82,
      // Top-right sound / music toggles
      AUDIO_BUTTONS: {
        Y: 60,
        SIZE: 48,
        SOUND_X: REFERENCE_WIDTH - 110,
        MUSIC_X: REFERENCE_WIDTH - 50
      }
    },

    ORDERS: {
      // Left and right ticket slot X, indexed by slot
      SLOT_X: [280, 440] as const,
      TICKET_Y: sy(135),
      // Where a fulfilled drink flies to on checkout
      CHECKOUT_Y: sy(145),
      // A drink only counts for an order once it has travelled above this
      // line onto the table
      ON_TABLE_MAX_Y: sy(800)
    },

    MODALS: {
      CENTER_X: REFERENCE_WIDTH / 2,
      CENTER_Y: canvasHeight / 2,
      PAUSE: {
        CARD: { WIDTH: 480, HEIGHT: 500, RADIUS: 24 },
        TITLE_Y: -200,
        HELP_BOX: { X: -200, Y: -150, WIDTH: 400, HEIGHT: 110, RADIUS: 12 },
        TOGGLE_Y: -10,
        SOUND_TOGGLE_X: -100,
        MUSIC_TOGGLE_X: 100,
        RESUME_BUTTON: { Y: 75, WIDTH: 240, HEIGHT: 60 },
        RESTART_Y: 145,
        MENU_Y: 195
      },
      GAME_OVER: {
        CARD: { WIDTH: 480, HEIGHT: 440, RADIUS: 24 },
        TITLE_Y: -165,
        PLAY_AGAIN_BUTTON: { Y: 95, WIDTH: 260, HEIGHT: 68 },
        MENU_Y: 170
      }
    }
  } as const;
}

export type Layout = ReturnType<typeof getLayout>;

export const LAYOUT: Layout = getLayout(CANVAS_HEIGHT);
