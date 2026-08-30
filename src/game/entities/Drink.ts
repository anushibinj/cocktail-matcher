import Phaser from 'phaser';
import { DrinkDefinition } from '../../types/game';
import { getDrinkByLevel } from '../config/drinks';
import { GAME_CONFIG } from '../config/gameConfig';

export class Drink extends Phaser.Physics.Matter.Sprite {
  public drinkDef: DrinkDefinition;
  public level: number;
  public isMerging: boolean = false;
  public isDropped: boolean = true;
  public id: string;

  constructor(scene: Phaser.Scene, x: number, y: number, level: number) {
    const def = getDrinkByLevel(level);
    super(scene.matter.world, x, y, `drink_${def.level}`);

    this.drinkDef = def;
    this.level = def.level;
    this.id = `drink_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set circular physics body
    this.setCircle(def.radius, {
      label: 'drink',
      restitution: GAME_CONFIG.PHYSICS.DEFAULT_RESTITUTION,
      friction: GAME_CONFIG.PHYSICS.DEFAULT_FRICTION,
      frictionAir: GAME_CONFIG.PHYSICS.DEFAULT_FRICTION_AIR,
      density: GAME_CONFIG.PHYSICS.DEFAULT_DENSITY
    });

    // Explicitly reposition after setCircle replaces the body
    this.setPosition(x, y);
    this.setOrigin(0.5, 0.5);

    scene.add.existing(this);
  }

  public mergeAnimateAndDestroy(): void {
    this.isMerging = true;
    // Disable physics immediately to prevent duplicate collision
    if (this.body) {
      this.scene.matter.world.remove(this.body);
    }

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  public getTopY(): number {
    return this.y - this.drinkDef.radius;
  }

  public getBottomY(): number {
    return this.y + this.drinkDef.radius;
  }
}
