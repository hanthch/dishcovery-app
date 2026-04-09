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

type Props = NativeStackScreenProps<AuthStackParamList, 'CreatePassword'>;

function StrengthRow({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={s.strRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? '#10B981' : '#BBBBBB'}
      />
      <Text style={[s.strText, met && s.strMet]}>{label}</Text>
    </View>
  );
}

export default function CreatePasswordScreen({ navigation, route }: Props) {
  const { email, code } = route.params || {};

  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const { resetPassword } = useAuth();

  const strength = {
    length:   password.length >= 8,
    upperLow: /[A-Z]/.test(password) && /[a-z]/.test(password),
    number:   /[0-9]/.test(password),
  };
  const allStrong = strength.length && strength.upperLow && strength.number;

  const handleCreate = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in both password fields.');
      return;
    }
    if (!allStrong) {
      Alert.alert('Weak Password', 'Please meet all password requirements.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (!email || !code) {
      Alert.alert('Session Error', 'Missing session info. Please restart the password reset flow.');
      navigation.navigate('ForgotPassword');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email, code, password);
    setLoading(false);

    if (result.success) {
      Alert.alert('Password Reset! 🎉', 'Your password has been updated. Please sign in.', [
        { text: 'Sign In', onPress: () => navigation.navigate('SignIn') },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to reset password.');
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
              <Ionicons name="key-outline" size={34} color="#FF8C42" />
            </View>
          </View>

          {/* Header */}
          <Text style={s.title}>Create New Password</Text>
          <Text style={s.subtitle}>
            Your new password must be different from your previous password.
          </Text>

          {/* New password */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>New Password</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#999" style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#BBBBBB"
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPw(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Strength indicators */}
            {password.length > 0 && (
              <View style={s.strBox}>
                <StrengthRow met={strength.length}   label="At least 8 characters" />
                <StrengthRow met={strength.upperLow} label="Uppercase & lowercase letters" />
                <StrengthRow met={strength.number}   label="At least one number" />
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Confirm New Password</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#999" style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#BBBBBB"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirm}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {confirmPassword.length > 0 && confirmPassword !== password && (
              <Text style={s.errorText}>Passwords don't match</Text>
            )}
            {confirmPassword.length > 0 && confirmPassword === password && (
              <View style={s.matchRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={s.matchText}>Passwords match</Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.primaryBtnText}>Reset Password</Text>
            )}
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

  title:    { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 21, marginBottom: 32 },

  fieldWrap: { marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E8E8',
    borderRadius: 14, paddingHorizontal: 14, height: 52,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: { marginRight: 10 },
  input:     { fontSize: 15, color: '#1A1A1A' },

  strBox: { marginTop: 10, gap: 5, paddingLeft: 2 },
  strRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strText:{ fontSize: 12, color: '#AAAAAA' },
  strMet: { color: '#10B981', fontWeight: '600' },

  errorText: { fontSize: 12, color: '#EF4444', marginTop: 6, marginLeft: 2 },
  matchRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  matchText: { fontSize: 12, color: '#10B981', fontWeight: '600' },

  primaryBtn: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16, borderRadius: 28, alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 8, elevation: 5,
  },
  btnDisabled:    { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});