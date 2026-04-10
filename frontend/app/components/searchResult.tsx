import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SearchResult } from '@/types/search';

export default function SearchResultItem({
  result,
  onPressPost,
  onPressUser,
  onPressRestaurant,
}: {
  result: SearchResult;
  onPressPost: (id: string) => void;
  onPressUser: (id: string) => void;
  onPressRestaurant: (id: string) => void;
}) {
  /* ---------- POST ---------- */
  if (result.type === 'post') {
    const post = result.data;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onPressPost(post.id)}
      >
        <Image
          source={{ uri: post.image_url || 'https://via.placeholder.com/60' }}
          style={styles.image}
        />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {post.caption || 'Bài viết'}
          </Text>
          <Text style={styles.sub}>
            @{post.user.username}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  /* ---------- USER ---------- */
  if (result.type === 'user') {
    const user = result.data;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onPressUser(user.id)}
      >
        <Image
          source={{ uri: user.avatar_url || 'https://via.placeholder.com/60' }}
          style={styles.avatar}
        />
        <View style={styles.content}>
          <Text style={styles.title}>{user.username}</Text>
          <Text style={styles.sub}>
            {user.followers_count} followers
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  /* ---------- RESTAURANT ---------- */
  if (result.type === 'restaurant') {
    const r = result.data;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onPressRestaurant(r.id)}
      >
        <Image
          source={{ uri: r.cover_image || r.photos?.[0] || 'https://via.placeholder.com/60' }}
          style={styles.image}
        />
        <View style={styles.content}>
          <Text style={styles.title}>{r.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {r.address}
          </Text>
        </View>
        <Ionicons name="location-outline" size={18} color="#999" />
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#EEE',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEE',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
