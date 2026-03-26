import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { ChatMessage } from '../../types';
import { ImageMessage } from './ImageMessage';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const time = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const hasAttachment = !!message.attachment_url;

  const handleReport = () => {
    Alert.alert(
      'Report Message',
      'Report this message as inappropriate? Your coach and admin will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Reported', 'This message has been flagged for review. Thank you.');
            setShowActions(false);
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.ownContainer : styles.otherContainer,
      ]}
    >
      {!isOwnMessage && message.profiles?.full_name && (
        <Text style={styles.name}>{message.profiles.full_name}</Text>
      )}
      <TouchableOpacity
        onLongPress={() => setShowActions(!showActions)}
        activeOpacity={0.8}
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
          hasAttachment && styles.attachmentBubble,
        ]}
      >
        {hasAttachment ? (
          <ImageMessage message={message} isOwnMessage={isOwnMessage} />
        ) : (
          <Text
            style={[
              styles.content,
              isOwnMessage ? styles.ownContent : styles.otherContent,
            ]}
          >
            {message.content}
          </Text>
        )}
      </TouchableOpacity>
      {showActions && !isOwnMessage && (
        <TouchableOpacity style={styles.reportBtn} onPress={handleReport}>
          <Ionicons name="flag-outline" size={12} color={colors.red} />
          <Text style={styles.reportText}>Report</Text>
        </TouchableOpacity>
      )}
      <Text
        style={[
          styles.time,
          isOwnMessage ? styles.ownTime : styles.otherTime,
        ]}
      >
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: 2,
    marginHorizontal: spacing.sm,
  },
  bubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  ownBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  attachmentBubble: {
    padding: spacing.xs,
    overflow: 'hidden',
  },
  content: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  ownContent: {
    color: '#ffffff',
  },
  otherContent: {
    color: colors.textPrimary,
  },
  time: {
    fontSize: fontSize.xs,
    marginTop: 2,
    marginHorizontal: spacing.sm,
  },
  ownTime: {
    color: colors.textTertiary,
  },
  otherTime: {
    color: colors.textTertiary,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginHorizontal: spacing.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  reportText: {
    fontSize: 10,
    color: colors.red,
    fontWeight: '600',
  },
});
