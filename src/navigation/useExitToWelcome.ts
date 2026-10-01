import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

/** Retourne à l'écran d'accueil depuis n'importe quel onglet. */
export function useExitToWelcome() {
  const navigation = useNavigation();
  return useCallback(() => navigation.getParent()?.goBack(), [navigation]);
}
