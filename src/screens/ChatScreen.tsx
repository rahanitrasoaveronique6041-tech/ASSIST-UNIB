import { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { ChatInput } from '../components/ChatInput';
import { MessageBubble } from '../components/MessageBubble';
import { QuickReplies } from '../components/QuickReplies';
import { ScreenHeader } from '../components/ScreenHeader';
import { FOLLOW_UP_TOPICS, QUICK_TOPICS } from '../data/chatbot';
import { useChat } from '../hooks/useChat';
import { useExitToWelcome } from '../navigation/useExitToWelcome';
import { colors, spacing } from '../theme';
import type { Message } from '../types';

export function ChatScreen() {
  const exit = useExitToWelcome();
  const { messages, send } = useChat();
  const listRef = useRef<FlatList<Message>>(null);

  const lastMessage = messages[messages.length - 1];
  const isFirstMessage = messages.length === 1;
  const showQuickReplies = lastMessage.sender === 'assistant' && !lastMessage.examples;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScreenHeader title="Assistant Étudiant" variant="chat" onBack={exit} />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <MessageBubble message={item} onSuggestionPress={send} />}
        ListFooterComponent={
          showQuickReplies ? (
            <View style={styles.footer}>
              <QuickReplies
                title={isFirstMessage ? 'Suggestions rapides :' : 'Vous pouvez aussi consulter :'}
                topics={isFirstMessage ? QUICK_TOPICS : FOLLOW_UP_TOPICS}
                onSelect={send}
              />
            </View>
          ) : null
        }
      />

      <ChatInput onSend={send} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  list: { gap: spacing.lg, padding: spacing.lg },
  footer: { marginTop: spacing.sm },
});
