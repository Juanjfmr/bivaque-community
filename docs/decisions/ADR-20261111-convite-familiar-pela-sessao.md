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

## Revisão

Revisão independente e `security-auditor`: parecer do lote RUN-030/RUN-031 em
`docs/agents/reviews/2026-11-11-revisao-r3-f10-familia.md`. Entra em
`docs/decisions/RATIFICACAO.md` no mesmo commit, com Ratificação `—` até o dono decidir.