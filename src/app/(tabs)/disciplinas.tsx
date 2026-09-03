import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

import { COLORS } from '@/constants/colors';

export default function DisciplinasScreen() {
  const disciplinas = [
    { nome: 'Cálculo I', progresso: '45%' },
    { nome: 'Programação Mobile', progresso: '72%' },
    { nome: 'Banco de Dados', progresso: '30%' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Suas Disciplinas</Text>
      <Text style={styles.subtitle}>Acompanhe o progresso de cada matéria do semestre.</Text>

      {disciplinas.map((disciplina) => (
        <View key={disciplina.nome} style={styles.card}>
          <Text style={styles.cardTitle}>{disciplina.nome}</Text>
          <Text style={styles.cardProgress}>Progresso: {disciplina.progresso}</Text>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  card: {
    backgroundColor: COLORS.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  cardProgress: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
