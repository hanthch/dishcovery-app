import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import {
  View,
  ActionSheetIOS,
  Platform,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Dimensions,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dataService from '../../../services/Api.service';
import {
  Restaurant,
  Review,
  LandmarkNote,
  RestaurantStackParamList,
} from '../../../types/restaurant';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 280;

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props {
  navigation: NavigationProp;
  route: {
    params: {
      restaurantId: string;
      isNew?: boolean;
      newRestaurantData?: Restaurant;
    };
  };
}

export default function RestaurantDetailScreen({ navigation, route }: Props) {
  const { restaurantId, isNew, newRestaurantData } = route.params;

  const [restaurant, setRestaurant]               = useState<Restaurant | null>(newRestaurantData ?? null);
  const [landmarkNotes, setLandmarkNotes]         = useState<LandmarkNote[]>([]);
  const [loading, setLoading]                     = useState(!isNew);
  const [isBookmarked, setIsBookmarked]           = useState(false);
  const [bookmarkLoading, setBookmarkLoading]     = useState(false);
  const [showLandmarkModal, setShowLandmarkModal] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex]   = useState(0);

  // Review modal state
  const [showReviewModal, setShowReviewModal]     = useState(false);
  const [reviewRating, setReviewRating]           = useState(0);
  const [reviewTitle, setReviewTitle]             = useState('');
  const [reviewContent, setReviewContent]         = useState('');
  const [reviewDishName, setReviewDishName]       = useState('');
  const [reviewSubmitting, setReviewSubmitting]   = useState(false);

  const [showAllReviews, setShowAllReviews]   = useState(false);
  const [likedReviewIds, setLikedReviewIds]   = useState<Set<string>>(new Set());

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Load restaurant ────────────────────────────────────────────────────────
  const loadRestaurant = useCallback(async () => {
    if (isNew && newRestaurantData) return;
    try {
      setLoading(true);
      const [data, notes] = await Promise.all([
        dataService.getRestaurantById(restaurantId),
        dataService.getRestaurantLandmarkNotes(restaurantId),
      ]);
      setRestaurant(data);
      // FIX: is_saved is now correctly returned by GET /:id for auth users
      setIsBookmarked(data?.is_saved || false);
      setLandmarkNotes(notes || []);
    } catch (error) {
      console.error('Error loading restaurant:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin quán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isNew, newRestaurantData]);

  useFocusEffect(useCallback(() => { loadRestaurant(); }, [loadRestaurant]));

  // ── Set header title to restaurant name ───────────────────────────────────
  useLayoutEffect(() => {
    if (restaurant?.name) {
      navigation.setOptions({ title: restaurant.name });
    }
  }, [navigation, restaurant?.name]);

  // ── Bookmark ───────────────────────────────────────────────────────────────
  const handleToggleBookmark = useCallback(async () => {
    if (!restaurant || isNew || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await dataService.unsaveRestaurant(restaurant.id);
      } else {
        await dataService.saveRestaurant(restaurant.id);
      }
      setIsBookmarked(prev => !prev);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu quán. Vui lòng thử lại.');
    } finally {
      setBookmarkLoading(false);
    }
  }, [restaurant, isNew, isBookmarked, bookmarkLoading]);

  // ── Google Maps ────────────────────────────────────────────────────────────
  const openGoogleMaps = useCallback(() => {
    if (!restaurant) return;
    const { latitude, longitude, address, name, google_maps_url } = restaurant;

    // Prefer coordinates for pinpoint accuracy; fall back to stored URL, then address search
    const addressQuery = encodeURIComponent(address || name || '');
    const googleUrl =
      latitude && longitude
        ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        : google_maps_url
        || `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;

    const appleUrl =
      latitude && longitude
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
        : `http://maps.apple.com/?q=${addressQuery}`;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Google Maps', 'Apple Maps', 'Mở trên trình duyệt', 'Huỷ'],
          cancelButtonIndex: 3,
        },
        buttonIndex => {
          if (buttonIndex === 0) Linking.openURL(googleUrl);
          if (buttonIndex === 1) Linking.openURL(appleUrl);
          if (buttonIndex === 2) Linking.openURL(googleUrl);
        }
      );
    } else {
      Alert.alert('Chỉ đường', undefined, [
        { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) },
        { text: 'Trình duyệt', onPress: () => Linking.openURL(googleUrl) },
        { text: 'Huỷ', style: 'cancel' },
      ]);
    }
  }, [restaurant]);

  // ── Submit review ──────────────────────────────────────────────────────────
  const handleSubmitReview = useCallback(async () => {
    if (!restaurant || reviewRating === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn số sao đánh giá.');
      return;
    }
    if (reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const newReview = await dataService.addRestaurantReview(restaurant.id, {
        rating:    reviewRating,
        title:     reviewTitle.trim()    || undefined,
        content:   reviewContent.trim()  || undefined,
        dish_name: reviewDishName.trim() || undefined,
      });
      // Prepend new review to existing list optimistically
      setRestaurant(prev => {
        if (!prev) return prev;
        const updatedReviews = [newReview, ...(prev.top_reviews || [])];
        const newCount = (prev.rating_count || 0) + 1;
        const totalStars = updatedReviews.reduce((s, r) => s + (r.rating || 0), 0);
        return {
          ...prev,
          top_reviews:  updatedReviews,
          rating_count: newCount,
          rating:       Math.round((totalStars / updatedReviews.length) * 10) / 10,
        };
      });
      // Reset modal state
      setReviewRating(0);
      setReviewTitle('');
      setReviewContent('');
      setReviewDishName('');
      setShowReviewModal(false);
      Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được gửi.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.error || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setReviewSubmitting(false);
    }
  }, [restaurant, reviewRating, reviewTitle, reviewContent, reviewDishName, reviewSubmitting]);

  // ── Toggle review like (one like per review per session) ──────────────────
  const handleToggleLike = useCallback((reviewId: string) => {
    setLikedReviewIds(prev => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
    setRestaurant(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        top_reviews: (prev.top_reviews || []).map(r => {
          if (r.id !== reviewId) return r;
          const alreadyLiked = likedReviewIds.has(reviewId);
          return { ...r, likes: (r.likes || 0) + (alreadyLiked ? -1 : 1) };
        }),
      };
    });
  }, [likedReviewIds]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const diffMs   = Date.now() - new Date(dateString).getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMo   = Math.floor(diffDays / 30);
    const diffYr   = Math.floor(diffDays / 365);
    if (diffYr > 0)   return `${diffYr} năm trước`;
    if (diffMo > 0)   return `${diffMo} tháng trước`;
    if (diffDays > 0) return `${diffDays} ngày trước`;
    return 'Hôm nay';
  };

  // FIX: format dish_price (backend returns DECIMAL as number) → Vietnamese VND string
  const formatPrice = (price?: number | string | null): string => {
    if (price == null) return '';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN') + 'đ';
  };

  const calcRatingDistribution = (reviews: Review[]) => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const s = Math.floor(r.rating || 0);
      if (s >= 1 && s <= 5) dist[s]++;
    });
    return dist;
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Đang tải thông tin quán...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const allPhotos = [
    restaurant.cover_image,
    restaurant.image_url,
    ...(restaurant.photos || []),
    ...(restaurant.images || []),
  ].filter((v, i, a): v is string => !!v && a.indexOf(v) === i);

  const displayImage = allPhotos[activePhotoIndex] || allPhotos[0] || 'https://via.placeholder.com/400x280';

  const reviews            = restaurant.top_reviews || [];
  const totalReviews       = restaurant.rating_count || reviews.length || 0;
  const averageRating      = restaurant.rating || 0;
  const ratingDist         = calcRatingDistribution(reviews);
  const totalRatingsSample = Math.max(Object.values(ratingDist).reduce((a, b) => a + b, 0), 1);

  const REVIEWS_PREVIEW = 3;
  const visibleReviews  = showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW);

  const cuisineTypes  = restaurant.cuisine || restaurant.food_types || [];
  const cuisineText   = cuisineTypes.length > 0 ? cuisineTypes.slice(0, 3).join(' · ') : 'Đang cập nhật';
  const isNewRestaurant = isNew || (!averageRating && reviews.length === 0);

  const headerOpacity = scrollY.interpolate({
    inputRange: [COVER_HEIGHT - 80, COVER_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Sticky Header (fades in on scroll) ── */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.stickyBack}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{restaurant.name}</Text>
        <TouchableOpacity
          onPress={handleToggleBookmark}
          disabled={!!isNew || bookmarkLoading}
          style={styles.stickyAction}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isBookmarked ? '#FF8C42' : '#333'}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Floating nav (always visible over image) ── */}
      <View style={styles.floatingNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleToggleBookmark}
          style={[styles.iconBtn, !!isNew && styles.iconBtnDisabled]}
          disabled={!!isNew || bookmarkLoading}
        >
          {bookmarkLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? '#FFD700' : '#fff'}
            />
          )}
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* ── COVER IMAGE ── */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: displayImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          {/*
            FIX (ts2345): Replaced web-only `background: 'linear-gradient(...)'`
            with two React Native-compatible overlay Views:
            - Top dark fade for nav readability
            - Bottom dark fade for badge/thumbnail readability
            React Native StyleSheet does NOT support the CSS `background` shorthand
            or `linear-gradient` values — only `backgroundColor` is valid.
          */}
          <View style={styles.coverGradientTop} />
          <View style={styles.coverGradientBottom} />

          {/* Photo thumbnails (if multiple) */}
          {allPhotos.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoThumbs}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}
            >
              {allPhotos.map((uri, idx) => (
                <TouchableOpacity key={idx} onPress={() => setActivePhotoIndex(idx)}>
                  <Image
                    source={{ uri }}
                    style={[styles.photoThumb, idx === activePhotoIndex && styles.photoThumbActive]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Badges over image */}
          <View style={styles.coverBadges}>
            {restaurant.top_rank_this_week && restaurant.top_rank_this_week > 0 && (
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>🏆 Top {restaurant.top_rank_this_week}</Text>
              </View>
            )}
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>🌟 Quán mới</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── RESTAURANT INFO ── */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            {restaurant.verified && (
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={13} color="#00B894" />
                <Text style={styles.verifiedText}>Đã xác minh</Text>
              </View>
            )}
          </View>

          <Text style={styles.cuisineSubtitle}>{cuisineText}</Text>

          {/* Quick stats row */}
          <View style={styles.quickStats}>
            {averageRating > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>⭐ {averageRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>({totalReviews})</Text>
              </View>
            )}
            {restaurant.price_range && (
              <View style={styles.statDivider} />
            )}
            {restaurant.price_range && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>💰</Text>
                <Text style={styles.statLabel}>{restaurant.price_range}</Text>
              </View>
            )}
            {restaurant.opening_hours && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>🕐</Text>
                  <Text style={styles.statLabel}>{restaurant.opening_hours}</Text>
                </View>
              </>
            )}
          </View>

          {/* Address */}
          {restaurant.address && (
            <TouchableOpacity style={styles.addressRow} onPress={openGoogleMaps}>
              <View style={styles.addressIconWrap}>
                <Ionicons name="location" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.addressText} numberOfLines={2}>{restaurant.address}</Text>
              <View style={styles.mapsBadge}>
                <Text style={styles.mapsText}>Bản đồ →</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openGoogleMaps}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F4FF' }]}>
              <Ionicons name="navigate" size={20} color="#4A90E2" />
            </View>
            <Text style={styles.actionLabel}>Đường đi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleToggleBookmark}
            disabled={!!isNew || bookmarkLoading}
          >
            <View style={[styles.actionIcon, { backgroundColor: isBookmarked ? '#FFF3CD' : '#F5F5F5' }]}>
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isBookmarked ? '#FF8C42' : '#666'}
              />
            </View>
            <Text style={styles.actionLabel}>{isBookmarked ? 'Đã lưu' : 'Lưu quán'}</Text>
          </TouchableOpacity>

          {landmarkNotes.length > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowLandmarkModal(true)}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFF0E5' }]}>
                <Ionicons name="compass" size={20} color="#FF8C42" />
              </View>
              <Text style={styles.actionLabel}>Cách tìm</Text>
            </TouchableOpacity>
          )}

          {restaurant.google_maps_url && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(restaurant.google_maps_url!)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F8F5' }]}>
                <Ionicons name="share-outline" size={20} color="#00B894" />
              </View>
              <Text style={styles.actionLabel}>Chia sẻ</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── LANDMARK NOTES PREVIEW ── */}
        {landmarkNotes.length > 0 && (
          <TouchableOpacity
            style={styles.landmarkPreview}
            onPress={() => setShowLandmarkModal(true)}
          >
            <View style={styles.landmarkPreviewLeft}>
              <Ionicons name="compass" size={22} color="#FF8C42" />
              <View>
                <Text style={styles.landmarkPreviewTitle}>
                  Hướng dẫn tìm quán ({landmarkNotes.length})
                </Text>
                <Text style={styles.landmarkPreviewSub} numberOfLines={1}>
                  {typeof landmarkNotes[0]?.text === 'string' ? landmarkNotes[0].text : ''}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF8C42" />
          </TouchableOpacity>
        )}

        {/* ── REVIEWS SECTION ── */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Đánh giá</Text>
            {totalReviews > 0 && (
              <Text style={styles.reviewCount}>{totalReviews} đánh giá</Text>
            )}
            {/* FIX: "Viết review" button now opens the review modal */}
            {!isNew && (
              <TouchableOpacity
                style={styles.addReviewBtn}
                onPress={() => setShowReviewModal(true)}
              >
                <Ionicons name="pencil-outline" size={14} color="#FF8C42" />
                <Text style={styles.addReviewText}>Viết review</Text>
              </TouchableOpacity>
            )}
          </View>

          {isNewRestaurant ? (
            /* ── New restaurant empty state ── */
            <View style={styles.emptyReviews}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyReviewTitle}>Chưa có đánh giá nào</Text>
              <Text style={styles.emptyReviewSub}>
                {isNew
                  ? 'Quán vừa được thêm vào. Hãy là người đầu tiên đánh giá sau khi xác minh!'
                  : 'Hãy là người đầu tiên đánh giá quán này! 🌟'}
              </Text>
              <TouchableOpacity
                style={[styles.firstReviewBtn, isNew && styles.firstReviewBtnDisabled]}
                disabled={!!isNew}
                onPress={() => !isNew && setShowReviewModal(true)}
              >
                <Ionicons name="star-outline" size={15} color="#fff" />
                <Text style={styles.firstReviewBtnText}>
                  {isNew ? 'Đang chờ xác minh...' : 'Viết đánh giá đầu tiên'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Rating summary ── */}
              {reviews.length > 0 && (
                <View style={styles.ratingSummary}>
                  <View style={styles.ratingBigBlock}>
                    <Text style={styles.bigRating}>{averageRating.toFixed(1)}</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Ionicons
                          key={i}
                          name={i <= Math.round(averageRating) ? 'star' : 'star-outline'}
                          size={14}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                    <Text style={styles.totalRatingsText}>{totalReviews} đánh giá</Text>
                  </View>

                  <View style={styles.ratingBars}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratingDist[star] || 0;
                      const pct   = (count / totalRatingsSample) * 100;
                      return (
                        <View key={star} style={styles.barRow}>
                          <Text style={styles.barLabel}>{star}</Text>
                          <Ionicons name="star" size={10} color="#FFD700" />
                          <View style={styles.barBg}>
                            <View style={[styles.barFill, { width: `${pct}%` }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ── Review list ── */}
              {reviews.length > 0 ? (
                <>
                  {visibleReviews.map((review, index) => (
                    <ReviewItem
                      key={review.id || index}
                      review={review}
                      formatTimeAgo={formatTimeAgo}
                      formatPrice={formatPrice}
                      isLiked={likedReviewIds.has(review.id)}
                      onToggleLike={handleToggleLike}
                    />
                  ))}
                  {reviews.length > REVIEWS_PREVIEW && (
                    <TouchableOpacity
                      style={styles.seeAllBtn}
                      onPress={() => setShowAllReviews(prev => !prev)}
                    >
                      <Text style={styles.seeAllBtnText}>
                        {showAllReviews
                          ? 'Thu gọn'
                          : `Xem tất cả ${reviews.length} đánh giá`}
                      </Text>
                      <Ionicons
                        name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#FF8C42"
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyReviews}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyReviewTitle}>Chưa có đánh giá nào</Text>
                  <Text style={styles.emptyReviewSub}>Hãy là người đầu tiên đánh giá quán này!</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* ── LANDMARK NOTES MODAL ── */}
      <Modal
        visible={showLandmarkModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLandmarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧭 Hướng dẫn tìm quán</Text>
              <TouchableOpacity onPress={() => setShowLandmarkModal(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {restaurant.address && (
              <TouchableOpacity style={styles.modalAddressRow} onPress={openGoogleMaps}>
                <Ionicons name="location" size={16} color="#4A90E2" />
                <Text style={styles.modalAddressText}>{restaurant.address}</Text>
                <Text style={styles.openMapsText}>→ Mở Maps</Text>
              </TouchableOpacity>
            )}

            <ScrollView style={styles.modalNotesList} showsVerticalScrollIndicator={false}>
              {landmarkNotes.map((note, index) => (
                <View key={note.id || index} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    {note.verified && (
                      <View style={styles.verifiedNoteBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#00B894" />
                        <Text style={styles.verifiedNoteText}>Đã xác minh</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.noteText}>{note.text}</Text>
                  {note.user && (
                    <View style={styles.noteAuthorRow}>
                      <Image
                        source={{
                          uri:
                            note.user.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(note.user.username)}&size=40`,
                        }}
                        style={styles.noteAvatar}
                      />
                      <Text style={styles.noteAuthor}>{note.user.username}</Text>
                      {(note.helpful_count ?? 0) > 0 && (
                        <Text style={styles.helpfulText}>
                          👍 {note.helpful_count}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowLandmarkModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── REVIEW SUBMISSION MODAL ── */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReviewModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✍️ Viết đánh giá</Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Ionicons name="close" size={24} color="#555" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Star picker */}
                <Text style={styles.reviewInputLabel}>Chọn số sao *</Text>
                <View style={styles.starPicker}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={36}
                        color={star <= reviewRating ? '#FFD700' : '#DDD'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Title */}
                <Text style={styles.reviewInputLabel}>Tiêu đề (tuỳ chọn)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Ví dụ: Quán ngon, giá hợp lý"
                  placeholderTextColor="#BBB"
                  value={reviewTitle}
                  onChangeText={setReviewTitle}
                  maxLength={100}
                />

                {/* Content */}
                <Text style={styles.reviewInputLabel}>Nội dung đánh giá</Text>
                <TextInput
                  style={[styles.reviewInput, styles.reviewTextArea]}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  placeholderTextColor="#BBB"
                  value={reviewContent}
                  onChangeText={setReviewContent}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />

                {/* Dish name */}
                <Text style={styles.reviewInputLabel}>Món đã ăn (tuỳ chọn)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Ví dụ: Bún bò Huế"
                  placeholderTextColor="#BBB"
                  value={reviewDishName}
                  onChangeText={setReviewDishName}
                  maxLength={100}
                />

                <TouchableOpacity
                  style={[
                    styles.modalCloseBtn,
                    { backgroundColor: reviewRating === 0 ? '#DDD' : '#FF8C42' },
                  ]}
                  onPress={handleSubmitReview}
                  disabled={reviewRating === 0 || reviewSubmitting}
                >
                  {reviewSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalCloseBtnText}>Gửi đánh giá</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ──────────────── REVIEW ITEM ──────────────── */

interface ReviewItemProps {
  review: Review;
  formatTimeAgo: (d?: string) => string;
  formatPrice: (p?: number | string | null) => string;
  isLiked: boolean;
  onToggleLike: (id: string) => void;
}

function ReviewItem({ review, formatTimeAgo, formatPrice, isLiked, onToggleLike }: ReviewItemProps) {
  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Image
          source={{
            uri:
              review.user?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.username || 'U')}&size=80`,
          }}
          style={styles.userAvatar}
        />
        <View style={styles.reviewUserInfo}>
          <Text style={styles.userName}>{review.user?.username || 'Ẩn danh'}</Text>
          <View style={styles.reviewMeta}>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map(s => (
                <Ionicons
                  key={s}
                  name={s <= (review.rating || 0) ? 'star' : 'star-outline'}
                  size={12}
                  color="#FFD700"
                />
              ))}
            </View>
            {review.created_at && (
              <Text style={styles.reviewTime}>· {formatTimeAgo(review.created_at)}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={18} color="#CCC" />
        </TouchableOpacity>
      </View>

      {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}

      <Text style={styles.reviewText}>{review.content || review.text || ''}</Text>

      {review.images && review.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {review.images.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
          ))}
        </ScrollView>
      )}

      {review.dish_name && (
        <View style={styles.dishTag}>
          <Ionicons name="restaurant-outline" size={12} color="#888" />
          <Text style={styles.dishLabel}>{review.dish_name}</Text>
          {/* FIX: dish_price is DECIMAL from DB — format as VND string */}
          {review.dish_price != null && (
            <Text style={styles.dishPrice}> · {formatPrice(review.dish_price)}</Text>
          )}
        </View>
      )}

      {/* Like button — one like per review, togglable */}
      <TouchableOpacity
        style={styles.likesRow}
        onPress={() => onToggleLike(review.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
          size={14}
          color={isLiked ? '#FF8C42' : '#888'}
        />
        <Text style={[styles.likesText, isLiked && { color: '#FF8C42', fontWeight: '600' }]}>
          {(review.likes || 0) > 0
            ? `${review.likes} lượt thích`
            : isLiked
            ? '1 lượt thích'
            : 'Hữu ích?'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ──────────────── STYLES ──────────────── */

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:      { fontSize: 14, color: '#888' },

  // Sticky header
  stickyHeader: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          100,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  stickyBack:   { padding: 4 },
  stickyTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  stickyAction: { padding: 4 },

  // Floating nav
  floatingNav: {
    position:        'absolute',
    top:             48,
    left:            0,
    right:           0,
    zIndex:          50,
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconBtn: {
    width:           40,
    height:          40,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius:    20,
    justifyContent:  'center',
    alignItems:      'center',
  },
  iconBtnDisabled: { opacity: 0.4 },

  // Cover
  coverContainer: { width, height: COVER_HEIGHT, position: 'relative' },
  coverImage:     { width: '100%', height: '100%' },

  /*
    FIX (ts2345): The original `coverGradient` style used:
      background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5))'
    which is a web-only CSS property NOT supported in React Native StyleSheet.
    Solution: Two solid rgba overlay Views.
  */
  coverGradientTop: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    height:          80,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  coverGradientBottom: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          100,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },

  photoThumbs: {
    position: 'absolute',
    bottom:   12,
    left:     0,
    right:    0,
  },
  photoThumb: {
    width:       48,
    height:      48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    opacity:     0.7,
  },
  photoThumbActive: {
    borderColor: '#fff',
    opacity:     1,
  },
  coverBadges: {
    position:   'absolute',
    top:        16,
    right:      16,
    gap:        6,
    alignItems: 'flex-end',
  },
  topBadge: {
    backgroundColor:  '#FFD700',
    paddingHorizontal: 10,
    paddingVertical:  5,
    borderRadius:     12,
  },
  topBadgeText: { fontWeight: '800', fontSize: 11, color: '#333' },
  newBadge: {
    backgroundColor:  '#FF8C42',
    paddingHorizontal: 10,
    paddingVertical:  5,
    borderRadius:     12,
  },
  newBadgeText: { fontWeight: '800', fontSize: 11, color: '#fff' },

  // Info section
  infoSection: {
    padding:           20,
    borderBottomWidth: 8,
    borderBottomColor: '#F5F5F5',
  },
  titleRow: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    justifyContent:  'space-between',
    marginBottom:    6,
    gap:             12,
  },
  restaurantName: {
    flex:       1,
    fontSize:   22,
    fontWeight: '800',
    color:      '#111',
    lineHeight: 28,
  },
  verifiedPill: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    backgroundColor:  '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical:  4,
    borderRadius:     10,
    marginTop:        4,
  },
  verifiedText:   { fontSize: 11, color: '#00B894', fontWeight: '600' },
  cuisineSubtitle:{ fontSize: 14, color: '#777', marginBottom: 14 },

  quickStats: {
    flexDirection:   'row',
    alignItems:      'center',
    flexWrap:        'wrap',
    gap:             4,
    marginBottom:    14,
    backgroundColor: '#F9F9F9',
    padding:         12,
    borderRadius:    12,
  },
  statItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue:   { fontSize: 14, fontWeight: '600', color: '#333' },
  statLabel:   { fontSize: 13, color: '#666' },
  statDivider: { width: 1, height: 16, backgroundColor: '#E0E0E0', marginHorizontal: 6 },

  addressRow: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             10,
    backgroundColor: '#F0F7FF',
    padding:         12,
    borderRadius:    12,
  },
  addressIconWrap: {
    width:           28,
    height:          28,
    backgroundColor: '#fff',
    borderRadius:    14,
    justifyContent:  'center',
    alignItems:      'center',
  },
  addressText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },
  mapsBadge: {
    backgroundColor:  '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical:  4,
    borderRadius:     8,
    alignSelf:        'center',
  },
  mapsText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // Quick actions
  actionsRow: {
    flexDirection:     'row',
    paddingHorizontal: 16,
    paddingVertical:   16,
    gap:               12,
    borderBottomWidth: 8,
    borderBottomColor: '#F5F5F5',
  },
  actionBtn:   { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: {
    width:          50,
    height:         50,
    borderRadius:   25,
    justifyContent: 'center',
    alignItems:     'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#555' },

  // Landmark preview
  landmarkPreview: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    marginHorizontal: 16,
    marginVertical:   12,
    backgroundColor:  '#FFF9F0',
    paddingVertical:  14,
    paddingHorizontal: 16,
    borderRadius:     14,
    borderWidth:      1,
    borderColor:      '#FFE4CC',
    gap:              12,
  },
  landmarkPreviewLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  landmarkPreviewTitle: { fontSize: 14, fontWeight: '700', color: '#FF8C42' },
  landmarkPreviewSub:   { fontSize: 12, color: '#888', marginTop: 2 },

  // Reviews
  reviewsSection: { paddingHorizontal: 20, paddingTop: 20 },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  16,
    gap:           8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  reviewCount:  { fontSize: 13, color: '#999' },
  addReviewBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    backgroundColor:  '#FFF0E5',
    paddingHorizontal: 12,
    paddingVertical:  6,
    borderRadius:     20,
  },
  addReviewText: { color: '#FF8C42', fontSize: 13, fontWeight: '600' },

  ratingSummary: {
    flexDirection: 'row',
    marginBottom:  24,
    gap:           20,
    backgroundColor: '#F9F9F9',
    padding:       16,
    borderRadius:  16,
  },
  ratingBigBlock:    { alignItems: 'center', justifyContent: 'center', minWidth: 72 },
  bigRating:         { fontSize: 44, fontWeight: '900', color: '#1A1A1A' },
  starRow:           { flexDirection: 'row', gap: 2, marginTop: 4 },
  totalRatingsText:  { fontSize: 11, color: '#888', marginTop: 4 },
  ratingBars:        { flex: 1, justifyContent: 'center', gap: 5 },
  barRow:            { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barLabel:          { fontSize: 11, color: '#666', width: 10 },
  barBg:             { flex: 1, height: 6, backgroundColor: '#E8E8E8', borderRadius: 3 },
  barFill:           { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },

  emptyReviews:     { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji:       { fontSize: 48 },
  emptyReviewTitle: { fontSize: 16, fontWeight: '700', color: '#555' },
  emptyReviewSub:   { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  firstReviewBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    backgroundColor:  '#FF8C42',
    paddingHorizontal: 20,
    paddingVertical:  12,
    borderRadius:     24,
    marginTop:        12,
  },
  firstReviewBtnDisabled: { backgroundColor: '#DDD' },
  firstReviewBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  reviewItem: {
    marginBottom:    24,
    paddingBottom:   24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reviewHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F0F0F0' },
  reviewUserInfo: { flex: 1, marginLeft: 10 },
  userName:       { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 3 },
  reviewMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewStars:    { flexDirection: 'row', gap: 2 },
  reviewTime:     { fontSize: 11, color: '#AAA' },
  reviewTitle:    { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 6 },
  reviewText:     { fontSize: 14, color: '#555', lineHeight: 21, marginBottom: 10 },
  reviewImage: {
    width:           190,
    height:          140,
    borderRadius:    12,
    marginRight:     10,
    backgroundColor: '#F0F0F0',
  },
  dishTag: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              5,
    backgroundColor:  '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical:  7,
    borderRadius:     8,
    marginTop:        8,
    alignSelf:        'flex-start',
  },
  dishLabel: { fontSize: 12, color: '#555' },
  dishPrice: { fontSize: 12, fontWeight: '600', color: '#FF8C42' },
  likesRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
    marginTop:     10,
  },
  likesText: { fontSize: 12, color: '#888' },

  // See all reviews button
  seeAllBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'center',
    gap:              6,
    paddingVertical:  14,
    marginTop:        4,
    marginBottom:     8,
    backgroundColor:  '#FFF0E5',
    borderRadius:     14,
    borderWidth:      1,
    borderColor:      '#FFD4B0',
  },
  seeAllBtnText: { fontSize: 14, fontWeight: '700', color: '#FF8C42' },

  // Modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-end',
  },
  modalContent: {
    backgroundColor:     '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop:          12,
    paddingHorizontal:   20,
    paddingBottom:       40,
    maxHeight:           '75%',
  },
  modalHandle: {
    width:           40,
    height:          4,
    backgroundColor: '#E0E0E0',
    borderRadius:    2,
    alignSelf:       'center',
    marginBottom:    16,
  },
  modalHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalAddressRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: '#F0F7FF',
    padding:         12,
    borderRadius:    12,
    marginBottom:    16,
  },
  modalAddressText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },
  openMapsText:     { fontSize: 12, color: '#4A90E2', fontWeight: '600' },
  modalNotesList:   { maxHeight: 320 },
  noteItem: {
    backgroundColor: '#FFF9F0',
    padding:         14,
    borderRadius:    12,
    marginBottom:    10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C42',
  },
  noteHeader: { marginBottom: 8 },
  verifiedNoteBadge: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    alignSelf:        'flex-start',
    backgroundColor:  '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical:  3,
    borderRadius:     10,
  },
  verifiedNoteText: { fontSize: 11, color: '#00B894', fontWeight: '600' },
  noteText:         { fontSize: 14, color: '#333', lineHeight: 20 },
  noteAuthorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           7,
    marginTop:     10,
  },
  noteAvatar:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E0E0E0' },
  noteAuthor:   { fontSize: 12, color: '#666', fontWeight: '600', flex: 1 },
  helpfulText:  { fontSize: 11, color: '#999' },
  modalCloseBtn: {
    backgroundColor: '#FF8C42',
    paddingVertical: 15,
    borderRadius:    14,
    alignItems:      'center',
    marginTop:       16,
  },
  modalCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Review form
  reviewInputLabel: {
    fontSize:     13,
    fontWeight:   '600',
    color:        '#555',
    marginBottom: 6,
    marginTop:    14,
  },
  reviewInput: {
    borderWidth:     1,
    borderColor:     '#E8E8E8',
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize:        14,
    color:           '#333',
    backgroundColor: '#FAFAFA',
  },
  reviewTextArea: {
    height:     120,
    paddingTop: 10,
  },
  starPicker: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  4,
  },
});