import Phaser from 'phaser';
import { GAME_CONFIG, LAYOUT } from '../config/gameConfig';
import { AudioManager } from '../systems/AudioManager';
import { UIButton } from './components/UIButton';

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
    const { CENTER_X, CENTER_Y } = LAYOUT.MODALS;
    const { CARD, TITLE_Y, PLAY_AGAIN_BUTTON, MENU_Y } = LAYOUT.MODALS.GAME_OVER;

    // 1. Dark Backdrop
    const backdrop = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0c081e, 0.82);
    backdrop.setInteractive(); // Blocks input behind

    // 2. Modal Card Container (for scale animation)
    const cardGroup = this.scene.add.container(CENTER_X, CENTER_Y);

    // Modal Card Background
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x191432, 0.95);
    cardBg.fillRoundedRect(-CARD.WIDTH / 2, -CARD.HEIGHT / 2, CARD.WIDTH, CARD.HEIGHT, CARD.RADIUS);
    cardBg.lineStyle(3, 0xff006e, 0.8);
    cardBg.strokeRoundedRect(
      -CARD.WIDTH / 2,
      -CARD.HEIGHT / 2,
      CARD.WIDTH,
      CARD.HEIGHT,
      CARD.RADIUS
    );

    // Header Title
    const titleText = this.scene.add
      .text(0, TITLE_Y, 'GAME OVER', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ff4d6d',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    // New Best Badge (added to cardGroup after cardBg so it renders on top)
    let newBestBadge: Phaser.GameObjects.Text | undefined;
    if (isNewBest) {
      newBestBadge = this.scene.add
        .text(0, -115, '🏆 NEW BEST SCORE! 🏆', {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffd166',
          stroke: '#000000',
          strokeThickness: 3
        })
        .setOrigin(0.5);

      this.scene.tweens.add({
        targets: newBestBadge,
        scaleX: { from: 0.9, to: 1.1 },
        scaleY: { from: 0.9, to: 1.1 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }

    // Score Label & Value
    const scoreLabel = this.scene.add
      .text(0, isNewBest ? -75 : -100, 'YOUR SCORE', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#8ecae6'
      })
      .setOrigin(0.5);

    const scoreValue = this.scene.add
      .text(0, isNewBest ? -35 : -55, `${score}`, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    // Best Score
    const bestValue = this.scene.add
      .text(0, isNewBest ? 15 : 5, `Best Score: ${bestScore}`, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffd166'
      })
      .setOrigin(0.5);

    // Play Again Button
    const playAgainBtn = new UIButton(this.scene, 0, PLAY_AGAIN_BUTTON.Y, {
      variant: 'primary',
      width: PLAY_AGAIN_BUTTON.WIDTH,
      height: PLAY_AGAIN_BUTTON.HEIGHT,
      text: 'PLAY AGAIN',
      label: 'Play again',
      textStyle: { fontSize: '22px' }
    });
    playAgainBtn.on(UIButton.EVENTS.ACTIVATE, () => {
      AudioManager.getInstance().playRestart();
      this.hide();
      this.onRestart();
    });

    // Main Menu Button
    const menuBtn = new UIButton(this.scene, 0, MENU_Y, {
      variant: 'secondary',
      text: 'Main Menu',
      textStyle: { fontSize: '18px' }
    });
    menuBtn.on(UIButton.EVENTS.ACTIVATE, () => {
      this.hide();
      this.onMenu();
    });

    cardGroup.add([cardBg, titleText, scoreLabel, scoreValue, bestValue, playAgainBtn, menuBtn]);
    if (newBestBadge) {
      cardGroup.add(newBestBadge);
    }
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
