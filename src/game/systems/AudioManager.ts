import Phaser from 'phaser';
import { SaveManager } from '../../storage/SaveManager';

type SfxKey = 'drop' | 'collision' | 'merge' | 'score' | 'click' | 'gameOver' | 'restart';

export class AudioManager {
  private readonly audioContext: AudioContext;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicOscillator: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;

  constructor(_scene: Phaser.Scene) {
    this.audioContext = new AudioContext();
    const save = SaveManager.load();
    this.soundEnabled = save.soundEnabled;
    this.musicEnabled = save.musicEnabled;
  }

  private async ensureContext(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  playSfx(key: SfxKey): void {
    if (!this.soundEnabled) {
      return;
    }

    void this.ensureContext().then(() => {
      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      const settings: Record<SfxKey, { freq: number; duration: number; type: OscillatorType; volume: number }> = {
        drop: { freq: 220, duration: 0.08, type: 'sine', volume: 0.08 },
        collision: { freq: 140, duration: 0.05, type: 'triangle', volume: 0.05 },
        merge: { freq: 440, duration: 0.18, type: 'sine', volume: 0.12 },
        score: { freq: 660, duration: 0.12, type: 'square', volume: 0.06 },
        click: { freq: 520, duration: 0.04, type: 'sine', volume: 0.05 },
        gameOver: { freq: 110, duration: 0.35, type: 'sawtooth', volume: 0.08 },
        restart: { freq: 330, duration: 0.1, type: 'sine', volume: 0.07 },
      };

      const config = settings[key];
      osc.type = config.type;
      osc.frequency.setValueAtTime(config.freq, now);
      gain.gain.setValueAtTime(config.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
      osc.start(now);
      osc.stop(now + config.duration);
    });
  }

  startMusic(): void {
    if (!this.musicEnabled || this.musicOscillator) {
      return;
    }

    void this.ensureContext().then(() => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = 196;
      gain.gain.value = 0.015;
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      this.musicOscillator = osc;
      this.musicGain = gain;
    });
  }

  stopMusic(): void {
    this.musicOscillator?.stop();
    this.musicOscillator?.disconnect();
    this.musicGain?.disconnect();
    this.musicOscillator = null;
    this.musicGain = null;
  }

  toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    SaveManager.setSoundEnabled(this.soundEnabled);
    return this.soundEnabled;
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    SaveManager.setMusicEnabled(this.musicEnabled);
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }
}
