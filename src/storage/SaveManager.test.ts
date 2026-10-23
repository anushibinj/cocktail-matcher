import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_CONFIG } from '../game/config/gameConfig';
import { MemoryStorage, resetSaveManager, stubLocalStorage } from '../test/storage';
import { SaveManager } from './SaveManager';

const KEY = GAME_CONFIG.STORAGE_KEY;

const DEFAULTS = {
  version: 1,
  bestScore: 0,
  soundEnabled: true,
  musicEnabled: true,
  totalGamesPlayed: 0,
  highestDrinkUnlocked: 0
};

let storage: MemoryStorage;

function stored(): Record<string, unknown> {
  return JSON.parse(storage.getItem(KEY) ?? 'null');
}

beforeEach(() => {
  storage = stubLocalStorage();
  resetSaveManager();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetSaveManager();
});

describe('SaveManager singleton', () => {
  it('returns the same instance until reset', () => {
    const a = SaveManager.getInstance();
    expect(SaveManager.getInstance()).toBe(a);
    resetSaveManager();
    expect(SaveManager.getInstance()).not.toBe(a);
  });
});

describe('SaveManager load', () => {
  it('uses defaults when nothing is stored', () => {
    const save = SaveManager.getInstance();
    expect(save.getBestScore()).toBe(0);
    expect(save.getSoundEnabled()).toBe(true);
    expect(save.getMusicEnabled()).toBe(true);
    expect(save.getHighestDrinkUnlocked()).toBe(0);
  });

  it('restores a valid save (best score survives refresh)', () => {
    storage.setItem(
      KEY,
      JSON.stringify({ ...DEFAULTS, bestScore: 4321, soundEnabled: false, highestDrinkUnlocked: 6 })
    );
    const save = SaveManager.getInstance();
    expect(save.getBestScore()).toBe(4321);
    expect(save.getSoundEnabled()).toBe(false);
    expect(save.getHighestDrinkUnlocked()).toBe(6);
  });

  it('restores non-default settings alongside a best score of 0', () => {
    const saved = {
      ...DEFAULTS,
      soundEnabled: false,
      musicEnabled: false,
      totalGamesPlayed: 3,
      highestDrinkUnlocked: 4
    };
    storage.setItem(KEY, JSON.stringify(saved));
    const save = SaveManager.getInstance();
    expect(save.getBestScore()).toBe(0);
    expect(save.getSoundEnabled()).toBe(false);
    expect(save.getMusicEnabled()).toBe(false);
    expect(save.getHighestDrinkUnlocked()).toBe(4);
    save.recordGamePlayed(0);
    expect(stored()).toEqual({ ...saved, totalGamesPlayed: 4 });
  });

  it('merges an old save missing newer fields over the defaults', () => {
    storage.setItem(KEY, JSON.stringify({ bestScore: 900 }));
    const save = SaveManager.getInstance();
    expect(save.getBestScore()).toBe(900);
    expect(save.getMusicEnabled()).toBe(true);
    expect(save.getHighestDrinkUnlocked()).toBe(0);
    save.recordGamePlayed(2);
    expect(stored()).toEqual({
      ...DEFAULTS,
      bestScore: 900,
      totalGamesPlayed: 1,
      highestDrinkUnlocked: 2
    });
  });

  it('falls back to defaults on corrupt JSON without throwing', () => {
    storage.setItem(KEY, '{not json');
    const save = SaveManager.getInstance();
    expect(save.getBestScore()).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it.each([
    ['a non-numeric bestScore', JSON.stringify({ bestScore: '9999' })],
    ['a missing bestScore', JSON.stringify({ soundEnabled: false })],
    ['a JSON null', 'null'],
    ['a JSON number', '42']
  ])('rejects a save with %s and uses defaults', (_label, raw) => {
    storage.setItem(KEY, raw);
    const save = SaveManager.getInstance();
    expect(save.getBestScore()).toBe(0);
    expect(save.getSoundEnabled()).toBe(true);
  });

  it('falls back to in-memory defaults when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    });
    const save = SaveManager.getInstance();
    expect(save.getBestScore()).toBe(0);
    // Writes are swallowed but still update the in-memory copy
    expect(save.setBestScore(50)).toBe(true);
    expect(save.getBestScore()).toBe(50);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});

describe('SaveManager best score', () => {
  it('records a strictly higher score and persists it', () => {
    const save = SaveManager.getInstance();
    expect(save.setBestScore(100)).toBe(true);
    expect(save.getBestScore()).toBe(100);
    expect(stored().bestScore).toBe(100);
  });

  it('does not treat a tie with the stored best as a new record', () => {
    storage.setItem(KEY, JSON.stringify({ ...DEFAULTS, bestScore: 100 }));
    const save = SaveManager.getInstance();
    expect(save.setBestScore(100)).toBe(false);
    expect(save.setBestScore(99)).toBe(false);
    expect(save.getBestScore()).toBe(100);
  });

  it('survives a reload', () => {
    SaveManager.getInstance().setBestScore(777);
    resetSaveManager();
    expect(SaveManager.getInstance().getBestScore()).toBe(777);
  });
});

describe('SaveManager settings and progress', () => {
  it.each([
    ['setBestScore', (s: SaveManager) => s.setBestScore(10), { bestScore: 10 }],
    ['setSoundEnabled', (s: SaveManager) => s.setSoundEnabled(false), { soundEnabled: false }],
    ['setMusicEnabled', (s: SaveManager) => s.setMusicEnabled(false), { musicEnabled: false }],
    [
      'recordGamePlayed',
      (s: SaveManager) => s.recordGamePlayed(2),
      { totalGamesPlayed: 1, highestDrinkUnlocked: 2 }
    ]
  ])('%s persists on its own', (_name, write, change) => {
    write(SaveManager.getInstance());
    expect(stored()).toEqual({ ...DEFAULTS, ...change });
  });

  it('persists sound and music toggles', () => {
    const save = SaveManager.getInstance();
    save.setSoundEnabled(false);
    save.setMusicEnabled(false);
    expect(save.getSoundEnabled()).toBe(false);
    expect(save.getMusicEnabled()).toBe(false);
    expect(stored()).toMatchObject({ soundEnabled: false, musicEnabled: false });
  });

  it('counts games and only raises the highest drink unlocked', () => {
    const save = SaveManager.getInstance();
    save.recordGamePlayed(5);
    save.recordGamePlayed(3);
    expect(save.getHighestDrinkUnlocked()).toBe(5);
    expect(stored()).toMatchObject({ totalGamesPlayed: 2, highestDrinkUnlocked: 5 });
  });
});
