import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

const MODES = ['new', 'popular'] as const;

export function SearchFilters({
  value,
  onChange,
}: {
  value: 'new' | 'popular';
  onChange: (v: 'new' | 'popular') => void;
}) {
  return (
    <View style={styles.row}>
      {MODES.map((mode) => {
        const active = value === mode;

        return (
          <TouchableOpacity
            key={mode}
            onPress={() => onChange(mode)}
            style={[
              styles.btn,
              active && styles.active,
            ]}
          >
            <Text
              style={[
                styles.text,
                active && styles.textActive,
              ]}
            >
              {mode === 'new' ? 'Mới nhất' : 'Phổ biến'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEE',
  },
  active: { backgroundColor: COLORS.primary },
  text: { fontWeight: '600', color: '#333' },
  textActive: { color: '#FFF' },
});
