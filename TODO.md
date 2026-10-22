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
