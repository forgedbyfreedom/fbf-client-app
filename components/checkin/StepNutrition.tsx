import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { WaterTracker } from './WaterTracker';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

export function StepNutrition() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();

  const macros = [
    { key: 'calories' as const, label: 'Calories', target: client?.target_calories, unit: 'kcal' },
    { key: 'protein_g' as const, label: 'Protein', target: client?.target_protein, unit: 'g' },
    { key: 'carbs_g' as const, label: 'Carbs', target: client?.target_carbs, unit: 'g' },
    { key: 'fat_g' as const, label: 'Fat', target: client?.target_fats, unit: 'g' },
  ];

  return (
    <View>
      {macros.map((m) => {
        const current = parseFloat(form[m.key]) || 0;
        const pct = m.target ? Math.min((current / m.target) * 100, 100) : 0;

        return (
          <View key={m.key} style={styles.macroField}>
            <View style={styles.macroHeader}>
              <Text style={styles.label}>{m.label}</Text>
              {m.target ? (
                <Text style={styles.target}>
                  Target: {m.target} {m.unit}
                </Text>
              ) : null}
            </View>
            <Input
              value={form[m.key]}
              onChangeText={(t) => updateForm({ [m.key]: t })}
              placeholder={`Enter ${m.label.toLowerCase()}`}
              keyboardType="numeric"
            />
            {m.target ? (
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct}%`,
                      backgroundColor:
                        pct >= 90 ? colors.green : pct >= 60 ? colors.yellow : colors.red,
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      <WaterTracker
        value={form.water_oz}
        onChange={(v) => updateForm({ water_oz: v })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  macroField: {
    marginBottom: spacing.lg,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  target: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  barBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
