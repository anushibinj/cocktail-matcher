import { test, expect, poll } from './support/game';

// TEST002 case 9: best score and audio settings survive a reload.

test('best score and sound/music settings survive a reload', async ({ game }) => {
  await game.open();
  await game.startGame();
  expect(await game.hudIcons()).toEqual({ sound: '🔊', music: '🎵' });

  await game.tap(game.ui.hudSound);
  await poll(async () => (await game.hudIcons()).sound).toBe('🔇');
  await game.tap(game.ui.hudMusic);
  await poll(async () => (await game.hudIcons()).music).toBe('🚫');
  await game.page.evaluate(() => window.__COCKTAIL__!.setScore(777));
  expect(await game.save()).toMatchObject({
    bestScore: 777,
    soundEnabled: false,
    musicEnabled: false
  });

  await game.reload();
  // The menu shows the stored best
  expect(
    await game.page.evaluate(() =>
      window
        .__COCKTAIL__!.game.scene.getScene('MenuScene')!
        .children.list.flatMap((o) =>
          'list' in o ? (o.list as Phaser.GameObjects.GameObject[]) : [o]
        )
        .some((o) => o.type === 'Text' && (o as Phaser.GameObjects.Text).text === '777')
    )
  ).toBe(true);

  await game.startGame();
  expect(await game.hudIcons()).toEqual({ sound: '🔇', music: '🚫' });
  expect(await game.state()).toMatchObject({ score: 0, bestScore: 777 });
});
