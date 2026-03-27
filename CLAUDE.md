# CLAUDE.md

## Project

Obama HQ — a React Native (Expo SDK 55) web-first app. Clone Obamas, collect rares, bomb Iran, unlock Joe Biden. See `DESIGN.MD` for the full spec.

## Dev workflow

- `npx expo start --web` to run the dev server (port 8081)
- `npm run admin` to run the admin panel (port 3000, creds via `ADMIN_USER`/`ADMIN_PASS` env vars, default: admin/obama44)
- `npm run seed` to seed the DB with all default obama templates
- Web output mode is `"server"` (in `app.json`) — this is required for API routes to work
- Commit often. Check `DESIGN.MD` before making changes, update it after.

## Key architecture decisions

- **Database**: SQLite via `better-sqlite3`. DB file lives at `data/obama.db`. Shared by both the main Expo app (server-side API routes) and the admin panel. Schema defined in `db/schema.js`.
- **Admin panel**: Separate Express app at `admin/`. Basic auth (timing-safe, rate-limited), EJS views. CRUD for obama templates and accessories. File uploads via multer to `data/uploads/` (images only, no SVG).
- **Obama templates**: Stored in SQLite `obama_templates` table. Each template defines tier, rarity weight, headshot, body params (arm/leg count, limb lengths, torso length, body color), and rare type/trait. Templates are fetched by the main app via `/api/templates` and used for obama generation.
- **Accessories**: Stored in `accessories` table. Images uploaded to `data/uploads/`. Each accessory has an attach point (head_top, torso_front, left_hand, etc.), offset, and scale. Linked to templates via `template_accessories` join table.
- **Skia canvases** (`IslandCanvas.js`, `BombCanvas.js`) are lazy-loaded via `React.lazy` to avoid CanvasKit WASM race. Route files (`island.js`, `bomb.js`) are thin wrappers with zero Skia imports.
- **Leaderboard persistence**: SQLite-backed via `app/api/leaderboard+api.js`. Client-side `services/leaderboard.js` routes through the server API, falling back to in-memory store.
- **State**: All game state lives in `ObamaContext` (React context). On mount, templates are fetched from `/api/templates`. Obama generation uses DB templates when available, hardcoded fallback when not. Score is computed from `stats` using weights from `config.js`.

## Naming

- "Specialty" obamas were renamed to **"synthetic"** — the property is `isSynthetic`, the stat is `syntheticsObtained`, the config key is `SYNTHETIC`.

## Sounds

- `riff.mp3` — rare Obamas
- `synth.mp3` — Michelle
- `synthetic.mp3` — synthetic Obamas
- `ere.mp3` — island entry

## Scoring

Every action earns points: clones (2), pages (5), synthetics (100), rares (500), michelles (5000), missiles (1). Browser page scoring triggers on `onLoad` (iframe) / `onNavigationStateChange` (native WebView), not on GO button press.

## API Routes

- `GET /api/templates` — all obama templates with accessories (optional `?tier=` filter)
- `GET /api/accessories` — all accessories
- `GET /api/uploads/:filename` — serve uploaded files from `data/uploads/`
- `GET|POST /api/leaderboard` — leaderboard CRUD (name max 50 chars, score bounded, stats max 10KB)

## Security

- Admin creds must be set via `ADMIN_USER`/`ADMIN_PASS` env vars (no hardcoded creds in container image)
- Container runs as non-root `appuser`
- Proxy strips hop-by-hop headers, enforces 10MB body limit, adds security headers
- Upload API only serves UUID-named image files (no SVG), validates with `realpathSync`
- API error messages never leak internals
- Admin auth is timing-safe with per-IP rate limiting on failures
