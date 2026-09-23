# Jornadas e fluxos do Bivaque

> **Gerado** por `scripts/visual/flows-verify.mjs` a partir do guia visual. Não editar à mão.
> Jornada é uma sequência de telas com início, meio e fim, no molde do Mobbin; a tela vem da prancha.
> 61 jornadas e 75 pranchas. É mapa de **referência**, não prova de implementação.
> Galeria: [flows.html](../design/visual-guide-2026-09-06/flows.html).

## Jornadas

### Comunidades e publicação (9)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Descobrir e entrar numa comunidade](../design/visual-guide-2026-09-06/flows.html#mobile-descobrir-e-entrar-numa-comunidade) | Mobile | Descoberta → Pedido → Dentro | 4 | Descoberta de comunidades da cidade → Dentro da comunidade, com os grupos a vista |
| [Publicar uma pergunta na comunidade](../design/visual-guide-2026-09-06/flows.html#mobile-publicar-na-comunidade) | Mobile | Escrita → Alcance → Enviado | 3 | Pergunta em branco → Publicacao enviada, com o publico escolhido |
| [Sair da comunidade](../design/visual-guide-2026-09-06/flows.html#mobile-sair-da-comunidade) | Mobile | Saida | 2 | Dentro da comunidade → Vinculo encerrado |
| [Administração da comunidade — moderadores, prestadores e imagens](../design/visual-guide-2026-09-06/flows.html#web-administrar-comunidade) | Desktop web | Administração → Imagens → Sem permissão | 6 | Console da comunidade aberto → Moderador promovido, prestador revogado, ou imagem trocada |
| [Central de conversas — inbox e thread](../design/visual-guide-2026-09-06/flows.html#web-central-de-conversas) | Desktop web | Caixa de entrada → Conversa aberta → Bloqueio → Denúncia | 5 | Mensagens vazia ou com inbox populada → Mensagem entregue, falhada com retry, ou conversa bloqueada |
| [Decidir quem entra na comunidade](../design/visual-guide-2026-09-06/flows.html#web-decidir-pedido-de-entrada) | Desktop web | Fila → Decisao → Dentro | 3 | Fila de pedidos aguardando → Pedido decidido, e quem entrou aparece na comunidade |
| [Declarar mudança de cidade](../design/visual-guide-2026-09-06/flows.html#web-declarar-mudanca-de-cidade) | Desktop web | Declarar → Confirmado → Cancelar | 4 | Página /localidade com a cidade atual → Transferência declarada com data e destino |
| [Descobrir e entrar numa comunidade (web)](../design/visual-guide-2026-09-06/flows.html#web-descobrir-e-entrar-numa-comunidade) | Desktop web | Minhas → Descoberta → Pedido → Dentro | 4 | Minhas comunidades → Dentro da comunidade, com os grupos |
| [Publicar e recuperar rascunho (web)](../design/visual-guide-2026-09-06/flows.html#web-publicar) | Desktop web | Publicacao → Rascunho | 2 | Publicacao em branco → Rascunho recuperado ou publicacao enviada |

### Confiança (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Denunciar e acompanhar, e bloquear](../design/visual-guide-2026-09-06/flows.html#mobile-denunciar-e-acompanhar) | Mobile | Denuncia → Acompanhamento → Bloqueio | 3 | Envio da denuncia → Denuncia acompanhada e interacao bloqueada |
| [Denunciar conteudo e acompanhar (web)](../design/visual-guide-2026-09-06/flows.html#web-denunciar-e-acompanhar) | Desktop web | Denuncia → Acompanhamento | 2 | Denuncia de conteudo → Acompanhamento e bloqueios |

### Conversa (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Ler, responder e resolver uma conversa](../design/visual-guide-2026-09-06/flows.html#mobile-ler-responder-e-resolver) | Mobile | Leitura → Resposta → Resolvido | 3 | Conversa com respostas → Pergunta marcada como resolvida |
| [Ler e responder uma conversa (web)](../design/visual-guide-2026-09-06/flows.html#web-ler-e-responder-uma-conversa) | Desktop web | Conversa | 1 | Conversa e resposta → Conversa e resposta |

### Entrada e admissão (7)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Entrar no Bivaque e ser admitido](../design/visual-guide-2026-09-06/flows.html#mobile-entrar-e-ser-admitido) | Mobile | Abertura → Confirmacao → Verificacao → Chegada | 8 | Boas-vindas, sem conta → Membro verificado, com cidade escolhida, dentro do Inicio |
| [Retomar o cadastro e recuperar o acesso](../design/visual-guide-2026-09-06/flows.html#mobile-retomar-e-recuperar) | Mobile | Retomada → Falhas | 3 | Cadastro interrompido → Pessoa retoma o ponto onde parou |
| [Verificar por identidade quando o CPF nao resolve](../design/visual-guide-2026-09-06/flows.html#mobile-verificar-por-identidade) | Mobile | Alternativa → Analise → Correcao | 5 | CPF nao concluiu; a identidade e a alternativa → Analise acompanhada e arquivo substituido quando ilegivel |
| [Entrar no Bivaque e ser admitido (web)](../design/visual-guide-2026-09-06/flows.html#web-entrar-e-ser-admitido) | Desktop web | Entrada → Confirmacao → Verificacao → Contexto | 6 | Entrada e cadastro → Membro verificado, com contexto escolhido |
| [Quando o link de acesso nao vale mais](../design/visual-guide-2026-09-06/flows.html#web-link-de-acesso-invalido) | Desktop web | Link vencido → Entrada falhou | 2 | Link de recuperacao vencido → De volta ao caminho de entrada |
| [Recuperar o acesso quando a senha se perde](../design/visual-guide-2026-09-06/flows.html#web-recuperar-o-acesso) | Desktop web | Pedir o link → Criar a senha | 2 | Pedido do link, com retorno neutro → Senha nova salva e volta para entrar |
| [Verificar por identidade e acompanhar a admissao (web)](../design/visual-guide-2026-09-06/flows.html#web-verificar-por-identidade) | Desktop web | Envio → Analise → Correcao | 3 | Envio da identidade → Analise acompanhada, arquivo substituido se preciso |

### Estados compartilhados (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Quando algo falha: carregar, vazio e erro com rascunho](../design/visual-guide-2026-09-06/flows.html#mobile-quando-algo-falha) | Mobile | Carregando → Vazio → Erro | 3 | Tela carregando → Erro sem perder o que foi escrito |
| [Quando algo falha: sem acesso e retomada (web)](../design/visual-guide-2026-09-06/flows.html#web-quando-algo-falha) | Desktop web | Sem acesso → Retomada | 2 | Acesso indisponivel → Falha de conexao e retomada |

### Eventos (6)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Cancelar a presenca ou o proprio evento](../design/visual-guide-2026-09-06/flows.html#mobile-cancelar-presenca-ou-evento) | Mobile | Cancelamento | 3 | Presenca confirmada → Presenca cancelada ou evento cancelado |
| [Confirmar presenca num evento](../design/visual-guide-2026-09-06/flows.html#mobile-confirmar-presenca-num-evento) | Mobile | Descoberta → Detalhe → Confirmado | 3 | Lista de eventos → Presenca confirmada |
| [Pedir informacoes ao organizador do evento](../design/visual-guide-2026-09-06/flows.html#mobile-pedir-informacoes-ao-organizador) | Mobile | Pergunta → Espera → Falha | 3 | Detalhe do evento, sem exigir presenca → Pergunta enviada e resposta acompanhada |
| [Confirmar presenca num evento (web)](../design/visual-guide-2026-09-06/flows.html#web-confirmar-presenca-num-evento) | Desktop web | Lista → Detalhe | 2 | Lista e filtros → Presenca gerida no detalhe |
| [Organizar um evento na cidade](../design/visual-guide-2026-09-06/flows.html#web-organizar-um-evento) | Desktop web | Criar → Publicar → No ar | 3 | Formulario de novo evento em branco → Evento publicado e visivel na lista da cidade |
| [Pedir informacoes e ler a resposta (web)](../design/visual-guide-2026-09-06/flows.html#web-pedir-informacoes-ao-organizador) | Desktop web | Pergunta → Resposta | 2 | Pergunta reenviada → Resposta lida e jornada retomada |

### Guia (6)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Explorar o Guia da cidade](../design/visual-guide-2026-09-06/flows.html#mobile-explorar-o-guia) | Mobile | Descoberta → Categoria → Leitura | 3 | Descoberta editorial da cidade → Artigo de chegada lido |
| [Sugerir uma correcao no Guia](../design/visual-guide-2026-09-06/flows.html#mobile-sugerir-correcao-no-guia) | Mobile | Referencia → Origem → Sugestao | 3 | Referencia completa aberta → Sugestao enviada ao curador |
| [Curar uma sugestao do Guia](../design/visual-guide-2026-09-06/flows.html#web-curar-o-guia) | Desktop web | Fila → Correcao → No ar | 3 | Fila de sugestoes aguardando revisao humana → Correcao aplicada e artigo atualizado para quem le |
| [Explorar o Guia (web)](../design/visual-guide-2026-09-06/flows.html#web-explorar-o-guia) | Desktop web | Descoberta | 1 | Descoberta editorial → Descoberta editorial |
| [Pedir, responder e marcar como resolvida uma indicação](../design/visual-guide-2026-09-06/flows.html#web-recomendacoes) | Desktop web | Lista → Detalhe → Resolvido | 3 | Aba Pedidos da página /recommendations → Pedido marcado como resolvido pela autora, ou resposta em edição dentro do mesmo pedido |
| [Ler a referencia e sugerir correcao (web)](../design/visual-guide-2026-09-06/flows.html#web-sugerir-correcao-no-guia) | Desktop web | Referencia | 1 | Referencia completa → Correcao sugerida |

### Início e descoberta (4)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Como o Inicio recebe quem chega](../design/visual-guide-2026-09-06/flows.html#mobile-chegar-ao-inicio) | Mobile | Tres chegadas | 3 | Tres intencoes distintas de chegada → A tela certa para cada intencao |
| [Buscar conteudo por termo dentro da cidade atual](../design/visual-guide-2026-09-06/flows.html#web-busca-agrupada) | Desktop web | Resultados → Sem resultados | 2 | Termo digitado no campo de busca da topbar → Card aberto no destino real ou saida honesta do vazio |
| [Chegar ao Inicio (web)](../design/visual-guide-2026-09-06/flows.html#web-chegar-ao-inicio) | Desktop web | Home | 1 | Home de quem participa → Home de quem participa |
| [Primeiro contato do visitante com o Bivaque](../design/visual-guide-2026-09-06/flows.html#web-primeiro-contato-publico) | Desktop web | Hero e manifesto → Camadas e confianca | 2 | Aterrissagem em / → Decisao de entrar ou criar conta |

### Mercado (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Anunciar um produto no Mercado](../design/visual-guide-2026-09-06/flows.html#mobile-anunciar-um-produto) | Mobile | Mercado → Item → Anuncio | 3 | Mercado da cidade → Anuncio publicado |
| [Anunciar um produto (web)](../design/visual-guide-2026-09-06/flows.html#web-anunciar-um-produto) | Desktop web | Busca → Produto → Anuncio | 3 | Busca de produtos → Anuncio criado |

### Meu negócio (4)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Responder um pedido como prestador](../design/visual-guide-2026-09-06/flows.html#mobile-responder-um-pedido) | Mobile | Painel → Resposta → Ficha | 3 | Painel de pedidos do negocio → Pedido respondido, ficha em dia |
| [Indicar e aceitar prestador na comunidade](../design/visual-guide-2026-09-06/flows.html#web-indicar-prestador) | Desktop web | Indicacao → Aceite do prestador → Painel do prestador | 3 | Membro da comunidade abre a página de indicação → Prestador convidado confirma o e-mail e aceita; cai no painel próprio do prestador |
| [Operar catálogo, conta e área de atendimento do negócio](../design/visual-guide-2026-09-06/flows.html#web-prestador-catalogo-conta) | Desktop web | Catalogo → Conta e atendimento → Visibilidade publica | 3 | Painel do prestador autenticado → Catálogo publicado, conta configurada e área de atendimento ligada à comunidade autorizada |
| [Responder um pedido como prestador (web)](../design/visual-guide-2026-09-06/flows.html#web-responder-um-pedido) | Desktop web | Painel | 1 | Painel de pedidos do prestador → Painel de pedidos do prestador |

### Meus anúncios (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Gerenciar e encerrar os proprios anuncios](../design/visual-guide-2026-09-06/flows.html#mobile-gerenciar-e-encerrar-anuncio) | Mobile | Situacao → Edicao → Encerrado | 3 | Lista dos proprios anuncios por situacao → Anuncio encerrado como vendido |
| [Gerenciar, editar e pausar anuncios (web)](../design/visual-guide-2026-09-06/flows.html#web-gerenciar-e-encerrar-anuncio) | Desktop web | Lista → Edicao → Pausa | 3 | Lista dos proprios anuncios → Anuncio editado e pausado |

### Moradia (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Buscar um imovel e criar um alerta](../design/visual-guide-2026-09-06/flows.html#mobile-buscar-imovel-e-criar-alerta) | Mobile | Busca → Imovel → Alerta | 3 | Busca de imoveis → Alerta criado para o refinamento |
| [Buscar imovel e gerenciar alertas (web)](../design/visual-guide-2026-09-06/flows.html#web-buscar-imovel-e-criar-alerta) | Desktop web | Busca → Imovel → Alerta | 3 | Busca de imoveis → Alertas geridos |

### Operação (3)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Operador acompanha chegadas declaradas e transferencias ainda ativas](../design/visual-guide-2026-09-06/flows.html#web-chegadas-e-transferencias) | Desktop web | Volume por cidade → Sem chegadas | 2 | Operador clica em Chegadas na topbar do painel → Vê o volume por cidade ou o estado vazio e, se quiser, atualiza a leitura |
| [Operar a fila de admissoes](../design/visual-guide-2026-09-06/flows.html#web-operar-admissoes) | Desktop web | Fila → Analise | 2 | Fila de admissoes → Solicitacao analisada |
| [Operar a fila de denuncias](../design/visual-guide-2026-09-06/flows.html#web-operar-denuncias) | Desktop web | Fila → Analise | 2 | Fila de denuncias → Denuncia analisada e encerrada |

### Pedidos de serviço (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Encontrar um prestador e pedir um servico](../design/visual-guide-2026-09-06/flows.html#mobile-pedir-um-servico) | Mobile | Descoberta → Prestador → Pedido | 6 | Explorar servicos da cidade → Pedido com respostas recebidas |
| [Encontrar um prestador e pedir um servico (web)](../design/visual-guide-2026-09-06/flows.html#web-pedir-um-servico) | Desktop web | Descoberta → Prestador → Pedido → Resposta | 5 | Explorar servicos → Pedido e resposta do prestador |

### Perfil e configurações (6)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Ajustar preferencias e os controles da conta](../design/visual-guide-2026-09-06/flows.html#mobile-ajustar-preferencias-e-conta) | Mobile | Configuracoes → Notificacoes → Conta | 3 | Configuracoes → Controles da conta revisados |
| [Ver e editar o perfil, e ver outro membro](../design/visual-guide-2026-09-06/flows.html#mobile-ver-e-editar-o-perfil) | Mobile | Meu perfil → Edicao → Outro | 3 | Meu perfil → Exibicao propria e a de outro membro |
| [Ajustar preferencias, conta e privacidade (web)](../design/visual-guide-2026-09-06/flows.html#web-ajustar-preferencias-e-conta) | Desktop web | Preferencias → Conta | 2 | Preferencias e notificacoes → Conta e privacidade revisadas |
| [Convidar um familiar para criar a propria conta](../design/visual-guide-2026-09-06/flows.html#web-convidar-a-familia) | Desktop web | Convidar → Link pronto → Entrada | 3 | Tela de Configuracoes, secao Familia → Familiar aceita o link e cria a propria conta independente |
| [Encontrar ajuda no Bivaque](../design/visual-guide-2026-09-06/flows.html#web-pedir-ajuda-com-canal-real) | Desktop web | Topo → Regras e suporte | 2 | Topo da pagina /ajuda → Documento legal aberto ou e-mail enviado ao suporte |
| [Ver e editar o perfil, e ver outro membro (web)](../design/visual-guide-2026-09-06/flows.html#web-ver-e-editar-o-perfil) | Desktop web | Meu perfil → Outro | 2 | Meu perfil e edicao → Perfil de outro membro |

### Retorno (2)

| Jornada | Plataforma | Etapas | Telas | Começa → termina |
|---|---|---|---|---|
| [Voltar ao que importa: notificacoes, salvos e alertas](../design/visual-guide-2026-09-06/flows.html#mobile-voltar-ao-que-importa) | Mobile | Notificacoes → Salvos → Alertas | 3 | Central de notificacoes → Alertas de imoveis a vista |
| [Voltar ao que importa: notificacoes e salvos (web)](../design/visual-guide-2026-09-06/flows.html#web-voltar-ao-que-importa) | Desktop web | Notificacoes → Salvos | 2 | Central de notificacoes → Conteudos salvos |

## Pranchas

### Comunidades e publicação (10)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Comunidades e descoberta](../design/visual-guide-2026-09-06/flows.html#40-mobile-comunidades) | Mobile | 3 |
| [Participação e grupos](../design/visual-guide-2026-09-06/flows.html#41-mobile-comunidade-participacao) | Mobile | 3 |
| [Comunidades web](../design/visual-guide-2026-09-06/flows.html#42-web-comunidades) | Desktop web | 2 |
| [Comunidade, pedidos e grupos web](../design/visual-guide-2026-09-06/flows.html#43-web-comunidade-grupos) | Desktop web | 2 |
| [Perguntar ou pedir indicação](../design/visual-guide-2026-09-06/flows.html#44-mobile-publicacao) | Mobile | 3 |
| [Guia antes do pedido web](../design/visual-guide-2026-09-06/flows.html#45-web-publicacao) | Desktop web | 2 |
| [Web: decidir pedidos de entrada](../design/visual-guide-2026-09-06/flows.html#73-web-comunidade-pedidos) | Desktop web | 2 |
| [Web: central de conversas](../design/visual-guide-2026-09-06/flows.html#75-web-conversas) | Desktop web | 2 |
| [Web: administrar a comunidade](../design/visual-guide-2026-09-06/flows.html#81-web-comunidade-admin) | Desktop web | 2 |
| [Web: declarar mudança de cidade](../design/visual-guide-2026-09-06/flows.html#82-web-localidade) | Desktop web | 2 |

### Confiança (2)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Denunciar e bloquear](../design/visual-guide-2026-09-06/flows.html#55-mobile-confianca) | Mobile | 3 |
| [Denúncias e bloqueios web](../design/visual-guide-2026-09-06/flows.html#56-web-confianca) | Desktop web | 2 |

### Conversa (2)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Conversa: ler, responder e resolver](../design/visual-guide-2026-09-06/flows.html#14-mobile-conversa) | Mobile | 3 |
| [Web: conversa completa](../design/visual-guide-2026-09-06/flows.html#15-web-conversa) | Desktop web | 1 |

### Entrada e admissão (14)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Auth: boas-vindas, login e cadastro](../design/visual-guide-2026-09-06/flows.html#30-mobile-auth-entrada) | Mobile | 3 |
| [Confirmação de e-mail](../design/visual-guide-2026-09-06/flows.html#31-mobile-auth-confirmacao) | Mobile | 3 |
| [Aceites e verificação](../design/visual-guide-2026-09-06/flows.html#32-mobile-auth-acesso) | Mobile | 3 |
| [Admissão e convite familiar](../design/visual-guide-2026-09-06/flows.html#33-mobile-auth-admissao) | Mobile | 3 |
| [Cidade e primeira chegada](../design/visual-guide-2026-09-06/flows.html#34-mobile-onboarding-contexto) | Mobile | 3 |
| [Retomada e recuperação](../design/visual-guide-2026-09-06/flows.html#35-mobile-auth-retomada) | Mobile | 3 |
| [Entrada e cadastro web](../design/visual-guide-2026-09-06/flows.html#36-web-auth-entrada) | Desktop web | 2 |
| [Confirmação e retomada web](../design/visual-guide-2026-09-06/flows.html#37-web-auth-confirmacao) | Desktop web | 2 |
| [Verificação e admissão web](../design/visual-guide-2026-09-06/flows.html#38-web-auth-admissao) | Desktop web | 2 |
| [Contexto e personalização web](../design/visual-guide-2026-09-06/flows.html#39-web-onboarding-contexto) | Desktop web | 2 |
| [Identidade: envio e recuperação](../design/visual-guide-2026-09-06/flows.html#68-mobile-identidade-recuperacao) | Mobile | 3 |
| [Identidade: envio e recuperação web](../design/visual-guide-2026-09-06/flows.html#69-web-identidade-recuperacao) | Desktop web | 2 |
| [Web: recuperar o acesso](../design/visual-guide-2026-09-06/flows.html#71-web-auth-recuperacao) | Desktop web | 2 |
| [Web: link inválido ou expirado](../design/visual-guide-2026-09-06/flows.html#72-web-auth-link-invalido) | Desktop web | 2 |

### Estados compartilhados (2)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Estados compartilhados](../design/visual-guide-2026-09-06/flows.html#59-mobile-estados) | Mobile | 3 |
| [Estados compartilhados web](../design/visual-guide-2026-09-06/flows.html#60-web-estados) | Desktop web | 2 |

### Eventos (6)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Eventos e presença](../design/visual-guide-2026-09-06/flows.html#46-mobile-eventos) | Mobile | 3 |
| [Cancelamento de presença e evento](../design/visual-guide-2026-09-06/flows.html#47-mobile-eventos-cancelamento) | Mobile | 3 |
| [Eventos web](../design/visual-guide-2026-09-06/flows.html#48-web-eventos) | Desktop web | 2 |
| [Perguntas ao organizador](../design/visual-guide-2026-09-06/flows.html#66-mobile-evento-informacoes) | Mobile | 3 |
| [Informações do evento na web](../design/visual-guide-2026-09-06/flows.html#67-web-evento-informacoes) | Desktop web | 2 |
| [Web: organizar um evento](../design/visual-guide-2026-09-06/flows.html#70-web-evento-organizar) | Desktop web | 2 |

### Guia (6)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Guia: descoberta e categorias](../design/visual-guide-2026-09-06/flows.html#10-mobile-guia) | Mobile | 3 |
| [Web: Guia da cidade](../design/visual-guide-2026-09-06/flows.html#12-web-guia) | Desktop web | 1 |
| [Guia: referência, origem e correção](../design/visual-guide-2026-09-06/flows.html#24-mobile-guia-referencia) | Mobile | 3 |
| [Artigo completo do Guia web](../design/visual-guide-2026-09-06/flows.html#25-web-guia-referencia) | Desktop web | 1 |
| [Web: curar referências da comunidade](../design/visual-guide-2026-09-06/flows.html#74-web-guia-curadoria) | Desktop web | 2 |
| [Web: responder e sugerir referências](../design/visual-guide-2026-09-06/flows.html#80-web-recomendacoes) | Desktop web | 2 |

### Início e descoberta (5)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Início: chegada, participação e mudança](../design/visual-guide-2026-09-06/flows.html#00-mobile-inicio) | Mobile | 3 |
| [Web: início com intenções claras](../design/visual-guide-2026-09-06/flows.html#01-web-inicio) | Desktop web | 1 |
| [Explorar e serviços](../design/visual-guide-2026-09-06/flows.html#02-mobile-explorar) | Mobile | 3 |
| [Web: primeiro contato público](../design/visual-guide-2026-09-06/flows.html#83-web-landing) | Desktop web | 2 |
| [Web: busca agrupada](../design/visual-guide-2026-09-06/flows.html#84-web-busca) | Desktop web | 2 |

### Mercado (4)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Mercado: descobrir e anunciar](../design/visual-guide-2026-09-06/flows.html#11-mobile-mercado) | Mobile | 3 |
| [Web: Mercado](../design/visual-guide-2026-09-06/flows.html#13-web-mercado) | Desktop web | 1 |
| [Produto e novo anúncio web](../design/visual-guide-2026-09-06/flows.html#63-web-mercado-anuncio) | Desktop web | 2 |
| [Editar e pausar anúncio web](../design/visual-guide-2026-09-06/flows.html#64-web-mercado-edicao) | Desktop web | 2 |

### Meu negócio (4)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Meu negócio: operação do prestador](../design/visual-guide-2026-09-06/flows.html#22-mobile-meu-negocio) | Mobile | 3 |
| [Web: painel do negócio](../design/visual-guide-2026-09-06/flows.html#23-web-meu-negocio) | Desktop web | 1 |
| [Web: catálogo e conta do prestador](../design/visual-guide-2026-09-06/flows.html#78-web-prestador-operacao) | Desktop web | 2 |
| [Web: indicar e aceitar prestador](../design/visual-guide-2026-09-06/flows.html#79-web-indicar-prestador) | Desktop web | 2 |

### Meus anúncios (2)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Meus anúncios: gerenciar e encerrar](../design/visual-guide-2026-09-06/flows.html#20-mobile-meus-anuncios) | Mobile | 3 |
| [Web: gestão dos próprios anúncios](../design/visual-guide-2026-09-06/flows.html#21-web-meus-anuncios) | Desktop web | 1 |

### Moradia (3)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Imóveis: buscar, avaliar e criar alerta](../design/visual-guide-2026-09-06/flows.html#18-mobile-imoveis) | Mobile | 3 |
| [Web: detalhe de imóvel](../design/visual-guide-2026-09-06/flows.html#19-web-imoveis) | Desktop web | 1 |
| [Busca de imóveis e alertas web](../design/visual-guide-2026-09-06/flows.html#65-web-imoveis-alertas) | Desktop web | 2 |

### Operação (3)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Operação de admissões](../design/visual-guide-2026-09-06/flows.html#57-web-operacao-admissoes) | Desktop web | 2 |
| [Operação de denúncias](../design/visual-guide-2026-09-06/flows.html#58-web-operacao-moderacao) | Desktop web | 2 |
| [Web: operar chegadas e transferências](../design/visual-guide-2026-09-06/flows.html#85-web-arrivals) | Desktop web | 2 |

### Pedidos de serviço (2)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Pedido de serviço: criar e acompanhar](../design/visual-guide-2026-09-06/flows.html#16-mobile-pedido-servico) | Mobile | 3 |
| [Web: acompanhamento de pedido](../design/visual-guide-2026-09-06/flows.html#17-web-pedido-servico) | Desktop web | 1 |

### Perfil e configurações (6)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Perfil próprio, edição e outro membro](../design/visual-guide-2026-09-06/flows.html#49-mobile-perfil) | Mobile | 3 |
| [Preferências e controles da conta](../design/visual-guide-2026-09-06/flows.html#50-mobile-configuracoes) | Mobile | 3 |
| [Perfis web](../design/visual-guide-2026-09-06/flows.html#51-web-perfil) | Desktop web | 2 |
| [Configurações e conta web](../design/visual-guide-2026-09-06/flows.html#52-web-configuracoes) | Desktop web | 2 |
| [Web: convidar a família](../design/visual-guide-2026-09-06/flows.html#76-web-familia) | Desktop web | 2 |
| [Web: pedir ajuda com canal real](../design/visual-guide-2026-09-06/flows.html#77-web-ajuda) | Desktop web | 2 |

### Retorno (2)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Notificações, salvos e alertas](../design/visual-guide-2026-09-06/flows.html#53-mobile-retorno) | Mobile | 3 |
| [Notificações e salvos web](../design/visual-guide-2026-09-06/flows.html#54-web-retorno) | Desktop web | 2 |

### Serviços (2)

| Prancha | Plataforma | Telas |
|---|---|---|
| [Explorar e busca de serviços web](../design/visual-guide-2026-09-06/flows.html#61-web-explorar-servicos) | Desktop web | 2 |
| [Ficha do prestador e novo pedido web](../design/visual-guide-2026-09-06/flows.html#62-web-prestador-pedido) | Desktop web | 2 |
