# Obama HQ

Clone Obamas. Collect rares. Bomb Iran. Unlock Joe Biden.

A React Native (Expo SDK 55) web-first app with a SQLite-backed admin panel for managing Obama templates and accessories.

## Quick Start

```bash
npm install
cd admin && npm install && cd ..
npm run seed          # seed the database
npx expo start --web  # start the app (port 8081)
npm run admin         # start the admin panel (port 3000)
```

Admin panel default credentials: `admin` / `obama44`

## Container

Run everything (app + admin + reverse proxy) in a single container:

```bash
npm run container:build   # podman build
npm run container:run     # podman run on port 4000
```

The container exposes port 4000 with a reverse proxy:
- `/` — the app
- `/admin/` — the admin panel

Data (SQLite DB + uploads) persists in a named volume `obama-data`.

## Tunneling

Expose your local instance to the internet with cloudflared:

```bash
npm run tunnel
```

This creates a quick tunnel on `trycloudflare.com` (no account needed). The URL is ephemeral and changes on each restart.

## Project Structure

```
app/            Expo Router pages + API routes
admin/          Express admin panel (EJS views, basic auth)
db/             Schema definition + seed script
assets/         Images and sounds
components/     Shared components (Skia canvases, etc.)
context/        React context (ObamaContext)
services/       Client-side service modules
data/           Runtime data (SQLite DB, uploads) — gitignored
```

## Architecture

- **Database**: SQLite via `better-sqlite3`. Shared by the Expo API routes and the admin panel.
- **Admin panel**: Separate Express app with basic auth, EJS views, and multer for file uploads.
- **Obama templates**: Configurable via admin — headshots, body params (limb count/length, torso, color), rarity weights, accessories.
- **API routes**: Expo server-side routes use `createRequire(__filename)` to load native modules (Metro can't bundle C++ addons).
- **Rendering**: Skia canvases (`IslandCanvas`, `BombCanvas`) lazy-loaded to avoid WASM race conditions.

See [DESIGN.MD](DESIGN.MD) for the full spec.
