import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verification'>;

export default function VerificationScreen({ navigation, route }: Props) {
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { verifyCode, forgotPassword } = useAuth();

  useEffect(() => {
    if (route?.params?.email) {
      setEmail(route.params.email);
    }
  }, [route?.params?.email]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    const newCodes = [...codes];
    newCodes[index] = digit.slice(-1);
    setCodes(newCodes);

    // Auto focus next input if value is entered
    if (digit && index < codes.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number) => {
    // If current box is empty, move focus to previous box
    if (index > 0 && !codes[index]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = codes.join('');
    
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit verification code');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is missing. Please go back and try again.');
      navigation.navigate('ForgotPassword');
      return;
    }

    setLoading(true);
    
    // ✅ FIXED: Actually calls backend to verify code
    const result = await verifyCode(email, code);
    
    setLoading(false);

    if (result.success) {
      // Navigate to Create Password with email and code
      navigation.navigate('CreatePassword', { email, code });
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid or expired code');
      // Clear code on failure for security/retry
      setCodes(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  // ✅ FIXED: Implement resend code functionality
  const handleResend = async () => {
    if (resendCooldown > 0) {
      return; // Don't allow resend during cooldown
    }

    if (!email) {
      Alert.alert('Error', 'Email is missing');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'A new verification code has been sent to your email');
      // Clear current codes
      setCodes(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      // Set 60 second cooldown
      setResendCooldown(60);
    } else {
      Alert.alert('Error', result.error || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with back button */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: '/assets/images/logo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Enter Verification Code</Text>

        {/* Dynamic Email Display */}
        <Text style={styles.emailText}>
          {email ? `Code sent to ${email}` : 'Please enter the code sent to your email'}
        </Text>

        {/* Code Input Boxes */}
        <View style={styles.codeInputContainer}>
          {codes.map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={styles.codeInput}
              maxLength={1}
              keyboardType="number-pad"
              value={codes[index]}
              onChangeText={(value) => handleCodeChange(index, value)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace') {
                  handleBackspace(index);
                }
              }}
              editable={!loading}
              placeholder="-"
              placeholderTextColor="#ccc"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        {/* ✅ FIXED: Resend Code with cooldown */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't get a code? </Text>
          <TouchableOpacity 
            onPress={handleResend}
            disabled={resendCooldown > 0 || loading}
          >
            <Text style={[
              styles.resendLink,
              (resendCooldown > 0 || loading) && styles.resendDisabled
            ]}>
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s` 
                : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help text */}
        <Text style={styles.helpText}>
          Check your spam folder if you don't see the email
        </Text>
      </ScrollView>
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
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1a1a1a',
    backgroundColor: '#f9f9f9',
  },
  verifyButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '600',
  },
  resendDisabled: {
    color: '#ccc',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});