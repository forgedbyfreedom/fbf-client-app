import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { AttachmentPicker, SelectedAttachment } from './AttachmentPicker';

interface ChatInputProps {
  onSend: (message: string, attachment?: {
    url: string;
    type: 'image' | 'file';
    name: string;
  }) => void;
  onUploadAttachment: (attachment: SelectedAttachment) => Promise<{ url: string } | null>;
  disabled?: boolean;
}

export function ChatInput({ onSend, onUploadAttachment, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<SelectedAttachment | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;

    if (pendingAttachment) {
      setUploading(true);
      try {
        const result = await onUploadAttachment(pendingAttachment);
        if (result) {
          onSend(trimmed, {
            url: result.url,
            type: pendingAttachment.type,
            name: pendingAttachment.name,
          });
        }
      } catch (err) {
        console.error('[ChatInput] Upload failed:', err);
      } finally {
        setUploading(false);
        setPendingAttachment(null);
        setText('');
      }
    } else {
      console.log('[ChatInput] sending:', trimmed);
      onSend(trimmed);
      setText('');
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !(e as any).shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachmentSelected = (attachment: SelectedAttachment) => {
    setPendingAttachment(attachment);
  };

  const clearAttachment = () => {
    setPendingAttachment(null);
  };

  const hasContent = text.trim() || pendingAttachment;

  return (
    <>
      {/* Attachment preview bar */}
      {pendingAttachment && (
        <View style={styles.previewBar}>
          {pendingAttachment.type === 'image' ? (
            <Image
              source={{ uri: pendingAttachment.uri }}
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.previewFileIcon}>
              <Ionicons name="document-text" size={18} color={colors.accent} />
            </View>
          )}
          <Text style={styles.previewName} numberOfLines={1}>
            {pendingAttachment.name}
          </Text>
          <TouchableOpacity onPress={clearAttachment} style={styles.previewClose}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        {/* Attachment button */}
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setShowPicker(true)}
          disabled={disabled || uploading}
          activeOpacity={0.7}
        >
          <Ionicons
            name="attach"
            size={22}
            color={uploading ? colors.textTertiary : colors.textSecondary}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={pendingAttachment ? 'Add a caption...' : 'Type a message...'}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
          editable={!disabled && !uploading}
          onKeyPress={handleKeyPress}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !hasContent && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!hasContent || disabled || uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={hasContent ? '#fff' : colors.textTertiary}
            />
          )}
        </TouchableOpacity>
      </View>

      <AttachmentPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAttachmentSelected}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
  // Attachment preview
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  previewImage: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  previewFileIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  previewClose: {
    padding: spacing.xs,
  },
});
