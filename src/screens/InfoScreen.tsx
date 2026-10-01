import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { DOMAINS, type Domain } from '../data/domains';
import { useExitToWelcome } from '../navigation/useExitToWelcome';
import { colors, fonts, radius, spacing } from '../theme';

export function InfoScreen() {
  const exit = useExitToWelcome();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Informations" onBack={exit} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="school" size={32} color={colors.primary} />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>Assistant Étudiant</Text>
            <Text style={styles.introSubtitle}>
              Système intelligent de support aux étudiants basé sur le traitement du langage
              naturel (NLP)
            </Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          Notre assistant vous permet de poser des questions en langage naturel concernant
          différentes informations académiques. Il analyse votre demande, identifie l'intention et
          vous fournit une réponse pertinente en consultant notre base de connaissances.
        </Text>

        <Text style={styles.sectionTitle}>Domaines pris en charge</Text>
        {DOMAINS.map((domain) => (
          <DomainRow key={domain.title} domain={domain} />
        ))}

        <View style={styles.banner}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.bannerText}>
            L'assistant est disponible 24h/24 et 7j/7 pour vous accompagner dans votre parcours
            universitaire.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function DomainRow({ domain }: { domain: Domain }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: domain.tint }]}>
        <Ionicons name={domain.icon} size={20} color={domain.color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{domain.title}</Text>
        <Text style={styles.rowDescription}>{domain.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { gap: spacing.md, padding: spacing.lg },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  introIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
  },
  introText: { flex: 1, gap: 4 },
  introTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  introSubtitle: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  paragraph: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.text },
  sectionTitle: { marginTop: spacing.sm, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  rowDescription: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  bannerText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.text },
});
