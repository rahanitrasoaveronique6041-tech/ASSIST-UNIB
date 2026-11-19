import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const DOT_COUNT = 4;

export function WelcomeScreen({ navigation }: Props) {
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, '#1E40AF']}
        style={[styles.hero, { paddingTop: top + spacing.xl }]}
      >
        <Ionicons name="school" size={40} color={colors.white} />
        <Text style={styles.title}>Assistant Étudiant</Text>
        <Text style={styles.subtitle}>
          Votre allié pour une expérience universitaire plus simple
        </Text>
        <View style={styles.illustration}>
          <MaterialCommunityIcons name="robot-happy-outline" size={110} color={colors.white} />
        </View>
      </LinearGradient>

      <View style={[styles.card, { paddingBottom: bottom + spacing.xl }]}>
        <Text style={styles.greeting}>Bonjour ! 👋</Text>
        <Text style={styles.description}>
          Posez une question sur vos démarches universitaires. Une réponse est fournie lorsqu&apos;un
          document validé contient l&apos;information recherchée.
        </Text>
        <Button
          title="Commencer une discussion"
          icon="arrow-forward"
          onPress={() => navigation.navigate('Main')}
        />
        <View style={styles.dots}>
          {Array.from({ length: DOT_COUNT }, (_, index) => (
            <View key={index} style={[styles.dot, index === 0 && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  hero: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.white },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    color: colors.white,
  },
  illustration: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl },
  card: {
    gap: spacing.lg,
    marginTop: -spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  greeting: { fontFamily: fonts.bold, fontSize: 26, color: colors.primary },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.text },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.background },
  dotActive: { backgroundColor: colors.primary },
});
