import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { gerarLoteQuiz, type QuestaoQuiz } from '@/lib/quiz-api';

const LETRAS = ['A', 'B', 'C', 'D'] as const;

export default function QuizScreen() {
  const router = useRouter();
  const { disciplina } = useLocalSearchParams<{ disciplina?: string }>();
  const [questoes, setQuestoes] = useState<QuestaoQuiz[]>([]);
  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [nivel, setNivel] = useState('iniciante');
  const [iniciado, setIniciado] = useState(false);

  const carregarQuiz = useCallback(async () => {
    if (!disciplina) {
      setErro('Escolha uma disciplina antes de iniciar o quiz.');
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro(null);
      const lote = await gerarLoteQuiz(disciplina, nivel);
      setQuestoes(lote.questoes);
      setIndice(0);
      setSelecionada(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível preparar o quiz.');
    } finally {
      setCarregando(false);
    }
  }, [disciplina, nivel]);

  useEffect(() => {
    if (iniciado) carregarQuiz();
  }, [carregarQuiz, iniciado]);

  if (!iniciado) {
    return <SafeAreaView style={styles.container}><View style={styles.loadingContent}>
      <Text style={styles.loadingTitle}>Escolha o nível</Text><Text style={styles.loadingText}>{disciplina}</Text>
      <View style={styles.levels}>{['iniciante', 'intermediário', 'avançado'].map((item) => <TouchableOpacity key={item} onPress={() => setNivel(item)} style={[styles.levelButton, nivel === item && styles.levelSelected]}><Text style={styles.levelText}>{item}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setIniciado(true)}><Text style={styles.primaryButtonText}>Gerar quiz</Text></TouchableOpacity>
    </View></SafeAreaView>;
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIcon}>
            <Feather name="clock" size={42} color={COLORS.primary} />
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTitle}>Preparando seu quiz</Text>
          <Text style={styles.loadingText}>Gerando as 10 questões do quiz de {disciplina ?? 'sua disciplina'}.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (erro || questoes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContent}>
          <Feather name="alert-circle" size={42} color={COLORS.accent} />
          <Text style={styles.loadingTitle}>Não foi possível iniciar</Text>
          <Text style={styles.loadingText}>{erro ?? 'Nenhuma questão foi recebida.'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={carregarQuiz}>
            <Text style={styles.primaryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const questao = questoes[indice];
  const finalizado = indice === questoes.length - 1 && selecionada !== null;

  const avancar = () => {
    if (finalizado) {
      router.back();
      return;
    }
    setIndice((atual) => atual + 1);
    setSelecionada(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progress}>Questão {indice + 1} de {questoes.length}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subject}>{disciplina}</Text>
        <Text style={styles.question}>{questao.pergunta}</Text>

        <View style={styles.options}>
          {questao.alternativas.map((alternativa, alternativaIndice) => {
            const letra = LETRAS[alternativaIndice];
            const foiSelecionada = selecionada === letra;
            const correta = letra === questao.correta;
            const status = selecionada
              ? correta
                ? styles.optionCorrect
                : foiSelecionada
                  ? styles.optionWrong
                  : undefined
              : undefined;

            return (
              <TouchableOpacity
                key={letra}
                style={[styles.option, status]}
                disabled={selecionada !== null}
                onPress={() => setSelecionada(letra)}
              >
                <Text style={styles.optionLetter}>{letra}</Text>
                <Text style={styles.optionText}>{alternativa}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selecionada && (
          <View style={styles.explanation}>
            <Text style={styles.explanationTitle}>
              {selecionada === questao.correta ? 'Muito bem!' : `Resposta correta: ${questao.correta}`}
            </Text>
            <Text style={styles.explanationText}>{questao.explicacao}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, !selecionada && styles.primaryButtonDisabled]}
          disabled={!selecionada}
          onPress={avancar}
        >
          <Text style={styles.primaryButtonText}>{finalizado ? 'Finalizar quiz' : 'Próxima questão'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 24, paddingBottom: 10 },
  progress: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  content: { flex: 1, padding: 24, paddingTop: 16 },
  subject: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  question: { color: COLORS.textPrimary, fontSize: 23, fontWeight: 'bold', lineHeight: 31, marginBottom: 28 },
  options: { gap: 12 },
  option: {
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    padding: 14,
  },
  optionCorrect: { backgroundColor: COLORS.lightGreen, borderColor: COLORS.primary },
  optionWrong: { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
  optionLetter: { color: COLORS.primary, fontSize: 15, fontWeight: '800', width: 18 },
  optionText: { color: COLORS.textPrimary, flex: 1, fontSize: 15, lineHeight: 21 },
  explanation: { backgroundColor: COLORS.lightGreen, borderRadius: 12, marginTop: 20, padding: 16 },
  explanationTitle: { color: COLORS.primary, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  explanationText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  primaryButton: { alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 10, marginTop: 'auto', padding: 16 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: COLORS.background, fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { alignItems: 'center', padding: 14 },
  secondaryButtonText: { color: COLORS.textSecondary, fontWeight: '600' },
  loadingContent: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 },
  loadingIcon: { alignItems: 'center', backgroundColor: COLORS.lightGreen, borderRadius: 45, height: 90, justifyContent: 'center', marginBottom: 24, width: 90 },
  loadingTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  levels: { gap: 10, marginTop: 24, width: '100%' },
  levelButton: { alignItems: 'center', borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, padding: 14 },
  levelSelected: { backgroundColor: COLORS.lightGreen, borderColor: COLORS.primary },
  levelText: { color: COLORS.textPrimary, fontWeight: '700', textTransform: 'capitalize' },
});
