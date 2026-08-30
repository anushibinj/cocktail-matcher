export interface DrinkDefinition {
  level: number;
  id: string;
  name: string;
  radius: number;
  baseScore: number;
  primaryColor: number; // Hex color for particles & liquid
  secondaryColor: number;
  accentColor: number;
  glassShape: 'tumbler' | 'martini' | 'highball' | 'hurricane' | 'chalice' | 'coconut' | 'tiki';
  garnish: 'lime' | 'berry' | 'pineapple' | 'orange' | 'mint' | 'umbrella' | 'starfruit' | 'flower' | 'straw' | 'sparkler';
  description: string;
}

export interface SaveData {
  version: number;
  bestScore: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  totalGamesPlayed: number;
  highestDrinkUnlocked: number;
}

export interface SpawnDistribution {
  level: number;
  weight: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
}
