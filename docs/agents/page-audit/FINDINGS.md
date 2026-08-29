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

- **Page IDs:** `COM-01` — variante sem vínculo de vila.
- **Dimensão:** `entry_exit_navigation`.
- **Severidade:** `HIGH`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-009`; Visual Guide §0 “Navegação — containers derivados do modelo”.
- **Evidência concreta:** `CommunityPage` renderiza `CityReference` em `/community` quando não há `primaryCommunityId`; `BottomNav` seleciona `community` para `/community`. O Visual Guide coloca eventos da cidade, guia e vitrine dentro de `Cidade`, enquanto `Minha comunidade` representa a home/feed da vila.
- **Impacto:** conteúdo e parent conceitual divergem. Isso reduz previsibilidade e findability. Como não pertencer a vila é um estado válido e potencialmente permanente, a inconsistência não pode ser tratada como fallback transitório.
- **Critério de fechamento:** escolher e provar uma solução coerente sem criar feed municipal — por exemplo, aterrissar/redirectar no container Cidade ou ajustar formalmente a estratégia de selected/landed state. Não criar quinta aba “Home” sem resolver `EXP-001`.
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

### PA-004 — Duas ações primárias `Publicar` competem na home sem vila

- **Page IDs:** `COM-01` — variante sem vínculo de vila.
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

### PA-006 — Falha do right rail mascara-se como conteúdo vazio

- **Page IDs:** `COM-01` — variante com vila aprovada, desktop.
- **Dimensão:** `state_model`, `interaction_feedback_recovery`.
- **Severidade:** `HIGH`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-014`, `DS-015`.
- **Evidência concreta:** `FeedRightRail` executa queries de eventos e grupos sem ler os objetos `error`; depois define `loaded=true` e interpreta arrays vazios como `Nenhum evento próximo` / `Nenhum grupo ainda`. Falha de query e vazio verdadeiro tornam-se indistinguíveis.
- **Impacto:** o usuário recebe informação factualmente falsa sobre atividade disponível e não tem caminho de recuperação.
- **Critério de fechamento:** capturar falhas por região, manter evento/grupo independentes e renderizar estado de erro com retry em vez de empty.
- **Correção:** pendente.

### PA-007 — Copy central do feed viola locale/diacríticos

- **Page IDs:** `COM-01` — variante com vila aprovada.
- **Dimensão:** `content_copy`.
- **Severidade:** `MEDIUM`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-035`; Visual Guide §0 “Copy e acentos”.
- **Evidência concreta:** `FeedComposer` expõe `No que voce esta pensando?` e `Nova publicacao com link`; `FeedRightRail` expõe `Proximos eventos`, `Nenhum evento proximo`, `Boas praticas`, `Nao publique conteudo...`, `Nao compartilhe...`; o menu do post contém accessible names como `Abrir menu da publicacao` e `Mais opcoes`.
- **Impacto:** erro ortográfico recorrente reduz acabamento percebido, acessibilidade linguística e classificação Premium.
- **Critério de fechamento:** corrigir toda copy/accessible name user-facing tocada pelo feed para português com diacríticos corretos e adicionar proteção de teste quando praticável.
- **Correção:** pendente.

### PA-008 — Falha ao carregar comentários aparece como “Nenhum comentário ainda”

- **Page IDs:** `COM-01` — variante com vila aprovada.
- **Dimensão:** `state_model`, `interaction_feedback_recovery`.
- **Severidade:** `HIGH`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-014`, `DS-015`, `DS-027`.
- **Evidência concreta:** `loadComments()` lê apenas `data` e ignora `error`. Ao abrir comentários, se a query falhar, `comments` continua vazio e o bloco expandido renderiza `Nenhum comentário ainda.` sem retry.
- **Impacto:** falha de backend é apresentada como ausência real de conversa, apagando atividade potencial e confiança no feed.
- **Critério de fechamento:** introduzir estado de loading/error de comentários separado de empty e permitir retry sem perder o texto de comentário digitado.
- **Correção:** pendente.

### PA-009 — Falha de reação reverte silenciosamente sem feedback

- **Page IDs:** `COM-01` — variante com vila aprovada.
- **Dimensão:** `interaction_feedback_recovery`.
- **Severidade:** `MEDIUM`.
- **Status de evidência:** `FAIL-SOURCE`.
- **Regra:** `DS-017`, `DS-027`.
- **Evidência concreta:** `handleReaction()` aplica atualização otimista e, se Supabase falha, restaura `myReaction`/`reactionCount` sem qualquer mensagem ou estado de erro para o usuário.
- **Impacto:** a verdade final é reconciliada, mas o usuário não sabe por que a ação “desfez”, o que parece instabilidade ou toque perdido.
- **Critério de fechamento:** manter rollback e adicionar feedback discreto, persistente o bastante para explicar a falha e permitir nova tentativa natural.
- **Correção:** pendente.

## Evidência positiva de COM-01

- O composer expõe `Audiência` no mesmo contexto da publicação e explica explicitamente `Só os aprovados desta vila vão ler` versus `Toda <cidade>`. Isso atende a intenção de `DS-002`.
- `resetForm()` preserva `defaultCommunityId`, evitando que uma segunda publicação na sessão amplie silenciosamente da vila para a cidade. Isso atende a intenção de `DS-003`.
- Reação otimista faz rollback em falha, preservando verdade de estado; PA-009 trata especificamente a ausência de feedback, não false success persistente.

## Auditorias associadas

- `HOME_NO_VILA_AUDIT.md` — variante de `COM-01` sem vínculo de vila.
- `HOME_NO_VILA_PREMIUM_BRIEF.md` — brief de redesign sem violar D48 nem tornar vila obrigatória.
- `HOME_NO_VILA_WIREFRAME.md` — wireframe textual 375/768/1440 e estados obrigatórios.
- `HOME_COM_VILA_AUDIT.md` — variante de `COM-01` com vila aprovada/feed.
