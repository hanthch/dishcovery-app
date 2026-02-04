import React, { useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';

import { useSearchStore } from '../../store/searchStore';
import { useTrendingSearch } from '../../hooks/useTrendingSearch';
import { PostCard } from '../components/PostCard';
import { SearchFilters } from '../components/SearchFilters';
import { Post } from '../../types/post';

export default function SearchScreen({ route, navigation }) {
  const {
    query,
    hashtag,
    sort,
    setQuery,
    setHashtag,
    setSort,
  } = useSearchStore();

  // hashtag coming from PostCard click
  useEffect(() => {
    if (route.params?.hashtag) {
      setHashtag(route.params.hashtag);
    }
  }, [route.params?.hashtag]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useTrendingSearch({ query, hashtag, sort });

  const posts: Post[] = useMemo(
    () => data?.pages.flatMap((p) => p.data) || [],
    [data]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* SEARCH BAR */}
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Tìm bài viết, quán ăn, #hashtag"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* FILTERS (only when searching) */}
      {(query.length > 0 || hashtag) && (
        <SearchFilters value={sort} onChange={setSort} />
      )}

      {/* HASHTAG TITLE */}
      {hashtag && (
        <Text style={styles.hashtagTitle}>#{hashtag}</Text>
      )}

      {/* RESULTS */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPressHashtag={(tag) =>
                navigation.push('Search', { hashtag: tag })
              }
            />
          )}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchBox: {
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 12,
  },
  hashtagTitle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontWeight: '700',
    fontSize: 16,
  },
});
