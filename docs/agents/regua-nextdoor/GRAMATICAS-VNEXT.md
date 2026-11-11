# Design vNext — gramáticas por jornada F01–F10

> **Documento de alternativas, não de novas funcionalidades.** A fonte de escopo é `docs/LANCAMENTO.md`. A identidade e as peças são as de `IDENTIDADE-DAS-PECAS.md`. Telas aprovadas não são automaticamente substituídas por estas hipóteses. Avaliar com o método [DESIGN-VNEXT](DESIGN-VNEXT.md).

## O vocabulário compartilhado

- **Explorar**: possibilidades paralelas, categorias e vizinhança contextual; permite grade, trilho, mapa quando fizer sentido. Não renderizar inventário fictício.
- **Localizar**: busca com escopo explícito, filtros utilizáveis, resultados agrupados e retorno que preserve estado.
- **Participar**: autor e contexto, conteúdo, pergunta/resposta e ação de contribuir; prefere leitura contínua a marketing.
- **Decidir contato**: informação verificável, atributos comparáveis e um próximo passo claro; nenhuma avaliação ou prova social inventada.
- **Agendar**: tempo, evento, presença e disponibilidade com feedback de mudança de estado; não pressupor pagamento nem reserva se o domínio não as prevê.
- **Operar**: estados, filas, prioridade e ações auditáveis; mais densidade em desktop, menos ornamento.
- **Ler**: linha editorial e progressão do conteúdo, sem transformar cada parágrafo em cartão.
- **Conversar**: continuidade cronológica, contexto da origem, composer próximo ao texto e falha recuperável.

A gramática vem da tarefa. A identidade vem das peças. Um card é apropriado onde agrega um objeto acionável; uma linha plana é apropriada quando uma lista contínua é mais escaneável.

## F01 — Entrada e onboarding

**Tarefa:** autenticar, entender o vínculo, selecionar cidade/momento, receber orientação inicial, retomar pendência.
**Contrato vigente:** F01 aprovado/reconstruído, `PADRAO-DE-TELA.md`, política de dados, ilustrações de recorte e campos da biblioteca.
**Composição preferencial vigente:** foco em uma decisão por etapa, progresso claro, contexto separado no desktop conforme padrão aprovado, no mobile ação acessível no rodapé.
**Experimento futuro:** testar densidade e extensão dos textos sem alterar ordem, segurança ou estados aprovados. Não trazer de volta a tela de cartão centrado genérico; não antecipar novas jornadas.
**Fixture/prova:** erro no código, retomada de sessão, texto de esclarecimento, falta de permissão, teclado aberto, 320/375 e desktop.

## F02 — Início e busca

**Tarefa:** encontrar rápido algo útil na cidade, retomar participação e passar para o conteúdo.
**Opção A — Exploração contextual:** localidade → atalhos substantivos por intenção → prévia de atividade/conteúdo real → trilhos de descoberta quando houver volume.
**Opção B — Busca orientada:** busca e sugestões por categoria/tarefa → resultados tipados → filtros em sheet; caminho curto até conteúdo específico.
**Trade-off:** A beneficia navegação sem termo exato; B beneficia usuário com destino. Testar cold start (0, 1, 20 registros), 320/375, exposição de itens reais na primeira dobra, tempo até pergunta/negócio/imóvel.
**Não fazer:** painel de métricas artificiais, caixa de busca gigante seguida por cartões gigantes, “continuar onde parou” sem ação real.

## F03 — Criar

**Tarefa:** selecionar tipo existente (pergunta, publicação, evento, anúncio), preencher, revisar, publicar e recuperar rascunho/falha.
**Opção A — Escolha em lista:** linhas com consequência clara; abre editor contextual sem trocar universo visual.
**Opção B — Atalho contextual:** criar a partir de onde o usuário estava e editar com contexto herdado, sempre com rota de saída clara.
**Prova:** entrada pela barra e pelo contexto; rascunho, upload, validação, erro de rede, publicar; voltar preserva o que foi feito.
**Não fazer:** wizard obrigatório para ações simples nem botões decorativos que aparentam tipos não suportados.

## F04 — Comunidade e grupos

**Tarefa:** encontrar pergunta/grupo, ler contexto, contribuir, salvar e acompanhar resposta.
**Opção A — Mural de perguntas:** linhas de conteúdo com assunto, quem pergunta e escopo; grupos acessados por destino próprio.
**Opção B — Hub por participação:** agrupamento por cidade e grupos seguidos com retorno de atividade contextual; pergunta continua ação central.
**Trade-off:** mural favorece descoberta de conhecimento; hub favorece recorrência. Preservar opções de entrada e regras de moderação; não criar feed aberto nem ranking.
**Prova:** títulos longos, avatar sem foto, resposta encadeada, “Útil”, conteúdo oculto, pedido de entrada em grupo, erro de permissão.

## F05 — Eventos

**Tarefa:** encontrar encontro da cidade, conferir quando/onde, confirmar ou cancelar presença e pedir informações.
**Opção A — Linha temporal:** próximos eventos agrupados por data; destaque de data/horário sem card por evento obrigatório.
**Opção B — Agenda visual:** dias em faixa curta, eventos no dia, navegação e visão de lista alternativa.
**Trade-off:** sequência funciona melhor com poucos eventos; agenda com distribuição temporal densa. Não confundir com reserva de quadra do módulo Clubes, fora desta jornada.
**Prova:** evento sem capa, alteração de lotação quando aplicável, confirmação/cancelamento, retorno à data filtrada, localidade e fuso.

## F06 — Mercado e moradia

**Tarefa:** comparar desapegos/imóveis, aplicar filtros, ver atributos reais, sinalizar interesse/abrir conversa.
**Opção A — Lista rica:** linhas ou cartões com foto verificável, preço quando disponível e atributos prioritários.
**Opção B — Exploração espacial:** mapa/lista para imóveis com localização permitida; diferença entre endereço aproximado e exato consentido.
**Trade-off:** lista funciona com dados escassos; mapa é útil apenas com coordenadas permitidas, sem induzir precisão falsa.
**Prova:** anúncio incompleto, imagens de tamanhos diversos, quantidade e preço, filtros/ordenação, privacidade de endereço, retorno depois do contato.

## F07 — Negócios e serviços

**Tarefa:** localizar prestador, entender confiança/indicação, contactar ou enviar solicitação e acompanhar.
**Opção A — Diretório categorizado:** lista densa com nome, atividade, cidade e evidência de indicação.
**Opção B — Busca por necessidade:** pergunta “o que precisa resolver?”, categorias e resultados compatíveis, contexto de origem.
**Prova:** negócio não reivindicado, prestador sem foto, múltiplos serviços, categoria vazia, recomendação sem rating fictício e permissões de negócio.
**Não fazer:** copiar e-commerce, exibir estrelas fabricadas, prometer orçamento fechado ou pagamento no app.

## F08 — Guia

**Tarefa:** ler informações úteis sobre cidade, encontrar categoria, salvar e sugerir atualização.
**Opção A — Editorial:** título e leitura contínua, subtítulos claros, índice quando necessário.
**Opção B — Diretório utilitário:** busca/categorias e verbetes compactos com acesso direto.
**Prova:** artigo longo, fontes/contexto, sugestão de correção, textos incompletos e navegação para origem.
**Não fazer:** todos os parágrafos dentro de cards ou encher página com imagem stock sem relação com conteúdo.

## F09 — Conversas e avisos

**Tarefa:** recuperar conversa contextual, responder e abrir aviso no conteúdo de origem.
**Opção A — Caixa cronológica:** conversas compactas com sinal de não lida e contexto, detalhe à parte no mobile.
**Opção B — Duas áreas no desktop:** lista simultânea à conversa, sem esticar balões, mantendo o mesmo modelo mobile.
**Prova:** conversa vazia/longa, envio pendente/falho, teclado Android, perda de rede, volta para origem e anúncio bloqueado.
**Não fazer:** confirmação de leitura/presença fora do escopo; cards encapsulando cada balão ou animação que obscureça mensagens.

## F10 — Você, família e conta

**Tarefa:** ver/editar perfil, administrar família, salvos, preferências, bloqueios e exclusão de conta.
**Opção A — Configuração em grupos de linhas:** categorias compactas e ações explícitas; estados sensíveis separados.
**Opção B — Contexto pessoal + tarefas:** resumo de vínculo próprio e atalhos para as tarefas relevantes, sem painel de métricas ou exposição pública de dados militares.
**Prova:** dados faltantes, permissões por conta, saída/convite familiar, exclusão destrutiva, acessibilidade e retorno.
**Não fazer:** mascote, avatar simulado, badge de prestígio ou confundir perfil de pessoa com painel de fornecedor.

## Observações de cobertura

- **Bivaque Clubes e a gestão interna** têm contratos próprios e não devem ser encaixados nas dez jornadas da Comunidade ou receber a mesma gramática de mural. Reservas/agenda de instalações são diferentes de presença em eventos.
- A **land​​ing pública** é superfície de apresentação e tem autorização própria: Taste Skill ajuda em direção de arte, mas seus padrões de marketing não são os padrões do app.
- Sempre documentar o que um padrão externo resolve melhor, o que falha no Bivaque e qual parte seria adaptada.
- As opções A/B são **hipóteses**, não telas aprovadas nem backlog de implementação.
