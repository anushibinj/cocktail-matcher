import { DrinkDefinition } from '../../types/game';

export const DRINKS: DrinkDefinition[] = [
  {
    level: 0,
    id: 'citrus_splash',
    name: 'Citrus Splash',
    radius: 26,
    baseScore: 10,
    primaryColor: 0x9be15d,    // Lime green
    secondaryColor: 0xffeb3b,  // Lemon yellow
    accentColor: 0xffffff,
    glassShape: 'tumbler',
    garnish: 'lime',
    description: 'A zesty squeeze of fresh lime and lemon over crushed ice.'
  },
  {
    level: 1,
    id: 'berry_fizz',
    name: 'Berry Fizz',
    radius: 34,
    baseScore: 20,
    primaryColor: 0xff4b72,    // Berry pink
    secondaryColor: 0xff85a0,  // Soft strawberry
    accentColor: 0xffffff,
    glassShape: 'tumbler',
    garnish: 'berry',
    description: 'Sparkling wild berries with fizzing bubbly soda.'
  },
  {
    level: 2,
    id: 'pineapple_cooler',
    name: 'Pineapple Cooler',
    radius: 43,
    baseScore: 40,
    primaryColor: 0xffb703,    // Bright pineapple
    secondaryColor: 0xfd9e02,  // Warm amber
    accentColor: 0x48cae4,
    glassShape: 'highball',
    garnish: 'pineapple',
    description: 'Sweet golden pineapple nectar freshly chilled.'
  },
  {
    level: 3,
    id: 'sunset_cooler',
    name: 'Sunset Cooler',
    radius: 53,
    baseScore: 80,
    primaryColor: 0xfb5607,    // Sunset orange
    secondaryColor: 0xff006e,  // Crimson pink
    accentColor: 0xffbe0b,
    glassShape: 'highball',
    garnish: 'orange',
    description: 'Rich orange and grenadine sunset layers with an orange wheel.'
  },
  {
    level: 4,
    id: 'mint_lime',
    name: 'Mint Lime',
    radius: 64,
    baseScore: 160,
    primaryColor: 0x2ec4b6,    // Mint teal
    secondaryColor: 0xcbf3f0,  // Mint frost
    accentColor: 0x70e000,
    glassShape: 'highball',
    garnish: 'mint',
    description: 'Crisp spearmint leaves muddled with lime and sparkling water.'
  },
  {
    level: 5,
    id: 'tropical_punch',
    name: 'Tropical Punch',
    radius: 76,
    baseScore: 320,
    primaryColor: 0xd90429,    // Ruby red
    secondaryColor: 0xef233c,  // Bright red
    accentColor: 0xffb703,
    glassShape: 'hurricane',
    garnish: 'umbrella',
    description: 'Exotic island fruit punch topped with a cute cocktail umbrella.'
  },
  {
    level: 6,
    id: 'island_breeze',
    name: 'Island Breeze',
    radius: 89,
    baseScore: 640,
    primaryColor: 0x00b4d8,    // Caribbean cyan
    secondaryColor: 0x90e0ef,  // Shallow reef blue
    accentColor: 0xffd166,
    glassShape: 'hurricane',
    garnish: 'starfruit',
    description: 'Refreshing Caribbean breeze with starfruit garnish.'
  },
  {
    level: 7,
    id: 'blue_lagoon',
    name: 'Blue Lagoon',
    radius: 103,
    baseScore: 1280,
    primaryColor: 0x3a0ca3,    // Deep electric blue
    secondaryColor: 0x4cc9f0,  // Electric cyan glow
    accentColor: 0x7209b7,
    glassShape: 'hurricane',
    garnish: 'straw',
    description: 'Luminous blue curaçao cocktail with neon glow.'
  },
  {
    level: 8,
    id: 'passion_colada',
    name: 'Passion Colada',
    radius: 118,
    baseScore: 2560,
    primaryColor: 0xffaa00,    // Passionfruit gold
    secondaryColor: 0xffeedd,  // Coconut cream
    accentColor: 0xff5400,
    glassShape: 'coconut',
    garnish: 'flower',
    description: 'Creamy coconut cream blended with ripe passionfruit nectar.'
  },
  {
    level: 9,
    id: 'golden_sunset',
    name: 'Golden Sunset',
    radius: 134,
    baseScore: 5120,
    primaryColor: 0xff9e00,    // Gold amber
    secondaryColor: 0x9d0208,  // Deep ruby gradient
    accentColor: 0xffea00,
    glassShape: 'chalice',
    garnish: 'orange',
    description: 'A radiant golden cocktail capturing a warm horizon.'
  },
  {
    level: 10,
    id: 'royal_cocktail',
    name: 'Royal Cocktail',
    radius: 151,
    baseScore: 10240,
    primaryColor: 0x7b2cbf,    // Royal purple
    secondaryColor: 0xc77dff,  // Lavender amethyst
    accentColor: 0xffd700,     // Royal gold
    glassShape: 'chalice',
    garnish: 'flower',
    description: 'An exquisite royal concoction garnished with edible gold petals.'
  },
  {
    level: 11,
    id: 'ultimate_cocktail',
    name: 'Ultimate Cocktail',
    radius: 169,
    baseScore: 20480,
    primaryColor: 0xff0054,    // Rainbow flame magenta
    secondaryColor: 0x390099,  // Deep twilight
    accentColor: 0xffe600,     // Sparkler gold
    glassShape: 'tiki',
    garnish: 'sparkler',
    description: 'The legendary masterwork tiki cocktail with blazing sparklers!'
  }
];

export function getDrinkByLevel(level: number): DrinkDefinition {
  const drink = DRINKS[level];
  if (!drink) {
    return DRINKS[DRINKS.length - 1];
  }
  return drink;
}
