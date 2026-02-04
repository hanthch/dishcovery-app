import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RestaurantsHomeScreen from '../(tabs)/restaurants';
import Trending from '../(tabs)/trending';
import Challenges from '../(tabs)/challenges';
import UserProfile from '../(tabs)/user-profile';
import CreatePostModal from '../components/CreatePostModal';

const Tab = createBottomTabNavigator();

// - Logic to handle icon state
function getIcon(name: string, focused: boolean) {
  switch (name) {
    case 'Restaurants': return focused ? 'home' : 'home-outline';
    case 'Trending':    return focused ? 'compass' : 'compass-outline';
    case 'Challenges':  return focused ? 'trophy' : 'trophy-outline';
    case 'Profile':     return focused ? 'person' : 'person-outline';
    default:            return 'ellipse';
  }
}

// - Custom UI with the working + button
function CustomTabBar({ state, navigation, onPlusPress }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { bottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.mainNav}>
          {state.routes.map((route: any, index: number) => {
            const focused = state.index === index;
            const iconName = getIcon(route.name, focused);
            return (
              <TouchableOpacity key={route.key} onPress={() => navigation.navigate(route.name)} style={styles.iconButton}>
                <View style={[styles.iconCircle, focused && styles.activeCircle]}>
                  <Ionicons name={iconName} size={22} color={focused ? '#FFF' : '#999'} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.plusButton} onPress={onPlusPress}>
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppTabs() {
  const [showCreatePost, setShowCreatePost] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => (
          <CustomTabBar {...props} onPlusPress={() => setShowCreatePost(true)} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Restaurants" component={RestaurantsHomeScreen} />
        <Tab.Screen name="Trending" component={Trending} />
        <Tab.Screen name="Challenges" component={Challenges} />
        <Tab.Screen name="Profile" component={UserProfile} />
      </Tab.Navigator>

      <CreatePostModal visible={showCreatePost} onClose={() => setShowCreatePost(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 15, right: 15, alignItems: 'center', zIndex: 99 },
  tabBarContainer: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  mainNav: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 40, padding: 8, flex: 1, marginRight: 12, elevation: 10, justifyContent: 'space-around' },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  activeCircle: { backgroundColor: '#FF8C42' },
  plusButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF8C42', alignItems: 'center', justifyContent: 'center', elevation: 10 }
});