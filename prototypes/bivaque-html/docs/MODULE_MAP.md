# Mapa de módulos e ownership — Rodada 00.1

Este mapa descreve os fontes reais do protótipo HTML separado. Não autoriza editar
arquivos fora da atribuição do coordenador e não prova runtime. O manifest registra
48 fragmentos textuais concatenados em quatro blocos; não há módulos ES independentes.
Seu `baselineSha256` continua registrando a extração original, sem substituir o hash
do candidato atual. Nenhum fragmento novo foi necessário na Rodada 00.1.

## Ownership de execução desta rodada

- Arquitetura: `scripts/bivaque-html/build.py`, `scripts/bivaque-html/test_build.py`,
  manifest, este mapa e README. Só esse executor altera a lista/ordem de fragmentos.
- Conversas: `features/messaging/views.js`, `features/messaging/actions.js`,
  `app/handlers.js`, `shell/bindings.js`, `shell/navigation.js`. A autorização específica
  do coordenador cobre a ligação de mensagens nos arquivos compartilhados.
- Frontend/coordenador: correção local de estilos do Início no arquivo atribuído;
  não assume os arquivos de ligação que já têm dono em Conversas.
- Demais fontes: preservados nesta rodada. Revisão e runtime independentes não editam
  produção. O coordenador gera o dist somente após os executores estabilizarem fontes.

Paths sem prefixo nesta seção são relativos a `prototypes/bivaque-html/src/`.

## Inventário dos 48 fragmentos

Os responsáveis abaixo são perfis de referência para delegação futura, não autorização
simultânea de escrita. A numeração representa a ordem real do manifest dentro dos blocos.
Cada path aparece uma vez. Arquitetura mantém a construção; cada domínio mantém as ações
e views atribuídas; Frontend mantém o shell quando não houver atribuição específica.

| Ordem/bloco | Fonte | Perfil de referência | Responsabilidade e dependência |
| --- | --- | --- | --- |
| 01/CSS | `src/styles/fonts.css` | Frontend premium | Fontes inline congeladas |
| 02/CSS | `src/styles/base.css` | Frontend premium | Layout, tokens iniciais e media queries |
| 03/CSS | `src/styles/create-menu.css` | Frontend premium | FAB e menu Criar |
| 04/CSS | `src/styles/palette.css` | Frontend premium | Tokens claro/escuro |
| 05/CSS | `src/styles/navigation.css` | Frontend premium | Navegação mobile e detalhes |
| 06/CSS | `src/styles/overlays.css` | Frontend premium | Sheets/dialogs/drawer demo |
| 07/CSS | `src/styles/groups.css` | Frontend premium | Aparência dos grupos |
| 08/Vendor | `src/vendor/material-web-2.5.0.js` | Arquitetura | Bundle oficial e licenças; preservar |
| 09/Dados | `src/data/demo/material-version.js` | Arquitetura | Versão Material global |
| 10/Dados | `src/data/demo/source.js` | Arquitetura | `SOURCE`, fixtures sintéticas globais |
| 11/Dados | `src/data/demo/assets.js` | Arquitetura | `ASSETS`, imagens inline globais |
| 12/App | `src/app/open.js` | Arquitetura | Comentário, abertura do IIFE e strict mode |
| 13/App | `src/utilities/format.js` | Arquitetura | Seletores, escaping, datas, ids e apresentação |
| 14/App | `src/data/demo/model.js` | Arquitetura | Chave de storage e constantes do modelo demo |
| 15/App | `src/features/groups/presets.js` | Comunidades/grupos | Templates/interesses/notificações de grupo |
| 16/App | `src/app/state.js` | Arquitetura | Inicialização, schema 2, `state`, `mutate`, seletores e permissões demo |
| 17/App | `src/shell/primitives.js` | Frontend premium | HTML compartilhado, imagens e snackbar |
| 18/App | `src/shell/navigation.js` | Frontend premium | Router, history, tema, shell e dispatch de render |
| 19/App | `src/features/home/views.js` | Início/busca/descoberta | Início e plano de chegada/saída |
| 20/App | `src/features/listings/catalog.js` | Desapegos/mercado | Filtros compartilhados e catálogo de anúncios/imóveis |
| 21/App | `src/features/businesses/catalog.js` | Negócios/serviços | Catálogo de negócios e publicidade identificada |
| 22/App | `src/features/search/views.js` | Início/busca/descoberta | Busca transversal e sinônimos demo |
| 23/App | `src/features/community/views.js` | Memória/indicações | Tabs da comunidade e entrada de grupos/negócios |
| 24/App | `src/features/listings/detail.js` | Desapegos/mercado | Anúncio/imóvel e helper `unavailable` compartilhado |
| 25/App | `src/features/businesses/detail.js` | Negócios/serviços | Negócio, indicadores demo e contatos |
| 26/App | `src/features/community/question.js` | Memória/indicações | Pergunta, respostas e origem da indicação |
| 27/App | `src/features/groups/views.js` | Comunidades/grupos | Fixtures de grupos/turmas, seletores e views |
| 28/App | `src/features/groups/editors.js` | Comunidades/grupos | Criação de grupo/post, gestão e interesses |
| 29/App | `src/features/groups/handlers.js` | Comunidades/grupos | `groupAction`, dispatch de domínio existente |
| 30/App | `src/features/events/views.js` | Encontros/eventos | Agenda e detalhe de encontro |
| 31/App | `src/features/profile/views.js` | Perfil/família/movimentação | Perfil, salvos, próprios anúncios e perguntas |
| 32/App | `src/features/messaging/views.js` | Conversas/notificações | Lista, títulos/contexto e histórico de conversa |
| 33/App | `src/features/transfers/guide.js` | Perfil/família/movimentação | Guia demonstrativo de chegada |
| 34/App | `src/shell/dialogs.js` | Frontend premium | Dialog/confirm, history e sheet drag |
| 35/App | `src/shell/create-menu.js` | Frontend premium | Menu Criar, keyboard e posicionamento |
| 36/App | `src/features/profile/settings.js` | Perfil/família/movimentação | Cidade, configurações e controles de protótipo |
| 37/App | `src/features/listings/editor.js` | Desapegos/mercado | Fotos, edição, validação e rascunho de anúncio/imóvel |
| 38/App | `src/features/events/editor.js` | Encontros/eventos | Edição e envio fictício de encontro |
| 39/App | `src/features/businesses/editor.js` | Negócios/serviços | Edição e persistência local do negócio |
| 40/App | `src/features/community/editor.js` | Memória/indicações | Pedir indicação e perguntas similares |
| 41/App | `src/features/businesses/indication.js` | Negócios/serviços | Indicação local de negócio |
| 42/App | `src/features/profile/demo-actions.js` | Perfil/família/movimentação | Planos, convites familiares e denúncia; coordenar Monetização/Segurança |
| 43/App | `src/features/auth/onboarding.js` | Acesso/onboarding | Cadastro e verificação fictícios |
| 44/App | `src/features/messaging/actions.js` | Conversas/notificações | Contato/conversa, dispatch de mensagens; contém share/copy e simulação de respostas compartilhados |
| 45/App | `src/shell/bindings.js` | Frontend premium | Bindings de tela/dialog e links externos |
| 46/App | `src/motion/gestures.js` | Motion/microinterações | Swipe, long press e retorno pela borda |
| 47/App | `src/app/handlers.js` | Frontend premium | Dispatch central `perform`, ligação dos domínios |
| 48/App | `src/app/start.js` | Arquitetura | Listener delegado, bootstrap, `window.Bivaque` e fechamento do IIFE |

`src/shell/template.html` é o DOM com quatro placeholders; não é fragmento inline.
`src/manifest.json` é o contrato de ordem do build; também não é fragmento.
Rotas/eventos são strings da aplicação e não imports. Helpers como `filterChips`,
`unavailable`, `share`, `copyText` e `simulateAnswer` estão fisicamente em domínios,
mas possuem consumidores externos. Antes de alterá-los, consultar os callers reais.

## Registro, estado e interfaces compartilhadas

O registro real tem duas partes: `render()` em `shell/navigation.js` mapeia nomes de
rota para funções, enquanto `perform()` em `app/handlers.js` recebe `data-action` /
`data-value` e encaminha ações. O manifest apenas monta blocos: não é um registro de
rotas. Chamadas diretas a funções declaradas depois são válidas por function hoisting;
constantes inicializadas depois dependem de o bootstrap ocorrer somente em `app/start.js`.
Não mover fragmentos, criar outro IIFE nem repetir o listener delegado para adicionar ação.

Interface acordada para Conversas nesta rodada:

```text
perform(action, value, el)
  -> await messagingAction(action, value, el) -> Promise<boolean>
       true: ação de mensagens reconhecida, inclusive recusa com feedback
       false: ação desconhecida; continuar groupAction/switch existente

bindScreen()
  -> bindMessagingScreen() (uma ligação por render)
```

`messagingAction` não recebe nem retorna um novo state global. Só manipula as entidades
demonstrativas pelas interfaces já existentes. A ligação precede `groupAction` no dispatch
central; o domínio não registra um segundo click handler de documento. Bindings de tela
podem cuidar do campo/foco/teclado sem duplicar envio ou navegação. Notificações reais,
push, contatos externos e envio de mensagens de produção não entram nesta rodada.

`state` e `route` continuam compartilhados dentro do único IIFE. `SOURCE` e `ASSETS`
existem no bloco global anterior e alimentam `initial()`/helpers. Persistência continua
em `localStorage` com chave `bivaque-material-web-v3`, schema 2, no origin do servidor
local. Fixture carregada não é backend nem autorização real. Contextos de comparação
devem isolar storage para não confundir o estado da referência com o candidato.

`mutate(fn, {redraw=true})` fotografa o state em JSON, executa a mudança e tenta gravar.
Em falha, substitui `state` pelo snapshot e retorna `false` com feedback; em sucesso,
retorna `true` e redesenha quando solicitado. Uma referência de entidade capturada antes
da falha pode ficar obsoleta porque o rollback substitui o objeto: consultar novamente
por id antes de operação posterior. A ação de mensagem só limpa o texto após sucesso;
falha de gravação precisa mantê-lo no campo. Fluxos assíncronos não podem mutar o state
fora de `mutate` após o snapshot com a promessa de persistência futura.

Identificação local de entidade: `threadById(id)` consulta o state; `accessibleRecord`
confere a cidade selecionada; `canPost()` aplica leitura de outra cidade e verificação
demo. Essas verificações não substituem autorização de servidor. Conteúdo inserido deve
ser escapado por `esc`, mantendo a indicação de modo teste e dados sintéticos.

## Decisão estrutural e provas

O defeito demonstrado era a ausência de handlers de entrada/envio, e não ausência de
um container de dependências. A correção mínima usa o dispatch de domínio acordado,
o contrato de bindings e o mecanismo de persistência existentes. Não introduzir
`dependencias.json`, cópia de state ou registry paralelo sem uma necessidade nova comprovada.
A prova de interações e persistência pertence ao verificador da rodada.

O builder mantém output único, bloqueia caminhos que escapam/redirects de filesystem,
template/manifest como fragmentos, duplicações, fontes ausentes e placeholders incorretos.
A escrita usa substituição atômica e não trunca um arquivo preexistente com hardlink.

- `build.py --check`: continua exigindo igualdade byte a byte do candidato e dist com
  a referência original. Diferenças autorizadas nesta rodada continuam causando FAIL.
- `build.py --check-current`: confere hash original, sintaxe completa, duas leituras /
  montagens iguais e dist atual, informando se o candidato difere do original.
- `test_build.py`: probes negativos em memória, sem tocar fonte/reference/dist; testa
  restrições de paths, redirects simulados, fontes ausentes, drift e semântica dos checks.

Essas provas determinísticas não aprovam aparência, funcionamento, privacidade ou o
contrato HTML-000. Revisão e prova de navegador continuam separadas do executor.
