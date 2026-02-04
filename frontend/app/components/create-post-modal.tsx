import React, { useState } from 'react';
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
  Dimensions,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import { usePostsStore } from '../../store/postsStore';
import { useToastStore } from '../../store/toastStore';
import { NewPlaceFormModal } from './create-new-place';
import api from '../../services/api';
import { COLORS } from '../../constants/theme';

const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_KEY';
const { width } = Dimensions.get('window');

export default function CreatePostModal({ visible, onClose }) {
  const { createPost } = usePostsStore();
  const { showToast } = useToastStore();

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);

  const [showNewPlace, setShowNewPlace] = useState(false);
  const [draftPlace, setDraftPlace] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const canPost =
    caption.trim().length > 0 ||
    images.length > 0 ||
    restaurant !== null ||
    location !== null;

  /* ---------- DRAFT PROTECTION ---------- */
  const confirmClose = () => {
    if (caption || images.length || restaurant || location) {
      Alert.alert(
        'Bỏ bài viết?',
        'Nội dung chưa được đăng sẽ bị mất.',
        [
          { text: 'Ở lại', style: 'cancel' },
          { text: 'Bỏ', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  /* ---------- IMAGES ---------- */
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

  /* ---------- GOOGLE PLACE ---------- */
  const onSelectPlace = async (data: any, details: any) => {
    if (!details?.geometry?.location) {
      Alert.alert('Lỗi', 'Không lấy được thông tin địa điểm');
      return;
    }

    const placeId = data.place_id;

    const locPayload = {
      google_place_id: placeId,
      name: data.structured_formatting.main_text,
      address: details.formatted_address,
      google_maps_url: details.url,
      lat: details.geometry.location.lat,
      lng: details.geometry.location.lng,
    };

    try {
      const match = await api.checkRestaurantByGooglePlaceId(placeId);

      if (match?.exists) {
        setRestaurant(match.restaurant);
        setLocation(null);
        return;
      }

      setLocation(locPayload);
      setRestaurant(null);
      setDraftPlace(locPayload);

      Alert.alert(
        'Quán mới 👀',
        'Quán này chưa có trong hệ thống. Bạn muốn thêm cho cộng đồng không?',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Thêm quán', onPress: () => setShowNewPlace(true) },
        ]
      );
    } catch {
      Alert.alert('Lỗi', 'Không kiểm tra được địa điểm');
    }
  };

  /* ---------- SUBMIT ---------- */
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
    } catch {
      Alert.alert('Lỗi', 'Không thể đăng bài');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCaption('');
    setImages([]);
    setRestaurant(null);
    setLocation(null);
    setDraftPlace(null);
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
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={[styles.post, !canPost && { opacity: 0.3 }]}>
                  Đăng
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <TextInput
              autoFocus
              placeholder="Bạn đang nghĩ gì?"
              style={styles.caption}
              multiline
              value={caption}
              onChangeText={setCaption}
            />

            <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
              <Ionicons name="images-outline" size={22} />
              <Text>Thêm ảnh</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <ScrollView horizontal pagingEnabled>
                {images.map((uri) => (
                  <View key={uri} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeImage(uri)}
                    >
                      <Ionicons name="close-circle" size={26} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <GooglePlacesAutocomplete
              placeholder="Gắn vị trí hoặc tìm quán"
              fetchDetails
              query={{ key: GOOGLE_MAPS_API_KEY, language: 'vi' }}
              onPress={onSelectPlace}
              styles={{ textInput: styles.placeInput }}
            />

            {restaurant && (
              <Text style={styles.tag}>🍜 {restaurant.name} · Quán ăn</Text>
            )}
            {!restaurant && location && (
              <Text style={styles.tag}>📍 {location.name} · Vị trí</Text>
            )}
          </ScrollView>

          <NewPlaceFormModal
            visible={showNewPlace}
            initialData={draftPlace}
            onClose={() => setShowNewPlace(false)}
            onSubmit={(data) => {
              setRestaurant(data);
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
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
  },
  title: { fontSize: 17, fontWeight: '700' },
  cancel: { color: '#666' },
  post: { color: COLORS.primary, fontWeight: '700' },
  body: { padding: 16 },
  caption: { fontSize: 16, minHeight: 60, marginBottom: 16 },
  photoBtn: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  imageWrapper: { width, height: 320, marginRight: 10 },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  placeInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  tag: { marginTop: 8, fontWeight: '600' },
});
