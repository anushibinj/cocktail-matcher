import { test, expect, poll, type GameDriver } from './support/game';

// Physics must actually step after every way into play. Calling Matter's
// world.resume() on a world that was never paused stalls it, so a lifecycle
// refactor could leave a board where drinks hang in place.

/** Moving drinks near column `x`: the smallest y (highest on screen), or `fallback` if none. */
async function topYNear(game: GameDriver, x: number, fallback: number): Promise<number> {
  const d = (await game.drinks()).filter((d) => Math.abs(d.x - x) < 30);
  return d.length ? Math.min(...d.map((d) => d.y)) : fallback;
}

/**
 * A launched drink rises from the launcher, and a level-0 drink (no order
 * asks for it) dropped mid-board moves under gravity.
 */
async function expectPhysicsRunning(game: GameDriver, label: string): Promise<void> {
  await game.waitReadyToLaunch();
  const launchX = 180;
  await game.launchAt(launchX);
  // Compare with where it starts: once it rises past the order line, a
  // ticket of its tier may check it out and remove it
  const start = await topYNear(game, launchX, NaN);
  expect(start, `launched drink present after ${label}`).not.toBeNaN();
  await poll(() => topYNear(game, launchX, start), {
    message: `launched drink rises after ${label}`
  }).toBeLessThan(start - 20);

  const x = 610;
  const y = Math.round(game.H * 0.6);
  await game.page.evaluate(
    ([x, y]) => {
      window.__COCKTAIL__!.spawnDrink(0, x, y);
    },
    [x, y]
  );
  await poll(() => topYNear(game, x, y), {
    message: `dropped drink moves after ${label}`
  }).toBeLessThan(y - 20);
  expect(await game.freeze()).toMatchObject({ worldEnabled: true, isGameActive: true });
}

test('drinks move after start, Resume, Restart, Play Again and Main Menu → Play', async ({
  game
}) => {
  await game.open();
  await game.setSeed(1234);
  await game.startGame();
  await expectPhysicsRunning(game, 'start');

  await game.pauseViaHud();
  await game.tap(game.ui.pauseResume);
  await game.waitForNoModal();
  await expectPhysicsRunning(game, 'Resume');

  await game.pauseViaHud();
  await game.tap(game.ui.pauseRestart);
  await game.waitForNoModal();
  await expectPhysicsRunning(game, 'Restart');

  await game.page.evaluate(() => window.__COCKTAIL__!.forceGameOver());
  await game.waitForModal('GAME OVER');
  await game.tap(game.ui.gameOverPlayAgain);
  await game.waitForNoModal();
  await expectPhysicsRunning(game, 'Play Again');

  await game.page.evaluate(() => window.__COCKTAIL__!.forceGameOver());
  await game.waitForModal('GAME OVER');
  await game.tap(game.ui.gameOverMenu);
  await game.waitForMenu();
  await game.startGame();
  await expectPhysicsRunning(game, 'Main Menu → Play (from game over)');

  await game.pauseViaHud();
  await game.tap(game.ui.pauseMenu);
  await game.waitForMenu();
  await game.startGame();
  await expectPhysicsRunning(game, 'Main Menu → Play (from pause)');
});
