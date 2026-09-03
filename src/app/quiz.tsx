import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';

export default function QuizScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Pergunta gerada pela IA</Text>
        <Text style={styles.question}>
          Qual é a definição formal de limite de uma função f(x) quando x tende a a?
        </Text>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>
            Para todo ε {'>'} 0, existe δ {'>'} 0 tal que...
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>O valor da função no ponto a</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionText}>A derivada de f em a</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.abandonButton} onPress={() => router.back()}>
          <Text style={styles.abandonText}>Abandonar Quiz</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backButton: { padding: 24, paddingBottom: 0 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  question: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 32 },
  option: {
    padding: 16,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  optionText: { fontSize: 16, color: COLORS.textPrimary },
  abandonButton: { marginTop: 24, alignItems: 'center', padding: 12 },
  abandonText: { color: COLORS.textSecondary, fontWeight: '600' },
});
