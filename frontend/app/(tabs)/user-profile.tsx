import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, ImageStyle, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { apiService } from '../../services/Api.service'; 
import { useUserStore } from '../../store/userStore';
import { PostCard } from '../components/post-card';
import { Restaurant } from '../../types/restaurant'; 
import { Post } from '../../types/post';
import { User } from '../../types/auth';
import { COLORS } from '../../constants/theme';

interface UserProfileScreenProps {
  userId?: string | number;
  isOwnProfile?: boolean;
  onClose?: () => void;
  onPostPress?: (post: Post) => void;
}

export function UserProfileScreen({
  userId,
  isOwnProfile = false,
  onClose,
  onPostPress,
}: UserProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const currentUser = useUserStore((state) => state.user);
  
  const [user, setUser] = useState<User | null>(isOwnProfile ? currentUser : null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved_posts' | 'saved_restaurants'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOwnProfile && userId) loadUserProfile();
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (user?.id) loadTabData();
  }, [activeTab, user?.id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      if (userId) {
        const userProfile = await apiService.getUserProfile(userId);
        setUser(userProfile);
        setIsFollowing(!!userProfile.is_following);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!user?.id) return;
    try {
      const targetId = String(user.id);
      if (activeTab === 'posts' && posts.length === 0) {
        const data = await apiService.getPostsByUserId(targetId);
        setPosts(data);
      } else if (activeTab === 'saved_posts' && savedPosts.length === 0) {
        const data = await apiService.getSavedPosts();
        setSavedPosts(data);
      } else if (activeTab === 'saved_restaurants' && savedRestaurants.length === 0) {
        const data = await apiService.getSavedRestaurants();
        setSavedRestaurants(data);
      }
    } catch (error) {
      console.log('Tab Load Error:', error);
    }
  };

  const openDirections = (address: string, googleMapsUrl?: string) => {
    // Uses the Google Map link with exact address as requested [cite: 2026-01-29]
    const url = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => Alert.alert('Lỗi', 'Không thể mở bản đồ'));
  };

  const getListData = () => {
    if (activeTab === 'posts') return posts;
    if (activeTab === 'saved_posts') return savedPosts;
    return savedRestaurants;
  };

  const renderHeader = () => {
    if (!user) return null;
    return (
      <View style={styles.headerWrapper}>
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: user.avatar_url || 'https://via.placeholder.com/150' }} 
            style={styles.avatar as ImageStyle} 
          />
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{user.username}</Text>
            {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <StatBox count={user.posts_count || 0} label="Bài viết" />
          <StatBox count={user.followers_count || 0} label="Follower" />
          <StatBox count={user.following_count || 0} label="Following" />
        </View>

        {!isOwnProfile && (
          <TouchableOpacity 
            style={[styles.followBtn, isFollowing && styles.followingBtn]} 
            onPress={async () => {
              try {
                isFollowing ? await apiService.unfollowUser(user.id) : await apiService.followUser(user.id);
                setIsFollowing(!isFollowing);
              } catch { Alert.alert('Lỗi', 'Thao tác thất bại'); }
            }}
          >
            <Text style={{color: isFollowing ? '#333' : '#fff', fontWeight: '700'}}>
              {isFollowing ? 'Đang Follow' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.tabs}>
          <TabBtn active={activeTab === 'posts'} icon="grid-outline" onPress={() => setActiveTab('posts')} />
          {isOwnProfile && (
            <>
              <TabBtn active={activeTab === 'saved_posts'} icon="bookmark-outline" onPress={() => setActiveTab('saved_posts')} />
              <TabBtn active={activeTab === 'saved_restaurants'} icon="restaurant-outline" onPress={() => setActiveTab('saved_restaurants')} />
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={onClose}><Ionicons name="chevron-back" size={28} /></TouchableOpacity>
        <Text style={styles.navTitle}>{user?.username || 'Hồ sơ'}</Text>
        <TouchableOpacity><Ionicons name="ellipsis-horizontal" size={24} /></TouchableOpacity>
      </View>

      <FlatList
        // Cast to any[] to resolve the 'Post[] | Restaurant[]' union type mismatch
        data={getListData() as any[]} 
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          if (activeTab === 'saved_restaurants') {
            return <RestaurantItem restaurant={item as Restaurant} onOpenMap={openDirections} />;
          }
          // Type casting item as Post to ensure 'image_url' is correctly mapped
          return (
            <PostCard 
              post={item as Post} 
              onPress={() => onPostPress?.(item as Post)}
              onUserPress={(id) => console.log('User ID:', id)} 
            />
          );
        }}
        refreshing={loading}
        onRefresh={loadUserProfile}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Chưa có nội dung nào</Text> : null}
      />
    </View>
  );
}

// Sub-components
const StatBox = ({ count, label }: { count: number; label: string }) => (
  <View style={styles.statBox}>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TabBtn = ({ active, icon, onPress }: { active: boolean; icon: any; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.activeTabBorder]}>
    <Ionicons name={icon} size={22} color={active ? '#333' : '#ccc'} />
  </TouchableOpacity>
);

const RestaurantItem = ({ restaurant, onOpenMap }: { restaurant: Restaurant; onOpenMap: (addr: string, url?: string) => void }) => (
  <TouchableOpacity 
    style={styles.resItem} 
    onPress={() => onOpenMap(restaurant.address, restaurant.google_maps_url)}
  >
    <Image 
      source={{ uri: restaurant.photos?.[0] || 'https://via.placeholder.com/100' }} 
      style={styles.resImg} 
    />
    <View style={styles.resInfo}>
      <Text style={styles.resName}>{restaurant.name}</Text>
      <Text style={styles.resAddress} numberOfLines={1}>{restaurant.address}</Text>
      <View style={styles.resMeta}>
        {/* Fixed missing properties: category, price_display */}
        <Text style={styles.resCategory}>{restaurant.category || 'Nhà hàng'}</Text>
        {restaurant.price_display && <Text style={styles.resPrice}>• {restaurant.price_display}</Text>}
      </View>
    </View>
    <Ionicons name="map-outline" size={20} color={COLORS.primary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  navTitle: { fontWeight: 'bold', fontSize: 16 },
  headerWrapper: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  profileHeader: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, marginRight: 20, backgroundColor: '#f0f0f0' },
  profileInfo: { flex: 1 },
  username: { fontWeight: 'bold', fontSize: 20 },
  bio: { color: '#666', marginTop: 5 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  statBox: { alignItems: 'center' },
  statCount: { fontWeight: 'bold', fontSize: 16 },
  statLabel: { color: '#666', fontSize: 12 },
  followBtn: { margin: 15, backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, alignItems: 'center' },
  followingBtn: { backgroundColor: '#eee' },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', padding: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabBorder: { borderBottomColor: '#333' },
  resItem: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  resImg: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  resInfo: { flex: 1, marginLeft: 12 },
  resName: { fontWeight: 'bold', fontSize: 15 },
  resAddress: { fontSize: 12, color: '#666' },
  resMeta: { flexDirection: 'row', gap: 6, marginTop: 4 },
  resCategory: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  resPrice: { fontSize: 11, color: '#666' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});