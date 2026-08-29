# Cocktail Merge

A casual 2D cocktail merge/drop game built with TypeScript, Vite, and Phaser 3.

## Prerequisites

- Node.js 20+
- npm

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Run TypeScript type checking |

## Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Tech Stack

- TypeScript
- Vite
- Phaser 3 with Matter.js physics
- Firebase Hosting (deployment)
