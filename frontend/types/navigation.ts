export type AuthStackParamList = {
  MainApp:        undefined;
  Welcome:        undefined;
  SignIn:         undefined;
  SignUp:         undefined;
  ForgotPassword: undefined;
  Verification:   { email: string };
  CreatePassword: { email: string; code: string };
};

export type MainTabParamList = {
  Restaurants:  undefined;
  Trending:     undefined;
  UserProfile:  undefined;
};

export type RootStackParamList = {
  Auth:              undefined;
  Main:              undefined;
  Admin:             undefined;
  /** Admin panel pushed from settings for admin/moderator users */
  AdminApp:          undefined;
  PostDetail:        { postId: string };
  /** Public profile for any user other than the logged-in user */
  UserProfileScreen: { userId: string };
  RestaurantDetail:  { restaurantId: string };
  /** Universal search screen — navigated to from the Trending tab search button */
  TrendingSearch:    undefined;
};