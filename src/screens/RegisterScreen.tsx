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
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = () => {
    const nomeDigitado = name.trim();
    const emailDigitado = email.trim().toLowerCase();
    const senhaDigitada = password.trim();
    const confirmacaoDigitada = confirmPassword.trim();

    if (!nomeDigitado || !emailDigitado || !senhaDigitada || !confirmacaoDigitada) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos para criar sua conta.');
      return;
    }

    if (senhaDigitada !== confirmacaoDigitada) {
      Alert.alert('Senhas diferentes', 'A confirmação de senha deve ser igual à senha informada.');
      return;
    }

    if (senhaDigitada.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    Alert.alert(
      'Conta criada!',
      'Seu cadastro foi registrado com sucesso. Faça login para continuar.',
      [{ text: 'Ir para login', onPress: () => router.replace('/login') }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Text style={styles.logoPUD}>PUD</Text>
            <Text style={styles.logoAI}>.AI</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>
              Cadastre-se para começar a estudar com quizzes gerados por IA.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Lucas Silva"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>E-mail acadêmico</Text>
            <TextInput
              style={styles.input}
              placeholder="lucas.silva@aluno.ifce.edu.br"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Senha</Text>
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

            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
              <Text style={styles.primaryButtonText}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.linkText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  inner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backButton: { marginBottom: 16, alignSelf: 'flex-start' },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoPUD: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  logoAI: { fontSize: 28, fontWeight: '900', color: COLORS.accent, letterSpacing: -1 },
  textContainer: { marginBottom: 24 },
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
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonText: { color: COLORS.background, fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  linkText: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
});
