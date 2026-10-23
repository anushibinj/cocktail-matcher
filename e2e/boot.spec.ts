import { test, expect } from './support/game';

test.describe('boot', () => {
  test('reaches the menu with no console errors and no optional-asset requests', async ({
    page,
    game
  }) => {
    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));

    await game.open();

    expect(await game.activeScenes()).toEqual(['MenuScene']);
    // Give late loads (BGM element, custom-art probes) a moment to show up
    await game.waitFrames(30);
    expect(requests.filter((u) => /drinks\/drink_\d+\.png|clink\.mp3/.test(u))).toEqual([]);
    // pageProblems (auto fixture) asserts zero console errors and no 4xx
  });

  test('production without ?debug never loads the debug hook', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') scripts.push(req.url());
    });
    await page.goto('./');
    await expect.poll(() => page.evaluate(() => !!document.querySelector('canvas'))).toBe(true);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => typeof window.__COCKTAIL__)).toBe('undefined');
    expect(scripts.filter((u) => /debug/i.test(u))).toEqual([]);
  });
});

test('boots with the renderer this project expects', async ({ game }, testInfo) => {
  await game.open();
  const type = await game.page.evaluate(() => window.__COCKTAIL__!.game.renderer.type);
  // Phaser.CANVAS = 1, Phaser.WEBGL = 2
  expect(type).toBe(testInfo.project.name.startsWith('webgl') ? 2 : 1);
});
