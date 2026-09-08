# W00 — Baseline, contratos e fundação: fechamento

> Etapa **W00** da [especificação funcional](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md) §7.
> **Revisão:** `44c1d4b` · **Branch:** `work/apos-entrada-visual` · **Data:** 08/09/2026.
> **Card:** `RECON-W00-FUNDACAO`.

---

## 1. Gate de saída, item a item

> Texto do gate: *"Rotas existentes sem regressão; navegação nova com destinos reais disponíveis;
> inventário de endpoints/permissões; contratos técnicos pendentes nomeados. Demo de componentes
> não conta como Início/Explorar prontos."*

| Item | Estado | Evidência |
|---|---|---|
| Rotas existentes sem regressão | **cumprido** | `node scripts/visual/loop.mjs` → `ITERATION COMPLETE`, 0 finding de severidade high, captura em 375/768/1440 (`.visual/2026-09-08T14-07-24-591Z`). Gate completo verde |
| Navegação nova com destinos reais | **cumprido** | `NAV_ITEMS` = `inicio/explorar/comunidades/perfil`, travado em `tests/scope/navigation.test.mjs:42`; as quatro rotas existem e respondem; `proxy.ts` manda o membro consentido para `/inicio` |
| Inventário de endpoints/permissões | **cumprido** | [`INVENTARIO-ROTAS-WEB-2026-09-08.md`](INVENTARIO-ROTAS-WEB-2026-09-08.md) — 46 páginas, 16 handlers, 22 arquivos de action, árvore de decisão do proxy, links de menu, deep-links de notificação e de e-mail |
| Contratos técnicos pendentes nomeados | **cumprido** | [`CONTRATOS-PENDENTES-W00-2026-09-08.md`](CONTRATOS-PENDENTES-W00-2026-09-08.md) — quatro decisões R3, seis dependências de ambiente, estado medido da CI |
| Reconciliar trabalhos existentes e cards | **cumprido** | Seis cards novos + card da etapa; `board.mjs --check` válido, 63 cards, sumário sincronizado |
| Validar tokens/HeroUI/wrappers | **cumprido, com drift registrado** | §2 abaixo |
| Registro de rotas/testes | **cumprido** | [`REGISTRO-TESTES-2026-09-08.md`](REGISTRO-TESTES-2026-09-08.md) |
| Demo de componentes não conta como Início/Explorar prontos | **respeitado** | A página-demo **não foi construída**, e `/inicio` e `/explorar` permanecem declaradamente scaffold — card `RECON-W00-PLACEHOLDERS`, fecham em W03 e W02 |

---

## 2. Validação de tokens, HeroUI e wrappers

**Tokens — conforme.** `node scripts/tokens/generate.mjs --check` sai 0: `tokens.css` não divergiu
de `tokens.json`. Não existe lista de exceção em `tests/scope/design-tokens.test.mjs` — a dívida
que o contrato DS-005 mandava remover **saiu**, e as telas de chegada são cobradas pela mesma regra
do resto.

**A validação é mecanizada, não opinião.** Cinco testes de escopo, todos verdes nos 96:

- `design-tokens` — conjunto canônico, paleta de 06/09, três camadas, cor fora de estilo inline, motion com reduced-motion
- `design-typography` — sete papéis, fonte variável local com fallback métrico, nenhuma requisição externa
- `design-contrast` — todo par documentado em WCAG AA, desabilitado **sem opacidade**, não-texto em 3:1
- `design-vendor-theme` — variáveis do HeroUI resolvem pela paleta Bivaque, repouso ≠ hover, produto não consome alias só-adaptador
- `design-system-contract` — `DESIGN_SYSTEM.md` canônico, legados redirecionam, stylesheet gerada da fonte

**HeroUI como única biblioteca** está travado em `tests/scope/workspace-foundation.test.mjs:71`.

### Drift de documentação encontrado

O `AGENTS.md` da raiz afirma que *"todo primitivo em `apps/web/app/components/bivaque/` é um
wrapper fino e token-aware sobre um sub-componente HeroUI v3"* e documenta uma tabela de **6**.

Existem **22** arquivos no diretório, e **6 deles não importam HeroUI**: `empty-state.tsx`,
`feed-right-rail.tsx`, `illustrations.tsx`, `page-header.tsx`, `service-worker-registration.tsx`,
`supabase-auth-provider.tsx`. Alguns não são primitivos (`app-shell`, `city-reference`, `feed-post`,
`chat-thread`, `recommendation-requests` são superfícies compostas).

A afirmação do `AGENTS.md` é falsa como escrita, e a tabela cobre menos de um terço do diretório.
Não bloqueia W00 — é documentação, não comportamento —, mas induz a erro quem procurar "o wrapper
que já existe" antes de criar um novo. Registrado no card `DOC-WRAPPERS-DRIFT`.

---

## 3. Limite honesto desta entrega

**O gate não prova o que parece provar.** `npx pnpm@11.18.0 gate` roda lint → typecheck →
unit/privacy/scope → secrets. **Não roda** e2e, pgTAP, `db:lint`, build, drift de tipos, nem o loop
visual. Gate verde não prova política RLS, rota renderizando, nem caminho de sessão real.

Esta sessão comprovou o limite: o bug `profiles.id` — coluna inexistente na query que o layout do
shell passou a fazer — atravessou `gate` verde **e** `typecheck` verde, e derrubou com 500 **toda
rota autenticada**. Só apareceu quando um servidor real renderizou a página. Causa: o client SSR do
layout é instanciado sem o genérico `<Database>`, então nome de coluna não é verificado em tipo.
A lição operacional está no [registro de testes](REGISTRO-TESTES-2026-09-08.md) §1.

**Revisão independente não aconteceu.** O gate **G5** da especificação diz que implementador,
revisor e verificador de runtime são papéis distintos, e que *"um coordenador que implementou
acabamento não revisa independentemente esse mesmo acabamento"*. Nesta etapa o mesmo agente
escreveu contratos, revisou o diff do executor externo, corrigiu, poliu e adjudicou a própria
evidência. Por isso o estado de tudo o que W00 entregou é **"implementado; revisão independente
pendente"** — não concluído no sentido do G5.

**CI vermelha.** 8 execuções consecutivas com falha no Pull Request CI e `Deploy migrations`
vermelho na `main`; as falhas são de `/consent`, anteriores a este trabalho e presentes na `main`.
Pelo gate **G4**, nenhuma etapa fecha com prova de CI enquanto isso não for resolvido.

---

## 4. O que W00 entregou

| Commit | Entrega |
|---|---|
| `de2d7e5` | Containers de navegação trocados para Início/Explorar/Comunidades/Perfil; scope test, `DESIGN_SYSTEM.md` §7.1 e nota de supersessão no ADR-20260816 na mesma unidade |
| `8fa1a86` | Rota `/inicio` e redirect da raiz; specs E2E de navegação realinhados |
| `b502c10` | Rota `/explorar` |
| `6da3839` | a11y e layout de `/consent` — 12 findings high zerados, rótulo do checkbox sem interativo aninhado, `.note` corrigido |
| `a710a44` | Especificação funcional de outra sessão preservada e adotada como autoridade |
| `79b3e42` | Plano renomeado G0 → W00, supersessões marcadas |
| `7dddcaf` | **Correção de autorização** nas actions de admissão + decisão isolada em `lib/security/` + 6 testes |
| `6d998a7` | Sidebar do shell com identidade, comunidades e não-lidas reais |
| `265f64d`, `c1622df` | Inventário de rotas e seis cards dos achados |
| `44c1d4b` | Contratos R3 e ambientes |

**Dívida deixada aberta, com card:** `RECON-W00-PLACEHOLDERS` (`/inicio` e `/explorar` fecham em
W03 e W02) · `SHELL-BELL-DEAD` · `SHELL-SETTINGS-LABEL` · `OUTBOX-INVITE-RECIPIENTS` ·
`NOTIF-DEEPLINKS` · `PROXY-SURFACE-RISK` · `DOC-WRAPPERS-DRIFT`.

---

## 5. O que W01 encontra primeiro

1. **Decisão R3 sobre processamento de identidade por IA** — sem ADR. Ou W01 fecha com o caminho
   manual (CPF → upload → decisão de operador, que já existem) e a IA fica nomeada como pendência,
   ou W01 fica bloqueada. É decisão do responsável.
2. **Resend não configurado** — sem ele, confirmação de e-mail não tem prova de entrega real.
3. **CI vermelha** — nenhuma prova externa de W01 vale enquanto a base não estiver verde.
4. `ADR-20260907-login-com-senha` e `ADR-20260907-consentimento-no-cadastro` estão `approved`:
   entrada é **e-mail e senha** com Google, e o aceite integra o cadastro. A prancha 36 mostra
   fluxo por código; a decisão posterior prevalece.
