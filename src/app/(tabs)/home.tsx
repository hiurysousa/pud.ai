import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] ?? 'Estudante';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Olá, {firstName}!</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Progresso do PUD: Cálculo I</Text>
        <Text style={styles.cardSubtitle}>Próxima meta: Limites e Derivadas</Text>
        <Text style={styles.cardText}>Você está indo super bem! Continue assim.</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/quiz')}>
          <Text style={styles.buttonText}>Continuar Estudando</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/disciplinas')}
        >
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
