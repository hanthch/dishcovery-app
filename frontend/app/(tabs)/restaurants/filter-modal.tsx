import React, { useState } from 'react';
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

const FILTER_OPTIONS = {
  priceRanges: [
    { id: 'under-30k', label: 'Dưới 30k' },
    { id: '30k-50k', label: '30k-50k' },
    { id: '50k-100k', label: '50k-100k' },
    { id: 'over-100k', label: 'Trên 100k' },
  ],
  cuisines: [
    { id: 'american', label: 'Âu-Mỹ' },
    { id: 'korean', label: 'Hàn' },
    { id: 'japanese', label: 'Nhật' },
    { id: 'chinese', label: 'Trung' },
    { id: 'vietnamese', label: 'Việt' },
    { id: 'indian', label: 'Ấn' },
    { id: 'thai', label: 'Thái' },
    { id: 'other', label: 'Khác' },
  ],
  ratings: [
    { id: 1, label: '⭐', value: 1 },
    { id: 2, label: '⭐⭐', value: 2 },
    { id: 3, label: '⭐⭐⭐', value: 3 },
    { id: 4, label: '⭐⭐⭐⭐', value: 4 },
    { id: 5, label: '⭐⭐⭐⭐⭐', value: 5 },
  ],
};

export default function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: FilterModalProps) {
  const [selectedPrices, setSelectedPrices] = useState<string[]>(
    initialFilters?.priceRanges || []
  );
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    initialFilters?.cuisines || []
  );
  const [selectedRatings, setSelectedRatings] = useState<number[]>(
    initialFilters?.ratings || []
  );

  const toggleSelection = (
    value: string | number,
    selectedList: (string | number)[],
    setSelectedList: (list: any[]) => void
  ) => {
    if (selectedList.includes(value)) {
      setSelectedList(selectedList.filter((item) => item !== value));
    } else {
      setSelectedList([...selectedList, value]);
    }
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

  const hasActiveFilters =
    selectedPrices.length > 0 ||
    selectedCuisines.length > 0 ||
    selectedRatings.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Khám phá</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar Placeholder */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <Text style={styles.searchPlaceholder}>
            Search for name, restaurants...
          </Text>
          <Ionicons name="options-outline" size={20} color="#999" />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Bộ lọc Title */}
          <Text style={styles.mainTitle}>Bộ lọc</Text>

          {/* Price, $ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price, $</Text>
            <View style={styles.optionsGrid}>
              {FILTER_OPTIONS.priceRanges.map((price) => (
                <CheckboxOption
                  key={price.id}
                  label={price.label}
                  selected={selectedPrices.includes(price.id)}
                  onPress={() =>
                    toggleSelection(price.id, selectedPrices, setSelectedPrices)
                  }
                />
              ))}
            </View>
          </View>

          {/* Quốc gia */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quốc gia</Text>
            <View style={styles.optionsGrid}>
              {FILTER_OPTIONS.cuisines.map((cuisine) => (
                <CheckboxOption
                  key={cuisine.id}
                  label={cuisine.label}
                  selected={selectedCuisines.includes(cuisine.id)}
                  onPress={() =>
                    toggleSelection(
                      cuisine.id,
                      selectedCuisines,
                      setSelectedCuisines
                    )
                  }
                />
              ))}
            </View>
          </View>

          {/* Đánh giá */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đánh giá</Text>
            <View style={styles.optionsGrid}>
              {FILTER_OPTIONS.ratings.map((rating) => (
                <CheckboxOption
                  key={rating.id}
                  label={rating.label}
                  selected={selectedRatings.includes(rating.value)}
                  onPress={() =>
                    toggleSelection(
                      rating.value,
                      selectedRatings,
                      setSelectedRatings
                    )
                  }
                />
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClearAll}
            disabled={!hasActiveFilters}
          >
            <Text
              style={[
                styles.clearButtonText,
                !hasActiveFilters && styles.disabledButtonText,
              ]}
            >
              Xóa tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.applyButton]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Xem kết quả</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* Checkbox Option Component */
interface CheckboxOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function CheckboxOption({ label, selected, onPress }: CheckboxOptionProps) {
  return (
    <TouchableOpacity
      style={styles.checkboxOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={16} color="#FF8C42" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF8C42',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#999',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF5E5',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
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
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#F5F5F5',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  disabledButtonText: {
    color: '#999',
  },
  applyButton: {
    backgroundColor: '#FFD93D',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
});