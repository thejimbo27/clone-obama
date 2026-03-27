// ─────────────────────────────────────────────────────
// OBAMA HQ — Configuration
// ─────────────────────────────────────────────────────
//
// DB_CONNECTION_STRING:
//   When set to null (default), the app uses a module-level
//   singleton store. Data persists across screen navigation
//   but resets on full page reload.
//
//   To persist permanently, set this to your database connection
//   string, set "output": "server" in app.json's web config,
//   and implement the adapter in app/api/leaderboard+api.js.
//
//   Supported formats:
//     PostgreSQL:  postgresql://user:pass@host:5432/obamadb
//     MySQL:       mysql://user:pass@host:3306/obamadb
//     MongoDB:     mongodb+srv://user:pass@cluster.mongodb.net/obamadb
//
// SCORE_WEIGHTS:
//   Tweak how the leaderboard score is calculated.
//

const config = {
  DB_CONNECTION_STRING: null, // e.g. 'postgresql://obama:classified@localhost:5432/obamadb'

  SCORE_WEIGHTS: {
    MISSILE:    1,     // per missile launched
    CLONE:      2,     // per obama cloned (any type)
    PAGE_VISIT: 5,     // per browser navigation
    SPECIALTY:  100,   // per specialty obama obtained
    RARE:       500,   // per rare obama obtained
    MICHELLE:   5000,  // per michelle obtained
  },

  // Leaderboard
  LEADERBOARD_MAX_ENTRIES: 50,
  PLAYER_NAME_DEFAULT: 'OPERATOR-44',
};

export default config;
