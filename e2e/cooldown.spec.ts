import { test, expect, poll } from './support/game';

// TEST002 case 5 and BUG002: a pause or restart during the 450 ms drop
// cooldown never soft-locks launching or double-advances the queue.

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.setSeed(1234);
  await game.startGame();
});

test('pause during the cooldown, wait, resume: the preview is back and the next tap launches', async ({
  game
}) => {
  const queue = await game.spawner();
  // A slow scene clock keeps the cooldown pending until the pause lands
  await game.setClockScale(0.02);
  await game.launchAt(300);
  expect((await game.spawner()).isCoolingDown).toBe(true);

  await game.pauseViaHud();
  await game.page.waitForTimeout(1000);
  expect((await game.spawner()).isCoolingDown).toBe(true);
  await game.tap(game.ui.pauseResume);
  await game.waitForNoModal();

  // Resume finishes the cooldown right away, advancing the queue once
  await poll(async () => {
    const s = await game.spawner();
    return !s.isCoolingDown && s.previewVisible && s.isEnabled;
  }).toBe(true);
  expect((await game.spawner()).currentLevel).toBe(queue.nextLevel);

  await game.setClockScale(1);
  await game.waitReadyToLaunch();
  await game.launchAt(420);
});

test('a pause shorter than the cooldown still leaves launching working', async ({ game }) => {
  // Hold the cooldown at its start until the in-page pause below
  await game.setClockScale(0.02);
  await game.launchAt(300);
  // Pause in the same frame the cooldown is seen, then resume on the next
  // frame, all inside the page so tap latency can't stretch the pause
  const pausedForMs = await game.page.evaluate(
    ({ pause }) =>
      new Promise<number>((resolve, reject) => {
        const scene = window.__COCKTAIL__!.getScene()!;
        const loop = window.__COCKTAIL__!.game.loop;
        if (!scene['spawner']['isCoolingDown']) return reject(new Error('cooldown already over'));
        scene.time.timeScale = 1;
        window.__e2e.press(pause.x, pause.y);
        const t0 = loop.time;
        const onUpdate = () => {
          if (loop.time === t0 || !window.__e2e.modal()) return;
          scene.events.off('postupdate', onUpdate);
          if (!window.__e2e.pressModalText('RESUME')) return reject(new Error('no RESUME button'));
          resolve(loop.time - t0);
        };
        scene.events.on('postupdate', onUpdate);
      }),
    { pause: game.ui.hudPause }
  );
  expect(pausedForMs).toBeLessThan(450);

  await game.waitForNoModal();
  await game.waitReadyToLaunch();
  await game.launchAt(420);
});

test('restart during the cooldown keeps the fresh queue (no extra advance)', async ({ game }) => {
  await game.setClockScale(0.02);
  await game.launchAt(300);
  await game.pauseViaHud();
  expect((await game.spawner()).isCoolingDown).toBe(true);

  await game.tap(game.ui.pauseRestart);
  await game.waitForNoModal();
  await poll(async () => {
    const s = await game.spawner();
    return !s.isCoolingDown && s.previewVisible;
  }).toBe(true);
  const fresh = await game.spawner();

  // Let a stale cooldown timer (if any survived) run out
  await game.setClockScale(1);
  await game.waitFrames(15);
  const later = await game.spawner();
  expect([later.currentLevel, later.nextLevel]).toEqual([fresh.currentLevel, fresh.nextLevel]);
  expect(later.isCoolingDown).toBe(false);
  await game.launchAt(360);
});
