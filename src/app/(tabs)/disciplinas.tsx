import { useState } from 'react';
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

export default function DisciplinasScreen() {
  const router = useRouter();
  const { disciplinas, addDisciplina, removeDisciplina } = useUserData();
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      Alert.alert('Nome obrigatório', 'Informe o nome da disciplina.');
      return;
    }

    if (disciplinas.some((item) => item.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      Alert.alert('Disciplina repetida', 'Essa matéria já está na sua lista.');
      return;
    }

    try {
      setSaving(true);
      await addDisciplina(nomeLimpo);
      setNome('');
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Suas Disciplinas</Text>
        <Text style={styles.subtitle}>Adicione as matérias do semestre. A lista começa vazia.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Cálculo I"
            value={nome}
            onChangeText={setNome}
          />
          <TouchableOpacity
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            <Text style={styles.addButtonText}>{saving ? 'Salvando...' : 'Adicionar'}</Text>
          </TouchableOpacity>
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
  form: { flexDirection: 'row', gap: 8, marginBottom: 20 },
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
});
