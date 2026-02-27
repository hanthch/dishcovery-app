import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  StatusBar
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import dataService from '../../../services/Api.service';
import { Restaurant, RestaurantStackParamList } from '../../../types/restaurant';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props { navigation: NavigationProp; }

export default function TopTenScreen({ navigation }: Props) {
  const [topTen, setTopTen] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTopTen(); }, []);

  const loadTopTen = async () => {
    try {
      setLoading(true);
      const data = await dataService.getTopTen();
      setTopTen(data);
    } catch (error) {
      console.error('Error loading top 10:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header tiêu đề */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bảng Xếp Hạng</Text>
        <Text style={styles.headerSub}>Top 10 Quán Núp Hẻm Tuần Này</Text>
      </View>

      <FlatList
        data={topTen}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TopTenCard 
            restaurant={item} 
            rank={index + 1} 
            navigation={navigation} 
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function TopTenCard({ restaurant, rank, navigation }: { 
  restaurant: Restaurant; rank: number; navigation: NavigationProp; 
}) {
  // Hàm lấy màu cho Rank
  const getRankStyle = (r: number) => {
    if (r === 1) return { bg: '#FFD700', text: '#fff' }; // Gold
    if (r === 2) return { bg: '#C0C0C0', text: '#fff' }; // Silver
    if (r === 3) return { bg: '#CD7F32', text: '#fff' }; // Bronze
    return { bg: '#F5F5F5', text: '#666' };
  };

  const rankStyle = getRankStyle(rank);
  const displayImage = restaurant.photos?.[0] || restaurant.images?.[0];

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('RestaurantDetail', { 
        restaurantId: restaurant.id,
        restaurantName: restaurant.name 
      })}
      activeOpacity={0.9}
      style={styles.card}
    >
      {/* Rank Badge */}
      <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
        <Text style={[styles.rankText, { color: rankStyle.text }]}>{rank}</Text>
      </View>

      <View style={styles.cardContent}>
        {/* Ảnh quán */}
        {/* cover_image / photos[0] = Supabase Storage public URL */}
        {displayImage ? (
          <Image source={{ uri: displayImage }} style={styles.restaurantImg} />
        ) : (
          <View style={[styles.restaurantImg, styles.imgFallback]}>
            <Ionicons name="restaurant-outline" size={28} color="#CCC" />
          </View>
        )}
        
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>{restaurant.name}</Text>
            {restaurant.verified && (
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
            )}
          </View>

          <Text style={styles.cuisineText}>
            {restaurant.cuisine?.join(', ')} • {restaurant.price_range}
          </Text>

          <View style={styles.statsRow}>
             <View style={styles.statItem}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.statValue}>{restaurant.rating}</Text>
                <Text style={styles.statLabel}>({restaurant.rating_count})</Text>
             </View>
             <View style={styles.statItem}>
                <Ionicons name="flame" size={12} color="#FF8C42" />
                <Text style={styles.statValue}>{restaurant.weekly_activity || 0}</Text>
             </View>
          </View>

          {/* Landmark Mini Note */}
          {restaurant.landmark_notes && (
            <View style={styles.landmarkMini}>
              <Text style={styles.landmarkMiniText} numberOfLines={1}>
                🧭 {typeof restaurant.landmark_notes === 'string' 
                      ? restaurant.landmark_notes 
                      : restaurant.landmark_notes[0]?.text}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#111' },
  headerSub: { fontSize: 14, color: '#999', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#fff'
  },
  rankText: { fontWeight: '900', fontSize: 14 },
  cardContent: { flexDirection: 'row', padding: 12 },
  restaurantImg: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#eee' },
  infoContainer: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nameText: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  cuisineText: { fontSize: 12, color: '#888', marginVertical: 4 },
  statsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue: { fontSize: 12, fontWeight: '700', color: '#444' },
  statLabel: { fontSize: 11, color: '#999' },
  landmarkMini: { 
    backgroundColor: '#FFF9F0', 
    padding: 6, 
    borderRadius: 6, 
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C42'
  },
  landmarkMiniText: { fontSize: 10, color: '#856404', fontWeight: '500' },
  imgFallback: { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
});
