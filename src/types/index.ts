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
}

export interface Message extends BotReply {
  id: string;
  sender: Sender;
  time: string;
}
