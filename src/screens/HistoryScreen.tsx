import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../hooks/useAuth';
import { useExitToWelcome } from '../navigation/useExitToWelcome';
import type { TabParamList } from '../navigation/types';
import { apiRequest } from '../services/chatApi';
import { colors, fonts, radius, spacing } from '../theme';

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string | null;
}

type Props = BottomTabScreenProps<TabParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const exit = useExitToWelcome();
  const { session } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    if (!session) return;
    return apiRequest<Conversation[]>('/api/conversations', session.access_token);
  }, [session]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const nextItems = await fetchItems();
      if (nextItems) setItems(nextItems);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Historique indisponible.');
    } finally {
      setLoading(false);
    }
  }, [fetchItems, session]);

  const remove = (item: Conversation) => {
    if (!session) return;
    Alert.alert('Supprimer cette conversation ?', 'Tous ses messages et avis associés seront supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        void apiRequest(`/api/conversations/${item.id}`, session.access_token, { method: 'DELETE' })
          .then(() => setItems((current) => current.filter(({ id }) => id !== item.id)))
          .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Suppression impossible.'));
      } },
    ]);
  };

  const removeAll = () => {
    if (!session || !items.length) return;
    Alert.alert(
      'Supprimer tout l’historique ?',
      `${items.length} conversation(s) et leurs messages seront supprimés définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            void apiRequest<{ deleted: number }>('/api/conversations', session.access_token, {
              method: 'DELETE',
            }).then(() => setItems([])).catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'Suppression de l’historique impossible.');
            });
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (!session) return;
    let active = true;
    const loadInitialItems = async () => {
      try {
        const nextItems = await fetchItems();
        if (!active || !nextItems) return;
        setItems(nextItems);
        setError('');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Historique indisponible.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitialItems();
    return () => { active = false; };
  }, [fetchItems, session]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Historique" onBack={exit} />
      {items.length > 0 && !loading && (
        <Pressable accessibilityRole="button" onPress={removeAll} style={styles.clearAll}>
          <Ionicons name="trash-outline" size={16} color="#B42318" />
          <Text style={styles.clearAllText}>Supprimer tout l’historique</Text>
        </Pressable>
      )}
      {loading ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={load}
          refreshing={loading}
          ListEmptyComponent={<Text style={styles.empty}>{error || 'Aucune conversation enregistrée pour le moment.'}</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Chat', { conversationId: item.id })} style={styles.open}>
                <View style={styles.icon}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} /></View>
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={1}>{item.title || 'Conversation'}</Text>
                  <Text style={styles.date}>{new Date(item.updated_at || item.created_at).toLocaleString('fr-FR')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Supprimer cette conversation" onPress={() => remove(item)} style={styles.delete}>
                <Ionicons name="trash-outline" size={18} color="#B42318" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  loader: { marginTop: spacing.xl },
  list: { gap: spacing.sm, padding: spacing.lg, flexGrow: 1 },
  empty: { marginTop: spacing.xl, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  clearAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm, backgroundColor: '#FEE4E2', borderRadius: radius.sm },
  clearAllText: { fontFamily: fonts.semibold, fontSize: 12, color: '#B42318' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  delete: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#FEE4E2' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.sm },
  body: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
});
