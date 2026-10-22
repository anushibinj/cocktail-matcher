# Cocktail Matcher Improvement Backlog

## Review summary

**Technology stack.** TypeScript 5.9 (`strict`, `noUnusedLocals`, `noUnusedParameters`), Phaser 3.90 with Matter.js physics (WebGL renderer, gravity pointing *up*: `GAME_CONFIG.PHYSICS.GRAVITY_Y = -1.2`), Vite 6.4.3, deployed to Firebase Hosting (project `fastorial`, site `fastorial-70d16`) by two GitHub Actions workflows. All drink, UI and background art is drawn procedurally into canvases by `src/utils/AssetGenerator.ts`. All sound effects are synthesized by Web Audio in `src/game/systems/AudioManager.ts`; the only audio file is `public/assets/audio/bgm.m4a`. Persistence is `localStorage` through `src/storage/SaveManager.ts`. Two lockfiles are committed (`package-lock.json` for CI's `npm ci`, `pnpm-lock.yaml` for local work). There is no test, lint or format tooling.

**Primary gameplay loop.** `BootScene` generates textures → `MenuScene` (Play, best score, sound/music toggles) → `GameScene`. The player drags horizontally along the launcher at `SPAWN_Y` near the bottom of a wooden table and releases. The drink is *launched upward* (`setVelocity(0, -3.2)`) and settles against the top wall. Two touching drinks of the same tier merge into the next of 12 tiers (`src/game/config/drinks.ts`) and award its `baseScore`. Two hanging "To-Go Order" tickets take any drink of a requested tier (2–6) that reaches the table, for a bonus. If a settled drink stays below `DANGER_LINE_Y` for 2,000 ms total (the timer decays at 1.5× while clear), the game ends. The Game Over modal offers Play Again and Main Menu. A pause modal offers Resume, Restart, Main Menu, sound/music toggles and a three-line "How to play".

**Areas reviewed (every file was opened and read in full unless stated otherwise).**
- Entry and shell: `index.html`, `src/main.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `.gitignore`.
- Config and data: `src/game/config/gameConfig.ts`, `src/game/config/drinks.ts`, `src/types/game.ts`.
- Scenes: `src/game/scenes/BootScene.ts`, `MenuScene.ts`, `GameScene.ts`.
- Entities: `src/game/entities/Board.ts`, `Drink.ts`.
- Systems: `src/game/systems/DrinkSpawner.ts`, `MergeManager.ts`, `OrderManager.ts`, `ScoreManager.ts`, `GameOverManager.ts`, `AudioManager.ts`.
- UI: `src/game/ui/HUD.ts`, `GameOverModal.ts`, `PauseModal.ts`.
- Storage and utils: `src/storage/SaveManager.ts` and `src/utils/AssetGenerator.ts`. In `AssetGenerator.ts`, the dispatcher, the first two glass renderers, and every particle, background, board and UI texture generator were read line by line. The remaining glass renderers (`drawHighballGlass` … `drawTikiMug`) were only skimmed for their structure.
- Assets and PWA: `public/manifest.webmanifest`, `public/icons/icon-192.svg` (`icon-512.svg` listed), `public/assets/audio/README.md`, `public/assets/drinks/README.md`, and the `bgm.m4a` metadata (via `ffprobe`).
- Deployment and CI: `firebase.json`, `.firebaserc`, `.github/workflows/firebase-hosting-merge.yml`, `.github/workflows/firebase-hosting-pull-request.yml`.
- Docs: `README.md`, `CLAUDE.md`, `cocktail_merge_prd_web_first.md` (the PRD, used as the intended-behavior reference).
- Searched for `TODO`, `FIXME`, `eslint-disable`, `ts-ignore`, `ts-expect-error`, `console.*` and unused symbols. There are no TODO/FIXME comments and no suppressions. Unused or dead symbols are listed in ARCH006.
- Lockfiles were checked only for version agreement (Phaser 3.90.0, Vite 6.4.3 and TypeScript 5.9.3 match in both) and through `pnpm audit`.

**Commands run and outcomes.**

| Command | Outcome |
|---|---|
| `pnpm install --frozen-lockfile` | Installed the locked dependencies into the git-ignored `node_modules`. No manifest or lockfile changes. |
| `pnpm run build` (`tsc && vite build`) | Passes with no type errors. One warning: `dist/assets/index-*.js` is **1,542.17 kB** (gzip 355.76 kB), above the already-raised `chunkSizeWarningLimit: 1500`. |
| `pnpm audit` | **6 advisories (2 high, 3 moderate, 1 low).** Five affect `vite <=6.4.3` (dev server: `server.fs.allow` bypass, cross-origin script execution, `launch-editor` issues; patched in `>=6.4.4`). One high affects `source-map-js <1.2.2`. |
| `ffprobe public/assets/audio/bgm.m4a` | 73.1 s, AAC-LC, 249 kb/s stereo, 48 kHz. **2.30 MB**. |
| `vite preview` plus a scratch Playwright script, run with the globally installed Playwright and the preinstalled Chromium (nothing added to the repo) | Menu and gameplay screenshots at 390×844 (DPR 3), 360×640, 768×1024, 1440×900 and 844×390. Scripted flows: Play, HUD toggle, pause/resume, pause during cooldown, filling the board to game over, Play Again. Console and network were logged. The script reached game internals by wrapping `Phaser.Game.prototype.boot` from an init script; this hook exists only in the scratch script, not in the repo. |

**Runtime findings confirmed in the browser** (cited in the items below):
- Tapping the HUD sound toggle launched a drink: tracked drinks went from 0 to 1.
- While paused, a drink kept moving: `y` went from 975 to 845 in 1.5 s.
- Pausing during the 450 ms drop cooldown left `isCoolingDown = true` and the preview hidden for good. Later taps never launched anything.
- Tapping "PLAY AGAIN" immediately launched a drink.
- The canvas is off-center whenever it is letterboxed horizontally: 144 px left vs 48 px right at 768×1024.
- Every load logs **12 console errors** (`Failed to process file: image drink_N_custom`). The 12 optional-art probes and the `clink.mp3` probe all come back `200 text/html`.
- The "NEW BEST SCORE!" badge is drawn underneath the Game Over card.
- In 844×390 landscape the whole game is 219×390 CSS px.
- `bgm.m4a` is downloaded at boot.

**Not run or not verified.**
- No real iOS or Android device, Safari, Firefox or screen reader was available. Items that depend on iOS behavior (safe areas, `HTMLMediaElement.volume`) or on the visual effect of device pixel ratio are marked as needing runtime validation.
- Headless Chromium used software WebGL (SwiftShader), so no FPS or frame-time numbers were collected and none are claimed.
- Audio could not be heard; audio findings come from reading the code.
- The app was not deployed to Firebase. Its behavior for missing files is inferred from `firebase.json` (`"source": "**" → /index.html`), which matches what `vite preview` did locally.
- PWA installation was not attempted.

**Assessment.** The core merge loop works, and the procedural tropical art reads clearly at phone size, with tiers told apart by both color and glass shape. Upward launching is a distinctive twist. The main weakness is the *interaction lifecycle*. Pause does not freeze anything, UI taps leak into the launcher, a simple pause can soft-lock the game, and restarting has timer races. These all come from four loosely coupled flags (`GameScene.isGameActive`, `DrinkSpawner.isEnabled`/`isCoolingDown`, `GameOverManager.isGameOver`, `OrderManager.isCheckingOut`) and Phaser timers and tweens that are never paused or cancelled. The game also lacks two PRD-required features: a next-drink preview and a legible overflow warning. Accessibility is mostly absent. There is no keyboard support, and at phone scale HUD targets are about 23 CSS px and some text is 5–8 CSS px. The docs overstate what ships (offline PWA, next-drink HUD, a "2.0s countdown", custom drop/merge audio).

**Highest-impact themes.**
1. Make pause, resume, restart and game over reliable: BUG001–BUG004, ARCH002.
2. Close the PRD gaps that cost the most clarity: next drink (UX001), overflow warning (UX002), onboarding and copy (UX004, CONTENT001).
3. Make the game usable at phone scale and without a mouse: A11Y001, A11Y002, A11Y004, A11Y005.
4. Clean up load and hosting hygiene: BUG008, BUG009, PERF001, PERF002, PERF004.
5. Add quality gates so these regressions stay fixed: DX001, DX002, TEST001, TEST002.

## Prioritization model

**Priority**
- `P0`: Stops the game from working, creates a data or security risk, or blocks critical accessibility.
- `P1`: A serious issue in the main gameplay journey.
- `P2`: Meaningful polish, maintainability, performance or secondary-flow improvement.
- `P3`: Optional enhancement or low-impact refinement.

**Effort**
- `XS`: Less than half a day.
- `S`: About half a day to one day.
- `M`: About two to three days.
- `L`: About four to five days.
- `XL`: More than five days; should normally be split up.

Estimates are relative planning guidance, not guarantees.

**Labels used in this backlog.** `BUG` items are confirmed defects. "Confirmed at runtime" means the defect was reproduced in the browser. "Confirmed by code inspection" means the code path is unambiguous but was not reproduced, and each such item says what runtime check is still needed. All other categories are recommendations.

## Recommended first milestone

The smallest coherent set that noticeably improves the game without a redesign:

| TODO | Why it belongs in the milestone |
|---|---|
| BUG002 | P0. One pause during the 450 ms cooldown permanently disables launching. This is the only game-breaking defect. |
| BUG003 | Every tap on Resume, Play Again, Restart or a HUD toggle fires an unwanted drink. Players feel this constantly. |
| BUG001 | Pause and game over must actually stop physics, merges, scoring and order checkout, or the score and pile change under the modal. |
| BUG005 | One-line CSS fix for the off-center board on every iPad, desktop and landscape view, which is a PRD target platform. |
| BUG006 | The "new best" reward moment is invisible today. Extra-small (XS) fix. |
| UX001 | The PRD-required next-drink preview. The spawner already exposes the hook. |
| UX002 | Players lose without knowing why. A visible grace countdown makes the loss condition fair and readable. |
| A11Y004 | HUD buttons are about 23 CSS px on a 390 px phone. Easy, high-value fix for every touch player. |
| A11Y005 | Order tickets render 5–7 CSS px text, so the To-Go mechanic is unreadable on phones. |

BUG002, BUG003 and BUG001 touch `DrinkSpawner`/`GameScene` and should land first, in that order. BUG005, BUG006, A11Y004 and A11Y005 are independent and can run in parallel. UX001 and UX002 follow because they add HUD elements that A11Y004/A11Y005 resize.

## Detailed TODOs
