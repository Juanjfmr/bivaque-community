# Especificação funcional e execução — reconstrução completa do Bivaque web

> **Cadência revista após análise da execução — 08/09/2026:** seguir a seção 0 do [processo](../../design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md). O catálogo de rotas e funcionamento permanece; lotes pequenos, dependências reais e provas por lote substituem burocracia por tela. Pendências técnicas e externas bloqueiam seus requisitos e a conclusão total, não a implementação independente.

> Revisão: 08/09/2026. Escopo solicitado pelo responsável: **web com todas as rotas desta especificação ativas e funcionando**. Esta revisão substitui integralmente o plano anterior de apresentação sem persistência. É especificação de trabalho autorizado, não declaração de funcionalidades entregues nem aprovação de contratos técnicos R3 ainda pendentes.

## 1. Resultado exigido e autoridade

Entregar o aplicativo web conectado: uma pessoa entra, confirma o acesso, escolhe seu contexto, participa, encontra informação, conversa sobre um pedido/evento/anúncio, recebe retorno e administra sua conta. Prestadores e operadores conseguem executar a outra ponta desses ciclos. Dados sobrevivem ao recarregamento e são vistos apenas por quem tem permissão.

**Criar páginas, preencher o menu ou mostrar sucesso local não conclui a reconstrução.** Uma tela sem integração necessária permanece incompleta. A expressão “UI pronta; backend pendente” descreve progresso parcial e nunca satisfaz o gate do fluxo ou da entrega web.

Autoridades, nesta ordem:

1. Instruções posteriores do responsável, incluindo este pedido de reconstrução funcional **somente web**.
2. [Processo de construção](../../design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md), [correções do responsável](../../design/visual-guide-2026-09-06/DECISOES-2026-09-07.md) e decisões posteriores de [login com senha](../../decisions/ADR-20260907-login-com-senha.md) e [aceite no cadastro](../../decisions/ADR-20260907-consentimento-no-cadastro.md).
3. Esta especificação para funcionamento, rotas, dependências e gates web.
4. [Manifesto](../../design/visual-guide-2026-09-06/manifest.json), suas `reviewNotes`, [galeria](../../design/visual-guide-2026-09-06/index.html) e [instruções do guia](../../design/visual-guide-2026-09-06/AGENTS.md) para aparência. As 31 pranchas web representam 53 telas/estados; não são 53 URLs obrigatórias.
5. Documentação histórica, apenas onde compatível. A ordem de ondas antiga e a proibição genérica de afiliação declarada não restauram decisões de produto superadas.

O mobile não é uma dependência de conclusão desta entrega: pode haver **WEB CONCLUÍDO** e **MOBILE NÃO AVALIADO**. Preservar contratos compartilhados compatíveis; mudanças de backend exigem testes de regressão dos consumidores existentes, sem reconstruir as telas nativas nesta tarefa.

### O que muda em relação ao plano substituído

- Backend, persistência, notificações, processamento e operação necessários às telas entram no escopo de implementação, com seus contratos e permissões. Não são dívida opcional ao fim.
- Identidade digital usa **um único arquivo completo**, inclusive na substituição após erro. Não pedir frente/verso nem fotografia do documento digital.
- Login principal é **e-mail e senha**; Google permanece. A prancha 37 orienta feedback de confirmação, não autoriza inventar OTP ou recolocar magic link no login.
- Aceite versionado integra cadastro. Limpar cookie não deve interromper quem já aceitou no servidor.
- Operação de admissão acompanha acesso; operação de moderação acompanha publicação. Não ficam escondidas num último grupo genérico.
- O executor pode ser Qwen ou outro modelo escolhido pelo responsável. Não fixar provedor, saldo, flags de CLI, branch ou identidade do revisor como regra de produto.
- Não declarar CI indisponível por um retrato de agosto: houve execução externa real no PR #55 em setembro. Consultar a execução e o SHA atuais a cada entrega; revisão automática com erro não é aprovação.

## 2. Ponto de partida verificado e como reconciliar

Leitura estática de 08/09/2026 na árvore local a partir de `6da383983b2b2938a45ec90acef818153fbfad00`, com alterações de outras sessões em andamento. Não foi feita auditoria de runtime para escrever esta especificação. Arquivo existente indica ponto de reaproveitamento, não fluxo concluído. Reconciliar o SHA e o diff antes de executar cada contrato; não apagar trabalho concorrente.

| Área | Evidência local | Consequência para implementação |
|---|---|---|
| Entrada | `apps/web/app/(preauth)/login`, `signup`, `recuperar-senha`, `nova-senha`; ADRs de senha e aceite | Reutilizar o mecanismo autorizado. Revalidar confirmação, recuperação, Google e retomada real. |
| Início/Explorar | `(shell)/inicio/page.tsx` e `explorar/page.tsx` ainda contêm “Conteúdo em construção” na leitura | São estruturas iniciais, não funcionalidades prontas. Conectar consultas e CTAs do catálogo abaixo. |
| Sessão/roteamento | `apps/web/proxy.ts`, layouts dos shells, `lib/security` | Revisar fronteiras por segmento, autorização em cada operação e novos caminhos de onboarding; não confiar somente no proxy. |
| Social | `(shell)/community`, `communities`, `groups`; `feed_posts` e componentes de publicação | Reaproveitar feed e domínio, acrescentar detalhe endereçável e público de cidade conforme contrato. |
| Admissão | `onboarding/document-actions.ts`, `/api/onboarding`, `/api/onboarding/status`, `(admin)/admissions` | Há upload e decisão manual; isso não comprova reconhecimento por IA conectado. Fechar o processamento e a reconciliação. |
| Serviços | `(provider)/prestador/actions.ts`, `lib/providers/showcase.ts`, `(shell)/prestadores/[id]` | Ficha/catálogo têm ações existentes. Comprovar pedido estruturado, estados e resposta entre contas; criar o que faltar. |
| Conversas | `(shell)/messages/page.tsx`, `dm_conversations`, `dm_messages`, `dm_blocks` | Adaptar conversas contextuais e autorização sem liberar mensagens arbitrárias por causa de um novo botão. |
| Guia/eventos/perfil | `(shell)/guide`, `events`, `profile` e respectivas ações | Conectar novos detalhes/edição/retorno; não reconstruir tabelas comprovadas só para alinhar nomes. |
| Mercado/Moradia | Rotas dedicadas não localizadas no inventário desta leitura | Planejar ciclo de dados, imagens, filtros, anúncio e interesse; não representar como simples reskin. |
| Salvos | `(shell)/salvos` presente como alteração não rastreada de outra sessão | Inspecionar e integrar o trabalho existente, sem substituí-lo cegamente. |

[PRODUCT_STATUS.md](../../PRODUCT_STATUS.md) contém evidências históricas úteis, mas não prova esta nova versão. O [quadro](../../../tools/backend-kanban/BOARD.md) é o único acompanhamento de execução. IDs `Wxx` e `Rxx` abaixo identificam requisitos e dependências, não um segundo quadro com estados.

## 3. Regras comuns de navegação, estado e permissão

### 3.1 Shells e público

- **Público:** landing, entrar, cadastro, recuperação e documentos legais. Sem feed privado, lista de membros ou indicador público de verificação.
- **Pré-admissão:** sessão autenticada, mas elegibilidade/contexto ainda não concluídos. Só passos pertinentes de cadastro, situação e saída. Não mostrar navegação funcional de membro.
- **Membro:** Início, Explorar, Comunidades e Perfil. Entradas explícitas em Explorar para Guia, Serviços, Mercado, Moradia e Eventos. Salvos, Notificações, conversas e configurações têm destino funcional.
- **Prestador:** Meu negócio, Pedidos, Minha ficha, Catálogo, Área de atendimento e Conta. Não exigir que um prestador civil passe pelo funil de membro para operar sua ficha autorizada.
- **Operação:** admissões/moderação/curadoria e controles comunitários segundo papel real. Não basta esconder o link. Cada loader, action, API e arquivo exige autorização do servidor.

Cidade de exploração é filtro, não concessão de acesso. O catálogo nacional pode mostrar dados de descoberta autorizados em outra cidade; publicação em “Toda a cidade” exige a permissão de escrita daquela cidade retornada pelo servidor. Usar vínculos/localidades existentes como ponto de partida e reconciliar o contrato de escrita em W03. A pessoa não ganha participação privada ao alterar `locality` na URL.

### 3.2 Contrato de rota

- Manter URLs existentes onde úteis; rótulos da interface são em português. Não renomear todo o produto apenas para uniformizar o idioma dos paths.
- `[id]`, `[userId]` e `[token]` são segmentos dinâmicos, nunca strings literais nos links. IDs vêm da resposta autorizada. Validar formato no servidor e tratar inexistente/sem acesso sem revelar existência privada.
- Pesquisa usa parâmetros de URL: `q`, `categoria`, `locality`, `status`, `ordem` e paginação por cursor. Usar somente os aplicáveis a cada tela. Adaptar aliases antigos na borda; não criar dois significados para o mesmo parâmetro.
- Filtros, aba e retorno sobrevivem a atualizar, voltar/avançar e abrir link em nova aba. Requisições antigas não sobrescrevem a cidade/busca mais recente. Contagem e paginação usam os mesmos filtros e autorização da lista.
- Todo detalhe possui URL estável, mesmo quando aberto como painel. Modal de confirmação não precisa de URL própria; detalhe/conversa recuperável precisa. Abrir direto a URL deve reconstruir o estado.
- Uma única normalização de destino pós-login, aceitando apenas rotas internas permitidas; reconciliar `next` e `redirect` existentes, sem redirect aberto. Retomar o destino após completar gates, não repetir o cadastro.
- Não fazer API privada cair em HTML de login: devolver erro estruturado. Páginas humanas podem redirecionar ou mostrar estado de recuperação.

### 3.3 Estados obrigatórios em todas as rotas do catálogo

Cada rota implementa os estados aplicáveis abaixo; a evidência declara explicitamente os não aplicáveis:

1. Carregamento com dimensões estáveis, sem conteúdo de conta anterior.
2. Sucesso com dados persistidos e ações habilitadas conforme capacidades reais.
3. Vazio verdadeiro, diferente de erro, com ação útil. Sem conteúdo fabricado para preencher a tela.
4. Falha recuperável com tentativa novamente; preservar texto não sensível quando seguro.
5. Sessão expirada: reautenticar e retornar à intenção sem executar mutação silenciosa.
6. Sem acesso/inexistente/removido: não vazar título, autor, anexo, contagem ou motivo interno.
7. Envio em andamento: impedir duplicação; reconciliação após timeout de resultado incerto.
8. Conflito: objeto editado, cancelado ou permissão revogada durante o formulário. Recarregar situação sem perder desnecessariamente o texto.

Rascunhos de conteúdo não são autorização para guardar senha, CPF, tokens, documento de identidade ou resultados da consulta no navegador. Logout/troca de conta limpa cache privado e assinaturas. Mensagens de sucesso só depois de confirmação real; atualização otimista tem reversão.

## 4. Catálogo funcional de telas e rotas

**Todos os itens são obrigatórios para o fechamento web**, inclusive rotas auxiliares sem prancha exclusiva. `E` = rota encontrada na árvore lida; `N` = criar; `A` = adaptar/alias. `E` não significa pronto. Estados compartilhados da §3.3 e gates da §8 aplicam-se a cada linha. As pranchas referidas por número são mapeadas integralmente na §5.

### 4.1 Entrada, confirmação e admissão — W01

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| R01 `/` (E) | Landing para visitante, CTAs Entrar/Criar conta e documentos legais; sessão já válida resolve destino por estado real. | Visitante não recebe shell privado; membro chega a `/inicio`, prestador a `/prestador`, cadastro incompleto ao passo correto. Nunca usar cookie de consentimento como única verdade. |
| R02 `/login` (E), prancha 36 | E-mail, senha, mostrar/ocultar senha, Entrar, Google, Esqueci minha senha e Criar conta. Submeter ao Auth existente. | Mensagem única “E-mail ou senha incorretos”; rate limit e falha de rede distinguíveis sem enumeração. Sucesso persiste sessão e resolve destino. Refresh não desconecta. |
| R03 `/signup` (E), 36 | Nome de apresentação, e-mail, senha, aceite explícito com links legais e Google segundo contrato. | Criar conta e registrar versões aceitas no servidor; se falta confirmação ir a R04. Falha de registro do aceite não deve virar cadastro aparentemente completo. Não deixar o usuário sem recuperação de cadastro parcial. |
| R04 `/auth/confirmar-email` (N), 37 | Informar que confirmação foi enviada, reenvio com limite do servidor, corrigir e-mail/retornar ao cadastro de forma coerente. | Usar o mecanismo de confirmação realmente configurado. Esta tela não recebe código fictício: login continua por senha. Link válido leva ao callback; expirado/usado permite solicitar outro sem criar conta duplicada. Não expor endereço em query/log. |
| R05 `/auth/callback` (E, handler) | Trocar código/token autorizado de confirmação ou Google por sessão; reconhecer recuperação de senha. | Validar destino interno, preservar cookies da sessão, resolver cadastro/aceite faltante; erro vai a R06. Nunca renderizar sucesso antes de completar a troca. |
| R06 `/auth/callback-error` (E) | Explicar falha de autenticação sem detalhes sensíveis; voltar a entrar ou reenviar confirmação quando cabível. | Caminho de recuperação funciona também sem sessão. Link expirado não produz loop com onboarding. |
| R07 `/recuperar-senha` (E) | Solicitar e-mail para recuperar acesso. Feedback neutro e limite de reenvio. | E-mail real chega e o link abre R08 via callback válido. Não confirmar se endereço tem conta; falha de provedor não vira “enviado”. |
| R08 `/nova-senha` (E) | Sessão específica de recuperação, senha nova e confirmação, política existente do Auth. | Salvar no provedor, invalidar material de recuperação e devolver ao login/destino autorizado. Link inválido/expirado oferece R07. Não exigir elegibilidade para redefinir senha. |
| R09 `/privacidade`, `/codigo-de-conduta` (E) | Leitura pública dos documentos aprovados, títulos e versão; retorno ao cadastro preserva campos não sensíveis. | Conteúdo real e acessível, não copy da imagem. Abrir sem autenticação; links do aceite apontam para a versão usada no registro. |
| R10 `/consent` (E, exceção) | Recuperar registro de aceite ausente quando contrato exigir; nunca ser passagem normal a cada login. | Conta com aceite persistido não volta aqui por cookie limpo. Aceite faltante no primeiro cadastro/Google tem resolução explícita antes de ação dependente, sem fingir registro. |
| R11 `/onboarding` (E), 38 | Selecionar “Sou militar das Forças Armadas”, veterano, pensionista ou caminho de convite familiar. Explicar consulta e enviar CPF válido ao servidor. | CPF principal rápido; botão desabilitado vazio; máscara e dígitos validados no servidor. Indisponibilidade não é rejeição: oferecer documento/status. Não armazenar CPF cru, ecoar payload ou inferir OM. |
| R12 `/onboarding/documento` (N), 69 | Escolher **um arquivo completo da identidade militar digital**, validar formato/tamanho do contrato e enviar ao armazenamento privado. | Upload, submissão e job de processamento ligados por ID opaco. Só navegar a status após aceite da submissão. Upload parcial limpa órfão; arquivo ilegível permite substituir integralmente. Não exigir frente/verso. |
| R13 `/onboarding/status` (E), 38/69 | Ler estado real: aguardando processamento, em análise, precisa de outro arquivo, aprovado, não liberado ou falha temporária. Atualizar situação e sair. | Refresh e nova sessão retomam o mesmo pedido; aprovação leva a contexto. Reenvio cria versão controlada e invalida resultado tardio do arquivo anterior. Recusa mostra orientação permitida, nunca motivo técnico privado. |
| R14 `/onboarding/locality` (E), 39 | Busca manual por UF/cidade; selecionar localidade e confirmar. Localização do dispositivo é opcional e solicitada no uso. | Persistir contexto conforme elegibilidade, sem conceder comunidade privada. Tratar cidade inexistente, falha do catálogo, troca durante busca e retorno de etapa concluída. |
| R15 `/onboarding/perfil` (N), 39 | Nome, foto/bio/interesses opcionais; Força Armada (Marinha/Exército/Aeronáutica) e OM opcionais, controles individuais Exibir no perfil desligados inicialmente. Pular por enquanto. | Salvar dados e visibilidade realmente, inclusive valores vazios. Pular conclui a etapa sem inventar afiliação. Remoção/ocultação posterior em C02. Falha preserva campos não sensíveis sem alegar salvamento. |
| R16 `/onboarding/welcome` (E), 39 | Primeira ação útil: conhecer comunidades, explorar Guia/Serviços/Mercado ou ir ao início. | Não exigir comunidade aprovada para completar contexto. Se não há comunidade, `/inicio` tem estado útil de chegada; admissão ainda pendente não chega aqui. |
| R17 `/familia/convites/[token]` (N; adaptar mecanismo existente) | Aceitar convite familiar após conta própria/entrada. Validar token, destinatário e validade no servidor. | Aceite idempotente cria vínculo permitido, mantém conta independente e não aprova comunidade. Expirado/revogado/usado por outra conta oferece orientação sem expor família. Emissor gera/revoga em C07. |

**Gate W01:** cadastrar conta → confirmar e-mail → CPF ou arquivo único → decisão real → contexto → entrada; recuperar senha por e-mail recebido; aceitar convite com segunda conta; testar pendente, recusado, arquivo ilegível, callback inválido e refresh. A operação O01–O02 e a emissão de convite C07 entram nesta etapa. Reconhecimento por IA não pode ser substituído silenciosamente por aprovação manual e declarado entregue.

### 4.2 Contexto, início e descoberta — W02/W03

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| R18 `/inicio` (E, estrutura inicial), 01 | Resumo útil da comunidade/contexto ativo, publicações, respostas acompanhadas e eventos pertinentes. Composer abre R24; cada card abre seu detalhe. | Paginação e contagens reais. Sem comunidade aprovada, mostrar descoberta e conteúdo de cidade autorizado; não mostrar um feed fictício ou tela “em construção”. Notificação abre o item exato. |
| R19 `/explorar` (E, estrutura inicial), 61 | Busca e entradas explícitas de Guia, Serviços, Mercado, Moradia e Eventos. Seletor de cidade independente das comunidades. | Consulta/pesquisa filtrada e links preservam cidade. Nenhum tile usa `href="#"`; zero resultados permite limpar filtros/trocar cidade. |
| R20 `/explorar/busca` (N), 61 | Resultados agrupados por tipos já implementados; query, filtros e paginação. | Mostrar somente resultados permitidos, inclusive snippets e contagens. Busca textual/indexada simples pode fechar o contrato; IA/ranking sofisticado não é pré-requisito. Módulo ainda não integrado não aparece como resultado funcional. |
| R21 `/localidade` (E) | Contexto atual e, onde já autorizado, transferência declarada/origem/destino. Diferenciar explorar destino de declarar mudança. | Reutilizar domínio de transferência e estados de leitura/escrita, sem resetar vínculos ao explorar. Exibir restrição de escrita antes da tentativa e reforçar no servidor. |

R18 fecha junto do ciclo social W03, não como uma página de demonstração em W00. O shell inicial pode usar rotas atuais funcionais enquanto novos módulos são construídos; na entrega final todos os destinos abaixo estão ativos.

### 4.3 Comunidades, grupos e publicação — W03

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| R22 `/communities` (E), 42 | Abas Minhas/Descobrir, busca/cidade, comunidades aprovadas e pedidos enviados. | Separar participação ativa de solicitação pendente. Descoberta não mostra lista/avatares/contagem privada de membros. Clicar abre R23 mantendo filtros. |
| R23 `/communities/[id]` (E), 42/43 | Visitante autorizado vê apresentação e “Por que você quer participar? (opcional)” antes de Solicitar; pendente vê situação/resumo próprio; membro vê conteúdo e grupos. | Pedido vazio é válido e idempotente. Motivo só solicitante/responsáveis. Aprovação pelo gestor atualiza acesso; cancelamento/negação não concede membership. Decisão concorrente recarrega situação. |
| R24 `/publicacoes/nova` (N), 45 | Criar pergunta/publicação com título/conteúdo/anexo conforme tipo suportado. Selecionar “Toda a cidade · cidade” ou comunidade/grupo autorizado; prévia repete público. | Confirmar destino antes de enviar; gravar autor e escopo no servidor. Sucesso abre R25 e atualiza feed. Falha conserva rascunho seguro e não duplica publicação. Não criar novos tipos apenas por botão ilustrativo. |
| R25 `/publicacoes/[id]` (N), 15 | Detalhe, respostas paginadas, responder, acompanhar/deixar de acompanhar, salvar, denunciar; autor pode editar e marcar pergunta resolvida quando aplicável. | Resposta herda público; leitor não tem Alterar. Acompanhamento e resolução persistem. Revogação/remoção elimina conteúdo de fetch, cache e anexos. Respostas, autor e contagens coerentes após refresh. |
| R26 `/publicacoes/[id]/editar` (N), 45 | Autor autorizado edita conteúdo/anexo. Público original somente leitura. | Salvar atualiza detalhe/feed sem duplicar. Conflito de versão oferece recarregar; sair com alteração pede confirmação, “Continuar editando” é ação segura principal. Excluir exige confirmação e efeito persistido conforme contrato. |
| R27 `/groups` (E), 43 | Grupos das comunidades que a pessoa pode consultar; busca e seleção. | Sem comunidade, encaminha à descoberta; não lista grupo privado de terceiro por troca de query. |
| R28 `/groups/[id]` (E), 43 | Apresentação, regra de ingresso vigente, conteúdo e participação conforme acesso. Entrar/sair quando permitido; publicar usa R24 com escopo fixado. | Não transformar grupo privado em público nem conceder membership comunitária implicitamente. Perda de acesso invalida feed e notificações vinculadas. |
| R29 `/communities/[id]/invite` (E), `/invite/[token]` (E) | Emissor autorizado gera/copia/revoga convite comunitário; destinatário entra e aceita. | Token expirado/revogado/reutilizado é tratado. Participação segue modalidade real da comunidade; não confundir convite familiar, de prestador e comunitário. Destino continua válido após login. |
| R30 `/communities/[id]/admin/pending` (E), 43 | Responsável analisa pedidos, lê motivo privado, aprova/rejeita conforme capacidade. | Escrita auditada, idempotente; membro comum não acessa fila nem justificativa. Decisão atualiza R23 e notificação; disputa entre operadores não produz duas decisões. |
| R31 `/communities/[id]/admin`, `/admin/moderators`, `/admin/providers` sob a mesma comunidade (E) | Gestão já existente: configurações, responsáveis/moderadores e prestadores autorizados. Cada subrota tem autorização específica. | Sem escalada de papel, transferência/suspensão acidental ou edição de comunidade alheia. Mudanças afetam consultas reais; preservar funções existentes comprovadas. |

**Gate W03:** conta A solicita sem motivo e com motivo → gestor decide → A entra → publica para cidade e comunidade → B autorizado responde → A recebe retorno e resolve → terceiro sem acesso não lê nem altera. Denúncia/acompanhamento/decisão C10/O03–O04 e notificação C08 são parte da etapa.

### 4.4 Eventos e perguntas ao organizador — W04

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| R32 `/events` (E), 48 | Buscar eventos por cidade/período; cards abrem detalhe; organizar evento aparece só para capacidade permitida. | Filtro de data considera fuso do evento, não data fixa da imagem; contagens e participação seguem escopo. Vazio permite ampliar período. |
| R33 `/events/[id]` (E), 48 | Detalhe, local/horário, organizador, confirmar presença/cancelar, salvar e Pedir mais informações **antes e depois** da confirmação. | RSVP idempotente e reversível; contagem muda corretamente, erro restaura estado anterior. Evento cancelado/encerrado mantém histórico e desabilita novas ações incompatíveis. Cancelar presença não é cancelar evento. |
| R34 `/events/[id]/perguntas` (N), 67 | Pergunta vinculada ao evento para seu organizador; envio, histórico próprio, resposta e retentativa. | Texto preservado na falha; destinatário obtido do evento, sem seleção arbitrária. Autor e organizador recebem atualização; terceiro não lê conversa. Não exigir RSVP nem garantir prazo de resposta. |
| R35 `/events/novo`, `/events/[id]/editar` (N; adaptar ações existentes) | Organizador autorizado publica/edita os dados mínimos, capa e alcance permitido; pode cancelar/encerrar com confirmação. | Persistir evento antes de divulgá-lo; mudança relevante/cancelamento gera atualização para participantes conforme preferências. Edição não altera escopo para contornar acesso. |

**Gate W04:** organizador cria → membro pergunta sem RSVP → organizador responde → membro confirma e cancela presença → organizador cancela evento → notificações e detalhe refletem situação após refresh. Testar revogação de papel e tentativa de alterar evento alheio.

### 4.5 Guia e curadoria — W05

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| R36 `/guide` (E), 12 | Guia por cidade/categoria/busca, entradas editoriais e serviços relacionados. | Conteúdo curado persistido, sem depender de geração de IA em cada render. Fonte/cidade reais. Filtro não mistura resultados de outra cidade sem indicação explícita. |
| R37 `/guide/[id]` (N), 25 | Artigo completo, índice de seções, fontes/atualização quando existentes, salvar, referência relacionada e Sugerir correção. | Links internos chegam ao destino autorizado; âncoras funcionam com teclado. Artigo retirado fica indisponível sem expor conteúdo revogado. Não inventar informações locais/legais pela imagem. |
| R38 `/guide/[id]/correcao` (N), 25 | Formulário contextual com descrição da correção e referência opcional; voltar ao artigo. | Protocolo persistido e recebido na curadoria; submissão não publica automaticamente. Duplicação/erro mantém texto; confirmação mostra o que realmente foi recebido. |
| R39 `/guide-queue` (E), `/guide-queue/[id]` (N) | Curador autorizado recebe sugestão, compara entrada, aplica ou rejeita justificadamente e encerra. | Edição versionada/auditada e cache invalidado; solicitante recebe retorno permitido. Erro em fornecedor de IA não bloqueia curadoria humana nem vira conteúdo aprovado. |

**Gate W05:** sugestão enviada por A chega à fila → curador publica correção → artigo e salvos exibem versão vigente → autor acompanha retorno. Busca simples e conteúdo real bastam; MVP-08 de inteligência não bloqueia esse ciclo.

### 4.6 Serviços, pedidos e Meu negócio — W06

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| R40 `/servicos` (N; integrar busca existente), 61 | Categoria, nome e cidade/região; resultados com ficha e atendimento reais. | Nenhuma estrela, selo, ranking ou promessa comercial inventada. Filtro limpo não permanece selecionado sobre resultados incompatíveis. |
| R41 `/prestadores/[id]` (E), 62 | Ficha autorizada, serviços/catálogo, fotos, regiões, meios de contato permitidos e Solicitar serviço. | Conta não permitida/ficha retirada não expõe contato. CTA abre pedido com destinatário fixo; imagem repetida ou incompletude não gera prova social fictícia. |
| R42 `/pedidos/novo?prestador=[id]` (N), 62 | Descrever necessidade, categoria disponível, região e quando; anexo opcional. Explicar destinatário e envio. | Criar pedido estruturado e conversa contextual de forma consistente; autor é sessão. Retentativa não duplica. Prazo desejado é “Quando”, nunca contato pessoal. Não compartilhar telefone automaticamente. |
| R43 `/pedidos` (N), 17 | Solicitante acompanha seus pedidos por situação, com última atualização e link para detalhe. | Só próprios pedidos; vazio leva à busca; resposta do prestador altera resumo e não some ao recarregar. |
| R44 `/pedidos/[id]` (N), 17 | Detalhe, situação e troca contextual com prestador; responder, cancelar/encerrar conforme transição. | Destinatário somente leitura. Mensagens persistidas; anexos privados; sem acesso de terceiro. “Encerrado” não significa serviço prestado/pago nem avaliação automática. |
| R45 `/prestador`, `/prestador/pedidos/[id]` (E/N), 23 | Lista Novos/Em conversa/Encerrados e detalhe selecionado; responder, ver conversa, encerrar. | Primeira resposta move estado de forma transacional. Filtros/contagem atualizam; cliente vê resposta. Dois prestadores não acessam pedidos um do outro. |
| R46 `/prestador/ficha`, `/prestador/catalogo` (E), `/prestador/atendimento`, `/prestador/conta` (N), 23/62 | Editar ficha, descrição, imagens, serviços/itens, ordem, região/horários e meios de contato opcionais. Visualizar própria ficha. | Salvar realmente altera R41; completude calculada sobre campos reais, sem bloquear por opcional. Remover imagem elimina acesso conforme contrato; uploads interrompidos não deixam publicação incoerente. |
| R47 `/communities/[id]/indicar-prestador`, `/prestador-convite/[token]` (E) | Membro autorizado indica/convida; destinatário aceita no shell próprio e preenche ficha. | Token válido, conta própria e alcance autorizado; não promover prestador a membro. Convite e entrega de e-mail precisam ser rastreáveis e retentáveis. |

**Gate W06:** cliente cria pedido → prestador recebe em Novos → responde → cliente lê e responde → encerramento em ambas as telas; editar ficha aparece na busca/detalhe; testar pedido alheio, convite inválido e falha de envio. Reaproveitar DM contextual, mas não usar uma conversa solta como substituto de estado do pedido.

### 4.7 Mercado, anúncios e Moradia — W07

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| R48 `/mercado` (N), 13 | Busca de produtos, categoria, cidade, preço e ordenação; publicar abre R50. | Retornar somente anúncio ativo e visível; filtros/paginação/contagens consistentes. Anúncio próprio pode aparecer, mas contato não permite conversar consigo. |
| R49 `/mercado/[id]` (N), 63 | Galeria, preço, descrição, local aproximado, anunciante permitido, salvar/denunciar e Tenho interesse. | Interesse abre/cria conversa contextual idempotente C12; não checkout. Pausado/encerrado não aceita novo interesse; histórico existente permanece autorizado. Não expor endereço residencial. |
| R50 `/mercado/novo`, `/mercado/[id]/editar` (N), 63/64 | Tipo/categoria, título, descrição, preço, fotos, cidade/público permitido. Prévia e publicação; edição mantém alcance original. | Uploads, validações e publicação reais; falha conserva rascunho seguro. Autor controla editar/pausar/reativar/encerrar, com confirmação. Alteração concorrente não sobrescreve silenciosamente. |
| R51 `/meus-anuncios` (N), 21/64 | Listar próprios anúncios por status e tipo, abrir/editar, pausar/reativar/encerrar. | Mutação atualiza detalhe e busca, com reversão se falhar. Indicadores derivam de dados existentes; não inventar visualizações ou vendas. Se usar filtro de Moradia, aponta ao editor correto. |
| R52 `/imoveis` (N), 65 | Buscar venda/aluguel, tipo, cidade/região, quartos e faixa de valor. Salvar busca/ativar alerta. | Diferenciar aluguel de custo total; preservar filtros no link/volta. Resultados sem match não são erro; não manter seleção de uma categoria sobre grade variada. |
| R53 `/imoveis/[id]` (N), 19 | Galeria, descrição, região, aluguel/venda, condomínio e demais custos informados; salvar/denunciar/Tenho interesse. | Não somar custo desconhecido como zero nem inventar SLA, garantia, contato compartilhado ou tempo de associação do anunciante. Conversa contextual segue C12. |
| R54 `/imoveis/novo`, `/imoveis/[id]/editar` (N), 19/63/64 | Reutilizar ciclo de anúncio com campos específicos de Moradia, fotos e custos separados. | Não criar anúncio impossível de cadastrar porque só o detalhe foi desenhado. Validar valores e campos pelo tipo; mesma autorização/lifecycle de R50. |
| R55 `/imoveis/alertas` (N), 65 | Nomear busca salva, revisar filtros, ativar/desativar/excluir alerta; abrir resultados. | Job encontra novos anúncios autorizados, deduplica por alerta/anúncio e respeita preferências. Desligar interrompe novas entregas; excluir remove a assinatura. Sem job e retorno real, alertas não estão concluídos. |

**Gate W07:** A publica produto e imóvel → B encontra com filtro correto e envia interesse → A responde → A edita/pausa/reativa/encerra → B vê estado atualizado; busca salva entrega exatamente o alerta esperado e deixa de entregar quando desligada. Sem pagamento, comissão, custódia ou assinatura; BLOCK-ASAAS não é dependência deste Mercado de anúncios.

### 4.8 Perfil, configurações, retorno e confiança — transversal, fechamento W08

Os IDs C01–C13 identificam capacidades transversais. Cada contrato cita também a rota completa.

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| C01 `/profile` (E), 51 | Próprio perfil, editar, meus anúncios, meu negócio quando autorizado, salvos/configurações e interesses. | Links reais por papel, sem exibir entrada de prestador funcional a conta sem capacidade. Não publicar dados privados de elegibilidade. |
| C02 `/profile/editar` (N; adaptar ações), `/profile/interests` (E), 51 | Editar nome, foto, bio, interesses e Força/OM opcionais; Exibir no perfil individual, inicialmente desligado. | Persistir/remover campos e foto; alteração aparece ao retornar. Ocultar revoga leitura por outros também em consultas/cache. Não inferir dado via CPF. |
| C03 `/profile/[userId]` (E), 51 | Perfil alheio permitido, conteúdo que o leitor pode ver e afiliação explicitamente visível. | Não permitir edição alheia nem seguidores/selos/mensagens irrestritas inventadas. Perfil oculto ou fora de acesso não revela dados por URL/avatar. |
| C04 `/configuracoes` (N), 52 | Índice de Notificações, Conta, Privacidade/Bloqueados, Família, Ajuda e Sair. | Cada linha aponta a função real; sair limpa sessão/cache/assinaturas e back não recupera informação privada. |
| C05 `/configuracoes/notificacoes` (N; ações existentes no perfil), 52 | Preferências por tipo e canal suportado. | Gravação real; in-app e e-mail respeitam contrato. Push web só aparece habilitável se serviço estiver conectado e permissão do navegador tratada. Negação do navegador tem orientação, não loop de permissão. |
| C06 `/configuracoes/conta` (N), 52 | Dados de acesso, recuperação/alteração permitida e solicitação de exclusão com confirmação. | Reautenticar quando exigido pelo Auth. Exclusão usa política e job reais, cancela acesso e informa situação correta; não prometer descarte instantâneo nem apagar banco diretamente pelo cliente. |
| C07 `/configuracoes/familia` (N; adaptar ações existentes) | Criar/copy/revogar convite familiar e acompanhar estado permitido. | Dados mínimos, tokens sem persistência pública; convite de R17 mantém conta independente. Não permitir enumerar família alheia. |
| C08 `/notifications` (E), 54 | Listar próprias notificações, ler/marcar lida, filtros e abrir destino contextual. | Leitura persiste, contador atualiza e target removido mostra indisponível sem vazar conteúdo antigo. Sem entrega duplicada por refresh; revogação de acesso afeta previews. |
| C09 `/salvos` (E em trabalho local), 54 | Conteúdos salvos por tipo; abrir/remover. | Sincroniza com botão de salvar nas origens; item retirado não revela snapshot privado. Estado após reload e outra sessão igual. |
| C10 `/denuncias/nova?tipo=...&id=...`, `/denuncias`, `/denuncias/[id]` (N), 56 | Denunciar alvo autorizado com motivo; acompanhar próprias denúncias e retorno permitido. | Servidor valida alvo/tipo/acesso; não mostrar “anônimo” como promessa. Recibo após persistência; motivo inválido não envia; resultado interno/denunciante não aparece para denunciado. |
| C11 `/configuracoes/bloqueados` (N; mecanismo existente), 56 | Listar bloqueios próprios, confirmar bloquear/desbloquear e retornar. | Efeito aplicado a envio/interações conforme contrato existente, não apenas ocultação local. Não prometer esconder todo conteúdo se o mecanismo não faz isso. Testar ambos os sentidos da conversa. |
| C12 `/messages` (E), `/messages/[id]` (N/adaptar seleção existente), 17/67 | Central de conversas autorizadas por pedido, anúncio ou evento; histórico, envio/anexo permitido, retry, leitura e retorno à origem. | Resolver contexto no servidor, impedir conversa consigo/terceiro arbitrário, deduplicar envio e preservar mensagem em erro. URL direta e refresh abrem conversa correta; revogação/bloqueio interrompe novas mensagens. |
| C13 `/ajuda` (N) | Orientações de acesso/uso e canal de suporte configurado, documentos legais. | Links/canal realmente disponíveis, sem endereço ou chat fictício. Chamado, se oferecido, precisa de recebimento e retorno real; caso contrário usar canal existente explicitamente. |

R15 e perfil mínimo/C02 entram em W02; emissão/aceite familiar mínimo C07 entra em W01; notificações, salvos e confiança entram com o primeiro produtor W03; conversas acompanham W04/W06/W07. W08 fecha preferências, família, conta, exclusão e a consistência entre todos os tipos. Não adiar proteção de publicação para W08.

### 4.9 Operação restrita e rotas de compatibilidade

| ID / rota | Tela, entrada e ação | Resultado, retorno e falha específica |
|---|---|---|
| O01 `/admissions` (E), 57 | Fila paginada por situação/antiguidade, abrir solicitação. | Somente operador autorizado; sem CPF/payload bruto nas linhas. Não confundir fila de elegibilidade com ingresso em comunidade. |
| O02 `/admissions/[id]` (N), 57 | Resumo mínimo, situação do processamento e decisão permitida; solicitar substituição/decidir conforme contrato. | Acesso ao documento excepcional e auditado, URL assinada curta sem cache público. Decisão idempotente/versionada; nova submissão invalida análise antiga. Atualiza R13, autorização e notificação corretamente. |
| O03 `/reports` (E), 58 | Fila de denúncias com escopo de operador, filtros e prioridade quando realmente definida. | Somente registros autorizados; contagem consistente e sem vazar identidade do denunciante ao alvo. |
| O04 `/reports/[id]` (N), 58 | Ler contexto necessário, escolher decisão e justificativa, confirmar e encerrar. | Nenhum veredito pré-selecionado pelo modelo. Ação efetiva e auditoria na mesma transação lógica, idempotência e conflito de revisão. Retorno ao denunciante contém só informação permitida. |
| O05 `/arrivals` (E) | Visão operacional existente de chegadas/transferências. | Preservar agregação e papel real; sem transformar em lista pública de afiliação ou endereço. Sem novos dados por mera estética. |
| O06 `/community` (A) | Compatibilidade com feed antigo e `?post=[id]`. | Sem post: encaminhar ao início/contexto equivalente; com post: R25, preservando autorização. Migrar produtores de links antes de retirar o caminho antigo. |
| O07 `/recommendations` (E/A) | Referências/indicações existentes, relacionadas ao Guia e Serviços. | Preservar contribuição permitida e links antigos; se consolidada em `/guide` ou `/servicos`, mapear tipo/contexto e testar deep links. Não descartar dados anteriores. |

`/api/health`, `/api/localities`, `/api/localities/[uf]`, `/api/avatar/[userId]`, `/api/consent`, `/api/onboarding`, `/api/onboarding/status`, `/api/admin/admissions`, `/api/admin/reports/[id]`, `/api/admin/portal-health`, `/api/admin/rls-health`, `/api/internal/outbox`, `/api/internal/verification-reconcile`, `/api/manifest` e `/api/sw` são handlers de infraestrutura existentes, não telas. Auditar contrato, permissão e consumidores na etapa respectiva. Prefixo `/api` livre no proxy não torna seus handlers públicos. Jobs internos exigem credencial própria; nunca links no menu.

Página 404, boundary de erro, loading e estado sem acesso não criam destinos artificiais na navegação. Aplicar prancha 60 a cada contexto. Não criar uma rota `/erro` universal que perca o retorno ou disfarce um 500.

## 5. Cobertura das 31 pranchas web

Esta tabela fecha a correspondência visual. Rotas auxiliares da §4 usam o mesmo sistema de componentes, mesmo quando não possuem PNG exclusivo.

| Prancha | Rotas/estados implementados | Etapa |
|---|---|---|
| 01-web-inicio | `/inicio`: feed, chegada sem comunidade, resposta recebida | W03 |
| 12-web-guia | `/guide`: descoberta, categorias e vazio | W05 |
| 13-web-mercado | `/mercado`: pesquisa e filtros coerentes | W07 |
| 15-web-conversa | `/publicacoes/[id]`: leitura/resposta/resolução | W03 |
| 17-web-pedido-servico | `/pedidos/[id]`, conversa contextual e acompanhamento | W06 |
| 19-web-imoveis | `/imoveis/[id]`: galeria/custos/interesse | W07 |
| 21-web-meus-anuncios | `/meus-anuncios`: status e ações | W07 |
| 23-web-meu-negocio | `/prestador`, ficha/catálogo/atendimento/pedidos | W06 |
| 25-web-guia-referencia | `/guide/[id]`, correção e fontes | W05 |
| 36-web-auth-entrada | `/login`, `/signup`, adaptadas ao ADR de senha | W01 |
| 37-web-auth-confirmacao | `/auth/confirmar-email`, callback inválido/expirado; recuperação | W01 |
| 38-web-auth-admissao | `/onboarding`, `/onboarding/status` | W01 |
| 39-web-onboarding-contexto | `/onboarding/locality`, `/onboarding/perfil`, welcome | W01/W02 |
| 42-web-comunidades | `/communities`, apresentação e solicitação | W03 |
| 43-web-comunidade-grupos | `/communities/[id]`, grupos, pendência e resumo do motivo | W03 |
| 45-web-publicacao | `/publicacoes/nova`, edição, público e descarte seguro | W03 |
| 48-web-eventos | `/events`, detalhe, RSVP e cancelamento | W04 |
| 51-web-perfil | `/profile`, edição, perfil alheio e visibilidade | W02 |
| 52-web-configuracoes | `/configuracoes` e subrotas de conta/preferências | W02/W08 |
| 54-web-retorno | `/notifications`, `/salvos`, destinations corretos | W03/W08 |
| 56-web-confianca | denúncia, acompanhamento, bloquear/desbloquear | W03/W08 |
| 57-web-operacao-admissoes | `/admissions`, `/admissions/[id]` | W01 |
| 58-web-operacao-moderacao | `/reports`, `/reports/[id]` | W03 |
| 60-web-estados | boundaries/sem acesso/conexão/retomada em todas as rotas | Todas |
| 61-web-explorar-servicos | `/explorar`, `/explorar/busca`, `/servicos` | W02/W06 |
| 62-web-prestador-pedido | `/prestadores/[id]`, `/pedidos/novo` | W06 |
| 63-web-mercado-anuncio | `/mercado/[id]`, `/mercado/novo` | W07 |
| 64-web-mercado-edicao | edição, confirmação de pausa, gestão de anúncios | W07 |
| 65-web-imoveis-alertas | `/imoveis`, `/imoveis/alertas` | W07 |
| 67-web-evento-informacoes | `/events/[id]/perguntas`, conversa, envio falho e resposta | W04 |
| 69-web-identidade-recuperacao | `/onboarding/documento`, substituição integral e situação | W01 |

## 6. Contratos de dados e integrações que precisam fechar

Nomes abaixo descrevem responsabilidades de domínio, não ordenam criar tabelas duplicadas. Antes de uma migration, mapear schema/RPCs existentes e evoluí-los incrementalmente. Usar [régua de risco](../../decisions/RISK_MATRIX.md) e contratos/ADRs técnicos aplicáveis. A preferência de produto já autorizada não precisa ser reaberta; decisões de fornecedor, retenção e fronteiras de dados não podem ser inventadas.

| Domínio | Contrato mínimo e transições | Prova decisiva |
|---|---|---|
| Auth/cadastro | Intenção login/cadastro separada; sessão, confirmação e recuperação pelo Auth; aceite versionado ligado à conta | E-mail recebido, callback válido, senha nova funciona, cookie limpo não repete aceite. Não confundir e-mail de Auth/SMTP com outbox Resend. |
| Identidade | Submissão privada, arquivo único/versionado, processamento `enviado → processando → resultado`; resultado ilegível exige substituição; decisão de elegibilidade conforme política | Job real lê arquivo permitido, resultado reconcilia com operador/conta; retry limitado, idempotência e expurgo verificáveis. Sem raw CPF, payload de provedor ou documento nos logs. |
| Afiliação | Força e OM declaradas separadas da elegibilidade, consentimento/visibilidade por campo, atualização/removal | Outra conta só lê campos permitidos; desligar e remover afetam todas as projeções. Novo schema e políticas entram juntos. |
| Comunidade | Solicitação `pendente → aprovada/rejeitada/cancelada`; motivo opcional privado; membership separado da elegibilidade nacional | Conta solicitante, gestor e terceiro testados; decisão repetida/conflitante não cria acessos extras. |
| Publicação | Escopo explícito de cidade/comunidade/grupo, autor, respostas e anexos herdando acesso; edição não altera público | Negação por API/RPC/URL/arquivo e busca; pergunta de cidade não abre comunidade privada. |
| Notificações | Evento de domínio/outbox, deduplicação, preferências, destino estável e conteúdo mínimo | Segundo usuário recebe retorno; falha entrega fica rastreável/retry; desativar canal afeta próximas entregas. |
| Conversa contextual | Contexto imutável (pedido/evento/anúncio), participantes derivados, mensagens ordenadas/idempotentes, leitura e bloqueios | Nenhum corpo de request injeta participante/contexto de terceiro; ambos os lados retomam após refresh. |
| Pedido | `novo → em conversa → encerrado`; cancelamento do solicitante antes de encerrado, ator/motivo de encerramento quando aplicável | Primeira resposta e estado coerentes; histórico preservado e encerramento não inventa pagamento/conclusão material do serviço. |
| Anúncio | `rascunho → ativo ↔ pausado → encerrado`; dono, tipo, mídia, valores e público; retomada de encerrado só se contrato autorizar | Busca só ativos permitidos, gestão só dono, uploads órfãos limpos, edição concorrente detectada. |
| Alerta de imóvel | Busca normalizada, assinatura ativa/inativa, deduplicação de matches e canal permitido | Anúncio novo gera uma entrega; repetição de job não duplica; pausa/revogação cancela futuras entregas. |
| Evento | Planejado/publicado, cancelado ou encerrado; RSVP independente de perguntas; capacidade de organizador | Repetir RSVP não duplica; cancelamento e atualizações chegam; terceiro não consulta pergunta privada. |
| Guia | Artigo curado/versionado, fontes e sugestão recebida/em análise/encerrada | Sugestão altera artigo só após decisão autorizada; retorno ao solicitante e invalidation real. |
| Denúncia/operação | Alvo tipado autorizado, protocolo, revisão e decisão auditada; informações distintas para operador/solicitante/alvo | Fechar denúncia aplica efeito, não apenas muda badge. Operador sem escopo não consulta nem decide. |
| Conta/exclusão | Reautenticação, solicitação, revogação de sessão e processamento conforme política aprovada; preservação legal explícita | Conta não continua operando depois do efeito previsto; arquivos/cache/assinaturas tratados; nada de promessa falsa de exclusão imediata. |

### Bloqueios externos e técnicos: fechar antes de prometer conclusão

- `BLOCK-LEGAL-AI`: fornecedor e governança do processamento privado da identidade. Implementar contrato, armazenamento seguro, job e falhas dentro da etapa; sem decisões e integração real, W01/entrega completa ficam abertos. Não enviar documentos a fornecedor improvisado.
- `BLOCK-AFFILIATION`: reconciliar o card/ADR que ainda proíbe genericamente Força/OM. Produto opcional já autorizado; restam contratos técnicos de visibilidade, descarte/remoção, perfis ocultos e testes. “Situação/turma/posto” não foram automaticamente autorizados.
- `BLOCK-RESEND`: confirmar separadamente outbox transacional e mecanismo de e-mail do Auth. Integração/credenciais ausentes impedem o gate que depende da entrega, não justificam toast falso. Mailbox local prova integração local, não entrega em produção.
- `BLOCK-LEGAL-ENTRY`: textos legais aplicáveis à abertura pública e processamento precisam ser válidos; links visuais não resolvem governança.
- `REPO-SECRETS-ROTATION`: verificar se o ambiente de homologação/publicação usa credenciais válidas e saneadas; não imprimir segredos como evidência.
- `BLOCK-WHATSAPP` e `BLOCK-ASAAS` não bloqueiam o produto descrito: não se promete envio automatizado WhatsApp nem pagamento. Contato opcional de prestador segue o contrato autorizado.

Se um pré-requisito externo impedir um fluxo, registrar critério exato, responsável e próximo passo. Pode haver uma versão parcial de teste claramente identificada; **não** chamá-la de “todas as rotas funcionando”. Nenhum modelo específico é dispensado de concluir backend só por ser de baixo custo; atribuir o contrato a executor adequado, mantendo a dependência aberta até prova.

## 7. Sequência de implementação

Executar um lote funcional pequeno por vez em cada checkout, incluindo implementação e teste. Os IDs W00–W09 agrupam requisitos; não impõem conclusão integral da linha anterior. A tabela abaixo mantém os critérios de saída, mas sua coluna de ordem histórica é substituída pelas dependências efetivas a seguir. Não executar capturas e resets concorrentes no banco compartilhado.

**Ordem prática atual:** revisar e integrar o trabalho já escrito em Início, Explorar, Comunidades e Notificações; depois puxar o próximo lote disponível no quadro. Não recriar fundação, inventário ou demo. Para selecionar trabalho:

| Área | Pré-requisito efetivo para implementar/testar | Não precisa esperar |
|---|---|---|
| W00 — fundação | Reconciliar base, mudanças em andamento e componentes usados | Inventário exaustivo ou novo plano de todo o produto |
| W01 — acesso/admissão | Auth e contratos de cada transição; integração externa para provar a respectiva transição | Conclusão visual do restante do produto |
| W02 — perfil/contexto | Sessão e APIs autorizadas; contrato técnico para novos dados pessoais | Reconhecimento por IA; perfil simples não aguarda afiliação |
| W03 — social/retorno | Sessão de teste autorizada, consultas e permissões sociais; produtores de cada notificação | W01 completo ou todos os campos de W02 |
| W04 — eventos | Domínio de eventos, ator autorizado e conversa contextual para perguntas | Todo o ciclo social redesenhado |
| W05 — Guia | Consulta de conteúdo autorizado, curadoria e sugestão para fechar o ciclo | W04/eventos ou IA de busca |
| W06 — serviços | Ficha, prestador, pedidos e conversa autorizada | W05/Guia |
| W07 — Mercado/Moradia | Anúncios, mídia, permissões e contato; jobs para alertas | W06 inteiro; reutilizar conversa existente se adequada |
| W08 — conta/retorno | APIs de preferências/conta; cada produtor para seu retorno | W07 para preferências já implementáveis |
| W09 — publicação | Todos os requisitos obrigatórios e G6 comprovados no candidato integrado | Nada obrigatório pode ser omitido |

Critérios de saída por área (não são pré-requisitos para iniciar áreas independentes):

| Área | Gate de saída |
|---|---|
| W00 — Baseline, contratos e fundação | Rotas existentes sem regressão; navegação nova com destinos reais disponíveis; inventário de endpoints/permissões; contratos técnicos pendentes nomeados. Demo de componentes não conta como Início/Explorar prontos. |
| W01 — Acesso completo + operação de admissão | Jornadas de R01–R14, R16–R17, C07 e O01–O02; personalização R15 fecha em W02 com persistência e contas reais de teste. Nenhum membro entra por bypass. Dependências externas resolvidas ou etapa explicitamente bloqueada. |
| W02 — Perfil/contexto e descoberta base | Preencher/ocultar/remover Força/OM provado com duas contas; cidade de busca não altera autorização; shell fica coerente nos três viewports. |
| W03 — Ciclo social + confiança + retorno | Jornada multiusuário da §4.3, fila de moderação funcionando e negativas de cidade/comunidade/grupo. Início deixa de ser estrutura inicial. |
| W04 — Eventos completos | Nenhum evento sem organizador capaz de responder; presença não condiciona informação; cancelamentos atualizam consumidores. |
| W05 — Guia + curadoria | Artigo consultável, sugestão processada e retorno; não depender de camada sofisticada de IA para busca/leitura. |
| W06 — Serviços + prestador | Solicitante e prestador fecham a mesma solicitação; isolamento entre negócios e regiões. |
| W07 — Mercado e Moradia | Anúncios publicados por UI, encontrados, contatados e retirados; alertas entregam e param de entregar conforme estado. |
| W08 — Conta e retorno completo | Nenhum item de configuração sem efeito; exclusão/processamento segundo contrato; todos os destinos de retorno e deep links válidos. |
| W09 — Conclusão web | Todos os gates da §8 e relatório §10 completos. Zero placeholder/CTA fictício/integração pendente obrigatória. |

Implementar Início com produtores existentes e autorizados; completar os restantes em lotes vinculados, sem contagem inventada ou CTA fictício. Operação acompanha o fluxo que precisa dela. Recuperação, notificações essenciais e erro de envio fazem parte do respectivo lote. Falta de produtor mantém seu requisito aberto, sem impedir outras telas.

### Reaproveitamento do quadro atual

- W00: `DS-001-DESIGN-SYSTEM`, `MVP-05-TEST-BASELINE` e o trabalho G0 já iniciado; comparar com esta revisão antes de continuar.
- W01: `RECON-AUTH-ENTRADA-WEB`, `MVP-01-ADMISSION`, `BLOCK-LEGAL-AI`, `BLOCK-RESEND`, `BLOCK-LEGAL-ENTRY`. Um card histórico `done` não cobre automaticamente o novo escopo.
- W02: `DONE-PROFILE-RPCS`, `DONE-NATIONAL-LOCALITIES`, `BLOCK-AFFILIATION`: reutilizar prova compatível, abrir complemento no contrato correspondente.
- W03/W04: `MVP-03-COMMUNITY`, `DONE-COMMUNITY-MODERATION`, `DONE-OUTBOX-FOUNDATION`, com complementos de público, retorno e eventos.
- W05: `MVP-06-DISCOVERY-INDEX`, `MVP-07-KNOWLEDGE`; não depender de `MVP-08-INTELLIGENCE` para busca funcional mínima.
- W06: `G-TASK-1` a `G-TASK-6`; reconciliar o que realmente existe antes de refazer.
- W07: pesquisar card de anúncios/moradia; se não existir, registrar no quadro com referência a esta autorização, dependências e contratos técnicos. Não usar card de marketplace pago.
- W08/W09: `MVP-09-OPERABILITY`, `DRIFT-STATUS-RECONCILIATION` e os cards dos fluxos. O card documental desta revisão não conclui runtime.

## 8. Gates objetivos de conclusão

### G0 — Contrato pronto para executar

Antes de editar código: rota/estado e PNG identificados, baseline/SHA registrados, consultas/mutações/ator/escopo conhecidos, caminhos de escrita limitados, dependências do lote resolvidas, critérios positivos/negativos e comandos de prova. Reutilizar e validar um [contrato de tarefa](../../agents/TASK_CONTRACT.md) por lote delegado; não criar outro plano se o contrato/card já contém essas informações. Ler contexto uma vez e consultar apenas alterações relevantes nas próximas rodadas. R3 sem contrato/ADR técnico adequado não é convertido em UI “final”.

### G1 — Rota funcional

Para **cada** rota da §4:

- Abrir pela navegação e diretamente pela URL; atualizar e voltar/avançar sem perder contexto ou cair em loop.
- Ler e alterar dados do backend real quando previsto; reabrir em outra sessão confirma persistência.
- Todo botão/link/menu tem efeito, destino ou desabilitação justificada. Nenhum placeholder “em construção”, `href="#"`, handler vazio ou toast usado como única implementação.
- Estado normal, vazio, carregando, erro, sessão expirada e acesso negado exercitados conforme aplicabilidade. Capturar o estado final, não apenas o clique.
- Cada mutação testada com ator permitido e ator não permitido, inclusive chamada direta sem UI. Arquivos e busca obedecem à mesma autorização.
- Repetição, timeout após possível sucesso e duas abas não criam duplicatas nem sobrescrevem decisão sem detectar conflito.
- Reload/confirmação no servidor faz parte da evidência; não aceitar apenas screenshot estático.

### G2 — Fluxo fechado

Exercitar entrada → ação → persistência → outro ator/job quando existir → feedback → acompanhamento/encerramento → principal falha. Nenhuma dependência obrigatória mockada na prova final. Provedores podem ser simulados em testes automatizados; a evidência de integração implantada precisa distinguir isso e demonstrar o canal real com dados apropriados.

### G3 — Visual e acessibilidade

Capturas em **375, 768 e 1440** para todas as rotas tocadas, com o estado correto e conta/papel correspondente. Comparar com prancha web e notas; tela web estreita não é implementação mobile. Sem overflow horizontal indevido, corte de ação, sobreposição de cabeçalho/rodapé, texto ilegível ou controles pequenos. Fluxos por teclado, foco de modal/retorno, rótulos/erros associados, leitores de tela e movimento reduzido conferidos.

Usar captura direcionada de `scripts/visual/capture.mjs` durante edição e julgamento visual explícito, conforme processo §0. O loop completo permanece disponível para consolidação. A lista do capturador precisa incluir novos paths e fixtures; script que desconhece a rota não a audita. Capturar variantes relevantes e confirmar o papel correto. Defeitos de acessibilidade, uso e divergências visuais materiais bloqueiam integração. Ajustes cosméticos menores ficam explicitamente no mesmo card para acabamento; não bloqueiam outra tela independente nem desaparecem dos critérios finais.

### G4 — Qualidade e regressão

```sh
node scripts/agents/task-contract.mjs docs/agents/tasks/<contrato>.task.yml
npx pnpm@11.18.0 gate --fast
# Fechamento: gate completo; --fast não substitui esta execução.
npx pnpm@11.18.0 gate
npx pnpm@11.18.0 build
```

Quando houver banco: stack local isolada, migration incremental, tipos gerados do schema public, pgTAP positivo/negativo e lint de schema. Aplicar os comandos e a ordem do AGENTS vigente: banco sem seed para pgTAP; seed para E2E. Não iniciar captura/dev que insira perfil entre reset e pgTAP. Nunca reset remoto/`--linked`.

E2E da rota/fluxo afetado na iteração. Os comandos acima são uma referência de fechamento, não uma sequência a repetir a cada edição: gate completo e build no lote estável; regressão completa na integração/publicação, sem duplicar gate/build dentro do loop visual. CI da revisão candidata precisa passar antes de release. Falha anterior comprovada mantém seu requisito e a certificação global pendentes, sem paralisar lote independente. Não diminuir teste para verde. Se contrato antigo foi substituído por decisão explícita, mudar expectativa **e** cobertura do novo comportamento na mesma entrega.

### G5 — Revisão e prova externa

Implementador, revisor e verificador de runtime são papéis distintos, acionados por lote estável de telas relacionadas. Não criar a cadeia de três sessões por componente ou pequeno reparo. Usar sessões independentes conforme arquitetura do repositório; o revisor forma primeiro parecer com contrato/referência/diff, sem a defesa do implementador. O verificador não corrige enquanto julga. Um coordenador que implementou acabamento não revisa independentemente esse mesmo acabamento.

Evidência contém SHA/ambiente/contas fictícias/passos/resultado e limitações. CI verde não substitui fidelidade visual; screenshot não comprova autorização; revisão automática que falhou não aprova. Se não houver sessão independente, o estado é “implementado; revisão pendente”, não concluído. A documentação não instala automaticamente esse mecanismo.

### G6 — Pronto para publicar e concluído web

Antes de publicação: 100% dos requisitos de rota cobertos por evidência, sem integração obrigatória pendente; jobs configurados, filas/retry observáveis; secrets fora de logs; migrações e rollback/compatibilidade revisados; e-mail e processamento externo comprovados conforme contrato; alterações de permissão e exclusão auditadas. Não declarar conclusão com `BIVAQUE_AUTH_BYPASS=true` ou dados de demonstração misturados à produção.

Após publicação autorizada: conferir a revisão implantada, `/api/health`, entrada/retomada e jornadas críticas em ambiente real controlado, sem dados pessoais reais nos artefatos. Validar jobs/canais e registrar resultado. “Todas as rotas ativas” não significa públicas: cada papel acessa somente seu conjunto permitido.

## 9. Execução por modelos menores

Não enviar este documento inteiro como um único pedido de implementação. O coordenador escolhe uma fatia funcional e entrega:

```text
Autoridade: esta especificação + decisões posteriores aplicáveis.
Etapa/requisito/rota: [Wxx / ID / URL completa e estado].
Baseline: [SHA, diff em andamento e evidência atual; sem inferir pronto].
Referência: [PNG web + reviewNotes; confirmar que o modelo conseguiu vê-lo].
Ator e permissão: [papel, contexto, ação permitida e tentativa negada].
Leitura: [consulta existente/contrato e os campos realmente retornados].
Escrita: [action/API/RPC, validação, estado anterior/posterior, idempotência].
Interação: [entrada, ação, feedback, próximo destino, retorno e retry].
Arquivos permitidos: [escopo estreito; backend incluído se o contrato exigir].
Dependências: [capacidade comprovada; bloqueio concreto se faltar].
Aceitação: [G1–G5 aplicáveis + cenário multiusuário desta etapa].
Entrega: implementação e testes juntos, capturas e provas, revisão do diff,
        resumo de continuidade e card reconciliado. Não declarar UI isolada como fluxo pronto.
```

Tamanho: um fluxo pequeno ou 1–3 telas relacionadas, incluindo comportamento observável e falhas. Ex.: “membro envia pedido e prestador vê em Novos” inclui as duas pontas mínimas, persistência e teste. Pode abranger dois painéis da mesma prancha. Reparos de componentes necessários entram no lote; não gerar tarefa por arquivo. O card do fluxo só fecha depois de todas as dependências verificadas.

`retry_budget` 3 por contrato, conforme validador; esgotamento gera FAIL/BLOCKED/HUMAN_DECISION com evidência, nunca PASS. Não fixar comandos `--auto`, credenciais ou provedor que não foram verificados no ambiente. Usar o modelo escolhido sem relaxar restrições. Commit convencional contém implementação, testes e transição material do quadro; não misturar trabalho de outra sessão.

## 10. Relatório final obrigatório

Produzir matriz de evidência derivada deste catálogo, mantida no mecanismo de contratos/quadro existente:

| Requisito/rota e variantes | SHA/ambiente | Ação + persistência | Acesso negado | Erro/retomada | 375/768/1440 | Revisão independente | CI/runtime | Pendência |
|---|---|---|---|---|---|---|---|---|
| Uma linha por requisito e variante relevante | Identificação reproduzível | Evidência/link | Evidência/link | Evidência/link | Capturas | Parecer | Execução | Vazia somente quando resolvido |

O inventário de rotas deve confrontar `apps/web/app/**/page.tsx`, handlers, links dos menus, CTAs, notificações e links de e-mail. Registrar exemplos concretos para cada segmento dinâmico. Um crawler pode encontrar links quebrados, mas não substitui asserções de comportamento e autorização.

Jornadas de encerramento, todas obrigatórias:

1. Cadastro + confirmação + CPF aprovado + contexto + primeira ação; conta antiga entra sem novo aceite.
2. CPF indisponível + arquivo único + processamento + ilegível + substituição + decisão + acesso.
3. Recuperação de senha completa e callback expirado; convite familiar aceito por conta independente.
4. Pedido comunitário com/sem motivo + decisão + publicação de cidade/comunidade + resposta + notificação + resolução.
5. Evento criado + pergunta antes de RSVP + resposta + RSVP/cancelamento + aviso de cancelamento do evento.
6. Guia encontrado + artigo + sugestão + curadoria + versão atualizada e retorno.
7. Prestador convidado + ficha publicada + pedido de cliente + resposta + encerramento em ambas as contas.
8. Produto e imóvel publicados + busca/filtros + interesse + conversa + edição/pausa/reativação/encerramento + alerta ligado/desligado.
9. Afiliação opcional preenchida/oculta/removida, salvos, preferências, bloqueio e denúncia com decisão operacional.
10. Logout/troca de conta, sessão expirada, revogação de permissão e exclusão conforme política; acesso direto de terceiro negado em todos os recursos privados.

**Condição final:** todos os ciclos web acima fechados, todas as rotas do catálogo navegáveis com efeito real para seu papel, nenhum bloqueio obrigatório escondido e evidência reproduzível. Neste momento o quadro pode registrar conclusão web. Antes disso, relatar exatamente a etapa entregue e o que impede a seguinte.
