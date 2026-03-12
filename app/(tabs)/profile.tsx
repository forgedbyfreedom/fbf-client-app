import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, client, signOut } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);

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
      <Text style={styles.title}>Profile</Text>

      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>
            {client ? `${client.first_name} ${client.last_name}` : '--'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email ?? '--'}</Text>
        </View>
        {client?.timezone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timezone</Text>
            <Text style={styles.infoValue}>{client.timezone}</Text>
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
            onValueChange={setPushEnabled}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <Button
          title="Bloodwork AI Analysis"
          variant="secondary"
          onPress={() => {
            const url = process.env.EXPO_PUBLIC_API_URL;
            if (url) Linking.openURL(`${url}/bloodwork`);
          }}
          style={styles.linkBtn}
        />
        <Button
          title="FBF Shop"
          variant="secondary"
          onPress={() => Linking.openURL('https://www.etsy.com/shop/FBFStrengthNutrition')}
          style={styles.linkBtn}
        />
      </Card>

      <Button
        title="Sign Out"
        variant="ghost"
        onPress={handleSignOut}
        textStyle={styles.signOutText}
        style={styles.signOutBtn}
      />

      <Text style={styles.version}>Forged by Freedom v1.0.0</Text>
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
