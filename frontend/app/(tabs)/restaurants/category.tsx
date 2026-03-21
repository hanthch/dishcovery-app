import React, { useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { apiService } from '../../../services/Api.service';
import type { Restaurant, RestaurantStackParamList } from '../../../types/restaurant';

import { NON_PAGINATED_SLUGS, slugToLabel } from '../../../constants/categoryConfig';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

type CategoryScreenNavigationProp = NativeStackNavigationProp<
  RestaurantStackParamList,
  'Category'
>;

type CategoryScreenRouteProp = RouteProp<RestaurantStackParamList, 'Category'>;

interface Props {
  navigation: CategoryScreenNavigationProp;
  route: CategoryScreenRouteProp;
}

export default function CategoryScreen({ navigation, route }: Props) {
  const { type, category, title } = route.params;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title || (category ? slugToLabel(category) : 'Khám phá'),
      headerTitleStyle: { fontWeight: '700', color: '#1A1A1A' },
    });
  }, [navigation, title, category]);

  const effectiveCategory = type === 'top10' ? 'top-rated' : (category ?? '');
  const isNonPaginated =
    type === 'top10' || (category ? NON_PAGINATED_SLUGS.has(category) : false);

  const loadRestaurants = useCallback(
    async (opts: { isRefreshing?: boolean; nextPage?: number } = {}) => {
      const { isRefreshing = false, nextPage = 1 } = opts;
      try {
        if (nextPage === 1 && !isRefreshing) setLoading(true);
        if (nextPage > 1) setLoadingMore(true);

        let data: Restaurant[] = [];

        const fetchPage  = isNonPaginated ? 1      : nextPage;
        const fetchLimit = isNonPaginated ? 50     : PAGE_SIZE;

        data = await apiService.getRestaurantsByCategory(
          effectiveCategory,
          fetchPage,
          fetchLimit
        );

        setHasMore(isNonPaginated ? false : data.length === PAGE_SIZE);
        setRestaurants(prev => (nextPage === 1 ? data : [...prev, ...data]));
        setPage(nextPage);
      } catch (error) {
        console.error('[CategoryScreen] Fetch Error:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [effectiveCategory, isNonPaginated]
  );

  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    loadRestaurants({ isRefreshing: true, nextPage: 1 });
  }, [loadRestaurants]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    loadRestaurants({ nextPage: page + 1 });
  }, [loadingMore, hasMore, loading, page, loadRestaurants]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loadingText}>Đang tìm quán ngon...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={restaurants}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF8C42"
            colors={['#FF8C42']}
          />
        }
        renderItem={({ item }) => (
          <RestaurantCard restaurant={item} navigation={navigation} />
        )}
        ListHeaderComponent={
          restaurants.length > 0 ? (
            <View style={styles.headerInfo}>
              <Text style={styles.resultsCount}>
                Tìm thấy {restaurants.length} địa điểm
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#FF8C42" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có dữ liệu cho mục này 🌮</Text>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={11}
        initialNumToRender={6}
      />
    </SafeAreaView>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  navigation: CategoryScreenNavigationProp;
}

const RestaurantCard = React.memo(({ restaurant, navigation }: RestaurantCardProps) => {
  const imageUri = restaurant.photos?.[0] || restaurant.cover_image || restaurant.images?.[0];

  const topRank    = restaurant.top_rank_this_week ?? restaurant.topRankThisWeek;
  const priceRange = restaurant.price_range ?? restaurant.priceRange;
  const landmarkNotes = restaurant.landmark_notes ?? restaurant.landmarkNotes;

  const displayLandmark = useMemo(() => {
    if (!landmarkNotes) return null;
    if (typeof landmarkNotes === 'string') return landmarkNotes;
    return landmarkNotes
      .map((n: any) => (typeof n === 'string' ? n : n.text))
      .join(', ');
  }, [landmarkNotes]);

  const handlePress = useCallback(() => {
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id.toString() });
  }, [navigation, restaurant.id]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.card}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        {topRank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>#{topRank}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.verified && (
            <View style={styles.verifiedCircle}>
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.cuisine} numberOfLines={1}>
          {(restaurant.food_types ?? restaurant.cuisine ?? restaurant.categories ?? [])
            .join(' • ') || 'Đang cập nhật'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.rating}>⭐ {restaurant.rating || 'N/A'}</Text>
          {priceRange && <Text style={styles.price}>{priceRange}</Text>}
        </View>

        {displayLandmark && (
          <View style={styles.landmarkTag}>
            <Text style={styles.landmarkText} numberOfLines={2}>
              🧭 {displayLandmark}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

RestaurantCard.displayName = 'RestaurantCard';

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFFFFF' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:     { marginTop: 10, color: '#666', fontSize: 14 },
  listPadding:     { paddingBottom: 120, paddingTop: 10 },
  row:             { justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 15 },
  headerInfo:      { paddingHorizontal: 15, paddingBottom: 10 },
  resultsCount:    { fontSize: 13, color: '#888', fontWeight: '500' },
  card:            { width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  imageContainer:  { width: '100%', height: 125, borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: 'hidden', backgroundColor: '#F5F5F5' },
  image:           { width: '100%', height: '100%' },
  placeholder:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#999', fontSize: 12 },
  rankBadge:       { position: 'absolute', top: 8, left: 8, backgroundColor: '#FF8C42', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rankBadgeText:   { color: '#fff', fontSize: 10, fontWeight: '900' },
  infoContainer:   { padding: 10 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  name:            { fontSize: 14, fontWeight: '700', color: '#2D3436', flex: 1 },
  verifiedCircle:  { backgroundColor: '#00B894', width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  verifiedCheck:   { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  cuisine:         { fontSize: 11, color: '#95a5a6', marginBottom: 6 },
  metaRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rating:          { fontSize: 12, fontWeight: '600', color: '#2D3436' },
  price:           { fontSize: 12, color: '#FF8C42', fontWeight: '700' },
  landmarkTag:     { marginTop: 8, backgroundColor: '#FBFBFB', padding: 6, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#FF8C42' },
  landmarkText:    { fontSize: 10, color: '#636E72', lineHeight: 14, fontStyle: 'italic' },
  emptyContainer:  { flex: 1, marginTop: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText:       { color: '#999', fontSize: 15 },
  footerLoader:    { paddingVertical: 20, alignItems: 'center' },
});