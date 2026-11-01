import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { colors, fontSize, spacing } from '../../lib/theme';
import { ChatMessage } from '../../types';

/**
 * FBF Member Community chat.
 *
 * Backed entirely by the WordPress App Bridge (fbf/v1/community/*) — the old
 * Supabase group chat is retired. Plain text, members-only, no AI cost. New
 * messages arrive by short-interval polling (cheap; WordPress serves text at
 * near-zero marginal cost). Auth rides the same bearer token as the rest of
 * the app, so no separate login.
 */

const ROOM = 'general';
const POLL_MS = 4000;

interface WPCommunityMessage {
  id: number;
  room: string;
  user_id: number;
  name: string;
  body: string;
  created_at: string;
}

function toChatMessage(m: WPCommunityMessage): ChatMessage {
  return {
    id: String(m.id),
    content: m.body,
    created_at: m.created_at,
    user_id: String(m.user_id),
    attachment_url: null,
    attachment_type: null,
    attachment_name: null,
    profiles: { full_name: m.name, avatar_url: null },
  };
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myId = user?.id != null ? String(user.id) : '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList>(null);
  const lastIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyIncoming = useCallback((incoming: WPCommunityMessage[]) => {
    if (!incoming || incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const add = incoming
        .filter((m) => !seen.has(String(m.id)))
        .map(toChatMessage);
      if (add.length === 0) return prev;
      return [...prev, ...add];
    });
    lastIdRef.current = incoming.reduce(
      (mx, m) => Math.max(mx, m.id),
      lastIdRef.current
    );
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      setError(null);
      const res = (await api.get(
        `/community/messages?room=${ROOM}&since=0&limit=100`
      )) as { messages?: WPCommunityMessage[] };
      const list = res?.messages ?? [];
      setMessages(list.map(toChatMessage));
      lastIdRef.current = list.reduce((mx, m) => Math.max(mx, m.id), 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg.includes('401')
          ? 'Please sign in again to use the community.'
          : 'Could not load messages. Pull to retry.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = (await api.get(
        `/community/messages?room=${ROOM}&since=${lastIdRef.current}&limit=100`
      )) as { messages?: WPCommunityMessage[] };
      applyIncoming(res?.messages ?? []);
    } catch {
      // transient network error — keep polling
    }
  }, [applyIncoming]);

  useEffect(() => {
    loadInitial();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadInitial, poll]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      const res = (await api.post('/community/messages', { room: ROOM, body })) as {
        message?: WPCommunityMessage;
      };
      if (res?.message) applyIncoming([res.message]);
    } catch (e) {
      setText(body); // restore the text so nothing is lost
      const msg = e instanceof Error ? e.message : '';
      Alert.alert(
        'Not sent',
        msg.includes('429')
          ? "You're sending messages too quickly — give it a second."
          : 'Your message could not be sent. Please try again.'
      );
    } finally {
      setSending(false);
    }
  }, [text, sending, applyIncoming]);

  const report = useCallback(async (messageId: string) => {
    try {
      await api.post('/community/report', { message_id: Number(messageId) });
    } catch {
      // best effort — the confirmation alert already reassured the member
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        isOwnMessage={item.user_id === myId}
        onReport={report}
      />
    ),
    [myId, report]
  );

  const canSend = text.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}># Community</Text>
        <Text style={styles.disclaimer}>
          Members-only space. Peer support — not medical advice. Talk to your
          physician before acting on anything shared here.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {error ?? 'No messages yet. Say hello to the community!'}
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.composer, { paddingBottom: insets.bottom || spacing.sm }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message the community..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={canSend ? '#fff' : colors.textTertiary}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 4,
    lineHeight: 15,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  messageList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
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
});
