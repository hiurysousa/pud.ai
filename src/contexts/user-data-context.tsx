import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getFirestoreDb } from '@/lib/firebase';
import { type Disciplina, type RankingEntry, type UserProfile } from '@/lib/user-types';

type UserDataContextValue = {
  profile: UserProfile | null;
  disciplinas: Disciplina[];
  ranking: RankingEntry[];
  loading: boolean;
  addDisciplina: (nome: string) => Promise<void>;
  removeDisciplina: (id: string) => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

function toProfile(
  data: { displayName?: string; email?: string; xp?: number; badges?: string[] } | undefined,
  fallbackName: string,
  fallbackEmail: string,
): UserProfile {
  return {
    displayName: data?.displayName || fallbackName,
    email: data?.email || fallbackEmail,
    xp: typeof data?.xp === 'number' ? data.xp : 0,
    badges: Array.isArray(data?.badges) ? data.badges : [],
  };
}

export function UserDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setDisciplinas([]);
      setRanking([]);
      setLoading(false);
      return;
    }

    const fallbackName = user.displayName ?? 'Estudante';
    const fallbackEmail = user.email ?? '';
    setLoading(true);

    const db = getFirestoreDb();
    const userRef = doc(db, 'users', user.uid);
    const unsubscribers: Array<() => void> = [];

    const bootstrap = async () => {
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) {
        await setDoc(userRef, {
          displayName: fallbackName,
          email: fallbackEmail,
          xp: 0,
          badges: [],
          createdAt: serverTimestamp(),
        });
      }

      unsubscribers.push(
        onSnapshot(userRef, (docSnap) => {
          setProfile(toProfile(docSnap.data(), fallbackName, fallbackEmail));
        }),
      );

      unsubscribers.push(
        onSnapshot(
          query(collection(db, 'users', user.uid, 'disciplinas'), orderBy('createdAt', 'asc')),
          (listSnap) => {
            setDisciplinas(
              listSnap.docs.map((item) => ({
                id: item.id,
                nome: String(item.data().nome ?? ''),
                progresso: typeof item.data().progresso === 'number' ? item.data().progresso : 0,
              })),
            );
          },
          () => {
            setDisciplinas([]);
          },
        ),
      );

      unsubscribers.push(
        onSnapshot(
          query(collection(db, 'users'), orderBy('xp', 'desc')),
          (listSnap) => {
            setRanking(
              listSnap.docs.map((item) => ({
                id: item.id,
                displayName: String(item.data().displayName ?? 'Estudante'),
                xp: typeof item.data().xp === 'number' ? item.data().xp : 0,
              })),
            );
            setLoading(false);
          },
          () => {
            setRanking([]);
            setLoading(false);
          },
        ),
      );
    };

    bootstrap().catch(() => {
      setProfile(toProfile(undefined, fallbackName, fallbackEmail));
      setDisciplinas([]);
      setRanking([]);
      setLoading(false);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const addDisciplina = useCallback(
    async (nome: string) => {
      if (!user) {
        return;
      }

      const nomeLimpo = nome.trim();
      if (!nomeLimpo) {
        return;
      }

      await addDoc(collection(getFirestoreDb(), 'users', user.uid, 'disciplinas'), {
        nome: nomeLimpo,
        progresso: 0,
        createdAt: serverTimestamp(),
      });
    },
    [user],
  );

  const removeDisciplina = useCallback(
    async (id: string) => {
      if (!user) {
        return;
      }

      await deleteDoc(doc(getFirestoreDb(), 'users', user.uid, 'disciplinas', id));
    },
    [user],
  );

  const value = useMemo(
    () => ({
      profile,
      disciplinas,
      ranking,
      loading,
      addDisciplina,
      removeDisciplina,
    }),
    [profile, disciplinas, ranking, loading, addDisciplina, removeDisciplina],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData deve ser usado dentro de UserDataProvider.');
  }
  return context;
}
