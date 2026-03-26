import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BodyScan } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

const SCAN_TYPES = ['inbody', 'dexa', 'bodpod', 'calipers', 'other'] as const;

interface BodyScanTrackerProps {
  clientId: string;
}

export function BodyScanTracker({ clientId }: BodyScanTrackerProps) {
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Form state
  const [scanType, setScanType] = useState<string>('inbody');
  const [scanDate, setScanDate] = useState(new Date().toISOString().split('T')[0]);
  const [bodyFat, setBodyFat] = useState('');
  const [leanMass, setLeanMass] = useState('');
  const [fatMass, setFatMass] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [smm, setSmm] = useState('');
  const [bmr, setBmr] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [scanFileUri, setScanFileUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const fetchScans = useCallback(async () => {
    try {
      const res = await api.get<{ scans: BodyScan[] }>(`/api/clients/${clientId}/scans`);
      setScans(res.scans);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const pickScanFile = async () => {
    Alert.alert('Upload Scan', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!result.canceled && result.assets[0]) setScanFileUri(result.assets[0].uri);
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!result.canceled && result.assets[0]) setScanFileUri(result.assets[0].uri);
        },
      },
      {
        text: 'PDF / File',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
          });
          if (!result.canceled && result.assets?.[0]) setScanFileUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!bodyFat && !leanMass && !totalWeight) {
      Alert.alert('Missing Data', 'Enter at least body fat %, lean mass, or total weight.');
      return;
    }

    setSubmitting(true);
    try {
      let fileUrl = null;
      if (scanFileUri) {
        const filename = scanFileUri.split('/').pop() || 'scan.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        const filePath = `body-scans/${clientId}/${scanDate}_${filename}`;

        const response = await fetch(scanFileUri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, arrayBuffer, { contentType: mimeType, upsert: true });

        if (uploadError) {
          throw new Error('File upload failed: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      await api.post(`/api/clients/${clientId}/scans`, {
        scan_date: scanDate,
        scan_type: scanType,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        lean_mass_lbs: leanMass ? parseFloat(leanMass) : null,
        fat_mass_lbs: fatMass ? parseFloat(fatMass) : null,
        total_weight_lbs: totalWeight ? parseFloat(totalWeight) : null,
        skeletal_muscle_mass_lbs: smm ? parseFloat(smm) : null,
        basal_metabolic_rate: bmr ? parseInt(bmr) : null,
        visceral_fat_level: visceralFat ? parseFloat(visceralFat) : null,
        file_url: fileUrl,
        notes: notes || null,
      });

      Alert.alert('Saved', 'Body scan recorded.');
      setShowAdd(false);
      resetForm();
      fetchScans();
    } catch (err) {
      Alert.alert('Error', 'Failed to save scan.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setScanType('inbody');
    setScanDate(new Date().toISOString().split('T')[0]);
    setBodyFat('');
    setLeanMass('');
    setFatMass('');
    setTotalWeight('');
    setSmm('');
    setBmr('');
    setVisceralFat('');
    setScanFileUri(null);
    setNotes('');
  };

  const metrics = [
    { key: 'body_fat_pct', label: 'Body Fat %', unit: '%', color: colors.red },
    { key: 'lean_mass_lbs', label: 'Lean Mass', unit: ' lbs', color: colors.green },
    { key: 'fat_mass_lbs', label: 'Fat Mass', unit: ' lbs', color: colors.yellow },
    { key: 'total_weight_lbs', label: 'Weight', unit: ' lbs', color: colors.accent },
    { key: 'skeletal_muscle_mass_lbs', label: 'Skeletal Muscle', unit: ' lbs', color: '#3b82f6' },
  ];

  const chartWidth = Dimensions.get('window').width - 80;

  if (loading) {
    return (
      <Card>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Body Composition Scans</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAdd(true)}
        >
          <Ionicons name="add-circle" size={24} color={colors.accent} />
          <Text style={styles.addText}>Add Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Apple Health Attribution */}
      <View style={styles.healthKitBanner}>
        <Ionicons name="heart-circle-outline" size={16} color={colors.accent} />
        <Text style={styles.healthKitBannerText}>
          Weight from Apple Health auto-fills your daily check-ins
        </Text>
      </View>

      {scans.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            No scans yet. Upload your InBody, DEXA, or body composition scan to track progress over time.
          </Text>
          <Button
            title="Add Your First Scan"
            variant="secondary"
            onPress={() => setShowAdd(true)}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <>
          {/* Metric pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {metrics.map((m) => {
              const hasData = scans.some((s) => (s as Record<string, unknown>)[m.key] != null);
              if (!hasData) return null;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.pill, expandedMetric === m.key && styles.pillActive]}
                  onPress={() => setExpandedMetric(expandedMetric === m.key ? null : m.key)}
                >
                  <Text style={[styles.pillText, expandedMetric === m.key && styles.pillTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Chart for selected metric */}
          {expandedMetric && (
            <Card style={styles.chartCard}>
              {(() => {
                const metric = metrics.find((m) => m.key === expandedMetric);
                if (!metric) return null;
                const dataPoints = scans
                  .filter((s) => (s as Record<string, unknown>)[metric.key] != null)
                  .reverse()
                  .map((s) => ({
                    date: s.scan_date,
                    value: (s as Record<string, unknown>)[metric.key] as number,
                  }));

                if (dataPoints.length < 2) {
                  return <Text style={styles.emptyText}>Need at least 2 scans to show trend</Text>;
                }

                const values = dataPoints.map((d) => d.value);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min || 1;
                const chartHeight = 100;

                return (
                  <>
                    <Text style={styles.chartTitle}>{metric.label} Trend</Text>
                    <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
                      {dataPoints.map((d, i) => {
                        const barHeight = ((d.value - min) / range) * (chartHeight - 20) + 20;
                        const barWidth = Math.max((chartWidth / dataPoints.length) - 4, 8);
                        return (
                          <View key={d.date + i} style={styles.barCol}>
                            <View
                              style={[
                                styles.bar,
                                { height: barHeight, width: barWidth, backgroundColor: metric.color },
                              ]}
                            />
                            <Text style={styles.barLabel}>
                              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.rangeRow}>
                      <Text style={styles.rangeText}>{min}{metric.unit}</Text>
                      <Text style={styles.latestText}>
                        Latest: {values[values.length - 1]}{metric.unit}
                      </Text>
                      <Text style={styles.rangeText}>{max}{metric.unit}</Text>
                    </View>
                    {dataPoints.length >= 2 && (
                      <Text style={styles.deltaText}>
                        {(() => {
                          const first = values[0];
                          const last = values[values.length - 1];
                          const delta = (last ?? 0) - (first ?? 0);
                          const sign = delta > 0 ? '+' : '';
                          return `Change: ${sign}${delta.toFixed(1)}${metric.unit}`;
                        })()}
                      </Text>
                    )}
                  </>
                );
              })()}
            </Card>
          )}

          {/* Recent scans list */}
          <Card>
            <Text style={styles.recentTitle}>Recent Scans</Text>
            {scans.slice(0, 5).map((scan) => (
              <View key={scan.id} style={styles.scanRow}>
                <View>
                  <Text style={styles.scanDate}>
                    {new Date(scan.scan_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.scanType}>
                    {scan.scan_type.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.scanMetrics}>
                  {scan.body_fat_pct != null && (
                    <Text style={styles.scanValue}>{scan.body_fat_pct}% BF</Text>
                  )}
                  {scan.lean_mass_lbs != null && (
                    <Text style={styles.scanValue}>{scan.lean_mass_lbs} lbs lean</Text>
                  )}
                  {scan.total_weight_lbs != null && (
                    <Text style={styles.scanValue}>{scan.total_weight_lbs} lbs</Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Add Scan Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Body Scan</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Scan Type</Text>
          <View style={styles.typeRow}>
            {SCAN_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, scanType === t && styles.typePillActive]}
                onPress={() => setScanType(t)}
              >
                <Text style={[styles.typePillText, scanType === t && styles.typePillTextActive]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Scan Date</Text>
          <TextInput
            style={styles.input}
            value={scanDate}
            onChangeText={setScanDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Body Fat %</Text>
              <TextInput
                style={styles.input}
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="e.g. 18.5"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Total Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={totalWeight}
                onChangeText={setTotalWeight}
                placeholder="e.g. 195"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Lean Mass (lbs)</Text>
              <TextInput
                style={styles.input}
                value={leanMass}
                onChangeText={setLeanMass}
                placeholder="e.g. 160"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Fat Mass (lbs)</Text>
              <TextInput
                style={styles.input}
                value={fatMass}
                onChangeText={setFatMass}
                placeholder="e.g. 35"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Skeletal Muscle (lbs)</Text>
              <TextInput
                style={styles.input}
                value={smm}
                onChangeText={setSmm}
                placeholder="e.g. 85"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>BMR (cal)</Text>
              <TextInput
                style={styles.input}
                value={bmr}
                onChangeText={setBmr}
                placeholder="e.g. 1850"
                keyboardType="number-pad"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Visceral Fat Level</Text>
          <TextInput
            style={styles.input}
            value={visceralFat}
            onChangeText={setVisceralFat}
            placeholder="e.g. 8"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.fieldLabel}>Upload Scan (photo or PDF)</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickScanFile}>
            <Ionicons
              name={scanFileUri ? 'checkmark-circle' : 'cloud-upload-outline'}
              size={24}
              color={scanFileUri ? colors.green : colors.accent}
            />
            <Text style={[styles.uploadText, scanFileUri && { color: colors.green }]}>
              {scanFileUri ? 'File selected' : 'Tap to upload scan image or PDF'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this scan..."
            multiline
            placeholderTextColor={colors.textTertiary}
          />

          <Button
            title={submitting ? 'Saving...' : 'Save Scan'}
            onPress={handleSubmit}
            style={{ marginTop: spacing.lg, marginBottom: spacing.xxxl }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  healthKitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  healthKitBannerText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    lineHeight: 20,
  },
  pillRow: {
    marginBottom: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  pillText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  chartCard: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barCol: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 3,
    opacity: 0.85,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  rangeText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  latestText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  deltaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  recentTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  scanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scanDate: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  scanType: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  scanMetrics: {
    alignItems: 'flex-end',
  },
  scanValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typePillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  typePillText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  typePillTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
  },
  uploadText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
