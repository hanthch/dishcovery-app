import React, { useState } from 'react';
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
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword }  = useAuth();

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(trimmed);
    setLoading(false);

    if (result.success) {
      navigation.navigate('Verification', { email: trimmed });
    } else {
      Alert.alert('Error', result.error || 'Failed to send verification code.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Ionicons name="lock-open-outline" size={34} color="#FF8C42" />
            </View>
          </View>

          {/* Header */}
          <Text style={s.title}>Forgot Password?</Text>
          <Text style={s.subtitle}>
            No worries! Enter the email linked to your account and we'll send you a 6-digit reset code.
          </Text>

          {/* Email field */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Email Address</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={18} color="#999" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="your@email.com"
                placeholderTextColor="#BBBBBB"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleSend}
              />
            </View>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.primaryBtnText}>Send Reset Code</Text>
            )}
          </TouchableOpacity>

          {/* Help note */}
          <Text style={s.helpText}>
            Didn't receive it? Check your spam folder or try again.
          </Text>

          {/* Back to sign in */}
          <TouchableOpacity
            style={s.signInLink}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Ionicons name="arrow-back-outline" size={14} color="#FF8C42" />
            <Text style={s.signInLinkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:    { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start', marginBottom: 32,
  },

  iconWrap:   { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF3EA',
    justifyContent: 'center', alignItems: 'center',
  },

  title:    { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 21, marginBottom: 32 },

  fieldWrap: { marginBottom: 24 },
  label:     { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E8E8',
    borderRadius: 14, paddingHorizontal: 14, height: 52,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, fontSize: 15, color: '#1A1A1A' },

  primaryBtn: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16, borderRadius: 28, alignItems: 'center',
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 8, elevation: 5,
    marginBottom: 16,
  },
  btnDisabled:    { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  helpText: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', marginBottom: 28 },

  signInLink:     { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  signInLinkText: { fontSize: 14, color: '#FF8C42', fontWeight: '600' },
});