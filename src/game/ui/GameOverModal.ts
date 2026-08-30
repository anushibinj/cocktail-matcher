import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { AudioManager } from '../systems/AudioManager';

export class GameOverModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onRestart: () => void;
  private onMenu: () => void;

  constructor(scene: Phaser.Scene, onRestart: () => void, onMenu: () => void) {
    this.scene = scene;
    this.onRestart = onRestart;
    this.onMenu = onMenu;
    this.container = this.scene.add.container(0, 0);
    this.container.setVisible(false);
    this.container.setDepth(100);
  }

  public show(score: number, bestScore: number, isNewBest: boolean): void {
    this.container.removeAll(true);
    this.container.setVisible(true);

    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // 1. Dark Backdrop
    const backdrop = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0c081e, 0.82);
    backdrop.setInteractive(); // Blocks input behind

    // 2. Modal Card Container (for scale animation)
    const cardGroup = this.scene.add.container(WIDTH / 2, HEIGHT / 2);

    // Modal Card Background
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x191432, 0.95);
    cardBg.fillRoundedRect(-240, -220, 480, 440, 24);
    cardBg.lineStyle(3, 0xff006e, 0.8);
    cardBg.strokeRoundedRect(-240, -220, 480, 440, 24);

    // Header Title
    const titleText = this.scene.add.text(0, -165, 'GAME OVER', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ff4d6d',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // New Best Badge
    if (isNewBest) {
      const newBestBadge = this.scene.add.text(0, -115, '🏆 NEW BEST SCORE! 🏆', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd166',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);

      this.scene.tweens.add({
        targets: newBestBadge,
        scaleX: { from: 0.9, to: 1.1 },
        scaleY: { from: 0.9, to: 1.1 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
      cardGroup.add(newBestBadge);
    }

    // Score Label & Value
    const scoreLabel = this.scene.add.text(0, isNewBest ? -75 : -100, 'YOUR SCORE', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#8ecae6'
    }).setOrigin(0.5);

    const scoreValue = this.scene.add.text(0, isNewBest ? -35 : -55, `${score}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Best Score
    const bestValue = this.scene.add.text(0, isNewBest ? 15 : 5, `Best Score: ${bestScore}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffd166'
    }).setOrigin(0.5);

    // Play Again Button
    const playAgainBtn = this.scene.add.sprite(0, 95, 'ui_btn_primary').setDisplaySize(260, 68);
    playAgainBtn.setInteractive({ useHandCursor: true });

    const playAgainText = this.scene.add.text(0, 95, 'PLAY AGAIN', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    playAgainBtn.on('pointerover', () => playAgainBtn.setScale(1.05));
    playAgainBtn.on('pointerout', () => playAgainBtn.setScale(1.0));
    playAgainBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      AudioManager.getInstance().playRestart();
      this.hide();
      this.onRestart();
    });

    // Main Menu Button
    const menuBtn = this.scene.add.text(0, 170, 'Main Menu', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '18px',
      color: '#a0a0c0'
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#a0a0c0'));
    menuBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      this.hide();
      this.onMenu();
    });

    cardGroup.add([cardBg, titleText, scoreLabel, scoreValue, bestValue, playAgainBtn, playAgainText, menuBtn]);
    this.container.add([backdrop, cardGroup]);

    // Animate Card Pop-in
    cardGroup.setScale(0.7);
    cardGroup.setAlpha(0);
    this.scene.tweens.add({
      targets: cardGroup,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  public hide(): void {
    this.container.setVisible(false);
  }
}
