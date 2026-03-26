import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { useAuth } from '../../hooks/useAuth';

const GARMIN_CONNECTED_KEY = 'fbf_garmin_connected';
const GARMIN_LAST_SYNC_KEY = 'fbf_garmin_last_sync';
const GARMIN_BLUE = '#007CC3';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3003';

export function GarminConnect() {
  const { client } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteData, setPasteData] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(GARMIN_CONNECTED_KEY).then((val) => {
      if (val === 'true') setConnected(true);
    });
    AsyncStorage.getItem(GARMIN_LAST_SYNC_KEY).then((val) => {
      if (val) setLastSync(val);
    });
  }, []);

  const handleExportGuide = () => {
    Alert.alert(
      'Export from Garmin Connect',
      'To export your Garmin data:\n\n' +
        '1. Log in to connect.garmin.com\n' +
        '2. Go to your profile icon > Account Settings\n' +
        '3. Select "Export Your Data"\n' +
        '4. Download the JSON summary file\n' +
        '5. Come back here and use "Paste Data" to import it',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Garmin Connect',
          onPress: () => Linking.openURL('https://connect.garmin.com'),
        },
      ]
    );
  };

  const handlePasteImport = async () => {
    const trimmed = pasteData.trim();
    if (!trimmed) {
      Alert.alert('No Data', 'Please paste your Garmin JSON data first.');
      return;
    }

    setLoading(true);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        Alert.alert(
          'Invalid JSON',
          'The pasted data is not valid JSON. Please copy the data directly from your Garmin export.'
        );
        setLoading(false);
        return;
      }

      // Normalize: accept a single object or array
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];

      const res = await fetch(`${API_URL}/api/garmin/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client?.id || null,
          data: dataArray,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        Alert.alert('Import Failed', result.error || 'Unknown error occurred.');
        setLoading(false);
        return;
      }

      const now = new Date().toLocaleString();
      await AsyncStorage.setItem(GARMIN_CONNECTED_KEY, 'true');
      await AsyncStorage.setItem(GARMIN_LAST_SYNC_KEY, now);
      setConnected(true);
      setLastSync(now);
      setPasteData('');
      setShowPaste(false);
      setShowOptions(false);
      Alert.alert('Import Successful', `Imported ${result.imported} record(s) from Garmin.`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to import data. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Garmin', 'Are you sure you want to disconnect Garmin Connect?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(GARMIN_CONNECTED_KEY);
          await AsyncStorage.removeItem(GARMIN_LAST_SYNC_KEY);
          setConnected(false);
          setLastSync(null);
          setShowOptions(false);
          setShowPaste(false);
        },
      },
    ]);
  };

  // Connected state
  if (connected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedRow}>
          <View style={styles.connectedInfo}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              <Text style={styles.connectedText}>Garmin Connected</Text>
            </View>
            {lastSync && (
              <Text style={styles.syncText}>Last synced: {lastSync}</Text>
            )}
          </View>
          <View style={styles.connectedActions}>
            <TouchableOpacity
              onPress={() => {
                setShowPaste(true);
                setShowOptions(false);
              }}
              style={styles.resyncBtn}
            >
              <Ionicons name="sync-outline" size={18} color={GARMIN_BLUE} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
              <Ionicons name="close-circle-outline" size={22} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        {showPaste && (
          <View style={styles.pasteSection}>
            <Text style={styles.inputLabel}>Paste updated Garmin data (JSON)</Text>
            <TextInput
              style={styles.pasteInput}
              placeholder='[{"calendarDate":"2026-03-17","steps":8500,...}]'
              placeholderTextColor={colors.textTertiary}
              value={pasteData}
              onChangeText={setPasteData}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowPaste(false);
                  setPasteData('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importBtn, loading && styles.btnDisabled]}
                onPress={handlePasteImport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.importText}>Import</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Not connected — show connect button or options
  return (
    <View style={styles.container}>
      {!showOptions ? (
        <TouchableOpacity style={styles.connectBtn} onPress={() => setShowOptions(true)}>
          <Ionicons name="watch-outline" size={20} color={GARMIN_BLUE} />
          <Text style={styles.connectText}>Connect Garmin</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : !showPaste ? (
        <View style={styles.optionsSection}>
          <Text style={styles.optionsTitle}>Garmin Connect Integration</Text>
          <Text style={styles.optionsHint}>
            Choose how to sync your Garmin data with FBF
          </Text>

          <TouchableOpacity style={styles.optionBtn} onPress={handleExportGuide}>
            <View style={styles.optionIcon}>
              <Ionicons name="download-outline" size={22} color={GARMIN_BLUE} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Sync from Garmin Connect</Text>
              <Text style={styles.optionDesc}>
                Export data from connect.garmin.com and import here
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionBtn} onPress={() => setShowPaste(true)}>
            <View style={styles.optionIcon}>
              <Ionicons name="clipboard-outline" size={22} color={GARMIN_BLUE} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Paste Data</Text>
              <Text style={styles.optionDesc}>
                Paste JSON data exported from Garmin Connect
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setShowOptions(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pasteSection}>
          <Text style={styles.inputLabel}>Paste Garmin JSON Data</Text>
          <Text style={styles.inputHint}>
            Paste your exported Garmin daily summary JSON below. Accepts a single object or an
            array of daily summaries.
          </Text>
          <TextInput
            style={styles.pasteInput}
            placeholder='[{"calendarDate":"2026-03-17","steps":8500,"restingHeartRate":58,...}]'
            placeholderTextColor={colors.textTertiary}
            value={pasteData}
            onChangeText={setPasteData}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowPaste(false);
                setPasteData('');
              }}
            >
              <Text style={styles.cancelText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importBtn, loading && styles.btnDisabled]}
              onPress={handlePasteImport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.importText}>Import Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  // Connect button (collapsed state)
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  connectText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  // Connected state
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectedInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connectedText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.green,
  },
  syncText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 4,
    marginLeft: 28,
  },
  connectedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resyncBtn: {
    padding: spacing.sm,
  },
  disconnectBtn: {
    padding: spacing.sm,
  },
  // Options section
  optionsSection: {
    gap: spacing.sm,
  },
  optionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionsHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 124, 195, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionDesc: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  backBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  // Paste section
  pasteSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  pasteInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    minHeight: 120,
    fontFamily: 'monospace',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  importBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: GARMIN_BLUE,
    minWidth: 100,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  importText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
});
