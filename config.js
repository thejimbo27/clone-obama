// ─────────────────────────────────────────────────────
// OBAMA HQ — Configuration
// ─────────────────────────────────────────────────────
//
// DB_CONNECTION_STRING:
//   Set this to your database connection string.
//   Supported formats:
//     PostgreSQL:  postgresql://user:pass@host:5432/obamadb
//     MySQL:       mysql://user:pass@host:3306/obamadb
//     MongoDB:     mongodb+srv://user:pass@cluster.mongodb.net/obamadb
//
//   When set to null, the app uses in-memory storage (data resets on reload).
//   To persist across sessions, point this at a running database
//   and implement the corresponding adapter in services/leaderboard.js.
//
// SCORE_WEIGHTS:
//   Tweak how the leaderboard score is calculated.
//

const config = {
  DB_CONNECTION_STRING: null, // e.g. 'postgresql://obama:classified@localhost:5432/obamadb'

  SCORE_WEIGHTS: {
    MISSILE:   1,     // per missile launched
    CLONE:     2,     // per obama cloned (any type)
    SPECIALTY: 100,   // per specialty obama obtained
    RARE:      500,   // per rare obama obtained
    MICHELLE:  5000,  // per michelle obtained
  },

  // Leaderboard
  LEADERBOARD_MAX_ENTRIES: 50,
  PLAYER_NAME_DEFAULT: 'OPERATOR-44',
};

export default config;
