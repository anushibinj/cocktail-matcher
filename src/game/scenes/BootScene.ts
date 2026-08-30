import Phaser from 'phaser';
import { AssetGenerator } from '../../utils/AssetGenerator';
import { SaveManager } from '../../storage/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { GAME_CONFIG } from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Loading Bar Graphics
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a153a, 0.8);
    progressBox.fillRoundedRect(WIDTH / 2 - 160, HEIGHT / 2 - 20, 320, 40, 20);

    const progressBar = this.add.graphics();

    const loadingText = this.add.text(WIDTH / 2, HEIGHT / 2 - 50, 'Mixing Cocktails...', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd166'
    }).setOrigin(0.5);

    // Generate all procedural game assets & textures
    AssetGenerator.generateAll(this);

    // Initialize systems
    SaveManager.getInstance();
    AudioManager.getInstance().init();

    // Simulate short smooth loading animation for polished feel
    let progress = 0;
    const interval = window.setInterval(() => {
      progress += 0.2;
      progressBar.clear();
      progressBar.fillStyle(0xff006e, 1);
      progressBar.fillRoundedRect(WIDTH / 2 - 156, HEIGHT / 2 - 16, 312 * Math.min(1, progress), 32, 16);

      if (progress >= 1.0) {
        clearInterval(interval);
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
        this.scene.start('MenuScene');
      }
    }, 40);
  }
}
