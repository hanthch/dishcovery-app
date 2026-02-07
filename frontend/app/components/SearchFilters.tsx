import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

type FilterType = 'all' | 'post' | 'user' | 'restaurant';

const OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'post', label: 'Bài viết' },
  { key: 'user', label: 'Người dùng' },
  { key: 'restaurant', label: 'Địa điểm' },
];

export default function SearchFilters({
  active,
  onChange,
}: {
  active: FilterType;
  onChange: (v: FilterType) => void;
}) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const isActive = opt.key === active;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.btn, isActive && styles.active]}
          >
            <Text style={[styles.text, isActive && styles.activeText]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F1F1',
  },
  active: {
    backgroundColor: '#000',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  activeText: {
    color: '#fff',
  },
});
