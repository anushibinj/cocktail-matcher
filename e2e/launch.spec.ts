import { test, expect, poll } from './support/game';

// TEST002 case 2 and the BUG003 input cases: what does and doesn't launch.

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.setSeed(1234);
  await game.startGame();
});

/** The most recently launched drink: launches start at the bottom and rise. */
async function newestDrink(game: import('./support/game').GameDriver) {
  const drinks = await game.drinks();
  return drinks.reduce((a, b) => (b.y > a.y ? b : a));
}

test('a tap or drag-and-release launches exactly one drink under the release; the cooldown blocks a second', async ({
  game
}) => {
  const start = await game.launches();

  // Tap: exactly one drink, at the tap's x (BUG005: pointer maps to the board)
  await game.tap(game.ui.board(300));
  await poll(() => game.launches()).toBe(start + 1);
  expect(Math.abs((await newestDrink(game)).x - 300)).toBeLessThanOrEqual(4);
  await game.waitFrames(10);
  expect(await game.launches()).toBe(start + 1);

  // Cooldown: slow the scene clock so the cooldown outlasts tap latency,
  // then a second tap during it launches nothing
  await game.waitReadyToLaunch();
  await game.setClockScale(0.02);
  await game.launchAt(200);
  await game.tap(game.ui.board(450));
  await game.waitFrames(10);
  expect(await game.launches()).toBe(start + 2);
  expect((await game.spawner()).isCoolingDown).toBe(true);
  await game.setClockScale(1);

  // Drag: launches once, at the release x
  await game.waitReadyToLaunch();
  await game.drag(game.ui.board(470), game.ui.board(250));
  await poll(() => game.launches()).toBe(start + 3);
  expect(Math.abs((await newestDrink(game)).x - 250)).toBeLessThanOrEqual(4);
});

test('touch: a second finger or a cancelled touch never launches an extra drink', async ({
  game,
  allowedProblems
}) => {
  test.skip(!game.touch, 'touch only');
  // Chromium's intervention notice for Phaser's preventDefault() on a touchcancel
  allowedProblems.push(/Ignored attempt to cancel a touchcancel event/);
  const start = await game.launches();
  const a = await game.toCss(game.ui.board(250));
  const b = await game.toCss(game.ui.board(470));

  // Second finger lands while the first is aiming; both lift
  await game.touchEvent('touchStart', [{ ...a, id: 0 }]);
  await game.touchEvent('touchStart', [
    { ...a, id: 0 },
    { ...b, id: 1 }
  ]);
  await game.touchEvent('touchEnd', []);
  await poll(() => game.launches()).toBe(start + 1);
  await game.waitFrames(10);
  expect(await game.launches()).toBe(start + 1);

  // OS-cancelled touch (edge swipe, call overlay): no launch, nothing left armed
  await game.waitReadyToLaunch();
  await game.touchEvent('touchStart', [{ ...a, id: 0 }]);
  await poll(async () => (await game.spawner()).armedPointerId).not.toBeNull();
  await game.touchEvent('touchCancel', []);
  await poll(async () => (await game.spawner()).armedPointerId).toBeNull();
  await game.waitFrames(10);
  expect(await game.launches()).toBe(start + 1);

  // And the next tap still launches
  await game.launchAt(360);
});

test('mouse: a stale arm from a lost mouseup does not launch from a HUD tap', async ({ game }) => {
  test.skip(game.touch, 'mouse only');
  const start = await game.launches();
  const sound = (await game.hudIcons()).sound;

  // Press on the board; the release never reaches the page
  await game.mouseEvent('mousePressed', game.ui.board(300));
  await poll(async () => (await game.spawner()).armedPointerId).not.toBeNull();

  // Next click is on the HUD sound toggle: toggles sound, launches nothing
  await game.tap(game.ui.hudSound);
  await poll(async () => (await game.hudIcons()).sound).not.toBe(sound);
  await game.waitFrames(10);
  expect(await game.launches()).toBe(start);
  expect((await game.spawner()).armedPointerId).toBeNull();

  // A normal click on the board still launches
  await game.launchAt(360);
});

test('HUD toggles, Pause, Resume and Restart Game launch nothing', async ({ game }) => {
  const start = await game.launches();
  const icons = await game.hudIcons();

  await game.tap(game.ui.hudSound);
  await poll(async () => (await game.hudIcons()).sound).not.toBe(icons.sound);
  await game.tap(game.ui.hudMusic);
  await poll(async () => (await game.hudIcons()).music).not.toBe(icons.music);

  await game.pauseViaHud();
  await game.tap(game.ui.pauseResume);
  await game.waitForNoModal();
  await game.waitReadyToLaunch();

  await game.pauseViaHud();
  await game.tap(game.ui.pauseRestart);
  await game.waitForNoModal();
  await game.waitReadyToLaunch();

  await game.waitFrames(10);
  expect(await game.launches()).toBe(start);
  // The board itself still launches
  await game.launchAt(360);
});
