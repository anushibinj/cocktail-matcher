import { expect, it } from 'vitest';

// DX002 gate check: deliberate failing test, reverted in the next commit.
it('fails on purpose to prove the ci test step gates PRs', () => {
  expect(1 + 1).toBe(3);
});
