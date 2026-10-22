---
id: ADR-20261022-porte-visual-material-web
status: accepted
risk: R2
owner: Juan
approved_at: 2026-10-22
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md (seção 6, lote 3)
critic_verdict: PASS
critic_review: Aprovado pelo dono em 22/10/2026. Fundamentado na auditoria de 19/10 (seções 3.4 e 3.5) e no protótipo R70.
---

# O Next adota a camada visual do protótipo: Material Web, Noto e os tokens da marca

## Problem

O dono decidiu que o protótipo HTML é o Bivaque real em visual, UX e comportamento (opção A, 19/10/2026).
O Next continua sendo a base técnica.

Hoje o Next tem outra camada visual:

| Item | Next hoje | Protótipo (R70) |
|---|---|---|
| Componentes | HeroUI | Material Web 2.5.0 |
| Tipografia | Public Sans | Noto Sans e Noto Serif |
| Ícones | — | Material Symbols Outlined |
| Paleta | "Casa comum" (ADR-20260901-design-system) | brandbook oficial, com tema claro e escuro (ADR-20261020) |

O contrato `tests/scope/workspace-foundation.test.mjs` exige o HeroUI como única biblioteca de componentes. Sem uma
decisão, cada tela portada ou viola esse contrato, ou imita o Material com HeroUI e nunca fica igual ao protótipo.

## Decision

1. **Componentes.**
   - O Next usa Material Web `@material/web@2.5.0`, com versão exata, a mesma do protótipo.
   - O uso passa por adaptadores cliente em React 19.
   - O registro dos elementos `md-*` fica na fronteira cliente (`"use client"`), importando só os componentes usados,
     nunca o pacote inteiro no servidor.
   - As tags ganham declaração de tipos própria.
2. **Tipografia e ícones.**
   - Noto Sans (400 a 700), Noto Serif (600) e Material Symbols Outlined, com o eixo FILL e só os ícones usados.
   - Tudo self-hosted via `next/font/local`, a partir dos mesmos arquivos que o protótipo embute.
   - Nenhuma fonte de CDN.
3. **Tokens.**
   - Os tokens da R70 (`--md-sys-color-*` e `--bv-*`, com o par claro e escuro) passam a ser a fonte semântica das
     telas portadas.
   - O tema segue o sistema, com "Automática" como padrão (ADR-20261020).
4. **Migração tela a tela.**
   - O HeroUI continua nas telas ainda não portadas e sai de cada tela quando ela é portada.
   - Durante a migração, o contrato de escopo passa a aceitar exatamente duas bibliotecas: HeroUI e `@material/web`.
   - Quando a última tela for portada, o contrato volta a exigir uma só.
5. **Piloto.**
   - A landing pública (R73) é a primeira tela portada.
   - O aceite é a comparação de captura com o protótipo em 375 e 1440, nos dois temas, mais teclado, foco, contraste
     e ausência de requisição externa.

Este ADR substitui a direção visual "Casa comum" do ADR-20260901-design-system **nas telas portadas**. O restante
daquele ADR (governança, tokens em camadas, prova por runtime) continua valendo.

## Alternatives considered

- **Imitar o Material com HeroUI e Tailwind.** Rejeitada. Botões, campos, menus, ripple e foco têm comportamento
  próprio, e a cópia nunca fecha a comparação de captura com o protótipo.
- **Embutir o bundle IIFE do protótipo no Next.** Rejeitada. Ele escreve `innerHTML` na raiz e briga com o React pela
  mesma árvore, o que a auditoria (3.4) já apontou.
- **Trocar tudo de uma vez.** Rejeitada. São 33 rotas; a migração por tela mantém o produto funcionando e cada passo
  verificável.

## Market or reference baseline

O Material Web é a implementação oficial do Material 3 do Google, com web components que funcionam em React 19.

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

- `prototypes/bivaque-html/src/vendor/material-web-2.5.0.js`
- `prototypes/bivaque-html/src/styles/base.css` e `fonts.css`
- `prototypes/bivaque-html/docs/ROUND_70.md`
- `docs/AUDITORIA_ADERENCIA_2026-10-19.md`, seções 3.4, 3.5 e 6

## Benefits

- O Next fica igual ao protótipo por construção, não por imitação.
- Os tokens claro e escuro chegam junto, sem revisar cor tela a tela.

## Risks

- Duas bibliotecas convivem até o fim da migração. Cada tela portada precisa remover o HeroUI dela.
- Componentes web dentro do React exigem cuidado com SSR, eventos e formulários. O piloto da landing prova isso
  antes das telas com formulário.
- O bundle cresce. Importar por componente, e medir no piloto.

## Reversal cost

Médio enquanto só a landing estiver portada; cresce a cada tela.

## Success metric

- A landing do Next passa na comparação de captura com o protótipo nos 4 contextos.
- Nenhuma requisição externa.
- Gate e build verdes.

## Reopen condition

Reabrir se o piloto mostrar incompatibilidade do Material Web com o React 19 ou com SSR que não se resolva com
adaptadores cliente.
