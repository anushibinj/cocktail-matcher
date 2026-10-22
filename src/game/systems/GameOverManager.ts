import { Drink } from '../entities/Drink';
import { Board } from '../entities/Board';
import { GAME_CONFIG } from '../config/gameConfig';
import { AudioManager } from './AudioManager';

export class GameOverManager {
  private board: Board;
  private isPlaying: () => boolean;
  private onGameOver: () => void;
  private timeInDanger: number = 0;

  constructor(board: Board, isPlaying: () => boolean, onGameOver: () => void) {
    this.board = board;
    this.isPlaying = isPlaying;
    this.onGameOver = onGameOver;
  }

  public update(delta: number, droppedDrinks: Drink[]): void {
    // Armed only while playing; onGameOver() leaves that phase right away
    if (!this.isPlaying()) return;

    let hasDrinkInDanger = false;

    for (const drink of droppedDrinks) {
      if (!drink.active || drink.isMerging || !drink.isDropped) continue;

      const bottomY = drink.getBottomY();
      const velocityY = drink.body ? drink.body.velocity.y : 0;
      const velocityX = drink.body ? drink.body.velocity.x : 0;
      const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

      // In upward layout: Drinks stack from the top (TOP_Y).
      // If a resting/settled drink's bottom exceeds DANGER_LINE_Y (overflowing towards bottom launcher),
      // and it's not a newly launched drink swiftly sliding up (velocityY < -1.0)
      if (
        drink.y < GAME_CONFIG.SPAWN_Y - 40 &&
        bottomY > GAME_CONFIG.DANGER_LINE_Y &&
        speed < 1.2
      ) {
        hasDrinkInDanger = true;
        break;
      }
    }

    if (hasDrinkInDanger) {
      this.timeInDanger += delta;
      this.board.setDangerState(true);

      if (this.timeInDanger >= GAME_CONFIG.DANGER_GRACE_PERIOD_MS) {
        this.triggerGameOver();
      }
    } else {
      if (this.timeInDanger > 0) {
        this.timeInDanger = Math.max(0, this.timeInDanger - delta * 1.5);
        if (this.timeInDanger === 0) {
          this.board.setDangerState(false);
        }
      }
    }
  }

  private triggerGameOver(): void {
    this.board.setDangerState(false);
    AudioManager.getInstance().playGameOver();
    this.onGameOver();
  }

  public reset(): void {
    this.timeInDanger = 0;
    this.board.setDangerState(false);
  }
}
