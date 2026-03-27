// Server-side API for accessories.
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

export function GET() {
  try {
    const db = getDb();
    const accessories = db.prepare('SELECT * FROM accessories ORDER BY name').all();
    return Response.json({ accessories });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
