import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../services/chatApi';
import { checkSupabaseConnection } from '../services/supabase';
import { colors, fonts, radius, spacing } from '../theme';

type Mode = 'login' | 'signup' | 'reset';

export function AuthScreen() {
  const { configured, signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setError('');
    setNotice('');
    if (!configured) {
      setError('Configurez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans le fichier .env.');
      return;
    }
    if (!email.trim() || (mode !== 'reset' && password.length < 8)) {
      setError(mode === 'reset'
        ? 'Saisissez votre adresse e-mail.'
        : 'Saisissez une adresse e-mail et un mot de passe d’au moins 8 caractères.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'reset') {
        await requestPasswordReset(email.trim());
        setNotice('Si cette adresse possède un compte, un e-mail de réinitialisation a été envoyé.');
      } else if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, matricule);
        setNotice('Compte créé. Confirmez votre adresse e-mail si Supabase le demande, puis connectez-vous.');
        setMode('login');
      }
    } catch (cause) {
      setError(
        cause instanceof TypeError && cause.message.toLowerCase().includes('fetch')
          ? 'Le téléphone ne parvient pas à joindre Supabase Auth. Vérifiez son accès Internet, puis réessayez.'
          : cause instanceof Error ? cause.message : 'La connexion a échoué.',
      );
    } finally {
      setBusy(false);
    }
  };

  const checkConnections = async () => {
    setChecking(true);
    setDiagnostic('Test en cours depuis cet appareil…');
    const [apiResult, supabaseResult] = await Promise.allSettled([
      fetch(`${API_URL}/health`).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }),
      checkSupabaseConnection(),
    ]);
    const apiStatus = apiResult.status === 'fulfilled' ? 'OK' : 'ÉCHEC';
    const supabaseStatus = supabaseResult.status === 'fulfilled' ? 'OK' : 'ÉCHEC';
    setDiagnostic(`Backend : ${apiStatus} · Supabase Auth : ${supabaseStatus}`);
    setChecking(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#123C35', '#1A6255', '#B0D9BC']} style={styles.hero}>
        <Text style={styles.kicker}>CAMPUS · SERVICES</Text>
        <Text style={styles.title}>Assistant{ '\n' }Étudiant</Text>
        <Text style={styles.subtitle}>Les démarches universitaires, avec leurs sources.</Text>
      </LinearGradient>
      <View style={styles.form}>
        <View style={styles.switcher}>
          <Pressable onPress={() => setMode('login')} style={[styles.mode, (mode === 'login' || mode === 'reset') && styles.modeActive]}>
            <Text style={[styles.modeText, (mode === 'login' || mode === 'reset') && styles.modeTextActive]}>
              {mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setMode(mode === 'reset' ? 'login' : 'signup')} style={[styles.mode, mode === 'signup' && styles.modeActive]}>
            <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>Créer un compte</Text>
          </Pressable>
        </View>
        <Text style={styles.label}>Adresse e-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="nom@universite.edu"
          placeholderTextColor={colors.textSecondary}
        />
        {mode === 'signup' && (
          <>
            <Text style={styles.label}>Matricule (facultatif)</Text>
            <TextInput
              style={styles.input}
              value={matricule}
              onChangeText={setMatricule}
              autoCapitalize="characters"
              placeholder="Votre matricule universitaire"
              placeholderTextColor={colors.textSecondary}
            />
          </>
        )}
        {mode !== 'reset' && (
          <>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="8 caractères minimum"
              placeholderTextColor={colors.textSecondary}
            />
          </>
        )}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <Pressable disabled={busy} onPress={submit} style={[styles.submit, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>
            {mode === 'reset' ? 'Envoyer le lien' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </Text>}
        </Pressable>
        {mode === 'login' && (
          <Pressable onPress={() => { setError(''); setNotice(''); setMode('reset'); }}>
            <Text style={styles.diagnosticText}>Mot de passe oublié ?</Text>
          </Pressable>
        )}
        <Pressable disabled={checking} onPress={() => { void checkConnections(); }} style={styles.diagnosticButton}>
          {checking ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.diagnosticText}>Tester la connexion</Text>}
        </Pressable>
        {!!diagnostic && <Text accessibilityLiveRegion="polite" style={styles.diagnostic}>{diagnostic}</Text>}
        <Text style={styles.footnote}>Votre compte donne accès à vos conversations enregistrées.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  hero: { minHeight: '43%', justifyContent: 'flex-end', padding: spacing.xl, paddingBottom: 48 },
  kicker: { fontFamily: fonts.semibold, fontSize: 11, color: '#D8F0DC', marginBottom: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 42, lineHeight: 46, color: colors.white },
  subtitle: { maxWidth: 300, marginTop: spacing.md, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: '#F0F7F0' },
  form: { flex: 1, padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm },
  switcher: { flexDirection: 'row', padding: 4, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm },
  mode: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  modeActive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  modeText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  modeTextActive: { color: colors.primary },
  label: { marginTop: spacing.sm, fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  error: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: '#B42318' },
  notice: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.primary },
  submit: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.sm },
  disabled: { opacity: 0.65 },
  submitText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  diagnosticButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  diagnosticText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  diagnostic: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary },
  footnote: { marginTop: spacing.sm, textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
});
