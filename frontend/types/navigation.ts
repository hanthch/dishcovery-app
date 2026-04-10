import type { AdminStackParamList } from './admin';

export type { AdminStackParamList };

export type AuthStackParamList = {
  MainApp:        undefined;
  AdminApp:       undefined;
  Welcome:        undefined;
  SignIn:         undefined;
  SignUp:         undefined;
  ForgotPassword: undefined;
  Verification:   { email: string };
  CreatePassword: { email: string; code: string };
};

export type MainTabParamList = {
  Restaurants: undefined;
  Trending:    undefined;
  UserProfile: undefined;
};

export type RootStackParamList = {
  MainTabs:         undefined;
  RestaurantDetail: { restaurantId: string };
  PostDetail:       { postId: string };
  UserProfile:      { userId: string };
};