import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { API_URL, apiRequest } from '../services/chatApi';
import { colors, fonts, radius, spacing } from '../theme';

interface Category {
  id: string;
  name: string;
}

interface Intent {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  category: string | null;
}

interface TrainingExample {
  id: string;
  text: string;
}

interface IntentResponse {
  id: string;
  text: string;
}

interface UnknownQuestion {
  id: string;
  question: string;
  created_at: string;
}

interface SupportRequest {
  id: string;
  question: string;
  created_at: string;
}

interface AdminQuestion {
  id: string;
  question: string;
  intent: string | null;
  created_at: string;
  email: string;
}

interface AdminFeedback {
  id: string;
  answer: string;
  rating: number;
  comment: string | null;
  created_at: string;
  email: string;
}

export function AdminKnowledgeManager({ session }: { session: Session | null }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [selectedIntentId, setSelectedIntentId] = useState('');
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [responses, setResponses] = useState<IntentResponse[]>([]);
  const [unknownQuestions, setUnknownQuestions] = useState<UnknownQuestion[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [intentName, setIntentName] = useState('');
  const [intentDescription, setIntentDescription] = useState('');
  const [intentCategoryId, setIntentCategoryId] = useState<string | null>(null);
  const [editingIntentId, setEditingIntentId] = useState<string | null>(null);
  const [exampleText, setExampleText] = useState('');
  const [editingExampleId, setEditingExampleId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [transferData, setTransferData] = useState('');
  const [transferFormat, setTransferFormat] = useState<'json' | 'csv'>('json');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBase = useCallback(async () => {
    if (!session) return;
    try {
      const [nextCategories, nextIntents, nextUnknown, nextSupport, nextQuestions, nextFeedback] = await Promise.all([
        apiRequest<Category[]>('/api/admin/categories', session.access_token),
        apiRequest<Intent[]>('/api/admin/intents', session.access_token),
        apiRequest<UnknownQuestion[]>('/api/admin/unknown-questions', session.access_token),
        apiRequest<SupportRequest[]>('/api/admin/support-requests', session.access_token),
        apiRequest<AdminQuestion[]>('/api/admin/questions', session.access_token),
        apiRequest<AdminFeedback[]>('/api/admin/feedback', session.access_token),
      ]);
      setCategories(nextCategories);
      setIntents(nextIntents);
      setUnknownQuestions(nextUnknown);
      setSupportRequests(nextSupport);
      setQuestions(nextQuestions);
      setFeedback(nextFeedback);
      if (!selectedIntentId && nextIntents.length) setSelectedIntentId(nextIntents[0].id);
      if (selectedIntentId && !nextIntents.some((intent) => intent.id === selectedIntentId)) {
        setSelectedIntentId(nextIntents[0]?.id ?? '');
      }
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chargement de la base de connaissances impossible.');
    }
  }, [session, selectedIntentId]);

  const loadIntentData = useCallback(async () => {
    if (!session || !selectedIntentId) {
      setExamples([]);
      setResponses([]);
      return;
    }
    try {
      const [nextExamples, nextResponses] = await Promise.all([
        apiRequest<TrainingExample[]>(
          `/api/admin/intents/${selectedIntentId}/examples`,
          session.access_token,
        ),
        apiRequest<IntentResponse[]>(
          `/api/admin/intents/${selectedIntentId}/responses`,
          session.access_token,
        ),
      ]);
      setExamples(nextExamples);
      setResponses(nextResponses);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chargement de l’intention impossible.');
    }
  }, [session, selectedIntentId]);

  useEffect(() => {
    const loadInitial = async () => { await loadBase(); };
    void loadInitial();
  }, [loadBase]);

  useEffect(() => {
    const loadSelected = async () => { await loadIntentData(); };
    void loadSelected();
  }, [loadIntentData]);

  const saveCategory = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(
        `/api/admin/categories${editingCategoryId ? `/${editingCategoryId}` : ''}`,
        session.access_token,
        {
        method: editingCategoryId ? 'PUT' : 'POST',
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      setCategoryName('');
      setEditingCategoryId(null);
      setNotice(editingCategoryId ? 'Catégorie modifiée.' : 'Catégorie créée.');
      await loadBase();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Création de la catégorie impossible.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(`/api/admin/categories/${categoryId}`, session.access_token, { method: 'DELETE' });
      if (intentCategoryId === categoryId) setIntentCategoryId(null);
      await loadBase();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suppression de la catégorie impossible.');
    } finally {
      setBusy(false);
    }
  };

  const saveIntent = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(
        `/api/admin/intents${editingIntentId ? `/${editingIntentId}` : ''}`,
        session.access_token,
        {
          method: editingIntentId ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: intentName.trim(),
            description: intentDescription.trim(),
            category_id: intentCategoryId,
          }),
        },
      );
      setIntentName('');
      setIntentDescription('');
      setIntentCategoryId(null);
      setEditingIntentId(null);
      setNotice(editingIntentId ? 'Intention modifiée.' : 'Intention créée.');
      await loadBase();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement de l’intention impossible.');
    } finally {
      setBusy(false);
    }
  };

  const deleteIntent = async (intentId: string) => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(`/api/admin/intents/${intentId}`, session.access_token, { method: 'DELETE' });
      if (selectedIntentId === intentId) setSelectedIntentId('');
      await loadBase();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suppression de l’intention impossible.');
    } finally {
      setBusy(false);
    }
  };

  const saveExample = async () => {
    if (!session || !selectedIntentId) return;
    setBusy(true);
    try {
      const path = editingExampleId
        ? `/api/admin/examples/${editingExampleId}`
        : `/api/admin/intents/${selectedIntentId}/examples`;
      await apiRequest(path, session.access_token, {
        method: editingExampleId ? 'PUT' : 'POST',
        body: JSON.stringify({ text: exampleText.trim() }),
      });
      setExampleText('');
      setEditingExampleId(null);
      setNotice('Exemple enregistré.');
      await loadIntentData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement de l’exemple impossible.');
    } finally {
      setBusy(false);
    }
  };

  const deleteExample = async (exampleId: string) => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(`/api/admin/examples/${exampleId}`, session.access_token, { method: 'DELETE' });
      await loadIntentData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suppression de l’exemple impossible.');
    } finally {
      setBusy(false);
    }
  };

  const saveResponse = async () => {
    if (!session || !selectedIntentId) return;
    setBusy(true);
    try {
      const path = editingResponseId
        ? `/api/admin/responses/${editingResponseId}`
        : `/api/admin/intents/${selectedIntentId}/responses`;
      await apiRequest(path, session.access_token, {
        method: editingResponseId ? 'PUT' : 'POST',
        body: JSON.stringify({ text: responseText.trim() }),
      });
      setResponseText('');
      setEditingResponseId(null);
      setNotice('Réponse associée enregistrée.');
      await loadIntentData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement de la réponse impossible.');
    } finally {
      setBusy(false);
    }
  };

  const deleteResponse = async (responseId: string) => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(`/api/admin/responses/${responseId}`, session.access_token, { method: 'DELETE' });
      await loadIntentData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suppression de la réponse impossible.');
    } finally {
      setBusy(false);
    }
  };

  const resolveQuestion = async (question: UnknownQuestion) => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(
        `/api/admin/unknown-questions/${question.id}/convert?intent_id=${selectedIntentId}`,
        session.access_token,
        { method: 'POST' },
      );
      setNotice('Question ajoutée aux exemples de l’intention sélectionnée.');
      await Promise.all([loadBase(), loadIntentData()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Conversion de la question impossible.');
    } finally {
      setBusy(false);
    }
  };

  const resolveSupportRequest = async (request: SupportRequest) => {
    if (!session) return;
    setBusy(true);
    try {
      await apiRequest(
        `/api/admin/support-requests/${request.id}/resolve`,
        session.access_token,
        { method: 'PUT' },
      );
      await loadBase();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Clôture de la demande impossible.');
    } finally {
      setBusy(false);
    }
  };

  const exportKnowledge = async (format: 'json' | 'csv') => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/admin/knowledge/export?format=${format}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error(`Export impossible (HTTP ${response.status}).`);
      const data = await response.text();
      setTransferFormat(format);
      setTransferData(format === 'json' ? JSON.stringify(JSON.parse(data), null, 2) : data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export impossible.');
    } finally {
      setBusy(false);
    }
  };

  const importKnowledge = async () => {
    if (!session || !transferData.trim()) return;
    setBusy(true);
    setError('');
    try {
      let response: Response;
      if (transferFormat === 'json') {
        response = await fetch(`${API_URL}/api/admin/knowledge/import`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: transferData,
        });
      } else {
        response = await fetch(`${API_URL}/api/admin/knowledge/import.csv`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'text/csv',
          },
          body: transferData,
        });
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(payload?.detail ?? `Import impossible (HTTP ${response.status}).`);
      }
      setNotice('Import terminé.');
      await Promise.all([loadBase(), loadIntentData()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import impossible.');
    } finally {
      setBusy(false);
    }
  };

  const selectedIntent = intents.find((intent) => intent.id === selectedIntentId);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Base de connaissances</Text>
      <Text style={styles.helper}>
        Le chatbot utilise une recherche textuelle et des règles par mots-clés. Les exemples ci-dessous sont comparés directement aux questions, sans modèle ni entraînement automatique.
      </Text>

      <Text style={styles.subheading}>Catégories</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex]}
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="Nouvelle catégorie"
          placeholderTextColor={colors.textSecondary}
        />
        <ActionButton
          title={editingCategoryId ? 'Enregistrer' : 'Ajouter'}
          disabled={busy || categoryName.trim().length < 2}
          onPress={saveCategory}
        />
      </View>
      {!!editingCategoryId && <ActionButton title="Annuler la catégorie" onPress={() => {
        setEditingCategoryId(null);
        setCategoryName('');
      }} />}
      <View style={styles.chips}>
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryItem}>
            <Pressable onPress={() => {
              setEditingCategoryId(category.id);
              setCategoryName(category.name);
            }}>
              <Text style={styles.chipText}>{category.name}</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => { void deleteCategory(category.id); }}>
              <Text style={styles.deleteCategory}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Text style={styles.subheading}>Intentions</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={intentName}
          onChangeText={setIntentName}
          placeholder="Nom de l’intention"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          value={intentDescription}
          onChangeText={setIntentDescription}
          placeholder="Description"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.chips}>
          <Pressable onPress={() => setIntentCategoryId(null)} style={styles.chip}>
            <Text style={styles.chipText}>Sans catégorie</Text>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setIntentCategoryId(category.id)}
              style={[styles.chip, intentCategoryId === category.id && styles.selectedChip]}
            >
              <Text style={[styles.chipText, intentCategoryId === category.id && styles.selectedChipText]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <ActionButton
          title={editingIntentId ? 'Enregistrer l’intention' : 'Créer l’intention'}
          disabled={busy || intentName.trim().length < 2 || intentDescription.trim().length < 3}
          onPress={saveIntent}
        />
        {!!editingIntentId && (
          <ActionButton title="Annuler la modification" onPress={() => {
            setEditingIntentId(null);
            setIntentName('');
            setIntentDescription('');
            setIntentCategoryId(null);
          }} />
        )}
      </View>

      <View style={styles.chips}>
        {intents.map((intent) => (
          <Pressable
            key={intent.id}
            onPress={() => setSelectedIntentId(intent.id)}
            onLongPress={() => {
              setEditingIntentId(intent.id);
              setIntentName(intent.name);
              setIntentDescription(intent.description);
              setIntentCategoryId(intent.category_id);
            }}
            style={[styles.chip, selectedIntentId === intent.id && styles.selectedChip]}
          >
            <Text style={[styles.chipText, selectedIntentId === intent.id && styles.selectedChipText]}>
              {intent.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {selectedIntent && (
        <View style={styles.actions}>
          <ActionButton title="Modifier" onPress={() => {
            setEditingIntentId(selectedIntent.id);
            setIntentName(selectedIntent.name);
            setIntentDescription(selectedIntent.description);
            setIntentCategoryId(selectedIntent.category_id);
          }} />
          <ActionButton title="Supprimer" disabled={busy} onPress={() => { void deleteIntent(selectedIntent.id); }} />
        </View>
      )}

      {selectedIntent && (
        <>
          <Text style={styles.subheading}>Mots-clés et exemples pour « {selectedIntent.name} »</Text>
          {examples.map((example) => (
            <View key={example.id} style={styles.listItem}>
              <Text style={styles.itemText}>{example.text}</Text>
              <ActionButton title="Modifier" onPress={() => {
                setEditingExampleId(example.id);
                setExampleText(example.text);
              }} />
              <ActionButton title="Supprimer" disabled={busy} onPress={() => { void deleteExample(example.id); }} />
            </View>
          ))}
          <TextInput
            style={styles.input}
            value={exampleText}
            onChangeText={setExampleText}
            placeholder="Exemple de question authentique"
            placeholderTextColor={colors.textSecondary}
          />
          <ActionButton
            title={editingExampleId ? 'Enregistrer l’exemple' : 'Ajouter un exemple'}
            disabled={busy || exampleText.trim().length < 3}
            onPress={saveExample}
          />

          <Text style={styles.subheading}>Réponses associées</Text>
          {responses.map((response) => (
            <View key={response.id} style={styles.listItem}>
              <Text style={styles.itemText}>{response.text}</Text>
              <ActionButton title="Modifier" onPress={() => {
                setEditingResponseId(response.id);
                setResponseText(response.text);
              }} />
              <ActionButton title="Supprimer" disabled={busy} onPress={() => { void deleteResponse(response.id); }} />
            </View>
          ))}
          <TextInput
            style={[styles.input, styles.multiline]}
            value={responseText}
            onChangeText={setResponseText}
            multiline
            textAlignVertical="top"
            placeholder="Réponse validée par l’administration"
            placeholderTextColor={colors.textSecondary}
          />
          <ActionButton
            title={editingResponseId ? 'Enregistrer la réponse' : 'Ajouter une réponse'}
            disabled={busy || responseText.trim().length < 3}
            onPress={saveResponse}
          />
        </>
      )}

      <Text style={styles.subheading}>Questions non comprises ({unknownQuestions.length})</Text>
      {!selectedIntent && unknownQuestions.length > 0 && (
        <Text style={styles.helper}>Sélectionnez une intention pour transformer une question en exemple.</Text>
      )}
      {unknownQuestions.map((question) => (
        <View key={question.id} style={styles.listItem}>
          <Text style={styles.itemText}>{question.question}</Text>
          <ActionButton
            title="Ajouter à l’intention sélectionnée"
            disabled={busy || !selectedIntentId}
            onPress={() => { void resolveQuestion(question); }}
          />
        </View>
      ))}
      {!unknownQuestions.length && <Text style={styles.helper}>Aucune question à traiter.</Text>}

      <Text style={styles.subheading}>Demandes envoyées à l’administration ({supportRequests.length})</Text>
      {supportRequests.map((request) => (
        <View key={request.id} style={styles.listItem}>
          <Text style={styles.itemText}>{request.question}</Text>
          <ActionButton
            title="Marquer comme traitée"
            disabled={busy}
            onPress={() => { void resolveSupportRequest(request); }}
          />
        </View>
      ))}
      {!supportRequests.length && <Text style={styles.helper}>Aucune demande en attente.</Text>}

      <Text style={styles.subheading}>Questions posées récemment ({questions.length})</Text>
      {questions.slice(0, 20).map((question) => (
        <View key={question.id} style={styles.listItem}>
          <Text style={styles.itemText}>{question.question}</Text>
          <Text style={styles.helper}>
            {question.email} · {question.intent ?? 'Aucune règle correspondante'}
          </Text>
        </View>
      ))}

      <Text style={styles.subheading}>Retours des étudiants ({feedback.length})</Text>
      {feedback.slice(0, 20).map((item) => (
        <View key={item.id} style={styles.listItem}>
          <Text style={styles.itemText}>Note : {item.rating}/5 · {item.email}</Text>
          <Text style={styles.itemText}>{item.answer}</Text>
          {!!item.comment && <Text style={styles.helper}>Commentaire : {item.comment}</Text>}
        </View>
      ))}
      {!feedback.length && <Text style={styles.helper}>Aucun retour reçu.</Text>}

      <Text style={styles.subheading}>Réponses sans modèle</Text>
      <Text style={styles.helper}>
        Les documents publiés sont recherchés en texte intégral. En l’absence de document, une réponse prédéfinie est utilisée seulement si une règle et une réponse ont été ajoutées ici ; sinon la question est signalée à l’administration.
      </Text>
      <Text style={styles.subheading}>Import / export CSV et JSON</Text>
      <View style={styles.actions}>
        <ActionButton title="Exporter JSON" disabled={busy} onPress={() => exportKnowledge('json')} />
        <ActionButton title="Exporter CSV" disabled={busy} onPress={() => exportKnowledge('csv')} />
        <ActionButton title="Format JSON" onPress={() => setTransferFormat('json')} />
        <ActionButton title="Format CSV" onPress={() => setTransferFormat('csv')} />
      </View>
      <TextInput
        style={[styles.input, styles.transferInput]}
        value={transferData}
        onChangeText={setTransferData}
        multiline
        textAlignVertical="top"
        autoCapitalize="none"
        placeholder={transferFormat === 'json' ? 'Coller un export JSON ici' : 'Coller un export CSV ici'}
        placeholderTextColor={colors.textSecondary}
      />
      <ActionButton
        title={`Importer ${transferFormat.toUpperCase()}`}
        disabled={busy || !transferData.trim()}
        onPress={importKnowledge}
      />
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

function ActionButton({
  title,
  disabled = false,
  onPress,
}: {
  title: string;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable disabled={disabled} onPress={() => { void onPress(); }} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = {
  container: { gap: spacing.sm },
  heading: { marginTop: spacing.md, fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  subheading: { marginTop: spacing.sm, fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  helper: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  form: { gap: spacing.xs },
  row: { flexDirection: 'row' as const, gap: spacing.xs },
  flex: { flex: 1 },
  input: { minHeight: 42, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, fontFamily: fonts.regular, fontSize: 12, color: colors.text },
  multiline: { minHeight: 84, paddingTop: spacing.md },
  transferInput: { minHeight: 160 },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.medium, fontSize: 10, color: colors.textSecondary },
  categoryItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill },
  deleteCategory: { fontFamily: fonts.bold, fontSize: 13, color: '#B42318' },
  selectedChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedChipText: { color: colors.white },
  listItem: { gap: spacing.xs, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  itemText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.text },
  actions: { flexDirection: 'row' as const, gap: spacing.xs },
  button: { minHeight: 36, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm },
  buttonText: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary },
  disabled: { opacity: 0.5 },
  notice: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  error: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: '#B42318' },
};
