// ─────────────────────────────────────────────────────
// Seed the DB with all current hardcoded obama templates
// Run: node --experimental-modules db/seed.js
// ─────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'obama.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema first
import('./schema.js').then(({ getDb }) => {
  const database = getDb();
  seed(database);
});

function seed(db) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM obama_templates').get();
  if (existing.c > 0) {
    console.log(`DB already has ${existing.c} templates — skipping seed.`);
    console.log('To re-seed, delete data/obama.db and run again.');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO obama_templates
      (id, name, tier, rarity_weight, headshot, torso_length, arm_count, leg_count, arm_length, leg_length, body_color, rare_type, rare_trait)
    VALUES
      (@id, @name, @tier, @rarity_weight, @headshot, @torso_length, @arm_count, @leg_count, @arm_length, @leg_length, @body_color, @rare_type, @rare_trait)
  `);

  const templates = [];

  // Normal obama (default)
  templates.push({
    id: uuid(), name: 'Obama', tier: 'normal', rarity_weight: 1,
    headshot: null, torso_length: 1, arm_count: 2, leg_count: 2,
    arm_length: 1, leg_length: 1, body_color: '#333333',
    rare_type: null, rare_trait: null,
  });

  // Michelle
  templates.push({
    id: uuid(), name: 'Michelle', tier: 'michelle', rarity_weight: 1,
    headshot: 'michelle.png', torso_length: 1, arm_count: 2, leg_count: 2,
    arm_length: 1, leg_length: 1, body_color: '#333333',
    rare_type: null, rare_trait: null,
  });

  // ─── Rare templates (9 total, needed for Biden) ───
  const RARE_HATS = ['🎩', '👑', '🥳', '🤠'];
  const RARE_DEFORMITIES = ['huge_head', 'tiny_head', 'sideways'];
  const RARE_COLORS = ['golden', 'ghost'];

  for (const hat of RARE_HATS) {
    templates.push({
      id: uuid(), name: `Rare ${hat}`, tier: 'rare', rarity_weight: 1,
      headshot: null, torso_length: 1, arm_count: 2, leg_count: 2,
      arm_length: 1, leg_length: 1, body_color: '#333333',
      rare_type: 'hat', rare_trait: hat,
    });
  }
  for (const d of RARE_DEFORMITIES) {
    const bodyParams = getDeformityParams(d);
    templates.push({
      id: uuid(), name: `Rare ${d.replace(/_/g, ' ')}`, tier: 'rare', rarity_weight: 1,
      headshot: null, rare_type: 'deformity', rare_trait: d, ...bodyParams,
    });
  }
  for (const c of RARE_COLORS) {
    const color = c === 'golden' ? '#ffd700' : 'rgba(200,200,255,0.4)';
    templates.push({
      id: uuid(), name: `Rare ${c}`, tier: 'rare', rarity_weight: 1,
      headshot: null, torso_length: 1, arm_count: 2, leg_count: 2,
      arm_length: 1, leg_length: 1, body_color: color,
      rare_type: 'color', rare_trait: c,
    });
  }

  // ─── Synthetic templates ───
  const SPEC_HATS = ['🪖', '🎓', '🧢', '⛑️', '🎀', '🪿', '🐸', '🦅'];
  const SPEC_DEFORMITIES = [
    'long_neck', 'no_arms', 'extra_legs', 'thicc',
    'squished', 'stretched', 'backwards', 'wobble',
    'big_feet', 'noodle_arms',
  ];
  const SPEC_COLORS = ['neon_green', 'blue_tint', 'red_tint', 'purple', 'sepia', 'inverted'];

  for (const hat of SPEC_HATS) {
    templates.push({
      id: uuid(), name: `Synthetic ${hat}`, tier: 'synthetic', rarity_weight: 1,
      headshot: null, torso_length: 1, arm_count: 2, leg_count: 2,
      arm_length: 1, leg_length: 1, body_color: '#333333',
      rare_type: 'hat', rare_trait: hat,
    });
  }
  for (const d of SPEC_DEFORMITIES) {
    const bodyParams = getDeformityParams(d);
    templates.push({
      id: uuid(), name: `Synthetic ${d.replace(/_/g, ' ')}`, tier: 'synthetic', rarity_weight: 1,
      headshot: null, rare_type: 'deformity', rare_trait: d, ...bodyParams,
    });
  }
  for (const c of SPEC_COLORS) {
    const colorMap = {
      neon_green: '#39ff14', blue_tint: '#4488ff', red_tint: '#ff4444',
      purple: '#9b59b6', sepia: '#8B7355', inverted: '#ffffff',
    };
    templates.push({
      id: uuid(), name: `Synthetic ${c.replace(/_/g, ' ')}`, tier: 'synthetic', rarity_weight: 1,
      headshot: null, torso_length: 1, arm_count: 2, leg_count: 2,
      arm_length: 1, leg_length: 1, body_color: colorMap[c] || '#333333',
      rare_type: 'color', rare_trait: c,
    });
  }

  const tx = db.transaction(() => {
    for (const t of templates) {
      insert.run(t);
    }
  });
  tx();

  console.log(`Seeded ${templates.length} obama templates.`);
}

function getDeformityParams(trait) {
  const base = { torso_length: 1, arm_count: 2, leg_count: 2, arm_length: 1, leg_length: 1, body_color: '#333333' };
  switch (trait) {
    case 'long_neck': return { ...base, torso_length: 1.4 };
    case 'no_arms': return { ...base, arm_count: 0 };
    case 'extra_legs': return { ...base, leg_count: 4 };
    case 'thicc': return { ...base, body_color: '#333333' }; // thicc handled by renderer
    case 'noodle_arms': return { ...base, arm_length: 1.6 };
    case 'big_feet': return { ...base, leg_length: 1.3 };
    default: return base;
  }
}
