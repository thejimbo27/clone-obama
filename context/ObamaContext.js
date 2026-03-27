import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { calculateScore } from '../services/leaderboard';
import config from '../config';

const NAMES = ['Barack', 'Barry', 'B-Rock', 'Baz', 'Obi', 'Baracko', 'Bam', 'Rock', 'B.O.', 'Obeezy'];

// ─── Hardcoded fallbacks (used when DB is unreachable) ──
const RARE_HATS = ['🎩', '👑', '🥳', '🤠'];
const RARE_DEFORMITIES = ['huge_head', 'tiny_head', 'sideways'];
const RARE_COLORS = ['golden', 'ghost'];
const ALL_RARE_TRAITS = [...RARE_HATS, ...RARE_DEFORMITIES, ...RARE_COLORS];

const SPEC_HATS = ['🪖', '🎓', '🧢', '⛑️', '🎀', '🪿', '🐸', '🦅'];
const SPEC_DEFORMITIES = [
  'long_neck', 'no_arms', 'extra_legs', 'thicc',
  'squished', 'stretched', 'backwards', 'wobble',
  'big_feet', 'noodle_arms',
];
const SPEC_COLORS = ['neon_green', 'blue_tint', 'red_tint', 'purple', 'sepia', 'inverted'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomName() { return pick(NAMES); }

let nextId = 2;

// ─── Weighted random pick from templates ─────────────
function weightedPick(templates) {
  const totalWeight = templates.reduce((s, t) => s + (t.rarity_weight || 1), 0);
  let r = Math.random() * totalWeight;
  for (const t of templates) {
    r -= (t.rarity_weight || 1);
    if (r <= 0) return t;
  }
  return templates[templates.length - 1];
}

// ─── Generate from DB templates ──────────────────────
function generateFromTemplates(templatesByTier) {
  const id = nextId++;
  const roll = Math.random();

  // Same tier probabilities as before: michelle 0.1%, rare 1%, synthetic 8%, normal ~91%
  let tier;
  if (roll < 0.001) tier = 'michelle';
  else if (roll < 0.011) tier = 'rare';
  else if (roll < 0.091) tier = 'synthetic';
  else tier = 'normal';

  const pool = templatesByTier[tier];
  if (!pool || pool.length === 0) {
    // Fallback to normal if tier pool is empty
    return { id, name: randomName(), isMichelle: false, isRare: false, isSynthetic: false, rareType: null, rareTrait: null, template: null };
  }

  const template = weightedPick(pool);

  return {
    id,
    name: tier === 'michelle' ? 'Michelle' : randomName(),
    isMichelle: tier === 'michelle',
    isRare: tier === 'rare',
    isSynthetic: tier === 'synthetic',
    rareType: template.rare_type || null,
    rareTrait: template.rare_trait || null,
    template: {
      id: template.id,
      headshot: template.headshot || null,
      torso_length: template.torso_length ?? 1,
      arm_count: template.arm_count ?? 2,
      leg_count: template.leg_count ?? 2,
      arm_length: template.arm_length ?? 1,
      leg_length: template.leg_length ?? 1,
      body_color: template.body_color || '#333333',
      accessories: template.accessories || [],
    },
  };
}

// ─── Hardcoded fallback generator ────────────────────
function generateFallback() {
  const id = nextId++;
  const roll = Math.random();

  if (roll < 0.001) {
    return { id, name: 'Michelle', isMichelle: true, isRare: false, isSynthetic: false, rareType: null, rareTrait: null, template: null };
  }
  if (roll < 0.011) {
    const t = Math.random();
    let rareType, rareTrait;
    if (t < 0.33) { rareType = 'hat'; rareTrait = pick(RARE_HATS); }
    else if (t < 0.66) { rareType = 'deformity'; rareTrait = pick(RARE_DEFORMITIES); }
    else { rareType = 'color'; rareTrait = pick(RARE_COLORS); }
    return { id, name: randomName(), isMichelle: false, isRare: true, isSynthetic: false, rareType, rareTrait, template: null };
  }
  if (roll < 0.091) {
    const t = Math.random();
    let rareType, rareTrait;
    if (t < 0.33) { rareType = 'hat'; rareTrait = pick(SPEC_HATS); }
    else if (t < 0.66) { rareType = 'deformity'; rareTrait = pick(SPEC_DEFORMITIES); }
    else { rareType = 'color'; rareTrait = pick(SPEC_COLORS); }
    return { id, name: randomName(), isMichelle: false, isRare: false, isSynthetic: true, rareType, rareTrait, template: null };
  }

  return { id, name: randomName(), isMichelle: false, isRare: false, isSynthetic: false, rareType: null, rareTrait: null, template: null };
}

const ObamaContext = createContext(null);

export function ObamaProvider({ children }) {
  const [obamas, setObamas] = useState([
    { id: 1, name: 'Barack', isMichelle: false, isRare: false, isSynthetic: false, rareType: null, rareTrait: null, template: null },
  ]);
  const [totalCloned, setTotalCloned] = useState(1);
  const [hqObamaId, setHqObamaId] = useState(1);
  const [missilesLaunched, setMissilesLaunched] = useState(0);
  const [pagesVisited, setPagesVisited] = useState(0);
  const [raresObtained, setRaresObtained] = useState(0);
  const [syntheticsObtained, setSyntheticsObtained] = useState(0);
  const [michellesObtained, setMichellesObtained] = useState(0);
  const [playerName, setPlayerName] = useState(config.PLAYER_NAME_DEFAULT);

  const [collectedRareTraits, setCollectedRareTraits] = useState(new Set());
  const [bidenPopupShown, setBidenPopupShown] = useState(false);

  // ─── Fetch templates from server ───────────────────
  const templatesRef = useRef(null); // { normal: [], synthetic: [], rare: [], michelle: [] }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const byTier = { normal: [], synthetic: [], rare: [], michelle: [] };
        for (const t of (data.templates || [])) {
          if (byTier[t.tier]) byTier[t.tier].push(t);
        }
        templatesRef.current = byTier;
      } catch (e) {
        console.warn('Failed to fetch templates, using hardcoded fallback:', e.message);
        templatesRef.current = null;
      }
    })();
  }, []);

  const addObama = useCallback(() => {
    const newObama = templatesRef.current
      ? generateFromTemplates(templatesRef.current)
      : generateFallback();

    setObamas((prev) => [...prev, newObama]);
    setTotalCloned((prev) => prev + 1);
    if (newObama.isMichelle) setMichellesObtained((n) => n + 1);
    else if (newObama.isRare) {
      setRaresObtained((n) => n + 1);
      if (newObama.rareTrait) {
        setCollectedRareTraits((prev) => new Set([...prev, newObama.rareTrait]));
      }
    }
    else if (newObama.isSynthetic) setSyntheticsObtained((n) => n + 1);
    return newObama;
  }, []);

  const addMissiles = useCallback((count) => {
    setMissilesLaunched((n) => n + count);
  }, []);

  const addPageVisit = useCallback(() => {
    setPagesVisited((n) => n + 1);
  }, []);

  const removeObama = useCallback(
    (id) => {
      setObamas((prev) => {
        const remaining = prev.filter((o) => o.id !== id);
        if (hqObamaId === id && remaining.length > 0) {
          setHqObamaId(remaining[0].id);
        }
        return remaining;
      });
    },
    [hqObamaId]
  );

  const removeAllObamas = useCallback(() => { setObamas([]); }, []);

  const renameObama = useCallback((id, name) => {
    setObamas((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));
  }, []);

  const setHqOperator = useCallback((id) => { setHqObamaId(id); }, []);

  const hqObama = obamas.find((o) => o.id === hqObamaId) || obamas[0] || null;

  const allRaresCollected = ALL_RARE_TRAITS.every((t) => collectedRareTraits.has(t));
  const joeBidenUnlocked = !!(hqObama?.isMichelle && allRaresCollected);

  const stats = useMemo(() => ({
    clones: totalCloned,
    rares: raresObtained,
    synthetics: syntheticsObtained,
    michelles: michellesObtained,
    missiles: missilesLaunched,
    pages: pagesVisited,
  }), [totalCloned, raresObtained, syntheticsObtained, michellesObtained, missilesLaunched, pagesVisited]);

  const score = useMemo(() => calculateScore(stats), [stats]);

  return (
    <ObamaContext.Provider
      value={{
        obamas, totalCloned, hqObama,
        missilesLaunched, pagesVisited, raresObtained, syntheticsObtained, michellesObtained,
        stats, score, playerName,
        collectedRareTraits, allRaresCollected, joeBidenUnlocked,
        bidenPopupShown, setBidenPopupShown,
        addObama, addMissiles, addPageVisit, removeObama, removeAllObamas,
        renameObama, setHqOperator, setPlayerName,
        ALL_RARE_TRAITS,
      }}
    >
      {children}
    </ObamaContext.Provider>
  );
}

export function useObamas() {
  const ctx = useContext(ObamaContext);
  if (!ctx) throw new Error('useObamas must be used within ObamaProvider');
  return ctx;
}
