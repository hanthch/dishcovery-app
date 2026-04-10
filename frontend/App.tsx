import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PostContext } from './context/PostContext';
import { useUserStore } from './store/userStore';

import { AuthStackParamList } from './types/navigation';
import { Post } from './types/post';

import WelcomeScreen        from './app/(auth)/welcome';
import SignInScreen         from './app/(auth)/sign-in';
import SignUpScreen         from './app/(auth)/sign-up';
import ForgotPasswordScreen from './app/(auth)/forgot-password';
import VerificationScreen   from './app/(auth)/verify-code';
import CreatePasswordScreen from './app/(auth)/create-password';

import MainTabs   from './app/navigation/MainTabs';
import AdminStack from './app/navigation/AdminStack';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack  = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <AuthStack.Screen name="Welcome"        component={WelcomeScreen} />
      <AuthStack.Screen name="SignIn"         component={SignInScreen} />
      <AuthStack.Screen name="SignUp"         component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="Verification"   component={VerificationScreen} />
      <AuthStack.Screen name="CreatePassword" component={CreatePasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main app (tabs + restaurant stack) */}
      <AppStack.Screen name="MainApp" component={MainTabs} />

      {/*
       * AdminApp wraps the full AdminStack.
       * Navigating to nested admin screens from anywhere in the app:
       *
       *   navigation.navigate('AdminApp', {
       *     screen: 'AdminRestaurants',
       *     params: { status: undefined },
       *   })
       *
       * React Navigation will forward `screen` + `params` into AdminStack
       * automatically because AdminStack is a nested navigator.
       */}
      <AppStack.Screen
        name="AdminApp"
        component={AdminStack}
        options={{ animation: 'slide_from_right' }}
      />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const { isLoggedIn, setUser } = useUserStore();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const raw   = await AsyncStorage.getItem('userData');
        if (token && raw) setUser(JSON.parse(raw));
      } catch (e) {
        console.warn('[App] Failed to restore session:', e);
      } finally {
        setIsBootstrapping(false);
      }
    };
    bootstrap();
  }, []);

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return isLoggedIn ? <AppNavigator /> : <AuthNavigator />;
}

function RootApp() {
  const [posts, setPosts] = useState<Post[]>([]);

  const postContextValue = useMemo(
    () => ({
      posts,
      addPost: (post: Post) => setPosts((prev) => [post, ...prev]),
    }),
    [posts]
  );

  return (
    <PostContext.Provider value={postContextValue}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </PostContext.Provider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootApp />
    </QueryClientProvider>
  );
}