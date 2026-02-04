import React, { useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTrendingFeed } from '../../hooks/useTrendingFeed';
import { PostCard } from '../components/PostCard';
import { COLORS } from '../../constants/theme';
import { Post } from '../../types/post';

export default function TrendingScreen({ navigation }) {
  /**
   * IMPORTANT RULE:
   * - Trending feed = PURE feed
   * - NO filters
   * - NO sorting toggles
   * - NO search logic here
   */
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useTrendingFeed({
    mode: 'trending',
  });

  const posts: Post[] = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  /* ---------- HEADER ---------- */
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Khám phá</Text>

      <TouchableOpacity
        style={styles.searchBtn}
        onPress={() => navigation.navigate('Search')}
      >
        <Ionicons name="search" size={22} color="#555" />
      </TouchableOpacity>
    </View>
  );

  /* ---------- FOOTER ---------- */
  const renderFooter = () => {
    if (!hasNextPage) {
      return <View style={{ height: 40 }} />;
    }
    return (
      <ActivityIndicator
        style={{ marginVertical: 20 }}
        color={COLORS.primary}
      />
    );
  };

  /* ---------- EMPTY ---------- */
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={42} color="#CCC" />
        <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
        <Text style={styles.emptyHint}>
          Hãy là người đầu tiên chia sẻ 👀
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPressHashtag={(tag) =>
              navigation.navigate('Search', { hashtag: tag })
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },

  searchBtn: {
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 20,
  },

  empty: {
    alignItems: 'center',
    padding: 40,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },

  emptyHint: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
  },
});
