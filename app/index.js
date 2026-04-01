import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Dimensions,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';

const { width: W, height: H } = Dimensions.get('window');
const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

function PulseRing({ delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1, duration: 2400,
          easing: Easing.out(Easing.ease), useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 0.2, 0] });
  return (
    <Animated.View
      style={[styles.pulseRing, { transform: [{ scale }], opacity }]}
    />
  );
}

function DataStream({ left }) {
  const anim = useRef(new Animated.Value(0)).current;
  const speed = 2000 + Math.random() * 3000;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1, duration: speed,
        easing: Easing.linear, useNativeDriver: false,
      })
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-100, 400] });
  const opacity = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.4, 0.4, 0] });
  return (
    <Animated.Text style={[styles.dataChar, { left, transform: [{ translateY }], opacity }]}>
      {Math.random() > 0.5 ? '1' : '0'}
    </Animated.Text>
  );
}

function StickObama({ obama, size = 100 }) {
  const headSize = size * 0.35;
  const isMichelle = obama?.isMichelle;
  const torsoH = size * 0.28;
  const suitW = size * 0.22;
  return (
    <View style={{ width: size, height: size * 1.3, alignItems: 'center' }}>
      <Image
        source={isMichelle ? require('../assets/michelle.png') : require('../assets/obama.png')}
        style={{ width: headSize, height: headSize, borderRadius: headSize / 2, zIndex: 2 }}
        resizeMode="cover"
      />
      <View style={{ alignItems: 'center', marginTop: -4 }}>
        {/* Suit jacket */}
        <View style={{
          width: suitW, height: torsoH, backgroundColor: '#1c1c1e',
          borderBottomLeftRadius: suitW * 0.3, borderBottomRightRadius: suitW * 0.3,
          borderTopLeftRadius: suitW * 0.15, borderTopRightRadius: suitW * 0.15,
          alignItems: 'center', paddingTop: 3,
        }}>
          {/* Lapels */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
            <View style={{ width: 4, height: torsoH * 0.4, backgroundColor: '#2c2c2e', transform: [{ rotate: '8deg' }], borderRadius: 1 }} />
            <View style={{ width: 4, height: torsoH * 0.4, backgroundColor: '#2c2c2e', transform: [{ rotate: '-8deg' }], borderRadius: 1 }} />
          </View>
          {/* Tie */}
          <View style={{ width: 3, height: torsoH * 0.5, backgroundColor: '#c0392b', borderRadius: 1, marginTop: -torsoH * 0.2 }} />
        </View>
        {/* Arms */}
        <View style={{ position: 'absolute', top: 4 }}>
          <View style={{ width: 2, height: size * 0.22, backgroundColor: '#1c1c1e', transform: [{ rotate: '35deg' }], position: 'absolute', left: -size * 0.14 }} />
          <View style={{ width: 2, height: size * 0.22, backgroundColor: '#1c1c1e', transform: [{ rotate: '-35deg' }], position: 'absolute', right: -size * 0.14 }} />
        </View>
        {/* Legs */}
        <View style={{ flexDirection: 'row', marginTop: -1 }}>
          <View style={{ width: 2, height: size * 0.28, backgroundColor: '#333', transform: [{ rotate: '10deg' }], marginRight: 4 }} />
          <View style={{ width: 2, height: size * 0.28, backgroundColor: '#333', transform: [{ rotate: '-10deg' }] }} />
        </View>
      </View>
    </View>
  );
}

function NavCard({ title, subtitle, icon, onPress, color = '#007aff' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.navCard,
        hovered && { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: color },
      ]}
    >
      <Text style={[styles.navIcon, { color }]}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.navTitle, { color }]}>{title}</Text>
        <Text style={styles.navSub}>{subtitle}</Text>
      </View>
      <Text style={[styles.navArrow, { color }]}>›</Text>
    </Pressable>
  );
}

export default function HQ() {
  const router = useRouter();
  const { obamas, totalCloned, hqObama, score, stats } = useObamas();

  const streams = Array.from({ length: 12 }, (_, i) => (
    <DataStream key={i} left={`${8 + i * 8}%`} />
  ));

  return (
    <ImageBackground source={require('../assets/cloud.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>OBAMA</Text>
        <Text style={styles.titleSub}>HEADQUARTERS</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{obamas.length}</Text>
            <Text style={styles.statLabel}>ACTIVE</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.06)' }]}>
            <Text style={styles.statNum}>{totalCloned}</Text>
            <Text style={styles.statLabel}>ALL-TIME</Text>
          </View>
        </View>

        {/* Nav Cards */}
        <View style={styles.navSection}>
          <NavCard title="CLONER" subtitle="Duplicate Obama" icon="◉" color="#ff3b30" onPress={() => router.push('/clone')} />
          <NavCard title="ISLAND" subtitle="Obama habitat" icon="◎" color="#34c759" onPress={() => router.push('/island')} />
          <NavCard title="BOMB IRAN" subtitle="Launch strike" icon="◆" color="#007aff" onPress={() => router.push('/bomb')} />
          <NavCard title="BROWSER" subtitle="Web access" icon="◈" color="#af52de" onPress={() => router.push('/browser')} />
          <NavCard title="LEADERBOARD" subtitle={`Score: ${score.toLocaleString()}`} icon="◇" color="#ff9500" onPress={() => router.push('/leaderboard')} />
        </View>

        {/* Workstation */}
        <View style={styles.workstation}>
          <View style={styles.dataStreams}>{streams}</View>
          <PulseRing delay={0} />
          <PulseRing delay={800} />
          <PulseRing delay={1600} />
          <View style={styles.deskGlow} />
          <View style={styles.desk} />
          <View style={styles.operatorWrap}>
            {hqObama ? (
              <StickObama obama={hqObama} size={150} />
            ) : (
              <Text style={styles.noOperator}>NO OPERATOR</Text>
            )}
          </View>
          <View style={styles.deskSurface}>
            <View style={styles.deskScreen} />
            <View style={styles.deskDot} />
          </View>
        </View>

        {/* Console */}
        <View style={styles.console}>
          <Text style={styles.consoleLine}>{'>'} SYS.STATUS ............ <Text style={{ color: '#34c759' }}>ONLINE</Text></Text>
          <Text style={styles.consoleLine}>{'>'} CLONES.ACTIVE ......... {obamas.length}</Text>
          <Text style={styles.consoleLine}>{'>'} CLONES.TOTAL .......... {totalCloned}</Text>
          <Text style={styles.consoleLine}>{'>'} SYNTHETICS ............ {stats.synthetics}</Text>
          <Text style={styles.consoleLine}>{'>'} RARES ................. {stats.rares}</Text>
          <Text style={styles.consoleLine}>{'>'} MISSILES.LAUNCHED ..... {stats.missiles}</Text>
          <Text style={styles.consoleLine}>{'>'} SCORE ................. <Text style={{ color: '#ff9500' }}>{score.toLocaleString()}</Text></Text>
          <Text style={styles.consoleLine}>{'>'} OPERATOR .............. {hqObama?.name || 'NONE'}</Text>
          <Text style={styles.consoleLine}>{'>'} CLEARANCE ............. <Text style={{ color: '#007aff' }}>LEVEL 44</Text></Text>
          <Text style={[styles.consoleLine, { color: '#007aff', marginTop: 8 }]}>{'>'} READY FOR INPUT_</Text>
        </View>

        <Text style={styles.footer}>CLASSIFIED · LEVEL 44</Text>
        <Text style={styles.footerSub}>OBAMA HEADQUARTERS v1.0</Text>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f5f5f7' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245,245,247,0.88)' },
  scroll: {
    paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24,
    alignItems: 'center', minHeight: H,
  },
  title: {
    fontSize: 36, fontWeight: '200', color: '#1a1a1a',
    letterSpacing: 18, textAlign: 'center',
  },
  titleSub: {
    fontSize: 11, fontWeight: '300', color: 'rgba(0,0,0,0.35)',
    letterSpacing: 12, marginTop: 4, textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row', marginTop: 28,
    backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden', width: '100%', maxWidth: 340,
  },
  statBox: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '200', color: '#1a1a1a', fontFamily: MONO },
  statLabel: { fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: 4, marginTop: 4 },
  navSection: { width: '100%', maxWidth: 400, marginTop: 24, gap: 10 },
  navCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 16, paddingHorizontal: 18, gap: 14,
  },
  navIcon: { fontSize: 22 },
  navTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 3 },
  navSub: { fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 2, letterSpacing: 1 },
  navArrow: { fontSize: 24, fontWeight: '200' },
  workstation: {
    width: '100%', maxWidth: 400, height: 340, marginTop: 32,
    alignItems: 'center', justifyContent: 'flex-end', position: 'relative', overflow: 'hidden',
  },
  dataStreams: { ...StyleSheet.absoluteFillObject },
  dataChar: {
    position: 'absolute', top: 0,
    color: 'rgba(0,122,255,0.12)', fontFamily: MONO, fontSize: 11,
  },
  pulseRing: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: 'rgba(0,122,255,0.15)',
    top: '30%', alignSelf: 'center',
  },
  operatorWrap: { zIndex: 5, marginBottom: -10 },
  noOperator: { color: 'rgba(0,0,0,0.2)', fontFamily: MONO, fontSize: 10, letterSpacing: 3 },
  deskGlow: {
    position: 'absolute', bottom: 24, width: 200, height: 40,
    borderRadius: 100, backgroundColor: 'rgba(0,122,255,0.06)', alignSelf: 'center',
  },
  desk: {
    position: 'absolute', bottom: 16, width: 240, height: 4,
    backgroundColor: 'rgba(0,122,255,0.2)', borderRadius: 2, alignSelf: 'center',
  },
  deskSurface: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 20, zIndex: 5,
  },
  deskScreen: {
    width: 40, height: 28, borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(0,122,255,0.2)',
    backgroundColor: 'rgba(0,122,255,0.03)',
  },
  deskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34c759' },
  console: {
    width: '100%', maxWidth: 400, marginTop: 28,
    backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', padding: 18,
  },
  consoleLine: { fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', lineHeight: 20 },
  footer: {
    marginTop: 32, fontSize: 9, color: 'rgba(0,0,0,0.15)',
    letterSpacing: 6, textAlign: 'center',
  },
  footerSub: {
    marginTop: 6, fontSize: 9, color: 'rgba(0,0,0,0.08)',
    letterSpacing: 2, textAlign: 'center', marginBottom: 20,
  },
});
