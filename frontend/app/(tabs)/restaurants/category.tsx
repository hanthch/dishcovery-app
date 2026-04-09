import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../services/Api.service';
import type { Restaurant, RestaurantStackParamList } from '../../../types/restaurant';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Responsive card width: 2 columns with 16px side padding + 12px gap
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

type CategoryScreenNavigationProp = NativeStackNavigationProp<RestaurantStackParamList, 'Category'>;
type CategoryScreenRouteProp = RouteProp<RestaurantStackParamList, 'Category'>;

interface Props {
  navigation: CategoryScreenNavigationProp;
  route: CategoryScreenRouteProp;
}

// ── Main screen ─────────────────────────────────────────────────────────────────
export default function CategoryScreen({ navigation, route }: Props) {
  const { type, category, title } = route.params;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title || 'Khám phá',
      headerTitleStyle: { fontWeight: '700', color: '#1A1A1A', fontSize: 17 },
      headerStyle: { backgroundColor: '#fff' },
      headerShadowVisible: false,
      headerTintColor: '#333',
      headerBackTitleVisible: false,
    });
  }, [navigation, title]);

  const loadRestaurants = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);

      let data: Restaurant[] = [];
      if (type === 'top10') {
        data = await apiService.getTopTen();
      } else if (category) {
        data = await apiService.getRestaurantsByCategory(category);
      }
      setRestaurants(data);
    } catch (err) {
      console.error('[CategoryScreen] Fetch Error:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, category]);

  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRestaurants(true);
  }, [loadRestaurants]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Đang tìm quán ngon...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={52} color="#DDD" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadRestaurants()}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={restaurants}
        numColumns={2}
        keyExtractor={item => item.id.toString()}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF8C42"
            colors={['#FF8C42']}
          />
        }
        renderItem={({ item, index }) => (
          <RestaurantCard restaurant={item} navigation={navigation} index={index} />
        )}
        ListHeaderComponent={
          restaurants.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.resultsCount}>{restaurants.length} địa điểm</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌮</Text>
            <Text style={styles.emptyText}>Chưa có dữ liệu cho mục này</Text>
            <Text style={styles.emptySubText}>Quay lại sau nhé!</Text>
          </View>
        }
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={11}
        initialNumToRender={6}
      />
    </SafeAreaView>
  );
}

// ── Restaurant Card ─────────────────────────────────────────────────────────────
interface RestaurantCardProps {
  restaurant: Restaurant;
  navigation: CategoryScreenNavigationProp;
  index: number;
}

const RestaurantCard = React.memo(({ restaurant, navigation, index }: RestaurantCardProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  // Normalize all possible image fields
  const imageUri = restaurant.photos?.[0]
    || restaurant.images?.[0]
    || restaurant.cover_image
    || restaurant.image_url;

  // Normalize field aliases from backend (both snake_case and camelCase)
  const topRank    = restaurant.top_rank_this_week ?? restaurant.topRankThisWeek;
  const priceRange = restaurant.price_range ?? restaurant.priceRange;

  // Landmark notes: handle string | LandmarkNote[] | undefined
  const displayLandmark = useMemo(() => {
    const notes = restaurant.landmark_notes ?? restaurant.landmarkNotes;
    if (!notes) return null;
    if (typeof notes === 'string') return notes;
    if (Array.isArray(notes)) {
      return notes.map(n => (typeof n === 'string' ? n : n.text)).filter(Boolean).join(', ') || null;
    }
    return null;
  }, [restaurant.landmark_notes, restaurant.landmarkNotes]);

  // Cuisine: handle food_types | cuisine | categories arrays
  const cuisineText = useMemo(() => {
    const types = restaurant.cuisine ?? restaurant.food_types ?? restaurant.categories ?? [];
    return types.slice(0, 2).join(' · ') || 'Đang cập nhật';
  }, [restaurant.cuisine, restaurant.food_types, restaurant.categories]);

  const handlePress = useCallback(() => {
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id.toString() });
  }, [navigation, restaurant.id]);

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* ── Image ── */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="restaurant-outline" size={32} color="#CCC" />
            </View>
          )}

          {/* Gradient overlay using stacked Views (RN-safe) */}
          <View style={styles.imageOverlayTop} />
          <View style={styles.imageOverlayBottom} />

          {/* Top rank badge */}
          {topRank && topRank <= 10 && (
            <View style={[styles.rankBadge, topRank <= 3 && styles.rankBadgeTop3]}>
              <Text style={styles.rankBadgeText}>
                {topRank === 1 ? '🥇' : topRank === 2 ? '🥈' : topRank === 3 ? '🥉' : `#${topRank}`}
              </Text>
            </View>
          )}

          {/* Verified badge */}
          {restaurant.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#00B894" />
            </View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          <Text style={styles.cuisine} numberOfLines={1}>{cuisineText}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={11} color="#FFD700" />
              <Text style={styles.rating}>{restaurant.rating?.toFixed(1) ?? '—'}</Text>
            </View>
            {priceRange ? (
              <Text style={styles.price} numberOfLines={1}>{priceRange}</Text>
            ) : null}
          </View>

          {displayLandmark ? (
            <View style={styles.landmarkTag}>
              <Text style={styles.landmarkText} numberOfLines={2}>
                🧭 {displayLandmark}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

RestaurantCard.displayName = 'RestaurantCard';

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
  loadingText: { color: '#888', fontSize: 14, marginTop: 4 },
  errorText: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 22, marginTop: 4,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  listContent: { paddingBottom: 120, paddingTop: 4 },
  row: { justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  listHeader: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 8 },
  resultsCount: { fontSize: 13, color: '#888', fontWeight: '600' },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: { width: '100%', height: 130, backgroundColor: '#F0F0F0' },
  image: { width: '100%', height: '100%' },
  // RN-safe gradient simulation using opacity layers
  imageOverlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0)',
    top: 0,
    height: '40%',
  },
  imageOverlayBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    top: '60%',
  },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },

  rankBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 9,
  },
  rankBadgeTop3: { backgroundColor: '#FF8C42' },
  rankBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  verifiedBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10, padding: 2,
  },

  infoContainer: { padding: 12 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  cuisine: { fontSize: 11, color: '#888', marginBottom: 8 },
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF9EE',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  rating: { fontSize: 12, fontWeight: '700', color: '#333' },
  price: { fontSize: 10, color: '#FF8C42', fontWeight: '700', flex: 1, textAlign: 'right' },

  landmarkTag: {
    backgroundColor: '#FAFAFA', padding: 7, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: '#FF8C42',
  },
  landmarkText: { fontSize: 10, color: '#636E72', lineHeight: 14, fontStyle: 'italic' },

  emptyContainer: { flex: 1, marginTop: 80, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyText: { color: '#555', fontSize: 16, fontWeight: '700' },
  emptySubText: { color: '#999', fontSize: 13 },
});