import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  RestaurantStackParamList,
  FrontendFilters,
} from '../../../types/restaurant';
import FilterModal from './filter-modal';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;

interface Props {
  navigation: NavigationProp;
}

// ─── Cuisine categories — each id is the slug sent to
//     GET /restaurants/category/:category (backend SLUG_MAP handles it)
const CUISINE_CATEGORIES = [
  { id: 'mon-viet',  label: 'Món Việt',  flag: '🇻🇳', color: '#FFE5E5' },
  { id: 'mon-thai',  label: 'Món Thái',  flag: '🇹🇭', color: '#E5F3FF' },
  { id: 'mon-han',   label: 'Món Hàn',   flag: '🇰🇷', color: '#FFF5E5' },
  { id: 'mon-au-my', label: 'Món Âu-Mỹ', flag: '🇺🇸', color: '#F0E5FF' },
  { id: 'mon-nhat',  label: 'Món Nhật',  flag: '🇯🇵', color: '#FFE5F5' },
  { id: 'mon-trung', label: 'Món Trung', flag: '🇨🇳', color: '#E5FFF0' },
  { id: 'mon-an',    label: 'Món Ấn',    flag: '🇮🇳', color: '#FFF8E5' },
  { id: 'khac',      label: 'Khác',      flag: '🌍', color: '#F5F5F5' },
];

export default function RestaurantsHomeScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [activeFilters, setActiveFilters] = useState<FrontendFilters>({
    priceRanges: [],
    cuisines: [],
    ratings: [],
  });

  const hasActiveFilters =
    activeFilters.priceRanges.length > 0 ||
    activeFilters.cuisines.length > 0 ||
    activeFilters.ratings.length > 0;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleApplyFilters = (filters: FrontendFilters) => {
    setActiveFilters(filters);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khám phá</Text>
        <TouchableOpacity onPress={() => { /* Notifications */ }}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF8C42"
            colors={['#FF8C42']}
          />
        }
      >
        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('RestaurantSearch')}
          >
            <Ionicons name="search" size={20} color="#999" />
            <Text style={styles.searchPlaceholder}>
              Search for name, restaurants...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>

        {/* TOP 10 BANNER */}
        <TouchableOpacity
          style={styles.topBanner}
          onPress={() => navigation.navigate('Top10')}
          activeOpacity={0.9}
        >
          <View style={styles.topBannerContent}>
            <View>
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>TOP 10</Text>
              </View>
              <Text style={styles.topBannerTitle}>Quán ăn</Text>
              <Text style={styles.topBannerSubtitle}>NỔI BẬT NHẤT TUẦN NÀY</Text>
              <TouchableOpacity
                  style={styles.topBannerButton}
                  onPress={() => navigation.navigate('Top10')}
                >
                  <Text style={styles.topBannerButtonText}>
                    Khám phá hơn →
                  </Text>
                </TouchableOpacity>
            </View>
            <Image
              source={require('../../../assets/images/restaurant-house.png')}
              style={styles.topBannerImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        {/* HÔM NAY ĂN GÌ? — Cuisine category grid (tap → Category screen) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hôm nay ăn gì?</Text>
          <View style={styles.cuisineGrid}>
            {CUISINE_CATEGORIES.map((cuisine) => (
              <TouchableOpacity
                key={cuisine.id}
                style={[styles.cuisineCard, { backgroundColor: cuisine.color }]}
                onPress={() =>
                  navigation.navigate('Category', {
                    type: 'category',
                    category: cuisine.id,   // slug e.g. 'mon-viet'
                    title: cuisine.label,
                  })
                }
              >
                <Text style={styles.cuisineFlag}>{cuisine.flag}</Text>
                <Text style={styles.cuisineLabel}>{cuisine.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FF8C42' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchPlaceholder: { flex: 1, color: '#999', fontSize: 14 },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: '#FF8C42' },
  topBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFF5E5',
    borderRadius: 20,
    padding: 20,
  },
  topBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBadge: {
    backgroundColor: '#FF8C42',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  topBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  topBannerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  topBannerSubtitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF8C42',
    marginVertical: 4,
  },
  topBannerButton: { marginTop: 12 },
  topBannerButtonText: { color: '#FF8C42', fontSize: 14, fontWeight: '600' },
  topBannerImage: { width: 100, height: 100 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  cuisineCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  cuisineFlag: { fontSize: 32 },
  cuisineLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  orangeVerticalLine: {
    width: 4,
    height: 20,
    backgroundColor: '#FF8C42',
    borderRadius: 2,
    marginRight: 8,
  },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: '#FF8C42' },
  seeMoreText: { fontSize: 12, color: '#999', fontWeight: '500' },
});