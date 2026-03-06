import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PostCard } from '../components/post-card';
import PostSortToggle from '../components/PostSortToggle';
import { CommentModal } from '../components/CommentsModal'; // ← import modal
import { COLORS } from '../../constants/theme';
import type { Post } from '../../types/post';
import type { MainTabParamList } from '../../types/navigation';

import { usePostsStore } from '../../store/postStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Trending'>,
  NativeStackScreenProps<any>
>;

export default function TrendingScreen({ navigation }: Props) {
  const [sortFilter, setSortFilter] = useState<'newest' | 'popular'>('newest');
  // Comment modal state
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

    const {
    posts,
    loading,
    page,
    hasMore,
    setFilter,
    fetchFeed,
    likePost,
    savePost,
  } = usePostsStore();

  // Initial + whenever filter changes
  useEffect(() => {
    setFilter(sortFilter);
  }, [sortFilter, setFilter]);

  //Handle refresh
  const handleRefresh = useCallback(() => {
    fetchFeed({ page: 1, filter: sortFilter, append: false });
  }, [fetchFeed, sortFilter]);

  // Pagination
  const handleEndReached = useCallback(() => {
    if (!hasMore || loading) return;
    fetchFeed({ page: page + 1, filter: sortFilter, append: true });
  }, [hasMore, loading, fetchFeed, page, sortFilter]);

  const onPostPress = useCallback((post: Post) => {
    navigation.navigate('PostDetail' as any, { postId: post.id });
  }, [navigation]);

  const onUserPress = useCallback((userId: string) => {
    navigation.navigate('UserProfile' as any, { userId });
  }, [navigation]);

  const onLocationPress = useCallback((restaurantId: string) => {
    navigation.navigate('RestaurantDetail' as any, { restaurantId });
  }, [navigation]);

  const onSearchPress = useCallback(() => {
    navigation.navigate('TrendingSearch' as any);
  }, [navigation]);

  const onLike = useCallback(async (postId: string) => {
    likePost(postId);
  }, [likePost]);

  const onSave = useCallback(async (postId: string) => {
    savePost(postId);
  }, [savePost]);

  // ← Open CommentModal instead of navigating to CommentDetail
  const onComment = useCallback((postId: string) => {
    setCommentPostId(postId);
  }, []);

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Khám phá</Text>
          <Text style={styles.subtitle}>Những món ăn đang hot nhất</Text>
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
          <Ionicons name="search" size={22} color="#555" />
        </TouchableOpacity>
      </View>
      <PostSortToggle value={sortFilter} onChange={setSortFilter} />
    </View>
  ), [onSearchPress, sortFilter]);

  const renderFooter = useCallback(() => {
    if (!loading || page === 1) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }, [loading, page]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={42} color="#CCC" />
        <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
        <Text style={styles.emptyHint}>Hãy là người đầu tiên chia sẻ 👀</Text>
      </View>
    );
  }, [loading]);

  // Initial loading UI
  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(item, index) => item.id?.toString() || `post-${index}`}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => onPostPress(item)}
            onLike={() => onLike(item.id)}
            onSave={() => onSave(item.id)}
            onComment={onComment}
            onUserPress={onUserPress}
            onLocationPress={onLocationPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={loading && posts.length > 0}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={11}
      />

      {/* Comment Modal — replaces CommentDetail screen navigation */}
      <CommentModal
        visible={commentPostId !== null}
        postId={commentPostId ?? ''}
        onClose={() => setCommentPostId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchButton: {
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    marginVertical: 20,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    color: '#333',
  },
  emptyHint: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
  },
});