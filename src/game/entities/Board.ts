import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class Board {
  private scene: Phaser.Scene;
  private dangerLineGraphic: Phaser.GameObjects.Sprite;
  private tableGlow!: Phaser.GameObjects.Graphics;
  private isDangerFlashing: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.createPhysicsWalls();
    this.createVisualTable();
    this.dangerLineGraphic = this.createDangerLine();
  }

  private createPhysicsWalls(): void {
    const { LEFT, RIGHT, TOP, BOTTOM, WALL_THICKNESS, CENTER_X } = GAME_CONFIG.BOARD;
    const height = BOTTOM - TOP;
    const centerY = (TOP + BOTTOM) / 2;

    // Top Wall (The back of the table where glasses rest)
    this.scene.matter.add.rectangle(
      CENTER_X,
      TOP - WALL_THICKNESS / 2,
      RIGHT - LEFT + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      { isStatic: true, label: 'wall_top', friction: 0.15, restitution: 0.1 }
    );

    // Left Wall
    this.scene.matter.add.rectangle(
      LEFT - WALL_THICKNESS / 2,
      centerY,
      WALL_THICKNESS,
      height + 100,
      { isStatic: true, label: 'wall_left', friction: 0.1, restitution: 0.1 }
    );

    // Right Wall
    this.scene.matter.add.rectangle(
      RIGHT + WALL_THICKNESS / 2,
      centerY,
      WALL_THICKNESS,
      height + 100,
      { isStatic: true, label: 'wall_right', friction: 0.1, restitution: 0.1 }
    );
  }

  private createVisualTable(): void {
    const { LEFT, TOP, WIDTH, HEIGHT } = GAME_CONFIG.BOARD;

    // 1. Wooden Table Surface with Plank Lines
    const tableGfx = this.scene.add.graphics();
    // Warm blonde wooden beach bar table
    tableGfx.fillStyle(0xedd3a8, 0.95);
    tableGfx.fillRoundedRect(LEFT, TOP, WIDTH, HEIGHT, { tl: 28, tr: 28, bl: 16, br: 16 });

    // Subtle wooden plank grooves
    tableGfx.lineStyle(1.5, 0xcfb284, 0.7);
    const plankWidth = WIDTH / 5;
    for (let i = 1; i < 5; i++) {
      const px = LEFT + i * plankWidth;
      tableGfx.lineBetween(px, TOP + 10, px, TOP + HEIGHT - 10);
    }

    // 2. Table Wooden Border & Rails
    this.tableGlow = this.scene.add.graphics();
    this.updateTableGlow(false);
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
      this.updateTableGlow(true);
    } else {
      this.scene.tweens.killTweensOf(this.dangerLineGraphic);
      this.dangerLineGraphic.setAlpha(0.65);
      this.updateTableGlow(false);
    }
  }

  private updateTableGlow(isAlert: boolean): void {
    const { LEFT, TOP, WIDTH, HEIGHT } = GAME_CONFIG.BOARD;
    this.tableGlow.clear();

    // Outer wooden border rail
    this.tableGlow.lineStyle(8, isAlert ? 0xff4444 : 0xaa7c45, isAlert ? 0.9 : 0.95);
    this.tableGlow.strokeRoundedRect(LEFT, TOP, WIDTH, HEIGHT, { tl: 28, tr: 28, bl: 16, br: 16 });

    // Inner highlight stroke
    this.tableGlow.lineStyle(2, isAlert ? 0xffaaaa : 0xffe8c6, 0.6);
    this.tableGlow.strokeRoundedRect(LEFT + 4, TOP + 4, WIDTH - 8, HEIGHT - 8, { tl: 24, tr: 24, bl: 12, br: 12 });
  }
}
