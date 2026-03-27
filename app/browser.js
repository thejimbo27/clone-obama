import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const MONO = Platform.OS === 'web' ? 'monospace' : 'Courier';
const DEFAULT_URL = 'https://en.wikipedia.org/wiki/Barack_Obama';

function WebViewNative({ uri }) {
  try {
    const { WebView } = require('react-native-webview');
    return <WebView source={{ uri }} style={{ flex: 1 }} />;
  } catch (e) { return null; }
}

function WebViewWeb({ uri }) {
  return (
    <iframe
      src={uri}
      style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}

export default function BrowserScreen() {
  const router = useRouter();
  const [url, setUrl] = useState(DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);

  const go = useCallback(() => {
    let u = inputUrl.trim();
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    setUrl(u);
  }, [inputUrl]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ HQ</Text>
        </Pressable>
        <Text style={styles.headerTitle}>BROWSER</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.urlBar}>
        <TextInput
          style={styles.urlInput}
          value={inputUrl}
          onChangeText={setInputUrl}
          onSubmitEditing={go}
          placeholder="Enter URL..."
          placeholderTextColor="rgba(0,0,0,0.2)"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable onPress={go} style={styles.goBtn}>
          <Text style={styles.goText}>GO</Text>
        </Pressable>
      </View>

      <View style={styles.webview}>
        {Platform.OS === 'web' ? <WebViewWeb uri={url} /> : <WebViewNative uri={url} />}
      </View>

      <Text style={styles.footer}>OBAMA WEB ACCESS · CLASSIFIED</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 10,
  },
  backBtn: { width: 60 },
  backText: { color: '#007aff', fontSize: 15, fontWeight: '400', letterSpacing: 1 },
  headerTitle: { fontSize: 12, color: 'rgba(0,0,0,0.35)', letterSpacing: 6, fontWeight: '300' },
  urlBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden',
  },
  urlInput: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 12,
    color: '#1a1a1a', fontSize: 13, fontFamily: MONO,
  },
  goBtn: {
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: 'rgba(0,122,255,0.06)',
    borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.06)',
  },
  goText: { color: '#007aff', fontSize: 12, fontWeight: '600', letterSpacing: 2 },
  webview: {
    flex: 1, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  footer: {
    fontSize: 8, color: 'rgba(0,0,0,0.1)', letterSpacing: 4,
    textAlign: 'center', paddingVertical: 12,
  },
});
