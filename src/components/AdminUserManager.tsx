import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { apiRequest } from '../services/chatApi';
import { colors, fonts, radius, spacing } from '../theme';
import type { UserProfile } from '../hooks/useAuth';

type UserRole = UserProfile['role'];

interface ManagedUser extends UserProfile {
  matricule: string | null;
  active: boolean;
}

const ROLES: UserRole[] = ['student', 'admin', 'super_admin'];
const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Étudiant',
  admin: 'Admin',
  super_admin: 'Super-admin',
};

export function AdminUserManager({
  session,
  currentUserId,
  currentRole,
}: {
  session: Session | null;
  currentUserId: string;
  currentRole: UserRole;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const rows = await apiRequest<ManagedUser[]>('/api/admin/users', session.access_token);
      setUsers(rows);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chargement des comptes impossible.');
    }
  }, [session]);

  useEffect(() => {
    const loadUsers = async () => { await load(); };
    void loadUsers();
  }, [load]);

  const setActive = async (target: ManagedUser) => {
    if (!session) return;
    setBusyUserId(target.id);
    try {
      await apiRequest(`/api/admin/users/${target.id}/status`, session.access_token, {
        method: 'PUT',
        body: JSON.stringify({ active: !target.active }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Modification du compte impossible.');
    } finally {
      setBusyUserId(null);
    }
  };

  const setRole = async (target: ManagedUser, role: UserRole) => {
    if (!session || target.role === role) return;
    setBusyUserId(target.id);
    try {
      await apiRequest(`/api/admin/users/${target.id}/role`, session.access_token, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Modification du rôle impossible.');
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteUser = (target: ManagedUser) => {
    if (!session) return;
    Alert.alert('Supprimer ce compte ?', target.email ?? target.id, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          setBusyUserId(target.id);
          void apiRequest(`/api/admin/users/${target.id}`, session.access_token, { method: 'DELETE' })
            .then(load)
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'Suppression impossible.');
            })
            .finally(() => setBusyUserId(null));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Comptes utilisateurs ({users.length})</Text>
      {users.map((managedUser) => (
        <View key={managedUser.id} style={styles.userCard}>
          <Text selectable style={styles.email}>{managedUser.email ?? managedUser.id}</Text>
          <Text style={styles.meta}>
            {ROLE_LABELS[managedUser.role]} · {managedUser.active ? 'Actif' : 'Désactivé'}
            {managedUser.matricule ? ` · ${managedUser.matricule}` : ''}
          </Text>
          {managedUser.id !== currentUserId && (
            <View style={styles.actions}>
              {managedUser.role === 'student' && (
                <Pressable
                  disabled={busyUserId === managedUser.id}
                  onPress={() => { void setActive(managedUser); }}
                  style={styles.action}
                >
                  <Text style={styles.actionText}>{managedUser.active ? 'Désactiver' : 'Activer'}</Text>
                </Pressable>
              )}
              {currentRole === 'super_admin' && (
                <>
                  {ROLES.map((role) => (
                    <Pressable
                      key={role}
                      disabled={busyUserId === managedUser.id}
                      onPress={() => { void setRole(managedUser, role); }}
                      style={[styles.action, role === managedUser.role && styles.selectedAction]}
                    >
                      <Text style={[styles.actionText, role === managedUser.role && styles.selectedText]}>
                        {ROLE_LABELS[role]}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    disabled={busyUserId === managedUser.id}
                    onPress={() => deleteUser(managedUser)}
                    style={styles.deleteAction}
                  >
                    <Text style={styles.deleteText}>Supprimer</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      ))}
      {!users.length && !error && <Text style={styles.meta}>Aucun compte disponible.</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = {
  container: { gap: spacing.sm },
  heading: { marginTop: spacing.md, fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  userCard: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  email: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  actions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.xs, marginTop: spacing.xs },
  action: { minHeight: 34, justifyContent: 'center' as const, paddingHorizontal: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm },
  actionText: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary },
  selectedAction: { backgroundColor: colors.primary },
  selectedText: { color: colors.white },
  deleteAction: { minHeight: 34, justifyContent: 'center' as const, paddingHorizontal: spacing.sm, backgroundColor: '#FEE4E2', borderRadius: radius.sm },
  deleteText: { fontFamily: fonts.medium, fontSize: 10, color: '#B42318' },
  error: { fontFamily: fonts.medium, fontSize: 12, color: '#B42318' },
};
