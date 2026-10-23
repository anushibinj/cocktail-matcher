import { test, expect, poll, type GameDriver } from './support/game';

// TEST002 case 4 plus BUG001/UX006: pause and tab hide freeze the board.

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.setSeed(1234);
  await game.startGame();
});

/** Drinks of levels 0/1, which no order ever asks for, so no checkout removes them. */
async function spawnRisingDrinks(game: GameDriver): Promise<void> {
  const y = game.ui.board().y - 60;
  await game.page.evaluate(
    ([y]) => {
      const api = window.__COCKTAIL__!;
      api.spawnDrink(0, 200, y);
      api.spawnDrink(1, 360, y);
      api.spawnDrink(0, 520, y);
    },
    [y]
  );
  // Wait until they are visibly moving (gravity is upward)
  await poll(async () => Math.min(...(await game.drinks()).map(d => d.y))).toBeLessThan(y - 20);
}

test('pause freezes drinks, clock and merges for 2 s; resume continues without a jump', async ({ game }) => {
  await spawnRisingDrinks(game);
  await game.pauseViaHud();

  const frozen = await game.freeze();
  expect(frozen).toMatchObject({ worldEnabled: false, clockPaused: true, isGameActive: false });

  // Two touching level-0 drinks placed under the modal must not merge
  await game.page.evaluate(() => {
    const api = window.__COCKTAIL__!;
    api.spawnDrink(0, 300, 400);
    api.spawnDrink(0, 320, 400);
  });
  const before = await game.state();
  await game.page.waitForTimeout(2000);
  await game.waitFrames(5);
  const after = await game.state();
  expect(after.drinks).toEqual(before.drinks);
  expect(after.score).toBe(before.score);
  expect(after.drinks).toHaveLength(5);
  expect(await game.freeze()).toMatchObject({ worldEnabled: false, clockPaused: true });

  // Resume: motion continues from the frozen positions, and the pair merges
  await game.tap(game.ui.pauseResume);
  await game.waitForNoModal();
  await poll(async () => (await game.freeze()).worldEnabled).toBe(true);
  const resumed = await game.drinks();
  for (const d of resumed.slice(0, 3)) {
    const was = before.drinks.find(b => b.x === d.x || Math.abs(b.x - d.x) < 30 && b.level === d.level)!;
    expect(Math.abs(d.y - was.y), 'no burst of accumulated physics on resume').toBeLessThan(60);
  }
  await poll(() => game.score()).toBeGreaterThan(before.score);
  expect(await game.freeze()).toMatchObject({ clockPaused: false, isGameActive: true });
});

test('a merge screen shake stops when the game pauses', async ({ game }) => {
  // Two level-7 drinks merge into level 8, which shakes the camera; pause the
  // frame the shake starts (via a tab hide, the auto-pause path)
  const shookAndPaused = await game.page.evaluate(
    () =>
      new Promise<boolean>(resolve => {
        const api = window.__COCKTAIL__!;
        const scene = api.getScene()!;
        const onUpdate = () => {
          if (!scene.cameras.main.shakeEffect.isRunning) return;
          scene.events.off('postupdate', onUpdate);
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          document.dispatchEvent(new Event('visibilitychange'));
          resolve(true);
        };
        scene.events.on('postupdate', onUpdate);
        api.spawnDrink(7, 300, 500);
        api.spawnDrink(7, 330, 500);
        setTimeout(() => resolve(false), 15_000);
      })
  );
  expect(shookAndPaused).toBe(true);
  await game.setPageHidden(false);

  await game.waitForModal('GAME PAUSED');
  await game.waitFrames(5);
  const f = await game.freeze();
  expect(f).toMatchObject({ shaking: false, worldEnabled: false });
  expect(
    await game.page.evaluate(() => {
      const cam = window.__COCKTAIL__!.getScene()!.cameras.main;
      return [cam.scrollX, cam.scrollY];
    })
  ).toEqual([0, 0]);
});

test('hiding the tab auto-pauses only during play', async ({ game }) => {
  await spawnRisingDrinks(game);

  // During play: hide and return shows the pause modal over a frozen board
  await game.setPageHidden(true);
  await game.setPageHidden(false);
  await game.waitForModal('GAME PAUSED');
  const before = await game.drinks();
  await game.waitFrames(10);
  expect(await game.drinks()).toEqual(before);
  expect(await game.freeze()).toMatchObject({ worldEnabled: false, clockPaused: true });

  // Hiding again while paused keeps the one modal
  await game.setPageHidden(true);
  await game.setPageHidden(false);
  await game.waitFrames(3);
  expect(await game.modalTitle()).toBe('GAME PAUSED');

  // After game over, a hide doesn't open a pause modal on top
  await game.tap(game.ui.pauseResume);
  await game.waitForNoModal();
  await game.page.evaluate(() => window.__COCKTAIL__!.forceGameOver());
  await game.waitForModal('GAME OVER');
  await game.setPageHidden(true);
  await game.setPageHidden(false);
  await game.waitFrames(5);
  expect((await game.modal())!.texts).not.toContain('GAME PAUSED');

  // On the menu, nothing pauses either
  await game.tap(game.ui.gameOverMenu);
  await game.waitForMenu();
  await game.setPageHidden(true);
  await game.setPageHidden(false);
  await game.waitFrames(5);
  expect(await game.modal()).toBeNull();
  expect(await game.activeScenes()).toEqual(['MenuScene']);
});

test('menu round trips add no duplicate auto-pause listeners', async ({ game }) => {
  const listeners = () => game.page.evaluate(() => window.__COCKTAIL__!.game.events.listenerCount('hidden'));
  const inGame = await listeners();

  for (let i = 0; i < 3; i++) {
    await game.page.evaluate(() => window.__COCKTAIL__!.forceGameOver());
    await game.waitForModal('GAME OVER');
    await game.tap(game.ui.gameOverMenu);
    await game.waitForMenu();
    await game.startGame();
  }
  expect(await listeners()).toBe(inGame);

  // And one hide still opens exactly one, working, pause modal
  await game.setPageHidden(true);
  await game.setPageHidden(false);
  await game.waitForModal('GAME PAUSED');
  await game.tap(game.ui.pauseResume);
  await game.waitForNoModal();
  await game.launchAt(360);
});
