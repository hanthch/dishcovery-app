import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import dataService from '../../../services/Api.service';
import { Restaurant, RestaurantStackParamList } from '../../../types/restaurant';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;
interface Props { navigation: NavigationProp; }

// Rank style map: top 3 get special medal colors, rest default
const RANK_STYLES: Record<number, { bg: string; text: string; border: string; emoji?: string }> = {
  1: { bg: '#FFD700', text: '#fff', border: '#FFC200', emoji: '🥇' },
  2: { bg: '#B8C2CC', text: '#fff', border: '#9AA5B1', emoji: '🥈' },
  3: { bg: '#CD7F32', text: '#fff', border: '#B56C28', emoji: '🥉' },
};
const DEFAULT_RANK = { bg: '#F0F0F0', text: '#666', border: '#E0E0E0' };

function getRankStyle(r: number) {
  return RANK_STYLES[r] ?? DEFAULT_RANK;
}

// ── Main Screen ─────────────────────────────────────────────────────────────────
export default function TopTenScreen({ navigation }: Props) {
  const [topTen,     setTopTen]     = useState<Restaurant[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const loadTopTen = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      const data = await dataService.getTopTen();
      // Sort by top_rank_this_week ascending, fallback to weekly_activity
      const sorted = [...data].sort((a, b) => {
        const ra = a.top_rank_this_week ?? a.topRankThisWeek ?? 999;
        const rb = b.top_rank_this_week ?? b.topRankThisWeek ?? 999;
        return ra - rb;
      });
      setTopTen(sorted);
    } catch (err) {
      console.error('[TopTen] Error loading:', err);
      setError('Không thể tải danh sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadTopTen(); }, [loadTopTen]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTopTen(true);
  }, [loadTopTen]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Đang tải bảng xếp hạng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.stateContainer}>
          <Ionicons name="wifi-outline" size={52} color="#DDD" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadTopTen()}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <FlatList
        data={topTen}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF8C42"
            colors={['#FF8C42']}
          />
        }
        ListHeaderComponent={<ListHeader navigation={navigation} count={topTen.length} />}
        renderItem={({ item, index }) => (
          <TopTenCard restaurant={item} rank={index + 1} navigation={navigation} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyText}>Chưa có quán nào trong tuần này</Text>
          </View>
        }
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
      />
    </SafeAreaView>
  );
}

// ── List Header ─────────────────────────────────────────────────────────────────
function ListHeader({ navigation, count }: { navigation: NavigationProp; count: number }) {
  return (
    <View>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitle}>Bảng Xếp Hạng</Text>
          <Text style={styles.navSub}>Tuần này</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>Top {count}</Text>
        </View>
      </View>

      {/* Hero banner */}
      <View style={styles.heroBanner}>
        <View style={[styles.heroDecorCircle, styles.heroDC1]} />
        <View style={[styles.heroDecorCircle, styles.heroDC2]} />
        <Text style={styles.heroEmoji}>🏆</Text>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Top 10 Quán Nổi Bật</Text>
          <Text style={styles.heroSub}>Được cộng đồng bình chọn & đánh giá cao nhất</Text>
        </View>
      </View>

      {/* Podium row (top 3 highlights) */}
      {count >= 3 && (
        <View style={styles.podiumNote}>
          <Ionicons name="trophy" size={14} color="#FF8C42" />
          <Text style={styles.podiumNoteText}>
            Dựa trên số lượt đánh giá, điểm và hoạt động trong tuần
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────────
interface CardProps {
  restaurant: Restaurant;
  rank: number;
  navigation: NavigationProp;
}

function TopTenCard({ restaurant, rank, navigation }: CardProps) {
  const rankStyle = getRankStyle(rank);
  const scale     = useRef(new Animated.Value(1)).current;

  const displayImage = restaurant.photos?.[0]
    || restaurant.images?.[0]
    || restaurant.cover_image
    || restaurant.image_url;

  // Landmark text: normalize all shapes
  const landmarkText = (() => {
    const notes = restaurant.landmark_notes ?? restaurant.landmarkNotes;
    if (typeof notes === 'string') return notes;
    if (Array.isArray(notes) && notes.length > 0) {
      const first = notes[0];
      return typeof first === 'string' ? first : (first?.text ?? '');
    }
    return '';
  })();

  const cuisineDisplay = [
    ...(restaurant.cuisine ?? []),
    ...(restaurant.food_types ?? []),
  ]
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .slice(0, 2)
    .join(' · ');

  const weeklyActivity = restaurant.weekly_activity ?? 0;
  const ratingCount    = restaurant.rating_count ?? 0;

  const handlePress = useCallback(() => {
    navigation.navigate('RestaurantDetail', {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
  }, [navigation, restaurant.id, restaurant.name]);

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      accessibilityLabel={`${rank}. ${restaurant.name}`}
    >
      <Animated.View style={[styles.card, rank <= 3 && styles.cardTop3, { transform: [{ scale }] }]}>

        {/* Rank badge */}
        <View style={[
          styles.rankBadge,
          { backgroundColor: rankStyle.bg, borderColor: rankStyle.border },
        ]}>
          <Text style={[styles.rankText, { color: rankStyle.text }]}>
            {rankStyle.emoji ?? rank}
          </Text>
        </View>

        {/* Image */}
        <Image
          source={{ uri: displayImage || 'https://via.placeholder.com/90x90?text=🍽️' }}
          style={styles.restaurantImg}
          resizeMode="cover"
        />

        {/* Info */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>{restaurant.name}</Text>
            {restaurant.verified && (
              <Ionicons name="checkmark-circle" size={15} color="#00B894" />
            )}
          </View>

          {cuisineDisplay ? (
            <Text style={styles.cuisineText} numberOfLines={1}>
              {cuisineDisplay}
              {restaurant.price_range ? ` · ${restaurant.price_range}` : ''}
            </Text>
          ) : null}

          <View style={styles.statsRow}>
            {restaurant.rating != null && (
              <View style={styles.statPill}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.statValue}>{restaurant.rating.toFixed(1)}</Text>
                {ratingCount > 0 && (
                  <Text style={styles.statSub}>({ratingCount})</Text>
                )}
              </View>
            )}
            {weeklyActivity > 0 && (
              <View style={[styles.statPill, styles.statPillHot]}>
                <Ionicons name="flame" size={12} color="#FF8C42" />
                <Text style={[styles.statValue, { color: '#FF8C42' }]}>{weeklyActivity}</Text>
                <Text style={styles.statSub}>bài</Text>
              </View>
            )}
          </View>

          {landmarkText ? (
            <View style={styles.landmarkMini}>
              <Text style={styles.landmarkMiniText} numberOfLines={1}>
                🧭 {landmarkText}
              </Text>
            </View>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color="#CCC" />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  listContent: { paddingBottom: 100 },

  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
  loadingText: { fontSize: 14, color: '#888', marginTop: 4 },
  errorText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 22, marginTop: 4,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Nav
  nav: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  navTitleWrap: { flex: 1 },
  navTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  navSub: { fontSize: 12, color: '#999', marginTop: 1 },
  countBadge: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12,
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Hero
  heroBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF8EE',
    marginHorizontal: 16, marginTop: 14,
    padding: 18, borderRadius: 20,
    gap: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#FFE0B2',
  },
  heroDecorCircle: {
    position: 'absolute', borderRadius: 999,
    backgroundColor: 'rgba(255,140,66,0.07)',
  },
  heroDC1: { width: 100, height: 100, top: -30, right: 20 },
  heroDC2: { width: 60,  height: 60,  bottom: -20, right: 60 },
  heroEmoji: { fontSize: 44, zIndex: 1 },
  heroText: { flex: 1, zIndex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '900', color: '#111' },
  heroSub: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 17 },

  podiumNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    backgroundColor: '#FFF0E5',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  podiumNoteText: { fontSize: 11, color: '#888', flex: 1, lineHeight: 15 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 10,
    borderRadius: 20, padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  cardTop3: {
    borderWidth: 1.5, borderColor: '#FFE4CC',
  },

  rankBadge: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginRight: 10, flexShrink: 0,
  },
  rankText: { fontWeight: '900', fontSize: 14 },

  restaurantImg: {
    width: 76, height: 76, borderRadius: 14,
    backgroundColor: '#eee', marginRight: 12,
  },

  infoContainer: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  nameText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  cuisineText: { fontSize: 12, color: '#888', marginBottom: 7 },

  statsRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  statPillHot: { backgroundColor: '#FFF0E5' },
  statValue: { fontSize: 12, fontWeight: '700', color: '#333' },
  statSub: { fontSize: 10, color: '#999' },

  landmarkMini: {
    backgroundColor: '#FFF9F0', padding: 6,
    borderRadius: 8, marginTop: 7,
    borderLeftWidth: 3, borderLeftColor: '#FF8C42',
  },
  landmarkMiniText: { fontSize: 10, color: '#856404', fontWeight: '500' },

  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyText: { color: '#999', fontSize: 15, fontWeight: '600' },
});