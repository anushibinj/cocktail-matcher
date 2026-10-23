/** The drink state the merge rule looks at. `Drink` satisfies this structurally. */
export interface MergeCandidate {
  level: number;
  isMerging: boolean;
  isDropped: boolean;
  active: boolean;
}

/**
 * Two drinks merge when both are active, dropped and not already merging, share a
 * level, and that level is below `maxLevel` (the top tier never merges further).
 */
export function canMerge(a: MergeCandidate, b: MergeCandidate, maxLevel: number): boolean {
  return (
    a.active &&
    b.active &&
    a.isDropped &&
    b.isDropped &&
    !a.isMerging &&
    !b.isMerging &&
    a.level === b.level &&
    a.level < maxLevel
  );
}
