import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Post } from '../../types/post';
import { COLORS } from '../../constants/theme';
import { openGoogleMaps } from '../../utils/maps';
import { CommentsModal } from './CommentsModal';
import api from '../../services/api';

export function PostCard({ post, onPressHashtag }) {
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(post.is_saved);
  const [showComments, setShowComments] = useState(false);

  /* ---------- LIKE (OPTIMISTIC) ---------- */
  const toggleLike = async () => {
    setLiked(!liked);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));

    try {
      await api.post(`/posts/${post.id}/like`);
    } catch {
      // rollback
      setLiked(liked);
      setLikes(likes);
    }
  };

  /* ---------- SAVE ---------- */
  const toggleSave = async () => {
    setSaved(!saved);
    try {
      await api.post(`/posts/${post.id}/save`);
    } catch {
      setSaved(saved);
    }
  };

  /* ---------- SHARE ---------- */
  const onShare = async () => {
    await Share.share({
      message: post.caption || 'Xem bài này nè 👀',
    });
  };

  /* ---------- MAP ---------- */
  const openMap = () => {
    if (post.restaurant) {
      openGoogleMaps({
        name: post.restaurant.name,
        address: post.restaurant.address,
        googleMapsUrl: post.restaurant.google_maps_url,
      });
    } else if (post.location) {
      openGoogleMaps(post.location);
    }
  };

  return (
    <View style={styles.card}>
      {/* USER */}
      <View style={styles.header}>
        <Image source={{ uri: post.user.avatar_url }} style={styles.avatar} />
        <Text style={styles.username}>{post.user.username}</Text>
      </View>

      {/* CAPTION */}
      {post.caption && (
        <Text style={styles.caption}>
          {post.caption.split(' ').map((word, i) =>
            word.startsWith('#') ? (
              <Text
                key={i}
                style={styles.hashtag}
                onPress={() =>
                  onPressHashtag?.(word.replace('#', ''))
                }
              >
                {word + ' '}
              </Text>
            ) : (
              word + ' '
            )
          )}
        </Text>
      )}

      {/* IMAGE */}
      {post.images?.length > 0 && (
        <Image source={{ uri: post.images[0] }} style={styles.image} />
      )}

      {/* PLACE */}
      {(post.restaurant || post.location) && (
        <TouchableOpacity style={styles.placeBox} onPress={openMap}>
          <Ionicons name="location" size={16} color={COLORS.primary} />
          <Text style={styles.placeText}>
            {post.restaurant?.name || post.location?.name}
          </Text>
          <Text style={styles.mapLink}>Mở trên Google Maps</Text>
        </TouchableOpacity>
      )}

      {/* LANDMARK */}
      {post.restaurant?.landmark_notes && (
        <Text style={styles.landmark}>
          💡 {post.restaurant.landmark_notes}
        </Text>
      )}

      {/* ACTION BAR */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? 'red' : '#333'}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-outline" size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onShare}>
          <Ionicons name="share-outline" size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleSave} style={{ marginLeft: 'auto' }}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
          />
        </TouchableOpacity>
      </View>

      {/* LIKE COUNT */}
      {likes > 0 && (
        <Text style={styles.likes}>{likes} lượt thích</Text>
      )}

      {/* COMMENTS */}
      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    marginBottom: 10,
    padding: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  username: { fontWeight: '700' },
  caption: { marginVertical: 6, fontSize: 14 },
  hashtag: { color: COLORS.primary, fontWeight: '600' },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginTop: 8,
  },
  placeBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  placeText: { fontWeight: '600', marginTop: 4 },
  mapLink: { color: COLORS.primary, fontSize: 12, marginTop: 2 },
  landmark: { fontSize: 12, color: '#666', marginTop: 6 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  likes: { marginTop: 6, fontWeight: '600' },
});
