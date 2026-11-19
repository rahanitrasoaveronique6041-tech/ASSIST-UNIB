import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Sender = 'user' | 'assistant';

export interface Suggestion {
  label: string;
  icon: IconName;
}

export interface BulletItem {
  label: string;
  value: string;
}

export interface BotReply {
  text: string;
  bullets?: BulletItem[];
  note?: string;
  action?: string;
  examples?: Suggestion[];
  source?: string;
  source_url?: string;
  intent?: string;
  intent_confidence?: number;
  entities?: Record<string, string>;
  support_question?: string;
  verified?: boolean;
  warning?: string;
  conversation_id?: string;
  message_id?: string;
}

export interface Message extends BotReply {
  id: string;
  sender: Sender;
  time: string;
}
