import Phaser from 'phaser';
import { SaveManager } from '../../../storage/SaveManager';
import { AudioManager } from '../../systems/AudioManager';
import { UIButton, UIButtonConfig } from './UIButton';

/** A boolean setting a toggle reads from and writes to. */
export interface SettingBinding {
  read(): boolean;
  write(value: boolean): void;
}

// Writes go through AudioManager so the gains change too; SaveManager then
// notifies its settings listeners and every toggle refreshes.
export const SOUND_SETTING: SettingBinding = {
  read: () => SaveManager.getInstance().getSoundEnabled(),
  write: (value) => AudioManager.getInstance().setSoundEnabled(value)
};

export const MUSIC_SETTING: SettingBinding = {
  read: () => SaveManager.getInstance().getMusicEnabled(),
  write: (value) => AudioManager.getInstance().setMusicEnabled(value)
};

export interface UIToggleConfig extends Omit<UIButtonConfig, 'text' | 'label' | 'confirm'> {
  setting: SettingBinding;
  /** Text or glyph shown for each value. */
  onText: string;
  offText: string;
  /** Accessible name of the setting; the value is appended ("Music: on"). */
  label: string;
}

/** A UIButton bound to a SaveManager setting that stays in sync everywhere. */
export class UIToggle extends UIButton {
  private readonly setting: SettingBinding;
  private readonly onText: string;
  private readonly offText: string;
  private readonly settingLabel: string;

  constructor(scene: Phaser.Scene, x: number, y: number, config: UIToggleConfig) {
    const value = config.setting.read();
    super(scene, x, y, {
      ...config,
      text: value ? config.onText : config.offText,
      label: config.label
    });
    this.setting = config.setting;
    this.onText = config.onText;
    this.offText = config.offText;
    this.settingLabel = config.label;
    this.refresh();

    this.on(UIButton.EVENTS.ACTIVATE, () => this.setting.write(!this.setting.read()));

    const unsubscribe = SaveManager.getInstance().onSettingsChanged(() => this.refresh());
    this.once(Phaser.GameObjects.Events.DESTROY, unsubscribe);
  }

  public get value(): boolean {
    return this.setting.read();
  }

  private refresh(): void {
    const value = this.setting.read();
    this.setText(value ? this.onText : this.offText);
    this.setPillOn(value);
    this.setAccessibleLabel(`${this.settingLabel}: ${value ? 'on' : 'off'}`);
  }
}
