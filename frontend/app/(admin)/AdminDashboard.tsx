import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';

const { width } = Dimensions.get('window');

const C = {
  bg:           '#FAFAFA',
  surface:      '#FFFFFF',
  border:       '#F0F0F0',
  primary:      '#FF8C42',
  primaryLight: '#FFF3EA',
  primaryDark:  '#E67E2F',
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

interface DashboardData {
  stats: {
    totalUsers: number;
    totalPosts: number;
    totalRestaurants: number;
    pendingRestaurants: number;
    reportedPosts: number;
    newUsersToday: number;
  };
  chartData: { date: string; label: string; users: number; posts: number }[];
}

interface Props { navigation: any }

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({
  label, value, icon, color, soft, onPress,
}: {
  label: string; value: number; icon: string;
  color: string; soft: string; onPress?: () => void;
}) => (
  <TouchableOpacity
    style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.statIconWrap, { backgroundColor: soft }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Bar Chart Row ─────────────────────────────────────────────
const BarRow = ({ label, users, posts, maxU, maxP }: {
  label: string; users: number; posts: number; maxU: number; maxP: number;
}) => (
  <View style={styles.barRow}>
    <Text style={styles.barLabel}>{label}</Text>
    <View style={styles.barGroup}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${maxU > 0 ? Math.max((users / maxU) * 100, 3) : 3}%`, backgroundColor: C.blue }]} />
      </View>
      <Text style={styles.barVal}>{users}</Text>
    </View>
    <View style={styles.barGroup}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${maxP > 0 ? Math.max((posts / maxP) * 100, 3) : 3}%`, backgroundColor: C.primary }]} />
      </View>
      <Text style={styles.barVal}>{posts}</Text>
    </View>
  </View>
);

export default function AdminDashboard({ navigation }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await adminApi.getDashboard();
      setData(result);
    } catch (err) {
      console.error('[AdminDashboard]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const chart = data?.chartData || [];
  const maxU = Math.max(...chart.map(d => d.users), 1);
  const maxP = Math.max(...chart.map(d => d.posts), 1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Admin Panel</Text>
            <Text style={styles.headerSub}>Dishcovery Control Center</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color={C.textSub} />
          </TouchableOpacity>
        </View>

        {/* ── Alerts ── */}
        {((stats?.pendingRestaurants ?? 0) > 0 || (stats?.reportedPosts ?? 0) > 0) && (
          <View style={styles.alertSection}>
            {(stats?.pendingRestaurants ?? 0) > 0 && (
              <TouchableOpacity
                style={[styles.alertCard, { backgroundColor: C.yellowSoft, borderColor: C.yellow + '40' }]}
                onPress={() => navigation.navigate('AdminRestaurants', { status: 'pending' })}
              >
                <Ionicons name="storefront-outline" size={16} color={C.yellow} />
                <Text style={[styles.alertText, { color: C.yellow }]}>
                  {stats!.pendingRestaurants} restaurants pending review
                </Text>
                <Ionicons name="chevron-forward" size={14} color={C.yellow} />
              </TouchableOpacity>
            )}
            {(stats?.reportedPosts ?? 0) > 0 && (
              <TouchableOpacity
                style={[styles.alertCard, { backgroundColor: C.redSoft, borderColor: C.red + '40' }]}
                onPress={() => navigation.navigate('AdminReports')}
              >
                <Ionicons name="flag-outline" size={16} color={C.red} />
                <Text style={[styles.alertText, { color: C.red }]}>
                  {stats!.reportedPosts} open reports
                </Text>
                <Ionicons name="chevron-forward" size={14} color={C.red} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Stats Grid ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTitle}>Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard label="Total Users"    value={stats?.totalUsers ?? 0}       icon="people-outline"     color={C.blue}    soft={C.blueSoft}    onPress={() => navigation.navigate('AdminUsers')} />
          <StatCard label="New Today"      value={stats?.newUsersToday ?? 0}     icon="sparkles-outline"   color={C.green}   soft={C.greenSoft}   />
          <StatCard label="Total Posts"    value={stats?.totalPosts ?? 0}        icon="images-outline"     color={C.primary} soft={C.primaryLight} onPress={() => navigation.navigate('AdminPosts')} />
          <StatCard label="Restaurants"    value={stats?.totalRestaurants ?? 0}  icon="restaurant-outline" color={C.yellow}  soft={C.yellowSoft}  onPress={() => navigation.navigate('AdminRestaurants')} />
        </View>

        {/* ── 7-day Chart ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.blue }]} />
              <Text style={styles.legendText}>Users</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.primary }]} />
              <Text style={styles.legendText}>Posts</Text>
            </View>
          </View>
          {chart.map(d => (
            <BarRow key={d.date} label={d.label} users={d.users} posts={d.posts} maxU={maxU} maxP={maxP} />
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickGrid}>
          {[
            { label: 'Users',       icon: 'people',      screen: 'AdminUsers',       color: C.blue,    soft: C.blueSoft },
            { label: 'Posts',       icon: 'images',      screen: 'AdminPosts',       color: C.primary, soft: C.primaryLight },
            { label: 'Restaurants', icon: 'restaurant',  screen: 'AdminRestaurants', color: C.yellow,  soft: C.yellowSoft },
            { label: 'Reports',     icon: 'flag',        screen: 'AdminReports',     color: C.red,     soft: C.redSoft },
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.quickCard, { backgroundColor: item.soft }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.quickLabel, { color: item.color }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={item.color + '80'} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },
  center:        { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText:   { color: C.textSub, marginTop: 12, fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub:      { fontSize: 13, color: C.textSub, marginTop: 2 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  alertSection:   { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  alertText:      { flex: 1, fontSize: 13, fontWeight: '600' },

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 14 },
  sectionLine:    { width: 4, height: 18, backgroundColor: C.primary, borderRadius: 2, marginRight: 10 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: C.text },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue:    { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  statLabel:    { fontSize: 12, color: C.textSub, marginTop: 4, fontWeight: '500' },

  chartCard: {
    marginHorizontal: 16, backgroundColor: C.surface,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  chartLegend:  { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendText:   { color: C.textSub, fontSize: 12, fontWeight: '500' },
  barRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel:     { color: C.textMuted, fontSize: 11, fontWeight: '600', width: 34 },
  barGroup:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  barTrack:     { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 3 },
  barVal:       { color: C.textMuted, fontSize: 10, width: 18, textAlign: 'right' },

  quickGrid:    { paddingHorizontal: 16, gap: 10 },
  quickCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  quickIcon:    { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  quickLabel:   { flex: 1, fontSize: 15, fontWeight: '700' },
});