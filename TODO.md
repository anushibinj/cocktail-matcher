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

BUG002, BUG003 and BUG001 touch `DrinkSpawner`/`GameScene` and should land first, in that order. BUG005 and BUG006 are independent and can run in parallel with them. UX001 and UX002 come next, and A11Y004/A11Y005 last, so the resizing pass also covers the new HUD elements (execution rows 1–6 and 17–21). For this milestone, do A11Y004 on its own; its optional pairing with UI001 (row 20) can wait for ARCH001.

## Progress

| Wave | Execution rows | TODO IDs | Status |
|---|---|---|---|
| 1 | 1–9 | BUG001, BUG002, BUG003, UX006, BUG004, BUG005, BUG009, A11Y007, BUG008, BUG006, BUG007, PERF005, SEC001, DX004 | ✅ Merged: [#4](https://github.com/anushibinj/cocktail-matcher/pull/4), [#5](https://github.com/anushibinj/cocktail-matcher/pull/5), [#6](https://github.com/anushibinj/cocktail-matcher/pull/6), [#7](https://github.com/anushibinj/cocktail-matcher/pull/7), [#8](https://github.com/anushibinj/cocktail-matcher/pull/8), [#9](https://github.com/anushibinj/cocktail-matcher/pull/9), [#10](https://github.com/anushibinj/cocktail-matcher/pull/10) |
| 2 | 10–16 | ARCH002, DX001, DX002, SEC003, ARCH001, ARCH004, TEST001, TEST002 | 🚧 In progress |
| 3–5 | 17–40 | Remaining items | ⏳ Not started |

DX003 is partly done: #7 moved the asset READMEs out of `public/`, so `dist/` no longer ships them. The rest of DX003 (main README accuracy) is still open.

**Wave-1 items still needing real-device validation** (they could only be tested in headless Chromium):
- iOS "Add to Home Screen" icon and the Android adaptive (maskable) icon (BUG009).
- Pinch-zoom on the letterbox margins on Android, and no double-tap zoom during rapid launches on iOS (A11Y007).
- App switch / lock screen pausing the game and BGM, and SFX recovering after an iOS `'interrupted'` AudioContext (UX006).
- No GC hitches during merge cascades on a mid-range phone (PERF005).
- `/` serving the game and missing assets returning 404 on the live Firebase site (BUG008; confirmed on a preview channel).

## Detailed TODOs

### Bugs (BUG)

### [BUG001] Pause and game over do not freeze physics, merges, scoring or order checkout

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#10](https://github.com/anushibinj/cocktail-matcher/pull/10) (wave 1)
- **Priority:** P1
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/scenes/GameScene.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`, `src/game/systems/MergeManager.ts`, `src/game/systems/OrderManager.ts`
- **Affected experience:** Gameplay, Completion
- **Depends on:** None
- **Blocks:** UX006, ARCH002, TEST002
- **Can be combined with:** UX006, BUG002

#### Evidence and current behavior

`GameScene.handlePause()` (`src/game/scenes/GameScene.ts:149-153`) only sets `isGameActive = false`, disables the spawner and shows the modal. Nothing pauses `this.matter.world`, `this.time` or `this.tweens`. `GameScene.update()` (lines 124-135) stops calling `OrderManager.checkForMatchingOrders` and `GameOverManager.update`. However, the Matter `collisionstart` listener in `MergeManager.setupCollisionListener()` (`MergeManager.ts:28-67`) has no game-state gate, so merges, merge scoring (`scoreManager.addScore`, line 129), screen shake and audio carry on under the modal. An order checkout tween that is already running (`OrderManager.fulfillOrder`, lines 232-271) also completes and awards points.

`handleGameOver()` (lines 137-147) captures `finalScore` and shows the modal, but physics keeps running here too. Any merge or order checkout after that moment adds score and can raise the saved best through `SaveManager.setBestScore`, so the modal shows a stale "final" score.

Confirmed at runtime for pause: in a 390×844 session, a tracked drink moved from `y = 975` to `y = 845` during 1.5 s of pause, and `matter.world.enabled` stayed `true`. The game-over part is confirmed by code inspection.

#### Problem and impact

Every player who pauses expects the board to freeze. Instead the pile shifts, merges fire and points change while they can't act. After game over, the displayed final score can disagree with the HUD and the saved best. PRD §11 says game over must "disable player input / stop spawning", and PRD §28 lists "Pause works" in its definition of done.

#### Desired outcome

While paused or after game over, no body moves, no merge or order completes, no score changes and no gameplay timer advances. On resume, the simulation continues from exactly the frozen state. Modal animations and buttons keep working while the game is paused.

#### Implementation guidance

- **Preferred:** move `PauseModal`/`GameOverModal` into a lightweight overlay scene (for example `UIOverlayScene`, launched with `this.scene.launch`), then call `this.scene.pause('GameScene')` and `this.scene.resume('GameScene')`. A paused scene stops its Matter world, `time` clock and tween manager together. Its input is suspended too, so the modals must live in the overlay.
- **Alternative:** keep the modals in `GameScene` and call `this.matter.world.pause()`/`resume()`, set `this.time.paused`, and pause only gameplay tweens (tag them or keep references). Don't call `tweens.pauseAll()`, which would also freeze the modal pop-in.
- On game over, freeze the simulation the same way *before* reading `finalScore`, and make `MergeManager`/`OrderManager` ignore events when the game is not in the playing phase.
- Keep the `GAME_CONFIG.PHYSICS` constants untouched (CLAUDE.md "Physics gotchas").

#### Acceptance criteria

- [ ] With drinks still moving, opening the pause modal freezes every drink: positions are identical over 2 s.
- [ ] No merge, score popup, screen shake or order checkout happens while paused.
- [ ] Resume continues the motion from the frozen state, with no burst of accumulated physics steps.
- [ ] After the Game Over modal appears, `ScoreManager.getScore()` and the saved best score do not change.
- [ ] The pause and Game Over modals still animate in, and their buttons respond to touch and mouse.
- [ ] Restart and Main Menu from either modal still work. No regression in the BUG002/BUG003 scenarios.

#### Validation plan

`pnpm run build`. Manual check at 390×844 (touch emulation) and 1440×900: drop several drinks, pause mid-flight, wait 3 s, compare positions, resume. Force a game over with drinks still moving and confirm the HUD score stays fixed for 3 s. Add these as Playwright cases in TEST002.

#### Out of scope

Auto-pause on tab or app switch (UX006). Restructuring all game state into a phase machine (ARCH002).

### [BUG002] Pausing during the drop cooldown permanently disables launching (soft-lock)

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#10](https://github.com/anushibinj/cocktail-matcher/pull/10) (wave 1)
- **Priority:** P0
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `src/game/systems/DrinkSpawner.ts`
- **Affected experience:** Gameplay, Replay
- **Depends on:** None
- **Blocks:** ARCH002, TEST002
- **Can be combined with:** BUG003, BUG001

#### Evidence and current behavior

`DrinkSpawner.launchCurrentDrink()` (`src/game/systems/DrinkSpawner.ts:107-146`) sets `isCoolingDown = true`, hides the preview, and schedules `scene.time.delayedCall(GAME_CONFIG.DROP_COOLDOWN_MS, …)` (450 ms). The callback only advances the queue and clears `isCoolingDown` `if (this.isEnabled)` (lines 130-145). If the game is paused inside that 450 ms window, `setEnabled(false)` runs first, the callback does nothing, and nothing ever retries. `setEnabled(true)` (lines 191-198) only redraws the guidance line. `launchCurrentDrink()` returns early forever because `isCoolingDown` is still `true` and the preview is hidden.

Confirmed at runtime: after pause → resume during the cooldown, the spawner state was `{cooling: true, preview: false}`, and further taps launched nothing. Only Restart or Main Menu recovers.

A related race, confirmed by code inspection: the timer handle is not stored, so `reset()` (lines 200-214) during a cooldown leaves the old callback live. It fires after the restart, advancing `currentLevel`/`nextLevel` again and replaying the pop-in. The player silently loses the queued drink.

#### Problem and impact

Pausing right after a drop, which is a very natural moment to pause, ends the run in practice. This is the only defect found that makes the game unplayable without a restart.

#### Desired outcome

The cooldown always ends exactly once, whatever pause state it ended in. The preview reappears by the time play resumes. Restart cancels any pending cooldown.

#### Implementation guidance

- Store the `Phaser.Time.TimerEvent` returned by `delayedCall` in a field.
- In the callback, always advance the queue and clear `isCoolingDown`; only *drawing* should depend on `isEnabled`. If BUG001 pauses `scene.time`, the timer will itself wait out a pause.
- In `reset()` and on scene shutdown, call `timer.remove(false)` before re-initialising.
- Consider expressing launcher state as one enum (`ready | cooling | disabled`) instead of two booleans. This fits naturally with ARCH002 but is not required here.

#### Acceptance criteria

- [ ] Drop, pause within 100 ms, wait 1 s, resume: the preview is visible and the next tap launches a drink.
- [ ] The same works when the pause lasts less than 450 ms.
- [ ] Drop, then Restart within 450 ms: the post-restart current and next drinks are the ones shown right after the restart (no extra advance or second pop-in).
- [ ] Normal play still enforces the 450 ms cooldown between launches.

#### Validation plan

`pnpm run build`. Manual repro at 390×844 with touch emulation and with a mouse. Covered by a TEST002 case ("pause during cooldown recovers").

#### Out of scope

Changing the cooldown length. Keyboard launching (A11Y001).

### [BUG003] Tapping UI controls also launches a drink (HUD toggles, Resume, Play Again, Restart)

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#10](https://github.com/anushibinj/cocktail-matcher/pull/10) (wave 1)
- **Priority:** P1
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/systems/DrinkSpawner.ts`, `src/game/ui/HUD.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`
- **Affected experience:** Gameplay, Replay
- **Depends on:** None
- **Blocks:** UX003, A11Y001, ARCH002, TEST002
- **Can be combined with:** BUG002, UX003

#### Evidence and current behavior

`DrinkSpawner.setupInput()` (`DrinkSpawner.ts:57-73`) listens to the *scene-wide* `pointerdown`, `pointermove` and `pointerup` events. Any `pointerup` while `isEnabled` launches a drink, and the handlers ignore whether the pointer started on an interactive object. Phaser emits a game object's own `pointerdown` *before* the scene-wide `pointerdown`, and every button in the game activates on `pointerdown`. That produces these failures:

- **HUD sound or music toggle** (`HUD.ts:32-50`): the spawner stays enabled, so the global `pointerdown` aims at the button's x (560 or 614) and the release launches a drink there. Confirmed at runtime: tracked drinks went from 0 to 1 after one tap on the sound icon.
- **Resume** (`PauseModal.ts:115-119`): `onResume()` re-enables the spawner on `pointerdown`, so the release launches a drink at x≈360. Confirmed by code inspection; the runtime check was masked by BUG002.
- **Play Again** (`GameOverModal.ts:109-114`) and **Restart** (`PauseModal.ts:130-135`): `spawner.reset()` sets `isEnabled = true` on `pointerdown`. Confirmed at runtime: right after tapping PLAY AGAIN the new game already had 1 drink and was cooling down.

#### Problem and impact

Every resume and replay wastes the first drink in the center. Toggling sound mid-game throws a drink into the right edge. Players lose control of their stack through actions that have nothing to do with aiming.

#### Desired outcome

A drink launches only when a pointer gesture *starts and ends* as an aiming gesture. Interacting with any button, toggle or modal never aims or launches.

#### Implementation guidance

- In the scene `pointerdown` handler, use its second argument (`currentlyOver: GameObject[]`). Only "arm" the spawner when the pointer is not over an interactive object and the game is enabled. Store the arming `pointer.id`, and launch on `pointerup` only for that armed pointer.
- Make buttons activate on `pointerup` over the same object (standard button behavior, and needed for A11Y002 and ARCH001 anyway). Defer `onResume`/`onRestart` until after the release, for example with `scene.time.delayedCall(0)` or a "wait for all pointers up" guard.
- Do not depend on `event.stopPropagation()` alone. Phaser's propagation stop only affects other game objects, not the scene-level event.

#### Acceptance criteria

- [ ] Tapping the HUD sound, music or pause button during play never adds a drink (verify the drink count).
- [ ] Tapping Resume, Restart Game, Play Again or Main Menu never adds a drink.
- [ ] A normal tap or drag-and-release on the board still launches exactly one drink at the release x.
- [ ] Works identically with mouse (1440×900) and touch emulation (390×844).
- [ ] Multi-touch: a second finger touching down while aiming does not launch a second drink.

#### Validation plan

`pnpm run build`. Manual check of each control at both viewports. TEST002 cases assert the drink count before and after each control tap.

#### Out of scope

Restricting the aiming area and adding a cancel gesture (UX003). Keyboard input (A11Y001).

### [BUG004] Restart during an order checkout carries the old order's reward and ticket into the new game

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#10](https://github.com/anushibinj/cocktail-matcher/pull/10) (wave 1)
- **Priority:** P2
- **Effort:** S
- **Confidence:** Medium
- **Affected files:** `src/game/systems/OrderManager.ts`, `src/game/scenes/GameScene.ts`
- **Affected experience:** Replay
- **Depends on:** None
- **Blocks:** ARCH002
- **Can be combined with:** ARCH002

#### Evidence and current behavior

`OrderManager.fulfillOrder()` (`OrderManager.ts:189-272`) removes the drink from `GameScene.droppedDrinks` straight away (through `onOrderFulfilled`). It then starts a 500 ms flight tween whose `onComplete`:
- adds `order.rewardScore` to the score,
- destroys the drink,
- tweens `ticketView`, then calls `spawnNewOrder(slotIndex)` and clears `isCheckingOut`.

`GameScene.restartGame()` (`GameScene.ts:160-179`) calls `orderManager.reset()`, which runs `init()` (lines 45-55). `init()` does `container.removeAll(true)`, destroying the ticket views, and spawns two fresh orders. It does not stop the flight tween, and the flying drink is no longer in `droppedDrinks`, so restart doesn't destroy it either. When the tween finishes:
- the reward lands on the *new* game's score,
- a tween targets the destroyed `ticketView`,
- `spawnNewOrder(slotIndex)` overwrites one of the fresh orders and renders a second ticket in the same slot.

`goToMenu()` is not affected, because `scene.start('MenuScene')` shuts the scene and its tweens down. This is confirmed by code inspection and still needs a runtime repro. With BUG001 unfixed, the same tween also finishes during pause.

#### Problem and impact

A new game can start with hundreds of points and two stacked tickets in one slot. This is rare (restart within about 850 ms of a checkout), but it corrupts the score and therefore the best score.

#### Desired outcome

Restart cancels every in-flight order checkout, merge and FX timer. The new game always starts at score 0 with exactly two fresh tickets.

#### Implementation guidance

Keep references to the checkout tweens and the `delayedCall` in `triggerCheckoutSparkles`, or tag them. In `reset()`, stop them, destroy any flying drink and reset `isCheckingOut`. Alternatively, guard each `onComplete` with a "generation" counter that `init()` increments, and ignore stale completions. Apply the same pattern to `DrinkSpawner` (BUG002) and `MergeManager`'s cleanup `delayedCall` (`MergeManager.ts:133`) so restart has one consistent cancellation story.

#### Acceptance criteria

- [ ] Fulfilling an order, then pressing Restart within 300 ms, gives a new game with score 0 for at least 2 s.
- [ ] After that restart there are exactly two tickets, one per slot, with no overlap.
- [ ] No Phaser warnings or errors in the console during the scenario.
- [ ] Normal order fulfilment is unchanged (+reward, ticket slides away, a new ticket appears).

#### Validation plan

Manual: use the DX004 debug hook to spawn a matching drink next to an order, press pause → Restart quickly, then inspect the score and the ticket count. Add a TEST002 case once DX004 exists. `pnpm run build`.

#### Out of scope

Rebalancing orders (UX005).

### [BUG005] The game canvas is off-center whenever it is letterboxed horizontally (tablet, desktop, landscape)

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#6](https://github.com/anushibinj/cocktail-matcher/pull/6) (wave 1)
- **Priority:** P2
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `index.html`, `src/main.ts`
- **Affected experience:** Responsive
- **Depends on:** None
- **Blocks:** TEST002
- **Can be combined with:** BUG009, A11Y007

#### Evidence and current behavior

`#game-container` already centers its child with `display: flex; justify-content: center; align-items: center` (`index.html:37-44`). Phaser is also configured with `autoCenter: Phaser.Scale.CENTER_BOTH` (`src/main.ts:15`), which adds an inline `margin-left` to the canvas. The two offsets add up. Measured at runtime (canvas offset from the left vs right edge, and Phaser's inline margin):

| Viewport | Left gap | Right gap | Inline `margin-left` |
|---|---|---|---|
| 768×1024 | 144 px | 48 px | 96 px |
| 1440×900 | 700 px | 234 px | 466 px |
| 844×390 | 468 px | 156 px | 312 px |

Portrait phones taller than 9:16 look fine only because the canvas fills the full width there.

#### Problem and impact

On every iPad, desktop browser and rotated phone the board is visibly pushed right. iPad is an explicit PRD target platform (§1, §17).

#### Desired outcome

The canvas is centered horizontally and vertically: left and right gaps differ by at most 1 px, and so do top and bottom.

#### Implementation guidance

Use one centering mechanism. Either set `autoCenter: Phaser.Scale.NO_CENTER` and keep the flex container (simplest), or remove the flex centering and keep `CENTER_BOTH`. Check that Phaser still sizes the canvas against `#game-container`'s full size. Keep the `box-shadow` on `canvas`.

#### Acceptance criteria

- [ ] At 768×1024, 1024×1366, 1440×900 and 844×390, the left and right gaps differ by ≤ 1 px.
- [ ] Top and bottom gaps differ by ≤ 1 px wherever there is vertical letterboxing.
- [ ] 390×844 and 360×640 still fill the viewport with no scrollbars.
- [ ] Pointer aiming still maps to the correct board x after the change (the drink launches under the cursor).

#### Validation plan

`pnpm run build && pnpm run preview`. Measure `canvas.getBoundingClientRect()` at the listed viewports (TEST002 can assert this). Aim at both board walls with the mouse to confirm input mapping.

#### Out of scope

Recomputing canvas height on resize or rotation (UX007).

### [BUG006] "NEW BEST SCORE!" badge renders behind the Game Over card, and a tie counts as a new best

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#4](https://github.com/anushibinj/cocktail-matcher/pull/4) (wave 1)
- **Priority:** P2
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `src/game/ui/GameOverModal.ts`, `src/game/scenes/GameScene.ts`, `src/game/systems/ScoreManager.ts`
- **Affected experience:** Completion
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** UX002

#### Evidence and current behavior

1. **Badge hidden.** `GameOverModal.show()` adds `newBestBadge` to `cardGroup` at line 69. The card background (`cardBg`, filled at 0.95 alpha) and the other children are added afterwards at line 132, so the badge is drawn *underneath* the card. Confirmed in the 390×844 game-over screenshot: the badge is a barely visible dark ghost behind "YOUR SCORE".
2. **Tie counted as a record.** `GameScene.handleGameOver()` computes `isNewBest = finalScore >= bestScore && finalScore > 0` (`GameScene.ts:143`). `ScoreManager.bestScore` only updates when the score is strictly greater than the stored best (`ScoreManager.ts:30-33`, `SaveManager.setBestScore` lines 60-67). So a run that exactly *ties* the previous best also shows the celebration. Confirmed by code inspection.

#### Problem and impact

The single most rewarding moment in the game (beating your best) is invisible. When the badge is visible, it can be wrong.

#### Desired outcome

The badge is fully visible on top of the card, appears only when this run strictly beat the best stored *before the run started*, and is never shown at a score of 0.

#### Implementation guidance

- Add the badge after `cardBg`, either by building the children array in z-order or with `cardGroup.add(newBestBadge)` after line 132.
- Track `startingBest` in `ScoreManager.init()`, or keep a `beatPreviousBest` flag set from `setBestScore()`'s `true` return, and pass that to the modal instead of recomputing it in `GameScene`.

#### Acceptance criteria

- [ ] When a run beats the stored best, the badge is rendered above the card at full opacity (screenshot check).
- [ ] When a run equals the stored best exactly, no badge is shown.
- [ ] On the first-ever run, a score above 0 shows the badge and a score of 0 does not.
- [ ] Layout positions of the score label, value and best line are unchanged in both branches.

#### Validation plan

Manual: use `localStorage` to set `bestScore` to a known value, then play to above, equal to and below it (the DX004 hook can add score directly). `pnpm run build`. Screenshot at 390×844.

#### Out of scope

Run statistics on the Game Over screen (UX010) and the cause of the loss (UX002).

### [BUG007] Merge and checkout particles disappear mid-flight

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#9](https://github.com/anushibinj/cocktail-matcher/pull/9) (wave 1)
- **Priority:** P3
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `src/game/systems/MergeManager.ts`, `src/game/systems/OrderManager.ts`
- **Affected experience:** Gameplay
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** PERF005

#### Evidence and current behavior

In `MergeManager.triggerMergeEffects()` (`MergeManager.ts:138-188`), both particle emitters are destroyed in the shockwave tween's `onComplete` after **350 ms** (lines 176-180). But their particles live `lifespan: {min: 350, max: 550}` and `{min: 400, max: 600}`. Destroying an emitter removes its live particles, so most of the splash and every star vanish abruptly instead of fading. `OrderManager.triggerCheckoutSparkles()` waits 700 ms against a 650 ms maximum lifespan, which is fine. Confirmed by code inspection; the effect lasts under 250 ms and is easiest to judge in slow motion.

#### Problem and impact

Merges are the core reward moment (PRD §15 "Game feel is a high priority"). Cut-off particles make them look cheaper than the art direction intends.

#### Desired outcome

Every particle completes its configured lifespan and fade before its emitter is removed.

#### Implementation guidance

Destroy the emitters after the longest lifespan plus a small buffer: `scene.time.delayedCall(650, …)`, or the emitter's `complete` event once it has no live particles. Better still, pool the emitters (PERF005) so nothing is destroyed per merge.

#### Acceptance criteria

- [ ] No particle disappears before its `scale` reaches its end value. Check by slowing `scene.time.timeScale`/`tweens.timeScale` or recording a capture.
- [ ] Emitters are still cleaned up: the display list size returns to baseline 1 s after a merge.
- [ ] Merge sound, score popup and shake timing are unchanged.

#### Validation plan

Manual merge with the DX004 debug hook spawning a pair, recorded at 0.25× time scale. Check `scene.children.length` before and after. `pnpm run build`.

#### Out of scope

Redesigning merge FX. Reduced-motion variants (A11Y006).

### [BUG008] Every load logs 12 console errors and makes 13 wasted requests probing optional assets

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#7](https://github.com/anushibinj/cocktail-matcher/pull/7) (wave 1)
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/scenes/BootScene.ts`, `src/game/systems/AudioManager.ts`, `firebase.json`, `public/assets/drinks/README.md`, `public/assets/audio/README.md`
- **Affected experience:** Performance, Developer workflow
- **Depends on:** None
- **Blocks:** TEST002
- **Can be combined with:** DX003

#### Evidence and current behavior

`BootScene.preload()` queues `this.load.image('drink_N_custom', 'assets/drinks/drink_N.png')` for all 12 tiers (`BootScene.ts:44-46`), even though no PNGs ship. `AudioManager.loadCustomAudio()` fetches `./assets/audio/clink.mp3` (`AudioManager.ts:78-89`). Firebase rewrites every path to `/index.html` (`firebase.json:10-15`), and Vite's dev and preview servers apply the same SPA fallback, so each missing file comes back as **`200 text/html`**.

Confirmed at runtime: 12 requests returned `200 text/html`, followed by 12 `console.error` lines `Failed to process file: image drink_N_custom`. `clink.mp3` also returned `200 text/html` and failed to decode silently.

#### Problem and impact

PRD §25 requires "no console errors during normal gameplay", and these errors hide real ones during debugging. Each probe downloads the HTML shell (about 1.8 kB) and is on the critical boot path before `MenuScene` can start.

#### Desired outcome

Boot makes no request for an optional asset that doesn't exist and logs no errors. Custom artwork and audio overrides still work when the files are present.

#### Implementation guidance

- Make the override list known at build time. Move optional art to `src/assets/drinks/` (and optional audio to `src/assets/audio/`) and use `import.meta.glob('../../assets/drinks/drink_*.png', { eager: true, query: '?url', import: 'default' })` to get URLs only for files that exist. Feed those to `this.load.image` and the audio loader. Update both READMEs to describe the new location.
- The game has no client-side routes, so also remove the `**` → `/index.html` rewrite from `firebase.json`. Genuinely missing assets then return 404 instead of HTML; confirm Firebase still serves `index.html` at `/`.
- If the files must stay under `public/`, a generated `assets/manifest.json` is an alternative. It costs one request instead of 13.

#### Acceptance criteria

- [ ] A fresh load of `pnpm run preview` shows zero `console.error` entries before and during the menu.
- [ ] The network log contains no request for `assets/drinks/drink_*.png` or `assets/audio/clink.mp3` when those files are absent.
- [ ] With a test `drink_3.png` added at the documented location, tier 3 uses it and the other tiers stay procedural.
- [ ] With a test `clink.mp3` added, glass clinks use it.
- [ ] `pnpm run build` passes.

#### Validation plan

Run the Playwright console and network check from TEST002 at 390×844. Do a manual override test with a temporary PNG and MP3 (not committed). If hosting is changed, run `firebase hosting:channel:deploy` on a preview channel and check that `/` loads and a bogus asset path returns 404.

#### Out of scope

Producing real artwork or audio. Service-worker caching (PERF004).

### [BUG009] iOS home-screen icon points to a missing PNG, and the manifest ships only SVG icons marked "any maskable"

- **Category:** BUG
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#6](https://github.com/anushibinj/cocktail-matcher/pull/6) (wave 1)
- **Priority:** P2
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `index.html`, `public/manifest.webmanifest`, `public/icons/`
- **Affected experience:** Onboarding, Responsive
- **Depends on:** None
- **Blocks:** PERF004
- **Can be combined with:** BUG005, A11Y007, UI004

#### Evidence and current behavior

`index.html:14` declares `<link rel="apple-touch-icon" href="icons/icon-192.png" />`, but `public/icons/` only contains `icon-192.svg` and `icon-512.svg`. Confirmed at runtime: `GET /icons/icon-192.png` returns `200 text/html` (the SPA fallback). iOS doesn't support SVG touch icons, so "Add to Home Screen" falls back to a page screenshot.

`public/manifest.webmanifest:10-23` lists only SVG icons, each with `"purpose": "any maskable"`. One file can't satisfy both purposes: a maskable icon needs its art inside the central 80% safe zone. In `icon-192.svg`, the lime circle at `cx=140, r=18` and the sparkles near the edges would be cropped by Android's adaptive-icon masks. Some Android launchers and installability checks also expect PNG icons at 192 and 512.

#### Problem and impact

Players who "install" the game (README promotes PWA support) get a broken or blank icon on iOS and a cropped one on Android, which makes a polished game look unfinished at the very first touchpoint.

#### Desired outcome

Valid PNG icons are served at 180 px (apple-touch), 192 px and 512 px (`purpose: "any"`), plus a separate 512 px maskable PNG with safe-zone padding (`purpose: "maskable"`). SVG remains the browser favicon.

#### Implementation guidance

Rasterize the existing SVG to PNGs in a one-off step and commit them under `public/icons/`. Use `sharp`/`resvg` locally without adding a project dependency, or a design tool. Create a maskable variant with the art scaled to about 70% on a full-bleed background. Update the `index.html` and manifest entries. Align `theme_color`/`background_color` while you are there; UI004 owns the final palette decision.

#### Acceptance criteria

- [ ] `GET /icons/apple-touch-icon.png` (or whatever path is chosen) returns `image/png`, 180×180.
- [ ] The manifest lists PNG icons at 192 and 512 with `purpose: "any"` and one 512 maskable icon. No entry combines purposes.
- [ ] Chrome DevTools → Application → Manifest shows no icon warnings, and the maskable preview keeps the whole glass visible.
- [ ] Every file referenced in `index.html` and the manifest exists in `dist/` after `pnpm run build`.

#### Validation plan

`pnpm run build && pnpm run preview`. Check the DevTools Manifest panel, and use maskable.app or the DevTools maskable preview. Run `curl -I` on each icon URL. iOS "Add to Home Screen" on a real device if one is available (needs runtime validation).

#### Out of scope

Service worker and offline support (PERF004). Redesigning the icon art.

### Usability and game flow (UX)

### [UX001] Show the next drink and give the launcher a clear home

- **Category:** UX
- **Priority:** P1
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/scenes/GameScene.ts`, `src/game/systems/DrinkSpawner.ts`, `src/game/ui/HUD.ts`, `src/game/config/gameConfig.ts`
- **Affected experience:** Gameplay
- **Depends on:** None
- **Blocks:** ARCH006
- **Can be combined with:** ARCH004

#### Evidence and current behavior

`DrinkSpawner` already tracks `nextLevel` and exposes an `onNextDrinkChanged` callback (`DrinkSpawner.ts:16, 50-52, 135-137, 209-211`). `GameScene` passes `undefined` for it (`GameScene.ts:110-119`), and `HUD` has no next-drink element (`HUD.ts:67-113` only creates the SCORE and BEST cards). README line 130 claims the HUD has "next drink & evolution cheat-sheet".

The PRD lists the next-drink preview as MVP goal 12 (§3), a spawn-system rule (§7), a HUD element (§18), a Milestone 4 item and a Definition-of-Done line (§28).

The current-drink preview also sits *inside* the table at `SPAWN_Y` with nothing marking it as the launcher. In the midgame screenshot it is indistinguishable from drinks in flight.

#### Problem and impact

Planning one drink ahead is the core skill in drop-and-merge games. Without a preview, every placement is reactive, which flattens the strategy the wider spawn pool (`SPAWN_DISTRIBUTION`, five tiers) was tuned to reward. Players also can't tell at a glance which drink is "theirs".

#### Desired outcome

A clearly labelled "NEXT" preview shows the upcoming drink (sprite and name) and updates the moment the current drink advances. The current drink sits on a visually distinct launcher pad or rail.

#### Implementation guidance

- Wire a HUD method `updateNextDrink(level)` into the spawner's `onNextDrinkChanged`.
- Place the preview in the unused band between the board bottom (`BOARD.BOTTOM_Y = scaleY(1080)`) and the score cards (`scaleY(1190)`), or between the two score cards.
- Size it from `DRINKS[level].radius` but cap it at about 64 canvas px so tier 4 (radius 64) fits.
- Draw a subtle launcher rail at `SPAWN_Y` in `Board` or `AssetGenerator`.
- Coordinate positions with ARCH004 if it lands first.

#### Acceptance criteria

- [ ] On game start, the NEXT preview shows `nextLevel` and the launcher shows `currentLevel`.
- [ ] After each launch and cooldown, the launcher shows the previous NEXT drink and NEXT shows a newly rolled drink (verifiable through the DX004 hook).
- [ ] Restart re-rolls both and the preview updates.
- [ ] The preview is legible at 360×640: the sprite is at least 32 CSS px and any label meets A11Y005 text sizes.
- [ ] The preview and launcher pad don't overlap the board, score cards or danger line at 360×640, 390×844, 768×1024 or 1440×900.

#### Validation plan

`pnpm run build`. Screenshots at four viewports. Drop 10 drinks and confirm each launched tier matches the previously shown NEXT tier.

#### Out of scope

A full evolution ladder (UX010). "Hold/swap" mechanics.

### [UX002] Make the overflow danger legible: visible grace countdown, culprit highlight and a stated cause on Game Over

- **Category:** UX
- **Priority:** P1
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/systems/GameOverManager.ts`, `src/game/entities/Board.ts`, `src/game/ui/GameOverModal.ts`, `src/game/systems/AudioManager.ts`, `src/game/scenes/GameScene.ts`
- **Affected experience:** Gameplay, Completion
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** BUG006

#### Evidence and current behavior

`GameOverManager.update()` (`GameOverManager.ts:18-59`) accumulates `timeInDanger` while any slow drink (`speed < 1.2`) has its bottom below `DANGER_LINE_Y`. It decays the timer at 1.5× while clear and triggers game over at `DANGER_GRACE_PERIOD_MS` (2000). The only feedback is `Board.setDangerState()` (`Board.ts:80-98`): the dashed line flashes and the table rail turns red. There's no sense of *how much* time is left, *which* drink is at fault, or any audio warning before the final `playGameOver()`. The Game Over modal (`GameOverModal.ts:41-94`) says only "GAME OVER" and the score. README line 16 promises "a 2.0s countdown", which doesn't exist.

#### Problem and impact

Because gravity is inverted, the "overflow" direction (down toward the launcher) is counter-intuitive for genre veterans. Players lose suddenly, without understanding why or how close they were. That makes the loss feel unfair and hurts replay motivation (PRD §29 "replayable").

#### Desired outcome

- While any drink is in danger, a countdown shows the remaining grace time (for example a ring or bar along the danger line, filling as time runs out).
- The offending drink or drinks are highlighted.
- A soft warning tick plays, respecting the SFX setting.
- The Game Over card states the cause, for example "A drink stayed past the red line".
- Recovering (clearing the line) visibly drains the countdown.

#### Implementation guidance

- Expose `getDangerProgress(): number` (`timeInDanger / DANGER_GRACE_PERIOD_MS`) and the list of offending drinks from `GameOverManager`.
- Render the countdown in `Board` (it already owns the danger visuals). Highlight culprits with a tint pulse or outline on the `Drink` sprite.
- Add `AudioManager.playDangerTick()`, throttled to about 2–3 per second.
- Pass a `cause` into `GameOverModal.show()`.
- Avoid flashing faster than 3 Hz (WCAG 2.3.1). The current 250 ms yoyo is about 2 Hz; keep it at or below that.
- Respect A11Y006 reduced motion (use steady color instead of pulsing).

#### Acceptance criteria

- [ ] When a drink settles below the line, a visible countdown starts within 1 frame and reaches full exactly when game over triggers (±1 frame).
- [ ] Clearing the line visibly drains the countdown at the same 1.5× rate the logic uses.
- [ ] The offending drink is visually marked. The mark is removed when it leaves the danger zone or merges.
- [ ] The warning tick plays only when SFX is on and stops when danger clears.
- [ ] The Game Over card shows a cause line. The layout still fits at 360×640.
- [ ] No flashing exceeds 3 flashes per second.

#### Validation plan

`pnpm run build`. Manual: stack at one x until danger triggers, then recover once and lose once. Screenshot at 390×844 mid-countdown. TEST002 can assert that the countdown object appears through the DX004 hook.

#### Out of scope

Retuning `DANGER_LINE_Y` or the grace period. Screen-reader announcements of danger (A11Y003 consumes the hook added here).

### [UX003] Only start aiming from the play area, and let players cancel a drop

- **Category:** UX
- **Priority:** P2
- **Effort:** S
- **Confidence:** Medium
- **Affected files:** `src/game/systems/DrinkSpawner.ts`, `src/game/config/gameConfig.ts`
- **Affected experience:** Gameplay
- **Depends on:** BUG003
- **Blocks:** None
- **Can be combined with:** A11Y001, BUG003

#### Evidence and current behavior

After BUG003, buttons won't launch drinks, but *any other* press anywhere on the canvas still aims and launches. That includes the top canopy, the order tickets (non-interactive containers in `OrderManager.renderOrderTicket`), the score cards and the beach margins (`DrinkSpawner.ts:57-73`). There is no way to abort a drop: every `pointerup` launches. Whether releasing outside the canvas launches (Phaser emits `pointerupoutside` separately from `pointerup`) needs runtime validation.

#### Problem and impact

Touch players often rest a thumb or tap near the HUD or tickets to read them, which commits a drink they didn't mean to place. Accidental launches are the most common frustration in this genre.

#### Desired outcome

- Aiming begins only from a press within the board's horizontal span, below the ticket and canopy band (for example `y > BOARD.TOP`).
- Dragging the pointer clearly away (for example below the board bottom or off the canvas) and releasing cancels with a visible "cancel" state on the preview.
- Desktop hover-aiming keeps working.

#### Implementation guidance

Add an `AIM_ZONE` rectangle to `GAME_CONFIG` and check it in the armed-pointer logic introduced by BUG003. Show the cancel state by dimming the preview and hiding the guidance line. Handle `pointerupoutside` explicitly as a cancel.

#### Acceptance criteria

- [ ] Tapping on order tickets, the canopy or score cards launches nothing.
- [ ] Press in the board, drag below the board bottom, release: no launch, and the preview returns to ready.
- [ ] Press in the board, release in the board: launches at the release x (clamped as today).
- [ ] Mouse hover still moves the aim on desktop. Releasing outside the canvas cancels.

#### Validation plan

Manual at 390×844 (touch emulation) and 1440×900 (mouse). TEST002 cases for the ticket tap and the cancel drag. `pnpm run build`.

#### Out of scope

Keyboard aiming (A11Y001). Changes to clamping math.

### [UX004] Add a skippable first-run tutorial that teaches the upward launch, merging and To-Go orders

- **Category:** UX
- **Priority:** P1
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/scenes/GameScene.ts`, `src/game/ui/` (new tutorial overlay), `src/storage/SaveManager.ts`, `src/types/game.ts`, `src/game/ui/PauseModal.ts`
- **Affected experience:** Onboarding
- **Depends on:** CONTENT001
- **Blocks:** None
- **Can be combined with:** CONTENT001

#### Evidence and current behavior

The only instructions are:
- a single 16 px line on the menu, "Drop cocktails • Match pairs • Don't overflow!" (`MenuScene.ts:128`);
- three lines inside the pause modal (`PauseModal.ts:74`), which first-time players will never open.

Nothing explains that drinks fly *upward*, that the danger line is near the *launcher*, or what the To-Go tickets do. They silently remove matching drinks (`OrderManager.checkForMatchingOrders`, lines 164-187), which looks like a bug to a newcomer: in the scripted runtime session, drops of tiers 2–4 vanished into tickets. `SaveData.totalGamesPlayed` exists but drives nothing.

#### Problem and impact

The PRD's bar is "understandable without instructions" and "open on her phone and immediately enjoy" (§5, §29). The inverted layout breaks genre expectations, so a first-time player is likely to misread the goal and the loss condition.

#### Desired outcome

- On the first game only, a short coach-mark sequence teaches three things: (1) drag and release to launch upward; (2) match two identical drinks to mix the next one; (3) To-Go tickets take a matching drink for bonus points, and drinks must stay above the red line.
- Each step advances on the relevant action (or a "Next" button) and can be skipped at any point.
- It never shows again unless reopened from the pause menu ("How to play").

#### Implementation guidance

- Add `tutorialCompleted: boolean` to `SaveData` (default `false`; `SaveManager.load()` already merges defaults, so old saves stay compatible).
- Implement a `TutorialOverlay` in `src/game/ui/` driven by callbacks from `DrinkSpawner` (first launch), `MergeManager` (first merge) and `OrderManager` (first order).
- Keep the physics running so the tutorial is "learn by doing", but suppress game over during step 1.
- Use the copy from CONTENT001. Reuse ARCH001 buttons if they exist; don't block on them.

#### Acceptance criteria

- [ ] With cleared storage, starting a game shows step 1. Launching a drink advances to step 2, the first merge to step 3, and finishing or skipping ends the tutorial.
- [ ] "Skip" is available on every step and ends the tutorial immediately.
- [ ] After completion, a reload doesn't show it again. "How to play" in the pause menu replays it.
- [ ] Coach marks never cover the launcher or the drink being aimed at 360×640.
- [ ] Text meets A11Y005 sizes. The overlay can be dismissed with the keyboard (Esc/Enter).
- [ ] No game over can occur during step 1.

#### Validation plan

Manual with cleared `localStorage` at 390×844 and 1440×900, then reload to confirm persistence. TEST002 case "first-run tutorial shows once". `pnpm run build`.

#### Out of scope

Rewriting the copy itself (CONTENT001). The evolution ladder (UX010).

### [UX005] Stop To-Go orders from auto-collecting freshly launched drinks

- **Category:** UX
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/systems/OrderManager.ts`, `src/game/systems/MergeManager.ts`, `src/game/entities/Drink.ts`, `src/game/config/gameConfig.ts`
- **Affected experience:** Gameplay
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** CONTENT001

#### Evidence and current behavior

Orders request tiers 2–6 (`OrderManager.getRandomOrderLevel()`, lines 57-62; the comment wrongly says "2 through 7"). Spawns are drawn from tiers 0–4 (`GAME_CONFIG.SPAWN_DISTRIBUTION`, `gameConfig.ts:91-97`). `checkForMatchingOrders()` accepts *any* drink of the target tier with `y < scaleY(800)`, including one that was just launched and is still flying.

So 45% of spawns (tiers 2, 3 and 4 by weight) can satisfy an order directly. The reward is `baseScore * 2 + 100`, for example 420 points for a launched tier-3 drink, more than four tier-3 merges. Observed at runtime: launched drinks repeatedly vanished into tickets moments after release. The selection is also arbitrary (`Array.find` picks the first in the list), so the order can steal a drink the player was positioning for a merge.

#### Problem and impact

Orders reward luck rather than skill, undercut the merge economy, and make the player's own drinks disappear unexpectedly.

#### Desired outcome

Orders are fulfilled only by drinks the player *made* through merging, after they have settled. Requested tiers start above the spawnable range, or the reward accounts for the effort.

#### Implementation guidance

- Add `createdByMerge: boolean` on `Drink`, set in `MergeManager.handleDrinkCollision` (line 120).
- In `checkForMatchingOrders`, require `createdByMerge` plus a low-speed check (reuse the 1.2 threshold from `GameOverManager`).
- Derive the minimum order tier from the spawn table (`max(SPAWN_DISTRIBUTION.level) + 1` = 5) or keep 2–6 with merge-only matching, whichever playtests better. Make it configurable in `GAME_CONFIG.ORDERS`.
- Fix the comment.

#### Acceptance criteria

- [ ] A launched (non-merged) drink never fulfils an order, even when its tier matches.
- [ ] A merged drink of the requested tier fulfils it only after its speed drops below the threshold.
- [ ] Order tiers and rewards come from `GAME_CONFIG`, not literals in `OrderManager`.
- [ ] Existing ticket visuals and checkout animation are unchanged.

#### Validation plan

Manual: use the DX004 hook to launch drinks that match an order and confirm they are not taken. Merge to the target tier and confirm it is. Play 3 full games to sanity-check pacing. TEST001 unit test for the matching predicate. `pnpm run build`.

#### Out of scope

New order types or timers on orders.

### [UX006] Auto-pause when the tab or app is hidden, and stop background music

- **Category:** UX
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#10](https://github.com/anushibinj/cocktail-matcher/pull/10) (wave 1)
- **Priority:** P2
- **Effort:** S
- **Confidence:** Medium
- **Affected files:** `src/game/scenes/GameScene.ts`, `src/game/systems/AudioManager.ts`
- **Affected experience:** Gameplay
- **Depends on:** BUG001
- **Blocks:** None
- **Can be combined with:** BUG001, UX011

#### Evidence and current behavior

There is no `visibilitychange`, `blur` or Phaser `HIDDEN`/`BLUR` handling anywhere in `src/`. Phaser halts its own loop while the document is hidden, but BGM plays through a standalone `HTMLAudioElement` (`AudioManager.ts:68-76, 396-405`) that the game never pauses. When the player returns, play resumes mid-action with no pause screen. The music behavior is confirmed by code inspection. How browsers and OSes throttle hidden audio needs runtime validation on mobile.

#### Problem and impact

Answering a call or switching apps can leave music playing, which is a common annoyance and an accessibility issue for audio control. Coming back straight into a live board, possibly mid-danger countdown, can cost the run.

#### Desired outcome

Hiding the page or app while playing opens the pause modal and pauses BGM. Returning keeps the game paused until the player chooses Resume. BGM resumes only if music is enabled.

#### Implementation guidance

Listen to `this.game.events.on(Phaser.Core.Events.HIDDEN)`, or to `document.visibilitychange`, in `GameScene`. If the game is playing, call `handlePause()`. Add `AudioManager.suspendForBackground()`/`resumeFromBackground()` that pause the BGM element and `ctx.suspend()`/`resume()`. Remove the listener on scene shutdown.

#### Acceptance criteria

- [ ] Switching tabs during play and returning shows the pause modal, and the board is frozen (BUG001).
- [ ] BGM stops within 250 ms of hiding and doesn't play while hidden.
- [ ] Returning to the menu or game-over screen while hidden doesn't open a pause modal there.
- [ ] Music stays off after returning if it was disabled.
- [ ] No duplicate listeners after 3 restarts or menu round trips.

#### Validation plan

Manual tab switching in desktop Chrome. Emulate `document.visibilityState` in Playwright with `page.evaluate` and a dispatched event. On a real phone: app switch and lock screen (needs runtime validation). `pnpm run build`.

#### Out of scope

Saving and restoring a game in progress across reloads.

### [UX007] Handle rotation and resize, and guide landscape phone users back to portrait

- **Category:** UX
- **Priority:** P2
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/config/gameConfig.ts`, `src/main.ts`, `index.html`, `src/game/scenes/*.ts`
- **Affected experience:** Responsive
- **Depends on:** ARCH004
- **Blocks:** None
- **Can be combined with:** UX008

#### Evidence and current behavior

`computeCanvasHeight()` runs once, when the module is imported (`gameConfig.ts:22-35`). All board, spawn and danger coordinates are derived from that height at load. Loading in landscape and then rotating to portrait leaves the 1280 reference height and brings back the letterboxing the stretch was meant to remove. The reverse leaves a tall canvas in a short viewport.

In landscape on a phone (844×390), the whole game renders at **219×390 CSS px** (measured at runtime). Drinks and buttons become unusably small, and nothing tells the player to rotate. `manifest.webmanifest` declares `"orientation": "portrait"`, but that only applies to an installed PWA.

#### Problem and impact

Phones are often picked up in landscape, and tablets rotate freely. The game either looks broken or becomes unplayable until reload, with no explanation.

#### Desired outcome

- On touch devices in landscape where the canvas would be narrower than about 320 CSS px, a friendly "Rotate your phone to play" overlay appears and gameplay auto-pauses.
- When the aspect ratio changes materially while on the menu, the canvas height is recomputed (or the game reloaded cleanly).
- During a run, a resize never breaks input mapping.

#### Implementation guidance

- Add a CSS/DOM overlay in `index.html` shown with `@media (orientation: landscape) and (pointer: coarse) and (max-height: 500px)`. Pair it with a `matchMedia` listener that calls the pause path.
- For recomputation, the least risky route is to rebuild the `Phaser.Game` (`game.destroy(true)` → new game) when the menu is showing and the aspect changes by more than 10%. Geometry is baked into Matter bodies, so avoid live re-layout mid-run.
- ARCH004 centralises the derived geometry first so it can be recomputed in one place.

#### Acceptance criteria

- [ ] At 844×390 with touch, a rotate overlay covers the game and gameplay is paused. Rotating back hides it, and play remains paused until Resume.
- [ ] Desktop windows in landscape are not blocked (pointer: fine).
- [ ] Rotating on the menu from landscape to portrait yields a canvas that fills the portrait viewport with no letterbox bars (matching a fresh portrait load).
- [ ] Mid-run resize keeps aim aligned with the pointer and never throws.
- [ ] No regression of BUG005 centering.

#### Validation plan

Playwright: `page.setViewportSize` portrait → landscape → portrait on the menu and in game, with screenshots. Real-device rotation on iOS and Android (needs runtime validation). `pnpm run build`.

#### Out of scope

A dedicated landscape layout. Safe-area padding (UX008).

### [UX008] Keep HUD controls clear of iPhone notches and status bars

- **Category:** UX
- **Priority:** P2
- **Effort:** S
- **Confidence:** Medium
- **Affected files:** `index.html`, `src/game/ui/HUD.ts`, `src/game/scenes/MenuScene.ts`
- **Affected experience:** Responsive, Accessibility
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** UX007, A11Y004

#### Evidence and current behavior

`index.html` opts into edge-to-edge drawing (`viewport-fit=cover`, line 5) and a translucent status bar in standalone mode (`apple-mobile-web-app-status-bar-style: black-translucent`, line 10). Nothing applies `env(safe-area-inset-*)`. The HUD buttons sit at canvas y=48 (`HUD.ts:26-56`) and the menu toggles at y=60 (`MenuScene.ts:144-160`). At 390×844 that is about 26–33 CSS px from the top edge, inside the iPhone status-bar and Dynamic Island area (about 47–59 pt) when launched from the home screen. Confirmed by code inspection and arithmetic; the on-device overlap needs runtime validation.

#### Problem and impact

Pause, sound and music controls may be partly hidden or hard to tap on modern iPhones in PWA mode.

#### Desired outcome

Interactive controls and critical text never fall under device cutouts or system bars, in browser or standalone mode.

#### Implementation guidance

Pad `#game-container` with `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`, so Phaser's FIT fits within the safe area. Let the page background fill the insets. Check `computeCanvasHeight()` against the *padded* container size rather than `window.innerHeight` (gameConfig line 27).

#### Acceptance criteria

- [ ] In iOS standalone mode (or the Safari simulator) on a notched device, no button or text overlaps the status bar or home indicator.
- [ ] Non-notched devices and desktop are unchanged (insets resolve to 0).
- [ ] Canvas height calculation uses the safe-area-adjusted height.

#### Validation plan

iOS Simulator or a real iPhone with "Add to Home Screen" (needs runtime validation). Desktop regression at 390×844 and 1440×900. `pnpm run build`.

#### Out of scope

Button sizes (A11Y004).

### [UX009] Confirm before Restart or Main Menu throws away a run

- **Category:** UX
- **Priority:** P3
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/ui/PauseModal.ts`
- **Affected experience:** Gameplay, Replay
- **Depends on:** ARCH001
- **Blocks:** None
- **Can be combined with:** A11Y002

#### Evidence and current behavior

In the pause modal, "🔄 Restart Game" and "Main Menu" act immediately on `pointerdown` (`PauseModal.ts:130-148`). They sit 50–70 canvas px below Resume, and the run's score is lost with no confirmation. "Main Menu" also skips `SaveManager.recordGamePlayed`, so the abandoned run isn't counted.

#### Problem and impact

A slightly mis-aimed tap aimed at Resume can wipe a long run. Small tap targets (A11Y004) make this more likely on phones.

#### Desired outcome

Restart and Main Menu from the pause modal ask for a one-step confirmation, for example the button turns into "Tap again to restart" for 3 s, or a small inline confirm appears. The Game Over modal needs no confirmation.

#### Implementation guidance

Implement as a reusable "confirm" state on the ARCH001 button component. Decide whether an abandoned run should count toward `totalGamesPlayed` and record it consistently.

#### Acceptance criteria

- [ ] A single tap on Restart or Main Menu in the pause modal doesn't leave the run. A second confirming tap within the window does.
- [ ] The confirm state times out and reverts after 3 s.
- [ ] Keyboard: Enter on a focused Restart shows the confirm, and a second Enter performs it (with A11Y002).
- [ ] The Game Over modal buttons act immediately as today.

#### Validation plan

Manual at 390×844 and 1440×900. A TEST002 case for restart confirmation. `pnpm run build`.

#### Out of scope

Undo after restart.

### [UX010] Celebrate progression: new-tier unlocks, an evolution ladder, max-tier merges and run stats

- **Category:** UX
- **Priority:** P2
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/systems/MergeManager.ts`, `src/game/scenes/GameScene.ts`, `src/storage/SaveManager.ts`, `src/game/ui/HUD.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`, `src/game/scenes/MenuScene.ts`
- **Affected experience:** Gameplay, Completion, Replay
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** UI004

#### Evidence and current behavior

- `SaveManager` stores `highestDrinkUnlocked` (updated only at game over, `SaveManager.ts:87-93`). `getHighestDrinkUnlocked()` (line 95) is never called, so the value is never shown.
- `GameScene.highestDrinkThisGame` is tracked (lines 27, 59-61, 115-117) only to feed that save.
- There is no evolution chart anywhere, despite README line 130.
- When two tier-11 "Ultimate Cocktail" drinks touch, `MergeManager.handleDrinkCollision` simply returns (lines 85-87), with no reward or feedback.
- Merges into new tiers get the same effect as any other, apart from screen shake scaling at tier 5 and above (lines 184-187) and a second note at tier 6 and above in `AudioManager.playMerge`.
- The Game Over card shows only score and best.

#### Problem and impact

The 12-tier ladder is the game's long-term goal, but players can't see what comes next, can't tell when they've reached something new, and get no payoff for reaching the top. PRD §15 asks for "a stronger effect for major milestones".

#### Desired outcome

- **First-time tier.** A brief banner, such as "New drink unlocked: Blue Lagoon!", with a stronger burst when a merge creates a tier above `highestDrinkUnlocked`. The record updates immediately, not just at game over.
- **Evolution ladder.** A ladder of all 12 tiers, with locked tiers shown as silhouettes, is viewable from the pause modal and the menu.
- **Max-tier pair.** Two Ultimate Cocktails touching give a defined payoff (for example both clear with a large bonus). This is a design decision; record the choice in the PRD.
- **Run stats.** The Game Over card shows the highest drink reached this run.

#### Implementation guidance

- Add an `onTierReached(level, isFirstEver)` callback from `MergeManager` to `GameScene`. `SaveManager.recordTierReached(level)` saves immediately.
- Render the ladder with the existing `drink_N` textures, scaled small, with a dark tint for locked tiers.
- Keep the banner short (≤ 1.5 s) and non-blocking. Respect A11Y006.
- Coordinate HUD space with UX001.

#### Acceptance criteria

- [ ] Creating a tier for the first time ever shows the unlock banner once. Repeats in later runs don't.
- [ ] `highestDrinkUnlocked` updates the moment a new tier is reached (survives a reload mid-run).
- [ ] The ladder shows all 12 tiers, with unreached tiers locked, and is reachable from pause and menu by touch and keyboard.
- [ ] Two tier-11 drinks colliding trigger the chosen payoff exactly once (with the guards from MergeManager's existing lock).
- [ ] The Game Over card shows the highest tier reached this run (name plus thumbnail) and still fits at 360×640.

#### Validation plan

Spawn high tiers with the DX004 hook. Manual run-through with cleared storage. TEST001 unit test for the unlock bookkeeping in `SaveManager`. `pnpm run build`.

#### Out of scope

Achievements, leaderboards (PRD §4 non-goals). Menu visual redesign (UI004).

### [UX011] Route background music through Web Audio so volume balance and mute work on iOS

- **Category:** UX
- **Priority:** P2
- **Effort:** S
- **Confidence:** Medium
- **Affected files:** `src/game/systems/AudioManager.ts`
- **Affected experience:** Gameplay, Accessibility
- **Depends on:** None
- **Blocks:** ARCH006
- **Can be combined with:** PERF001, UX006

#### Evidence and current behavior

BGM plays through an `HTMLAudioElement` whose level is set with `bgmAudio.volume = 0.35` (`AudioManager.ts:72, 101, 400`). A `musicGain` GainNode is created and updated (lines 38-40, 103-105), but nothing is ever connected to it. iOS Safari treats `HTMLMediaElement.volume` as read-only (always 1.0). On iPhone and iPad, music is therefore likely to play at full volume, well above SFX (`sfxGain` 0.75 × per-sound gains of 0.18–0.45). This is platform-documented behavior inferred from the code and needs on-device validation.

#### Problem and impact

On a primary target platform (PRD §1, iPhone/iPad), loud music can drown out the gameplay sounds that carry feedback, and the intended mix is lost.

#### Desired outcome

Music level is controlled by `musicGain` on every platform. The music/SFX balance sounds the same on iOS and desktop, and toggling music off silences it immediately.

#### Implementation guidance

Connect the element via `ctx.createMediaElementSource(bgmAudio).connect(musicGain)` and leave `.volume` at 1. Alternatively, decode the file into an `AudioBuffer` and loop it with an `AudioBufferSourceNode`, which also gives gapless loops. Ensure the `AudioContext` is resumed in the existing `unlock` handler before playing. Coordinate with PERF001, which lazy-loads and compresses the file.

#### Acceptance criteria

- [ ] On desktop Chrome, music level is unchanged by ear compared with today (0.35 relative).
- [ ] On iOS Safari, music plays noticeably quieter than SFX peaks, matching desktop (needs device validation).
- [ ] The music toggle mutes and unmutes within 100 ms on all platforms.
- [ ] No `.volume` writes remain in `AudioManager`.

#### Validation plan

Manual listening on desktop Chrome and Firefox and on an iPhone or iPad (needs runtime validation). `pnpm run build`.

#### Out of scope

Separate volume sliders (could follow). Replacing the BGM track.

### Visual design (UI)

### [UI001] Replace emoji glyph icons with drawn icons on high-contrast button bases

- **Category:** UI
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/utils/AssetGenerator.ts`, `src/game/ui/HUD.ts`, `src/game/scenes/MenuScene.ts`, `src/game/ui/PauseModal.ts`, `src/game/systems/OrderManager.ts`
- **Affected experience:** Gameplay, Accessibility
- **Depends on:** ARCH001
- **Blocks:** None
- **Can be combined with:** A11Y004

#### Evidence and current behavior

Every icon is an emoji rendered as canvas text:
- 🔊/🔇 and 🎵/🚫 (`HUD.ts:28, 41`; `MenuScene.ts:146, 160`);
- ⏸ (`HUD.ts:54`);
- 🔄 (`PauseModal.ts:122`);
- 🍹 bullets (`PauseModal.ts:74`);
- 🪙 (`OrderManager.ts:130`);
- ✔ (`OrderManager.ts:199`).

Their look depends on the OS emoji font: tofu boxes on fonts without coverage, and different art on Apple, Google and Microsoft. 🚫 for "music off" is not a recognisable convention.

The button base `ui_btn_circle` is 15% white fill with a 40% white stroke (`AssetGenerator.generateUIElements`). It sits on the background canopy's alternating white and `#f87171` stripes (`generateBackground`, "Beach Canopy" block):
- The HUD sound button (x=560) sits on a **white** stripe, so its circle nearly disappears.
- The white ⏸ glyph on the red stripe (x=668) is about **2.8:1**, below WCAG 1.4.11's 3:1 for UI components.

The 390×844 screenshots show the sound icon and pause glyph as faint marks.

#### Problem and impact

The most-used controls (pause, mute) are hard to see, render inconsistently across devices, and fail non-text contrast.

#### Desired outcome

All icons are drawn by `AssetGenerator` as vector-style textures: speaker, speaker-muted, music, music-muted, pause, restart, check and coin. They sit on an opaque button base whose boundary has at least 3:1 contrast against both canopy stripe colors, and each icon has at least 3:1 contrast against its own base.

#### Implementation guidance

Add `generateIcons()` to `AssetGenerator` (canvas paths, white on a dark `#14102d`-style disc with a light ring). Expose them as `icon_*` texture keys. Swap the `text` glyphs in HUD, Menu, Pause and OrderManager for sprites through the ARCH001 component. Keep emoji only in decorative copy if at all.

#### Acceptance criteria

- [ ] No emoji characters remain in UI controls (`grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src` returns only intentional decorative copy, or nothing).
- [ ] Measured contrast: button outer edge vs each canopy stripe ≥ 3:1, and icon vs button base ≥ 3:1 (record the values in the PR).
- [ ] Muted states are visually distinct without color alone (slash or cross shape).
- [ ] Icons render identically in Chromium on Linux, Windows and macOS (screenshots).

#### Validation plan

Screenshots at 390×844 and 1440×900. Contrast measured with a color picker plus a WCAG contrast calculator. `pnpm run build`.

#### Out of scope

Target size (A11Y004, combinable). Fonts (UI002).

### [UI002] Load one consistent display font before any text is drawn

- **Category:** UI
- **Priority:** P3
- **Effort:** S
- **Confidence:** High
- **Affected files:** `index.html`, `src/game/scenes/BootScene.ts`, `src/game/scenes/*.ts`, `src/game/ui/*.ts`, `src/game/systems/ScoreManager.ts`, `src/game/systems/OrderManager.ts`
- **Affected experience:** Gameplay, Onboarding
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** A11Y005

#### Evidence and current behavior

Every `add.text` call repeats `fontFamily: 'Segoe UI, system-ui, sans-serif'` inline (30 occurrences across 7 files). `index.html:31` lists `'Quicksand'`, which is never loaded. Text therefore renders in Segoe UI on Windows, San Francisco on Apple and Roboto or DejaVu elsewhere. Each has different widths and heights, and the absolute layouts (for example the ticket text and score cards) were tuned for one of them.

#### Problem and impact

The friendly "cartoon tropical" look asked for in PRD §13 depends on the platform, and labels can overflow or misalign on other fonts.

#### Desired outcome

One rounded display font, self-hosted as woff2 with an appropriate license, is loaded before `MenuScene` renders. All text styles come from a shared `TEXT_STYLES` map.

#### Implementation guidance

Put the font in `public/fonts/` and add `@font-face` in `index.html`. In `BootScene`, await `document.fonts.load('700 28px "<Font>"')` before `scene.start('MenuScene')`. Create `src/game/config/textStyles.ts` and replace the inline style objects. Keep a system fallback.

#### Acceptance criteria

- [ ] Menu, HUD, modals, tickets and popups all render in the chosen font on Chromium/Linux, Windows and macOS (screenshots).
- [ ] No fallback-font flash on the menu after a cold load.
- [ ] Font payload ≤ 60 kB woff2 (subset if needed).
- [ ] No `fontFamily:` literals remain outside `textStyles.ts`.

#### Validation plan

Throttled ("Slow 4G") cold load in DevTools to check for a flash. Screenshots at 390×844. `pnpm run build`.

#### Out of scope

Text size changes (A11Y005).

### [UI003] Investigate rendering sharpness on high-DPI phones

- **Category:** UI
- **Priority:** P3
- **Effort:** M
- **Confidence:** Medium
- **Affected files:** `src/main.ts`, `src/game/config/gameConfig.ts`, `src/utils/AssetGenerator.ts`
- **Affected experience:** Gameplay, Performance
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

The canvas backing store is always 720 px wide (measured: `720×1558` at 390×844). On a DPR-3 phone that is shown on 1,170 physical pixels, about **1.6× upscaled**. Procedural drink textures are generated at 1× display size (`size = radius*2 + 16`, `AssetGenerator.generateDrinkTextures`), and Phaser 3.90 has no `resolution` game option. Whether this looks noticeably soft on real devices needs runtime validation. The DPR-3 headless screenshot is acceptable but visibly softer on text edges.

#### Problem and impact

A polished casual game relies on crisp edges. Softness is most visible on small text (tickets, labels).

#### Desired outcome

A measured decision: either render at a higher internal resolution (with an FPS budget confirmed on a mid-range Android), or document why 1× is kept.

#### Implementation guidance

Spike option A: scale the virtual canvas by `k = min(devicePixelRatio, 2)` (WIDTH = 720k) and set `cameras.main.setZoom(k)` so game coordinates stay unchanged. Check that input mapping and Matter coordinates still line up. Option B: generate textures at 2× and keep `setDisplaySize`. Text gets `setResolution(k)`. Measure the frame time with a 30-drink board.

#### Acceptance criteria

- [ ] A written comparison (screenshots plus a frame-time table on at least one real phone) is attached to the PR or added to `CLAUDE.md`.
- [ ] If adopted: text and glass edges are visibly sharper at DPR 3, game logic coordinates are unchanged, and 60 fps holds on the test device with 30 drinks.
- [ ] If rejected: rationale recorded and no code change.

#### Validation plan

Real-device test (needs runtime validation). Playwright DPR-3 screenshots before and after. `pnpm run build`.

#### Out of scope

Replacing procedural art with image assets.

### [UI004] Unify the menu composition and theme colors with the beach art

- **Category:** UI
- **Priority:** P3
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/scenes/MenuScene.ts`, `index.html`, `public/manifest.webmanifest`, `src/main.ts`
- **Affected experience:** Onboarding, Responsive
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** UX010, BUG009

#### Evidence and current behavior

- **Menu spacing.** The menu places elements at fixed fractions of the height: title at 0.28, best card at 0.54, Play at 0.68, tip at 0.82 (`MenuScene.ts:18, 70, 90, 128`). On a 390×844 phone (canvas 1558 tall) this leaves large empty sand bands between the subtitle and the best card and below the tip (screenshot `phone-390x844-menu`).
- **Letterbox color.** The letterbox is a dark navy gradient (`index.html:30`) next to a bright beach scene, framed by a heavy `box-shadow`, so on tablet and desktop the game looks pasted onto an unrelated page.
- **Theme colors disagree:**
  - `<meta name="theme-color">` is `#ff7e5f` (`index.html:8`);
  - the manifest has `theme_color: #ff006e` and `background_color: #1d1135`;
  - Phaser `backgroundColor` is `#1d1135` (`main.ts:12`).
- **Low-contrast tip.** The tip text is `#cfcbe8` with a 2 px stroke on yellow sand.

#### Problem and impact

The first screen looks sparse, and the browser chrome and splash colors clash with the art, which weakens the "coherent and intentional" bar from PRD Milestone 6.

#### Desired outcome

The menu is vertically balanced at 9:16 through 9:21. The letterbox and theme colors come from one palette that complements the beach (for example a sunset gradient). The tip text meets 4.5:1.

#### Implementation guidance

Lay out the menu from the top and bottom safe edges and cluster logo, title, best card and Play in the upper two-thirds. Use the freed space for the ladder preview if UX010 lands. Define palette constants once and reuse them in `index.html`, the manifest and `main.ts`.

#### Acceptance criteria

- [ ] At 390×844 and 360×640, no vertical gap between consecutive menu elements exceeds 20% of the canvas height.
- [ ] `theme-color`, manifest `theme_color`/`background_color` and the page background use the same documented palette values.
- [ ] The menu tip contrast is ≥ 4.5:1 (or the tip is moved onto a panel).

#### Validation plan

Screenshots at 360×640, 390×844, 768×1024 and 1440×900. `pnpm run build`.

#### Out of scope

New illustration assets. The PWA icons (BUG009).

### Accessibility (A11Y)

### [A11Y001] Make the core loop playable with a keyboard

- **Category:** A11Y
- **Priority:** P1
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/systems/DrinkSpawner.ts`, `src/game/scenes/GameScene.ts`, `src/game/ui/HUD.ts`
- **Affected experience:** Gameplay, Accessibility
- **Depends on:** BUG003
- **Blocks:** None
- **Can be combined with:** UX003

#### Evidence and current behavior

No `input.keyboard` usage exists in `src/`. Aiming and launching are pointer-only (`DrinkSpawner.setupInput`, lines 57-73), and pause is a pointer-only HUD sprite (`HUD.ts:52-62`). The only keyboard interaction in the codebase is `AudioManager`'s audio-unlock `keydown` listener (`AudioManager.ts:61`).

#### Problem and impact

Keyboard-only and switch users can't play at all (WCAG 2.1.1 Keyboard, Level A). Desktop players also expect arrow keys and Space in this genre.

#### Desired outcome

- ←/→ (and A/D) move the aim in steps; holding the key moves it continuously, and Shift moves it in fine steps.
- Space, Enter or ↑ launches.
- Esc or P toggles pause.
- Keyboard and pointer can be mixed freely.
- A small "← → aim · Space launch · Esc pause" hint shows on devices with a fine pointer.

#### Implementation guidance

Add `handleAimDelta(dx)` and a public `launch()` to `DrinkSpawner` that reuse the existing clamp, cooldown and guard logic (BUG002/BUG003 state). Register keys in `GameScene` with `this.input.keyboard.addKeys` and clean them up on shutdown. Respect the game phase (ignore while paused or game over). Make the hold speed frame-rate independent (use `delta`).

#### Acceptance criteria

- [ ] From Play, a full game can be played, paused, resumed and lost using only the keyboard.
- [ ] Aim never leaves the clamped range for the current drink's radius.
- [ ] Holding a key moves aim at a constant speed independent of frame rate (same distance at 30 and 60 fps, ±5%).
- [ ] Launch respects the 450 ms cooldown, and key auto-repeat cannot queue extra launches.
- [ ] Keys do nothing while a modal is open, except Esc, which resumes from pause (coordinated with A11Y002).
- [ ] The keyboard hint is shown on desktop and hidden on touch-only devices.

#### Validation plan

Manual keyboard-only run at 1440×900. Playwright `page.keyboard` cases in TEST002. `pnpm run build`.

#### Out of scope

Menu and modal keyboard navigation (A11Y002). Gamepad support.

### [A11Y002] Keyboard navigation, visible focus and focus management for menu and modals

- **Category:** A11Y
- **Priority:** P1
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/ui/` (ARCH001 component), `src/game/scenes/MenuScene.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`, `src/game/ui/HUD.ts`
- **Affected experience:** Onboarding, Completion, Replay, Accessibility
- **Depends on:** ARCH001
- **Blocks:** None
- **Can be combined with:** UX009

#### Evidence and current behavior

All menu and modal controls are Phaser sprites, text or zones activated only by `pointerdown`:
- Menu Play (`MenuScene.ts:118`) and the audio toggles (lines 150, 164);
- Pause Resume, Restart and Menu (`PauseModal.ts:115, 130, 145`) and the toggles (line 210);
- Game Over Play Again and Menu (`GameOverModal.ts:109, 126`).

There is no focus state or focus indicator, and Tab, Enter and Esc do nothing. When a modal opens, nothing receives focus, and nothing traps focus in it.

#### Problem and impact

Keyboard users can't start a game, resume or replay (WCAG 2.1.1, 2.4.3 Focus Order, 2.4.7 Focus Visible, and 2.4.11 Focus Not Obscured in WCAG 2.2).

#### Desired outcome

- Every interactive control is reachable with Tab/Shift+Tab (and arrow keys within a modal) and activates with Enter or Space.
- A clearly visible focus ring (≥ 2 px, ≥ 3:1 contrast) marks the focused control.
- Opening a modal focuses its primary action, and focus stays trapped in the modal.
- Esc resumes from pause.
- Closing the pause modal returns focus to the pause button.
- The menu's initial focus is Play.

#### Implementation guidance

Implement a small `FocusGroup` helper alongside the ARCH001 `UIButton`. It keeps an ordered list of buttons, the current index and a focus-ring graphic, and binds keyboard keys while active. Each modal or scene owns one group, and opening a modal pushes a group onto a stack. Keep pointer hover and focus in sync.

#### Acceptance criteria

- [ ] Menu: Tab cycles Play → Sound → Music, Enter on Play starts the game, and Enter on the toggles flips them.
- [ ] Pause: opening focuses Resume; Tab cycles every control without escaping to the game; Esc resumes; focus returns to the pause button.
- [ ] Game Over: opening focuses Play Again, and Enter restarts without launching a drink (BUG003).
- [ ] The focus ring is visible on every control, with ≥ 3:1 contrast against both the card background and the button.
- [ ] Mouse and touch behavior unchanged.

#### Validation plan

Keyboard-only walkthrough at 1440×900. Playwright `page.keyboard.press('Tab')` sequences in TEST002 with screenshot checks of the focus ring. `pnpm run build`.

#### Out of scope

Screen-reader exposure of controls (A11Y003). In-game aiming keys (A11Y001).

### [A11Y003] Give the canvas an accessible name and announce key game events

- **Category:** A11Y
- **Priority:** P2
- **Effort:** M
- **Confidence:** High
- **Affected files:** `index.html`, `src/main.ts`, `src/game/scenes/GameScene.ts`, new `src/a11y/Announcer.ts`
- **Affected experience:** Accessibility
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

The page has only `<div id="game-container">` (`index.html:53`), into which Phaser injects an unlabeled `<canvas>`. There are no ARIA attributes, live regions or text alternatives anywhere. Score, game over, new best and order completion exist only as pixels.

#### Problem and impact

Screen-reader users get no information about what the page is or what is happening (WCAG 1.1.1 Non-text Content, 4.1.2 Name/Role/Value, 4.1.3 Status Messages). Low-vision players who use a reader as a supplement also lose the key status changes.

#### Desired outcome

- The canvas exposes a role and accessible name, for example `role="application"` or `img` with `aria-label="Cocktail Merge game board"`, and an `aria-describedby` pointing to concise rules.
- A visually hidden `aria-live="polite"` region announces: game started, the current and next drink after each launch (throttled), merges into a new tier, order completed, new best score, and game over with the final score.
- Danger start is announced in an `assertive` region.
- Announcements respect a rate limit (at most one polite message per 1.5 s, latest wins).

#### Implementation guidance

Create an `Announcer` singleton that writes to two hidden DOM nodes added in `index.html` (visually hidden CSS, not `display:none`). Emit announcements from `GameScene` callbacks that already exist (score, merge, order, game over), plus the UX002 danger hook if present. Don't mirror the whole UI in the DOM. Full non-visual play of a physics game is out of scope.

#### Acceptance criteria

- [ ] With VoiceOver or NVDA, landing on the page announces the game name and short instructions.
- [ ] Game over announces "Game over. Score N." and, when applicable, "New best score."
- [ ] Merging into a tier not yet reached this run announces the drink name. Routine merges are not announced individually.
- [ ] No more than one polite announcement per 1.5 s in a 60 s play sample.
- [ ] Hidden live regions take no visible space and are not focusable.

#### Validation plan

Manual with NVDA in Chrome or Firefox (Windows) and VoiceOver on macOS or iOS (needs runtime validation; not available in this review). Playwright can assert live-region text content in TEST002. `pnpm run build`.

#### Out of scope

Making aiming or physics perceivable non-visually. DOM replicas of buttons (A11Y002 handles keyboard).

### [A11Y004] Enlarge touch targets to at least 44 CSS px on phones

- **Category:** A11Y
- **Priority:** P1
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/ui/HUD.ts`, `src/game/scenes/MenuScene.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`
- **Affected experience:** Gameplay, Replay, Accessibility
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** UI001, ARCH001, UX008

#### Evidence and current behavior

The canvas is 720 units wide, so one canvas unit is 0.54 CSS px on a 390 px phone and 0.50 CSS px on a 360 px phone. Current hit areas:

| Control | Canvas size | CSS px at 390 / 360 wide |
|---|---|---|
| HUD sound, music, pause (`HUD.ts:26, 39, 52`) | 42×42 | ≈ 22.8 / 21 |
| Menu sound, music (`MenuScene.ts:144, 158`) | 48×48 | ≈ 26 / 24 |
| Pause Sound FX / Music toggles (`PauseModal.ts:208`) | 100×36 | height ≈ 19.5 / 18 |
| "Main Menu" text links (`PauseModal.ts:138`, `GameOverModal.ts:117`) | text bounds, 16–18 px font | ≈ 13 tall |
| "Restart Game" text link (`PauseModal.ts:122`) | text bounds, 16–18 px font | ≈ 13 tall |

The HUD buttons are only 54 canvas units apart (560 / 614 / 668). WCAG 2.2 2.5.8 (AA) requires 24×24 CSS px or equivalent spacing. Platform guidance (Apple 44 pt, Material 48 dp) and PRD §17 ("Important controls must remain easy to tap") call for more.

#### Problem and impact

Pause, mute and modal secondary actions are easy to miss or mis-tap on phones. Combined with BUG003 and UX009, mis-taps cost drinks or whole runs.

#### Desired outcome

Every interactive control has a hit area of at least 88×88 canvas units (≥ 44 CSS px at 360 px width), even if the visual is smaller. Adjacent hit areas don't overlap. Text links become full-width buttons.

#### Implementation guidance

Use `setInteractive(new Phaser.Geom.Rectangle(...), Phaser.Geom.Rectangle.Contains)` or invisible zones sized from a single `MIN_TARGET` constant (88 canvas units). Re-space the HUD cluster (for example 96 apart, possibly in two corners). Convert "Restart Game" and "Main Menu" to secondary pill buttons. If ARCH001 exists, enforce the minimum in the component.

#### Acceptance criteria

- [ ] Each control's interactive bounds (`input.hitArea` scaled) are ≥ 88×88 canvas units. Verify with Phaser's input debug (`this.input.enableDebug(obj)`) or a unit check.
- [ ] No two hit areas overlap.
- [ ] At 360×640, every control is tappable without triggering a neighbour (manual check with touch emulation).
- [ ] Visual layout fits at 360×640 and 390×844 without overlapping the board or tickets.

#### Validation plan

Turn on the DX004 debug overlay to draw hit areas, then take screenshots at 360×640 and 390×844. Manual touch testing in DevTools device mode. `pnpm run build`.

#### Out of scope

Icon artwork (UI001). Keyboard focus (A11Y002).

### [A11Y005] Raise text size and contrast to legible levels at phone scale

- **Category:** A11Y
- **Priority:** P1
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/systems/OrderManager.ts`, `src/game/ui/HUD.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`, `src/game/scenes/MenuScene.ts`
- **Affected experience:** Gameplay, Accessibility
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** UI002

#### Evidence and current behavior

At 390 px width, one canvas unit is 0.54 CSS px. Rendered text sizes:

| Text | Canvas size | CSS px |
|---|---|---|
| Order ticket "Order #N" (`OrderManager.ts:112-116`) | 10 | **5.4** |
| Ticket reward (line 130-135) | 11 | 5.9 |
| Ticket header "To-Go Order" (line 104-109) | 12 | 6.5 |
| HUD "SCORE" / "BEST" labels (`HUD.ts:77, 95`) | 13 | 7.0 |
| Pause toggle labels (`PauseModal.ts:182-187`) | 14 | 7.6 |
| Pause help body (line 74-80) | 15 | 8.1 |
| Menu tip (`MenuScene.ts:128`) | 16 | 8.7 |

Contrast failures:
- `#888888` ticket number on white: **3.54:1**.
- `#b06b00` reward text on `#fff3b0`: about **3.8:1**.

Both are below 4.5:1 (WCAG 1.4.3). The ticket text is unreadable in the 390×844 screenshot.

#### Problem and impact

The To-Go mechanic depends on reading the ticket, and players can't read it on a phone. Instructions in the pause modal are tiny. PRD §13 asks for "readable on small screens".

#### Desired outcome

At 360 px width:
- body and instructional text ≥ 14 CSS px (≈ 28 canvas units);
- secondary labels ≥ 12 CSS px (≈ 24 canvas units);
- all text ≥ 4.5:1 (≥ 3:1 for text ≥ 18.66 px bold).

Tickets show the drink thumbnail large and readable; drop decorative text ("Order #N") if space is short.

#### Implementation guidance

Define minimum sizes in a shared text-style module (UI002 if it lands). Redesign the ticket at a larger size or simplify it: thumbnail, drink name and reward. Recheck that the two slots (x=280/440) still fit; widen the spacing if needed, or anchor them via ARCH004 constants. Darken the gray and reward colors.

#### Acceptance criteria

- [ ] No `fontSize` below 24 canvas units anywhere in `src/` (grep check), and no instructional text below 28.
- [ ] Every text/background pair meets 4.5:1, or 3:1 for large bold text. List the measured pairs in the PR.
- [ ] Tickets, HUD and modals fit without clipping at 360×640 and 390×844.
- [ ] A drink name is visible on each order ticket (no thumbnail-only identification).

#### Validation plan

Screenshots at 360×640 and 390×844, checked with a contrast calculator. A grep for `fontSize: '(1[0-9]|[0-9])px'`. `pnpm run build`.

#### Out of scope

Font family (UI002). Tutorial copy (CONTENT001).

### [A11Y006] Respect reduced-motion preferences

- **Category:** A11Y
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/systems/MergeManager.ts`, `src/game/scenes/MenuScene.ts`, `src/game/ui/GameOverModal.ts`, `src/game/entities/Board.ts`, `src/game/ui/HUD.ts`, `src/storage/SaveManager.ts`, `src/types/game.ts`, `src/game/ui/PauseModal.ts`
- **Affected experience:** Accessibility, Gameplay
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

There is no `prefers-reduced-motion` check anywhere (no `matchMedia` in `src/`), even though PRD §15 says "Respect reduced-motion preferences". Motion sources include:
- camera shake on merges of tier 5 and above (`MergeManager.ts:184-187`);
- the infinite Play-button pulse (`MenuScene.ts:108-116`) and logo bob (lines 30-39);
- the infinite "new best" pulse (`GameOverModal.ts:61-68`);
- the danger-line flash (`Board.ts:85-91`);
- the score pulse (`HUD.ts:120-126`);
- pop-in scale tweens on modals, tickets and previews.

#### Problem and impact

Screen shake and constant pulsing can cause discomfort for people with vestibular disorders (WCAG 2.3.3 AAA, plus the PRD requirement).

#### Desired outcome

When the OS requests reduced motion (or an in-game "Reduce motion" setting is on):
- no camera shake;
- no infinite pulsing or bobbing;
- pop-ins become short fades;
- danger is shown as a steady color change rather than flashing.

Gameplay physics are unchanged.

#### Implementation guidance

- Add `reduceMotion: boolean | null` to `SaveData` (null means follow the OS) and a toggle in the pause settings.
- Add a `Motion.isReduced()` helper reading `matchMedia('(prefers-reduced-motion: reduce)')` and the save, with a change listener.
- Gate each effect listed above through the helper.

#### Acceptance criteria

- [ ] With Chrome DevTools "Emulate CSS prefers-reduced-motion: reduce", a full game shows no shake and no repeating tweens. Check `this.tweens.getTweens()` for `repeat === -1`.
- [ ] The in-game toggle overrides the OS setting both ways and persists across reload.
- [ ] Merge feedback is still clear: particles, sound and score popup remain.

#### Validation plan

Playwright `page.emulateMedia({ reducedMotion: 'reduce' })` plus a check of active tweens. Manual check. `pnpm run build`.

#### Out of scope

Particle density options.

### [A11Y007] Stop disabling browser zoom globally

- **Category:** A11Y
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#6](https://github.com/anushibinj/cocktail-matcher/pull/6) (wave 1)
- **Priority:** P3
- **Effort:** XS
- **Confidence:** Medium
- **Affected files:** `index.html`
- **Affected experience:** Accessibility, Responsive
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** BUG005, BUG009

#### Evidence and current behavior

`index.html:5` sets `maximum-scale=1.0, user-scalable=no`, and lines 26-35 apply `touch-action: none` and `overflow: hidden` to `html, body`. Together these block pinch zoom everywhere, including the letterbox margins and any future DOM overlays (A11Y003, UX007).

#### Problem and impact

Low-vision users can't magnify the game (WCAG 1.4.4 Resize Text). iOS ignores `user-scalable=no`, but Android browsers may honor it. The gesture blocking the game needs belongs on the canvas, not the whole page.

#### Desired outcome

Pinch zoom works outside the canvas. Gameplay gestures on the canvas are still captured without scrolling, zooming or double-tap zoom.

#### Implementation guidance

Remove `maximum-scale` and `user-scalable=no`. Move `touch-action: none` to `canvas` (and the container). Keep `overscroll-behavior: none` on the body. Validate on iOS that rapid taps on the canvas don't double-tap-zoom.

#### Acceptance criteria

- [ ] The viewport meta has no `maximum-scale` or `user-scalable=no`.
- [ ] On Android Chrome, pinch on the letterbox margin zooms the page. Pinch or drag on the canvas does not scroll or zoom.
- [ ] On iOS Safari, rapid launches don't trigger double-tap zoom (needs device validation).

#### Validation plan

Real-device check on Android and iOS (needs runtime validation). DevTools device-mode regression. `pnpm run build`.

#### Out of scope

An in-game UI scale setting.

### Performance (PERF)

### [PERF001] Lazy-load and compress the 2.3 MB background-music file

- **Category:** PERF
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/systems/AudioManager.ts`, `public/assets/audio/bgm.m4a`
- **Affected experience:** Performance, Onboarding
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** UX011

#### Evidence and current behavior

`AudioManager.init()` runs in `BootScene` and immediately calls `initBgmAudio()`, which does `new Audio('./assets/audio/bgm.m4a')` (`AudioManager.ts:43, 68-76`). Confirmed at runtime: the browser requested `bgm.m4a` (HTTP 206) during boot, before any interaction and regardless of the music setting. `ffprobe` shows the file is 73.1 s of AAC-LC at **249 kb/s** stereo, **2.30 MB**. That is larger than the whole gzipped JS bundle (356 kB) by more than 6×.

#### Problem and impact

On mobile data, the first visit competes with the JS bundle for bandwidth and uses data even for players who disable music. PRD §3 goal 1 is "Load quickly", and PRD §23 asks to "keep assets reasonably compressed".

#### Desired outcome

BGM is fetched only when music is enabled *and* after the first user interaction. It is encoded at a bitrate suited to background music (for example 96–128 kb/s AAC, or Opus/WebM with an AAC fallback), so the file is ≤ 1.2 MB with no audible loop seam.

#### Implementation guidance

Create the audio element (or the decoded buffer, if UX011 uses Web Audio) lazily in `startBgm()`, with `preload = 'none'` until then. Re-encode with ffmpeg, for example `ffmpeg -i bgm.m4a -c:a aac -b:a 112k bgm.m4a`. Check the loop point. Keep the old file out of the repo once replaced.

#### Acceptance criteria

- [ ] With music disabled in storage, a full session makes no request for the BGM file.
- [ ] With music enabled, the first BGM request happens after the first pointer or key interaction.
- [ ] The BGM file is ≤ 1.2 MB, and its loop is seamless by ear.
- [ ] Music toggling still works after lazy init.

#### Validation plan

Playwright network log at 390×844 with music on and off. `ffprobe` on the new file. Listening check. `pnpm run build`.

#### Out of scope

Service-worker caching (PERF004). Changing the music.

### [PERF002] Add Firebase Hosting cache headers for hashed assets and media

- **Category:** PERF
- **Priority:** P2
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `firebase.json`
- **Affected experience:** Performance
- **Depends on:** None
- **Blocks:** PERF004
- **Can be combined with:** SEC002

#### Evidence and current behavior

`firebase.json` has no `headers` section, so Firebase's default caching applies to every file (short-lived, revalidated). Vite emits content-hashed bundles (`dist/assets/index-<hash>.js`) that are safe to cache forever. `bgm.m4a` and the icons are stable. README line 95 claims "Firebase Hosting serves the `dist/` directory with proper cache headers", which isn't configured. This is confirmed by config inspection; the deployed headers were not checked.

#### Problem and impact

Returning players re-validate or re-download the 1.5 MB bundle and 2.3 MB audio more often than needed. Slower repeat loads, wasted data.

#### Desired outcome

- `assets/**/*.js` and `*.css` (hashed): `Cache-Control: public, max-age=31536000, immutable`.
- Audio, fonts and icons: long max-age with a revalidation strategy, or versioned filenames.
- `index.html` and `manifest.webmanifest`: `no-cache`.

#### Implementation guidance

Add `hosting.headers` globs in `firebase.json`. If audio and icons keep stable filenames, use a moderate `max-age` (for example 7 days) or add hashing by importing them via Vite. Combine with SEC002 so all headers are reviewed in one change.

#### Acceptance criteria

- [ ] On a Firebase preview channel, `curl -I` shows the specified `Cache-Control` for `index.html`, a hashed JS file, `bgm.m4a` and an icon.
- [ ] A redeploy with changed code is picked up on the next load (index revalidates).

#### Validation plan

`firebase hosting:channel:deploy test-headers`, then `curl -I` on each asset class. Not runnable in this review (needs credentials).

#### Out of scope

Service worker (PERF004). Security headers (SEC002).

### [PERF003] Split Phaser into its own cached chunk and trim the bundle

- **Category:** PERF
- **Priority:** P3
- **Effort:** S
- **Confidence:** High
- **Affected files:** `vite.config.ts`, `src/main.ts`
- **Affected experience:** Performance
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

`pnpm run build` outputs a single `index-*.js` of **1,542.17 kB** (gzip 355.76 kB). Vite warns that it exceeds `chunkSizeWarningLimit: 1500`, a limit already raised from the default 500 in `vite.config.ts:8`. Phaser makes up almost all of this, and every app change invalidates the whole cached file. The full Phaser build includes systems the game doesn't use (Arcade Physics, the Spine and Facebook plugins, etc.); whether a custom build is worth it needs measurement.

#### Problem and impact

Every deploy forces returning players to re-download about 356 kB gzip, though only a few kB of game code changed. The warning has been silenced rather than addressed.

#### Desired outcome

Phaser lives in a separate vendor chunk with a stable hash across app-only changes. The app chunk is small (≤ 100 kB). The chunk-size limit is back near the default, or justified.

#### Implementation guidance

Add `build.rollupOptions.output.manualChunks: { phaser: ['phaser'] }`. Optionally evaluate importing a lighter Phaser entry or a custom build (`phaser/src/phaser-core` plus the Matter plugin) and measure the gzip difference before adopting it. Don't code-split the scenes; they are tiny.

#### Acceptance criteria

- [ ] The build emits a separate `phaser-*.js` chunk, and an app-only code change leaves its filename unchanged.
- [ ] The app chunk is ≤ 100 kB minified.
- [ ] No chunk-size warning with `chunkSizeWarningLimit` ≤ 1600, or the PR documents why the vendor chunk exceeds it.
- [ ] Total gzip transfer doesn't increase.

#### Validation plan

`pnpm run build` twice, before and after a trivial app change, comparing hashes and sizes. Smoke-play in `pnpm run preview`.

#### Out of scope

Replacing Phaser.

### [PERF004] Make the game work offline after the first load (service worker)

- **Category:** PERF
- **Priority:** P2
- **Effort:** M
- **Confidence:** High
- **Affected files:** `vite.config.ts`, `package.json`, `src/main.ts`, `public/manifest.webmanifest`, `firebase.json`
- **Affected experience:** Performance, Replay
- **Depends on:** PERF002, BUG009
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

PRD §3 goal 17 and §22 require "cache/static assets for offline play after initial load". README line 19 claims "PWA & Offline Ready". There is no service worker: no `serviceWorker.register` in `src/` or `index.html`, and no SW file in `public/` or the build output. The game itself needs no network after load (all art is procedural, saves are in `localStorage`), so it is an ideal offline candidate.

#### Problem and impact

Installed-PWA players on a plane or a flaky connection get the browser offline page instead of a game that would otherwise run fully offline. The README promise is false.

#### Desired outcome

After one online visit, the game loads and plays fully offline, including BGM if it was enabled. New deploys are picked up on the next online launch, with a gentle "Update ready" toast or silent activation on the menu.

#### Implementation guidance

Use `vite-plugin-pwa` (a new devDependency) with `generateSW`. Precache `index.html`, the JS chunks, the manifest and icons. Use runtime cache-first for `bgm.*`. Register with `registerType: 'autoUpdate'` or a prompt that is only shown on the menu (never mid-game). Make sure `sw.js` is served `no-cache` (extend PERF002's headers). Test that BUG008's optional-asset changes don't cause precache misses.

#### Acceptance criteria

- [ ] Lighthouse/DevTools: the app has a registered, activated service worker with the precache populated.
- [ ] DevTools "Offline" + reload: the menu, gameplay and restart all work with no network errors.
- [ ] After a new deploy, the next online launch serves the new version within one reload, and never swaps mid-game.
- [ ] `sw.js` is served with `Cache-Control: no-cache`.

#### Validation plan

`pnpm run build && pnpm run preview`, then DevTools Application panel → Offline reload. A Playwright `context.setOffline(true)` case in TEST002. A Firebase preview-channel check for headers.

#### Out of scope

Background sync, push notifications (PRD §4 non-goals).

### [PERF005] Pool merge and checkout particle emitters instead of creating them per event

- **Category:** PERF
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#9](https://github.com/anushibinj/cocktail-matcher/pull/9) (wave 1)
- **Priority:** P3
- **Effort:** S
- **Confidence:** Medium
- **Affected files:** `src/game/systems/MergeManager.ts`, `src/game/systems/OrderManager.ts`
- **Affected experience:** Performance, Gameplay
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** BUG007

#### Evidence and current behavior

Each merge creates two `ParticleEmitter` game objects plus a shockwave sprite and a tween (`MergeManager.triggerMergeEffects`, lines 140-181). Each order checkout creates another emitter (`OrderManager.triggerCheckoutSparkles`, lines 274-289). Each is destroyed shortly after. Chain merges can create several emitters in one frame. PRD §23 asks to "avoid unnecessary object allocations" and "limit particle counts". Actual frame-time impact was not measured (headless software WebGL), so this is a recommendation pending profiling on a mid-range phone.

#### Problem and impact

Allocation churn and WebGL batch setup per merge can cause frame hitches during merge cascades on low-end devices, the moments that matter most for game feel.

#### Desired outcome

Two persistent merge emitters (circles, stars) and one checkout emitter are created once per scene and fired with `explode(count, x, y)`, with per-event tint set through emitter config ops. Shockwave rings come from a small `Group` pool. Visuals match today's, apart from the BUG007 fix.

#### Implementation guidance

Create the emitters in the `MergeManager`/`OrderManager` constructors with `emitting: false`. Before `explode`, update the tint via `emitter.setParticleTint(color)`, or use an `onEmit` callback for per-burst color. Pool rings with `scene.add.group({ classType: Phaser.GameObjects.Sprite, maxSize: 8 })`. Destroy everything on scene shutdown.

#### Acceptance criteria

- [ ] After 50 merges, the number of `ParticleEmitter` objects in `scene.children` stays constant (≤ 3).
- [ ] The merge burst shows the merged drink's colors, as today.
- [ ] Performance profile on a test phone shows no GC spike during a 5-merge cascade (record the trace; needs runtime validation).

#### Validation plan

Use DX004 to spawn cascades and count objects. DevTools Performance recording. `pnpm run build`.

#### Out of scope

Changing FX design. Reduced-motion variants (A11Y006).

### Architecture and maintainability (ARCH)

### [ARCH001] Create a shared UI button and toggle component

- **Category:** ARCH
- **Priority:** P1
- **Effort:** M
- **Confidence:** High
- **Affected files:** new `src/game/ui/components/UIButton.ts` (and a toggle variant), `src/game/ui/HUD.ts`, `src/game/scenes/MenuScene.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`
- **Affected experience:** Developer workflow, Accessibility
- **Depends on:** None
- **Blocks:** UX009, UI001, A11Y002
- **Can be combined with:** A11Y004

#### Evidence and current behavior

Button behavior is re-implemented ad hoc in four places, each with different semantics:
- **Sound/music toggles in three copies:** `MenuScene.createAudioControls()` (lines 140-170), `HUD.createTopButtons()` (lines 24-62) and `PauseModal.createToggleRow()` (lines 173-220). The first two use emoji text, the third an ON/OFF pill. They stay in sync only through `HUD.updateAudioIcons()`, and only from pause.
- **Primary buttons** are a sprite plus a separate text object that must be positioned and scaled together (`MenuScene.ts:90-116`, `PauseModal.ts:106-113`, `GameOverModal.ts:97-105`). Hover scaling exists on Game Over only (lines 107-108).
- **Secondary actions** are bare `Text` objects with text-sized hit areas.

Every button activates on `pointerdown`, which is the root of BUG003.

#### Problem and impact

Fixing target sizes, focus, keyboard activation, pointer-up semantics and icon contrast would otherwise mean editing about a dozen hand-built buttons, with inconsistent results.

#### Desired outcome

One `UIButton` (variants: primary, secondary, icon; plus a `UIToggle` bound to a `SaveManager` setting) that provides:
- a minimum hit area (A11Y004);
- pointer-up activation over the same object;
- hover, pressed, focused and disabled states;
- an accessible label string (for A11Y003);
- a keyboard-activation hook (for A11Y002);
- optional confirm state (for UX009).

All existing controls use it, and the audio toggles read and write through one source of truth, with every on-screen instance updating.

#### Implementation guidance

Implement as a `Phaser.GameObjects.Container` subclass holding background, label or icon, and an invisible hit zone. Emit a single `'activate'` event. Keep it small: no framework or DI (PRD §20). Have `AudioManager` (or `SaveManager`) emit a `settingschanged` event so all toggle instances refresh, replacing `HUD.updateAudioIcons()` and the `onSettingsChanged` callback.

#### Acceptance criteria

- [ ] Every interactive control in Menu, HUD, Pause and Game Over is a `UIButton` or `UIToggle` (grep shows no `setInteractive` outside the component, the backdrops and the spawner).
- [ ] Toggling sound in pause updates the HUD icon, and vice versa, without manual sync code.
- [ ] Buttons activate on release over the button. Pressing and dragging off cancels.
- [ ] Visual appearance is unchanged except for the added states (screenshots before and after).
- [ ] `pnpm run build` passes, with no unused-symbol errors.

#### Validation plan

Screenshot comparison at 390×844. Manual pointer press-drag-off test. TEST002 regression run.

#### Out of scope

Keyboard focus navigation (A11Y002). Icon art (UI001). Sizes (A11Y004). This item only provides the hooks for them.

### [ARCH002] Introduce one explicit game phase instead of four drifting flags

- **Category:** ARCH
- **Priority:** P2
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/game/scenes/GameScene.ts`, `src/game/systems/DrinkSpawner.ts`, `src/game/systems/GameOverManager.ts`, `src/game/systems/MergeManager.ts`, `src/game/systems/OrderManager.ts`
- **Affected experience:** Gameplay, Replay, Developer workflow
- **Depends on:** BUG001, BUG002, BUG003, BUG004
- **Blocks:** None
- **Can be combined with:** BUG004

#### Evidence and current behavior

Run state is spread across:
- `GameScene.isGameActive` (line 26);
- `DrinkSpawner.isEnabled` and `isCoolingDown` (lines 13-14);
- `GameOverManager.isGameOver` and `isEnabled` (lines 9, 11; `setEnabled` is never called);
- `OrderManager.isCheckingOut` (line 31).

Each is toggled from different call sites (`handlePause`, `resumeGame`, `restartGame`, `handleGameOver`, `spawner.reset`), and timers and tweens aren't tied to any of them. BUG001–BUG004 are all symptoms of this drift.

#### Problem and impact

Every new feature (tutorial, auto-pause, rotate overlay, confirm dialogs) must remember to flip the right subset of flags, and each miss produces another lifecycle bug.

#### Desired outcome

`GameScene` owns a single `phase: 'playing' | 'paused' | 'gameOver' | 'exiting'` with one `setPhase()` that applies all side effects:
- physics, time and gameplay tweens pause or resume;
- the spawner is enabled or disabled;
- game-over checks are armed;
- pending timers are cancelled on exit or restart.

Systems take an `isPlaying()` predicate (or listen for a phase event) instead of keeping their own enable flags.

#### Implementation guidance

Do this after BUG001–BUG004 so it is a behavior-preserving refactor with tests (TEST002) as a safety net. Keep it a plain field plus a switch; no state-machine library (PRD §20). Remove `GameOverManager.isEnabled`/`setEnabled` and `DrinkSpawner.isEnabled`.

#### Acceptance criteria

- [ ] Only `setPhase()` changes run state. The grep shows no other writes to the removed flags.
- [ ] All TEST002 lifecycle cases (pause freeze, resume no-drop, cooldown recovery, restart reset, game-over freeze) pass unchanged.
- [ ] Restarting 20 times in a row leaves exactly one set of input listeners and no orphaned timers (check `scene.time` events and `input.listenerCount('pointerup')`).

#### Validation plan

TEST002 suite plus `pnpm run build`. Manual soak: 10 pause/resume and 10 restart cycles.

#### Out of scope

New gameplay behavior. Overlay-scene refactor beyond what BUG001 needed.

### [ARCH003] Drive glass rendering from `glassShape`/`garnish` data instead of the tier number

- **Category:** ARCH
- **Priority:** P3
- **Effort:** M
- **Confidence:** High
- **Affected files:** `src/utils/AssetGenerator.ts`, `src/game/config/drinks.ts`, `src/types/game.ts`, `CLAUDE.md`
- **Affected experience:** Developer workflow
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

`AssetGenerator.drawSideViewCocktail()` switches on `drink.level` (cases 0–11) and ignores the definition's `glassShape` and `garnish`. As a result, the data contradicts the art:

| Tier | Data says | Rendered as |
|---|---|---|
| 1 | `tumbler` | flute |
| 3 | `highball` | coupe |
| 6 | `hurricane` | poco grande |
| 7 | `hurricane` | martini |
| 9 | `chalice` | tulip |

The `glassShape` union in `src/types/game.ts:10` doesn't include `flute`, `coupe`, `poco`, `tulip` or `mojito`, though they are drawn. Some renderers take a `_garnish` parameter they ignore (for example `drawTumblerGlass`, `drawFluteGlass`). There is no `default` case, so adding a 13th tier silently renders just the bubble. `CLAUDE.md` tells contributors that "new glass shapes or garnishes need a matching case there", which describes a design that doesn't exist.

#### Problem and impact

PRD §6 asks for a data-driven progression. Today, reordering or adding tiers means editing the renderer by index, and the data fields mislead anyone extending the game.

#### Desired outcome

Each tier's art is chosen by `glassShape` plus `garnish`. The type union lists every drawable shape. A missing shape fails `tsc` (exhaustive `switch` with a `never` check) instead of rendering a blank bubble. The existing art is unchanged pixel-for-pixel.

#### Implementation guidance

Extend the union, update the `DRINKS` data to name the shapes actually drawn, and map `glassShape → draw function` with a separate garnish pass where garnishes are hard-coded today. Snapshot the 12 generated textures before refactoring (canvas `toDataURL`) and compare after. Update `CLAUDE.md`.

#### Acceptance criteria

- [ ] `drawSideViewCocktail` no longer references `drink.level`.
- [ ] All 12 generated textures are pixel-identical to the pre-refactor snapshots (or differences are listed and approved).
- [ ] Adding a `DRINKS` entry with an unknown `glassShape` fails `pnpm run build`.
- [ ] `CLAUDE.md` describes the actual mapping.

#### Validation plan

Snapshot-comparison script (Playwright evaluates `textures.get('drink_N').getSourceImage().toDataURL()`), plus `pnpm run build`.

#### Out of scope

New artwork or tiers.

### [ARCH004] Centralize layout geometry and the reference-height scaling helper

- **Category:** ARCH
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/config/gameConfig.ts`, `src/game/ui/HUD.ts`, `src/game/systems/OrderManager.ts`, `src/game/scenes/MenuScene.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`
- **Affected experience:** Developer workflow, Responsive
- **Depends on:** None
- **Blocks:** UX007
- **Can be combined with:** UX001

#### Evidence and current behavior

`gameConfig.ts` defines a private `scaleY` helper (lines 41-42). `OrderManager.ts:12-13` re-implements it with a literal `1280`, and `HUD.ts:71` inlines `Math.round((1190 / 1280) * GAME_CONFIG.HEIGHT)`. Many other coordinates are hard-coded literals:
- HUD buttons x = 560 / 614 / 668, y = 48;
- menu toggles at `WIDTH - 110` / `WIDTH - 50`, y = 60;
- ticket slots x = 280 / 440 (in two places: lines 83 and 194);
- score cards x = 220 / 500;
- modal card rectangles ±240.

`computeCanvasHeight()` is evaluated once at import.

#### Problem and impact

Layout changes (UX001, A11Y004/A11Y005 resizing, UX007 recomputation, UX008 safe areas) each require hunting literals across six files, and the duplicated slot X values can drift.

#### Desired outcome

A single `LAYOUT` object (or `getLayout(canvasHeight)` function) in `gameConfig.ts` exports the reference-scaling helper and named anchors (HUD cluster, ticket slots, score cards, next-drink slot, modal card size). All UI reads from it. No `1280` literals outside `gameConfig.ts`.

#### Implementation guidance

Export `REFERENCE_HEIGHT` and `scaleY`. Group anchors by component. Make the layout derivable from a height argument so UX007 can recompute it. Keep the change behavior-preserving (identical screenshots).

#### Acceptance criteria

- [ ] `grep -rn "1280" src` matches only `gameConfig.ts`.
- [ ] HUD, ticket, card and modal positions come from named layout constants. Ticket slot X is defined once.
- [ ] Screenshots at 360×640, 390×844 and 768×1024 are pixel-identical before and after.

#### Validation plan

Playwright screenshot diff, plus `pnpm run build`.

#### Out of scope

Changing the layout itself (UX001, A11Y004, A11Y005). Runtime recomputation (UX007).

### [ARCH005] Validate and migrate save data, and stop writing to storage on every merge

- **Category:** ARCH
- **Priority:** P3
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/storage/SaveManager.ts`, `src/game/systems/ScoreManager.ts`, `src/types/game.ts`
- **Affected experience:** Replay, Developer workflow
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

- **No per-field validation.** `SaveManager.load()` (lines 30-46) only checks `typeof parsed.bestScore === 'number'`, then spreads *all* parsed fields over the defaults. Wrong types survive: `"soundEnabled": "false"` (a truthy string), `bestScore: Infinity`, negative numbers, and unknown keys that get written back forever.
- **`version` is never read**, so there is no migration path, although `STORAGE_KEY` embeds `_v1`.
- **Storage writes on every merge.** `ScoreManager.addScore()` calls `SaveManager.setBestScore()` on every score change (`ScoreManager.ts:30`), so once a run passes the record, *every merge* performs a synchronous `localStorage.setItem` with a JSON stringify.
- **Abandoned runs are never counted.** `recordGamePlayed` runs only on game over, not when quitting to the menu.

#### Problem and impact

A corrupted or hand-edited save can break the audio toggles or the best-score display permanently. Synchronous storage writes during merge cascades add avoidable main-thread work. Future fields (tutorial, reduce-motion, unlocks) need a safe migration story.

#### Desired outcome

- Each field is validated: right type, finite, sensible range. Otherwise the default is used.
- Unknown fields are dropped.
- `version` drives a migration function.
- The best score is persisted at game over, pause, `visibilitychange` (hidden) and quit, not per merge. The in-memory best still updates live.

#### Implementation guidance

Write a `sanitize(raw: unknown): SaveData` pure function (unit-tested in TEST001) and a `migrations` map keyed by version. Add `SaveManager.flush()` and call it from the GameScene lifecycle points. Keep `localStorage` error swallowing as-is.

#### Acceptance criteria

- [ ] Loading `{"bestScore":"abc","soundEnabled":"false","foo":1}` yields defaults for those fields and drops `foo`.
- [ ] A v1 save loads unchanged under the new code. A synthetic v0 save is migrated.
- [ ] No `localStorage.setItem` call occurs during a merge (spy in tests). The best score survives a hard reload after a game over or tab hide.
- [ ] Existing players' best scores are preserved.

#### Validation plan

TEST001 unit tests with a stubbed `localStorage`. Manual reload tests. `pnpm run build`.

#### Out of scope

Cloud saves (PRD §4 non-goal).

### [ARCH006] Remove dead code and misleading leftovers

- **Category:** ARCH
- **Priority:** P3
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `src/game/entities/Drink.ts`, `src/game/systems/GameOverManager.ts`, `src/game/systems/MergeManager.ts`, `src/game/systems/AudioManager.ts`, `src/game/systems/OrderManager.ts`, `src/utils/AssetGenerator.ts`, `src/types/game.ts`, `src/storage/SaveManager.ts`
- **Affected experience:** Developer workflow
- **Depends on:** UX001, UX011
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

Verified unused or always-constant symbols:
- `Drink.isDropped` (always `true`, never assigned elsewhere; checked in `MergeManager.ts:75-76`, `OrderManager.ts:176`, `GameOverManager.ts:24`).
- `GameOverManager.isEnabled`/`setEnabled()` (never called).
- `AudioManager.isMusicPlaying()` (no callers).
- `AudioManager.musicGain` (created, never connected; see UX011).
- The `'drop_guidance_line'` texture (`AssetGenerator.ts:1052-1063`; never used, since `DrinkSpawner` draws its own dashes).
- The `'floor'` label checks in `MergeManager.ts:38-39` (`Board` creates no floor body).
- The `GameSettings` interface (`types/game.ts:29-32`).
- `SaveManager.getHighestDrinkUnlocked()` (no callers until UX010).
- Deprecated `String.prototype.substr` in IDs (`Drink.ts:19`, `OrderManager.ts:70`).
- The `ScoreManager` `isNewBest` callback argument, which `GameScene` ignores.

#### Problem and impact

Dead flags look like meaningful guards (for example `isDropped` suggests a pre-drop state that doesn't exist), which misleads future changes. CLAUDE.md even documents `isDropped` as gating collision logic.

#### Desired outcome

Each listed symbol is either deleted or put to real use (`musicGain` by UX011, `onNextDrinkChanged` by UX001, `getHighestDrinkUnlocked` by UX010). IDs use `crypto.randomUUID()` or a counter. `CLAUDE.md` is updated to match.

#### Implementation guidance

Do this after UX001 and UX011 so you don't delete hooks they use. If UX010 hasn't landed, keep `getHighestDrinkUnlocked`. Re-run `pnpm run build` (`noUnusedLocals` will flag leftovers).

#### Acceptance criteria

- [ ] No symbol in the list remains unused (grep each name).
- [ ] `CLAUDE.md` no longer mentions `isDropped` gating (or describes its new real meaning).
- [ ] `pnpm run build` passes, and gameplay is unchanged in a manual smoke test.

#### Validation plan

`pnpm run build`, plus a grep checklist in the PR. TEST002 smoke.

#### Out of scope

Behavior changes.

### Testing (TEST)

### [TEST001] Add a unit-test runner and cover the pure game rules

- **Category:** TEST
- **Priority:** P2
- **Effort:** M
- **Confidence:** High
- **Affected files:** `package.json`, new `vitest.config.ts` (or a `test` block in `vite.config.ts`), new `src/**/*.test.ts`, `src/game/systems/DrinkSpawner.ts`, `src/game/systems/GameOverManager.ts`, `src/storage/SaveManager.ts`, `src/game/config/drinks.ts`
- **Affected experience:** Developer workflow
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** ARCH005

#### Evidence and current behavior

There are no tests, no test runner and no `test` script (`package.json:6-10`). CLAUDE.md states that `pnpm run build` is the only automated check. PRD §25 lists rule checks that are only ever verified by hand: "non-identical drinks do not merge", "high-level drink cannot produce invalid level", "game-over timer behaves correctly", and "best score survives refresh". The rules live inside Phaser-coupled classes; for example, `getRandomSpawnLevel` is private and calls `Math.random` directly.

#### Problem and impact

Tuning `SPAWN_DISTRIBUTION`, the danger timer or save data can silently break the rules, with no fast feedback.

#### Desired outcome

`pnpm test` runs Vitest in under 10 s, covering:
- weighted spawn selection (with an injected RNG);
- `DRINKS` invariants (`level === index`, increasing radius, positive score);
- `getDrinkByLevel` bounds;
- the merge eligibility predicate (same level, not merging, below the max tier);
- the danger-timer accumulate, decay and trigger arithmetic;
- `SaveManager` load, sanitize and default-merge with a stubbed `localStorage`;
- the best-score and "new best" decision (BUG006).

#### Implementation guidance

- Add `vitest` as a devDependency with the `node` environment, plus `jsdom` only if needed.
- Extract pure functions next to their classes: `pickWeightedLevel(dist, rng)`, `canMerge(a, b, maxLevel)`, and `stepDangerTimer(state, delta, inDanger, grace)`.
- Have the classes call them, so tests need no Phaser.
- Keep the `SaveManager` singleton testable by resetting `SaveManager['instance']`, or by adding a test-only factory.

#### Acceptance criteria

- [ ] `pnpm test` exists, runs headless and passes.
- [ ] The tests cover every behavior listed under Desired outcome, each with at least one edge case: weight 0, the max tier, corrupt JSON, and a timer exactly at the grace period.
- [ ] Line coverage ≥ 90% on the extracted pure functions (`vitest --coverage`).
- [ ] Gameplay is unchanged (manual smoke) and `pnpm run build` passes.

#### Validation plan

`pnpm test`, `pnpm run build`. CI integration in DX002.

#### Out of scope

Browser and end-to-end tests (TEST002). Physics simulation tests.

### [TEST002] Add Playwright end-to-end and responsive smoke tests for the critical journey

- **Category:** TEST
- **Priority:** P2
- **Effort:** M
- **Confidence:** High
- **Affected files:** `package.json`, new `playwright.config.ts`, new `e2e/*.spec.ts`
- **Affected experience:** Developer workflow, Gameplay, Responsive
- **Depends on:** DX004, BUG001, BUG002, BUG003, BUG005, BUG008
- **Blocks:** None
- **Can be combined with:** None

#### Evidence and current behavior

There are no browser tests. This review found BUG001, BUG002, BUG003, BUG005 and BUG008 only by driving the game in Chromium with an ad-hoc script that wrapped `Phaser.Game.prototype.boot` to reach scene state. The environment already provides Chromium at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`), so `@playwright/test` can run without downloading browsers.

#### Problem and impact

The lifecycle bugs above are exactly the kind that regress silently during polish work.

#### Desired outcome

`pnpm test:e2e` builds and serves the app (`vite preview`) and runs these cases at 390×844 (touch) and 1440×900 (mouse):
1. Boot reaches `MenuScene` with **zero console errors**.
2. Play → a tap on the board launches exactly one drink.
3. HUD toggles, Resume and Play Again launch nothing.
4. Pause freezes drink positions for 2 s.
5. Pause during cooldown → resume → a launch still works.
6. Restart resets the score to 0 and leaves two tickets.
7. Forced game over shows the modal and freezes the score.
8. Canvas centering at 768×1024 and 1440×900 (±1 px).
9. Persistence: best score and settings survive a reload.

Add cases for A11Y001/A11Y002 keyboard paths, PERF004 offline and UX004 first-run as those items land.

#### Implementation guidance

- Use the DX004 hook (`window.__COCKTAIL__`) to read scene state and to force conditions: spawn a drink of level N at (x, y), and set the danger timer.
- Never rely on fixed sleeps for physics. Poll with `expect.poll` on state.
- Use `executablePath` for the preinstalled Chromium if the pinned version doesn't match.

#### Acceptance criteria

- [ ] `pnpm test:e2e` runs all nine cases above and passes locally in under 2 minutes.
- [ ] Each case fails when its target bug is reintroduced. Verify by temporarily reverting one fix per case, in a local branch only.
- [ ] Screenshots on failure are written to `test-results/` (git-ignored).

#### Validation plan

`pnpm test:e2e` locally. CI wiring in DX002 (optional job or nightly if too slow).

#### Out of scope

Visual-diff baselines across many devices. Real-device farms.

### Developer experience (DX)

### [DX001] Add ESLint and Prettier with scripts that match the codebase style

- **Category:** DX
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** `package.json`, new `eslint.config.js`, new `.prettierrc`, `CLAUDE.md`
- **Affected experience:** Developer workflow
- **Depends on:** None
- **Blocks:** DX002
- **Can be combined with:** None

#### Evidence and current behavior

`package.json` has only `dev`, `build` and `preview`. There is no ESLint or Prettier configuration. CLAUDE.md says "There is no test suite and no lint script configured". The code relies on non-null assertions (34 `this.ctx!` and 12 `this.sfxGain!` in `AudioManager.ts`) and `as unknown as` casts (`MergeManager.ts:51-52`), and uses deprecated `substr` (`Drink.ts:19`), which a linter would flag.

#### Problem and impact

Style drifts between contributors and AI agents, and hidden hazards (floating promises such as `this.ctx.resume()` in `AudioManager.ts:50`, or unsafe non-null assertions) go unflagged.

#### Desired outcome

`pnpm lint` (ESLint with `typescript-eslint` recommended plus type-checked rules where cheap) and `pnpm format:check` (Prettier) pass on the current code. Any rule violations are either fixed in a separate mechanical commit or explicitly configured. Add a `typecheck` script (`tsc --noEmit`).

#### Implementation guidance

Use the flat config. Configure Prettier to match the existing style (single quotes, 2 spaces, semicolons, ~100 columns) to minimise churn. Commit the formatting pass separately from the config. Document the scripts in CLAUDE.md and the README.

#### Acceptance criteria

- [ ] `pnpm lint`, `pnpm format:check` and `pnpm typecheck` exist and exit 0.
- [ ] The rule set includes `@typescript-eslint/no-floating-promises` and `no-non-null-assertion` (as `warn`, if fixing everything now is too much).
- [ ] CLAUDE.md "Commands" lists the new scripts.

#### Validation plan

Run each script. `pnpm run build`.

#### Out of scope

Fixing every warning-level finding (track separately if numerous). CI wiring (DX002).

### [DX002] Add a CI quality gate for every PR and standardise on one package manager

- **Category:** DX
- **Priority:** P2
- **Effort:** S
- **Confidence:** High
- **Affected files:** new `.github/workflows/ci.yml`, `.github/workflows/firebase-hosting-merge.yml`, `.github/workflows/firebase-hosting-pull-request.yml`, `package-lock.json`, `CLAUDE.md`, `README.md`
- **Affected experience:** Developer workflow
- **Depends on:** DX001, SEC001
- **Blocks:** None
- **Can be combined with:** SEC003

#### Evidence and current behavior

The only workflows deploy to Firebase. Both run `npm ci && npm run build` with no lint or test step. The PR workflow is skipped for fork PRs (`if: github.event.pull_request.head.repo.full_name == github.repository`, `firebase-hosting-pull-request.yml:12`), so forks get no automated check at all. Two lockfiles are committed (`package-lock.json` and `pnpm-lock.yaml`), and nothing keeps them in sync. CLAUDE.md warns not to delete `package-lock.json` because CI uses npm. Their versions match today.

#### Problem and impact

Regressions merge unnoticed. Dependency updates applied with one tool leave the other lockfile stale, so CI can build different dependency versions than developers run.

#### Desired outcome

- A `ci.yml` runs on every `pull_request` (forks included, with no secrets) and on pushes to `master`. Steps: pnpm install `--frozen-lockfile`, `typecheck`, `lint`, `format:check`, `test` (once TEST001 exists), `build`.
- The deploy workflows use pnpm too, and `package-lock.json` is removed.
- CLAUDE.md and the README are updated accordingly.

#### Implementation guidance

Use `pnpm/action-setup` with the version pinned through `packageManager` in `package.json`, plus `actions/setup-node` with `cache: pnpm`. Add the e2e job from TEST002 behind a separate job or path filter so it can be slower. Keep deploy workflows on the same install commands.

#### Acceptance criteria

- [ ] A PR from a fork shows a passing or failing `ci` check.
- [ ] Introducing a type error, a lint error or a failing test makes `ci` fail.
- [ ] Only `pnpm-lock.yaml` remains, and both deploy workflows succeed with pnpm (validated on a PR preview channel).
- [ ] `package.json` declares `packageManager`.

#### Validation plan

Open a test PR with a deliberate failure, then fix it. Watch the preview-deploy workflow succeed.

#### Out of scope

Branch-protection settings (repository admin action). Action pinning (SEC003, combinable).

### [DX003] Correct the README and asset READMEs to describe what actually ships

- **Category:** DX
- **Priority:** P3
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `README.md`, `public/assets/audio/README.md`, `public/assets/drinks/README.md`, `CLAUDE.md`
- **Affected experience:** Developer workflow
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** BUG008

#### Evidence and current behavior

`README.md` claims or instructs:
- npm commands (lines 46-66, 77, 90), contrary to the repo's pnpm preference;
- "PWA & Offline Ready" (line 19), though there is no service worker;
- "2.0s countdown" (line 16), though nothing counts down;
- a HUD with "next drink & evolution cheat-sheet" (line 130), which doesn't exist;
- "chill ambient tropical synth background chords" (line 14), whereas BGM is now an `.m4a` file;
- "proper cache headers" (line 95), though none are configured;
- `storage/` under `src/game/` in the tree (line 137), though it is at `src/storage/`.

The tree also omits `OrderManager.ts`, and the To-Go orders feature isn't documented at all.

`public/assets/audio/README.md` says `drop.mp3` and `merge.mp3` are supported; only `clink.mp3` is fetched. Both asset READMEs are copied into the production `dist/assets/` (observed in `dist/assets/audio/README.md` and `dist/assets/drinks/README.md`).

#### Problem and impact

Contributors and agents act on false information. For example, CLAUDE.md's description of `isDropped` and glass-shape cases is also inaccurate (see ARCH003 and ARCH006). Shipping READMEs to production is sloppy, though harmless.

#### Desired outcome

The docs match the code at the time of merge. Do this last, or update with each feature PR. Asset documentation lives outside `public/` (or the READMEs are excluded from `dist`).

#### Implementation guidance

Update after the first milestone, and again whenever a referenced feature ships. If BUG008 moves overrides to `src/assets/`, move the READMEs with them.

#### Acceptance criteria

- [ ] Every feature claim in the README can be pointed to in code.
- [ ] Commands use pnpm.
- [ ] `dist/` after build contains no `README.md`.
- [ ] The audio README lists only formats the code actually loads.

#### Validation plan

Proofread against the code. `pnpm run build && find dist -name README.md` returns nothing.

#### Out of scope

New documentation sites.

### [DX004] Add an opt-in debug and test hook

- **Category:** DX
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#8](https://github.com/anushibinj/cocktail-matcher/pull/8) (wave 1)
- **Priority:** P2
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `src/main.ts`, `src/game/scenes/GameScene.ts`
- **Affected experience:** Developer workflow
- **Depends on:** None
- **Blocks:** TEST002
- **Can be combined with:** None

#### Evidence and current behavior

`src/main.ts:32` exports `game` from an ES module, but nothing exposes it to the page. `matter.debug` is hard-coded `false` (line 26). Reproducing order, merge or overflow scenarios by hand takes minutes of play. This review had to inject an init script that patched `Phaser.Game.prototype.boot` to inspect state.

#### Problem and impact

Manual QA of most backlog items (BUG004, BUG006, UX002, UX010) and every e2e test needs deterministic setup.

#### Desired outcome

When `import.meta.env.DEV` is true, or `?debug=1` is in the URL, the app exposes `window.__COCKTAIL__` with:
- `game`;
- `spawnDrink(level, x, y)`;
- `setScore(n)`;
- `forceGameOver()`;
- `setSeed(n)` for a seeded RNG used by the spawner and orders.

It also toggles a Matter debug overlay with a key. Production builds without the flag expose nothing.

#### Implementation guidance

Gate on `import.meta.env.DEV || new URLSearchParams(location.search).has('debug')`. Implement the helpers in a tiny `src/debug.ts` that calls into `GameScene` public methods (add narrowly scoped ones). Use a small seeded PRNG (mulberry32) passed into `pickWeightedLevel` (TEST001).

#### Acceptance criteria

- [ ] In `pnpm run dev`, `window.__COCKTAIL__.spawnDrink(5, 360, 600)` places a tier-5 drink.
- [ ] In `pnpm run preview` without `?debug=1`, `window.__COCKTAIL__` is `undefined`.
- [ ] With a fixed seed, two runs produce the same spawn sequence.

#### Validation plan

Manual in the dev and preview servers. Used by TEST002. `pnpm run build`.

#### Out of scope

An in-game developer UI.

### Security and privacy (SEC)

### [SEC001] Upgrade Vite to a patched release (6 audit advisories; dev server is exposed on the LAN)

- **Category:** SEC
- **Status:** ✅ Done in [anushibinj/cocktail-matcher#5](https://github.com/anushibinj/cocktail-matcher/pull/5) (wave 1)
- **Priority:** P2
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `package.json`, `pnpm-lock.yaml`, `package-lock.json`
- **Affected experience:** Developer workflow
- **Depends on:** None
- **Blocks:** DX002
- **Can be combined with:** None

#### Evidence and current behavior

`pnpm audit` reports 6 advisories:
- Five against the locked `vite@6.4.3` (patched in `>=6.4.4`): files outside `server.fs.allow` could be served; cross-origin script execution through the dev server; and three `launch-editor` issues (2 high, 2 moderate, 1 low between them).
- One high against transitive `source-map-js <1.2.2` (event-loop DoS).

`vite.config.ts:11` sets `server.host: true`, which binds the dev server to all network interfaces, so these dev-server issues are reachable from any device on the same network while `pnpm run dev` runs. The production bundle is not affected; these are build- and dev-time dependencies.

#### Problem and impact

A developer on shared Wi-Fi exposes their machine's files through the dev server.

#### Desired outcome

Vite ≥ 6.4.4 and `source-map-js` ≥ 1.2.2 are locked in both lockfiles (or just pnpm's after DX002). `pnpm audit` reports no high-severity issues. `server.host` defaults to localhost, with an opt-in script (`dev:lan`) for phone testing.

#### Implementation guidance

`pnpm up vite@^6.4.4`, then `npm install` to refresh `package-lock.json` until DX002 removes it. Add `"dev:lan": "vite --host"` and drop `host: true` from the config. Note the change in the README for mobile testing.

#### Acceptance criteria

- [ ] `pnpm audit --audit-level high` exits 0.
- [ ] Both lockfiles agree on the Vite version (until DX002).
- [ ] `pnpm run dev` listens on localhost only. `pnpm run dev:lan` exposes it to the LAN.
- [ ] `pnpm run build` passes, and the game smoke-tests fine.

#### Validation plan

`pnpm audit`, `pnpm run build`, `pnpm run dev` + `ss -ltnp` to check the bind address.

#### Out of scope

Major-version upgrades (Vite 7, Phaser 4).

### [SEC002] Add security headers to Firebase Hosting

- **Category:** SEC
- **Priority:** P3
- **Effort:** S
- **Confidence:** High
- **Affected files:** `firebase.json`, `index.html`
- **Affected experience:** Performance
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** PERF002

#### Evidence and current behavior

`firebase.json` sets no response headers. There is no `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or `frame-ancestors`. The app loads only first-party scripts, but `index.html` contains an inline `<style>` (lines 16-50), and Phaser's loader uses `blob:` URLs for images (observed in the network log), so a CSP must allow those.

#### Problem and impact

Low risk today (no user input, no backend). Still, the game can be framed by any site (clickjacking-style embedding), and a future third-party script would run unrestricted. This is cheap hardening for a public HTTPS URL.

#### Desired outcome

Headers on all routes:
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` disabling unused features (camera, microphone, geolocation);
- a CSP of `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self'; frame-ancestors 'none'` (adjust after testing, and include the service worker if PERF004 lands).

#### Implementation guidance

Add a `hosting.headers` entry for `**`. Optionally move the inline style to a CSS file to drop `'unsafe-inline'`. Test on a preview channel with DevTools open for CSP violations.

#### Acceptance criteria

- [ ] `curl -I` on the preview channel shows all listed headers.
- [ ] A full play session logs zero CSP violations (menu, game, pause, game over, music on).
- [ ] Embedding the site in an `<iframe>` on another origin is blocked.

#### Validation plan

Firebase preview channel. DevTools console. A test iframe page. Not runnable in this review (needs deploy credentials).

#### Out of scope

Cache headers (PERF002, combinable).

### [SEC003] Pin GitHub Actions and declare least-privilege permissions in the deploy workflows

- **Category:** SEC
- **Priority:** P3
- **Effort:** XS
- **Confidence:** High
- **Affected files:** `.github/workflows/firebase-hosting-merge.yml`, `.github/workflows/firebase-hosting-pull-request.yml`
- **Affected experience:** Developer workflow
- **Depends on:** None
- **Blocks:** None
- **Can be combined with:** DX002

#### Evidence and current behavior

Both workflows use mutable tags, `actions/checkout@v4` and `FirebaseExtended/action-hosting-deploy@v0`, and pass `secrets.FIREBASE_SERVICE_ACCOUNT_FASTORIAL` to the latter. The merge workflow has no `permissions:` block, so it inherits the repository default token scope. The PR workflow correctly limits `permissions` and skips forks.

#### Problem and impact

If a tag is moved by a compromised upstream, it would receive the Firebase service-account credential. This is a standard supply-chain hardening gap.

#### Desired outcome

Third-party actions are pinned to full commit SHAs (with a version comment). Each workflow declares minimal `permissions` (merge: `contents: read`, plus whatever the deploy action needs, such as `checks: write`). Dependabot (or Renovate) keeps the pins updated.

#### Implementation guidance

Look up the current SHAs for the tags in use and add a `.github/dependabot.yml` for `github-actions`. Validate that the deploy still comments on the PR and deploys to `live`.

#### Acceptance criteria

- [ ] Every `uses:` line references a 40-character SHA.
- [ ] Both workflows have explicit `permissions:` blocks.
- [ ] A test PR still gets a preview deploy, and a merge still deploys live.

#### Validation plan

Test PR and merge on a branch. Not runnable in this review.

#### Out of scope

Rotating the Firebase credential.

### Content and copy (CONTENT)

### [CONTENT001] Unify game terminology and explain every mechanic in player-facing copy

- **Category:** CONTENT
- **Priority:** P1
- **Effort:** S
- **Confidence:** High
- **Affected files:** `src/game/scenes/MenuScene.ts`, `src/game/ui/PauseModal.ts`, `src/game/ui/GameOverModal.ts`, `src/game/systems/OrderManager.ts`, `src/game/scenes/BootScene.ts`, `index.html`, `public/manifest.webmanifest`, `README.md`
- **Affected experience:** Onboarding, Gameplay
- **Depends on:** None
- **Blocks:** UX004
- **Can be combined with:** UX004, UX005

#### Evidence and current behavior

The copy contradicts the mechanics and itself:
- Menu subtitle "Tropical Drop & Match" (`MenuScene.ts:58`) and tip "Drop cocktails • Match pairs • Don't overflow!" (line 128). The game is "Cocktail Merge", and drinks are *launched upward*, not dropped.
- Pause help: "Drag to aim & release to drop / Merge identical drinks to level up / Don't let the glass overflow!" (`PauseModal.ts:74`). There is no glass to overflow; the board is a bar table, and the danger line is near the launcher.
- To-Go tickets ("To-Go Order", "Order #101", `🪙 +N`, `OrderManager.ts:104-135`) are never explained anywhere.
- The loading text "Mixing Cocktails..." (`BootScene.ts:23`) is fine. The tab title "Cocktail Merge — Tropical Drop & Merge Game" (`index.html:6`) mixes "Drop & Merge" with the menu's "Drop & Match".
- The Game Over card offers no explanation or encouragement (see UX002).

#### Problem and impact

New players form the wrong mental model ("drop", "glass overflow"), which compounds the counter-intuitive upward layout. Orders look like drinks vanishing at random.

#### Desired outcome

A short glossary used everywhere (menu, pause help, tutorial, tickets, Game Over, page title, manifest, README). For example:
- **Serve:** slide to aim, release to send a drink up the bar.
- **Mix:** two identical drinks combine into the next cocktail.
- **Red line:** keep drinks above it; a drink stuck below it for 2 seconds ends the shift.
- **To-Go orders:** mix the pictured drink to fill the ticket for bonus points.

The game name and tagline are consistent.

#### Implementation guidance

Centralise strings in `src/game/config/strings.ts`. This also eases future localisation; don't build an i18n system now. Keep lines short for phone widths (≤ 32 characters per line at the A11Y005 sizes). Have the PRD owner approve the tagline.

#### Acceptance criteria

- [ ] The words "drop" and "glass overflow" no longer describe the core action anywhere player-facing, unless the mechanic itself is changed.
- [ ] Every mechanic (aim and launch, merge, danger line, orders) is explained in the pause "How to play" and the tutorial (UX004).
- [ ] Title, tagline and short description match across `index.html`, the manifest, the menu and the README.
- [ ] All player-facing strings come from one module.

#### Validation plan

Proofread screenshots of menu, pause, ticket and Game Over at 390×844. Grep for literals in `src/game/**` outside `strings.ts`. `pnpm run build`.

#### Out of scope

Tutorial mechanics (UX004). Translation.

## Execution plan

Each TODO ID appears exactly once below. Rows are in the recommended order. Rows marked as parallel-safe can be worked on by separate agents at the same time once their dependencies are met.

| Order | Phase | TODO IDs | Why this order | Dependencies | Can one agent combine these? | Combination rationale | Parallel work |
|---|---|---|---|---|---|---|---|
| 1 | 1 – Critical lifecycle fixes | BUG002, BUG003 | The only P0 (soft-lock) plus the most frequent input defect. Both live in `DrinkSpawner`'s input and cooldown code. | None | Yes | Same file and the same launcher state (armed pointer, cooldown timer). Validated together by tapping controls and pausing around a launch. | Parallel with rows 4–9 (different files). Not with rows 2–3 (`GameScene` overlap). |
| 2 | 1 – Critical lifecycle fixes | BUG001, UX006 | Pause must truly freeze before anything builds on it. Auto-pause reuses the same pause path. | Row 1 recommended first (shared pause and spawner behavior). UX006 depends on BUG001. | Yes | One pause/resume path in `GameScene` and the modals. Auto-pause is a ~20-line addition on top of it. | Parallel with rows 4–9. |
| 3 | 1 – Critical lifecycle fixes | BUG004 | Restart race. Smaller once BUG001/BUG002 establish timer-cancellation patterns. | None (rows 1–2 recommended first) | Single item | — | Parallel with rows 4–9. |
| 4 | 1 – Quick independent fixes | BUG005, BUG009, A11Y007 | Cheap shell fixes with immediate visible benefit on tablets, desktop and installs. | None | Yes | All edit `index.html` (container CSS, icon links, viewport meta), plus the manifest and icons. One build-and-screenshot pass validates all three. | Parallel with rows 1–3 and 5–9. |
| 5 | 1 – Quick independent fixes | BUG008 | Removes console noise that would mask errors in all later testing. TEST002 asserts zero console errors. | None | Single item (DX003 doc edits may ride along) | — | Parallel with rows 1–4 and 6–9. Avoid running alongside PERF002/SEC002 (row 31) if `firebase.json` rewrites change. |
| 6 | 1 – Quick independent fixes | BUG006 | XS fix that restores the "new best" reward moment. | None | Single item | — | Parallel. Must land before row 18 (UX002 also edits `GameOverModal`). |
| 7 | 1 – Quick independent fixes | BUG007, PERF005 | Both rewrite `triggerMergeEffects`/`triggerCheckoutSparkles` emitter lifetimes. | None | Yes | The same two functions. Pooling removes the destroy-timing bug by construction. | Parallel with everything except row 23 (A11Y006 touches the shake in the same function); sequence row 7 first. |
| 8 | 1 – Quick independent fixes | SEC001 | Patch the dev-server advisories before more people run `pnpm run dev`. Unblocks DX002. | None | Single item | — | Parallel with all rows except row 12 (lockfile and workflow overlap). |
| 9 | 1 – Quick independent fixes | DX004 | Debug hook used to validate almost every later item and required by TEST002. | None | Single item | — | Parallel. Touches `main.ts`/`GameScene` lightly; rebase after rows 1–3. |
| 10 | 2 – Foundations | ARCH002 | Consolidates the flags fixed in rows 1–3 into one phase model before more features add flags. | BUG001, BUG002, BUG003, BUG004 | Single item | Not combined with BUG001, to keep the bug fix small and reviewable. | Not parallel with rows 17–19 (they also add phase-aware behavior to `GameScene`/`DrinkSpawner`). |
| 11 | 2 – Foundations | DX001 | Lint and format before the large UI refactors, so formatting churn lands once. | None | Single item | — | Parallel with rows 10, 13–15. Coordinate the formatting commit to avoid conflicts with in-flight branches. |
| 12 | 2 – Foundations | DX002, SEC003 | CI gate protects every later change. Action pinning edits the same workflow files. | DX001, SEC001 | Yes | Same `.github/workflows/*` files, validated by the same test PR. | Parallel with rows 13–15. |
| 13 | 2 – Foundations | ARCH001 | Shared button component; prerequisite for keyboard focus, icons and confirm dialogs. | None | Single item (A11Y004 *can* be combined if the agent has capacity) | Kept separate by default so the refactor is reviewable on its own as behavior-preserving. | Parallel with rows 10–12, 14–15. Conflicts with row 20/22 files, so those wait. |
| 14 | 2 – Foundations | ARCH004 | Central layout constants before HUD and ticket changes in rows 17, 20, 21, 27. | None | Single item (UX001 can be combined) | Behavior-preserving refactor validated by screenshot diff. | Parallel with rows 10–13, 15. |
| 15 | 2 – Foundations | TEST001 | Unit tests for rules before tuning (UX005) and save changes (ARCH005). | None | Single item | — | Parallel with rows 10–14. |
| 16 | 2 – Foundations | TEST002 | End-to-end safety net for the lifecycle fixes, before UI refactors. | DX004, BUG001, BUG002, BUG003, BUG005, BUG008 | Single item | — | Parallel with rows 13–15. |
| 17 | 3 – Core UX & accessibility | UX001 | The PRD-required next-drink preview. Uses ARCH004 anchors. | None (row 14 recommended) | Single item | — | Parallel with rows 18, 21. Not with row 20 (HUD file) or row 29 (HUD/GameOver). |
| 18 | 3 – Core UX & accessibility | UX002 | Overflow legibility. After BUG006 because both edit `GameOverModal`. | None (row 6 first) | Single item | — | Parallel with rows 17, 19. |
| 19 | 3 – Core UX & accessibility | UX003, A11Y001 | Both extend `DrinkSpawner` input (aim zone, cancel, keyboard aim and launch) on top of BUG003's armed-pointer model. | BUG003 | Yes | One input model; validated together with pointer and keyboard. | Parallel with rows 17–18, 21. |
| 20 | 3 – Core UX & accessibility | A11Y004, UI001 | Bigger hit areas and replacement icons touch the same HUD, menu and modal buttons. | UI001 needs ARCH001 | Yes | Same buttons and the same screenshots and contrast measurements. | Not parallel with rows 17, 22 (same UI files). |
| 21 | 3 – Core UX & accessibility | A11Y005 | Legible tickets and labels; the tickets are needed for the orders mechanic to make sense. | None | Single item (UI002 can be combined) | — | Parallel with rows 17–19. |
| 22 | 3 – Core UX & accessibility | A11Y002 | Keyboard focus for menus and modals, built on the ARCH001 component. | ARCH001 | Single item (UX009 can be combined) | — | After row 20 (same files). |
| 23 | 3 – Core UX & accessibility | A11Y006 | Reduced motion gates the effects, after the FX rewrite in row 7. | None | Single item | — | Parallel with rows 21–22, 24. |
| 24 | 3 – Core UX & accessibility | A11Y003 | Screen-reader announcements; best after UX002 provides the danger hook. | None | Single item | Avoid combining with A11Y002: different technology (DOM live regions vs Phaser focus). | Parallel with rows 21–23. |
| 25 | 3 – Core UX & accessibility | CONTENT001, UX004 | Copy first, then the tutorial that uses it. | UX004 depends on CONTENT001 | Yes | Same strings module and the same onboarding validation pass. | Parallel with rows 26–27. |
| 26 | 3 – Core UX & accessibility | UX005 | Order balance; benefits from TEST001's predicate tests. | None | Single item | — | Parallel with rows 25, 27. |
| 27 | 3 – Core UX & accessibility | UX007, UX008 | Rotation, resize and safe-area handling share the viewport and container sizing logic. | UX007 depends on ARCH004 | Yes | Same `index.html` container rules and `computeCanvasHeight`; validated together on devices. | Parallel with rows 25–26. |
| 28 | 3 – Core UX & accessibility | UX009 | Confirm-state button for destructive actions. | ARCH001 | Single item | — | After row 22 (same `PauseModal`). |
| 29 | 3 – Core UX & accessibility | UX010 | Progression celebration and ladder; uses HUD, Pause and Game Over after they have stabilised. | None | Single item (UI004 can be combined) | — | After rows 17, 18, 20, 22. |
| 30 | 4 – Audio, hosting & offline | UX011, PERF001 | Both rework how BGM is created and played in `AudioManager`. | None | Yes | Same object (BGM element/buffer) and the same listening test. | Parallel with rows 31, 33. |
| 31 | 4 – Audio, hosting & offline | PERF002, SEC002 | Both add `hosting.headers` in `firebase.json`; one preview deploy validates both. | None | Yes | Same file and the same `curl -I` validation. | Parallel with rows 30, 33. |
| 32 | 4 – Audio, hosting & offline | PERF004 | Service worker after icons (BUG009) and cache headers (PERF002) are right. | PERF002, BUG009 | Single item | — | After row 31. |
| 33 | 4 – Audio, hosting & offline | PERF003 | Vendor chunk split. Independent, but best before PERF004 finalises precache lists. | None | Single item | — | Parallel with rows 30–31. |
| 34 | 5 – Maintenance & polish | ARCH003 | Renderer refactor once art changes elsewhere have settled. | None | Single item | — | Parallel with rows 35, 37–39. |
| 35 | 5 – Maintenance & polish | ARCH005 | Save validation and migration after features that added save fields (UX004, UX010, A11Y006). | None (rows 25, 29, 23 recommended) | Single item | — | Parallel with row 34. |
| 36 | 5 – Maintenance & polish | ARCH006 | Dead-code removal after the hooks it would otherwise delete are used. | UX001, UX011 | Single item | — | Parallel with rows 34–35. |
| 37 | 5 – Maintenance & polish | UI002 | Font loading and shared text styles once text sizes (A11Y005) are settled. | None | Single item | — | Parallel with rows 34–36. |
| 38 | 5 – Maintenance & polish | UI004 | Menu composition and palette after UX010 decides what the menu shows. | None | Single item | — | Parallel with rows 34–37. |
| 39 | 5 – Maintenance & polish | UI003 | High-DPI spike last; needs a real device and may be rejected. | None | Single item | — | Parallel. |
| 40 | 5 – Maintenance & polish | DX003 | Docs reflect the final state of the shipped features. | None (run last) | Single item | — | Parallel with rows 34–39. |

**Combinations to avoid**
- **BUG001 + ARCH002:** combining turns a P1 bug fix into a broad refactor; keep the fix small first.
- **UX001, UX010 and A11Y004/UI001 in parallel:** all edit `HUD.ts` and button positions. Run them sequentially (rows 17 → 20 → 29).
- **UX002 and BUG006 in parallel:** both restructure `GameOverModal.show()`. BUG006 first.
- **ARCH006 before UX001/UX011:** it would delete `onNextDrinkChanged` wiring candidates and the `musicGain` node those items use.
- **A11Y002 + A11Y003:** different mechanisms (Phaser focus ring vs DOM live regions), validated with different tools. Combining makes the task oversized and ambiguous.
- **PERF004 before BUG008/BUG009/PERF002:** the service worker would precache wrong or missing assets and cache-header mistakes.
- **DX001's formatting pass during rows 13–29:** land it in row 11 so later UI branches don't conflict on whitespace.

## Final quality checks

- [x] `TODO.md` is at the repository root.
- [x] All source, config, asset, docs, CI and deployment files listed in the Review summary were inspected, with the depth noted there.
- [x] 52 TODOs with unique IDs: BUG001–009, UX001–011, UI001–004, A11Y001–007, PERF001–005, ARCH001–006, TEST001–002, DX001–004, SEC001–003, CONTENT001.
- [x] Every TODO cites repository-specific files, symbols and (where reliable) line numbers.
- [x] The dependency graph is acyclic. Every referenced ID exists. Every TODO appears exactly once in the execution table.
- [x] Confirmed defects are labelled `BUG` and state whether they were confirmed at runtime or by code inspection. Items needing device or runtime validation say so.
- [x] No application source, asset or configuration files were modified during this review; only `TODO.md` was added.
