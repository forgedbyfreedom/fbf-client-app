import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { AppleHealthConnect } from '../../components/settings/AppleHealthConnect';
import { OuraConnect } from '../../components/settings/OuraConnect';
import { GarminConnect } from '../../components/settings/GarminConnect';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

const PUSH_PREF_KEY = 'fbf_push_enabled';
const VOICE_PREF_KEY = 'fbf_voice_preference';

export type VoicePreference = 'male' | 'female';
export const VOICE_IDS: Record<VoicePreference, string> = {
  male: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_MALE || 'F3hPNAbHQ6mTZdjfgZdb',
  female: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_FEMALE || 'eL7xfWghif0oJwtmX2qs',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, client, signOut, isDemoMode, toggleDemoMode } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [voicePref, setVoicePref] = useState<VoicePreference>('male');

  useEffect(() => {
    AsyncStorage.getItem(PUSH_PREF_KEY).then((val) => {
      if (val !== null) setPushEnabled(val === 'true');
    });
    AsyncStorage.getItem(VOICE_PREF_KEY).then((val) => {
      if (val === 'male' || val === 'female') setVoicePref(val);
    });
  }, []);

  const togglePush = (value: boolean) => {
    setPushEnabled(value);
    AsyncStorage.setItem(PUSH_PREF_KEY, String(value));
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl },
      ]}
    >
      <BrandHeader title="Profile" />

      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {client ? `${client.first_name} ${client.last_name}` : '--'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{user?.email ?? '--'}</Text>
        </View>
        {client?.timezone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timezone</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{client.timezone}</Text>
          </View>
        )}
        {client?.weigh_in_day && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weigh-in Day</Text>
            <Text style={styles.infoValue}>
              {client.weigh_in_day.charAt(0).toUpperCase() + client.weigh_in_day.slice(1)}
            </Text>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Text style={styles.switchSub}>
              Reminders, motivational messages, coach updates
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={togglePush}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>AI Coach Voice</Text>
        <Text style={styles.switchSub}>Choose the voice for AI Coach responses</Text>
        <View style={styles.voiceOptions}>
          <TouchableOpacity
            style={[styles.voiceOption, voicePref === 'male' && styles.voiceOptionActive]}
            onPress={() => {
              setVoicePref('male');
              AsyncStorage.setItem(VOICE_PREF_KEY, 'male');
            }}
          >
            <Ionicons
              name="man"
              size={24}
              color={voicePref === 'male' ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.voiceOptionText, voicePref === 'male' && styles.voiceOptionTextActive]}>
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voiceOption, voicePref === 'female' && styles.voiceOptionActive]}
            onPress={() => {
              setVoicePref('female');
              AsyncStorage.setItem(VOICE_PREF_KEY, 'female');
            }}
          >
            <Ionicons
              name="woman"
              size={24}
              color={voicePref === 'female' ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.voiceOptionText, voicePref === 'female' && styles.voiceOptionTextActive]}>
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        <AppleHealthConnect />
        <OuraConnect />
        <GarminConnect />
      </Card>

      <TouchableOpacity
        style={styles.supplementsBtn}
        onPress={() => router.push('/supplements')}
        activeOpacity={0.7}
      >
        <View style={styles.supplementsBtnIcon}>
          <Ionicons name="flask-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.supplementsBtnContent}>
          <Text style={styles.supplementsBtnTitle}>My Supplements & Protocols</Text>
          <Text style={styles.supplementsBtnSub}>
            Track daily compliance, peptides, compounds & more
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.supplementsBtn}
        onPress={() => router.push('/gyms')}
        activeOpacity={0.7}
      >
        <View style={styles.supplementsBtnIcon}>
          <Ionicons name="location-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.supplementsBtnContent}>
          <Text style={styles.supplementsBtnTitle}>Gyms Near Me</Text>
          <Text style={styles.supplementsBtnSub}>
            Find nearby gyms, ratings, hours & directions
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.supplementsBtn}
        onPress={() => router.push('/challenges')}
        activeOpacity={0.7}
      >
        <View style={styles.supplementsBtnIcon}>
          <Ionicons name="trophy-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.supplementsBtnContent}>
          <Text style={styles.supplementsBtnTitle}>Challenges & Contests</Text>
          <Text style={styles.supplementsBtnSub}>
            Compete in community challenges with % based rankings
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <Button
          title="Forged by Freedom"
          variant="secondary"
          onPress={() => Linking.openURL('https://forgedbyfreedom.org')}
          style={styles.linkBtn}
        />
        <Button
          title="FBF Recomp Protocol"
          variant="secondary"
          onPress={() => Linking.openURL('https://www.forgedbyfreedom.org/fbf-recomp-protocol')}
          style={styles.linkBtn}
        />
        <Button
          title="FBF Sports Picks"
          variant="secondary"
          onPress={() => Linking.openURL('https://data.forgedbyfreedom.org')}
          style={styles.linkBtn}
        />
        <Button
          title="My Web Dashboard"
          variant="secondary"
          onPress={() => Linking.openURL('https://fbf-dashboard.vercel.app/portal')}
          style={styles.linkBtn}
        />
        <Button
          title="Bloodwork AI Analysis"
          variant="secondary"
          onPress={() => router.push('/(tabs)/ai-coach')}
          style={styles.linkBtn}
        />
        <Button
          title="FBF Shop"
          variant="secondary"
          onPress={() => Linking.openURL('https://www.etsy.com/shop/FBFStrengthNutrition')}
          style={styles.linkBtn}
        />
      </Card>

      {__DEV__ && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Demo Mode</Text>
              <Text style={styles.switchSub}>
                {isDemoMode ? 'Showing sample data (Marcus Rivera, 90 days)' : 'Load sample data to preview all features'}
              </Text>
            </View>
            <Switch
              value={isDemoMode}
              onValueChange={toggleDemoMode}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </Card>
      )}

      <Button
        title="Sign Out"
        variant="ghost"
        onPress={handleSignOut}
        textStyle={styles.signOutText}
        style={styles.signOutBtn}
      />

      <Text style={styles.version}>Forged by Freedom v1.1.1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  switchSub: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
    maxWidth: 240,
  },
  voiceOptions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  voiceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
  },
  voiceOptionActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
  },
  voiceOptionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  voiceOptionTextActive: {
    color: colors.accent,
  },
  supplementsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  supplementsBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplementsBtnContent: {
    flex: 1,
  },
  supplementsBtnTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  supplementsBtnSub: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  linkBtn: {
    marginTop: spacing.xs,
  },
  signOutBtn: {
    marginTop: spacing.md,
  },
  signOutText: {
    color: colors.red,
  },
  version: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
  },
});
