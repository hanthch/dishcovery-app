import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  RefreshControl, StatusBar, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';
import type { AdminRestaurantStatus } from '../../types/admin';

const C = {
  bg: '#FAFAFA', surface: '#FFFFFF', border: '#F0F0F0',
  primary: '#FF8C42', primaryLight: '#FFF3EA',
  green: '#10B981', greenSoft: '#ECFDF5',
  red: '#EF4444', redSoft: '#FEF2F2',
  yellow: '#F59E0B', yellowSoft: '#FFFBEB',
  text: '#1A1A1A', textSub: '#666666', textMuted: '#999999',
};

const STATUS: Record<string, { color: string; bg: string; icon: string }> = {
  active:   { color: C.green,   bg: C.greenSoft,  icon: 'checkmark-circle' },
  pending:  { color: C.yellow,  bg: C.yellowSoft, icon: 'time' },
  rejected: { color: C.red,     bg: C.redSoft,    icon: 'close-circle' },
  closed:   { color: C.textSub, bg: C.border,     icon: 'lock-closed' },
};

interface RestaurantItem {
  id: string; name: string; address: string | null;
  status: AdminRestaurantStatus; verified: boolean;
  food_types: string[]; rating: number | null;
  posts_count: number; cover_image: string | null; created_at: string;
}

export default function AdminRestaurants({ route, navigation }: { route: any; navigation: any }) {
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(route?.params?.status || '');

  const load = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (!reset && p > 1 && restaurants.length >= total) return;
    try {
      const res = await adminApi.getRestaurants({ page: p, search, status: statusFilter || undefined });
      setRestaurants(reset ? res.data : [...restaurants, ...res.data]);
      setTotal(res.pagination.total);
      setPage(p + 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [page, search, statusFilter, restaurants, total]);

  useEffect(() => { setLoading(true); setRestaurants([]); setPage(1); }, [search, statusFilter]);
  useEffect(() => { if (loading && restaurants.length === 0) load(true); }, [loading]);
  const onRefresh = () => { setRefreshing(true); setRestaurants([]); setPage(1); setLoading(true); };

  const handleStatus = (item: RestaurantItem, newStatus: AdminRestaurantStatus) => {
    const labels: Record<string, string> = { active: 'Approve', rejected: 'Reject', closed: 'Close' };
    const label = labels[newStatus] || newStatus;
    Alert.alert(label, `${label} "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: newStatus === 'rejected' || newStatus === 'closed' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await adminApi.updateRestaurant(item.id, { status: newStatus });
            setRestaurants(prev => prev.map(r => r.id === item.id ? { ...r, status: newStatus, verified: newStatus === 'active' } : r));
          } catch { Alert.alert('Error', 'Failed to update'); }
        },
      },
    ]);
  };

  const handleDelete = (item: RestaurantItem) => {
    Alert.alert('Delete Restaurant', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminApi.deleteRestaurant(item.id);
          setRestaurants(prev => prev.filter(r => r.id !== item.id));
          setTotal(t => t - 1);
        } catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: RestaurantItem }) => {
    const st = STATUS[item.status] ?? STATUS.closed;
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          {item.cover_image ? (
            <Image source={{ uri: item.cover_image }} style={s.thumb} />
          ) : (
            <View style={[s.thumb, s.thumbEmpty]}>
              <Ionicons name="storefront-outline" size={24} color={C.textMuted} />
            </View>
          )}
          <View style={s.cardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              {item.verified && <Ionicons name="checkmark-circle" size={14} color={C.green} />}
            </View>
            <Text style={s.cardAddr} numberOfLines={1}>{item.address || 'No address'}</Text>
            <View style={s.metaRow}>
              <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon as any} size={10} color={st.color} />
                <Text style={[s.statusText, { color: st.color }]}>{item.status}</Text>
              </View>
              {item.rating ? <Text style={s.metaText}>⭐ {item.rating.toFixed(1)}</Text> : null}
              <Text style={s.metaText}>📸 {item.posts_count}</Text>
            </View>
          </View>
        </View>

        <View style={s.actions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity style={[s.btn, s.btnGreen]} onPress={() => handleStatus(item, 'active')}>
                <Ionicons name="checkmark" size={13} color={C.green} />
                <Text style={[s.btnText, { color: C.green }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnRed]} onPress={() => handleStatus(item, 'rejected')}>
                <Ionicons name="close" size={13} color={C.red} />
                <Text style={[s.btnText, { color: C.red }]}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'active' && (
            <TouchableOpacity style={[s.btn, s.btnYellow]} onPress={() => handleStatus(item, 'closed')}>
              <Ionicons name="lock-closed-outline" size={13} color={C.yellow} />
              <Text style={[s.btnText, { color: C.yellow }]}>Close</Text>
            </TouchableOpacity>
          )}
          {(item.status === 'closed' || item.status === 'rejected') && (
            <TouchableOpacity style={[s.btn, s.btnGreen]} onPress={() => handleStatus(item, 'active')}>
              <Ionicons name="refresh-outline" size={13} color={C.green} />
              <Text style={[s.btnText, { color: C.green }]}>Reopen</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.btn, s.btnRed, { marginLeft: 'auto' }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={13} color={C.red} />
          </TouchableOpacity>
        </View>
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
          <Text style={s.screenTitle}>Restaurants</Text>
          <Text style={s.screenSub}>{total.toLocaleString()} total</Text>
        </View>
      </View>

      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search restaurants…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {(['', 'pending', 'active', 'rejected', 'closed'] as string[]).map(st => {
          const cfg = st ? STATUS[st] : null;
          const active = statusFilter === st;
          return (
            <TouchableOpacity
              key={st}
              style={[s.chip, active && { backgroundColor: cfg?.bg ?? C.primaryLight, borderColor: cfg?.color ?? C.primary }]}
              onPress={() => setStatusFilter(st)}
            >
              {cfg && <Ionicons name={cfg.icon as any} size={11} color={active ? cfg.color : C.textMuted} style={{ marginRight: 4 }} />}
              <Text style={[s.chipText, active && { color: cfg?.color ?? C.primary, fontWeight: '700' }]}>
                {st || 'All'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && restaurants.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          onEndReached={() => load()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={s.empty}>No restaurants found</Text>}
          ListFooterComponent={loading && restaurants.length > 0 ? <ActivityIndicator color={C.primary} style={{ padding: 20 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  screenTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  screenSub:   { fontSize: 12, color: C.textMuted, marginTop: 1 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, marginHorizontal: 16, marginVertical: 10, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, height: 44 },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  filters:     { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipText:    { color: C.textSub, fontSize: 12, fontWeight: '500' },
  card:        { backgroundColor: C.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  cardTop:     { flexDirection: 'row', marginBottom: 10 },
  thumb:       { width: 72, height: 72, borderRadius: 12 },
  thumbEmpty:  { backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  cardInfo:    { flex: 1, marginLeft: 12 },
  cardName:    { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
  cardAddr:    { fontSize: 12, color: C.textSub, marginTop: 2 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusText:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metaText:    { fontSize: 11, color: C.textSub },
  actions:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  btnGreen:    { backgroundColor: C.greenSoft,  borderColor: C.green + '40' },
  btnRed:      { backgroundColor: C.redSoft,    borderColor: C.red + '40' },
  btnYellow:   { backgroundColor: C.yellowSoft, borderColor: C.yellow + '40' },
  btnText:     { fontSize: 12, fontWeight: '600' },
  empty:       { color: C.textSub, textAlign: 'center', paddingTop: 60, fontSize: 15 },
});