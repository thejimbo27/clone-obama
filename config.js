// ─────────────────────────────────────────────────────
// OBAMA HQ — Configuration
// ─────────────────────────────────────────────────────

const config = {
  SCORE_WEIGHTS: {
    MISSILE:    1,     // per missile launched
    CLONE:      2,     // per obama cloned (any type)
    PAGE_VISIT: 5,     // per browser navigation
    SYNTHETIC:  100,   // per synthetic obama obtained
    RARE:       500,   // per rare obama obtained
    MICHELLE:   5000,  // per michelle obtained
  },

  // Leaderboard
  LEADERBOARD_MAX_ENTRIES: 50,
  PLAYER_NAME_DEFAULT: 'OPERATOR-44',
};

export default config;
