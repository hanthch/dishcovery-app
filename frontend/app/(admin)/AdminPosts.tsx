import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  RefreshControl, StatusBar, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/adminApi';

const C = {
  bg: '#FAFAFA', surface: '#FFFFFF', border: '#F0F0F0', divider: '#F5F5F5',
  primary: '#FF8C42', primaryLight: '#FFF3EA',
  green: '#10B981', greenSoft: '#ECFDF5',
  red: '#EF4444', redSoft: '#FEF2F2',
  yellow: '#F59E0B', yellowSoft: '#FFFBEB',
  text: '#1A1A1A', textSub: '#666666', textMuted: '#999999',
};

interface PostItem {
  id: string; caption: string | null; images: string[];
  likes_count: number; comments_count: number;
  is_trending: boolean; is_flagged?: boolean; flag_reason?: string | null;
  created_at: string;
  user: { id: string; username: string; avatar_url: string | null } | null;
  restaurant: { id: string; name: string; address: string } | null;
}

export default function AdminPosts({ navigation }: { navigation: any }) {
  const [posts, setPosts]           = useState<PostItem[]>([]);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const load = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    if (!reset && p > 1 && posts.length >= total) return;
    try {
      const res = await adminApi.getPosts({ page: p, search, flagged: flaggedOnly || undefined });
      setPosts(reset ? res.data : [...posts, ...res.data]);
      setTotal(res.pagination.total);
      setPage(p + 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [page, search, flaggedOnly, posts, total]);

  useEffect(() => { setLoading(true); setPosts([]); setPage(1); }, [search, flaggedOnly]);
  useEffect(() => { if (loading && posts.length === 0) load(true); }, [loading]);
  const onRefresh = () => { setRefreshing(true); setPosts([]); setPage(1); setLoading(true); };

  const handleDelete = (item: PostItem) => {
    Alert.alert('Delete Post', `Delete this post by @${item.user?.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminApi.deletePost(item.id);
          setPosts(p => p.filter(x => x.id !== item.id));
          setTotal(t => t - 1);
        } catch { Alert.alert('Error', 'Failed to delete post'); }
      }},
    ]);
  };

  const handleFlag = async (item: PostItem) => {
    const flag = !item.is_flagged;
    try {
      await adminApi.flagPost(item.id, flag, flag ? 'Admin flagged' : undefined);
      setPosts(p => p.map(x => x.id === item.id ? { ...x, is_flagged: flag } : x));
    } catch { Alert.alert('Error', 'Failed to update post'); }
  };

  const renderPost = ({ item }: { item: PostItem }) => {
    const img = item.images?.[0];
    return (
      <View style={[s.card, item.is_flagged && s.cardFlagged]}>
        <View style={s.cardTop}>
          {img ? (
            <Image source={{ uri: img }} style={s.thumb} />
          ) : (
            <View style={[s.thumb, s.thumbEmpty]}>
              <Ionicons name="image-outline" size={22} color={C.textMuted} />
            </View>
          )}
          <View style={s.cardInfo}>
            <Text style={s.cardUser} numberOfLines={1}>@{item.user?.username || 'unknown'}</Text>
            <Text style={s.cardCaption} numberOfLines={2}>{item.caption || '(no caption)'}</Text>
            <View style={s.cardMeta}>
              <View style={s.metaItem}>
                <Ionicons name="heart-outline" size={12} color={C.textMuted} />
                <Text style={s.metaText}>{item.likes_count}</Text>
              </View>
              <View style={s.metaItem}>
                <Ionicons name="chatbubble-outline" size={12} color={C.textMuted} />
                <Text style={s.metaText}>{item.comments_count}</Text>
              </View>
              {item.is_trending && (
                <View style={[s.tag, { backgroundColor: C.yellowSoft }]}>
                  <Text style={[s.tagText, { color: C.yellow }]}>🔥 Trending</Text>
                </View>
              )}
              {item.is_flagged && (
                <View style={[s.tag, { backgroundColor: C.redSoft }]}>
                  <Text style={[s.tagText, { color: C.red }]}>🚩 Flagged</Text>
                </View>
              )}
            </View>
            {item.restaurant && (
              <Text style={s.restaurant} numberOfLines={1}>
                <Ionicons name="storefront-outline" size={11} color={C.textMuted} /> {item.restaurant.name}
              </Text>
            )}
          </View>
        </View>

        <View style={s.cardActions}>
          <TouchableOpacity
            style={[s.actionBtn, item.is_flagged ? { backgroundColor: C.greenSoft, borderColor: C.green + '40' } : { backgroundColor: C.yellowSoft, borderColor: C.yellow + '40' }]}
            onPress={() => handleFlag(item)}
          >
            <Ionicons name={item.is_flagged ? 'flag' : 'flag-outline'} size={14} color={item.is_flagged ? C.green : C.yellow} />
            <Text style={[s.actionBtnText, { color: item.is_flagged ? C.green : C.yellow }]}>
              {item.is_flagged ? 'Unflag' : 'Flag'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: C.redSoft, borderColor: C.red + '40' }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={14} color={C.red} />
            <Text style={[s.actionBtnText, { color: C.red }]}>Delete</Text>
          </TouchableOpacity>
          <Text style={s.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.screenTitle}>Posts</Text>
          <Text style={s.screenSub}>{total.toLocaleString()} total</Text>
        </View>
      </View>

      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search captions…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {[
          { label: 'All Posts', value: false },
          { label: '🚩 Flagged', value: true },
        ].map(f => (
          <TouchableOpacity
            key={String(f.value)}
            style={[s.chip, flaggedOnly === f.value && s.chipActive]}
            onPress={() => setFlaggedOnly(f.value)}
          >
            <Text style={[s.chipText, flaggedOnly === f.value && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && posts.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={i => i.id}
          renderItem={renderPost}
          onEndReached={() => load()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={s.empty}>No posts found</Text>}
          ListFooterComponent={loading && posts.length > 0 ? <ActivityIndicator color={C.primary} style={{ padding: 20 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  screenTitle:  { fontSize: 18, fontWeight: '800', color: C.text },
  screenSub:    { fontSize: 12, color: C.textMuted, marginTop: 1 },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, marginHorizontal: 16, marginVertical: 10, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, height: 44 },
  searchInput:  { flex: 1, color: C.text, fontSize: 14 },
  filters:      { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive:   { backgroundColor: C.primary, borderColor: C.primary },
  chipText:     { color: C.textSub, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  card:         { backgroundColor: C.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  cardFlagged:  { borderColor: C.red + '40', backgroundColor: C.redSoft },
  cardTop:      { flexDirection: 'row', marginBottom: 10 },
  thumb:        { width: 68, height: 68, borderRadius: 10 },
  thumbEmpty:   { backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  cardInfo:     { flex: 1, marginLeft: 10 },
  cardUser:     { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 2 },
  cardCaption:  { fontSize: 13, color: C.text, lineHeight: 18 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:     { fontSize: 11, color: C.textSub, fontWeight: '500' },
  tag:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  tagText:      { fontSize: 10, fontWeight: '600' },
  restaurant:   { fontSize: 11, color: C.textMuted, marginTop: 4 },

  cardActions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionBtnText:{ fontSize: 12, fontWeight: '600' },
  dateText:     { fontSize: 11, color: C.textMuted, marginLeft: 'auto' },
  empty:        { color: C.textSub, textAlign: 'center', paddingTop: 60, fontSize: 15 },
});