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
import { ChannelPills } from '../../components/chat/ChannelPills';
import { colors, fontSize, spacing } from '../../lib/theme';
import { ChatChannel, ChatMessage } from '../../types';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const supabaseRef = useRef(supabase);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch ALL channels for this user
  const fetchChannels = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabaseRef.current
        .from('chat_members')
        .select('channel_id, chat_channels(id, name, type, organization_id)')
        .eq('user_id', user.id);

      if (error) {
        console.warn('Chat not available:', error.message);
        return [];
      }

      if (data && data.length > 0) {
        const chs = data.map((d: any) => d.chat_channels as ChatChannel);
        // Sort: group channels first, then DMs
        chs.sort((a: ChatChannel, b: ChatChannel) => {
          if (a.type === 'group' && b.type !== 'group') return -1;
          if (a.type !== 'group' && b.type === 'group') return 1;
          return a.name.localeCompare(b.name);
        });
        setChannels(chs);
        return chs;
      }
    } catch (err) {
      console.warn('Chat fetch failed:', err);
    }

    return [];
  }, [user]);

  // Fetch messages for a specific channel
  const fetchMessages = useCallback(async (channelId: string) => {
    const { data } = await supabaseRef.current
      .from('chat_messages')
      .select('id, content, created_at, user_id, profiles:user_id(full_name, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) setMessages(data as unknown as ChatMessage[]);
  }, []);

  // Subscribe to real-time messages for a channel
  const subscribeTo = useCallback((channelId: string) => {
    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    subscriptionRef.current = supabaseRef.current
      .channel(`chat-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
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
  }, []);

  // Initialize: fetch channels, pick default, load messages
  useEffect(() => {
    const init = async () => {
      const chs = await fetchChannels();
      if (chs.length > 0) {
        // Default to first group channel (General) or first channel
        const defaultCh = chs.find((c: ChatChannel) => c.type === 'group') || chs[0];
        setActiveChannelId(defaultCh.id);
        await fetchMessages(defaultCh.id);
        subscribeTo(defaultCh.id);
      }
      setLoading(false);
    };

    init();

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [fetchChannels, fetchMessages, subscribeTo]);

  // Switch channel
  const handleChannelSwitch = useCallback(async (channelId: string) => {
    if (channelId === activeChannelId) return;
    setActiveChannelId(channelId);
    setMessages([]);
    await fetchMessages(channelId);
    subscribeTo(channelId);
  }, [activeChannelId, fetchMessages, subscribeTo]);

  const sendMessage = async (content: string) => {
    if (!activeChannelId || !user) return;

    await supabaseRef.current.from('chat_messages').insert({
      channel_id: activeChannelId,
      user_id: user.id,
      content,
    });
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const headerTitle = activeChannel
    ? activeChannel.type === 'group'
      ? `# ${activeChannel.name}`
      : activeChannel.name
    : 'Chat';

  if (loading) return <Loading />;

  if (channels.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>No Channels Yet</Text>
        <Text style={styles.emptyText}>
          You'll be added to the group chat automatically.
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
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <ChannelPills
          channels={channels}
          activeId={activeChannelId!}
          onSelect={handleChannelSwitch}
        />
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
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMessagesText}>
              No messages yet. Say hello!
            </Text>
          </View>
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
    paddingBottom: spacing.xs,
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
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyMessagesText: {
    fontSize: fontSize.md,
    color: colors.textTertiary,
  },
});
