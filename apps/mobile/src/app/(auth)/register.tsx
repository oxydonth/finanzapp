import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView, StatusBar, Linking,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme, shadow } from '../../lib/theme';
import type { LoginResponse } from '@finanzapp/types';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const C = useTheme();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.dark },
    top: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 24 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    logoMark: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 3,
      width: 28, height: 20, backgroundColor: C.brand,
      borderRadius: 7, justifyContent: 'center', paddingBottom: 3,
    },
    bar: { width: 4, backgroundColor: '#fff', borderRadius: 2 },
    logoText: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    tagline: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    taglineSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: {
      backgroundColor: C.surface,
      borderRadius: 24,
      padding: 24,
      ...shadow.md,
    },
    title: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 20, letterSpacing: -0.4 },
    label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
    input: {
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      color: C.text,
      marginBottom: 14,
      backgroundColor: C.bg,
    },
    inputFocused: { borderColor: C.brand, backgroundColor: C.brandLight },
    btn: {
      backgroundColor: C.brand,
      borderRadius: 14,
      padding: 15,
      alignItems: 'center',
      marginTop: 6,
      ...shadow.sm,
    },
    btnDisabled: { opacity: 0.55 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 6, marginBottom: 4 },
    checkbox: {
      width: 20, height: 20, borderRadius: 6,
      borderWidth: 1.5, borderColor: C.border,
      backgroundColor: C.bg,
      justifyContent: 'center', alignItems: 'center',
      marginTop: 1, flexShrink: 0,
    },
    checkboxChecked: { backgroundColor: C.brand, borderColor: C.brand },
    checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
    consentText: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 18 },
    consentLink: { color: C.brand, fontWeight: '600' },
    linkRow: { textAlign: 'center', marginTop: 20 },
    linkText: { color: C.textSub, fontSize: 14 },
    linkBold: { color: C.brand, fontWeight: '700', fontSize: 14 },
  }), [C]);

  async function handleRegister() {
    if (!consent) {
      Alert.alert('Datenschutz', 'Bitte stimme der Datenschutzerklärung zu, um fortzufahren.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/register', form);
      await setAuth(res.user, res.accessToken, res.refreshToken);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  const FIELDS: { key: keyof typeof form; label: string; secure?: boolean; keyboard?: 'email-address' | 'default' }[] = [
    { key: 'firstName', label: 'Vorname' },
    { key: 'lastName', label: 'Nachname' },
    { key: 'email', label: 'E-Mail', keyboard: 'email-address' },
    { key: 'password', label: 'Passwort (min. 8 Zeichen)', secure: true },
  ];

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
        <Text style={s.tagline}>Kostenlos loslegen.</Text>
        <Text style={s.taglineSub}>Keine Kreditkarte. Kein Abo.</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <Text style={s.title}>Konto erstellen</Text>

          {FIELDS.map((f) => (
            <View key={f.key}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput
                style={[s.input, focused === f.key && s.inputFocused]}
                value={form[f.key]}
                onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                secureTextEntry={f.secure}
                keyboardType={f.keyboard ?? 'default'}
                autoCapitalize={f.keyboard === 'email-address' || f.secure ? 'none' : 'words'}
                placeholderTextColor={C.textMuted}
                onFocus={() => setFocused(f.key)}
                onBlur={() => setFocused(null)}
              />
            </View>
          ))}

          <TouchableOpacity style={s.consentRow} onPress={() => setConsent(!consent)} activeOpacity={0.7}>
            <View style={[s.checkbox, consent && s.checkboxChecked]}>
              {consent && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.consentText}>
              Ich stimme der{' '}
              <Text
                style={s.consentLink}
                onPress={() => Linking.openURL('https://finanzapp.de/datenschutz')}
              >
                Datenschutzerklärung
              </Text>
              {' '}zu (Art. 6 Abs. 1 lit. b DSGVO).
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, (loading || !consent) && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading || !consent}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Konto erstellen</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/login" style={s.linkRow}>
            <Text style={s.linkText}>Bereits registriert? </Text>
            <Text style={s.linkBold}>Anmelden</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
