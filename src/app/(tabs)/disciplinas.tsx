import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useUserData } from '@/contexts/user-data-context';
import { listarDisciplinas } from '@/lib/quiz-api';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export default function DisciplinasScreen() {
  const router = useRouter();
  const { disciplinas, addDisciplina, removeDisciplina } = useUserData();
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [catalogo, setCatalogo] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    listarDisciplinas().then(setCatalogo).catch(() => setCatalogo([]));
  }, []);

  const suggestions = useMemo(() => {
    const search = normalizeSearch(nome);
    if (!inputFocused || search.length < 2) return [];

    return catalogo
      .filter((item) => normalizeSearch(item).includes(search))
      .sort((a, b) => {
        const aStarts = normalizeSearch(a).startsWith(search) ? 0 : 1;
        const bStarts = normalizeSearch(b).startsWith(search) ? 0 : 1;
        return aStarts - bStarts || a.localeCompare(b, 'pt-BR');
      })
      .slice(0, 5);
  }, [catalogo, inputFocused, nome]);

  const handleAdd = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      Alert.alert('Nome obrigatório', 'Informe o nome da disciplina.');
      return;
    }

    const nomeCanonico =
      catalogo.find((item) => normalizeSearch(item) === normalizeSearch(nomeLimpo)) ?? nomeLimpo;

    if (disciplinas.some((item) => normalizeSearch(item.nome) === normalizeSearch(nomeCanonico))) {
      Alert.alert('Disciplina repetida', 'Essa matéria já está na sua lista.');
      return;
    }

    try {
      setSaving(true);
      await addDisciplina(nomeCanonico);
      setNome('');
      setInputFocused(false);
    } catch {
      Alert.alert(
        'Não foi possível salvar',
        'Crie o Firestore no Firebase Console (modo teste) e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (id: string, disciplinaNome: string) => {
    Alert.alert('Remover disciplina', `Remover ${disciplinaNome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          removeDisciplina(id).catch(() => {
            Alert.alert('Erro', 'Não foi possível remover a disciplina.');
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Suas Disciplinas</Text>
        <Text style={styles.subtitle}>Adicione as matérias do semestre. A lista começa vazia.</Text>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Comece a digitar, ex.: Álgebra..."
              value={nome}
              onChangeText={setNome}
              onFocus={() => setInputFocused(true)}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.addButton, saving && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={saving}
            >
              <Text style={styles.addButtonText}>{saving ? 'Salvando...' : 'Adicionar'}</Text>
            </TouchableOpacity>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.suggestion}
                  onPress={() => {
                    setNome(suggestion);
                    setInputFocused(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {disciplinas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma disciplina ainda</Text>
            <Text style={styles.emptyText}>
              Quando você adicionar uma matéria, o progresso e os quizzes passam a aparecer aqui.
            </Text>
          </View>
        ) : (
          disciplinas.map((disciplina) => (
            <TouchableOpacity
              key={disciplina.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/quiz', params: { disciplina: disciplina.nome } })}
              onLongPress={() => handleRemove(disciplina.id, disciplina.nome)}
            >
              <Text style={styles.cardTitle}>{disciplina.nome}</Text>
              <Text style={styles.cardProgress}>Progresso: {disciplina.progresso}%</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${disciplina.progresso}%` }]} />
              </View>
            </TouchableOpacity>
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
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  form: { marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  addButtonDisabled: { opacity: 0.7 },
  addButtonText: { color: COLORS.background, fontWeight: 'bold' },
  suggestions: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  suggestion: { borderBottomColor: COLORS.border, borderBottomWidth: 1, padding: 13 },
  suggestionText: { color: COLORS.textPrimary, fontSize: 14 },
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
    backgroundColor: COLORS.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  cardProgress: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  progressTrack: { backgroundColor: COLORS.border, borderRadius: 4, height: 8, marginTop: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: COLORS.primary, borderRadius: 4, height: '100%' },
});
