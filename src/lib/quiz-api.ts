import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type QuestaoQuiz = {
  pergunta: string;
  alternativas: string[];
  correta: 'A' | 'B' | 'C' | 'D';
  explicacao: string;
};

export type LoteQuiz = {
  disciplina: string;
  questoes: QuestaoQuiz[];
};

const API_PORT = 8000;
const HEALTH_TIMEOUT_MS = 2500;
const REQUEST_TIMEOUT_MS = 8000;
const QUIZ_DEADLINE_MS = 180_000;
const POLL_INTERVAL_MS = 1500;
const MAX_CONSECUTIVE_POLL_FAILURES = 3;
const TOTAL_QUESTOES = 10;

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

let apiUrlPromise: Promise<string> | null = null;
let disciplinasPromise: Promise<string[]> | null = null;

const CONNECTION_ERROR_MESSAGE =
  'Não foi possível conectar à API. Confirme que o backend está ligado e que o celular e o computador estão na mesma rede Wi-Fi.';
const REQUEST_TIMEOUT_MESSAGE =
  'A API demorou para responder. Confirme que o backend está ligado e tente novamente.';

class ApiConnectionError extends Error {}

class ApiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

class ApiResponseError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLanHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;

  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function getDevelopmentApiUrl() {
  if (!__DEV__ || Platform.OS === 'web') return null;

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  try {
    const parsed = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    if (!isLanHost(hostname)) return null;

    const host = hostname.includes(':') ? `[${hostname}]` : hostname;
    return `http://${host}:${API_PORT}`;
  } catch {
    return null;
  }
}

function getApiCandidates() {
  const candidates = [getDevelopmentApiUrl(), configuredApiUrl].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
  return [...new Set(candidates)];
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ApiConnectionError(timedOut ? REQUEST_TIMEOUT_MESSAGE : CONNECTION_ERROR_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}

async function apiIsHealthy(baseUrl: string) {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`, {}, HEALTH_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
}

async function resolveApiUrl() {
  const candidates = getApiCandidates();
  if (candidates.length === 0) {
    throw new ApiConnectionError(
      'Não foi possível localizar a API. Defina EXPO_PUBLIC_API_URL ou inicie o app pelo Expo na mesma rede do backend.',
    );
  }

  for (const candidate of candidates) {
    if (await apiIsHealthy(candidate)) return candidate;
  }

  throw new ApiConnectionError(CONNECTION_ERROR_MESSAGE);
}

function invalidateApiUrl() {
  apiUrlPromise = null;
}

async function getApiUrl() {
  if (!apiUrlPromise) {
    const pending = resolveApiUrl();
    apiUrlPromise = pending;
    pending.catch(() => {
      if (apiUrlPromise === pending) apiUrlPromise = null;
    });
  }

  return apiUrlPromise;
}

export function resetQuizApiConnection() {
  invalidateApiUrl();
  disciplinasPromise = null;
}

function getErrorDetail(data: unknown, fallback: string) {
  if (!isRecord(data)) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.erro === 'string') return data.erro;

  if (isRecord(data.detail) && typeof data.detail.mensagem === 'string') {
    return data.detail.mensagem;
  }

  return fallback;
}

type RequestJsonOptions = {
  retryConnection?: boolean;
  timeoutMs?: number;
};

async function requestJson(
  path: string,
  init: RequestInit = {},
  { retryConnection = true, timeoutMs = REQUEST_TIMEOUT_MS }: RequestJsonOptions = {},
): Promise<unknown> {
  const attempts = retryConnection ? 2 : 1;
  let lastConnectionError: ApiConnectionError | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const baseUrl = await getApiUrl();

    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`, init, timeoutMs);
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new ApiHttpError(
          getErrorDetail(data, `A API retornou um erro (${response.status}). Tente novamente.`),
          response.status,
        );
      }
      if (data === null) throw new ApiResponseError('A API retornou uma resposta vazia ou inválida.');

      return data;
    } catch (error) {
      if (!(error instanceof ApiConnectionError)) throw error;

      lastConnectionError = error;
      invalidateApiUrl();
    }
  }

  throw lastConnectionError ?? new ApiConnectionError(CONNECTION_ERROR_MESSAGE);
}

function isQuestaoQuiz(value: unknown): value is QuestaoQuiz {
  if (!isRecord(value)) return false;

  const alternativas = Array.isArray(value.alternativas) ? value.alternativas : [];
  const somenteRotulos = alternativas.length === 4 && alternativas.every(
    (alternativa) =>
      typeof alternativa === 'string' &&
      /^(?:(?:alternativa|op[cç][aã]o|resposta)\s*)?[abcd](?:\s*[).:\-])?$/i.test(alternativa.trim()),
  );

  return (
    typeof value.pergunta === 'string' &&
    value.pergunta.trim().length > 0 &&
    alternativas.length === 4 &&
    alternativas.every((alternativa) => typeof alternativa === 'string' && alternativa.trim().length > 0) &&
    !somenteRotulos &&
    typeof value.correta === 'string' &&
    ['A', 'B', 'C', 'D'].includes(value.correta) &&
    typeof value.explicacao === 'string' &&
    value.explicacao.trim().length > 0
  );
}

function isLoteQuiz(value: unknown): value is LoteQuiz {
  return (
    isRecord(value) &&
    typeof value.disciplina === 'string' &&
    Array.isArray(value.questoes) &&
    value.questoes.length === TOTAL_QUESTOES &&
    value.questoes.every(isQuestaoQuiz)
  );
}

function isTransientError(error: unknown) {
  return error instanceof ApiConnectionError || (error instanceof ApiHttpError && error.status >= 500);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function listarDisciplinas(): Promise<string[]> {
  if (!disciplinasPromise) {
    disciplinasPromise = requestJson('/api/disciplinas')
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0 || !data.every((item) => typeof item === 'string')) {
          throw new ApiResponseError('A API retornou uma lista de disciplinas inválida.');
        }

        return data.map((item) => item.trim()).filter(Boolean);
      })
      .catch((error) => {
        disciplinasPromise = null;
        throw error;
      });
  }

  return disciplinasPromise;
}

export async function gerarLoteQuiz(disciplina: string, nivel: string): Promise<LoteQuiz> {
  const deadline = Date.now() + QUIZ_DEADLINE_MS;
  const data = await requestJson('/api/solicitar-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disciplina, nivel }),
  }, { retryConnection: false });

  if (!isRecord(data) || typeof data.id !== 'string' || data.id.trim().length === 0) {
    throw new ApiResponseError('A API não iniciou corretamente a geração do quiz.');
  }

  let consecutiveFailures = 0;

  for (;;) {
    const remainingBeforeWait = deadline - Date.now();
    if (remainingBeforeWait <= 0) {
      throw new Error('A geração demorou mais de 3 minutos. Tente novamente em instantes.');
    }

    await delay(Math.min(POLL_INTERVAL_MS, remainingBeforeWait));

    try {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error('A geração demorou mais de 3 minutos. Tente novamente em instantes.');
      }

      const job = await requestJson(`/api/quiz-jobs/${encodeURIComponent(data.id)}`, {}, {
        timeoutMs: Math.min(REQUEST_TIMEOUT_MS, remaining),
      });

      if (!isRecord(job) || typeof job.status !== 'string') {
        throw new ApiResponseError('A API retornou um estado de geração inválido.');
      }

      consecutiveFailures = 0;

      if (job.status === 'processando') continue;
      if (job.status === 'erro') {
        throw new Error(typeof job.erro === 'string' ? job.erro : 'Não foi possível gerar o quiz.');
      }
      if (job.status === 'pronto') {
        if (!isLoteQuiz(job.lote)) {
          throw new ApiResponseError('A API retornou um quiz incompleto ou inválido.');
        }
        return job.lote;
      }

      throw new ApiResponseError('A API retornou um estado de geração desconhecido.');
    } catch (error) {
      if (Date.now() >= deadline) {
        throw new Error('A geração demorou mais de 3 minutos. Tente novamente em instantes.');
      }
      if (!isTransientError(error) || consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) throw error;

      consecutiveFailures += 1;
    }
  }
}
