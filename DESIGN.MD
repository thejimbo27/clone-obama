# DESIGN

## OVERVIEW

You have access to Obama's headquarters, where only Obama can use technologies such as an Obama cloner, Obama Island, a missile launcher, a web browser, and a leaderboard. Your first Obama — Barack — is already here when you open the app. He is your personal Obama assistant, operating the command center.

Clone Obamas. Collect rares. Bomb Iran. Unlock Joe Biden.

## TECH STACK

- **React Native** (Expo SDK 55) — targeting web first, then iOS/Android
- **expo-router** — file-based navigation (Stack), API routes for server endpoints
- **@shopify/react-native-skia** — GPU-accelerated canvas for Obama Island and Bomb Iran (the only scenes that need game-engine rendering)
- **expo-av** — sound effects
- **react-native-webview** — real browser (native), iframe fallback (web)
- **better-sqlite3** — SQLite database for templates, accessories, and leaderboard
- **Express + EJS** — admin panel (separate app at `admin/`)
- **multer** — file upload handling for headshots and accessories
- All other screens use standard React Native components and the built-in Animated API

## ARCHITECTURE

The app has **one home screen** (HQ) and **five sub-screens** accessible from it.

```
app/
├── _layout.js      ─── Root layout (SkiaLoader + ObamaProvider + Stack)
├── index.js        ─── HQ / Home (merged hub + command center)
├── clone.js        ─── Obama Cloner
├── island.js       ─── Obama Island (lazy Skia loader)
├── bomb.js         ─── Bomb Iran (lazy Skia loader)
├── browser.js      ─── Web Browser
├── leaderboard.js  ─── Leaderboard + Score Breakdown
└── api/
    ├── leaderboard+api.js   ─── Leaderboard CRUD (SQLite)
    ├── templates+api.js     ─── Obama templates API (read-only)
    ├── accessories+api.js   ─── Accessories API (read-only)
    └── uploads/
        └── [filename]+api.js ─── Serve uploaded files

components/
├── IslandCanvas.js ─── Skia canvas (lazy-loaded, code-split)
└── BombCanvas.js   ─── Skia canvas (lazy-loaded, code-split)

context/
└── ObamaContext.js  ─── Global state (fetches templates from API on mount)

services/
└── leaderboard.js   ─── Leaderboard client (module-level store + API fallback)

db/
├── schema.js        ─── Shared SQLite schema (used by main app + admin)
└── seed.js          ─── Seed DB with default templates

admin/               ─── Separate Express app (admin panel)
├── server.js        ─── Express server with basic auth, CRUD, file uploads
├── package.json
└── views/           ─── EJS templates (dashboard, template form, accessory form)

data/                ─── gitignored runtime data
├── obama.db         ─── SQLite database
└── uploads/         ─── Uploaded headshots and accessories

config.js            ─── Configurable settings (score weights)
```

### Why Skia?

Obama Island and Bomb Iran are 2D game scenes — dozens of sprites walking, bobbing, ascending, missiles flying, explosions expanding. Running per-sprite `Animated.loop` calls through the JS bridge kills performance. Skia gives us a single GPU-accelerated `<Canvas>` with one `requestAnimationFrame` loop that updates all positions and draws all sprites in a single frame. The rest of the app is normal UI and stays as standard RN components.

### Skia Web Loading

`@shopify/react-native-skia` has a module-level statement `export const Skia = JsiSkApi(global.CanvasKit)` that runs at import time. Metro evaluates all route files at bundle startup, so any route that imports Skia would crash before `LoadSkiaWeb()` has a chance to set `global.CanvasKit`.

**Solution:** Skia-using screens are split into two files:
- **Route file** (`island.js`, `bomb.js`) — thin wrapper, zero Skia imports, uses `React.lazy(() => import('../components/...'))` + `<Suspense>`
- **Canvas component** (`IslandCanvas.js`, `BombCanvas.js`) — all Skia imports live here, only evaluated when `React.lazy` resolves at render time (after CanvasKit WASM is loaded)

`_layout.js` loads CanvasKit from CDN before rendering children:
```js
await LoadSkiaWeb({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
});
```

### Database

SQLite via `better-sqlite3`. The DB file lives at `data/obama.db` and is shared by both the main Expo server-side API routes and the admin panel.

**Tables:**
- `obama_templates` — configurable obama types with tier, rarity weight, headshot, body params, rare type/trait
- `accessories` — uploadable images that attach to body parts (head_top, torso_front, left_hand, etc.)
- `template_accessories` — join table linking templates to accessories
- `leaderboard` — player scores

Run `npm run seed` to populate the DB with all default obama templates (normal, 9 rares, synthetics, michelle).

### Admin Panel

Separate Express app at `admin/`. Run with `npm run admin` (port 3000).

- **Basic auth**: default `admin` / `obama44` (override with `ADMIN_USER` / `ADMIN_PASS` env vars)
- **Dashboard**: template counts by tier, recent templates, accessories, leaderboard top 10
- **Templates CRUD**: create/edit/delete obama templates with full body configuration (arm/leg count, limb lengths, torso length, body color, headshot upload, accessory attachment)
- **Accessories CRUD**: upload accessory images, set attach point, offset, scale
- **File uploads**: via multer to `data/uploads/`, served by the main app at `/api/uploads/:filename`

### Obama Templates

Each template defines a fully configurable obama type:
- **tier**: normal (91%), synthetic (8%), rare (1%), michelle (0.1%)
- **rarity_weight**: relative weight within the tier (for weighted random selection)
- **headshot**: uploaded image or bundled asset name (defaults to obama.png)
- **body params**: arm_count, leg_count, arm_length, leg_length, torso_length (all multipliers), body_color
- **rare_type/trait**: hat, deformity, or color variant
- **accessories**: linked via join table, each with attach_point, offset, and scale

The main app fetches templates from `/api/templates` on mount. `generateObama()` uses weighted random selection from the template pool. Falls back to hardcoded generation if the API is unreachable.

### State

`ObamaContext` (React context) holds:
- `obamas[]` — the active pool on the island
- `totalCloned` — lifetime counter
- `hqObama` — the Obama currently operating HQ
- `missilesLaunched` — lifetime missile counter
- `pagesVisited` — lifetime browser navigation counter
- `raresObtained` / `syntheticsObtained` / `michellesObtained` — pull counters
- `collectedRareTraits` — Set of unique rare traits collected (for Biden unlock)
- `joeBidenUnlocked` — derived boolean (Michelle is HQ + all 9 rare traits)
- `stats` / `score` — computed from the above using score weights
- `playerName` — editable, defaults to OPERATOR-44

Starts with one Obama: `{ id: 1, name: 'Barack' }`.

## SCENES

### HQ (Home Screen — `index.js`)

The hub and command center are **one screen**. Light theme. Layout top-to-bottom:

1. **Title** — "OBAMA HEADQUARTERS"
2. **Stats** — active count | all-time count
3. **Navigation cards** — five frosted glass buttons: CLONER (red), ISLAND (green), BOMB IRAN (blue), BROWSER (purple), LEADERBOARD (orange, shows current score). These sit **above** the Obama operator, as if they're part of his workstation.
4. **Workstation** — Obama (head on stick body) at a glowing desk. Blue hologram rings pulse behind him. Binary data streams fall in the background.
5. **Console readout** — monospace system status (SYS.STATUS, CLONES.ACTIVE/TOTAL, SYNTHETICS, RARES, MISSILES.LAUNCHED, SCORE, OPERATOR, CLEARANCE LEVEL 44)
6. **Footer** — "CLASSIFIED · LEVEL 44"

Background: `cloud.jpg` (ink cloud photo) with a light white overlay.

### Clone Screen (`clone.js`)

- Big pulsing circular button, **transparent red** (rgba red bg, red border, red icon/text).
- **Spammable.** Normal clones show an inline toast below the button that fades out — doesn't block input.
- **Red flash** on press.
- **Scrollable clone cards** — horizontal FlatList at the bottom showing all Obamas as mini stick-figure cards (newest first). Cards have colored borders: gold for rare, silver for synthetic, pink for Michelle.
- **Synthetic/Rare/Michelle overlay** — blocking overlay with spring animation. Cannot be dismissed by tapping background. Shows: tag (★ SYNTHETIC / ✦ RARE / ✦ MICHELLE), full stick figure with trait, name, ID, trait label. Two buttons: **SET AS HQ** (immediately sets as operator) and **ACKNOWLEDGE** (just dismisses).
- Sound effects: `riff.mp3` for rare, `synth.mp3` for Michelle, `synthetic.mp3` for synthetic.
- Score badge in header.

### Obama Island (`island.js` → `IslandCanvas.js` — Skia Canvas)

All Obamas live here. **Single Skia `<Canvas>`** with one game loop.

**Island shape:** Rounded organic mass — green grass surface, brown dirt bottom edge, subtle ocean glow behind it. Scattered trees (circle canopy + rect trunk).

**Obama sprites:** Head image (obama.png/michelle.png) on a stick figure body (line torso, angled line arms, angled line legs). Drawn as Skia `<Image>` + `<Line>` primitives.

**Trait rendering on island:**
- **Color variants** — limbs drawn in trait color (golden, ghost, neon_green, blue_tint, red_tint, purple, sepia, inverted)
- **Deformity variants** — huge/tiny/squished/stretched heads, long necks, missing arms, extra legs, thicc torsos
- **Hat variants** — gold circle indicator above head (gold for rare hats, silver for synthetic hats)

**Movement:** One `requestAnimationFrame` loop. Each Obama has a target position. They walk toward it, then pause, then pick a new target. Arms and legs sway as they walk. Subtle bob on idle.

**Features:**
- `ere.mp3` plays on entering the island.
- Tap an Obama to select → modal with rename, set as HQ operator, or release. Shows ✦ RARE / ★ SYNTHETIC / ✦ MICHELLE tags.
- **Ascend animation:** Released Obamas float upward and fade out, then are removed from state.
- "RELEASE ALL TO THE PHYSICAL WORLD" button removes all Obamas (they all ascend simultaneously).
- Obama counter badge at top.

**Joe Biden on Island:**
When unlocked, Biden appears on a small brown boat floating off the coast of the island. He's drawn as `joe-biden.png` head on a stick body standing on the boat, with a water wake behind it. A one-time "JOE BIDEN HAS ARRIVED" popup fires with a 🇺🇸 emoji and welcome message.

### Bomb Iran (`bomb.js` → `BombCanvas.js` — Skia Canvas)

**Single Skia `<Canvas>`** with a game loop driving missiles and explosions.

**Scene:** Daytime sky gradient, fluffy clouds, ocean below, island with grass/dirt, scattered trees.

**Missile Launcher:** Centered on island. Gray tube + base platform + support struts + red status light.

**Blue pulsing LAUNCH button** below the canvas. Each press fires 2–4 missiles upward in a spread pattern. Missiles have:
- Dark body + red nose cone + orange engine glow
- Trail particles (orange/yellow, fading)
- Explode at top of screen with expanding fireballs (three-layer: outer orange, middle yellow, inner white)

**Biden on bomb screen:** When unlocked, Biden stands next to the missile launcher as a stick figure with `joe-biden.png` head.

Missile counter badge in header. Tracks via `addMissiles()` in context.

### Web Browser (`browser.js`)

A real working browser. Uses `react-native-webview` on native, `<iframe>` on web. URL bar with monospace input + GO button. Defaults to Obama's Wikipedia page. Light chrome UI.

### Leaderboard (`leaderboard.js`)

**Player Card:**
- Editable player name (tap to edit, auto-capitalize, 20 char max)
- Total score (large monospace number)
- Score breakdown table showing each category with count × weight = points:
  - Clones × 2
  - Synthetics × 100
  - Rares × 500
  - Michelles × 5,000
  - Missiles × 1
  - Pages × 5
- SUBMIT SCORE button (turns green with ✓ after submission)

**Rankings Table:** Medal emojis for top 3. Player's own row highlighted blue. Shows name + score.

**Storage Info:** Shows current storage mode at bottom. Leaderboard is persisted in SQLite (`data/obama.db`) — shared across all clients, survives restarts.

## FEATURES

### Obama Tiers

Every browser page load (GO or link click) awards **5 pts**. Tracked as `pagesVisited` in context.

| Tier | Chance | Sound | Overlay | Score |
|------|--------|-------|---------|-------|
| Normal | ~91% | — | Inline toast (auto-dismiss) | 2 pts |
| Synthetic | 8% | `synthetic.mp3` | Silver blocking overlay | 100 pts |
| Rare | 1% | `riff.mp3` | Gold blocking overlay | 500 pts |
| Michelle | 0.1% | `synth.mp3` | Pink blocking overlay | 5,000 pts |

### Rare Traits (1% — 9 total, all needed for Biden)
- **Hats:** 🎩 👑 🥳 🤠
- **Deformities:** huge_head, tiny_head, sideways
- **Colors:** golden, ghost

### Synthetic Traits (8%)
- **Hats:** 🪖 🎓 🧢 ⛑️ 🎀 🪿 🐸 🦅
- **Deformities:** long_neck, no_arms, extra_legs, thicc, squished, stretched, backwards, wobble, big_feet, noodle_arms
- **Colors:** neon_green, blue_tint, red_tint, purple, sepia, inverted

### Joe Biden Unlock
**Requirements:**
1. Michelle Obama is set as HQ operator
2. All 9 rare traits have been collected (ever — they don't need to be active)

**Result:**
- Biden appears on a boat off the coast of Obama Island
- Biden stands next to the missile launcher on Bomb Iran screen
- One-time "JOE BIDEN HAS ARRIVED" popup with 🇺🇸

### Naming
Each clone gets a random first name: Barack, Barry, B-Rock, Baz, Obi, Baracko, Bam, Rock, B.O., Obeezy. Templates can set a `name_override` to force a specific name for clones of that type. Can be renamed from the island tap modal.

### HQ Operator
Set from the island tap modal or directly from the clone reveal overlay (SET AS HQ button). The operator appears at the HQ workstation desk wearing a suit (dark jacket with lapels and red tie).

### Release to Physical World
Individual or mass release. Obamas ascend upward and fade out. They're gone.

### Score & Leaderboard
Score = (clones × 2) + (pages × 5) + (synthetics × 100) + (rares × 500) + (michelles × 5,000) + (missiles × 1). Each browser navigation awards 5 pts. Rares dominate — a single rare is worth 250 clones or 500 missiles. Weights configurable in `config.js`.

### Sound Effects
- `ere.mp3` — plays when entering Obama Island
- `riff.mp3` — plays when a rare Obama is cloned
- `synth.mp3` — plays when a Michelle is cloned
- `synthetic.mp3` — plays when a synthetic Obama is cloned

## CONFIGURATION

`config.js` at project root:

```js
{
  SCORE_WEIGHTS: {
    MISSILE:    1,
    CLONE:      2,
    PAGE_VISIT: 5,
    SYNTHETIC:  100,
    RARE:       500,
    MICHELLE:   5000,
  },

  LEADERBOARD_MAX_ENTRIES: 50,
  PLAYER_NAME_DEFAULT: 'OPERATOR-44',
}
```

**Persistence:** All data lives in SQLite at `data/obama.db`. The service always routes through `/api/leaderboard`, falling back to in-memory if the server is unreachable (native/offline). Templates are polled every 3 seconds from `/api/templates` so admin changes are reflected live.

## DEPLOYMENT

### Local
```
npm run seed          # seed DB with default templates
npx expo start --web  # main app (port 8081)
npm run admin         # admin panel (port 3000)
npm run proxy         # reverse proxy (port 4000) — /admin/* → 3000, /* → 8082
```

### Container (Podman)
```
podman build -t obama-hq -f Containerfile .
podman run --rm -p 4000:4000 -v obama-data:/app/data \
  -e ADMIN_USER=admin -e ADMIN_PASS=<your-password> obama-hq
```

Single container runs all three services as non-root `appuser`. Named volume `obama-data` persists the SQLite DB and uploads. Admin creds **must** be set via `-e` flags (not baked into the image).

### Tunneling (cloudflared)
```
npm run tunnel
# or: cloudflared tunnel --url http://localhost:4000 --edge-ip-version 4
```
Creates a quick tunnel on `trycloudflare.com`. Single domain: `/` for the app, `/admin/` for the admin panel. No account required. Force IPv4 (`--edge-ip-version 4`) to avoid ISP/content-filter issues on IPv6.

### Native module loading
API routes use `createRequire(__filename)` to load `better-sqlite3` at runtime, bypassing Metro's bundler which can't handle native C++ addons.

### Security hardening
The app is designed to be publicly exposed via cloudflared tunnel:
- **Container**: runs as non-root `appuser`, no secrets baked into image layers
- **Proxy**: strips hop-by-hop headers, enforces 10MB body limit, injects `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on every response
- **Admin auth**: timing-safe comparison (`crypto.timingSafeEqual`), per-IP rate limiting (2s cooldown on failed attempts), credentials passed via env vars only
- **Uploads**: only UUID-named image files served (regex whitelist), `realpathSync` prevents symlink escape, SVG blocked (XSS vector), `nosniff` + restrictive CSP on static files
- **API routes**: input validation on leaderboard (name 50 chars, score bounded, stats 10KB), tier parameter whitelisted, error messages never leak internals

## ASSETS

All in `/assets/`:
- `obama.png` — 151×200 RGBA, Obama head cutout
- `michelle.png` — 314×314 RGBA, Michelle head cutout
- `joe-biden.png` — 1000×1000 RGBA, Biden head cutout
- `cloud.jpg` — voronoi mosaic with Arabic "Barack Obama" (background for HQ and cloner)
- `island.jpeg` — 429×524, island reference
- `ere.mp3` — "ere" sound for island entry
- `riff.mp3` — guitar riff for rare Obama reveals
- `synth.mp3` — soft synth for Michelle reveals
- `synthetic.mp3` — synth sound for synthetic Obama reveals

Uploaded assets (headshots, accessories) are stored in `data/uploads/` and served via `/api/uploads/:filename`.

## VIBES

- **Hyper-modern, minimalist. Steve Jobs.**
- **Light theme.** White/light gray backgrounds. Thin font weights. Wide letter-spacing. Frosted glass panels.
- System colors: red (cloner), green (island), blue (bomb/browser controls), orange (leaderboard), pink (Michelle), gold (rare), silver (synthetic).
- Transparent red on the clone button. Transparent blue on the bomb button.
- Obama's head on a stick figure body — everywhere.
- `cloud.jpg` as the atmospheric background (light overlaid).
- The whole thing should feel like a classified government facility that happens to clone Obamas.
- Joe Biden shows up on a boat when you've earned it.
- This is art.
