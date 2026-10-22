import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../../storage/SaveManager';
import { LAYOUT } from '../config/gameConfig';

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
    const { Y, SIZE, SOUND_X, MUSIC_X, PAUSE_X } = LAYOUT.HUD.BUTTONS;
    const sfxBtn = this.scene.add.sprite(SOUND_X, Y, 'ui_btn_circle').setDisplaySize(SIZE, SIZE);
    sfxBtn.setInteractive({ useHandCursor: true });
    this.soundBtnText = this.scene.add.text(SOUND_X, Y, SaveManager.getInstance().getSoundEnabled() ? '🔊' : '🔇', {
      fontSize: '20px'
    }).setOrigin(0.5);

    sfxBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getSoundEnabled();
      AudioManager.getInstance().setSoundEnabled(!current);
      this.soundBtnText.setText(!current ? '🔊' : '🔇');
    });

    const musicBtn = this.scene.add.sprite(MUSIC_X, Y, 'ui_btn_circle').setDisplaySize(SIZE, SIZE);
    musicBtn.setInteractive({ useHandCursor: true });
    this.musicBtnText = this.scene.add.text(MUSIC_X, Y, SaveManager.getInstance().getMusicEnabled() ? '🎵' : '🚫', {
      fontSize: '20px'
    }).setOrigin(0.5);

    musicBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getMusicEnabled();
      AudioManager.getInstance().setMusicEnabled(!current);
      this.musicBtnText.setText(!current ? '🎵' : '🚫');
    });

    const pauseBtn = this.scene.add.sprite(PAUSE_X, Y, 'ui_btn_circle').setDisplaySize(SIZE, SIZE);
    pauseBtn.setInteractive({ useHandCursor: true });
    const pauseIcon = this.scene.add.text(PAUSE_X, Y, '⏸', {
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
    // Y is scaled from the reference canvas so the cards stay anchored near
    // the bottom edge on stretched-tall devices (see gameConfig.ts).
    const { Y: bottomY, WIDTH, HEIGHT, SCORE_X, BEST_X, LABEL_OFFSET_Y, VALUE_OFFSET_Y } = LAYOUT.HUD.SCORE_CARDS;

    // 1. Current Score Card (Bottom Left)
    const scoreBg = this.scene.add.sprite(SCORE_X, bottomY, 'ui_card_bg');
    scoreBg.setDisplaySize(WIDTH, HEIGHT);

    const scoreLabel = this.scene.add.text(SCORE_X, bottomY + LABEL_OFFSET_Y, 'SCORE', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd166'
    }).setOrigin(0.5);

    this.scoreText = this.scene.add.text(SCORE_X, bottomY + VALUE_OFFSET_Y, '0', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 2. Best Score Card (Bottom Right)
    const bestBg = this.scene.add.sprite(BEST_X, bottomY, 'ui_card_bg');
    bestBg.setDisplaySize(WIDTH, HEIGHT);

    const bestLabel = this.scene.add.text(BEST_X, bottomY + LABEL_OFFSET_Y, 'BEST', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ff9e00'
    }).setOrigin(0.5);

    this.bestScoreText = this.scene.add.text(BEST_X, bottomY + VALUE_OFFSET_Y, `${SaveManager.getInstance().getBestScore()}`, {
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
