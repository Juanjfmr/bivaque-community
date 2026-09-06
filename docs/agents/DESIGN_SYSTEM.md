# Bivaque Design System — Casa comum

> **Status:** canônico desde 2026-09-01, pela
> [`ADR-20260901-design-system`](../decisions/ADR-20260901-design-system.md).
>
> Este é o contrato único de identidade e interface do Bivaque. Ele substitui as regras
> normativas de `DESIGN_SPEC.md` e `VISUAL_GUIDE.md`, que agora existem apenas como
> redirecionamentos de compatibilidade. O sistema descreve o alvo. Código legado não prova
> aderência: cada tela só passa a estar conforme após a auditoria visual e de runtime.

## Índice

1. [Autoridade e uso](#1-autoridade-e-uso)
2. [Caráter de marca](#2-caráter-de-marca)
3. [Princípios de experiência](#3-princípios-de-experiência)
4. [Foundations](#4-foundations)
5. [Arquitetura de tokens](#5-arquitetura-de-tokens)
6. [Componentes](#6-componentes)
7. [Padrões de produto](#7-padrões-de-produto)
8. [Layout responsivo](#8-layout-responsivo)
9. [Acessibilidade](#9-acessibilidade)
10. [Conteúdo, imagens e ícones](#10-conteúdo-imagens-e-ícones)
11. [Qualidade e governança](#11-qualidade-e-governança)
12. [Adoção e decisões abertas](#12-adoção-e-decisões-abertas)

---

## 1. Autoridade e uso

### 1.1 Ordem de autoridade

1. `AGENTS.md`, [`BIVAQUE.md`](../BIVAQUE.md), ADRs aceitos, lei e segurança definem o que
   pode existir. Um tratamento visual jamais relativiza privacidade, autorização ou escopo.
2. Este documento define como o produto se apresenta, interage e é construído.
3. Componentes, tokens e testes implementam este documento. Quando divergem, a divergência é
   dívida explícita, nunca uma nova regra tácita.
4. Capturas, referências externas e preferências são evidência; não são autoridade automática.

As palavras **MUST**, **SHOULD**, **MAY** e **EXPERIMENTO** têm força deliberada. `MUST`
protege confiança, acessibilidade ou coerência sistêmica. `SHOULD` é o padrão que exige motivo
para ser quebrado. `MAY` é uma possibilidade. `EXPERIMENTO` não pode virar convenção sem
evidência e decisão registrada.

### 1.2 Como construir uma tela

1. Comece pelo trabalho do membro, seu escopo e o caminho triste — não por um card.
2. Escolha um padrão desta especificação e componentes existentes antes de criar anatomia nova.
3. Use tokens semânticos; valor bruto precisa de exceção documentada no PR/contrato.
4. Projete loading, vazio, indisponível, erro, pendência e sucesso junto com o feliz.
5. Audite a tela em 375, 768 e 1440 px e prove o comportamento que imagem não demonstra.

### 1.3 O que este sistema não faz

Ele não decide elegibilidade, dados exibíveis, autorização, taxonomia de produto ou a existência
de uma feature. Também não copia o Airbnb. “Padrão Airbnb” significa hospitalidade, clareza,
consistência e qualidade de execução — não paleta, iconografia ou padrões proprietários.

---

## 2. Caráter de marca

### 2.1 Promessa de experiência

**A comunidade que ajuda você a se situar e participar, sem ruído nem cerimônia.**

O Bivaque é uma casa comum: organizado o bastante para que informação importante sobreviva,
humano o bastante para que pedir ajuda não pareça abrir um chamado. A confiança vem de escopo
claro, comportamento previsível e cuidado com a pessoa — nunca de símbolos militares, selos,
patentes, linguagem oficial ou aparência de vigilância.

### 2.2 Voz

| Somos | Na prática | Nunca somos |
|---|---|---|
| Acolhedores | “Você já pode participar da sua comunidade.” | Excessivamente íntimos ou infantis |
| Diretos | “Não foi possível publicar. Seu texto continua aqui.” | Burocráticos ou cheios de jargão |
| Discretos | Explicamos o necessário, sem expor motivo interno | Misteriosos quando existe um próximo passo seguro |
| Comunitários | Falamos de pessoas, lugar e ajuda concreta | Institucionais, táticos ou hierárquicos |

Use PT-BR correto, frases curtas e verbos ativos. Diga a consequência antes da explicação em
ações relevantes: “Publicar para Vila Ajuricaba”, não “Confirmar”. Para recusa ou falha, nomeie
o que a pessoa pode fazer sem revelar dado de elegibilidade, política interna ou informação de
outra pessoa.

### 2.3 Marca e símbolo

O wordmark é o nome “Bivaque”; o símbolo só pode ser criado em ativo próprio aprovado. Até lá,
não improvisar brasão, estrela, escudo, insígnia, monograma militar ou mapa de localização.
Mantenha área livre igual à altura do “B” ao redor do wordmark e não use-o abaixo de 72 px de
largura. Em interfaces autenticadas, a marca orienta; o título `h1` identifica a tarefa atual.

---

## 3. Princípios de experiência

1. **Escopo antes do gesto.** Antes de publicar, compartilhar, convidar ou moderar, a pessoa
   enxerga a audiência e a consequência na mesma área de decisão. Trocar de tela ou recuperar
   rascunho nunca amplia audiência silenciosamente.
2. **A ajuda precisa ser recuperável.** Conteúdo permanente não depende de memória de feed;
   busca, filtros e fonte mantêm resposta, indicação, evento e guia encontráveis.
3. **Confiança sem prestígio.** Não há selo público de verificação, patente, OM, endereço ou
   ornamentação que prometa uma autoridade que o produto não atesta.
4. **Estados dizem a verdade.** Vazio, erro, indisponibilidade, pendência, sucesso e dado
   antigo têm significado e recuperação próprios. Falha nunca se veste de lista vazia.
5. **O próximo passo é visível.** Uma tela pode ser calma sem ser passiva: a ação principal
   aparece cedo, é específica e não compete com cinco ações equivalentes.
6. **Densidade é uma escolha de tarefa.** Feed e leitura ganham respiro; descoberta,
   governança e comparação podem ganhar densidade. Espaço vazio não é automaticamente luxo.
7. **Privilégio muda o contexto.** Operador, dono e prestador vivem em shells visual e
   navegacionalmente distintos do membro comum quando seus dados ou consequências diferem.
8. **Movimento confirma; não explica.** Toda mudança continua compreensível parada e com
   `prefers-reduced-motion`.

---

## 4. Foundations

### 4.1 Direção visual: Casa comum

Superfícies claras e neutras, texto grafite-esverdeado, ação em verde profundo e contexto em
azul-petróleo. Direção autorizada em 06/09/2026 pelo guia visual
`docs/design/visual-guide-2026-09-06/`, que substitui a paleta terracota anterior.
O contraste de registros é intencional: a base é serena para leitura longa; a ação é viva sem
parecer oferta agressiva; o contexto é estável sem soar oficial. Ilustrações têm gesto simples,
linhas arredondadas e áreas vazias generosas. Fotos mostram vida cotidiana, serviços reais,
lugares e encontros — não fardas, equipamento, documentos ou endereços.

### 4.2 Cor

Os pares abaixo foram escolhidos para AA em texto normal quando usados como indicado. Nunca use
cor como único sinal de seleção, erro, leitura, pendência ou prioridade.

| Papel | Token semântico | Valor v1 | Uso |
|---|---|---:|---|
| Canvas | `semantic.canvas` | `#FAFBF8` | fundo de página |
| Surface | `semantic.surface` | `#FFFFFF` | cards, menus e inputs |
| Ink | `semantic.text-primary` | `#16211C` | texto e ícones principais |
| Muted | `semantic.text-secondary` | `#4A594F` | metadados e apoio |
| Primary | `semantic.action-primary` | `#164734` | CTA principal e link de ação |
| Context | `semantic.action-context` | `#1D5D89` | localização, navegação e informação |
| Success | `semantic.success` | `#146C4C` | confirmação positiva |
| Warning | `semantic.warning` | `#8A4B00` | atenção e pendência |
| Danger | `semantic.danger` | `#B42318` | dano, denúncia e remoção |
| Selecionado | `semantic.selected` | `#EEF1E7` | seleção, aba ativa e destaque calmo |
| Focus | `semantic.focus-outer` | `#1D5D89` | foco visível, com anel duplo |

`Primary`, `Context`, `Success`, `Warning` e `Danger` sobre branco usam texto na própria cor;
sobre botão sólido, usam `semantic.text-on-strong` branco somente após contraste automatizado.
Tons suaves derivam de mistura opaca com canvas, nunca de reduzir arbitrariamente a opacidade do
texto.

### 4.3 Tipografia

O sistema adota **Public Sans** para interface e leitura. A variante de eixo contínuo de peso está
auto-hospedada em WOFF2 nos subsets `latin` e `latin-ext`, com licença OFL-1.1 em
`apps/web/app/fonts/OFL.txt`. O carregador local aplica pré-carga, `font-display: swap` e ajuste de
métrica da alternativa. Nunca carregue a família de um terceiro no caminho crítico.

| Papel | Tamanho / entrelinha | Peso | Uso |
|---|---:|---:|---|
| Display | 40 / 48 | 650 | landing e momentos raros de orientação |
| Page title | 28 / 34 | 650 | um `h1` por tela de tarefa |
| Section title | 20 / 28 | 650 | blocos e cabeçalhos de lista |
| Card title | 16 / 24 | 600 | conteúdo escaneável |
| Body | 16 / 26 | 400 | leitura e formulários |
| Label | 14 / 20 | 600 | controle e metadado acionável |
| Meta | 13 / 18 | 400 | data, escopo e fonte |

Cada papel é um token semântico com `size`, `weight`, `line-height` e `letter-spacing` próprios
(`semantic.typography-*`), derivados dos primitives `primitive.type-*`. As três ocorrências de
peso 650 dependem do eixo contínuo da fonte; substituí-las por um corte 600 perde a decisão
nominal. `type-display-*`, `type-page-title-*` e `type-section-title-*` usam 650 de verdade.

Os aliases legados `text-lg` (18 px) e `text-2xl` (24 px) permanecem por compatibilidade durante a
transição. Eles são tamanhos nomeados como **Legacy large** e **Legacy extra-large**, usados por
componentes ainda não migrados; não são papéis novos do sistema e serão removidos somente com a
prova das superfícies que os consomem.

Texto corrido fica entre 45 e 72 caracteres por linha, com limite em
`semantic.typography-reading-measure` e auditoria própria no loop visual. Não use texto menor que 13 px; controles,
mensagens de erro e conteúdos essenciais usam 14 px ou mais. Caixa alta só para etiqueta curta
e nunca para instrução, navegação ou conteúdo longo.

### 4.4 Espaço, raio, elevação e movimento

| Foundation | Escala |
|---|---|
| Espaço | `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px |
| Raio | `6, 10, 14, 20, pill` px |
| Elevação | `flat`, `raised`, `overlay`; sombra é sinal de camada, não decoração |
| Duração | `0, 120, 180, 240` ms |
| Easing | saída suave para entrada; linear somente em progresso contínuo |

Listas normalmente usam 12–16 px entre unidades; blocos de página usam 24–40 px. Card de feed
é predominantemente `flat` com borda; `raised` fica para hover, menu, composer ou item que pede
clique. Sobreposição usa scrim, foco gerenciado e uma única elevação acima da superfície.

---

## 5. Arquitetura de tokens

### 5.1 Três camadas obrigatórias

```text
primitive  →  semantic  →  component
valor bruto   intenção      contrato de uso
```

- **Primitive:** escala sem significado de interface, por exemplo `primitive.pine-700` e
  `primitive.space-4`. Só foundations e gerador de tokens podem usá-las.
- **Semantic:** intenção estável, por exemplo `semantic.action-primary`,
  `semantic.surface-sunken` e `semantic.text-secondary`. É a camada permitida em layout e
  componentes.
- **Component:** contrato local, por exemplo `component.button-primary-bg` e
  `component.field-invalid-border`. Só referencia semantic ou outro component token.

Todo token deve declarar tipo, descrição, estado, modo e par de contraste quando aplicável.
`packages/tokens/src/tokens.json` é a fonte única publicável. `tokens.css` é gerado por
`scripts/tokens/generate.mjs` e `--check` bloqueia divergência; `nativeTokens` deriva os mesmos
primitives/semantics para React Native (sem `var()`, `color-mix()` ou sombra CSS). CSS e runtime
nativo nunca recebem uma lista de valores editada independentemente.

#### Nomes verificáveis

Os nomes canônicos são caminhos no JSON, sempre com a camada (`primitive`, `semantic` ou
`component`) seguida da chave existente. A lista abaixo é a superfície documental mínima usada
pelos testes de contrato:

`primitive.paper-0`, `primitive.paper-50`, `primitive.ink-900`, `primitive.ink-700`,
`primitive.pine-700`, `primitive.petrol-700`, `primitive.leaf-700`, `primitive.amber-700`,
`primitive.rose-700`, `primitive.space-4`, `semantic.canvas`, `semantic.surface`,
`semantic.surface-sunken`, `semantic.text-primary`, `semantic.text-secondary`,
`semantic.text-on-strong`, `semantic.action-primary`, `semantic.action-context`,
`semantic.success`, `semantic.warning`, `semantic.danger`, `semantic.focus-inner`,
`semantic.focus-outer`, `semantic.control-border`, `component.button-primary-bg`,
`component.button-danger-bg-default`, `component.field-bg-default`,
`component.field-border-default`, `component.field-invalid-border`,
`semantic.typography-display-size`, `semantic.typography-display-weight`,
`semantic.typography-display-line-height`, `semantic.typography-display-letter-spacing`,
`semantic.typography-page-title-size`, `semantic.typography-page-title-weight`,
`semantic.typography-page-title-line-height`, `semantic.typography-page-title-letter-spacing`,
`semantic.typography-section-title-size`, `semantic.typography-section-title-weight`,
`semantic.typography-section-title-line-height`, `semantic.typography-section-title-letter-spacing`,
`semantic.typography-card-title-size`, `semantic.typography-card-title-weight`,
`semantic.typography-card-title-line-height`, `semantic.typography-card-title-letter-spacing`,
`semantic.typography-body-size`, `semantic.typography-body-weight`,
`semantic.typography-body-line-height`, `semantic.typography-body-letter-spacing`,
`semantic.typography-label-size`, `semantic.typography-label-weight`,
`semantic.typography-label-line-height`, `semantic.typography-label-letter-spacing`,
`semantic.typography-meta-size`, `semantic.typography-meta-weight`,
`semantic.typography-meta-line-height`, `semantic.typography-meta-letter-spacing`,
`semantic.typography-reading-measure`.

Não há aliases documentais para tokens: cada nome acima resolve diretamente em uma chave da
camada correspondente de `packages/tokens/src/tokens.json`. Se uma chave mudar, este inventário
e o teste de contrato mudam no mesmo commit.

### 5.1.1 Adaptador permanente da biblioteca

`web.aliases` é uma fronteira de integração, não uma camada legada. A folha do HeroUI v3
consome esses nomes (`surface`, `accent`, `field-border`, estados, forma e movimento), por isso
eles permanecem estáveis e cada valor aponta para `primitive`, `semantic` ou `component`. O
produto não deve criar decisões visuais novas nessa fronteira: consumidores Bivaque usam os
tokens semânticos ou de componente. O teste de escopo enumera dinamicamente a versão instalada
da folha, verifica a cobertura da lista explícita de decisões e documenta as exclusões de
internals de componente, utilitários e geometria de layout.

### 5.2 Inventário mínimo

| Categoria | Primitive | Semantic | Componentes que devem derivar |
|---|---|---|---|
| Cor | `ink`, `paper`, `terra`, `petrol`, `leaf`, `amber`, `rose` | canvas, surface, text, border, action, status, focus | button, field, card, alert, nav, chip |
| Espaço | 0–64 px | page, section, cluster, inset | card, dialog, list-row, composer |
| Tipo | família, tamanho, peso, leading, tracking | display, title, body, label, meta, medida | heading, button, input, card |
| Forma | 6/10/14/20/pill | control, container, overlay | button, input, card, modal |
| Elevação | flat/raised/overlay | surface hierarchy | card, popover, modal |
| Movimento | 0/120/180/240 | feedback, enter, exit | button, toast, overlay, skeleton |

### 5.3 Estados são tokens, não improvisos

Todo componente interativo mapeia pelo menos `default`, `hover` quando houver ponteiro,
`pressed`, `focus-visible`, `disabled`, `loading`, `invalid` quando aplicável e `selected` quando
selecionável. Estados combinados são projetados, não resultado acidental de duas classes CSS.
`disabled` reduz ação, mas preserva contraste e explica indisponibilidade quando isso ajuda a
tomada de decisão.

### 5.4 Exceções

Valor cru é permitido apenas para mídia carregada, canvas, gradiente local ou arte aprovada que
não representa uma função reutilizável. A exceção precisa de comentário com motivo e não pode
virar precedente. Cor em JSX, `style` inline e classe de paleta Tailwind direta são defeitos em
componente de produto.

---

## 6. Componentes

Cada componente tem contrato de semântica, variantes, estados, conteúdo permitido, teclado e
teste. HeroUI v3 permanece a única biblioteca web; wrappers Bivaque são a face do sistema.

| Componente | Contrato visual | Estados essenciais | Acessibilidade e uso |
|---|---|---|---|
| Button | ação clara; uma primária por contexto | default, pending, disabled, danger | `<button>`; nome específico; min. 44 px quando alvo isolado |
| Link | navegação, nunca comando | default, visited opcional, focus | `<a>` com destino real; não simular botão |
| Field | label persistente, ajuda e validação próximas | empty, filled, invalid, disabled, pending | label programático, erro associado, placeholder suplementar |
| Select / Combobox | escolha de conjunto conhecido / busca em conjunto | closed, open, selected, invalid | padrão React Aria/HeroUI; teclado completo |
| Search field | preserva consulta e filtros no vazio/erro | query, no-results, loading, failure | label acessível; Escape limpa somente quando anunciado |
| Card | agrupa uma unidade de leitura ou decisão | flat, interactive, selected | card não é botão; ação interna mantém alvo próprio |
| List row | maior densidade para descoberta/governança | default, selected, unread, disabled | metadados escaneáveis; estado além de cor |
| Chip / filter | filtra ou comunica atributo curto | selected, removable, disabled | não usar para ação primária ou texto longo |
| Tabs | alterna painéis pares no mesmo contexto | selected, unavailable | APG tablist; não usar como navegação escondida |
| Dialog / sheet | decisão focal e reversível | opening, active, submitting, failure | foco contido, Escape quando permitido, retorno ao gatilho |
| Menu | ações secundárias contextualizadas | closed, open, item-disabled | menu semântico; ação destrutiva pede confirmação proporcional |
| Toast / alert | feedback transitório / informação que exige leitura | info, success, warning, danger | toast não carrega única instrução crítica; alert preserva recuperação |
| Empty state | ausência honesta com orientação | no-content, no-results, no-permission | título, explicação e CTA apenas quando seguro |
| Skeleton | geometria do conteúdo pendente | loading | não anuncia conteúdo inexistente; respeita reduced motion |
| Avatar | identidade de pessoa, nunca prova de elegibilidade | image, initials, fallback | alt útil quando necessário; não exibir dado proibido |

### 6.1 Regras de composição

- Um `PageHeader` contém título de tarefa, contexto curto e no máximo uma ação principal.
- Um `Card` não deve conter outro card apenas para criar profundidade. Use divisão, espaço ou
  inset quando a relação é interna.
- Ação destrutiva fica em menu contextual ou etapa de confirmação; não compete visualmente com
  responder, participar ou publicar.
- Loading mantém o shell e aproxima a geometria final. Nenhum skeleton universal substitui o
  julgamento do conteúdo.
- Erro tem linguagem estável, ação de recuperação e preserva entrada segura. Erro interno nunca
  chega ao membro.

### 6.2 Definition of done de componente

Antes de entrar no sistema, um componente precisa de API tipada, variante/estado documentado,
uso responsivo, exemplos de conteúdo longo, teclado/foco, contraste, reduced motion e teste de
interação. “Está bonito em uma tela” não é aceite.

---

## 7. Padrões de produto

### 7.1 Shell, escopo e navegação

Navegação primária responde **o que fazer**; escopo responde **onde e com quem**. O membro vê
containers estáveis para `cidade` (Cidade), `community` (Minha comunidade), `groups` (Grupos) e
`me` (Eu); cada rota de detalhe mantém seu pai conceitual em todos os tamanhos. Eventos, guia e
vitrine vivem em Cidade; conta vive em Eu. **Não existe inbox nem DM geral entre membros.**
Mensagens só surgem como conversa contextual membro↔prestador, no shell e permissões próprios;
nunca devem ser inferidas por um atalho em Eu. Papéis privilegiados e prestador têm shells próprios.

O escopo ativo fica visível onde altera conteúdo, permissão ou audiência. Nunca codifique
Manaus como rótulo universal; a origem vem do estado real de membership.

### 7.2 Feed e conversa

Feed é lista de conversas, não vitrine de cartões flutuantes. A ordem é: contexto, pedido ou
publicação, autoria/escopo/frescor, conteúdo, reação e continuidade. Priorize pedidos abertos e
o próximo encontro sem soterrar a conversa. Métricas não são decoração: só aparecem quando
ajudam alguém a decidir abrir, responder ou participar.

### 7.3 Composer e ações de alcance

O gatilho de publicação declara audiência antes do submit e repete a escolha junto da ação final.
Rascunho sobrevive a falha recuperável; troca de escopo pede confirmação se pode alterar a
audência; o sucesso identifica onde o conteúdo foi publicado. Anexos e tipos adicionais só
aparecem quando têm caminho completo de recuperação e moderação.

### 7.4 Descoberta, guia e vitrine

Busca e filtros mantêm consulta visível. Cada resultado mostra o mínimo para decidir: tipo,
fonte/indicação, escopo, atualidade e próximo passo. Informação permanente prioriza título,
categoria, prova de origem e data de revisão, não posição no feed. Conteúdo patrocinado precisa
de rótulo persistente e nunca altera a ordenação de confiança.

### 7.5 Formulários, admissão e privacidade

Formulário começa explicando finalidade e termina mostrando consequência. Campos obrigatórios,
ajuda e erro têm relação programática. CPF nunca é ecoado depois do envio; falha de elegibilidade
mantém resposta genérica. A tela pode ser calorosa sem prometer aprovação, prazo ou acesso que o
backend não garante.

### 7.6 Governança e consequências

Ações de admissão, remoção, ocultação, suspensão e decisão de documento mostram escopo, efeito,
reversibilidade e justificativa necessária no momento do commit. O shell privilegiado é mais
denso, não mais ameaçador. Nunca esconder autorização só pela UI: o servidor continua sendo a
fonte da permissão.

---

## 8. Layout responsivo

### 8.1 Princípio

O layout muda quando leitura, alvo, rótulo, comparação ou densidade deixam de funcionar — não
porque o dispositivo recebeu uma etiqueta. Toda mudança preserva o pai conceitual da rota, o
escopo ativo e a ação principal.

| Região | Compacta | Intermediária | Ampla |
|---|---|---|---|
| Navegação | bottom nav com rótulo | rail lateral com nome acessível | sidebar com rótulo e contexto |
| Conteúdo | uma coluna e ações empilhadas | coluna confortável, grupos de ações | medida de leitura + rail somente se ele ajudar |
| Formulário | ação fixa quando necessário | campos agrupados | largura limitada; não esticar para preencher |
| Governança | lista priorizada + detalhe sob demanda | lista e painel opcional | comparação lado a lado quando melhora decisão |

Os limiares são testados com conteúdo real: rótulos em português, nome longo, erro de validação,
texto com três linhas, comunidade sem conteúdo e um conjunto denso. Uma grade que só funciona
com dados curtos não está pronta.

### 8.2 Medidas e alinhamento

- Leitura longa: 45–72 caracteres por linha; comentários e texto de feed não passam disso só
  para ocupar a tela.
- Scan/lista: largura maior é permitida para comparação, mas título, ação e metadado devem
  manter ordem de leitura clara.
- Rail: é conteúdo independente e acionável — próximo evento, pedido aberto, guia relevante.
  Se não há algo útil, desaparece; nunca existe como espuma visual.
- Barra fixa, teclado virtual, safe area e zoom fazem parte do layout. O conteúdo final não pode
  ficar escondido atrás de nav ou CTA persistente.

### 8.3 Reflow

O produto MUST funcionar a 320 CSS px de largura e com zoom de texto de 200%, salvo conteúdo
genuinamente bidimensional, que fornece rolagem na direção necessária e uma alternativa de
leitura. Não cortar nome, erro, escopo ou ação crítica com ellipsis quando eles forem a única
fonte de significado.

---

## 9. Acessibilidade

### 9.1 Compromisso

Interfaces de membro e governança atendem WCAG 2.2 AA aplicável. Esse é um requisito de entrega,
não uma qualidade futura. O teste automático encontra regressões; a prova em navegador valida o
que automação não entende.

### 9.2 Checklist de construção

- HTML nativo vem antes de ARIA. Link navega; botão comanda; lista é lista; título forma
  hierarquia.
- Todo controle tem nome acessível e todo input, label persistente. Placeholder não é label.
- Erro, ajuda, obrigatório e inválido são associados ao campo. Foco chega ao primeiro erro sem
  apagar a entrada.
- `:focus-visible` é inequívoco em superfícies claras, escuras e coloridas; não retirar outline
  sem substituto visível.
- Estado selecionado, não lido, pendente, aviso, erro e bloqueado combina texto, ícone, forma
  ou posição com cor.
- Alvos isolados chegam a 44 × 44 px; quando uma exceção da WCAG for usada, ela é documentada e
  não coloca ações adjacentes em risco.
- Dialog prende foco, permite Escape quando descartável e devolve foco ao gatilho. Toast não é
  a única forma de conhecer uma consequência importante.
- Imagem tem `alt` específico quando leva conteúdo; é decorativa quando não leva. Ícone sem
  texto recebe nome acessível no controle pai.
- Animação não leva sentido sozinha e `prefers-reduced-motion` reduz viagem, shimmer e transição
  não essencial sem remover feedback de estado.
- Português usa diacríticos, datas e números locais; idioma de texto alternativo é marcado.

### 9.3 Contraste e teste

O foco usa anatomia de anel duplo: `semantic.focus-inner` é o anel claro imediatamente sobre o
controle sólido e `semantic.focus-outer` é o anel escuro que se separa dele e contrasta com a
superfície externa. Assim o indicador não precisa usar uma única cor contra superfícies que têm
luminâncias opostas. A matriz cobre os estados de botão e exige pelo menos `3:1` para cada anel
no fundo em que ele aparece.

O limite que identifica um campo usa `semantic.control-border`, derivado de `primitive.ink-700`,
e seus estados percorrem uma rampa neutra da mesma família: `semantic.control-border-hover`
escurece para `primitive.ink-800`, `semantic.control-border-pressed` chega a `primitive.ink-900`
e `semantic.control-border-disabled` recua para `primitive.ink-500`. Ele é separado de
`semantic.border`, que continua sendo a divisória decorativa sutil. Campo, select e checkbox usam
o limite de controle; divisórias não engrossam por causa desta regra.

**Estado de campo não empresta cor de outro significado.** A rampa é neutra de propósito:
verde profundo, petróleo, verde de sucesso e vermelho carregam significado próprio no sistema,
e um campo com
limite vermelho ao ser pressionado diz à pessoa que ela errou. Carregando não tem cor própria —
`component.field-bg-loading` e `component.field-border-loading` apontam para o estado desabilitado
e recebem movimento, que é o contrato de Skeleton na §6. Um estado herda apontando para o estado
pai; o teste recusa dois estados que colidam por acidente e aceita a herança declarada.

Todo par de token de texto/superfície e de indicador não textual entra na matriz executável de
`packages/tokens/src/tokens.json`, incluindo os estados desabilitados. Texto normal exige `4.5:1`;
foco e limite de controle exigem `3:1`. O piso de texto da captura é `13` px. A matriz é
reavaliada ao alterar primitive, modo, opacidade ou componente. Captura visual não prova foco,
teclado, leitor de tela, foco de modal ou autorização; cada um exige teste apropriado.

---

## 10. Conteúdo, imagens e ícones

### 10.1 Conteúdo de interface

| Contexto | Registro | Exemplo |
|---|---|---|
| Ação | verbo + objeto + escopo quando muda consequência | “Publicar para Minha comunidade” |
| Sucesso | resultado e local, sem celebração excessiva | “Publicado na sua comunidade.” |
| Falha recuperável | fato seguro + ação | “Não foi possível salvar. Tente novamente.” |
| Vazio | estado honesto + por que importa + CTA segura | “Ainda não há eventos nesta cidade.” |
| Pendência | o que aconteceu e o próximo passo real | “Seu pedido está aguardando aprovação.” |
| Consequência | efeito antes de confirmar | “Remover esta pessoa também encerra a participação no grupo.” |

Evite “Oops”, “Oopsie”, “parabéns” automático, gírias de produto genérico, siglas militares não
explicadas e tecnicismo de infraestrutura. Copy de erro nunca menciona Supabase, Postgres, RLS,
HTTP ou motivo interno de elegibilidade.

### 10.2 Fotografia e ilustração

Fotografia é documental, luminosa e cotidiana: pessoas em contexto de comunidade, serviço real,
lugares reconhecíveis sem expor residência, encontro ou objeto útil. Não usar banco de imagens
com aperto de mão corporativo, pose de comando, uniforme como prova de pertencimento, documento,
mapa de endereço ou criança identificável sem autorização específica.

Ilustração é monoline, humana e simples, com 1–2 cores de apoio e área de respiro. Ela explica
vazio, espera e orientação; não é prêmio por interação. Ilustração não substitui título, texto
ou CTA e é sempre decorativa quando a mensagem já está em texto.

### 10.3 Iconografia

Use um único conjunto de ícones por superfície e pesos consistentes. Ícone acompanha rótulo em
ações e estados críticos; pode ficar sozinho apenas quando a ação é universal e recebe nome
acessível. Não usar estrela, medalha, escudo, selo ou check como sinal de status de pessoa.

---

## 11. Qualidade e governança

### 11.1 Rubrica de tela

Toda tela alterada é julgada, no mínimo, nestas dimensões:

| Dimensão | Pergunta de aceite |
|---|---|
| Hierarquia | A pessoa entende tarefa, escopo e ação principal rapidamente? |
| Densidade | A composição serve leitura ou varredura sem parede nem objetos soltos? |
| Estados | Loading, vazio, indisponível, erro, pendência e fim de lista são distintos? |
| Responsividade | A tela recompõe em vez de apenas encolher? |
| Acessibilidade | Foco, teclado, nomes, contraste, reflow, alvos e reduced motion passam? |
| Confiança | Não há dado proibido, autoridade falsa, escopo oculto ou copy enganosa? |
| Sistema | Tokens e componentes são usados sem exceção não documentada? |

O visual loop continua capturando 375/768/1440. Uma auditoria deve dizer quais superfícies,
estados e dados foram exercitados; “sem achados” sem esse recorte não é evidência.

### 11.2 Revisão de design

Uma alteração de interface recebe revisão em três níveis:

1. **Contrato:** respeita produto, ADR, componentes e tokens?
2. **Uso:** feliz, vazio, erro, negação e recuperação fecham um ciclo compreensível?
3. **Execução:** layout, contraste, semântica, teclado, performance e responsividade são reais?

Um revisor não aprova apenas porque a referência é bonita. Deve apontar arquivo/linha ou
captura, severidade, impacto e condição objetiva de correção.

### 11.3 Mudança de sistema

| Tipo de mudança | Requisito |
|---|---|
| Primitive nova ou removida | ADR/RFC curta, matriz de contraste e plano de migração |
| Semantic token novo | descrição, consumidores previstos e fallback |
| Componente novo | contrato completo e exemplo de estados |
| Pattern novo | problema comprovado, alternativas e jornada de ponta a ponta |
| Ajuste visual local | justificativa e auditoria da superfície |
| Experimento | hipótese, variantes, métrica, amostra, prazo e critério de decisão |

Nenhum experimento é promovido pelo gosto de quem implementou. Se não há medida ou autoridade
humana, ele continua identificado como experimento e não se torna regra de sistema.

### 11.4 Métricas de qualidade

- Aderência: proporção de componentes/telas auditados sem token cru nem violação de contrato.
- Compreensão: sucesso sem ajuda em identificar escopo, ação e recuperação.
- Acessibilidade: regressões de teclado, foco, contraste e reflow por release.
- Consistência: quantidade de exceções repetidas para o mesmo componente.
- Confiança: relatos de confusão sobre audiência, verificação ou consequência.

---

## 12. Adoção e decisões abertas

### 12.1 Ordem de adoção

1. **Fundação:** transformar a fonte atual de tokens em primitive → semantic → component,
   mantendo o adaptador permanente de nomes que a folha do HeroUI consome.
2. **Primitivas:** Button, Field, FeedbackAlert, Card, EmptyState, Skeleton, Avatar e shell.
3. **Padrões críticos:** admissão, composer/audiência, feed, descoberta e governança.
4. **Assets:** Public Sans auto-hospedada, wordmark aprovado, iconografia e ilustrações.
5. **Conformidade:** uma auditoria visual e de runtime por superfície; só então código legado
   perde o marcador de transição.

Cada etapa é uma task separada, com prova e auditoria. Não retematizar todo o produto em um
commit grande sem estados e jornadas reais.

### 12.1.1 Inventário de transição obrigatório

| Superfície | Estado atual | Dono de adoção | Prova para remover o marcador |
|---|---|---|---|
| Shell autenticado | tokens gerados importados; adaptador permanente do HeroUI ativo | DS-001 + dono da próxima primitiva | captura 375/768/1440, teclado e reflow |
| Mobile | `nativeTokens` resolve cores para RN | próxima task mobile | build nativo + revisão de contraste e alvo |

Nenhuma dessas linhas diz que a superfície já aderiu ao sistema; ela impede que a fundação seja
confundida com migração concluída.

**Landing, entrada e onboarding saíram deste inventário em 2026-09-02, pelo DS-005.** As três
folhas deixaram de declarar paleta própria: zero valores de cor crus onde havia 68, uma
propriedade local onde havia 34, e 393 referências aos tokens do sistema. A lista de exceção que
isentava esses três caminhos em `tests/scope/design-tokens.test.mjs` foi removida, então eles
passam a ser cobrados pela mesma regra que vale para o resto do produto. A auditoria de
375/768/1440 fechou com captura aprovada e sem nenhum achado de contraste; em `/onboarding` os
achados de alvo e de nome acessível são exatamente os mesmos da captura anterior à migração, o
que mostra que nada foi introduzido. O que resta nessas telas é acessibilidade de tela, que não
pertence à fundação e não se resolve trocando token.

### 12.2 Assuntos que continuam abertos

| Tema | Estado | Como fechar |
|---|---|---|
| Navegação secundária | experimento controlado | validar localização de destinos e recuperação em três larguras |
| Composer | experimento | comparar inline, modal e adaptação por contexto sem mudar escopo |
| Grupos | experimento | avaliar lista, card e híbrido com conteúdo real |
| Eventos | experimento | avaliar agrupamento e RSVP pelo entendimento de data/participação |
| Modo escuro | fora do piloto | não criar token mode ou UI enquanto D31 não mudar |
| Mensagem entre membros | decisão humana de produto | não desenhar como feature implícita |

### 12.3 Regra final

Uma interface excelente é previsível sem ser genérica: a pessoa reconhece onde está, com quem
fala, o que acontecerá e como se recuperar. Se uma escolha visual enfraquece qualquer uma dessas
quatro respostas, ela não pertence ao Bivaque — por mais bonita que pareça.
