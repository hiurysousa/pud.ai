import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useUserData } from '@/contexts/user-data-context';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { disciplinas, profile } = useUserData();
  const firstName = (profile?.displayName ?? user?.displayName ?? 'Estudante').split(' ')[0];
  const nextDisciplina = disciplinas[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Olá, {firstName}!</Text>

      {nextDisciplina ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{nextDisciplina.nome}</Text>
          <Text style={styles.cardSubtitle}>Progresso: {nextDisciplina.progresso}%</Text>
          <Text style={styles.cardText}>Continue de onde parou quando o quiz estiver disponível.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push({ pathname: '/quiz', params: { disciplina: nextDisciplina.nome } })}
          >
            <Text style={styles.buttonText}>Estudar agora</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comece do zero</Text>
          <Text style={styles.cardText}>
            Você ainda não tem disciplinas. Adicione a primeira matéria do semestre para acompanhar
            o progresso.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/disciplinas')}>
            <Text style={styles.buttonText}>Adicionar disciplina</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/disciplinas')}>
          <Text style={styles.actionText}>Minhas Disciplinas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/ranking')}>
          <Text style={styles.actionText}>Ver Ranking</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.inputBackground,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 5 },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  cardText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 15 },
  button: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: COLORS.background, fontWeight: 'bold' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.lightGreen,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
});
