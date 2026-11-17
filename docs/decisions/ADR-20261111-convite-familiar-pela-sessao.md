# ADR-20261111-convite-familiar-pela-sessao

Status: Aceito por delegação — aguarda ratificação

Data: 11/11/2026

## Contexto

O convite familiar é a única jornada do lançamento em que o servidor usa `service_role` para gravar
em tabelas do schema `private`: `private.create_family_invitation`, `private.list_pending_invites`,
`private.revoke_family_invitation` e `private.resend_family_invitation` só têm `execute` para
`service_role`, e a rota `apps/web/app/api/app/voce/familia` resolve a sessão antes de abrir o
cliente privilegiado (`apps/web/app/api/app/voce/familia/route.ts`).

A revisão R3 de 11/11 (`docs/agents/reviews/2026-11-11-revisao-r3-f10-familia.md`) confirmou a posse
derivada da sessão no caminho da rota, mas apontou dois vazamentos de contrato dentro do banco:

- `private.create_family_invitation` recebe `p_inviter_user_id` como parâmetro e não deriva nem
  compara `auth.uid()`; quem chama é que decide em nome de quem o convite é criado. Hoje só a rota
  privilegiada chama, mas o contrato não impede outro chamador de service_role de fazê-lo.
- `public.is_verified_holder(uuid)` e `public.has_accepted_family(uuid)` têm `execute` para
  `authenticated` e respondem sobre um id alheio, o que é um oráculo de enumeração.

## Decisão

1. **Posse pela sessão, no banco.** A próxima migration do convite familiar passa a derivar o dono
   do convite de `auth.uid()` no lugar de aceitar o id do titular como parâmetro, no molde de
   `supabase/migrations/20260819021416_locality_transfer.sql:105-110` (`v_user_id uuid := auth.uid()`
   com `raise 'unauthenticated' using errcode = '28000'`). A rota continua resolvendo a sessão
   antes de abrir o cliente privilegiado; o `service_role` não passa a ser identidade de ninguém.
2. **A prova vem antes da migration.** O lote de 11/11 (RUN-031) entrega só o pgTAP negativo e o
   registro da revisão, e ele já recusa 42501 para `authenticated`/`anon` e não grava linha. A
   correção do item 1 é a tarefa seguinte (cartão F10-R3-SESSION-DERIVED) com a sua própria revisão
   de contrato.
3. **Nenhuma recusa revela dado.** As frases de recusa do convite não carregam e-mail, digest, hash,
   token nem código; o pgTAP guarda isso por texto.
4. **O código do convite não vira log público.** O código em claro que fica em
   `public.outbox.payload` para o envio de e-mail é lido como retenção do outbox e visitado pelo
   cartão F10-R3-OUTBOX-RETENCAO quando o envio por Resend for ligado (BLOCK-RESEND).

## Consequências

- A superfície privilegiada do convite passa a ter prova positiva (titular) e negativa (outro
  membro, anon) dentro do banco, não só no TypeScript.
- O item 1 exige migration nova; até ela, o cartão F10-R3-SESSION-DERIVED permanece aberto e o
  cartão F10-FAMILIA não pode ser fechado como «posse derivada da sessão».
- `is_verified_holder`/`has_accepted_family` continuam respondendo sobre id alheio até
  F10-R3-HELPER-ENUMERACAO; não há caminho de cliente que os chame com id de terceiro.

## Alternativas consideradas

- **Manter o id por parâmetro e confiar só na rota.** Rejeitada: o contrato fica dependente de todo
  chamador privilegiado futuro lembrar da regra.
- **Mover o convite inteiro para `authenticated` com RLS nas tabelas `private`.** Rejeitada nesta
  rodada: o desenho do convite depende de geração de código e envio fora do controle do cliente, e
  as tabelas `private` não têm privilégio de tabela para `authenticated` por desenho.

## Emenda de 16/11/2026 — a posse e os tetos passam a ser do banco

A auditoria independente do `security-auditor` de 16/11 sobre a main `3c4dc55f` (A2-1 a A2-4)
mostrou que o item 1 desta decisão continuava só no papel: `private.create_family_invitation`
recebia `p_inviter_user_id` sem comparar `auth.uid()`, o teto de 5 convites ativos podia ser
superado em corrida, o limite de envio não existia sem `UPSTASH_*` (fail-open) e as Server Actions
antigas de `lib/convite/familia-acoes.ts` ecoavam `error.message` e devolviam `{ code, token }` ao
navegador. Decidido por delegação em 16/11, no lote SEC-011:

1. **A porta pública não recebe id de titular.** `public.create_family_invitation`,
   `public.revoke_family_invitation` e `public.resend_family_invitation` derivam o titular de
   `auth.uid()` e respondem `28000` sem sessão (molde de `public.declare_locality_transfer`). Têm
   `execute` só para `authenticated`, com `revoke` explícito de `public`/`anon` na mesma migration.
   As assinaturas que aceitavam `p_inviter_user_id` são removidas (`drop function`): `service_role`
   não é identidade de ninguém (supabase/AGENTS.md), e um chamador privilegiado futuro não pode
   voltar a escolher em nome de quem o convite nasce. A rota continua resolvendo a sessão antes de
   abrir o cliente privilegiado, e usa o cliente da sessão nas três escritas.
2. **Os tetos são conferidos dentro da função, sob trava por titular.** O teto de 5 convites ativos
   e o teto de 10 envios por hora (`private.family_invite_send_gate`, contando as linhas criadas na
   janela) rodam sob `pg_advisory_xact_lock` por titular — a mesma trava de
   `lock_family_invite_code_attempts`. Valem para chamada direta pela Data API, não só para a rota.
3. **Upstash opcional; o limite do banco vale sempre.** Quando configurado, Upstash é a
   primeira barreira; quando ausente, a rota segue para a função, que aplica o teto sob trava.
4. **O código morto sai.** `/configuracoes/familia` já era 307 para `/app/voce`
   (`next.config.ts`); a página e as Server Actions de `lib/convite/familia-acoes.ts` saem com os
   seus testes, junto das referências em `configuracoes-nav.tsx` e no mapa de captura. Quem convida
   é o app, pela porta `/api/app/voce/familia`. O reenvio não ganha rota nem tela: a função do banco
   fica, com a mesma derivação de posse.

A prova é `supabase/tests/family-invite-session-ownership.sql` (positivo do titular, negativo de
outro membro e de anon, `28000` sem sessão, trava por titular, os dois tetos com frase fixa) e o
teste unitário sem Upstash prova que a rota chama a função e repassa a recusa fixa do teto, sem `error.message`. As dez frases
fixas de recusa continuam provadas, agora com a do teto de envios ao lado delas.

## Emenda de 17/11/2026 — um caminho só: o convite de familiar sai da web

O achado R3 do RUN-187 mostrou que `apps/web/app/(preauth)/convite` ainda servia tela de convite
familiar, com campo de senha (`invite-form.tsx`) e Server Actions (`actions.ts`) que abriam
`createServiceClient()` para pré-visualizar o código, gravar o consentimento
(`record_consent_acceptance`) e aceitar o convite. Era um segundo caminho de criação de conta e de
consentimento por cliente de serviço, fora do endurecimento do SEC-011/SEC-012, e a única interface
de senha viva na web. O caminho oficial — `/app/entrar?convite=CODIGO` sobre
`/api/app/entry/invite*` — já existe, é o que o e-mail de convite aponta
(`apps/web/lib/outbox/adapters.ts`) e não pede senha nem CPF.

Decidido pelo coordenador em 17/11, por delegação (lote SEC-017):

1. **Um caminho só.** `/convite` é 307 para `/app/entrar`; com `?codigo=X` o destino leva
   `?convite=X`, que é o parâmetro que a entrada do app lê. Sem ciclo: o destino não redireciona de
   novo, e nenhum dado de quem foi convidado viaja além do próprio código, que já estava na URL.
2. **A tela antiga sai inteira.** `page.tsx`, `invite-form.tsx`, `actions.ts` e `convite.css` saem
   com os testes deles. Nenhuma rota de membro do `apps/web` fica servindo tela de convite
   (LANCAMENTO.md, fase 6).
3. **O que o app usa fica.** `apps/web/lib/convite/*` (`provision.ts`, `code.ts`, `digest.ts`,
   `hint.ts`, `familia.ts`) não muda: `previewFamilyInviteCode` e `acceptFamilyInviteCode` passam a
   ter como únicos consumidores as rotas `/api/app/entry/invite*`. O `service_role` do convite
   continua existindo só atrás da sessão resolvida no servidor, como decidiu a emenda de 16/11.
4. **O portão acompanha.** `/convite` sai de `PUBLIC_SURFACE` (`lib/security/route-surface.ts`):
   o redirect de configuração roda antes do proxy, então não há nada para servir nesse caminho. O
   endereço antigo continua sendo destino válido de link (`link-crawl`), e um `?legado=1` de convite
   pré-código apenas cai na entrada do app: convite sem código não existe desde o
   ADR-20261101-entrada-unica-por-codigo.

Consequência registrada, fora deste lote: `apps/web/lib/convite/form-error.ts` fica sem consumidor
(era usado só pelo formulário removido) e sai numa limpeza de `lib/convite`, que este lote não pode
tocar.

A prova é `tests/unit/infra/lan-troca-redirect.test.ts` (307 com e sem código, o mapeamento para
`?convite=`, ausência de ciclo e a pasta `(preauth)/convite` vazia), o teste de superfície
(`tests/unit/security/route-surface.test.ts`, `tests/scope/entrada-public-paths.test.mjs`) e o
`link-crawl`, que deixa de declarar a porta e passa a tratar `/convite` como destino de redirect. O
E2E de `entrada-convite-publica.spec.ts` prova o 307 ponta a ponta e o aceite em si segue provado no
app (`f01-entrada-real.spec.ts`).

## Revisão

Revisão independente e `security-auditor`: parecer do lote RUN-030/RUN-031 em
`docs/agents/reviews/2026-11-11-revisao-r3-f10-familia.md`. Entra em
`docs/decisions/RATIFICACAO.md` no mesmo commit, com Ratificação `—` até o dono decidir.