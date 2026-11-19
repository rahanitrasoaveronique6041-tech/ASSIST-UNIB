import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '../services/chatApi';
import { colors, fonts, radius, spacing } from '../theme';

type ContentKind = 'announcement' | 'info' | 'calendar';

interface ContentItem {
  id: string;
  title: string;
  content?: string;
  description?: string;
  category?: string;
  source: string;
  published?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  starts_at?: string;
  ends_at?: string | null;
}

interface ContentForm {
  title: string;
  content: string;
  category: string;
  source: string;
  validFrom: string;
  validTo: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
}

const EMPTY_FORM: ContentForm = {
  title: '',
  content: '',
  category: '',
  source: '',
  validFrom: '',
  validTo: '',
  startsAt: '',
  endsAt: '',
  published: false,
};

const KIND_LABELS: Record<ContentKind, string> = {
  announcement: 'Annonces',
  info: 'Informations',
  calendar: 'Calendrier',
};

const ENDPOINTS: Record<ContentKind, string> = {
  announcement: '/api/admin/announcements',
  info: '/api/admin/info',
  calendar: '/api/admin/calendar',
};

export function AdminContentManager({ session }: { session: Session | null }) {
  const [items, setItems] = useState<Record<ContentKind, ContentItem[]>>({
    announcement: [],
    info: [],
    calendar: [],
  });
  const [kind, setKind] = useState<ContentKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContentForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [announcements, info, calendar] = await Promise.all([
        apiRequest<ContentItem[]>(ENDPOINTS.announcement, session.access_token),
        apiRequest<ContentItem[]>(ENDPOINTS.info, session.access_token),
        apiRequest<ContentItem[]>(ENDPOINTS.calendar, session.access_token),
      ]);
      setItems({ announcement: announcements, info, calendar });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chargement des contenus impossible.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const loadInitialContent = async () => {
      await load();
    };
    void loadInitialContent();
  }, [load]);

  const startNew = (nextKind: ContentKind) => {
    setKind(nextKind);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
  };

  const startEdit = (nextKind: ContentKind, item: ContentItem) => {
    setKind(nextKind);
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content ?? item.description ?? '',
      category: item.category ?? '',
      source: item.source,
      validFrom: item.valid_from ?? '',
      validTo: item.valid_to ?? '',
      startsAt: item.starts_at ?? '',
      endsAt: item.ends_at ?? '',
      published: item.published ?? false,
    });
    setError('');
    setNotice('');
  };

  const save = async () => {
    if (!session || !kind) return;
    setLoading(true);
    setError('');
    setNotice('');
    let payload: Record<string, string | boolean | null>;
    if (kind === 'announcement') {
      payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        source: form.source.trim(),
        published: form.published,
      };
    } else if (kind === 'info') {
      payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim(),
        source: form.source.trim(),
        valid_from: form.validFrom || null,
        valid_to: form.validTo || null,
      };
    } else {
      payload = {
        title: form.title.trim(),
        description: form.content.trim(),
        category: form.category.trim(),
        source: form.source.trim(),
        starts_at: form.startsAt,
        ends_at: form.endsAt || null,
        published: form.published,
      };
    }

    try {
      await apiRequest(
        `${ENDPOINTS[kind]}${editingId ? `/${editingId}` : ''}`,
        session.access_token,
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      );
      setNotice(`${KIND_LABELS[kind]} ${editingId ? 'mis à jour' : 'créé'} avec succès.`);
      setKind(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  const remove = (nextKind: ContentKind, item: ContentItem) => {
    if (!session) return;
    Alert.alert('Supprimer ce contenu ?', item.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void apiRequest(
            `${ENDPOINTS[nextKind]}/${item.id}`,
            session.access_token,
            { method: 'DELETE' },
          ).then(load).catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : 'Suppression impossible.');
          });
        },
      },
    ]);
  };

  const toggleInfoPublication = async (item: ContentItem) => {
    if (!session) return;
    try {
      await apiRequest(`/api/admin/info/${item.id}/publish`, session.access_token, {
        method: 'PUT',
        body: JSON.stringify({ published: !item.published }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Publication impossible.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Annonces, informations et calendrier</Text>
      <Text style={styles.helper}>
        Seuls les contenus publiés et encore valides sont visibles par les étudiants.
      </Text>

      {(['announcement', 'info', 'calendar'] as const).map((currentKind) => (
        <View key={currentKind} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>
              {KIND_LABELS[currentKind]} ({items[currentKind].length})
            </Text>
            <Pressable onPress={() => startNew(currentKind)} style={styles.addButton}>
              <Text style={styles.addButtonText}>Ajouter</Text>
            </Pressable>
          </View>
          {items[currentKind].map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {currentKind === 'calendar' ? item.starts_at : item.category ?? item.source}
                  {item.published === undefined ? '' : item.published ? ' · PUBLIÉ' : ' · BROUILLON'}
                </Text>
              </View>
              {currentKind === 'info' && (
                <Pressable onPress={() => { void toggleInfoPublication(item); }} style={styles.actionButton}>
                  <Text style={styles.actionText}>{item.published ? 'Dépublier' : 'Publier'}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => startEdit(currentKind, item)} style={styles.actionButton}>
                <Text style={styles.actionText}>Modifier</Text>
              </Pressable>
              <Pressable onPress={() => remove(currentKind, item)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Supprimer</Text>
              </Pressable>
            </View>
          ))}
          {!items[currentKind].length && <Text style={styles.helper}>Aucun contenu enregistré.</Text>}
        </View>
      ))}

      {kind && (
        <View style={styles.editor}>
          <Text style={styles.groupTitle}>
            {editingId ? 'Modifier' : 'Créer'} : {KIND_LABELS[kind]}
          </Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(title) => setForm((current) => ({ ...current, title }))}
            placeholder="Titre"
            placeholderTextColor={colors.textSecondary}
          />
          {kind !== 'announcement' && (
            <TextInput
              style={styles.input}
              value={form.category}
              onChangeText={(category) => setForm((current) => ({ ...current, category }))}
              placeholder="Catégorie"
              placeholderTextColor={colors.textSecondary}
            />
          )}
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.content}
            onChangeText={(content) => setForm((current) => ({ ...current, content }))}
            multiline
            textAlignVertical="top"
            placeholder={kind === 'calendar' ? 'Description' : 'Contenu'}
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={styles.input}
            value={form.source}
            onChangeText={(source) => setForm((current) => ({ ...current, source }))}
            autoCapitalize="none"
            placeholder="Source officielle (URL ou référence)"
            placeholderTextColor={colors.textSecondary}
          />
          {kind === 'info' && (
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                value={form.validFrom}
                onChangeText={(validFrom) => setForm((current) => ({ ...current, validFrom }))}
                placeholder="Valide dès AAAA-MM-JJ"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={[styles.input, styles.dateInput]}
                value={form.validTo}
                onChangeText={(validTo) => setForm((current) => ({ ...current, validTo }))}
                placeholder="Valide jusqu'au"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}
          {kind === 'calendar' && (
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                value={form.startsAt}
                onChangeText={(startsAt) => setForm((current) => ({ ...current, startsAt }))}
                placeholder="Début AAAA-MM-JJ"
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={[styles.input, styles.dateInput]}
                value={form.endsAt}
                onChangeText={(endsAt) => setForm((current) => ({ ...current, endsAt }))}
                placeholder="Fin (facultatif)"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}
          {kind !== 'info' && (
            <View style={styles.switchRow}>
              <Text style={styles.helper}>Publier immédiatement</Text>
              <Switch
                value={form.published}
                onValueChange={(published) => setForm((current) => ({ ...current, published }))}
                trackColor={{ true: colors.primary }}
              />
            </View>
          )}
          <Pressable disabled={loading} onPress={() => { void save(); }} style={styles.saveButton}>
            <Text style={styles.saveText}>{loading ? 'Enregistrement…' : 'Enregistrer'}</Text>
          </Pressable>
          <Pressable onPress={() => { setKind(null); setEditingId(null); }} style={styles.cancelButton}>
            <Text style={styles.helper}>Annuler</Text>
          </Pressable>
        </View>
      )}
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {loading && <Text style={styles.helper}>Chargement…</Text>}
    </View>
  );
}

const styles = {
  container: { gap: spacing.md } as const,
  heading: { marginTop: spacing.md, fontFamily: fonts.bold, fontSize: 17, color: colors.text } as const,
  helper: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary } as const,
  group: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  groupTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text } as const,
  addButton: { minHeight: 36, justifyContent: 'center' as const, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm },
  addButtonText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary } as const,
  item: { flexDirection: 'row' as const, alignItems: 'center' as const, flexWrap: 'wrap' as const, gap: spacing.xs, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  itemText: { flexGrow: 1, flexBasis: '100%' as const, gap: 2 },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text } as const,
  itemMeta: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary } as const,
  actionButton: { minHeight: 36, justifyContent: 'center' as const, paddingHorizontal: spacing.sm },
  actionText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary } as const,
  deleteButton: { minHeight: 36, justifyContent: 'center' as const, paddingHorizontal: spacing.sm },
  deleteText: { fontFamily: fonts.medium, fontSize: 11, color: '#B42318' } as const,
  editor: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, fontFamily: fonts.regular, fontSize: 12, color: colors.text },
  multiline: { minHeight: 90, paddingTop: spacing.md },
  dateRow: { flexDirection: 'row' as const, gap: spacing.xs },
  dateInput: { flex: 1, minWidth: 0, fontSize: 10 },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  saveButton: { minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.primary, borderRadius: radius.sm },
  saveText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white } as const,
  cancelButton: { minHeight: 36, alignItems: 'center' as const, justifyContent: 'center' as const },
  notice: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary } as const,
  error: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: '#B42318' } as const,
};
