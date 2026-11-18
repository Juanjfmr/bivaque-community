# ADR-20261118-convite-familiar-so-no-app

Status: Aceito por delegação — aguarda ratificação

Data: 18/11/2026

## Contexto

O RUN-187 (PR #278) achou a tela antiga `/convite` do convite de familiar ainda servindo na web
(cartão SEC-017). Ela:

- pedia senha para criar a conta, contra o [ADR-20261101-entrada-unica-por-codigo](ADR-20261101-entrada-unica-por-codigo.md),
  que tirou a senha da entrada;
- criava a conta e gravava o aceite por Server Actions com o cliente de serviço (`service_role`),
  num caminho público, sem sessão;
- duplicava o fluxo que a porta do app já faz: `/app/entrar?convite=CÓDIGO` valida o código pela
  rota `/api/app/entry/invite/preview`, entra pelo código no e-mail e aceita o convite por
  `/api/app/entry/invite`, sem senha e sem CPF (provado em `tests/e2e/f01-entrada-real.spec.ts`).

O e-mail do convite já manda para `/app/entrar?convite=` (`apps/web/lib/outbox/adapters.ts`). Só o
link antigo copiado antes disso, e o link legado `?legado=1`, ainda chegavam à tela velha.

## Decisão

1. A pasta `apps/web/app/(preauth)/convite` sai inteira: página, formulário, Server Actions com
   senha e cliente de serviço, e o estilo. Sai junto `lib/convite/form-error.ts`, que só a tela usava.
   `lib/convite/provision.ts` e `lib/convite/hint.ts` ficam, porque as rotas do app e o envio do
   convite os usam.
2. `next.config.ts` redireciona com 307: `/convite?codigo=X` vai para `/app/entrar?convite=X`, e
   `/convite` sem código (inclusive `?legado=1`) vai para `/app/entrar`. A regra é exata: `/convite/x`
   nunca existiu e segue o portão do proxy. O Next junta a query original ao destino, então o
   Location fica `/app/entrar?codigo=X&convite=X`; o código já estava na URL pedida, a porta só lê
   `convite` e apaga a query inteira quando o código é válido. O valor capturado só entra na query,
   codificado; o caminho do destino é fixo.
3. `/convite` sai da superfície pública do proxy (`lib/security/route-surface.ts`): o redirect roda
   antes do proxy, então o caminho não precisa mais ser público. Emenda a lista de entradas exatas
   do [ADR-20261110-superficie-publica-do-proxy](ADR-20261110-superficie-publica-do-proxy.md).

## Consequências

- Não há mais criação de conta com senha nem uso de `service_role` num caminho público da web para o
  convite de familiar.
- Quem chega pelo link legado sem código perde a frase "Este link de convite mudou" e cai na porta
  crua do app; esse link é de convites anteriores ao código e já não aceita nada.
- A tela antiga de onboarding (`/onboarding`, já redirecionada para a porta) ainda cita `/convite` no
  código morto, e `lib/convite/code.ts` ainda exporta `INVITE_CODE_FORMAT` e
  `inviteMessageForStatus`, que só a tela usava; saem com os resíduos da troca (TROCA-RESIDUOS).

## Prova

`tests/unit/infra/convite-redirect.test.ts` resolve as regras com os matchers do próprio Next: o
código vai em `?convite=`, sem código cai na porta, não há ciclo, `/convite/x` não casa e não é
público, e a pasta saiu. E2E: `entrada-convite-publica.spec.ts` (link antigo com e sem código, e com
sessão indo à Início) e `manaus-pilot-full-journey.spec.ts`.
