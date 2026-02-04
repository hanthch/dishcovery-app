import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api';

interface CreatePasswordScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
      code: string;
    };
  };
}

export default function CreatePasswordScreen({ navigation, route }: CreatePasswordScreenProps) {
  const { email, code } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.resetPassword(email, code, password);
      Alert.alert(
        'Success',
        'Your password has been reset successfully',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('SignIn'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { text: 'Weak', color: '#FF4444' };
    if (password.length < 8) return { text: 'Medium', color: '#FFA500' };
    return { text: 'Strong', color: '#00C853' };
  };

  const strength = getPasswordStrength();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoTextTop}>DISH</Text>
            <Text style={styles.logoTextBottom}>COVERY</Text>
            <View style={styles.logoSmile} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Create Password</Text>
        <Text style={styles.subtitle}>
          Create your new password to login
        </Text>

        {/* New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="• • • • • • • •"
              placeholderTextColor="#B0B0B0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {strength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                <View
                  style={[
                    styles.strengthBar,
                    { backgroundColor: strength.color },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    password.length >= 6 && {
                      backgroundColor: strength.color,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    password.length >= 8 && {
                      backgroundColor: strength.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>
                {strength.text}
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="• • • • • • • •"
              placeholderTextColor="#B0B0B0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* Password Match Indicator */}
          {confirmPassword.length > 0 && (
            <View style={styles.matchContainer}>
              {password === confirmPassword ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#00C853" />
                  <Text style={styles.matchTextSuccess}>Passwords match</Text>
                </>
              ) : (
                <>
                  <Ionicons name="close-circle" size={16} color="#FF4444" />
                  <Text style={styles.matchTextError}>Passwords don't match</Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Create Password Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreatePassword}
          disabled={loading || !password || password !== confirmPassword}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.createButtonText}>CREATE PASSWORD</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoTextTop: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1.5,
  },
  logoTextBottom: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1.5,
  },
  logoSmile: {
    position: 'absolute',
    bottom: 25,
    width: 40,
    height: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  strengthContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  matchTextSuccess: {
    fontSize: 12,
    color: '#00C853',
    fontWeight: '600',
  },
  matchTextError: {
    fontSize: 12,
    color: '#FF4444',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#FF7B7B',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF7B7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});