import { SaveData } from '../types/game';
import { GAME_CONFIG } from '../game/config/gameConfig';

export class SaveManager {
  private static instance: SaveManager;
  private data: SaveData;
  // Lets every on-screen toggle refresh from one source of truth. A plain
  // set rather than a Phaser emitter keeps this module loadable in Node tests.
  private settingsListeners = new Set<() => void>();

  private constructor() {
    this.data = this.load();
  }

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  private getDefaultData(): SaveData {
    return {
      version: 1,
      bestScore: 0,
      soundEnabled: true,
      musicEnabled: true,
      totalGamesPlayed: 0,
      highestDrinkUnlocked: 0
    };
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.bestScore === 'number') {
          return {
            ...this.getDefaultData(),
            ...parsed
          };
        }
      }
    } catch (e) {
      console.warn('LocalStorage unavailable or corrupt, using memory defaults', e);
    }
    return this.getDefaultData();
  }

  private save(): void {
    try {
      localStorage.setItem(GAME_CONFIG.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save data to LocalStorage', e);
    }
  }

  public getBestScore(): number {
    return this.data.bestScore;
  }

  public setBestScore(score: number): boolean {
    if (score > this.data.bestScore) {
      this.data.bestScore = score;
      this.save();
      return true; // New record!
    }
    return false;
  }

  /** Calls `listener` after the sound or music setting changes; returns an unsubscribe. */
  public onSettingsChanged(listener: () => void): () => void {
    this.settingsListeners.add(listener);
    return () => this.settingsListeners.delete(listener);
  }

  private emitSettingsChanged(): void {
    this.settingsListeners.forEach((listener) => listener());
  }

  public getSoundEnabled(): boolean {
    return this.data.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.data.soundEnabled = enabled;
    this.save();
    this.emitSettingsChanged();
  }

  public getMusicEnabled(): boolean {
    return this.data.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.data.musicEnabled = enabled;
    this.save();
    this.emitSettingsChanged();
  }

  public recordGamePlayed(highestLevel: number): void {
    this.data.totalGamesPlayed += 1;
    if (highestLevel > this.data.highestDrinkUnlocked) {
      this.data.highestDrinkUnlocked = highestLevel;
    }
    this.save();
  }

  public getHighestDrinkUnlocked(): number {
    return this.data.highestDrinkUnlocked;
  }
}
