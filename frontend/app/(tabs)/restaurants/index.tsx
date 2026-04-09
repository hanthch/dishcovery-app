import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  RestaurantStackParamList,
  FrontendFilters,
  convertFiltersToBackendParams,
} from '../../../types/restaurant';
import FilterModal from './filter-modal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;
interface Props { navigation: NavigationProp; }

// ── Data constants ──────────────────────────────────────────────────────────────
const CUISINE_CATEGORIES = [
  { id: 'mon-viet',  label: 'Món Việt',  flag: '🇻🇳', color: '#FFE5E5', accent: '#FF4D4D' },
  { id: 'mon-thai',  label: 'Món Thái',  flag: '🇹🇭', color: '#E5F3FF', accent: '#2196F3' },
  { id: 'mon-han',   label: 'Món Hàn',   flag: '🇰🇷', color: '#FFF5E5', accent: '#FF9800' },
  { id: 'mon-au-my', label: 'Món Âu-Mỹ', flag: '🇺🇸', color: '#F0E5FF', accent: '#9C27B0' },
  { id: 'mon-nhat',  label: 'Món Nhật',  flag: '🇯🇵', color: '#FFE5F5', accent: '#E91E63' },
  { id: 'mon-trung', label: 'Món Trung', flag: '🇨🇳', color: '#E5FFF0', accent: '#4CAF50' },
  { id: 'mon-an',    label: 'Món Ấn',    flag: '🇮🇳', color: '#FFF8E5', accent: '#FF6F00' },
  { id: 'khac',      label: 'Khác',      flag: '🌍',  color: '#F5F5F5', accent: '#607D8B' },
];

const FOOD_SHORTCUTS = [
  { id: 'bun-pho',   label: 'Bún & Phở',   icon: '🍜', color: '#FFF0E0' },
  { id: 'banh-mi',   label: 'Bánh mì',     icon: '🥖', color: '#FFF3E0' },
  { id: 'com-chien', label: 'Cơm & Cháo',  icon: '🍚', color: '#E8F5E9' },
  { id: 'lau-nuong', label: 'Lẩu & Nướng', icon: '🍲', color: '#FBE9E7' },
  { id: 'hai-san',   label: 'Hải sản',     icon: '🦐', color: '#E3F2FD' },
  { id: 'an-vat',    label: 'Ăn vặt',      icon: '🧆', color: '#F3E5F5' },
  { id: 'trang-mieng', label: 'Tráng miệng', icon: '🍮', color: '#FCE4EC' },
  { id: 'chay',      label: 'Món chay',    icon: '🥗', color: '#E8F5E9' },
];

const DRINK_SHORTCUTS = [
  { id: 'cafe',    label: 'Cà phê',  icon: '☕', color: '#EFEBE9' },
  { id: 'tra-sua', label: 'Trà sữa', icon: '🧋', color: '#FCE4EC' },
  { id: 'nuoc-ep', label: 'Nước ép', icon: '🥤', color: '#E8F5E9' },
  { id: 'sinh-to', label: 'Sinh tố', icon: '🍹', color: '#FFF3E0' },
  { id: 'do-uong', label: 'Đồ uống', icon: '🍺', color: '#E3F2FD' },
];

// ── Greeting helper ─────────────────────────────────────────────────────────────
function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 11) return { text: 'Chào buổi sáng', emoji: '🌅' };
  if (h < 14) return { text: 'Buổi trưa vui vẻ', emoji: '☀️' };
  if (h < 18) return { text: 'Buổi chiều tốt lành', emoji: '🌤️' };
  return { text: 'Buổi tối ấm cúng', emoji: '🌙' };
}

// ── Component ───────────────────────────────────────────────────────────────────
export default function RestaurantsHomeScreen({ navigation }: Props) {
  const [refreshing, setRefreshing]       = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FrontendFilters>({
    priceRanges: [], cuisines: [], ratings: [],
  });
  const greeting = getGreeting();
  const scrollY  = useRef(new Animated.Value(0)).current;

  const hasActiveFilters =
    activeFilters.priceRanges.length > 0 ||
    activeFilters.cuisines.length > 0 ||
    activeFilters.ratings.length > 0;

  const filterCount =
    activeFilters.priceRanges.length +
    activeFilters.cuisines.length +
    activeFilters.ratings.length;

  // Animate header shadow on scroll
  const headerShadow = scrollY.interpolate({
    inputRange: [0, 20],
    outputRange: [0, 0.08],
    extrapolate: 'clamp',
  });

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleApplyFilters = useCallback((filters: FrontendFilters) => {
    setActiveFilters(filters);
    const hasSomething =
      filters.priceRanges.length > 0 ||
      filters.cuisines.length > 0 ||
      filters.ratings.length > 0;
    if (hasSomething) {
      navigation.navigate('RestaurantSearch', { initialFilters: filters });
    }
  }, [navigation]);

  const navigateToCategory = useCallback((id: string, label: string) => {
    navigation.navigate('Category', { type: 'category', category: id, title: label });
  }, [navigation]);

  const removeFilter = useCallback((type: 'cuisines' | 'priceRanges', slug: string) => {
    setActiveFilters(f => ({ ...f, [type]: (f[type] as string[]).filter(s => s !== slug) }));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Animated Header ── */}
      <Animated.View style={[styles.header, {
        shadowOpacity: headerShadow,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: refreshing ? 0 : 4,
      }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreeting}>{greeting.text} {greeting.emoji}</Text>
          <Text style={styles.headerSub}>Hôm nay ăn gì nào? 🍽️</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => {/* future: notifications screen */}}
          accessibilityLabel="Thông báo"
        >
          <Ionicons name="notifications-outline" size={22} color="#333" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF8C42"
            colors={['#FF8C42']}
          />
        }
      >
        {/* ── SEARCH BAR ── */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('RestaurantSearch')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Tìm kiếm quán ăn"
          >
            <Ionicons name="search" size={18} color="#FF8C42" />
            <Text style={styles.searchPlaceholder}>Tìm quán ăn, món ăn...</Text>
            <View style={styles.searchKbd}>
              <Ionicons name="return-down-back-outline" size={14} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
            onPress={() => setShowFilterModal(true)}
            accessibilityLabel={`Bộ lọc${filterCount > 0 ? `, ${filterCount} bộ lọc đang áp dụng` : ''}`}
          >
            <Ionicons name="options-outline" size={20} color={hasActiveFilters ? '#fff' : '#555'} />
            {filterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Active filter chips ── */}
        {hasActiveFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activeFiltersRow}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {activeFilters.cuisines.map(slug => (
              <TouchableOpacity
                key={`c-${slug}`}
                style={styles.activeFilterChip}
                onPress={() => removeFilter('cuisines', slug)}
              >
                <Text style={styles.activeFilterChipText}>{slug}</Text>
                <Ionicons name="close" size={12} color="#FF8C42" />
              </TouchableOpacity>
            ))}
            {activeFilters.priceRanges.map(slug => (
              <TouchableOpacity
                key={`p-${slug}`}
                style={styles.activeFilterChip}
                onPress={() => removeFilter('priceRanges', slug)}
              >
                <Text style={styles.activeFilterChipText}>{slug}</Text>
                <Ionicons name="close" size={12} color="#FF8C42" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.clearAllChip}
              onPress={() => setActiveFilters({ priceRanges: [], cuisines: [], ratings: [] })}
            >
              <Ionicons name="close-circle-outline" size={13} color="#888" />
              <Text style={styles.clearAllChipText}>Xóa tất cả</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── TOP 10 BANNER ── */}
        <TouchableOpacity
          style={styles.topBanner}
          onPress={() => navigation.navigate('Top10')}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel="Xem Top 10 quán nổi bật tuần này"
        >
          <View style={styles.topBannerInner}>
            {/* Decorative circles */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />

            <View style={styles.bannerLeft}>
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>🏆 TOP 10</Text>
              </View>
              <Text style={styles.topBannerTitle}>Quán ăn nổi bật</Text>
              <Text style={styles.topBannerSubtitle}>Được yêu thích nhất tuần này</Text>
              <View style={styles.topBannerBtn}>
                <Text style={styles.topBannerBtnText}>Khám phá ngay</Text>
                <Ionicons name="arrow-forward" size={14} color="#FF8C42" />
              </View>
            </View>

            <View style={styles.bannerRight}>
              <Text style={styles.bannerEmoji}>🥘</Text>
              <Text style={styles.bannerEmojiSm1}>🍜</Text>
              <Text style={styles.bannerEmojiSm2}>☕</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── HÔM NAY ĂN GÌ? ── */}
        <SectionHeader
          title="Hôm nay ăn gì? 🍽️"
          onSeeMore={() => navigateToCategory('mon-viet', 'Tất cả món')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {FOOD_SHORTCUTS.map(item => (
            <ShortcutCard
              key={item.id}
              icon={item.icon}
              label={item.label}
              color={item.color}
              onPress={() => navigateToCategory(item.id, item.label)}
            />
          ))}
        </ScrollView>

        {/* ── UỐNG GÌ HÔM NAY? ── */}
        <SectionHeader title="Uống gì hôm nay? ☕" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {DRINK_SHORTCUTS.map(item => (
            <ShortcutCard
              key={item.id}
              icon={item.icon}
              label={item.label}
              color={item.color}
              onPress={() => navigateToCategory(item.id, item.label)}
            />
          ))}
        </ScrollView>

        {/* ── ẨM THỰC THẾ GIỚI ── */}
        <SectionHeader title="Ẩm thực thế giới 🌏" />
        <View style={styles.cuisineGrid}>
          {CUISINE_CATEGORIES.map(cuisine => (
            <TouchableOpacity
              key={cuisine.id}
              style={[styles.cuisineCard, { backgroundColor: cuisine.color }]}
              onPress={() => navigateToCategory(cuisine.id, cuisine.label)}
              activeOpacity={0.82}
              accessibilityLabel={cuisine.label}
            >
              <Text style={styles.cuisineFlag}>{cuisine.flag}</Text>
              <Text style={[styles.cuisineLabel, { color: cuisine.accent }]}>
                {cuisine.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SectionHeader({ title, onSeeMore }: { title: string; onSeeMore?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeMore && (
        <TouchableOpacity onPress={onSeeMore} accessibilityLabel="Xem thêm">
          <Text style={styles.seeMore}>Xem thêm →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ShortcutCard({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.shortcutCard, { backgroundColor: color, transform: [{ scale }] }]}>
        <Text style={styles.shortcutIcon}>{icon}</Text>
        <Text style={styles.shortcutLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 14,
    backgroundColor: '#fff',
  },
  headerLeft: { flex: 1 },
  headerGreeting: { fontSize: 20, fontWeight: '800', color: '#FF8C42' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 10,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 16, gap: 10,
    borderWidth: 1.5, borderColor: '#EFEFEF',
  },
  searchPlaceholder: { flex: 1, color: '#AAA', fontSize: 14 },
  searchKbd: {
    backgroundColor: '#E8E8E8', paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6,
  },
  filterBtn: {
    width: 50, height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EFEFEF',
  },
  filterBtnActive: { backgroundColor: '#FF8C42', borderColor: '#FF8C42' },
  filterBadge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: '#E05A00',
    width: 19, height: 19, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Active filters
  activeFiltersRow: { backgroundColor: '#fff', paddingBottom: 10 },
  activeFiltersContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#FFF0E5', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#FF8C42',
  },
  activeFilterChipText: { fontSize: 12, color: '#FF8C42', fontWeight: '600' },
  clearAllChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#F5F5F5', borderRadius: 20,
  },
  clearAllChipText: { fontSize: 12, color: '#888', fontWeight: '600' },

  // Top 10 Banner
  topBanner: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: '#FFF5E5',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#FFE0B2',
  },
  topBannerInner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20,
  },
  decorCircle: {
    position: 'absolute', borderRadius: 999,
    backgroundColor: 'rgba(255,140,66,0.08)',
  },
  decorCircle1: { width: 130, height: 130, top: -40, right: 60 },
  decorCircle2: { width: 80,  height: 80,  bottom: -30, right: 20 },
  bannerLeft: { flex: 1, zIndex: 1 },
  topBadge: {
    backgroundColor: '#FF8C42', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, marginBottom: 10,
  },
  topBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  topBannerTitle: { fontSize: 18, fontWeight: '800', color: '#222' },
  topBannerSubtitle: { fontSize: 13, color: '#888', marginTop: 3 },
  topBannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: '#FF8C42',
  },
  topBannerBtnText: { color: '#FF8C42', fontSize: 13, fontWeight: '700' },
  bannerRight: {
    alignItems: 'center', justifyContent: 'center',
    width: 90, zIndex: 1,
  },
  bannerEmoji: { fontSize: 52 },
  bannerEmojiSm1: {
    fontSize: 24, position: 'absolute', top: -10, right: 0,
  },
  bannerEmojiSm2: {
    fontSize: 20, position: 'absolute', bottom: -8, left: 0,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  seeMore: { fontSize: 13, color: '#FF8C42', fontWeight: '600' },

  horizontalList: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },

  shortcutCard: {
    alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 18, minWidth: 86, gap: 7,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  shortcutIcon: { fontSize: 28 },
  shortcutLabel: { fontSize: 11, fontWeight: '700', color: '#333', textAlign: 'center' },

  // Cuisine grid
  cuisineGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12,
  },
  cuisineCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 20, borderRadius: 18,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  cuisineFlag: { fontSize: 36 },
  cuisineLabel: { fontSize: 14, fontWeight: '700' },

  bottomSpacer: { height: 110 },
});