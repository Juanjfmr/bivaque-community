# Registro de testes — que camada prova o quê

> Entregável do gate da etapa **W00** ("registro de rotas/testes"). Mapa inverso do
> [inventário de rotas](INVENTARIO-ROTAS-WEB-2026-09-08.md).
>
> **Revisão confrontada:** `44c1d4b` · **Data:** 08/09/2026.
> **Método:** leitura estática. Este é o mapa do que existe, **não** evidência de execução.

---

## 1. Camadas e o que cada comando realmente roda

| camada | comando | arquivos | cobre |
|---|---|---|---|
| `test:unit` | `vitest run tests/unit` | 64 | Lógica pura de `web/lib/**` e varreduras estáticas sobre `apps/web/app/**` |
| `test:privacy` | `vitest run tests/privacy` | 9 | Redação de PII em DM, logs, notificações e denúncias; CPF fora de `sessionStorage` |
| `test:scope` | `node --test tests/scope/*.test.mjs` | 21 | Contratos de repositório travados |
| `test:secrets` | `node tests/secrets-scan.mjs` | 1 | CPF numérico, JWT e chave inline em arquivo rastreado |
| `test:e2e` | `playwright test` | 41 | Navegador real contra servidor construído, em 375/768/1440 |
| `test:db` | `supabase test db` | 94 | pgTAP sobre RLS, RPCs, triggers e grants — **1116 asserts declarados** |

### O que o gate prova, e o que não prova

`npx pnpm@11.18.0 gate` roda, parando no primeiro vermelho:
**`lint` → `typecheck` → `test` (unit + privacy + scope) → `test:secrets`**.

**Não roda:** `test:e2e`, `test:db`, `db:lint`, `build`, drift de tipos gerados, loop visual.

> **Consequência que precisa ficar escrita:** *gate verde não prova nenhuma política RLS, nenhuma
> rota renderizando, nenhum caminho de sessão real.* `--fast` corta ainda `test` e `test:secrets`,
> restando lint + typecheck — e não autoriza declarar nada pronto.
>
> Esta sessão comprovou o limite na prática: o bug `profiles.id` passou por `gate` verde e por
> `typecheck` verde, e só apareceu quando um servidor real renderizou a rota. O client SSR do
> layout é instanciado sem o genérico `<Database>`, então nome de coluna não é verificado.

---

## 2. Contratos travados por teste de escopo

Um plano não pode contradizer estes sem mudar o teste — e mudar o teste é decisão explícita, não
efeito colateral.

| arquivo | contrato |
|---|---|
| `navigation.test.mjs:42` | `NAV_ITEMS` é exatamente `inicio/explorar/comunidades/perfil`; teto de 5; nenhuma aba para destino dobrado |
| `workspace-foundation.test.mjs:54,71` | Raízes de workspace; **Next no runtime servidor** (`output:"export"` proibido); **HeroUI como única biblioteca** |
| `design-tokens.test.mjs:16,81,124` | Conjunto canônico de tokens; paleta autorizada em 06/09; cor fora de estilo inline; camadas primitiva/semântica/componente; motion com reduced-motion |
| `design-typography.test.mjs:30,129` | Sete papéis tipográficos; fonte variável local com fallback métrico; nenhuma requisição externa de fonte |
| `design-contrast.test.mjs:58,76` | Todo par texto/superfície documentado atinge WCAG AA; desabilitado **sem opacidade**; não-texto em 3:1 |
| `design-vendor-theme.test.mjs:122,254` | Variáveis do HeroUI resolvem pela paleta Bivaque; repouso ≠ hover; produto não consome alias só-adaptador |
| `design-system-contract.test.mjs:10,88` | `DESIGN_SYSTEM.md` é canônico; documentos legados redirecionam; stylesheet gerada da fonte |
| `rls-structure.test.mjs:71,87,106` | Nenhuma policy consulta a relação que guarda; nenhuma referencia relação de migration posterior; toda função chamada de policy é `security definer` |
| `rls-probe-contract.test.mjs:29,55` | Sonda RLS no caminho canônico; handler não importa service-role; resposta nunca ecoa linhas |
| `no-pilot-locality.test.mjs:130,172` | Nenhuma referência executável a localidade-piloto; resolver vive no `locality-context` |
| `consent-version.test.mjs:53,97` | Versão de consentimento só de `@bivaque/domain`; nenhum spec declara o próprio valor de cookie |
| `admission-mode.test.mjs:28,47` | Default `verification_gated`; nenhuma localidade nasce `waitlist_only` |
| `auth-deep-link.test.mjs:34,46` | Callback nativo na lista de redirect; sem wildcard de esquema; cliente nativo usa PKCE |
| `supabase-config.test.mjs:8` | `[inbucket]`, não `local_smtp` (CLI 2.107) |
| `local-command-surface.test.mjs:26,38` | Superfície de comandos; pin de Playwright e Supabase CLI; três projetos de viewport |
| `deploy-migrations.test.mjs:8,25` | Migration de produção só a partir do CI, depois do gate; nenhum comando local liga a produção |
| `bash-guard.test.mjs:44,62,75` | Guarda de comando destrutivo; `--linked` só leitura; payload ilegível falha fechado |
| `secrets-scan.test.mjs:29` | O scanner existe e roda limpo no repo real |
| `agent-architecture.test.mjs:93,167` | Sete papéis; papéis read-only não escrevem; **`retry_budget` esgotado nunca vira PASS** |
| `backend-kanban.test.mjs:20,71` | Board válido; sumário gerado, nunca editado à mão |
| `support-channel.test.mjs:12,22` | Canal de suporte declarado; placeholder nunca embarca em produção |

---

## 3. Rotas sem cobertura funcional

"Varredura" = teste estático que percorre `apps/web/app/**` inteiro. **Não é cobertura funcional
da rota.** As rotas abaixo têm apenas isso, ou nada:

| rota | situação |
|---|---|
| `/prestador`, `/prestador/ficha` | Todo o contorno do prestador — papel com gate próprio no proxy — provado só por leitura estática |
| `/communities`, `/communities/[id]` | Container "Comunidades" da navegação nova, com escrita de pedido de membresia; só pgTAP no nível de RPC |
| `/prestadores/[id]` | Vitrine pública, com abertura de DM, nunca exercitada em navegador |
| `/communities/[id]/admin`, `.../admin/providers` | Console do moderador, inclusive revogação de prestador |
| `/prestador-convite/[token]`, `/communities/[id]/indicar-prestador` | Aceite e emissão de convite de prestador — ambas escritas |
| `/arrivals` | Console de operador; 8 asserts pgTAP e nenhum e2e |
| `/onboarding/welcome` | Exige A+M, não está na passagem do proxy, e não tem teste algum |
| `/explorar` | Scaffold já exposto como container de primeiro nível; nada garante que deixe de ser placeholder |
| `/privacidade`, `/codigo-de-conduta`, `/auth/callback-error` | Sem cobertura própria |
| `/signup`, `/recuperar-senha`, `/nova-senha` | Só leitura estática (`tests/unit/auth/password-login.test.ts:22-26`) |

**Route handlers sem e2e:** `/api/consent`, `/api/onboarding/status`, `/api/localities`,
`/api/localities/[uf]`, `/api/admin/{admissions,portal-health,rls-health,reports/[id]}`,
`/api/internal/{outbox,verification-reconcile}`, `/auth/callback`.

---

## 4. Autorização — onde a negativa existe e onde falta

O repositório leva a sério a regra "todo caminho de permissão precisa de teste positivo e
negativo": há matriz de negação em pgTAP (`authz-denied-matrix.sql`, 17 negativas em 21 asserts),
23 testes e2e de negativa em `manaus-pilot-denials.spec.ts`, e decisões isoladas em
`web/lib/security/*` com teste dos dois lados.

**Escritas sem teste de negativa:**

| escrita | risco |
|---|---|
| `respondInviteAction` (`events/event-invites-actions.ts:88-94`) | Escreve com `service_role`; autorização vive no `.eq("invitee_user_id", userId)` da query, não em policy. Soltar esse `.eq` vira escrita irrestrita **sem nada ficar vermelho** |
| `BIVAQUE_AUTH_BYPASS` (`proxy.ts:35`) | Escape total do gate; nenhum teste de escopo garante que fica `false` no build de produção |
| `notification-preferences-actions.ts` | `notification-preferences-honored.sql` tem 0 negativas |
| `event-invite-rpc-exposure.sql` | 6 asserts, **0 negativas** — expõe RPC de convite sem provar recusa |
| `avatar-actions.ts` (upload) | Negativa só de leitura; escrita coberta apenas por `storage-policies.sql` genérico |
| `document-actions.ts` (identidade) | 5 asserts / 3 negativas em pgTAP; sem e2e |
| `groups-public-private.sql` | 26 asserts, **1 negativa** para o par público/privado |

---

## 5. pgTAP

94 arquivos, **1116 asserts declarados** (soma dos `plan(N)`; nenhum `no_plan`). Fixtures
transacionais em `supabase/tests/fixtures/` (14 `.inc`).

Maiores: `full-regression.sql` (85) · `rls-or-column-regression.test.sql` (68) ·
`community-feed-denials.sql` (30) · `authz-allowed-matrix.sql` (29) · `dm-context-allowed.sql` (26) ·
`groups-public-private.sql` (26) · `onboarding-consent-waitlist.sql` (26) ·
`dm-context-denials.sql` (25) · `community-scope.sql` (24) · `post-scope-leak.sql` (24).

Rasos: `events-insert-returning.sql` (2) · `group-event-server-actions-snapshot.sql` (2, 0 neg) ·
`pg-cron-enabled.sql` (3) · `recommendations-health-scope.sql` (3) · `report-reporter-default.sql` (3).

---

## 6. Não determinado por leitura estática

- Se as suítes passam hoje — em particular `test:db` e `test:e2e`, que o gate não roda e que a CI
  está reprovando (ver [contratos pendentes](CONTRATOS-PENDENTES-W00-2026-09-08.md) §3).
- Se os 1116 asserts declarados batem com os executados.
- Se as varreduras estáticas de UI alcançam rotas dinâmicas (`[id]`, `[token]`).
