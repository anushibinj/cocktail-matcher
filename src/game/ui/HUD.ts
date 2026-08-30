import Phaser from 'phaser';
import { DRINKS, getDrinkByLevel } from '../config/drinks';
import { GAME_CONFIG } from '../config/gameConfig';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../../storage/SaveManager';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private nextDrinkPreview!: Phaser.GameObjects.Sprite;
  private soundBtnText!: Phaser.GameObjects.Text;
  private musicBtnText!: Phaser.GameObjects.Text;
  private onPauseClicked: () => void;

  constructor(scene: Phaser.Scene, onPauseClicked: () => void) {
    this.scene = scene;
    this.onPauseClicked = onPauseClicked;
    this.container = this.scene.add.container(0, 0);

    this.createHeader();
    this.createEvolutionBar();
  }

  private createHeader(): void {
    // 1. Score Card (Top Left)
    const scoreBg = this.scene.add.sprite(110, 80, 'ui_card_bg');
    scoreBg.setDisplaySize(160, 80);

    const scoreLabel = this.scene.add.text(110, 58, 'SCORE', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffd166'
    }).setOrigin(0.5);

    this.scoreText = this.scene.add.text(110, 92, '0', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 2. Best Score Card (Top Center-Left)
    const bestBg = this.scene.add.sprite(285, 80, 'ui_card_bg');
    bestBg.setDisplaySize(160, 80);

    const bestLabel = this.scene.add.text(285, 58, 'BEST', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ff9e00'
    }).setOrigin(0.5);

    this.bestScoreText = this.scene.add.text(285, 92, `${SaveManager.getInstance().getBestScore()}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 3. Next Drink Card (Top Center-Right)
    const nextBg = this.scene.add.sprite(450, 80, 'ui_card_bg');
    nextBg.setDisplaySize(130, 80);

    const nextLabel = this.scene.add.text(450, 58, 'NEXT', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#06d6a0'
    }).setOrigin(0.5);

    this.nextDrinkPreview = this.scene.add.sprite(450, 94, 'drink_0');
    this.nextDrinkPreview.setDisplaySize(42, 42);

    // Subtle breathing animation for next drink
    this.scene.tweens.add({
      targets: this.nextDrinkPreview,
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4. Action Buttons (Top Right)
    // Sound Button
    const sfxBtn = this.scene.add.sprite(555, 62, 'ui_btn_circle').setDisplaySize(44, 44);
    sfxBtn.setInteractive({ useHandCursor: true });
    this.soundBtnText = this.scene.add.text(555, 62, SaveManager.getInstance().getSoundEnabled() ? '🔊' : '🔇', {
      fontSize: '20px'
    }).setOrigin(0.5);

    sfxBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getSoundEnabled();
      AudioManager.getInstance().setSoundEnabled(!current);
      this.soundBtnText.setText(!current ? '🔊' : '🔇');
    });

    // Music Button
    const musicBtn = this.scene.add.sprite(610, 62, 'ui_btn_circle').setDisplaySize(44, 44);
    musicBtn.setInteractive({ useHandCursor: true });
    this.musicBtnText = this.scene.add.text(610, 62, SaveManager.getInstance().getMusicEnabled() ? '🎵' : '🚫', {
      fontSize: '20px'
    }).setOrigin(0.5);

    musicBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      const current = SaveManager.getInstance().getMusicEnabled();
      AudioManager.getInstance().setMusicEnabled(!current);
      this.musicBtnText.setText(!current ? '🎵' : '🚫');
    });

    // Pause Button
    const pauseBtn = this.scene.add.sprite(665, 62, 'ui_btn_circle').setDisplaySize(44, 44);
    pauseBtn.setInteractive({ useHandCursor: true });
    const pauseIcon = this.scene.add.text(665, 62, '⏸', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    pauseBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      this.onPauseClicked();
    });

    this.container.add([
      scoreBg, scoreLabel, this.scoreText,
      bestBg, bestLabel, this.bestScoreText,
      nextBg, nextLabel, this.nextDrinkPreview,
      sfxBtn, this.soundBtnText,
      musicBtn, this.musicBtnText,
      pauseBtn, pauseIcon
    ]);
  }

  private createEvolutionBar(): void {
    const evoY = 1205;
    const evoBg = this.scene.add.graphics();
    evoBg.fillStyle(0x0f0c29, 0.7);
    evoBg.fillRoundedRect(30, evoY - 26, GAME_CONFIG.WIDTH - 60, 56, 28);
    evoBg.lineStyle(1.5, 0xffffff, 0.2);
    evoBg.strokeRoundedRect(30, evoY - 26, GAME_CONFIG.WIDTH - 60, 56, 28);
    this.container.add(evoBg);

    // Progression thumbnails
    const totalDrinks = DRINKS.length;
    const startX = 62;
    const spacing = (GAME_CONFIG.WIDTH - 124) / (totalDrinks - 1);

    DRINKS.forEach((drink, index) => {
      const x = startX + index * spacing;
      const thumb = this.scene.add.sprite(x, evoY + 2, `drink_${drink.level}`);
      // Scaled down progression preview
      const thumbSize = Math.min(36, 18 + index * 1.6);
      thumb.setDisplaySize(thumbSize, thumbSize);

      // Level number tag underneath
      const numTag = this.scene.add.text(x, evoY - 14, `${index + 1}`, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffbe0b'
      }).setOrigin(0.5);

      this.container.add([thumb, numTag]);
    });
  }

  public updateScore(score: number, bestScore: number): void {
    this.scoreText.setText(`${score}`);
    this.bestScoreText.setText(`${bestScore}`);

    // Pulse animation on score change
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: { from: 1.3, to: 1 },
      scaleY: { from: 1.3, to: 1 },
      duration: 150,
      ease: 'Quad.easeOut'
    });
  }

  public updateNextDrink(level: number): void {
    const def = getDrinkByLevel(level);
    this.nextDrinkPreview.setTexture(`drink_${def.level}`);
    const size = Math.min(46, def.radius * 1.1 + 10);
    this.nextDrinkPreview.setDisplaySize(size, size);
  }

  public updateAudioIcons(): void {
    this.soundBtnText.setText(SaveManager.getInstance().getSoundEnabled() ? '🔊' : '🔇');
    this.musicBtnText.setText(SaveManager.getInstance().getMusicEnabled() ? '🎵' : '🚫');
  }
}
