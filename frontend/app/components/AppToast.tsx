import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../store/toastStore';
import { COLORS } from '../constants/theme';

export function AppToast() {
  const { visible, message, type } = useToastStore();

  if (!visible) return null;

  const icon =
    type === 'success'
      ? 'checkmark-circle'
      : type === 'error'
      ? 'alert-circle'
      : 'information-circle';

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={20} color="#FFF" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
