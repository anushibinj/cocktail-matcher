export interface DrinkDefinition {
  id: string;
  level: number;
  name: string;
  textureKey: string;
  radius: number;
  score: number;
  color: number;
  garnishColor: number;
}

export const DRINKS: DrinkDefinition[] = [
  { id: 'citrus-splash', level: 0, name: 'Citrus Splash', textureKey: 'drink-0', radius: 22, score: 10, color: 0xffd166, garnishColor: 0xffa500 },
  { id: 'berry-fizz', level: 1, name: 'Berry Fizz', textureKey: 'drink-1', radius: 26, score: 20, color: 0xe056fd, garnishColor: 0xc445d6 },
  { id: 'pineapple-cooler', level: 2, name: 'Pineapple Cooler', textureKey: 'drink-2', radius: 30, score: 40, color: 0xf9ca24, garnishColor: 0xf0932b },
  { id: 'sunset-cooler', level: 3, name: 'Sunset Cooler', textureKey: 'drink-3', radius: 34, score: 80, color: 0xff6b6b, garnishColor: 0xff9f43 },
  { id: 'mint-lime', level: 4, name: 'Mint Lime', textureKey: 'drink-4', radius: 38, score: 160, color: 0x6ab04c, garnishColor: 0xbadc58 },
  { id: 'tropical-punch', level: 5, name: 'Tropical Punch', textureKey: 'drink-5', radius: 42, score: 320, color: 0xff7979, garnishColor: 0xeb4d4b },
  { id: 'island-breeze', level: 6, name: 'Island Breeze', textureKey: 'drink-6', radius: 46, score: 640, color: 0x48dbfb, garnishColor: 0x0abde3 },
  { id: 'blue-lagoon', level: 7, name: 'Blue Lagoon', textureKey: 'drink-7', radius: 50, score: 1280, color: 0x3742fa, garnishColor: 0x5352ed },
  { id: 'passion-colada', level: 8, name: 'Passion Colada', textureKey: 'drink-8', radius: 54, score: 2560, color: 0xf8b500, garnishColor: 0xffda79 },
  { id: 'golden-sunset', level: 9, name: 'Golden Sunset', textureKey: 'drink-9', radius: 58, score: 5120, color: 0xf39c12, garnishColor: 0xe67e22 },
  { id: 'royal-cocktail', level: 10, name: 'Royal Cocktail', textureKey: 'drink-10', radius: 62, score: 10240, color: 0x9b59b6, garnishColor: 0x8e44ad },
  { id: 'ultimate-cocktail', level: 11, name: 'Ultimate Cocktail', textureKey: 'drink-11', radius: 66, score: 20480, color: 0xf1c40f, garnishColor: 0xe74c3c },
];

export function getDrinkByLevel(level: number): DrinkDefinition {
  const drink = DRINKS[level];
  if (!drink) {
    throw new Error(`Invalid drink level: ${level}`);
  }
  return drink;
}

export const MAX_DRINK_LEVEL = DRINKS.length - 1;
