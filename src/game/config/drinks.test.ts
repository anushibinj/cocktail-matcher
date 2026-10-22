import { describe, expect, it } from 'vitest';
import { DRINKS, getDrinkByLevel } from './drinks';

describe('DRINKS invariants', () => {
  it('has the 12-tier progression', () => {
    expect(DRINKS).toHaveLength(12);
  });

  it('uses level === index so getDrinkByLevel can index directly', () => {
    DRINKS.forEach((drink, index) => expect(drink.level).toBe(index));
  });

  it('has strictly increasing radius', () => {
    for (let i = 1; i < DRINKS.length; i++) {
      expect(DRINKS[i].radius).toBeGreaterThan(DRINKS[i - 1].radius);
    }
  });

  it('has a positive, non-decreasing base score', () => {
    DRINKS.forEach((drink, i) => {
      expect(drink.baseScore).toBeGreaterThan(0);
      if (i > 0) expect(drink.baseScore).toBeGreaterThanOrEqual(DRINKS[i - 1].baseScore);
    });
  });

  it('has unique ids', () => {
    expect(new Set(DRINKS.map((d) => d.id)).size).toBe(DRINKS.length);
  });
});

describe('getDrinkByLevel', () => {
  it('returns the matching tier for every valid level', () => {
    DRINKS.forEach((drink) => expect(getDrinkByLevel(drink.level)).toBe(drink));
  });

  it('returns the first and max tiers at the bounds', () => {
    expect(getDrinkByLevel(0)).toBe(DRINKS[0]);
    expect(getDrinkByLevel(DRINKS.length - 1)).toBe(DRINKS[DRINKS.length - 1]);
  });

  it('clamps out-of-range levels to the max tier', () => {
    const max = DRINKS[DRINKS.length - 1];
    expect(getDrinkByLevel(DRINKS.length)).toBe(max);
    expect(getDrinkByLevel(999)).toBe(max);
    expect(getDrinkByLevel(-1)).toBe(max);
  });
});
