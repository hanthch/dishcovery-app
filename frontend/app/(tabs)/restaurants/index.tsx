import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
// ✅ FIX 1: Use react-native-safe-area-context (not the deprecated RN built-in)
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../../../services/Api.service';
import {
  RestaurantStackParamList,
  FrontendFilters,
  Restaurant,
} from '../../../types/restaurant';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import FilterModal from './filter-modal';

// ─── Single source of truth for all tab/category config ──────────────────────
import {
  FOOD_TABS,
  DRINK_TABS,
  CUISINE_TABS,
  HOME_SECTIONS,
} from '../../../constants/categoryConfig';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;
interface Props { navigation: NavigationProp; }

const { width: SW } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Image priority: cover_image first (canonical DB field from normalizer),
 * then image_url alias, then photos array, then images alias.
 * This matches the backend normalizeRestaurant() output exactly.
 */
function getImg(r: Restaurant): string | null {
  return r.cover_image || r.image_url || r.photos?.[0] || r.images?.[0] || null;
}

// ─── Restaurant Card (vertical list) ─────────────────────────────────────────
const RestaurantCard = React.memo(({
  restaurant,
  onPress,
  rank,
}: {
  restaurant: Restaurant;
  onPress: () => void;
  rank?: number;
}) => {
  const img    = getImg(restaurant);
  const rating = restaurant.rating ?? 0;
  // food_types is canonical; cuisine/categories are legacy aliases from normalizer
  const cuisine = (restaurant.food_types ?? restaurant.cuisine ?? []).slice(0, 2).join(' · ') || 'Đang cập nhật';

  return (
    <TouchableOpacity style={rc.card} onPress={onPress} activeOpacity={0.92}>
      {/* Image */}
      <View style={rc.imgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={rc.img} resizeMode="cover" />
        ) : (
          <View style={[rc.img, rc.imgFallback]}>
            <Ionicons name="restaurant-outline" size={32} color={COLORS.border} />
          </View>
        )}
        {rank !== undefined && rank <= 10 && (
          <View style={[rc.rankBadge, rank <= 3 && rc.rankBadgeTop]}>
            <Text style={rc.rankText}>#{rank}</Text>
          </View>
        )}
        {restaurant.verified && (
          <View style={rc.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#fff" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={rc.info}>
        <Text style={rc.name} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={rc.cuisine} numberOfLines={1}>{cuisine}</Text>

        <View style={rc.metaRow}>
          {rating > 0 && (
            <View style={rc.ratingWrap}>
              <Ionicons name="star" size={12} color="#F5C518" />
              <Text style={rc.ratingText}>{rating.toFixed(1)}</Text>
              {restaurant.rating_count ? (
                <Text style={rc.ratingCount}>({restaurant.rating_count})</Text>
              ) : null}
            </View>
          )}
          {/* price_range is canonical from normalizer; priceRange is the alias */}
          {(restaurant.price_range ?? restaurant.priceRange) && (
            <View style={rc.priceWrap}>
              <Text style={rc.priceDot}>·</Text>
              <Text style={rc.priceText}>{restaurant.price_range ?? restaurant.priceRange}</Text>
            </View>
          )}
        </View>

        {restaurant.address && (
          <View style={rc.addressRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textTertiary} />
            <Text style={rc.addressText} numberOfLines={1}>{restaurant.address}</Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.border} style={rc.chevron} />
    </TouchableOpacity>
  );
});
RestaurantCard.displayName = 'RestaurantCard';

// ─── Category Tab Bar ─────────────────────────────────────────────────────────
function TabBar({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: { slug: string; label: string; icon: string }[];
  activeId: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tb.scroll}
    >
      {tabs.map(tab => {
        const active = tab.slug === activeId;
        return (
          <TouchableOpacity
            key={tab.slug}
            style={[tb.chip, active && tb.chipActive]}
            onPress={() => onSelect(tab.slug)}
            activeOpacity={0.8}
          >
            <Text style={tb.icon}>{tab.icon}</Text>
            <Text style={[tb.label, active && tb.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Category Section (tabs + vertical card list) ─────────────────────────────
function CategorySection({
  title,
  tabs,
  navigation,
}: {
  title: string;
  tabs: { slug: string; label: string; icon: string }[];
  navigation: NavigationProp;
}) {
  const [activeTab, setActiveTab]       = useState(tabs[0].slug);
  const [restaurants, setRestaurants]   = useState<Restaurant[]>([]);
  const [loading, setLoading]           = useState(true);
  const mounted                         = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setLoading(true);
    setRestaurants([]);
    // Fetch 6 cards for the home section preview
    // activeTab is a slug (e.g. 'bun-pho', 'cafe', 'mon-viet')
    // Backend GET /restaurants/category/:category translates slug → DB food_types query
    apiService.getRestaurantsByCategory(activeTab, 1, 6)
      .then(data => { if (mounted.current) setRestaurants(data); })
      .catch(() => { if (mounted.current) setRestaurants([]); })
      .finally(() => { if (mounted.current) setLoading(false); });
  }, [activeTab]);

  const goToDetail = useCallback((r: Restaurant) => {
    navigation.navigate('RestaurantDetail', { restaurantId: r.id.toString() });
  }, [navigation]);

  const goToAll = useCallback(() => {
    const tab = tabs.find(t => t.slug === activeTab);
    navigation.navigate('Category', {
      type:     'category',
      category: activeTab,
      title:    tab?.label ?? title,
    });
  }, [activeTab, tabs, navigation, title]);

  return (
    <View style={cs.section}>
      {/* Section title */}
      <View style={cs.titleRow}>
        <View style={cs.titleBar} />
        <Text style={cs.titleText}>{title}</Text>
        <TouchableOpacity onPress={goToAll} style={cs.seeAllBtn}>
          <Text style={cs.seeAllText}>Xem tất cả</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Horizontal tab chips */}
      <TabBar tabs={tabs} activeId={activeTab} onSelect={setActiveTab} />

      {/* Vertical card list */}
      {loading ? (
        <View style={cs.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={cs.loadingText}>Đang tìm quán...</Text>
        </View>
      ) : restaurants.length === 0 ? (
        <View style={cs.emptyBox}>
          <Text style={cs.emptyEmoji}>🍽️</Text>
          <Text style={cs.emptyText}>Chưa có quán trong mục này</Text>
          <Text style={cs.emptySubText}>Kéo xuống để thử lại hoặc chọn mục khác</Text>
        </View>
      ) : (
        <View style={cs.cardList}>
          {restaurants.map((r, i) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              rank={i + 1}
              onPress={() => goToDetail(r)}
            />
          ))}
          <TouchableOpacity style={cs.moreBtn} onPress={goToAll}>
            <Text style={cs.moreBtnText}>Xem thêm quán</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Top 10 Horizontal Scroll ─────────────────────────────────────────────────
function Top10Section({
  restaurants,
  loading,
  navigation,
}: {
  restaurants: Restaurant[];
  loading: boolean;
  navigation: NavigationProp;
}) {
  return (
    <View style={t10.section}>

      {/* ── HERO BANNER ── */}
      <TouchableOpacity
        style={t10.banner}
        onPress={() => navigation.navigate('Top10')}
        activeOpacity={0.92}
      >
        <View style={t10.bannerContent}>
          <View style={t10.bannerLeft}>
            <View style={t10.badge}>
              <Text style={t10.badgeText}>TOP 10</Text>
            </View>
            <Text style={t10.bannerTitle}>Quán ăn</Text>
            <Text style={t10.bannerSubtitle}>NỔI BẬT NHẤT{'\n'}TUẦN NÀY</Text>
            <TouchableOpacity
              style={t10.bannerBtn}
              onPress={() => navigation.navigate('Top10')}
              activeOpacity={0.8}
            >
            </TouchableOpacity>
          </View>
          <Image
            source={require('../../../assets/images/restaurant-house.png')}
            style={t10.bannerImage}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>

      {/* ── LIVE RANKED CARDS from Supabase ── */}
      {loading ? (
        <View style={t10.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : restaurants.length === 0 ? (
        <View style={t10.emptyBox}>
          <Text style={t10.emptyText}>Chưa có dữ liệu xếp hạng</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={t10.scroll}
        >
          {restaurants.map((r, i) => {
            const img    = getImg(r);
            const rating = r.rating ?? 0;
            return (
              <TouchableOpacity
                key={r.id}
                style={t10.card}
                onPress={() =>
                  navigation.navigate('RestaurantDetail', { restaurantId: r.id.toString() })
                }
                activeOpacity={0.9}
              >
                <View style={t10.imgWrap}>
                  {img ? (
                    <Image source={{ uri: img }} style={t10.img} resizeMode="cover" />
                  ) : (
                    <View style={[t10.img, t10.imgFallback]}>
                      <Ionicons name="restaurant-outline" size={28} color={COLORS.border} />
                    </View>
                  )}
                  {/* Gold badge for top 3 */}
                  <View style={[t10.rankBadge, i < 3 && t10.rankBadgeGold]}>
                    <Text style={t10.rankText}>#{i + 1}</Text>
                  </View>
                </View>
                {rating > 0 && (
                  <View style={t10.ratingRow}>
                    <Ionicons name="star" size={11} color="#F5C518" />
                    <Text style={t10.ratingVal}>{rating.toFixed(1)}</Text>
                  </View>
                )}
                <Text style={t10.name} numberOfLines={2}>{r.name}</Text>
                {/* price_range canonical; priceRange is alias from normalizer */}
                {(r.price_range ?? r.priceRange) && (
                  <Text style={t10.price}>{r.price_range ?? r.priceRange}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RestaurantsHomeScreen({ navigation }: Props) {
  const [refreshing, setRefreshing]       = useState(false);
  const [showFilter, setShowFilter]       = useState(false);
  const [activeFilters, setActiveFilters] = useState<FrontendFilters>({
    priceRanges: [], cuisines: [], ratings: [],
  });
  const [top10, setTop10]         = useState<Restaurant[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  const hasActiveFilters =
    activeFilters.priceRanges.length > 0 ||
    activeFilters.cuisines.length > 0 ||
    activeFilters.ratings.length > 0;

  const fetchTop10 = useCallback(async () => {
    setLoadingTop(true);
    try {
      // GET /restaurants/top-rated → ordered by top_rank_this_week ASC, limit 10
      const data = await apiService.getTopTen();
      setTop10(data);
    } catch {
      setTop10([]);
    } finally {
      setLoadingTop(false);
    }
  }, []);

  // ✅ FIX 2: Only useFocusEffect — fires on mount AND re-focus.
  // Removed the duplicate useEffect that was causing a double fetch on initial mount.
  useFocusEffect(
    useCallback(() => {
      fetchTop10();
    }, [fetchTop10])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTop10();
    setRefreshing(false);
  }, [fetchTop10]);

  const handleApplyFilters = useCallback((filters: FrontendFilters) => {
    setActiveFilters(filters);
    const has =
      filters.priceRanges.length > 0 ||
      filters.cuisines.length > 0 ||
      filters.ratings.length > 0;
    if (has) navigation.navigate('RestaurantSearch', { initialFilters: filters });
  }, [navigation]);

  return (
    // ✅ FIX 1: SafeAreaView from react-native-safe-area-context (not deprecated RN built-in)
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Chào bạn 👋</Text>
          <Text style={s.title}>Hôm nay ăn gì?</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={[s.filterIconBtn, hasActiveFilters && s.filterIconBtnActive]}
            onPress={() => setShowFilter(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? COLORS.background : COLORS.text}
            />
            {hasActiveFilters && <View style={s.filterDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SEARCH BAR ────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.searchBar}
        onPress={() =>
          navigation.navigate('RestaurantSearch', { initialFilters: activeFilters })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="search-outline" size={18} color={COLORS.textTertiary} />
        <Text style={s.searchText}>Tìm quán ăn, món ăn, địa chỉ...</Text>
        <View style={s.searchBadge}>
          <Ionicons name="arrow-forward" size={14} color={COLORS.background} />
        </View>
      </TouchableOpacity>

      {/* ── MAIN SCROLL ───────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* TOP 10 — fetched from GET /restaurants/top-rated via apiService.getTopTen() */}
        <Top10Section
          restaurants={top10}
          loading={loadingTop}
          navigation={navigation}
        />

        {/* HOME_SECTIONS from categoryConfig.ts → FOOD_TABS, DRINK_TABS, CUISINE_TABS
            Each CategorySection calls GET /restaurants/category/:activeTab */}
        {HOME_SECTIONS.map(section => (
          <CategorySection
            key={section.key}
            title={section.title}
            tabs={section.tabs}
            navigation={navigation}
          />
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: COLORS.background },
  header:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  greeting:            { fontSize: 12, color: COLORS.textTertiary, fontWeight: '500', marginBottom: 2 },
  title:               { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerRight:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  filterIconBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  filterIconBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterDot:           { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.background },
  notifBtn:            { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  searchBar:           { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 13, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchText:          { flex: 1, fontSize: 14, color: COLORS.textTertiary },
  searchBadge:         { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});

const t10 = StyleSheet.create({
  section:       { marginBottom: SPACING.sm },
  banner:        { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.md, backgroundColor: '#FFF5E5', borderRadius: 20, padding: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLeft:    { flex: 1 },
  badge:         { backgroundColor: COLORS.primary, alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, marginBottom: SPACING.sm },
  badgeText:     { color: COLORS.background, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  bannerTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  bannerSubtitle:{ fontSize: 16, fontWeight: '900', color: COLORS.primary, marginVertical: SPACING.xs, lineHeight: 22 },
  bannerBtn:     { marginTop: SPACING.md, alignSelf: 'flex-start' },
  bannerBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  bannerImage:   { width: 100, height: 100 },
  loadingBox:    { height: 150, justifyContent: 'center', alignItems: 'center' },
  emptyBox:      { height: 60, justifyContent: 'center', alignItems: 'center' },
  emptyText:     { color: COLORS.textTertiary, fontSize: 13 },
  scroll:        { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.md },
  card:          { width: 140, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: COLORS.border },
  imgWrap:       { width: '100%', height: 160, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.surface, position: 'relative' },
  img:           { width: '100%', height: '100%' },
  imgFallback:   { justifyContent: 'center', alignItems: 'center' },
  rankBadge:     { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BORDER_RADIUS.sm },
  rankBadgeGold: { backgroundColor: COLORS.primary },
  rankText:      { fontSize: 11, fontWeight: '900', color: COLORS.background },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: SPACING.sm, paddingHorizontal: SPACING.sm },
  ratingVal:     { fontSize: 12, fontWeight: '700', color: COLORS.text },
  name:          { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs, paddingHorizontal: SPACING.sm, lineHeight: 18 },
  price:         { fontSize: 11, color: COLORS.primary, fontWeight: '600', paddingHorizontal: SPACING.sm, marginTop: 2, marginBottom: SPACING.sm },
});

const cs = StyleSheet.create({
  section:      { marginBottom: SPACING.sm },
  titleRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md },
  titleBar:     { width: 3, height: 18, backgroundColor: COLORS.primary, borderRadius: 2, marginRight: SPACING.sm },
  titleText:    { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.text },
  seeAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:   { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  loadingBox:   { paddingVertical: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  loadingText:  { fontSize: 13, color: COLORS.textTertiary },
  emptyBox:     { paddingVertical: SPACING.xl + 8, alignItems: 'center', gap: SPACING.xs },
  emptyEmoji:   { fontSize: 36, marginBottom: SPACING.sm },
  emptyText:    { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubText: { fontSize: 12, color: COLORS.textTertiary, textAlign: 'center', paddingHorizontal: SPACING.xl },
  cardList:     { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  moreBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.md, marginTop: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  moreBtnText:  { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});

const tb = StyleSheet.create({
  scroll:      { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  chip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 1, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, gap: 5 },
  chipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  icon:        { fontSize: 14 },
  label:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  labelActive: { color: COLORS.background },
});

const rc = StyleSheet.create({
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.sm, padding: SPACING.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  imgWrap:      { width: 80, height: 80, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.surface, position: 'relative', flexShrink: 0 },
  img:          { width: '100%', height: '100%' },
  imgFallback:  { justifyContent: 'center', alignItems: 'center' },
  rankBadge:    { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  rankBadgeTop: { backgroundColor: COLORS.primary },
  rankText:     { fontSize: 9, fontWeight: '800', color: '#FFF' },
  verifiedBadge:{ position: 'absolute', top: 4, right: 4, backgroundColor: COLORS.success, borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  info:         { flex: 1, paddingHorizontal: SPACING.md, justifyContent: 'center', gap: 3 },
  name:         { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cuisine:      { fontSize: 12, color: COLORS.textTertiary },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  ratingWrap:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText:   { fontSize: 12, fontWeight: '700', color: COLORS.text },
  ratingCount:  { fontSize: 11, color: COLORS.textTertiary },
  priceWrap:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceDot:     { color: COLORS.border, fontSize: 12 },
  priceText:    { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  addressRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addressText:  { fontSize: 11, color: COLORS.textTertiary, flex: 1 },
  chevron:      { marginLeft: SPACING.xs },
});