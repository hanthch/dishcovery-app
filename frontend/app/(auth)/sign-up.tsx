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

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

interface FormData {
  firstName:   string;
  lastName:    string;
  username:    string;
  email:       string;
  password:    string;
  confirmPassword: string;
  birthDate:   string;
  phoneNumber: string; // 9 digits, without +84
}

/* ── Password strength helper ─────────────────────────────── */
function checkStrength(pw: string) {
  return {
    length:    pw.length >= 8,
    upperLow:  /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
  };
}

function StrengthRow({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={st.strRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? '#10B981' : '#BBBBBB'}
      />
      <Text style={[st.strText, met && st.strMet]}>{label}</Text>
    </View>
  );
}

export default function SignUpScreen({ navigation }: Props) {
  const [form, setForm] = useState<FormData>({
    firstName:       '',
    lastName:        '',
    username:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
    birthDate:       '',
    phoneNumber:     '',
  });
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const { signUp } = useAuth();

  const set = (key: keyof FormData) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const normalizePhone = (v: string) => {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('0')) d = d.slice(1);
    return d.slice(0, 9);
  };

  const strength = checkStrength(form.password);
  const allStrong = strength.length && strength.upperLow && strength.number;

  const handleSignUp = async () => {
    const { firstName, lastName, username, email, password, confirmPassword, phoneNumber, birthDate } = form;

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all required fields (*).');
      return;
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      Alert.alert('Invalid Username', 'Username must be 3–30 characters: letters, numbers, or underscores only.');
      return;
    }

    if (!allStrong) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (phoneNumber && phoneNumber.length !== 9) {
      Alert.alert('Invalid Phone', 'Vietnam phone number must have exactly 9 digits after +84.');
      return;
    }

    if (birthDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
      Alert.alert('Invalid Date', 'Please enter date in DD/MM/YYYY format.');
      return;
    }

    setLoading(true);
    const result = await signUp({
      username:    username.trim(),
      email:       email.trim().toLowerCase(),
      password,
      firstName:   firstName.trim(),
      lastName:    lastName.trim(),
      birthDate,
      phoneNumber: phoneNumber ? `+84${phoneNumber}` : undefined,
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Sign Up Failed', result.error || 'Please try again.');
    }
    // On success, RootNavigator automatically navigates to main app
  };

  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Header */}
          <Text style={st.title}>Create account 🍜</Text>
          <Text style={st.subtitle}>Join the food discovery community</Text>

          {/* ── NAMES ── */}
          <View style={st.row}>
            <View style={[st.fieldWrap, { flex: 1 }]}>
              <Text style={st.label}>First Name *</Text>
              <TextInput
                style={st.input}
                placeholder="John"
                placeholderTextColor="#BBBBBB"
                value={form.firstName}
                onChangeText={set('firstName')}
                editable={!loading}
                autoCorrect={false}
              />
            </View>
            <View style={[st.fieldWrap, { flex: 1 }]}>
              <Text style={st.label}>Last Name *</Text>
              <TextInput
                style={st.input}
                placeholder="Doe"
                placeholderTextColor="#BBBBBB"
                value={form.lastName}
                onChangeText={set('lastName')}
                editable={!loading}
                autoCorrect={false}
              />
            </View>
          </View>

          {/* ── USERNAME ── */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>Username *</Text>
            <View style={st.inputRow}>
              <Text style={st.atSign}>@</Text>
              <TextInput
                style={[st.input, st.inputFlex]}
                placeholder="your_username"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
                autoCorrect={false}
                value={form.username}
                onChangeText={v => set('username')(v.trim().toLowerCase())}
                editable={!loading}
              />
            </View>
          </View>

          {/* ── EMAIL ── */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>Email *</Text>
            <TextInput
              style={st.input}
              placeholder="your@email.com"
              placeholderTextColor="#BBBBBB"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              value={form.email}
              onChangeText={set('email')}
              editable={!loading}
            />
          </View>

          {/* ── PASSWORD ── */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>Password *</Text>
            <View style={[st.inputRow, { justifyContent: 'space-between' }]}>
              <TextInput
                style={[st.input, st.inputFlex]}
                placeholder="••••••••"
                placeholderTextColor="#BBBBBB"
                secureTextEntry={!showPw}
                value={form.password}
                onChangeText={set('password')}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {form.password.length > 0 && (
              <View style={st.strBox}>
                <StrengthRow met={strength.length}   label="At least 8 characters" />
                <StrengthRow met={strength.upperLow} label="Uppercase & lowercase letters" />
                <StrengthRow met={strength.number}   label="At least one number" />
              </View>
            )}
          </View>

          {/* ── CONFIRM PASSWORD ── */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>Confirm Password *</Text>
            <TextInput
              style={st.input}
              placeholder="••••••••"
              placeholderTextColor="#BBBBBB"
              secureTextEntry={!showPw}
              value={form.confirmPassword}
              onChangeText={set('confirmPassword')}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {form.confirmPassword.length > 0 && form.confirmPassword !== form.password && (
              <Text style={st.errorText}>Passwords don't match</Text>
            )}
          </View>

          {/* ── DATE OF BIRTH ── */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>Date of Birth</Text>
            <TextInput
              style={st.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#BBBBBB"
              value={form.birthDate}
              onChangeText={set('birthDate')}
              editable={!loading}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {/* ── PHONE ── */}
          <View style={st.fieldWrap}>
            <Text style={st.label}>Phone Number (Vietnam)</Text>
            <View style={st.inputRow}>
              <View style={st.countryCode}>
                <Text style={st.countryCodeText}>🇻🇳 +84</Text>
              </View>
              <TextInput
                style={[st.input, st.inputFlex]}
                placeholder="901234567"
                placeholderTextColor="#BBBBBB"
                keyboardType="phone-pad"
                value={form.phoneNumber}
                onChangeText={v => set('phoneNumber')(normalizePhone(v))}
                editable={!loading}
                maxLength={9}
              />
            </View>
          </View>

          {/* ── SUBMIT ── */}
          <TouchableOpacity
            style={[st.primaryBtn, loading && st.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={st.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign in link */}
          <View style={st.footer}>
            <Text style={st.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={st.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:    { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start', marginBottom: 24,
  },

  title:    { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#666666', marginBottom: 28, lineHeight: 22 },

  row:       { flexDirection: 'row', gap: 12 },
  fieldWrap: { marginBottom: 18 },

  label: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },

  input: {
    borderWidth: 1.5, borderColor: '#E8E8E8',
    borderRadius: 14, paddingHorizontal: 14, height: 52,
    fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFAFA',
  },
  inputFlex: { flex: 1, borderWidth: 0, height: undefined, paddingVertical: 0, backgroundColor: 'transparent' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E8E8',
    borderRadius: 14, paddingHorizontal: 14, height: 52,
    backgroundColor: '#FAFAFA', gap: 8,
  },
  atSign:        { fontSize: 17, color: '#999', fontWeight: '600' },
  countryCode:   { paddingRight: 8, borderRightWidth: 1, borderRightColor: '#E8E8E8' },
  countryCodeText: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },

  strBox: { marginTop: 8, gap: 4, paddingLeft: 2 },
  strRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strText: { fontSize: 12, color: '#AAAAAA' },
  strMet:  { color: '#10B981', fontWeight: '600' },

  errorText: { fontSize: 12, color: '#EF4444', marginTop: 6, marginLeft: 2 },

  primaryBtn: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16, borderRadius: 28, alignItems: 'center',
    marginTop: 8, marginBottom: 20,
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 8, elevation: 5,
  },
  btnDisabled:    { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#666666' },
  footerLink: { fontSize: 14, color: '#FF8C42', fontWeight: '700' },
});