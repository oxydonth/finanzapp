import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const C = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.brandMid,
        tabBarInactiveTintColor: C.dark3,
        tabBarStyle: {
          backgroundColor: C.dark,
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 4,
        },
        headerStyle: { backgroundColor: C.dark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Übersicht',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size - 1} />,
        }}
      />
      <Tabs.Screen
        name="konten"
        options={{
          title: 'Konten',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="card" color={color} size={size - 1} />,
        }}
      />
      <Tabs.Screen
        name="transaktionen"
        options={{
          title: 'Ausgaben',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="swap-horizontal" color={color} size={size - 1} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="pie-chart" color={color} size={size - 1} />,
        }}
      />
      <Tabs.Screen
        name="mehr"
        options={{
          title: 'Mehr',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size - 1} />,
        }}
      />
    </Tabs>
  );
}
