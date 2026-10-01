import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { HISTORY_SECTIONS, type HistoryItem } from '../data/history';
import { useExitToWelcome } from '../navigation/useExitToWelcome';
import { colors, fonts, radius, spacing } from '../theme';
import { normalize } from '../utils/text';

export function HistoryScreen() {
  const exit = useExitToWelcome();
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const search = normalize(query);
    return HISTORY_SECTIONS.map((section) => ({
      ...section,
      data: section.data.filter(({ title, question }) =>
        normalize(`${title} ${question}`).includes(search),
      ),
    })).filter((section) => section.data.length > 0);
  }, [query]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Historique" onBack={exit} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une conversation..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => <HistoryRow item={item} />}
      />
    </View>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconTile}>
        <Ionicons name={item.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowQuestion}>Vous : {item.question}</Text>
      </View>
      <Text style={styles.rowTime}>{item.time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  list: { gap: spacing.md, padding: spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  sectionTitle: {
    marginTop: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
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
  iconTile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  rowQuestion: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  rowTime: { alignSelf: 'flex-start', fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
});
