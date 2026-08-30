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

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.isGameActive = true;
    this.droppedDrinks = [];
    this.highestDrinkThisGame = 0;

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
    this.spawner.setEnabled(false);

    const finalScore = this.scoreManager.getScore();
    const bestScore = this.scoreManager.getBestScore();
    const isNewBest = finalScore >= bestScore && finalScore > 0;

    SaveManager.getInstance().recordGamePlayed(this.highestDrinkThisGame);
    this.gameOverModal.show(finalScore, bestScore, isNewBest);
  }

  private handlePause(): void {
    this.isGameActive = false;
    this.spawner.setEnabled(false);
    this.pauseModal.show();
  }

  private resumeGame(): void {
    this.isGameActive = true;
    this.spawner.setEnabled(true);
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
