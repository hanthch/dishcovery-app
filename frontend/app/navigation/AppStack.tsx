import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Restaurants stack
import RestaurantsMain from '../(tabs)/restaurants/index';
import Category from '../(tabs)/restaurants/category';
import Search from '../(tabs)/restaurants/search';
import Top10 from '../(tabs)/restaurants/top10';
import RestaurantDetail from '../(tabs)/restaurants/restaurant-detail';

// Single screens
import Trending from '../(tabs)/trending';
import Challenges from '../(tabs)/challenges';
import UserProfileScreen from '../(tabs)/user-profile';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();


// ---------------- RESTAURANTS STACK ----------------

function RestaurantsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RestaurantsMain" component={RestaurantsMain} />
      <Stack.Screen name="Category" component={Category} />
      <Stack.Screen name="Search" component={Search} />
      <Stack.Screen name="Top10" component={Top10} />
      <Stack.Screen name="RestaurantDetail" component={RestaurantDetail} />
    </Stack.Navigator>
  );
}


// ---------------- ICON HELPER ----------------

function getIcon(routeName: string, focused: boolean) {
  switch (routeName) {
    case 'Restaurants':
      return focused ? 'home' : 'home-outline';
    case 'Trending':
      return focused ? 'compass' : 'compass-outline';
    case 'Challenges':
      return focused ? 'trophy' : 'trophy-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'ellipse';
  }
}


// ---------------- CUSTOM TAB BAR ----------------

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const iconName = getIcon(route.name, isFocused);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.iconButton}
            >
              <View style={[styles.iconCircle, isFocused && styles.activeCircle]}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? '#fff' : '#333'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating + button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}


// ---------------- MAIN APP STACK ----------------

export default function AppStack() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Restaurants" component={RestaurantsStack} />
      <Tab.Screen name="Trending" component={Trending} />
      <Tab.Screen name="Challenges" component={Challenges} />
      <Tab.Screen name="Profile" component={UserProfileScreen} />
    </Tab.Navigator>
  );
}


// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    width: '100%',
    elevation: 10,
  },

  iconButton: {
    flex: 1,
    alignItems: 'center',
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeCircle: {
    backgroundColor: '#ff8c2a',
  },

  fab: {
    position: 'absolute',
    right: -10,
    top: -20,
    backgroundColor: '#ff8c2a',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
  },
});
