# PRD — Cocktail Merge (Web-First)

## 1. Product Overview

**Working title:** Cocktail Merge

**Product type:** Casual 2D mobile-first merge/drop game

**Phase 1 target:** Web browser, deployed to Firebase Hosting

**Primary devices for Phase 1:** iPhone, iPad, Android phones/tablets, desktop browser for development

**Phase 2 target:** Native Android/iOS app, potentially by wrapping/reusing the web game rather than rewriting gameplay

**Recommended stack:**
- TypeScript
- Vite
- Phaser 3
- Matter.js physics through Phaser's Matter integration
- Firebase Hosting
- LocalStorage for MVP persistence
- PWA support where practical

The first goal is a polished browser game that can be opened from a Firebase Hosting URL and played comfortably on a phone or iPad.

Do NOT build a Unity project for Phase 1.

---

# 2. Product Vision

Create an original, cheerful, relaxing cocktail merge game.

The player positions a drink horizontally and drops it into a container. Drinks obey 2D physics. Two identical drinks merge into the next drink in the progression. The player continues merging drinks while trying to prevent the container from overflowing.

The game should be inspired by the broad genre/mechanics of merge/drop games, but must use original artwork, names, UI, sounds, branding, and presentation. Do not copy another game's proprietary assets, exact UI, logos, text, or distinctive visual presentation.

The first release is intentionally small. The objective is to get a fun playable game into the creator's wife's hands as quickly as possible.

---

# 3. Phase 1 Goals

The web MVP must:

1. Load quickly from Firebase Hosting.
2. Work directly in a mobile browser.
3. Support portrait orientation.
4. Support touch input.
5. Support mouse input for desktop development.
6. Have responsive layout for phones and tablets.
7. Have smooth 2D physics.
8. Allow drinks to be positioned and dropped.
9. Merge identical drinks.
10. Progress through multiple drink tiers.
11. Display score and best score.
12. Display the next drink.
13. Detect game over.
14. Allow restarting.
15. Persist best score locally.
16. Include satisfying animations and sound effects.
17. Work offline after initial load where practical.
18. Deploy successfully to Firebase Hosting.

---

# 4. Explicit Non-Goals for Phase 1

Do NOT implement:

- Native Android APK
- Native iOS app
- Capacitor wrapper
- Backend
- Authentication
- Cloud saves
- Multiplayer
- Online leaderboard
- Ads
- In-app purchases
- Analytics
- Push notifications
- Complex economy
- User profiles
- Social features

These may be considered later.

---

# 5. Core Gameplay

## Game loop

1. Start game.
2. Display current drink at the top of the board.
3. Player moves it horizontally.
4. Player releases.
5. Drink falls into the board using physics.
6. Drink collides with walls, floor, and other drinks.
7. If two identical drinks collide, merge them.
8. Spawn the next-tier drink at the merge location.
9. Award score.
10. Show the next upcoming drink.
11. Continue until the board becomes too full.
12. Show game over.
13. Allow replay.

The game should be understandable without instructions:

**Move → Drop → Merge → Make a bigger cocktail → Keep going.**

---

# 6. Drink Progression

Use approximately 12 original drink tiers.

Suggested progression:

| Level | Drink | Base Score |
|---:|---|---:|
| 0 | Citrus Splash | 10 |
| 1 | Berry Fizz | 20 |
| 2 | Pineapple Cooler | 40 |
| 3 | Sunset Cooler | 80 |
| 4 | Mint Lime | 160 |
| 5 | Tropical Punch | 320 |
| 6 | Island Breeze | 640 |
| 7 | Blue Lagoon | 1280 |
| 8 | Passion Colada | 2560 |
| 9 | Golden Sunset | 5120 |
| 10 | Royal Cocktail | 10240 |
| 11 | Ultimate Cocktail | 20480 |

Names are placeholders and may be changed to improve the original game's identity.

The progression must be data-driven.

Each drink definition should contain:

- id
- level
- display name
- sprite/image
- radius
- score
- optional merge effect
- optional sound

---

# 7. Spawn System

The player always has:

- current drink
- next drink preview

After dropping:

current <- next

next <- newly generated drink

Initially spawn only low-level drinks.

Suggested initial distribution:

- Level 0: 55%
- Level 1: 30%
- Level 2: 15%

Make this configurable.

Do not make all 12 levels randomly spawnable.

---

# 8. Input

## Mobile

Use touch/pointer events.

Player can:

- drag horizontally
- release to drop

The current drink should remain at the spawn height until released.

Clamp horizontal position to the playable board.

## Desktop

Mouse should behave equivalently.

Prefer Phaser's pointer events so the same implementation works for touch and mouse.

Do not depend on hover interactions.

---

# 9. Physics

Use Phaser 3 Matter Physics.

Each drink should have:

- circular or near-circular collision body
- mass
- restitution
- friction
- air friction
- gravity

Board:

- left wall
- right wall
- bottom floor
- invisible danger line

Physics should feel:

- soft
- predictable
- slightly bouncy
- satisfying
- stable on mobile

Avoid excessive bouncing, tunneling, or unstable stacking.

All important physics values must be configurable.

---

# 10. Merge Mechanics

When two identical drinks collide:

1. Detect that both are mergeable.
2. Ensure only one merge operation is performed.
3. Disable/remove both original drinks.
4. Create one drink of level + 1.
5. Place it near the midpoint of the originals.
6. Give the new drink reasonable inherited momentum where practical.
7. Award score.
8. Play merge animation.
9. Play merge sound.
10. Emit particles.

The merge system MUST prevent:

- duplicate merges
- two result drinks
- repeated processing of the same collision
- invalid levels
- physics explosions
- merge recursion bugs

A newly created drink is allowed to immediately merge with another identical drink if the physics naturally causes that collision.

---

# 11. Game Over

Add an invisible horizontal danger line near the top of the board.

A drink crossing/remaining above the line should not immediately cause game over.

Suggested rule:

A qualifying drink must remain above the danger line continuously for approximately 2 seconds.

When game over occurs:

- disable player input
- stop spawning
- show game-over UI
- display final score
- display best score
- allow restart

The grace period must be configurable.

---

# 12. Scoring

For each merge:

`score += resultingDrink.baseScore`

Display:

- current score
- best score

On merge, show a floating score popup such as:

`+160`

Animate the popup upward and fade it out.

Persist best score in LocalStorage.

Use a versioned save-data structure.

---

# 13. Visual Design

Create an original tropical cocktail aesthetic.

Desired qualities:

- colorful
- friendly
- polished
- casual
- slightly cartoon-like
- readable on small screens
- satisfying

Possible environment:

- sky
- ocean
- palm trees
- sand
- beach bar
- subtle decorative elements

Background must remain visually quieter than gameplay objects.

Do not copy the reference game's artwork.

---

# 14. Drink Artwork

Create original drink artwork.

Each drink should become visually more elaborate as its level increases.

Vary:

- glass shape
- drink color
- garnish
- ingredients
- size
- decoration

The gameplay must remain readable even when many drinks are on screen.

If final art assets are not available, create clean original placeholders and structure the code so they can easily be replaced later.

Do not block gameplay implementation waiting for final art.

---

# 15. Game Feel

Game feel is a high priority.

## Spawn

Use:

- scale-in animation
- subtle bounce

## Merge

Use:

- impact
- particles
- sparkle
- brief flash
- scale animation
- subtle screen shake
- floating score

## High-level merge

Use a stronger effect for major milestones.

Respect reduced-motion preferences where practical.

---

# 16. Audio

Use original or properly licensed audio.

Minimum:

- drop
- collision
- merge
- score popup
- button click
- game over
- restart

Music is optional for MVP.

Settings:

- sound effects on/off
- music on/off

Persist settings locally.

---

# 17. Responsive UI

The game is portrait-first but must also work on tablets.

Target:

- iPhone-sized screens
- Android phone screens
- iPad
- Android tablets
- desktop browser for development

Do not hardcode UI around one resolution.

Use Phaser scaling/responsive layout.

The playable board should preserve its intended proportions.

Important controls must remain easy to tap.

---

# 18. UI

Main gameplay UI:

- score
- best score
- next drink
- pause button
- game board
- danger line

Main menu:

- title
- Play
- best score
- Settings

Pause:

- Resume
- Restart
- sound toggle
- music toggle
- Main Menu

Game Over:

- Game Over
- final score
- best score
- New Best indicator when applicable
- Play Again
- Main Menu

Keep the UI simple.

---

# 19. Web Architecture

Recommended project structure:

```text
cocktail-merge/
├── public/
│   ├── assets/
│   │   ├── drinks/
│   │   ├── backgrounds/
│   │   ├── ui/
│   │   └── audio/
│   └── icons/
│
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── Game.ts
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   ├── MenuScene.ts
│   │   │   └── GameScene.ts
│   │   ├── entities/
│   │   │   └── Drink.ts
│   │   ├── systems/
│   │   │   ├── DrinkSpawner.ts
│   │   │   ├── MergeManager.ts
│   │   │   ├── ScoreManager.ts
│   │   │   └── GameOverManager.ts
│   │   ├── data/
│   │   │   └── drinks.ts
│   │   └── config/
│   │       └── gameConfig.ts
│   │
│   └── storage/
│       └── SaveManager.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── firebase.json
├── .firebaserc
└── README.md
```

The exact structure may differ if the agent has a strong reason, but keep responsibilities separated.

---

# 20. Technical Principles

Use:

- TypeScript
- strict TypeScript where practical
- Phaser 3
- Matter Physics
- Vite

Avoid:

- React for the game itself
- unnecessary state-management frameworks
- backend services
- databases
- ECS
- complicated dependency injection
- unnecessary third-party libraries

The game is small. Keep it simple.

React may be used for non-game tooling only if there is a compelling reason, but Phaser should own gameplay rendering and input.

---

# 21. Firebase Hosting

Phase 1 deployment target is Firebase Hosting.

Expected workflow:

```text
Local development
      ↓
npm run build
      ↓
dist/
      ↓
Firebase Hosting
      ↓
Public HTTPS URL
      ↓
Play on phone/iPad
```

Configure Firebase Hosting to serve the Vite `dist` directory.

The agent should provide:

- Firebase configuration
- build script
- deployment commands
- README instructions
- SPA fallback if needed

Do not introduce Firebase Authentication, Firestore, Functions, or other Firebase products unless later requested.

---

# 22. PWA / Offline

Where practical, configure the web app as a lightweight PWA.

Requirements:

- web app manifest
- app icon
- sensible mobile metadata
- cache/static assets for offline play after initial load

Do not let PWA complexity delay the playable game.

---

# 23. Performance

Target smooth gameplay on modern phones and tablets.

Requirements:

- avoid unnecessary object allocations
- avoid expensive per-frame loops
- clean up destroyed drinks
- limit particle counts
- use texture atlases where appropriate
- avoid excessive physics bodies
- keep assets reasonably compressed
- avoid unnecessary DOM manipulation during gameplay

Gameplay should primarily render through Phaser's canvas/WebGL renderer.

---

# 24. Development Milestones

## Milestone 1 — Empty playable board

Implement:

- Vite
- TypeScript
- Phaser
- portrait responsive canvas
- board
- walls
- floor
- one placeholder drink
- Matter physics

Acceptance:

A placeholder drink can fall and collide with the board.

---

## Milestone 2 — Drop mechanic

Implement:

- pointer/touch positioning
- horizontal clamping
- release-to-drop
- mouse support

Acceptance:

Player can move the drink horizontally and drop it on phone and desktop.

---

## Milestone 3 — Merge mechanic

Implement:

- 3 drink levels
- identical collision detection
- merge
- next-level creation
- score

Acceptance:

Two identical drinks reliably produce one higher-level drink.

---

## Milestone 4 — Full game loop

Implement:

- all drink levels
- next drink preview
- spawn distribution
- danger line
- game over
- restart
- best score persistence

Acceptance:

Player can start, play, lose, and restart repeatedly.

---

## Milestone 5 — Game feel

Implement:

- animations
- particles
- score popups
- sound
- subtle screen shake
- physics tuning

Acceptance:

Game feels satisfying rather than like a prototype.

---

## Milestone 6 — Art/UI

Implement:

- original drink art
- original tropical background
- polished menus
- game-over UI
- settings

Acceptance:

The game looks coherent and intentional.

---

## Milestone 7 — Firebase deployment

Implement:

- production build
- Firebase Hosting configuration
- deployment
- mobile testing

Acceptance:

A public HTTPS URL loads the game and it is playable on an iPhone/iPad/Android device.

---

# 25. Testing Requirements

Before declaring MVP complete, test:

### Gameplay

- [ ] drop drink
- [ ] collide with walls
- [ ] collide with floor
- [ ] collide with other drinks
- [ ] merge identical drinks
- [ ] non-identical drinks do not merge
- [ ] simultaneous collisions do not duplicate merges
- [ ] high-level drink cannot produce invalid level
- [ ] game-over timer behaves correctly
- [ ] restart completely resets game

### Mobile

- [ ] touch works
- [ ] drag works
- [ ] release works
- [ ] scrolling does not interfere with gameplay
- [ ] UI is readable on small screens
- [ ] buttons are easy to tap
- [ ] iPad/tablet layout works

### Persistence

- [ ] best score survives refresh
- [ ] sound setting survives refresh
- [ ] music setting survives refresh

### Web

- [ ] production build succeeds
- [ ] no console errors during normal gameplay
- [ ] Firebase Hosting serves assets correctly
- [ ] direct URL loading works
- [ ] HTTPS works
- [ ] game loads on mobile browser

---

# 26. Agent Instructions

You are an autonomous senior TypeScript/game developer.

Build this project end-to-end.

The user is an experienced software engineer but has no prior game-development experience. Do not assume knowledge of Phaser or Matter Physics.

## Workflow

1. Inspect the repository.
2. Determine whether an existing project exists.
3. If necessary, initialize the web project.
4. Implement one milestone at a time.
5. Keep the project buildable after every milestone.
6. Run type checking/builds frequently.
7. Fix errors before proceeding.
8. Use placeholders when final artwork is unavailable.
9. Do not stop because an optional asset is missing.
10. Keep the implementation simple.
11. Do not introduce backend infrastructure.
12. Do not ask unnecessary questions when a reasonable implementation decision can be made.
13. Document manual steps only when they genuinely cannot be automated.
14. Before finishing, perform a production build.
15. Configure Firebase Hosting.
16. Provide exact commands needed to deploy.

## Important

The agent should prioritize having a working game over architectural perfection.

Do not spend large amounts of time designing abstractions for a game this small.

---

# 27. Phase 2 — Native App

Do NOT implement this now.

The web version should be structured so that native packaging can be evaluated later.

Potential Phase 2 approaches:

1. Capacitor wrapper around the web app.
2. PWA installation.
3. Native rewrite only if web performance/input limitations justify it.
4. Android/iOS-specific integrations later.

The gameplay code should not depend on Firebase Hosting and should remain portable.

Avoid browser APIs that would make later native packaging unnecessarily difficult.

---

# 28. Definition of Done

Phase 1 is complete when:

- [ ] Web project builds successfully.
- [ ] Game runs locally.
- [ ] Game runs on phone browser.
- [ ] Game runs on iPad browser.
- [ ] Touch controls work.
- [ ] Mouse controls work.
- [ ] Physics works.
- [ ] Drinks merge correctly.
- [ ] Score works.
- [ ] Best score persists.
- [ ] Next drink works.
- [ ] Game-over works.
- [ ] Restart works.
- [ ] Pause works.
- [ ] Sound settings work.
- [ ] Visual feedback exists.
- [ ] Original placeholder/final art exists for all drink levels.
- [ ] Responsive portrait layout works.
- [ ] Production build succeeds.
- [ ] Firebase Hosting is configured.
- [ ] Firebase deployment succeeds.
- [ ] Public HTTPS URL works on mobile.
- [ ] No known compiler/type errors.
- [ ] No obvious runtime errors during normal gameplay.

---

# 29. Product Principle

The most important requirement is:

> Make something the creator's wife can open on her phone and immediately enjoy.

Do not optimize for monetization.

Do not optimize for enterprise architecture.

Do not optimize for feature count.

Optimize for:

**simple → beautiful → satisfying → replayable**

Build the smallest version that feels like a real game.
