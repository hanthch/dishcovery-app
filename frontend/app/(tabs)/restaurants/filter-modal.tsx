import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  FOOD_TABS,
  DRINK_TABS,
  CUISINE_TABS,
  PRICE_OPTIONS,
} from '../../../constants/categoryConfig';

const { width: SW } = Dimensions.get('window');

export interface RestaurantFilters {
  priceRanges: string[];
  cuisines: string[];
  ratings: number[];
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: RestaurantFilters) => void;
  initialFilters?: RestaurantFilters;
}

// Single-select: user picks ONE minimum rating
const RATING_OPTIONS = [
  { slug: 'r3',  label: '3★+',   value: 3   },
  { slug: 'r4',  label: '4★+',   value: 4   },
  { slug: 'r45', label: '4.5★+', value: 4.5 },
];

// Food type sub-groups shown in their own rows
const TYPE_SECTIONS = [
  { key: 'food',    title: 'Món ăn',   tabs: FOOD_TABS    },
  { key: 'drinks',  title: 'Đồ uống',  tabs: DRINK_TABS   },
  { key: 'cuisine', title: 'Ẩm thực',  tabs: CUISINE_TABS },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: FilterModalProps) {
  const [selectedPrices,   setSelectedPrices]   = useState<string[]>(
    initialFilters?.priceRanges || []
  );
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    initialFilters?.cuisines || []
  );
  // Rating is single-select (minimum star threshold)
  const [selectedRating, setSelectedRating] = useState<number | null>(
    initialFilters?.ratings?.[0] ?? null
  );

  // Re-sync state when modal opens fresh
  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      setSelectedPrices(initialFilters?.priceRanges || []);
      setSelectedCuisines(initialFilters?.cuisines  || []);
      setSelectedRating(initialFilters?.ratings?.[0] ?? null);
    }
    prevVisible.current = visible;
  }, [visible, initialFilters]);

  const togglePrice = (slug: string) =>
    setSelectedPrices(prev =>
      prev.includes(slug) ? prev.filter(v => v !== slug) : [...prev, slug]
    );

  const toggleCuisine = (slug: string) =>
    setSelectedCuisines(prev =>
      prev.includes(slug) ? prev.filter(v => v !== slug) : [...prev, slug]
    );

  const pickRating = (value: number) =>
    setSelectedRating(prev => (prev === value ? null : value));

  const handleApply = () => {
    onApply({
      priceRanges: selectedPrices,
      cuisines:    selectedCuisines,
      ratings:     selectedRating != null ? [selectedRating] : [],
    });
    onClose();
  };

  const handleClearAll = () => {
    setSelectedPrices([]);
    setSelectedCuisines([]);
    setSelectedRating(null);
  };

  const totalActive =
    selectedPrices.length +
    selectedCuisines.length +
    (selectedRating != null ? 1 : 0);

  const hasActive = totalActive > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.root}>

        {/* ── drag handle pill ── */}
        <View style={s.pill} />

        {/* ── HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color="#1A1A1A" />
          </TouchableOpacity>

          <Text style={s.headerTitle}>Bộ lọc</Text>

          <TouchableOpacity
            onPress={handleClearAll}
            disabled={!hasActive}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[s.resetText, !hasActive && s.resetTextOff]}>
              Đặt lại
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.hairline} />

        {/* ── SCROLL BODY ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.body}
          bounces
        >

          {/* ══ 1. KHOẢNG GIÁ ══ */}
          <SectionHeader icon="💰" title="Khoảng giá" />
          <View style={s.priceGrid}>
            {PRICE_OPTIONS.map(opt => {
              const on = selectedPrices.includes(opt.slug);
              return (
                <TouchableOpacity
                  key={opt.slug}
                  style={[s.priceCard, on && s.priceCardOn]}
                  onPress={() => togglePrice(opt.slug)}
                  activeOpacity={0.72}
                >
                  {/* custom radio */}
                  <View style={[s.radio, on && s.radioOn]}>
                    {on && <View style={s.radioDot} />}
                  </View>
                  <Text style={[s.priceText, on && s.priceTextOn]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.sep} />

          {/* ══ 2. LOẠI MÓN & ĐỒ UỐNG ══ */}
          <SectionHeader icon="🍽️" title="Loại món & đồ uống" />
          {TYPE_SECTIONS.map(group => (
            <View key={group.key} style={s.typeGroup}>
              <Text style={s.typeGroupTitle}>{group.title}</Text>
              <View style={s.tagWrap}>
                {group.tabs.map(tab => {
                  const on = selectedCuisines.includes(tab.slug);
                  return (
                    <TouchableOpacity
                      key={tab.slug}
                      style={[s.tag, on && s.tagOn]}
                      onPress={() => toggleCuisine(tab.slug)}
                      activeOpacity={0.72}
                    >
                      <Text style={s.tagEmoji}>{tab.icon}</Text>
                      <Text style={[s.tagText, on && s.tagTextOn]}>
                        {tab.label}
                      </Text>
                      {on && (
                        <View style={s.tagDot} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={s.sep} />

          {/* ══ 3. ĐÁNH GIÁ ══ */}
          <SectionHeader icon="⭐" title="Đánh giá tối thiểu" />
          <View style={s.ratingRow}>
            {RATING_OPTIONS.map(r => {
              const on = selectedRating === r.value;
              return (
                <TouchableOpacity
                  key={r.slug}
                  style={[s.ratingChip, on && s.ratingChipOn]}
                  onPress={() => pickRating(r.value)}
                  activeOpacity={0.72}
                >
                  <Ionicons
                    name={on ? 'star' : 'star-outline'}
                    size={15}
                    color={on ? PRIMARY : '#999'}
                  />
                  <Text style={[s.ratingText, on && s.ratingTextOn]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── FOOTER CTA ── */}
        <View style={s.footer}>
          {/* active filter summary strip */}
          {hasActive && (
            <View style={s.activeStrip}>
              <Ionicons name="checkmark-circle" size={14} color={PRIMARY} />
              <Text style={s.activeStripText}>
                {totalActive} bộ lọc đang bật
              </Text>
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={s.activeStripClear}>Xóa hết</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={s.applyBtn}
            onPress={handleApply}
            activeOpacity={0.86}
          >
            <Text style={s.applyText}>
              {hasActive ? `Xem kết quả · ${totalActive} bộ lọc` : 'Xem kết quả'}
            </Text>
            <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

// ─── Section header sub-component ────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={sh.row}>
      <Text style={sh.icon}>{icon}</Text>
      <Text style={sh.title}>{title}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  icon:  { fontSize: 17 },
  title: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.2 },
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY    = '#FF8C42';
const PRIMARY_BG = '#FFF4EC';
const BORDER     = '#E8E8E8';
const BORDER_ON  = '#FF8C42';
const TEXT_MAIN  = '#1A1A1A';
const TEXT_SUB   = '#666';
const TEXT_OFF   = '#BBBBBB';
const SURFACE    = '#F6F6F6';

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#fff' },

  // Handle
  pill: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDDDDD',
    alignSelf: 'center', marginTop: 10, marginBottom: 2,
  },

  // Header row
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: SURFACE,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '800',
    color: TEXT_MAIN, letterSpacing: -0.4,
  },
  resetText:    { fontSize: 14, fontWeight: '700', color: PRIMARY },
  resetTextOff: { color: TEXT_OFF },

  hairline: { height: 1, backgroundColor: BORDER },

  // Body padding
  body: { paddingHorizontal: 20, paddingTop: 24 },

  // Separator between sections
  sep: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 24 },

  // ── Price grid (2 col) ──
  priceGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  priceCard: {
    flexDirection: 'row', alignItems: 'center',
    width: (SW - 50) / 2,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FAFAFA',
  },
  priceCardOn: { borderColor: BORDER_ON, backgroundColor: PRIMARY_BG },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  radioOn:  { borderColor: PRIMARY },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: PRIMARY },
  priceText:   { fontSize: 14, fontWeight: '600', color: TEXT_SUB, flex: 1 },
  priceTextOn: { color: PRIMARY, fontWeight: '700' },

  // ── Food type groups ──
  typeGroup: { marginBottom: 20 },
  typeGroupTitle: {
    fontSize: 11, fontWeight: '700', color: TEXT_OFF,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FAFAFA', gap: 5,
  },
  tagOn:     { borderColor: BORDER_ON, backgroundColor: PRIMARY_BG },
  tagEmoji:  { fontSize: 13 },
  tagText:   { fontSize: 13, fontWeight: '600', color: TEXT_SUB },
  tagTextOn: { color: PRIMARY },
  tagDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: PRIMARY, marginLeft: 2,
  },

  // ── Rating ──
  ratingRow: { flexDirection: 'row', gap: 10 },
  ratingChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FAFAFA',
  },
  ratingChipOn: { borderColor: BORDER_ON, backgroundColor: PRIMARY_BG },
  ratingText:   { fontSize: 13, fontWeight: '700', color: TEXT_SUB },
  ratingTextOn: { color: PRIMARY },

  // ── Footer ──
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 18,
    borderTopWidth: 1, borderTopColor: BORDER,
    backgroundColor: '#fff',
    gap: 10,
  },
  activeStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: PRIMARY_BG, borderRadius: 10,
  },
  activeStripText:  { flex: 1, fontSize: 13, color: PRIMARY, fontWeight: '600' },
  activeStripClear: { fontSize: 13, color: PRIMARY, fontWeight: '700', textDecorationLine: 'underline' },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY,
    paddingVertical: 16, borderRadius: 16, gap: 10,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  applyText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
});