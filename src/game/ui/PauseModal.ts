import Phaser from 'phaser';
import { GAME_CONFIG, LAYOUT } from '../config/gameConfig';
import { AudioManager } from '../systems/AudioManager';
import { UIButton } from './components/UIButton';
import { UIToggle, SettingBinding, SOUND_SETTING, MUSIC_SETTING } from './components/UIToggle';

export class PauseModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onResume: () => void;
  private onRestart: () => void;
  private onMenu: () => void;

  constructor(
    scene: Phaser.Scene,
    onResume: () => void,
    onRestart: () => void,
    onMenu: () => void
  ) {
    this.scene = scene;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onMenu = onMenu;
    this.container = this.scene.add.container(0, 0);
    this.container.setVisible(false);
    this.container.setDepth(100);
  }

  public show(): void {
    this.container.removeAll(true);
    this.container.setVisible(true);

    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const { CENTER_X, CENTER_Y } = LAYOUT.MODALS;
    const {
      CARD,
      TITLE_Y,
      HELP_BOX,
      TOGGLE_Y,
      SOUND_TOGGLE_X,
      MUSIC_TOGGLE_X,
      RESUME_BUTTON,
      RESTART_Y,
      MENU_Y
    } = LAYOUT.MODALS.PAUSE;

    // 1. Dark Backdrop
    const backdrop = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0c081e, 0.82);
    backdrop.setInteractive();

    // 2. Modal Card Group
    const cardGroup = this.scene.add.container(CENTER_X, CENTER_Y);

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x191432, 0.95);
    cardBg.fillRoundedRect(-CARD.WIDTH / 2, -CARD.HEIGHT / 2, CARD.WIDTH, CARD.HEIGHT, CARD.RADIUS);
    cardBg.lineStyle(3, 0x00b4d8, 0.8);
    cardBg.strokeRoundedRect(
      -CARD.WIDTH / 2,
      -CARD.HEIGHT / 2,
      CARD.WIDTH,
      CARD.HEIGHT,
      CARD.RADIUS
    );

    // Title
    const titleText = this.scene.add
      .text(0, TITLE_Y, 'GAME PAUSED', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#48cae4',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    // How to Play box
    const helpBg = this.scene.add.graphics();
    helpBg.fillStyle(0x231d42, 0.8);
    helpBg.fillRoundedRect(
      HELP_BOX.X,
      HELP_BOX.Y,
      HELP_BOX.WIDTH,
      HELP_BOX.HEIGHT,
      HELP_BOX.RADIUS
    );
    helpBg.lineStyle(1, 0xffffff, 0.15);
    helpBg.strokeRoundedRect(
      HELP_BOX.X,
      HELP_BOX.Y,
      HELP_BOX.WIDTH,
      HELP_BOX.HEIGHT,
      HELP_BOX.RADIUS
    );

    const helpTitle = this.scene.add
      .text(0, -135, 'HOW TO PLAY', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffd166'
      })
      .setOrigin(0.5);

    const helpBody = this.scene.add
      .text(
        0,
        -90,
        "🍹 Drag to aim & release to drop\n🍹 Merge identical drinks to level up\n🍹 Don't let the glass overflow!",
        {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '15px',
          color: '#e0e0ff',
          align: 'center',
          lineSpacing: 6
        }
      )
      .setOrigin(0.5);

    // Sound & Music Toggles Row
    const soundToggle = this.createToggleRow(SOUND_TOGGLE_X, TOGGLE_Y, 'Sound FX', SOUND_SETTING);
    const musicToggle = this.createToggleRow(MUSIC_TOGGLE_X, TOGGLE_Y, 'Music', MUSIC_SETTING);

    // Resume Button
    const resumeBtn = new UIButton(this.scene, 0, RESUME_BUTTON.Y, {
      variant: 'primary',
      width: RESUME_BUTTON.WIDTH,
      height: RESUME_BUTTON.HEIGHT,
      text: 'RESUME',
      label: 'Resume'
    });
    resumeBtn.on(UIButton.EVENTS.ACTIVATE, () => {
      this.hide();
      this.onResume();
    });

    // Restart Button
    const restartBtn = new UIButton(this.scene, 0, RESTART_Y, {
      variant: 'secondary',
      text: '🔄 Restart Game',
      label: 'Restart game',
      textStyle: { fontSize: '18px', fontStyle: 'bold', color: '#ffd166' }
    });
    restartBtn.on(UIButton.EVENTS.ACTIVATE, () => {
      AudioManager.getInstance().playRestart();
      this.hide();
      this.onRestart();
    });

    // Main Menu Button
    const menuBtn = new UIButton(this.scene, 0, MENU_Y, {
      variant: 'secondary',
      text: 'Main Menu'
    });
    menuBtn.on(UIButton.EVENTS.ACTIVATE, () => {
      this.hide();
      this.onMenu();
    });

    cardGroup.add([
      cardBg,
      titleText,
      helpBg,
      helpTitle,
      helpBody,
      soundToggle,
      musicToggle,
      resumeBtn,
      restartBtn,
      menuBtn
    ]);

    this.container.add([backdrop, cardGroup]);

    cardGroup.setScale(0.7);
    cardGroup.setAlpha(0);
    this.scene.tweens.add({
      targets: cardGroup,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  private createToggleRow(
    x: number,
    y: number,
    label: string,
    setting: SettingBinding
  ): Phaser.GameObjects.Container {
    const group = this.scene.add.container(x, y);

    const lbl = this.scene.add
      .text(0, -18, label, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#a0a0d0'
      })
      .setOrigin(0.5);

    const toggle = new UIToggle(this.scene, 0, 18, {
      variant: 'pill',
      width: 100,
      height: 36,
      setting,
      onText: 'ON',
      offText: 'OFF',
      label
    });

    group.add([lbl, toggle]);
    return group;
  }

  public hide(): void {
    this.container.setVisible(false);
  }
}
