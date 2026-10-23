import { test, expect, poll } from './support/game';

// TEST002 case 6 and BUG004: Restart gives a clean game.

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.setSeed(1234);
  await game.startGame();
});

test('restart resets the score to 0, clears the board and leaves two tickets', async ({ game }) => {
  await game.launchAt(300);
  await game.page.evaluate(() => window.__COCKTAIL__!.setScore(250));
  expect(await game.score()).toBe(250);

  await game.pauseViaHud();
  const launches = await game.launches();
  await game.tap(game.ui.pauseRestart);
  await game.waitForNoModal();

  await poll(() => game.score()).toBe(0);
  expect(await game.drinks()).toEqual([]);
  expect(await game.launches()).toBe(launches);
  await game.waitFrames(10);
  const t = await game.tickets();
  expect(t.levels).toHaveLength(2);
  expect(t.views).toBe(2);
  expect(await game.freeze()).toMatchObject({ worldEnabled: true, clockPaused: false, isGameActive: true });
  await game.waitReadyToLaunch();
  await game.launchAt(360);
});

test('restart during an order checkout leaks no reward or ticket', async ({ game, page }) => {
  const warnings: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  // A drink of a ticket's level on the table starts a checkout
  const [level] = (await game.tickets()).levels;
  await game.page.evaluate(
    ([level, y]) => {
      window.__COCKTAIL__!.spawnDrink(level, 280, y);
    },
    [level, Math.round(game.H * 0.4)]
  );
  await poll(async () => (await game.tickets()).checkingOut).toBe(true);
  // Stretch the checkout's fly-to-ticket animation so it is still running at the restart
  await game.page.evaluate(() => {
    const orders = window.__COCKTAIL__!.getScene()!['orderManager'];
    orders['checkoutTweens'].forEach(t => (t.timeScale = 0.02));
  });
  expect(await game.score()).toBe(0);

  await game.pauseViaHud();
  await game.tap(game.ui.pauseRestart);
  await game.waitForNoModal();

  // ~2 s of play: no reward lands, no third ticket appears, no ticket overlaps
  for (let i = 0; i < 4; i++) {
    await game.waitFrames(5);
    expect(await game.score()).toBe(0);
  }
  await game.page.waitForTimeout(1000);
  expect(await game.score()).toBe(0);
  const t = await game.tickets();
  expect(t).toMatchObject({ views: 2, checkingOut: false });
  expect(t.levels).toHaveLength(2);
  expect(warnings).toEqual([]);
});
