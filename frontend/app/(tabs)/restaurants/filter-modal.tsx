import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRICE_OPTIONS, CUISINE_TABS, FOOD_TABS, DRINK_TABS } from '../../../constants/categoryConfig';

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

const RATING_OPTIONS = [
  { value: 5, label: '⭐⭐⭐⭐⭐  5 sao' },
  { value: 4, label: '⭐⭐⭐⭐  4 sao trở lên' },
  { value: 3, label: '⭐⭐⭐  3 sao trở lên' },
  { value: 2, label: '⭐⭐  2 sao trở lên' },
];

const FOOD_CATEGORY_OPTIONS = [
  ...FOOD_TABS.map(t => ({ id: t.slug, label: `${t.icon} ${t.label}` })),
  ...DRINK_TABS.map(t => ({ id: t.slug, label: `${t.icon} ${t.label}` })),
];

const CUISINE_OPTIONS = CUISINE_TABS.map(t => ({ id: t.slug, label: `${t.icon} ${t.label}` }));

const PRICE_FILTER_OPTIONS = PRICE_OPTIONS.map(p => ({ id: p.slug, label: p.label }));

export default function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: FilterModalProps) {
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'food' | 'cuisine' | 'price' | 'rating'>('food');

  // Sync with initialFilters when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedPrices(initialFilters?.priceRanges || []);
      setSelectedCuisines(initialFilters?.cuisines || []);
      setSelectedRatings(initialFilters?.ratings || []);
    }
  }, [visible, initialFilters]);

  const toggleString = (
    value: string,
    list: string[],
    setList: (l: string[]) => void
  ) => {
    setList(list.includes(value) ? list.filter(i => i !== value) : [...list, value]);
  };

  const toggleNumber = (
    value: number,
    list: number[],
    setList: (l: number[]) => void
  ) => {
    setList(list.includes(value) ? list.filter(i => i !== value) : [...list, value]);
  };

  const handleApply = () => {
    onApply({
      priceRanges: selectedPrices,
      cuisines: selectedCuisines,
      ratings: selectedRatings,
    });
    onClose();
  };

  const handleClearAll = () => {
    setSelectedPrices([]);
    setSelectedCuisines([]);
    setSelectedRatings([]);
  };

  const totalActive =
    selectedPrices.length + selectedCuisines.length + selectedRatings.length;

  const TABS = [
    { key: 'food',    label: '🍜 Món ăn' },
    { key: 'cuisine', label: '🌍 Ẩm thực' },
    { key: 'price',   label: '💰 Giá' },
    { key: 'rating',  label: '⭐ Sao' },
  ] as const;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bộ lọc</Text>
          <TouchableOpacity onPress={handleClearAll} disabled={totalActive === 0}>
            <Text style={[styles.clearText, totalActive === 0 && styles.clearTextDisabled]}>
              Xóa tất cả {totalActive > 0 ? `(${totalActive})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Category tabs ── */}
        <View style={styles.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Food categories ── */}
          {activeTab === 'food' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Loại món ăn & đồ uống</Text>
              <View style={styles.chipGrid}>
                {FOOD_CATEGORY_OPTIONS.map(opt => {
                  const selected = selectedCuisines.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleString(opt.id, selectedCuisines, setSelectedCuisines)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark" size={14} color="#FF8C42" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Cuisine ── */}
          {activeTab === 'cuisine' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ẩm thực theo quốc gia</Text>
              <View style={styles.chipGrid}>
                {CUISINE_OPTIONS.map(opt => {
                  const selected = selectedCuisines.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleString(opt.id, selectedCuisines, setSelectedCuisines)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark" size={14} color="#FF8C42" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Price ── */}
          {activeTab === 'price' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Khoảng giá</Text>
              {PRICE_FILTER_OPTIONS.map(opt => {
                const selected = selectedPrices.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.rowOption, selected && styles.rowOptionSelected]}
                    onPress={() => toggleString(opt.id, selectedPrices, setSelectedPrices)}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.rowOptionText, selected && styles.rowOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#FF8C42" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Rating ── */}
          {activeTab === 'rating' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Đánh giá tối thiểu</Text>
              {RATING_OPTIONS.map(opt => {
                const selected = selectedRatings.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.rowOption, selected && styles.rowOptionSelected]}
                    onPress={() => toggleNumber(opt.value, selectedRatings, setSelectedRatings)}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.rowOptionText, selected && styles.rowOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#FF8C42" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Bottom action ── */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={[styles.btn, styles.clearBtn]} onPress={onClose}>
            <Text style={styles.clearBtnText}>Huỷ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.applyBtn]} onPress={handleApply}>
            <Text style={styles.applyBtnText}>
              Xem kết quả{totalActive > 0 ? ` (${totalActive})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  clearText: { fontSize: 14, color: '#FF8C42', fontWeight: '600' },
  clearTextDisabled: { color: '#CCC' },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  tabActive: { backgroundColor: '#FFF0E5' },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#888' },
  tabLabelActive: { color: '#FF8C42' },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  chipSelected: {
    backgroundColor: '#FFF0E5',
    borderColor: '#FF8C42',
  },
  chipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  chipTextSelected: { color: '#FF8C42', fontWeight: '600' },
  rowOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 12,
  },
  rowOptionSelected: {
    backgroundColor: '#FFF0E5',
    borderColor: '#FF8C42',
  },
  rowOptionText: { flex: 1, fontSize: 14, color: '#444' },
  rowOptionTextSelected: { color: '#FF8C42', fontWeight: '600' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: '#FF8C42' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF8C42',
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  btn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: { backgroundColor: '#F5F5F5' },
  clearBtnText: { fontSize: 15, fontWeight: '600', color: '#555' },
  applyBtn: { backgroundColor: '#FF8C42' },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});