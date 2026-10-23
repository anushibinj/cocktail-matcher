import { describe, expect, it } from 'vitest';
import { DANGER_DECAY_RATE, stepDangerTimer } from './dangerTimer';

const GRACE = 2000;

describe('stepDangerTimer', () => {
  it('accumulates while a drink is in danger', () => {
    expect(stepDangerTimer(0, 16, true, GRACE)).toEqual({
      timeInDanger: 16,
      triggered: false,
      cleared: false
    });
    expect(stepDangerTimer(500, 100, true, GRACE).timeInDanger).toBe(600);
  });

  it('does not trigger just below the grace period', () => {
    expect(stepDangerTimer(1900, 99, true, GRACE).triggered).toBe(false);
  });

  it('triggers exactly at the grace period', () => {
    const step = stepDangerTimer(1984, 16, true, GRACE);
    expect(step.timeInDanger).toBe(GRACE);
    expect(step.triggered).toBe(true);
  });

  it('uses the grace period it is given', () => {
    expect(stepDangerTimer(399, 100, true, 500).triggered).toBe(false);
    expect(stepDangerTimer(400, 100, true, 500).triggered).toBe(true);
  });

  it('triggers past the grace period', () => {
    expect(stepDangerTimer(1990, 50, true, GRACE).triggered).toBe(true);
  });

  it('decays faster than it accumulates once the line is clear', () => {
    expect(DANGER_DECAY_RATE).toBe(1.5);
    expect(stepDangerTimer(1000, 100, false, GRACE)).toEqual({
      timeInDanger: 850,
      triggered: false,
      cleared: false
    });
  });

  it('clamps at zero and reports the warning as cleared', () => {
    expect(stepDangerTimer(100, 100, false, GRACE)).toEqual({
      timeInDanger: 0,
      triggered: false,
      cleared: true
    });
  });

  it('does not clear when decay stops just above zero', () => {
    expect(stepDangerTimer(100, 66, false, GRACE)).toEqual({
      timeInDanger: 1,
      triggered: false,
      cleared: false
    });
  });

  it('clears when decay lands exactly on zero', () => {
    expect(stepDangerTimer(150, 100, false, GRACE).cleared).toBe(true);
  });

  it('is a no-op at rest, without re-reporting a clear', () => {
    expect(stepDangerTimer(0, 16, false, GRACE)).toEqual({
      timeInDanger: 0,
      triggered: false,
      cleared: false
    });
  });

  it('a short dip into danger followed by a clear never ends the game', () => {
    let t = 0;
    for (let i = 0; i < 60; i++) t = stepDangerTimer(t, 16, true, GRACE).timeInDanger;
    expect(t).toBe(960);
    let cleared = false;
    for (let i = 0; i < 40 && !cleared; i++) {
      const step = stepDangerTimer(t, 16, false, GRACE);
      t = step.timeInDanger;
      cleared = step.cleared;
    }
    expect(t).toBe(0);
    expect(cleared).toBe(true);
  });
});
