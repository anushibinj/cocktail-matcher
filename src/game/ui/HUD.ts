import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { LAYOUT } from '../config/gameConfig';
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
    const { Y, SIZE, SOUND_X, MUSIC_X, PAUSE_X } = LAYOUT.HUD.BUTTONS;

    this.soundToggle = new UIToggle(this.scene, SOUND_X, Y, {
      variant: 'icon',
      width: SIZE,
      height: SIZE,
      setting: SOUND_SETTING,
      onText: '🔊',
      offText: '🔇',
      label: 'Sound effects'
    });

    this.musicToggle = new UIToggle(this.scene, MUSIC_X, Y, {
      variant: 'icon',
      width: SIZE,
      height: SIZE,
      setting: MUSIC_SETTING,
      onText: '🎵',
      offText: '🚫',
      label: 'Music'
    });

    const pauseBtn = new UIButton(this.scene, PAUSE_X, Y, {
      variant: 'icon',
      width: SIZE,
      height: SIZE,
      text: '⏸',
      label: 'Pause'
    });
    pauseBtn.on(UIButton.EVENTS.ACTIVATE, () => this.onPauseClicked());

    this.container.add([this.soundToggle, this.musicToggle, pauseBtn]);
  }

  private createBottomScoreCards(): void {
    // Y is scaled from the reference canvas so the cards stay anchored near
    // the bottom edge on stretched-tall devices (see gameConfig.ts).
    const {
      Y: bottomY,
      WIDTH,
      HEIGHT,
      SCORE_X,
      BEST_X,
      LABEL_OFFSET_Y,
      VALUE_OFFSET_Y
    } = LAYOUT.HUD.SCORE_CARDS;

    // 1. Current Score Card (Bottom Left)
    const scoreBg = this.scene.add.sprite(SCORE_X, bottomY, 'ui_card_bg');
    scoreBg.setDisplaySize(WIDTH, HEIGHT);

    const scoreLabel = this.scene.add
      .text(SCORE_X, bottomY + LABEL_OFFSET_Y, 'SCORE', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd166'
      })
      .setOrigin(0.5);

    this.scoreText = this.scene.add
      .text(SCORE_X, bottomY + VALUE_OFFSET_Y, '0', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    // 2. Best Score Card (Bottom Right)
    const bestBg = this.scene.add.sprite(BEST_X, bottomY, 'ui_card_bg');
    bestBg.setDisplaySize(WIDTH, HEIGHT);

    const bestLabel = this.scene.add
      .text(BEST_X, bottomY + LABEL_OFFSET_Y, 'BEST', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ff9e00'
      })
      .setOrigin(0.5);

    this.bestScoreText = this.scene.add
      .text(BEST_X, bottomY + VALUE_OFFSET_Y, `${SaveManager.getInstance().getBestScore()}`, {
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
