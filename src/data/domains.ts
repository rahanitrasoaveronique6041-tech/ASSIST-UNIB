import type { IconName } from '../types';

export interface Domain {
  title: string;
  description: string;
  icon: IconName;
  color: string;
  tint: string;
}

export const DOMAINS: Domain[] = [
  { title: 'Inscription et réinscription', description: 'Procédures et échéances...', icon: 'document-text', color: '#10B981', tint: '#D1FAE5' },
  { title: 'Pièces et dossiers', description: 'Justificatifs et documents requis...', icon: 'folder-open', color: '#F97316', tint: '#FFEDD5' },
  { title: 'Certificats et relevés', description: 'Attestations et documents administratifs...', icon: 'school', color: '#2563EB', tint: '#DBEAFE' },
  { title: 'Calendrier et frais', description: 'Dates limites et informations tarifaires validées...', icon: 'calendar', color: '#8B5CF6', tint: '#EDE9FE' },
  { title: 'Contacts et horaires', description: 'Services universitaires et accueil...', icon: 'call', color: '#0891B2', tint: '#CFFAFE' },
];
