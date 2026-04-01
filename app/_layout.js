import { Stack } from 'expo-router';
import { ObamaProvider } from '../context/ObamaContext';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';

function SkiaLoader({ children }) {
  useEffect(() => {
    if (Platform.OS === 'web' && !global.CanvasKit) {
      (async () => {
        try {
          const { LoadSkiaWeb } = await import(
            '@shopify/react-native-skia/lib/module/web'
          );
          await LoadSkiaWeb({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
          });
        } catch {}
      })();
    }
  }, []);

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

