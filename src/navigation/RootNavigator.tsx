import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { AuthScreen } from '../screens/AuthScreen';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, profile, loading, error, refreshProfile, signOut } = useAuth();

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (session && !profile) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>Profil indisponible</Text>
        <Text style={styles.blockedText}>{error ?? 'Le profil de votre compte n’a pas pu être confirmé dans Supabase.'}</Text>
        <Pressable onPress={() => { void refreshProfile(session); }} style={styles.retry}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
        <Pressable onPress={() => { void signOut(); }} style={styles.signOut}>
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Main" component={TabNavigator} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  blocked: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.white },
  blockedTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  blockedText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 8 },
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  signOut: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
});
