import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import RestaurantStack  from './RestaurantStack';
import TrendingScreen   from '../(tabs)/trending';
import { UserProfileScreen } from '../(tabs)/user-profile';
import CreatePostModal  from '../components/create-post-modal';
import { navigationRef, navigate as navRefNavigate } from '../../types/navigation-ref';

import type { MainTabParamList } from '../../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const { width } = Dimensions.get('window');

// ── Icon mapping ──────────────────────────────────────────────────────────────
function getIcon(name: keyof MainTabParamList, focused: boolean): string {
  switch (name) {
    case 'Restaurants': return focused ? 'home'    : 'home-outline';
    case 'Trending':    return focused ? 'compass' : 'compass-outline';
    case 'UserProfile': return focused ? 'person'  : 'person-outline';
    default:            return 'ellipse-outline';
  }
}

// ── Own-profile screen wrapper ────────────────────────────────────────────────
function OwnProfileScreen() {
  const navigation = useNavigation<any>();
  const rootNav = { navigate: navRefNavigate };

  return (
    <UserProfileScreen
      isOwnProfile={true}
      onClose={() => { /* no-op */ }}
      onPostPress={(post) => rootNav.navigate('PostDetail', { postId: post.id })}
      onUserPress={(userId) => rootNav.navigate('UserProfileScreen', { userId })}
      navigation={navigation}
    />
  );
}

// ── Custom floating tab bar ───────────────────────────────────────────────────
function CustomTabBar({
  state,
  navigation,
  onPlusPress,
}: BottomTabBarProps & { onPlusPress: () => void }) {
  const insets = useSafeAreaInsets();

  const bottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom, 8)
    : 16;

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.mainNav}>
          {state.routes.map((route, index) => {
            const focused  = state.index === index;
            const iconName = getIcon(route.name as keyof MainTabParamList, focused);

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={styles.iconButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={route.name}
                accessibilityState={{ selected: focused }}
              >
                <View style={[styles.iconCircle, focused && styles.iconCircleActive]}>
                  <Ionicons
                    name={iconName as any}
                    size={22}
                    color={focused ? '#FFFFFF' : '#666666'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FAB — create post */}
        <TouchableOpacity
          style={styles.fab}
          onPress={onPlusPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Tạo bài viết"
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main tabs ─────────────────────────────────────────────────────────────────
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
        <Tab.Screen name="Restaurants" component={RestaurantStack} />
        <Tab.Screen name="Trending"    component={TrendingScreen} />
        {/* Own profile tab. Public profiles are pushed as 'PublicProfile'
            on the ROOT stack via rootNav.navigate('PublicProfile', { userId }). */}
        <Tab.Screen name="UserProfile" component={OwnProfileScreen} />
      </Tab.Navigator>

      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const TAB_MAX_WIDTH = Math.min(width - 24, 500);

const styles = StyleSheet.create({
  wrapper: {
    position:       'absolute',
    left:           0,
    right:          0,
    alignItems:     'center',
    zIndex:         99,
    pointerEvents:  'box-none',
  },
  tabBarContainer: {
    flexDirection:  'row',
    alignItems:     'center',
    width:          TAB_MAX_WIDTH,
    paddingHorizontal: 8,
  },
  mainNav: {
    flexDirection:    'row',
    backgroundColor:  '#FFFFFF',
    borderRadius:     40,
    paddingHorizontal: 8,
    paddingVertical:   8,
    flex:             1,
    marginRight:      10,
    justifyContent:   'space-around',
    alignItems:       'center',
    shadowColor:      '#000000',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.10,
    shadowRadius:     12,
    elevation:        10,
    borderWidth:      1,
    borderColor:      'rgba(0,0,0,0.05)',
  },
  iconButton: {
    alignItems:     'center',
    justifyContent: 'center',
    padding:        2,
  },
  iconCircle: {
    width:          46,
    height:         46,
    borderRadius:   23,
    justifyContent: 'center',
    alignItems:     'center',
  },
  iconCircleActive: {
    backgroundColor: '#FF8C42',
    shadowColor:     '#FF8C42',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.35,
    shadowRadius:    6,
    elevation:       4,
  },
  fab: {
    backgroundColor: '#FF8C42',
    width:           62,
    height:          62,
    borderRadius:    31,
    justifyContent:  'center',
    alignItems:      'center',
    marginTop:       -16,
    shadowColor:     '#FF8C42',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    8,
    elevation:       12,
    borderWidth:     4,
    borderColor:     '#FFFFFF',
  },
});