---
id: ADR-20260923-teto-de-pedidos-por-par
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-23
expires_at:
linked_plan: tools/backend-kanban/public/board.json#PEDIDO-TETO-POR-PAR
critic_verdict: pass
critic_review: Veredito registrado por escolha explícita do dono (Juan) em 23/09/2026 nesta sessão, entre três opções apresentadas com recomendação — escolheu a opção A com o teto em cinco. Não houve revisor independente; este campo não afirma revisão independente, e sim que o dono decidiu e aceitou o texto como contrato vigente.
---

# Cinco pedidos em aberto entre a mesma pessoa e o mesmo prestador

## Problem

Até o ADR-20260922-conversa-por-pedido, `dm_conversations_unique_pair` impunha uma conversa por
par, e `create_service_request` reaproveitava a conversa existente. O volume de pedidos entre o
mesmo par ficava limitado por efeito colateral: o segundo pedido não tinha para onde ir.

Esse índice passou a ser parcial em
`supabase/migrations/20260922160100_conversation_per_request.sql` — cada pedido nasce com a sua
conversa — e o freio acidental desapareceu. Depois disso, `create_service_request` confere
visibilidade do prestador, exclusão de conta e bloqueio
(`20260922162000_service_request_block_checks.sql`), mas **nada limita volume**. A chave de
idempotência não serve para isso: `p_idempotency_key` é escolhida por quem chama, então basta
variá-la para criar quantos pedidos se quiser, cada um abrindo uma conversa nova na caixa do
prestador.

Medido no banco local em 22/09/2026, ainda com a conversa compartilhada: **9 pedidos** entre
membro-1 e Climatiza Manaus, **4 presos em `open`**. Com uma conversa por pedido, o mesmo volume
viraria nove conversas.

A auditoria de 22/09/2026 registrou o achado como MEDIUM e o separou como decisão de produto
(card `PEDIDO-TETO-POR-PAR`), porque escolher o teto não é escolha técnica.

## Decision

**Uma pessoa pode ter no máximo cinco pedidos em aberto com o mesmo prestador.** "Em aberto" é
`status in ('open', 'in_conversation')`. `closed` e `cancelled` não contam: fechar ou cancelar um
pedido libera a vaga na hora.

A conferência é feita em `create_service_request`, antes de criar a conversa, e recusa com
`errcode = '54000'`. A action do formulário traduz esse código em uma frase que diz o que fazer,
como já faz `indicar-prestador` para o teto de convites.

O teto é **por par**, não global por pessoa nem por janela de tempo.

## Options considered

1. **Teto de pedidos em aberto no par — escolhida, com o valor em cinco.** O teto acompanha o
   problema real: o que ocupa o prestador é a fila aberta, não o histórico. Quem usa o serviço
   muitas vezes ao longo de meses nunca encosta no limite; quem empilha pedidos sem fechar
   encosta na quinta vez. É uma contagem só, no RPC que já existe.
2. **Teto por janela de tempo (por exemplo cinco por par em 24h).** Pegaria o laço de criar e
   cancelar, que a opção 1 não pega. Recusada porque pune o caso legítimo — cancelar por erro de
   digitação e refazer queima cota — e porque deixa em pé exatamente o que a auditoria mediu:
   vinte pedidos abertos e antigos continuam dentro da regra.
3. **Teto global por pessoa, somando todos os prestadores.** Protege a plataforma, mas não resolve
   o achado: os pedidos do limite global podem estar todos no mesmo prestador. E um limite alto o
   bastante para não atrapalhar uso normal é alto demais para proteger um prestador só.

O valor cinco segue o precedente do teto de convites de prestador
(`20260825181742_provider_invitations.sql`), que usa cinco ativos por membro e o mesmo `54000`.
Duas regras antiabuso com o mesmo número e o mesmo código de erro são mais fáceis de operar do
que duas invenções separadas.

## Consequences

- Quem tem cinco pedidos em aberto com um prestador recebe uma recusa que diz o motivo e a saída
  ("feche ou cancele um"), não um erro genérico.
- A contagem entra no caminho de criação: uma consulta a mais em `service_requests`, coberta pelo
  índice de `requester_user_id`.
- A corrida entre dois envios simultâneos é fechada com `pg_advisory_xact_lock` sobre o par, como
  no teto de convites. Sem isso, dois envios paralelos passariam os dois na sexta vaga.
- **Não cobre** criar e cancelar em laço. Se isso aparecer em medição real, a opção 2 pode entrar
  como segunda camada, somada a esta — a ordem inversa não vale, porque a opção 2 sozinha deixa a
  fila antiga de pé.
- Pedidos que já existem acima do teto não são apagados nem alterados: a regra vale para a
  criação. Um par que já tem nove pedidos abertos só cria o próximo depois de fechar cinco.
