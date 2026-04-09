import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';
import type { AdminDashboardData } from '../../types/admin';

const { width } = Dimensions.get('window');

const C = {
  bg:           '#FAFAFA',
  surface:      '#FFFFFF',
  border:       '#F0F0F0',
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

interface Props { navigation: any }

/* ── Stat card ───────────────────────────────────────────────────── */
const StatCard = ({
  label, value, icon, color, soft, onPress,
}: {
  label: string; value: number; icon: string;
  color: string; soft: string; onPress?: () => void;
}) => (
  <TouchableOpacity
    style={[st.statCard, { borderTopColor: color, borderTopWidth: 3 }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.75 : 1}
  >
    <View style={[st.statIconWrap, { backgroundColor: soft }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={st.statValue}>{value.toLocaleString()}</Text>
    <Text style={st.statLabel}>{label}</Text>
    {onPress && (
      <View style={st.statArrow}>
        <Ionicons name="chevron-forward" size={12} color={color} />
      </View>
    )}
  </TouchableOpacity>
);

/* ── Bar row (7-day chart) ───────────────────────────────────────── */
const BarRow = ({ label, users, posts, maxU, maxP }: {
  label: string; users: number; posts: number; maxU: number; maxP: number;
}) => (
  <View style={st.barRow}>
    <Text style={st.barLabel}>{label}</Text>
    <View style={st.barGroup}>
      <View style={st.barTrack}>
        <View style={[st.barFill, {
          width: `${maxU > 0 ? Math.max((users / maxU) * 100, 3) : 3}%`,
          backgroundColor: C.blue,
        }]} />
      </View>
      <Text style={st.barVal}>{users}</Text>
    </View>
    <View style={st.barGroup}>
      <View style={st.barTrack}>
        <View style={[st.barFill, {
          width: `${maxP > 0 ? Math.max((posts / maxP) * 100, 3) : 3}%`,
          backgroundColor: C.primary,
        }]} />
      </View>
      <Text style={st.barVal}>{posts}</Text>
    </View>
  </View>
);

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={st.sectionHeader}>
      <View style={st.sectionLine} />
      <Text style={st.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function AdminDashboard({ navigation }: Props) {
  const [data, setData]             = useState<AdminDashboardData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // FIX: load does not depend on state — use a stable function
  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getDashboard();
      setData(result);
    } catch (err: any) {
      console.error('[AdminDashboard] load error:', err);
      setError(err?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // stable — no deps

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={st.center}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={st.loadingText}>Loading dashboard…</Text>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={st.center}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <Ionicons name="cloud-offline-outline" size={48} color={C.textMuted} />
        <Text style={st.errorText}>{error}</Text>
        <TouchableOpacity style={st.retryBtn} onPress={() => load()}>
          <Text style={st.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const chart = data?.chartData || [];
  const maxU  = Math.max(...chart.map(d => d.users), 1);
  const maxP  = Math.max(...chart.map(d => d.posts), 1);

  const QUICK_ACTIONS = [
    { label: 'Users',       icon: 'people',     screen: 'AdminUsers',       color: C.blue,    soft: C.blueSoft },
    { label: 'Posts',       icon: 'images',     screen: 'AdminPosts',       color: C.primary, soft: C.primaryLight },
    { label: 'Restaurants', icon: 'restaurant', screen: 'AdminRestaurants', color: C.yellow,  soft: C.yellowSoft },
    { label: 'Reports',     icon: 'flag',       screen: 'AdminReports',     color: C.red,     soft: C.redSoft },
  ];

  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* Header */}
        <View style={st.header}>
          <View>
            <Text style={st.headerTitle}>Admin Panel</Text>
            <Text style={st.headerSub}>Dishcovery Control Center</Text>
          </View>
          <TouchableOpacity style={st.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={C.textSub} />
          </TouchableOpacity>
        </View>

        {/* Alert banners */}
        {((stats?.pendingRestaurants ?? 0) > 0 || (stats?.reportedPosts ?? 0) > 0) && (
          <View style={st.alerts}>
            {(stats?.pendingRestaurants ?? 0) > 0 && (
              <TouchableOpacity
                style={[st.alertCard, { backgroundColor: C.yellowSoft, borderColor: C.yellow + '40' }]}
                onPress={() => navigation.navigate('AdminRestaurants', { status: 'pending' })}
                activeOpacity={0.8}
              >
                <Ionicons name="storefront-outline" size={16} color={C.yellow} />
                <Text style={[st.alertText, { color: C.yellow }]}>
                  {stats!.pendingRestaurants} restaurant{stats!.pendingRestaurants > 1 ? 's' : ''} pending review
                </Text>
                <Ionicons name="chevron-forward" size={14} color={C.yellow} />
              </TouchableOpacity>
            )}
            {(stats?.reportedPosts ?? 0) > 0 && (
              <TouchableOpacity
                style={[st.alertCard, { backgroundColor: C.redSoft, borderColor: C.red + '40' }]}
                onPress={() => navigation.navigate('AdminReports')}
                activeOpacity={0.8}
              >
                <Ionicons name="flag-outline" size={16} color={C.red} />
                <Text style={[st.alertText, { color: C.red }]}>
                  {stats!.reportedPosts} open report{stats!.reportedPosts > 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={C.red} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Section: Overview */}
        <SectionHeader title="Overview" />
        <View style={st.statsGrid}>
          <StatCard
            label="Total Users"    value={stats?.totalUsers ?? 0}
            icon="people-outline"     color={C.blue}    soft={C.blueSoft}
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <StatCard
            label="New Today"      value={stats?.newUsersToday ?? 0}
            icon="sparkles-outline"   color={C.green}   soft={C.greenSoft}
          />
          <StatCard
            label="Total Posts"    value={stats?.totalPosts ?? 0}
            icon="images-outline"     color={C.primary} soft={C.primaryLight}
            onPress={() => navigation.navigate('AdminPosts')}
          />
          <StatCard
            label="Restaurants"    value={stats?.totalRestaurants ?? 0}
            icon="restaurant-outline" color={C.yellow}  soft={C.yellowSoft}
            onPress={() => navigation.navigate('AdminRestaurants')}
          />
        </View>

        {/* Section: 7-day chart */}
        <SectionHeader title="Last 7 Days" />
        <View style={st.chartCard}>
          <View style={st.legend}>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: C.blue }]} />
              <Text style={st.legendText}>Users</Text>
            </View>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: C.primary }]} />
              <Text style={st.legendText}>Posts</Text>
            </View>
          </View>
          {chart.length === 0 ? (
            <Text style={st.chartEmpty}>No data available</Text>
          ) : (
            chart.map(d => (
              <BarRow key={d.date} label={d.label} users={d.users} posts={d.posts} maxU={maxU} maxP={maxP} />
            ))
          )}
        </View>

        {/* Section: Quick actions */}
        <SectionHeader title="Quick Actions" />
        <View style={st.quickGrid}>
          {QUICK_ACTIONS.map(item => (
            <TouchableOpacity
              key={item.screen}
              style={[st.quickCard, { backgroundColor: item.soft }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.78}
            >
              <View style={[st.quickIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[st.quickLabel, { color: item.color }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={item.color + '80'} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_W = (width - 44) / 2;

const st = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: C.textSub, fontSize: 14 },
  errorText:   { color: C.textSub, fontSize: 14, textAlign: 'center', marginHorizontal: 32, marginTop: 8 },
  retryBtn:    { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 20 },
  retryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: C.textSub, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  alerts:    { padding: 16, gap: 8 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 14,
  },
  sectionLine:  { width: 4, height: 18, backgroundColor: C.primary, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  statCard: {
    width: CARD_W, backgroundColor: C.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  statValue:    { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  statLabel:    { fontSize: 12, color: C.textSub, marginTop: 4, fontWeight: '500' },
  statArrow:    { position: 'absolute', top: 14, right: 14 },

  chartCard: {
    marginHorizontal: 16, backgroundColor: C.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  legend:     { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: C.textSub, fontSize: 12, fontWeight: '500' },
  chartEmpty: { color: C.textMuted, textAlign: 'center', paddingVertical: 16, fontSize: 13 },

  barRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', width: 34 },
  barGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3 },
  barVal:   { color: C.textMuted, fontSize: 10, width: 20, textAlign: 'right' },

  quickGrid: { paddingHorizontal: 16, gap: 10 },
  quickCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  quickIcon:  { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
});