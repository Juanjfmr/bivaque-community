---
id: ADR-20260909-pedidos-e-conversa-contextual
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-09
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e autorizacao humana explicita do dono (Juan) na sessao de 09/09/2026 — ver a secao Approval.
---

# Pedido de serviço, e a conversa que nasce colada num contexto

## Problem

As pranchas 17, 23 e 62 desenham o ciclo completo de serviço — cliente descreve, prestador
recebe em "Novos", conversa acontece, pedido encerra — e o banco não tem pedido nenhum.
Existem `dm_conversations` / `dm_messages` (conversa direta) e `recommendation_requests`
(pergunta de recomendação para a comunidade), que são outra coisa.

Três telas mais dependem da mesma conversa contextual: interesse em anúncio (pranchas 63 e 19),
pergunta ao organizador de evento (prancha 67) e a central de conversas (C12). Se cada uma
inventar a sua, o produto ganha quatro caixas de entrada e nenhuma autorização coerente.

A §4.6 da especificação já diz o que não pode: *"não usar uma conversa solta como substituto de
estado do pedido"*.

## Decision

### D1 — Pedido é um objeto, não uma conversa

`service_requests` com: solicitante, destinatário (o prestador, **fixo na criação**), categoria,
descrição, "quando" (prazo ou horário desejado, opcional), região, anexos e situação
`open → in_conversation → closed`, mais `cancelled` pelo solicitante antes de encerrado.

A transição para `in_conversation` acontece **na primeira resposta do prestador, na mesma
transação** que grava a mensagem. As abas `Novos (2) / Em conversa (1) / Encerrados` da prancha
23 leem essa coluna, não contam mensagens.

Encerrar registra ator e, quando houver, motivo. **`closed` não significa serviço prestado nem
pago** — a prancha 17 já traz essa frase na tela e ela é o contrato.

### D2 — A conversa tem contexto imutável

Uma tabela `conversation_contexts` liga cada conversa a **exatamente um** contexto tipado:
`service_request`, `listing` ou `event`. O par (tipo, id) é único, o que torna "abrir conversa"
idempotente: o segundo clique em "Tenho interesse" reencontra a conversa, não cria outra.

**Os participantes são derivados do contexto pelo servidor**, nunca do corpo do request:
pedido → solicitante e prestador destinatário; anúncio → interessado e anunciante; evento →
autor da pergunta e organizador. Nenhum corpo de request injeta participante ou contexto de
terceiro. É a linha da §6 que este ADR existe para cumprir.

As mensagens reaproveitam `dm_messages` com a conversa como chave; bloqueio (`dm_blocks`)
continua interrompendo envio novo nas duas direções.

### D3 — Pergunta ao organizador é conversa de contexto `event`

Não é uma tabela nova. A prancha 67 mostra fio de mensagens com "✓ Enviada" e resposta — é a
mesma primitiva. **Não exige RSVP**, não promete prazo, e terceiro não lê. O destinatário sai do
evento, não de uma seleção.

### D4 — Anexo

Anexo de pedido usa bucket privado, com a leitura derivada da participação na conversa, pelo
[ADR de mídia](ADR-20260909-midia-de-membro.md). Anexo não sobrevive à remoção da conversa.

### D5 — O que o produto não promete

Sem valor, sem pagamento, sem custódia, sem avaliação, sem selo, sem prazo de resposta, sem
compartilhamento automático de telefone. A faixa da prancha 17 — "Valores e pagamento são
combinados entre vocês" — é texto obrigatório, não decorativo.

## Alternatives considered

1. **Reaproveitar `recommendation_requests` como pedido de serviço.** Recusada: aquele objeto é
   pergunta aberta à comunidade com respostas de vários; o pedido tem **um** destinatário e
   situação própria. Fundir os dois estragaria as duas telas.
2. **Conversa livre entre membros, com o pedido como primeira mensagem.** Recusada pela §4.6 e
   porque abriria mensagem arbitrária entre contas — hoje impedida.
3. **Uma tabela de conversa por domínio** (pedido, anúncio, evento). Recusada: triplica a
   policy de participação, e a central C12 teria de unir três fontes.
4. **Situação derivada da última mensagem.** Recusada: a prancha 23 conta pedidos por aba;
   contagem derivada de mensagem muda sozinha quando alguém escreve.

## Market or reference baseline

Marketplaces de serviço (Thumbtack, GetNinjas, Houzz) modelam "request" e "lead" como objeto
com estado, com a conversa pendurada nele. Plataformas de comunidade (Nextdoor) usam conversa
direta sem estado — e não conseguem mostrar fila por situação, que é o que a prancha 23 pede.

## Proposed divergence from baseline

Divergimos dos marketplaces em não haver cobrança por lead, orçamento estruturado, avaliação
nem ranking. O Bivaque não participa da negociação.

## Evidence and sources

- Leitura das pranchas 17, 23, 62 e 67 em
  [`PRANCHAS-WEB-RESTANTES.md`](../agents/PRANCHAS-WEB-RESTANTES.md).
- §4.6 R42–R46, §4.4 R34 e §6 ("Conversa contextual", "Pedido") da especificação de 08/09.
- Tabelas existentes: `dm_conversations`, `dm_messages`, `dm_blocks`,
  `recommendation_requests`.
- [`ADR-20260820-conta-de-prestador`](ADR-20260820-conta-de-prestador.md), aceito.

## Benefits

Uma primitiva de conversa para três telas, com participação derivada — o que faz o teste
negativo ser um só e valer para todas. A fila do prestador passa a ter situação real.

## Risks

- **Autorização:** derivar participante é a proteção; um `insert` que aceite `participant_id`
  do cliente quebra tudo. A policy precisa recusar isso, não só a UI.
- **Privacidade:** anexo de pedido pode conter foto de interior de casa; D4 fecha a leitura.
- **Operacional:** a transição na primeira resposta precisa ser transacional; sem isso a aba
  "Novos" mente.
- **Produto:** `closed` pode ser lido como "serviço concluído"; a copy precisa impedir isso.

## Reversal cost

Médio: os dados são novos, mas a conversa contextual passa a ser referenciada por três telas.
Desfazer exigiria migrar mensagens de volta para conversa direta.

## Success metric

Jornada 7 da §10: prestador convidado, ficha publicada, pedido do cliente, resposta,
encerramento nas duas contas — com dois prestadores provando que não acessam o pedido um do
outro, por chamada direta sem UI.

## Reopen condition

Se o produto passar a intermediar orçamento ou pagamento, D1 e D5 mudam. Se aparecer conversa
sem contexto (mensagem direta livre), D2 é reaberto.

## Approval

Aprovado em 09/09/2026 pelo dono do produto (Juan), por autorização explícita na sessão de
Claude Code que redigiu este ADR: "Aprovo as adr", referindo-se aos seis ADRs de 09/09/2026
listados em [RECON-WEB-EXECUCAO.md](../agents/RECON-WEB-EXECUCAO.md).

Destrava os contratos RECON-022, RECON-023, RECON-024 e RECON-029.

**Nenhum crítico adversarial revisou este ADR.** A aprovação é humana e direta; a revisão
independente continua exigida por lote, sobre o diff que implementar estas decisões.
