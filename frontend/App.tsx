import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PostContext } from './context/PostContext';
import { useUserStore } from './store/userStore';

// Navigation Types
import { AuthStackParamList } from './types/navigation';
import { Post } from './types/post';

// Auth Screens
import WelcomeScreen from './app/(auth)/welcome';
import SignInScreen from './app/(auth)/sign-in';
import SignUpScreen from './app/(auth)/sign-up';
import ForgotPasswordScreen from './app/(auth)/forgot-password';
import VerificationScreen from './app/(auth)/verify-code';
import CreatePasswordScreen from './app/(auth)/create-password';

// Main App
import MainTabs from './app/navigation/MainTabs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const Stack = createNativeStackNavigator<AuthStackParamList>();

function RootNavigator() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const { isLoggedIn, setUser } = useUserStore();

  // Restore session from AsyncStorage on launch
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const raw   = await AsyncStorage.getItem('userData');
        if (token && raw) {
          setUser(JSON.parse(raw)); // restores user → sets isLoggedIn: true
        }
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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {isLoggedIn ? (
        <Stack.Group>
          <Stack.Screen name="MainApp" component={MainTabs} />
        </Stack.Group>
      ) : (
        <Stack.Group screenOptions={{ animation: 'fade' }}>
          <Stack.Screen name="Welcome"        component={WelcomeScreen} />
          <Stack.Screen name="SignIn"         component={SignInScreen} />
          <Stack.Screen name="SignUp"         component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Verification"   component={VerificationScreen} />
          <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
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