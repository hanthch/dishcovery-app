// ─── components/SearchFilters.tsx ────────────────────────────────────────────
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';

export type FilterType = 'all' | 'post' | 'user' | 'restaurant';

const OPTIONS: { key: FilterType; label: string; emoji: string }[] = [
  { key: 'all',        label: 'Tất cả',      emoji: '🔍' },
  { key: 'post',       label: 'Bài viết',    emoji: '📸' },
  { key: 'user',       label: 'Người dùng',  emoji: '👤' },
  { key: 'restaurant', label: 'Địa điểm',    emoji: '🍜' },
];

interface SearchFiltersProps {
  active:   FilterType;
  onChange: (v: FilterType) => void;
}

export default function SearchFilters({ active, onChange }: SearchFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.container}
    >
      {OPTIONS.map(opt => {
        const isActive = opt.key === active;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[s.btn, isActive && s.btnActive]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[s.text, isActive && s.textActive]}>
              {opt.emoji} {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:   8,
    gap: 8,
    flexDirection: 'row',
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    backgroundColor:   '#F2F2F2',
    borderWidth:       1,
    borderColor:       'transparent',
  },
  btnActive: {
    backgroundColor: '#1A1A1A',
    borderColor:     '#1A1A1A',
  },
  text:       { fontSize: 13, fontWeight: '600', color: '#666666' },
  textActive: { color: '#FFFFFF' },
});