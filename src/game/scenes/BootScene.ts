import Phaser from 'phaser';
import { DRINKS } from '../data/drinks';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.generateDrinkTextures();
    this.generateUiTextures();
    this.generateParticleTexture();
    this.scene.start('MenuScene');
  }

  private generateDrinkTextures(): void {
    for (const drink of DRINKS) {
      const size = drink.radius * 2 + 16;
      const graphics = this.make.graphics({ x: 0, y: 0 });
      const center = size / 2;

      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillEllipse(center, size - 8, size * 0.72, size * 0.28);

      graphics.fillStyle(drink.color, 1);
      graphics.fillRoundedRect(center - drink.radius * 0.7, center - drink.radius, drink.radius * 1.4, drink.radius * 1.8, 10);

      graphics.fillStyle(0xffffff, 0.25);
      graphics.fillEllipse(center - drink.radius * 0.25, center - drink.radius * 0.45, drink.radius * 0.45, drink.radius * 0.22);

      graphics.fillStyle(drink.garnishColor, 1);
      graphics.fillCircle(center + drink.radius * 0.35, center - drink.radius * 0.75, Math.max(4, drink.radius * 0.18));

      if (drink.level >= 4) {
        graphics.lineStyle(2, 0xffffff, 0.5);
        graphics.strokeRoundedRect(center - drink.radius * 0.7, center - drink.radius, drink.radius * 1.4, drink.radius * 1.8, 10);
      }

      if (drink.level >= 8) {
        graphics.fillStyle(0xffd700, 0.8);
        graphics.fillCircle(center, center - drink.radius * 1.1, 6);
      }

      graphics.generateTexture(drink.textureKey, size, size);
      graphics.destroy();
    }
  }

  private generateUiTextures(): void {
    const button = this.make.graphics({ x: 0, y: 0 });
    button.fillStyle(0xff6b6b, 1);
    button.fillRoundedRect(0, 0, 220, 56, 16);
    button.lineStyle(3, 0xffffff, 0.35);
    button.strokeRoundedRect(0, 0, 220, 56, 16);
    button.generateTexture('btn-primary', 220, 56);
    button.destroy();

    const panel = this.make.graphics({ x: 0, y: 0 });
    panel.fillStyle(0x0d3d52, 0.92);
    panel.fillRoundedRect(0, 0, 320, 420, 20);
    panel.lineStyle(2, 0xffffff, 0.2);
    panel.strokeRoundedRect(0, 0, 320, 420, 20);
    panel.generateTexture('panel', 320, 420);
    panel.destroy();

    const previewBg = this.make.graphics({ x: 0, y: 0 });
    previewBg.fillStyle(0xffffff, 0.15);
    previewBg.fillCircle(32, 32, 30);
    previewBg.lineStyle(2, 0xffffff, 0.35);
    previewBg.strokeCircle(32, 32, 30);
    previewBg.generateTexture('preview-bg', 64, 64);
    previewBg.destroy();
  }

  private generateParticleTexture(): void {
    const particle = this.make.graphics({ x: 0, y: 0 });
    particle.fillStyle(0xffffff, 1);
    particle.fillCircle(4, 4, 4);
    particle.generateTexture('particle', 8, 8);
    particle.destroy();
  }
}
