import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { MealEntry, IngredientItem } from '../../lib/nutrition-api';

interface MealCardProps {
  meal: MealEntry;
  onUpdate?: (updatedMeal: MealEntry) => void;
  onDelete?: (mealId: string) => void;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
};

export function MealCard({ meal, onUpdate, onDelete }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(meal.name);
  const [editCalories, setEditCalories] = useState(String(meal.calories ?? ''));
  const [editProtein, setEditProtein] = useState(String(meal.protein_g ?? ''));
  const [editCarbs, setEditCarbs] = useState(String(meal.carbs_g ?? ''));
  const [editFat, setEditFat] = useState(String(meal.fat_g ?? ''));
  const [editIngredients, setEditIngredients] = useState<IngredientItem[]>([...meal.ingredients]);
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const icon = MEAL_ICONS[meal.type] || 'restaurant-outline';

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Allow camera access to photograph your meals.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setMealPhoto(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setMealPhoto(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    const updated: MealEntry = {
      ...meal,
      name: editName.trim() || meal.name,
      calories: editCalories ? parseFloat(editCalories) : null,
      protein_g: editProtein ? parseFloat(editProtein) : null,
      carbs_g: editCarbs ? parseFloat(editCarbs) : null,
      fat_g: editFat ? parseFloat(editFat) : null,
      ingredients: editIngredients.filter((ing) => ing.name.trim()),
    };
    onUpdate?.(updated);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(meal.name);
    setEditCalories(String(meal.calories ?? ''));
    setEditProtein(String(meal.protein_g ?? ''));
    setEditCarbs(String(meal.carbs_g ?? ''));
    setEditFat(String(meal.fat_g ?? ''));
    setEditIngredients([...meal.ingredients]);
    setEditing(false);
  };

  const handleDeleteIngredient = (index: number) => {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (index: number, field: keyof IngredientItem, value: string) => {
    setEditIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddIngredient = () => {
    setEditIngredients((prev) => [...prev, { name: '', quantity: '', unit: '', category: 'other' as any, checked: false }]);
  };

  const handleDelete = () => {
    Alert.alert('Remove Meal', `Remove "${meal.name}" from today's plan?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete?.(meal.id) },
    ]);
  };

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.mealTypeIcon}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.mealType}>{meal.type.toUpperCase()}</Text>
          {editing ? (
            <TextInput
              style={styles.editNameInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
          ) : (
            <Text style={styles.mealName}>{meal.name}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {meal.calories != null && !editing && (
            <Text style={styles.macroText}>{meal.calories} cal</Text>
          )}
          {onUpdate && !editing && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); setEditing(true); setExpanded(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded && !editing && (
        <View style={styles.details}>
          <View style={styles.macroRow}>
            {meal.protein_g != null && (
              <View style={styles.macroPill}>
                <Text style={styles.macroPillLabel}>Protein</Text>
                <Text style={styles.macroPillValue}>{meal.protein_g}g</Text>
              </View>
            )}
            {meal.carbs_g != null && (
              <View style={styles.macroPill}>
                <Text style={styles.macroPillLabel}>Carbs</Text>
                <Text style={styles.macroPillValue}>{meal.carbs_g}g</Text>
              </View>
            )}
            {meal.fat_g != null && (
              <View style={styles.macroPill}>
                <Text style={styles.macroPillLabel}>Fat</Text>
                <Text style={styles.macroPillValue}>{meal.fat_g}g</Text>
              </View>
            )}
          </View>

          {meal.ingredients.length > 0 && (
            <View style={styles.ingredientList}>
              <Text style={styles.ingredientHeader}>Ingredients</Text>
              {meal.ingredients.map((ing, i) => (
                <Text key={i} style={styles.ingredientText}>
                  {ing.quantity} {ing.unit} {ing.name}
                </Text>
              ))}
            </View>
          )}

          {/* Meal photo */}
          <View style={styles.photoSection}>
            {mealPhoto ? (
              <View>
                <Image source={{ uri: mealPhoto }} style={styles.mealPhotoImage} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setMealPhoto(null)}>
                  <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={18} color={colors.accent} />
                  <Text style={styles.photoBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                  <Ionicons name="image-outline" size={18} color={colors.accent} />
                  <Text style={styles.photoBtnText}>From Library</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {expanded && editing && (
        <View style={styles.details}>
          {/* Macro editing */}
          <Text style={styles.editSectionLabel}>MACROS</Text>
          <View style={styles.macroEditRow}>
            <View style={styles.macroEditField}>
              <Text style={styles.macroEditLabel}>Cal</Text>
              <TextInput
                style={styles.macroEditInput}
                value={editCalories}
                onChangeText={setEditCalories}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.macroEditField}>
              <Text style={styles.macroEditLabel}>Protein</Text>
              <TextInput
                style={styles.macroEditInput}
                value={editProtein}
                onChangeText={setEditProtein}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.macroEditField}>
              <Text style={styles.macroEditLabel}>Carbs</Text>
              <TextInput
                style={styles.macroEditInput}
                value={editCarbs}
                onChangeText={setEditCarbs}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.macroEditField}>
              <Text style={styles.macroEditLabel}>Fat</Text>
              <TextInput
                style={styles.macroEditInput}
                value={editFat}
                onChangeText={setEditFat}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Ingredient editing */}
          <Text style={styles.editSectionLabel}>INGREDIENTS</Text>
          {editIngredients.map((ing, i) => (
            <View key={i} style={styles.ingredientEditRow}>
              <TextInput
                style={[styles.ingredientEditInput, { flex: 0.3 }]}
                value={ing.quantity}
                onChangeText={(v) => handleUpdateIngredient(i, 'quantity', v)}
                placeholder="Qty"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.ingredientEditInput, { flex: 0.2 }]}
                value={ing.unit}
                onChangeText={(v) => handleUpdateIngredient(i, 'unit', v)}
                placeholder="Unit"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.ingredientEditInput, { flex: 1 }]}
                value={ing.name}
                onChangeText={(v) => handleUpdateIngredient(i, 'name', v)}
                placeholder="Ingredient name"
                placeholderTextColor={colors.textTertiary}
              />
              <TouchableOpacity onPress={() => handleDeleteIngredient(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addIngBtn} onPress={handleAddIngredient}>
            <Ionicons name="add" size={14} color={colors.accent} />
            <Text style={styles.addIngText}>Add Ingredient</Text>
          </TouchableOpacity>

          {/* Save / Cancel / Delete */}
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  mealType: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  mealName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  editNameInput: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  macroText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  details: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  macroPill: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  macroPillLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  macroPillValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ingredientList: {
    gap: spacing.xs,
  },
  ingredientHeader: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  ingredientText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  photoSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  photoBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
  },
  mealPhotoImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  // Edit mode styles
  editSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  macroEditRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  macroEditField: {
    flex: 1,
    alignItems: 'center',
  },
  macroEditLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 4,
  },
  macroEditInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  ingredientEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  ingredientEditInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
  },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentMuted,
  },
  addIngText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.background,
  },
  cancelBtn: {
    flex: 0.6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
});
