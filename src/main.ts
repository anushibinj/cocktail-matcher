import Phaser from 'phaser';
import { GAME_CONFIG } from './game/config/gameConfig';
import { BootScene } from './game/scenes/BootScene';
import { MenuScene } from './game/scenes/MenuScene';
import { GameScene } from './game/scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: '#1d1135',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: {
        x: 0,
        y: GAME_CONFIG.PHYSICS.GRAVITY_Y
      },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene]
};

export const game = new Phaser.Game(config);

// Opt-in debug/test hook (window.__COCKTAIL__). Dynamically imported so
// production without `?debug` never downloads it.
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  void import('./debug').then(({ installDebugHook }) => installDebugHook(game));
}
