# Page Audit Findings

Ledger de achados da auditoria página a página.

## Formato obrigatório

Cada finding deve conter:

- `PA-###` — ID estável;
- Page ID(s);
- dimensão;
- severidade;
- status de evidência;
- regra `DS-*` / `VG-*` aplicável;
- evidência concreta;
- impacto no usuário;
- critério de fechamento;
- link para issue/PR de correção quando existir.

Não registrar “parece ruim”, “moderno”, “clean” ou preferências sem regra/evidência.

## Clarificação de produto aplicada à auditoria

**Vínculo de vila/comunidade é opcional.** Um membro sem vila não está incompleto, não está necessariamente em onboarding e não precisa ser conduzido a uma vila para que a experiência seja considerada válida ou Premium.

A auditoria deve, portanto:

- tratar experiências com e sem vila como estados de primeira classe;
- não usar adesão a vila como métrica universal de ativação/participação;
- não classificar ausência de vila como empty state a ser “corrigido”;
- avaliar se cidade, grupos, eventos, guia, recomendações e outras superfícies aplicáveis entregam valor independentemente de membership de vila;
- tratar descoberta de vilas como oportunidade opcional de pertencimento.

## Carry-in queue — evidência já existente a reatribuir por página

O `PHASE6_REVIEW.md` já mantém evidência runtime válida que não deve ser descartada. Ao auditar a página correspondente, revalidar ou reutilizar somente quando a condição de evidence reuse continuar verdadeira.

| Contrato | Baseline existente | Alvo provável da auditoria |
|---|---|---|
| `DS-010` | scope/locality truth falha no shell para conta Rio | páginas `member_shell` afetadas |
| `DS-011` | parent/landed state diverge entre mobile e rail/sidebar | páginas aninhadas do `member_shell` |
| `DS-014/015` | erro pode colapsar em empty semantics em grupos | `GRP-01` e fluxos similares |
| `DS-016/027` | mensagem crua de backend pode chegar ao usuário | páginas que usam shared error path |
| `DS-021` | compound control de localidade não satisfaz contrato canônico de tabs | página onde o controle é renderizado |
| `DS-029` | runtime não pode alegar WCAG AA enquanto falha objetiva conhecida persistir | auditoria transversal + páginas afetadas |
| `DS-035` | copy portuguesa sem diacríticos foi observada em fallback de rota | estados de erro/fallback aplicáveis |

Esses itens não recebem automaticamente um novo `PA-*`. O finding nasce quando a auditoria consegue atribuir a violação a uma página/estado concreto.

## Findings confirmados

### PA-001 — Conteúdo de Cidade sob parent ativo Comunidade

- **Page IDs:** `COM-01` — variante sem vínculo de vila aprovado.
- **Dimensão:** `entry_exit_navigation`.
- **Severidade:** `HIGH`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-009`; Visual Guide §0 “Navegação — containers derivados do modelo”.
- **Evidência concreta:** `CommunityPage` renderiza `CityReference` em `/community` quando não há `primaryCommunityId`; `BottomNav` seleciona `community` para `/community`. O Visual Guide coloca eventos da cidade, guia e vitrine dentro de `Cidade`, enquanto `Minha comunidade` representa contexto de vila.
- **Impacto:** conteúdo e parent conceitual divergem. Como não pertencer a uma vila é um estado válido e potencialmente permanente, essa divergência afeta o modelo mental recorrente do usuário e não pode ser justificada como transição temporária.
- **Critério de fechamento:** definir e provar uma estratégia coerente de parent/landed state para membros com e sem vila, sem criar feed municipal e sem transformar vila em requisito. Redirecionar para `Cidade` é apenas uma hipótese; qualquer solução deve respeitar `EXP-001`.
- **Correção:** pendente.

### PA-002 — Erros de eventos/vitrine não oferecem recovery

- **Page IDs:** `COM-01`, `LOC-01`.
- **Dimensão:** `state_model`, `interaction_feedback_recovery`.
- **Severidade:** `HIGH`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-014`, `DS-027`; Visual Guide §0 “Estados”.
- **Evidência concreta:** em `CityReference`, falha de eventos ou prestadores renderiza apenas um `<p>` de erro. `load()` e `loadProviders()` existem, mas nenhum retry é exposto ao usuário.
- **Impacto:** falha transitória vira beco sem saída e exige reload/navegação externa para nova tentativa.
- **Critério de fechamento:** manter o módulo e apresentar erro estável com retry para a operação correspondente, preservando contexto seguro.
- **Correção:** pendente.

### PA-003 — No-results de prestador remove query e filtros

- **Page IDs:** `COM-01`, `LOC-01`.
- **Dimensão:** `state_model`, `interaction_feedback_recovery`.
- **Severidade:** `HIGH`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-019`.
- **Evidência concreta:** `CityReference` usa `providers.length === 0` no ramo externo para renderizar o empty state sem formulário. Como `providers` também recebe o resultado filtrado, uma busca que retorna zero remove input, categoria e submit. O ramo interno “Nenhum prestador encontrado com esses filtros” fica estruturalmente inalcançável quando a lista chega a zero.
- **Impacto:** o usuário perde justamente a query e os filtros necessários para corrigir a busca.
- **Critério de fechamento:** distinguir catálogo inicial vazio de no-results; no segundo caso manter query/filtros visíveis, oferecer limpar/ajustar filtros e preservar contexto.
- **Correção:** pendente.

### PA-004 — Duas ações primárias `Publicar` competem na home sem vínculo de vila

- **Page IDs:** `COM-01` — variante sem vínculo de vila aprovado.
- **Dimensão:** `visual_hierarchy_consistency`.
- **Severidade:** `MEDIUM`.
- **Status de evidência:** `FAIL-SOURCE` (craft).
- **Regra:** Visual Guide §0 “CTAs e ações”; Visual Guide §9.1 “Hierarquia”.
- **Evidência concreta:** `AppShell` sempre oferece `Publicar` no header; `CommunityPage` também passa `onPublish` a `CityReference`, que renderiza outro `Publicar` no header da página.
- **Impacto:** duplicação compete por atenção e reduz a clareza de prioridade da primeira dobra.
- **Critério de fechamento:** manter uma única entrada primária por viewport, ou diferenciar semanticamente as ações se representarem consequências/audiências realmente distintas.
- **Correção:** pendente.

### PA-005 — Header mobile não exibe a marca prevista pelo Visual Guide

- **Page IDs:** `member_shell` (observado em `COM-01`).
- **Dimensão:** `visual_hierarchy_consistency`.
- **Severidade:** `MEDIUM`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** Visual Guide §0 “Navegação — containers derivados do modelo”, item “Header: brand à esquerda”.
- **Evidência concreta:** o header atual usa o contexto de localidade à esquerda; em 375px o texto da localidade está `hidden sm:inline`, restando o ícone de pin. Não há wordmark/brand no header autenticado.
- **Impacto:** a principal superfície recorrente perde reconhecimento de marca e o topo fica predominantemente utilitário.
- **Critério de fechamento:** implementar a presença de marca prevista sem comprometer a inspeção de escopo, ou reabrir/alterar formalmente a rubrica visual com evidência comparativa.
- **Correção:** pendente.

## Auditorias associadas

- `HOME_NO_VILA_AUDIT.md` — auditoria detalhada da variante de `COM-01` sem vínculo de vila, explicitamente tratada como estado de primeira classe.
- `HOME_NO_VILA_PREMIUM_BRIEF.md` — brief de redesign sem violar D48 nem criar funil obrigatório de vila.
- `HOME_NO_VILA_WIREFRAME.md` — wireframe textual 375/768/1440 e estados obrigatórios, com vila como descoberta opcional.
