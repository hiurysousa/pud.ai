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

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
let disciplinasPromise: Promise<string[]> | null = null;

function getApiUrl() {
  if (!apiUrl) {
    throw new Error('Defina EXPO_PUBLIC_API_URL no arquivo .env para conectar o app à API.');
  }
  return apiUrl;
}

export function listarDisciplinas(): Promise<string[]> {
  if (!disciplinasPromise) {
    disciplinasPromise = fetch(`${getApiUrl()}/api/disciplinas`)
      .then(async (resposta) => {
        const dados = await resposta.json().catch(() => null);
        if (!resposta.ok || !Array.isArray(dados)) {
          throw new Error('Não foi possível carregar as sugestões de disciplinas.');
        }
        return dados.filter((item): item is string => typeof item === 'string');
      })
      .catch((error) => {
        disciplinasPromise = null;
        throw error;
      });
  }

  return disciplinasPromise;
}

export async function gerarLoteQuiz(disciplina: string, nivel: string): Promise<LoteQuiz> {
  const resposta = await fetch(`${getApiUrl()}/api/solicitar-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disciplina, nivel }),
  });

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const detalhe = typeof dados?.detail === 'string' ? dados.detail : 'Tente novamente em instantes.';
    throw new Error(detalhe);
  }

  if (!dados?.id) throw new Error('A API não iniciou a geração do quiz.');

  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const consulta = await fetch(`${getApiUrl()}/api/quiz-jobs/${dados.id}`);
    const job = await consulta.json().catch(() => null);
    if (!consulta.ok || job?.status === 'erro') throw new Error(job?.erro ?? 'Não foi possível gerar o quiz.');
    if (job?.status === 'pronto') return job.lote as LoteQuiz;
  }
}
