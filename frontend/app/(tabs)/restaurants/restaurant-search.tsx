import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import dataService from '../../../services/Api.service';
import { Restaurant, RestaurantStackParamList } from '../../../types/restaurant';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props {
  navigation: NavigationProp;
}

const RECENT_SEARCHES_KEY = 'restaurant_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export default function RestaurantSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = async (searchTerm: string) => {
    try {
      const trimmed = searchTerm.trim();
      if (!trimmed) return;

      // Remove duplicates and add to front
      const updated = [
        trimmed,
        ...recentSearches.filter(s => s !== trimmed)
      ].slice(0, MAX_RECENT_SEARCHES);

      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      setShowResults(true);

      try {
        // Search restaurants by name, food type, or cuisine
        const data = await dataService.searchRestaurants(searchQuery.trim());
        
        setResults(data);
        saveRecentSearch(searchQuery.trim());
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [recentSearches]
  );

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleRecentSearchPress = (searchTerm: string) => {
    setQuery(searchTerm);
  };

  const handleResultPress = (restaurant: Restaurant) => {
    Keyboard.dismiss();
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* SEARCH BAR */}
      <View style={styles.searchHeader}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm quán ăn, món ăn, ẩm thực..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* RECENT SEARCHES (shown when no query) */}
      {!showResults && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Tìm kiếm gần đây</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearText}>Xóa tất cả</Text>
            </TouchableOpacity>
          </View>

          {recentSearches.map((searchTerm, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => handleRecentSearchPress(searchTerm)}
            >
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.recentText}>{searchTerm}</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* SEARCH SUGGESTIONS (popular searches) */}
      {!showResults && query.length === 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Tìm kiếm phổ biến</Text>
          <View style={styles.chipContainer}>
            {['Phở', 'Bún chả', 'Café', 'Lẩu', 'Bánh mì', 'Cơm tấm'].map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.chip}
                onPress={() => setQuery(term)}
              >
                <Text style={styles.chipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* SEARCH RESULTS */}
      {showResults && (
        <>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF8C42" />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                results.length > 0 ? (
                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                      Tìm thấy {results.length} kết quả
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color="#DDD" />
                  <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
                  <Text style={styles.emptyText}>
                    Thử tìm kiếm với từ khóa khác
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <RestaurantResultCard 
                  restaurant={item} 
                  onPress={() => handleResultPress(item)}
                  searchQuery={query}
                />
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

/* ============================================
   RESTAURANT RESULT CARD COMPONENT
============================================ */

interface ResultCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  searchQuery: string;
}

const RestaurantResultCard = React.memo(({ 
  restaurant, 
  onPress,
  searchQuery 
}: ResultCardProps) => {
  const imageUri = restaurant.photos?.[0] || restaurant.images?.[0];
  
  // Highlight matching text
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts;
  };

  const cuisineText = restaurant.cuisine?.join(' • ') || 
                      restaurant.food_types?.join(' • ') || 
                      'Đang cập nhật';

  return (
    <TouchableOpacity 
      style={styles.resultCard} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* image_url = cover_image from restaurants.js normalizeRestaurant() — full Supabase Storage URL */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.resultImage} />
      ) : (
        <View style={[styles.resultImage, styles.resultImageFallback]}>
          <Ionicons name="restaurant-outline" size={24} color="#CCC" />
        </View>
      )}
      
      <View style={styles.resultInfo}>
        <View style={styles.resultNameRow}>
          <Text style={styles.resultName} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.verified && (
            <Ionicons name="checkmark-circle" size={16} color="#00B894" />
          )}
        </View>

        <Text style={styles.resultCuisine} numberOfLines={1}>
          {cuisineText}
        </Text>

        <View style={styles.resultMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.metaText}>{restaurant.rating || 'N/A'}</Text>
          </View>
          
          <Text style={styles.metaDot}>•</Text>
          
          <Text style={styles.metaText}>{restaurant.price_range || '₫₫'}</Text>
          
          {restaurant.top_rank_this_week && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>Top {restaurant.top_rank_this_week}</Text>
              </View>
            </>
          )}
        </View>

        {restaurant.landmark_notes && (
          <View style={styles.landmarkHint}>
            <Ionicons name="navigate-outline" size={12} color="#FF8C42" />
            <Text style={styles.landmarkText} numberOfLines={1}>
              {typeof restaurant.landmark_notes === 'string' 
                ? restaurant.landmark_notes 
                : restaurant.landmark_notes[0]?.text || ''}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  // Recent Searches
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  clearText: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  recentText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
  },
  
  // Suggestions
  suggestionsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Results
  resultsList: {
    paddingBottom: 20,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  
  // Result Card
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  resultImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  resultCuisine: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 12,
    color: '#CCC',
  },
  rankBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  landmarkHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FFF9F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  landmarkText: {
    fontSize: 11,
    color: '#FF8C42',
    fontWeight: '500',
  },
  resultImageFallback: { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
});
