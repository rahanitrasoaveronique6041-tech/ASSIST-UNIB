import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { colors, fonts, radius, spacing } from '../theme';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onSuggestionPress: (label: string) => void;
}

export function MessageBubble({ message, onSuggestionPress }: MessageBubbleProps) {
  return message.sender === 'user' ? (
    <UserBubble message={message} />
  ) : (
    <AssistantBubble message={message} onSuggestionPress={onSuggestionPress} />
  );
}

function UserBubble({ message }: { message: Message }) {
  return (
    <View style={styles.userWrapper}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{message.text}</Text>
      </View>
      <View style={styles.userMeta}>
        <Text style={styles.time}>{message.time}</Text>
        <Ionicons name="checkmark-done" size={14} color={colors.secondary} />
      </View>
    </View>
  );
}

function AssistantBubble({ message, onSuggestionPress }: MessageBubbleProps) {
  const { text, bullets, note, action, examples, time } = message;

  return (
    <View style={styles.assistantRow}>
      <Avatar size={28} />
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantText}>{text}</Text>

        {bullets?.map(({ label, value }) => (
          <Text key={label} style={styles.assistantText}>
            {'•  '}
            <Text style={styles.bold}>{label}</Text> : {value}
          </Text>
        ))}

        {note && <Text style={styles.note}>{note}</Text>}

        {action && (
          <Pressable style={styles.action}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.actionLabel}>{action}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        )}

        {examples && (
          <View style={styles.examples}>
            <Text style={styles.bold}>Essayez par exemple :</Text>
            {examples.map(({ label, icon }) => (
              <Pressable
                key={label}
                style={styles.example}
                onPress={() => onSuggestionPress(label)}
              >
                <Ionicons name={icon} size={16} color={colors.primary} />
                <Text style={styles.exampleLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userWrapper: { alignSelf: 'flex-end', maxWidth: '80%', alignItems: 'flex-end', gap: 4 },
  userBubble: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    borderBottomRightRadius: 4,
  },
  userText: { fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, maxWidth: '90%' },
  assistantBubble: {
    flexShrink: 1,
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderTopLeftRadius: 4,
  },
  assistantText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.text },
  bold: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.text },
  time: { alignSelf: 'flex-end', fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  actionLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.primary },

  examples: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
  },
  exampleLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
});
