---
id: ADR-20260909-canais-de-notificacao
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-09
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e autorizacao humana explicita do dono (Juan) na sessao de 09/09/2026 — ver a secao Approval.
---

# Preferência de notificação é por tipo **e** por canal

## Problem

A prancha 52 desenha, em Configurações, uma tabela **Canal × tipo de aviso** ("Canais de
entrega") e uma linha separada para "Novidades do Bivaque". O handoff de 09/09 registra as duas
como ausentes na tela entregue.

`notification_preferences` tem quatro booleanos — `comments`, `events`, `mentions`, `messages` —
e nenhuma noção de canal. `notification_opt_outs` e `outbox` existem. Sem canal, a tela ou mente
(mostra colunas que não gravam) ou omite (regressão da prancha).

A §4.8 C05 é explícita: in-app e e-mail respeitam o contrato, e **push web só aparece
habilitável se o serviço estiver conectado**.

## Decision

### D1 — Matriz tipo × canal

`notification_channel_preferences` com `(user_id, notification_type, channel, enabled)`.
Canais: `in_app`, `email`. **`push` não entra agora**: não há serviço web push conectado, e
oferecer o controle sem entrega é exatamente a tela que promete e não cumpre.

`notification_preferences` continua existindo como a preferência por tipo. A hierarquia é
simples e verificável: **tipo desligado não entrega por canal nenhum**; tipo ligado entrega
pelos canais habilitados.

### D2 — Migração dos quatro booleanos

A migration cria a matriz e **semeia** a partir dos booleanos existentes: tipo ligado vira
`in_app = true` e `email = true`; tipo desligado vira ambos falsos. Ninguém perde nem ganha
entrega ao migrar.

### D3 — Novidades do Bivaque

Um tipo próprio, `product_news`, **desligado por padrão** para conta existente e para conta
nova. Comunicação de produto é opt-in; é a única linha da tela que não decorre de uma ação da
pessoa dentro do produto.

### D4 — Quem lê a preferência

O produtor da notificação **não** consulta a matriz. Quem consulta é o despachante do `outbox`,
num ponto só. Preferência checada em N produtores é preferência que um produtor novo esquece —
e o esquecimento aparece como e-mail que a pessoa desligou.

### D5 — Desligar tem efeito observável

Desligar um canal afeta **as próximas entregas**, não o histórico já entregue. Entrega em voo
não é cancelada retroativamente; a prova é a entrega seguinte não acontecer.

## Alternatives considered

1. **Colunas novas em `notification_preferences`** (`comments_email`, `comments_in_app`, …).
   Recusada: cada tipo novo vira duas migrations, e a tabela cresce por multiplicação.
2. **JSON de preferências numa coluna.** Recusada: não dá para consultar "quem quer e-mail de
   evento" sem varrer, e o job de alerta precisa exatamente disso.
3. **Incluir `push` desabilitado na interface.** Recusada por D1: controle visível que não
   entrega é a definição de tela que mente.
4. **Manter só o opt-out global existente.** Recusada: a prancha desenha a matriz, e a §4.8 C05
   exige gravação real por canal.

## Market or reference baseline

Produtos de comunidade (Discourse, Slack, GitHub) usam matriz tipo × canal, com push
condicionado a serviço conectado e permissão do navegador. Comunicação de marketing é opt-in
separado — e, no Brasil, a LGPD trata comunicação promocional como finalidade distinta.

## Proposed divergence from baseline

Nenhuma. Este é o padrão; o produto estava abaixo dele.

## Evidence and sources

- Prancha 52 e a leitura em [`PRANCHAS-WEB-RESTANTES.md`](../agents/PRANCHAS-WEB-RESTANTES.md).
- [`HANDOFF-2026-09-09-fidelidade-pranchas.md`](../agents/HANDOFF-2026-09-09-fidelidade-pranchas.md),
  linha "Canais de entrega" e "Novidades do Bivaque".
- §4.8 C05 e §6 ("Notificações") da especificação de 08/09.
- Colunas atuais em `supabase/database.generated.ts`; `outbox` e `notification_opt_outs` em
  `supabase/migrations/`.

## Benefits

A tela de Configurações passa a poder existir inteira. O despachante único torna a preferência
testável com um caso positivo e um negativo, em vez de um por produtor.

## Risks

- **Privacidade e conformidade:** `product_news` ligado por padrão seria comunicação sem
  consentimento; D3 fecha isso.
- **Entrega:** um produtor que despache direto, fora do outbox, contorna D4. O teste negativo
  precisa cobrir isso.
- **Migração:** semear errado muda a entrega de quem já usa; D2 preserva o comportamento atual.

## Reversal cost

Baixo. A matriz é derivável dos booleanos e vice-versa enquanto só houver dois canais.

## Success metric

Desligar o e-mail de um tipo faz a próxima entrega daquele tipo não gerar e-mail e continuar
gerando in-app, provado por teste de integração sobre o despachante — não por captura de tela.

## Reopen condition

Quando houver serviço de push web conectado, D1 é reaberto para incluir o canal e o tratamento
da permissão do navegador.

## Approval

Aprovado em 09/09/2026 pelo dono do produto (Juan), por autorização explícita na sessão de
Claude Code que redigiu este ADR: "Aprovo as adr", referindo-se aos seis ADRs de 09/09/2026
listados em [RECON-WEB-EXECUCAO.md](../agents/RECON-WEB-EXECUCAO.md).

Destrava os contratos RECON-031 e a parte de entrega do RECON-028.

**Nenhum crítico adversarial revisou este ADR.** A aprovação é humana e direta; a revisão
independente continua exigida por lote, sobre o diff que implementar estas decisões.
