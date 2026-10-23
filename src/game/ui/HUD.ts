import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { GAME_CONFIG } from '../config/gameConfig';
import { UIButton } from './components/UIButton';
import { UIToggle, SOUND_SETTING, MUSIC_SETTING } from './components/UIToggle';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private soundToggle!: UIToggle;
  private musicToggle!: UIToggle;
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
    const iconSize = { width: 42, height: 42 };

    this.soundToggle = new UIToggle(this.scene, 560, 48, {
      variant: 'icon',
      ...iconSize,
      setting: SOUND_SETTING,
      onText: '🔊',
      offText: '🔇',
      label: 'Sound effects'
    });

    this.musicToggle = new UIToggle(this.scene, 614, 48, {
      variant: 'icon',
      ...iconSize,
      setting: MUSIC_SETTING,
      onText: '🎵',
      offText: '🚫',
      label: 'Music'
    });

    const pauseBtn = new UIButton(this.scene, 668, 48, {
      variant: 'icon',
      ...iconSize,
      text: '⏸',
      label: 'Pause'
    });
    pauseBtn.on(UIButton.EVENTS.ACTIVATE, () => this.onPauseClicked());

    this.container.add([this.soundToggle, this.musicToggle, pauseBtn]);
  }

  private createBottomScoreCards(): void {
    // 1190 was tuned against the original 1280-tall reference canvas;
    // rescale so the cards stay anchored near the bottom edge on devices
    // where GAME_CONFIG.HEIGHT has been stretched taller (see gameConfig.ts).
    const bottomY = Math.round((1190 / 1280) * GAME_CONFIG.HEIGHT);

    // 1. Current Score Card (Bottom Left)
    const scoreBg = this.scene.add.sprite(220, bottomY, 'ui_card_bg');
    scoreBg.setDisplaySize(200, 72);

    const scoreLabel = this.scene.add
      .text(220, bottomY - 18, 'SCORE', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd166'
      })
      .setOrigin(0.5);

    this.scoreText = this.scene.add
      .text(220, bottomY + 12, '0', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    // 2. Best Score Card (Bottom Right)
    const bestBg = this.scene.add.sprite(500, bottomY, 'ui_card_bg');
    bestBg.setDisplaySize(200, 72);

    const bestLabel = this.scene.add
      .text(500, bottomY - 18, 'BEST', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ff9e00'
      })
      .setOrigin(0.5);

    this.bestScoreText = this.scene.add
      .text(500, bottomY + 12, `${SaveManager.getInstance().getBestScore()}`, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.container.add([
      scoreBg,
      scoreLabel,
      this.scoreText,
      bestBg,
      bestLabel,
      this.bestScoreText
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
}
