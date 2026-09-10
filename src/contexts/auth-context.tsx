import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { getAuthErrorMessage } from '@/lib/auth-errors';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function ensureFirebase() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase não configurado. Preencha o arquivo .env com as chaves EXPO_PUBLIC_FIREBASE_* e reinicie o Expo.',
    );
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        ensureFirebase();
        try {
          await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      async signUp(name, email, password) {
        ensureFirebase();
        try {
          const auth = getFirebaseAuth();
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(credential.user, { displayName: name });
          await credential.user.reload();
          setUser(auth.currentUser);
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      async signInWithGoogle() {
        ensureFirebase();
        try {
          const provider = new GoogleAuthProvider();
          provider.addScope('email');
          provider.addScope('profile');
          await signInWithPopup(getFirebaseAuth(), provider);
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      async signInWithGoogleIdToken(idToken) {
        ensureFirebase();
        try {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(getFirebaseAuth(), credential);
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      async resetPassword(email) {
        ensureFirebase();
        try {
          await sendPasswordResetEmail(getFirebaseAuth(), email);
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      async logOut() {
        ensureFirebase();
        await signOut(getFirebaseAuth());
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
