---
id: ADR-20260922-conversa-por-pedido
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-22
expires_at:
linked_plan: tools/backend-kanban/public/board.json#PEDIDO-CONVERSA-COMPARTILHADA
critic_verdict: pass
critic_review: Veredito registrado por aprovação explícita do dono (Juan) em 22/09/2026 nesta sessão ("aprovo"), seguindo o precedente do ADR-20260914-saida-de-comunidade. Não houve revisor independente — este campo não afirma revisão independente, e sim que o dono aceitou o texto como contrato vigente.
---

# Cada pedido de serviço tem a sua conversa

## Problem

`public.dm_conversations` tem `unique (participant_a, participant_b)`, e `create_service_request`
(`supabase/migrations/20260912063553_reconcile_service_requests.sql`) reaproveita a conversa do par
com `on conflict (participant_a, participant_b)`. Assim, todos os pedidos entre a mesma pessoa e o
mesmo prestador caem numa única conversa. Medido no banco local em 22/09/2026 (membro-1 e
Climatiza Manaus):

- **9 pedidos numa só conversa.**
- **4 pedidos continuam `open` apesar da resposta do prestador.** `send_conversation_message`
  localiza o pedido por `conversation_id` com `select ... into` e muda a situação de um qualquer.
- **Mensagens misturadas.** `/pedidos/[id]` carrega `dm_messages` pela conversa, então cada pedido
  mostra as 12 mensagens de todos os pedidos do par.

Isso também impede o ADR-20260922-aviso-da-primeira-resposta, que nasce justamente na transição
`open` → `in_conversation` de um pedido.

É R3: muda o modelo de conversa, uma regra antiabuso de mensagens e dados que outra pessoa lê.

## Decision

**Decisão do dono em 22/09/2026, nesta sessão:** conversa por pedido.

Migrations novas (as aplicadas não são editadas):

1. **Novo contexto.** `dm_context_type` ganha o valor `service_request`, numa migration própria,
   como `provider`, `listing` e `event_question`. Uma conversa de pedido tem
   `context_type = 'service_request'` e `context_id = <id do pedido>`.
2. **A regra de um por par vira parcial.** A unicidade `(participant_a, participant_b)` continua
   valendo para toda conversa que **não** é de pedido, com índice único parcial
   `where context_type <> 'service_request'`. Conversas de pedido passam a ser únicas por pedido:
   índice único em `(context_type, context_id)` `where context_type = 'service_request'`.
3. **`create_service_request` cria a conversa do próprio pedido**, já com o pedido como contexto,
   em vez de reaproveitar a do par. A idempotência por solicitante (`idempotency_key`) continua.
4. **`send_conversation_message` passa a achar exatamente um pedido** pela conversa. A transição
   `open` → `in_conversation` e o `updated_at` passam a valer para o pedido certo.
5. **Pedidos antigos continuam onde estão.** As mensagens já gravadas não dizem de qual pedido são,
   então não há como separá-las sem inventar. Os pedidos existentes mantêm a conversa compartilhada
   (legado), e só os pedidos novos nascem com conversa própria. A transição, nos legados, passa a
   escolher o pedido aberto mais recente da conversa, em vez de um qualquer.
6. **Não muda:**
   - "Entrar em contato" na ficha do prestador continua abrindo a conversa do par (contexto
     `provider`);
   - bloqueios valem para as duas conversas;
   - a caixa de conversas lista a conversa do pedido com o rótulo "Pedido de serviço".

## Alternatives considered

1. **Conversa por pedido (escolhida).** Mensagens e situação ficam presas ao pedido, como a
   prancha 17 mostra.
2. **Uma conversa por par, com cada mensagem marcada pelo pedido.** Preserva a regra atual, mas a
   caixa de conversas mostra tudo numa thread só, e toda leitura de mensagem precisaria filtrar.
3. **Só corrigir a transição para o pedido aberto mais recente.** Pequeno, mas os pedidos continuam
   mostrando mensagens uns dos outros.
4. **Comportamento atual.** Situação errada e mensagens misturadas.

## Market or reference baseline

Marketplaces de serviço mantêm uma conversa por solicitação ou orçamento, separada do contato geral
com o profissional.

## Proposed divergence from baseline

None.

## Evidence and sources

- `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql`:
  `dm_conversations_unique_pair`.
- `supabase/migrations/20260912063553_reconcile_service_requests.sql`: `on conflict
  (participant_a, participant_b)` em `create_service_request`.
- `supabase/migrations/20260915101543_account_deletion.sql`: `send_conversation_message` vigente.
- `apps/web/app/(shell)/pedidos/[id]/page.tsx`: mensagens carregadas por `conversation_id`.
- Consulta ao banco local em 22/09/2026: 9 pedidos, uma conversa, `open 4 | in_conversation 5`.

## Benefits

Cada acompanhamento mostra só a sua conversa, e a situação acompanha a resposta certa. Libera o
aviso da primeira resposta.

## Risks

- **Antiabuso:** a regra de um por par existia para limitar abertura de conversas. Mitigação: a
  conversa de pedido só nasce por `create_service_request`, que já exige `can_see_provider` e tem
  idempotência. `open_conversation` continua sem poder criar conversa de pedido.
- **Enum em transação:** `alter type ... add value` precisa de migration própria, anterior ao uso,
  como nos precedentes.
- **Legado misturado:** os pedidos antigos continuam com a conversa compartilhada, e isso fica
  declarado no card.

## Reversal cost

Médio. Voltar à unicidade por par exigiria fundir conversas de pedido já criadas. As mensagens não
se perdem, porque só mudariam de conversa.

## Success metric

Dois pedidos novos entre o mesmo par têm conversas diferentes. A resposta do prestador a um deles
muda só esse pedido para "Em conversa", e o acompanhamento de cada um mostra só as suas mensagens.
pgTAP positivo e negativo; a jornada de pedido segue passando.

## Reopen condition

Abuso por abertura de muitos pedidos para o mesmo prestador, ou necessidade de juntar histórico de
pedidos numa visão só.

## Approval

Decisão de produto dada pelo dono (Juan) em 22/09/2026 nesta sessão, entre três opções, escolhendo
"Conversa por pedido". Texto aprovado pelo dono em 22/09/2026 ("aprovo"), nesta sessão.
