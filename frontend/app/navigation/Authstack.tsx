import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SignIn from '../(auth)/sign-in';
import SignUp from '../(auth)/sign-up';
import ForgotPassword from '../(auth)/forgot-password';
import VerifyCode from '../(auth)/verify-code';
import CreatePassword from '../(auth)/create-password';

export type AuthStackParamList = {
  SignIn: { onLoginSuccess?: () => void };
  SignUp: { onLoginSuccess?: () => void };
  ForgotPassword: undefined;
  VerifyCode: { email: string };
  CreatePassword: { email: string; code: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthStackProps {
  onLoginSuccess: () => void;
}

export default function AuthStack({ onLoginSuccess }: AuthStackProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="SignIn" 
        component={SignIn}
        initialParams={{ onLoginSuccess }}
      />
      <Stack.Screen 
        name="SignUp" 
        component={SignUp}
        initialParams={{ onLoginSuccess }}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="VerifyCode" component={VerifyCode} />
      <Stack.Screen name="CreatePassword" component={CreatePassword} />
    </Stack.Navigator>
  );
}