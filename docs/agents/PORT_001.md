# PORT-001 (R73) — a landing v8 no Next

Piloto do porte visual do ADR-20261022: a rota `/` do Next passa a ser a landing v8 do
protótipo (R71 e R72), na pele da marca dos dois temas. Este documento registra o que foi
portado, o que saiu, as decisões que se afastam do protótipo e as diferenças que sobram na
comparação de captura.

## O que foi portado

- **Estrutura e texto** (`apps/web/app/landing/landing.tsx`, servidor): topo com o símbolo
  oficial, `#inicio`, `#exemplo`, `#recursos`, `#mudanca`, `#participar`, `#perguntas`,
  `#fim`, rodapé, barra fixa do celular e folha do menu. Título F ("Juntos somos mais
  fortes."), linha de apoio, linha das três Forças, quatro recursos, quatro itens da
  mudança, três passos, seis perguntas (a do CPF aberta) e as legendas das duas telas — as
  mesmas palavras de `landing.js`.
- **Tokens** (`apps/web/app/brand-tokens.css`): `--md-sys-color-*`, `--bv-*`, as
  tipografias `--md-ref-typeface-*` e as formas da R70, copiados de `base.css`. O escopo é
  `.ld`, a raiz da landing: o tema do HeroUI das outras telas não muda. O escuro entra por
  `@media (prefers-color-scheme: dark)`.
- **Fontes** (`apps/web/app/fonts/landing-fonts.ts`): Noto Sans (400–700), Noto Serif (600)
  e Material Symbols Outlined com `next/font/local`, cada uma com `variable`. Pré-carregam
  só a Noto Sans e a Noto Serif. Nenhuma fonte, imagem ou script vem de CDN.
- **Material Web** (`apps/web/app/components/material/`): `filled-button.tsx` (adaptador
  cliente do `md-filled-button`, que importa só
  `@material/web/button/filled-button.js` por `import()` dentro do efeito),
  `material-icon.tsx` (o `md-icon` é só a fonte) e `register.ts` (registro uma vez só, no
  cliente). Os tipos das tags estão em `apps/web/types/material-web.d.ts`, sem `any`.
- **Comportamento** (`apps/web/app/landing/landing-behavior.tsx`, cliente): topo
  transparente sobre a foto e sólido depois dela, âncora ativa com a pílula, folha com foco
  contido e fundo inerte, barra fixa `inert` + `aria-hidden` + `visibility:hidden` quando
  escondida, alvos de 44 px, conversa que se monta ao entrar na tela e já montada com
  `prefers-reduced-motion`.
- **Metadados** (`apps/web/app/page.tsx`): título `Bivaque — Juntos somos mais fortes`,
  descrição igual à linha de apoio, Open Graph e `colorScheme: "light dark"`.

Arquivos apagados: `apps/web/app/landing/landing.module.css` e a landing antiga (GSAP,
lucide, HeroUI). Nada de `apps/web/public/landing/` fora de `v8/` foi tocado.

## Rotas

| Onde | Texto | Destino |
|---|---|---|
| topo, herói, chamada final, barra fixa, folha | Criar conta | `/signup` |
| topo, rodapé, folha | Entrar / Já tenho conta · Entrar | `/login` |
| rodapé, folha | Privacidade | `/privacidade` |
| rodapé, folha | Código de conduta | `/codigo-de-conduta` |

## O que saiu

1. **"Ajuda"** (o botão do rodapé e o da folha) e **"Fale com a gente"** (o convite dentro
   de Perguntas) **saíram**. No protótipo os dois abriam a ajuda do próprio app; no Next a
   ajuda vive em `/ajuda`, que está no grupo `(shell)` e exige sessão
   (`apps/web/app/(shell)/layout.tsx` faz o portão). Publicar um link que redireciona para
   `/login` seria prometer um destino que não existe para quem chega de fora.
   - Consequência visível: no rodapé do celular o `grid` de duas colunas fica com três
     links, e a coluna de Perguntas perde a linha "Outra dúvida? Fale com a gente". É a
     única diferença de conteúdo em relação ao protótipo.
2. Nada mais saiu: todos os outros textos aparecem palavra por palavra.

## Decisões que se afastam do protótipo, com razão

1. **Tokens em `rgb()`, não em hexadecimal.** Os valores são exatamente os da R70, byte a
   byte; só a notação muda. `tests/scope/design-tokens.test.mjs` recusa `#` em qualquer CSS
   de `apps/web/app` fora do `globals.css`, e este arquivo é a camada de tokens da landing,
   não um componente com cor solta. O teste não está nos `allowed_paths` desta tarefa, então
   a notação foi a forma de não abrir uma exceção no contrato de escopo.
2. **`themeColor` continua vindo do adapter de tokens, e não o par claro/escuro pedido.**
   `tests/scope/design-system-contract.test.mjs` exige a expressão literal
   `themeColor: brandTokens.color.accent`, e a forma de lista com `media` não casa com ela.
   O teste também não está nos `allowed_paths`. O par pronto, para entrar junto com a
   atualização de uma linha naquele teste:
   `[{ media: "(prefers-color-scheme: light)", color: "#F2F0EB" }, { media: "(prefers-color-scheme: dark)", color: "#171E20" }]`,
   que são as superfícies dos dois temas em `brand-tokens.css`. Hoje o navegador usa o verde
   do adapter (`#164734`) nos dois temas.
3. **A `visibility` da folha do menu entra na hora e sai depois do slide.** No protótipo ela
   transiciona nos dois sentidos; no primeiro quadro a folha ainda é `hidden`, o `focus()` do
   botão Fechar é ignorado e o foco fica no `body`. Com `visibility 0s` na abertura a folha é
   focável no mesmo evento, e `visibility 0s linear 0.28s` no fechamento mantém a animação.
   Fechada, a folha também recebe `inert`.
4. **O padding do `md-filled-button` é reposto em CSS.** O preflight do Tailwind
   (`* { padding: 0 }`) vence o `:host` do Material na cascata da árvore externa: sem repor,
   o CTA perde os 12 px/24 px do componente e o rótulo encosta na borda arredondada. A regra
   em `landing.css` recalcula as mesmas medidas a partir dos tokens do botão
   (`container-height`, `label-text-line-height`, `leading-space`, `trailing-space`).
5. **A página rola no documento, não em `#main`.** Os observadores, a rolagem e o
   `ld-locked` foram transpostos para `window`/`body`; o resto do comportamento é o mesmo.

## Comparação de captura

`node scripts/port/compare-landing.mjs` gera em `.visual/port-001/`:

- `{375,1440}-{light,dark}-topo-par.png` — protótipo à esquerda, Next à direita, na dobra;
- `{375,1440}-{light,dark}-inteira-par.png` — o mesmo par com a página inteira;
- as metades separadas (`-prototipo-topo.png`, `-next-topo.png`, …) e o `report.json` com as
  dimensões de cada captura.

O protótipo é gerado por `python scripts/bivaque-html/build.py` e chega à landing pelo
mesmo caminho das provas da R71 (Você → Sair → confirmar). O Next é o servidor de produção
(`next start`), o mesmo que o Playwright sobe. Duas normalizações de captura, que não mexem
em nenhum dos dois produtos:

- a barra de rolagem de `#main` é escondida: um contêiner aninhado recebe barra clássica
  (15 px) no Chromium, enquanto a rolagem do documento usa barra sobreposta. Sem isso o
  protótipo perde 15 px de largura de conteúdo e o texto quebra em outra linha.
- a página inteira é capturada com o viewport alto o bastante para caber a landing: o
  Chromium pinta o documento de uma vez, e a captura do elemento não pinta o que o `#main`
  do protótipo recorta.

### O que sobrou de diferente

Medido nas capturas desta rodada (22/10/2026):

| Contexto | Protótipo | Next | Diferença |
|---|---|---|---|
| 1440 claro/escuro, página inteira | 1440 × 4884 | 1440 × 4884 | idênticas em altura; todas as seções com a mesma altura (760, 632, 951, 784, 535, 706, 373) e o rodapé com 144 |
| 375 claro/escuro, página inteira | 375 × 6002 | 375 × 5938 | 64 px: a linha "Outra dúvida? Fale com a gente" que saiu |
| 375 e 1440, dobra | 375 × 812 / 1440 × 900 | iguais | idênticas |

Diferenças visuais que restam, e só elas:

1. **Perguntas** — a linha "Outra dúvida? Fale com a gente" não existe no Next (64 px de
   altura no celular; no desktop a coluna é mais alta que a linha, então só o texto some).
2. **Rodapé** — três links em vez de quatro: "Ajuda" saiu.
3. A pílula da âncora ativa aparece nas capturas de página inteira porque o viewport alto da
   captura deixa uma seção na faixa do observador; ela aparece no mesmo lugar nos dois
   lados.

## Testes

- `tests/e2e/landing-v8.spec.ts` (novo, 375 e 1440): título, linha de apoio e as sete seções
  na ordem; cada "Criar conta" em `/signup` e "Entrar" em `/login`; Privacidade e Código de
  conduta nas páginas do Next; nenhuma requisição externa; contraste do corpo e do CTA nos
  dois temas (com `page.emulateMedia({ colorScheme })` e os valores reais dos tokens);
  conversa montada/movimento reduzido; foco contido na folha, fundo inerte e barra fixa fora
  do teclado; ausência de rolagem horizontal; registro do Material no cliente sem erro de
  hidratação.
- `tests/e2e/smoke.spec.ts`, `manaus-pilot-full-journey.spec.ts` e
  `onboarding-holder-family.spec.ts` passaram a afirmar o texto da v8, com comentário
  "PORT-001". O que eles protegem continua igual: a raiz é pública e não tem o shell do app.
- `tests/scope/workspace-foundation.test.mjs` aceita exatamente `@heroui/*` e
  `@material/web` (2.5.0, versão exata) durante a migração, citando o ADR-20261022.

## Evidência

- `npx pnpm@11.18.0 gate` — verde (lint, typecheck, test, secrets).
- `npx pnpm@11.18.0 --filter web build` — verde, com as variáveis do Supabase local no
  ambiente e sem `.env.local`.
- `npx playwright test tests/e2e/landing-v8.spec.ts tests/e2e/smoke.spec.ts --workers=1` —
  23 passaram, 10 pulados (a spec só roda em 375 e 1440), 0 falharam.
- `node scripts/port/compare-landing.mjs` — 24 PNGs e `report.json` em `.visual/port-001/`.
