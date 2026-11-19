import type { BotReply, Message, Sender } from '../types';

export const GREETING: BotReply = {
  text: 'Bonjour !\nJe suis votre assistant étudiant.\nComment puis-je vous aider ?',
};

export const QUICK_TOPICS = [
  'Inscription',
  'Réinscription',
  'Pièces à fournir',
  'Certificat de scolarité',
  'Relevé de notes',
  'Calendrier',
  'Frais',
  'Contact et horaires',
  'Autre',
] as const;

export const FOLLOW_UP_TOPICS = QUICK_TOPICS.slice(0, 3);

const formatTime = (): string =>
  new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

let nextId = 0;

export function createMessage(sender: Sender, content: BotReply): Message {
  nextId += 1;
  return { id: String(nextId), sender, time: formatTime(), ...content };
}
