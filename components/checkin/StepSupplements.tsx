import React, { useContext } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { CompoundLogger } from './CompoundLogger';
import { colors, fontSize, spacing } from '../../lib/theme';

export function StepSupplements() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();

  return (
    <View>
      <View style={{ backgroundColor: 'rgba(255,106,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,106,0,0.2)', borderRadius: 8, padding: 10, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, color: '#888', lineHeight: 16 }}>
          ⚠️ Compound and supplement logging is for personal tracking in an educational context only. Not a recommendation for human use. Consult a healthcare provider.
        </Text>
      </View>
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.label}>Supplement Compliance</Text>
          <Text style={styles.sublabel}>Did you take all assigned supplements?</Text>
        </View>
        <Switch
          value={form.supplement_compliance}
          onValueChange={(v) => updateForm({ supplement_compliance: v })}
          trackColor={{ false: colors.border, true: colors.green }}
          thumbColor="#fff"
        />
      </View>

      {client?.current_supplements && client.current_supplements.length > 0 && (
        <View style={styles.protocolSection}>
          <Text style={styles.protocolTitle}>Assigned Supplements</Text>
          {client.current_supplements.map((s, i) => (
            <Text key={i} style={styles.protocolItem}>
              {s.name} - {s.dose} ({s.frequency})
            </Text>
          ))}
        </View>
      )}

      <CompoundLogger
        entries={form.ped_log_json}
        onChange={(entries) => updateForm({ ped_log_json: entries })}
        clientPeds={client?.current_peds}
      />

      <Input
        label="Side Effects / Notes"
        value={form.side_effects_notes}
        onChangeText={(t) => updateForm({ side_effects_notes: t })}
        placeholder="Any side effects, reactions, or notes..."
        multiline
        numberOfLines={3}
        containerStyle={styles.field}
        style={styles.multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  protocolSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  protocolTitle: {
    fontSize: fontSize.sm,
    color: colors.gold,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  protocolItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  field: {
    marginBottom: spacing.lg,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
