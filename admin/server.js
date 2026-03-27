import express from 'express';
import multer from 'multer';
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { join, dirname, extname } from 'path';
import { fileURLToPath, URL } from 'url';
import { existsSync, unlinkSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_PATH = join(ROOT, 'data', 'obama.db');
const UPLOAD_DIR = join(ROOT, 'data', 'uploads');

// Ensure dirs exist
mkdirSync(join(ROOT, 'data'), { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── DB ──────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Init schema (inline — mirrors db/schema.js so admin is self-contained)
db.exec(`
  CREATE TABLE IF NOT EXISTS obama_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'normal'
      CHECK(tier IN ('normal', 'synthetic', 'rare', 'michelle')),
    rarity_weight REAL NOT NULL DEFAULT 1.0,
    headshot TEXT DEFAULT NULL,
    torso_length REAL NOT NULL DEFAULT 1.0,
    arm_count INTEGER NOT NULL DEFAULT 2,
    leg_count INTEGER NOT NULL DEFAULT 2,
    arm_length REAL NOT NULL DEFAULT 1.0,
    leg_length REAL NOT NULL DEFAULT 1.0,
    body_color TEXT NOT NULL DEFAULT '#333333',
    rare_type TEXT DEFAULT NULL
      CHECK(rare_type IN (NULL, 'hat', 'deformity', 'color')),
    rare_trait TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS accessories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    attach_point TEXT NOT NULL DEFAULT 'head_top'
      CHECK(attach_point IN (
        'head_top', 'head_left', 'head_right',
        'torso_front', 'torso_back',
        'left_hand', 'right_hand',
        'left_foot', 'right_foot'
      )),
    offset_x REAL NOT NULL DEFAULT 0,
    offset_y REAL NOT NULL DEFAULT 0,
    scale REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS template_accessories (
    template_id TEXT NOT NULL REFERENCES obama_templates(id) ON DELETE CASCADE,
    accessory_id TEXT NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
    PRIMARY KEY (template_id, accessory_id)
  );
  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    score INTEGER NOT NULL DEFAULT 0,
    stats_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Express ─────────────────────────────────────────
const app = express();
const PORT = process.env.ADMIN_PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'obama44';

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// ─── Basic Auth ──────────────────────────────────────
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Obama Admin"');
    return res.status(401).send('Authentication required');
  }
  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="Obama Admin"');
    return res.status(401).send('Invalid credentials');
  }
  next();
});

// ─── Multer ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ─── Dashboard ───────────────────────────────────────
app.get('/', (req, res) => {
  const templates = db.prepare('SELECT * FROM obama_templates ORDER BY tier, name').all();
  const accessories = db.prepare('SELECT * FROM accessories ORDER BY name').all();
  const leaderboard = db.prepare('SELECT * FROM leaderboard ORDER BY score DESC LIMIT 20').all();
  const counts = {
    normal: templates.filter(t => t.tier === 'normal').length,
    synthetic: templates.filter(t => t.tier === 'synthetic').length,
    rare: templates.filter(t => t.tier === 'rare').length,
    michelle: templates.filter(t => t.tier === 'michelle').length,
  };
  res.render('dashboard', { templates, accessories, leaderboard, counts });
});

// ─── Templates CRUD ──────────────────────────────────
app.get('/templates', (req, res) => {
  const templates = db.prepare('SELECT * FROM obama_templates ORDER BY tier, name').all();
  res.render('templates', { templates });
});

app.get('/templates/new', (req, res) => {
  const accessories = db.prepare('SELECT * FROM accessories ORDER BY name').all();
  res.render('template-form', { template: null, accessories, attached: [] });
});

app.get('/templates/:id/edit', (req, res) => {
  const template = db.prepare('SELECT * FROM obama_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).send('Not found');
  const accessories = db.prepare('SELECT * FROM accessories ORDER BY name').all();
  const attached = db.prepare('SELECT accessory_id FROM template_accessories WHERE template_id = ?').all(req.params.id).map(r => r.accessory_id);
  res.render('template-form', { template, accessories, attached });
});

app.post('/templates', upload.single('headshot'), (req, res) => {
  const id = uuid();
  const b = req.body;
  db.prepare(`
    INSERT INTO obama_templates (id, name, tier, rarity_weight, headshot, torso_length, arm_count, leg_count, arm_length, leg_length, body_color, rare_type, rare_trait)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, b.name, b.tier, parseFloat(b.rarity_weight) || 1,
    req.file ? req.file.filename : (b.headshot || null),
    parseFloat(b.torso_length) || 1,
    parseInt(b.arm_count) || 2, parseInt(b.leg_count) || 2,
    parseFloat(b.arm_length) || 1, parseFloat(b.leg_length) || 1,
    b.body_color || '#333333',
    b.rare_type || null, b.rare_trait || null,
  );
  syncAccessories(id, b.accessories);
  res.redirect('/templates');
});

app.post('/templates/:id', upload.single('headshot'), (req, res) => {
  const b = req.body;
  const existing = db.prepare('SELECT headshot FROM obama_templates WHERE id = ?').get(req.params.id);
  let headshot = existing?.headshot || null;
  if (req.file) {
    // Delete old upload if it was a custom upload (not a bundled asset name)
    if (headshot && !['michelle.png', 'obama.png', 'joe-biden.png'].includes(headshot)) {
      const oldPath = join(UPLOAD_DIR, headshot);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
    headshot = req.file.filename;
  } else if (b.headshot !== undefined) {
    headshot = b.headshot || null;
  }

  db.prepare(`
    UPDATE obama_templates SET
      name = ?, tier = ?, rarity_weight = ?, headshot = ?,
      torso_length = ?, arm_count = ?, leg_count = ?,
      arm_length = ?, leg_length = ?, body_color = ?,
      rare_type = ?, rare_trait = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    b.name, b.tier, parseFloat(b.rarity_weight) || 1, headshot,
    parseFloat(b.torso_length) || 1,
    parseInt(b.arm_count) || 2, parseInt(b.leg_count) || 2,
    parseFloat(b.arm_length) || 1, parseFloat(b.leg_length) || 1,
    b.body_color || '#333333',
    b.rare_type || null, b.rare_trait || null,
    req.params.id,
  );
  syncAccessories(req.params.id, b.accessories);
  res.redirect('/templates');
});

app.post('/templates/:id/delete', (req, res) => {
  const t = db.prepare('SELECT headshot FROM obama_templates WHERE id = ?').get(req.params.id);
  if (t?.headshot && !['michelle.png', 'obama.png', 'joe-biden.png'].includes(t.headshot)) {
    const p = join(UPLOAD_DIR, t.headshot);
    if (existsSync(p)) unlinkSync(p);
  }
  db.prepare('DELETE FROM obama_templates WHERE id = ?').run(req.params.id);
  res.redirect('/templates');
});

function syncAccessories(templateId, accessoryIds) {
  db.prepare('DELETE FROM template_accessories WHERE template_id = ?').run(templateId);
  if (!accessoryIds) return;
  const ids = Array.isArray(accessoryIds) ? accessoryIds : [accessoryIds];
  const stmt = db.prepare('INSERT OR IGNORE INTO template_accessories (template_id, accessory_id) VALUES (?, ?)');
  for (const aid of ids) {
    if (aid) stmt.run(templateId, aid);
  }
}

// ─── Accessories CRUD ────────────────────────────────
app.get('/accessories', (req, res) => {
  const accessories = db.prepare('SELECT * FROM accessories ORDER BY name').all();
  res.render('accessories', { accessories });
});

app.get('/accessories/new', (req, res) => {
  res.render('accessory-form', { accessory: null });
});

app.get('/accessories/:id/edit', (req, res) => {
  const accessory = db.prepare('SELECT * FROM accessories WHERE id = ?').get(req.params.id);
  if (!accessory) return res.status(404).send('Not found');
  res.render('accessory-form', { accessory });
});

app.post('/accessories', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('Image required');
  const id = uuid();
  const b = req.body;
  db.prepare(`
    INSERT INTO accessories (id, name, image, attach_point, offset_x, offset_y, scale)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, b.name, req.file.filename, b.attach_point || 'head_top',
    parseFloat(b.offset_x) || 0, parseFloat(b.offset_y) || 0,
    parseFloat(b.scale) || 1,
  );
  res.redirect('/accessories');
});

app.post('/accessories/:id', upload.single('image'), (req, res) => {
  const b = req.body;
  const existing = db.prepare('SELECT image FROM accessories WHERE id = ?').get(req.params.id);
  let image = existing?.image;
  if (req.file) {
    if (image) {
      const oldPath = join(UPLOAD_DIR, image);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
    image = req.file.filename;
  }
  db.prepare(`
    UPDATE accessories SET name = ?, image = ?, attach_point = ?, offset_x = ?, offset_y = ?, scale = ?
    WHERE id = ?
  `).run(
    b.name, image, b.attach_point || 'head_top',
    parseFloat(b.offset_x) || 0, parseFloat(b.offset_y) || 0,
    parseFloat(b.scale) || 1,
    req.params.id,
  );
  res.redirect('/accessories');
});

app.post('/accessories/:id/delete', (req, res) => {
  const a = db.prepare('SELECT image FROM accessories WHERE id = ?').get(req.params.id);
  if (a?.image) {
    const p = join(UPLOAD_DIR, a.image);
    if (existsSync(p)) unlinkSync(p);
  }
  db.prepare('DELETE FROM accessories WHERE id = ?').run(req.params.id);
  res.redirect('/accessories');
});

// ─── Start ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  OBAMA ADMIN PANEL`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Auth: ${ADMIN_USER} / ${ADMIN_PASS}\n`);
});
