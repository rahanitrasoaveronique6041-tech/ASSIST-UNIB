import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { DOMAINS, type Domain } from '../data/domains';
import { useExitToWelcome } from '../navigation/useExitToWelcome';
import { colors, fonts, radius, spacing } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../services/chatApi';
import type { Session } from '@supabase/supabase-js';
import { scheduleAcademicReminder } from '../services/notifications';

interface Announcement {
  id: string;
  title: string;
  content: string;
  source: string;
  published_at: string | null;
}

interface UniversityInfo {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  valid_from: string | null;
  valid_to: string | null;
}

interface AcademicEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  starts_at: string;
  ends_at: string | null;
}

export function InfoScreen() {
  const exit = useExitToWelcome();
  const { profile, session, error, signOut, updateProfile } = useAuth();
  const [filiere, setFiliere] = useState(profile?.filiere ?? '');
  const [niveau, setNiveau] = useState(profile?.niveau ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [universityInfo, setUniversityInfo] = useState<UniversityInfo[]>([]);
  const [calendar, setCalendar] = useState<AcademicEvent[]>([]);
  const [contentError, setContentError] = useState('');
  const [reminderNotice, setReminderNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadOfficialContent = async (activeSession: Session | null) => {
      if (!activeSession) return;
      try {
        const [nextAnnouncements, nextInfo, nextCalendar] = await Promise.all([
          apiRequest<Announcement[]>('/api/announcements', activeSession.access_token),
          apiRequest<UniversityInfo[]>('/api/info', activeSession.access_token),
          apiRequest<AcademicEvent[]>('/api/calendar', activeSession.access_token),
        ]);
        if (!active) return;
        setAnnouncements(nextAnnouncements);
        setUniversityInfo(nextInfo);
        setCalendar(nextCalendar);
        setContentError('');
      } catch (cause) {
        if (active) {
          setContentError(cause instanceof Error ? cause.message : 'Chargement des informations impossible.');
        }
      }
    };
    void loadOfficialContent(session);
    return () => { active = false; };
  }, [session]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      Alert.alert('Déconnexion impossible', 'Vérifiez votre connexion puis réessayez.');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        filiere: filiere.trim() || null,
        niveau: niveau.trim() || null,
      });
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.');
    } catch (cause) {
      Alert.alert(
        'Modification impossible',
        cause instanceof Error ? cause.message : 'Vérifiez votre connexion puis réessayez.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const scheduleReminder = async (event: AcademicEvent) => {
    try {
      const identifier = await scheduleAcademicReminder({
        id: event.id,
        title: event.title,
        description: event.description,
        starts_at: event.starts_at,
      });
      setReminderNotice(
        identifier
          ? 'Rappel local programmé pour la veille à 9 h.'
          : 'Aucune alerte créée : autorisation refusée ou date déjà passée.',
      );
    } catch (cause) {
      setReminderNotice(
        cause instanceof Error ? cause.message : 'Impossible de programmer le rappel.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mon profil" onBack={exit} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="school" size={32} color={colors.primary} />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>Assistant Étudiant</Text>
            <Text style={styles.introSubtitle}>
              Informations administratives universitaires à partir de documents validés
            </Text>
          </View>
        </View>

        {error && <Text style={styles.accountError}>{error}</Text>}
        {profile && (
          <View style={styles.account}>
            <Text style={styles.accountHeading}>Mon compte Supabase</Text>
            <View style={styles.accountText}>
              <View style={styles.profileLine}>
                <Text style={styles.profileLabel}>E-mail</Text>
                <Text selectable style={styles.accountEmail}>{profile.email ?? 'Non renseigné'}</Text>
              </View>
              <View style={styles.profileLine}>
                <Text style={styles.profileLabel}>Rôle</Text>
                <Text style={styles.accountEmail}>
                  {profile.role === 'super_admin' ? 'Super-administrateur' : profile.role === 'admin' ? 'Administrateur' : 'Étudiant'}
                </Text>
              </View>
              {profile.matricule && (
                <View style={styles.profileLine}>
                  <Text style={styles.profileLabel}>Matricule</Text>
                  <Text style={styles.accountEmail}>{profile.matricule}</Text>
                </View>
              )}
              <Text style={styles.profileLabel}>Filière</Text>
              <TextInput
                accessibilityLabel="Filière"
                style={styles.profileInput}
                value={filiere}
                onChangeText={setFiliere}
                maxLength={120}
                placeholder="Votre filière"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.profileLabel}>Niveau</Text>
              <TextInput
                accessibilityLabel="Niveau d'études"
                style={styles.profileInput}
                value={niveau}
                onChangeText={setNiveau}
                maxLength={80}
                placeholder="Votre niveau"
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingProfile}
                onPress={() => { void handleSaveProfile(); }}
                style={[styles.saveProfile, savingProfile && styles.disabled]}
              >
                <Text style={styles.saveProfileText}>{savingProfile ? 'Enregistrement…' : 'Enregistrer mon profil'}</Text>
              </Pressable>
              {profile.created_at && (
                <View style={styles.profileLine}>
                  <Text style={styles.profileLabel}>Compte créé</Text>
                  <Text style={styles.accountValue}>{new Date(profile.created_at).toLocaleDateString('fr-FR')}</Text>
                </View>
              )}
            </View>
            <Pressable accessibilityRole="button" onPress={() => { void handleSignOut(); }} style={styles.signOut}>
              <Ionicons name="log-out-outline" size={18} color="#B42318" />
              <Text style={styles.signOutText}>Se déconnecter</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.paragraph}>
          Posez vos questions sur les démarches universitaires. Les réponses s&apos;appuient sur les
          documents validés disponibles et affichent leur source. Si aucune information fiable
          n&apos;est trouvée, contactez le service de scolarité.
        </Text>

        <Text style={styles.sectionTitle}>Domaines pris en charge</Text>
        {DOMAINS.map((domain) => (
          <DomainRow key={domain.title} domain={domain} />
        ))}

        <Text style={styles.sectionTitle}>Annonces officielles</Text>
        {announcements.map((item) => (
          <OfficialItem key={item.id} title={item.title} detail={item.content} source={item.source} />
        ))}
        {!announcements.length && !contentError && <Text style={styles.emptyContent}>Aucune annonce publiée.</Text>}

        <Text style={styles.sectionTitle}>Informations universitaires</Text>
        {universityInfo.map((item) => (
          <OfficialItem key={item.id} title={`${item.category} · ${item.title}`} detail={item.content} source={item.source} />
        ))}
        {!universityInfo.length && !contentError && <Text style={styles.emptyContent}>Aucune information publiée.</Text>}

        <Text style={styles.sectionTitle}>Calendrier académique</Text>
        {calendar.map((item) => (
          <View key={item.id}>
            <OfficialItem
              title={`${new Date(`${item.starts_at}T00:00:00`).toLocaleDateString('fr-FR')} · ${item.title}`}
              detail={item.description}
              source={item.source}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => { void scheduleReminder(item); }}
              style={styles.reminderButton}
            >
              <Ionicons name="notifications-outline" size={16} color={colors.primary} />
              <Text style={styles.reminderText}>Créer un rappel local</Text>
            </Pressable>
          </View>
        ))}
        {!calendar.length && !contentError && <Text style={styles.emptyContent}>Aucune échéance publiée.</Text>}
        {!!contentError && <Text accessibilityRole="alert" style={styles.accountError}>{contentError}</Text>}
        {!!reminderNotice && <Text style={styles.reminderNotice}>{reminderNotice}</Text>}

        <View style={styles.banner}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.bannerText}>
            Les informations publiées doivent être validées par le service universitaire concerné.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

function OfficialItem({ title, detail, source }: { title: string; detail: string; source: string }) {
  return (
    <View style={styles.officialItem}>
      <Text style={styles.officialTitle}>{title}</Text>
      <Text style={styles.officialDetail}>{detail}</Text>
      <Text selectable style={styles.officialSource}>Source : {source}</Text>
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
  accountError: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: '#B42318' },
  account: { gap: spacing.md, marginTop: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  accountHeading: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  accountText: { gap: spacing.sm },
  profileLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  profileLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  accountEmail: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  accountValue: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  profileInput: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  saveProfile: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.sm },
  saveProfileText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  disabled: { opacity: 0.6 },
  reminderButton: { minHeight: 40, marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  reminderText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  reminderNotice: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: colors.primary },
  officialItem: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  officialTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  officialDetail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.text },
  officialSource: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary },
  emptyContent: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  signOut: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.sm, backgroundColor: '#FEE4E2' },
  signOutText: { fontFamily: fonts.semibold, fontSize: 13, color: '#B42318' },
});
