import type { IconName } from '../types';

export interface HistoryItem {
  id: string;
  title: string;
  question: string;
  time: string;
  icon: IconName;
}

export interface HistorySection {
  title: string;
  data: HistoryItem[];
}

export const HISTORY_SECTIONS: HistorySection[] = [
  {
    title: "Aujourd'hui",
    data: [
      { id: '1', title: 'Dates des examens', question: 'Quand sont les examens ?', time: '09:45', icon: 'calendar-outline' },
      { id: '2', title: "Procédure d'inscription", question: 'Comment faire mon inscription ?', time: '09:20', icon: 'document-text-outline' },
      { id: '3', title: 'Emploi du temps', question: 'Où trouver mon emploi du temps ?', time: '08:50', icon: 'time-outline' },
    ],
  },
  {
    title: 'Hier',
    data: [
      { id: '4', title: 'Orientation académique', question: 'Quelles sont les filières disponibles ?', time: '16:30', icon: 'compass-outline' },
      { id: '5', title: 'Horaires bibliothèque', question: 'Quels sont les horaires de la bibliothèque ?', time: '14:10', icon: 'book-outline' },
    ],
  },
];
