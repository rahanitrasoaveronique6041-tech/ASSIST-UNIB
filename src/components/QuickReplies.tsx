import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

interface QuickRepliesProps {
  title: string;
  topics: readonly string[];
  onSelect: (topic: string) => void;
}

export function QuickReplies({ title, topics, onSelect }: QuickRepliesProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chips}>
        {topics.map((topic) => (
          <Pressable key={topic} style={styles.chip} onPress={() => onSelect(topic)}>
            <Text style={styles.chipLabel}>{topic}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  title: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
  },
  chipLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
});
