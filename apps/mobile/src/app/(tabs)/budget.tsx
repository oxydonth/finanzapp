import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatEUR } from '@finanzapp/utils';
import { useTheme, shadow } from '../../lib/theme';
import type { Budget } from '@finanzapp/types';

export default function BudgetScreen() {
  const C = useTheme();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingBottom: 32 },
    hero: { backgroundColor: C.dark, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 28 },
    heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, marginBottom: 6 },
    heroValue: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: -0.8 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 2, marginBottom: 14 },
    heroTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    heroFill: { height: '100%', borderRadius: 3 },
    heroPct: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
    list: { padding: 16, gap: 10 },
    card: {
      backgroundColor: C.surface,
      borderRadius: 18,
      padding: 16,
      ...shadow.sm,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    iconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
    cardName: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
    cardCat: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    pctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    pctBadgeText: { fontSize: 11, fontWeight: '700' },
    amtRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
    amtSpent: { fontSize: 16, fontWeight: '700', color: C.text },
    amtOf: { fontSize: 13, color: C.textMuted },
    amtLimit: { fontSize: 14, fontWeight: '600', color: C.textSub },
    track: { height: 7, backgroundColor: C.divider, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    fill: { height: '100%', borderRadius: 4 },
    remaining: { fontSize: 12, color: C.textMuted },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 },
    emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  }), [C]);

  const { data: budgets = [], isFetching, refetch } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: () => api.get<Budget[]>('/budgets'),
  });

  const totalLimit = budgets.reduce((sum, b) => sum + b.limitCents, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spentCents ?? 0), 0);
  const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.brandMid} />}
    >
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <Text style={s.heroLabel}>Gesamt diesen Monat</Text>
        <Text style={s.heroValue}>{formatEUR(totalSpent)}</Text>
        <Text style={s.heroSub}>von {formatEUR(totalLimit)}</Text>
        <View style={s.heroTrack}>
          <View
            style={[s.heroFill, {
              width: `${Math.min(totalPct, 100)}%` as `${number}%`,
              backgroundColor: totalPct > 90 ? C.rose : totalPct > 70 ? C.amber : C.emerald,
            }]}
          />
        </View>
        <Text style={s.heroPct}>{totalPct}% des Budgets genutzt</Text>
      </View>

      <View style={s.list}>
        {budgets.map((b) => {
          const pct = b.progressPercent ?? 0;
          const isOver = pct > 90;
          const isWarn = pct > 70 && pct <= 90;
          const barColor = isOver ? C.rose : isWarn ? C.amber : C.emerald;
          const badgeBg = isOver ? C.roseBg : isWarn ? C.amberBg : C.emeraldBg;
          const badgeColor = isOver ? C.rose : isWarn ? C.amber : C.emerald;

          return (
            <View key={b.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.iconWrap}>
                  <Text style={{ fontSize: 22 }}>{b.category?.icon ?? '💰'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{b.name}</Text>
                  <Text style={s.cardCat}>{b.category?.name}</Text>
                </View>
                <View style={[s.pctBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[s.pctBadgeText, { color: badgeColor }]}>{pct}%</Text>
                </View>
              </View>

              <View style={s.amtRow}>
                <Text style={s.amtSpent}>{formatEUR(b.spentCents ?? 0)}</Text>
                <Text style={s.amtOf}> von </Text>
                <Text style={s.amtLimit}>{formatEUR(b.limitCents)}</Text>
              </View>

              <View style={s.track}>
                <View style={[s.fill, { width: `${Math.min(pct, 100)}%` as `${number}%`, backgroundColor: barColor }]} />
              </View>

              <Text style={s.remaining}>{formatEUR(b.remainingCents ?? 0)} verbleibend</Text>
            </View>
          );
        })}

        {budgets.length === 0 && !isFetching && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎯</Text>
            <Text style={s.emptyTitle}>Noch keine Budgets</Text>
            <Text style={s.emptyText}>Erstelle Budgets um deine Ausgaben im Blick zu behalten.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
