import { test, expect, poll, type GameDriver } from './support/game';

// Physics must actually step after every way into play. Calling Matter's
// world.resume() on a world that was never paused stalls it, so a lifecycle
// refactor could leave a board where drinks hang in place.

/** Drops a level-0 drink (no order asks for it) mid-board and waits for gravity to move it. */
async function expectPhysicsRunning(game: GameDriver, label: string): Promise<void> {
  const x = 610;
  const y = Math.round(game.H * 0.6);
  await game.page.evaluate(
    ([x, y]) => {
      window.__COCKTAIL__!.spawnDrink(0, x, y);
    },
    [x, y]
  );
  await poll(
    async () => {
      const d = (await game.drinks()).filter((d) => Math.abs(d.x - x) < 30);
      return d.length ? Math.min(...d.map((d) => d.y)) : y;
    },
    { message: `drinks move after ${label}` }
  ).toBeLessThan(y - 20);
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
