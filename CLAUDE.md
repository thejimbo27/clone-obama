# CLAUDE.md

## Project

Obama HQ — a React Native (Expo SDK 55) web-first app. Clone Obamas, collect rares, bomb Iran, unlock Joe Biden. See `DESIGN.MD` for the full spec.

## Dev workflow

- `npx expo start --web` to run the dev server (port 8081)
- Web output mode is `"server"` (in `app.json`) — this is required for API routes to work
- Commit often. Check `DESIGN.MD` before making changes, update it after.

## Key architecture decisions

- **Skia canvases** (`IslandCanvas.js`, `BombCanvas.js`) are lazy-loaded via `React.lazy` to avoid CanvasKit WASM race. Route files (`island.js`, `bomb.js`) are thin wrappers with zero Skia imports.
- **Leaderboard persistence**: `services/leaderboard.js` always routes through the server API (`/api/leaderboard`), falling back to an in-memory module-level store if the server is unreachable. The server API (`app/api/leaderboard+api.js`) persists to `data/leaderboard.json` via Node `fs`. `data/` is gitignored.
- **State**: All game state lives in `ObamaContext` (React context). Score is computed from `stats` using weights from `config.js`.

## Naming

- "Specialty" obamas were renamed to **"synthetic"** — the property is `isSynthetic`, the stat is `syntheticsObtained`, the config key is `SYNTHETIC`.

## Sounds

- `riff.mp3` — Michelle only
- `synth.mp3` — rare and synthetic
- `ere.mp3` — island entry

## Scoring

Every action earns points: clones (2), pages (5), synthetics (100), rares (500), michelles (5000), missiles (1). Browser page scoring triggers on `onLoad` (iframe) / `onNavigationStateChange` (native WebView), not on GO button press.
