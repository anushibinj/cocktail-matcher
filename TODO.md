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

### Bugs (BUG)

### [BUG001] Pause and game over do not freeze physics, merges, scoring or order checkout

- **Category:** BUG
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
