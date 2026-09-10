---
id: ADR-20260909-perfil-bio
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-09
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e autorizacao humana explicita do dono (Juan) na sessao de 09/09/2026 — ver a secao Approval.
---

# A bio do perfil — o campo que a tela mostra e o banco não tem

## Problem

A prancha 51 mostra a bio em dois lugares: no cartão do topo do perfil e no formulário de
edição, com **contador 146/300**. A prancha 39 pede personalização opcional no onboarding.
A §4.8 C02 da especificação lista bio entre os campos editáveis.

`profiles` tem `display_name`, `visibility`, consentimento e suspensão. **Não tem bio.**

O [`ADR-20260908-perfil-campos-opcionais`](ADR-20260908-perfil-campos-opcionais.md) está
aprovado, mas o D2 dele é explícito: *"Somente Força Armada e Organização Militar"*. Bio ficou
fora, e a tela entregue omitiu o campo — o handoff de 09/09 registra isso como divergência
aberta que precisa de backend.

A regra do dono resolve o impasse na direção oposta à da entrega anterior: *"Omitir é honesto;
implementar exigia migration — não é honesto, devemos construir o backend junto das telas."*

## Decision

### D1 — Onde mora

Coluna `bio text` em `public.profiles`, anulável, com `check` de no máximo **300 caracteres** —
o limite que a prancha mostra no contador. Nada de tabela nova: bio é atributo do perfil, não
uma afiliação com visibilidade própria.

### D2 — Quem lê

**A bio segue a visibilidade do perfil**, a mesma coluna `visibility` que já governa o resto.
Não ganha controle "Exibir no perfil" individual: os controles individuais do
`ADR-20260908` existem porque Força e OM são declarações sobre vínculo com o Estado. Uma
apresentação escrita pela pessoa para ser lida é, por definição, para ser lida por quem alcança
o perfil.

### D3 — Como some

Esvaziar o campo grava `null`. **Aqui apagar apaga** — diferente do D3 do `ADR-20260908`, onde
desligar a visibilidade preserva o valor para permitir religar. Não há o que religar numa bio;
manter texto invisível no banco seria guardar dado sem finalidade.

### D4 — É superfície de texto livre

Vale a mesma varredura de conteúdo proibido que o repositório já aplica a texto de membro:
a bio não pode virar depósito de endereço, telefone, patente, posto ou dado de terceiro. Limite
de tamanho e varredura entram na **mesma** migration que a coluna.

## Alternatives considered

1. **Reusar `profile_affiliations` com `field = 'bio'`.** Recusada: aquela tabela existe para
   pares valor + visibilidade de declaração sobre vínculo militar; bio não tem essa semântica e
   herdaria um controle que não faz sentido.
2. **Bio com "Exibir no perfil" próprio.** Recusada em D2: acrescenta um controle que a prancha
   não desenha e cuja única função seria esconder um texto que a pessoa pode apagar.
3. **Continuar sem bio.** É o estado atual. Recusada pela regra do dono sobre regressão de
   prancha.
4. **Limite maior (500 ou 1000).** Recusada: o contador da prancha diz 300, e o limite da tela e
   o do banco precisam ser o mesmo número.

## Market or reference baseline

Toda rede de comunidade tem bio curta no perfil, visível a quem vê o perfil, sem controle
separado de visibilidade. 150–300 caracteres é a faixa usual.

## Proposed divergence from baseline

Nenhuma, exceto a varredura de conteúdo proibido em D4, que é específica deste produto e existe
porque o perfil não pode virar veículo de dado que a verificação promete não guardar.

## Evidence and sources

- Prancha 51 e a leitura em [`PRANCHAS-WEB-RESTANTES.md`](../agents/PRANCHAS-WEB-RESTANTES.md).
- [`HANDOFF-2026-09-09-fidelidade-pranchas.md`](../agents/HANDOFF-2026-09-09-fidelidade-pranchas.md),
  tabela "Abertas — precisam de backend", linha `/profile`.
- §4.8 C02 da especificação de 08/09.
- `ADR-20260908-perfil-campos-opcionais` D2 e D3.
- Colunas atuais de `profiles` em `supabase/database.generated.ts`.

## Benefits

Fecha a divergência mais visível do perfil com uma coluna e uma policy, e sem inventar um
mecanismo de visibilidade que a prancha não pede.

## Risks

- **Privacidade:** texto livre num perfil de população militar pode carregar OM, posto ou
  endereço. D4 é a mitigação, e é obrigatória na mesma migration.
- **Moderação:** bio abusiva precisa de caminho de denúncia; o alvo `profile` já existe em
  `reports`.

## Reversal cost

Baixo: remover a coluna descarta o texto. Comunicar a remoção seria necessário se já houvesse
bio preenchida em produção.

## Success metric

Uma conta preenche a bio, outra conta vê a bio no perfil dela conforme a visibilidade, e
esvaziar o campo faz a bio desaparecer das duas leituras — provado por pgTAP positivo e
negativo.

## Reopen condition

Se o perfil ganhar público segmentado (bio diferente por audiência), D2 é reaberto.

## Approval

Aprovado em 09/09/2026 pelo dono do produto (Juan), por autorização explícita na sessão de
Claude Code que redigiu este ADR: "Aprovo as adr", referindo-se aos seis ADRs de 09/09/2026
listados em [RECON-WEB-EXECUCAO.md](../agents/RECON-WEB-EXECUCAO.md).

Destrava o contrato RECON-020.

**Nenhum crítico adversarial revisou este ADR.** A aprovação é humana e direta; a revisão
independente continua exigida por lote, sobre o diff que implementar estas decisões.
