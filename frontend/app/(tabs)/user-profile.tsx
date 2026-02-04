import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
  ImageStyle,
  TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api';
import { useUserStore } from '../../store/userStore';
import { PostCard } from '../components/PostCard';
import { User, Post, Restaurant } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, VIETNAMESE_TEXT } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface UserProfileScreenProps {
  userId?: string;
  isOwnProfile?: boolean;
  onClose?: () => void;
  onPostPress?: (post: Post) => void;
}

interface UserStoreState {
  user: User | null;
}

export function UserProfileScreen({
  userId,
  isOwnProfile = false,
  onClose,
  onPostPress,
}: UserProfileScreenProps) {
  const insets = useSafeAreaInsets();
  
  const currentUser = useUserStore((state: UserStoreState) => state.user);
  
  // States
  const [user, setUser] = useState<User | null>(isOwnProfile ? currentUser : null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved_posts' | 'saved_restaurants'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOwnProfile && userId) {
      loadUserProfile();
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (user?.id) loadTabData();
  }, [activeTab, user?.id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await apiClient.fetchUserProfile(userId!);
      setUser(userProfile);
      setIsFollowing(userProfile.isFollowing);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ người dùng');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      if (activeTab === 'posts' && posts.length === 0 && user?.id) {
        const userPosts = await apiClient.fetchUserPosts(user.id);
        setPosts(userPosts);
      } else if (activeTab === 'saved_posts' && savedPosts.length === 0) {
        const saved = await apiClient.fetchSavedPosts();
        setSavedPosts(saved);
      } else if (activeTab === 'saved_restaurants' && savedRestaurants.length === 0) {
        const saved = await apiClient.fetchSavedRestaurants();
        setSavedRestaurants(saved);
      }
    } catch (error) {
      console.log('[Profile] Tab Data Error:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) return;
    try {
      if (isFollowing) {
        await apiClient.unfollowUser(user.id);
      } else {
        await apiClient.followUser(user.id);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật theo dõi');
    }
  };

  const handleUserPress = (id: string) => {
    console.log('User pressed in profile:', id);
    // Logic to navigate to another user profile if needed
  };

  if (loading && !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return null;

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: user.avatar }} 
          style={styles.avatar as ImageStyle} 
        />
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{user.username}</Text>
            {user.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
          </View>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <StatBox count={user.postsCount} label={VIETNAMESE_TEXT.profilePosts} />
        <StatBox count={user.followersCount} label={VIETNAMESE_TEXT.followers} />
        <StatBox count={user.followingCount} label={VIETNAMESE_TEXT.following} />
      </View>

      {!isOwnProfile && (
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollow}
        >
          <Text style={[styles.followButtonText, isFollowing && { color: COLORS.text }]}>
            {isFollowing ? VIETNAMESE_TEXT.unfollow : VIETNAMESE_TEXT.follow}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.tabsContainer}>
        <TabButton 
          active={activeTab === 'posts'} 
          label={VIETNAMESE_TEXT.profilePosts} 
          icon="📸" 
          onPress={() => setActiveTab('posts')} 
        />
        {isOwnProfile && (
          <>
            <TabButton 
              active={activeTab === 'saved_posts'} 
              label={VIETNAMESE_TEXT.savedPosts} 
              icon="🔖" 
              onPress={() => setActiveTab('saved_posts')} 
            />
            <TabButton 
              active={activeTab === 'saved_restaurants'} 
              label={VIETNAMESE_TEXT.savedRestaurants} 
              icon="🍽️" 
              onPress={() => setActiveTab('saved_restaurants')} 
            />
          </>
        )}
      </View>
    </View>
  );

  const listData = activeTab === 'posts' ? posts : activeTab === 'saved_posts' ? savedPosts : savedRestaurants;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        {onClose && (
          <TouchableOpacity onPress={onClose} hitSlop={15}>
            <Text style={styles.closeIcon}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.navTitle}>{user.username}</Text>
        <TouchableOpacity><Text style={styles.moreIcon}>⋮</Text></TouchableOpacity>
      </View>

      <FlatList
        data={listData as any[]}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          activeTab === 'saved_restaurants' 
            ? <RestaurantCard restaurant={item} />
            : <PostCard 
                post={item} 
                onPostPress={onPostPress}
                onUserPress={handleUserPress}
              />
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Chưa có nội dung</Text></View>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      />
    </View>
  );
}

// Internal Components
const StatBox = ({ count, label }: { count: number; label: string }) => (
  <View style={styles.statItem}>
    <Text style={styles.statNumber}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TabButton = ({ active, label, icon, onPress }: any) => (
  <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{icon} {label}</Text>
  </TouchableOpacity>
);

const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => (
  <TouchableOpacity style={styles.restaurantItem}>
    <View style={styles.restaurantIcon}><Text style={{fontSize: 20}}>🍽️</Text></View>
    <View style={styles.restaurantInfo}>
      <Text style={styles.restaurantName}>{restaurant.name}</Text>
      <Text style={styles.restaurantAddress} numberOfLines={1}>{restaurant.address}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navTitle: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  closeIcon: { fontSize: 24, color: COLORS.text },
  moreIcon: { fontSize: 20, color: COLORS.textSecondary },
  headerWrapper: { backgroundColor: COLORS.background },
  profileHeader: { flexDirection: 'row', padding: SPACING.md },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: BORDER_RADIUS.full, 
    marginRight: SPACING.lg, 
    backgroundColor: COLORS.surface 
  },
  profileInfo: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  username: { ...TYPOGRAPHY.subtitle, fontWeight: '700', color: COLORS.text },
  verifiedBadge: { color: COLORS.info, marginLeft: 4 },
  bio: { 
    ...TYPOGRAPHY.body, 
    fontWeight: '400',
    color: COLORS.textSecondary, 
    lineHeight: 20 
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { alignItems: 'center' },
  statNumber: { ...TYPOGRAPHY.subtitle, fontWeight: '700', color: COLORS.text },
  statLabel: { 
    ...TYPOGRAPHY.caption, 
    fontWeight: '500',
    color: COLORS.textTertiary,
    marginTop: SPACING.xs 
  },
  followButton: {
    margin: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  followingButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  followButtonText: { fontWeight: '600', color: '#FFF' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabLabel: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.textTertiary },
  tabLabelActive: { color: COLORS.primary },
  restaurantItem: { flexDirection: 'row', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  restaurantIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  restaurantInfo: { flex: 1, justifyContent: 'center' },
  restaurantName: { ...TYPOGRAPHY.body, fontWeight: '600' },
  restaurantAddress: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textTertiary }
});

export default UserProfileScreen;