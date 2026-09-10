import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { isValidEmail } from '@/lib/auth-errors';
import { getGoogleWebClientId } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const googleWebClientId = getGoogleWebClientId();

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId,
    webClientId: googleWebClientId,
    iosClientId: googleWebClientId,
    androidClientId: googleWebClientId,
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      if (googleResponse?.type === 'error') {
        Alert.alert('Falha no Google', googleResponse.error?.message ?? 'Não foi possível entrar com Google.');
      }
      return;
    }

    const idToken = googleResponse.params.id_token;
    if (!idToken) {
      Alert.alert('Falha no Google', 'O Google não retornou o token de autenticação.');
      return;
    }

    setSubmitting(true);
    signInWithGoogleIdToken(idToken)
      .then(() => router.replace('/home'))
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Não foi possível entrar com Google.';
        Alert.alert('Falha no Google', message);
      })
      .finally(() => setSubmitting(false));
  }, [googleResponse, router, signInWithGoogleIdToken]);

  const handleLogin = async () => {
    const emailDigitado = email.trim().toLowerCase();
    const senhaDigitada = password.trim();

    if (!emailDigitado || !senhaDigitada) {
      Alert.alert('Campos obrigatórios', 'Preencha o e-mail e a senha para continuar.');
      return;
    }

    if (!isValidEmail(emailDigitado)) {
      Alert.alert('E-mail inválido', 'Use um e-mail completo, como nome@gmail.com.');
      return;
    }

    try {
      setSubmitting(true);
      await signIn(emailDigitado, senhaDigitada);
      router.replace('/home');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível entrar.';
      Alert.alert('Falha no login', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSubmitting(true);

      if (Platform.OS === 'web') {
        await signInWithGoogle();
        router.replace('/home');
        return;
      }

      if (!googleWebClientId || !googleRequest) {
        Alert.alert(
          'Google não configurado',
          'No Firebase Console, ative Authentication > Google e copie o "Web client ID" para EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no arquivo .env. Depois reinicie com npx expo start -c.',
        );
        return;
      }

      await promptGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível entrar com Google.';
      Alert.alert('Falha no Google', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoPUD}>PUD</Text>
          <Text style={styles.logoAI}>.AI</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitle}>
            Estude seu plano de ensino com inteligência artificial.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>E-mail acadêmico</Text>
          <TextInput
            style={styles.input}
            placeholder="lucas.silva@aluno.ifce.edu.br"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Sua senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OU CONTINUAR COM</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={[styles.socialButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleGoogleLogin}
            disabled={submitting}
          >
            <FontAwesome name="google" size={20} color={COLORS.textPrimary} />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => Alert.alert('Em breve', 'Login com Apple em desenvolvimento.')}
          >
            <FontAwesome name="apple" size={20} color={COLORS.textPrimary} />
            <Text style={styles.socialButtonText}>Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem conta? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.createAccountText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40, justifyContent: 'center' },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoPUD: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  logoAI: { fontSize: 28, fontWeight: '900', color: COLORS.accent, letterSpacing: -1 },
  textContainer: { marginBottom: 32 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 22 },
  formContainer: { marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
  },
  passwordInput: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 24 },
  forgotPasswordText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: COLORS.background, fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 16, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  socialButtonText: { marginLeft: 12, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, marginBottom: 20 },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  createAccountText: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
});
