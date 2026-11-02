---
id: ADR-20261102-paleta-fria
status: accepted
risk: R1
owner: Juan
approved_at: 2026-11-02 (por delegação do dono; ele autorizou mudar a paleta em 02/11)
expires_at:
linked_plan: docs/LANCAMENTO.md (fase 1)
critic_verdict: pass
critic_review: .visual/PALETA/juiz-astra.md (GPT-6 Astra, julgamento às cegas entre três candidatas)
---

# A paleta do app passa a ser fria: fundo cinza-claro, ação em ardósia, Brasa só no "criar"

## Problem

O veredito de maturidade de 02/11 (do agente e do Astra, em separado) achou o app "em parte" maduro. A paleta
somava ao problema: fundo creme (`#F2F0EB`), título em serifa e botão terracota (`#B84A3A`, e `#E07A5A` no escuro)
são hoje a combinação mais comum em telas geradas por IA. Além disso, a Brasa estava em todo botão principal, o que
deixava a cor da marca sem significado próprio.

## Decision

- **Fundo e superfícies frios.** Claro: fundo `#F3F5F6`, cartão branco, tinta `#1C262B`, apoio `#525E64`, linha
  `#DEE3E6`. Escuro: fundo `#101417`, cartão `#1A2024`, tinta `#E8ECEE`, apoio `#9CAAB2`, linha `#303A3E`.
- **Ação de concluir em ardósia** (`--acao`): Publicar, Continuar, Entrar. Claro `#26424F` com texto branco;
  escuro `#A5BFC8` com texto `#17282F`.
- **Brasa só em "começar a criar"** (`--pc-criar`): o botão flutuante de escrever e o Criar da barra. Ela vira a
  assinatura da marca, não a cor de todo botão.
- **Ilustrações com fundo transparente**, para pousarem em qualquer fundo; acaba a placa clara no escuro. Selos e
  escolhas ilustradas ganham fundo de tom (`--pc-tom`).
- Tipografia, raios e o resto da identidade das peças continuam.

## Alternatives considered

1. **A atual** (Papel, Grafite, Brasa no principal) — mantém a marca, mas é o padrão creme + terracota.
2. **Neutra** (fundo quase branco, principal em Grafite, Brasa só no criar) — segunda colocada, muito próxima.
3. **Fria** (esta) — vencedora no julgamento às cegas, pela continuidade da ação entre os temas e por se afastar
   do padrão.

## Market or reference baseline

Nextdoor (Mobbin, telas citadas no veredito de 02/11): fundo cinza-claro, cartões brancos, botões principais em
azul-marinho escuro e o verde da marca reservado ao botão de publicar. A decisão segue o mesmo princípio sem copiar
as cores.

## Proposed divergence from baseline

A cor da marca (Brasa) continua presente, no ato de criar; o Nextdoor faz o mesmo com o verde.

## Risks

- O `apps/web` (landing e telas antigas) ainda usa a paleta anterior até a troca de cada jornada; a landing é
  ajustada na fase 1.
- As telas antigas do `apps/app` que não usam as peças ainda pintam botões com Brasa até migrarem (fase 1).

## Reversal cost

Baixo: os valores vivem nos tokens de `apps/app/src/styles.css` e em `pecas.css`.

## Success metric

Revisão às cegas do Astra contra o Nextdoor no fim da fase 1 sem "abaixo da régua" em interface; teste de tema
(`tests/e2e/tema.spec.ts`) verde nos seis tamanhos.

## Reopen condition

O dono rebater no marco 1, ou um teste de contraste reprovar a combinação.
