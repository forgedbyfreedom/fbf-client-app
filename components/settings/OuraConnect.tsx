import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

const OURA_TOKEN_KEY = 'fbf_oura_token';
const OURA_LAST_SYNC_KEY = 'fbf_oura_last_sync';

export function OuraConnect() {
  const [token, setToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(OURA_TOKEN_KEY).then((val) => {
      if (val) setToken(val);
    });
    AsyncStorage.getItem(OURA_LAST_SYNC_KEY).then((val) => {
      if (val) setLastSync(val);
    });
  }, []);

  const handleConnect = async () => {
    const trimmed = inputToken.trim();
    if (!trimmed) {
      Alert.alert('Token Required', 'Please enter your Oura Personal Access Token.');
      return;
    }

    setLoading(true);
    try {
      // Validate the token by making a test request
      const res = await fetch(
        'https://api.ouraring.com/v2/usercollection/personal_info',
        { headers: { Authorization: `Bearer ${trimmed}` } }
      );

      if (!res.ok) {
        Alert.alert('Invalid Token', 'Could not connect to Oura. Please check your token and try again.');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem(OURA_TOKEN_KEY, trimmed);
      const now = new Date().toLocaleString();
      await AsyncStorage.setItem(OURA_LAST_SYNC_KEY, now);
      setToken(trimmed);
      setLastSync(now);
      setInputToken('');
      setShowInput(false);
      Alert.alert('Connected', 'Oura Ring connected successfully.');
    } catch {
      Alert.alert('Error', 'Failed to verify Oura token. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Oura', 'Are you sure you want to disconnect your Oura Ring?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(OURA_TOKEN_KEY);
          await AsyncStorage.removeItem(OURA_LAST_SYNC_KEY);
          setToken(null);
          setLastSync(null);
          setShowInput(false);
        },
      },
    ]);
  };

  if (token) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedRow}>
          <View style={styles.connectedInfo}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              <Text style={styles.connectedText}>Oura Ring Connected</Text>
            </View>
            {lastSync && (
              <Text style={styles.syncText}>Last synced: {lastSync}</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
            <Ionicons name="close-circle-outline" size={22} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showInput ? (
        <TouchableOpacity style={styles.connectBtn} onPress={() => setShowInput(true)}>
          <Ionicons name="watch-outline" size={20} color={colors.accent} />
          <Text style={styles.connectText}>Connect Oura Ring</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            Enter your Oura Personal Access Token
          </Text>
          <Text style={styles.inputHint}>
            Get yours at cloud.ouraring.com/personal-access-tokens
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Paste token here..."
            placeholderTextColor={colors.textTertiary}
            value={inputToken}
            onChangeText={setInputToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowInput(false);
                setInputToken('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={handleConnect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>Connect</Text>
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
  disconnectBtn: {
    padding: spacing.sm,
  },
  inputSection: {
    gap: spacing.sm,
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
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    minWidth: 90,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
});
