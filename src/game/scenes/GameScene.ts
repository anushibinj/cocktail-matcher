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
  private isGameActive: boolean = true;
  private highestDrinkThisGame: number = 0;
  // Gameplay tweens paused by freezeGameplay(), resumed by unfreezeGameplay()
  private frozenTweens: Phaser.Tweens.Tween[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.isGameActive = true;
    this.droppedDrinks = [];
    this.highestDrinkThisGame = 0;
    this.frozenTweens = [];
    // The scene clock outlives a Main Menu round trip, so clear a pause
    // left over from the previous visit's game over or pause modal.
    this.time.paused = false;

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

    // Auto-pause when the tab or app goes to the background mid-game
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    });
  }

  private handleHidden(): void {
    if (this.isGameActive) {
      this.handlePause();
    }
  }

  public update(_time: number, delta: number): void {
    if (!this.isGameActive) return;

    // Filter out destroyed or inactive drinks
    this.droppedDrinks = this.droppedDrinks.filter(d => d && d.active && !d.isMerging);

    // Check To-Go Orders fulfillment
    this.orderManager.checkForMatchingOrders(this.droppedDrinks);

    // Check danger line overflow
    this.gameOverManager.update(delta, this.droppedDrinks);
  }

  private handleGameOver(): void {
    this.isGameActive = false;
    // Freeze before reading the score so no late merge or checkout changes it
    this.freezeGameplay();
    this.spawner.setEnabled(false);

    const finalScore = this.scoreManager.getScore();
    const bestScore = this.scoreManager.getBestScore();
    const isNewBest = this.scoreManager.hasBeatPreviousBest();

    SaveManager.getInstance().recordGamePlayed(this.highestDrinkThisGame);
    this.gameOverModal.show(finalScore, bestScore, isNewBest);
  }

  private handlePause(): void {
    this.isGameActive = false;
    this.freezeGameplay();
    this.spawner.setEnabled(false);
    this.pauseModal.show();
  }

  private resumeGame(): void {
    this.unfreezeGameplay();
    this.isGameActive = true;
    this.spawner.setEnabled(true);
    this.spawner.finishPendingCooldown();
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

    this.isGameActive = true;
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
    this.unfreezeGameplay();
  }

  private goToMenu(): void {
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
}
