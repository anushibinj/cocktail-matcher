import { defineConfig } from 'vitest/config';

// Unit tests for the pure game rules. They run in plain Node and never boot Phaser.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/game/config/drinks.ts',
        'src/game/systems/spawnPicker.ts',
        'src/game/systems/mergeRules.ts',
        'src/game/systems/dangerTimer.ts',
        'src/game/systems/ScoreManager.ts',
        'src/storage/SaveManager.ts'
      ],
      thresholds: { lines: 90 }
    }
  }
});
