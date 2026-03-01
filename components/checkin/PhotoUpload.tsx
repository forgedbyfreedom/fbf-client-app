import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ photos, onChange, maxPhotos = 3 }: PhotoUploadProps) {
  const pickImage = async (useCamera: boolean) => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed.`);
      return;
    }

    const permResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      Alert.alert('Permission Required', 'Please enable access in Settings.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsMultipleSelection: false,
        });

    if (!result.canceled && result.assets[0]) {
      onChange([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Progress Photos ({photos.length}/{maxPhotos})
      </Text>

      <View style={styles.grid}>
        {photos.map((uri, i) => (
          <View key={i} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removePhoto(i)}
            >
              <Ionicons name="close-circle" size={24} color={colors.red} />
            </TouchableOpacity>
          </View>
        ))}

        {photos.length < maxPhotos && (
          <View style={styles.addButtons}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera-outline" size={28} color={colors.accent} />
              <Text style={styles.addText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => pickImage(false)}
            >
              <Ionicons name="images-outline" size={28} color={colors.accent} />
              <Text style={styles.addText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  addButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addBtn: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    marginTop: spacing.xs,
  },
});
