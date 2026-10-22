import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { Board } from '../entities/Board';
import { Drink } from '../entities/Drink';
import { DrinkSpawner } from '../systems/DrinkSpawner';
import { MergeManager } from '../systems/MergeManager';
import { ScoreManager } from '../systems/ScoreManager';
import { GameOverManager } from '../systems/GameOverManager';
import { OrderManager } from '../systems/OrderManager';
import { HUD } from '../ui/HUD';
import { GameOverModal } from '../ui/GameOverModal';
import { PauseModal } from '../ui/PauseModal';
import { SaveManager } from '../../storage/SaveManager';

/**
 * The run's single source of truth. Only setPhase() changes it, and it
 * applies every side effect (physics, clock, tweens, input) in one place.
 */
export type GamePhase = 'playing' | 'paused' | 'gameOver' | 'exiting';

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private spawner!: DrinkSpawner;
  public mergeManager!: MergeManager;
  private scoreManager!: ScoreManager;
  private gameOverManager!: GameOverManager;
  private orderManager!: OrderManager;
  private hud!: HUD;
  private gameOverModal!: GameOverModal;
  private pauseModal!: PauseModal;
  private droppedDrinks: Drink[] = [];
  private phase: GamePhase = 'playing';
  private highestDrinkThisGame: number = 0;
  // Gameplay tweens paused by freezeGameplay(), resumed by unfreezeGameplay()
  private frozenTweens: Phaser.Tweens.Tween[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.droppedDrinks = [];
    this.highestDrinkThisGame = 0;
    this.frozenTweens = [];

    // 1. Background
    this.add.image(WIDTH / 2, HEIGHT / 2, 'bg_tropical');

    // 2. Playable Board & Physics Container
    this.board = new Board(this);

    // 3. Score System
    this.scoreManager = new ScoreManager(this, (score, bestScore) => {
      if (this.hud) {
        this.hud.updateScore(score, bestScore);
      }
    });

    // 4. Merge System
    this.mergeManager = new MergeManager(
      this,
      this.scoreManager,
      (newDrink: Drink) => {
        this.droppedDrinks.push(newDrink);
        if (newDrink.level > this.highestDrinkThisGame) {
          this.highestDrinkThisGame = newDrink.level;
        }
      },
      (removedDrink: Drink) => {
        const idx = this.droppedDrinks.indexOf(removedDrink);
        if (idx !== -1) {
          this.droppedDrinks.splice(idx, 1);
        }
      }
    );

    // 5. To-Go Orders Manager (Hanging tickets at top)
    this.orderManager = new OrderManager(
      this,
      this.scoreManager,
      (_order, drink) => {
        const idx = this.droppedDrinks.indexOf(drink);
        if (idx !== -1) {
          this.droppedDrinks.splice(idx, 1);
        }
      }
    );
    this.orderManager.init();

    // 6. Game Over Manager
    this.gameOverManager = new GameOverManager(this.board, () => {
      this.handleGameOver();
    });

    // 7. HUD
    this.hud = new HUD(this, () => {
      this.handlePause();
    });

    // 8. Modals
    this.gameOverModal = new GameOverModal(
      this,
      () => this.restartGame(),
      () => this.goToMenu()
    );

    this.pauseModal = new PauseModal(
      this,
      () => this.resumeGame(),
      () => this.restartGame(),
      () => this.goToMenu(),
      () => this.hud.updateAudioIcons()
    );

    // 9. Drink Spawner
    this.spawner = new DrinkSpawner(
      this,
      undefined,
      (droppedDrink) => {
        this.droppedDrinks.push(droppedDrink);
        if (droppedDrink.level > this.highestDrinkThisGame) {
          this.highestDrinkThisGame = droppedDrink.level;
        }
      }
    );

    this.spawner.init();

    // The scene clock outlives a Main Menu round trip, so this also clears a
    // pause left over from the previous visit's game over or pause modal.
    this.setPhase('playing');

    // Auto-pause when the tab or app goes to the background mid-game
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    });
  }

  private handleHidden(): void {
    if (this.isPlaying()) {
      this.handlePause();
    }
  }

  /** Predicate handed to systems so they never keep their own enable flag. */
  public isPlaying(): boolean {
    return this.phase === 'playing';
  }

  /**
   * The only place run state changes. Leaving 'playing' freezes physics,
   * the clock, merges and running tweens and disarms input; entering it
   * undoes that and ends a launch cooldown a pause left pending.
   */
  private setPhase(next: GamePhase): void {
    this.phase = next;
    switch (next) {
      case 'playing':
        this.unfreezeGameplay();
        this.spawner.setEnabled(true);
        // No-op after a restart, whose spawner.reset() already cancelled it
        this.spawner.finishPendingCooldown();
        break;
      case 'paused':
      case 'gameOver':
      case 'exiting':
        this.freezeGameplay();
        this.spawner.setEnabled(false);
        break;
    }
  }

  public update(_time: number, delta: number): void {
    if (!this.isPlaying()) return;

    // Filter out destroyed or inactive drinks
    this.droppedDrinks = this.droppedDrinks.filter(d => d && d.active && !d.isMerging);

    // Check To-Go Orders fulfillment
    this.orderManager.checkForMatchingOrders(this.droppedDrinks);

    // Check danger line overflow
    this.gameOverManager.update(delta, this.droppedDrinks);
  }

  private handleGameOver(): void {
    // Freeze before reading the score so no late merge or checkout changes it
    this.setPhase('gameOver');

    const finalScore = this.scoreManager.getScore();
    const bestScore = this.scoreManager.getBestScore();
    const isNewBest = this.scoreManager.hasBeatPreviousBest();

    SaveManager.getInstance().recordGamePlayed(this.highestDrinkThisGame);
    this.gameOverModal.show(finalScore, bestScore, isNewBest);
  }

  private handlePause(): void {
    this.setPhase('paused');
    this.pauseModal.show();
  }

  private resumeGame(): void {
    this.setPhase('playing');
  }

  /**
   * Stops physics, the scene clock (cooldowns, delayed calls) and every
   * tween running right now, so nothing moves, merges or scores under a
   * modal. Tweens created afterwards, like the modal pop-in, still play.
   */
  private freezeGameplay(): void {
    if (!this.matter.world.enabled) return;
    this.matter.world.pause();
    this.time.paused = true;
    this.mergeManager.setEnabled(false);
    // A merge shake would otherwise play out under the modal, shaking it too
    this.cameras.main.shakeEffect.reset();
    this.frozenTweens = this.tweens.getTweens().filter(t => t.isPlaying());
    this.frozenTweens.forEach(t => t.pause());
  }

  private unfreezeGameplay(): void {
    this.frozenTweens.forEach(t => {
      if (!t.isDestroyed()) t.resume();
    });
    this.frozenTweens = [];
    this.mergeManager.setEnabled(true);
    this.time.paused = false;
    this.matter.world.resume();
  }

  private restartGame(): void {
    // Destroy all current physics drinks
    for (const drink of this.droppedDrinks) {
      if (drink && drink.body) {
        this.matter.world.remove(drink.body);
      }
      if (drink && drink.active) {
        drink.destroy();
      }
    }
    this.droppedDrinks = [];
    this.highestDrinkThisGame = 0;

    this.scoreManager.reset();
    this.orderManager.reset();
    this.gameOverManager.reset();
    this.spawner.reset();
    this.hud.updateScore(0, this.scoreManager.getBestScore());
    // Finish the old game's frozen FX (score popups, merge pop-outs, rings)
    // instead of resuming them over the new board. Skip tweens that a reset
    // above already removed: complete() would still fire their onComplete,
    // e.g. a cancelled checkout's reward.
    this.frozenTweens.forEach(t => {
      if (this.tweens.has(t) && t.isActive()) t.complete();
    });
    this.frozenTweens = [];
    this.setPhase('playing');
  }

  private goToMenu(): void {
    this.setPhase('exiting');
    for (const drink of this.droppedDrinks) {
      if (drink && drink.body) {
        this.matter.world.remove(drink.body);
      }
      if (drink && drink.active) {
        drink.destroy();
      }
    }
    this.scene.start('MenuScene');
  }

  // --- Debug/test hooks (used only by src/debug.ts) ---

  /** Places a drink of `level` at (x, y), tracked like a launched drink. */
  public debugSpawnDrink(level: number, x: number, y: number): Drink {
    const drink = new Drink(this, x, y, level);
    this.droppedDrinks.push(drink);
    if (drink.level > this.highestDrinkThisGame) {
      this.highestDrinkThisGame = drink.level;
    }
    return drink;
  }

  /** Sets the current score to `score` (also updates the stored best if exceeded). */
  public debugSetScore(score: number): void {
    this.scoreManager.addScore(score - this.scoreManager.getScore());
  }

  /** Read-only snapshot of run state for tests. */
  public debugGetState(): { phase: GamePhase; isGameActive: boolean; score: number; bestScore: number; drinks: { level: number; x: number; y: number }[] } {
    return {
      phase: this.phase,
      isGameActive: this.isPlaying(),
      score: this.scoreManager.getScore(),
      bestScore: this.scoreManager.getBestScore(),
      drinks: this.droppedDrinks
        .filter(d => d.active && !d.isMerging)
        .map(d => ({ level: d.level, x: d.x, y: d.y }))
    };
  }

  /** Ends the current run immediately, as if the danger timer had expired. */
  public debugForceGameOver(): void {
    if (this.isPlaying()) {
      this.handleGameOver();
    }
  }
}
