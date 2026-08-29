export interface SaveData {
  version: 1;
  bestScore: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

const STORAGE_KEY = 'cocktail-merge-save-v1';

const DEFAULT_SAVE: SaveData = {
  version: 1,
  bestScore: 0,
  soundEnabled: true,
  musicEnabled: true,
};

export class SaveManager {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_SAVE };
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        version: 1,
        bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
        soundEnabled: parsed.soundEnabled !== false,
        musicEnabled: parsed.musicEnabled !== false,
      };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  static save(data: SaveData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  static updateBestScore(score: number): number {
    const data = SaveManager.load();
    if (score > data.bestScore) {
      data.bestScore = score;
      SaveManager.save(data);
    }
    return data.bestScore;
  }

  static setSoundEnabled(enabled: boolean): void {
    const data = SaveManager.load();
    data.soundEnabled = enabled;
    SaveManager.save(data);
  }

  static setMusicEnabled(enabled: boolean): void {
    const data = SaveManager.load();
    data.musicEnabled = enabled;
    SaveManager.save(data);
  }
}
