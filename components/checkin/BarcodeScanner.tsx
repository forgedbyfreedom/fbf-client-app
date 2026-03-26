import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { lookupBarcode, searchFoods, NutritionInfo } from '../../lib/nutrition-api';

// Only import CameraView on native — it has built-in barcode scanning
let CameraViewComponent: any = null;
let useCameraPermissionsHook: any = null;
if (Platform.OS !== 'web') {
  try {
    const cam = require('expo-camera');
    CameraViewComponent = cam.CameraView;
    useCameraPermissionsHook = cam.useCameraPermissions;
  } catch {}
}

interface BarcodeScannerProps {
  onResult: (info: NutritionInfo) => void;
}

export function BarcodeScannerButton({ onResult }: BarcodeScannerProps) {
  const [visible, setVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NutritionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NutritionInfo[]>([]);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (visible && hasPermission === null && !isWeb && CameraViewComponent) {
      (async () => {
        const { Camera } = require('expo-camera');
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setError(null);
    try {
      const info = await lookupBarcode(data);
      if (info) {
        setResult(info);
      } else {
        setError('Product not found. Try scanning again or search manually.');
        setScanned(false);
      }
    } catch {
      setError('Lookup failed. Check your connection.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearchResults([]);
    try {
      const results = await searchFoods(searchQuery.trim());
      if (results.length > 0) {
        setSearchResults(results);
      } else {
        setError('No foods found. Try a different search term.');
      }
    } catch {
      setError('Search failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (info: NutritionInfo) => {
    setResult(info);
    setSearchResults([]);
  };

  const handleUseResult = () => {
    if (result) {
      onResult(result);
      handleClose();
    }
  };

  const handleClose = () => {
    setVisible(false);
    setScanned(false);
    setResult(null);
    setError(null);
    setLoading(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRescan = () => {
    setScanned(false);
    setResult(null);
    setError(null);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <>
      <TouchableOpacity style={styles.scanButton} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Ionicons name={isWeb ? 'search-outline' : 'barcode-outline'} size={18} color={colors.accent} />
        <Text style={styles.scanButtonText}>
          {isWeb ? 'Search Food Nutrition' : 'Scan Food Label'}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isWeb ? 'Food Lookup' : 'Scan Barcode'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {result ? (
            /* ── Result View ── */
            <View style={styles.resultContainer}>
              <View style={styles.resultCard}>
                <Ionicons name="checkmark-circle" size={32} color={colors.green} />
                <Text style={styles.resultName}>{result.name}</Text>
                {result.serving_size && (
                  <Text style={styles.resultServing}>per {result.serving_size}</Text>
                )}

                <View style={styles.macroGrid}>
                  <View style={styles.macroBox}>
                    <Text style={styles.macroValue}>{result.calories ?? '--'}</Text>
                    <Text style={styles.macroLabel}>Calories</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={styles.macroValue}>{result.protein_g ?? '--'}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={styles.macroValue}>{result.carbs_g ?? '--'}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={styles.macroValue}>{result.fat_g ?? '--'}g</Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.useButton} onPress={handleUseResult} activeOpacity={0.8}>
                  <Text style={styles.useButtonText}>Use These Values</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.rescanLink} onPress={handleRescan}>
                  <Ionicons name="refresh" size={14} color={colors.accent} />
                  <Text style={styles.rescanText}>Search Another</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Search / Camera View ── */
            <View style={styles.searchContainer}>
              {/* Search bar — always shown */}
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search food by name (e.g. chicken breast)"
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  autoFocus={isWeb}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={handleSearch}>
                    <View style={styles.searchBtn}>
                      <Text style={styles.searchBtnText}>Search</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <ScrollView style={styles.resultsList}>
                  {searchResults.map((food, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.resultRow}
                      onPress={() => handleSelectResult(food)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultRowInfo}>
                        <Text style={styles.resultRowName} numberOfLines={1}>{food.name}</Text>
                        <Text style={styles.resultRowServing}>
                          {food.serving_size || '100g'}
                        </Text>
                      </View>
                      <View style={styles.resultRowMacros}>
                        <Text style={styles.resultRowMacro}>{food.calories ?? '--'} cal</Text>
                        <Text style={styles.resultRowMacro}>{food.protein_g ?? '--'}g P</Text>
                        <Text style={styles.resultRowMacro}>{food.carbs_g ?? '--'}g C</Text>
                        <Text style={styles.resultRowMacro}>{food.fat_g ?? '--'}g F</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Camera for native only */}
              {!isWeb && CameraViewComponent && !searchResults.length && !loading && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or scan barcode</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <View style={styles.cameraContainer}>
                    <CameraViewComponent
                      style={StyleSheet.absoluteFillObject}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
                      onBarcodeScanned={scanned ? undefined : (result: { type: string; data: string }) => handleBarCodeScanned(result)}
                    />
                    <View style={styles.overlay}>
                      <View style={styles.overlayTop} />
                      <View style={styles.overlayMiddle}>
                        <View style={styles.overlaySide} />
                        <View style={styles.scanWindow}>
                          <View style={[styles.corner, styles.cornerTL]} />
                          <View style={[styles.corner, styles.cornerTR]} />
                          <View style={[styles.corner, styles.cornerBL]} />
                          <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                        <View style={styles.overlaySide} />
                      </View>
                      <View style={styles.overlayBottom}>
                        <Text style={styles.instructionText}>
                          Point camera at a food barcode
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* Helpful text when nothing else is shown */}
              {!loading && !error && searchResults.length === 0 && !searchQuery && (
                <View style={styles.helpSection}>
                  <Ionicons name="nutrition-outline" size={48} color={colors.textTertiary} />
                  <Text style={styles.helpTitle}>Look Up Any Food</Text>
                  <Text style={styles.helpText}>
                    Search by name to get calories, protein, carbs, and fat per serving.
                    {!isWeb ? '\n\nOr scan a barcode on any food package.' : ''}
                  </Text>
                  <View style={styles.helpExamples}>
                    {['chicken breast', 'greek yogurt', 'brown rice', 'whey protein'].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={styles.helpChip}
                        onPress={() => { setSearchQuery(q); }}
                      >
                        <Text style={styles.helpChipText}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const WINDOW_SIZE = Dimensions.get('window').width * 0.55;

const styles = StyleSheet.create({
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  scanButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.xl : 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  searchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  searchBtnText: {
    color: '#0a0a0a',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.red,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  resultsList: {
    flex: 1,
  },
  resultRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resultRowInfo: {
    marginBottom: spacing.sm,
  },
  resultRowName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resultRowServing: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  resultRowMacros: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultRowMacro: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  helpTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  helpExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  helpChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  helpChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  resultName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  resultServing: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.xl,
  },
  macroBox: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  macroLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  useButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    width: '100%',
    alignItems: 'center',
  },
  useButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#0a0a0a',
  },
  rescanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  rescanText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  cameraContainer: {
    height: 250,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: WINDOW_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanWindow: {
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FF6A00',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.md,
  },
  instructionText: {
    fontSize: fontSize.sm,
    color: '#ccc',
    textAlign: 'center',
  },
});
