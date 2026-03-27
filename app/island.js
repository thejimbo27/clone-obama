import React, { Suspense } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';

const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

// React.lazy defers module evaluation of IslandCanvas (which imports Skia)
// until this component actually renders. By then, _layout.js's SkiaLoader
// has already called LoadSkiaWeb() and set global.CanvasKit.
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
  return (
    <Suspense fallback={<LoadingFallback />}>
      <IslandCanvas />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#080e1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#00e5ff',
    marginTop: 16,
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: 3,
  },
});
