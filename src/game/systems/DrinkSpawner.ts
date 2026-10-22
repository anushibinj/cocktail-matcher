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
  private cooldownTimer: Phaser.Time.TimerEvent | null = null;
  // Id of the pointer whose press started an aiming gesture, or null. Only
  // that pointer's release launches, so taps on buttons (which never arm)
  // and extra fingers during a multi-touch never fire a drink.
  private armedPointerId: number | null = null;
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
    const initialRadius = getDrinkByLevel(0).radius;
    this.previewSprite.setDisplaySize(initialRadius * 2 + 16, initialRadius * 2 + 16);

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
      if (this.armedPointerId !== null && pointer.id !== this.armedPointerId) return;
      this.handlePointerMove(pointer.x);
    });

    this.scene.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        // Phaser emits a button's own pointerdown before this scene-wide one,
        // so a button that just re-enabled the spawner (Resume, Play Again)
        // still shows up in currentlyOver here and must not arm a launch.
        if (!this.isEnabled || this.armedPointerId !== null || currentlyOver.length > 0) return;
        this.armedPointerId = pointer.id;
        this.handlePointerMove(pointer.x);
        this.drawGuidanceLine();
      }
    );

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.armedPointerId) return;
      this.armedPointerId = null;
      if (!this.isEnabled) return;
      this.launchCurrentDrink();
    });

    // Releasing off-canvas never launched before; just drop the gesture.
    this.scene.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.armedPointerId) {
        this.armedPointerId = null;
      }
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

    // Cooldown before next drink appears at launcher. The callback must
    // always end the cooldown, even if the spawner was disabled (paused)
    // meanwhile; otherwise nothing ever clears isCoolingDown and launching
    // is soft-locked. Only the guidance line depends on isEnabled, and
    // drawGuidanceLine() already checks that.
    this.cooldownTimer = this.scene.time.delayedCall(GAME_CONFIG.DROP_COOLDOWN_MS, () => {
      this.cooldownTimer = null;
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
    });
  }

  private cancelCooldown(): void {
    if (this.cooldownTimer) {
      this.cooldownTimer.remove(false);
      this.cooldownTimer = null;
    }
    this.isCoolingDown = false;
  }

  private updatePreviewTexture(): void {
    const def = getDrinkByLevel(this.currentLevel);
    this.previewSprite.setTexture(`drink_${def.level}`);
    this.previewSprite.setDisplaySize(def.radius * 2 + 16, def.radius * 2 + 16);
    this.previewSprite.setPosition(this.currentTargetX, GAME_CONFIG.SPAWN_Y);
  }

  private popInPreview(): void {
    // Capture the scale setDisplaySize() computed for the current texture
    // before zeroing it out — tweening to a literal 1 only happened to work
    // when every drink texture was procedurally generated at exactly its
    // display size (so scale was always 1 anyway). A custom artwork file at
    // a different native resolution needs its own computed scale as the
    // animation target, not 1.
    const targetScaleX = this.previewSprite.scaleX;
    const targetScaleY = this.previewSprite.scaleY;
    this.previewSprite.setScale(0);
    this.scene.tweens.add({
      targets: this.previewSprite,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
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
      this.armedPointerId = null;
      this.guidanceGfx.clear();
    } else {
      this.drawGuidanceLine();
    }
  }

  public reset(): void {
    this.armedPointerId = null;
    // A cooldown still pending from the previous game would otherwise fire
    // after the restart and advance the freshly rolled queue a second time.
    this.cancelCooldown();
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
