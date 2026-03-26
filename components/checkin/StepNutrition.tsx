import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { useFoodLog } from '../../hooks/useFoodLog';
import { Input } from '../ui/Input';
import { WaterTracker } from './WaterTracker';
import { HealthKitImportButton } from './HealthKitImportButton';
import { useHealthKit } from '../../hooks/useHealthKit';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

export function StepNutrition() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();
  const { totals, hasEntries } = useFoodLog();
  const { available, authorized, requestPermission, getTodayCaloriesBurned } = useHealthKit();

  const handleHealthImport = async () => {
    await requestPermission();
    const calories = await getTodayCaloriesBurned();
    if (calories > 0) {
      updateForm({ calories: String(calories) });
    }
  };

  const handleUseFoodLogTotals = () => {
    updateForm({
      calories: String(Math.round(totals.calories)),
      protein_g: String(Math.round(totals.protein_g)),
      carbs_g: String(Math.round(totals.carbs_g)),
      fat_g: String(Math.round(totals.fat_g)),
    });
  };

  const macros = [
    { key: 'calories' as const, label: 'Calories', target: client?.target_calories, unit: 'kcal' },
    { key: 'protein_g' as const, label: 'Protein', target: client?.target_protein, unit: 'g' },
    { key: 'carbs_g' as const, label: 'Carbs', target: client?.target_carbs, unit: 'g' },
    { key: 'fat_g' as const, label: 'Fat', target: client?.target_fats, unit: 'g' },
  ];

  return (
    <View>
      <HealthKitImportButton
        onImport={handleHealthImport}
        label="Import calories from Apple Health"
        dataTypes="active energy burned (calories)"
        available={available}
        authorized={authorized}
        onRequestPermission={requestPermission}
      />

      {hasEntries && (
        <TouchableOpacity style={styles.foodLogImport} onPress={handleUseFoodLogTotals}>
          <View style={styles.foodLogImportLeft}>
            <Ionicons name="nutrition" size={18} color={colors.accent} />
            <View>
              <Text style={styles.foodLogImportTitle}>Use Food Log Totals</Text>
              <Text style={styles.foodLogImportSub}>
                {Math.round(totals.calories)} cal | {Math.round(totals.protein_g)}g P | {Math.round(totals.carbs_g)}g C | {Math.round(totals.fat_g)}g F
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-down-circle" size={20} color={colors.accent} />
        </TouchableOpacity>
      )}

      {macros.map((m) => {
        const current = parseFloat(form[m.key]) || 0;
        const pct = m.target ? Math.min((current / m.target) * 100, 100) : 0;

        return (
          <View key={m.key} style={styles.macroField}>
            <View style={styles.macroHeader}>
              <Text style={styles.label}>{m.label}</Text>
              {m.target ? (
                <Text style={styles.target}>
                  {current > 0 ? `${current} / ${m.target} ${m.unit} (${Math.round(pct)}%)` : `Target: ${m.target} ${m.unit}`}
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
  foodLogImport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  foodLogImportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  foodLogImportTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  foodLogImportSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
