import type { Drink } from '../entities/Drink';
import { GAME_OVER } from '../config/gameConfig';

export class GameOverManager {
  private dangerTimer: Phaser.Time.TimerEvent | null = null;
  private offendingDrink: Drink | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onGameOver: () => void,
  ) {}

  update(droppedDrinks: Drink[]): void {
    const offender = droppedDrinks.find(
      (drink) => drink.state === 'dropped' && drink.isAboveDangerLine(),
    );

    if (!offender) {
      this.clearTimer();
      return;
    }

    if (this.offendingDrink === offender && this.dangerTimer) {
      return;
    }

    this.clearTimer();
    this.offendingDrink = offender;
    this.dangerTimer = this.scene.time.delayedCall(GAME_OVER.gracePeriodMs, () => {
      if (offender.active && offender.isAboveDangerLine()) {
        this.onGameOver();
      }
    });
  }

  reset(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    this.dangerTimer?.remove(false);
    this.dangerTimer = null;
    this.offendingDrink = null;
  }
}
