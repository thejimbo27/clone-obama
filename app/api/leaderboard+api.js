// Server-side leaderboard store.
// This module runs in the Metro/server process, NOT the browser.
// Scores are persisted to data/leaderboard.json so they survive server restarts.
// To use a real DB instead, set DB_CONNECTION_STRING in config.js.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const MAX_ENTRIES = 50;
const DATA_FILE = join(process.cwd(), 'data', 'leaderboard.json');

function loadFromDisk() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveToDisk(arr) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(arr));
  } catch (e) {
    console.warn('leaderboard: save failed:', e.message);
  }
}

const entries = loadFromDisk();

function upsert(entry) {
  const idx = entries.findIndex((e) => e.name === entry.name);
  if (idx >= 0) {
    if (entry.score > entries[idx].score) {
      entries[idx] = { ...entry, updatedAt: Date.now() };
    }
  } else {
    entries.push({ ...entry, createdAt: Date.now(), updatedAt: Date.now() });
  }
  entries.sort((a, b) => b.score - a.score);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  saveToDisk(entries);
}

function getAll() {
  return [...entries].sort((a, b) => b.score - a.score);
}

export function GET() {
  return Response.json({ entries: getAll() });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.score !== 'number') {
      return Response.json({ error: 'name and score required' }, { status: 400 });
    }
    upsert(body);
    return Response.json({ ok: true, entries: getAll() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
