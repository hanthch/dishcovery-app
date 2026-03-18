import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboard   from '../(admin)/AdminDashboard';
import AdminUsers       from '../(admin)/AdminUsers';
import AdminPosts       from '../(admin)/AdminPosts';
import AdminRestaurants from '../(admin)/AdminRestaurants';
import AdminReports     from '../(admin)/AdminReports';
import { useUserStore } from '../../store/userStore';
import type { AdminStackParamList } from '../../types/admin';

const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUserStore();

  if (isLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={s.loadingText}>Verifying access…</Text>
      </SafeAreaView>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={s.center}>
        <View style={s.denyIconWrap}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
        </View>
        <Text style={s.denyTitle}>Access Restricted</Text>
        <Text style={s.denySub}>Admin privileges required to view this area.</Text>
        {user && (
          <View style={s.accountPill}>
            <Text style={s.accountText}>@{user.username} · {user.role ?? 'user'}</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

export default function AdminStack() {
  return (
    <AdminGuard>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#FAFAFA' },
        }}
      >
        <Stack.Screen name="AdminDashboard"   component={AdminDashboard} />
        <Stack.Screen name="AdminUsers"       component={AdminUsers} />
        <Stack.Screen name="AdminPosts"       component={AdminPosts} />
        <Stack.Screen name="AdminRestaurants" component={AdminRestaurants} />
        <Stack.Screen name="AdminReports"     component={AdminReports} />
      </Stack.Navigator>
    </AdminGuard>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: '#FAFAFA',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  loadingText:  { color: '#666666', marginTop: 14, fontSize: 14 },
  denyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF3EA', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  denyTitle:    { color: '#1A1A1A', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  denySub:      { color: '#666666', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  accountPill:  { marginTop: 24, backgroundColor: '#F0F0F0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  accountText:  { color: '#999999', fontSize: 12 },
});