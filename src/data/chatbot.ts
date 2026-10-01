import type { BotReply, Message, Sender, Suggestion } from '../types';
import { normalize } from '../utils/text';

export const GREETING: BotReply = {
  text: 'Bonjour !\nJe suis votre assistant étudiant.\nComment puis-je vous aider ?',
};

export const QUICK_TOPICS = [
  'Inscription',
  'Planning',
  'Orientation',
  'Bibliothèque',
  'Autre',
] as const;

export const FOLLOW_UP_TOPICS = QUICK_TOPICS.slice(0, 3);

const EXAMPLES: Suggestion[] = [
  { label: 'Dates des examens', icon: 'calendar-outline' },
  { label: "Procédure d'inscription", icon: 'document-text-outline' },
  { label: 'Emploi du temps', icon: 'time-outline' },
  { label: 'Orientation académique', icon: 'compass-outline' },
];

const FALLBACK: BotReply = {
  text: "Je suis désolé, je n'ai pas bien compris votre demande.\nPouvez-vous reformuler votre question ?",
  examples: EXAMPLES,
};

interface Intent {
  keywords: string[];
  reply: BotReply;
}

// Contenu à adapter : ce sont des réponses d'exemple.
const INTENTS: Intent[] = [
  {
    keywords: ['examen'],
    reply: {
      text: 'Les dates des examens pour le semestre en cours sont :',
      bullets: [
        { label: 'Session principale', value: 'du 12 mai au 30 mai' },
        { label: 'Session de rattrapage', value: 'du 16 juin au 28 juin 2025' },
        { label: 'Résultats', value: 'à partir du 5 juillet 2025' },
      ],
      note: "Pour plus d'informations, consultez le calendrier sur le site de l'université.",
      action: 'Consulter le calendrier académique',
    },
  },
  {
    keywords: ['inscription'],
    reply: {
      text: "Pour vous inscrire, connectez-vous au portail de l'université et déposez les pièces demandées avant la date limite.",
    },
  },
  {
    keywords: ['planning', 'emploi du temps'],
    reply: {
      text: 'Votre emploi du temps est disponible dans votre espace étudiant, rubrique « Planning ».',
    },
  },
  {
    keywords: ['orientation', 'filiere'],
    reply: {
      text: "Le service d'orientation vous renseigne sur les filières, les débouchés et vous accompagne dans votre projet.",
    },
  },
  {
    keywords: ['bibliotheque'],
    reply: {
      text: 'La bibliothèque est ouverte du lundi au samedi, de 8h à 18h.',
    },
  },
];

export function getBotReply(input: string): BotReply {
  const query = normalize(input);
  const intent = INTENTS.find(({ keywords }) =>
    keywords.some((keyword) => query.includes(keyword)),
  );
  return intent?.reply ?? FALLBACK;
}

const formatTime = (): string =>
  new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

let nextId = 0;

export function createMessage(sender: Sender, content: BotReply): Message {
  nextId += 1;
  return { id: String(nextId), sender, time: formatTime(), ...content };
}
