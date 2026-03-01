import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

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
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text
          style={[
            styles.content,
            isOwnMessage ? styles.ownContent : styles.otherContent,
          ]}
        >
          {message.content}
        </Text>
      </View>
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
});
