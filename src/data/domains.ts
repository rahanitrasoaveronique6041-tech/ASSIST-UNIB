import type { IconName } from '../types';

export interface Domain {
  title: string;
  description: string;
  icon: IconName;
  color: string;
  tint: string;
}

export const DOMAINS: Domain[] = [
  { title: 'Inscription', description: 'Procédures, pièces, délais...', icon: 'document-text', color: '#10B981', tint: '#D1FAE5' },
  { title: 'Examens', description: 'Dates, convocations, résultats...', icon: 'calendar', color: '#F97316', tint: '#FFEDD5' },
  { title: 'Planning', description: 'Emploi du temps, salles...', icon: 'book', color: '#2563EB', tint: '#DBEAFE' },
  { title: 'Orientation académique', description: 'Filières, conseils, débouchés...', icon: 'compass', color: '#8B5CF6', tint: '#EDE9FE' },
];
