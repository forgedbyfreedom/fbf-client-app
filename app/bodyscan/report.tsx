/**
 * BodyScan report — renders the HTML report from WordPress in a WebView.
 * Route: /bodyscan/report?id=123
 */

import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { fetchReportHtml } from '../../lib/bodyscan';

export default function BodyScanReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchReportHtml(Number(id))
      .then(setHtml)
      .catch((e) => setError(e?.message ?? 'Could not load report'));
  }, [id]);

  if (error) {
    return (
      <View style={st.center}>
        <Text style={st.err}>{error}</Text>
      </View>
    );
  }
  if (!html) {
    return (
      <View style={st.center}>
        <ActivityIndicator color="#e3b04b" />
      </View>
    );
  }
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: '#0d0f12' }}
    />
  );
}

const st = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0d0f12',
  },
  err: { color: '#e07070', padding: 24, textAlign: 'center' },
});
