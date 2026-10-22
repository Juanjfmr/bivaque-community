# Bivaque — base visual congelada no fechamento do Lote Lançamento (Rodadas 69 a 72)

Data: 22/10/2026. Aprovada pelo usuário ("Congelar") depois de:

- revisão do coordenador (Opus) em cada rodada;
- revisão independente do Codex (gpt-6.1-sol):
  - R70 e R71: REPROVADO, o que gerou a R72;
  - R72: APROVADO COM RESSALVAS, depois de duas rodadas de confirmação;
- bateria completa, com cada falha explicada e reexecutada sozinha.

| Item | Valor |
|---|---|
| Arquivo | `.visual/bivaque-html-round72/baseline/round72.html` |
| SHA-256 | `7e7657c3652ce6daff450d8dfe5d9ce8d8eda8d6189bcd3f2317a2f25fb61d2d` |
| Código | O do commit que adiciona este registro. Sem o arquivo local, a base é remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`). |
| Substitui | A base da Rodada 68 (`3d427b0d…`) nas comparações estritas |

## O que mudou em relação à base da Rodada 68

Todas as telas mudam. É a troca de pele aprovada no ADR-20261020.

- **R69, lançamento sem cobrança:**
  - ninguém aparece como Patrocinado;
  - conversas sem limite;
  - "Planos" diz que os pagos vêm depois;
  - o produto pago fica atrás de `window.BIVAQUE_LABS.paidPlans`.
- **R70, pele da marca nos temas claro e escuro:**
  - Grafite, Papel e Brasa no claro; Carvão, Elevado e Brasa Clara no escuro;
  - Brasa só no Criar e no CTA;
  - cantos de 12, 10 e 18 px;
  - Noto Sans, Noto Serif e ícones Outlined;
  - o símbolo oficial;
  - fotos 10% mais escuras no escuro.
- **R71, landing v8 com o título F** ("Juntos somos mais fortes."). Saíram a amostra por cidade e os links sem
  destino ("Termos de uso" e "Para negócios").
- **R72, correções da revisão do Codex:**
  - menu Criar neutro e legível também no toque;
  - paleta única do cartão de compartilhamento;
  - cantos de 12 px na entrada e na ajuda;
  - símbolo oficial em toda a entrada;
  - foco contido na folha do menu da landing;
  - barra fixa fora do teclado;
  - alvos de 44 px.

## Bateria do fechamento

Bateria completa sobre o build `b6eb1c5c…`, em 375-light, 768-light e 1440-dark: 63 de 74 passaram. As 11 falhas
foram explicadas e reexecutadas sozinhas no build final `7e7657c3…`.

| Grupo | Rodadas | Causa e correção |
|---|---|---|
| Provas antigas não ajustadas | R01, R02, R13, R55, R64 e R71 | Sobras da R69 (Patrocinado e planos atrás da chave de laboratório) e da R71 (vários "Criar conta" e "Entrar" na landing; o convite fica no passo do CPF; no 768 a conversa de exemplo já nasce à vista). Corrigidas: R01 liga a chave de laboratório, como as R06, R35, R52, R63 e R65. |
| Orçamento | R09 | 2.017.062 bytes transferidos, acima de 2 MB, pelas fotos da landing. Fotos do topo recomprimidas (99 KB e 87 KB). |
| Instabilidade de tempo | R04 e R61 | Um checkpoint diferente a cada execução, com a máquina dividida com outras tarefas. Passam sozinhas: 42/42 e 18/18. |
| Esperada | Runtime | Falha só na etapa `baseline` (HTML original congelado, "open-thread não abre conversa"), como em todas as bases desde a R13. |

Reexecução sozinha no build final:

| Rodada | Resultado |
|---|---|
| R01 | PASS |
| R02 | 36/36 |
| R04 | 42/42 |
| R09 | 12/12 |
| R13 | 48/48 |
| R19 | 24/24 |
| R55 | 15/15 |
| R61 | 18/18 |
| R64 | 66/66 |
| R71 | 33/33 |

As provas das próprias rodadas, nos 4 contextos:

| Rodada | Resultado |
|---|---|
| R70 | 24/24 |
| R71 | 44/44 |
| R72 | 28/28 |

O gate está verde.

**Pendências:**

- No porte para o Next, decidir se a hierarquia de CTA por tela merece classes próprias. Hoje a comparação de
  propostas tem um "Escolher" em Brasa por proposta.
- A Ajuda pública: no Next, `/ajuda` exige sessão (registro da PORT-001).
