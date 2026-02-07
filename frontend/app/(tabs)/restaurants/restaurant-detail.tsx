import React, { useState, useCallback } from 'react';
import {
  View,
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
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import dataService from '../../../services/Api.service';
import { Restaurant, RestaurantStackParamList } from '../../../types/restaurant';
import { COLORS } from '../../../constants/theme';

const { width } = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props {
  navigation: NavigationProp;
  route: { params: { restaurantId: string; }; };
}

export default function RestaurantDetailScreen({ navigation, route }: Props) {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [landmarkNotes, setLandmarkNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Collapsible section for landmark guide
  const [isLandmarkExpanded, setIsLandmarkExpanded] = useState(false);
  
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRestaurant = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dataService.getRestaurantById(restaurantId);
      setRestaurant(data);
      setIsBookmarked(!!(data as any).is_saved);
      
      // Load landmark notes
      const notes = await dataService.getRestaurantLandmarkNotes(restaurantId);
      setLandmarkNotes(notes);
    } catch (error) {
      console.error('Error loading restaurant:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      loadRestaurant();
    }, [loadRestaurant])
  );

  const handleToggleBookmark = async () => {
    if (!restaurant) return;
    try {
      if (isBookmarked) {
        await dataService.unsaveRestaurant(restaurant.id);
      } else {
        await dataService.saveRestaurant(restaurant.id);
      }
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const copyToClipboard = async () => {
    if (restaurant?.address) {
      await Clipboard.setStringAsync(restaurant.address);
      Alert.alert("Thành công", "Đã sao chép địa chỉ!");
    }
  };

  const openGoogleMaps = () => {
    if (!restaurant) return;
    
    // Use the helper method from API service
    const url = dataService.getGoogleMapsDirectionsUrl(
      restaurant.latitude,
      restaurant.longitude,
      restaurant.name
    );
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening maps:', err);
      Alert.alert('Lỗi', 'Không thể mở Google Maps');
    });
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn số sao đánh giá.");
      return;
    }
    try {
      setSubmitting(true);
      // TODO: Implement review submission when backend is ready
      // await dataService.postReview(restaurantId, { rating: userRating, text: reviewText });
      Alert.alert("Thành công", "Cảm ơn bạn đã chia sẻ trải nghiệm!");
      setReviewText('');
      setUserRating(0);
      loadRestaurant(); 
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const displayImages = restaurant.photos?.length ? restaurant.photos : (restaurant.images || []);
  const hasLandmarkNotes = landmarkNotes && landmarkNotes.length > 0;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleBookmark} style={styles.iconBtn}>
          <Ionicons 
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
            size={24} 
            color={isBookmarked ? COLORS.primary : '#333'} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGE GALLERY */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {displayImages.map((img: string, index: number) => (
            <Image key={index} source={{ uri: img }} style={styles.galleryImage} />
          ))}
        </ScrollView>

        {/* RESTAURANT IDENTITY */}
        <View style={styles.identitySection}>
          <View style={styles.nameRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            {restaurant.top_rank_this_week && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>Top {restaurant.top_rank_this_week}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {restaurant.cuisine?.join(' • ') || 'Đang cập nhật'} | Quán Núp Hẻm
          </Text>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={openGoogleMaps}>
            <Ionicons name="navigate-circle" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Chỉ đường</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setIsLandmarkExpanded(!isLandmarkExpanded)}
          >
            <Ionicons name="map-outline" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Hướng dẫn đi</Text>
          </TouchableOpacity>
        </View>

        {/* COLLAPSIBLE LANDMARK GUIDE */}
        {isLandmarkExpanded && (
          <View style={styles.landmarkSection}>
            <View style={styles.landmarkHeader}>
              <Ionicons name="compass" size={20} color="#FF8C42" />
              <Text style={styles.landmarkTitle}>Hướng dẫn cách đi</Text>
              <TouchableOpacity onPress={() => setIsLandmarkExpanded(false)}>
                <Ionicons name="chevron-up" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.landmarkContent}>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={18} color="#4A90E2" />
                <Text style={styles.addressTextInLandmark}>{restaurant.address}</Text>
              </View>

              {hasLandmarkNotes ? (
                <View style={styles.landmarkNotesContainer}>
                  {landmarkNotes.map((note, index) => (
                    <View key={note.id || index} style={styles.landmarkNoteItem}>
                      <View style={styles.noteHeader}>
                        <Ionicons name="person-circle" size={16} color="#666" />
                        <Text style={styles.noteAuthor}>
                          {note.user?.username || 'Người dùng'}
                        </Text>
                        {note.verified && (
                          <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                        )}
                      </View>
                      <Text style={styles.noteText}>{note.text}</Text>
                      {note.helpful_count > 0 && (
                        <Text style={styles.helpfulText}>
                          👍 {note.helpful_count} người thấy hữu ích
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noNotesContainer}>
                  <Ionicons name="information-circle-outline" size={24} color="#999" />
                  <Text style={styles.noNotesText}>
                    Chưa có hướng dẫn cho quán này
                  </Text>
                  <Text style={styles.noNotesSubtext}>
                    Bạn có thể thêm hướng dẫn sau khi ghé thăm!
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.openMapsButton} onPress={openGoogleMaps}>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.openMapsButtonText}>Mở Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* BASIC INFO */}
        <View style={styles.addressContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#333" />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressText}>{restaurant.address}</Text>
              <View style={{ flexDirection: 'row', gap: 15, marginTop: 5 }}>
                <TouchableOpacity onPress={openGoogleMaps}>
                  <Text style={styles.linkText}>Mở Google Maps</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={copyToClipboard}>
                  <Text style={styles.linkText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#333" />
            <Text style={styles.infoValue}>
              {restaurant.opening_hours || '08:00 - 20:00'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="wallet-outline" size={20} color="#333" />
            <Text style={styles.infoValue}>
              {restaurant.price_range || '₫₫'}
            </Text>
          </View>
        </View>

        {/* REVIEWS SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            Đánh giá <Text style={styles.reviewCount}>({restaurant.rating_count || 0})</Text>
          </Text>

          <View style={styles.ratingSummary}>
            <View style={styles.ratingBigNumber}>
              <Text style={styles.bigRatingText}>
                {restaurant.rating?.toFixed(1) || '0.0'}
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons 
                    key={s} 
                    name="star" 
                    size={14} 
                    color={s <= (restaurant.rating || 0) ? "#FFD700" : "#EEE"} 
                  />
                ))}
              </View>
            </View>
            
            <View style={styles.ratingBars}>
              {[5, 4, 3, 2, 1].map((num) => (
                <View key={num} style={styles.barRow}>
                  <Text style={styles.barLabel}>{num}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(num/5)*80}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* REVIEW FORM */}
          <View style={styles.inlineFormCard}>
            <Text style={styles.formTitle}>Viết đánh giá của bạn</Text>
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setUserRating(s)}>
                  <Ionicons 
                    name={s <= userRating ? "star" : "star-outline"} 
                    size={32} 
                    color={s <= userRating ? "#FFD700" : "#CCC"} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Chia sẻ cảm nhận của bạn..."
              multiline
              value={reviewText}
              onChangeText={setReviewText}
            />
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSubmitReview} 
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi đánh giá</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* EXISTING REVIEWS */}
          {restaurant.top_reviews?.map((review: any) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewUserRow}>
                <Image 
                  source={{ uri: review.user.avatar || 'https://via.placeholder.com/40' }} 
                  style={styles.userAvatar} 
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{review.user.username}</Text>
                  <View style={styles.starRowSmall}>
                    {[1,2,3,4,5].map(s => (
                      <Ionicons 
                        key={s} 
                        name="star" 
                        size={12} 
                        color={s <= review.rating ? "#FFD700" : "#EEE"} 
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerNav: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    zIndex: 10 
  },
  iconBtn: { padding: 6 },
  galleryImage: { width: width, height: 300 },
  identitySection: { padding: 20 },
  nameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  restaurantName: { fontSize: 24, fontWeight: 'bold', color: '#111', flex: 1 },
  subtitle: { color: '#666', fontSize: 14, marginTop: 4 },
  rankBadge: { 
    backgroundColor: '#FFD700', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  rankText: { fontWeight: 'bold', fontSize: 12, color: '#fff' },
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-evenly', 
    paddingVertical: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  actionButton: { alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  
  // LANDMARK SECTION
  landmarkSection: {
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#FFF9F0',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFE4CC',
    overflow: 'hidden',
  },
  landmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4CC',
  },
  landmarkTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  landmarkContent: {
    padding: 15,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 15,
  },
  addressTextInLandmark: {
    flex: 1,
    fontSize: 14,
    color: '#4A90E2',
    lineHeight: 20,
  },
  landmarkNotesContainer: {
    gap: 12,
    marginBottom: 15,
  },
  landmarkNoteItem: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C42',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  helpfulText: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
  noNotesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noNotesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  noNotesSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C42',
    padding: 14,
    borderRadius: 10,
  },
  openMapsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // INFO SECTION
  addressContainer: { padding: 20, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addressText: { fontSize: 14, color: '#444', flex: 1, lineHeight: 20 },
  linkText: { color: '#2563eb', fontSize: 13, fontWeight: '500' },
  infoValue: { color: '#666', fontSize: 14 },
  
  // REVIEWS SECTION
  sectionContainer: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  reviewCount: { color: '#999', fontSize: 14 },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  ratingBigNumber: { alignItems: 'center', marginRight: 30 },
  bigRatingText: { fontSize: 44, fontWeight: 'bold', color: '#333' },
  starRow: { flexDirection: 'row', marginTop: 5 },
  ratingBars: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  barLabel: { fontSize: 11, color: '#666', width: 10 },
  barBg: { 
    flex: 1, 
    height: 5, 
    backgroundColor: '#F0F0F0', 
    borderRadius: 3, 
    marginLeft: 10 
  },
  barFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },
  inlineFormCard: { 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    padding: 15, 
    borderWidth: 1, 
    borderColor: '#EEE', 
    marginVertical: 20 
  },
  formTitle: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: '#333', 
    textAlign: 'center' 
  },
  starPickerRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 12, 
    marginBottom: 15 
  },
  reviewInput: { 
    backgroundColor: '#F9F9F9', 
    borderRadius: 10, 
    padding: 12, 
    height: 70, 
    textAlignVertical: 'top', 
    fontSize: 14, 
    borderWidth: 1, 
    borderColor: '#F0F0F0' 
  },
  submitBtn: { 
    backgroundColor: COLORS.primary, 
    borderRadius: 10, 
    padding: 14, 
    alignItems: 'center', 
    marginTop: 15 
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  reviewItem: { marginBottom: 20 },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  userInfo: { flex: 1 },
  userName: { fontWeight: 'bold', fontSize: 14 },
  starRowSmall: { flexDirection: 'row' },
  reviewText: { color: '#555', fontSize: 14, lineHeight: 20 },
});