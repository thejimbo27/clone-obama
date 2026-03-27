import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { calculateScore } from '../services/leaderboard';
import config from '../config';

const NAMES = ['Barack', 'Barry', 'B-Rock', 'Baz', 'Obi', 'Baracko', 'Bam', 'Rock', 'B.O.', 'Obeezy'];

// ─── Rare traits (1%) ────────────────────────────────
const RARE_HATS = ['🎩', '👑', '🥳', '🤠'];
const RARE_DEFORMITIES = ['huge_head', 'tiny_head', 'sideways'];
const RARE_COLORS = ['golden', 'ghost'];

// All 9 rare traits needed for Biden unlock
const ALL_RARE_TRAITS = [
  ...RARE_HATS, ...RARE_DEFORMITIES, ...RARE_COLORS,
];

// ─── Specialty traits (8%) ───────────────────────────
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

function generateObama() {
  const id = nextId++;
  const roll = Math.random();

  if (roll < 0.001) {
    return { id, name: 'Michelle', isMichelle: true, isRare: false, isSpecialty: false, rareType: null, rareTrait: null };
  }
  if (roll < 0.011) {
    const t = Math.random();
    let rareType, rareTrait;
    if (t < 0.33) { rareType = 'hat'; rareTrait = pick(RARE_HATS); }
    else if (t < 0.66) { rareType = 'deformity'; rareTrait = pick(RARE_DEFORMITIES); }
    else { rareType = 'color'; rareTrait = pick(RARE_COLORS); }
    return { id, name: randomName(), isMichelle: false, isRare: true, isSpecialty: false, rareType, rareTrait };
  }
  if (roll < 0.091) {
    const t = Math.random();
    let rareType, rareTrait;
    if (t < 0.33) { rareType = 'hat'; rareTrait = pick(SPEC_HATS); }
    else if (t < 0.66) { rareType = 'deformity'; rareTrait = pick(SPEC_DEFORMITIES); }
    else { rareType = 'color'; rareTrait = pick(SPEC_COLORS); }
    return { id, name: randomName(), isMichelle: false, isRare: false, isSpecialty: true, rareType, rareTrait };
  }

  return { id, name: randomName(), isMichelle: false, isRare: false, isSpecialty: false, rareType: null, rareTrait: null };
}

const ObamaContext = createContext(null);

export function ObamaProvider({ children }) {
  const [obamas, setObamas] = useState([
    { id: 1, name: 'Barack', isMichelle: false, isRare: false, isSpecialty: false, rareType: null, rareTrait: null },
  ]);
  const [totalCloned, setTotalCloned] = useState(1);
  const [hqObamaId, setHqObamaId] = useState(1);
  const [missilesLaunched, setMissilesLaunched] = useState(0);
  const [raresObtained, setRaresObtained] = useState(0);
  const [specialtiesObtained, setSpecialtiesObtained] = useState(0);
  const [michellesObtained, setMichellesObtained] = useState(0);
  const [playerName, setPlayerName] = useState(config.PLAYER_NAME_DEFAULT);

  // Track which rare traits have been collected (for Biden unlock)
  const [collectedRareTraits, setCollectedRareTraits] = useState(new Set());
  const [bidenPopupShown, setBidenPopupShown] = useState(false);

  const addObama = useCallback(() => {
    const newObama = generateObama();
    setObamas((prev) => [...prev, newObama]);
    setTotalCloned((prev) => prev + 1);
    if (newObama.isMichelle) setMichellesObtained((n) => n + 1);
    else if (newObama.isRare) {
      setRaresObtained((n) => n + 1);
      if (newObama.rareTrait) {
        setCollectedRareTraits((prev) => new Set([...prev, newObama.rareTrait]));
      }
    }
    else if (newObama.isSpecialty) setSpecialtiesObtained((n) => n + 1);
    return newObama;
  }, []);

  const addMissiles = useCallback((count) => {
    setMissilesLaunched((n) => n + count);
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

  // Biden unlock: Michelle is HQ + all 9 rare traits collected
  const allRaresCollected = ALL_RARE_TRAITS.every((t) => collectedRareTraits.has(t));
  const joeBidenUnlocked = !!(hqObama?.isMichelle && allRaresCollected);

  const stats = useMemo(() => ({
    clones: totalCloned,
    rares: raresObtained,
    specialties: specialtiesObtained,
    michelles: michellesObtained,
    missiles: missilesLaunched,
  }), [totalCloned, raresObtained, specialtiesObtained, michellesObtained, missilesLaunched]);

  const score = useMemo(() => calculateScore(stats), [stats]);

  return (
    <ObamaContext.Provider
      value={{
        obamas, totalCloned, hqObama,
        missilesLaunched, raresObtained, specialtiesObtained, michellesObtained,
        stats, score, playerName,
        collectedRareTraits, allRaresCollected, joeBidenUnlocked,
        bidenPopupShown, setBidenPopupShown,
        addObama, addMissiles, removeObama, removeAllObamas,
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
