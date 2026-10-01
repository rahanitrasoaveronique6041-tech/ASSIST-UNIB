import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../theme';

interface ChatInputProps {
  onSend: (text: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    onSend(value);
    setValue('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Ionicons name="attach" size={20} color={colors.primary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          onSubmitEditing={submit}
          returnKeyType="send"
          placeholder="Écrivez votre question..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <Pressable style={styles.send} onPress={submit}>
        <Ionicons name="paper-plane" size={16} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  input: { flex: 1, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  send: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
});
