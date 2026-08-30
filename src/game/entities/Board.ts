import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class Board {
  private scene: Phaser.Scene;
  private dangerLineGraphic: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Sprite;
  private containerGlow!: Phaser.GameObjects.Graphics;
  private isDangerFlashing: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.createPhysicsWalls();
    this.createVisualContainer();
    this.dangerLineGraphic = this.createDangerLine();
  }

  private createPhysicsWalls(): void {
    const { LEFT, RIGHT, FLOOR_Y, HEIGHT, CENTER_X, WALL_THICKNESS } = GAME_CONFIG.BOARD;
    const centerY = FLOOR_Y - HEIGHT / 2;

    // Left Wall
    this.scene.matter.add.rectangle(
      LEFT - WALL_THICKNESS / 2,
      centerY,
      WALL_THICKNESS,
      HEIGHT + 100,
      { isStatic: true, label: 'wall_left', friction: 0.1, restitution: 0.1 }
    );

    // Right Wall
    this.scene.matter.add.rectangle(
      RIGHT + WALL_THICKNESS / 2,
      centerY,
      WALL_THICKNESS,
      HEIGHT + 100,
      { isStatic: true, label: 'wall_right', friction: 0.1, restitution: 0.1 }
    );

    // Floor
    this.scene.matter.add.rectangle(
      CENTER_X,
      FLOOR_Y + WALL_THICKNESS / 2,
      RIGHT - LEFT + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      { isStatic: true, label: 'floor', friction: 0.2, restitution: 0.1 }
    );
  }

  private createVisualContainer(): void {
    const { LEFT, TOP, FLOOR_Y, WIDTH, HEIGHT } = GAME_CONFIG.BOARD;

    // 1. Wooden bar counter under the container
    const woodGfx = this.scene.add.graphics();
    woodGfx.fillStyle(0x3e2723, 0.95);
    woodGfx.fillRoundedRect(LEFT - 28, FLOOR_Y - 4, WIDTH + 56, 32, 8);
    woodGfx.fillStyle(0x5d4037, 0.9);
    woodGfx.fillRoundedRect(LEFT - 20, FLOOR_Y, WIDTH + 40, 10, 4);

    // 2. Glass Jar / Container Backdrop
    const glassBg = this.scene.add.graphics();
    glassBg.fillStyle(0xffffff, 0.05);
    glassBg.fillRoundedRect(LEFT, TOP, WIDTH, HEIGHT, { tl: 0, tr: 0, bl: 24, br: 24 });

    // 3. Container Outline & Glow
    this.containerGlow = this.scene.add.graphics();
    this.updateContainerGlow(false);
  }

  private createDangerLine(): Phaser.GameObjects.Sprite {
    const { CENTER_X } = GAME_CONFIG.BOARD;
    const dangerSprite = this.scene.add.sprite(CENTER_X, GAME_CONFIG.DANGER_LINE_Y, 'danger_line');
    dangerSprite.setAlpha(0.65);
    return dangerSprite;
  }

  public setDangerState(inDanger: boolean): void {
    if (inDanger === this.isDangerFlashing) return;
    this.isDangerFlashing = inDanger;

    if (inDanger) {
      this.scene.tweens.add({
        targets: this.dangerLineGraphic,
        alpha: { from: 0.3, to: 1 },
        duration: 250,
        yoyo: true,
        repeat: -1
      });
      this.updateContainerGlow(true);
    } else {
      this.scene.tweens.killTweensOf(this.dangerLineGraphic);
      this.dangerLineGraphic.setAlpha(0.65);
      this.updateContainerGlow(false);
    }
  }

  private updateContainerGlow(isAlert: boolean): void {
    const { LEFT, TOP, WIDTH, HEIGHT } = GAME_CONFIG.BOARD;
    this.containerGlow.clear();

    // Glass rim stroke
    this.containerGlow.lineStyle(4, isAlert ? 0xff4444 : 0x48cae4, isAlert ? 0.9 : 0.6);
    this.containerGlow.strokeRoundedRect(LEFT, TOP, WIDTH, HEIGHT, { tl: 0, tr: 0, bl: 24, br: 24 });

    // Inner shine stroke
    this.containerGlow.lineStyle(2, 0xffffff, 0.3);
    this.containerGlow.strokeRoundedRect(LEFT + 3, TOP + 3, WIDTH - 6, HEIGHT - 6, { tl: 0, tr: 0, bl: 20, br: 20 });
  }
}
