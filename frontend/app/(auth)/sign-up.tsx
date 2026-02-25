import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    phoneNumber: '', // VN number WITHOUT +84
    username: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const normalizeVNPhone = (value: string) => {
    // Remove non-digits
    let v = value.replace(/\D/g, '');

    // Remove leading 0 if user types it
    if (v.startsWith('0')) {
      v = v.slice(1);
    }

    // Limit to 9 digits
    return v.slice(0, 9);
  };

  // ✅ FIXED: Standardized password validation (matching Create Password screen)
  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase) {
      return { 
        valid: false, 
        error: 'Password must contain uppercase and lowercase letters' 
      };
    }

    if (!hasNumber) {
      return { valid: false, error: 'Password must contain at least one number' };
    }

    return { valid: true };
  };

  const handleSignUp = async () => {
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      username,
      phoneNumber,
      birthDate,
    } = formData;

    // 1. Check required fields
    if (!email || !password || !confirmPassword || !firstName || !lastName || !username) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    // 3. ✅ FIXED: Password strength validation (matching Create Password screen)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Weak Password', passwordValidation.error!);
      return;
    }

    // 4. Password match
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    // 5. Phone number validation
    if (phoneNumber && phoneNumber.length !== 9) {
      Alert.alert(
        'Invalid Phone Number',
        'Vietnam phone number must have 9 digits (after +84)'
      );
      return;
    }

    // 6. Date of birth validation (optional but recommended)
    if (birthDate) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(birthDate)) {
        Alert.alert(
          'Invalid Date',
          'Please enter date in DD/MM/YYYY format'
        );
        return;
      }
    }

    const fullPhoneNumber = phoneNumber ? `+84${phoneNumber}` : undefined;

    setLoading(true);
    
    // ✅ FIXED: Send camelCase fields to match backend expectations
    const result = await signUp({
      email,
      password,
      username,
      firstName,          
      lastName,           
      birthDate,          
      phoneNumber: fullPhoneNumber, 
    });
    
    setLoading(false);

    if (!result.success) {
      Alert.alert('Sign Up Failed', result.error || 'Please try again.');
    } else {
      Alert.alert(
        'Success!', 
        'Account created successfully. Please sign in.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
      );
    }
  };

  // ✅ Real-time password strength indicator
  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return null;

    const hasLength = password.length >= 8;
    const hasUpperLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return { hasLength, hasUpperLower, hasNumber };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image source={{ uri: '/assets/images/logo.png' }} style={styles.logo} />
          </View>

          <Text style={styles.title}>Sign up</Text>
          <Text style={styles.subtitle}>Create an account to continue</Text>

          {/* Username */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a unique username"
              placeholderTextColor="#999"
              autoCapitalize="none"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text.trim() })}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text.trim() })}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                editable={!loading}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPasswordText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* ✅ Password strength indicator */}
            {passwordStrength && formData.password && (
              <View style={styles.strengthContainer}>
                <Text style={[
                  styles.strengthItem, 
                  passwordStrength.hasLength && styles.strengthMet
                ]}>
                  {passwordStrength.hasLength ? '✓' : '•'} At least 8 characters
                </Text>
                <Text style={[
                  styles.strengthItem, 
                  passwordStrength.hasUpperLower && styles.strengthMet
                ]}>
                  {passwordStrength.hasUpperLower ? '✓' : '•'} Mix of uppercase & lowercase
                </Text>
                <Text style={[
                  styles.strengthItem, 
                  passwordStrength.hasNumber && styles.strengthMet
                ]}>
                  {passwordStrength.hasNumber ? '✓' : '•'} At least one number
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={formData.confirmPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, confirmPassword: text })
              }
              editable={!loading}
              autoCapitalize="none"
            />
          </View>

          {/* Names */}
          <View style={styles.rowContainer}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor="#999"
                value={formData.firstName}
                onChangeText={(text) =>
                  setFormData({ ...formData, firstName: text })
                }
                editable={!loading}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor="#999"
                value={formData.lastName}
                onChangeText={(text) =>
                  setFormData({ ...formData, lastName: text })
                }
                editable={!loading}
              />
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#999"
              value={formData.birthDate}
              onChangeText={(text) =>
                setFormData({ ...formData, birthDate: text })
              }
              editable={!loading}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* VN Phone */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number (Vietnam)</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.phoneCode}>+84</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="901234567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={formData.phoneNumber}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    phoneNumber: normalizeVNPhone(text),
                  })
                }
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signUpButton, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.signUpButtonText}>
              {loading ? 'Creating account...' : 'Sign up'}
            </Text>
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.signInLink}>Sign in</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fcfcfc',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fcfcfc',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  showPasswordText: {
    fontSize: 11,
    color: '#FFA500',
    fontWeight: '600',
  },
  strengthContainer: {
    marginTop: 8,
    paddingLeft: 4,
  },
  strengthItem: {
    fontSize: 11,
    color: '#999',
    marginBottom: 3,
  },
  strengthMet: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
    marginBottom: 16,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fcfcfc',
  },
  phoneCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  signUpButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#666',
  },
  signInLink: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '600',
  },
});