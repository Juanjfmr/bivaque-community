# APP-003 — mapa de cobertura (onda 1c)

Escrito na retomada C1, rodada 3/3, contra o HEAD de trabalho `b19e2982` (WIP) e a
base de julgamento `d4810b41`/`.visual/coordenacao/APP-003-C1-base`. A régua é o
protótipo (`apps/prototipo`) e o inventário §5, §6, §7 e §9; a autoridade SPA é
`docs/decisions/ADR-20261024-front-react-spa.md`.

Regra deste mapa: **cada linha aponta para o arquivo que a implementa e para o
teste que a mede**. Item sem consumidor nesta onda está escrito como
`não entregue` / `onda N` — não é declarado pronto só por aparecer na galeria.

Contagens: 52 componentes (§7), 40 movimentos (§6), 100 ícones (§9).

Atualização Codex, 25/10, após assumir diretamente por decisão do dono:
o mapa preserva a origem do WIP acima; correções e provas atuais ficam no STATUS.
Foram corrigidos testes que clicavam barra móvel intencionalmente oculta, medição
de foco/rolagem após clique visível, recorte/área de toque do Criar e reescrita de
URL desconhecida. A comparação encontrou e corrigiu a pilha móvel/painel ancorado
do Criar. Instrumentos passam por revisão independente do Qwen.

Limites da fundação: escolhas do Criar ainda não abrem as jornadas 2–8; Avisos
entrega o contador, sem inbox funcional. O painel de cidade troca a cidade
consultada e a faixa de visita; campos de momento/chegada/saída pertencem à
jornada da onda 8. Isso não é aprovação visual desses formulários nem backend.

---

## 1. Ações e overlays da casca (§5)

| Ação / overlay | Marcador | Arquivo | Teste |
|---|---|---|---|
| Barra do topo por rota | `[data-topo="barra"]` | `src/casca/BarraDoTopo.tsx`, `lib/casca.ts` | `tests/casca.test.ts`; `tests/e2e/casca.spec.ts` |
| Marca nas raízes | `[data-marca="simbolo"]` | `components/bivaque/marca.tsx` | `tests/e2e/casca.spec.ts` |
| Voltar nas telas de dentro | `[data-acao="voltar"]` | `src/casca/BarraDoTopo.tsx` | `tests/e2e/casca.spec.ts` |
| Avisos com contador (só na Início) | `[data-acao="avisos"]`, `[data-contador="avisos"]` | `src/casca/BarraDoTopo.tsx` | `tests/e2e/casca.spec.ts`, `tests/e2e/acessibilidade.spec.ts` |
| Conversas com contador (topo) | `[data-acao="conversas-topo"]`, `[data-contador="conversas"]` | `src/casca/BarraDoTopo.tsx` | `tests/e2e/casca.spec.ts` |
| Chip de cidade e troca | `[data-acao="cidade"]`, `[data-sobreposicao="cidade"]` | `src/casca/BarraDoTopo.tsx`, `src/casca/PainelDeCidade.tsx` | `tests/e2e/casca.spec.ts`, `tests/e2e/acessibilidade.spec.ts` |
| Faixa de visita ("outra cidade") | `[data-faixa="visita"]` | `components/bivaque/faixa-de-contexto.tsx`, `lib/casca.ts` | `tests/casca.test.ts`, `tests/e2e/casca.spec.ts` |
| Busca em tela cheia (`/app/busca`) | `[data-campo="busca"]`, `[data-acao="limpar-busca"]` | `src/casca/BarraDoTopo.tsx` | `tests/e2e/casca.spec.ts` (digita + limpa) |
| Navegação Início·Comunidade·Criar·Mercado·Você | `[data-nav="principal"]`, `[data-aba]`, `[data-acao="criar"]` | `src/casca/NavegacaoPrincipal.tsx`, `lib/casca.ts` | `tests/casca.test.ts`, `tests/e2e/casca.spec.ts` |
| Aba ativa pela origem da entrada | `[aria-current="page"]` | `lib/navegacao/abas.ts` | `tests/navegacao/abas.test.ts`, `tests/e2e/abas.spec.ts` |
| Barra de baixo oculta em telas de dentro (<720) | `[data-visivel]` | `lib/casca.ts` (`navegacaoVisivel`) | `tests/e2e/casca.spec.ts` |
| Minimização ao rolar | `[data-minimizada]`, `[data-compacto]` | `lib/movimento.ts` (`calcularMinimizada`), `src/casca/Casca.tsx` | `tests/movimento.test.ts`, `tests/e2e/casca.spec.ts`, `tests/e2e/acessibilidade.spec.ts` |
| Docagem do título grande | `[data-docada]` | `lib/movimento.ts` (`tituloDeveDocar`), `src/casca/BarraDoTopo.tsx` | `tests/movimento.test.ts`, `tests/e2e/casca.spec.ts` |
| Menu Criar (pilha/painel) | `[data-sobreposicao="menu-criar"]`, `[data-escolha]` | `src/casca/MenuCriar.tsx` | `tests/e2e/casca.spec.ts`, `tests/e2e/acessibilidade.spec.ts` |
| Atalho `C` do Criar | `aria-keyshortcuts="C"` | `src/casca/MenuCriar.tsx` (`useAtalhoDoCriar`) | `tests/e2e/casca.spec.ts` |
| Troca de página (anima as telas de dentro) | `[data-animacao="pagina"]` | `src/casca/Casca.tsx`, `lib/movimento.ts` (`prefersReduzido`) | `tests/e2e/movimento.spec.ts` |
| Histórico único das sobreposições | `lib/navegacao/react.tsx` (`abrir`/`fecharSobreposicao`) | `lib/navegacao/react.tsx` | `tests/e2e/sobreposicoes.spec.ts`, `tests/e2e/casca.spec.ts` |
| Foco devolvido ao acionador | descritor em `lib/navegacao/entrada.ts` | `lib/navegacao/entrada.ts` (`seletorDoDescritor`), `lib/navegacao/restauracao.ts` | `tests/navegacao/entrada.test.ts`, `tests/navegacao/restauracao.test.ts`, `tests/e2e/sobreposicoes.spec.ts` |
| Tema claro/escuro pelo sistema | tokens `:root` / `@media (prefers-color-scheme)` | `src/styles.css` | `tests/e2e/tema.spec.ts` |
| `theme-color` acompanha o tema | `<meta name="theme-color">` | `apps/app/index.html` | `tests/e2e/tema.spec.ts` |

---

## 2. Os 52 componentes da seção 7

Cada linha da galeria é uma `section[data-galeria="<id>"]` com a ficha e o
exemplo. `tests/galeria.test.ts` exige um item por id; `tests/e2e/componentes.spec.ts`
mede o comportamento. `consumidor` vem de `lib/galeria.ts`.

| # | id | Arquivo | Prova | Consumidor |
|---|---|---|---|---|
| 1 | imagem-do-asset | `lib/assets.ts` | `tests/unidades.test.ts`, `componentes.spec.ts` | casca 1c |
| 2 | capa | `components/bivaque/capa.tsx` | `componentes.spec.ts` (galeria) | onda 5 |
| 3 | botao | `components/bivaque/botao.tsx` | `componentes.spec.ts` | casca 1c |
| 4 | botao-de-icone | `components/bivaque/botao.tsx` | `componentes.spec.ts`, `icones.spec.ts` | casca 1c |
| 5 | selecao | `components/bivaque/campos.tsx` | `componentes.spec.ts` | casca 1c |
| 6 | campo | `components/bivaque/campos.tsx` | `componentes.spec.ts` | casca 1c |
| 7 | etiqueta | `components/bivaque/etiqueta.tsx` | `componentes.spec.ts` | casca 1c |
| 8 | titulo-de-secao | `components/bivaque/secao.tsx` | `componentes.spec.ts` | casca 1c |
| 9 | arte-vazia | `components/bivaque/arte-vazia.tsx` | `componentes.spec.ts` | casca 1c |
| 10 | estado-vazio | `components/bivaque/estado-vazio.tsx` | `componentes.spec.ts` | casca 1c |
| 11 | cartao-de-foto | `components/bivaque/cartao-de-anuncio.tsx` | `componentes.spec.ts` | onda 5 |
| 12 | cartao-de-negocio | `components/bivaque/cartao-de-anuncio.tsx` | `componentes.spec.ts` | onda 5 |
| 13 | linha-de-pergunta | `components/bivaque/linha-de-pergunta.tsx` | `componentes.spec.ts` | onda 3 |
| 14 | linha-de-encontro | `components/bivaque/linha-de-pergunta.tsx` | `componentes.spec.ts` | onda 4 |
| 15 | sem-ponteiro-de-dom | nota (sem componente) | `galeria.test.ts` | casca 1c |
| 16 | sem-escape-manual | `lib/navegacao/entrada.ts` (`seletorDoDescritor`) | `tests/navegacao/entrada.test.ts` | casca 1c |
| 17 | texto-normalizado | `lib/texto.ts` | `tests/unidades.test.ts` | casca 1c |
| 18 | icone | `components/bivaque/icone.tsx`, `lib/icones.ts` | `tests/icones.test.ts`, `icones.spec.ts` | casca 1c |
| 19 | marca | `components/bivaque/marca.tsx` | `componentes.spec.ts`, `casca.spec.ts` | casca 1c |
| 20 | moeda | `lib/formato.ts` | `tests/unidades.test.ts` | casca 1c |
| 21 | id-local | `lib/id.ts` | `tests/unidades.test.ts` | casca 1c |
| 22 | data-iso | `lib/formato.ts` | `tests/unidades.test.ts` | casca 1c |
| 23 | rotulo-de-data | `lib/formato.ts` | `tests/unidades.test.ts` | casca 1c |
| 24 | dias-ate | `lib/formato.ts` | `tests/unidades.test.ts` | casca 1c |
| 25 | iniciais | `lib/texto.ts` | `tests/unidades.test.ts` | casca 1c |
| 26 | lista-paginada | `components/bivaque/lista-paginada.tsx` | `componentes.spec.ts` | casca 1c |
| 27 | pe-de-lista | `components/bivaque/fim-de-lista.tsx` | `componentes.spec.ts` | casca 1c |
| 28 | fim-de-lista | `components/bivaque/fim-de-lista.tsx` | `componentes.spec.ts` | casca 1c |
| 29 | chips-de-filtro | `components/bivaque/chips-de-filtro.tsx` | `componentes.spec.ts`, `filtros.spec.ts` | casca 1c |
| 30 | indicador-de-segmento | `components/bivaque/chips-de-filtro.tsx` | `componentes.spec.ts`, `movimento.spec.ts` | casca 1c |
| 31 | sobreposicao | `components/bivaque/sobreposicao.tsx` | `componentes.spec.ts`, `sobreposicoes.spec.ts` | casca 1c |
| 32 | fechar-sobreposicao | `components/bivaque/sobreposicao.tsx` | `componentes.spec.ts`, `sobreposicoes.spec.ts` | casca 1c |
| 33 | guarda-de-edicao | nota (onda 6) | `galeria.test.ts` | onda 6 |
| 34 | confirmacao | `components/bivaque/confirmacao.tsx` | `componentes.spec.ts` | casca 1c |
| 35 | historico-da-sobreposicao | `lib/navegacao/react.tsx` | `sobreposicoes.spec.ts` | casca 1c |
| 36 | aviso | `components/bivaque/avisos.tsx` | `componentes.spec.ts` | casca 1c |
| 37 | selo-verificado | `components/bivaque/selo-verificado.tsx` | `componentes.spec.ts` | onda 5 |
| 38 | explicacao-do-selo | `components/bivaque/selo-verificado.tsx` | `componentes.spec.ts` | onda 5 |
| 39 | contagem-animada | `components/bivaque/contador.tsx`, `avatar.tsx` | `componentes.spec.ts`, `movimento.spec.ts` | casca 1c |
| 40 | cabeca-de-pagina | `components/bivaque/cabeca-de-pagina.tsx` | `componentes.spec.ts` | casca 1c |
| 41 | secao | `components/bivaque/secao.tsx` | `componentes.spec.ts` | casca 1c |
| 42 | grade | `components/bivaque/grade.tsx` | `componentes.spec.ts` | casca 1c |
| 43 | lista | `components/bivaque/lista.tsx` | `componentes.spec.ts` | casca 1c |
| 44 | cartao-de-publicacao | `components/bivaque/cartao-de-publicacao.tsx` | `componentes.spec.ts` | onda 4 |
| 45 | linha-de-ajuste | `components/bivaque/lista.tsx` | `componentes.spec.ts` | casca 1c |
| 46 | faixa-de-visita | `components/bivaque/faixa-de-contexto.tsx` | `casca.spec.ts` | casca 1c |
| 47 | fim-de-bloco | `components/bivaque/fim-de-lista.tsx` | `componentes.spec.ts` | onda 5 |
| 48 | chips | `components/bivaque/chips.tsx` | `componentes.spec.ts` | casca 1c |
| 49 | avatar | `components/bivaque/avatar.tsx` | `componentes.spec.ts` | casca 1c |
| 50 | menu-de-linha | `components/bivaque/menu-de-linha.tsx` | `componentes.spec.ts` | casca 1c |
| 51 | acoes-do-detalhe | `components/bivaque/acoes-do-detalhe.tsx` | `componentes.spec.ts` | onda 4 |
| 52 | esqueleto | `components/bivaque/esqueleto.tsx` | `componentes.spec.ts` | casca 1c |

Itens de ondas futuras (2, 11, 12, 13, 14, 33, 37, 38, 44, 47, 51) são
**componentes reutilizáveis provados na galeria**, mas não têm tela de produto
nesta onda — não são declarados entregues como jornada.

---

## 3. Os 40 movimentos da seção 6

`lib/galeria.ts` (`MOVIMENTOS`) registra número, dono e consumidor;
`tests/e2e/movimento.spec.ts` mede movimento normal e reduzido; `tests/movimento.test.ts`
cobre as contas puras.

| # | Movimento | Onde vive | Prova | Consumidor |
|---|---|---|---|---|
| 1 | animatePage | `src/casca/Casca.tsx` | `movimento.spec.ts` | casca 1c |
| 2 | foto em voo (abrir) | não implementado | — | onda 5 |
| 3 | foto em voo (voltar) | não implementado | — | onda 5 |
| 4 | cascata do detalhe | `lib/movimento.ts` (`atrasoDaSubida`) | `movimento.test.ts` | onda 5 |
| 5 | cascata das listas | `lib/movimento.ts` (`atrasoDaLista`, `limiteDaCascata`) | `movimento.test.ts` | casca 1c |
| 6 | contador animateCounts | `components/bivaque/contador.tsx` | `movimento.spec.ts` | casca 1c |
| 7 | celebrate | `lib/movimento.ts` (`animarSePossivel`) | `movimento.test.ts` | onda 3 |
| 8 | entrada da foto (imageSettled) | `components/bivaque/esqueleto.tsx` | `componentes.spec.ts` | onda 5 |
| 9 | esqueleto da foto (img-shimmer) | `components/bivaque/esqueleto.tsx` | `componentes.spec.ts` | casca 1c |
| 10 | abrir/fechar diálogo | `components/bivaque/sobreposicao.tsx` | `sobreposicoes.spec.ts` | casca 1c |
| 11 | fecho do menu Criar | `src/casca/MenuCriar.tsx` | `casca.spec.ts` | casca 1c |
| 12 | morfo botão→painel Criar | `src/casca/MenuCriar.tsx` | `casca.spec.ts` | casca 1c |
| 13 | cascata do painel Criar | `src/casca/MenuCriar.tsx` | `casca.spec.ts` | casca 1c |
| 14 | paleta de comandos | não implementado | — | onda 2 |
| 15 | dica de deslize | não implementado | — | onda 7 |
| 16 | encaixe do deslize | não implementado | — | onda 7 |
| 17 | arrasto lateral da linha | não implementado | — | onda 7 |
| 18 | retorno pela borda | não implementado | — | onda 7 |
| 19 | toque longo | não implementado | — | onda 7 |
| 20 | indicador de segmentos | `components/bivaque/chips-de-filtro.tsx` | `movimento.spec.ts` | casca 1c |
| 21 | barra de etapas do wizard | não implementado | — | onda 6 |
| 22 | abertura da folha de filtros | não implementado | — | onda 5 |
| 23 | altura da folha do bairro | não implementado | — | onda 5 |
| 24 | arrasto da folha do bairro | não implementado | — | onda 5 |
| 25 | encolher a página de trás | `lib/movimento.ts` (`paginaEncolhe`) | `movimento.test.ts` | casca 1c |
| 26 | arrasto da folha de diálogo | `lib/movimento.ts` (`distanciaFechaFolha`), `sobreposicao.tsx` | `movimento.test.ts`, `sobreposicoes.spec.ts` | casca 1c |
| 27 | minimizar a navegação | `lib/movimento.ts` (`calcularMinimizada`), `NavegacaoPrincipal.tsx` | `movimento.test.ts`, `casca.spec.ts` | casca 1c |
| 28 | rótulo do Criar compacto | `src/casca/NavegacaoPrincipal.tsx` | `casca.spec.ts` | casca 1c |
| 29 | título que sobe | `lib/movimento.ts` (`tituloDeveDocar`), `BarraDoTopo.tsx` | `movimento.test.ts`, `casca.spec.ts` | casca 1c |
| 30 | barra imersiva do detalhe | não implementado | — | onda 5 |
| 31 | balões de conversa | não implementado | — | onda 7 |
| 32 | barra de tempo do aviso | `components/bivaque/avisos.tsx` | `componentes.spec.ts` | casca 1c |
| 33 | blocos da lista longa | `components/bivaque/lista-paginada.tsx` | `componentes.spec.ts` | casca 1c |
| 34 | estados vazios ilustrados | `components/bivaque/estado-vazio.tsx` | `movimento.spec.ts` | casca 1c |
| 35 | press nos cartões | `src/styles.css` (`.bv-press`) | `casca.spec.ts` (alvos) | casca 1c |
| 36 | pontos do celebrate (burst) | não implementado | — | onda 3 |
| 37 | zoom da foto na galeria | não implementado | — | onda 6 |
| 38 | troca de foto (lbSlideIn) | não implementado | — | onda 6 |
| 39 | foto acompanha o dedo | não implementado | — | onda 6 |
| 40 | processamento de fotos do editor | não implementado | — | onda 6 |

Os movimentos com consumidor "onda N" ficam **explícitos como consumidor futuro**;
em nenhum caso são declarados entregues. `reduced-motion` suprime o movimento sem
remover o feedback funcional — medido em `tests/e2e/movimento.spec.ts` (ilustração,
navegação, contagem, troca de página e indicador de segmento).

---

## 4. Os 100 ícones da seção 9

- Lista e ligaduras: `lib/icones.ts` (`NOMES_DE_ICONE`, cinco grupos).
- Renderização: `components/bivaque/icone.tsx` — sempre `aria-hidden="true"`, sem
  a ligadura no nome acessível.
- Fonte local: `public/fonts/material-symbols-outlined.woff2` (servida em
  `/app/fonts/…`; nenhuma requisição de rede a fonte externa — `tests/e2e/fontes.spec.ts`).
- Prova: `tests/icones.test.ts` (grupos, ligaduras) e `tests/e2e/icones.spec.ts`
  (100 na galeria, um por nome, `aria-hidden`, família Material Symbols, ligadura
  vira glifo, ícone fora do nome acessível).

---

## 5. Tokens, fontes e temas

- Tokens claros/escuros traduzidos do protótipo em `src/styles.css` (`:root`,
  `@media (prefers-color-scheme: dark)`), expostos ao Tailwind por `@theme`.
- Fontes locais: Noto Sans, Noto Serif e Material Symbols em `public/fonts/`.
- Prova: `tests/e2e/tema.spec.ts` (claro padrão, escuro pelo sistema, troca ao vivo
  sem recarregar, casca pinta pelos tokens, contraste ≥ 4,5 nos dois temas).

---

## 6. Limites desta rodada (o que **não** fechou)

- Bateria de navegação da APP-002 × §5.3: cinco casos da bateria aprovada
  (`abas.spec.ts:151` ×4 e `sobreposicoes.spec.ts:57`, só em 375) navegam pela
  barra de baixo a partir de uma **tela de dentro** no celular; a §5.3 (e o
  protótipo) escondem a barra ali. Não há como satisfazer as duas ao mesmo tempo;
  o contrato proíbe alterar a bateria de navegação para esconder a regressão.
  → `HUMAN_DECISION`.
- A galeria é prova, não produto: não está no catálogo, não aparece na navegação
  e só existe com o modo de prova ligado (`src/modo-de-prova.ts`,
  `roteador.tsx`). Nada dela é jornada.
- Nenhuma tela das ondas 2 a 8 é implementada aqui; o conteúdo de jornada segue vazio.
