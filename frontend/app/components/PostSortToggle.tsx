import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const OPTIONS: { key: 'newest' | 'popular'; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'popular', label: 'Phổ biến' },
];

export default function PostSortToggle({
  value,
  onChange,
}: {
  value: 'newest' | 'popular';
  onChange: (v: 'newest' | 'popular') => void;
}) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.btn, active && styles.active]}
          >
            <Text style={[styles.text, active && styles.activeText]}>
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
