# Custom Drink Artwork Assets

By default, Cocktail Merge renders all 12 side-view cocktail glasses procedurally at high resolution.

If you would like to use your own custom artwork:
1. Place **PNG** files in this directory with the following naming convention
   (if you have SVG source art, export/rasterize it to PNG first — Phaser's
   SVG loader throws on a 404 instead of failing gracefully, so PNG is the
   only format BootScene probes for):
   - `drink_0.png` (Citrus Splash)
   - `drink_1.png` (Berry Fizz)
   - `drink_2.png` (Pineapple Cooler)
   - `drink_3.png` (Sunset Cooler)
   - `drink_4.png` (Mint Lime)
   - `drink_5.png` (Tropical Punch)
   - `drink_6.png` (Island Breeze)
   - `drink_7.png` (Blue Lagoon)
   - `drink_8.png` (Passion Colada)
   - `drink_9.png` (Golden Sunset)
   - `drink_10.png` (Royal Cocktail)
   - `drink_11.png` (Ultimate Cocktail)
2. Square dimensions (512x512 recommended) with transparent backgrounds work
   best — the game scales each image down to the tier's actual on-board size,
   so a larger source image just stays crisper.
3. You don't need to provide all 12 — any tier without a matching file keeps
   using the procedurally-generated glass, so a partial set works fine.
