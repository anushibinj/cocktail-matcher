import Phaser from 'phaser';
import { Drink } from '../entities/Drink';
import { MAX_DRINK_LEVEL } from '../data/drinks';

export class MergeManager {
  private readonly mergingPairs = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onMerge: (resultLevel: number, x: number, y: number, score: number) => void,
  ) {}

  handleCollision(drinkA: Drink, drinkB: Drink): void {
    if (
      drinkA.mergeLocked ||
      drinkB.mergeLocked ||
      drinkA.state === 'merging' ||
      drinkB.state === 'merging' ||
      drinkA.level !== drinkB.level ||
      drinkA.level >= MAX_DRINK_LEVEL
    ) {
      return;
    }

    const pairKey = this.pairKey(drinkA, drinkB);
    if (this.mergingPairs.has(pairKey)) {
      return;
    }

    this.mergingPairs.add(pairKey);

    drinkA.mergeLocked = true;
    drinkB.mergeLocked = true;
    drinkA.state = 'merging';
    drinkB.state = 'merging';

    const resultLevel = drinkA.level + 1;
    const x = (drinkA.x + drinkB.x) / 2;
    const y = (drinkA.y + drinkB.y) / 2;
    const bodyA = drinkA.body as MatterJS.BodyType;
    const bodyB = drinkB.body as MatterJS.BodyType;
    const velocityX = ((bodyA.velocity?.x ?? 0) + (bodyB.velocity?.x ?? 0)) / 2;
    const velocityY = ((bodyA.velocity?.y ?? 0) + (bodyB.velocity?.y ?? 0)) / 2;
    const score = drinkA.definition.score * 2;

    drinkA.destroy();
    drinkB.destroy();

    this.scene.time.delayedCall(0, () => {
      this.mergingPairs.delete(pairKey);
      this.onMerge(resultLevel, x, y, score);

      const resultDrink = new Drink(this.scene, x, y, resultLevel, 'dropped');
      resultDrink.setVelocity(velocityX * 0.6, velocityY * 0.6);
      resultDrink.playSpawnAnimation();
      this.scene.events.emit('drink-created', resultDrink);
    });
  }

  private pairKey(a: Drink, b: Drink): string {
    const bodyA = a.body as MatterJS.BodyType;
    const bodyB = b.body as MatterJS.BodyType;
    const ids = [bodyA.id, bodyB.id].sort((left, right) => left - right);
    return `${ids[0]}-${ids[1]}`;
  }
}
