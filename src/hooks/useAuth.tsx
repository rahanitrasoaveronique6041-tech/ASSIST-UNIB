import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { API_URL, apiRequest } from '../services/chatApi';

export interface UserProfile {
  id: string;
  email?: string;
  matricule?: string | null;
  role: 'student' | 'admin' | 'super_admin';
  created_at?: string;
  filiere?: string | null;
  niveau?: string | null;
}

export interface ProfileUpdate {
  filiere: string | null;
  niveau: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, matricule?: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (activeSession: Session | null) => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
      });
      if (!response.ok) throw new Error('Profil indisponible. Vérifiez la configuration du backend.');
      const nextProfile = await response.json() as UserProfile;
      if (nextProfile.id !== activeSession.user.id) {
        throw new Error('Le profil chargé ne correspond pas à la session active.');
      }
      setProfile(nextProfile);
      setError(null);
    } catch (cause) {
      setProfile(null);
      setError(
        cause instanceof TypeError && cause.message.toLowerCase().includes('fetch')
          ? 'Le téléphone ne parvient pas à joindre le backend. Vérifiez le même Wi-Fi et l’adresse EXPO_PUBLIC_API_URL.'
          : cause instanceof Error ? cause.message : 'Impossible de charger le profil.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await refreshProfile(data.session);
      if (active) setLoading(false);
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : 'Impossible de restaurer la session.');
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }
      setProfile(null);
      setLoading(true);
      queueMicrotask(() => { void refreshProfile(nextSession); });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
  };

  const signUp = async (email: string, password: string, matricule?: string) => {
    setError(null);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { matricule: matricule?.trim() || null } },
    });
    if (authError) throw authError;
  };

  const requestPasswordReset = async (email: string) => {
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email);
    if (authError) throw authError;
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!session) throw new Error('Connexion requise pour modifier le profil.');
    const nextProfile = await apiRequest<UserProfile>('/api/me', session.access_token, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setProfile(nextProfile);
  };

  const signOut = async () => {
    const { error: authError } = await supabase.auth.signOut();
    if (authError) throw authError;
  };

  return (
    <AuthContext.Provider value={{
      session, profile, loading, configured: isSupabaseConfigured, error,
      signIn, signUp, requestPasswordReset, signOut, refreshProfile, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
