import React, { memo, useState, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Pressable, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../../types/post'; 
import { COLORS } from '../../constants/theme';
import api from '../../services/Api.service';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: (isLiked: boolean) => void;
  onComment?: (id: string) => void;
  onSave?: (isSaved: boolean) => void;
  onLocationPress?: (restaurantId: string) => void;
  onUserPress?: (userId: string) => void;
}


export const PostCard: React.FC<PostCardProps> = memo(({ 
  post, onPress, onLike, onComment, onSave, onUserPress, onLocationPress 
}) => {
  const [lastTap, setLastTap] = useState(0);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [isSaved, setIsSaved] = useState(post.is_saved || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  // High-performance double tap logic for like
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked) {
        handleLike();
      }
    } else {
      setLastTap(now);
    }
  }, [lastTap, isLiked]);

  // Proper like handler with API call
  const handleLike = useCallback(async () => {
    try {
      const newLikeState = !isLiked;
      setIsLiked(newLikeState);
      setLikesCount(newLikeState ? likesCount + 1 : likesCount - 1);
      await onLike?.(isLiked);
    } catch (err) {
      // Rollback on error
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      Alert.alert('Lỗi', 'Không thể cập nhật like');
      console.error('[PostCard] Like error:', err);
    }
  }, [isLiked, likesCount, onLike]);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      const newSaveState = !isSaved;
      setIsSaved(newSaveState);
      await onSave?.(isSaved);
    } catch (err) {
      // Rollback on error
      setIsSaved(isSaved);
      Alert.alert('Lỗi', 'Không thể cập nhật lưu');
      console.error('[PostCard] Save error:', err);
    }
  }, [isSaved, onSave]);

  // Comment handler
  const handleComment = useCallback(() => {
    onComment?.(post.id);
  }, [post.id, onComment]);

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity 
          activeOpacity={0.7}
          style={styles.userInfo} 
          onPress={() => onUserPress?.(post.user.id)}
        >
          <Image 
            source={{ uri: post.user.avatar_url || 'https://via.placeholder.com/40' }} 
            style={styles.avatar} 
          />
          <View>
            <Text style={styles.username}>{post.user.username}</Text>
            {post.restaurant && (
              <TouchableOpacity onPress={() => onLocationPress?.(post.restaurant!.id)}>
                <Text style={styles.locationText}>
                  <Ionicons name="location" size={10} color={COLORS.primary} /> {post.restaurant.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* MEDIA SECTION */}
      <Pressable onPress={handleDoubleTap} onLongPress={onPress}>
        <Image 
          source={{ uri: post.image_url || 'https://via.placeholder.com/400' }} 
          style={styles.postImage} 
          resizeMode="cover"
        />
      </Pressable>

      {/* INTERACTION SECTION */}
      <View style={styles.footer}>
        <View style={styles.interactionBar}>
          <View style={styles.leftIcons}>
            <TouchableOpacity 
              onPress={handleLike}
              hitSlop={{top: 5, bottom: 5}}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={28} 
                color={isLiked ? "#FF3B30" : "#333"} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleComment}>
              <Ionicons name="chatbubble-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="paper-plane-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleSave}>
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isSaved ? "#333" : "#333"} 
            />
          </TouchableOpacity>
        </View>

        {/* DETAILS SECTION */}
        <View style={styles.contentPadding}>
          <Text style={styles.likesCount}>
            {likesCount.toLocaleString()} lượt thích
          </Text>
          <Text style={styles.captionText} numberOfLines={3}>
            <Text style={styles.captionUsername}>{post.user.username} </Text>
            {post.caption}
          </Text>
          {post.comments_count ? (
            <TouchableOpacity onPress={handleComment}>
              <Text style={styles.viewComments}>Xem tất cả {post.comments_count} bình luận</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.timeStamp}>Vừa xong</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#F0F0F0' },
  username: { fontSize: 14, fontWeight: '700' },
  locationText: { fontSize: 11, color: '#666' },
  postImage: { width: width, height: width },
  footer: { paddingVertical: 10 },
  interactionBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 },
  leftIcons: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  contentPadding: { paddingHorizontal: 12 },
  likesCount: { fontWeight: '700', marginBottom: 4, fontSize: 14 },
  captionText: { fontSize: 14, lineHeight: 18, color: '#262626' },
  captionUsername: { fontWeight: '700' },
  viewComments: { color: '#8E8E8E', marginTop: 4, fontSize: 14 },
  timeStamp: { fontSize: 10, color: '#8E8E8E', marginTop: 6, textTransform: 'uppercase' },
});
