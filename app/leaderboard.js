import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Dimensions, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';
import { getLeaderboard, submitScore } from '../services/leaderboard';
import config from '../config';

const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';
const W = config.SCORE_WEIGHTS;

export default function LeaderboardScreen() {
  const router = useRouter();
  const { stats, score, playerName, setPlayerName } = useObamas();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard();
      setEntries(data);
    } catch (e) {
      console.warn('Leaderboard load failed:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadBoard(); }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await submitScore({ name: playerName, score, stats });
      setSubmitted(true);
      await loadBoard();
    } catch (e) {
      console.warn('Submit failed:', e);
    }
  }, [playerName, score, stats, loadBoard]);

  const handleNameSave = useCallback(() => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim().toUpperCase());
    }
    setEditingName(false);
  }, [nameInput, setPlayerName]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ HQ</Text>
        </Pressable>
        <Text style={styles.headerTitle}>LEADERBOARD</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Player Card */}
        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  onSubmitEditing={handleNameSave}
                  autoFocus
                  autoCapitalize="characters"
                  maxLength={20}
                />
                <Pressable onPress={handleNameSave} style={styles.nameSaveBtn}>
                  <Text style={styles.nameSaveText}>OK</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => { setNameInput(playerName); setEditingName(true); }}>
                <Text style={styles.playerName}>{playerName} ✎</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.totalScore}>{score.toLocaleString()}</Text>
          <Text style={styles.totalLabel}>TOTAL SCORE</Text>

          {/* Breakdown */}
          <View style={styles.breakdown}>
            <BreakdownRow label="Clones" count={stats.clones} weight={W.CLONE} pts={stats.clones * W.CLONE} />
            <BreakdownRow label="Specialties" count={stats.specialties} weight={W.SPECIALTY} pts={stats.specialties * W.SPECIALTY} color="#6b7b8d" />
            <BreakdownRow label="Rares" count={stats.rares} weight={W.RARE} pts={stats.rares * W.RARE} color="#b8860b" />
            <BreakdownRow label="Michelles" count={stats.michelles} weight={W.MICHELLE} pts={stats.michelles * W.MICHELLE} color="#ff69b4" />
            <BreakdownRow label="Missiles" count={stats.missiles} weight={W.MISSILE} pts={stats.missiles * W.MISSILE} color="#007aff" />
          </View>

          <Pressable
            onPress={handleSubmit}
            style={[styles.submitBtn, submitted && styles.submittedBtn]}
          >
            <Text style={[styles.submitText, submitted && styles.submittedText]}>
              {submitted ? 'SUBMITTED ✓' : 'SUBMIT SCORE'}
            </Text>
          </Pressable>
        </View>

        {/* Rankings */}
        <Text style={styles.rankingsTitle}>RANKINGS</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#007aff" style={{ marginTop: 20 }} />
        ) : entries.length === 0 ? (
          <Text style={styles.emptyText}>No scores yet. Be the first.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 36 }]}>#</Text>
              <Text style={[styles.th, { flex: 1 }]}>NAME</Text>
              <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>SCORE</Text>
            </View>
            {entries.map((entry, i) => {
              const isMe = entry.name === playerName;
              return (
                <View
                  key={entry.name + i}
                  style={[styles.tableRow, isMe && styles.tableRowMe]}
                >
                  <Text style={[styles.td, styles.tdRank, { width: 36 }]}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </Text>
                  <Text style={[styles.td, { flex: 1 }, isMe && styles.tdMe]} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={[styles.td, styles.tdScore, { width: 80, textAlign: 'right' }, isMe && styles.tdMe]}>
                    {entry.score.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* DB info */}
        <View style={styles.dbInfo}>
          <Text style={styles.dbLabel}>
            {config.DB_CONNECTION_STRING
              ? `DB: ${config.DB_CONNECTION_STRING.split('@')[1]?.split('/')[0] || 'connected'}`
              : 'STORAGE: IN-MEMORY'}
          </Text>
          <Text style={styles.dbHint}>Configure DB_CONNECTION_STRING in config.js to persist</Text>
        </View>

      </ScrollView>
    </View>
  );
}

function BreakdownRow({ label, count, weight, pts, color }) {
  return (
    <View style={styles.bRow}>
      <Text style={[styles.bLabel, color && { color }]}>{label}</Text>
      <Text style={styles.bCalc}>{count} × {weight}</Text>
      <Text style={[styles.bPts, color && { color }]}>{pts.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 60 },
  backText: { color: '#007aff', fontSize: 15, fontWeight: '400', letterSpacing: 1 },
  headerTitle: { fontSize: 12, color: 'rgba(0,0,0,0.35)', letterSpacing: 6, fontWeight: '300' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Player card
  playerCard: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    padding: 24, alignItems: 'center', marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 4,
  },
  playerHeader: { marginBottom: 12, minHeight: 32 },
  playerName: {
    fontSize: 14, fontWeight: '600', color: '#1a1a1a',
    letterSpacing: 4, textAlign: 'center',
  },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, fontSize: 14,
    fontFamily: MONO, letterSpacing: 2, color: '#1a1a1a',
    width: 180, textAlign: 'center',
  },
  nameSaveBtn: {
    backgroundColor: 'rgba(0,122,255,0.08)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,122,255,0.15)',
  },
  nameSaveText: { color: '#007aff', fontSize: 12, fontWeight: '600' },
  totalScore: { fontSize: 48, fontWeight: '100', color: '#1a1a1a', fontFamily: MONO },
  totalLabel: { fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: 5, marginTop: 4 },

  // Breakdown
  breakdown: {
    width: '100%', marginTop: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)',
    paddingTop: 16,
  },
  bRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
  },
  bLabel: { flex: 1, fontSize: 12, color: 'rgba(0,0,0,0.5)', letterSpacing: 1 },
  bCalc: { fontSize: 11, color: 'rgba(0,0,0,0.2)', fontFamily: MONO, marginRight: 12 },
  bPts: { fontSize: 13, fontWeight: '500', color: '#1a1a1a', fontFamily: MONO, width: 60, textAlign: 'right' },

  // Submit
  submitBtn: {
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 12, backgroundColor: 'rgba(0,122,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,122,255,0.15)',
  },
  submittedBtn: {
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderColor: 'rgba(52,199,89,0.2)',
  },
  submitText: { fontSize: 11, color: '#007aff', letterSpacing: 3, fontWeight: '600' },
  submittedText: { color: '#34c759' },

  // Rankings
  rankingsTitle: {
    fontSize: 10, color: 'rgba(0,0,0,0.3)', letterSpacing: 6,
    marginTop: 32, marginBottom: 12, textAlign: 'center',
  },
  emptyText: {
    fontSize: 12, color: 'rgba(0,0,0,0.2)', textAlign: 'center', marginTop: 20,
  },

  // Table
  table: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  th: { fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: 3, fontWeight: '500' },
  tableRow: {
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  tableRowMe: { backgroundColor: 'rgba(0,122,255,0.04)' },
  td: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  tdRank: { fontFamily: MONO },
  tdScore: { fontFamily: MONO, fontWeight: '500' },
  tdMe: { color: '#007aff', fontWeight: '600' },

  // DB info
  dbInfo: {
    marginTop: 24, alignItems: 'center', paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)',
  },
  dbLabel: { fontSize: 9, color: 'rgba(0,0,0,0.2)', fontFamily: MONO, letterSpacing: 2 },
  dbHint: { fontSize: 9, color: 'rgba(0,0,0,0.1)', marginTop: 4, letterSpacing: 1 },
});
