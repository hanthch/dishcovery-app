import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../../../services/dataService';
import { Restaurant, RestaurantStackParamList, LandmarkNote } from '../../../types/restaurant';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props {
  navigation: NavigationProp;
  route: { params: { restaurantId: string; }; };
}

export default function RestaurantDetailScreen({ navigation, route }: Props) {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showLandmarkGuide, setShowLandmarkGuide] = useState(false);

  useEffect(() => {
    loadRestaurant();
  }, [restaurantId]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const [data, bookmarked] = await Promise.all([
        dataService.getRestaurantById(restaurantId),
        dataService.isBookmarked ? dataService.isBookmarked(restaurantId) : false
      ]);
      setRestaurant(data);
      setIsBookmarked(!!bookmarked);
    } catch (error) {
      console.error('Error loading restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!restaurant) return;
    try {
      if (isBookmarked) {
        await dataService.removeBookmark?.(restaurant.id);
      } else {
        await dataService.addBookmark?.(restaurant.id);
      }
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const openMaps = () => {
    if (restaurant?.mapsUrl) {
      Linking.openURL(restaurant.mapsUrl);
    } else if (restaurant) {
      const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  if (loading || !restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  const displayImages = restaurant.photos?.length ? restaurant.photos : (restaurant.images || []);
  const landmarkNoteText = typeof restaurant.landmarkNotes === 'string'
    ? restaurant.landmarkNotes
    : restaurant.landmarkNotes?.map((note: string | LandmarkNote) => 
        typeof note === 'string' ? note : note.text
      ).join(' • ');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* LANDMARK MODAL - Giống Screenshot 131024 */}
      <Modal transparent visible={showLandmarkGuide} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.landmarkPopup}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Hướng dẫn đường đi</Text>
              <TouchableOpacity onPress={() => setShowLandmarkGuide(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.popupAddressRow}>
                <Ionicons name="location" size={18} color="#4A90E2" />
                <Text style={styles.popupAddressText} numberOfLines={1}>{restaurant.address}</Text>
            </View>

            <Text style={styles.popupLabel}>Note(s):</Text>
            <View style={styles.popupNoteBox}>
                <Text style={styles.popupMainText}>{landmarkNoteText || 'Không có hướng dẫn cụ thể'}</Text>
            </View>

            <TouchableOpacity style={styles.popupCloseBtn} onPress={() => setShowLandmarkGuide(false)}>
              <Text style={styles.popupCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HEADER BAR */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="share-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleBookmark} style={styles.iconBtn}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isBookmarked ? '#FF8C42' : '#333'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IDENTITY */}
        <View style={styles.identitySection}>
          <View style={styles.nameRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            {restaurant.topRankThisWeek && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>Top {restaurant.topRankThisWeek}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {restaurant.cuisine?.join(' • ')} | Quán Núp Hẻm
          </Text>
        </View>

        {/* GALLERY */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
          {displayImages.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.galleryImage} />
          ))}
        </ScrollView>

        {/* ADDRESS BOX - Giống Screenshot 130938 */}
        <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={22} color="#333" />
                <View style={styles.addressTextContent}>
                    <Text style={styles.addressText}>{restaurant.address}</Text>
                    <TouchableOpacity onPress={() => setShowLandmarkGuide(true)}>
                        <Text style={styles.landmarkTriggerText}>Cách đi tới đây</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={openMaps}>
                    <Text style={styles.openMapText}>Mở Google Maps</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#333" />
                <Text style={styles.infoValue}>{restaurant.openingHours || '08:00 - 20:00'}</Text>
            </View>
            <View style={styles.infoRow}>
                <Ionicons name="wallet-outline" size={20} color="#333" />
                <Text style={styles.infoValue}>{restaurant.priceRange} ~ 120k VNĐ</Text>
            </View>
        </View>

        {/* USER REVIEWS - Giống Screenshot 232930 */}
        <View style={styles.sectionContainer}>
          <View style={styles.reviewHeaderRow}>
            <Text style={styles.sectionTitle}>User reviews <Text style={styles.reviewCount}>({restaurant.ratingCount} reviews)</Text></Text>
            <TouchableOpacity>
              <Text style={styles.addReviewBtn}>+ Review</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingSummary}>
            <View style={styles.ratingBigNumber}>
              <Text style={styles.bigRatingText}>{restaurant.rating.toFixed(2)}</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name="star" size={14} color="#FFD700" />
                ))}
              </View>
            </View>
            
            <View style={styles.ratingBars}>
              {[5, 4, 3, 2, 1].map((num) => (
                <View key={num} style={styles.barRow}>
                  <Text style={styles.barLabel}>{num}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(num/5)*85}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {restaurant.topReviews?.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewUserRow}>
                <Image source={{ uri: review.user.avatar }} style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{review.user.username}</Text>
                  <View style={styles.starRowSmall}>
                     {[1,2,3,4,5].map(s => (
                       <Ionicons key={s} name="star" size={12} color={s <= review.rating ? "#FFD700" : "#EEE"} />
                     ))}
                     <Text style={styles.reviewTime}>a month ago</Text>
                  </View>
                </View>
                <TouchableOpacity><Ionicons name="ellipsis-horizontal" size={20} color="#999" /></TouchableOpacity>
              </View>
              <Text style={styles.reviewTitle}>Cực kỳ đáng tiền</Text>
              <Text style={styles.reviewText}>{review.text}</Text>
              <Image source={{ uri: displayImages[0] }} style={styles.reviewImage} />
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({ icon, label, value }: { icon: any; label: string; value: string | number; }) {
  return (
    <View style={styles.tileWrapper}>
      <Ionicons name={icon} size={18} color="#FF8C42" />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
  iconBtn: { padding: 6 },
  identitySection: { paddingHorizontal: 20, paddingBottom: 15 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  restaurantName: { fontSize: 28, fontWeight: 'bold', color: '#111', flex: 1 },
  subtitle: { color: '#666', fontSize: 14, marginTop: 4 },
  rankBadge: { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rankText: { fontWeight: 'bold', fontSize: 13, color: '#fff' },
  mediaScroll: { marginBottom: 20 },
  galleryImage: { width: width, height: 260, marginRight: 2 },
  addressContainer: { paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 20 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  addressTextContent: { flex: 1, marginHorizontal: 10 },
  addressText: { fontSize: 15, color: '#333', lineHeight: 20 },
  landmarkTriggerText: { color: '#999', fontSize: 13, textDecorationLine: 'underline', marginTop: 4 },
  openMapText: { color: '#4A90E2', fontWeight: '600', fontSize: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  infoValue: { marginLeft: 10, color: '#666', fontSize: 14 },
  sectionContainer: { paddingHorizontal: 20, marginTop: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FF8C42' },
  reviewCount: { color: '#999', fontSize: 13, fontWeight: 'normal' },
  addReviewBtn: { color: '#4A90E2', fontWeight: 'bold' },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  ratingBigNumber: { alignItems: 'center', marginRight: 40 },
  bigRatingText: { fontSize: 48, fontWeight: 'bold', color: '#333' },
  starRow: { flexDirection: 'row', marginTop: 5 },
  ratingBars: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  barLabel: { fontSize: 12, color: '#4A90E2', width: 15 },
  barBg: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginLeft: 10 },
  barFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 3 },
  reviewItem: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontWeight: 'bold', fontSize: 15 },
  starRowSmall: { flexDirection: 'row', alignItems: 'center' },
  reviewTime: { fontSize: 12, color: '#999', marginLeft: 10 },
  reviewTitle: { fontWeight: 'bold', fontSize: 16, marginTop: 10 },
  reviewText: { color: '#444', marginTop: 5, lineHeight: 20 },
  reviewImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 25 },
  landmarkPopup: { backgroundColor: '#fff', borderRadius: 25, padding: 25 },
  popupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  popupTitle: { fontSize: 22, fontWeight: 'bold' },
  popupAddressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  popupAddressText: { color: '#4A90E2', marginLeft: 5, flex: 1 },
  popupLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  popupNoteBox: { backgroundColor: '#FFF2D9', padding: 20, borderRadius: 15, marginBottom: 25 },
  popupMainText: { fontSize: 15, color: '#555', lineHeight: 22 },
  popupCloseBtn: { backgroundColor: '#FFB347', padding: 15, borderRadius: 30, alignItems: 'center' },
  popupCloseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tileWrapper: { width: '50%', padding: 10 },
  tileLabel: { fontSize: 12, color: '#999' },
  tileValue: { fontSize: 16, fontWeight: 'bold' },
  reviewHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15 
  },
});