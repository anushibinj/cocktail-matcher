import { afterEach, describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config/gameConfig';
import { DRINKS } from '../config/drinks';
import {
  gameRandom,
  mulberry32,
  pickIntInclusive,
  pickWeightedLevel,
  setGameSeed
} from './spawnPicker';

/** An RNG that always returns `value`. */
const fixed = (value: number) => () => value;

describe('pickWeightedLevel', () => {
  const dist = [
    { level: 0, weight: 30 },
    { level: 1, weight: 20 },
    { level: 2, weight: 50 }
  ];

  it('maps the RNG range onto cumulative weight bands', () => {
    expect(pickWeightedLevel(dist, fixed(0))).toBe(0);
    expect(pickWeightedLevel(dist, fixed(0.29))).toBe(0);
    expect(pickWeightedLevel(dist, fixed(0.3))).toBe(1);
    expect(pickWeightedLevel(dist, fixed(0.49))).toBe(1);
    expect(pickWeightedLevel(dist, fixed(0.5))).toBe(2);
    expect(pickWeightedLevel(dist, fixed(0.999999))).toBe(2);
  });

  it('never picks a level with weight 0', () => {
    const withZero = [
      { level: 0, weight: 1 },
      { level: 1, weight: 0 },
      { level: 2, weight: 1 }
    ];
    for (let i = 0; i < 100; i++) {
      expect(pickWeightedLevel(withZero, fixed(i / 100))).not.toBe(1);
    }
  });

  it('skips a leading weight-0 entry even when the RNG returns 0', () => {
    expect(
      pickWeightedLevel(
        [
          { level: 5, weight: 0 },
          { level: 6, weight: 1 }
        ],
        fixed(0)
      )
    ).toBe(6);
  });

  it('falls back to level 0 when every weight is 0 or the list is empty', () => {
    expect(pickWeightedLevel([{ level: 3, weight: 0 }], fixed(0.5))).toBe(0);
    expect(pickWeightedLevel([], fixed(0.5))).toBe(0);
  });

  it('roughly follows the weights over many seeded draws', () => {
    const rng = mulberry32(1234);
    const counts = [0, 0, 0];
    const N = 20000;
    for (let i = 0; i < N; i++) counts[pickWeightedLevel(dist, rng)]++;
    expect(counts[0] / N).toBeCloseTo(0.3, 1);
    expect(counts[1] / N).toBeCloseTo(0.2, 1);
    expect(counts[2] / N).toBeCloseTo(0.5, 1);
  });

  it('only spawns valid low tiers from the shipped distribution', () => {
    const rng = mulberry32(42);
    const allowed = new Set(GAME_CONFIG.SPAWN_DISTRIBUTION.map((d) => d.level));
    for (let i = 0; i < 1000; i++) {
      const level = pickWeightedLevel(GAME_CONFIG.SPAWN_DISTRIBUTION, rng);
      expect(allowed.has(level)).toBe(true);
      expect(level).toBeLessThan(DRINKS.length - 1);
    }
  });
});

describe('pickIntInclusive', () => {
  it('covers both ends of the range', () => {
    expect(pickIntInclusive(2, 5, fixed(0))).toBe(2);
    expect(pickIntInclusive(2, 5, fixed(0.999999))).toBe(5);
  });

  it('returns min when min === max', () => {
    expect(pickIntInclusive(4, 4, fixed(0.7))).toBe(4);
  });
});

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gives different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('gameRandom / setGameSeed', () => {
  afterEach(() => setGameSeed(null));

  it('replays the same sequence after re-seeding', () => {
    setGameSeed(99);
    const first = [gameRandom(), gameRandom(), gameRandom()];
    setGameSeed(99);
    expect([gameRandom(), gameRandom(), gameRandom()]).toEqual(first);
  });

  it('matches mulberry32 for the same seed', () => {
    setGameSeed(5);
    expect(gameRandom()).toBe(mulberry32(5)());
  });

  it('returns to Math.random when the seed is cleared', () => {
    setGameSeed(null);
    const v = gameRandom();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
