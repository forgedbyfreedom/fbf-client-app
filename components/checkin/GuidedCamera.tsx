import React, { useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

/**
 * Full-screen camera with last check-in's photo for this pose ghosted over
 * the viewfinder, so the athlete can match stance, distance and framing.
 * The ghost is only a guide — it is never part of the saved photo.
 */
interface Props {
  visible: boolean;
  pose: 'front' | 'side' | 'back';
  ghostUri?: string;
  onClose: () => void;
  onCapture: (uri: string) => void;
}

export function GuidedCamera({ visible, pose, ghostUri, onClose, onCapture }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [ghost, setGhost] = useState(0.35);
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);

  const take = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (pic?.uri) onCapture(pic.uri);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        {!permission?.granted ? (
          <View style={styles.center}>
            <Text style={styles.msg}>Camera access is needed for guided progress photos.</Text>
            <TouchableOpacity style={styles.primary} onPress={requestPermission} accessibilityRole="button">
              <Text style={styles.primaryText}>Allow camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.link} accessibilityRole="button">
              <Text style={styles.linkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} />
            {ghostUri ? (
              <Image
                source={{ uri: ghostUri }}
                style={[StyleSheet.absoluteFill, { opacity: ghost }]}
                resizeMode="contain"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : (
              <View style={styles.frameGuide} pointerEvents="none" />
            )}

            <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Close camera">
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.pose}>{pose.toUpperCase()}</Text>
                <Text style={styles.hint}>{ghostUri ? 'Line up with last week' : 'Full body, head to feet'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Flip camera"
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
              {ghostUri ? (
                <View style={styles.ghostRow}>
                  {[0, 0.2, 0.35, 0.5].map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setGhost(v)}
                      style={[styles.ghostChip, ghost === v && styles.ghostChipOn]}
                      accessibilityRole="button"
                      accessibilityLabel={`Guide opacity ${Math.round(v * 100)} percent`}
                    >
                      <Text style={[styles.ghostText, ghost === v && styles.ghostTextOn]}>{v === 0 ? 'Off' : `${Math.round(v * 100)}%`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <TouchableOpacity onPress={take} style={styles.shutter} accessibilityRole="button" accessibilityLabel="Take photo" disabled={busy}>
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <View style={styles.shutterInner} />}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg },
  msg: { color: colors.textPrimary, fontSize: fontSize.md, textAlign: 'center' },
  primary: { backgroundColor: colors.accent, borderRadius: 14, minHeight: 50, paddingHorizontal: spacing.xxl, justifyContent: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.textSecondary, fontSize: fontSize.md },
  frameGuide: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '12%',
    bottom: '16%',
    borderWidth: 2,
    borderColor: 'rgba(212,169,58,0.7)',
    borderRadius: 24,
    borderStyle: 'dashed',
  },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pose: { fontFamily: fonts.display, color: '#fff', fontSize: 20, letterSpacing: 2 },
  hint: { color: '#e5e5e5', fontSize: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: spacing.lg },
  ghostRow: { flexDirection: 'row', gap: spacing.sm, backgroundColor: 'rgba(0,0,0,0.55)', padding: 6, borderRadius: 14 },
  ghostChip: { minWidth: 52, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ghostChipOn: { backgroundColor: colors.accent },
  ghostText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  ghostTextOn: { color: colors.onAccent },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent },
});
