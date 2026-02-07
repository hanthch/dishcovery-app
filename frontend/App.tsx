import React, { useState, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { PostContext } from './context/PostContext';

// Navigation Types
import { AuthStackParamList } from './types/navigation'; 
import { Post } from './types/post'; 

import WelcomeScreen from './app/(auth)/welcome';
import SignInScreen from './app/(auth)/sign-in';
import SignUpScreen from './app/(auth)/sign-up';
import ForgotPasswordScreen from './app/(auth)/forgot-password';
import VerificationScreen from './app/(auth)/verify-code';
import CreatePasswordScreen from './app/(auth)/create-password';

import MainTabs from './app/navigation/MainTabs';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Use the ParamList to type your Stack
const Stack = createNativeStackNavigator<AuthStackParamList>();

const RootNavigator = () => {
  const { isLoading, userToken } = useAuth();

  if (isLoading) {
    return null; 
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right', 
      }}
    >
      {/* TEMPORARILY: Always show MainApp, skip auth */}
      <Stack.Screen name="MainApp" component={MainTabs} />
      
      {/* Original auth logic - commented out for now
      {userToken ? (
        <Stack.Group>
          <Stack.Screen name="MainApp" component={MainTabs} />
        </Stack.Group>
      ) : (
        <Stack.Group screenOptions={{ animation: 'fade' }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Verification" component={VerificationScreen} />
          <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
        </Stack.Group>
      )}
      */}
    </Stack.Navigator>
  );
};

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
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}