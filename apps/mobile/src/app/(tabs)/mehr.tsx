import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { C, shadow } from '../../lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: IoniconName;
  label: string;
  sub?: string;
  color?: string;
  onPress: () => void;
}

export default function MehrScreen() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  function handleLogout() {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Verwaltung',
      items: [
        { icon: 'business-outline', label: 'Banken verwalten', sub: 'Verbindungen & Sync', color: C.brand, onPress: () => router.push('/bank/verbinden') },
        { icon: 'bar-chart-outline', label: 'Statistiken', sub: 'Ausgabenanalyse', color: C.violet, onPress: () => {} },
        { icon: 'pricetag-outline', label: 'Kategorien', sub: 'Regeln anpassen', color: C.amber, onPress: () => {} },
      ],
    },
    {
      title: 'Konto',
      items: [
        { icon: 'person-outline', label: 'Profil', sub: 'Name, E-Mail', color: C.emerald, onPress: () => {} },
        { icon: 'shield-checkmark-outline', label: 'Sicherheit', sub: 'PIN, Biometrie, 2FA', color: C.brand, onPress: () => {} },
        { icon: 'notifications-outline', label: 'Benachrichtigungen', sub: 'Budget-Alerts', color: C.violet, onPress: () => {} },
      ],
    },
    {
      title: 'Sonstiges',
      items: [
        { icon: 'help-circle-outline', label: 'Hilfe & Support', sub: 'FAQ & Kontakt', color: C.textSub, onPress: () => {} },
        { icon: 'information-circle-outline', label: 'Über die App', sub: 'Version & Lizenzen', color: C.textSub, onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <StatusBar barStyle="light-content" />

      {/* Profile hero */}
      <View style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Menu sections */}
      {sections.map((sec) => (
        <View key={sec.title} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <View style={s.sectionCard}>
            {sec.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[s.menuItem, i < sec.items.length - 1 && s.menuItemBorder]}
                onPress={item.onPress}
                activeOpacity={0.65}
              >
                <View style={[s.menuIcon, { backgroundColor: `${item.color ?? C.brand}18` }]}>
                  <Ionicons name={item.icon} size={18} color={item.color ?? C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  {item.sub && <Text style={s.menuSub}>{item.sub}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={18} color={C.rose} />
        <Text style={s.logoutText}>Abmelden</Text>
      </TouchableOpacity>

      <Text style={s.version}>Finanzapp v1.0.0 · DSGVO-konform</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  hero: {
    backgroundColor: C.dark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.brand,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profileInfo: {},
  profileName: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden', ...shadow.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  menuSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 20,
    backgroundColor: C.roseBg, borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1, borderColor: `${C.rose}22`,
  },
  logoutText: { color: C.rose, fontWeight: '700', fontSize: 14 },
  version: { textAlign: 'center', fontSize: 11, color: C.textMuted, marginTop: 20 },
});
