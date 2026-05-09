import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { C, shadow } from '../../lib/theme';
import type { BankRegistryEntry } from '@finanzapp/config';

type Step = 'select' | 'credentials' | 'done';

const STEPS = ['Bank wählen', 'Anmelden', 'Fertig'];

export default function VerbindenScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
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

  const stepIndex = step === 'select' ? 0 : step === 'credentials' ? 1 : 2;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => step === 'credentials' ? setStep('select') : router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bank verbinden</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stepper */}
      <View style={s.stepper}>
        {STEPS.map((label, i) => (
          <View key={label} style={s.stepItem}>
            <View style={[s.stepDot, i <= stepIndex && s.stepDotActive, i < stepIndex && s.stepDotDone]}>
              {i < stepIndex
                ? <Ionicons name="checkmark" size={11} color="#fff" />
                : <Text style={[s.stepNum, i <= stepIndex && s.stepNumActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[s.stepLabel, i === stepIndex && s.stepLabelActive]}>{label}</Text>
            {i < STEPS.length - 1 && <View style={[s.stepLine, i < stepIndex && s.stepLineDone]} />}
          </View>
        ))}
      </View>

      {/* Step: select bank */}
      {step === 'select' && (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={s.searchWrap}>
            <View style={[s.searchBox, focused === 'search' && s.searchBoxFocused]}>
              <Ionicons name="search" size={15} color={focused === 'search' ? C.brand : C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Bank oder BLZ suchen..."
                placeholderTextColor={C.textMuted}
                onFocus={() => setFocused('search')}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(b) => b.blz}
            contentContainerStyle={s.bankList}
            renderItem={({ item: b }) => (
              <TouchableOpacity
                style={s.bankRow}
                onPress={() => { setBank(b); setStep('credentials'); }}
                activeOpacity={0.65}
              >
                <View style={s.bankIconWrap}>
                  <Ionicons name="business" size={18} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bankName}>{b.name}</Text>
                  <Text style={s.bankBlz}>BLZ {b.blz}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            ListEmptyComponent={<Text style={s.emptyText}>Keine Banken gefunden.</Text>}
          />
        </View>
      )}

      {/* Step: credentials */}
      {step === 'credentials' && bank && (
        <View style={s.credsContainer}>
          <View style={s.selectedBankCard}>
            <View style={s.bankIconWrap}>
              <Ionicons name="business" size={18} color={C.brand} />
            </View>
            <View>
              <Text style={s.selectedBankName}>{bank.name}</Text>
              <Text style={s.selectedBankBlz}>BLZ {bank.blz}</Text>
            </View>
          </View>

          <Text style={s.label}>Benutzername / Kontonummer</Text>
          <TextInput
            style={[s.input, focused === 'user' && s.inputFocused]}
            value={loginName}
            onChangeText={setLoginName}
            autoCapitalize="none"
            placeholder="Online-Banking-Kennung"
            placeholderTextColor={C.textMuted}
            onFocus={() => setFocused('user')}
            onBlur={() => setFocused(null)}
          />

          <Text style={s.label}>Online-Banking PIN</Text>
          <TextInput
            style={[s.input, focused === 'pin' && s.inputFocused]}
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
            placeholder="••••••"
            placeholderTextColor={C.textMuted}
            onFocus={() => setFocused('pin')}
            onBlur={() => setFocused(null)}
          />

          <View style={s.secNote}>
            <Ionicons name="lock-closed" size={13} color={C.brand} />
            <Text style={s.secNoteText}>AES-256 verschlüsselt. Nur-Lese-Zugriff.</Text>
          </View>

          <TouchableOpacity
            style={[s.btn, (connectMutation.isPending || !loginName || !pin) && s.btnDisabled]}
            onPress={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || !loginName || !pin}
            activeOpacity={0.85}
          >
            {connectMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Bank verbinden</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Step: done */}
      {step === 'done' && (
        <View style={s.doneContainer}>
          <View style={s.doneIcon}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={s.doneTitle}>Bank verbunden!</Text>
          <Text style={s.doneSub}>Deine Konten werden jetzt synchronisiert.</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={s.btnText}>Fertig</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.dark },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: C.brand },
  stepDotDone: { backgroundColor: C.emerald },
  stepNum: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  stepLabelActive: { color: 'rgba(255,255,255,0.7)' },
  stepLine: { width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: C.emerald },

  // Select step
  searchWrap: { padding: 12, backgroundColor: C.bg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: C.border },
  searchBoxFocused: { borderColor: C.brand },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  bankList: { paddingBottom: 24 },
  bankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 13 },
  bankIconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.brandLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bankName: { fontSize: 14, fontWeight: '600', color: C.text },
  bankBlz: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  sep: { height: 1, backgroundColor: C.divider, marginLeft: 66 },
  emptyText: { textAlign: 'center', color: C.textMuted, fontSize: 14, padding: 32 },

  // Credentials step
  credsContainer: { flex: 1, backgroundColor: C.bg, padding: 16 },
  selectedBankCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 20, ...shadow.sm },
  selectedBankName: { fontSize: 15, fontWeight: '700', color: C.text },
  selectedBankBlz: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 13, fontSize: 15, color: C.text, marginBottom: 14, backgroundColor: C.surface },
  inputFocused: { borderColor: C.brand, backgroundColor: C.brandLight },
  secNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.brandLight, borderRadius: 10, padding: 12, marginBottom: 20 },
  secNoteText: { fontSize: 12, color: C.brand, flex: 1, fontWeight: '500' },

  // Shared
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 15, alignItems: 'center', ...shadow.sm },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  // Done step
  doneContainer: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  doneIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: C.emerald, justifyContent: 'center', alignItems: 'center', marginBottom: 8, ...shadow.md },
  doneTitle: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  doneSub: { fontSize: 15, color: C.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
});
