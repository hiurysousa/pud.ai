import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function SplashScreen({ onNavigate }: { onNavigate: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Círculos concêntricos com o ícone de cérebro */}
        <TouchableOpacity activeOpacity={0.8} onPress={onNavigate} style={styles.outerCircle}>
          <View style={styles.innerCircle}>
            <FontAwesome5 name="brain" size={48} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {/* Logotipo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoPUD}>PUD</Text>
          <Text style={styles.logoAI}>.AI</Text>
        </View>

        <Text style={styles.subtitle}>Seu estudo universitário, gamificado.</Text>
      </View>

      <Text style={styles.footerText}>INSPIRADO NO IFCE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F0F9F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPUD: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  logoAI: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
});