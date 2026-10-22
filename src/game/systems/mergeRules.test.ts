import { describe, expect, it } from 'vitest';
import { canMerge, MergeCandidate } from './mergeRules';

const MAX = 11;

function drink(overrides: Partial<MergeCandidate> = {}): MergeCandidate {
  return { level: 3, isMerging: false, isDropped: true, active: true, ...overrides };
}

describe('canMerge', () => {
  it('merges two settled drinks of the same level', () => {
    expect(canMerge(drink(), drink(), MAX)).toBe(true);
  });

  it('does not merge non-identical drinks', () => {
    expect(canMerge(drink({ level: 3 }), drink({ level: 4 }), MAX)).toBe(false);
  });

  it.each([
    ['merging', { isMerging: true }],
    ['not yet dropped', { isDropped: false }],
    ['inactive', { active: false }]
  ] as const)('rejects a pair where either drink is %s', (_label, flag) => {
    expect(canMerge(drink(flag), drink(), MAX)).toBe(false);
    expect(canMerge(drink(), drink(flag), MAX)).toBe(false);
  });

  it('never merges the max tier, so no invalid level is produced', () => {
    expect(canMerge(drink({ level: MAX }), drink({ level: MAX }), MAX)).toBe(false);
  });

  it('merges the tier just below the max', () => {
    expect(canMerge(drink({ level: MAX - 1 }), drink({ level: MAX - 1 }), MAX)).toBe(true);
  });

  it('merges level 0', () => {
    expect(canMerge(drink({ level: 0 }), drink({ level: 0 }), MAX)).toBe(true);
  });
});
