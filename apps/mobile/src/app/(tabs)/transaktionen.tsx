import { useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import { C, shadow } from '../../lib/theme';
import type { Transaction } from '@finanzapp/types';

interface TxPage { data: Transaction[]; total: number; totalPages: number; page: number }

const FILTERS = [
  { label: 'Alle', value: '' },
  { label: 'Einnahmen', value: 'CREDIT' },
  { label: 'Ausgaben', value: 'DEBIT' },
] as const;

export default function TransaktionenScreen() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | 'CREDIT' | 'DEBIT'>('');
  const [focused, setFocused] = useState(false);

  const params = new URLSearchParams({ limit: '50', ...(search && { search }), ...(type && { type }) });
  const { data, isFetching, refetch } = useQuery<TxPage>({
    queryKey: ['transactions-list', search, type],
    queryFn: () => api.get<TxPage>(`/transactions?${params}`),
  });

  const transactions = data?.data ?? [];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Ausgaben</Text>

        {/* Search */}
        <View style={[s.searchBox, focused && s.searchBoxFocused]}>
          <Ionicons name="search" size={15} color={focused ? C.brand : C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Suchen..."
            placeholderTextColor={C.textMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <View style={s.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[s.pill, type === f.value && s.pillActive]}
              onPress={() => setType(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[s.pillText, type === f.value && s.pillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        onRefresh={refetch}
        refreshing={isFetching}
        contentContainerStyle={transactions.length === 0 ? s.emptyContainer : s.listContent}
        renderItem={({ item: tx }) => (
          <View style={s.txRow}>
            <View style={s.txIcon}>
              <Text style={{ fontSize: 17 }}>{tx.category?.icon ?? '💳'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.txName} numberOfLines={1}>
                {tx.merchantName ?? tx.creditorName ?? 'Unbekannt'}
              </Text>
              {tx.purpose ? <Text style={s.txPurpose} numberOfLines={1}>{tx.purpose}</Text> : null}
              <Text style={s.txDate}>{formatDate(tx.bookingDate)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.txAmt, tx.type === 'CREDIT' && { color: C.emerald }]}>
                {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
              </Text>
              {tx.category && (
                <View style={s.catBadge}>
                  <Text style={s.catBadgeText}>{tx.category.name}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={40} color={C.textMuted} />
            <Text style={s.emptyText}>Keine Transaktionen gefunden</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.dark, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  searchBoxFocused: { borderColor: C.brand, backgroundColor: 'rgba(79,70,229,0.12)' },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  pillActive: { backgroundColor: C.brand },
  pillText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  listContent: { paddingBottom: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface,
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txName: { fontSize: 14, fontWeight: '600', color: C.text },
  txPurpose: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  txDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '700', color: C.text },
  catBadge: { marginTop: 3, backgroundColor: C.brandLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  catBadgeText: { fontSize: 9, color: C.brand, fontWeight: '700' },
  sep: { height: 1, backgroundColor: C.divider, marginLeft: 68 },
  empty: { alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: C.textMuted },
});
