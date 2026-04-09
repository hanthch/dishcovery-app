import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');
const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<AuthStackParamList, 'Verification'>;

export default function VerificationScreen({ navigation, route }: Props) {
  const email = route.params?.email || '';

  const [digits, setDigits]         = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading]       = useState(false);
  const [cooldown, setCooldown]     = useState(0);
  const inputRefs                   = useRef<(TextInput | null)[]>([]);
  const { verifyCode, forgotPassword } = useAuth();

  /* ── Resend cooldown timer ─────────────────────────────── */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /* ── Digit change handler ──────────────────────────────── */
  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  /* ── Paste handler (paste full code) ──────────────────── */
  const handlePaste = (index: number, value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (nums.length > 1) {
      const next = Array(CODE_LENGTH).fill('');
      nums.split('').forEach((d, i) => { next[i] = d; });
      setDigits(next);
      inputRefs.current[Math.min(nums.length, CODE_LENGTH - 1)]?.focus();
    } else {
      handleChange(index, value);
    }
  };

  /* ── Verify ────────────────────────────────────────────── */
  const handleVerify = async () => {
    const code = digits.join('');

    if (code.length < CODE_LENGTH) {
      Alert.alert('Incomplete Code', `Please enter all ${CODE_LENGTH} digits.`);
      return;
    }
    if (!email) {
      Alert.alert('Error', 'Email missing. Please restart the flow.');
      navigation.navigate('ForgotPassword');
      return;
    }

    setLoading(true);
    const result = await verifyCode(email, code);
    setLoading(false);

    if (result.success) {
      navigation.navigate('CreatePassword', { email, code });
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid or expired code.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  /* ── Resend ────────────────────────────────────────────── */
  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    if (!email) {
      Alert.alert('Error', 'Email missing.');
      return;
    }
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setCooldown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } else {
      Alert.alert('Error', result.error || 'Failed to resend code.');
    }
  };

  const isFilled = digits.join('').length === CODE_LENGTH;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
            <Ionicons name="mail-open-outline" size={34} color="#FF8C42" />
          </View>
        </View>

        {/* Header */}
        <Text style={s.title}>Check your email</Text>
        <Text style={s.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={s.emailHighlight}>{email || 'your email'}</Text>
        </Text>

        {/* Code inputs */}
        <View style={s.codeRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={r => { inputRefs.current[i] = r; }}
              style={[s.codeCell, d && s.codeCellFilled]}
              value={d}
              onChangeText={v => handlePaste(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              maxLength={CODE_LENGTH} // allow paste
              keyboardType="number-pad"
              selectTextOnFocus
              editable={!loading}
              placeholder="–"
              placeholderTextColor="#DDDDDD"
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[s.primaryBtn, (!isFilled || loading) && s.btnDisabled]}
          onPress={handleVerify}
          disabled={!isFilled || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={s.primaryBtnText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={s.resendRow}>
          <Text style={s.resendText}>Didn't receive a code? </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || loading}
          >
            <Text style={[s.resendLink, (cooldown > 0 || loading) && s.resendDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.spamNote}>Check your spam folder if you don't see it.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_SIZE = Math.min(Math.floor((width - 48 - 40) / CODE_LENGTH), 52);

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

  title:         { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, textAlign: 'center', marginBottom: 10 },
  subtitle:      { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 21, marginBottom: 36 },
  emailHighlight:{ color: '#FF8C42', fontWeight: '700' },

  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  codeCell: {
    width: CELL_SIZE, height: CELL_SIZE + 8,
    borderWidth: 2, borderColor: '#E8E8E8',
    borderRadius: 14,
    fontSize: 22, fontWeight: '700',
    textAlign: 'center', color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  codeCellFilled: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF3EA',
    color: '#FF8C42',
  },

  primaryBtn: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16, borderRadius: 28, alignItems: 'center',
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 8, elevation: 5,
    marginBottom: 20,
  },
  btnDisabled:    { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  resendRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  resendText:    { fontSize: 14, color: '#666666' },
  resendLink:    { fontSize: 14, color: '#FF8C42', fontWeight: '700' },
  resendDisabled:{ color: '#CCCCCC' },

  spamNote: { fontSize: 12, color: '#AAAAAA', textAlign: 'center', fontStyle: 'italic' },
});