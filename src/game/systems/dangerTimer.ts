/** How much faster the danger timer drains than it fills once the line is clear. */
export const DANGER_DECAY_RATE = 1.5;

export interface DangerTimerStep {
  /** Accumulated time in danger after this step, in ms. */
  timeInDanger: number;
  /** True when the timer has reached the grace period: the game is over. */
  triggered: boolean;
  /** True when the timer drained back to zero on this step: the warning can clear. */
  cleared: boolean;
}

/**
 * Advances the danger-line overflow timer by `delta` ms. While a drink is in
 * danger the timer accumulates and triggers at `grace` (inclusive); otherwise it
 * decays at `DANGER_DECAY_RATE`x speed, never below zero.
 */
export function stepDangerTimer(
  timeInDanger: number,
  delta: number,
  inDanger: boolean,
  grace: number
): DangerTimerStep {
  if (inDanger) {
    const next = timeInDanger + delta;
    return { timeInDanger: next, triggered: next >= grace, cleared: false };
  }
  if (timeInDanger > 0) {
    const next = Math.max(0, timeInDanger - delta * DANGER_DECAY_RATE);
    return { timeInDanger: next, triggered: false, cleared: next === 0 };
  }
  return { timeInDanger, triggered: false, cleared: false };
}
