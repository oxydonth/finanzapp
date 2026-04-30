import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import { useAuthStore } from '../../store/authStore';
import type { Transaction, Budget } from '@finanzapp/types';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: netWorth, refetch: refetchNW, isFetching: nwFetching } = useQuery({
    queryKey: ['net-worth'],
    queryFn: () => api.get<{ assets: number; liabilities: number; netWorth: number }>('/analytics/net-worth'),
  });

  const { data: txData, refetch: refetchTx } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => api.get<{ data: Transaction[] }>('/transactions?limit=5'),
  });

  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get<Budget[]>('/budgets'),
  });

  const transactions = (txData as { data?: Transaction[] })?.data ?? (Array.isArray(txData) ? txData : []);
  const budgetList = Array.isArray(budgets) ? budgets : [];

  function handleRefresh() {
    refetchNW();
    refetchTx();
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={nwFetching} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hallo, {user?.firstName} 👋</Text>
        <Text style={styles.netWorthLabel}>Nettovermögen</Text>
        <Text style={styles.netWorthValue}>{formatEUR(netWorth?.netWorth ?? 0)}</Text>
        <View style={styles.netWorthRow}>
          <View style={styles.netWorthItem}>
            <Text style={styles.netWorthItemLabel}>Vermögen</Text>
            <Text style={[styles.netWorthItemValue, { color: '#16a34a' }]}>{formatEUR(netWorth?.assets ?? 0)}</Text>
          </View>
          <View style={styles.netWorthItem}>
            <Text style={styles.netWorthItemLabel}>Verbindlichkeiten</Text>
            <Text style={[styles.netWorthItemValue, { color: '#ef4444' }]}>{formatEUR(netWorth?.liabilities ?? 0)}</Text>
          </View>
        </View>
      </View>

      {budgetList.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budgets</Text>
          {budgetList.slice(0, 3).map((b) => (
            <View key={b.id} style={styles.budgetRow}>
              <Text style={styles.budgetName}>{b.category?.icon} {b.name}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${b.progressPercent ?? 0}%` as `${number}%`,
                  backgroundColor: (b.progressPercent ?? 0) > 90 ? '#ef4444' : (b.progressPercent ?? 0) > 70 ? '#f59e0b' : '#22c55e',
                }]} />
              </View>
              <Text style={styles.budgetAmount}>{formatEUR(b.spentCents ?? 0)} / {formatEUR(b.limitCents)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Letzte Transaktionen</Text>
        {transactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={styles.txIcon}>
              <Text style={{ fontSize: 20 }}>{tx.category?.icon ?? '💳'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txName} numberOfLines={1}>
                {tx.merchantName ?? tx.creditorName ?? 'Unbekannt'}
              </Text>
              <Text style={styles.txDate}>{formatDate(tx.bookingDate)}</Text>
            </View>
            <Text style={[styles.txAmount, tx.type === 'CREDIT' && { color: '#16a34a' }]}>
              {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.connectBtn} onPress={() => router.push('/bank/verbinden')}>
        <Text style={styles.connectBtnText}>+ Bank verbinden</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  netWorthLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  netWorthValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginBottom: 16 },
  netWorthRow: { flexDirection: 'row', gap: 20 },
  netWorthItem: {},
  netWorthItemLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  netWorthItemValue: { fontSize: 16, fontWeight: '700' },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  budgetRow: { marginBottom: 12 },
  budgetName: { fontSize: 13, color: '#374151', marginBottom: 4 },
  progressBar: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  progressFill: { height: '100%', borderRadius: 3 },
  budgetAmount: { fontSize: 11, color: '#9ca3af' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  txIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  connectBtn: { margin: 16, marginTop: 4, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  connectBtnText: { color: '#2563eb', fontWeight: '700', fontSize: 14 },
});
