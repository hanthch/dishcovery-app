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
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { usePostsStore } from '../../store/postStore';
import { NewPlaceFormModal } from './create-new-place-modal';
import { apiService } from '../../services/Api.service';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface CreatePostModalProps {
  visible:  boolean;
  onClose:  () => void;
}

export default function CreatePostModal({ visible, onClose }: CreatePostModalProps) {
  const { createPost } = usePostsStore();

  const [caption, setCaption]         = useState('');
  const [images, setImages]           = useState<string[]>([]);

  // restaurant = existing DB row (has .id UUID)
  // newRestaurantData = from NewPlaceFormModal (has .isNew=true)
  const [restaurant, setRestaurant]               = useState<any>(null);
  const [newRestaurantData, setNewRestaurantData] = useState<any>(null);
  const [location, setLocation]                   = useState<any>(null);

  const [showNewPlace, setShowNewPlace] = useState(false);
  const [draftPlace, setDraftPlace]     = useState<any>(null);
  const [loading, setLoading]           = useState(false);

  // Place search
  const [placeQuery, setPlaceQuery]         = useState('');
  const [placeResults, setPlaceResults]     = useState<any[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Post is valid if there's any content at all
  const canPost =
    caption.trim().length > 0 ||
    images.length > 0 ||
    restaurant !== null ||
    newRestaurantData !== null ||
    location !== null;

  // ── Reset ──────────────────────────────────────────────────────────────────
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
      Alert.alert('Bỏ bài viết?', 'Nội dung chưa đăng sẽ bị mất.', [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Bỏ', style: 'destructive', onPress: () => { reset(); onClose(); } },
      ]);
    } else {
      onClose();
    }
  };

  // ── Request camera roll permission + pick images ───────────────────────────
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Cần quyền truy cập',
        'Vui lòng cấp quyền truy cập thư viện ảnh trong Cài đặt.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit:          10,
      quality:                 0.85,
      mediaTypes:              ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      setImages(result.assets.map(a => a.uri));
    }
  };

  const removeImage = (uri: string) =>
    setImages(prev => prev.filter(i => i !== uri));

  // ── Debounced place search via GET /places/search ──────────────────────────
  useEffect(() => {
    if (placeQuery.trim().length < 2) {
      setPlaceResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchingPlace(true);
      try {
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

  // ── Select from search result list ─────────────────────────────────────────
  const onSelectResult = (item: any) => {
    setPlaceQuery('');
    setPlaceResults([]);

    if (item.type === 'restaurant') {
      // Existing DB restaurant → use its UUID as restaurantId
      setRestaurant(item);
      setNewRestaurantData(null);
      setLocation(null);
      return;
    }

    if (item.type === 'new_place') {
      // User wants to add a brand-new place
      setDraftPlace({ name: item.name, address: '', lat: null, lng: null });
      setShowNewPlace(true);
      return;
    }
  };

  // ── NewPlaceFormModal submitted ────────────────────────────────────────────
  const onNewPlaceSubmit = (data: any) => {
    setNewRestaurantData({ ...data, isNew: true });
    setRestaurant(null);
    setLocation(null);
    setShowNewPlace(false);
  };

  // ── User picks a duplicate suggestion inside the form ────────────────────
  const onPickExistingFromDuplicate = (item: any) => {
    setRestaurant(item);
    setNewRestaurantData(null);
    setLocation(null);
    setShowNewPlace(false);
  };

  const clearTag = () => {
    setRestaurant(null);
    setNewRestaurantData(null);
    setLocation(null);
  };

  // ── Open tagged place in Google Maps ──────────────────────────────────────
  const openInMaps = () => {
    const place = restaurant || newRestaurantData || location;
    if (!place) return;
    const { lat, lng, name } = place;
    if (!lat || !lng) {
      Alert.alert('Thông báo', 'Chưa có tọa độ GPS để mở bản đồ.');
      return;
    }
    const url = apiService.getGoogleMapsDirectionsUrl(lat, lng, name);
    Alert.alert('Mở Google Maps', `Xem chỉ đường đến ${name}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Mở Maps',
        onPress: () =>
          Linking.openURL(url).catch(() =>
            Alert.alert('Lỗi', 'Không thể mở Google Maps')
          ),
      },
    ]);
  };

  // ── Submit post ────────────────────────────────────────────────────────────
  // posts.js body shape: { caption, images, restaurantId (UUID), newRestaurant, location }
  const submit = async () => {
    if (!canPost || loading) return;
    setLoading(true);
    try {
      await createPost({
        caption:       caption.trim() || undefined,
        images:        images.length ? images : undefined,
        restaurantId:  restaurant?.id ?? undefined,          // UUID string
        newRestaurant: newRestaurantData ?? undefined,
        location:      (!restaurant && !newRestaurantData) ? location ?? undefined : undefined,
      });
      Alert.alert('Đã đăng bài 🎉', 'Bài viết của bạn đã được đăng thành công!');
      reset();
      onClose();
    } catch (err) {
      console.error('[CreatePost] submit error:', err);
      Alert.alert('Lỗi', 'Không thể đăng bài. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const taggedPlace = restaurant || newRestaurantData || location;
  const isNewPlace  = !!newRestaurantData;

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
            <TouchableOpacity
              onPress={submit}
              disabled={!canPost || loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={[styles.post, !canPost && { opacity: 0.35 }]}>Đăng</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Caption */}
            <TextInput
              style={styles.caption}
              placeholder="Chia sẻ trải nghiệm ăn uống của bạn..."
              placeholderTextColor="#BBBBBB"
              multiline
              value={caption}
              onChangeText={setCaption}
              editable={!loading}
              maxLength={2000}
            />

            {/* Character count */}
            {caption.length > 100 && (
              <Text style={styles.charCount}>{caption.length} / 2000</Text>
            )}

            {/* Tagged place chip */}
            {taggedPlace && (
              <View style={styles.placeTagContainer}>
                <View style={styles.placeTag}>
                  <View style={styles.placeTagLeft}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.placeTagText} numberOfLines={1}>
                      {taggedPlace.name}
                    </Text>
                    {isNewPlace && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>MỚI</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={clearTag} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color="#BBBBBB" />
                  </TouchableOpacity>
                </View>

                {taggedPlace.rating && (
                  <Text style={styles.placeRating}>
                    ⭐ {Number(taggedPlace.rating).toFixed(1)}
                  </Text>
                )}

                {(taggedPlace.lat && taggedPlace.lng) && (
                  <TouchableOpacity style={styles.mapsButton} onPress={openInMaps}>
                    <Ionicons name="navigate-outline" size={16} color="#4285F4" />
                    <Text style={styles.mapsButtonText}>Mở Google Maps</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Image picker button */}
            <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
              <Ionicons name="images-outline" size={22} color={COLORS.primary} />
              <Text style={styles.photoBtnText}>
                {images.length > 0 ? `${images.length} ảnh đã chọn` : 'Thêm ảnh'}
              </Text>
            </TouchableOpacity>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageScroll}
              >
                {images.map(uri => (
                  <View key={uri} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeImage(uri)}
                    >
                      <Ionicons name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Place search */}
            <View style={styles.searchWrapper}>
              <View style={styles.searchHeader}>
                <Ionicons name="location-outline" size={18} color="#555" />
                <Text style={styles.searchLabel}>Gắn địa điểm</Text>
              </View>

              <TextInput
                style={styles.placeInput}
                placeholder="Tìm tên quán ăn..."
                placeholderTextColor="#BBBBBB"
                value={placeQuery}
                onChangeText={setPlaceQuery}
                editable={!loading}
                clearButtonMode="while-editing"
              />

              {searchingPlace && (
                <ActivityIndicator
                  color={COLORS.primary}
                  style={styles.searchLoader}
                />
              )}

              {/* Results list */}
              {placeResults.length > 0 && (
                <View style={styles.listView}>
                  {/* Count hint */}
                  {placeResults.some(r => r.type === 'restaurant') && (
                    <View style={styles.listHint}>
                      <Text style={styles.listHintText}>
                        {placeResults.filter(r => r.type === 'restaurant').length} quán trong Dishcovery
                      </Text>
                    </View>
                  )}

                  {placeResults.map((item, idx) => {
                    const isNew = item.type === 'new_place';
                    return (
                      <TouchableOpacity
                        key={isNew ? `new-${idx}` : item.id}
                        style={[styles.resultItem, isNew && styles.resultItemNew]}
                        onPress={() => onSelectResult(item)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.resultIcon, isNew && styles.resultIconNew]}>
                          <Ionicons
                            name={isNew ? 'add' : 'restaurant'}
                            size={18}
                            color={isNew ? COLORS.primary : '#FF8C42'}
                          />
                        </View>
                        <View style={styles.resultInfo}>
                          {isNew ? (
                            <>
                              <Text style={styles.resultNameNew}>
                                Thêm "{item.name}" vào Dishcovery
                              </Text>
                              <Text style={styles.resultBadgeNew}>
                                +10 điểm Scout 🔥
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.resultName}>{item.name}</Text>
                              <Text style={styles.resultAddress} numberOfLines={1}>
                                {item.address}
                              </Text>
                              {item.rating != null && (
                                <Text style={styles.resultRating}>
                                  ⭐ {Number(item.rating).toFixed(1)}
                                  {item.verified ? '  ✓' : ''}
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={isNew ? COLORS.primary : '#CCC'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* No results */}
              {placeQuery.trim().length >= 2 && !searchingPlace && placeResults.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={36} color="#DDD" />
                  <Text style={styles.noResultsText}>Không tìm thấy kết quả</Text>
                  <Text style={styles.noResultsHint}>Thử từ khóa khác</Text>
                </View>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* New place form modal (nested) */}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE',
  },
  title:  { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  cancel: { fontSize: 16, color: '#666666' },
  post:   { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  body:   { flex: 1, padding: 16 },

  caption:    { fontSize: 17, minHeight: 100, marginBottom: 4, textAlignVertical: 'top', color: '#1A1A1A', lineHeight: 24 },
  charCount:  { fontSize: 11, color: '#AAAAAA', textAlign: 'right', marginBottom: 12 },

  // Tagged place
  placeTagContainer: { marginBottom: 16 },
  placeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF4ED',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD8BF',
    marginBottom: 6,
  },
  placeTagLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  placeTagText:  { color: COLORS.primary, fontWeight: '600', fontSize: 15, flex: 1 },
  newBadge:      { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText:  { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  placeRating:   { fontSize: 12, color: '#888', marginBottom: 6, paddingHorizontal: 4 },
  mapsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F4FD', padding: 10, borderRadius: 10, gap: 6,
  },
  mapsButtonText: { color: '#4285F4', fontWeight: '600', fontSize: 14 },

  // Photo picker
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 16, padding: 14,
    backgroundColor: '#F8F8F8', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  photoBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  imageScroll:  { marginBottom: 20 },
  imageWrapper: { width: 110, height: 150, marginRight: 10 },
  image:        { width: '100%', height: '100%', borderRadius: 10 },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 11, padding: 3,
  },

  // Search
  searchWrapper:  { zIndex: 1000 },
  searchHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchLabel:    { fontSize: 16, fontWeight: '600', color: '#333' },
  placeInput: {
    backgroundColor: '#F5F5F5', borderRadius: 12,
    paddingHorizontal: 14, height: 48, fontSize: 16,
    borderWidth: 1, borderColor: '#EEEEEE', color: '#1A1A1A',
  },
  searchLoader: { marginTop: 12, alignSelf: 'center' },

  // Results
  listView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  listHint: {
    backgroundColor: '#FFF8F3',
    paddingVertical: 6, paddingHorizontal: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#EEE',
  },
  listHintText: { fontSize: 12, color: '#FF8C42', fontWeight: '600' },

  resultItem:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  resultItemNew: { backgroundColor: '#FFF8F3' },
  resultIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  resultIconNew: { backgroundColor: '#FFE5D0' },
  resultInfo:    { flex: 1 },
  resultName:    { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 2 },
  resultAddress: { fontSize: 13, color: '#666' },
  resultRating:  { fontSize: 11, color: '#FF8C42', marginTop: 2 },
  resultNameNew: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  resultBadgeNew:{ fontSize: 12, color: '#888' },

  noResults:     { alignItems: 'center', padding: 32 },
  noResultsText: { fontSize: 15, fontWeight: '600', color: '#999', marginTop: 10 },
  noResultsHint: { fontSize: 13, color: '#CCC', marginTop: 4 },
});