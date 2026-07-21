/**
 * BodyScan home — scan history, latest result, start-a-scan.
 * New standalone route (/bodyscan). Nothing in the existing app links here
 * yet, so shipping this file has zero effect on current navigation.
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Linking, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

import { listScans, MineResponse, ScanSummary } from '../../lib/bodyscan';

const GOLD = '#e3b04b';
const BG = '#0d0f12';
const CARD = '#16191e';

export default function BodyScanHome() {
  const [data, setData] = useState<MineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await listScans());
    } catch (e: any) {
      setError(e?.message ?? 'Could not load scans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const latest = data?.scans.find((s) => s.status === 'complete');
  const pricing = data?.pricing;

  const priceLabel =
    pricing?.mode === 'free' ? 'Included with your plan'
    : pricing?.mode === 'paid' ? `$${pricing.price_usd} per scan · credits: ${pricing.credits}`
    : 'Requires an active membership';

  return (
    <View style={st.root}>
      <Text style={st.h1}>BodyScan</Text>
      <Text style={st.sub}>360° body-composition tracking</Text>

      {latest && (
        <TouchableOpacity
          style={st.hero}
          onPress={() => router.push(`/bodyscan/report?id=${latest.id}`)}
        >
          <Text style={st.heroNum}>{latest.bf_percent}%</Text>
          <Text style={st.heroSub}>
            latest body fat · {latest.bf_low}–{latest.bf_high}% · {latest.category}
          </Text>
          <Text style={st.heroLink}>View full report →</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={st.cta} onPress={() => router.push('/bodyscan/capture')}>
        <Text style={st.ctaText}>Start a new scan</Text>
        <Text style={st.ctaSub}>{priceLabel}</Text>
      </TouchableOpacity>

      {pricing?.mode === 'paid' && pricing.credits < 1 && !!pricing.payment_url && (
        <TouchableOpacity onPress={() => Linking.openURL(pricing.payment_url)}>
          <Text style={st.payLink}>
            Pay for a scan (${pricing.price_usd}) — your coach adds the credit after payment
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={st.err}>{error}</Text>
      ) : (
        <FlatList
          style={{ marginTop: 16 }}
          data={data?.scans ?? []}
          keyExtractor={(s) => String(s.id)}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} tintColor={GOLD} />
          }
          renderItem={({ item }) => <ScanRow scan={item} />}
          ListEmptyComponent={
            <Text style={st.empty}>
              No scans yet. Your first scan takes about two minutes.
            </Text>
          }
        />
      )}
    </View>
  );
}

function ScanRow({ scan }: { scan: ScanSummary }) {
  const done = scan.status === 'complete';
  return (
    <TouchableOpacity
      style={st.row}
      disabled={!done}
      onPress={() => router.push(`/bodyscan/report?id=${scan.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={st.rowDate}>{scan.created_at?.slice(0, 10)}</Text>
        {scan.status === 'failed' && (
          <Text style={st.rowFail}>{scan.fail_reason ?? 'Scan failed — try again'}</Text>
        )}
        {!done && scan.status !== 'failed' && (
          <Text style={st.rowPending}>Processing… check back in a few minutes</Text>
        )}
      </View>
      {done && <Text style={st.rowBf}>{scan.bf_percent}%</Text>}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, padding: 20, paddingTop: 64 },
  h1: { color: GOLD, fontSize: 28, fontWeight: '800' },
  sub: { color: '#9aa0a6', marginBottom: 20 },
  hero: {
    backgroundColor: CARD, borderRadius: 14, padding: 22,
    alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#2a2f36',
  },
  heroNum: { color: GOLD, fontSize: 44, fontWeight: '800' },
  heroSub: { color: '#9aa0a6', marginTop: 4 },
  heroLink: { color: GOLD, marginTop: 10, fontWeight: '600' },
  cta: {
    backgroundColor: GOLD, borderRadius: 14, padding: 18, alignItems: 'center',
  },
  ctaText: { color: '#111', fontSize: 17, fontWeight: '800' },
  ctaSub: { color: '#333', marginTop: 2, fontSize: 12 },
  payLink: { color: GOLD, textAlign: 'center', marginTop: 12, textDecorationLine: 'underline' },
  row: {
    backgroundColor: CARD, borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  rowDate: { color: '#e8e8e8', fontWeight: '600' },
  rowBf: { color: GOLD, fontSize: 20, fontWeight: '800' },
  rowPending: { color: '#9aa0a6', fontSize: 12, marginTop: 2 },
  rowFail: { color: '#e07070', fontSize: 12, marginTop: 2 },
  empty: { color: '#9aa0a6', textAlign: 'center', marginTop: 32 },
  err: { color: '#e07070', textAlign: 'center', marginTop: 32 },
});
