import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import type { BankRegistryEntry } from '@finanzapp/config';

type Step = 'select' | 'credentials' | 'done';

export default function VerbindenScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [search, setSearch] = useState('');
  const [bank, setBank] = useState<BankRegistryEntry | null>(null);
  const [loginName, setLoginName] = useState('');
  const [pin, setPin] = useState('');

  const { data: banks = [] } = useQuery<BankRegistryEntry[]>({
    queryKey: ['banks'],
    queryFn: () => api.get<BankRegistryEntry[]>('/banks'),
  });

  const filtered = search
    ? banks.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.blz.includes(search))
    : banks;

  const connectMutation = useMutation({
    mutationFn: () => api.post('/banks/connections', { bankCode: bank?.blz, loginName, pin }),
    onSuccess: () => setStep('done'),
    onError: (err) => Alert.alert('Fehler', err instanceof Error ? err.message : 'Verbindung fehlgeschlagen'),
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {step === 'select' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Bank oder BLZ suchen..."
              placeholderTextColor="#9ca3af"
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(b) => b.blz}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
            renderItem={({ item: b }) => (
              <TouchableOpacity style={styles.bankRow} onPress={() => { setBank(b); setStep('credentials'); }}>
                <View style={styles.bankInfo}>
                  <Text style={styles.bankName}>{b.name}</Text>
                  <Text style={styles.bankBlz}>BLZ: {b.blz}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {step === 'credentials' && bank && (
        <View style={styles.credentialsContainer}>
          <View style={styles.selectedBank}>
            <Text style={styles.selectedBankName}>{bank.name}</Text>
            <Text style={styles.selectedBankBlz}>BLZ: {bank.blz}</Text>
          </View>

          <Text style={styles.label}>Benutzername / Kontonummer</Text>
          <TextInput
            style={styles.input}
            value={loginName}
            onChangeText={setLoginName}
            autoCapitalize="none"
            placeholder="Onlinebanking-Kennung"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Online-Banking PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
            placeholder="••••••"
            placeholderTextColor="#9ca3af"
          />

          <View style={styles.securityNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#9ca3af" />
            <Text style={styles.securityText}>Deine PIN wird AES-256 verschlüsselt gespeichert.</Text>
          </View>

          <TouchableOpacity
            style={[styles.connectBtn, (connectMutation.isPending || !loginName || !pin) && styles.connectBtnDisabled]}
            onPress={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || !loginName || !pin}
          >
            {connectMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.connectBtnText}>Bank verbinden</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === 'done' && (
        <View style={styles.doneContainer}>
          <Text style={{ fontSize: 64 }}>✅</Text>
          <Text style={styles.doneTitle}>Bank verbunden!</Text>
          <Text style={styles.doneSubtitle}>Deine Konten werden synchronisiert.</Text>
          <TouchableOpacity style={styles.connectBtn} onPress={() => router.back()}>
            <Text style={styles.connectBtnText}>Fertig</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  bankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16 },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bankBlz: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  credentialsContainer: { padding: 20 },
  selectedBank: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe' },
  selectedBankName: { fontSize: 15, fontWeight: '700', color: '#1e40af' },
  selectedBankBlz: { fontSize: 12, color: '#93c5fd', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 16, backgroundColor: '#fff' },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 },
  securityText: { fontSize: 12, color: '#9ca3af', flex: 1 },
  connectBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center' },
  connectBtnDisabled: { opacity: 0.5 },
  connectBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  doneSubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
});
