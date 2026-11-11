---
id: ADR-20261110-superficie-publica-do-proxy
status: Aceito
risk: R2
owner: Juan
approved_at: 2026-11-10
expires_at:
linked_plan: docs/agents/tasks/SEC-010.task.yml
critic_verdict: pending
critic_review:
---

# A superfície pública do proxy

## Problem

O `apps/web/proxy.ts` decidia o que era público com uma lista plana e uma
comparação de prefixo solta (`caminho.startsWith(entrada)`, sem fronteira de
segmento). Isso abria três classes de escape que o cartão PROXY-SURFACE-RISK
registrou:

- Prefixos que não são fronteira: `/apiario` casava `/api`, `/convite/ABCD1234`
  casava `/convite`, `/prestadorx` casava `/prestador` e `/auth/callback-falso`
  casava `/auth/callback`. Uma rota futura com nome vizinho entrava na
  superfície pública sem ninguém decidir.
- `/api` era público por prefixo sem que cada rota declarasse a própria
  postura. As 84 rotas de `apps/web/app/api/**/route.ts` tinham guardas
  diferentes (sessão, operador, segredo de worker, token de sessão, porta de
  entrada, catálogo, descadastro, infraestrutura) e nenhum lugar dizia qual era
  qual nem citava a prova negativa.
- `/landing` estava na lista pública sem existir `apps/web/app/landing/page.tsx`.
  O prefixo, porém, não era morto: ele protege os nove assets de
  `apps/web/public/landing/` usados pela landing anônima
  (`apps/web/app/landing/landing.tsx` e
  `apps/web/app/(preauth)/onboarding/components/onboarding-shell.tsx`). Remover
  o prefixo quebrava a landing; mantê-lo como página era mentira.
- `BIVAQUE_AUTH_BYPASS=true` devolvia `NextResponse.next()` antes de qualquer
  verificação, em qualquer `NODE_ENV`. Uma variável de ambiente esquecida em um
  ambiente compartilhado desligava o portão inteiro.
- `apps/web/next.config.ts` redireciona `/login`, `/signup`,
  `/recuperar-senha`, `/nova-senha` e toda a subárvore `/onboarding*` antes de o
  proxy rodar. A lista do funil em `apps/web/proxy.ts` (onboarding, status,
  documento, locality, perfil) fica inalcançável por HTTP — o comportamento
  configurado é o do redirect, não o do portão — e isso não estava registrado.
- A cobertura E2E do portão era só `/community` anônimo e `/api/health`.

## Decision

**Uma fonte única para a superfície pública, modos explícitos e postura por
rota.** O proxy deixa de ter lista própria; ele importa predicados de
`apps/web/lib/security/route-surface.ts`.

### 1. Modos da entrada pública

`PUBLIC_SURFACE` declara cada entrada com um modo:

- `exata` — casa o caminho e a variante com barra final (`/login`, `/login/`).
  Não casa subárvore. Usado em `/login`, `/signup`, `/recuperar-senha`,
  `/nova-senha`, `/auth/callback`, `/auth/callback-error`, `/consent`,
  `/privacidade`, `/codigo-de-conduta`, `/conta-apagada`, `/convite`, `/ajuda`,
  `/favicon.ico` e `/icon.svg`. `/auth/callback` e `/auth/callback-error` são
  entradas explícitas; `/auth/confirmar-email` **não** é pública e continua no
  portão.
- `pasta` — casa o caminho e a subárvore com fronteira (`/api`, `/api/...`).
  Usado em `/api`, `/prestador-convite` e `/app`.
- `ativos` — casa apenas a subárvore, nunca o caminho exato. Usado em `/_next`
  e `/landing`: são espaços de assets, não páginas.

`casaFronteira` é a comparação única: igualdade após normalizar uma barra final
ou `startsWith(`${base}/`)`. `isPublicPath` normaliza a barra inicial e aplica o
modo. `entradaEmAndamento` e `areaDoPrestador` são os dois allowlists internos
do funil e da área do prestador, também com fronteira.

### 2. `/landing` é espaço de assets, não página

- No proxy, `/landing` é modo `ativos`: `/landing/hero-bivaque-arrival.webp` e
  qualquer asset sob a pasta seguem públicos e respondem 200; `/landing` exato
  **não** é público, e `/landing/` também não casa.
- Em `apps/web/next.config.ts`, exatamente `/landing` redireciona para `/` com
  `permanent: false` (307), porque o redirect de configuração roda antes do
  proxy e do filesystem.
- Arquivo inexistente sob `/landing/` continua 404 pelo próprio servidor; não se
  cria `apps/web/app/landing/page.tsx`.

### 3. Bypass só em development

`BIVAQUE_AUTH_BYPASS=true` só entrega `NextResponse.next()` quando
`NODE_ENV === "development"`. Em `test`, `production` ou `NODE_ENV` ausente, a
resposta é 503 (`text/plain`), com `console.error` explícito e **sem**
`x-middleware-next`. Variável ausente ou `false` não muda nada. O comportamento
é provado nos quatro estados em
`tests/unit/onboarding/proxy-portao-do-app.test.ts`, inclusive que a resposta
não é `NextResponse.next`.

### 4. `/api` continua público no proxy, com postura declarada por rota

O proxy não ganha guarda de API; o portão de cada handler continua sendo o do
handler. O que muda é que
`apps/web/lib/security/api-surface.ts` classifica **exatamente as 84 rotas** de
`apps/web/app/api/**/route.ts` em oito posturas:

| Postura | Rotas |
| --- | --- |
| sessão pela porta da rota | 62 |
| operador | 4 |
| credencial de worker | 5 |
| token de sessão | 3 |
| porta sem sessão | 4 |
| catálogo público | 2 |
| descadastro por token | 1 |
| infraestrutura sem guarda | 3 |

Cada rota declara o marcador de guarda que existe no arquivo e cita uma prova
negativa real (teste existente ou o teste de runtime do próprio manifesto) ou
um motivo explícito de ser pública. `TOTAL_DE_ROTAS = 84`.
`tests/unit/security/api-surface.test.ts` falha se: uma rota do disco não estiver
classificada; o manifesto citar rota que não existe (órfã); o marcador não
aparecer no arquivo; a prova citada não existir; ou uma rota pública não tiver
motivo. Nenhum handler foi editado.

Reconciliação com a contagem do contrato (61 sessão, 4 operador, 5 worker,
4 token, 4 porta, 2 catálogo, 1 descadastro, 3 infra = 84): o avatar
(`/api/avatar/[userId]`) resolve a sessão inline e por isso entra em sessão,
levando 61 → 62; `/api/admin/admissions` confere `is_current_user_operator`
além do Bearer e por isso sai de "token de sessão" para "operador", levando
4 → 3. O total permanece 84.

### 5. Drift de redirect de configuração é registrado, não removido

`apps/web/next.config.ts` mantém os redirects de `/login`, `/signup`,
`/recuperar-senha`, `/nova-senha` e `/onboarding*`. Consequência: a decisão
dessas rotas é do redirect de configuração, e a lista do funil no proxy não é
observável por HTTP. O drift está registrado aqui e no corpo do PR; o E2E prova
a decisão do proxy nas rotas que a configuração não intercepta (`/community`,
`/prestadorx`, `/landing` exato e `/landing/*`) e afirma o drift em
`/onboarding/status` e `/onboarding/statusx` (ambas 307 para `/app/entrar`,
antes do portão). Remover os redirects é outro lote; este não o faz.

### 6. Prestador não perde alcance

`areaDoPrestador` aceita a subárvore `/prestador` e `/prestadores`. O cartão
proíbe ampliar a superfície, mas `/prestadores/[id]` já era alcançável pela
comparação solta anterior e é página real de membro
(`apps/web/app/(shell)/prestadores/[id]/page.tsx`, ligada em explorar/servicos,
negocio/business-form, pedidos/novo, city-reference e deep links). Fechar
`/prestadores` seria regressão de alcance, não endurecimento; `/prestadorx`
continua recusado.

## Alternatives considered

1. **Manter `startsWith` e corrigir cada escape quando aparecer.** Recusado: foi
   exatamente o padrão que produziu `/apiario`, `/convite/ABCD1234` e
   `/prestadorx`; a próxima rota vizinha reabre a mesma classe.
2. **Separar a lista em dois arquivos (exatas e prefixos) e importar os dois no
   proxy.** Recusado: mantém duas fontes de verdade e permite que uma entrada
   viva no arquivo errado; o teste de superfície não teria uma tabela única.
3. **Criar `apps/web/app/landing/page.tsx` para o prefixo ter página.** Recusado:
   o contrato proíbe criar página ou mover a landing; os assets já têm página
   anônima em `/`, e o redirect exato resolve a entrada.
4. **Remover `BIVAQUE_AUTH_BYPASS` de vez.** Recusado: o fluxo local de
   desenvolvimento depende dele; o contrato pede que ele funcione apenas em
   `development` e feche nos demais ambientes.
5. **Deixar `/api` implícito e não declarar postura.** Recusado: sem manifesto
   não há como provar que cada rota tem guarda ou motivo público, que é o
   requisito do cartão.
6. **Excluir `/landing` do matcher do proxy.** Recusado: os assets precisam
   passar pelo proxy e continuar públicos; esconder o prefixo não declara a
   superfície, só a torna invisível.

## Market or reference baseline

Proxies e middlewares de mercado casam caminho por fronteira de segmento, não
por `startsWith` textual: `pathname === base || pathname.startsWith(`${base}/`)`
é a convenção; casar `/api` com `/apiario` é o erro clássico. A documentação
instalada do Next não está presente neste checkout em
`apps/web/node_modules/next/dist/docs` (diretório ausente), então esta decisão se
apoia na convenção do framework e nas provas de runtime do repositório. O padrão
de cada rota de API declarar a própria postura é o mesmo do contrato da SPA ADR
§5, que já exige teste positivo e negativo por rota nova.

## Proposed divergence from baseline

O comportamento anterior era: lista plana com prefixo solto, `/api` público sem
manifesto, `/landing` público como se fosse página e bypass global. Divergimos
em quatro pontos deliberados: comparação por fronteira; `/landing` como espaço
de assets com redirect exato 307; `/api` público com postura declarada por rota;
bypass restrito a `development` com 503 fora dele. O resto da superfície e todos
os handlers permanecem como estavam.

## Evidence and sources

- `apps/web/proxy.ts` (antes): `PUBLIC_PATHS` nas linhas 6-40, comparação solta
  em 48-54, bypass em 60-71 sem guarda de `NODE_ENV`, allowlist do funil em
  165-173.
- `apps/web/next.config.ts` (antes): `ENTRADA_ANTIGA` em 11-18, redirects em
  61-122, comentário de precedência do redirect em 55-60.
- `apps/web/public/landing/` com nove assets, consumidos por
  `apps/web/app/landing/landing.tsx:223-365` e
  `apps/web/app/(preauth)/onboarding/components/onboarding-shell.tsx:89`.
- `tests/unit/onboarding/proxy-portao-do-app.test.ts:10-32` (antes) só cobria
  `/app` e não conhecia `/landing`.
- `tests/scope/entrada-public-paths.test.mjs:17-24` (antes) reimplementava o
  prefixo solto; `:32` afirmava `/convite/ABCD1234`, subrota que não existe (o
  convite real é `apps/web/app/(preauth)/convite/actions.ts:255`,
  `/convite?codigo=...`).
- Inventário medido das 84 rotas: 62 de sessão (61 chamadas de `exigirSessao(`
  mais `/api/avatar/[userId]` inline), 4 de operador, 5 de credencial de worker,
  3 de token de sessão, 4 de porta sem sessão, 2 de catálogo público, 1 de
  descadastro por token, 3 de infraestrutura sem guarda.
- Provas locais nesta entrega, na worktree `fix/proxy-surface`:
  `node scripts/agents/task-contract.mjs docs/agents/tasks/SEC-010.task.yml` →
  ok (R2, retry 2);
  `vitest run --pool=threads tests/unit/security/route-surface.test.ts
  tests/unit/security/api-surface.test.ts
  tests/unit/onboarding/proxy-portao-do-app.test.ts
  tests/unit/onboarding/onboarding-proxy-allowlist.test.ts` → 138 testes verdes
  em 4 arquivos;
  `node tests/scope/entrada-public-paths.test.mjs` → 13 verdes;
  `node tests/scope/app-foundation.test.mjs` → 4 verdes;
  `tsc -p tests/e2e/tsconfig.json` → exit 0. O `node --test` do script de
  escopo e o `gate`/`test:e2e` completos ficam para o CI: o sandbox local recusa
  spawn com stdio em pipe (EPERM) e não há Docker/Supabase local.
- Correção de escopo no HEAD 1ae1dc20 (`test(escopo): le a superficie publica
  no modulo novo`): o teste `tests/scope/app-foundation.test.mjs` ainda exigia
  `PUBLIC_PATHS` no proxy; passou a ler `route-surface.ts`, e o arquivo entrou
  no `allowed_paths` do contrato. A revisão independente acompanhou a mudança.

## Benefits

- Uma rota nova só fica pública por decisão explícita em uma tabela revisável.
- Rota nova de API não entra sem postura, marcador e prova: o teste quebra no CI.
- A landing anônima continua servindo seus assets; a entrada `/landing` passa a
  ser um redirect determinístico para `/`.
- Uma variável de bypass esquecida em `test`/`production` fecha o portão com 503
  visível em vez de abrir tudo.
- O drift de configuração deixa de ser surpresa: está escrito e provado.

## Risks

- `permanent: false` mantém o redirect reversível, mas clientes que guardam 307
  podem repetir por um tempo; é o comportamento desejado para uma rota antiga.
- O 503 do bypass fora de `development` pode quebrar um E2E ou ambiente que
  dependia da variável; o erro é explícito no log e no corpo, e é intencional.
- `/landing/*` inexistente passa a 404 pelo servidor — antes também não havia
  arquivo, mas a prova agora é explícita no E2E.
- O manifesto cita provas compartilhadas para rotas cujo handler não tem teste
  dedicado; a defesa é o teste de runtime do próprio manifesto, que chama as
  rotas sem credencial. Se um handler mudar de guarda, o marcador quebra o teste.
- Enquanto os redirects de configuração existirem, a lista do funil continua
  inalcançável por HTTP; o comportamento do usuário é o do redirect, e o E2E
  afirma isso em vez de fingir que o portão decide.

## Reversal cost

Baixo: reverter `apps/web/proxy.ts`, `apps/web/lib/security/route-surface.ts`,
`apps/web/lib/security/api-surface.ts`, `apps/web/next.config.ts` e os quatro
testes; não há schema, migração, dado ou contrato de API alterado. O ADR passa a
`Substituído` por outro. A única dívida que fica é lembrar que a lista do funil
não é observável por HTTP enquanto durar o drift.

## Success metric

- `npx pnpm@11.18.0 gate` e `npx pnpm@11.18.0 test:e2e` verdes na revisão
  entregue.
- O teste do manifesto falha quando uma rota de API é criada sem classificação,
  quando uma classificação fica órfã ou quando o marcador desaparece do arquivo.
- Nenhum asset de `apps/web/public/landing/` deixa de responder 200 e `/landing`
  exato responde 307 para `/`.
- Nenhum handler de `apps/web/app/api/**/route.ts` é alterado por este lote.

## Reopen condition

Reabrir esta decisão se: uma nova entrada pública for necessária; uma rota de
API precisar sair de `/api` público ou ganhar postura nova; o Next mudar a
semântica de matcher/proxy; os redirects de configuração forem removidos e a
lista do funil passar a ser alcançável; ou o bypass passar a ser necessário em
ambiente que não seja `development`.

## Approval

Lote SEC-010 (PROXY-SURFACE-RISK), risco R2, autorizado pelo contrato
`docs/agents/tasks/SEC-010.task.yml` validado em 2026-11-10
(`node scripts/agents/task-contract.mjs` → ok, R2, retry 2). A revisão
independente registra `critic_verdict` no cartão PROXY-SURFACE-RISK antes do
merge; o cartão só vira `done` no merge do coordenador. R2 não exige
`security-auditor` porque este lote não toca banco, migração, RLS nem credencial
de worker.