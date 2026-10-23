import { test as base, expect, type CDPSession, type Page } from '@playwright/test';
import { installE2eHelpers, type ModalSnapshot } from './inPage';
import { REFERENCE_HEIGHT, REFERENCE_WIDTH, getLayout } from '../../src/game/config/gameConfig';
// Type-only: brings in the window.__COCKTAIL__ declaration (erased at runtime)
export type { CocktailDebugApi } from '../../src/debug';

// Shared driver for the e2e suite. Everything that knows about the game's
// layout or internals lives here, so a layout change (ARCH001/ARCH004) or a
// state refactor (ARCH002) only needs this file updated, not every spec.

/**
 * expect.poll with short, flat intervals: the default backoff grows to 1 s,
 * which adds up fast when every step waits on game state.
 */
export function poll<T>(
  fn: () => Promise<T>,
  options: { message?: string; timeout?: number } = {}
) {
  return expect.poll(fn, { intervals: [50, 100, 150, 200], ...options });
}

/** Virtual canvas width; the height depends on the viewport (see gameConfig.ts). */
export const GAME_WIDTH = REFERENCE_WIDTH;

export interface Point {
  x: number;
  y: number;
}

/** Every on-canvas control the suite taps, in game coordinates for a canvas of height `H`. */
export function controls(H: number) {
  const { HUD, MENU, MODALS } = getLayout(H);
  const { PAUSE, GAME_OVER } = MODALS;
  return {
    menuPlay: { x: GAME_WIDTH / 2, y: MENU.PLAY_BUTTON.Y },
    hudSound: { x: HUD.BUTTONS.SOUND_X, y: HUD.BUTTONS.Y },
    hudMusic: { x: HUD.BUTTONS.MUSIC_X, y: HUD.BUTTONS.Y },
    hudPause: { x: HUD.BUTTONS.PAUSE_X, y: HUD.BUTTONS.Y },
    pauseResume: { x: MODALS.CENTER_X, y: MODALS.CENTER_Y + PAUSE.RESUME_BUTTON.Y },
    pauseRestart: { x: MODALS.CENTER_X, y: MODALS.CENTER_Y + PAUSE.RESTART_Y },
    pauseMenu: { x: MODALS.CENTER_X, y: MODALS.CENTER_Y + PAUSE.MENU_Y },
    gameOverPlayAgain: { x: MODALS.CENTER_X, y: MODALS.CENTER_Y + GAME_OVER.PLAY_AGAIN_BUTTON.Y },
    gameOverMenu: { x: MODALS.CENTER_X, y: MODALS.CENTER_Y + GAME_OVER.MENU_Y },
    /** A point on the board below the drinks, where a tap aims and launches. */
    board: (x = 360): Point => ({ x, y: H * 0.7 }),
    /** Horizontal range of board taps that never get clamped by the walls. */
    boardMinX: 150,
    boardMaxX: 570
  };
}

export type Controls = ReturnType<typeof controls>;

export interface SpawnerSnapshot {
  isEnabled: boolean;
  isCoolingDown: boolean;
  armedPointerId: number | null;
  previewVisible: boolean;
  previewScale: number;
  currentLevel: number;
  nextLevel: number;
}

export interface FreezeSnapshot {
  worldEnabled: boolean;
  clockPaused: boolean;
  shaking: boolean;
  isGameActive: boolean;
}

export interface DrinkSnapshot {
  level: number;
  x: number;
  y: number;
}

export const SAVE_KEY = 'cocktail_merge_save_v1';

/**
 * Drives one page of the game with acknowledged input (mouse clicks, or touch
 * taps / CDP touch events on the touch project) and polls game state through
 * the `window.__COCKTAIL__` debug hook.
 */
export class GameDriver {
  readonly touch: boolean;
  H = 0;
  ui: Controls = controls(REFERENCE_HEIGHT);
  private cdpSession: CDPSession | null = null;

  constructor(
    readonly page: Page,
    touch: boolean
  ) {
    this.touch = touch;
  }

  // --- Navigation -------------------------------------------------------

  /** Loads the game with the debug hook and waits for the menu. */
  async open(): Promise<void> {
    await this.page.goto('./?debug=1');
    await this.waitForMenu();
    this.H = await this.page.evaluate(() => Number(window.__COCKTAIL__!.game.config.height));
    this.ui = controls(this.H);
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForMenu();
  }

  async waitForMenu(): Promise<void> {
    await poll(
      () => this.page.evaluate(() => !!window.__COCKTAIL__?.game.scene.isActive('MenuScene')),
      {
        timeout: 20_000
      }
    ).toBe(true);
  }

  async activeScenes(): Promise<string[]> {
    return this.page.evaluate(() =>
      window.__COCKTAIL__!.game.scene.getScenes(true).map((s) => s.scene.key)
    );
  }

  /** Seeds the spawner/order RNG. Call on the menu so it doesn't restart a game. */
  async setSeed(seed: number | null): Promise<void> {
    await this.page.evaluate((s) => window.__COCKTAIL__!.setSeed(s), seed);
  }

  /** Taps PLAY and waits until the first drink can be launched. */
  async startGame(): Promise<void> {
    await this.tap(this.ui.menuPlay);
    await poll(() => this.page.evaluate(() => !!window.__COCKTAIL__!.getScene())).toBe(true);
    await this.waitReadyToLaunch();
  }

  // --- Input ------------------------------------------------------------

  /** Converts game coordinates to CSS pixels in the page. */
  async toCss(p: Point): Promise<Point> {
    const rect = await this.page.evaluate(() => {
      const r = window.__COCKTAIL__!.game.canvas.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
    return {
      x: rect.left + (p.x * rect.width) / GAME_WIDTH,
      y: rect.top + (p.y * rect.height) / this.H
    };
  }

  /** One tap or click at a game point; resolves once the browser has handled it. */
  async tap(p: Point): Promise<void> {
    const css = await this.toCss(p);
    if (this.touch) {
      await this.page.touchscreen.tap(css.x, css.y);
    } else {
      await this.page.mouse.click(css.x, css.y);
    }
  }

  /** Press at `from`, move to `to`, release there. */
  async drag(from: Point, to: Point): Promise<void> {
    const a = await this.toCss(from);
    const b = await this.toCss(to);
    if (this.touch) {
      // Each CDP touch event waits for a rendered frame, so keep moves few
      await this.touchEvent('touchStart', [{ ...a, id: 0 }]);
      await this.touchEvent('touchMove', [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, id: 0 }]);
      await this.touchEvent('touchMove', [{ ...b, id: 0 }]);
      await this.touchEvent('touchEnd', []);
    } else {
      await this.page.mouse.move(a.x, a.y);
      await this.page.mouse.down();
      await this.page.mouse.move(b.x, b.y, { steps: 5 });
      await this.page.mouse.up();
    }
  }

  /** One CDP session per page; a second session's touch events get dropped. */
  async cdp(): Promise<CDPSession> {
    if (!this.cdpSession) {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
    }
    return this.cdpSession;
  }

  /** Raw CDP touch event with CSS-pixel points. */
  async touchEvent(
    type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
    touchPoints: { x: number; y: number; id: number }[]
  ): Promise<void> {
    const cdp = await this.cdp();
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  }

  /** Raw CDP mouse event at a game point, for releases the page never sees. */
  async mouseEvent(type: 'mousePressed' | 'mouseReleased' | 'mouseMoved', p: Point): Promise<void> {
    const css = await this.toCss(p);
    const cdp = await this.cdp();
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      x: css.x,
      y: css.y,
      button: type === 'mouseMoved' ? 'none' : 'left',
      buttons: type === 'mousePressed' ? 1 : 0,
      clickCount: type === 'mouseMoved' ? 0 : 1
    });
  }

  // --- Game state -------------------------------------------------------

  async launches(): Promise<number> {
    return this.page.evaluate(() => window.__COCKTAIL__!.getLaunchCount());
  }

  async score(): Promise<number> {
    return this.page.evaluate(() => window.__COCKTAIL__!.getState().score);
  }

  async state() {
    return this.page.evaluate(() => window.__COCKTAIL__!.getState());
  }

  async drinks(): Promise<DrinkSnapshot[]> {
    return this.page.evaluate(() =>
      window.__COCKTAIL__!.getState().drinks.map((d) => ({ level: d.level, x: d.x, y: d.y }))
    );
  }

  async spawner(): Promise<SpawnerSnapshot> {
    return this.page.evaluate(() => {
      const s = window.__COCKTAIL__!.getScene()!['spawner'];
      return {
        // The spawner has no enable flag since ARCH002; input is live while playing
        isEnabled: s['isPlaying'](),
        isCoolingDown: s['isCoolingDown'],
        armedPointerId: s['armedPointerId'],
        previewVisible: s['previewSprite'].visible,
        previewScale: s['previewSprite'].scaleX,
        currentLevel: s['currentLevel'],
        nextLevel: s['nextLevel']
      };
    });
  }

  async freeze(): Promise<FreezeSnapshot> {
    return this.page.evaluate(() => {
      const scene = window.__COCKTAIL__!.getScene()!;
      return {
        worldEnabled: scene.matter.world.enabled,
        clockPaused: scene.time.paused,
        shaking: scene.cameras.main.shakeEffect.isRunning,
        isGameActive: scene.isPlaying()
      };
    });
  }

  /** Order tickets: target levels plus how many ticket views are on screen. */
  async tickets(): Promise<{ levels: number[]; views: number; checkingOut: boolean }> {
    return this.page.evaluate(() => {
      const orders = window.__COCKTAIL__!.getScene()!['orderManager'];
      return {
        levels: orders['activeOrders'].map((o) => o.targetLevel),
        views: orders['container'].list.length,
        checkingOut: orders['isCheckingOut']
      };
    });
  }

  async hudIcons(): Promise<{ sound: string; music: string }> {
    return this.page.evaluate(() => {
      const hud = window.__COCKTAIL__!.getScene()!['hud'];
      return { sound: hud['soundToggle'].displayText, music: hud['musicToggle'].displayText };
    });
  }

  async save(): Promise<Record<string, unknown> | null> {
    return this.page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, SAVE_KEY);
  }

  /** Scene clock time (ms); advances only while the game loop runs. */
  async gameNow(): Promise<number> {
    return this.page.evaluate(() => window.__COCKTAIL__!.game.loop.time);
  }

  /** Waits until the game loop has rendered `frames` more frames. */
  async waitFrames(frames: number): Promise<void> {
    const start = await this.page.evaluate(() => window.__COCKTAIL__!.game.loop.frame);
    await poll(() => this.page.evaluate(() => window.__COCKTAIL__!.game.loop.frame), {
      timeout: 20_000 + frames * 50
    }).toBeGreaterThanOrEqual(start + frames);
  }

  /** Waits until a tap on the board would launch: enabled, no cooldown, preview fully popped in. */
  async waitReadyToLaunch(): Promise<void> {
    await poll(async () => {
      const s = await this.spawner();
      return s.isEnabled && !s.isCoolingDown && s.previewVisible && s.previewScale > 0.5;
    }).toBe(true);
    // The pop-in tween eases past its target; let it settle
    await poll(() =>
      this.page.evaluate(() => {
        const scene = window.__COCKTAIL__!.getScene()!;
        return scene.tweens
          .getTweens()
          .some((t) => t.targets.includes(scene['spawner']['previewSprite']));
      })
    ).toBe(false);
  }

  /** Taps the board at `x` and waits until exactly one more drink was launched. */
  async launchAt(x: number): Promise<void> {
    const before = await this.launches();
    await this.tap(this.ui.board(x));
    await poll(() => this.launches()).toBe(before + 1);
  }

  /** Slows (or restores, with 1) the scene clock, which drives the drop cooldown. */
  async setClockScale(scale: number): Promise<void> {
    await this.page.evaluate((s) => {
      window.__COCKTAIL__!.getScene()!.time.timeScale = s;
    }, scale);
  }

  // --- Modals -----------------------------------------------------------

  /** The open modal (pause or game over), or null. */
  async modal(): Promise<ModalSnapshot | null> {
    return this.page.evaluate(() => window.__e2e.modal());
  }

  /** Rendering facts about a text in the open modal (e.g. the new-best badge). */
  async modalText(text: string) {
    return this.page.evaluate((t) => window.__e2e.modalText(t), text);
  }

  /** Presses the control at a game point within the current frame (no tap latency). */
  async pressNow(p: Point): Promise<void> {
    expect(await this.page.evaluate(({ x, y }) => window.__e2e.press(x, y), p)).toBe(true);
  }

  async modalTitle(): Promise<string | null> {
    const m = await this.modal();
    if (!m) return null;
    return m.texts.find((t) => t === 'GAME PAUSED' || t === 'GAME OVER') ?? null;
  }

  /** Waits for the modal titled `title` to finish popping in, so its buttons take taps. */
  async waitForModal(title: 'GAME PAUSED' | 'GAME OVER'): Promise<ModalSnapshot> {
    await poll(async () => {
      const m = await this.modal();
      return !!m && m.ready && m.texts.includes(title);
    }).toBe(true);
    return (await this.modal())!;
  }

  async waitForNoModal(): Promise<void> {
    await poll(() => this.modal()).toBeNull();
  }

  /** Taps the HUD pause button and waits for the pause modal to be ready. */
  async pauseViaHud(): Promise<void> {
    await this.tap(this.ui.hudPause);
    await this.waitForModal('GAME PAUSED');
  }

  /** Emulates the tab going to the background (`hidden: true`) or coming back. */
  async setPageHidden(hidden: boolean): Promise<void> {
    await this.page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (h ? 'hidden' : 'visible')
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  }
}

interface Fixtures {
  game: GameDriver;
  /** Console errors, page errors and failed requests seen so far; each test must end with none. */
  pageProblems: string[];
  /** Patterns a test expects among pageProblems (push to it); anything else still fails the test. */
  allowedProblems: RegExp[];
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
  allowedProblems: async ({}, use) => {
    await use([]);
  },
  pageProblems: [
    async ({ page, allowedProblems }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
      });
      page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
      page.on('response', (res) => {
        if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
      });
      page.on('requestfailed', (req) => {
        // Media elements abort their own range requests; that is not a missing file
        if (req.resourceType() !== 'media')
          problems.push(`request failed: ${req.url()} ${req.failure()?.errorText}`);
      });
      await use(problems);
      const unexpected = problems.filter((p) => !allowedProblems.some((re) => re.test(p)));
      expect(unexpected, 'console errors, page errors or failed requests').toEqual([]);
    },
    { auto: true }
  ],
  game: async ({ page, hasTouch }, use) => {
    await page.addInitScript(installE2eHelpers);
    await use(new GameDriver(page, hasTouch));
  }
});

export { expect };
export type { ModalSnapshot };
