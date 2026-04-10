import React, {
  useState, useRef, useCallback,
  createContext, useContext,
  type ReactNode,
} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RestaurantStack   from './RestaurantStack';
import TrendingScreen    from '../(tabs)/trending';
import { UserProfileScreen } from '../(tabs)/user-profile';
import CreatePostModal   from '../components/create-post-modal';
import { MainTabParamList } from '../../types/navigation';

type ScrollFABContextType = {
  onTabScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const ScrollFABContext = createContext<ScrollFABContextType>({
  onTabScroll: () => {},
});


export function useScrollFAB() {
  return useContext(ScrollFABContext);
}


function getIcon(name: keyof MainTabParamList, focused: boolean): React.ComponentProps<typeof Ionicons>['name'] {
  switch (name) {
    case 'Restaurants': return focused ? 'home'    : 'home-outline';
    case 'Trending':    return focused ? 'compass' : 'compass-outline';
    case 'UserProfile': return focused ? 'person'  : 'person-outline';
    default:            return 'ellipse';
  }
}


interface CustomTabBarProps extends BottomTabBarProps {
  onPlusPress:  () => void;
  fabOpacity:   Animated.Value;
  fabScale:     Animated.Value;
}

function CustomTabBar({
  state, navigation,
  onPlusPress, fabOpacity, fabScale,
}: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.tabBarContainer}>

        <View style={styles.pill}>
          {state.routes.map((route, index) => {
            const focused   = state.index === index;
            const iconName  = getIcon(route.name as keyof MainTabParamList, focused);

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={styles.iconButton}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Animated.View style={[styles.iconCircle, focused && styles.activeCircle]}>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={focused ? '#FFFFFF' : '#9A9A9A'}
                  />
                </Animated.View>
                {focused && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Animated.View
          style={[
            styles.fabWrapper,
            {
              opacity:   fabOpacity,
              transform: [{ scale: fabScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={onPlusPress}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const [showCreatePost, setShowCreatePost] = useState(false);

  const fabOpacity  = useRef(new Animated.Value(1)).current;
  const fabScale    = useRef(new Animated.Value(1)).current;
  const lastOffsetY = useRef(0);
  const isHidden    = useRef(false);

  const showFAB = useCallback(() => {
    if (!isHidden.current) return;
    isHidden.current = false;
    Animated.parallel([
      Animated.spring(fabOpacity, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.spring(fabScale,   { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 6 }),
    ]).start();
  }, [fabOpacity, fabScale]);

  const hideFAB = useCallback(() => {
    if (isHidden.current) return;
    isHidden.current = true;
    Animated.parallel([
      Animated.timing(fabOpacity, { toValue: 0.28, useNativeDriver: true, duration: 220 }),
      Animated.timing(fabScale,   { toValue: 0.82, useNativeDriver: true, duration: 220 }),
    ]).start();
  }, [fabOpacity, fabScale]);

  const onTabScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = e.nativeEvent.contentOffset.y;
      const diff     = currentY - lastOffsetY.current;
      lastOffsetY.current = currentY;

      if (currentY < 40) { showFAB(); return; }

      if (diff > 4)       hideFAB();   
      else if (diff < -4) showFAB();   
    },
    [showFAB, hideFAB]
  );

  return (
    <ScrollFABContext.Provider value={{ onTabScroll }}>
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{ headerShown: false }}
          tabBar={(props) => (
            <CustomTabBar
              {...props}
              onPlusPress={() => setShowCreatePost(true)}
              fabOpacity={fabOpacity}
              fabScale={fabScale}
            />
          )}
        >
          <Tab.Screen name="Restaurants" component={RestaurantStack}   />
          <Tab.Screen name="Trending"    component={TrendingScreen}    />
          <Tab.Screen name="UserProfile" component={UserProfileScreen} />
        </Tab.Navigator>

        <CreatePostModal
          visible={showCreatePost}
          onClose={() => setShowCreatePost(false)}
        />
      </View>
    </ScrollFABContext.Provider>
  );
}


const PILL_HEIGHT = 62;
const FAB_SIZE    = 60;

const styles = StyleSheet.create({
  wrapper: {
    position:   'absolute',
    left:       16,
    right:      16,
    zIndex:     99,
  },

  tabBarContainer: {
    flexDirection:  'row',
    alignItems:     'center',
    width:          '100%',
  },

  pill: {
    flex:             1,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-around',
    backgroundColor:  '#1C1C1E',          
    borderRadius:     PILL_HEIGHT / 2,
    height:           PILL_HEIGHT,
    paddingHorizontal: 10,
    marginRight:      14,
    shadowColor:      '#000000',
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.22,
    shadowRadius:     16,
    elevation:        14,
  },

  iconButton: {
    alignItems:     'center',
    justifyContent: 'center',
    flex:           1,
    height:         '100%',
    paddingVertical: 8,
  },

  iconCircle: {
    width:          42,
    height:         42,
    borderRadius:   21,
    justifyContent: 'center',
    alignItems:     'center',
  },

  activeCircle: {
    backgroundColor: '#FF8C42',          
    shadowColor:     '#FF8C42',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.55,
    shadowRadius:    8,
    elevation:       6,
  },

  activeDot: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: '#FF8C42',
    marginTop:       3,
  },

  fabWrapper: {
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   6,
  },

  fab: {
    backgroundColor: '#FF8C42',
    width:           FAB_SIZE,
    height:          FAB_SIZE,
    borderRadius:    FAB_SIZE / 2,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     3.5,
    borderColor:     '#FFFFFF',
    shadowColor:     '#FF8C42',
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.50,
    shadowRadius:    12,
    elevation:       16,
  },
});