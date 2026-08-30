import Phaser from 'phaser';
import { Drink } from '../entities/Drink';
import { ScoreManager } from './ScoreManager';
import { AudioManager } from './AudioManager';
import { getDrinkByLevel } from '../config/drinks';

export interface ToGoOrder {
  id: string;
  targetLevel: number;
  rewardScore: number;
  orderNumber: number;
  isCompleted: boolean;
}

export class OrderManager {
  private scene: Phaser.Scene;
  private scoreManager: ScoreManager;
  private activeOrders: ToGoOrder[] = [];
  private orderCounter: number = 101;
  private container: Phaser.GameObjects.Container;
  private ticketViews: Map<string, Phaser.GameObjects.Container> = new Map();
  private onOrderFulfilled?: (order: ToGoOrder, drink: Drink) => void;
  private isCheckingOut: boolean = false;

  constructor(
    scene: Phaser.Scene,
    scoreManager: ScoreManager,
    onOrderFulfilled?: (order: ToGoOrder, drink: Drink) => void
  ) {
    this.scene = scene;
    this.scoreManager = scoreManager;
    this.onOrderFulfilled = onOrderFulfilled;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(20);
  }

  public init(): void {
    this.container.removeAll(true);
    this.ticketViews.clear();
    this.activeOrders = [];
    this.orderCounter = 101;
    this.isCheckingOut = false;

    // Start with 2 random to-go orders
    this.spawnNewOrder(0);
    this.spawnNewOrder(1);
  }

  private getRandomOrderLevel(): number {
    // Generate orders for tiers 2 through 7 (Pineapple Cooler to Blue Lagoon)
    const minLevel = 2;
    const maxLevel = 6;
    return Phaser.Math.Between(minLevel, maxLevel);
  }

  public spawnNewOrder(slotIndex: number): void {
    const level = this.getRandomOrderLevel();
    const def = getDrinkByLevel(level);
    const rewardScore = def.baseScore * 2 + 100;

    const order: ToGoOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      targetLevel: level,
      rewardScore,
      orderNumber: this.orderCounter++,
      isCompleted: false
    };

    this.activeOrders[slotIndex] = order;
    this.renderOrderTicket(order, slotIndex);
  }

  private renderOrderTicket(order: ToGoOrder, slotIndex: number): void {
    // Slots at X: 270 (Left ticket) and 450 (Right ticket), Y: 135
    const slotX = slotIndex === 0 ? 280 : 440;
    const slotY = 135;

    const ticketGroup = this.scene.add.container(slotX, slotY);

    // 1. Hanging String / Line
    const stringLine = this.scene.add.line(0, -65, 0, 0, 0, 16, 0x8d6e63);
    stringLine.setLineWidth(2);

    // 2. Wooden Clothespin
    const pin = this.scene.add.rectangle(0, -50, 12, 20, 0xc19a6b);
    pin.setStrokeStyle(1.5, 0x5d4037);

    // 3. Parchment Paper Receipt Card (White receipt with slight shadow)
    const paperBg = this.scene.add.graphics();
    paperBg.fillStyle(0xffffff, 0.96);
    paperBg.fillRoundedRect(-68, -42, 136, 100, 8);
    paperBg.lineStyle(1.5, 0xd0c4b2, 0.9);
    paperBg.strokeRoundedRect(-68, -42, 136, 100, 8);

    // Header "To-Go Order"
    const headerText = this.scene.add.text(0, -32, 'To-Go Order', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#c9184a'
    }).setOrigin(0.5);

    // Order number
    const subText = this.scene.add.text(0, -18, `Order #${order.orderNumber}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '10px',
      color: '#888888'
    }).setOrigin(0.5);

    // Target Drink Thumbnail
    const def = getDrinkByLevel(order.targetLevel);
    const thumb = this.scene.add.sprite(0, 10, `drink_${def.level}`);
    thumb.setDisplaySize(38, 38);

    // Reward Badge
    const rewardBg = this.scene.add.graphics();
    rewardBg.fillStyle(0xfff3b0, 0.95);
    rewardBg.fillRoundedRect(-52, 34, 104, 18, 9);
    rewardBg.lineStyle(1, 0xe0a96d, 0.8);
    rewardBg.strokeRoundedRect(-52, 34, 104, 18, 9);

    const rewardText = this.scene.add.text(0, 43, `🪙 +${order.rewardScore}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#b06b00'
    }).setOrigin(0.5);

    ticketGroup.add([
      stringLine,
      pin,
      paperBg,
      headerText,
      subText,
      thumb,
      rewardBg,
      rewardText
    ]);

    // Slide-down animation when ticket appears
    ticketGroup.setY(slotY - 40);
    ticketGroup.setAlpha(0);
    this.scene.tweens.add({
      targets: ticketGroup,
      y: slotY,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    this.container.add(ticketGroup);
    this.ticketViews.set(order.id, ticketGroup);
  }

  // Check if any active drink on the table satisfies an order
  public checkForMatchingOrders(droppedDrinks: Drink[]): boolean {
    if (this.isCheckingOut) return false;

    for (let slotIndex = 0; slotIndex < this.activeOrders.length; slotIndex++) {
      const order = this.activeOrders[slotIndex];
      if (!order || order.isCompleted) continue;

      // Look for a matching settled drink on the table
      const matchingDrink = droppedDrinks.find(
        (d) =>
          d.active &&
          !d.isMerging &&
          d.isDropped &&
          d.level === order.targetLevel &&
          d.y < 800 // Must have travelled onto the table
      );

      if (matchingDrink) {
        this.fulfillOrder(order, slotIndex, matchingDrink);
        return true;
      }
    }
    return false;
  }

  private fulfillOrder(order: ToGoOrder, slotIndex: number, drink: Drink): void {
    this.isCheckingOut = true;
    order.isCompleted = true;

    const ticketView = this.ticketViews.get(order.id);
    const targetX = slotIndex === 0 ? 280 : 440;
    const targetY = 145;

    // 1. Show Green Checkmark on Ticket
    if (ticketView) {
      const checkmark = this.scene.add.text(0, 10, '✔', {
        fontSize: '44px',
        color: '#10b981',
        stroke: '#ffffff',
        strokeThickness: 5
      }).setOrigin(0.5);
      ticketView.add(checkmark);

      this.scene.tweens.add({
        targets: checkmark,
        scaleX: { from: 0.5, to: 1.2 },
        scaleY: { from: 0.5, to: 1.2 },
        duration: 250,
        yoyo: true
      });
    }

    // 2. Remove drink from Matter physics world immediately
    if (drink.body) {
      this.scene.matter.world.remove(drink.body);
    }
    drink.isMerging = true;

    // Notify GameScene to remove drink from array
    if (this.onOrderFulfilled) {
      this.onOrderFulfilled(order, drink);
    }

    // 3. Animate Drink flying to the checkout ticket
    this.scene.tweens.add({
      targets: drink,
      x: targetX,
      y: targetY,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 500,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // Star sparkle burst at checkout
        this.triggerCheckoutSparkles(targetX, targetY);

        // Award score & cash register audio
        this.scoreManager.addScore(order.rewardScore, targetX, targetY);
        AudioManager.getInstance().playOrderComplete();

        // Destroy drink
        drink.destroy();

        // Slide away ticket and spawn new order after brief delay
        if (ticketView) {
          this.scene.tweens.add({
            targets: ticketView,
            y: -100,
            alpha: 0,
            duration: 350,
            ease: 'Quad.easeIn',
            onComplete: () => {
              ticketView.destroy();
              this.ticketViews.delete(order.id);
              this.spawnNewOrder(slotIndex);
              this.isCheckingOut = false;
            }
          });
        } else {
          this.spawnNewOrder(slotIndex);
          this.isCheckingOut = false;
        }
      }
    });
  }

  private triggerCheckoutSparkles(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle_star', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      tint: [0xffd700, 0x10b981, 0xffffff],
      lifespan: { min: 400, max: 650 },
      quantity: 16,
      emitting: false
    });
    emitter.explode(16, x, y);

    this.scene.time.delayedCall(700, () => {
      emitter.destroy();
    });
  }

  public reset(): void {
    this.init();
  }
}
