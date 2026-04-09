import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthStack  from './AuthStack';
import MainTabs   from './MainTabs';
import AdminStack from './AdminStack';

import { apiService }         from '../../services/Api.service';
import { useUserStore }       from '../../store/userStore';
import { UserProfileScreen }  from '../(tabs)/user-profile';
import { PostDetailScreen }   from '../components/post-details';
import { navigationRef }      from '../../types/navigation-ref';
import SearchScreen           from '../(tabs)/search';

import RestaurantDetailScreen from '../(tabs)/restaurants/restaurant-detail';

export type { RootStackParamList } from '../../types/navigation';
import type { RootStackParamList } from '../../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function BootScreen() {
  return (
    <View style={styles.boot}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ActivityIndicator size="large" color="#FF8C42" />
    </View>
  );
}

export default function RootNavigator() {
  const fetchCurrentUser = useUserStore(s => s.fetchCurrentUser);
  const isLoggedIn       = useUserStore(s => s.isLoggedIn);
  const user             = useUserStore(s => s.user);

  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      await apiService.ready();
      await fetchCurrentUser();
      setBooting(false);
    }
    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (booting) return <BootScreen />;

  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Navigator
        id="RootStack"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        {!isLoggedIn ? (
          /* ── Auth flow ──────────────────────────────────────────────── */
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          /* ── Authenticated flow ─────────────────────────────────────── */
          <>
            {isAdmin && (
              <Stack.Screen name="Admin" component={AdminStack} />
            )}

            {/* Main tab navigator */}
            <Stack.Screen name="Main" component={MainTabs} />

            {/* Post detail */}
            <Stack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Other user's public profile */}
            <Stack.Screen
              name="UserProfileScreen"
              component={UserProfileScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Universal search — pushed from Trending tab's search button */}
            <Stack.Screen
              name="TrendingSearch"
              component={SearchScreen}
              options={{ animation: 'slide_from_bottom' }}
            />

            {/* Restaurant detail */}
            <Stack.Screen
              name="RestaurantDetail"
              component={RestaurantDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Admin panel — accessible from settings for admin/moderator users */}
            <Stack.Screen
              name="AdminApp"
              component={AdminStack}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});