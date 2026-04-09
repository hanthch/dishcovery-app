import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Platform,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dataService from '../../../services/Api.service';
import {
  Restaurant,
  RestaurantStackParamList,
  FrontendFilters,
  PRICE_SLUG_TO_DB,
  slugToFoodType,
} from '../../../types/restaurant';
import FilterModal from './filter-modal';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;
type RouteType = RouteProp<RestaurantStackParamList, 'RestaurantSearch'>;

interface Props {
  navigation: NavigationProp;
  route?: RouteType;
}

const RECENT_SEARCHES_KEY   = 'restaurant_recent_searches';
const MAX_RECENT_SEARCHES   = 5;
const SEARCH_DEBOUNCE_MS    = 350;

const POPULAR_SEARCHES = ['Phở', 'Bún chả', 'Cà phê', 'Lẩu', 'Bánh mì', 'Cơm tấm', 'Bún bò', 'Hải sản'];

// ── Client-side filter helper ───────────────────────────────────────────────────
// searchRestaurants(query, limit) doesn't accept BackendFilterParams,
// so we apply price/cuisine/rating filters here after fetching.
function applyFrontendFilters(restaurants: Restaurant[], filters: FrontendFilters): Restaurant[] {
  return restaurants.filter(r => {
    if (filters.ratings.length > 0) {
      const minRating = Math.min(...filters.ratings);
      if ((r.rating ?? 0) < minRating) return false;
    }
    if (filters.priceRanges.length > 0) {
      const dbPrices = filters.priceRanges.map(s => PRICE_SLUG_TO_DB[s] || s);
      const rp = r.price_range ?? r.priceRange ?? '';
      if (!dbPrices.some(p => rp.includes(p) || p.includes(rp))) return false;
    }
    if (filters.cuisines.length > 0) {
      const dbTypes = filters.cuisines.map(s => {
        const ft = slugToFoodType(s);
        return ft ? String(ft) : s;
      });
      const rTypes = [
        ...(r.food_types ?? []),
        ...(r.cuisine ?? []),
        ...(r.categories ?? []),
      ].map(t => String(t));
      if (!dbTypes.some(dt => rTypes.some(rt => rt.includes(dt) || dt.includes(rt)))) return false;
    }
    return true;
  });
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function RestaurantSearchScreen({ navigation, route }: Props) {
  const initialQuery   = route?.params?.initialQuery ?? '';
  const initialFilters = route?.params?.initialFilters;

  const [query,          setQuery]         = useState(initialQuery);
  const [results,        setResults]       = useState<Restaurant[]>([]);
  const [recentSearches, setRecentSearches]= useState<string[]>([]);
  const [loading,        setLoading]       = useState(false);
  const [showResults,    setShowResults]   = useState(!!initialQuery);
  const [showFilterModal,setShowFilterModal]= useState(false);
  const [filters,        setFilters]       = useState<FrontendFilters>(
    initialFilters ?? { priceRanges: [], cuisines: [], ratings: [] }
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<TextInput>(null);
  const fadeAnim    = useRef(new Animated.Value(0)).current;

  // ── Persistent recent searches ─────────────────────────────────────────────
  useEffect(() => {
    loadRecentSearches();
    if (initialQuery) performSearch(initialQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run when filters change
  useEffect(() => {
    if (query.trim()) performSearch(query.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  };

  const saveRecentSearch = async (term: string) => {
    try {
      const trimmed = term.trim();
      if (!trimmed) return;
      const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {}
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch {}
  };

  // ── Search ─────────────────────────────────────────────────────────────────
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    setShowResults(true);
    try {
      const raw = await dataService.searchRestaurants(searchQuery.trim(), 50);
      const filtered = applyFrontendFilters(raw, filters);
      setResults(filtered);
      saveRecentSearch(searchQuery.trim());

      // Fade in results
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('[RestaurantSearch] error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    fadeAnim.setValue(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setShowResults(false);
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => performSearch(text.trim()), SEARCH_DEBOUNCE_MS);
  }, [performSearch, fadeAnim]);

  const handleClear = useCallback(() => {
    setQuery('');
    setShowResults(false);
    setResults([]);
    fadeAnim.setValue(0);
    inputRef.current?.focus();
  }, [fadeAnim]);

  const handleApplyFilters = useCallback((newFilters: FrontendFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResultPress = useCallback((restaurant: Restaurant) => {
    Keyboard.dismiss();
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
  }, [navigation]);

  const handleRecentPress = useCallback((term: string) => {
    setQuery(term);
    performSearch(term);
  }, [performSearch]);

  const hasActiveFilters =
    filters.priceRanges.length > 0 ||
    filters.cuisines.length > 0 ||
    filters.ratings.length > 0;

  const filterCount = filters.priceRanges.length + filters.cuisines.length + filters.ratings.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── SEARCH HEADER ── */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={query ? '#FF8C42' : '#999'} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Tìm quán, món ăn, ẩm thực..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim()) performSearch(query.trim());
            }}
            accessibilityLabel="Ô tìm kiếm"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} accessibilityLabel="Xóa tìm kiếm">
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
          accessibilityLabel={`Bộ lọc${filterCount > 0 ? `, ${filterCount} đang bật` : ''}`}
        >
          <Ionicons name="options-outline" size={20} color={hasActiveFilters ? '#fff' : '#555'} />
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── RECENT SEARCHES (shown when no query) ── */}
      {!showResults && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Tìm kiếm gần đây</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearText}>Xóa tất cả</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((term, i) => (
            <TouchableOpacity
              key={`recent-${i}`}
              style={styles.recentItem}
              onPress={() => handleRecentPress(term)}
            >
              <Ionicons name="time-outline" size={16} color="#999" />
              <Text style={styles.recentText}>{term}</Text>
              <Ionicons name="chevron-forward" size={16} color="#DDD" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── POPULAR SEARCHES (shown when no query) ── */}
      {!showResults && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Phổ biến 🔥</Text>
          <View style={styles.chipWrap}>
            {POPULAR_SEARCHES.map(term => (
              <TouchableOpacity
                key={term}
                style={styles.chip}
                onPress={() => { setQuery(term); performSearch(term); }}
              >
                <Text style={styles.chipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── RESULTS ── */}
      {showResults && (
        loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF8C42" />
            <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
          </View>
        ) : (
          <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
            <FlatList
              data={results}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultsList}
              ListHeaderComponent={
                <View style={styles.resultsHeaderRow}>
                  <Text style={styles.resultsCount}>
                    {results.length > 0
                      ? `${results.length} kết quả cho "${query}"`
                      : ''}
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity onPress={() => setFilters({ priceRanges: [], cuisines: [], ratings: [] })}>
                      <Text style={styles.clearFiltersText}>Xóa bộ lọc</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <ResultCard
                  restaurant={item}
                  onPress={() => handleResultPress(item)}
                  searchQuery={query}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="search-outline" size={52} color="#DDD" />
                  <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
                  <Text style={styles.emptyText}>Thử từ khóa khác hoặc xóa bộ lọc</Text>
                  {hasActiveFilters && (
                    <TouchableOpacity
                      style={styles.clearFiltersBtn}
                      onPress={() => setFilters({ priceRanges: [], cuisines: [], ratings: [] })}
                    >
                      <Text style={styles.clearFiltersBtnText}>Xóa bộ lọc</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          </Animated.View>
        )
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </SafeAreaView>
  );
}

// ── Result Card ─────────────────────────────────────────────────────────────────
interface ResultCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  searchQuery: string;
}

const ResultCard = React.memo(({ restaurant, onPress }: ResultCardProps) => {
  const imageUri = restaurant.photos?.[0]
    || restaurant.images?.[0]
    || restaurant.cover_image
    || restaurant.image_url;

  const cuisineText = (restaurant.cuisine ?? restaurant.food_types ?? [])
    .slice(0, 2).join(' · ') || 'Đang cập nhật';

  const landmarkText = (() => {
    const notes = restaurant.landmark_notes;
    if (typeof notes === 'string') return notes;
    if (Array.isArray(notes)) return notes[0]?.text || '';
    return '';
  })();

  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.78}>
      <Image
        source={{ uri: imageUri || 'https://via.placeholder.com/72x72?text=🍽️' }}
        style={styles.resultImage}
        resizeMode="cover"
      />
      <View style={styles.resultInfo}>
        <View style={styles.resultNameRow}>
          <Text style={styles.resultName} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.verified && (
            <Ionicons name="checkmark-circle" size={15} color="#00B894" />
          )}
        </View>

        <Text style={styles.resultCuisine} numberOfLines={1}>{cuisineText}</Text>

        <View style={styles.resultMeta}>
          {restaurant.rating != null && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.metaText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
          )}
          {restaurant.price_range && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{restaurant.price_range}</Text>
            </>
          )}
          {restaurant.top_rank_this_week && restaurant.top_rank_this_week <= 10 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <View style={styles.rankPill}>
                <Ionicons name="trophy" size={9} color="#856404" />
                <Text style={styles.rankPillText}>Top {restaurant.top_rank_this_week}</Text>
              </View>
            </>
          )}
        </View>

        {landmarkText ? (
          <View style={styles.landmarkHint}>
            <Ionicons name="navigate-outline" size={10} color="#FF8C42" />
            <Text style={styles.landmarkHintText} numberOfLines={1}>{landmarkText}</Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#DDD" />
    </TouchableOpacity>
  );
});

ResultCard.displayName = 'ResultCard';

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  searchHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 8 : 6,
    paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    gap: 8,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14, paddingHorizontal: 12, height: 46,
    gap: 8, borderWidth: 1.5, borderColor: '#EFEFEF',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  filterBtn: {
    width: 46, height: 46,
    backgroundColor: '#F5F5F5',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EFEFEF',
  },
  filterBtnActive: { backgroundColor: '#FF8C42', borderColor: '#FF8C42' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#E05A00',
    width: 17, height: 17, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Recent
  recentSection: { paddingHorizontal: 16, paddingTop: 18 },
  rowHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  clearText: { fontSize: 13, color: '#FF8C42', fontWeight: '600' },
  recentItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  recentText: { flex: 1, fontSize: 14, color: '#444' },

  // Suggestions
  suggestionsSection: { paddingHorizontal: 16, paddingTop: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: '#F5F5F5', borderRadius: 22,
    borderWidth: 1, borderColor: '#EFEFEF',
  },
  chipText: { fontSize: 13, color: '#555', fontWeight: '500' },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: '#888', fontSize: 13, marginTop: 4 },

  // Results
  resultsList: { paddingBottom: 60 },
  resultsHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  resultsCount: { fontSize: 13, color: '#888', fontWeight: '500', flex: 1 },
  clearFiltersText: { fontSize: 13, color: '#FF8C42', fontWeight: '600' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center' },
  clearFiltersBtn: {
    marginTop: 12, backgroundColor: '#FF8C42',
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22,
  },
  clearFiltersBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Result card
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
    gap: 12, backgroundColor: '#fff',
  },
  resultImage: {
    width: 74, height: 74, borderRadius: 14, backgroundColor: '#F0F0F0',
  },
  resultInfo: { flex: 1 },
  resultNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3,
  },
  resultName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  resultCuisine: { fontSize: 12, color: '#888', marginBottom: 6 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#666', fontWeight: '500' },
  metaDot: { fontSize: 12, color: '#DDD' },
  rankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  rankPillText: { fontSize: 10, fontWeight: '700', color: '#856404' },
  landmarkHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    backgroundColor: '#FFF9F0',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7,
    alignSelf: 'flex-start',
  },
  landmarkHintText: { fontSize: 11, color: '#FF8C42', fontWeight: '500' },
});