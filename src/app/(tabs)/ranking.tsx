import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useUserData } from '@/contexts/user-data-context';

export default function RankingScreen() {
  const { user } = useAuth();
  const { ranking, rankingLoading, rankingError, retryRanking } = useUserData();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ranking</Text>
        <Text style={styles.subtitle}>O XP sobe conforme você estuda. Contas novas começam em 0.</Text>

        {rankingError ? (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Text style={styles.emptyTitle}>Não foi possível carregar o Ranking</Text>
            <Text style={styles.emptyText}>{rankingError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryRanking}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {rankingLoading && ranking.length === 0 ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Sincronizando Ranking...</Text>
          </View>
        ) : rankingError && ranking.length === 0 ? null : ranking.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Ninguém no ranking ainda</Text>
            <Text style={styles.emptyText}>
              Seu perfil entra na lista automaticamente. Estude para ganhar XP e subir de posição.
            </Text>
          </View>
        ) : (
          ranking.map((item, index) => (
            <View
              key={item.id}
              style={[styles.card, item.id === user?.uid && styles.cardHighlight]}
            >
              <Text style={styles.position}>#{index + 1}</Text>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.id === user?.uid ? 'Você' : item.displayName}
                </Text>
                <Text style={styles.xp}>{item.xp} XP</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  statusCard: {
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  errorCard: { alignItems: 'flex-start' },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 10 },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 14,
    padding: 12,
  },
  retryButtonText: { color: COLORS.background, fontSize: 14, fontWeight: 'bold' },
  emptyCard: {
    backgroundColor: COLORS.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardHighlight: { borderColor: COLORS.primary, backgroundColor: COLORS.lightGreen },
  position: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent, width: 40 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  xp: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
});
