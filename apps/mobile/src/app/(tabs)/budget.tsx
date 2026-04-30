import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatEUR } from '@finanzapp/utils';
import type { Budget } from '@finanzapp/types';

export default function BudgetScreen() {
  const { data: budgets = [], isFetching, refetch } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: () => api.get<Budget[]>('/budgets'),
  });

  const totalLimit = budgets.reduce((s, b) => s + b.limitCents, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spentCents ?? 0), 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
    >
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Gesamt diesen Monat</Text>
        <Text style={styles.summaryValue}>{formatEUR(totalSpent)} / {formatEUR(totalLimit)}</Text>
      </View>

      <View style={styles.list}>
        {budgets.map((b) => {
          const pct = b.progressPercent ?? 0;
          const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Text style={{ fontSize: 22 }}>{b.category?.icon ?? '💰'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{b.name}</Text>
                  <Text style={styles.cardCategory}>{b.category?.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardSpent}>{formatEUR(b.spentCents ?? 0)}</Text>
                  <Text style={styles.cardLimit}>von {formatEUR(b.limitCents)}</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{pct}% genutzt</Text>
                <Text style={styles.remaining}>{formatEUR(b.remainingCents ?? 0)} verbleibend</Text>
              </View>
            </View>
          );
        })}

        {budgets.length === 0 && !isFetching && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>Noch keine Budgets</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  summary: { backgroundColor: '#2563eb', padding: 24, paddingTop: 50 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardCategory: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cardSpent: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardLimit: { fontSize: 11, color: '#9ca3af' },
  progressTrack: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  remaining: { fontSize: 12, color: '#6b7280' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
