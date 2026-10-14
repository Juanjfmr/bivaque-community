# Bivaque — Rodada 06: fechamento do protótipo HTML

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-006.task.yml` (R2). Base: `2eacac64`.

**Veredito: PASS.** O protótipo atende aos critérios de "HTML concluído" do kit, com prova ampla verde e gate completo verde. A **parte comercial** foi observada, mas não aprovada: é R3 e depende de decisão humana (abaixo).

## Critérios de "HTML concluído" do kit

| Critério (`docs/bivaque-html-kit/ROADMAP.md`) | Situação |
| --- | --- |
| Toda ação clicável responde, sem botão morto | **Comprovado nas telas:** varredura de 19 telas, 213 ações. Os botões dentro de diálogos foram provados pelas Rodadas 00.1 a 05 |
| Telas, detalhe, edição, criação e estados vazio, falha, sucesso e confirmação | Comprovado pelas provas das Rodadas 02 a 05 |
| Prova em 375/768/1440, claro e escuro, teclado, movimento reduzido | Comprovado (matriz completa em todas as provas) |
| Material Web e navegação HTML preservados | Comprovado (referência intacta por hash e prova visual) |
| Nenhuma credencial real, cobrança ou serviço real simulado como verdadeiro | Comprovado nas provas (sem requisições externas; links externos só registrados) |
| Gerador reprodutível e diff visual | Comprovado (build determinístico e prova visual) |
| Lista de adaptadores para o backend | Entregue: [ADAPTERS.md](ADAPTERS.md) |

## Varredura "nenhum botão morto" (`round06-proof.mjs`)

Em cada tela, a prova recarrega a página, clica em cada ação visível fora de diálogos
e exige uma mudança observável. Contam como resposta:

- rota, diálogo, menu, aviso ou região `aria-live`;
- conteúdo da tela ou dado salvo;
- link externo registrado, cópia para a área de transferência ou folha de
  compartilhamento.

**O foco não conta**, porque o próprio clique o move. Ficam de fora os itens desabilitados
(`disabled`/`aria-disabled`), o filtro já selecionado e a aba da própria rota.

A régua foi endurecida pela revisão independente (HIGH): antes, o foco contava como
resposta e não havia recarga entre os cliques. A régua corrigida revelou 10 casos, e
cada um foi investigado:

- **filtros já selecionados:** sem efeito por definição;
- **menu Criar:** a detecção do teste estava errada, porque o menu tem posição fixa;
- **Compartilhar:** em navegador sem tela, a folha nativa é cancelada, e cancelar não
  avisa, por regra da Rodada 01. O teste passou a simular a folha.

Um **controle negativo** prova que a régua não dá falso positivo: um botão injetado
que cai num caminho sem efeito é classificado como sem resposta.

## Defeito corrigido

- **Enquete já votada:** as outras opções ficavam marcadas como desabilitadas para
  tecnologia assistiva, mas o clique com mouse não fazia nada. Agora avisa "Seu voto
  nesta enquete já foi registrado", e o "Voto registrado" só aparece se gravar.
  Checkpoint `voted-poll-answers`.

## Parte comercial: observação, não aprovação

Pela `docs/decisions/RISK_MATRIX.md`, a parte comercial (planos e destaque pago) é
**R3** e exige um ADR aprovado por uma pessoa. Nada foi alterado nela. Os checkpoints
`plans-test-mode-no-ranking-change` e `sponsored-is-labeled` rodam **só como
observação**:

- a tela de planos diz "nenhum pagamento" e "não altera a ordem";
- ativar o plano de teste não mudou a ordem em Negócios;
- a página de negócio pago mostra "Patrocinado".

A revisão apontou limites dessas observações. Elas testam só um dos planos, verificam
a ordem só em Negócios e conferem o "nenhum pagamento" só pelo texto da tela; os cards
pagos dentro das listas não são conferidos. **A aprovação comercial fica pendente de
decisão humana.**

## Prova ampla

| Prova | Resultado |
| --- | --- |
| Referência, build determinístico, testes do builder | PASS |
| Rodada 06 (varredura, controle negativo, enquete, denúncia, observações) | PASS, 36/36 (6 contextos), 0 erros JS, 0 requisições externas |
| Rodada 05 | PASS, 72/72 |
| Rodada 04 | PASS, 78/78 |
| Rodada 03 | PASS, 108/108 |
| Rodada 02 | PASS, 72/72 |
| Rodada 01 | PASS |
| Rodada 00.1 (conversas) | PASS |
| Visual | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |

Candidato final: `569c0cbb1b54ed9e15049cd3ba68d2b602b4abadda1426be27f235f95e333f9e`.

## O que continua fora do protótipo

- Parte comercial: aprovação R3 por ADR (acima).
- Denúncia: dependência de moderação real, com o aviso explícito.
- Tudo o que exige backend, listado em [ADAPTERS.md](ADAPTERS.md). As duas lacunas
  grandes são **anúncios** (desapegos e imóveis) e **planos e cobrança**, que não têm
  tabelas.
- Pendências LOW registradas nos relatórios das Rodadas 02 a 05.
