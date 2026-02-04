import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../../../services/dataService';
import { Restaurant, RestaurantStackParamList } from '../../../types';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props { navigation: NavigationProp; }

export default function RestaurantsHomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // States dữ liệu
  const [topTen, setTopTen] = useState<Restaurant[]>([]);
  const [communityNew, setCommunityNew] = useState<Restaurant[]>([]);
  const [categoriesData, setCategoriesData] = useState<{ [key: string]: Restaurant[] }>({});
  
  // States Filter
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const loadAllData = async () => {
    try {
      setLoading(true);
      // 1. Lấy Top 10 (Luôn ưu tiên)
      const dTop = await dataService.getTopTen();
      setTopTen(dTop);

      // 2. Lấy quán mới từ Community (Giả lập lấy từ category chung hoặc mới nhất)
      const dComm = await dataService.getRestaurantsByCategory('vietnamese', 1, 6); 
      setCommunityNew(dComm);

      // 3. Lấy các Category khác
      const cats = ['international', 'street-food', 'cafe'];
      const results = await Promise.all(cats.map(c => dataService.getRestaurantsByCategory(c as any, 1, 8)));
      
      const mapped: { [key: string]: Restaurant[] } = {};
      cats.forEach((c, i) => { mapped[c] = results[i]; });
      setCategoriesData(mapped);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAllData(); }, []);

  // Logic Toggle Filter
  const toggleFilterBar = () => {
    const toValue = showFilters ? 0 : 50;
    if (!showFilters) setShowFilters(true);
    Animated.timing(filterAnim, { toValue, duration: 250, useNativeDriver: false }).start(() => {
      if (showFilters) setShowFilters(false);
    });
  };

  const applyFilters = (data: Restaurant[]) => {
    if (activeFilters.length === 0) return data;
    return data.filter(item => {
      if (activeFilters.includes('rating') && item.rating < 4.5) return false;
      if (activeFilters.includes('cheap') && item.priceRange !== '₫') return false;
      if (activeFilters.includes('verified') && item.status !== 'verified') return false;
      return true;
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF8C42" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logo}>Dishcovery</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search-outline" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, activeFilters.length > 0 && {backgroundColor: '#FF8C42'}]} onPress={toggleFilterBar}>
            <Ionicons name="filter-outline" size={22} color={activeFilters.length > 0 ? '#fff' : '#333'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTER BAR (ANIMATED) */}
      {showFilters && (
        <Animated.View style={[styles.filterBar, { height: filterAnim }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}>
            {['rating', 'cheap', 'verified', 'open'].map(id => (
              <TouchableOpacity 
                key={id} 
                onPress={() => setActiveFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                style={[styles.chip, activeFilters.includes(id) && styles.chipActive]}
              >
                <Text style={[styles.chipText, activeFilters.includes(id) && styles.chipTextActive]}>
                  {id === 'rating' ? '4.5+ ⭐' : id === 'cheap' ? 'Giá rẻ' : id === 'verified' ? 'Xác thực' : 'Đang mở'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAllData} />}>
        
        {/* === SECTION 1: TOP 10 (LUÔN Ở ĐẦU) === */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Top 10 Thịnh Hành</Text>
            <TouchableOpacity style={styles.topTenBtn} onPress={() => navigation.navigate('TopTen')}>
              <Text style={styles.topTenBtnText}>Xem BXH</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={topTen}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.topCard} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}>
                <Image source={{ uri: item.photos?.[0] }} style={styles.topImage} />
                <View style={styles.rankBadge}><Text style={styles.rankText}>{item.topRankThisWeek}</Text></View>
                <View style={styles.topOverlay}>
                  <Text style={styles.topName} numberOfLines={1}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* === SECTION 2: MỚI TỪ CỘNG ĐỒNG === */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Mới từ Cộng đồng</Text>
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
          </View>
          <FlatList
            data={communityNew}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.commCard} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}>
                <Image source={{ uri: item.photos?.[0] }} style={styles.commImage} />
                <View style={styles.commInfo}>
                  <Text style={styles.commName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.commUser}>bởi Người dùng @{item.id}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* === SECTION 3: CÁC CATEGORY KHÁC === */}
        {Object.keys(categoriesData).map(catId => {
          const data = applyFilters(categoriesData[catId]);
          if (data.length === 0) return null;
          return (
            <View key={catId} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{catId === 'international' ? '🌎 Quốc Tế' : catId === 'street-food' ? '🍡 Ăn Vặt' : '☕ Cà Phê'}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Category', { type: 'category', category: catId as any, title: 'Khám phá' })}>
                  <Text style={styles.seeAll}>Tất cả</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={data}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resCard} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}>
                    <Image source={{ uri: item.photos?.[0] }} style={styles.resImage} />
                    <View style={styles.resInfo}>
                      <Text style={styles.resName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.resSub}>⭐ {item.rating} • {item.priceRange}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  logo: { fontSize: 26, fontWeight: '900', color: '#FF8C42' },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },

  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 8 },
  chipActive: { backgroundColor: '#FF8C42' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#fff' },

  section: { marginTop: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#222' },
  seeAll: { color: '#999', fontSize: 12, fontWeight: '600' },
  topTenBtn: { backgroundColor: '#FF8C42', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  topTenBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  newBadge: { backgroundColor: '#FFEDD5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: '#FF8C42', fontSize: 10, fontWeight: '900' },

  topCard: { width: 140, height: 200, marginRight: 15, borderRadius: 20, overflow: 'hidden' },
  topImage: { width: '100%', height: '100%' },
  rankBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#FF8C42', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rankText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  topOverlay: { position: 'absolute', bottom: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', width: '100%' },
  topName: { color: '#fff', fontWeight: '700', fontSize: 13 },

  commCard: { width: 180, marginRight: 15, borderRadius: 15, backgroundColor: '#F9F9F9', overflow: 'hidden', borderWidth: 1, borderColor: '#EEE' },
  commImage: { width: '100%', height: 100 },
  commInfo: { padding: 10 },
  commName: { fontWeight: '700', fontSize: 14 },
  commUser: { fontSize: 11, color: '#999', marginTop: 2 },

  resCard: { width: 150, marginRight: 15 },
  resImage: { width: '100%', height: 100, borderRadius: 15, backgroundColor: '#F0F0F0' },
  resInfo: { marginTop: 8 },
  resName: { fontWeight: '700', fontSize: 14 },
  resSub: { fontSize: 12, color: '#777' }
});