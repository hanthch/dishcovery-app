import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { usePostsStore } from '../../store/postStore';
import { useToastStore } from '../../store/toastStore';
import { NewPlaceFormModal } from './create-new-place-modal';
import { apiService } from '../../services/Api.service';
import { COLORS } from '../../constants/theme';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ visible, onClose }: CreatePostModalProps) {
  const { createPost } = usePostsStore();
  const { showToast } = useToastStore();

  const [caption, setCaption]           = useState('');
  const [images, setImages]             = useState<string[]>([]);

  // restaurant = existing DB row tagged (has .id)
  // newRestaurantData = submitted from NewPlaceFormModal (has .isNew)
  const [restaurant, setRestaurant]               = useState<any>(null);
  const [newRestaurantData, setNewRestaurantData] = useState<any>(null);
  const [location, setLocation]                   = useState<any>(null);

  const [showNewPlace, setShowNewPlace] = useState(false);
  const [draftPlace, setDraftPlace]     = useState<any>(null);
  const [loading, setLoading]           = useState(false);

  // Place search
  const [placeQuery, setPlaceQuery]       = useState('');
  const [placeResults, setPlaceResults]   = useState<any[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canPost =
    caption.trim().length > 0 ||
    images.length > 0 ||
    restaurant !== null ||
    newRestaurantData !== null ||
    location !== null;

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setCaption('');
    setImages([]);
    setRestaurant(null);
    setNewRestaurantData(null);
    setLocation(null);
    setDraftPlace(null);
    setPlaceQuery('');
    setPlaceResults([]);
  };

  const confirmClose = () => {
    if (caption || images.length || restaurant || newRestaurantData || location) {
      Alert.alert('Bỏ bài viết?', 'Nội dung chưa được đăng sẽ bị mất.', [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Bỏ', style: 'destructive', onPress: () => { reset(); onClose(); } },
      ]);
    } else {
      onClose();
    }
  };

  // ── Image picker ──────────────────────────────────────────────────────────
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (!result.canceled) setImages(result.assets.map(a => a.uri));
  };

  const removeImage = (uri: string) => setImages(prev => prev.filter(i => i !== uri));

  // ── Debounced place search → GET /places/search ───────────────────────────
  // Returns: existing restaurants (type='restaurant') + new_place sentinel last
  useEffect(() => {
    if (placeQuery.trim().length < 2) {
      setPlaceResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSearchingPlace(true);
        const results = await apiService.searchPlaces(placeQuery);
        setPlaceResults(results || []);
      } catch (err) {
        console.error('[CreatePost] searchPlaces error:', err);
        setPlaceResults([]);
      } finally {
        setSearchingPlace(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [placeQuery]);

  // ── Select from search results ────────────────────────────────────────────
  const onSelectResult = (item: any) => {
    setPlaceQuery('');
    setPlaceResults([]);

    // ── CASE 1: existing DB restaurant ─────────────────────────────────────
    if (item.type === 'restaurant') {
      setRestaurant(item);
      setNewRestaurantData(null);
      setLocation(null);
      return;
    }

    // ── CASE 2: "new_place" sentinel — open the add-new-place form ──────────
    // item.name is pre-filled with what the user typed
    if (item.type === 'new_place') {
      setDraftPlace({ name: item.name, address: '', lat: null, lng: null });
      setShowNewPlace(true);
      return;
    }
  };

  // ── NewPlaceFormModal submitted ────────────────────────────────────────────
  // data = { isNew:true, name, address, openingHours, cuisine,
  //          price_range, landmark_notes, lat, lng }
  const onNewPlaceSubmit = (data: any) => {
    setNewRestaurantData({ ...data, isNew: true });
    setRestaurant(null);
    setLocation(null);
    setShowNewPlace(false);
  };

  // ── User picks a duplicate suggestion inside NewPlaceFormModal ────────────
  // Treat it as choosing an existing restaurant
  const onPickExistingFromDuplicate = (item: any) => {
    setRestaurant(item);
    setNewRestaurantData(null);
    setLocation(null);
    setShowNewPlace(false);
  };

  // ── Clear tag ─────────────────────────────────────────────────────────────
  const clearTag = () => {
    setRestaurant(null);
    setNewRestaurantData(null);
    setLocation(null);
  };

  // ── Google Maps ───────────────────────────────────────────────────────────
  const openInGoogleMaps = () => {
    const place = restaurant || newRestaurantData || location;
    if (!place) return;
    const { lat, lng, name } = place;
    if (!lat || !lng) { showToast('Không có tọa độ GPS để mở bản đồ'); return; }
    const mapsUrl = apiService.getGoogleMapsDirectionsUrl(lat, lng, name);
    Alert.alert('Mở Google Maps', `Xem chỉ đường đến ${name}?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Mở Maps', onPress: () => Linking.openURL(mapsUrl).catch(() => showToast('Không thể mở Google Maps')) },
    ]);
  };

  // ── Submit post ───────────────────────────────────────────────────────────
  // posts.js POST /posts body shape:
  //   { caption, images, restaurantId, newRestaurant, location }
  const submit = async () => {
    if (!canPost || loading) return;
    setLoading(true);
    try {
      await createPost({
        caption:       caption.trim() || undefined,
        images:        images.length ? images : undefined,

        // Existing DB restaurant: pass its UUID string as restaurantId
        restaurantId:  restaurant?.id ?? undefined,

        // Brand-new place: pass the full object, backend calls createRestaurantFromNewPlace()
        newRestaurant: newRestaurantData ?? undefined,

        // Raw location-only tag (no DB insert)
        location:      !restaurant && !newRestaurantData ? location ?? undefined : undefined,
      });
      showToast('Đã đăng bài 🎉');
      reset();
      onClose();
    } catch (err) {
      console.error('[CreatePost] submit error:', err);
      Alert.alert('Lỗi', 'Không thể đăng bài. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const taggedPlace = restaurant || newRestaurantData || location;
  const isNewPlace  = !!newRestaurantData;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={confirmClose} disabled={loading}>
              <Text style={styles.cancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Bài viết mới</Text>
            <TouchableOpacity onPress={submit} disabled={!canPost || loading}>
              {loading
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : <Text style={[styles.post, !canPost && { opacity: 0.3 }]}>Đăng</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Caption */}
            <TextInput
              autoFocus
              placeholder="Bạn đang nghĩ gì?"
              style={styles.caption}
              multiline
              value={caption}
              onChangeText={setCaption}
              editable={!loading}
            />

            {/* ── Tagged place badge ─────────────────────────────────────── */}
            {taggedPlace && (
              <View style={styles.placeTagContainer}>
                <View style={styles.placeTag}>
                  <View style={styles.placeTagLeft}>
                    <Ionicons
                      name={restaurant ? 'restaurant' : 'location'}
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.placeTagText} numberOfLines={1}>
                      {taggedPlace.name}
                    </Text>

                    {/* "Mới" badge for user-submitted places */}
                    {isNewPlace && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>Mới ✓</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={clearTag}>
                    <Ionicons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Rating row for existing restaurants */}
                {restaurant?.rating && (
                  <Text style={styles.placeRating}>
                    ⭐ {restaurant.rating.toFixed(1)}
                    {restaurant.verified ? '  ✓ Đã xác minh' : ''}
                  </Text>
                )}

                {/* Google Maps button if coords available */}
                {(taggedPlace.lat && taggedPlace.lng) && (
                  <TouchableOpacity style={styles.mapsButton} onPress={openInGoogleMaps}>
                    <Ionicons name="navigate" size={16} color="#4285F4" />
                    <Text style={styles.mapsButtonText}>Chỉ đường</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Add photos ──────────────────────────────────────────────── */}
            <TouchableOpacity style={styles.photoBtn} onPress={pickImages} disabled={loading}>
              <Ionicons name="images-outline" size={22} color={COLORS.primary} />
              <Text style={styles.photoBtnText}>Thêm ảnh (Tối đa 10)</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                {images.map(uri => (
                  <View key={uri} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(uri)}>
                      <Ionicons name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* ── Place search ─────────────────────────────────────────────── */}
            <View style={styles.searchWrapper}>
              <View style={styles.searchHeader}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.searchLabel}>Gắn vị trí</Text>
              </View>

              <TextInput
                placeholder="Tìm quán ăn hoặc thêm địa điểm mới..."
                style={styles.placeInput}
                value={placeQuery}
                onChangeText={setPlaceQuery}
                placeholderTextColor="#999"
              />

              {searchingPlace && (
                <ActivityIndicator style={styles.searchLoader} size="small" color={COLORS.primary} />
              )}

              {/* Search results */}
              {placeResults.length > 0 && (
                <View style={styles.listView}>

                  {/* Hint row if there are existing restaurants */}
                  {placeResults.some(r => r.type === 'restaurant') && (
                    <View style={styles.listHint}>
                      <Text style={styles.listHintText}>
                        {placeResults.filter(r => r.type === 'restaurant').length} quán có trong Dishcovery
                      </Text>
                    </View>
                  )}

                  {placeResults.map((item, idx) => {
                    const isNewSentinel = item.type === 'new_place';
                    return (
                      <TouchableOpacity
                        key={isNewSentinel ? `new-${idx}` : item.id}
                        style={[styles.resultItem, isNewSentinel && styles.resultItemNew]}
                        onPress={() => onSelectResult(item)}
                      >
                        <View style={[styles.resultIcon, isNewSentinel && styles.resultIconNew]}>
                          <Ionicons
                            name={isNewSentinel ? 'add' : 'restaurant'}
                            size={20}
                            color={isNewSentinel ? COLORS.primary : '#FF8C42'}
                          />
                        </View>
                        <View style={styles.resultInfo}>
                          {isNewSentinel ? (
                            <>
                              <Text style={styles.resultNameNew}>
                                Thêm "{item.name}" vào Dishcovery
                              </Text>
                              <Text style={styles.resultBadgeNew}>
                                +10 điểm Scout 🔥 Đóng góp cho cộng đồng
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.resultName}>{item.name}</Text>
                              <Text style={styles.resultAddress} numberOfLines={1}>
                                {item.address}
                              </Text>
                              {item.rating && (
                                <Text style={styles.resultRating}>
                                  ⭐ {item.rating.toFixed(1)}
                                  {item.verified ? '  ✓' : ''}
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={isNewSentinel ? COLORS.primary : '#CCC'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* No results */}
              {placeQuery.trim().length >= 2 && !searchingPlace && placeResults.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={40} color="#DDD" />
                  <Text style={styles.noResultsText}>Không tìm thấy kết quả</Text>
                  <Text style={styles.noResultsHint}>Thử tìm kiếm với từ khóa khác</Text>
                </View>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* New Place Form Modal */}
          <NewPlaceFormModal
            visible={showNewPlace}
            initialData={draftPlace}
            onClose={() => setShowNewPlace(false)}
            onSubmit={onNewPlaceSubmit}
            onPickExisting={onPickExistingFromDuplicate}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
    alignItems: 'center',
  },
  title:  { fontSize: 17, fontWeight: '700' },
  cancel: { color: '#666', fontSize: 16 },
  post:   { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  body:   { padding: 16 },
  caption: { fontSize: 18, minHeight: 80, marginBottom: 16, textAlignVertical: 'top' },

  // ── Tagged place ──────────────────────────────────────────────────────────
  placeTagContainer: { marginBottom: 16 },
  placeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF4ED',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD8BF',
    marginBottom: 6,
  },
  placeTagLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  placeTagText: { color: COLORS.primary, fontWeight: '600', fontSize: 15, flex: 1 },
  newBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  placeRating: { fontSize: 12, color: '#888', marginBottom: 6, paddingHorizontal: 4 },

  // ── Maps button ───────────────────────────────────────────────────────────
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4FD',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  mapsButtonText: { color: '#4285F4', fontWeight: '600', fontSize: 14 },

  // ── Photos ────────────────────────────────────────────────────────────────
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  photoBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  imageScroll:  { marginBottom: 20 },
  imageWrapper: { width: 120, height: 160, marginRight: 12 },
  image:        { width: '100%', height: '100%', borderRadius: 8 },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchWrapper: { zIndex: 1000 },
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchLabel:  { fontSize: 16, fontWeight: '600', color: '#333' },
  placeInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 45,
    fontSize: 16,
  },
  searchLoader: { marginTop: 12 },

  // ── Results list ──────────────────────────────────────────────────────────
  listView: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  listHint: {
    backgroundColor: '#FFF8F3',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
  },
  listHintText: { fontSize: 12, color: '#FF8C42', fontWeight: '600' },

  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
  },
  resultItemNew: { backgroundColor: '#FFF8F3' },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultIconNew: { backgroundColor: '#FFE5D0' },
  resultInfo:    { flex: 1 },
  resultName:    { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 2 },
  resultAddress: { fontSize: 13, color: '#666' },
  resultRating:  { fontSize: 11, color: '#FF8C42', marginTop: 2 },
  resultNameNew: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  resultBadgeNew:{ fontSize: 12, color: '#888' },

  // ── No results ────────────────────────────────────────────────────────────
  noResults:     { alignItems: 'center', padding: 40, marginTop: 20 },
  noResultsText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
  noResultsHint: { fontSize: 14, color: '#CCC', marginTop: 6 },
});
