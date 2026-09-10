---
id: ADR-20260909-resposta-que-resolveu
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-09
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e escolha explicita do dono (Juan) na sessao de 09/09/2026 — ver a secao Approval.
---

# A conversa registra qual resposta resolveu, e não quantas curtidas ela teve

## Problem

A prancha 15 desenha três marcas na conversa: o chip **"Resolvida pela autora"** no cabeçalho,
o chip **"Ajudou a resolver"** numa resposta destacada com barra verde, e **"👍 12 curtidas"** no
rodapé de cada resposta.

Conferido coluna a coluna em 09/09/2026, só a primeira existe:

- `recommendation_requests` tem `is_resolved`, `resolved_at` e `resolved_by` — e `resolved_by`
  referencia `auth.users`, ou seja, guarda **quem** resolveu, não **qual resposta** resolveu;
- `recommendation_replies` tem `id, request_id, author_id, body, created_at, is_deleted`. Nada
  de marca, nada de reação;
- `post_reactions` é `(post_id, user_id)` e pertence ao feed de `posts`, que é outro domínio.
  Uma revisão anterior da leitura das pranchas afirmou que ela sustentava as curtidas da
  conversa. Não sustenta;
- `recommendation_reply_promotions` liga `reply_id` a `guide_entry_id` — é a promoção de uma
  resposta para o Guia, o mecanismo por trás do cartão "Origem desta referência" da prancha 25.
  **Não é** "Ajudou a resolver".

Sem decisão, a tela ou omite as três marcas (regressão da prancha) ou desenha número inventado.

## Decision

**Entra o marcador da resposta que resolveu. Não entram as curtidas.**

### D1 — Uma coluna, não uma tabela

`recommendation_requests` ganha `resolved_reply_id uuid null references
public.recommendation_replies (id) on delete set null`. É o complemento natural de
`resolved_by` e `resolved_at`, que já existem: o ciclo passa a registrar quem resolveu, quando,
e com qual resposta.

Uma tabela de "respostas que ajudaram" (N por pergunta) seria outra coisa — voto distribuído,
com contagem e disputa. Aqui é **uma** resposta por pergunta, escolhida por quem perguntou.

### D2 — Quem marca

**Só quem escreveu a pergunta**, e só ao resolver ou depois de resolver, sobre uma resposta
daquela mesma pergunta. A escrita valida no servidor que a resposta pertence ao pedido e que a
sessão é a autora. `on delete set null` faz a marca sumir junto com a resposta apagada.

Desmarcar é permitido: a autora troca a resposta marcada ou limpa o campo. Reabrir a pergunta
(`is_resolved` de volta a falso) limpa o marcador.

### D3 — Quem lê

A mesma autorização da pergunta: quem alcança a conversa vê a marca; quem não alcança não vê
nem a marca nem a resposta. A coluna e a policy que a lê entram na **mesma** migration.

### D4 — Curtidas ficam fora

Sem reação em resposta de recomendação nesta entrega. O motivo não é técnico: é que a mecânica
traz um conjunto próprio de perguntas — quem pode reagir, se a contagem é pública, se dá para
desfazer, se gera notificação para o autor, se entra na moderação — e nenhuma delas está
decidida. A prancha 15 fica com essa divergência declarada no lote RECON-033.

### D5 — O que a marca não é

Não é reputação, não é ranking, não é selo de perfil, não é insumo de busca ou de recomendação.
É um ponteiro dentro de uma conversa. Não aparece agregada no perfil de ninguém.

## Alternatives considered

1. **Tabela `recommendation_reply_helpful` (N marcas por pergunta, uma por pessoa).** É o
   modelo do Stack Overflow. Recusada: a prancha mostra **uma** resposta destacada, e votação
   distribuída traz contagem pública, que é justamente o que D4 adia.
2. **Reaproveitar `recommendation_reply_promotions`.** Recusada: aquilo promove a resposta para
   o Guia, tem outro destinatário (curadoria) e outro efeito. Fundir os dois faria "ajudou a
   resolver" publicar conteúdo sem querer.
3. **Deduzir a resposta que resolveu** (a última antes de `resolved_at`, por exemplo).
   Recusada: dedução erra e a tela passa a creditar a pessoa errada.
4. **Nada** — tirar as três marcas da tela. Recusada pelo dono em 09/09: o chip de resolvida já
   funciona e o marcador é continuidade do ciclo que existe.

## Market or reference baseline

Fóruns de pergunta e resposta (Stack Overflow, Discourse) têm "resposta aceita" escolhida por
quem perguntou, separada do voto da comunidade. É exatamente o recorte de D1 e D4: aceitar sem
votar.

## Proposed divergence from baseline

Sem votos, sem pontuação, sem reputação acumulada. O produto é comunidade de vizinhança, não
fórum com placar.

## Evidence and sources

- Prancha 15 e a leitura em [`PRANCHAS-WEB-RESTANTES.md`](../agents/PRANCHAS-WEB-RESTANTES.md),
  seção 15-web-conversa, com a conferência de colunas de 09/09/2026.
- `supabase/migrations/20260821000011_recommendation_reply_notify.sql` — origem de
  `resolved_by` e `resolved_at`.
- `supabase/migrations/20260802001100_recommendations.sql` — colunas de
  `recommendation_replies`.
- `supabase/migrations/20260821000006_promote_reply_to_guide.sql` — o que
  `recommendation_reply_promotions` realmente faz.

## Benefits

Fecha a prancha 15 sem inventar mecânica de engajamento. O ciclo de resolução passa a ser
legível: quem perguntou, quem resolveu, e com qual resposta.

## Risks

- **Produto:** o marcador pode ser lido como endosso do Bivaque à indicação contida na resposta.
  A copy precisa manter isso como fala de quem perguntou.
- **Privacidade:** a marca é pública dentro do escopo da conversa; D3 amarra ao mesmo acesso.
- **Moderação:** resposta marcada e depois removida deixaria referência pendurada; `on delete
  set null` resolve.

## Reversal cost

Baixo. Uma coluna anulável; remover descarta ponteiros, não conteúdo.

## Success metric

A autora marca uma resposta, outra conta vê a marca na mesma conversa, uma terceira sem acesso
não vê nem a conversa; quem não é autor recebe negativa ao tentar marcar por chamada direta sem
interface. Provado por pgTAP positivo e negativo.

## Reopen condition

Se o produto decidir ter reação ou voto em resposta, D4 é reaberto — e provavelmente D1 junto,
porque as duas mecânicas convivem mal sem um modelo comum.

## Approval

Aprovado em 09/09/2026 pelo dono do produto (Juan). Diante da escolha entre construir as duas
mecânicas da prancha 15, nenhuma, ou apenas o marcador, ele escolheu **"Só Ajudou a resolver"**,
com as curtidas fora.

A forma técnica acima é a menor que cumpre essa escolha: uma coluna anulável ao lado de
`resolved_by` e `resolved_at`, escrita só pela autora da pergunta. Se essa forma divergir da
intenção — por exemplo, se a marca deveria ser de várias respostas — este ADR é reaberto antes
do RECON-035.

**Nenhum crítico adversarial revisou este ADR.** A revisão independente continua exigida sobre
o diff que o implementar.
