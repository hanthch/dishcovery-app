import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  RefreshControl, StatusBar, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';
import type { AdminRestaurant, AdminRestaurantStatus } from '../../types/admin';

const C = {
  bg: '#FAFAFA', surface: '#FFFFFF', border: '#F0F0F0',
  primary: '#FF8C42', primaryLight: '#FFF3EA',
  green: '#10B981', greenSoft: '#ECFDF5',
  red: '#EF4444', redSoft: '#FEF2F2',
  yellow: '#F59E0B', yellowSoft: '#FFFBEB',
  text: '#1A1A1A', textSub: '#666666', textMuted: '#999999',
};

const STATUS_CFG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  active:     { color: C.green,   bg: C.greenSoft,  icon: 'checkmark-circle', label: 'Active' },
  pending:    { color: C.yellow,  bg: C.yellowSoft, icon: 'time',             label: 'Pending' },
  rejected:   { color: C.red,     bg: C.redSoft,    icon: 'close-circle',     label: 'Rejected' },
  closed:     { color: C.textSub, bg: C.border,     icon: 'lock-closed',      label: 'Closed' },
  unverified: { color: C.textSub, bg: C.border,     icon: 'help-circle',      label: 'Unverified' },
};

export default function AdminRestaurants({
  route, navigation,
}: {
  route: any; navigation: any;
}) {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    route?.params?.status || ''
  );
  const pageRef    = useRef(1);
  const hasMoreRef = useRef(true);

  const fetchRestaurants = useCallback(async (
    reset: boolean,
    searchVal: string,
    statusVal: string
  ) => {
    if (reset) {
      pageRef.current = 1;
      hasMoreRef.current = true;
    }
    if (!hasMoreRef.current && !reset) return;

    const p = pageRef.current;
    if (p > 1) setLoadingMore(true);

    try {
      const res = await adminApi.getRestaurants({
        page:   p,
        search: searchVal || undefined,
        status: statusVal || undefined,
      });
      setRestaurants(prev => reset ? res.data : [...prev, ...res.data]);
      setTotal(res.pagination.total);
      pageRef.current    = p + 1;
      hasMoreRef.current = p < res.pagination.pages;
    } catch (e) {
      console.error('[AdminRestaurants] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setRestaurants([]);
    fetchRestaurants(true, search, statusFilter);
  }, [search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRestaurants([]);
    fetchRestaurants(true, search, statusFilter);
  }, [fetchRestaurants, search, statusFilter]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && !loading && hasMoreRef.current) {
      fetchRestaurants(false, search, statusFilter);
    }
  }, [fetchRestaurants, loadingMore, loading, search, statusFilter]);

  /* ── Status change / delete ────────────────────────────── */
  const handleStatus = useCallback((item: AdminRestaurant, newStatus: AdminRestaurantStatus) => {
    const labelMap: Record<string, string> = {
      active:   'Approve',
      rejected: 'Reject',
      closed:   'Close',
    };
    const label = labelMap[newStatus] || 'Update';

    Alert.alert(
      `${label} Restaurant`,
      `${label} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: newStatus === 'rejected' || newStatus === 'closed' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await adminApi.updateRestaurant(item.id, { status: newStatus });
              setRestaurants(prev =>
                prev.map(r =>
                  r.id === item.id
                    ? { ...r, status: newStatus, verified: newStatus === 'active' }
                    : r
                )
              );
            } catch {
              Alert.alert('Error', 'Failed to update restaurant.');
            }
          },
        },
      ]
    );
  }, []);

  const handleDelete = useCallback((item: AdminRestaurant) => {
    Alert.alert(
      'Delete Restaurant',
      `Permanently delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteRestaurant(item.id);
              setRestaurants(prev => prev.filter(r => r.id !== item.id));
              setTotal(t => Math.max(0, t - 1));
            } catch {
              Alert.alert('Error', 'Failed to delete restaurant.');
            }
          },
        },
      ]
    );
  }, []);

  /* ── Restaurant card ──────────────────────────────────────── */
  const renderItem = useCallback(({ item }: { item: AdminRestaurant }) => {
    const st = STATUS_CFG[item.status] ?? STATUS_CFG.unverified;

    return (
      <View style={s.card}>
        {/* Top */}
        <View style={s.cardTop}>
          {item.cover_image ? (
            <Image source={{ uri: item.cover_image }} style={s.thumb} />
          ) : (
            <View style={[s.thumb, s.thumbEmpty]}>
              <Ionicons name="storefront-outline" size={26} color={C.textMuted} />
            </View>
          )}

          <View style={s.cardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              {item.verified && (
                <Ionicons name="checkmark-circle" size={14} color={C.green} />
              )}
            </View>
            <Text style={s.cardAddr} numberOfLines={1}>
              {item.address || 'No address'}
            </Text>

            {/* Food types */}
            {item.food_types?.length > 0 && (
              <Text style={s.foodTypes} numberOfLines={1}>
                {item.food_types.slice(0, 3).join(' · ')}
              </Text>
            )}

            <View style={s.metaRow}>
              <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon as any} size={10} color={st.color} />
                <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
              </View>
              {item.rating != null ? (
                <Text style={s.metaText}>⭐ {Number(item.rating).toFixed(1)}</Text>
              ) : null}
              <Text style={s.metaText}>📸 {item.posts_count}</Text>
              {item.rating_count > 0 && (
                <Text style={s.metaText}>({item.rating_count})</Text>
              )}
            </View>
          </View>
        </View>

        {/* Action row */}
        <View style={s.actions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[s.btn, s.btnGreen]}
                onPress={() => handleStatus(item, 'active')}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={13} color={C.green} />
                <Text style={[s.btnText, { color: C.green }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnRed]}
                onPress={() => handleStatus(item, 'rejected')}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={13} color={C.red} />
                <Text style={[s.btnText, { color: C.red }]}>Reject</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'active' && (
            <TouchableOpacity
              style={[s.btn, s.btnYellow]}
              onPress={() => handleStatus(item, 'closed')}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed-outline" size={13} color={C.yellow} />
              <Text style={[s.btnText, { color: C.yellow }]}>Close</Text>
            </TouchableOpacity>
          )}

          {(item.status === 'closed' || item.status === 'rejected' || item.status === 'unverified') && (
            <TouchableOpacity
              style={[s.btn, s.btnGreen]}
              onPress={() => handleStatus(item, 'active')}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={13} color={C.green} />
              <Text style={[s.btnText, { color: C.green }]}>Reopen</Text>
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={[s.btn, s.btnRed, { paddingHorizontal: 10 }]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={13} color={C.red} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleStatus, handleDelete]);

  const FILTER_OPTIONS: { label: string; value: string }[] = [
    { label: 'All',        value: '' },
    { label: 'Pending',    value: 'pending' },
    { label: 'Active',     value: 'active' },
    { label: 'Rejected',   value: 'rejected' },
    { label: 'Closed',     value: 'closed' },
    { label: 'Unverified', value: 'unverified' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.screenTitle}>Restaurants</Text>
          <Text style={s.screenSub}>{total.toLocaleString()} total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search restaurants…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* Status filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {FILTER_OPTIONS.map(opt => {
          const cfg    = opt.value ? STATUS_CFG[opt.value] : null;
          const active = statusFilter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value || 'all'}
              style={[
                s.chip,
                active && {
                  backgroundColor: cfg?.bg ?? C.primaryLight,
                  borderColor: cfg?.color ?? C.primary,
                },
              ]}
              onPress={() => setStatusFilter(opt.value)}
            >
              {opt.value && cfg
                ? <Ionicons name={cfg.icon as any} size={12} color={active ? cfg.color : C.textMuted} style={{ marginRight: 3 }} />
                : null
              }
              <Text style={[
                s.chipText,
                active && { color: cfg?.color ?? C.primary, fontWeight: '700' },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={i => i.id}
          renderItem={renderItem}
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
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="storefront-outline" size={48} color={C.border} />
              <Text style={s.empty}>No restaurants found</Text>
              {statusFilter ? (
                <Text style={s.emptySub}>Try a different filter</Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={C.primary} style={{ padding: 20 }} />
              : null
          }
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

  filters:  { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipText: { color: C.textSub, fontSize: 13, fontWeight: '500' },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop:  { flexDirection: 'row', marginBottom: 12 },
  thumb:    { width: 76, height: 76, borderRadius: 12 },
  thumbEmpty: { backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
  cardAddr: { fontSize: 12, color: C.textSub, marginTop: 3 },
  foodTypes:{ fontSize: 11, color: C.textMuted, marginTop: 3 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metaText:   { fontSize: 11, color: C.textSub },

  actions:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, borderWidth: 1 },
  btnGreen: { backgroundColor: C.greenSoft,  borderColor: C.green + '40' },
  btnRed:   { backgroundColor: C.redSoft,    borderColor: C.red + '40' },
  btnYellow:{ backgroundColor: C.yellowSoft, borderColor: C.yellow + '40' },
  btnText:  { fontSize: 12, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  empty:     { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptySub:  { color: C.textMuted, fontSize: 13 },
});