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

export async function gerarLoteQuiz(disciplina: string, nivel: string): Promise<LoteQuiz> {
  if (!apiUrl) {
    throw new Error('Defina EXPO_PUBLIC_API_URL no arquivo .env para conectar o app à API.');
  }

  const resposta = await fetch(`${apiUrl}/api/solicitar-quiz`, {
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const consulta = await fetch(`${apiUrl}/api/quiz-jobs/${dados.id}`);
    const job = await consulta.json().catch(() => null);
    if (!consulta.ok || job?.status === 'erro') throw new Error(job?.erro ?? 'Não foi possível gerar o quiz.');
    if (job?.status === 'pronto') return job.lote as LoteQuiz;
  }
}
