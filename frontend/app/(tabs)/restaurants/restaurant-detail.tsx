import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView,
  ActivityIndicator, StyleSheet, StatusBar, Modal, Alert, TextInput,
  Share, KeyboardAvoidingView, RefreshControl,
  Platform, Dimensions, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiService, { apiClient } from '../../../services/Api.service';
import { adminApi } from '../../../services/adminApi';
import {
  Restaurant, Review, LandmarkNote,
  RestaurantStackParamList,
} from '../../../types/restaurant';
import type { AdminStackParamList, AdminRestaurantUpdate } from '../../../types/admin';
import { openMaps } from '../../../utils/mapUtils';
import { useScrollFAB } from '../../navigation/MainTabs';
import { getOptimizedImageUrl } from '../../../utils/imageUtils';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

// ─── Single source of truth for rating words ─────────────────────────────────
import { RATING_WORDS } from '../../../constants/categoryConfig';

type NavProp = NativeStackNavigationProp<RestaurantStackParamList & AdminStackParamList>;
interface Props {
  navigation: NavProp;
  route: { params: { restaurantId: string; isNew?: boolean; newRestaurantData?: Restaurant } };
}

function getMimeFromUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase().split('?')[0];
  switch (ext) {
    case 'png':  return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif':  return 'image/gif';
    case 'heic': return 'image/heic';
    case 'jpg':
    case 'jpeg':
    default:     return 'image/jpeg';
  }
}

export default function RestaurantDetailScreen({ navigation, route }: Props) {
  const { restaurantId, isNew, newRestaurantData } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [restaurant,    setRestaurant]    = useState<Restaurant | null>(newRestaurantData ?? null);
  const [landmarkNotes, setLandmarkNotes] = useState<LandmarkNote[]>([]);
  const [loading,       setLoading]       = useState(!isNew);
  const [refreshing,    setRefreshing]    = useState(false);
  const [isBookmarked,  setIsBookmarked]  = useState(false);
  const [userRole,      setUserRole]      = useState<string | null>(null);
  const [showLandmarkModal,      setShowLandmarkModal]      = useState(false);
  const [showAdminPanel,         setShowAdminPanel]         = useState(false);
  const [showEditModal,          setShowEditModal]          = useState(false);
  const [showReviewModal,        setShowReviewModal]        = useState(false);
  const [showReviewActionsModal, setShowReviewActionsModal] = useState(false);
  const [selectedReview,         setSelectedReview]        = useState<Review | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [editName,    setEditName]    = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editHours,   setEditHours]   = useState('');
  const [editPrice,   setEditPrice]   = useState('');
  const [editSaving,  setEditSaving]  = useState(false);
  const [reviewRating,     setReviewRating]     = useState(0);
  const [reviewTitle,      setReviewTitle]      = useState('');
  const [reviewContent,    setReviewContent]    = useState('');
  const [reviewDishName,   setReviewDishName]   = useState('');
  const [reviewDishPrice,  setReviewDishPrice]  = useState('');
  const [reviewImages,     setReviewImages]     = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // u2500u2500u2500 Paginated reviews state u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  const [allReviews,      setAllReviews]      = useState<Review[]>([]);
  const [reviewPage,      setReviewPage]      = useState(1);
  const [reviewHasMore,   setReviewHasMore]   = useState(false);
  const [reviewTotal,     setReviewTotal]     = useState(0);
  const [reviewLoading,   setReviewLoading]   = useState(false);
  const [reviewSort,      setReviewSort]      = useState<'likes' | 'newest'>('likes');
  const [reviewsExpanded, setReviewsExpanded] = useState(false);

  const isAdmin = userRole === 'admin';
const { onTabScroll } = useScrollFAB();

  const calcDist = (revs: Review[]) => {
    const d: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    (revs || []).forEach(r => {
      const s = Math.floor(r.rating || 0);
      if (s >= 1 && s <= 5) d[s]++;
    });
    return d;
  };

  const timeAgo = (ds?: string) => {
    if (!ds) return '';
    const diff = Date.now() - new Date(ds).getTime();
    const d = Math.floor(diff / 86_400_000);
    const m = Math.floor(d / 30);
    const y = Math.floor(d / 365);
    if (y > 0) return `${y} năm trước`;
    if (m > 0) return `${m} tháng trước`;
    if (d > 0) return `${d} ngày trước`;
    return 'Hôm nay';
  };

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const stored = await apiService.getStoredUser();
        if (!cancelled && stored?.role) setUserRole(stored.role);
      } catch { /* no local cache */ }
      try {
        const live = await apiService.getCurrentUser();
        if (!cancelled && live?.role) {
          setUserRole(live.role);
          await apiService.saveUser(live);
        }
      } catch { /* offline / no token */ }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const loadRestaurant = useCallback(async (silent = false) => {
    if (isNew && newRestaurantData) return;
    try {
      if (!silent) setLoading(true);
      // GET /restaurants/:id 
      const data = await apiService.getRestaurantById(restaurantId);
      setRestaurant(data);
      setIsBookmarked(data?.is_saved || false);
      // GET /restaurants/:id/landmark-notes
      const notes = await apiService.getRestaurantLandmarkNotes(restaurantId);
      setLandmarkNotes(notes || []);
    } catch {
      if (!silent) Alert.alert('Lỗi', 'Không thể tải thông tin quán. Kiểm tra kết nối mạng nhé!');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, isNew, newRestaurantData]);

  useEffect(() => { loadRestaurant(); }, [loadRestaurant]);

  // Hide the native header — we render our own floating header inside the screen
  React.useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  // Once restaurant data is available, set the document title (used by screen readers
  // and any navigator that renders a title even with headerShown: false)
  React.useEffect(() => {
    if (restaurant?.name) {
      navigation.setOptions({ title: restaurant.name });
    }
  }, [navigation, restaurant?.name]);

  const handleRefresh = () => { setRefreshing(true); loadRestaurant(true); };

  // POST /restaurants/:id/save → INSERT into Supabase saved_restaurants
  const handleToggleBookmark = async () => {
    if (!restaurant || isNew) return;
    const next = !isBookmarked;
    setIsBookmarked(next); // optimistic
    try {
      if (next) await apiService.saveRestaurant(restaurant.id);
      else      await apiService.unsaveRestaurant(restaurant.id);
    } catch {
      setIsBookmarked(!next); // rollback
      Alert.alert('Lỗi', 'Không lưu được quán. Thử lại nhé!');
    }
  };

  // ─── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!restaurant) return;
    try {
      await Share.share({
        title:   restaurant.name,
        message: [restaurant.name, restaurant.address, restaurant.google_maps_url]
          .filter(Boolean).join('\n'),
      });
    } catch { /* user cancelled */ }
  };

  // openMaps() tries: Google Maps app → Apple Maps (iOS) → browser fallback
  const handleOpenMaps = () => {
    if (!restaurant) return;
    openMaps({
      name:          restaurant.name,
      address:       restaurant.address,
      lat:           restaurant.latitude,
      lng:           restaurant.longitude,
      googleMapsUrl: restaurant.google_maps_url,
    });
  };

  // ─── Admin: cover image upload ───────────────────────────────────────────────
  const handleCoverImageUpload = async () => {
    if (!isAdmin) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền', 'Cho phép truy cập ảnh trong Cài đặt để đổi ảnh bìa nhé!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || getMimeFromUri(asset.uri);
    const fileName = asset.fileName || `cover-${Date.now()}.${mimeType.split('/')[1]}`;

    setCoverUploading(true);
    try {
      // Upload to Cloudinary
      const uploaded = await apiService.uploadFileToCloudinary(
        { uri: asset.uri, mimeType, fileName, type: 'image' },
        { folder: 'dishcovery/restaurants' }
      );
      // Save the Cloudinary URL to Supabase via admin route
      await adminApi.updateRestaurant(restaurant!.id, {
        cover_image: uploaded.secure_url,
      } as AdminRestaurantUpdate & { cover_image?: string });

      // Update local state immediately (no reload needed)
      setRestaurant(prev =>
        prev ? { ...prev, cover_image: uploaded.secure_url, image_url: uploaded.secure_url } : prev
      );
      Alert.alert('Đã cập nhật ✓', 'Ảnh bìa mới đã được lưu!');
    } catch {
      Alert.alert('Lỗi', 'Không tải được ảnh lên. Thử lại nhé!');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleAdminEditRestaurant = () => {
    if (!restaurant) return;
    setEditName(restaurant.name || '');
    setEditAddress(restaurant.address || '');
    setEditHours(restaurant.opening_hours || '');
    setEditPrice(restaurant.price_range || '');
    setShowAdminPanel(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) { Alert.alert('Thiếu thông tin', 'Tên quán không được để trống nhé!'); return; }
    setEditSaving(true);
    try {
      await adminApi.updateRestaurant(restaurant!.id, {
        name:          editName.trim(),
        address:       editAddress.trim() || undefined,
        opening_hours: editHours.trim()   || undefined,
        price_range:   editPrice.trim()   || undefined,
      } as AdminRestaurantUpdate & { opening_hours?: string });

      setShowEditModal(false);
      await loadRestaurant(true); 
      Alert.alert('Đã lưu ✓', 'Thông tin quán đã được cập nhật!');
    } catch {
      Alert.alert('Lỗi', 'Không lưu được. Thử lại nhé!');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAdminVerifyRestaurant = () => {
    setShowAdminPanel(false);
    Alert.alert('Xác minh & kích hoạt', `Xác minh quán "${restaurant?.name}" luôn không?`, [
      { text: 'Thôi', style: 'cancel' },
      {
        text: 'Xác minh ngay',
        onPress: async () => {
          try {
            await adminApi.updateRestaurant(restaurant!.id, { status: 'active', verified: true });
            await loadRestaurant(true);
            Alert.alert('Xong rồi ✓', 'Quán đã được xác minh và kích hoạt!');
          } catch { Alert.alert('Lỗi', 'Không xác minh được. Thử lại nhé!'); }
        },
      },
    ]);
  };

  const handleAdminToggleFeatured = () => {
    setShowAdminPanel(false);
    const isV = restaurant?.verified;
    Alert.alert(
      isV ? 'Bỏ xác minh' : 'Xác minh quán',
      isV ? 'Gỡ badge xác minh của quán này?' : 'Thêm badge xác minh cho quán này?',
      [
        { text: 'Thôi', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              await adminApi.updateRestaurant(restaurant!.id, {
                verified: !isV,
                status:   !isV ? 'active' : 'pending',
              });
              await loadRestaurant(true);
            } catch { Alert.alert('Lỗi', 'Thao tác thất bại. Thử lại nhé!'); }
          },
        },
      ]
    );
  };

  const handleAdminDeleteRestaurant = () => {
    setShowAdminPanel(false);
    Alert.alert(
      'Xoá quán ăn',
      `Xoá "${restaurant?.name}" khỏi hệ thống? Không thể hoàn tác đâu nha!`,
      [
        { text: 'Thôi', style: 'cancel' },
        {
          text: 'Xoá luôn', style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteRestaurant(restaurant!.id);
              navigation.goBack();
            } catch { Alert.alert('Lỗi', 'Không xoá được. Thử lại nhé!'); }
          },
        },
      ]
    );
  };

  // ─── Review modal ─────────────────────────────────────────────────────────────
  const openReviewModal = () => {
    setReviewRating(0); setReviewTitle(''); setReviewContent('');
    setReviewDishName(''); setReviewDishPrice(''); setReviewImages([]);
    setShowReviewModal(true);
  };

  // Pick review images — handles jpg/png/webp etc.
  const handlePickReviewImages = async () => {
    const remainingSlots = 4 - reviewImages.length;

    if (remainingSlots <= 0) {
      Alert.alert('Đã đủ ảnh', 'Bạn chỉ có thể thêm tối đa 4 ảnh cho mỗi đánh giá.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền', 'Cho phép truy cập ảnh trong Cài đặt để đính kèm ảnh nhé!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const assetsToUpload = result.assets.slice(0, remainingSlots);

    if (result.assets.length > remainingSlots) {
      Alert.alert(
        'Giới hạn ảnh',
        `Bạn chỉ có thể thêm ${remainingSlots} ảnh nữa cho đánh giá này.`
      );
    }

    try {
      const uploaded = await apiService.uploadManyToCloudinary(
        assetsToUpload.map((a) => ({
          uri: a.uri,
          mimeType: a.mimeType || getMimeFromUri(a.uri),
          fileName: a.fileName || undefined,
          type: 'image' as const,
        })),
        { folder: 'dishcovery/reviews' }
      );

      setReviewImages((prev) => [...prev, ...uploaded.map((u) => u.secure_url)]);
    } catch {
      Alert.alert('Lỗi', 'Không tải được ảnh lên. Thử lại nhé!');
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0)    { Alert.alert('Chọn số sao', 'Bạn chưa chọn số sao nhé!'); return; }
    if (!reviewContent.trim()) { Alert.alert('Viết gì đó', 'Chia sẻ trải nghiệm của bạn nào!'); return; }
    setReviewSubmitting(true);
    try {
      await apiClient.post(`/restaurants/${restaurantId}/reviews`, {
        rating:     reviewRating,
        title:      reviewTitle.trim()     || undefined,
        content:    reviewContent.trim(),
        dish_name:  reviewDishName.trim()  || undefined,
        dish_price: reviewDishPrice.trim() || undefined,
        images:     reviewImages.length > 0 ? reviewImages : undefined,
      });
      setShowReviewModal(false);
      Alert.alert('Đã đăng bài viết! ', 'Cảm ơn bạn đã chia sẻ ✨ \n Đánh giá của bạn đã được ghi lại.');
      loadRestaurant(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || e?.response?.data?.error || 'Không gửi được. Thử lại nhé!');
    } finally { setReviewSubmitting(false); }
  };

  // ─── Admin: review moderation ─────────────────────────────────────────────────
  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    setShowReviewActionsModal(false);
    Alert.alert('Xoá đánh giá', 'Bạn chắc chắn chứ? Bài viết này sẽ biến mất mãi mãi đấy!', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try {
            // Reviews live in the reviews table — use the restaurant reviews endpoint,
            // NOT adminApi.deletePost() which targets the posts table.
            await apiClient.delete(`/restaurants/${restaurantId}/reviews/${selectedReview.id}`);
            loadRestaurant(true);
          } catch { Alert.alert('Lỗi', 'Không xoá được. Thử lại nhé!'); }
        },
      },
    ]);
  };

  const handleFlagReview = async () => {
    if (!selectedReview) return;
    const isFlagged = (selectedReview as any).is_flagged;
    setShowReviewActionsModal(false);
    try {
      await adminApi.flagPost(
        selectedReview.id,
        !isFlagged,
        !isFlagged ? 'Gắn cờ bởi admin' : undefined
      );
      loadRestaurant(true);
    } catch { Alert.alert('Lỗi', 'Thao tác thất bại. Thử lại nhé!'); }
  };

  // ─── User: report review ──────────────────────────────────────────────────────
  const handleReportReview = (review: Review) => {
    setShowReviewActionsModal(false);
    Alert.alert('Báo cáo đánh giá', 'Lý do báo cáo?', [
      { text: 'Spam',                   onPress: () => doReport(review.id, 'Spam') },
      { text: 'Nội dung không phù hợp', onPress: () => doReport(review.id, 'Nội dung không phù hợp') },
      { text: 'Thông tin sai lệch',     onPress: () => doReport(review.id, 'Thông tin sai lệch') },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };
  const doReport = async (reviewId: string, reason: string) => {
    try {
      await apiService.submitReport({ type: 'post', reason, post_id: reviewId });
      Alert.alert('Đã báo cáo ✓', 'Cảm ơn bạn! Chúng tôi sẽ kiểm tra sớm nhé.');
    } catch { Alert.alert('Lỗi', 'Không gửi được báo cáo. Thử lại nhé!'); }
  };

  // ─── Optimistic like toggle ────────────────────────────────────────────────────
  const handleLikeReview = async (reviewId: string) => {
    // Optimistically increment
    setRestaurant(prev => !prev ? prev : ({
      ...prev,
      top_reviews: (prev.top_reviews || []).map(r =>
        r.id === reviewId ? { ...r, likes: (r.likes || 0) + 1 } : r
      ),
    }));
    try {
      await apiClient.post(`/restaurants/${restaurantId}/reviews/${reviewId}/like`);
    } catch {
      // Rollback
      setRestaurant(prev => !prev ? prev : ({
        ...prev,
        top_reviews: (prev.top_reviews || []).map(r =>
          r.id === reviewId ? { ...r, likes: Math.max(0, (r.likes || 1) - 1) } : r
        ),
      }));
    }
  };


  // u2500u2500u2500 Paginated review loading u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  // Normalize ReviewResponse → Review so setState<Review[]> never complains
  const normalizeReview = (r: import('../../../services/Api.service').ReviewResponse): Review => ({
    id:         r.id,
    rating:     r.rating,
    title:      r.title,
    content:    r.content,
    text:       r.text ?? r.content,
    user:       r.user,
    likes:      r.likes,
    images:     r.images,
    dish_name:  r.dish_name,
    dish_price: r.dish_price != null ? String(r.dish_price) : undefined,
    created_at: r.created_at,
  });

  const loadReviews = useCallback(async (page: number, sort: 'likes' | 'newest', reset = false) => {
    setReviewLoading(true);
    try {
      const res = await apiService.getRestaurantReviews(restaurantId, page, 10, sort);
      const normalized: Review[] = res.data.map(normalizeReview);
      setAllReviews(prev => reset ? normalized : [...prev, ...normalized]);
      setReviewPage(page);
      setReviewHasMore(res.hasMore);
      setReviewTotal(res.total);
    } catch (e) {
      console.error('[ReviewLoad]', e);
    } finally {
      setReviewLoading(false);
    }
  }, [restaurantId]);

  const handleExpandReviews = useCallback(() => {
    setReviewsExpanded(true);
    loadReviews(1, reviewSort, true);
  }, [loadReviews, reviewSort]);

  const handleLoadMoreReviews = useCallback(() => {
    if (reviewLoading || !reviewHasMore) return;
    loadReviews(reviewPage + 1, reviewSort);
  }, [reviewLoading, reviewHasMore, reviewPage, reviewSort, loadReviews]);

  const handleChangeSort = useCallback((sort: 'likes' | 'newest') => {
    if (sort === reviewSort) return;
    setReviewSort(sort);
    setAllReviews([]);
    loadReviews(1, sort, true);
  }, [reviewSort, loadReviews]);

  const handleLikeReviewPaginated = async (reviewId: string) => {
    setAllReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, likes: (r.likes || 0) + 1 } : r
    ));
    try {
      await apiClient.post(`/restaurants/${restaurantId}/reviews/${reviewId}/like`);
    } catch {
      setAllReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, likes: Math.max(0, (r.likes || 1) - 1) } : r
      ));
    }
  };
  // ─── Loading / error state ─────────────────────────────────────────────────────

  if (loading || !restaurant) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={s.loadingText}>Đang tải thông tin quán...</Text>
      </View>
    );
  }

  const coverImageUrl  = restaurant.cover_image || restaurant.image_url || null;
  const reviews        = restaurant.top_reviews || [];
  const totalReviews   = restaurant.rating_count ?? 0;
  const avgRating      = restaurant.rating || 0;
  const dist           = calcDist(reviews);
  const distTotal      = Math.max(Object.values(dist).reduce((a, b) => a + b, 0), 1);
  const cuisineText    = (restaurant.food_types || restaurant.cuisine || []).join(' | ') || 'Đang cập nhật';
  const cats           = (restaurant.categories || []) as string[];
  const catText        = cats.includes('hidden-gem')  ? 'Quán Núp Hẻm'   :
                         cats.includes('street-food') ? 'Quán Vỉa Hè'    :
                         cats.includes('fancy')       ? 'Quán Sang Trọng' : '';
  const hasNoReviews   = totalReviews === 0 && reviews.length === 0;
  const isNewRestaurant = isNew || (hasNoReviews && !avgRating);

  // The header sits absolutely over the cover image.
  // We need to offset it by the real safe-area top inset so it clears
  // the Dynamic Island, notch, or Android status bar on every device.
  const headerTop = insets.top + (Platform.OS === 'android' ? 4 : 8);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[s.headerNav, { top: headerTop }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>

        <View style={s.headerRight}>
          {isAdmin && (
            <View style={s.adminIndicator}>
              <Ionicons name="shield-checkmark" size={13} color="#fff" />
              <Text style={s.adminIndicatorText}>Admin</Text>
            </View>
          )}

          {!isAdmin && (
            <>
              <TouchableOpacity onPress={handleShare} style={s.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="share-outline" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleBookmark}
                style={s.iconBtn}
                disabled={!!isNew}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={isBookmarked ? '#FF8C42' : '#333'}
                />
              </TouchableOpacity>
            </>
          )}

          {isAdmin && (
            <>
              <TouchableOpacity
                onPress={handleAdminEditRestaurant}
                style={[s.iconBtn, s.adminIconBtn]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={22} color="#FF8C42" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAdminPanel(true)}
                style={[s.iconBtn, s.adminIconBtn]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-vertical" size={22} color="#FF8C42" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF8C42"
            colors={['#FF8C42']}
          />
        }
      >
        <TouchableOpacity
          activeOpacity={isAdmin ? 0.85 : 1}
          onPress={isAdmin ? handleCoverImageUpload : undefined}
          disabled={coverUploading}
        >
          {coverImageUrl ? (
            <Image
              source={{ uri: getOptimizedImageUrl(coverImageUrl, 'detail') }}
              style={[s.coverImage, { width }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.coverImage, s.coverFallback, { width }]}>
              {isAdmin ? (
                <>
                  <View style={s.uploadCircle}>
                    <Ionicons name="camera" size={28} color="#FF8C42" />
                  </View>
                  <Text style={s.uploadPrompt}>Thêm ảnh bìa</Text>
                  <Text style={s.uploadSub}>Nhấn để chọn ảnh từ thư viện</Text>
                </>
              ) : (
                <>
                  <Ionicons name="restaurant-outline" size={48} color="#CCC" />
                  <Text style={s.noImageText}>Chưa có ảnh</Text>
                </>
              )}
            </View>
          )}

          {isAdmin && coverImageUrl && (
            <View style={s.coverEditOverlay} pointerEvents="none">
              {coverUploading ? (
                <View style={s.coverBadge}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s.coverBadgeText}>Đang tải lên...</Text>
                </View>
              ) : (
                <View style={s.coverBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                  <Text style={s.coverBadgeText}>Thay ảnh bìa</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {isAdmin && (
          <View style={[s.adminBanner, restaurant.status !== 'active' ? s.adminBannerPending : s.adminBannerActive]}>
            <Ionicons
              name={restaurant.status !== 'active' ? 'time-outline' : 'checkmark-circle-outline'}
              size={16}
              color={restaurant.status !== 'active' ? '#B45309' : '#065F46'}
            />
            <Text style={[s.adminBannerText, restaurant.status !== 'active' ? { color: '#92400E' } : { color: '#14532D' }]}>
              {restaurant.status !== 'active'
                ? `Trạng thái: ${restaurant.status ?? 'chờ xác minh'}`
                : `Đang hoạt động · ID: ${restaurantId.slice(0, 8)}`}
            </Text>
            {restaurant.status !== 'active' && (
              <TouchableOpacity onPress={handleAdminVerifyRestaurant} style={s.verifyNowBtn}>
                <Text style={s.verifyNowText}>Xác minh ngay</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={s.infoSection}>
          <View style={s.titleRow}>
            <Text style={s.restaurantName}>{restaurant.name}</Text>
            <View style={s.badgeRow}>
              {(restaurant.top_rank_this_week ?? 0) > 0 && (
                <View style={s.topBadge}>
                  <Text style={s.badgeText}>Top {restaurant.top_rank_this_week}</Text>
                </View>
              )}
              {isNew && <View style={s.newBadge}><Text style={s.badgeText}>Quán mới 🌟</Text></View>}
              {restaurant.verified && (
                <View style={s.verifiedBadgePill}>
                  <Ionicons name="checkmark-circle" size={10} color="#fff" />
                  <Text style={s.badgeText}>Xác minh</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={s.subtitle}>{cuisineText}{catText ? ` · ${catText}` : ''}</Text>

          <TouchableOpacity style={s.addressRow} onPress={handleOpenMaps}>
            <Ionicons name="location" size={18} color="#4A90E2" />
            <Text style={s.addressText}>{restaurant.address || 'Đang cập nhật địa chỉ'}</Text>
            <Text style={s.mapsLink}>Chỉ đường</Text>
          </TouchableOpacity>

          {/* Hours */}
          {restaurant.opening_hours && (
            <View style={s.infoRow}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={s.infoText}>{restaurant.opening_hours}</Text>
            </View>
          )}

          {restaurant.price_range && (
            <View style={s.infoRow}>
              <Text style={s.priceSymbol}>₫₫</Text>
              <Text style={s.infoText}>{restaurant.price_range}</Text>
            </View>
          )}

          {isAdmin && (
            <View style={s.statsRow}>
              {[
                { value: totalReviews,                               label: 'Đánh giá' },
                { value: restaurant.posts_count ?? 0,                label: 'Bài viết'  },
                { value: avgRating > 0 ? avgRating.toFixed(1) : '—', label: 'Điểm TB'  },
                { value: (restaurant as any).saves_count ?? 0,       label: 'Lưu'       },
              ].map((item, i, arr) => (
                <React.Fragment key={i}>
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{item.value}</Text>
                    <Text style={s.statLabel}>{item.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={s.statDivider} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {landmarkNotes.length > 0 && (
          <TouchableOpacity style={s.landmarkBtn} onPress={() => setShowLandmarkModal(true)}>
            <Ionicons name="compass" size={20} color="#FF8C42" />
            <Text style={s.landmarkBtnText}>Hướng dẫn cách đi ({landmarkNotes.length})</Text>
            <Ionicons name="chevron-forward" size={20} color="#FF8C42" />
          </TouchableOpacity>
        )}

        {isAdmin && (
          <View style={s.adminActionBar}>
            <Text style={s.adminBarLabel}>Quản lý quán</Text>
            <View style={s.adminBtns}>
              <TouchableOpacity style={s.adminBtn} onPress={handleAdminEditRestaurant}>
                <View style={[s.adminBtnIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="create-outline" size={18} color="#4F46E5" />
                </View>
                <Text style={s.adminBtnText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.adminBtn} onPress={handleAdminToggleFeatured}>
                <View style={[s.adminBtnIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons
                    name={restaurant.verified ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={18} color="#D97706"
                  />
                </View>
                <Text style={s.adminBtnText}>{restaurant.verified ? 'Bỏ xác minh' : 'Xác minh'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.adminBtn} onPress={() => setShowLandmarkModal(true)}>
                <View style={[s.adminBtnIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="compass-outline" size={18} color="#16A34A" />
                </View>
                <Text style={s.adminBtnText}>Ghi chú</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.adminBtn} onPress={handleAdminDeleteRestaurant}>
                <View style={[s.adminBtnIcon, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="trash-outline" size={18} color="#E11D48" />
                </View>
                <Text style={[s.adminBtnText, { color: '#E11D48' }]}>Xoá quán</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.reviewsSection}>
          <View style={s.reviewsHeader}>
            <Text style={s.sectionTitle}>Đánh giá</Text>
            <Text style={s.reviewCountText}>({totalReviews.toLocaleString('vi-VN')})</Text>

            {!isNew && (
              <TouchableOpacity style={s.addReviewBtn} onPress={openReviewModal}>
                <Ionicons name="star-outline" size={13} color="#FF8C42" />
                <Text style={s.addReviewText}> + Đánh giá</Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity
                style={s.adminManageBtn}
                onPress={() => {
                  try {
                    (navigation as any).navigate('AdminApp', {
                      screen: 'AdminRestaurants',
                      params: { status: undefined },
                    });
                  } catch {
                    // AdminApp may live in a different navigator — navigate by screen name directly
                    (navigation as any).navigate('AdminRestaurants', { status: undefined });
                  }
                }}
              >
                <Ionicons name="shield-outline" size={13} color="#FF8C42" />
                <Text style={s.adminManageBtnText}>Quản lý</Text>
              </TouchableOpacity>
            )}
          </View>

          {isNewRestaurant ? (
            <View style={s.emptyState}>
              <Ionicons name="chatbubbles-outline" size={52} color="#DDD" />
              <Text style={s.emptyTitle}>Chưa có đánh giá nào</Text>
              <Text style={s.emptySub}>
                {isAdmin
                  ? 'Người dùng sẽ đánh giá sau khi quán được xác minh.'
                  : 'Quán vừa được thêm vào Dishcovery.\nHãy là người đầu tiên đánh giá! 🌟'}
              </Text>
              {!isAdmin && (
                <TouchableOpacity
                  style={[s.firstReviewBtn, isNew && s.firstReviewBtnDisabled]}
                  disabled={!!isNew}
                  onPress={() => !isNew && openReviewModal()}
                >
                  <Ionicons name="star-outline" size={15} color="#fff" />
                  <Text style={s.firstReviewBtnText}>
                    {isNew ? 'Đang chờ xác minh...' : 'Viết đánh giá đầu tiên'}
                  </Text>
                </TouchableOpacity>
              )}
              {(restaurant.posts_count ?? 0) > 0 && (
                <View style={s.postsHint}>
                  <Ionicons name="images-outline" size={13} color="#888" />
                  <Text style={s.postsHintText}>{restaurant.posts_count} bài viết đề cập quán này</Text>
                </View>
              )}
            </View>

          ) : (
            <>
              <View style={s.ratingSummary}>
                <View style={s.bigRatingWrap}>
                  <Text style={s.bigRating}>{avgRating.toFixed(1)}</Text>
                  <View style={s.starRow}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons key={i} name="star" size={14}
                        color={i <= Math.round(avgRating) ? '#FFD700' : '#DDD'} />
                    ))}
                  </View>
                  <Text style={s.ratingCountText}>{totalReviews.toLocaleString('vi-VN')} đánh giá</Text>
                </View>
                <View style={s.ratingBars}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const cnt = dist[star] || 0;
                    const pct = (cnt / distTotal) * 100;
                    return (
                      <View key={star} style={s.barRow}>
                        <Text style={s.barLabel}>{star}</Text>
                        <Ionicons name="star" size={10} color="#FFD700" />
                        <View style={s.barBg}>
                          <View style={[s.barFill, { width: `${pct}%` as any }]} />
                        </View>
                        {isAdmin && <Text style={s.barCount}>{cnt}</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>

              {reviews.length > 0 ? (
                <>
                  {reviews.map((review, idx) => (
                    <View
                      key={review.id || idx}
                      style={[
                        s.reviewCard,
                        isAdmin && (review as any).is_flagged && s.reviewCardFlagged,
                      ]}
                    >
                      {isAdmin && (review as any).is_flagged && (
                        <View style={s.flagBanner}>
                          <Ionicons name="flag" size={12} color="#DC2626" />
                          <Text style={s.flagBannerText}>Đã gắn cờ · Cần kiểm tra</Text>
                        </View>
                      )}

                      <View style={s.reviewHeader}>
                        {review.user?.avatar_url ? (
                          <Image
                            source={{ uri: review.user.avatar_url }}
                            style={s.avatar}
                          />
                        ) : (
                          <View style={[s.avatar, s.avatarFallback]}>
                            <Text style={s.avatarLetter}>
                              {review.user?.username?.[0]?.toUpperCase() || '?'}
                            </Text>
                          </View>
                        )}

                        <View style={s.reviewMeta}>
                          <View style={s.reviewNameRow}>
                            <Text style={s.reviewUsername}>{review.user?.username || 'Ẩn danh'}</Text>
                            {isAdmin && review.user?.id && (
                              <Text style={s.reviewUserId}>· {review.user.id.slice(0, 8)}</Text>
                            )}
                          </View>
                          <View style={s.reviewStarRow}>
                            {[1, 2, 3, 4, 5].map(st => (
                              <Ionicons key={st} name="star" size={12}
                                color={st <= (review.rating || 0) ? '#FFD700' : '#EEE'} />
                            ))}
                            <Text style={s.reviewTimeText}>{timeAgo(review.created_at)}</Text>
                          </View>
                        </View>

                        {/* Options — both admin (flag/delete) and user (report) */}
                        <TouchableOpacity
                          style={isAdmin ? s.adminMenuBtn : s.userMenuBtn}
                          onPress={() => { setSelectedReview(review); setShowReviewActionsModal(true); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={18} color={isAdmin ? '#FF8C42' : '#999'} />
                        </TouchableOpacity>
                      </View>

                      {review.title && <Text style={s.reviewTitle}>{review.title}</Text>}
                      <Text style={s.reviewBody}>{review.content || review.text || 'Không có nội dung'}</Text>

                      {review.images && review.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.reviewImgScroll}>
                          {review.images.map((img, i) => (
                            <Image key={i} source={{ uri: img }} style={s.reviewImg} />
                          ))}
                        </ScrollView>
                      )}

                      {review.dish_name && (
                        <View style={s.dishTag}>
                          <Text style={s.dishLabel}>🍽 {review.dish_name}</Text>
                          {review.dish_price && <Text style={s.dishPrice}>₫ {review.dish_price}</Text>}
                        </View>
                      )}

                      {/* Like button — users only */}
                      {!isAdmin && (
                        <TouchableOpacity
                          style={s.likeBtn}
                          onPress={() => handleLikeReview(review.id)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Ionicons name="thumbs-up-outline" size={14} color="#999" />
                          <Text style={s.likeBtnText}>
                            Hữu ích{(review.likes || 0) > 0 ? ` · ${review.likes}` : ''}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* ── "Xem thêm đánh giá" expandable section ── */}
                  {!reviewsExpanded && totalReviews > reviews.length && (
                    <TouchableOpacity style={s.seeMoreBtn} onPress={handleExpandReviews} activeOpacity={0.8}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
                      <Text style={s.seeMoreBtnText}>
                        Xem tất cả {totalReviews.toLocaleString('vi-VN')} đánh giá
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}

                  {/* ── Expanded paginated reviews ── */}
                  {reviewsExpanded && (
                    <View style={s.expandedReviews}>
                      {/* Sort toggle */}
                      <View style={s.sortRow}>
                        <Text style={s.sortLabel}>Sắp xếp theo:</Text>
                        <TouchableOpacity
                          style={[s.sortChip, reviewSort === 'likes' && s.sortChipActive]}
                          onPress={() => handleChangeSort('likes')}
                        >
                          <Ionicons name="thumbs-up-outline" size={13} color={reviewSort === 'likes' ? COLORS.primary : COLORS.textTertiary} />
                          <Text style={[s.sortChipText, reviewSort === 'likes' && s.sortChipTextActive]}>Hữu ích</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.sortChip, reviewSort === 'newest' && s.sortChipActive]}
                          onPress={() => handleChangeSort('newest')}
                        >
                          <Ionicons name="time-outline" size={13} color={reviewSort === 'newest' ? COLORS.primary : COLORS.textTertiary} />
                          <Text style={[s.sortChipText, reviewSort === 'newest' && s.sortChipTextActive]}>Mới nhất</Text>
                        </TouchableOpacity>
                        <Text style={s.sortTotal}>{reviewTotal.toLocaleString('vi-VN')} đánh giá</Text>
                      </View>

                      {/* Paginated review cards */}
                      {allReviews.map((review, idx) => (
                        <View
                          key={review.id || `pg-${idx}`}
                          style={[
                            s.reviewCard,
                            isAdmin && (review as any).is_flagged && s.reviewCardFlagged,
                          ]}
                        >
                          {isAdmin && (review as any).is_flagged && (
                            <View style={s.flagBanner}>
                              <Ionicons name="flag" size={12} color="#DC2626" />
                              <Text style={s.flagBannerText}>Đã gắn cờ · Cần kiểm tra</Text>
                            </View>
                          )}
                          <View style={s.reviewHeader}>
                            {review.user?.avatar_url ? (
                              <Image source={{ uri: review.user.avatar_url }} style={s.avatar} />
                            ) : (
                              <View style={[s.avatar, s.avatarFallback]}>
                                <Text style={s.avatarLetter}>
                                  {review.user?.username?.[0]?.toUpperCase() || '?'}
                                </Text>
                              </View>
                            )}
                            <View style={s.reviewMeta}>
                              <View style={s.reviewNameRow}>
                                <Text style={s.reviewUsername}>{review.user?.username || 'Ẩn danh'}</Text>
                              </View>
                              <View style={s.reviewStarRow}>
                                {[1,2,3,4,5].map(st => (
                                  <Ionicons key={st} name="star" size={12}
                                    color={st <= (review.rating || 0) ? '#FFD700' : '#EEE'} />
                                ))}
                                <Text style={s.reviewTimeText}>{timeAgo(review.created_at)}</Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={isAdmin ? s.adminMenuBtn : s.userMenuBtn}
                              onPress={() => { setSelectedReview(review); setShowReviewActionsModal(true); }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="ellipsis-horizontal" size={18} color={isAdmin ? COLORS.primary : '#999'} />
                            </TouchableOpacity>
                          </View>

                          {review.title && <Text style={s.reviewTitle}>{review.title}</Text>}
                          <Text style={s.reviewBody}>{review.content || review.text || ''}</Text>

                          {review.images && review.images.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.reviewImgScroll}>
                              {review.images.map((img: string, i: number) => (
                                <Image key={i} source={{ uri: img }} style={s.reviewImg} />
                              ))}
                            </ScrollView>
                          )}

                          {review.dish_name && (
                            <View style={s.dishTag}>
                              <Text style={s.dishLabel}>🍽 {review.dish_name}</Text>
                              {review.dish_price && <Text style={s.dishPrice}>₫ {review.dish_price}</Text>}
                            </View>
                          )}

                          <TouchableOpacity
                            style={s.likeBtn}
                            onPress={() => handleLikeReviewPaginated(review.id)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons name="thumbs-up-outline" size={14} color="#999" />
                            <Text style={s.likeBtnText}>
                              Hữu ích{(review.likes || 0) > 0 ? ` · ${review.likes}` : ''}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Load more / loading spinner */}
                      {reviewLoading && (
                        <View style={s.reviewLoadingRow}>
                          <ActivityIndicator size="small" color={COLORS.primary} />
                          <Text style={s.reviewLoadingText}>Đang tải thêm đánh giá...</Text>
                        </View>
                      )}

                      {!reviewLoading && reviewHasMore && (
                        <TouchableOpacity style={s.loadMoreBtn} onPress={handleLoadMoreReviews} activeOpacity={0.8}>
                          <Text style={s.loadMoreBtnText}>Xem thêm đánh giá</Text>
                          <Ionicons name="chevron-down" size={15} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}

                      {!reviewLoading && !reviewHasMore && allReviews.length > 0 && (
                        <View style={s.allLoadedRow}>
                          <View style={s.allLoadedLine} />
                          <Text style={s.allLoadedText}>Đã xem tất cả {allReviews.length} đánh giá</Text>
                          <View style={s.allLoadedLine} />
                        </View>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View style={s.emptyState}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color="#DDD" />
                  <Text style={s.emptyTitle}>Không tải được đánh giá</Text>
                  <Text style={s.emptySub}>Kéo xuống để thử lại</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: isAdmin ? 160 : 100 }} />
      </ScrollView>


      <Modal visible={showLandmarkModal} animationType="slide" transparent onRequestClose={() => setShowLandmarkModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Hướng dẫn đường đi</Text>
              <TouchableOpacity onPress={() => setShowLandmarkModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {restaurant.address ? (
              <View style={s.addressBox}>
                <Ionicons name="location" size={18} color="#4A90E2" />
                <Text style={s.addressBoxText}>{restaurant.address}</Text>
              </View>
            ) : null}
            <ScrollView style={{ maxHeight: 320 }}>
              {landmarkNotes.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="compass-outline" size={40} color="#DDD" />
                  <Text style={s.emptyTitle}>Chưa có ghi chú nào</Text>
                </View>
              ) : (
                <>
                  <Text style={s.notesLabel}>Ghi chú ({landmarkNotes.length}):</Text>
                  {landmarkNotes.map((note, i) => (
                    <View key={note.id || i} style={s.noteCard}>
                      {note.verified && (
                        <View style={s.noteVerified}>
                          <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                          <Text style={s.noteVerifiedText}>Đã xác minh</Text>
                        </View>
                      )}
                      <Text style={s.noteText}>{note.text}</Text>
                      {note.user && (
                        <View style={s.noteAuthorRow}>
                          {note.user.avatar_url
                            ? <Image source={{ uri: note.user.avatar_url }} style={s.noteAvatar} />
                            : <View style={[s.noteAvatar, s.avatarFallbackSm]}>
                                <Text style={s.avatarLetterSm}>{note.user.username?.[0]?.toUpperCase()}</Text>
                              </View>
                          }
                          <Text style={s.noteAuthor}>{note.user.username}</Text>
                        </View>
                      )}
                      {(note.helpful_count ?? 0) > 0 && (
                        <Text style={s.helpfulText}>👍 {note.helpful_count} người thấy hữu ích</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => { setShowLandmarkModal(false); handleOpenMaps(); }}
            >
              <Text style={s.primaryBtnText}>Mở Google Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isAdmin && (
        <Modal visible={showAdminPanel} animationType="slide" transparent onRequestClose={() => setShowAdminPanel(false)}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="shield-checkmark" size={18} color="#FF8C42" />
                  <Text style={s.sheetTitle}>Tùy chọn Admin</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAdminPanel(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <Text style={s.adminSheetSubtitle}>{restaurant.name}</Text>
              {[
                { icon: 'create-outline', label: 'Chỉnh sửa thông tin', sub: 'Tên, địa chỉ, giờ, giá — Maps URL tự cập nhật', color: '#4F46E5', bg: '#EEF2FF', fn: handleAdminEditRestaurant },
                { icon: restaurant.verified ? 'checkmark-circle' : 'checkmark-circle-outline',
                  label: restaurant.verified ? 'Bỏ xác minh' : 'Xác minh quán',
                  sub: restaurant.verified ? 'Gỡ badge xác minh' : 'Thêm badge xác minh',
                  color: '#D97706', bg: '#FFFBEB', fn: handleAdminToggleFeatured },
                { icon: 'flash-outline', label: 'Kích hoạt ngay', sub: 'Đặt status = active', color: '#16A34A', bg: '#F0FDF4', fn: handleAdminVerifyRestaurant },
                { icon: 'compass-outline', label: 'Ghi chú đường đi', sub: `${landmarkNotes.length} ghi chú`, color: '#0891B2', bg: '#ECFEFF', fn: () => { setShowAdminPanel(false); setShowLandmarkModal(true); } },
                { icon: 'trash-outline', label: 'Xoá quán khỏi hệ thống', sub: 'Không thể hoàn tác', color: '#E11D48', bg: '#FFF1F2', fn: handleAdminDeleteRestaurant },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={s.optionRow} onPress={item.fn}>
                  <View style={[s.optionIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, { color: item.color }]}>{item.label}</Text>
                    <Text style={s.optionSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CCC" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      )}

      {isAdmin && (
        <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
            <View style={[s.sheet, { maxHeight: '88%' }]}>
              <View style={s.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="create-outline" size={18} color="#4F46E5" />
                  <Text style={s.sheetTitle}>Chỉnh sửa quán</Text>
                </View>
                <TouchableOpacity onPress={() => setShowEditModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Tên quán *',  value: editName,    set: setEditName,    placeholder: 'Tên quán ăn',           multi: false, max: 100 },
                  { label: 'Địa chỉ',     value: editAddress, set: setEditAddress, placeholder: 'Địa chỉ đầy đủ',        multi: true,  max: 200 },
                  { label: 'Giờ mở cửa',  value: editHours,   set: setEditHours,   placeholder: 'Ví dụ: 7:00 – 22:00',   multi: false, max: 80  },
                  { label: 'Khoảng giá',  value: editPrice,   set: setEditPrice,   placeholder: 'Ví dụ: 30k – 80k / người', multi: false, max: 80 },
                ].map((f, i) => (
                  <View key={i}>
                    <Text style={s.inputLabel}>{f.label}</Text>
                    <TextInput
                      style={[s.inputField, f.multi && { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
                      value={f.value}
                      onChangeText={f.set}
                      placeholder={f.placeholder}
                      placeholderTextColor="#BBB"
                      multiline={f.multi}
                      maxLength={f.max}
                    />
                  </View>
                ))}
              </ScrollView>
              <View style={s.editBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEditModal(false)}>
                  <Text style={s.cancelBtnText}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, editSaving && { opacity: 0.6 }]} onPress={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Lưu thay đổi</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ── ADMIN REVIEW ACTIONS MODAL ───────────────────────────────────────── */}
      {isAdmin && (
        <Modal visible={showReviewActionsModal && isAdmin} animationType="slide" transparent onRequestClose={() => setShowReviewActionsModal(false)}>
          <View style={s.overlay}>
            <View style={[s.sheet, { maxHeight: '55%' }]}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Tùy chọn đánh giá</Text>
                <TouchableOpacity onPress={() => setShowReviewActionsModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              {selectedReview && (
                <View style={s.reviewPreview}>
                  <Text style={s.reviewPreviewUser}>{selectedReview.user?.username} · {'⭐'.repeat(selectedReview.rating || 0)}</Text>
                  <Text style={s.reviewPreviewBody} numberOfLines={2}>{selectedReview.content || selectedReview.text}</Text>
                </View>
              )}
              <TouchableOpacity style={s.optionRow} onPress={handleFlagReview}>
                <View style={[s.optionIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="flag-outline" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optionLabel, { color: '#D97706' }]}>
                    {(selectedReview as any)?.is_flagged ? 'Gỡ cờ' : 'Gắn cờ đánh giá'}
                  </Text>
                  <Text style={s.optionSub}>Đánh dấu để kiểm tra thêm</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.optionRow} onPress={handleDeleteReview}>
                <View style={[s.optionIcon, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="trash-outline" size={20} color="#E11D48" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optionLabel, { color: '#E11D48' }]}>Xoá đánh giá</Text>
                  <Text style={s.optionSub}>Xoá vĩnh viễn</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { marginTop: 8 }]} onPress={() => setShowReviewActionsModal(false)}>
                <Text style={s.primaryBtnText}>Huỷ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {!isAdmin && (
        <Modal visible={showReviewActionsModal && !isAdmin} animationType="slide" transparent onRequestClose={() => setShowReviewActionsModal(false)}>
          <View style={s.overlay}>
            <View style={[s.sheet, { maxHeight: '45%' }]}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Tùy chọn</Text>
                <TouchableOpacity onPress={() => setShowReviewActionsModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              {selectedReview && (
                <View style={s.reviewPreview}>
                  <Text style={s.reviewPreviewUser}>{selectedReview.user?.username} · {'⭐'.repeat(selectedReview.rating || 0)}</Text>
                  <Text style={s.reviewPreviewBody} numberOfLines={2}>{selectedReview.content || selectedReview.text}</Text>
                </View>
              )}
              <TouchableOpacity style={s.optionRow} onPress={() => selectedReview && handleReportReview(selectedReview)}>
                <View style={[s.optionIcon, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="flag-outline" size={20} color="#E11D48" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optionLabel, { color: '#E11D48' }]}>Báo cáo đánh giá</Text>
                  <Text style={s.optionSub}>Nội dung không phù hợp</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { marginTop: 16 }]} onPress={() => setShowReviewActionsModal(false)}>
                <Text style={s.primaryBtnText}>Huỷ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── WRITE REVIEW MODAL — users AND admins can both write ─────────────── */}
      <Modal visible={showReviewModal} animationType="slide" transparent onRequestClose={() => setShowReviewModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
          <View style={[s.sheet, { maxHeight: '92%' }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Viết đánh giá</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={s.reviewModalSub}>{restaurant.name}</Text>

            {/* Stars */}
            <Text style={s.inputLabel}>Đánh giá của bạn *</Text>
            <View style={s.starPicker}>
              {[1, 2, 3, 4, 5].map(st => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setReviewRating(st)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons
                    name={st <= reviewRating ? 'star' : 'star-outline'}
                    size={40}
                    color={st <= reviewRating ? '#FFD700' : '#DDD'}
                  />
                </TouchableOpacity>
              ))}
              {/* Human-sounding rating word */}
              {reviewRating > 0 && (
                <Text style={s.ratingWord}>{RATING_WORDS[reviewRating]}</Text>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
              <TextInput
                style={s.inputField}
                placeholder="Tiêu đề (tuỳ chọn)"
                placeholderTextColor="#BBB"
                value={reviewTitle}
                onChangeText={setReviewTitle}
                maxLength={80}
              />
              <TextInput
                style={[s.inputField, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Chia sẻ trải nghiệm của bạn... *"
                placeholderTextColor="#BBB"
                value={reviewContent}
                onChangeText={setReviewContent}
                multiline
                maxLength={500}
              />
              <Text style={s.charCount}>{reviewContent.length}/500</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[s.inputField, { flex: 1 }]}
                  placeholder="Tên món ăn"
                  placeholderTextColor="#BBB"
                  value={reviewDishName}
                  onChangeText={setReviewDishName}
                  maxLength={60}
                />
                <TextInput
                  style={[s.inputField, { width: 110 }]}
                  placeholder="Giá (₫)"
                  placeholderTextColor="#BBB"
                  value={reviewDishPrice}
                  onChangeText={setReviewDishPrice}
                  keyboardType="numeric"
                  maxLength={20}
                />
              </View>
              <TouchableOpacity style={s.addPhotoBtn} onPress={handlePickReviewImages}>
                <Ionicons name="camera-outline" size={18} color="#FF8C42" />
                <Text style={s.addPhotoBtnText}>Thêm ảnh ({reviewImages.length}/4)</Text>
              </TouchableOpacity>
              {reviewImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {reviewImages.map((img, i) => (
                    <View key={i} style={{ position: 'relative', marginRight: 8 }}>
                      <Image source={{ uri: img }} style={s.thumbImg} />
                      <TouchableOpacity
                        style={s.thumbRemove}
                        onPress={() => setReviewImages(p => p.filter((_, j) => j !== i))}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Ionicons name="close-circle" size={20} color="#E11D48" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[s.primaryBtn, reviewSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmitReview}
              disabled={reviewSubmitting}
            >
              {reviewSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Gửi đánh giá</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: SPACING.md, ...TYPOGRAPHY.body, color: COLORS.textSecondary },

  headerNav:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, position: 'absolute', left: 0, right: 0, zIndex: 10 },
  headerRight:{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn:    { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: BORDER_RADIUS.full },
  adminIconBtn: { borderWidth: 1, borderColor: `${COLORS.primary}4D` },   // primary @30% opacity
  adminIndicator:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  adminIndicatorText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.background },

  // ── Cover ─────────────────────────────────────────────────────────────────
  coverImage:       { height: Math.round(Dimensions.get('window').height * 0.32), backgroundColor: COLORS.border },
  coverFallback:    { justifyContent: 'center', alignItems: 'center', gap: SPACING.sm },
  noImageText:      { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, marginTop: SPACING.xs },
  coverEditOverlay: { position: 'absolute', bottom: SPACING.md, right: SPACING.md },
  coverBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: BORDER_RADIUS.full },
  coverBadgeText:   { ...TYPOGRAPHY.bodySmall, color: COLORS.background, fontWeight: '600' },
  uploadCircle:     { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs },
  uploadPrompt:     { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  uploadSub:        { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, marginTop: 2 },

  // ── Admin banner ──────────────────────────────────────────────────────────
  adminBanner:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: 10 },
  adminBannerPending: { backgroundColor: '#FFFBEB' },   // warning-tint — not in theme, kept as-is
  adminBannerActive:  { backgroundColor: '#F0FDF4' },   // success-tint — not in theme, kept as-is
  adminBannerText:    { flex: 1, ...TYPOGRAPHY.bodySmall, fontWeight: '500' },
  verifyNowBtn:       { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  verifyNowText:      { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.background },

  infoSection:    { padding: 20, borderBottomWidth: 8, borderBottomColor: COLORS.surface },
  titleRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  restaurantName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, flex: 1, marginRight: SPACING.sm },
  badgeRow:       { flexDirection: 'row', gap: SPACING.xs + 2, flexShrink: 0 },
  topBadge:       { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm + 6 },
  newBadge:       { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm + 6 },
  verifiedBadgePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#7C3AED', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm + 6 },
  badgeText:      { ...TYPOGRAPHY.caption, fontWeight: 'bold', color: COLORS.background },
  subtitle:       { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, marginBottom: SPACING.md },
  addressRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: 10 },
  addressText:    { flex: 1, ...TYPOGRAPHY.bodySmall, color: COLORS.text, lineHeight: 18 },
  mapsLink:       { ...TYPOGRAPHY.bodySmall, color: COLORS.info, fontWeight: '600' },
  infoRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  infoText:       { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  priceSymbol:    { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  statsRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: `${COLORS.primary}0D`, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, marginTop: SPACING.lg, borderWidth: 1, borderColor: COLORS.primaryLight },
  statItem:       { flex: 1, alignItems: 'center' },
  statValue:      { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  statLabel:      { fontSize: 10, color: COLORS.textTertiary, marginTop: 2 },
  statDivider:    { width: 1, height: 28, backgroundColor: COLORS.primaryLight },
  landmarkBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: 20, marginVertical: 15, backgroundColor: `${COLORS.primary}0A`, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.primaryLight },
  landmarkBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  adminActionBar: { marginHorizontal: 20, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  adminBarLabel:  { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textTertiary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  adminBtns:      { flexDirection: 'row', justifyContent: 'space-between' },
  adminBtn:       { alignItems: 'center', gap: SPACING.xs + 2, flex: 1 },
  adminBtnIcon:   { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  adminBtnText:   { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', textAlign: 'center' },

  reviewsSection:  { paddingHorizontal: 20, paddingTop: 20 },
  reviewsHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  sectionTitle:    { ...TYPOGRAPHY.subtitle, color: COLORS.text },
  reviewCountText: { ...TYPOGRAPHY.body, color: COLORS.textTertiary, marginLeft: SPACING.xs + 2, flex: 1 },
  addReviewBtn:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: `${COLORS.primary}12`, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.primaryLight },
  addReviewText:   { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  adminManageBtn:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  adminManageBtnText: { color: COLORS.primary, ...TYPOGRAPHY.bodySmall, fontWeight: '600' },

  ratingSummary:  { flexDirection: 'row', marginBottom: SPACING.xl, gap: 20 },
  bigRatingWrap:  { alignItems: 'center' },
  bigRating:      { fontSize: 40, fontWeight: 'bold', color: COLORS.text },
  starRow:        { flexDirection: 'row', marginTop: SPACING.xs },
  ratingCountText:{ ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginTop: SPACING.xs },
  ratingBars:     { flex: 1, justifyContent: 'center' },
  barRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  barLabel:       { fontSize: 11, color: COLORS.textSecondary, width: 8, marginRight: SPACING.xs },
  barBg:          { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginLeft: SPACING.xs + 2 },
  barFill:        { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },
  barCount:       { fontSize: 10, color: COLORS.textTertiary, marginLeft: SPACING.xs + 2, width: 20, textAlign: 'right' },

  reviewCard:         { marginBottom: SPACING.xl + 4, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reviewCardFlagged:  { backgroundColor: '#FFFBEB', marginHorizontal: -20, paddingHorizontal: 20 },
  flagBanner:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.sm, marginBottom: 10 },
  flagBannerText:     { ...TYPOGRAPHY.caption, color: '#DC2626', fontWeight: '600' },
  reviewHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar:             { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border },
  avatarFallback:     { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarLetter:       { color: COLORS.background, fontWeight: '700', fontSize: 16 },
  avatarFallbackSm:   { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarLetterSm:     { color: COLORS.background, fontWeight: '700', fontSize: 8 },
  reviewMeta:         { flex: 1, marginLeft: 10 },
  reviewNameRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 2 },
  reviewUsername:     { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  reviewUserId:       { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  reviewStarRow:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewTimeText:     { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginLeft: SPACING.xs + 2 },
  adminMenuBtn:       { padding: SPACING.xs + 2, backgroundColor: `${COLORS.primary}12`, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.primaryLight },
  userMenuBtn:        { padding: SPACING.xs + 2 },
  reviewTitle:        { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs + 2 },
  reviewBody:         { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },
  reviewImgScroll:    { marginBottom: 10 },
  reviewImg:          { width: 200, height: 150, borderRadius: BORDER_RADIUS.md, marginRight: 10, backgroundColor: COLORS.border },
  dishTag:            { marginTop: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishLabel:          { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  dishPrice:          { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  likeBtn:            { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full },
  likeBtnText:        { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary },
  moreReviews:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2, justifyContent: 'center', paddingVertical: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  moreReviewsText:    { ...TYPOGRAPHY.body, color: COLORS.textTertiary },

  // ── See-more button (before expand) ──────────────────────────────────────
  seeMoreBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg, marginTop: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg, backgroundColor: `${COLORS.primary}08` },
  seeMoreBtnText:     { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  // ── Expanded reviews container ────────────────────────────────────────────
  expandedReviews:    { marginTop: SPACING.sm },

  // Sort toggle row
  sortRow:            { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sortLabel:          { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, marginRight: SPACING.xs },
  sortChip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 3, borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  sortChipActive:     { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  sortChipText:       { fontSize: 12, fontWeight: '600', color: COLORS.textTertiary },
  sortChipTextActive: { color: COLORS.primary },
  sortTotal:          { marginLeft: 'auto' as any, ...TYPOGRAPHY.caption, color: COLORS.textTertiary },

  // Load more / loading / all loaded
  reviewLoadingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
  reviewLoadingText:  { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary },
  loadMoreBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md + 2, marginTop: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  loadMoreBtnText:    { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  allLoadedRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  allLoadedLine:      { flex: 1, height: 1, backgroundColor: COLORS.border },
  allLoadedText:      { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, textAlign: 'center' },

  emptyState:             { alignItems: 'center', paddingVertical: 40 },
  emptyTitle:             { ...TYPOGRAPHY.subtitle, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptySub:               { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, marginTop: SPACING.xs + 2, textAlign: 'center', lineHeight: 20 },
  firstReviewBtn:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.full, marginTop: SPACING.lg },
  firstReviewBtnDisabled: { backgroundColor: COLORS.textTertiary },
  firstReviewBtnText:     { color: COLORS.background, fontWeight: '700', fontSize: 14 },
  postsHint:              { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2, backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full, marginTop: SPACING.md },
  postsHintText:          { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: COLORS.background, borderTopLeftRadius: SPACING.xl + 4, borderTopRightRadius: SPACING.xl + 4, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40 },
  sheetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  sheetTitle:   { ...TYPOGRAPHY.subtitle, color: COLORS.text },
  addressBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg },
  addressBoxText: { flex: 1, ...TYPOGRAPHY.bodySmall, color: COLORS.info, lineHeight: 18 },
  notesLabel:   { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.md },
  noteCard:     { backgroundColor: `${COLORS.primary}0A`, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  noteVerified: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs + 2 },
  noteVerifiedText: { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  noteText:     { ...TYPOGRAPHY.bodySmall, color: COLORS.text, lineHeight: 18 },
  noteAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2, marginTop: SPACING.sm },
  noteAvatar:   { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.border },
  noteAuthor:   { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontWeight: '500' },
  helpfulText:  { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, marginTop: SPACING.xs + 2 },
  primaryBtn:   { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '700' },

  // ── Admin sheet extras ────────────────────────────────────────────────────
  adminSheetSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.lg, fontWeight: '500' },
  optionRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  optionIcon:   { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  optionLabel:  { ...TYPOGRAPHY.body, fontWeight: '600', marginBottom: 2 },
  optionSub:    { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary },
  inputLabel:  { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textTertiary, marginBottom: SPACING.xs + 2, marginTop: SPACING.md },
  inputField:  { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 14, paddingVertical: SPACING.md, ...TYPOGRAPHY.body, color: COLORS.text, backgroundColor: COLORS.surface, marginBottom: SPACING.xs },
  editBtns:    { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn:     { flex: 2, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, alignItems: 'center', backgroundColor: '#4F46E5' },  // indigo — intentional, not in theme
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.background },
  reviewModalSub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textTertiary, marginTop: -10, marginBottom: SPACING.lg, fontWeight: '500' },
  starPicker:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs + 2, marginBottom: SPACING.lg },
  ratingWord:     { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.primary, marginLeft: SPACING.xs + 2 },
  charCount:      { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, textAlign: 'right', marginBottom: 10, marginTop: -2 },
  addPhotoBtn:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderWidth: 1, borderColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.md, backgroundColor: `${COLORS.primary}06`, marginBottom: SPACING.md },
  addPhotoBtnText: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.primary },
  thumbImg:       { width: 80, height: 80, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.border },
  thumbRemove:    { position: 'absolute', top: -6, right: -6 },
  reviewPreview:     { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg },
  reviewPreviewUser: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  reviewPreviewBody: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, lineHeight: 18 },
});