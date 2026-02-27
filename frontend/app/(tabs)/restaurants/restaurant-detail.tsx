import React, { useState, useCallback } from 'react';
import {
  View,
  ActionSheetIOS,
  Platform,
  Text,
  ScrollView,
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dataService from '../../../services/Api.service';
import { Restaurant, Review, LandmarkNote, RestaurantStackParamList } from '../../../types/restaurant';

const { width } = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props {
  navigation: NavigationProp;
  route: { params: { restaurantId: string; isNew?: boolean; newRestaurantData?: Restaurant } };
}

export default function RestaurantDetailScreen({ navigation, route }: Props) {
  const { restaurantId, isNew, newRestaurantData } = route.params;

  const [restaurant, setRestaurant]       = useState<Restaurant | null>(newRestaurantData ?? null);
  const [landmarkNotes, setLandmarkNotes] = useState<LandmarkNote[]>([]);
  const [loading, setLoading]             = useState(!isNew);
  const [isBookmarked, setIsBookmarked]   = useState(false);
  const [showLandmarkModal, setShowLandmarkModal] = useState(false);

  // ── Load restaurant data ──────────────────────────────────────────────────
  // Skip API call entirely for brand-new restaurants — they have no DB row yet
  const loadRestaurant = useCallback(async () => {
    if (isNew && newRestaurantData) return; // already set in useState above

    try {
      setLoading(true);
      const data = await dataService.getRestaurantById(restaurantId);
      setRestaurant(data);
      setIsBookmarked(data?.is_saved || false);

      const notes = await dataService.getRestaurantLandmarkNotes(restaurantId);
      setLandmarkNotes(notes || []);
    } catch (error) {
      console.error('Error loading restaurant:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin quán');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isNew, newRestaurantData]);

  useFocusEffect(
    useCallback(() => {
      loadRestaurant();
    }, [loadRestaurant])
  );

  // ── Bookmark ──────────────────────────────────────────────────────────────
  const handleToggleBookmark = async () => {
    if (!restaurant || isNew) return; // can't save a restaurant not yet in DB
    try {
      if (isBookmarked) {
        await dataService.unsaveRestaurant(restaurant.id);
      } else {
        await dataService.saveRestaurant(restaurant.id);
      }
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Bookmark error:', error);
      Alert.alert('Lỗi', 'Không thể lưu quán');
    }
  };

  // ── Google Maps ───────────────────────────────────────────────────────────
const openGoogleMaps = (): void => {
  if (!restaurant) return;

  const { latitude, longitude, address, name, google_maps_url } = restaurant;

  const encodedQuery = encodeURIComponent(`${name}, ${address || ''}`);

  // Use directions-style link (better than search)
  const googleDirections =
    latitude && longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : google_maps_url ||
        `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  const appleDirections =
    latitude && longitude
      ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
      : `http://maps.apple.com/?q=${encodedQuery}`;

  const browserUrl = googleDirections;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          'Open in Google Maps',
          'Open in Apple Maps',
          'Open in Browser',
          'Cancel',
        ],
        cancelButtonIndex: 3,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) Linking.openURL(googleDirections);
        if (buttonIndex === 1) Linking.openURL(appleDirections);
        if (buttonIndex === 2) Linking.openURL(browserUrl);
      }
    );
  } else {
    Alert.alert(
      'Open in Maps',
      'Choose navigation app',
      [
        { text: 'Google Maps', onPress: () => Linking.openURL(googleDirections) },
        { text: 'Browser', onPress: () => Linking.openURL(browserUrl) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }
};

  // ── Rating helpers ────────────────────────────────────────────────────────
  const calculateRatingDistribution = (reviews: Review[]) => {
    if (!reviews || reviews.length === 0) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      const rating = review.rating || 0;
      if (rating >= 1 && rating <= 5) distribution[Math.floor(rating)]++;
    });
    return distribution;
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date         = new Date(dateString);
    const now          = new Date();
    const diffInMs     = now.getTime() - date.getTime();
    const diffInDays   = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears  = Math.floor(diffInDays / 365);

    if (diffInYears > 0)  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
    if (diffInMonths > 0) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    if (diffInDays > 0)   return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return 'Today';
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || !restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loadingText}>Đang tải thông tin quán...</Text>
      </View>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const hasLandmarkNotes    = landmarkNotes && landmarkNotes.length > 0;
  const displayImage        = restaurant.cover_image || restaurant.image_url || restaurant.photos?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
  const reviews             = restaurant.top_reviews || [];
  const totalReviews        = restaurant.rating_count || reviews.length || 0;
  const averageRating       = restaurant.rating || 0;
  const ratingDistribution  = calculateRatingDistribution(reviews);
  const totalRatings        = Math.max(Object.values(ratingDistribution).reduce((a, b) => a + b, 0), 1);
  const cuisineTypes        = restaurant.cuisine || restaurant.food_types || [];
  const cuisineText         = cuisineTypes.length > 0 ? cuisineTypes.join(' | ') : 'Đang cập nhật';
  const categories          = restaurant.categories || [];
  const categoryText        = categories.includes('hidden-gem') ? 'Quán Núp Hẻm' :
                              categories.includes('street-food') ? 'Quán Vỉa Hè' :
                              categories.includes('fancy') ? 'Quán Sang Trọng' : '';

  // isNew = brand-new restaurant with no reviews yet (just added by user)
  const isNewRestaurant = isNew || (!averageRating && reviews.length === 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleToggleBookmark}
          style={styles.iconBtn}
          disabled={!!isNew}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isBookmarked ? '#FF8C42' : '#333'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* COVER IMAGE */}
        <Image
          source={{ uri: displayImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />

        {/* RESTAURANT INFO */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            {restaurant.top_rank_this_week && restaurant.top_rank_this_week > 0 && (
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>Top {restaurant.top_rank_this_week}</Text>
              </View>
            )}
            {/* "Quán mới" badge — only for newly added restaurants */}
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>Quán mới 🌟</Text>
              </View>
            )}
          </View>

          <Text style={styles.subtitle}>
            {cuisineText}{categoryText ? ` | ${categoryText}` : ''}
          </Text>

          {/* ADDRESS */}
          <TouchableOpacity style={styles.addressRow} onPress={openGoogleMaps}>
            <Ionicons name="location" size={18} color="#4A90E2" />
            <Text style={styles.addressText}>{restaurant.address}</Text>
            <Text style={styles.mapsLink}>Mở Google Maps</Text>
          </TouchableOpacity>

          {/* OPENING HOURS */}
          {restaurant.opening_hours && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.infoText}>{restaurant.opening_hours}</Text>
            </View>
          )}

          {/* PRICE RANGE */}
          {restaurant.price_range && (
            <View style={styles.infoRow}>
              <Text style={styles.priceSymbol}>₫₫</Text>
              <Text style={styles.infoText}>{restaurant.price_range}</Text>
            </View>
          )}
        </View>

        {/* LANDMARK NOTES BUTTON */}
        {hasLandmarkNotes && (
          <TouchableOpacity
            style={styles.landmarkButton}
            onPress={() => setShowLandmarkModal(true)}
          >
            <Ionicons name="compass" size={20} color="#FF8C42" />
            <Text style={styles.landmarkButtonText}>
              Xem hướng dẫn cách đi ({landmarkNotes.length})
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#FF8C42" />
          </TouchableOpacity>
        )}

        {/* REVIEWS SECTION */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>User reviews</Text>
            <Text style={styles.reviewCount}>({totalReviews} reviews)</Text>
            {/* Hide "+ Review" for unverified new restaurants */}
            {!isNew && (
              <TouchableOpacity style={styles.addReviewBtn}>
                <Text style={styles.addReviewText}>+ Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── NEW RESTAURANT EMPTY STATE ─────────────────────────────── */}
          {isNewRestaurant ? (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#DDD" />
              <Text style={styles.noReviewsText}>Chưa có đánh giá nào</Text>
              <Text style={styles.noReviewsSubtext}>
                Quán này vừa được thêm vào Dishcovery.{'\n'}
                Hãy là người đầu tiên đánh giá! 🌟
              </Text>

              {/* CTA — disabled until restaurant is verified in DB */}
              <TouchableOpacity
                style={[styles.firstReviewBtn, isNew && styles.firstReviewBtnDisabled]}
                disabled={!!isNew}
              >
                <Ionicons name="star-outline" size={15} color="#fff" />
                <Text style={styles.firstReviewBtnText}>
                  {isNew ? 'Đang chờ xác minh...' : 'Viết đánh giá đầu tiên'}
                </Text>
              </TouchableOpacity>

              {/* Posts count hint */}
              {(restaurant.posts_count ?? 0) > 0 && (
                <View style={styles.postsHint}>
                  <Ionicons name="images-outline" size={13} color="#888" />
                  <Text style={styles.postsHintText}>
                    {restaurant.posts_count} bài viết đã đề cập quán này
                  </Text>
                </View>
              )}
            </View>

          ) : (
            /* ── EXISTING RESTAURANT — rating summary + reviews ───────── */
            <>
              {/* RATING SUMMARY */}
              <View style={styles.ratingSummary}>
                <View style={styles.ratingBigNumber}>
                  <Text style={styles.bigRatingText}>{averageRating.toFixed(2)}</Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons
                        key={i}
                        name="star"
                        size={14}
                        color={i <= Math.floor(averageRating) ? '#FFD700' : '#DDD'}
                      />
                    ))}
                  </View>
                </View>

                {/* RATING BARS */}
                <View style={styles.ratingBars}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count      = ratingDistribution[star] || 0;
                    const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                    return (
                      <View key={star} style={styles.barRow}>
                        <Text style={styles.barLabel}>{star}</Text>
                        <Ionicons name="star" size={10} color="#FFD700" />
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${percentage}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* REVIEW LIST */}
              {reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <View key={review.id || index} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Image
                        source={{ uri: review.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.username || 'User')}` }}
                        style={styles.userAvatar}
                      />
                      <View style={styles.reviewUserInfo}>
                        <Text style={styles.userName}>{review.user?.username || 'Anonymous User'}</Text>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Ionicons
                              key={s}
                              name="star"
                              size={12}
                              color={s <= (review.rating || 0) ? '#FFD700' : '#EEE'}
                            />
                          ))}
                          <Text style={styles.reviewTime}>{formatTimeAgo(review.created_at)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity>
                        <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
                      </TouchableOpacity>
                    </View>

                    {review.title && (
                      <Text style={styles.reviewTitle}>{review.title}</Text>
                    )}

                    <Text style={styles.reviewText}>{review.content || review.text || 'No content'}</Text>

                    {review.images && review.images.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesScroll}>
                        {review.images.map((img, idx) => (
                          <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
                        ))}
                      </ScrollView>
                    )}

                    {review.dish_name && (
                      <View style={styles.dishTag}>
                        <Text style={styles.dishLabel}>Món ăn đã: {review.dish_name}</Text>
                        {review.dish_price && (
                          <Text style={styles.dishPrice}>₫₫ {review.dish_price}</Text>
                        )}
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noReviewsContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#DDD" />
                  <Text style={styles.noReviewsText}>Chưa có đánh giá nào</Text>
                  <Text style={styles.noReviewsSubtext}>Hãy là người đầu tiên đánh giá quán này!</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* LANDMARK NOTES MODAL */}
      <Modal
        visible={showLandmarkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLandmarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hướng dẫn đường đi</Text>
              <TouchableOpacity onPress={() => setShowLandmarkModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAddress}>
              <Ionicons name="location" size={18} color="#4A90E2" />
              <Text style={styles.modalAddressText}>{restaurant.address}</Text>
            </View>

            <ScrollView style={styles.modalNotesList}>
              <Text style={styles.notesLabel}>Note(s):</Text>
              {landmarkNotes.map((note, index) => (
                <View key={note.id || index} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    {note.verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.noteText}>{note.text}</Text>
                  {note.user && (
                    <View style={styles.noteAuthorRow}>
                      <Image
                        source={{ uri: note.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(note.user.username)}` }}
                        style={styles.noteAuthorAvatar}
                      />
                      <Text style={styles.noteAuthor}>{note.user.username}</Text>
                    </View>
                  )}
                  {note.helpful_count && note.helpful_count > 0 && (
                    <Text style={styles.helpfulText}>
                      👍 {note.helpful_count} người thấy hữu ích
                    </Text>
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
    </SafeAreaView>
  );
}

// ── Styles — your original, untouched ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20 },
  coverImage: { width: width, height: 300, backgroundColor: '#F0F0F0' },
  infoSection: { padding: 20, borderBottomWidth: 8, borderBottomColor: '#F5F5F5' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  restaurantName: { fontSize: 22, fontWeight: 'bold', color: '#111', flex: 1 },
  topBadge: { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  topBadgeText: { fontWeight: 'bold', fontSize: 11, color: '#fff' },
  // ── NEW: badge for newly added restaurants
  newBadge: { backgroundColor: '#FF8C42', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 6 },
  newBadgeText: { fontWeight: 'bold', fontSize: 11, color: '#fff' },
  subtitle: { color: '#666', fontSize: 13, marginBottom: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  addressText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },
  mapsLink: { fontSize: 12, color: '#4A90E2', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 13, color: '#666' },
  priceSymbol: { fontSize: 16, fontWeight: 'bold', color: '#FF8C42' },
  landmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 15,
    backgroundColor: '#FFF9F0',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  landmarkButtonText: { fontSize: 15, fontWeight: '600', color: '#FF8C42' },
  reviewsSection: { paddingHorizontal: 20, paddingTop: 20 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  reviewCount: { fontSize: 14, color: '#999', marginLeft: 6, flex: 1 },
  addReviewBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  addReviewText: { color: '#FF8C42', fontSize: 14, fontWeight: '600' },
  ratingSummary: { flexDirection: 'row', marginBottom: 24, gap: 20 },
  ratingBigNumber: { alignItems: 'center' },
  bigRatingText: { fontSize: 40, fontWeight: 'bold', color: '#333' },
  starRow: { flexDirection: 'row', marginTop: 4 },
  ratingBars: { flex: 1, justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  barLabel: { fontSize: 11, color: '#666', width: 8, marginRight: 4 },
  barBg: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginLeft: 6 },
  barFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },
  reviewItem: { marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0' },
  reviewUserInfo: { flex: 1, marginLeft: 10 },
  userName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  reviewStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewTime: { fontSize: 11, color: '#999', marginLeft: 6 },
  reviewTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6 },
  reviewText: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 10 },
  reviewImagesScroll: { marginBottom: 10 },
  reviewImage: { width: 200, height: 150, borderRadius: 12, marginRight: 10, backgroundColor: '#F0F0F0' },
  dishTag: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F9F9F9', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between' },
  dishLabel: { fontSize: 12, color: '#666' },
  dishPrice: { fontSize: 12, fontWeight: '600', color: '#333' },

  // ── Empty / no reviews state ──────────────────────────────────────────────
  noReviewsContainer: { alignItems: 'center', paddingVertical: 40 },
  noReviewsText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 12 },
  noReviewsSubtext: { fontSize: 13, color: '#999', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // ── NEW: first-review CTA button (only for new restaurants) ──────────────
  firstReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8C42',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  firstReviewBtnDisabled: { backgroundColor: '#CCC' },
  firstReviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── NEW: posts hint pill ──────────────────────────────────────────────────
  postsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  postsHintText: { fontSize: 12, color: '#888' },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  modalAddress: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#F9F9F9', borderRadius: 10, marginBottom: 20 },
  modalAddressText: { flex: 1, fontSize: 13, color: '#4A90E2', lineHeight: 18 },
  modalNotesList: { maxHeight: 300 },
  notesLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  noteItem: { backgroundColor: '#FFF9F0', padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#FF8C42' },
  noteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F8F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  verifiedText: { fontSize: 10, color: '#00B894', fontWeight: '600' },
  noteText: { fontSize: 13, color: '#333', lineHeight: 18, marginBottom: 8 },
  noteAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  noteAuthorAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#E0E0E0' },
  noteAuthor: { fontSize: 11, color: '#666', fontWeight: '500' },
  helpfulText: { fontSize: 11, color: '#999', marginTop: 6 },
  modalCloseBtn: { backgroundColor: '#FF8C42', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  modalCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
