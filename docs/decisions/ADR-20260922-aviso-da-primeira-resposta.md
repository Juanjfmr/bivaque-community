---
id: ADR-20260922-aviso-da-primeira-resposta
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan: tools/backend-kanban/public/board.json#NOTIF-PEDIDO-RESPOSTA
critic_verdict: pending
critic_review:
---

# Quem pediu um serviço é avisado quando o prestador responde pela primeira vez

## Problem

Quando o prestador responde um pedido, quem pediu não recebe aviso nenhum. A resposta aparece em
`/pedidos/[id]`, mas a pessoa só descobre se voltar lá por conta própria. Medido na jornada
simulada de 22/09/2026 (`tests/e2e/journey-pedir-servico.spec.ts`, HRN-004): a
`/notifications` da membra não mostrou nada depois da resposta.

O ícone de conversas do cabeçalho (MSG-SEM-ENTRADA, entregue em 22/09) já sinaliza mensagem nova.
Mesmo assim, o pedido é o momento em que a pessoa espera uma resposta, e a central de notificações
é o lugar onde se procura o que aconteceu.

É R3: exige gatilho em migration e grava uma linha em `notifications` para uma pessoa a partir do
ato de outra.

## Decision

**Decisão do dono em 22/09/2026, nesta sessão:** avisar só a primeira resposta, sem o texto.

1. **Quando:** uma única vez por pedido, no momento em que ele passa de `open` para
   `in_conversation`. Essa transição já acontece em `public.send_conversation_message`, na mesma
   transação em que a primeira mensagem do prestador é gravada (versão vigente em
   `supabase/migrations/20260915101543_account_deletion.sql`). O aviso é gravado nesse mesmo ramo,
   então não existe resposta sem aviso nem aviso sem resposta.
2. **Para quem:** só `requester_user_id` do próprio pedido. Nunca para terceiros, nunca para o
   prestador.
3. **O quê:** `notifications` com `type = 'service_request'`, `action = 'provider_first_reply'`,
   `target_type = 'service_request'`, `target_id = <id do pedido>`, `actor_user_id = null`.
   **Nenhum texto da mensagem** é gravado nem exibido.
4. **Como aparece:** "*{nome da ficha do prestador}* respondeu seu pedido", com o deep-link
   existente para `/pedidos/[id]` (`apps/web/app/(shell)/notifications/deep-links.ts`). O nome vem
   de `provider_profiles.display_name` pelo pedido, que quem pediu já pode ler. O ator é nulo,
   porque o prestador não tem perfil de membro (D37), e a renderização por perfil falharia.
5. **Preferências:** honra `notification_preferences.messages`, como os avisos de mensagem do
   ADR-20260909-canais-de-notificacao. Quem desligou avisos de mensagem não recebe este.
6. **Não muda:**
   - o aviso neutro de pedido cancelado (`action = 'cancelled_counterpart_left'`) continua como está;
   - a central passa a distinguir os dois pela `action`, e hoje ela só olha o `type`.

## Alternatives considered

1. **Só a primeira resposta, sem texto (escolhida).** Avisa o que importa sem gerar enxurrada nem
   expor conteúdo.
2. **Toda mensagem do prestador, sem texto.** Ninguém perde nada, mas uma conversa ativa gera muitos
   avisos, repetindo o que o ícone de conversas já faz.
3. **Toda mensagem, com trecho do texto.** Mais informativo, mas põe conteúdo de conversa privada na
   central, onde fica mais exposto.
4. **Comportamento atual.** Silêncio.

## Market or reference baseline

Marketplaces de serviço avisam quando o profissional responde a um pedido, em geral uma vez por
pedido, e deixam a conversa seguir pelo canal de mensagens.

## Proposed divergence from baseline

None.

## Evidence and sources

- `supabase/migrations/20260911105119_service_request_tracking.sql` e
  `20260915101543_account_deletion.sql`: a transição `open` → `in_conversation` na primeira
  mensagem do prestador.
- `supabase/migrations/20260918214735_service_request_cancelled_notice.sql`: o precedente de aviso
  `service_request` com ator nulo.
- `apps/web/app/(shell)/notifications/deep-links.ts`: o texto de `service_request` hoje é fixo
  ("O pedido em que você estava foi encerrado") e ignora a `action`.
- `supabase/migrations/20260911051230_event_question_thread.sql`: o padrão de honrar
  `notification_preferences.messages`.

## Benefits

Fecha o ciclo do pedido: a pessoa pede, é avisada quando respondem, e o aviso leva direto ao
acompanhamento.

## Risks

- **Texto trocado:** sem distinguir a `action`, a central mostraria "pedido encerrado" para uma
  resposta. Mitigação: a migration e a mudança no texto da central entram no mesmo lote, com teste
  de unidade do texto por `action`.
- **Vazamento a terceiros:** o destinatário vem do próprio pedido, nunca do corpo da chamada.
  pgTAP positivo (quem pediu recebe) e negativo (terceiro e prestador não recebem).
- **Duplicidade:** o aviso só existe no ramo da transição, que acontece uma vez. Mensagens
  seguintes não geram outro.

## Reversal cost

Baixo. Uma migration que remove o insert do ramo e o texto da `action`. Os avisos já gravados podem
ficar, porque são verdadeiros.

## Success metric

Na jornada simulada, depois da primeira resposta do prestador, a central de quem pediu mostra
"*{prestador}* respondeu seu pedido", e o clique leva a `/pedidos/[id]`. Uma segunda mensagem do
prestador não gera novo aviso.

## Reopen condition

Quem pede passar a perder respostas seguintes, com pedidos respondidos e abandonados, ou pedidos de
avisar toda mensagem pela ajuda.

## Approval

Decisão de produto dada pelo dono (Juan) em 22/09/2026 nesta sessão, entre três opções, escolhendo
"Só a 1ª resposta, sem texto". **Este texto ainda precisa de aprovação** antes de
`status: accepted`. A revisão crítica independente ainda não rodou.
