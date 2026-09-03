import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router'; // Importamos o roteador!

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Olá, Estudante! 🎓</Text>
      
      {/* Card de Progresso Geral */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Seu Progresso no PUD</Text>
        <Text style={styles.cardText}>Você está indo super bem! Continue assim.</Text>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('../disciplinas')} // Navega para a tela de disciplinas
        >
          <Text style={styles.buttonText}>Continuar Estudando</Text>
        </TouchableOpacity>
      </View>

      {/* Atalhos Rápidos */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('../quiz')}
        >
          <Text style={styles.actionText}>Ir para o Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('../perfil')}
        >
          <Text style={styles.actionText}>Meu Perfil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  cardText: { fontSize: 14, color: '#666', marginBottom: 20 },
  primaryButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { backgroundColor: '#2196F3', padding: 15, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  actionText: { color: '#FFF', fontWeight: 'bold' }
});