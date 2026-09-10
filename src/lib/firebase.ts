import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';


function readEnv(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, '') ?? '';
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  firebase?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  googleWebClientId?: string;
};

const firebaseConfig = {
  apiKey: readEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.firebase?.apiKey),
  authDomain: readEnv(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.firebase?.authDomain),
  projectId: readEnv(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.firebase?.projectId),
  storageBucket: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.firebase?.storageBucket,
  ),
  messagingSenderId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.firebase?.messagingSenderId,
  ),
  appId: readEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.firebase?.appId),
};

export function getGoogleWebClientId() {
  return readEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || extra.googleWebClientId);
}

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

const getReactNativePersistence = (
  require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  }
).getReactNativePersistence;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase não configurado. Copie .env.example para .env, preencha as chaves e reinicie o Expo com npx expo start -c.',
    );
  }

  return initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();

  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
    authInstance.setPersistence(browserLocalPersistence).catch(() => undefined);
    return authInstance;
  }

  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }

  return authInstance;
}

let firestoreInstance: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }

  return firestoreInstance;
}
