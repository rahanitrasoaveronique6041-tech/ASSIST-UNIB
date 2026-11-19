import { useCallback, useEffect, useRef, useState } from 'react';
import { GREETING, createMessage } from '../data/chatbot';
import { apiRequest, requestBotReply } from '../services/chatApi';
import { useAuth } from './useAuth';
import type { Message } from '../types';

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  source?: string | null;
  source_url?: string | null;
  entities?: Record<string, string>;
  intent?: string | null;
  confidence?: number | null;
}

export function useChat(initialConversationId?: string) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => [
    createMessage('assistant', GREETING),
  ]);
  const [previousConversationId, setPreviousConversationId] = useState(initialConversationId);
  const [isLoading, setIsLoading] = useState(false);
  const isSending = useRef(false);
  const conversationId = useRef(initialConversationId);

  if (previousConversationId !== initialConversationId) {
    setPreviousConversationId(initialConversationId);
    setMessages([createMessage('assistant', GREETING)]);
  }

  useEffect(() => {
    conversationId.current = initialConversationId;
    if (!initialConversationId || !session) return;
    let active = true;
    apiRequest<StoredMessage[]>(
      `/api/conversations/${initialConversationId}/messages`,
      session.access_token,
    ).then((stored) => {
      if (!active) return;
      setMessages(stored.map((item) => createMessage(item.role, {
        text: item.content,
        source: item.source ?? undefined,
        source_url: item.source_url ?? undefined,
        entities: item.entities,
        intent: item.intent ?? undefined,
        intent_confidence: item.confidence ?? undefined,
        message_id: item.role === 'assistant' ? item.id : undefined,
      })));
    }).catch(() => {
      if (active) setMessages([createMessage('assistant', { text: 'Impossible de charger cette conversation.' })]);
    });
    return () => { active = false; };
  }, [initialConversationId, session]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || isSending.current || !session) return;

    isSending.current = true;
    setMessages((prev) => [...prev, createMessage('user', { text })]);
    setIsLoading(true);
    try {
      const reply = await requestBotReply(text, session.access_token, conversationId.current);
      conversationId.current = reply.conversation_id;
      setMessages((prev) => [...prev, createMessage('assistant', {
        ...reply,
        support_question: reply.examples ? text : undefined,
      })]);
    } catch {
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', {
          text: "Je ne peux pas consulter la base documentaire pour le moment. Réessayez plus tard ou contactez le service de scolarité.",
        }),
      ]);
    } finally {
      isSending.current = false;
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => () => { isSending.current = false; }, []);

  return { messages, isLoading, send };
}
