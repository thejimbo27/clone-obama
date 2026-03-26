import React, { createContext, useContext, useState, useCallback } from 'react';

const NAMES = ['Barack', 'Barry', 'B-Rock', 'Baz', 'Obi', 'Baracko', 'Bam', 'Rock', 'B.O.', 'Obeezy'];
const HATS = ['🎩', '👑', '🥳', '🤠'];
const DEFORMITIES = ['huge_head', 'tiny_head', 'sideways'];
const COLORS = ['golden', 'ghost'];

function randomName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

let nextId = 2;

function generateObama() {
  const id = nextId++;
  const roll = Math.random();
  const isMichelle = roll < 0.001;
  const isRare = !isMichelle && roll < 0.011;

  let rareTrait = null;
  let rareType = null;

  if (isRare) {
    const typeRoll = Math.random();
    if (typeRoll < 0.33) {
      rareType = 'hat';
      rareTrait = HATS[Math.floor(Math.random() * HATS.length)];
    } else if (typeRoll < 0.66) {
      rareType = 'deformity';
      rareTrait = DEFORMITIES[Math.floor(Math.random() * DEFORMITIES.length)];
    } else {
      rareType = 'color';
      rareTrait = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
  }

  return {
    id,
    name: isMichelle ? 'Michelle' : randomName(),
    isMichelle,
    isRare,
    rareType,
    rareTrait,
  };
}

const ObamaContext = createContext(null);

export function ObamaProvider({ children }) {
  const [obamas, setObamas] = useState([
    { id: 1, name: 'Barack', isMichelle: false, isRare: false, rareType: null, rareTrait: null },
  ]);
  const [totalCloned, setTotalCloned] = useState(1);
  const [hqObamaId, setHqObamaId] = useState(1);

  const addObama = useCallback(() => {
    const newObama = generateObama();
    setObamas((prev) => [...prev, newObama]);
    setTotalCloned((prev) => prev + 1);
    return newObama;
  }, []);

  const removeObama = useCallback(
    (id) => {
      setObamas((prev) => prev.filter((o) => o.id !== id));
      if (hqObamaId === id) {
        setObamas((curr) => {
          const remaining = curr.filter((o) => o.id !== id);
          if (remaining.length > 0) setHqObamaId(remaining[0].id);
          return remaining;
        });
      }
    },
    [hqObamaId]
  );

  const removeAllObamas = useCallback(() => {
    setObamas([]);
  }, []);

  const renameObama = useCallback((id, name) => {
    setObamas((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));
  }, []);

  const setHqOperator = useCallback((id) => {
    setHqObamaId(id);
  }, []);

  const hqObama = obamas.find((o) => o.id === hqObamaId) || obamas[0] || null;

  return (
    <ObamaContext.Provider
      value={{
        obamas,
        totalCloned,
        hqObama,
        addObama,
        removeObama,
        removeAllObamas,
        renameObama,
        setHqOperator,
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
