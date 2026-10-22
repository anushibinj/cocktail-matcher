# Custom Audio Assets

Cocktail Merge synthesizes zero-latency crystal glass clinks, merge bells, and drop sounds using the Web Audio API.

If you prefer a recorded glass clink:
1. Place `clink.mp3` in this directory (`src/assets/audio/`). It is played
   when cocktail glasses bump / clink into each other.
2. `AudioManager` picks it up with Vite's `import.meta.glob`, which is
   resolved when the bundle is built: the file is bundled and fetched only if
   it exists, so a missing override costs no request. Restart the dev server
   or re-run `pnpm run build` after adding or removing it.

Drop and merge sounds are always synthesized; there is no file override for
them yet.

The background music (`bgm.m4a`) is not an override — it lives in
`public/assets/audio/` and is always loaded from there.
