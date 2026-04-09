import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { PostCard }      from '../components/post-card';
import { CommentModal }  from '../components/CommentsModal';
import ReportModal       from '../components/report-modal';
import { apiService }    from '../../services/Api.service';
import { useUserStore }  from '../../store/userStore';
import type { Post }     from '../../types/post';
import type { RootStackParamList } from '../../types/navigation';

const COLORS = {
  primary: '#FF8C42',
  dark:    '#1A1A1A',
  bg:      '#F8F9FA',
};

export function PostDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route      = useRoute<any>();
  const postId     = route.params?.postId as string;

  const currentUserId = useUserStore(s => s.user?.id);

  const [post,           setPost]           = useState<Post | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [commentVisible, setCommentVisible] = useState(false);
  const [reportVisible,  setReportVisible]  = useState(false);

  // ── Load post ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!postId) {
      setError('No post ID provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    apiService.getPostById(postId)
      .then(p  => { setPost(p); setLoading(false); })
      .catch(() => { setError('Không thể tải bài viết'); setLoading(false); });
  }, [postId]);

  // ── Like (optimistic) ──────────────────────────────────────────────────────
  const onLike = useCallback(async (wasLiked: boolean) => {
    setPost(prev =>
      prev
        ? { ...prev, is_liked: !wasLiked, likes_count: Math.max(0, prev.likes_count + (wasLiked ? -1 : 1)) }
        : prev,
    );
    try {
      if (wasLiked) await apiService.unlikePost(postId);
      else          await apiService.likePost(postId);
    } catch {
      // Revert on failure
      setPost(prev =>
        prev
          ? { ...prev, is_liked: wasLiked, likes_count: Math.max(0, prev.likes_count + (wasLiked ? 1 : -1)) }
          : prev,
      );
    }
  }, [postId]);

  // ── Save (optimistic) ──────────────────────────────────────────────────────
  const onSave = useCallback(async (wasSaved: boolean) => {
    setPost(prev =>
      prev
        ? { ...prev, is_saved: !wasSaved, saves_count: Math.max(0, (prev.saves_count ?? 0) + (wasSaved ? -1 : 1)) }
        : prev,
    );
    try {
      if (wasSaved) await apiService.unsavePost(postId);
      else          await apiService.savePost(postId);
    } catch {
      // Revert on failure
      setPost(prev =>
        prev
          ? { ...prev, is_saved: wasSaved, saves_count: Math.max(0, (prev.saves_count ?? 0) + (wasSaved ? 1 : -1)) }
          : prev,
      );
    }
  }, [postId]);

  // ── Navigate to user profile ───────────────────────────────────────────────
  // FIX: Always navigate to PublicProfile for other users so the route hits
  // GET /users/:id on the backend — never /users/me for someone else's profile.
  // For own profile, go back to Main (which shows the UserProfile tab).
  const onUserPress = useCallback((userId: string) => {
    if (String(userId) === String(currentUserId)) {
      // Go to own profile tab — navigate to Main root screen
      navigation.navigate('Main' as any);
    } else {
      // Always push PublicProfile with the explicit userId param
      navigation.navigate('UserProfileScreen', { userId });
    }
  }, [navigation, currentUserId]);

  // ── Navigate to restaurant ─────────────────────────────────────────────────
  const onLocationPress = useCallback((restaurantId: string) => {
    navigation.navigate('RestaurantDetail', { restaurantId });
  }, [navigation]);

  // ── Follow toggle ──────────────────────────────────────────────────────────
  const onFollowToggle = useCallback((userId: string, isNowFollowing: boolean) => {
    setPost(prev =>
      prev?.user?.id === userId
        ? { ...prev, is_following: isNowFollowing ? 'true' : 'false' }
        : prev,
    );
  }, []);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar onBack={() => navigation.goBack()} title="Bài viết" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar onBack={() => navigation.goBack()} title="Bài viết" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#CCC" />
          <Text style={styles.errorText}>{error ?? 'Không tìm thấy bài viết'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavBar onBack={() => navigation.goBack()} title="Bài viết" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <PostCard
          post={post}
          currentUserId={currentUserId}
          onPress={() => { /* Already on detail screen — no-op */ }}
          onLike={onLike}
          onSave={onSave}
          onComment={() => setCommentVisible(true)}
          onUserPress={onUserPress}
          onLocationPress={onLocationPress}
          onFollowToggle={onFollowToggle}
          onReport={() => setReportVisible(true)}
        />
      </ScrollView>

      <CommentModal
        visible={commentVisible}
        postId={post.id}
        onClose={() => setCommentVisible(false)}
      />

      <ReportModal
        visible={reportVisible}
        postId={post.id}
        targetName={post.user?.username}
        onClose={() => setReportVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Nav bar sub-component ─────────────────────────────────────────────────────
function NavBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity
        style={styles.navBtn}
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={26} color={COLORS.dark} />
      </TouchableOpacity>
      <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>
      {/* Spacer keeps title centred */}
      <View style={styles.navBtn} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll:    { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },

  navBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE', backgroundColor: '#FFFFFF' },
  navBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle:  { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.dark },

  errorText: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 8 },
  retryBtn:  { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 20 },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});