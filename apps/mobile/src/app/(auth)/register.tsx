import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { LoginResponse } from '@finanzapp/types';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/register', form);
      await setAuth(res.user, res.accessToken);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          <Text style={styles.logo}>Finanzapp</Text>
          <Text style={styles.title}>Konto erstellen</Text>

          {(['firstName', 'lastName', 'email', 'password'] as const).map((field) => (
            <View key={field}>
              <Text style={styles.label}>
                {{ firstName: 'Vorname', lastName: 'Nachname', email: 'E-Mail', password: 'Passwort' }[field]}
              </Text>
              <TextInput
                style={styles.input}
                value={form[field]}
                onChangeText={(v) => setForm({ ...form, [field]: v })}
                secureTextEntry={field === 'password'}
                keyboardType={field === 'email' ? 'email-address' : 'default'}
                autoCapitalize={field === 'email' || field === 'password' ? 'none' : 'words'}
                placeholderTextColor="#9ca3af"
              />
            </View>
          ))}

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Konto erstellen</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/login" style={styles.link}>
            Bereits registriert? <Text style={styles.linkBold}>Anmelden</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { margin: 20, backgroundColor: '#fff', borderRadius: 20, padding: 28, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  logo: { fontSize: 28, fontWeight: '800', color: '#2563eb', marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 16, backgroundColor: '#f9fafb' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { textAlign: 'center', marginTop: 20, color: '#6b7280', fontSize: 14 },
  linkBold: { color: '#2563eb', fontWeight: '600' },
});
