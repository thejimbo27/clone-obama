import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useObamas } from '../context/ObamaContext';
import { Audio } from 'expo-av';

const { width: W, height: H } = Dimensions.get('window');
const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

// Island layout constants
const CANVAS_W = Math.min(W, 500);
const CANVAS_H = Math.min(H - 160, 550);
const ISLAND_X = CANVAS_W * 0.08;
const ISLAND_Y = CANVAS_H * 0.25;
const ISLAND_W = CANVAS_W * 0.84;
const ISLAND_H = CANVAS_H * 0.55;
const GROUND_TOP = ISLAND_Y + ISLAND_H * 0.15;

let SkiaComponents = null;

function getSkia() {
  if (!SkiaComponents) {
    try {
      const skia = require('@shopify/react-native-skia');
      SkiaComponents = {
        Canvas: skia.Canvas,
        Rect: skia.Rect,
        RoundedRect: skia.RoundedRect,
        Circle: skia.Circle,
        Line: skia.Line,
        Path: skia.Path,
        SkiaImage: skia.Image,
        useImage: skia.useImage,
        Group: skia.Group,
        Text: skia.Text,
        useFont: skia.useFont,
        Paint: skia.Paint,
        LinearGradient: skia.LinearGradient,
        vec: skia.vec,
        Skia: skia.Skia,
      };
    } catch (e) {
      console.warn('Skia not available:', e);
    }
  }
  return SkiaComponents;
}

// Tree data (fixed positions)
const TREES = [
  { x: 0.15, y: 0.35, size: 1 },
  { x: 0.78, y: 0.32, size: 1.2 },
  { x: 0.45, y: 0.28, size: 0.9 },
  { x: 0.88, y: 0.45, size: 0.8 },
  { x: 0.25, y: 0.55, size: 1.1 },
  { x: 0.65, y: 0.60, size: 0.7 },
];

function initSpriteData(obamas) {
  const data = {};
  obamas.forEach((o) => {
    data[o.id] = data[o.id] || {
      x: ISLAND_X + 30 + Math.random() * (ISLAND_W - 60),
      y: GROUND_TOP + 20 + Math.random() * (ISLAND_H * 0.65),
      targetX: 0,
      targetY: 0,
      vx: 0,
      vy: 0,
      walkPhase: Math.random() * Math.PI * 2,
      state: 'idle',
      idleTimer: Math.random() * 120,
      facingRight: Math.random() > 0.5,
      ascending: false,
      ascendY: 0,
      ascendOpacity: 1,
    };
    const s = data[o.id];
    if (s.state === 'idle' && s.idleTimer <= 0) {
      s.targetX = ISLAND_X + 30 + Math.random() * (ISLAND_W - 60);
      s.targetY = GROUND_TOP + 20 + Math.random() * (ISLAND_H * 0.65);
      s.state = 'walking';
    }
  });
  return data;
}

export default function IslandScreen() {
  const router = useRouter();
  const { obamas, removeObama, removeAllObamas, renameObama, setHqOperator } = useObamas();
  const [frame, setFrame] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [ascending, setAscending] = useState({}); // id -> true
  const spriteData = useRef({});
  const animRef = useRef(null);
  const ereSound = useRef(null);
  const canvasRef = useRef(null);

  const Sk = getSkia();

  const obamaHead = Sk?.useImage(require('../assets/obama.png'));
  const michelleHead = Sk?.useImage(require('../assets/michelle.png'));

  // Play ere.mp3 on mount
  useEffect(() => {
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/ere.mp3'));
        ereSound.current = sound;
        await sound.playAsync();
      } catch (e) {}
    })();
    return () => { ereSound.current?.unloadAsync(); };
  }, []);

  // Init sprite positions for new obamas
  useEffect(() => {
    obamas.forEach((o) => {
      if (!spriteData.current[o.id]) {
        spriteData.current[o.id] = {
          x: ISLAND_X + ISLAND_W * 0.3 + Math.random() * (ISLAND_W * 0.4),
          y: GROUND_TOP + 30 + Math.random() * (ISLAND_H * 0.5),
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

  // Game loop
  useEffect(() => {
    const SPEED = 0.6;
    const tick = () => {
      const data = spriteData.current;
      let anyAscending = false;

      Object.keys(data).forEach((id) => {
        const s = data[id];
        if (!s) return;

        // Ascending
        if (s.ascending) {
          s.ascendProgress += 0.012;
          s.y -= 1.5;
          anyAscending = true;
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
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleCanvasTouch = useCallback(
    (evt) => {
      const rect = evt.currentTarget?.getBoundingClientRect?.();
      let tx, ty;
      if (rect) {
        tx = evt.nativeEvent.pageX - rect.left;
        ty = evt.nativeEvent.pageY - rect.top;
      } else {
        tx = evt.nativeEvent.locationX;
        ty = evt.nativeEvent.locationY;
      }
      // Scale coordinates
      const scaleX = CANVAS_W / (rect?.width || CANVAS_W);
      const scaleY = CANVAS_H / (rect?.height || CANVAS_H);
      tx *= scaleX;
      ty *= scaleY;

      // Find closest obama within tap radius
      let closest = null;
      let closestDist = 35;
      obamas.forEach((o) => {
        const s = spriteData.current[o.id];
        if (!s || s.ascending) return;
        const dx = s.x - tx;
        const dy = (s.y - 15) - ty; // offset for head center
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
      setAscending((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        removeObama(id);
        setAscending((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }, 1200);
      setSelectedId(null);
    },
    [removeObama]
  );

  const handleReleaseAll = useCallback(() => {
    obamas.forEach((o) => {
      const s = spriteData.current[o.id];
      if (s) {
        s.ascending = true;
        s.ascendProgress = 0;
      }
    });
    setAscending(
      obamas.reduce((a, o) => ({ ...a, [o.id]: true }), {})
    );
    setTimeout(() => {
      removeAllObamas();
      spriteData.current = {};
      setAscending({});
    }, 1500);
  }, [obamas, removeAllObamas]);

  const handleSetHQ = useCallback(
    (id) => {
      setHqOperator(id);
      setSelectedId(null);
    },
    [setHqOperator]
  );

  const handleRename = useCallback(
    (id) => {
      if (renameText.trim()) {
        renameObama(id, renameText.trim());
      }
      setSelectedId(null);
    },
    [renameText, renameObama]
  );

  const selectedObama = obamas.find((o) => o.id === selectedId);

  // Render Skia canvas
  const renderCanvas = () => {
    if (!Sk) {
      return (
        <View style={[styles.canvasWrap, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#fff', fontFamily: MONO }}>SKIA NOT AVAILABLE</Text>
        </View>
      );
    }

    const { Canvas, Rect, Circle, Line, Group, SkiaImage, RoundedRect, LinearGradient, vec, Path: SkPath, Skia } = Sk;

    return (
      <Pressable onPress={handleCanvasTouch} style={styles.canvasWrap}>
        <Canvas style={{ width: CANVAS_W, height: CANVAS_H }} ref={canvasRef}>
          {/* Sky / ocean background */}
          <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, CANVAS_H)}
              colors={['#0b1628', '#0d2847', '#1a4a6e']}
            />
          </Rect>

          {/* Ocean shimmer */}
          <Circle
            cx={CANVAS_W * 0.5}
            cy={ISLAND_Y + ISLAND_H * 0.85}
            r={ISLAND_W * 0.6}
            color="rgba(0,180,255,0.06)"
          />

          {/* Island dirt (bottom layer) */}
          <RoundedRect
            x={ISLAND_X}
            y={ISLAND_Y + ISLAND_H * 0.3}
            width={ISLAND_W}
            height={ISLAND_H * 0.75}
            r={30}
            color="#5c3d1e"
          />

          {/* Island grass (top layer) */}
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
            height={ISLAND_H * 0.25}
            r={25}
            color="rgba(80,180,80,0.3)"
          />

          {/* Trees */}
          {TREES.map((tree, i) => {
            const tx = ISLAND_X + tree.x * ISLAND_W;
            const ty = ISLAND_Y + tree.y * ISLAND_H * 0.6;
            const s = tree.size;
            return (
              <Group key={`tree-${i}`}>
                {/* Trunk */}
                <Rect
                  x={tx - 3 * s}
                  y={ty}
                  width={6 * s}
                  height={22 * s}
                  color="#5c3d1e"
                />
                {/* Canopy */}
                <Circle cx={tx} cy={ty - 4 * s} r={14 * s} color="#2d6830" />
                <Circle cx={tx} cy={ty - 8 * s} r={10 * s} color="rgba(60,140,60,0.6)" />
              </Group>
            );
          })}

          {/* Obama sprites */}
          {obamas.map((o) => {
            const s = spriteData.current[o.id];
            if (!s) return null;
            const opacity = s.ascending ? Math.max(0, 1 - s.ascendProgress) : 1;
            const headImg = o.isMichelle ? michelleHead : obamaHead;
            const headSize = 20;
            const isWalking = s.state === 'walking' && !s.ascending;
            const armSwing = isWalking ? Math.sin(s.walkPhase) * 18 : 4;
            const legSwing = isWalking ? Math.sin(s.walkPhase + Math.PI) * 14 : 0;
            const bobY = isWalking ? Math.sin(s.walkPhase * 2) * 1.5 : Math.sin(s.walkPhase * 0.3) * 0.8;
            const x = s.x;
            const y = s.y + bobY;

            // Rare coloring
            const isGolden = o.rareType === 'color' && o.rareTrait === 'golden';
            const isGhost = o.rareType === 'color' && o.rareTrait === 'ghost';
            const limbColor = isGolden ? '#ffd700' : isGhost ? 'rgba(200,200,255,0.4)' : '#ffffff';
            const headScale = o.rareType === 'deformity' && o.rareTrait === 'huge_head' ? 1.5
              : o.rareType === 'deformity' && o.rareTrait === 'tiny_head' ? 0.6 : 1;
            const finalHeadSize = headSize * headScale;
            const effectiveOpacity = opacity * (isGhost ? 0.45 : 1);

            // Torso
            const torsoTop = y;
            const torsoBottom = y + 22;
            // Arm endpoints
            const lArmX = x + Math.sin((armSwing * Math.PI) / 180) * 12;
            const rArmX = x - Math.sin((armSwing * Math.PI) / 180) * 12;
            const armY = torsoTop + 5;
            const armEndY = torsoTop + 18;
            // Leg endpoints
            const lLegX = x + 4 + Math.sin((legSwing * Math.PI) / 180) * 8;
            const rLegX = x - 4 - Math.sin((legSwing * Math.PI) / 180) * 8;
            const legEndY = torsoBottom + 18;
            const flipX = s.facingRight ? 1 : -1;

            return (
              <Group key={o.id} opacity={effectiveOpacity}>
                {/* Hat for rare */}
                {o.rareType === 'hat' && (
                  <Circle cx={x} cy={y - finalHeadSize - 8} r={6} color="#ffd700" />
                )}

                {/* Head */}
                {headImg && (
                  <SkiaImage
                    image={headImg}
                    x={x - finalHeadSize / 2}
                    y={y - finalHeadSize - 4}
                    width={finalHeadSize}
                    height={finalHeadSize}
                    fit="cover"
                  />
                )}

                {/* Torso */}
                <Line p1={vec(x, torsoTop)} p2={vec(x, torsoBottom)} color={limbColor} strokeWidth={2} />

                {/* Left arm */}
                <Line p1={vec(x, armY)} p2={vec(lArmX, armEndY)} color={limbColor} strokeWidth={1.5} />
                {/* Right arm */}
                <Line p1={vec(x, armY)} p2={vec(rArmX, armEndY)} color={limbColor} strokeWidth={1.5} />

                {/* Left leg */}
                <Line p1={vec(x, torsoBottom)} p2={vec(lLegX, legEndY)} color={limbColor} strokeWidth={1.5} />
                {/* Right leg */}
                <Line p1={vec(x, torsoBottom)} p2={vec(rLegX, legEndY)} color={limbColor} strokeWidth={1.5} />

                {/* Name tag */}
                {o.isMichelle ? (
                  <Rect x={x - 18} y={legEndY + 3} width={36} height={10} color="rgba(255,105,180,0.5)" />
                ) : null}
              </Group>
            );
          })}

          {/* Water ripples */}
          <Circle cx={CANVAS_W * 0.2} cy={CANVAS_H * 0.92} r={20} color="rgba(0,180,255,0.05)" />
          <Circle cx={CANVAS_W * 0.7} cy={CANVAS_H * 0.88} r={15} color="rgba(0,180,255,0.04)" />
        </Canvas>
      </Pressable>
    );
  };

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

      {/* Canvas */}
      {renderCanvas()}

      {/* Release All Button */}
      {obamas.length > 0 && (
        <Pressable onPress={handleReleaseAll} style={styles.releaseAllBtn}>
          <Text style={styles.releaseAllText}>RELEASE ALL TO THE PHYSICAL WORLD</Text>
        </Pressable>
      )}

      {obamas.length === 0 && !Object.keys(ascending).length && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>THE ISLAND IS EMPTY</Text>
          <Text style={styles.emptySubtext}>Clone more Obamas at HQ</Text>
        </View>
      )}

      {/* Selection Modal */}
      <Modal visible={!!selectedObama} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedId(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalName}>{selectedObama?.name}</Text>
            <Text style={styles.modalId}>#{String(selectedObama?.id || 0).padStart(4, '0')}</Text>
            {selectedObama?.isRare && (
              <Text style={styles.modalRare}>✦ RARE ✦</Text>
            )}
            {selectedObama?.isMichelle && (
              <Text style={[styles.modalRare, { color: '#ff69b4' }]}>✦ MICHELLE ✦</Text>
            )}

            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Rename..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              onSubmitEditing={() => handleRename(selectedObama?.id)}
            />

            <View style={styles.modalBtns}>
              <Pressable
                style={styles.modalBtn}
                onPress={() => handleRename(selectedObama?.id)}
              >
                <Text style={styles.modalBtnText}>RENAME</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { borderColor: 'rgba(0,229,255,0.4)' }]}
                onPress={() => handleSetHQ(selectedObama?.id)}
              >
                <Text style={[styles.modalBtnText, { color: '#00e5ff' }]}>SET AS HQ</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { borderColor: 'rgba(255,59,59,0.4)' }]}
                onPress={() => handleRelease(selectedObama?.id)}
              >
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
    paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  countText: { color: '#00e5ff', fontSize: 13, fontFamily: MONO, fontWeight: '500' },
  canvasWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseAllBtn: {
    marginHorizontal: 24, marginBottom: 30, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,59,59,0.25)',
    backgroundColor: 'rgba(255,59,59,0.06)',
    alignItems: 'center',
  },
  releaseAllText: {
    color: 'rgba(255,59,59,0.7)', fontSize: 10, letterSpacing: 4, fontWeight: '500',
  },
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
    color: '#fff', fontSize: 14, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.04)',
    textAlign: 'center', letterSpacing: 2,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  modalBtnText: { fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, fontWeight: '500' },
});
