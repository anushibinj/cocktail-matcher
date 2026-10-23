import { test, expect, poll } from './support/game';

// TEST002 case 7, BUG001 (game over half) and BUG006 (new-best badge).

const NEW_BEST = '🏆 NEW BEST SCORE! 🏆';

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.setSeed(1234);
  await game.startGame();
});

test('forced game over shows the modal and freezes score, best and board', async ({ game }) => {
  await game.launchAt(300);
  await game.page.evaluate(() => window.__COCKTAIL__!.setScore(120));

  // End the run in the same frame a touching level-0 pair appears and other
  // drinks are still moving: nothing may merge or score afterwards
  await game.page.evaluate(
    ([y]) => {
      const api = window.__COCKTAIL__!;
      api.spawnDrink(1, 200, y);
      api.spawnDrink(1, 520, y);
      api.spawnDrink(0, 340, 420);
      api.spawnDrink(0, 360, 420);
      api.forceGameOver();
    },
    [game.ui.board().y - 60]
  );
  const modal = await game.waitForModal('GAME OVER');
  expect(modal.texts).toContain('120');

  const before = { state: await game.state(), save: await game.save() };
  expect(before.state.drinks).toHaveLength(5);
  await game.page.waitForTimeout(2000);
  await game.waitFrames(5);
  const after = { state: await game.state(), save: await game.save() };
  expect(after).toEqual(before);
  expect(await game.freeze()).toMatchObject({
    worldEnabled: false,
    clockPaused: true,
    isGameActive: false
  });
  expect((await game.spawner()).isEnabled).toBe(false);

  // Taps on the board under the modal launch nothing
  const launches = await game.launches();
  await game.tap(game.ui.board(300));
  await game.waitFrames(5);
  expect(await game.launches()).toBe(launches);
});

test('Play Again and Main Menu launch nothing; Play Again starts a clean run', async ({ game }) => {
  const launches = await game.launches();
  await game.page.evaluate(() => window.__COCKTAIL__!.forceGameOver());
  await game.waitForModal('GAME OVER');
  await game.tap(game.ui.gameOverPlayAgain);
  await game.waitForNoModal();
  await game.waitReadyToLaunch();
  expect(await game.launches()).toBe(launches);
  expect(await game.state()).toMatchObject({ score: 0, isGameActive: true, drinks: [] });
  await game.launchAt(360);

  await game.page.evaluate(() => window.__COCKTAIL__!.forceGameOver());
  await game.waitForModal('GAME OVER');
  await game.tap(game.ui.gameOverMenu);
  await game.waitForMenu();
  await game.waitFrames(5);
  expect(await game.launches()).toBe(launches + 1);

  // Pause > Main Menu as well
  await game.startGame();
  await game.pauseViaHud();
  await game.tap(game.ui.pauseMenu);
  await game.waitForMenu();
  await game.waitFrames(5);
  expect(await game.launches()).toBe(launches + 1);
});

test('the new-best badge shows only for a strict record', async ({ game }) => {
  const endRunWith = async (score: number) => {
    await game.page.evaluate((s) => {
      window.__COCKTAIL__!.setScore(s);
      window.__COCKTAIL__!.forceGameOver();
    }, score);
    return game.waitForModal('GAME OVER');
  };
  const playAgain = async () => {
    await game.tap(game.ui.gameOverPlayAgain);
    await game.waitForNoModal();
    await poll(async () => (await game.state()).isGameActive).toBe(true);
  };

  // First-ever run: 0 shows no badge
  expect((await endRunWith(0)).texts).not.toContain(NEW_BEST);
  await playAgain();

  // Beating the stored best (0) shows it, on top of the card, fully opaque
  expect((await endRunWith(50)).texts).toContain(NEW_BEST);
  expect(await game.modalText(NEW_BEST)).toEqual({ alpha: 1, visible: true, aboveCard: true });
  await playAgain();

  // Equal to the best: no badge
  expect((await endRunWith(50)).texts).not.toContain(NEW_BEST);
  expect((await game.save())!.bestScore).toBe(50);
  await playAgain();

  // One more than the best: badge
  expect((await endRunWith(51)).texts).toContain(NEW_BEST);
});
