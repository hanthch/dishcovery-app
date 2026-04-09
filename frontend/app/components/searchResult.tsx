// ─── components/searchResult.tsx ─────────────────────────────────────────────
// Renders one search result row — post, user, or restaurant.
// Aligned with the SearchResult shape returned by GET /search (search.js)

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Matches ApiService.SearchResult (Api.service.ts)
export interface SearchResult {
  type:      'post' | 'restaurant' | 'user';
  id:        string;
  title:     string;
  subtitle?: string;
  image?:    string | null;
  landmark?: string | null;
  data:      any;   // typed per-case below
}

interface Props {
  result:            SearchResult;
  onPressPost:       (id: string) => void;
  onPressUser:       (id: string) => void;
  onPressRestaurant: (id: string) => void;
}

export default function SearchResultItem({
  result,
  onPressPost,
  onPressUser,
  onPressRestaurant,
}: Props) {

  /* ── POST ─────────────────────────────────────────────────────────────── */
  if (result.type === 'post') {
    const post = result.data;
    const imageUri = post.image_url || post.images?.[0];
    return (
      <TouchableOpacity style={s.row} onPress={() => onPressPost(post.id)} activeOpacity={0.75}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.thumb} />
        ) : (
          <View style={[s.thumb, s.thumbFallback]}>
            <Ionicons name="image-outline" size={22} color="#CCC" />
          </View>
        )}
        <View style={s.content}>
          <Text style={s.title} numberOfLines={2}>
            {post.caption || 'Bài viết'}
          </Text>
          <Text style={s.sub}>@{post.user?.username}</Text>
          {post.likes_count > 0 && (
            <Text style={s.meta}>❤️ {post.likes_count.toLocaleString('vi-VN')}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CCC" />
      </TouchableOpacity>
    );
  }

  /* ── USER ─────────────────────────────────────────────────────────────── */
  if (result.type === 'user') {
    const user = result.data;
    return (
      <TouchableOpacity style={s.row} onPress={() => onPressUser(user.id)} activeOpacity={0.75}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarChar}>{user.username?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={s.content}>
          <Text style={s.title}>@{user.username}</Text>
          {user.full_name ? (
            <Text style={s.sub}>{user.full_name}</Text>
          ) : null}
          {(user.followers_count ?? 0) > 0 && (
            <Text style={s.meta}>
              {(user.followers_count ?? 0).toLocaleString('vi-VN')} người theo dõi
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CCC" />
      </TouchableOpacity>
    );
  }

  /* ── RESTAURANT ───────────────────────────────────────────────────────── */
  if (result.type === 'restaurant') {
    const r = result.data;
    const coverUri = r.cover_image || r.photos?.[0];
    return (
      <TouchableOpacity style={s.row} onPress={() => onPressRestaurant(r.id)} activeOpacity={0.75}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={s.thumb} />
        ) : (
          <View style={[s.thumb, s.thumbFallback]}>
            <Ionicons name="storefront-outline" size={22} color="#CCC" />
          </View>
        )}
        <View style={s.content}>
          <Text style={s.title} numberOfLines={1}>{r.name}</Text>
          {r.address ? (
            <Text style={s.sub} numberOfLines={1}>{r.address}</Text>
          ) : null}
          <View style={s.restaurantMeta}>
            {r.rating != null && (
              <Text style={s.meta}>⭐ {Number(r.rating).toFixed(1)}</Text>
            )}
            {r.verified && (
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedText}>✓ Đã xác minh</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="location-outline" size={16} color="#FF8C42" />
      </TouchableOpacity>
    );
  }

  return null;
}

const s = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:  12,
    gap:              12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor:  '#FFFFFF',
  },
  thumb: {
    width: 56, height: 56,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  thumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
  },
  avatarFallback: {
    backgroundColor: '#FFF3EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarChar: { fontSize: 22, fontWeight: '700', color: '#FF8C42' },

  content: { flex: 1 },
  title:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  sub:     { fontSize: 12, color: '#666666', marginBottom: 2 },
  meta:    { fontSize: 11, color: '#AAAAAA' },

  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  verifiedBadge:  { backgroundColor: '#ECFDF5', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText:   { fontSize: 10, color: '#10B981', fontWeight: '700' },
});