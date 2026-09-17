import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from agno.run import RunStatus
from fastapi import HTTPException

from backend.main import (
    GerarQuizRequest,
    _gerar_quiz,
    conteudo_indica_falha_do_provedor,
    criar_agente_professor,
    DisciplinaCatalogo,
    QuizGerado,
    extrair_conteudos_programaticos,
    formatar_exclusoes,
    interpretar_catalogo_markdown,
    preparar_topicos_para_quiz,
    perguntas_sao_semelhantes,
    serializar_catalogo_markdown,
    validar_lote_do_provedor,
)


class CatalogoMarkdownTests(unittest.TestCase):
    def test_catalogo_faz_round_trip_em_markdown(self) -> None:
        catalogo = [
            DisciplinaCatalogo(
                nome="Estrutura de Dados",
                topicos="### 1. Listas\n\n- **1.1.** Listas encadeadas",
            )
        ]

        markdown = serializar_catalogo_markdown(catalogo)
        restaurado = interpretar_catalogo_markdown(markdown)

        self.assertEqual(restaurado, tuple(catalogo))

    def test_topicos_numerados_viram_titulos_e_listas(self) -> None:
        conteudos = """1. ALGORITMOS
1.1. Complexidade
1.1.1. Notação assintótica
2. ESTRUTURAS
2.1. Pilhas
O 2019 Coordenação do curso de Bacharelado em Ciência da Computação. IFCE/Campus Aracati
"""

        markdown = preparar_topicos_para_quiz(conteudos)

        self.assertIn("### 1. ALGORITMOS", markdown)
        self.assertIn("- **1.1.** Complexidade", markdown)
        self.assertIn("  - **1.1.1.** Notação assintótica", markdown)
        self.assertIn("### 2. ESTRUTURAS", markdown)
        self.assertNotIn("Coordenação do curso", markdown)

    def test_extracao_termina_antes_da_metodologia(self) -> None:
        texto = """1. ALGORITMOS
1.1. Complexidade
METODOLOGIA Aulas expositivas
AVALIAÇÃO Prova escrita
"""

        conteudos = extrair_conteudos_programaticos(texto)

        self.assertEqual(conteudos, "1. ALGORITMOS\n1.1. Complexidade")


class QuizGeradoTests(unittest.TestCase):
    def test_converte_texto_da_resposta_correta_em_letra(self) -> None:
        questao = QuizGerado.model_validate(
            {
                "pergunta": "Qual alternativa está correta?",
                "alternativas": ["Primeira", "Resposta correta", "Terceira", "Quarta"],
                "correta": "Resposta correta",
                "explicacao": "A segunda alternativa é a resposta correta.",
            }
        )

        self.assertEqual(questao.correta, "B")

    def test_continua_aceitando_a_letra_da_alternativa(self) -> None:
        questao = QuizGerado.model_validate(
            {
                "pergunta": "Qual alternativa está correta?",
                "alternativas": ["Primeira", "Segunda", "Terceira", "Quarta"],
                "correta": " c ",
                "explicacao": "A terceira alternativa é a resposta correta.",
            }
        )

        self.assertEqual(questao.correta, "C")

    def test_valida_lote_quando_provedor_retorna_texto_correto(self) -> None:
        questao = {
            "pergunta": "Qual é o objetivo da lógica de programação?",
            "alternativas": [
                "Memorizar sintaxe",
                "Desenvolver pensamento algorítmico",
                "Estudar somente hardware",
                "Escrever apenas documentação",
            ],
            "correta": "Desenvolver pensamento algorítmico",
            "explicacao": "Ela desenvolve a capacidade de formular soluções algorítmicas.",
        }
        questoes = [{**questao, "pergunta": f"Questão {indice}: {questao['pergunta']}"} for indice in range(10)]
        resposta = json.dumps(
            {"disciplina": "Introdução à Programação", "questoes": questoes},
            ensure_ascii=False,
        )

        lote = validar_lote_do_provedor(resposta)

        self.assertEqual(len(lote.questoes), 10)
        self.assertTrue(all(item.correta == "B" for item in lote.questoes))

    def test_rejeita_perguntas_repetidas_no_mesmo_lote(self) -> None:
        questao = {
            "pergunta": "O que é um algoritmo?",
            "alternativas": ["Uma sequência", "Um arquivo", "Um computador", "Uma variável"],
            "correta": "A",
            "explicacao": "Um algoritmo descreve uma sequência de passos.",
        }

        with self.assertRaises(ValueError):
            validar_lote_do_provedor({"disciplina": "Teste", "questoes": [questao] * 10})

    def test_identifica_parafrases_de_perguntas_anteriores(self) -> None:
        self.assertTrue(
            perguntas_sao_semelhantes(
                "Em um fluxograma, qual símbolo representa um ponto de decisão?",
                "Qual símbolo de um fluxograma representa uma etapa de decisão?",
            )
        )
        self.assertFalse(
            perguntas_sao_semelhantes(
                "O que é um algoritmo?",
                "Como funciona a memória virtual?",
            )
        )

    def test_identifica_resposta_vazia_ou_erro_do_provedor(self) -> None:
        self.assertTrue(conteudo_indica_falha_do_provedor(None))
        self.assertTrue(conteudo_indica_falha_do_provedor("Provider returned error"))
        self.assertFalse(conteudo_indica_falha_do_provedor('{"disciplina":"Teste"}'))

    def test_recupera_json_quando_provedor_inclui_texto_antes(self) -> None:
        questoes = [
            {
                "pergunta": f"Pergunta distinta número {indice}?",
                "alternativas": ["Primeira", "Segunda", "Terceira", "Quarta"],
                "correta": "A",
                "explicacao": "A primeira alternativa é a correta.",
            }
            for indice in range(10)
        ]
        json_valido = json.dumps({"disciplina": "Teste", "questoes": questoes}, ensure_ascii=False)

        lote = validar_lote_do_provedor(f"Texto indevido antes do resultado.\n{json_valido}")

        self.assertEqual(len(lote.questoes), 10)

    def test_compacta_e_limita_exclusoes_do_prompt(self) -> None:
        perguntas = [f"Pergunta anterior {indice} " + "muito longa " * 20 for indice in range(25)]

        exclusoes = formatar_exclusoes(perguntas)

        self.assertEqual(exclusoes.count('"') // 2, 20)
        self.assertIn("Pergunta anterior 24", exclusoes)
        self.assertNotIn("Pergunta anterior 0", exclusoes)
        self.assertIn("…", exclusoes)

    def test_agente_usa_configuracao_confiavel_para_json(self) -> None:
        configuracao = {
            "OPENROUTER_API_KEY": "chave-de-teste",
            "OPENROUTER_MODEL": "nex-agi/nex-n2.5-pro:free",
            "OPENROUTER_MAX_TOKENS": "5000",
            "OPENROUTER_TIMEOUT_SECONDS": "60",
        }

        with patch.dict(os.environ, configuracao):
            agente = criar_agente_professor()

        self.assertEqual(agente.model.id, "nex-agi/nex-n2.5-pro:free")
        self.assertEqual(agente.model.max_tokens, 5000)
        self.assertEqual(agente.model.timeout, 60)
        self.assertIsNone(agente.model.reasoning_effort)
        self.assertTrue(agente.model.strict_output)
        self.assertEqual(agente.model.extra_body["provider"]["require_parameters"], True)
        self.assertEqual(agente.model.extra_body["plugins"], [{"id": "response-healing"}])
        self.assertEqual(agente.model.extra_body["reasoning"], {"enabled": False})

    def test_erro_de_modelo_indisponivel_nao_repete_a_chamada(self) -> None:
        resposta = SimpleNamespace(
            status=RunStatus.error,
            content="This model is unavailable for free. Use another slug.",
        )
        agente = SimpleNamespace(run=lambda _prompt: resposta)
        pedido = GerarQuizRequest(disciplina="Estrutura de Dados", nivel="iniciante")

        with patch("backend.main.localizar_topicos", return_value="1. Listas"), \
                patch("backend.main.carregar_cache_quiz", return_value={}), \
                patch("backend.main.criar_agente_professor", return_value=agente) as criar:
            with self.assertRaises(HTTPException) as erro:
                _gerar_quiz(pedido)

        self.assertEqual(erro.exception.status_code, 503)
        self.assertIn("OPENROUTER_MODEL", erro.exception.detail)
        criar.assert_called_once()


if __name__ == "__main__":
    unittest.main()
