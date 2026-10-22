import Phaser from 'phaser';
import { AudioManager } from '../../systems/AudioManager';

/**
 * - primary: wide sprite background (`ui_btn_primary`) with a caption
 * - secondary: a bare text link
 * - icon: round sprite background (`ui_btn_circle`) with a glyph
 * - pill: rounded rect that is filled on/off (used by UIToggle)
 */
export type UIButtonVariant = 'primary' | 'secondary' | 'icon' | 'pill';

export type UIButtonState = 'idle' | 'hover' | 'pressed' | 'disabled';

export interface UIButtonConfirmConfig {
  /** Text shown while waiting for the confirming second activation. */
  text: string;
  label?: string;
  /** Reverts to the normal text if not confirmed in time. */
  timeoutMs?: number;
}

export interface UIButtonConfig {
  variant: UIButtonVariant;
  /** Caption (primary, secondary, pill) or glyph (icon). */
  text: string;
  /** Accessible name (for A11Y003); defaults to `text`. */
  label?: string;
  /** Background size; secondary buttons size to their text. */
  width?: number;
  height?: number;
  /** Background texture key for primary and icon variants. */
  texture?: string;
  /** Merged over the variant's default text style. */
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  /** Secondary text color while hovered. */
  hoverColor?: string;
  /** The hit area is at least this wide and tall, centered (for A11Y004). */
  minHitSize?: number;
  /** Plays the shared click SFX on activation (default true). */
  clickSound?: boolean;
  /** Requires a second activation before 'activate' fires (for UX009). */
  confirm?: UIButtonConfirmConfig;
}

const FONT_FAMILY = 'Segoe UI, system-ui, sans-serif';

const DEFAULT_TEXT_STYLE: Record<UIButtonVariant, Phaser.Types.GameObjects.Text.TextStyle> = {
  primary: { fontFamily: FONT_FAMILY, fontSize: '20px', fontStyle: 'bold', color: '#ffffff' },
  secondary: { fontFamily: FONT_FAMILY, fontSize: '16px', color: '#a0a0c0' },
  icon: { fontSize: '20px', color: '#ffffff' },
  pill: { fontFamily: FONT_FAMILY, fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }
};

// Content scale per state; hover/press feedback never moves the hit zone.
const STATE_SCALE: Record<UIButtonVariant, Record<UIButtonState, number>> = {
  primary: { idle: 1, hover: 1.05, pressed: 0.96, disabled: 1 },
  secondary: { idle: 1, hover: 1, pressed: 0.95, disabled: 1 },
  icon: { idle: 1, hover: 1.08, pressed: 0.92, disabled: 1 },
  pill: { idle: 1, hover: 1.04, pressed: 0.95, disabled: 1 }
};

const PILL_ON_COLOR = 0x06d6a0;
const PILL_OFF_COLOR = 0x4a4565;
const FOCUS_RING_COLOR = 0xffd166;
const FOCUS_RING_PAD = 6;
const DISABLED_ALPHA = 0.45;
const DEFAULT_CONFIRM_TIMEOUT_MS = 3000;

/**
 * Shared button: a container holding the visuals plus an invisible hit zone.
 *
 * It fires 'activate' when a press that started on the button is released
 * over it, so the press never reaches DrinkSpawner as an aiming gesture
 * (BUG003) and dragging off before releasing cancels. activate() is the
 * hook for keyboard activation.
 */
export class UIButton extends Phaser.GameObjects.Container {
  public static readonly EVENTS = {
    ACTIVATE: 'activate',
    CONFIRM_REQUESTED: 'confirmrequested'
  } as const;

  protected readonly variant: UIButtonVariant;
  protected readonly content: Phaser.GameObjects.Container;
  protected readonly labelText: Phaser.GameObjects.Text;
  protected readonly hitZone: Phaser.GameObjects.Zone;
  private readonly background?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
  private readonly focusRing: Phaser.GameObjects.Graphics;
  private readonly baseColor: string;
  private readonly hoverColor: string;
  private readonly clickSound: boolean;
  private readonly confirmConfig?: UIButtonConfirmConfig;
  private readonly visualWidth: number;
  private readonly visualHeight: number;

  private text: string;
  private label: string;
  private visualState: UIButtonState = 'idle';
  private enabled = true;
  private focused = false;
  private pillOn = false;
  private isHovered = false;
  private pressedPointerId: number | null = null;
  private pressedDownTime = 0;
  private confirming = false;
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: UIButtonConfig) {
    super(scene, x, y);
    this.variant = config.variant;
    this.text = config.text;
    this.label = config.label ?? config.text;
    this.clickSound = config.clickSound ?? true;
    this.confirmConfig = config.confirm;

    const style = { ...DEFAULT_TEXT_STYLE[this.variant], ...config.textStyle };
    this.baseColor = (style.color as string) ?? '#ffffff';
    this.hoverColor = config.hoverColor ?? '#ffffff';

    this.content = new Phaser.GameObjects.Container(scene, 0, 0);
    this.labelText = new Phaser.GameObjects.Text(scene, 0, 0, this.text, style).setOrigin(0.5);

    if (this.variant === 'primary' || this.variant === 'icon') {
      const texture =
        config.texture ?? (this.variant === 'primary' ? 'ui_btn_primary' : 'ui_btn_circle');
      const sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, texture);
      if (config.width !== undefined && config.height !== undefined) {
        sprite.setDisplaySize(config.width, config.height);
      }
      this.background = sprite;
      this.visualWidth = sprite.displayWidth;
      this.visualHeight = sprite.displayHeight;
    } else if (this.variant === 'pill') {
      this.background = new Phaser.GameObjects.Graphics(scene);
      this.visualWidth = config.width ?? 100;
      this.visualHeight = config.height ?? 36;
    } else {
      this.visualWidth = config.width ?? this.labelText.width;
      this.visualHeight = config.height ?? this.labelText.height;
    }

    if (this.background) this.content.add(this.background);
    this.content.add(this.labelText);

    this.focusRing = new Phaser.GameObjects.Graphics(scene);
    this.focusRing.setVisible(false);

    const minHit = config.minHitSize ?? 0;
    this.hitZone = new Phaser.GameObjects.Zone(
      scene,
      0,
      0,
      Math.max(this.visualWidth, minHit),
      Math.max(this.visualHeight, minHit)
    );
    this.hitZone.setInteractive({ useHandCursor: true });

    this.add([this.focusRing, this.content, this.hitZone]);
    this.setSize(this.hitZone.width, this.hitZone.height);
    this.drawPill();
    this.drawFocusRing();
    this.bindPointerEvents();

    this.once(Phaser.GameObjects.Events.DESTROY, () => this.clearConfirmTimer());
    scene.add.existing(this);
  }

  /** Activates as if clicked (keyboard hook for A11Y002). Returns false when disabled. */
  public activate(): boolean {
    if (!this.enabled) return false;
    if (this.clickSound) AudioManager.getInstance().playButtonClick();

    if (this.confirmConfig && !this.confirming) {
      this.setConfirming(true);
      this.emit(UIButton.EVENTS.CONFIRM_REQUESTED, this);
      return true;
    }

    this.setConfirming(false);
    this.emit(UIButton.EVENTS.ACTIVATE, this);
    return true;
  }

  public setText(text: string): this {
    this.text = text;
    if (!this.confirming) this.labelText.setText(text);
    return this;
  }

  /** Accessible name for assistive tech. */
  public get accessibleLabel(): string {
    return this.confirming && this.confirmConfig
      ? (this.confirmConfig.label ?? this.confirmConfig.text)
      : this.label;
  }

  public setAccessibleLabel(label: string): this {
    this.label = label;
    return this;
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  public get isConfirming(): boolean {
    return this.confirming;
  }

  public get buttonState(): UIButtonState {
    return this.visualState;
  }

  public setEnabled(enabled: boolean): this {
    if (this.enabled === enabled) return this;
    this.enabled = enabled;
    this.pressedPointerId = null;
    if (enabled) {
      this.hitZone.setInteractive();
    } else {
      this.hitZone.disableInteractive();
      this.setConfirming(false);
    }
    this.applyState(enabled ? 'idle' : 'disabled');
    return this;
  }

  /** Shows or hides the focus ring; focus navigation itself is A11Y002. */
  public setFocused(focused: boolean): this {
    this.focused = focused;
    this.focusRing.setVisible(focused);
    return this;
  }

  public get isFocused(): boolean {
    return this.focused;
  }

  /** Fill state of the pill variant. */
  protected setPillOn(on: boolean): void {
    this.pillOn = on;
    this.drawPill();
  }

  private bindPointerEvents(): void {
    this.hitZone.on(
      Phaser.Input.Events.GAMEOBJECT_POINTER_OVER,
      (pointer: Phaser.Input.Pointer) => {
        this.isHovered = true;
        this.applyState(this.isPressedBy(pointer) && pointer.isDown ? 'pressed' : 'hover');
      }
    );

    this.hitZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.isHovered = false;
      this.applyState('idle');
    });

    this.hitZone.on(
      Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        // Only the first finger on a button owns it
        if (this.pressedPointerId !== null && this.pressedPointerId !== pointer.id) return;
        this.pressedPointerId = pointer.id;
        this.pressedDownTime = pointer.downTime;
        this.applyState('pressed');
      }
    );

    this.hitZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      // downTime tells this press apart from an earlier one with the same
      // pointer id that was released elsewhere (drag off, release outside).
      const pressed = this.isPressedBy(pointer);
      this.pressedPointerId = null;
      this.applyState(this.isHovered && !pointer.wasTouch ? 'hover' : 'idle');
      if (pressed && !pointer.wasCanceled) this.activate();
    });
  }

  private isPressedBy(pointer: Phaser.Input.Pointer): boolean {
    return this.pressedPointerId === pointer.id && this.pressedDownTime === pointer.downTime;
  }

  private applyState(state: UIButtonState): void {
    if (!this.enabled) state = 'disabled';
    this.visualState = state;
    this.content.setScale(STATE_SCALE[this.variant][state]);
    this.content.setAlpha(state === 'disabled' ? DISABLED_ALPHA : 1);
    if (this.variant === 'secondary') {
      this.labelText.setColor(
        state === 'hover' || state === 'pressed' ? this.hoverColor : this.baseColor
      );
    }
  }

  private setConfirming(confirming: boolean): void {
    this.clearConfirmTimer();
    this.confirming = confirming;
    this.labelText.setText(confirming && this.confirmConfig ? this.confirmConfig.text : this.text);
    if (confirming && this.confirmConfig) {
      // A real timer: the scene clock is paused under the pause modal
      this.confirmTimer = setTimeout(
        () => this.setConfirming(false),
        this.confirmConfig.timeoutMs ?? DEFAULT_CONFIRM_TIMEOUT_MS
      );
    }
  }

  private clearConfirmTimer(): void {
    if (this.confirmTimer !== null) {
      clearTimeout(this.confirmTimer);
      this.confirmTimer = null;
    }
  }

  private drawPill(): void {
    if (this.variant !== 'pill' || !(this.background instanceof Phaser.GameObjects.Graphics))
      return;
    const w = this.visualWidth;
    const h = this.visualHeight;
    const g = this.background;
    g.clear();
    g.fillStyle(this.pillOn ? PILL_ON_COLOR : PILL_OFF_COLOR, 0.9);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.5, 0xffffff, 0.3);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  }

  private drawFocusRing(): void {
    const w = this.visualWidth + FOCUS_RING_PAD * 2;
    const h = this.visualHeight + FOCUS_RING_PAD * 2;
    this.focusRing.clear();
    this.focusRing.lineStyle(3, FOCUS_RING_COLOR, 1);
    if (this.variant === 'icon') {
      this.focusRing.strokeCircle(0, 0, Math.max(w, h) / 2);
    } else {
      this.focusRing.strokeRoundedRect(-w / 2, -h / 2, w, h, Math.min(h / 2, 18));
    }
  }
}
