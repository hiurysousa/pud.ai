import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
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
import {
  getQuizReward,
  type Disciplina,
  type QuizLevel,
  type RankingEntry,
  type UserProfile,
} from '@/lib/user-types';

type QuizCompletion = {
  passed: boolean;
  xpEarned: number;
  progressEarned: number;
  totalXp: number;
  totalProgress: number;
};

type UserDataContextValue = {
  profile: UserProfile | null;
  disciplinas: Disciplina[];
  ranking: RankingEntry[];
  loading: boolean;
  addDisciplina: (nome: string) => Promise<void>;
  removeDisciplina: (id: string) => Promise<void>;
  completeQuiz: (disciplinaNome: string, level: QuizLevel, correctAnswers: number) => Promise<QuizCompletion>;
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
    const rankingRef = doc(db, 'ranking', user.uid);
    const unsubscribers: Array<() => void> = [
      onSnapshot(
        userRef,
        (docSnap) => {
          setProfile(toProfile(docSnap.data(), fallbackName, fallbackEmail));
        },
        () => {
          setProfile(toProfile(undefined, fallbackName, fallbackEmail));
        },
      ),
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
          setLoading(false);
        },
        () => {
          setLoading(false);
        },
      ),
      onSnapshot(
        query(collection(db, 'ranking'), orderBy('xp', 'desc')),
        (listSnap) => {
          setRanking(
            listSnap.docs.map((item) => ({
              id: item.id,
              displayName: String(item.data().displayName ?? 'Estudante'),
              xp: typeof item.data().xp === 'number' ? item.data().xp : 0,
            })),
          );
        },
        () => {
          setRanking([]);
        },
      ),
    ];

    const bootstrapProfile = async () => {
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

      const profileData = snapshot.data();
      await setDoc(
        rankingRef,
        {
          displayName: profileData?.displayName || fallbackName,
          xp: typeof profileData?.xp === 'number' ? profileData.xp : 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch(() => undefined);
    };

    bootstrapProfile().catch(() => {
      setProfile((current) => current ?? toProfile(undefined, fallbackName, fallbackEmail));
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

  const completeQuiz = useCallback(
    async (disciplinaNome: string, level: QuizLevel, correctAnswers: number) => {
      if (!user) {
        throw new Error('Entre na sua conta para salvar o resultado.');
      }

      const disciplina = disciplinas.find(
        (item) => item.nome.trim().toLocaleLowerCase('pt-BR') === disciplinaNome.trim().toLocaleLowerCase('pt-BR'),
      );
      if (!disciplina) {
        throw new Error('Essa disciplina não está mais na sua lista.');
      }

      const reward = getQuizReward(level, correctAnswers);
      const db = getFirestoreDb();
      const userRef = doc(db, 'users', user.uid);
      const rankingRef = doc(db, 'ranking', user.uid);
      const disciplinaRef = doc(db, 'users', user.uid, 'disciplinas', disciplina.id);
      const attemptRef = doc(collection(db, 'users', user.uid, 'quizAttempts'));

      const completion = await runTransaction(db, async (transaction) => {
        const [userSnapshot, disciplinaSnapshot] = await Promise.all([
          transaction.get(userRef),
          transaction.get(disciplinaRef),
        ]);

        const currentXp = typeof userSnapshot.data()?.xp === 'number' ? userSnapshot.data()!.xp : 0;
        const currentProgress =
          typeof disciplinaSnapshot.data()?.progresso === 'number'
            ? disciplinaSnapshot.data()!.progresso
            : 0;
        const totalXp = currentXp + reward.xpEarned;
        const totalProgress = Math.min(100, currentProgress + reward.progressEarned);

        transaction.set(userRef, { xp: totalXp }, { merge: true });
        transaction.update(disciplinaRef, { progresso: totalProgress });

        return { ...reward, totalXp, totalProgress };
      });

      await Promise.allSettled([
        setDoc(
          rankingRef,
          {
            displayName: profile?.displayName || user.displayName || 'Estudante',
            xp: completion.totalXp,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
        setDoc(attemptRef, {
          disciplinaId: disciplina.id,
          disciplina: disciplina.nome,
          nivel: level,
          acertos: correctAnswers,
          totalQuestoes: 10,
          aprovado: reward.passed,
          xpGanho: reward.xpEarned,
          progressoGanho: reward.progressEarned,
          createdAt: serverTimestamp(),
        }),
      ]);

      return completion;
    },
    [disciplinas, profile?.displayName, user],
  );

  const value = useMemo(
    () => ({
      profile,
      disciplinas,
      ranking,
      loading,
      addDisciplina,
      removeDisciplina,
      completeQuiz,
    }),
    [profile, disciplinas, ranking, loading, addDisciplina, removeDisciplina, completeQuiz],
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
