/**
 * trending.tsx  —  Best-of-both combined TrendingScreen
 *
 * Key improvements vs. originals:
 * 1. Uses local state + api calls directly (no zustand postStore dependency)
 *    with proper deduplication, pagination, and optimistic like/save.
 * 2. Root-stack navigation routed through navigationRef so tabs can push
 *    root-stack screens without bubbling issues.
 * 3. onLike / onSave pass (postId, wasLiked/wasSaved) to PostCard —
 *    matches the new combined PostCard prop signature.
 * 4. CommentModal + ReportModal both wired up.
 * 5. onFollowToggle updates posts in place so the FollowButton stays in sync.
 * 6. All loading / refreshing / paginating states clearly separated.
 */

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

import { PostCard }       from '../components/post-card';
import PostSortToggle     from '../components/PostSortToggle';
import { CommentModal }   from '../components/CommentsModal';
import ReportModal        from '../components/report-modal';
import { COLORS }         from '../../constants/theme';
import type { Post }      from '../../types/post';
import type { MainTabParamList, RootStackParamList } from '../../types/navigation';
import api                from '../../services/Api.service';
import { useUserStore }   from '../../store/userStore';
import { navigate as navRefNavigate } from '../../types/navigation-ref';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Trending'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function TrendingScreen({ navigation }: Props) {
  const currentUserId = useUserStore(s => s.user?.id);

  const [sortFilter,     setSortFilter]     = useState<'newest' | 'popular'>('newest');
  const [posts,          setPosts]          = useState<Post[]>([]);
  const [page,           setPage]           = useState(1);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isRefetching,   setIsRefetching]   = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasNextPage,    setHasNextPage]    = useState(true);

  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [reportPostId,  setReportPostId]  = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadPosts = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh)        setIsRefetching(true);
      else if (pageNum > 1) setIsFetchingMore(true);
      else                  setIsLoading(true);

      const response = await api.getTrendingPosts(pageNum, sortFilter);

      if (isRefresh || pageNum === 1) {
        setPosts(response.data);
      } else {
        setPosts(prev => {
          const seen = new Set(prev.map((p: Post) => p.id));
          return [...prev, ...response.data.filter((p: Post) => !seen.has(p.id))];
        });
      }
      setHasNextPage(response.hasMore ?? false);
      setPage(pageNum);
    } catch (err) {
      console.error('[Trending] loadPosts error:', err);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
      setIsFetchingMore(false);
    }
  }, [sortFilter]);

  // Re-fetch from page 1 whenever sort changes
  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasNextPage(true);
    loadPosts(1, false);
  }, [sortFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh   = useCallback(() => loadPosts(1, true), [loadPosts]);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingMore && !isRefetching) loadPosts(page + 1);
  }, [hasNextPage, isFetchingMore, isRefetching, page, loadPosts]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  // Root-stack screens must be pushed via navigationRef — tab navigator cannot
  // bubble navigate() calls upward to the parent stack automatically.
  const onUserPress = useCallback((userId: string) => {
    if (String(userId) === String(currentUserId)) {
      navigation.navigate('UserProfile');              // own tab
    } else {
      navRefNavigate('UserProfileScreen', { userId }); // root stack
    }
  }, [navigation, currentUserId]);

  const onPostPress     = useCallback((post: Post) => {
    navRefNavigate('PostDetail', { postId: post.id });
  }, []);

  const onLocationPress = useCallback((restaurantId: string) => {
    navRefNavigate('RestaurantDetail', { restaurantId });
  }, []);

  const onSearchPress   = useCallback(() => {
    navRefNavigate('TrendingSearch');
  }, []);

  // ── Optimistic like ────────────────────────────────────────────────────────
  const onLike = useCallback(async (postId: string, wasLiked: boolean) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, is_liked: !wasLiked, likes_count: Math.max(0, (p.likes_count ?? 0) + (wasLiked ? -1 : 1)) }
          : p
      )
    );
    try {
      if (wasLiked) await api.unlikePost(postId);
      else          await api.likePost(postId);
    } catch {
      // Revert
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, is_liked: wasLiked, likes_count: Math.max(0, (p.likes_count ?? 0) + (wasLiked ? 1 : -1)) }
            : p
        )
      );
    }
  }, []);

  // ── Optimistic save ────────────────────────────────────────────────────────
  const onSave = useCallback(async (postId: string, wasSaved: boolean) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, is_saved: !wasSaved, saves_count: Math.max(0, (p.saves_count ?? 0) + (wasSaved ? -1 : 1)) }
          : p
      )
    );
    try {
      if (wasSaved) await api.unsavePost(postId);
      else          await api.savePost(postId);
    } catch {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, is_saved: wasSaved, saves_count: Math.max(0, (p.saves_count ?? 0) + (wasSaved ? 1 : -1)) }
            : p
        )
      );
    }
  }, []);

  // ── Follow toggle (update posts in-place) ──────────────────────────────────
  const onFollowToggle = useCallback((userId: string, isNowFollowing: boolean) => {
    setPosts(prev =>
      prev.map(p =>
        String(p.user?.id) === String(userId)
          ? { ...p, is_following: isNowFollowing ? 'true' : 'false' }
          : p
      )
    );
  }, []);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Khám phá</Text>
          <Text style={styles.headerSub}>Những món ăn đang hot nhất 🔥</Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={onSearchPress}
          accessibilityLabel="Tìm kiếm"
        >
          <Ionicons name="search" size={20} color="#555" />
        </TouchableOpacity>
      </View>
      <PostSortToggle value={sortFilter} onChange={setSortFilter} />
    </View>
  ), [sortFilter, onSearchPress]);

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) return <View style={{ height: 90 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={COLORS.primary} size="small" />
        <Text style={styles.footerText}>Đang tải thêm...</Text>
      </View>
    );
  }, [isFetchingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={52} color="#DDD" />
        <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
        <Text style={styles.emptySub}>Hãy là người đầu tiên chia sẻ 👀</Text>
      </View>
    );
  }, [isLoading]);

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      currentUserId={currentUserId}
      onPress={() => onPostPress(item)}
      onLike={(wasLiked) => onLike(item.id, wasLiked)}
      onSave={(wasSaved) => onSave(item.id, wasSaved)}
      onComment={() => setCommentPostId(item.id)}
      onUserPress={onUserPress}
      onLocationPress={onLocationPress}
      onFollowToggle={onFollowToggle}
      onReport={() => setReportPostId(item.id)}
    />
  ), [currentUserId, onPostPress, onLike, onSave, onUserPress, onLocationPress, onFollowToggle]);

  // Initial full-screen loading
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
        keyExtractor={(item, i) => item.id ?? `post-${i}`}
        renderItem={renderItem}
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
        maxToRenderPerBatch={4}
        windowSize={9}
        showsVerticalScrollIndicator={false}
      />

      {/* Comments modal */}
      <CommentModal
        visible={commentPostId !== null}
        postId={commentPostId ?? ''}
        onClose={() => setCommentPostId(null)}
      />

      {/* Report modal */}
      <ReportModal
        visible={reportPostId !== null}
        postId={reportPostId ?? undefined}
        targetName={posts.find(p => p.id === reportPostId)?.user?.username}
        onClose={() => setReportPostId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8F9FA' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:   { color: '#666', fontSize: 14 },

  headerContainer: { backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE', paddingBottom: 8 },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  headerTitle:     { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  headerSub:       { fontSize: 13, color: '#666', marginTop: 3 },
  searchBtn:       { backgroundColor: '#F0F0F0', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },

  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  footerText:   { color: '#999', fontSize: 13 },

  empty:      { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySub:   { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
});