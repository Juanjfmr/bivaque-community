---
id: ADR-20260828-sistema-visual-editorial
status: accepted
risk: R1
owner: Juan
approved_at: 2026-08-28
amended_at: 2026-08-29
expires_at:
linked_plan:
critic_verdict: pending
critic_review:
---

# Sistema visual editorial sobre a identidade oficial — fecha o EXP-004

## Problem

O produto autenticado lia como SaaS genérico, e isso não era percepção: era o
estado literal dos tokens. `globals.css` e `packages/tokens` traziam
`#F8FAFC` / `#020617` / `#1E3A8A` — a tríade padrão do Tailwind (slate-50,
slate-950, blue-900) — sobre a *system font stack*. É exatamente o que todo
starter de SaaS entrega, e é o motivo de as telas não se distinguirem de
qualquer painel administrativo.

Três agravantes:

1. **O conjunto Navy nunca foi escolhido.** `DESIGN_SPEC.md` DS-036 (`EXP-004`)
   mantém paleta/tipografia/espaçamento/raio/elevação/movimento em aberto e diz
   literalmente que "the incumbent Navy/system-sans combination is one
   candidate, not baseline truth".
2. **O funil já tinha outra identidade.** Landing, login e onboarding entregam
   papel quente, tinta quente, verde-mata e um serifado editorial — mas os
   valores estavam copiados em três módulos CSS (`--ink`, `--login-ink`,
   `--flow-ink`), fora da camada de tokens. O membro atravessava uma identidade
   na aquisição e caía noutra ao entrar.
3. **A `Inter` era citada e nunca carregada.** As três pilhas nomeavam `Inter`
   sem nenhum `next/font`, então o que aparecia era Segoe UI ou Arial conforme o
   sistema operacional. O serifado era stack de sistema — Georgia na maioria dos
   Windows —, ou seja, a "identidade" variava por máquina.

## Decision

Adotar o **registro editorial** como sistema visual do produto inteiro, promovido à
camada de tokens (`packages/tokens/src/index.ts` + `apps/web/app/globals.css`), e
retirar a triplicação apontando os três módulos CSS do funil para esses tokens.

Isto **fecha o `EXP-004`** na direção do **candidato A — Civic Editorial**, com duas
divergências deliberadas registradas abaixo.

> **Emenda de 2026-08-29.** A primeira versão desta decisão instalava a paleta
> "Papel & Mata" (papel quente, verde-mata `#245B43`, Literata + Inter), derivada
> do que o funil já shipava. Um dia depois, a **identidade oficial** entrou no
> `main` (`#42`, `#43`) com outra paleta e outra tipografia. A direção editorial
> continua valendo — é o que o owner escolheu, e é forma, não cor. Os **valores**
> passam a ser os da marca aprovada. Esta é a "entrega visual própria" que
> `docs/brand/README.md` §Ativação futura exige, liberada por autoridade explícita
> do owner; o congelamento do card não caiu por decisão de agente.

O que muda:

- **Cor**: Papel `#F2F0EB`, Grafite `#253033`, Brasa `#B84A3A` — oficiais.
  Derivados **declarados**, porque o brandbook cobre identidade e não sistema de
  UI: `--surface` `#FBFAF7`, `--surface-sunken` `#E8E5DE`, `--muted` `#556366`,
  `--danger` `#8F2E23`, `--warning` `#7A5312`, `--success` `#2F6A4F`.
- **`--accent-strong` `#9E3B2C`, separado de `--accent`**: a brasa cheia dá 4.52:1
  no papel — passa raspando — e **falha** no `--surface-sunken` (4.09). Texto de
  acento e link usam a escurecida; preenchimento sólido usa a brasa aprovada.
- **`--danger` mais fundo que a brasa**: "aja nisto" e "isto destrói" não podem
  ser a mesma cor.
- **`--mist` é decorativo**: 2.75:1 no papel. Nunca carrega texto — quem carrega
  texto secundário é `--muted`. Isto está escrito no token e no VISUAL_GUIDE
  porque é a armadilha óbvia de quem só olhar o brandbook.
- **Tipografia**: Noto Serif (display) + Noto Sans (interface), auto-hospedadas
  via `next/font`, declaradas em `@theme` para gerar também `font-serif`/`font-sans`.
- **Forma**: elevação rasa (sombra só para o que de fato flutua), raios
  quase-retos, listas separadas por fio (`.ruled`) no lugar de cards flutuando, e
  primitivas editoriais (`.eyebrow`, `.paper`, `.rule-mark`, `.measure`).

O que **não** muda: os quatro containers de navegação
(`ADR-20260816-shells-e-navegacao`), a anatomia de rotas, e qualquer regra `MUST`
de `DESIGN_SPEC.md`. Nenhuma decisão de produto, privacidade ou acesso é tocada.

## Alternatives considered

1. **Manter o Navy e mexer só no espaçamento.** Rejeitada: a cor e a pilha de
   fonte são a maior parte do sinal "genérico"; ajustar ritmo não resolve.
2. **Candidato B — Community Modern** (sans humanista, superfícies em camadas,
   terracota). O próprio `comparison.md` registra que ele lidera em
   escaneabilidade, mas que "stats can read as growth/platform rather than calm
   community" — tensão direta com DS-001.
3. **Candidato C — Quiet Civic** (grotesca neutra, ardósia fria, mono tabular).
   Menor custo de implementação, mas o experimento anota que lê como
   "internal tool" e é o mais fraco em acolhimento. Também carrega uma exposição
   real a DS-011 no tablet.
4. **Rodar um EXP-004 novo do zero.** Rejeitada: o experimento já existe em
   `docs/agents/design-audit/experiments/EXP-004-2026-08-21-172457/`, com
   matriz e capturas. O que faltava era a decisão humana, não mais evidência.

## Market or reference baseline

O padrão de mercado para produtos de comunidade é o card branco arredondado com
sombra ambiente sobre fundo cinza, tipografia sans-only diferenciada por peso
(Nextdoor, Facebook Groups, Circle, Discourse). É o baseline que o Navy seguia.

## Proposed divergence from baseline

Divergimos em três pontos, e são as divergências que sustentam a distinção:

1. **Fio no lugar de sombra.** Lista contínua separada por hairline em vez de
   cards flutuantes.
2. **Serifado real na hierarquia.** Títulos em Literata, não sans em peso maior.
3. **Papel quente no lugar de cinza frio.**

Divergimos também do próprio candidato A em dois pontos, ambos endereçando
fraquezas que o experimento registrou nele:

- **Serifado só em título, corpo em sans.** O *tradeoff ledger* do A anota
  "serif body in a social/community context can read as newsletter". Restringir
  o serifado aos títulos preserva o registro editorial sem o custo.
- **Duas famílias, não três.** O A carregava Newsreader + Inter Tight +
  JetBrains Mono e por isso levou 3/5 em custo de implementação. Aqui são duas.

A terceira fraqueza registrada do A — 3/5 em densidade de leitura, porque
"hairlines + generous measure mean fewer items per viewport" — é endereçada
pela lista com fio, que cabe mais itens por tela do que os cards com `gap` que
ela substitui.

## Evidence and sources

- `docs/agents/DESIGN_SPEC.md` DS-036 / §7 — `EXP-004` em aberto; Navy declarado
  candidato, não linha de base.
- `docs/agents/design-audit/experiments/EXP-004-2026-08-21-172457/comparison.md`
  — matriz dos três candidatos. A lidera confiança (5) e distinção (5); a
  pergunta 1 de "What the human adjudicator needs to decide" é exatamente
  "local paper (A), community platform (B) ou operational tool (C)".
- `apps/web/app/landing/landing.module.css`,
  `apps/web/app/(preauth)/login/components/bivaque-sign-in.module.css`,
  `apps/web/app/(preauth)/onboarding/onboarding.module.css` — os três blocos
  duplicados, antes desta mudança.
- Contraste medido numericamente antes de fixar a paleta: todos os pares de
  texto ≥ 4.5:1 e todo sólido com texto ≥ 4.5:1 (DS-029 / WCAG 2.2 AA).
- Verificação de runtime: build de produção com as 27 rotas, 21 arquivos de
  fonte auto-hospedados em `.next/static/media`, e captura em 375/1440 de
  `/`, `/login`, `/signup`, `/onboarding` confirmando
  `body=Inter head=Literata bg=rgb(245, 242, 233)`.

## Benefits

- O membro deixa de trocar de identidade visual ao atravessar o login.
- A identidade passa a ser a mesma em qualquer sistema operacional, porque as
  fontes são auto-hospedadas em vez de resolvidas por stack local.
- `EXP-004` sai de aberto, com a decisão registrada e rastreável.
- Um papel visual compartilhado passa a ter um dono só (DS-034); mudar a
  identidade deixa de exigir editar quatro arquivos em sincronia.
- Auto-hospedar as fontes elimina requisição de terceiro atada ao visitante no
  funil, o que também é melhor sob LGPD.

## Risks

- **Acessibilidade**: paleta nova. Mitigado por medição numérica de contraste
  antes da adoção; nenhum par ficou abaixo de AA.
- **Regressão visual em telas não capturadas**: o shell autenticado não pôde ser
  fotografado nesta sessão (sem daemon Docker, logo sem stack Supabase). O risco
  é real e está declarado — a auditoria visual de `docs/superpowers/plans/2026-08-05-auditoria-telas.md`
  continua devendo para as telas autenticadas.
- **Custo de peso**: duas famílias de webfont. Mitigado por subset latin +
  latin-ext e `display: swap`.
- **Deriva documental**: `VISUAL_GUIDE.md` descrevia a paleta Navy; atualizado
  na mesma mudança para não deixar documentação mentindo sobre o código.

## Reversal cost

Baixo. A identidade é a camada de tokens: reverter é restaurar dois arquivos
(`globals.css`, `packages/tokens/src/index.ts`), remover o `next/font` do
`layout.tsx` e reverter os três módulos do funil. Sem schema, sem migração de
dados, sem comunicação a usuário. As mudanças de forma (lista com fio, estados
vazios) são independentes e podem ser mantidas ou revertidas em separado.

## Success metric

Uma tela autenticada capturada em 375/768/1440 passa a rubrica de
`VISUAL_GUIDE.md` §9 sem achado de hierarquia ou densidade, e um leitor que não
conhece o produto identifica o funil e o shell como o mesmo produto.

## Reopen condition

Contraste medido abaixo de AA em qualquer par em uso; ou evidência de que a
densidade da lista com fio prejudica a leitura de feed em vila com volume alto;
ou decisão de produto que mude o registro de confiança pretendido.

## Approval

Decisão humana do owner nesta sessão (2026-08-28), em resposta à pergunta 1 de
`comparison.md` ("qual registro de confiança?"): *"Quero dar uma cara de
comunidade de verdade, algo mais organizado e editorial, fotos e assets nos
cards vazios, empty states de verdade, Skeleton de verdade. Algo realmente
profissional."* — que seleciona o registro editorial do candidato A.

`critic_verdict` permanece `pending`: nenhum revisor independente examinou este
diff ainda.
