import Phaser from 'phaser';
import { BOARD, PHYSICS } from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  private drink?: Phaser.Physics.Matter.Image;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.createBackground();
    this.createBoard();
    this.spawnPlaceholderDrink();
  }

  private createBackground(): void {
    const { width, height } = this.scale;

    const sky = this.add.rectangle(width / 2, height * 0.25, width, height * 0.5, 0x87ceeb);
    const ocean = this.add.rectangle(width / 2, height * 0.75, width, height * 0.5, 0x1e90ff);
    const sand = this.add.rectangle(width / 2, height - 40, width, 80, 0xf4d03f);

    sky.setDepth(-3);
    ocean.setDepth(-2);
    sand.setDepth(-1);
  }

  private createBoard(): void {
    const wallThickness = 20;
    const boardWidth = BOARD.right - BOARD.left;
    const boardHeight = BOARD.floor - BOARD.dangerLine;

    const boardBg = this.add.rectangle(
      (BOARD.left + BOARD.right) / 2,
      (BOARD.dangerLine + BOARD.floor) / 2,
      boardWidth,
      boardHeight,
      0xffffff,
      0.12,
    );
    boardBg.setStrokeStyle(2, 0xffffff, 0.35);

    const dangerLine = this.add.line(
      0,
      0,
      BOARD.left,
      BOARD.dangerLine,
      BOARD.right,
      BOARD.dangerLine,
      0xff4444,
      0.5,
    );
    dangerLine.setLineWidth(2);

    const floor = this.matter.add.rectangle(
      (BOARD.left + BOARD.right) / 2,
      BOARD.floor + wallThickness / 2,
      boardWidth,
      wallThickness,
      { isStatic: true, friction: PHYSICS.friction, restitution: PHYSICS.restitution },
    );
    const leftWall = this.matter.add.rectangle(
      BOARD.left - wallThickness / 2,
      (BOARD.dangerLine + BOARD.floor) / 2,
      wallThickness,
      boardHeight + wallThickness,
      { isStatic: true, friction: PHYSICS.friction, restitution: PHYSICS.restitution },
    );
    const rightWall = this.matter.add.rectangle(
      BOARD.right + wallThickness / 2,
      (BOARD.dangerLine + BOARD.floor) / 2,
      wallThickness,
      boardHeight + wallThickness,
      { isStatic: true, friction: PHYSICS.friction, restitution: PHYSICS.restitution },
    );

    floor.label = 'floor';
    leftWall.label = 'left-wall';
    rightWall.label = 'right-wall';
  }

  private spawnPlaceholderDrink(): void {
    const radius = 28;
    const x = (BOARD.left + BOARD.right) / 2;
    const y = BOARD.dangerLine + radius + 8;

    this.drink = this.matter.add.image(x, y, 'drink-placeholder', undefined, {
      shape: { type: 'circle', radius },
      restitution: PHYSICS.restitution,
      friction: PHYSICS.friction,
      frictionAir: PHYSICS.frictionAir,
      density: PHYSICS.density,
    });

    this.drink.setScale(radius / 32);
    this.drink.setCircle(radius);
  }
}
