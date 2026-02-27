import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ImageStyle,
  Linking,
  Dimensions,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { apiService } from '../../services/Api.service';
import { useUserStore } from '../../store/userStore';
import { Restaurant } from '../../types/restaurant';
import { Post } from '../../types/post';
import { User } from '../../types/auth';

const COLORS = {
  primary:     '#FF6B35',
  primarySoft: '#FFF0EB',
  dark:        '#1A1A1A',
  mid:         '#666666',
  light:       '#999999',
  border:      '#F0F0F0',
  bg:          '#FAFAFA',
  white:       '#FFFFFF',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 3) / 3;

interface UserProfileScreenProps {
  userId?:      string | number;
  isOwnProfile?: boolean;
  onClose?:     () => void;
  onPostPress?: (post: Post) => void;
  onUserPress?: (userId: string) => void; // navigate to another user's profile
}

export function UserProfileScreen({
  userId,
  isOwnProfile = false,
  onClose,
  onPostPress,
  onUserPress,
}: UserProfileScreenProps) {
  const insets           = useSafeAreaInsets();
  const currentUser      = useUserStore((state) => state.user);
  const fetchCurrentUser = useUserStore((state) => state.fetchCurrentUser);

  const [user,             setUser]             = useState<User | null>(null);
  const [posts,            setPosts]            = useState<Post[]>([]);
  const [savedPosts,       setSavedPosts]       = useState<Post[]>([]);
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([]);
  const [activeTab,        setActiveTab]        = useState<'posts' | 'saved_posts' | 'saved_restaurants'>('posts');
  const [isFollowing,      setIsFollowing]      = useState(false);
  const [profileLoading,   setProfileLoading]   = useState(true);
  const [tabLoading,       setTabLoading]       = useState(false);
  const [refreshing,       setRefreshing]       = useState(false);

  // Followers/Following modal state
  const [socialModal,      setSocialModal]      = useState<'followers' | 'following' | null>(null);
  const [socialList,       setSocialList]       = useState<User[]>([]);
  const [socialLoading,    setSocialLoading]    = useState(false);

  // ── OWN PROFILE: show cached user instantly, then refresh from API ─────────
  useEffect(() => {
    if (!isOwnProfile) return;
    if (currentUser) {
      setUser(currentUser);
      setProfileLoading(false);
    }
    fetchCurrentUser().finally(() => setProfileLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile]);

  // Sync whenever store updates (post creation, follow, etc.)
  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setUser(currentUser);
    }
  }, [isOwnProfile, currentUser]);

  // ── OTHER USER PROFILE ────────────────────────────────────────────────────
  const loadUserProfile = useCallback(async () => {
    if (isOwnProfile || !userId) return;
    try {
      setProfileLoading(true);
      const profile = await apiService.getUserProfile(String(userId));
      setUser(profile);
      setIsFollowing(!!profile.is_following);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ');
    } finally {
      setProfileLoading(false);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile && userId) loadUserProfile();
  }, [loadUserProfile]);

  // ── TAB DATA ──────────────────────────────────────────────────────────────
  const loadTabData = useCallback(async () => {
    const resolvedId = user?.id ?? (isOwnProfile ? currentUser?.id : undefined);
    if (!resolvedId) return;

    setTabLoading(true);
    try {
      const targetId = String(resolvedId);
      if (activeTab === 'posts') {
        const data = await apiService.getUserPosts(targetId);
        setPosts(data);
      } else if (activeTab === 'saved_posts') {
        const data = await apiService.getSavedPosts();
        setSavedPosts(data);
      } else if (activeTab === 'saved_restaurants') {
        const data = await apiService.getSavedRestaurants();
        setSavedRestaurants(data);
      }
    } catch (e) {
      console.warn('[UserProfile] loadTabData error:', e);
    } finally {
      setTabLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id, isOwnProfile, currentUser?.id]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // ── PULL-TO-REFRESH ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isOwnProfile) {
      await Promise.all([fetchCurrentUser(), loadTabData()]);
    } else {
      await Promise.all([loadUserProfile(), loadTabData()]);
    }
    setRefreshing(false);
  }, [isOwnProfile, fetchCurrentUser, loadUserProfile, loadTabData]);

  // ── FOLLOWERS / FOLLOWING MODAL ───────────────────────────────────────────
  const openSocialModal = useCallback(async (type: 'followers' | 'following') => {
    const targetId = user?.id ?? (isOwnProfile ? currentUser?.id : undefined);
    if (!targetId) return;
    setSocialModal(type);
    setSocialLoading(true);
    setSocialList([]);
    try {
      const data = type === 'followers'
        ? await apiService.getUserFollowers(String(targetId))
        : await apiService.getUserFollowing(String(targetId));
      setSocialList(data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách');
    } finally {
      setSocialLoading(false);
    }
  }, [user?.id, isOwnProfile, currentUser?.id]);

  // ── FOLLOW / UNFOLLOW ─────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!user) return;
    try {
      if (isFollowing) {
        await apiService.unfollowUser(String(user.id));
        setIsFollowing(false);
        setUser(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : prev);
      } else {
        await apiService.followUser(String(user.id));
        setIsFollowing(true);
        setUser(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : prev);
      }
    } catch {
      Alert.alert('Lỗi', 'Thao tác thất bại');
    }
  };

  const openDirections = (address: string, googleMapsUrl?: string) => {
    const url = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => Alert.alert('Lỗi', 'Không thể mở bản đồ'));
  };

  const getListData = (): (Post | Restaurant)[] => {
    if (activeTab === 'posts')             return posts;
    if (activeTab === 'saved_posts')       return savedPosts;
    if (activeTab === 'saved_restaurants') return savedRestaurants;
    return [];
  };

  // ── PROFILE HEADER ────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (!user) return (
      <View style={styles.headerSkeleton}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );

    return (
      <View style={styles.headerWrapper}>
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar as ImageStyle} />
            ) : (
              <View style={[styles.avatar as object, styles.avatarLetterBox]}>
                <Text style={styles.avatarLetter}>{user.username?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
            {user.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>

          {/* Stats row — tapping followers/following opens the list */}
          <View style={styles.statsRow}>
            <StatBox count={user.posts_count || 0} label="Bài viết" />
            <TouchableOpacity onPress={() => openSocialModal('followers')} activeOpacity={0.7}>
              <StatBox count={user.followers_count || 0} label="Followers" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openSocialModal('following')} activeOpacity={0.7}>
              <StatBox count={user.following_count || 0} label="Following" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioSection}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{user.username}</Text>
            {(user.scout_points ?? 0) > 0 && (
              <View style={styles.pointsBadge}>
                <Ionicons name="flame" size={12} color={COLORS.primary} />
                <Text style={styles.pointsText}>{user.scout_points} pts</Text>
              </View>
            )}
          </View>
          {(user.first_name || user.last_name) && (
            <Text style={styles.fullName}>{[user.first_name, user.last_name].filter(Boolean).join(' ')}</Text>
          )}
          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : isOwnProfile ? (
            <Text style={styles.bioPlaceholder}>Thêm bio để giới thiệu bản thân...</Text>
          ) : null}
          {(user.contributions ?? 0) > 0 && (
            <View style={styles.contributionRow}>
              <Ionicons name="location" size={13} color={COLORS.primary} />
              <Text style={styles.contributionText}>Đã đóng góp {user.contributions} địa điểm</Text>
            </View>
          )}
          {/* Badges */}
          {user.badges && user.badges.length > 0 && (
            <View style={styles.badgesRow}>
              {user.badges.map(badge => (
                <View key={badge} style={styles.badge}>
                  <Text style={styles.badgeText}>{BADGE_LABELS[badge] || badge}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!isOwnProfile ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollow}
              activeOpacity={0.8}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Đang Follow' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageBtn} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={18} color={COLORS.dark} />
              <Text style={styles.messageBtnText}>Nhắn tin</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
              <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tabBar}>
          <TabBtn active={activeTab === 'posts'} icon="grid-outline" iconActive="grid"
            onPress={() => setActiveTab('posts')} />
          {isOwnProfile && (
            <>
              <TabBtn active={activeTab === 'saved_posts'} icon="bookmark-outline" iconActive="bookmark"
                onPress={() => setActiveTab('saved_posts')} />
              <TabBtn active={activeTab === 'saved_restaurants'} icon="restaurant-outline" iconActive="restaurant"
                onPress={() => setActiveTab('saved_restaurants')} />
            </>
          )}
        </View>
      </View>
    );
  };

  // ── GRID / LIST ITEMS ─────────────────────────────────────────────────────
  const renderGridItem = ({ item, index }: { item: Post | Restaurant; index: number }) => {
    if (activeTab === 'saved_restaurants') {
      return <RestaurantCard restaurant={item as Restaurant} onOpenMap={openDirections} />;
    }
    const post = item as Post;
    return (
      <TouchableOpacity
        style={[styles.gridItem, index % 3 !== 2 && styles.gridItemMarginRight]}
        onPress={() => onPostPress?.(post)}
        activeOpacity={0.85}
      >
        {post.image_url || (post.images && post.images.length > 0) ? (
          <Image source={{ uri: post.image_url || post.images![0] }} style={styles.gridImage as ImageStyle} />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={COLORS.border} />
          </View>
        )}
        {(post.likes_count || 0) > 0 && (
          <View style={styles.gridOverlay}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Text style={styles.gridOverlayText}>{post.likes_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (tabLoading) return null;
    const messages: Record<string, { icon: any; text: string }> = {
      posts:             { icon: 'camera-outline',     text: 'Chưa có bài viết nào' },
      saved_posts:       { icon: 'bookmark-outline',   text: 'Chưa lưu bài viết nào' },
      saved_restaurants: { icon: 'restaurant-outline', text: 'Chưa lưu quán ăn nào' },
    };
    const { icon, text } = messages[activeTab];
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon} size={48} color={COLORS.border} />
        <Text style={styles.emptyText}>{text}</Text>
      </View>
    );
  };

  const numColumns = activeTab === 'saved_restaurants' ? 1 : 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navBtn} onPress={onClose}>
          <Ionicons name="chevron-back" size={26} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{user?.username || 'Hồ sơ'}</Text>
        <TouchableOpacity style={styles.navBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      {profileLoading && !user ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={getListData() as any[]}
          numColumns={numColumns}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGridItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={tabLoading ? (
            <View style={styles.tabLoadingIndicator}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ── Followers / Following Modal ── */}
      <Modal
        visible={socialModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSocialModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {socialModal === 'followers' ? 'Followers' : 'Đang theo dõi'}
            </Text>
            <TouchableOpacity onPress={() => setSocialModal(null)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
          {socialLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={socialList}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.socialRow}
                  onPress={() => {
                    setSocialModal(null);
                    onUserPress?.(String(item.id));
                  }}
                  activeOpacity={0.7}
                >
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.socialAvatar as ImageStyle} />
                  ) : (
                    <View style={[styles.socialAvatar as object, styles.avatarLetterBox]}>
                      <Text style={[styles.avatarLetter, { fontSize: 16 }]}>
                        {item.username?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.socialInfo}>
                    <Text style={styles.socialUsername}>{item.username}</Text>
                    {item.full_name ? <Text style={styles.socialFullName}>{item.full_name}</Text> : null}
                  </View>
                  <Text style={styles.socialFollowers}>
                    {(item.followers_count || 0).toLocaleString()} followers
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={COLORS.border} />
                  <Text style={styles.emptyText}>
                    {socialModal === 'followers' ? 'Chưa có followers' : 'Chưa theo dõi ai'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Badge labels ─────────────────────────────────────────────────────────────
const BADGE_LABELS: Record<string, string> = {
  pioneer:     '🌟 Pioneer',
  scout:       '🔍 Scout',
  explorer:    '🗺️ Explorer',
  trailblazer: '🏔️ Trailblazer',
  legend:      '👑 Legend',
};

const StatBox = ({ count, label }: { count: number; label: string }) => (
  <View style={styles.statBox}>
    <Text style={styles.statCount}>{count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TabBtn = ({ active, icon, iconActive, onPress }: {
  active: boolean; icon: any; iconActive: any; onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.activeTab]} activeOpacity={0.7}>
    <Ionicons name={active ? iconActive : icon} size={22} color={active ? COLORS.primary : COLORS.light} />
  </TouchableOpacity>
);

const RestaurantCard = ({ restaurant, onOpenMap }: {
  restaurant: Restaurant;
  onOpenMap: (addr: string, url?: string) => void;
}) => (
  <TouchableOpacity style={styles.resCard}
    onPress={() => onOpenMap(restaurant.address || '', restaurant.google_maps_url)}
    activeOpacity={0.8}
  >
    <Image
      source={{ uri: restaurant.image_url || restaurant.cover_image
        || (Array.isArray(restaurant.photos) ? restaurant.photos[0] : undefined) || undefined }}
      style={styles.resImg as ImageStyle}
    />
    <View style={styles.resInfo}>
      <Text style={styles.resName} numberOfLines={1}>{restaurant.name}</Text>
      {restaurant.address && <Text style={styles.resAddress} numberOfLines={1}>{restaurant.address}</Text>}
      <View style={styles.resMeta}>
        {restaurant.food_types && restaurant.food_types.length > 0 && (
          <View style={styles.resTag}>
            <Text style={styles.resTagText}>{(restaurant.food_types as string[])[0]}</Text>
          </View>
        )}
        {restaurant.rating != null && (
          <View style={styles.resRating}>
            <Ionicons name="star" size={11} color="#FFB800" />
            <Text style={styles.resRatingText}>{restaurant.rating.toFixed(1)}</Text>
          </View>
        )}
        {restaurant.price_range && <Text style={styles.resPrice}>{restaurant.price_range}</Text>}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.light} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#FFFFFF' },
  nav:                 { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  navBtn:              { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle:            { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 16, color: '#1A1A1A' },
  loadingCenter:       { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  tabLoadingIndicator: { paddingVertical: 24, alignItems: 'center' },
  headerSkeleton:      { height: 220, alignItems: 'center', justifyContent: 'center' },
  headerWrapper:       { backgroundColor: '#FFFFFF', paddingBottom: 0 },
  profileRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14 },
  avatarContainer:     { position: 'relative', marginRight: 20 },
  avatar:              { width: 86, height: 86, borderRadius: 43, backgroundColor: '#F0F0F0' },
  verifiedBadge:       { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  statsRow:            { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statBox:             { alignItems: 'center' },
  statCount:           { fontWeight: '800', fontSize: 18, color: '#1A1A1A' },
  statLabel:           { color: '#666666', fontSize: 12, marginTop: 2 },
  bioSection:          { paddingHorizontal: 16, paddingBottom: 14 },
  nameRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  username:            { fontWeight: '700', fontSize: 16, color: '#1A1A1A' },
  fullName:            { fontSize: 14, color: '#666666', marginTop: 1 },
  pointsBadge:         { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF0EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pointsText:          { fontSize: 11, fontWeight: '700', color: '#FF6B35' },
  bio:                 { fontSize: 14, color: '#1A1A1A', marginTop: 6, lineHeight: 20 },
  bioPlaceholder:      { fontSize: 13, color: '#999999', marginTop: 6, fontStyle: 'italic' },
  contributionRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  contributionText:    { fontSize: 12, color: '#FF6B35', fontWeight: '600' },
  badgesRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge:               { backgroundColor: '#FFF0EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FFD5C4' },
  badgeText:           { fontSize: 11, color: '#FF6B35', fontWeight: '600' },
  actionRow:           { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  followBtn:           { flex: 1, backgroundColor: '#FF6B35', paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  followingBtn:        { backgroundColor: '#F0F0F0' },
  followBtnText:       { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  followingBtnText:    { color: '#1A1A1A' },
  messageBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 0.6, borderWidth: 1.5, borderColor: '#F0F0F0', paddingVertical: 9, borderRadius: 10, justifyContent: 'center' },
  messageBtnText:      { fontWeight: '600', fontSize: 14, color: '#1A1A1A' },
  editBtn:             { flex: 1, borderWidth: 1.5, borderColor: '#F0F0F0', paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  editBtnText:         { fontWeight: '600', fontSize: 14, color: '#1A1A1A' },
  tabBar:              { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  tab:                 { flex: 1, alignItems: 'center', paddingVertical: 12, borderTopWidth: 2, borderTopColor: 'transparent' },
  activeTab:           { borderTopColor: '#FF6B35' },
  listContent:         { paddingBottom: 80 },
  gridItem:            { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, marginBottom: 1.5 },
  gridItemMarginRight: { marginRight: 1.5 },
  gridImage:           { width: '100%', height: '100%', backgroundColor: '#F0F0F0' },
  gridImagePlaceholder:{ width: '100%', height: '100%', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center' },
  gridOverlay:         { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridOverlayText:     { color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  resCard:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFFFFF' },
  resImg:              { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F0F0F0' },
  resInfo:             { flex: 1, marginLeft: 12, marginRight: 8 },
  resName:             { fontWeight: '700', fontSize: 15, color: '#1A1A1A' },
  resAddress:          { fontSize: 12, color: '#666666', marginTop: 2 },
  resMeta:             { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  resTag:              { backgroundColor: '#FFF0EB', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  resTagText:          { fontSize: 11, color: '#FF6B35', fontWeight: '600' },
  resRating:           { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resRatingText:       { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  resPrice:            { fontSize: 12, color: '#666666' },
  emptyContainer:      { alignItems: 'center', paddingVertical: 60 },
  emptyText:           { marginTop: 12, color: '#999999', fontSize: 14 },
  avatarLetterBox:     { backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center' },
  avatarLetter:        { color: '#fff', fontWeight: '800', fontSize: 32 },
  // Modal
  modalContainer:      { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle:          { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  modalClose:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  socialRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  socialAvatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F0' },
  socialInfo:          { flex: 1, marginLeft: 12 },
  socialUsername:      { fontWeight: '700', fontSize: 15, color: '#1A1A1A' },
  socialFullName:      { fontSize: 13, color: '#666666', marginTop: 1 },
  socialFollowers:     { fontSize: 12, color: '#999999' },
});
