import { Platform } from 'react-native';
import type { BotReply } from '../types';

const LOCAL_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? LOCAL_API_URL;

export async function apiRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `API indisponible (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface ChatReply extends BotReply {
  conversation_id: string;
  message_id: string;
}

export async function requestBotReply(
  message: string,
  token: string,
  conversationId?: string,
): Promise<ChatReply> {
  return apiRequest<ChatReply>('/api/chat', token, {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
}
