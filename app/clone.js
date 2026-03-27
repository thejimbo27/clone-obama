import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ImageBackground, Image, Dimensions, Platform,
} from 'react-native';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';
import { Audio } from 'expo-av';

const { width: W } = Dimensions.get('window');
const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

const TRAIT_LABELS = {
  hat: 'HAT VARIANT',
  deformity: 'MUTATION',
  color: 'CHROMATIC',
};

function StickFigureClone({ obama, size = 140 }) {
  const headSize = size * 0.32;
  const isMichelle = obama.isMichelle;
  const trait = obama.rareTrait;
  const type = obama.rareType;

  // Color variants
  const colorMap = {
    golden: '#b8860b', ghost: 'rgba(0,0,0,0.12)',
    neon_green: '#39ff14', blue_tint: '#4488ff', red_tint: '#ff4444',
    purple: '#9b59b6', sepia: '#8B7355', inverted: '#fff',
  };
  const limbColor = (type === 'color' && colorMap[trait]) ? colorMap[trait] : '#333';
  const headOpacity = (trait === 'ghost') ? 0.3 : (trait === 'inverted') ? 0.7 : 1;

  // Deformity head sizing
  const headScales = { huge_head: 1.6, tiny_head: 0.5, squished: 0.7, stretched: 1.3 };
  const hScale = headScales[trait] || 1;
  const finalHS = headSize * hScale;

  // Deformity transforms
  const headTransform = [];
  if (trait === 'sideways') headTransform.push({ rotate: '90deg' });
  if (trait === 'backwards') headTransform.push({ rotate: '180deg' });

  // Body modifiers
  const neckLen = trait === 'long_neck' ? size * 0.15 : 0;
  const showArms = trait !== 'no_arms';
  const legCount = trait === 'extra_legs' ? 4 : 2;
  const bodyWidth = trait === 'thicc' ? 3.5 : 2;
  const armLen = trait === 'noodle_arms' ? size * 0.35 : size * 0.2;

  return (
    <View style={{ alignItems: 'center', width: size, height: size * 1.5 }}>
      {type === 'hat' && (
        <Text style={{ fontSize: 28, marginBottom: -8, zIndex: 3 }}>{trait}</Text>
      )}
      <Image
        source={isMichelle ? require('../assets/michelle.png') : require('../assets/obama.png')}
        style={{
          width: finalHS, height: finalHS, borderRadius: finalHS / 2, zIndex: 2,
          opacity: headOpacity,
          transform: headTransform.length ? headTransform : undefined,
        }}
        resizeMode="cover"
      />
      {/* Neck extension */}
      {neckLen > 0 && <View style={{ width: bodyWidth, height: neckLen, backgroundColor: limbColor, marginTop: -2 }} />}
      <View style={{ alignItems: 'center', marginTop: neckLen > 0 ? -1 : -3 }}>
        <View style={{ width: bodyWidth, height: size * 0.25, backgroundColor: limbColor }} />
        {showArms && (
          <View style={{ position: 'absolute', top: 4 }}>
            <View style={{ width: 2, height: armLen, backgroundColor: limbColor, transform: [{ rotate: '40deg' }], position: 'absolute', left: -size * 0.13 }} />
            <View style={{ width: 2, height: armLen, backgroundColor: limbColor, transform: [{ rotate: '-40deg' }], position: 'absolute', right: -size * 0.13 }} />
          </View>
        )}
        <View style={{ flexDirection: 'row', marginTop: -1, gap: legCount > 2 ? 2 : 4 }}>
          {Array.from({ length: legCount }).map((_, i) => {
            const angle = legCount === 2
              ? (i === 0 ? '12deg' : '-12deg')
              : `${-18 + i * 12}deg`;
            return (
              <View key={i} style={{
                width: 2, height: size * 0.26, backgroundColor: limbColor,
                transform: [{ rotate: angle }],
              }} />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function CloneScreen() {
  const router = useRouter();
  const { addObama, totalCloned, obamas, score } = useObamas();
  const [specialClone, setSpecialClone] = useState(null); // rare/specialty/michelle
  const [lastClone, setLastClone] = useState(null);
  const [showFlash, setShowFlash] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const riffSound = useRef(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1400, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1400, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/riff.mp3'));
        riffSound.current = sound;
      } catch (e) {}
    })();
    return () => { riffSound.current?.unloadAsync(); };
  }, []);

  const handleClone = useCallback(() => {
    const obama = addObama();
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 100);

    if (obama.isRare || obama.isMichelle || obama.isSpecialty) {
      // Play riff for any special type
      riffSound.current?.setPositionAsync(0).then(() => riffSound.current?.playAsync());
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
  }, [addObama]);

  const dismissSpecial = useCallback(() => {
    Animated.timing(cardOpacity, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setSpecialClone(null);
    });
  }, []);

  // Tag color: michelle=pink, rare=gold, specialty=silver
  const tagColor = specialClone?.isMichelle ? '#ff69b4' : specialClone?.isRare ? '#b8860b' : '#6b7b8d';
  const tagText = specialClone?.isMichelle
    ? '✦ MICHELLE ✦'
    : specialClone?.isRare
      ? `✦ RARE · ${TRAIT_LABELS[specialClone?.rareType] || 'SPECIAL'} ✦`
      : `★ SPECIALTY · ${TRAIT_LABELS[specialClone?.rareType] || 'SPECIAL'} ★`;

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

      <View style={styles.counter}>
        <Text style={styles.counterNum}>{totalCloned}</Text>
        <Text style={styles.counterLabel}>CLONED ALL-TIME</Text>
      </View>
      <View style={styles.activeCount}>
        <Text style={styles.activeNum}>{obamas.length}</Text>
        <Text style={styles.activeLabel}>ACTIVE</Text>
      </View>

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
            <Text style={styles.toastText}>
              {lastClone.name} #{String(lastClone.id).padStart(4, '0')}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Special overlay (rare / specialty / michelle) */}
      {specialClone && (
        <Animated.View style={[styles.specialOverlay, { opacity: cardOpacity }]} pointerEvents="auto">
          <View style={styles.specialBlocker}>
            <Animated.View style={[styles.specialCard, { transform: [{ scale: cardScale }] }]}>
              <Text style={[styles.specialTag, { color: tagColor }]}>{tagText}</Text>
              <StickFigureClone obama={specialClone} size={120} />
              <Text style={[styles.specialName, specialClone.isMichelle && { color: '#ff69b4' }]}>
                {specialClone.name}
              </Text>
              <Text style={styles.specialId}>#{String(specialClone.id).padStart(4, '0')}</Text>
              {specialClone.rareTrait && !['hat'].includes(specialClone.rareType) && (
                <Text style={styles.traitLabel}>{String(specialClone.rareTrait).replace(/_/g, ' ').toUpperCase()}</Text>
              )}
              <Pressable onPress={dismissSpecial} style={[styles.ackBtn, { borderColor: tagColor + '44' }]}>
                <Text style={[styles.ackText, { color: tagColor }]}>ACKNOWLEDGE</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      )}

      <Text style={styles.footer}>CLASSIFIED · CLONING DIVISION</Text>
    </ImageBackground>
  );
}

const BTN_SIZE = 160;

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
  counter: { alignItems: 'center', marginTop: 40 },
  counterNum: { fontSize: 64, fontWeight: '100', color: '#ff3b30', fontFamily: MONO },
  counterLabel: { fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: 5, marginTop: 4 },
  activeCount: { alignItems: 'center', marginTop: 12 },
  activeNum: { fontSize: 20, fontWeight: '200', color: 'rgba(0,0,0,0.35)', fontFamily: MONO },
  activeLabel: { fontSize: 8, color: 'rgba(0,0,0,0.15)', letterSpacing: 4 },
  btnWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnGlow: {
    position: 'absolute', width: BTN_SIZE * 1.8, height: BTN_SIZE * 1.8,
    borderRadius: BTN_SIZE, backgroundColor: 'rgba(255,59,48,0.08)',
  },
  cloneBtn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,59,48,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  clonePlus: { fontSize: 48, fontWeight: '100', color: '#ff3b30', marginTop: -4 },
  cloneLabel: { fontSize: 10, color: '#ff3b30', letterSpacing: 5, fontWeight: '500', marginTop: -2 },
  toast: {
    position: 'absolute', bottom: -50,
    backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  toastText: { fontSize: 12, color: 'rgba(0,0,0,0.4)', fontFamily: MONO, letterSpacing: 1 },
  specialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200,
  },
  specialBlocker: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  specialCard: {
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    padding: 36, alignItems: 'center', minWidth: 240,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  specialTag: { fontSize: 10, letterSpacing: 4, marginBottom: 16, fontWeight: '600' },
  specialName: { fontSize: 22, fontWeight: '200', color: '#1a1a1a', letterSpacing: 4, marginTop: 16 },
  specialId: { fontSize: 11, color: 'rgba(0,0,0,0.2)', fontFamily: MONO, letterSpacing: 2, marginTop: 6 },
  traitLabel: { fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: 3, marginTop: 8 },
  ackBtn: {
    marginTop: 24, paddingVertical: 12, paddingHorizontal: 28,
    borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  ackText: { fontSize: 11, letterSpacing: 3, fontWeight: '500' },
  footer: {
    fontSize: 8, color: 'rgba(0,0,0,0.1)', letterSpacing: 5,
    textAlign: 'center', paddingBottom: 30,
  },
});
