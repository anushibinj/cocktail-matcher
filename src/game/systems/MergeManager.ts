import Phaser from 'phaser';
import { Drink } from '../entities/Drink';
import { ScoreManager } from './ScoreManager';
import { AudioManager } from './AudioManager';
import { DRINKS, getDrinkByLevel } from '../config/drinks';

export class MergeManager {
  private scene: Phaser.Scene;
  private scoreManager: ScoreManager;
  private onDrinkCreated?: (drink: Drink) => void;
  private onDrinkRemoved?: (drink: Drink) => void;
  private pendingMerges: Set<string> = new Set();

  constructor(
    scene: Phaser.Scene,
    scoreManager: ScoreManager,
    onDrinkCreated?: (drink: Drink) => void,
    onDrinkRemoved?: (drink: Drink) => void
  ) {
    this.scene = scene;
    this.scoreManager = scoreManager;
    this.onDrinkCreated = onDrinkCreated;
    this.onDrinkRemoved = onDrinkRemoved;

    this.setupCollisionListener();
  }

  private setupCollisionListener(): void {
    this.scene.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Collision sound with floor or wall
        if (
          (bodyA.label === 'drink' && bodyB.label.startsWith('wall')) ||
          (bodyB.label === 'drink' && bodyA.label.startsWith('wall')) ||
          (bodyA.label === 'drink' && bodyB.label === 'floor') ||
          (bodyB.label === 'drink' && bodyA.label === 'floor')
        ) {
          AudioManager.getInstance().playCollision(0.4);
        }

        // Check if both are drinks
        if (bodyA.label === 'drink' && bodyB.label === 'drink') {
          const drinkA = (bodyA as unknown as { gameObject: Drink }).gameObject;
          const drinkB = (bodyB as unknown as { gameObject: Drink }).gameObject;

          if (drinkA && drinkB && drinkA instanceof Drink && drinkB instanceof Drink) {
            this.handleDrinkCollision(drinkA, drinkB);
          }
        }
      });
    });
  }

  private handleDrinkCollision(d1: Drink, d2: Drink): void {
    // Both must be active, dropped, not already merging, and same level
    if (
      d1.isMerging ||
      d2.isMerging ||
      !d1.isDropped ||
      !d2.isDropped ||
      !d1.active ||
      !d2.active ||
      d1.level !== d2.level
    ) {
      // Just a normal collision between different drinks
      if (d1.isDropped && d2.isDropped) {
        AudioManager.getInstance().playCollision(0.3);
      }
      return;
    }

    // Maximum level reached?
    if (d1.level >= DRINKS.length - 1) {
      return;
    }

    // Strict lock to avoid duplicate merge triggers in the same physics step
    const mergeKey = [d1.id, d2.id].sort().join('-');
    if (this.pendingMerges.has(mergeKey)) {
      return;
    }
    this.pendingMerges.add(mergeKey);

    d1.isMerging = true;
    d2.isMerging = true;

    // Calculate midpoint and merged level
    const midX = (d1.x + d2.x) / 2;
    const midY = (d1.y + d2.y) / 2;
    const nextLevel = d1.level + 1;
    const nextDef = getDrinkByLevel(nextLevel);

    // Calculate inherited velocity
    const v1 = d1.body?.velocity || { x: 0, y: 0 };
    const v2 = d2.body?.velocity || { x: 0, y: 0 };
    const avgVx = (v1.x + v2.x) / 2;
    const avgVy = Math.min(-1.5, (v1.y + v2.y) / 2); // subtle upward pop

    // Remove old drinks from tracking and destroy
    if (this.onDrinkRemoved) {
      this.onDrinkRemoved(d1);
      this.onDrinkRemoved(d2);
    }
    d1.mergeAnimateAndDestroy();
    d2.mergeAnimateAndDestroy();

    // Create the new merged drink
    const newDrink = new Drink(this.scene, midX, midY, nextLevel);
    newDrink.setVelocity(avgVx, avgVy);

    if (this.onDrinkCreated) {
      this.onDrinkCreated(newDrink);
    }

    // Trigger visual effects & audio
    this.triggerMergeEffects(midX, midY, nextDef);
    this.scoreManager.addScore(nextDef.baseScore, midX, midY);
    AudioManager.getInstance().playMerge(nextLevel);

    // Clean up merge key after slight delay
    this.scene.time.delayedCall(100, () => {
      this.pendingMerges.delete(mergeKey);
    });
  }

  private triggerMergeEffects(x: number, y: number, def: typeof DRINKS[0]): void {
    // 1. Particle splash
    const emitter = this.scene.add.particles(x, y, 'particle_circle', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      tint: def.primaryColor,
      lifespan: { min: 350, max: 550 },
      quantity: 14,
      emitting: false
    });
    emitter.explode(14, x, y);

    // 2. Star sparkles
    const starEmitter = this.scene.add.particles(x, y, 'particle_star', {
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      tint: [0xffffff, def.secondaryColor],
      lifespan: { min: 400, max: 600 },
      quantity: 8,
      emitting: false
    });
    starEmitter.explode(8, x, y);

    // 3. Shockwave ring expansion
    const ring = this.scene.add.sprite(x, y, 'shockwave_ring');
    ring.setTint(def.primaryColor);
    ring.setScale(0.1);
    ring.setAlpha(0.85);

    this.scene.tweens.add({
      targets: ring,
      scaleX: (def.radius * 2) / 50,
      scaleY: (def.radius * 2) / 50,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        ring.destroy();
        emitter.destroy();
        starEmitter.destroy();
      }
    });

    // 4. Screen shake for larger tiers
    if (def.level >= 5) {
      const intensity = Math.min(0.012, 0.003 + (def.level - 5) * 0.0018);
      this.scene.cameras.main.shake(150, intensity);
    }
  }
}
