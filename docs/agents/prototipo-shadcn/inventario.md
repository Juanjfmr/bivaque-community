# Inventário do protótipo HTML — base para refazer em Next + shadcn/ui

**Tarefa:** PROTO-002. **Branch:** `codex/proto-shadcn`. **Revisão confrontada:**
`8c8cb7593234e0bba5ce66e449c25185377e6c94` (24/10/2026).
**Escopo:** inventariar `prototypes/bivaque-html/src/` inteiro, para que o protótipo seja refeito
inteiro em Next + shadcn/ui, com o mesmo conteúdo, aparência e comportamento.

Este documento **só levanta**. Nada foi editado além dele; nada foi executado (sem build, sem
servidor, sem teste, sem `apps/`, sem `supabase/`).

## O que ele é, e o que ele não é

- É o **checklist do que é "pronto"**: cada rota com os blocos de cima para baixo, os textos exatos, os
  estados (vazio, carregando, erro, sem acesso, visita a outra cidade), as diferenças de 375/768/1440,
  cada diálogo/editor/folha/menu com campos e mensagens, cada ação com o resultado visível, a casca, o
  movimento, os componentes comuns, os dados de demonstração, os ícones e as ondas de trabalho.
- **Não é prova de runtime.** Tudo vem da leitura do código e do CSS. Nenhuma tela foi aberta no
  navegador nesta tarefa. Onde o código não permitiu concluir, está escrito **não verificado**.
- **Não é auditoria visual nem de acessibilidade.** Contraste, foco e acessibilidade internas dos
  componentes Material Web usados pelo protótipo não foram lidos nem medidos.

## Método

1. **Leitura por área**, em 10 frentes independentes (catálogo de anúncios; detalhe/editor de anúncio;
   Início/Comunidade/pergunta/busca/guia; grupos/publicações/encontros; Você e o que pende dela;
   negócios; pedidos e propostas; conversas; entrada; painel do dono/legais/ajuda), cada uma cobrindo
   os arquivos de `src/features/`, `src/shell/` e `src/styles/` que desenham as suas rotas.
2. **Extração mecânica** sobre todo o `src/` (fora `vendor/`, `assets.js` e o base64 de
   `styles/fonts.css`): rotas (`navigationNames`, `render()`, `titleForRoute()`, `activeTab()`), 68
   `data-action` literais, 178 `case` de ação, 100 nomes de ícone em posição de ícone e as constantes
   dos dados de demonstração.
3. **Conferência contra o código**: as **456 referências `arquivo:linha` distintas do capítulo 2**
   (949 com repetição) foram validadas por script — arquivo existe e linha dentro do arquivo, **0
   falhas** —, assim como as **1241 referências distintas do documento inteiro**; 12 afirmações foram
   conferidas linha a linha contra a fonte, e as âncoras usadas pelos capítulos 3 e 4 foram
   confrontadas com os títulos do capítulo 2.
4. **Consolidação** em uma tabela de overlays, uma tabela de ações e um capítulo por assunto.

## Como ler

- Toda afirmação traz `caminho/arquivo.js:linha`, com a linha do arquivo real (1-based). Vários
  arquivos do protótipo são **minificados por linha**: uma linha única pode conter a tela inteira, e a
  citação aponta o bloco, não a regra isolada. Onde isso importa, está dito.
- **Textos de interface aparecem entre aspas, exatamente como estão no código** — títulos, botões,
  mensagens de erro e sucesso, placeholders, rótulos de campo, estados vazios. São o contrato de
  conteúdo do porte: não parafraseie ao implementar.
- `não verificado` marca o que não foi possível concluir por leitura, e não uma dúvida de quem escreveu.
- Os capítulos 3 e 4 são índices: o detalhe narrativo de cada overlay e de cada ação está no capítulo 2,
  na seção da rota onde ele aparece.

## Mapa do documento

| Capítulo | Responde |
|---|---|
| 1. Rotas | As 33 rotas: parâmetro, título, aba ativa, quem desenha, para onde volta, como se chega |
| 2. Conteúdo por rota | Cada rota, bloco a bloco, com textos, estados, viewports, overlays e ações |
| 3. Diálogos, editores, folhas e menus | Os 81 overlays: campos, limites, validações, botões, mensagens |
| 4. Ações | As 289 ações: onde aparecem, `data-value`, efeito visível, onde são tratadas |
| 5. Casca | Barra do topo, navegação, menu Criar, busca global, avisos, diálogos, estado, tema |
| 6. Movimento | Os 40 movimentos, quando disparam e como respeitam movimento reduzido |
| 7. Componentes comuns | Os 52 componentes reaproveitáveis, com assinatura, usos e veredito de porte |
| 8. Dados de demonstração | Entidades, registros, constantes, imagens, modelo de estado |
| 9. Ícones | Os 100 nomes de Material Symbols, agrupados, com evidência |
| 10. Proposta de ondas | 8 áreas de trabalho, dependências e tamanho relativo |
| 11. Contagem e lacunas | A contagem final e o que ficou fora |

## Fontes usadas

- `prototypes/bivaque-html/src/**` — fonte de verdade deste inventário.
- `prototypes/bivaque-html/src/manifest.json` — ordem real dos fragmentos no build.
- `prototypes/bivaque-html/docs/MODULE_MAP.md` — ownership, interfaces e rodadas de cada arquivo
  (usado como apoio para localizar mecanismos, não como contrato).
- `prototypes/bivaque-html/docs/NAVIGATION_AFTER.md` e `AUDITORIA_FUNCIONAL_2026-10-18.md` — inventários
  anteriores, **defasados**; serviram apenas para confronto, e as divergências estão registradas no
  capítulo 11.
- `prototypes/bivaque-html/docs/LOTE_FUNCIONAL.md` — regras de estilo e de prova do protótipo.

---

## 1. Rotas

Fonte: `prototypes/bivaque-html/src/shell/navigation.js` — `navigationNames` (`:4`), `titleForRoute()`
(`:53`), `activeTab()` (`:54`), `render()` (`:107`), `parseRoute()` (`:32`), `routeHash()` (`:2`),
`entryGate()` (`:106`), `back()` (`:51`), `readonlyHtml()` (`:108`).

Convenções do roteador, porque valem para todas as linhas da tabela:

- O endereço é o `hash`: `#<rota>` ou `#<rota>/<id>` (`routeHash`, `navigation.js:2`), com o id
  passando por `encodeURIComponent` e voltando por `decodeURIComponent` (`parseRoute`, `:34`).
  A cidade pode vir na query: `#desapegos?cidade=Manaus` (`parseRoute`, `:36`).
- Endereço inválido (rota fora de `navigationNames`, mais de um segmento, id que não decodifica) não
  gera 404: cai na rota interna `indisponivel`, com a mensagem do problema em `navigationProblem`
  (`:35`, `:38`) e o desenho de fallback de `render()` (`:107`).
- `entrar` tem 13 estados, dirigidos por `route.id` (`features/entry/account.js:70`, `login.js`,
  `arrive.js`; ver 2.9.1 a 2.9.13). `boas-vindas` é tratado à parte no `entryGate` (`:106`).
- `dono` e as rotas de `entrar` trocam o corpo: `owner-mode` e `entry-mode` (`shell()`,
  `navigation.js:57-58`), e a navegação do app sai de cena.
- Aba ativa: `inicio`, `comunidade`, `conversas` e `voce` são as quatro raízes; as demais herdam
  `origin` (`activeTab`, `:54`) — o valor de `origin` é ajustado por `navigate` (`:45`).

| # | Rota | Parâmetro | Título (`titleForRoute`) | Aba ativa (`activeTab`) | Desenha (arquivo:linha) | `back()` cai em (`:51`) |
|---|---|---|---|---|---|---|
| 1 | `inicio` | — | "Bivaque" | `inicio` | `renderHome` `features/home/views.js:12` (375/768) + `renderHomeDesktop` `features/home/desktop.js:6` (≥1024) | raiz |
| 2 | `comunidade` | — | "Comunidade" | `comunidade` | `renderCommunity` `features/community/views.js:1` | raiz |
| 3 | `conversas` | — | "Conversas" | `conversas` | `renderThreads` `features/messaging/views.js:2` | raiz |
| 4 | `conversa` | id de conversa (`state.threads`) | "Conversa" | `conversas` | `renderChat` `features/messaging/views.js:4` | `conversas` |
| 5 | `voce` | — | "Você" | `voce` | `renderProfile` `features/profile/views.js:4` | raiz |
| 6 | `busca` | — | "Buscar" | `origin` | `renderSearch` `features/search/views.js:6` | — (barra própria) |
| 7 | `catalogo` | — | "Imóveis" se `catalogKind()==='imovel'`, senão "Desapegos" | `origin` | `renderCatalog` `features/listings/catalog.js:11` | — (legado) |
| 8 | `desapegos` | — | "Desapegos" | `origin` | `renderCatalog` `features/listings/catalog.js:11` | — |
| 9 | `imoveis` | — | "Imóveis" | `origin` | `renderCatalog` `features/listings/catalog.js:11` | — |
| 10 | `negocios` | — | "Negócios locais" | `origin` | `renderBusinesses` `features/businesses/catalog.js:1` | — |
| 11 | `anuncio` | id de anúncio (`state.items`) | "Anúncio" | `origin` | `renderItem` `features/listings/detail.js:4` | `imoveis` ou `desapegos`, conforme `kind` |
| 12 | `negocio` | id de negócio (`state.biz`, `state.myBiz`) | "Negócio local" | `origin` | `renderBusiness` `features/businesses/detail.js:1` | `negocios` |
| 13 | `pergunta` | id de pergunta (`state.asks`) | "Indicação" | `comunidade` | `renderQuestion` `features/community/question.js:1` | `comunidade` |
| 14 | `grupo` | id de grupo (`state.groups`) | "Grupo" | `comunidade` | `renderGroup` `features/groups/views.js:96` | `comunidade` |
| 15 | `publicacao` | id de publicação (`{gid}~{pid}`) | "Publicação" | `comunidade` | `renderPost` `features/groups/views.js:115` | `comunidade` |
| 16 | `evento` | id de encontro (`state.events`) | "Encontro" | `origin` | `renderEvent` `features/events/views.js:16` | `agenda` |
| 17 | `agenda` | — | "Agenda da cidade" | `origin` | `renderAgenda` `features/events/views.js:7` | `inicio` |
| 18 | `salvos` | — | "Salvos" | `voce` | `renderSaved` `features/profile/views.js:9` | `voce` |
| 19 | `meus-anuncios` | — | "Meus anúncios" | `voce` | `renderMyAds` `features/profile/views.js:10` | `voce` |
| 20 | `minhas` | — | "Minhas indicações" | `comunidade` | `renderMineQuestions` `features/profile/views.js:13` | `comunidade` |
| 21 | `guia` | — | "Guia de {cidade}" | `origin` | `renderGuide` `features/transfers/guide.js:1` | `inicio` |
| 22 | `pedidos` | — | "Pedidos de serviço" | `voce` | `renderRequests` `features/requests/views.js:3` | `voce` |
| 23 | `pedido` | id de pedido (`state.requests`) | "Pedido de serviço" | `origin` | `renderRequest` `features/requests/views.js:10` | `pedidos` |
| 24 | `dono` | — | "Painel do Bivaque" | `origin` (nav do app sai) | `renderOwner` `features/owner/console.js:93` | `inicio` |
| 25 | `entrar` | 12 ids de estado (`conta`, `retomar`, `aceite`, `cpf`, `resultado`, `analise`, `cidade`, `boas-vindas`, `login`, `senha`, `convite`, `apagada`) | "Bivaque" | `origin` (casca de entrada) | `renderEntry` `features/entry/account.js:70` | — |
| 26 | `privacidade` | — | "Política de privacidade" | `voce` | `renderLegal` `features/legal/pages.js:42` | `voce` |
| 27 | `conduta` | — | "Código de conduta" | `voce` | `renderLegal` `features/legal/pages.js:42` | `voce` |
| 28 | `ocultados` | — | "Ocultados" | `voce` | `renderHidden` `features/profile/hidden.js:12` | `voce` |
| 29 | `bloqueados` | — | "Pessoas bloqueadas" | `voce` | `renderBlocked` `features/profile/blocks.js:21` | `voce` |
| 30 | `ajuda` | id de tópico | "Ajuda" | `voce` | `renderHelp` `features/support/help.js:50` | `voce` (sem id) / `ajuda` (com id) |
| 31 | `contato` | — | "Fale com a gente" | `voce` | `renderContact` `features/support/help.js:58` | `ajuda` |
| 32 | `chamados` | — | "Meus chamados" | `voce` | `renderTickets` `features/support/help.js:69` | `ajuda` |
| 33 | `apagar-conta` | — | "Apagar a conta" | `voce` | `renderDeleteAccount` `features/support/help.js:91` | `voce` |
| — | `indisponivel` (interna) | — | "Bivaque" | `origin` | fallback de `render()` `shell/navigation.js:107` | — |

**33 rotas** em `navigationNames` (`:4`) — a rota interna `indisponivel` não está na lista; é o estado de
erro do roteador. O capítulo 2 traz **45 seções de rota** (33 rotas, com `entrar` aberto em 13 estados e
`catalogo`/`desapegos`/`imoveis` descritos separadamente).

### Entradas principais de cada rota

Como se chega, em ordem de importância, com o emissor. As listas completas estão na seção de cada rota
do capítulo 2.

| Rota | Chega-se por |
|---|---|
| `inicio` | navegação (`nav`, `shell/navigation.js:65`); `home` (`app/handlers.js:22`); `apply-city` (`:63`); `home-city` (`:68`); `reset-prototype`/`apply-prototype` (`:77`, `:72`); `plan-go` com `destination` (`:30`); item `Início` do menu Criar (`shell/create-menu.js`) |
| `comunidade` | navegação; `intent` com `ind` (`app/handlers.js:50`); `groups` (`:140`, deixa a aba de grupos); `my-questions` → `minhas` (`:139`); `community-tab` (`:60`) |
| `conversas` | navegação; aviso de novo contato (`state.notices[].go`); voltar de `conversa` |
| `conversa` | `open-thread` (`features/messaging/actions.js`); `item-interest`/`item-visit`/`send-offer`/`quote` (contatos a partir de anúncio, negócio ou pedido); aviso de mensagem |
| `voce` | navegação; avisos; fim de fluxo (apagar a conta, chamados, salvos) |
| `busca` | `search` na barra do topo (`shell/navigation.js:60`); `search-from-home`/`recent-search`/`guide-search` (`app/handlers.js:42`, `:44`); `ask-from-search` (`:130`); paleta de comandos |
| `desapegos` / `imoveis` | `intent` com `desapego`/`imovel` (`app/handlers.js:50`); `search-explore` (`:48`); `alert-open`; `catalog-all` (`:51`); `back()` de `anuncio` |
| `catalogo` | só por endereço direto — não há emissor no código (ver 2.1.3) |
| `negocios` | `businesses` (`app/handlers.js:58`); `intent` com `biz` (`:50`); `search-explore` com `biz\|…` (`:48`); `back()` de `negocio` |
| `anuncio` | `open-item` (`app/handlers.js:93`); `resume` (`:27`); `open-item` vindo da paleta, de Salvos, de Meus anúncios, de um aviso, de um bairro do mapa ou da comparação |
| `negocio` | `open-biz` (`app/handlers.js:108`); `my-biz` (`:110`); `resume` (`:27`); resposta de indicação com negócio ligado (`answer-origin`, `:138`) |
| `pergunta` | `open-question` (`app/handlers.js:126`); `resume` (`:27`); `answer-origin` (`:138`); linha de pergunta em todas as listas; resposta de busca |
| `grupo` | `open-group` (`app/handlers.js:141`); cartão de grupo na aba Grupos (`features/groups/views.js:69`) |
| `publicacao` | `open-post` (painel de grupos); aviso de comentário; `open-post` na área do dono (`features/owner/review.js:13`) |
| `evento` | `open-event` (`app/handlers.js:26`); cartão da agenda; aviso de encontro |
| `agenda` | `agenda` (`app/handlers.js:25`); `back()` de `evento`; atalho na Início |
| `salvos` | `saved` (`profileGlobalAction`, `features/profile/demo-actions.js:45`); item do menu de Você |
| `meus-anuncios` | `my-ads` (`profileGlobalAction`); `delete-item` (`app/handlers.js:102`) |
| `minhas` | `my-questions` (`app/handlers.js:139`); `plan-go` com `my-questions` (`:30`) |
| `guia` | `guide` (`app/handlers.js:24`); `plan-go` com `destination` (`:30`); atalho na Início |
| `pedidos` | `requests` (`features/requests/handlers.js`); aviso de proposta |
| `pedido` | `open-request` (`features/requests/handlers.js`); aviso de proposta ou de decisão |
| `dono` | `owner-go` (`features/owner/console.js`); endereço direto |
| `entrar` | estado de saída (`state.signedOut`): `entryGate` (`shell/navigation.js:106`) manda qualquer rota para cá; `sign-out`; convite familiar |
| `privacidade` / `conduta` | `open-legal` (`features/legal/pages.js:47`), dos links do aceite e do menu de Você |
| `ocultados` | item de Você; `hide-question` leva a pessoa para lá |
| `bloqueados` | item de Você; `block-person` |
| `ajuda` | item de Você; `support-open`; `chamados` de quem saiu (`entryGate`, `shell/navigation.js:106`) |
| `contato` | `support-open` com tópico; fim do índice de Ajuda |
| `chamados` | item de Você; fim do envio de um chamado |
| `apagar-conta` | item de Você |

---

## 2. Conte�do por rota

Montagem das dez leituras de área feitas para este inventário (A–J): cada rota traz o conteúdo
de cima para baixo, os estados, as diferenças por viewport, os overlays que abre e a tabela de ações.
O resumo e a lista de ações de cada área foram para os capítulos 4 e 11. Onde duas áreas descrevem o
mesmo overlay, ficou a descrição mais completa e a outra traz
um ponteiro `(mesmo overlay — ver 2.x.y)`.

### Sumário

| área | rotas | nº |
|---|---|---|
| 2.1 Catálogo, filtros, mapa e comparação de anúncios (Desapegos e Imóveis) | `desapegos`, `imoveis`, `catalogo` | 3 |
| 2.2 Detalhe do anúncio, editor, assistente de imóvel, fotos e galeria | `anuncio` | 1 |
| 2.3 Início, Comunidade, Pergunta, Busca e Guia | `inicio`, `comunidade`, `pergunta`, `busca`, `guia` | 5 |
| 2.4 Grupos, publicações, agenda e encontro | `grupo`, `publicacao`, `agenda`, `evento` | 4 |
| 2.5 Você e tudo que pende dela | `voce`, `salvos`, `meus-anuncios`, `minhas`, `ocultados`, `bloqueados` | 6 |
| 2.6 Negócios locais (catálogo, página do negócio, editor, planos, indicação e taxonomia) | `negocios`, `negocio` | 2 |
| 2.7 Pedidos de serviço e propostas | `pedidos`, `pedido` | 2 |
| 2.8 Conversas (lista e conversa aberta) | `conversas`, `conversa` | 2 |
| 2.9 Entrada (landing, cadastro, elegibilidade, entrar, convite, cidade e boas-vindas) | `entrar` (13 passos: sem id/landing, `conta`, `retomar`, `aceite`, `cpf`, `resultado`, `analise`, `cidade`, `boas-vindas`, `login`, `senha`, `convite`, `apagada`) | 13 |
| 2.10 Painel do Bivaque (dono), políticas legais e suporte | `dono`, `privacidade`, `conduta`, `ajuda`, `contato`, `chamados`, `apagar-conta` (+ a tela de conta apagada, que é `entrar`/`apagada`) | 7 |

**Total:** 45 seções de rota, cobrindo **33 nomes de rota** (o `entrar` aparece em 13 passos).

**Rotas sem seção neste capítulo:** nenhuma. Todas as rotas do inventário — `inicio`, `comunidade`,
`conversas`, `conversa`, `voce`, `busca`, `catalogo`, `desapegos`, `imoveis`, `negocios`, `anuncio`,
`negocio`, `pergunta`, `grupo`, `publicacao`, `evento`, `agenda`, `salvos`, `meus-anuncios`, `minhas`,
`guia`, `pedidos`, `pedido`, `dono`, `entrar`, `privacidade`, `conduta`, `ocultados`, `bloqueados`,
`ajuda`, `contato`, `chamados`, `apagar-conta` — têm seção. Não há rota marcada
como `não verificado` por ausência de seção.

---

### 2.1 Catálogo, filtros, mapa e comparação de anúncios (Desapegos e Imóveis)

#### 2.1.1 Rota `desapegos` — sem parâmetro

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): `"Desapegos"`.
- Aba ativa (`activeTab`, `shell/navigation.js:54`): a lista de `:54` não inclui `desapegos`/`imoveis`/`catalogo`, então cai no `return origin` — o valor de `origin` no momento (`app/state.js:16`, `navigation.js:45`). Na prática `"inicio"`.
- De onde se chega:
  - `intent` com `data-value="desapego"` — tiles da Início (`features/home/views.js:17`, `features/home/desktop.js:10`), atalho `catalogSectionTitle` (`catalog.js:37`), `plan-go` de Moradia (`app/handlers.js:30`);
  - `search-explore` com valor diferente de `imovel`/`biz...` (`app/handlers.js:48`);
  - `alert-open` de um alerta de desapego (`alerts.js:63`);
  - `catalog-all` ("Explorar anúncios" do vazio de Salvos, `features/profile/views.js:9`; também no diálogo `resume`, `handlers.js:27`);
  - `back()` a partir de `anuncio` quando o anúncio é desapego (`navigation.js:51`).
- Desenhada por: `renderCatalog` em `features/listings/catalog.js:11`. Helpers da tela: `filterChips` (`catalog.js:1`), `catalogSetAttr` (`:16`), `catalogPriceRange` (`:18`), `availBy` (`:20`), `catalogMatches` (`:21`), `filteredItems` (`:29`), `catalogEndHtml` (`:30`), `itemResults` (`:35`), `catalogSectionTitle` (`:37`); `catalogPillsHtml`/`catalogBarHtml`/`filterActiveCount`/`priceLabel`/`availLabel` (`filters.js:19`-`33`); `catalogViewHtml`/`catalogMapHtml`/`catalogMapAfterRender` (`map.js:14`,`:16`,`:35`).
- Parâmetro: nenhum. `route.id` não é usado por `renderCatalog`.

##### Conteúdo, de cima para baixo

1. `page-head` (`catalog.js:13`): `<h1>Desapegos</h1>`; subtítulo `À venda em {state.city}`; à direita, só quando `!readonly()`, o botão `Anunciar desapego` (`data-action="create-item"`, tonal, ícone `add`).
2. Faixa de cidade visitada: `readonlyHtml()` (`navigation.js:108`) — vazia quando não é visita. Ver "Estados".
3. Pílulas de filtro — `catalogPillsHtml(kind)` (`filters.js:24`), contêiner `.fpills` com `role="group"` e `aria-label="Filtros de desapegos"` (`filters.js:31`). Ordem das pílulas para desapego (`filters.js:30`):
   - `Filtros`/`Todos os filtros`: rótulo = `FILTER_DESKTOP.matches ? "Todos os filtros" : "Filtros"` (`filters.js:27`; `FILTER_DESKTOP` = `matchMedia('(min-width:1024px)')`, `filters.js:5`), ícone `tune`, `data-action="catalog-pill" data-value="all"`, `aria-haspopup="dialog"`, `aria-label="Filtros, {n} ativos"` ou `"Filtros"` (`:27`), e `<span class="fbadge">n</span>` quando há filtros ativos, onde `n = filterActiveCount(kind)` (`:19`). Para desapego o contador soma preço + categorias + bairros/distância + estado + retirada (`:22`).
   - `Categoria`: `manyLabel(a.cats,'Categoria','categorias')` → `"Categoria"`, o nome único escolhido ou `"{n} categorias"` (`filters.js:13`, `:30`).
   - `Preço`: `priceLabel(kind,min,max)` (`filters.js:16`) → `"Preço"` sem faixa, `"{R$ a} a {R$ b}"`, `"Até {R$ b}"` ou `"A partir de {R$ a}"`.
   - `Estado`: `a.cond || "Estado"` (pílula `cond`, `filters.js:30`).
   - `Retirada` / `Retirada imediata` / `Retirada em 30 dias` (`filters.js:30`).
   - `Bairro`: só existe porque `cityHasHoods()` (`hood-privacy.js:11`) é verdadeiro nas quatro cidades da base (`data/demo/bairros.js:5-10`). Rótulo = `"{n} bairros"`, `"Até {d} km"` ou `"{n} bairros · Até {d} km"`, ou `"Bairro"` (`filters.js:29`).
   - Cada pílula comum traz `icon('expand_more')` e `data-action="catalog-pill"` com `data-value` = chave da seção (`filters.js:25`).
4. Barra `catalogBarHtml(kind,n)` (`filters.js:33`): `<span id="catalog-count"><b>"{n} desapegos"</b><span class="fbar-extra"> " encontrados"|" encontrado"</span></span>`, o seletor de modo (`catalogViewHtml`, `map.js:14`, `role="group" aria-label="Ver como"` com `Lista`/`Mapa` e `aria-label="Ver em lista"|"Ver em mapa"`) e o botão de ordenação `.fsort` (`data-action="catalog-pill" data-value="sort"`, ícone `sort`, `aria-label="Ordenar: {rótulo}"`, texto = `SORT_LABELS` corrente, `filters.js:34`). Para desapego: `Mais recentes`, `Menor preço`, `Maior preço`.
5. Faixa de alerta — `alertBannerHtml(kind)` (`alerts.js:26`), invisível sem filtro ativo. Ver "Estados".
6. `#catalog-results` (`catalog.js:13`) — só um dos dois:
   - Lista: `itemResults(list,kind)` (`catalog.js:35`) → `pagedHtml('catalog-desapego', "{cidade}|{JSON de catalogAttrs}|{searchSort}", list, photoCard, {noun:'desapegos', end:catalogEndHtml(kind)})` (`paged-list.js:7`). Blocos de `LIST_PAGE=24` (`paged-list.js:5`), grade `.card-grid`, cartão = `photoCard` (`shell/primitives.js:19`): botão de salvar + `card-link` (`data-action="open-item" data-value="{id}"`), `cover` com selo (`Desapego`, `Seu anúncio`, `Vendido`, `Em transferência`, `primitives.js:20`), preço (`money(numPrice)`; o sufixo `<small> / mês</small>` só aparece quando `item.per` existe, e no desapego ele é vazio), título, `hoodTag(item)+city` (linha de localização, `hood-privacy.js:7`), e `itemCardLine` (`attributes.js:13`): `"{cond} · {cat}"` com ícone `sell` + selo `Retirada imediata` / `Retirada a partir de dd/mm`.
   - Mapa: `catalogView==='map' && cityHasHoods()` → `catalogMapHtml(list,kind)` (`map.js:16`). Ver overlay "Mapa".
7. Rodapé de paginação — `pagedFootHtml` (`paged-list.js:12`): com mais itens, `Mostrando {n} de {total} desapegos` + barra `.paged-bar` + botão ``Mostrar mais {min(24,total-n)}`` (`data-action="list-more" data-value="catalog-desapego"`); no fim, `"Você viu os {total} desapegos"` (`pagedSeen`, `paged-list.js:17`) seguido de `catalogEndHtml(kind)` — **só quando `total > 24`** (`paged-list.js:15` devolve `''` quando `total<=size`).
8. `catalogEndHtml(kind)` (`catalog.js:30`): com filtros ativos, ícone `notifications`, `<b>Não achou o que procura?</b>` e `<small>Crie um alerta e avisamos quando aparecer outro desapego assim.</small>` + botão `Avise-me` (`search-alert`, tonal); sem filtros, ícone `tune` e `<small>Filtre por bairro, preço e mais para achar mais rápido.</small>` + botão `Filtrar` (`catalog-pill` com `data-value="all"`). Devolve `''` em `readonly()` ou quando já existe alerta para a busca corrente (`:31`).

##### Estados

- Vazio: `itemResults` (`catalog.js:35`) → `empty('Nenhum desapego com esses filtros','Tente outra categoria, outro bairro ou amplie a faixa de preço.','search_off','clear-filters','Limpar filtros')` (`shell/primitives.js:18` desenha ilustração SVG + ícone + `<h3>` + `<p>` + botão tonal).
- Carregando: não há esqueleto na carga inicial. O esqueleto `.paged-skel` (2 blocos) só aparece quando o próximo bloco entra sozinho (`pagedAuto`, `paged-list.js:32-36`, `rootMargin '0px 0px 600px 0px'`, `paged-list.js:42`), com o texto `Carregando mais {n}…` no lugar de `Mostrando …` (`paged-list.js:34`).
- Erro / indisponível: a rota `desapegos` não tem estado de erro próprio. Rota inexistente cai em `empty('Página indisponível', …)` (`navigation.js:107`), fora desta área. Anúncio removido/`unavailable` são só de `renderItem` (`features/listings/detail.js:1-3`, `:5`), fora desta área.
- Visita a outra cidade (`readonly()`, `state.js:58`):
  - o botão `Anunciar desapego` não é desenhado (`catalog.js:13`);
  - entra a faixa `readonlyHtml()` (`navigation.js:108`): ícone `visibility` + `Você está conhecendo <b>{cidade}</b>. Sua cidade atual é {homeCity}.` + botão `Voltar` (`data-action="home-city"`);
  - `catalogEndHtml` devolve `''` (`catalog.js:31`), então não há cartão `Não achou o que procura?` nem `Avise-me`/`Filtrar` no fim da lista;
  - a barra ganha `class="away"` (`navigation.js:62`), o que devolve o chip de cidade à barra;
  - `#fab` fica `disabled` (`navigation.js:66`);
  - o grupo `Distância de mim` some do painel de bairros (`filters.js:67`: `city!==state.homeCity ? ''`) e `distOn()` devolve `0` (`filters.js:62`), então distância não pesa;
  - o filtro de bairros e o Mapa continuam existindo (as quatro cidades da base têm bairros) e usam os bairros da cidade consultada (`filters.js:64-69`, `map.js:11-12`); as contagens vêm de `cityItems()`, que filtra por `x.city===state.city` (`state.js:44`).
  - **Alerta conhecido (documentação, não código)**: `prototypes/bivaque-html/docs/AUDITORIA_FUNCIONAL_2026-10-18.md:48` registrou "Em outra cidade, filtro de bairros e mapa usam os bairros e o centro de Manaus." No código atual isso **não** procede: `cityHasHoods` vem de `BAIRROS[city]` (`hood-privacy.js:11` + `bairros.js:5`) e as quatro cidades têm base; o mapa usa `hoodsOf(city)` (`map.js:11-12`). O que resta de Manaus é (a) o centro de reserva `[-60.035,-3.08]` em `cityCenter` (`map.js:12`), alcançável só por uma cidade sem bairros — nenhuma das quatro — e (b) os **anúncios** de exemplo, todos criados com `city:'Manaus'` (`app/state.js:4`, `attributes.js:40`), de modo que numa cidade visitada a lista só mostra o que foi publicado ali. `ROUND_67.md:30-34` é o registro dessa correção.
  - **Achado de leitura**: `createSearchAlert` (`alerts.js:31`) **não** checa `readonly()`; a faixa `alertBannerHtml` também não (`catalog.js:13`). Em cidade visitada a pessoa consegue criar um alerta com a cidade consultada. `alert-open` de alerta de outra cidade só avisa (`alerts.js:61`, ver overlays).
- Outros: anúncios com `status==='sold'` não entram em `filteredItems` (`catalog.js:29` filtra `x.status==='active'`), então o catálogo nunca mostra o selo `Vendido` — esse selo é do detalhe e de Salvos. A tela **não** checa `state.profile.verified`; o gate de publicação é `canPost()` (`state.js:59-63`), aplicado pelo editor (`editor.js:4`, `:13`), fora desta área. Não há estado "sem acesso" próprio.

##### Diferenças por viewport

- 375: `.fpills` rola horizontalmente com `margin:10px -16px 6px` e `overflow-x:auto` (`styles/catalog.css:2`); `page-head` com `gap:8px` e botão tonal a 13 px (`styles/base.css:28`); grade `.card-grid` em 1 coluna (`styles/base.css:28`); `.fbar-extra` e `.fview-label` ficam `display:none` (`catalog.css:110`), então a barra mostra só `"{n} desapegos"`, os dois chips de modo sem texto e a ordenação.
- 768: `.fpills` ainda rola (`catalog.css:2`); `.card-grid` em 3 colunas (`base.css:29`); `page` com `padding-top:32px` (`base.css:29`). Os filtros ainda abrem em folha/tela cheia, porque `FILTER_DESKTOP` só liga a partir de 1024 px (`filters.js:5`) — `sheet` para uma pílula, `full` para "Filtros" (`filters.js:120`).
- 1440: `.fpills` passa a `flex-wrap:wrap;overflow:visible;margin:14px 0 8px` (`catalog.css:4`); `.fbar` ganha `border-top` e 15 px (`catalog.css:12`); `.card-grid` em 4 colunas (`base.css:30`); `page` com `padding-top:36px` (`base.css:30`). É acima de 1024 px que o painel de filtros vira `pop` (suspenso) ou `drawer` (lateral) — posições e raios em `catalog.css:26` e `:28`, animações em `:59-60`.
- Trocar de lado de 1024 px fecha o painel sem aplicar e redesenha a rota com o foco de volta na pílula (`filters.js:140`, listener em `FILTER_DESKTOP`).

##### Diálogos, editores, folhas e menus abertos nesta rota

Esta rota pode abrir, conforme a interação: painel/folha de filtros, folha do bairro (celular) ou diálogo do bairro (≥720 px), diálogo de alertas de busca, diálogo de comparação de imóveis salvos (só a partir de Salvos) e o diálogo do cartão de compartilhamento (a partir do anúncio). Especificação completa de cada um na seção **"Overlays, folhas e painéis da área"** (nesta área).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `catalog-pill` | `filters.js:25` (pílulas), `filters.js:33` (ordenação), `catalog.js:33` (CTA `Filtrar`) | `all`/`price`/`cat`/`cond`/`pickup`/`hood`/`sort` | abre painel/folha de filtros (ou só a ordenação) | `app/handlers.js:54` → `openFilterPanel` (`filters.js:118`) |
| `catalog-pill` (data-f interno `sort`) | `filters.js:76` (`data-f="sort"`) | `recent`/`price-low`/`price-high` | aplica a ordenação na hora e redesenha | `filters.js:108` |
| `catalog-view` | `map.js:14` | `list`/`map` | troca lista ↔ mapa, redesenha | `map.js:81` |
| `map-hood` | `map.js:19` (chips), `map.js:48` (pinos) | nome do bairro | <720 px abre a folha do bairro; ≥720 px o diálogo do bairro | `map.js:83` |
| `map-hood-list` | `map.js:65`, `hood-panel.js:9`, `hood-panel.js:19` | nome do bairro | fecha folha/diálogo, fixa `hoods:[bairro]`, volta para a lista | `map.js:86` |
| `hood-panel-close` | `hood-panel.js:19` | `''` | fecha a folha e devolve o foco | `hood-panel.js:85` |
| `hood-panel-stop` | `hood-panel.js:19` (puxador) | `''` | sobe/desce a folha (low→half→full→low) | `hood-panel.js:86` |
| `save-item` | `primitives.js:19` via `iconBtn` (`photoCard`) | id do anúncio | alterna salvos, sem redesenhar a lista (troca só o botão) | `handlers.js:96` → `toggleSaved` (`shell/in-place.js:15`) |
| `open-item` | `primitives.js:19` (`card-link`), `hood-panel.js:13` | id do anúncio | abre `anuncio` | `handlers.js:93` |
| `search-alert` | `catalog.js:33`, `alerts.js:29` | `''` | cria alerta da busca corrente ou abre os alertas existentes | `alerts.js:55` → `createSearchAlert` (`alerts.js:31`) |
| `search-alerts` | `alerts.js:28` | `''` | abre o diálogo `Alertas de busca` | `alerts.js:56` |
| `clear-filters` | `catalog.js:35` (vazio) | `''` | zera `catalogAttrs` dos dois tipos, `searchHood/Min/Max`, `searchSort` | `handlers.js:57` |
| `list-more` | `paged-list.js:14` | id da lista (`catalog-desapego`) | acrescenta o próximo bloco e foca o 1º cartão novo | `paged-list.js:46` |
| `create-item` | `catalog.js:13` | `''` | abre o editor de desapego | `handlers.js:84` (fora desta área) |
| `home-city` | `navigation.js:108` (faixa de visita) | `''` | volta para a cidade da conta e vai para a Início | `handlers.js:68` |
| `close-dialog` | `map.js:65` | `''` | fecha o diálogo do bairro | `handlers.js:80` |
| `back` | `navigation.js:60` (seta da barra) | `''` | fecha folha/diálogo/painel aberto ou volta ao `origin` | `navigation.js:51` |
| `city` | `navigation.js:60` (chip de cidade) | `''` | abre o diálogo de cidade (fora desta área) | `handlers.js:62` |
| `search` | `navigation.js:60` (lupa da barra) | `''` | vai para a rota `busca` (fora desta área) | `handlers.js:41` |

---

#### 2.1.2 Rota `imoveis` — sem parâmetro

- Título na barra (`titleForRoute`, `navigation.js:53`): `"Imóveis"`.
- Aba ativa (`activeTab`, `navigation.js:54`): `origin` (na prática `"inicio"`).
- De onde se chega: `intent` com `data-value="imovel"` (tiles da Início, `features/home/views.js:17`/`desktop.js:10`; `catalogSectionTitle`, `catalog.js:37`; Guia, `features/transfers/guide.js:1`; `plan-go` de Moradia, `handlers.js:30`); `search-explore` com `value==='imovel'` (`handlers.js:48`); `alert-open` de alerta de imóvel (`alerts.js:63`); `back()` a partir de `anuncio` de imóvel (`navigation.js:51`).
- Desenhada por: `renderCatalog` (`catalog.js:11`), com `kind==='imovel'`.
- Parâmetro: nenhum.

Tudo o que está descrito para `desapegos` vale aqui, com estas diferenças **exatas**:

1. Título e subtítulo (`catalog.js:13`): `<h1>Imóveis</h1>` e `Para alugar em {state.city}`. Botão da direita: `Anunciar imóvel` (`data-action="create-property"`).
2. `catalogKind()` (`catalog.js:8`) devolve `'imovel'` quando `route.name==='imoveis'`, independentemente de `catalogFilter`.
3. Pesquisa de total: `itemTotal(x) = numPrice + (kind==='imovel' ? condo : 0)` (`catalog.js:10`) — imóvel pesa pelo total do mês, desapego só pelo preço. É esse total que a faixa de preço, a ordenação e o alerta usam (`filters.js:16`, `catalog.js:29`, `alerts.js:24`).
4. Ordenação (`filters.js:34`): `Mais recentes`, `Menor total por mês`, `Maior total por mês`.
5. Pílulas (`filters.js:30`), nesta ordem: `Filtros`; `Tipo` (`manyLabel(a.ptypes,'Tipo','tipos')`); `Total por mês`/faixa (`priceLabel` com `kind==='imovel'`); `Quartos` (ou `"{beds}+ quartos · {parking}+ vagas"`, `filters.js:30`); `Bairro`; `Disponível agora`/`Em até 30 dias`/`Em até 60 dias`/`Até dd/mm`/`Disponível` (`availLabel`, `filters.js:17`); e dois atalhos de um toque **sem folha**: `Aceita pets` (ícone `pets`) e `Mobiliado` (ícone `chair`), com `data-action="catalog-toggle"` e `aria-pressed` (`filters.js:26`).
6. Contador de filtros ativos (`filters.js:22`) soma preço + tipos + bairros/distância + quartos + vagas + área + comodidades + disponibilidade.
7. Seções do painel "Filtros" (`FILTER_SECTIONS.imovel`, `filters.js:7`), nesta ordem: `ptype`, `price`, `avail`, `beds`, `parking`, `area`, `amen`, `hood`. A pílula `Quartos` abre duas seções (`beds` + `parking`, `filters.js:71`) sob o título `Quartos e vagas` (`FILTER_TITLES.beds`, `filters.js:35`).
8. Cartão de imóvel (`primitives.js:21` → `propertyCardLine`, `attributes.js:7`): selo = `ptype||'Imóvel'` (ou `Indisponível`/`Seu anúncio`/`Em transferência`); preço com `<small> / mês</small>`; `<p class="card-meta">` = `"{total} com condomínio"` ou `"Sem condomínio"`; `<p class="card-line">` com ícone `apartment` = `"{beds} quartos · {area} m² · {parking} vagas"` (ou `"Imóvel"`); selo `.avail` = `Disponível agora` ou `Disponível a partir de dd/mm` (`attributes.js:9-10`).
9. Vazio (`catalog.js:35`): `empty('Nenhum imóvel com esses filtros','Tente outro bairro, um total maior ou menos comodidades.','search_off','clear-filters','Limpar filtros')`.
10. Sem `catalog-toggle` de comodidades, o painel de comodidades (`filters.js:53`) lista as oito de `PROPERTY_AMENITIES` (`attributes.js:4`), com o rótulo humano por `amenityLabel` (`attributes.js:26`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `catalog-toggle` | `filters.js:26` | `pets`/`furnished` | liga/desliga a comodidade direto no catálogo, redesenha e devolve o foco | `handlers.js:55` → `catalogSetAttr` (`catalog.js:16`) |
| `create-property` | `catalog.js:13` | `''` | abre o editor de imóvel (assistente em etapas) | `handlers.js:85` (fora desta área) |
| `catalog-pill` / demais | igual a `desapegos` | ver acima | ver acima | ver acima |

---

#### 2.1.3 Rota `catalogo` — sem parâmetro (legado)

- Título na barra (`titleForRoute`, `navigation.js:53`): `catalogKind()==='imovel' ? "Imóveis" : "Desapegos"` — é o único ponto de `titleForRoute` que depende de um filtro.
- Aba ativa (`activeTab`, `navigation.js:54`): `origin` (na prática `"inicio"`).
- De onde se chega: **de nenhum lugar do código**. `'catalogo'` está em `navigationNames` (`navigation.js:4`) e em `render()` (`navigation.js:107`), e a lista de rotas que redesenham ao cruzar 1024 px inclui `'catalogo'` (`filters.js:140`), mas não encontrei nenhuma chamada `navigate('catalogo')`, nenhum `data-value="catalogo"` nem link — só o endereço direto `#catalogo` (`parseRoute`, `navigation.js:32`).
- Desenhada por: `renderCatalog` (`catalog.js:11`).
- Parâmetro: nenhum.

Diferenças exatas quanto a `desapegos`/`imoveis`:

1. `catalogKind()` cai no terceiro ramo (`catalog.js:8`): devolve `'imovel'` se `catalogFilter==='imovel'`, senão `'desapego'`. Como `catalogFilter` nasce `'all'` (`state.js:16`) e a única escrita em `catalog-filter` (`handlers.js:56`) não tem emissor, `#catalogo` abre como **Desapegos**. Os setters que existem são `intent` (`handlers.js:50`) e `catalog-all` (`handlers.js:51`), e ambos navegam para `imoveis`/`desapegos`.
2. `renderCatalog` **escreve** `catalogFilter=kind` a cada desenho (`catalog.js:12`) — a rota se fixa no tipo que acabou de desenhar.
3. Não há na própria página nenhum controle para trocar o tipo: a troca vem de fora (`intent`, `catalogSectionTitle` `catalog.js:37`, ou o menu de criação). Logo, todo o resto (pílulas, barra, alerta, lista, mapa, vazios, visita a outra cidade) é idêntico ao da rota do tipo correspondente.

##### Ações desta rota

Idênticas às de `desapegos`/`imoveis`, conforme o tipo desenhado. `catalog-filter` (`handlers.js:56`) existe no `switch` mas **não encontrei emissor** — é ação morta hoje.

---

#### Overlays, folhas e painéis da área

##### 1. Painel/folha de filtros — `openFilterPanel` (`filters.js:118`), fechamento em `filters.js:129`

- Abre por `catalog-pill` (`handlers.js:54`); guarda em `filters.js:119`: `if(!FILTER_TITLES[key] && key!=='price') return;`. A âncora clicada vai para `filterDraft.back` (`filters.js:121`).
- Formatos por `key` e por `FILTER_DESKTOP.matches` (`filters.js:5`, `:120`): `key==='all'` → `drawer` (≥1024 px) ou `full` (celular/tablet); qualquer outra pílula → `pop` (≥1024 px) ou `sheet` (celular/tablet). CSS: `catalog.css:24` (`sheet`, raio 16/16/0/0, `max-height:88dvh`), `:25` (`full`), `:26` (`pop`, `width:min(420px,calc(100vw - 32px))`, `max-height:min(560px,calc(100vh - 140px))`, `::backdrop` transparente em `:27`), `:28` (`drawer`, `width:min(460px,100vw)`). O `<dialog id="filter-panel">` é criado na primeira abertura (`filters.js:123`), com `aria-labelledby="fp-title"`.
- Cabeçalho (`filters.js:75`): `<h2 id="fp-title">` com o título (`key==='price'` usa `Total por mês`/`Preço`, senão `FILTER_TITLES[key]` = `Filtros`, `Tipo de imóvel`, `Disponível para morar`, `Quartos e vagas`, `Bairro`, `Categoria`, `Estado de uso`, `Retirada`, `Ordenar`, `filters.js:35`); botão `Limpar tudo` só quando `key==='all'`; botão `.ficon` com `aria-label="Fechar sem aplicar"` e ícone `close`. No modo `sheet` entra a alça `.fgrab` (`filters.js:75`); no modo folha/pop com uma seção só, o `<h3>` da seção é escondido visualmente (`catalog.css:63`).
- Modo ordenação (`key==='sort'`, `filters.js:76`): só as três opções de `SORT_LABELS`, cada uma `data-f="sort" data-v="…"` com `aria-pressed` e `check` na escolhida; aplica na hora, fecha sem restaurar foco e devolve o foco à pílula `sort` (`filters.js:108`).
- Seções (`fpSections`, `filters.js:71`): `all` → todas as do tipo (`FILTER_SECTIONS`, `:7`); `beds` → `['beds','parking']`; qualquer outra → só ela; a seção `hood` é removida se a cidade não tiver bairros.
  - **Preço** (`filters.js:44-48`): chips rápidos de `FILTER_QUICK` (`:6`) — imóvel `1500/2500/3000/4000`, desapego `100/300/800/1500`, rótulo `Até {R$ v}`, mutuamente exclusivos com o mínimo vazio; dois campos `.ffield` `Mínimo (R$)` (`id="fp-min"`, `placeholder="0"`) e `Máximo (R$)` (`id="fp-max"`, `placeholder="Sem limite"`), ambos `type="number" inputmode="numeric" min="0" step="{step}"`; e `<md-slider id="fp-price" range min="0" max="{max}" step="{step}" value-start value-end aria-label-start="Valor mínimo" aria-label-end="Valor máximo">`. `max` e `step` vêm de `catalogPriceRange` (`catalog.js:18`): `step = top>5000?100 : top>500 ? 50 : 10`, `max = Math.ceil((top+1)/step)*step` — o máximo fica **acima** do maior valor, para que o extremo exclua todos. Dica (`hint`) só no imóvel: `Aluguel + condomínio, o que sai do bolso todo mês.`; no desapego a dica é vazia.
  - **Disponível para morar** (`filters.js:49`): chips `Qualquer data`/`Agora`/`Até 30 dias`/`Até 60 dias` + `<input type="date" id="fp-date" min="{hoje}">` com rótulo `Ou até a data`; dica `Combine com a data da sua chegada.` Escolher uma data limpa o chip e vice-versa (`filters.js:101`, `:115`); data anterior a hoje é descartada (`filters.js:101`).
  - **Quartos** (`:50`): segmentado `Qualquer`/`1+`/`2+`/`3+`/`4+`. **Vagas de garagem** (`:51`): `Qualquer`/`1+`/`2+`/`3+`. **Área mínima** (`:52`): `Qualquer`/`40 m²+`/`60 m²+`/`80 m²+`/`100 m²+`.
  - **Comodidades** (`:53`): múltipla escolha com as oito de `PROPERTY_AMENITIES`.
  - **Tipo de imóvel** (`:43`): múltipla escolha com os cinco de `PROPERTY_TYPES`. **Categoria** (`:55`): múltipla com as nove de `ITEM_CATEGORIES`. **Estado de uso** (`:56`): única, `Todos` + `ITEM_CONDITIONS`. **Retirada** (`:57`): `Qualquer data`/`Retirada imediata`/`Em até 30 dias`.
  - **Bairro** (`fpHoodSection`, `:63-70`): se a cidade for a da conta **e** houver bairro no perfil, abre com o grupo `Distância de mim` (`Qualquer`/`1 km`/`3 km`/`5 km`/`10 km`) e a dica `A partir do seu bairro, {nome}.`; se não houver bairro no perfil, o grupo aparece sem corpo com uma das duas dicas (`filters.js:67`): `A distância usa os bairros da lista de {cidade}. Escolha o seu na lista em Configurações.` (com bairro no perfil mas em outra cidade) ou `Informe seu bairro em Configurações para filtrar pela distância.` (sem bairro). Em cidade visitada o grupo some inteiro (`city!==state.homeCity ? ''`). Depois vem o grupo `Bairros`: se houver mais de 8 nomes, um campo `Acrescentar bairro` (`id="fp-hood-q"`, `placeholder="Digite o bairro"`) que esconde os chips que não batem mas **mantém à vista os já marcados** (`filters.js:100`); os chips são múltipla escolha, ordenados por quantidade de anúncios ativos do tipo naquele bairro (`filters.js:65-66`), mais os bairros já escolhidos e os que aparecem em anúncios.
- Rodapé (`filters.js:78`): botão `Limpar`/`Limpar tudo` (`data-f="clear"`) que devolve ao padrão só os campos das seções visíveis (`filters.js:109` usa `FILTER_FIELDS`, `:8`) e recria o painel preservando a rolagem (`fpRefresh`, `:87`); e o CTA `.fcta#fp-apply` com `Ver {n} imóveis`/`Ver {n} desapegos` ou `Nenhum resultado` (`filters.js:78`). Há ainda `<span class="sr" id="fp-live" aria-live="polite">`.
- Contagem ao vivo: `fpCount()` = `filteredItems(kind, filterDraft.attrs).length` (`filters.js:72`), recalculada a cada toque em chip, cada `input` nos campos de preço, cada `change` do slider e cada data (`filters.js:98`, `:99`, `:101`, `:110`, `:115`); `fpUpdateCount` (`:92`) troca o texto do CTA e escreve na região viva `"{n} imóveis com esses filtros"` ou `"Nenhum resultado com esses filtros"`. Os chips são atualizados no lugar, sem redesenhar o painel nem perder o foco (`fpSync`, `:94`).
- Aplicar (`applyFilterPanel`, `:134`): copia o rascunho para `catalogAttrs[kind]`, fecha sem restaurar foco, `render()` e devolve o foco à pílula (`key = d.back?.dataset?.value || d.key`).
- Fechar sem aplicar: `closeFilterPanel` (`:129`) fecha o `<dialog>`, limpa `filterDraft`, faz `history.back()` quando há entrada de histórico do painel e devolve o foco à âncora. Gatilhos: botão `.ficon` / `data-f="close"` (`filters.js:106`), clique no fundo (detectado por `pointerdown` no próprio `<dialog>`, `filters.js:104`, `:123`), evento `cancel` (Esc, `filters.js:123`), e a troca de lado de 1024 px (`:140`).
- **Barra Voltar**: o botão `arrow_back` da barra emite `back` (`navigation.js:60`). `back()` (`navigation.js:51`) não conhece o painel de filtros — como o diálogo Material não está aberto, ele cai em `history.state?.parent` e faz `history.go(-(depth+1))`; o `popstate` então encontra `$('#filter-panel').open` e chama `closeFilterPanel(true,false)` (`navigation.js:52`). Resultado prático: **Voltar fecha o painel descartando o que não foi aplicado** e devolve o foco à pílula, igual ao "X". A entrada de histórico do painel é criada em `openFilterPanel` (`filters.js:126`, com `overlayDepth+1`).

##### 2. Mapa (MapLibre + OpenFreeMap) — `catalogMapHtml` (`map.js:16`) e `catalogMapAfterRender` (`map.js:35`)

- Não é overlay: substitui a lista dentro de `#catalog-results` quando `catalogView==='map'` e `cityHasHoods()` (`catalog.js:13`).
- Contêiner (`map.js:18`): `<div class="cmap-wrap"><div class="cmap" id="catalog-map" role="region" aria-label="Mapa com {n} imóveis/desapegos por bairro"><p class="cmap-status" id="cmap-status">Carregando o mapa…</p></div>` + a nota `Posição aproximada do bairro; o endereço exato não aparece. Mapa © OpenStreetMap, servido pelo OpenFreeMap.` + a seção `Bairros` (`aria-label="Bairros"`) com `<h3>Bairros</h3>` e chips `{bairro} · {n}` (`data-action="map-hood"`, ícone `location_on`) ordenados por quantidade, ou `<p class="small muted">Nenhum anúncio com esses filtros.</p>` (`map.js:19`).
- Dependências externas: `MAP_JS = https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js`, `MAP_CSS` do mesmo pacote, `MAP_STYLE = https://tiles.openfreemap.org/styles/liberty` (`map.js:7-9`). Carregadas uma única vez, só ao abrir o mapa (`loadMapLibre`, `map.js:21`), com `async` e timeout de 15 s (`:26`); em falha, o `<link>` e o `<script>` são removidos e `mapLoading` volta a `null` para permitir nova tentativa (`:29`).
- Montagem (`map.js:43-58`): centro = o único bairro com ponto (zoom 13) ou `cityCenter()` (zoom 11.3) (`:45`; `cityCenter` = média dos pontos dos bairros da cidade, reserva `[-60.035,-3.08]`, `:12`); `cooperativeGestures:true`; `NavigationControl` sem bússola no canto superior direito; um `<button class="cmap-pin">` por bairro, com o texto = contagem e `data-action="map-hood" data-value="{bairro}"`, e `aria-label="{bairro}: {n} imóveis/desapegos"` reaplicado depois de virar marcador (`:48-51`); com mais de um ponto, `fitBounds` com `padding:48, maxZoom:13, duration:0` (`:55`). Ao carregar o estilo, os rótulos passam a preferir `name:pt` (`:57`).
- Mensagens de erro exatas: `'Parte do mapa não carregou. Os bairros abaixo continuam funcionando.'` (`map.js:58`) e, quando o carregamento falha, `'O mapa precisa de internet e não carregou agora. Use os bairros abaixo ou volte para a lista.'` (`:60`).
- Remontagem: a cada `render()`, `catalogMapAfterRender` (`navigation.js:107`) compara a chave `"{cidade}|{tipo}|{bairros e contagens}"`; se igual, devolve o mapa já montado ao lugar sem baixar de novo (`map.js:38`); senão remove e remonta (`:39`).
- Pinos destacados: `hoodPinsSync` marca `class="on"` no pino do bairro aberto na folha (`hood-panel.js:21`); o destaque usa `scale` porque o MapLibre posiciona com `transform` (`styles/sheets.css:34`).

##### 3. Folha do bairro no celular — `openHoodPanel` (`hood-panel.js:34`), alturas e arrasto

- Abre por `map-hood` quando `innerWidth < 720` (`map.js:83`). Empilha entrada de histórico com `hood:true` (`hood-panel.js:35`) e redesenha mantendo o `stop` anterior se for o mesmo bairro (`:36`).
- Cabeçalho (`hood-panel.js:19`): botão-puxador `.hp-grab` (`data-action="hood-panel-stop"`) com `aria-label` `Mostrar mais do bairro`/`Mostrar menos do bairro` conforme o `stop` (`:18`); `<h2 id="hp-title" tabindex="-1">{bairro}</h2>`; `<small>"{n} desapegos/imóveis com os filtros que você escolheu"</small>`; botão fechar (`hood-panel-close`, `aria-label="Fechar {bairro}"`).
- Corpo (`hood-panel.js:17`): sem anúncios, `<p class="small muted">Nenhum anúncio neste bairro com esses filtros.</p>`; no `stop` `low`, **uma** linha compacta (`hoodCompactRow`, `:11-13`: miniatura ou ícone, preço com `/ mês`, título, `estado · categoria` no desapego / `quartos · m²` no imóvel, `chevron_right`, `data-action="open-item"`) e, se houver mais, `<p class="hp-more">Puxe para ver os {n} anúncios</p>`; nos `stop` `half`/`full`, carrossel `.hp-cards` com `photoCard` — até `HOOD_PANEL_CAP = 12` (`:8`) — e, se houver mais, o cartão `hoodAllTile` (`:9`) com `Ver todos os {n}` e `na lista, só deste bairro`.
- Rodapé (`hood-panel.js:19`): botão `Ver só este bairro na lista` (`map-hood-list`, texto, ícone `list`).
- Alturas (`hoodStopHeight`, `hood-panel.js:10`; CSS `styles/sheets.css:8-10`): `low` = 248 px, `half` = 58% da altura, `full` = `innerHeight - 76`.
- Arrasto (`bindHoodPanelDrag`, `:53-74`): só no `.hp-top` e sem começar em `md-icon-button`; começa depois de 6 px; altura segue `Math.max(60,min(full, h-dy))`; ao soltar, fecha se a altura ficar abaixo de 150 ou se a velocidade para baixo passar de `.8` a partir de `low`; senão escolhe o `stop` mais próximo, com troca forçada se a velocidade passar de `.5`. O clique sintético do mouse é suprimido uma vez (`:66`); `pointercancel` só redesenha.
- Recolher/fechar: X `hood-panel-close` (`hood-panel.js:85`) → `closeHoodPanel()` (restaura foco + `history.back()`); Esc (`:75`, só quando não há menu de criação, painel de filtros, diálogo, confirmação ou lightbox abertos); arrasto para baixo; `resize` para ≥720 px (`:76`, `closeHoodPanel(false)`, que descarta a entrada de histórico); e `syncHoodPanel` (`:48`) fecha sem mexer no histórico quando a página deixou de estar no mapa ou a largura passou de 720 px.
- **Barra Voltar**: `back()` (`navigation.js:51`) checa `hoodPanel` **antes** de qualquer coisa de diálogo e chama `closeHoodPanel()`. E o `popstate` passa primeiro por `hoodPopstate()` (`navigation.js:52`), que recolhe a folha sem gastar a entrada (`hood-panel.js:80`) ou pula uma entrada órfã (`:81`).
- Só existe em <720 px: `sheets.css:3` envolve todas as regras em `@media(max-width:719px)`, e `styles/sheets.css:7` fixa a folha no rodapé com `z-index:46`. O `body.hood-open` reserva 280 px no fim da página (`sheets.css:32`).

##### 4. Diálogo do bairro (tablet/desktop) — `openHoodSheet` (`map.js:63`)

- Abre por `map-hood` quando `innerWidth >= 720` (`map.js:83`). É um `showDialog` de `kind='hood'` (o mesmo `md-dialog` usado por outros fluxos, `shell/dialogs.js:2`).
- Título: `"{bairro} · {n} desapegos/imóveis"`. Conteúdo: `<p class="form-note">Com os filtros que você escolheu.</p>` + `pagedHtml('hood-dialog', "{bairro}|{JSON}|{searchSort}", list, photoCard, …)`, ou `empty('Nenhum anúncio neste bairro','Mude os filtros ou escolha outro bairro.','location_off')` quando não há nada. Ações: `Ver só este bairro na lista` (`map-hood-list`, texto, ícone `list`) e `Fechar` (`close-dialog`, preenchido). O bloco de paginação é zerado a cada abertura (`pagedShown.delete('hood-dialog')`, `map.js:64`) e `pagedWatch()` é chamado no fim (`:66`).
- `refreshHoodSheet` (`map.js:69`) mantém o botão de salvar de cada cartão em sincronia sem redesenhar o diálogo; `refreshHoodSheet`/`syncHoodPanel` são chamados por `catalogMapAfterRender` (`map.js:36`).
- **Barra Voltar**: `back()` → `dialog.open` → `closeDialog()` (`navigation.js:51`), que fecha e remove a entrada de histórico (`dialogs.js:13`, `:9-12`).

##### 5. Comparação de imóveis salvos — `openCompareSaved` (`compare.js:23`)

- Ponto de entrada: só em **Salvos** (`features/profile/views.js:9`), via `compareEntryHtml()` (`compare.js:5`), desenhado apenas com `n>=2` imóveis salvos ativos: `<div class="falert">` com ícone `apartment` + `Você salvou {n} imóveis. Compare total do mês, quartos, área e disponibilidade.` + botão `Comparar` (`compare-saved`, tonal).
- Guarda (`compare.js:25`): com menos de dois, fecha o diálogo se estiver aberto e avisa `Salve ao menos dois imóveis para comparar.` (`notify`, ícone `info`).
- Lista: `savedRentals()` (`compare.js:4`) = imóveis salvos, ativos, da cidade corrente, ordenados do menor para o maior `itemTotal`.
- Título `Comparar imóveis salvos`; conteúdo: faixa de `note` opcional (`role="status"`, ícone `info`) + `<p class="form-note">Do menor para o maior total do mês. Os destaques aparecem só quando os valores são diferentes.</p>` + `<div class="prop-compare cmp-grid" role="region" aria-label="Comparação de {n} imóveis salvos" tabindex="0">` com uma coluna por imóvel; ação `Fechar` (`close-dialog`, texto). CSS: `md-dialog[data-kind=compare]` com `width:min(1080px,100vw)` (`catalog.css:88`), colunas alinhadas por subgrid (`proposal-compare.css:3-5`), colunas de 84% de largura no celular (`proposal-compare.css:25`).
- Cada coluna (`compareColHtml`, `compare.js:11-22`): foto (`16/9`, `max-height:130px`), título, `{ptype||'Imóvel'}` + ` · {bairro}`; linhas `Total por mês` (com sub `aluguel {X} + condomínio {Y}` ou `sem condomínio`), `Quartos` (`beds ?? '—'`), `Área` (`{v} m²` ou `—`), `Vagas` (`parking ?? 0`), `Disponível` (`a partir de dd/mm` ou `agora`), `Comodidades` (lista com `check`, `amenityLabel`; ou `Nenhuma informada`); ações `Ver anúncio` (`compare-open`, outlined) e `Tirar dos salvos` (`compare-unsave`, texto).
- Destaques (`compareBadges`, `compare.js:6-10`), concedidos só quando os valores **diferem**: `Menor total`, `Mais quartos`, `Maior área`, `Disponível antes` (selo `.prop-badge` com `check`, `proposal-compare.css:13`).
- `compare-open` (`compare.js:33`): fecha o diálogo e navega para `anuncio`. Se o id não existir mais, reabre a comparação com `Este anúncio não está mais disponível.` (`compare.js:32`).
- `compare-unsave` (`compare.js:34`): tira dos salvos, redesenha; se ainda sobram dois ou mais, reabre a comparação com `“{título}” saiu dos salvos.` e foca a grade; senão fecha o diálogo e avisa `“{título}” saiu dos salvos. Salve outro imóvel para voltar a comparar.` (ícone `bookmark_border`).
- **Barra Voltar**: cai no ramo `dialog.open` de `back()` (`navigation.js:51`) → `closeDialog()`.

##### 6. Cartão de compartilhamento — `openShareCard` (`share-card.js:42`)

- Abre pela ação `share` (`handlers.js:31`) com valor `anuncio|{id}` (ou `negocio|{id}`), emitida no detalhe (`detail.js:8`) e em outros pontos de compartilhamento. Se `shareCardData` não reconhecer o tipo, cai no compartilhamento de link comum (`share-card.js:43`).
- Dados (`shareCardData`, `:7-13`): para anúncio, exige `accessibleRecord`; foto, `glyph = x.icon || (imóvel?'apartment':'sell')`, `tag = ptype||'Imóvel'` ou `Desapego`, `big = money(numPrice) (+ ' /mês')`, título, linhas (`quartos · m² · vagas` no imóvel, `estado · categoria` no desapego, e `{total} por mês com condomínio` quando há condomínio) e `place = "{bairro} · {cidade}"`.
- Desenho: canvas 1080×1350 (`SHARE_W/H`, `:6`) na paleta clara fixa `SHARE_PALETTE` (`:23`) — a imagem não segue o tema; sem foto, o ícone do anúncio ocupa a área (`:33`); rodapé grafite com o símbolo da marca, `Bivaque` e `Comunidade de militares e famílias` (`:39`). Nada é enviado a serviço externo (`:3-4`).
- Diálogo (`:47`), `kind='share-card'`: título `Compartilhar`; prévia `.share-preview` com `aria-busy="true"` e `<span class="share-wait">Preparando o cartão…</span>`; nota `Imagem pronta para grupos de WhatsApp, feita neste aparelho. O link é da demonstração local e não abre em outros aparelhos.`; três botões — `Compartilhar link` (`share-link` com `data-value="{tipo}|{id}"`, texto, ícone `link`), `Baixar imagem` (`share-download`, outlined, ícone `image`) e `Compartilhar com imagem` (`share-image`, preenchido, ícone `share`).
- Se o aparelho não aceitar arquivos em `navigator.canShare`, o botão `share-image` é escondido (`:53`). Se o canvas falhar, a prévia passa a mostrar `Não foi possível montar a imagem neste aparelho. Use “Compartilhar link”.` (`:49`). Se a preparação ainda não terminou e a pessoa age, avisa `O cartão ainda está sendo preparado.` (`:58`).
- Ao concluir: `share-link` fecha o diálogo e chama `share(tipo,id)` (`:57`); `share-download` baixa `bivaque-{tipo}-{id}.png` e avisa `Imagem salva no aparelho` (`:59`); `share-image` chama `navigator.share` com título `{título} · Bivaque`, avisa `Cartão compartilhado` no sucesso e, em erro que não seja `AbortError`, `Não foi possível compartilhar a imagem. Use “Baixar imagem” ou “Compartilhar link”.` (`:61`). Um preparo antigo que termina depois é descartado por número de sequência (`:46`, `:48`).
- **Barra Voltar**: ramo `dialog.open` de `back()` → `closeDialog()`.

##### 7. Alertas de busca — `openSearchAlerts` (`alerts.js:45`)

- Ponto de entrada: `search-alert` (`Avise-me`, no fim da lista ou na faixa de alerta) e `search-alerts` (`Gerenciar`, na faixa de alerta ativa; também do perfil em Você, `features/profile/views.js:6`).
- Criar (`createSearchAlert`, `alerts.js:31`): sem nenhum filtro ativo, avisa `Escolha ao menos um filtro para criar o alerta.` (ícone `info`) e não cria; se já existe alerta igual, só abre a lista. Senão grava `{id, kind, city, attrs (com dist normalizada por distOn), label, notify:true, createdAt}` em `state.alerts` (`:36-37`), redesenha, foca `search-alerts` (`:38`), avisa `Alerta criado: avisaremos quando aparecer um anúncio assim.` com desfazer (`:39`, desfazer avisa `Alerta removido`) e chama `askPushSoon('alert')` (`:39`).
- Igualdade de alerta (`alertSame`/`alertKey`, `alerts.js:11-12`): mesmo tipo, mesma cidade e mesmos atributos, com listas comparadas ordenadas e `dist` ignorada quando não vale (`:9-11`).
- Rótulo (`alertLabel`, `:14-22`): `Desapegos`/`Imóveis` e, conforme os campos, tipos/categorias (`ou`), faixa de preço, `{n}+ quartos`, `{n}+ vagas`, `{n} m²+`, comodidades em minúsculas, disponibilidade em minúsculas, `{cond}` em minúsculas, `retirada imediata`/`retirada em até 30 dias`, bairro único ou `{n} bairros`, `até {d} km do seu bairro` — tudo unido por ` · `.
- Faixa de alerta na tela (`alertBannerHtml`, `alerts.js:26-30`): só com filtro ativo. Com alerta ativo: `role="status"`, ícone `notifications_active`, texto `Alerta ativo para esta busca` + ` (pausado)` quando `notify` é falso + `.` e botão `Gerenciar`. Sem alerta: ícone `notifications_none`, `Quer saber quando aparecer outro desapego assim?` (ou `outro imóvel`) e botão `Avise-me` (`search-alert`, tonal, ícone `notifications`).
- Diálogo: título `Alertas de busca`; nota `Avisamos na central quando aparecer um anúncio novo de outra pessoa que caiba na busca. Fica só neste aparelho.`; faixa de `message` opcional e faixa de desfazer `Alerta “{rótulo}” excluído.` com botão `Desfazer` (`alert-undo`); lista de linhas ou `empty('Nenhum alerta ainda','Filtre imóveis ou desapegos e toque em “Avise-me”.','notifications_none')`; ação `Fechar`.
- Cada linha (`alertRow`, `alerts.js:41-43`): botão de texto com rótulo e `{cidade} · {n} anúncios hoje · {avisos ligados|avisos pausados}` (`n` = `state.items.filter(alertMatches)` recalculado a cada desenho), `data-action="alert-open"`; botão de sino (`alert-toggle`, `aria-pressed`, rótulos `Pausar avisos de {rótulo}`/`Ligar avisos de {rótulo}`) e botão de lixeira (`alert-delete`, `Excluir alerta {rótulo}`). Linha pausada ganha `.is-paused` (`catalog.css:68`).
- Efeitos: `alert-open` (`:60-63`) — se o alerta é de outra cidade, só avisa `Este alerta é de {cidade}. Troque a cidade para ver os anúncios.`; senão fecha o diálogo, copia o alerta para `catalogFilter`/`catalogAttrs` e navega para `imoveis`/`desapegos`. `alert-toggle` (`:65`) alterna `notify`, redesenha e reabre a lista com o foco no botão. `alert-delete` (`:66-67`) remove, guarda `alertDeleted = {alert, index}`, redesenha e reabre com o desfazer. `alert-undo` (`:58`) reinsere na posição original e reabre com o foco no alerta. Alerta inexistente reabre com `Este alerta não existe mais.` (`:59`). `alertDeleted` é limpo a cada ação que não seja desfazer/excluir (`:54`).
- `simulate-alert` (`simulateAlertListing`, `alerts.js:71-83`): botão do painel de controle do protótipo (`features/profile/settings.js:6`). Sem alerta ligado na cidade da conta, avisa `Crie um alerta com avisos ligados em {cidade} primeiro.` (ícone `info`); se o autor do exemplo estiver bloqueado, avisa `Paula V. está nas suas pessoas bloqueadas. Nenhum anúncio de exemplo chegou.`; se o exemplo montado não couber no alerta, avisa `Não deu para montar um exemplo que caiba nesse alerta.`; no sucesso, publica o anúncio de exemplo (`seller:'Paula V.'`, `demo:true`) e empilha um aviso na central: `Novo {imóvel|desapego} para o seu alerta “{rótulo}”: {título}.`, com aviso `Anúncio de exemplo publicado e aviso enviado`.
- **Barra Voltar**: ramo `dialog.open` de `back()` → `closeDialog()`.

##### 8. Paginação — `pagedAction` (`shell/paged-list.js:46`)

- Blocos de 24 (`LIST_PAGE`, `:5`). A quantidade já mostrada é guardada por lista **e assinatura** (`pagedShown`, `:8-9`), e a assinatura do catálogo é `"{cidade}|{JSON de catalogAttrs}|{searchSort}"` (`catalog.js:35`) — por isso voltar de um anúncio devolve o mesmo ponto, e mudar filtro ou ordenação recomeça do primeiro bloco.
- Botão de reserva `Mostrar mais {n}` (`data-action="list-more"`), acionado por teclado, leitor de tela ou navegador sem `IntersectionObserver` (`:2-3`); `pagedAction` acrescenta o próximo bloco e foca o primeiro cartão novo (`:28`).
- Entrada automática (`pagedAuto`, `:32-37`): a 600 px do fim, troca o texto para `Carregando mais {n}…`, insere dois `.paged-skel` e acrescenta o bloco no quadro seguinte; o esqueleto é `4/3` com brilho (`styles/paged.css:7-11`) e some com movimento reduzido (`paged.css:12`).
- Região viva `aria-live` `paged-live` (só para leitor de tela, `paged.css:20`) recebe `Mostrando {n} de {total} …` ou `Você viu os {total} …` (`paged-list.js:18`, `:26`).
- `askEndHtml` (`paged-list.js:45`) existe no arquivo mas **não** é usada pelo catálogo (o catálogo passa `end: catalogEndHtml(kind)`); é de outras telas.

##### 9. Filtros por pílula — `shell/segmented.js`

- O `segmented.js` só age em `.filter-row[data-seg]` (`segmented.js:15`), emitido por `filterChips` (`catalog.js:1`). As pílulas do catálogo **não** usam esse helper: `catalogPillsHtml` (`filters.js:24-32`) emite `<button class="fpill">` sem `data-seg` e sem `.seg-ind`. Portanto, nas três rotas desta área o indicador deslizante não aparece; ele aparece nas telas que usam `filterChips` (Salvos, Busca, Negócios, Comunidade, Grupos, Agenda, Painel) — `filterChips` está definido no arquivo desta área (`catalog.js:1`) mas é consumido fora dela (`features/businesses/catalog.js:1`, `community/views.js:4`, `groups/views.js:110`, `events/views.js:13`, `search/views.js:6`, `profile/views.js:9-10`, `owner/*`).
- Funcionamento (`segmented.js`): o `.seg-ind` desliza para o chip `selected` da linha, com posição/medida recalculadas por `ResizeObserver` (`:18`), espera `updateComplete` dos `md-filter-chip` (`:22`), e some (`hidden`) quando não há chip escolhido (`:23`); `styles/segmented.css:4-8` faz a pílula do chip escolhido ficar transparente para o indicador aparecer. Sem movimento ou em cores forçadas há alternativa (`segmented.css:9-10`).

---

### 2.2 Detalhe do anúncio, editor, assistente de imóvel, fotos e galeria

#### 2.2.1 Rota `anuncio` — id de item em `state.items`

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): `"Anúncio"`
- Aba ativa (`activeTab`, `shell/navigation.js:54`): retorna `origin` (a rota de origem da navegação; default `'inicio'`, `app/state.js:16`) — `'anuncio'` não está em nenhuma das listas de grupos, então cai no `return origin`.
- De onde se chega:
  - `open-item` (`app/handlers.js:93`), emitido por `.card-link` do cartão de anúncio (`shell/primitives.js:21`), por swipe/long-press (`motion/gestures.js:36`,`:39`), por avisos (`notice-open`) e por `resume` (`app/handlers.js:27`). O handler ajusta `state.city` para a cidade do item e incrementa `i.views` quando não é seu.
  - `navigate('anuncio', id)` depois de publicar (`features/listings/editor.js:17`).
  - `thread-origin` a partir de uma conversa (`features/messaging/actions.js:49`).
- Desenhada por: `renderItem` em `features/listings/detail.js:4`; helpers próprios: `unavailable` (`detail.js:1`), `removedContent` (`detail.js:3`), `propertyDetailHtml` (`attributes.js:17`), `itemDetailHtml` (`attributes.js:22`), `pickupText` (`attributes.js:12`), `amenityLabel` (`attributes.js:26`).
- Parâmetro: `route.id` = id de item em `state.items` (resolvido por `itemById`, `app/state.js:54`).

##### Conteúdo, de cima para baixo

Barra de ações fixa (`#detail-actions`, mostrada por `actionsBar`, `shell/navigation.js:69`) — `detail.js:8`:
1. `iconBtn` salvar: ícone `bookmark`/`bookmark_border`, ação `save-item`, valor `i.id`, rótulo `"Salvar anúncio"` ou `"Remover dos salvos"`, `aria-pressed` com o booleano de `i.saved`.
2. `iconBtn` compartilhar: ícone `share`, ação `share`, valor `"anuncio|{i.id}"`, rótulo `"Compartilhar anúncio"`.
3. Botão principal: se `i.mine` → `btn('Editar anúncio','edit-item',i.id,'filled','edit')`; senão → `btn(sold?'Indisponível':'Tenho interesse','item-interest',i.id,'filled','chat_bubble')` e, quando `sold`, o `<md-filled-button>` recebe o atributo `disabled`.

Corpo (`detail.js:9`), em `<div class="detail-layout">` com coluna principal + `<aside class="detail-aside">`:
1. Herói de fotos (`<div class="detail-hero" id="listing-hero">`): se houver foto, `<img id="hero-image" alt="{título}">` + botão `.hero-zoom` ação `lightbox` valor `"item"` com texto `"Ver fotos"` e, com mais de 1 foto, `"Ver fotos ({n})"`; sem foto, bloco `.photo-fallback` com `photo_camera`.
2. Selo `.pill` sobre a foto: `sold` → `"Indisponível"` (imóvel) ou `"Vendido"` (desapego); senão → `"Imóvel"` ou `"Desapego"`.
3. Galeria (só com mais de 1 foto): `<div class="gallery" aria-label="Galeria de fotos">` com botões ação `gallery` valor `n`, `aria-label="Ver foto {n+1}"`, primeiro com classe `selected`; `<img alt="Foto {n+1} de {título}">`.
4. Se `i.demo` e houver foto: `<p class="labelled-example">` `"Foto ilustrativa do anúncio de exemplo."`.
5. Bloco de título: `<div class="price">` com `money(i.numPrice)` e, se `i.per`, `<small> / mês</small>`; `<h1>{i.title}</h1>`; `<p class="muted small">` com `hoodTag(i)` + cidade + `" · seu anúncio"` quando `i.mine`.
6. Atributos por tipo: `propertyDetailHtml(i)` ou `itemDetailHtml(i)`.
7. Seção `"Sobre o anúncio"` (`sectionTitle`) com `<p class="detail-copy">` = `i.desc`.
8. Seção `"Localização aproximada"`: `context-strip readonly` com ícone `location_on`, texto `hoodTag(i, ', ')` + cidade, `<span class="tiny">` `"O endereço exato pode ser combinado na conversa."` e, só quando `hoodShown(i)`, `btn('Ver bairro','map','{hood}|{city}','text')`.
9. `<aside class="detail-aside">` — bloco do vendedor (`.seller`): avatar (classe `me` quando seu, com iniciais do perfil; senão `i.sini` ou iniciais do vendedor), `<b>` = `state.profile.name` (seu) ou `i.seller`, `<span class="small muted">` = `i.note` ou `"Membro da comunidade"`, e `verifiedBadgeHtml()` → botão `"Perfil verificado"` (ação `verified-info`, `shell/verified-info.js:6`).

Atributos do imóvel — `propertyDetailHtml` (`attributes.js:17-21`):
- Linha `<p class="small muted">` com `"{ptype} para alugar · "` (se `ptype`) + `when`: `"Disponível a partir de {data}"` (se `i.avail > dateISO(0)`) ou `"Disponível agora"`.
- `.facts` com 3 cartões: `beds`/`"quartos"`, `area` + `" m²"`/`"área"`, `parking`/`"vagas"` (usa `'—'` quando nulo).
- Linha de valores: com condomínio → `"Aluguel {numPrice} + condomínio {condo} = {itemTotal} / mês."`; sem → `"Sem condomínio."`
- Seção `"Comodidades"` (só se houver) com `md-assist-chip` por comodidade (ícone `check`).

Atributos do desapego — `itemDetailHtml` (`attributes.js:22-25`): retorna `''` se `!cond && !cat && !pickup`; senão `.facts` com `cond`/`"estado de uso"`, `cat`/`"categoria"`, retirada (`pickupText(i)` sem o prefixo, ou `"Já disponível"`)/`"retirada"`.

Aside quando o anúncio é seu (`i.mine`) — `detail.js:9`:
- `.metric-grid` com 3 `.metric`: `"visitas"` = `i.views||0`; `"conversas"` = nº de `state.threads` do tipo item com esse id e vendedor não bloqueado; `"situação"` = `"Encerrado"` (sold) ou `"Ativo"`.
- Pilha de botões: `btn(sold?'Reativar anúncio':i.kind==='imovel'?'Marcar indisponível':'Marcar como vendido','item-status',i.id,'outlined',sold?'refresh':'check_circle')`; `btn('Ver interessados','item-leads',i.id,'outlined','chat_bubble')`; `btn('Excluir anúncio','delete-item',i.id,'text','delete')` com a classe `danger` injetada.

Aside quando o anúncio é de outra pessoa:
- `btn('Fazer uma oferta','item-offer',i.id,'outlined','sell')`
- `btn(i.kind==='imovel'?'Combinar visita':'Perguntar sobre retirada','item-visit',i.id,'outlined','event')`
- `btn('Denunciar anúncio','report','item|{i.id}','text','flag')`
- `btn('Bloquear {i.seller}','block-person',i.seller,'text','cancel')` — só se `blockable(i.seller) && !isBlocked(i.seller)`.

##### Estados

- **Removido pela moderação**: `i?.status==='removed'` → `removedContent('item')` (`detail.js:3`,`:5`): título `"Anúncio removido"`, texto `"A moderação do Bivaque removeu este conteúdo depois de denúncias."`, ícone `report`, ação `home`, rótulo `"Ir para o início"`. O comentário `detail.js:2` registra que abre assim por Salvos, conversa ou endereço direto.
- **Indisponível nesta cidade / id inexistente**: `!accessibleRecord(i)` (`app/state.js:64` exige `record.city===state.city`) → `unavailable()` (`detail.js:1`,`:5`): título `"Conteúdo indisponível nesta cidade"`, texto `"Volte para a página inicial ou selecione a cidade em que o conteúdo foi publicado."`, ícone `location_off`, ação `home`, rótulo `"Ir para o início"`. Não há faixa de aviso de "visita a outra cidade" nessa rota (o `readonlyHtml` de `shell/navigation.js:108` não é usado aqui).
- **Conteúdo de pessoa bloqueada**: `blockedGate('item',i.id,i.seller,i.mine)` (`features/profile/blocks.js:16`) → sem "Ver mesmo assim", a página inteira vira `blockedContent` (`blocks.js:14`): título `"Conteúdo de uma pessoa que você bloqueou"`, texto `"{nome} está nas suas pessoas bloqueadas."`, botão `"Ver mesmo assim"` (`peek-blocked`); com peek, aparece a faixa `blockedStrip` (`blocks.js:12`): `"Você bloqueou {nome}"` + botão `"Desbloquear"` (`unblock-person`).
- **Vendido/encerrado**: `sold` altera o selo (`Vendido`/`Indisponível`), o botão de mensagem para `"Indisponível"` desabilitado e, se for seu, `"Reativar anúncio"` e a métrica `"situação"` = `"Encerrado"`.
- **Carregando/esqueleto**: não há estado de carregamento na rota; existe animação de imagem `img-wait` (`styles/empty-states.css:2-6`) aplicada às classes `.cover/.detail-hero/.gallery button`.
- **Perfil não verificado**: `canPost()` (`app/state.js:59-63`) abre o diálogo `"Perfil em análise"` ao tentar editar/publicar/contatar.
- **Somente leitura (outra cidade)**: contatando um anúncio de cidade visitada, `contact` chama `canPost()` → toast `"Você está consultando {cidade}. Publique na sua cidade, {homeCity}."` (`app/state.js:61`).

##### Diferenças por viewport

- **375 px (e qualquer coisa abaixo de 480 px)**: `@media(max-width:479px)` em `styles/base.css:28` reduz `.detail-title h1` (25px), `.detail-title .price` (27px), `.facts`/`.metric-grid` gap 6, `.fact` padding 10, `.metric` padding 12, `.detail-actions` padding-inline 12. Em `@media(max-width:719px)`:
  - imersão da foto: `body.immersive .page{padding-top:0}`, `main{top:0}`, `.detail-hero{margin:0 calc(-1*var(--space));border-radius:0;aspect-ratio:4/3}` (`styles/detail-immersive.css:5-7`); a barra fica transparente com `top-title` oculto até a foto passar por baixo (`styles/detail-immersive.css:9-12`); a classe `immersive` e a `bar-solid` são aplicadas por `shell/navigation.js:84-86` (só `anuncio`/`negocio` com `innerWidth<720`).
  - `md-dialog.form-dialog{width:100vw}` (`styles/overlays.css:9`); no template `md-dialog` também tem `width:calc(100vw - 24px)` do breakpoint 479 (`styles/base.css:28`).
  - barra inferior do detalhe cola no safe-area: `body.mobile-detail .detail-actions{bottom:env(safe-area-inset-bottom)}` (`styles/navigation.css:13`; a classe vem de `shell/navigation.js:95`).
  - lightbox: `.lightbox-stage{padding:0 8px}` e setas 40×40 com fundo `--bv-photo-chip` (`styles/photos.css:30`).
- **768 px e 1440 px**: ambos caem em `@media(min-width:720px)` (`styles/base.css:29`), que vira `.detail-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.65fr);gap:28px}`, `.detail-aside{padding-top:22px}`, `.detail-hero{max-height:480px;aspect-ratio:16/8}`, `.detail-actions{padding:12px 28px}`, `.detail-actions-in{justify-content:flex-end}` e botões do detalhe com `min-width:220px`. Não encontrei media query específica de 1440 px nos arquivos desta área; o container é limitado por `--max:1120px` (`styles/base.css:19`). O único breakpoint acima disso que toquei é `@media(min-width:1200px)` de `card-grid` (não do detalhe).

##### Diálogos, editores, folhas e menus abertos nesta rota

**1) Editor de anúncio — `openItemEditor` (`features/listings/editor.js:3`), `showDialog(..., 'editor')` (`editor.js:8`)**
- Guardas: `if(!canPost())return;` e `if(id&&(!original?.mine||original.city!==state.homeCity))return;` (`editor.js:4`). Se `kind==='imovel'` e sem `id`, delega para `openPropertyWizard` (`editor.js:6`).
- Título do diálogo: `id?'Editar anúncio':kind==='imovel'?'Anunciar imóvel':'Anunciar desapego'` (`editor.js:8`). Na prática, o diálogo único de imóvel só abre com `id` (edição) — a criação de imóvel cai no assistente; logo `"Anunciar imóvel"` nessa linha é sombra.
- `editor={kind:'item',type:kind,id,draftId,photos:[...]}` e `editorDirty=false` (`editor.js:7`).
- Campos (todos dentro de `<div class="form-grid">`, `editor.js:8`) — desapego e imóvel compartilham os três primeiros:

| id | rótulo exato | tipo | limites/validação | valor inicial |
|---|---|---|---|---|
| `item-title` | `"Título do anúncio"` | texto | `required minlength="5" maxlength="100"`, `class="full"` | `x.title` |
| `item-price` | imóvel `"Aluguel mensal (R$)"` / desapego `"Preço (R$)"` | number | `min="1" step="0.01" required inputmode="decimal"` | `x.numPrice` |
| `item-hood` | `"Bairro"` (ou `"Bairro (opcional)"` sem base de bairros) | texto com busca | `required` se a cidade tem bairros, `maxlength="60"`, `autocomplete="off"`, placeholder `"Digite o bairro ou o CEP"`, supporting-text `"{cidade} · {zona}"` ou `"Só o bairro aparece no que você publica."` | `x.hood` |

- Campos exclusivos de imóvel (`editor.js:8`):
  - `item-ptype` — `selectField('item-ptype','Tipo de imóvel',[['','Escolher tipo'],...PROPERTY_TYPES],x.ptype,'required')`. Valores: `"Apartamento"`, `"Casa"`, `"Casa em condomínio"`, `"Flat ou studio"`, `"Kitnet"` (`attributes.js:3`).
  - `item-beds` — `"Quartos"`, `type="number" min="0" max="20" required`.
  - `item-area` — `"Área (m²)"`, `type="number" min="10" max="100000" required`.
  - `item-parking` — `"Vagas"`, `type="number" min="0" max="20"` (não obrigatório).
  - `item-condo` — `"Condomínio (R$)"`, `type="number" min="0" inputmode="decimal"`.
  - `item-avail` — `"Disponível a partir de (opcional)"`, `type="date" min="{dateISO(0)}"`, supporting-text `"Em branco: disponível agora"`.
  - Grupo `Comodidades`: `<div class="full attr-group" role="group" aria-labelledby="item-amen-label">`, `<span class="attr-label" id="item-amen-label">Comodidades</span>` e `md-chip-set id="item-amen"` com um `md-filter-chip` por comodidade (`label` + `data-value`; `selected` conforme `x.amen`). Comodidades (`attributes.js:4`): `furnished`=`"Mobiliado"`, `pets`=`"Aceita pets"`, `ac`=`"Ar-condicionado"`, `balcony`=`"Varanda"`, `pool`=`"Piscina"`, `gym`=`"Academia"`, `doorman`=`"Portaria 24h"`, `leisure`=`"Área de lazer"`.
- Campos exclusivos de desapego:
  - `item-cat` — `selectField('item-cat','Categoria',[['','Escolher categoria'],...ITEM_CATEGORIES],...,'required')`. Valores (`attributes.js:5`): `"Móveis"`, `"Eletrodomésticos"`, `"Eletrônicos"`, `"Infantil"`, `"Casa e decoração"`, `"Esporte e lazer"`, `"Pets"`, `"Roupas e acessórios"`, `"Outros"`.
  - `item-cond` — `selectField('item-cond','Estado de uso',[['','Escolher estado'],...ITEM_CONDITIONS],...,'required')`. Valores (`attributes.js:6`): `"Novo"`, `"Seminovo"`, `"Usado"`, `"Precisa de reparo"`.
  - `item-pickup` — `"Retirada a partir de (opcional)"`, `type="date" min="{dateISO(0)}"`, supporting-text `"Em branco: já pode ser retirado"`, `class="full"`.
- Sempre presente: `item-desc` — `"Descrição"`, `type="textarea" rows="4" required minlength="12" maxlength="2000" class="full"`; em seguida `photoUploadHtml()`; e `<p class="form-note">` `"Publicado em {homeCity}. O endereço exato não aparece no anúncio."`.
- `hoodField` (`features/profile/hood-privacy.js:15`) monta o campo com `hoodPicker` (`shell/hood-picker.js:26`): botão `"Usar minha localização"` (só se a cidade tem base) e um menu `role="group" aria-label="Sugestões de bairro"`. Mensagens internas do picker: `"Continue digitando: o CEP tem 8 números."`, `"CEP não encontrado no modo teste. Digite o nome do bairro."`, `"Esse CEP é de {cidade}. Aqui vale um bairro de {cidade}."`, `"O CEP só serve para achar o bairro e não fica salvo."`, `"Mais escolhidos em {cidade}"`, `"Usar “{texto}” como está"`, `"Usar minha localização"`, `"Este aparelho não informa a localização. Digite o bairro ou o CEP."`, `"Sua localização não fica em {cidade}. Digite o bairro."`, `"Não deu para usar a localização. Digite o bairro ou o CEP."`, `"{n} sugestão/sugestões. Use as setas para escolher."` (`hood-picker.js:36-74`).
- Ações do diálogo (`editor.js:8`): sem `id` → `btn('Salvar rascunho','save-draft','','text')`; com `id` → `btn('Cancelar','close-dialog','','text')`; sempre → `btn(id?'Salvar alterações':'Publicar anúncio','submit-item','','filled')`.
- Validação no envio — `submitItem` (`editor.js:12`): se `editor.wizard && !wizEnsureValid()` retorna; `validFields([...])` (`editor.js:11`) usa `reportValidity()` nativo e foca o primeiro inválido; depois `itemForm()` (`editor.js:10`) e as mensagens literais, na ordem (`editor.js:14`):
  1. `"O título precisa de pelo menos 5 letras."`
  2. `"Informe um preço maior que zero."`
  3. `hoodProblem` → `"Escolha o bairro na lista. O CEP não fica salvo."` ou `"Escolha o bairro."` (`shell/hood-picker.js:12`,`:25`)
  4. `"Descreva o anúncio com pelo menos 12 caracteres."`
  5. imóvel sem tipo válido → `"Escolha o tipo de imóvel."`
  6. desapego sem categoria válida → `"Escolha a categoria."`
  7. desapego sem estado válido → `"Escolha o estado de uso."`
  8. `pickup` fora de `\d{4}-\d{2}-\d{2}` → `"Informe uma data de retirada válida."`
  9. `avail` fora do formato → `"Informe uma data de disponibilidade válida."`
  - Cada mensagem sai por `notify(itemProblem,'error')` e interrompe.
- Ao concluir (`editor.js:16-17`): `mutate` cria/atualiza; item novo ganha `city:state.homeCity`, `price`, `per`, `status:'active'`, `mine:true`, `seller:state.profile.name`, `sini`, `note:'Membro da comunidade'`, `saved:false`, `createdAt`, `views:0`, `demo:false`; item existente ganha `updatedAt` e `demo` recalculado por `photos.some(p=>!p.startsWith('data:'))`. Se havia `draftId`, o rascunho é removido. Sucesso: `closeDialog(true)`, `navigate('anuncio',id)` e toast `"Anúncio atualizado"` ou `"Anúncio publicado"`.

**2) Rascunho — `saveDraft` (`editor.js:19`)**
- Sem validação: lê `itemForm()`, usa `editor.draftId||uid('d')`, grava em `state.drafts` (com `at:Date.now()`), fecha o diálogo, `myAdsFilter='drafts'`, `navigate('meus-anuncios')`, toast `"Rascunho salvo"`.
- Onde fica: `state.drafts` (array em `app/state.js:10`), persistido em `localStorage` pela chave `KEY` dentro de `mutate` (`app/state.js:27-30`). Sobrevive ao recarregar; o objeto guarda todos os campos de `itemForm` mais `id` e `at`.
- Listagem em `renderMyAds` (`features/profile/views.js:10`): aba `"Rascunhos"`; linha com `<b>{d.title||'Anúncio sem título'}</b>` e `<small>{'Imóvel'|'Desapego'} · rascunho</small>`, ação `open-draft` (`d.id`) e `iconBtn('delete','delete-draft',d.id,'Excluir rascunho')`. Vazio: `empty('Nenhum rascunho','Use “Salvar rascunho” enquanto prepara um anúncio.','edit_note','create-item','Preparar anúncio')`.
- Reabrir: `open-draft` → `openItemEditor('desapego',null,draftId)` (`app/handlers.js:87`); `kind=x.kind||kind` (`editor.js:5`), então rascunho de imóvel volta ao assistente.
- Excluir: `delete-draft` (`app/handlers.js:103`) → confirm `"Excluir rascunho?"` / `"O texto e as fotos deste rascunho serão removidos."` → toast `"Rascunho excluído"`.
- Fechar com edição não salva: `closeDialog` (`shell/dialogs.js:13`) chama `confirm('Descartar alterações?','Você pode continuar editando ou descartar o que ainda não foi salvo.', ...)`; a mesma confirmação existe em `leaveDialog` (`shell/dialogs.js:18`) para navegação.

**3) Assistente de imóvel — `openPropertyWizard` (`features/listings/wizard.js:36`), `showDialog('Anunciar imóvel', ..., 'editor')` (`wizard.js:38`)**
- `editor={kind:'item',type:'imovel',id:null,draftId,photos:[...],wizard:true}` (`wizard.js:37`); `wizStep=1;wizShow(1)` (`wizard.js:39`).
- Etapas `WIZ_STEPS` (`wizard.js:5`), títulos exatos: `1 "O imóvel"`, `2 "Valores e disponibilidade"`, `3 "Comodidades e descrição"`, `4 "Fotos"`, `5 "Revisão"`. Cada seção é `<section class="wiz-step form-grid" data-step="{n}" aria-labelledby="wiz-t{n}">` e o `<h3 class="full wiz-title" id="wiz-t{n}" tabindex="-1">` (`wizard.js:8`).
- Etapa 1 (`wizard.js:10`): `item-ptype` (`"Tipo de imóvel"`, `required`), `item-title` (`"Título do anúncio"`, `required minlength="5" maxlength="100"`, supporting-text `"Ex.: Apartamento 2 quartos perto da Base Aérea"`), `item-hood`, `item-beds` (`"Quartos"`, `min="0" max="20" required`), `item-area` (`"Área (m²)"`, `min="10" max="100000" required`), `item-parking` (`"Vagas"`, `min="0" max="20"`).
- Etapa 2 (`wizard.js:11`): `item-price` (`"Aluguel mensal (R$)"`, `min="1" step="0.01" required inputmode="decimal"`), `item-condo` (`"Condomínio (R$)"`, `min="0"`), `item-avail` (`"Disponível a partir de (opcional)"`, `type="date" min="{dateISO(0)}"`, supporting-text `"Em branco: disponível agora"`). Nota: `"Quem procura vê o total do mês: aluguel + condomínio."`.
- Etapa 3 (`wizard.js:12`): grupo `Comodidades` (mesmo markup do editor) + `item-desc` (`required minlength="12" maxlength="2000"`).
- Etapa 4 (`wizard.js:13`): `photoUploadHtml()`.
- Etapa 5 (`wizard.js:14`): `<div class="full" id="wiz-review"></div>`, preenchido por `wizReviewHtml()`.
- Nota final: `"Publicado em {homeCity}. O endereço exato não aparece no anúncio."` (`wizard.js:15`).
- Ações (`propertyWizardActions`, `wizard.js:17`): `"Salvar rascunho"` (`save-draft`, text), `.wiz-gap`, `"Voltar"` (`wiz-prev`, text), `"Continuar"` (`wiz-next`, filled), `"Publicar anúncio"` (`submit-item`, filled).
- Progresso (`wizShow`, `wizard.js:26-34`): largura de `.wiz-bar span` = `round(step/5*100)%`; texto `#wiz-count` = `"Etapa {n} de 5 · {título}"`; mostra/esconde `wiz-prev`/`wiz-next`/`submit-item` por `display`; foca `#wiz-t{n}`.
- Navegação — `wizardAction` (`wizard.js:41-49`): trata `wiz-next`/`wiz-prev`/`wiz-go`. `wiz-prev` volta; `wiz-go` vai ao passo do valor; `wiz-next` primeiro roda `validFields(WIZ_STEPS[wizStep-1][1])` (campos da etapa) e, na etapa 1, exige `PROPERTY_TYPES.includes($('#item-ptype').value)` — senão `notify('Escolha o tipo de imóvel.','error')` e foca o campo.
- Volta ao campo inválido — `wizEnsureValid` (`wizard.js:51-54`): percorre as etapas, acha o primeiro campo com `checkValidity()` falso (ou o `item-ptype` inválido na etapa 1), chama `wizShow(passo)`, depois `reportValidity()` e `focus()` no campo; devolve `false` (publicar com campo inválido leva à etapa do campo).
- Revisão — `wizReviewHtml` (`wizard.js:19-25`): nota `"Confira antes de publicar. É assim que o cartão aparece para quem procura."`; prévia `photoCard(preview)` com `inert`; e 4 linhas com botão `"Editar"` (`wiz-go`, valor = n): `"O imóvel"` (tipo · quartos · m² · vagas · bairro), `"Total por mês"` (`money(total)` + `(aluguel X + condomínio Y)` quando houver + `" · "` + `"disponível a partir de {data}"`/`"disponível agora"`), `"Comodidades"` (lista ou `"Nenhuma marcada"`), `"Fotos"` (`"{n} foto/fotos"` ou `"Sem fotos: o cartão mostra um ícone"`).

**4) Oferta — `item-offer`/`send-offer` (`app/handlers.js:98-99`)**
- `showDialog('Fazer uma oferta', ...)`: campo `offer-amount` — `"Sua oferta (R$)"`, `type="number" min="1" required`, valor inicial `Math.round(i.numPrice*.9)`; nota `"O valor será enviado como mensagem. O anunciante decide se aceita."`.
- Botões: `"Cancelar"` (`close-dialog`, text) e `"Preparar oferta"` (`send-offer`, filled).
- `send-offer` roda `validFields(['offer-amount'])` e inicia conversa via `contact('item', id, "Olá! Você aceitaria {valor}?")`.
- Anúncio já encerrado tenta `notify('Este anúncio foi encerrado.','info')` antes de abrir (`handlers.js:98`).

**5) Contatos recebidos — `item-leads` (`app/handlers.js:105-107`)**
- `showDialog('Contatos recebidos', ...)`: lista de `state.threads` do anúncio sem bloqueados, cada linha `profileRow('chat_bubble', t.who, t.msgs.at(-1)?.t||'Conversa iniciada','open-thread', t.id)`; vazio → `empty('Nenhum contato ainda','Os contatos sobre esta publicação aparecerão aqui.','chat_bubble')`. Botão `"Fechar"` (`close-dialog`).

**6) Denunciar — `report` → `openReport` (`app/handlers.js:39`, `features/profile/demo-actions.js:94`)**
(mesmo overlay — ver 2.5.1)

**7) Compartilhar — `share` com `anuncio|{id}` → `openShareCard` (`app/handlers.js:31`, `features/listings/share-card.js:42`)**
(mesmo overlay — ver 2.1.1, overlay 6)
- Se o registro não for acessível na cidade atual, cai em `share` (`features/messaging/actions.js:91-98`), que mostra `"Compartilhamento indisponível"` / `"O conteúdo foi removido ou não está disponível nesta cidade. Nenhum link foi compartilhado."`.

**8) Galeria em tela cheia — `openLightbox` (`features/listings/photos.js:29`)**
- Abre por `lightbox` valor `"item"` (`app/handlers.js:91`), usando a foto selecionada na `.gallery` (ou índice 0) e `i.title`.
- Markup (`photos.js:33`): `#lightbox` (`role="dialog" aria-modal="true" tabindex="-1"`, `aria-label="Fotos de {título}"`), topo com `#lightbox-count` (`aria-live="polite"`) e botão `"Fechar fotos"`; palco com botões `"Foto anterior"`/`"Próxima foto"` (`chevron_left`/`chevron_right`) e `<img id="lightbox-img">`; `.lightbox-thumbs` (`role="group" aria-label="Miniaturas"`) com `"Ver foto {n+1}"`.
- `showLightbox` (`photos.js:39`) define `src`, `alt` = `"Foto {i+1} de {total} de {título}"`, contador `"{i+1} de {total}"`, `aria-current` na miniatura e esconde setas/miniaturas quando `total<2`. `stepLightbox` (`photos.js:40`) é circular.
- Teclado (`lightboxKeys`, `photos.js:41`): `Escape` fecha, `ArrowRight`/`ArrowLeft` trocam, `Tab` prende o foco; com a galeria aberta, `c`, `/` e Ctrl/Cmd+K não disparam por baixo (`photos.js:44`).
- Gestos (`features/listings/photo-gestures.js`): pinça (2 dedos) e Ctrl+roda ampliam até `LB_MAX=4`, toque duplo / duplo clique alternam para `LB_DOUBLE=2.5` (`:6`,`:27`,`:88`,`:90`); teclado `+`/`=`/`-`/`0` (`:28-33`); ampliada, arrastar faz pan (`:56`); um dedo para o lado troca de foto (limiar 60 px ou velocidade) com `lbSlideIn` (`:79`,`:36`); arrastar para baixo fecha (limiar 120 px ou velocidade), com `haptic(8)` ao armar e fade via `--lb-fade` (`:58`,`:80`); animações desligadas com `prefers-reduced-motion` (`:7`,`:36`).
- Fechar (`photos.js:42`): remove o nó, devolve o `inert` dos elementos de trás, `history.back()` quando havia entrada de histórico e devolve o foco ao elemento de origem. Os elementos inativados são `LIGHTBOX_BEHIND=['#main','#nav','#topbar','#fab','#detail-actions']` (`photos.js:28`,`:34`).

**9) Confirmações destrutivas (`shell/dialogs.js:20`)**
- `confirm('Excluir anúncio?','“{título}” sairá das ofertas. As conversas existentes serão preservadas.', ...)` (`app/handlers.js:102`); botões default `"Confirmar"`/`"Continuar"`.
- Falha de persistência em qualquer `mutate` → toast `"Não foi possível salvar. Libere espaço no navegador ou use fotos menores."` (`app/state.js:29`).

---

### 2.3 Início, Comunidade, Pergunta, Busca e Guia

#### 2.3.1 Rota `inicio` — sem parâmetro

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): "Bivaque"
- Aba ativa (`activeTab`, `shell/navigation.js:54`): `inicio`
- De onde se chega: `nav` com `inicio` (menu inferior/trilho, `shell/navigation.js:65`); `home` (`app/handlers.js:22`); `apply-city`, `home-city`, `reset-prototype`, `apply-prototype` navegam para cá (`app/handlers.js:66,68,74,77`); fallback do `back()` a partir de `guia`, `agenda`, `pedidos` (`shell/navigation.js:51`); paleta → "Início" (`shell/command-palette.js:5`); `entryGate()` manda para cá ao entrar (`shell/navigation.js:106`)
- Desenhada por: `renderHome` em `features/home/views.js:12` (celular/tablet) e `renderHomeDesktop` em `features/home/desktop.js:6` (desktop); helpers próprios: `homeSearchRotate` (`views.js:8`), `renderPlan` (`views.js:32`), `planRing` (`views.js:34`), `planNextHtml` (`views.js:35`), `resumeRecord` (`views.js:38`), `homeResumeHtml` (`views.js:39`), `homeDeskNotice` (`desktop.js:22`), `homeDeskServices` (`desktop.js:35`), `homeDeskItems` (`desktop.js:41`), `homeDeskGroups` (`desktop.js:46`), `homeDeskEvent` (`desktop.js:53`), `homeDeskArrival` (`desktop.js:63`)
- Parâmetro: nenhum (`route.id` é ignorado; `parseRoute` só lê o `?cidade=` da query, `shell/navigation.js:36`)

##### Qual das duas telas vale

| viewport | tela | motivo |
|---|---|---|
| 375 | `renderHome` | `HOME_DESKTOP = matchMedia('(min-width:1024px)')` não casa (`desktop.js:4`; guarda em `views.js:13`) |
| 768 | `renderHome` | idem — o corte mobile/desktop é 1024 px, não 720 px |
| 1440 | `renderHomeDesktop` | `HOME_DESKTOP.matches` é verdadeiro (`views.js:13`) |

Ao cruzar 1024 px há re-render automático: `HOME_DESKTOP.addEventListener('change', () => { if (route.name === 'inicio') render() })` (`desktop.js:5`).

##### Conteúdo, de cima para baixo

###### Em `renderHome` (375 e 768) — `views.js:12-30`

1. **Cabeçalho** (`views.js:15-17`): `<h1>` = `"Conheça "` + cidade quando `readonly()`, senão `"O que você precisa em "` + cidade. A cidade dentro do `<h1>` é o botão `class="h1-city" data-action="city"` com `aria-haspopup="dialog"` e `title="Trocar de cidade"`, mostrando `state.city` + ícone `expand_more` (`views.js:15`). Subtítulo (`<p>`), só quando há momento:
   - `state.mode === 'chegando'` e não readonly: `"{countDays(state.arrival)} dias para chegar · {dateLabel(state.arrival)}"` (`views.js:16`)
   - `state.mode === 'saindo'` e não readonly: `"{countDays(state.leaveDate)} dias para sua mudança para {state.dest}"` (`views.js:16`)
   - modo `moro` (valor inicial, `app/state.js:10`): sem `<p>`.
2. **Busca + atalhos de área** (`views.js:17`): botão `id="home-search"`, `class="home-search-button"`, `data-action="search"`, `aria-label="Buscar no Bivaque"`, com ícone `search` e o texto `Busque ` + `<b class="home-search-ex">“diarista de confiança”</b>`. A lista `HOME_SEARCH_EXAMPLES` = `['diarista de confiança','escola perto de casa','berço','apartamento de 2 quartos','pediatra pelo plano']` (`views.js:7`); a cada **3200 ms** ela avança uma posição trocando só o `<b>` e animando `opacity` + `translateY(4px)`; para no último item, e não roda com `prefers-reduced-motion: reduce`, nem com `:focus-within`/`:hover` no botão (`views.js:8-11`).
   Abaixo, `nav class="intent-grid" aria-label="Áreas"` com 4 botões `class="intent" data-action="intent" data-value="{v}"`:
   - chegando: **Imóveis** (`apartment`,`imovel`), **Negócios** (`storefront`,`biz`), **Desapegos** (`sell`,`desapego`), **Indicações** (`volunteer_activism`,`ind`)
   - demais modos: **Negócios**, **Desapegos**, **Imóveis**, **Indicações** (`views.js:17`)
3. **"Precisa contratar?"** (`views.js:18`), só quando não readonly: botão `class="home-hire" data-action="create-request"` com ícone `build`, `<b>Precisa contratar?</b>` e `<small>Receba até 5 propostas da comunidade.</small>` (`REQUEST_LIMIT = 5`, `features/requests/model.js:4`) + `chevron_right`.
4. **Faixa de visita** (`readonlyHtml()`, `shell/navigation.js:108`), só quando `readonly()`: `class="context-strip readonly"` com ícone `visibility` e o texto `Você está conhecendo ` + **`{state.city}`** + `. Sua cidade atual é ` + `{state.homeCity}` + botão `Voltar` (`data-action="home-city"`).
5. **"Continue de onde parou"** (`homeResumeHtml`, `views.js:39`): só se não readonly, se `state.lastViewed.city === state.city` e se `resumeRecord(l)` ainda existir (item visível / negócio visível / pergunta visível, `views.js:38`). Botão `data-action="resume" data-value="{type}|{id}"`, ícone `history`, `<b>Continue de onde parou</b><br>` + título/nome/texto do registro.
6. **Plano de chegada/saída** (`views.js:20`): só quando `arriving` ou `leaving` **e** `state.plan[state.mode]` existe. Renderizado por `renderPlan(state.mode)` (`views.js:32`):
   - anel de progresso SVG `class="plan-ring"` com `aria-label="{n} de {total} etapas concluídas"` e texto central `n/total` (`views.js:34`);
   - `<h3>` = `"Sua chegada"` (chegando) ou `"Sua saída"` (saindo); `<span class="small muted">` = `"{n} de {total} etapas"`;
   - pílula à direita: `"Tudo pronto"` com `check_circle` quando todas as etapas estão feitas; senão `"{dias} dia(s)"` com `flight_land` (chegando) ou `local_shipping` (saindo) e `aria-label="{dias} dia(s) para chegar|para a mudança"`;
   - lista `<ol class="plan-steps">` mostrando **até 3 etapas** na janela em volta da próxima pendente (`slice` em `views.js:32`). Cada `<li class="plan-step is-done|is-current|is-todo">` tem `<md-checkbox aria-label="Marcar {t} como concluído" data-action="plan-check" data-value="{kind}|{id}">`, botão `data-action="plan-go" data-value="{kind}|{id}"` com `<b>{t}</b>` (+ `<span class="plan-now">Próxima</span>` na etapa atual) e `<small>{s}</small>`, e `chevron_right`;
   - botão `Continuar` (`views.js:35`) quando a etapa atual tem `go` (classe `plan-next`, `aria-label="Continuar: {t}"`);
   - botão `Ver plano completo` `data-action="plan" data-value="{kind}"` com ícone `checklist` — abre o diálogo (`app/handlers.js:28` → `openLocalPlan`, `handlers.js:147`).
   Etapas de fábrica: chegando `c1..c6` = "Moradia", "Escola das crianças", "Pediatra e plano de saúde", "Mudança e transportadora", "Carro e documentos", "Conhecer quem chega com você" (`data/demo/source.js`); saindo `s1..s4` = "Anunciar o que não vai levar", "Passar o apartamento para quem chega", "Deixar suas indicações", "Conhecer Brasília antes de ir" (o `t` de s4 é reescrito para `"Conhecer a cidade de destino"`, `app/state.js:6`). Os `go` de fábrica são sobrescritos em `app/state.js:5-6` (`filter|search|groups|publish|my-questions|destination`).
7. **Serviços recomendados** (`homeDeskServices(1)`, `views.js:22` → `desktop.js:35-40`): `sectionTitle("Serviços recomendados", "Ver negócios", "businesses")` + `<p class="small muted home-sub">Indicados pela comunidade de {cidade}</p>`. Cartões `article.photo-card.home-biz` com `cover()` e rótulo: `"Patrocinado"` (patrocinado), `"Indicado pela comunidade"` quando `claimed === false`, senão a categoria. Rodapé: `"Aguardando o responsável"` (`hourglass_top`) ou `"{recN} indicação/indicações"` (`forum`, via `countHtml` + `avatarStack`) ou `"Novo na cidade"`; e `"Ver negócio"` + `chevron_right`. No celular o patrocinado entra como **2º cartão** (`sponAt=1`, `views.js:22`); no desktop, 3º (`sponAt=2` padrão, `desktop.js:35-37`). Patrocinado só existe com `window.BIVAQUE_LABS.paidPlans` (`features/businesses/plans.js:11,23`).
8. **Oportunidades** (`homeDeskItems(arriving, 'Oportunidades')`, `views.js:22` → `desktop.js:41-44`). Título por `catalogSectionTitle` (`features/listings/catalog.js:37`), que sempre traz os botões `"Ver desapegos"` e `"Ver imóveis"`: `"Para a casa nova"` quando chegando, senão `"Oportunidades"`; no desktop, `"Oportunidades perto de você"`. Cartões `photoCard` (`shell/primitives.js:19`) com preço, selo (`Vendido`/`Indisponível`/`Seu anúncio`/`Em transferência`/`Imóvel`/`Desapego`) e botão salvar. No celular o texto dos cartões é reescrito: `"Retirada a partir de "` e `"Disponível a partir de "` viram `"A partir de "` (`views.js:22`).
9. **Grupos** (`homeDeskGroups()`, `views.js:23` → `desktop.js:46-51`): `sectionTitle("Nos seus grupos", "Ver grupos", "groups")`; no máximo 2 publicações recentes dos meus grupos (`open-post`, `data-value="{gid}~{pid}"`), com avatar, `<b>` (prefixado `"Oferta · "` quando for oferta) e meta com nome do grupo, `"{n} resposta(s)|comentário(s)"` e `gAgo`. Se não houver publicações, mostra até 2 linhas de grupo. Vazio/ausente quando `readonly()` ou sem grupo ativo (`desktop.js:47`).
10. **Próximo encontro** (`homeDeskEvent()`, `views.js:23` → `desktop.js:53-61`): `sectionTitle("Próximo encontro", "Agenda", "agenda")`. Escolhe o mais próximo entre evento de grupo (`attend-post`) e evento da cidade (`attend-event`); data em bloco (mês abreviado + dia), título (primeira frase), meta `"{Dia} · {hora} · {local|grupo}"` e botão `"Vou"`/`"Confirmado"` (ou `"Editar"` para evento meu, `edit-event`).
11. **Chegada pelo momento** (`homeDeskArrival(arriving,leaving)`, `views.js:23` → `desktop.js:63-71`), ausente quando `readonly()`:
    - chegando: `"Chegando a {cidade}?"` + `"Encontre orientações e indicações para a mudança."` + botão `"Ver guia de chegada"` (`guide`), ícone `flight_land`;
    - saindo: `"Mudança para {state.dest}"` + `"Acompanhe as etapas da sua saída."` + `"Ver plano completo"` (`plan`,`saindo`), ícone `local_shipping`;
    - senão, com `state.incoming > 0` (`incoming` = 14 no cenário `live`, 0 no `seed`, `app/state.js:10`): `"{N} famílias estão chegando"` (N animado por `countHtml`) + `"Uma indicação sua pode ajudar."` + `"Ajudar quem chega"` (`nav`,`comunidade`).
12. **"A comunidade procura"** (`views.js:25` → pergunta mais aberta): `sectionTitle("A comunidade procura", "Ver perguntas", "nav", "comunidade")`. Até **2** perguntas abertas com menos respostas (`cityAsks().filter(q => q.status === 'open').sort(...).slice(0, 2)`, `views.js:24`), cada uma como `questionRow`. Sem nenhuma: `empty("Uma pergunta pode ajudar muita gente", "Busque uma indicação ou compartilhe uma dúvida com sua cidade.", "forum", …)` com botão `"Pedir indicação"` (`ask`) — só quando não readonly.
13. **Guia** (`views.js:26`): `sectionTitle("Guia de {cidade}", "Abrir guia", "guide")` + `<button class="list-row list" data-action="guide">` com ícone `map`, `<b>Organize moradia, mudança e serviços</b>` e `<small>Um roteiro prático para se estabelecer na cidade.</small>` + `chevron_right`.
14. **"Tem um negócio?"** (`views.js:27`), só quando não readonly: `class="context-strip readonly home-biz-cta"` com ícone `add_business`, `<b>Tem um negócio?</b><br>Crie sua página e receba pedidos da comunidade.` e botão `"Minha página"` (quando `state.myBiz.live`) ou `"Criar página"` — `data-action="my-biz"`.

Ordem dos blocos no celular: 1, 2, 3, 4, 5, 6, 7+8, 9, 10, 11, 12, 13, 14 (`views.js:17-27`).

###### Em `renderHomeDesktop` (1440) — `desktop.js:6-20`

Mesmos blocos, com duas colunas: `<div class="home-desk"><div class="home-main">…</div><aside class="home-side" aria-label="Sua cidade">…</aside></div>` (`desktop.js:19`).

- **Coluna principal**: cabeçalho (1) — `h1` = `"Conheça {cidade}"` (readonly) ou `"O que você precisa em {cidade}?"`, e o subtítulo cai para `"Serviços e oportunidades entre militares e famílias."` quando o modo é `moro` (`desktop.js:8-9`); busca + atalhos (2) na ordem fixa Negócios/Desapegos/Imóveis/Indicações — ou seja, a ordem do celular no modo `moro`, sem a troca que o celular faz quando está chegando — e, no lugar do exemplo que gira, o texto fixo `Busque serviços, produtos, imóveis ou indicações` **mais um `<kbd class="home-kbd">⌘ K`|`Ctrl K`** (`PALETTE_MAC`, `shell/command-palette.js:4`); depois `home-alerts` com o aviso pessoal + "Precisa contratar?" (3), faixa de visita (4), retomar (5), plano (6), Serviços recomendados com patrocinado em 3º (7), Oportunidades "Oportunidades perto de você" (8), "Tem um negócio?" (14), "A comunidade procura" (12) e Guia (13) — `desktop.js:10-18`.
- **Coluna lateral** (`desktop.js:19`): grupos (9), próximo encontro (10) e chegada (11).

**Diferença material**: o aviso pessoal `homeDeskNotice` só existe no desktop (`desktop.js:11-12,22`); o celular não o renderiza e deixa os avisos só no sino da barra (comentário em `views.js:4`).

##### Aviso pessoal (`homeDeskNotice`) — `desktop.js:22-32`

Não aparece em `readonly()`. Escolhe **um** faixa, na ordem, com o padrão `class="home-notice" data-action="{action}" data-value="{value}"` (`desktop.js:24`):

| prioridade | condição | ícone | título | subtítulo | rótulo | ação |
|---|---|---|---|---|---|---|
| 1 | minha pergunta com status ≠ `ok` e com respostas, mais recente | `chat_bubble` | `Sua pergunta recebeu {n} resposta|respostas` | o texto da pergunta | `Ver respostas` | `open-question`, valor = id |
| 2 | meu pedido na cidade, ativo, com proposta `sent`, mais recente | `request_quote` | `Seu pedido recebeu {n} proposta|propostas` | título do pedido (+ ` · bairro` quando `hoodShown`) | `Comparar` | `open-request`, valor = id |
| 3 | há avisos não lidos | `notifications` | `Você tem 1 aviso novo` / `Você tem {n} avisos novos` | texto do primeiro aviso não lido | `Ver avisos` | `notices`, valor vazio |
| — | nenhuma das três | — | — | — | — | retorna `''` |

##### Estados

- **Vazio — Serviços recomendados**: `empty("Ainda sem negócios cadastrados", "As indicações da comunidade ajudarão a formar o guia de serviços.", "storefront")` (`desktop.js:39`), sem botão.
- **Vazio — Oportunidades**: `empty("As primeiras oportunidades aparecem aqui", "Quando alguém publicar nesta cidade, você poderá consultar e entrar em contato.", "sell", readonly? '' : "create-item", readonly? '' : "Anunciar desapego")` (`desktop.js:43`).
- **Vazio — A comunidade procura**: ver bloco 12.
- **Vazio — grupos / encontro / chegada**: os blocos simplesmente não são desenhados (`desktop.js:47`, `desktop.js:56`, `desktop.js:70`); não há `empty()`.
- **Carregando / esqueleto**: nenhum nesta rota; o único esqueleto do app é o das listas paginadas (`shell/paged-list.js:35`, `.paged-skel`), que a Início não usa (os carrosséis usam `slice` fixo).
- **Erro / indisponível**: não verificado para a Início — nenhuma mensagem de erro própria; o botão `resume` é o único com fallback (`"Conteúdo anterior indisponível"`, `app/handlers.js:27`).
- **Visita a outra cidade (`readonly()`)**:
  - `<h1>` vira `"Conheça {cidade}"` e some o subtítulo de momento;
  - some "Precisa contratar?" (3), o retomar (5), a chegada (11) e "Tem um negócio?" (14) — `views.js:18,39,23,27`; `desktop.js:11,15,64`;
  - `homeDeskGroups()` retorna `''` (`desktop.js:47`) e `homeDeskNotice()` retorna `''` (`desktop.js:23`);
  - entra a faixa "Você está conhecendo …" com botão `Voltar`;
  - o plano só aparece se `state.plan[state.mode]` existir e o modo não for `readonly()` (`views.js:14` → `arriving`/`leaving` já incluem `!readonly()`), mas `plan-check` bloqueia com o diálogo `"Checklist indisponível"` (`app/handlers.js:29`);
  - os atalhos, cartões e a lista de perguntas continuam (consulta), com os CTAs `ask`/`create-item` removidos dos `empty()`;
  - o botão `#fab` fica `disabled` (`shell/navigation.js:66`).
- **Sem acesso / perfil não verificado**: `canPost()` abre `showDialog('Perfil em análise', '<p class="form-note">Publicar libera quando a equipe aprovar seu perfil. Nada foi publicado.</p>', btn('Voltar','close-dialog','','filled'), 'unverified')` (`app/state.js:62`) — vale para `ask`, `create-item`, `my-biz` etc. `plan-check` tem diálogo próprio com o texto `"Seu perfil de teste precisa estar verificado antes de salvar marcações. Nenhuma etapa foi alterada."` (`app/handlers.js:29`).
- **Somente leitura por rodada**: `#topbar` mostra `expand_more` no chip da cidade (`.city-chip`) e, abaixo de 1024 px, esse chip é escondido por CSS (`styles/nav-bar.css:12`), deixando a troca de cidade só no `<h1>`.

##### Diferenças por viewport

- **375** — `renderHome` + `styles/home-mobile.css:4` (`@media(max-width:1023px)`): carrossel horizontal com 2 cartões e meio (`home-mobile.css:24-26`), `h1` em 24/30 px (`:6`), atalhos compactos (`:11-13`), "Tem um negócio?" vira linha discreta com borda superior (`:62`). `styles/base.css:28` (`max-width:479px`) reduz `--space` para 16 px, `card-grid` a 1 coluna, `list-row` a 14 px e `panels`; `.tabs-wrap` ganha `margin-inline:-16px`. Navegação inferior em `styles/navigation.css:5` (`max-width:719px`) e título de barra "dockado" só abaixo de 720 px (`shell/navigation.js:87`).
- **768** — ainda `renderHome` com `home-mobile.css:4`, mas `styles/base.css:29` (`min-width:720px`) já aplica: trilho lateral de 96 px (`--rail`), `.intent-grid` em 4 colunas com `min-height:94px`, `.home-top` em 2 colunas (`minmax(0,1fr) minmax(220px,.56fr)`), `.page` com `padding-top:32px`. `styles/base.css:35` cobre 720–999 px. Não há CSS de Início entre 720 e 1023 px: valem as duas regras juntas.
- **1440** — `renderHomeDesktop` com `styles/home-desktop.css:3` (`min-width:1024px`): `#page:has(>.home-desk)` em `max-width:1360px`, grade `minmax(0,1fr) 320px` com coluna lateral `position:sticky; top:84px` (`:5-7`), `h1` em 32/40 px (`:11`), `.home-row` em 4 colunas com capa 16/10 (`:29-31`), cartões de lateral como `.home-card` com moldura (`:40-44`), barra em `max-width:1400px` (`:49`) e a marca "Bivaque" maior (`:58`). Em janelas baixas a lateral deixa de ser fixa (`:9`, `max-height:760px`). Entre 1024 e 1279 px (`:66-79`): lateral de 272 px, 3 cartões por linha, o 4º cartão oculto (`:73`), `h1` em 28/36 px e alertas em 1 coluna.

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Cidade e momento** — `data-action="city"` (botão da cidade no `<h1>`, `views.js:15`; e o chip da barra, `shell/navigation.js:60`).
   (mesmo overlay — ver 2.5.1)
2. **Plano completo** — `data-action="plan"` (botão `"Ver plano completo"`, `views.js:32`; e `"Ver plano completo"` na chegada do desktop, `desktop.js:68`) → `openLocalPlan(kind)` (`app/handlers.js:28,147`).
   - Título: `"Seu plano de chegada"` ou `"Seu plano de saída"`; `kind` inválido cai em `showGlobalDependency('plano-indisponivel')`.
   - Conteúdo: nota `"Checklist pessoal demonstrativo. As marcações ficam apenas neste dispositivo; nenhuma providência externa é realizada."` + `renderPlan(kind, true)` (todas as etapas).
   - Botão: `Fechar` (`close-dialog`, text).
   - Marcar/desmarcar dentro do diálogo redesenha o próprio diálogo (`app/handlers.js:29`) e avisa `"Etapa concluída neste dispositivo"` / `"Etapa reaberta neste dispositivo"`.
   - `plan-go` de dentro do diálogo fecha o overlay e despacha a ação da etapa (`app/handlers.js:30`); `destination` troca `state.city` para `state.dest` e navega para `guia` — só se `CITY_NAMES.includes(state.dest)`, senão `showGlobalDependency('plano-indisponivel')`.
3. **Avisos** (desktop, aviso pessoal) — `data-action="notices"` (`desktop.js:30`).
   (mesmo overlay — ver 2.5.1)
4. **Paleta de comandos** — a Início **não** dispara a paleta: o botão da busca usa `data-action="search"` (`views.js:17`, `desktop.js:10`) e navega para `busca`. O que a Início oferece é o **atalho anunciado** `⌘ K`/`Ctrl K` no `<kbd class="home-kbd">` (`desktop.js:10`), ligado ao listener global de `Ctrl+K`/`⌘K`/`"/"` em `shell/command-palette.js:47-54`, que só vale a partir de 1024 px (`createPanelMQ`, `command-palette.js:5`). Não encontrei nenhum `data-action` que abra a paleta. (Especificação da paleta em "Overlays transversais desta área", item 7.)
5. **"Precisa contratar?"** — `data-action="create-request"` (`views.js:18`, `desktop.js:11`) → editor de pedido de serviço (`requestAction`, fora desta área).
6. **Menu "Criar"** (mobile: FAB; desktop: painel desdobrável) — não é da Início, mas aparece sobre ela; itens e rótulos em `shell/create-menu.js:6-15` (`"Pedir indicação"`, `"Contratar serviço"` com `<span class="cp-new">Novo</span>`, `"Anunciar desapego"`, `"Anunciar imóvel"`, `"Indicar um negócio"`, `"Criar encontro"`, `"Divulgar meu negócio"`) e atalho de tecla `C` no desktop (`create-menu.js:93-97`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `city` | `home/views.js:15`; `shell/navigation.js:60` | — | abre "Cidade e momento" | `app/handlers.js:62` → `features/profile/settings.js:1` |
| `search` | `home/views.js:17`; `home/desktop.js:10` | — | zera `searchQuery` e vai para `busca` | `app/handlers.js:41` |
| `intent` | `home/views.js:17`; `home/desktop.js:10` | `biz`/`desapego`/`imovel`/`ind` | vai para negócios, catálogo ou `comunidade` (aba `ind`) | `app/handlers.js:50` |
| `create-request` | `home/views.js:18`; `home/desktop.js:11` | — | abre o editor de pedido | `features/requests/handlers.js` (`requestAction`) |
| `home-city` | `shell/navigation.js:108` (faixa de visita) | — | volta `state.city` para `homeCity` e navega para `inicio` | `app/handlers.js:68` |
| `resume` | `home/views.js:39` | `{type}|{id}` | abre anúncio/negócio/pergunta; se inválido, diálogo "Conteúdo anterior indisponível" | `app/handlers.js:27` |
| `plan-check` | `home/views.js:32` | `{kind}|{id}` | marca/reabre etapa; bloqueia em visita/perfil não verificado | `app/handlers.js:29` |
| `plan-go` | `home/views.js:32,35` | `{kind}|{id}` | despacha a ação da etapa (filtro, busca, grupos, publicar, minhas indicações, destino) | `app/handlers.js:30` |
| `plan` | `home/views.js:32`; `home/desktop.js:68` | `chegando`/`saindo` | abre o plano completo | `app/handlers.js:28,147` |
| `nav` | `home/views.js:25`; `home/desktop.js:17`; `home/desktop.js:69` | `comunidade` | vai para a Comunidade | `app/handlers.js:21` |
| `ask` | `home/views.js:25`; `home/desktop.js:17` (dentro do `empty`) | — | abre "Pedir indicação" | `app/handlers.js:129` → `features/community/editor.js:1` |
| `guide` | `home/views.js:26`; `home/desktop.js:18,67` | — | vai para `guia` | `app/handlers.js:24` |
| `my-biz` | `home/views.js:27`; `home/desktop.js:15` | — | abre a página do meu negócio ou o editor | `app/handlers.js:110` |
| `open-question` | `shell/primitives.js:24` (via `questionRow`) | id | vai para `pergunta` | `app/handlers.js:126` |
| `open-biz` | `home/desktop.js:38`, `:43` via `businessCard`/`photoCard` | id | vai para `negocio` | `app/handlers.js:108` |
| `open-item` | `home/desktop.js:43` via `photoCard` | id | vai para `anuncio` | `app/handlers.js:93` |
| `save-item` / `save-biz` | `shell/primitives.js:19-23` | id | alterna o salvo e avisa | `app/handlers.js:96,109` |
| `open-post` | `home/desktop.js:49` | `{gid}~{pid}` | zera não lidos do grupo e abre a publicação | `features/groups/handlers.js:33` |
| `attend-post` | `home/desktop.js:59` | `{gid}|{pid}` | confirma/cancela presença no encontro do grupo | `features/groups/handlers.js:36` |
| `attend-event` | `home/desktop.js:59` | id | confirma/cancela presença | `app/handlers.js:36` |
| `edit-event` | `home/desktop.js:59` | id | abre o editor do meu encontro | `app/handlers.js:34` |
| `groups` | `home/desktop.js:50` | — | abre a Comunidade na aba `grp` | `app/handlers.js:140` |
| `agenda` | `home/desktop.js:60` | — | vai para a Agenda | `app/handlers.js:25` |
| `open-event` | `home/desktop.js:60` | id | vai para `evento` | `app/handlers.js:26` |
| `notices` | `home/desktop.js:30` | — | abre "Avisos" | `features/profile/demo-actions.js:76` |
| `open-request` | `home/desktop.js:28` | id | abre o pedido | `features/requests/handlers.js` |
| `businesses` | `home/desktop.js:39` (`sectionTitle`) | — | vai para `negocios` | `app/handlers.js:58` |
| `create-item` | `home/desktop.js:43` (dentro do `empty`) | — | abre o editor de desapego | `app/handlers.js:84` |
| `list-more` | `shell/paged-list.js:14` | id da lista | acrescenta o próximo bloco | `shell/paged-list.js:46` |

---

#### 2.3.2 Rota `comunidade` — sem parâmetro

- Título na barra: "Comunidade" (`shell/navigation.js:53`)
- Aba ativa: `comunidade` (`shell/navigation.js:54`)
- De onde se chega: `nav comunidade` (menu/trilho, `shell/navigation.js:65`); `intent` com `ind` (`app/handlers.js:50`); `groups` (`app/handlers.js:140`); `Ver perguntas` da Início (`home/views.js:25`); `Ajudar quem chega` (`home/desktop.js:69`); `Abrir a comunidade` do guia (`transfers/guide.js:1`); fallback do `back()` a partir de `pergunta`, `grupo`, `publicacao`, `minhas` (`shell/navigation.js:51`); paleta → "Comunidade" (`shell/command-palette.js:5`)
- Desenhada por: `renderCommunity` em `features/community/views.js:1`; aba de grupos por `renderGroupsTab` (`features/groups/views.js:69`) → `groupsBody` (`:70-83`); cartões por `questionRow` (`shell/primitives.js:24`), `businessCard` (`:23`) e `groupRow` (`features/groups/views.js:63`)
- Parâmetro: nenhum. O estado que manda aqui é o global `communityTab` (inicial `'ind'`) e `questionFilter` (inicial `'help'`) — `app/state.js:16`; ambos restaurados pelo histórico (`shell/navigation.js:30`)

##### Conteúdo, de cima para baixo

1. **Cabeçalho** (`views.js:1`): `<h1>Comunidade</h1>` e `<p>O que a comunidade sabe fica disponível para quem chegar depois.</p>`.
   Botão à direita, só quando não `readonly()` e dependente da aba:
   - `grp` → `"Criar grupo"` (`create-group`, tonal, ícone `group_add`)
   - `ind` → `"Perguntar"` (`ask`, tonal, ícone `edit_square`)
   - `biz` → nenhum botão
2. **Faixa de visita**: `readonlyHtml()` (`views.js:1`).
3. **Abas** (`views.js:1`): `md-tabs id="community-tabs"` com três `md-primary-tab` `data-action="community-tab"`:
   `ind` = **Indicações**, `grp` = **Grupos**, `biz` = **Negócios**. O índice ativo é sincronizado por `['ind','grp','biz'].indexOf(communityTab)` (`shell/bindings.js:11`).

###### Aba `ind` — Indicações (`views.js:4-7`)

4. **Faixa de contexto**: `class="context-strip"` com `style="margin-top:0"`, ícone `history_edu`, `<b>{n} indicações resolvidas</b><br>Busque uma resposta antes de perguntar.` — `n` = `cityAsks().filter(q => q.status === 'ok').length` (`views.js:4`).
5. **Filtros**: `filterChips([['help','Para ajudar'],['ok','Resolvidas'],['mine','Minhas']], questionFilter, 'question-filter')` (`views.js:4`; `filterChips` em `features/listings/catalog.js:1` — `md-chip-set` de `md-filter-chip` com `aria-label="Filtrar por {label}"`).
   - `help` (padrão): perguntas abertas que não são minhas;
   - `ok`: `status === 'ok'`;
   - `mine`: `q.mine`.
   Ordenação (`views.js:5`): em `help`, primeiro as com menos respostas e depois as mais recentes; nas outras, por `createdAt` decrescente.
6. **Nota de ajuda** (`views.js:6`), só em `help` e com resultados: `<p class="form-note g-help-note">{icon volunteer_activism}Perguntas sem resposta aparecem primeiro. Responder leva um minuto.</p>` (o estilo `.g-help-note` está em `styles/groups.css:56`).
7. **Lista**: `pagedHtml('asks', '{cidade}|{filtro}', list, questionRow, {noun:'perguntas', art:'as', wrap:'list', end: askEndHtml()})` (`views.js:7`).
   - Cada `questionRow` (`shell/primitives.js:24`): botão `class="list-row" data-action="open-question" data-value="{id}"`, avatar (`class="avatar me"` se minha), `<b>{texto da pergunta}</b>`, `<small>{Você|autor} · {topic||city}</small>` e o **selo** dentro de `<span>` — `pill('Resolvida','ok')` quando `status === 'ok'`, senão `pill('{n} resposta|respostas')` com `n = askAnswers(q).length`, senão `pill('Sem resposta')`; fecha com `chevron_right`.
   - Rodapé da lista (`shell/paged-list.js:5-18`): `"Mostrando {n} de {total} perguntas"`, barra de progresso e botão `"Mostrar mais {min(24, restante)}"` (`list-more`); ao chegar ao fim, `"Você viu as {total} perguntas"` e o bloco `askEndHtml()`.
   - `askEndHtml()` (`shell/paged-list.js:45`), vazio em `readonly()`: `<div class="paged-end">{icon forum}<b>Não achou sua dúvida?</b><small>Pergunte: quem mora aqui responde.</small>` + botão `"Perguntar"` (`ask`, tonal).
8. **Estados vazios** (`views.js:7`): em `help`, `empty("Ninguém esperando resposta", "Você pode buscar uma indicação ou iniciar uma nova pergunta.", "forum", readonly? '' : "ask", readonly? '' : "Pedir indicação")`; nas demais abas de filtro, `empty("Nenhuma pergunta por aqui", "Você pode buscar uma indicação ou iniciar uma nova pergunta.", …)` com o mesmo botão condicional.

###### Aba `grp` — Grupos (`views.js:2` → `features/groups/views.js:69-83`)

9. **Busca**: `field('group-search','Buscar grupos',groupQuery,'type="search"')` dentro de `<div class="group-tools">`; digitar filtra ao vivo (`shell/bindings.js:10`).
10. **Com busca ativa**: `pagedHtml('group-search', …, g => groupRow(g,{cta:true}), {noun:'grupos', wrap:'list'})`; vazio: `empty("Nenhum grupo com esse nome", "Crie o grupo e convide quem tem o mesmo interesse.", "groups", readonly? '' : "create-group", readonly? '' : "Criar grupo")` (`groups/views.js:73`).
11. **Sem busca** (`groups/views.js:74-82`):
    - **"Seus grupos"** — grupos com `on` ou `pending`, com a turma automática primeiro e depois por não lidos; vazio: `empty("Você ainda não está em grupos", "Entre em um grupo sugerido ou crie o seu.", "groups")` (sem botão).
    - Faixa `class="context-strip readonly"` com ícone `interests`, `<b>Do que você quer participar?</b><br>Marque até 3 interesses para receber sugestões.` e botão `"Escolher"` (`edit-interests`), só quando o perfil não tem interesses e não é readonly (`:79`).
    - **"Sugeridos para você"** — até 4, com o motivo por `gReason` (`groups/views.js:57-62`), ex.: `"Pela sua chegada em {ciclo}"`, `"Chegam em {ciclo}. Uma indicação sua ajuda"`, `"Você marcou {interesse}"`; título ganha botão `"Interesses"` (`edit-interests`) quando já há interesses marcados.
    - **"Populares em {cidade}"** — até 5 por número de membros.
    - `groupRow` (`groups/views.js:63`): selos `Fechado` (`lock`), `Admin` (`ok`), `Aguardando aprovação`, `Encerrado`, `Automático` (`flight_land`); subtítulo com a última publicação (`"{Você|Primeiro nome}: {texto}"`, prefixo `"Oferta · "`) ou `"{membros} · aberto|fechado"`; botão `"Entrar"`/`"Pedir"` (`join-group`) quando `cta` e o grupo não é meu; badge de não lidos.

###### Aba `biz` — Negócios (`views.js:3`)

12. `pagedHtml('community-biz', state.city, cityBiz().filter(x => !isSpon(x)).sort((a,b) => b.recN - a.recN), businessCard, {noun:'negócios'})` — negócios da cidade, sem os patrocinados, ordenados por indicações; cada cartão tem selo (`Patrocinado`/`Indicado pela comunidade`/categoria), linha `"Aguardando o responsável"` ou `"{recN} indicações da comunidade"` ou `"Novo na cidade"` e botão salvar (`shell/primitives.js:23`).
13. Botão `"Ver todos os negócios"` (`businesses`, text) → `app/handlers.js:58`.

##### Estados

- **Vazio**: ver itens 8, 10 e 11.
- **Carregando / esqueleto**: só nas listas paginadas em `card-grid` — dois cartões `.paged-skel` aparecem quando o fim se aproxima (`shell/paged-list.js:32-37`), o que vale para a aba `biz`. A lista de perguntas (`wrap:'list'`) tem apenas o texto `"Carregando mais {n}…"` no rodapé (`:34`).
- **Erro / indisponível**: não verificado — nenhuma mensagem própria da rota; qualquer `data-action` não tratado cai em `showGlobalDependency` com o título `"Ação indisponível nesta rodada"` e o texto `"Este recurso não está disponível neste contexto da demonstração. Consulte os dados existentes ou retorne à página anterior."` (`app/handlers.js:151-156`).
- **Visita a outra cidade (`readonly()`)**: entra a faixa "Você está conhecendo …"; somem os botões `Perguntar`/`Criar grupo` do cabeçalho e os botões dos `empty()`; o `askEndHtml()` do fim da lista desaparece; a faixa de interesses da aba `grp` não aparece; `groupRow` deixa de oferecer `Entrar`/`Pedir` (`features/groups/views.js:66`).
- **Item removido**: perguntas com `hidden` saem de `cityAsks()` (`askVisible`, `app/state.js:37`); não há cartão de removido nesta lista.
- **Somente leitura de grupo**: grupo encerrado dentro de 30 dias ainda aparece e é legível; depois do prazo sai das listas (`groupReadable`/`groupCanReopen`, `features/groups/views.js:45-49`).

##### Diferenças por viewport

- Não encontrei media query própria das abas da Comunidade. As regras vêm de `styles/base.css:28` (`max-width:479px`: `.tabs-wrap{margin-inline:-16px}`, `list-row` 14 px, `.card-grid` 1 coluna), `:29` (`min-width:720px`: `.tabs-wrap{margin-inline:0}`, `.card-grid` 3 colunas, `--rail:96px`) e `:30` (`min-width:1200px`: `.card-grid` 4 colunas). `styles/groups.css:57` ajusta a linha de grupo em `max-width:420px`. O `md-tabs` é o componente Material (`styles/base.css:27`, regra `.tabs-wrap md-tabs`).

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **"Pedir indicação"** — `data-action="ask"` (cabeçalho, `views.js:1`; `askEndHtml`, `shell/paged-list.js:45`; `empty`, `views.js:7`) → `openAsk(state.askDraft || '')` (`app/handlers.js:129`, `features/community/editor.js:1`). (mesmo overlay — ver "Overlays transversais desta área", item 1.)
2. **Menu de criação** — `"Criar grupo"` (`create-group`) → `openGroupCreator()` (`features/groups/handlers.js:16`); pertence à área de grupos.
3. **"Interesses"** — `edit-interests` → `openInterests()` (`features/groups/handlers.js:39`).
4. **Menu ⋮ do cartão da pergunta**: listado na rota `pergunta` (é o mesmo `question-menu`).
5. **Paleta de comandos**: a Comunidade não a dispara por botão; vale o atalho global `Ctrl+K`/`⌘K`/`"/"` a partir de 1024 px (`shell/command-palette.js:47-54`). (mesmo overlay — ver "Overlays transversais desta área", item 7.)

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `community-tab` | `features/community/views.js:1` | `ind`/`grp`/`biz` | troca a aba e redesenha | `app/handlers.js:60` |
| `question-filter` | `features/community/views.js:4` | `help`/`ok`/`mine` | refiltra a lista | `app/handlers.js:61` |
| `create-group` | `features/community/views.js:1`; `features/groups/views.js:73` | — | abre o criador de grupo | `features/groups/handlers.js:16` |
| `ask` | `features/community/views.js:1,7`; `shell/paged-list.js:45` | — | abre "Pedir indicação" | `app/handlers.js:129` |
| `open-question` | `shell/primitives.js:24` | id | vai para `pergunta` | `app/handlers.js:126` |
| `list-more` | `shell/paged-list.js:14` | id da lista | carrega o próximo bloco | `shell/paged-list.js:46` |
| `open-biz` / `save-biz` | `shell/primitives.js:23` | id | abre o negócio / alterna salvo | `app/handlers.js:108,109` |
| `businesses` | `features/community/views.js:3` | — | vai para `negocios` | `app/handlers.js:58` |
| `open-group` / `join-group` | `features/groups/views.js:67` | id | abre o grupo / entra ou pede | `features/groups/handlers.js:5` |
| `edit-interests` | `features/groups/views.js:79,80` | — | abre "Interesses" | `features/groups/handlers.js:39` |
| `home-city` | `shell/navigation.js:108` | — | volta à cidade da pessoa | `app/handlers.js:68` |

---

#### 2.3.3 Rota `pergunta` — id da pergunta

- Título na barra: "Indicação" (`shell/navigation.js:53`)
- Aba ativa: `comunidade` (`shell/navigation.js:54`)
- De onde se chega: `open-question` por qualquer `questionRow` (Início, aba Indicações, sugestões da busca, `askEndHtml`, aviso pessoal do desktop, busca, notificações) — `app/handlers.js:126`; `submitAsk` após publicar (`features/community/editor.js:3`); `my-questions` vai para `minhas`, não para cá; fallback do `back()` de `pergunta` é `comunidade` (`shell/navigation.js:51`); paleta agrupada em "Perguntas" (`shell/command-palette.js:27`)
- Desenhada por: `renderQuestion` em `features/community/question.js:1`
- Parâmetro: `route.id` = `q.id` de `state.asks` (`askById`, `app/state.js:56`). Se a pergunta não for acessível (`accessibleRecord`), cai em `unavailable()`; se estiver `hidden`, cai em `removedContent('ask')`

##### Conteúdo, de cima para baixo

1. **Faixas de aviso** (`question.js:3-4`): faixa de bloqueio (`blockedStrip`, `features/profile/blocks.js:12`) quando a pergunta é de quem eu bloqueei e eu escolhi "Ver mesmo assim"; faixa `hiddenStrip` (`features/profile/hidden.js:7`) quando eu ocultei a pergunta — `"Você ocultou esta pergunta"` + botão `Mostrar` (`show-question`).
2. **Cartão da pergunta** (`article class="question"`, `question.js:4`):
   - avatar (`class="avatar me"` quando minha) com `q.ini`;
   - `<b class="small">` = nome da pessoa (meu nome quando `q.mine`, senão `q.who`);
   - `<p class="tiny muted">` = `q.ctx || q.city`, mais o sufixo do bairro próprio quando é minha (`ownHoodSuffix`, `features/profile/hood-privacy.js:9`: ` · {bairro}`, só com `prefs.showHood` e `profile.hood`), mais `" · editada"` quando `q.edited`;
   - botão de acompanhar: `follow-question`, ícone `notifications_active` (seguindo) ou `notifications_none`, `aria-label` `"Parar de seguir respostas"` / `"Seguir respostas"`;
   - se a pergunta **não** é minha: botão ⋮ `question-other-menu` com `aria-label="Opções da pergunta"`;
   - `<h1>` com o texto da pergunta;
   - linha entre: **selo** `pill('Resolvida','ok')` / `pill('{n} respostas')` / `pill('Sem resposta')` (`n = askAnswers(q).length`) e botão `share` com `data-value="pergunta|{id}"`, `aria-label="Compartilhar indicação"`.
3. **Respostas** (`question.js:5-6`): `sectionTitle("Respostas")` e um `<div class="stack">`.
   - Vazio: `empty("A comunidade ainda não respondeu", "Sua pergunta já está disponível. Você pode acompanhar as respostas por aqui.", "forum")` (sem botão).
   - Cada resposta é `article class="answer"` (com `accepted` quando `solved`): avatar, autor (ou `"Sua resposta"` no modo próprio), meta `"Sua indicação"` ou `"Membro da comunidade"` + bairro próprio + `" · editada"`; selo `pill('Ajudou a resolver','ok','check_circle')` quando `a.solved`; ⋮ `answer-menu` (minha) ou `answer-other-menu` (de outra pessoa); texto em `<p class="detail-copy">`; botão de origem do negócio (`open-biz`) quando `a.biz` existe; linha de ações:
     - se a pergunta é minha: `"Reabrir pergunta"` (`reopen-question`) ou `"Ajudou a resolver"` (`solve-question`), tonal, com `data-value="{qid}|{aid}"`;
     - senão: `` `Útil${a.helped ? ' · ' + a.helped : ''}` `` (`like-answer`, tonal quando `a.liked`, ícone `thumb_up`);
     - sempre: `"Ver origem"` (`answer-origin`, text, `history_edu`).
   - Resposta removida pela moderação: `article class="answer removed"` com `{icon report} Resposta removida pela moderação.`
4. **Compor resposta** (`question.js:7`), só quando `q.status !== 'ok'` e não `readonly()`: `<section class="question-compose"><h3>Compartilhe uma indicação</h3>` + `field('answer-input','Sua resposta','','type="textarea" rows="3" maxlength="2000"')` + botão `"Enviar indicação"` (`send-answer`, filled, `send`).
5. **Negócios relacionados** (`question.js:8`): `sectionTitle("Negócios relacionados")` + até 3 negócios achados por `matchingBiz(q.q)` (`features/search/views.js:4`), cada um com botão de texto (`open-biz`, `<b>{nome}</b><small>{categoria}[ · Patrocinado]</small>`) e `"Orçamento"` (`quote`, outlined, `request_quote`).
6. **Rodapé** (`question.js:9`): botão `"Denunciar pergunta"` (`report`, `data-value="ask|{id}"`, text, `flag`); e, quando permitido, `` `Bloquear ${q.who}` `` (`block-person`, text, `cancel`) — só se a pergunta não é minha, `blockable(q.who)` e ainda não está bloqueado.

##### Estados

- **Vazio (respostas)**: ver item 3.
- **Carregando**: não existe nesta rota.
- **Removida pela moderação**: `removedContent('ask')` = `empty("Pergunta removida", "A moderação do Bivaque removeu este conteúdo depois de denúncias.", "report", "home", "Ir para o início")` (`features/listings/detail.js:3`), quando `q.hidden` (`question.js:2`).
- **Indisponível nesta cidade**: `unavailable()` = `empty("Conteúdo indisponível nesta cidade", "Volte para a página inicial ou selecione a cidade em que o conteúdo foi publicado.", "location_off", "home", "Ir para o início")` (`detail.js:1`), quando `!accessibleRecord(q)`.
- **Conteúdo de pessoa bloqueada**: página `blockedContent` — `"Conteúdo de uma pessoa que você bloqueou"`, `"{nome} está nas suas pessoas bloqueadas."` + botão `"Ver mesmo assim"` (`peek-blocked`) (`features/profile/blocks.js:14`); depois do "Ver mesmo assim", o conteúdo abre com a faixa `"Você bloqueou {nome}"` + `"Desbloquear"` (`blocks.js:12`).
- **Ocultada por mim**: faixa `hiddenStrip` (item 1), sem impedir a leitura.
- **Visita a outra cidade (`readonly()`)**: some o ⋮ da resposta minha (`question.js:6`) e o bloco "Compartilhe uma indicação" (item 4); permanecem o seguir, o compartilhar, o `Útil`, `Ver origem`, as denúncias e os negócios relacionados. A rota não insere `readonlyHtml()` — a faixa "Você está conhecendo …" **não** aparece nesta tela; o estado de visita fica visível pelo chip/escondido no `<h1>` da Início.
- **Perfil de teste não verificado**: `send-answer` e `solve-question`/`reopen-question`/`like-answer` passam por `canPost()` (`app/handlers.js:132,135,136`) e caem no diálogo `"Perfil em análise"`.

##### Diferenças por viewport

- Não há CSS próprio da rota. Vale `styles/base.css:28` (`max-width:479px`: `md-dialog` quase cheio, `list-row` 14 px, corpo de `.answer`/`.question` sem ajuste específico) e `:29` (`min-width:720px`, `--rail:96px`, `.detail-actions` com botões de 220 px). `styles/overlays.css:9` (`max-width:719px`) faz o diálogo ocupar `100vw` — afeta os overlays abertos daqui. O ⋮ da barra no celular vem de `questionTopActions()` (`features/community/manage.js:11`), que só desenha para pergunta minha.

##### Diálogos, editores, folhas e menus abertos nesta rota

Todos passam por `manageAction` (`features/community/manage.js:44`), que só age quando `q.mine` **e** `q.city === state.homeCity` **e** `canPost()` (`manage.js:50`).

1. **Menu ⋮ "Ações da pergunta"** — `data-action="question-menu"` (⋮ do cartão, `question.js:4`) → `openCreate(el, choices, false, 'Ações da pergunta')` (`manage.js:51`):
   - `Editar pergunta` (`edit-question`, value = id)
   - `Reabrir pergunta` (`refresh`) quando `status === 'ok'`, senão `Marcar como resolvida` (`check_circle`, `toggle-question`)
   - `Compartilhar` (`share`, value = `pergunta|id`)
   - `Excluir pergunta` (`delete-question`, value = id, item `danger`)
2. **Editar pergunta** — `openTextEdit('Editar pergunta','Sua pergunta', q.q, 'save-question', q.id, 8)` (`manage.js:52`, `:12`):
   - campo `id="edit-text"`, `type="textarea" rows="4" required minlength="8" maxlength="2000"`;
   - botões `Cancelar` (text) e `Salvar` (`save-question`, filled, `check`);
   - erro (`manage.js:53`): `"Escreva uma pergunta com um pouco mais de contexto."` quando o texto tem menos de 8 caracteres ou menos de 2 termos úteis (`queryTerms(text).length < 2`); texto inalterado apenas fecha;
   - sucesso: fecha e avisa `"Pergunta atualizada."`.
3. **Marcar como resolvida / reabrir** — `toggle-question` (`manage.js:54`): muda `status` para `ok`/`open` (ao reabrir, limpa `solved` das respostas) e avisa `"Pergunta marcada como resolvida."` / `"Pergunta reaberta."`.
4. **Excluir pergunta** — `confirm('Excluir pergunta?', …, EDIT_CONFIRM)` (`manage.js:55-56`):
   - texto: `"A pergunta e a resposta saem da comunidade. Isso não pode ser desfeito."` (1 resposta) / `"A pergunta e as {n} respostas saem da comunidade. Isso não pode ser desfeito."` / `"A pergunta sai da comunidade. Isso não pode ser desfeito."` (sem respostas);
   - botões `Cancelar` / `Excluir` (danger);
   - ao aceitar (`removeQuestion`, `manage.js:33-37`): remove de `state.asks`, limpa `state.lastViewed` se apontava para ela, apaga o vínculo `alsoCity` das publicações de grupo, força `communityTab = 'ind'`, navega para `comunidade` com `replace` e avisa `"Pergunta excluída."` (`delete`).
5. **Menu ⋮ da resposta (minha)** — `answer-menu` → `openCreate(el, [['edit','Editar resposta','edit-answer','',value],['delete','Excluir resposta','delete-answer','',value,true]], false, 'Ações da resposta')` (`manage.js:61`).
6. **Editar resposta** — `openTextEdit('Editar resposta','Sua resposta', ans.t, 'save-answer', value /* "{qid}|{aid}" */, 5)` (`manage.js:62`); erro `"Escreva uma resposta com um pouco mais de contexto."` (`< 5` caracteres); sucesso avisa `"Resposta atualizada."` (`manage.js:63`).
7. **Excluir resposta** — `confirm('Excluir resposta?', "Ela sai desta pergunta. Isso não pode ser desfeito." + (" A pergunta volta a ficar sem solução." quando era a solução), EDIT_CONFIRM)` (`manage.js:65`); avisa `"Resposta excluída."` (`delete`).
8. **Menu ⋮ de conteúdo de outra pessoa** — `question-other-menu` e `answer-other-menu` → `otherMenu` (`features/profile/blocks.js:51-52`, `:40-41`), com `aria-label` `"Ações da pergunta"` e `"Ações da resposta"`:
   - pergunta de outra pessoa: `Ocultar pergunta` (`hide-question`), `Denunciar pergunta` (`report`, `ask|id`) e `` `Bloquear {nome}` `` (`block-person`);
   - resposta de outra pessoa: `Denunciar resposta` (`report`, `answer|{qid}~{aid}`) e `Bloquear {nome}`.
9. **Denunciar** — `openReport('ask', id)` (`features/profile/demo-actions.js:94`): `selectField('report-reason','Motivo',[['','Escolher motivo'],['spam','Spam ou propaganda adequada'],…])` — motivo, detalhes opcionais e botão `"Registrar denúncia"`. (mesmo overlay — ver 2.5.1.)
10. **Bloquear pessoa** — `confirm` com `` `Bloquear {nome}?` `` e botões `Bloquear`/`Cancelar` (`features/profile/blocks.js:25-28`); ao bloquear avisa `` `{nome} bloqueado.` `` com desfazer (`blocks.js:36`).
11. **Origem da indicação** — `answer-origin` (`question.js:6`): se a resposta tem `originQuestion`, navega para a outra pergunta; senão abre o diálogo `"Origem da indicação"` com o cartão da pergunta (`class="choice"`), o texto da resposta, o negócio marcado (`open-biz`) e a nota `"Relato de exemplo preservado no arquivo da cidade."` quando `q.demo || q.fromMemory` (`app/handlers.js:138`).
12. **Compartilhar** — `share` com `data-value="pergunta|{id}"` (`app/handlers.js:31` → `share` em `features/messaging/actions.js:91`; fora desta área).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `follow-question` | `features/community/question.js:4` | id | alterna seguir e avisa `"Você acompanha as respostas"` / `"Você deixou de acompanhar"` | `app/handlers.js:137` |
| `share` | `features/community/question.js:4` | `pergunta\|{id}` | compartilha a indicação | `app/handlers.js:31` |
| `send-answer` | `features/community/question.js:7` | id | publica a resposta e avisa `"Indicação enviada"`; erro `"Escreva uma resposta com um pouco mais de contexto."` | `app/handlers.js:132` |
| `solve-question` / `reopen-question` | `features/community/question.js:6` | `{qid}\|{aid}` | marca/desfaz a solução; avisa `"Resolvida. Sua experiência fica disponível para a comunidade."` / `"Pergunta reaberta"` | `app/handlers.js:135` |
| `like-answer` | `features/community/question.js:6` | `{qid}\|{aid}` | alterna `Útil · N` | `app/handlers.js:136` |
| `answer-origin` | `features/community/question.js:6,8` | `{qid}\|{aid}` | navega à pergunta de origem ou abre o diálogo | `app/handlers.js:138` |
| `open-biz` | `features/community/question.js:6,8` | id | abre o negócio | `app/handlers.js:108` |
| `quote` | `features/community/question.js:8` | id | abre conversa com o negócio | `app/handlers.js:114` |
| `report` | `features/community/question.js:9` | `ask\|{id}` | abre "Denunciar conteúdo" | `app/handlers.js:39` |
| `block-person` | `features/community/question.js:9` | nome | confirma e bloqueia | `features/profile/blocks.js:46` |
| `question-other-menu` / `answer-other-menu` | `features/community/question.js:4,6` | `{id}` / `{qid}\|{aid}` | abre o menu ⋮ de outra pessoa | `features/profile/blocks.js:51-52` |
| `question-menu` | `features/community/question.js:4`; `features/community/manage.js:11` | id | abre "Ações da pergunta" | `features/community/manage.js:51` |
| `answer-menu` | `features/community/question.js:6` | `{qid}\|{aid}` | abre "Ações da resposta" | `features/community/manage.js:61` |
| `edit-question` / `save-question` / `toggle-question` / `delete-question` | `features/community/manage.js:51-56`; `:11` (⋮ da barra) | id | editar / salvar / resolver / excluir | `features/community/manage.js:52-56` |
| `edit-answer` / `save-answer` / `delete-answer` | `features/community/manage.js:61-65` | `{qid}\|{aid}` | editar / salvar / excluir resposta | `features/community/manage.js:62-65` |
| `close-dialog` | `shell/dialogs.js:5` (ação do diálogo) | — | fecha o overlay | `app/handlers.js:80` |
| `home` | `features/community/question.js` via `empty`/`removedContent` | — | vai para a Início | `app/handlers.js:22` |

---

#### 2.3.4 Rota `busca` — sem parâmetro

- Título na barra: "Buscar" (`shell/navigation.js:53`); com `route.name === 'busca'` a barra inteira é substituída por um campo `md-filled-text-field id="search-query" class="search-input" type="search" inputmode="search" placeholder="Buscar no Bivaque" aria-label="Buscar no Bivaque"` com `autofocus`, ícone `search` (`slot="leading-icon"`) e botão de limpar (`slot="trailing-icon"`, `clear-search`, `aria-label="Limpar busca"`) — `shell/navigation.js:63-64`
- Aba ativa: não é uma aba raiz; `activeTab()` cai em `origin` (`shell/navigation.js:54`), ou seja, a Início se a pessoa veio de lá
- De onde se chega: botão de busca da Início (`home/views.js:17`, `home/desktop.js:10`) → `search` (`app/handlers.js:41`); `recent-search` e `guide-search` (`app/handlers.js:44`, também disparados pelo guia e pela paleta); sugestão global da paleta (`shell/command-palette.js:29`); `ask-from-search` fica na busca, não navega
- Desenhada por: `renderSearch` em `features/search/views.js:6`; helpers: `searchResults` (`:20`), `searchStartSections` (`:40`), `searchSuggestHtml` (`:50`), `searchRow` (`:39`), `answerSnippet` (`:8`), `askHit` (`:17`), `queryTerms` (`:2`), `matches` (`:3`), `matchingBiz` (`:4`), `searchLists` (`:5`)
- Parâmetro: nenhum. Estado: `searchQuery` (texto) e `searchType` (inicial `'all'`) — `app/state.js:16`; `state.recent` guarda até 8 buscas (`shell/bindings.js:13`), mas a tela mostra 5

##### Conteúdo, de cima para baixo

1. **Cabeçalho** (`search/views.js:6`): `<div class="page-head search-head">` com `<h1>Buscar em {cidade}</h1>` e `<p>Encontre oportunidades, negócios e respostas da comunidade.</p>`. Abaixo de 720 px este cabeçalho é escondido visualmente (`styles/search-mobile.css:20`).
2. **Filtro por tipo**: `filterChips([['all','Tudo'],['items','Anúncios'],['biz','Negócios'],['asks','Indicações'],['groups','Grupos'],['events','Encontros']], searchType, 'search-type')` (`search/views.js:6`).
3. **Resultados** em `<div id="search-results">` (`search/views.js:6`).

###### Sem texto (`searchQuery.trim()` vazio) — `searchStartSections` (`search/views.js:40-48`)

4. **"Buscas recentes"** (`:42`), só quando `state.recent` não está vazio: `sectionTitle` com botão `"Limpar"` (`clear-recent`, text) e até 5 linhas `searchRow(x,'history')`.
5. **"Explorar em {cidade}"** (`:45`): grade de `button.search-tile` `data-action="search-explore"`, em `search-tiles`:
   - grupos de serviço de `SEARCH_EXPLORE` com pelo menos um negócio, até 6 (`:37`): **Saúde** (SVG próprio), **Educação** (`school`), **Casa e reparos** (`build`), **Mudança e transporte** (`local_shipping`), **Pets** (`pets`), **Festas e comida** (`cake`), **Limpeza e jardim** (`home`) — cada um com `data-value="biz|{grupo}"` e o subtítulo `"{n} negócio|negócios"`;
   - **Imóveis** (`apartment`), `data-value="imovel"`, subtítulo `"{n} para alugar"`;
   - **Desapegos** (`chair`), `data-value="desapego"`, subtítulo `"{n} à venda"`.
6. **"Sugestões"** (`:46`), só quando sobra alguma: de `['escola','berço','mudança','mecânico']` ficam as que ainda não estão em `state.recent`; cada uma é `searchRow(x,'trending_up')`.

`searchRow` (`:39`) tem dois botões: o principal (`recent-search`, `data-value="{texto}"`, com ícone e rótulo) e a seta de completar (`search-fill`, `aria-label="Completar com {texto}"`, ícone `arrow_back` rotacionado 45° por `styles/search-mobile.css:12`).

###### Com texto — `searchResults` (`search/views.js:20-32`)

7. **Sugestões enquanto digita** (`searchSuggestHtml`, `:50-59`), só com 2+ caracteres: `section.search-sec.search-suggest[aria-label="Sugestões para a busca"]` com
   - até **2** palavras que completam o texto, tiradas do vocabulário (`recent` + `SYNONYMS` + grupos de serviço + categorias de item + bairros dos negócios), com o trecho digitado em `<b>` (`paletteMark`-like, `:55`), cada uma como `searchRow(w,'search', mark(w))`;
   - atalhos por tipo **só quando `searchType === 'all'`** (`:56`): `"{termo} em Negócios|Anúncios|Indicações"` com `<small>{n} negócio(s)|anúncio(s)|resposta(s)</small>` e `data-action="search-type"`.
8. **Contagem** (`:24`): `<p class="small muted">` = `"{n} resultado|resultados em {cidade}"` — soma dos grupos que passam pelo filtro de tipo.
9. **Blocos por tipo** (`:25-30`), na ordem de `SEARCH_TYPES` (`:19`):

| tipo | título da seção | cartão | disposição | capa em "Tudo" | `noun` |
|---|---|---|---|---|---|
| `items` | Anúncios | `photoCard` | `card-grid` | 4 | anúncios |
| `biz` | Negócios | `businessCard` | `card-grid` | 4 | negócios |
| `asks` | Indicações e respostas | `askHit` (= `questionRow` + trecho) | `list` | 5 | indicações (artigo `as`) |
| `groups` | Grupos | `groupRow` | `list` | 5 | grupos |
| `events` | Encontros | `eventRow` | `list` | 5 | encontros |

   - em **"Tudo"** cada bloco mostra os primeiros e, se houver mais, o botão `"Ver todas as {N} indicações"` / `"Ver todos os {N} {noun}"` (`search-type`, outlined, classe `search-all`, `:28`);
   - com o tipo escolhido, o bloco inteiro vem paginado por `pagedHtml('search-{tipo}', '{cidade}|{query}', …)` com o rodapé `"Mostrando N de TOTAL …"` e `"Mostrar mais 24"`; no caso de `asks`, o fim recebe `askEndHtml()` (`:27`).
   - **Trecho da resposta** (`answerSnippet`, `:8-16`): quando o termo casa no texto de uma resposta (e não só no título), o `questionRow` ganha `<small class="search-snippet">{Você|autor}: “…{trecho de ~110 caracteres}…”</small>` com elipses quando há corte. **Este `class="search-snippet"` não tem regra de estilo em `src/styles/` (grep não encontrou nenhum `.search-snippet`).**
   - `searchLists()` (`:5`) define os conjuntos: itens ativos que casam em título+descrição+bairro (quando visível); negócios por nome+categoria+serviços+especificações+bairros+palavras-chave (`matchingBiz` desconsidera `claimed === false`); perguntas por texto+assunto+texto das respostas; grupos não encerrados por título+sobre; eventos da cidade a partir de hoje por título+descrição+local.
   - `matches` (`:3`) usa termos com 2+ letras, ignora conectivos (`de, da, do, das, dos, em, no, na, para, com, um, uma, por, perto`, `:2`) e expande sinônimos de `SYNONYMS` (`:1`).
10. **Vazio** (`:23`): `empty('Nada sobre “{query}”', 'Tente termos mais simples. Se a dúvida ainda não tiver resposta, pergunte à comunidade.', 'search_off', readonly? '' : 'ask-from-search', readonly? '' : 'Pedir indicação')`.

##### Estados

- **Vazio (nada encontrado)**: item 10.
- **Sem recentes**: a seção "Buscas recentes" não é desenhada; as sugestões somem quando todas as quatro já estão no histórico.
- **Carregando**: só o esqueleto das listas paginadas (`shell/paged-list.js:32-37`), nos tipos em `card-grid` e nos blocos filtrados.
- **Erro / indisponível**: não verificado para esta rota — sem mensagem própria.
- **Visita a outra cidade (`readonly()`)**: a busca continua funcionando sobre a cidade visitada; o que muda é o botão do vazio (`ask-from-search` sai) e o `askEndHtml()` some. A rota **não** insere `readonlyHtml()`; a faixa de visita não aparece aqui.
- **Texto inalterado / limpar**: `clear-search` (`app/handlers.js:43`) — se `searchQuery` já está vazio, chama `back()`; senão esvazia o campo, redesenha os resultados e devolve o foco ao campo.

##### Diferenças por viewport

- `styles/search-mobile.css:19` (`min-width:720px`): `.search-tiles` passa de 2 para 4 colunas.
- `styles/search-mobile.css:20` (`max-width:719px`): `.search-head` é escondido (recorte 1×1) e o primeiro elemento seguinte recebe `margin-top:6px` — no celular vale só o campo de busca da barra mais os chips.
- O campo de busca da barra é global e sempre visível nesta rota (`shell/navigation.js:63-64`); o corpo `.search-mode` é alternado no `<body>`.

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **"Pedir indicação"** — `ask-from-search` (botão do vazio) → `openAsk(searchQuery.endsWith('?') ? searchQuery : 'Onde encontro ' + searchQuery + '?')` (`app/handlers.js:130`; `editor.js:1`). (mesmo overlay — ver "Overlays transversais desta área", item 1.)
2. **Paleta de comandos** — não é aberta por botão da busca; vale o atalho global (`shell/command-palette.js:47-54`). A paleta também usa `recent-search` para sua linha "Buscar “{t}” em tudo" (`command-palette.js:29`). (mesmo overlay — ver "Overlays transversais desta área", item 7.)
3. **Bloquear pessoa / denunciar** — a partir de um cartão alcançado daqui, os fluxos são os das rotas de destino (`open-question`, `open-biz`, `open-item`, `open-group`, `open-event`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `search-type` | `features/search/views.js:6` (chips); `:28` (Ver todos); `:57` (sugestões) | `all`/`items`/`biz`/`asks`/`groups`/`events` | troca o filtro e redesenha | `app/handlers.js:49` |
| `recent-search` | `features/search/views.js:39` | texto | preenche, salva recente e navega para `busca` | `app/handlers.js:44` |
| `search-fill` | `features/search/views.js:39` | texto | completa o campo sem buscar | `app/handlers.js:46` |
| `clear-recent` | `features/search/views.js:42` | — | apaga `state.recent` e avisa `"Buscas recentes apagadas"` | `app/handlers.js:47` |
| `search-explore` | `features/search/views.js:45` | `biz\|{grupo}`, `imovel`, `desapego` | vai para a tela filtrada | `app/handlers.js:48` |
| `ask-from-search` | `features/search/views.js:23` | — | abre "Pedir indicação" já com o texto da busca | `app/handlers.js:130` |
| `ask` | `shell/paged-list.js:45` (`askEndHtml`) | — | abre "Pedir indicação" | `app/handlers.js:129` |
| `clear-search` | `shell/navigation.js:64` | — | limpa o campo ou volta | `app/handlers.js:43` |
| `back` | `shell/navigation.js:64` | — | volta à tela anterior | `app/handlers.js:23` |
| `open-question` / `open-item` / `open-biz` / `open-group` / `open-event` | `shell/primitives.js:24,19,23,25` (`shell/primitives.js` e `features/groups/views.js:67`) | id | abre o destino | `app/handlers.js:126,93,108`; `features/groups/handlers.js` |
| `save-item` / `save-biz` | `shell/primitives.js:19-23` | id | alterna salvo | `app/handlers.js:96,109` |
| `list-more` | `shell/paged-list.js:14` | id da lista | próximo bloco | `shell/paged-list.js:46` |
| `attend-event` | `shell/primitives.js:25` (`eventRow`) | id | confirma presença | `app/handlers.js:36` |

---

#### 2.3.5 Rota `guia` — sem parâmetro

- Título na barra: `Guia de {cidade}` (`shell/navigation.js:53`)
- Aba ativa: `origin` (`shell/navigation.js:54`); o `back()` sem histórico cai em `inicio` (`shell/navigation.js:51`)
- De onde se chega: `guide` (`app/handlers.js:24`) disparado por: `sectionTitle` "Abrir guia" da Início (`home/views.js:26`, `home/desktop.js:18`), a linha "Organize moradia, mudança e serviços" (`home/views.js:26`, `home/desktop.js:18`), o card "Ver guia de chegada" (`home/desktop.js:67`) e a paleta "Guia da cidade" (`shell/command-palette.js:5`); e pela etapa `destination` do plano de saída (`app/handlers.js:30`), que antes troca `state.city` para `state.dest`
- Desenhada por: `renderGuide` em `features/transfers/guide.js:1`
- Parâmetro: nenhum

##### Conteúdo, de cima para baixo

1. **Cabeçalho** (`guide.js:1`): `<h1>Guia de {cidade}</h1>` e `<p>Um roteiro para organizar sua chegada e seus primeiros contatos.</p>`.
2. **Cinco `article.guide-card`** dentro de `<div class="stack">`, cada um com `<h3>` numerado, corpo e um botão:

| # | título | corpo | botão (ação, valor, ícone) |
|---|---|---|---|
| 1 | `1. Escolha a região antes do imóvel` | `Compare o trajeto para o trabalho, escola e serviços que você usa. Faça visitas em horários diferentes e confirme as condições de locação.` | `"Ver imóveis da cidade"` (`intent`, `imovel`, text, `apartment`) |
| 2 | `2. Planeje a mudança por escrito` | lista com 3 itens: `Solicite propostas com o mesmo inventário de móveis e caixas.` / `Confirme embalagem, montagem, prazos e cobertura de danos.` / `Registre contatos e condições combinadas.` | `"Encontrar serviços de mudança"` (`guide-search`, `mudança`, text, `local_shipping`) |
| 3 | `3. Resolva escola e rotina` | `Confirme a série, os turnos e a disponibilidade diretamente com as instituições. As experiências da comunidade ajudam a comparar opções.` | `"Buscar indicações de escolas"` (`guide-search`, `escola`, text, `school`) |
| 4 | `4. Monte sua rede de serviços` | `Salve os negócios que fazem sentido para você. Confira a origem das indicações e combine valor, horário e escopo antes de contratar.` | `"Ver negócios locais"` (`businesses`, vazio, text, `storefront`) |
| 5 | `5. Compartilhe o que funcionou` | `Quando uma indicação ajudar, marque a resposta que resolveu. Esse relato fica disponível para as próximas famílias.` | `"Abrir a comunidade"` (`nav`, `comunidade`, text, `forum`) |

##### Estados

- **Vazio**: não existe — o conteúdo é fixo (`guide.js:1`).
- **Carregando**: não existe.
- **Erro / indisponível**: não verificado — nenhuma mensagem própria. `data-action` não tratado cai em `showGlobalDependency` (`app/handlers.js:151`).
- **Visita a outra cidade (`readonly()`)** e **perfil não verificado**: **não há tratamento nesta tela**. `renderGuide` não chama `readonlyHtml()` nem `canPost()`; os botões do guia só navegam/buscam. O único ponto sensível é o `guide-search` → `busca`, que continua consultável em qualquer cidade. `intent` com `imovel` apenas navega para `imoveis`.
- **Sem acesso**: não se aplica.

##### Diferenças por viewport

- Não encontrei media query para o guia. A classe `.guide-card` não tem regra própria em `src/styles/` — ela aparece só em `motion/bold-transitions.js:38`, como alvo de animação de entrada. O layout é o genérico `.stack` (`styles/base.css:27`) com os tipos base de `h3`/`p`/`ul`; a `--space` e o `--rail` mudam em `styles/base.css:28` (375), `:29` (≥720) e `:30` (≥1200), e `styles/base.css:31` desliga animações com movimento reduzido.

##### Diálogos, editores, folhas e menus abertos nesta rota

Nenhum overlay próprio. Os botões só navegam (`intent`, `guide-search` → `busca`, `businesses`, `nav`). A paleta global (`Ctrl+K`/`⌘K`/`"/"`, `shell/command-palette.js:47-54`) pode ser aberta por cima. (mesmo overlay — ver "Overlays transversais desta área", item 7.)

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `intent` | `features/transfers/guide.js:1` (card 1) | `imovel` | vai para `imoveis` | `app/handlers.js:50` |
| `guide-search` | `features/transfers/guide.js:1` (cards 2 e 3) | `mudança` / `escola` | grava a busca e vai para `busca` | `app/handlers.js:44` |
| `businesses` | `features/transfers/guide.js:1` (card 4) | — | vai para `negocios` | `app/handlers.js:58` |
| `nav` | `features/transfers/guide.js:1` (card 5) | `comunidade` | vai para a Comunidade | `app/handlers.js:21` |

---

#### Overlays transversais desta área

1. **"Pedir indicação"** — `openAsk` (`features/community/editor.js:1`), disparado por `ask` (Início, Comunidade, `askEndHtml`) e `ask-from-search`. Detalhe:
   - Guarda: `if (!canPost()) return;` (`editor.js:1`) — visita e perfil não verificado não abrem.
   - Título: `"Pedir indicação"`; `kind` do diálogo: `'editor'` (`editor` global = `{kind:'ask', photos:[]}`).
   - Campo: `field('ask-input','Sua pergunta', text, 'type="textarea" rows="3" required minlength="8" maxlength="300" supporting-text="Inclua o que você precisa e o bairro, se fizer diferença."')` — o `text` inicial vem de `state.askDraft` (`app/handlers.js:129`).
   - Abaixo, `<div id="ask-similar">` preenchido por `updateSimilar()` (`editor.js:2`), que roda 160 ms após cada digitação (`shell/bindings.js:17`): com 1+ termo útil, procura até 2 perguntas resolvidas da cidade que casem em texto ou palavras-chave.
     - com resultado: `<h3 style="margin-bottom:10px">Uma resposta já pode ajudar</h3>` + a lista de `questionRow`;
     - sem resultado: `<p class="form-note">Nenhuma pergunta resolvida com esses termos. Sua pergunta pode ajudar a próxima família.</p>`.
   - Nota fixa: `Sua pergunta aparece para a comunidade de {state.homeCity}.`
   - Botões: `Cancelar` (`close-dialog`, text) e `Publicar pergunta` (`submit-ask`, filled, `send`).
   - Validações e mensagens (`submitAsk`, `editor.js:3`): `canPost()` e `validFields(['ask-input'])`; texto com menos de 8 caracteres **ou** menos de 2 termos úteis → `notify('Escreva uma pergunta com um pouco mais de contexto.','error')`.
   - Ao publicar: cria `{id:'q…', q, city: state.homeCity, who/ini do perfil, mine:true, topic: state.homeCity, ctx:'Pergunta de um membro da cidade', status:'open', when:'agora', answers:[], createdAt}` no topo de `state.asks`; fecha o diálogo, navega para `pergunta/{id}`, avisa `"Pergunta publicada"` e chama `askPushSoon('ask')` (aviso local).
   - Fechar com edição pendente: `editorDirty` dispara `confirm('Descartar alterações?','Você pode continuar editando ou descartar o que ainda não foi salvo.', …)` (`shell/dialogs.js:13`).
2. **"O que o selo “verificado” significa"** — `openVerifiedInfo` (`shell/verified-info.js:7`), disparado por `verified-info` (`app/handlers.js:52`) a partir do selo `verifiedBadgeHtml` (`shell/verified-info.js:6`). Não encontrei o selo montado em nenhuma tela desta área (a Início e a Comunidade não o desenham), então registro o overlay mas **não verifiquei onde ele aparece**.
   (mesmo overlay — ver 2.5.1)
3. **Menu de contexto de outra pessoa** — `otherMenu` (`features/profile/blocks.js:40`), aberto por `question-other-menu`/`answer-other-menu` (e pelos equivalentes de grupo). `aria-label` segue o padrão `` `Ações d${what === 'comentário' ? 'o' : 'a'} ${what}` `` — ex.: `"Ações da pergunta"`, `"Ações da resposta"`. Itens: `Ocultar pergunta` (só na pergunta), `` `Denunciar ${what}` `` e, quando `blockable(name)` e ainda não bloqueado, `` `Bloquear ${name}` ``.
4. **"Cidade e momento"** — ver rota `inicio`, overlay 1. (mesmo overlay — ver 2.5.1.)
5. **Plano completo** — ver rota `inicio`, overlay 2.
6. **"Avisos"** — ver rota `inicio`, overlay 3. (mesmo overlay — ver 2.5.1.)
7. **Paleta de comandos** — `openPalette` (`shell/command-palette.js:38`), só ≥ 1024 px e só fora de diálogo/menu (`:40,53`). Grupos: `Ações`, `Ir para`, `Buscas recentes` em vazio (`:23`); com texto: `Negócios`, `Anúncios`, `Perguntas`, `Grupos`, `Ações`, `Ir para` e `Buscar “{t}” em tudo` (`:29`). Rótulos que atravessam esta área: `Ir para` → `"Início"`, `"Comunidade"`, `"Guia da cidade"`; `Ações` → `"Pedir indicação"`, `"Criar encontro"`…; placeholder do campo `"Buscar negócios, anúncios, perguntas ou ir para…"`; vazio `"Nada encontrado."`; contador `"{n} resultado|resultados"`; rodapé `↑ ↓ navegar`, `↵ abrir`, `Esc fechar` (`:9,33-34`).
8. **Menu "Criar"** — ver rota `inicio`, overlay 6.

---

### 2.4 Grupos, publicações, agenda e encontro

#### 2.4.1 Rota `grupo` — id de grupo

- Título na barra (`titleForRoute`, shell/navigation.js:53): `"Grupo"`
- Aba ativa (`activeTab`, shell/navigation.js:54): `"comunidade"`
- De onde se chega:
  - `open-group` (app/handlers.js:141) emitido em `groupRow` — dois botões, miniatura e texto
    (features/groups/views.js:67) —, no botão "voltar ao grupo" da publicação
    (features/groups/views.js:121), na paleta de comandos (shell/command-palette.js:28) e na
    busca (`SEARCH_TYPES` `groups`, features/search/views.js:19)
  - ação `groups` → `communityTab='grp'` + `navigate('comunidade')` (app/handlers.js:140),
    emitida por "Ver grupos" (features/home/desktop.js:50), pelo contador "grupos" de Você
    (features/profile/views.js:6), pelo plano de chegada c6 (app/state.js:5 via `plan-go`,
    app/handlers.js:30) e pela página do grupo
  - `submit-group` navega para o grupo recém-criado (features/groups/handlers.js:18)
  - aviso com `go:['grupo', id]` (features/groups/handlers.js:43 → `notice-open`,
    features/profile/demo-actions.js:16/39/85)
  - cartão da entrada "Conhecer quem chega com você" (`entry-home`, valor `grupo/<id>`,
    features/entry/arrive.js:60)
  - botão "Ver grupos" do estado vazio da publicação (features/groups/views.js:117)
- Desenhada por: `renderGroup` em `features/groups/views.js:96`; helpers próprios em
  `features/groups/views.js:42` (`gById`), `:45`–`:49` (`groupClosed`, `groupReopenUntil`,
  `groupCanReopen`, `groupReadable`), `:50` (`dayMonth`), `:51` (`groupLockedNotice`),
  `:52` (`closedStrip`), `:53` (`gMembers`), `:54` (`gAgo`), `:55` (`gThumb`), `:56` (`gLast`),
  `:63` (`groupRow`), `:84` (`gPostCard`, compartilhado com `publicacao`);
  `ensureTurma` (`:35`) roda em todo `render()` (shell/navigation.js:107) e cria/religa o
  grupo automático `turma-<cidade>-<ciclo>` conforme `state.mode`
- Parâmetro: id do grupo (`g.id`), buscado em `state.groups` (`gById`, views.js:42);
  estrutura do grupo em `gDefaults` (views.js:4)

##### Conteúdo, de cima para baixo

1. **Guarda.** `gById(route.id)` ausente, ou grupo de outra cidade com `g.on` falso →
   `unavailable()` (views.js:97): `"Conteúdo indisponível nesta cidade"` /
   `"Volte para a página inicial ou selecione a cidade em que o conteúdo foi publicado."` com
   botão `"Ir para o início"` (features/listings/detail.js:1).
2. **Barra de ações** (`actionsBar`, shell/navigation.js:69) só quando não é membro, não é
   visita e o grupo não está encerrado (views.js:99): `"Cancelar pedido"` (`cancel-join`,
   outlined, `close`) se `g.pending`, senão `"Entrar no grupo"` (`join-group`, filled,
   `group_add`) em grupo aberto ou `"Pedir para entrar"` em grupo fechado.
3. **Capa** `div.detail-hero.g-hero` com `style="aspect-ratio:16/7"` (views.js:101): foto
   (`gThumb` resolve `g.img` via `ASSETS`) ou tile de ícone do modelo (`GTPL[g.tpl].ic`,
   fallback `groups`), mais `pill` com o nome do modelo (`"Vizinhança"`, `"Escola"`,
   `"Esporte"`, `"Pets"`, `"Família"`, `"Livre"`, `"Turma de chegada"`; fallback `"Grupo"`) —
   presets em features/groups/presets.js:2–10.
4. **Título** (`div.detail-title`): `h1` = `g.t`; `p.muted.small.g-meta` = ícone
   `lock`/`public` + `"Fechado"`/`"Aberto"` + `" · "` + `gMembers(g)` + `" · "` + `g.city`
   (views.js:101). `gMembers` (views.js:53) soma o próprio membro quando `g.on`
   (`g.members + 1`) e troca o rótulo por `"Grupo novo"` quando o total é menor que 10.
5. **Sobre**: `p.detail-copy` = `g.about` (views.js:101). O texto do grupo automático é
   `"Quem chega a {cidade} entre novembro de {ciclo-1} e outubro de {ciclo}. Mudança, escola,
   moradia e o primeiro encontro."` (views.js:5).
6. **Ações de membro** (`div.g-actions`, views.js:102), só quando `g.on`:
   - `"Participando · {rótulo do nível de aviso}"` → `group-menu`, tonal, ícone
     `expand_more`, com `aria-haspopup="menu"` injetado por `.replace`
   - `"Convidar"` → `invite-group`, outlined, ícone `share` (oculto quando encerrado)
   - `"Gerenciar"` → `manage-group`, outlined, ícone `admin_panel_settings` (só `role==='admin'`)
7. **Regras** como `<details class="g-rules">` com `summary` `"Regras do grupo"` (ícone
   `gavel`) e `p.small` = `g.rules` (views.js:103).
8. **Portão de grupo fechado** (views.js:104): sem acesso (`g.privacy==='fechado'` e não
   membro) → faixa `div.context-strip.readonly` com ícone `lock`, `"Grupo fechado"` e
   `"As publicações aparecem para quem for aprovado pelo admin."`, e a função retorna.
9. **Grupo encerrado** (views.js:105): `closedStrip(g)` (views.js:52) renderiza
   `div.context-strip.readonly.g-closed` com `role="status"`, ícone `lock`,
   `"Grupo encerrado em {dd/mm}."` e, dentro do prazo, `"As publicações ficam disponíveis para
   leitura até {dd/mm}."`; depois do prazo, `"As publicações deixaram de estar disponíveis
   desde {dd/mm}."`. Fora do prazo a função retorna aqui (nada abaixo da capa/título aparece).
   Constantes: `GROUP_CLOSE_DAYS=30` (views.js:44) e
   `GROUP_CLOSED_NOTE='Este grupo foi encerrado. As publicações estão só para leitura.'`
   (views.js:44).
10. **Aviso fixado** (views.js:106): `div.context-strip.g-pinned` com `push_pin`, `"Aviso
    fixado"` e `g.pinned`.
11. **Próximo encontro** (views.js:107–108): quando `groupFilter==='all'` e existe publicação
    de evento com `event.date >= hoje`, a mais próxima vira `sectionTitle("Próximo encontro")`
    + `gPostCard(g,ev)`.
12. **Barra de composição** (views.js:109), só membro, não visita, não encerrado:
    `button.g-compose[data-action=new-post]` com avatar `me`, `"Escreva para o grupo…"` e
    ícone `photo_camera`.
13. **Filtro** `filterChips([['all','Tudo'],['question','Perguntas'],['event','Eventos']],
    groupFilter, 'group-filter')` (views.js:110; helper em features/listings/catalog.js:1).
14. **Feed**: `groupPosts(g)` (app/state.js:51) filtrado pelo chip (`all` exclui o post que já
    apareceu como "Próximo encontro") e ordenado por `at` desc, em `pagedHtml` com
    `{noun:'publicações', art:'as', wrap:'stack', size:10}` — 10 por bloco, sem esqueleto
    (features/groups/views.js:111–112; shell/paged-list.js:7).
    `groupPosts` esconde autor bloqueado, esconde `type==='offer'` quando
    `!g.allowOffers` ou a página do negócio não está viva, e devolve `[]` se o grupo não é
    legível (app/state.js:49–51).

##### `gPostCard` — o cartão de publicação (views.js:84–95)

Compartilhado por `grupo` e `publicacao` (`full=false/true`).

- `p.hidden` → `article.gpost.removed` com `"Publicação removida pela moderação."` (views.js:85).
- Cabeçalho: avatar (iniciais do autor; `class="me"` e nome `state.profile.name` quando
  `p.mine`), `b.small` com o nome, `p.tiny.muted` = `gAgo(p.at)` + `ownHoodSuffix(p.mine)`
  (features/profile/hood-privacy.js:9) + `" · editada"` quando `p.edited` (views.js:87).
  `gAgo` (views.js:54): `"há N min"`, `"há N h"`, `"ontem"`, `"há N dias"`.
- Rótulos de tipo: `Pergunta`(`help`), `Evento`(`event`), `Enquete`(`ballot`),
  `Oferta`(`sell`, com classe `ad`); `Resolvida`(`ok`, `check_circle`) quando `p.resolved`
  (views.js:86–87).
- ⋮ (views.js:87): para `p.mine` sob visita ou grupo encerrado **não existe**; para `p.mine`
  livre → `post-menu` (`"Opções da publicação"`); para publicação de outra pessoa →
  `post-other-menu`.
- Texto: `p.detail-copy.gpost-text` = `p.text` (views.js:88).
- Bloco de evento (views.js:89): mês abreviado maiúsculo + dia, `p.event.place`,
  `"{time} · {going + (on?1:0)} confirmados"` e botão `"Vou"`/`"Confirmado"`
  (`attend-post`, tonal+`check` quando confirmado), oculto quando o grupo está encerrado.
- Enquete (views.js:90): uma `button.poll-opt` por opção com `poll-bar` proporcional; total
  `soma + (voted != null ? 1 : 0)`; mostra `"{pct}%"` só depois do voto; rodapé
  `"Toque para votar"` / `"{tot} votos"` / `"Votação encerrada"` (encerrado). Com voto dado
  ou grupo encerrado, o botão perde `data-action` e ganha `aria-disabled="true"`.
- Oferta com negócio identificável (views.js:91): `button.answer-origin[data-action=open-biz]`
  com `storefront` + nome do negócio.
- Pergunta replicada à cidade (views.js:92): `button.tiny-link[data-action=open-question]`
  com `travel_explore` e texto `"Também perguntada à cidade · ver em Indicações"`.
- Ações (`full=false`, views.js:93), ocultas quando encerrado: `"Útil"` opcionalmente com
  `" · N"` (`like-post`, tonal quando `p.liked`, ícone `thumb_up`) e
  `"{N} comentário(s)"`/`"Comentar"` (`open-post`, valor `"{gid}~{pid}"`, ícone `chat_bubble`).
  `N` vem de `postComments(p)` (app/state.js:52: exclui ocultos e bloqueados).

##### Estados

- **Indisponível** (outra cidade / grupo inexistente): ver item 1.
- **Grupo fechado sem acesso**: faixa "Grupo fechado" (views.js:104) — capa, título, sobre e
  regras continuam visíveis; nada de publicações.
- **Grupo encerrado (dentro de 30 dias)**: `closedStrip` + leitura; sem convite, sem
  composição, sem "Útil", sem voto, sem presença, sem ⋮ (views.js:102/105/109/89/90/93).
  Depois de 30 dias: só capa, título, sobre e regras (retorno em views.js:105).
- **Sem publicações**: membro → `"Comece uma conversa útil"` /
  `"Publique um aviso, uma pergunta, um evento ou uma enquete."` com botão `"Escrever"`
  (`new-post-empty`); não membro → `"Ainda sem publicações"` /
  `"Entre no grupo para participar."` (views.js:112).
- **Visita a outra cidade** (`readonly()`, app/state.js:58): sem CTA de entrar (views.js:99),
  sem barra de composição (views.js:109), sem ⋮ na própria publicação (views.js:87). O botão
  `"Útil"` **continua ativo** (views.js:93 só checa `groupClosed`) e `like-post`
  (handlers.js:34) não consulta `readonly()` — comportamento observável, não bloqueio.
- **Perfil de teste não verificado**: entrar no grupo passa por `canPost()`
  (app/state.js:59) → `"Perfil em análise"` /
  `"Publicar libera quando a equipe aprovar seu perfil. Nada foi publicado."` com botão
  `"Voltar"` (app/state.js:62).
- **Não existe estado de carregamento/esqueleto** nesta rota.

##### Diferenças por viewport

- **375** (regras ≤420 px em styles/groups.css:57): `.g-row{padding:14px 12px}` e a miniatura
  `.list-photo` cai para 56×56. Em ≤479 px (styles/base.css:28): `.list-row{padding:14px}`,
  `.detail-title h1{font-size:25px}`, `.context-strip{font-size:13px}`,
  `.facts{gap:6px}`/`.fact{padding:10px}` (usado no `evento`), botão do `page-head` com
  `font-size:13px` e `padding:0 12px`. A barra superior vira "voltar + título" e a navegação
  inferior some nas rotas de detalhe (shell/navigation.js:91–96).
- **768**: está dentro da faixa `min-width:720px` (styles/base.css:29) — nada específico de
  768 px em `styles/groups.css` ou `styles/overlays.css`. Valem: `md-dialog.form-dialog` com
  `width:min(600px,100vw)` e ancorado embaixo (styles/overlays.css:2, acima de 719 px deixa de
  ser fullscreen por styles/overlays.css:9), `.detail-hero{max-height:480px}` e
  `.detail-actions-in{justify-content:flex-end}` com botões de ação `min-width:220px`
  (styles/base.css:29) — a barra "Entrar no grupo / Pedir para entrar" vira dois botões largos
  alinhados à direita.
- **1440**: mesmas regras de ≥720 px; `min-width:1200px` (styles/base.css:30) só mexe em
  `.card-grid`/`carousel` (não usados aqui — o feed usa `wrap:'stack'`) e no
  `padding-top` da página. Arrastar a folha para fechar (`bindSheetDrag`) só existe abaixo de
  720 px (shell/dialogs.js:33).
- `prefers-reduced-motion`: animação da página e transições desligadas
  (styles/overlays.css:22, styles/base.css:31).

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Menu de ações do grupo** (`group-menu` → `openCreate(el, …, false, 'Ações do grupo')`,
   features/groups/handlers.js:8). Menu de contexto (não folha): três itens de nível de aviso
   — `"Avisos: Tudo"`, `"Avisos: Destaques (padrão)"`, `"Avisos: Nada"`, cada um com a
   descrição de `NOTIF` (features/groups/presets.js:12:
   `"Toda publicação do grupo"`, `"Respostas a você, eventos e aviso fixado"`,
   `"As publicações aparecem só na Início"`), ação `notif-level` com valor `"{gid}|{chave}"`
   (ícone `check` no nível atual) — e `"Sair do grupo"` (`leave-group`, subtítulo
   `"Suas publicações continuam no grupo"`).
2. **Criar grupo** (`create-group` → `openGroupCreator`, features/groups/editors.js:22–28).
   Exige `canPost()`. Campos:
   `group-name` `"Nome do grupo"` (`required minlength="3" maxlength="60"`,
   `supporting-text="Ex.: Moradores do Residencial X, Pais da Escola Y"`);
   `group-about` `"Sobre o grupo"` (textarea rows 2, `maxlength="300"`);
   capacitador `"Modelo"` com chips de todos os `GTPL` exceto `turma` (`group-tpl`);
   capacitador `"Privacidade"` com radios `gprivacy`: `"Aberto"` —
   `"Qualquer membro de {cidade} entra com um toque e vê as publicações."` — e `"Fechado"` —
   `"Quem quiser entrar pede, e você aprova. Só membros veem as publicações."`;
   `group-rules` `"Regras do grupo"` (textarea rows 3, `maxlength="600"`);
   `form-note` `"Quem cria administra o grupo e pode nomear moderadores. Todos os membros do
   Bivaque são verificados."`. Botões `"Cancelar"` e `"Criar grupo"` (`submit-group`).
   Trocar de modelo troca as regras só se elas ainda não foram editadas (editors.js:24).
3. **Gerenciar** (`manage-group` → `openManage`, features/groups/editors.js:30–34; só
   `role==='admin'`). Blocos: `"Pedidos de entrada"` (só em grupo fechado e não encerrado) com
   avatar, nome, `r.note` (fallback `"Membro verificado"`), botão `"Aprovar"`
   (`approve-req`, valor `"{gid}|{índice}"`) e ícone-botão `close` (`deny-req`,
   `"Recusar pedido"`), vazio `"Nenhum pedido agora."`; `"Moderadores"` em pills
   (`shield_person`) ou `"Nenhum moderador."` + select `mod-add` `"Nomear moderador"`
   (`"Escolher membro"` + 4 nomes fixos: `Paulo R.`, `Diego F.`, `Marcos T.`, `Luana M.`) com
   botão `"Nomear"` (`add-mod`); select `manage-privacy` `"Privacidade"`; `manage-pinned`
   `"Aviso fixado"` (textarea rows 2, `maxlength="300"`); `manage-rules` `"Regras"`
   (textarea rows 3, `maxlength="600"`); switch `manage-offers` `"Permitir Oferta de negócio de
   membro"` com `"Uma por semana, sempre com o rótulo Oferta. Patrocinado nunca aparece no
   grupo."`; `closeSection` (editors.js:36–39) — `"Encerrar"` em cor de erro + botão
   `"Encerrar o grupo"` (`close-group`, texto perigoso) + `"As publicações ficam só para
   leitura por 30 dias."`, ou, já encerrado, `"Encerrado em {dd/mm}. As publicações ficam
   disponíveis para leitura até {dd/mm}."` + `"Reabrir o grupo"` (`reopen-group`) ou
   `"O prazo para reabrir já passou."`. Título `"Gerenciar {grupo}"`, botões `"Fechar"` e
   `"Salvar"` (`save-manage`).
4. **Publicar** (`new-post`, `new-post-empty`, `post-type` → `openPostEditor`,
   features/groups/editors.js:6–20) — detalhado abaixo.
5. **Interesses** (`edit-interests` → `openInterests`, editors.js:41; `interest-toggle`).
   Título `"Do que você quer participar?"`, `form-note`
   `"Marque até 3. Usamos isso só para sugerir grupos."`, chips de `INTERESTS`
   (presets.js:11: Filhos pequenos, Pets, Corrida, Ciclismo, Concursos e preparatórios,
   Culinária, Futebol, Fé), contador `"{n}/3 escolhidos. Você pode mudar depois em
   Comunidade › Grupos."`, botões `"Cancelar"` e `"Salvar"` (`save-interests`).
6. **Confirmações** (`confirm`, shell/dialogs.js:20): `"Sair do grupo?"` —
   `"Suas publicações continuam no grupo. Você pode entrar de novo quando quiser."`
   (handlers.js:10); `"Encerrar o grupo?"` — `"Ninguém publica, comenta, vota nem cria
   encontro. As publicações ficam só para leitura por 30 dias."` com `ok:'Encerrar'` e
   `danger` (handlers.js:45); exclusões de publicação/comentário em
   features/community/manage.js:77–78/87.
7. **⋮ de publicação/comentário de terceiros** (`post-other-menu`, `comment-other-menu` →
   `otherMenu`, features/profile/blocks.js:40–41): `"Denunciar publicação"` /
   `"Denunciar comentário"` / `"Denunciar resposta"` (`report`, valor `post|{gid}~{pid}` ou
   `comment|{gid}~{pid}~{cid}`) e `"Bloquear {nome}"` quando o nome é bloqueável
   (blocks.js:41). (mesmo overlay — ver 2.3, "Overlays transversais desta área", item 3.)

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `join-group` | features/groups/views.js:66 (cartão), :99 (barra), :124 (faixa) | `g.id` | fechado → `"Pedido enviado. O moderador do grupo vai avaliar."` + pill `"Aguardando aprovação"`; aberto → `"Você entrou no grupo. Avisos: Destaques"` | features/groups/handlers.js:5 |
| `cancel-join` | features/groups/views.js:99 | `g.id` | `"Pedido cancelado."`; sem pedido pendente → `"Este pedido não está mais pendente."` | handlers.js:44 |
| `group-menu` | features/groups/views.js:102 | `g.id` | abre menu de avisos + sair | handlers.js:8 |
| `notif-level` | handlers.js:8 | `gid\|chave` | `"Avisos do grupo: {rótulo}"` + ícone do nível | handlers.js:9 |
| `leave-group` | handlers.js:8 | `g.id` | confirma; admin sem moderador → `"Nomeie um moderador antes de sair. Ele assume o grupo."`; senão `"Você saiu do grupo"` | handlers.js:10 |
| `invite-group` | features/groups/views.js:102 | `g.id` | abre `https://wa.me/?text=` com `Entre no grupo "{g.t}" no Bivaque: {link}` | handlers.js:11 |
| `manage-group` | features/groups/views.js:102 | `g.id` | abre Gerenciar | handlers.js:12 |
| `approve-req` / `deny-req` | editors.js:32 | `gid\|índice` | `"{nome} agora faz parte do grupo"` / `"Pedido recusado"`, redesenha o Gerenciar | handlers.js:13 |
| `add-mod` | editors.js:32 | `g.id` | pill do moderador; sem seleção → `"Escolha um membro."` | handlers.js:14 |
| `save-manage` | editors.js:33 | `g.id` | grava aviso fixado, regras, ofertas e privacidade; `"Grupo atualizado"` | handlers.js:15 |
| `create-group` | features/community/views.js:1, views.js:73 | — | abre Criar grupo | handlers.js:16 |
| `group-tpl` | editors.js:26 | chave do modelo | troca o modelo (e as regras, se intocadas) | handlers.js:17 |
| `submit-group` | editors.js:27 | — | `<3` letras → `"Dê um nome ao grupo, com pelo menos 3 letras."`; nome repetido → `"Já existe um grupo com esse nome. Busque e entre nele."`; ok → navega ao grupo + `"Grupo criado. Convide as primeiras pessoas pelo WhatsApp."` | handlers.js:18 |
| `new-post` / `new-post-empty` | views.js:109 / :112 | `g.id` / — | abre editor de publicação | handlers.js:19 |
| `group-filter` | views.js:110 | `all\|question\|event` | troca o filtro e redesenha | handlers.js:32 |
| `post-type` | editors.js:11 | tipo | troca o tipo do rascunho | handlers.js:20 |
| `submit-post` | editors.js:18 | `g.id` | valida e publica; ver mensagens no quadro final | handlers.js:21 |
| `like-post` | views.js:93, :121 | `gid\|pid` | liga/desliga "Útil"; só o cartão é trocado (`patchPostCard`, shell/in-place.js:21) | handlers.js:34 |
| `vote-poll` | views.js:90 | `gid\|pid\|índice` | `"Voto registrado"`; repetido → `"Seu voto nesta enquete já foi registrado."`; não membro → `"Entre no grupo para votar."` | handlers.js:35 |
| `attend-post` | views.js:89 | `gid\|pid` | `"Presença confirmada"` / `"Presença cancelada"`; não membro → `"Entre no grupo para confirmar presença."` | handlers.js:36 |
| `send-comment` | views.js:123 | `gid\|pid` | `"Comentário publicado"` (ou `"… {negócio} ganhou uma indicação"`); `<3` caracteres → `"Escreva pelo menos 3 caracteres."` | handlers.js:37 |
| `solve-comment` | views.js:122 | `gid\|pid\|cid` | `"Marcada como resolvida. Obrigado por fechar o ciclo"`, cartão ganha `Resolvida` | handlers.js:38 |
| `edit-interests` | views.js:79, :80 | — | abre Interesses | handlers.js:39 |
| `interest-toggle` | editors.js:40 | chave | marca/desmarca; no 4º → `"Escolha até 3 interesses."` | handlers.js:40 |
| `save-interests` | editors.js:41 | — | grava, volta para a aba Grupos, `"Sugestões de grupos atualizadas"` | handlers.js:41 |
| `close-group` | editors.js:38 | `g.id` | confirma e encerra: `"Grupo encerrado. As publicações ficam para leitura até {dd/mm}."` | handlers.js:45 + `closeGroup` handlers.js:2 |
| `reopen-group` | editors.js:37 | `g.id` | `"Grupo reaberto. Publicações, comentários, votos e encontros voltam a funcionar."`; fora do prazo → `"O prazo para reabrir este grupo já passou."` | handlers.js:46 |
| `open-group` | views.js:67 (×2), :121 | `g.id` | navega para a rota `grupo` | app/handlers.js:141 |
| `open-post` | views.js:93, features/home/desktop.js:49, features/owner/review.js:13–14 | `gid~pid` | zera `unread` do grupo e navega para `publicacao` | features/groups/handlers.js:33 |
| `open-biz` | views.js:91 | id do negócio | abre a página do negócio | app/handlers.js:108 |
| `open-question` | views.js:92 | id da pergunta | abre a Indicação gerada pela pergunta replicada | app/handlers.js:126 |
| `post-menu` | views.js:87 | `gid\|pid` | menu `Editar publicação`/`Excluir…` (ou `Editar encontro`/`Cancelar encontro`) | features/community/manage.js:73 |
| `post-other-menu` | views.js:87 | `gid\|pid` | `Denunciar publicação` + `Bloquear {autor}` | features/profile/blocks.js:54 |
| `comment-menu` | views.js:122 | `gid\|pid\|cid` | menu `Editar/Excluir resposta\|comentário` | features/community/manage.js:84 |
| `comment-other-menu` | views.js:122 | `gid\|pid\|cid` | `Denunciar resposta\|comentário` + `Bloquear {autor}` | features/profile/blocks.js:56 |
| `simulate-moderation` | features/profile/settings.js:6 (`"Simular decisão do moderador"`) | — | abre `openModeration` | handlers.js:42 |
| `noop` | — nenhuma emissão nesta área | — | não faz nada | handlers.js:47 |
| `close-dialog`, `cancel-confirm`, `accept-confirm`, `undo`, `nav`, `back`, `home`, `city`, `search`, `create` | várias (primitivas) | — | fecham overlay / navegam | app/handlers.js:21–23, 62, 80–83, 143 |

---

#### 2.4.2 Rota `publicacao` — id de publicação, formato `gid~pid`

- Título na barra: `"Publicação"` (shell/navigation.js:53)
- Aba ativa: `"comunidade"` (navigation.js:54)
- De onde se chega: `open-post` — cartão de publicação (views.js:93), "Nos seus grupos" da
  Início (features/home/desktop.js:49), avaliação do dono
  (features/owner/review.js:13–14, `"Abrir a publicação"`), avisos com
  `NOTICE_ICONS.publicacao` (features/profile/demo-actions.js:27)
- Desenhada por: `renderPost` em `features/groups/views.js:115`; reusa `gPostCard` (:84),
  `blockedGate` (features/profile/blocks.js:16) e `removedContent`
  (features/listings/detail.js:3)
- Parâmetro: `route.id` dividido em `gid~pid` (views.js:116) — grupo em `state.groups` e
  publicação dentro de `g.posts`

##### Conteúdo, de cima para baixo

1. **Guardas** (views.js:116–119): grupo/publicação inexistente, grupo fechado sem adesão ou
   grupo encerrado fora do prazo → `unavailable()`; publicação apagada →
   `empty('Esta publicação foi excluída.','Quem publicou apagou o conteúdo. O resto do grupo
   continua disponível.','delete','groups','Ver grupos')`; oferta cujo negócio não está vivo
   (ou grupo sem `allowOffers`) → `unavailable()`; `p.hidden` → `removedContent('post')` =
   `empty('Publicação removida','A moderação do Bivaque removeu este conteúdo depois de
   denúncias.','report','home','Ir para o início')`.
2. **Portão de bloqueio** (views.js:120): `blockedGate('post', '{gid}~{pid}', p.author, p.mine)`
   devolve página bloqueada ou faixa; comentários de quem a pessoa bloqueou são removidos da
   lista (`shown`, mesma linha).
3. **Botão de volta** `button.g-back[data-action=open-group]` (views.js:121): miniatura
   `g-mini`, nome do grupo, `gMembers(g)` e `chevron_right`.
4. **Cartão completo** `gPostCard(g,p,true)` — sem a linha de ações — seguido de
   `div.gpost-actions` com apenas `"Útil"` (views.js:121).
5. **Comentários** (views.js:122): `sectionTitle` = `"{N} comentário(s)"` ou `"Comentários"`;
   cada `article.answer` (classe `accepted` quando `c.solved`) traz avatar, nome,
   `gAgo + ownHoodSuffix + " · editado"`, pill `"Resolveu"` (ícone `check_circle`), ⋮
   `comment-menu`/`comment-other-menu`, texto, botão de origem do negócio quando `c.biz`
   existe, e — só em pergunta própria, ainda não resolvida, com comentário de outra pessoa e
   grupo aberto — botão `"Resolveu"` (`solve-comment`). Comentário oculto vira
   `"Resposta removida pela moderação."` ou `"Comentário removido pela moderação."` conforme
   o tipo. Sem comentários visíveis: `"Seja o primeiro a comentar."`.
6. **Compor** (views.js:123), só membro, não visita, não encerrado:
   `section.question-compose` com `h3` `"Responder"`/`"Comentar"`, campo `comment-input`
   (`"Sua resposta"`/`"Seu comentário"`, textarea rows 3, `maxlength="2000"`); em pergunta,
   select `comment-biz` `"Marcar um negócio (opcional)"` com `"Nenhum"` + `cityBiz()` e nota
   `"O negócio marcado ganha uma indicação. O texto fica só no grupo."`; botão
   `"Responder"`/`"Comentar"` (`send-comment`, valor `"{gid}|{pid}"`).
7. **Sem adesão** (views.js:124): faixa `context-strip.readonly` com `group_add`,
   `"Entre no grupo para comentar."` e botão `"Entrar"`/`"Pedir"` (`join-group`) quando a
   cidade é a própria e o grupo não está encerrado.

##### Estados

- **Vazio / excluído / removido**: ver item 1.
- **Visita a outra cidade**: `readonly()` remove a caixa de composição **e** a faixa "Entre no
  grupo para comentar." (o `else if(!g.on)` da views.js:124 não cobre o caso) — a publicação
  fica somente leitura sem aviso; `"Útil"` continua ativo.
- **Grupo encerrado**: sem `"Útil"`, sem ⋮, sem composição; em grupo encerrado fora do prazo a
  rota nem abre (views.js:116).
- **Bloqueio**: `blockedGate` (features/profile/blocks.js:16) pode substituir a página inteira
  ou só inserir faixa quando o conteúdo já foi espiado.
- Carregando/erro de rede: não existem nesta rota.

##### Diferenças por viewport

Idênticas às da rota `grupo` (é a mesma família de estilos: `.g-back`/`.g-mini` em
styles/groups.css:47–49; `.answer`/`.question-compose` em styles/base.css). Nada específico de
768 px.

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Editar publicação** (`post-menu` → `Editar {publicação|pergunta|enquete|encontro}` →
   `edit-post` → `openPostEdit`, features/community/manage.js:14–20). Campos: `edit-text`
   (rótulo conforme o tipo — `"O que você quer compartilhar?"`, `"O que você quer perguntar?"`,
   `"Nome do evento"`, `"Pergunta da enquete"`; `maxlength="120"` em evento, senão textarea
   rows 4 `maxlength="2000"`); em evento, `edit-date`, `edit-time` e `edit-place`
   (`"Local (público)"`, `maxlength="120"`) + nota
   `"Se a data, o horário ou o local mudarem, a pessoa que confirmou será avisada."`
   (plural conforme `p.event.going`); em enquete sem votos, `edit-opt-0`…`edit-opt-3`
   (`"Opção N (opcional)"`, `maxlength="60"`), com votos a pergunta é somente leitura e
   aparece `"Esta enquete já tem votos. Só o texto da pergunta muda; as opções ficam como
   estão."`. Título `"Editar publicação|pergunta|enquete|encontro"`; botões `"Cancelar"` e
   `"Salvar"` (`save-post`).
2. **Excluir** (`delete-post`): confirmação com texto por tipo — em evento
   `"Cancelar encontro?"` / `"O encontro sai do grupo.{aviso de convidados}"`; nos outros,
   `"Excluir {enquete|pergunta|publicação}?"` /
   `"A {enquete|pergunta|publicação} e {N comentário(s)} saem do grupo."` (+
   `" A pergunta enviada à cidade continua em Indicações."`) + `"Isso não pode ser desfeito."`
   (manage.js:77–78). Resultado: `"Encontro cancelado.{…}"`, `"Enquete excluída."`,
   `"Pergunta excluída."` ou `"Publicação excluída."`; em `publicacao` a rota volta para o
   grupo (manage.js:41).
3. **Menu da publicação** (`post-menu`, manage.js:73) e **da resposta/comentário**
   (`comment-menu`, manage.js:84): `Editar …` / `Excluir …`, mais
   `Denunciar …` e `Bloquear {autor}` no caminho de terceiros.
4. **Editar resposta/comentário** (`openTextEdit`, manage.js:12): campo `edit-text` com o
   rótulo `"Sua resposta"`/`"Seu comentário"`, textarea rows 4, `required minlength="3"
   maxlength="2000"`.

##### Ações desta rota

| ação | onde aparece | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `open-group` | views.js:121 | `g.id` | volta ao grupo | app/handlers.js:141 |
| `like-post` | views.js:121 | `gid\|pid` | alterna "Útil" | features/groups/handlers.js:34 |
| `send-comment` | views.js:123 | `gid\|pid` | ver quadro da rota `grupo` | handlers.js:37 |
| `solve-comment` | views.js:122 | `gid\|pid\|cid` | marca resolvida | handlers.js:38 |
| `join-group` | views.js:124 | `g.id` | entra/pede no grupo | handlers.js:5 |
| `comment-menu` / `comment-other-menu` | views.js:122 | `gid\|pid\|cid` | menu de editar/excluir ou denunciar/bloquear | manage.js:84 / blocks.js:56 |
| `post-menu` / `post-other-menu` | views.js:87 (via `gPostCard`) | `gid\|pid` | ver tabela acima | manage.js:73 / blocks.js:54 |
| `open-biz`, `open-question`, `report`, `block-person` | views.js:91–92 / blocks.js:41 | — | abrem página, indicação, denúncia ou bloqueio | app/handlers.js:108/126/39–40 |

---

#### 2.4.3 Rota `agenda` — [sem parâmetro]

- Título na barra: `"Agenda da cidade"` (shell/navigation.js:53)
- Aba ativa: `activeTab()` devolve `origin` (shell/navigation.js:54) — `agenda` não está em
  nenhuma das listas, então a aba marcada é a de onde se veio
- De onde se chega: ação `agenda` (app/handlers.js:25) — paleta de comandos
  (`PALETTE_PAGES`, `"Agenda da cidade"`, shell/command-palette.js:5), `sectionTitle("Próximo
  encontro", "Agenda", "agenda")` na Início (features/home/desktop.js:60), botão
  `"Consultar Agenda"` do diálogo de dependência (app/handlers.js:155), botão `agenda-filter`
  do estado vazio (events/views.js:14) e avisos com `NOTICE_ICONS.agenda`
- Desenhada por: `renderAgenda` em `features/events/views.js:7`; helpers `agendaDay` (:6),
  `eventModes` (:5), `eventRow` (shell/primitives.js:25), `filterChips`
  (features/listings/catalog.js:1)
- Parâmetro: nenhum (`route.id` não é lido)

##### Conteúdo, de cima para baixo

1. **Base** (events/views.js:8): `state.events` filtrado por `e.city === state.city` e
   `e.date >= dateISO()` (encontros passados **não aparecem**), ordenado por data e depois por
   horário.
2. **Filtro por público**: `agendaFilter` (events/views.js:2) com
   `AGENDA_AUDIENCE = [['all','Todos'],['chegando','Para quem chega'],['moro','Para quem
   mora'],['saindo','Para quem sai']]` (events/views.js:3). `eventModes(e)` devolve
   `e.modes` quando existe, senão `['chegando','moro','saindo']` (events/views.js:5) — ou
   seja, encontro criado pela pessoa já nasce valendo para todos. Se o filtro atual ficar sem
   resultado, volta para `'all'` (events/views.js:10).
3. **Cabeçalho** `div.page-head`: `h1` `"Agenda da cidade"`, `p`
   `"Encontros da comunidade de {cidade}."` e, fora de visita, botão `"Criar encontro"`
   (`create-event`, tonal, ícone `add`) (events/views.js:14).
4. **Faixa de visita**: `readonlyHtml()` (shell/navigation.js:108) —
   `"Você está conhecendo {cidade}. Sua cidade atual é {cidade própria}."` com botão
   `"Voltar"` (`home-city`).
5. **Chips** (events/views.js:13), só quando existe algum encontro: apenas públicos com
   contagem maior que zero, com rótulo `"{rótulo} · {n}"` (ex.: `"Todos · 4"`,
   `"Para quem chega · 2"`), ação `agenda-filter`.
6. **Dias** (events/views.js:12/14): agrupamento por data; cada bloco é
   `section.agenda-day[aria-labelledby=ad-{data}]` com `h2.agenda-date` = `agendaDay`
   (`"Hoje"`, `"Amanhã"` ou `"Segunda-feira, 3 de novembro"` — dia da semana capitalizado) e
   `div.list` com `eventRow`.
7. **`eventRow`** (shell/primitives.js:25): botão de data (`event-date`, mês abreviado
   maiúsculo + dia, `open-event`), botão de texto com título, `"{place} · {time}"`,
   `"{going} confirmados"` (`going` cru, sem somar a própria presença) e o CTA final —
   `"Você organiza"` (`open-event`, outlined) quando `e.mine`, senão `"Vou"`/`"Confirmado"`
   (`attend-event`, outlined/tonal com `check`).

##### Estados

- **Sem filtro com resultado** (mas com encontros): `empty('Nenhum encontro para esse
  público','Veja todos os encontros da cidade.','event','agenda-filter','Ver todos')`
  (events/views.js:14).
- **Agenda vazia**: `empty('Nenhum encontro agendado','Os próximos encontros aparecerão
  aqui.','event', …)` com botão `"Criar encontro"` quando a cidade é a própria
  (events/views.js:14).
- **Visita a outra cidade**: some o botão de criar (topo e estado vazio), aparece a faixa
  `readonlyHtml()`; os encontros listados são os da cidade visitada.
- **Encontro passado**: não existe estado — fica fora da lista (filtro `date>=hoje`,
  events/views.js:8).
- Carregando/esqueleto: não existem.

##### Diferenças por viewport

- **375**: `h2.agenda-date` é fixo no topo da rolagem (`position:sticky; top:0`,
  styles/catalog.css:113) com fundo `--md-sys-color-surface`, o que evita sobreposição
  transparente; `.list-row{padding:14px}` e `.context-strip{font-size:13px}` em ≤479 px
  (styles/base.css:28). O botão do `page-head` fica menor (`font-size:13px`,
  `padding:0 12px`, mesma linha).
- **768**: faixa ≥720 px — sem regra dedicada a `agenda` em `styles/groups.css`,
  `styles/overlays.css` ou `styles/catalog.css`; vale o `padding-top:32px` da página
  (styles/base.css:29).
- **1440**: `min-width:1200px` apenas aumenta `padding-top` (36 px) e não muda estas listas
  (styles/base.css:30).

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Editor de encontro** (`create-event`/`edit-event` → `openEventEditor`,
   features/events/editor.js:1) — seção própria na rota `evento`, abaixo.
2. **Confirmação de cancelamento** (`delete-event`, app/handlers.js:37): `"Cancelar encontro?"` /
   `"“{título}” sairá da agenda da cidade.{aviso de convidados}"`, `ok:'Cancelar encontro'`,
   `cancel:'Voltar'`; depois `"Encontro cancelado.{…}"` com **Desfazer** no aviso
   (`notify(..., 'event_busy', () => …)`), que devolve o encontro à lista.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `agenda-filter` | features/events/views.js:13 | `all\|chegando\|moro\|saindo` | troca o filtro e devolve o foco | app/handlers.js:53 |
| `open-event` | shell/primitives.js:25 (×2 ou ×3) | `e.id` | navega para `evento`; encontro de outra cidade → diálogo `"Encontro indisponível"` | app/handlers.js:26 |
| `attend-event` | shell/primitives.js:25 | `e.id` | `"Presença confirmada neste dispositivo"` / `"Presença cancelada"` | app/handlers.js:36 |
| `edit-event` | shell/primitives.js:25 (`"Você organiza"`), features/home/desktop.js:59 | `e.id` | abre o editor de encontro | app/handlers.js:34 |
| `create-event` | features/events/views.js:14, shell/create-menu.js:12/27, shell/command-palette.js:6 | — | abre o editor de encontro | app/handlers.js:33 |
| `home-city` | shell/navigation.js:108 | — | volta a `state.homeCity` e navega à Início | app/handlers.js:68 |

---

#### 2.4.4 Rota `evento` — [id de encontro]

- Título na barra: `"Encontro"` (shell/navigation.js:53)
- Aba ativa: `activeTab()` devolve `origin` (navigation.js:54)
- De onde se chega: `open-event` — `eventRow` (shell/primitives.js:25), cartão "Próximo
  encontro" da Início (features/home/desktop.js:57–60), busca (`SEARCH_TYPES` `events`,
  features/search/views.js:19), avisos e `submitEvent` logo após publicar
  (features/events/editor.js:2)
- Desenhada por: `renderEvent` em `features/events/views.js:16`
- Parâmetro: `route.id` localizado em `state.events` (events/views.js:17)

##### Conteúdo, de cima para baixo

1. **Guarda** (events/views.js:17): `accessibleRecord(e)` — só aceita encontro da cidade atual
   (app/state.js:63); senão `unavailable()`.
2. **Barra de ações** (events/views.js:18): `"Compartilhar encontro"` (`share`, valor
   `evento|{id}`, ícone `share`) e, se `e.mine`, `"Editar encontro"` (`edit-event`, filled,
   `edit`); senão `"Confirmar presença"`/`"Presença confirmada"` (`attend-event`, filled,
   `event_available`/`check`).
3. **Título**: pill `"Encontro da comunidade"` (ícone `event`), `h1` = `e.title`,
   `p.muted` = `"{dd de mês} · {hora}"` (dateLabel, utilities/format.js:9).
4. **Local**: `div.context-strip.readonly` com `location_on`, `e.place`, quebra de linha,
   `e.city` e botão `"Ver local"` (`map`, valor `"{place}|{city}"`, texto) — abre
   `https://www.openstreetmap.org/search?query={place}, {city}, Brasil` em nova aba
   (app/handlers.js:142).
5. **Sobre o encontro**: `sectionTitle("Sobre o encontro")` + `p.detail-copy` = `e.description`.
6. **Números** (`div.facts`, `max-width:450px`): `"{e.going || 0}"` + `"confirmados"`;
   `"{e.max || 'Livre'}"` + `"vagas totais"` quando há `max`, senão `"participação"`;
   `"{e.on ? 'Sim' : '—'}"` + `"sua presença"`.
7. **Dono**: `sectionTitle`-free section com `"Cancelar encontro"` (`delete-event`, outlined
   com classe `danger`, ícone `event_busy`) quando `e.mine`.

##### Estados

- **Indisponível** (outra cidade ou id inexistente): `unavailable()`; quando a navegação vem de
  um cartão de outra cidade, o caminho passa por `showGlobalDependency('evento-indisponivel')`
  (app/handlers.js:26) → diálogo `"Encontro indisponível"` com
  `"Esta operação depende da rodada de Encontros: criação, presença, lotação e cancelamento
  ainda precisam de suas regras e provas. Nenhum encontro ou confirmação foi alterado. Você
  pode consultar a agenda existente."` e botão `"Consultar Agenda"`.
- **Encontro passado**: a rota abre normalmente (não há guarda por data); confirmar presença
  é recusado com `"Este encontro já aconteceu."` (app/handlers.js:36).
- **Lotação cheia**: `"As vagas deste encontro acabaram."` (app/handlers.js:36) — só quando
  `e.max` existe e `going >= max`.
- **Dono**: em vez de confirmar presença, a barra mostra `"Editar encontro"` e o corpo mostra
  `"Cancelar encontro"`; `attend-event` sai cedo para `e.mine` (handlers.js:36).
- **Visita a outra cidade**: `readonly()` não muda nada nesta rota — a barra de ações e os
  números continuam iguais; confirmar presença esbarra em `canPost()` (app/state.js:61),
  que avisa `"Você está consultando {cidade}. Publique na sua cidade, {cidade própria}."`.
- **Perfil de teste não verificado**: criar/editar/confirmar passam por `canPost()`
  (app/state.js:59) → diálogo `"Perfil em análise"`.
- Carregando/esqueleto: não existem.

##### Diferenças por viewport

- **375**: `.detail-actions` com botões "Compartilhar/Confirmar presença" (`min-width`
  não se aplica abaixo de 720 px); `md-dialog` quase de borda a borda
  (`width:calc(100vw - 24px)`, styles/base.css:28) e `md-dialog.form-dialog` com
  `width:calc(100vw - 16px)`; `.facts{gap:6px}`/`.fact{padding:10px}` (styles/base.css:28).
- **768**: `.detail-actions-in{justify-content:flex-end}` e cada botão da barra com
  `min-width:220px` (styles/base.css:29) — as duas ações ficam largas, alinhadas à direita.
- **1440**: iguais às de 768 px; `padding-top` da página em 36 px (styles/base.css:30).
- Não há nenhuma regra em `styles/groups.css` ou `styles/overlays.css` específica para esta
  rota.

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Editor de encontro** (`openEventEditor`, features/events/editor.js:1; kind `editor`):
   exige `canPost()`; em edição, exige `e.mine`. Título `"Criar encontro"` ou
   `"Editar encontro"`. Campos, todos dentro de `div.form-grid`:
   `event-title` `"Nome do encontro"` (`required minlength="5" maxlength="100"`,
   `class="full"`); `label.field-label` `"Data"` com `input#event-date[type=date]`
   (`min` = hoje, valor padrão `dateISO(1)`, `required`); `label.field-label` `"Horário"` com
   `input#event-time[type=time]` (padrão `09:00`, `required`); `event-place` `"Local"`
   (`required minlength="4" maxlength="160"`); `event-max` `"Número de vagas (opcional)"`
   (`type="number" min="1" max="10000"`); `event-desc` `"Sobre o encontro"`
   (textarea rows 3, `required minlength="12" maxlength="2000"`). Botões `"Cancelar"` e
   `"Publicar encontro"`/`"Salvar alterações"` (`submit-event`).
   Erros de `submitEvent` (events/editor.js:2), em ordem:
   `"O nome do encontro precisa de pelo menos 5 letras."`,
   `"Informe a data do encontro."`,
   `"A data do encontro precisa ser hoje ou depois."`,
   `"Informe o horário do encontro."`,
   `"Descreva o encontro com pelo menos 12 caracteres."` e
   `"O limite não pode ser menor que as presenças confirmadas."` (edição cujo `max` fica abaixo
   de `going`). Além disso, os `required`/`minlength` são cobrados antes por `validFields`
   (features/listings/editor.js:11).
   Sucesso: `"Encontro publicado"` (novo) ou `"Encontro atualizado.{aviso de convidados}"`
   quando data/hora/local mudaram — o texto vem de `guestsNote(eventGuests(e), true)`
   (features/community/manage.js:7–8: `" N pessoas que confirmaram foram avisadas."`).
   O encontro novo entra como `{mine:true, on:true, going:1, city: state.homeCity}` e a rota
   navega para `evento`. Como este diálogo define `editor`, qualquer digitação marca
   `editorDirty` (shell/bindings.js:15) e fechar passa pela confirmação
   `"Descartar alterações?"` (shell/dialogs.js:13). A folha ocupa
   `calc(100dvh - 48px - env(safe-area-inset-top))` (styles/overlays.css:3).
2. **Cancelar encontro** (`delete-event`, app/handlers.js:37): descrito na rota `agenda`.
3. **Dependência declarada** (ver seção final): diálogo de `showGlobalDependency` com o texto
   dos Encontros.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `share` | features/events/views.js:18 | `evento\|{id}` | compartilha o link local (ou copia e avisa `"Link local da demonstração copiado"`) | app/handlers.js:31 → features/messaging/actions.js:91 |
| `attend-event` | features/events/views.js:18 | `e.id` | confirma/cancela presença, soma ou subtrai de `going` | app/handlers.js:36 |
| `edit-event` | features/events/views.js:18 | `e.id` | abre o editor | app/handlers.js:34 |
| `delete-event` | features/events/views.js:19 | `e.id` | confirma, remove da agenda e oferece Desfazer | app/handlers.js:37 |
| `map` | features/events/views.js:19 | `place\|city` | abre o OpenStreetMap em nova aba | app/handlers.js:142 |

**Encontros e a dependência declarada.** `showGlobalDependency` (app/handlers.js:151–155)
contém o mapa `titles` com `create-event: 'Criar encontro'`, `edit-event: 'Editar encontro'`,
`delete-event: 'Cancelar encontro'`, `attend-event: 'Confirmar presença'`,
`submit-event: 'Publicar encontro'`, `evento-indisponivel: 'Encontro indisponível'`,
`plano-indisponivel: 'Etapa indisponível'`; para as cinco primeiras (e para
`evento-indisponivel`) o texto é o de Encontros citado acima, com os botões `"Voltar"` e
`"Consultar Agenda"`. **No código atual essas ações não caem ali**: o switch de `perform()`
trata `create-event`, `edit-event`, `submit-event`, `attend-event` e `delete-event`
(app/handlers.js:33–37) antes do `default:` (linha 144) e nenhum interceptador anterior
(`groupAction`, `requestAction`, `manageAction`, linhas 3–19) as captura. Ou seja, o editor e
a presença **existem**; o texto de dependência só é alcançável por `default:` de ação
desconhecida e por `showGlobalDependency('evento-indisponivel')` (linha 26) e
`('plano-indisponivel')` (linhas 29–30). Quem repetir a afirmação "o editor de encontro cai em
dependência declarada" está descrevendo uma versão anterior do código.

---

#### Aba de grupos da Comunidade (`renderGroupsTab`)

- Onde: `renderCommunity` (features/community/views.js:1) monta `page-head` com `h1`
  `"Comunidade"`, `p`
  `"O que a comunidade sabe fica disponível para quem chegar depois."`, aba
  `"Grupos"` (`communityTab='grp'`) e, fora de visita, o botão `"Criar grupo"`
  (`create-group`, tonal, `group_add`); o corpo é `renderGroupsTab()` (views.js:2).
- `renderGroupsTab` (features/groups/views.js:69): `div.group-tools` com
  `field('group-search','Buscar grupos',groupQuery,'type="search"')` e
  `div#groups-body` com `groupsBody()`. A busca é ao vivo: `input` reescreve `#groups-body`
  com 120 ms de espera (shell/bindings.js:10).
- `groupsBody` (views.js:70–83):
  - **base**: `state.groups` onde `g.city === state.city` ou (`g.on` e `g.auto`) (views.js:71)
  - **busca**: filtra grupos não encerrados cujo `título + about + nome do modelo` casa com o
    texto normalizado; resultado em `div#group-results` com `pagedHtml('group-search',
    '{cidade}|{busca}', …, {noun:'grupos', wrap:'list'})` (views.js:73). Vazio:
    `empty('Nenhum grupo com esse nome','Crie o grupo e convide quem tem o mesmo interesse.',
    'groups','create-group','Criar grupo')` (sem os dois últimos argumentos em visita).
  - **"Seus grupos"**: `g.on || g.pending`, ordenado por automático e depois por não lidos;
    vazio → `empty('Você ainda não está em grupos','Entre em um grupo sugerido ou crie o
    seu.','groups')` (views.js:74, :78)
  - **faixa de interesses** quando `state.profile.interests` está vazio e não é visita:
    ícone `interests`, `"Do que você quer participar?"`,
    `"Marque até 3 interesses para receber sugestões."` e botão `"Escolher"` (`edit-interests`,
    texto) (views.js:79)
  - **"Sugeridos para você"**: até 4 grupos com motivo, e `sectionTitle` com atalho
    `"Interesses"` (`edit-interests`) quando já há interesses (views.js:76, :80). Motivos de
    `gReason` (views.js:57–61): `"Pela sua chegada em {ciclo}"` (grupo automático, modo
    `chegando`, mesma cidade), `"Chegam em {ciclo}. Uma indicação sua ajuda"` (modo `moro`) e
    `"Você marcou {rótulo do interesse}"`
  - **"Populares em {cidade}"**: restantes por número de membros, até 5 (views.js:77, :81)
- **Cartão** `groupRow` (views.js:63–67): miniatura-botão (`open-group`, `aria-label`
  `"Abrir {título}"`), botão de texto (`open-group`) com `"{título} · {cidade}"` quando é de
  outra cidade e subtítulo que é, para membro, `gLast(g)` e, para não membro,
  `"{N membros} · aberto|fechado"`; pills `"Fechado"`(`lock`), `"Admin"`(`ok`),
  `"Aguardando aprovação"`, `"Encerrado"`, `"Automático"`(`flight_land`); badge de não lidos
  (`"{n} novas"`); CTA `"Entrar"`/`"Pedir"` (`join-group`, tonal) somente quando o cartão pede
  CTA, o grupo não é meu, não está pendente, não é visita e não está encerrado; sem CTA,
  `chevron_right`. `gLast` (views.js:56) devolve `"Grupo encerrado"`, a última publicação
  visível como `"{Você|primeiro nome}: {texto}"` (com `"Oferta · "` na frente) ou o
  `g.about`.
- **Reaproveitamento fora da aba**: o mesmo `groupRow` é usado na busca global
  (features/search/views.js:19), na paleta de comandos (shell/command-palette.js:28) e na
  coluna "Nos seus grupos" da Início (features/home/desktop.js:50). A busca global só indexa
  `título + about` e exclui grupos encerrados (features/search/views.js:5).

---

### 2.5 Você e tudo que pende dela

#### 2.5.1 Rota `voce` — sem parâmetro

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): `"Você"`
- Aba ativa (`activeTab`, `shell/navigation.js:54`): `voce`
- De onde se chega: aba `voce` na navegação (`shell/navigation.js:65`, `data-action="nav" data-value="voce"`); fallback do botão voltar de `salvos`, `meus-anuncios`, `ocultados`, `bloqueados`, `pedidos`, `privacidade`, `conduta`, `ajuda`, `apagar-conta` (`navigation.js:51`)
- Desenhada por: `renderProfile` em `features/profile/views.js:4`; helpers próprios `profileRow` (`views.js:8`), `savedItemList` (`views.js:2`), `savedBizList` (`views.js:3`), `mineQuestionList` (`views.js:12`), `pushRowHtml` (`push-install.js:31`), `installRowHtml` (`push-install.js:35`)
- Parâmetro: nenhum (`route.id` ignorado por `renderProfile`)

##### Conteúdo, de cima para baixo

1. **Cabeçalho de página** — `<h1>Você</h1>` e botão de ícone `settings` com rótulo `"Configurações"` (`views.js:6`).
2. **Bloco do perfil** (`.profile-box`) — avatar com as iniciais de `state.profile.name` (`initals`, `utilities/format.js:11`); `<h2>` com o nome; linha pequena com o vínculo montado como `[rótulo do papel, força].filter(Boolean).join(' · ')` ou o literal `"Vínculo confirmado"` quando ambos faltam. Mapa do papel: `ativa`→`"Militar da ativa"`, `veterano`→`"Veterano"`, `pensionista`→`"Pensionista militar"`, `familia`→`"Família de militar"` (`views.js:6`). Abaixo, `state.profile.verified ? "Perfil de teste verificado" : "Verificação de teste pendente"` (`views.js:6`).
3. **Grade de estatísticas** (`.profile-grid`), 4 botões: `saved` → número `savedItemList()+savedBizList()` e rótulo `"salvos"`; `my-ads` → `state.items.filter(x=>x.mine && x.status==='active').length` e `"anúncios ativos"`; `my-questions` → `mineQuestionList().filter(q=>q.mine).length` e `"suas perguntas"`; `groups` → `state.groups.filter(g=>g.on).length` e `"grupos"` (`views.js:6`).
4. **Seção 1 (lista)** — 8 linhas `profileRow(ícone, título, subtítulo, ação)`:
   - `swap_horiz` · `"Seu momento"` · `"<Mora em|Chegando a|Saindo de> <homeCity>"` · ação `city` (mapa `state.mode`: `moro`/`chegando`/`saindo`)
   - `sell` · `"Meus anúncios"` · `"<n> publicados · <d> rascunhos"` (n = `state.items.filter(mine)`, d = `state.drafts.length`) · `my-ads`
   - `notifications` · `"Alertas de busca"` · com alertas: `"<n> alerta|alertas · <k> com avisos ligados"`; sem: `"Filtre imóveis ou desapegos e toque em Avise-me"` · `search-alerts`
   - `build` · `"Pedidos de serviço"` · `"<n> abertos"` (+ `" · <p> para o seu negócio"` só se `state.myBiz?.live`) · `requests`
   - `bookmark` · `"Salvos"` · `"Anúncios e negócios em uma lista"` · `saved`
   - `forum` · `"Minhas perguntas e indicações"` · `"Acompanhe respostas e o que você resolveu"` · `my-questions`
   - `storefront` · `state.myBiz?.live ? "Meu negócio" : "Criar página do negócio"` · `state.myBiz?.name || "Ofereça seus serviços à comunidade"` · `my-biz`
   - `family_restroom` · `"Família convidada"` · `"<n> convites criados"` · `family`
   Todas as linhas terminam com `icon('chevron_right')` (`views.js:8`).
5. **Seção `"Avisos"`** (`sectionTitle`, `shell/primitives.js:15`) — três linhas:
   - `pushRowHtml()` → `"Avisos no celular"` + `"Ativados: respostas, propostas, alertas e encontros"` ou `"Desativados"` + botão `"Desativar"`/`"Ativar"` (`pushInstall` `push-disable`/`push-ask`) — **some inteira em modo visita** (`push-install.js:32`)
   - `installRowHtml()` → `"Instalar o Bivaque no celular"` + `"Abre direto da tela inicial, em tela cheia."` + `chevron_right`, ação `install-app` (`push-install.js:35-38`)
   - `"Resumo diário"` + `"Preferência guardada no seu perfil de teste."` + `md-switch` `digest-switch` (gravado em `shell/bindings.js:9`)
   - `"Avisos imediatos"` + `"Até <cap> por dia"` + dois `iconBtn`: `remove` ação `cap` valor `-1` rótulo `"Diminuir limite de avisos"`; `add` ação `cap` valor `1` rótulo `"Aumentar limite de avisos"`
6. **Seção 3 (lista)** — `help` · `"Ajuda"` · `"Perguntas frequentes, fale com a gente e chamados"` · `support-open` valor `ajuda`; `tune` · `"Controles do protótipo"` · `"Cenários, cadastro, cidade inicial e respostas de teste"` · `prototype`; `logout` · `"Sair"` · `"Volta para a página inicial; seus dados de teste ficam neste dispositivo"` · `sign-out` (`views.js:6`).

##### Estados

- **Vazio:** não existe. `voce` sempre desenha as três seções; contadores podem ser `0`.
- **Carregando / esqueleto:** não existe para esta rota (o único esqueleto do protótipo é o de paginação, `shell/paged-list.js:35`).
- **Erro / indisponível:** não existe estado de erro local para a rota.
- **Visita a outra cidade (`readonly()`, `app/state.js:58`):** a página **não** traz a faixa `readonlyHtml()` (`shell/navigation.js:108`); o que muda é (a) `pushRowHtml()` devolve `''` e a linha de avisos no celular desaparece; (b) a barra ganha a classe `away` (`navigation.js:62`, só visível em `<1024px`); (c) as ações `my-ads` (`demo-actions.js:48`) e `my-questions` (`app/handlers.js:139`) forçam `state.city = state.homeCity` antes de navegar.
- **Verificação de teste pendente (`state.profile.verified === false`):** a linha de status mostra `"Verificação de teste pendente"`; `profileFamilyAllowed` recusa convites (`demo-actions.js:11`) e `canPost()` bloqueia publicar com o diálogo `"Perfil em análise"` / `"Publicar libera quando a equipe aprovar seu perfil. Nada foi publicado."` (`app/state.js:62`).
- **Sem acesso:** não verificado. `entryGate` (`navigation.js:106`) só redireciona rotas para `entrar` quando `state.signedOut`; `voce` não é exceção.

##### Diferenças por viewport

- **375:** regras de `@media(max-width:479px)` em `styles/base.css:28` — `.profile-stat{padding:14px}`, `.list-row{padding:14px}`, `.section-title h2{font-size:19px}`, `.page-head{gap:8px}`, `.card-grid{grid-template-columns:1fr}`. A navegação inferior fica visível (rota raiz) e pode minimizar com o scroll (`navigation.js:97-99`, `:91-96`).
- **768:** regras de `@media(min-width:720px)` em `styles/base.css:29` — `.profile-grid{grid-template-columns:repeat(4,minmax(0,1fr))}` (contra 2 colunas na base, `.profile-grid{...grid-template-columns:1fr 1fr...}`), `.page{padding-top:32px;padding-bottom:120px}`, e a navegação vira trilho lateral (`nav-main{...width:96px}`).
- **1440:** regras de `@media(min-width:1200px)` em `styles/base.css:30` — só `.card-body`/`.section-title h2`/`.page` mudam; `profile-grid` continua 4 colunas. Não achei media query exclusiva de `voce` acima de 1200px.

##### Diálogos, editores, folhas e menus abertos nesta rota

Um item por overlay desta rota (os demais overlays da área estão em `salvos`/`meus-anuncios` ou são globais — ver a seção própria de cada rota adiante): **Cidade e momento** (`city`), **Configurações** (`settings`), **Controles do protótipo** (`prototype`), **Família convidada** (`family`), **Avisos** (`notices`, também na barra da Início), **pedido de avisos** e **instalação do app**. Os campos e mensagens de cada um estão em "Overlays da área", no fim desta área, para não repetir seis vezes.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `settings` | `views.js:6` | `''` | abre Configurações | `handlers.js:69` |
| `saved` | `views.js:6` (stat) e `views.js:6` (`profileRow`) | `''` | fecha diálogo e navega `salvos` | `demo-actions.js:47` |
| `my-ads` | `views.js:6` (stat + linha) | `''` | volta a cidade natal se em visita, navega `meus-anuncios` | `demo-actions.js:48` |
| `my-questions` | `views.js:6` (stat) e linha | `''` | `state.city=homeCity`, navega `minhas` | `handlers.js:139` |
| `groups` | `views.js:6` | `''` | `communityTab='grp'`, navega `comunidade` | `handlers.js:140` |
| `city` | `views.js:6` | `''` | abre Cidade e momento | `handlers.js:62` |
| `search-alerts` | `views.js:6` | `''` | abre "Alertas de busca" | `features/listings/alerts.js:56` |
| `requests` | `views.js:6` | `''` | navega `pedidos` | `handlers.js` (fora da área) |
| `my-biz` | `views.js:6` | `''` | volta a cidade natal; abre negócio ou editor | `handlers.js:110` |
| `family` | `views.js:6` | `''` | abre Família convidada | `demo-actions.js:51` |
| `prototype` | `views.js:6`, `navigation.js:65` | `''` | abre Controles do protótipo | `handlers.js:71` |
| `support-open` | `views.js:6` (`ajuda`) | `ajuda` | navega `ajuda` | `features/support/help.js:146` |
| `sign-out` | `views.js:6` | `''` | `confirm("Sair do Bivaque?")`; depois `entrar` | `features/entry/landing.js:203` |
| `cap` | `views.js:6` | `-1` / `1` | altera `state.prefs.cap` e avisa | `demo-actions.js:87` |
| `notices` | `navigation.js:60` (barra da Início) | `''` | abre Avisos | `demo-actions.js:76` |
| `undo` | `shell/toasts.js:10` (snackbar) | `''`/id | executa o desfazer do aviso | `app/handlers.js:143` |
| `nav` | `navigation.js:65` | `voce` | troca de aba | `handlers.js:21` |

---

#### 2.5.2 Rota `salvos` — sem parâmetro

- Título na barra: `"Salvos"` (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: `saved` (`views.js:6` stat e linha) → `demo-actions.js:47` (`navigate('salvos')`); fallback do voltar aponta para `voce` (`navigation.js:51`)
- Desenhada por: `renderSaved` em `features/profile/views.js:9`; helpers `savedItemList` (`views.js:2`), `savedBizList` (`views.js:3`), `photoCard` (`shell/primitives.js:19`), `businessCard` (`:23`), `compareEntryHtml` (`features/listings/compare.js:5`)
- Parâmetro: nenhum

##### Conteúdo, de cima para baixo

1. **Cabeçalho** — `<h1>Salvos</h1>` + `"Anúncios e negócios que você quer consultar de novo."` (`views.js:9`).
2. **Chips de filtro** — `filterChips([['all','Tudo'],['items','Anúncios'],['biz','Negócios']], savedType, 'saved-filter')` (`features/listings/catalog.js:1`); `savedType` é variável de módulo (`app/state.js:16`), não campo do `state` — sobrevive à navegação na sessão, não ao reload.
3. **Seção `"Anúncios"`** — só quando `savedType!=='biz'` e há itens; inclui `compareEntryHtml()`, que aparece só com ≥2 imóveis salvos: `"Você salvou <n> imóveis. Compare total do mês, quartos, área e disponibilidade."` + botão `"Comparar"` (`compare.js:5`). Lista paginada `pagedHtml('saved-items', savedType, items, photoCard, {noun:'anúncios'})`.
4. **Seção `"Negócios"`** — só quando `savedType!=='items'` e há negócios; `pagedHtml('saved-biz', savedType, biz, businessCard, {noun:'negócios'})`.
5. **Paginação** — blocos de `LIST_PAGE=24` (`shell/paged-list.js:5`): rodapé `"Mostrando <n> de <total> anúncios"` + barra + botão `"Mostrar mais <k>"` (`:14`); no fim `"Você viu os <total> anúncios"` (`:17`). `savedItems` usa o artigo `os` (padrão `art='os'`) — daí `"Você viu os 12 anúncios"`.

Critério de salvos: `state.items.filter(x=>x.saved && x.status!=='removed' && (x.mine||!isBlocked(x.seller)))` (`views.js:2`) e `[...state.biz, ...(state.myBiz?.live?[state.myBiz]:[])].filter(x=>x.saved)` (`views.js:3`). **Não há filtro por cidade** — Salvos mostram itens de qualquer cidade.

##### Estados

- **Vazio (três variantes, `views.js:9`)**, todas com ícone `bookmark_border`:
  - `savedType==='items'`: título `"Nenhum anúncio salvo"`, texto `"Toque no marcador de um anúncio ou negócio para guardar."`, botão `"Explorar anúncios"` (ação `catalog-all`).
  - `savedType==='biz'`: título `"Nenhum negócio salvo"`, mesmo texto, botão `"Explorar negócios"` (ação `businesses`).
  - demais (`all`): título `"Seus salvos aparecem aqui"`, mesmo texto, botão `"Explorar anúncios"` (`catalog-all`).
  O vazio só aparece quando a soma das listas **visíveis no filtro atual** é zero (`const visible=...`).
- **Carregando / esqueleto:** só ao paginar — `pagedAuto` insere `.paged-skel` e troca o rodapé por `"Carregando mais <k>…"` (`paged-list.js:34-36`).
- **Erro:** não existe.
- **Visita a outra cidade:** idêntica — `savedItemList`/`savedBizList` ignoram `state.city`. Abrir um cartão troca a cidade por causa de `open-item`/`open-biz` (`handlers.js:94`, `:108`).
- **Item vendido/encerrado:** cartão ganha a etiqueta `"Vendido"`/`"Indisponível"` (`shell/primitives.js:20`); `status==='removed'` some da lista. Bloqueio do vendedor remove o item (`askVisible`/`isBlocked`, `app/state.js:33`, `:38`).

##### Diferenças por viewport

- **375:** `.card-grid{grid-template-columns:1fr}` (`styles/base.css:28`); navegação inferior oculta (rota não-raiz) e `body.mobile-detail` (`navigation.js:95`); a barra mostra botão voltar + `"Salvos"` (`navigation.js:60`).
- **768:** `.card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}` e `.page{padding-bottom:120px}` (`base.css:29`).
- **1440:** `.card-grid{grid-template-columns:repeat(4,...)}` (`base.css:30`).
- Não achei media query que trate `salvos` especificamente.

##### Diálogos, editores, folhas e menus abertos nesta rota

- **Avisos** — se a pessoa estava em Avisos e abriu um anúncio, o voltar restaura a folha: `notice-open` navega com `returnOverlay:'notices'` (`demo-actions.js:85`) e o `popstate` chama `profileRestoreOverlay('notices')` (`navigation.js:52` → `demo-actions.js:36`), que zera `noticesTab='all'` e reabre. (mesmo overlay — ver 2.5.1, overlay "Avisos".)
- **Comparar imóveis salvos** — ação `compare-saved` (mesmo overlay — ver 2.1.1, overlay 5).
- **Contatos/`item-leads`** não estão nesta rota.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `saved-filter` | `views.js:9` (chips) | `all`/`items`/`biz` | troca `savedType`, redesenha, devolve foco ao chip | `demo-actions.js:49` |
| `open-item` | `shell/primitives.js:21` (card) | id do item | troca cidade se preciso, conta visita, navega `anuncio` | `handlers.js:93` |
| `open-biz` | `shell/primitives.js:23` | id do negócio | idem para `negocio` | `handlers.js:108` |
| `save-item` | `shell/primitives.js:21` | id | alterna `saved`; avisa `"Anúncio salvo"`/`"Anúncio removido dos salvos"` | `handlers.js:96` + `shell/in-place.js:15` |
| `save-biz` | `shell/primitives.js:23` | id | idem negócio | `handlers.js:109` |
| `compare-saved` | `features/listings/compare.js:5` | `''` | abre comparação | `features/listings/compare.js` |
| `catalog-all` | `views.js:9` (vazio) | `''` | navega `desapegos` com filtro padrão | `handlers.js:51` |
| `businesses` | `views.js:9` (vazio) | `''` | navega `negocios` | `handlers.js:58` |
| `list-more` | `shell/paged-list.js:14` | id da lista | acrescenta 24 cartões, foca o primeiro novo | `shell/paged-list.js:46` |
| `undo` | `shell/toasts.js:10` | `''`/id | desfaz o último salvamento | `handlers.js:143` |

---

#### 2.5.3 Rota `meus-anuncios` — sem parâmetro

- Título na barra: `"Meus anúncios"` (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: `my-ads` (`views.js:6` stat e linha → `demo-actions.js:48`); `delete-item` navega para cá com `myAdsFilter='active'` (`handlers.js:102`); `save-draft` navega para cá com `myAdsFilter='drafts'` (`features/listings/editor.js:19`); o vazio do filtro `sold` traz o chip `my-ads-filter` com `data-value="active"`; fallback do voltar: `voce` (`navigation.js:51`)
- Desenhada por: `renderMyAds` em `features/profile/views.js:10`
- Parâmetro: nenhum

##### Conteúdo, de cima para baixo

1. **Cabeçalho** — `<h1>Meus anúncios</h1>` + `"Publique, acompanhe contatos e encerre suas ofertas."` + botão `"Anunciar"` (ação `create`, variante `tonal`, ícone `add`) (`views.js:10`).
2. **Chips de filtro** — `filterChips([['active','Ativos'],['sold','Encerrados'],['drafts','Rascunhos']], myAdsFilter, 'my-ads-filter')` (`catalog.js:1`); `myAdsFilter` nasce em `'active'` (`app/state.js:16`).
3. **Base da lista** `all = state.items.filter(x=>x.mine && x.city===state.homeCity)` (`views.js:10`) — **só a cidade natal**, independentemente de `state.city`, e sem filtro de bloqueio.
4. **Filtro `drafts`** — lista `state.drafts`: cada linha tem botão `open-draft` (título `d.title || "Anúncio sem título"`, subtítulo `"Imóvel · rascunho"` ou `"Desapego · rascunho"`) e `iconBtn('delete','delete-draft', d.id, "Excluir rascunho")` (`views.js:10`).
5. **Filtros `active` e `sold`** — cartões paginados `pagedHtml('my-ads', myAdsFilter, items, …)`; cada cartão é `photoCard(i)` (com etiqueta `"Seu anúncio"`, `"Vendido"` ou `"Indisponível"`, `primitives.js:20`) seguido de `.card-buttons` com três controles: `btn('Editar','edit-item', i.id,'text','edit')`; `btn(i.status==='sold'?'Reativar':'Encerrar','item-status', i.id,'text', sold?'refresh':'check')`; `iconBtn('delete','delete-item', i.id, "Excluir anúncio")`.

##### Estados

- **Vazio `drafts`** (`views.js:10`) — título `"Nenhum rascunho"`, texto `"Use “Salvar rascunho” enquanto prepara um anúncio."`, ícone `edit_note`, botão `"Preparar anúncio"` (ação `create-item`).
- **Vazio `active`** — título `"Nenhum anúncio ativo"`, texto `"Suas publicações aparecem nesta lista."`, ícone `sell`, botão `"Criar anúncio"` (ação `create-item`).
- **Vazio `sold`** — título `"Nenhum anúncio encerrado"`, mesmo texto/ícone, botão `"Ver anúncios ativos"` (ação `my-ads-filter`, com o `.replace` em `views.js:10` injetando `data-value="active"`).
- **Carregando / esqueleto:** igual a Salvos (`paged-list.js:34-36`).
- **Erro:** não existe.
- **Visita a outra cidade:** a lista continua mostrando a cidade natal (filtro `x.city===state.homeCity`) e **não há faixa de aviso**; a ação `my-ads` que leva para cá restaura `state.city=state.homeCity` antes (`demo-actions.js:48`). Os botões de estado/exclusão chamam `canPost()` (`handlers.js:101-102`), que em visita notifica `"Você está consultando <cidade>. Publique na sua cidade, <homeCity>."` (`app/state.js:61`).
- **Verificação pendente:** `canPost()` recusa `item-status`/`delete-item` com o diálogo `"Perfil em análise"`.
- **Somente leitura de rascunho:** `open-draft` reabre o editor no rascunho (`handlers.js:87`), sem trava própria.

##### Diferenças por viewport

- **375:** cartões em uma coluna (`.card-grid{grid-template-columns:1fr}`, `base.css:28`); `.page-head>md-filled-tonal-button` reduz o rótulo a `13px` e o padding a `0 12px` (mesma linha); navegação inferior oculta.
- **768:** 3 colunas de cartões (`base.css:29`).
- **1440:** 4 colunas (`base.css:30`).
- Não achei regra específica de `meus-anuncios`.

##### Diálogos, editores, folhas e menus abertos nesta rota

- **Editor de anúncio** (`open-item`) — `create-item`/`edit-item`/`open-draft` abrem `openItemEditor(kind, id?, draftId?)` (`handlers.js:84-87`). Pertence à área de Anúncios, não a esta; aqui só se registra que a rota é ponto de entrada. (mesmo overlay — ver 2.2.1, overlays 1–3.)
- **`delete-item`** — `confirm('Excluir anúncio?', '“<título>” sairá das ofertas. As conversas existentes serão preservadas.', ...)`, botões padrão `"Continuar"`/`"Confirmar"` (`shell/dialogs.js:20`); ao confirmar, remove do `state.items`, zera `lastViewed` se for o item, muda para `meus-anuncios` com `myAdsFilter='active'` e avisa `"Anúncio excluído"` **com desfazer** (`handlers.js:102`).
- **`delete-draft`** — `confirm('Excluir rascunho?', 'O texto e as fotos deste rascunho serão removidos.', ...)`; avisa `"Rascunho excluído"` **sem desfazer** (`handlers.js:103`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `create` | `views.js:10` | `''` | abre o menu Criar | `handlers.js:83` |
| `my-ads-filter` | `views.js:10` (chips + vazio "Ver anúncios ativos") | `active`/`sold`/`drafts` | troca `myAdsFilter`, redesenha | `demo-actions.js:50` |
| `create-item` | `views.js:10` (vazios) | `''` | abre editor de desapego | `handlers.js:84` |
| `open-draft` | `views.js:10` | id do rascunho | reabre o editor no rascunho | `handlers.js:87` |
| `edit-item` | `views.js:10` | id do item | reabre editor com o item | `handlers.js:86` |
| `item-status` | `views.js:10` | id do item | alterna `active`/`sold`; avisa `"Encerrado"`/`"Reativado"` com desfazer | `handlers.js:101` |
| `delete-item` | `views.js:10` | id do item | confirm + remove; avisa com desfazer | `handlers.js:102` |
| `delete-draft` | `views.js:10` | id do rascunho | confirm + remove; avisa sem desfazer | `handlers.js:103` |
| `open-item`/`save-item` | `primitives.js:21` | id | ver Salvos | `handlers.js:93`, `:96` |
| `list-more` | `paged-list.js:14` | `my-ads` | paginação | `paged-list.js:46` |

---

#### 2.5.4 Rota `minhas` — sem parâmetro

- Título na barra: `"Minhas indicações"` (`navigation.js:53`) — atenção: o `<h1>` da página é diferente (`"Minhas perguntas e indicações"`)
- Aba ativa: **`comunidade`** (`navigation.js:54`, lista `['grupo','publicacao','pergunta','minhas']`)
- De onde se chega: `my-questions` (`views.js:6` stat e linha → `handlers.js:139`, que força `state.city=homeCity` antes de navegar); o plano local usa `perform('my-questions')` (`handlers.js:30`, passo `s3` da saída); fallback do voltar: `comunidade` (`navigation.js:51`)
- Desenhada por: `renderMineQuestions` em `features/profile/views.js:13`; helper `mineQuestionList` (`views.js:12`) e `questionRow` (`shell/primitives.js:24`)
- Parâmetro: nenhum

##### Conteúdo, de cima para baixo

1. **Cabeçalho** — `<h1>Minhas perguntas e indicações</h1>` + `"Seu histórico de participação na comunidade."` + botão `"Perguntar"` (ação `ask`, `tonal`, ícone `add`).
2. **Lista** — `qs = state.asks.filter(q => q.city===state.homeCity && askVisible(q) && (q.mine || q.answers.some(a=>a.mine)))` (`views.js:12`), desenhada em `.list` com `questionRow(q)`.
3. **Cada linha** (`primitives.js:24`) — avatar (classe `me` quando é sua), título da pergunta, subtítulo `"Você"`/`q.who` + `q.topic||q.city`, etiqueta `"Resolvida"` (classe `ok`) / `"<n> resposta|respostas"` / `"Sem resposta"`, e `chevron_right`. A linha inteira é o botão `open-question`.

##### Estados

- **Vazio** (`views.js:13`): título `"Seu histórico começa aqui"`, texto `"Uma dúvida sua pode virar uma resposta útil para outras famílias."`, ícone `forum`, botão `"Pedir indicação"` (ação `ask`).
- **Carregando / esqueleto:** não existe — esta rota não é paginada.
- **Erro:** não existe.
- **Visita a outra cidade:** a lista é fixada na cidade natal (`q.city===state.homeCity`), então muda pouco; `my-questions` restaura a cidade. Sem faixa de aviso. O botão `"Perguntar"` cai em `canPost()` e notifica o aviso de publicação (`app/state.js:61`).
- **Pergunta oculta (`hiddenByMe`):** filtrada por `askVisible` (`app/state.js:37`) — some desta lista.
- **Autor bloqueado:** também filtrado por `askVisible`.
- **Sem acesso:** nenhum estado próprio.

##### Diferenças por viewport

- **375 / 768 / 1440:** só as regras gerais de `.list-row` (`base.css:28` reduz o padding para `14px` abaixo de 480px) e a alternância navegação inferior ↔ trilho lateral em 720px (`base.css:29`, `navigation.js:91-96`). Não achei regra específica de `minhas`.

##### Diálogos, editores, folhas e menus abertos nesta rota

- **Nova pergunta** — `ask` → `openAsk(state.askDraft||'')` (`handlers.js:129`), editor da área de Comunidade. (mesmo overlay — ver 2.3, "Overlays transversais desta área", item 1.)
- **Nenhum menu `⋮`** nesta lista: `questionRow` não renderiza `question-other-menu` (isso é do detalhe da pergunta, `features/community/question.js:4`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `ask` | `views.js:13` (cabeçalho e vazio) | `''` | abre o editor de pergunta | `handlers.js:129` |
| `open-question` | `shell/primitives.js:24` | id | troca cidade, conta, navega `pergunta` | `handlers.js:126` |

---

#### 2.5.5 Rota `ocultados` — sem parâmetro

- Título na barra: `"Ocultados"` (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: `open-hidden` na lista de Configurações (`features/profile/settings.js:5`) → `hiddenAction` faz `leaveDialog(()=>navigate('ocultados'))` (`hidden.js:18`); fallback do voltar: `voce` (`navigation.js:51`)
- Desenhada por: `renderHidden` em `features/profile/hidden.js:12`; helpers `hiddenAsks` (`:6`), `hiddenRow` (`:8`)
- Parâmetro: nenhum

##### Conteúdo, de cima para baixo

1. **Cabeçalho** — `<h1>Ocultados</h1>` + `"Só você deixa de ver. Nada é removido da comunidade."` (`hidden.js:14`).
2. **Lista** de `hiddenAsks()` = `state.asks.filter(q=>q.hiddenByMe && !q.hidden && (q.mine||!isBlocked(q.who)))`, ordenada por `hiddenByMe` decrescente (`hidden.js:6`).
3. **Cada linha** (`hidden.js:10`) — ícone `forum`; se `q.city===state.city`, o texto é um botão `open-question`; se não, é texto simples (sem link). Subtítulo: `"Pergunta · ocultada em <DD/MM>"` + `" · <cidade>"` quando não é a cidade natal. Sempre termina com `btn('Mostrar','show-question', q.id,'outlined')`.
4. **Faixa de contexto no detalhe** — `hiddenStrip(q)` (`hidden.js:7`), desenhada pela página da pergunta (`features/community/question.js:4`): `.context-strip.readonly` com `visibility_off` + `"Você ocultou esta pergunta"` + botão `"Mostrar"` (`show-question`).

##### Estados

- **Vazio** (`hidden.js:14`): título `"Nada oculto"`, texto `"As perguntas que você ocultar aparecem aqui, para mostrar de novo quando quiser."`, ícone `visibility_off`, sem botão.
- **Carregando / esqueleto:** não existe.
- **Erro:** não existe.
- **Visita a outra cidade:** a lista não filtra por cidade, então continua completa; só o link direto muda — perguntas de outra cidade aparecem como texto, sem abrir. Sem faixa de aviso.
- **Desfazer:** ao ocultar, `notify('Pergunta ocultada para você.','visibility_off', () => { delete x.hiddenByMe })` (`hidden.js:21`) — o snackbar mostra `"Desfazer"` e devolve a pergunta. Ao mostrar, `notify('Pergunta de volta nas suas listas.','visibility')` **sem** desfazer (`hidden.js:24`).
- **Sem acesso:** nenhum. `q.hidden` (moderação) remove a pergunta desta lista.

##### Diferenças por viewport

- **375/768/1440:** apenas `.list-row` (padding 14px abaixo de 480px, `base.css:28`) e a troca de navegação em 720px. Nada específico de `ocultados`.

##### Diálogos, editores, folhas e menus abertos nesta rota

- **Nenhum.** A rota é só lista + botões. O menu `⋮` que também oferece `"Ocultar pergunta"` vive no detalhe da pergunta e na lista da Comunidade: `blockAction` case `question-other-menu` (`blocks.js:51`) e o gesto de deslizar (`motion/gestures.js:40`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `show-question` | `hidden.js:10`, `hidden.js:7` | id | apaga `hiddenByMe`; avisa `"Pergunta de volta nas suas listas."` | `hidden.js:24` |
| `open-question` | `hidden.js:10` | id | navega para a pergunta (quando é a cidade atual) | `handlers.js:126` |
| `open-hidden` | `settings.js:5` | `''` | fecha diálogo e navega `ocultados` | `hidden.js:18` |
| `hide-question` | `motion/gestures.js:40`, `blocks.js:51` | id | grava `hiddenByMe`; avisa com desfazer | `hidden.js:20-22` |

---

#### 2.5.6 Rota `bloqueados` — sem parâmetro

- Título na barra: `"Pessoas bloqueadas"` (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: `open-blocked` em Configurações (`settings.js:5`) → `blockAction` faz `leaveDialog(()=>navigate('bloqueados'))` (`blocks.js:45`); fallback do voltar: `voce` (`navigation.js:51`)
- Desenhada por: `renderBlocked` em `features/profile/blocks.js:21`; helpers `blockedRow` (`:17`)
- Parâmetro: nenhum

##### Conteúdo, de cima para baixo

1. **Cabeçalho** — `<h1>Pessoas bloqueadas</h1>` + `"Quem você bloqueou não vê que foi bloqueado."` (`blocks.js:23`).
2. **Lista** de `[...(state.blocked||[])].sort((a,b)=>b.at-a.at)` — mais recentes primeiro (`blocks.js:22`).
3. **Cada linha** (`blocks.js:19`) — avatar com as iniciais, nome em `<b>`, subtítulo `"Bloqueado em <DD/MM>"` ou `"Bloqueada em <DD/MM>"` (gênero inferido por `feminine(name)` = nome terminando em "a", `blocks.js:10-11`), e `btn('Desbloquear','unblock-person', b.name,'outlined')`.

##### Estados

- **Vazio** (`blocks.js:23`): título `"Ninguém bloqueado"`, texto `"As pessoas que você bloquear aparecem aqui, para desbloquear quando quiser."`, ícone `cancel`, sem botão.
- **Carregando / esqueleto:** não existe.
- **Erro:** não existe.
- **Visita a outra cidade:** a lista não filtra por cidade — é global por conta. Sem faixa de aviso.
- **Desfazer:** bloquear avisa `` `${name} bloqueado|bloqueada.` `` com desfazer que chama `setBlocked(name,false)` (`blocks.js:36`); desbloquear avisa `` `${name} desbloqueado|desbloqueada.` `` **sem** desfazer (`blocks.js:37`).
- **Conteúdo bloqueado aberto por endereço/aviso:** `blockedContent` (`blocks.js:14`) mostra a página vazia com título `"Conteúdo de uma pessoa que você bloqueou"`, texto `"<nome> está nas suas pessoas bloqueadas."` e botão `"Ver mesmo assim"` (`peek-blocked`). Depois do "ver mesmo assim", `blockedStrip` (`blocks.js:12`) mostra `"Você bloqueou <nome>"` + botão `"Desbloquear"`.

##### Diferenças por viewport

- **375/768/1440:** só `.list-row` e a troca de navegação em 720px. Nada específico de `bloqueados`.

##### Diálogos, editores, folhas e menus abertos nesta rota

- **Nenhum diálogo próprio.** O fluxo de bloquear traz dois diálogos, acionados fora desta rota:
  - **Confirmar bloqueio** — `confirm('Bloquear <nome>?', 'Você deixa de ver as perguntas, respostas, anúncios e mensagens dele|dela, e ele|ela não consegue mais falar com você.\nEle|Ela não é avisado|avisada. Você pode desbloquear em Configurações.', …)` com botões `ok:'Bloquear'`, `cancel:'Cancelar'` (`blocks.js:27`).
  - **Menu `⋮` do conteúdo de outra pessoa** — `otherMenu` (`blocks.js:41`) monta via `openCreate` uma lista com `"Denunciar <o que for>"` (`report`) e, quando `blockable(name) && !isBlocked(name)`, `"Bloquear <nome>"` (`block-person`); o nome acessível do menu é `` `Ações d${what==='comentário'?'o':'a'} ${what}` ``. `blockable` exige nome de pessoa (regex em `app/state.js:35`) — não se bloqueia a si nem autores de exemplo. (mesmo overlay — ver 2.3, "Overlays transversais desta área", item 3.)

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `unblock-person` | `blocks.js:19`, `blocks.js:12` | nome | remove do `state.blocked`, limpa `blockPeek`, redesenha; avisa sem desfazer | `blocks.js:47` |
| `open-blocked` | `settings.js:5` | `''` | fecha diálogo e navega `bloqueados` | `blocks.js:45` |
| `block-person` | `blocks.js:41` (menu ⋮) | nome | abre o confirm de bloqueio | `blocks.js:46` |
| `peek-blocked` | `blocks.js:14` | `tipo|id` | libera o conteúdo com a faixa de bloqueado | `blocks.js:48` |
| `question-other-menu` | `features/community/question.js:4` | id | abre o ⋮ (com `"Ocultar pergunta"` quando não oculta) | `blocks.js:51` |
| `answer-other-menu` | detalhe da pergunta | `perguntaId~respostaId` | abre o ⋮ da resposta | `blocks.js:52` |
| `post-other-menu` | publicação de grupo | `grupoId~postId` | abre o ⋮ da publicação | `blocks.js:54` |
| `comment-other-menu` | comentário de grupo | `grupoId~postId~comentarioId` | abre o ⋮ do comentário | `blocks.js:56` |
| `report` | `blocks.js:41` (item do menu) | `ask|id`, `answer|…`, `post|…`, `comment|…` | abre Denunciar conteúdo | `handlers.js:39` |
| `undo` | `shell/toasts.js:10` | id | desfaz o bloqueio | `handlers.js:143` |

---

#### Overlays da área

##### 1. `openCity` — "Cidade e momento" (`features/profile/settings.js:1`)

- Aberto por: `city` (`views.js:6` → `handlers.js:62`); também pelo chip de cidade da barra (`navigation.js:60`).
- Tipo: diálogo comum (`showDialog`, kind padrão `generic` → folha inferior no celular, `shell/dialogs.js:27`).
- Campos:
  - `city-select` — `md-outlined-select`, rótulo `"Cidade que você quer consultar"`, opções `CITY_NAMES` (`data/demo/model.js:2`), selecionado `state.city`.
  - Nota: `"Sua cidade atual é <b><homeCity></b>. Nas outras cidades você consulta conteúdo sem publicar."`
  - `moment-select` — rótulo `"Seu momento"`, opções `[['moro','Moro na cidade'],['chegando','Estou chegando'],['saindo','Estou saindo']]`, selecionado `state.mode`.
  - `arrival-date` — `<input type="date">`, rótulo `"Data de chegada"`, `value=state.arrival`, `min=dateISO()`; visível só com `data-moment="chegando"`.
  - `leave-date` — idem, rótulo `"Data da saída"`, `value=state.leaveDate`; visível só com `data-moment="saindo"`.
  - `destination-select` — rótulo `"Destino"`, opções `CITY_NAMES` sem a cidade natal, selecionado `state.dest`; visível só com `data-moment="saindo"`.
  - `momentFields` esconde/mostra por `data-moment` (`settings.js:4`) e o `change` de `#moment-select` religa (`settings.js:1`).
- Botões: `"Cancelar"` (`close-dialog`, texto) e `"Aplicar"` (`apply-city`, preenchido).
- Erros (notificados por snackbar, `handlers.js:65`): `"Escolha uma cidade da lista."`, `"Informe a data de chegada."`, `"Informe a data de saída."`, `"Escolha o destino da mudança."`.
- Sucesso: **nenhuma mensagem.** Grava `state.city`, `state.mode`, e `state.arrival`/`leaveDate`/`state.dest` conforme o momento; zera `searchHood='Todos'`, `searchMin=searchMax=''`, `catalogAttrs` padrão; fecha e navega `inicio` (`handlers.js:66`).
- Só neste dispositivo: tudo (`mutate` → `localStorage`, `app/state.js:27`).

##### 2. `openSettings` — "Configurações" (`features/profile/settings.js:5`)

- Aberto por: `settings` no cabeçalho de `voce` (`views.js:6`), no trilho lateral (`navigation.js:65`) e por `family-settings` (`demo-actions.js:52`).
- Tipo: `showDialog(..., 'editor')` — marca `editor={kind:'settings'}` e `editorDirty=false`; em `bindDialog` qualquer input/change em campo ou switch do diálogo marca sujo (`shell/bindings.js:15`).
- Campos:
  - `profile-name` — `md-outlined-text-field`, rótulo `"Seu nome"`, `required maxlength="80" autocomplete="name"`.
  - `appearance-select` — rótulo `"Aparência"`, opções `[['auto','Automática'],['light','Clara'],['dark','Escura']]`, selecionado `state.prefs.appearance`.
  - `profile-hood` — `hoodPicker('profile-hood','Seu bairro', state.profile.hood||'', {required:false, help:"Serve para a distância nos filtros. Aparece no que você publica se “Mostrar meu bairro” estiver ligado."})`. Como `required:false`, o rótulo vira `"Seu bairro (opcional)"`; `maxlength="60"`, `autocomplete="off"`, `placeholder="Digite o bairro ou o CEP"`, ícone `search` como `leading-icon` e `supporting-text` com a ajuda (`shell/hood-picker.js:26-29`). Traz botão `"Usar minha localização"` quando a cidade tem base de bairros (`:29`) e um menu de sugestões; CEP nunca é gravado (`hoodValue`, `:24`; mensagem `HOOD_CEP_MSG` = `"Escolha o bairro na lista. O CEP não fica salvo."`, `:12`).
  - `privacy-hood` — `md-switch`, rótulo `"Mostrar meu bairro"`, `aria-label="Mostrar meu bairro"`, texto de apoio `"Desligado, só a cidade aparece no que você publica."`, ligado por `state.prefs.showHood`.
  - `privacy-family` — `md-switch`, rótulo `"Convites de família"`, `aria-label="Permitir convites de família"`, apoio `"Permitir criar convites no seu perfil."`, ligado por `state.prefs.familyOnly`.
- Lista de links (`.list.settings-links`), cada item com ícone + título + subtítulo + `chevron_right`:
  - `visibility_off` · `"Ocultados"` · `"Perguntas que só você deixou de ver"` · `open-hidden` · valor `''`
  - `cancel` · `"Pessoas bloqueadas"` · `"Quem você deixou de ver e de falar"` · `open-blocked` · `''`
  - `lock` · `"Política de privacidade"` · `"O que guardamos e quem vê"` · `open-legal` · `privacidade`
  - `gavel` · `"Código de conduta"` · `"Como conviver e denunciar"` · `open-legal` · `conduta`
  - `help` · `"Ajuda"` · `"Perguntas frequentes e fale com a gente"` · `support-open` · `ajuda`
- Linha de perigo, em lista separada, classe `danger-row`: `delete` · `"Apagar a conta"` · `"Remove seus dados deste aparelho"` · `support-open` valor `apagar-conta`.
- Nota final: `"Dados de exemplo e alterações ficam neste dispositivo. Verificação de identidade, envio de avisos e cobrança estão no modo teste."`
- Botões: `"Cancelar"` (`close-dialog`, texto) e `"Salvar"` (`save-settings`, preenchido).
- Erro: nome com menos de 3 letras → `"Informe um nome com pelo menos 3 letras."` (snackbar `error`); CEP no campo de bairro → `HOOD_CEP_MSG`; campo vazio passa por `validFields(['profile-name'])` (validação nativa, `features/listings/editor.js:11`).
- Sucesso: fecha, redesenha e avisa `"Configurações salvas"` (`handlers.js:70`). Grava `profile.name`, `profile.hood` e `prefs.{appearance,showHood,familyOnly}`.
- Sair com edição pendente: `confirm('Descartar alterações?','Você pode continuar editando ou descartar o que ainda não foi salvo.')` (`shell/dialogs.js:13`).
- Só neste dispositivo: nome, bairro, tema, bairro visível e convites de família.

##### 3. `openPrototype` — "Controles do protótipo" (`features/profile/settings.js:6`)

- Aberto por: `prototype` (`views.js:6`, `navigation.js:65` → `handlers.js:71`).
- Tipo: `showDialog(..., 'prototype')` — único overlay que anima como **gaveta lateral** (`translateX`, `shell/dialogs.js:27`), e não aceita o gesto de arrastar para baixo (`dialogs.js:33`).
- Conteúdo:
  - Nota: `"Dados fictícios para testar as jornadas. Você pode publicar e editar exemplos; nenhuma mensagem é enviada para pessoas reais."`
  - Linha de status dos componentes: `check_circle`/`error` + `"Material Web oficial · 2.5.0"` (`MATERIAL_VERSION`, `data/demo/material-version.js:1`) + `"Componentes oficiais carregados e incorporados ao HTML."` ou `"Falha ao carregar os componentes."` (testa `md-filled-button`, `md-outlined-text-field`, `md-dialog`, `md-select-option`, `md-switch`, `md-filter-chip`, `md-primary-tab`).
  - `prototype-stage` — rótulo `"Estágio da cidade"`, opções `[['live','Cidade ativa'],['seed','Cidade começando']]`, `state.stage`.
  - `prototype-incoming` — rótulo `"Famílias com transferência declarada"`, `type="number" min="0" max="10000"`, `state.incoming`.
  - `prototype-portal` — rótulo `"Resultado da consulta do CPF (entrada)"`, opções `[['verified','Vínculo confirmado'],['notfound','Vínculo não localizado'],['pending','Em análise'],['error','Fonte fora do ar']]`, selecionado `state.test?.portal || 'verified'`.
  - Botão condicional `"Aprovar a análise pendente"` (`entry-approve`, `outlined`, `verified_user`) — só quando `state.entry?.eligibility==='pending'`.
  - `verified-test` — `md-switch`, `"Verificação de teste"`, `aria-label="Perfil de teste verificado"`, apoio `"Controle de leitura e publicação."`, ligado por `state.profile.verified`.
  - Pilha de botões: `"Ver como dono do Bivaque"` (`owner-open`, preenchido, `shield_person`); `"Ver a entrada do zero"` (`onboarding`, `outlined`, `refresh`); `"Simular resposta a uma pergunta"` (`simulate-answer`, `forum`); `"Simular resposta na conversa"` (`simulate-message`, `chat_bubble`); `"Simular anúncio para um alerta"` (`simulate-alert`, `notifications`); `"Simular decisão do moderador"` (`simulate-moderation`, `shield_person`); `"Simular propostas de prestadores"` (`simulate-proposals`, `request_quote`); condicional `state.myBiz?.live` → `"Simular contato no meu negócio"` (`simulate-biz-contact`, `chat_bubble`); `"Simular resposta do suporte"` (`support-simulate`, `support`).
  - Nota: `"As respostas de exemplo usam o assunto da pergunta. Se não houver uma indicação relacionada, o protótipo não inventa uma resposta."`
- Botões: `"Recomeçar do zero"` (`reset-prototype`, texto) e `"Aplicar"` (`apply-prototype`, preenchido).
- `apply-prototype` (`handlers.js:72-76`): se o estágio mudou, `confirm('Trocar o cenário de teste?','Isso substitui as alterações locais pelos exemplos do cenário escolhido.')` → recria o estado a partir de `initial(stage)`, aplica `verified` e `incoming`, fecha, navega `inicio`, avisa `"Cenário atualizado"`. Se só mudou o resto, grava `state.profile.verified`, `state.incoming` e `state.test.portal`, fecha, redesenha e avisa `"Permissão de teste atualizada"`.
- `reset-prototype` (`handlers.js:77`): `confirm('Recomeçar do zero?','Anúncios, conversas, salvos e outras alterações feitas neste dispositivo serão substituídos pelos exemplos iniciais.')` → `initial()`, navega `inicio`, `toastClearAll()` (`shell/toasts.js:30`), avisa `"Protótipo reiniciado"`.
- Só neste dispositivo: tudo.

##### 4. `openNotices` — "Avisos" (`features/profile/demo-actions.js:29`)

- Aberto por: `notices` (`demo-actions.js:76`; badge na barra da Início, `navigation.js:60`), `notice-home` (`demo-actions.js:79`) e o restaurador `profileRestoreOverlay` (`demo-actions.js:36`).
- Nota: `"Avisos fictícios guardados neste navegador. Nenhuma notificação real é entregue."`
- Abas (só quando há avisos na cidade): `.notice-head` com `md-chip-set` `aria-label="Mostrar avisos"` e chips `"Todos (<n>)"` / `"Não lidos (<n>)"`, ação `notices-tab`, valores `all` / `unread`; e, se houver não lidos, botão `"Marcar todos como lidos"` (`notices-read-all`, texto, `check_circle`).
- Grupos por `when`: `"Hoje"` (quando `"Agora"`, `"Hoje"` ou `/^há \d+ (min|h)/`) e `"Anteriores"` (`demo-actions.js:31`).
- Cada linha (`noticeRow`, `:28`): ícone da tabela `NOTICE_ICONS` por `n.go[0]` (`conversa`, `anuncio`, `catalogo`, `desapegos`, `imoveis`, `negocio(s)`, `pedido(s)`, `chamados`, `pergunta`, `comunidade`, `evento`, `agenda`, `grupo`, `publicacao`) ou `notifications`; botão `notice-open` com o texto do aviso; subtítulo `` `${when||'Agora'} · ${unread?'não lido':'lido'}` ``; `iconBtn` `drafts`/`done` com ação `notice-read`, rótulo `"Marcar aviso como lido"`/`"Aviso lido"` e `disabled` quando já lido. Linhas não lidas recebem `.is-unread` (`styles/notices.css:4-12`).
- Estados vazios: sem avisos na cidade → `"Nenhum aviso nesta cidade"` / `"Os avisos de demonstração da sua cidade atual aparecerão aqui."` / `notifications_none`; aba "Não lidos" sem nada → `"Tudo em dia"` / `"Você leu todos os avisos desta cidade."` / `check_circle`.
- `p#notice-status` é `role="status" aria-live="polite"` — todas as mensagens desta folha saem ali.
- Botão extra: quando `state.city !== state.homeCity`, `btn("Consultar <homeCity>", 'notice-home','','text','home')`.
- Fechar: `"Fechar"` (`close-dialog`, texto).
- Mensagens literais: `"Não foi possível salvar a leitura. Os avisos continuam não lidos."`; `"Avisos marcados como lidos apenas neste navegador."`; `"Este aviso não está mais disponível."`; `"Consulte <cidade> para abrir este aviso."`; `"O conteúdo deste aviso não está mais disponível. O aviso permanece nesta lista."`; `"Não foi possível salvar a leitura. O aviso permanece não lido."`; `"Aviso marcado como lido apenas neste navegador."` (`demo-actions.js:78-85`).
- `notice-open` só navega se `noticeDestination` (`demo-actions.js:37-43`) achar um destino acessível na cidade atual; navega com `returnOverlay:'notices'` e o voltar reabre a folha (`navigation.js:52`).
- Só neste dispositivo: leitura e marcação.

##### 5. `openPlans` — "Planos para o negócio" (`features/profile/demo-actions.js:1`)

(mesmo overlay — ver 2.6.2, overlay 9)

##### 6. `openFamily` — "Família convidada" (`features/profile/demo-actions.js:2`)

- Aberto por: `family` (`views.js:6` → `demo-actions.js:51`).
- **Com `state.prefs.familyOnly` desligado:** nota `"Os convites locais estão desativados nas suas Configurações. Ative “Convites de família” para criar um código de demonstração."`; botões `"Fechar"` (`close-dialog`) e `"Abrir Configurações"` (`family-settings`, preenchido, `settings`).
- **Com convites ligados:** nota `"Use nomes fictícios. Estes códigos testam o cadastro apenas neste navegador; nenhum convite real é enviado."`
- Lista `state.invites` (linhas `.choice`): nome em `<b>`; subtítulo `<email> · Código: <code> · ` + `"utilizado"` / `"vale até <DD/MM>"` / `"vencido"`; `iconBtn('content_copy','copy-invite', code, "Copiar convite")` desabilitado se usado ou vencido; `iconBtn('delete','remove-invite', code, "Revogar convite")` desabilitado só se usado. Sem convites: `<p class="small muted">Nenhum convite criado.</p>`. Validade: `entryInviteValid` = 7 dias (`ENTRY_INVITE_DAYS`, `features/entry/login.js:6`, `:26`).
- Campos: `invite-name` — rótulo `"Nome fictício do familiar"`, `required minlength="2" maxlength="80" autocomplete="off"`; `invite-email` — rótulo `"E-mail do familiar"`, `type="email" required autocomplete="off"`, `supporting-text="O convite vale só para este e-mail, por 7 dias."`
- Áreas vivas: `p#family-status` (`role="status" aria-live="polite"`) e `div#family-copy` (recuperação de cópia).
- Botões: `"Fechar"` (`close-dialog`, texto) e `"Criar convite"` (`new-invite`, preenchido, `person_add`).
- Portão de permissão `profileFamilyAllowed` (`demo-actions.js:7-13`), todas as mensagens sem toast (saem em `#family-status`): sem a preferência ligada, reabre a folha; `role==='familia'` → `"Convites de família são criados por quem é militar, veterano ou pensionista."`; em visita → `` `Volte à sua cidade, ${homeCity}, para criar ou revogar convites locais.` ``; não verificado → `"Verifique o perfil de teste antes de criar ou revogar convites locais."`
- Erros de `new-invite` (`demo-actions.js:53-61`): nome curto/longo → `input.errorText` e feedback `"Use um nome fictício entre 2 e 80 caracteres."`; e-mail inválido (`entryEmailOk`) → `errorText` `"Informe o e-mail do familiar."` e feedback `"Informe o e-mail do familiar: o convite vale só para ele."`; colisão de código → `"Não foi possível criar um código único. Tente novamente."`; falha de gravação → `"Não foi possível salvar o convite. O nome foi mantido; libere espaço e tente novamente."` Código gerado: `"DEMO-"` + 8 hex maiúsculos.
- Sucesso de `new-invite`: redesenha, reabre a folha e avisa `"Código de demonstração criado apenas neste navegador."` com foco no botão de copiar o novo código.
- `copy-invite`: aviso `"Este código não está disponível para copiar."` quando não há convite válido; sucesso `"Código local copiado. Ele funciona apenas neste navegador."`; se `copyText` falhar (`features/messaging/actions.js:99`), injeta em `#family-copy` o campo `invite-copy` com rótulo `"Copie o código local"` (readonly, já com o código) e avisa `"A cópia automática falhou. Selecione o código abaixo e copie manualmente."`
- `remove-invite`: `confirm('Revogar código local?','O código de demonstração de <nome> será removido deste navegador.')`; já usado/inexistente → `"Este convite foi utilizado ou não está mais disponível."`; revogado → dar `render()`, reabrir a folha e avisar `"Código local revogado. Nenhum convite real foi enviado."`; falha → `"Não foi possível revogar o código. Ele permanece disponível."`
- Só neste dispositivo: os códigos (`state.invites`); nenhum convite é enviado.

##### 7. `openReport` — "Denunciar conteúdo" (`features/profile/demo-actions.js:94`)

- Aberto por: `report` no menu `⋮` de conteúdo de outra pessoa (`blocks.js:41` → `handlers.js:39`). O valor carrega `tipo|id` (`ask|…`, `answer|…`, `post|…`, `comment|…`).
- Campos: `report-reason` — `md-outlined-select`, rótulo `"Motivo"`, opções `[['','Escolher motivo'],['spam','Spam ou propaganda inadequada'],['fraud','Informação enganosa'],['privacy','Exposição de dados pessoais'],['abuse','Ofensa ou comportamento inadequado'],['other','Outro motivo']]`, vazio por padrão, `required`; `report-details` — rótulo `"Detalhes (opcional)"`, `type="textarea" rows="3" maxlength="1000"`.
- Nota: `"No modo teste, a denúncia fica registrada neste dispositivo."`
- Botões: `"Cancelar"` (`close-dialog`) e `"Registrar denúncia"` (`submit-report`, preenchido, valor `tipo|id`).
- Erro: sem motivo → `errorText` `"Escolha o motivo."` e foco no select (`features/owner/review.js:108`).
- Duplicado: fecha e avisa `"Você já denunciou este conteúdo. A equipe do Bivaque está revisando."` (`review.js:109`).
- Sucesso: avisa `"Denúncia registrada. A equipe do Bivaque revisa em até 24 h."` e a denúncia entra em `state.reports` com `status:'open'`, `label:reportLabel(...)` e `details` cortados em 1000 (`review.js:110-111`).
- Só neste dispositivo: a denúncia (sem envio real).

##### 8. Pedido de avisos — "Receba avisos do que importa" (`features/profile/push-install.js:20-28`)

- Aberto por: `maybeAskPush(reason)` — pelo botão `"Ativar"` da linha `pushRowHtml` (ação `push-ask`, `force=true`, `push-install.js:41`) e por `askPushSoon` depois de criar um alerta (`alerts.js:39`), publicar uma pergunta (`features/community/editor.js:3`) ou enviar um pedido de serviço (`features/requests/handlers.js:15`). `askPushSoon` espera 900 ms e não interrompe quem digita (`:19`).
- Tipo: `showDialog(..., 'push')`.
- Cartões de amostra (`PUSH_SAMPLES`, `:11-15`), até 3, com `<time>agora</time>`: `notifications` · `"Imóvel novo em Ponta Negra"` · `"Combina com o seu alerta de busca."`; `chat_bubble` · `"Ana respondeu sua pergunta"` · `"“Atende pelo plano, sim. Liga antes.”"`; `request_quote` · `"Nova proposta para o seu pedido"` · `"Mudanças Rio Negro enviou uma proposta."` — o primeiro é o do motivo.
- Nota: `"Avisamos só do que você pediu: respostas às suas perguntas, propostas aos seus pedidos, alertas de busca e encontros. Você muda isso quando quiser em Você → Avisos."`
- Botões: `"Agora não"` (`push-later`, texto) e `"Ativar avisos"` (`push-enable`, preenchido, `notifications_active`).
- Regras: não abre em visita (`readonly()`), com avisos ligados, com outro diálogo/confirm aberto; respeita `PUSH_REASK_MS = 7 dias` desde `prefs.pushAskedAt`; **mostrar já conta como pedido** — `prefs.pushAskedAt` é gravado antes de desenhar (`:25`), inclusive ao fechar por X, Esc ou arrasto.
- `push-later`: grava `pushAskedAt` e fecha, sem mensagem (`:42`).
- `push-enable`: grava `prefs.push='on'` e `pushAskedAt`, fecha, redesenha e avisa `"Avisos ativados neste protótipo. No app, o celular pede a sua permissão aqui."` (`:43`).
- `push-disable` (linha, não folha): grava `push='off'` e avisa `"Avisos no celular desativados"` (`:44`).
- Só neste dispositivo: `prefs.push` e `prefs.pushAskedAt`; nenhum pedido real de permissão.

##### 9. Instalação — folha "Instalar no iPhone" e `install-app` (`features/profile/push-install.js:39-47`)

- Acionado por: `install-app` na linha `installRowHtml`, que só aparece quando **não** é standalone e existe `beforeinstallprompt` ou é iOS (`:35-38`, `:29-30`).
- Com `installPrompt` disponível: chama `prompt()`; se a escolha não for `accepted`, avisa `"Instalação cancelada."`; erro → `"Não foi possível instalar agora."` (`:45`).
- No iOS (sem prompt): `showDialog('Instalar no iPhone', ...)` com `<ol class="install-steps">` de três passos — `"Toque em <SVG Compartilhar> Compartilhar, na barra do Safari."`, `"Escolha Adicionar à Tela de Início."`, `"Toque em Adicionar. O Bivaque abre direto da tela inicial."` — kind `install`, botão `"Entendi"` (`close-dialog`, preenchido) (`:46`).
- Instalado: evento `appinstalled` zera o prompt e avisa `"Bivaque instalado na tela inicial"` (`:10`).
- Também: `beforeinstallprompt` redesenha a rota `voce` quando disponível (`:9`).
- Só neste dispositivo: a decisão de instalar; nada vai para o `state`.

##### 10. `openVerifiedInfo` — "O que o selo “verificado” significa" (`shell/verified-info.js:7`)

- Aberto por: ação `verified-info` → `handlers.js:52`. O **único emissor possível** seria `verifiedBadgeHtml` (`verified-info.js:6`), que **não é chamada em nenhum arquivo de `src/`** — a folha está implementada e sem gatilho hoje.
- Conteúdo: quatro blocos ícone+título+texto:
  - `verified_user` · `"Vínculo com as Forças conferido"` · `"Antes de entrar, o Bivaque confere em fonte pública oficial (Portal da Transparência) que a pessoa é militar, veterana ou pensionista. Família entra por convite de quem já foi verificado. Os dados consultados não ficam guardados; fica só o resultado."`
  - `person` · `"O resto é declarado pela pessoa"` · `"Nome e cidade são informados por quem se cadastrou. O selo não confirma endereço."`
  - `sell` · `"O anúncio é de quem anuncia"` · `"Preço, estado do item e condições do imóvel são responsabilidade de quem publica. O selo não é garantia de negócio."`
  - `flag` · `"Combine com cuidado"` · `"Prefira ver pessoalmente, em lugar movimentado, e não pague adiantado. Se algo parecer errado, use “Denunciar”."`
- Nota: `"Neste protótipo, a verificação é simulada."`
- Botão: `"Entendi"` (`close-dialog`, preenchido).
- O rótulo do selo que abre a folha é parametrizável: `verifiedBadgeHtml(label='Perfil verificado')` (`:6`).

##### 11. Restaurador de overlay — `profileRestoreOverlay` (`features/profile/demo-actions.js:36`)

- Só trata `kind==='notices'`: zera `noticesTab='all'` e reabre Avisos. Retorna `false` para qualquer outro. É chamado pelo `popstate` do navegador (`navigation.js:52`, condição `context?.overlay`), que também recebe o foco anterior (`navigation.js:52`).

---

### 2.6 Negócios locais (catálogo, página do negócio, editor, planos, indicação e taxonomia)

#### 2.6.1 Rota `negocios` — sem parâmetro

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): `"Negócios locais"`
- Aba ativa (`activeTab`, `shell/navigation.js:54`): `origin` (não está nas listas explícitas — voltando da aba Comunidade fica `comunidade`, do Início fica `inicio`)
- De onde se chega:
  - Início desktop: `"Ver negócios"` — `sectionTitle('Serviços recomendados','Ver negócios','businesses')`, `features/home/desktop.js:39`
  - Aba Negócios da Comunidade: `"Ver todos os negócios"` — `features/community/views.js:3`
  - Guia, card 4: `"Ver negócios locais"` — `features/transfers/guide.js:1`
  - Paleta de comandos: `"Negócios locais"` → ação `businesses`, `shell/command-palette.js:5`
  - Salvos, estado vazio: `"Explorar negócios"` — `features/profile/views.js:9`
  - Busca: `search-explore` com valor `biz|<categoria>` — `app/handlers.js:48`
  - Início, atalho de intenção: `intent` com valor `biz` — `app/handlers.js:50`
  - Menu Criar (celular) e painel Criar (desktop ≥1024): `"Divulgar meu negócio"` → ação `my-biz`, `shell/create-menu.js:13` e `:28` (leva ao catálogo só quando não há página; com página vai para `negocio/<id>`)
- Desenhada por: `renderBusinesses` em `features/businesses/catalog.js:1` (arquivo de 1 linha)
- Helpers próprios: `businessCard` (`shell/primitives.js:23`), `cover` (`shell/primitives.js:2`), `empty` (`shell/primitives.js:18`), `filterChips` (`features/listings/catalog.js:1`), `pagedHtml`/`pagedFootHtml` (`shell/paged-list.js:7` e `:12`), `countHtml`/`avatarStack` (`shell/count-up.js:25` e `:27`), `sectionTitle`/`btn`/`iconBtn` (`shell/primitives.js:15`, `:5`, `:8`), `readonlyHtml` (`shell/navigation.js:108`), `isSpon` (`features/businesses/plans.js:23`), `cityBiz` (`app/state.js:45`), `matches` (`features/search/views.js:3`)
- Parâmetro: nenhum. A rota `catalogo`/`negocios` é sempre lista.

##### Conteúdo, de cima para baixo

1. **Cabeçalho da página** (`catalog.js:1`): `<h1>"Negócios locais"</h1>` e subtítulo `"Indicados pela comunidade de ${state.city}."`. À direita, só quando `!readonly()`, botão tonal `"Minha página"` com ícone `storefront` e ação `my-biz`.
2. **Faixa de cidade visitada** — `readonlyHtml()` (`shell/navigation.js:108`; chamado em `catalog.js:1`), só quando `state.city !== state.homeCity`: `"Você está conhecendo **{cidade}**. Sua cidade atual é {cidade de casa}."` com botão `"Voltar"` (ação `home-city`). A faixa usa a classe `context-strip readonly`.
3. **Faixa "Precisa contratar?"** (`catalog.js:1`), só quando `!readonly()`: um `<button class="context-strip" data-action="create-request">` com ícone `build`, texto em negrito `"Precisa contratar?"` e `<span class="small">"Descreva o serviço e receba até 5 propostas."</span>`, mais ícone `chevron_right`. `REQUEST_LIMIT=5` (`features/requests/model.js:4`). Tratada em `features/requests/handlers.js:3` → `openRequestEditor()` (`features/requests/views.js:23`).
4. **Campo de busca** (`catalog.js:1`): `md-filled-text-field id="biz-search" class="search-input" type="search" label="Serviço, nome ou bairro"` com `value` = `bizQuery` e ícone `search` em `leading-icon`. O binding está em `shell/bindings.js:8`: `input` atualiza `bizQuery` e, após 120 ms de debounce, troca apenas o innerHTML de `#business-results` (não re-renderiza a tela) e chama `pagedWatch()`.
5. **Pílulas de categoria** (`catalog.js:1`): `filterChips(['Todos', ...new Set(cityBiz().map(b=>b.cat))].map(x=>[x,x]), bizCat, 'biz-filter')` — valor e rótulo iguais; a primeira é sempre `"Todos"`. A lista de categorias sai das páginas **visíveis** na cidade (`cityBiz()` já remove suspensas e pausadas), não da taxonomia inteira: uma categoria sem negócio visível não ganha pílula. `filterChips` (`features/listings/catalog.js:1`) gera `<div class="filter-row" data-seg="biz-filter">` com `md-filter-chip` (selected = `bizCat`), `data-action="biz-filter"` e `aria-label="Filtrar por {rótulo}"`.
6. **Bloco `#business-results`** (`catalog.js:1`), nesta ordem:
   - **`<section class="section">` "Patrocinado"** — só quando `sponsors.length` (`sponsors = list.filter(isSpon)`). Cada item é um `businessCard` dentro de `.card-grid`.
   - **`<section class="section">` "Indicações da comunidade"** — sempre presente (mesmo sem itens). Quando `organic.length`, chama `pagedHtml('biz', `${state.city}|${bizCat}|${bizQuery}`, organic, businessCard, {noun:'negócios', end:…})`.
     - `organic = list.filter(b => !isSpon(b))`; a ordem de `list` é `sort((a,b)=>b.recN-a.recN)`.
     - Filtro anterior: `bizCat==='Todos' || b.cat===bizCat`, e `matches(bizQuery, b.name+' '+b.cat+' '+b.svc.join(' ')+' '+(b.specs||[]).join(' ')+' '+b.hoods.join(' '))` — a busca cobre nome, categoria, serviços, especialidades e bairros, com sinônimos de `SYNONYMS` via `matches` (`features/search/views.js:3`).
   - Quando `!organic.length`: `empty('Nenhum negócio encontrado','Experimente outro serviço ou bairro.','storefront')` — ícone `storefront`, sem botão de ação (`empty` só cria botão se receber `action`, `shell/primitives.js:18`).
   - **Bloco final "Não achou quem procura?"**: passado como `end` de `pagedHtml` (`catalog.js:1`), e é `''` quando `readonly()`. Conteúdo: `<div class="paged-end">` com ícone `build`, `<b>"Não achou quem procura?"</b>`, `<small>"Descreva o serviço e receba até 5 propostas."</small>` e botão tonal `"Pedir"` (ação `create-request`).
     - **Só aparece com mais de 24 indicações orgânicas.** `pagedFootHtml` (`shell/paged-list.js:15`) devolve o `end` apenas no ramo `total>size` com `size=LIST_PAGE=24` (`shell/paged-list.js:5`). Com 1 a 24 resultados o rodapé é vazio e o bloco final não é desenhado. A faixa "Precisa contratar?" do item 3, essa sim, aparece sempre fora de leitura.
7. **Nota de rodapé** (`catalog.js:1`): `<p class="small muted" style="margin-top:20px">"Destaques pagos ficam separados das indicações da comunidade."</p>`.
8. **Botão final** (`catalog.js:1`), dentro de uma `<section class="section">`, só quando `!readonly()`: `btn('Indicar um negócio','indicate','','outlined','thumb_up')`.

##### Cartão de negócio (`businessCard`, `shell/primitives.js:23`)

`<article class="photo-card">` com:
- botão de salvar sobreposto (`iconBtn` com `class="save-card"`, `aria-pressed`), ícone `bookmark`/`bookmark_border`, ação `save-biz`, rótulo `"Remover negócio dos salvos"` / `"Salvar negócio"`;
- `<button class="card-link" data-action="open-biz" data-value="{id}">` envolvendo capa + corpo;
- `cover(b, tag)` (`shell/primitives.js:2`): `<div class="cover">` com `<img loading="lazy">` (ou `<div class="photo-fallback">` com o ícone do negócio, `x.icon || 'photo_camera'`) e `<span class="pill">` no canto. A tag é, em ordem: `'Patrocinado'` se `isSpon(b)`, senão `'Indicado pela comunidade'` se `b.claimed===false`, senão `b.cat`;
- `<h3>{name}</h3>`;
- `<p class="card-meta">{cat} · {hoods[0] || city}</p>`;
- `<p class="card-line">` com ícone `hourglass_top` + `"Aguardando o responsável"` quando `claimed===false`; senão ícone `forum` + `"{recN} indicações da comunidade"`, ou `"Novo na cidade"` quando `recN` é 0;
- `<p class="card-line">` extra com ícone `sell` + `b.disc` quando existe benefício.

##### Estados

- **Vazio (nenhuma indicação orgânica)**: `empty('Nenhum negócio encontrado','Experimente outro serviço ou bairro.','storefront')` — `catalog.js:1`. Ocorre também quando a busca ou a pílula não casam com nada. A seção "Patrocinado" some junto (renderizada só com `sponsors.length`).
- **Vazio total (cidade sem negócios)**: mesmo bloco acima. Não há estado vazio alternativo para "cidade começando" — os dados de exemplo (`data/demo/source.js:1`) trazem 9 negócios.
- **Carregando / esqueleto**: não há esqueleto na primeira carga. Na paginação automática, `pagedAuto` (`shell/paged-list.js:32`) troca o rodapé para `"Carregando mais N…"` e insere 2 divs `.paged-skel` antes de acrescentar o bloco seguinte. O rodapé de paginação em si é `"Mostrando N de T negócios"` + barra + botão `"Mostrar mais N"` (ação `list-more`) — `shell/paged-list.js:14`.
- **Erro / indisponível**: rota inexistente cai no fallback de `render` (`shell/navigation.js:107`): `empty('Página indisponível', navigationProblem || 'Confira o endereço ou volte ao início.','link_off','home','Ir para o início')`.
- **Visita a outra cidade (`readonly()`)**: aparece a faixa do item 2 e somem o botão `"Minha página"`, a faixa `"Precisa contratar?"`, o botão `"Indicar um negócio"` e o bloco `end` ("Não achou quem procura?"). O catálogo continua listando os negócios da cidade visitada, porque `cityBiz()` filtra por `state.city` (`app/state.js:45`).
- **Sem acesso / perfil não verificado**: quem publica passa por `canPost()` (`app/state.js:59`): `state.signedOut` bloqueia; `readonly()` avisa `"Você está consultando {cidade}. Publique na sua cidade, {cidade de casa}."`; perfil não verificado abre o diálogo `"Perfil em análise"` com `"Publicar libera quando a equipe aprovar seu perfil. Nada foi publicado."` e botão `"Voltar"`. Ler o catálogo não exige verificação.
- **Página suspensa / pausada**: não aparece aqui — `cityBiz()` (`app/state.js:45`) remove `!x.suspended && !x.paused`.
- **Negócio salvo (`b.saved`)**: só troca o ícone do cartão; a lista de salvos é outra rota (`features/profile/views.js:9`, seção `"Negócios"`).
- **Somente leitura, outros**: nenhum.

##### Diferenças por viewport

Procurei media queries em `styles/catalog.css` e `styles/detail-immersive.css`, mais as globais de `styles/base.css`. Resultado:

- **`styles/catalog.css` não contém nenhuma regra das classes desta rota.** O arquivo trabalha `.fpills`/`.fpill`/`.fbar`/`.fsort`/`.fpanel` (filtros de Desapegos/Imóveis) e `.cmap*`/`.agenda-*`. A única linha que toca a minha área é `styles/catalog.css:17` — `.photo-card>.card-link{display:flex;flex-direction:column;justify-content:flex-start}` —, que vale para `businessCard`. As media queries `min-width:1024px` (`:4`, `:12`) e `max-width:479px` (`:110`) do arquivo miram `.fpills`, `.fbar` e `.fview-label`, que esta rota não usa.
- **A fila de pílulas não quebra linha em nenhum viewport.** `filterChips` monta `.filter-row` com `overflow:auto` e `md-chip-set{display:flex;flex-wrap:nowrap}` (`styles/base.css:27`); não achei media query que mude isso em `catalog.css`, `base.css` nem `detail-immersive.css`. O wrap que existe em `styles/catalog.css:4` é de `.fpills`, classe diferente. Em 375/768/1440 as pílulas rolam horizontalmente.
- **`.card-grid`**: 1 coluna abaixo de 480 px (`styles/base.css:28`), 3 colunas a partir de 720 px (`:29`), 4 a partir de 1200 px (`:30`). Logo: 375 → 1 coluna; 768 → 3; 1440 → 4.
- **375**: `.page-head>md-filled-tonal-button` com rótulo a 13 px e `padding: 0 12px`; `.context-strip` a 13 px; `.photo-card .card-body h3` a 16 px; `md-dialog` com `width: calc(100vw - 24px)` (`styles/base.css:28`).
- **768**: `--space:28px`, `--rail:96px`; `.section-title h2` volta a 20 px; `.card-body{padding:16px 18px 20px}` só a partir de 1200 (`:30`).
- **1440**: 4 colunas de cartão, `.section-title h2` a 22 px, `.page{padding-top:36px}` (`styles/base.css:30`). `.photo-card` não muda de altura fixa — a capa mantém `aspect-ratio:16/9` (`styles/base.css:27`), exceto abaixo de 480 px, onde `.card-link .cover{aspect-ratio:16/9}` é reafirmado (`:28`).
- **Alto contraste**: `@media (forced-colors:active)` dá `border:1px solid CanvasText` a `.pill`, `.photo-card` e `.context-strip` (`styles/high-contrast.css:1`).
- **Movimento**: a lista entra em cascata (`.photo-card`/`.list-row`, até 10 itens, 28 px) via `motionStagger` (`motion/bold-transitions.js:37`), desligada com `prefers-reduced-motion` (`:7`).

##### Diálogos, editores, folhas e menus abertos nesta rota

###### 1. Editor de página — `openBusinessEditor` (`features/businesses/editor.js:1`)

Abre por `"Minha página"` (ação `my-biz`, `catalog.js:1`) quando **não** há `state.myBiz.live`, e por `edit-biz` (`detail.js:3` / menu ⋮). Guardas: `if(!canPost())return;` e, com `id` informado, `if(b && b.mine!==true && b!==state.myBiz)return;` (`editor.js:1`). `editor = {kind:'biz', id:b?.id||null, photos:[...(b?.photos||[])]}`; `editorDirty=false`. `showDialog(..., 'editor')`.

- **Título**: `b?.live ? 'Editar página' : 'Criar página do negócio'` (`editor.js:1`).
- **Campos** (todos dentro de `<div class="form-grid">`):

| id | rótulo | tipo | limites / validações | arquivo:linha |
|---|---|---|---|---|
| `biz-name` | `"Nome do negócio"` | `md-outlined-text-field` | `required minlength="3" maxlength="100" class="full"` | `editor.js:1` |
| `biz-category` | `"Tipo de serviço"` | `md-outlined-select` | opções `[['','Escolher'], ...GROUP_NAMES]`, `required` | `editor.js:1` |
| `biz-hours` | `"Horário ou agendamento"` | texto | `required maxlength="100"` | `editor.js:1` |
| `biz-specs-wrap` (contém `#biz-specs`) | `"Especialidades (opcional)"` | `md-chip-set` de `md-filter-chip` | sem marcação = atende o grupo todo | `editor.js:11` |
| `biz-hoods-entry` (chips em `#biz-hoods-chips`) | `"Bairros em que atende"` | chips (`md-input-chip remove-only`) + entrada de texto | `maxlength="60"`, `supporting-text="Digite um bairro e toque Enter."` | `editor.js:4` |
| `biz-services-entry` (chips em `#biz-services-chips`) | `"Serviços"` | chips + entrada de texto | `maxlength="60"`, hint `"Digite um serviço e toque Enter."` | `editor.js:4` |
| `biz-bio` | `"Apresentação"` | textarea `rows="3"` | `maxlength="1500" class="full"` | `editor.js:1` |
| `biz-discount` | `"Benefício para a comunidade (opcional)"` | texto | `maxlength="120" class="full"` | `editor.js:1` |
| `biz-whatsapp` | `"WhatsApp (opcional)"` | `type="tel" inputmode="tel" autocomplete="tel"` | `supporting-text="DDD e número."` | `editor.js:1` |
| `biz-instagram` | `"Instagram (opcional)"` | texto | `supporting-text="Nome do perfil, sem @."` | `editor.js:1` |
| `biz-website` | `"Site (opcional)"` | `type="url" class="full"` | — | `editor.js:1` |
| `upload-photos` (bloco `photoUploadHtml()`) | `"Fotos"` | `input[type=file]` oculto | `accept="image/jpeg,image/png,image/webp,image/avif" multiple`; `"Até 6 imagens"`; rótulo `"Adicionar fotos"` + `"ou arraste para cá"` | `features/listings/editor.js:1` |

- **Notas literais**: `"Sem marcar nenhuma, você recebe pedidos de todo o grupo."` (`editor.js:11`, dentro de `#biz-specs-wrap`); `"A primeira foto será a capa. Você pode remover e adicionar outras imagens."` (`features/listings/editor.js:1`).
- **Reação em cadeia**: mudar `biz-category` reescreve `#biz-specs-wrap` com `specChips(novo valor, [])` (`editor.js:1`), apagando especialidades já marcadas.
- **Chips de entrada** (`chipEntry`/`chipValues`/`chipEntryCommit`/`bindChipEntries`, `editor.js:4`–`:10`): Enter ou vírgula confirmam o texto; colar com vírgula/quebra de linha confirma após timeout; remover um chip devolve o foco ao campo; duplicatas são ignoradas por `norm()`. `chipValues` chama `chipEntryCommit` antes de ler, então o texto digitado e não confirmado também entra. `bindChipEntries(dialog)` é ligado em `shell/bindings.js:16`. Fotos: `#upload-photos` é ligado em `shell/bindings.js:18` → `addEditorPhotos` (`features/listings/photos.js:12`), que reduz para no máximo 1400 px e grava JPEG a 0,78; `"A foto N agora é a capa."` vem de `coverEditorPhoto` (`features/listings/photos.js:25`).
- **Botões**: `btn('Cancelar','close-dialog','','text')` e `btn(b?.live ? 'Salvar alterações' : 'Criar minha página','submit-biz','','filled')` (`editor.js:1`).
- **Mensagens de erro** (`notify(..., 'error')`), na ordem em que o código testa (`editor.js:2`):
  1. `"Confira o DDD e o número do WhatsApp."` — telefone com dígitos fora de 10–15.
  2. `"Informe o nome válido do perfil do Instagram."` — fora de `/^[a-zA-Z0-9._]{1,30}$/`.
  3. `"O site deve começar com https:// ou http://."`
  4. `"Escolha o tipo de serviço do negócio."` — categoria fora de `GROUP_NAMES`.
  5. `"Bairro com CEP: escreva só o nome do bairro. O CEP não fica salvo."` — foca `#biz-hoods-entry`.
  6. `"Adicione pelo menos um bairro."` — foca `#biz-hoods-entry`.
  7. `"Adicione pelo menos um serviço."` — foca `#biz-services-entry`.
  - Antes disso, `validFields(['biz-name','biz-category','biz-hours','biz-website'])` (`features/listings/editor.js:11`) usa `reportValidity()` nativo e foca o primeiro campo inválido.
- **O que é gravado** (`editor.js:2`): `state.myBiz = { …(old || {id, recN:0, says:[], views:0, icon:'storefront', saved:false, …(state.bizSuspended?{suspended:true}:{})}), …data, mine:true, live:true, claimed:true, city:state.homeCity, ini:initals(name), owner:`${state.profile.name}, perfil de teste verificado`, demo: data.photos.some(p=>!p.startsWith('data:')) }`. `hoods` passam por `hoodInfo(h)?.name || h` (nome canônico do bairro).
- **Sucesso**: `await closeDialog(true); navigate('negocio', id); notify(old ? 'Página atualizada' : 'Página criada')` (`editor.js:2`).
- **Fechar com alterações**: `closeDialog` (`shell/dialogs.js:13`) intercepta e abre `"Descartar alterações?"` com `"Você pode continuar editando ou descartar o que ainda não foi salvo."` (botões `"Continuar"` e `"Confirmar"` por padrão de `confirm`, `shell/dialogs.js:20`).

###### 2. Indicar um negócio — `openIndicate` (`features/businesses/indication.js:1`)

Abre pelo botão `"Indicar um negócio"` (`catalog.js:1`) e pelo menu Criar (`"Indicar um negócio"`, `shell/create-menu.js:11` e `:26`). Guarda: `if(!canPost())return;`. `editor = {kind:'indicate', photos:[]}`.

- **Título**: `"Indicar um negócio"`. `showDialog(..., 'editor')`.
- **Campos**:

| id | rótulo | tipo | limites | arquivo:linha |
|---|---|---|---|---|
| `ind-name` | `"Nome do negócio"` | texto | `required minlength="3" class="full"` | `indication.js:1` |
| `ind-category` | `"Tipo de serviço"` | select `[['','Escolher'],...GROUP_NAMES]` | `required` | `indication.js:1` |
| `ind-hood` | `"Bairro"` | campo de bairro com busca (`hoodField` → `hoodPicker`) | `required` quando a cidade tem base; aceita nome, CEP (descartado) ou localização | `features/profile/hood-privacy.js:15`, `shell/hood-picker.js:26` |
| `ind-why` | `"Por que você indica?"` | textarea `rows="3"` | `required minlength="12" class="full"` | `indication.js:1` |

- **Nota**: `"A página nasce com a sua indicação. O responsável poderá completar as informações depois."` (`indication.js:1`).
- **Botões**: `"Cancelar"` (text) e `btn('Publicar indicação','submit-indicate','','filled','thumb_up')`.
- **Erros** (`indication.js:2`): `"Escolha o tipo de serviço do negócio."`; e `hoodProblem(hood)` — `"Escolha o bairro."` ou `"Escolha o bairro na lista. O CEP não fica salvo."` (`shell/hood-picker.js:12` e `:25`).
- **Duplicata**: procura `cityBiz().find(b=>norm(b.name)===norm(name))`. Se já existe **e** `myInd`, fecha o diálogo, navega para a página existente e avisa `"Você já indicou este negócio."` (info).
- **O que é gravado**: se já existe (mesmo nome, sem `myInd`): `recN++`, `myInd=true`, `says.push([initals(nome), 'me', nome, why])`. Se é nova: `state.biz.unshift({id, name, city:state.homeCity, cat, hoods: hood?[hood]:[], svc:[], bio:'', hours:'A confirmar com o responsável', photos:[], icon:'storefront', ini, claimed:false, myInd:true, recN:1, says:[[ini,'me',nome,why]], saved:false})` — nasce **sem** `live` e **sem** `svc`/fotos, com `claimed:false`.
- **Sucesso**: `navigate('negocio', id)` + `notify(duplicate ? 'Sua indicação foi adicionada' : 'Negócio indicado')`.
- Os chips de bairro/serviço do outro diálogo não existem aqui: a indicação cria o negócio com um único bairro e zero serviços.

---

#### 2.6.2 Rota `negocio` — id de negócio

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): `"Negócio local"`
- Aba ativa (`activeTab`, `shell/navigation.js:54`): `origin` (de `comunidade` volta marcando Comunidade; de `inicio`, Início)
- De onde se chega:
  - `open-biz` (`app/handlers.js:108`) a partir de: cartão do catálogo (`shell/primitives.js:23`), cartão da Início (`features/home/desktop.js:38`), bloco `"Negócios relacionados"` da pergunta (`features/community/question.js:8`), chip `"Ver empresa"` do pedido/proposta (`features/requests/views.js:9` e `:36`), bloco de origem da resposta (`features/community/question.js:6`), oferta de grupo (`features/groups/views.js:91`), diálogo `answer-origin` (`app/handlers.js:138`), resultados da paleta de comandos (`shell/command-palette.js:25`), tabela do Painel do Bivaque (`features/owner/business-team.js:14` e `:29`, `features/owner/review.js:15` e `:25`).
  - Direto, por navegação interna: `submit-biz` (`editor.js:2`), `submit-indicate` (`indication.js:2`), `my-biz` com página (`app/handlers.js:110`), ação `resume` para `lastViewed.type==='biz'` (`app/handlers.js:27`).
  - `open-biz` grava `remember('biz',id)`, incrementa `b.views` quando `!b.mine`, e **troca a cidade** se o negócio for de outra cidade (`mutate(()=>state.city=b.city)`, `app/handlers.js:108`).
- Desenhada por: `renderBusiness` em `features/businesses/detail.js:1`–`:6`; helpers próprios `pausedStrip` (`detail.js:11`), `ownBizAction` (`detail.js:13`), `bizLeaveRequests` (`detail.js:22`), `deleteMyBiz` (`detail.js:23`), `businessMetrics` (`detail.js:28`), `BIZ_PAUSE_NOTE` (`detail.js:10`)
- Parâmetro: id de negócio (`bizById`, `app/state.js:55` — busca em `state.myBiz` primeiro e depois em `state.biz`)

##### Conteúdo, de cima para baixo

`renderBusiness` monta `<div class="detail-layout">` com coluna principal + `<aside class="detail-aside">`.

**Barra de ações fixa** (`actionsBar`, `shell/navigation.js:69`), sempre com, nesta ordem (`detail.js:3`):

1. Salvar: `iconBtn(b.saved?'bookmark':'bookmark_border','save-biz',b.id, b.saved?'Remover negócio dos salvos':'Salvar negócio', aria-pressed="…")`
2. Compartilhar: `iconBtn('share','share','negocio|{id}','Compartilhar negócio')`
3. Terceiro lugar, conforme o estado:
   - `b.mine` → `btn('Editar página','edit-biz',b.id,'filled','edit')` **e** `iconBtn('more_vert','biz-menu',b.id,'Opções da página')`
   - senão `susp` (suspenso) → **nada**
   - senão `unclaimed` (`b.claimed===false`) → `btn(b.myInd?'Convidar responsável':'Também indico', b.myInd?'invite-owner':'recommend-biz', b.id,'filled', b.myInd?'send':'thumb_up')`
   - senão → `btn('Pedir orçamento','quote',b.id,'filled','request_quote')`
   - **Ordem importa**: um negócio suspenso que seja meu ainda mostra `"Editar página"` e o ⋮, porque `b.mine` é testado antes de `susp`.

**Coluna principal** (`detail.js:5`):

1. **Capa** (`<div class="detail-hero">`): `<img src>` com `alt={name}` e botão `class="hero-zoom" data-action="lightbox" data-value="biz"` com ícone `image` + `"Ver foto"` — **só quando existe foto** (`image(b.photos?.[0])`, `shell/primitives.js:1`). Rodapé (`<span class="pill">`) mostra `"Patrocinado"` se `isSpon(b)`, senão `b.cat`. Sem foto, o hero fica só com a pílula — não há `photo-fallback` aqui (diferente de `cover`/`renderItem`).
   - **Não existe galeria de miniaturas nesta rota.** O `.gallery` com botões `data-action="gallery"` só é montado em `features/listings/detail.js:9`; o `case 'gallery'` (`app/handlers.js:104`) só trata `item`. Aqui há uma foto em destaque e o lightbox abre todas com índice 0 (`app/handlers.js:91`, ramo `value==='biz'`: `openLightbox((b.photos||[]).map(image).filter(Boolean), 0, b.name)`), mas o editor aceita até 6 fotos — **as fotos 2..6 são inalcançáveis pela interface desta página**.
2. **`b.demo`** → `<p class="labelled-example">"Foto ilustrativa do negócio de exemplo."</p>`.
3. **Título** (`<div class="detail-title">`): `<h1>{name}</h1>` e `<p class="small muted">{cat}[ · {specs.join(', ')}] · {city}</p>` — as especialidades aparecem em texto, separadas por `·`, só se `b.specs?.length`.
4. **Faixa de suspensão** — `susp` (ou seja, `!!b.suspended`): `<div class="context-strip readonly" role="status">` com ícone `lock`, `<b>"Página suspensa pela moderação"</b>` e `"Ela não aparece no catálogo nem na busca, e não recebe pedidos."`
5. **Faixa de pausa** — `b.mine && b.paused` → `pausedStrip(b)` (`detail.js:11`): ícone `visibility_off`, `<b>"Página pausada"</b>`, `"Pausada, a página sai da busca e do catálogo; você reativa quando quiser."` e botão `"Reativar"` (ação `resume-biz`, ícone `visibility`). **A faixa de pausa só é montada para o dono** — quem não é dono não vê aviso nenhum.
6. **Faixa de indicação sem responsável** — `unclaimed`: `<div class="context-strip readonly">` com ícone `hourglass_top` e `"Esta página foi indicada por um membro. O responsável ainda não confirmou as informações."` (sem `role="status"`, ao contrário das duas anteriores).
7. **Benefício** — `b.disc` → `<div class="business-benefit">` com ícone `sell`, `<b>"Benefício para a comunidade"</b>` e o texto de `disc` (estilo em `styles/base.css:27`: fundo `tertiary-container`).
8. **Seção `"Como pode ajudar"`**: `<p class="detail-copy">{b.bio || 'O responsável poderá completar a descrição quando assumir a página.'}</p>`. O texto de fallback só aparece com bio vazia — inclusive quando **não** é página indicada.
9. **Seção `"Serviços"`**: `md-chip-set` com `md-assist-chip label="{svc}"` e ícone `check` em slot `icon`. Se `!b.svc.length`: `<p class="small muted">"Serviços ainda não informados pelo responsável."</p>`.
10. **Seção `"Onde atende"`**: `md-chip-set` com `md-assist-chip label="{hood}"` e ícone `location_on` em slot `icon`. Sem bairros, o `md-chip-set` fica vazio e **não há mensagem de fallback** (diferente de Serviços).
11. **Seção `"O que a comunidade diz"`**: `<div class="stack">` com `bizSays(b)` (relatos sem pessoas bloqueadas, mantendo o próprio — `app/state.js:43`). Cada item: `<div class="answer">` com `<div class="row">` (avatar com as iniciais, `<b>{nome}</b>`) e `<p>{relato}</p>`. Sem relatos: `<p class="small muted">"Os relatos aparecem quando um membro indica este negócio."</p>`.
12. **Seção `"Ver a origem das indicações"`**, condicional a `asks.length`: perguntas onde `askVisible(q) && q.city===b.city && q.answers.some(a=>a.biz===b.id)` (`detail.js:4`), renderizadas com `questionRow` (`shell/primitives.js:24`).

**Coluna lateral** (`<aside class="detail-aside">`, `detail.js:5`):

1. **Indicadores** — `<div class="facts" style="grid-template-columns:1fr 1fr">` (sobrescreve as 3 colunas do CSS) com:
   - `<div class="fact fact-proof">`: `countHtml(b.recN)` (número animado, `shell/count-up.js:25`) + `<span>"indicações da comunidade"</span>` + `avatarStack(bizSays(b), b.recN||0)` (até 3 avatares + `"+N"`, `shell/count-up.js:27`).
   - `<div class="fact">`: ícone `schedule` + `<span>{b.hours || 'Confirme com o responsável'}</span>`.
   - **Não existe avaliação, nota ou estrelas em lugar nenhum da tela.** O que existe é a contagem de indicações e o horário. Também não há campo `rating` nos dados (`data/demo/source.js:1`).
2. **Selo do responsável** — `b.owner` → `<div class="seller">` com ícone `verified_user`, `<span class="small grow">{owner}</span>` e `iconBtn('info','verified-info','','O que o selo “verificado” significa','aria-haspopup="dialog"')`. (mesmo overlay — ver 2.5.1, overlay 10.)
3. **Se `b.mine`** → `businessMetrics(b)` (`detail.js:28`), descrito abaixo; **senão** → `<div class="stack">` com:
   - `btn('WhatsApp','whatsapp',b.id,'outlined','call')` — só se `!unclaimed && !susp && b.whatsapp`
   - `btn('Instagram','instagram',b.id,'outlined')` — mesmas condições e `b.instagram` (sem ícone)
   - `btn('Site','website',b.id,'outlined','open_in_new')` — mesmas condições e `b.website`
   - Terceiro lugar: `susp` → nada; `unclaimed` → `btn('Sou o responsável','claim-biz',b.id,'outlined','storefront')`; senão → `btn('Indicar este negócio','recommend-biz',b.id,'outlined','thumb_up')`
   - `btn('Denunciar página','report',`biz|${b.id}`,'text','flag')` — **sempre**, inclusive suspenso e indicado.

**`businessMetrics(b)` — dono** (`detail.js:28`): `<section class="section">` com `sectionTitle('Resultados da sua página')` e `.metric-grid` de três números: `{b.views||0}` → `"visitas"`, `ts.length` → `"pedidos de contato"`, `ts.filter(t=>t.msgs.some(m=>m.me)).length` → `"conversas respondidas"` (`ts` = threads `about.type==='biz' && about.id===b.id` sem bloqueados). Abaixo, `<p class="small muted">`:
- com `paidPlans()`: `"Plano {grátis|de teste}"`
- sem `paidPlans()`: `"Página gratuita, com conversas sem limite"`
- e sempre `" · os indicadores contam as ações realizadas nesta versão."`

Depois `planStatusHtml()` (`features/businesses/plans.js:42`, devolve `''` sem `paidPlans()`) e um `<div class="stack">` com `btn('Ver pedidos recebidos','biz-leads',b.id,'outlined','inbox')`, `btn(paidPlans() ? 'Conhecer os planos' : 'Planos (em breve)','plans','','tonal','trending_up')` e `btn('Copiar link da página','share',`negocio|${b.id}`,'text','link')`.

**Regras de estado do negócio** (todas lidas do código):
- `isSpon(b)` = `paidPlans() && !!b && (!!b.spon || spotActive(b))` (`plans.js:23`). `paidPlans()` = `!!window.BIVAQUE_LABS?.paidPlans` (`plans.js:27`). `spotActive(b)` exige `paidPlans() && state.myBiz?.id===b.id && subscription.spot.bizId===b.id && spot.until > Date.now() && bizOpen(b)` (`plans.js:22`).
- `bizOpen(b)` = `!!b?.live && !b.suspended && !b.paused` (`features/groups/editors.js:3`).
- `bizLive(b)` = `!!b && b.live!==false && !b.suspended && !b.paused` (`app/state.js:40`); `bizVisible(b)` = `!!b && (!!b.mine || bizLive(b))` (`app/state.js:41`).
- `cityBiz()` = páginas da cidade atual, sem `suspended` e sem `paused`, com `state.myBiz` na frente se `live` (`app/state.js:45`).
- `claimed:false` (indicada) ⇒ sem WhatsApp/Instagram/Site, sem `"Pedir orçamento"`, com faixa de aviso e `"Sou o responsável"`.
- `suspended` ⇒ faixa de aviso, nenhuma ação de contato, `quote` recusado com `"Esta página está suspensa pela moderação."` (`features/messaging/actions.js:88`).
- `paused` ⇒ fora do catálogo/busca/propostas; faixa com `"Reativar"` só para o dono.
- `live:false` ou ausente (página de exemplo/indicada que nunca foi publicada) ⇒ `bizOpen` falso; `my-biz` gera nova página em vez de abrir a existente (`app/handlers.js:110`).

##### Estados

- **Parâmetro inexistente**: `bizById` devolve `undefined` → `accessibleRecord(undefined)` é `undefined` → `unavailable()` (`features/listings/detail.js:1`): `empty('Conteúdo indisponível nesta cidade','Volte para a página inicial ou selecione a cidade em que o conteúdo foi publicado.','location_off','home','Ir para o início')`. **A mensagem fala de cidade, não de "não encontrado"** — um id inválido recebe o mesmo texto de um negócio de outra cidade.
- **Negócio de outra cidade**: mesma resposta, porque `accessibleRecord(record) = record && record.city===state.city` (`app/state.js:64`). Vale notar que `open-biz` troca a cidade antes de navegar, então esse caso só acontece por link/hash direto.
- **Vazio interno**: `"Serviços ainda não informados pelo responsável."` (sem `svc`); `"Os relatos aparecem quando um membro indica este negócio."` (sem `says`); `"O responsável poderá completar a descrição quando assumir a página."` (sem `bio`); `"Confirme com o responsável"` (sem `hours`); `"Onde atende"` não tem fallback quando `hoods` está vazio.
- **Carregando / esqueleto**: `styles/empty-states.css:2` pinta um shimmer em `.detail-hero.img-wait` enquanto a imagem carrega (classe aplicada pelo carregador de imagens; desligado em `prefers-reduced-motion`, `:6`). Não há esqueleto de conteúdo.
- **Erro**: nenhum estado de erro próprio; falta de foto não gera mensagem.
- **Visita a outra cidade (`readonly()`)**: `renderBusiness` **não** chama `readonlyHtml()` nem bloqueia ações por leitura — não há faixa de aviso nesta rota. Como as ações se apoiam em `canPost()` (que avisa `"Você está consultando {cidade}…"`), indicar/orçamento/assumir ficam bloqueados pelo aviso, mas a barra de ações continua desenhada igual e `save-biz`/`share` funcionam.
- **Perfil não verificado**: `canPost()` abre `"Perfil em análise"` (`app/state.js:62`) em `quote`, `recommend-biz`, `submit-recommend`, `claim-biz`, `confirm-claim` e no editor.
- **Somente leitura / suspenso / pausado**: cobertos pelos itens 4–6 acima e pela tabela de estados no fim da subseção anterior.
- **Gap verificado — página pausada de outra pessoa é acessível por link direto**: `renderBusiness` só valida `accessibleRecord(b)` (`detail.js:2`), nunca `bizVisible(b)`/`bizOpen(b)`. Uma página `paused` que não seja minha entra pela URL `#negocio/<id>` e é desenhada **sem faixa de aviso** e **com o botão `"Pedir orçamento"`** (a faixa de pausa é `b.mine && b.paused`, `detail.js:5`), apesar de `cityBiz()` escondê-la do catálogo. No protótipo atual `paused` só é escrito em `state.myBiz` (`detail.js:16`), então o caso exige um `state.biz` pausado por outro caminho; `confirm-claim` faz `state.myBiz = {...b}` e `state.biz = state.biz.filter(...)` (`app/handlers.js:121`), o que preserva `paused` se ele viesse junto.

##### Diferenças por viewport

- **Abaixo de 720 px a página vira imersiva.** `syncTopTitle` (`shell/navigation.js:84`) liga `body.immersive` quando `innerWidth<720` e `route.name` é `negocio` (ou `anuncio`) e existe `.detail-hero`. Regras em `styles/detail-immersive.css:4`–`:13`: `main{top:0}`, `.page{padding-top:0}`, `.detail-hero{margin:0 calc(-1*var(--space));border-radius:0;aspect-ratio:4/3}`, barra superior transparente enquanto não recebe `bar-solid` (`:10`), título da barra invisível (`:11`, com transição `:9`), botões da barra como círculos escuros com `backdrop-filter:blur(6px)` sobre a foto (`:12`). `bar-solid` entra quando a foto passa por baixo da barra (`shell/navigation.js:86`). Com `prefers-reduced-motion` as transições saem (`styles/detail-immersive.css:14`).
- **375**: `.detail-title h1{font-size:25px}`, `.facts{gap:6px}`, `.fact{padding:10px}`, `.metric-grid{gap:6px}`, `.metric{padding:12px}`, `.metric b{font-size:23px}`, `.context-strip{font-size:13px}`, `.detail-actions{padding-inline:12px}` e botões da barra com rótulo a 14 px (`styles/base.css:28`).
- **720 px ou mais**: `styles/detail-immersive.css` deixa de valer (a media é `max-width:719px`) e `styles/base.css:29` assume: `.detail-hero{max-height:480px;aspect-ratio:16/8}`, `.detail-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.65fr);gap:28px}`, `.detail-aside{padding-top:22px}`, `.detail-aside .seller{margin-top:0}`, `.detail-actions-in{justify-content:flex-end}` com botões `min-width:220px` e `flex:none`. Ou seja: em 768 e 1440 a barra de ações vira um bloco alinhado à direita, e a lateral passa a ser uma coluna real.
- **1440**: `.section-title h2{font-size:22px}`, `.page{padding-top:36px}` (`styles/base.css:30`). Nada muda na estrutura de duas colunas.
- **Movimento**: ao abrir a página a partir de um cartão, a foto do cartão "voa" até o topo (`MOTION_DETAIL.negocio = 'open-biz'`, `motion/bold-transitions.js:5`, `:24`) e o conteúdo sobe em cascata (`motionRise`, `:33`); ao voltar, a foto volta ao cartão (`:21`).
- **Alto contraste**: `.pill`, `.context-strip` e `.photo-card` ganham borda `CanvasText` (`styles/high-contrast.css:1`).

##### Diálogos, editores, folhas e menus abertos nesta rota

###### 1. Menu ⋮ "Ações da página" — `ownBizAction` (`detail.js:13`)

`biz-menu` com `b.mine` abre `openCreate(el, customChoices, false, 'Ações da página')` (`shell/create-menu.js:17`) — **é menu, não painel**: `contextMenu=false`, sem `preview`, `role="menu"`, `aria-label` `"Ações da página"`. Itens, em ordem:
1. ícone `edit`, `"Editar página"`, ação `edit-biz`, `data-value={id}`
2. ícone `visibility_off` (ou `visibility` se pausada), `"Pausar página"` / `"Reativar página"`, ação `pause-biz` / `resume-biz`, apoio `''` quando pausada e `"Sai da busca e do catálogo"` (`BIZ_PAUSE_NOTE`, `detail.js:10`) quando não
3. ícone `delete`, `"Excluir página"`, ação `delete-biz`, `data-value={id}`, `danger=true` → classe `danger-action` (`shell/create-menu.js:33`)

Teclado: `Tab`/`↑`/`↓`/`Home`/`End` e `Esc` (`shell/create-menu.js:73`–`:83`).

###### 2. Pausar / Reativar — `ownBizAction` (`detail.js:16`)

Guardas: `const b=state.myBiz; if(!b?.live || b.id!==value) return;`. `mutate(()=>{b.paused = pause})` e `notify(pause ? 'Página pausada. Ela saiu da busca e do catálogo.' : 'Página reativada. Ela voltou ao catálogo e à busca.' , pause?'visibility_off':'visibility')`.

###### 3. Excluir página — confirmação + `deleteMyBiz` (`detail.js:17` e `:23`)

`confirm('Excluir página?', 'A página sai do Bivaque. As propostas abertas saem dos pedidos e os clientes deixam de vê-las. Isso não pode ser desfeito.', fn, {ok:'Excluir', cancel:'Cancelar', danger:true})`. Ao aceitar, `deleteMyBiz(id)`:
- `bizLeaveRequests(id)` (`detail.js:22`) marca `withdrawn` as propostas `sent` e as `declined` de pedido `open`/`chosen`;
- se `state.myBiz.suspended`, grava `state.bizSuspended=true`;
- se existe `state.subscription`, apaga `spot` (o patrocínio acaba com a página);
- zera `state.myBiz`, navega para `voce` com `replace:true` e avisa `"Página excluída. As propostas abertas saíram dos pedidos."` (ícone `delete`).
- Não há desfazer oferecido.

###### 4. Assumir página no modo teste — `claim-biz` / `confirm-claim` (`app/handlers.js:120` e `:121`)

- Guarda: `if(state.myBiz?.live){ notify('Você já tem uma página. Abra “Meu negócio” para editar.','info'); break; }`
- **Título**: `"Assumir página no modo teste"`. Campo `claim-name`: `"Seu nome"`, valor inicial `state.profile.name`, `required minlength="3" autocomplete="name"`. Nota: `"Esta ação simula a confirmação do responsável. Na versão de produção, a propriedade precisará ser validada antes de editar a página."` Botões: `"Cancelar"` (text) e `"Assumir no modo teste"` (ação `confirm-claim`, filled).
- `confirm-claim`: `validFields(['claim-name'])` → `state.myBiz = {...b, spon:false, mine:true, live:true, claimed:true, ...(state.bizSuspended?{suspended:true}:{}), owner:`${nome} · responsável de teste`}` e **remove** o negócio de `state.biz`; depois `closeDialog(true)` e `openBusinessEditor(b.id)` (cai direto no editor).
- **Não há diálogo de erro próprio** — nome curto é barrado pelo `reportValidity()` nativo.

###### 5. Indicar este negócio — `recommend-biz` / `submit-recommend` (`app/handlers.js:115` e `:116`)

- Guardas: `canPost()`, `bizById(value)`, e `if(b.myInd){ notify('Você já indicou este negócio.','info'); break; }`
- **Título**: `"Indicar este negócio"`. Campo `recommend-why`: `"Conte sua experiência"`, `type="textarea" rows="3" required minlength="12"`. Botões: `"Cancelar"` (text) e `"Publicar indicação"` (ação `submit-recommend`, `data-value={id}`, filled — **sem ícone**, ao contrário do diálogo de indicar).
- `submit-recommend`: `validFields(['recommend-why'])` → `b.recN++`, `b.myInd=true`, `b.says.push([initals(nome),'me',nome,texto])`; `closeDialog(true)`, `render()`, `haptic(18)`, `notify('Sua indicação foi adicionada')` e `celebrate($('#main .fact-proof [data-count-to]'))` (`shell/celebrate.js:4` — pulso com oito pontos, desligado com `prefers-reduced-motion`).
- **Erro próprio**: nenhum — texto curto é barrado pelo validador do campo.

###### 6. Convidar responsável — `invite-owner` (`app/handlers.js:119`)

Quando `b.myInd` e a página não tem responsável, o botão muda de `"Também indico"` para `"Convidar responsável"`. A ação copia literalmente: `"A comunidade do Bivaque indicou seu negócio. Conheça sua página: {location.href}"` (`copyText`, `features/messaging/actions.js:99`) e avisa `"Copiado"` (ícone `content_copy`); se a área de transferência falhar, abre o diálogo `"Copiar texto"` com o campo `copy-recovery-text` `"Texto para copiar"` e a nota `"A cópia automática não está disponível. O texto está visível e selecionado; use a opção Copiar do navegador."`.

###### 7. Contatos recebidos — `biz-leads` (`app/handlers.js:105`)

Título `"Contatos recebidos"`. Lista de `profileRow('chat_bubble', t.who, t.msgs.at(-1)?.t || 'Conversa iniciada', 'open-thread', t.id)` para as threads do negócio sem bloqueados; sem nenhuma, `empty('Nenhum contato ainda','Os contatos sobre esta publicação aparecerão aqui.','chat_bubble')`. Botão `"Fechar"` (text).

###### 8. Compartilhar — `share` de negócio (`app/handlers.js:31` → `features/listings/share-card.js:42`)

(mesmo overlay — ver 2.1.1, overlay 6)

###### 9. Planos — `openPlans` (`features/profile/demo-actions.js:1`)

Abre por `"Planos (em breve)"`/`"Conhecer os planos"` (ação `plans`) e por `planBoost` quando o plano não cobre destaque. Dois ramos:

**a) Sem `paidPlans()` (estado do lançamento)** — diálogo `"Planos para o negócio"`, `kind` genérico, sem radios e **sem botão Cancelar**:
- `"No lançamento, a página do negócio é gratuita e completa: aparece para toda a cidade, recebe indicações e conversa sem limite."`
- `"Planos pagos vêm depois, sempre identificados. A ordem das indicações da comunidade nunca é vendida."`
- Botão único: `btn('Entendi','close-dialog','','filled')`.

**b) Com `window.BIVAQUE_LABS={paidPlans:true}`** — diálogo `"Planos para o negócio"`:
- Nota: `"Compare os benefícios. Nesta versão você ativa um plano de teste; nenhum pagamento é realizado."`
- Três opções (`md-radio name="plan"`, `aria-label` igual ao título):
  - `free` — `"Grátis · R$ 0"` / `"Página na cidade e até 5 novas conversas respondidas por mês."`
  - `moment` — `"Destaque de momento · R$ 9,90 / semana"` / `"Um espaço separado e identificado como Patrocinado, por 7 dias. Mantém o limite de 5 novas conversas por mês."`
  - `plan` — `"Plano do negócio · R$ 39 / mês"` / `"Quatro destaques por mês e conversas sem limite."`
- Se `state.myBiz?.live`: `<p><b>"Neste mês:"</b> {planConvoText()}. {planSpotText()}.</p>`
- Nota final: `"Pagar não altera a ordem das indicações da comunidade."`
- Botões: `"Cancelar"` (text) e `"Ativar no modo teste"` (ação `activate-plan`, filled).

**`planActivate`** (`plans.js:47`): lê o radio marcado; se `tier!=='free'` e `!bizOpen(b)` → `notify('Crie ou reative a página do negócio antes de ativar um plano.','info')`; grava `tier`, e para `moment` cria `spot={from:now, until:now+7d, bizId:b.id}` (`PLAN_SPOT_MS=7*864e5`, `plans.js:28`); para `free` remove `spot` e detecta `ended`. Mensagens de sucesso:
- `"Plano grátis selecionado. O destaque terminou e sua página saiu de Patrocinado."` (quando havia destaque)
- `"Plano grátis selecionado"`
- `"Plano de teste ativado. Nenhum pagamento realizado. Sua página aparece em Patrocinado até DD/MM."`
- `"Plano de teste ativado. Nenhum pagamento realizado. Restam N destaques neste mês."`
- `"Plano de teste ativado. Nenhum pagamento realizado."`

**Limites e benefícios** (`plans.js:28`–`:44`):
- `PLAN_FREE_REPLIES=5` — "até 5 novas conversas respondidas por mês" nos planos `free` e `moment`; `plan` não tem limite.
- `PLAN_BOOSTS=4` — quatro destaques por mês, cada um de 7 dias, só no `plan`.
- `planMonth()` = `dateISO().slice(0,7)`; `planRoll(s)` zera `repliedThreadIds` e `boosts` ao virar o mês.
- `planRenewDay()` devolve o dia 1º do mês seguinte em `dd/mm` (usado nas mensagens de renovação).
- `planConvoText()`: `"Conversas novas sem limite"` ou `"{N} de 5 conversas novas respondidas neste mês"`.
- `planSpotText()`: `"Patrocinado até DD/MM"` (destaque ativo) / `"Restam N de 4 destaques neste mês"` / `"Os 4 destaques do mês já foram usados. Voltam em DD/MM"` (plano) / `"Destaque de 7 dias no espaço Patrocinado"` (momento) / `"Sem destaque no plano grátis"`.
- `planCanBoost()`: destaca se não há destaque ativo e o tier é `moment`, ou `plan` com destaques sobrando.
- `planStatusHtml()` desenha dois blocos `class="choice"`: `"Conversas"` + texto acima, e `"Destaque"` + texto acima + botão `"Destacar por 7 dias"` (ação `biz-boost`) quando `planCanBoost()`.

**`planBoost`** (`plans.js:56`) — mensagens na ordem:
1. `"Sua página precisa estar ativa para ser destacada."` (info)
2. `"Sua página já está em Patrocinado até DD/MM."` (info)
3. `"Destaque faz parte dos planos pagos."` (info) + abre `openPlans()`
4. `"Os 4 destaques deste mês já foram usados. Voltam em DD/MM."` (info)
5. sucesso: `"Sua página aparece em Patrocinado até DD/MM."` (ícone `trending_up`)

###### 10. Limite de conversas novas — `planLimitDialog` (`plans.js:32`)

Não é aberto por botão desta rota: quem chama é o envio de mensagem na conversa — `planReplyGate(t)` em `features/messaging/actions.js:40` e `planCountReply` em `:42`. Título `"Limite de conversas novas"`, texto: `"Você já respondeu 5 conversas novas neste mês. As conversas que você já respondeu continuam livres. As novas voltam em DD/MM, ou agora com o Plano do negócio, que não tem limite."`, botões `"Agora não"` (text) e `"Conhecer os planos"` (ação `plans`, filled, ícone `trending_up`). `kind='plan-limit'`. O gate só se aplica a conversas cujo `about.id` é `state.myBiz.id` e que ainda não têm mensagem minha (`planReplyGate`, `plans.js:26`), e só com `paidPlans()`.

###### 11. Lightbox — `lightbox` com `data-value="biz"` (`app/handlers.js:91`)

(mesmo overlay — ver 2.2.1, overlay 8)

###### 12. Controles do protótipo → `"Simular contato no meu negócio"` (`features/profile/settings.js:6`)

O botão só existe quando `state.myBiz?.live`; emite `simulate-biz-contact`, tratada em `planAction` (`plans.js:74`). `simulateBizContact` (`plans.js:65`): sem página → `"Crie a página do seu negócio antes de simular um contato."`; senão cria uma thread com um nome de `PLAN_TEST_NAMES` (`Marina L.`, `Caio R.`, `Helena P.`, `Otávio S.`, `Bianca F.`, `Lúcio M.`, `Renata V.`, `Davi C.`), primeira mensagem `"Olá! Vocês atendem no meu bairro? Queria um orçamento."`, aviso no sino `"Novo contato de {nome} na página {negócio}."` e `notify('Contato de teste criado em Conversas','chat_bubble')`.

###### 13. Outros overlays alcançáveis desta rota (detalhados nas áreas donas)

- `"Descartar alterações?"` ao fechar o editor com mudanças (`shell/dialogs.js:13`).
- `"Perfil em análise"` via `canPost()` (`app/state.js:62`).
- `"Conteúdo anterior indisponível"` via ação `resume` (`app/handlers.js:27`).
- `"Compartilhar demonstração"` quando `navigator.share`/clipboard falham fora do cartão (`features/messaging/actions.js:97`).

---

### 2.7 Pedidos de serviço e propostas

#### 2.7.1 Rota `pedidos` — sem parâmetro

- Título na barra (`titleForRoute`, shell/navigation.js:53): "Pedidos de serviço"
- Aba ativa (`activeTab`, shell/navigation.js:54): `origin` (a função cai no `return origin` final; não há
  ramo próprio para `pedidos`). No rodapé, `nav-item` de "Você" só fica ativo se a origem foi `voce`.
- De onde se chega:
  - `features/profile/views.js:6` — `profileRow('build','Pedidos de serviço', `"${n} abertos · ${m} para o seu negócio"`,'requests')` (a contagem de abertos vem de `requestList().filter(r=>r.mine&&requestActive(r)).length`; a segunda parte só existe com `state.myBiz?.live`)
  - `shell/command-palette.js:5` — `['build','Pedidos de serviço','requests','','propostas orcamento']` (palavras-chave "propostas orcamento")
  - `shell/navigation.js:51` — voltar de `pedido` cai em `pedidos` (`pedido:'pedidos'` no fallback)
- Desenhada por: `renderRequests` em `features/requests/views.js:3`; helpers próprios em
  `views.js:2` (`requestRow`), `views.js:9` (`proposalCard`), `views.js:32` (`proposalCompareHtml`).
  Dados em `features/requests/model.js:5-41`.
- Parâmetro: nenhum.

##### Conteúdo, de cima para baixo

1. `page-head` (views.js:5): `h1` exato **"Pedidos de serviço"**; subtítulo
   **"Descreva o que precisa e receba até 5 propostas de empresas do ramo em Manaus."** (`REQUEST_LIMIT` e
   `state.homeCity` interpolados); `p.form-note` com `REQUEST_NOTE`. À direita, só fora do modo visita
   (`!readonly()`), botão **"Contratar serviço"** → ação `create-request` (`views.js:5`).
2. `readonlyHtml()` (`shell/navigation.js:108`) quando `state.city!==state.homeCity`: faixa com
   `icon('visibility')`, texto "Você está conhecendo **{cidade}**. Sua cidade atual é {homeCity}." e botão
   "Voltar" (`home-city`).
3. Seção **"Meus pedidos"** (`sectionTitle`, views.js:6). Lista `mine = requestList().filter(r=>r.mine&&r.status!=='removed').sort((a,b)=>b.createdAt-a.createdAt)`
   (mais novo primeiro; pedido removido pela moderação sai).
   - Cada linha (`requestRow`, views.js:2) é um `<button class="list-row" data-action="open-request">` com
     `icon('build')`, título `requestTitle(r)` (a especialidade quando houver, senão o grupo —
     model.js:42) e, se `hoodShown(r)`, `" · {bairro}"`; `small` = rótulo de estado
     (`requestStatusLabel`) e, **só quando `r.mine` e o estado não é `cancelled`**,
     `" · {n} proposta(s)"` com `n = requestLiveProposals(r).length` (singular/plural por `n===1`);
     `icon('chevron_right')` à direita.
   - Vazio: `empty('Nenhum pedido ainda','Conte o serviço, o bairro e quando precisa. Empresas do ramo respondem com valor, data e prazo.','build')` (views.js:6).
4. Seção **`Pedidos para {state.myBiz.name}`** — só existe com `state.myBiz?.live` (views.js:7). Lista
   `forMe = providerRequests()` (model.js:31 → `providerCanSee`, model.js:29). Mesmo `requestRow`, mas com
   `r.mine false`, então nunca mostra contagem de propostas.
   - Vazio: `empty('Nenhum pedido no seu ramo agora',`"Pedidos de {myBiz.cat} em {myBiz.city} que atendem seus bairros aparecem aqui."`,'inbox')` (views.js:7).
5. O rodapé/`shell()` não muda de rota; `document.title` = "Pedidos de serviço · Bivaque" (navigation.js:107).

##### Estados

- **Vazio (pedidos próprios)**: ver item 3 acima — título "Nenhum pedido ainda".
- **Vazio (lado prestador)**: título "Nenhum pedido no seu ramo agora" — só aparece com página `live`;
  página pausada ou suspensa simplesmente remove a seção (views.js:7).
- **Sem página de negócio**: a seção "Pedidos para…" não é renderizada (`state.myBiz?.live` falso,
  `state.myBiz` default `null` em `app/state.js:10`).
- **Carregando / esqueleto**: não existe nesta rota. Nada em `renderRequests` (views.js:3-8) cria esqueleto;
  a rota é síncrona sobre `state.requests`.
- **Erro / não se aplica**: não há. Não há mensagem de erro própria da rota.
- **Visita a outra cidade (`readonly()` = `state.city!==state.homeCity`, `app/state.js:58`)**: a faixa do item 2
  aparece e o botão "Contratar serviço" desaparece (views.js:5). **Porém a lista continua mostrando os pedidos
  próprios** — `mine` não filtra por `state.city` (views.js:4); o cabeçalho segue falando de `state.homeCity`
  (views.js:5). `create-request` fora da cidade é recusado por `canPost()` (`app/state.js:61`).
- **Aviso de estado por rótulo** (`requestStatusLabel`, model.js:9): "Aguardando propostas" (`open` — sem
  proposta viva), "Com propostas" (`proposals`), "Proposta escolhida" (`chosen`), "Concluído" (`done`),
  "Cancelado" (`cancelled`), "Expirado" (`expired`), "Removido pela moderação" (`removed`).
  `requestStatus` (model.js:8) devolve `expired` quando `status==='open' && Date.now()>r.expiresAt`,
  `proposals` quando há alguma proposta com `status==='sent'`.
- **Perfil não verificado**: `canPost()` mostra o diálogo "Perfil em análise" com o texto "Publicar libera
  quando a equipe aprovar seu perfil. Nada foi publicado." e botão "Voltar" (`app/state.js:62`) — vale para
  `create-request`.
- **Seed do lado prestador**: `requestAction('requests')` chama `seedProviderRequests()` **antes** de navegar
  (handlers.js:4), que injeta 2 pedidos fictícios em `state.requests` quando `state.myBiz?.live` e ainda não há
  nenhum pedido que `providerCanSee` aceite (model.js:33): autores "Família Andrade" e "Carla M.",
  descrições "Preciso de serviço de … para um apartamento de 2 quartos. Prefiro atendimento no fim da tarde."
  e "Procuro orçamento de … para esta semana. Posso enviar mais detalhes pela conversa."; `hood` = primeiro
  bairro da página (ou `'Centro'`), `spec` = primeira especialidade ou `null`, `expiresAt` = agora + 7 dias.
  Chegar por dentro (botão do catálogo/Início, ou navegando direto) não semeia.

##### Diferenças por viewport

- **375**: `styles/proposal-compare.css:25` não se aplica aqui (só há `prop-compare` no detalhe), mas
  `styles/base.css:28` (`@media(max-width:479px)`) altera o que a rota usa: `.list-row{padding:14px}`,
  `.detail-title h1{font-size:25px}`, `.form-grid{grid-template-columns:1fr}.form-grid .full{grid-column:auto}`,
  `.page-head{gap:8px}`, `md-dialog{width:calc(100vw - 24px)}` e `md-dialog.form-dialog{width:calc(100vw - 16px)}`.
- **768**: `styles/base.css:29` (`@media(min-width:720px)`) põe a navegação em trilho (`--rail:96px`,
  `--space:28px`, `.nav-main` à esquerda) e `.snackbar{left:calc(var(--rail) + 16px)}` — afeta onde aparecem os
  `notify` da área. Nada específico dos pedidos.
- **1440**: `styles/base.css:30` (`@media(min-width:1200px)`) aumenta `.section-title h2` (22px) e o
  `padding-top` da `.page` (36px). Não há regra própria da área acima de 719px.
- Fora de `base.css`/`proposal-compare.css` não achei media query que trate `pedidos`/`pedido` — a
  área não tem folha de estilo própria.

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Editor do pedido** — `openRequestEditor`, `features/requests/views.js:23` (aberto por `create-request`
   em handlers.js:3, vindo do botão da própria rota, do catálogo, do Início, do painel Criar e da paleta).
   `showDialog('Contratar serviço', …, …, 'editor')`.
   - Pré-checagens: `canPost()` (`app/state.js:59`); com 3 pedidos abertos, `notify('Você já tem 3 pedidos
     abertos. Encerre ou cancele um antes.','info')` e não abre (views.js:23).
   - Cabeçalho `p.form-note`: **"Seu pedido vai para as empresas do ramo em {state.homeCity}. Até 5 podem
     enviar proposta com valor, data e prazo."** (views.js:23).
   - Campos:
     | id | rótulo | tipo | limites / obrigatoriedade |
     |---|---|---|---|
     | `request-cat` | "Tipo de serviço" | `md-outlined-select` | `[['','Escolher'], ...GROUP_NAMES]`; `required`; `class="full"` (views.js:23). Opções em `features/businesses/taxonomy.js:4-19` |
     | `request-spec` | "Especialidade (opcional)" | `md-outlined-select` | injetado em `#request-spec-wrap` só quando o grupo tem especialidades; opção vazia "Qualquer especialidade" (`taxonomy.js:28` via `specField`) |
     | `request-hood` | "Bairro" | campo de busca de bairro | `hoodField('request-hood','',state.homeCity,'Só o bairro aparece no pedido.')` → `hoodPicker` (`shell/hood-picker.js:26`): `required` quando a cidade tem base de bairros, `maxlength="60"`, `placeholder="Digite o bairro ou o CEP"`, supporting-text "Manaus · {zona}" ou a ajuda, botão **"Usar minha localização"** (hood-picker.js:29). O CEP não é aceito como valor e não é salvo (`HOOD_CEP_MSG` = "Escolha o bairro na lista. O CEP não fica salvo.", hood-picker.js:12) |
     | `request-desc` | "O que você precisa" | `textarea` `rows=4` | `required minlength="20" maxlength="1000"`, `supporting-text="Detalhe o serviço. Não informe endereço, documentos ou telefone."`, `class="full"` |
     | `request-when` | "Quando" | `md-outlined-select` | `[['asap','O quanto antes'],['until','Até uma data'],['on','Em uma data específica']]`, valor inicial `'asap'` |
     | `request-date` | "Data" | `input type="date"` | `min=dateISO()` (hoje), `value=dateISO(3)`; o label `#request-date-wrap` começa `display:none` e só aparece quando `request-when !== 'asap'` (views.js:23) |
     - Fotos: `photoUploadHtml(4)` (`features/listings/editor.js:1`) — cabeçalho "Fotos" / "Até 4 imagens",
       botão "Adicionar fotos" com "ou arraste para cá", `input#upload-photos accept="image/jpeg,image/png,image/webp,image/avif" multiple`,
       nota "A primeira foto será a capa. Você pode remover e adicionar outras imagens." O teto real é
       `editor.maxPhotos=REQUEST_PHOTOS` (views.js:23) aplicado em `features/listings/photos.js:9-11`;
       tipos aceitos em `photos.js:4-5`; tamanho máximo por imagem 12 MB ("Use imagens de até 12 MB."),
       tipos errados → "Use imagens JPG, PNG, WebP ou AVIF.", falha de decodificação → "Não foi possível
       abrir essa imagem. Tente JPG, PNG ou WebP." (photos.js:8,9,12). Redimensiona para 1400px e grava JPEG
       qualidade .78 (photos.js:12).
   - Mensagens `p.form-note` no fim: **"Fotos ajudam no orçamento. Evite pessoas, documentos e o número da
     casa. Só as empresas do ramo veem."** e `REQUEST_NOTE` (views.js:23).
   - Botões: **"Cancelar"** (`close-dialog`, `text`) e **"Enviar pedido"** (`submit-request`, `filled`,
     ícone `send`).
   - Validações e mensagens de erro literais (`handlers.js:12`, `notify(problem,'error')`):
     "Escolha o tipo de serviço." · "Escolha uma especialidade da lista." · "Escolha o bairro." (ou
     "Escolha o bairro na lista. O CEP não fica salvo.") · "Descreva o serviço com pelo menos 20 caracteres." ·
     "A descrição pode ter até 1000 caracteres." · "Informe a data." · "A data precisa ser hoje ou depois."
   - Ao concluir (`handlers.js:15`): grava o pedido no topo de `state.requests` com `city:state.homeCity`,
     `cat`, `spec||null`, `hood`, `desc`, `when:{kind,date:(asap?null:date)}`, `photos` cortadas em 4,
     `status:'open'`, `createdAt`, `expiresAt = agora + 7 dias`, `proposals:[]`, `who:state.profile.name`,
     `mine:true`; fecha o diálogo, navega para `pedido/{id}`, `notify('Pedido enviado às empresas do ramo','send')`
     e `askPushSoon('request')` (push-install.js:19).
2. **Confirmação "Descartar alterações?"** (`shell/dialogs.js:13`, disparada por `closeDialog` quando
   `editorDirty`): texto "Você pode continuar editando ou descartar o que ainda não foi salvo.", botões
   `cancel-confirm` ("Continuar") e `accept-confirm` ("Confirmar"). Também em `leaveDialog` (dialogs.js:15).
3. **Menu de bairro** (`hood-picker.js:50`): não é `md-dialog`; é o `.hood-menu` dentro do campo, com
   "Mais escolhidos em Manaus" quando vazio, sugestões filtradas (até 6) e a opção de usar o texto digitado
   como está ("Usar “{texto}” como está", hood-picker.js:44-47). Nesta rota não há outro overlay.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `create-request` | `features/requests/views.js:5` (botão "Contratar serviço"); `features/businesses/catalog.js:1` (faixa "Precisa contratar?" e "Pedir" no fim da paginação); `features/home/views.js:18` e `features/home/desktop.js:11` ("Precisa contratar?"); `shell/create-menu.js:8` e `shell/create-menu.js:23`; `shell/command-palette.js:6` | `''` | abre o editor do pedido (ou recusa por limite/`canPost`) | `features/requests/handlers.js:3` |
| `open-request` | `features/requests/views.js:2` (`requestRow`) | id do pedido | fecha diálogo aberto e navega para `pedido/{id}` | `handlers.js:5` |
| `requests` | `features/profile/views.js:6`; `shell/command-palette.js:5` | `''` | fecha diálogo, roda `seedProviderRequests()` e navega para `pedidos` | `handlers.js:4` |
| `simulate-proposals` | `features/profile/settings.js:6` (botão "Simular propostas de prestadores", Controles do protótipo) | `''` | empresas de exemplo respondem aos pedidos abertos; `notify` de resultado + avisos | `handlers.js:6` → `model.js:35` |
| `proposal-sort` | `features/requests/views.js:34` (chips `md-filter-chip`) — só existe no detalhe | `arrival`/`price`/`date` | reordena as colunas (só se `route.name==='pedido'`) | `handlers.js:7` |
| `submit-request` | `views.js:23` | `''` | cria o pedido, navega para o detalhe, `notify` e pede push | `handlers.js:8-17` |

---

#### 2.7.2 Rota `pedido` — id de pedido

- Título na barra (`titleForRoute`, shell/navigation.js:53): "Pedido de serviço"
- Aba ativa (`activeTab`, shell/navigation.js:54): `origin` (não está nas listas de `inicio/comunidade/conversas/voce`).
- De onde se chega:
  - `features/requests/views.js:2` (`requestRow`, tanto "Meus pedidos" quanto "Pedidos para …") → `handlers.js:5`
  - `features/home/desktop.js:28` — faixa de aviso do desktop: `strip('request_quote', 'Seu pedido recebeu {n} proposta(s)', '{título}{ · bairro}', 'Comparar', 'open-request', req.id)`
  - `features/owner/review.js:21` — botão "Abrir o pedido" na fila de moderação de denúncia de pedido/proposta
  - `features/profile/demo-actions.js:41-42` — abrir aviso cujo `go` é `['pedido', id]` (via `noticeDestination`)
  - `features/requests/handlers.js:15` — depois de criar um pedido
  - `shell/navigation.js:51` — voltar de `pedido` cai em `pedidos`
- Desenhada por: `renderRequest` em `features/requests/views.js:10`; helpers próprios
  `views.js:9` (`proposalCard`), `views.js:19` (`requestChosenCard`), `views.js:32` (`proposalCompareHtml`),
  `views.js:34` (`PROPOSAL_SORTS`), `views.js:31` (`proposalSorted`). CSS: `styles/proposal-compare.css`.
- Parâmetro: id de pedido — `route.id` buscado em `requestById` sobre o campo `state.requests[].id`
  (`model.js:6`, `app/state.js:10`). **Não existe `state.proposals`**: as propostas são `request.proposals[]`
  (cada uma com `id`, `bizId`, `price`, `date`, `validUntil`, `duration`, `msg`, `status`, `at`).

##### Conteúdo, de cima para baixo

1. `head` (views.js:13):
   - `pill(requestStatusLabel(r))` com a cor `ok` para `chosen`/`done` e `warn` para `cancelled`/`expired`
     (as demais ficam neutras).
   - `h1` = `requestTitle(r)` (especialidade, senão grupo).
   - `p.muted` = `"{cat} · "` (só com especialidade) + `hoodTag(r)` (`"{bairro} · "`, vazio quando
     `!hoodShown(r)`) + `requestWhenLabel(r)` — "O quanto antes" / "Até {data}" / "Em {data}"
     (`model.js:19`, `dateLabel` = "5 de novembro", `utilities/format.js:9`) +, para quem vê como prestador,
     `" · Pedido de {r.who}"`.
   - Descrição: `p.detail-copy` com `r.desc` quando `details`; senão `p.small.muted` =
     **"Este pedido foi encerrado. Os detalhes ficam visíveis só para a empresa escolhida."**.
   - Fotos do pedido quando `details && r.photos.length`: `img` 96×96, `alt="Foto do pedido"`.
   - `p.form-note` = `REQUEST_NOTE`.
2. **Visão do dono (`r.mine`)**: `head` + `requestChosenCard(r)` + seção das propostas + cancelar.
   - `requestChosenCard` (views.js:19) existe quando `r.chosen` aponta uma proposta e
     `['chosen','done'].includes(r.status)`: `photo-card` `max-width:480px` com avatar de iniciais da empresa,
     nome, `"{preço} · {prazo}"`; se `done`, `p.small.muted` **"Serviço concluído em {dd/mm/aaaa}."**
     (usa `r.doneAt||Date.now()`), senão botão **"Serviço concluído"** (`complete-request`, `filled`,
     `check_circle`); botão **"Conversar com o prestador"** (`chat-provider`, `outlined`, `chat_bubble`);
     e, se não concluído, **"Desistir desta proposta"** (`give-up-proposal`, `text` com a classe `danger`
     injetada) mais a nota **"Desistir reabre o pedido para as outras propostas que ainda estão válidas."**
   - Seção `Propostas ({n} de 5)` (`n = requestLiveProposals(r).length`):
     - Com propostas: `proposalCompareHtml(r,list,active)`. Quando o estado é `chosen`, a lista é reordenada
       para a escolhida ficar em primeiro (`views.js:14`: `[...live].sort((a,b)=>(b.id===r.chosen)-(a.id===r.chosen))`).
     - Sem propostas e ativo: `p.small.muted` **"Enviado para {N} empresa(s) de {título} em {cidade}. Expira em {data}."**
       (`N = requestEligible(r).length`, data de `r.expiresAt`).
     - Sem propostas: `empty("Aguardando propostas"|"Nenhuma proposta recebida", "As empresas do ramo podem
       responder em até 7 dias."|"Este pedido não recebeu propostas.",'request_quote')` — o primeiro título/texto
       quando `active`.
   - Se ativo, `section` com botão **"Cancelar pedido"** (`cancel-request`, `outlined` + classe `danger`).
3. **Comparação de propostas** (`proposalCompareHtml`, views.js:32-38):
   - Barra de ordenação `div.prop-sort` (`role="group" aria-label="Ordenar propostas"`) com "Ordenar por" e
     `md-chip-set` de `md-filter-chip` — **"Chegada"**, **"Menor valor"**, **"Mais cedo"**
     (`PROPOSAL_SORTS`, views.js:30). Só aparece quando `active && list.length>1` (views.js:34).
   - Grade `div.prop-compare` (`role="region" aria-label="Propostas lado a lado" tabindex="0"`) — uma coluna
     `article.prop-col` por proposta, com `aria-labelledby="prop-name-{p.id}"`.
   - Ordem: `proposalSorted` (views.js:31) — `arrival` mantém a ordem de chegada (padrão do ADR, comentário
     em views.js:25-27: "A ordem padrão é a de chegada … sem ranking pago"); `price` ordena por `price.min`
     com `visit` valendo `Infinity`; `date` por `date.localeCompare`. O estado do chip é **local ao módulo**
     (`let proposalSort={rid:null,sort:'arrival'}`, views.js:28) e **não é persistido**; vale por pedido
     (`proposalSortFor`, views.js:29).
   - Coluna, de cima para baixo: `header` com nome da empresa (`bizById(p.bizId)`, senão `state.myBiz`
     quando é a própria página, senão o literal **"Empresa"**) e `small` = **"{recN} indicação/indicações"**
     quando `b.recN`, senão **"Empresa do ramo"**; `div.prop-badges`; `p.prop-price`; `dl.prop-facts`;
     `p.prop-msg`; `div.prop-actions`.
   - O alinhamento lado a lado vem de `styles/proposal-compare.css:3` (`grid-auto-flow:column;
     grid-auto-columns:minmax(230px,1fr); grid-template-rows:repeat(6,auto)`) e cada coluna usa
     `grid-row:span 6` + `grid-template-rows:subgrid` (`proposal-compare.css:5`) — as **6 linhas** são
     header, badges, preço, fatos, mensagem e ações, alinhadas entre colunas. Rola horizontalmente
     (`overflow-x:auto`, `scroll-snap-type:x mandatory`, `overscroll-behavior-x:contain`).
   - **Destaques calculados no código** (views.js:33): `low` = menor `price.min` entre as propostas com preço
     **quando há mais de uma proposta com preço e o mínimo é diferente do máximo**; `early` = data mais cedo
     **quando há mais de uma data distinta**. `low` gera `span.prop-badge` com `icon('sell')` +
     **"Menor valor"**; `early` gera badge `icon('bolt')` + **"Mais cedo"** (views.js:35). Ambos os badges usam
     `.prop-badge` (fundo `success-container`, `proposal-compare.css:13`).
   - Selo por estado: **"Escolhida"** (`pill('Escolhida','ok','check_circle')`), **"Não escolhida"** para
     `status==='declined'` (ou **"Vencida"** se `declined` e `proposalExpired(p)`), **"Vencida"**
     (`pill(...,'warn')`) para `status==='sent'` com validade vencida (views.js:35).
   - Fatos (`dl.prop-facts`): **"Disponível"** (`icon('event')`) + `dateLabel(p.date)`; **"Execução"**
     (`icon('timer')`) + `p.duration`; **"Válida até"** (`icon('hourglass_top')`) + `dateLabel(p.validUntil)`.
   - `p.prop-msg` com `p.msg` (CSS: 4 linhas com clamp, `proposal-compare.css:21`).
   - Ações: **"Escolher"** (`choose-proposal`, `filled`, `aria-label="Escolher a proposta de {empresa}"`) só
     quando `active && p.status==='sent' && !proposalExpired(p) && proposalBizOpen(b)`; **"Abrir conversa"**
     (`open-thread`, `tonal`) quando `chosen && r.threadId`; **"Ver empresa"** (`open-biz`, `text`, quando a
     empresa existe) e **"Denunciar"** (`report` com `proposal|{p.id}`, `text`, `aria-label="Denunciar a
     proposta de {empresa}"`) — os dois últimos sempre.
   - Classes de coluna: `.is-chosen` (borda primária 2px + sombra, `proposal-compare.css:6`) e `.is-declined`
     (fundo rebaixado, borda tracejada, preço em cor secundária; `proposal-compare.css:7-8`) para
     `declined` ou `sent` vencida.
4. **Visão do prestador** (`!r.mine`): `head` + seção **"Sua proposta"** (views.js:16).
   - Com proposta própria (`myProposal`, model.js:21 — ignora `withdrawn`/`gaveup`/`removed`):
     `proposalCard(r,mineP,{mineView:true})` → `article.photo-card` com nome da empresa, preço em 22px,
     `"Disponível em {data} · Execução: {prazo} · Válida até {data}"`, mensagem, selo
     ("Escolhida"/"Não escolhida"/"Vencida") e os botões **"Editar proposta"** (`propose`, `outlined`,
     `edit`) + **"Retirar"** (`withdraw-proposal`, `text`, `undo`) — os dois só com `requestActive(r)` —
     e **"Abrir conversa"** quando escolhida e com `threadId`.
   - Sem proposta própria, textos exatos por precedência: `r.chosen` → **"O cliente já escolheu uma proposta."**;
     `!active` → **"Este pedido não recebe mais propostas."**; `requestFull(r)` →
     **"Este pedido já recebeu 5 propostas."**; senão **"Você não vê as propostas de outras empresas."** +
     botão **"Enviar proposta"** (`propose`, `filled`, `request_quote`).
   - Com `details`, seção final com botão **"Denunciar pedido"** (`report`, valor `request|{r.id}`).
   - **Importante**: nesta visão as propostas das outras empresas nunca são renderizadas (views.js:16) — não
     há comparação do lado do prestador.

##### Estados

- **Pedido removido pela moderação** (`r.status==='removed'`): `removedContent('request')`
  (`features/listings/detail.js:3`) → "Pedido removido" / "A moderação do Bivaque removeu este conteúdo depois
  de denúncias." com botão "Ir para o início" e ícone `report` (views.js:11). Atinge `mine` e prestador.
- **Sem acesso ou id inexistente** (`!r || (!r.mine && !providerCanSee(r))`): `unavailable()`
  (`listings/detail.js:1`) → "Conteúdo indisponível nesta cidade" / "Volte para a página inicial ou selecione a
  cidade em que o conteúdo foi publicado.", botão "Ir para o início", ícone `location_off` (views.js:11).
- **Detalhes ocultos para o prestador**: `details = r.mine || providerSeesDetails(r)` (views.js:11;
  `providerSeesDetails` = `providerCanSee` **e** (pedido ativo **ou** eu sou o escolhido), model.js:30).
  Sem `details`, a descrição e as fotos somem e entra a frase "Este pedido foi encerrado. Os detalhes ficam
  visíveis só para a empresa escolhida." (regra da Rodada 11 comentada em model.js:23-24).
- **Vazio (dono, ativo, sem propostas)**: item 2 acima — "Aguardando propostas".
- **Vazio (dono, encerrado, sem propostas)**: "Nenhuma proposta recebida".
- **Vazio (prestador sem proposta)**: um dos quatro textos do item 4.
- **Carregando / esqueleto**: não existe. `renderRequest` é síncrono (views.js:10).
- **Visita a outra cidade (`readonly()`)**: `renderRequest` **não** chama `readonlyHtml()` nem olha `readonly()`
  (views.js:10-17). O que barra é `providerCanSee` (exige `r.city===b.city`, model.js:29) e o fato de
  `requestById` procurar em `state.requests` inteiro — ou seja, o dono continua vendo o próprio pedido em
  qualquer cidade consultada; um prestador de outra cidade cai em `unavailable()`.
- **Pedido expirado**: `requestStatus` devolve `expired` (pill `warn`, "Expirado"); `requestActive` falso
  (model.js:10), então: o prestador vê "Este pedido não recebe mais propostas."; `propose` recusa; `cancel-request`
  recusa com "Este pedido já foi encerrado."; `choose-proposal` recusa com "Esta proposta não está mais
  disponível."; o botão "Cancelar pedido" não é renderizado (`active` falso, views.js:14). **Nada no código
  grava `status:'expired'`** — é sempre derivado de `Date.now() > r.expiresAt` (grep em `src/` por `'expired'`
  só encontra essa derivação e os rótulos).
- **Proposta vencida** (`proposalExpired`, model.js:15: `!!p.validUntil && p.validUntil < dateISO()`): continua
  na lista, marcada "Vencida", `is-declined`, e não pode ser escolhida (handlers.js:20).
- **Proposta retirada / desistida / removida**: somem das listas (`requestLiveProposals`, model.js:14) e
  `myProposal` as ignora — o prestador volta a ver o botão "Enviar proposta".
- **Página do prestador suspensa/pausada/excluída**: `proposalBizOpen` (model.js:27) exige
  `!suspended && !paused` e, para a própria página, `live`. O botão "Escolher" desaparece da coluna
  (`proposalBizOpen(b)` na condição, views.js:36).
- **Pedido concluído** (`done`): o cartão da escolhida troca o botão por "Serviço concluído em …" e some o
  "Desistir" (views.js:21). `requestChosenCard` continua aparecendo. Não há ação de reabrir o concluído:
  `complete-request` exige `status==='chosen'` (handlers.js:29) e o único "voltar" é o **Desfazer do toast**
  (handlers.js:30), que devolve `chosen` e apaga `doneAt` apenas se o pedido ainda estiver `done`.
- **Pedido cancelado** (`cancelled`): as propostas `sent` viram `declined` (handlers.js:52); o `requestRow`
  deixa de mostrar a contagem de propostas (`st!=='cancelled'`, views.js:2); o detalhe não mostra mais o
  botão de cancelar nem permite escolher.
- **Sem página de negócio / perfil não verificado**: `propose` e `submit-proposal` passam por
  `providerCanSee`/`state.myBiz?.live`; `submit-request`/`choose-proposal`/`complete-request`/
  `give-up-proposal` passam por `canPost()`.

##### Diferenças por viewport

- **375**: `styles/proposal-compare.css:25` — `@media(max-width:719px){.prop-compare{grid-auto-columns:84%}}`,
  ou seja cada coluna ocupa 84% da largura e a comparação vira carrossel com encaixe
  (`scroll-snap-align:start`, CSS:5), continuando com as 6 linhas alinhadas. O `tabindex="0"` e o
  `:focus-visible` (`proposal-compare.css:4`) existem para rolar a região pelo teclado. Pelas regras gerais
  de `styles/base.css:28`: `.list-row{padding:14px}`, `.detail-title h1{font-size:25px}`,
  `.form-grid{grid-template-columns:1fr}` e `.form-grid .full{grid-column:auto}` (os dois editores são
  `.form-grid`), `md-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px)}`.
  Abaixo de 720px o diálogo é folha arrastável: `shell/dialogs.js:33` liga o arrasto do `.sheet-grab` e
  `dialogs.js:35` fecha quando o arrasto passa de 110px (ou >30px com velocidade >0,5). O diálogo do tipo
  `editor` **não** é `prototype`, logo participa do arrasto.
- **768**: `styles/base.css:29` (`min-width:720px`) troca a barra inferior por trilho lateral de 96px e move
  o `snackbar`; `proposal-compare.css` não tem regra acima de 719px, então as colunas voltam a
  `minmax(230px,1fr)` e a comparação fica lado a lado com rolagem apenas quando não couber.
- **1440**: `styles/base.css:30` (`min-width:1200px`) — `.section-title h2{font-size:22px}` e
  `padding-top` da página 36px. Nada próprio da área.
- **Imersivo não se aplica**: `body.immersive` só para `anuncio`/`negocio` (`shell/navigation.js:84`).

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Editor da proposta** — `openProposalEditor`, `views.js:24`; `showDialog(p?'Editar proposta':'Enviar proposta', …, …, 'editor')`.
   - Pré-checagens silenciosas (`views.js:24`): sai sem abrir se `!r || !state.myBiz?.live || !requestActive(r)`;
     se não há proposta própria e `requestFull(r)`, `notify('Este pedido já recebeu 5 propostas.','info')`.
   - Cabeçalho `p.form-note`: `"{título} · {bairro} · {quando}"`.
   - Campos:
     | id | rótulo | tipo | limites / obrigatoriedade |
     |---|---|---|---|
     | `prop-kind` | "Valor" | `md-outlined-select` | `[['fixed','Valor fixo'],['range','Faixa de valor'],['visit','A combinar após visita']]`; valor inicial = `p?.price.kind||'fixed'`; `class="full"` |
     | `prop-value` | "Valor (R$)" | `number` | `min="1" max="1000000"`; visível só com `data-price="fixed"` (`toggle`, views.js:24) |
     | `prop-min` | "De (R$)" | `number` | `min="1" max="1000000"`; visível só com `data-price="range"` |
     | `prop-max` | "Até (R$)" | `number` | `min="1" max="1000000"`; visível só com `data-price="range"` |
     | `prop-date` | "Disponível a partir de" | `input type="date"` | `min=dateISO()`, `value=p?.date||dateISO(2)` |
     | `prop-valid` | "Proposta válida até" | `input type="date"` | `min=dateISO()`, `value=p?.validUntil||dateISO(7)` |
     | `prop-duration` | "Prazo de execução" | texto | `required maxlength="40"`, `supporting-text="Ex.: 1 dia, 2 a 3 dias"`, `class="full"` |
     | `prop-msg` | "Mensagem para o cliente" | `textarea rows=3` | `required minlength="10" maxlength="400"`, `class="full"` |
   - `p.form-note` = `REQUEST_NOTE`. Botões: **"Cancelar"** (`close-dialog`) e **"Salvar proposta"**
     (editando) ou **"Enviar proposta"** (`submit-proposal` com `data-value=rid`, `filled`, `send`).
   - Validações nativas primeiro: `validFields(['prop-duration','prop-msg'])` (`listings/editor.js:11`) usa
     `reportValidity()`.
   - Mensagens de erro literais (`handlers.js:60`, `notify(problem,'error')`): "Informe o valor da proposta." ·
     "Informe a faixa: o valor final precisa ser maior que o inicial." ·
     "A data disponível precisa ser hoje ou depois." · "A validade precisa ser hoje ou depois." ·
     "Informe o prazo de execução." · "O prazo pode ter até 40 caracteres." ·
     "Escreva uma mensagem com pelo menos 10 caracteres." · "A mensagem pode ter até 400 caracteres."
   - Limite de concorrência: se não havia proposta e o pedido ficou cheio, `notify('Este pedido já recebeu 5 propostas.','info')` (handlers.js:62).
   - Ao concluir (handlers.js:64): se já existia, `Object.assign(old, data)` (mantém `id`, `bizId`, `status`,
     `at`); senão empurra `{id, bizId:state.myBiz.id, ...data, status:'sent', at:Date.now()}`. `data` =
     `{price:{kind,min:(fixed?v:range?min:null),max:(range?max:null)}, date, validUntil:valid, duration, msg}`.
     Fecha o diálogo, `render()` e `notify(old?'Proposta atualizada':'Proposta enviada','send')`.
2. **Confirmação "Escolher esta proposta?"** (`confirm`, handlers.js:23) — texto:
   `"{empresa} · {preço}. As outras propostas serão recusadas e a conversa com a empresa será aberta. {REQUEST_NOTE}"`,
   botões `cancel-confirm` ("Continuar") e `accept-confirm` ("Confirmar") (`shell/dialogs.js:20`). Ao aceitar:
   o pedido vira `chosen`, as `sent` viram `declined` (ou `chosen` na escolhida), `requestDeclinedNotice(r)`,
   `ensureThread('biz',b.id,'Olá! Escolhi sua proposta para {título} em {bairro}. Podemos combinar os detalhes?')`
   e navegação para `conversa/{threadId}`; senão `render()`. `notify('Proposta escolhida. Combine os detalhes
   na conversa.','check_circle')` (handlers.js:24).
3. **Confirmação "Cancelar pedido?"** (handlers.js:52) — texto "As empresas deixam de ver o pedido e as
   propostas recebidas são encerradas.". Sucesso: `notify('Pedido cancelado','close')`.
4. **Confirmação "Desistir desta proposta?"** (handlers.js:44) — texto
   `"{empresa} deixa de ser a escolhida. O pedido volta a receber propostas e as outras propostas ainda válidas voltam à lista."`
   quando `Date.now() <= r.expiresAt`; senão "…O prazo do pedido já passou, então ele fica encerrado.".
   Efeito: `p.status='gaveup'`, `p.gaveUpAt`, `r.status='open'`, `r.chosen=null`, `r.threadId=null`; se
   reaberto, cada proposta `declined` **não vencida e de página aberta** volta para `sent`;
   `requestGaveUpNotice(r,p,restored)`. Sucesso: "Proposta desistida. Pedido reaberto com {n} proposta(s) ainda
   válida(s)." / "Proposta desistida. Pedido reaberto: as empresas do ramo podem enviar novas propostas." /
   "Proposta desistida. O prazo do pedido já passou e ele ficou encerrado." (ícone `undo`).
5. **Confirmação "Retirar proposta?"** (handlers.js:69) — texto "O cliente deixa de ver sua proposta. Você pode
   enviar outra enquanto o pedido estiver aberto.". Sucesso: `notify('Proposta retirada','undo')`.
6. **Confirmação "Descartar alterações?"** — o mesmo caso 2 da rota `pedidos` (`dialogs.js:13`), para os dois
   editores.
7. **Menu de bairro**: não existe nesta rota (o editor da proposta não pede bairro).

Sobre o **Desfazer dos toasts**: `complete-request` e as notificações de pedido passam `undo` como segundo
argumento só no primeiro caso (handlers.js:30); os demais são apenas informativos. `undo` é tratado em
`app/handlers.js:143` (pilha em `shell/toasts.js:32`), com 7000 ms (`TOAST_UNDO_MS`, toasts.js:8) e empilhamento
máximo de 2 (`TOAST_STACK_MAX`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `proposal-sort` | `views.js:34` (chips "Chegada"/"Menor valor"/"Mais cedo") | `arrival`/`price`/`date` | reordena as colunas no lugar | `handlers.js:7` |
| `choose-proposal` | `views.js:36` (botão "Escolher"); `views.js:9` — **código morto** (só renderiza se `showChoose`, que nenhum chamador passa; único chamador é `views.js:16`, sem essa chave) | `{rid}\|{pid}` | confirmação → escolhida, demais recusadas, conversa aberta, navega para `conversa` | `handlers.js:18-26` |
| `complete-request` | `views.js:21` ("Serviço concluído") | id do pedido | `status:'done'` + `doneAt`; toast com Desfazer; cartão troca o botão pela data | `handlers.js:28-32` |
| `chat-provider` | `views.js:21` ("Conversar com o prestador") | id do pedido | abre a conversa da escolha (ou `contact('biz',…)` se não existir e a página estiver aberta) | `handlers.js:33-40` |
| `give-up-proposal` | `views.js:21` ("Desistir desta proposta") | id do pedido | confirmação → `gaveup`, pedido reabre com as válidas restauradas; avisos ao prestador | `handlers.js:41-49` |
| `cancel-request` | `views.js:14` ("Cancelar pedido") | id do pedido | confirmação → `cancelled`, propostas `sent` → `declined`; `notify('Pedido cancelado','close')` | `handlers.js:50-54` |
| `propose` | `views.js:16` ("Enviar proposta"); `views.js:9` ("Editar proposta") | id do pedido | valida página aberta/visibilidade e abre o editor da proposta | `handlers.js:55` |
| `withdraw-proposal` | `views.js:9` ("Retirar") | id do pedido | confirmação → `status:'withdrawn'`; `notify('Proposta retirada','undo')` | `handlers.js:67-71` |
| `submit-proposal` | `views.js:24` | id do pedido | cria/atualiza a proposta; `notify`; fecha o diálogo | `handlers.js:56-66` |
| `open-thread` | `views.js:9` e `views.js:36` ("Abrir conversa") | id da conversa | abre `conversa` (guardando o retorno) | `features/messaging/actions.js:27` |
| `open-biz` | `views.js:9` e `views.js:36` ("Ver empresa") | id da página | navega para `negocio/{id}` | `app/handlers.js:108` |
| `report` | `views.js:9` e `views.js:36` (`proposal\|{id}`), `views.js:16` (`request\|{id}`) | tipo + id | abre "Denunciar conteúdo" | `app/handlers.js:39` → `features/profile/demo-actions.js:94` |
| `close-dialog` | `views.js:23` e `views.js:24` ("Cancelar") | `''` | fecha o editor (com aviso de alterações não salvas) | `app/handlers.js:80` |
| `remove-photo` / `cover-photo` | `features/listings/editor.js:2` (miniaturas das fotos, só no editor do pedido) | índice | remove/torna capa a foto | `app/handlers.js:92` / `features/listings/photos.js:25` |

---

### 2.8 Conversas (lista e conversa aberta)

#### 2.8.1 Rota `conversas` — sem parâmetro

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): `"Conversas"`
- Aba ativa (`activeTab`, `shell/navigation.js:54`): `conversas` (a própria rota é raiz)
- De onde se chega:
  - item `Conversas` da navegação (`data-action="nav" data-value="conversas"`, `shell/navigation.js:65`);
  - aviso de novo contato (`state.notices[].go=['conversa',id]`, `features/businesses/plans.js:68`) via
    `notice-open` → `noticeDestination` → `navigate(name,id)` (`features/profile/demo-actions.js:41,85`);
  - menu `Criar` → `menu Criar` não leva aqui; o caminho comum é voltar de `conversa`
    (`messagingPrepareBack` + `back`, `actions.js:5`, `shell/navigation.js:51`);
  - `Apagar conversa` navega para cá (`actions.js:66`).
- Desenhada por: `renderThreads` em `features/messaging/views.js:2`; helpers próprios `threadRow`
  (`views.js:1`) e `threadTitle` (`views.js:3`); paginação por `pagedHtml`
  (`shell/paged-list.js:7`).
- Parâmetro: nenhum.

##### Conteúdo, de cima para baixo

1. **Cabeçalho da página** (`views.js:2`): `<h1>Conversas</h1>` e
   `<p>Contatos sobre anúncios e serviços da cidade.</p>`. Sem botão no cabeçalho.
2. **Faixa de cidade consultada** (`readonlyHtml()`, `views.js:2` → `shell/navigation.js:108`), só quando
   `state.city !== state.homeCity`: ícone `visibility`, texto
   `Você está conhecendo <b>{cidade}</b>. Sua cidade atual é {homeCity}.` e botão texto `"Voltar"`
   (`data-action="home-city"`).
3. **Lista** (`views.js:2`, só quando há conversas): `pagedHtml('threads', state.city, ts, threadRow, {noun:'conversas', art:'as', wrap:'list'})`
   → `<div class="list" data-paged="threads">`. Ordenação: fixadas primeiro, depois
   `updatedAt` decrescente (`(b.pinned?1:0)-(a.pinned?1:0)||(b.updatedAt||0)-(a.updatedAt||0)`).
   Filtro: `t.city===state.city && !t.deleted`.
4. **Linha da conversa** (`threadRow`, `views.js:1`) — três alvos na mesma linha (`.list-row`):
   - `button.avatar` (`data-action="open-thread"`, `data-value="{t.id}"`, `aria-label="Abrir conversa com {who}"`),
     conteúdo `t.ini` ou `initals(t.who)`;
   - `button.txt` (mesma ação/valor) com três linhas:
     - `<b>{who}{t.unread?' · nova':''}{t.pinned?' · fixada':''}</b>`;
     - `<small>{threadTitle(t)}</small>`;
     - `<small>{isBlocked(t.who)?'Você bloqueou esta pessoa':t.msgs.at(-1)?.t||'Comece a conversa'}</small>`;
   - `iconBtn('more_vert','thread-menu',t.id,'Opções da conversa')` — `aria-haspopup="menu"`
     (aplicado por `/.${-menu$/}` em `shell/primitives.js:8`).
5. **Título da conversa** (`threadTitle`, `views.js:3`), consoante `t.about.type`:
   - `item` → `itemById(id)?.title || t.snapshot?.title || 'Anúncio encerrado'`;
   - `biz` → `bizById(id)?.name || t.snapshot?.title || 'Negócio'`;
   - qualquer outro (nos dados iniciais, `type:'text'`) → `t.about.t || 'Conversa da comunidade'`.
6. **Paginação** (`shell/paged-list.js:5-17`): blocos de 24 (`LIST_PAGE=24`). Enquanto `n<total`:
   `<small>Mostrando {n} de {total} conversas</small>` + barra + botão `"Mostrar mais {k}"`
   (`data-action="list-more"`, `data-value="threads"`). No fim: `<small>Você viu as {total} conversas</small>`.
   Com `wrap:'list'` não há cartões de espera (o esqueleto só existe para `wrap:'card-grid'`,
   `paged-list.js:35`); o rodapé mostra `"Carregando mais {k}…"` (`paged-list.js:34`).
7. **Barra do topo nesta rota** (`shell/navigation.js:60`): como `conversas` é raiz, mostra a marca com o
   rótulo `"Conversas"` (`route.name==='inicio'?'Bivaque':esc(titleForRoute())`), o botão de cidade
   (`btn(state.city,'city','','text','expand_more')` com classe `city-chip`) e, à direita,
   `chatTopActions()||questionTopActions()||iconBtn('search','search','','Buscar')` → nesta rota ambos
   devolvem `''` (`navigation.js:78-79`, `features/community/manage.js:11`), logo aparece o **ícone de busca**.
   `syncTopTitle` no celular esconde o título grande da barra até o `h1` passar por baixo dela
   (`navigation.js:88-89`, `styles/top-title.css:4-9`).
8. **Barra inferior / lateral de navegação** (`navigation.js:65`): item `Conversas` com
   `aria-current="page"` quando a aba ativa é `conversas`, e **pílula de não lidas** no ícone:
   `chats = state.threads.filter(t=>t.city===state.city&&!t.deleted&&t.unread&&!isBlocked(t.who)).length`
   (`navigation.js:59`), renderizada como `<span class="badge">{chats}</span>` dentro de `.nav-icon`
   (`navigation.js:65`), com `.badge{position:absolute;right:2px;top:3px;...}` e
   `.nav-item .badge{top:-2px;right:2px}` (`styles/base.css:27`). No celular, antes do item aparece o
   espaço `Criar` (`<span class="nav-create-slot">Criar</span>`, `navigation.js:65`), que ao clique chama
   `$('#fab').click()` (`navigation.js:66`).

##### Estados

- **Vazio** (`views.js:2`): quando `ts.length` é 0 →
  `empty('Nenhuma conversa ainda','Abra um anúncio ou negócio e toque em “Tenho interesse” ou “Pedir orçamento”.','chat_bubble','home','Explorar a cidade')`.
  Texto exato: título `Nenhuma conversa ainda`; corpo
  `Abra um anúncio ou negócio e toque em “Tenho interesse” ou “Pedir orçamento”.`; botão tonal
  `Explorar a cidade` (`data-action="home"`).
- **Carregando / esqueleto**: não existe nesta rota. O que existe é o rodapé de paginação
  (`Mostrando n de total conversas` / `Carregando mais k…`, `paged-list.js:34`) e o
  `<span class="paged-live" role="status" data-paged-live="threads">` (`paged-list.js:10`).
- **Erro / indisponível**: não há estado de erro próprio. Conversa apagada sai da lista por
  `!t.deleted` (`views.js:2`) — não é uma linha desabilitada.
- **Outra cidade (`readonly()` = `state.city!==state.homeCity`, `app/state.js:58`)**: a lista mostra as
  conversas **da cidade consultada** (`t.city===state.city`); como os dados iniciais só criam conversas em
  Manaus (`app/state.js:10,85`), na prática ela fica vazia — e a faixa `Você está conhecendo …` aparece
  acima do vazio. `messages`/`open-thread` continuam permitidos, mas enviar não (`actions.js:16-19`).
- **Sem acesso / verificação de teste pendente**: o item da navegação continua visível; o bloqueio só
  acontece dentro da conversa (`actions.js:17-18`).
- **Pessoa bloqueada**: a linha continua na lista (não é filtrada por `isBlocked`, só o badge de não lidas
  é) e a terceira linha vira `Você bloqueou esta pessoa` (`views.js:1`).
- **Conversa apagada localmente**: `deleted=true` a remove daqui e de `messagingThread`
  (`actions.js:10`); a linha reaparece com `Desfazer` do aviso (`actions.js:66`).
- **Falha ao gravar**: `mutate` devolve `false` e avisa
  `'Não foi possível salvar. Libere espaço no navegador ou use fotos menores.'` (`app/state.js:29`); nesta
  rota a ação só recusa quando não consegue gravar, sem mensagem própria.

##### Diferenças por viewport

- **375** (estilos gerais `@media(max-width:479px)`, `styles/base.css:28`): `--space:16px`, `.list-row{padding:14px}`,
  `.page-head{gap:8px}`, `.context-strip{font-size:13px}`. A lista é 1 coluna; a ação da linha é o `⋮`
  (que abre o menu) e o **deslizar** (ações de 62 px cada, `styles/overlays.css:19`; largura total
  `3*62+16 = 202 px`, `gestures.js:6`). A dica de deslize só existe aqui (`innerWidth<720`, `gestures.js:21`).
  A dica de deslize só na primeira visita e uma vez por aparelho (`localStorage 'bivaque-swipe-hint'`,
  `gestures.js:22`).
- **768** (`@media(min-width:720px)`, `styles/base.css:29`): `--rail:96px`, `--bottom:0px`, `--space:28px`,
  `.page{padding-top:32px}`; a navegação vira barra lateral esquerda de 96 px e a barra inferior sai
  (`body.mobile-detail`/`#nav.hidden` dependem de `innerWidth<720`, `navigation.js:92-95`).
  `.list` continua com uma coluna (não há regra de grade para `.list`).
- **1440**: idêntico a 768 — não há regra nova para esta rota; `.page` fica limitado por
  `--max` (1120 px em `styles/base.css:19`, e `.list` dentro dele). O `⋮` da linha é o mesmo.
- **Nada muda em `chatWide`** nesta rota: `chatWide` (`navigation.js:102`) só força `render()` de
  `conversa` (`navigation.js:103`).

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Menu `Ações da conversa`** — `iconBtn('more_vert','thread-menu',t.id,…)` (`views.js:1`) →
   `messagingAction('thread-menu')` → `openCreate(el, [...], false, 'Ações da conversa')`
   (`actions.js:53`). É o menu de contexto genérico: `popup.classList.add('context-menu')`, com prévia
   inerte do alvo (`shell/create-menu.js:31,38`) e `role="menu"`. Itens, na ordem, com `data-value`:
   - `['drafts'|'chat_bubble', 'Marcar como lida'|'Marcar como não lida', 'thread-unread', '', t.id]`
     (`t.unread` decide ícone e rótulo);
   - `['push_pin', 'Soltar conversa'|'Fixar conversa', 'pin-thread', '', t.id]`;
   - `['flag', 'Denunciar conversa', 'report', '', 'thread|'+t.id]`;
   - `isBlocked(t.who) ? ['visibility', 'Desbloquear {who}', 'unblock-person', '', t.who]
     : ['cancel', 'Bloquear {who}', 'block-person', '', t.who]`;
   - `['delete', 'Apagar conversa', 'swipe-delete-thread', '', t.id, danger=true]` (classe `danger-action`).
   Fecha por `Esc`, clique no fundo (`#create-scrim`) ou navegação (`shell/create-menu.js:72-75`,
   `navigation.js:41`).
2. **Aviso (snackbar)** — `notify` (`shell/toasts.js:18`): `Conversa local apagada` com `Desfazer`
   (`actions.js:66`), `Conversa fixada`/`Conversa solta` (`actions.js:62`),
   `Conversa marcada como não lida`/`Conversa marcada como lida` (`actions.js:59`), além de
   `"Está passando"`-style avisos genéricos. O texto genérico `'Não foi possível salvar. Libere espaço no navegador ou use fotos menores.'`
   vem de `app/state.js:29`.
3. **Diálogo de confirmação de apagar** (`confirm`, `shell/dialogs.js:20`) — título
   `"Apagar conversa local?"`, texto
   `"A conversa ficará oculta neste dispositivo. Você poderá desfazer logo após apagar."`, botões
   `Continuar` (`cancel-confirm`, texto) e `Confirmar` (`accept-confirm`, preenchido) — padrão de
   `{ok:'Confirmar', cancel:'Continuar'}` (`actions.js:64`). Se a gravação falhar, nada é apagado.
4. **Diálogo de denúncia** — `report` com valor `thread|{t.id}` → `openReport('thread', id)`
   (`app/handlers.js:39`, `features/profile/demo-actions.js:94`): título `"Denunciar conteúdo"`, campo
   `selectField('report-reason','Motivo',[…])` com opções `''`→`Escolher motivo`, `spam`→
   `Spam ou propaganda inadequada`, `fraud`→`Informação enganosa`, `privacy`→`Exposição de dados pessoais`,
   `abuse`→`Ofensa ou comportamento inadequado`, `other`→`Outro motivo` (`required`); campo
   `field('report-details','Detalhes (opcional)','','type="textarea" rows="3" maxlength="1000"')`;
   nota `"No modo teste, a denúncia fica registrada neste dispositivo."`; botões `Cancelar`
   (`close-dialog`, texto) e `Registrar denúncia` (`submit-report`, `thread|id`, preenchido).
   Em `submitReport` (`features/owner/review.js:106`): sem motivo → erro no campo
   `'Escolha o motivo.'`; denúncia aberta repetida → aviso
   `'Você já denunciou este conteúdo. A equipe do Bivaque está revisando.'`; sucesso →
   `'Denúncia registrada. A equipe do Bivaque revisa em até 24 h.'` (`flag`). (mesmo overlay — ver 2.5.1, overlay 7.)
5. Não há outros overlays nesta rota.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `nav` | `shell/navigation.js:65` | `conversas` | navega para esta rota (item da navegação) | `app/handlers.js:21` |
| `city` | `shell/navigation.js:60` | — | abre o diálogo de cidade | `app/handlers.js:62` |
| `search` | `shell/navigation.js:60` | — | vai para `busca` | `app/handlers.js:41` |
| `create` | `shell/template.html:5` (`#fab`), `navigation.js:66` (slot Criar) | — | abre o menu Criar | `app/handlers.js:83` |
| `prototype` / `settings` | `shell/navigation.js:65` | — | abre os diálogos de controle/config | `app/handlers.js:71,69` |
| `open-thread` | `views.js:1` (avatar e `.txt`) | `t.id` | `navigate('conversa', id)`; marca como lida e devolve o foco ao voltar | `actions.js:27` |
| `thread-menu` | `views.js:1` (`⋮`) | `t.id` | abre `Ações da conversa` | `actions.js:52` |
| `home` | `views.js:2` (botão do vazio `Explorar a cidade`) | — | vai para `inicio` | `app/handlers.js:22` |
| `list-more` | `shell/paged-list.js:14` | `threads` | acrescenta o próximo bloco de 24 linhas | `shell/paged-list.js:46` |
| `thread-unread` | deslize `gestures.js:41` / menu `actions.js:53` | `t.id` | alterna nova/lida; aviso + `render()` | `actions.js:57` |
| `pin-thread` | deslize `gestures.js:41` / menu `actions.js:53` | `t.id` | fixa/solta e reordena; aviso | `actions.js:61` |
| `swipe-delete-thread` | deslize `gestures.js:41` / menu `actions.js:53` | `t.id` | confirmação → apaga local + `Desfazer` | `actions.js:64` |
| `report` | menu `actions.js:53` | `thread\|{id}` | abre o diálogo de denúncia | `app/handlers.js:39` |
| `block-person` / `unblock-person` | menu `actions.js:53` | `t.who` | desbloqueia direto; bloquear pede confirmação | `features/profile/blocks.js:46-47` |
| `undo` | `shell/toasts.js:10` | `''` ou id do aviso | desfaz o apagamento | `app/handlers.js:143` |
| `close-dialog` / `cancel-confirm` / `accept-confirm` / `submit-report` | diálogos acima | — | fecham/confirmam | `app/handlers.js:80-82,40` |
| `back` | `shell/navigation.js:60` | — | `back()` | `app/handlers.js:23` |
| `home-city` | `shell/navigation.js:108` (faixa) | — | volta para a cidade da conta | `app/handlers.js:68` |

---

#### 2.8.2 Rota `conversa` — id de conversa

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): `"Conversa"`
- Aba ativa (`activeTab`, `shell/navigation.js:54`): `conversas`
- De onde se chega:
  - `open-thread` na lista (`views.js:1`);
  - `item-interest` (anúncio) → `contact('item',id,'Olá! …')` → `navigate('conversa', t.id)`
    (`app/handlers.js:97`, `actions.js:89`);
  - `item-visit` e `send-offer` → `contact(...)` (`app/handlers.js:100,99`);
  - `quote` (negócio) → `contact('biz',id,'Olá! Vi sua página no Bivaque. Pode me passar um orçamento?')`
    (`app/handlers.js:114`, `actions.js:89`);
  - `open-thread` em diálogos de contatos: `Contatos recebidos` de anúncio/página
    (`app/handlers.js:105-107`) e `profileRow('chat_bubble',…,'open-thread',t.id)`;
  - `open-thread` de pedido de serviço: `Abrir conversa` na proposta escolhida
    (`features/requests/views.js:9,36`);
  - escolher proposta cria a conversa e navega (`features/requests/handlers.js:24`);
  - `notice-open` de um aviso com `go=['conversa',id]` (`features/profile/demo-actions.js:41,85`);
  - voltar de `back()` usa `conversas` como destino de `conversa` (`shell/navigation.js:51`).
- Desenhada por: `renderChat` em `features/messaging/views.js:4` (4-13); helpers próprios
  `threadTitle` (`views.js:3`), `messagingQuickReplies` (`views.js:16`),
  `messagingQuickRepliesHtml` (`views.js:17`), `chatMessagesHtml` (`bubbles.js:30`).
- Parâmetro: `route.id` → `messagingThread(route.id)` → `threadById` (`app/state.js:57`), ou seja
  **id de conversa** (`state.threads[].id`).

##### Conteúdo, de cima para baixo

1. **Cabeçalho da página** (`views.js:12`, `div.page-head.chat-head`): avatar (`t.ini`/`initals(t.who)`),
   `<h1 id="chat-heading" tabindex="-1" style="font-size:23px">{who}</h1>` e
   `<p>Conversa sobre {threadTitle(t)}</p>`, mais um `⋮` (`iconBtn('more_vert','thread-menu',t.id,…)`).
   No celular este bloco inteiro fica fora da vista, mantendo o `h1` para leitor de tela e foco
   (`styles/chat-mobile.css:14`), e o `⋮` de dentro dele é escondido (`chat-mobile.css:16`).
2. **Nota de demonstração** (`views.js:12`, `p.form-note`):
   `Demonstração: mensagens fictícias salvas apenas neste navegador. Nenhuma mensagem real é enviada.`
3. **Contexto da conversa** (`views.js:12`, `button.conversation-context`, `data-action="thread-origin"`,
   `data-value="{t.id}"`): miniatura da origem quando existe
   (`ref = item → itemById(t.about.id)`, `biz → bizById(...)`, senão `null`; `photo = ref?.photos?.[0] || t.snapshot?.photo`)
   e, sem foto, `icon('info')`. Texto: `<b class="small">{threadTitle(t)}</b>` e
   `<span class="tiny muted">Ver a origem do contato</span>`, mais `icon('chevron_right')`.
   Ao tocar: navega para `anuncio` (origem `item`) ou `negocio` (origem `biz`) com `ref.id`
   (`actions.js:46-50`). Se a origem não estiver acessível (`accessibleRecord(ref)`, `app/state.js:64`),
   mostra `A origem deste contato não está mais disponível. O histórico da conversa foi preservado.`
   — é o que acontece nas conversas cujo `about.type` não é `item` nem `biz` (nos dados iniciais, `t3`,
   `about.type:'text'`, `data/demo/source.js:1`).
4. **Aviso de segurança** (`views.js:12`, `p.chat-safety`): `icon('verified_user')` +
   `Nunca pague adiantado nem envie documentos pelo chat. Combine a entrega em local público.`
   Estilo: `styles/chat-mobile.css:9-10` (fundo `surface-container`, raio 14 px, 13/19 px, ícone em
   `primary`, 20 px).
5. **Histórico** (`views.js:12`, `div.message-list.chat-list#message-list` com
   `aria-label="Histórico da conversa fictícia"`): `chatMessagesHtml(t)` (`bubbles.js:30`); se não houver
   mensagem, `empty('Combine os detalhes por aqui','Descreva o que você procura e confirme preço, disponibilidade e horário.','chat_bubble')`
   (sem botão).
   - **Grupos de balões** (`bubbles.js:23-26`): duas mensagens seguidas ficam no mesmo grupo se `me` é
     igual e, quando ambas têm `at` numérico (`chatAt`, `bubbles.js:15`), se a diferença for menor que
     5 min (`CHAT_GROUP_MS=5*60e3`, `bubbles.js:5`) e o dia for o mesmo; mensagens sem `at` agrupam
     só por pessoa.
   - **Classes** (`bubbles.js:38`): `msg-row{ me? first? last? enter? }`; `enter` só nas mensagens novas
     desde o último render (`chatSeen` por conversa, `bubbles.js:7,31`) e anima o balão
     (`styles/chat-bubbles.css:26-28`, desligado com `prefers-reduced-motion`).
   - **Separador de dia** (`bubbles.js:35,40`): `<p class="chat-day" role="separator" aria-label="{dia}">{dia}</p>`,
     com `chatDay` (`bubbles.js:8-12`) → `"Hoje"`, `"Ontem"` ou data curta `pt-BR` (`{dia} de {mês abreviado}`);
     mensagens sem `at` não geram separador.
   - **Hora e estado do balão** (`bubbles.js:37,39`): `<small>` só existe quando há algo a mostrar —
     hora (`chatTime`, `bubbles.js:13`, `HH:MM` em pt-BR) na última mensagem de cada grupo e, **apenas na
     última mensagem própria**, `icon('check')` + `Você · ` + `Salva no aparelho`. Texto exato do estado:
     `Salva no aparelho`. **Não existe "enviado" nem "lido" por mensagem** — `unread` é por conversa.
   - **Reações locais** (`bubbles.js:6,17-20`): `CHAT_REACTIONS=[['👍','Curtir'],['❤️','Amei'],['😂','Haha'],['🙏','Obrigado']]`.
     Só mensagens recebidas (`m.me` falso) recebem `chatReactionHtml` (chip) e `chatPickerHtml` (seletor).
     Com reação: `button.msg-reaction#react-{i}` com o emoji, `data-action="react-msg"`,
     `data-value="{t.id}|{i}|"`, `aria-label="Sua reação: {rótulo}. Remover"`. Sem reação:
     `<span class="msg-reaction" id="react-{i}" hidden></span>`. O seletor é
     `button.msg-react` com `"☺"`, `aria-label="Reagir à mensagem: {trecho}"`, `aria-expanded`,
     `aria-controls="react-pick-{i}"`, seguido de `div.msg-picker#react-pick-{i}` (`role="group"`,
     `aria-label="Escolha uma reação"`, `hidden`) com quatro botões `data-action="react-msg"`,
     `data-value="{t.id}|{i}|{emoji}"`, `aria-label` = rótulo e `aria-pressed="{m.react===e}"`.
     No ponteiro fino o `☺` fica invisível até `:hover`/`:focus-within`/aberto
     (`styles/chat-bubbles.css:21`); o `bubble` do balão com reação ganha 12 px de margem inferior
     (`chat-bubbles.css:14`). O seletor abre para cima do balão (`chat-bubbles.css:22`).
   - **Fechamento do seletor** (`bubbles.js:43-48`): clique fora de `.msg-react`/`.msg-picker`,
     `Escape` (só com o foco dentro de um `.msg-row` e sem `[inert]`) e `focusout` do `msg-row`.
6. **Rascunho e pílula da caixa de entrada** (`views.js:7,10`):
   `draft = messagingDrafts.get(t.id) ?? t.draft ?? ''`. No celular (`innerWidth<720`) o campo é
   `<md-outlined-text-field id="chat-input" class="chat-pill" placeholder="Mensagem" aria-label="Mensagem" type="textarea" rows="1">`
   — sem rótulo flutuante, sem dica de teclado e sem contador fixo, conforme o comentário em
   `views.js:8-9`; o limite de 2.000 continua valendo no envio. No desktop, `field('chat-input','Mensagem',draft,'type="textarea" rows="1" maxlength="2000" supporting-text="Enter envia · Shift+Enter adiciona uma linha"')`.
   A pílula (`.chat-pill`, `styles/chat-mobile.css:18`) usa raio 24 px e reserva 56 px à direita para o
   botão de enviar; o botão é posicionado por cima, à direita (`chat-mobile.css:19`).
   Os dois ficam `disabled` quando `disabled === readonly() || !state.profile.verified || blocked`
   (`views.js:7,10-11`).
7. **Barra inferior de composição** (`actionsBar`, `views.js:11` → `shell/navigation.js:69`
   `#detail-actions`, fixo no rodapé por `styles/base.css:27`):
   - **Bloqueado** (`blocked`): `<div role="status">Você bloqueou {who}.</div>` +
     `btn('Desbloquear','unblock-person',t.who,'tonal')`. **Não** há campo, respostas rápidas nem `#chat-status`.
   - **Não bloqueado**: `messagingQuickRepliesHtml(t)` (só quando `disabled` é falso), depois
     `.compose-bar` com o campo e `iconBtn('send','send-message',t.id,'Enviar mensagem fictícia')`, e
     `<p id="chat-status" class="form-note" role="status" aria-live="polite" aria-atomic="true">` cujo
     conteúdo inicial é `Você está consultando {cidade}. Envie mensagens na sua cidade, {homeCity}.`
     (quando `readonly()`), ou `O perfil de teste precisa estar verificado para enviar mensagens.`
     (quando `!state.profile.verified`), ou vazio.
   - O botão de enviar **não recebe `disabled`** no HTML (`views.js:11`), embora exista CSS para
     `[disabled]` (`styles/chat-mobile.css:20`).
8. **Respostas rápidas** (`views.js:15-17`): `md-chip-set.quick-replies` com `aria-label="Respostas rápidas"`,
   chips `md-suggestion-chip` (`label`, `data-action="quick-reply"`, `data-value="{t.id}|{i}"`), em linha
   com `overflow-x:auto`.
   - Origem `item` (`t.about?.type==='item'`): `"O anúncio ainda está disponível?"`,
     `"Podemos combinar a retirada?"`, `"Aceita uma proposta?"`.
   - Demais origens: `"Pode me passar um orçamento?"`, `"Qual o horário de atendimento?"`,
     `"Atende no meu bairro?"`.
   - Comentário no código: `// Respostas rápidas (Rodada 10): md-suggestion-chip preenche o rascunho; nunca envia sozinho.`
     (`views.js:15`).
9. **Barra do topo nesta rota** (`chatTopTitle` `shell/navigation.js:78`, `chatTopActions` `:79`):
   - `#topbar` mostra `iconBtn('arrow_back','back','','Voltar')` e, no lugar do título genérico,
     `chatTopTitle()`:
     - desktop: `<span class="top-title grow tb-desk-title">Conversa</span>`;
     - celular: `<span class="top-title top-chat grow">` com `span.avatar` (iniciais) e
       `span.top-chat-txt` contendo `<b>{who}</b>` e `<small>{threadTitle(t)}</small>`.
   - À direita: `chatTopActions()` → `<span class="tb-desk">{iconBtn('search','search','','Buscar')}</span>`
     e `<span class="tb-phone">{iconBtn('more_vert','thread-menu',t.id,'Opções da conversa')}</span>`.
     No celular `.tb-desk`/`.tb-desk-title` somem e `.tb-phone` vira `display:contents`, então o `⋮` aparece
     na barra (`styles/chat-mobile.css:8,12`); no desktop, `.top-chat` e `.tb-phone` somem e ficam o título
     `"Conversa"` e a busca. O botão de cidade (`btn(state.city,'city',…)`) continua à direita.
   - `syncTopTitle` não faz o truque de esconder o título nesta rota (`!['inicio','busca','conversa'].includes`,
     `navigation.js:87`).
10. **Navegação**: `conversa` não é raiz, então no celular a barra inferior e o `#fab` somem
    (`syncMobileNavigation`, `navigation.js:93-95`) e `body` recebe `mobile-detail`; no desktop a barra
    lateral permanece com a aba `conversas` marcada (`navigation.js:54,65`).

##### Estados

- **Vazio (sem mensagens)**: `empty('Combine os detalhes por aqui','Descreva o que você procura e confirme preço, disponibilidade e horário.','chat_bubble')`
  (`views.js:12`).
- **Conversa inexistente/apagada/fora da cidade**: `messagingThread` devolve `null` (`actions.js:10`) e
  `renderChat` devolve `unavailable()` (`views.js:5`) →
  `empty('Conteúdo indisponível nesta cidade','Volte para a página inicial ou selecione a cidade em que o conteúdo foi publicado.','location_off','home','Ir para o início')`
  (`features/listings/detail.js:1`), com botão tonal `Ir para o início`.
- **Carregando / esqueleto**: não existe nesta tela.
- **Visita a outra cidade (`readonly()`)**: sem faixa de aviso no corpo — `renderChat` não chama `readonlyHtml()`.
  O estado aparece em (a) o campo desabilitado, (b) `#chat-status` com
  `Você está consultando {cidade}. Envie mensagens na sua cidade, {homeCity}.` e (c) respostas rápidas
  escondidas. Enviar por atalho também é recusado com a mesma frase (`messagingCanWrite`,
  `actions.js:17`).
- **Perfil de teste não verificado** (`!state.profile.verified`): campo desabilitado, respostas rápidas
  escondidas, `#chat-status` = `O perfil de teste precisa estar verificado para enviar mensagens.`
  (`views.js:11`, `actions.js:18`).
- **Pessoa bloqueada (`isBlocked(t.who)`, `app/state.js:33`)**: a barra de composição inteira é
  substituída por `Você bloqueou {who}.` + botão `Desbloquear` (`views.js:11`). O histórico continua
  visível. Enviar, reagir e abrir o seletor de reação são recusados
  (`actions.js:37`, `chatReactAction` em `bubbles.js:52,57`); a simulação de resposta avisa
  `Você bloqueou {who}. Nenhuma mensagem chega.` (`actions.js:110`). O `⋮` passa a oferecer
  `Desbloquear {who}` (`actions.js:53`).
- **Conversa que já foi minha página/negócio e limite do plano grátis** (`planReplyGate`,
  `features/businesses/plans.js:26-30`): ao enviar a **primeira** mensagem de uma conversa de negócio
  próprio, se `paidPlans()` e `tier!=='plan'` e já houver `PLAN_FREE_REPLIES` respostas novas no mês,
  abre `planLimitDialog()` (`plans.js:32`) — título `"Limite de conversas novas"`, nota
  `Você já respondeu {N} conversas novas neste mês. As conversas que você já respondeu continuam livres. As novas voltam em {dia}, ou agora com o Plano do negócio, que não tem limite.`
  e botões `Agora não` (`close-dialog`) e `Conhecer os planos` (`plans`).
- **Falha ao gravar**: `Salvando mensagem neste dispositivo…` (`actions.js:41`); se `mutate` devolver
  `false` → `Não foi possível salvar a mensagem. O texto foi mantido; libere espaço e tente novamente.`
  (`actions.js:43`), com o texto preservado no campo. Reação que não grava →
  `Não foi possível salvar a reação neste dispositivo.` (`bubbles.js:59`).
- **Sem `#chat-status`** (na faixa de bloqueado): `messagingFeedback` cai em `notify(text,'info')`
  (`actions.js:13`).
- **Item vendido/encerrado**: não se aplica ao histórico; a origem passa a `"Anúncio encerrado"` no
  título quando o anúncio não existe mais (`views.js:3`) e `thread-origin` explica que a origem sumiu
  (`actions.js:48`).

##### Diferenças por viewport

- **375** (`styles/chat-mobile.css:11-21`, `@media(max-width:719px)`): o cabeçalho da página fica
  invisível (`clip-path:inset(50%)`, `:14`) e o `⋮` dele é escondido (`:16`); a barra do topo passa a
  mostrar avatar + quem + assunto (`:12`); o campo vira a pílula (`:17-18`); o enviar fica sobreposto à
  direita (`:19`). A página usa `--bottom:76px` (`styles/base.css:19`) e o rodapé de composição é fixo
  acima da barra inferior (`styles/base.css:27`).
- **479 ou menos** (`styles/base.css:28`): `.page{padding-top:20px}`, `--space:16px`,
  `.detail-actions{padding-inline:12px}`, `.list-row{padding:14px}`, `.context-strip{font-size:13px}`.
- **768** (`@media(min-width:720px)`, `styles/base.css:29`): a página é `.chat-page{max-width:960px}`
  (a regra está dentro desta media query — em `styles/base.css:29`, seção final), a barra lateral de 96 px
  entra e a composição deixa de ser pílula: rótulo `Mensagem`, `maxlength="2000"` e
  `supporting-text="Enter envia · Shift+Enter adiciona uma linha"` (`views.js:10`). O `⋮` volta para o
  cabeçalho da página e a barra do topo mostra `"Conversa"` + busca.
- **1440**: igual a 768; `.message-list{max-width:800px;margin:20px auto}` (`styles/base.css:27`) e
  `.bubble{max-width:min(85%,560px)}` (`styles/chat-bubbles.css:7`) mantêm o histórico estreito e
  centralizado. `chatWide` (`shell/navigation.js:102`) só é recalculado no `resize` e, ao cruzar 720 px,
  redesenha a rota (`navigation.js:103`).
- **`prefers-reduced-motion`**: a entrada do balão é desligada (`styles/chat-bubbles.css:28`) e a dica de
  deslize não roda (`gestures.js:21`).
- **Alto contraste** (`forced-colors:active`): `.bubble`, `.msg-reaction` e `.msg-picker` ganham borda
  `CanvasText` e a reação escolhida, `outline 2px Highlight` (`styles/high-contrast.css:1`,
  `styles/chat-bubbles.css:29`).
- **Ponteiro fino** (`hover:hover`): o `☺` de reagir só aparece no hover/foco (`styles/chat-bubbles.css:21`).

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Menu `Ações da conversa`** — duas origens: `views.js:12` (cabeçalho da página, desktop) e
   `shell/navigation.js:79` (barra do topo, celular). O conteúdo é o mesmo de `actions.js:53`
   (lida/não lida, fixar, denunciar, bloquear/desbloquear, apagar — esta última com `danger`).
2. **Diálogo de confirmação de apagar** — igual ao da rota anterior (`actions.js:64`), com as mesmas
   mensagens; ao concluir navega para `conversas` (`actions.js:66`).
3. **Diálogo de denúncia de conversa** — `submit-report` com `thread|{id}`; ver rota anterior
   (`features/profile/demo-actions.js:94`, `features/owner/review.js:106-112`). (mesmo overlay — ver 2.5.1, overlay 7.)
4. **Diálogo de limite de plano** — `planLimitDialog` (`features/businesses/plans.js:32`), quando o
   gate do plano grátis fecha o envio; botão `Conhecer os planos` abre os planos (`app/handlers.js:125`).
   (mesmo overlay — ver 2.6.2, overlay 10.)
5. **Avisos da simulação de resposta** — `notify('Resposta fictícia salva neste dispositivo')`
   (`actions.js:110`) e recusas `Abra um anúncio e inicie uma conversa primeiro.` /
   `Você bloqueou {who}. Nenhuma mensagem chega.`.
6. **Avisos de envio** — `messagingFeedback` escreve no `#chat-status` quando ele existe:
   `Escreva uma mensagem antes de enviar.` e `A mensagem pode ter até 2.000 caracteres.` (com `error` no
   campo, `actions.js:39`), `Salvando mensagem neste dispositivo…` (`:41`) e
   `Mensagem fictícia salva neste dispositivo.` (`:44`). Com o campo sem foco e a rota errada,
   `notify('Abra esta conversa antes de enviar uma mensagem.','info')` (`:34`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `back` | `shell/navigation.js:60` | — | volta (fallback `conversas`) | `app/handlers.js:23`, `navigation.js:51` |
| `thread-menu` | `views.js:12` (página) e `navigation.js:79` (topo) | `t.id` | abre `Ações da conversa` | `actions.js:52` |
| `search` | `shell/navigation.js:79` (`tb-desk`) | — | vai para `busca` | `app/handlers.js:41` |
| `city` | `shell/navigation.js:60` | — | diálogo de cidade | `app/handlers.js:62` |
| `thread-origin` | `views.js:12` | `t.id` | vai para `anuncio`/`negocio` ou explica que a origem sumiu | `actions.js:46` |
| `quick-reply` | `views.js:17` | `{t.id}\|{i}` | acrescenta o texto ao rascunho (nunca envia) e foca o campo | `actions.js:26` |
| `send-message` | `views.js:11` (botão) e `actions.js:75` (Enter) | `t.id` | grava a mensagem, limpa o rascunho e redesenha | `actions.js:33` |
| `react-open` | `bubbles.js:28` (`☺`) | `{t.id}\|{i}` | abre/fecha o seletor de reações e foca a reação atual ou a primeira | `bubbles.js:49` (via `actions.js:25`) |
| `react-msg` | `bubbles.js:28` (seletor) | `{t.id}\|{i}\|{emoji}` | grava/troca a reação e avisa `Reação {rótulo} salva na mensagem "{trecho}".` | `bubbles.js:49` |
| `react-msg` | `bubbles.js:19` (chip já reagido) | `{t.id}\|{i}\|` | remove a reação: `Reação removida da mensagem "{trecho}".` | `bubbles.js:49` |
| `unblock-person` | `views.js:11` | `t.who` | desbloqueia e redesenha | `features/profile/blocks.js:47` |
| `block-person` | menu `actions.js:53` | `t.who` | confirmação de bloqueio | `features/profile/blocks.js:46` |
| `thread-unread` / `pin-thread` / `swipe-delete-thread` | menu `actions.js:53` | `t.id` | lida, fixar, apagar (com confirmação) | `actions.js:57,61,64` |
| `report` | menu `actions.js:53` | `thread\|{id}` | diálogo de denúncia | `app/handlers.js:39` |
| `plans` | `features/businesses/plans.js:32` | — | abre os planos | `app/handlers.js:125` |
| `nav` / `create` | `shell/navigation.js:65-66` | `inicio`/… | navegação lateral e Criar (desktop) | `app/handlers.js:21,83` |

---

### 2.9 Entrada (landing, cadastro, elegibilidade, entrar, convite, cidade e boas-vindas)

#### 2.9.1 Rota `entrar` — sem id (landing pública / "olá")

- Título na barra (`titleForRoute`, `navigation.js:53`): `"Bivaque"` → `document.title` vira
  `"Bivaque · Bivaque"` (`navigation.js:107`).
- Aba ativa (`activeTab`, `navigation.js:54`): `entrar` não está em nenhuma lista → devolve `origin`.
  Irrelevante: em `entrar` o `shell()` liga `body.entry-mode` (`navigation.js:58`) e
  `body.entry-mode #topbar/#nav/#fab{display:none}` (`styles/entry.css:5`), com `main{inset:0}`
  (`styles/entry.css:6`) e `.page.entry-page{max-width:none;padding:0}` (`styles/entry.css:7`).
- De onde se chega: `entryGate()` manda para cá quem está fora (`navigation.js:106`); "Voltar ao
  início" da tela de conta apagada (`help.js:141`/`159`); `entryAction` ao sair (`landing.js:198`).
- Desenhada por: `renderEntryLanding` em `landing.js:31-101`. Comportamento em
  `bindLanding`/`landingMount` (`landing.js:105-196`).
- Parâmetro: nenhum.

##### Conteúdo, de cima para baixo

1. `.ld-skip` — link "Pular para o conteúdo" (`landing.js:33`), vai para `#ld-main`.
2. `<header class="ld-top" id="ld-top">` (`landing.js:34-38`): logotipo (`mark()`) + `Bivaque`
   (`aria-label="Bivaque, início"`, `landing.js:35`); `<nav aria-label="Seções">` com as âncoras de
   `LANDING_NAV` (`landing.js:10`) — `"Como funciona"`, `"O que tem"`, `"Mudança de cidade"`,
   `"Perguntas"`; à direita o botão de texto `"Entrar"` (`entry-login`, `landing.js:37`), o CTA
   `"Criar conta"` (`entry-join`) e o botão de menu só no celular
   (`aria-label="Abrir menu"`, `landing.js:37`).
3. `.ld-hero #inicio` (`landing.js:41-50`): foto `landing-hero` (retrato abaixo de 860 px,
   `landing.js:42`, `alt="Famílias reunidas num fim de tarde, conversando em volta de uma mesa ao ar
   livre"`); etiqueta `"Marinha, Exército e Aeronáutica"` (`LANDING_FORCES`, `landing.js:7`); `<h1
   id="ld-h1">"Juntos somos mais fortes."` (`landing.js:8`); o lead de `LANDING_LEAD`
   (`landing.js:9`): `"A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto,
   ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos,
   pensionistas e suas famílias."`; CTA `id="ld-hero-cta"`; nota `"Familiar de militar? O convite leva
   ao mesmo cadastro, sem CPF."` (`landing.js:48`).
4. `#exemplo` "Como funciona" (`landing.js:52-55`): kicker `"Como funciona"`, `<h2>"Uma pergunta,
   várias famílias respondendo"`, sub `"Quem já passou por isso indica. A indicação que funcionou
   fica guardada para quem chegar depois."` e a conversa ilustrativa `landingThread()`
   (`landing.js:20-30`): topo `Casa` · `Manaus · Adrianópolis` + `"Conversa ilustrativa"`, três
   mensagens (Marina A. `"Alguém indica um eletricista de confiança aqui no bairro?"`; Paulo S.
   `"O Sérgio, que refez a fiação aqui de casa. Pontual e cobra o combinado."` com
   `"Marcada como útil"`; Renata T. `"Peça o orçamento por escrito. Comigo foi tranquilo."`) e o
   rodapé `"Resolvida · Marina marcou a indicação que funcionou"`.
5. `#recursos` "O que tem" (`landing.js:57-62`): `<h2>"O que a gente resolve junto, na sua cidade"`,
   sub `"Cada cidade tem a sua comunidade, feita de quem já passou por lá."`, lista de
   `LANDING_FEATURES` (`landing.js:11`) — `Indicações`, `Serviços e negócios`, `Imóveis e desapegos`,
   `Grupos e eventos` — e a figura `landing-app-comunidade` com legenda
   `"Tela da Comunidade no app · dados de exemplo"`.
6. `#mudanca` (`landing.js:64-70`): figura `landing-app-inicio` (`"Plano de chegada no app · dados de
   exemplo"`), kicker `"Mudança de cidade"`, `<h2>"Transferido? Chegue sabendo."`, sub `"Um plano para
   quem vai chegar ou sair, montado com o que a comunidade da cidade já sabe."`, checks de
   `LANDING_CHECKS` (`landing.js:12`) — `Moradia: bairros e imóveis indicados`, `Escola das crianças`,
   `Saúde e plano`, `A mudança, na ordem` — e `"Funciona para onde você mora e para onde vai."`.
7. `#participar` (`landing.js:72-75`): kicker `"Como participar"`, `<h2>"Três passos para entrar"`,
   `<ol>` de `LANDING_STEPS` (`landing.js:13`) — `Crie sua conta` / `Confirme seu vínculo` /
   `Escolha sua cidade`.
8. `#perguntas` (`landing.js:77-80`): kicker `"Perguntas"`, `<h2>"Perguntas frequentes"`, sub com o
   botão inline `"Fale com a gente"` (`support-open`, valor `contato`, `landing.js:78`) e o
   `<details>` de `LANDING_FAQ` (`landing.js:14`) — 6 perguntas; a de índice 3
   (`"Como funciona a confirmação pelo CPF?"`, `LANDING_FAQ_OPEN`, `landing.js:16`) já abre.
9. `#fim` (`landing.js:82-85`): foto `landing-encontro` (`alt=""`), `<h2>"Entre na comunidade da sua
   cidade."`, `"Juntos somos mais fortes."` e o CTA.
10. `<footer class="ld-footer">` (`landing.js:88-92`): `"Bivaque · Comunidade independente da família
    militar"`; nav com `"Entrar"` (`entry-login`), `"Ajuda"` (`support-open`/`ajuda`),
    `"Privacidade"` (`legalLink('privacidade','Privacidade')`) e o Código de conduta
    (`legalLink('conduta')`); `"© 2026 Bivaque"`.
11. `.ld-bar #ld-bar` (`landing.js:93`) e `.ld-sheet #ld-sheet` (`landing.js:94-99`, `role="dialog"
    aria-modal="true" aria-label="Menu"`) — ver "Overlays".

##### Comportamento (JS, não visual)

- Topo: fica transparente sobre a foto e ganha superfície ao passar dela (`.ld-solid`, observador em
  `landing.js:123`); o CTA do topo só aparece quando o CTA do hero sai da área visível
  (`landing.js:126-130`, classe `.ld-show-cta`); no celular o topo se esconde ao rolar para baixo
  (`landing.js:171-178`, `.ld-hide`).
- Barra fixa do celular: aparece quando o hero saiu e o `#fim` ainda não chegou (`landing.js:121`).
- Navegação: pílula deslizante marca a seção em vista via `IntersectionObserver`
  (`rootMargin:'-45% 0px -50% 0px'`, `landing.js:140`); as âncoras rolam dentro de `#main`
  (`landing.js:102-103`, `149-153`).
- Conversa ilustrativa nasce animada ao entrar na tela, e já montada com
  `prefers-reduced-motion` (`landing.js:183-186`).

##### Estados

- Vazio: n/a.
- Carregando / esqueleto: não existe nesta tela.
- Erro / indisponível: não existe nesta tela.
- Visita a outra cidade (`readonly()`, `state.js:58`): não se aplica — a landing só abre para quem
  está fora (`navigation.js:106`). Nenhum `readonlyHtml()` é desenhado aqui.
- Quem está dentro não vê esta tela: `entryGate()` troca a rota por `#inicio` (`navigation.js:106`).
- `entrar/boas-vindas` com `state.signedOut` verdadeiro volta a desenhar a landing
  (`account.js:73`).

##### Diferenças por viewport

- 375: caem as duas media queries — `@media (max-width:480px)` quebra a primeira linha da conversa
  (`styles/landing.css:147`) e o bloco `@media (max-width:860px)` (`styles/landing.css:148-176`)
  esconde nav e CTA do topo, mostra o botão de menu (`:151-152`), empilha hero (`:153`), põe a foto
  em `min(48svh,340px)` (`:154`), CTA do hero em 100% (`:160`), todas as grelhas em 1 coluna
  (`:163`), `#ld-bar` fixa no rodapé (`:173-175`) e o rodapé em duas colunas (`:172`).
- 768: só o bloco de 860 px vale (nav/CTA escondidos, menu visível, hero empilhado, barra fixa);
  o de 480 px não (`styles/landing.css:147`).
- 1440: nenhuma regra específica; a medida é `--ld-wrap:1160px` (`styles/landing.css:6`) e as grelhas
  de duas colunas de `.ld-ex`, `.ld-feat`, `.ld-move`, `.ld-faq` (`:55`, `:78`, `:88`, `:102`).

##### Diálogos, editores, folhas e menus abertos nesta rota

- **Folha do menu** (`#ld-sheet`, `landing.js:94-99`): aberta pelo botão `[data-ld-menu]`
  (`landing.js:157`) e fechada por `[data-ld-close]` (`landing.js:158`), pela âncora ou por Escape
  (`landing.js:163`). Cabeçalho com logo + `aria-label="Fechar menu"`; nav com as quatro seções,
  agora com ícone (`landing.js:96`); ações: `"Criar conta"` (`entry-join`) e
  `"Já tenho conta · Entrar"` (`entry-login`); rodapé legal com Ajuda/Privacidade/conduta
  (`landing.js:98`).
  Comportamento: abre com `inert` no resto da landing (`outside`, `landing.js:119`, `144`), prende o
  foco com Tab/Shift+Tab em ciclo (`landing.js:161-170`), foca o botão de fechar (`landing.js:146`) e
  devolve o foco ao botão do menu (`landing.js:147`); `sync()` mantém a barra inerte enquanto a folha
  está aberta (`landing.js:121`).
- Não há `md-dialog`, editor ou folha de baixo nesta rota.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `entry-join` | `landing.js:18` (CTA reutilizado em `:47`, `:84`, `:93`, `:97`) | — | `navigate('entrar','conta')` | `landing.js:207` |
| `entry-login` | `landing.js:37`, `:90`, `:97` | — | `navigate('entrar','login')` | `landing.js:206` |
| `support-open` | `landing.js:78` (`contato`), `:90`, `:98` (`ajuda`) | `contato` / `ajuda` | abre Fale com a gente / Ajuda | `help.js:146-150` |
| `open-legal` | `legalLink` usado em `landing.js:90`, `:98` | `privacidade` / `conduta` | salva rascunho da entrada e abre a página legal | `pages.js:47-50` |
| `sign-out` (de outra área) | `profile/views.js:6` | — | sai do app e volta à landing | `landing.js:203` |

---

#### 2.9.2 Rota `entrar` — estado `conta` (`renderEntrySignup`)

- De onde se chega: `entry-join` (`landing.js:207`), `entry-go` com `conta` (`login.js:11`, `:132`),
  `entry-cancel` (`account.js:140`), `onboarding` (`arrive.js:79`), `entry-restart`, ou
  `entryNext()` quando não há entrada em andamento (`account.js:17`).
- Desenhada por: `renderEntrySignup` em `account.js:31-39`; helpers `entryTop` (`:27`),
  `entrySteps` (`:28`), `entryPasswordField` (`:29`), `field` (`primitives.js:13`).

##### Conteúdo, de cima para baixo

1. `entryTop('','entrar')`: símbolo + `Bivaque` e o botão de texto `"Entrar"` (`entry-login`) à
   direita (`account.js:27`, `:32`).
2. `entrySteps(1,'Conta')` → `"Passo 1 de 3 · Conta"` + três barras, a primeira acesa (`account.js:28`).
3. `<h1 class="en-h1" tabindex="-1">"Vamos começar."` (`account.js:32`).
4. Botão `"Continuar com Google"` (`entry-google`, valor `conta`, `account.js:33`).
5. Separador `"ou com e-mail"` (`account.js:33`, `.en-or`, `entry.css:49`).
6. Campos:
   - `en-name` — rótulo `"Nome"`, sem `type` (texto), `required minlength="2" maxlength="80"
     autocomplete="name"` (`account.js:34`).
   - `en-email` — rótulo `"E-mail"`, `type="email" required autocomplete="email"
     inputmode="email"` (`account.js:35`).
   - `en-pass` — rótulo `"Senha"`, `type="password" required minlength="8"
     autocomplete="new-password"`, `supporting-text="Ao menos 8 caracteres, com letras e números."`
     (`ENTRY_SENHA_REGRA`, `account.js:10`/`:29`) e botão de olho `entry-pass-toggle` (linha 29).
7. `en-consent` — `md-checkbox` com o texto `"Li e aceito a Política de privacidade e o Código de
   conduta. Pelo Google, o aceite vem no passo seguinte."`; os dois nomes são links
   (`legalConsentText()`, `pages.js:41`; `account.js:37`).
8. `<p class="en-err" id="en-err" role="alert">` — vazio até haver erro (`account.js:37`).
9. `"Criar conta"` (`entry-signup`, `account.js:38`).
10. Rodapé `"Já tem conta? Entrar"` (`account.js:38`).

##### Validações e mensagens (entrySignup, `account.js:89-98`)

| condição | mensagem exata | campo |
|---|---|---|
| `name.trim()` com menos de 2 caracteres | `"Informe seu nome."` | `en-name` |
| e-mail fora de `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `"Confira o e-mail."` | `en-email` |
| senha < 8, sem letra ou sem dígito | `"A senha precisa ter ao menos 8 caracteres, com letras e números."` | `en-pass` |
| aceite desmarcado (`#en-consent`) | `"Para criar a conta, aceite a Política de privacidade e o Código de conduta."` | `en-consent` |
| e-mail igual a `entryKnownEmail()` | `"Este e-mail já tem conta. Use Entrar ou recupere a senha."` | `en-email` |

`entryError` escreve em `#en-err` e, quando o elemento aceita, marca `error=true` e foca
(`account.js:87`). O erro some quando a pessoa digita em qualquer `md-outlined-text-field` do
formulário (`account.js:125`). Enter em campo envia o primeiro `md-filled-button` do formulário
(`account.js:127`).

Ao passar: `state.entry = {account:{name,email,provider:'email'}, consentAt:Date.now(),
eligibility:'none'}` e `navigate('entrar','cpf')` (`account.js:96-97`). A senha não é guardada
(`account.js:8-9`).

---

#### 2.9.3 Rota `entrar` — estado `retomar` (`renderEntryResume`)

- De onde se chega: `renderEntry` desvia para cá quando o id é `conta` ou `convite` e
  `entryInProgress()` é verdadeiro — isto é, há `state.entry.account` sem `state.entry.done`
  (`account.js:13`, `:76`).
- Desenhada por: `renderEntryResume` em `account.js:41-45`.

Conteúdo: `entryTop('','entrar')` (botão `"Entrar"`, sem passo); `<h1>"Você já começou a entrada."`;
`<p class="en-lead">"Conta de {nome} · {e-mail}"`; botão `"Continuar de onde parei"`
(`entry-resume`, `account.js:44`) que faz `navigate('entrar',entryNext())` (`account.js:136`); botão
`"Começar com outra conta"` (`entry-restart`, `:44`) que abre o `confirm('Começar com outra conta?',
'A entrada em andamento é apagada deste dispositivo.', …)` e, confirmado, zera `state.entry` e vai
para `entrar/conta` com `replace` (`account.js:137`); dica
`"Começar de novo apaga esta entrada neste dispositivo."` (`:44`).

Não tem barra de passos, não tem campo, não tem `#en-err`.

---

#### 2.9.4 Rota `entrar` — estado `aceite` (`renderEntryGoogleConsent`)

- De onde se chega: só pelo Google. `entryGoogle` cria
  `state.entry.account = {name:'Conta Google (teste)', email:'conta.google@exemplo.com',
  provider:'google'}` sem `consentAt` (`login.js:56`) e navega para `aceite` (`:57`); `entryNext()`
  devolve `aceite` justamente quando falta `consentAt` (`account.js:17`). É o caminho que no app web
  pulava o aceite (comentário `login.js:18-19`).
- Desenhada por: `renderEntryGoogleConsent` em `login.js:20-25`.

Conteúdo: `entryTop('conta')` — seta `Voltar` (`entry-go`/`conta`) e `"Sair"` (`entry-cancel`);
`entrySteps(1,'Conta')`; `<h1>"Antes de entrar, as regras."`; lead
`"Você entrou com o Google como {e-mail}."`; `en-consent` com `legalConsentText()`
(`"Li e aceito a Política de privacidade e o Código de conduta."`); `#en-err`; botão
`"Concordar e continuar"` (`entry-google-consent`, `login.js:24`).

Erro: aceite desmarcado →
`"Para continuar, aceite a Política de privacidade e o Código de conduta."` (`login.js:63`, campo
`en-consent`). Se `entryNext()` já não for `aceite`, a ação não faz nada (`login.js:63`). Ao passar,
grava `consentAt` e vai para `entrar/cpf` (`:63`).

---

#### 2.9.5 Rota `entrar` — estado `cpf` (`renderEntryCpf`)

- De onde se chega: `entrySignup` (`account.js:97`), `entry-google-consent` (`login.js:63`),
  `entry-retry` (`account.js:135`), `entry-go` com valor vazio (`login.js:132`) ou `entryNext()`.
- Desenhada por: `renderEntryCpf` em `account.js:46-52`.

##### Conteúdo, de cima para baixo

1. `entryTop('')`: símbolo + `Bivaque` e `"Sair"` (`entry-cancel`) — sem seta de voltar
   (`account.js:47`).
2. `entrySteps(2,'Elegibilidade')` → `"Passo 2 de 3 · Elegibilidade"`.
3. `<h1>"Confirme seu vínculo."`.
4. Lead `"Para militares federais ativos, veteranos e pensionistas militares."`.
5. Campo `en-cpf` — rótulo `"CPF"`, sem `type` (texto), `required inputmode="numeric"
   maxlength="14" autocomplete="off" placeholder="000.000.000-00"` (`account.js:48`).
6. `#en-err`.
7. `"Conferir e continuar"` (`entry-cpf`, `:49`).
8. Cartão `.en-why` com `verified_user`: `"Por que o CPF"` / `"Com ele confirmamos o vínculo na fonte
   oficial, sem pedir posto nem organização. O número não fica salvo."` (`:50`).
9. Botão `.en-link` `É cônjuge ou dependente?` + `"Você entra pelo convite de quem é militar, sem
   CPF."` → `entry-invite` (`:51`), que zera `entryInviteCode` e abre `entrar/convite`
   (`landing.js:208`).

##### Validação de CPF (validCpf, `account.js:22-26`)

- Limpa tudo que não é dígito (`replace(/\D/g,'')`); exige exatamente 11 dígitos e recusa sequências
  repetidas (`/^(\d)\1+$/`).
- Confere os dois dígitos verificadores pelo módulo 11 clássico (`dv(n)` acumula
  `d[i] * (n+1-i)`, `r=(s*10)%11`, `r===10 → 0`).
- Mensagem única: `"CPF inválido. Confira os 11 dígitos."` no campo `en-cpf` (`account.js:102`).
- O protótipo **confere o CPF pelo formato/dígitos**, não por um cadastro real: quem decide o
  resultado é o controle de teste (`account.js:103-104`).
- O campo é limpo antes de sair do passo e o CPF não é salvo (`account.js:106-107`).

##### Resultado da elegibilidade (modo teste)

`const outcome = ['verified','notfound','pending','error'].includes(state.test?.portal) ?
state.test.portal : 'verified'` (`account.js:104`). `state.test.portal` vem do diálogo Controles do
protótipo, seletor `prototype-portal` com as opções `Vínculo confirmado` (`verified`),
`Vínculo não localizado` (`notfound`), `Em análise` (`pending`), `Fonte fora do ar` (`error`)
(`settings.js:6`); o seletor é gravado em `apply-prototype` (`handlers.js:75`).

Grava `eligibility: outcome, checkedAt: Date.now()` (`account.js:105`). Se `verified` →
`entryVerified()` → `navigate('entrar','cidade')` (`account.js:108`, `:112`). Senão navega para
`entryNext()` (`:109`).

---

#### 2.9.6 Rota `entrar` — estado `resultado` (`renderEntryResult`)

- De onde se chega: `entryNext()` quando `eligibility` é `notfound` ou `error` (`account.js:18`),
  ou `entry-go`/URL corrigida pelo próprio `renderEntry` (`:80-84`).
- Desenhada por: `renderEntryResult` em `account.js:53-58`. Tem **duas variantes**.

##### Variante "fonte fora do ar" (`eligibility === 'error'`, `account.js:54`)

`entryTop('')`; `entrySteps(2,'Elegibilidade')`; `<h1>"Não conseguimos consultar agora."`; lead
`"A fonte oficial está fora do ar. Tente de novo em alguns minutos."`; botão único
`"Tentar de novo"` (`entry-retry`, `filled`). Sem rodapé de documento, sem `#en-err`.

##### Variante "não localizamos o vínculo" (`account.js:55-57`)

`entryTop('')`; `entrySteps(2,'Elegibilidade')`; `<h1>"Não localizamos o vínculo."`; lead
`"A fonte oficial não confirmou o vínculo deste CPF. Isso acontece com quem passou para a reserva há
pouco ou com pensionistas recentes."`; etiqueta de arquivo `.en-file`:
`"Enviar um documento"` / `"PDF, JPG ou PNG, até 10 MB. A equipe responde em até 2 dias úteis."` com
`<input id="en-doc" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">`
(`account.js:56`); `#en-err`; botão `"Conferir o CPF de novo"` (`entry-retry`, `outlined`).

##### Fluxo do documento (entryDoc, `account.js:113-120`)

- Só age se `entryNext()` for `resultado` ou `analise` (`:114`).
- Tipo permitido por `ENTRY_DOC_TYPES = {'application/pdf':'PDF','image/jpeg':'JPG',
  'image/png':'PNG'}` (`:11`). Em outros: `"Formato inválido: use PDF, JPG ou PNG."`.
- Tamanho: `ENTRY_DOC_MAX = 10*1024*1024`; `!f.size || f.size > max` →
  `"O documento precisa ter até 10 MB."` (`:117`).
- Aprovado: grava `eligibility:'pending', asked:false, doc:{type,size,at}` (`:118`); se já está em
  `analise`, redesenha e foca o título, senão `navigate('entrar','analise')` (`:119`).
- Do documento ficam só tipo, tamanho e data — o nome do arquivo não é guardado porque pode conter o
  CPF (comentário `account.js:8-9`). O rótulo exibido é `PDF · 250 KB` / `PDF · 1,4 MB`
  (`entryDocLabel`, `:30`).

`entry-retry` (`account.js:135`): só age se `entryNext()==='resultado'`; volta `eligibility` para
`'none'` e navega para `entrar/cpf` — é o mesmo botão nas duas variantes.

---

#### 2.9.7 Rota `entrar` — estado `analise` (`renderEntryPending`)

- De onde se chega: `entryDoc` quando o upload sai de `resultado` (`account.js:119`), ou `entryNext()`
  com `eligibility` que não seja `verified`/`notfound`/`error`/`none` — na prática `pending`
  (`account.js:19`).
- Desenhada por: `renderEntryPending` em `account.js:59-68`.

##### Conteúdo, de cima para baixo

1. `entryTop('')` (`account.js:63`) — **sem barra de passos**.
2. `<h1>` variável (`account.js:62`):
   - com documento: `"Recebemos seu documento."`
   - sem documento e com `asked`: `"A equipe pediu outro documento."`
   - caso contrário: `"Sua elegibilidade está em análise."`
3. Lead `"Enquanto a equipe confere, o conteúdo do Bivaque fica fechado."`; se não há documento,
   acrescenta `" Para adiantar, envie um documento que mostre o vínculo, como o contracheque ou a
   identidade militar."` (`account.js:63`).
4. Linha do tempo `<ol class="en-time">` com quatro itens (`account.js:61`):
   - `Conta criada` — `<e-mail da conta>` (estado `done`);
   - `Documento enviado` + `<rótulo do documento> · <dd/mm hh:mm>` quando há documento, senão
     `Consulta feita` com `"A equipe pediu outro documento"` (`asked`) ou
     `"A fonte oficial pediu uma conferência"` (estado `done`/`now`);
   - `Análise da equipe` / `"Até 2 dias úteis · normalmente no mesmo dia"`;
   - `Escolher sua cidade` / `"Assim que liberar"` (sem círculo pintado).
5. Etiqueta de arquivo: `"Enviar outro documento"` (com documento) ou `"Enviar um documento"`
   (sem), com `"PDF, JPG ou PNG, até 10 MB."` e o mesmo `<input id="en-doc">` (`account.js:65`).
6. `#en-err`.
7. Se `state.entry.notify` for verdadeiro: `<p class="en-ok" role="status">` com
   `notifications_active` + `"Vamos avisar por e-mail e no celular quando liberar."`; senão o botão
   `"Avise-me quando liberar"` (`entry-notify`, `filled`, ícone `notifications`) (`account.js:66`).
8. Rodapé `"Você pode sair e voltar: o status fica aqui."` e, no bloco `.en-test`
   (`account.js:67`): `pill('Modo teste')` + `"A análise da equipe é simulada neste protótipo."` +
   botão de texto `"Simular aprovação"` (`entry-approve`).

##### Como a análise entra na fila do Painel do dono

- `ownerEntryVerification()` (`arrive.js:66-70`) monta o item da fila **só** quando existe
  `state.entry.account`, `!state.entry.done`, `eligibility === 'pending'` e não está no estado
  "pedimos outro documento e ainda não voltou" (`e.asked && !e.doc`). Quando "Pedir outro documento"
  é aplicado, o item sai da fila até o novo envio (comentário `arrive.js:65`).
- O item tem `id: 'verify:entry-' + (doc.at || checkedAt)`, `kind:'verify'`, `entry:true`,
  `city:''`, `due: at + OWNER_SLA` (`OWNER_SLA = OWNER_DAY`, `owner/console.js:6`),
  `icon:'verified_user'`, `tone:'blue'`, título `"{nome} pediu verificação"` e subtítulo
  `"Documento enviado · {rótulo}"` ou `"A fonte oficial pediu conferência"` (`arrive.js:69`).
  Conferências do item: `[['Documento enviado', !!doc], ['Nome confere com o documento', false]]`
  (`arrive.js:69`).
- `ownerQueue()` (`owner/console.js:60-64`) insere esse item entre as denúncias e as verificações de
  demonstração, e a página Filas mostra o prazo de 24 h (`owner/queues.js:21`), com "Assumir" e
  "Revisar" (`owner/queues.js:8`).
- O corpo da revisão é `ownerEntryReviewBody` (`arrive.js:71-74`):
  `"Criou a conta neste dispositivo. A fonte oficial não confirmou o vínculo pelo CPF e a pessoa
  enviou um documento. O CPF não fica guardado."`, seções `Documento`, `Conferir` e `Histórico`
  (`"Primeiro pedido. A cidade é escolhida depois da aprovação."`).
- Como um item `entry` é diferente, as ações são só `"Pedir outro documento"` (`more`, texto) e
  `"Aprovar"` (`approve`, `filled`) — sem "Recusar" (`owner/review.js:32`, contra `:33`).
- Efeito da decisão (`owner/review.js:73`): `approve` → `{eligibility:'verified', asked:false,
  doc: …}`, `more` → `{eligibility:'pending', asked:true, doc:null}`; o Desfazer só vale se a entrada
  ainda estiver como a decisão deixou e for da mesma conta (`owner/queues.js:35`).

##### Modo teste dentro de `analise`

`entry-approve` (`account.js:142`): exige `eligibility === 'pending'` **e** entrada em andamento;
grava `eligibility:'verified', asked:false`, fecha diálogo se houver, avisa
`"Análise aprovada (modo teste)."` com ícone `verified_user` e, se a rota atual é `entrar/analise`,
chama `entryVerified()` (vai para `cidade`). O mesmo atalho existe no diálogo Controles do protótipo
como `"Aprovar a análise pendente"` (`settings.js:6`).

`entry-notify` (`account.js:138`): grava `entry.notify = true` com redraw e avisa
`"Vamos avisar quando liberar."` (ícone `notifications_active`), refocando o título.

---

#### 2.9.8 Rota `entrar` — estado `cidade` (`renderEntryCity`, passo 3)

- De onde se chega: `entryVerified()` (`account.js:112`), chamado após CPF verificado, aceite de
  convite (`login.js:73`) ou aprovação de análise (`account.js:142`); ou `entryNext()` com
  `eligibility === 'verified'` (`account.js:18`).
- Desenhada por: `renderEntryCity` em `arrive.js:16-24`; rascunho em `entryCityData`
  (`:5-8`) e troca de campos em `entryMomentHtml` (`:11-15`); comportamento em `bindEntryCity`
  (`:25-36`) e envio em `entryFinish` (`:37-56`).

##### Conteúdo, de cima para baixo

1. `entryTop('')` — símbolo, `Bivaque`, `"Sair"` (`arrive.js:18`).
2. `entrySteps(3,'Cidade')` → `"Passo 3 de 3 · Cidade"`.
3. `<h1>"Onde e em que momento?"` — note que **não** tem `tabindex="-1"` (só na maquete v2,
   comentário `arrive.js:1`).
4. `selectField('en-city','Cidade', CITY_NAMES, d.city)` (`arrive.js:19`). `CITY_NAMES` é
   `Object.keys(SOURCE.cities)` (`data/demo/model.js:2`), e os valores são **`Manaus`, `Brasília`,
   `Rio de Janeiro`, `Natal`** (`data/demo/source.js:1`). Abaixo: `"Isso não publica seu endereço."`
   (`.en-sub`).
5. `"Seu momento"` (`arrive.js:20`) e um grupo de rádio (`role="radiogroup"`,
   `aria-labelledby="en-mode-l"`) com `Chegando` / `Moro aqui` / `Saindo`
   (valores `chegando`, `moro`, `saindo`; `arrive.js:20`). O rascunho começa em `mode:'chegando'`
   (`arrive.js:6`).
6. `"Muda o que aparece primeiro: plano de chegada, turma ou anúncios de quem sai."`
   (`arrive.js:21`), seguido de `#en-moment` com os campos do momento (`entryMomentHtml`,
   `arrive.js:11-15`):
   - `moro` → nenhum campo (retorna string vazia);
   - `chegando` → `en-date` rótulo `"Data de chegada"`, `<input type="date" min="{hoje}">`
     (`dateISO()`, `format.js:8`);
   - `saindo` → `en-date` rótulo `"Data da saída"` e, também,
     `selectField('en-dest','Destino da transferência', CITY_NAMES, d.dest)`.
   Chegada e saída guardam datas separadas no rascunho (`arrival`/`leave`, comentário
   `arrive.js:10`; atribuição em `:31`).
7. `field('en-name','Como você quer ser chamado', d.name, 'required minlength="2" maxlength="80"
   autocomplete="name"')` — pré-preenchido com o nome da conta (`arrive.js:6`, `:22`).
8. `#en-err`.
9. `"Concluir minha entrada"` (`entry-finish`, `:23`).

##### Validações e mensagens (entryFinish, `arrive.js:37-56`)

| condição | mensagem exata | campo |
|---|---|---|
| `!CITY_NAMES.includes(city)` | `"Escolha sua cidade."` | `en-city` |
| `mode !== 'moro'` e sem data | `"Informe a data da saída."` / `"Informe a data de chegada."` | `en-date` |
| `mode === 'saindo'` e destino inválido ou igual à cidade | `"Escolha um destino diferente da sua cidade atual."` | `en-dest` |
| nome com menos de 2 caracteres | `"Informe como você quer ser chamado."` | `en-name` |

Não há validação de data no passado além do `min` do próprio `<input type="date">`.

##### O que o "Concluir" grava (`arrive.js:45-55`)

Perfil **novo do zero** (comentário `:46-47`): `state.profile = {name, email: account.email,
verified:true, role: account.family ? 'familia' : '', force:'', interests:[]}`. Vínculo e Força não
são perguntados aqui. Se veio de convite, o convite é **consumido só agora**
(`state.invites.find(code).used = true`, `:49`). Depois: `state.city = state.homeCity = city`;
`state.mode = d.mode`; em `chegando`, `state.arrival = date`; em `saindo`,
`state.leaveDate = date` e `state.dest = dest`; `state.leftAuto = []`; `state.signedOut = false`;
`delete state.accountDeletedAt`; `state.entry.done = Date.now()`. O rascunho é zerado e navega para
`entrar/boas-vindas` com `replace` (`:55`).

Diferenças por viewport: os campos são todos de largura total dentro de `.en-form` (máx. 480 px,
`entry.css:18`) e o grupo de rádio é segmentado em `.en-seg` (`entry.css:60-66`); o CSS não muda
nada por breakpoint aqui.

---

#### 2.9.9 Rota `entrar` — estado `boas-vindas` (`renderEntryWelcome`)

- De onde se chega: `entryFinish` (`arrive.js:55`).
- Desenhada por: `renderEntryWelcome` em `arrive.js:57-63`.
- É o **único** estado de `entrar` que `entryGate` deixa passar para quem está dentro
  (`navigation.js:106`: `welcome = !out && route.name==='entrar' && route.id==='boas-vindas'`).

Conteúdo:

1. `en-top` sem botão: símbolo + `Bivaque` (`arrive.js:61`).
2. Selo `.en-badge` com `check` (64 px, `entry.css:69`).
3. `<h1>"Você chegou ao Bivaque."` e o lead por `state.mode` (`arrive.js:59`):
   `chegando` → `"Seu plano de chegada a {homeCity} já está pronto."`;
   `saindo` → `"Seu plano de saída para {state.dest} já está pronto."`;
   `moro` → `"O que a comunidade de {homeCity} indica já está à sua espera."`.
4. Até três atalhos `.en-tile` (`entry-home`, `arrive.js:60-62`):
   - `moro` → `"Conhecer {homeCity}"` / `"O que a comunidade indica, por assunto."` → `guia`;
   - `chegando`/`saindo` → `"Ver o plano de chegada"` / `"Ver o plano de saída"` /
     `"Moradia, escola, saúde e mudança, na ordem."` → `inicio`;
   - se existe turma automática (`state.groups.find(g => g.auto && g.on && g.city === alvo)`,
     `arrive.js:58`) → `"Conhecer quem chega com você"` / `"Conhecer quem vai com você"` com o texto
     da turma → `grupo/{id}`.
5. Botão `"Entrar na comunidade"` (`entry-home`, valor `comunidade`, `:62`).

`entry-home` (`arrive.js:77`) quebra o valor em `nome/id` e navega com `replace`.

Estados: sem turma → só o atalho do plano; se `state.signedOut` for verdadeiro, `renderEntry` desenha
a landing em vez disso (`account.js:73`).

---

#### 2.9.10 Rota `entrar` — estado `login` (`renderEntryLogin`)

- De onde se chega: `entry-login` (`landing.js:206`), `entry-go` com `login` (`login.js:16`/`:132`),
  rodapé `"Já tem conta? Entrar"` (`account.js:38`).
- Desenhada por: `renderEntryLogin` em `login.js:7-13`.
- Comentário do módulo: entrar "só compara", a regra de senha vale para criar a conta
  (`login.js:42-43`).

Conteúdo: `entryTop('')`; `<h1>"Que bom ter você de volta."`; `"Continuar com Google"`
(`entry-google`, valor `login`, `:9`); separador `"ou com e-mail"`; `en-email`
(`type="email" required autocomplete="email" inputmode="email"`) e `en-pass-login`
(`entryPasswordField('en-pass-login','Senha')` → `type="password" required minlength="8"
autocomplete="current-password"`, com botão `entry-pass-toggle` de valor `en-pass-login`); `#en-err`;
`"Entrar"` (`entry-login-submit`); rodapé com `"Esqueci minha senha"` (`entry-go`/`senha`) e
`"Criar conta"` (`entry-go`/`conta`); dica final (`:12`):
`"Modo teste: use {entryKnownEmail()} e qualquer senha."` quando há conta conhecida, senão
`"A conta anterior foi apagada neste aparelho. Crie uma nova."`.

Validações (`entryLoginSubmit`, `login.js:44-51`): e-mail fora do formato **ou** senha vazia →
`"E-mail ou senha incorretos."` no campo `en-email`, e a senha digitada é apagada (`:46`). Com
sucesso: e-mail igual a `entryKnownEmail()` → `entrySignInBack()`; se há entrada em andamento com o
mesmo e-mail → `navigate('entrar', entryNext())` (retoma de onde parou); caso contrário, o mesmo erro
(`:48-50`).

`entrySignInBack` (`landing.js:199`): se `state.accountDeletedAt`, mostra
`"Esta conta foi apagada. Crie uma nova."`; senão `signedOut=false`, vai para `inicio` e avisa
`"Você entrou como {state.profile.name} (modo teste)."` (ícone `check_circle`).

`entryKnownEmail()` (`help.js:41`) é `state.accountDeletedAt ? '' : supportEmail()`, e
`supportEmail()` (`help.js:39`) é `state.profile.email || 'rafael@exemplo.com'` (`ENTRY_DEMO_EMAIL`,
`login.js:6`).

---

#### 2.9.11 Rota `entrar` — estado `senha` (`renderEntryForgot`, recuperar a senha)

- De onde se chega: `entry-go` com `senha` (`login.js:11`, `:16`, `:132`).
- Desenhada por: `renderEntryForgot` em `login.js:14-17`. Tem **dois estados**, ligados à variável
  de módulo `entryForgotSent` (`login.js:39`; zerada ao entrar em `senha`, `account.js:132`).

Estado do formulário (`!sent`): `entryTop('login')` (seta `Voltar` → `entry-go`/`login` + `"Sair"`);
`<h1>"Recuperar a senha."`; lead `"Mandamos um link para criar uma senha nova."`; `en-email`
(`type="email" required autocomplete="email" inputmode="email"`); `#en-err`; `"Enviar link"`
(`entry-forgot-submit`).

Estado enviado: `<p class="en-ok" role="status">` com `check_circle` e
`"Se {e-mail} puder entrar no Bivaque, o link para criar uma nova senha já está a caminho. Confira
também o spam."`; botões `"Voltar para entrar"` (`entry-go`/`login`, `filled`) e
`"Usar outro e-mail"` (`entry-go`/`senha`, `text`).

Sempre: dica `"Modo teste: nenhum e-mail é enviado."` (`login.js:16`).

Erro (`login.js:61`): e-mail fora do formato → `"Confira o e-mail."` no campo `en-email`. Sucesso:
grava `entryForgotSent = email`, redesenha e foca o título (`render()` + `entryFocusTitle()`).

---

#### 2.9.12 Rota `entrar` — estado `convite` (`renderEntryInvite`, convite familiar)

- De onde se chega: `entry-invite` (`landing.js:208`, na tela do CPF em `account.js:51`).
- Desenhada por: `renderEntryInvite` em `login.js:28-38`, com dois estados: pedido do código e
  confirmação. Regra do módulo (`login.js:4-5`): "o convite vale para o e-mail de quem foi
  convidado, vence em 7 dias e só é consumido quando a pessoa conclui a entrada".

##### Estado 1 — pedir o código (`!inv`, `login.js:30-32`)

`entryTop('')` (sem voltar); `<h1>"Entre pelo convite."`; lead `"Cônjuges e dependentes entram pelo
convite de quem é militar, sem CPF."`; campo `en-code` rótulo `"Código do convite"`,
`required autocomplete="off" maxlength="20"`; `#en-err`; `"Continuar"` (`entry-invite-code`);
dica `"Quem é militar cria o código em Você → Família convidada. O convite vale por 7 dias."`
(`ENTRY_INVITE_DAYS = 7`, `login.js:6`).

`entry-invite-code` (`login.js:64`): normaliza (`trim().toUpperCase()`) e procura em
`state.invites` por `entryInviteFound()` (`:27`), que exige `entryInviteValid`
(`:26`): `!used && !!email && !!at && Date.now()-at < 7 dias`. Falha →
`"Este convite não existe, venceu ou já foi usado. Peça um novo a quem convidou."` no campo
`en-code`. Sucesso → redesenha (estado 2) e foca o título.

##### Estado 2 — criar a conta do convite (`login.js:33-37`)

1. Cartão `.en-inv` com as iniciais (`initals`, `format.js:11`) e
   `"{from} convidou você"` + `"para a família no Bivaque, em {state.homeCity}."` — `from` é
   `inv.from || state.profile.name` (`:33`).
2. `<h1>"Crie sua conta."`.
3. Lead `"Quem convidou já foi verificado. Você não precisa de CPF."`.
4. `en-name` (rótulo `"Nome"`, `required minlength="2" maxlength="80" autocomplete="name"`), já
   preenchido com `inv.name || ''`.
5. `en-email` — rótulo `"E-mail do convite"`, **`readonly`**, valor `inv.email`,
   `supporting-text="O convite vale só para este e-mail."` (`:35`).
6. `en-pass` (`entryPasswordField`, com a regra de senha no `supporting-text`).
7. `en-consent` com `legalConsentText()`.
8. `#en-err`.
9. `"Aceitar convite"` (`entry-invite-accept`).

Validações (`login.js:65-73`): convite inexistente ou entrada já em andamento → não faz nada;
nome curto → `"Informe seu nome."`; senha inválida →
`"A senha precisa ter ao menos 8 caracteres, com letras e números."`; aceite desmarcado →
`"Para aceitar o convite, aceite a Política de privacidade e o Código de conduta."`.

Ao aceitar, grava `state.entry = {account:{name, email: inv.email, provider:'email', family:true,
invite: inv.code, invitedBy: inv.from || state.profile.name}, consentAt:Date.now(),
eligibility:'verified'}` (`login.js:72`) e vai direto para `entryVerified()` → `entrar/cidade`
(`:73`). O convite **não** é marcado como usado aqui — só em `entryFinish` (`arrive.js:49`), então
sair no meio não queima o convite.

Onde os códigos nascem (fora desta área, mas é a origem dos dados): Você → Configurações →
Controles do protótipo → `"Família convidada"`, diálogo `openFamily` em
`profile/demo-actions.js:4`, com `new-invite` criando `{name,email,code,used:false,at}` e código
`'DEMO-' + 8 hex em maiúsculas` (`demo-actions.js:58`). A cópia/revogação são `copy-invite` e
`remove-invite` (`demo-actions.js:63`, `:69`).

---

#### 2.9.13 Rota `entrar` — estado `apagada` (`renderAccountDeleted`)

- De onde se chega: `accountDelete()` depois de digitar `APAGAR` em Você → Configurações → Apagar a
  conta: zera dados, `state.signedOut=true`, `state.accountDeletedAt=Date.now()` e navega para
  `entrar/apagada` com `replace` (`help.js:130-137`).
- Desenhada por: `renderEntry` só quando `id==='apagada' && state.accountDeletedAt`
  (`account.js:72`), delegando para `renderAccountDeleted` em `help.js:139-141`.

Conteúdo: `en-top` só com símbolo + `Bivaque`; bloco centralizado `.en-gone-in` com
`check_circle`; `<h1>"Sua conta foi apagada."`; lead `"Obrigado por ter feito parte. Você pode voltar
quando quiser."`; botão `"Voltar ao início"` (`account-deleted-home`, `outlined`) que navega para
`entrar` sem id (`help.js:159`).

Efeito colateral em toda a entrada: com `accountDeletedAt`, `entryKnownEmail()` fica vazio
(`help.js:41`) e `entrySignInBack` recusa com `"Esta conta foi apagada. Crie uma nova."`
(`landing.js:199`).

---

### 2.10 Painel do Bivaque (dono), políticas legais e suporte

#### 2.10.1 Rota `dono` — [sem parâmetro]

- Título na barra (`titleForRoute`, `shell/navigation.js:53`): "Painel do Bivaque"
- Aba ativa (`activeTab`, `shell/navigation.js:54`): `dono` não está em nenhuma lista → devolve `origin`; na prática a barra do app está escondida (`owner.css:6`).
- De onde se chega:
  - "Ver como dono do Bivaque" — `btn('Ver como dono do Bivaque','owner-open','','filled','shield_person')` em `features/profile/settings.js:6` (diálogo "Controles do protótipo"); tratado em `features/owner/review.js:86`.
  - Internamente por `owner-go` (abas, chips, "Abrir filas", "Ver cidades") e `owner-city-stale` (`review.js:92,102`).
- Desenhada por: `renderOwner` em `features/owner/console.js:93`; sub-views `renderOwnerOverview` (`console.js:101`), `renderOwnerQueues` (`owner/queues.js:15`), `renderOwnerCities` (`owner/cities.js:9`), `renderOwnerBusiness` (`owner/business-team.js:16`), `renderOwnerTeam` (`business-team.js:40`).
- Parâmetro: `route.id` é a **aba** (`''`/`filas`/`cidades`/`negocios`/`equipe`), não id de entidade (`console.js:94`).
- Estado de módulo: `ownerCity='Todas'`, `ownerTab='all'` (`console.js:5`), `ownerStatus='open'`, `ownerSort='due'` (`queues.js:3`).

##### Conteúdo, de cima para baixo

1. **Barra lateral** (`.ow-nav`, `aria-label="Painel do Bivaque"`, `console.js:97`): marca `B` + "Painel do Bivaque" / pequeno `Dono · {state.profile.name}` (`console.js:97`); botões de aba a partir de `OWNER_PAGES` (`console.js:92`):
   - `''` · **Visão geral** · ícone `home`
   - `filas` · **Filas** · `inbox` — ganha selo `<b class="ow-badge" aria-label="{open} abertos">{open}</b>` (`console.js:95`)
   - `cidades` · **Cidades** · `apartment`
   - `negocios` · **Negócios e planos** quando `paidPlans()` é verdadeiro, senão **Negócios** · `storefront` (`console.js:92`)
   - `equipe` · **Pessoas e equipe** · `group`
   - Por último, "Voltar ao app" (`owner-exit`, ícone `arrow_back`, `console.js:97`).
   Aba atual: `.ow-nav-item.on` com `aria-current="page"` (`console.js:95`).
2. **Topo** (`.ow-top`, `console.js:98`): botão sair (`.ow-exit`) com `aria-label="Voltar ao app"` (`owner-exit`), texto "Painel do Bivaque" e pílula **"Dados de exemplo"**. `.ow-exit`/`.ow-top-t` só aparecem sob 1024 px (`owner.css:19,75`).
3. **Sub-nav** (`.ow-subnav`, `console.js:99`): chips com as mesmas abas, "Filas" com ` · {open}`; visível só até 1023 px (`owner.css:87,97`).
4. **Corpo** = uma das 5 sub-views (ver abaixo).

###### Aba Visão geral — `renderOwnerOverview` (`console.js:101-102`)

- `<h1 class="ow-h1">Bom dia, {primeiro nome}</h1>` (`state.profile.name.split(' ')[0]`, `console.js:94,101`).
- Filtro de cidade (`owner-city`): chip "Todas as cidades" + uma por cidade de `OWNER_DEMO.cities` — "Rio de Janeiro", "Brasília", "Manaus", "Natal" (`data/demo/owner.js:4-9`; `ownerCities()` em `console.js:66`). Ao lado, `.ow-period` = "Últimos 30 dias".
- **`ownerHero()`** (`console.js:69-73`): card `.ow-card.ow-hero`, título **"Chegadas atendidas"**; número grande = % ponderado de `arrived30*served`; selo "▲ 6 pts"; parágrafo `das {arr} famílias que chegaram nos últimos 30 dias[ a {cidade}] tiveram resposta ou contato na primeira semana. Meta: 80%.`; barra `.ow-goal` com `role="img" aria-label="{pct}% de 80% da meta"` e marca da meta em 80%; uma linha por cidade `{nome} — {barra} — {pct}%` (`.low` quando `served<.5`, `.dim` quando há cidade filtrada e não é ela).
  Números de exemplo: famílias/chegadas/servido = RJ 630/88/84%, BSB 410/74/78%, MAO 140/38/66%, Natal 9/12/25% (`owner.js:5-8`). Sem filtro: `arr=164`, `pct=77%`.
- **`ownerKpis()`** (`console.js:74-77`): um card por KPI de `OWNER_DEMO.kpis` (`owner.js:10-14`), ocultando `revenue` quando `paidPlans()` é falso:
  - "Famílias ativas na semana" — `1.010` (`scale:true`; com cidade, `round(1010*fam/1189)`), delta "▲ 8%".
  - "Perguntas resolvidas em 24 h" — `82%`, delta "▲ 5 pts".
  - "Receita dos planos (mês)" — `R$ 2.809` (soma de `ownerPlansTotal()`, `business-team.js:9`), delta "▼ 2%".
  Cada card traz o sparkline `ownerSpark` (`console.js:67`).
- **`ownerQueueHtml()`** (`console.js:87-91`): card **"Precisa de você"** + botão "Abrir filas" (`owner-go` `filas`); chips `OWNER_KINDS` (`console.js:8`) filtrados por contagem — rótulos "Tudo", "Denúncias", "Verificações", "Negócios", "Perguntas", no formato `{rótulo} · {n}`; lista `ownerRow` ou vazio.
- **`ownerChanges()`** (`console.js:78-81`): card **"O que mudou"** a partir de `OWNER_DEMO.changes` (`owner.js:16-21`), filtrado por `ownerCity`:
  1. `trending_up` vermelho, Manaus — **"Denúncias de golpe em Manaus"** / *"Subiram de 1 para 3 esta semana; todas citam Pix antecipado."* → botão "Ver" (`owner-tab` `report`).
  2. `group` âmbar, Natal — **"Natal sem embaixador"** / *"12 famílias chegam em 60 dias; 4 perguntas paradas."* → botão "Ver perguntas" (`owner-tab` `stale`).
  3. `event_busy` âmbar, Manaus — **"2 planos vencem sem renovação"** / *"Mudanças Rio Negro e Sorriso Kids, na quinta."* → botão "Ver" (`owner-go` `negocios`).
  4. `trending_up` verde, Brasília — **"Brasília passou de 400 famílias"** / *"Grupo “Chegadas de dezembro” com 74 membros."* → botão "Ver" (`owner-go` `cidades`).
  Vazio: "Nada fora do normal em {cidade}." (`console.js:80`).

###### Aba Filas — `renderOwnerQueues` (`queues.js:15-25`)

- `<h1 class="ow-h1">Filas</h1>` + lead **"Tudo o que precisa de decisão, com prazo de 24 h para denúncias e verificações."**
- Filtro de cidade (`owner-city`). Ferramentas (`owner-status`): **"Abertas · {all.length}"** e **"Decididas · {n}"** (`Object.values(ownerData().decisions).filter(d=>!d.part).length`); quando `open`, também `owner-sort`: **"Prazo"** / **"Mais recentes"**.
- Chips de tipo (`owner-tab`): em "Abertas" com contagem; em "Decididas" sem contagem (`queues.js:24`).
- Lista aberta: `pagedHtml('owner-queue', '{ownerCity}|{ownerTab}|{ownerSort}', …)`, com paginação, `wrap:'ow-list'`, `role:'list'`, `noun:'itens'` (`paged-list.js:7`).
- Linha (`ownerRowFull`, `queues.js:6-9`): ícone do tipo, `<b>{título}</b>`, `<small>{sub}</small>`, prazo (`ownerDue`, `console.js:12`: "atrasada" em vermelho ou "vence em {h} h"/"vence em {n} dias"), responsável (`.ow-who`, "Sem responsável" ou iniciais+nome), e ações:
  - **"Assumir"** (`owner-assign`, text) — só quando o responsável não é você.
  - **"Revisar"** (`owner-review`, outlined).
- Linha decidida (`ownerDecidedRow`, `queues.js:10-13`): ícone `check`, título, `<small>{rótulo da decisão}[ · {motivo}]</small>` (`OWNER_DECISION_LABEL`, `queues.js:4`: "Removido", "Página suspensa", "Advertência registrada", "Dispensado", "Aprovado", "Recusado", "Novo documento pedido", "Embaixadores chamados"), tempo relativo (`ownerAgo`, `console.js:11`: "agora"/"há {h} h"/"ontem"/"há {n} dias"), cidade e botão **"Desfazer"** (`owner-undo`).

###### Aba Cidades — `renderOwnerCities` (`cities.js:9-14`)

- `<h1 class="ow-h1">Cidades</h1>` + lead **"Como cada cidade está atendendo quem chega. A que mais precisa de ajuda vem primeiro."**
- Tabela `.ow-table`, `<caption class="ow-sr">Saúde das cidades</caption>`, colunas: **Cidade**, **Famílias**, **Chegam em 60 dias**, **Chegadas atendidas**, **Sem resposta**, **Embaixadores**. Ordenação: saúde (`bad`→`warn`→`ok`) e depois `served` crescente (`cities.js:10`).
- Saúde (`OWNER_HEALTH`, `cities.js:3`): `served<.5` ou sem embaixador → "Precisa de ajuda"; `served<.75` ou `unanswered>1` → "Atenção"; senão "Saudável" (`OWNER_HEALTH_LABEL`, `cities.js:4`). Ponto colorido `.ow-dot-{health}`.
- `unanswered` = `ownerStaleBy().by[cidade]` = perguntas do protótipo sem resposta há mais de 48 h **somadas** a `OWNER_DEMO.staleExtra` (`console.js:44-48`; `owner.js:33` = Natal 4, Brasília 2, Rio 1).
- Coluna Embaixadores: `{ambassadors}` + ` <small>+{n} convite(s)</small>` quando há convites deste dispositivo (`cities.js:11`).
- Com os dados de exemplo: RJ 630/88/84%/1/6 → Saudável; BSB 410/74/78%/2/4 → Atenção; MAO 140/38/66%/0/3 → Atenção; Natal 9/12/25%/4/0 → Precisa de ajuda (`owner.js:5-8,33`).
- O nome da cidade é um botão `.ow-link` (`owner-city-open`) que abre o painel lateral; o rótulo de saúde vai como `<small>` sob o nome.

###### Aba Negócios (ou Negócios e planos) — `renderOwnerBusiness` (`business-team.js:16-26`)

- Sem cobrança (`paidPlans()` falso, `features/businesses/plans.js:11`): `ownerBusinessFree` (`business-team.js:28-34`):
  - `<h1 class="ow-h1">Negócios</h1>` + lead **"Lançamento sem cobrança: toda página de negócio é gratuita e ninguém aparece como Patrocinado."**
  - Mini-indicadores: **"Negócios"** `{all}`, **"Com responsável"** `{claimed}`, **"Aguardando responsável"** `{all-claimed}`, **"Pedidos de orçamento (30 dias)"** `{quotes}` (`OWNER_DEMO.quotesByCity`, `owner.js:40`).
  - Tabela `<caption class="ow-sr">Negócios</caption>`: **Negócio** (nome + categoria, link `open-biz`), **Cidade**, **Indicações**, **Situação** = "Reivindicação em análise" (`ownerClaimPending`, `business-team.js:11`) / "Com responsável" / "Aguardando responsável".
  - Vazio: "Nenhum negócio nesta cidade."
- Com planos (`paidPlans()` verdadeiro):
  - `<h1 class="ow-h1">Negócios e planos</h1>` + lead **"Planos pagos, patrocínios e o que vence nos próximos dias."**
  - Mini: **"Planos pagos"** `{tot.count}`, **"Receita do mês"** `R$ {tot.revenue}`, **"Patrocinados"** `{isSpon}`, **"Pedidos de orçamento (30 dias)"** `{quotes}`.
  - Card **"Vencem em 7 dias"**: linhas de planos com `renewDays<=7` (`b2` e `b9`, `owner.js:39`), ícone `event_busy`, texto `{rótulo do plano} · {preço} · vence em {n} dias` e botão **"Lembrar"** (`owner-remind`) ou a pílula "Lembrete registrado". Vazio: "Nenhum plano vence esta semana."
  - Card **"Todos os negócios"**, `<caption class="ow-sr">Negócios e planos</caption>`, colunas **Negócio**, **Cidade**, **Plano**, **Indicações**, **Situação**.
  - Rótulos de plano (`OWNER_PLAN_LABEL`, `business-team.js:4`): "Grátis", "Destaque de momento", "Plano do negócio"; preços (`OWNER_PLAN_PRICE`, `business-team.js:5`): "R$ 9,90/semana", "R$ 39/mês".

###### Aba Pessoas e equipe — `renderOwnerTeam` (`business-team.js:40-47`)

- `<h1 class="ow-h1">Pessoas e equipe</h1>` + lead **"Quem cuida das filas e quem responde rápido em cada cidade."**
- Card **"Moderação"** + botão **"Convidar moderador"** (`owner-mod-invite`, outlined, ícone `person_add`). Linha do próprio dono (`state.profile.name`, papel "Dono", `{assigned} itens na fila`), depois `OWNER_DEMO.moderators` (`owner.js:43`: Ana P., "Moderação", Manaus) e os convites deste dispositivo com papel "Moderação · convite enviado" (`business-team.js:41-42`).
- Card **"Embaixadores por cidade"** + botão **"Ver cidades"** (`owner-go` `cidades`). Uma linha por cidade: nome e lista de embaixadores (`OWNER_DEMO.ambassadors`, `owner.js:36`) ou "Ninguém ainda", com `· {n} convite(s)` quando houver (`business-team.js:43`).

##### Estados

- **Fila vazia** ("Precisa de você"): `<p class="ow-done">{ícone check}Nada esperando por você[ em {cidade}].</p>` (`console.js:90`).
- **Filas / Abertas vazia**: "Nada esperando por você[ neste tipo]." (`queues.js:19`); **Decididas vazia**: "Nenhuma decisão ainda[ neste tipo]." com ícone `schedule` (`queues.js:20`).
- **"O que mudou" vazio**: "Nada fora do normal em {cidade}." (`console.js:80`).
- **Cidades — embaixadores vazio** (no painel lateral): "Ninguém ainda. Quem chega a {cidade} fica sem quem responda rápido." (`cities.js:21`).
- **Negócios vazio**: "Nenhum negócio nesta cidade." (`business-team.js:25,33`).
- **Item já decidido**: ao clicar em Revisar de item já fechado, `notify('Este item já foi decidido.','info')` (`review.js:39`).
- **Item que sai da fila**: `console.js:41` remove da fila o que a moderação já tirou do ar (`reportGone`, `console.js:27`) — anúncio/pedido/proposta com `status==='removed'`, negócio `suspended`, conteúdo com `hidden`.
- **Carregando / esqueleto**: não existe; o Painel desenha tudo de uma vez (não verificado em nenhum arquivo da área).
- **Visita a outra cidade (`readonly()`)**: o Painel não usa `readonly()` nem `readonlyHtml()`; as cidades do Painel são números de exemplo, independentes de `state.city`. Não há faixa de aviso.
- **Sem acesso**: não há portão de entrada no `dono` — `entryGate` só trata `chamados` e `entrar` (`navigation.js:106`); chegar a `dono` sem conta é possível pelo caminho do protótipo (`settings.js:6`).

##### Diferenças por viewport

`styles/owner.css` (referências `arquivo.css:linha`):

- **>1180 px**: grade `hero | k1 k2 k3 / hero q q q / chg q q q` (`owner.css:26-27`); barra lateral fixa de 232 px (`owner.css:9-10`).
- **≤1180 px** (`owner.css:74`): hero ocupa a linha inteira, KPIs em 3 colunas, fila e mudanças em linha cheia.
- **≤1023 px** (`owner.css:75`): `.ow{grid-template-columns:1fr}`, **barra lateral some** (`.ow-nav{display:none}`); aparecem `.ow-exit` e o título do topo; `.ow-subnav` passa a `display:block` (`owner.css:97`).
- **≤719 px** (`owner.css:76-83`): `main` com padding 16 px; grade em coluna única na ordem `q, hero, k1, k2, k3, chg`; filtros com rolagem horizontal; linha de fila em 2 colunas; o painel lateral de revisão vira folha de baixo (`margin:auto auto 0`, `max-height:92dvh`, cantos de 28 px) (`owner.css:82`).
- **≤719 px, tabelas** (`owner.css:116`): `thead` escondido, cada linha vira grade de 2 colunas e cada célula mostra `data-label` antes do valor.
- **≤719 px, Filas** (`owner.css:98`): `ow-q-full` em 3 áreas (`ic t t / . sla who / . acts acts`), ações alinhadas à esquerda.
- **≤719 px, mini e cidade** (`owner.css:123`): `ow-mini-4` em 2 colunas; `ow-amb-city` em 1 coluna; linhas de plano com a ação na coluna 2.
- Fora isso: `body.owner-mode` esconde barra/atalho em qualquer largura (`owner.css:6`); a barra lateral de revisão em desktop é um painel à direita de até 420 px (`owner.css:63`).

##### Diálogos, editores, folhas e menus abertos nesta rota

1. **Revisão de item da fila** — `ownerReview` (`review.js:39`): `showDialog(q.title, …, ações, 'owner-review')` (`shell/dialogs.js:2-7`). Em desktop vira painel lateral direito de 420 px (`owner.css:63`); em ≤719 px, folha de baixo (`owner.css:82`). Conteúdo por tipo (`ownerReviewBody`, `review.js:18-28`):
   - **Denúncia** (`kind:'report'`): `<p>{título}[ · {quem}]</p>`; `<h3>Denúncias</h3>` e lista `.ow-reports` com `<b>{motivo}</b> · “{detalhes}”` e `<small>{tempo}[ · feita neste dispositivo]</small>`; atalhos "Abrir o anúncio" (`open-item`), "Abrir o pedido" (`open-request`), "Abrir a pergunta" (`open-question`), "Abrir a publicação" (`open-post`), "Abrir a página" (`open-biz`) (`review.js:10-16,21`). Se o autor apagou (`byAuthor`): `<b>O conteúdo já foi excluído pelo autor.</b>` + `<h3>Decisão</h3>` + nota "Não há mais o que remover. Dispensar fecha as denúncias.". Senão: `<h3>Decisão</h3>` + select `owner-reason` + nota `OWNER_ACT_NOTE[q.act]` (`review.js:8`) ou "Dispensar fecha as denúncias.".
     - `OWNER_ACT_NOTE.remove`: "Remover tira o conteúdo das listas e da busca, para todos, e deixa "removido pela moderação" no lugar. Dispensar mantém o conteúdo e fecha as denúncias."
     - `OWNER_ACT_NOTE.suspend`: "Suspender tira a página do catálogo e da busca, e ela passa a mostrar que está suspensa. Dispensar mantém a página e fecha as denúncias."
     - `OWNER_ACT_NOTE.warn`: "Advertir registra a advertência e avisa aqui no Painel; a conversa não é apagada. Dispensar fecha as denúncias sem registro."
   - **Verificação da entrada** (`kind:'verify'` com `q.entry`): `ownerEntryReviewBody` (`features/entry/arrive.js:71-74`) — "Criou a conta neste dispositivo. A fonte oficial não confirmou o vínculo pelo CPF[ e a pessoa enviou um documento]. O CPF não fica guardado."; `<h3>Documento</h3>` + `.ow-doc` com `entryDocLabel(doc)` ou "Nenhum documento ainda"; `<h3>Conferir</h3>`; `<h3>Histórico</h3>` — "Primeiro pedido. A cidade é escolhida depois da aprovação.".
   - **Verificação** (`kind:'verify'`): "Pediu acesso como família chegando a {cidade} {quando}. Convidada por {quem convidou}, verificado."; `<h3>Documento</h3>` com "Documento enviado (exemplo)"; `<h3>Conferir</h3>` — `ownerChecks` (`review.js:5`) lista com `check_circle` ou `schedule` + " · conferir"; `<h3>Histórico</h3>` — "Primeiro pedido. Nenhuma denúncia."; `<h3>Se for recusar</h3>` + select de motivo.
   - **Negócio** (`kind:'claim'`): "{nome} · {categoria} · {cidade}"; `<h3>Conferir</h3>` com "Indicada pela comunidade", "CNPJ e telefone conferem", "Quem pede é o responsável · conferir"; botão "Abrir a página" (`open-biz`); `<h3>Se for recusar</h3>` + select.
   - **Perguntas paradas** (`kind:'stale'`): `<p>{sub}.</p>`; `<h3>Paradas no protótipo</h3>` com até 5 perguntas (`{pergunta}` + `{cidade} · {tempo}`); nota "Os embaixadores da cidade recebem um aviso com as perguntas. Onde não há embaixador, o aviso pede para você convidar alguém de lá.".
   - **Select de motivo** (`ownerReason`, `review.js:6`): id `owner-reason`, rótulo "Motivo da decisão", opções (`OWNER_DECISION_REASONS`, `review.js:3`): "" → "Escolher motivo"; `golpe` → "Golpe ou pedido de pagamento antecipado"; `enganoso` → "Informação enganosa"; `dados` → "Dados pessoais expostos"; `ofensa` → "Ofensa ou assédio"; `documento` → "Documento ilegível ou não confere"; `outro` → "Outro motivo".
   - **Botões** (`ownerReviewActions`, `review.js:29-36`): denúncia → "Dispensar" (`dismiss`) + "Remover"/"Suspender página"/"Advertir" quando há `q.act`; verificação com entrada → "Pedir outro documento" (`more`) + "Aprovar" (`approve`); verificação → "Pedir outro documento" + "Recusar" (`reject`) + "Aprovar"; negócio → "Recusar" + "Aprovar"; perguntas paradas → só "Chamar embaixadores" (`call`).
   - **Erro** (motivo obrigatório): `f.errorText='Escolha o motivo antes de decidir.'` em `#owner-reason` (`review.js:57`); o erro manual sai ao escolher/digitar (`ownerClearErrors`, `review.js:38`).
   - **Sucesso**: aviso `{título}: {rótulo}.` (`check_circle`) ou, para `call`, `ownerCallText` (`review.js:81,83`).
2. **Painel lateral da cidade** — `ownerCityOpen` (`cities.js:15-23`), `showDialog(nome, …, 'owner-review')`: ponto + rótulo de saúde; mini-indicadores "Famílias", "Chegam em 60 dias", "Chegadas atendidas", "Sem resposta há 48 h"; `<h3>Embaixadores</h3>` com lista `.ow-amb` (iniciais + nome; convites com "· convite enviado") ou o vazio; `<h3>Convidar embaixador</h3>` + campo `owner-invite-name` (rótulo "Nome de quem mora em {cidade}", `maxlength="60" autocomplete="off"`) + nota "No app, o convite vai pelo próprio Bivaque e a pessoa precisa ser verificada para aceitar. Aqui ele fica registrado neste dispositivo."; botões "Ver perguntas paradas" (`owner-city-stale`, só se `unanswered`) e "Convidar" (`owner-invite`, ícone `person_add`). Erro: "Escreva o nome de quem você quer convidar." (`cities.js:27`). Sucesso: "Convite para {nome} ser embaixador em {cidade} registrado (modo teste)." (`cities.js:29`).
3. **Convidar moderador** — `ownerModInvite` (`business-team.js:48`): campos `owner-mod-name` ("Nome", `maxlength="60" autocomplete="off"`) e `owner-mod-city` ("Cidade", opções = cidades; selecionado `ownerCity==='Todas' ? state.homeCity : ownerCity`); nota "Moderadores revisam denúncias e verificações da cidade. No app, a pessoa precisa ser verificada para aceitar; aqui o convite fica registrado neste dispositivo."; botão "Registrar convite" (`owner-mod-send`, ícone `send`). Erro: "Escreva o nome de quem você quer convidar." (`business-team.js:51`). Sucesso: "Convite de moderação para {nome} registrado (modo teste)." (`business-team.js:53`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `owner-open` | `profile/settings.js:6` ("Ver como dono do Bivaque") | `''` | fecha diálogo, `ownerTab='all'`, `ownerStatus='open'`, navega para `dono` | `owner/review.js:86` |
| `owner-exit` | `owner/console.js:97,98` | `''` | `navigate('voce', replace)` — "Voltar ao app" | `owner/review.js:87` |
| `owner-city` | `owner/console.js:101`; `owner/queues.js:22`; `owner/business-team.js:22,31` | "Todas" ou nome da cidade | troca o filtro de cidade e redesenha | `owner/review.js:88` |
| `owner-tab` | `owner/console.js:80,90`; `owner/queues.js:24` | all/report/verify/claim/stale | troca o tipo na fila; reseta para `all` se o tipo ficar sem itens (`console.js:88`, `queues.js:16`) | `owner/review.js:89` |
| `owner-review` | `owner/console.js:82` (via `ownerBtn`); `owner/queues.js:8` | id do item | abre o painel de revisão | `owner/review.js:90` |
| `owner-decide` | `owner/review.js:30-35` (via `a()`) | `{id}~{decisão}` | aplica a decisão, fecha o painel, foca o `<h1>` e avisa | `owner/review.js:91` |
| `owner-status` | `owner/queues.js:23` | open/done | alterna Abertas/Decididas | `owner/review.js:93` |
| `owner-sort` | `owner/queues.js:23` | due/recent | reordena a fila | `owner/review.js:94` |
| `owner-assign` | `owner/queues.js:8` | id do item | registra `state.owner.assign` e avisa "Você é o responsável por este item." | `owner/review.js:95` |
| `owner-undo` | `owner/queues.js:12` | id decidido | desfaz a decisão e devolve o item à fila | `owner/review.js:96` |
| `owner-city-open` | `owner/cities.js:11` | nome da cidade | abre o painel lateral da cidade | `owner/review.js:97` |
| `owner-remind` | `owner/business-team.js:19` | id do negócio | registra lembrete e avisa | `owner/review.js:98` |
| `owner-mod-invite` | `owner/business-team.js:45` | `''` | abre "Convidar moderador" | `owner/review.js:99` |
| `owner-mod-send` | `owner/business-team.js:48` | `''` | grava o convite de moderação | `owner/review.js:100` |
| `owner-invite` | `owner/cities.js:23` | nome da cidade | grava o convite de embaixador | `owner/review.js:101` |
| `owner-city-stale` | `owner/cities.js:23` | nome da cidade | fecha o painel, filtra a cidade e abre Filas em "Perguntas" | `owner/review.js:102` |
| `owner-go` | `owner/console.js:80,95,99`; `owner/business-team.js:46` | aba (`''`/filas/cidades/negocios/equipe) | `navigate('dono', aba)` | `owner/review.js:92` |
| `open-item` / `open-request` / `open-question` / `open-post` / `open-biz` | `owner/review.js:12-15,21,25` | id (post usa `gid~pid`) | sai do Painel para o conteúdo | `app/handlers.js:93,108,126`; `requests/handlers.js:5`; `groups/handlers.js:33` |

---

#### 2.10.2 Rota `privacidade` — [sem parâmetro]

- Título na barra: "Política de privacidade" (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: `open-legal` com `data-value="privacidade"` — `features/profile/settings.js:5` ("Política de privacidade" / "O que guardamos e quem vê"); `features/entry/landing.js:90,98` (`legalLink('privacidade','Privacidade')`); e pelos nomes clicáveis do aceite (`legalConsentText`, `pages.js:41`, usado em `entry/login.js:23,36` e no cadastro).
- Desenhada por: `renderLegal` em `features/legal/pages.js:42`; helpers `legalLink` (`pages.js:39`), `legalConsentText` (`pages.js:41`), `entryChrome` (`pages.js:21`).
- Rota registrada em `LEGAL_ROUTES` (`pages.js:5`) e em `navigationNames` (`navigation.js:4`).

##### Conteúdo, de cima para baixo

1. Rodapé de versão: `<p class="small muted">Versão de teste · 18/10/2026</p>` (`LEGAL_VERSION='18/10/2026'`, `pages.js:5,43`).
2. `<h2 class="legal-h">` + `<p class="legal-p">` por seção de `LEGAL_DOCS.privacidade` (`pages.js:7-11`):
   - **"O que guardamos"** — "Seu nome, e-mail, cidade e o que você publica. O CPF serve só para confirmar o vínculo e não fica salvo."
   - **"Quem vê"** — "Só membros confirmados da família militar. Seu bairro só aparece se você permitir."
   - **"Seus direitos"** — "Ver, corrigir ou apagar seus dados a qualquer momento, em Configurações."
   - **"Neste teste"** — "Tudo o que você digita fica só neste aparelho. Nenhuma mensagem sai dele."
3. `<p class="legal-p muted">` com o link para o outro documento: `legalLink('conduta')` → botão "Código de conduta" (`pages.js:43`).
4. Com `state.signedOut` (`entryChrome()`, `pages.js:21`): cabeçalho da entrada — botão voltar (`back`, ícone `arrow_back`, `aria-label="Voltar"`), marca + "Bivaque" e `<h1 class="en-h1" tabindex="-1">` (`pages.js:44`). Dentro da conta: `<article class="legal-doc"><div class="page-head"><h1>…</h1></div></article>` (`pages.js:45`).

##### Estados

- **Vazio / carregando / erro / indisponível**: não existem nesta rota; o documento é estático (não verificado um estado de carregamento em `pages.js`).
- **Sem acesso**: nenhum — a página abre para quem saiu (`pages.js:3-4,44`) e para quem entrou.
- **Visita a outra cidade (`readonly()`):** não muda nada; `renderLegal` não usa `readonly()`.

##### Diferenças por viewport

- Não há media query própria de página legal: `.legal-doc{max-width:640px}` (`entry.css:79`) e `.legal-doc.en{padding-top:12px}` (`entry.css:80`) valem em qualquer largura.
- `styles/entry.css` só tem um `@media` (`entry.css:13`, `min-width:900px`) que aumenta o padding de `.en` e o tamanho de `.en-lead` (`entry.css:14-15`) — afeta o cabeçalho/lead no modo entrada, não o corpo da política.
- Com a conta (`.legal-doc` sem `.en`), o layout segue a página normal do app (`#topbar` visível, `activeTab` = `voce`).

##### Diálogos, editores, folhas e menus abertos nesta rota

Nenhum overlay é aberto por esta rota. O que existe é o **rascunho da entrada** (`entryDraft`): ao sair de `entrar` para a legal, `legalAction` chama `entryDraftSave()` (`pages.js:49`), que guarda `en-name`, `en-email`, `en-code` e o checkbox `#en-consent` (`ENTRY_DRAFT_FIELDS`, `pages.js:26-31`; sem a senha). Ao voltar para `entrar` com o mesmo `route.id`, `entryDraftRestore()` repõe os campos (`pages.js:32-36`).

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `open-legal` | `legal/pages.js:39` (link interno), `profile/settings.js:5`, `entry/landing.js:90,98`, aceite (`pages.js:41`) | privacidade | salva o rascunho da entrada e navega para a página | `legal/pages.js:47` |
| `back` | `pages.js:44` (modo entrada) | `''` | volta (fallback `privacidade`→`voce`, `navigation.js:51`) | `app/handlers.js:23` |

---

#### 2.10.3 Rota `conduta` — [sem parâmetro]

- Título na barra: "Código de conduta" (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: `open-legal` `conduta` — `profile/settings.js:5` ("Código de conduta" / "Como conviver e denunciar"); `entry/landing.js:90,98` (`legalLink('conduta')`, sem rótulo → usa o título do documento); aceite (`legalConsentText`).
- Desenhada por: `renderLegal` em `features/legal/pages.js:42` (mesma função da anterior).

##### Conteúdo, de cima para baixo

1. Versão de teste (igual à privacidade) e seções de `LEGAL_DOCS.conduta` (`pages.js:12-17`):
   - **"Respeito"** — "Trate cada pessoa com educação. Discordar é normal; ofender, ameaçar ou perseguir não é."
   - **"Nada de discriminação"** — "Não são aceitos preconceito de origem, cor, religião, gênero, orientação ou condição da família."
   - **"Dados de outras pessoas"** — "Não publique endereço, telefone, CPF, documentos ou fotos de outras pessoas sem a permissão delas. Isso vale também para crianças."
   - **"Comércio honesto"** — "Anuncie só o que você pode entregar, com preço e estado reais. Valores e pagamento são combinados entre vocês; o Bivaque não intermedeia pagamento."
   - **"Como denunciar"** — "Use Denunciar no menu do conteúdo. A equipe analisa e pode remover o conteúdo ou limitar a conta."
2. Link para o outro documento: `legalLink('privacidade')` → botão "Política de privacidade".

##### Estados / viewport / overlays

Iguais a `privacidade` (mesma função, mesmo CSS, mesmo rascunho de entrada). Vazio/carregando/erro: não existem.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `open-legal` | `legal/pages.js:39`, `profile/settings.js:5`, `entry/landing.js:90,98`, `pages.js:41` | conduta | navega para o código; salva o rascunho da entrada | `legal/pages.js:47` |
| `back` | `pages.js:44` | `''` | volta (fallback `conduta`→`voce`) | `app/handlers.js:23` |

---

#### 2.10.4 Rota `ajuda` — [parâmetro: id do tópico]

- Título na barra: "Ajuda" (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: `support-open` `ajuda` — `features/profile/settings.js:5` ("Ajuda" / "Perguntas frequentes e fale com a gente"); `entry/landing.js:78,90,98` ("Fale com a gente" da landing leva a `contato`, "Ajuda" leva a `ajuda`); botão "Voltar à Ajuda" (`help.js:62`); `back()` de `contato`/`chamados` volta para `ajuda` (`navigation.js:51`).
- Desenhada por: `renderHelp` em `features/support/help.js:50`; helpers `supportPage` (`help.js:45`), `helpContactCard` (`help.js:49`), `profileRow` (`profile/views.js:8`).
- Parâmetro: `route.id` = id do tópico (`conta`, `comunidade`, `anuncios`, `seguranca`); com tópico válido, `renderHelp` mostra o tópico (`help.js:51-52`).
- `SUPPORT_ROUTES=['ajuda','contato','chamados']` (`help.js:6`) → estas rotas abrem para quem saiu (`supportPage`, `help.js:46`).

##### Conteúdo, de cima para baixo

**Índice (`route.id` fora dos tópicos)** — `supportPage('Ajuda', …)` com:

1. Lista `.list` de `HELP_TOPICS` (`help.js:13-37`) — uma `profileRow` por tópico (`ícone`, título, subtítulo, `support-open`, `ajuda:{id}`):
   - `badge` — **"Conta e entrada"** · "CPF, convite, senha"
   - `forum` — **"Comunidade"** · "Perguntas, grupos, encontros"
   - `sell` — **"Anúncios e negócios"** · "Publicar, editar, pedir orçamento"
   - `verified_user` — **"Segurança"** · "Bloquear, denunciar, privacidade"
2. Card `.help-card` (`helpContactCard`): **"Não achou?"** / "Respondemos por e-mail em até 2 dias úteis." / botão "Fale com a gente" (`support-open` `contato`).
3. Só para quem entrou: lista com a linha **"Meus chamados"** (`support-open` `chamados`), subtítulo = `{open} em andamento` quando há chamado aberto, senão `Todos respondidos` (se existe algum) ou `Nenhum chamado ainda` (`help.js:53,56`).

**Tópico (`route.id` = id)** — `supportPage(topic.t, …)`: lista de `<details class="help-q">` com `<summary><b>{pergunta}</b>{ícone expand_more}</summary><p>{resposta}</p>` (`help.js:52`), seguida do card de contato. Perguntas e respostas exatas (`help.js:14-37`):

- **Conta e entrada**
  - "Por que pedem o CPF?" — "Para confirmar seu vínculo na fonte oficial. O número só é conferido e não fica salvo no Bivaque."
  - "Sou cônjuge ou dependente. Como entro?" — "Pelo convite de quem é militar, veterano ou pensionista. Essa pessoa cria o código em Você → Família convidada. O convite vale só para o e-mail de quem foi convidado, por 7 dias, e não pede CPF."
  - "A fonte oficial não confirmou meu vínculo." — "Envie um documento que mostre o vínculo, como o contracheque ou a identidade militar. A equipe responde em até 2 dias úteis e, enquanto isso, o conteúdo fica fechado."
  - "Esqueci a senha." — "Na tela Entrar, toque em Esqueci minha senha e informe seu e-mail. Neste teste nenhum e-mail é enviado."
  - "Como apago minha conta?" — "Em Você → Configurações → Apagar a conta. Você confirma digitando APAGAR."
- **Comunidade**
  - "Como peço uma indicação?" — "Em Comunidade, toque em Perguntar e escreva sua dúvida. Quem conhece a cidade responde, e você marca a resposta que ajudou."
  - "Como edito ou excluo o que publiquei?" — "Abra a pergunta, a resposta, a publicação, o comentário ou o encontro e toque em ⋮. Só quem publicou vê Editar e Excluir. Excluir não pode ser desfeito."
  - "Como oculto uma pergunta?" — "Deslize a pergunta e toque em Ocultar. Só você deixa de vê-la. Para mostrar de novo, vá em Você → Configurações → Ocultados."
  - "Como entro num grupo e confirmo presença num encontro?" — "Em Comunidade → Grupos, escolha o grupo e entre. Os encontros ficam na Agenda: toque em Confirmar presença. Se o encontro mudar ou for cancelado, quem confirmou é avisado."
- **Anúncios e negócios**
  - "Como publico um anúncio?" — "Toque em Criar e escolha Desapego ou Imóvel. Só perfis verificados publicam, e só na sua cidade; nas outras você consulta."
  - "Como edito, encerro ou excluo um anúncio?" — "Em Você → Meus anúncios, abra o anúncio. Você pode editar, marcar como encerrado, reativar ou excluir."
  - "Como peço orçamento ou serviço?" — "Na página de um negócio, toque em Pedir orçamento. Para receber propostas de vários prestadores, abra Pedidos de serviço em Você: até 5 empresas respondem e você escolhe."
  - "Como indico um negócio?" — "Na página do negócio, toque em Indicar este negócio e conte sua experiência."
  - "O Bivaque cobra ou intermedeia pagamento?" — "Não. Valor e pagamento são combinados entre vocês. Desconfie de quem pede pagamento adiantado."
- **Segurança**
  - "Como bloqueio uma pessoa?" — "No ⋮ de uma resposta, comentário ou publicação dela, no menu da conversa ou na página do anúncio, toque em Bloquear. Você deixa de ver o que ela publica e ela não fala mais com você; ela não é avisada. Desbloqueie em Configurações → Pessoas bloqueadas."
  - "Como denuncio um conteúdo?" — "Use Denunciar no anúncio, na pergunta, na resposta, no comentário, na publicação, na conversa, na página do negócio ou no pedido de serviço. Escolha o motivo; a equipe analisa e pode remover o conteúdo ou limitar a conta."
  - "Quem vê meus dados?" — "Só membros confirmados da família militar. Seu bairro só aparece se você permitir, em Configurações → Mostrar meu bairro."
  - "O que faço diante de um golpe?" — "Não envie dinheiro adiantado nem códigos recebidos por mensagem. Denuncie o anúncio e combine a entrega num local movimentado."
  - "O que acontece se eu apagar minha conta?" — "Seus anúncios, perguntas e páginas saem da comunidade. Suas respostas e indicações ficam, sem o seu nome, e suas conversas são apagadas para você."

##### Estados

- **Sem tópico selecionado**: mostra o índice + card de contato [+ "Meus chamados" para quem entrou].
- **Quem saiu (`state.signedOut`)**: `supportPage` desenha `.en en-form legal-doc` com cabeçalho da entrada; a linha "Meus chamados" **não aparece** (`help.js:56`); o índice continua aberto (rota está em `SUPPORT_ROUTES`, `pages.js:21`).
- **Carregando / erro / indisponível**: não existem; conteúdo estático.
- **Visita a outra cidade (`readonly()`)**: não muda nada.
- **`route.id` inválido**: cai no índice (o `find` de `HELP_TOPICS` falha, `help.js:51`).
- **`route.name==='chamados'` com `signedOut`**: `entryGate` troca a rota para `ajuda` antes de renderizar (`navigation.js:106`) — é o único bloqueio de login do suporte/legal.

##### Diferenças por viewport

- Sem media query própria: `.help-q summary` tem `min-height:56px` e o corpo usa 15 px/23 px (`entry.css:91-98`); nada muda entre 375/768/1440.
- No modo entrada vale `@media(min-width:900px)` (`entry.css:13-16`) — padding de `.en` e tamanho do lead.
- Com a conta, a barra do app aparece e o ícone de busca substitui o título (`navigation.js:60`); comportamento geral do app (não específico da área).

##### Diálogos, editores, folhas e menus abertos nesta rota

Nenhum overlay. O conteúdo do tópico é `<details>`/`<summary>` nativo (`help.js:52`), que abre e fecha pelo próprio elemento.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `support-open` | `help.js:49,54,56,62`; `profile/settings.js:5`; `entry/landing.js:78,90,98` | `ajuda` ou `ajuda:{id}` | navega para o índice/tópico; passa por `leaveDialog` | `support/help.js:146-151` |
| `back` | cabeçalho do modo entrada (`help.js:46`) | `''` | volta (fallback de `ajuda`: `voce` quando não há `route.id`, `ajuda` quando há, `navigation.js:51`) | `app/handlers.js:23` |

---

#### 2.10.5 Rota `contato` — [sem parâmetro]

- Título na barra: "Fale com a gente" (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: card "Não achou?" da Ajuda (`help.js:49`); botão "Fale com a gente" do estado vazio de Meus chamados (`support-contact`, `help.js:71`); landing (`entry/landing.js:78`).
- Desenhada por: `renderContact` em `features/support/help.js:58`; `supportPage` (`help.js:45`), `field` (`shell/primitives.js:13`).
- Parâmetro: nenhum (`support-open` de `contato` passa `id=null`, `help.js:147`).

##### Conteúdo, de cima para baixo

**Formulário** (`supportPage('Fale com a gente', …)`, `help.js:63`):

1. `.help-chips` com `<md-chip-set aria-label="Assunto">` (`help.js:59`): chips `md-filter-chip` com `data-action="support-topic"` e `aria-label="Assunto: {rótulo}"`, valores `TICKET_TOPICS` (`help.js:9`): `conta`→"Conta", `comunidade`→"Comunidade", `anuncios`→"Anúncios", `seguranca`→"Segurança", `outro`→"Outro". Selecionado = `supportTopic` (começa em `'conta'`, `help.js:38`).
2. Campo de texto (`help.js:63`): id **`support-text`**, rótulo **"Conte o que aconteceu"**, `type="textarea" rows="5" required maxlength="1000"`, `supporting-text="Mínimo de 10 caracteres"` (`TICKET_MIN=10`, `TICKET_MAX=1000`, `help.js:8`).
3. Quem responde: com a conta, `<p class="small muted help-note">A resposta vai para {state.profile.email}.</p>`; fora da conta, campo **`support-email`** (rótulo "Seu e-mail", `type="email" required autocomplete="email" inputmode="email"`) + nota "A resposta vai para este e-mail." (`help.js:60`).
4. `.help-send` com botão **"Enviar"** (`support-send`, filled) e nota "Neste teste o chamado fica só neste aparelho." (`help.js:63`).

**Confirmação fora da conta** (`state.signedOut && supportSent`, `help.js:62`): `supportPage('Recebemos sua mensagem', …)` com um `.help-card role="status"`: `<b>Recebemos. Respondemos por e-mail em até 2 dias úteis.</b>` (`TICKET_SENT`, `help.js:10`), "A resposta vai para o e-mail que você informou." e botão "Voltar à Ajuda" (`support-open` `ajuda`).

**Validações e mensagens** (`supportSend`, `help.js:74-83`):

- Texto com menos de 10 caracteres → `help.js:77` `fieldError` "Escreva pelo menos 10 caracteres." no `#support-text`.
- E-mail inválido (fora da conta) → `help.js:78` "Confira o e-mail." no `#support-email` (usa `entryEmailOk`, `entry/login.js:41`).
- Chamado gravado com `topic`, `text` (cortado em 1000), `at`, `status:'open'`, `email` (`help.js:79`).
- Sucesso: fora da conta volta para a tela "Recebemos sua mensagem"; com conta vai para `chamados` (`replace`); em ambos, aviso "Recebemos. Respondemos por e-mail em até 2 dias úteis." (`help.js:81-82`).
- O erro do campo some ao digitar (`help.js:143`).

##### Estados

- **Fora da conta**: mostra o campo de e-mail; chip inicial `conta` e `supportSent=false` são redefinidos a cada entrada (`help.js:149`).
- **Enviado sem conta**: tela "Recebemos sua mensagem" (acima).
- **Com conta**: sem estado de sucesso na própria tela — vai direto para `chamados`.
- **Vazio / carregando / erro de rede / indisponível**: não existem (gravação local).
- **Visita a outra cidade (`readonly()`)**: não muda nada.

##### Diferenças por viewport

- Nenhuma media query própria: chips em `.help-chips`, texto em largura total (`.legal-doc md-outlined-text-field{width:100%}`, `entry.css:105`) e botão de 100%/52 px (`.help-send md-filled-button`, `entry.css:102`).
- No modo entrada vale `@media(min-width:900px)` (`entry.css:13-16`).

##### Diálogos, editores, folhas e menus abertos nesta rota

Nenhum. Os "assuntos" são chips, não um select.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `support-topic` | `support/help.js:59` | conta/comunidade/anuncios/seguranca/outro | marca o chip escolhido (`selected`) | `support/help.js:152-155` |
| `support-send` | `support/help.js:63` | `''` | valida e grava o chamado | `support/help.js:156` |
| `support-open` | `support/help.js:62` | `ajuda` | volta ao índice de Ajuda | `support/help.js:146-151` |
| `support-contact` | `support/help.js:71`; `entry/landing.js:78` | `''` | equivale a `support-open` `contato` | `support/help.js:147` |

---

#### 2.10.6 Rota `chamados` — [sem parâmetro]

- Título na barra: "Meus chamados" (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: linha "Meus chamados" da Ajuda (`support-open` `chamados`, `help.js:56`); aviso de resposta simulada (`supportSimulate`, `help.js:88`, `go:['chamados']`); pós-envio com conta (`help.js:81`).
- Desenhada por: `renderTickets` em `features/support/help.js:69`; `ticketRow` (`help.js:65`), `supportPage` (`help.js:45`), `empty` (`primitives.js:18`).
- Parâmetro: nenhum.

##### Conteúdo, de cima para baixo

1. `supportPage('Meus chamados', …)` com `.stack` de cartões `.ticket`, ordenados por `at` decrescente (`help.js:70`).
2. Cada `ticketRow` (`help.js:65-67`):
   - Cabeçalho `.ticket-head`: `<b>{assunto}</b>` (`topicLabel`, `help.js:42`) e pílula **"Respondido"** (`pill('Respondido','ok','check_circle')`) ou **"Em andamento"** (`pill('Em andamento','','schedule')`).
   - `<p class="small muted">Enviado em {dd/mm}</p>` (`toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})`).
   - `<p class="ticket-text">{texto}</p>`.
   - Se respondido: `<p class="ticket-reply"><b>Resposta · {dd/mm}</b>{reply}</p>`, com `reply` ou `TICKET_REPLY` ("Obrigado por escrever. Já olhamos o seu caso e a resposta foi enviada para o seu e-mail.", `help.js:11`).
3. **Vazio**: `empty('Nenhum chamado ainda','Quando você escrever para a gente, o chamado aparece aqui com o estado.','inbox','support-contact','Fale com a gente')` (`help.js:71`).
4. **Aviso de resposta simulada** (`supportSimulate`, `help.js:85-89`): se há chamado aberto, o mais antigo vira `answered` com `TICKET_REPLY`, entra em `state.notices` o aviso "O suporte respondeu ao seu chamado sobre {assunto}." (`when:'Agora'`, `go:['chamados']`) e aparece o aviso "Resposta do suporte simulada" (`inbox`). Sem chamado aberto: "Nenhum chamado em andamento para responder." (`info`). É acionada pelo controle do protótipo "Simular resposta do suporte" (`support-simulate`, `profile/settings.js:6`).

##### Estados

- **Vazio**: bloco acima.
- **Fora da conta**: a rota **não é exibida** — `entryGate` reescreve `chamados` para `ajuda` e conserta o histórico (`navigation.js:106`). `supportAction` não tem guarda específico para `chamados` (`help.js:148`).
- **Carregando / erro / indisponível**: não existem.
- **Visita a outra cidade (`readonly()`)**: não muda nada.
- **Duplicidade/limite**: o código não impõe limite de chamados abertos; só ordena e rotula.

##### Diferenças por viewport

- Nenhuma media query própria: cartões em `.stack`, sem alteração entre 375/768/1440.
- Modo entrada não se aplica (rota exige conta), exceto quando o redirecionamento a manda para `ajuda`.
- No modo entrada vale `@media(min-width:900px)` (`entry.css:13-16`).

##### Diálogos, editores, folhas e menus abertos nesta rota

Nenhum.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `support-open` | `help.js:56` (origem) | `chamados` | vem de outra tela para cá | `support/help.js:146-151` |
| `support-contact` | `help.js:71` (vazio) | `''` | vai para `contato` | `support/help.js:147` |
| `support-simulate` | `profile/settings.js:6` | `''` | responde o chamado aberto mais antigo e cria aviso | `support/help.js:157` |

---

#### 2.10.7 Rota `apagar-conta` — [sem parâmetro]

- Título na barra: "Apagar a conta" (`navigation.js:53`)
- Aba ativa: `voce` (`navigation.js:54`)
- De onde se chega: bloco de perigo das Configurações — `settings.js:5`, `.list-row.danger-row` com `data-action="support-open" data-value="apagar-conta"`, ícone `delete`, texto "Apagar a conta" / "Remove seus dados deste aparelho".
- Desenhada por: `renderDeleteAccount` em `features/support/help.js:91` (usa `field`, `btn`, `icon`; **não** usa `supportPage`, então não vira modo entrada).
- Parâmetro: nenhum.
- Proteção dupla: `supportAction` recusa `apagar-conta` com `state.signedOut` (`help.js:148`) e `entryGate` manda quem saiu para `entrar` (`navigation.js:106`, pois `apagar-conta` não está em `SUPPORT_ROUTES` nem em `LEGAL_ROUTES`).

##### Conteúdo, de cima para baixo

1. `<div class="page-head"><h1>Apagar a conta</h1></div>` (`help.js:93`).
2. Faixa de aviso `.help-warn` com `role="note"`, ícone `error`: **"Isso não pode ser desfeito."** (`help.js:93`).
3. Lista `.list` de 3 linhas (`help.js:92`):
   - `sell` — **"Seus anúncios, perguntas e páginas"** / "Saem da comunidade"
   - `forum` — **"Suas respostas e indicações"** / "Ficam, sem o seu nome"
   - `chat_bubble` — **"Suas conversas"** / "Apagadas para você"
4. Campo de confirmação: id **`delete-word`**, rótulo **"Digite APAGAR para confirmar"** (`DELETE_WORD='APAGAR'`, `help.js:8`), `autocomplete="off" autocapitalize="characters" spellcheck="false"` (`help.js:93`).
5. `.help-danger` com botão **"Apagar minha conta"** (`account-delete`, filled, classe `danger-fill` — `overlays.css:37`).

**O que a confirmação exige e o que ela faz** (`accountDelete`, `help.js:132-138`):

- Exige que o valor, sem espaços e em maiúsculas, seja exatamente `APAGAR`; senão `f.errorText='Digite APAGAR para confirmar.'` (`help.js:134`).
- Executa `accountPurge` (`help.js:96-131`) numa única gravação `mutate` (se o armazenamento recusar, nada fica pela metade, `state.js:27-31`). O que o código apaga/ajusta:
  - `state.items`, `state.asks`, `state.events`, `state.requests` — remove os do próprio (`mine`).
  - `bizLeaveRequests(bizId)` quando havia página; `state.myBiz=null`; apaga `state.bizSuspended`.
  - `state.blocked=[]` e `state.reports=[]` (bloqueios e denúncias, com o texto digitado).
  - No Painel do dono: títulos de decisão e o `state.owner.log` têm o nome trocado por `GONE_NAME='Membro que saiu'` (`help.js:8,104`).
  - `saved=false` em todos os anúncios; `following=false` e apaga `hiddenByMe` das perguntas; respostas próprias recebem `ini='MS'` (`GONE_INI`) e `who='Membro que saiu'`.
  - Presenças em encontros canceladas (desconta 1 de `going`); `saved`, `myInd` e relatos (`says`) dos negócios limpos.
  - Grupos: remove o nome dos moderadores; se era admin, o primeiro moderador assume ou o grupo é encerrado (`closedAt`, `requests=[]`); apaga a chave da cota de oferta (`offerAt` por nome, e-mail ou `USER_ID`); `on/pending/role/unread` zerados; publicações e comentários próprios ficam como `GONE_NAME`.
  - `state.leftAuto` marcado; `threads`, `notices`, `tickets`, `invites`, `drafts`, `alerts`, `recent` esvaziados; `lastViewed=null`; `askDraft=''`.
  - `state.subscription` volta a `{tier:'free', …}`; `state.profile` volta a vazio (`name:''`, `role:''`, `force:''`, `verified:false`, `interests:[]`); `state.entry={}`; `state.signedOut=true`; `state.accountDeletedAt=Date.now()`.
- Depois: `supportSent=false`, `entryCityDraft=null`, `entryInviteCode=''`, `entryForgotSent=''`, `closePalette(false)`, `toastClearAll()` e `navigate('entrar','apagada',{replace:true})` (`help.js:136-137`).

##### Estados

- **Sem conta**: inalcançável — `supportAction` recusa, e `entryGate` manda para `entrar`.
- **Erro de confirmação**: "Digite APAGAR para confirmar." no campo (some ao digitar, `help.js:143`).
- **Vazio / carregando / indisponível**: não existem.
- **Visita a outra cidade (`readonly()`)**: não muda nada.
- **Sucesso**: a tela de conta apagada (rota `entrar`/`apagada`).

##### Diferenças por viewport

- Nenhuma media query própria: `.legal-doc{max-width:640px}` (`entry.css:79`), botão de 100%/52 px (`.help-danger md-filled-button`, `entry.css:102`), campo em largura total (`entry.css:105`).
- Não usa modo entrada mesmo com `signedOut` (mas, nesse caso, a rota nem renderiza).

##### Diálogos, editores, folhas e menus abertos nesta rota

Nenhum overlay. A confirmação é a própria página (campo + botão), não um `confirm()`.

##### Ações desta rota

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `support-open` | `profile/settings.js:5` (origem) | `apagar-conta` | abre a tela; recusada se `signedOut` | `support/help.js:146-151` |
| `account-delete` | `support/help.js:93` | `''` | valida "APAGAR", apaga a conta e vai para `entrar`/`apagada` | `support/help.js:158` (+ `accountDelete` em `:132`) |

---

#### Tela de conta apagada — rota `entrar` com `id=apagada` (não é rota própria)

- Rota: `entrar` (`navigationNames`), `route.id='apagada'`; renderizada por `renderEntry` quando `id==='apagada' && state.accountDeletedAt` (`features/entry/account.js:72`) → `renderAccountDeleted` (`features/support/help.js:139-141`).
- Título na barra: "Bivaque" (`titleForRoute` para `entrar`, `navigation.js:53`); `entryChrome()` é verdadeiro (`pages.js:21`), então é modo entrada sem barra do app.
- De onde se chega: só pelo fim de `accountDelete` (`help.js:137`, `navigate('entrar','apagada',{replace:true})`).

(mesma tela — ver 2.9.13)

##### Diferenças por viewport

- `.en-gone-in` com `padding:96px 12px 0`, coluna centralizada (`.en-gone-in` e `.en-gone-in .en-h1`, `entry.css:114-116`); sem media query própria. O `@media(min-width:900px)` de `.en` (`entry.css:13-16`) aumenta o padding horizontal.

##### Ações

| ação | onde aparece (arquivo:linha) | data-value | efeito visível | tratada em |
|---|---|---|---|---|
| `account-deleted-home` | `support/help.js:140` | `''` | volta para `entrar` (landing), `replace` | `support/help.js:159` |

---

---

## 3. Di�logos, editores, folhas e menus

Inventário dos overlays do protótipo `prototypes/bivaque-html/src`, montado a partir das dez leituras de
área (A–J) e conferido contra o código. Um overlay por linha. Nenhuma afirmação aqui foi confirmada em
runtime: tudo vem da leitura do código, e todo texto entre aspas é literal do código.

**Entraram 81 overlays.** Todos os `showDialog`, `confirm`, folhas, menus (`openCreate`), painéis, o
lightbox, o assistente de imóvel em etapas e a paleta de comandos foram incluídos — inclusive os de casca
(paleta, menu Criar, cidade e momento, avisos, perfil em análise), porque aparecem sobre as rotas.

**Ficou de fora, por ser comportamento de casca pura (não é overlay):**

- o snackbar/`notify` (`shell/toasts.js:18`) e o `undo` da pilha de avisos (`shell/toasts.js:10`;
  tratado em `app/handlers.js:143`) — aviso transitório, não diálogo;
- o `#create-scrim` e a delegação de clique de `openCreate` (`shell/create-menu.js:31,38,72-75`) — parte do
  menu, não overlay próprio;
- o seletor de arquivo (`<input type="file">` de `features/listings/editor.js:1`, ligado em
  `shell/bindings.js:18`; `#en-doc` de `features/entry/account.js:56`, ligado por `change` em
  `account.js:123`) — escolha do sistema operacional;
- o arrasto de folha (`bindSheetDrag`, `shell/dialogs.js:31-35`) e o arrasto da folha do bairro
  (`bindHoodPanelDrag`, `features/listings/hood-panel.js:53-74`) — gesto;
- o restaurador de overlay `profileRestoreOverlay` (`features/profile/demo-actions.js:36`), o
  `entryDraftSave`/`entryDraftRestore` (`features/legal/pages.js:32-36,49`) e o `segmentado` deslizante
  (`shell/segmented.js:15`);
- a paginação (`pagedHtml`/`pagedAuto`/`#paged-live`, `shell/paged-list.js:7,32-42`) e os contadores
  animados (`shell/count-up.js`) — não abrem overlay;
- dica de deslize e gestos de swipe/long-press (`motion/gestures.js:20-24,36-44`) — gesto, e o "menu"
  que ele abre já está na tabela.

**Nota sobre `Detalhe`.** O capítulo de rotas (`20-rotas.md`) ainda **não existe no tree** quando este
capítulo foi escrito. Para a referência ficar utilizável, uso a convenção `2.<área>.<rota>` na ordem das
partes A–J, declarada aqui para ser confrontada: 2.1 = A (2.1.1 `desapegos`, 2.1.2 `imoveis`,
2.1.3 `catalogo`); 2.2 = B (2.2.1 `anuncio`); 2.3 = C (2.3.1 `inicio`, 2.3.2 `comunidade`, 2.3.3 `pergunta`,
2.3.4 `busca`, 2.3.5 `guia`); 2.4 = D (2.4.1 `grupo`, 2.4.2 `publicacao`, 2.4.3 `agenda`, 2.4.4 `evento`);
2.5 = E (2.5.1 `voce`, 2.5.2 `salvos`, 2.5.3 `meus-anuncios`, 2.5.4 `minhas`, 2.5.5 `ocultados`,
2.5.6 `bloqueados`); 2.6 = F (2.6.1 `negocios`, 2.6.2 `negocio`); 2.7 = G (2.7.1 `pedidos`,
2.7.2 `pedido`); 2.8 = H (2.8.1 `conversas`, 2.8.2 `conversa`); 2.9 = I (2.9.1 `entrar` sem id,
2.9.2 `conta`, 2.9.3 `retomar`, 2.9.4 `aceite`, 2.9.5 `cpf`, 2.9.6 `resultado`, 2.9.7 `analise`,
2.9.8 `cidade`, 2.9.9 `boas-vindas`, 2.9.10 `login`, 2.9.11 `senha`, 2.9.12 `convite`, 2.9.13 `apagada`);
2.10 = J (2.10.1 `dono`, 2.10.2 `privacidade`, 2.10.3 `conduta`, 2.10.4 `ajuda`, 2.10.5 `contato`,
2.10.6 `chamados`, 2.10.7 `apagar-conta`).

**Nota sobre tipos.** Os `md-dialog` nascem de `showDialog(título, html, ações, kind)`
(`shell/dialogs.js:2`): `kind` ausente = `generic` (folha inferior no celular); `editor`, `prototype`
(gaveta lateral), `push`, `install`, `compare`, `share-card`, `hood`, `owner-review`, `plan-limit` têm
estilos próprios (`shell/dialogs.js:27`; `styles/overlays.css:2-9`; `styles/catalog.css:88`).
`Excluir anúncio` e as demais `confirm(...)` usam `#confirm-dialog` (`shell/dialogs.js:20`).

---

| Overlay | Tipo | Abre de (arquivo:linha) | Campos (id, rótulo, tipo, limites/validações) | Botões | Mensagens (erro e sucesso, literais) | Conclui em | Detalhe |
|---|---|---|---|---|---|---|---|
| 1. Painel/folha de filtros — `openFilterPanel` (`features/listings/filters.js:118`) | painel | `catalog-pill` (`filters.js:25` pílulas; `filters.js:33` ordenação; `catalog.js:33` CTA `Filtrar`) → `app/handlers.js:54` → `filters.js:118`; formatos: `all`→`drawer` ≥1024 px ou `full`; demais pílulas→`pop` ≥1024 px ou `sheet` (`filters.js:120`) | `#fp-min` "Mínimo (R$)" `type="number" inputmode="numeric" min="0" step="{step}"` placeholder `"0"`; `#fp-max` "Máximo (R$)" idem, placeholder `"Sem limite"`; `md-slider#fp-price` `range min="0" max="{max}" step="{step}"` com `aria-label-start="Valor mínimo"`/`-end="Valor máximo"` (`max`/`step` de `catalogPriceRange`, `catalog.js:18`: `step = top>5000?100 : top>500?50 : 10`, `max = Math.ceil((top+1)/step)*step`); `#fp-date` "Ou até a data" `type="date" min="{hoje}"` (seção Disponível para morar); `#fp-hood-q` "Acrescentar bairro" placeholder `"Digite o bairro"` (só com >8 bairros); chips `FILTER_QUICK` (imóvel `1500/2500/3000/4000`, desapego `100/300/800/1500`, rótulo `Até {R$ v}`) mutuamente exclusivos com o mínimo; seções `all`=`FILTER_SECTIONS[*]`: `ptype` "Tipo de imóvel" (5 `PROPERTY_TYPES`), `price`, `avail` "Disponível para morar" (`Qualquer data`/`Agora`/`Até 30 dias`/`Até 60 dias`), `beds` "Quartos" (`Qualquer`/`1+`..`4+`), `parking` "Vagas de garagem" (`Qualquer`/`1+`..`3+`), `area` "Área mínima" (`Qualquer`/`40 m²+`..`100 m²+`), `amen` "Comodidades" (8 `PROPERTY_AMENITIES`), `hood` "Bairro", `cat` "Categoria" (9 `ITEM_CATEGORIES`), `cond` "Estado de uso" (`Todos`+`ITEM_CONDITIONS`), `pickup` "Retirada" (`Qualquer data`/`Retirada imediata`/`Em até 30 dias`), `sort` "Ordenar" (3 `SORT_LABELS`), grupo `Distância de mim` (`Qualquer`/`1 km`/`3 km`/`5 km`/`10 km`) | `Limpar tudo`/`Limpar` (`data-f="clear"`, `filters.js:78,109`); CTA `#fp-apply` `Ver {n} imóveis`/`Ver {n} desapegos`/`Nenhum resultado` (`filters.js:78`); `.ficon` `aria-label="Fechar sem aplicar"` e `data-f="close"` | Nenhuma mensagem literal de erro — a validação é nativa (`min`/`step`/`type=date`) e a data anterior a hoje é descartada em `filters.js:101`; região viva `#fp-live` (`aria-live="polite"`): `"{n} imóveis com esses filtros"` / `"Nenhum resultado com esses filtros"`; dicas: `"Aluguel + condomínio, o que sai do bolso todo mês."` (imóvel), `"Combine com a data da sua chegada."`, `"A partir do seu bairro, {nome}."`, `"A distância usa os bairros da lista de {cidade}. Escolha o seu na lista em Configurações."`, `"Informe seu bairro em Configurações para filtrar pela distância."` | `applyFilterPanel` (`filters.js:134`) copia o rascunho para `catalogAttrs[kind]`, fecha sem restaurar foco, `render()` e devolve o foco à pílula; `closeFilterPanel` (`:129`) descarta e volta o foco à âncora | 2.1.1, 2.1.2, 2.1.3 |
| 2. Mapa do catálogo — `catalogMapHtml` (`features/listings/map.js:16`) / `catalogMapAfterRender` (`:35`) | painel (não é overlay: substitui a lista dentro de `#catalog-results`) | `catalog-view` (`map.js:14`) → `map.js:81`; desenhado quando `catalogView==='map' && cityHasHoods()` (`catalog.js:13`) | — | Chips `{bairro} · {n}` (`map-hood`, `map.js:19`) e pinos `.cmap-pin` com `data-action="map-hood" data-value="{bairro}"` (`map.js:48`); `NavigationControl` sem bússola | `"Carregando o mapa…"` (`#cmap-status`); `"Parte do mapa não carregou. Os bairros abaixo continuam funcionando."` (`map.js:58`); `"O mapa precisa de internet e não carregou agora. Use os bairros abaixo ou volte para a lista."` (`:60`); nota `"Posição aproximada do bairro; o endereço exato não aparece. Mapa © OpenStreetMap, servido pelo OpenFreeMap."`; vazio `"Nenhum anúncio com esses filtros."` | Nada — a tela permanece no mapa; `map-hood` abre a folha (<720 px) ou o diálogo (≥720 px) | 2.1.1, 2.1.2 |
| 3. Folha do bairro no celular — `openHoodPanel` (`features/listings/hood-panel.js:34`) | folha | `map-hood` com `innerWidth < 720` (`map.js:83`) → `hood-panel.js:34`; só existe em <720 px (`styles/sheets.css:3`) | — | Puxador `.hp-grab` (`hood-panel-stop`, `aria-label` `Mostrar mais do bairro`/`Mostrar menos do bairro`); `hood-panel-close` (`aria-label="Fechar {bairro}"`); cartão `photoCard` (`open-item`); `Ver todos os {n}` (`hoodAllTile`); `Ver só este bairro na lista` (`map-hood-list`) | `"Nenhum anúncio neste bairro com esses filtros."`; `"Puxe para ver os {n} anúncios"`; `"Ver todos os {n}"` + `"na lista, só deste bairro"`; subtítulo `"{n} desapegos/imóveis com os filtros que você escolheu"` | `map-hood-list` (`map.js:86`) fixa `hoods:[bairro]` e volta à lista; X/`hood-panel-close` (`hood-panel.js:85`) e arrasto fecham com foco restaurado + `history.back()`; `stop` alterna `low`(248 px)/`half`(58%)/`full` (`hood-panel.js:10`) | 2.1.1, 2.1.2 |
| 4. Diálogo do bairro (tablet/desktop) — `openHoodSheet` (`features/listings/map.js:63`) | diálogo (kind `hood`) | `map-hood` com `innerWidth >= 720` (`map.js:83`) → `map.js:63` | — | `Ver só este bairro na lista` (`map-hood-list`, texto, ícone `list`); `Fechar` (`close-dialog`, preenchido) | Título `"{bairro} · {n} desapegos/imóveis"`; nota `"Com os filtros que você escolheu."`; vazio `empty('Nenhum anúncio neste bairro','Mude os filtros ou escolha outro bairro.','location_off')` | `map-hood-list`; `close-dialog` → `closeDialog()` (`dialogs.js:13`); paginação própria `pagedShown.delete('hood-dialog')` a cada abertura (`map.js:64`) | 2.1.1, 2.1.2 |
| 5. Comparação de imóveis salvos — `openCompareSaved` (`features/listings/compare.js:23`) | diálogo (kind `compare`, `width:min(1080px,100vw)`) | `compare-saved` (`compare.js:5` via `compareEntryHtml`, desenhado em Salvos; `features/profile/views.js:9`) → `compare.js:31` → `compare.js:23` | — | `Ver anúncio` (`compare-open`, outlined); `Tirar dos salvos` (`compare-unsave`, texto); `Fechar` (`close-dialog`, texto) | Faixa de entrada `"Você salvou {n} imóveis. Compare total do mês, quartos, área e disponibilidade."`; guarda `"Salve ao menos dois imóveis para comparar."`; nota `"Do menor para o maior total do mês. Os destaques aparecem só quando os valores são diferentes."`; `"Este anúncio não está mais disponível."`; `"“{título}” saiu dos salvos."`; `"“{título}” saiu dos salvos. Salve outro imóvel para voltar a comparar."`; selos `Menor total`/`Mais quartos`/`Maior área`/`Disponível antes`; vazios por coluna `Nenhuma informada`, `—` | `compare-open` (`:33`) fecha e navega para `anuncio`; `compare-unsave` (`:34`) tira dos salvos e reabre (se restam ≥2) ou fecha | 2.5.2 (também 2.1.1) |
| 6. Cartão de compartilhamento — `openShareCard` (`features/listings/share-card.js:42`) | diálogo (kind `share-card`) | `share` (`features/listings/detail.js:8`; `motion/gestures.js:36`; `businesses/detail.js:3,28`; `events/views.js:18`; `community/question.js:4`; `manage.js:51`) → `app/handlers.js:31` → `share-card.js:42` (valor `anuncio\|{id}` ou `negocio\|{id}`) | — (canvas 1080×1350 montado no aparelho, `SHARE_W/H` em `share-card.js:6`) | `Compartilhar link` (`share-link`, texto, ícone `link`); `Baixar imagem` (`share-download`, outlined, `image`); `Compartilhar com imagem` (`share-image`, preenchido, `share`, escondido quando `navigator.canShare` não aceita arquivo, `:53`) | `"Preparando o cartão…"` (`.share-wait`); nota `"Imagem pronta para grupos de WhatsApp, feita neste aparelho. O link é da demonstração local e não abre em outros aparelhos."`; `"Não foi possível montar a imagem neste aparelho. Use “Compartilhar link”."`; `"O cartão ainda está sendo preparado."`; `"Imagem salva no aparelho"`; `"Cartão compartilhado"`; `"Não foi possível compartilhar a imagem. Use “Baixar imagem” ou “Compartilhar link”."` | `share-link` fecha e chama `share(tipo,id)` (`:57`); `share-download` baixa `bivaque-{tipo}-{id}.png` (`:59`); `share-image` usa `navigator.share` (`:61`) | 2.1.1, 2.2.1, 2.6.2 |
| 7. Alertas de busca — `openSearchAlerts` (`features/listings/alerts.js:45`) | diálogo | `search-alert` (`catalog.js:33`, `alerts.js:29`) → `alerts.js:55`→`createSearchAlert` (`:31`); `search-alerts` (`alerts.js:28`, `profile/views.js:6`) → `alerts.js:56` | — | `Avise-me` (`search-alert`, tonal, `notifications`); `Gerenciar` (`search-alerts`); `Fechar` (`close-dialog`); por linha: texto `alert-open`, sino `alert-toggle` (`aria-pressed`, rótulos `Pausar avisos de {rótulo}`/`Ligar avisos de {rótulo}`), lixeira `alert-delete` (`Excluir alerta {rótulo}`); `Desfazer` (`alert-undo`) | `"Escolha ao menos um filtro para criar o alerta."`; `"Alerta criado: avisaremos quando aparecer um anúncio assim."` / desfazer `"Alerta removido"`; `"Alerta “{rótulo}” excluído."`; `"Este alerta não existe mais."`; `"Este alerta é de {cidade}. Troque a cidade para ver os anúncios."`; nota `"Avisamos na central quando aparecer um anúncio novo de outra pessoa que caiba na busca. Fica só neste aparelho."`; linha `{cidade} · {n} anúncios hoje · {avisos ligados\|avisos pausados}`; `(pausado)`; vazio `empty('Nenhum alerta ainda','Filtre imóveis ou desapegos e toque em “Avise-me”.','notifications_none')` | `alert-open` (`:60`) fecha o diálogo, copia o alerta para `catalogFilter`/`catalogAttrs` e navega para `imoveis`/`desapegos`; `alert-toggle` (`:65`) e `alert-delete` (`:66`) redesenham e reabrem a lista | 2.1.1, 2.1.2, 2.5.1 |
| 8. Editor de anúncio — `openItemEditor` (`features/listings/editor.js:3`), `showDialog(..., 'editor')` (`:8`) | diálogo (editor) | `create-item` (`catalog.js:13`; `home/desktop.js:43`; `profile/views.js:10`) → `handlers.js:84`; `edit-item` (`detail.js:8`; `profile/views.js:10`) → `:86`; `open-draft` (`profile/views.js:10`) → `:87` | `item-title` "Título do anúncio" `required minlength="5" maxlength="100" class="full"`; `item-price` imóvel `"Aluguel mensal (R$)"`/desapego `"Preço (R$)"` `type="number" min="1" step="0.01" required inputmode="decimal"`; `item-hood` `"Bairro"` ou `"Bairro (opcional)"` (busca de bairro, `required` se a cidade tem bairros, `maxlength="60" autocomplete="off"`, placeholder `"Digite o bairro ou o CEP"`); imóvel: `item-ptype` "Tipo de imóvel" `required`, `item-beds` "Quartos" `min="0" max="20" required`, `item-area` "Área (m²)" `min="10" max="100000" required`, `item-parking` "Vagas" `min="0" max="20"`, `item-condo` "Condomínio (R$)" `min="0" inputmode="decimal"`, `item-avail` "Disponível a partir de (opcional)" `type="date" min="{hoje}"`, `md-chip-set#item-amen` "Comodidades" (8 `PROPERTY_AMENITIES`); desapego: `item-cat` "Categoria" `required`, `item-cond` "Estado de uso" `required`, `item-pickup` "Retirada a partir de (opcional)" `type="date" min="{hoje}" class="full"`; sempre `item-desc` "Descrição" `type="textarea" rows="4" required minlength="12" maxlength="2000" class="full"` + bloco de fotos | `Salvar rascunho` (`save-draft`, texto, sem `id`); `Cancelar` (`close-dialog`, texto, com `id`); `Publicar anúncio`/`Salvar alterações` (`submit-item`, preenchido) | Erros literais na ordem (`editor.js:14`): `"O título precisa de pelo menos 5 letras."`, `"Informe um preço maior que zero."`, `"Escolha o bairro na lista. O CEP não fica salvo."`/`"Escolha o bairro."`, `"Descreva o anúncio com pelo menos 12 caracteres."`, `"Escolha o tipo de imóvel."`, `"Escolha a categoria."`, `"Escolha o estado de uso."`, `"Informe uma data de retirada válida."`, `"Informe uma data de disponibilidade válida."`; antes disso `validFields([...])` usa `reportValidity()` **nativo** (mensagem do navegador, ex. `"Preencha este campo."`) e foca o primeiro inválido (`editor.js:11`); picker de bairro: `"Continue digitando: o CEP tem 8 números."`, `"CEP não encontrado no modo teste. Digite o nome do bairro."`, `"Esse CEP é de {cidade}. Aqui vale um bairro de {cidade}."`, `"O CEP só serve para achar o bairro e não fica salvo."`; sucesso: `"Anúncio publicado"` / `"Anúncio atualizado"` | `submitItem` (`:12`) grava por `mutate` e faz `closeDialog(true)` + `navigate('anuncio',id)` (`:16-17`); `save-draft` fecha e vai a `meus-anuncios` com `myAdsFilter='drafts'` | 2.2.1 |
| 9. Assistente de imóvel em 5 etapas — `openPropertyWizard` (`features/listings/wizard.js:36`), `showDialog('Anunciar imóvel', ..., 'editor')` (`:38`) | assistente | `create-property` (`catalog.js:13`; `shell/create-menu.js:9-10,24-25`; `shell/command-palette.js:6`) → `handlers.js:85` → `wizard.js:36` | Etapas `WIZ_STEPS` (`wizard.js:5`): 1 `"O imóvel"` (`item-ptype` required; `item-title` `required minlength="5" maxlength="100"` supporting-text `"Ex.: Apartamento 2 quartos perto da Base Aérea"`; `item-hood`; `item-beds` `min="0" max="20" required`; `item-area` `min="10" max="100000" required`; `item-parking` `min="0" max="20"`); 2 `"Valores e disponibilidade"` (`item-price` `min="1" step="0.01" required inputmode="decimal"`; `item-condo` `min="0"`; `item-avail` `type="date" min="{hoje}"`); 3 `"Comodidades e descrição"` (grupo Comodidades + `item-desc` `required minlength="12" maxlength="2000"`); 4 `"Fotos"` (bloco de upload); 5 `"Revisão"` (`#wiz-review`) | `Salvar rascunho` (`save-draft`, texto); `Voltar` (`wiz-prev`); `Continuar` (`wiz-next`, preenchido); `Publicar anúncio` (`submit-item`, preenchido); na revisão, `Editar` (`wiz-go`, valor = nº da etapa) | `"Etapa {n} de 5 · {título}"` (`#wiz-count`); `"Escolha o tipo de imóvel."` (`wizard.js:41`); `"Quem procura vê o total do mês: aluguel + condomínio."`; `"Confira antes de publicar. É assim que o cartão aparece para quem procura."`; `"Nenhuma marcada"` / `"{n} foto/fotos"` / `"Sem fotos: o cartão mostra um ícone"`; ao publicar valem as 9 mensagens do editor de anúncio (`item-ptype` incluso) | `wizEnsureValid` (`:51-54`) leva à etapa do primeiro campo inválido e devolve `false`; `submit-item` publica e navega | 2.2.1 |
| 10. Oferta — `item-offer`/`send-offer` (`app/handlers.js:98-99`) | diálogo | `item-offer` (`detail.js:9`) → `handlers.js:98` | `offer-amount` "Sua oferta (R$)" `type="number" min="1" required`, valor inicial `Math.round(i.numPrice*.9)` | `Cancelar` (`close-dialog`); `Preparar oferta` (`send-offer`, preenchido) | Nota `"O valor será enviado como mensagem. O anunciante decide se aceita."`; `"Este anúncio foi encerrado."` (anúncio já `sold`, avisado antes de abrir, `handlers.js:98`); validação nativa do `required`/`min` (`validFields(['offer-amount'])`, `:99`); sem mensagem de sucesso — a oferta vira a primeira mensagem da conversa | `send-offer` (`:99`) abre conversa com `contact('item', id, "Olá! Você aceitaria {valor}?")` | 2.2.1 |
| 11. Contatos recebidos — `item-leads`/`biz-leads` (`app/handlers.js:105`) | diálogo | `item-leads` (`detail.js:9`) e `biz-leads` (`businesses/detail.js:28`) → `handlers.js:105` | — (lista `state.threads` do anúncio/negócio sem bloqueados) | Por linha: `open-thread` (`profileRow('chat_bubble', t.who, t.msgs.at(-1)?.t \|\| 'Conversa iniciada', …)`); `Fechar` (`close-dialog`) | Vazio: `empty('Nenhum contato ainda','Os contatos sobre esta publicação aparecerão aqui.','chat_bubble')` | `open-thread` fecha o diálogo e abre a conversa (`app/handlers.js:106` → `messaging/actions.js:27`) | 2.2.1, 2.6.2 |
| 12. Galeria em tela cheia (lightbox) — `openLightbox` (`features/listings/photos.js:29`) | lightbox | `lightbox` com `data-value="item"` (`detail.js:9`) ou `"biz"` (`businesses/detail.js:5`) → `app/handlers.js:91` | — | `Fechar fotos`; `Foto anterior`/`Próxima foto` (`chevron_left`/`chevron_right`); miniaturas `Ver foto {n+1}` | Contador `"{i+1} de {total}"`; `alt="Foto {i+1} de {total} de {título}"`; `aria-label="Fotos de {título}"` | Fecha por Esc/botão/arrasto para baixo (`photos.js:42`): remove o nó, devolve `inert` (`LIGHTBOX_BEHIND=['#main','#nav','#topbar','#fab','#detail-actions']`, `:28,34`), `history.back()` e devolve o foco à origem; zoom até `LB_MAX=4` e duplo toque `2.5` (`photo-gestures.js:6`) | 2.2.1, 2.6.2 |
| 13. Denunciar conteúdo — `openReport` (`app/handlers.js:39` → `features/profile/demo-actions.js:94`) | diálogo | `report` (`detail.js:9`; `community/question.js:9`; `blocks.js:41`; `requests/views.js:9,16,36`; `messaging/actions.js:53`; `groups/views.js`; `businesses/detail.js:5`) → `handlers.js:39` | `report-reason` "Motivo" (`selectField`, `required`, opções `''`=`"Escolher motivo"`, `spam`=`"Spam ou propaganda inadequada"`, `fraud`=`"Informação enganosa"`, `privacy`=`"Exposição de dados pessoais"`, `abuse`=`"Ofensa ou comportamento inadequado"`, `other`=`"Outro motivo"`); `report-details` "Detalhes (opcional)" `textarea rows="3" maxlength="1000"` | `Cancelar` (`close-dialog`); `Registrar denúncia` (`submit-report`, preenchido, valor `tipo\|id`) | Nota `"No modo teste, a denúncia fica registrada neste dispositivo."`; `errorText` `"Escolha o motivo."` (`owner/review.js:108`); duplicado → `"Você já denunciou este conteúdo. A equipe do Bivaque está revisando."`; sucesso → `"Denúncia registrada. A equipe do Bivaque revisa em até 24 h."` | `submit-report` (`:40`) grava em `state.reports` com `status:'open'`, `label:reportLabel(...)`, `details` cortado em 1000 (`review.js:110-111`) e fecha o diálogo | 2.2.1 |
| 14. Excluir anúncio — `confirm` (`app/handlers.js:102`; `shell/dialogs.js:20`) | confirmação | `delete-item` (`detail.js:9`; `profile/views.js:10`) → `handlers.js:102` | — | `Continuar` (`cancel-confirm`, texto) e `Confirmar` (`accept-confirm`, preenchido) — padrão de `confirm` | `"Excluir anúncio?"` / `"“{título}” sairá das ofertas. As conversas existentes serão preservadas."`; ao aceitar, `"Anúncio excluído"` **com desfazer** (`handlers.js:102`); falha de gravação → `"Não foi possível salvar. Libere espaço no navegador ou use fotos menores."` (`app/state.js:29`) | Remove de `state.items`, zera `lastViewed` se for o item, vai a `meus-anuncios` com `myAdsFilter='active'` | 2.2.1, 2.5.3 |
| 15. Descartar alterações — `confirm` (`shell/dialogs.js:13` `closeDialog`; `:18` `leaveDialog`) | confirmação | Qualquer overlay com `editorDirty` disparado — `close-dialog` (botão `Cancelar`), `back`, `nav` (`shell/bindings.js:15` marca sujo em todo `input`/`change` de campo ou switch do diálogo `editor`) | — | `Continuar` (`cancel-confirm`) e `Confirmar` (`accept-confirm`) | `"Descartar alterações?"` / `"Você pode continuar editando ou descartar o que ainda não foi salvo."` | Aceitar fecha o diálogo e descarta; recusar mantém o diálogo aberto | 2.2.1 |
| 16. Excluir rascunho — `confirm` (`app/handlers.js:103`) | confirmação | `delete-draft` (`profile/views.js:10`) → `handlers.js:103` | — | `Continuar` / `Confirmar` | `"Excluir rascunho?"` / `"O texto e as fotos deste rascunho serão removidos."`; `"Rascunho excluído"` **sem desfazer** | Remove o rascunho de `state.drafts` e redesenha | 2.5.3 |
| 17. Cidade e momento — `openCity` (`features/profile/settings.js:1`) | diálogo (kind `generic`) | `city` (`home/views.js:15`; `shell/navigation.js:60`; `profile/views.js:6`) → `handlers.js:62` | `city-select` "Cidade que você quer consultar" (`CITY_NAMES`, selecionado `state.city`); `moment-select` "Seu momento" (`Moro na cidade`/`Estou chegando`/`Estou saindo`); `arrival-date` "Data de chegada" `type="date" min="{hoje}"` (só `chegando`); `leave-date` "Data da saída" (só `saindo`); `destination-select` "Destino" (`CITY_NAMES` sem a cidade natal, só `saindo`) | `Cancelar` (`close-dialog`, texto); `Aplicar` (`apply-city`, preenchido) | Nota `"Sua cidade atual é {homeCity}. Nas outras cidades você consulta conteúdo sem publicar."`; erros (`handlers.js:65`): `"Escolha uma cidade da lista."`, `"Informe a data de chegada."`, `"Informe a data de saída."`, `"Escolha o destino da mudança."`; **sucesso: nenhuma mensagem** | `apply-city` (`:63`) grava cidade/modo/datas, zera `searchHood='Todos'`, `searchMin=searchMax=''`, `catalogAttrs` padrão; fecha e navega `inicio` (`:66`) | 2.3.1, 2.5.1 |
| 18. Plano completo (checklist) — `openLocalPlan` (`app/handlers.js:28,147`) | diálogo | `plan` (`home/views.js:32`; `home/desktop.js:68`) → `handlers.js:28,147` | — (todas as etapas de `renderPlan(kind,true)`, com `md-checkbox` `plan-check` `data-value="{kind}\|{id}"` e `aria-label="Marcar {t} como concluído"`) | `Fechar` (`close-dialog`, texto); `plan-go` despacha a ação da etapa; checkboxes marcam/desmarcam | Nota `"Checklist pessoal demonstrativo. As marcações ficam apenas neste dispositivo; nenhuma providência externa é realizada."`; `"Etapa concluída neste dispositivo"` / `"Etapa reaberta neste dispositivo"`; bloqueio por perfil → `"Seu perfil de teste precisa estar verificado antes de salvar marcações. Nenhuma etapa foi alterada."` (`handlers.js:29`); `kind` inválido → `showGlobalDependency('plano-indisponivel')` | `plan-check` redesenha o próprio diálogo; `plan-go` (`:30`) fecha o overlay e despacha a ação da etapa; `destination` troca `state.city` e navega `guia` | 2.3.1 |
| 19. Avisos — `openNotices` (`features/profile/demo-actions.js:29`) | folha (kind `generic`) | `notices` (`shell/navigation.js:60` sino; `home/desktop.js:30`), `notice-home` (`demo-actions.js:34`), `profileRestoreOverlay` (`:36`) → `demo-actions.js:76` | — (chips `notices-tab` `Todos ({n})`/`Não lidos ({n})`; por linha `notice-open` e `notice-read` com `drafts`/`done`, `disabled` se lido, `aria-label="Marcar aviso como lido"`/`"Aviso lido"`) | `Marcar todos como lidos` (`notices-read-all`, texto, `check_circle`); `Consultar {homeCity}` (`notice-home`, texto, `home`, só fora da cidade natal); `Fechar` (`close-dialog`, texto) | Nota `"Avisos fictícios guardados neste navegador. Nenhuma notificação real é entregue."`; grupos `"Hoje"`/`"Anteriores"`; subtítulo `{when\|\|'Agora'} · {unread?'não lido':'lido'}`; vazios `"Nenhum aviso nesta cidade"`/`"Os avisos de demonstração da sua cidade atual aparecerão aqui."` e `"Tudo em dia"`/`"Você leu todos os avisos desta cidade."`; erros `"Não foi possível salvar a leitura. Os avisos continuam não lidos."`, `"Este aviso não está mais disponível."`, `"Consulte {cidade} para abrir este aviso."`, `"O conteúdo deste aviso não está mais disponível. O aviso permanece nesta lista."`, `"Não foi possível salvar a leitura. O aviso permanece não lido."`; sucessos `"Avisos marcados como lidos apenas neste navegador."`, `"Aviso marcado como lido apenas neste navegador."` | `notice-open` (`:80-86`) marca lido e navega com `returnOverlay:'notices'`; `notice-read` marca e reabre; `notices-tab` (`:77`) troca a aba; todas saem em `#notice-status` (`role="status" aria-live="polite"`) | 2.3.1, 2.5.1 |
| 20. Paleta de comandos — `openPalette` (`shell/command-palette.js:38`) | paleta | Atalho global `Ctrl+K`/`⌘K`/`"/"` (`command-palette.js:47-54`), só fora de diálogo/menu e só ≥1024 px (`createPanelMQ`, `:5,40,53`); **nenhum `data-action` a abre** (o `<kbd class="home-kbd">` da Início só anuncia o atalho, `home/desktop.js:10`) | Campo de busca, placeholder `"Buscar negócios, anúncios, perguntas ou ir para…"` (grupos: `Negócios`, `Anúncios`, `Perguntas`, `Grupos`, `Ações`, `Ir para`, `Buscas recentes` em vazio, `Buscar “{t}” em tudo`) | Resultados acionam `open-biz`/`open-item`/`open-question`/`open-group`/`recent-search` e ações (`command-palette.js:23-29`) | Vazio `"Nada encontrado."`; contador `"{n} resultado\|resultados"`; rodapé `"↑ ↓ navegar"`, `"↵ abrir"`, `"Esc fechar"` (`:9,33-34`) | Fecha por Esc, clique no fundo ou navegação (o registro de entrada de histórico é do próprio overlay) | 2.3.1 (aparece sobre todas) |
| 21. Menu "Criar" — `openCreate` via ação `create` (`shell/create-menu.js:17-51`; itens `:6-15`) | menu | `create` (`app/handlers.js:83`) emitido por `#fab` (`shell/template.html:5`), `nav-create-slot` (`shell/navigation.js:66`), `my-ads` (`profile/views.js:10`, botão "Anunciar"), atalho `C` no desktop (`create-menu.js:93-97`) | — | Itens: `Pedir indicação` (`ask`), `Contratar serviço` (`create-request`, com `<span class="cp-new">Novo</span>`), `Anunciar desapego` (`create-item`), `Anunciar imóvel` (`create-property`), `Indicar um negócio` (`indicate`), `Criar encontro` (`create-event`), `Divulgar meu negócio` (`my-biz`) | — (nenhuma mensagem própria) | Item escolhido fecha o menu e abre o overlay/rota correspondente; fecha por `Esc`, clique no `#create-scrim` ou navegação (`create-menu.js:72-75`) | 2.3.1 (aparece sobre todas) |
| 22. Pedir indicação — `openAsk` (`features/community/editor.js:1`) | diálogo (editor) | `ask` (`home/views.js:25`; `community/views.js:1,7`; `shell/paged-list.js:45`) → `handlers.js:129`; `ask-from-search` (`search/views.js:23`) → `:130` | `ask-input` "Sua pergunta" `type="textarea" rows="3" required minlength="8" maxlength="300"` supporting-text `"Inclua o que você precisa e o bairro, se fizer diferença."`; abaixo, `#ask-similar` preenchido por `updateSimilar()` (160 ms após digitar, `bindings.js:17`) com até 2 perguntas resolvidas | `Cancelar` (`close-dialog`, texto); `Publicar pergunta` (`submit-ask`, preenchido, `send`) | `"Escreva uma pergunta com um pouco mais de contexto."` (menos de 8 caracteres **ou** menos de 2 termos úteis, `editor.js:3`); `"Uma resposta já pode ajudar"`; `"Nenhuma pergunta resolvida com esses termos. Sua pergunta pode ajudar a próxima família."`; nota `"Sua pergunta aparece para a comunidade de {homeCity}."`; sucesso → `"Pergunta publicada"` | `submitAsk` cria a pergunta no topo de `state.asks`, fecha, navega `pergunta/{id}` e chama `askPushSoon('ask')`; fechar com edição pendente cai na confirmação 15 | 2.3.2 |
| 23. Menu ⋮ da pergunta / da resposta — `question-menu` / `answer-menu` (`features/community/manage.js:51`, `:61`); também o ⋮ da barra por `questionTopActions()` (`manage.js:11`) | menu | `question-menu` (`community/question.js:4`) → `manage.js:51`; `answer-menu` (`question.js:6`) → `manage.js:61` (só quando `q.mine && q.city===state.homeCity && canPost()`, `manage.js:50`) | — | Pergunta: `Editar pergunta` (`edit-question`), `Reabrir pergunta` (`refresh`) ou `Marcar como resolvida` (`check_circle`, `toggle-question`), `Compartilhar` (`share`, valor `pergunta\|id`), `Excluir pergunta` (`delete-question`, item `danger`). Resposta: `Editar resposta` (`edit-answer`), `Excluir resposta` (`delete-answer`, item `danger`) | — | Item escolhido executa a ação e fecha o menu (por `Esc`/clique no fundo) | 2.3.3 |
| 24. Editar pergunta / Editar resposta — `openTextEdit` (`manage.js:12`) | diálogo | `edit-question` (`manage.js:51`) → `manage.js:52`; `edit-answer` (`manage.js:61`) → `:62` | `edit-text` `type="textarea" rows="4"` — pergunta `required minlength="8" maxlength="2000"`, rótulo `"Sua pergunta"`; resposta `minlength="3"`, rótulo `"Sua resposta"` | `Cancelar` (texto); `Salvar` (`save-question`/`save-answer`, preenchido, `check`) | `"Escreva uma pergunta com um pouco mais de contexto."` (pergunta: <8 caracteres ou <2 termos úteis) / `"Escreva uma resposta com um pouco mais de contexto."` (<5); texto inalterado apenas fecha; sucessos `"Pergunta atualizada."` / `"Resposta atualizada."` | `save-question` (`manage.js:53`) / `save-answer` (`:63`) gravam, fecham o diálogo e avisam | 2.3.3 |
| 25. Excluir pergunta — `confirm` (`manage.js:55-56`) | confirmação | `delete-question` (`manage.js:51`) → `manage.js:55` | — | `Cancelar` (texto); `Excluir` (danger) | `"Excluir pergunta?"`; texto: `"A pergunta e a resposta saem da comunidade. Isso não pode ser desfeito."` (1 resposta) / `"A pergunta e as {n} respostas saem da comunidade. Isso não pode ser desfeito."` / `"A pergunta sai da comunidade. Isso não pode ser desfeito."` (sem respostas); sucesso → `"Pergunta excluída."` (`delete`) | `removeQuestion` (`manage.js:33-37`): remove de `state.asks`, limpa `lastViewed`, apaga o vínculo `alsoCity`, força `communityTab='ind'`, navega `comunidade` com `replace` | 2.3.3 |
| 26. Excluir resposta — `confirm` (`manage.js:65`) | confirmação | `delete-answer` (`manage.js:61`) → `manage.js:65` | — | `Cancelar` (texto); `Excluir` (danger) | `"Excluir resposta?"` / `"Ela sai desta pergunta. Isso não pode ser desfeito."` + `" A pergunta volta a ficar sem solução."` (quando era a solução); sucesso → `"Resposta excluída."` | Remove a resposta, fecha o diálogo e redesenha | 2.3.3 |
| 27. Menu ⋮ de conteúdo de outra pessoa — `otherMenu` (`features/profile/blocks.js:40`) | menu | `question-other-menu`/`answer-other-menu` (`community/question.js:4,6`) → `blocks.js:51-52`; `post-other-menu`/`comment-other-menu` (`groups/views.js:87,122`) → `blocks.js:54,56` (também pelo gesto de deslizar, `motion/gestures.js:40`) | — | `Ocultar pergunta` (`hide-question`, só na pergunta); `Denunciar {o quê}` (`report`, `data-value="ask\|id"`, `"answer\|…"`, `"post\|{gid}~{pid}"`, `"comment\|{gid}~{pid}~{cid}"`); `Bloquear {nome}` (`block-person`) quando `blockable(name) && !isBlocked(name)` | `aria-label` no padrão `` `Ações d${what === 'comentário' ? 'o' : 'a'} ${what}` `` → ex. `"Ações da pergunta"`, `"Ações da resposta"` | Item escolhido executa a ação (ocultar/denunciar/bloquear) e fecha o menu | 2.3.3, 2.4.1 |
| 28. Bloquear pessoa — `confirm` (`features/profile/blocks.js:25-28`) | confirmação | `block-person` (`community/question.js:9`; `listings/detail.js:9`; `blocks.js:41`; `messaging/actions.js:53`; `messaging/views.js:11`) → `blocks.js:46` | — | `Bloquear` (`ok`) e `Cancelar` (`cancel`) | `"Bloquear {nome}?"` / `"Você deixa de ver as perguntas, respostas, anúncios e mensagens dele\|dela, e ele\|ela não consegue mais falar com você.\\nEle\|Ela não é avisado\|avisada. Você pode desbloquear em Configurações."`; sucesso → `"{nome} bloqueado\|bloqueada."` **com desfazer** (`blocks.js:36`) | `setBlocked(name,true)`, limpa `blockPeek` e redesenha; desbloquear (`unblock-person`, `:47`) avisa `"{nome} desbloqueado\|desbloqueada."` **sem desfazer** | 2.5.6 |
| 29. Origem da indicação — `answer-origin` (`app/handlers.js:138`) | diálogo | `answer-origin` (`community/question.js:6,8`) → `handlers.js:138` | — (cartão da pergunta `class="choice"`, texto da resposta e negócio marcado com `open-biz`) | `open-biz` (negócio marcado); `Fechar` (`close-dialog`) | Nota `"Relato de exemplo preservado no arquivo da cidade."` quando `q.demo \|\| q.fromMemory` | Sem `originQuestion`, navega para a outra pergunta; senão o diálogo fecha normalmente | 2.3.3 |
| 30. Menu de ações do grupo — `group-menu` → `openCreate(el, …, false, 'Ações do grupo')` (`features/groups/handlers.js:8`) | menu | `group-menu` (`groups/views.js:102`, botão `"Participando · {rótulo do nível de aviso}"`) → `handlers.js:8` | — | `Avisos: Tudo` / `Avisos: Destaques (padrão)` / `Avisos: Nada` (`notif-level`, valor `"{gid}\|{chave}"`, ícone `check` no nível atual, descrição de `NOTIF`); `Sair do grupo` (`leave-group`, subtítulo `"Suas publicações continuam no grupo"`) | Descrições `NOTIF` (`presets.js:12`): `"Toda publicação do grupo"`, `"Respostas a você, eventos e aviso fixado"`, `"As publicações aparecem só na Início"`; troca de nível avisa `"Avisos do grupo: {rótulo}"` | `notif-level` grava `g.notif` e redesenha; `leave-group` abre a confirmação 35 | 2.4.1 |
| 31. Criar grupo — `openGroupCreator` (`features/groups/editors.js:22-28`) | diálogo | `create-group` (`community/views.js:1`; `groups/views.js:73`) → `groups/handlers.js:16` | `group-name` "Nome do grupo" `required minlength="3" maxlength="60"` supporting-text `"Ex.: Moradores do Residencial X, Pais da Escola Y"`; `group-about` "Sobre o grupo" `textarea rows="2" maxlength="300"`; capacitador "Modelo" com chips de todos os `GTPL` exceto `turma` (`group-tpl`); capacitador "Privacidade" com radios `gprivacy` (`"Aberto"` = `"Qualquer membro de {cidade} entra com um toque e vê as publicações."`; `"Fechado"` = `"Quem quiser entrar pede, e você aprova. Só membros veem as publicações."`); `group-rules` "Regras do grupo" `textarea rows="3" maxlength="600"` | `Cancelar`; `Criar grupo` (`submit-group`) | Nota `"Quem cria administra o grupo e pode nomear moderadores. Todos os membros do Bivaque são verificados."`; erros `<3` letras → `"Dê um nome ao grupo, com pelo menos 3 letras."`; nome repetido → `"Já existe um grupo com esse nome. Busque e entre nele."`; sucesso → `"Grupo criado. Convide as primeiras pessoas pelo WhatsApp."` | `submit-group` (`handlers.js:18`) cria o grupo e navega para ele; trocar de modelo troca as regras só se não editadas (`editors.js:24`) | 2.4.1 |
| 32. Gerenciar grupo — `openManage` (`features/groups/editors.js:30-34`) | diálogo | `manage-group` (`groups/views.js:102`, só `role==='admin'`) → `handlers.js:12` | `mod-add` "Nomear moderador" (`Escolher membro` + `Paulo R.`, `Diego F.`, `Marcos T.`, `Luana M.`); `manage-privacy` "Privacidade"; `manage-pinned` "Aviso fixado" `textarea rows="2" maxlength="300"`; `manage-rules` "Regras" `textarea rows="3" maxlength="600"`; `manage-offers` switch "Permitir Oferta de negócio de membro" | `Aprovar` (`approve-req`, valor `"{gid}\|{índice}"`) e `Recusar pedido` (`deny-req`, `close`); `Nomear` (`add-mod`); `Encerrar o grupo` (`close-group`, texto perigoso) ou `Reabrir o grupo` (`reopen-group`); `Fechar`; `Salvar` (`save-manage`) | `"Nenhum pedido agora."` / `"Nenhum moderador."`; `"Uma por semana, sempre com o rótulo Oferta. Patrocinado nunca aparece no grupo."`; `"As publicações ficam só para leitura por 30 dias."`; `"Encerrado em {dd/mm}. As publicações ficam disponíveis para leitura até {dd/mm}."` / `"O prazo para reabrir já passou."`; erros `"Escolha um membro."`; sucessos `"{nome} agora faz parte do grupo"`, `"Pedido recusado"`, `"Grupo atualizado"` | `save-manage` (`:15`) grava aviso fixado/regras/ofertas/privacidade; `close-group` abre a confirmação 36; `reopen-group` (`:46`) reabre dentro do prazo | 2.4.1 |
| 33. Publicar no grupo — `openPostEditor` (`features/groups/editors.js:6-20`) | diálogo (editor) | `new-post` (`groups/views.js:109`) e `new-post-empty` (`:112`) → `handlers.js:19`; `post-type` (`editors.js:11`) → `handlers.js:20` | `post-type` (tipo do rascunho — `post`/`question`/`event`/`poll`/`offer`); demais campos do editor em `editors.js:6-20` — **ids não enumerados no relatório de área (não verificado)**; o editor espelha os rótulos do `edit-post` (evento: `"Nome do evento"`, `"Local (público)"`; enquete: `"Opção N (opcional)"`; pergunta: `"O que você quer perguntar?"`) e, em pergunta, a opção `"Também perguntar à cidade"` (`handlers.js:30`) | `Cancelar`; `Publicar` (`submit-post`) | Mensagens de `submit-post` (`handlers.js:21-31`), por ordem: `"Este grupo não aceita ofertas de negócio agora."`; `"Você já fez uma oferta neste grupo esta semana. Pode fazer outra em {dd/mm às hh:mm}."`; evento `<3` → `"Dê um nome ao evento."`, demais `<5` → `"Escreva pelo menos 5 caracteres."`; `"Informe a data e o local do evento."`; `"A enquete precisa de pelo menos 2 opções."`; sucessos `"Publicado no grupo"`, `"Oferta publicada no grupo"`, `"Publicado no grupo e enviado à cidade"` (pergunta replicada) | `submit-post` (`:21`) publica, volta o filtro para `all` e, em pergunta replicada, cria entrada em `state.asks` com `ctx: "Também perguntada em {grupo}"` | 2.4.1 |
| 34. Interesses — `openInterests` (`features/groups/editors.js:41`) | diálogo | `edit-interests` (`groups/views.js:79,80`) → `groups/handlers.js:39` | Chips `interest-toggle` de `INTERESTS` (`presets.js:11`: Filhos pequenos, Pets, Corrida, Ciclismo, Concursos e preparatórios, Culinária, Futebol, Fé) | `Cancelar`; `Salvar` (`save-interests`) | `"Marque até 3. Usamos isso só para sugerir grupos."`; contador `"{n}/3 escolhidos. Você pode mudar depois em Comunidade › Grupos."`; no 4º → `"Escolha até 3 interesses."`; sucesso → `"Sugestões de grupos atualizadas"` | `save-interests` (`:41`) grava, volta para a aba Grupos e avisa | 2.3.2, 2.4.1 |
| 35. Sair do grupo — `confirm` (`features/groups/handlers.js:10`) | confirmação | `leave-group` (menu 30) → `handlers.js:10` | — | Padrão de `confirm` | `"Sair do grupo?"` / `"Suas publicações continuam no grupo. Você pode entrar de novo quando quiser."`; admin sem moderador → `"Nomeie um moderador antes de sair. Ele assume o grupo."`; sucesso → `"Você saiu do grupo"` | Confirmação, depois saída do grupo e redesenho | 2.4.1 |
| 36. Encerrar o grupo — `confirm` (`features/groups/handlers.js:45`) | confirmação | `close-group` (`editors.js:38`) → `handlers.js:45` + `closeGroup` (`:2`) | — | `Encerrar` (`ok`) e `Cancelar`; `danger` | `"Encerrar o grupo?"` / `"Ninguém publica, comenta, vota nem cria encontro. As publicações ficam só para leitura por 30 dias."`; sucesso → `"Grupo encerrado. As publicações ficam para leitura até {dd/mm}."` | Grava `closedAt` (`GROUP_CLOSE_DAYS=30`) e redesenha | 2.4.1 |
| 37. Editar publicação — `openPostEdit` (`features/community/manage.js:14-20`) | diálogo | `post-menu` → `Editar {publicação\|pergunta\|enquete\|encontro}` → `edit-post` (`manage.js:73`) → `manage.js:14` | `edit-text` (rótulos `"O que você quer compartilhar?"`, `"O que você quer perguntar?"`, `"Nome do evento"`, `"Pergunta da enquete"`; `maxlength="120"` em evento, senão `textarea rows="4" maxlength="2000"`); em evento `edit-date`, `edit-time` e `edit-place` `"Local (público)"` `maxlength="120"`; em enquete sem votos `edit-opt-0`…`edit-opt-3` `"Opção N (opcional)"` `maxlength="60"` | `Cancelar`; `Salvar` (`save-post`) | `"Se a data, o horário ou o local mudarem, a pessoa que confirmou será avisada."`; com votos: `"Esta enquete já tem votos. Só o texto da pergunta muda; as opções ficam como estão."` | `save-post` (`manage.js:19`) grava e redesenha | 2.4.2 |
| 38. Editar resposta/comentário — `openTextEdit` (`features/community/manage.js:12`) | diálogo | `comment-menu` → `Editar …` → `edit-comment` (`manage.js:84`) → `manage.js:12` | `edit-text` rótulo `"Sua resposta"`/`"Seu comentário"`, `textarea rows="4" required minlength="3" maxlength="2000"` | `Cancelar`; `Salvar` (`save-comment`) | Erro nativo do `required`/`minlength` (mensagem do navegador) | `save-comment` (`manage.js:86`) grava e redesenha | 2.4.2 |
| 39. Excluir publicação/comentário — `confirm` (`manage.js:77-78`, `:87`) | confirmação | `delete-post` (`manage.js:73`); `delete-comment` (`manage.js:84`) | — | Padrão de `confirm` | Por tipo: evento → `"Cancelar encontro?"` / `"O encontro sai do grupo.{aviso de convidados}"`; demais → `"Excluir {enquete\|pergunta\|publicação}?"` / `"A {enquete\|pergunta\|publicação} e {N comentário(s)} saem do grupo."` (+ `" A pergunta enviada à cidade continua em Indicações."`) + `"Isso não pode ser desfeito."`; sucessos `"Encontro cancelado.{…}"`, `"Enquete excluída."`, `"Pergunta excluída."`, `"Publicação excluída."` | Em `publicacao` a rota volta para o grupo (`manage.js:41`); nos demais redesenha | 2.4.2 |
| 40. Menu da publicação / do comentário — `post-menu` / `comment-menu` (`features/community/manage.js:73`, `:84`) | menu | `post-menu` (`groups/views.js:87`) → `manage.js:73`; `comment-menu` (`groups/views.js:122`) → `manage.js:84` | — | `Editar {publicação\|pergunta\|enquete\|encontro}` / `Excluir …` (`manage.js:77-78`); `Editar resposta\|comentário` / `Excluir …` (`:87`) | — | Item escolhido abre o diálogo 37/38 ou a confirmação 39 | 2.4.2 |
| 41. Editor de encontro — `openEventEditor` (`features/events/editor.js:1`, kind `editor`) | diálogo (editor) | `create-event` (`events/views.js:14`; `create-menu.js:12,27`; `command-palette.js:6`) → `handlers.js:33`; `edit-event` (`events/views.js:18`; `home/desktop.js:59`) → `:34` | `event-title` "Nome do encontro" `required minlength="5" maxlength="100" class="full"`; `#event-date` "Data" `type="date" min="{hoje}"` valor `dateISO(1)` `required`; `#event-time` "Horário" `type="time"` padrão `09:00` `required`; `event-place` "Local" `required minlength="4" maxlength="160"`; `event-max` "Número de vagas (opcional)" `type="number" min="1" max="10000"`; `event-desc` "Sobre o encontro" `textarea rows="3" required minlength="12" maxlength="2000"` | `Cancelar`; `Publicar encontro`/`Salvar alterações` (`submit-event`) | Erros na ordem (`events/editor.js:2`): `"O nome do encontro precisa de pelo menos 5 letras."`, `"Informe a data do encontro."`, `"A data do encontro precisa ser hoje ou depois."`, `"Informe o horário do encontro."`, `"Descreva o encontro com pelo menos 12 caracteres."`, `"O limite não pode ser menor que as presenças confirmadas."`; antes, `required`/`minlength` por `validFields` (nativo); sucesso `"Encontro publicado"` ou `"Encontro atualizado.{aviso de convidados}"` (`guestsNote`) | Novo encontro entra como `{mine:true, on:true, going:1, city:state.homeCity}` e navega para `evento`; digitação marca `editorDirty` e fechar passa pela confirmação 15 | 2.4.3, 2.4.4 |
| 42. Cancelar encontro — `confirm` (`app/handlers.js:37`) | confirmação | `delete-event` (`events/views.js:19`; `home/desktop.js:59`) → `handlers.js:37` | — | `Cancelar encontro` (`ok`) e `Voltar` (`cancel`) | `"Cancelar encontro?"` / `"“{título}” sairá da agenda da cidade.{aviso de convidados}"`; sucesso → `"Encontro cancelado.{…}"` **com Desfazer** (`notify(..., 'event_busy', …)`), que devolve o encontro à lista | Remove o encontro de `state.events`; Desfazer recompõe | 2.4.4, 2.4.3 |
| 43. Simulação de moderação — `openModeration` | diálogo | `simulate-moderation` (`features/profile/settings.js:6`, botão "Simular decisão do moderador") → `features/groups/handlers.js:42` → `openModeration` | Campos/mensagens **não lidos** nesta leitura (o relatório de área D registra o gatilho e a função, não o conteúdo — **não verificado**) | `moderation-approve` e `moderation-deny` (`handlers.js:43`) aprovam/recusam, avisam e criam aviso local em `state.notices` (com `go:['grupo', g.id]`), redesenha o diálogo | Não verificado | `moderation-approve`/`moderation-deny` (`:52` → `:43`) | 2.10.1 (gatilho em 2.5.1) |
| 44. Configurações — `openSettings` (`features/profile/settings.js:5`, kind `editor`) | diálogo (editor) | `settings` (`profile/views.js:6`; `shell/navigation.js:65`) → `handlers.js:69`; também por `family-settings` (`demo-actions.js:52`) | `profile-name` "Seu nome" `required maxlength="80" autocomplete="name"`; `appearance-select` "Aparência" (`Automática`/`Clara`/`Escura`); `profile-hood` "Seu bairro (opcional)" (busca de bairro, `maxlength="60" autocomplete="off"`, placeholder `"Digite o bairro ou o CEP"`); `privacy-hood` switch "Mostrar meu bairro" (`aria-label="Mostrar meu bairro"`, apoio `"Desligado, só a cidade aparece no que você publica."`); `privacy-family` switch "Convites de família" (`aria-label="Permitir convites de família"`) | `Cancelar` (`close-dialog`); `Salvar` (`save-settings`, preenchido); links `open-hidden` (`"Ocultados"`), `open-blocked` (`"Pessoas bloqueadas"`), `open-legal` `privacidade`/`conduta`, `support-open` `ajuda`; linha de perigo `support-open` `apagar-conta` (`"Apagar a conta"`) | `"Informe um nome com pelo menos 3 letras."`; `"Escolha o bairro na lista. O CEP não fica salvo."`; validação nativa por `validFields(['profile-name'])`; nota `"Dados de exemplo e alterações ficam neste dispositivo. Verificação de identidade, envio de avisos e cobrança estão no modo teste."`; sucesso → `"Configurações salvas"` | `save-settings` (`handlers.js:70`) grava `profile.name`, `profile.hood` e `prefs.{appearance,showHood,familyOnly}`, fecha e redesenha | 2.5.1 |
| 45. Controles do protótipo — `openPrototype` (`features/profile/settings.js:6`, kind `prototype`, gaveta lateral) | painel (gaveta `translateX`, único `kind` que não aceita arrasto, `shell/dialogs.js:27,33`) | `prototype` (`profile/views.js:6`; `shell/navigation.js:65`) → `handlers.js:71` | `prototype-stage` "Estágio da cidade" (`Cidade ativa`/`Cidade começando`); `prototype-incoming` "Famílias com transferência declarada" `type="number" min="0" max="10000"`; `prototype-portal` "Resultado da consulta do CPF (entrada)" (`Vínculo confirmado`/`Vínculo não localizado`/`Em análise`/`Fonte fora do ar`); `verified-test` switch "Verificação de teste" (`aria-label="Perfil de teste verificado"`) | `Aprovar a análise pendente` (`entry-approve`, outlined, só quando `state.entry?.eligibility==='pending'`); `Ver como dono do Bivaque` (`owner-open`); `Ver a entrada do zero` (`onboarding`); `Simular resposta a uma pergunta` (`simulate-answer`); `Simular resposta na conversa` (`simulate-message`); `Simular anúncio para um alerta` (`simulate-alert`); `Simular decisão do moderador` (`simulate-moderation`); `Simular propostas de prestadores` (`simulate-proposals`); `Simular contato no meu negócio` (`simulate-biz-contact`, condicional); `Simular resposta do suporte` (`support-simulate`); `Recomeçar do zero` (`reset-prototype`, texto); `Aplicar` (`apply-prototype`, preenchido) | Nota `"Dados fictícios para testar as jornadas. Você pode publicar e editar exemplos; nenhuma mensagem é enviada para pessoas reais."`; linha de status `"Material Web oficial · 2.5.0"` + `"Componentes oficiais carregados e incorporados ao HTML."`/`"Falha ao carregar os componentes."`; nota `"As respostas de exemplo usam o assunto da pergunta. Se não houver uma indicação relacionada, o protótipo não inventa uma resposta."`; confirmações 78/79; sucessos `"Cenário atualizado"`, `"Permissão de teste atualizada"`, `"Protótipo reiniciado"`, `"Análise aprovada (modo teste)."` | `apply-prototype` (`:72-76`) troca cenário (com confirmação) ou grava `verified`/`incoming`/`test.portal`; `reset-prototype` (`:77`) recria `initial()` e limpa toasts | 2.5.1 |
| 46. Família convidada — `openFamily` (`features/profile/demo-actions.js:2`) | folha (kind `generic`) | `family` (`profile/views.js:6`) → `demo-actions.js:51` | `invite-name` "Nome fictício do familiar" `required minlength="2" maxlength="80" autocomplete="off"`; `invite-email` "E-mail do familiar" `type="email" required autocomplete="off"` supporting-text `"O convite vale só para este e-mail, por 7 dias."`; fallback de cópia: `invite-copy` "Copie o código local" (readonly, já com o código) | `Fechar` (`close-dialog`); `Criar convite` (`new-invite`, preenchido, `person_add`); `Abrir Configurações` (`family-settings`, quando convites desligados); por linha `copy-invite` (`"Copiar convite"`) e `remove-invite` (`"Revogar convite"`) | Áreas vivas `#family-status` e `#family-copy`; portão `profileFamilyAllowed`: `"Convites de família são criados por quem é militar, veterano ou pensionista."`, `"Volte à sua cidade, {homeCity}, para criar ou revogar convites locais."`, `"Verifique o perfil de teste antes de criar ou revogar convites locais."`; desligado → `"Os convites locais estão desativados nas suas Configurações. Ative “Convites de família” para criar um código de demonstração."`; erros `"Use um nome fictício entre 2 e 80 caracteres."`, `"Informe o e-mail do familiar."`/`"Informe o e-mail do familiar: o convite vale só para ele."`, `"Não foi possível criar um código único. Tente novamente."`, `"Não foi possível salvar o convite. O nome foi mantido; libere espaço e tente novamente."`, `"Este código não está disponível para copiar."`, `"Este convite foi utilizado ou não está mais disponível."`, `"Não foi possível revogar o código. Ele permanece disponível."`, `"A cópia automática falhou. Selecione o código abaixo e copie manualmente."`; sucessos `"Código de demonstração criado apenas neste navegador."`, `"Código local copiado. Ele funciona apenas neste navegador."`, `"Código local revogado. Nenhum convite real foi enviado."` | `new-invite` (`:53-61`) gera `"DEMO-" + 8 hex`, redesenha e avisa; `copy-invite` (`:63-68`) copia; `remove-invite` (`:69-75`) confirma (overlay 77) e remove | 2.5.1 |
| 47. Planos para o negócio — `openPlans` (`features/profile/demo-actions.js:1`) | diálogo (kind `generic`) | `plans` (`businesses/detail.js:28` "Conhecer os planos"/"Planos (em breve)"; `plans.js:32` no diálogo de limite; `plans.js:59` em `planBoost`) → `handlers.js:125` | Sem `paidPlans()`: nenhum campo. Com `window.BIVAQUE_LABS={paidPlans:true}`: `md-radio name="plan"` — `free` `"Grátis · R$ 0"`, `moment` `"Destaque de momento · R$ 9,90 / semana"`, `plan` `"Plano do negócio · R$ 39 / mês"` (`aria-label` = só o título) | Sem `paidPlans()`: `Entendi` (`close-dialog`, preenchido). Com `paidPlans()`: `Cancelar` (`close-dialog`) e `Ativar no modo teste` (`activate-plan`) | Sem `paidPlans()`: `"No lançamento, a página do negócio é gratuita e completa: aparece para toda a cidade, recebe indicações e conversa sem limite."` e `"Planos pagos vêm depois, sempre identificados. A ordem das indicações da comunidade nunca é vendida."`; com `paidPlans()`: `"Compare os benefícios. Nesta versão você ativa um plano de teste; nenhum pagamento é realizado."`, `"Neste mês: {planConvoText()}. {planSpotText()}."`, `"Pagar não altera a ordem das indicações da comunidade."`; `planActivate` (`plans.js:49,53`): `"Crie ou reative a página do negócio antes de ativar um plano."`, `"Plano grátis selecionado. O destaque terminou e sua página saiu de Patrocinado."`, `"Plano grátis selecionado"`, `"Plano de teste ativado. Nenhum pagamento realizado. Sua página aparece em Patrocinado até {dd/mm}."`, `"Plano de teste ativado. Nenhum pagamento realizado. Restam {N} destaques neste mês."`, `"Plano de teste ativado. Nenhum pagamento realizado."` | `activate-plan` (`:72`) grava `state.subscription` (tier, `spot` de 7 dias no `moment`), fecha e avisa; `biz-boost` (`:73`) destacaria por 7 dias | 2.6.2 |
| 48. Limite de conversas novas — `planLimitDialog` (`features/businesses/plans.js:32`, kind `plan-limit`) | diálogo | `planReplyGate(t)` (`messaging/actions.js:40`) e `planCountReply` (`:42`) — dispara ao enviar a **primeira** mensagem de uma conversa da própria página, com `paidPlans()` e `tier!=='plan'` e 5 respostas novas no mês | — | `Agora não` (`close-dialog`, texto); `Conhecer os planos` (`plans`, preenchido, `trending_up`) | `"Você já respondeu 5 conversas novas neste mês. As conversas que você já respondeu continuam livres. As novas voltam em {dia}, ou agora com o Plano do negócio, que não tem limite."` | `plans` abre o overlay 47; `Agora não` fecha e mantém o texto no campo | 2.8.2 |
| 49. Editor de página do negócio — `openBusinessEditor` (`features/businesses/editor.js:1`, kind `editor`) | diálogo (editor) | `my-biz` (`businesses/catalog.js:1` "Minha página"; `create-menu.js:13,23,28`; `home/views.js:27`; `home/desktop.js:15`; `profile/views.js:6`) → `handlers.js:110`; `edit-biz` (`businesses/detail.js:3,15`) → `:111` | `biz-name` "Nome do negócio" `required minlength="3" maxlength="100" class="full"`; `biz-category` "Tipo de serviço" `required` (13 `GROUP_NAMES`); `biz-hours` "Horário ou agendamento" `required maxlength="100"`; `#biz-specs` "Especialidades (opcional)" (chips); `biz-hoods-entry` "Bairros em que atende" (chips + entrada, `maxlength="60"`, hint `"Digite um bairro e toque Enter."`); `biz-services-entry` "Serviços" (`maxlength="60"`, hint `"Digite um serviço e toque Enter."`); `biz-bio` "Apresentação" `textarea rows="3" maxlength="1500" class="full"`; `biz-discount` "Benefício para a comunidade (opcional)" `maxlength="120" class="full"`; `biz-whatsapp` "WhatsApp (opcional)" `type="tel" inputmode="tel" autocomplete="tel"`; `biz-instagram` "Instagram (opcional)" (hint `"Nome do perfil, sem @."`); `biz-website` "Site (opcional)" `type="url" class="full"`; `#upload-photos` "Fotos" `accept="image/jpeg,image/png,image/webp,image/avif" multiple` `"Até 6 imagens"` | `Cancelar` (`close-dialog`, texto); `Criar minha página`/`Salvar alterações` (`submit-biz`, preenchido) | Notas `"Sem marcar nenhuma, você recebe pedidos de todo o grupo."`, `"A primeira foto será a capa. Você pode remover e adicionar outras imagens."`; erros na ordem (`editor.js:2`): `"Confira o DDD e o número do WhatsApp."`, `"Informe o nome válido do perfil do Instagram."`, `"O site deve começar com https:// ou http://."`, `"Escolha o tipo de serviço do negócio."`, `"Bairro com CEP: escreva só o nome do bairro. O CEP não fica salvo."`, `"Adicione pelo menos um bairro."`, `"Adicione pelo menos um serviço."`; antes, `validFields(['biz-name','biz-category','biz-hours','biz-website'])` (nativo); sucessos `"Página criada"` / `"Página atualizada"` | `submit-biz` (`:2`) grava `state.myBiz`, fecha navegando para a página e avisa; fechar com edição pendente cai na confirmação 15; mudar `biz-category` reescreve `#biz-specs` com `specChips(novo,[ ])` | 2.6.1, 2.6.2 |
| 50. Indicar um negócio — `openIndicate` (`features/businesses/indication.js:1`, kind `editor`) | diálogo (editor) | `indicate` (`businesses/catalog.js:1` "Indicar um negócio"; `create-menu.js:11,26`; `command-palette.js:6`) → `handlers.js:117` | `ind-name` "Nome do negócio" `required minlength="3" class="full"`; `ind-category` "Tipo de serviço" `required` (13 `GROUP_NAMES`); `ind-hood` "Bairro" (busca de bairro, `required` quando a cidade tem base); `ind-why` "Por que você indica?" `required minlength="12" class="full"` | `Cancelar` (`close-dialog`, texto); `Publicar indicação` (`submit-indicate`, preenchido, `thumb_up`) | Nota `"A página nasce com a sua indicação. O responsável poderá completar as informações depois."`; erros `"Escolha o tipo de serviço do negócio."` e `hoodProblem` (`"Escolha o bairro."` / `"Escolha o bairro na lista. O CEP não fica salvo."`); duplicata → fecha, navega à página existente e avisa `"Você já indicou este negócio."`; sucessos `"Negócio indicado"` / `"Sua indicação foi adicionada"` | `submit-indicate` (`:2`) cria ou reforça o negócio (`recN++`, `myInd=true`, `says.push`) e navega para ele | 2.6.1 |
| 51. Menu ⋮ "Ações da página" — `ownBizAction` (`features/businesses/detail.js:13`) → `openCreate(el, choices, false, 'Ações da página')` (`create-menu.js:17`) | menu | `biz-menu` (`businesses/detail.js:3`, `b.mine`) → `handlers.js:112` → `detail.js:13` | — | `Editar página` (`edit-biz`); `Pausar página`/`Reativar página` (`pause-biz`/`resume-biz`, apoio `"Sai da busca e do catálogo"` = `BIZ_PAUSE_NOTE`); `Excluir página` (`delete-biz`, `danger`) | `aria-label` `"Ações da página"`; teclado `Tab`/`↑`/`↓`/`Home`/`End`/`Esc` (`create-menu.js:73-83`) | `edit-biz` abre 49; pausar/reativar (`detail.js:16`) grava `b.paused` e avisa `"Página pausada. Ela saiu da busca e do catálogo."` / `"Página reativada. Ela voltou ao catálogo e à busca."`; excluir abre 52 | 2.6.2 |
| 52. Excluir página do negócio — `confirm` + `deleteMyBiz` (`businesses/detail.js:17`, `:23`) | confirmação | `delete-biz` (menu 51) → `handlers.js:112` → `detail.js:17` | — | `Excluir` (`ok`) e `Cancelar` (`cancel`), `danger` | `"Excluir página?"` / `"A página sai do Bivaque. As propostas abertas saem dos pedidos e os clientes deixam de vê-las. Isso não pode ser desfeito."`; sucesso → `"Página excluída. As propostas abertas saíram dos pedidos."` (ícone `delete`), **sem desfazer** | `deleteMyBiz`: `bizLeaveRequests` marca propostas `withdrawn`, guarda `bizSuspended` se suspensa, apaga `spot`, zera `state.myBiz` e vai para `voce` com `replace` | 2.6.2 |
| 53. Assumir página no modo teste — `claim-biz` (`app/handlers.js:120`) / `confirm-claim` (`:121`) | diálogo | `claim-biz` (`businesses/detail.js:5`, `"Sou o responsável"`) → `handlers.js:120` | `claim-name` "Seu nome" valor inicial `state.profile.name` `required minlength="3" autocomplete="name"` | `Cancelar` (texto); `Assumir no modo teste` (`confirm-claim`, preenchido) | Nota `"Esta ação simula a confirmação do responsável. Na versão de produção, a propriedade precisará ser validada antes de editar a página."`; se já há página → `"Você já tem uma página. Abra “Meu negócio” para editar."`; sem erro próprio — nome curto barrado pelo `reportValidity()` nativo | `confirm-claim` (`:121`) cria `state.myBiz` a partir do negócio (`owner:"{nome} · responsável de teste"`), remove de `state.biz`, e abre o editor 49 | 2.6.2 |
| 54. Indicar este negócio — `recommend-biz` (`app/handlers.js:115`) / `submit-recommend` (`:116`) | diálogo | `recommend-biz` (`businesses/detail.js:3,5`) → `handlers.js:115` | `recommend-why` "Conte sua experiência" `type="textarea" rows="3" required minlength="12"` | `Cancelar` (texto); `Publicar indicação` (`submit-recommend`, preenchido, `data-value={id}`, **sem ícone**) | `"Você já indicou este negócio."` (info, antes de abrir); sem erro próprio (texto curto barrado pelo validador do campo); sucesso → `"Sua indicação foi adicionada"`, com `haptic(18)` e `celebrate` | `submit-recommend` (`:116`) faz `b.recN++`, `b.myInd=true`, `b.says.push`, fecha, `render()` | 2.6.2 |
| 55. Copiar texto (fallback de cópia) — `copyText` (`features/messaging/actions.js:99`) | diálogo | Fallback de `invite-owner` (`handlers.js:119`), `copy-invite` (`demo-actions.js:63`) e `share` (`messaging/actions.js:97`) quando a área de transferência falha | `copy-recovery-text` "Texto para copiar" (F); `invite-copy` "Copie o código local" (`readonly`, já com o código; E) | — (sem botões próprios; o texto fica visível e selecionado) | `"A cópia automática não está disponível. O texto está visível e selecionado; use a opção Copiar do navegador."` (F); `"A cópia automática falhou. Selecione o código abaixo e copie manualmente."` (E) | Fechar (`close-dialog`) | 2.6.2, 2.5.1 |
| 56. Menu de bairro (busca de bairro/CEP) — `hood-picker` (`shell/hood-picker.js:50`) | menu | Foco/digitação nos campos `item-hood` (B, `hood-privacy.js:15`), `profile-hood` (E), `ind-hood` (F), `request-hood` (G) — `hood-picker.js:26` | — (sugestões filtradas até 6; `"Mais escolhidos em {cidade}"` quando vazio; `"Usar “{texto}” como está"`; `"Usar minha localização"` quando a cidade tem base) | Opções de bairro e `"Usar minha localização"` (`hood-picker.js:29`); `role="group" aria-label="Sugestões de bairro"` | `"Escolha o bairro na lista. O CEP não fica salvo."` (`HOOD_CEP_MSG`); `"Continue digitando: o CEP tem 8 números."`; `"CEP não encontrado no modo teste. Digite o nome do bairro."`; `"Esse CEP é de {cidade}. Aqui vale um bairro de {cidade}."`; `"O CEP só serve para achar o bairro e não fica salvo."`; `"Este aparelho não informa a localização. Digite o bairro ou o CEP."`; `"Sua localização não fica em {cidade}. Digite o bairro."`; `"Não deu para usar a localização. Digite o bairro ou o CEP."`; `"{n} sugestão/sugestões. Use as setas para escolher."` | Escolher uma sugestão grava o nome canônico no campo; CEP nunca é gravado (`hoodValue`, `:24`) | 2.2.1 |
| 57. Editor do pedido — `openRequestEditor` (`features/requests/views.js:23`, kind `editor`) | diálogo (editor) | `create-request` (`requests/views.js:5` "Contratar serviço"; `businesses/catalog.js:1` faixa e "Pedir"; `home/views.js:18`; `home/desktop.js:11`; `create-menu.js:8,15,23`; `command-palette.js:6`) → `requests/handlers.js:3` | `request-cat` "Tipo de serviço" `required class="full"`; `request-spec` "Especialidade (opcional)" (só quando o grupo tem especialidades; opção `"Qualquer especialidade"`); `request-hood` "Bairro" (busca de bairro; `required` quando a cidade tem base; `maxlength="60"`; placeholder `"Digite o bairro ou o CEP"`); `request-desc` "O que você precisa" `textarea rows="4" required minlength="20" maxlength="1000"` supporting-text `"Detalhe o serviço. Não informe endereço, documentos ou telefone."`; `request-when` "Quando" (`O quanto antes`/`Até uma data`/`Em uma data específica`); `request-date` "Data" `type="date" min="{hoje}"` (o wrapper `#request-date-wrap` só aparece quando `request-when !== 'asap'`); fotos `photoUploadHtml(4)` (até 4, 12 MB por imagem) | `Cancelar` (`close-dialog`, texto); `Enviar pedido` (`submit-request`, preenchido, `send`) | Pré-checagens: `canPost()`; 3 pedidos abertos → `"Você já tem 3 pedidos abertos. Encerre ou cancele um antes."`; notas `"Seu pedido vai para as empresas do ramo em {homeCity}. Até 5 podem enviar proposta com valor, data e prazo."`, `"Fotos ajudam no orçamento. Evite pessoas, documentos e o número da casa. Só as empresas do ramo veem."`; erros (`handlers.js:12`): `"Escolha o tipo de serviço."`, `"Escolha uma especialidade da lista."`, `"Escolha o bairro."`/`"Escolha o bairro na lista. O CEP não fica salvo."`, `"Descreva o serviço com pelo menos 20 caracteres."`, `"A descrição pode ter até 1000 caracteres."`, `"Informe a data."`, `"A data precisa ser hoje ou depois."`; fotos: `"Use imagens de até 12 MB."`, `"Use imagens JPG, PNG, WebP ou AVIF."`, `"Não foi possível abrir essa imagem. Tente JPG, PNG ou WebP."`; sucesso → `"Pedido enviado às empresas do ramo"` | `submit-request` (`:8-17`) grava o pedido com `expiresAt = agora + 7 dias`, navega para `pedido/{id}` e chama `askPushSoon('request')` | 2.7.1, 2.7.2 |
| 58. Editor da proposta — `openProposalEditor` (`features/requests/views.js:24`, kind `editor`) | diálogo (editor) | `propose` (`requests/views.js:16` "Enviar proposta"; `:9` "Editar proposta") → `handlers.js:55` | `prop-kind` "Valor" (`Valor fixo`/`Faixa de valor`/`A combinar após visita`); `prop-value` "Valor (R$)" `type="number" min="1" max="1000000"` (só `fixed`); `prop-min` "De (R$)" e `prop-max` "Até (R$)" `min="1" max="1000000"` (só `range`); `prop-date` "Disponível a partir de" `type="date" min="{hoje}"`; `prop-valid` "Proposta válida até" `type="date" min="{hoje}"`; `prop-duration` "Prazo de execução" `required maxlength="40"` supporting-text `"Ex.: 1 dia, 2 a 3 dias"`; `prop-msg` "Mensagem para o cliente" `textarea rows="3" required minlength="10" maxlength="400"` | `Cancelar` (`close-dialog`); `Salvar proposta`/`Enviar proposta` (`submit-proposal`, preenchido, `send`) | Pré-checagens silenciosas (`views.js:24`): sai sem abrir se `!r \|\| !state.myBiz?.live \|\| !requestActive(r)`; pedido cheio → `"Este pedido já recebeu 5 propostas."`; validação nativa primeiro em `['prop-duration','prop-msg']`; erros (`handlers.js:60`): `"Informe o valor da proposta."`, `"Informe a faixa: o valor final precisa ser maior que o inicial."`, `"A data disponível precisa ser hoje ou depois."`, `"A validade precisa ser hoje ou depois."`, `"Informe o prazo de execução."`, `"O prazo pode ter até 40 caracteres."`, `"Escreva uma mensagem com pelo menos 10 caracteres."`, `"A mensagem pode ter até 400 caracteres."`; sucessos `"Proposta enviada"`/`"Proposta atualizada"` | `submit-proposal` (`:56-66`) cria ou atualiza a proposta (`status:'sent'`), fecha e avisa | 2.7.2 |
| 59. Escolher esta proposta — `confirm` (`app/handlers.js:23`) | confirmação | `choose-proposal` (`requests/views.js:36`) → `handlers.js:18-26` | — | Padrão de `confirm` (`Continuar`/`Confirmar`) | Texto: `"{empresa} · {preço}. As outras propostas serão recusadas e a conversa com a empresa será aberta. {REQUEST_NOTE}"`; recusas anteriores: `"Esta proposta não está mais disponível."`, `"Esta proposta venceu em {data} e não pode ser escolhida."`, `"{empresa} não está recebendo pedidos agora. Escolha outra proposta."`, `"A página desta empresa não existe mais. Escolha outra proposta."`, `"Esta empresa não está mais recebendo pedidos. Escolha outra proposta."`; sucesso → `"Proposta escolhida. Combine os detalhes na conversa."` | O pedido vira `chosen`, as `sent` viram `declined`, cria a conversa (`ensureThread`) e navega para `conversa/{threadId}` | 2.7.2 |
| 60. Cancelar pedido — `confirm` (`app/handlers.js:52`) | confirmação | `cancel-request` (`requests/views.js:14`) → `handlers.js:50-54` | — | Padrão de `confirm` | `"Cancelar pedido?"` / `"As empresas deixam de ver o pedido e as propostas recebidas são encerradas."`; se já encerrado → `"Este pedido já foi encerrado."`; sucesso → `"Pedido cancelado"` (`close`) | `cancelled`, propostas `sent` → `declined`, `requestDeclinedNotice`, redesenha | 2.7.2 |
| 61. Desistir desta proposta — `confirm` (`app/handlers.js:44`) | confirmação | `give-up-proposal` (`requests/views.js:21`) → `handlers.js:41-49` | — | Padrão de `confirm` | `"Desistir desta proposta?"` / `"{empresa} deixa de ser a escolhida. O pedido volta a receber propostas e as outras propostas ainda válidas voltam à lista."` quando dentro do prazo; senão `"…O prazo do pedido já passou, então ele fica encerrado."`; sucessos `"Proposta desistida. Pedido reaberto com {n} proposta(s) ainda válida(s)."` / `"Proposta desistida. Pedido reaberto: as empresas do ramo podem enviar novas propostas."` / `"Proposta desistida. O prazo do pedido já passou e ele ficou encerrado."` (`undo`) | `gaveup` → pedido volta a `open` com `chosen=null`/`threadId=null`; as `declined` ainda válidas e de página aberta voltam a `sent`; `requestGaveUpNotice` | 2.7.2 |
| 62. Retirar proposta — `confirm` (`app/handlers.js:69`) | confirmação | `withdraw-proposal` (`requests/views.js:9`) → `handlers.js:67-71` | — | Padrão de `confirm` | `"Retirar proposta?"` / `"O cliente deixa de ver sua proposta. Você pode enviar outra enquanto o pedido estiver aberto."`; proposta que não está mais `sent` → `"Esta proposta não pode mais ser retirada."`; sucesso → `"Proposta retirada"` (`undo`) | `status:'withdrawn'`, redesenha | 2.7.2 |
| 63. Menu Ações da conversa — `thread-menu` → `openCreate(el, [...], false, 'Ações da conversa')` (`features/messaging/actions.js:53`) | menu | `thread-menu` (`messaging/views.js:1` na lista; `:12` no cabeçalho; `shell/navigation.js:79` na barra do topo do celular) → `actions.js:52` | — | `Marcar como lida`/`Marcar como não lida` (`thread-unread`); `Soltar conversa`/`Fixar conversa` (`pin-thread`); `Denunciar conversa` (`report`, valor `thread\|{id}`); `Desbloquear {who}`/`Bloquear {who}` (`unblock-person`/`block-person`); `Apagar conversa` (`swipe-delete-thread`, `danger`) | — | `thread-unread` (`:57`) alterna e avisa `"Conversa marcada como não lida"`/`"Conversa marcada como lida"`; `pin-thread` (`:61`) avisa `"Conversa fixada"`/`"Conversa solta"`; `report` abre 13; apagar abre 64 | 2.8.1, 2.8.2 |
| 64. Apagar conversa local — `confirm` (`features/messaging/actions.js:64`) | confirmação | `swipe-delete-thread` (`actions.js:53` e gesto `motion/gestures.js:41`) → `actions.js:64` | — | `Continuar` (`cancel-confirm`, texto) e `Confirmar` (`accept-confirm`, preenchido) | `"Apagar conversa local?"` / `"A conversa ficará oculta neste dispositivo. Você poderá desfazer logo após apagar."`; se a gravação falhar, nada é apagado; sucesso → `"Conversa local apagada"` **com Desfazer** (`:66`) | `deleted=true`, navega para `conversas`; Desfazer devolve a linha | 2.8.1, 2.8.2 |
| 65. Compartilhamento indisponível — `share` fallback (`features/messaging/actions.js:91-98`) | diálogo | `share` (`app/handlers.js:31`) quando o registro não é acessível na cidade atual | — | Fechar (`close-dialog`) | `"Compartilhamento indisponível"` / `"O conteúdo foi removido ou não está disponível nesta cidade. Nenhum link foi compartilhado."` | Fecha | 2.2.1 |
| 66. Compartilhar demonstração — `share` fallback (`features/messaging/actions.js:97`) | diálogo | `share` quando `navigator.share`/clipboard falham fora do cartão | — | Fechar (`close-dialog`) | Não verificado em detalhe (o relatório de área F registra o título `"Compartilhar demonstração"`; campos e botões além do fechar não foram lidos) | Fecha | 2.6.2 |
| 67. Selo "verificado" — `openVerifiedInfo` (`shell/verified-info.js:7`) | diálogo | `verified-info` (`businesses/detail.js:5`, `iconBtn('info', …)` no bloco do responsável) → `app/handlers.js:52` → `verified-info.js:7`. **`verifiedBadgeHtml` (`verified-info.js:6`) não é chamada em nenhum arquivo de `src/`** (E) — o único emissor é o do negócio | — | `Entendi` (`close-dialog`, preenchido) | Quatro blocos: `"Vínculo com as Forças conferido"`, `"O resto é declarado pela pessoa"`, `"O anúncio é de quem anuncia"`, `"Combine com cuidado"`; nota `"Neste protótipo, a verificação é simulada."` | Fecha | 2.6.2 (sem emissor em 2.2.1/2.3.x) |
| 68. Perfil em análise — `showDialog('Perfil em análise', …, 'unverified')` (`app/state.js:62`) | diálogo | `canPost()` (`app/state.js:59-63`) barra qualquer publicação/contato de perfil não verificado — `ask`, `create-item`, `create-property`, `my-biz`, `item-interest`, `item-visit`, `send-offer`, `quote`, `claim-biz`, `confirm-claim`, `submit-*`, `send-answer`, `solve-question`, `reopen-question`, `like-answer`, `plan-check`, `join-group`, `attend-event`, `create-request`, `choose-proposal`, `complete-request`, `give-up-proposal` | — | `Voltar` (`close-dialog`, preenchido) | `"Perfil em análise"` / `"Publicar libera quando a equipe aprovar seu perfil. Nada foi publicado."`; na visita, o mesmo `canPost()` avisa antes `"Você está consultando {cidade}. Publique na sua cidade, {homeCity}."` (`app/state.js:61`) | Fecha | 2.3.1 (aparece sobre todas) |
| 69. Conteúdo anterior indisponível — `showDialog` (`app/handlers.js:27`) | diálogo | `resume` (`home/views.js:39`) → `handlers.js:27` | — | `Explorar anúncios` (`catalog-all`) e `Fechar` (`close-dialog`) | `"Conteúdo anterior indisponível"` | `catalog-all` vai para `desapegos`; fechar só fecha | 2.3.1 |
| 70. Dependências declaradas — `showGlobalDependency` (`app/handlers.js:151-156`) | diálogo | `default:` de ação desconhecida (`app/handlers.js:144`); `showGlobalDependency('evento-indisponivel')` (`app/handlers.js:26`); `('plano-indisponivel')` (`:29-30`). Mapas de título: `create-event`, `edit-event`, `delete-event`, `attend-event`, `submit-event`, `evento-indisponivel`, `plano-indisponivel` | — | `Voltar` e `Consultar Agenda` (Encontros) | `"Ação indisponível nesta rodada"` / `"Este recurso não está disponível neste contexto da demonstração. Consulte os dados existentes ou retorne à página anterior."`; Encontros: `"Esta operação depende da rodada de Encontros: criação, presença, lotação e cancelamento ainda precisam de suas regras e provas. Nenhum encontro ou confirmação foi alterado. Você pode consultar a agenda existente."`; `plano-indisponivel` = título `"Etapa indisponível"`. **As ações de Encontro não caem aqui no código atual** (D): o `switch` as trata antes do `default:` | `Consultar Agenda` vai para `agenda` | 2.3.1, 2.4.3 |
| 71. Folha do menu da landing — `#ld-sheet` (`features/entry/landing.js:94-99`, `role="dialog" aria-modal="true" aria-label="Menu"`) | folha | Botão `[data-ld-menu]` (`landing.js:157`; **não é `data-action`** — listeners de `landingMount`, `landing.js:154-159`); fechada por `[data-ld-close]`, pela âncora ou por Escape (`:163`) | — | Nav com as quatro seções e ícone; `Criar conta` (`entry-join`); `Já tenho conta · Entrar` (`entry-login`); rodapé legal (Ajuda/Privacidade/conduta) | — | Abre com `inert` no resto da landing (`landing.js:119,144`), prende o foco (`:161-170`), foca o botão de fechar (`:146`) e devolve o foco ao botão do menu (`:147`) | 2.9.1 |
| 72. Começar com outra conta — `confirm` (`features/entry/account.js:137`) | confirmação | `entry-restart` (`account.js:44`) → `account.js:137` | — | Padrão de `confirm` | `"Começar com outra conta?"` / `"A entrada em andamento é apagada deste dispositivo."` | Confirmado: zera `state.entry` e vai para `entrar/conta` com `replace` | 2.9.3 |
| 73. Sair do Bivaque — `confirm` (`features/entry/landing.js:203`) | confirmação | `sign-out` (`profile/views.js:6`) → `landing.js:203` (`entrySignOut`, `:198`) | — | Padrão de `confirm` | `"Sair do Bivaque?"` | `state.signedOut=true` e volta à landing | 2.5.1 |
| 74. Revisão de item da fila (dono) — `ownerReview` (`features/owner/review.js:39`, kind `owner-review`) | painel (lateral direito de 420 px no desktop; folha no celular, `styles/owner.css:63,82`) | `owner-review` (`owner/console.js:82` via `ownerBtn`; `owner/queues.js:8`) → `review.js:90` → `ownerReview` | `owner-reason` "Motivo da decisão" (`selectField`; opções `Escolher motivo`, `Golpe ou pedido de pagamento antecipado`, `Informação enganosa`, `Dados pessoais expostos`, `Ofensa ou assédio`, `Documento ilegível ou não confere`, `Outro motivo`) | Denúncia: `Dispensar` (`dismiss`) + `Remover`/`Suspender página`/`Advertir`; verificação da entrada: `Pedir outro documento` (`more`) + `Aprovar` (`approve`); verificação: `Pedir outro documento` + `Recusar` (`reject`) + `Aprovar`; negócio: `Recusar` + `Aprovar`; perguntas paradas: `Chamar embaixadores` (`call`); atalhos `open-item`/`open-request`/`open-question`/`open-post`/`open-biz` | Motivo obrigatório → `f.errorText='Escolha o motivo antes de decidir.'` (`review.js:57`); item já decidido → `"Este item já foi decidido."`; sucesso → `"{título}: {rótulo}."` (`check_circle`); notas `OWNER_ACT_NOTE.remove/suspend/warn` (`review.js:8`); conteúdo já apagado pelo autor → `"O conteúdo já foi excluído pelo autor."` + `"Não há mais o que remover. Dispensar fecha as denúncias."`; verificação da entrada → `"Criou a conta neste dispositivo. A fonte oficial não confirmou o vínculo pelo CPF… O CPF não fica guardado."` e `"Primeiro pedido. A cidade é escolhida depois da aprovação."` | `owner-decide` (`review.js:91`) aplica a decisão (`reportConsequence`), fecha o painel, foca o `<h1>` e avisa; `owner-undo` (`queues.js:27-50`) reabre a decisão, com três recusas literais (`"Este conteúdo foi removido por outra decisão. Desfaça a remoção primeiro."`, `"O pedido já mudou depois dessa decisão. Ela não pode mais ser desfeita."`, `"A pessoa já seguiu na entrada. Esta decisão não pode mais ser desfeita."`) | 2.10.1 |
| 75. Painel lateral da cidade (dono) — `ownerCityOpen` (`features/owner/cities.js:15-23`, kind `owner-review`) | painel | `owner-city-open` (`cities.js:11`, nome da cidade na tabela) → `review.js:97` | `owner-invite-name` "Nome de quem mora em {cidade}" `maxlength="60" autocomplete="off"` | `Ver perguntas paradas` (`owner-city-stale`, só se `unanswered`); `Convidar` (`owner-invite`, `person_add`) | Nota `"No app, o convite vai pelo próprio Bivaque e a pessoa precisa ser verificada para aceitar. Aqui ele fica registrado neste dispositivo."`; vazio `"Ninguém ainda. Quem chega a {cidade} fica sem quem responda rápido."`; erro `"Escreva o nome de quem você quer convidar."`; sucesso `"Convite para {nome} ser embaixador em {cidade} registrado (modo teste)."` | `owner-invite` (`:101`) grava; `owner-city-stale` (`:102`) fecha, filtra a cidade e abre Filas→Perguntas | 2.10.1 |
| 76. Convidar moderador (dono) — `ownerModInvite` (`features/owner/business-team.js:48`) | diálogo | `owner-mod-invite` (`business-team.js:45`) → `review.js:99` | `owner-mod-name` "Nome" `maxlength="60" autocomplete="off"`; `owner-mod-city` "Cidade" (opções = cidades, selecionado `ownerCity==='Todas' ? state.homeCity : ownerCity`) | `Registrar convite` (`owner-mod-send`, `send`) | Nota `"Moderadores revisam denúncias e verificações da cidade. No app, a pessoa precisa ser verificada para aceitar; aqui o convite fica registrado neste dispositivo."`; erro `"Escreva o nome de quem você quer convidar."`; sucesso `"Convite de moderação para {nome} registrado (modo teste)."` | `owner-mod-send` (`:100`) grava o convite | 2.10.1 |
| 77. Revogar código local — `confirm` (`features/profile/demo-actions.js:69-75`) | confirmação | `remove-invite` (linha de convite do overlay 46, `demo-actions.js:4`) → `:69` | — | Padrão de `confirm` | `"Revogar código local?"` / `"O código de demonstração de {nome} será removido deste navegador."`; já usado/inexistente → `"Este convite foi utilizado ou não está mais disponível."`; falha → `"Não foi possível revogar o código. Ele permanece disponível."`; sucesso → `"Código local revogado. Nenhum convite real foi enviado."` | Remove da lista, `render()`, reabre a folha 46 e avisa | 2.5.1 |
| 78. Trocar o cenário de teste — `confirm` (`app/handlers.js:72-76`) | confirmação | `apply-prototype` (overlay 45) → `handlers.js:72` | — | Padrão de `confirm` | `"Trocar o cenário de teste?"` / `"Isso substitui as alterações locais pelos exemplos do cenário escolhido."`; sucesso → `"Cenário atualizado"` | Recria o estado a partir de `initial(stage)`, aplica `verified`/`incoming`, fecha, navega `inicio` | 2.5.1 |
| 79. Recomeçar do zero — `confirm` (`app/handlers.js:77`) | confirmação | `reset-prototype` (overlay 45) → `handlers.js:77` | — | Padrão de `confirm` | `"Recomeçar do zero?"` / `"Anúncios, conversas, salvos e outras alterações feitas neste dispositivo serão substituídos pelos exemplos iniciais."`; sucesso → `"Protótipo reiniciado"` | `initial()`, navega `inicio`, `toastClearAll()` | 2.5.1 |
| 80. Pedido de avisos — `maybeAskPush` (`features/profile/push-install.js:20-28`, kind `push`) | folha | `push-ask` (`push-install.js:33`, botão "Ativar" da linha `pushRowHtml`) → `:41`; e `askPushSoon` depois de criar alerta (`alerts.js:39`), publicar pergunta (`community/editor.js:3`) ou enviar pedido (`requests/handlers.js:15`) | — (até 3 cartões de amostra `PUSH_SAMPLES`, `:11-15`) | `Agora não` (`push-later`, texto); `Ativar avisos` (`push-enable`, preenchido, `notifications_active`) | Nota `"Avisamos só do que você pediu: respostas às suas perguntas, propostas aos seus pedidos, alertas de busca e encontros. Você muda isso quando quiser em Você → Avisos."`; amostras: `"Imóvel novo em Ponta Negra"`/`"Combina com o seu alerta de busca."`, `"Ana respondeu sua pergunta"`/`"“Atende pelo plano, sim. Liga antes.”"`, `"Nova proposta para o seu pedido"`/`"Mudanças Rio Negro enviou uma proposta."`; `push-enable` → `"Avisos ativados neste protótipo. No app, o celular pede a sua permissão aqui."`; `push-disable` (linha) → `"Avisos no celular desativados"` | `push-later` (`:42`) grava `pushAskedAt` e fecha **sem mensagem**; `push-enable` (`:43`) liga e avisa; **mostrar já conta como pedido** (grava antes de desenhar, `:25`) | 2.5.1 |
| 81. Instalar no iPhone — `showDialog('Instalar no iPhone', …, 'install')` (`features/profile/push-install.js:46`) | folha | `install-app` (`push-install.js:37`, linha `installRowHtml`; só aparece quando não é standalone e há `beforeinstallprompt` ou é iOS, `:35-38`) → `:45-46` | — (`<ol class="install-steps">` com três passos) | `Entendi` (`close-dialog`, preenchido) | Passos `"Toque em <svg Compartilhar> Compartilhar, na barra do Safari."`, `"Escolha Adicionar à Tela de Início."`, `"Toque em Adicionar. O Bivaque abre direto da tela inicial."`; com `installPrompt`: `"Instalação cancelada."`, `"Não foi possível instalar agora."`; instalado → `"Bivaque instalado na tela inicial"` | `install-app` (`:45`) chama `prompt()` quando há prompt do sistema; no iOS abre esta folha | 2.5.1 |

---

### Conferência dos overlays

- **81 overlays** nesta tabela (81 linhas numeradas, conferidas por `^\| \d+\. `). A atribuição por área
  é aproximada de propósito: vários overlays aparecem no relatório de **duas** áreas (filtros, comparar,
  compartilhar, alertas, denunciar, bloquear, interesses, denúncia, planos, limite de plano, lightbox,
  `verified-info`, perfil em análise, cidade e momento, avisos, paleta, menu Criar) e foram contados **uma
  vez só**, no ponto do fluxo que primeiro os especifica. Contagem por área, para conferência:
  A=7, B=9, C=13, D=14, E=11, F=8, G=6, H=3, I=2, J=3 e 5 transversais
  (`verified-info`, perfil em análise, conteúdo anterior indisponível, dependências declaradas e os
  fallbacks de compartilhamento) — soma 81.
- Onde o relatório de área **não leu** o conteúdo do overlay, a célula diz "não verificado": o
  simulador de moderação (43), os campos do editor de publicação (33) e o `Compartilhar demonstração` (66).
- `verified-info` (67) tem **um** emissor real (`businesses/detail.js:5`); o selo genérico
  `verifiedBadgeHtml` (`shell/verified-info.js:6`) não é chamado em nenhum arquivo de `src/` (E).

---

## 4. A��es

Inventário das ações do protótipo `prototypes/bivaque-html/src`, montado a partir das dez leituras de
área (A–J), com uma extração mecânica de nomes e linhas usada **só como conferência de nomes/linhas**
(ela é ruidosa: lista classes CSS e ids como se fossem ações, e marca `—` em emissores que
as leituras de área comprovam). Nenhuma ação foi executada em runtime.

**Regras de contagem declaradas.** Cada linha vale 1 ação. Abri exceção só para as famílias dinâmicas
pedidas: `wiz-*` (uma linha com `wiz-next`, `wiz-prev`, `wiz-go`) e `item-*` (uma linha com
`item-interest`, `item-offer`, `item-visit`, `item-status`, `item-leads`). `send-offer`, embora pertença
ao fluxo da oferta, não tem prefixo `item-` e ficou em linha própria. Variantes dinâmicas de outro tipo
(`open-${kind}`, `open-${type}`) **não aparecem no código lido**: o padrão real é `open-item`/`open-biz`/
`open-question`/`open-group`/`open-event`/`open-thread`, cada um com `case`/despachante próprio, e por
isso cada um tem a sua linha.

---

### Ações com efeito de produto

| Ação | Onde aparece (arquivo:linha) | data-value | Efeito visível (mensagem literal, navegação ou mudança de estado) | Tratada em (arquivo:linha) |
|---|---|---|---|---|
| `nav` | `shell/navigation.js:65` (menu inferior/trilho) | `inicio`/`comunidade`/`conversas`/`voce` | troca de aba; `aria-current="page"` no item ativo | `app/handlers.js:21` |
| `home` | `features/listings/detail.js:1,3` (vazios); `features/messaging/views.js:2` (`Explorar a cidade`) | — | vai para a Início | `app/handlers.js:22` |
| `back` | `shell/navigation.js:60,64`; `features/legal/pages.js:44`; `support/help.js:46` | — | fecha folha/diálogo/painel aberto; sem nada aberto volta ao `origin` | `app/handlers.js:23` / `shell/navigation.js:51` |
| `city` | `features/home/views.js:15`; `shell/navigation.js:60`; `features/profile/views.js:6` | — | abre "Cidade e momento" | `app/handlers.js:62` → `features/profile/settings.js:1` |
| `search` | `features/home/views.js:17`; `features/home/desktop.js:10`; `shell/navigation.js:60,79` | — | zera `searchQuery` e vai para `busca` | `app/handlers.js:41` |
| `clear-search` | `shell/navigation.js:64` | — | limpa o campo; se já vazio chama `back()` | `app/handlers.js:43` |
| `create` | `shell/template.html:5` (`#fab`); `shell/navigation.js:66` (slot Criar); `features/profile/views.js:10` | — | abre o menu Criar | `app/handlers.js:83` |
| `settings` | `shell/navigation.js:65`; `features/profile/views.js:6` | — | abre Configurações | `app/handlers.js:69` |
| `prototype` | `shell/navigation.js:65`; `features/profile/views.js:6` | — | abre Controles do protótipo | `app/handlers.js:71` |
| `home-city` | `shell/navigation.js:108` (faixa "Você está conhecendo…") | — | volta `state.city` para `homeCity` e vai para `inicio` | `app/handlers.js:68` |
| `close-dialog` | `features/listings/editor.js:8`; `shell/dialogs.js:5` e todos os overlays | — | fecha o diálogo (com confirmação se `editorDirty`) | `app/handlers.js:80` |
| `cancel-confirm` | `shell/dialogs.js:20` | — | cancela o `confirm()` | `app/handlers.js:81` |
| `accept-confirm` | `shell/dialogs.js:20` | — | aceita o `confirm()` e executa o callback | `app/handlers.js:82` |
| `undo` | `shell/toasts.js:10` | `''` ou id do aviso | desfaz o aviso atual ou um da pilha (7000 ms, pilha de 2) | `app/handlers.js:143` |
| `intent` | `features/home/views.js:17`; `features/home/desktop.js:10`; `transfers/guide.js:1` | `biz`/`desapego`/`imovel`/`ind` | vai para negócios, catálogo ou `comunidade` (aba `ind`) | `app/handlers.js:50` |
| `guide` | `features/home/views.js:26`; `features/home/desktop.js:18,67` | — | vai para `guia` | `app/handlers.js:24` |
| `agenda` | `features/home/desktop.js:60` | — | vai para a Agenda da cidade | `app/handlers.js:25` |
| `businesses` | `features/home/desktop.js:39`; `features/community/views.js:3`; `transfers/guide.js:1`; `features/profile/views.js:9` | — | vai para `negocios` | `app/handlers.js:58` |
| `groups` | `features/home/desktop.js:50`; `features/profile/views.js:6`; `features/groups/views.js:112` | — | `communityTab='grp'` e vai para `comunidade` | `app/handlers.js:140` |
| `my-biz` | `features/businesses/catalog.js:1`; `shell/create-menu.js:13,23,28`; `features/home/views.js:27`; `features/home/desktop.js:15`; `features/profile/views.js:6` | — | com página viva vai para `negocio/<id>`; senão volta à cidade natal e abre o editor | `app/handlers.js:110` |
| `my-questions` | `features/profile/views.js:6`; `app/handlers.js:30` (passo `s3`) | — | `state.city=homeCity` e vai para `minhas` | `app/handlers.js:139` |
| `saved` | `features/profile/views.js:6` (stat e linha) | — | fecha diálogo e vai para `salvos` | `features/profile/demo-actions.js:47` |
| `my-ads` | `features/profile/views.js:6` | — | volta à cidade natal se em visita; vai para `meus-anuncios` | `features/profile/demo-actions.js:48` |
| `requests` | `features/profile/views.js:6`; `shell/command-palette.js:5` | — | fecha diálogo, roda `seedProviderRequests()` e vai para `pedidos` | `features/requests/handlers.js:4` |
| `family` | `features/profile/views.js:6` | — | abre "Família convidada" | `features/profile/demo-actions.js:51` |
| `family-settings` | `features/profile/demo-actions.js:3` | — | fecha a folha e abre Configurações | `features/profile/demo-actions.js:52` |
| `sign-out` | `features/profile/views.js:6` | — | confirma `"Sair do Bivaque?"` e volta à landing (`state.signedOut=true`) | `features/entry/landing.js:203` |
| `support-open` | `support/help.js:49,54,56,62`; `features/profile/settings.js:5`; `entry/landing.js:78,90,98`; `features/profile/views.js:6` | `ajuda` / `ajuda:{id}` / `contato` / `chamados` / `apagar-conta` | navega para ajuda/tópico/contato/chamados/apagar-conta (passa por `leaveDialog`) | `features/support/help.js:146-151` |
| `support-contact` | `support/help.js:71`; `entry/landing.js:78` | — | abre `contato` | `features/support/help.js:147` |
| `open-legal` | `legal/pages.js:39`; `features/profile/settings.js:5`; `entry/landing.js:90,98`; `pages.js:41` | `privacidade`/`conduta` | salva o rascunho da entrada e abre a página legal | `features/legal/pages.js:47` |
| `open-hidden` | `features/profile/settings.js:5` | — | fecha o diálogo e vai para `ocultados` | `features/profile/hidden.js:18` |
| `open-blocked` | `features/profile/settings.js:5` | — | fecha o diálogo e vai para `bloqueados` | `features/profile/blocks.js:45` |
| `notices` | `shell/navigation.js:60` (sino) | — | zera a aba e abre "Avisos" | `features/profile/demo-actions.js:76` |
| `search-type` | `features/search/views.js:6,28,57` | `all`/`items`/`biz`/`asks`/`groups`/`events` | troca o filtro de tipo e redesenha | `app/handlers.js:49` |
| `recent-search` | `features/search/views.js:39`; `shell/command-palette.js:23` | texto | preenche, salva em recentes e vai para `busca` | `app/handlers.js:44` |
| `guide-search` | `features/transfers/guide.js:1` (cards 2 e 3) | `mudança`/`escola` | grava a busca e vai para `busca` | `app/handlers.js:44` |
| `search-fill` | `features/search/views.js:39` | texto | completa o campo sem buscar | `app/handlers.js:46` |
| `clear-recent` | `features/search/views.js:42` | — | apaga `state.recent` e avisa `"Buscas recentes apagadas"` | `app/handlers.js:47` |
| `search-explore` | `features/search/views.js:45` | `biz\|{grupo}`, `imovel`, `desapego` | vai para negócios ou catálogo já filtrado | `app/handlers.js:48` |
| `create-request` | `features/requests/views.js:5`; `features/businesses/catalog.js:1` (faixa e "Pedir"); `home/views.js:18`; `home/desktop.js:11`; `create-menu.js:8,15,23`; `command-palette.js:6` | — | abre "Contratar serviço" (ou recusa por limite/`canPost()`) | `features/requests/handlers.js:3` |
| `resume` | `features/home/views.js:39` | `{type}\|{id}` | abre anúncio/negócio/pergunta; inválido → diálogo `"Conteúdo anterior indisponível"` | `app/handlers.js:27` |
| `plan` | `features/home/views.js:32`; `features/home/desktop.js:68` | `chegando`/`saindo` | abre o plano completo (checklist) | `app/handlers.js:28,147` |
| `plan-check` | `features/home/views.js:32` | `{kind}\|{id}` | marca/reabre a etapa; bloqueia em visita e em perfil não verificado | `app/handlers.js:29` |
| `plan-go` | `features/home/views.js:32,35` | `{kind}\|{id}` | fecha o overlay e despacha a ação da etapa (filtro, busca, grupos, publicar, minhas indicações, destino) | `app/handlers.js:30` |
| `catalog-pill` | `features/listings/filters.js:25,33`; `catalog.js:33` | `all`/`price`/`cat`/`ptype`/`cond`/`pickup`/`beds`/`avail`/`hood`/`sort` | abre o painel/folha do filtro pedido (ou só a ordenação) | `app/handlers.js:54` → `filters.js:118` |
| `catalog-toggle` | `features/listings/filters.js:26` | `pets`/`furnished` | liga/desliga a comodidade direto no catálogo, redesenha e devolve o foco | `app/handlers.js:55` → `catalogSetAttr` (`catalog.js:16`) |
| `catalog-view` | `features/listings/map.js:14` | `list`/`map` | troca Lista ↔ Mapa e redesenha | `features/listings/map.js:81` |
| `map-hood` | `features/listings/map.js:19` (chips), `map.js:48` (pinos) | nome do bairro | <720 px abre a folha do bairro; ≥720 px abre o diálogo do bairro | `features/listings/map.js:83` |
| `map-hood-list` | `features/listings/map.js:65`; `hood-panel.js:9,19` | nome do bairro | fecha folha/diálogo, fixa `hoods:[bairro]` e volta para a lista | `features/listings/map.js:86` |
| `hood-panel-close` | `features/listings/hood-panel.js:19` | — | fecha a folha e devolve o foco | `features/listings/hood-panel.js:85` |
| `hood-panel-stop` | `features/listings/hood-panel.js:19` (puxador) | — | sobe/desce a folha (`low`→`half`→`full`→`low`) | `features/listings/hood-panel.js:86` |
| `save-item` | `shell/primitives.js:21`; `features/listings/detail.js:8`; `features/listings/map.js:71,74` | id do anúncio | alterna salvo; troca só o botão (redesenha em Salvos/Você/atalho de comparar); avisa `"Anúncio salvo"`/`"Anúncio removido dos salvos"` | `app/handlers.js:96` → `shell/in-place.js:15` |
| `open-item` | `shell/primitives.js:21`; `hood-panel.js:13`; `owner/review.js:21`; `motion/gestures.js:39` | id do anúncio | abre `anuncio`; ajusta `state.city`, incrementa `views` se não for seu, `remember('item')` | `app/handlers.js:93` |
| `search-alert` | `features/listings/catalog.js:33`; `alerts.js:29` | — | cria o alerta da busca corrente (ou abre a lista se já existe) | `features/listings/alerts.js:55` → `:31` |
| `search-alerts` | `features/listings/alerts.js:28,38`; `features/profile/views.js:6` | — | abre o diálogo "Alertas de busca" | `features/listings/alerts.js:56` |
| `alert-open` | `features/listings/alerts.js:43` | id do alerta | aplica o alerta e navega para `imoveis`/`desapegos`; alerta de outra cidade só avisa | `features/listings/alerts.js:60` |
| `alert-toggle` | `features/listings/alerts.js:43` | id do alerta | pausa/religa os avisos, redesenha e reabre a lista | `features/listings/alerts.js:65` |
| `alert-delete` | `features/listings/alerts.js:43` | id do alerta | exclui e reabre a lista com o "Desfazer" | `features/listings/alerts.js:66` |
| `alert-undo` | `features/listings/alerts.js:48` | — | reinsere o alerta excluído e reabre com o foco nele | `features/listings/alerts.js:58` |
| `simulate-alert` | `features/profile/settings.js:6` | — | publica um anúncio de exemplo que caiba no alerta ligado e cria aviso | `features/listings/alerts.js:57` → `:71` |
| `clear-filters` | `features/listings/catalog.js:35` (vazio) | — | zera os filtros dos dois tipos, `searchHood`/`searchMin`/`searchMax` e a ordenação | `app/handlers.js:57` |
| `list-more` | `shell/paged-list.js:14` | id da lista | acrescenta o próximo bloco e foca o 1º cartão novo | `app/handlers.js:17` → `shell/paged-list.js:46` |
| `catalog-all` | `features/profile/views.js:9`; `app/handlers.js:27` (diálogo de retomar) | — | zera o filtro de desapego e vai para `desapegos` | `app/handlers.js:51` |
| `compare-saved` | `features/listings/compare.js:5` (Salvos) | — | abre a comparação; com menos de dois avisa `"Salve ao menos dois imóveis para comparar."` | `features/listings/compare.js:31` |
| `compare-open` | `features/listings/compare.js:21` | id do imóvel | fecha a comparação e abre o anúncio | `features/listings/compare.js:33` |
| `compare-unsave` | `features/listings/compare.js:21` | id do imóvel | tira dos salvos e reabre/ajusta a comparação | `features/listings/compare.js:34` |
| `create-item` | `features/listings/catalog.js:13`; `features/home/desktop.js:43`; `features/profile/views.js:10`; `shell/create-menu.js:9`; `shell/command-palette.js:6` | — | abre o editor de desapego | `app/handlers.js:84` |
| `create-property` | `features/listings/catalog.js:13`; `shell/create-menu.js:10,25` | — | abre o assistente de imóvel | `app/handlers.js:85` |
| `edit-item` | `features/listings/detail.js:8`; `features/profile/views.js:10` | id do item | reabre o editor com o item | `app/handlers.js:86` |
| `open-draft` | `features/profile/views.js:10` | id do rascunho | reabre o rascunho no editor/assistente | `app/handlers.js:87` |
| `delete-draft` | `features/profile/views.js:10` | id do rascunho | confirma e remove; `"Rascunho excluído"` sem desfazer | `app/handlers.js:103` |
| `save-draft` | `features/listings/editor.js:8`; `wizard.js:17` | — | grava rascunho, vai para `meus-anuncios` com `myAdsFilter='drafts'` e avisa `"Rascunho salvo"` | `app/handlers.js:88` |
| `submit-item` | `features/listings/editor.js:8`; `wizard.js:17` | — | valida e publica/atualiza; `"Anúncio publicado"`/`"Anúncio atualizado"` | `app/handlers.js:89` |
| `cover-photo` | `features/listings/editor.js:2` | índice | move a foto para a capa; `"A foto N agora é a capa."` | `app/handlers.js:90` → `features/listings/photos.js:25` |
| `remove-photo` | `features/listings/editor.js:2`; `photos.js:25` | índice | remove a foto do editor e redesenha as prévias | `app/handlers.js:92` |
| `delete-item` | `features/listings/detail.js:9`; `features/profile/views.js:10` | id do item | confirma `"Excluir anúncio?"`, remove de `state.items`, vai para `meus-anuncios` com `myAdsFilter='active'` e avisa `"Anúncio excluído"` com desfazer | `app/handlers.js:102` |
| `lightbox` | `features/listings/detail.js:9` (`item`); `features/businesses/detail.js:5` (`biz`) | `item`/`biz` | abre a galeria em tela cheia na foto selecionada (negócio sempre no índice 0) | `app/handlers.js:91` |
| `gallery` | `features/listings/detail.js:9` | índice | troca `#hero-image` e o item `selected` | `app/handlers.js:104` |
| `wiz-*` (`wiz-next`, `wiz-prev`, `wiz-go`) | `features/listings/wizard.js:17,22` | `wiz-go` = nº da etapa | avança/volta/edita uma etapa; valida a etapa atual (`"Escolha o tipo de imóvel."` na 1) | `features/listings/wizard.js:41-49` |
| `item-*` (`item-interest`, `item-offer`, `item-visit`, `item-status`, `item-leads`) | `features/listings/detail.js:8,9`; `motion/gestures.js:36` | id do item | `item-interest` inicia conversa com a pergunta de disponibilidade; `item-offer` abre a oferta; `item-visit` inicia conversa de visita/retirada; `item-status` alterna `sold`/`active` (`"Anúncio encerrado"`/`"Anúncio reativado"`, com desfazer); `item-leads` abre `"Contatos recebidos"` | `app/handlers.js:97,98,100,101,105` |
| `send-offer` | `app/handlers.js:98` (dentro da oferta) | — | valida o valor e inicia conversa com `"Olá! Você aceitaria {valor}?"` | `app/handlers.js:99` → `messaging/actions.js:87` |
| `verified-info` | `features/businesses/detail.js:5` (`iconBtn('info', …)`) | — | abre `"O que o selo “verificado” significa"` | `app/handlers.js:52` → `shell/verified-info.js:7` |
| `share` | `features/listings/detail.js:8`; `businesses/detail.js:3,28`; `events/views.js:18`; `community/question.js:4`; `community/manage.js:51`; `motion/gestures.js:36` | `anuncio\|{id}`, `negocio\|{id}`, `pergunta\|{id}`, `evento\|{id}` | abre o cartão de compartilhamento (ou copia/avisa no fallback) | `app/handlers.js:31` → `share-card.js:42` |
| `share-link` | `features/listings/share-card.js:47` | `{tipo}\|{id}` | fecha o cartão e compartilha o link | `features/listings/share-card.js:57` |
| `share-download` | `features/listings/share-card.js:47` | — | baixa `bivaque-{tipo}-{id}.png` e avisa `"Imagem salva no aparelho"` | `features/listings/share-card.js:59` |
| `share-image` | `features/listings/share-card.js:47` | — | `navigator.share` do PNG; `"Cartão compartilhado"` ou erro literal | `features/listings/share-card.js:61` |
| `report` | `features/listings/detail.js:9`; `community/question.js:9`; `profile/blocks.js:41`; `requests/views.js:9,16,36`; `businesses/detail.js:5`; `messaging/actions.js:53`; `groups/views.js:91-92`; `motion/gestures.js:36` | `item\|id`, `ask\|id`, `answer\|…`, `post\|…`, `comment\|…`, `thread\|id`, `biz\|id`, `request\|id`, `proposal\|id` | abre `"Denunciar conteúdo"` | `app/handlers.js:39` → `profile/demo-actions.js:94` |
| `submit-report` | `features/profile/demo-actions.js:94` | `{tipo}\|{id}` | grava em `state.reports`; `"Denúncia registrada. A equipe do Bivaque revisa em até 24 h."` | `app/handlers.js:40` → `owner/review.js:106` |
| `ask` | `features/home/views.js:25`; `home/desktop.js:17`; `community/views.js:1,7`; `shell/paged-list.js:45` | — | abre "Pedir indicação" | `app/handlers.js:129` → `community/editor.js:1` |
| `ask-from-search` | `features/search/views.js:23` (vazio) | — | abre "Pedir indicação" com o texto da busca | `app/handlers.js:130` |
| `submit-ask` | `features/community/editor.js:1` | — | publica a pergunta, navega `pergunta/{id}` e avisa `"Pergunta publicada"` | `app/handlers.js:131` → `community/editor.js:3` |
| `send-answer` | `features/community/question.js:7` | id da pergunta | publica a resposta; `"Indicação enviada"`; erro `"Escreva uma resposta com um pouco mais de contexto."` | `app/handlers.js:132` |
| `solve-question` | `features/community/question.js:6` | `{qid}\|{aid}` | marca a solução; `"Resolvida. Sua experiência fica disponível para a comunidade."` | `app/handlers.js:135` |
| `reopen-question` | `features/community/question.js:6`; `community/manage.js:51` | `{qid}\|{aid}` | desfaz a solução; `"Pergunta reaberta"` | `app/handlers.js:135` |
| `like-answer` | `features/community/question.js:6` | `{qid}\|{aid}` | alterna `Útil · N` | `app/handlers.js:136` |
| `follow-question` | `features/community/question.js:4` | id da pergunta | alterna seguir; `"Você acompanha as respostas"`/`"Você deixou de acompanhar"` | `app/handlers.js:137` |
| `answer-origin` | `features/community/question.js:6,8` | `{qid}\|{aid}` | navega à pergunta de origem ou abre o diálogo "Origem da indicação" | `app/handlers.js:138` |
| `open-question` | `shell/primitives.js:24`; `groups/views.js:92`; `profile/hidden.js:10`; `owner/review.js:12`; `motion/gestures.js:40` | id da pergunta | troca a cidade se preciso, conta e vai para `pergunta` | `app/handlers.js:126` |
| `community-tab` | `features/community/views.js:1` | `ind`/`grp`/`biz` | troca a aba e redesenha | `app/handlers.js:60` |
| `question-filter` | `features/community/views.js:4` | `help`/`ok`/`mine` | refiltra a lista de perguntas | `app/handlers.js:61` |
| `hide-question` | `features/profile/blocks.js:51`; `motion/gestures.js:40` | id da pergunta | grava `hiddenByMe`; avisa `"Pergunta ocultada para você."` com desfazer | `features/profile/hidden.js:20-22` |
| `show-question` | `features/profile/hidden.js:7,10` | id da pergunta | apaga `hiddenByMe`; avisa `"Pergunta de volta nas suas listas."` sem desfazer | `features/profile/hidden.js:24` |
| `block-person` | `features/community/question.js:9`; `listings/detail.js:9`; `profile/blocks.js:41`; `messaging/actions.js:53`; `messaging/views.js:11` | nome | abre o confirm de bloqueio | `features/profile/blocks.js:46` |
| `unblock-person` | `features/profile/blocks.js:19,12`; `messaging/actions.js:53`; `messaging/views.js:11` | nome | desbloqueia direto; `"{nome} desbloqueado\|desbloqueada."` sem desfazer | `features/profile/blocks.js:47` |
| `peek-blocked` | `features/profile/blocks.js:14` | `tipo\|id` | libera o conteúdo com a faixa `"Você bloqueou {nome}"` | `features/profile/blocks.js:48` |
| `question-menu` | `features/community/question.js:4`; `community/manage.js:11` | id | abre "Ações da pergunta" | `features/community/manage.js:51` |
| `edit-question` | `features/community/manage.js:51` | id | abre "Editar pergunta" | `features/community/manage.js:52` |
| `save-question` | `features/community/manage.js:12` | id | grava e avisa `"Pergunta atualizada."` | `features/community/manage.js:53` |
| `toggle-question` | `features/community/manage.js:51` | id | marca resolvida/reabre; `"Pergunta marcada como resolvida."`/`"Pergunta reaberta."` | `features/community/manage.js:54` |
| `delete-question` | `features/community/manage.js:51` | id | confirma, remove da comunidade e avisa `"Pergunta excluída."` | `features/community/manage.js:55-56` |
| `answer-menu` | `features/community/question.js:6` | `{qid}\|{aid}` | abre "Ações da resposta" | `features/community/manage.js:61` |
| `edit-answer` | `features/community/manage.js:61` | `{qid}\|{aid}` | abre "Editar resposta" | `features/community/manage.js:62` |
| `save-answer` | `features/community/manage.js:12` | `{qid}\|{aid}` | grava e avisa `"Resposta atualizada."` | `features/community/manage.js:63` |
| `delete-answer` | `features/community/manage.js:61` | `{qid}\|{aid}` | confirma, remove e avisa `"Resposta excluída."` | `features/community/manage.js:65` |
| `question-other-menu` | `features/community/question.js:4` | id | abre o ⋮ de outra pessoa (ocultar/denunciar/bloquear) | `features/profile/blocks.js:51` |
| `answer-other-menu` | `features/community/question.js:6` | `{qid}\|{aid}` | abre o ⋮ da resposta de outra pessoa | `features/profile/blocks.js:52` |
| `post-other-menu` | `features/groups/views.js:87` | `{gid}\|{pid}` | abre o ⋮ da publicação de outra pessoa | `features/profile/blocks.js:54` |
| `comment-other-menu` | `features/groups/views.js:122` | `{gid}\|{pid}\|{cid}` | abre o ⋮ do comentário de outra pessoa | `features/profile/blocks.js:56` |
| `join-group` | `features/groups/views.js:66,99,124` | id do grupo | fechado → `"Pedido enviado. O moderador do grupo vai avaliar."`; aberto → `"Você entrou no grupo. Avisos: Destaques"` | `features/groups/handlers.js:5` |
| `cancel-join` | `features/groups/views.js:99` | id do grupo | `"Pedido cancelado."`; sem pendência → `"Este pedido não está mais pendente."` | `features/groups/handlers.js:44` |
| `group-menu` | `features/groups/views.js:102` | id do grupo | abre o menu de nível de aviso + sair | `features/groups/handlers.js:8` |
| `notif-level` | `features/groups/handlers.js:8` | `{gid}\|{chave}` | grava `g.notif` e avisa `"Avisos do grupo: {rótulo}"` | `features/groups/handlers.js:9` |
| `leave-group` | `features/groups/handlers.js:8` | id do grupo | confirma; admin sem moderador é recusado; senão `"Você saiu do grupo"` | `features/groups/handlers.js:10` |
| `invite-group` | `features/groups/views.js:102` | id do grupo | abre `https://wa.me/?text=` com o link do grupo | `features/groups/handlers.js:11` |
| `manage-group` | `features/groups/views.js:102` | id do grupo | abre "Gerenciar" | `features/groups/handlers.js:12` |
| `approve-req` | `features/groups/editors.js:32` | `{gid}\|{índice}` | soma membro e avisa `"{nome} agora faz parte do grupo"` | `features/groups/handlers.js:13` |
| `deny-req` | `features/groups/editors.js:32` | `{gid}\|{índice}` | recusa e avisa `"Pedido recusado"` | `features/groups/handlers.js:13` |
| `add-mod` | `features/groups/editors.js:32` | id do grupo | adiciona moderador; sem seleção → `"Escolha um membro."` | `features/groups/handlers.js:14` |
| `save-manage` | `features/groups/editors.js:33` | id do grupo | grava aviso fixado/regras/ofertas/privacidade e avisa `"Grupo atualizado"` | `features/groups/handlers.js:15` |
| `create-group` | `features/community/views.js:1`; `features/groups/views.js:73` | — | abre "Criar grupo" | `features/groups/handlers.js:16` |
| `group-tpl` | `features/groups/editors.js:26` | chave do modelo | troca o modelo (e as regras, se intocadas) | `features/groups/handlers.js:17` |
| `submit-group` | `features/groups/editors.js:27` | — | valida nome, impede duplicado, cria, navega e avisa `"Grupo criado. Convide as primeiras pessoas pelo WhatsApp."` | `features/groups/handlers.js:18` |
| `new-post` | `features/groups/views.js:109` | id do grupo | abre o editor de publicação com o `gid` | `features/groups/handlers.js:19` |
| `new-post-empty` | `features/groups/views.js:112` | — | abre o editor usando `route.id` | `features/groups/handlers.js:19` |
| `post-type` | `features/groups/editors.js:11` | tipo | troca o tipo do rascunho | `features/groups/handlers.js:20` |
| `submit-post` | `features/groups/editors.js:18` | id do grupo | valida por tipo e publica; `"Publicado no grupo"`/`"Oferta publicada no grupo"`/`"Publicado no grupo e enviado à cidade"` | `features/groups/handlers.js:21` |
| `group-filter` | `features/groups/views.js:110` | `all`/`question`/`event` | troca o filtro do feed e redesenha | `features/groups/handlers.js:32` |
| `open-post` | `features/groups/views.js:93,121`; `home/desktop.js:49`; `owner/review.js:13-14` | `{gid}~{pid}` | zera `unread` do grupo e vai para `publicacao` | `features/groups/handlers.js:33` |
| `like-post` | `features/groups/views.js:93,121` | `{gid}\|{pid}` | liga/desliga "Útil"; troca só o cartão | `features/groups/handlers.js:34` → `shell/in-place.js:21` |
| `vote-poll` | `features/groups/views.js:90` | `{gid}\|{pid}\|{índice}` | `"Voto registrado"`; repetido → `"Seu voto nesta enquete já foi registrado."`; não membro → `"Entre no grupo para votar."` | `features/groups/handlers.js:35` |
| `attend-post` | `features/groups/views.js:89`; `home/desktop.js:59` | `{gid}\|{pid}` | `"Presença confirmada"`/`"Presença cancelada"`; não membro → `"Entre no grupo para confirmar presença."` | `features/groups/handlers.js:36` |
| `send-comment` | `features/groups/views.js:123` | `{gid}\|{pid}` | publica comentário/resposta; `"Comentário publicado"`; `<3` → `"Escreva pelo menos 3 caracteres."` | `features/groups/handlers.js:37` |
| `solve-comment` | `features/groups/views.js:122` | `{gid}\|{pid}\|{cid}` | `"Marcada como resolvida. Obrigado por fechar o ciclo"`; o cartão ganha `Resolvida` | `features/groups/handlers.js:38` |
| `edit-interests` | `features/groups/views.js:79,80` | — | abre "Interesses" | `features/groups/handlers.js:39` |
| `interest-toggle` | `features/groups/editors.js:40` | chave | marca/desmarca; no 4º → `"Escolha até 3 interesses."` | `features/groups/handlers.js:40` |
| `save-interests` | `features/groups/editors.js:41` | — | grava, volta à aba Grupos e avisa `"Sugestões de grupos atualizadas"` | `features/groups/handlers.js:41` |
| `simulate-moderation` | `features/profile/settings.js:6` | — | abre `openModeration` | `features/groups/handlers.js:42` |
| `moderation-approve` | `features/groups/handlers.js:52` | — | aprova, avisa e cria aviso local em `state.notices` | `features/groups/handlers.js:43` |
| `moderation-deny` | `features/groups/handlers.js:52` | — | recusa, avisa e cria aviso local | `features/groups/handlers.js:43` |
| `close-group` | `features/groups/editors.js:38` | id do grupo | confirma e encerra; `"Grupo encerrado. As publicações ficam para leitura até {dd/mm}."` | `features/groups/handlers.js:45` + `closeGroup` (`:2`) |
| `reopen-group` | `features/groups/editors.js:37` | id do grupo | reabre dentro do prazo; `"Grupo reaberto. …"`; fora do prazo → `"O prazo para reabrir este grupo já passou."` | `features/groups/handlers.js:46` |
| `post-menu` | `features/groups/views.js:87` | `{gid}\|{pid}` | abre `Editar…`/`Excluir…` (ou `Editar encontro`/`Cancelar encontro`) | `features/community/manage.js:73` |
| `edit-post` | `features/community/manage.js:73` | `{gid}\|{pid}` | abre "Editar publicação" | `features/community/manage.js:14` |
| `save-post` | `features/community/manage.js:19` | `{gid}\|{pid}` | grava e redesenha | `features/community/manage.js:19` |
| `delete-post` | `features/community/manage.js:73` | `{gid}\|{pid}` | confirma e exclui; `"Enquete excluída."`/`"Pergunta excluída."`/`"Publicação excluída."`/`"Encontro cancelado.{…}"` | `features/community/manage.js:77-78` |
| `comment-menu` | `features/groups/views.js:122` | `{gid}\|{pid}\|{cid}` | abre `Editar/Excluir resposta\|comentário` | `features/community/manage.js:84` |
| `edit-comment` | `features/community/manage.js:84` | `{gid}\|{pid}\|{cid}` | abre o editor de resposta/comentário | `features/community/manage.js:12` |
| `save-comment` | `features/community/manage.js:86` | `{gid}\|{pid}\|{cid}` | grava e redesenha | `features/community/manage.js:86` |
| `delete-comment` | `features/community/manage.js:84` | `{gid}\|{pid}\|{cid}` | confirma e exclui | `features/community/manage.js:87` |
| `open-group` | `features/groups/views.js:67,121`; `shell/command-palette.js:28`; `features/search/views.js:19` | id do grupo | vai para `grupo` | `app/handlers.js:141` |
| `create-event` | `features/events/views.js:14`; `shell/create-menu.js:12,27`; `shell/command-palette.js:6` | — | abre o editor de encontro | `app/handlers.js:33` |
| `edit-event` | `features/events/views.js:18`; `home/desktop.js:59` | id | abre o editor do meu encontro | `app/handlers.js:34` |
| `submit-event` | `features/events/editor.js:1` | — | valida e publica/atualiza; `"Encontro publicado"`/`"Encontro atualizado.{aviso de convidados}"` | `app/handlers.js:35` |
| `attend-event` | `features/events/views.js:18`; `shell/primitives.js:25`; `home/desktop.js:59` | id | confirma/cancela presença e soma/subtrai `going`; `"Presença confirmada neste dispositivo"`/`"Presença cancelada"` | `app/handlers.js:36` |
| `delete-event` | `features/events/views.js:19`; `home/desktop.js:59` | id | confirma, remove da agenda e oferece Desfazer | `app/handlers.js:37` |
| `agenda-filter` | `features/events/views.js:13` | `all`/`chegando`/`moro`/`saindo` | troca o filtro por público e devolve o foco | `app/handlers.js:53` |
| `open-event` | `shell/primitives.js:25` (×2/×3); `home/desktop.js:60`; `features/search/views.js:19` | id | vai para `evento`; encontro de outra cidade → diálogo `"Encontro indisponível"` | `app/handlers.js:26` |
| `map` | `features/listings/detail.js:9`; `features/events/views.js:19` | `{hood}\|{city}` / `{place}\|{city}` | abre o OpenStreetMap em nova aba | `app/handlers.js:142` |
| `open-biz` | `shell/primitives.js:23`; `home/desktop.js:38`; `community/question.js:6,8`; `requests/views.js:9,36`; `groups/views.js:91`; `command-palette.js:25`; `owner/business-team.js:14,29`; `owner/review.js:15,25` | id | troca a cidade se preciso, conta `views`, `remember('biz')` e vai para `negocio/<id>` | `app/handlers.js:108` |
| `save-biz` | `shell/primitives.js:23`; `features/businesses/detail.js:3` | id | alterna `saved`, atualiza os botões no lugar; `"Negócio salvo"`/`"Negócio removido dos salvos"` | `app/handlers.js:109` → `shell/in-place.js:15` |
| `edit-biz` | `features/businesses/detail.js:3,15` | id | abre o editor da página | `app/handlers.js:111` |
| `biz-menu` | `features/businesses/detail.js:3` | id | abre o menu "Ações da página" | `app/handlers.js:112` → `detail.js:13` |
| `pause-biz` | `features/businesses/detail.js:15` | id | `b.paused=true`; `"Página pausada. Ela saiu da busca e do catálogo."` | `app/handlers.js:112` → `detail.js:16` |
| `resume-biz` | `features/businesses/detail.js:11,15` | id | `b.paused=false`; `"Página reativada. Ela voltou ao catálogo e à busca."` | `app/handlers.js:112` → `detail.js:16` |
| `delete-biz` | `features/businesses/detail.js:15` | id | confirma, retira propostas abertas, apaga `spot`, zera `state.myBiz` e vai para `voce` | `app/handlers.js:112` → `detail.js:17,23` |
| `submit-biz` | `features/businesses/editor.js:1` | — | valida e grava `state.myBiz`; `"Página criada"`/`"Página atualizada"` | `app/handlers.js:113` → `editor.js:2` |
| `indicate` | `features/businesses/catalog.js:1`; `create-menu.js:11,26`; `command-palette.js:6` | — | abre "Indicar um negócio" | `app/handlers.js:117` |
| `submit-indicate` | `features/businesses/indication.js:1` | — | cria/reforça o negócio indicado e navega para ele | `app/handlers.js:118` → `indication.js:2` |
| `recommend-biz` | `features/businesses/detail.js:3,5` | id | abre "Indicar este negócio" (ou avisa `"Você já indicou este negócio."`) | `app/handlers.js:115` |
| `submit-recommend` | `app/handlers.js:115` | id | `recN++`, novo relato, `celebrate`; `"Sua indicação foi adicionada"` | `app/handlers.js:116` |
| `invite-owner` | `features/businesses/detail.js:3` | id | copia `"A comunidade do Bivaque indicou seu negócio. Conheça sua página: {location.href}"` e avisa `"Copiado"` | `app/handlers.js:119` |
| `claim-biz` | `features/businesses/detail.js:5` | id | abre "Assumir página no modo teste" | `app/handlers.js:120` |
| `confirm-claim` | `app/handlers.js:120` | id | cria `state.myBiz`, remove de `state.biz` e abre o editor | `app/handlers.js:121` |
| `quote` | `features/businesses/detail.js:3`; `community/question.js:8` | id | abre/cria a conversa com `"Olá! Vi sua página no Bivaque. Pode me passar um orçamento?"` | `app/handlers.js:114` → `messaging/actions.js:87` |
| `whatsapp` | `features/businesses/detail.js:5` | id | abre `https://wa.me/{55 se ≤11 dígitos}{número}` | `app/handlers.js:122` |
| `instagram` | `features/businesses/detail.js:5` | id | abre `https://www.instagram.com/{perfil}/` | `app/handlers.js:123` |
| `website` | `features/businesses/detail.js:5` | id | abre o site quando começa com `http(s)://` | `app/handlers.js:124` |
| `biz-leads` | `features/businesses/detail.js:28` | id | abre `"Contatos recebidos"` | `app/handlers.js:105` |
| `plans` | `features/businesses/detail.js:28`; `plans.js:32,59` | — | abre o diálogo de planos | `app/handlers.js:125` → `profile/demo-actions.js:1` |
| `activate-plan` | `features/profile/demo-actions.js:1` | tier | troca o tier, cria/remove o destaque de 7 dias e avisa no "modo teste" | `app/handlers.js:15` → `plans.js:72` → `planActivate` (`:47`) |
| `biz-boost` | `features/businesses/plans.js:42` | — | cria destaque de 7 dias ou avisa por que não dá | `app/handlers.js:15` → `plans.js:73` → `planBoost` (`:56`) |
| `simulate-biz-contact` | `features/profile/settings.js:6` | — | cria contato fictício e aviso no sino; `"Contato de teste criado em Conversas"` | `app/handlers.js:15` → `plans.js:74` → `simulateBizContact` (`:65`) |
| `biz-filter` | `features/businesses/catalog.js:1` (via `filterChips`) | categoria ou `Todos` | define `bizCat`, redesenha e devolve o foco à pílula | `app/handlers.js:59` |
| `proposal-sort` | `features/requests/views.js:34` | `arrival`/`price`/`date` | reordena as colunas no lugar | `features/requests/handlers.js:7` |
| `choose-proposal` | `features/requests/views.js:36` | `{rid}\|{pid}` | confirmação → escolhida, demais recusadas, conversa aberta, navega para `conversa` | `features/requests/handlers.js:18-26` |
| `complete-request` | `features/requests/views.js:21` | id do pedido | `status:'done'` + `doneAt`; toast com Desfazer; o cartão troca o botão pela data | `features/requests/handlers.js:28-32` |
| `chat-provider` | `features/requests/views.js:21` | id do pedido | abre a conversa da escolha (ou `contact('biz',…)`) | `features/requests/handlers.js:33-40` |
| `give-up-proposal` | `features/requests/views.js:21` | id do pedido | confirmação → `gaveup`, o pedido reabre com as válidas restauradas | `features/requests/handlers.js:41-49` |
| `cancel-request` | `features/requests/views.js:14` | id do pedido | confirmação → `cancelled`, propostas `sent` → `declined`; `"Pedido cancelado"` | `features/requests/handlers.js:50-54` |
| `propose` | `features/requests/views.js:16,9` | id do pedido | valida página aberta/visibilidade e abre o editor da proposta | `features/requests/handlers.js:55` |
| `submit-proposal` | `features/requests/views.js:24` | id do pedido | cria/atualiza a proposta; `"Proposta enviada"`/`"Proposta atualizada"` | `features/requests/handlers.js:56-66` |
| `withdraw-proposal` | `features/requests/views.js:9` | id do pedido | confirmação → `status:'withdrawn'`; `"Proposta retirada"` | `features/requests/handlers.js:67-71` |
| `simulate-proposals` | `features/profile/settings.js:6` | — | empresas de exemplo respondem aos pedidos abertos e criam avisos | `features/requests/handlers.js:6` → `model.js:35` |
| `open-request` | `features/requests/views.js:2`; `home/desktop.js:28`; `owner/review.js:21` | id do pedido | fecha diálogo aberto e vai para `pedido/{id}` | `features/requests/handlers.js:5` |
| `open-thread` | `features/messaging/views.js:1` (avatar e `.txt`); `app/handlers.js:106`; `requests/views.js:9,36`; `motion/gestures.js:41` | id da conversa | marca como lida, guarda o foco de volta e vai para `conversa` | `features/messaging/actions.js:27` |
| `thread-menu` | `features/messaging/views.js:1,12`; `shell/navigation.js:79` | id da conversa | abre "Ações da conversa" | `features/messaging/actions.js:52` |
| `thread-unread` | `features/messaging/actions.js:53`; `motion/gestures.js:41` | id da conversa | alterna nova/lida, redesenha e avisa | `features/messaging/actions.js:57` |
| `pin-thread` | `features/messaging/actions.js:53`; `motion/gestures.js:41` | id da conversa | fixa/solta, reordena e avisa | `features/messaging/actions.js:61` |
| `swipe-delete-thread` | `features/messaging/actions.js:53`; `motion/gestures.js:41` | id da conversa | confirmação → apaga local, vai para `conversas` e avisa com Desfazer | `features/messaging/actions.js:64` |
| `thread-origin` | `features/messaging/views.js:12` | id da conversa | vai para `anuncio`/`negocio` ou explica que a origem sumiu | `features/messaging/actions.js:46` |
| `quick-reply` | `features/messaging/views.js:17` | `{t.id}\|{i}` | acrescenta o texto ao rascunho (nunca envia) e foca o campo | `features/messaging/actions.js:26` |
| `send-message` | `features/messaging/views.js:11`; `actions.js:75` (Enter) | id da conversa | valida, grava, limpa o rascunho e redesenha; `"Mensagem fictícia salva neste dispositivo."` | `features/messaging/actions.js:33` |
| `react-open` | `features/messaging/bubbles.js:28` | `{t.id}\|{i}` | abre/fecha o seletor de reações e foca a reação atual ou a primeira | `features/messaging/bubbles.js:49` (via `actions.js:25`) |
| `react-msg` | `features/messaging/bubbles.js:19,28` | `{t.id}\|{i}\|{emoji}` | grava/troca/remove a reação e avisa `Reação {rótulo} salva na mensagem "{trecho}".`/`Reação removida da mensagem "{trecho}".` | `features/messaging/bubbles.js:49` |
| `simulate-message` | `features/profile/settings.js:6` | — | insere uma resposta fictícia; `"Resposta fictícia salva neste dispositivo"` | `app/handlers.js:79` |
| `simulate-answer` | `features/profile/settings.js:6` | — | adiciona resposta de exemplo e um aviso em `state.notices` | `app/handlers.js:78` → `messaging/actions.js:109` |
| `cap` | `features/profile/views.js:6` (±1, `iconBtn`) | `-1`/`1` | altera `prefs.cap` com validação e avisa | `features/profile/demo-actions.js:87-91` |
| `notices-tab` | `features/profile/demo-actions.js:32` | `all`/`unread` | troca a aba de avisos, reabre e foca | `features/profile/demo-actions.js:77` |
| `notices-read-all` | `features/profile/demo-actions.js:32` | — | marca lidos os da cidade natal; avisa (ou erro) | `features/profile/demo-actions.js:78` |
| `notice-open` | `features/profile/demo-actions.js:28` | id do aviso | marca lido e navega ao destino com `returnOverlay:'notices'` | `features/profile/demo-actions.js:80-86` |
| `notice-read` | `features/profile/demo-actions.js:28` | id do aviso | marca lido, reabre a folha e avisa | `features/profile/demo-actions.js:80-85` |
| `notice-home` | `features/profile/demo-actions.js:34` | — | volta à cidade natal e reabre a folha | `features/profile/demo-actions.js:79` |
| `saved-filter` | `features/profile/views.js:9` (chips) | `all`/`items`/`biz` | troca `savedType`, redesenha e devolve o foco ao chip | `features/profile/demo-actions.js:49` |
| `my-ads-filter` | `features/profile/views.js:10` (chips e vazio) | `active`/`sold`/`drafts` | troca `myAdsFilter`, redesenha | `features/profile/demo-actions.js:50` |
| `new-invite` | `features/profile/demo-actions.js:4` | — | valida nome/e-mail, cria `DEMO-xxxxxxxx`, reabre e avisa `"Código de demonstração criado apenas neste navegador."` | `features/profile/demo-actions.js:53-62` |
| `copy-invite` | `features/profile/demo-actions.js:4,61` | código | copia o código (`"Código local copiado. Ele funciona apenas neste navegador."`) ou cai no campo readonly | `features/profile/demo-actions.js:63-68` |
| `remove-invite` | `features/profile/demo-actions.js:4` | código | confirma, remove, reabre e avisa `"Código local revogado. Nenhum convite real foi enviado."` | `features/profile/demo-actions.js:69-75` |
| `push-ask` | `features/profile/push-install.js:33` | — | força o pedido de avisos (folha `push`) | `features/profile/push-install.js:41` |
| `push-later` | `features/profile/push-install.js:26` | — | grava `pushAskedAt` e fecha, sem mensagem | `features/profile/push-install.js:42` |
| `push-enable` | `features/profile/push-install.js:26` | — | liga os avisos, fecha e avisa `"Avisos ativados neste protótipo. No app, o celular pede a sua permissão aqui."` | `features/profile/push-install.js:43` |
| `push-disable` | `features/profile/push-install.js:33,44` | — | desliga os avisos e avisa `"Avisos no celular desativados"` | `features/profile/push-install.js:44` |
| `install-app` | `features/profile/push-install.js:37` | — | prompt do sistema ou folha "Instalar no iPhone"; `"Bivaque instalado na tela inicial"` | `features/profile/push-install.js:45-46` |
| `apply-city` | `features/profile/settings.js:1` | — | grava cidade/momento/datas, fecha e navega `inicio` | `app/handlers.js:63-67` |
| `save-settings` | `features/profile/settings.js:5` | — | grava nome/bairro/tema/bairro visível/convites; `"Configurações salvas"` | `app/handlers.js:70` |
| `apply-prototype` | `features/profile/settings.js:6` | — | troca cenário (com confirm) ou grava verificação/portal; avisa `"Cenário atualizado"`/`"Permissão de teste atualizada"` | `app/handlers.js:72-76` |
| `reset-prototype` | `features/profile/settings.js:6` | — | confirm, recria o estado, limpa toasts e avisa `"Protótipo reiniciado"` | `app/handlers.js:77` |
| `entry-approve` | `features/entry/account.js:67`; `features/profile/settings.js:6` | — | modo teste: aprova a análise pendente e avisa `"Análise aprovada (modo teste)."` | `features/entry/account.js:142` |
| `owner-open` | `features/profile/settings.js:6` | — | fecha o diálogo, reseta aba/estado e abre `dono` | `features/owner/review.js:86` |
| `onboarding` | `features/profile/settings.js:6` | — | zera `state.entry`, põe `signedOut=true` e reabre `entrar/conta` do zero | `features/entry/arrive.js:79` |
| `support-simulate` | `features/profile/settings.js:6` | — | responde o chamado aberto mais antigo e cria aviso; `"Resposta do suporte simulada"` | `features/support/help.js:157` |
| `entry-join` | `features/entry/landing.js:18` (CTA em `:47,84,93,97`) | — | vai para `entrar/conta` | `features/entry/landing.js:207` |
| `entry-login` | `features/entry/landing.js:37,90,97`; `entry/account.js:27,38` | — | vai para `entrar/login` | `features/entry/landing.js:206` |
| `entry-invite` | `features/entry/account.js:51` | — | zera `entryInviteCode` e abre `entrar/convite` | `features/entry/landing.js:208` |
| `entry-google` | `features/entry/account.js:33` (`conta`); `entry/login.js:9` (`login`) | `conta`/`login` | em `conta` cria a conta Google de teste e vai ao `aceite`; em `login` entra de volta no app | `features/entry/login.js:62` → `entryGoogle` (`:52-58`) |
| `entry-signup` | `features/entry/account.js:38` | — | valida nome/e-mail/senha/aceite e vai para `entrar/cpf` | `features/entry/account.js:133` → `entrySignup` (`:89-98`) |
| `entry-cpf` | `features/entry/account.js:49` | — | valida o CPF, grava a elegibilidade e segue (`cidade`/`analise`/`resultado`) | `features/entry/account.js:134` → `entryCpf` (`:99-110`) |
| `entry-retry` | `features/entry/account.js:54,57` | — | volta a elegibilidade a `none` e reabre `entrar/cpf` (só em `resultado`) | `features/entry/account.js:135` |
| `entry-resume` | `features/entry/account.js:44` | — | retoma em `entryNext()` | `features/entry/account.js:136` |
| `entry-restart` | `features/entry/account.js:44` | — | confirma `"Começar com outra conta?"`, apaga `state.entry` e reabre `entrar/conta` | `features/entry/account.js:137` |
| `entry-notify` | `features/entry/account.js:66` | — | marca `entry.notify`, avisa `"Vamos avisar quando liberar."` e refoca o título | `features/entry/account.js:138` |
| `entry-pass-toggle` | `features/entry/account.js:29` | `en-pass`/`en-pass-login` | alterna `type` entre `password` e `text`, troca `aria-label` e o ícone | `features/entry/account.js:139` |
| `entry-cancel` | `features/entry/account.js:27` (`Sair`) | — | volta para a landing (`entrar` sem id) | `features/entry/account.js:140` |
| `entry-go` | `features/entry/account.js:27`; `entry/login.js:11,16`; `landing.js:206-208` | `senha`/`convite`/`login`/`conta`/vazio | navega para o id indicado e reseta `entryForgotSent`/`entryInviteCode` quando é o caso | `features/entry/account.js:132` |
| `entry-login-submit` | `features/entry/login.js:11` | — | entra, retoma a entrada ou mostra `"E-mail ou senha incorretos."` | `features/entry/login.js:60` → `:44-51` |
| `entry-forgot-submit` | `features/entry/login.js:16` | — | marca `entryForgotSent` e mostra a confirmação | `features/entry/login.js:61` |
| `entry-google-consent` | `features/entry/login.js:24` | — | exige o aceite e segue para `entrar/cpf` | `features/entry/login.js:63` |
| `entry-invite-code` | `features/entry/login.js:31` | — | valida o código e mostra o formulário do convite | `features/entry/login.js:64` |
| `entry-invite-accept` | `features/entry/login.js:37` | — | valida, cria a conta de família e vai para `entrar/cidade` | `features/entry/login.js:65-74` |
| `entry-finish` | `features/entry/arrive.js:23` | — | conclui a entrada, grava perfil/cidade/momento e vai para `boas-vindas` | `features/entry/arrive.js:76` → `entryFinish` (`:37-56`) |
| `entry-home` | `features/entry/arrive.js:62` | `guia`/`inicio`/`grupo/<id>`/`comunidade` | navega para o destino do atalho, com `replace` | `features/entry/arrive.js:77` |
| `account-deleted-home` | `features/support/help.js:140` | — | volta para `entrar` (landing) com `replace` | `features/support/help.js:159` |
| `owner-exit` | `features/owner/console.js:97,98` | — | volta para `voce` | `features/owner/review.js:87` |
| `owner-go` | `features/owner/console.js:80,95,99`; `owner/business-team.js:46` | aba | navega para a aba do Painel | `features/owner/review.js:92` |
| `owner-city` | `features/owner/console.js:101`; `owner/queues.js:22`; `owner/business-team.js:22,31` | `Todas` ou cidade | troca o filtro de cidade e redesenha | `features/owner/review.js:88` |
| `owner-tab` | `features/owner/console.js:80,90`; `owner/queues.js:24` | `all`/`report`/`verify`/`claim`/`stale` | troca o tipo na fila (reseta para `all` se ficar sem itens) | `features/owner/review.js:89` |
| `owner-review` | `features/owner/console.js:82`; `owner/queues.js:8` | id do item | abre o painel de revisão | `features/owner/review.js:90` |
| `owner-decide` | `features/owner/review.js:30-35` | `{id}~{decisão}` | aplica a decisão, fecha o painel, foca o `<h1>` e avisa | `features/owner/review.js:91` |
| `owner-status` | `features/owner/queues.js:23` | `open`/`done` | alterna Abertas/Decididas | `features/owner/review.js:93` |
| `owner-sort` | `features/owner/queues.js:23` | `due`/`recent` | reordena a fila | `features/owner/review.js:94` |
| `owner-assign` | `features/owner/queues.js:8` | id do item | registra `state.owner.assign` e avisa `"Você é o responsável por este item."` | `features/owner/review.js:95` |
| `owner-undo` | `features/owner/queues.js:12` | id decidido | desfaz a decisão e devolve o item à fila | `features/owner/review.js:96` |
| `owner-city-open` | `features/owner/cities.js:11` | cidade | abre o painel lateral da cidade | `features/owner/review.js:97` |
| `owner-remind` | `features/owner/business-team.js:19` | id do negócio | registra lembrete e avisa | `features/owner/review.js:98` |
| `owner-mod-invite` | `features/owner/business-team.js:45` | — | abre "Convidar moderador" | `features/owner/review.js:99` |
| `owner-mod-send` | `features/owner/business-team.js:48` | — | grava o convite de moderação | `features/owner/review.js:100` |
| `owner-invite` | `features/owner/cities.js:23` | cidade | grava o convite de embaixador | `features/owner/review.js:101` |
| `owner-city-stale` | `features/owner/cities.js:23` | cidade | fecha o painel, filtra a cidade e abre Filas em "Perguntas" | `features/owner/review.js:102` |
| `support-topic` | `features/support/help.js:59` | `conta`/`comunidade`/`anuncios`/`seguranca`/`outro` | marca o chip escolhido (`selected`) | `features/support/help.js:152-155` |
| `support-send` | `features/support/help.js:63` | — | valida e grava o chamado; `"Recebemos. Respondemos por e-mail em até 2 dias úteis."` | `features/support/help.js:156` |
| `account-delete` | `features/support/help.js:93` | — | valida "APAGAR", apaga a conta e vai para `entrar`/`apagada` | `features/support/help.js:158` (+ `accountDelete` em `:132`) |

---

### Ações sem efeito ou sem emissor

| Ação | Onde aparece (arquivo:linha) | data-value | Efeito visível | Tratada em (arquivo:linha) | Situação |
|---|---|---|---|---|---|
| `catalog-filter` | **sem emissor localizado** (nenhum `data-action="catalog-filter"` em `src/`) | — | definiria `catalogFilter` e redesenheria — **nada acontece hoje** | `app/handlers.js:56` | Ação morta: existe no `switch`, sem emissor no protótipo (A). Por isso `#catalogo` abre sempre como Desapegos. |
| `search-from-home` | **sem emissor localizado** — o `#home-search` é `<button>`, sem `.value` (`features/home/views.js:17`; `home/desktop.js:10`) | — | leria o valor do campo e iria para `busca` — inalcançável | `app/handlers.js:42` | Ação sem emissor (C); a Início usa `data-action="search"`, tratada em `handlers.js:41`. |
| `noop` | **sem emissor** — nenhuma emissão encontrada nas áreas (D) nem no insumo | — | não faz nada (efeito nulo declarado) | `features/groups/handlers.js:47` | Ação sem emissor e sem efeito, mantida de propósito como `noop`. |
| `choose-proposal` (emissor `proposalCard`, `views.js:9`) | `features/requests/views.js:9` — **emissor morto**: o botão só renderiza se `showChoose` for passado, e nenhum chamador passa (único chamador é `views.js:16`) | `{rid}\|{pid}` | nada — o botão "Escolher esta proposta" nunca é desenhado nesse caminho | `features/requests/handlers.js:18-26` | Emissor morto (G). A ação em si é viva pelo outro emissor (`views.js:36`), já contada na tabela 1 — esta linha **não** entra na contagem de distintas. |
| (qualquer `data-action` não tratado) | HTML de qualquer view | — | diálogo "Ação indisponível nesta rodada" / "Este recurso não está disponível neste contexto da demonstração. Consulte os dados existentes ou retorne à página anterior." | `app/handlers.js:144` (`default:`) → `showGlobalDependency` (`:151-156`) | Não é uma ação nomeada: é o destino de qualquer ação desconhecida. Nenhuma ação do inventário cai aqui. |

---

### Contagem

| Métrica | Número | Fonte |
|---|---|---|
| Ações **distintas** no inventário | **289** | 286 da tabela 1 (280 linhas, das quais 2 agrupam 3 + 5 ações: `280 − 2 + 8 = 286`) + 3 da tabela 2 (`catalog-filter`, `search-from-home`, `noop`). A linha de `choose-proposal` (emissor morto) não foi contada de novo. |
| Com efeito de produto | **286** | tabela 1 — toda ação com emissor e despachante identificados, que navega, abre overlay, grava estado ou emite mensagem literal |
| Sem emissor | **3** | tabela 2: `catalog-filter`, `search-from-home`, `noop` — os três relatórios de área (A e C) e o de D afirmam explicitamente "nenhum emissor"; o insumo mecânico confirma o `case` sem emissor. Mais o emissor morto de `choose-proposal` (`views.js:9`), que não é uma ação sem emissor, e sim um emissor que nunca renderiza. |
| Sem tratamento localizado | **0** | todas as 289 têm `case` no `switch` de `app/handlers.js`/`handlers.js` das features ou despachante de módulo (`messagingAction`, `groupAction`, `requestAction`, `manageAction`, `blockAction`, `hiddenAction`, `planAction`, `ownerAction`, `supportAction`, `entryAction`, `landing`/`account`/`login`/`arrive`, `filters.js`/`map.js`/`hood-panel.js`/`banner`/`compare.js`/`alerts.js`/`share-card.js`/`wizard.js`/`paged-list.js`/`bubbles.js`/`plans.js`/`push-install.js`). O que não for tratado cai no `default:` (`app/handlers.js:144`) e mostra "Ação indisponível nesta rodada" — nenhuma ação listada aqui está nessa situação. |
| Grupos por família dinâmica | **2** | `wiz-*` (3 ações) e `item-*` (5 ações) — agrupamento pedido no capítulo; não reduz a contagem de distintas. |

**Observações de fronteira (para não confundir casca com produto).**

- `nav`, `back`, `home`, `city`, `search`, `create`, `settings`, `prototype`, `close-dialog`,
  `cancel-confirm`, `accept-confirm`, `undo`, `home-city`, `clear-search` são ações de casca, mas
  produzem efeito visível de produto (navegação/overlay) e por isso estão na tabela 1.
- `filterChips` (`features/listings/catalog.js:1`) não é ação: é o helper que emite `saved-filter`,
  `my-ads-filter`, `search-type`, `biz-filter`, `question-filter`, `group-filter`, `agenda-filter` e as
  ações do Painel (`owner-city`/`owner-status`/`owner-sort`/`owner-tab`/`owner-go`), todas na tabela 1.
- O insumo mecânico lista dezenas de nomes que **não** são ações (`card-body`, `detail-hero`, `md-dialog`,
  `ow-*`, `prop-*`, `en-*`, `plan-head`, `notice-button`, `empty-art`, `danger-fill`, `pt-BR`, `E-mail`,
  `Avise-me`…). São classes CSS, ids ou literais de texto capturados pela heurística; foram conferidos
  contra os relatórios de área e não entraram nas tabelas.
- `post-type`, `cover-photo`, `remove-photo` aparecem em dois editores (anúncio e negócio/pedido), mas são
  a mesma ação com um `case` cada — uma linha por ação, não por editor.
- Ações com efeito só de demonstração (`simulate-alert`, `simulate-answer`, `simulate-message`,
  `simulate-moderation`, `simulate-proposals`, `simulate-biz-contact`, `support-simulate`,
  `apply-prototype`, `reset-prototype`) estão na tabela 1 porque emitem, gravam estado e produzem
  mensagem literal; o relatório de área marca todas como "modo teste".

---

## 5. Casca

Inventário da casca do protótipo HTML (`prototypes/bivaque-html/src/`) para a reescrita em
Next + shadcn/ui. A casca é o que existe fora das páginas: `shell/template.html`, o roteamento de
`shell/navigation.js`, os overrides globais (`dialogs`, `toasts`, `create-menu`, `command-palette`)
e o estado em `app/state.js`. Cada afirmação cita `arquivo:linha` (1-based). Texto de interface
está entre aspas, literal.

Resumo em 5 linhas:
1. A casca é um DOM fixo mínimo (`#topbar`, `#main`, `#nav`, `#fab`, `#detail-actions`, `#dialog`,
   `#confirm-dialog`, `#snackbar`) mais cinco nós criados em tempo de execução (`#lightbox`,
   `#filter-panel`, `#palette`, `#toast-stack`, `#context-preview`).
2. `render()` (`shell/navigation.js:107`) reescreve `#topbar`, `#nav` e `#main` a cada rota; o
   resto da casca é estável.
3. O roteamento é hash-based com `history.pushState` e um mapa de contexto guardado em
   `history.state.navigation` (`shell/navigation.js:22`, `:46`).
4. Estado persistido inteiro em `localStorage`, chave `bivaque-material-web-v3`
   (`data/demo/model.js:1`), `schema:2` (`app/state.js:10`).
5. Toda a persistência é por dispositivo (um único localStorage), nunca por conta no servidor.

### 1. Estrutura do DOM (`shell/template.html`)

O arquivo tem 232 linhas; o corpo útil vai da linha 3 à 8. Elementos de topo, na ordem do documento:

| elemento | linha | papel |
|---|---|---|
| `#loading` (`div.loading`, `role="status"`) | `shell/template.html:4` | tela de carregamento com o símbolo da marca e o texto "Carregando o Bivaque…"; é removido no boot (`app/start.js:9`) |
| `#app-shell` (`hidden`) | `shell/template.html:5` | contém toda a casca do app; `hidden` até o boot (`app/start.js:9`) |
| `#topbar` (`header.topbar`) | `shell/template.html:5` | barra do topo; conteúdo reescrito por `shell()` (`shell/navigation.js:60`) |
| `#main` (`main`, `tabindex="-1"`, `aria-label="Conteúdo"`) | `shell/template.html:5` | região rolável e alvo de foco; recebe `<div class="page …" id="page">…</div>` em `render()` (`shell/navigation.js:107`) |
| `#nav` (`nav.nav-main`, `aria-label="Navegação principal"`) | `shell/template.html:5` | navegação inferior (celular) / rail (desktop); reescrita em `shell/navigation.js:65` |
| `#fab` (`md-filled-tonal-button.create-fab`) | `shell/template.html:5` | botão Criar; fixo `type="button" data-action="create" aria-label="Criar publicação" aria-haspopup="menu" aria-expanded="false" aria-controls="create-menu"`; contém `<md-icon slot="icon">add</md-icon>` e `<span class="fab-label">Criar</span>` |
| `#detail-actions` (`div.detail-actions`, `hidden`) | `shell/template.html:5` | barra de ações do detalhe; preenchida por `actionsBar()` (`shell/navigation.js:69`) e escondida a cada `shell()` (`:67`) |
| `#create-scrim` (`div.create-scrim`, `hidden`) | `shell/template.html:6` | véu do menu Criar; trata clique-fora (`shell/create-menu.js:72`) |
| `#create-menu` (`div`, `role="menu"`, `aria-label="Criar publicação"`, `hidden`) | `shell/template.html:6` | menu Criar; `role`/`aria-label` trocados quando painel/contexto (`shell/create-menu.js:31`) |
| `#dialog` (`md-dialog.form-dialog`) | `shell/template.html:7` | folha/diálogo principal (`shell/dialogs.js:5`) |
| `#confirm-dialog` (`md-dialog.small-dialog`, `type="alert"`) | `shell/template.html:7` | diálogo de confirmação (`shell/dialogs.js:20`) |
| `#snackbar` (`div`, `role="status"`, `aria-live="polite"`) | `shell/template.html:7` | aviso mais recente (`shell/toasts.js:23`) |
| `<noscript>` (`.startup-error`) | `shell/template.html:8` | "Ative o JavaScript para navegar e usar os componentes Material Web." |

Não estão no template e são criados em execução: `#lightbox`
(`features/listings/photos.js:33`, `div#lightbox role="dialog" aria-modal="true" tabindex="-1"`),
`#filter-panel` (`features/listings/filters.js:122-123`, um `<dialog id="filter-panel">`),
`#palette` (`shell/command-palette.js:9`), `#toast-stack` (`shell/toasts.js:11`) e
`#context-preview` (`shell/create-menu.js:38`).

`<head>`: `<meta name="theme-color" content="#F2F0EB">`, `rel="manifest"`,
`apple-touch-icon`, `apple-mobile-web-app-*` e `<meta name="material-web-version" content="2.5.0">`
(`shell/template.html:1`). O favicon é um SVG inline (`:2`). O CSS entra por
`<style>{{BIVAQUE_INLINE_0}}</style>` (`:3`).

#### Ordem dos marcadores de build

Quatro marcadores, resolvidos por `prototypes/bivaque-html/src/manifest.json`. A ordem em
`template.html` é:

1. `{{BIVAQUE_INLINE_0}}` — dentro de `<style>`, no `<head>` (`shell/template.html:3`); `kind:"style"`,
   33 arquivos, de `styles/fonts.css` a `styles/high-contrast.css` (`src/manifest.json:9-46`).
2. `{{BIVAQUE_INLINE_1}}` — primeiro `<script>` do fim do `<body>` (`shell/template.html:230`);
   `vendor/material-web-2.5.0.js` (`src/manifest.json:49-54`).
3. `{{BIVAQUE_INLINE_2}}` — segundo `<script>` (`shell/template.html:231`); dados base:
   `data/demo/material-version.js`, `source.js`, `assets.js` (`src/manifest.json:57-64`).
4. `{{BIVAQUE_INLINE_3}}` — terceiro `<script>` (`shell/template.html:232`); todo o app, 83 arquivos,
   começando por `app/open.js` e terminando em `app/start.js` (`src/manifest.json:67-155`).

Os elementos `md-*` que a casca usa diretamente: `md-filled-tonal-button` (`#fab`, itens do menu
Criar — `shell/primitives.js:6`), `md-text-button` (chip de cidade), `md-icon-button`
(`shell/primitives.js:8`), `md-icon` (`utilities/format.js:4`), `md-dialog` (`#dialog`,
`#confirm-dialog`), `md-filled-text-field` (campo de busca — `shell/navigation.js:64`),
`md-ripple` e `md-focus-ring` (itens do painel Criar — `shell/create-menu.js:15`).

### 2. Barra do topo

Construída por `shell()` em `shell/navigation.js:55-68`. Toda renderização reescreve
`$('#topbar').innerHTML` (`:60`). A lógica tem dois ramos:

- **Rotas-raiz** (`inicio`, `comunidade`, `conversas`, `voce` — `rootPage`, `:59`): à esquerda a marca
  (`mark()` + `.brand-text`, que mostra "Bivaque" em `inicio` e `titleForRoute()` nas outras —
  `:60`); à direita o chip de cidade e, só em `inicio`, o botão de avisos.
- **Demais rotas**: à esquerda o botão "Voltar" (`iconBtn('arrow_back','back','','Voltar')`) e o
  título — exceto na conversa, onde entra `chatTopTitle()` (`:78`). À direita, `chatTopActions()`
  (`:79`) ou `questionTopActions()` (`features/community/manage.js:11`) ou, na falta deles, o botão
  "Buscar" (`iconBtn('search','search','','Buscar')`) — `shell/navigation.js:60`.

`titleForRoute()` (`shell/navigation.js:53`) define os títulos: "Bivaque" (`entrar`, `inicio`),
"Painel do Bivaque" (`dono`), "Comunidade", "Conversas", "Você", "Buscar",
"Desapegos"/"Imóveis" (`catalogo`, conforme `catalogKind()`), "Negócios locais", "Anúncio",
"Negócio local", "Indicação", "Grupo", "Publicação", "Encontro", "Agenda da cidade", "Salvos",
"Meus anúncios", `Guia de ${state.city}`, "Conversa", "Minhas indicações", "Pedidos de serviço",
"Pedido de serviço", "Política de privacidade", "Código de conduta", "Ocultados",
"Pessoas bloqueadas", "Ajuda", "Fale com a gente", "Meus chamados", "Apagar a conta"; fallback
"Bivaque". `document.title` recebe `${titleForRoute()} · Bivaque` (`render()`, `:107`).

`activeTab()` (`shell/navigation.js:54`) mapeia cada rota para a aba iluminada: raiz → ela mesma;
`conversa` → `conversas`; `grupo`/`publicacao`/`pergunta`/`minhas` → `comunidade`;
`salvos`/`meus-anuncios`/`ocultados`/`bloqueados`/`privacidade`/`conduta`/`ajuda`/`contato`/`chamados`/
`apagar-conta` → `voce`; senão `origin`.

#### Busca

Na rota `busca` a barra vira um campo em tela cheia (`shell/navigation.js:64`): um
`.search-topbar` com Voltar, `md-filled-text-field#search-query` (`type="search"`,
`inputmode="search"`, `placeholder="Buscar no Bivaque"`, `aria-label="Buscar no Bivaque"`,
`autofocus`) com `icon('search','leading-icon')` e o botão "Limpar busca" no slot
`trailing-icon`. `#topbar` ganha `.searching` e `body` ganha `.search-mode` (`:63`); o CSS dá 76px
à barra de busca e recoloca `#main` (`styles/overlays.css:28-32`).

#### Título grande que sobe (`syncTopTitle`)

`syncTopTitle()` (`shell/navigation.js:80-90`) é chamada no fim de `shell()` (`:66`), no scroll
(`:100`) e no resize (`:103`). Ela:

- lê o título grande em `$('#main .page-head h1')` (`:81`);
- calcula `dock = innerWidth<720 && h && !['inicio','busca','conversa'].includes(route.name)` (`:87`);
- liga `.title-hides` quando `dock` (`:88`) e, se não `dock`, remove `.title-docked` e sai (`:88`);
- liga `.title-docked` quando `h.getBoundingClientRect().bottom <= bar.bottom + 4` (`:89`).

O efeito é CSS de `styles/top-title.css`: com `.title-hides`, `.top-title` e `.brand-text` ficam
`opacity:0` e sobem 6px; com `.title-hides.title-docked` voltam a `opacity:1` (`top-title.css:5-6`),
e a borda inferior desaparece enquanto não estiver docked (`:7`). Só existe abaixo de 720px (`:4`).

#### Barra transparente na foto (modo imersivo)

No mesmo `syncTopTitle()`: `immersive = innerWidth<720 && $('#main .detail-hero') && ['anuncio','negocio'].includes(route.name)`
(`shell/navigation.js:84`). `document.body` recebe a classe `.immersive` (`:85`), e `#topbar` recebe
`.bar-solid` quando o fundo do hero já passou por baixo dela (`:86`). O CSS
(`styles/detail-immersive.css:4-13`) põe a barra transparente sem `.bar-solid`, esconde o
`.top-title` e transforma os `md-icon-button` em círculos escuros sobre a foto; `#main` sobe a
`top:0` e o `.page` perde o padding de topo (`:5-6`). O hero vira 4/3 de borda a borda (`:7`).

#### Chip de cidade e troca de cidade

O chip é `btn(state.city,'city','','text','expand_more')` com a classe injetada `city-chip`
(`shell/navigation.js:60`). Abaixo de 1024px o chip some da barra, salvo quando a barra tem
`.away` (`styles/nav-bar.css:12`); `.away` é ligado quando `readonly() && route.name!=='inicio'`
(`shell/navigation.js:62`), ou seja, vendo outra cidade fora da Início. `readonly()` é
`state.city!==state.homeCity` (`app/state.js:58`). O estilo do chip (cor `--bv-accent-text` e
altura 44px) está em `styles/base.css:47` e `:27`.

A ação `city` abre o diálogo de cidade (`app/handlers.js:62` → `openCity()`,
`features/profile/settings.js:1`); `apply-city` (`app/handlers.js:63-67`) valida e grava
`state.city`/`mode`/`arrival`/`leaveDate`/`dest`; `home-city` (`:68`) volta para `state.homeCity`.
O formulário em si pertence ao capítulo de rotas; aqui só vale a casca: o chip mostra `state.city`
e o estado `readonly()` alimenta a faixa `.context-strip.readonly` (`shell/navigation.js:108`:
"Você está conhecendo <b>{cidade}</b>. Sua cidade atual é {homeCity}." + botão "Voltar").

#### Avisos e contador de não lidos

Só em `inicio` (`shell/navigation.js:60`) a barra mostra o botão de avisos
(`iconBtn('notifications','notices','','Avisos')`) com `.badge` quando há não lidos. A contagem é
`noticeList().filter(n=>n.unread).length` (`:59`), com `noticeList()` definida em
`features/profile/demo-actions.js:21` (avisos da cidade do lar, filtrados por visibilidade). O
badge de conversas não lidos (`chats`) é calculado em `shell/navigation.js:59` e desenhado sobre o
item "Conversas" da navegação (`:65`).

#### Ações de topo por rota

`chatTopActions()` (`shell/navigation.js:79`) só aparece em `conversa` e devolve
`<span class="tb-desk">` com "Buscar" no desktop e `<span class="tb-phone">` com
`iconBtn('more_vert','thread-menu',t.id,'Opções da conversa')` no celular. `chatTopTitle()`
(`:78`) desenha dois spans: `.tb-desk-title` (título "Conversa" no desktop) e `.top-chat`
(avatar + `<b>{quem}</b>` + `<small>{assunto}</small>` no celular). A troca desktop/celular é CSS
(`styles/chat-mobile.css:8`, `:12`).

`questionTopActions()` (`features/community/manage.js:11`) só aparece em `pergunta` quando a
pergunta é sua, não está oculta e não é visita a outra cidade: devolve "Buscar" no desktop e
`iconBtn('more_vert','question-menu',q.id,'Opções da pergunta')`.

#### Onde a barra some

`entry-mode` esconde `#topbar`, `#nav` e `#fab` (`styles/entry.css:5`; `main` passa a `inset:0`,
`:6`). `shell()` liga `entry-mode` com `entryChrome()` (`shell/navigation.js:58`), que é
`route.name==='entrar' || ((legalRoute()||supportRoute()) && state.signedOut)`
(`features/legal/pages.js:21`). `owner-mode` também esconde `#topbar`, `#nav` e `#fab`
(`styles/owner.css:6-7`), ligado em `dono` (`shell/navigation.js:57`) — nesse caso a barra chega a
ser construída em `:60`, mas o CSS a esconde.

### 3. Navegação

Construída em `shell/navigation.js:65`. São sempre os mesmos quatro destinos, na ordem
`[['inicio','Início'],['comunidade','Comunidade'],['conversas','Conversas'],['voce','Você']]`,
cada um um `<button class="nav-item" data-action="nav" data-value="{n}">` com
`aria-current="page"` quando `activeTab()===n`. Antes de "Conversas" é injetado
`<span class="nav-create-slot" aria-hidden="true">Criar</span>` (`:65`), que no celular é a quinta
coluna visível (o rótulo "Criar") e cujo clique chama `$('#fab').click()` (`:66`).

Ícones: `NAV_SVG` é um objeto com três desenhos próprios em SVG (`inicio`, `comunidade`,
`conversas` em `shell/navigation.js:72`), traço 1,9px, baseados no Lucide (ISC — comentário em
`:70-71`). A aba `voce` não usa SVG: `navIcon('voce')` desenha `<span class="nav-avatar">` com as
iniciais de `state.profile.name` (`:73`, via `initals()` em `utilities/format.js:11`).

Luz da aba ativa: o desenho tem uma parte preenchível `.f`; com
`.nav-item[aria-current=page] .nav-svg .f{fill-opacity:.22}` (`styles/nav-bar.css:8`) e o
`.nav-icon` ganha fundo `surface-container-high` (`styles/base.css:27`). O avatar ativo troca de
fundo (`styles/nav-bar.css:10`). Comentário de rodada 70 diz que a aba ativa é o "pill" de 10px no
lugar da luz no topo (`styles/nav-bar.css:17`; `.nav-icon{border-radius:10px}` em
`styles/navigation.css:9`).

Extremidades do rail: `.rail-brand` (a marca) e `.rail-tools` (dois botões:
`iconBtn('tune','prototype','','Controles do protótipo')` e
`iconBtn('settings','settings','','Configurações')`) — `shell/navigation.js:65`. Ambos são
`display:none` no celular e viram `grid` a partir de 720px (`styles/base.css:27` e `:29`).

#### Faixas de largura

- **Celular (<720px)**: `#nav.hidden = mobile && !rootPage` — só as rotas-raiz mostram a barra
  inferior (`syncMobileNavigation`, `shell/navigation.js:93`). A grade tem 5 colunas
  (`styles/nav-bar.css:14`), fundo da superfície e sombra para cima (`:14`), o `.nav-create-slot`
  visível (`:15`). O `#fab` também só aparece nas raiz (`shell/navigation.js:94`) e fica elevado no
  centro (`styles/nav-bar.css:18`).
- **≥720px**: `--rail:96px` e `--bottom:0` (`styles/base.css:29`); `#nav` vira rail vertical à
  esquerda (`width:96px`, borda à direita, brand no topo, tools no pé — `styles/base.css:29`). O
  `.nav-create-slot` fica `display:none` (`styles/nav-bar.css:11`). `#nav.hidden` nunca é ligado no
  desktop (a condição exige `mobile`). O `#fab` vira botão quadrado no topo-esquerda
  (`styles/create-menu.css:17`, `styles/base.css:29`).
- **≥1024px**: o Criar vira a pílula "Criar" com rótulo e o painel de criação entra no lugar do
  menu em pilha (`styles/create-rail.css:11-20`); o item de menu do painel é uma grade de 2
  colunas (`styles/create-rail.css:30`).

#### Minimizar a navegação ao rolar

`syncMobileNavigation()` (`shell/navigation.js:91-96`) espelha `navMinimized` na classe
`.minimized` do `#nav` e na classe `.compact` do `#fab`, só no celular e nas rotas-raiz (`:93-94`).
O cálculo de `navMinimized` está no listener de scroll (`:97-101`): com `innerWidth<720`, sem menu
Criar aberto e em rota-raiz, `y>lastNavY+6 && y>140` liga; `y<lastNavY-6 || y<60` desliga
(`:99`). `navMinimized` também é zerado em `navigate()` (`:44`) e no `popstate` (`:52`).
CSS: `.nav-main.minimized{transform:translateY(100%);pointer-events:none}`
(`styles/navigation.css:6`); `.create-fab.compact` desce e encolhe (`:10-12`).

#### `inert` e foco quando há overlay

`#nav.inert` é ligado quando `(mobile && (!rootPage || navMinimized)) || createOpen || paletteIsOpen() || Boolean($('#lightbox'))`
(`shell/navigation.js:93`). O menu Criar põe `#main`, `#nav` e `#topbar` `inert` ao abrir
(`shell/create-menu.js:41`; libera `#topbar` se a âncora não for o `#fab`, `:43`) e reverte em
`closeCreateMenu` (`:66`). A paleta põe `inert` em `['#main','#nav','#topbar','#fab','#detail-actions']`
(`shell/command-palette.js:8`, `:41`) e libera em `closePalette` (`:44`). O lightbox faz o mesmo
com `LIGHTBOX_BEHIND` (`features/listings/photos.js:42`).

O foco guardado/restaurado da casca: `globalFocusDescriptor()` (`shell/navigation.js:5-9`) grava
`{id,action,value}` do alvo; `globalFocus()` (`:10-15`) e `navigationFocus()` (`:16-21`) o
recompõem — `navigationFocus` cai para `$('h1',root)||$('#page')` se o alvo sumiu ou está em
`[hidden],[inert]` (`:19`). É chamado ao fim de `navigate()` para todas as rotas menos
`conversa` e `busca` (`:48`).

### 4. Menu Criar (`shell/create-menu.js`)

**O que abre.** `openCreate(anchor=$('#fab'),customChoices=null,contextMenu=false,label='')`
(`shell/create-menu.js:17`). Chamado pela ação `create` (`app/handlers.js:83`) com o elemento
clicado como âncora. É o mesmo motor para o menu Criar e para os menus de contexto por item
(`contextMenu=true`, com `label` próprio — `:16`).

**Itens (celular/contexto)** — `shell/create-menu.js:21-29`, cada um
`md-filled-tonal-button.create-menu-action role="menuitem" data-action="…"`:

| ícone | texto | `data-action` | subtítulo |
|---|---|---|---|
| `volunteer_activism` | "Pedir indicação" | `ask` | — |
| `build` | "Contratar serviço" | `create-request` | "Propostas de empresas do ramo" |
| `sell` | "Anunciar desapego" | `create-item` | — |
| `apartment` | "Anunciar imóvel" | `create-property` | — |
| `add_business` | "Indicar um negócio" | `indicate` | "Quem você já contrata e confia" |
| `event` | "Criar encontro" | `create-event` | "Com local, data e horário" |
| `storefront` | "Divulgar meu negócio" | `my-biz` | — |

Os destinos são resolvidos no `switch` de `app/handlers.js` (`ask` `:129`, `create-request`
`features/requests/*`, `create-item` `:84`, `create-property` `:85`, `indicate` `:117`,
`create-event` `:33`, `my-biz` `:110`).

**O mesmo menu no desktop (`create-rail`).** Quando `!customChoices && !contextMenu && anchor.id==='fab' && (min-width:1024px)`
(`shell/create-menu.js:5` e `:30`), o conteúdo é trocado por `createPanelHtml()`
(`:15`): cabeçalho "Criar no Bivaque" + "O que você quer publicar ou pedir?", um `<kbd>` "C" e um
botão fechar; uma `.cp-grid` de 2 colunas com sete opções, as mesmas ações de
`CREATE_PANEL_CHOICES` (`:6-14`), cada uma com subtítulo próprio e ícone colorido por `cp-*`. O
`role` do contêiner passa a `dialog` e o `aria-label` a "Criar publicação" (`:31`); a âncora ganha
`aria-haspopup="dialog"` (`:40`). A opção "Contratar serviço" recebe um selo `.cp-new` "Novo"
(`:15`). O painel se abre com `createPanelMorph()` (clip-path a partir do retângulo do botão —
`:86-91`); o botão `#fab` some enquanto o painel está aberto
(`styles/create-rail.css:24`). O painel fecha sozinho se a janela encolher para menos de 1024px
(`:84`).

**Fechamento.** Três caminhos: `Escape` (`:75`), clique no `#create-scrim` (`:72`) e o "Voltar"
do navegador — o `popstate` chama `closeCreateMenu(true,false)` quando `createOpen`
(`shell/navigation.js:52`). `closeCreateMenu(restoreFocus=true,dropHistory=true)`
(`shell/create-menu.js:61`) toca `aria-expanded="false"` na âncora (`:65`), devolve o foco
(`:69`) e, se `dropHistory`, faz `history.back()` (`:68`). Saída animada: escala a partir de
`scale(.6)` ou o morph inverso, só se `prefers-reduced-motion` não estiver ligado (`:63`).

**Posicionamento.** `placeCreateMenu()` (`:52-60`): painel (≥1024) fica ancorado ao retângulo do
botão com largura `min(620, innerWidth-24)`; a pilha tem largura `min(262, innerWidth-24)`, abre
acima se `anchor.top > innerHeight/2`, centraliza quando a âncora é o `#fab` no celular e, no modo
contexto, usa um `#context-preview` clonado da âncora (`:38`, `:58`).

**Histórico e teclado.** Ao abrir faz `history.pushState({…,createMenu:true,overlayDepth:+1})`
(`:44`); o `overlayDepth` é a base do "voltar fantasma" do `popstate`
(`shell/navigation.js:52`, `:109`). O foco vai ao primeiro `.create-menu-action` (`:49`) e as
setas/`Tab`/`Home`/`End` navegam por `createFocusIndex` (`:76-81`). No desktop, a tecla `C`
(configurável via `aria-keyshortcuts` — `:99`) abre o Criar fora de campos de texto
(`:93-96`).

### 5. Busca global

#### Rota `busca`

A barra vira o campo em tela cheia descrito em §2 (`shell/navigation.js:64`). O input é ligado em
`bindScreen()` (`shell/bindings.js:6-7`): foco automático no quadro seguinte, `input` com atraso de
120ms repovoando `#search-results` e `Enter` chamando `saveRecent(q.value)`. `saveRecent()`
(`shell/bindings.js:13`) grava em `state.recent` (máximo 8, sem repetir). Ações da rota no
`switch`: `clear-search` (`app/handlers.js:43`, limpa e volta se já estava vazio),
`recent-search`/`guide-search` (`:44`), `search-fill` (`:46`), `clear-recent` (`:47`, limpa
`state.recent` e avisa "Buscas recentes apagadas"), `search-explore` (`:48`), `search-type` (`:49`).
O layout de linhas/tiles/atalhos é CSS de `styles/search-mobile.css`, incluindo o título repetido
escondido abaixo de 720px (`:20`).

#### Paleta de comandos (`shell/command-palette.js`)

Aberta por `Ctrl+K`, `⌘K` ou `/`, só no desktop (`createPanelMQ`, `:47-54`); `/` é ignorado dentro
de campos (`:51`), e a paleta não abre com menu Criar/diálogo/lightbox/painel de filtro abertos
(`:53`). Não abre para quem saiu nem na entrada (`:40`).

Criada uma vez em `paletteEl()` (`:9`), sob `document.body`, com:
`.palette-scrim` (`data-palette-close`), `.palette-box role="dialog" aria-modal="true" aria-label="Buscar e ir para"`,
o `input#palette-input role="combobox"` (`aria-label="Buscar ou ir para"`, `aria-controls="palette-list"`,
`aria-autocomplete="list"`, `placeholder="Buscar negócios, anúncios, perguntas ou ir para…"`), a
lista `#palette-list role="listbox"`, um `#palette-count aria-live="polite"` e o rodapé com
"↑↓ navegar", "↵ abrir", "Esc fechar" (`:9`).

**Grupos e itens.** Sem busca: `Ações` (3 primeiros de `PALETTE_CREATE`), `Ir para` (6 primeiros de
`PALETTE_PAGES`) e `Buscas recentes` (`state.recent` — `:23`). Com busca, na ordem: `Negócios`,
`Anúncios`, `Perguntas`, `Grupos`, `Ações`, `Ir para` e um item final sem título
`Buscar "{q}" em tudo` (`:29`). `PALETTE_PAGES` (`:5`) tem as 11 páginas (Início, Comunidade,
Conversas, Negócios locais, Desapegos, Imóveis, Agenda da cidade, Salvos, Pedidos de serviço, Guia
da cidade, Você); `PALETTE_CREATE` (`:6`) tem 6 ações de criação. Cada item leva `ic`, `label`,
`sub`, `action` e `value`; ao acionar, `runPalette()` fecha a paleta e chama `perform(action,value)`
(`:45`). Os labels são destacados com `<mark>` sem depender de acento (`paletteMark()`, `:17-19`).

**Teclado e foco.** `ArrowDown`/`ArrowUp` movem `paletteActive`; `Enter` abre; `Escape` fecha
(`:37`); `Tab` devolve o foco ao input (`:13`). O input usa `aria-activedescendant` para o item
ativo (`setPaletteActive()`, `:36`); hover também muda a seleção (`:11`). `openPalette()` guarda o
elemento de foco em `paletteReturn` (`:40-41`); `closePalette(restoreFocus=true)` o devolve (`:44`).
`popstate` fecha a paleta (`:56`). Ao abrir, liga o `inert` descrito em §3 (`:41`). CSS em
`styles/command-palette.css`; o `kbd` é estilizado em `:11`; `#palette-live` é
visualmente oculto (`:32`).

### 6. Diálogo, confirmação, folhas

#### Assinaturas exatas

- `showDialog(title, content, actions, kind='generic')` — `shell/dialogs.js:2`. Grava o
  `dialogReturnDescriptor` (`:3`), fecha o menu Criar (`:4`), grava `dialog.dataset.kind=kind` e
  monta `<div slot="headline">` com `.sheet-grab` + título + botão "Fechar", `<div slot="content">`
  e `<div slot="actions">` (`:5`). Empilha histórico (`pushDialogHistory()`, `:8`), abre
  (`dialog.show()`, `:6`) e liga `bindDialog()` + `bindSheetDrag()` (`:6`). Para `kind!=='editor'`
  zera `editor`/`editorDirty` (`:6`).
- `closeDialog(force=false, dropHistory=true)` — `:13`. Com `editorDirty` e sem `force`, chama
  `confirm('Descartar alterações?','Você pode continuar editando ou descartar o que ainda não foi salvo.', …)`
  e só fecha se a pessoa descartar. Ao fechar, faz `dropDialogHistory()` (`:9-12`, `history.back()`
  quando `history.state.dialog`).
- `confirm(title, text, fn, {ok='Confirmar', cancel='Continuar', danger=false}={})` — `:20`.
  Monta o `#confirm-dialog` com `slot="headline"`, `slot="content"` (quebra por `\n`), e duas ações:
  `cancel` e `accept-confirm` (com `.danger-fill` quando `danger`). Guarda `fn` em
  `confirmDialog._accept`, empilha histórico (`confirm:true`) e abre.
- `leaveDialog(then)` — `:15-19`. Sai de um diálogo para outra página; com edição não salva
  pergunta antes.

`#confirm-dialog` é `type="alert"` (`shell/template.html:7`), `max-width:440px`
(`styles/base.css:27`, `.small-dialog`). `#dialog.form-dialog` tem `max-width:660px` e, no
celular, encosta no fundo (`styles/overlays.css:2`, `:9`); `data-kind="editor"` a deixa em altura
de tela cheia (`:3`), `data-kind="prototype"` vira gaveta lateral de 400px (`:4`, `:8`).

**Histórico, foco e `Esc`.** `pushDialogHistory()` (`:8`) / `dropDialogHistory()` (`:9-12`) e
`dropConfirmHistory()` (`:21`) espelham `history.back()`. O evento `cancel` do `md-dialog` (Esc) é
interceptado para respeitar `editorDirty` (`:23` — `e.preventDefault(); closeDialog()`). No
`closed`, o diálogo limpa `editor`/`editorDirty`, dropa o histórico e restaura o foco
(`:24`). No `closed` do confirm, o foco vai para o alvo guardado ou para o "Fechar" do diálogo
(`:22`). O `popstate` fecha confirm → menu Criar → diálogo nessa ordem
(`shell/navigation.js:52`).

#### Pilha de folhas e `sheet-depth`

`sheet-depth.js` observa `open`/`close` do `#dialog` e liga `body.sheet-depth` quando
`innerWidth<720` e `dialog.dataset.kind!=='prototype'` (`shell/sheet-depth.js:3-5`), o que encolhe a
página de trás (`styles/sheets.css:5-6`). A folha tem um `.sheet-grab` arrastável
(`shell/dialogs.js:31-36`): arrastar mais de 110px (ou 30px com velocidade >.5) fecha a folha;
`bindSheetDrag` só age abaixo de 720px e fora do `kind=prototype` (`:33`). A animação de
abertura/fechamento é `overlayAnimation()` (`:25-30`): sobe de `translateY(105%)` no celular, entra
de `translateX(100%)` na gaveta de protótipo.

#### Lightbox

**Não é da casca**: é criado por `features/listings/photos.js:33` (ação `lightbox` em
`app/handlers.js:91`). O `#lightbox` (`role="dialog" aria-modal="true" tabindex="-1"`) traz contagem
`aria-live`, botão fechar, estágio com anterior/próxima, imagem e miniaturas. `closeLightbox()`
(`features/listings/photos.js:42`) libera `inert` e o `popstate` a fecha quando `$('#lightbox')`
existe (`shell/navigation.js:52`). A casca só interage com ela via `inert`/`syncMobileNavigation`.

### 7. Avisos

`notify(text, ic='check_circle', undo=null)` — `shell/toasts.js:18`.

- **Empilhamento**: se o aviso atual tem `undo`, ainda está visível e faltam mais de 600ms, o
  anterior sobe para `#toast-stack` (máximo `TOAST_STACK_MAX=2`) guardando o próprio desfazer e o
  tempo restante (`shell/toasts.js:8`, `:20`, `:12-16`). Caso contrário, o timer anterior é
  cancelado (`:21`).
- **Desfazer**: um aviso com `undo` dura `TOAST_UNDO_MS=7000` e mostra o botão "Desfazer"
  (`:8`, `:10`); sem `undo`, `TOAST_MS=4200` (`:8`). O botão emite `data-action="undo"` com o id
  quando veio da pilha (`:10`), tratado em `app/handlers.js:143` (desfaz o item da pilha via
  `toastUndoStacked` ou o aviso atual). `toastClearAll()` (`:30`) limpa tudo ao reiniciar o
  protótipo.
- **Tempo visível**: uma barra fina `.toast-time` anima de `scaleX(1)` a `scaleX(0)` no tempo do
  aviso (`shell/toasts.js:10`; `styles/empty-states.css:33-35`) e pausa com o mouse ou o foco
  (`toastPause()` `:35`, `bindToastPause()` `:36-37`; a pausa só vale para avisos com desfazer —
  `:34`).
- **`aria-live`**: `#snackbar` é `role="status" aria-live="polite"` (`shell/template.html:7`); a
  pilha `#toast-stack` é criada com `aria-live="off"` para não repetir a leitura
  (`shell/toasts.js:11`).
- **Erro de gravação**: `mutate()` dispara
  `notify('Não foi possível salvar. Libere espaço no navegador ou use fotos menores.','error')`
  (`app/state.js:29`); o tratamento genérico de ação dispara
  `notify('Não foi possível concluir essa ação. Tente novamente.','error')` (`app/start.js:5`).

#### Avisos de sistema (só o mecanismo)

`features/profile/push-install.js`:

- **Permissão de avisos**: não usa a API real; a ativação é simulada
  (`push-install.js:2-3`). `maybeAskPush(reason,force)` (`:20-28`) abre o diálogo
  "Receba avisos do que importa" com três cartões de exemplo (`PUSH_SAMPLES`, `:11-15`) e as
  ações "Agora não" / "Ativar avisos"; mostrar já conta como pergunta, e recusar espera
  `PUSH_REASK_MS=7dias` (`:4`, `:22`, `:25`). `askPushSoon(reason)` (`:19`) só chama depois de 900ms
  e não interrompe quem está digitando. `pushInstallAction()` (`:39-48`) grava `state.prefs.push`
  (`'on'`/`'off'`) e avisa "Avisos ativados neste protótipo. No app, o celular pede a sua permissão
  aqui." / "Avisos no celular desativados".
- **Instalação como app**: `installPrompt` é capturado em `beforeinstallprompt` (`:9`) e
  `appinstalled` avisa "Bivaque instalado na tela inicial" (`:10`). `installRowHtml()` (`:35-37`)
  só aparece quando há prompt ou é iOS. No iPhone, um diálogo explica Compartilhar → "Adicionar à
  Tela de Início" (`:46`). `isStandalone()` (`:30`) usa `display-mode: standalone`.

### 8. Estado e persistência

#### Formato do `state`

`initial(stage='live')` (`app/state.js:2-11`) devolve um objeto com:
`{schema:2, stage, homeCity, city, mode, dest, arrival, leaveDate, incoming, profile{name,role,force,verified,interests}, prefs{appearance,digest,cap,showHood,familyOnly}, items, biz, asks, groups, leftAuto, events, threads, notices, myBiz, reports, invites, drafts, lastViewed, recent, plan, subscription{tier,month,repliedThreadIds}, test{demoReplies}, onboarded}`
(`:10`). Duas sementes: `stage==='seed'` usa `SOURCE.seed`, senão `SOURCE.live` (`:3`).

#### Chave e schema do `localStorage`

Chave `KEY='bivaque-material-web-v3'` (`data/demo/model.js:1`). Carregamento em `app/state.js:14`:
lê `localStorage.getItem(KEY)`, faz `JSON.parse` e só aceita o objeto se `raw?.schema===2`; qualquer
outra coisa cai em `initial()`. O resultado passa por `normalizeListings()` (`:14`;
`features/listings/attributes.js:52`) e `normalizeCategories()` (`:14`;
`features/businesses/taxonomy.js:26`).

#### `mutate()`

`mutate(fn, {redraw=true}={})` (`app/state.js:27-31`): tira um snapshot com
`JSON.stringify(state)`, roda `fn()` e grava no localStorage; se falhar (quota etc.) restaura o
snapshot, avisa "Não foi possível salvar. Libere espaço no navegador ou use fotos menores." e
devolve `false`; se der certo e `redraw`, chama `render()`. Vários fluxos usam `{redraw:false}`
para não redesenhar a tela inteira (ex.: `app/handlers.js:74`, `:75`, `:77`).

#### Migração

Não há função de migração nomeada. Os dois mecanismos são: (a) `raw?.schema===2?raw:initial()`
(`app/state.js:14`) descarta qualquer objeto de schema antigo; (b) `normalizeCategories()`
(`features/businesses/taxonomy.js:26`) reescreve categorias de negócio e pedido via
`migrateBizCategory`/`migrateRequestCategory`. O `KEY` já embute uma versão (`-v3`,
`data/demo/model.js:1`).

#### Por dispositivo × por conta

Todo o estado vive num único `localStorage`, logo **por dispositivo/navegador**, sem servidor
(comentário de topo: "Data persists on this device. Identity, other users and billing are test
data." — `app/open.js:2`). O único traço por conta é `accountKey()`
(`app/state.js:25-26`): `state.profile?.email || 'local-member'`, usado para quotas e pedidos de
entrada. `state.recent` (buscas) e `state.lastViewed` (`remember()`, `shell/navigation.js:104`) são
por dispositivo. `remember()` grava `state.lastViewed={type,id,city:state.city}` e persiste o estado.

#### `history.state.navigation`

`navigationContext()` (`shell/navigation.js:22`) monta o registro:
`{route:{name,id}, city, who, origin, scroll, focus, filters:{communityTab,questionFilter,catalogFilter,catalogAttrs,searchType,searchQuery,searchHood,searchMin,searchMax,searchSort,bizCat,bizQuery,myAdsFilter,savedType}}`.
`navigate()` grava esse registro em `history.pushState`/`replaceState` junto de
`bivaque:true, parent, route, city, scroll, focus:null, overlay:null` (`:46`).
`navigationRestore(context)` (`:23-31`) repõe: a cidade só se for da mesma conta
(`context.who===state.profile.email` — `:27`); `origin` limitado a `inicio|comunidade|conversas|voce`
(`:28`); e cada filtro individualmente, com `catalogAttrs` clonado sobre `CATALOG_DEFAULTS`
(`:30`). O `scroll`/`focus` iniciais são aplicados no primeiro `bindScreen()`
(`shell/bindings.js:3`: `root.scrollTop=context.scroll||0`, `navigationFocus(context.focus)`), e o
`popstate` restaura `scroll` posicional e `focus` (`shell/navigation.js:52`). O `overlay` de retorno
(`navigate(...,{returnOverlay})`, `:42`) é reaproveitado no `popstate` chamando
`profileRestoreOverlay(context.overlay)` (`:52`, `features/profile/demo-actions.js:36-37`, hoje só
`notices`). O "voltar fantasma" (`navigationGhostDepth`, `navigationGhostParent`) trata recargas
com overlay aberto (`shell/bindings.js:3`, `shell/navigation.js:109`).

#### `entryGate`

`entryGate()` (`shell/navigation.js:106`): com `state.signedOut`, se a rota é `chamados`, redireciona
para `ajuda` (`:106`). Se a rota for `entrar` com id `boas-vindas`, ou `legalRoute()`, ou
`supportRoute()`, ou a coerência `signedOut === (route.name==='entrar')` já vale, sai sem mexer
(`:106`). Caso contrário força `entrar` ou `inicio` conforme `state.signedOut` e faz
`history.replaceState` (`:106`). É a primeira coisa que `render()` chama (`:107`).

### 9. Tema e acessibilidade da casca

#### Claro / escuro / auto

`theme()` (`shell/navigation.js:1`) resolve `state.prefs.appearance` (`'auto'|'light'|'dark'`) em
`document.documentElement.dataset.theme` (`'light'`/`'dark'`), usando
`matchMedia('(prefers-color-scheme: dark)')` no modo auto, e ajusta
`meta[name="theme-color"]` para `#171E20` (escuro) ou `#F2F0EB` (claro) (`:1`). É chamada em
`render()` (`:107`). A mudança de esquema do sistema re-dispara `theme`
(`app/start.js:7`). Os tokens de tema estão em `styles/base.css:2-26` (`:root` e
`:root[data-theme=dark]`), com complementos em `styles/palette.css:3-4`. `color-scheme` é
`light`/`dark` conforme o tema (`styles/base.css:2`, `:21`). No escuro as fotos ganham
`filter:var(--bv-photo-dim)` (`styles/base.css:49`).

#### `theme-color`, foco, `aria-current`, rótulos

- `theme-color` inicial `#F2F0EB` no `<head>` (`shell/template.html:1`) e atualizado por `theme()`.
- **Foco visível**: `:focus-visible{outline:3px solid var(--md-sys-color-primary);outline-offset:3px}`
  (`styles/base.css:27`); em alto contraste vira `2px solid Highlight` (`styles/high-contrast.css:1`).
- **`aria-current`**: cada item de navegação cujo `activeTab()` bate recebe `aria-current="page"`
  (`shell/navigation.js:65`), e o CSS o usa para a luz da aba (`styles/base.css:27`,
  `styles/nav-bar.css:8`).
- **Rótulos de ícones**: `icon()` sempre injeta `aria-hidden="true"` (`utilities/format.js:4`);
  ícones-solo usam `iconBtn(ic,action,value,label=ic)` com `aria-label` (`shell/primitives.js:8`).
  A navegação inferior usa `<svg … aria-hidden="true">` e texto visível (`shell/navigation.js:73`).
  O `#fab` tem `aria-label="Criar publicação"` (`shell/template.html:5`).

#### Alto contraste (`forced-colors`)

`styles/high-contrast.css:1` contorna `.pill`, `.bubble`, `#snackbar`, `#fab`, `.photo-card`,
`.poll-opt`, `.context-strip`, `.sponsored-section` e os botões de swipe com
`1px solid CanvasText`, sublinha a aba ativa (`aria-current=page`), troca a barra do poll e ajusta
`focus-visible`. `styles/nav-bar.css:25` contorna `.nav-avatar` e desenha
`outline:2px solid Highlight` na aba ativa. `styles/notices.css:12` troca o ponto de não lido por
`CanvasText`. `styles/empty-states.css:22` esconde a ilustração de vazio.

#### Atalhos de teclado

- `Ctrl+K` / `⌘K` — paleta (`shell/command-palette.js:47-54`).
- `/` — paleta, fora de campos de texto (`:51`).
- `C` — Criar, só no desktop, fora de campos e com tudo fechado (`shell/create-menu.js:93-96`);
  anunciado via `aria-keyshortcuts` enquanto `min-width:1024px` (`:99`).
- `Esc` — fecha menu Criar (`shell/create-menu.js:75`), paleta (`shell/command-palette.js:37`),
  diálogo/folha (`shell/dialogs.js:23`), confirmação (`#confirm-dialog`, via `cancel`).
- Setas/`Home`/`End`/`Tab` — menu Criar (`shell/create-menu.js:76-81`); `↑`/`↓`/`↵`/`Esc` —
  paleta (`shell/command-palette.js:37`).
- `Escape` fecha o menu de sugestões do campo de bairro (`shell/hood-picker.js:89`).

#### `prefers-reduced-motion` na casca

- `styles/base.css:31` zera `scroll-behavior`, `animation` e `transition` de tudo.
- `animatePage()` não anima (`shell/navigation.js:50`).
- `#create-menu`/`#create-fab`/`#nav-main`/`.page` sem transição (`styles/overlays.css:22`);
  animação de `.cp-item` desligada (`styles/create-rail.css:51-53`); paleta sem `palette-in`
  (`styles/command-palette.css:31`).
- Sem animação de fechamento do menu Criar (`shell/create-menu.js:63`) nem do morph
  (`:89`); `overlayAnimation()` devolve `[]` (`shell/dialogs.js:26`).
- Nada de contagem animada (`shell/count-up.js:11`), de `celebrate()` (`shell/celebrate.js:5`),
  de shimmer de imagem (`styles/empty-states.css:6`), de vibração
  (`shell/haptics.js` não checa a preferência — **não verificado** se deveria), nem de transições
  de topo/immersive (`styles/top-title.css:10`, `styles/detail-immersive.css:14`) e de folha
  (`styles/sheets.css:36`). `styles/overlays.css:22` também cobre `.create-menu,.create-fab,.nav-main`.

### 10. Controles do protótipo (`openPrototype`, `features/profile/settings.js:6`)

> **Isto não vai para o app.** O diálogo "Controles do protótipo" é andaime de demonstração: ele
> manipula `state` local, `state.test`, `state.entry` e cenários fictícios, e o próprio texto
> avisa "Dados fictícios para testar as jornadas. Você pode publicar e editar exemplos; nenhuma
> mensagem é enviada para pessoas reais." (`features/profile/settings.js:6`). Nada aqui deve ser
> portado como funcionalidade de produto.

Abre pela ação `prototype` (`app/handlers.js:71`), disparada pelo botão de rail
`iconBtn('tune','prototype','','Controles do protótipo')` (`shell/navigation.js:65`). É um
`showDialog(..., kind='prototype')`, ou seja, a gaveta lateral de 400px
(`styles/overlays.css:4`). Conteúdo, com efeito de cada controle:

| controle (texto literal) | id / `data-action` | abre em | efeito |
|---|---|---|---|
| linha de status "Material Web oficial · {versão}" | — | `settings.js:6` | só informa se os custom elements estão registrados (`official`, checando `md-filled-button`, `md-outlined-text-field`, `md-dialog`, `md-select-option`, `md-switch`, `md-filter-chip`, `md-primary-tab`) |
| "Estágio da cidade" (`Cidade ativa` / `Cidade começando`) | `#prototype-stage` | `settings.js:6` | entra no `apply-prototype` |
| "Famílias com transferência declarada" (número 0–10000) | `#prototype-incoming` | `settings.js:6` | entra no `apply-prototype` |
| "Resultado da consulta do CPF (entrada)" (`Vínculo confirmado` / `Vínculo não localizado` / `Em análise` / `Fonte fora do ar`) | `#prototype-portal` | `settings.js:6` | grava `state.test.portal` no `apply-prototype` |
| "Aprovar a análise pendente" (só quando `state.entry?.eligibility==='pending'`) | `entry-approve` | `settings.js:6` | `features/entry/account.js:142`: grava `state.entry.eligibility:'verified'` e avisa "Análise aprovada (modo teste)." |
| "Verificação de teste" / "Controle de leitura e publicação." | `#verified-test` | `settings.js:6` | grava `state.profile.verified` no `apply-prototype` (controla `canPost()`, `app/state.js:59-63`) |
| "Ver como dono do Bivaque" | `owner-open` | `settings.js:6` | `features/owner/review.js:86`: fecha diálogos, zera `ownerTab`/`ownerStatus` e navega para `dono` |
| "Ver a entrada do zero" | `onboarding` | `settings.js:6` | `features/entry/arrive.js:79`: grava `state.signedOut=true`, limpa `state.entry`, fecha a paleta e navega para `entrar`/`conta` |
| "Simular resposta a uma pergunta" | `simulate-answer` | `settings.js:6` | `app/handlers.js:78` → `simulateAnswer()` (`features/messaging/actions.js:109`): acha uma pergunta sua aberta e responde com um relato de exemplo relacionado, criando um aviso |
| "Simular resposta na conversa" | `simulate-message` | `settings.js:6` | `app/handlers.js:79` → `simulateMessage()` (`features/messaging/actions.js:110`): injeta uma mensagem fictícia na conversa aberta ou na primeira disponível |
| "Simular anúncio para um alerta" | `simulate-alert` | `settings.js:6` | `features/listings/alerts.js:57` → `simulateAlertListing()` (`:71`) |
| "Simular decisão do moderador" | `simulate-moderation` | `settings.js:6` | `features/groups/handlers.js:42` → `openModeration()` (`:52`): diálogo "Decisão do moderador" com "Aprovar"/"Recusar" por grupo pendente |
| "Simular propostas de prestadores" | `simulate-proposals` | `settings.js:6` | `features/requests/handlers.js:6` → `simulateProposals()` (`features/requests/model.js:35`): gera propostas para seus pedidos abertos e cria avisos |
| "Simular contato no meu negócio" (só quando `state.myBiz?.live`) | `simulate-biz-contact` | `settings.js:6` | `features/businesses/plans.js:74` → `simulateBizContact()` (`:65`) |
| "Simular resposta do suporte" | `support-simulate` | `settings.js:6` | `features/support/help.js:157` → `supportSimulate()` (`:85`) |
| "Recomeçar do zero" | `reset-prototype` | `settings.js:6` | `app/handlers.js:77`: confirma ("Recomeçar do zero?" / "Anúncios, conversas, salvos e outras alterações feitas neste dispositivo serão substituídos pelos exemplos iniciais."), refaz `initial()`, limpa avisos (`toastClearAll()`) e navega para `inicio` |
| "Aplicar" | `apply-prototype` | `settings.js:6` | `app/handlers.js:72-76`: lê estágio/verificado/incoming/portal; **se o estágio mudou**, confirma ("Trocar o cenário de teste?" / "Isso substitui as alterações locais pelos exemplos do cenário escolhido.") e substitui o estado por `initial(stage)` (perde edições locais), avisando "Cenário atualizado"; senão grava `verified`, `incoming` e `test.portal` e avisa "Permissão de teste atualizada" |

Também aparece no rodapé do diálogo o aviso "As respostas de exemplo usam o assunto da pergunta.
Se não houver uma indicação relacionada, o protótipo não inventa uma resposta."
(`features/profile/settings.js:6`). A ação `entry-approve` também é emitida dentro da própria
entrada (`features/entry/account.js:67`).

### Onde a casca muda por rota

Colunas: barra do topo (`shell()`, `shell/navigation.js:60-64`), navegação (inferior só <720px e
só nas raiz — `syncMobileNavigation`, `:93-94`; rail sempre ≥720), a classe do `.page`
(`render()`, `:107`) e particularidades.

| rota | barra do topo | navegação | `.page` | particularidades |
|---|---|---|---|---|
| `inicio` | marca "Bivaque" + chip de cidade + avisos com badge | inferior + rail | `.page` | única com botão de avisos; título grande não sobe (`syncTopTitle` exclui `inicio`, `:87`) |
| `comunidade` | marca "Comunidade" + chip + Buscar | inferior + rail | `.page` | chip some abaixo de 1024px salvo `.away` |
| `conversas` | marca "Conversas" + chip + Buscar + avatar | inferior (badge de não lidos) + rail | `.page` | badge de não lidos sobre o item (`:65`) |
| `voce` | marca "Você" + chip + Buscar + avatar | inferior + rail | `.page` | idem |
| `busca` | `.search-topbar` (Voltar + campo "Buscar no Bivaque" + "Limpar busca"); `.searching`, `body.search-mode` | inferior oculta (`busca` não é raiz) | `.page` | `#main` desce 76px (`styles/overlays.css:32`); sem título grande (`:87`) |
| `conversa` | Voltar + `chatTopTitle()`; ações Buscar (desktop) / ⋮ (celular) | oculta | `.page chat-page` | cabeçalho da página escondido no celular (`styles/chat-mobile.css:14`); sem título que sobe (`:87`); `render()` refeita ao cruzar 720px (`:103`) |
| `anuncio` | Voltar + "Anúncio"; Buscar | oculta | `.page` | modo imersivo <720px sobre a foto (`:84-86`) |
| `negocio` | Voltar + "Negócio local"; Buscar | oculta | `.page` | idem imersivo |
| `pergunta` (sua) | Voltar + "Indicação" + Buscar + ⋮ | oculta | `.page` | `questionTopActions()` só quando sua e não em outra cidade |
| `dono` | (construída mas escondida) `body.owner-mode` | oculta por CSS (`styles/owner.css:6-7`) | `.page owner-page` | Painel do Bivaque tem navegação própria (`shell/navigation.js:56`) |
| `entrar` (e ids `conta`/`boas-vindas`/`analise`) | escondida (`body.entry-mode`) | escondida | `.page entry-page` | `entryChrome()` (`features/legal/pages.js:21`); `bindEntry`/`bindEntryCity` no fim do `render` (`:107`) |
| `privacidade`, `conduta` | normal se dentro; escondida se `signedOut` | normal / escondida | `.page` ou `.page entry-page` | `legalRoute()`; abre também para quem saiu (`features/legal/pages.js:19-21`) |
| `ajuda`, `contato`, `chamados` | normal se dentro; escondida se `signedOut` | normal / escondida | `.page` ou `.page entry-page` | `supportRoute()` (`features/support/help.js:6-7`); `chamados` com `signedOut` redireciona a `ajuda` (`entryGate`, `:106`) |
| `apagar-conta` | Voltar + "Apagar a conta"; Buscar | oculta | `.page` | só existe para quem está dentro |
| demais (`catalogo`, `desapegos`, `imoveis`, `negocios`, `grupo`, `publicacao`, `evento`, `agenda`, `salvos`, `meus-anuncios`, `minhas`, `guia`, `pedidos`, `pedido`, `ocultados`, `bloqueados`) | Voltar + título; Buscar | oculta no celular; rail no desktop | `.page` | todas não-raiz: `#nav`/`#fab` escondidos no celular (`:93-94`) e `animatePage(1)` (`:47`) |
| `indisponivel` (fallback) | Voltar + "Bivaque"; Buscar | oculta | `.page` | hash inválido → `parseRoute()` marca o problema (`:32-39`); `render()` mostra `empty('Página indisponível', …, 'link_off','home','Ir para o início')` (`:107`) |

### Lacunas

- **Mapeamento `md-*` → substituição no Next**: este capítulo lista os elementos usados, mas não
  afirma equivalente shadcn/ui — fora do escopo da casca e não verificado.
- **`navigation.js` ids de rota da entrada** (`conta`, `boas-vindas`, `analise`): vêm do fluxo de
  `features/entry/*`, que pertence a outro capítulo; só o comportamento de `entryGate` foi lido.
- **`simulateAlertListing()`, `simulateBizContact()`, `supportSimulate()`**: efeitos citados pela
  linha de definição (`features/listings/alerts.js:71`, `features/businesses/plans.js:65`,
  `features/support/help.js:85`); o conteúdo interno de cada simulação **não verificado** em detalhe.
- **`haptics.js`**: não há checagem de `prefers-reduced-motion` (`shell/haptics.js:5`); se isso é
  intencional, **não verificado**.
- **`#toast-stack` e `#context-preview`**: a posição exata calculada em
  `shell/toasts.js:15` (`box.style.bottom`) e a aparência do contexto
  (`styles/overlays.css:15`) foram lidas, mas o comportamento combinado com a pilha não foi
  exercitado em runtime — **não verificado**.
- **`app/handlers.js:5` (`alertAction`) e demais despachos por módulo** (`:3-19`): a ordem de
  precedência foi lida; o efeito individual de cada módulo fora dos controles do protótipo
  pertence aos capítulos de rota.
- **Contagem de não lidos do rail no desktop**: o badge de conversas é desenhado no item
  `conversas` (`shell/navigation.js:65`), mas não li CSS que reposicione `.nav-item .badge` no
  rail — a regra lida é só `styles/base.css:27` (`.nav-item .badge{top:-2px;right:2px}`), no
  contexto do rail — **não verificado** se há ajuste específico de rail.

---

## 6. Movimento

Inventário do que se move no protótipo HTML (`prototypes/bivaque-html/src/`). Tudo abaixo foi lido
no código nesta sessão; nada foi observado em runtime (não rodei o protótipo). Duas famílias
convivem: movimento escrito com a Web Animations API em `.js` (`elemento.animate(...)`, que
`prefers-reduced-motion` **não** desliga sozinho) e movimento escrito em CSS (`@keyframes` +
`transition`, que o interruptor global `styles/base.css:31` desliga). Por isso quase todo movimento
de `.js` tem guarda própria com `matchMedia`.

### Tabela principal

| # | Movimento | O que anima | Dispara quando | Duração/curva | Respeita movimento reduzido? (como, arquivo:linha) | Arquivo:linha |
|---|---|---|---|---|---|---|
| 1 | `animatePage` | `#page` desloca 56px no eixo X e surge | `navigate()` para rota fora das raízes (`shell/navigation.js:47`) e `popstate` (`shell/navigation.js:52`) | 420ms, `cubic-bezier(.2,0,0,1)` | Sim — `if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;` | shell/navigation.js:50 |
| 2 | foto em voo (abrir) — `motionFly` | clone `img.motion-flight` do cartão até o herói do detalhe | `render()` com `dir:'open'` | 560ms (`BOLD.flight`), `BOLD.easing` = `cubic-bezier(.2,0,0,1)` | Sim — `motionOff()` | motion/bold-transitions.js:24-31; BOLD em :4; motionOff em :7 |
| 3 | foto em voo (voltar) | clone do herói de volta ao cartão de origem | `dir:'close'` | idem | Sim — `motionOff()` | motion/bold-transitions.js:21,24-31 |
| 4 | cascata do detalhe — `motionRise` | `#page .detail-title`, `.detail-layout > * > :not(.detail-hero)`, `#page > section`, `.section` (até 8) | abrir detalhe, depois do voo | 480ms (`BOLD.rise`), atraso `120 + i*45` ms, 40px | Sim — `motionOff()` | motion/bold-transitions.js:33-36 |
| 5 | cascata das listas — `motionStagger` | `.photo-card`, `.list-row`, `.guide-card` visíveis (máx. 10) | abrir/voltar de detalhe e `dir:'page'` | 480ms, atraso `i*45` ms, 28px + `scale(.98)` | Sim — `motionOff()` | motion/bold-transitions.js:37-39 |
| 6 | contador `animateCounts`/`countUp` | `[data-count-to]` | elemento visível (`IntersectionObserver`, `threshold:.6`) | 900ms (`COUNT_MS`), ease `1-Math.pow(1-t,3)` | Sim — valor final imediato quando reduzido | shell/count-up.js:5,12-22 |
| 7 | `celebrate` | pulso do número + avatar novo na pilha | indicar negócio (`app/handlers.js:116`) | 420ms (`cubic-bezier(.2,.8,.2,1)`) + avatar 360ms, atraso 120ms | Sim — `if(!target||matchMedia('(prefers-reduced-motion: reduce)').matches)return false;` | shell/celebrate.js:4-13 |
| 8 | entrada da foto — `imageSettled` | `img` da moldura que estava em `img-wait` | foto termina de carregar (`load`/`error`) | 280ms `ease-out` | Sim — `if(!matchMedia('(prefers-reduced-motion: reduce)').matches)img.animate(...)` | shell/image-loading.js:7-9 |
| 9 | esqueleto da foto — `img-shimmer` | `::before` da moldura `:is(.cover,.detail-hero,.gallery button).img-wait` | enquanto a foto não carrega | 1,2s linear infinito | Sim — `animation:none` | styles/empty-states.css:2,4,6 |
| 10 | abrir/fechar diálogo — `overlayAnimation` | `md-dialog` sobe (`translateY(105%)`) e o `scrim` | `dialog.show()` / `dialog.close()` | abrir 500ms, fechar 240ms, `cubic-bezier(.32,.72,0,1)`; `scrim` 300/200ms | Sim — devolve `{dialog:[],scrim:[]}` | shell/dialogs.js:25-30 |
| 11 | fecho do menu Criar (celular) | painel encolhe com `scale(.6)` | `closeCreateMenu()` | 200ms, `cubic-bezier(.3,0,1,1)` | Sim — ramo `popup.hidden=true` quando reduzido | shell/create-menu.js:61-63 |
| 12 | morfo botão→painel Criar | `clip-path` do retângulo do `#fab` até o painel | desktop, abrir/fechar o painel | abrir 420ms `cubic-bezier(.2,0,0,1)`, fechar 220ms `cubic-bezier(.3,0,.8,.15)` | Sim — devolve `null` | shell/create-menu.js:86-91 |
| 13 | cascata do painel Criar — `cp-in` | `.cp-item` | painel abre (`.create-panel.open`) | .36s `cubic-bezier(.2,0,0,1) both`, atraso `calc(90ms + var(--i) * 28ms)` | Sim — `animation:none` | styles/create-rail.css:48-49,51-53 |
| 14 | paleta de comandos — `palette-in` | `.palette-box` | paleta aberta (`.open`) | .22s `cubic-bezier(.2,0,0,1)` | Sim — `animation:none` | styles/command-palette.css:5,31 |
| 15 | dica de deslize — `swipeHint` | `.swipe-content` vai a `-96px` e volta | 1ª visita a Conversas no celular | 1300ms, atraso 600ms, `id:'swipe-hint'` | Sim — exige `innerWidth<720` e nega quando reduzido | motion/gestures.js:20-23; chamada em :42 |
| 16 | encaixe do deslize — `makeSwipe` | `.swipe-content` `translateX` ao abrir/fechar | soltar o dedo | `transform .3s cubic-bezier(.2,0,0,1)` | Sim (global) — `transition:none!important` zera o encaixe; o arrasto continua | motion/gestures.js:6-11; styles/base.css:31 |
| 17 | arrasto lateral da linha | `.swipe-content` segue o dedo | `pointermove` na linha (móvel) | sem duração (segue o dedo) | Não se aplica — não é animação; `haptic(8)` ao armar | motion/gestures.js:9-11 |
| 18 | retorno pela borda | `$('#page').style.translate` segue o dedo | `pointerdown` a <28px da borda | sem duração | Não se aplica — não é animação | motion/gestures.js:44-49 |
| 19 | toque longo | `el.style.scale='.97'` e menu de contexto | `pointerdown` mantido 480ms | sem duração (480ms de espera) | Não se aplica — mudança instantânea | motion/gestures.js:25-34 |
| 20 | indicador de segmentos — `seg-ind` | pílula de fundo desliza para o chip escolhido | troca de filtro (`segPlace`) | `transform/width .32s cubic-bezier(.2,.8,.2,1)` | Sim — `transition:none` | shell/segmented.js:12,26; styles/segmented.css:4,9 |
| 21 | barra de etapas do wizard | `.wiz-bar span` largura | `wizShow(n)` | `width .3s ease` | Sim — `transition:none` | features/listings/wizard.js:29; styles/catalog.css:72,82 |
| 22 | abertura de folha/painel de filtros | `fp-up` / `fp-left` / `fp-fade` | `fpanel[open]` | .26s / .26s / .16s | Sim — só sob `prefers-reduced-motion:no-preference` | styles/catalog.css:59-60 |
| 23 | altura da folha do bairro | `.hood-panel` `height` (low 248px / half 58dvh / full `100dvh - 76px`) | `setHoodStop` e soltar o arrasto | `height .3s cubic-bezier(.32,.72,0,1)` | Sim — `transition:none` | features/listings/hood-panel.js:46,59-71; styles/sheets.css:7-10,36 |
| 24 | arrasto da folha do bairro | `.hood-panel` `height` segue o dedo | `pointermove` no `.hp-top` | sem duração (`transition='none'`) | Não se aplica — manipulação direta | features/listings/hood-panel.js:55-63 |
| 25 | encolher a página de trás — `sheet-depth` | `#app-shell` `translateY(8px) scale(.965)` + cantos | folha abre/fecha | `transform .32s cubic-bezier(.32,.72,0,1), border-radius .32s` | Sim — `transition:none` | shell/sheet-depth.js:3-5; styles/sheets.css:4,6,36 |
| 26 | arrasto da folha de diálogo | `md-dialog` interno `translate` Y | puxador `.sheet-grab`, móvel | sem duração | Não se aplica — manipulação direta | shell/dialogs.js:31-36 |
| 27 | minimizar a navegação | `.nav-main` `translateY(100%)` + `opacity` | rolar >140px para baixo | `transform .3s cubic-bezier(.2,0,0,1), opacity .2s` | Sim — `.nav-main{transition:none}` | shell/navigation.js:91-100; styles/navigation.css:2,6; styles/overlays.css:22 |
| 28 | rótulo do Criar compacto | `.create-fab .fab-label` `max-width`+`opacity` | navegação minimizada | `max-width .3s cubic-bezier(.2,0,0,1), opacity .2s` | Sim (global) — regra de `overlays.css:22` não alcança o rótulo; `base.css:31` zera | styles/navigation.css:3,11; styles/base.css:31 |
| 29 | título que sobe — `syncTopTitle` | `.top-title`/`.brand-text` `opacity`+`translateY(6px)`; `.topbar` borda | título grande passa sob a barra | `.18s ease-out`; borda `.18s` | Sim — `transition:none` | shell/navigation.js:80-90; styles/top-title.css:5-8,10 |
| 30 | barra imersiva do detalhe | `.topbar` fundo/borda, `.top-title` `opacity` | rolar a foto do anúncio/negócio | `background-color .2s, border-color .2s`; título `opacity .2s` | Sim — `transition:none` | shell/navigation.js:84-86; styles/detail-immersive.css:8-9,14 |
| 31 | balões de conversa — `msg-in` | `.bubble` do `.msg-row.enter` | mensagem nova no desenho (`prev!==undefined&&i>=prev`) | .26s `cubic-bezier(.2,.8,.2,1) both` | Sim — `animation:none` | features/messaging/bubbles.js:38; styles/chat-bubbles.css:26-28 |
| 32 | barra de tempo do aviso | `.toast-time` `scaleX(1)`→`scaleX(0)` | `notify()` mostra o `#snackbar` | linear `forwards`; duração inline = `t.ms` (`4200`/`7000`) | Sim — a barra some (`display:none`) | shell/toasts.js:8,10,23; styles/empty-states.css:33-35,39 |
| 33 | blocos da lista longa — `paged` | `.paged-skel` shimmer e inserção do próximo bloco | fim da lista a 600px (`pagedWatch`) | shimmer 1,2s linear infinito; inserção em `requestAnimationFrame` + 40ms | Sim — `animation:none` | shell/paged-list.js:32-37,38-43; styles/paged.css:8,11,12 |
| 34 | estados vazios ilustrados | `.empty-ic` flutua, `.empty-art i` cintila, `.ring` gira | `.empty` desenhado | 5s / 3,2s / 40s infinito | Sim — só sob `no-preference` | styles/empty-states.css:18-21 |
| 35 | press nos cartões | `.card-link`/`.list-row` `scale:.97` | `:active` | `scale .2s`; `.list-row` `scale .18s cubic-bezier(.2,0,0,1)` | Sim — só sob `no-preference` | styles/motion-bold.css:2; styles/overlays.css:21 |
| 36 | pontos do `celebrate` — `burst` | 8 `<i>` saem do número | `celebrate()` monta o `burst` | .7s `cubic-bezier(.2,.8,.2,1) forwards`; removido após 800ms | Sim — `celebrate` já retorna cedo | shell/celebrate.js:8-11; styles/empty-states.css:42-44 |
| 37 | zoom da foto na galeria — `lbApply` | `#lightbox-img` `transform` | pinça, toque duplo, Ctrl+roda, teclas `+`/`-`/`0` | `transform .25s cubic-bezier(.2,0,0,1)` (só quando `animated`) | Sim — `lbReduced()` | features/listings/photo-gestures.js:8-13,22-30 |
| 38 | troca de foto — `lbSlideIn` | `#lightbox-img` entra deslocada 48px | deslize lateral ≥60px ou rápido | 200ms `cubic-bezier(.2,0,0,1)` | Sim — `if(!img||lbReduced())return;` | features/listings/photo-gestures.js:36,79 |
| 39 | foto acompanha o dedo / deslizar para baixo | `#lightbox-img` `translate` e `--lb-fade` | `pointermove` com eixo escolhido | sem duração | Não se aplica — manipulação direta; `haptic(8)` ao passar 120px | features/listings/photo-gestures.js:49-59 |
| 40 | processamento de fotos do editor | `#photo-progress` e `#photo-previews` | escolher/soltar arquivos | sem animação (troca de conteúdo por arquivo) | Não se aplica — não há animação | features/listings/photos.js:6-13 |

### 1. Transição entre páginas (`animatePage`) e quando ela não acontece

`animatePage(direction)` está em `shell/navigation.js:50` e anima só `#page`. A direção é `1` ao
navegar para frente (`shell/navigation.js:47`) e `-1` no `popstate` (`shell/navigation.js:52`).

Não acontece quando: movimento reduzido (retorno imediato, `shell/navigation.js:50`); ao navegar
para uma das raízes `inicio`, `comunidade`, `conversas`, `voce` — o `if` de `shell/navigation.js:47`
só chama `animatePage(1)` fora delas; e em qualquer `render()` que não venha de `navigate()` ou
`popstate`, porque `render()` (`shell/navigation.js:107`) não chama `animatePage` — salvar, trocar
de aba, tema e avisos redesenham sem transição de página.

Quando o detalhe abre, a própria `motionAfterRender` cancela a animação de `#page` antes de fazer o
voo: `for(const a of $('#page')?.getAnimations()||[])a.cancel();`
(`motion/bold-transitions.js:20-21`) — as duas não competem.

### 2. Cartões → detalhe (foto em voo, ida, volta e cascata)

`motionBeforeRender()` guarda o quadro de partida em `motionLastRoute` e decide o `dir`
(`motion/bold-transitions.js:11-17`). O mapa `MOTION_DETAIL` liga rota a ação do cartão:
`{anuncio:'open-item',negocio:'open-biz'}` (`motion/bold-transitions.js:5`).

- **Abrir** (`dir:'open'`, `:14`): pega a foto do cartão com `motionCardImage`, exige que ela esteja
  visível (`motionInView`, `:10`), esconde o herói (`hero.style.opacity='0'`, `:20`), e
  `motionFly(f,hero,'0px')` anima um clone `img.motion-flight` da caixa do cartão até a caixa do
  herói (`:24-31`). O `.motion-flight` é `position:fixed` com sombra (`styles/motion-bold.css:1`).
- **Voltar** (`dir:'close'`, `:15,21`): acha de novo a foto do cartão de origem, esconde-a, faz o
  caminho inverso e chama `motionStagger` na lista de trás.
- **Cascata do detalhe** (`motionRise`, `:33-36`) e **da lista** (`motionStagger`, `:37-39`).
- Se o alvo não estiver em vista, `motionFly` devolve a opacidade e não anima
  (`motion/bold-transitions.js:26`).

O que `BOLD` intensifica — a constante é o botão único de intensidade
(`motion/bold-transitions.js:4`): `flight:560`, `rise:480`, `stagger:45`, `riseDistance:40`,
`listRise:28`, `listMax:10`, `easing:'cubic-bezier(.2,0,0,1)'`. Aumentá-la deixa voo, subida e
cascata mais longos e a lista entra mais devagar; há também o comentário de origem: "Para suavizar,
ajuste BOLD" (`motion/bold-transitions.js:3`) e a nota de aprovação "Rodada 08, aprovado pelo
usuário em 14/10/2026 como versão de teste" (`motion/bold-transitions.js:1`). Tudo depende de
`Element.prototype.animate` existir (`motionOff`, `:7`).

### 3. Listas longas (cascata, paginação, carregamento ao rolar)

- A cascata de entrada de lista é o item 5 da tabela (máx. 10 cartões visíveis).
- Paginação em blocos de 24: `LIST_PAGE=24` (`shell/paged-list.js:5`); o próximo bloco entra sozinho
  quando o fim se aproxima e o "Mostrar mais" fica de reserva (comentário em `:2-4`).
- `pagedWatch()` observa `.paged-foot:not(.is-end)` com `rootMargin:'0px 0px 600px 0px'`
  (`shell/paged-list.js:42`), usando como `root` o `#main` ou o scroller do diálogo (`:41`).
- `pagedAuto()` marca `.is-loading`, troca o texto para `Carregando mais N…`, insere dois
  `.paged-skel` e, em `requestAnimationFrame` + 40ms, remove os esqueletos e chama `pagedMore`
  (`shell/paged-list.js:32-37`).
- `pagedMore()` insere o bloco sem redesenhar a tela, religa os gestos (`bindOriginalGestures(false)`)
  e move o foco para o primeiro cartão novo quando veio do botão (`shell/paged-list.js:21-30`).
- A quantidade mostrada é guardada por lista e filtro, para voltar de um anúncio ao mesmo ponto
  (`shell/paged-list.js:4,8-9`).
- Fora da animação, `shell/in-place.js` evita redesenhar a lista ao salvar/marcar "Útil":
  `patchSaveButtons` troca só os botões (`shell/in-place.js:6-14`), `patchPostCard` só o cartão do
  post (`:21-27`), e `savedNeedsRender()` decide as telas que ainda redesenham (`:4`).

### 4. Contadores e a celebração ao indicar

`animateCounts` é chamado em todo `render()` (`shell/navigation.js:107`) e é idempotente por rota:
`countRoute` faz a segunda passagem mostrar o valor final sem recomeçar (`shell/count-up.js:9,11`).
Os elementos nascem com o número já escrito por `countHtml(n)` → `<b data-count-to="N">N</b>`
(`shell/count-up.js:25`). Com `IntersectionObserver` a `threshold:.6` (`:12`), `countUp` (900ms,
`:5,20-22`) esconde os intermediários de leitor de tela com um `span.sr` de valor final e
`aria-hidden` (`:19`), e só anima de `2` para cima (`:17`).

A celebração vem depois: em `app/handlers.js:116`, ao adicionar uma indicação o código fecha o
diálogo, redesenha, dispara `haptic(18)`, avisa e então
`requestAnimationFrame(()=>celebrate($('#main .fact-proof [data-count-to]')))`. `celebrate` dá o
pulso (420ms), monta o `burst` de 8 pontos nas cores primária/terciária
(`styles/empty-states.css:41-44`) e faz o avatar `.me` entrar (`shell/celebrate.js:12-13`);
devolve `false` quando reduzido (`:5`), e o aviso de texto continua igual (comentário `:1-3`).

### 5. Pílulas e segmentos (indicador que desliza)

O filtro escolhido não pinta o próprio chip: uma pílula única `.seg-ind` desliza até ele.
`segPlace` posiciona com `transform`/`width`/`height` (`shell/segmented.js:12`) e a animação é a
transição do CSS (`styles/segmented.css:4`). `segmentsAfterRender` espera os `md-filter-chip`
desenharem (`Promise.all(...updateComplete)` + `requestAnimationFrame`, `shell/segmented.js:22`),
esconde o indicador durante o primeiro posicionamento com a classe `no-anim`
(`styles/segmented.css:5`), entra em `seg-ready` (`:7`) e passa a acompanhar mudanças de medida por
`ResizeObserver` (`shell/segmented.js:18,28`). Enquanto `seg-ready`, o chip selecionado fica com
fundo transparente para a pílula aparecer (`styles/segmented.css:8`). Reduzido: transição desligada
(`:9`). Alto contraste: a pílula some e o chip usa `Highlight` (`:10`).

### 6. Folhas e diálogos (abrir, fechar, encolher a página de trás, arrastar, alturas)

- Abrir/fechar é `overlayAnimation(open)` (`shell/dialogs.js:25-30`): a gaveta de controles
  (`dialog.dataset.kind==='prototype'`) entra de `translateX(100%)` e as demais de
  `translateY(105%)` (`:27`); `getOpenAnimation`/`getCloseAnimation` são ligados ao `md-dialog`
  (`:30`).
- Encolher a página de trás é `sheetDepth(on)`, que liga `body.sheet-depth` só abaixo de 720px e
  fora da gaveta (`shell/sheet-depth.js:3-5`); o visual é
  `.sheet-depth #app-shell{transform:translateY(8px) scale(.965)}` (`styles/sheets.css:6`).
- Arrastar a folha de diálogo pelo puxador `.sheet-grab` move `dialog.shadowRoot...style.translate`
  e fecha se `dy>110` ou se for rápido (`shell/dialogs.js:31-36`).
- Alturas da folha do bairro: `low` 248px, `half` 58dvh, `full` `100dvh - 76px`
  (`styles/sheets.css:8-10`); `setHoodStop` troca de altura com `haptic(6)`
  (`features/listings/hood-panel.js:46`) e o arrasto no `.hp-top` escolhe a parada mais próxima
  (`:55-71`). Ao abrir, o mapa centraliza o bairro com
  `easeTo({...,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:450})`
  (`features/listings/hood-panel.js:38`).
- O diálogo de editor ocupa a tela: `md-dialog[data-kind=editor]{height:calc(100dvh - 48px -
  env(safe-area-inset-top))}` (`styles/overlays.css:3`); a gaveta, `height:100dvh`
  (`styles/overlays.css:4`).
- Reduzido: diálogo volta vazio (`shell/dialogs.js:26`), transições de `#app-shell`/`.hood-panel`
  desligadas (`styles/sheets.css:36`), `create-menu`/`create-fab`/`nav-main` também
  (`styles/overlays.css:22`).

### 7. Navegação (minimizar ao rolar, Criar compacto, título que sobe, barra imersiva)

O `scroll` de `#main` é um só ouvinte passivo (`shell/navigation.js:97-101`). Abaixo de 720px, nas
raízes, com `y>lastNavY+6 && y>140` ele liga `navMinimized=true` e com `y<lastNavY-6 || y<60`
desliga, chamando `syncMobileNavigation()` (`:99`). `syncMobileNavigation` (`:91-96`) esconde `#nav`
e `#fab` fora das raízes, troca `.minimized` (que é `translateY(100%)`,
`styles/navigation.css:6`) e `.compact` no Criar (`:10-12`, `max-width:0;opacity:0` no rótulo,
`styles/navigation.css:11`). O `.create-fab` também tem transições próprias de `bottom`,
`border-radius` e `transform` (`styles/create-menu.css:6`).

`syncTopTitle()` (`shell/navigation.js:80-90`) roda a cada rolagem: liga `body.immersive` no
anúncio/negócio abaixo de 720px (`:84-85`), marca `bar-solid` quando a foto passa sob a barra
(`:86`) e, no título grande que "doca", liga `title-hides`/`title-docked` conforme a posição do
`h1` (`:87-89`). O CSS do título (`styles/top-title.css:5-8`) e o da barra imersiva
(`styles/detail-immersive.css:8-9`) trazem as transições; ambos têm a variante desligada
(`styles/top-title.css:10`, `styles/detail-immersive.css:14`). `syncTopTitle` também é chamado uma
vez por `render()` via `requestAnimationFrame(syncTopTitle)` (`shell/navigation.js:66`).

### 8. Fotos

**Lightbox** (`features/listings/photos.js:29-38` abre com `showLightbox`, `focus` no fechar em
`:37`). Os gestos vivem em `features/listings/photo-gestures.js`:

- `lbApply(animated)` monta `transform:translate(x,y) scale(s)` e só usa a transição de .25s quando
  `animated` e sem movimento reduzido (`:8-13`).
- Pinça: com dois ponteiros, `lbZoomTo` mantém parado o ponto entre os dedos e amplia até `LB_MAX=4`
  (`photo-gestures.js:6,46,52`). Ao soltar, volta a 1 se abaixo de 1.05, senão fixa com
  `lbApply(true)` (`:64`).
- Toque duplo: dedo/caneta dentro de 320ms e 30px alterna zoom para `LB_DOUBLE=2.5` (`:6,75`); o
  mouse usa `dblclick` (`:88`), que ignora se um toque duplo acabou de acontecer (`<600ms`, `:88`).
- Ampliada, `lbAxis` vira `'pan'` e a foto se arrasta (`:37,56`); as setas somem
  (`.lightbox.zoomed .lightbox-prev/.lightbox-next{opacity:0;...visibility:hidden}`,
  `styles/photos.css:19`).
- Deslizar para o lado troca de foto com `stepLightbox` + `lbSlideIn` (`:79`); deslizar para baixo
  escurece o fundo com `--lb-fade` (`:58`) e fecha acima de 120px ou velocidade .6 (`:80`).
- Ctrl + roda do trackpad amplia (`:90`); teclado `+`/`-`/`0` (`lbZoomKey`, `:28-34`).
- `lbClamp` impede a foto de sair da área visível ampliada (`:15-19`).
- `lbReduced()` é `matchMedia('(prefers-reduced-motion: reduce)').matches` (`:7`).

**Editor de fotos** (`features/listings/photos.js:6-13`): `addEditorPhotos` aceita JPG/PNG/WebP/AVIF
(`:4-5`), corta em no máximo 6 (`:9`), recusa acima de 12 MB e avisa "Use imagens de até 12 MB."
com `notify(...,'error')` (`:9`), reduz para 1400px no maior lado e recomprime em
`image/jpeg, .78` (`:12`), enquanto o progresso mostra "Preparando foto 1 de 2…" / "Preparando
foto…" (`:10`). O arrasto e solta pinta `.photo-upload.is-drag` com "Solte as fotos aqui"
(`:18-21`, overlay em `styles/photos.css:4`). Não há animação aqui além da troca de conteúdo.

### 9. Conversas (entrada de balões, agrupamento, reações)

- Entrada: o balão usa `animation:msg-in .26s cubic-bezier(.2,.8,.2,1) both`
  (`styles/chat-bubbles.css:26`) quando a linha tem `.enter`; a classe nasce em
  `features/messaging/bubbles.js:38`, só para mensagens novas
  (`prev!==undefined&&i>=prev`) — o mesmo trecho calcula `first`/`last` do agrupamento (`:36`).
- Agrupamento: quem não é `first`/`last` ganha cantos menores
  (`styles/chat-bubbles.css:8-11`), `.first` recebe `margin-top:10px` (`:5`).
- Reações: `.msg-reaction` fica sobreposto ao balão (`styles/chat-bubbles.css:16`) e força
  `margin-bottom:12px` na linha quando visível (`:14`); `.msg-react` só aparece em `hover:hover`
  (`:21`); o seletor `.msg-picker` é um grupo de botões (`:22-25`).
- Reduzido: `.msg-row.enter .bubble{animation:none}` (`styles/chat-bubbles.css:28`). Alto contraste:
  borda em `.msg-reaction`/`.msg-picker` e `outline` no botão pressionado (`:29`).

### 10. Toque e háptica

`shell/haptics.js:5`: `function haptic(ms=10)` chama `navigator.vibrate?.(ms)` dentro de `try/catch`,
com um intervalo mínimo de 80ms entre vibrações (`if(now-hapticAt<80)return;`). O comentário
(`:1-3`) diz o escopo: "vibração leve quando uma ação muda algo", "Só onde o navegador permite
(Android); o iPhone ignora. Duas vibrações seguidas não se acumulam."

Quem dispara e com qual duração:
- salvar anúncio — `haptic()` (padrão 10) em `app/handlers.js:96`;
- salvar negócio — `haptic()` em `app/handlers.js:109`;
- indicar negócio — `haptic(18)` em `app/handlers.js:116`;
- passar do ponto no deslizar da linha — `haptic(8)` em `motion/gestures.js:10`;
- soltar a foto para fechar a galeria — `haptic(8)` em `features/listings/photo-gestures.js:58`;
- trocar a altura da folha do bairro — `haptic(6)` em `features/listings/hood-panel.js:46`.

Onde a API não existe, `navigator.vibrate?.()` é opcional: nada acontece e nada quebra (dentro do
`try`), `shell/haptics.js:5`. O comentário nomeia o iPhone como o caso que ignora (`:3`); o
protótipo não tem ramo alternativo de vibração.

### 11. Alto contraste e movimento reduzido

**Movimento reduzido.** Duas camadas:

1. Um interruptor global em `styles/base.css:31`:
   `@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;
   animation:none!important;transition:none!important}}`. Isso desliga `@keyframes` do CSS e
   `transition` (inclusive `transition` posto inline pelo JS, porque `!important` da folha vence o
   `style` do elemento — é o que salva o encaixe do deslize, item 16, e o rótulo do Criar, item 28).
2. Guardas próprias onde o movimento é Web Animations API, que o item 1 **não** alcança
   (`animation:none` não cancela `elemento.animate()`): `shell/navigation.js:50`,
   `motion/bold-transitions.js:7` (usado em `:13`), `shell/count-up.js:11`, `shell/celebrate.js:5`,
   `shell/image-loading.js:9`, `shell/dialogs.js:26`, `shell/create-menu.js:63,89`,
   `features/listings/photo-gestures.js:7,10,36`, `motion/gestures.js:21`. Vários CSS usam o padrão
   oposto, só sob `no-preference`: `styles/catalog.css:59`, `styles/empty-states.css:18`,
   `styles/motion-bold.css:2`. E há desligamentos pontuais: `styles/segmented.css:9`,
   `styles/top-title.css:10`, `styles/detail-immersive.css:14`, `styles/sheets.css:36`,
   `styles/catalog.css:82`, `styles/chat-bubbles.css:28`, `styles/empty-states.css:6,39`,
   `styles/paged.css:12`, `styles/create-rail.css:51-53`, `styles/command-palette.css:31`,
   `styles/overlays.css:22`, `styles/plan-timeline.css:32`.

O que **para** com reduzido: transição de página, voo e cascatas do detalhe, contagem (mostra o
valor final), celebração, `swipeHint`, aberturas de diálogo/painel/paleta/folha, minimizar a
navegação, título que sobe, `msg-in`, shimmer de esqueleto, ilustrações de estado vazio e a barra de
tempo do aviso.

O que **continua** (é gesto direto, não animação com duração): o arrasto de deslizar a linha
(`motion/gestures.js:9-11`), o retorno pela borda (`:46-48`), o toque longo e sua escala
instantânea (`:29`), o arrasto da folha (`shell/dialogs.js:31-36`,
`features/listings/hood-panel.js:55-63`) e a foto acompanhando o dedo na galeria
(`features/listings/photo-gestures.js:49-59`). O `haptic` também continua — `shell/haptics.js:5` não
consulta movimento reduzido.

**Alto contraste (`forced-colors: active`).** O protótipo não desenha movimento por cor, então nada
se move, mas a aparência muda em várias regras:
- `styles/high-contrast.css:1` (arquivo de uma linha): borda `CanvasText` em `.pill`, `.bubble`,
  `#snackbar`, `#fab`, `.photo-card`, `.poll-opt`, `.context-strip`, `.sponsored-section`,
  `.swipe-actions button`; sublinha na aba ativa; `outline:2px solid Highlight` no foco visível.
- `styles/segmented.css:10`: `.seg-ind{display:none}` e o chip selecionado passa a usar
  `Highlight` — ou seja, **o indicador que desliza desaparece** e a seleção vem do próprio chip.
- `styles/empty-states.css:22`: `.empty-art{display:none}`; `:14`: anel no avatar-stack.
- `styles/catalog.css:61`: `outline` em `.fpill.on`/`.fchip.on`, borda no `.fpanel`.
- `styles/chat-bubbles.css:29`, `styles/notices.css:12`, `styles/nav-bar.css:25`,
  `styles/count-up.css:14`: contornos/realces equivalentes.
- `styles/base.css:31` (reduzido) é independente disso; as duas mídias não se cruzam.
- O vendor `src/vendor/material-web-2.5.0.js` traz regras `forced-colors` próprias (p.ex. a onda do
  ripple some e a elevação vira borda) — não inventariadas linha a linha aqui.

### Lacunas

- `@keyframes appear` é definido em `styles/base.css:32`, mas **nenhuma regra de `src/` aplica
  `animation:appear`** (busquei `appear` em todo `src/`). Por consequência,
  `styles/overlays.css:22` (`.page{animation:none}` sob reduzido) não tem animação correspondente.
  Se algum HTML monta `animation:appear` inline, não verificado.
- A entrada/saída do `#snackbar` parece **instantânea**: li `shell/toasts.js:23` (`classList.add
  ('show')`) e não achei `transition`/`animation` de `#snackbar`/`.snackbar.show` em `styles/`;
  só `.toast-time` anima (`styles/empty-states.css:33`). Não verificado em runtime.
- Outros movimentos existem em arquivos **fora** da lista de fontes obrigatória, achados pela
  varredura em todo o `src/`, sem detalhamento completo acima: `styles/landing.css:26` (`.ld-pill`),
  `:72-76` (`.ld-reveal`/`ld-in` com atrasos), `:133` (`.ld-sheet`), `:173` (`.ld-bar`), acionados
  por `features/entry/landing.js:114,138,143,151,184-185` (o `reduce` já aparece em `:114` e o
  rolar suave vira `auto` em `:151`); `styles/groups.css:42` (`.poll-bar` `width .5s`, aplicado em
  `features/groups/views.js:90`); `styles/plan-timeline.css:27` (`.plan-ring .fill`, reduzido em
  `:32`); `styles/create-menu.css:6-7,12` (`.create-fab`, `rotate` do ícone, `.create-menu`
  `scale(.2)`+`blur(6px)` — sem guarda própria, só `base.css:31`); `features/home/views.js:9-10`
  (exemplo de busca gira a cada 3,2s); `styles/entry.css:96` e `styles/groups.css:21` (`summary`
  gira o ícone .2s). Tratei gatilho/detalhe desses como não verificado quando não citei.
- `src/vendor/material-web-2.5.0.js` tem animações próprias (ripple, focus ring, abrir/fechar de
  menu, indicador de aba em `indicator.animate(...,duration:250)` na linha 1418 e
  `animateDialog` na linha 571), com a própria checagem
  `window.matchMedia("(prefers-reduced-motion: reduce)")` (linha 1418). Não inventariadas linha a
  linha.
- Não rodei o protótipo (sem navegador/captura). Todas as durações e curvas acima vêm da leitura do
  código, não de observação — distância em `innerWidth`, `720px`/`1024px` e o efeito real no
  aparelho não foram vistos.

---

## 7. Componentes comuns

Inventário dos helpers reaproveitados do protótipo HTML (`prototypes/bivaque-html/src/`) para a
reescrita em Next + shadcn/ui. Cobre `shell/primitives.js`, `utilities/format.js`, o shell com
estado (`paged-list`, `segmented`, `dialogs`, `toasts`, `verified-info`, `count-up`) e os padrões de
view que hoje são HTML repetido (`page-head`, `section`, `card-grid`, `list`/`list-row`, `gPostCard`,
`profileRow`, `readonlyHtml`, `paged-end`, `pill`, `avatar`, menu `⋮`, `actionsBar`). Cada afirmação
cita `arquivo:linha` (1-based). Textos de interface entre aspas, literais. O método foi `grep`
(mesma ferramenta via `rg`/varredura de substring em Node) sobre `prototypes/bivaque-html/src`, sem
`vendor/` e sem `styles/` nas contagens de uso; as contagens de CSS vêm de `styles/`.

Resumo em 5 linhas:
1. Há **14 primitivos de HTML** em `shell/primitives.js` (26 linhas) e **11 helpers puros** em
   `utilities/format.js` (11 linhas); os dois arquivos juntos são 37 linhas e concentram 100% das
   funções puras de render do protótipo.
2. O divisor real do protótipo é **`data-action`/`data-value` + string HTML**: todo primitivo emite
   `data-action` e quem trata é `perform(action,value,el)` (`app/handlers.js:1`), não o componente —
   em React isso vira prop/callback e é a maior mudança estrutural da reescrita.
3. Os "componentes de tela" mais repetidos **não são funções**: `class="page-head"` aparece 18 vezes
   como literal (`class="page-head chat-head"`, `class="page-head"`), `<section class="section">` 45
   vezes, `.card-grid` só 4 vezes no JS porque é o padrão de `pagedHtml` (`shell/paged-list.js:7`).
4. Só **um** padrão de item de lista é compartilhado entre telas como função: `profileRow`
   (`features/profile/views.js:8`, 14 pontos de uso). `questionRow`/`eventRow`/`photoCard`/`businessCard`
   servem 4-8 telas; `threadRow`, `requestRow`, `noticeRow`, `alertRow` e o cartão de negócio do
   desktop (`features/home/desktop.js:38`) são cópias locais da mesma anatomia `.list-row`/`.photo-card`.
5. Não existe componente de **esqueleto/loading** geral: `skeleton` tem 0 ocorrências no JS; o que
   existe é `.paged-skel` (`shell/paged-list.js:35`, `styles/paged.css:7`) e o shimmer `.img-wait`
   (`shell/image-loading.js:5`, `styles/empty-states.css:2`).

### Tabela principal

Ordem: primitivos de `shell/primitives.js` → helpers de `utilities/format.js` → shell de estado
(`paged-list`, `segmented`, `dialogs`, `toasts`, `verified-info`, `count-up`) → filtros → padrões de
view. "Ocorrências" = quantas vezes o nome aparece no `src` (inclui a própria definição); "pontos de
uso" = ocorrências menos a definição. Quando o helper também é passado como *referência* (callback de
`map`/`pagedHtml`), o texto diz isso explicitamente.

#### Primitivos — `shell/primitives.js`

| Componente | Assinatura (arquivo:linha) | O que renderiza | Textos/ícones que traz | Usos (total) e exemplos (arquivo:linha) | Vira componente React? (sim/talvez/não + por quê) |
|---|---|---|---|---|---|
| `image` | `function image(ref)` — `shell/primitives.js:1` | resolve uma chave para o `data:` URI embutido: `ref?.startsWith('data:image/')?ref:ASSETS[ref]\|\|''`; devolve `''` quando não acha | nenhum texto; `ASSETS` é um objeto base64 único (`data/demo/assets.js:1`) | 17 ocorrências de `image(` (1 é a definição) → 16 pontos de uso; ex.: `features/entry/landing.js:42`, `features/entry/landing.js:61`, `features/messaging/views.js:6`, `features/listings/compare.js:14`, `features/listings/share-card.js:9`, `features/groups/views.js:55` | **sim** — função pura de 1 linha; vira `assetUrl(ref)`/`getAsset()`. Sem DOM, sem estado. |
| `cover` | `function cover(x,tag='')` — `shell/primitives.js:2` | `.cover` 16/9 com `<img src alt loading="lazy">` ou `.photo-fallback` com ícone; `<span class="pill">` do rótulo quando há `tag` | `alt="${esc(x.title\|\|x.name)}"`; ícones `'apartment'` (quando `x.kind==='imovel'`) e `x.icon\|\|'photo_camera'` (`:3`) | 4 ocorrências de `cover(` (1 é a definição) → 3, todas dentro de outros primitivos: `shell/primitives.js:21` (`photoCard`), `shell/primitives.js:23` (`businessCard`) e `features/home/desktop.js:38` (cópia local do cartão) | **sim** — `<Cover>` com `item`/`tag`; o `alt` cai no mesmo `esc` de hoje. |
| `btn` | `function btn(text,action,value='',kind='filled',ic='')` — `shell/primitives.js:5` | um `<md-…-button type="button">` com `data-action`, `data-value` opcional e ícone opcional; `kind` mapeia para `md-filled-button` / `md-filled-tonal-button` / `md-text-button` / `md-outlined-button` (`:6`) | nenhum texto próprio — o rótulo vem do chamador; ícone via `icon(ic,'icon')`; variante `danger` é aplicada por *string replace* do chamador (`features/listings/detail.js:9`) | 271 ocorrências de `btn(` (1 é a definição) → 270 pontos de uso; ex.: `features/listings/detail.js:8`, `features/events/views.js:19`, `features/profile/views.js:10`, `features/requests/views.js:5`, `shell/dialogs.js:20` | **sim** — é literalmente `<Button variant>`. O `data-action` vira `onClick`/prop; o `replace('<md-text-button','<md-text-button class="danger"')` some (vira `variant="destructive"`). |
| `iconBtn` | `function iconBtn(ic,action,value='',label=ic,extra='')` — `shell/primitives.js:8` | `<md-icon-button>` com `data-action`, `data-value`, `aria-label` e `extra` cru; adiciona `aria-haspopup="menu"` automaticamente quando `action` casa `/-menu$/` (`:8`) | `label` default = o próprio nome do ícone; usado como rótulo acessível | 54 ocorrências de `iconBtn(` (1 é a definição) → 53 pontos de uso; ex.: `features/listings/detail.js:8`, `features/messaging/views.js:12`, `features/profile/views.js:6`, `features/groups/views.js:87`, `features/businesses/detail.js:3` | **sim** — `<IconButton ariaLabel icon>`. O `aria-haspopup` inferido do sufixo da ação é acoplamento a corrigir (em React é prop explícita). |
| `selectField` | `function selectField(id,label,values,selected='',extra='')` — `shell/primitives.js:9` | `<md-outlined-select id label extra>` com um `<md-select-option value>` por item e `<div slot="headline">` | rótulo vem do chamador; aceita `[value,title]` ou valor simples (`:10`) | 25 ocorrências de `selectField(` (1 é a definição) → 24 pontos de uso; ex.: `features/groups/views.js:123`, `features/profile/settings.js:6`, `features/requests/views.js:23`, `features/entry/arrive.js:14`, `features/entry/arrive.js:19`, `features/businesses/taxonomy.js:28`, `features/groups/editors.js:32` | **sim** — `<Select options selected onValueChange>`; é o formulário de quase todo editor em folha. |
| `field` | `function field(id,label,value='',extra='')` — `shell/primitives.js:13` | `<md-outlined-text-field id label value extra>`; injeta `inputmode="numeric"` quando `extra` casa `type="number"` e `inputmode="search"` quando casa `type="search"` (comentário em `:12`) | rótulo vem do chamador; `extra` carrega `rows`, `maxlength`, `supporting-text`, `disabled` | 81 ocorrências de `field(` (1 é a definição) → 80 pontos de uso; ex.: `features/groups/views.js:123`, `features/entry/login.js`, `features/community/manage.js`, `features/support/help.js`, `features/listings/wizard.js`, `features/profile/demo-actions.js:4` | **sim** — `<Input>`/`<Textarea>`; hoje a mesma função serve input e textarea por string (`type="textarea"`), em React são dois componentes. |
| `pill` | `function pill(text,kind='',ic='')` — `shell/primitives.js:14` | `<span class="pill ${kind}">` com ícone opcional | nenhum texto próprio; `kind` usados no código: `'ok'`, `'ad'`, `'warn'`, `''` | 33 ocorrências de `pill(` (1 é a definição) → 32 pontos de uso; ex.: `features/events/views.js:19`, `features/requests/views.js:9` (`pill('Escolhida','ok','check_circle')`, `pill('Vencida','warn')`), `features/groups/views.js:87`, `features/groups/views.js:122`, `features/community/question.js:4`, `features/requests/views.js:34` | **sim** — `<Badge variant icon>`; mas há 6 usos crus de `class="pill` fora do helper (ver §3), o que precisa convergir. |
| `sectionTitle` | `function sectionTitle(title,label='',action='',value='')` — `shell/primitives.js:15` | `.section-title` com `<h2>` e, quando há `label`, um `btn(label,action,value,'text')` à direita | título e rótulo vêm do chamador | 35 ocorrências de `sectionTitle(` (1 é a definição) → 34 pontos de uso; ex.: `features/home/views.js:25`, `features/home/desktop.js:17`, `features/home/desktop.js:39`, `features/groups/views.js:78`, `features/groups/views.js:108`, `features/requests/views.js:6` | **sim** — `<SectionTitle title action>`; mas 2 telas escrevem `.section-title` à mão (`features/listings/catalog.js:37`, `features/search/views.js:42`), ver §3. |
| `EMPTY_ART` | `const EMPTY_ART` — `shell/primitives.js:17` | SVG inline `viewBox="0 0 132 112"` com `<path class="blob">` e `<circle class="ring">`; "sem imagem nova (peso zero)" (comentário `:16`) | nenhum texto; `aria-hidden="true"` no SVG | 3 ocorrências: definição `shell/primitives.js:17`, uso interno `shell/primitives.js:18`, e um uso fora do helper em `features/profile/blocks.js:14` | **sim** — asset estático (`.tsx`), consumido por `<EmptyState>` e pela variante de conteúdo bloqueado. |
| `empty` | `function empty(title,text,ic='search_off',action='',label='')` — `shell/primitives.js:18` | `.empty` com `.empty-art` (`EMPTY_ART` + `.empty-ic` + 3 pontos `<i class="d1\|d2\|d3">`), `<h3>`, `<p>` e botão tonal opcional | `ic` default `'search_off'`; o botão usa `btn(label,action,'','tonal')` — o rótulo vem do chamador | 37 ocorrências de `empty(` (1 é a definição) → 36 pontos de uso; ex.: `features/home/views.js:25`, `features/listings/catalog.js:35`, `features/listings/detail.js:1`, `features/listings/detail.js:3`, `features/profile/views.js:13`, `features/groups/views.js:117`, `features/messaging/views.js:2` | **sim** — `<EmptyState title description icon action>`; é o padrão de estado vazio mais repetido (25 arquivos). |
| `photoCard` | `function photoCard(item)` — `shell/primitives.js:19` | `<article class="photo-card">` com `iconBtn` de salvar (`.save-card`), `<button class="card-link" data-action="open-item">`, `cover(item,tag)`, `.card-body` com `.price`, `<h3>`, `.card-meta` e a linha de atributos do mercado | rótulos do `tag` (`:20`): `'Indisponível'`, `'Vendido'`, `'Seu anúncio'`, `'Em transferência'`, `item.ptype\|\|'Imóvel'`, `'Desapego'`; salvar: `'Remover dos salvos'` / `'Salvar anúncio'`; `' / mês'` quando `item.per`; `hoodTag(item)` + cidade (`features/profile/hood-privacy.js:7`); ícones `'bookmark'`/`'bookmark_border'`, `'apartment'`, `'sell'` | 9 ocorrências de `photoCard` (1 é a definição) → 8 pontos de uso: 2 com parênteses (`features/listings/wizard.js:24`, `features/profile/views.js:10`) e 6 como referência passada a `map`/`pagedHtml` (`features/home/desktop.js:43`, `features/listings/catalog.js:35`, `features/listings/hood-panel.js:17`, `features/listings/map.js:65`, `features/profile/views.js:9`, `features/search/views.js:19`) | **sim** — `<ListingCard item>`; é o cartão mais reusado do produto e já é função com contrato único. |
| `businessCard` | `function businessCard(b)` — `shell/primitives.js:23` | `<article class="photo-card">` com `iconBtn` de salvar (`save-biz`), `<button class="card-link" data-action="open-biz">`, `cover(b,tag)`, `.card-body` com `<h3>`, `.card-meta` (`b.cat · b.hoods[0]\|\|b.city`) e uma `.card-line` de recomendação | `tag`: `'Patrocinado'`, `'Indicado pela comunidade'` ou `b.cat`; linha: `'Aguardando o responsável'`, `` `${b.recN} indicações da comunidade` `` ou `'Novo na cidade'`; ícones `'hourglass_top'`, `'forum'`, `'sell'`; depende de `isSpon` (`features/businesses/plans.js:23`) e de `b.disc` | 6 ocorrências (1 é a definição) → 5 pontos de uso: `features/businesses/catalog.js:1` (2×, `sponsors.map(businessCard)` e `pagedHtml(...,businessCard,...)`), `features/profile/views.js:9`, `features/community/views.js:3`, `features/search/views.js:19` | **sim** — `<BusinessCard biz>`; mesma anatomia do `photoCard`, mas usa `isSpon()` (regra de planos) — em React precisa do mesmo dado de plano. |
| `questionRow` | `function questionRow(q,snippet='')` — `shell/primitives.js:24` | `<button class="list-row" data-action="open-question">` com `.avatar`, `.txt` (`<b>` pergunta, `<small>` autor · tópico/cidade), `snippet` (string ou vazio) e uma `pill` de estado + `chevron_right` | `'Você'` quando `q.mine`; pill: `'Resolvida'` / `` `${n} resposta(s)` `` / `'Sem resposta'`; ícone `'chevron_right'` | 8 ocorrências (1 é a definição) → 7 pontos de uso; ex.: `features/home/views.js:25`, `features/community/views.js:7`, `features/profile/views.js:13`, `features/search/views.js:17` (`questionRow(q,answerSnippet(q))`), `features/businesses/detail.js:5`, `features/community/editor.js:2`, `features/home/desktop.js:17` | **sim** — `<QuestionRow q snippet>`; contrato estável e já parametrizado por `snippet`. |
| `eventRow` | `function eventRow(e)` — `shell/primitives.js:25` | `.list-row` com `<button class="event-date">` (mês abreviado em maiúsculas + dia), `<button class="txt">` (título, `place · time`, `N confirmados`) e um botão de presença | `aria-label="Ver ${e.title}"`; `` `${e.going\|\|0} confirmados` ``; botões `'Você organiza'` ou `'Confirmado'`/`'Vou'`; ícone `'check'` quando `e.on` | 3 ocorrências (1 é a definição) → 2 pontos de uso, ambos por referência: `features/events/views.js:14` (`d.items.map(eventRow)`), `features/search/views.js:19` | **sim** — `<EventRow event>`; reaproveitado na Agenda e na Busca. |

#### Helpers puros — `utilities/format.js`

| Componente | Assinatura (arquivo:linha) | O que renderiza | Textos/ícones que traz | Usos (total) e exemplos (arquivo:linha) | Vira componente React? (sim/talvez/não + por quê) |
|---|---|---|---|---|---|
| `$` / `$$` | `const $=(s,r=document)=>r.querySelector(s)`, `const $$=(s,r=document)=>[…r.querySelectorAll(s)]` — `utilities/format.js:1` | nada: atalhos de consulta ao DOM | nenhum | `$(` 407 ocorrências (o total bruto de `$(` conta 444 porque inclui o interior de `$$(`); `$$(` 37 ocorrências, em 24 arquivos) | **não** — é API de DOM imperativo. Em React some: vira `ref`/estado de componente. Não há o que portar. |
| `esc` | `const esc=s=>String(s??'').replace(/[&<>"']/g,…)` — `utilities/format.js:2` | nada: escapa `& < > " '` | nenhum | 451 ocorrências (1 é a definição) → 450 pontos de uso; ex.: `shell/primitives.js:21`, `features/groups/views.js:87`, `features/requests/views.js:9`, `features/listings/filters.js:33` — está em 73 arquivos | **sim** — mas vira o **default do JSX** (React escapa sozinho). O valor de portar é manter o helper só onde o dado sai como string de atributo (`title`, `aria-label`). |
| `norm` | `const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()` — `utilities/format.js:3` | nada: normaliza para busca/comparação sem acento, minúsculo | nenhum | 22 ocorrências (1 é a definição) → 21 pontos de uso; ex.: `shell/hood-picker.js:4` (`hoodNorm`), `features/groups/views.js:3`, `features/groups/views.js:71`, `features/groups/views.js:73`, `features/search/views.js:2`, `features/search/views.js:55` | **sim** — util pura de busca; vai para `lib/text.ts`. |
| `icon` | `const icon=(n,slot='',filled=false)=>…<md-icon…>` — `utilities/format.js:4` | `<md-icon>` com `slot` opcional, `class="filled"` quando o 3º argumento é *truthy* e `aria-hidden="true"` | nome do ícone Material Symbols vem do chamador | 204 ocorrências de `icon(` (1 é a definição) → 203 pontos de uso; ex.: `shell/primitives.js:3`, `shell/primitives.js:24`, `features/groups/views.js:87`, `features/listings/filters.js:33`, `features/home/desktop.js:38` | **sim** — `<Icon name>` mapeando para `lucide-react`/Material Symbols. Atenção: `shell/primitives.js:24` chama `icon('chevron_right','','false')` — a string `'false'` é *truthy*, então o ícone sai com `class="filled"`; comportamento a decidir na migração. |
| `mark` | `const mark=()=>'<svg class="brand-mark" …>'` — `utilities/format.js:5` | o símbolo da marca em SVG inline (`.bv-symbol-body` + `.bv-symbol-threshold`) | nenhum texto; `viewBox="0 0 100 100"` | `mark()` 10 ocorrências (1 é a definição) → 9 pontos de uso; ex.: `shell/navigation.js:60`, `shell/navigation.js:65`, `features/entry/landing.js:35`, `features/entry/landing.js:89`, `features/entry/account.js:27`, `features/support/help.js:46` | **sim** — `<BrandMark>` como asset; hoje é string SVG replicada em cascas diferentes (topbar, rail, entrada, ajuda). |
| `money` | `const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})…` — `utilities/format.js:6` | nada: formata em real, 0 casas decimais | nenhum (locale `pt-BR`) | 30 ocorrências (1 é a definição) → 29 pontos de uso; ex.: `shell/primitives.js:21`, `features/listings/detail.js:9`, `features/listings/attributes.js:10`, `features/listings/attributes.js:20`, `features/listings/wizard.js:24` | **sim** — util pura de formatação. |
| `uid` | `const uid=p=>p+crypto.randomUUID().replaceAll('-','').slice(0,12)` — `utilities/format.js:7` | nada: id local com prefixo + 12 hex | nenhum | 36 ocorrências (1 é a definição) → 35 pontos de uso; ex.: `app/state.js:8`, `features/requests/model.js:33`, `features/requests/model.js:35`, `features/groups/handlers.js:18`, `features/listings/alerts.js`, `features/businesses/plans.js:67` | **talvez** — se o backend passar a gerar id, some; se o protótipo for portado com estado local, vira `lib/id.ts`. Não é componente. |
| `dateISO` | `const dateISO=(offset=0)=>…` — `utilities/format.js:8` | nada: `YYYY-MM-DD` local, com deslocamento de dias | nenhum | 67 ocorrências (1 é a definição) → 66 pontos de uso; ex.: `app/state.js:10`, `features/groups/views.js:107`, `features/listings/attributes.js:29`, `features/listings/attributes.js:30` | **sim** — util pura; usado para gerar datas de exemplo e comparar validade. |
| `dateLabel` | `const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long'})` — `utilities/format.js:9` | nada: data por extenso curta em pt-BR | nenhum | 12 ocorrências (1 é a definição) → 11 pontos de uso; ex.: `features/events/views.js:19`, `features/home/views.js:16`, `features/requests/views.js:9`, `features/requests/model.js:19`, `features/requests/handlers.js:20` | **sim** — util pura de formatação. |
| `countDays` | `const countDays=d=>Math.max(0,Math.ceil(…/864e5))` — `utilities/format.js:10` | nada: dias inteiros até a data, mínimo 0 | nenhum | 5 ocorrências (1 é a definição) → 4 pontos de uso; ex.: `features/home/views.js:16`, `features/home/views.js:32`, `features/home/desktop.js:9` | **sim** — util pura; alimenta o plano de chegada/saída. |
| `initals` | `const initals=n=>…slice(0,2).map(x=>x[0]).join('\|\|'BV').toUpperCase()` — `utilities/format.js:11` | nada: até 2 iniciais em maiúsculas, fallback `'BV'` | `'BV'` (fallback) | 37 ocorrências (1 é a definição) → 36 pontos de uso; ex.: `shell/primitives.js:24`, `features/messaging/views.js:6`, `features/messaging/views.js:12`, `features/groups/views.js:87`, `features/profile/views.js:6`, `features/listings/detail.js:9` | **sim** — util pura; é o par obrigatório de todo `avatar`. |

#### Shell de estado

| Componente | Assinatura (arquivo:linha) | O que renderiza | Textos/ícones que traz | Usos (total) e exemplos (arquivo:linha) | Vira componente React? (sim/talvez/não + por quê) |
|---|---|---|---|---|---|
| `pagedHtml` | `function pagedHtml(id,sig,list,cardFn,{noun,art='os',wrap='card-grid',end='',size=LIST_PAGE,role=''}={})` — `shell/paged-list.js:7` | `<div class="${wrap}" data-paged>` com os `n` primeiros itens, mais `pagedFootHtml(id)` e `<span class="paged-live" role="status">`; `LIST_PAGE=24` (`:5`); guarda quantidade mostrada por lista+filtro (comentário `:4`) | "Mostrando N de TOTAL NOUN", "Mostrar mais N" (`:14`), "Você viu ART N NOUN" (`:17`), "Carregando mais N…" (`:34`) | 14 ocorrências de `pagedHtml(` (1 é a definição) → 13 pontos de uso; ex.: `features/listings/catalog.js:35`, `features/profile/views.js:9`, `features/community/views.js:7`, `features/groups/views.js:112`, `features/messaging/views.js:2`, `features/search/views.js:27` | **sim** — `<PagedList id sig items renderItem noun>`; o parâmetro `wrap` decide `.card-grid` (default) vs `.list`/`.stack`, então o componente deve cobrir os 3 formatos. |
| Pager interno: `pagedFootHtml` / `pagedSeen` / `pagedStatus` / `pagedMore` / `pagedAuto` / `pagedWatch` / `pagedAction` | `shell/paged-list.js:12`, `:17`, `:18`, `:21`, `:32`, `:38`, `:46` | o pé de lista com contagem + `.paged-bar` + botão, o carregamento automático por `IntersectionObserver` com 2 `.paged-skel` (`:35`) e o `role="status"` | "Mostrando…", "Você viu…", "Carregando mais…"; `pagedMore` dá foco ao primeiro cartão novo (`:28`) | `pagedWatch(` 9 ocorrências (8 pontos de uso) em `shell/navigation.js:107`, `app/handlers.js:43`, `app/handlers.js:46`, `features/listings/map.js:66`, `shell/bindings.js:7`, `:8`, `:10`; `pagedMore`/`pagedAuto`/`pagedFootHtml`/`pagedSeen`/`pagedStatus` só dentro do próprio arquivo; `pagedAction` 2 (1 ponto de uso: `app/handlers.js:17`) | **talvez** — em React o scroll infinito é `useEffect`+`IntersectionObserver` dentro de `<PagedList>`; o *foco no primeiro item novo* e o "quem rola é o `#main` ou o diálogo" (`:40`, `:41`) são requisitos reais a preservar, não detalhes. |
| `askEndHtml` | `function askEndHtml()` — `shell/paged-list.js:45` | `.paged-end` com ícone `forum`, dois textos e um botão tonal; devolve `''` quando `readonly()` | `'Não achou sua dúvida?'`, `'Pergunte: quem mora aqui responde.'`, botão `'Perguntar'` | 3 ocorrências (1 é a definição) → 2 pontos de uso: `features/community/views.js:7`, `features/search/views.js:27` (passado como `end:` do `pagedHtml`) | **sim** — `<ListEnd>`/slot `end`; o irmão `catalogEndHtml` (`features/listings/catalog.js:30`) é a variante de catálogo e deveria compartilhar o mesmo componente. |
| `filterChips` | `function filterChips(values,selected,action)` — `features/listings/catalog.js:1` | `.filter-row[data-seg]` + `<span class="seg-ind">` + `<md-chip-set>` com um `<md-filter-chip label … selected data-action data-value>` por filtro | `aria-label="Filtrar por ${label}"` em cada chip; rótulos vêm do chamador | 17 ocorrências de `filterChips(` (1 é a definição) → 16 pontos de uso; ex.: `features/community/views.js:4`, `features/events/views.js:13`, `features/groups/views.js:110`, `features/profile/views.js:9`, `features/profile/views.js:10`, `features/owner/queues.js:22` | **sim** — `<FilterChips items selected onSelect>`; nota de arquitetura: o helper mora em `features/listings/`, mas 10 arquivos o importam por escopo global — em React vira componente compartilhado. |
| `segmentsAfterRender` | `function segmentsAfterRender(scope=document)` — `shell/segmented.js:13` | nada: mede o chip `md-filter-chip[selected]` de cada `.filter-row[data-seg]` e move o `.seg-ind` com `translate/width/height`, com observador de resize (`:18`) | nenhum | 2 ocorrências (1 é a definição) → 1 ponto de uso: `shell/navigation.js:107` (chamado depois de cada `render()`) | **talvez** — em React o indicador deslizante é CSS/`layoutId` do Framer ou `::after` animado; o ganho é não depender de medir DOM em `requestAnimationFrame` (`:22`). |
| `showDialog` | `function showDialog(title,content,actions,kind='generic')` — `shell/dialogs.js:2` | preenche `#dialog`: `slot="headline"` com `.sheet-grab` + `<span>` título + `iconBtn('close','close-dialog','','Fechar')`, `slot="content"`, `slot="actions" class="dialog-actions"`; marca `dialog.dataset.kind=kind` e empurra histórico (`:6`, `:8`) | `'Fechar'` (aria-label do botão de fechar); título/conteúdo/ações vêm do chamador | 49 ocorrências de `showDialog(` (1 é a definição) → 48 pontos de uso; ex.: `features/listings/map.js:65`, `features/listings/alerts.js:49`, `shell/verified-info.js:9`, `features/profile/demo-actions.js:1`, `features/profile/demo-actions.js:34` (`'Avisos'`) | **sim** — `<Sheet>`/`<Dialog title actions>`; hoje o mesmo componente é folha (`form-dialog`), editor em altura cheia e gaveta lateral via `data-kind` (`styles/overlays.css:2-8`). |
| `closeDialog` | `async function closeDialog(force=false,dropHistory=true)` — `shell/dialogs.js:13` | fecha `#dialog`; se houver edição não salva, chama `confirm(...)` e não fecha; devolve o foco (`:24`) | `'Descartar alterações?'`, `'Você pode continuar editando ou descartar o que ainda não foi salvo.'` (`:13`) | 84 ocorrências (1 é a definição) → 83 pontos de uso (a maioria no próprio `dialogs.js` e em `app/handlers.js:21-30`) | **sim** — é o `onOpenChange`/`close()` do `<Sheet>`; a confirmação de descarte vira um estado controlado. |
| `leaveDialog` | `async function leaveDialog(then)` — `shell/dialogs.js:15` | fecha antes de navegar para outra rota; com edição suja, confirma e só então navega | mesma dupla `'Descartar alterações?'` / `'Você pode continuar editando ou descartar o que ainda não foi salvo.'` (`:18`) | 5 ocorrências (1 é a definição) → 4 pontos de uso: `features/legal/pages.js:49`, `features/profile/blocks.js:45`, `features/profile/hidden.js:18`, `features/support/help.js:150` | **sim** — em React é o "unsaved changes guard" do roteador; portável como hook. |
| `confirm` | `function confirm(title,text,fn,{ok='Confirmar',cancel='Continuar',danger=false}={})` — `shell/dialogs.js:20` | preenche `#confirm-dialog` (`type="alert"`): título, texto (ou um `<p>` por linha quando há `\n`) e dois botões; `danger` injeta `class="danger-fill"` | defaults `'Confirmar'` e `'Continuar'`; rótulos reais vêm do chamador; suporta multi-linha (`:20`) | 25 ocorrências de `confirm(` (1 é a definição) → 24 pontos de uso; ex.: `features/requests/handlers.js:23` (`'Escolher esta proposta?'`), `app/handlers.js:37`, `features/community/manage.js` | **sim** — `<AlertDialog>`; é o par obrigatório de `closeDialog`. |
| Helper interno de diálogo: `pushDialogHistory` / `dropDialogHistory` / `overlayAnimation` / `bindSheetDrag` / listeners `cancel`/`closed` | `shell/dialogs.js:8`, `:9`, `:21`, `:25`, `:31`, `:22-24` | gestão de histórico do overlay, animação de abrir/fechar (spring `cubic-bezier(.32,.72,0,1)`, 500/240 ms — `:28`), véu de `.32` e arrastar-para-fechar pela `.sheet-grab` (limiar 110 px, `:35`) | nenhum | uso local (`dialogs.js` e `sheet-depth.js:3`); `bindSheetDrag` só em `dialogs.js:31` | **talvez** — em React: `history` guard, keyframes do `<Sheet>` e drag do vaul; a mesma animação precisa ser reescrita, não copiada. |
| `notify` | `function notify(text,ic='check_circle',undo=null)` — `shell/toasts.js:18` | empilha avisos: `#snackbar` (o mais novo) + `#toast-stack` (até 2, `TOAST_STACK_MAX`), com barra de tempo e "Desfazer" quando `undo` existe; `TOAST_MS=4200`, `TOAST_UNDO_MS=7000` (`:8`) | `ic` default `'check_circle'`; botão `'Desfazer'` com `aria-label="Desfazer: ${text}"` (`:10`) | 219 ocorrências de `notify(` (1 é a definição) → 218 pontos de uso, em 36 arquivos; ex.: `features/groups/handlers.js:18`, `features/requests/handlers.js:20`, `app/handlers.js:29`, `features/community/manage.js` | **sim** — `<Toaster>`/`toast()`; mas a pilha de 2 com desfazer (*undo*) e pausa no hover/foco (`:35`, `:36`) é contrato, não enfeite. |
| `verifiedBadgeHtml` | `function verifiedBadgeHtml(label='Perfil verificado')` — `shell/verified-info.js:6` | `<button class="pill ok pill-info" data-action="verified-info" aria-haspopup="dialog">` com `verified_user`, o rótulo, `info` | rótulo default `'Perfil verificado'`; ícones `'verified_user'`, `'info'` | 2 ocorrências (1 é a definição) → 1 ponto de uso: `features/listings/detail.js:9` (no bloco `.seller`) | **sim** — `<VerifiedBadge>`; hoje aparece num só lugar, mas o conteúdo da explicação (§`openVerifiedInfo`) é referenciado por ADR no próprio comentário (`:2`). |
| `openVerifiedInfo` | `function openVerifiedInfo()` — `shell/verified-info.js:7` | `showDialog` com 4 linhas `.vinfo-row` (ícone + `<b>` + `<p>`) e o botão `'Entendi'` | título `'O que o selo “verificado” significa'`; linhas `'Vínculo com as Forças conferido'`, `'O resto é declarado pela pessoa'`, `'O anúncio é de quem anuncia'`, `'Combine com cuidado'`; rodapé `'Neste protótipo, a verificação é simulada.'`; botão `'Entendi'` | 2 ocorrências (1 é a definição) → 1 ponto de uso: `app/handlers.js:52` (`case 'verified-info':`) | **sim** — o conteúdo é estável e tem valor de produto; vira um `<VerifiedInfoSheet>` (ou conteúdo de rota), não string no handler. |
| `count-up`: `animateCounts` / `countUp` / `countHtml` / `avatarStack` | `shell/count-up.js:7`, `:16`, `:25`, `:27` | `countHtml(n)` emite `<b data-count-to="n">`; `animateCounts` anima uma vez por rota (900 ms, `:5`); `avatarStack(says,total)` emite até 3 avatares sobrepostos + `+N` | `+N` (`:29`); sem textos | `countHtml` 4 ocorrências (1 é a definição) → 3: `features/businesses/detail.js:5`, `features/home/desktop.js:38`, `features/home/desktop.js:69`; `avatarStack` 3 (1 é a definição) → 2: `features/businesses/detail.js:5`, `features/home/desktop.js:38`; `animateCounts` 2 (1 é a definição) → 1: `shell/navigation.js:107` | **talvez** — `avatarStack` é **sim** (`<AvatarStack>`); a contagem animada é efeito (respeita `prefers-reduced-motion` e roda 1× por rota — `:9`, `:11`), portável como componente com `useEffect`, mas o ganho é duvidoso. |

#### Padrões de view que hoje são HTML repetido

| Componente | Assinatura (arquivo:linha) | O que renderiza | Textos/ícones que traz | Usos (total) e exemplos (arquivo:linha) | Vira componente React? (sim/talvez/não + por quê) |
|---|---|---|---|---|---|
| `page-head` | não é função — `<div class="page-head">` escrito à mão; CSS `styles/base.css:27` | `<div>` com `<h1>` + `<p>` (título/subtítulo) e um botão à direita; variantes: sem `<div>` interno (`features/profile/views.js:6`), com `.row` e avatar (`features/messaging/views.js:12`), `.chat-head` | título/subtítulo e botão vêm de cada tela (ex.: `'Você'`, `'Salvos'`, `'Conversas'`, `'Agenda da cidade'`) | `class="page-head"` 18 ocorrências literais; a palavra `page-head` aparece 21 vezes no JS; ex.: `features/profile/views.js:6`, `features/profile/views.js:10`, `features/community/views.js:1`, `features/listings/catalog.js:13`, `features/requests/views.js:5`, `features/events/views.js:14`, `features/messaging/views.js:12`, `features/home/desktop.js:10` | **sim** — `<PageHead title subtitle action>`; 18 telas repetem o mesmo `<div><h1><p></div>`, e as 2-3 variações (avatar, sem subtítulo) são props. |
| `section` + `section-title` | não é função — `<section class="section">` + `sectionTitle()` (`shell/primitives.js:15`); CSS `styles/base.css:27` | `.section` com margem (`margin-top:28px`, `34px` em ≥720) envolvendo um `.section-title` (h2 + ação de texto) | títulos e rótulos vêm do chamador; `catalogSectionTitle` (`features/listings/catalog.js:37`) acrescenta 2 ações (`'Ver desapegos'`, `'Ver imóveis'`) dentro de `.section-links` | `<section class="section">` 45 ocorrências; `.section-title` literal só 3 no JS: `shell/primitives.js:15` (helper), `features/listings/catalog.js:37` (manual, com `.section-links`), `features/search/views.js:42` (manual: `'Buscas recentes'` + `btn('Limpar',…)`) | **sim** — `<Section title>`; as 2 escritas manuais devem convergir para o componente com um slot de ações. |
| `card-grid` | não é função — classe; default do 3º parâmetro de `pagedHtml` (`shell/paged-list.js:7`); CSS `styles/base.css:27` | grade de cartões: 2 colunas (`base.css:27`), 1 coluna em <480 (`base.css:28`), 3 em ≥720 (`:29`), 4 em ≥1200 (`:30`) | nenhum | 4 referências no JS: `shell/paged-list.js:7` (default `wrap='card-grid'`), `shell/paged-list.js:35` (condição do esqueleto), `features/businesses/catalog.js:1` (`sponsors.map`), `features/search/views.js:19` (config das abas de busca); indiretamente em todas as 13 chamadas de `pagedHtml` que não passam `wrap` | **sim** — `<CardGrid>`/prop `layout` de `<PagedList>`; é a diferença entre `.card-grid` e `.list` que separa catálogo de lista de linhas. |
| `list` / `list-row` | não é função — `<div class="list">` + `<div class="list-row">`; CSS `styles/base.css:27`; variante arrastável `.swipe-row` em `styles/overlays.css:16-20` | contêiner com borda/raio e linhas de 80 px (`min-height:80px`) com `<span class="txt"><b><small>`; linhas consecutivas ganham separador (`base.css:27`) | textos vêm do chamador; ícone final `chevron_right` é praxe | `class="list"` 26 ocorrências; `class="list-row"` 16 literais (26 ocorrências da palavra, contando seletores em `motion/gestures.js:41-42` e `motion/bold-transitions.js:21`, `:38`); ex.: `features/home/views.js:26`, `features/home/desktop.js:18`, `features/home/desktop.js:49`, `features/home/desktop.js:60`, `features/profile/views.js:6`, `features/profile/settings.js:5`, `features/messaging/views.js:1`, `features/community/question.js:8` | **sim** — `<List>` + `<ListRow>`; é a base de `questionRow`, `eventRow`, `profileRow`, `threadRow`, `requestRow`, `noticeRow`, `alertRow`, `hiddenRow`, `blockedRow`, `ticketRow` — 10 implementações da mesma linha. |
| `gPostCard` | `function gPostCard(g,p,full=false)` — `features/groups/views.js:84` | `<article class="gpost">` com cabeçalho (avatar + autor + tempo + pills + menu), texto, bloco de evento, enquete (`.poll`), origem de oferta, linha "também perguntada" e rodapé de ações; `full=true` esconde o rodapé | pills `'Pergunta'`/`'Evento'`/`'Enquete'`/`'Oferta'` (`:86`), `'Resolvida'` (`:87`), `'Publicação removida pela moderação.'` (`:85`), `'Também perguntada à cidade · ver em Indicações'` (`:92`), `` `N comentários` ``/`'Comentar'`/`'Útil'` (`:93`), `'Confirmado'`/`'Vou'` (`:89`), `'Toque para votar'`/`'Votação encerrada'`/`'N votos'` (`:90`) | 5 ocorrências (1 é a definição) → 4 pontos de uso: `features/groups/views.js:108`, `features/groups/views.js:112`, `features/groups/views.js:121`, `shell/in-place.js:24` (troca só o cartão ao curtir) | **sim** — `<GroupPostCard group post full>`; é o componente mais complexo do protótipo (4 tipos de publicação) e o único com pós-processamento in-place, que em React é *state*. |
| `profileRow` | `function profileRow(ic,title,sub,action,value='')` — `features/profile/views.js:8` | `<button class="list-row" data-action data-value>` com `icon(ic)`, `.txt` (`<b>` título, `<small>` subtítulo) e `chevron_right` | nenhum texto próprio; ex. de conteúdo: `'Seu momento'`, `'Meus anúncios'`, `'Alertas de busca'`, `'Pedidos de serviço'`, `'Salvos'` (`features/profile/views.js:6`) | 15 ocorrências (1 é a definição) → 14 pontos de uso: `features/profile/views.js:6` (várias na mesma linha), `app/handlers.js:106`, `features/support/help.js:54`, `features/support/help.js:56` | **sim** — `<SettingsRow icon title subtitle action>`; é o único item de lista já generalizado em função. |
| `readonlyHtml` | `function readonlyHtml()` — `shell/navigation.js:108` | `.context-strip.readonly` com ícone `visibility`, texto de duas partes e um botão de texto; devolve `''` quando não está em modo visita | `'Você está conhecendo'` + cidade em `<b>`, `'Sua cidade atual é'` + cidade; botão `'Voltar'` (`action 'home-city'`) | 9 ocorrências (1 é a definição) → 8 pontos de uso: `features/community/views.js:1`, `features/home/views.js:19`, `features/home/desktop.js:12`, `features/businesses/catalog.js:1`, `features/listings/catalog.js:13`, `features/events/views.js:14`, `features/messaging/views.js:2`, `features/requests/views.js:5` | **sim** — `<ReadonlyStrip>`; o `.context-strip` também é usado em outros 10 lugares (fixado do grupo, local do evento, endereço do anúncio), então o componente deve cobrir a faixa genérica. |
| `paged-end` | não é função própria — emitido por `askEndHtml` (`shell/paged-list.js:45`), `catalogEndHtml` (`features/listings/catalog.js:30`) e em `features/businesses/catalog.js:1`; CSS `styles/paged.css:13-16` | `.paged-end` com ícone, `<span class="grow"><b><small>` e botão tonal | `'Não achou sua dúvida?'`/`'Pergunte: quem mora aqui responde.'`/`'Perguntar'`; `'Não achou o que procura?'`/`'Crie um alerta e avisamos quando aparecer outro imóvel assim.'` ou `'Filtre por bairro, preço e mais para achar mais rápido.'`/`'Avise-me'`/`'Filtrar'` (`features/listings/catalog.js:33`) | 3 ocorrências de `paged-end`: `shell/paged-list.js:45`, `features/listings/catalog.js:33`, `features/businesses/catalog.js:1` (mais `is-end` em `shell/paged-list.js:15`) | **sim** — `<ListEnd>`; o slot `end` de `pagedHtml` já é a interface, só falta um componente único em vez de 3 montagens. |
| `chip` / `pill` | `pill()` (`shell/primitives.js:14`) + tags cruas `<span class="pill…">` + `md-chip-set`/`md-filter-chip`/`md-assist-chip`/`md-suggestion-chip` | `pill` = etiqueta estática; `md-filter-chip` = filtro selecionável (com `data-action`); `md-assist-chip`/`md-suggestion-chip` = comodidades e respostas rápidas | `md-assist-chip` recebe `label` + `icon('check','icon')` (`features/listings/attributes.js:20`); `md-suggestion-chip` recebe `label` (`features/messaging/views.js:17`) | `pill(` 33 (32 pontos de uso) + `class="pill` 6 usos crus; `md-chip-set` 30, `md-filter-chip` 27, `md-assist-chip` 6, `md-suggestion-chip` 3; ex.: `features/events/views.js:19`, `features/groups/views.js:101`, `features/listings/detail.js:9`, `shell/verified-info.js:6`, `shell/primitives.js:3` | **sim** — 4 componentes (`<Badge>`, `<FilterChip>`, `<AssistChip>`, `<SuggestionChip>`); o que hoje é uma classe CSS vira 4 semânticas distintas. |
| `avatar` | não é função — `<span class="avatar">` + `initals()`; CSS `styles/base.css:27`; empilhado em `avatarStack` (`shell/count-up.js:27`) | círculo 44 px com iniciais; `.avatar.me` pinta de primária; `avatarStack` sobrepõe até 3 (28 px, `styles/count-up.css:3-14`) | iniciais por `initals()` com fallback `'BV'`; `+N` no empilhado | `class="avatar` 19 ocorrências; ex.: `shell/primitives.js:24`, `features/groups/views.js:87`, `features/groups/views.js:109`, `features/groups/views.js:122`, `features/messaging/views.js:1`, `features/messaging/views.js:12`, `features/profile/views.js:6`, `features/community/question.js:4` | **sim** — `<MemberAvatar name mine>`; cada tela repete o ternário `p.mine?initals(state.profile.name):p.ini`, que é regra, não formatação. |
| Menu `⋮` | `iconBtn('more_vert', …)` (`shell/primitives.js:8`) | botão de 3 pontos que abre menu/folha; em ações terminadas em `-menu` ganha `aria-haspopup="menu"` | `aria-label` por contexto: `'Opções da conversa'`, `'Opções da publicação'`, `'Opções da resposta'`/`'Opções do comentário'` | `more_vert` 12 ocorrências; ex.: `features/messaging/views.js:1`, `features/messaging/views.js:12`, `features/groups/views.js:87` (2×), `features/groups/views.js:122` (2×), `features/community/question.js:4`, `features/community/manage.js:11`, `features/businesses/detail.js:3`, `features/profile/views.js:6` (usa o ícone `'settings'` no mesmo lugar) | **sim** — `<RowMenu items>`; o rótulo acessível e o `aria-haspopup` dependem do contexto, então o componente precisa receber ambos. |
| `actionsBar` | `function actionsBar(html)` — `shell/navigation.js:69` | preenche `#detail-actions` com `<div class="detail-actions-in">${html}</div>`, desoculta a barra e põe `class="detail"` no root; é escondida a cada `shell()` (`:67`) | nada próprio — o HTML das ações vem do chamador | 6 ocorrências (1 é a definição) → 5 pontos de uso: `features/listings/detail.js:8`, `features/businesses/detail.js:3`, `features/events/views.js:18`, `features/groups/views.js:99`, `features/messaging/views.js:11` | **sim** — `<DetailActions>` (barra fixa inferior no celular, à direita no desktop: `styles/base.css:29`); é uma *slot* de tela, não um botão. |
| esqueleto / `skeleton` | não existe — `skeleton` tem 0 ocorrências no JS; o que existe é `.paged-skel` (`shell/paged-list.js:35`, CSS `styles/paged.css:7-10`) e o shimmer `.img-wait` (`shell/image-loading.js:5`, CSS `styles/empty-states.css:2`, `:5`, `:6`) | `.paged-skel` = 2 cartões cinza (imagem + 2 barras) durante o carregamento automático; `.img-wait` = gradiente sobre `.cover`/`.detail-hero`/`.gallery button` até a foto carregar | nenhum | `paged-skel` 2 ocorrências, ambas em `shell/paged-list.js:35`/`:36`; `img-wait` 3, todas em `shell/image-loading.js:6`, `:8`, `:9` | **não** — não há componente de esqueleto geral a portar; o que há são 2 efeitos locais (pager e imagem). Em React, o `<Skeleton>` do shadcn substitui ambos, mas isso é decisão de design novo, não port. |

### 1. Anatomia de um objeto de estado para os componentes

Só os campos que os componentes **leem** (não o que o dado contém). O shape base vem de
`app/state.js:10`; os registros de exemplo vêm de `data/demo/source.js:1`; campos derivados entram
pelas funções citadas.

- **`item`** (anúncio) — base `app/state.js:4` + `data/demo/source.js:1` + atributos de mercado
  `features/listings/attributes.js:28-36`.
  `id`, `kind` (`'desapego'`/`'imovel'`), `title`, `city`, `hood`, `numPrice`, `per`, `price`,
  `photos[0]`, `icon`, `flag`, `saved`, `mine`, `status`, `seller`, `sini`, `cond`, `cat`, `pickup`,
  `ptype`, `beds`, `area`, `parking`, `condo`, `avail`, `amen[]`, `views`.
  Lido em `shell/primitives.js:19-22`, `features/listings/attributes.js:7-16`,
  `features/profile/hood-privacy.js:5`, `:7`. Nota: `cover` também aceita `item.name`, porque a mesma
  função serve o cartão de negócio (`shell/primitives.js:3`).
- **`biz`** (página de negócio) — base `app/state.js:7` + `data/demo/source.js:1`.
  `id`, `name`, `cat`, `hoods[]`, `city`, `photos[0]`, `icon`, `saved`, `claimed`, `recN`, `says`,
  `disc`, `specs`. Lido em `shell/primitives.js:23`, `features/businesses/plans.js:23` (`isSpon`),
  `shell/count-up.js:27-30` (`avatarStack(bizSays(b),b.recN)` — `bizSays` em `app/state.js:43`).
- **`ask`** (pergunta/indicação) — `data/demo/source.js:1` + `app/state.js:8` (cidade, data e ids das
  respostas) + `app/state.js:9` (entradas preservadas da memória da cidade).
  `id`, `q`, `who`, `ini`, `topic`, `city`, `status`, `answers[]`, `mine`, `hidden`, `hiddenByMe`.
  Lido em `shell/primitives.js:24` e nos predicados `app/state.js:37` (`askVisible`) e `:48`
  (`askAnswers`).
- **`group`** — `features/groups/views.js:4` (`gDefaults`) define o objeto.
  `id`, `city`, `t`, `about`, `img`, `tpl`, `privacy`, `rules`, `notif`, `role`, `pending`, `pinned`,
  `allowOffers`, `auto`, `members`, `unread`, `posts[]`. Lido em `features/groups/views.js:96-113`
  (`renderGroup`), `:101` (`.g-meta`), `:104`-`:106` (faixas `.context-strip`), `:110`
  (`filterChips`), e no filtro `app/state.js:51` (`groupPosts`).
- **`post`** (publicação de grupo) — `features/groups/views.js:6` (`gPost`) constrói o objeto.
  `id`, `type`, `author`, `ini`, `text`, `at`, `comments[]`, `useful`, `liked`, `hidden`, `resolved`,
  `edited`, `mine`, `biz`, `alsoCity`, `event{date,place,time,going,on}`, `poll{options,voted}`.
  Lido integralmente em `features/groups/views.js:84-95`, mais `app/state.js:52` (`postComments`).
- **`event`** (encontro) — `data/demo/source.js:1` + `app/state.js:10`.
  `id`, `date`, `time`, `title`, `place`, `city`, `going`, `max`, `on`, `mine`, `description`.
  Lido em `shell/primitives.js:25`, `features/events/views.js:14`, `:18`, `:19` (a tela usa também
  `place`/`city` na faixa de contexto e `{e.max||'Livre'}` em `.facts`).
- **`thread`** (conversa) — `data/demo/source.js:1` + `app/state.js:10` (cidade, snapshot, `at` das
  mensagens).
  `id`, `who`, `ini`, `about{type,id,t}`, `msgs[]`, `unread`, `pinned`, `updatedAt`, `deleted`,
  `snapshot{title,photo}`, `draft`. Lido em `features/messaging/views.js:1`, `:3`, `:6`, `:7`, `:11`,
  `:12`; filtro em `features/messaging/views.js:2`.
- **`message`** — `data/demo/source.js:1` (`{me,t}`) + `app/state.js:10` (`at`) + `react`
  gravado em `features/messaging/bubbles.js:59`.
  `t`, `me`, `at`, `react`. Lido em `features/messaging/bubbles.js:15` (`chatAt`), `:19`, `:30-41`.
- **`request`** (pedido de serviço) — `features/requests/model.js:33` (`seedProviderRequests`)
  mostra o objeto completo.
  `id`, `city`, `cat`, `spec`, `hood`, `desc`, `when{kind,date}`, `photos[]`, `status`, `createdAt`,
  `expiresAt`, `proposals[]`, `chosen`, `threadId`, `who`, `mine`. Lido em
  `features/requests/views.js:2` (`requestRow`), `:9` (`proposalCard`), `:14`, e nos predicados
  `features/requests/model.js:7-19`.
- **`proposal`** (proposta de empresa) — `features/requests/model.js:35`.
  `id`, `bizId`, `price{kind,min,max}`, `date`, `duration`, `validUntil`, `msg`, `status`, `at`.
  Lido em `features/requests/views.js:9`, `:34-36` e em `features/requests/model.js:20`
  (`proposalPrice`).
- **`notice`** (aviso) — `data/demo/source.js:1` (com `html`) e os avisos gerados em
  `features/requests/model.js:35`, `:37`, `:40` (com `text`).
  `id`, `city`, `html`, `text`, `when`, `go[0]`, `go[1]`, `unread`. Lido em
  `features/profile/demo-actions.js:22` (`noticeText`), `:28` (`noticeRow`), `:27`
  (`NOTICE_ICONS[n.go?.[0]]`).
- **`profile`** — `app/state.js:10` + `features/profile/hood-privacy.js:9` (lê
  `state.profile.hood`) + `app/state.js:26` (lê `state.profile.email`).
  `name`, `role`, `force`, `verified`, `hood`. Lido em `features/profile/views.js:6` e
  `features/listings/detail.js:9`.

### 2. Classes CSS de layout que funcionam como componentes

Todas as linhas de `styles/base.css:27-30` são blocos minificados: a linha `:27` é o CSS base, `:28`
o `@media(max-width:479px)`, `:29` o `@media(min-width:720px)` e `:30` o `@media(min-width:1200px)`.

| Classe | Definição (styles/arquivo.css:linha) | Telas onde aparece |
|---|---|---|
| `.page-head` | `styles/base.css:27` (bloco base); ajustes em `styles/base.css:28` (`.page-head{gap:8px}`), `styles/base.css:29` (`.page-head p{font-size:15px}`), `styles/home-mobile.css:5`, `styles/home-mobile.css:6`, `styles/home-desktop.css:10`, `:11`, `:12`, `:68`, `styles/search-mobile.css:20` | Início (`features/home/views.js:17`, `features/home/desktop.js:10`), Comunidade (`features/community/views.js:1`), Conversas (`features/messaging/views.js:2`, `:12`), Você/Salvos/Meus anúncios/Minhas perguntas (`features/profile/views.js:6`, `:9`, `:10`, `:13`), Ocultados (`features/profile/hidden.js:14`), Pessoas bloqueadas (`features/profile/blocks.js:23`), Pedidos (`features/requests/views.js:5`), Agenda (`features/events/views.js:14`), Catálogo (`features/listings/catalog.js:13`), Negócios (`features/businesses/catalog.js:1`), Busca (`features/search/views.js:6`), Ajuda (`features/support/help.js:47`, `:93`), Guia de transferência (`features/transfers/guide.js:1`), página legal (`features/legal/pages.js:45`) |
| `.section` | `styles/base.css:27`; `styles/base.css:29` (`.section{margin-top:34px}`, `.two-col .section{margin-top:20px}`) | as 45 ocorrências de `<section class="section">` (Início, Comunidade, Grupos, Negócios, Pedidos, Perfil, Evento, Anúncio) |
| `.section-title` | `styles/base.css:27`; `styles/base.css:28` (`.section-title h2{font-size:19px}`), `styles/base.css:30` (`.section-title h2{font-size:22px}`), `styles/home-mobile.css:21`, `:44`, `styles/home-desktop.css:27`, `:41`, `:42`, `styles/search-mobile.css:3` | emitida por `sectionTitle` (`shell/primitives.js:15`) e escrita à mão em `features/listings/catalog.js:37` e `features/search/views.js:42`; irmã `.section-links` em `styles/catalog.css:18` |
| `.card-grid` | `styles/base.css:27` (2 colunas), `styles/base.css:28` (1 coluna), `styles/base.css:29` (3), `styles/base.css:30` (4) | aplicada por `pagedHtml` (`shell/paged-list.js:7`), `features/businesses/catalog.js:1`, `features/search/views.js:19`; logo, em Catálogo, Salvos, Negócios, Busca, Meus anúncios, Grupos (busca) |
| `.list` / `.list-row` | `styles/base.css:27` (`.list`, `.list-row`, `.list-row .txt`); `styles/entry.css:85` (`.settings-links .list-row{min-height:64px}`); `styles/home-mobile.css:46`; `styles/home-desktop.css:44`; `styles/motion-bold.css:2` (`:active{scale:.97}`); `styles/push-install.css:13` | Início (`features/home/views.js:26`, `features/home/desktop.js:18`, `:49`, `:60`), Você (`features/profile/views.js:6`, `:8`), Configurações (`features/profile/settings.js:5`), Conversas (`features/messaging/views.js:1`), Indicações (`features/community/views.js:7`), Pedidos (`features/requests/views.js:6`, `:7`), Agenda (`features/events/views.js:14`), Pergunta (`features/community/question.js:8`), Ocultados (`features/profile/hidden.js:10`), Bloqueados (`features/profile/blocks.js:19`), Ajuda (`features/support/help.js:92`), Avisos (`features/profile/demo-actions.js:28`) |
| `.detail-hero` | `styles/base.css:27`; `styles/base.css:29` (`max-height:480px;aspect-ratio:16/8`); `styles/base.css:49` (filtro de foto no tema escuro); `styles/detail-immersive.css:7` (`body.immersive` → 4/3 e sem raio); shimmer em `styles/empty-states.css:2`, `:5`, `:6` | anúncio (`features/listings/detail.js:9`), negócio (`features/businesses/detail.js:5`), grupo (`features/groups/views.js:101`, com `.g-hero` e `aspect-ratio:16/7`) |
| `.empty` (+ `.empty-art`, `.empty-ic`, `.d1/.d2/.d3`) | `styles/base.css:27`; `styles/empty-states.css:7` (gradiente), `:8`-`:18` (arte, pontos e animações), `:22` (`forced-colors` esconde a arte) | emitida por `empty()` (`shell/primitives.js:18`) e replicada em `features/profile/blocks.js:14` |
| `.fpills` / `.fpill` | `styles/catalog.css:2`, `:3`, `:4`; `.fpill` `:5`, `:6`, `:7`; `.fbar` `:10`, `:12`; `.fsort` `:13`; `.falert` `:65`-`:67` | Catálogo de imóveis/desapegos (`features/listings/filters.js:31`) |
| `.fpanel` (`.sheet`/`.pop`/`.full`/`.drawer`) + `.fgrab`/`.fhead`/`.fbody`/`.fsec`/`.ffoot` | `styles/catalog.css:21`-`:36`, `:52`-`:58`, animações em `:59`-`:60` | painel de filtros e folha do bairro (`features/listings/filters.js`, `features/listings/hood-panel.js`) |
| `.paged-foot` / `.paged-bar` / `.paged-skel` / `.paged-end` / `.paged-live` | `styles/paged.css:2`-`:6`, `:7`-`:12`, `:13`-`:16`, `:20` | toda lista paginada (13 chamadas de `pagedHtml`, ex.: `features/listings/catalog.js:35`, `features/community/views.js:7`, `features/messaging/views.js:2`) |
| `md-dialog.form-dialog` / `[data-kind=editor]` / `[data-kind=prototype]` e `.sheet-grab` | `styles/overlays.css:2`, `:3`, `:4`, `:5`, `:6`, `:7`, `:8`; `styles/sheets.css:3`-`:35` (`body.sheet-depth`) | todo overlay aberto por `showDialog` (`shell/dialogs.js:5`), incluindo a gaveta lateral (`data-kind='prototype'`, `shell/dialogs.js:27`) |
| `.hood-panel[data-stop=low\|half\|full]` + `.hp-*` | `styles/sheets.css:7`-`:34` | folha do bairro no mapa (`features/listings/hood-panel.js:13`) |
| `.detail-actions` / `.detail-actions-in` | `styles/base.css:27`; ajustes `:28`, `:29` (`justify-content:flex-end`, `min-width:220px`); `styles/navigation.css:13`; nó `#detail-actions` em `shell/template.html:5` | anúncio, negócio, evento, grupo e conversa (5 chamadas de `actionsBar`, `shell/navigation.js:69`) |
| `.context-strip` (e `.readonly`) | `styles/base.css:27`; `:28` (`font-size:13px`), `:29` (`padding:14px 18px`); `styles/high-contrast.css:1`; `.readonly` sobrescreve para secundário (`styles/base.css:27`) | 18 usos: faixa de visita (`shell/navigation.js:108`), grupo fechado/fixado (`features/groups/views.js:104`, `:106`, `:124`), local do encontro (`features/events/views.js:19`), endereço do anúncio (`features/listings/detail.js:9`), negócio (`features/businesses/detail.js:5`, `:11`), Início (`features/home/views.js:27`, `:39`, `features/home/desktop.js:15`) |
| `.metric-grid` / `.metric` | `styles/base.css:27` | anúncio (`features/listings/detail.js:9`), negócio (`features/businesses/detail.js:28`) |
| `.profile-box` / `.profile-grid` / `.profile-stat` | `styles/base.css:27`; `.profile-grid` 4 colunas em `:29` | Você (`features/profile/views.js:6`) |
| `.gpost*`, `.poll*`, `.g-back`, `.g-actions`, `.g-rules`, `.g-compose`, `.g-tile` | `styles/groups.css:11`-`:28`, `:29`-`:37`, `:38`-`:44`, `:47` | grupo e publicação (`features/groups/views.js:84-126`) |
| `.avatar` / `.avatar.me` / `.avatar-stack` | `styles/base.css:27` (`44px`, `.me` primária, `.profile-box .avatar` 62 px); `styles/count-up.css:3`-`:14`; `styles/groups.css:27`, `:32` | 19 usos crus de `class="avatar`; empilhados em `features/home/desktop.js:38`, `features/businesses/detail.js:5` |
| `.pill` (+ `.ok`, `.ad`, `.warn`, `.pill-info`) | `styles/base.css:27`; `.pill.ok` redefinido em `styles/overlays.css:33`; `.pill-info` em `styles/empty-states.css:24`-`:26`; `styles/high-contrast.css:1` | 32 usos via `pill()` + 6 crus (`shell/primitives.js:3`, `shell/verified-info.js:6`, `features/groups/views.js:101`, `features/listings/detail.js:9`, `features/businesses/detail.js:5`) |
| `.agenda-day` / `.agenda-date` | `styles/catalog.css:112`, `:113` | Agenda (`features/events/views.js:14`) |
| `.compose-bar` / `.bubble` / `.message-list` / `.conversation-context` | `styles/base.css:27`; `.message-list.chat-list` em `styles/chat-bubbles.css:2`, `.chat-list .msg-row` em `styles/chat-bubbles.css:3`, `.top-chat` em `styles/chat-mobile.css:3` e `.top-chat .avatar` em `styles/chat-mobile.css:4` | Conversa (`features/messaging/views.js:11`, `:12`) |

### 3. O que não vira componente

- **A montagem de cada tela em torno dos helpers.** `renderPlan` (`features/home/views.js:32`) monta
  o cartão de plano com anel, `.plan-steps`, `.plan-now` e a fatia visível das etapas — é uma
  composição única da Início; não há segunda tela usando isso. Idem `renderHome`
  (`features/home/views.js:17`) e `homeDeskGroups` (`features/home/desktop.js:46`).
- **As cópias locais que duplicam um componente existente.** O cartão de negócio do desktop
  (`features/home/desktop.js:38`) reimplementa `businessCard` (`shell/primitives.js:23`) com
  `.home-biz-foot`/`.home-biz-go`; a linha de publicação da lateral desktop
  (`features/home/desktop.js:49`) reimplementa `.list-row` sem `profileRow`. Não são componentes
  novos: são dívida a colapsar.
- **As variantes de `.list-row` de uma tela só**: `threadRow` (`features/messaging/views.js:1`),
  `requestRow` (`features/requests/views.js:2`), `noticeRow`
  (`features/profile/demo-actions.js:28`), `alertRow` (`features/listings/alerts.js:41`),
  `hiddenRow` (`features/profile/hidden.js:8`), `blockedRow` (`features/profile/blocks.js:17`),
  `ticketRow` (`features/support/help.js:65`), e a linha escrita à mão dentro do L3 de exclusão de
  conta (`features/support/help.js:92`, um `.list-row` cru sem função). Cada uma tem ícone, coluna e
  pills próprios; o valor está em herdar `<ListRow>`, não em criar 8 componentes.
- **As telas do Painel do dono.** `features/owner/console.js:90`, `:99` e `:101` montam
  `.ow-card`/`.ow-queue`/`.ow-subnav` com `filterChips` e `<h1 class="ow-h1">` ("Bom dia,
  ${name}"); o dono não usa `.list-row` nem `.page-head` (0 ocorrências), e o CSS é um arquivo
  próprio (`styles/owner.css`, ex. `.ow-card` em `:28`, `.ow-card-head` em `:88`). É uma casca
  paralela, não um consumidor dos primitivos.
- **Conteúdo legal e de onboarding como string.** Os textos de `features/legal/pages.js:44-45`,
  `features/support/help.js:46`, `:140` e `features/entry/landing.js` são páginas inteiras em
  template string, com classes próprias (`.en-*`, `.ld-*`, 135 ocorrências de `ld-`); em React são
  páginas/componentes de conteúdo, não primitivos de biblioteca.
- **`proposalCard` (`features/requests/views.js:9`) vs. `proposalCompareHtml`
  (`features/requests/views.js:34`)**: as duas renderizam a mesma proposta em formatos diferentes
  (cartão e coluna de comparação, `.prop-col`). É decisão de tela, não primitivo.
- **`md-assist-chip` de comodidades** (`features/listings/attributes.js:20`): é um `md-chip-set`
  com `icon('check','icon')` dentro do detalhe do imóvel; não é reusado em outra tela.
- **O esqueleto** (§`skeleton` na tabela): não existe componente a portar; o que existe são o
  carregamento do pager e o shimmer da imagem, ambos efeitos locais.
- **`gThumb` (`features/groups/views.js:55`)** e as telas de grupo além do cartão: geram miniatura
  com `g-tile g-${tpl}` (7 presets em `features/groups/presets.js:2`); é um mapa de estilo de grupo,
  específico da feature.

### 4. Lacunas

- **Contagens.** As de "ocorrências" são de varredura literal do `src` (sem `vendor/` e sem
  `styles/`), com a definição incluída; para helpers usados por *referência* (`photoCard`,
  `businessCard`, `questionRow`, `eventRow`, `businessCard`, `threadRow`, `eventRow`) a contagem de
  `nome(` subestima os pontos de uso — por isso cada linha diz se conta uso com parênteses ou
  referência. `$` e `$$` foram contados como substring (`$(` inclui o interior de `$$(`): os números
  brutos são 444 e 37, e o texto da tabela usa 407/37.
- **`styles/base.css` é uma linha por bloco.** `base.css:27` contém centenas de regras; citar
  "base.css:27" localiza o bloco, não a regra. Não há como dar linha mais fina sem reprocessar o
  arquivo.
- **`class="detail-actions"` e `class="page"` não existem como literal no JS** (0 ocorrências):
  `#detail-actions` é nó do template (`shell/template.html:5`) e `.page` é montado em
  `shell/navigation.js:107` com classes condicionais (`chat-page`, `owner-page`, `entry-page`).
- **Mobile não bloqueia esta entrega**, mas as diferenças por viewport deste capítulo estão só no
  nível de CSS (as media queries citadas em §2); não medi 375/768/1440 em runtime — **não
  verificado**.
- **Sem verificação de runtime:** tudo aqui é leitura de código. Não abri o protótipo, não rodei o
  build nem o servidor, e não confirmei quais desses helpers ainda estão em uso em telas que eu não
  li (`features/owner/*`, `features/support/help.js`, `features/entry/*` foram lidos apenas nas
  linhas em que aparecem nas buscas).
- **`EMPTY_ART` fora do helper:** `features/profile/blocks.js:14` repete a anatomia inteira de
  `empty()` em vez de chamá-lo — está anotado como uso, mas a razão (precisar de botão `'Ver mesmo
  assim'` e ícone `'cancel'`) **não verificado** se seria coberta pelos parâmetros atuais.
- **Órfãos aparentes:** `businessCard` só é usado como referência (5 pontos de uso, todos por
  callback) e `eventRow` só 2 — não achei nenhuma tela que renderize `businessCard` diretamente com
  parênteses; **não verificado** se existe algum caminho não coberto pela varredura.
- **`segmentsAfterRender` e `animateCounts`** são chamados juntos em `shell/navigation.js:107`, uma
  única vez; se a reescrita usar componentes, esses dois efeitos precisam de novo ponto de entrada e
  não há segundo consumidor que sirva de referência.

---

## 8. Dados de demonstra��o

Inventário dos dados de exemplo do protótipo HTML (`prototypes/bivaque-html/src/`) para o porte a
Next + shadcn/ui. Tudo abaixo foi lido no código nesta sessão; **nada foi observado em runtime**
(não rodei o protótipo). Cada afirmação cita `arquivo:linha` (1-based); valores e textos literais
aparecem entre aspas; entidades grandes ficam sem despejo de conteúdo (as imagens, em especial, são
citadas só por chave).

**Como contei.** `source.js` (`prototypes/bivaque-html/src/data/demo/source.js`) tem **uma única
linha de 23 522 caracteres** (`split('\n').length === 1`), então o `read` trunca. Contei avaliando o
arquivo no Node (`readFileSync` + `eval` de `SOURCE`) e enumerando cada array/objeto com
`Object.keys` e `.length`; os bairros e CEPs, avaliando `bairros.js` do mesmo modo; as chaves de
`ASSETS`, com `Object.keys(ASSETS)` e o MIME por regex `^data:([^;]+);base64,`. As contagens de uso
de imagem saíram de busca literal por `'chave'`/`"chave"` em `src/**/*.{js,html,json}`.

### 1. Entidades

`SOURCE` tem quatro chaves de topo (contadas no arquivo): `live`, `seed`, `memory` e `cities`
(`source.js:1`). `live` é o cenário principal (cidade "ativa"); `seed` é o cenário "Cidade
começando" (mesma forma, dados menores). Quem lê cada coisa é `initial(stage)`
(`app/state.js:3-10`).

#### `SOURCE.live`

| Entidade (campo) | Qtde | Campos do registro (tipo) com exemplo literal | Onde é usada nas telas |
|---|---|---|---|
| `live.items` | **6** | `id` (str, `"i1"`), `kind` (`"desapego"`/`"imovel"`), `price` (str, `"R$ 800"`), `title`, `hood` (`"Ponta Negra"`), `icon`, `tone` (`"th-a"`), `flag` (`"Transferido"`), `saved` (bool), `seller`, `sini`, `stone`, `note`, `desc`; só em i4/i6: `views` (num, `58`), `leads` (num, `4`), `mine` (bool) | `app/state.js:4` converte em `state.items`; Início (`features/home/desktop.js:42`), Desapegos/Imóveis (`features/listings/catalog.js:29`), detalhe `anuncio` (`features/listings/detail.js:9`), Salvos, Meus anúncios, busca e paleta (`shell/command-palette.js:26`) |
| `live.biz` | **9** | `id` (`"b1"`), `kw` (arr de str, `["ar","split"]`), `name` (`"Amazon Climatização"`), `cat` (`"Climatização"`), `icon`, `tone`, `tile`, `ini`, `hoods` (arr, `["Planalto","Dom Pedro","Flores","Ponta Negra"]`), `hours`, `owner` (str, `"Esposa de militar, verificada"`), `rec` (frase), `recN` (num, `3`), `bio`, `svc` (arr de str), `says` (arr de `[ini,tone,quem,texto]`), `saved`; ocasionais: `disc`, `spon` (bool), `ad` (bool) | `app/state.js:7` → `state.biz`; Negócios locais (`features/businesses/catalog.js:1`), detalhe `negocio`, aba `biz` da Comunidade (`features/community/views.js:3`), Prestador de pedidos (`features/requests/model.js:18`), Painel do Bivaque (`features/owner/business-team.js:6`) |
| `live.asks` | **7** (com **4** respostas aninhadas) | `id` (`"a1"`), `who`, `ini`, `tone`, `ctx` (`"chegou há 3 dias"`), `q` (pergunta), `topic` (`"Saúde, Parque 10"`), `when`, `status` (`"open"`/`"ok"`), `answers` (arr de `{who,ini,tone,t,helped,solved?,biz?}`) | `app/state.js:8` → `state.asks`; Comunidade (`features/community/views.js:5`), Início (`features/home/views.js:24`), busca (`features/search/views.js:5`), Perfil ("suas perguntas") |
| `live.events` | **4** | `id` (`"e3"`), `dow` (`"sáb"`), `day` (num, `6`), `title`, `going` (num, `31`), `on` (bool), `place` (`"Parque do Mindu, área de piquenique, 17h"`), `modes` (arr, `["chegando"]`) | `app/state.js:10` → `state.events`; Agenda (`features/events/views.js:8`), detalhe `evento` (`features/events/views.js:17`), Início (`features/home/desktop.js:55`) |
| `live.threads` | **4** (com **7** mensagens aninhadas) | `id` (`"t1"`), `who`, `ini`, `tone`, `about` (`{type:"item",id:"i3"}` \| `{type:"biz",id:"b1"}` \| `{type:"text",t:"Escola no 3º ano"}`), `unread` (bool), `time` (`"10:24"`), `msgs` (arr de `{me:bool,t}`), `reply` (rascunho sugerido) | Conversas (`features/messaging/views.js`), badge da navegação (`shell/navigation.js:59`), métricas da página (`features/businesses/detail.js:28`) |
| `live.notices` | **2** | `id` (`"n1"`), `ini`, `tone`, `html` (com `<b>`), `when` (`"Segunda"`), `go` (arr, `["conversa","t3"]`), `unread` (bool) | `app/state.js:10` → `state.notices`; Início e avisos (`features/profile/demo-actions.js:21`) |
| `live.plan.chegando` | **6** | `id` (`"c1"`), `t` (`"Moradia"`), `s` (frase), `done` (bool), `go` (arr, `["filter","imovel"]`) | Início, plano de chegada (`features/home/views.js:32`), diálogo "Seu plano de chegada" (`app/handlers.js:149`) |
| `live.plan.saindo` | **4** | idem (`"s1"`…`"s4"`) | Início, plano de saída |
| `live.comms` | **5** | `id` (`"k1"`), `t`, `s` (`"38 famílias, conversa ativa"`), `img` (chave de `ASSETS`, `"friends"`), `modes` (arr), `on` (bool), `about` | **nenhuma**: busquei `comms` em `src/**/*.js` e o único resultado é a própria definição (`source.js:1`). Os grupos da tela vêm de `buildGroups` (`features/groups/views.js:7-33`) |
| `SOURCE.memory` | **11** | `q` (pergunta), `k` (arr de palavras-chave), `st` (`"ok"`, `"ans3"`, `"ans2"`), `cat` (`"saude"`, `"escola"`, `"casa"`, `"carro"`, `"pets"`, `"mudanca"`) | `app/state.js:9` transforma cada uma em pergunta da Comunidade (`fromMemory:true`), com o relato de `KNOWLEDGE_TEXT` e o negócio de `MEMORY_BIZ` |
| `SOURCE.cities` | **4** | `{fam: num}` — `"Manaus"`: `{fam:14}`, `"Brasília"`: `{fam:41}`, `"Rio de Janeiro"`: `{fam:63}`, `"Natal"`: `{fam:9}` | `CITY_NAMES` (`data/demo/model.js:2`); número de membros da turma de chegada (`features/groups/views.js:5`) |

Somando só os arrays de primeiro nível de `SOURCE.live`: 5 (`comms`) + 6 + 4 (`plan`) + 7 + 6 + 4 + 4
+ 2 + 9 = **47 registros**, fora as 4 respostas e as 7 mensagens aninhadas.

#### Campos escalares de `SOURCE.live` (e o que `initial()` realmente usa)

`live` também traz escalares em `source.js:1`. Comparando com `app/state.js:3-10`, `initial()` lê
apenas `mode` e `dest` (via `src.mode`, `src.dest`) e os arrays acima. **Não encontrei leitura** de
`city` (`"Manaus"`), `resolved` (`214`), `myAnswers` (`11`), `filter` (`"all"`), `qf` (`"open"`),
`arrive` (`"2026-11-04T05:00:00.000Z"`), `leaveDays` (`41`), `link` (`"ativa"`), `force`
(`"Aeronáutica"`), `obMode` (`"chegando"`), `verified` (`"yes"`), `failPortal` (`false`), `cap`
(`3`), `steps` (objeto de 9 booleanos), `bizCat` (`"Todos"`), `bizQ` (`""`), `incoming` (`14`),
`quoteOn` (`false`), `nid` (`10`), `turmaJoined` (`false`) nem `myBiz` (`null`) — os valores
equivalentes estão escritos à mão em `state.js:10` (`homeCity:'Manaus'`, `city:'Manaus'`,
`profile.name:'Rafael Souza'`, `profile.force:'Aeronáutica'`, `profile.verified:true`,
`prefs.cap:3`, `incoming: stage==='seed'?0:14`, `myBiz:null`).

#### `SOURCE.seed`

Mesma forma, tamanhos menores (contados do mesmo modo): `comms` **3**, `plan.chegando` **6**,
`plan.saindo` **4**, `asks` **0**, `items` **3** (i1, i4, i6), `events` **1** (e9, "Café de lançamento
do Bivaque em Manaus"), `threads` **0**, `notices` **1**, `biz` **6** (b1, b2, b4, b7, b9, b6) —
**24 registros**. Diferenças de conteúdo: `resolved:0`, `myAnswers:0`, textos de `s` viram convites
("Grupo novo", "Imóveis aparecem aqui quando alguém anunciar"), `b1/b7/b9/b6` ficam com `bio:""`,
`svc:[]` e `hours:"Horário a confirmar com o dono"`, `b1.spon:false`, `b2.claimed:true`, e há dois
campos só aqui: `"stage":"seed"` e `seedTasks` (`{biz:false,ask:false,invite:false}`) —
**nenhum dos dois é lido por outro módulo** (busquei `seedTasks` e `stage` em `src/**/*.js`). O
cenário é escolhido pelo argumento de `initial(stage)`, não pelo campo.

### 2. Cidades e bairros

`CITY_NAMES` é derivado, não escrito: `const CITY_NAMES=Object.keys(SOURCE.cities)`
(`prototypes/bivaque-html/src/data/demo/model.js:2`). Ordem literal das chaves em `source.js:1`:
`"Manaus"`, `"Brasília"`, `"Rio de Janeiro"`, `"Natal"` (4 cidades). Diferente da ordem de
`OWNER_DEMO.cities`, que começa por `"Rio de Janeiro"` (`data/demo/owner.js:4-9`).

`BAIRROS` (`data/demo/bairros.js:5-10`) é um mapa cidade → lista de `[nome, zona, [longitude,
latitude]]` — o par é **`[longitude, latitude]`**, conforme o comentário de `bairros.js:1`. Contagem
por cidade (avaliando o arquivo no Node):

| Cidade | Bairros | Zonas (quantos bairros cada) | Coordenada de exemplo (literal) |
|---|---|---|---|
| `"Manaus"` | **11** | `"Zona Oeste"` 3, `"Zona Centro-Oeste"` 2, `"Zona Centro-Sul"` 4, `"Zona Sul"` 1, `"Zona Norte"` 1 | `['Ponta Negra','Zona Oeste',[-60.0962,-3.0509]]` (`bairros.js:6`) |
| `"Brasília"` | **9** | `"Plano Piloto"` 3, `"Sudoeste/Octogonal"` 1, `"Cruzeiro"` 1, `"Lago Sul"` 1, `"Lago Norte"` 1, `"Guará"` 1, `"Águas Claras"` 1 | `['Asa Sul','Plano Piloto',[-47.8930,-15.8170]]` (`bairros.js:7`) |
| `"Natal"` | **11** | `"Zona Sul"` 5, `"Zona Leste"` 4, `"Zona Norte"` 2 | `['Ponta Negra','Zona Sul',[-35.1800,-5.8800]]` (`bairros.js:8`) |
| `"Rio de Janeiro"` | **12** | `"Zona Sul"` 4, `"Centro"` 1, `"Zona Norte"` 3, `"Zona Oeste"` 4 | `['Copacabana','Zona Sul',[-43.1870,-22.9710]]` (`bairros.js:9`) |

Total: **43 bairros**. Note-se que `"Ponta Negra"` existe em Manaus e em Natal, e `"Centro"` em
Manaus e no Rio — o nome do bairro só é único dentro da cidade.

`CEP_TESTE` (`bairros.js:13`) tem **14** entradas `CEP → [cidade, bairro]`: Manaus 4
(`"69050000"→["Manaus","Parque 10"]`…), Brasília 3, Natal 3, Rio de Janeiro 4. O comentário logo
acima (`bairros.js:11-12`) diz "Só os oito números" — **está desatualizado**: são quatorze.

Quem depende disso:

- `hoodsOf(city)` / `hoodInfo` / `hoodKm` (haversine) / `hoodPopular` (os 4 bairros com mais
  anúncios, pedidos e negócios) — `shell/hood-picker.js:5-8`, `:15-21`; o campo de bairro é usado em
  anúncio, pedido, indicação, perfil e evento (`hoodField`/`hoodPicker`).
- Busca de bairro por CEP ou geolocalização, com a mensagem `'Escolha o bairro na lista. O CEP não
  fica salvo.'` (`shell/hood-picker.js:12`, `:33-45`); o raio de "longe" é `HOOD_FAR_KM=30`
  (`:13`).
- Validação de cidade na entrada e no "Seu momento" (`features/entry/arrive.js:41,43`;
  `shell/navigation.js:27,36`; `app/handlers.js:65`) e no seletor de cidade
  (`features/profile/settings.js:1`).
- Turma de chegada por cidade e ciclo (`features/groups/views.js:2-5`).

### 3. Constantes do protótipo

Constantes fechadas (listas) e limites. "Onde vive" é `arquivo:linha`; "quem usa" cita um ponto real
de consumo, não todos.

#### Listas fechadas pedidas

| Constante | Valor literal | Onde vive | Quem usa |
|---|---|---|---|
| Categorias de desapego `ITEM_CATEGORIES` | `['Móveis','Eletrodomésticos','Eletrônicos','Infantil','Casa e decoração','Esporte e lazer','Pets','Roupas e acessórios','Outros']` (9) | `features/listings/attributes.js:5` | Editor e wizard de anúncio (`features/listings/editor.js:8`, validação `:14`), filtro de categoria (`features/listings/filters.js:55`), vocabulário da busca (`features/search/views.js:52`) |
| Estado de uso `ITEM_CONDITIONS` | `['Novo','Seminovo','Usado','Precisa de reparo']` (4) | `features/listings/attributes.js:6` | Editor (`:14`), filtro "Estado de uso" (`filters.js:56`) |
| Tipos de imóvel `PROPERTY_TYPES` | `['Apartamento','Casa','Casa em condomínio','Flat ou studio','Kitnet']` (5) | `features/listings/attributes.js:3` | Editor (`editor.js:8,14`), wizard (`wizard.js:10,47,52`), filtro de tipo (`filters.js:43`) |
| Amenidades `PROPERTY_AMENITIES` | `[['furnished','Mobiliado'],['pets','Aceita pets'],['ac','Ar-condicionado'],['balcony','Varanda'],['pool','Piscina'],['gym','Academia'],['doorman','Portaria 24h'],['leisure','Área de lazer']]` (8 pares chave/rótulo) | `features/listings/attributes.js:4` | Chips `md-filter-chip` do editor; `amenityLabel` no detalhe (`attributes.js:26`, `:18`) |
| Grupos de serviço `SERVICE_GROUPS` | 13 grupos: `'Casa e reparos'`, `'Climatização e eletrodomésticos'`, `'Limpeza e jardim'`, `'Mudança e transporte'`, `'Veículos'`, `'Saúde'`, `'Beleza e bem-estar'`, `'Educação'`, `'Pets'`, `'Festas e comida'`, `'Tecnologia'`, `'Documentos e consultoria'`, `'Outros'` (este último sem especialidades) | `features/businesses/taxonomy.js:4-18` | Negócios, pedidos e indicações; `GROUP_NAMES` (`:19`) valida a categoria no envio (`features/businesses/indication.js:2`); vocabulário da busca (`features/search/views.js:52`) |
| Especialidades (por grupo) | 8 + 6 + 7 + 6 + 6 + 6 + 6 + 5 + 6 + 6 + 5 + 5 + 0 = **72** especialidades. Ex.: `'Casa e reparos'` → `['Elétrica','Hidráulica','Pintura','Pedreiro e reforma','Pequenos reparos','Montagem de móveis','Chaveiro','Vidraçaria e serralheria']` | `taxonomy.js:5-17` | `groupSpecs(group)` (`:20`) e `specField` (`:28`); `specOk` filtra negócios elegíveis ao pedido (`features/requests/model.js:18`) |
| Categorias legadas → grupo/especialidade `LEGACY_CATS` | 8 chaves: `'Climatização'`,`'Refrigeração'`,`'Elétrica'`,`'Mecânica'`,`'Mudança'`,`'Comida'`,`'Aulas'`,`'Beleza'` | `features/businesses/taxonomy.js:23` | `migrateBizCategory`/`migrateRequestCategory` (`:24-25`), chamados por `normalizeCategories` (`:26`) na carga do estado (`app/state.js:14`) |
| Categorias antigas do HTML `CAT_NAMES` | `['Todos','Climatização','Elétrica','Mecânica','Saúde','Pets','Mudança','Comida','Aulas','Refrigeração','Beleza','Outros']` (12) | `data/demo/model.js:3` | **ninguém**: busquei `CAT_NAMES` em `src/**/*.js` e o único resultado é a própria definição. Foi substituída por `SERVICE_GROUPS` (comentário de `taxonomy.js:1-3`) |
| Públicos da agenda `AGENDA_AUDIENCE` | `[['all','Todos'],['chegando','Para quem chega'],['moro','Para quem mora'],['saindo','Para quem sai']]` (4) | `features/events/views.js:3` | Filtro da Agenda (`events/views.js:9-11`); o evento sem `modes` vale para todos (`:5`) |
| Tipos de busca (chips) | `[['all','Tudo'],['items','Anúncios'],['biz','Negócios'],['asks','Indicações'],['groups','Grupos'],['events','Encontros']]` (6) | `features/search/views.js:6` | Tela Buscar; o padrão do módulo é `searchType='all'` (`app/state.js:16`) |
| Tipos de resultado da busca `SEARCH_TYPES` | 5 entradas `[chave, título, função de cartão, moldura, teto, substantivo]`: material, negócios, indicações, grupos, encontros, com tetos `4`,`4`,`5`,`5`,`5` | `features/search/views.js:19` | `searchResults` (`:25-29`); em "Tudo" cada tipo mostra o teto e um "Ver todos os N" |
| Exploração da busca `SEARCH_EXPLORE` | `[['Saúde','svg-health'],['Educação','school'],['Casa e reparos','build'],['Mudança e transporte','local_shipping'],['Pets','pets'],['Festas e comida','cake'],['Limpeza e jardim','home']]` (7) | `features/search/views.js:37` | Tiles de "Explorar" (`:44`) |
| Ordenações de anúncio `SORT_LABELS(kind)` | 3: `'Mais recentes'`, `'Menor total por mês'`/`'Menor preço'`, `'Maior total por mês'`/`'Maior preço'` | `features/listings/filters.js:34` | Ordenação do catálogo; padrão `searchSort='recent'` (`app/state.js:16`), aplicado em `features/listings/catalog.js:29` |
| Ordenações de proposta `PROPOSAL_SORTS` | `[['arrival','Chegada'],['price','Menor valor'],['date','Mais cedo']]` (3) | `features/requests/views.js:30` | Lista de propostas do pedido (`:28-29`); ordem padrão `'arrival'` e "sem ranking pago" (`:27`) |
| Limites do pedido `REQUEST_LIMIT`, `REQUEST_OPEN_MAX`, `REQUEST_DAYS`, `REQUEST_PHOTOS` | `5` propostas por pedido, `3` pedidos abertos, `7` dias de validade, `4` fotos | `features/requests/model.js:4` | `requestFull` (`:16`), criação do pedido (`features/requests/handlers.js:15`), texto até 5 propostas (`features/businesses/catalog.js:1`) |
| Limites do plano `PLAN_FREE_REPLIES`, `PLAN_BOOSTS`, `PLAN_SPOT_MS` | `5` conversas novas/mês, `4` destaques/mês, `7*864e5` ms (7 dias) | `features/businesses/plans.js:12` | Portão da caixa da página (`:26-32`), destaque (`:55-62`) e textos (`:34-39`) |
| Planos (rótulo e preço) `OWNER_PLAN_LABEL`, `OWNER_PLAN_PRICE` | `{free:'Grátis',moment:'Destaque de momento',plan:'Plano do negócio'}`; `{moment:{label:'R$ 9,90/semana',month:40},plan:{label:'R$ 39/mês',month:39}}` | `features/owner/business-team.js:4-5` | Painel: `ownerPlan` (`:6`), receita do mês (`:9`) |
| Planos (tela do app) | 3 cartões: `'Grátis'` `'R$ 0'` ("Página na cidade e até 5 novas conversas respondidas por mês."), `'Destaque de momento'` `'R$ 9,90 / semana'`, `'Plano do negócio'` `'R$ 39 / mês'` | `features/profile/demo-actions.js:1` | Diálogo de planos, apenas com `window.BIVAQUE_LABS={paidPlans:true}` (`features/businesses/plans.js:11`); sem a chave, o diálogo só explica o lançamento gratuito |
| Motivos de denúncia (usuário) | `[['','Escolher motivo'],['spam','Spam ou propaganda inadequada'],['fraud','Informação enganosa'],['privacy','Exposição de dados pessoais'],['abuse','Ofensa ou comportamento inadequado'],['other','Outro motivo']]` (5 motivos + vazio) | `features/profile/demo-actions.js:94` | Diálogo "Denunciar conteúdo"; o detalhe é livre, `maxlength="1000"` |
| Rótulos dos motivos (Painel) `REPORT_REASONS` | `{spam:'spam',fraud:'golpe ou informação enganosa',privacy:'dados pessoais expostos',abuse:'ofensa',other:'outro motivo'}` | `features/owner/console.js:7` | Fila de denúncias (`:38`) e ficha (`features/owner/review.js:21`) |
| Motivos de decisão do moderador `OWNER_DECISION_REASONS` | `[['','Escolher motivo'],['golpe','Golpe ou pedido de pagamento antecipado'],['enganoso','Informação enganosa'],['dados','Dados pessoais expostos'],['ofensa','Ofensa ou assédio'],['documento','Documento ilegível ou não confere'],['outro','Outro motivo']]` (6 + vazio) | `features/owner/review.js:3` | Registro da decisão no Painel; as ações são `'remove'`,`'suspend'`,`'warn'` com textos em `:8` e rótulos em `:9`, e o desfecho em `features/owner/queues.js:4` |
| Tópicos de ajuda `HELP_TOPICS` | 4 temas, **19** perguntas: `'Conta e entrada'` (5), `'Comunidade'` (4), `'Anúncios e negócios'` (5), `'Segurança'` (5) | `features/support/help.js:13-37` | Rota `ajuda`; cada tema tem `ic`,`t`,`s` e a lista `qa` de pares pergunta/resposta |
| Tópicos do chamado `TICKET_TOPICS` | `[['conta','Conta'],['comunidade','Comunidade'],['anuncios','Anúncios'],['seguranca','Segurança'],['outro','Outro']]` (5) | `features/support/help.js:9` | Formulário "Fale com a gente" (rota `contato`) |
| Notificações de grupo `NOTIF` | `{tudo:['notifications_active','Tudo','Toda publicação do grupo'],destaques:['notifications','Destaques','Respostas a você, eventos e aviso fixado'],nada:['notifications_off','Nada','As publicações aparecem só na Início']}` (3 níveis) | `features/groups/presets.js:12` | Menu do grupo (`features/groups/handlers.js:8-9`) e rótulo "Participando · …" (`features/groups/views.js:102`); o padrão é `notif:'destaques'` (`views.js:4`) |
| Modelos de grupo `GTPL` | 7: `vizinhanca` ("Vizinhança"), `escola` ("Escola"), `esporte` ("Esporte"), `pets` ("Pets"), `familia` ("Família"), `livre` ("Livre"), `turma` ("Turma de chegada") — cada um com `ic`, `name`, `rules` | `features/groups/presets.js:2-10` | Regras padrão do grupo (`views.js:4`), seletor de modelo no editor (`features/groups/editors.js:26`, que **esconde `turma`**), ícone/faixa quando não há foto (`views.js:55,101`) |
| Interesses `INTERESTS` | `[['filhos','Filhos pequenos','child_care'],['pets','Pets','pets'],['corrida','Corrida','directions_run'],['ciclismo','Ciclismo','directions_bike'],['concursos','Concursos e preparatórios','school'],['culinaria','Culinária','restaurant'],['futebol','Futebol','sports_soccer'],['fe','Fé','church']]` (8) | `features/groups/presets.js:11` | Chips do cadastro de grupo (`editors.js:40`, com "`/3 escolhidos`"); perfil (`state.profile.interests`, `app/state.js:10`); motivo de sugestão de grupo (`views.js:60`) |

#### Outras constantes fechadas e limites (mesmo formato)

| Constante | Valor | Onde vive | Quem usa |
|---|---|---|---|
| Chave de armazenamento `KEY` | `'bivaque-material-web-v3'` | `data/demo/model.js:1` | Leitura/gravação do estado (`app/state.js:14,29`), turma automática (`features/groups/views.js:40`), "último visto" (`shell/navigation.js:104`) |
| Cidadania por cidade `CITY_NAMES` | `Object.keys(SOURCE.cities)` → 4 | `model.js:2` | Entrada, momento, navegação, Perfil (ver §2) |
| Foto por item `PHOTO_BY_ITEM` | 6 pares: `i1:'sofa'`, `i2:'apartment'`, `i3:'crib'`, `i4:'fridge'`, `i5:'interior'`, `i6:'interior'` | `model.js:4` | `initial()` (`state.js:4`) |
| Foto por negócio `PHOTO_BY_BIZ` | 9 pares: `b1:'service'`, `b2:'moving'`, `b3:'kitchen'`, `b4:'cake'`, `b5:'classroom'`, `b6:'service'`, `b7:'workshop'`, `b8:'pets'`, `b9:'dentist'` | `model.js:5` | `initial()` (`state.js:7`), com queda para `'service'` |
| Textos do arquivo da cidade `KNOWLEDGE_TEXT` | 6 chaves (`saude`, `escola`, `casa`, `carro`, `pets`, `mudanca`), cada uma com um parágrafo de recomendação | `model.js:6-13` | Resposta do relato da comunidade (`state.js:9`) |
| Negócio do arquivo da cidade `MEMORY_BIZ` | `{saude:'b9',escola:'b5',casa:'b6',carro:'b7',pets:'b8',mudanca:'b2'}` | `model.js:14` | Idem (`state.js:9`) |
| Versão do Material Web `MATERIAL_VERSION` | `"2.5.0"` | `data/demo/material-version.js:1` | Diagnóstico do boot (`app/start.js:10`) e diálogo "Controles do protótipo" (`features/profile/settings.js:6`) |
| Página de lista `LIST_PAGE` | `24` itens por bloco | `shell/paged-list.js:5` | `pagedHtml` (`:7`), "Mostrar mais" (`:14`), carregamento automático a 600 px (`:42`) |
| Movimento `BOLD` | `{flight:560,rise:480,stagger:45,riseDistance:40,listRise:28,listMax:10,easing:'cubic-bezier(.2,0,0,1)'}` | `motion/bold-transitions.js:4` | Voo da foto (`:30`), cascata do detalhe (`:35`), cascata das listas (`:39`) |
| Detalhe com movimento `MOTION_DETAIL` | `{anuncio:'open-item',negocio:'open-biz'}` | `motion/bold-transitions.js:5` | `motionBeforeRender` (`:14-15`) |
| Nomes de contato de teste `PLAN_TEST_NAMES` | 8: `'Marina L.'`,`'Caio R.'`,`'Helena P.'`,`'Otávio S.'`,`'Bianca F.'`,`'Lúcio M.'`,`'Renata V.'`,`'Davi C.'` | `features/businesses/plans.js:64` | `simulateBizContact` (`:65-69`), que cria uma conversa e um aviso |
| Suporte: limites e palavras | `TICKET_MIN=10`, `TICKET_MAX=1000`, `DELETE_WORD='APAGAR'`, `GONE_NAME='Membro que saiu'`, `GONE_INI='MS'` | `features/support/help.js:8` | Formulário de chamado (`:77-79`), confirmação de exclusão (`:93`), anonimização (`:97-108`) |
| Rotas de suporte `SUPPORT_ROUTES` | `['ajuda','contato','chamados']` | `help.js:6` | Decidem a casca da página (`:7`) |
| Agenda: encerramento de grupo | `GROUP_CLOSE_DAYS=30`; `GROUP_CLOSED_NOTE='Este grupo foi encerrado. As publicações estão só para leitura.'` | `features/groups/views.js:44` | `groupClosed` (`:45`) e bloqueio de escrita |
| Oferta de negócio no grupo | `OFFER_WEEK_MS=7*864e5` | `features/groups/editors.js:2` | Limite de uma oferta por semana |
| Filtros rápidos de preço `FILTER_QUICK` | `{imovel:[1500,2500,3000,4000],desapego:[100,300,800,1500]}` | `features/listings/filters.js:6` | Chips de preço |
| Seções do filtro `FILTER_SECTIONS` / campos `FILTER_FIELDS` / títulos `FILTER_TITLES` | `{imovel:['ptype','price','avail','beds','parking','area','amen','hood'],desapego:['cat','price','cond','pickup','hood']}`; `FILTER_TITLES` com `'Tipo de imóvel'`,`'Disponível para morar'`,`'Quartos e vagas'`,`'Bairro'`,`'Categoria'`,`'Estado de uso'`,`'Retirada'`,`'Ordenar'` | `filters.js:7-8`, `:35` | Painel de filtros do catálogo |
| Estado inicial do filtro `CATALOG_DEFAULTS` | `{desapego:{cats:[],hoods:[],dist:0,cond:'',pickup:'',min:'',max:''},imovel:{ptypes:[],hoods:[],dist:0,beds:0,parking:0,area:0,amen:[],avail:'',min:'',max:''}}` | `features/listings/catalog.js:6` | Filtros aplicados em `filteredItems` (`:29`) |
| Sinônimos da busca `SYNONYMS` | 15 chaves (`dentista`,`pediatra`,`escola`,`mecanico`,`eletricista`,`diarista`,`mudanca`,`berco`,`imovel`,`saude`,`pets`,`climatizacao`,`carro`,`casa`,`aula`) | `features/search/views.js:1` | `matches` (`:3`) e vocabulário de sugestões (`:52`) |
| Passos do wizard de imóvel `WIZ_STEPS` | 5 passos: `'O imóvel'`, `'Valores e disponibilidade'`, `'Comodidades e descrição'`, `'Fotos'`, `'Revisão'` | `features/listings/wizard.js:5` | `wizShow` e validação por passo (`:52`) |
| Reações da conversa `CHAT_REACTIONS` | `[['👍','Curtir'],['❤️','Amei'],['😂','Haha'],['🙏','Obrigado']]`; agrupamento `CHAT_GROUP_MS=5*60e3` | `features/messaging/bubbles.js:5-6` | Balões de conversa |
| Entrada: senha, documento, convite | `ENTRY_SENHA_REGRA='Ao menos 8 caracteres, com letras e números.'`; `ENTRY_DOC_TYPES={'application/pdf':'PDF','image/jpeg':'JPG','image/png':'PNG'}`, `ENTRY_DOC_MAX=10*1024*1024`; `ENTRY_DEMO_EMAIL='rafael@exemplo.com'`, `ENTRY_INVITE_DAYS=7` | `features/entry/account.js:10-11`; `features/entry/login.js:6` | Cadastro, envio de documento, convite familiar |
| Landing: forças, títulos, passos e FAQ | `LANDING_FORCES='Marinha, Exército e Aeronáutica'`; `LANDING_TITLE='Juntos somos mais fortes.'`; `LANDING_STEPS` com 3 passos; `LANDING_FAQ` com 6 pares; `LANDING_FAQ_OPEN=3`; `LANDING_ANCHORS=['inicio','exemplo','recursos','mudanca','participar','perguntas','fim']` | `features/entry/landing.js:7-17` | Página pública de entrada |
| Documentos legais `LEGAL_VERSION`, `LEGAL_ROUTES`, `LEGAL_DOCS` | `LEGAL_VERSION='18/10/2026'`; `LEGAL_ROUTES=['privacidade','conduta']` | `features/legal/pages.js:5-6` | Rotas `privacidade` e `conduta` |
| Painel: tipos e páginas | `OWNER_KINDS` (5: Tudo, Denúncias, Verificações, Negócios, Perguntas), `OWNER_PAGES` (5: Visão geral, Filas, Cidades, Negócios, Pessoas e equipe), `OWNER_DAY=864e5`, `OWNER_SLA=OWNER_DAY`, `REPORT_ACT` (mapa tipo→ação), `OWNER_HEALTH_LABEL` (`'Saudável'`,`'Atenção'`,`'Precisa de ajuda'`) | `features/owner/console.js:6-8,25,31,92`; `features/owner/cities.js:3-4` | Painel do Bivaque |
| Contador e paleta | `COUNT_MS=900` (`shell/count-up.js:5`); `PALETTE_PAGES` (11 linhas), `PALETTE_CREATE` (6 ações) (`shell/command-palette.js:5-6`) | — | Início e atalho de comando |
| Formato (utilitários) | `money(n)` BRL sem centavos; `uid(p)` = prefixo + 12 hex; `dateISO(offset)` `YYYY-MM-DD`; `countDays`, `dateLabel`, `initals(n)` (até 2 iniciais, `'BV'` se vazio); `norm` sem acento | `utilities/format.js:2-11` | Todo o app |
| Identificador local `USER_ID` | `'local-member'` | `app/state.js:24` | Chave de conta quando não há e-mail (`accountKey`, `:26`) |
| Perfil de demonstração | `name:'Rafael Souza'`, `role:'ativa'`, `force:'Aeronáutica'`, `verified:true` | `app/state.js:10` | Perfil, publicação, Painel |

### 4. Modelo de estado

`initial(stage='live')` (`app/state.js:2-11`) devolve um objeto literal. Cada campo de topo, com o
valor inicial literal e se sobrevive ao recarregamento:

| Campo | Tipo | Valor inicial (literal no código) | Persistido? |
|---|---|---|---|
| `schema` | num | `2` | sim — é o portão da migração (`app/state.js:14`) |
| `stage` | str | `'live'` ou `'seed'`, vindo do argumento | sim |
| `homeCity` | str | `'Manaus'` | sim |
| `city` | str | `'Manaus'` (cidade consultada; pode ser trocada e ficar só leitura) | sim |
| `mode` | str | `src.mode` → `'moro'` | sim |
| `dest` | str | `src.dest` → `'Brasília'` | sim |
| `arrival` | str | `dateISO(23)` (hoje + 23 dias, calculado a cada carga) | sim |
| `leaveDate` | str | `dateISO(41)` | sim |
| `incoming` | num | `stage==='seed'?0:14` | sim |
| `profile` | obj | `{name:'Rafael Souza',role:'ativa',force:'Aeronáutica',verified:true,interests:[]}` | sim |
| `prefs` | obj | `{appearance:'auto',digest:true,cap:3,showHood:true,familyOnly:true}` | sim |
| `items` | arr | 6 itens de `SOURCE.live.items` enriquecidos (`city:'Manaus'`, `numPrice`, `photos`, `status:'active'`, `createdAt`, `area`/`beds`/`parking`/`condo` por id, `demo:true`) | sim |
| `biz` | arr | 9 negócios enriquecidos (`city:'Manaus'`, `photos`, `views:0`, `quoteRequests:0`, `demo:true`) | sim |
| `asks` | arr | 7 perguntas + 11 do arquivo da cidade (`mem0`…`mem10`) quando `stage!=='seed'` → 18 | sim |
| `groups` | arr | `buildGroups(stage)` (`features/groups/views.js:7-34`): **10** grupos no `live` (a turma de chegada + 9 fixos), **3** no `seed` (turma + 2) | sim |
| `leftAuto` | arr | `[]` | sim |
| `events` | arr | 4 encontros com `city`, `date:dateISO(5+i*2)`, `time:'09:00'`, `description` fixa, `mine:false` | sim |
| `threads` | arr | 4 conversas com `city`, `snapshot` (título/foto/preço da entidade) e `at` em cada mensagem | sim |
| `notices` | arr | 2 avisos com `city` | sim |
| `myBiz` | `null` | `null` | sim |
| `reports`, `invites`, `drafts` | arr | `[]` | sim |
| `lastViewed` | `null` | `null` | sim |
| `recent` | arr | `[]` | sim |
| `plan` | obj | `src.plan` **mutado**: para cada passo de `chegando`/`saindo`, `app/state.js:5-6` **substitui** `go` e `s` por literais próprios e renomeia `s4` para `'Conhecer a cidade de destino'`; sobra do `source.js` só o que não está no mapa | sim |
| `subscription` | obj | `{tier:'free',month:dateISO().slice(0,7),repliedThreadIds:[]}` | sim |
| `test` | obj | `{demoReplies:false}` | sim |
| `onboarded` | bool | `true` | sim |

Campos que **não** nascem em `initial()` e aparecem depois, gravados no mesmo objeto: `alerts` e
`listingDemoV` (acrescentados por `normalizeListings`, `features/listings/attributes.js:55,57`),
`requests` (criado por `seedProviderRequests`, `features/requests/model.js:33`, e pelo envio de
pedido, `features/requests/handlers.js:15`), `tickets` (`features/support/help.js:80`), `blocked`
(`features/profile/blocks.js:32`), `invites`/`entry`/`signedOut`/`accountDeletedAt`
(`features/entry/*`), `owner` (estado do Painel) e `entries` do Painel.

**Persistência.** Um único `localStorage`, chave `'bivaque-material-web-v3'` (`model.js:1`), guarda o
`state` inteiro em JSON (`schema:2`). Leitura em `app/state.js:14`, gravação em `mutate()`
(`app/state.js:27-31`, que faz *rollback* em memória se o `setItem` falhar) e em dois pontos
pontuais: `features/groups/views.js:40` e `shell/navigation.js:104`. Comentário do protótipo: "Toda a
persistência é por dispositivo (um único localStorage), nunca por conta no servidor"
(`00-guia`/`50-casca` deste inventário). Também há uma chave separada para a dica de deslize,
`'bivaque-swipe-hint'` (`motion/gestures.js:22`).

**Migração na carga** (`app/state.js:14`):

1. `raw?.schema===2 ? raw : initial()` — qualquer coisa sem `schema:2` é descartada e recomeça do
   zero (não há migração de versões anteriores).
2. `normalizeCategories(s)` (`features/businesses/taxonomy.js:26`): aplica `migrateBizCategory` a
   `biz` e `myBiz` e `migrateRequestCategory` a `requests`, trocando as categorias antigas
   (`LEGACY_CATS`, `:23`) por um grupo de serviço + especialidade — p.ex. `'Refrigeração'` →
   grupo `'Climatização e eletrodomésticos'` com especialidade `'Geladeira e freezer'`.
3. `normalizeListings(s)` (`features/listings/attributes.js:52-57`): (a) preenche os atributos dos
   anúncios de exemplo existentes com `demoListingAttrs()` (`:28-36`: categoria/estado/retirada em
   i1,i3,i4,i6; tipo, comodidades e disponibilidade em i2,i5; `i7`/`i9` só ganham `avail`) —
   os campos já salvos têm prioridade (`{...attrs[x.id],...x}`, `:54`); (b) **acrescenta uma única
   vez** os 7 anúncios novos de `demoListingsNew()` (`:39-49`), i7…i13, guardados pela marca
   `listingDemoV:1`, para que um exemplo apagado pela pessoa não volte — e **nunca** no `seed`
   (`:56`); (c) garante `alerts:[]`.

**Só de módulo (não entram no `state`, não são persistidos).** Variáveis de tela e de interação:
`route`/`origin` e o navegador (`app/state.js:15`), `communityTab='ind'`, `questionFilter='help'`,
`catalogFilter='all'`, `searchType='all'`, `searchQuery=''`, `searchHood='Todos'`, `searchMin=''`,
`searchMax=''`, `searchSort='recent'`, `bizCat='Todos'`, `bizQuery=''`, `myAdsFilter='active'`,
`savedType='all'` (`app/state.js:16`); `editor`, `editorDirty`, `toastTimer`, `toastUndo`,
`searchTimer` (`:17`); `createOpen`, `createAnchor`, `createFocusIndex`, `createClosingHistory`,
`createHistoryDone`, `createHistoryPromise` (`:18`); `navMinimized`, `lastNavY` (`:19`); os três pares
de `dialogClosingHistory`/`confirmClosingHistory` (`:20-21`); `scrollPositions` (`:22`); os nós
`root`/`dialog`/`confirmDialog` (`:23`); `groupQuery`, `groupFilter`, `postDraft`, `groupDraft`,
`interestsDraft` (`:1`). Fora de `state.js`: `proposalSort` (`features/requests/views.js:28`),
`agendaFilter` (`features/events/views.js:2`), `supportTopic`/`supportSent`
(`features/support/help.js:38`), `pagedShown`/`pagedLists`/`pagedObservers`
(`shell/paged-list.js:6`), `motionLastRoute` (`motion/bold-transitions.js:6`), `groupDraft` do
editor, filtros em rascunho (`features/listings/filters.js`), o estado de entrada
(`features/entry/*`) e `ownerCity` do Painel.

### 5. Imagens

`ASSETS` (`data/demo/assets.js:1`) é um único objeto literal com **24 chaves** (contadas com
`Object.keys`). Todas as entradas são *data URI* embutido — 11 em `image/webp` e 13 em
`image/jpeg`, somando **2 104 796** caracteres de base64 (≈ 2,0 MB de texto). Nada disso deve ser
portado como base64: o porte deve referenciar arquivos. O resolvedor é
`function image(ref){return ref?.startsWith('data:image/')?ref:ASSETS[ref]||'';}`
(`shell/primitives.js:1`) — aceita tanto a chave quanto um data URI já pronto.

| Chave | Formato | ~KB | A que pertence |
|---|---|---|---|
| `sofa` | webp | 66 | item i1 (foto) |
| `apartment` | webp | 122 | itens i2 e i9 (foto) |
| `crib` | webp | 103 | item i3 (foto) |
| `fridge` | webp | 70 | item i4 (foto) |
| `interior` | webp | 154 | itens i5, i6 e i8 (foto) |
| `kitchen` | webp | 135 | itens i7 e i10 (foto); negócio b3 (foto); alerta de imóvel (`features/listings/alerts.js:80`) |
| `service` | webp | 68 | negócios b1 e b6 (foto) e queda padrão de qualquer negócio (`app/state.js:7`) |
| `moving` | webp | 129 | negócio b2 |
| `cake` | webp | 141 | negócio b4; grupo `g-culinaria` (`features/groups/views.js:32`) |
| `classroom` | webp | 57 | negócio b5; grupo `g-cmm` (`views.js:29`) |
| `workshop` | webp | 125 | negócio b7 |
| `pets` | webp | 86 | negócio b8; item i13; grupo `g-pets` (`views.js:27`) |
| `dentist` | webp | 99 | negócio b9 |
| `friends` | webp | 25 | turma de chegada (`views.js:10`) |
| `community` | webp | 23 | grupo `g-vizinhos` (`views.js:31`) |
| `mesa` | webp | 34 | grupos `g-familias` (`views.js:16,19`) |
| `sunset` | webp | 31 | grupo `g-pedal` (`views.js:17,23`) |
| `arrival` | webp | 44 | turma de chegada antes da troca (`views.js:5`) |
| `landing-hero` | jpeg | 129 | landing acima de 860 px (`features/entry/landing.js:42`) |
| `landing-hero-retrato` | jpeg | 114 | landing até 860 px (`landing.js:42`) |
| `landing-app-comunidade` | jpeg | 52 | landing, tela Comunidade (`landing.js:61`) |
| `landing-app-inicio` | jpeg | 72 | landing, tela Início (`landing.js:65`) |
| `landing-encontro` | jpeg | 90 | landing, foto decorativa final (`landing.js:83`) |
| `chegada` | jpeg | 86 | **nenhuma referência**: busquei a chave em `src/**/*.{js,html,json}` e só aparece na própria definição |

Quantas chaves cada consumidor usa:

- **`items`**: `PHOTO_BY_ITEM` cobre 6 anúncios com **5 chaves distintas** (`sofa`, `apartment`,
  `crib`, `fridge`, `interior` — `i5` e `i6` compartilham `interior`); os 7 anúncios de
  `demoListingsNew` usam 4 (`kitchen`, `interior`, `apartment`, `pets`) e dois deles (i11, i12) ficam
  **sem foto**, com ícone (`'Outros'`/`'local_shipping'`) — decisão comentada em
  `features/listings/attributes.js:37-39` ("sem foto adequada, o cartão mostra o ícone, em vez de uma
  foto que não corresponde ao anúncio"). O alerta simulado também usa `kitchen`/`apartment`/`sofa`
  (`alerts.js:80-81`).
- **`biz`**: `PHOTO_BY_BIZ` cobre 9 negócios com **8 chaves distintas** (`service` em b1 e b6), e o
  padrão é `'service'`.
- **`entry`/landing**: as **5** chaves `landing-*`.
- **grupos**: 8 chaves (`arrival`, `friends`, `mesa`, `sunset`, `pets`, `classroom`, `community`,
  `cake`); o grupo sem foto mostra uma faixa com o ícone do modelo (`views.js:55,101`).
- **avatares**: **nenhuma** chave de `ASSETS`. Todo avatar é um círculo com iniciais via
  `initals(n)` (`utilities/format.js:11`) — p.ex. `<span class="avatar me">${esc(initals(...))}`
  (`features/groups/views.js:87`, `features/listings/detail.js:9`).

### 6. Números de demonstração do Painel (`owner.js`)

`OWNER_DEMO` (`data/demo/owner.js:3-44`) é a única fonte do Painel do Bivaque; a tela se marca como
exemplo — o selo literal é `'Dados de exemplo'` (`features/owner/console.js:98`).
`owner.js:2` avisa: "o protótipo não tem dados de várias cidades nem de receita".

| Campo | Valor literal | Onde vive | Quem consome |
|---|---|---|---|
| `cities` | 4 cidades com 5 números cada: `'Rio de Janeiro'` `{fam:630,arriving:88,arrived30:70,served:.84,ambassadors:6}`; `'Brasília'` `{410,74,60,.78,4}`; `'Manaus'` `{140,38,30,.66,3}`; `'Natal'` `{9,12,4,.25,0}` | `owner.js:4-9` | `ownerCities()` (`console.js:66`), ficha da cidade (`cities.js:6,16-17`), saúde por `served`/`ambassadors` (`cities.js:3`) |
| `kpis` | 3 cartões: `'Famílias ativas na semana'` `1010` (`'▲ 8%'`, 10 pontos de série); `'Perguntas resolvidas em 24 h'` `82` (`'▲ 5 pts'`); `'Receita dos planos (mês)'` sem `value`, formatação `'R$'`, `'▼ 2%'`, `revenue:true` | `owner.js:10-14` | `console.js:76` — o KPI de receita só é renderizado com `paidPlans()` |
| `changes` | 4 avisos: `'Denúncias de golpe em Manaus'` (`'Subiram de 1 para 3 esta semana; todas citam Pix antecipado.'`, `go:'report'`); `'Natal sem embaixador'` (`'12 famílias chegam em 60 dias; 4 perguntas paradas.'`, `go:'stale'`); `'2 planos vencem sem renovação'` (`go:'page:negocios'`); `'Brasília passou de 400 famílias'` (`'Grupo “Chegadas de dezembro” com 74 membros.'`, `go:'page:cidades'`) | `owner.js:16-21` | `console.js:79` |
| `reports` | 3 denúncias sobre o item `i1`, todas `reason:'fraud'`, com `hoursAgo` `5`, `4`, `3`; detalhes `'Pediu Pix antes de mostrar o sofá.'`, `'Mesmo pedido de pagamento antecipado.'`, `''` | `owner.js:24-28` | `console.js:34` monta a fila com `at: Date.now()-hoursAgo*36e5` |
| `verifications` | 1 pedido: `{id:'ov1',name:'Carla R.',city:'Manaus',when:'em novembro',invitedBy:'Paulo R.',hoursAgo:2,checks:[['Nome confere com o documento',true],['Documento dentro da validade',true],['Cidade de destino confere com o pedido',false]]}` | `owner.js:29-31` | `console.js:61` (fila, prazo `OWNER_SLA`) |
| `claims` | 1: `{id:'oc1',biz:'b7',hoursAgo:20}` | `owner.js:32` | `console.js:62`; pendência em `business-team.js:11` |
| `staleExtra` | `{Natal:4,'Brasília':2,'Rio de Janeiro':1}` | `owner.js:33` | `console.js:46` soma às perguntas paradas da cidade |
| `assignees` | `{'report:item|i1':'Ana P.'}` | `owner.js:35` | `queues.js:5` (quem já pegou a fila) |
| `ambassadors` | `'Rio de Janeiro'` 6 nomes, `'Brasília'` 4, `'Manaus'` 3 (`'Ana P.'`,`'Luana M.'`,`'Paulo R.'`), `'Natal'` `[]` | `owner.js:36` | `cities.js:17`, `business-team.js:43`, aviso aos embaixadores (`review.js:83`) |
| `plans` | `{b2:{tier:'plan',renewDays:4},b9:{tier:'plan',renewDays:4},b4:{tier:'moment',renewDays:30},b1:{tier:'plan',renewDays:12}}` | `owner.js:39` | `ownerPlan(b)` (`business-team.js:6`) |
| `quotesByCity` | `{'Rio de Janeiro':90,'Brasília':70,'Manaus':40,'Natal':12}` | `owner.js:40` | `business-team.js:17` (pedidos de contato do período) |
| `otherPlans` | `{'Rio de Janeiro':{count:40,revenue:1560},'Brasília':{count:28,revenue:1092},'Natal':{count:0,revenue:0}}` | `owner.js:42` | `business-team.js:9`; o comentário de `:41` diz que, com os de Manaus, a receita fecha em `R$ 2.809` |
| `moderators` | `[{name:'Ana P.',role:'Moderação',city:'Manaus'}]` | `owner.js:43` | `business-team.js:41` |

### 7. O que é claramente fictício

Não copiei valores que possam ser confundidos com credencial real; abaixo só o ponteiro.

| O quê | Onde | Observação |
|---|---|---|
| E-mail de login de demonstração | `features/entry/login.js:6` (`ENTRY_DEMO_EMAIL`) | usado na dica "Modo teste: use … e qualquer senha" (`login.js:12`) — o campo de senha não guarda nada |
| Conta Google de teste | `features/entry/login.js:56` | cria `state.entry.account` com provedor `'google'` e nome `'Conta Google (teste)'` |
| "Modo teste: nenhum e-mail é enviado." | `features/entry/login.js:16`; `features/support/help.js:18` | recuperação de senha e confirmação de vínculo são simuladas |
| "Dados fictícios para testar as jornadas. Você pode publicar e editar exemplos; nenhuma mensagem é enviada para pessoas reais." | `features/profile/settings.js:6` | diálogo "Controles do protótipo", que também troca cenário, verificação e simula respostas |
| "Ativar no modo teste" / "Nenhum pagamento realizado." | `features/profile/demo-actions.js:1`; `features/businesses/plans.js:53` | planos não cobram |
| "Dados de exemplo" e `owner.js:2` | `features/owner/console.js:98` | selo do Painel |
| Códigos de convite `'DEMO-' + uuid` | `features/profile/demo-actions.js:58` | gerados no navegador; "nenhum convite real é enviado" (`:4`) |
| CPF | `features/entry/account.js:48` (placeholder `"000.000.000-00"`), validação por dígitos `:21`,`:102` | **nenhum CPF real nos dados**: o número é conferido e limpo antes de sair do passo (`:106`); não há CPF em `source.js` nem em `bairros.js` |
| CEPs de teste | `data/demo/bairros.js:11-13` (`CEP_TESTE`) | comentário: "modo teste, sem rede … nunca entram no armazenamento"; a interface diz "O CEP só serve para achar o bairro e não fica salvo" (`shell/hood-picker.js:36`) |
| Protocolo de chamado | `features/support/help.js:79` | `id: uid('t')` = prefixo `'t'` + 12 caracteres hex gerados por `crypto.randomUUID()` — é o identificador mostrado em "Meus chamados", não um protocolo real |
| Nomes e relatos de pessoas | `source.js:1` (quem publica: `'Luana M.'`, `'Paulo R.'`, `'Carla R.'`…), comentário de `owner.js:22-23`: "Pessoas e documentos são fictícios; nada de posto, organização militar ou endereço" | as forças/produtos citados em textos ("plano da Força", "EsplPCEx") são conteúdo de exemplo |
| Números do perfil e da cidade | `app/state.js:10` (`'Rafael Souza'`, `'Aeronáutica'`, `incoming:14`) | perfil e cidade iniciais escritos à mão |
| Grupos de exemplo | `features/groups/views.js:16-33` | 9 grupos fixos (`'Famílias com crianças pequenas'`, `'Pedal e corrida na orla'`, `'Futebol de sábado'`, `'Pets de Manaus'`, `'Pais do Colégio Militar de Manaus'`, `'Concurseiros EsPCEx, EEAR e CN'`, `'Moradores do Residencial Parque das Laranjeiras'`, `'Culinária e marmitas'`, `'Fé e família'`) mais a turma de chegada, com membros e publicações inventados; `source.js` não os contém |
| Chamados, alertas, pedidos e propostas | criados em runtime (`features/support/help.js:80`, `features/listings/alerts.js:83`, `features/requests/model.js:33`) | o `source.js` não traz nenhum |

### 8. Lacunas

- **`SOURCE.live.comms` (5 registros) não é lido por ninguém.** Só aparece em `source.js:1`
  (busquei `comms` em `src/**/*.js`). Os grupos da tela vêm de `buildGroups`
  (`features/groups/views.js:7-33`), com nomes, membros e fotos próprios. O porte deve escolher:
  ou `buildGroups` é a fonte real, ou `comms` precisa ser re-ligado. O mesmo vale para os 3 de
  `SOURCE.seed.comms`.
- **Campos escalares de `live` sem leitor**: `resolved`, `myAnswers`, `filter`, `qf`, `arrive`,
  `leaveDays`, `link`, `obMode`, `verified`, `failPortal`, `cap`, `steps`, `city`, `bizCat`,
  `bizQ`, `incoming`, `quoteOn`, `nid`, `turmaJoined`, `myBiz` (ver §1). `force` também só é lido
  indiretamente, porque `profile.force` está escrito à mão. Não investiguei se o HTML original
  (`prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html:1768`, que carrega o mesmo
  `SOURCE`) usava algum deles — **não verificado**.
- **`CAT_NAMES` (`data/demo/model.js:3`) está morto** no `src/` atual; foi substituído por
  `SERVICE_GROUPS` (`features/businesses/taxonomy.js:1-3`). Cuidado ao portar: as 12 categorias
  antigas continuam em `LEGACY_CATS` para migrar estado salvo (`taxonomy.js:23`).
- **`SOURCE.seed.stage` e `SOURCE.seed.seedTasks` não são lidos** (`seedTasks` não aparece em
  nenhum outro módulo). O cenário vem do argumento `initial(stage)`, e `stageTasks`
  (`{biz,ask,invite}`) não tem consumidor — **não verificado** se algum deles alimenta o
  onboarding de "Cidade começando".
- **Comentário desatualizado sobre CEP**: `bairros.js:11-12` diz "Só os oito números", mas
  `CEP_TESTE` tem 14 entradas.
- **`owner.js:2` diz que não há dados de várias cidades**, mas `OWNER_DEMO.cities` cobre 4 cidades
  (e `changes`, `ambassadors`, `quotesByCity`, `otherPlans` também têm as 4). A frase vale para
  receita real, não para a tabela por cidade.
- **`chegada` (86 KB em base64) não é referenciada** por nome em nenhum arquivo — provável sobra de
  uma versão anterior da tela de chegada. Fica a decisão de portar a imagem ou descartá-la.
- **`interior`, `service` e `kitchen` são reaproveitadas** em contextos diferentes (item e negócio;
  dois negócios; dois itens) — se o porte corrigir isso, o dado de demonstração vai mudar de
  aparência, não de conteúdo.
- **`SOURCE.memory` usa `st` com três valores** (`'ok'`, `'ans3'`, `'ans2'`) e `initial()` só
  distingue `ok` de "resto" (`app/state.js:9`); o significado de `ans2`/`ans3` (talvez "número de
  respostas") **não está documentado** e **não foi verificado** por mim no runtime.
- **Sete anúncios (i7…i13) e onze perguntas do arquivo da cidade (mem0…mem10) não estão em
  `source.js`**: nascem em `features/listings/attributes.js:39-49` e `app/state.js:9`. Quem portar
  só o `source.js` porta 6 anúncios e 7 perguntas, não 13 e 18.
- **Nada de `requests`, `proposals`, `tickets`, `alerts`, `reports`, `invites` está em
  `source.js`** — tudo é criado por ação no protótipo. As telas de Pedidos e de Meus chamados abrem
  vazias até que se use o "modo teste".
- **Os números do Painel não fecham com os dados das telas**: `OWNER_DEMO.cities` fala de 140
  famílias em Manaus e `OWNER_DEMO.plans` marca 4 páginas, enquanto a cidade de exemplo tem 9
  negócios e 14 "famílias com transferência declarada" (`app/state.js:10`). É de demonstração por
  desenho (`owner.js:2`), mas o porte precisa decidir se mantém as duas escalas.

---

## 9. �cones

**100 nomes de Material Symbols.** Levantados por extração mecânica em todo
`prototypes/bivaque-html/src/` (fora `vendor/`, `assets.js` e o base64 de `fonts.css`), procurando os
nomes em posição de ícone: primeiro argumento de `icon(...)` e `iconBtn(...)`, terceiro de `empty(...)`,
segundo de `notify(...)`, quinto de `btn(...)`, campos `ic:`/`icon:` dos dados, ternários
(`icone ? 'a' : 'b'`), `<md-icon>nome</md-icon>`, `slot="icon">nome` e `icon="nome"`.

Como ler a coluna "aparece em": é evidência, não a lista completa de uso. Nomes marcados com
*dado* vêm de um campo de dados (`ic:`/`icon:`) e são desenhados por `icon(dado.ic)` — no porte, viram
chave de mapa, não literal.

### 9.1 Navegação, casca e controles (17)

| Ícone | Aparece em (evidência) | Para que serve |
|---|---|---|
| `arrow_back` | `features/entry/account.js:27`, `features/legal/pages.js:44`, `features/owner/console.js:97` | Voltar da barra do topo e dos diálogos |
| `chevron_left` | `features/listings/photos.js:33` | Foto anterior na galeria |
| `chevron_right` | `app/handlers.js:138`, `features/community/question.js:6`, `features/groups/views.js:67` | Indica linha navegável |
| `close` | `features/entry/landing.js:95`, `features/groups/handlers.js:52`, `features/listings/editor.js:2` | Fechar folha, diálogo, remover foto |
| `expand_more` | `features/home/views.js:15`, `features/listings/filters.js:25`, `features/support/help.js:52` | Abre seletor/lista (pílula, tópico, cidade) |
| `menu` | `features/entry/landing.js:37` | Menu da landing pública |
| `more_vert` | `features/businesses/detail.js:3`, `features/community/manage.js:11`, `features/community/question.js:4` | Menu ⋮ (opções, ações do autor) |
| `home` | `features/profile/demo-actions.js:34` | Atalho para o início |
| `search` | `features/home/views.js:17`, `shell/command-palette.js:29`, `shell/hood-picker.js:28` | Busca global, busca de bairro, paleta |
| `settings` | `shell/navigation.js:65`, `features/profile/views.js:6` | Rodapé do rail e cabeçalho de Você |
| `tune` | `shell/navigation.js:65`, `features/listings/filters.js:27` | Controles do protótipo; pílula de filtros |
| `sort` | `features/listings/filters.js:33` | Ordenação do catálogo |
| `list` | `features/listings/hood-panel.js:9`, `features/listings/map.js:65` | Ver em lista (folha do bairro, mapa) |
| `map` | `features/home/views.js:26`, `features/home/desktop.js:18` | Atalho de mapa na Início |
| `refresh` | `features/groups/editors.js:37`, `features/profile/settings.js:6` | Recomeçar do zero / recarregar |
| `logout` | `features/groups/handlers.js:10` | Sair do grupo |
| `lock` | `features/groups/views.js:52`, `shell/hood-picker.js:36`, `features/businesses/detail.js:5` | Grupo fechado; CEP não guardado |

### 9.2 Localização e bairro (5)

| Ícone | Aparece em (evidência) | Para que serve |
|---|---|---|
| `place` | `shell/hood-picker.js:29` | Campo de bairro |
| `pin` | `shell/hood-picker.js:37-40` | Sugestões de bairro/CEP |
| `location_on` | `features/events/views.js:19`, `features/listings/map.js:19`, `features/businesses/detail.js:5` | Local do encontro, ponto no mapa, endereço |
| `location_off` | `features/listings/map.js:65` | Vazio do mapa (sem bairros na cidade) |
| `travel_explore` | `features/groups/views.js:92` | Descobrir grupos |

### 9.3 Avisos, estado, confiança e pessoas (29)

| Ícone | Aparece em (evidência) | Para que serve |
|---|---|---|
| `notifications` | `shell/navigation.js:60`, `features/listings/alerts.js:83` | Botão de avisos na barra; alerta de busca |
| `notifications_active` | `features/listings/alerts.js:28`, `features/entry/account.js:138`, `features/profile/push-install.js:26` | Alerta ligado; aviso ativo |
| `notifications_none` | `features/listings/alerts.js:29`, `features/profile/demo-actions.js:33` | Alerta desligado; aviso de tipo simples |
| `notifications_off` | `features/profile/push-install.js:44` | Avisos recusados |
| `check` | `features/listings/attributes.js:20`, `features/entry/arrive.js:61`, `features/businesses/detail.js:5` | Item confirmado, comodidade presente |
| `check_circle` | `features/entry/login.js:16`, `features/groups/handlers.js:38`, `app/handlers.js:101` | Sucesso em aviso e confirmação |
| `cancel` | `features/profile/blocks.js:12`, `features/community/question.js:9` | Fechar, remover, desfazer |
| `error` | `app/handlers.js:133`, `app/state.js:29`, `features/businesses/editor.js:2` | Aviso de erro (validação, gravação) |
| `info` | `app/handlers.js:36`, `features/businesses/detail.js:5` | Aviso informativo; informação do negócio |
| `hourglass_top` | `features/groups/handlers.js:6`, `features/requests/views.js:36`, `features/businesses/detail.js:5` | Pedido pendente, proposta a vencer, responsável aguardado |
| `timer` | `features/requests/views.js:36` | Prazo do pedido |
| `schedule` | `features/owner/queues.js:20`, `features/owner/review.js:5`, `features/businesses/detail.js:5` | Tempo, horário de funcionamento |
| `bolt` | `features/requests/views.js:35` | Retirada/urgência |
| `auto_awesome` | `features/groups/views.js:65`, `features/groups/handlers.js:41` | Destaque de grupo, aviso especial |
| `flag` | `features/owner/review.js:111`, `features/community/question.js:9` | Denúncia registrada |
| `report` | `features/groups/views.js:85`, `features/community/question.js:6`, `features/owner/console.js:39` | Denunciar; fila de denúncias |
| `gavel` | `features/groups/views.js:103` | Moderação do grupo |
| `shield_person` | `features/groups/handlers.js:52`, `features/profile/settings.js:6` | Moderador; segurança/privacidade |
| `verified_user` | `features/entry/account.js:50`, `features/messaging/views.js:12`, `features/owner/console.js:61` | Verificação de identidade e selo |
| `badge` *(dado)* | `features/support/help.js:14` | Tópico "Conta e entrada" da Ajuda |
| `admin_panel_settings` | `features/groups/views.js:102` | Ações de administração do grupo |
| `support` | `features/profile/settings.js:6` | Ajuda e suporte |
| `public` | `features/groups/views.js:101` | Grupo aberto |
| `person` | `features/owner/queues.js:51` | Pessoa na fila do painel |
| `person_add` | `features/profile/demo-actions.js:4`, `features/owner/cities.js:23` | Convidar |
| `group` | `features/entry/account.js:51`, `data/demo/owner.js:18` *(dado)* | Grupo; equipe na visão do dono |
| `group_add` | `features/community/views.js:1`, `features/groups/handlers.js:7` | Criar/entrar em grupo |
| `groups` | `features/groups/views.js:78`, `shell/command-palette.js:28` *(dado)* | Lista de grupos |
| `undo` | `features/requests/handlers.js:46`, `features/owner/queues.js:49` | Desfazer em aviso |

### 9.4 Conteúdo, conversa e mídia (26)

| Ícone | Aparece em (evidência) | Para que serve |
|---|---|---|
| `chat_bubble` | `app/handlers.js:106`, `features/messaging/views.js:12` | Contato recebido; vazio de conversas |
| `forum` | `features/community/question.js:5`, `shell/command-palette.js:*` *(dado em presets)* | Respostas, conversa, grupos |
| `send` | `features/community/question.js:7`, `features/groups/editors.js:18` | Enviar resposta, publicar, enviar mensagem |
| `thumb_up` | `features/businesses/indication.js:1`, `features/community/question.js:6` | Indicar, resposta útil |
| `volunteer_activism` | `features/community/views.js:6` | Aba de indicações |
| `history_edu` | `features/community/views.js:4`, `app/handlers.js:138` | Origem da indicação, memória |
| `history` | `features/home/views.js:39`, `shell/command-palette.js:23` *(dado)* | Histórico, buscas recentes |
| `ballot` | `features/community/manage.js:18` | Editar pergunta/publicação |
| `how_to_vote` | `features/groups/handlers.js:35` | Voto em enquete |
| `interests` | `features/groups/views.js:79` | Interesses do perfil |
| `image` | `features/listings/detail.js:9`, `features/businesses/detail.js:5` | Foto, galeria, cartão de compartilhamento |
| `photo_camera` | `features/listings/detail.js:9`, `features/groups/views.js:109` | Foto do anúncio; publicação com foto |
| `add_photo_alternate` | `features/listings/editor.js:1` | Adicionar fotos (editor) |
| `edit` | `features/listings/detail.js:8`, `features/events/views.js:18` | Editar |
| `edit_square` | `features/community/views.js:1` | Publicar/publicação |
| `delete` | `app/handlers.js:102`, `features/community/manage.js:36` | Excluir (com aviso) |
| `content_copy` | `features/profile/demo-actions.js:4`, `features/messaging/actions.js:97` | Copiar convite, copiar link |
| `link` | `features/messaging/actions.js:96`, `features/listings/share-card.js:47` | Link copiado, compartilhar |
| `share` | `features/listings/detail.js:8`, `features/events/views.js:18` | Compartilhar |
| `open_in_new` | `features/owner/review.js:13`, `features/businesses/detail.js:5` | Abrir conteúdo em outra tela/fora |
| `upload` | `features/entry/account.js:56-65` | Enviar documento |
| `bookmark` | `shell/primitives.js:21` (ternário `saved?`) | Salvo |
| `bookmark_border` | `shell/primitives.js:21`, `features/listings/compare.js:34` | Não salvo |
| `bookmark_remove` | `app/handlers.js:96` (ternário `saved?`) | Removido dos salvos (aviso) |
| `remove` | `features/profile/views.js:6` | Remover (salvos, fotos) |
| `add` | `features/listings/catalog.js:13`, `features/profile/views.js:6` | Criar (botão Anunciar e afins) |

### 9.5 Mercado, serviço, cidade e rotina (23)

| Ícone | Aparece em (evidência) | Para que serve |
|---|---|---|
| `sell` | `features/listings/attributes.js:15`, `features/listings/detail.js:9`, `features/profile/views.js:10` | Desapego, preço, etiqueta de estado |
| `storefront` | `features/businesses/catalog.js:1`, `features/businesses/detail.js:5`, `app/handlers.js:138` | Negócio local |
| `build` | `features/home/views.js:18`, `features/businesses/catalog.js:1`, `features/requests/views.js:2` | Serviço, reparo, pedido de serviço |
| `local_shipping` | `features/listings/attributes.js:47` *(dado)*, `features/home/views.js:32` | Mudança e transporte |
| `apartment` | `features/listings/attributes.js:10`, `features/listings/compare.js:5`, `features/transfers/guide.js:1` | Imóvel |
| `home_work` | `features/groups/presets.js:3` *(dado)* | Grupo "Casa e vizinhança" |
| `pets` | `features/groups/presets.js:6` *(dado)* | Grupo e interesse de Pets |
| `school` | `features/groups/presets.js:4` *(dado)*, `features/transfers/guide.js:1` | Grupo de escola; guia de escolas |
| `child_care` | `features/groups/presets.js:11` *(dado)* | Interesse "Filhos pequenos" |
| `family_restroom` | `features/groups/presets.js:7` *(dado)* | Grupo "Famílias" |
| `directions_run` | `features/groups/presets.js:5` *(dado)* | Grupo/interesse "Corrida" |
| `flight_land` | `features/groups/presets.js:9` *(dado)*, `features/home/views.js:32` | Grupo "Chegando na cidade"; plano de chegada |
| `request_quote` | `features/requests/model.js:35`, `features/businesses/detail.js:3` | Pedido de orçamento; pedido de serviço |
| `inbox` | `features/requests/views.js:7`, `features/support/help.js:82` | Fila de pedidos; chamados |
| `add_business` | `features/home/views.js:27`, `features/home/desktop.js:15` | Indicar/criar negócio |
| `checklist` | `features/home/views.js:32` | Plano de chegada (checklist) |
| `event` | `features/requests/views.js:36`, `features/listings/detail.js:9` | Data do encontro/agenda |
| `event_available` | `app/handlers.js:36` (ternário `on?`) | Presença confirmada |
| `event_busy` | `data/demo/owner.js:19` *(dado)*, `features/owner/business-team.js:19` | Mudança de agenda; cancelamento |
| `trending_up` | `data/demo/owner.js:17,20` *(dado)*, `features/businesses/plans.js:32` | Números que subiram; destaque patrocinado |
| `search_off` | `features/listings/catalog.js:35`, `features/search/views.js:23` | Padrão do estado vazio (`empty()`, `shell/primitives.js:18`) |
| `visibility` / `visibility_off` | `shell/navigation.js:108`, `features/profile/hidden.js:7`, `features/businesses/detail.js:11` | Faixa de visita a outra cidade; bairro oculto; visibilidade do endereço |

23 nomes nesta seção (`visibility` e `visibility_off` somam dois).

### Notas para o porte

1. **Existe um ícone que não é Material Symbols**: o bloco "Saúde" da busca usa `SVG_HEALTH`
   (`features/search/views.js:38`) e o valor `svg-health` no lugar do nome — no porte vira componente.
2. **Ícones de dado** (`ic:`/`icon:` em `data/demo/owner.js`, `features/groups/presets.js`,
   `features/support/help.js`, `shell/command-palette.js`, `features/listings/alerts.js`,
   `features/owner/console.js`) precisam entrar como chave de um mapa tipado, não como literal.
3. **Fora da lista, por não serem ícones**: `filled`, `tonal`, `outlined`, `text` (variantes de botão),
   `call`, `clear`, `done` (valores de ação/filtro), `verified` (campo de estado), e as chaves de
   comodidade `furnished`, `ac`, `balcony`, `pool`, `gym`, `doorman`, `leisure`
   (`features/listings/attributes.js:4`) — as comodidades usam `check`, não um ícone por comodidade.
4. **Não verificado**: se todos os 100 existem na fonte embutida. O arquivo de fontes
   (`styles/fonts.css`) é um binário base64 e não expõe a lista de glifos; a conferência feita aqui é
   do uso no código, não da presença no arquivo de fonte.

---

## 10. Proposta de ondas

**8 ondas.** A ordem não é decorativa: a onda 1 é pré-requisito de todas as outras (é ela que cria a
casca, o roteamento, o estado e os primitivos). As ondas 2 a 8 são independentes entre si e podem rodar
em qualquer ordem, desde que cada uma leve junto as suas próprias telas de detalhe, editores, estados e
provas. Tamanho relativo: **P** (pequena), **M** (média), **G** (grande).

O critério de pronto de cada onda é o mesmo, e é o que fecha a jornada:
tela → ação → persistência → retorno → caminho triste. Nenhuma onda fecha com tela que só desenha.

| # | Onda | Rotas (capítulo 2) | Entrega | Depende de | Tamanho |
|---|---|---|---|---|---|
| 1 | **Base, casca e primitivos** | — (todas as rotas em casca vazia) | Roteamento por hash, casca (barra do topo, navegação, muralha), estado e persistência, tema claro/escuro, primitivos e os 52 componentes comuns, movimento e tokens, dados de demonstração portados | — | **G** |
| 2 | **Início, busca e guia** | `inicio` (2.3.1), `busca` (2.3.4), `guia` (2.3.5) | Início do celular e do desktop, busca com tipos e recentes, paleta de comandos, guia de chegada, plano de chegada/saída | 1 | **M** |
| 3 | **Comunidade e perguntas** | `comunidade` (2.3.2), `pergunta` (2.3.3), `minhas` (2.5.4) | Abas e filtros, pergunta com respostas, útil, resolvida, seguir, editar/excluir o que é seu, minhas indicações | 1 | **M** |
| 4 | **Grupos, publicações e encontros** | `grupo` (2.4.1), `publicacao` (2.4.2), `agenda` (2.4.3), `evento` (2.4.4) | Grupo (regras, membros, moderadores, pedidos, encerrar), publicações com enquete e comentários, agenda e encontro com presença, lotação e cancelamento | 1 | **G** |
| 5 | **Mercado I — listas, filtros, mapa e comparação** | `desapegos` (2.1.1), `imoveis` (2.1.2), `catalogo` (2.1.3), `salvos` (2.5.2), `meus-anuncios` (2.5.3) | Pílulas, painel/folha de filtros com contagem viva, ordenação, modo lista/mapa, folha do bairro, alerta de busca, salvar, comparação de imóveis, meus anúncios por filtro | 1 | **G** |
| 6 | **Mercado II — detalhe, publicação e fotos** | `anuncio` (2.2.1) | Detalhe imersivo, contato, oferta, visita, encerrar/reativar, excluir, contatos recebidos, editores de anúncio e de imóvel em 5 etapas, rascunho, fotos (arrastar, capa, galeria com gestos), cartão de compartilhamento | 1, 5 (componentes de cartão/fotos) | **G** |
| 7 | **Negócios, pedidos e conversas** | `negocios` (2.6.1), `negocio` (2.6.2), `pedidos` (2.7.1), `pedido` (2.7.2), `conversas` (2.8.1), `conversa` (2.8.2) | Catálogo e página do negócio, assumir no modo teste, indicar, planos, editor do negócio; pedido com propostas e comparação; lista de conversas e conversa com balões, reações, fixar e apagar | 1, 6 (contato a partir do anúncio) | **G** |
| 8 | **Você, entrada, ajuda, legais e painel do dono** | `voce` (2.5.1), `ocultados` (2.5.5), `bloqueados` (2.5.6), `entrar` (2.9.1–2.9.13), `privacidade` (2.10.2), `conduta` (2.10.3), `ajuda` (2.10.4), `contato` (2.10.5), `chamados` (2.10.6), `apagar-conta` (2.10.7), `dono` (2.10.1) | Perfil com avisos, preferências e privacidade de bairro; ocultados e bloqueados; os 13 passos da entrada com elegibilidade, documento, convite familiar e cidade; políticas legais; ajuda, contato, chamados e apagar a conta; Painel do Bivaque com filas e decisões | 1 | **G** |

### O que cada onda herda da onda 1

Toda onda 2–8 assume já pronto, e **não reimplementa**: o roteador com `#rota/id`,
`?cidade=`, restauração de scroll/foco/filtros (`shell/navigation.js:22`, `:30`), o `entryGate`
(`:106`), a barra do topo por rota, a navegação (inferior, rail, minimizar ao rolar), o menu Criar, o
chip de cidade e a troca de cidade, os avisos com contador, a busca global e a paleta, os diálogos e
confirmações, a pilha de folhas e o `sheet-depth`, os avisos com desfazer (`notify`), o `mutate` com
rollback, o tema com `theme-color`, a faixa de visita a outra cidade (`readonlyHtml`, `:108`) e a
checagem de permissão (`canPost`, `accessibleRecord`, `profile.verified`).

### Ondas que podem rodar em paralelo

- 2, 3, 4, 5, 7 e 8 não compartilham tela entre si: são seis faixas paralelas legítimas depois da 1.
- 6 depende dos componentes de cartão, fotos e galeria que nascem na 5 — rodar 5 antes de 6 evita
  duplicar `photoCard`, `cover` e o tratamento de imagem.
- 7 compartilha com 6 só a abertura de conversa a partir do anúncio (`item-interest`, `item-visit`,
  `send-offer`): se rodarem juntas, a 7 assume o contrato de `contact()`.

### Onde estão os riscos de subestimar

1. **A onda 1 não é só "casca".** Ela carrega 52 componentes comuns (capítulo 7), 100 ícones
   (capítulo 9) e 40 movimentos (capítulo 6), além do estado e da persistência. É a onda maior, mesmo
   sem nenhuma rota de produto.
2. **A onda 4 tem três jornadas de tamanho médio dentro dela** (grupo com moderação, publicação com
   enquete e comentários, encontro com presença). Se houver paralelismo, ela abre em três faixas.
3. **A onda 5 e a 6 são o mercado inteiro**, que é a maior área do protótipo em telas e overlays
   (filtros com contagem viva, mapa sob demanda, comparação, assistente de 5 etapas, galeria com gestos).
4. **A onda 8 contém a entrada (13 estados) e o painel do dono**, que não compartilham nada entre si.
   São três faixas naturais: entrada; conta/ajuda/legais; painel.
5. **O que não vai para o app**: os controles do protótipo (`openPrototype`,
   `features/profile/settings.js:6`, com cenário de teste, permissão de teste, Portal, simulações e
   reiniciar). Eles aparecem no capítulo 5 como andaime e **não** viram tela do produto. Onde o
   protótipo depende deles para chegar a um estado (por exemplo, perfil verificado, entrada em análise,
   plano grátis no limite de conversas, propostas simuladas), a onda precisa de um caminho de produto
   equivalente: dado semeado, perfil de demonstração ou semente de desenvolvimento — não um botão de
   protótipo.

### Mapa de rotas × ondas

| Onda | Rotas |
|---|---|
| 1 | (nenhuma rota de produto) |
| 2 | `inicio`, `busca`, `guia` |
| 3 | `comunidade`, `pergunta`, `minhas` |
| 4 | `grupo`, `publicacao`, `agenda`, `evento` |
| 5 | `desapegos`, `imoveis`, `catalogo`, `salvos`, `meus-anuncios` |
| 6 | `anuncio` |
| 7 | `negocios`, `negocio`, `pedidos`, `pedido`, `conversas`, `conversa` |
| 8 | `voce`, `ocultados`, `bloqueados`, `entrar`, `privacidade`, `conduta`, `ajuda`, `contato`, `chamados`, `apagar-conta`, `dono` |

Total: 33 rotas distribuídas em 7 ondas de produto, com a onda 1 como base.

---

## 11. Contagem e lacunas

### 11.1 Contagem

| O que | Quantidade | Fonte e como foi contado |
|---|---|---|
| **Rotas** | **33** (+ a rota interna `indisponivel`) | `navigationNames` em `shell/navigation.js:4`; `indisponivel` é o estado de erro de `parseRoute`/`render`, fora da lista |
| **Seções de rota** | **45** | Capítulo 2: 33 rotas, com `entrar` aberto em 13 estados e `catalogo`/`desapegos`/`imoveis` descritos separadamente |
| **Diálogos, editores, folhas e menus** | **81** | Tabela única do capítulo 3, uma linha por overlay (diálogo, confirmação, folha, painel, menu, lightbox, assistente, paleta) |
| **Ações** | **289** distintas | Capítulo 4: 286 com efeito de produto + 3 sem emissor (`catalog-filter`, `search-from-home`, `noop`); `wiz-*` (3) e `item-*` (5) agrupadas em uma linha cada, sem reduzir a contagem; `choose-proposal` tem um emissor que nunca renderiza |
| **`case` de ação no código** | **178** | Extração mecânica de `case '…'` em todo o `src/` (fora `vendor/`); inclui `case` que não são ações de produto (tipos de diálogo, filtros) |
| **`data-action` literais no HTML** | **68** | Extração mecânica de `data-action="…"` no `src/`; a maioria das ações é emitida por helper (`btn`, `iconBtn`, `empty`, `notify`, `perform`), e por isso não aparece como literal |
| **Movimentos** | **40** | Tabela do capítulo 6, um por linha, achados por varredura de `animation`, `transition`, `@keyframes`, `.animate(`, `requestAnimationFrame`, `matchMedia` e `BOLD` |
| **Movimentos que respeitam movimento reduzido** | **33 de 40** | 31 por guarda explícita (`.js` com `matchMedia` ou `@media` oposta no CSS) e 2 pelo interruptor global (`styles/base.css:31`); os 7 restantes são gesto direto sem duração (arrastar, toque longo, pinça) |
| **Componentes comuns** | **52** | Tabela do capítulo 7: 14 primitivos de `shell/primitives.js`, 11 de `utilities/format.js`, 14 do shell e 13 padrões de view. Veredito de porte: 45 "sim", 5 "talvez", 2 "não" |
| **Ícones (Material Symbols)** | **100** | Extração mecânica em posição de ícone (`icon()`, `iconBtn()`, `btn()`, `empty()`, `notify()`, `ic:`/`icon:` de dados, ternário, `<md-icon>`, `slot="icon"`, `icon="…"`), menos 4 falsos positivos de variante de botão |
| **Referências `arquivo:linha`** | **456 distintas** só no capítulo 2 (949 com repetição) | Todas conferidas por script: arquivo existe e a linha está dentro do arquivo (0 inexistentes, 0 fora do intervalo) |
| **Arquivos do protótipo cobertos** | **~75 de 86** `*.js` (fora `vendor/`), **32** `*.css`, `shell/template.html` e `manifest.json` | O que ficou de fora está em 11.3 |

### 11.2 O que este inventário **não** prova

1. **Nada foi executado.** Sem navegador, sem servidor, sem build, sem teste. Todo "aparece", "mostra",
   "dispara" vem de leitura de código e CSS. É a lacuna número um de todo o documento.
2. **Aparência e acessibilidade não foram auditadas.** Contraste, foco, área de toque e a estrutura
   interna dos componentes Material Web (`md-dialog`, `md-outlined-select`, `md-slider`, `md-chip-set`)
   não foram abertas. O capítulo 7 diz em que classe CSS cada bloco se apoia, não como ele se parece.
3. **Alto contraste e movimento reduzido** foram lidos nas regras (`styles/high-contrast.css`,
   `styles/base.css:31` e as guardas de `matchMedia`), não observados.
4. **Miniatura do build.** `src/manifest.json` dá a ordem dos fragmentos e `shell/template.html` traz
   os quatro marcadores, mas o `dist/Bivaque_Material_Web.html` não foi inspecionado: como o protótipo
   é montado em um único arquivo é conhecido pelo manifest, não conferido no artefato.
5. **O repositório além do protótipo não foi lido** (`apps/`, `supabase/`, `docs/` do produto). Nada
   aqui afirma o que o produto real já tem ou deixa de ter.

### 11.3 Lacunas por área (o que ficou `não verificado`, e por quê)

**Do protótipo, mecânicas:**

1. **Arquivos minificados por linha.** Boa parte de `features/` tem uma a três linhas por arquivo (por
   exemplo `features/businesses/catalog.js` é uma linha de 2 KB, `features/profile/views.js` tem uma
   linha de 3,4 KB, `data/demo/source.js` tem uma linha de 23 KB). A citação aponta o bloco inteiro,
   não a regra; `styles/base.css:27` é um bloco com centenas de regras.
2. **Sem media query dedicada a 768 px.** Os cortes que existem são 479, 719/720, 1024, 1200 px. As
   descrições de 768 px relatam o efeito das regras de `min-width:720px`, sem medição.
3. **Emissores dinâmicos.** Ação emitida por campo de dados (`state`, presets, `ic:`) não tem literal
   no HTML: `bookmark`/`bookmark_remove`/`event_available` vêm de ternário, e as ações do painel
   (`owner-*`), dos filtros (`filterChips`, `features/listings/catalog.js:1`) e do menu Criar são
   montadas por helper. Quem procurar por `data-action="owner-go"` no `src/` não acha.
4. **Ações sem emissor**: `catalog-filter` (`app/handlers.js:56`), `search-from-home` (`:42`) e `noop`
   (`features/groups/views.js:88`). Registradas no capítulo 4; não são bug conhecido nem pendência
   declarada — simplesmente não têm gatilho no código atual.
5. **Emissor que nunca renderiza**: `choose-proposal` aparece em `features/requests/views.js:9`, em um
   cartão que o `:16` não usa.
6. **Simulações do protótipo não abertas em detalhe**: `simulateAlertListing`
   (`features/listings/alerts.js:71`), `simulateBizContact` (`features/businesses/plans.js:65`),
   `supportSimulate` (`features/support/help.js:85`), `simulateAnswer`, `simulateMessage`,
   `simulateProposals`, `simulateModeration`.
7. **Uma animação definida e nunca aplicada**: `@keyframes appear` (`styles/base.css:32`) não é usada
   por nenhuma regra de `src/`; e `styles/overlays.css:22` desliga uma animação de `.page` que também
   não existe ali.
8. **Entrada/saída do `#snackbar`** parece instantânea (`shell/toasts.js:23`; nenhuma `transition` para
   `.snackbar.show` localizada).
9. **Movimentos fora do capítulo 6, citados mas não detalhados**: os da landing
   (`styles/landing.css:26,72-76,133,173` com `features/entry/landing.js:114-185`), a barra de enquete
   (`styles/groups.css:42`), o anel do plano (`styles/plan-timeline.css:27`) e o FAB do Criar
   (`styles/create-menu.css:6-12`).

**Dos dados de demonstração:**

10. **Campos e entidades mortos.** `SOURCE.live.comms` (5 registros) e `SOURCE.seed.comms` (3) não são
    lidos por ninguém — os grupos da tela vêm de `buildGroups` (`features/groups/views.js:7-33`);
    20 escalares de `live` (`resolved`, `steps`, `cap`, `quoteOn`, `failPortal`, `nid`, `turmaJoined`…)
    não têm leitor; `CAT_NAMES` (`data/demo/model.js:3`) foi substituído por `SERVICE_GROUPS`
    (`features/businesses/taxonomy.js:1-3`), com as 12 categorias antigas em `LEGACY_CATS` só para
    migrar estado salvo; a chave de imagem `chegada` não é referenciada.
11. **Duas contagens do próprio protótipo estão erradas** no texto de apoio: `data/demo/bairros.js:11`
    diz "oito" CEPs e há 14; `data/demo/owner.js:2` diz que não há dados de várias cidades e há quatro.
12. **`state.family` não existe** (existem `state.invites` e `state.entry.account.family`);
    `state.alerts`, `state.entry` e `state.askDraft` não nascem em `initial()` (`app/state.js:10`) e são
    criados no caminho.
13. **Dado de exibição sem emissor**: `verifiedBadgeHtml`/`verified-info` está definido
    (`shell/verified-info.js:6`) e tratado (`app/handlers.js:52`), mas nenhuma tela lida monta o selo —
    não foi possível afirmar onde a explicação da verificação abre.

**De documentação (drift, registrado porque muda o que se lê):**

14. **`prototypes/bivaque-html/docs/NAVIGATION_AFTER.md` está defasado** e não serve de inventário:
    declara 19 rotas e 151 ações, cita `features/auth/onboarding.js` (arquivo que não existe mais, o
    fluxo vive em `features/entry/`), ações como `onboard-next`/`nomadic`/`job` e origens que mudaram
    desde a Rodada 1. O capítulo 4 deste documento substitui essa tabela; a divergência fica
    registrada aqui, não escondida.
15. **`AUDITORIA_FUNCIONAL_2026-10-18.md` descreve a base da Rodada 56**, anterior às rodadas 57–72.
    Vários dos defeitos que ela lista já foram corrigidos no código atual (por exemplo, privacidade e
    código de conduta passaram a ter tela em `features/legal/pages.js`, "Ocultar" virou pessoal em
    `features/profile/hidden.js`, bloquear/denunciar existem em `features/profile/blocks.js`,
    editar/excluir o que se publicou está em `features/community/manage.js`). O inventário atual é o
    contrato; ela é histórico.

### 11.4 Contagem final, em uma linha

**33 rotas** (45 seções), **81 diálogos/editores/folhas/menus**, **289 ações**, **40 animações**,
**52 componentes comuns**, **100 ícones**.
