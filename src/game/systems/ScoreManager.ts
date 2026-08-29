export class ScoreManager {
  private score = 0;
  private bestScore: number;

  constructor(bestScore: number) {
    this.bestScore = bestScore;
  }

  add(points: number): { score: number; bestScore: number; isNewBest: boolean } {
    this.score += points;
    const isNewBest = this.score > this.bestScore;
    if (isNewBest) {
      this.bestScore = this.score;
    }
    return {
      score: this.score,
      bestScore: this.bestScore,
      isNewBest,
    };
  }

  get current(): number {
    return this.score;
  }

  get best(): number {
    return this.bestScore;
  }

  reset(bestScore: number): void {
    this.score = 0;
    this.bestScore = bestScore;
  }
}
