import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

export function SearchResultItem({ result, onPress }) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {result.title}
          </Text>

          {result.type === 'restaurant' && (
            <Text style={styles.price}>
              {'₫'.repeat(result.data?.price_range || 1)}
            </Text>
          )}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {result.subtitle}
        </Text>

        {/* 🍜 FOOD TAGS */}
        {result.type === 'restaurant' &&
          result.data?.food_types?.length > 0 && (
            <View style={styles.tags}>
              {result.data.food_types.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

        {/* 📍 LANDMARK */}
        {result.data?.landmark_notes && (
          <Text style={styles.landmark}>
            📍 {result.data.landmark_notes}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#CCC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderColor: '#EEE',
  },
  content: { flex: 1, paddingRight: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { fontWeight: '700', fontSize: 15 },
  price: { color: COLORS.primary, fontWeight: '600' },
  subtitle: { color: '#666', marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: {
    backgroundColor: '#EEE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11 },
  landmark: { fontSize: 11, color: '#777', marginTop: 4 },
});
