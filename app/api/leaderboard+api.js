// Server-side leaderboard store — SQLite backed.
// Uses createRequire to load native better-sqlite3, bypassing Metro's bundler.

import { join } from 'path';
import { mkdirSync } from 'fs';
import { createRequire } from 'module';

const nodeRequire = createRequire(__filename);
const Database = nodeRequire('better-sqlite3');

const DB_PATH = join(process.cwd(), 'data', 'obama.db');
const MAX_ENTRIES = 50;

let _db = null;
function getDb() {
  if (_db) return _db;
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      score INTEGER NOT NULL DEFAULT 0,
      stats_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return _db;
}

function upsert(entry) {
  const db = getDb();
  const existing = db.prepare('SELECT id, score FROM leaderboard WHERE name = ?').get(entry.name);
  if (existing) {
    if (entry.score > existing.score) {
      db.prepare("UPDATE leaderboard SET score = ?, stats_json = ?, updated_at = datetime('now') WHERE id = ?")
        .run(entry.score, JSON.stringify(entry.stats || {}), existing.id);
    }
  } else {
    db.prepare('INSERT INTO leaderboard (name, score, stats_json) VALUES (?, ?, ?)')
      .run(entry.name, entry.score, JSON.stringify(entry.stats || {}));
  }
}

function getAll() {
  const db = getDb();
  const rows = db.prepare('SELECT name, score, stats_json, created_at, updated_at FROM leaderboard ORDER BY score DESC LIMIT ?').all(MAX_ENTRIES);
  return rows.map(r => ({
    name: r.name,
    score: r.score,
    stats: JSON.parse(r.stats_json || '{}'),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function GET() {
  try {
    return Response.json({ entries: getAll() });
  } catch (e) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.score !== 'number') {
      return Response.json({ error: 'name and score required' }, { status: 400 });
    }
    // Input validation
    const name = String(body.name).slice(0, 50).trim();
    if (!name) return Response.json({ error: 'name required' }, { status: 400 });
    const score = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(body.score)));
    const stats = body.stats && typeof body.stats === 'object' ? body.stats : {};
    const statsStr = JSON.stringify(stats);
    if (statsStr.length > 10000) {
      return Response.json({ error: 'stats too large' }, { status: 400 });
    }
    upsert({ name, score, stats });
    return Response.json({ ok: true, entries: getAll() });
  } catch (e) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
