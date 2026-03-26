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
  const limbColor = isGolden ? '#ffd700' : isGhost ? 'rgba(255,255,255,0.3)' : '#fff';

  return (
    <View style={{ alignItems: 'center', width: size, height: size * 1.4 }}>
      {obama.rareType === 'hat' && (
        <Text style={{ fontSize: 28, marginBottom: -8, zIndex: 3 }}>{obama.rareTrait}</Text>
      )}
      <Image
        source={isMichelle ? require('../assets/michelle.png') : require('../assets/obama.png')}
        style={{
          width: finalHeadSize,
          height: finalHeadSize,
          borderRadius: finalHeadSize / 2,
          zIndex: 2,
          transform: isSideways ? [{ rotate: '90deg' }] : [],
          opacity: isGhost ? 0.4 : 1,
          ...(isGolden ? { tintColor: '#ffd700' } : {}),
        }}
        resizeMode="cover"
      />
      <View style={{ alignItems: 'center', marginTop: -3 }}>
        <View style={{ width: 2, height: size * 0.25, backgroundColor: limbColor }} />
        <View style={{ position: 'absolute', top: 4, flexDirection: 'row' }}>
          <View
            style={{
              width: 2, height: size * 0.2, backgroundColor: limbColor,
              transform: [{ rotate: '40deg' }], position: 'absolute', left: -size * 0.13,
            }}
          />
          <View
            style={{
              width: 2, height: size * 0.2, backgroundColor: limbColor,
              transform: [{ rotate: '-40deg' }], position: 'absolute', right: -size * 0.13,
            }}
          />
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
  const [newClone, setNewClone] = useState(null);
  const [showFlash, setShowFlash] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;
  const revealScale = useRef(new Animated.Value(0.8)).current;
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
    setTimeout(() => setShowFlash(false), 150);

    // Play riff for rare/michelle
    if (obama.isRare || obama.isMichelle) {
      riffSound.current?.setPositionAsync(0).then(() => riffSound.current?.playAsync());
    }

    // Show reveal
    setNewClone(obama);
    revealAnim.setValue(0);
    revealScale.setValue(0.8);

    if (obama.isRare || obama.isMichelle) {
      Animated.parallel([
        Animated.spring(revealScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: false }),
        Animated.timing(revealAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.timing(revealAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start(() => {
        setTimeout(() => {
          Animated.timing(revealAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start(() => {
            setNewClone(null);
          });
        }, 1200);
      });
    }
  }, [addObama]);

  const dismissReveal = useCallback(() => {
    Animated.timing(revealAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start(() => {
      setNewClone(null);
    });
  }, []);

  return (
    <ImageBackground source={require('../assets/cloud.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      {/* Red flash */}
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
      </View>

      {/* Reveal Card */}
      {newClone && (
        <Animated.View
          style={[
            styles.revealOverlay,
            { opacity: revealAnim },
          ]}
        >
          <Pressable style={styles.revealDismiss} onPress={dismissReveal}>
            <Animated.View style={[styles.revealCard, { transform: [{ scale: revealScale }] }]}>
              {(newClone.isRare || newClone.isMichelle) && (
                <Text style={styles.rareTag}>
                  {newClone.isMichelle ? '✦ MICHELLE ✦' : `✦ RARE · ${RARE_LABELS[newClone.rareType] || 'SPECIAL'} ✦`}
                </Text>
              )}
              <StickFigureClone obama={newClone} size={120} />
              <Text style={[styles.revealName, newClone.isMichelle && { color: '#ff69b4' }]}>
                {newClone.name}
              </Text>
              <Text style={styles.revealId}>#{String(newClone.id).padStart(4, '0')}</Text>
              {(newClone.isRare || newClone.isMichelle) && (
                <Pressable onPress={dismissReveal} style={styles.dismissBtn}>
                  <Text style={styles.dismissText}>ACKNOWLEDGE</Text>
                </Pressable>
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>CLASSIFIED · CLONING DIVISION</Text>
    </ImageBackground>
  );
}

const BTN_SIZE = 160;

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0a0a0a' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,15,0.85)' },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,0,0,0.25)', zIndex: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, zIndex: 10,
  },
  backBtn: { width: 60 },
  backText: { color: '#00e5ff', fontSize: 15, fontWeight: '300', letterSpacing: 1 },
  headerTitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 8, fontWeight: '300' },
  counter: { alignItems: 'center', marginTop: 40 },
  counterNum: { fontSize: 64, fontWeight: '100', color: '#ff3b3b', fontFamily: MONO },
  counterLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 5, marginTop: 4 },
  activeCount: { alignItems: 'center', marginTop: 12 },
  activeNum: { fontSize: 20, fontWeight: '200', color: 'rgba(0,229,255,0.6)', fontFamily: MONO },
  activeLabel: { fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 4 },
  btnWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnGlow: {
    position: 'absolute', width: BTN_SIZE * 1.8, height: BTN_SIZE * 1.8,
    borderRadius: BTN_SIZE, backgroundColor: 'rgba(255,59,59,0.12)',
  },
  cloneBtn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    backgroundColor: 'rgba(255,59,59,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,59,59,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  clonePlus: { fontSize: 48, fontWeight: '100', color: '#ff3b3b', marginTop: -4 },
  cloneLabel: { fontSize: 10, color: '#ff3b3b', letterSpacing: 5, fontWeight: '500', marginTop: -2 },
  revealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', zIndex: 50,
  },
  revealDismiss: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  revealCard: {
    backgroundColor: 'rgba(20,20,30,0.95)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 32, alignItems: 'center', minWidth: 220,
  },
  rareTag: {
    fontSize: 10, color: '#ffd700', letterSpacing: 4, marginBottom: 16, fontWeight: '600',
  },
  revealName: {
    fontSize: 22, fontWeight: '200', color: '#fff', letterSpacing: 4, marginTop: 16,
  },
  revealId: {
    fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: MONO, letterSpacing: 2, marginTop: 6,
  },
  dismissBtn: {
    marginTop: 20, paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
  dismissText: { fontSize: 10, color: '#ffd700', letterSpacing: 3, fontWeight: '500' },
  footer: {
    fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 5,
    textAlign: 'center', paddingBottom: 30,
  },
});
