---
id: ADR-20260909-anuncios-mercado-e-moradia
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-09
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e autorizacao humana explicita do dono (Juan) na sessao de 09/09/2026 — ver a secao Approval.
---

# Anúncio: um domínio para Mercado e Moradia, com alerta que entrega de verdade

## Problem

As pranchas 13, 19, 21, 63, 64 e 65 desenham sete telas de anúncio, e **não existe uma única
tabela de anúncio no banco**. A §4.7 da especificação (R48–R55) exige o ciclo completo: publicar,
encontrar, demonstrar interesse, conversar, editar, pausar, reativar, encerrar, e o alerta de
imóveis que entrega e para de entregar.

Três coisas precisam de decisão antes de existir migration:

1. Mercado e Moradia são **um domínio ou dois**? Compartilham publicação, mídia, público e
   ciclo de vida; divergem em campos (preço único × aluguel + condomínio + IPTU; condição ×
   quartos/vaga/área).
2. **Quais situações existem?** A §6 da especificação diz `rascunho → ativo ↔ pausado →
   encerrado`. A prancha 21 mostra abas `Ativos / Reservados / Encerrados` e o menu
   `Marcar como reservado` / `Marcar como vendido` — duas situações que a especificação não tem.
3. **Onde o anúncio é visível?** A prancha 63 diz, na tela, "Seu anúncio será visível apenas
   para membros desta comunidade". A prancha 13 lista "Produtos em Brasília", que é cidade.

## Decision

### D1 — Um domínio, dois tipos

Uma tabela `listings` com `kind` em `{item, property}`, e uma tabela satélite
`property_details` para os campos que só Moradia tem. Publicação, mídia, público, situação,
interesse e moderação ficam na tabela mãe e são escritos uma vez.

Motivo: o ciclo de vida, a autorização e a conversa de interesse são idênticos nas duas
pranchas; duplicar a tabela duplicaria a policy — e policy duplicada é como este repositório
vazou antes.

### D2 — Situações

`draft → active ↔ paused`, e de `active` para `reserved`, `sold` ou `closed`. `sold` só existe
para `kind = item`. `reserved` e `sold` são **estados terminais reversíveis pelo dono** enquanto
o anúncio não for encerrado. Nenhuma situação é inferida: cada transição é uma escrita
autorizada, auditável e idempotente.

A prancha manda aqui, e a §6 da especificação é ampliada — não contrariada.

### D3 — Público

Duas formas, exclusivas por anúncio: **cidade** (`locality_id`) ou **comunidade**
(`community_id`). O público é escolhido na criação e **não muda na edição** — a prancha 64
desenha o campo travado com o rótulo "Comunidade (não é possível alterar)". Trocar o público
depois de publicado seria contornar acesso, que a §4.3 R26 proíbe para publicação e vale igual
aqui.

A busca só retorna anúncio `active` cujo público o leitor alcança. Anúncio próprio aparece na
busca, e o botão de interesse fica desabilitado com motivo — a pessoa não conversa consigo.

### D4 — Interesse

"Tenho interesse" **abre ou reencontra** a conversa contextual do anúncio, pelo contrato do
[ADR de pedidos e conversa contextual](ADR-20260909-pedidos-e-conversa-contextual.md).
Idempotente: clicar duas vezes não cria duas conversas. Não é checkout, não move dinheiro,
não compartilha telefone automaticamente. Anúncio `paused`, `sold` ou `closed` não aceita
interesse novo; o histórico existente continua legível para quem já participava.

### D5 — Localização

> **Revogado em 25/09/2026** por [ADR-20260925-endereco-por-escolha](ADR-20260925-endereco-por-escolha.md):
> o anúncio aceita endereço opcional, por escolha de quem anuncia. O texto abaixo é histórico.

Anúncio guarda **cidade e bairro**, nunca endereço, número, complemento ou coordenada.
"Águas Claras, Brasília - DF" é o grão máximo. Isso mantém a proibição de endereço residencial
da §4.7 e é o que as pranchas 13, 19 e 65 desenham.

### D6 — Custos de Moradia

Colunas separadas e **anuláveis**: `rent_cents`, `condo_fee_cents`, `iptu_cents`. `null`
significa "não informado" e a tela mostra "Consultar anunciante" — **nunca R$ 0,00 e nunca
somado**. A prancha 19 depende disso, e a `reviewNote` dela existe exatamente porque o gerador
inventou promessa em cima de valor ausente.

### D7 — Alerta

`listing_alerts` com dono, critérios normalizados, `is_active` e canal permitido. Um job lê
anúncios `active` novos, casa com os critérios, **deduplica por (alerta, anúncio)** em
`listing_alert_deliveries` e entrega pelo outbox existente, respeitando
`notification_preferences`. Desligar o switch interrompe entregas futuras; excluir remove a
assinatura e as entregas pendentes.

**Sem job e sem retorno observável, o alerta não está concluído** — a §4.7 R55 é literal nisso.

## Alternatives considered

1. **Duas tabelas independentes** (`market_listings`, `property_listings`). Recusada em D1.
2. **Situação derivada** (por exemplo, "vendido" implícito quando a conversa é encerrada).
   Recusada: derivar situação de conversa é o erro que a §4.6 nomeia — conversa não é estado.
3. **Público nacional para anúncio.** Recusada: o alcance nacional é de descoberta, não de
   negociação, e a prancha 63 diz o contrário na própria tela.
4. **Alerta por consulta no acesso** (sem job): a pessoa vê "novos desde a última visita".
   Barato e honesto, mas a prancha 65 promete notificação, e promessa na tela obriga entrega.

## Market or reference baseline

Classificados comunitários (Facebook Marketplace, Nextdoor for Sale) usam um domínio único com
categoria, e alerta de busca salva com entrega assíncrona. Portais de imóveis (Zap, QuintoAndar)
separam aluguel de condomínio e de IPTU na ficha, exatamente como a prancha 19.

## Proposed divergence from baseline

Não há pagamento, custódia, comissão, avaliação nem reputação. A §4.7 é explícita: sem pagamento
e sem assinatura; `BLOCK-ASAAS` não é dependência deste Mercado.

## Evidence and sources

- Leitura das pranchas em [`PRANCHAS-WEB-RESTANTES.md`](../agents/PRANCHAS-WEB-RESTANTES.md).
- §4.7 R48–R55 e §6 da especificação de 08/09.
- `reviewNotes` do manifesto para 13, 19 e 65.
- Inventário de tabelas: não há `listings` em `supabase/migrations/`.

## Benefits

Uma policy por operação em vez de duas. O alerta passa a ter prova de entrega e de parada.
O ciclo de vida fica explícito, o que impede a tela de dizer "vendido" sem escrita.

## Risks

- **Privacidade:** bairro + fotos de imóvel podem identificar endereço. D5 limita o grão; o
  EXIF sai na entrada pelo ADR de mídia.
- **Autorização:** o público por comunidade cria um caminho novo de leitura; a coluna e a policy
  entram na **mesma** migration, sem exceção.
- **Entrega:** o job de alerta pode duplicar sob retry. D7 exige deduplicação por par.
- **Produto:** `reserved`/`sold` sem prazo viram lista morta; o expurgo entra com o ciclo.

## Reversal cost

Alto depois de haver anúncio real: exige migração de dados e comunicação a quem publicou.
Baixo agora — não há linha nenhuma.

## Success metric

A jornada 8 da §10 da especificação fecha: A publica produto e imóvel, B encontra com filtro
correto e envia interesse, A responde, A edita/pausa/reativa/encerra, B vê o estado atualizado;
a busca salva entrega exatamente um alerta e deixa de entregar quando desligada.

## Reopen condition

Se o produto passar a intermediar pagamento, ou a permitir anúncio fora de cidade e comunidade,
D3 e D4 mudam e este ADR é reaberto.

## Approval

Aprovado em 09/09/2026 pelo dono do produto (Juan), por autorização explícita na sessão de
Claude Code que redigiu este ADR: "Aprovo as adr", referindo-se aos seis ADRs de 09/09/2026
listados em [RECON-WEB-EXECUCAO.md](../agents/RECON-WEB-EXECUCAO.md).

Destrava os contratos RECON-025, RECON-026, RECON-027 e RECON-028.

**Nenhum crítico adversarial revisou este ADR.** A aprovação é humana e direta; a revisão
independente continua exigida por lote, sobre o diff que implementar estas decisões.
