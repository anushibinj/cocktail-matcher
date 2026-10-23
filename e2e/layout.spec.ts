import { test, expect } from './support/game';

// TEST002 case 8 and BUG005: the canvas is centered when letterboxed and
// fills phone viewports without scrollbars. GAME_CONFIG.HEIGHT is computed at
// load, so each viewport gets a fresh load.

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const r = window.__COCKTAIL__!.game.canvas.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    return {
      left: r.left,
      right: vw - r.right,
      top: r.top,
      bottom: vh - r.bottom,
      scrolls:
        document.documentElement.scrollWidth > window.innerWidth ||
        document.documentElement.scrollHeight > window.innerHeight
    };
  });
}

for (const [width, height] of [
  [768, 1024],
  [1024, 1366],
  [1440, 900],
  [844, 390]
]) {
  test(`letterboxed ${width}x${height}: centered within 1 px`, async ({ page, game }) => {
    await page.setViewportSize({ width, height });
    await game.open();
    const m = await measure(page);
    expect(Math.abs(m.left - m.right), JSON.stringify(m)).toBeLessThanOrEqual(1);
    expect(Math.abs(m.top - m.bottom), JSON.stringify(m)).toBeLessThanOrEqual(1);
    expect(m.scrolls).toBe(false);
  });
}

for (const [width, height] of [
  [390, 844],
  [360, 640]
]) {
  test(`phone ${width}x${height}: fills the viewport with no scrollbars`, async ({
    page,
    game
  }) => {
    await page.setViewportSize({ width, height });
    await game.open();
    const m = await measure(page);
    for (const gap of [m.left, m.right, m.top, m.bottom]) {
      expect(Math.abs(gap), JSON.stringify(m)).toBeLessThanOrEqual(1);
    }
    expect(m.scrolls).toBe(false);
  });
}
