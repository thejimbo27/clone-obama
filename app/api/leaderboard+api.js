// Server-side in-memory leaderboard store.
// This module runs in the Metro/server process, NOT the browser.
// Data persists across client refreshes but resets when the server restarts.
// To persist permanently, swap this for a real DB adapter (see config.js).

const MAX_ENTRIES = 50;

// This array lives in server memory
const entries = [];

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
