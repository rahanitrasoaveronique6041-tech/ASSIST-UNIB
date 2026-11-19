import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { colors, fonts, radius, spacing } from '../theme';
import type { Message } from '../types';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../services/chatApi';

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
  const { text, bullets, note, action, examples, source, source_url, support_question, entities, verified, warning, time } = message;
  const { session } = useAuth();
  const [rated, setRated] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [supportError, setSupportError] = useState(false);

  const rate = async (rating: number) => {
    if (!session || !message.message_id || rated) return;
    try {
      await apiRequest('/api/feedback', session.access_token, {
        method: 'POST',
        body: JSON.stringify({ message_id: message.message_id, rating }),
      });
      setRated(true);
      setRatingError(false);
    } catch {
      setRatingError(true);
    }
  };

  const sendToAdministration = async () => {
    if (!session || !support_question || supportSent) return;
    try {
      await apiRequest('/api/contact', session.access_token, {
        method: 'POST',
        body: JSON.stringify({ question: support_question }),
      });
      setSupportSent(true);
      setSupportError(false);
    } catch {
      setSupportError(true);
    }
  };

  return (
    <View style={styles.assistantRow}>
      <Avatar size={28} />
      <View style={styles.assistantBubble}>
        <Text style={styles.assistantText}>{text}</Text>

        {verified === false && warning && (
          <View style={styles.unverifiedWarning}>
            <Ionicons name="warning-outline" size={16} color="#B42318" />
            <Text style={styles.unverifiedWarningText}>{warning}</Text>
          </View>
        )}

        {bullets?.map(({ label, value }) => (
          <Text key={label} style={styles.assistantText}>
            {'•  '}
            <Text style={styles.bold}>{label}</Text> : {value}
          </Text>
        ))}

        {note && <Text style={styles.note}>{note}</Text>}

        {entities && Object.keys(entities).length > 0 && (
          <Text style={styles.entityText}>
            Détecté : {Object.entries(entities).map(([label, value]) => `${label} : ${value}`).join(' · ')}
          </Text>
        )}

        {source && (
          <Pressable disabled={!source_url} onPress={() => source_url && Linking.openURL(source_url)}>
            <Text style={[styles.source, source_url && styles.sourceLink]}>Source : {source}</Text>
          </Pressable>
        )}

        {message.message_id && (
          <View style={styles.feedback}>
            {rated ? <Text style={styles.feedbackDone}>Merci pour votre avis.</Text> : (
              <>
                <Text style={styles.feedbackLabel}>Cette réponse vous a-t-elle aidé ?</Text>
                <View style={styles.rating}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable key={value} accessibilityLabel={`Noter ${value} sur 5`} onPress={() => rate(value)} hitSlop={6}>
                      <Ionicons name="star-outline" size={19} color={colors.primary} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {ratingError && <Text style={styles.ratingError}>Envoi de l’avis impossible.</Text>}
          </View>
        )}

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

        {support_question && (
          <View style={styles.support}>
            {supportSent ? (
              <Text style={styles.feedbackDone}>Question transmise à l’administration.</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => { void sendToAdministration(); }}
                style={styles.supportButton}
              >
                <Ionicons name="mail-outline" size={16} color={colors.primary} />
                <Text style={styles.supportLabel}>Transmettre cette question à l’administration</Text>
              </Pressable>
            )}
            {supportError && <Text style={styles.ratingError}>Envoi impossible. Vérifiez votre connexion.</Text>}
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
  unverifiedWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.sm, backgroundColor: '#FFF4E5', borderRadius: radius.sm },
  unverifiedWarningText: { flex: 1, fontFamily: fonts.medium, fontSize: 10, lineHeight: 15, color: '#7A2E0E' },
  bold: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.text },
  entityText: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 15, color: colors.textSecondary },
  source: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  sourceLink: { color: colors.primary, textDecorationLine: 'underline' },
  feedback: { gap: 5, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  feedbackLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary },
  feedbackDone: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary },
  rating: { flexDirection: 'row', gap: spacing.sm },
  ratingError: { fontFamily: fonts.regular, fontSize: 10, color: '#B42318' },
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
  support: { gap: spacing.xs, paddingTop: spacing.xs },
  supportButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  supportLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
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
