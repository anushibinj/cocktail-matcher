import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';
import { AudioManager } from './AudioManager';

export class ScoreManager {
  private scene: Phaser.Scene;
  private currentScore: number = 0;
  private bestScore: number = 0;
  private onScoreChanged?: (score: number, bestScore: number, isNewBest: boolean) => void;

  constructor(
    scene: Phaser.Scene,
    onScoreChanged?: (score: number, bestScore: number, isNewBest: boolean) => void
  ) {
    this.scene = scene;
    this.onScoreChanged = onScoreChanged;
    this.bestScore = SaveManager.getInstance().getBestScore();
  }

  public init(): void {
    this.currentScore = 0;
    this.bestScore = SaveManager.getInstance().getBestScore();
    if (this.onScoreChanged) {
      this.onScoreChanged(this.currentScore, this.bestScore, false);
    }
  }

  public addScore(points: number, x?: number, y?: number): void {
    this.currentScore += points;
    const isNewBest = SaveManager.getInstance().setBestScore(this.currentScore);
    if (isNewBest) {
      this.bestScore = this.currentScore;
    }

    if (this.onScoreChanged) {
      this.onScoreChanged(this.currentScore, this.bestScore, isNewBest);
    }

    if (x !== undefined && y !== undefined) {
      this.showFloatingScore(points, x, y);
      AudioManager.getInstance().playScorePopup();
    }
  }

  private showFloatingScore(points: number, x: number, y: number): void {
    const text = this.scene.add.text(x, y - 10, `+${points}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: points >= 1000 ? '36px' : '28px',
      fontStyle: 'bold',
      color: points >= 1000 ? '#ffd700' : '#ffffff',
      stroke: '#1b1b2f',
      strokeThickness: 5,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: 'rgba(0,0,0,0.6)',
        blur: 4,
        fill: true
      }
    });
    text.setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 75,
      scaleX: { from: 0.6, to: 1.2 },
      scaleY: { from: 0.6, to: 1.2 },
      alpha: { from: 1, to: 0 },
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  public getScore(): number {
    return this.currentScore;
  }

  public getBestScore(): number {
    return this.bestScore;
  }

  public reset(): void {
    this.init();
  }
}
