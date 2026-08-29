import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export class MenuScene extends Phaser.Scene {
  private audioManager?: AudioManager;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.audioManager = new AudioManager(this);
    this.audioManager.startMusic();

    this.createBackground();
    this.createTitle();
    this.createButtons();
  }

  shutdown(): void {
    this.audioManager?.stopMusic();
  }

  private createBackground(): void {
    const sky = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.22, GAME_WIDTH, GAME_HEIGHT * 0.45, 0x87ceeb);
    const ocean = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, GAME_WIDTH, GAME_HEIGHT * 0.5, 0x1e90ff);
    const sand = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 50, GAME_WIDTH, 100, 0xf4d03f);
    sky.setDepth(-3);
    ocean.setDepth(-2);
    sand.setDepth(-1);

    this.add.text(GAME_WIDTH / 2, 90, '🌴', { fontSize: '48px' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 120, '🌴', { fontSize: '36px' }).setOrigin(0.5);
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 200, 'Cocktail\nMerge', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        stroke: '#0d3d52',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const save = SaveManager.load();
    this.add
      .text(GAME_WIDTH / 2, 310, `Best Score: ${save.bestScore.toLocaleString()}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#fff8dc',
      })
      .setOrigin(0.5);
  }

  private createButtons(): void {
    this.createButton(GAME_WIDTH / 2, 420, 'Play', () => {
      this.audioManager?.playSfx('click');
      this.scene.start('GameScene');
    });

    this.createButton(GAME_WIDTH / 2, 500, 'Settings', () => {
      this.audioManager?.playSfx('click');
      this.showSettings();
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const bg = this.add.image(0, 0, 'btn-primary');
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setTint(0xffaaaa));
    bg.on('pointerout', () => bg.clearTint());
    bg.on('pointerdown', onClick);

    button.add([bg, text]);
    return button;
  }

  private showSettings(): void {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'panel');

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'Settings', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const soundLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const musicLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const updateLabels = () => {
      soundLabel.setText(`Sound: ${this.audioManager?.isSoundEnabled() ? 'On' : 'Off'}`);
      musicLabel.setText(`Music: ${this.audioManager?.isMusicEnabled() ? 'On' : 'Off'}`);
    };
    updateLabels();

    const soundBtn = this.createButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'Toggle Sound', () => {
      this.audioManager?.toggleSound();
      updateLabels();
      this.audioManager?.playSfx('click');
    });

    const musicBtn = this.createButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, 'Toggle Music', () => {
      this.audioManager?.toggleMusic();
      updateLabels();
      this.audioManager?.playSfx('click');
    });

    const closeBtn = this.createButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, 'Close', () => {
      this.audioManager?.playSfx('click');
      overlay.destroy();
      panel.destroy();
      title.destroy();
      soundLabel.destroy();
      musicLabel.destroy();
      soundBtn.destroy();
      musicBtn.destroy();
      closeBtn.destroy();
    });

    overlay.setDepth(100);
    panel.setDepth(101);
    title.setDepth(102);
    soundLabel.setDepth(102);
    musicLabel.setDepth(102);
    soundBtn.setDepth(103);
    musicBtn.setDepth(103);
    closeBtn.setDepth(103);
  }
}
