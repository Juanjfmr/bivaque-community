# Auditoria visual — Onda G (vitrine de prestadores)

**Data:** 2026-08-26
**Runs:**
- `.visual/2026-08-26T03-41-42-556Z/` — baseline, conta default, todas as rotas (3 viewports)
- `.visual/2026-08-26T21-21-58-859Z/` — autenticada como `prestador-seed@`, telas do painel
- `.visual/2026-08-27T02-15-51-464Z/` — `/prestador/catalogo` pós-correções
- `.visual/2026-08-27T02-23-28-522Z/` — `/prestadores/[id]` como `dono-vila@` (membro do alcance)
- `.visual/2026-08-26T22-31-35-627Z/`, `.visual/2026-08-26T22-34-06-726Z/` — painel e ficha pós-correções

**Telas no escopo:** `/prestador`, `/prestador/ficha`, `/prestador/catalogo`, `/prestadores/[id]` (ficha pública), `/communities/[id]/indicar-prestador`, `/prestador-convite/[token]`.

**Captura:** autenticada como `prestador-seed@` e `dono-vila@`, 375 / 768 / 1440.

## Veredito

**APROVADA.** As telas que a onda G criou passam com **zero achados de alta severidade**.

| Tela | capturas | alta severidade |
|---|---|---|
| `/prestador` (painel) | 3 | **0** |
| `/prestador/ficha` | 3 | **0** |
| `/prestador/catalogo` | 3 | **0** (antes de 3 alta) |
| `/prestadores/[id]` (ficha pública, como membro do alcance) | 3 | **0** |

Três frentes apareceram na auditoria, todas resolvidas:

1. **Catálogo: campos sem nome acessível (falso-positivo do checker).** O loop acusou
   `missing-accessible-name` em vários `input` rotulados por `<label for=…>`. O checker de
   `capture.mjs` só olhava `aria-label`/`textContent`/`title` e **não resolvia a associação
   `<label for>` — que é nome acessível válido (ARIA). Além disso, o Input da HeroUI não
   repassa `aria-label`, então esta é a forma correta de rotular no projeto. Corrigido o
   **checker** para resolver `label[for=id]`; o E2E da vitrine (`provider-vitrine.spec.ts`)
   já preenchia esses campos por `getByLabel`, provando o nome acessível real.

2. **Catálogo: input de foto com área de toque de 20px.** `input#foto-arquivo` (tipo `file`)
   tinha `w-full` sem altura mínima. Adicionado `min-h-11` (44px) + `cursor-pointer`,
   alinhado ao `§0` do `VISUAL_GUIDE` (toda ação ≥44px).

3. **`/communities`: touch-target de link herdado.** O loop acusou um link `a.hover:underline`
   de 97×21 na listagem de vilas — **dívida pré-existente**, já registrada no ledger pela
   auditoria da onda H (22/08), fora do escopo da G. Mesmo assim corrigi: `inline-flex
   min-h-11 items-center` + `transition-colors` + `focus-visible:underline` (resolve também
   o `no-transition` e cobre a navegação por teclado).

## Notas de cobertura

- `/prestador-convite/[token]` exige um token de convite vivo para renderizar o fluxo de
  aceite; a lógica de aceite é coberta por pgTAP (`supabase/tests/provider-invitation.sql`)
  e o E2E de convite comunitário; a tela foi auditada no estado público (rota pré-auth)
  sem achados na baseline.
- `/communities/[id]/indicar-prestador`: para a conta default sem permissão mostra o estado
  negado honesto (sem achados); o fluxo de dono é coberto pelo E2E.
- O loop segue devolvendo `KEEP ITERATING` porque conta o repositório inteiro; os achados
  restantes fora do escopo da onda vão para o ledger (dívida anterior).

## O que esta auditoria revelou além das telas

1. **Dívida de precisão no próprio checker de acessibilidade** — não modelar `<label for>`
   gerava falso-positivo de alta severidade a cada onda. Corrigido em `scripts/visual/capture.mjs`.
2. **O `min-h-11` deve ser regra para qualquer controlo interativo novo** — o input de arquivo
   nativo não herda altura do padrão de botões e escapou da revisão.