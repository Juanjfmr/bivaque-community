# Auditoria inicial UI/UX — Rodada 01

Data: 2026-10-14. Perfil: `bivaque_ui_ux_especialista`, somente leitura de produção.
Estado da baseline: **FAIL para navegação global**, com propostas locais abaixo.
Nenhuma implementação, preço, regra de acesso ou estrutura de produto foi alterada.

## Autoridade e alcance

Pedido posterior do responsável: concluir a navegação global demonstrativa Material Web;
inventariar sem omissões; implementar Guia, Agenda, Salvos, Meus anúncios, Família,
Avisos, retomar, compartilhar/copiar, informações dos planos e navegação contextual.
Preservar os quatro destinos do HTML, o original congelado e os módulos existentes.
Eventos, Comunidades, Marketplace e Monetização não ganham operações profundas nesta rodada.

Foram consultados o perfil UI/UX, AGENT_RULES, UI_UX do kit, HARNESS, arquitetura,
contrato HTML-000, ROUND_00_1, MODULE_MAP e os fontes reais. Após a auditoria inicial,
o coordenador registrou e validou `docs/agents/tasks/HTML-001.task.yml` antes da
implementação. O card guarda-chuva HTML-000-PROTOTIPO continua sendo o acompanhamento
canônico. A autorização humana já existe.

## Prova obtida nesta auditoria

Baseline HTML servido localmente: SHA256
`3a89428131ea76386ca0966d8dc7964cb0b7a58e398ed350a88148e35682e8c2`.
Chromium local 1234, contextos limpos, 375x812 e 1440x900, redução de movimento,
locale pt-BR e timezone America/Manaus. Não se declara a matriz completa nem dark/768.

`ux-runtime-probes.json` registra 16 sondas, zero pageerrors:

- Em ambos os viewports, clicar Guia, Agenda e Avisos mantém Início; clicar Salvos,
  Meus anúncios e Família mantém Você. Não abriu dialog nem feedback de destino.
- Criar abre e foca o primeiro item. Tab percorre seis itens, depois foca BODY e FAB
  com o menu ainda aberto. Escape fecha e restaura foco no FAB.
- As rotas diretas Guia e Salvos foram capturadas. Imagens `ux-guide-375.png` e
  `ux-saved-375.png` foram inspecionadas: texto e cartões estão legíveis, os atalhos
  permanecem reconhecíveis e não há motivo demonstrado para redesenhar a densidade.

Leitura estática complementa essas sondas. Função/render existente não é jornada testada.
Uma classificação funcional dos outros controles exige a prova final, não esta auditoria.

## Trabalhos prioritários da pessoa

1. Encontrar conteúdo útil, abrir seu detalhe e voltar ao mesmo contexto.
2. Recuperar o que salvou/publicou e acompanhar avisos sem perder seleção ou posição.
3. Usar as ações locais do protótipo sabendo o que foi gravado, copiado ou simulado.

## Propostas locais necessárias ao aceite

### UX01 — P1: ligar entradas existentes ao destino real

Antes: os seis destinos acima são ações visíveis sem resposta. Guia/Agenda têm views;
Salvos/Meus anúncios têm listas; Família tem dialog; Avisos exige uma apresentação local.
Evidência: `features/home/views.js:19–21`, `features/profile/views.js:2–7`,
`features/profile/demo-actions.js:2`, `shell/navigation.js:19–22`, `app/handlers.js`.

Resultado: reutilizar as rotas/listas/dialogs e resolver a intenção de cada botão.
Não adicionar um novo destino principal nem duplicar páginas. `guide-search` já encaminha
à busca e deve continuar aproveitado; a falha da entrada Guia não justifica reescrevê-lo.

Negativas: cidade sem conteúdo, id ausente/removido, ausência de avisos e lista vazia têm
mensagem específica e uma próxima ação concreta. Uma toast genérica não substitui a view.
Foco: entrada de página foca título ou primeiro controle útil; voltar restaura o acionador
conectado ou fallback válido, sem cair em BODY.

### UX02 — P1: Criar precisa concluir cada opção ou declarar sua dependência

Antes: seis opções parecem executáveis; Criar encontro emite `create-event`, sem dispatch.
Outras opções chamam editores/domínios existentes. Menu e controles já têm identidade aprovada.
Evidência: `shell/create-menu.js:5–12`, `features/events/editor.js:1–2`.

Resultado: manter as opções e encaminhar as capacidades locais existentes. Para uma operação
de domínio deliberadamente futura, abrir um estado específico que explique o que falta e
ofereça consulta/retorno; não afirmar que criou/publicou/aprovou um objeto inexistente.
Editor disponível pode ser reutilizado dentro do limite explicitado pelo contrato, sem
inventar CRUD profundo, backend, convites distribuídos ou novas regras.

Negativas: perfil/cidade demo sem permissão, campo inválido, cancelamento e quota de storage.
Foco: menu fecha uma única vez antes do dialog; fechar/cancelar volta ao acionador correto.

### UX03 — P1: corrigir saída de teclado do menu Criar

Antes: Tab sai do menu para BODY/FAB enquanto o backdrop e main inert permanecem ativos.
ArrowUp/Down usam índice que não acompanha deslocamentos por Tab ou foco de ponteiro.
Evidência runtime: `create-menu-tab-sequence`; fonte `shell/create-menu.js:50–60`.

Resultado: adotar uma saída previsível: conter/circular foco enquanto o overlay bloquear a
página, ou fechar o menu ao sair e encaminhar a um alvo válido. Não aceitar menu aberto
com foco perdido no BODY. Sincronizar setas com o item realmente focado; manter Home/End/Escape.

Negativas: primeiro/último item, Shift+Tab, Escape, scrim, back nativo, resize e escolha de
item que abre dialog. Nenhuma opção pode deixar o shell inert após fechar.
Foco: verificar shadow roots e `data-action` do item/acionador, não só `tag != BODY`.

### UX04 — P1: retorno contextual genérico sem regressão em Conversas

Antes: `navigate` reescreve o DOM; `back` e popstate recuperam scroll, mas foco contextual
é tratado especificamente por Mensagens. Filtros/tabs também redesenham controles.
Evidência: `shell/navigation.js:4–13`, `app/handlers.js:12–20`, `shell/bindings.js`.

Resultado: registrar contexto mínimo de origem e acionador para os fluxos globais, preservando
rotas/scroll e evitando histories paralelos. Foco após filtro/tab deve ficar no controle
selecionado; voltar de detalhe deve recuperar a linha/cartão que abriu o recurso.
Conversas conserva o comportamento que já foi corrigido. Respeitar reduzido movimento.

Negativas: reload/deep link sem origem, origem removida, usuário muda cidade, fechamento de
menu/dialog com back, edição suja cancelada. Fallback é um título/controle focável útil.
Não fazer browser.back sair do protótipo a partir de uma rota inicial sem origem interna.

### UX05 — P1: Salvos e Meus anúncios precisam de seleção, vazio e continuidade reais

Antes: chips `saved-filter` e `my-ads-filter` não têm dispatch. Salvos só mostra vazio quando
nenhuma categoria contém objetos: selecionar Negócios tendo apenas anúncios gera uma área
em branco quando a ligação existir. Meus anúncios já tem vazios por Ativos/Encerrados/Rascunhos.
Evidência: `features/profile/views.js:6–7` e ausência de cases em `app/handlers.js`.

Resultado: ligar os filtros; indicar categoria vazia sem apagar a seleção, abrir o item certo,
retomar rascunho existente e oferecer os controles locais já presentes. Não aprofundar regras
de Marketplace nesta rodada. Identificar cidade de um salvo e manter a consulta contextual
ao abrir uma coleção pessoal que possa conter várias cidades; não mudar escopo silenciosamente.

Negativas: coleção totalmente vazia, filtro vazio, rascunho inválido/removido, conteúdo apagado,
falha ao gravar estado. Mensagem correspondente ao filtro, com próximo passo compatível.
Foco: chip selecionado após redraw; cartão/linha correto após retorno do detalhe/editor.

### UX06 — P1: retomar e checklist de chegada/saída devem refletir estado local

Antes: `resume`, `plan`, `plan-go` e `plan-check` são emitidos sem tratamento. Checkbox Material
pode mudar sua aparência por interação nativa sem persistir `state.plan` ou o progresso.
Evidência: `features/home/views.js:7,24`, inicialização de `plan.*.go` em `app/state.js:5–6`.

Resultado: retomar o tipo/id/cidade correto; plano completo usa os passos existentes;
checklist altera o state local via mutate e o total após sucesso; `go` encaminha à busca,
catálogo ou comunidade já existentes. Plano de chegada é distinto de plano comercial.

Negativas: referência removida, último item de outra cidade, passo/destino inexistente,
quota de storage. Rollback reverte checkbox/progresso e mantém a tarefa alcançável.
Foco: item do checklist/acionador persistente, inclusive após atualização do progresso.

### UX07 — P1: Avisos tem lista, resultado e leitura locais, sem prometer entrega

Antes: badge chama `notices` sem destino. Há `state.notices`, textos e `go`, não uma lista
conectada. Preferências de limite emitem `cap`, também sem case.

Resultado: abrir avisos locais da pessoa e encaminhar `go` somente a recurso existente e
compatível. Atualizar estado de leitura/badge apenas quando a operação local tiver sucesso.
Preferências indicam sua condição demo, sem alegar push/rede/resumo realmente entregue.

Negativas: nenhum aviso, destino ausente/removido, cidade incompatível, gravar falha,
contador nos limites. O aviso pode informar indisponibilidade mantendo seu conteúdo.
Foco: item aberto ou título da lista quando ele já não existir; dialog fecha sem empilhar history.

### UX08 — P1: Família é código demo local, nunca convite enviado

Antes: existe `openFamily` com lista, campo e ações `new-invite`, `copy-invite`, `remove-invite`,
mas entrada e operações não são conectadas. O texto já informa códigos locais.
Evidência: `features/profile/demo-actions.js:2`, `features/auth/onboarding.js`, prefs.familyOnly.

Resultado: permitir o ciclo local autorizado de criar, copiar e revogar, mantendo código/nome
sintéticos e explicação de disponibilidade. Não enviar email, mensageria ou link de admissão
real. Convite consumido/revogado informa seu estado e não finge desbloquear nova conta.

Negativas: nome inválido, recurso desativado em Configurações, clipboard negado, quota,
revogação cancelada, código indisponível. Com a preferência desligada, oferecer uma ação
concreta para abrir Configurações; só a toast atual não fecha a recuperação.
Foco: campo inválido, convite recém-criado, acionador Copiar/Revogar após redraw.

### UX09 — P1: compartilhamento e cópia precisam de resultado verdadeiro e recuperação

Antes: views emitem `share`, mas helper existente não é ligado ao dispatch; fallback emite
`copy-share`, também ausente. Web Share/clipboard podem falhar. `copyText` remove textarea
temporário sem restaurar foco, e no fracasso manda selecionar texto que pode não estar visível.
Evidência: `features/messaging/actions.js:81–82`, detalhe de anúncio/negócio/encontro.

Resultado: reutilizar helper para tipo/id validado e link com cidade; identificar sempre que
se trata de publicação local demonstrativa. Sucesso só depois da API/clipboard; AbortError
é cancelamento, não falha nem sucesso. Falha abre campo readonly realmente selecionável.
Copiar usa o mesmo valor visível; a pessoa consegue recuperar manualmente sem toast falsa.

Negativas: Clipboard/Web Share ausentes ou negados, cancelamento, recurso removido, operação
em file:// e link local inacessível em outro dispositivo. Compartilhar produção é dependência
explícita, não um link localhost apresentado como publicação para outras pessoas.
Foco: restaurar acionador após cópia, ou campo visible de recuperação; nunca textarea removido/BODY.

### UX10 — P2: Agenda e informação de planos precisam de fronteiras claras

Agenda já tem lista e detalhe legíveis. Conectar `agenda`/`open-event`, permitir leitura do
encontro e retorno ao item. Criar/editar/confirmar/cancelar são capacidades de Eventos:
registrar quais operações locais existentes entram no contrato e quais ficam futuras.
Nenhuma presença/publicação/cancelamento pode ser afirmada sem estado local verificável.
Vazio, id removido, cidade sem agenda e contexto de leitura têm próximo passo correto.

`plans` já chama `openPlans`, cujo aviso de teste é adequado. Distinguir informação comercial
do checklist pessoal `plan`. Preservar os preços existentes como exemplos, sem criar preço,
checkout, assinatura, comissão ou efeito de destaque real. Se houver ativação de plano demo,
mostrar essa condição e gravar/reverter pelo resultado local; não expandir Monetização.
Cancelar/fechar recupera foco no botão que abriu a informação. Não inserir novos menus globais.

### UX11 — P2: tabs e seleção devem funcionar por teclado sem reestruturar a informação

Indicações/Grupos/Negócios já compõem a comunidade; não renomear/reordenar ou criar um destino
novo. `community-tab` existe e deve conservar a seleção visual/acessível no redraw.
Chips de busca/catálogo também precisam de foco preservado, estado selecionado e vazio por filtro.
Cards de serviços usam chips informativos sem ação: inventário deve distingui-los de botões
com intenção clicável, em vez de declarar todos como handlers ausentes.

Negativas: tab vazia, chip sem resultado, ArrowLeft/Right/Home/End/Enter, troca de cidade e
back após abrir detalhe. Verificar tab ativo, seu painel associado e foco, não somente screenshot.

## Densidade e linguagem: alterações permitidas e decisões separadas

As duas telas mobile inspecionadas mantêm leitura confortável e áreas reconhecíveis.
Não há evidência desta auditoria que autorize reduzir cabeçalhos, retirar cartões ou trocar
o sistema visual. Acabamento deve ser motivado por overflow, colisão, alvo inacessível ou
estado introduzido que deixe controles fora da área útil; registrar captura correspondente.

Necessidades estruturais não assumidas: novos destinos principais, troca dos quatro nomes,
reorganização de Guia/Agenda no shell, novas categorias/preços/regras de admissão. Apresentar
decisão ao responsável se um desses pontos for necessário; ligar as entradas já existentes
é a primeira solução desta rodada e não exige inventar estrutura de produto.

## Priorização dos domínios futuros

1. Eventos: semântica de presença/cancelamento/edição/lotação; nesta rodada, escopo de entrada
   e detalhe com operações locais autorizadas explícitas, sem CRUD aprofundado.
2. Comunidades: aprovação automática apresentada como humana, postagem/grupos e permissões
   próprias. Classificar e registrar; não inventar operação humana realizada.
3. Marketplace: regras completas de anúncios e atendimento além da navegação pessoal existente.
4. Monetização: pagamento, ranking, limites comerciais e entrega de destaque reais ficam fora.
5. Produção incompatível: Supabase, auth/convites reais, push/email, verificação/documentos,
   checkout e publicação externa não entram nesta rodada; nenhum dado real nos testes.

## Aceite UX dirigido para o candidato

Todos os fluxos globais escopados terão entrada, ação, resultado, feedback e recuperação;
controles futuros ficam classificados explicitamente, sem ação morta ou falsa jornada.
Provar 375/768/1440 claro/escuro, clique e teclado, foco dentro de shadow roots, back/history,
cancelamento/edição suja, vazio/filtro vazio, reload/persistência e falha de armazenamento.
Mostrar destinos e IDs reais nos asserts; qualquer status funcional exige execução final.
Não reaproveitar PASS de executor como veredito independente, nem chamar o protótipo completo.
Gate/mobile preexistentes permanecem registrados; esta auditoria não os corrigiu ou aprovou.

## Fechamento da avaliação

As propostas foram aplicadas localmente: entradas ligadas às views, vazios por filtro,
retorno com contexto/foco, contenção do menu, códigos e avisos fictícios, cópia com
recuperação, checklist e redução de movimento. Não houve reorganização dos quatro
destinos nem nova regra comercial. Dependências de Eventos e moderação receberam
explicação com consulta/retorno; não contam como operações concluídas.

O QA executou 198 checkpoints globais (incluindo filtros e setas das abas) e 96 de
Conversas nos seis contextos claro/escuro, 375/768/1440. Revisão independente passou,
incluindo correções de foco, histórico de overlays e checkbox recusado. Capturas e
pareceres estão vinculados ao HTML SHA256 `e6acf9e62140d396b2f9df0e74557ebc1c8a24a67a19d03c1ac2bdb6eadaaf87`.

**Aprovação final BLOCKED:** três protocolos mantiveram diferenças de pixels entre
réplicas dos mesmos bytes congelados. A comparação não ganhou tolerância ou máscaras.
Geometria/estilos/markup visível e origens dos assets coincidem; falta reprodutibilidade
da captura para encerrar o gate visual. Não se declara conformidade completa WCAG,
leitor de tela ou teste em aparelhos físicos. Pendências de domínio continuam no
inventário e em NEXT_DOMAINS.
