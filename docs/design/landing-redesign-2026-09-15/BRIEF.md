# Brief — Redesign da landing pública do Bivaque (15/09/2026)

> **Cópia canônica.** Este é o brief versionado que rege o redesign da landing pública. O
> original foi escrito em `.visual/landing-redesign-brief.md`, que é **gitignored**
> (`.gitignore:8`) e portanto não sobrevive a clone, CI ou revisão. O texto abaixo é cópia fiel
> daquele arquivo, feita em 15/09/2026. Mudança material de direção ou de copy entra aqui, não
> só no arquivo de trabalho.
>
> **Autoridade.** Vale para a aparência e a copy da landing pública. Substitui a decisão de
> serif **Georgia** e a descrição de entrega v1–v4 registradas em
> [`apps/web/app/landing/DIRECAO.md`](../../../apps/web/app/landing/DIRECAO.md). Não substitui
> invariantes de produto, privacidade, tokens, auditoria ou testes.
>
> **Prova.** O que foi verificado de forma independente, contra qual revisão e o que continua
> aberto está em [`VERIFICACAO.md`](VERIFICACAO.md).

Veredito do dono: "Toda a landing está fraca, tanto editorial quanto de conteúdo. Busque referências na internet para melhorar."

Este brief junta (a) o diagnóstico do render atual, (b) as referências reais levantadas na web, (c) a arquitetura de conteúdo com o vocabulário da família militar brasileira e (d) os limites de verdade do produto. Ele é o contrato da execução.

---

## 1. Diagnóstico do que está fraco (das capturas `.visual/landing-v4-2026-09-15/shots/`)

1. **Tipografia sem voz.** Display em Georgia, corpo pequeno (12–16px), manchetes longas. Nada no meio da página tem peso.
2. **Prova do produto enterrada.** A demonstração (a conversa) é um cartão mint com tipo de ~12px a um quarto da página — parece print de protótipo.
3. **Fotografia genérica.** Duas imagens de banco; o hero corta a segunda pessoa no desktop; nenhuma relação com lugar/chegada.
4. **Ritmo plano.** Branco → branco → branco → verde, mesma temperatura; a faixa de jornada é uma linha de 2px quase invisível.
5. **Conteúdo genérico.** "Gente que entende a vida militar" não diz o que a família resolve. Nenhum tópico real de remoção aparece (trânsito, ajuda de custo, bagagem, escola, saúde na guarnição, tempo de sede).
6. **A ideia central não tem imagem.** O produto é sobre mudar de cidade; a página não mostra cidade, rota nem rede.

## 2. Limites de verdade (não negociáveis)

- **Zero prova fabricada:** nenhum número, contador, depoimento, logo de parceiro ou "mais de X famílias". Só dado real e auditável ou nada.
- **Demonstração sempre rotulada** ("demonstração · pessoas e conversas ilustrativas"), como já faz a versão atual.
- **Nenhum serviço oficial.** NAS (assistência social da Marinha), FuSEx/SAMMED, Colégio Militar, PAPEEX, ajuda de custo e transporte de bagagem são **atos do Estado**. A landing explica, organiza a pergunta e aponta o canal oficial — nunca "resolve", "encaminha" ou "acompanha processo".
- **Nada de vaga garantida** em escola/creche/Colégio Militar nem "moradia garantida".
- **Normas e valores sempre como referência** ("consulte a norma vigente"), com link — nunca número solto (prazos, cubagem, tetos mudam).
- **Sem símbolo, brasão, patente ou endosso das Forças Armadas.** Iniciativa comunitária independente, e o aviso aparece visível, não só no rodapé.
- **LGPD:** cadastro de família, cidade, escola e saúde é dado sensível — a copy nunca pede nem expõe isso na landing.
- **Vocabulário da família, não jargão de marketing:** remoção, guarnição, trânsito, instalação, ajuda de custo, bagagem/cubagem, transferência ex officio, apresentação na nova OM, tempo de sede.

## 3. Referências reais (com o que roubar de cada uma)

| Referência | URL | O que roubar | O que conserta |
|---|---|---|---|
| **Geneva** | https://www.geneva.com/ | Manchete rotativa alimentada por conteúdo real: cidade + comunidade + foto (`Find natural explorers in Los Angeles`) e **stickers de UI do produto sobre a fotografia** | Hero genérico; desconexão marca↔produto |
| **Readymag** | https://readymag.com/ | Bloco inteiro em **verde profundo** com tipografia branca gigante + **colagem de imagens** (moodboard) | Monotonia; o verde hoje só aparece no fim |
| **Seed** | https://seed.com/ | **Linha-condutora fina** ligando um rótulo ao passo numerado, em bloco verde escuro | O "fio" da Bivaque era decorativo e invisível |
| **Eventbrite (Reconvene)** | https://www.eventbrite.com/ | **Tipo display gigante sobre foto full-bleed**, sangrando nas laterais | Hero tímido |
| **User Interviews / Maze / Craft** | https://www.userinterviews.com/ · https://maze.co/ · https://craftagency.com/ | **Foto com máscara em forma orgânica** e sangria nas bordas | Foto parece banco de imagem |
| **Typeform** | https://www.typeform.com/ | **Parede de rostos em escala** — comunidade mostrada por gente, não por contador | Ausência de humanidade sem prova falsa |
| **Escape Cafe / Faire / David** | https://www.escape.coffee/ · https://www.faire.com/ · https://davidprotein.com/ | **Passos numerados** com filetes, label uppercase e **links dentro do passo** (aprofundar em vez de prometer) | Seções rasas |
| **HoneyBook** | https://www.honeybook.com/ | **Citação em escala editorial** ao lado de foto espontânea, com nome e link | Prova social sem lastro |
| **Joby Aviation** | https://www.jobyaviation.com/ | **Mapa esquemático com arcos de rota** + linhas "cidade → cidade" | A rede nacional não tem imagem |
| **Maxima Therapy** | https://www.maximatherapy.com/ | **Mapa abstrato na cor da marca** com legenda | Idem, sem depender de dado |
| **IMS** | https://ims.com.br/ | **Crédito de foto visível** como sinal de seriedade (`Foto de … / Acervo …`) | Foto órfã sem contexto |
| **Longform editorial (NMFA / Substack / Partiful)** | https://www.militaryfamily.org/ · https://substack.com/about · https://partiful.com/ | **Home como feed editorial**: manchete + imagem + link; citação de imprensa só de veículo que **de fato** cobriu | Produto escondido |

**Direção escolhida (síntese):** hero com conteúdo real (cidade + pergunta + foto com legenda), display serif grande em linha curta, superfície off-white quente, **2–3 capítulos em verde profundo**, numeração **001/002/003**, pessoas nomeadas e números reais quando existirem, e um feed/demonstração mostrando a comunidade viva. Nada de roxo, nada de três cards iguais, nada de prova inventada.

## 4. Tipografia e escala

- **Display: Fraunces** via `next/font/google` — mesmo padrão já usado em `apps/web/app/experimento/page.tsx` (self-hosted no build, **zero request externo em runtime**, OFL 1.1). Georgia sai.
- **Interface/corpo: Public Sans** (já carregada no layout raiz).
- Escala (com `clamp`, sem estourar 375px):
  - H1 `clamp(3rem, 8vw, 7.5rem)`, line-height `0.95–1.02`, letter-spacing `-0.02em` a `-0.03em`, 16–24 caracteres por linha.
  - H2 de seção `clamp(2rem, 4.5vw, 3.5rem)`.
  - Kicker 12–14px, caixa alta, tracking `0.08em`, sans 600.
  - Corpo 17–20px, line-height `1.5–1.6`, medida 60–72 caracteres.
  - Legenda/crédito 13px; números em display 4–6rem.
- **Superfície quente:** papel levemente quente derivado de token (`color-mix` a partir de `--semantic-canvas`), nunca branco puro nem hex cru.
- **Capítulos:** 2–3 blocos full-bleed em verde profundo (token de ação primária), texto `on-strong`.
- **Numeração** 001/002/003 como dispositivo tipográfico.

**Anti-padrões proibidos:** gradiente roxo/branco; Inter/Roboto como display; grade de 3 cards idênticos; emoji como ícone; ilustração 3D flutuante; glassmorphism; texto com gradiente; dark mode; stock genérico; prova social fabricada; tudo centralizado com espaçamento uniforme; corpo < 16px e H2 < 28px.

**Guardrails do audit:** contraste ≥ 4,5:1 para texto; alvo de toque ≥ 44px; rotadores com `prefers-reduced-motion`; nenhuma fonte externa em runtime; HeroUI v3 é a única biblioteca de componentes.

## 5. Arquitetura de seções + copy

### 5.1 Hero
- Kicker: `MILITARES · VETERANOS · PENSIONISTAS · FAMÍLIAS`
- H1: **"Muda a cidade. Fica a sua rede."**
- Sub: "A remoção chega, o endereço muda — e o que sustenta a sua vida não precisa começar do zero. O Bivaque reúne o guia da nova cidade, as comunidades locais e gente que já fez esse caminho."
- CTA primário: **"Encontre a sua rede"** → `/signup`; secundário: "Ver como funciona" → `#como-funciona`.
- Visual: foto com **legenda creditada** ("Cena ilustrativa") e um **fio/rota** que sai da foto e entra no capítulo 001.

### 5.2 Faixa de jornada (o fio)
"De onde você vem → **A rede vai junto** → Para onde a vida leva" (herdada, com presença visual real).

### 5.3 Capítulo 001 — "A remoção saiu. E agora?"
- Kicker: `001 · O QUE RESOLVER QUANDO A REMOÇÃO SAI`
- H2: **"A lista que ninguém entrega junto com o boletim."**
- Sub: "Reunimos as perguntas que toda família faz quando a remoção sai — e onde procurar cada resposta."
- Três fases numeradas, com filetes e **links dentro dos itens**:
  - **Antes de viajar:** "Quanto tempo tenho de trânsito e de instalação?" · "O que a União cobre no transporte da mudança?" · "Como funciona a ajuda de custo?" · "Como transfiro meu filho de escola no meio do ano?" · "Meu filho pequeno tem creche ou pré-escola?"
  - **Na chegada:** "Onde e quando eu me apresento na nova OM?" · "Como fica o atendimento de saúde na nova guarnição?" · "Onde vou morar: vila, aluguel, casa?" · "Quais documentos levar na mão?"
  - **Depois de chegar:** "Como conheço outras famílias?" · "Meu cônjuge vai conseguir trabalhar?" · "Como preparar as crianças para a mudança?" · "Quanto tempo vou ficar? Quando vem a próxima?"
- Nota de honestidade visível na seção: "O Bivaque organiza a pergunta, junta quem já passou por isso e aponta o caminho oficial. Não substitui o órgão nem garante vaga, benefício ou moradia."

### 5.4 Capítulo 002 — a rede/cidade (o mapa)
- Kicker: `002 · DE CIDADE EM CIDADE`
- H2: **"Cada cidade tem um jeito de chegar. Alguém aqui já sabe qual é."**
- Mapa esquemático (arcos entre cidades, sem número inventado) + linhas de cidade com o que existe: **Guia da cidade** · **Comunidades** · **Serviços indicados**.
- Exemplos dos três tópicos de demonstração: Recife, Brasília, Manaus — rotulados como demonstração.

### 5.5 Capítulo 003 — como funciona (3 passos com links)
1. **Escolha a cidade** — "Veja o que a cidade tem: bairros, escolas, serviços, rotina." → link Guia.
2. **Encontre a sua turma** — "Comunidades por cidade e por interesse; grupos que já passaram pela mesma mudança." → link Comunidades.
3. **Devolva o que você aprendeu** — "A dica que teria feito diferença para você ajuda quem chega depois." → link Publicar.

### 5.6 Demonstração (a prova, agora grande)
- H2: **"Uma dúvida real. Uma resposta de quem já passou."**
- Cartão de publicação em escala legível (componentes reais `PostPreview` + `MemberAvatar`), 3 tópicos alternáveis (Recife/Brasília/Manaus), rótulo de demonstração visível.

### 5.7 Serviços indicados
- H2: **"Quem faz acontecer na sua nova cidade."**
- Usar as categorias reais de prestador do produto (conferir em `packages/domain` / `tests/unit/providers/provider-categories.test.ts` antes de listar).

### 5.8 Confiança e entrada
- H2: **"Antes do primeiro olá."**
- FAQ com as perguntas reais: "O Bivaque é oficial?" (**não**, iniciativa independente) · "Quem pode entrar?" (militares, veteranos, pensionistas e dependentes elegíveis; verificação antes da participação) · "Como funciona a entrada de familiares?" (convite, conta própria) · "Posso conhecer outra cidade antes de me mudar?" (sim) · "O que acontece com os meus dados?" (privacidade) · "Preciso pagar?" (usar a verdade do produto; **não inventar preço**).

### 5.9 Acolher (reciprocidade)
- Manter "Um dia você chega. No outro, você acolhe." com foto full-bleed e uma linha concreta: "A escola que você descobriu. O serviço que deu certo. O bairro que ninguém te contou."

### 5.10 Fechamento + rodapé
- Bloco verde: **"Sua próxima história já pode ter companhia."** + CTA "Quero fazer parte" e "Já tem conta? Entre no Bivaque".
- Rodapé: wordmark, privacidade, código de conduta, e o aviso de independência em destaque (não em letra miúda).

## 6. Execução, limites e prova

- **Caminhos permitidos (não tocar fora disso):** `apps/web/app/landing/**`, `apps/web/app/page.tsx`, `apps/web/public/landing/**`, `apps/web/package.json`, `pnpm-lock.yaml`, `tools/backend-kanban/public/board.json`, `tools/backend-kanban/BOARD.md`.
- **Não tocar:** `apps/web/app/components/bivaque/**`, `apps/web/app/layout.tsx`, `packages/**`, `scripts/**`, tokens, audit, testes.
- **Manter:** HeroUI v3 como única biblioteca; `LazyMotion strict` + `useReducedMotion`; teclado (o atalho é o primeiro Tab em produção); rotas e destinos atuais (`/signup`, `/login`, `/privacidade`, `/codigo-de-conduta`); âncoras do menu.
- **Prova:** `npx pnpm@11.18.0 gate --fast` durante a edição; `node scripts/visual/capture.mjs` com `BIVAQUE_VISUAL_BASE_URL=http://127.0.0.1:3014`, `BIVAQUE_VISUAL_ROUTE=/`, `BIVAQUE_VISUAL_RUN=<nome>` — iterar até **0 high**, e idealmente 0 achados.
- **Estados de referência:** a versão atual está preservada no histórico; o redesign não pode reduzir acessibilidade, contraste, alvo de toque nem responsividade.
