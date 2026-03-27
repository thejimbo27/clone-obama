import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';
import { Audio } from 'expo-av';

const { width: W } = Dimensions.get('window');
const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

const RARE_LABELS = {
  hat: 'HAT VARIANT',
  deformity: 'MUTATION',
  color: 'CHROMATIC VARIANT',
};

function StickFigureClone({ obama, size = 140 }) {
  const headSize = size * 0.32;
  const isMichelle = obama.isMichelle;
  const isGolden = obama.rareType === 'color' && obama.rareTrait === 'golden';
  const isGhost = obama.rareType === 'color' && obama.rareTrait === 'ghost';
  const isHuge = obama.rareType === 'deformity' && obama.rareTrait === 'huge_head';
  const isTiny = obama.rareType === 'deformity' && obama.rareTrait === 'tiny_head';
  const isSideways = obama.rareType === 'deformity' && obama.rareTrait === 'sideways';
  const finalHeadSize = isHuge ? headSize * 1.6 : isTiny ? headSize * 0.55 : headSize;
  const limbColor = isGolden ? '#b8860b' : isGhost ? 'rgba(0,0,0,0.15)' : '#333';

  return (
    <View style={{ alignItems: 'center', width: size, height: size * 1.4 }}>
      {obama.rareType === 'hat' && (
        <Text style={{ fontSize: 28, marginBottom: -8, zIndex: 3 }}>{obama.rareTrait}</Text>
      )}
      <Image
        source={isMichelle ? require('../assets/michelle.png') : require('../assets/obama.png')}
        style={{
          width: finalHeadSize, height: finalHeadSize, borderRadius: finalHeadSize / 2, zIndex: 2,
          transform: isSideways ? [{ rotate: '90deg' }] : [],
          opacity: isGhost ? 0.35 : 1,
        }}
        resizeMode="cover"
      />
      <View style={{ alignItems: 'center', marginTop: -3 }}>
        <View style={{ width: 2, height: size * 0.25, backgroundColor: limbColor }} />
        <View style={{ position: 'absolute', top: 4 }}>
          <View style={{ width: 2, height: size * 0.2, backgroundColor: limbColor, transform: [{ rotate: '40deg' }], position: 'absolute', left: -size * 0.13 }} />
          <View style={{ width: 2, height: size * 0.2, backgroundColor: limbColor, transform: [{ rotate: '-40deg' }], position: 'absolute', right: -size * 0.13 }} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: -1 }}>
          <View style={{ width: 2, height: size * 0.26, backgroundColor: limbColor, transform: [{ rotate: '12deg' }], marginRight: 5 }} />
          <View style={{ width: 2, height: size * 0.26, backgroundColor: limbColor, transform: [{ rotate: '-12deg' }] }} />
        </View>
      </View>
    </View>
  );
}

export default function CloneScreen() {
  const router = useRouter();
  const { addObama, totalCloned, obamas } = useObamas();
  const [rareClone, setRareClone] = useState(null);        // only rare/michelle
  const [lastClone, setLastClone] = useState(null);         // most recent normal clone for toast
  const [showFlash, setShowFlash] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const rareScale = useRef(new Animated.Value(0.8)).current;
  const rareOpacity = useRef(new Animated.Value(0)).current;
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

    // Red flash
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 100);

    if (obama.isRare || obama.isMichelle) {
      // Rare: play riff, show blocking overlay
      riffSound.current?.setPositionAsync(0).then(() => riffSound.current?.playAsync());
      setRareClone(obama);
      rareOpacity.setValue(0);
      rareScale.setValue(0.8);
      Animated.parallel([
        Animated.spring(rareScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: false }),
        Animated.timing(rareOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      ]).start();
    } else {
      // Normal: quick inline toast, doesn't block button
      setLastClone(obama);
      toastAnim.setValue(1);
      Animated.timing(toastAnim, { toValue: 0, duration: 1500, delay: 400, useNativeDriver: false }).start();
    }
  }, [addObama]);

  const dismissRare = useCallback(() => {
    Animated.timing(rareOpacity, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      setRareClone(null);
    });
  }, []);

  return (
    <ImageBackground source={require('../assets/cloud.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      {showFlash && <View style={styles.flash} />}

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ HQ</Text>
        </Pressable>
        <Text style={styles.headerTitle}>CLONER</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Counter */}
      <View style={styles.counter}>
        <Text style={styles.counterNum}>{totalCloned}</Text>
        <Text style={styles.counterLabel}>CLONED ALL-TIME</Text>
      </View>
      <View style={styles.activeCount}>
        <Text style={styles.activeNum}>{obamas.length}</Text>
        <Text style={styles.activeLabel}>ACTIVE</Text>
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

        {/* Inline toast for normal clones */}
        {lastClone && (
          <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
            <Text style={styles.toastText}>
              {lastClone.name} #{String(lastClone.id).padStart(4, '0')}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Rare overlay — NOT dismissable by tapping background */}
      {rareClone && (
        <Animated.View style={[styles.rareOverlay, { opacity: rareOpacity }]} pointerEvents="auto">
          <View style={styles.rareBlocker}>
            <Animated.View style={[styles.rareCard, { transform: [{ scale: rareScale }] }]}>
              <Text style={styles.rareTag}>
                {rareClone.isMichelle ? '✦ MICHELLE ✦' : `✦ RARE · ${RARE_LABELS[rareClone.rareType] || 'SPECIAL'} ✦`}
              </Text>
              <StickFigureClone obama={rareClone} size={120} />
              <Text style={[styles.rareName, rareClone.isMichelle && { color: '#ff69b4' }]}>
                {rareClone.name}
              </Text>
              <Text style={styles.rareId}>#{String(rareClone.id).padStart(4, '0')}</Text>
              <Pressable onPress={dismissRare} style={styles.ackBtn}>
                <Text style={styles.ackText}>ACKNOWLEDGE</Text>
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
  rareOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
  },
  rareBlocker: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  rareCard: {
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    padding: 36, alignItems: 'center', minWidth: 240,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 30, shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  rareTag: { fontSize: 10, color: '#b8860b', letterSpacing: 4, marginBottom: 16, fontWeight: '600' },
  rareName: { fontSize: 22, fontWeight: '200', color: '#1a1a1a', letterSpacing: 4, marginTop: 16 },
  rareId: { fontSize: 11, color: 'rgba(0,0,0,0.2)', fontFamily: MONO, letterSpacing: 2, marginTop: 6 },
  ackBtn: {
    marginTop: 24, paddingVertical: 12, paddingHorizontal: 28,
    borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  ackText: { fontSize: 11, color: '#1a1a1a', letterSpacing: 3, fontWeight: '500' },
  footer: {
    fontSize: 8, color: 'rgba(0,0,0,0.1)', letterSpacing: 5,
    textAlign: 'center', paddingBottom: 30,
  },
});
