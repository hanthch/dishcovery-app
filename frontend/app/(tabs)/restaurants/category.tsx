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

  // Set header options
  useLayoutEffect(() => {
    navigation.setOptions({
      title: title || 'Khám phá',
      headerTitleStyle: { fontWeight: '700', color: '#1A1A1A' },
    });
  }, [navigation, title]);

  // Fetch data logic - memoized to prevent unnecessary recreations
  const loadRestaurants = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      let data: Restaurant[] = [];
      if (type === 'top10') {
        data = await apiService.getTopTen();
      } else if (category) {
        data = await apiService.getRestaurantsByCategory(category);
      }

      setRestaurants(data);
    } catch (error) {
      console.error('[CategoryScreen] Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, category]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRestaurants(true);
  }, [loadRestaurants]);

  // Loading state
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

/* ---------------- RESTAURANT CARD COMPONENT ---------------- */

interface RestaurantCardProps {
  restaurant: Restaurant;
  navigation: CategoryScreenNavigationProp;
}

const RestaurantCard = React.memo(({ restaurant, navigation }: RestaurantCardProps) => {
  const imageUri = restaurant.photos?.[0] || restaurant.images?.[0];

  // Support both naming conventions (snake_case from DB, camelCase from JS)
  const topRank = restaurant.top_rank_this_week ?? restaurant.topRankThisWeek;
  const priceRange = restaurant.price_range ?? restaurant.priceRange;
  const landmarkNotes = restaurant.landmark_notes ?? restaurant.landmarkNotes;

  // Parse landmark notes - memoized for performance
  const displayLandmark = useMemo(() => {
    if (!landmarkNotes) return null;
    if (typeof landmarkNotes === 'string') return landmarkNotes;
    return landmarkNotes
      .map((n) => (typeof n === 'string' ? n : n.text))
      .join(', ');
  }, [landmarkNotes]);

  const handlePress = useCallback(() => {
    // Ensure restaurantId is a string
    navigation.navigate('RestaurantDetail', { 
      restaurantId: restaurant.id.toString() 
    });
  }, [navigation, restaurant.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={styles.card}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Top Rank Badge */}
        {topRank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>#{topRank}</Text>
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.status === 'verified' && (
            <View style={styles.verifiedCircle}>
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.cuisine} numberOfLines={1}>
          {(restaurant.cuisine || 
            restaurant.food_types || 
            restaurant.categories || 
            []
          ).join(' • ') || 'Đang cập nhật'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.rating}>⭐ {restaurant.rating || 'N/A'}</Text>
          {priceRange && <Text style={styles.price}>{priceRange}</Text>}
        </View>

        {/* Landmark Notes */}
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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  listPadding: {
    paddingBottom: 120,
    paddingTop: 10,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  headerInfo: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  resultsCount: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    height: 125,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF8C42',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rankBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  infoContainer: {
    padding: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3436',
    flex: 1,
  },
  verifiedCircle: {
    backgroundColor: '#00B894',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  verifiedCheck: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  cuisine: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3436',
  },
  price: {
    fontSize: 12,
    color: '#FF8C42',
    fontWeight: '700',
  },
  landmarkTag: {
    marginTop: 8,
    backgroundColor: '#FBFBFB',
    padding: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C42',
  },
  landmarkText: {
    fontSize: 10,
    color: '#636E72',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 15,
  },
});