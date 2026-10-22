/// <reference types="vite/client" />
import Phaser from 'phaser';
import { GameScene } from './game/scenes/GameScene';
import { setGameSeed } from './game/systems/spawnPicker';
import type { Drink } from './game/entities/Drink';

// Opt-in debug/test hook. Loaded by main.ts only in dev or with `?debug` in
// the URL; production builds without the flag never fetch this module.

/** Key that toggles the Matter body overlay (KeyboardEvent.code). */
const MATTER_DEBUG_KEY = 'Backquote';

export interface CocktailDebugApi {
  game: Phaser.Game;
  /** The running GameScene, or null when on the menu/boot screen. */
  getScene(): GameScene | null;
  /** Score, drinks on the board, the spawner's current/next levels and order ticket levels. */
  getState(): ReturnType<GameScene['debugGetState']> & { spawnQueue: number[]; orderLevels: number[] };
  spawnDrink(level: number, x: number, y: number): Drink;
  setScore(score: number): void;
  forceGameOver(): void;
  /** Seeds spawner/order RNG (null restores Math.random) and restarts a running game so it starts from the seed. */
  setSeed(seed: number | null): void;
  /** Toggles the Matter debug overlay; returns the new state. */
  toggleMatterDebug(): boolean;
}

declare global {
  interface Window {
    __COCKTAIL__?: CocktailDebugApi;
  }
}

function restyleWorld(this: Phaser.Physics.Matter.World): void {
  this.setCompositeRenderStyle(this.localWorld as unknown as MatterJS.CompositeType);
}

export function installDebugHook(game: Phaser.Game): void {
  const getScene = (): GameScene | null => {
    const scene = game.scene.getScene('GameScene') as GameScene | null;
    return scene && scene.scene.isActive() ? scene : null;
  };

  const requireScene = (): GameScene => {
    const scene = getScene();
    if (!scene) {
      throw new Error('__COCKTAIL__: GameScene is not running (press Play first)');
    }
    return scene;
  };

  const toggleMatterDebug = (): boolean => {
    const scene = requireScene();
    const world = scene.matter.world;
    // Bodies only get a debug render style when created with debug on, so
    // restyle every frame while the overlay is shown (covers new drinks).
    scene.events.off(Phaser.Scenes.Events.UPDATE, restyleWorld);
    if (!world.debugGraphic) {
      world.createDebugGraphic();
    } else {
      world.drawDebug = !world.drawDebug;
    }
    if (world.drawDebug) {
      scene.events.on(Phaser.Scenes.Events.UPDATE, restyleWorld, world);
    } else {
      world.debugGraphic.clear();
    }
    return world.drawDebug;
  };

  window.__COCKTAIL__ = {
    game,
    getScene,
    getState: () => {
      const scene = requireScene();
      // Read-only peeks at private system state; tsc flags these if renamed.
      const spawner = scene['spawner'];
      return {
        ...scene.debugGetState(),
        spawnQueue: [spawner['currentLevel'], spawner['nextLevel']],
        orderLevels: scene['orderManager']['activeOrders'].map(o => o.targetLevel)
      };
    },
    spawnDrink: (level, x, y) => requireScene().debugSpawnDrink(level, x, y),
    setScore: score => requireScene().debugSetScore(score),
    forceGameOver: () => requireScene().debugForceGameOver(),
    setSeed: seed => {
      setGameSeed(seed);
      getScene()?.scene.restart();
    },
    toggleMatterDebug
  };

  window.addEventListener('keydown', event => {
    if (event.code === MATTER_DEBUG_KEY && getScene()) {
      toggleMatterDebug();
    }
  });

  console.info(`[debug] window.__COCKTAIL__ ready; press \` to toggle the Matter overlay`);
}
