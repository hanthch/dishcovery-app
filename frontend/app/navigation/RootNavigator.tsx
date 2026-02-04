import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Screens
import WelcomeScreen from '../(screens)/welcome';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // 1. Check if first time user (onboarding)
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      
      // 2. Check if user is already logged in by looking for the token
      const authToken = await AsyncStorage.getItem('authToken');
      
      setIsFirstTime(hasSeenWelcome === null);
      setIsAuthenticated(!!authToken); 
      
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWelcomeComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setIsFirstTime(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  /**
   * Fully implemented Login Success handler
   * Call this from SignIn/SignUp after getting the API response
   */
  const handleLoginSuccess = async (token: string, userData: any) => {
    try {
      // Persist both token and user info
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Switch the navigator state
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during login transition:', error);
    }
  };

  /**
   * Fully implemented Logout handler
   * Call this from your Profile screen
   */
  const handleLogout = async () => {
    try {
      // Clear all auth-related storage items
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Prevent flicker during boot
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isFirstTime ? (
        // SCENARIO 1: First launch
        <Stack.Screen name="Welcome">
          {(props) => (
            <WelcomeScreen {...props} onComplete={handleWelcomeComplete} />
          )}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        // SCENARIO 2: Needs Login
        <Stack.Screen name="Auth">
          {(props) => (
            <AuthStack {...props} onLoginSuccess={handleLoginSuccess} />
          )}
        </Stack.Screen>
      ) : (
        // SCENARIO 3: Main Application
        <Stack.Screen name="App">
          {(props) => (
            <AppStack {...props} onLogout={handleLogout} />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});