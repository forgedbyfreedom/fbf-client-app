import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Loading } from '../../components/ui/Loading';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { ChannelPills } from '../../components/chat/ChannelPills';
import { NewChatModal } from '../../components/chat/NewChatModal';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { colors, fontSize, spacing } from '../../lib/theme';
import { ChatChannel, ChatMessage } from '../../types';
import type { SelectedAttachment } from '../../components/chat/AttachmentPicker';

const CHAT_ATTACHMENT_BUCKET = 'chat-attachments';
const MESSAGE_SELECT_FIELDS = 'id, content, created_at, user_id, attachment_url, attachment_type, attachment_name';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user, client, organizationId, clientError } = useAuth();

  useEffect(() => {
    console.log('[Chat] user:', user?.id, 'orgId:', organizationId, 'clientError:', clientError);
  }, [user, organizationId, clientError]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
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

      console.log('[Chat] fetchChannels result:', { dataLen: data?.length, error: error?.message });

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
    const { data, error } = await supabaseRef.current
      .from('chat_messages')
      .select(MESSAGE_SELECT_FIELDS)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    console.log('[Chat] fetchMessages:', { channelId, count: data?.length, error: error?.message });
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
            .select(MESSAGE_SELECT_FIELDS)
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
      console.log('[Chat] init: channels=', chs.length, 'first=', chs[0]);
      if (chs.length > 0) {
        const defaultCh = chs.find((c: ChatChannel) => c.type === 'group') || chs[0];
        console.log('[Chat] init: defaultCh=', defaultCh?.id, defaultCh?.name, defaultCh?.type);
        if (defaultCh?.id) {
          setActiveChannelId(defaultCh.id);
          await fetchMessages(defaultCh.id);
          subscribeTo(defaultCh.id);
        }
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

  // Upload attachment to Supabase Storage
  const uploadAttachment = useCallback(async (attachment: SelectedAttachment): Promise<{ url: string } | null> => {
    if (!activeChannelId) return null;

    const timestamp = Date.now();
    const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${activeChannelId}/${timestamp}_${safeName}`;

    console.log('[Chat] Uploading attachment:', storagePath);

    try {
      // Read file as ArrayBuffer — fetch().blob() produces 0-byte blobs on local file:// URIs in React Native
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', attachment.uri);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Failed to read file'));
        xhr.send();
      });

      const { data, error } = await supabaseRef.current.storage
        .from(CHAT_ATTACHMENT_BUCKET)
        .upload(storagePath, arrayBuffer, {
          contentType: attachment.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (error) {
        console.error('[Chat] Storage upload error:', error);
        Alert.alert('Upload Failed', 'Could not upload the attachment. Please try again.');
        return null;
      }

      // Get the public URL
      const { data: urlData } = supabaseRef.current.storage
        .from(CHAT_ATTACHMENT_BUCKET)
        .getPublicUrl(data.path);

      console.log('[Chat] Upload success, URL:', urlData.publicUrl);
      return { url: urlData.publicUrl };
    } catch (err) {
      console.error('[Chat] Upload exception:', err);
      Alert.alert('Upload Failed', 'Could not upload the attachment. Please try again.');
      return null;
    }
  }, [activeChannelId]);

  const sendMessage = async (
    content: string,
    attachment?: { url: string; type: 'image' | 'file'; name: string }
  ) => {
    if (!activeChannelId || !user) return;

    const insertPayload: Record<string, any> = {
      channel_id: activeChannelId,
      user_id: user.id,
      content: content || '',
    };

    if (attachment) {
      insertPayload.attachment_url = attachment.url;
      insertPayload.attachment_type = attachment.type;
      insertPayload.attachment_name = attachment.name;
    }

    console.log('[Chat] sendMessage:', insertPayload);
    const { data, error } = await supabaseRef.current.from('chat_messages').insert(insertPayload).select();
    console.log('[Chat] sendMessage result:', { data, error });

    // Send push notification to other members
    if (data && !error) {
      try {
        const senderName = client?.first_name
          ? `${client.first_name} ${client.last_name || ''}`.trim()
          : 'Someone';
        api.post('/api/webhooks/chat-message', {
          channel_id: activeChannelId,
          sender_id: user.id,
          content: content || (attachment ? 'Sent an attachment' : ''),
          sender_name: senderName,
        }).catch(() => {});
      } catch { /* best effort */ }
    }
  };

  const handleNewChatCreated = async (channelId: string) => {
    // Delay to let Supabase propagate, then retry a few times
    let chs: ChatChannel[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise(r => setTimeout(r, 800));
      chs = await fetchChannels();
      if (chs.find(c => c.id === channelId)) break;
    }
    setActiveChannelId(channelId);
    setMessages([]);
    await fetchMessages(channelId);
    subscribeTo(channelId);
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
        <BrandHeader />
        <Text style={styles.emptyTitle}>No Conversations Yet</Text>
        <Text style={styles.emptyText}>
          Start a conversation with your coach or team.
        </Text>
        <TouchableOpacity style={styles.newChatBtn} onPress={() => setShowNewChat(true)}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.newChatBtnText}>New Chat</Text>
        </TouchableOpacity>
        <NewChatModal
          visible={showNewChat}
          onClose={() => setShowNewChat(false)}
          onCreated={handleNewChatCreated}
        />
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
        <View style={styles.headerRow}>
          <BrandHeader title={headerTitle} compact />
          <TouchableOpacity onPress={() => setShowNewChat(true)} style={styles.newBtn}>
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
        <ChannelPills
          channels={channels}
          activeId={activeChannelId!}
          onSelect={handleChannelSwitch}
        />
      </View>
      <NewChatModal
        visible={showNewChat}
        onClose={() => setShowNewChat(false)}
        onCreated={handleNewChatCreated}
      />

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
        <ChatInput
          onSend={sendMessage}
          onUploadAttachment={uploadAttachment}
        />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  newBtn: {
    padding: spacing.sm,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: spacing.xl,
  },
  newChatBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
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
