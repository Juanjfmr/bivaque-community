# Bivaque — Rodada 56: passo 3 da entrada, boas-vindas e entrada em análise no Painel

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-056.task.yml` (R3, com o
[ADR-20260816-forma-da-admissao](../../../docs/decisions/ADR-20260816-forma-da-admissao.md)).
Base: `2299e7f1`. Última rodada do lote Entrada.

**Veredito: PASS.**

## O que mudou

- **Passo 3 da entrada** (`#entrar/cidade`), como na maquete v2: página da entrada, não mais
  diálogo.
  - Campos: cidade, momento (Chegando, Moro aqui, Saindo) e "Como você quer ser chamado", com o
    nome da conta preenchido.
  - A data aparece só para quem chega ou sai. Quem sai escolhe um destino diferente da cidade.
    Chegada e saída guardam datas separadas, e trocar o momento não tira o foco do seletor.
  - Só abre para quem tem conta com elegibilidade confirmada.
  - "Concluir minha entrada" grava a cidade, o momento e o perfil (nome, e-mail da conta,
    verificado; família quando veio por convite) e leva às boas-vindas.
- **Boas-vindas** (`#entrar/boas-vindas`): "Você chegou ao Bivaque." com o plano do momento, a
  turma de quem chega no mesmo ciclo (quando há) e "Entrar na comunidade". Só para quem já entrou.
- **O cadastro antigo em diálogo saiu.** Vínculo e Força não são mais escolhidos. O resultado da
  verificação também não: ele vem da consulta do CPF ou do convite.
  - Com o perfil de teste não verificado, publicar mostra "Perfil em análise" em vez de reabrir o
    cadastro.
- **Painel do Bivaque:** a entrada em análise neste dispositivo aparece na fila de verificações.
  - A revisão mostra o documento enviado e lembra que o CPF não fica guardado.
  - "Aprovar" libera o passo 3; "Pedir outro documento" devolve a pessoa ao envio.
  - Desfazer só vale enquanto a pessoa não seguiu na entrada.
- **Controles do protótipo:** "Ver o cadastro" virou "Ver a entrada do zero". Ele sai da conta,
  limpa a entrada em andamento e abre "Criar conta", sem apagar os dados de teste.

## Provas adaptadas

- Rodada 02: os 6 pontos do cadastro em diálogo viraram pontos do passo 3: caminho feliz,
  validação, conta de família, destino na saída, sair e retomar, e falha de gravação. Também o
  bloqueio de publicação sem verificação.
- Rodada 10: campos do momento e datas separadas, agora no passo 3.
- Rodadas 54 e 55: a elegibilidade confirmada leva ao passo 3, não mais ao diálogo.
- Prova de execução: na referência original o diálogo continua; no candidato, "Ver a entrada do
  zero" abre a conta.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 56 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Rodada 02 (375 claro) | PASS, 12/12 |
| Rodada 10 (375 claro) | PASS, 12/12 |
| Rodadas 54 e 55 (375 claro) | PASS, 6/6 e 5/5 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round56/` (passo 3 e boas-vindas, 375 e 1440).
