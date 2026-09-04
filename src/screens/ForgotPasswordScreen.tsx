import React, { useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSendReset = async () => {
    const emailDigitado = email.trim().toLowerCase();

    if (!emailDigitado) {
      Alert.alert('E-mail obrigatório', 'Informe seu e-mail acadêmico para recuperar a senha.');
      return;
    }

    try {
      setSubmitting(true);
      await resetPassword(emailDigitado);
      Alert.alert(
        'Link enviado',
        'Se existir uma conta com este e-mail, você receberá instruções para redefinir a senha.',
        [{ text: 'OK', onPress: () => router.replace('/login') }],
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível enviar o link de recuperação.';
      Alert.alert('Falha na recuperação', message);
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Esqueceu a senha?</Text>
          <Text style={styles.subtitle}>
            Informe seu e-mail acadêmico e enviaremos um link para redefinir sua senha.
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

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleSendReset}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Enviando...' : 'Enviar link de recuperação'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Lembrou a senha? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>Voltar ao login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start' },
  textContainer: { marginBottom: 32 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 22 },
  formContainer: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: COLORS.background, fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  linkText: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
});
