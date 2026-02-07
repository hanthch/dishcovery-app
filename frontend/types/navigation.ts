export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Verification: { email: string };
  CreatePassword: { email: string; code: string };
  MainApp: undefined;
};

export type MainTabParamList = {
  Trending: undefined;
  Search: undefined;
  PostDetail: { postId: string | number };
  Restaurants: undefined;
  Challenges: undefined;
  UserProfile: { userId: string | number };
  RestaurantDetail: { restaurantId: string | number };
};

export type RootStackParamList = {
  MainTabs: undefined;
  RestaurantDetail: { restaurantId: string };
  PostDetail: { postId: string };
  UserProfile: { userId: string };
};
