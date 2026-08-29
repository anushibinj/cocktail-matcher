import { SPAWN } from '../config/gameConfig';

export class DrinkSpawner {
  static pickSpawnLevel(): number {
    const total = SPAWN.weights.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;

    for (const entry of SPAWN.weights) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.level;
      }
    }

    return SPAWN.weights[0].level;
  }
}
