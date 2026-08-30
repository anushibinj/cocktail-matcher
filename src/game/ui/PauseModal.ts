import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../../storage/SaveManager';

export class PauseModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onResume: () => void;
  private onRestart: () => void;
  private onMenu: () => void;
  private onSettingsChanged: () => void;

  constructor(
    scene: Phaser.Scene,
    onResume: () => void,
    onRestart: () => void,
    onMenu: () => void,
    onSettingsChanged: () => void
  ) {
    this.scene = scene;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onMenu = onMenu;
    this.onSettingsChanged = onSettingsChanged;
    this.container = this.scene.add.container(0, 0);
    this.container.setVisible(false);
    this.container.setDepth(100);
  }

  public show(): void {
    this.container.removeAll(true);
    this.container.setVisible(true);

    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // 1. Dark Backdrop
    const backdrop = this.scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0c081e, 0.82);
    backdrop.setInteractive();

    // 2. Modal Card Group
    const cardGroup = this.scene.add.container(WIDTH / 2, HEIGHT / 2);

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x191432, 0.95);
    cardBg.fillRoundedRect(-240, -250, 480, 500, 24);
    cardBg.lineStyle(3, 0x00b4d8, 0.8);
    cardBg.strokeRoundedRect(-240, -250, 480, 500, 24);

    // Title
    const titleText = this.scene.add.text(0, -200, 'GAME PAUSED', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#48cae4',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // How to Play box
    const helpBg = this.scene.add.graphics();
    helpBg.fillStyle(0x231d42, 0.8);
    helpBg.fillRoundedRect(-200, -150, 400, 110, 12);
    helpBg.lineStyle(1, 0xffffff, 0.15);
    helpBg.strokeRoundedRect(-200, -150, 400, 110, 12);

    const helpTitle = this.scene.add.text(0, -135, 'HOW TO PLAY', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffd166'
    }).setOrigin(0.5);

    const helpBody = this.scene.add.text(0, -90, '🍹 Drag to aim & release to drop\n🍹 Merge identical drinks to level up\n🍹 Don\'t let the glass overflow!', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '15px',
      color: '#e0e0ff',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);

    // Sound & Music Toggles Row
    const soundToggle = this.createToggleRow(
      -100,
      -10,
      'Sound FX',
      SaveManager.getInstance().getSoundEnabled(),
      (val) => {
        AudioManager.getInstance().setSoundEnabled(val);
        this.onSettingsChanged();
      }
    );

    const musicToggle = this.createToggleRow(
      100,
      -10,
      'Music',
      SaveManager.getInstance().getMusicEnabled(),
      (val) => {
        AudioManager.getInstance().setMusicEnabled(val);
        this.onSettingsChanged();
      }
    );

    // Resume Button
    const resumeBtn = this.scene.add.sprite(0, 75, 'ui_btn_primary').setDisplaySize(240, 60);
    resumeBtn.setInteractive({ useHandCursor: true });
    const resumeText = this.scene.add.text(0, 75, 'RESUME', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    resumeBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      this.hide();
      this.onResume();
    });

    // Restart Button
    const restartBtn = this.scene.add.text(0, 145, '🔄 Restart Game', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd166'
    }).setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      AudioManager.getInstance().playRestart();
      this.hide();
      this.onRestart();
    });

    // Main Menu Button
    const menuBtn = this.scene.add.text(0, 195, 'Main Menu', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '16px',
      color: '#a0a0c0'
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      this.hide();
      this.onMenu();
    });

    cardGroup.add([
      cardBg, titleText,
      helpBg, helpTitle, helpBody,
      soundToggle, musicToggle,
      resumeBtn, resumeText,
      restartBtn, menuBtn
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
    initialVal: boolean,
    onToggle: (val: boolean) => void
  ): Phaser.GameObjects.Container {
    const group = this.scene.add.container(x, y);

    const lbl = this.scene.add.text(0, -18, label, {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#a0a0d0'
    }).setOrigin(0.5);

    const btnBg = this.scene.add.graphics();
    let isEnabled = initialVal;

    const renderBtn = () => {
      btnBg.clear();
      btnBg.fillStyle(isEnabled ? 0x06d6a0 : 0x4a4565, 0.9);
      btnBg.fillRoundedRect(-50, 0, 100, 36, 18);
      btnBg.lineStyle(1.5, 0xffffff, 0.3);
      btnBg.strokeRoundedRect(-50, 0, 100, 36, 18);
    };
    renderBtn();

    const statusText = this.scene.add.text(0, 18, isEnabled ? 'ON' : 'OFF', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const hitZone = this.scene.add.zone(0, 18, 100, 36);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      AudioManager.getInstance().playButtonClick();
      isEnabled = !isEnabled;
      renderBtn();
      statusText.setText(isEnabled ? 'ON' : 'OFF');
      onToggle(isEnabled);
    });

    group.add([lbl, btnBg, statusText, hitZone]);
    return group;
  }

  public hide(): void {
    this.container.setVisible(false);
  }
}
