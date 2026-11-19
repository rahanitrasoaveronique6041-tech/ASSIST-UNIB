import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from './Avatar';
import { colors, fonts, radius, spacing } from '../theme';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  variant?: 'chat' | 'page';
}

export function ScreenHeader({ title, onBack, variant = 'page' }: ScreenHeaderProps) {
  const { top } = useSafeAreaInsets();
  const isChat = variant === 'chat';

  return (
    <View style={[styles.container, { paddingTop: top + spacing.md }]}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={colors.white} />
      </Pressable>

      {isChat && <Avatar size={40} />}

      <View style={styles.titleBlock}>
        <Text style={isChat ? styles.chatTitle : styles.pageTitle}>{title}</Text>
        {isChat && (
          <View style={styles.status}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Réponses sourcées</Text>
          </View>
        )}
      </View>

      {isChat && <Ionicons name="ellipsis-vertical" size={20} color={colors.white} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  titleBlock: { flex: 1 },
  chatTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  pageTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.white },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  statusText: { fontFamily: fonts.regular, fontSize: 12, color: colors.white },
});
