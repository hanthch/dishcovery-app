import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const SORT_OPTIONS: { key: 'newest' | 'popular'; label: string; emoji: string }[] = [
  { key: 'newest',  label: 'Mới nhất', emoji: '🕐' },
  { key: 'popular', label: 'Phổ biến', emoji: '🔥' },
];

interface PostSortToggleProps {
  value: 'newest' | 'popular';
  onChange: (value: 'newest' | 'popular') => void;
}

export default function PostSortToggle({ value, onChange }: PostSortToggleProps) {
  return (
    <View style={s.container}>
      {SORT_OPTIONS.map(opt => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[s.btn, active && s.btnActive]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[s.text, active && s.textActive]}>
              {opt.emoji} {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  btn: {
    paddingHorizontal: 16,
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
  text: {
    fontSize:   13,
    fontWeight: '600',
    color:      '#666666',
  },
  textActive: {
    color: '#FFFFFF',
  },
});