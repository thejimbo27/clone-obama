// ─────────────────────────────────────────────────────
// Leaderboard Service
// ─────────────────────────────────────────────────────
// Abstraction layer over the leaderboard datastore.
// Default: in-memory (resets on reload).
// To persist: set DB_CONNECTION_STRING in config.js and
// implement the matching adapter below.
//
// Every adapter must implement:
//   getEntries()               → [{ name, score, stats }]
//   submitScore(entry)         → void
//   clearAll()                 → void
//
// entry shape:
//   { name: string, score: number, stats: { clones, rares, specialties, michelles, missiles } }

import config from '../config';

// ─── In-Memory Adapter ──────────────────────────────

class InMemoryAdapter {
  constructor() {
    this.entries = [];
  }

  async getEntries() {
    return [...this.entries].sort((a, b) => b.score - a.score).slice(0, config.LEADERBOARD_MAX_ENTRIES);
  }

  async submitScore(entry) {
    // Upsert by name
    const idx = this.entries.findIndex((e) => e.name === entry.name);
    if (idx >= 0) {
      // Only update if higher score
      if (entry.score > this.entries[idx].score) {
        this.entries[idx] = { ...entry, updatedAt: Date.now() };
      }
    } else {
      this.entries.push({ ...entry, createdAt: Date.now(), updatedAt: Date.now() });
    }
    // Trim
    this.entries.sort((a, b) => b.score - a.score);
    if (this.entries.length > config.LEADERBOARD_MAX_ENTRIES) {
      this.entries = this.entries.slice(0, config.LEADERBOARD_MAX_ENTRIES);
    }
  }

  async clearAll() {
    this.entries = [];
  }
}

// ─── PostgreSQL Adapter (stub) ──────────────────────
//
// To implement:
//   1. npm install pg
//   2. Fill in the methods below using the pg client
//   3. The connection string comes from config.DB_CONNECTION_STRING
//
// class PostgresAdapter {
//   constructor(connectionString) {
//     // const { Pool } = require('pg');
//     // this.pool = new Pool({ connectionString });
//   }
//   async getEntries() { /* SELECT * FROM leaderboard ORDER BY score DESC LIMIT $1 */ }
//   async submitScore(entry) { /* INSERT ... ON CONFLICT (name) DO UPDATE SET score = GREATEST(...) */ }
//   async clearAll() { /* TRUNCATE leaderboard */ }
// }

// ─── MySQL Adapter (stub) ───────────────────────────
//
// class MysqlAdapter {
//   constructor(connectionString) { /* mysql2 pool */ }
//   async getEntries() { /* SELECT ... ORDER BY score DESC */ }
//   async submitScore(entry) { /* INSERT ... ON DUPLICATE KEY UPDATE */ }
//   async clearAll() { /* TRUNCATE */ }
// }

// ─── MongoDB Adapter (stub) ─────────────────────────
//
// class MongoAdapter {
//   constructor(connectionString) { /* MongoClient.connect */ }
//   async getEntries() { /* db.collection('leaderboard').find().sort({score:-1}).limit() */ }
//   async submitScore(entry) { /* updateOne with upsert */ }
//   async clearAll() { /* deleteMany */ }
// }

// ─── Factory ────────────────────────────────────────

function createAdapter() {
  const cs = config.DB_CONNECTION_STRING;
  if (!cs) {
    return new InMemoryAdapter();
  }
  if (cs.startsWith('postgresql://') || cs.startsWith('postgres://')) {
    throw new Error(
      'PostgreSQL adapter not implemented. See services/leaderboard.js to add pg support.'
    );
  }
  if (cs.startsWith('mysql://')) {
    throw new Error(
      'MySQL adapter not implemented. See services/leaderboard.js to add mysql support.'
    );
  }
  if (cs.startsWith('mongodb')) {
    throw new Error(
      'MongoDB adapter not implemented. See services/leaderboard.js to add mongo support.'
    );
  }
  throw new Error(`Unknown DB_CONNECTION_STRING format: ${cs}`);
}

// Singleton
let _adapter = null;

function getAdapter() {
  if (!_adapter) {
    _adapter = createAdapter();
  }
  return _adapter;
}

// ─── Public API ─────────────────────────────────────

export async function getLeaderboard() {
  return getAdapter().getEntries();
}

export async function submitScore(entry) {
  return getAdapter().submitScore(entry);
}

export async function clearLeaderboard() {
  return getAdapter().clearAll();
}

// ─── Score Calculator ───────────────────────────────

export function calculateScore(stats) {
  const w = config.SCORE_WEIGHTS;
  return (
    (stats.missiles || 0) * w.MISSILE +
    (stats.clones || 0) * w.CLONE +
    (stats.specialties || 0) * w.SPECIALTY +
    (stats.rares || 0) * w.RARE +
    (stats.michelles || 0) * w.MICHELLE
  );
}
