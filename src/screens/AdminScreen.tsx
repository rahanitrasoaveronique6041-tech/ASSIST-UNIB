import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../hooks/useAuth';
import { useExitToWelcome } from '../navigation/useExitToWelcome';
import { apiRequest } from '../services/chatApi';
import { colors, fonts, radius, spacing } from '../theme';
import { AdminContentManager } from '../components/AdminContentManager';
import { AdminUserManager } from '../components/AdminUserManager';
import { AdminKnowledgeManager } from '../components/AdminKnowledgeManager';

interface DocumentRow {
  id: string;
  title: string;
  category: string;
  source: string;
  content: string;
  version: string | null;
  valid_from: string | null;
  valid_to: string | null;
  status: 'draft' | 'published' | 'archived';
  chunk_count: number;
}

interface AdminStats {
  documents: number;
  users: number;
  conversations: number;
  questions: number;
  unknown_questions: number;
  understood_rate: number | null;
  feedback_count: number;
  average_rating: number | null;
  top_questions: { question: string; count: number }[];
  daily_questions: { day: string; count: number }[];
}

const CATEGORIES = ['INSCRIPTION', 'REINSCRIPTION', 'PIECES', 'CERTIFICAT', 'RELEVE', 'CALENDRIER', 'FRAIS', 'CONTACT', 'HORAIRES'];

export function AdminScreen() {
  const exit = useExitToWelcome();
  const { session, profile } = useAuth();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [source, setSource] = useState('');
  const [version, setVersion] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    if (!session) return;
    return Promise.all([
      apiRequest<DocumentRow[]>('/api/admin/documents', session.access_token),
      apiRequest<AdminStats>('/api/admin/statistics', session.access_token),
    ]);
  }, [session]);

  const load = useCallback(async () => {
    try {
      const data = await fetchDashboard();
      if (!data) return;
      const [nextDocuments, nextStats] = data;
      setDocuments(nextDocuments);
      setStats(nextStats);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chargement impossible.');
    }
  }, [fetchDashboard]);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const data = await fetchDashboard();
        if (!active || !data) return;
        const [nextDocuments, nextStats] = data;
        setDocuments(nextDocuments);
        setStats(nextStats);
        setError('');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Chargement impossible.');
      }
    };
    void loadInitialData();
    return () => { active = false; };
  }, [fetchDashboard]);

  const addDocument = async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest<{ chunks: number }>(
        editingId ? `/api/admin/documents/${editingId}` : '/api/admin/documents',
        session.access_token,
        {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          title, category, source, content, status: 'draft',
          version: version || undefined,
          valid_from: validFrom || undefined,
          valid_to: validTo || undefined,
        }),
      });
      setTitle('');
      setSource('');
      setVersion('');
      setValidFrom('');
      setValidTo('');
      setContent('');
      setEditingId(null);
      setNotice(`Document ${editingId ? 'modifié' : 'ajouté en brouillon'}, ${result.chunks} passage(s) indexé(s).`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ajout du document impossible.');
    } finally {
      setBusy(false);
    }
  };

  const editDocument = (document: DocumentRow) => {
    setEditingId(document.id);
    setTitle(document.title);
    setCategory(document.category);
    setSource(document.source);
    setVersion(document.version ?? '');
    setValidFrom(document.valid_from ?? '');
    setValidTo(document.valid_to ?? '');
    setContent(document.content);
    setNotice('Modifiez les informations puis enregistrez pour réindexer le document.');
  };

  const setStatus = async (document: DocumentRow, status: 'published' | 'archived') => {
    if (!session) return;
    if (status === 'published') {
      Alert.alert(
        'Publier ce document ?',
        'Les réponses étudiantes pourront utiliser ce contenu. Vérifiez que la source et sa validité sont confirmées.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Publier', onPress: () => { void updateStatus(document, status); } },
        ],
      );
      return;
    }
    await updateStatus(document, status);
  };

  const updateStatus = async (document: DocumentRow, status: 'published' | 'archived') => {
    if (!session) return;
    try {
      await apiRequest(`/api/admin/documents/${document.id}/status`, session.access_token, {
        method: 'PUT', body: JSON.stringify({ status }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Modification impossible.');
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Administration" onBack={exit} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Vue d’ensemble</Text>
        <View style={styles.metrics}>
          <Metric label="Documents" value={stats?.documents} />
          <Metric label="Comptes actifs" value={stats?.users} />
          <Metric label="Questions" value={stats?.questions} />
          <Metric label="Sans réponse" value={stats?.unknown_questions} />
          <Metric label="Conversations" value={stats?.conversations} />
          <Metric label="Avis reçus" value={stats?.feedback_count} />
          <Metric label="Note moyenne / 5" value={stats?.average_rating} />
          <Metric label="Taux compris (%)" value={stats?.understood_rate == null ? null : Math.round(stats.understood_rate * 100)} />
        </View>
        <Text style={styles.heading}>Questions les plus fréquentes</Text>
        {stats?.top_questions.map((item) => (
          <Text key={item.question} style={styles.helper}>{item.count} × {item.question}</Text>
        ))}
        {!!stats?.daily_questions.length && (
          <>
            <Text style={styles.heading}>Activité récente (30 jours)</Text>
            {stats.daily_questions.slice(-7).map((item) => (
              <Text key={item.day} style={styles.helper}>
                {new Date(`${item.day}T00:00:00`).toLocaleDateString('fr-FR')} : {item.count} question(s)
              </Text>
            ))}
          </>
        )}
        <Text style={styles.heading}>{editingId ? 'Modifier une source officielle' : 'Ajouter une source officielle'}</Text>
        <Text style={styles.helper}>Les nouveaux documents restent en brouillon jusqu’à validation.</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Titre du document" placeholderTextColor={colors.textSecondary} />
        <View style={styles.categories}>
          {CATEGORIES.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categorySelected]}>
              <Text style={[styles.categoryText, category === item && styles.categoryTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.input} value={source} onChangeText={setSource} autoCapitalize="none" keyboardType="url" placeholder="URL ou référence institutionnelle" placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} value={version} onChangeText={setVersion} placeholder="Version (facultatif)" placeholderTextColor={colors.textSecondary} />
        <View style={styles.dates}>
          <TextInput style={[styles.input, styles.dateInput]} value={validFrom} onChangeText={setValidFrom} placeholder="Valide dès AAAA-MM-JJ" placeholderTextColor={colors.textSecondary} />
          <TextInput style={[styles.input, styles.dateInput]} value={validTo} onChangeText={setValidTo} placeholder="Valide jusqu’au AAAA-MM-JJ" placeholderTextColor={colors.textSecondary} />
        </View>
        <TextInput style={[styles.input, styles.textarea]} value={content} onChangeText={setContent} multiline textAlignVertical="top" placeholder="Texte extrait du document officiel (30 caractères minimum)" placeholderTextColor={colors.textSecondary} />
        <Pressable disabled={busy || title.length < 3 || source.length < 4 || content.length < 30} onPress={addDocument} style={[styles.primaryButton, (busy || title.length < 3 || source.length < 4 || content.length < 30) && styles.disabled]}>
          {busy ? <ActivityIndicator color={colors.white} /> : <><Ionicons name={editingId ? 'save-outline' : 'add-circle-outline'} size={18} color={colors.white} /><Text style={styles.primaryText}>{editingId ? 'Enregistrer et réindexer' : 'Indexer en brouillon'}</Text></>}
        </Pressable>
        {editingId && <Pressable onPress={() => { setEditingId(null); setTitle(''); setSource(''); setVersion(''); setValidFrom(''); setValidTo(''); setContent(''); }} style={styles.cancelEdit}><Text style={styles.cancelText}>Annuler la modification</Text></Pressable>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Text style={styles.heading}>Documents ({documents.length})</Text>
        {documents.map((document) => (
          <View key={document.id} style={styles.document}>
            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <Text style={styles.documentMeta}>{document.status.toUpperCase()} · {document.chunk_count} passage(s)</Text>
              <Text style={styles.documentSource} numberOfLines={1}>{document.source}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable accessibilityLabel="Modifier le document" onPress={() => editDocument(document)} style={styles.iconButton}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </Pressable>
              {document.status !== 'published' ? (
                <Pressable accessibilityLabel="Publier le document" onPress={() => setStatus(document, 'published')} style={styles.iconButton}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                </Pressable>
              ) : (
                <Pressable accessibilityLabel="Archiver le document" onPress={() => setStatus(document, 'archived')} style={styles.iconButton}>
                  <Ionicons name="archive-outline" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        ))}
        {!documents.length && !error && <Text style={styles.helper}>Aucun document enregistré.</Text>}
        <AdminContentManager session={session} />
        {profile && (
          <AdminUserManager
            session={session}
            currentUserId={profile.id}
            currentRole={profile.role}
          />
        )}
        <AdminKnowledgeManager session={session} />
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value?: number | null }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value ?? '—'}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { marginTop: spacing.md, fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  helper: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flexGrow: 1, minWidth: '46%', padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm },
  metricValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  metricLabel: { marginTop: 2, fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  input: { minHeight: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  dates: { flexDirection: 'row', gap: spacing.sm },
  dateInput: { flex: 1, minWidth: 0, fontSize: 11 },
  textarea: { minHeight: 150, paddingTop: spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  category: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  categorySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontFamily: fonts.medium, fontSize: 10, color: colors.textSecondary },
  categoryTextSelected: { color: colors.white },
  primaryButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm },
  primaryText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  disabled: { opacity: 0.5 },
  notice: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  error: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: '#B42318' },
  document: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  documentInfo: { flex: 1, gap: 3 },
  documentTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  documentMeta: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary },
  documentSource: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  cancelEdit: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
});
