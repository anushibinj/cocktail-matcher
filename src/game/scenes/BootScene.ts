import Phaser from 'phaser';
import { AssetGenerator } from '../../utils/AssetGenerator';
import { SaveManager } from '../../storage/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { GAME_CONFIG } from '../config/gameConfig';
import { DRINKS } from '../config/drinks';

const CUSTOM_DRINK_ART = import.meta.glob<string>('../../assets/drinks/drink_*.png', {
  eager: true,
  query: '?url',
  import: 'default'
});

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

    const drawProgress = (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xff006e, 1);
      progressBar.fillRoundedRect(WIDTH / 2 - 156, HEIGHT / 2 - 16, 312 * Math.min(1, value), 32, 16);
    };
    drawProgress(0);
    this.load.on('progress', drawProgress);

    // Optional custom artwork per tier — see src/assets/drinks/README.md.
    // The glob is resolved at build time, so only override files that
    // actually exist are requested; generateAll() below fills in a
    // procedural glass for every other tier.
    Object.entries(CUSTOM_DRINK_ART).forEach(([path, url]) => {
      const level = Number(/drink_(\d+)\.png$/.exec(path)?.[1]);
      if (DRINKS.some((drink) => drink.level === level)) {
        this.load.image(`drink_${level}_custom`, url);
      }
    });

    this.load.once('complete', () => {
      const proceduralLevels = new Set<number>();
      DRINKS.forEach((drink) => {
        const customKey = `drink_${drink.level}_custom`;
        if (this.textures.exists(customKey)) {
          this.textures.renameTexture(customKey, `drink_${drink.level}`);
        } else {
          proceduralLevels.add(drink.level);
        }
      });

      // Generate procedural fallback glasses (only for tiers with no custom
      // art) plus all particle/background/board/UI textures, then init
      // systems and hand off to the menu.
      AssetGenerator.generateAll(this, proceduralLevels);
      SaveManager.getInstance();
      AudioManager.getInstance().init();

      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      this.scene.start('MenuScene');
    });
  }
}
