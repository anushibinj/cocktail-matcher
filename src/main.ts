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
    autoCenter: Phaser.Scale.CENTER_BOTH,
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
