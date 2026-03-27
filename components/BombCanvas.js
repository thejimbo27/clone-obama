import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, Platform,
} from 'react-native';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';
import {
  Canvas, Rect, RoundedRect, Circle, Line, Group,
  LinearGradient, vec,
} from '@shopify/react-native-skia';

const { width: W, height: H } = Dimensions.get('window');
const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

const CANVAS_W = Math.min(W, 500);
const CANVAS_H = Math.min(H - 200, 500);
const ISLAND_X = CANVAS_W * 0.08;
const ISLAND_Y = CANVAS_H * 0.4;
const ISLAND_W = CANVAS_W * 0.84;
const ISLAND_H = CANVAS_H * 0.45;

// Launcher position (on the island)
const LAUNCH_X = CANVAS_W * 0.5;
const LAUNCH_Y = ISLAND_Y + ISLAND_H * 0.1;

let missileIdCounter = 0;

export default function BombCanvas() {
  const router = useRouter();
  const { missilesLaunched, addMissiles } = useObamas();
  const [frame, setFrame] = useState(0);
  const missiles = useRef([]);
  const explosions = useRef([]);
  const animRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Button pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Game loop
  useEffect(() => {
    const tick = () => {
      // Update missiles
      missiles.current.forEach((m) => {
        m.age += 1;
        m.x += m.vx;
        m.y += m.vy;
        m.vy -= 0.03; // slight gravity reversal (missiles go UP)
        // Trail particles
        if (m.age % 2 === 0 && m.age < 80) {
          m.trail.push({ x: m.x, y: m.y, life: 1 });
        }
        m.trail.forEach((t) => { t.life -= 0.03; });
        m.trail = m.trail.filter((t) => t.life > 0);
      });

      // Spawn explosions for missiles that exit top
      missiles.current.forEach((m) => {
        if (m.y < -20 && !m.exploded) {
          m.exploded = true;
          explosions.current.push({
            x: m.x,
            y: 15 + Math.random() * 30,
            life: 1,
            maxR: 15 + Math.random() * 20,
          });
        }
      });

      // Clean up
      missiles.current = missiles.current.filter((m) => m.age < 150);
      explosions.current.forEach((e) => { e.life -= 0.015; });
      explosions.current = explosions.current.filter((e) => e.life > 0);

      setFrame((f) => f + 1);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const handleLaunch = useCallback(() => {
    // Spawn 3 missiles in a spread
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      missiles.current.push({
        id: missileIdCounter++,
        x: LAUNCH_X + (Math.random() - 0.5) * 10,
        y: LAUNCH_Y,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -3 - Math.random() * 2,
        age: 0,
        trail: [],
        exploded: false,
      });
    }
    addMissiles(count);
  }, []);

  // Build render data from refs
  const missileRenders = missiles.current.filter((m) => m.y > -30 && m.age < 150);
  const explosionRenders = explosions.current.filter((e) => e.life > 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ HQ</Text>
        </Pressable>
        <Text style={styles.headerTitle}>BOMB IRAN</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countNum}>{missilesLaunched}</Text>
        </View>
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        <Canvas style={{ width: CANVAS_W, height: CANVAS_H }}>
          {/* Sky */}
          <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, CANVAS_H)}
              colors={['#87CEEB', '#b0d4f1', '#d4e8f7']}
            />
          </Rect>

          {/* Clouds */}
          <Circle cx={CANVAS_W * 0.2} cy={40} r={25} color="rgba(255,255,255,0.6)" />
          <Circle cx={CANVAS_W * 0.25} cy={38} r={20} color="rgba(255,255,255,0.5)" />
          <Circle cx={CANVAS_W * 0.7} cy={55} r={30} color="rgba(255,255,255,0.5)" />
          <Circle cx={CANVAS_W * 0.76} cy={50} r={22} color="rgba(255,255,255,0.4)" />

          {/* Ocean */}
          <Rect x={0} y={CANVAS_H * 0.7} width={CANVAS_W} height={CANVAS_H * 0.3}>
            <LinearGradient
              start={vec(0, CANVAS_H * 0.7)}
              end={vec(0, CANVAS_H)}
              colors={['#5ba3d9', '#3a7cc0', '#2d6aaa']}
            />
          </Rect>

          {/* Island dirt */}
          <RoundedRect
            x={ISLAND_X}
            y={ISLAND_Y + ISLAND_H * 0.25}
            width={ISLAND_W}
            height={ISLAND_H * 0.75}
            r={30}
            color="#8B6914"
          />

          {/* Island grass */}
          <RoundedRect
            x={ISLAND_X}
            y={ISLAND_Y}
            width={ISLAND_W}
            height={ISLAND_H * 0.55}
            r={30}
            color="#4a9e4e"
          />

          {/* Grass highlight */}
          <RoundedRect
            x={ISLAND_X + 10}
            y={ISLAND_Y + 4}
            width={ISLAND_W - 20}
            height={ISLAND_H * 0.2}
            r={25}
            color="rgba(100,200,100,0.3)"
          />

          {/* Trees */}
          <Group>
            {/* Left tree */}
            <Rect x={CANVAS_W * 0.2} y={ISLAND_Y + ISLAND_H * 0.08} width={6} height={24} color="#5c3d1e" />
            <Circle cx={CANVAS_W * 0.2 + 3} cy={ISLAND_Y + ISLAND_H * 0.04} r={14} color="#2d7830" />

            {/* Right tree */}
            <Rect x={CANVAS_W * 0.75} y={ISLAND_Y + ISLAND_H * 0.06} width={6} height={20} color="#5c3d1e" />
            <Circle cx={CANVAS_W * 0.75 + 3} cy={ISLAND_Y + ISLAND_H * 0.02} r={12} color="#2d7830" />
          </Group>

          {/* Missile Launcher */}
          <Group>
            {/* Base platform */}
            <RoundedRect
              x={LAUNCH_X - 20}
              y={LAUNCH_Y + 10}
              width={40}
              height={12}
              r={3}
              color="#555"
            />
            {/* Launch tube */}
            <Rect x={LAUNCH_X - 4} y={LAUNCH_Y - 18} width={8} height={30} color="#444" />
            {/* Tube tip */}
            <Rect x={LAUNCH_X - 6} y={LAUNCH_Y - 22} width={12} height={6} color="#333" />
            {/* Support struts */}
            <Line p1={vec(LAUNCH_X - 15, LAUNCH_Y + 10)} p2={vec(LAUNCH_X - 4, LAUNCH_Y - 5)} color="#666" strokeWidth={2} />
            <Line p1={vec(LAUNCH_X + 15, LAUNCH_Y + 10)} p2={vec(LAUNCH_X + 4, LAUNCH_Y - 5)} color="#666" strokeWidth={2} />
            {/* Status light */}
            <Circle cx={LAUNCH_X} cy={LAUNCH_Y + 5} r={3} color="#ff3b30" />
          </Group>

          {/* Missile trails */}
          {missileRenders.map((m) =>
            m.trail.map((t, ti) => (
              <Circle
                key={`trail-${m.id}-${ti}`}
                cx={t.x}
                cy={t.y}
                r={2 + t.life * 2}
                color={`rgba(255,${Math.floor(100 + t.life * 100)},0,${t.life * 0.6})`}
              />
            ))
          )}

          {/* Missiles */}
          {missileRenders.map((m) => (
            <Group key={`missile-${m.id}`}>
              {/* Body */}
              <Rect
                x={m.x - 2}
                y={m.y - 8}
                width={4}
                height={12}
                color="#333"
              />
              {/* Nose cone */}
              <Circle cx={m.x} cy={m.y - 10} r={3} color="#ff3b30" />
              {/* Engine glow */}
              <Circle cx={m.x} cy={m.y + 6} r={4} color="rgba(255,150,0,0.7)" />
              <Circle cx={m.x} cy={m.y + 8} r={3} color="rgba(255,80,0,0.5)" />
            </Group>
          ))}

          {/* Explosions at top of screen */}
          {explosionRenders.map((e, i) => (
            <Group key={`exp-${i}`} opacity={e.life}>
              <Circle cx={e.x} cy={e.y} r={e.maxR * (1 - e.life * 0.3)} color={`rgba(255,120,0,${e.life * 0.6})`} />
              <Circle cx={e.x} cy={e.y} r={e.maxR * 0.6 * (1 - e.life * 0.3)} color={`rgba(255,200,50,${e.life * 0.8})`} />
              <Circle cx={e.x} cy={e.y} r={e.maxR * 0.3} color={`rgba(255,255,200,${e.life})`} />
            </Group>
          ))}

          {/* Water ripples */}
          <Circle cx={CANVAS_W * 0.15} cy={CANVAS_H * 0.85} r={15} color="rgba(255,255,255,0.08)" />
          <Circle cx={CANVAS_W * 0.8} cy={CANVAS_H * 0.82} r={12} color="rgba(255,255,255,0.06)" />
        </Canvas>
      </View>

      {/* Launch Button */}
      <View style={styles.btnSection}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable onPress={handleLaunch} style={styles.launchBtn}>
            <Text style={styles.launchIcon}>◆</Text>
            <Text style={styles.launchLabel}>LAUNCH</Text>
          </Pressable>
        </Animated.View>
        <Text style={styles.launchSub}>{missilesLaunched} MISSILES DEPLOYED</Text>
      </View>

      <Text style={styles.footer}>CLASSIFIED · STRATEGIC COMMAND</Text>
    </View>
  );
}

const BTN_SIZE = 120;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 8,
  },
  backBtn: { width: 60 },
  backText: { color: '#007aff', fontSize: 15, fontWeight: '400', letterSpacing: 1 },
  headerTitle: { fontSize: 12, color: 'rgba(0,0,0,0.35)', letterSpacing: 6, fontWeight: '300' },
  countBadge: {
    backgroundColor: 'rgba(0,122,255,0.08)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0,122,255,0.15)',
  },
  countNum: { color: '#007aff', fontSize: 13, fontFamily: MONO, fontWeight: '500' },
  canvasWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnSection: { alignItems: 'center', paddingBottom: 16 },
  launchBtn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 2, borderColor: 'rgba(0,122,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  launchIcon: { fontSize: 28, color: '#007aff', marginBottom: 2 },
  launchLabel: { fontSize: 10, color: '#007aff', letterSpacing: 4, fontWeight: '600' },
  launchSub: {
    fontSize: 9, color: 'rgba(0,0,0,0.2)', letterSpacing: 3,
    marginTop: 10, fontFamily: MONO,
  },
  footer: {
    fontSize: 8, color: 'rgba(0,0,0,0.1)', letterSpacing: 5,
    textAlign: 'center', paddingBottom: 24,
  },
});
