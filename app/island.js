import React, { Suspense, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';

const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

const IslandCanvas = React.lazy(() => import('../components/IslandCanvas'));

function LoadingFallback() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#00e5ff" />
      <Text style={styles.loaderText}>LOADING ISLAND...</Text>
    </View>
  );
}

export default function IslandScreen() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for CanvasKit WASM before letting Skia components mount
    if (global.CanvasKit) { setReady(true); return; }
    const id = setInterval(() => {
      if (global.CanvasKit) { setReady(true); clearInterval(id); }
    }, 50);
    return () => clearInterval(id);
  }, []);

  if (!ready) return <LoadingFallback />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <IslandCanvas />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#888',
    marginTop: 16,
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: 3,
  },
});
