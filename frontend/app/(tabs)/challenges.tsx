import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function ChallengesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#FF8C42', marginBottom: 12 }}>
          Challenges Coming Soon
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          Participate in food challenges and earn badges
        </Text>
      </View>
    </SafeAreaView>
  );
}
