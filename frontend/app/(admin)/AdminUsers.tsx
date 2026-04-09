import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  RefreshControl, StatusBar, Modal, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';
import type { AdminUser, UserRole } from '../../types/admin';

const C = {
  bg:           '#FAFAFA',
  surface:      '#FFFFFF',
  border:       '#F0F0F0',
  divider:      '#F5F5F5',
  primary:      '#FF8C42',
  primaryLight: '#FFF3EA',
  green:        '#10B981',
  greenSoft:    '#ECFDF5',
  red:          '#EF4444',
  redSoft:      '#FEF2F2',
  yellow:       '#F59E0B',
  yellowSoft:   '#FFFBEB',
  blue:         '#3B82F6',
  blueSoft:     '#EFF6FF',
  text:         '#1A1A1A',
  textSub:      '#666666',
  textMuted:    '#999999',
};

const ROLE_CFG: Record<UserRole, { color: string; bg: string; label: string }> = {
  admin:     { color: C.primary, bg: C.primaryLight, label: '⚙️ Admin' },
  moderator: { color: C.blue,    bg: C.blueSoft,     label: '🛡️ Mod' },
  user:      { color: C.textSub, bg: C.divider,      label: '👤 User' },
};

/* ── Role badge ──────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CFG[role] ?? ROLE_CFG.user;
  return (
    <View style={[s.roleBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + '50' }]}>
      <Text style={[s.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

/* ── Avatar helper ───────────────────────────────────────────────── */
function Avatar({ uri, username, size = 46 }: { uri?: string | null; username: string; size?: number }) {
  const radius = size / 2;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, s.avatarFb]}>
      <Text style={[s.avatarChar, { fontSize: size * 0.4 }]}>{username[0]?.toUpperCase()}</Text>
    </View>
  );
}

/* ── Info row in modal ───────────────────────────────────────────── */
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={15} color={C.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

/* ── User detail modal ───────────────────────────────────────────── */
function UserDetailModal({ user, visible, onClose, onUpdate }: {
  user: AdminUser | null; visible: boolean; onClose: () => void; onUpdate: (u?: AdminUser) => void;
}) {
  const [loading, setLoading] = useState(false);
  if (!user) return null;

  const doAction = async (fn: () => Promise<any>, label: string) => {
    setLoading(true);
    try {
      const result = await fn();
      onUpdate(result);
      onClose();
    } catch {
      Alert.alert('Error', `Failed to ${label}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRole = (newRole: UserRole) => {
    if (user.role === newRole) return;
    Alert.alert(
      'Change Role',
      `Set @${user.username} as ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => doAction(
            () => adminApi.updateUser(user.id, { role: newRole }),
            'update role'
          ),
        },
      ]
    );
  };

  const handleBan = () => {
    const isBanned = user.is_banned;
    Alert.alert(
      isBanned ? 'Unban User' : 'Ban User',
      `${isBanned ? 'Restore access for' : 'Ban'} @${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBanned ? 'Unban' : 'Ban',
          style: isBanned ? 'default' : 'destructive',
          onPress: () => doAction(
            () => adminApi.updateUser(user.id, {
              is_banned:  !isBanned,
              ban_reason: isBanned ? null : 'Violated community guidelines',
            }),
            isBanned ? 'unban user' : 'ban user'
          ),
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      `Permanently delete @${user.username}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => doAction(
            () => adminApi.deleteUser(user.id),
            'delete user'
          ),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modal}>
        {/* Modal header */}
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>User Details</Text>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Hero */}
          <View style={s.hero}>
            <Avatar uri={user.avatar_url} username={user.username} size={84} />
            <Text style={s.heroName}>@{user.username}</Text>
            {user.full_name ? <Text style={s.heroFull}>{user.full_name}</Text> : null}
            <View style={s.heroBadges}>
              <RoleBadge role={user.role ?? 'user'} />
              {user.is_banned && (
                <View style={[s.roleBadge, { backgroundColor: C.redSoft, borderColor: C.red + '50' }]}>
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
                <Text style={[s.statVal, { color: st.color }]}>{(st.value ?? 0).toLocaleString()}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Info rows */}
          <View style={s.infoSection}>
            {user.email ? <InfoRow icon="mail-outline" label="Email" value={user.email} /> : null}
            {user.bio   ? <InfoRow icon="document-text-outline" label="Bio" value={user.bio} /> : null}
            {user.ban_reason && user.is_banned
              ? <InfoRow icon="ban-outline" label="Ban Reason" value={user.ban_reason} />
              : null
            }
            <InfoRow
              icon="calendar-outline"
              label="Joined"
              value={new Date(user.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
          </View>

          {/* Change role */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Change Role</Text>
            <View style={s.roleRow}>
              {(['user', 'moderator', 'admin'] as UserRole[]).map(r => {
                const cfg    = ROLE_CFG[r];
                const active = user.role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.roleChip, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                    onPress={() => handleRole(r)}
                    disabled={active || loading}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.roleChipText, active && { color: cfg.color, fontWeight: '700' }]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Moderation actions */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Moderation</Text>

            <TouchableOpacity
              style={[
                s.actionBtn,
                user.is_banned
                  ? { backgroundColor: C.greenSoft, borderColor: C.green + '40' }
                  : { backgroundColor: C.yellowSoft, borderColor: C.yellow + '40' },
              ]}
              onPress={handleBan}
              disabled={loading}
            >
              <Ionicons
                name={user.is_banned ? 'checkmark-circle-outline' : 'ban-outline'}
                size={18}
                color={user.is_banned ? C.green : C.yellow}
              />
              <Text style={[s.actionBtnText, { color: user.is_banned ? C.green : C.yellow }]}>
                {user.is_banned ? 'Unban User' : 'Ban User'}
              </Text>
              {loading && <ActivityIndicator size="small" color={C.textMuted} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: C.redSoft, borderColor: C.red + '40' }]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={18} color={C.red} />
              <Text style={[s.actionBtnText, { color: C.red }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ── Main screen ─────────────────────────────────────────────────── */
export default function AdminUsers({ navigation }: { navigation: any }) {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [selected, setSelected]     = useState<AdminUser | null>(null);
  const pageRef                     = useRef(1);
  const hasMoreRef                  = useRef(true);

  const fetchUsers = useCallback(async (
    reset: boolean,
    searchVal: string,
    roleVal: UserRole | ''
  ) => {
    if (reset) {
      pageRef.current = 1;
      hasMoreRef.current = true;
    }
    if (!hasMoreRef.current && !reset) return;

    const p = pageRef.current;
    if (p > 1) setLoadingMore(true);

    try {
      const res = await adminApi.getUsers({
        page:   p,
        search: searchVal || undefined,
        role:   roleVal   || undefined,
      });
      setUsers(prev => reset ? res.data : [...prev, ...res.data]);
      setTotal(res.pagination.total);
      pageRef.current    = p + 1;
      hasMoreRef.current = p < res.pagination.pages;
    } catch (e) {
      console.error('[AdminUsers] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setUsers([]);
    fetchUsers(true, search, roleFilter);
  }, [search, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setUsers([]);
    fetchUsers(true, search, roleFilter);
  }, [fetchUsers, search, roleFilter]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && !loading && hasMoreRef.current) {
      fetchUsers(false, search, roleFilter);
    }
  }, [fetchUsers, loadingMore, loading, search, roleFilter]);

  // Called from modal after an action; refreshes list
  const handleUpdate = useCallback((updatedUser?: AdminUser) => {
    if (updatedUser) {
      // If user was deleted, updatedUser will be undefined
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    } else {
      // Deletion — full refresh
      onRefresh();
    }
  }, [onRefresh]);

  const renderUser = useCallback(({ item }: { item: AdminUser }) => (
    <TouchableOpacity
      style={[s.row, item.is_banned && s.rowBanned]}
      onPress={() => setSelected(item)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.avatar_url} username={item.username} size={46} />
      <View style={s.rowInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={s.rowName}>@{item.username}</Text>
          {item.is_banned && <Ionicons name="ban-outline" size={12} color={C.red} />}
        </View>
        <Text style={s.rowMeta} numberOfLines={1}>
          {item.full_name || '–'} · {item.posts_count} posts · {(item.followers_count ?? 0).toLocaleString()} followers
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <RoleBadge role={item.role ?? 'user'} />
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.screenTitle}>Users</Text>
          <Text style={s.screenSub}>{total.toLocaleString()} total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by username or name…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* Role filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {(['', 'user', 'moderator', 'admin'] as (UserRole | '')[]).map(r => {
          const active = roleFilter === r;
          const cfg    = r ? ROLE_CFG[r as UserRole] : null;
          return (
            <TouchableOpacity
              key={r || 'all'}
              style={[s.chip, active && { backgroundColor: cfg?.bg ?? C.primaryLight, borderColor: cfg?.color ?? C.primary }]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[s.chipText, active && { color: cfg?.color ?? C.primary, fontWeight: '700' }]}>
                {r ? ROLE_CFG[r as UserRole].label : 'All Users'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={i => i.id}
          renderItem={renderUser}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.divider, marginLeft: 74 }} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="people-outline" size={48} color={C.border} />
              <Text style={s.empty}>No users found</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={C.primary} style={{ padding: 20 }} />
              : null
          }
        />
      )}

      <UserDetailModal
        user={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onUpdate={handleUpdate}
      />
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

  filters:  { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipText: { color: C.textSub, fontSize: 13, fontWeight: '500' },

  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: C.surface },
  rowBanned: { opacity: 0.5 },
  avatarFb:  { backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarChar:{ color: C.primary, fontWeight: '700' },
  rowInfo:   { flex: 1, marginLeft: 12 },
  rowName:   { fontSize: 14, fontWeight: '600', color: C.text },
  rowMeta:   { fontSize: 12, color: C.textSub, marginTop: 2 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  empty:     { color: C.textSub, fontSize: 15 },

  roleBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },

  // Modal
  modal:       { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  closeBtn:   {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  hero:           { alignItems: 'center', paddingVertical: 28, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  heroName:       { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 12 },
  heroFull:       { fontSize: 14, color: C.textSub, marginTop: 4 },
  heroBadges:     { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },

  statsRow:  { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  statCell:  { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statVal:   { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  infoSection: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  infoRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoLabel:   { fontSize: 10, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:   { fontSize: 13, color: C.text, marginTop: 2 },

  section:      { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  roleRow:      { flexDirection: 'row', gap: 8 },
  roleChip:     { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  roleChipText: { fontSize: 12, fontWeight: '500', color: C.textSub },

  actionBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
});