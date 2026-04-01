// ─────────────────────────────────────────────────────
// Shared SQLite schema — used by main app + admin panel
// ─────────────────────────────────────────────────────
// Uses createRequire to load better-sqlite3 at runtime,
// bypassing Metro's bundler (native addons can't be bundled).

import { createRequire } from 'module';
import { join } from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DB_PATH = join(process.cwd(), 'data', 'obama.db');

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
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
      name_override TEXT DEFAULT NULL,
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
}

export default getDb;
