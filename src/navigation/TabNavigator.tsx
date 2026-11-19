import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ChatScreen } from '../screens/ChatScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { InfoScreen } from '../screens/InfoScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { colors, fonts } from '../theme';
import type { IconName } from '../types';
import type { TabParamList } from './types';
import { useAuth } from '../hooks/useAuth';

const Tab = createBottomTabNavigator<TabParamList>();

const TABS: Record<keyof TabParamList, { label: string; icon: IconName; activeIcon: IconName }> = {
  Chat: { label: 'Accueil', icon: 'home-outline', activeIcon: 'home' },
  History: { label: 'Historique', icon: 'time-outline', activeIcon: 'time' },
  Info: { label: 'Profil', icon: 'person-circle-outline', activeIcon: 'person-circle' },
  Admin: { label: 'Gestion', icon: 'settings-outline', activeIcon: 'settings' },
};

export function TabNavigator() {
  const { profile } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const { label, icon, activeIcon } = TABS[route.name];
        return {
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarLabel: label,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
          tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? activeIcon : icon} size={size} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Info" component={InfoScreen} />
      {profile && profile.role !== 'student' && <Tab.Screen name="Admin" component={AdminScreen} />}
    </Tab.Navigator>
  );
}
