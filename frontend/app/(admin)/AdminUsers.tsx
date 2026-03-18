import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  RefreshControl, StatusBar, Modal, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';
import type { UserRole } from '../../types/admin';

const C = {
  bg: '#FAFAFA', surface: '#FFFFFF', border: '#F0F0F0', divider: '#F5F5F5',
  primary: '#FF8C42', primaryLight: '#FFF3EA',
  green: '#10B981', greenSoft: '#ECFDF5',
  red: '#EF4444', redSoft: '#FEF2F2',
  yellow: '#F59E0B', yellowSoft: '#FFFBEB',
  blue: '#3B82F6', blueSoft: '#EFF6FF',
  text: '#1A1A1A', textSub: '#666666', textMuted: '#999999',
};

interface UserItem {
  id: string; username: string; full_name: string | null;
  avatar_url: string | null; role: UserRole; is_banned: boolean;
  followers_count: number; posts_count: number; scout_points: number;
  created_at: string;
}

const ROLE_CONFIG: Record<UserRole, { color: string; bg: string; icon: string }> = {
  admin:     { color: C.primary, bg: C.primaryLight, icon: '⚙️' },
  moderator: { color: C.blue,    bg: C.blueSoft,     icon: '🛡️' },
  user:      { color: C.textSub, bg: C.bg,           icon: '👤' },
};

const RoleBadge = ({ role }: { role: UserRole }) => {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
  return (
    <View style={[s.roleBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
      <Text style={[s.roleBadgeText, { color: cfg.color }]}>{cfg.icon} {role}</Text>
    </View>
  );
};

function UserDetailModal({ user, visible, onClose, onUpdate }: {
  user: UserItem | null; visible: boolean; onClose: () => void; onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  if (!user) return null;

  const doAction = async (fn: () => Promise<void>, label: string) => {
    setLoading(true);
    try { await fn(); onUpdate(); onClose(); }
    catch { Alert.alert('Error', `Failed to ${label}`); }
    finally { setLoading(false); }
  };

  const handleRole = (newRole: UserRole) => {
    if (user.role === newRole) return;
    Alert.alert('Change Role', `Set @${user.username} as ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => doAction(() => adminApi.updateUser(user.id, { role: newRole }), 'update role') },
    ]);
  };

  const handleBan = () => {
    const action = user.is_banned ? 'Unban' : 'Ban';
    Alert.alert(`${action} User`, `${action} @${user.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action, style: user.is_banned ? 'default' : 'destructive',
        onPress: () => doAction(
          () => adminApi.updateUser(user.id, { is_banned: !user.is_banned, ban_reason: user.is_banned ? undefined : 'Violated community guidelines' }),
          action.toLowerCase()
        ),
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Account', `Permanently delete @${user.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doAction(() => adminApi.deleteUser(user.id), 'delete') },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modal}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>User Details</Text>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.hero}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={s.heroAvatar} />
            ) : (
              <View style={[s.heroAvatar, s.heroAvatarFb]}>
                <Text style={s.heroAvatarChar}>{user.username[0]?.toUpperCase()}</Text>
              </View>
            )}
            <Text style={s.heroName}>@{user.username}</Text>
            {user.full_name ? <Text style={s.heroFull}>{user.full_name}</Text> : null}
            <View style={s.heroBadges}>
              <RoleBadge role={user.role ?? 'user'} />
              {user.is_banned && (
                <View style={[s.roleBadge, { backgroundColor: C.redSoft, borderColor: C.red + '40' }]}>
                  <Text style={[s.roleBadgeText, { color: C.red }]}>🚫 Banned</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Followers', value: user.followers_count, color: C.blue },
              { label: 'Posts',     value: user.posts_count,     color: C.primary },
              { label: 'Points',    value: user.scout_points,    color: C.yellow },
            ].map(st => (
              <View key={st.label} style={s.statCell}>
                <Text style={[s.statVal, { color: st.color }]}>{st.value ?? 0}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.joinedText}>
            Joined {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>

          {/* Role */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Change Role</Text>
            <View style={s.roleRow}>
              {(['user', 'moderator', 'admin'] as UserRole[]).map(r => {
                const cfg = ROLE_CONFIG[r];
                const active = user.role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.roleChip, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                    onPress={() => handleRole(r)}
                    disabled={active || loading}
                  >
                    <Text style={[s.roleChipText, active && { color: cfg.color, fontWeight: '700' }]}>
                      {cfg.icon} {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Moderation */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Moderation</Text>
            <TouchableOpacity
              style={[s.actionBtn, user.is_banned ? { backgroundColor: C.greenSoft, borderColor: C.green + '40' } : { backgroundColor: C.yellowSoft, borderColor: C.yellow + '40' }]}
              onPress={handleBan} disabled={loading}
            >
              <Ionicons name={user.is_banned ? 'checkmark-circle-outline' : 'ban-outline'} size={18} color={user.is_banned ? C.green : C.yellow} />
              <Text style={[s.actionBtnText, { color: user.is_banned ? C.green : C.yellow }]}>
                {user.is_banned ? 'Unban User' : 'Ban User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: C.redSoft, borderColor: C.red + '40' }]}
              onPress={handleDelete} disabled={loading}
            >
              <Ionicons name="trash-outline" size={18} color={C.red} />
              <Text style={[s.actionBtnText, { color: C.red }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 16 }} />}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function AdminUsers({ navigation }: { navigation: any }) {
  const [users, setUsers]           = useState<UserItem[]>([]);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [selected, setSelected]     = useState<UserItem | null>(null);

  const load = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (!reset && p > 1 && users.length >= total) return;
    try {
      const res = await adminApi.getUsers({ page: p, search, role: roleFilter });
      setUsers(reset ? res.data : [...users, ...res.data]);
      setTotal(res.pagination.total);
      setPage(p + 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [page, search, roleFilter, users, total]);

  useEffect(() => { setLoading(true); setUsers([]); setPage(1); }, [search, roleFilter]);
  useEffect(() => { if (loading && users.length === 0) load(true); }, [loading]);
  const onRefresh = () => { setRefreshing(true); setUsers([]); setPage(1); setLoading(true); };

  const renderUser = ({ item }: { item: UserItem }) => (
    <TouchableOpacity style={[s.row, item.is_banned && s.rowBanned]} onPress={() => setSelected(item)} activeOpacity={0.7}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={s.avatar} />
      ) : (
        <View style={[s.avatar, s.avatarFb]}>
          <Text style={s.avatarChar}>{item.username[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={s.rowInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={s.rowName}>@{item.username}</Text>
          {item.is_banned && <Ionicons name="ban-outline" size={12} color={C.red} />}
        </View>
        <Text style={s.rowMeta} numberOfLines={1}>
          {item.full_name || '–'} · {item.posts_count} posts · {item.followers_count} followers
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <RoleBadge role={item.role ?? 'user'} />
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.screenTitle}>Users</Text>
          <Text style={s.screenSub}>{total.toLocaleString()} total</Text>
        </View>
      </View>

      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by username or name…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {(['', 'user', 'moderator', 'admin'] as (UserRole | '')[]).map(r => {
          const active = roleFilter === r;
          const cfg = r ? ROLE_CONFIG[r as UserRole] : null;
          return (
            <TouchableOpacity
              key={r}
              style={[s.chip, active && { backgroundColor: cfg?.bg ?? C.primaryLight, borderColor: cfg?.color ?? C.primary }]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[s.chipText, active && { color: cfg?.color ?? C.primary, fontWeight: '700' }]}>
                {r ? `${ROLE_CONFIG[r as UserRole].icon} ${r}` : 'All'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && users.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={i => i.id}
          renderItem={renderUser}
          onEndReached={() => load()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 74 }} />}
          ListEmptyComponent={<Text style={s.empty}>No users found</Text>}
          ListFooterComponent={loading && users.length > 0 ? <ActivityIndicator color={C.primary} style={{ padding: 20 }} /> : null}
        />
      )}

      <UserDetailModal user={selected} visible={!!selected} onClose={() => setSelected(null)} onUpdate={onRefresh} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  screenTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  screenSub:   { fontSize: 12, color: C.textMuted, marginTop: 1 },

  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, marginHorizontal: 16, marginVertical: 10, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, height: 44 },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },

  filters:     { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipText:    { color: C.textSub, fontSize: 13, fontWeight: '500' },

  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface },
  rowBanned:   { opacity: 0.5 },
  avatar:      { width: 46, height: 46, borderRadius: 23 },
  avatarFb:    { backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarChar:  { color: C.primary, fontSize: 18, fontWeight: '700' },
  rowInfo:     { flex: 1, marginLeft: 12 },
  rowName:     { fontSize: 14, fontWeight: '600', color: C.text },
  rowMeta:     { fontSize: 12, color: C.textSub, marginTop: 2 },
  empty:       { color: C.textSub, textAlign: 'center', paddingTop: 60, fontSize: 15 },

  roleBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },

  // Modal
  modal:       { flex: 1, backgroundColor: C.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:  { fontSize: 17, fontWeight: '700', color: C.text },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },

  hero:           { alignItems: 'center', paddingVertical: 28, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  heroAvatar:     { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
  heroAvatarFb:   { backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  heroAvatarChar: { color: C.primary, fontSize: 34, fontWeight: '700' },
  heroName:       { fontSize: 18, fontWeight: '800', color: C.text },
  heroFull:       { fontSize: 14, color: C.textSub, marginTop: 4 },
  heroBadges:     { flexDirection: 'row', gap: 8, marginTop: 12 },

  statsRow:   { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  statCell:   { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statVal:    { fontSize: 22, fontWeight: '800' },
  statLabel:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  joinedText: { textAlign: 'center', color: C.textMuted, fontSize: 12, paddingVertical: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },

  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  roleRow:      { flexDirection: 'row', gap: 8 },
  roleChip:     { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  roleChipText: { fontSize: 13, fontWeight: '500', color: C.textSub },

  actionBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
});