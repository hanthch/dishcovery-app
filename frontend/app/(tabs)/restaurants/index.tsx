import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../services/Api.service';
import { Restaurant, RestaurantStackParamList, convertFiltersToBackendParams } from '../../../types/restaurant';
import FilterModal, { RestaurantFilters } from './filter-modal';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props { 
  navigation: NavigationProp; 
}

const CUISINE_CATEGORIES = [
  { id: 'vietnamese', label: 'Món Việt', flag: '🇻🇳', color: '#FFE5E5' },
  { id: 'thai', label: 'Món Thái', flag: '🇹🇭', color: '#E5F3FF' },
  { id: 'korean', label: 'Món Hàn', flag: '🇰🇷', color: '#FFF5E5' },
  { id: 'western', label: 'Món Âu-Mỹ', flag: '🇺🇸', color: '#F0E5FF' },
  { id: 'japanese', label: 'Món Nhật', flag: '🇯🇵', color: '#FFE5F5' },
  { id: 'chinese', label: 'Món Trung', flag: '🇨🇳', color: '#E5FFF0' },
  { id: 'indian', label: 'Món Ấn', flag: '🇮🇳', color: '#FFF8E5' },
  { id: 'other', label: 'Khác', flag: '🌍', color: '#F5F5F5' },
];

const RESTAURANT_CATEGORIES = [
  { id: 'street-food', label: '🍜 Quán vỉa hè', icon: '🍜' },
  { id: 'vegan', label: '🥬 Quán chay', icon: '🥬' },
  { id: 'hidden-gem', label: '🔍 Quán núp hẻm', icon: '🔍' },
  { id: 'long-standing', label: '⏰ Quán lâu năm', icon: '⏰' },
  { id: 'student-friendly', label: '🎓 Quán ăn bình dân sinh viên', icon: '🎓' },
  { id: 'late-night', label: '🌙 Quán lai rai', icon: '🌙' },
  { id: 'breakfast', label: '🌅 Quán ăn khuya', icon: '🌅' },
  { id: 'fancy', label: '✨ Quán ăn sang trọng', icon: '✨' },
];

export default function RestaurantsHomeScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const [activeFilters, setActiveFilters] = useState<RestaurantFilters>({
    types: [],
    priceRanges: [],
    cuisines: [],
    ratings: [],
  });
  
  // All data comes from Supabase
  const [topTen, setTopTen] = useState<Restaurant[]>([]);
  const [categoriesData, setCategoriesData] = useState<{ [key: string]: Restaurant[] }>({});
  const [loadingCategories, setLoadingCategories] = useState<{ [key: string]: boolean }>({});
  const [loadingTop10, setLoadingTop10] = useState(false);

  const hasActiveFilters = 
    activeFilters.types.length > 0 ||
    activeFilters.priceRanges.length > 0 ||
    activeFilters.cuisines.length > 0 ||
    activeFilters.ratings.length > 0;

  // Load all data from Supabase on mount
  useEffect(() => { 
    loadDataInBackground(); 
  }, []);

  /**
   * Load all dynamic data from Supabase
   */
  const loadDataInBackground = async () => {
    console.log('[HomeScreen] Loading data from Supabase...');
    
    setLoadingTop10(true);
    apiService.getTopTen()
      .then(data => {
        console.log('[Top10] Loaded from Supabase:', data.length, 'restaurants');
        if (data && data.length > 0) {
          setTopTen(data);
        } else {
          console.warn('[Top10] No data returned from Supabase');
          setTopTen([]);
        }
      })
      .catch(err => {
        console.error('[Top10] Failed to load from Supabase:', err);
        setTopTen([]);
      })
      .finally(() => {
        setLoadingTop10(false);
      });

    // Load each category from Supabase dynamically
    for (const category of RESTAURANT_CATEGORIES) {
      loadCategoryInBackground(category.id);
      // Small delay to avoid overwhelming Supabase
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const loadCategoryInBackground = async (categoryId: string) => {
    try {
      console.log(`[Category ${categoryId}] Loading from Supabase...`);
      setLoadingCategories(prev => ({ ...prev, [categoryId]: true }));
      
      // Fetch from Supabase via API
      const restaurants = await apiService.getRestaurantsByCategory(categoryId);
      
      console.log(`[Category ${categoryId}] Loaded ${restaurants.length} restaurants`);
      
      if (restaurants && restaurants.length > 0) {
        const filteredRestaurants = hasActiveFilters 
          ? applyClientSideFilters(restaurants, activeFilters)
          : restaurants;
        
        setCategoriesData(prev => ({
          ...prev,
          [categoryId]: filteredRestaurants
        }));
      } else {
        console.warn(`[Category ${categoryId}] No restaurants found in Supabase`);
        setCategoriesData(prev => ({
          ...prev,
          [categoryId]: []
        }));
      }
    } catch (error) {
      console.error(`[Category ${categoryId}] Failed to load from Supabase:`, error);
      setCategoriesData(prev => ({
        ...prev,
        [categoryId]: []
      }));
    } finally {
      setLoadingCategories(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleApplyFilters = async (filters: RestaurantFilters) => {
    console.log('[Filters] Applying filters:', filters);
    setActiveFilters(filters);
    
    // Re-filter existing data from Supabase
    const refiltered: { [key: string]: Restaurant[] } = {};
    Object.keys(categoriesData).forEach(categoryId => {
      const restaurants = categoriesData[categoryId];
      refiltered[categoryId] = applyClientSideFilters(restaurants, filters);
    });
    
    setCategoriesData(refiltered);
  };

  const applyClientSideFilters = (
    restaurants: Restaurant[], 
    filters: RestaurantFilters
  ): Restaurant[] => {
    let filtered = restaurants;

    if (filters.types.length > 0) {
      filtered = filtered.filter((r) => {
        const categories = r.categories || [];
        return categories.some(cat => 
          filters.types.some(filterType => 
            cat.toLowerCase().includes(filterType.toLowerCase())
          )
        );
      });
    }

    if (filters.priceRanges.length > 0) {
      filtered = filtered.filter((r) => {
        const price = r.price_range || '';
        const priceMap: { [key: string]: string[] } = {
          'under-30k': ['Dưới 30k', '₫'],
          '30k-50k': ['30k-50k', '₫₫'],
          '50k-100k': ['50k-100k', '₫₫₫'],
          'over-100k': ['Trên 100k', '₫₫₫₫'],
        };
        return filters.priceRanges.some(range => {
          const allowedPrices = priceMap[range] || [];
          return allowedPrices.includes(price);
        });
      });
    }

    if (filters.cuisines.length > 0) {
      filtered = filtered.filter((r) => {
        const cuisines = r.cuisine || r.food_types || [];
        return cuisines.some((cuisine) =>
          filters.cuisines.some((filter) => 
            cuisine.toLowerCase().includes(filter.toLowerCase())
          )
        );
      });
    }

    if (filters.ratings.length > 0) {
      const minRating = Math.min(...filters.ratings);
      filtered = filtered.filter((r) => (r.rating || 0) >= minRating);
    }

    return filtered;
  };

  const handleRefresh = useCallback(() => {
    console.log('[HomeScreen] Refreshing all data from Supabase...');
    setRefreshing(true);
    setCategoriesData({});
    setLoadingCategories({});
    setTopTen([]);
    
    loadDataInBackground().finally(() => {
      setRefreshing(false);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khám phá</Text>
        <TouchableOpacity onPress={() => {/* Notifications */}}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF8C42"
            colors={['#FF8C42']}
          />
        }
      >
        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('RestaurantSearch')}
          >
            <Ionicons name="search" size={20} color="#999" />
            <Text style={styles.searchPlaceholder}>
              Search for name, restaurants...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>

        {/* TOP 10 BANNER - DYNAMIC from Supabase */}
        <TouchableOpacity 
          style={styles.topBanner}
          onPress={() => navigation.navigate('Top10')}
          activeOpacity={0.9}
        >
          <View style={styles.topBannerContent}>
            <View>
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>TOP 10</Text>
              </View>
              <Text style={styles.topBannerTitle}>Quán ăn</Text>
              <Text style={styles.topBannerSubtitle}>NỔI BẬT NHẤT TUẦN NÀY</Text>
              {loadingTop10 ? (
                <ActivityIndicator size="small" color="#FF8C42" style={{ marginTop: 8 }} />
              ) : (
                <TouchableOpacity 
                  style={styles.topBannerButton}
                  onPress={() => navigation.navigate('Top10')}
                >
                  <Text style={styles.topBannerButtonText}>
                    Khám phá hơn → ({topTen.length} quán)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Image
              source={require('../../../assets/images/restaurant-house.png')}
              style={styles.topBannerImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        {/* HÔM NAY ĂN GÌ? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hôm nay ăn gì?</Text>
          <View style={styles.cuisineGrid}>
            {CUISINE_CATEGORIES.map((cuisine) => (
              <TouchableOpacity
                key={cuisine.id}
                style={[styles.cuisineCard, { backgroundColor: cuisine.color }]}
                onPress={() => navigation.navigate('Category', {
                  type: 'category',
                  category: cuisine.id,
                  title: cuisine.label,
                })}
              >
                <Text style={styles.cuisineFlag}>{cuisine.flag}</Text>
                <Text style={styles.cuisineLabel}>{cuisine.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* DYNAMIC CATEGORY SECTIONS - Data from Supabase */}
        {RESTAURANT_CATEGORIES.map((category) => {
          const restaurants = categoriesData[category.id] || [];
          const isLoading = loadingCategories[category.id];

          return (
          <View key={category.id} style={styles.section}>
            {/* Header của từng Section: Tên quán + See More */}
            <View style={styles.sectionHeader}>
              <View style={styles.titleContainer}>
                <View style={styles.orangeVerticalLine} /> 
                <Text style={styles.categoryTitle}>
                  {category.label}
                  </Text>
                  </View>
                  
                  <TouchableOpacity
                  onPress={() => navigation.navigate('Category', {
                    type: 'category',
                    category: category.id,
                    title: category.label,
                  })}>
                    <Text style={styles.seeMoreText}>See More</Text>
                    </TouchableOpacity>
                    </View>

              {isLoading && restaurants.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FF8C42" />
                  </View>
                  ) : restaurants.length > 0 ? (
                  <FlatList
                  data={restaurants.slice(0, 10)}
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListPadding}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                  <DynamicRestaurantCard restaurant={item} 
                  navigation={navigation}
                  />
                )}
                />
              ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có quán trong danh mục này</Text>
                </View>
              )}
              </View>
              );
              })}
              
              <View style={{ height: 100 }} />
              </ScrollView>
              
              {/* Filter Modal */}
              <FilterModal visible={showFilterModal}
              onClose={() => setShowFilterModal(false)}
              onApply={handleApplyFilters}
              initialFilters={activeFilters}
              />
              </SafeAreaView>
              )
            }

interface RestaurantCardProps {
  restaurant: Restaurant;
  navigation: NavigationProp;
}

const DynamicRestaurantCard = React.memo(({ restaurant, navigation }: RestaurantCardProps) => {
  // Get image dynamically from Supabase data
  const imageUri = restaurant.cover_image || 
                   restaurant.image_url || 
                   restaurant.photos?.[0] || 
                   'https://via.placeholder.com/140x120?text=No+Image';

  return (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetail', {
        restaurantId: restaurant.id.toString(),
      })}
    >
      {/* Dynamic image from Supabase */}
      <Image 
        source={{ uri: imageUri }}
        style={styles.restaurantImage} 
      />
      
      <View style={styles.restaurantInfo}>
        {/* Dynamic name from Supabase */}
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        
        <View style={styles.restaurantMeta}>
          {/* Dynamic rating from Supabase */}
          {restaurant.rating && restaurant.rating > 0 && (
            <>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
              <Text style={styles.separator}>•</Text>
            </>
          )}
          
          {/* Dynamic price range from Supabase */}
          <Text style={styles.price}>
            {restaurant.price_range || '₫₫'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

DynamicRestaurantCard.displayName = 'DynamicRestaurantCard';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FF8C42' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchPlaceholder: { flex: 1, color: '#999', fontSize: 14 },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: '#FF8C42' },
  topBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFF5E5',
    borderRadius: 20,
    padding: 20,
  },
  topBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBadge: {
    backgroundColor: '#FF8C42',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  topBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  topBannerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  topBannerSubtitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF8C42',
    marginVertical: 4,
  },
  topBannerButton: { marginTop: 12 },
  topBannerButtonText: { color: '#FF8C42', fontSize: 14, fontWeight: '600' },
  topBannerImage: { width: 100, height: 100 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  cuisineCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  cuisineFlag: { fontSize: 32 },
  cuisineLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: '#FF8C42' },
  seeMore: { fontSize: 14, color: '#999', fontWeight: '600' },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#999',
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  categoryList: { paddingHorizontal: 16, gap: 12 },
  restaurantCard: { width: 140, marginRight: 12 },
  restaurantImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  restaurantInfo: { marginTop: 8 },
  restaurantName: { fontSize: 14, fontWeight: '600', color: '#333' },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  rating: { fontSize: 12, color: '#333', fontWeight: '500' },
  separator: { fontSize: 12, color: '#CCC' },
  price: { fontSize: 12, color: '#FF8C42', fontWeight: '600' },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orangeVerticalLine: {
    width: 4,
    height: 20,
    backgroundColor: '#FF8C42',
    borderRadius: 2,
    marginRight: 8,
  },
  seeMoreText: {
    fontSize: 12,
    color: '#999', 
    fontWeight: '500',
  },
  horizontalListPadding: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
