import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';

export default function PerfilScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => router.replace('/login') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Seu Perfil</Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>LS</Text>
      </View>

      <Text style={styles.name}>Lucas Silva</Text>
      <Text style={styles.email}>lucas.silva@aluno.ifce.edu.br</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Nível 5</Text>
          <Text style={styles.statLabel}>Nível atual</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1.920 XP</Text>
          <Text style={styles.statLabel}>Experiência</Text>
        </View>
      </View>

      <View style={styles.badgeSection}>
        <Text style={styles.sectionTitle}>Conquistas</Text>
        <Text style={styles.badge}>Primeiro Quiz</Text>
        <Text style={styles.badge}>Sequência de 3 dias</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  badgeSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  badge: {
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBackground,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.textSecondary, fontWeight: '600' },
});
