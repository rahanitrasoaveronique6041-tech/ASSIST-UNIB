import { useCallback, useState } from 'react';
import { GREETING, createMessage, getBotReply } from '../data/chatbot';
import type { Message } from '../types';

const REPLY_DELAY_MS = 600;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(() => [
    createMessage('assistant', GREETING),
  ]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;

    setMessages((prev) => [...prev, createMessage('user', { text })]);
    setTimeout(() => {
      setMessages((prev) => [...prev, createMessage('assistant', getBotReply(text))]);
    }, REPLY_DELAY_MS);
  }, []);

  return { messages, send };
}
