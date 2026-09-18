# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cocktail Merge is a "drop-and-merge" casual game (Suika/2048-style) built with TypeScript, Phaser 3, and Matter.js physics, bundled with Vite and deployed to Firebase Hosting. Players drop cocktails into a container; two drinks of the same tier collide and merge into the next tier, up the 12-level `DRINKS` progression defined in `src/game/config/drinks.ts`.

The full design spec (mechanics, tuning targets, UX details) lives in `cocktail_merge_prd_web_first.md` — consult it for the intended behavior when a feature's rationale isn't obvious from code alone.

## Commands

The repo currently ships `package-lock.json` (npm); use `pnpm` for interactive development per user preference, but note CI (`.github/workflows/firebase-hosting-*.yml`) invokes `npm ci` / `npm run build` directly, so don't remove `package-lock.json` without updating those workflows.

```bash
pnpm install        # install dependencies
pnpm run dev         # start Vite dev server at http://localhost:3000
pnpm run build        # tsc typecheck (no emit) + vite production build to dist/
pnpm run preview      # serve the production build locally
```

There is no test suite and no lint script configured — `pnpm run build` (which runs `tsc` with `noEmit`) is the only automated correctness check available. Always run it after changes since `tsconfig.json` has `strict`, `noUnusedLocals`, and `noUnusedParameters` enabled.

Deployment is `firebase deploy --only hosting` after `pnpm run build` (see `firebase.json` / `.firebaserc`); the Firebase project is `fastorial` / site `fastorial-70d16`. GitHub Actions auto-deploy on merge/PR using npm.

## Architecture

**Scene flow** (`src/main.ts` wires up a single `Phaser.Game` with Matter physics, gravity pointing *up* — `GRAVITY_Y` is negative): `BootScene` (generates all procedural textures via `AssetGenerator` and sets up systems) → `MenuScene` (title/mascot) → `GameScene` (main gameplay loop).

**Upward layout**: unlike typical merge games, drinks spawn near the bottom (`SPAWN_Y`) and are launched *upward* into a container whose danger line (`DANGER_LINE_Y`) is near the top. All geometry constants (board bounds, spawn/danger Y, physics tuning, spawn weights) live centrally in `src/game/config/gameConfig.ts` — change tuning there rather than hardcoding values in systems.

**`GameScene` is an orchestrator**, not where game logic lives. It constructs and wires together independent systems/entities each responsible for one concern, connecting them via constructor callbacks rather than events:
- `Board` (`entities/`) — static Matter walls/floor and the container shape.
- `Drink` (`entities/`) — a Matter circle body per dropped/merged cocktail, tagged with a `level` (index into `DRINKS`) and `isMerging`/`isDropped` flags used to gate collision logic.
- `DrinkSpawner` (`systems/`) — aiming/drag input, horizontal clamping, drop cooldown, and picks the next drink's level from `GAME_CONFIG.SPAWN_DISTRIBUTION`.
- `MergeManager` (`systems/`) — the core game rule: listens to Matter `collisionstart`, and when two active, non-merging `Drink`s of equal level touch, destroys both and spawns a `Drink` at `level + 1` (via `getDrinkByLevel`), plus particle/shockwave FX and score/audio triggers. Uses a `pendingMerges` key set (sorted body-id pair) to prevent double-triggering a merge within one physics step.
- `OrderManager` (`systems/`) — "to-go order" tickets that reward completing a specific drink tier; scans the live drink list each frame in `GameScene.update`.
- `ScoreManager` / `GameOverManager` (`systems/`) — score bookkeeping/floating popups, and the danger-line overflow timer (`DANGER_GRACE_PERIOD_MS`) that ends the game.
- `AudioManager` (`systems/`) — a singleton (`getInstance()`) Web Audio synthesizer; there are no audio asset files for SFX, sounds are generated procedurally (background music is the one exception, loaded from `public/assets/audio/bgm.m4a`).
- `HUD` / `GameOverModal` / `PauseModal` (`ui/`) — Phaser UI overlays, driven by callbacks passed in from `GameScene`.
- `SaveManager` (`storage/`) — a singleton wrapping `localStorage`, versioned under `GAME_CONFIG.STORAGE_KEY`; always merges loaded data over `getDefaultData()` defaults so old saves don't break on schema additions, and swallows storage errors (private browsing, quota) by falling back to in-memory defaults.

**Adding a new drink tier**: append an entry to the `DRINKS` array in `src/game/config/drinks.ts` (level must be sequential/contiguous — `getDrinkByLevel` indexes directly into the array and `MergeManager` checks `level >= DRINKS.length - 1` for the max-tier case). Visuals for each `glassShape`/`garnish` combination are generated procedurally by `src/utils/AssetGenerator.ts`, not loaded from image files — new glass shapes or garnishes need a matching case there.

**Physics gotchas**: gravity is inverted (upward), and restitution/friction/density are tuned in `GAME_CONFIG.PHYSICS` for a "calm, soft-settling" feel — avoid per-entity physics overrides that bypass these shared constants. Matter body `label` strings (`'drink'`, `'wall*'`, `'floor'`) are used for collision-type dispatch in `MergeManager`; a `gameObject` back-reference on the body is cast back to a `Drink` instance in the collision handler.
