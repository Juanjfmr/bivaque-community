---
id: ADR-20260925-aviso-de-pedido
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-25
accepted_at: 2026-09-25
expires_at:
linked_plan:
critic_verdict: pending
critic_review: Decisões do dono na sessão de 25/09/2026. Revisão independente ainda não rodou.
---

# Aviso de pedido de indicação: a resposta chega em minutos

## Problem

A memória de indicações ([ADR-20260925-memoria-de-indicacoes](ADR-20260925-memoria-de-indicacoes.md))
guarda o que a cidade já respondeu. Faltava o que faz alguém trocar o grupo de WhatsApp pelo
Bivaque: a resposta chegar rápido. Até aqui, um pedido novo não avisava ninguém. Só quem pediu era
avisado, quando alguém respondia. Um pedido sem resposta ficava parado sem que ninguém soubesse
dele. E uma resposta útil só vira memória quando quem pediu marca "Ajudou a resolver" — e nada
lembrava a pessoa de fazer isso.

## Decision

Decisões do dono em 25/09/2026:

- **D1 — Quem recebe: todos da cidade, com limite.** Um pedido novo avisa quem pode lê-lo: os
  membros ativos da cidade, ou os membros aprovados do grupo quando o pedido é de grupo. Ficam de
  fora quem pediu, quem está saindo da plataforma, quem bloqueou ou foi bloqueado por quem pediu,
  e quem desligou o tipo ou o canal. **No máximo 3 avisos de pedido por pessoa em 24 h**; o que
  passar vira um aviso único do dia ("Há pedidos de indicação esperando resposta na sua cidade").
- **D2 — Canal: sino na hora, e-mail só no resumo.** O aviso aparece no sino. Por e-mail, um
  resumo diário dos pedidos da cidade ainda sem resposta, **só para quem ligar** — o e-mail deste
  tipo nasce desligado.
- **D3 — Dois lembretes.** O pedido parado 24 h sem nenhuma resposta volta a ser avisado uma vez;
  e, 3 dias depois da primeira resposta sem nada marcado, quem pediu recebe "Alguma resposta
  ajudou a resolver seu pedido?".

Forma técnica (migrations `20260926022408_aviso_de_pedido_tipo` e `20260926022416_aviso_de_pedido`):

- Tipo de notificação `recommendation_request`, com a `action` separando os quatro avisos:
  `new`, `unanswered`, `resolve_prompt` e `digest`.
- Preferência `indications` no mecanismo tipo × canal do
  [ADR-20260909-canais-de-notificacao](ADR-20260909-canais-de-notificacao.md). O único desvio
  daquele padrão: sem linha na matriz, o canal segue o tipo, **exceto** o e-mail de indicações,
  que nasce desligado. A regra está no banco (`private.notification_channel_allows`) e na cópia em
  TypeScript que o despachante do e-mail usa.
- `indication_alert_deliveries` registra cada aviso por (pedido, pessoa, tipo). É o que impede
  repetir e o que conta o limite. Nenhum cliente lê essa tabela.
- `private.dispatch_indication_alerts()` a cada 5 minutos e `private.dispatch_indication_digest()`
  às 11h UTC, os dois pelo `pg_cron`, sem acesso pelo Data API.
- Janelas curtas: um pedido com mais de 2 h nunca dispara aviso de "novo", nem na primeira
  execução depois do deploy. A pergunta "ajudou a resolver?" só olha primeiras respostas de 3 a
  10 dias atrás.

## Alternatives considered

- **Só quem escolheu o assunto ("Posso ajudar com…").** Era a recomendação da sessão: menos
  ruído, mas menos alcance no começo. O dono escolheu a cidade toda, com limite.
- **Só a vila de quem pediu.** Deixaria sem ninguém o pedido de quem ainda não tem vila.
- **E-mail a cada pedido.** Tende a virar spam e a ser marcado como tal.

## Risks

- **Ruído.** Com a cidade toda recebendo, o limite de 3 por dia e o aviso único são o que segura.
  Se o sino virar barulho, o sinal é gente desligando o tipo — medir antes de subir o limite.
- **Volume.** Uma cidade de mil membros gera mil linhas de notificação por pedido. Aceitável na
  escala atual; se crescer, o aviso passa a ser por vila ou por assunto (alternativa acima).
- **Privacidade.** O aviso mostra só o título do pedido, que quem recebe já poderia ler. O
  registro de entregas diz quem foi avisado de quê e fica fechado ao cliente.

## Reversal cost

Baixo. Desagendar os dois jobs cala tudo. As tabelas e o tipo de notificação podem ficar sem uso.

## Success metric

- tempo até a primeira resposta;
- proporção de pedidos sem resposta em 24 h;
- proporção de pedidos resolvidos (com "Ajudou a resolver").

## Evidence

- pgTAP `supabase/tests/aviso-de-pedido.sql`, 22/22. Prova: quem recebe e quem não recebe (quem
  pediu, outra cidade, sem cidade, quem desligou, bloqueio, grupo pendente e aprovado); não
  repetir; o limite de 3 e o aviso único; o pedido parado com e sem resposta; o "ajudou a
  resolver?" com e sem marca; o resumo só para quem ligou; a fila recusando quem não ligou; o sino
  ligado por padrão; o registro fechado ao cliente.
- Controle negativo: retirar a preferência desligada e o bloqueio faz os casos 5 e 7 falharem.
- Testes unitários da regra de entrega em TypeScript, do texto e destino no sino e do e-mail.

## Approval

Dono (Juan), sessão de 25/09/2026. Respostas: "Todos da cidade, com limite", "Sino, e e-mail só no
resumo", "Os dois".
