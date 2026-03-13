import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}

interface UserOption {
  id: string;
  full_name: string | null;
  email: string;
}

export function NewChatModal({ visible, onClose, onCreated }: NewChatModalProps) {
  const { user, isAdmin, organizationId } = useAuth();
  const [mode, setMode] = useState<'pick' | 'group'>('pick');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    console.log('[NewChat] Modal visible:', visible, 'orgId:', organizationId);
    if (!visible || !organizationId) return;
    loadUsers();
  }, [visible, organizationId]);

  const loadUsers = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      // Get org members (coaches)
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id, profiles:user_id(id, full_name, email)')
        .eq('organization_id', organizationId);

      // Get clients with accounts
      const { data: clients } = await supabase
        .from('clients')
        .select('user_id, first_name, last_name, email')
        .eq('organization_id', organizationId)
        .not('user_id', 'is', null);

      const allUsers: UserOption[] = [];
      const seen = new Set<string>();

      (members || []).forEach((m: any) => {
        const p = m.profiles;
        if (p && p.id !== user?.id && !seen.has(p.id)) {
          seen.add(p.id);
          allUsers.push({ id: p.id, full_name: p.full_name, email: p.email });
        }
      });

      (clients || []).forEach((c: any) => {
        if (c.user_id && c.user_id !== user?.id && !seen.has(c.user_id)) {
          seen.add(c.user_id);
          allUsers.push({
            id: c.user_id,
            full_name: `${c.first_name} ${c.last_name}`.trim(),
            email: c.email || '',
          });
        }
      });

      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const startDM = async (targetUserId: string) => {
    console.log('[NewChat] startDM called, orgId:', organizationId, 'user:', !!user);
    if (!user || !organizationId) {
      console.error('[NewChat] Cannot create DM - missing user or organizationId');
      return;
    }
    setCreating(true);
    try {
      const targetUser = users.find(u => u.id === targetUserId);
      const channelName = targetUser?.full_name || targetUser?.email || 'DM';

      // Create DM channel
      const { data: channel, error } = await supabase
        .from('chat_channels')
        .insert({
          organization_id: organizationId,
          name: channelName,
          type: 'dm',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('[NewChat] Channel insert error:', error);
        throw error;
      }
      console.log('[NewChat] Channel created:', channel.id);

      // Add both users as members
      const { error: memberError } = await supabase.from('chat_members').insert([
        { channel_id: channel.id, user_id: user.id },
        { channel_id: channel.id, user_id: targetUserId },
      ]);
      if (memberError) console.error('[NewChat] Member insert error:', memberError);

      onCreated(channel.id);
      handleClose();
    } catch (err) {
      console.error('Failed to create DM:', err);
    } finally {
      setCreating(false);
    }
  };

  const createGroup = async () => {
    if (!user || !organizationId || !groupName.trim()) return;
    setCreating(true);
    try {
      const { data: channel, error } = await supabase
        .from('chat_channels')
        .insert({
          organization_id: organizationId,
          name: groupName.trim(),
          type: 'group',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator + selected members
      const members = [user.id, ...selectedUsers].map(uid => ({
        channel_id: channel.id,
        user_id: uid,
      }));

      await supabase.from('chat_members').insert(members);

      onCreated(channel.id);
      handleClose();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleClose = () => {
    setMode('pick');
    setSearch('');
    setGroupName('');
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'pick' ? 'New Conversation' : 'New Group'}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        {isAdmin && (
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'pick' && styles.modeBtnActive]}
              onPress={() => setMode('pick')}
            >
              <Ionicons name="person" size={16} color={mode === 'pick' ? '#fff' : colors.textSecondary} />
              <Text style={[styles.modeBtnText, mode === 'pick' && styles.modeBtnTextActive]}>
                Direct Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'group' && styles.modeBtnActive]}
              onPress={() => setMode('group')}
            >
              <Ionicons name="people" size={16} color={mode === 'group' ? '#fff' : colors.textSecondary} />
              <Text style={[styles.modeBtnText, mode === 'group' && styles.modeBtnTextActive]}>
                Group Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />

        {/* Group Name */}
        {mode === 'group' && (
          <TextInput
            style={styles.searchInput}
            placeholder="Group name..."
            placeholderTextColor={colors.textTertiary}
            value={groupName}
            onChangeText={setGroupName}
          />
        )}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = selectedUsers.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.userRow, mode === 'group' && isSelected && styles.userRowSelected]}
                  onPress={() => {
                    if (mode === 'pick') {
                      startDM(item.id);
                    } else {
                      toggleUser(item.id);
                    }
                  }}
                  disabled={creating}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.full_name || item.email)[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.full_name || 'Unknown'}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  {mode === 'pick' ? (
                    <Ionicons name="chatbubble-outline" size={20} color={colors.accent} />
                  ) : (
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? colors.accent : colors.textTertiary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No users found</Text>
            }
          />
        )}

        {/* Create Group Button */}
        {mode === 'group' && selectedUsers.length > 0 && (
          <View style={styles.footer}>
            <Button
              title={creating ? 'Creating...' : `Create Group (${selectedUsers.length} members)`}
              onPress={createGroup}
              loading={creating}
              disabled={!groupName.trim() || creating}
            />
          </View>
        )}

        {creating && mode === 'pick' && (
          <View style={styles.creatingOverlay}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.creatingText}>Creating conversation...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 4,
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  modeBtnActive: {
    backgroundColor: colors.accent,
  },
  modeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userRowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  creatingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  creatingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
