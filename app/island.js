import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';
import { Audio } from 'expo-av';
import {
  Canvas,
  Rect,
  RoundedRect,
  Circle,
  Line,
  Image as SkiaImage,
  Group,
  LinearGradient,
  vec,
  useImage,
} from '@shopify/react-native-skia';

const { width: W, height: H } = Dimensions.get('window');
const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

const CANVAS_W = Math.min(W, 500);
const CANVAS_H = Math.min(H - 160, 550);
const ISLAND_X = CANVAS_W * 0.08;
const ISLAND_Y = CANVAS_H * 0.25;
const ISLAND_W = CANVAS_W * 0.84;
const ISLAND_H = CANVAS_H * 0.55;
const GROUND_TOP = ISLAND_Y + ISLAND_H * 0.15;

const TREES = [
  { x: 0.15, y: 0.35, size: 1 },
  { x: 0.78, y: 0.32, size: 1.2 },
  { x: 0.45, y: 0.28, size: 0.9 },
  { x: 0.88, y: 0.45, size: 0.8 },
  { x: 0.25, y: 0.55, size: 1.1 },
  { x: 0.65, y: 0.60, size: 0.7 },
];

const SPEED = 0.6;

export default function IslandScreen() {
  const router = useRouter();
  const { obamas, removeObama, removeAllObamas, renameObama, setHqOperator } = useObamas();
  const [frame, setFrame] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const spriteData = useRef({});
  const animRef = useRef(null);

  // Skia hooks — called unconditionally every render (rules of hooks)
  const obamaHead = useImage(require('../assets/obama.png'));
  const michelleHead = useImage(require('../assets/michelle.png'));

  // Play ere.mp3 on mount
  useEffect(() => {
    let sound = null;
    (async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(require('../assets/ere.mp3'));
        sound = s;
        await s.playAsync();
      } catch (e) {
        console.warn('ere sound failed:', e);
      }
    })();
    return () => { sound?.unloadAsync(); };
  }, []);

  // Init sprite positions for new obamas
  useEffect(() => {
    obamas.forEach((o) => {
      if (!spriteData.current[o.id]) {
        spriteData.current[o.id] = {
          x: ISLAND_X + ISLAND_W * 0.2 + Math.random() * (ISLAND_W * 0.6),
          y: GROUND_TOP + 20 + Math.random() * (ISLAND_H * 0.5),
          targetX: 0,
          targetY: 0,
          walkPhase: Math.random() * Math.PI * 2,
          state: 'idle',
          idleTimer: 60 + Math.random() * 120,
          facingRight: Math.random() > 0.5,
          ascending: false,
          ascendProgress: 0,
        };
      }
    });
  }, [obamas]);

  // Game loop — single requestAnimationFrame driving all sprites
  useEffect(() => {
    const tick = () => {
      const data = spriteData.current;

      Object.keys(data).forEach((id) => {
        const s = data[id];
        if (!s) return;

        if (s.ascending) {
          s.ascendProgress += 0.012;
          s.y -= 1.5;
          if (s.ascendProgress >= 1) {
            delete data[id];
          }
          return;
        }

        s.walkPhase += 0.08;

        if (s.state === 'idle') {
          s.idleTimer -= 1;
          if (s.idleTimer <= 0) {
            s.targetX = ISLAND_X + 30 + Math.random() * (ISLAND_W - 60);
            s.targetY = GROUND_TOP + 20 + Math.random() * (ISLAND_H * 0.55);
            s.state = 'walking';
            s.facingRight = s.targetX > s.x;
          }
        } else if (s.state === 'walking') {
          const dx = s.targetX - s.x;
          const dy = s.targetY - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 3) {
            s.state = 'idle';
            s.idleTimer = 80 + Math.random() * 200;
          } else {
            s.x += (dx / dist) * SPEED;
            s.y += (dy / dist) * SPEED;
          }
        }
      });

      setFrame((f) => f + 1);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleCanvasTouch = useCallback(
    (evt) => {
      let tx, ty;
      if (Platform.OS === 'web') {
        const rect = evt.currentTarget?.getBoundingClientRect?.();
        if (rect) {
          tx = (evt.nativeEvent.pageX - rect.left) * (CANVAS_W / rect.width);
          ty = (evt.nativeEvent.pageY - rect.top) * (CANVAS_H / rect.height);
        } else {
          tx = evt.nativeEvent.locationX;
          ty = evt.nativeEvent.locationY;
        }
      } else {
        tx = evt.nativeEvent.locationX;
        ty = evt.nativeEvent.locationY;
      }

      let closest = null;
      let closestDist = 40;
      obamas.forEach((o) => {
        const s = spriteData.current[o.id];
        if (!s || s.ascending) return;
        const dx = s.x - tx;
        const dy = (s.y - 10) - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = o;
        }
      });
      if (closest) {
        setSelectedId(closest.id);
        setRenameText(closest.name);
      }
    },
    [obamas]
  );

  const handleRelease = useCallback(
    (id) => {
      const s = spriteData.current[id];
      if (s) {
        s.ascending = true;
        s.ascendProgress = 0;
      }
      setTimeout(() => removeObama(id), 1200);
      setSelectedId(null);
    },
    [removeObama]
  );

  const handleReleaseAll = useCallback(() => {
    Object.values(spriteData.current).forEach((s) => {
      if (s) {
        s.ascending = true;
        s.ascendProgress = 0;
      }
    });
    setTimeout(() => {
      removeAllObamas();
      spriteData.current = {};
    }, 1500);
  }, [removeAllObamas]);

  const handleSetHQ = useCallback(
    (id) => {
      setHqOperator(id);
      setSelectedId(null);
    },
    [setHqOperator]
  );

  const handleRename = useCallback(
    (id) => {
      if (renameText.trim()) renameObama(id, renameText.trim());
      setSelectedId(null);
    },
    [renameText, renameObama]
  );

  const selectedObama = obamas.find((o) => o.id === selectedId);

  // Build per-frame sprite render data from mutable ref
  const spriteRenders = obamas.map((o) => {
    const s = spriteData.current[o.id];
    if (!s) return null;

    const opacity = s.ascending ? Math.max(0, 1 - s.ascendProgress) : 1;
    const headImg = o.isMichelle ? michelleHead : obamaHead;
    const headSize = 20;
    const isWalking = s.state === 'walking' && !s.ascending;
    const armSwing = isWalking ? Math.sin(s.walkPhase) * 20 : 5;
    const legSwing = isWalking ? Math.sin(s.walkPhase + Math.PI) * 16 : 0;
    const bobY = isWalking ? Math.sin(s.walkPhase * 2) * 1.5 : Math.sin(s.walkPhase * 0.3) * 0.8;

    const isGolden = o.rareType === 'color' && o.rareTrait === 'golden';
    const isGhost = o.rareType === 'color' && o.rareTrait === 'ghost';
    const isHuge = o.rareType === 'deformity' && o.rareTrait === 'huge_head';
    const isTiny = o.rareType === 'deformity' && o.rareTrait === 'tiny_head';
    const finalHeadSize = isHuge ? headSize * 1.5 : isTiny ? headSize * 0.6 : headSize;
    const limbColor = isGolden ? '#ffd700' : isGhost ? 'rgba(200,200,255,0.4)' : '#ffffff';
    const effectiveOpacity = opacity * (isGhost ? 0.45 : 1);

    const x = s.x;
    const y = s.y + bobY;
    const torsoTop = y;
    const torsoBottom = y + 22;
    const lArmX = x + Math.sin((armSwing * Math.PI) / 180) * 14;
    const rArmX = x - Math.sin((armSwing * Math.PI) / 180) * 14;
    const armY = torsoTop + 5;
    const armEndY = torsoTop + 18;
    const lLegX = x + 4 + Math.sin((legSwing * Math.PI) / 180) * 10;
    const rLegX = x - 4 - Math.sin((legSwing * Math.PI) / 180) * 10;
    const legEndY = torsoBottom + 18;

    return {
      key: o.id,
      obama: o,
      effectiveOpacity,
      headImg,
      finalHeadSize,
      limbColor,
      x, y,
      torsoTop, torsoBottom,
      lArmX, rArmX, armY, armEndY,
      lLegX, rLegX, legEndY,
    };
  }).filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ HQ</Text>
        </Pressable>
        <Text style={styles.headerTitle}>OBAMA ISLAND</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{obamas.length}</Text>
        </View>
      </View>

      {/* Skia Canvas */}
      <Pressable onPress={handleCanvasTouch} style={styles.canvasWrap}>
        <Canvas style={{ width: CANVAS_W, height: CANVAS_H }}>
          {/* Sky gradient */}
          <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, CANVAS_H)}
              colors={['#0b1628', '#0d2847', '#1a4a6e']}
            />
          </Rect>

          {/* Ocean glow */}
          <Circle
            cx={CANVAS_W * 0.5}
            cy={ISLAND_Y + ISLAND_H * 0.7}
            r={ISLAND_W * 0.55}
            color="rgba(0,180,255,0.06)"
          />

          {/* Island dirt */}
          <RoundedRect
            x={ISLAND_X}
            y={ISLAND_Y + ISLAND_H * 0.3}
            width={ISLAND_W}
            height={ISLAND_H * 0.75}
            r={30}
            color="#5c3d1e"
          />

          {/* Island grass */}
          <RoundedRect
            x={ISLAND_X}
            y={ISLAND_Y}
            width={ISLAND_W}
            height={ISLAND_H * 0.65}
            r={30}
            color="#3a7d3e"
          />

          {/* Grass highlight */}
          <RoundedRect
            x={ISLAND_X + 10}
            y={ISLAND_Y + 5}
            width={ISLAND_W - 20}
            height={ISLAND_H * 0.22}
            r={25}
            color="rgba(80,180,80,0.3)"
          />

          {/* Trees */}
          {TREES.map((tree, i) => {
            const tx = ISLAND_X + tree.x * ISLAND_W;
            const ty = ISLAND_Y + tree.y * ISLAND_H * 0.6;
            const sz = tree.size;
            return (
              <Group key={`tree-${i}`}>
                <Rect x={tx - 3 * sz} y={ty} width={6 * sz} height={22 * sz} color="#5c3d1e" />
                <Circle cx={tx} cy={ty - 4 * sz} r={14 * sz} color="#2d6830" />
                <Circle cx={tx} cy={ty - 8 * sz} r={10 * sz} color="rgba(60,140,60,0.6)" />
              </Group>
            );
          })}

          {/* Obama sprites */}
          {spriteRenders.map((sr) => (
            <Group key={sr.key} opacity={sr.effectiveOpacity}>
              {sr.obama.rareType === 'hat' && (
                <Circle cx={sr.x} cy={sr.y - sr.finalHeadSize - 8} r={6} color="#ffd700" />
              )}
              {sr.headImg && (
                <SkiaImage
                  image={sr.headImg}
                  x={sr.x - sr.finalHeadSize / 2}
                  y={sr.y - sr.finalHeadSize - 4}
                  width={sr.finalHeadSize}
                  height={sr.finalHeadSize}
                  fit="cover"
                />
              )}
              <Line p1={vec(sr.x, sr.torsoTop)} p2={vec(sr.x, sr.torsoBottom)} color={sr.limbColor} strokeWidth={2} />
              <Line p1={vec(sr.x, sr.armY)} p2={vec(sr.lArmX, sr.armEndY)} color={sr.limbColor} strokeWidth={1.5} />
              <Line p1={vec(sr.x, sr.armY)} p2={vec(sr.rArmX, sr.armEndY)} color={sr.limbColor} strokeWidth={1.5} />
              <Line p1={vec(sr.x, sr.torsoBottom)} p2={vec(sr.lLegX, sr.legEndY)} color={sr.limbColor} strokeWidth={1.5} />
              <Line p1={vec(sr.x, sr.torsoBottom)} p2={vec(sr.rLegX, sr.legEndY)} color={sr.limbColor} strokeWidth={1.5} />
              {sr.obama.isMichelle && (
                <RoundedRect x={sr.x - 18} y={sr.legEndY + 3} width={36} height={10} r={3} color="rgba(255,105,180,0.5)" />
              )}
            </Group>
          ))}

          {/* Water ripples */}
          <Circle cx={CANVAS_W * 0.18} cy={CANVAS_H * 0.92} r={20} color="rgba(0,180,255,0.05)" />
          <Circle cx={CANVAS_W * 0.72} cy={CANVAS_H * 0.88} r={15} color="rgba(0,180,255,0.04)" />
          <Circle cx={CANVAS_W * 0.5} cy={CANVAS_H * 0.95} r={25} color="rgba(0,180,255,0.03)" />
        </Canvas>
      </Pressable>

      {/* Release All */}
      {obamas.length > 0 && (
        <Pressable onPress={handleReleaseAll} style={styles.releaseAllBtn}>
          <Text style={styles.releaseAllText}>RELEASE ALL TO THE PHYSICAL WORLD</Text>
        </Pressable>
      )}

      {obamas.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>THE ISLAND IS EMPTY</Text>
          <Text style={styles.emptySubtext}>Clone more Obamas at HQ</Text>
        </View>
      )}

      {/* Selection Modal */}
      <Modal visible={!!selectedObama} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedId(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalName}>{selectedObama?.name}</Text>
            <Text style={styles.modalId}>#{String(selectedObama?.id || 0).padStart(4, '0')}</Text>
            {selectedObama?.isRare && <Text style={styles.modalRare}>✦ RARE ✦</Text>}
            {selectedObama?.isMichelle && <Text style={[styles.modalRare, { color: '#ff69b4' }]}>✦ MICHELLE ✦</Text>}

            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Rename..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              onSubmitEditing={() => handleRename(selectedObama?.id)}
            />

            <View style={styles.modalBtns}>
              <Pressable style={styles.modalBtn} onPress={() => handleRename(selectedObama?.id)}>
                <Text style={styles.modalBtnText}>RENAME</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { borderColor: 'rgba(0,229,255,0.4)' }]} onPress={() => handleSetHQ(selectedObama?.id)}>
                <Text style={[styles.modalBtnText, { color: '#00e5ff' }]}>SET AS HQ</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { borderColor: 'rgba(255,59,59,0.4)' }]} onPress={() => handleRelease(selectedObama?.id)}>
                <Text style={[styles.modalBtnText, { color: '#ff3b3b' }]}>RELEASE</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080e1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 60 },
  backText: { color: '#00e5ff', fontSize: 15, fontWeight: '300', letterSpacing: 1 },
  headerTitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 6, fontWeight: '300' },
  countBadge: {
    backgroundColor: 'rgba(0,229,255,0.15)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
  },
  countText: { color: '#00e5ff', fontSize: 13, fontFamily: MONO, fontWeight: '500' },
  canvasWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  releaseAllBtn: {
    marginHorizontal: 24, marginBottom: 30, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,59,59,0.25)',
    backgroundColor: 'rgba(255,59,59,0.06)',
    alignItems: 'center',
  },
  releaseAllText: { color: 'rgba(255,59,59,0.7)', fontSize: 10, letterSpacing: 4, fontWeight: '500' },
  emptyWrap: { alignItems: 'center', paddingBottom: 40 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, letterSpacing: 4, fontFamily: MONO },
  emptySubtext: { color: 'rgba(255,255,255,0.1)', fontSize: 11, marginTop: 8 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    backgroundColor: 'rgba(15,15,25,0.97)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 28, minWidth: 260, alignItems: 'center',
  },
  modalName: { fontSize: 24, fontWeight: '200', color: '#fff', letterSpacing: 4 },
  modalId: { fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: MONO, marginTop: 4, letterSpacing: 2 },
  modalRare: { fontSize: 10, color: '#ffd700', letterSpacing: 3, marginTop: 8, fontWeight: '600' },
  renameInput: {
    width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: '#fff', fontSize: 14, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    textAlign: 'center', letterSpacing: 2,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' },
  modalBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  modalBtnText: { fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, fontWeight: '500' },
});
