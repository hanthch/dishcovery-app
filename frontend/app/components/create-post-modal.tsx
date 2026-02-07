import React, { useState, useEffect } from 'react';
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

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [showNewPlace, setShowNewPlace] = useState(false);
  const [draftPlace, setDraftPlace] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Place search (searches both DB restaurants and OpenStreetMap)
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);

  const canPost =
    caption.trim().length > 0 ||
    images.length > 0 ||
    restaurant !== null ||
    location !== null;

  const reset = () => {
    setCaption('');
    setImages([]);
    setRestaurant(null);
    setLocation(null);
    setDraftPlace(null);
    setPlaceQuery('');
    setPlaceResults([]);
  };

  const confirmClose = () => {
    if (caption || images.length || restaurant || location) {
      Alert.alert('Bỏ bài viết?', 'Nội dung chưa được đăng sẽ bị mất.', [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Bỏ',
          style: 'destructive',
          onPress: () => {
            reset();
            onClose();
          },
        },
      ]);
    } else {
      onClose();
    }
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });

    if (!result.canceled) {
      setImages(result.assets.map((a) => a.uri));
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((i) => i !== uri));
  };

  // Debounced search for places
  useEffect(() => {
    if (placeQuery.trim().length < 2) {
      setPlaceResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingPlace(true);
        const results = await apiService.searchPlaces(placeQuery);
        setPlaceResults(results || []);
      } catch (error) {
        console.error('[CreatePost] Search error:', error);
        setPlaceResults([]);
      } finally {
        setSearchingPlace(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [placeQuery]);

  /**
   * Handle selecting a place from search results
   */
  const onSelectResult = (item: any) => {
    // Existing restaurant from database
    if (item.type === 'restaurant') {
      setRestaurant(item);
      setLocation(null);
      setPlaceQuery('');
      setPlaceResults([]);
      return;
    }

    // New location from OpenStreetMap
    const payload = {
      name: item.name,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
    };

    setLocation(payload);
    setRestaurant(null);
    setDraftPlace(payload);
    setPlaceQuery('');
    setPlaceResults([]);

    // Ask if user wants to add this place to the community database
    Alert.alert(
      'Địa điểm mới 👀',
      'Địa điểm này chưa có trong hệ thống. Bạn muốn thêm cho cộng đồng không?',
      [
        { 
          text: 'Để sau', 
          style: 'cancel',
          onPress: () => {
            // Just use location tag without adding to database
            console.log('[CreatePost] Using location tag only');
          }
        },
        { 
          text: 'Thêm địa điểm', 
          onPress: () => setShowNewPlace(true) 
        },
      ]
    );
  };

  /**
   * Open location in Google Maps
   */
  const openInGoogleMaps = () => {
    const selectedPlace = restaurant || location;
    if (!selectedPlace) return;

    const { lat, lng, name } = selectedPlace;
    
    if (!lat || !lng) {
      showToast('Không có tọa độ GPS để mở bản đồ');
      return;
    }

    // Get Google Maps URL (opens directions)
    const mapsUrl = apiService.getGoogleMapsDirectionsUrl(lat, lng, name);
    
    Alert.alert(
      'Mở Google Maps',
      `Xem chỉ đường đến ${name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Mở Maps', 
          onPress: () => {
            Linking.openURL(mapsUrl).catch(err => {
              console.error('[CreatePost] Error opening maps:', err);
              showToast('Không thể mở Google Maps');
            });
          }
        },
      ]
    );
  };

  const submit = async () => {
    if (!canPost || loading) return;
    setLoading(true);

    try {
      await createPost({
        caption: caption.trim() || undefined,
        images: images.length ? images : undefined,
        restaurantId: restaurant?.id,
        newRestaurant: restaurant?.isNew ? restaurant : undefined,
        location: restaurant ? undefined : location,
      });

      showToast('Đã đăng bài 🎉');
      reset();
      onClose();
    } catch (error) {
      console.error('[CreatePost] Submit error:', error);
      Alert.alert('Lỗi', 'Không thể đăng bài');
    } finally {
      setLoading(false);
    }
  };

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
              {loading ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={[styles.post, !canPost && { opacity: 0.3 }]}>
                  Đăng
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.body} 
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Caption Input */}
            <TextInput
              autoFocus
              placeholder="Bạn đang nghĩ gì?"
              style={styles.caption}
              multiline
              value={caption}
              onChangeText={setCaption}
              editable={!loading}
            />

            {/* Selected Place Tag */}
            {(restaurant || location) && (
              <View style={styles.placeTagContainer}>
                <View style={styles.placeTag}>
                  <View style={styles.placeTagLeft}>
                    <Ionicons 
                      name={restaurant ? "restaurant" : "location"} 
                      size={16} 
                      color={COLORS.primary} 
                    />
                    <Text style={styles.placeTagText}>
                      {restaurant ? restaurant.name : location.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setRestaurant(null);
                      setLocation(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Google Maps Button */}
                {((restaurant && restaurant.lat && restaurant.lng) || 
                  (location && location.lat && location.lng)) && (
                  <TouchableOpacity 
                    style={styles.mapsButton}
                    onPress={openInGoogleMaps}
                  >
                    <Ionicons name="navigate" size={16} color="#4285F4" />
                    <Text style={styles.mapsButtonText}>Chỉ đường</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Add Photos Button */}
            <TouchableOpacity 
              style={styles.photoBtn} 
              onPress={pickImages} 
              disabled={loading}
            >
              <Ionicons name="images-outline" size={22} color={COLORS.primary} />
              <Text style={styles.photoBtnText}>
                Thêm ảnh (Tối đa 10)
              </Text>
            </TouchableOpacity>

            {/* Image Preview */}
            {images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.imageScroll}
              >
                {images.map((uri) => (
                  <View key={uri} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeImage(uri)}
                    >
                      <Ionicons name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Place Search */}
            <View style={styles.searchWrapper}>
              <View style={styles.searchHeader}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.searchLabel}>Gắn vị trí</Text>
              </View>
              
              <TextInput
                placeholder="Tìm quán ăn hoặc địa điểm..."
                style={styles.placeInput}
                value={placeQuery}
                onChangeText={setPlaceQuery}
                placeholderTextColor="#999"
              />

              {searchingPlace && (
                <ActivityIndicator 
                  style={styles.searchLoader} 
                  size="small" 
                  color={COLORS.primary}
                />
              )}

              {/* Search Results */}
              {placeResults.length > 0 && (
                <View style={styles.listView}>
                  {placeResults.map((item) => (
                    <TouchableOpacity
                      key={item.type === 'restaurant' ? item.id : item.place_id}
                      style={styles.resultItem}
                      onPress={() => onSelectResult(item)}
                    >
                      <View style={styles.resultIcon}>
                        <Ionicons 
                          name={item.type === 'restaurant' ? 'restaurant' : 'location'} 
                          size={20} 
                          color={item.type === 'restaurant' ? '#FF8C42' : '#4285F4'} 
                        />
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>
                          {item.name}
                        </Text>
                        <Text style={styles.resultAddress} numberOfLines={1}>
                          {item.address}
                        </Text>
                        {item.type !== 'restaurant' && (
                          <Text style={styles.resultBadge}>Địa điểm mới</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* No Results */}
              {placeQuery.trim().length >= 2 && 
               !searchingPlace && 
               placeResults.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={40} color="#DDD" />
                  <Text style={styles.noResultsText}>
                    Không tìm thấy kết quả
                  </Text>
                  <Text style={styles.noResultsHint}>
                    Thử tìm kiếm với từ khóa khác
                  </Text>
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
            onSubmit={(data: any) => {
              setRestaurant({ ...data, isNew: true });
              setLocation(null);
              setShowNewPlace(false);
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
    alignItems: 'center',
  },
  title: { 
    fontSize: 17, 
    fontWeight: '700' 
  },
  cancel: { 
    color: '#666', 
    fontSize: 16 
  },
  post: { 
    color: COLORS.primary, 
    fontWeight: '700', 
    fontSize: 16 
  },
  body: { 
    padding: 16 
  },
  caption: { 
    fontSize: 18, 
    minHeight: 80, 
    marginBottom: 16, 
    textAlignVertical: 'top' 
  },
  
  // Place Tag Styles
  placeTagContainer: {
    marginBottom: 16,
  },
  placeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  placeTagText: { 
    color: COLORS.primary, 
    fontWeight: '600', 
    fontSize: 15,
    flex: 1,
  },
  
  // Google Maps Button
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4FD',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  mapsButtonText: {
    color: '#4285F4',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Photo Button
  photoBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  photoBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  
  // Image Preview
  imageScroll: { 
    marginBottom: 20 
  },
  imageWrapper: { 
    width: 120, 
    height: 160, 
    marginRight: 12 
  },
  image: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 8 
  },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  
  // Search Wrapper
  searchWrapper: { 
    zIndex: 1000 
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  placeInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 45,
    fontSize: 16,
  },
  searchLoader: {
    marginTop: 12,
  },
  
  // Search Results
  listView: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 13,
    color: '#666',
  },
  resultBadge: {
    fontSize: 11,
    color: '#4285F4',
    fontWeight: '600',
    marginTop: 4,
  },
  
  // No Results
  noResults: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  noResultsHint: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 6,
  },
});