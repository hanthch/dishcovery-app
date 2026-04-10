import React, { useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

// ── Credentials (kept here so OAuth hooks can use them at top level) ───────
const GOOGLE_CLIENT_ID_IOS     = '326135021624-o5ou5pliff5e8tvlvspo6jrune760vgg.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = '326135021624-2uldrqbrcr69gp9uevuagdr63t42mghk.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB     = ''; // paste your Web client ID here when ready
const FACEBOOK_APP_ID          = '1213814033940168';
// ──────────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, completeSocialLogin } = useAuth();
  const [, , googlePrompt] = Google.useAuthRequest({
    iosClientId:     GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
  });

  const [, , facebookPrompt] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Sign In Failed', result.error || 'Please try again.');
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await googlePrompt();
      if (result?.type === 'success') {
        const res = await completeSocialLogin('google', {
          access_token: result.authentication?.accessToken,
        });
        if (!res.success) {
          Alert.alert('Sign In Failed', res.error || 'Google sign-in failed.');
        }
      } else if (result?.type === 'error') {
        Alert.alert('Sign In Failed', 'Google sign-in failed. Please try again.');
      }
    } catch (e) {
      Alert.alert('Sign In Failed', 'Something went wrong with Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebook = async () => {
    setLoading(true);
    try {
      const result = await facebookPrompt();
      if (result?.type === 'success') {
        const res = await completeSocialLogin('facebook', {
          access_token: result.authentication?.accessToken,
        });
        if (!res.success) {
          Alert.alert('Sign In Failed', res.error || 'Facebook sign-in failed.');
        }
      } else if (result?.type === 'error') {
        Alert.alert('Sign In Failed', 'Facebook sign-in failed. Please try again.');
      }
    } catch (e) {
      Alert.alert('Sign In Failed', 'Something went wrong with Facebook sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Sign in</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPasswordText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialContainer}>
            {/* Facebook */}
            <TouchableOpacity
              style={[styles.socialButton, loading && styles.buttonDisabled]}
              onPress={handleFacebook}
              disabled={loading}
              activeOpacity={0.7}
            >
              <FontAwesome name="facebook" size={22} color="#1877F2" />
            </TouchableOpacity>

            {/* Google */}
            <TouchableOpacity
              style={[styles.socialButton, loading && styles.buttonDisabled]}
              onPress={handleGoogle}
              disabled={loading}
              activeOpacity={0.7}
            >
              <FontAwesome name="google" size={20} color="#EA4335" />
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  backButton: {
    fontSize: 16,
    color: '#FFA500',
    fontWeight: '600',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  showPasswordText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '600',
  },
  forgotPassword: {
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'right',
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 30,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#666',
  },
  signUpLink: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '600',
  },
});