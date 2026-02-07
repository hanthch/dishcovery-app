import React, { useState } from 'react';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// UPDATED: Import RestaurantStack instead of RestaurantsHomeScreen
import RestaurantStack from './RestaurantStack';
import TrendingScreen from '../(tabs)/trending';
import ChallengesScreen from '../(tabs)/challenges';
import { UserProfileScreen } from '../(tabs)/user-profile';
import CreatePostModal from '../components/create-post-modal';

import { MainTabParamList } from '../../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

/* ---------- ICON MAPPER ---------- */
function getIcon(name: keyof MainTabParamList, focused: boolean) {
  switch (name) {
    case 'Restaurants':
      return focused ? 'home' : 'home-outline';
    case 'Trending':
      return focused ? 'compass' : 'compass-outline';
    case 'Challenges':
      return focused ? 'trophy' : 'trophy-outline';
    case 'UserProfile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'ellipse';
  }
}

/* ---------- CUSTOM TAB BAR ---------- */
function CustomTabBar({
  state,
  navigation,
  onPlusPress,
}: BottomTabBarProps & { onPlusPress: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom || 20 }]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.mainNav}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const iconName = getIcon(route.name as keyof MainTabParamList, focused);

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, focused && styles.activeCircle]}>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={focused ? '#fff' : '#555'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={onPlusPress}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------- MAIN TABS ---------- */
export default function MainTabs() {
  const [showCreatePost, setShowCreatePost] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            onPlusPress={() => setShowCreatePost(true)}
          />
        )}
      >
        {/* UPDATED: Use RestaurantStack instead of RestaurantsHomeScreen */}
        <Tab.Screen name="Restaurants" component={RestaurantStack} />
        <Tab.Screen name="Trending" component={TrendingScreen} />
        <Tab.Screen name="Challenges" component={ChallengesScreen} />
        <Tab.Screen name="UserProfile" component={UserProfileScreen} />
      </Tab.Navigator>

      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 15,
    right: 15,
    alignItems: 'center',
    zIndex: 99,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  mainNav: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flex: 1,
    marginRight: 12,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 10,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCircle: {
    backgroundColor: '#FF8C42',
  },
  fab: {
    backgroundColor: '#FF8C42',
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    borderWidth: 4,
    borderColor: '#FFF',
    marginTop: -20,
  },
});