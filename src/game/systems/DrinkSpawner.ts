import Phaser from 'phaser';
import { Drink } from '../entities/Drink';
import { GAME_CONFIG } from '../config/gameConfig';
import { AudioManager } from './AudioManager';
import { getDrinkByLevel } from '../config/drinks';

export class DrinkSpawner {
  private scene: Phaser.Scene;
  private previewSprite: Phaser.GameObjects.Sprite;
  private guidanceGfx: Phaser.GameObjects.Graphics;
  private currentLevel: number = 0;
  private nextLevel: number = 0;
  private isCoolingDown: boolean = false;
  private isEnabled: boolean = true;
  private currentTargetX: number = GAME_CONFIG.BOARD.CENTER_X;
  private onNextDrinkChanged?: (level: number) => void;
  private onDrinkDropped?: (drink: Drink) => void;

  constructor(
    scene: Phaser.Scene,
    onNextDrinkChanged?: (level: number) => void,
    onDrinkDropped?: (drink: Drink) => void
  ) {
    this.scene = scene;
    this.onNextDrinkChanged = onNextDrinkChanged;
    this.onDrinkDropped = onDrinkDropped;

    // Guidance line graphics
    this.guidanceGfx = this.scene.add.graphics();
    this.guidanceGfx.setDepth(5);

    // Aiming preview sprite (at bottom launch line)
    this.previewSprite = this.scene.add.sprite(
      GAME_CONFIG.BOARD.CENTER_X,
      GAME_CONFIG.SPAWN_Y,
      'drink_0'
    );
    this.previewSprite.setDepth(10);

    this.setupInput();
  }

  public init(): void {
    this.currentLevel = this.getRandomSpawnLevel();
    this.nextLevel = this.getRandomSpawnLevel();
    this.updatePreviewTexture();

    if (this.onNextDrinkChanged) {
      this.onNextDrinkChanged(this.nextLevel);
    }
    this.popInPreview();
    this.drawGuidanceLine();
  }

  private setupInput(): void {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabled) return;
      this.handlePointerMove(pointer.x);
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabled) return;
      this.handlePointerMove(pointer.x);
      this.drawGuidanceLine();
    });

    this.scene.input.on('pointerup', () => {
      if (!this.isEnabled) return;
      this.launchCurrentDrink();
    });
  }

  private handlePointerMove(rawX: number): void {
    const def = getDrinkByLevel(this.currentLevel);
    const radius = def.radius;
    const minX = GAME_CONFIG.BOARD.LEFT + radius + 6;
    const maxX = GAME_CONFIG.BOARD.RIGHT - radius - 6;

    this.currentTargetX = Phaser.Math.Clamp(rawX, minX, maxX);
    this.previewSprite.setX(this.currentTargetX);
    this.drawGuidanceLine();
  }

  private drawGuidanceLine(): void {
    this.guidanceGfx.clear();
    if (!this.isEnabled || this.isCoolingDown || !this.previewSprite.visible) {
      return;
    }

    const def = getDrinkByLevel(this.currentLevel);
    const startY = GAME_CONFIG.SPAWN_Y - def.radius - 6;
    const topY = GAME_CONFIG.BOARD.TOP;

    this.guidanceGfx.lineStyle(2.5, 0xffffff, 0.55);
    for (let y = startY; y > topY; y -= 16) {
      this.guidanceGfx.lineBetween(
        this.currentTargetX,
        y,
        this.currentTargetX,
        Math.max(y - 8, topY)
      );
    }
  }

  private launchCurrentDrink(): void {
    if (this.isCoolingDown || !this.isEnabled || !this.previewSprite.visible) return;

    this.isCoolingDown = true;
    this.previewSprite.setVisible(false);
    this.guidanceGfx.clear();

    // Spawn the real physics drink and launch UPWARDS with calm, steady velocity
    const drink = new Drink(
      this.scene,
      this.currentTargetX,
      GAME_CONFIG.SPAWN_Y,
      this.currentLevel
    );
    drink.setVelocity(0, -3.2); // Smooth controlled glide up the table

    AudioManager.getInstance().playDrop();

    if (this.onDrinkDropped) {
      this.onDrinkDropped(drink);
    }

    // Cooldown before next drink appears at launcher
    this.scene.time.delayedCall(GAME_CONFIG.DROP_COOLDOWN_MS, () => {
      if (this.isEnabled) {
        this.currentLevel = this.nextLevel;
        this.nextLevel = this.getRandomSpawnLevel();

        if (this.onNextDrinkChanged) {
          this.onNextDrinkChanged(this.nextLevel);
        }

        this.updatePreviewTexture();
        this.previewSprite.setVisible(true);
        this.isCoolingDown = false;
        this.popInPreview();
        this.drawGuidanceLine();
      }
    });
  }

  private updatePreviewTexture(): void {
    const def = getDrinkByLevel(this.currentLevel);
    this.previewSprite.setTexture(`drink_${def.level}`);
    this.previewSprite.setPosition(this.currentTargetX, GAME_CONFIG.SPAWN_Y);
  }

  private popInPreview(): void {
    this.previewSprite.setScale(0);
    this.scene.tweens.add({
      targets: this.previewSprite,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onUpdate: () => {
        this.drawGuidanceLine();
      }
    });
  }

  private getRandomSpawnLevel(): number {
    const dist = GAME_CONFIG.SPAWN_DISTRIBUTION;
    const totalWeight = dist.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of dist) {
      if (rand < item.weight) {
        return item.level;
      }
      rand -= item.weight;
    }
    return 0;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.guidanceGfx.clear();
    } else {
      this.drawGuidanceLine();
    }
  }

  public reset(): void {
    this.isCoolingDown = false;
    this.isEnabled = true;
    this.currentTargetX = GAME_CONFIG.BOARD.CENTER_X;
    this.currentLevel = this.getRandomSpawnLevel();
    this.nextLevel = this.getRandomSpawnLevel();
    this.updatePreviewTexture();
    this.previewSprite.setVisible(true);

    if (this.onNextDrinkChanged) {
      this.onNextDrinkChanged(this.nextLevel);
    }
    this.popInPreview();
    this.drawGuidanceLine();
  }
}
