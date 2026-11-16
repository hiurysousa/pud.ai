import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useUserData } from '@/contexts/user-data-context';
import { ACHIEVEMENT_DETAILS, CONSISTENCY_BADGE, getLevel, getLevelProgress, XP_PER_LEVEL } from '@/lib/user-types';
import { Feather } from '@expo/vector-icons';

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
  const levelProgress = getLevelProgress(xp);

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

        <View style={styles.levelSection}>
          <View style={styles.levelHeader}>
            <Text style={styles.sectionTitle}>Progresso do nível {level}</Text>
            <Text style={styles.levelXp}>{levelProgress.currentLevelXp}/{XP_PER_LEVEL} XP</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${levelProgress.percent}%` }]} />
          </View>
          <Text style={styles.levelHint}>Faltam {levelProgress.xpToNextLevel} XP para o nível {level + 1}.</Text>
        </View>

        <View style={styles.badgeSection}>
          <Text style={styles.sectionTitle}>Conquistas</Text>
          {badges.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhuma conquista ainda. Elas aparecem aqui depois das suas primeiras sessões de
              estudo.
            </Text>
          ) : (
            badges.map((badge) => {
              const achievement = ACHIEVEMENT_DETAILS[badge];
              const isConsistencyBadge = badge === CONSISTENCY_BADGE;

              return (
                <View key={badge} style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <Feather name={isConsistencyBadge ? 'award' : 'star'} size={22} color={COLORS.accent} />
                  </View>
                  <View style={styles.badgeCopy}>
                    <Text style={styles.badgeTitle}>{achievement?.title ?? badge}</Text>
                    {achievement && <Text style={styles.badgeDescription}>{achievement.description}</Text>}
                  </View>
                </View>
              );
            })
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
  levelSection: { marginBottom: 28 },
  levelHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  levelXp: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 12 },
  progressTrack: { backgroundColor: COLORS.border, borderRadius: 5, height: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: COLORS.primary, borderRadius: 5, height: '100%' },
  levelHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8 },
  badgeSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  badge: {
    alignItems: 'center',
    backgroundColor: '#FFF7E6',
    borderColor: '#FCD34D',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  badgeIcon: { alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 20, height: 40, justifyContent: 'center', marginRight: 12, width: 40 },
  badgeCopy: { flex: 1 },
  badgeTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  badgeDescription: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.textSecondary, fontWeight: '600' },
});
