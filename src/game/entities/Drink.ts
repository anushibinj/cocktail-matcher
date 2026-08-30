import Phaser from 'phaser';
import { getDrinkByLevel } from '../data/drinks';
import { BOARD, PHYSICS, GAME_OVER } from '../config/gameConfig';

export type DrinkState = 'preview' | 'dropped' | 'merging';

export class Drink extends Phaser.Physics.Matter.Image {
  readonly level: number;
  state: DrinkState = 'preview';
  mergeLocked = false;

  constructor(scene: Phaser.Scene, x: number, y: number, level: number, state: DrinkState = 'preview') {
    const def = getDrinkByLevel(level);
    super(scene.matter.world, x, y, def.textureKey);
    scene.add.existing(this);

    this.level = level;
    this.state = state;
    this.setDepth(10);
    this.setCircle(def.radius);
    this.setFriction(PHYSICS.friction);
    this.setFrictionAir(PHYSICS.frictionAir);
    this.setBounce(PHYSICS.restitution);
    this.setDensity(PHYSICS.density);

    if (state === 'preview') {
      this.setStatic(true);
      this.setAlpha(0.95);
    } else {
      this.setStatic(false);
    }
  }

  get definition() {
    return getDrinkByLevel(this.level);
  }

  get radius(): number {
    return this.definition.radius;
  }

  drop(): void {
    if (this.state !== 'preview') {
      return;
    }
    this.state = 'dropped';
    this.setStatic(false);
    this.setAlpha(1);
  }

  isAboveDangerLine(): boolean {
    if (this.state !== 'dropped') {
      return false;
    }

    const body = this.body as MatterJS.BodyType;
    const speed = Math.hypot(body.velocity?.x ?? 0, body.velocity?.y ?? 0);
    if (speed > GAME_OVER.settledSpeedThreshold) {
      return false;
    }

    return this.y - this.radius < BOARD.dangerLine;
  }

  playSpawnAnimation(): void {
    this.setScale(0.2);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }
}
