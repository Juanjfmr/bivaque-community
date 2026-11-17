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

## Revisão

Revisão independente e `security-auditor`: parecer do lote RUN-030/RUN-031 em
`docs/agents/reviews/2026-11-11-revisao-r3-f10-familia.md`. Entra em
`docs/decisions/RATIFICACAO.md` no mesmo commit, com Ratificação `—` até o dono decidir.