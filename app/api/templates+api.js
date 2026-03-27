// Server-side API for obama templates.
// Uses createRequire to load native better-sqlite3, bypassing Metro's bundler.

import { join } from 'path';
import { mkdirSync } from 'fs';
import { createRequire } from 'module';

const nodeRequire = createRequire(__filename);
const Database = nodeRequire('better-sqlite3');

const DB_PATH = join(process.cwd(), 'data', 'obama.db');

let _db = null;
function getDb() {
  if (_db) return _db;
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

function getAllTemplates() {
  const db = getDb();
  const templates = db.prepare('SELECT * FROM obama_templates ORDER BY tier, name').all();

  const accStmt = db.prepare(`
    SELECT a.* FROM accessories a
    JOIN template_accessories ta ON ta.accessory_id = a.id
    WHERE ta.template_id = ?
  `);

  return templates.map(t => ({
    ...t,
    accessories: accStmt.all(t.id),
  }));
}

function getTemplatesByTier(tier) {
  const db = getDb();
  return db.prepare('SELECT * FROM obama_templates WHERE tier = ?').all(tier);
}

export function GET(request) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const tier = url.searchParams.get('tier');
    if (tier) {
      return Response.json({ templates: getTemplatesByTier(tier) });
    }
    return Response.json({ templates: getAllTemplates() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
