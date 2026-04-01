// ─────────────────────────────────────────────────────
// Leaderboard Service
// ─────────────────────────────────────────────────────
// Routes through /api/leaderboard (SQLite-backed), falls back to
// module-level in-memory store if API is unreachable.

import config from '../config';

const MAX = config.LEADERBOARD_MAX_ENTRIES || 50;
const API_URL = '/api/leaderboard';

// ─── Module-level store (singleton, survives navigation) ──

const _entries = [];

function localUpsert(entry) {
  const idx = _entries.findIndex((e) => e.name === entry.name);
  if (idx >= 0) {
    if (entry.score > _entries[idx].score) {
      _entries[idx] = { ...entry, updatedAt: Date.now() };
    }
  } else {
    _entries.push({ ...entry, createdAt: Date.now(), updatedAt: Date.now() });
  }
  _entries.sort((a, b) => b.score - a.score);
  if (_entries.length > MAX) _entries.length = MAX;
}

function localGetAll() {
  return [..._entries];
}

// ─── API helpers ────────────────────────────────────

async function apiGet() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Not JSON');
  const data = await res.json();
  return data.entries || [];
}

async function apiPost(entry) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Not JSON');
  const data = await res.json();
  return data.entries || [];
}

// ─── Public API ─────────────────────────────────────

export async function getLeaderboard() {
  try { return await apiGet(); }
  catch { return localGetAll(); }
}

export async function submitScore(entry) {
  try { return await apiPost(entry); }
  catch {
    localUpsert(entry);
    return localGetAll();
  }
}

// ─── Score Calculator ───────────────────────────────

export function calculateScore(stats) {
  const w = config.SCORE_WEIGHTS;
  return (
    (stats.missiles || 0) * w.MISSILE +
    (stats.clones || 0) * w.CLONE +
    (stats.pages || 0) * w.PAGE_VISIT +
    (stats.synthetics || 0) * w.SYNTHETIC +
    (stats.rares || 0) * w.RARE +
    (stats.michelles || 0) * w.MICHELLE
  );
}
