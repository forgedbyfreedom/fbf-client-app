import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Loading } from '../../components/ui/Loading';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { colors, fontSize, spacing } from '../../lib/theme';
import { ChatChannel, ChatMessage } from '../../types';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const supabaseRef = useRef(supabase);

  // Fetch the DM channel for this client
  const fetchChannel = useCallback(async () => {
    if (!user) return null;

    try {
      const { data: channels, error } = await supabaseRef.current
        .from('chat_members')
        .select('channel_id, chat_channels(id, name, type, organization_id)')
        .eq('user_id', user.id);

      if (error) {
        console.warn('Chat not available:', error.message);
        return null;
      }

      if (channels && channels.length > 0) {
        const ch = (channels[0] as any).chat_channels as ChatChannel;
        setChannel(ch);
        return ch;
      }
    } catch (err) {
      console.warn('Chat fetch failed:', err);
    }

    return null;
  }, [user]);

  // Fetch messages for the channel
  const fetchMessages = useCallback(async (channelId: string) => {
    const { data } = await supabaseRef.current
      .from('chat_messages')
      .select('id, content, created_at, user_id, profiles:user_id(full_name, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) setMessages(data as unknown as ChatMessage[]);
  }, []);

  // Initialize
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const ch = await fetchChannel();
      if (ch) {
        await fetchMessages(ch.id);

        // Subscribe to new messages
        subscription = supabaseRef.current
          .channel(`chat-${ch.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${ch.id}`,
            },
            async (payload) => {
              const { data: msg } = await supabaseRef.current
                .from('chat_messages')
                .select('id, content, created_at, user_id, profiles:user_id(full_name, avatar_url)')
                .eq('id', payload.new.id)
                .single();
              if (msg) {
                setMessages((prev) => [...prev, msg as unknown as ChatMessage]);
              }
            }
          )
          .subscribe();
      }
      setLoading(false);
    };

    init();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchChannel, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!channel || !user) return;

    await supabaseRef.current.from('chat_messages').insert({
      channel_id: channel.id,
      user_id: user.id,
      content,
    });
  };

  if (loading) return <Loading />;

  if (!channel) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>No Chat Available</Text>
        <Text style={styles.emptyText}>
          Your coach will set up a chat channel for you.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Chat with Coach</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwnMessage={item.user_id === user?.id}
          />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput onSend={sendMessage} />
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  messageList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
