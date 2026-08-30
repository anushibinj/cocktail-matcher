# 🍹 Cocktail Merge (Web-First)

A cheerful, relaxing tropical cocktail drop-and-merge casual game built with **TypeScript**, **Phaser 3**, **Matter.js Physics**, and **Vite**, deployable to **Firebase Hosting** and playable across mobile devices (iOS Safari, Android Chrome), tablets, and desktop.

![Cocktail Merge Icon](public/icons/icon-192.svg)

---

## 🎮 Features

- **12 Original Cocktail Tiers**: From fresh *Citrus Splash* to the legendary *Ultimate Tiki Masterpiece*.
- **Juicy 2D Physics**: Soft, bouncy, satisfying liquid drop and settling mechanics powered by Matter.js.
- **Intuitive Touch & Mouse Controls**: Drag horizontally to aim, release to drop with guidance line.
- **Zero-Dependency Synth Audio**: Web Audio API synthesizer generating responsive drops, pops, ascending merge chimes, fanfare chords, and chill ambient tropical synth background chords.
- **Visual Game Feel**: Particle splashes, sparkle bursts, shockwave rings, floating score popups, and subtle screen shakes.
- **Danger Overflow & Grace Period**: Visual pulsing warning when drinks rise above the danger line with a 2.0s countdown before Game Over.
- **Responsive Mobile-First UI**: Scaled portrait layout (`720x1280` base) adapting cleanly to iPhone, iPad, Android screens, and desktop browsers.
- **Progress Persistence**: High scores and sound/music preferences saved automatically to versioned LocalStorage.
- **PWA & Offline Ready**: Mobile web manifest, icons, and standalone launch support.
- **Firebase Hosting Ready**: Production build configuration with single-page application (SPA) rewrites.

---

## 🍸 Drink Progression

| Level | Drink Name | Base Score | Appearance & Garnish |
|:---:|---|:---:|---|
| **0** | **Citrus Splash** | 10 | Fresh lime & lemon wheel with crushed ice |
| **1** | **Berry Fizz** | 20 | Sparkling pink spritz with raspberries & bubbles |
| **2** | **Pineapple Cooler** | 40 | Sweet golden pineapple nectar with pineapple slice |
| **3** | **Sunset Cooler** | 80 | Two-tone orange-to-magenta sunset layers |
| **4** | **Mint Lime** | 160 | Crisp spearmint leaves & lime in highball |
| **5** | **Tropical Punch** | 320 | Deep ruby punch with umbrella & cherry |
| **6** | **Island Breeze** | 640 | Caribbean turquoise breeze with starfruit |
| **7** | **Blue Lagoon** | 1,280 | Electric blue curaçao cocktail with neon glow |
| **8** | **Passion Colada** | 2,560 | Creamy coconut & passionfruit in half-coconut bowl |
| **9** | **Golden Sunset** | 5,120 | Radiant amber sunrise in stem glass |
| **10** | **Royal Cocktail** | 10,240 | Luxurious royal purple cocktail in gold chalice |
| **11** | **Ultimate Cocktail** | 20,480 | Grand rainbow tiki volcano bowl with sparklers |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (v9+)

### 2. Install & Run Dev Server
```bash
npm install
npm run dev
```

Open `http://localhost:3000` (or the network URL displayed in terminal) in your mobile or desktop browser to play immediately!

---

## 🛠️ Production Build

To test the optimized production bundle locally:

```bash
npm run build
npm run preview
```

The output files are generated in the `dist/` directory.

---

## 🌐 Deploying to Firebase Hosting

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Link your Firebase project** (or use existing default):
   ```bash
   firebase use --add
   ```

4. **Build and Deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

Firebase Hosting serves the `dist/` directory with proper cache headers and SPA routing configured in `firebase.json`.

---

## 📁 Project Structure

```text
cocktail-matcher/
├── index.html                  # Mobile-first viewport, PWA meta tags & styles
├── package.json                # Dependencies: Phaser 3, Vite, TypeScript
├── tsconfig.json               # Strict TypeScript configuration
├── vite.config.ts              # Bundler configuration
├── firebase.json               # Firebase Hosting configuration
├── .firebaserc                 # Firebase project mapping
├── public/
│   ├── manifest.webmanifest   # PWA manifest
│   └── icons/                  # Vector app icons
└── src/
    ├── main.ts                 # Game entrypoint & Phaser config
    ├── types/
    │   └── game.ts             # Data interfaces
    ├── game/
    │   ├── config/
    │   │   ├── gameConfig.ts   # Dimensions, physics & gameplay constants
    │   │   └── drinks.ts       # 12 Drink tier definitions
    │   ├── entities/
    │   │   ├── Drink.ts        # Matter physics circle body & animations
    │   │   └── Board.ts        # Static walls, container & danger line
    │   ├── systems/
    │   │   ├── DrinkSpawner.ts # Aiming, horizontal clamping & drop release
    │   │   ├── MergeManager.ts # Collision detection, atomic locks, merge FX
    │   │   ├── ScoreManager.ts # Scoring, high score & floating popups
    │   │   ├── GameOverManager.ts # 2.0s danger line tracker & game over trigger
    │   │   └── AudioManager.ts # Web Audio procedural sound synthesizer
    │   ├── ui/
    │   │   ├── HUD.ts          # Score cards, next drink & evolution cheat-sheet
    │   │   ├── GameOverModal.ts # Game over dialog with new record banner
    │   │   └── PauseModal.ts   # Pause dialog with audio controls & how-to-play
    │   ├── scenes/
    │   │   ├── BootScene.ts    # Procedural texture generator & system setup
    │   │   ├── MenuScene.ts    # Title screen with animated mascot & play trigger
    │   │   └── GameScene.ts    # Main gameplay loop orchestrator
    │   └── storage/
    │       └── SaveManager.ts  # LocalStorage persistence manager
    └── utils/
        └── AssetGenerator.ts   # Procedural high-res cocktail & UI graphics
```

---

## 🕹️ Controls

- **Desktop**: Move mouse to align dropper, click / release left mouse button to drop.
- **Mobile / Tablet**: Touch and drag horizontally to align, lift finger to drop.
- **Top Bar**:
  - `🔊 / 🔇`: Toggle Sound FX
  - `🎵 / 🚫`: Toggle Ambient Synth Music
  - `⏸`: Pause game and view How to Play
