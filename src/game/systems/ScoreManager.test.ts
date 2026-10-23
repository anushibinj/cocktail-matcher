import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { MemoryStorage, resetSaveManager, stubLocalStorage } from '../../test/storage';
import { SaveManager } from '../../storage/SaveManager';
import { ScoreManager } from './ScoreManager';

// ScoreManager only uses Phaser for the floating popup; keep the real engine out of Node.
vi.mock('phaser', () => ({ default: {} }));
vi.mock('./AudioManager', () => ({
  AudioManager: { getInstance: () => ({ playScorePopup: vi.fn() }) }
}));

function fakeScene() {
  const text = { setOrigin: vi.fn(), destroy: vi.fn() };
  return {
    add: { text: vi.fn(() => text) },
    tweens: { add: vi.fn((cfg: { onComplete: () => void }) => cfg.onComplete()) }
  };
}

let storage: MemoryStorage;

function startWithBest(best: number) {
  storage.setItem(GAME_CONFIG.STORAGE_KEY, JSON.stringify({ bestScore: best }));
  resetSaveManager();
  const onScoreChanged = vi.fn();
  const scene = fakeScene();
  const score = new ScoreManager(scene as unknown as Phaser.Scene, onScoreChanged);
  score.init();
  return { score, onScoreChanged, scene };
}

beforeEach(() => {
  storage = stubLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetSaveManager();
});

describe('ScoreManager best score and "new best"', () => {
  it('reports the stored best on init', () => {
    const { score, onScoreChanged } = startWithBest(500);
    expect(score.getScore()).toBe(0);
    expect(score.getBestScore()).toBe(500);
    expect(onScoreChanged).toHaveBeenLastCalledWith(0, 500, false);
  });

  it('a tie with the stored best is not a new best', () => {
    const { score, onScoreChanged } = startWithBest(500);
    score.addScore(500);
    expect(onScoreChanged).toHaveBeenLastCalledWith(500, 500, false);
    expect(score.hasBeatPreviousBest()).toBe(false);
    expect(SaveManager.getInstance().getBestScore()).toBe(500);
  });

  it('strictly beating the stored best is a new best and is persisted', () => {
    const { score, onScoreChanged } = startWithBest(500);
    score.addScore(501);
    expect(onScoreChanged).toHaveBeenLastCalledWith(501, 501, true);
    expect(score.getBestScore()).toBe(501);
    expect(score.hasBeatPreviousBest()).toBe(true);
    expect(JSON.parse(storage.getItem(GAME_CONFIG.STORAGE_KEY) ?? 'null').bestScore).toBe(501);
  });

  it('stays a new best for the rest of the run once beaten', () => {
    const { score } = startWithBest(100);
    score.addScore(150);
    score.addScore(10);
    expect(score.getScore()).toBe(160);
    expect(score.getBestScore()).toBe(160);
    expect(score.hasBeatPreviousBest()).toBe(true);
  });

  it('a run below the best leaves the best and the flag alone', () => {
    const { score } = startWithBest(1000);
    score.addScore(200);
    expect(score.getBestScore()).toBe(1000);
    expect(score.hasBeatPreviousBest()).toBe(false);
  });

  it('a zero score on a first run is not a new best', () => {
    const { score, onScoreChanged } = startWithBest(0);
    score.addScore(0);
    expect(onScoreChanged).toHaveBeenLastCalledWith(0, 0, false);
    expect(score.hasBeatPreviousBest()).toBe(false);
  });

  it('any positive first score beats an empty save', () => {
    const { score } = startWithBest(0);
    score.addScore(10);
    expect(score.hasBeatPreviousBest()).toBe(true);
  });

  it('reset starts a new run against the updated best', () => {
    const { score, onScoreChanged } = startWithBest(100);
    score.addScore(300);
    score.reset();
    expect(score.getScore()).toBe(0);
    expect(score.hasBeatPreviousBest()).toBe(false);
    expect(onScoreChanged).toHaveBeenLastCalledWith(0, 300, false);
    // Matching the previous run's record is not a new best
    score.addScore(300);
    expect(score.hasBeatPreviousBest()).toBe(false);
  });

  it('shows a floating popup when a position is given', () => {
    const { score, scene } = startWithBest(0);
    score.addScore(20, 100, 200);
    score.addScore(1000, 100, 200);
    expect(scene.add.text).toHaveBeenCalledTimes(2);
    expect(scene.tweens.add).toHaveBeenCalledTimes(2);
  });
});
