import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme, shadow } from '../../lib/theme';
import type { LoginResponse } from '@finanzapp/types';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const C = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.dark },
    top: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingBottom: 36 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    logoMark: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 3,
      width: 28, height: 20, backgroundColor: C.brand,
      borderRadius: 7, justifyContent: 'center', paddingBottom: 3,
    },
    bar: { width: 4, backgroundColor: '#fff', borderRadius: 2 },
    logoText: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    tagline: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 34, letterSpacing: -0.5 },
    card: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 28,
      paddingBottom: 40,
      ...shadow.md,
    },
    title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4, letterSpacing: -0.4 },
    subtitle: { fontSize: 14, color: C.textSub, marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
    input: {
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      color: C.text,
      marginBottom: 16,
      backgroundColor: C.bg,
    },
    inputFocused: { borderColor: C.brand, backgroundColor: C.brandLight },
    btn: {
      backgroundColor: C.brand,
      borderRadius: 14,
      padding: 15,
      alignItems: 'center',
      marginTop: 4,
      ...shadow.sm,
    },
    btnDisabled: { opacity: 0.55 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    linkRow: { textAlign: 'center', marginTop: 20 },
    linkText: { color: C.textSub, fontSize: 14 },
    linkBold: { color: C.brand, fontWeight: '700', fontSize: 14 },
  }), [C]);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      await setAuth(res.user, res.accessToken, res.refreshToken);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      <View style={s.top}>
        <View style={s.logoRow}>
          <View style={s.logoMark}>
            <View style={[s.bar, { height: 8, opacity: 0.7 }]} />
            <View style={[s.bar, { height: 12 }]} />
            <View style={[s.bar, { height: 16, opacity: 0.85 }]} />
          </View>
          <Text style={s.logoText}>Finanzapp</Text>
        </View>
        <Text style={s.tagline}>Deine Finanzen. Übersichtlich.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.title}>Willkommen zurück</Text>
        <Text style={s.subtitle}>Melde dich an um fortzufahren</Text>

        <Text style={s.label}>E-Mail</Text>
        <TextInput
          style={[s.input, focused === 'email' && s.inputFocused]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="max@example.de"
          placeholderTextColor={C.textMuted}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
        />

        <Text style={s.label}>Passwort</Text>
        <TextInput
          style={[s.input, focused === 'pass' && s.inputFocused]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={C.textMuted}
          onFocus={() => setFocused('pass')}
          onBlur={() => setFocused(null)}
        />

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Anmelden</Text>
          }
        </TouchableOpacity>

        <Link href="/(auth)/register" style={s.linkRow}>
          <Text style={s.linkText}>Noch kein Konto? </Text>
          <Text style={s.linkBold}>Registrieren</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
