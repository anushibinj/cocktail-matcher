import { SpawnDistribution } from '../../types/game';

/** A source of uniform random numbers in [0, 1), like `Math.random`. */
export type Rng = () => number;

/** mulberry32: a tiny, fast 32-bit seeded PRNG. Same seed → same sequence. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks a level from a weighted distribution. Pure: all randomness comes from `rng`. */
export function pickWeightedLevel(dist: readonly SpawnDistribution[], rng: Rng): number {
  const totalWeight = dist.reduce((sum, item) => sum + item.weight, 0);
  let rand = rng() * totalWeight;

  for (const item of dist) {
    if (rand < item.weight) {
      return item.level;
    }
    rand -= item.weight;
  }
  return 0;
}

/** Uniform integer in [min, max] (inclusive). */
export function pickIntInclusive(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// Shared RNG for gameplay picks (spawner + orders). Unseeded it is plain
// Math.random; the debug hook (src/debug.ts) can seed it for reproducible runs.
let gameRng: Rng = Math.random;

/** Draws from the shared gameplay RNG. */
export function gameRandom(): number {
  return gameRng();
}

/** Seeds the shared gameplay RNG, or restores `Math.random` when `seed` is null. */
export function setGameSeed(seed: number | null): void {
  gameRng = seed === null ? Math.random : mulberry32(seed);
}
