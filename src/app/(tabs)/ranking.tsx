import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

import { COLORS } from '@/constants/colors';

export default function RankingScreen() {
  const ranking = [
    { posicao: 1, nome: 'Ana Costa', xp: 2450 },
    { posicao: 2, nome: 'Lucas Silva', xp: 2180 },
    { posicao: 3, nome: 'Você', xp: 1920 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Top 10 da Turma</Text>
        <Text style={styles.subtitle}>Ranking semanal de XP entre os estudantes.</Text>

        {ranking.map((item) => (
          <View
            key={item.posicao}
            style={[styles.card, item.nome === 'Você' && styles.cardHighlight]}
          >
            <Text style={styles.position}>#{item.posicao}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{item.nome}</Text>
              <Text style={styles.xp}>{item.xp} XP</Text>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
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
