import Phaser from 'phaser';
import { Drink } from '../entities/Drink';
import { BOARD, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { DrinkSpawner } from '../systems/DrinkSpawner';
import { MergeManager } from '../systems/MergeManager';
import { ScoreManager } from '../systems/ScoreManager';
import { GameOverManager } from '../systems/GameOverManager';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../../storage/SaveManager';
import { getDrinkByLevel } from '../data/drinks';

export class GameScene extends Phaser.Scene {
  private audioManager?: AudioManager;
  private scoreManager?: ScoreManager;
  private mergeManager?: MergeManager;
  private gameOverManager?: GameOverManager;

  private droppedDrinks: Drink[] = [];
  private currentDrink: Drink | null = null;
  private nextLevel = 0;
  private canDrop = true;
  private isPaused = false;
  private isGameOver = false;
  private pointerActive = false;

  private scoreText?: Phaser.GameObjects.Text;
  private bestText?: Phaser.GameObjects.Text;
  private nextPreview?: Phaser.GameObjects.Image;
  private pauseOverlay?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.resetState();

    const save = SaveManager.load();
    this.audioManager = new AudioManager(this);
    this.scoreManager = new ScoreManager(save.bestScore);
    this.mergeManager = new MergeManager(this, (level, x, y, score) => this.handleMerge(level, x, y, score));
    this.gameOverManager = new GameOverManager(this, () => this.triggerGameOver());

    this.createBackground();
    this.createBoard();
    this.createHud();
    this.setupCollisions();
    this.setupInput();

    this.nextLevel = DrinkSpawner.pickSpawnLevel();
    this.spawnCurrentDrink();
    this.updateNextPreview();

    this.events.on('drink-created', (drink: Drink) => {
      this.droppedDrinks.push(drink);
    });
  }

  update(): void {
    if (this.isPaused || this.isGameOver) {
      return;
    }

    this.gameOverManager?.update(this.droppedDrinks.filter((drink) => drink.active));
  }

  private resetState(): void {
    this.droppedDrinks = [];
    this.currentDrink = null;
    this.canDrop = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.pointerActive = false;
    this.pauseOverlay = undefined;
  }

  private createBackground(): void {
    const sand = this.add.rectangle(GAME_WIDTH / 2, 50, GAME_WIDTH, 100, 0xf4d03f);
    const ocean = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, GAME_WIDTH, GAME_HEIGHT * 0.5, 0x1e90ff);
    const sky = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, GAME_WIDTH, GAME_HEIGHT * 0.45, 0x87ceeb);
    sand.setDepth(-3);
    ocean.setDepth(-2);
    sky.setDepth(-1);
  }

  private createBoard(): void {
    const wallThickness = 20;
    const boardWidth = BOARD.right - BOARD.left;
    const boardHeight = BOARD.spawnBase - BOARD.ceiling;

    const boardBg = this.add.rectangle(
      (BOARD.left + BOARD.right) / 2,
      (BOARD.ceiling + BOARD.spawnBase) / 2,
      boardWidth,
      boardHeight,
      0xffffff,
      0.12,
    );
    boardBg.setStrokeStyle(2, 0xffffff, 0.35);

    this.add
      .line(0, 0, BOARD.left, BOARD.dangerLine, BOARD.right, BOARD.dangerLine, 0xff4444, 0.55)
      .setLineWidth(2)
      .setDepth(1);

    this.matter.add.rectangle(
      (BOARD.left + BOARD.right) / 2,
      BOARD.spawnBase + wallThickness / 2,
      boardWidth,
      wallThickness,
      { isStatic: true, label: 'floor' },
    );
    this.matter.add.rectangle(
      BOARD.left - wallThickness / 2,
      (BOARD.ceiling + BOARD.spawnBase) / 2,
      wallThickness,
      boardHeight + wallThickness,
      { isStatic: true, label: 'left-wall' },
    );
    this.matter.add.rectangle(
      BOARD.right + wallThickness / 2,
      (BOARD.ceiling + BOARD.spawnBase) / 2,
      wallThickness,
      boardHeight + wallThickness,
      { isStatic: true, label: 'right-wall' },
    );
  }

  private createHud(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, 60, GAME_WIDTH - 20, 90, 0x0d3d52, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.15);

    this.scoreText = this.add.text(36, 28, 'Score: 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    });

    this.bestText = this.add.text(36, 58, `Best: ${this.scoreManager?.best ?? 0}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#fff8dc',
    });

    this.add.text(GAME_WIDTH - 36, 28, 'Next', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(1, 0);

    this.add.image(GAME_WIDTH - 36, 72, 'preview-bg').setOrigin(1, 0.5);
    this.nextPreview = this.add.image(GAME_WIDTH - 52, 72, 'drink-0').setScale(0.45).setOrigin(0.5);

    const pauseBtn = this.add
      .text(GAME_WIDTH / 2, 60, '⏸', {
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    pauseBtn.on('pointerdown', () => this.togglePause());
  }

  private setupCollisions(): void {
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        const gameObjectA = bodyA.gameObject as Drink | undefined;
        const gameObjectB = bodyB.gameObject as Drink | undefined;

        if (gameObjectA instanceof Drink && gameObjectB instanceof Drink) {
          this.mergeManager?.handleCollision(gameObjectA, gameObjectB);
        } else if (gameObjectA instanceof Drink || gameObjectB instanceof Drink) {
          this.audioManager?.playSfx('collision');
        }
      }
    });
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused || this.isGameOver || !this.canDrop || !this.currentDrink) {
        return;
      }
      this.pointerActive = true;
      this.moveCurrentDrink(pointer.worldX);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerActive || !this.currentDrink) {
        return;
      }
      this.moveCurrentDrink(pointer.worldX);
    });

    this.input.on('pointerup', () => {
      if (!this.pointerActive || !this.canDrop || !this.currentDrink) {
        this.pointerActive = false;
        return;
      }
      this.pointerActive = false;
      this.dropCurrentDrink();
    });
  }

  private moveCurrentDrink(x: number): void {
    if (!this.currentDrink) {
      return;
    }
    const clampedX = Phaser.Math.Clamp(x, BOARD.left + this.currentDrink.radius, BOARD.right - this.currentDrink.radius);
    this.currentDrink.setPosition(clampedX, BOARD.spawnY);
  }

  private spawnCurrentDrink(): void {
    const level = this.nextLevel;
    this.nextLevel = DrinkSpawner.pickSpawnLevel();
    this.updateNextPreview();

    const drink = new Drink(this, GAME_WIDTH / 2, BOARD.spawnY, level, 'preview');
    drink.playSpawnAnimation();
    this.currentDrink = drink;
    this.canDrop = true;
  }

  private dropCurrentDrink(): void {
    if (!this.currentDrink) {
      return;
    }

    this.canDrop = false;
    this.currentDrink.drop();
    this.droppedDrinks.push(this.currentDrink);
    this.audioManager?.playSfx('drop');
    this.currentDrink = null;

    this.time.delayedCall(650, () => {
      if (!this.isGameOver) {
        this.spawnCurrentDrink();
      }
    });
  }

  private updateNextPreview(): void {
    const def = getDrinkByLevel(this.nextLevel);
    this.nextPreview?.setTexture(def.textureKey);
    this.nextPreview?.setScale(Math.min(0.5, 28 / def.radius));
  }

  private handleMerge(level: number, x: number, y: number, points: number): void {
    const result = this.scoreManager?.add(points);
    if (!result) {
      return;
    }

    this.scoreText?.setText(`Score: ${result.score.toLocaleString()}`);
    this.bestText?.setText(`Best: ${result.bestScore.toLocaleString()}`);
    SaveManager.updateBestScore(result.score);

    this.audioManager?.playSfx('merge');
    this.audioManager?.playSfx('score');
    this.showScorePopup(x, y, points);
    this.emitMergeParticles(x, y, getDrinkByLevel(level).color);

    const shakeIntensity = level >= 8 ? 0.012 : level >= 4 ? 0.008 : 0.005;
    this.cameras.main.shake(120, shakeIntensity);
  }

  private showScorePopup(x: number, y: number, points: number): void {
    const popup = this.add
      .text(x, y, `+${points.toLocaleString()}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#fff8dc',
        stroke: '#0d3d52',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: popup,
      y: y - 50,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private emitMergeParticles(x: number, y: number, color: number): void {
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: 60, max: 180 },
      scale: { start: 0.8, end: 0 },
      lifespan: 450,
      quantity: 12,
      tint: color,
      blendMode: 'ADD',
    });
    emitter.setDepth(40);
    this.time.delayedCall(500, () => emitter.destroy());
  }

  private togglePause(): void {
    if (this.isGameOver) {
      return;
    }

    this.audioManager?.playSfx('click');
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.showPauseMenu();
      this.matter.world.pause();
    } else {
      this.hidePauseMenu();
      this.matter.world.resume();
    }
  }

  private showPauseMenu(): void {
    this.pauseOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setDepth(200)
      .setInteractive();

    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'panel').setDepth(201);
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'Paused', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(202);

    const resume = this.createOverlayButton(GAME_HEIGHT / 2 - 60, 'Resume', () => this.togglePause());
    const restart = this.createOverlayButton(GAME_HEIGHT / 2 + 20, 'Restart', () => {
      this.audioManager?.playSfx('restart');
      this.scene.restart();
    });
    const menu = this.createOverlayButton(GAME_HEIGHT / 2 + 100, 'Main Menu', () => {
      this.audioManager?.playSfx('click');
      this.scene.start('MenuScene');
    });
    const sound = this.createOverlayButton(GAME_HEIGHT / 2 + 180, 'Toggle Sound', () => {
      this.audioManager?.toggleSound();
      this.audioManager?.playSfx('click');
    });

    this.pauseOverlay.setData('children', [panel, title, resume, restart, menu, sound]);
  }

  private hidePauseMenu(): void {
    const children = this.pauseOverlay?.getData('children') as Phaser.GameObjects.GameObject[] | undefined;
    children?.forEach((child) => child.destroy());
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;
  }

  private triggerGameOver(): void {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.canDrop = false;
    this.audioManager?.playSfx('gameOver');

    const finalScore = this.scoreManager?.current ?? 0;
    const bestScore = SaveManager.updateBestScore(finalScore);
    const isNewBest = finalScore >= bestScore && finalScore > 0;

    this.showGameOverOverlay(finalScore, bestScore, isNewBest);
  }

  private showGameOverOverlay(finalScore: number, bestScore: number, isNewBest: boolean): void {
    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setDepth(300);

    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'panel').setDepth(301);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'Game Over', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ff6b6b',
      })
      .setOrigin(0.5)
      .setDepth(302);

    const scoreLine = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, `Score: ${finalScore.toLocaleString()}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(302);

    const bestLine = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, `Best: ${bestScore.toLocaleString()}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#fff8dc',
      })
      .setOrigin(0.5)
      .setDepth(302);

    if (isNewBest) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, '✨ New Best! ✨', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffd700',
        })
        .setOrigin(0.5)
        .setDepth(302);
    }

    const playAgain = this.createOverlayButton(GAME_HEIGHT / 2 + 80, 'Play Again', () => {
      this.audioManager?.playSfx('restart');
      this.scene.restart();
    }, 303);

    const mainMenu = this.createOverlayButton(GAME_HEIGHT / 2 + 160, 'Main Menu', () => {
      this.audioManager?.playSfx('click');
      this.scene.start('MenuScene');
    }, 303);

    this.add.container(0, 0, [overlay, panel, title, scoreLine, bestLine, playAgain, mainMenu]);
  }

  private createOverlayButton(
    y: number,
    label: string,
    onClick: () => void,
    depth = 202,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(GAME_WIDTH / 2, y);
    const bg = this.add.image(0, 0, 'btn-primary');
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', onClick);
    container.add([bg, text]);
    container.setDepth(depth);
    return container;
  }
}
