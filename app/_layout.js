import { Stack } from 'expo-router';
import { ObamaProvider } from '../context/ObamaContext';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';
import { useState, useEffect } from 'react';

function SkiaLoader({ children }) {
  const [ready, setReady] = useState(Platform.OS !== 'web');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      (async () => {
        try {
          const { LoadSkiaWeb } = await import(
            '@shopify/react-native-skia/lib/module/web'
          );
          await LoadSkiaWeb({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
          });
          console.log('CanvasKit loaded:', !!global.CanvasKit);
          setReady(true);
        } catch (e) {
          console.error('Skia web load failed:', e);
          setError(e);
          // Still allow app to render — island will show fallback
          setReady(true);
        }
      })();
    }
  }, []);

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00e5ff" />
        <Text style={styles.loaderText}>INITIALIZING SYSTEMS...</Text>
      </View>
    );
  }
  return children;
}

export default function Layout() {
  return (
    <SkiaLoader>
      <ObamaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#f5f5f7' },
            animation: 'fade',
          }}
        />
      </ObamaProvider>
    </SkiaLoader>
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
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 12,
    letterSpacing: 3,
  },
});
