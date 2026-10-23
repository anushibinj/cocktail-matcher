// Helpers that run inside the page (installed with page.addInitScript). Kept
// self-contained: Playwright serializes the function, so it can't close over
// imports. They read Phaser's display list generically, so they don't depend
// on which class owns a modal or button.

export interface ModalSnapshot {
  /** Text of every Text object in the open modal (titles, buttons, scores). */
  texts: string[];
  /** True once the card's pop-in has finished, so its buttons take taps. */
  ready: boolean;
}

export interface E2eHelpers {
  /** The open modal (a visible depth >= 100 container holding a card), or null. */
  modal(): ModalSnapshot | null;
  /** The modal's text object with exactly `text`, if any. */
  modalText(text: string): { alpha: number; visible: boolean; aboveCard: boolean } | null;
  /**
   * Fires `pointerdown` on the topmost interactive object at game point
   * (x, y), like a tap but within this frame (no input latency).
   */
  press(x: number, y: number): boolean;
  /** Presses the modal control labelled `text`, at any pop-in scale. */
  pressModalText(text: string): boolean;
}

declare global {
  interface Window {
    __e2e: E2eHelpers;
  }
}

export function installE2eHelpers(): void {
  type Obj = Phaser.GameObjects.GameObject & {
    visible?: boolean;
    depth?: number;
    alpha?: number;
    text?: string;
    list?: Obj[];
  };

  const findModal = (): { root: Obj; card: Phaser.GameObjects.Container } | null => {
    const game = window.__COCKTAIL__?.game;
    if (!game) return null;
    for (const scene of game.scene.getScenes(true)) {
      for (const obj of scene.children.list as Obj[]) {
        if (obj.type !== 'Container' || !obj.visible || (obj.depth ?? 0) < 100 || !obj.list?.length)
          continue;
        const card = obj.list.find((c) => c.type === 'Container');
        if (card) return { root: obj, card: card as unknown as Phaser.GameObjects.Container };
      }
    }
    return null;
  };

  const texts = (o: Obj, out: Obj[]): Obj[] => {
    if (o.type === 'Text') out.push(o);
    o.list?.forEach((c) => texts(c, out));
    return out;
  };

  window.__e2e = {
    modal() {
      const m = findModal();
      if (!m) return null;
      return {
        texts: texts(m.root, []).map((t) => t.text ?? ''),
        ready: m.card.scaleX >= 0.999 && m.card.alpha >= 0.999
      };
    },

    modalText(text) {
      const m = findModal();
      if (!m) return null;
      const t = texts(m.root, []).find((o) => o.text === text);
      if (!t) return null;
      const siblings = m.card.list as Obj[];
      const firstGraphics = siblings.findIndex((o) => o.type === 'Graphics');
      return {
        alpha: (t.alpha ?? 1) * m.card.alpha,
        visible: !!t.visible,
        aboveCard: siblings.indexOf(t) > firstGraphics
      };
    },

    press(x, y) {
      const game = window.__COCKTAIL__!.game;
      const scenes = game.scene.getScenes(true).reverse();
      for (const scene of scenes) {
        const input = scene.input;
        const hits = (input as unknown as { _list: Obj[] })._list.filter((o) => {
          const io = (o as unknown as { input?: { enabled: boolean } }).input;
          if (!io?.enabled || !o.willRender(scene.cameras.main)) return false;
          let p = (o as unknown as { parentContainer?: Obj }).parentContainer;
          for (; p; p = (p as unknown as { parentContainer?: Obj }).parentContainer) {
            if (!p.visible) return false;
          }
          const b = (o as unknown as Phaser.GameObjects.Components.GetBounds).getBounds();
          return b.contains(x, y);
        });
        if (!hits.length) continue;
        const sorted = input.sortGameObjects(
          hits as Phaser.GameObjects.GameObject[],
          input.activePointer
        );
        sorted[0].emit('pointerdown', input.activePointer, 0, 0, { stopPropagation() {} });
        return true;
      }
      return false;
    },

    pressModalText(text) {
      const m = findModal();
      const t = m && texts(m.root, []).find((o) => o.text === text);
      if (!t) return false;
      const b = (t as unknown as Phaser.GameObjects.Components.GetBounds).getBounds();
      return window.__e2e.press(b.centerX, b.centerY);
    }
  };
}
