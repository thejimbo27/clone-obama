// Client-side leaderboard service.
// Calls the server-side API route at /api/leaderboard.
// The in-memory store lives server-side (survives client refreshes).
import config from '../config';

const API_URL = '/api/leaderboard';

export async function getLeaderboard() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    return data.entries || [];
  } catch (e) {
    console.warn('Leaderboard fetch failed:', e);
    return [];
  }
}

export async function submitScore(entry) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const data = await res.json();
    return data.entries || [];
  } catch (e) {
    console.warn('Leaderboard submit failed:', e);
    return [];
  }
}

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
