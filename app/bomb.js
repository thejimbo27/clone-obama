import React, { Suspense } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';

const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';

const BombCanvas = React.lazy(() => import('../components/BombCanvas'));

function LoadingFallback() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#007aff" />
      <Text style={styles.loaderText}>ARMING SYSTEMS...</Text>
    </View>
  );
}

export default function BombScreen() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BombCanvas />
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
