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

      // 1. Soft outer drop shadow / ambient glow
      ctx.save();
      ctx.shadowColor = this.hexToRgbString(drink.primaryColor, 0.45);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgbString(drink.primaryColor, 0.9);
      ctx.fill();
      ctx.restore();

      // 2. Liquid body with radial / linear gradient
      const liquidGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      liquidGrad.addColorStop(0, this.hexToRgbString(drink.secondaryColor, 1));
      liquidGrad.addColorStop(0.7, this.hexToRgbString(drink.primaryColor, 1));
      liquidGrad.addColorStop(1, this.hexToRgbString(drink.primaryColor, 0.85));

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
      ctx.fillStyle = liquidGrad;
      ctx.fill();
      ctx.clip();

      // Liquid shine wave / swirl inside
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(cx, cy + radius * 0.3, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Ice cubes for level >= 0
      if (radius > 20) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;

        // Ice cube 1
        const ice1X = cx - radius * 0.35;
        const ice1Y = cy - radius * 0.2;
        const ice1Size = radius * 0.3;
        ctx.strokeRect(ice1X, ice1Y, ice1Size, ice1Size);
        ctx.fillRect(ice1X, ice1Y, ice1Size, ice1Size);

        // Ice cube 2
        if (radius > 35) {
          const ice2X = cx + radius * 0.1;
          const ice2Y = cy + radius * 0.05;
          const ice2Size = radius * 0.26;
          ctx.strokeRect(ice2X, ice2Y, ice2Size, ice2Size);
          ctx.fillRect(ice2X, ice2Y, ice2Size, ice2Size);
        }
      }

      // Soda bubbles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      const bubbleCount = Math.min(8, Math.floor(radius / 10));
      for (let i = 0; i < bubbleCount; i++) {
        const bx = cx + (Math.sin(i * 1.7 + drink.level) * radius * 0.5);
        const by = cy + (Math.cos(i * 2.3 + drink.level) * radius * 0.5);
        const br = 2 + (i % 3);
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw custom garnish / decoration on the drink
      this.drawGarnish(ctx, cx, cy, radius, drink);

      ctx.restore(); // end clip

      // 3. Glass border with glossy reflection
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2.5, radius * 0.06);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.stroke();

      // Top-left glossy highlight arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.78, -Math.PI * 0.8, -Math.PI * 0.3);
      ctx.lineWidth = Math.max(2, radius * 0.07);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Secondary specular dot
      ctx.beginPath();
      ctx.arc(cx - radius * 0.5, cy - radius * 0.5, Math.max(2, radius * 0.08), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();

      ctx.restore();

      // Add to Phaser texture manager
      scene.textures.addCanvas(`drink_${drink.level}`, canvas);
    });
  }

  private static drawGarnish(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    drink: typeof DRINKS[0]
  ): void {
    ctx.save();

    switch (drink.garnish) {
      case 'lime':
      case 'orange': {
        // Citrus wedge in top right corner
        const wx = cx + radius * 0.35;
        const wy = cy - radius * 0.35;
        const wr = radius * 0.4;
        ctx.beginPath();
        ctx.arc(wx, wy, wr, 0, Math.PI * 2);
        ctx.fillStyle = drink.garnish === 'lime' ? '#a7c957' : '#f77f00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner segments
        ctx.fillStyle = drink.garnish === 'lime' ? '#d9ed92' : '#fcbf49';
        ctx.beginPath();
        ctx.arc(wx, wy, wr * 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'berry': {
        // Floating dual berries
        const bx1 = cx + radius * 0.25;
        const by1 = cy - radius * 0.25;
        ctx.beginPath();
        ctx.arc(bx1, by1, radius * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#9b2226';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx1 - radius * 0.2, by1 + radius * 0.1, radius * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#ae2012';
        ctx.fill();
        break;
      }

      case 'pineapple': {
        // Pineapple wedge
        const px = cx + radius * 0.2;
        const py = cy - radius * 0.2;
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + radius * 0.4, py - radius * 0.3);
        ctx.lineTo(px + radius * 0.5, py + radius * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fb8500';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'mint': {
        // Mint leaf pair
        const mx = cx;
        const my = cy - radius * 0.25;
        ctx.fillStyle = '#38b000';
        ctx.beginPath();
        ctx.ellipse(mx - radius * 0.15, my, radius * 0.22, radius * 0.12, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(mx + radius * 0.15, my, radius * 0.22, radius * 0.12, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'umbrella': {
        // Mini cocktail umbrella
        const ux = cx + radius * 0.1;
        const uy = cy - radius * 0.2;
        const ur = radius * 0.45;
        ctx.fillStyle = '#ff006e';
        ctx.beginPath();
        ctx.arc(ux, uy, ur, -Math.PI * 0.9, -Math.PI * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Umbrella stick
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ux, uy);
        ctx.lineTo(ux + radius * 0.2, uy + radius * 0.45);
        ctx.stroke();
        break;
      }

      case 'starfruit': {
        // 5-point star fruit
        const sx = cx + radius * 0.2;
        const sy = cy - radius * 0.2;
        const sr = radius * 0.28;
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
        break;
      }

      case 'flower': {
        // Hibiscus / tropical flower
        const fx = cx + radius * 0.15;
        const fy = cy - radius * 0.15;
        const fr = radius * 0.18;
        ctx.fillStyle = '#ff007f';
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        ctx.arc(fx, fy, fr * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'straw': {
        // Striped neon straw
        ctx.save();
        ctx.strokeStyle = '#ffbe0b';
        ctx.lineWidth = radius * 0.12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.2, cy + radius * 0.4);
        ctx.lineTo(cx + radius * 0.35, cy - radius * 0.55);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'sparkler': {
        // Blazing fireworks/sparkler effect for tier 11
        const spX = cx;
        const spY = cy - radius * 0.3;
        ctx.strokeStyle = '#fffb00';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          ctx.beginPath();
          ctx.moveTo(spX, spY);
          ctx.lineTo(spX + Math.cos(a) * (radius * 0.45), spY + Math.sin(a) * (radius * 0.45));
          ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(spX, spY, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
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
