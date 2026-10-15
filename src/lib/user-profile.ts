import type { User } from 'firebase/auth';
import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

import { getFirestoreDb } from '@/lib/firebase';

type ProfileUser = Pick<User, 'uid' | 'displayName' | 'email'>;

type StoredUserProfile = {
  displayName?: unknown;
  email?: unknown;
  xp?: unknown;
  badges?: unknown;
  createdAt?: unknown;
};

type StoredRankingProfile = {
  displayName?: unknown;
  xp?: unknown;
};

const MAX_DISPLAY_NAME_LENGTH = 80;

function cleanDisplayName(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
}

function readNonNegativeXp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }

  return '';
}

export function getUserDataErrorMessage(error: unknown) {
  const code = getErrorCode(error).replace(/^firestore\//, '');

  switch (code) {
    case 'permission-denied':
      return 'O Firebase recusou o acesso ao Ranking. Confira se as regras mais recentes do Firestore foram publicadas.';
    case 'unavailable':
      return 'O Ranking está temporariamente indisponível. Verifique sua conexão e tente novamente.';
    case 'failed-precondition':
      return 'O Ranking ainda não está pronto no Firebase. Confira a configuração do Firestore.';
    default:
      return 'Não foi possível sincronizar o Ranking. Tente novamente.';
  }
}

/**
 * Keeps the private profile and its public ranking projection in sync.
 * Repeated calls are safe: existing XP and createdAt values are never reset.
 */
export async function ensureUserDocuments(
  user: ProfileUser,
  preferredName?: string,
  db: Firestore = getFirestoreDb(),
) {
  const userRef = doc(db, 'users', user.uid);
  const rankingRef = doc(db, 'ranking', user.uid);

  return runTransaction(db, async (transaction) => {
    const [userSnapshot, rankingSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(rankingRef),
    ]);
    const userData = userSnapshot.data() as StoredUserProfile | undefined;
    const rankingData = rankingSnapshot.data() as StoredRankingProfile | undefined;
    const displayName =
      cleanDisplayName(preferredName) ||
      cleanDisplayName(user.displayName) ||
      cleanDisplayName(userData?.displayName) ||
      cleanDisplayName(rankingData?.displayName) ||
      'Estudante';
    const email = typeof user.email === 'string' ? user.email : '';
    const xp = readNonNegativeXp(userData?.xp) ?? readNonNegativeXp(rankingData?.xp) ?? 0;

    if (!userSnapshot.exists()) {
      transaction.set(userRef, {
        displayName,
        email,
        xp,
        badges: [],
        createdAt: serverTimestamp(),
      });
    } else {
      const userPatch: Record<string, unknown> = {};

      if (userData?.displayName !== displayName) {
        userPatch.displayName = displayName;
      }
      if (userData?.email !== email) {
        userPatch.email = email;
      }
      if (readNonNegativeXp(userData?.xp) === undefined) {
        userPatch.xp = xp;
      }
      if (!Array.isArray(userData?.badges)) {
        userPatch.badges = [];
      }
      if (!userData?.createdAt) {
        userPatch.createdAt = serverTimestamp();
      }

      if (Object.keys(userPatch).length > 0) {
        transaction.set(userRef, userPatch, { merge: true });
      }
    }

    const rankingIsCurrent =
      rankingSnapshot.exists() &&
      rankingData?.displayName === displayName &&
      readNonNegativeXp(rankingData?.xp) === xp;

    if (!rankingIsCurrent) {
      transaction.set(rankingRef, {
        displayName,
        xp,
        updatedAt: serverTimestamp(),
      });
    }

    return { displayName, email, xp };
  });
}
