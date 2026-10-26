# BIVAQUE — Auditoria de blocos shadcn/ui para o porte R72

Data: 26/10/2026  
Branch examinada: `feat/port-r72-shadcn-p0-20261025`  
Escopo: **seleção e auditoria de componentes, sem instalação e sem alteração de código**.

## 1. Autoridades e método

- Identidade e comportamento de referência: [VISUAL_BASELINE_R72.md](../bivaque-html/docs/VISUAL_BASELINE_R72.md), HTML R72 congelado em 22/10/2026, SHA-256 `7e7657c3652ce6daff450d8dfe5d9ce8d8eda8d6189bcd3f2317a2f25fb61d2d`.
- Código portado examinado: `components/library-app.tsx`, `components/ui/`, `package.json`, `TOKENS_BIVAQUE.md`, `EXPLORACAO-MODULOS.md`, `QA_R72_PORT_2026-10-25.md` e relatórios P1/P2.
- Catálogos externos conferidos nas respectivas páginas de documentação e prévia pública: ReUI, Shadcnblocks e Tailark.
- Este trabalho **não executou renderização local nem comparação de screenshots**. É uma auditoria de composição, anatomia de telas, viabilidade de encaixe e componentes reais — não uma homologação visual pixel a pixel.

## 2. Diagnóstico do que já existe

A branch já possui primitivos locais shadcn de **Sidebar, Carousel, Sheet, Drawer, Command, Dialog, Tabs, Accordion, AspectRatio, Select e Combobox**, entre outros. As páginas usam esses primitivos em `components/library-app.tsx`, especialmente:
- Home: busca, quatro intenções, serviços em carrossel, oportunidades, perguntas e trilho lateral.
- Catálogo: categorias por ToggleGroup, filtros rápidos, folha de filtros em Sheet no desktop e Drawer no mobile, ordem e cards fotográficos; prestadores usam linhas com foto.
- Comunidade: perguntas em linhas editoriais, abas e respostas expandidas via Accordion.
- Shell: trilho desktop, comando Criar e bottom navigation mobile de cinco destinos, Criar central.
- Busca: CommandDialog com módulos e resultados.
- Detalhe: Sheet contextual, página completa e imagem ampliada em Dialog.
- Criação: Dialog genérico de tipo, título e descrição, com persistência local demonstrativa.

**Problema de alto impacto para a evolução visual:** `library-app.tsx` concentra a maior parte do produto (cerca de 120 kB e 725 linhas físicas, muitas compactadas). Acrescentar blocos inteiros nesse arquivo pode reforçar inconsistências e dificultar refinamento por tela. Extrair seções de apresentação de forma incremental é condição de manutenção, sem alterar o estado compartilhado.

O porte P1/P2 documenta explicitamente ausência de paridade visual e funcional completa com a R72. Não confundir prévia em navegador, controles de demonstração e acesso real, moderação real ou dados de imóveis verificados.

## 3. Matriz por superfície — componentes concretos

| Prioridade | Superfície | Padrão identificado | Referência concreta verificada | Decisão e adaptação |
|---|---|---|---|---|
| **P0** | Imóveis / Desapegos: lista | Grid fotográfico já existente, filtros em dois lugares | [Shadcnblocks **Product List 1** — gratuito](https://www.shadcnblocks.com/block/product-list1) | Usar **como referência de anatomia**, não importar o bloco cru: aproveitar consistência de imagem/preço/metadados; remover oferta, urgência e carrinho quando não aplicáveis. |
| **P0** | Imóveis / Desapegos: filtro | Chips rápidos e formulário Sheet/Drawer distintos | [ReUI **Filters** — exemplos gratuitos](https://reui.io/components/filters), especialmente `c-filters-1`, `c-filters-5`, `c-filters-6` | Prototipar barra de filtros aplicados com remover/limpar, acoplada ao estado existente; manter seleção rápida e Drawer mobile. Comparar custo da API schema-driven com composição shadcn já instalada. Não criar estado divergente. |
| **P0** | Página do imóvel/anúncio | Ficha e zoom com uma fotografia de fixture | [Shadcnblocks **Product Gallery 3** — Pro](https://www.shadcnblocks.com/block/product-gallery3) | Boa referência para galeria responsiva e lightbox; **não instalar agora**: há apenas uma foto por item na prévia. Proteger contra galeria de imagens repetidas ou inventadas. |
| **P0** | Prestadores / Serviços | Linha editorial com imagem, metadados e CTA | [Shadcnblocks **Services 7** — Pro](https://www.shadcnblocks.com/block/services7) | Referência secundária para tags e ritmo vertical. O código existente já está mais adequado à ficha de prestador do que o bloco promocional; não substituir integralmente nem adotar excesso de bordas. |
| **P0** | Home | Descoberta orientada por intenção, card de continuação, carrosséis e perguntas | [ReUI **Card** e **Carousel**](https://reui.io/components) + shadcn atual | **Preservar composição aprovada**, refinar densidade, cortes de fotos, tipografia editorial e alinhamento. Não importar App Shell ou hero de SaaS. |
| **P0** | Comunidade / Grupos | Perguntas em linhas, respostas e estados de adesão | [shadcn **Accordion**](https://ui.shadcn.com/docs/components/accordion), [ReUI **Empty**](https://reui.io/components/empty) | Refinar estados de resposta, utilidade e leitura. **Rejeitar Shadcnblocks Community** para feed: seus sete blocos são de links para canais e redes sociais, não threads. Não expor conteúdo restrito. |
| **P1** | Agenda / Encontros | Jornada de eventos demonstrativa | [ReUI **Event Calendar** gratuito](https://reui.io/components/event-calendar) | Candidato forte para mês + agenda. Não habilitar drag/resize se não fizerem sentido à participação em encontros. A biblioteca avisa que os exemplos não persistem edição por padrão; ligar ao estado/localidade. |
| **P1** | Movimentação | Checklist e progresso | [ReUI **Stepper** gratuito](https://reui.io/components/stepper) | Usar variante vertical/etapas para chegada e saída, sem tratar checklist como status oficial da FAB. Persistir valores no estado existente; atenção a unmount de `StepperContent`. |
| **P1** | Avisos | Precisa diferenciar histórico, ações e não lidos | [Shadcnblocks **Inbox 3** — Pro](https://www.shadcnblocks.com/block/inbox3) | Referência forte de leitura, filtros e prévia em Drawer mobile; **não confundir com mensagens privadas** e não instalar sem licença. |
| **P1** | Criar anúncio e primeiro acesso | Atualmente criação genérica em Dialog | [ReUI **Stepper**](https://reui.io/components/stepper) + [Onboarding Pro](https://reui.io/blocks/application/onboarding) | Stepper para orientação do fluxo de cadastro/criação; o Onboarding Pro é apenas referência visual. Não alterar ordem nem garantias de verificação; não simular autenticação como real. |
| **P2** | Administração de Vilas / Painel | Dados tabulares e estados operacionais | [ReUI **Data Grid** gratuito](https://reui.io/components/data-grid), `c-data-grid-34` para paginação de servidor | Só é adequado a *painéis administrativos*, não às páginas públicas de descoberta. Integração real depende de permissões/RLS antes de expor informação. |
| **P2** | Landing institucional | Página de aquisição, não a Home do app | [Tailark](https://tailark.com/) | Usar seções de marketing como estudo de composição, não transplantar identidade, copy genérica ou hero padrão. |

**Categorias inadequadas como solução automática:** Dashboard de SaaS para a Home; kits de e-commerce com carrinho/checkout; cards de “oferta imperdível”; feed de Community voltado a links externos; shells completos que redesenham a navegação R72.

## 4. Escolha recomendada por custo e manutenção

### Testar primeiro, sem compra

1. **ReUI Filters**: estudo A/B em `/imoveis` e `/desapegos` com chips + folha existentes versus filtro ReUI, **estado único**, reinicialização por cidade e resultado correto.
2. **Shadcnblocks Product List 1 (Free)**: estudo apenas de composição de card, com metadados próprios de imóvel e desapego. Sem compra, sem carrinho, sem selos de urgência não fundamentados.
3. **ReUI Event Calendar**: estudo para `/agenda` com filtros de cidade e agenda mobile.
4. **ReUI Stepper**: estudo para `/movimentacao`; não reutilizar como tela de autenticação efetiva.

### Adiar licença paga

- **Product Gallery 3**: interessante após haver mais de uma foto legítima por anúncio.
- **Inbox 3**: útil quando central de avisos e estados de leitura estiverem maturados.
- **ReUI Pro App Shell**: baixo benefício marginal, porque o shell R72 já tem especificação própria.
- **Services 7**: apenas referência de disposição, não justificar compra isoladamente.

Preços e licenças devem ser reconferidos antes de comprar; **visualizar uma prévia pública não equivale a adquirir direitos de uso do código Pro**.

## 5. Ordem de execução sugerida

**Lote A — linguagem visual (não altera jornadas):**
- Extrair só as apresentações `HomeSections`, `CatalogCard`, `ProviderRow`, `QuestionRow` e `FilterBar` de `library-app.tsx`, sem duplicar estado ou alterar os destinos.
- Normalizar imagem, tipografia, espaçamento, raio, badge, CTA de navegação e microestados com tokens aprovados.
- Criar catálogo local de variantes (exemplos visuais simples) para evitar deriva entre módulos.

**Lote B — catálogo e busca:**
- Implementar estudo A/B real de filtros e de cards, com mesmos dados, ações e testes.
- Verificar URL/estado local, cidade, clear all, combinação de preço/tipo/OM, vazio e 375 px.
- Avaliar alternativa shadcn local antes de incluir dependências de ReUI.

**Lote C — superfícies especializadas:**
- Agenda, movimentação e avisos, isolados das demais telas.
- Só depois, fichas com galeria real, workflows de anúncio e permissões.

**Lote D — decisão de adoção:**
- Rejeitar candidatos cujo ganho seja apenas adicionar sombra, borda ou animação.
- Migrar um bloco por vez. Manter o comportamento R72 ou registrar desvio explicitamente.

## 6. Gates de aceite

1. Capturas reais **375, 768, 1440 px × claro/escuro** da R72 e da branch, com mesma cidade, conteúdo e estado; comparação humana de hierarquia, dobras, densidade, imagem, tipografia e contraste.
2. Verificação de navegação e das cinco ações mobile, com **Criar no centro**; rotas e retorno sem regressões.
3. Tests: busca, cidade, categorias, filtros combinados, limpar filtros, favoritos, respostas, grupo restrito, denúncia, detalhes e estados vazios.
4. Teclado, foco, alvos de 44 px, leitor de tela/axe e respeito a redução de movimento.
5. Identidade: `Grafite #253033`, `Papel #F2F0EB`, `Brasa #B84A3A`, Noto Sans/Serif e ativos oficiais. Brasa reservada a criar/CTA; sem selos de autoridade fabricados.
6. Privacidade: nenhuma regra de permissão, acesso militar, documentos, autorização de grupo ou confiança pode ser “resolvida” visualmente com dados simulados.
7. Nenhum anúncio/negócio/avaliação fictício deve parecer real; sem fotos duplicadas para simular volume.
8. **Main, produção e HTML R72 congelado permanecem intocados.** Esta auditoria não aprova merge.

## 7. Veredito

**Recomendo melhorar o Bivaque por anatomia e composição, não por transplante de telas inteiras.** Os candidatos imediatos são ReUI Filters e Shadcnblocks Product List 1; próximos são Event Calendar e Stepper. O shell, a Home e a Comunidade já têm uma gramática mais coerente com o produto do que os templates genéricos de SaaS/e-commerce. ReUI Pro e blocos Shadcnblocks Pro ficam condicionados à existência dos dados/fluxos, à licença e a um ganho comprovado nas capturas.
