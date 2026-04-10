import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image,
  RefreshControl, StatusBar, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';

const C = {
  bg: '#FAFAFA', surface: '#FFFFFF', border: '#F0F0F0', divider: '#F5F5F5',
  primary: '#FF8C42', primaryLight: '#FFF3EA',
  green: '#10B981', greenSoft: '#ECFDF5',
  red: '#EF4444', redSoft: '#FEF2F2',
  yellow: '#F59E0B', yellowSoft: '#FFFBEB',
  blue: '#3B82F6', blueSoft: '#EFF6FF',
  text: '#1A1A1A', textSub: '#666666', textMuted: '#999999',
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: C.red,     bg: C.redSoft,    label: 'Pending' },
  resolved:  { color: C.green,   bg: C.greenSoft,  label: 'Resolved' },
  dismissed: { color: C.textSub, bg: C.border,     label: 'Dismissed' },
};

const TYPE_CFG: Record<string, { color: string; bg: string; icon: string }> = {
  post:       { color: C.primary, bg: C.primaryLight, icon: 'images-outline' },
  user:       { color: C.blue,    bg: C.blueSoft,     icon: 'person-outline' },
  restaurant: { color: C.yellow,  bg: C.yellowSoft,   icon: 'storefront-outline' },
};

interface ReportItem {
  id: string; type: string; reason: string; status: string; created_at: string;
  reporter: { id: string; username: string; avatar_url: string | null } | null;
  post: { id: string; caption: string | null; images: string[] } | null;
  target_user: { id: string; username: string; avatar_url: string | null } | null;
}

export default function AdminReports({ navigation }: { navigation: any }) {
  const [reports, setReports]       = useState<ReportItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const load = useCallback(async () => {
    try {
      const res = await adminApi.getReports({ status: statusFilter });
      setReports(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [statusFilter]);

  useEffect(() => { setLoading(true); setReports([]); load(); }, [statusFilter]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleResolve = (item: ReportItem, status: 'resolved' | 'dismissed') => {
    const label = status === 'resolved' ? 'Resolve' : 'Dismiss';
    Alert.alert(`${label} Report`, `Mark this report as ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, onPress: async () => {
        try {
          await adminApi.resolveReport(item.id, status);
          setReports(prev => prev.filter(r => r.id !== item.id));
          setTotal(t => t - 1);
        } catch { Alert.alert('Error', 'Failed to update report'); }
      }},
    ]);
  };

  const renderReport = ({ item }: { item: ReportItem }) => {
    const tc = TYPE_CFG[item.type] ?? TYPE_CFG.post;
    const postImg = item.post?.images?.[0];
    return (
      <View style={s.card}>
        {/* Card header */}
        <View style={s.cardHeader}>
          <View style={[s.typePill, { backgroundColor: tc.bg }]}>
            <Ionicons name={tc.icon as any} size={11} color={tc.color} />
            <Text style={[s.typePillText, { color: tc.color }]}>{item.type}</Text>
          </View>
          <Text style={s.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        {/* Reason */}
        <View style={s.reasonBox}>
          <Ionicons name="chatbubble-outline" size={14} color={C.textMuted} style={{ marginTop: 1 }} />
          <Text style={s.reasonText} numberOfLines={3}>"{item.reason}"</Text>
        </View>

        {/* Reporter */}
        <View style={s.personRow}>
          <Text style={s.personLabel}>Reporter</Text>
          <PersonChip avatar={item.reporter?.avatar_url} username={item.reporter?.username || 'unknown'} />
        </View>

        {/* Target user */}
        {item.target_user && (
          <View style={s.personRow}>
            <Text style={s.personLabel}>Reported</Text>
            <PersonChip avatar={item.target_user.avatar_url} username={item.target_user.username} color={C.red} />
          </View>
        )}

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
            <Text style={s.postCaption} numberOfLines={2}>{item.post.caption || '(no caption)'}</Text>
          </View>
        )}

        {/* Actions (pending only) */}
        {statusFilter === 'pending' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnGreen]} onPress={() => handleResolve(item, 'resolved')}>
              <Ionicons name="checkmark-circle-outline" size={15} color={C.green} />
              <Text style={[s.actionBtnText, { color: C.green }]}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnGray]} onPress={() => handleResolve(item, 'dismissed')}>
              <Ionicons name="remove-circle-outline" size={15} color={C.textSub} />
              <Text style={[s.actionBtnText, { color: C.textSub }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.screenTitle}>Reports</Text>
          <Text style={s.screenSub}>{total.toLocaleString()} {statusFilter}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const active = statusFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[s.chip, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
              onPress={() => setStatusFilter(key)}
            >
              <Text style={[s.chipText, active && { color: cfg.color, fontWeight: '700' }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={i => i.id}
          renderItem={renderReport}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={s.empty}>No {statusFilter} reports</Text>}
        />
      )}
    </SafeAreaView>
  );
}

// ── Person chip helper ────────────────────────────────────────
function PersonChip({ avatar, username, color = C.text }: { avatar?: string | null; username: string; color?: string }) {
  return (
    <View style={s.chip2}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={s.chip2Avatar} />
      ) : (
        <View style={[s.chip2Avatar, s.chip2AvatarFb]}>
          <Text style={[s.chip2Char, { color: C.primary }]}>{username[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={[s.chip2Name, { color }]}>@{username}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  screenTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  screenSub:   { fontSize: 12, color: C.textMuted, marginTop: 1, textTransform: 'capitalize' },
  filters:     { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipText:    { color: C.textSub, fontSize: 13, fontWeight: '500' },

  card:        { backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typePill:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typePillText:{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dateText:    { fontSize: 11, color: C.textMuted },

  reasonBox:   { flexDirection: 'row', gap: 8, backgroundColor: C.bg, borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  reasonText:  { flex: 1, fontSize: 13, color: C.text, lineHeight: 19, fontStyle: 'italic' },

  personRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  personLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', width: 54 },

  chip2:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  chip2Avatar: { width: 20, height: 20, borderRadius: 10 },
  chip2AvatarFb: { backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
  chip2Char:   { fontSize: 9, fontWeight: '700' },
  chip2Name:   { fontSize: 12, fontWeight: '600' },

  postPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 10, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  postThumb:   { width: 46, height: 46, borderRadius: 8 },
  postThumbEmpty: { backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  postCaption: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 18 },

  actions:        { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnGreen: { backgroundColor: C.greenSoft, borderColor: C.green + '40' },
  actionBtnGray:  { backgroundColor: C.bg, borderColor: C.border },
  actionBtnText:  { fontSize: 13, fontWeight: '600' },
  empty:          { color: C.textSub, textAlign: 'center', paddingTop: 60, fontSize: 15 },
});