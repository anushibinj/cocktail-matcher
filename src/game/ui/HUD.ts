import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../../storage/SaveManager';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private soundBtnText!: Phaser.GameObjects.Text;
  private musicBtnText!: Phaser.GameObjects.Text;
  private onPauseClicked: () => void;

  constructor(scene: Phaser.Scene, onPauseClicked: () => void) {
    this.scene = scene;
    this.onPauseClicked = onPauseClicked;
    this.container = this.scene.add.container(0, 0);

    this.createTopButtons();
    this.createBottomScoreCards();
  }

  private createTopButtons(): void {
    // Top right utility buttons
    const sfxBtn = this.scene.add.sprite(560, 48, 'ui_btn_circle').setDisplaySize(42, 42);
    sfxBtn.setInteractive({ useHandCursor: true });
    this.soundBtnText = this.scene.add.text(560, 48, SaveManager.getInstance().getSoundEnabled() ? '🔊' : '🔇', {
      fontSize: '20px'
    }).setOrigin(0.5);

    sfxBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getSoundEnabled();
      AudioManager.getInstance().setSoundEnabled(!current);
      this.soundBtnText.setText(!current ? '🔊' : '🔇');
    });

    const musicBtn = this.scene.add.sprite(614, 48, 'ui_btn_circle').setDisplaySize(42, 42);
    musicBtn.setInteractive({ useHandCursor: true });
    this.musicBtnText = this.scene.add.text(614, 48, SaveManager.getInstance().getMusicEnabled() ? '🎵' : '🚫', {
      fontSize: '20px'
    }).setOrigin(0.5);

    musicBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getMusicEnabled();
      AudioManager.getInstance().setMusicEnabled(!current);
      this.musicBtnText.setText(!current ? '🎵' : '🚫');
    });

    const pauseBtn = this.scene.add.sprite(668, 48, 'ui_btn_circle').setDisplaySize(42, 42);
    pauseBtn.setInteractive({ useHandCursor: true });
    const pauseIcon = this.scene.add.text(668, 48, '⏸', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    pauseBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      this.onPauseClicked();
    });

    this.container.add([sfxBtn, this.soundBtnText, musicBtn, this.musicBtnText, pauseBtn, pauseIcon]);
  }

  private createBottomScoreCards(): void {
    const bottomY = 1190;

    // 1. Current Score Card (Bottom Left)
    const scoreBg = this.scene.add.sprite(220, bottomY, 'ui_card_bg');
    scoreBg.setDisplaySize(200, 72);

    const scoreLabel = this.scene.add.text(220, bottomY - 18, 'SCORE', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd166'
    }).setOrigin(0.5);

    this.scoreText = this.scene.add.text(220, bottomY + 12, '0', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 2. Best Score Card (Bottom Right)
    const bestBg = this.scene.add.sprite(500, bottomY, 'ui_card_bg');
    bestBg.setDisplaySize(200, 72);

    const bestLabel = this.scene.add.text(500, bottomY - 18, 'BEST', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ff9e00'
    }).setOrigin(0.5);

    this.bestScoreText = this.scene.add.text(500, bottomY + 12, `${SaveManager.getInstance().getBestScore()}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.container.add([
      scoreBg, scoreLabel, this.scoreText,
      bestBg, bestLabel, this.bestScoreText
    ]);
  }

  public updateScore(score: number, bestScore: number): void {
    this.scoreText.setText(`${score}`);
    this.bestScoreText.setText(`${bestScore}`);

    // Pulse animation on score change
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: { from: 1.25, to: 1 },
      scaleY: { from: 1.25, to: 1 },
      duration: 140,
      ease: 'Quad.easeOut'
    });
  }

  public updateAudioIcons(): void {
    this.soundBtnText.setText(SaveManager.getInstance().getSoundEnabled() ? '🔊' : '🔇');
    this.musicBtnText.setText(SaveManager.getInstance().getMusicEnabled() ? '🎵' : '🚫');
  }
}
