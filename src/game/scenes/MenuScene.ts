import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { SaveManager } from '../../storage/SaveManager';
import { AudioManager } from '../systems/AudioManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  public create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Background
    this.add.image(WIDTH / 2, HEIGHT / 2, 'bg_tropical');

    // Title Logo Group
    const titleContainer = this.add.container(WIDTH / 2, HEIGHT * 0.28);

    // Glowing main cocktail illustration (Tier 5 Tropical Punch)
    const logoDrink = this.add.sprite(0, -60, 'drink_5');
    logoDrink.setDisplaySize(140, 140);

    // Idle floating bob animation
    this.tweens.add({
      targets: logoDrink,
      y: -75,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Title Text
    const title = this.add.text(0, 50, 'COCKTAIL MERGE', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#ffd166',
      stroke: '#3b185f',
      strokeThickness: 8,
      shadow: {
        offsetX: 0,
        offsetY: 6,
        color: 'rgba(0,0,0,0.5)',
        blur: 10,
        fill: true
      }
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, 100, 'Tropical Drop & Match', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    titleContainer.add([logoDrink, title, subtitle]);

    // Best Score Card
    const bestScore = SaveManager.getInstance().getBestScore();
    const bestCard = this.add.container(WIDTH / 2, HEIGHT * 0.54);

    const bestBg = this.add.sprite(0, 0, 'ui_card_bg').setDisplaySize(240, 76);
    const bestLabel = this.add.text(0, -18, 'BEST SCORE', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffbe0b'
    }).setOrigin(0.5);

    const bestVal = this.add.text(0, 14, `${bestScore}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    bestCard.add([bestBg, bestLabel, bestVal]);

    // Play Button
    const playBtn = this.add.sprite(WIDTH / 2, HEIGHT * 0.68, 'ui_btn_primary').setDisplaySize(280, 78);
    playBtn.setInteractive({ useHandCursor: true });

    const playText = this.add.text(WIDTH / 2, HEIGHT * 0.68, 'PLAY NOW', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: 'rgba(0,0,0,0.4)',
        blur: 4,
        fill: true
      }
    }).setOrigin(0.5);

    // Pulse animation for Play button
    this.tweens.add({
      targets: [playBtn, playText],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    playBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      AudioManager.getInstance().playRestart();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.start('GameScene');
      });
    });

    // How to play quick tip
    this.add.text(WIDTH / 2, HEIGHT * 0.82, 'Drop cocktails • Match pairs • Don\'t overflow!', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '16px',
      color: '#cfcbe8',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Top Audio toggles
    this.createAudioControls();
  }

  private createAudioControls(): void {
    const { WIDTH } = GAME_CONFIG;

    // Sound toggle
    const soundBtn = this.add.sprite(WIDTH - 110, 60, 'ui_btn_circle').setDisplaySize(48, 48);
    soundBtn.setInteractive({ useHandCursor: true });
    const soundText = this.add.text(WIDTH - 110, 60, SaveManager.getInstance().getSoundEnabled() ? '🔊' : '🔇', {
      fontSize: '22px'
    }).setOrigin(0.5);

    soundBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getSoundEnabled();
      AudioManager.getInstance().setSoundEnabled(!current);
      soundText.setText(!current ? '🔊' : '🔇');
    });

    // Music toggle
    const musicBtn = this.add.sprite(WIDTH - 50, 60, 'ui_btn_circle').setDisplaySize(48, 48);
    musicBtn.setInteractive({ useHandCursor: true });
    const musicText = this.add.text(WIDTH - 50, 60, SaveManager.getInstance().getMusicEnabled() ? '🎵' : '🚫', {
      fontSize: '22px'
    }).setOrigin(0.5);

    musicBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getMusicEnabled();
      AudioManager.getInstance().setMusicEnabled(!current);
      musicText.setText(!current ? '🎵' : '🚫');
    });
  }
}
