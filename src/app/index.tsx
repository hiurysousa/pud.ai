// app/index.tsx
import React, { useState } from 'react';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState('Splash');

  if (currentScreen === 'Splash') {
    return <SplashScreen onNavigate={() => setCurrentScreen('Login')} />;
  }

  return <LoginScreen />;
}