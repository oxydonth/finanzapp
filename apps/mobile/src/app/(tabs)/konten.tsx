import { ScrollView, View, Text, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import { C, shadow } from '../../lib/theme';
import type { BankAccount } from '@finanzapp/types';

const TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Girokonto',
  SAVINGS: 'Sparkonto',
  CREDIT_CARD: 'Kreditkarte',
  DEPOT: 'Depot',
  LOAN: 'Kredit',
};

const TYPE_COLORS: Record<string, string> = {
  CHECKING: C.brand,
  SAVINGS: C.emerald,
  CREDIT_CARD: C.violet,
  DEPOT: C.amber,
  LOAN: C.rose,
};

export default function KontenScreen() {
  const { data: accounts = [], isFetching, refetch } = useQuery<BankAccount[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get<BankAccount[]>('/accounts'),
  });

  const total = accounts.reduce((s, a) => s + Number(a.balanceCents), 0);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.brandMid} />}
    >
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroLabel}>Gesamtsaldo</Text>
        <Text style={s.heroValue}>{formatEUR(total)}</Text>
        <Text style={s.heroCount}>{accounts.length} Konto{accounts.length !== 1 ? 'en' : ''}</Text>
      </View>

      {/* Account cards */}
      <View style={s.list}>
        {accounts.map((a) => {
          const accentColor = TYPE_COLORS[a.accountType] ?? C.brand;
          return (
            <View key={a.id} style={s.card}>
              <View style={[s.cardAccent, { backgroundColor: accentColor }]} />
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <View>
                    <Text style={s.accountTypeLabel}>{TYPE_LABELS[a.accountType] ?? a.accountType}</Text>
                    <Text style={s.accountName}>{a.accountName}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: `${accentColor}18` }]}>
                    <Text style={[s.badgeText, { color: accentColor }]}>Aktiv</Text>
                  </View>
                </View>
                <Text style={s.accountBalance}>{formatEUR(Number(a.balanceCents))}</Text>
                <View style={s.cardFooter}>
                  <Text style={s.iban}>{a.ibanMasked}</Text>
                  {a.balanceDate && <Text style={s.balanceDate}>Stand: {formatDate(a.balanceDate)}</Text>}
                </View>
              </View>
            </View>
          );
        })}

        {accounts.length === 0 && !isFetching && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏦</Text>
            <Text style={s.emptyTitle}>Noch keine Konten</Text>
            <Text style={s.emptyText}>Verbinde deine erste Bank um loszulegen.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 32 },
  hero: { backgroundColor: C.dark, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 28, alignItems: 'flex-start' },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, marginBottom: 4 },
  heroValue: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 4 },
  heroCount: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  accountTypeLabel: { fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  accountName: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  accountBalance: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  iban: { fontSize: 12, color: C.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  balanceDate: { fontSize: 11, color: C.textMuted },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
});

import { Platform } from 'react-native';
