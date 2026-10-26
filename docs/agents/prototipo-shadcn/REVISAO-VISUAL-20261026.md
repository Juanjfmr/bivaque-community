# Revisão visual — 26/10/2026

**Veredito do Codex: CORREÇÕES. Não recomendo o aceite visual da onda 1 ainda.**

**Auditoria atual, após APP-008: adoção shadcn PARCIAL; visual ainda CORREÇÕES.**
Codex examinou as imagens, sem transferir o julgamento ao dono ou inferir
fidelidade pelo gate. Primeira recomendação atual: corrigir a base compartilhada
de componentes, incluindo o reuso shadcn, o indicador dos filtros e a variante
das ações principais. V01–V03 tiveram os reparos delimitados no STATUS; os
demais desvios abaixo continuam pendentes. Sem implementação nesta auditoria.

## Auditoria atual — fonte 4f0a59ac, 26/10/2026

O dono pediu explicitamente julgamento visual pelo Codex e verificação da regra
de usar shadcn em vez de reconstruir tudo. O exame teve duas partes independentes:
imagens reais e rastreamento dos componentes consumidos pelo app.

- **152 pares** da galeria `pares-2026-10-26T16-40-39-982Z`, HTML à esquerda:
  38 cenas em 375/1440 e claro/escuro. Todos examinados em **19 pranchas** novas
  `APP-AUDITORIA-VISUAL-4f0a59ac/prancha-*.jpg` em `.visual/coordenacao/`.
  As pranchas derivam dos PNGs preservados, sem mudar os originais.
- Revistas também as **8 imagens de 768 px** de APP-008, cidade/busca/conversa/
  evento nos dois temas. Tablet complementa o exame; não tem 38 pares próprios.
- Ampliações atuais: Busca 375 claro, Comunidade 375 escuro e Início 1440 claro.
  A revisão APP-008 já contém outras ampliações e a conferência de 24 vistas.
- **175 fontes** do app associadas a 4f0a59ac e aos PNGs em
  `APP-008-fontes-integradas.json`; os manifestos originais permanecem intactos.
- Nenhuma tela, dependência ou teste foi alterado nesta auditoria documental.
  Gate e E2E citados no STATUS são provas anteriores da fonte 4f0a59ac;
  não foram repetidos nem usados como aprovação visual.

### A regra shadcn está sendo cumprida?

**Parcialmente. Não aprovo a afirmação de que o app inteiro foi composto a
partir dos componentes/blocos shadcn disponíveis.** Também seria incorreto
dizer que tudo foi feito do zero: há reuso verdadeiro de shadcn e de Radix.

O ADR aceito, seção 1, exige componentes shadcn com código no repositório e
permite Radix/Tailwind próprios para o que a biblioteca não oferece, como a
navegação do Bivaque, Criar e linhas de pergunta. Portanto, ter componentes
de domínio próprios não é, por si só, infração. Importar Radix diretamente
também não comprova que um componente visual shadcn foi reaproveitado.

Há **12 arquivos em `components/ui` e 29 em `components/bivaque`**. Estas são
contagens de arquivos, não percentuais de conformidade ou de produto pronto.
O consumo observado foi:

| Caso | Fonte e consumo | Parecer |
|---|---|---|
| Button | `components/bivaque/botao.tsx:5` usa `ui/button`; casca e telas usam Botao/BotaoDeIcone | Reuso real. A aparência da variante preenchida ainda diverge, ver V15. |
| Input e Textarea | `components/bivaque/campos.tsx:5-13`; Campo usado em Entrar, Contato, Conversa e outras telas | Reuso real. |
| ToggleGroup | `components/bivaque/chips-de-filtro.tsx:5`; usado em Busca, Comunidade e Mercado | Reuso real, mas customização do indicador introduz V13. O arquivo ui/toggle fornece variantes ao ToggleGroup. |
| Badge e Skeleton | `etiqueta.tsx:3`, `esqueleto.tsx:1`, consumidos pelas telas | Reuso real. |
| Select | `campos.tsx:6-12` compõe Selecao; único consumidor JSX encontrado em `src/galeria/TelaGaleria.tsx:163` | Base preparada e exibida na galeria; não contar como adoção nas telas V1 normais. |
| Card, Avatar, Alert e Separator | Arquivos ui existem, mas a busca de imports não encontrou consumidores no app | Presença não comprova reuso. A ausência de uso de um arquivo dispensável não é defeito isolado. |
| Sobreposição/cidade | `components/bivaque/sobreposicao.tsx:3` monta Dialog diretamente de radix-ui | Componente visual próprio, embora Dialog/Sheet existam no shadcn. |
| Menu de linha e confirmação | `menu-de-linha.tsx:3`, `confirmacao.tsx:3` montam DropdownMenu/AlertDialog do Radix | Implementações próprias; consumidores encontrados só na galeria. Não provar entrega das ações V1 por esses exemplos. |
| Paleta | `src/casca/Paleta.tsx:3,200-244`: Dialog Radix, input nativo, setas/Enter, seleção e lista manuais | Recria responsabilidades para as quais há Command/CommandDialog no shadcn. |
| Busca do topo | `src/casca/BarraDoTopo.tsx:154` usa input nativo, embora ui/input já esteja instalado | Reuso inconsistente; APP-008 corrigiu estado/duplicação, mas manteve essa diferença. |
| Cartões e avatar de domínio | `cartao-de-anuncio.tsx:43,122`, `cartao-de-publicacao.tsx:60`, `avatar.tsx:27` usam article/span e classes próprias | Composição própria confirmada. Reavaliar Card/Avatar para a base, preservando semântica e conteúdo do domínio; não substituir mecanicamente todo article/span. |

Os caminhos abreviados da tabela ficam sob `apps/app/`. Seis famílias shadcn
têm consumo confirmado nas telas normais por wrappers: Button, Input, Textarea,
ToggleGroup, Badge e Skeleton. Select é o caso separado da galeria. Nenhum
percentual foi calculado a partir disso.

### S01 — P1 de aderência — componentes equivalentes montados diretamente sobre Radix

Dialog, DropdownMenu e AlertDialog têm componentes shadcn oficiais. A base
atual refaz sua composição visual nos arquivos acima, sem exceção equivalente
documentada no ADR. Radix continua fornecendo comportamento de foco/teclado;
este achado não afirma ausência dessas proteções.

Correção recomendada: os wrappers de domínio compõem as bases shadcn, mantendo
o histórico único, o tratamento de Voltar, tokens, textos e o desenho aprovado.
Não substituir a navegação do Bivaque por um sidebar genérico.

Referências oficiais verificadas:
[Dialog](https://ui.shadcn.com/docs/components/radix/dialog),
[Dropdown Menu](https://ui.shadcn.com/docs/components/radix/dropdown-menu) e
[Alert Dialog](https://ui.shadcn.com/docs/components/radix/alert-dialog).

### S02 — P1 de aderência — paleta manual apesar de existir Command

O estado ativo, filtragem, lista e teclas da paleta são próprios. O shadcn tem
[Command/CommandDialog](https://ui.shadcn.com/docs/components/radix/command),
baseado em cmdk; ele não foi encontrado na base instalada. A existência de um
Dialog acessível não converte a lista manual em um Command shadcn.

Correção recomendada: reaproveitar Command e conservar os destinos e a ligação
ao histórico atual. Qualquer instalação futura segue os pins/regras do plano;
esta auditoria não instalou nada.

### S03 — blocos oficiais de páginas inteiras: adoção não demonstrada

shadcn distingue componentes de [Blocks](https://ui.shadcn.com/blocks), que são
composições prontas de páginas/áreas. Não localizei componentes como LoginForm,
SignupForm, AppSidebar/SidebarProvider ou evidência equivalente de adoção desses
blocos. Entrar, Casca e NavegacaoPrincipal são composições locais. Nomes ausentes
não provam a origem de todo o código: não foi feita comparação histórica com
todos os blocos do catálogo, então não afirmo que zero linhas vieram deles.

O ADR exige componentes shadcn; ele não nomeia um bloco completo obrigatório
para cada tela. Se "usar blocos" significa páginas prontas do catálogo, isso
**não está demonstrado**. Os dados mostram componentes base usados de forma
parcial e grande parte da composição feita localmente.

### Visual: reparos confirmados e pendências

- Confirmados nos frames atuais: geometria compacta da cidade, campo único
  de busca e nome da pessoa no topo da conversa. Isso fecha esses defeitos
  delimitados; não torna as telas completas equivalentes ao HTML.
- V04–V12 continuam visíveis: fotos disponíveis substituídas por placeholders;
  Início sem coluna lateral e carrossel móvel; detalhes sem a composição e
  ações persistentes; conversa sem origem e compositor compacto; filtros e
  comandos ausentes nas listas; grupos, entrada e telas de suporte reduzidos.
- Preservadas as diferenças autorizadas: Mercado na barra e Conversas/cidade
  no topo. Datas de cenários diferentes não foram contadas como defeito.
  Força/OM/selo público históricos não foram tratados como conteúdo a restaurar.

### V13 — P1 — indicador dos filtros sugere duas seleções

No par `busca-375-light-par.png` (também escuro), Tudo está na primeira linha
e Indicações na segunda; o fundo selecionado cobre ambas. A referência tem
chips em faixa horizontal. Fonte: `chips-de-filtro.tsx:43,75-98` posiciona
o indicador por offsetLeft e usa height 100%, enquanto os itens usam flex-wrap.
A altura usada é a do grupo inteiro, sem offsetTop/altura do chip escolhido.

Correção mínima: respeitar a faixa horizontal do HTML e manter o indicador no
chip selecionado; se houver outra composição autorizada, medir sua caixa real.
Não é falha do Radix ToggleGroup: a camada visual acrescentada é que diverge.

### V14 — P1 — perguntas perdem o conteúdo principal no celular

No par `comunidade-375-dark-par.png`, a pergunta vira "Pediatra que atenda pelo…"
e outras linhas ficam semelhantes, enquanto a referência mostra a pergunta
legível em várias linhas, com avatar e agrupamento. Fonte: LinhaDePergunta
delega a LinhaDeLista (`linha-de-pergunta.tsx:40-47`), cujo título tem truncate
obrigatório (`lista.tsx:61-65`), disputando espaço com a etiqueta à direita.

Correção mínima: permitir o título de pergunta em múltiplas linhas e distribuir
os metadados conforme a referência, sem alterar globalmente todos os tipos de
linha. Esta é uma omissão de hierarquia/conteúdo, não mera preferência estética.

### V15 — P2 — ações principais perderam o destaque brasa

Nos pares de Cidade, Evento e Entrar, o preenchimento brasa do HTML foi trocado
por carvão no claro e quase branco no escuro. Fonte HTML: a regra de
md-filled-button em `styles/base.css` usa --bv-brasa; no app,
`components/bivaque/botao.tsx:24-32` mapeia preenchido para a variante default,
e `components/ui/button.tsx:13` usa --primary. Os tokens --primary do app estão
corretamente alinhados ao primário neutro do HTML; não é motivo para trocar
globalmente --primary por brasa. Falta a variante visual específica da ação.

Correção mínima: compor o Button shadcn com a variante brasa nos casos do
protótipo, preservando os demais usos neutros. Usar shadcn não exige conservar
uma aparência neutra diferente da especificação.

### Recomendação e limites da auditoria atual

**Recomendação: corrigir primeiro a base compartilhada e seu reuso shadcn**, com
prova de consumidores reais. Depois tratar composição/fotos e as jornadas por
lotes. O gate verde permanece prova técnica, não aceite do visual ou da regra
de composição. Os achados ampliam APP-001; não criam uma fila paralela.

Alcance: 38 cenas-base em dois temas, mais quatro cenas de tablet; não é prova
de todos os 81 diálogos/editores, 289 ações ou estados de erro. Sem auditoria
completa de leitor de tela, contraste numérico, zoom 200% ou teclado virtual.
Esta rodada produziu observações visuais/código e documentação, não uma nova
execução de gate, E2E ou captura de runtime.

## Base e alcance do parecer inicial — histórico

Atualização APP-008, após autorização "Pode consertar": corrigidas a geometria
de V01, a duplicação de entrada de V02 e a densidade/nome contextual de V03.
Provas e limites atuais no [STATUS](STATUS.md), seção APP-008: gate completo
verde, regressão de 521 casos com 16 skips, 12 focais reforçados, 152 pares
novos e oito imagens complementares em 768 px. Codex conferiu 24 vistas nos
dois temas; instrumentos revisados pelo Qwen. O parecer original abaixo é
histórico e a aprovação visual global continua pendente: grade/recentes de
V02 e V04–V12 não foram resolvidos neste lote.

- Fonte do app: **9af6b5aa**, auditor **b0416a49**, registro **812a4c8d**.
  Árvore limpa no início da revisão. Nenhuma implementação alterada neste parecer.
- Referência: HTML compilado de `prototypes/bivaque-html`, confrontado com o
  [ADR aceito, §3.1](../../decisions/ADR-20261024-front-react-spa.md) e o
  [mapa da onda 1c](APP-003-cobertura.md). Decisões posteriores prevalecem sobre a imagem.
- [Galeria dos pares](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/index.html):
  **38 cenas × 375/1440 × claro/escuro = 152 pares**. HTML à esquerda, app à direita.
- Integridade conferida novamente: **174/174 hashes de fonte**, hash do HTML e
  **152/152 hashes dos PNGs** coincidem com o manifesto; zero erros nele registrados.
  Associação à revisão integrada em
  [APP-SCAN-fontes-integradas.json](../../../.visual/coordenacao/APP-SCAN-fontes-integradas.json).
- Leitura de todos os pares em 19 pranchas e 12 ampliações: cidade/1440/claro,
  início/1440/claro, anúncio/375/escuro, conversa/375/claro, busca/375/claro,
  grupo/375/escuro, entrar/375/claro, evento/375/claro, anúncio/1440/claro,
  negócio/375/claro, você/375/claro e criar/375/escuro.
- Inspeção pontual no navegador confirmou corpo/h2 Noto Sans e h1 Noto Serif;
  o Chrome identificou Noto Sans customizada no h2. Sem achado de fonte ausente.
  Evidência: [APP-VISUAL-fontes.json](../../../.visual/coordenacao/APP-VISUAL-fontes.json).
- O gate verde e os 509 E2E/16 skips são provas técnicas anteriores da mesma
  fonte. Não foram repetidos nesta revisão documental e não aprovam fidelidade.
  Os instrumentos de captura e navegação já receberam revisão de outro modelo.

## Diferenças autorizadas que não são defeitos

- Mercado ocupa a aba que antes era Conversas; Conversas fica no topo com contador.
- Cidade, avisos e conversas no topo móvel seguem o ADR. A recomendação V03
  preserva esses elementos e usa a adaptação de busca permitida em 375 px.
- As três sub-abas do Mercado são previstas pelo ADR; não devem ser removidas
  para imitar a barra antiga do HTML.
- Datas relativas e contagens podem variar entre o relógio histórico da referência
  e o cenário demo portado. Não classifiquei essas diferenças, isoladamente, como bugs.
- Ausência de filiação e selo público não é desvio a restaurar: as fronteiras de
  privacidade atuais prevalecem sobre textos históricos do protótipo.
- O mapa APP-003 adia momento/chegada/saída para a onda 8. A falta desses campos
  impede declarar o fluxo completo equivalente, mas não amplia o escopo da 1c.

## Achados

P1: corrigir antes de aceitar visualmente a área. P2: diferença localizada a
resolver no fechamento correspondente. Os IDs abaixo pertencem ao parecer;
o card canônico continua sendo APP-001.

### V01 — P1 — Cidade vira uma faixa de largura quase total no desktop

- **Caso:** [cidade, 1440 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/cidade-1440-light-par.png).
  A referência mantém um painel compacto; o app estica campo e ações pelo rodapé.
  O mesmo padrão aparece em escuro. Em 375 px a folha permanece reconhecível.
- **Impacto:** a sobreposição deixa de ter a escala e hierarquia da casca de referência.
- **Correção mínima:** limitar a largura e posicionar o painel conforme o HTML
  no breakpoint desktop, mantendo a folha móvel. Conferir o destaque da ação
  Aplicar/Ver esta cidade, hoje diferente do exemplo de referência.
- **Fonte:** [Sobreposicoes.tsx](../../../apps/app/src/casca/Sobreposicoes.tsx), linha 38,
  e `apps/app/components/bivaque/sobreposicao.tsx`, linha 28.
  O seletor de momento continua pendência da onda 8, conforme o mapa vigente.

### V02 — P1 — Busca apresenta dois campos simultâneos

- **Caso:** [busca, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/busca-375-light-par.png).
  Há um campo no topo e outro abaixo do título. O HTML tem uma única entrada.
  A grade “Explorar em Manaus” também desapareceu da apresentação inicial V1.
- **Impacto:** a pessoa encontra duas entradas para a mesma intenção e perde
  os atalhos de descoberta da referência. O painel de sugestões começa mais abaixo.
- **Correção mínima:** eleger uma entrada visível por breakpoint e reutilizar
  seu estado; recuperar a grade no fechamento da tela de busca. Não retirar
  as buscas de outras telas nem enfraquecer os testes de navegação.
- **Fonte:** [Busca.tsx](../../../apps/app/src/telas/Busca.tsx), linha 169,
  e [BarraDoTopo.tsx](../../../apps/app/src/casca/BarraDoTopo.tsx), ramo de busca.

### V03 — P2 — Topo móvel perde o contexto por falta de espaço

- **Caso:** [conversa, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/conversa-375-light-par.png)
  e [evento, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/evento-375-light-par.png).
  O título vira “Conve...”/“Encon...” entre Voltar, Conversas, cidade e busca.
  Na conversa, o topo não apresenta a pessoa/assunto que o HTML usava.
- **Impacto:** o espaço curto é gasto em ação redundante enquanto a identidade
  da tela fica truncada. Não é justificativa para remover Conversas do topo.
- **Correção mínima:** aplicar a adaptação de busca prevista no ADR para 375 px
  e compor o título contextual de conversa, preservando cidade e contador.
- **Fonte:** [BarraDoTopo.tsx](../../../apps/app/src/casca/BarraDoTopo.tsx), linha 53;
  [casca.ts](../../../apps/app/lib/casca.ts), linha 32. Referência contextual em
  `prototypes/bivaque-html/src/shell/navigation.js:78`.

### V04 — P1 — Imagens portadas não são consumidas pelas telas

- **Caso:** [desapegos, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/desapegos-375-light-par.png)
  e [anúncio, 375 escuro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/anuncio-375-dark-par.png).
  Fotos de produtos/negócios viram blocos vazios com ícone. Grupo e negócio
  também perderam suas capas. O efeito se repete nos dois temas e tamanhos.
- **Impacto:** o conteúdo principal deixa de identificar o anúncio ou serviço;
  não é apenas um ajuste de borda ou espaçamento.
- **Correção mínima:** ligar as referências de imagem já portadas aos componentes
  existentes e recuperar as capas das telas consumidoras. Não baixar outro acervo.
- **Fonte:** [Anuncio.tsx](../../../apps/app/src/telas/Anuncio.tsx), linha 91,
  passa `fonte={null}`; [Mercado.tsx](../../../apps/app/src/telas/Mercado.tsx),
  linhas 137 e 169, omite `fonte` no objeto do cartão. A fixture já contém
  `apresentacao.imagem`, por exemplo `cenarios.ts:811`; Capa e assetUrl já resolvem a chave.

### V05 — P1 — Início desktop foi reduzido a uma coluna esticada

- **Caso:** [início, 1440 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/inicio-1440-light-par.png).
  Desaparecem a coluna de grupos, próximo encontro e chegada. Busca, atalhos
  e cartões passam a ocupar toda a largura. Em 375 px os cartões do app são
  empilhados, em vez do carrossel horizontal da referência.
- **Impacto:** a primeira tela perde descoberta contextual e a densidade da
  referência, mesmo depois de se corrigirem as imagens de V04.
- **Correção mínima:** portar a composição responsiva já definida em
  `features/home/desktop.js` e o carrossel móvel, mantendo os atalhos do ADR.
- **Fonte:** [Inicio.tsx](../../../apps/app/src/telas/Inicio.tsx), linhas 30 e 179;
  `prototypes/bivaque-html/src/features/home/desktop.js:19` contém o aside existente.

### V06 — P1 — Detalhes perderam composição e ação persistente

- **Caso:** [anúncio, 1440 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/anuncio-1440-light-par.png):
  a capa ocupa quase toda a primeira dobra, sem a coluna lateral do HTML.
  Em [negócio, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/negocio-375-light-par.png)
  e [evento, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/evento-375-light-par.png),
  falta a ação fixa no rodapé; confirmar presença virou botão no fluxo do conteúdo.
- **Impacto:** restaurar só a foto ainda deixaria o detalhe com proporção errada
  e sem o ponto de ação persistente previsto para contato/presença.
- **Correção mínima:** recuperar colunas no desktop, capa imersiva móvel e usar
  a primitiva existente de ações do detalhe nas telas V1 correspondentes.
- **Fonte:** [Anuncio.tsx](../../../apps/app/src/telas/Anuncio.tsx), linha 87;
  [Evento.tsx](../../../apps/app/src/telas/Evento.tsx), linha 126.
  `AcoesDoDetalhe` é consumida na galeria, sem consumidor em `src/telas` nesta revisão.

### V07 — P1 — Conversa perdeu origem e compositor inferior

- **Caso:** [conversa, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/conversa-375-light-par.png).
  O cartão do anúncio de origem, horários e sugestões rápidas somem. O
  compositor compacto inferior vira textarea e botão no meio da página.
- **Impacto:** a conversa deixa de apresentar o contexto e a organização da
  referência. A captura não prova o comportamento com teclado virtual.
- **Correção mínima:** portar a estrutura visual contextual e a faixa inferior,
  mantendo o envio local já existente; testar teclado/rolagem no fechamento.
- **Fonte:** [Conversa.tsx](../../../apps/app/src/telas/Conversa.tsx), linhas 93 e 150.

### V08 — P1 — Listas do Mercado perderam controles e metadados

- **Caso:** [imóveis, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/imoveis-375-light-par.png)
  e [meus anúncios, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/meus-anuncios-375-light-par.png).
  Não aparecem os filtros/ordenação/modos de visualização do HTML; faltam
  metadados dos imóveis e ações de editar/encerrar dos anúncios próprios.
- **Impacto:** a V1 não é equivalente à lista especificada, ainda que os cartões
  naveguem. As sub-abas novas do Mercado são corretas e devem permanecer.
- **Correção mínima:** restituir os controles do contrato da tela e os dados
  de apresentação existentes, em vez de substituir tudo pelas sub-abas.
- **Fonte:** [Mercado.tsx](../../../apps/app/src/telas/Mercado.tsx), linha 24,
  declara essas omissões; `MeusAnuncios.tsx` e `Salvos.tsx` repetem a simplificação.

### V09 — P1 — Grupo não apresenta pertencimento e composição da referência

- **Caso:** [grupo, 375 escuro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/grupo-375-dark-par.png).
  Além da capa, desaparecem descrição, Participando/Destaques, Convidar,
  Regras do grupo e o compositor na posição mostrada pelo HTML.
- **Impacto:** o grupo parece uma lista genérica de posts; o cabeçalho deixa
  de comunicar as possibilidades de participação. Comunidade/publicação também
  apresentam simplificações de linhas e contexto na matriz abaixo.
- **Correção mínima:** recuperar os blocos e estados visuais no lote de grupos.
  Corrigir ainda `Icone nome="pin"` para a semântica de aviso fixado: o desenho
  atual mostra o PIN numérico, em vez do alfinete do HTML.
- **Fonte:** [Grupo.tsx](../../../apps/app/src/telas/Grupo.tsx), linhas 115–127.

### V10 — P1 — Entrada inicial e apresentação pública foram substituídas

- **Caso:** [entrar, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/entrar-375-light-par.png)
  e [entrada sem estado, 1440 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/entrada-sem-estado-1440-light-par.png).
  Faltam a apresentação pública, marca/progresso, opção Google e o controle
  explícito de aceitação do exemplo; o app começa num formulário simplificado.
- **Impacto:** a entrada não pode ser declarada portada. A ausência de backend
  real não exige substituir a apresentação visual por outra jornada.
- **Correção mínima:** portar os estados visuais do fluxo aprovado de entrada,
  preservando as fronteiras de autenticação e consentimento. Sem decidir novo produto.
- **Fonte:** [Entrar.tsx](../../../apps/app/src/telas/Entrar.tsx), linhas 61–98.
  Esta revisão não prova os estados posteriores nem conformidade do consentimento.

### V11 — P2 — Perfil comprime os indicadores em quatro colunas no celular

- **Caso:** [você, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/voce-375-light-par.png).
  O HTML distribui os indicadores em 2×2; o app usa quatro caixas pequenas numa
  linha. O perfil também troca a lista agrupada por linhas soltas e altera atalhos.
- **Impacto:** muda a hierarquia de leitura e a densidade do perfil em tela estreita.
- **Correção mínima:** recuperar a grade móvel e agrupamentos do HTML no lote
  de perfil. Não restaurar exposição de filiação/selo por fidelidade de screenshot.
- **Fonte:** [Voce.tsx](../../../apps/app/src/telas/Voce.tsx), linha 80.

### V12 — P1 — Algumas páginas são substitutos vazios ou outra composição

- **Caso:** [pedido, 375 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/pedido-375-light-par.png)
  troca o pedido de elétrica e propostas por “Este pedido não está na demonstração”.
  [dono, 1440 claro](../../../.visual/onda-1/pares-2026-10-26T11-41-20-974Z/dono-1440-light-par.png)
  omite visão geral/filas da referência. Ajuda e Contato também mudam organização:
  categorias viram FAQ aberta e o formulário passa de categoria para assunto.
- **Impacto:** são faltas de conteúdo/controle, não aprovação visual pendente
  apenas de ajustes finos. “Com o backend” não representa a tela demo do HTML.
- **Correção mínima:** representar os estados de demonstração da referência
  pelas interfaces previstas no lote, sem exigir integração real para mostrar a tela.
- **Fonte:** [Pedido.tsx](../../../apps/app/src/telas/Pedido.tsx), linha 19;
  [Dono.tsx](../../../apps/app/src/telas/Dono.tsx), linha 106;
  [Contato.tsx](../../../apps/app/src/telas/Contato.tsx), linha 23.

## Registro das 38 cenas

Cada linha foi vista nos quatro pares (375 claro/escuro, 1440 claro/escuro).
Os IDs apontam para o desvio descrito acima; não são uma contagem de funcionalidades.
Diferenças menores em textos, espaçamento e vazios não recebem aprovação por
ausência de um ID próprio nesta tabela.

| Cena | Resultado observado / achados |
|---|---|
| inicio | V04, V05; topo modificado pelo ADR, sem restaurar a navegação antiga |
| comunidade | Linhas, avatares e ação de perguntar diferem; V09 como família de composição |
| conversas | Lista mais simplificada, sem a mesma leitura de novas/origem; V07 |
| conversa | V03, V07 |
| voce | V11 |
| busca | V02 |
| catalogo | V04, V08; alias confrontado ao catálogo HTML |
| desapegos | V04, V08 |
| imoveis | V04, V08 |
| negocios | V04, V08; ausência de controles da lista |
| mercado | V04, V08; suas três sub-abas são autorizadas |
| anuncio | V03, V04, V06 |
| negocio | V03, V04, V06 |
| pergunta | V03; cartão, avatar e distribuição do formulário diferem |
| grupo | V04, V09 |
| publicacao | V03, V09; contexto do grupo/comentários simplificado |
| evento | V03, V06 |
| agenda | Cartões reduzidos e filtros/CTA de criação ausentes na composição V1 |
| salvos | V04, V08; agrupamentos/filtros simplificados |
| meus-anuncios | V04, V08 |
| minhas | Estado vazio e ação principal diferentes do HTML |
| guia | Blocos reconhecíveis; superfícies, linhas e links reconfigurados |
| pedidos | V12; estado demonstrado não apresenta o pedido do HTML |
| pedido | V12 |
| dono | V12 |
| entrar | V10 |
| privacidade | Estrutura textual reconhecível; links, espaçamento e topo diferentes |
| conduta | Estrutura textual reconhecível; links, espaçamento e topo diferentes |
| ocultados | Estado vazio reconhecível, nova ação e cópia; equivalência integral pendente |
| bloqueados | Estado vazio reconhecível, nova ação e cópia; equivalência integral pendente |
| ajuda | V12; categorias substituídas por FAQ |
| contato | V12; categoria substituída por assunto |
| chamados | Estado vazio reconhecível, com ação e cópia diferentes |
| apagar-conta | Aviso e confirmação presentes, mas cards explicativos viram lista |
| indisponivel | Estado e retorno presentes; título, ícone e texto reconfigurados |
| entrada-sem-estado | V10; página pública substituída pelo formulário |
| criar | Sete ações e organização geral presentes; diferença de navegação autorizada |
| cidade | V01; momento continua pendência da onda 8 |

## Encaminhamento e limites

Recomendo **corrigir primeiro V01 e V02, com V03 no mesmo fechamento da casca**.
Depois, V04 e V05 dão o maior ganho visual nas telas consumidoras. Não há
necessidade de reabrir a decisão de navegação, trocar bibliotecas ou redesenhar a marca.

A geometria da sobreposição e a entrada duplicada de busca já impedem meu
parecer favorável à fundação. As demais omissões impedem declarar a V1 completa;
continuam nos lotes consumidores, sem promoção automática das ondas 2–8.
O aceite visual final pertence ao dono.

Não foram medidos nesta revisão: contraste numérico, leitor de tela, teclado
virtual, zoom 200%, orientação horizontal, animações e comparação visual específica
em 768 px. Capturas estáticas não provam essas propriedades. Interações e o gate
anteriores permanecem registrados pelo seu alcance; não houve nova prova de banco,
RLS, CI ou autorização para merge/deploy/push.
