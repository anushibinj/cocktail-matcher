import { vi } from 'vitest';
import { SaveManager } from '../storage/SaveManager';

/** A minimal in-memory `localStorage`, installed on `globalThis` for Node tests. */
export class MemoryStorage {
  readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/** Installs a fresh `MemoryStorage` as the global `localStorage` and returns it. */
export function stubLocalStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  return storage;
}

/** Drops the `SaveManager` singleton so the next `getInstance()` reloads from storage. */
export function resetSaveManager(): void {
  (SaveManager as unknown as { instance?: SaveManager }).instance = undefined;
}
