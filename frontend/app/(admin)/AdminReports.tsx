import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput,
  RefreshControl, StatusBar, SafeAreaView, ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';
import type { AdminReport, AdminReportStatus } from '../../types/admin';

const C = {
  bg: '#FAFAFA', surface: '#FFFFFF', border: '#F0F0F0', divider: '#F5F5F5',
  primary: '#FF8C42', primaryLight: '#FFF3EA',
  green: '#10B981', greenSoft: '#ECFDF5',
  red: '#EF4444', redSoft: '#FEF2F2',
  yellow: '#F59E0B', yellowSoft: '#FFFBEB',
  blue: '#3B82F6', blueSoft: '#EFF6FF',
  text: '#1A1A1A', textSub: '#666666', textMuted: '#999999',
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:   { color: C.red,     bg: C.redSoft,    label: 'Pending',   icon: 'time-outline' },
  resolved:  { color: C.green,   bg: C.greenSoft,  label: 'Resolved',  icon: 'checkmark-circle-outline' },
  dismissed: { color: C.textSub, bg: C.divider,    label: 'Dismissed', icon: 'remove-circle-outline' },
};

const TYPE_CFG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  post:       { color: C.primary, bg: C.primaryLight, icon: 'images-outline',     label: 'Post' },
  user:       { color: C.blue,    bg: C.blueSoft,     icon: 'person-outline',     label: 'User' },
  restaurant: { color: C.yellow,  bg: C.yellowSoft,   icon: 'storefront-outline', label: 'Restaurant' },
};

/* ── Person chip ─────────────────────────────────────────────────── */
function PersonChip({
  avatar, username, color = C.text,
}: {
  avatar?: string | null; username: string; color?: string;
}) {
  return (
    <View style={s.chip2}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={s.chip2Avatar} />
      ) : (
        <View style={[s.chip2Avatar, s.chip2AvatarFb]}>
          <Text style={s.chip2Char}>{username[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={[s.chip2Name, { color }]} numberOfLines={1}>@{username}</Text>
    </View>
  );
}

/* ── Resolve modal (with note input) ────────────────────────────── */
function ResolveModal({
  visible,
  report,
  action,
  onClose,
  onConfirm,
}: {
  visible:   boolean;
  report:    AdminReport | null;
  action:    'resolved' | 'dismissed' | null;
  onClose:   () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) setNote('');
  }, [visible]);

  if (!report || !action) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.resolveModal}>
          <Text style={s.resolveTitle}>
            {action === 'resolved' ? '✅ Resolve Report' : '🚫 Dismiss Report'}
          </Text>
          <Text style={s.resolveSubtitle}>Add an optional note (shown in report history):</Text>
          <TextInput
            style={s.noteInput}
            placeholder="Resolution note…"
            placeholderTextColor={C.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
          <View style={s.resolveActions}>
            <TouchableOpacity style={s.resolveCancelBtn} onPress={onClose}>
              <Text style={s.resolveCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.resolveConfirmBtn,
                { backgroundColor: action === 'resolved' ? C.green : C.textSub },
              ]}
              onPress={() => onConfirm(note)}
            >
              <Text style={s.resolveConfirmText}>
                {action === 'resolved' ? 'Resolve' : 'Dismiss'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminReports({ navigation }: { navigation: any }) {
  const [reports, setReports]           = useState<AdminReport[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<AdminReportStatus>('pending');
  const [resolving, setResolving]       = useState<AdminReport | null>(null);
  const [resolveAction, setResolveAction] = useState<'resolved' | 'dismissed' | null>(null);

  // FIX: stable load function — accepts params directly to avoid stale closures
  const fetchReports = useCallback(async (status: AdminReportStatus) => {
    try {
      const res = await adminApi.getReports({ status, page: 1, limit: 50 });
      setReports(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      console.error('[AdminReports] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setReports([]);
    fetchReports(statusFilter);
  }, [statusFilter, fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports(statusFilter);
  }, [fetchReports, statusFilter]);

  /* ── Resolve / dismiss flow ────────────────────────────────────── */
  const openResolve = (item: AdminReport, action: 'resolved' | 'dismissed') => {
    setResolving(item);
    setResolveAction(action);
  };

  const handleConfirmResolve = async (note: string) => {
    if (!resolving || !resolveAction) return;
    const itemId = resolving.id;
    setResolving(null);
    setResolveAction(null);
    try {
      await adminApi.resolveReport(
        itemId,
        resolveAction,
        note.trim() || undefined
      );
      setReports(prev => prev.filter(r => r.id !== itemId));
      setTotal(t => Math.max(0, t - 1));
    } catch {
      Alert.alert('Error', 'Failed to update report. Please try again.');
    }
  };

  /* ── Report card ─────────────────────────────────────────── */
  const renderReport = useCallback(({ item }: { item: AdminReport }) => {
    const tc  = TYPE_CFG[item.type]     ?? TYPE_CFG.post;
    const sc  = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
    const postImg = item.post?.images?.[0];

    return (
      <View style={s.card}>
        {/* Card header */}
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <View style={[s.typePill, { backgroundColor: tc.bg }]}>
              <Ionicons name={tc.icon as any} size={11} color={tc.color} />
              <Text style={[s.typePillText, { color: tc.color }]}>{tc.label}</Text>
            </View>
            {item.status !== 'pending' && (
              <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                <Ionicons name={sc.icon as any} size={11} color={sc.color} />
                <Text style={[s.statusPillText, { color: sc.color }]}>{sc.label}</Text>
              </View>
            )}
          </View>
          <Text style={s.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>

        {/* Reason */}
        <View style={s.reasonBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.textMuted} />
          <Text style={s.reasonText} numberOfLines={3}>
            "{item.reason}"
          </Text>
        </View>

        {/* People */}
        <View style={s.peopleRow}>
          {item.reporter && (
            <View style={s.personEntry}>
              <Text style={s.personLabel}>Reporter</Text>
              <PersonChip
                avatar={item.reporter.avatar_url}
                username={item.reporter.username}
              />
            </View>
          )}

          {item.target_user && (
            <View style={s.personEntry}>
              <Text style={s.personLabel}>Reported User</Text>
              <PersonChip
                avatar={item.target_user.avatar_url}
                username={item.target_user.username}
                color={C.red}
              />
            </View>
          )}
        </View>

        {/* Post preview */}
        {item.post && (
          <View style={s.postPreview}>
            {postImg ? (
              <Image source={{ uri: postImg }} style={s.postThumb} />
            ) : (
              <View style={[s.postThumb, s.postThumbEmpty]}>
                <Ionicons name="image-outline" size={16} color={C.textMuted} />
              </View>
            )}
            <Text style={s.postCaption} numberOfLines={2}>
              {item.post.caption || '(no caption)'}
            </Text>
          </View>
        )}

        {/* Restaurant preview */}
        {item.restaurant && (
          <View style={s.restaurantPreview}>
            <Ionicons name="storefront-outline" size={14} color={C.yellow} />
            <Text style={s.restaurantName} numberOfLines={1}>{item.restaurant.name}</Text>
            {item.restaurant.address
              ? <Text style={s.restaurantAddr} numberOfLines={1}>{item.restaurant.address}</Text>
              : null
            }
          </View>
        )}

        {/* Resolution note (for resolved/dismissed) */}
        {item.resolution_note && (
          <View style={s.resolutionNote}>
            <Ionicons name="information-circle-outline" size={14} color={C.blue} />
            <Text style={s.resolutionText} numberOfLines={2}>{item.resolution_note}</Text>
          </View>
        )}

        {/* Action buttons (pending only) */}
        {statusFilter === 'pending' && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnGreen]}
              onPress={() => openResolve(item, 'resolved')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={C.green} />
              <Text style={[s.actionBtnText, { color: C.green }]}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnGray]}
              onPress={() => openResolve(item, 'dismissed')}
              activeOpacity={0.8}
            >
              <Ionicons name="remove-circle-outline" size={16} color={C.textSub} />
              <Text style={[s.actionBtnText, { color: C.textSub }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [statusFilter]);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.screenTitle}>Reports</Text>
          <Text style={s.screenSub}>
            {total.toLocaleString()} {statusFilter}
          </Text>
        </View>
      </View>

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {(Object.entries(STATUS_CFG) as [AdminReportStatus, typeof STATUS_CFG[string]][]).map(
          ([key, cfg]) => {
            const active = statusFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  s.chip,
                  active && { backgroundColor: cfg.bg, borderColor: cfg.color + '60' },
                ]}
                onPress={() => setStatusFilter(key)}
              >
                <Ionicons
                  name={cfg.icon as any}
                  size={12}
                  color={active ? cfg.color : C.textMuted}
                />
                <Text style={[s.chipText, active && { color: cfg.color, fontWeight: '700' }]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={i => i.id}
          renderItem={renderReport}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="flag-outline" size={48} color={C.border} />
              <Text style={s.empty}>No {statusFilter} reports</Text>
              <Text style={s.emptySub}>
                {statusFilter === 'pending'
                  ? 'All clear! No reports need attention.'
                  : `No ${statusFilter} reports to show.`}
              </Text>
            </View>
          }
        />
      )}

      <ResolveModal
        visible={!!resolving}
        report={resolving}
        action={resolveAction}
        onClose={() => { setResolving(null); setResolveAction(null); }}
        onConfirm={handleConfirmResolve}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  screenTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  screenSub:   { fontSize: 12, color: C.textMuted, marginTop: 1, textTransform: 'capitalize' },

  filters:  { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  chipText: { color: C.textSub, fontSize: 13, fontWeight: '500' },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  typePill:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  typePillText:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  statusPillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  dateText:       { fontSize: 11, color: C.textMuted },

  reasonBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: C.bg, borderRadius: 10, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  reasonText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 19, fontStyle: 'italic' },

  peopleRow:   { flexDirection: 'row', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  personEntry: { gap: 4 },
  personLabel: { fontSize: 10, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  chip2:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border, maxWidth: 150 },
  chip2Avatar:   { width: 20, height: 20, borderRadius: 10 },
  chip2AvatarFb: { backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  chip2Char:     { fontSize: 9, fontWeight: '700', color: C.primary },
  chip2Name:     { fontSize: 12, fontWeight: '600', flex: 1 },

  postPreview:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 10, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  postThumb:      { width: 46, height: 46, borderRadius: 8 },
  postThumbEmpty: { backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  postCaption:    { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 18 },

  restaurantPreview: { flexDirection: 'column', gap: 2, backgroundColor: C.yellowSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  restaurantName:    { fontSize: 13, color: C.yellow, fontWeight: '700' },
  restaurantAddr:    { fontSize: 11, color: C.textSub },

  resolutionNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: C.blueSoft, borderRadius: 8, padding: 8, marginBottom: 10 },
  resolutionText: { flex: 1, fontSize: 12, color: C.blue, lineHeight: 17 },

  actions:        { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnGreen: { backgroundColor: C.greenSoft, borderColor: C.green + '40' },
  actionBtnGray:  { backgroundColor: C.bg, borderColor: C.border },
  actionBtnText:  { fontSize: 13, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  empty:     { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptySub:  { color: C.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 240 },

  // Resolve modal
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  resolveModal:  { backgroundColor: C.surface, borderRadius: 20, padding: 24, width: '100%' },
  resolveTitle:  { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  resolveSubtitle: { fontSize: 13, color: C.textSub, marginBottom: 14 },
  noteInput:     { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  resolveActions:    { flexDirection: 'row', gap: 10 },
  resolveCancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  resolveCancelText: { fontSize: 14, fontWeight: '600', color: C.textSub },
  resolveConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  resolveConfirmText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
});