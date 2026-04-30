import { useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { Transaction } from '@finanzapp/types';

interface TxPage { data: Transaction[]; total: number; totalPages: number; page: number }

export default function TransaktionenScreen() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | 'CREDIT' | 'DEBIT'>('');

  const params = new URLSearchParams({ limit: '50', ...(search && { search }), ...(type && { type }) });
  const { data, isFetching, refetch } = useQuery<TxPage>({
    queryKey: ['transactions-list', search, type],
    queryFn: () => api.get<TxPage>(`/transactions?${params}`),
  });

  const transactions = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Suchen..."
          placeholderTextColor="#9ca3af"
        />
        <View style={styles.typeFilters}>
          {(['', 'CREDIT', 'DEBIT'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.filterBtn, type === t && styles.filterBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.filterBtnText, type === t && styles.filterBtnTextActive]}>
                {t === '' ? 'Alle' : t === 'CREDIT' ? 'Einnahmen' : 'Ausgaben'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        onRefresh={refetch}
        refreshing={isFetching}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item: tx }) => (
          <View style={styles.txRow}>
            <View style={styles.txIcon}>
              <Text style={{ fontSize: 18 }}>{tx.category?.icon ?? '💳'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txName} numberOfLines={1}>
                {tx.merchantName ?? tx.creditorName ?? 'Unbekannt'}
              </Text>
              <Text style={styles.txPurpose} numberOfLines={1}>{tx.purpose}</Text>
              <Text style={styles.txDate}>{formatDate(tx.bookingDate)}</Text>
            </View>
            <Text style={[styles.txAmount, tx.type === 'CREDIT' && styles.txAmountCredit]}>
              {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Keine Transaktionen gefunden</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filters: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827', marginBottom: 8 },
  typeFilters: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterBtnActive: { backgroundColor: '#2563eb' },
  filterBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  separator: { height: 1, backgroundColor: '#f9fafb' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff' },
  txIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txPurpose: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  txDate: { fontSize: 11, color: '#d1d5db', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  txAmountCredit: { color: '#16a34a' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
