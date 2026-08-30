import { SaveManager } from '../../storage/SaveManager';

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private bgmInterval: number | null = null;
  private isBgmPlaying: boolean = false;

  private constructor() {
    // Lazy initialize on first interaction
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(SaveManager.getInstance().getSoundEnabled() ? 0.7 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(SaveManager.getInstance().getMusicEnabled() ? 0.18 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      const unlock = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        if (SaveManager.getInstance().getMusicEnabled() && !this.isBgmPlaying) {
          this.startBgm();
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };

      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    SaveManager.getInstance().setSoundEnabled(enabled);
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(enabled ? 0.7 : 0, this.ctx.currentTime);
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    SaveManager.getInstance().setMusicEnabled(enabled);
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(enabled ? 0.18 : 0, this.ctx.currentTime);
    }
    if (enabled) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  // Play a soft bubble drop sound
  public playDrop(): void {
    if (!this.canPlaySfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Play subtle collision clink
  public playCollision(intensity: number = 0.5): void {
    if (!this.canPlaySfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    const freq = 600 + Math.random() * 300;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.05);

    const vol = Math.min(0.2, Math.max(0.02, intensity * 0.15));
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Musical notes for merges (C Pentatonic / Diatonic ascending scale)
  private mergePitches = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50, // C6
    1318.51  // E6
  ];

  public playMerge(level: number): void {
    if (!this.canPlaySfx()) return;
    const now = this.ctx!.currentTime;
    const baseFreq = this.mergePitches[Math.min(level, this.mergePitches.length - 1)] || 440;

    // Harmonic bell/marimba sound
    const osc1 = this.ctx!.createOscillator();
    const osc2 = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    // Subtle overtone for sparkle
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2.01, now);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);

    // For higher tiers (level >= 6), play a secondary celebratory sparkle note
    if (level >= 6) {
      setTimeout(() => {
        if (!this.canPlaySfx()) return;
        const subNow = this.ctx!.currentTime;
        const sparkle = this.ctx!.createOscillator();
        const sGain = this.ctx!.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(baseFreq * 1.5, subNow);
        sGain.gain.setValueAtTime(0.3, subNow);
        sGain.gain.exponentialRampToValueAtTime(0.001, subNow + 0.4);
        sparkle.connect(sGain);
        sGain.connect(this.sfxGain!);
        sparkle.start(subNow);
        sparkle.stop(subNow + 0.41);
      }, 70);
    }
  }

  public playScorePopup(): void {
    if (!this.canPlaySfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1174, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playButtonClick(): void {
    if (!this.canPlaySfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playGameOver(): void {
    if (!this.canPlaySfx()) return;
    const now = this.ctx!.currentTime;
    const notes = [392, 349.23, 311.13, 261.63]; // Descending melancholy notes
    notes.forEach((freq, index) => {
      const startTime = now + index * 0.18;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  public playRestart(): void {
    if (!this.canPlaySfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  // Chill ambient tropical chords synth progression
  private startBgm(): void {
    if (this.bgmInterval || !this.ctx) return;
    this.isBgmPlaying = true;

    // Chord progressions in C Major / A Minor: Fmaj7 -> G6 -> Em7 -> Am7
    const chords = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
      [196.00, 246.94, 293.66, 392.00], // G6 (G3, B3, D4, G4)
      [164.81, 196.00, 246.94, 329.63], // Em7 (E3, G3, B3, E4)
      [220.00, 261.63, 329.63, 440.00]  // Am (A3, C4, E4, A4)
    ];

    let chordIndex = 0;
    const playNextChord = () => {
      if (!this.ctx || !SaveManager.getInstance().getMusicEnabled()) return;
      const now = this.ctx.currentTime;
      const chord = chords[chordIndex];
      chordIndex = (chordIndex + 1) % chords.length;

      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Soft pad envelope
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.6);
        gain.gain.setValueAtTime(0.04, now + 2.0);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

        osc.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(now);
        osc.stop(now + 3.5);
      });
    };

    playNextChord();
    this.bgmInterval = window.setInterval(playNextChord, 3200);
  }

  private stopBgm(): void {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.isBgmPlaying = false;
  }

  private canPlaySfx(): boolean {
    return !!(this.ctx && SaveManager.getInstance().getSoundEnabled() && this.sfxGain);
  }
}
