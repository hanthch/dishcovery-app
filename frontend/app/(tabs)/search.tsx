import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiService } from '@/services/Api.service';
import { SearchResult } from '@/types/search';

import SearchFilters from '../components/SearchFilters';
import SearchResultItem from '../components/searchResult';
import PostSortToggle from '../components/PostSortToggle';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

type TrendingSearchNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: TrendingSearchNavigationProp;
}

type FilterType = 'all' | 'post' | 'user' | 'restaurant';
type SortType = 'newest' | 'popular';

const RECENT_SEARCHES_KEY = 'trending_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export default function TrendingSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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

      const updated = [
        trimmed,
        ...recentSearches.filter((s) => s !== trimmed),
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

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await apiService.universalSearch(query, sort);
      setResults(data);
      saveRecentSearch(query);
    } catch (e) {
      console.error('[TrendingSearch] Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, sort, recentSearches]);

  useEffect(() => {
    const timer = setTimeout(performSearch, 350);
    return () => clearTimeout(timer);
  }, [performSearch]);

  const filteredResults = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter((item) => item.type === filter);
  }, [results, filter]);

  const hasPostResults = useMemo(
    () => filteredResults.some((r) => r.type === 'post'),
    [filteredResults]
  );

  const handleRecentSearchPress = (searchTerm: string) => {
    setQuery(searchTerm);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            placeholder="Tìm bài viết, người dùng, địa điểm..."
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            autoFocus
            placeholderTextColor="#999"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!query.trim() && recentSearches.length > 0 && (
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

      {/* POPULAR SEARCHES (shown when no query) */}
      {!query.trim() && (
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

      {query.trim() && (
        <>
          {/* TYPE FILTERS (All / Posts / Users / Restaurants) */}
          <SearchFilters active={filter} onChange={setFilter} />

          {/* POST SORT (Newest / Popular) - Only show for posts */}
          {(filter === 'all' || filter === 'post') && hasPostResults && (
            <PostSortToggle value={sort} onChange={setSort} />
          )}

          {/* RESULTS */}
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#FF8C42" />
              <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredResults}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={({ item }) => (
                <SearchResultItem
                  result={item}
                  onPressPost={(postId) =>
                    navigation.navigate('PostDetail', { postId })
                  }
                  onPressUser={(userId) =>
                    navigation.navigate('UserProfile', { userId })
                  }
                  onPressRestaurant={(restaurantId) =>
                    navigation.navigate('RestaurantDetail', { restaurantId })
                  }
                />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="search-outline" size={50} color="#DDD" />
                  <Text style={styles.emptyTitle}>
                    Không tìm thấy kết quả
                  </Text>
                  <Text style={styles.emptyText}>
                    Thử tìm kiếm với từ khóa khác
                  </Text>
                </View>
              }
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  backButton: {
    padding: 4,
  },

  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },

  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 16,
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },

  resultsList: {
    paddingBottom: 20,
  },

  empty: {
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    marginTop: 8,
    color: '#888',
    fontSize: 14,
  },
});