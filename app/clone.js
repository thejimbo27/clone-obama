import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ImageBackground, Image,
  Dimensions, Platform, ScrollView, FlatList,
} from 'react-native';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';
import { Audio } from 'expo-av';

const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

const TRAIT_LABELS = { hat: 'HAT', deformity: 'MUTATION', color: 'CHROMATIC' };

const COLOR_MAP = {
  golden: '#b8860b', ghost: 'rgba(0,0,0,0.12)', neon_green: '#39ff14',
  blue_tint: '#4488ff', red_tint: '#ff4444', purple: '#9b59b6',
  sepia: '#8B7355', inverted: '#fff',
};

function getHeadSource(obama) {
  const t = obama.template;
  if (t?.headshot) return { uri: `/api/uploads/${t.headshot}` };
  return obama.isMichelle ? require('../assets/michelle.png') : require('../assets/obama.png');
}

function MiniStickFigure({ obama, size = 60 }) {
  const t = obama.template;
  const hs = size * 0.35;
  const headScales = { huge_head: 1.5, tiny_head: 0.5, squished: 0.7, stretched: 1.3 };
  const fhs = hs * (headScales[obama.rareTrait] || 1);
  const lc = t?.body_color || (obama.rareType === 'color' && COLOR_MAP[obama.rareTrait]) || '#333';
  const ho = obama.rareTrait === 'ghost' ? 0.3 : 1;
  const ht = [];
  if (obama.rareTrait === 'sideways') ht.push({ rotate: '90deg' });
  if (obama.rareTrait === 'backwards') ht.push({ rotate: '180deg' });
  const legCount = t?.leg_count ?? 2;

  return (
    <View style={{ alignItems: 'center', width: size, height: size * 1.3 }}>
      {obama.rareType === 'hat' && <Text style={{ fontSize: 14, marginBottom: -4 }}>{obama.rareTrait}</Text>}
      <Image
        source={getHeadSource(obama)}
        style={{ width: fhs, height: fhs, borderRadius: fhs / 2, opacity: ho, transform: ht.length ? ht : undefined }}
        resizeMode="cover"
      />
      <View style={{ alignItems: 'center', marginTop: -2 }}>
        <View style={{ width: 1.5, height: size * 0.22 * (t?.torso_length ?? 1), backgroundColor: lc }} />
        <View style={{ flexDirection: 'row', marginTop: -1 }}>
          {Array.from({ length: legCount }).map((_, i) => {
            const a = legCount === 2 ? (i === 0 ? '12deg' : '-12deg') : `${-18 + i * 12}deg`;
            return <View key={i} style={{ width: 1.5, height: size * 0.2 * (t?.leg_length ?? 1), backgroundColor: lc, transform: [{ rotate: a }], marginRight: i < legCount - 1 ? 3 : 0 }} />;
          })}
        </View>
      </View>
    </View>
  );
}

function AccessoryImage({ accessory, size }) {
  const s = size * (accessory.scale || 1) * 0.25;
  return (
    <Image
      source={{ uri: `/api/uploads/${accessory.image}` }}
      style={{ width: s, height: s, position: 'absolute' }}
      resizeMode="contain"
    />
  );
}

function BigStickFigure({ obama, size = 130 }) {
  const t = obama.template;
  const hs = size * 0.32;
  const headScales = { huge_head: 1.6, tiny_head: 0.5, squished: 0.7, stretched: 1.3 };
  const fhs = hs * (headScales[obama.rareTrait] || 1);
  const lc = t?.body_color || (obama.rareType === 'color' && COLOR_MAP[obama.rareTrait]) || '#333';
  const ho = obama.rareTrait === 'ghost' ? 0.3 : 1;
  const ht = [];
  if (obama.rareTrait === 'sideways') ht.push({ rotate: '90deg' });
  if (obama.rareTrait === 'backwards') ht.push({ rotate: '180deg' });
  const armCount = t?.arm_count ?? 2;
  const showArms = armCount > 0 && obama.rareTrait !== 'no_arms';
  const legCount = t?.leg_count ?? (obama.rareTrait === 'extra_legs' ? 4 : 2);
  const bw = obama.rareTrait === 'thicc' ? 3.5 : 2;
  const torsoMul = t?.torso_length ?? 1;
  const nk = obama.rareTrait === 'long_neck' ? size * 0.12 : (torsoMul > 1.2 ? size * 0.06 * (torsoMul - 1) : 0);
  const armMul = t?.arm_length ?? 1;
  const legMul = t?.leg_length ?? 1;
  const aLen = (obama.rareTrait === 'noodle_arms' ? size * 0.32 : size * 0.2) * armMul;
  const accessories = t?.accessories || [];

  return (
    <View style={{ alignItems: 'center', width: size, height: size * 1.45 }}>
      {obama.rareType === 'hat' && <Text style={{ fontSize: 26, marginBottom: -6, zIndex: 3 }}>{obama.rareTrait}</Text>}
      {accessories.filter(a => a.attach_point === 'head_top').map(a => (
        <View key={a.id} style={{ zIndex: 4, marginBottom: -4 }}>
          <AccessoryImage accessory={a} size={size} />
        </View>
      ))}
      <Image
        source={getHeadSource(obama)}
        style={{ width: fhs, height: fhs, borderRadius: fhs / 2, zIndex: 2, opacity: ho, transform: ht.length ? ht : undefined }}
        resizeMode="cover"
      />
      {nk > 0 && <View style={{ width: bw, height: nk, backgroundColor: lc, marginTop: -2 }} />}
      <View style={{ alignItems: 'center', marginTop: nk > 0 ? -1 : -3 }}>
        <View style={{ width: bw, height: size * 0.24 * torsoMul, backgroundColor: lc }} />
        {showArms && (
          <View style={{ position: 'absolute', top: 4 }}>
            {Array.from({ length: armCount }).map((_, i) => {
              const angle = armCount === 2
                ? (i === 0 ? '40deg' : '-40deg')
                : `${-50 + i * (100 / (armCount - 1))}deg`;
              const side = i < armCount / 2 ? { left: -size * 0.12 - i * 4 } : { right: -size * 0.12 - (armCount - 1 - i) * 4 };
              return <View key={i} style={{ width: 2, height: aLen, backgroundColor: lc, transform: [{ rotate: angle }], position: 'absolute', ...side }} />;
            })}
          </View>
        )}
        <View style={{ flexDirection: 'row', marginTop: -1, gap: legCount > 2 ? 2 : 4 }}>
          {Array.from({ length: legCount }).map((_, i) => {
            const a = legCount === 2 ? (i === 0 ? '12deg' : '-12deg') : `${-18 + i * (36 / (legCount - 1))}deg`;
            return <View key={i} style={{ width: 2, height: size * 0.24 * legMul, backgroundColor: lc, transform: [{ rotate: a }] }} />;
          })}
        </View>
      </View>
    </View>
  );
}

function ObamaCard({ obama }) {
  const border = obama.isMichelle ? '#ff69b4' : obama.isRare ? '#b8860b' : obama.isSynthetic ? '#6b7b8d' : 'rgba(0,0,0,0.06)';
  return (
    <View style={[cardStyles.card, { borderColor: border }]}>
      <MiniStickFigure obama={obama} size={50} />
      <Text style={cardStyles.name} numberOfLines={1}>{obama.name}</Text>
      <Text style={cardStyles.id}>#{String(obama.id).padStart(4, '0')}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    width: 80, paddingVertical: 10, paddingHorizontal: 4, marginRight: 8,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  name: { fontSize: 9, color: '#1a1a1a', letterSpacing: 1, marginTop: 4, fontWeight: '500' },
  id: { fontSize: 8, color: 'rgba(0,0,0,0.2)', fontFamily: MONO, marginTop: 2 },
});

export default function CloneScreen() {
  const router = useRouter();
  const { addObama, totalCloned, obamas, score, setHqOperator } = useObamas();
  const [specialClone, setSpecialClone] = useState(null);
  const [lastClone, setLastClone] = useState(null);
  const [showFlash, setShowFlash] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const riffSound = useRef(null);
  const synthSound = useRef(null);
  const syntheticSound = useRef(null);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.6, duration: 1400, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1400, useNativeDriver: false }),
    ])).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { sound: s1 } = await Audio.Sound.createAsync(require('../assets/riff.mp3'));
        riffSound.current = s1;
        const { sound: s2 } = await Audio.Sound.createAsync(require('../assets/synth.mp3'));
        synthSound.current = s2;
        const { sound: s3 } = await Audio.Sound.createAsync(require('../assets/synthetic.mp3'));
        syntheticSound.current = s3;
      } catch (e) {}
    })();
    return () => { riffSound.current?.unloadAsync(); synthSound.current?.unloadAsync(); syntheticSound.current?.unloadAsync(); };
  }, []);

  const playSound = useCallback((obama) => {
    const snd = obama.isMichelle ? synthSound.current
      : obama.isRare ? riffSound.current
      : syntheticSound.current;
    snd?.setPositionAsync(0).then(() => snd?.playAsync());
  }, []);

  const handleClone = useCallback(() => {
    const obama = addObama();
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 100);

    if (obama.isRare || obama.isMichelle || obama.isSynthetic) {
      playSound(obama);
      setSpecialClone(obama);
      cardOpacity.setValue(0);
      cardScale.setValue(0.8);
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: false }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      ]).start();
    } else {
      setLastClone(obama);
      toastAnim.setValue(1);
      Animated.timing(toastAnim, { toValue: 0, duration: 1500, delay: 400, useNativeDriver: false }).start();
    }
  }, [addObama, playSound]);

  const dismissSpecial = useCallback(() => {
    Animated.timing(cardOpacity, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setSpecialClone(null);
    });
  }, []);

  const handleSetHQ = useCallback(() => {
    if (specialClone) {
      setHqOperator(specialClone.id);
      dismissSpecial();
    }
  }, [specialClone, setHqOperator, dismissSpecial]);

  const tagColor = specialClone?.isMichelle ? '#ff69b4' : specialClone?.isRare ? '#b8860b' : '#6b7b8d';
  const tagText = specialClone?.isMichelle ? '✦ MICHELLE ✦'
    : specialClone?.isRare ? `✦ RARE · ${TRAIT_LABELS[specialClone?.rareType] || 'SPECIAL'} ✦`
    : `★ SYNTHETIC · ${TRAIT_LABELS[specialClone?.rareType] || 'SPECIAL'} ★`;

  return (
    <ImageBackground source={require('../assets/cloud.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      {showFlash && <View style={styles.flash} />}

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ HQ</Text>
        </Pressable>
        <Text style={styles.headerTitle}>CLONER</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      {/* Counters */}
      <View style={styles.counter}>
        <Text style={styles.counterNum}>{totalCloned}</Text>
        <Text style={styles.counterLabel}>CLONED ALL-TIME</Text>
      </View>

      {/* Clone Button */}
      <View style={styles.btnWrap}>
        <Animated.View style={[styles.btnGlow, { opacity: glowAnim }]} />
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable onPress={handleClone} style={styles.cloneBtn}>
            <Text style={styles.clonePlus}>+</Text>
            <Text style={styles.cloneLabel}>CLONE</Text>
          </Pressable>
        </Animated.View>
        {lastClone && (
          <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
            <Text style={styles.toastText}>{lastClone.name} #{String(lastClone.id).padStart(4, '0')}</Text>
          </Animated.View>
        )}
      </View>

      {/* Scrollable Obama Cards */}
      {obamas.length > 0 && (
        <View style={styles.cardsSection}>
          <Text style={styles.cardsLabel}>CLONES ({obamas.length})</Text>
          <FlatList
            data={[...obamas].reverse()}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <ObamaCard obama={item} />}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>
      )}

      {/* Special overlay */}
      {specialClone && (
        <Animated.View style={[styles.specialOverlay, { opacity: cardOpacity }]} pointerEvents="auto">
          <View style={styles.specialBlocker}>
            <Animated.View style={[styles.specialCard, { transform: [{ scale: cardScale }] }]}>
              <Text style={[styles.specialTag, { color: tagColor }]}>{tagText}</Text>
              <BigStickFigure obama={specialClone} size={120} />
              <Text style={[styles.specialName, specialClone.isMichelle && { color: '#ff69b4' }]}>
                {specialClone.name}
              </Text>
              <Text style={styles.specialId}>#{String(specialClone.id).padStart(4, '0')}</Text>
              {specialClone.rareTrait && specialClone.rareType !== 'hat' && (
                <Text style={styles.traitLabel}>{String(specialClone.rareTrait).replace(/_/g, ' ').toUpperCase()}</Text>
              )}
              <View style={styles.overlayBtns}>
                <Pressable onPress={handleSetHQ} style={[styles.hqBtn, { borderColor: tagColor + '44' }]}>
                  <Text style={[styles.hqBtnText, { color: tagColor }]}>SET AS HQ</Text>
                </Pressable>
                <Pressable onPress={dismissSpecial} style={[styles.ackBtn, { borderColor: tagColor + '44' }]}>
                  <Text style={[styles.ackText, { color: tagColor }]}>ACKNOWLEDGE</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      )}

      <Text style={styles.footer}>CLASSIFIED · CLONING DIVISION</Text>
    </ImageBackground>
  );
}

const BTN_SIZE = 140;

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f5f5f7' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245,245,247,0.88)' },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,59,48,0.15)', zIndex: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, zIndex: 10,
  },
  backBtn: { width: 60 },
  backText: { color: '#007aff', fontSize: 15, fontWeight: '400', letterSpacing: 1 },
  headerTitle: { fontSize: 12, color: 'rgba(0,0,0,0.35)', letterSpacing: 8, fontWeight: '300' },
  scoreBadge: {
    backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  scoreText: { fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: MONO, fontWeight: '500' },
  counter: { alignItems: 'center', marginTop: 24 },
  counterNum: { fontSize: 52, fontWeight: '100', color: '#ff3b30', fontFamily: MONO },
  counterLabel: { fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: 5, marginTop: 4 },
  btnWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnGlow: {
    position: 'absolute', width: BTN_SIZE * 1.8, height: BTN_SIZE * 1.8,
    borderRadius: BTN_SIZE, backgroundColor: 'rgba(255,59,48,0.08)',
  },
  cloneBtn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    backgroundColor: 'rgba(255,59,48,0.1)', borderWidth: 2, borderColor: 'rgba(255,59,48,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  clonePlus: { fontSize: 44, fontWeight: '100', color: '#ff3b30', marginTop: -4 },
  cloneLabel: { fontSize: 10, color: '#ff3b30', letterSpacing: 5, fontWeight: '500', marginTop: -2 },
  toast: {
    position: 'absolute', bottom: -45,
    backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  toastText: { fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: MONO, letterSpacing: 1 },
  cardsSection: { paddingBottom: 16 },
  cardsLabel: { fontSize: 9, color: 'rgba(0,0,0,0.2)', letterSpacing: 4, marginLeft: 20, marginBottom: 8 },
  specialOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200 },
  specialBlocker: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  specialCard: {
    backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    padding: 32, alignItems: 'center', minWidth: 240,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  specialTag: { fontSize: 10, letterSpacing: 4, marginBottom: 16, fontWeight: '600' },
  specialName: { fontSize: 22, fontWeight: '200', color: '#1a1a1a', letterSpacing: 4, marginTop: 16 },
  specialId: { fontSize: 11, color: 'rgba(0,0,0,0.2)', fontFamily: MONO, letterSpacing: 2, marginTop: 6 },
  traitLabel: { fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: 3, marginTop: 8 },
  overlayBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  hqBtn: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1,
  },
  hqBtnText: { fontSize: 11, letterSpacing: 3, fontWeight: '600' },
  ackBtn: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  ackText: { fontSize: 11, letterSpacing: 3, fontWeight: '500' },
  footer: {
    fontSize: 8, color: 'rgba(0,0,0,0.1)', letterSpacing: 5, textAlign: 'center', paddingBottom: 20,
  },
});
