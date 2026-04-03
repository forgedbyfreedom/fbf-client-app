import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { ChatMessage } from '../../types';

interface ImageMessageProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageMessage({ message, isOwnMessage }: ImageMessageProps) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  // Timeout loading after 10s — prevents permanent grey box
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const isImage = message.attachment_type === 'image';
  const url = message.attachment_url;
  const fileName = message.attachment_name || 'Attachment';

  if (!url) return null;

  if (!isImage) {
    // File attachment — show file card
    return (
      <View style={styles.fileCard}>
        <View style={styles.fileIconWrap}>
          <Ionicons name="document-text" size={24} color={colors.accent} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={styles.fileLabel}>File attachment</Text>
        </View>
        <Ionicons name="download-outline" size={20} color={colors.textTertiary} />
      </View>
    );
  }

  // Image attachment
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setFullscreen(true)}
        style={styles.imageWrap}
      >
        {loading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.accent} size="small" />
          </View>
        )}
        {error ? (
          <View style={styles.errorWrap}>
            <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.errorText}>Failed to load</Text>
          </View>
        ) : (
          <Image
            source={{ uri: url }}
            style={styles.image}
            resizeMode="cover"
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </TouchableOpacity>

      {message.content ? (
        <Text
          style={[
            styles.caption,
            isOwnMessage ? styles.captionOwn : styles.captionOther,
          ]}
        >
          {message.content}
        </Text>
      ) : null}

      {/* Fullscreen modal */}
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={styles.fullscreenBg}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setFullscreen(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: url }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
          {fileName && (
            <Text style={styles.fullscreenName}>{fileName}</Text>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    width: 220,
    height: 180,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    zIndex: 1,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  caption: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  captionOwn: {
    color: '#ffffff',
  },
  captionOther: {
    color: colors.textPrimary,
  },
  // File card
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 200,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fileLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  // Fullscreen
  fullscreenBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  fullscreenName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
