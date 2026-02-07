import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RestaurantsHomeScreen from '../(tabs)/restaurants/index'; 
import CategoryScreen from '../(tabs)/restaurants/category'; 
import Top10Screen from '../(tabs)/restaurants/top10';
import RestaurantDetailScreen from '../(tabs)/restaurants/restaurant-detail';
import RestaurantSearchScreen from '../(tabs)/restaurants/restaurant-search';
import { RestaurantStackParamList } from '../../types/restaurant';

const Stack = createNativeStackNavigator<RestaurantStackParamList>();

export default function RestaurantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main Restaurant Home Screen */}
      <Stack.Screen 
        name="RestaurantHome" 
        component={RestaurantsHomeScreen} 
      />
      
      {/* Top 10 Screen */}
      <Stack.Screen 
        name="Top10" 
        component={Top10Screen}
        options={{ 
          headerShown: true, 
          title: 'Top 10 Quán Ăn Nổi Bật Nhất Tuần Này',
          headerTitleStyle: { fontWeight: '700' }
        }} 
      />
      
      {/* Category Screen - Used for filtering by cuisine/category */}
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={{ 
          headerShown: true,
          headerTitleStyle: { fontWeight: '700' }
        }} 
      />
      
      {/* Restaurant Detail Screen */}
      <Stack.Screen 
        name="RestaurantDetail" 
        component={RestaurantDetailScreen} 
        options={{ 
          headerShown: true,
          headerTitleStyle: { fontWeight: '700' }
        }} 
      />
      
      {/* Restaurant Search Screen */}
      <Stack.Screen 
        name="RestaurantSearch" 
        component={RestaurantSearchScreen} 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack.Navigator>
  );
}