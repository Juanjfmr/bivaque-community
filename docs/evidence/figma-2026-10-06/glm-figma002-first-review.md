# Parecer de revisão independente — FIGMA-002

**Candidato:** worktree sujo (nada committado) sobre a revisão `b9faf50c282dc432240de867da0692486c4f4563` (`runnerRevision` gravado nos próprios artefatos de prova; `runnerDirty: true`). Delimitei o lote pelo delta mecânico da coordenação **e** por verificação própria de hash: 40 blocos rastreados idênticos ao baseline; os 4 alterados são exatamente `app-shell.tsx`, `capture.mjs`, `packages/domain/src/index.ts`, `supabase/database.generated.ts`. Confirmou-se byte a byte que o lote **não** tocou `messages/page.tsx`, `chat-thread.tsx`, `bottom-nav.tsx`, e2e's do 001, docs, tokens, mobile, landing, pnpm-lock. Os untracked do lote estão todos dentro de `allowed_paths`; os dois arquivos da emenda (`conversas-loaders.ts`, `conversation-screen.tsx`) mudaram apenas no contexto `listing`.

## Estágio 1 — contrato (FIGMA-002.task.yml)

| Aceitação | Onde | Status |
|---|---|---|
| Migration única cria as 4 tabelas + RLS enabled+forced + grants mínimos; escopo e policies juntos | `supabase/migrations/20261006083013_listings_property_domain.sql:33-369` (5 tabelas com force RLS :345-354; grants :358-369; escopo `locality_id`/`community_id` :41-42 + policies na mesma migration) | ✓ (o valor do enum vem em `…083004.sql` separado, justificado por 55P04 — procedente) |
| Busca só `active` + público alcançado, filtro tipo e texto | `apps/web/lib/listings/loaders.ts:27-44` (`.eq("status","active")` + RLS); chips e `q` em `imoveis/page.tsx:21-47` | ✓ |
| Próprio anúncio com interesse desabilitado e motivo | `imoveis/[id]/page.tsx:98-108` ("Este é seu anúncio."); e2e `imoveis.spec.ts:126` | ✓ |
| Detalhe: fotos ordem/capa, especificações, custos anuláveis honestos, estado atual | `imoveis/[id]/page.tsx:32-110`; D6 em `lib/listings/format.ts:44-63` + `packages/domain/src/index.ts` (`informedTotalCents`, null→"Consultar anunciante") | ✓ |
| Publicação valida cliente E servidor; draft→active por escrita autorizada; revisão não persiste | cliente `listing-publish-modal.tsx:97-132`; servidor `actions.ts:102-119,199-288`; revisão client-only — e2e `imoveis.spec.ts:115-118` prova que nada grava antes do confirmar | ✓ |
| Edição muda tudo exceto público; pausar/reativar/encerrar idempotentes gravados | `listing-edit-form.tsx:43-62,228-241` (público disabled + motivo D3); matriz + história em `083013:289-341`; idempotência por `is distinct from` | ✓ |
| ≤12 fotos, ordem/capa, 13ª negada no servidor, EXIF removido na entrada | cota com `for update` em `…094544:14-53`; EXIF byte a byte `packages/domain/src/image-exif.ts` aplicado em `actions.ts:160`; e2e baixa o objeto guardado e confere ausência de Exif (`imoveis.spec.ts:379-388`) | ✓ |
| Interesse abre/reencontra conversa contextual listing, idempotente, visível na central 001 | RPC `register_listing_interest` (`083013:739-799`, par único + `on conflict do nothing`); emenda: `conversas-loaders.ts:56,72-73` + `conversation-screen.tsx:138-144`; e2e duas pontas + "Ver conversa" + exatamente 1 conversa (`imoveis.spec.ts:144-172`) | ✓ |
| pgTAP positivo e negativo (fora do público, pausado, 13ª foto, edição de público) | `supabase/tests/listings-property.test.sql` — 55 asserts; os 4 negativos nomeados em :104-117, :190-195, :249-255, :369-390, mais anon/terceiro/matrizes | ✓ |
| e2e publicar→buscar→detalhe→interesse→conversa + negação por chamada direta | `imoveis.spec.ts` — update direto 0 linhas :175-183, replay da action de remoção como outro usuário :410-423, RPC negado fora do público :315-318 e pausado :452-454 | ✓ |
| Capturas autenticadas 375/768/1440 comparadas às pranchas property-* | shots existem (e2e: publish/review/detail/edit/list ×3; capture: list/detail/edit ×3, `valid: true`, 0 high) | **parcial** — ver lacunas |

**Forbidden:** nenhum violado. Sem endereço/número/coordenada em coluna ou tela (só bairro); sem soma inventada; público imutável; sem conversa duplicada; sem reset de stack compartilhado (pgTAP em stack isolada 55722 sem seed; e2e em 55621/3012 com cleanup por id); nada de deploy/push.

## Provas verificadas por mim nesta sessão (leitura dos artefatos, não de relatório)

- `figma002-runtime/gate-final.log`: **GATE VERDE** — lint 567 arquivos, typecheck 5 workspaces, build (rotas `/imoveis`, `/imoveis/[id]`, `/imoveis/[id]/editar`, `/imoveis/[id]/fotos` no build), 605 unit + 189 privacy + 107 scope, secrets limpos.
- `orchestration/figma002-db-proofs/pgtap-run8.log`: `listings-property.test.sql ... ok` (55 asserts) e **"All tests successful."** na stack isolada sem seed.
- `figma002-runtime/e2e-origin-fix-12pass.log`: **12 passed** (4 testes × 3 viewports) na porta isolada 3012.
- Capturas: `report.json` `valid: true`, `high: 0`, ator member, rota real.

## Achados (arquivo:linha + severidade)

1. **[MÉDIO — integridade] Bypass do invariant "publicar exige ficha" no caminho INSERT.** `20261006083013_listings_property_domain.sql:317-319` cria `listings_guard` como `before update` apenas. A policy de insert (`…090042:11-30`) permite ao dono inserir direto com `status='active'` e `kind='property'` **sem** `property_details` — o pgTAP prova só o caminho UPDATE (:456-461). Efeito: anúncio ativo sem ficha entra na contagem de resultados mas não renderiza card (`imoveis/page.tsx:53` conta linha; :63-64 pula sem details) e o detalhe 404. Dono só prejudica a si — não é vazamento —, mas o comentário da migration ("Publicar Moradia exige a ficha satélite") não vale no INSERT. Corrigir com guard `before insert` (ou forçar `draft` no insert / restringir insert ao RPC) + assert negativo.
2. **[MÉDIO — processo] Transição de quadro ausente.** `tools/backend-kanban/public/board.json` e `BOARD.md` são byte-idênticos ao baseline (fora dos 4 headers alterados). O lote entrega domínio R3 inteiro com prova; AGENTS.md exige a transição material "no mesmo commit" e `allowed_paths` até lista o board. O FIGMA-001 também não registrou — a corrente FIGMA está invisível ao kanban. Precisa entrar antes/na hora do commit (card novo ou entrada no RECON-PRANCHAS-RESTANTES com os ponteiros de evidência).
3. **[BAIXO — fidelidade] "Salvar rascunho" não existe na publicação** (`listing-publish-modal.tsx:379-405`: Cancelar/Revisar). A prancha property-publish (nó 51:3136) desenha "Salvar rascunho" + "Revisar publicação". O conceito existe internamente (`defer_activation`, retomada), mas sem affordance ao usuário. Item de acabamento do card.
4. **[BAIXO] IPTU não é coletado em nenhuma tela** (publish não tem campo; edit carrega escondido `listing-edit-form.tsx:90-92`). As pranchas não o desenham e a tela mostra "Consultar anunciante" — honesto; registrar como pendência de produto, não defeito.
5. **[BAIXO] Elementos da prancha property-detail ausentes**: map-card "Localização aproximada"/"Ver bairro no mapa", "Quem está anunciando", "Reportar anúncio", "Salvar"/"Compartilhar" (`references/property-detail.md:494-629`). Fora da aceitação, mas "Reportar anúncio" toca moderação — registrar no card.
6. **[DUVIDOSO — baixo] Ator da história quando `auth.uid()` é nulo** cai para o dono (`083013:333`). Sem writer privilegiado hoje; verdade de auditoria levemente frágil.
7. **[DUVIDOSO — baixo, preexistente] RPCs/triggers SECURITY DEFINER dependem de `postgres` contornar FORCE RLS** — válido no stack local (superuser), herança do padrão `open_conversation` (20260825); comportamento em plataforma hospedada não é provado por este lote nem pelo 001.
8. **[DUVIDOSO — produto] Interesse em par que já tem conversa de outro contexto** reusa a conversa do par sem re-rotular como `listing` (`083013:784-788`, mesmo idioma de `20260825:117-120`). O thread então exibe o contexto original ("Grupo em comum"), não "Anúncio de imóvel". Consistente com o modelo par-único existente e com "abre ou reencontra" (D4), mas a emenda "contexto listing no thread" só vale para conversa nascida de listing. Vale registro explícito.
9. **[BAIXO — escala] Busca sem paginação/limite** (`loaders.ts:27-44`). Sem exigência no contrato; anotar para o futuro.

## Lacunas de prova explícitas

- **Fidelidade visual não verificada por mim**: os `report.json` registram `"fidelity": "not-assessed"` e **este modelo não consegue ler PNG nesta sessão** (erro "does not support image input"). Inspecionei a tradução estrutural via exports `.md` das pranchas (anatomia, rótulos, tokens) contra o JSX/CSS — bate — mas **não alego fidelidade visual**; a comparação formal contra as pranchas property-* permanece em aberto para a auditoria visual.
- `db:lint` não tem log no lote (prova listada: task-contract ✓ via gate, gate ✓, test:db ✓, e2e ✓, capture ✓; `db:lint` ausente).
- Board sem transição (achado 2).

## Veredito

**PASS-COM-RESSALVA.** O contrato de aceitação está cumprido com provas reais que li nesta sessão (gate verde, 55 asserts pgTAP, 12/12 e2e, capturas válidas), sem violação de `forbidden` e sem escrita fora do escopo. As ressalvas que impedem o PASS limpo: o **guard de INSERT** (achado 1, com o mismatch contagem/grade como sintoma) e a **transição de quadro** (achado 2) devem entrar no mesmo commit do lote. Meu parecer não fecha a tarefa — fechamento exige a prova de runtime consolidada e a auditoria visual que eu não pude executar.