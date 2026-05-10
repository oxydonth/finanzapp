import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import { useAuthStore } from '../../store/authStore';
import { useTheme, shadow } from '../../lib/theme';
import type { Transaction, Budget } from '@finanzapp/types';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const C = useTheme();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingBottom: 32 },
    hero: { backgroundColor: C.dark, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 28 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    greeting: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
    heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 },
    heroValue: { fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 20 },
    heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroDot: { width: 6, height: 6, borderRadius: 3 },
    heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
    heroStatValue: { fontSize: 14, fontWeight: '700' },
    heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.brand,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    quickActions: {
      flexDirection: 'row',
      backgroundColor: C.surface,
      marginHorizontal: 16,
      marginTop: -1,
      borderRadius: 20,
      padding: 16,
      gap: 4,
      ...shadow.sm,
    },
    qa: { flex: 1, alignItems: 'center', gap: 6 },
    qaIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    qaLabel: { fontSize: 11, fontWeight: '600', color: C.textSub },
    card: {
      backgroundColor: C.surface,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 20,
      padding: 18,
      ...shadow.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
    cardLink: { fontSize: 13, color: C.brand, fontWeight: '600' },
    budgetRow: { marginBottom: 12 },
    budgetInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    budgetName: { fontSize: 13, color: C.text, fontWeight: '500' },
    budgetAmt: { fontSize: 11, color: C.textMuted },
    progressTrack: { height: 5, backgroundColor: C.divider, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    txRowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
    txIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    txName: { fontSize: 14, fontWeight: '600', color: C.text },
    txDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },
    txAmt: { fontSize: 14, fontWeight: '700', color: C.text },
    empty: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 16 },
  }), [C]);

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

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={nwFetching} onRefresh={() => { refetchNW(); refetchTx(); }} tintColor={C.brandMid} />}
    >
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.greeting}>Hallo, {user?.firstName} 👋</Text>
            <Text style={s.heroLabel}>Nettovermögen</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </View>

        <Text style={s.heroValue}>{formatEUR(netWorth?.netWorth ?? 0)}</Text>

        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <View style={[s.heroDot, { backgroundColor: C.emerald }]} />
            <View>
              <Text style={s.heroStatLabel}>Vermögen</Text>
              <Text style={[s.heroStatValue, { color: C.emerald }]}>{formatEUR(netWorth?.assets ?? 0)}</Text>
            </View>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroStat}>
            <View style={[s.heroDot, { backgroundColor: C.rose }]} />
            <View>
              <Text style={s.heroStatLabel}>Verbindlichkeiten</Text>
              <Text style={[s.heroStatValue, { color: C.rose }]}>{formatEUR(netWorth?.liabilities ?? 0)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.quickActions}>
        <TouchableOpacity style={s.qa} onPress={() => router.push('/bank/verbinden')}>
          <View style={[s.qaIcon, { backgroundColor: C.brandLight }]}>
            <Ionicons name="add" size={20} color={C.brand} />
          </View>
          <Text style={s.qaLabel}>Bank</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.qa} onPress={() => router.push('/(tabs)/konten')}>
          <View style={[s.qaIcon, { backgroundColor: C.emeraldBg }]}>
            <Ionicons name="card" size={18} color={C.emerald} />
          </View>
          <Text style={s.qaLabel}>Konten</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.qa} onPress={() => router.push('/(tabs)/transaktionen')}>
          <View style={[s.qaIcon, { backgroundColor: C.violetBg }]}>
            <Ionicons name="swap-horizontal" size={18} color={C.violet} />
          </View>
          <Text style={s.qaLabel}>Ausgaben</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.qa} onPress={() => router.push('/(tabs)/budget')}>
          <View style={[s.qaIcon, { backgroundColor: C.amberBg }]}>
            <Ionicons name="pie-chart" size={18} color={C.amber} />
          </View>
          <Text style={s.qaLabel}>Budget</Text>
        </TouchableOpacity>
      </View>

      {budgetList.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Budgets</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/budget')}>
              <Text style={s.cardLink}>Alle →</Text>
            </TouchableOpacity>
          </View>
          {budgetList.slice(0, 3).map((b) => {
            const pct = b.progressPercent ?? 0;
            const barColor = pct > 90 ? C.rose : pct > 70 ? C.amber : C.emerald;
            return (
              <View key={b.id} style={s.budgetRow}>
                <View style={s.budgetInfo}>
                  <Text style={s.budgetName}>{b.category?.icon} {b.name}</Text>
                  <Text style={s.budgetAmt}>{formatEUR(b.spentCents ?? 0)} / {formatEUR(b.limitCents)}</Text>
                </View>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` as `${number}%`, backgroundColor: barColor }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Letzte Transaktionen</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transaktionen')}>
            <Text style={s.cardLink}>Alle →</Text>
          </TouchableOpacity>
        </View>
        {transactions.length === 0 && (
          <Text style={s.empty}>Keine Transaktionen vorhanden.</Text>
        )}
        {transactions.map((tx, i) => (
          <View key={tx.id} style={[s.txRow, i < transactions.length - 1 && s.txRowBorder]}>
            <View style={s.txIcon}>
              <Text style={{ fontSize: 18 }}>{tx.category?.icon ?? '💳'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.txName} numberOfLines={1}>
                {tx.merchantName ?? tx.creditorName ?? 'Unbekannt'}
              </Text>
              <Text style={s.txDate}>{formatDate(tx.bookingDate)}</Text>
            </View>
            <Text style={[s.txAmt, tx.type === 'CREDIT' && { color: C.emerald }]}>
              {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
