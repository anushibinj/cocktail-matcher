import Phaser from 'phaser';
import { DRINKS } from '../game/config/drinks';
import { GAME_CONFIG } from '../game/config/gameConfig';

export class AssetGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    this.generateDrinkTextures(scene);
    this.generateParticles(scene);
    this.generateBackground(scene);
    this.generateBoardGraphics(scene);
    this.generateUIElements(scene);
  }

  private static hexToRgbString(hex: number, alpha: number = 1): string {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private static generateDrinkTextures(scene: Phaser.Scene): void {
    DRINKS.forEach((drink) => {
      const radius = drink.radius;
      const size = Math.ceil(radius * 2 + 16);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const cx = size / 2;
      const cy = size / 2;

      // 1. Soft glowing background circular bubble (gives clean physics boundaries and visibility)
      ctx.save();
      ctx.shadowColor = this.hexToRgbString(drink.primaryColor, 0.5);
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgbString(drink.primaryColor, 0.22);
      ctx.fill();

      // Subtle bubble border
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.hexToRgbString(drink.secondaryColor, 0.5);
      ctx.stroke();
      ctx.restore();

      // 2. Draw Side-View Cocktail Glass
      this.drawSideViewCocktail(ctx, cx, cy, radius, drink);

      // 3. Specular highlight on the bubble
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.75, -Math.PI * 0.35);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = Math.max(1.5, radius * 0.05);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // Register canvas texture
      scene.textures.addCanvas(`drink_${drink.level}`, canvas);
    });
  }

  private static drawSideViewCocktail(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    drink: typeof DRINKS[0]
  ): void {
    ctx.save();

    const pColor = this.hexToRgbString(drink.primaryColor, 1);
    const sColor = this.hexToRgbString(drink.secondaryColor, 1);

    switch (drink.level) {
      case 0: // Citrus Splash — Rocks / Tumbler Glass
        this.drawTumblerGlass(ctx, cx, cy, radius, pColor, sColor, 'lime');
        break;

      case 1: // Berry Fizz — Champagne / Spritz Flute
        this.drawFluteGlass(ctx, cx, cy, radius, pColor, sColor, 'berry');
        break;

      case 2: // Pineapple Cooler — Tall Highball Glass
        this.drawHighballGlass(ctx, cx, cy, radius, pColor, sColor, 'pineapple');
        break;

      case 3: // Sunset Cooler — Margarita / Coupe Glass
        this.drawCoupeGlass(ctx, cx, cy, radius, pColor, sColor, 'orange');
        break;

      case 4: // Mint Lime — Mojito Highball
        this.drawMojitoGlass(ctx, cx, cy, radius, pColor, sColor);
        break;

      case 5: // Tropical Punch — Hurricane Glass with Umbrella
        this.drawHurricaneGlass(ctx, cx, cy, radius, pColor, sColor, 'umbrella');
        break;

      case 6: // Island Breeze — Poco Grande with Starfruit
        this.drawPocoGrandeGlass(ctx, cx, cy, radius, pColor, sColor, 'starfruit');
        break;

      case 7: // Blue Lagoon — Triangular Martini Glass
        this.drawMartiniGlass(ctx, cx, cy, radius, pColor, sColor);
        break;

      case 8: // Passion Colada — Coconut Shell Cup
        this.drawCoconutCup(ctx, cx, cy, radius, pColor, sColor);
        break;

      case 9: // Golden Sunset — Layered Tulip Glass
        this.drawTulipSunriseGlass(ctx, cx, cy, radius, pColor, sColor);
        break;

      case 10: // Royal Cocktail — Gold Chalice / Goblet
        this.drawRoyalChalice(ctx, cx, cy, radius, pColor, sColor);
        break;

      case 11: // Ultimate Cocktail — Tiki Totem Mug with Sparkler
        this.drawTikiMug(ctx, cx, cy, radius, pColor, sColor);
        break;
    }

    ctx.restore();
  }

  // --- 0. Rocks / Tumbler Glass ---
  private static drawTumblerGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string,
    _garnish: string
  ): void {
    const gw = radius * 1.1;
    const gh = radius * 1.3;
    const top = cy - gh * 0.45;
    const bot = cy + gh * 0.45;
    const wTop = gw * 0.9;
    const wBot = gw * 0.72;

    // Liquid fill
    const grad = ctx.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.45, top + gh * 0.15);
    ctx.lineTo(cx + wTop * 0.45, top + gh * 0.15);
    ctx.lineTo(cx + wBot * 0.45, bot - gh * 0.1);
    ctx.lineTo(cx - wBot * 0.45, bot - gh * 0.1);
    ctx.closePath();
    ctx.fill();

    // Ice cube
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(cx - radius * 0.25, cy - radius * 0.1, radius * 0.28, radius * 0.28);

    // Glass outline & thick base
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.5, top);
    ctx.lineTo(cx - wBot * 0.5, bot);
    ctx.lineTo(cx + wBot * 0.5, bot);
    ctx.lineTo(cx + wTop * 0.5, top);
    ctx.stroke();

    // Thick glass bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(cx - wBot * 0.45, bot - gh * 0.1, wBot * 0.9, gh * 0.08);

    // Lime wheel garnish on rim
    const lx = cx + wTop * 0.45;
    const ly = top + 2;
    const lr = radius * 0.35;
    ctx.fillStyle = '#a7c957';
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9ed92';
    ctx.beginPath();
    ctx.arc(lx, ly, lr * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- 1. Champagne / Spritz Flute ---
  private static drawFluteGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string,
    _garnish: string
  ): void {
    const gh = radius * 1.5;
    const top = cy - gh * 0.48;
    const botBowl = cy + gh * 0.15;
    const footY = cy + gh * 0.48;
    const bw = radius * 0.7;

    // Liquid fill
    const grad = ctx.createLinearGradient(0, top, 0, botBowl);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.4, top + gh * 0.1);
    ctx.lineTo(cx + bw * 0.4, top + gh * 0.1);
    ctx.quadraticCurveTo(cx + bw * 0.45, botBowl * 0.8, cx, botBowl);
    ctx.quadraticCurveTo(cx - bw * 0.45, botBowl * 0.8, cx - bw * 0.4, top + gh * 0.1);
    ctx.fill();

    // Effervescent bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx + (i % 2 === 0 ? -4 : 4), cy - i * 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glass Bowl Outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.45, top);
    ctx.lineTo(cx - bw * 0.45, top + gh * 0.3);
    ctx.quadraticCurveTo(cx - bw * 0.45, botBowl, cx, botBowl);
    ctx.quadraticCurveTo(cx + bw * 0.45, botBowl, cx + bw * 0.45, top + gh * 0.3);
    ctx.lineTo(cx + bw * 0.45, top);
    ctx.stroke();

    // Stem & Foot
    ctx.beginPath();
    ctx.moveTo(cx, botBowl);
    ctx.lineTo(cx, footY);
    ctx.moveTo(cx - bw * 0.4, footY);
    ctx.lineTo(cx + bw * 0.4, footY);
    ctx.stroke();

    // Berries on rim
    ctx.fillStyle = '#9b2226';
    ctx.beginPath();
    ctx.arc(cx + bw * 0.45, top - 2, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 2. Tall Highball Glass ---
  private static drawHighballGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string,
    _garnish: string
  ): void {
    const gw = radius * 0.95;
    const gh = radius * 1.5;
    const top = cy - gh * 0.48;
    const bot = cy + gh * 0.46;

    // Liquid fill
    const grad = ctx.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - gw * 0.42, top + gh * 0.12, gw * 0.84, gh * 0.78);

    // Ice cubes stacked
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(cx - radius * 0.2, cy - radius * 0.3, radius * 0.35, radius * 0.35);
    ctx.fillRect(cx - radius * 0.15, cy + radius * 0.1, radius * 0.35, radius * 0.35);

    // Straw
    ctx.strokeStyle = '#48cae4';
    ctx.lineWidth = Math.max(3, radius * 0.09);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.15, bot - gh * 0.1);
    ctx.lineTo(cx + gw * 0.45, top - radius * 0.3);
    ctx.stroke();

    // Glass outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.strokeRect(cx - gw * 0.45, top, gw * 0.9, gh * 0.94);

    // Pineapple wedge on rim
    const px = cx - gw * 0.45;
    const py = top;
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - radius * 0.35, py - radius * 0.25);
    ctx.lineTo(px - radius * 0.1, py - radius * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38b000'; // leaf
    ctx.fillRect(px - radius * 0.25, py - radius * 0.6, radius * 0.12, radius * 0.25);
  }

  // --- 3. Margarita / Coupe Glass ---
  private static drawCoupeGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string,
    _garnish: string
  ): void {
    const gh = radius * 1.5;
    const top = cy - gh * 0.45;
    const bowlMid = cy - gh * 0.15;
    const bowlBot = cy + gh * 0.1;
    const footY = cy + gh * 0.46;
    const wTop = radius * 1.35;

    // Liquid fill with sunset gradient
    const grad = ctx.createLinearGradient(0, top, 0, bowlBot);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.45, top + gh * 0.08);
    ctx.lineTo(cx + wTop * 0.45, top + gh * 0.08);
    ctx.quadraticCurveTo(cx + wTop * 0.3, bowlMid, cx + wTop * 0.2, bowlMid);
    ctx.quadraticCurveTo(cx + wTop * 0.1, bowlBot, cx, bowlBot);
    ctx.quadraticCurveTo(cx - wTop * 0.1, bowlBot, cx - wTop * 0.2, bowlMid);
    ctx.quadraticCurveTo(cx - wTop * 0.3, bowlMid, cx - wTop * 0.45, top + gh * 0.08);
    ctx.fill();

    // Glass outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.5, top);
    ctx.lineTo(cx + wTop * 0.5, top);
    ctx.quadraticCurveTo(cx + wTop * 0.35, bowlMid, cx + wTop * 0.2, bowlMid);
    ctx.quadraticCurveTo(cx + wTop * 0.15, bowlBot, cx, bowlBot);
    ctx.lineTo(cx, footY);
    ctx.moveTo(cx - wTop * 0.35, footY);
    ctx.lineTo(cx + wTop * 0.35, footY);
    ctx.stroke();

    // Orange wheel on rim
    const ox = cx + wTop * 0.48;
    const oy = top;
    const or = radius * 0.35;
    ctx.fillStyle = '#f77f00';
    ctx.beginPath();
    ctx.arc(ox, oy, or, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fcbf49';
    ctx.beginPath();
    ctx.arc(ox, oy, or * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 4. Mint Mojito Highball ---
  private static drawMojitoGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string
  ): void {
    const gw = radius * 1.0;
    const gh = radius * 1.5;
    const top = cy - gh * 0.48;
    const bot = cy + gh * 0.46;

    // Liquid fill
    const grad = ctx.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - gw * 0.42, top + gh * 0.1, gw * 0.84, gh * 0.8);

    // Mint leaves floating
    ctx.fillStyle = '#38b000';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.15, cy - radius * 0.2, radius * 0.22, radius * 0.1, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + radius * 0.1, cy + radius * 0.15, radius * 0.22, radius * 0.1, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Lime half-wheel inside
    ctx.fillStyle = '#a7c957';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.1, cy + radius * 0.25, radius * 0.2, 0, Math.PI);
    ctx.fill();

    // Green striped straw
    ctx.strokeStyle = '#70e000';
    ctx.lineWidth = Math.max(3, radius * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.1, bot - gh * 0.1);
    ctx.lineTo(cx + gw * 0.45, top - radius * 0.35);
    ctx.stroke();

    // Glass outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.strokeRect(cx - gw * 0.45, top, gw * 0.9, gh * 0.94);
  }

  // --- 5. Tropical Punch Hurricane Glass ---
  private static drawHurricaneGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string,
    _garnish: string
  ): void {
    const gh = radius * 1.55;
    const top = cy - gh * 0.48;
    const waistY = cy - gh * 0.1;
    const bellyY = cy + gh * 0.2;
    const footY = cy + gh * 0.48;
    const wTop = radius * 0.9;
    const wWaist = radius * 0.65;
    const wBelly = radius * 1.05;

    // Liquid fill
    const grad = ctx.createLinearGradient(0, top, 0, footY);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.45, top + gh * 0.1);
    ctx.lineTo(cx + wTop * 0.45, top + gh * 0.1);
    ctx.quadraticCurveTo(cx + wWaist * 0.5, waistY, cx + wBelly * 0.48, bellyY);
    ctx.quadraticCurveTo(cx + wBelly * 0.4, footY - gh * 0.1, cx, footY - gh * 0.08);
    ctx.quadraticCurveTo(cx - wBelly * 0.4, footY - gh * 0.1, cx - wBelly * 0.48, bellyY);
    ctx.quadraticCurveTo(cx - wWaist * 0.5, waistY, cx - wTop * 0.45, top + gh * 0.1);
    ctx.fill();

    // Glass outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.5, top);
    ctx.quadraticCurveTo(cx - wWaist * 0.55, waistY, cx - wBelly * 0.5, bellyY);
    ctx.quadraticCurveTo(cx - wBelly * 0.4, footY - gh * 0.1, cx, footY - gh * 0.08);
    ctx.lineTo(cx, footY);
    ctx.moveTo(cx - wTop * 0.35, footY);
    ctx.lineTo(cx + wTop * 0.35, footY);
    ctx.moveTo(cx, footY - gh * 0.08);
    ctx.quadraticCurveTo(cx + wBelly * 0.4, footY - gh * 0.1, cx + wBelly * 0.5, bellyY);
    ctx.quadraticCurveTo(cx + wWaist * 0.55, waistY, cx + wTop * 0.5, top);
    ctx.stroke();

    // Cocktail Umbrella on rim
    const ux = cx + wTop * 0.35;
    const uy = top - radius * 0.25;
    const ur = radius * 0.45;
    ctx.fillStyle = '#ff006e';
    ctx.beginPath();
    ctx.arc(ux, uy, ur, -Math.PI * 0.9, -Math.PI * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red cherry with green stem
    ctx.fillStyle = '#d90429';
    ctx.beginPath();
    ctx.arc(cx - wTop * 0.3, top - 2, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 6. Island Breeze Poco Grande Glass ---
  private static drawPocoGrandeGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string,
    _garnish: string
  ): void {
    const gh = radius * 1.55;
    const top = cy - gh * 0.48;
    const waistY = cy - gh * 0.08;
    const bellyY = cy + gh * 0.22;
    const footY = cy + gh * 0.48;
    const wTop = radius * 0.95;
    const wWaist = radius * 0.7;
    const wBelly = radius * 1.1;

    // Liquid fill
    const grad = ctx.createLinearGradient(0, top, 0, footY);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.45, top + gh * 0.1);
    ctx.lineTo(cx + wTop * 0.45, top + gh * 0.1);
    ctx.quadraticCurveTo(cx + wWaist * 0.5, waistY, cx + wBelly * 0.48, bellyY);
    ctx.quadraticCurveTo(cx + wBelly * 0.35, footY - gh * 0.1, cx, footY - gh * 0.08);
    ctx.quadraticCurveTo(cx - wBelly * 0.35, footY - gh * 0.1, cx - wBelly * 0.48, bellyY);
    ctx.quadraticCurveTo(cx - wWaist * 0.5, waistY, cx - wTop * 0.45, top + gh * 0.1);
    ctx.fill();

    // Glass outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.5, top);
    ctx.quadraticCurveTo(cx - wWaist * 0.55, waistY, cx - wBelly * 0.5, bellyY);
    ctx.quadraticCurveTo(cx - wBelly * 0.35, footY - gh * 0.1, cx, footY - gh * 0.08);
    ctx.lineTo(cx, footY);
    ctx.moveTo(cx - wTop * 0.38, footY);
    ctx.lineTo(cx + wTop * 0.38, footY);
    ctx.moveTo(cx, footY - gh * 0.08);
    ctx.quadraticCurveTo(cx + wBelly * 0.35, footY - gh * 0.1, cx + wBelly * 0.5, bellyY);
    ctx.quadraticCurveTo(cx + wWaist * 0.55, waistY, cx + wTop * 0.5, top);
    ctx.stroke();

    // Starfruit slice on rim
    const sx = cx + wTop * 0.48;
    const sy = top;
    const sr = radius * 0.3;
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#06d6a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const r1 = sr;
      const r2 = sr * 0.45;
      const x1 = sx + Math.cos(a) * r1;
      const y1 = sy + Math.sin(a) * r1;
      const a2 = a + Math.PI / 5;
      const x2 = sx + Math.cos(a2) * r2;
      const y2 = sy + Math.sin(a2) * r2;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- 7. Triangular Martini Glass (Blue Lagoon) ---
  private static drawMartiniGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string
  ): void {
    const gh = radius * 1.55;
    const top = cy - gh * 0.45;
    const apexY = cy + gh * 0.08;
    const footY = cy + gh * 0.46;
    const wTop = radius * 1.4;

    // Liquid fill
    const grad = ctx.createLinearGradient(0, top, 0, apexY);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.42, top + gh * 0.08);
    ctx.lineTo(cx + wTop * 0.42, top + gh * 0.08);
    ctx.lineTo(cx, apexY);
    ctx.closePath();
    ctx.fill();

    // Neon Glow outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.5, top);
    ctx.lineTo(cx, apexY);
    ctx.lineTo(cx + wTop * 0.5, top);
    ctx.moveTo(cx, apexY);
    ctx.lineTo(cx, footY);
    ctx.moveTo(cx - wTop * 0.38, footY);
    ctx.lineTo(cx + wTop * 0.38, footY);
    ctx.stroke();

    // Spiral lime peel twist
    ctx.strokeStyle = '#a7c957';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx - wTop * 0.48, top + 4, radius * 0.18, 0, Math.PI * 1.5);
    ctx.stroke();
  }

  // --- 8. Coconut Shell Cup (Passion Colada) ---
  private static drawCoconutCup(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string
  ): void {
    const cr = radius * 0.85;
    const top = cy - cr * 0.2;

    // Coconut Outer Shell
    ctx.fillStyle = '#4a2810';
    ctx.beginPath();
    ctx.arc(cx, cy + cr * 0.1, cr, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6f3d1b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Creamy colada liquid inside
    const grad = ctx.createLinearGradient(0, top, 0, cy + cr);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, top + 4, cr * 0.88, cr * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Straw
    ctx.strokeStyle = '#e9c46a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + radius * 0.2, cy + cr * 0.4);
    ctx.lineTo(cx + radius * 0.6, top - radius * 0.45);
    ctx.stroke();

    // Tropical Pink Hibiscus Flower
    const fx = cx - cr * 0.45;
    const fy = top - radius * 0.1;
    const fr = radius * 0.22;
    ctx.fillStyle = '#ff007f';
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 9. Layered Tequila Sunrise Tulip Glass ---
  private static drawTulipSunriseGlass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    _pColor: string,
    _sColor: string
  ): void {
    const gh = radius * 1.55;
    const top = cy - gh * 0.46;
    const bellyY = cy + gh * 0.05;
    const apexY = cy + gh * 0.2;
    const footY = cy + gh * 0.48;
    const wTop = radius * 0.95;
    const wBelly = radius * 1.15;

    // 3-Tone Tequila Sunrise Layered Liquid (Yellow -> Orange -> Red Grenadine)
    const grad = ctx.createLinearGradient(0, top, 0, apexY);
    grad.addColorStop(0, '#ffea00');    // Yellow top
    grad.addColorStop(0.5, '#ff7b00');  // Orange middle
    grad.addColorStop(1, '#9d0208');    // Crimson red grenadine base
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.45, top + gh * 0.08);
    ctx.lineTo(cx + wTop * 0.45, top + gh * 0.08);
    ctx.quadraticCurveTo(cx + wBelly * 0.5, bellyY, cx, apexY);
    ctx.quadraticCurveTo(cx - wBelly * 0.5, bellyY, cx - wTop * 0.45, top + gh * 0.08);
    ctx.fill();

    // Glass outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.5, top);
    ctx.quadraticCurveTo(cx - wBelly * 0.55, bellyY, cx, apexY);
    ctx.lineTo(cx, footY);
    ctx.moveTo(cx - wTop * 0.38, footY);
    ctx.lineTo(cx + wTop * 0.38, footY);
    ctx.moveTo(cx, apexY);
    ctx.quadraticCurveTo(cx + wBelly * 0.55, bellyY, cx + wTop * 0.5, top);
    ctx.stroke();

    // Orange slice & cherry
    ctx.fillStyle = '#ff7b00';
    ctx.beginPath();
    ctx.arc(cx + wTop * 0.48, top, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 10. Royal Gold Chalice / Goblet ---
  private static drawRoyalChalice(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pColor: string,
    sColor: string
  ): void {
    const gh = radius * 1.55;
    const top = cy - gh * 0.45;
    const bowlBot = cy + gh * 0.12;
    const footY = cy + gh * 0.46;
    const bw = radius * 1.25;

    // Royal Purple Velvet Liquid
    const grad = ctx.createLinearGradient(0, top, 0, bowlBot);
    grad.addColorStop(0, sColor);
    grad.addColorStop(1, pColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy - gh * 0.15, bw * 0.48, 0, Math.PI);
    ctx.fill();

    // Gold Sparkles in liquid
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx - radius * 0.2 + i * radius * 0.2, cy - gh * 0.05, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gold Chalice Filigree Outline & Stem
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = Math.max(3, radius * 0.09);
    ctx.beginPath();
    // Chalice bowl outline
    ctx.arc(cx, cy - gh * 0.15, bw * 0.5, 0, Math.PI);
    // Stem
    ctx.moveTo(cx, bowlBot);
    ctx.lineTo(cx, footY);
    // Ornate base
    ctx.moveTo(cx - bw * 0.4, footY);
    ctx.lineTo(cx + bw * 0.4, footY);
    // Rim
    ctx.moveTo(cx - bw * 0.52, top + gh * 0.08);
    ctx.lineTo(cx + bw * 0.52, top + gh * 0.08);
    ctx.stroke();

    // Gem in stem center
    ctx.fillStyle = '#ff006e';
    ctx.beginPath();
    ctx.arc(cx, (bowlBot + footY) / 2, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 11. Ultimate Tiki Masterpiece Mug ---
  private static drawTikiMug(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    _pColor: string,
    _sColor: string
  ): void {
    const mw = radius * 1.25;
    const mh = radius * 1.45;
    const top = cy - mh * 0.45;

    // Ceramic Tiki Mug Body (Wood/Earthen brown)
    ctx.fillStyle = '#5c3d2e';
    ctx.beginPath();
    this.roundRect(ctx, cx - mw * 0.45, top + mh * 0.1, mw * 0.9, mh * 0.85, 16);
    ctx.fill();
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Carved Tiki Face Features
    // Eyes
    ctx.fillStyle = '#ffbe0b';
    ctx.fillRect(cx - mw * 0.35, cy - radius * 0.15, mw * 0.25, radius * 0.2);
    ctx.fillRect(cx + mw * 0.1, cy - radius * 0.15, mw * 0.25, radius * 0.2);
    ctx.fillStyle = '#111111';
    ctx.fillRect(cx - mw * 0.25, cy - radius * 0.1, mw * 0.1, radius * 0.1);
    ctx.fillRect(cx + mw * 0.15, cy - radius * 0.1, mw * 0.1, radius * 0.1);

    // Tiki Grimace Mouth with Teeth
    ctx.fillStyle = '#221105';
    ctx.fillRect(cx - mw * 0.32, cy + radius * 0.15, mw * 0.64, radius * 0.25);
    ctx.fillStyle = '#ffffff';
    for (let t = 0; t < 4; t++) {
      ctx.fillRect(cx - mw * 0.28 + t * (mw * 0.15), cy + radius * 0.16, mw * 0.1, radius * 0.1);
      ctx.fillRect(cx - mw * 0.28 + t * (mw * 0.15), cy + radius * 0.28, mw * 0.1, radius * 0.1);
    }

    // Rainbow Volcano Overflow at Top
    const rainGrad = ctx.createLinearGradient(cx - mw * 0.4, 0, cx + mw * 0.4, 0);
    rainGrad.addColorStop(0, '#ff0054');
    rainGrad.addColorStop(0.5, '#ffbe0b');
    rainGrad.addColorStop(1, '#06d6a0');
    ctx.fillStyle = rainGrad;
    ctx.beginPath();
    ctx.ellipse(cx, top + mh * 0.1, mw * 0.44, radius * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blazing Sparklers / Torch fireworks
    const spX = cx + radius * 0.25;
    const spY = top - radius * 0.25;
    ctx.strokeStyle = '#fffb00';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(spX, spY);
      ctx.lineTo(spX + Math.cos(a) * (radius * 0.4), spY + Math.sin(a) * (radius * 0.4));
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(spX, spY, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  private static generateParticles(scene: Phaser.Scene): void {
    // 1. Particle circle (glow dot)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d')!;
    const pGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 32, 32);
    scene.textures.addCanvas('particle_circle', pCanvas);

    // 2. Star sparkle
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 32;
    sCanvas.height = 32;
    const sCtx = sCanvas.getContext('2d')!;
    sCtx.fillStyle = '#ffffff';
    sCtx.beginPath();
    sCtx.moveTo(16, 0);
    sCtx.quadraticCurveTo(16, 16, 32, 16);
    sCtx.quadraticCurveTo(16, 16, 16, 32);
    sCtx.quadraticCurveTo(16, 16, 0, 16);
    sCtx.quadraticCurveTo(16, 16, 16, 0);
    sCtx.fill();
    scene.textures.addCanvas('particle_star', sCanvas);

    // 3. Shockwave ring
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 128;
    ringCanvas.height = 128;
    const rCtx = ringCanvas.getContext('2d')!;
    rCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    rCtx.lineWidth = 6;
    rCtx.beginPath();
    rCtx.arc(64, 64, 58, 0, Math.PI * 2);
    rCtx.stroke();
    scene.textures.addCanvas('shockwave_ring', ringCanvas);
  }

  private static generateBackground(scene: Phaser.Scene): void {
    const width = GAME_CONFIG.WIDTH;
    const height = GAME_CONFIG.HEIGHT;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Sunset / Tropical sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#1d1135');     // Deep twilight indigo
    skyGrad.addColorStop(0.25, '#3b185f');  // Magenta violet
    skyGrad.addColorStop(0.55, '#a12568');  // Tropical ruby
    skyGrad.addColorStop(0.75, '#fec260');  // Warm sunset amber
    skyGrad.addColorStop(0.88, '#1e5f74');  // Turquoise ocean horizon
    skyGrad.addColorStop(1, '#1d2a44');     // Deep sea base
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Distant sunset sun glow
    const sunGrad = ctx.createRadialGradient(width / 2, height * 0.45, 20, width / 2, height * 0.45, 260);
    sunGrad.addColorStop(0, 'rgba(255, 240, 180, 0.4)');
    sunGrad.addColorStop(0.5, 'rgba(255, 120, 80, 0.15)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle palm tree silhouettes in corners
    ctx.fillStyle = 'rgba(15, 10, 30, 0.45)';
    this.drawPalmSilhouette(ctx, 30, 140, 110, 1);
    this.drawPalmSilhouette(ctx, width - 30, 120, 100, -1);

    scene.textures.addCanvas('bg_tropical', canvas);
  }

  private static drawPalmSilhouette(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    dir: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);

    // Trunk
    ctx.beginPath();
    ctx.moveTo(-10, size);
    ctx.quadraticCurveTo(15, size * 0.4, 0, 0);
    ctx.lineTo(8, 0);
    ctx.quadraticCurveTo(22, size * 0.4, 6, size);
    ctx.closePath();
    ctx.fill();

    // Palm fronds
    for (let i = 0; i < 5; i++) {
      const angle = (i * 0.3) - 0.6;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.6, -size * 0.3, size * 0.8, -size * 0.1);
      ctx.quadraticCurveTo(size * 0.5, 0, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private static generateBoardGraphics(scene: Phaser.Scene): void {
    // 1. Danger dashed line
    const dCanvas = document.createElement('canvas');
    dCanvas.width = GAME_CONFIG.BOARD.WIDTH;
    dCanvas.height = 16;
    const dCtx = dCanvas.getContext('2d')!;
    dCtx.strokeStyle = '#ff4444';
    dCtx.lineWidth = 4;
    dCtx.setLineDash([12, 8]);
    dCtx.beginPath();
    dCtx.moveTo(0, 8);
    dCtx.lineTo(GAME_CONFIG.BOARD.WIDTH, 8);
    dCtx.stroke();
    scene.textures.addCanvas('danger_line', dCanvas);

    // 2. Drop guidance line
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 8;
    gCanvas.height = GAME_CONFIG.BOARD.HEIGHT;
    const gCtx = gCanvas.getContext('2d')!;
    gCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    gCtx.lineWidth = 2.5;
    gCtx.setLineDash([8, 8]);
    gCtx.beginPath();
    gCtx.moveTo(4, 0);
    gCtx.lineTo(4, GAME_CONFIG.BOARD.HEIGHT);
    gCtx.stroke();
    scene.textures.addCanvas('drop_guidance_line', gCanvas);
  }

  private static generateUIElements(scene: Phaser.Scene): void {
    // 1. Rounded Card Panel
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 180;
    cardCanvas.height = 80;
    const cCtx = cardCanvas.getContext('2d')!;
    cCtx.fillStyle = 'rgba(20, 16, 45, 0.75)';
    cCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    cCtx.lineWidth = 2;
    this.roundRect(cCtx, 2, 2, 176, 76, 16);
    cCtx.fill();
    cCtx.stroke();
    scene.textures.addCanvas('ui_card_bg', cardCanvas);

    // 2. Button Background (Pill shape)
    const btnCanvas = document.createElement('canvas');
    btnCanvas.width = 240;
    btnCanvas.height = 70;
    const bCtx = btnCanvas.getContext('2d')!;
    const btnGrad = bCtx.createLinearGradient(0, 0, 0, 70);
    btnGrad.addColorStop(0, '#ff7b00');
    btnGrad.addColorStop(1, '#ff0054');
    bCtx.fillStyle = btnGrad;
    bCtx.shadowColor = 'rgba(255, 0, 84, 0.5)';
    bCtx.shadowBlur = 12;
    bCtx.shadowOffsetY = 4;
    this.roundRect(bCtx, 4, 4, 232, 62, 31);
    bCtx.fill();
    bCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    bCtx.lineWidth = 2;
    bCtx.stroke();
    scene.textures.addCanvas('ui_btn_primary', btnCanvas);

    // 3. Small circular action button background
    const circleBtn = document.createElement('canvas');
    circleBtn.width = 60;
    circleBtn.height = 60;
    const cbCtx = circleBtn.getContext('2d')!;
    cbCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    cbCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    cbCtx.lineWidth = 2;
    cbCtx.beginPath();
    cbCtx.arc(30, 30, 26, 0, Math.PI * 2);
    cbCtx.fill();
    cbCtx.stroke();
    scene.textures.addCanvas('ui_btn_circle', circleBtn);
  }

  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
