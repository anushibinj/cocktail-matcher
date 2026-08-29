# Cocktail Merge

A casual 2D cocktail merge/drop game built with TypeScript, Vite, and Phaser 3.

Drop drinks, merge identical cocktails, and climb through 12 tropical tiers without overflowing the glass!

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and play immediately.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | Run TypeScript type checking |

## How to Play

1. **Move** your drink horizontally by dragging (touch or mouse)
2. **Release** to drop it into the glass
3. **Merge** two identical drinks to create the next tier
4. Keep merging to score higher — don't let drinks stay above the danger line!

## Tech Stack

- TypeScript + Vite
- Phaser 3 with Matter.js physics
- LocalStorage persistence
- PWA support (manifest + icons)
- Firebase Hosting for deployment

## Firebase Hosting Deployment

This repo is linked to Firebase project **cocktail-matcher**:

| Field | Value |
| --- | --- |
| Project ID | `cocktail-matcher` |
| Project number | `1032492683738` |
| Web app ID | `1:1032492683738:web:732d28028273758d5670e3` |
| Hosting site | `cocktail-matcher` |
| Live URL (after deploy) | https://cocktail-matcher.web.app |

### First-time setup

```bash
npm install
npx firebase login
npx firebase use cocktail-matcher
```

If `firebase use` cannot find the project by ID, link by project number instead:

```bash
npx firebase use --add
# Select the project with number 1032492683738
```

### Deploy

```bash
npm run deploy
```

Or step by step:

```bash
npm run build
npm run deploy:hosting
```

The `firebase.json` serves the Vite `dist/` folder with SPA fallback. Static assets are cached for one year; `index.html` is always revalidated.

## Project Structure

```text
src/
├── main.ts                 # Phaser game bootstrap
├── game/
│   ├── scenes/             # Boot, Menu, Game scenes
│   ├── entities/           # Drink entity
│   ├── systems/            # Spawn, merge, score, audio, game-over
│   ├── data/               # Drink progression definitions
│   └── config/             # Physics and board constants
└── storage/                # LocalStorage save manager
```

## Development Milestones

- [x] Milestone 1 — Playable board with physics
- [x] Milestone 2 — Drop mechanic (touch + mouse)
- [x] Milestone 3 — Merge mechanic with scoring
- [x] Milestone 4 — Full game loop (spawn, game over, restart, persistence)
- [x] Milestone 5 — Game feel (particles, popups, shake, audio)
- [x] Milestone 6 — UI polish (menus, pause, settings, game over)
- [x] Milestone 7 — Firebase Hosting configuration
