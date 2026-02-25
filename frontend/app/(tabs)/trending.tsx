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
import api from '../../services/Api.service';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Trending'>,
  NativeStackScreenProps<any>
>;

export default function TrendingScreen({ navigation }: Props) {
  const [sortFilter, setSortFilter] = useState<'newest' | 'popular'>('newest');
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Comment modal state
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const loadTrendingPosts = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) setIsRefetching(true);
      else if (pageNum === 1) setIsLoading(true);
      else setIsFetchingNextPage(true);

      const response = await api.getTrendingPosts(pageNum, sortFilter);
      
      if (isRefresh || pageNum === 1) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }
      
      setHasNextPage(response.hasMore ?? false);
      setPage(pageNum);
    } catch (err) {
      console.error('[Trending] Failed to load posts:', err);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
      setIsFetchingNextPage(false);
    }
  }, [sortFilter]);

  useEffect(() => {
    loadTrendingPosts(1, false);
  }, [sortFilter, loadTrendingPosts]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isRefetching) {
      loadTrendingPosts(page + 1);
    }
  }, [hasNextPage, isFetchingNextPage, isRefetching, page, loadTrendingPosts]);

  const handleRefresh = useCallback(() => {
    loadTrendingPosts(1, true);
  }, [loadTrendingPosts]);

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

  const onLike = useCallback(async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }
    } catch (err) {
      console.error('[Trending] Failed to toggle like:', err);
    }
  }, []);

  const onSave = useCallback(async (postId: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        await api.unsavePost(postId);
      } else {
        await api.savePost(postId);
      }
    } catch (err) {
      console.error('[Trending] Failed to toggle save:', err);
    }
  }, []);

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
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={42} color="#CCC" />
        <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
        <Text style={styles.emptyHint}>Hãy là người đầu tiên chia sẻ 👀</Text>
      </View>
    );
  }, [isLoading]);

  if (isLoading && !isRefetching) {
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
            onLike={(isLiked) => onLike(item.id, isLiked)}
            onSave={(isSaved) => onSave(item.id, isSaved)}
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
            refreshing={isRefetching}
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