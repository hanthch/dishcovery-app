import React, {
  memo, useState, useCallback, useMemo, useEffect, useRef,
} from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Pressable, ScrollView, Animated,
  NativeSyntheticEvent, NativeScrollEvent, Alert, Share, ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import { Post }          from '../../types/post';
import { FollowButton }  from './follow-button';
import { useUserStore }  from '../../store/userStore';
import { COLORS }        from '../../constants/theme';

const { width } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'Vừa xong';
  if (diff < 3600)   return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function isVideoUrl(uri: string): boolean {
  return uri.includes('/video/upload/') || /\.(mp4|mov|webm)($|\?)/i.test(uri);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PostVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => {
    p.loop  = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={styles.videoWrapper}>
      <VideoView
        style={styles.postImage}
        player={player}
        contentFit="cover"
        nativeControls
        allowsFullscreen
      />
      <View style={styles.videoBadge} pointerEvents="none">
        <Ionicons name="play-circle" size={18} color="#fff" />
        <Text style={styles.videoBadgeText}>VIDEO</Text>
      </View>
    </View>
  );
}

function PostMediaItem({ uri }: { uri: string }) {
  if (isVideoUrl(uri)) return <PostVideo uri={uri} />;
  return (
    <Image
      source={{ uri }}
      style={styles.postImage as ImageStyle}
      resizeMode="cover"
    />
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PostCardProps {
  post:             Post;
  currentUserId?:   string | number;
  onPress?:         () => void;
  /** called with wasLiked boolean so parent can do optimistic update */
  onLike?:          (wasLiked: boolean) => void;
  /** called with wasSaved boolean so parent can do optimistic update */
  onSave?:          (wasSaved: boolean) => void;
  onComment?:       (postId: string) => void;
  onLocationPress?: (restaurantId: string) => void;
  onUserPress?:     (userId: string) => void;
  onFollowToggle?:  (userId: string, isNowFollowing: boolean) => void;
  onReport?:        () => void;
}

// ── PostCard ──────────────────────────────────────────────────────────────────

export const PostCard: React.FC<PostCardProps> = memo(({
  post,
  currentUserId,
  onPress,
  onLike,
  onSave,
  onComment,
  onUserPress,
  onLocationPress,
  onFollowToggle,
  onReport,
}) => {
  const myId = useUserStore(s => s.user?.id);
  const resolvedCurrentUserId = currentUserId ?? myId;

  const [lastTap,         setLastTap]         = useState(0);
  const [currentIndex,    setCurrentIndex]    = useState(0);
  const [isScrolling,     setIsScrolling]     = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  // Double-tap heart animation
  const heartScale   = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const isLiked    = !!post.is_liked;
  const isSaved    = !!post.is_saved;
  const likesCount = post.likes_count ?? 0;
  const isOwnPost  = resolvedCurrentUserId
    ? String(resolvedCurrentUserId) === String(post.user?.id)
    : false;

  const mediaItems = useMemo(() => {
    if (Array.isArray(post.images) && post.images.length > 0) return post.images;
    if (post.image_url) return [post.image_url];
    return [];
  }, [post.images, post.image_url]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsScrolling(false);
  }, [post.id]);

  const animateHeart = useCallback(() => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 4 }),
      Animated.delay(600),
      Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [heartScale, heartOpacity]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked) {
        onLike?.(false);
        animateHeart();
      }
    } else {
      setLastTap(now);
    }
  }, [lastTap, isLiked, onLike, animateHeart]);

  const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
    setIsScrolling(false);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const msg = post.caption
        ? `${post.user?.username}: ${post.caption}\n\nTìm thêm trên Dishcovery 🍜`
        : `Xem bài viết của ${post.user?.username} trên Dishcovery 🍜`;
      await Share.share({ message: msg });
    } catch { /* user cancelled */ }
  }, [post]);

  const handleKebab = useCallback(() => {
    const options: any[] = [
      { text: 'Chia sẻ', onPress: handleShare },
    ];
    if (onReport) {
      options.push({
        text: 'Báo cáo bài viết',
        style: 'destructive',
        onPress: onReport,
      });
    }
    options.push({ text: 'Hủy', style: 'cancel' });
    Alert.alert('Tùy chọn', undefined, options);
  }, [handleShare, onReport]);

  return (
    <View style={styles.container}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => onUserPress?.(post.user?.id)}
          activeOpacity={0.7}
        >
          {post.user?.avatar_url
            ? <Image source={{ uri: post.user.avatar_url }} style={styles.avatar as ImageStyle} />
            : <View style={[styles.avatar as object, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {post.user?.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>}
          <View>
            <Text style={styles.username}>{post.user?.username}</Text>
            {post.restaurant && (
              <TouchableOpacity
                onPress={() => onLocationPress?.(post.restaurant!.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.locationText}>
                  <Ionicons name="location" size={10} color={COLORS.primary} />{' '}
                  {post.restaurant.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Follow button — only for other users.
              FIX: Pass onFollowToggle as the callback prop.
              ← match your FollowButton prop name here if it differs. */}
          {!isOwnPost && post.user?.id && (
            <FollowButton
              userId={post.user.id}
              myId={String(resolvedCurrentUserId ?? '')}
              size="sm"
              onFollowToggle={onFollowToggle}
            />
          )}
          <TouchableOpacity
            onPress={handleKebab}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Media ──────────────────────────────────────────────────────── */}
      {mediaItems.length > 0 && (
        <View style={styles.mediaContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => setIsScrolling(true)}
            onScrollEndDrag={() => setTimeout(() => setIsScrolling(false), 50)}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            nestedScrollEnabled
            scrollEventThrottle={16}
            directionalLockEnabled
          >
            {mediaItems.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                style={styles.mediaPage}
                onPress={() => { if (!isScrolling) handleDoubleTap(); }}
                onLongPress={() => { if (!isScrolling) onPress?.(); }}
                delayLongPress={350}
              >
                <PostMediaItem uri={uri} />
              </Pressable>
            ))}
          </ScrollView>

          {/* Double-tap heart overlay */}
          <Animated.View
            style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}
            pointerEvents="none"
          >
            <Ionicons name="heart" size={80} color="rgba(255,255,255,0.92)" />
          </Animated.View>

          {mediaItems.length > 1 && (
            <View style={styles.dotsContainer} pointerEvents="none">
              {mediaItems.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          {mediaItems.length > 1 && (
            <View style={styles.counterBadge} pointerEvents="none">
              <Text style={styles.counterText}>{currentIndex + 1}/{mediaItems.length}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.interactionBar}>
          <View style={styles.leftIcons}>
            {/* Like */}
            <TouchableOpacity
              onPress={() => onLike?.(isLiked)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={isLiked ? '#FF3B30' : '#333'}
              />
            </TouchableOpacity>
            {/* Comment */}
            <TouchableOpacity
              onPress={() => onComment?.(post.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#333" />
            </TouchableOpacity>
            {/* Share */}
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="paper-plane-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {/* Save */}
          <TouchableOpacity
            onPress={() => onSave?.(isSaved)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? COLORS.primary : '#333'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.contentPadding}>
          {likesCount > 0 && (
            <Text style={styles.likesCount}>
              {likesCount.toLocaleString('vi-VN')} lượt thích
            </Text>
          )}

          {post.caption ? (
            <Pressable onPress={() => setCaptionExpanded(x => !x)}>
              <Text
                style={styles.captionText}
                numberOfLines={captionExpanded ? undefined : 3}
              >
                <Text style={styles.captionUsername}>{post.user?.username} </Text>
                {post.caption}
              </Text>
              {!captionExpanded && post.caption.length > 100 && (
                <Text style={styles.more}>thêm</Text>
              )}
            </Pressable>
          ) : null}

          {(post.comments_count ?? 0) > 0 && (
            <TouchableOpacity onPress={() => onComment?.(post.id)} activeOpacity={0.7}>
              <Text style={styles.viewComments}>
                Xem tất cả {post.comments_count} bình luận
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.timeStamp}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { backgroundColor: '#fff', marginBottom: 12 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  userInfo:        { flexDirection: 'row', alignItems: 'center' },
  avatar:          { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#F0F0F0' },
  avatarFallback:  { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  username:        { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  locationText:    { fontSize: 11, color: '#666', marginTop: 1 },

  mediaContainer:  { position: 'relative', width, height: width, backgroundColor: '#F0F0F0' },
  mediaPage:       { width, height: width },
  postImage:       { width, height: width },
  videoWrapper:    { position: 'relative', width, height: width },
  videoBadge:      { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  videoBadgeText:  { color: '#fff', fontSize: 11, fontWeight: '700' },

  heartOverlay:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  dotsContainer:   { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot:             { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive:       { backgroundColor: '#fff', width: 8, height: 8, borderRadius: 4 },
  counterBadge:    { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  counterText:     { color: '#fff', fontSize: 12, fontWeight: '700' },

  footer:          { paddingVertical: 10 },
  interactionBar:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 },
  leftIcons:       { flexDirection: 'row', gap: 18, alignItems: 'center' },
  contentPadding:  { paddingHorizontal: 12 },
  likesCount:      { fontWeight: '700', marginBottom: 4, fontSize: 14, color: '#1A1A1A' },
  captionText:     { fontSize: 14, lineHeight: 19, color: '#262626' },
  captionUsername: { fontWeight: '700' },
  more:            { color: '#8E8E8E', fontSize: 14 },
  viewComments:    { color: '#8E8E8E', marginTop: 4, fontSize: 14 },
  timeStamp:       { fontSize: 11, color: '#8E8E8E', marginTop: 6 },
});