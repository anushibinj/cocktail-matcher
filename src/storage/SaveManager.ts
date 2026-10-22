import Phaser from 'phaser';
import { SaveData } from '../types/game';
import { GAME_CONFIG } from '../game/config/gameConfig';

/** Emitted on SaveManager.events after the sound or music setting changes. */
export const SETTINGS_CHANGED_EVENT = 'settingschanged';

export class SaveManager {
  private static instance: SaveManager;
  private data: SaveData;
  /** Lets every on-screen toggle refresh from one source of truth. */
  public readonly events = new Phaser.Events.EventEmitter();

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

  public getSoundEnabled(): boolean {
    return this.data.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.data.soundEnabled = enabled;
    this.save();
    this.events.emit(SETTINGS_CHANGED_EVENT);
  }

  public getMusicEnabled(): boolean {
    return this.data.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.data.musicEnabled = enabled;
    this.save();
    this.events.emit(SETTINGS_CHANGED_EVENT);
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
