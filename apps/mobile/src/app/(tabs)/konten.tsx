import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { BankAccount } from '@finanzapp/types';

const TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Girokonto',
  SAVINGS: 'Sparkonto',
  CREDIT_CARD: 'Kreditkarte',
  DEPOT: 'Depot',
  LOAN: 'Kredit',
};

export default function KontenScreen() {
  const { data: accounts = [], isFetching, refetch } = useQuery<BankAccount[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get<BankAccount[]>('/accounts'),
  });

  const total = accounts.reduce((s, a) => s + Number(a.balanceCents), 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
    >
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Gesamtsaldo</Text>
        <Text style={styles.totalValue}>{formatEUR(total)}</Text>
        <Text style={styles.totalCount}>{accounts.length} Konten</Text>
      </View>

      <View style={styles.list}>
        {accounts.map((a) => (
          <View key={a.id} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View>
                <Text style={styles.accountType}>{TYPE_LABELS[a.accountType] ?? a.accountType}</Text>
                <Text style={styles.accountName}>{a.accountName}</Text>
              </View>
              <Text style={styles.accountBalance}>{formatEUR(Number(a.balanceCents))}</Text>
            </View>
            <Text style={styles.iban}>{a.ibanMasked}</Text>
            {a.balanceDate && <Text style={styles.balanceDate}>Stand: {formatDate(a.balanceDate)}</Text>}
          </View>
        ))}

        {accounts.length === 0 && !isFetching && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏦</Text>
            <Text style={styles.emptyText}>Noch keine Konten</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  totalCard: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  totalValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginVertical: 4 },
  totalCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  list: { padding: 16, gap: 12 },
  accountCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  accountType: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  accountName: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
  accountBalance: { fontSize: 18, fontWeight: '800', color: '#111827' },
  iban: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace' },
  balanceDate: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
