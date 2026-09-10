import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useUserData } from '@/contexts/user-data-context';
import { getLevel } from '@/lib/user-types';

function getInitials(name?: string | null) {
  if (!name) {
    return 'EU';
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, logOut } = useAuth();
  const { profile } = useUserData();
  const displayName = profile?.displayName ?? user?.displayName ?? 'Estudante';
  const email = profile?.email ?? user?.email ?? '';
  const xp = profile?.xp ?? 0;
  const badges = profile?.badges ?? [];
  const level = getLevel(xp);

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logOut();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Seu Perfil</Text>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Nível {level}</Text>
            <Text style={styles.statLabel}>Nível atual</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{xp} XP</Text>
            <Text style={styles.statLabel}>Experiência</Text>
          </View>
        </View>

        <View style={styles.badgeSection}>
          <Text style={styles.sectionTitle}>Conquistas</Text>
          {badges.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhuma conquista ainda. Elas aparecem aqui depois das suas primeiras sessões de
              estudo.
            </Text>
          ) : (
            badges.map((badge) => (
              <Text key={badge} style={styles.badge}>
                {badge}
              </Text>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 24 },
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
  emptyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
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
