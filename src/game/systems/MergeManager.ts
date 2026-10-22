import Phaser from 'phaser';
import { Drink } from '../entities/Drink';
import { ScoreManager } from './ScoreManager';
import { AudioManager } from './AudioManager';
import { DRINKS, getDrinkByLevel } from '../config/drinks';
import { canMerge } from './mergeRules';

export class MergeManager {
  private scene: Phaser.Scene;
  private scoreManager: ScoreManager;
  private onDrinkCreated?: (drink: Drink) => void;
  private onDrinkRemoved?: (drink: Drink) => void;
  private pendingMerges: Set<string> = new Set();
  private isEnabled: boolean = true;

  // Pooled merge FX: created once per scene and re-fired with explode(), so
  // particles from one burst live out their lifespan instead of being cut
  // off when a per-merge emitter is destroyed.
  private splashEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private starEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private splashTint: number = 0xffffff;
  private starTints: number[] = [0xffffff, 0xffffff];
  private ringPool: Phaser.GameObjects.Group;

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

    this.splashEmitter = this.scene.add.particles(0, 0, 'particle_circle', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      tint: { onEmit: () => this.splashTint },
      lifespan: { min: 350, max: 550 },
      emitting: false
    });

    this.starEmitter = this.scene.add.particles(0, 0, 'particle_star', {
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      tint: { onEmit: () => Phaser.Utils.Array.GetRandom(this.starTints) as number },
      lifespan: { min: 400, max: 600 },
      emitting: false
    });

    this.ringPool = this.scene.add.group({
      classType: Phaser.GameObjects.Sprite,
      maxSize: 8
    });

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyEffects());

    this.setupCollisionListener();
  }

  private destroyEffects(): void {
    this.splashEmitter.destroy();
    this.starEmitter.destroy();
    this.ringPool.destroy(true);
  }

  private setupCollisionListener(): void {
    this.scene.matter.world.on(
      'collisionstart',
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        // Paused or game over: no merges, score or collision audio
        if (!this.isEnabled) return;

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
            const vA = bodyA.velocity || { x: 0, y: 0 };
            const vB = bodyB.velocity || { x: 0, y: 0 };
            const speed = Math.sqrt((vA.x - vB.x) * (vA.x - vB.x) + (vA.y - vB.y) * (vA.y - vB.y));
            AudioManager.getInstance().playWallTap(Math.min(1.0, speed / 5));
          }

          // Check if both are drinks
          if (bodyA.label === 'drink' && bodyB.label === 'drink') {
            const drinkA = (bodyA as unknown as { gameObject: Drink }).gameObject;
            const drinkB = (bodyB as unknown as { gameObject: Drink }).gameObject;

            if (drinkA && drinkB && drinkA instanceof Drink && drinkB instanceof Drink) {
              const vA = bodyA.velocity || { x: 0, y: 0 };
              const vB = bodyB.velocity || { x: 0, y: 0 };
              const relSpeed = Math.sqrt(
                (vA.x - vB.x) * (vA.x - vB.x) + (vA.y - vB.y) * (vA.y - vB.y)
              );
              if (relSpeed > 0.3) {
                AudioManager.getInstance().playGlassClink(Math.min(1.0, relSpeed / 6));
              }
              this.handleDrinkCollision(drinkA, drinkB);
            }
          }
        });
      }
    );
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private handleDrinkCollision(d1: Drink, d2: Drink): void {
    // Both must be active, dropped, not already merging, same level, and below the max tier
    if (!canMerge(d1, d2, DRINKS.length - 1)) {
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

    // Calculate calm inherited velocity
    const v1 = d1.body?.velocity || { x: 0, y: 0 };
    const v2 = d2.body?.velocity || { x: 0, y: 0 };
    const avgVx = (v1.x + v2.x) / 4;
    const avgVy = Math.min(-0.5, (v1.y + v2.y) / 4);

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

  private triggerMergeEffects(x: number, y: number, def: (typeof DRINKS)[0]): void {
    // 1. Particle splash (bring to top so it layers like a freshly added emitter)
    this.splashTint = def.primaryColor;
    this.scene.children.bringToTop(this.splashEmitter);
    this.splashEmitter.explode(14, x, y);

    // 2. Star sparkles
    this.starTints[1] = def.secondaryColor;
    this.scene.children.bringToTop(this.starEmitter);
    this.starEmitter.explode(8, x, y);

    // 3. Shockwave ring expansion (skipped if every pooled ring is in flight)
    const ring = this.ringPool.get(x, y, 'shockwave_ring') as Phaser.GameObjects.Sprite | null;
    if (ring) {
      this.playShockwave(ring, def);
    }

    // 4. Screen shake for larger tiers
    if (def.level >= 5) {
      const intensity = Math.min(0.012, 0.003 + (def.level - 5) * 0.0018);
      this.scene.cameras.main.shake(150, intensity);
    }
  }

  private playShockwave(ring: Phaser.GameObjects.Sprite, def: (typeof DRINKS)[0]): void {
    ring.setActive(true).setVisible(true);
    ring.setTint(def.primaryColor);
    ring.setScale(0.1);
    ring.setAlpha(0.85);
    this.scene.children.bringToTop(ring);

    this.scene.tweens.add({
      targets: ring,
      scaleX: (def.radius * 2) / 50,
      scaleY: (def.radius * 2) / 50,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.ringPool.killAndHide(ring);
      }
    });
  }
}
