# HOME com vila — auditoria de conformidade e maturidade Premium

## Escopo

Página: `COM-01` — `/community`.

Variante auditada: membro autenticado, verificado, com localidade atual e **membership aprovada em uma vila/comunidade**.

Nesta variante, `CommunityPage` resolve a primeira comunidade aprovada do membro, usa `feed_community`, mostra o nome da vila no header da página, composer, ordenação `Recentes / Relevantes`, feed e `FeedRightRail` no desktop.

Este documento complementa `HOME_NO_VILA_AUDIT.md`. Vila é vínculo opcional: as duas variantes representam estados legítimos do produto, não etapas obrigatórias de uma progressão.

## Evidência de fonte

- `apps/web/app/(shell)/community/page.tsx` — resolução de membership, feed, sort, empty/error/loading e rail.
- `apps/web/app/components/bivaque/feed-composer.tsx` — entrada do composer.
- `apps/web/app/components/bivaque/feed-post.tsx` — post, reações, comentários, denúncia e modal de criação.
- `apps/web/app/components/bivaque/feed-right-rail.tsx` — eventos, grupos e boas práticas no desktop.
- `tests/e2e/vila-home.spec.ts` — membro aprovado da Vila Ajuricaba deve ver o feed da vila e post de alcance municipal.
- `docs/BIVAQUE.md §6.3` — feed da vila hospeda o ciclo semanal e mensal; cidade não vira timeline.

## Veredito de fonte

**Page Readiness desta variante: `NOT_READY`**.

A arquitetura central do feed é coerente com o produto, e há evidência positiva forte de escopo de publicação. Porém findings `HIGH` de state truth/recovery impedem promoção: falhas do rail e de comentários podem aparecer como vazios reais.

A prova visual/runtime em 375/768/1440 ainda é necessária para fechar dimensões de responsividade, foco, densidade, overflow e performance perceptível.

## Evidência positiva

### Escopo de publicação

O modal de criação apresenta o campo `Audiência` antes do commit e uma explicação textual do alcance:

- `Só os aprovados desta vila vão ler.`
- `Toda <cidade> — todos os membros verificados da cidade vão ler.`

Isso satisfaz a intenção de `DS-002`: audiência efetiva está exposta no contexto da decisão.

### Não ampliar audiência silenciosamente

Depois de publicar, `resetForm()` restaura `defaultCommunityId` em vez de zerar para cidade. Assim, uma segunda publicação não muda silenciosamente de vila para cidade. Isso satisfaz a intenção de `DS-003`.

### Moderação do post

O overflow de cada post oferece ocultar, compartilhar e denunciar; o fluxo de denúncia existe sem poluir a ação principal do card. Isso é compatível com o objetivo Premium de moderação profissional e confiança.

### Atualização otimista

Reações fazem update otimista e rollback em falha. A verdade final não fica falsa. O finding `PA-009` é sobre falta de feedback da falha, não ausência de reconciliação.

## Findings atribuídos

### PA-006 — Falha do right rail mascara-se como vazio

`FeedRightRail` ignora os objetos de erro de eventos/grupos. Se a consulta falha, arrays vazios são tratados como `Nenhum evento próximo` ou `Nenhum grupo ainda`.

- severidade: `HIGH`;
- regras: `DS-014`, `DS-015`;
- impacto: informação falsa sobre atividade e nenhum recovery;
- fechamento: estados independentes de loading/error/empty para eventos e grupos, com retry.

### PA-007 — Copy sem diacríticos

Há strings user-facing e accessible names sem acentos em `FeedComposer`, `FeedRightRail` e menu do post.

- severidade: `MEDIUM`;
- regra: `DS-035`;
- impacto: acabamento percebido, idioma e acessibilidade linguística;
- fechamento: corrigir copy e proteger regressão onde viável.

### PA-008 — Falha de comentários aparece como vazio real

`loadComments()` não lê `error`. Ao expandir comentários após falha, a UI pode dizer `Nenhum comentário ainda.`.

- severidade: `HIGH`;
- regras: `DS-014`, `DS-015`, `DS-027`;
- impacto: conversa existente pode parecer inexistente;
- fechamento: separar loading/error/empty e oferecer retry preservando input seguro.

### PA-009 — Reação falha sem explicar rollback

O rollback otimista ocorre, mas sem feedback.

- severidade: `MEDIUM`;
- regras: `DS-017`, `DS-027`;
- impacto: ação parece desaparecer ou não registrar;
- fechamento: feedback discreto e retry natural.

## Premium Maturity — leitura provisória de fonte

Não emitir score final desta variante até captura real. A fonte permite somente a seguinte leitura:

- **Visual e marca:** `PARTIAL` — estrutura e tokens existem; craft visual precisa de browser.
- **Usabilidade e navegação:** `PARTIAL` — feed, sort e ações são previsíveis; state truth do rail pesa negativamente.
- **Engajamento e comunidade:** `STRONG-SOURCE` — feed, comentários, reações, denúncia e publicação estão presentes e coerentes com os ciclos do produto.
- **Personalização e exclusividade:** `PARTIAL` — o feed é scoped à vila e inclui alcance municipal, mas recomendação/personalização ainda é limitada.
- **Confiança, acessibilidade e performance:** `PARTIAL` — audiência e moderação são pontos fortes; false-empty e copy impedem gate Premium.

## Hipóteses Premium a validar no browser

1. O composer + sort + primeiro post deixam a tarefa principal clara em <1s?
2. O feed mobile mantém densidade confortável sem parecer uma sequência de cards pesados?
3. `Recentes / Relevantes` realmente melhora descoberta ou adiciona controle sem valor (`EXP-006`)?
4. O desktop usa rail para valor real ou o conteúdo compete com o feed?
5. A presença de eventos e grupos no rail ajuda participação sem confundir escopo vila/cidade?
6. Reações, comentários, compartilhar e denúncia têm hierarquia adequada e targets/foco válidos?
7. O feed comunica por que vale retornar sem recorrer a gamificação artificial?

## Decisão para COM-01

Com as duas variantes auditadas por fonte, `COM-01` pode ser marcado `NOT_READY` sem esperar o browser: existem violações `HIGH` objetivas. A captura/runtime continuará necessária para confirmar o restante e para validar qualquer redesign.

O próximo trabalho sobre `COM-01` deve separar duas coisas:

1. **correção obrigatória de contrato:** PA-001, PA-002, PA-003, PA-006, PA-008 e os findings MEDIUM associados;
2. **evolução Premium:** somente depois, comparar composições e medir os perception gates sem tornar membership de vila obrigatória.
