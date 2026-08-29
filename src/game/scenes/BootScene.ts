import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0xff6b6b, 1);
    graphics.fillCircle(32, 32, 32);
    graphics.generateTexture('drink-placeholder', 64, 64);
    graphics.destroy();
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
