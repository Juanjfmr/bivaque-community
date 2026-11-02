# Cobertura do Figma atual — 06/10/2026

Referência: [Bivaque — Protótipo Mobile e Web](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque).
Página Web `7:5` (01 · Web), Mobile `7:6` (02 · Mobile).
Este documento reconcilia referências com o card FIGMA-WEB-ATUAL (sucessor de RECON-PRANCHAS-RESTANTES, que segue done na main);
não é outra fila e não declara entrega funcional.

## Evidência e limites

Levantamento somente leitura do subagente GPT-6 Luna, solicitado pelo dono,
concluído em 06/10/2026: metadados das duas páginas, contextos e screenshots via
Figma MCP, com skills figma-use/design-to-code. IDs abaixo são os retornados no
levantamento; coordenador registra a proveniência, sem alegar que repetiu cada inspeção.
Metadados e screenshots comprovam telas e estados, não as conexões do Player.
Fluxos clicáveis e runtime da aplicação continuam exigindo prova separada.
Quantidades brutas de frames incluem modais, variantes e estados; não medem conclusão.

## Referências principais

| Módulo atual | Web | Mobile | Situação da aprovação atual |
|---|---|---|---|
| Início | [9:5](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=9-5) | 10:5 | Cobertura funcional e visual integral ainda não comprovada |
| Busca | [9:84](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=9-84) | 10:59 | Reconciliar rota e experiência; não presumir hub Explorar histórico |
| Desapegos | [51:5158](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=51-5158) | 58:35073 | Vincular contrato atual antes de despacho |
| Negócios / serviços e empresas | [50:1460](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=50-1460) | 58:33523 | Conversa provider provada em FIGMA-001; restante ainda não aprovado como módulo |
| Imóveis | [51:4304](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=51-4304) | 58:34485 | FIGMA-002 ativo; provas finais pendentes |
| Encontros / eventos | [51:6195](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=51-6195) | 58:35890 | Vincular contrato atual antes de despacho |
| Guias | [51:7447](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=51-7447) | 58:36914 | Nome do frame e conteúdo divergem; não despachar RECON-030 sem reconciliar |
| Você / perfil | [52:5938](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=52-5938) | 58:39408 | Vincular contrato atual antes de despacho |
| Configurações | [52:8151](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=52-8151) | 58:40632 | Vincular contrato atual antes de despacho |
| Entrar | [47:1448](https://www.figma.com/design/niuOHiHkyc9eGaIQBY9hq4/Bivaque?node-id=47-1448) | 51:2710 | Validar entrada e retorno na experiência atual |
| Conversas | 221:43251, 221:43431, 221:43609 | 221:72075, 221:72159, 221:72241 | FIGMA-001 ciclo funcional provado; confiabilidade permanece pendente |

## Estados e jornadas a vincular aos contratos

| Módulo | Referências adicionais Web / Mobile | Jornada necessária |
|---|---|---|
| Desapegos | criar 57:32834 / 61:29764; filtros 57:33592 / 61:30797; revisar/editar 57:36347,57:36463 / 61:32931,61:33050; encerrar 64:38144 / 64:63115; detalhe 55:16858 / 60:14482 | Buscar, filtrar, publicar após revisão, editar fotos e anúncio, interessar-se, conversar e encerrar |
| Negócios | cadastro 57:33236 / 61:30443; filtros 57:33675 / 61:30879; editar/revisar 57:37399,57:37520 / 61:33983,61:34103; detalhe 53:10932 / 59:5687 | Cadastro/ficha, busca, pedido, proposta e resposta com dois atores |
| Propostas | Web 64:36826,64:37379; resultados 129:42529,129:42917,129:43305,129:43693 | Aceita, negada, expirada e serviço concluído; persistência e autorização |
| Encontros | calendário 56:26166 / 61:19247; criar/revisar/editar 57:33002,57:37041,57:37165 / 61:30210,61:33627,61:33750; presença Web 64:35131,64:35720,64:36271; meus encontros 131:41573 / 131:68389 | Calendário, publicação, edição, presença/vagas/cancelamento e retorno |
| Pergunta ao organizador | 87:63366,87:63424,87:63482,87:63540 / 87:63599,87:63657,87:63715,87:63773 | Enviar, aguardar, falhar/retomar e receber resposta |
| Guias / memória | artigos 54:13925,54:14539,54:15137 / 60:7995,60:8403,60:8803; contribuição 57:32764 / 61:29694 | Confirmar relação entre Memória, Guias, contribuição e curadoria antes de traduzir contrato antigo |
| Perfil | editar 57:34526 / 61:31711; Força 88:62521 / 88:62680; OM 91:39364 / 91:63696; excluir conta 131:42428 / 131:69147 | Editar, visibilidade de dados e exclusão conforme contrato técnico aprovado |
| Entrada | vínculo Web 47:1519; contexto/combinados 52:9338,52:9436; código Mobile 58:30435; vínculo/CPF/família 58:30584,58:30665,58:30731 | Cadastro, confirmação, consentimento, elegibilidade e retomada |
| Documento | 86:38584,86:38642,86:38700,86:38758,86:38816,86:38874 / 86:62649,86:62707,86:62765,86:62823,86:62881,86:62939 | CPF indisponível, envio/seleção, análise, ilegível e acesso confirmado; separar bloqueio externo de telas |
| Retorno | salvos 52:6561 / 58:39887; atividade 52:6940 / 58:40052; acompanhamento 56:31977,57:25508,57:26640,57:27443 / 61:23203,61:23699,61:24575,61:25115 | Salvar, reencontrar, acompanhar status e abrir destino/contexto corretos |
| Falhas de Conversas | 237:46606,237:46749,237:46887,237:47035 / 237:78993,237:79040,237:79082,237:79134 | Reconciliar cada estado com erro, bloqueio e retomada reais |

## Divergências descobertas

- O levantamento não encontrou frame principal chamado Explorar; encontrou Busca.
  Não autoriza inventar um hub a partir do processo antigo.
- Não encontrou destino principal Comunidades nas páginas inspecionadas.
  Membros/solicitações e perguntas à cidade não justificam restaurar esse nav.
- Lateral capturada: Início, Memória, Negócios, Imóveis, Desapegos, Encontros,
  Guias e Benefícios. Esse catálogo deve ser confrontado com as telas atuais;
  não substituir pela navegação histórica de quatro containers.
- Frame Guias capturado contém título Memória do Bivaque. Referências de artigos
  existem; relação entre essas superfícies precisa ser resolvida por inspeção atual.
- Conversas no topo coincide com a decisão explícita do dono.
- Benefícios, Memória como módulo separado e perguntas à cidade ainda precisam
  de inventário detalhado. Ausência nesta tabela não significa fora do produto.

## Critério de avanço

Antes do próximo lote: selecionar no card existente, abrir referências atuais,
reconciliar divergências e registrar no contrato node IDs, rotas, estados, ações,
backend necessário e critério de comparação. Não usar este inventário estático como
prova de clique. Capturas 375/768/1440, comparação com Figma, ciclo com persistência,
falhas/retomadas e negação real fazem parte da conclusão web de cada lote.
Mobile consta como referência de cobertura, não como implementação entregue por este lote web.

## Complemento: destinos configurados no protótipo

GPT-6 Luna consultou `reactions` pela Plugin API em modo somente leitura, após
carregar a skill figma-use. Este complemento distingue configuração de destino
de navegação executada no Player; não prova runtime ou persistência.

| Superfície | Web / Mobile | Destinos observados e limites |
|---|---|---|
| Memória | 52:3450 / 58:37447 | Perguntas/experiências, busca de conversas e Perguntar. Web liga a Guias 51:7447 e Guias retorna a Memória. Ambas abrem contribuição 57:32657. Mobile aponta para 58:37447; a inspeção não encontrou entrada para Guias 58:36914 |
| Benefícios | 52:5123 / 58:38815 | Lista com busca, categorias, validade e condições; Web links para oito detalhes 56:22190,56:22694,56:23190,56:23686,56:24182,56:24678,56:25174,56:25670. Mobile detalhes 61:16843,61:17147,61:17447,61:17747,61:18047,61:18347,61:18647,61:18947; retornos à lista configurados |
| Perguntas à cidade | Modal 90:39118 / 90:63942; revisão 90:39253 / 90:64076 | SWAP para revisão; NAVIGATE para fio 90:39335 / 90:64157; destinos de resposta 93:65178 / 93:66499 e resultado 93:65729 / 93:66815; retornos resposta/fio. Alcance mostrado: membros da cidade, não internet pública |
| Filtros imóveis | 57:33489 / 61:30695 | Catálogo abre overlay de filtro e resultados por critérios 56:28892 / 61:21099; vazio 56:29839 / 61:21854 tem escape para busca |
| Detalhe imóveis | Exemplo 54:20318 / 60:11882 | Seis links de mídia em cada catálogo levam aos detalhes; Mobile CTA publicar aponta a 61:29935. Referências Web de publicação/revisão/edição permanecem no contrato FIGMA-002 |

O diagnóstico anterior de Guias fica refinado: há dois módulos distintos no canvas,
com títulos parcialmente sobrepostos, e links Web nos dois sentidos. O frame Mobile
de Guias aparenta estar sem entrada nas reações consultadas; registrar como lacuna
de acessibilidade pelo protótipo, sem inferir remoção de escopo ou criar regra de negócio.
Benefícios e perguntas à cidade entram na cobertura do produto com estas referências,
mas ainda exigem contrato reconciliado, implementação e provas de fechamento.

## Home: reconciliação antes do próximo despacho

Levantamento somente leitura do Luna, concluído em 06/10/2026, sobre os frames
Web `9:5` e Mobile `10:5`, screenshots e reações atuais. A Home mostra “Perto de você”:
cidade, busca, Anunciar, Preciso resolver, intenções, anúncios da cidade, andamento,
Memória, Conversas e Serviços e negócios.

| Ação atual | Destino Web / Mobile observado |
|---|---|
| Buscar | 9:84 / 10:59 |
| Cidade | Overlay Web 57:31209 |
| Anunciar | Overlay Web 57:32834 (Publicar desapego) |
| Preciso resolver | Web 57:30756 |
| Mudar, Resolver, Comprar/vender, Conhecer | 52:9524,52:9971,52:10506,53:6541 / 58:41549,58:41797,58:42127,58:42436 |
| Desapegos e Imóveis | 51:5158,51:4304 / 58:35073,58:34485 |
| Memória | 52:3450 / 58:37447 |
| Conversas | 221:43251 / 221:72075 |
| Explorar em Serviços e negócios | 50:1460 / 58:33523 (Negócios, não hub histórico) |

Confronto de código pelo Luna: `(shell)/inicio/page.tsx`, `community-section.tsx`,
`return-strip.tsx` e `right-rail.tsx` ainda integram saudação, publicação/feed de
comunidade, notificação e evento/Guia/Pedir ajuda. RECON-002 aponta à prancha antiga;
RECON-003 descreve o antigo hub Explorar. Não usar esses layouts como autoridade atual.

Capacidades existentes identificadas: contexto de cidade, eventos/RSVPs e notificações;
FIGMA-002 possui loaders de imóveis ativos e URLs de mídia autorizadas. Busca de
prestadores existe em rota anterior. Isso não comprova integração Home, feed Desapegos,
busca global, salvos ou critérios atuais. Confirmar capacidades reais antes do contrato.

Próximo candidato: reconciliar o lote de Início com este frame Web e seus destinos,
usando Mobile como referência de adaptação; reaproveitar dados compatíveis, com estados
de carregamento/vazio/falha reais. Módulo de imóveis depende da conclusão independente
de FIGMA-002; Desapegos e demais destinos precisam de suporte confirmado. Não inventar
um hub Explorar, cartões fictícios ou resultados para preencher a composição.
Este registro prepara o próximo contrato; não despacha outro escritor nem declara Home pronta.

### Capacidades da Home confrontadas pelo Luna — 06/10/2026

Levantamento somente leitura de código e migrations; não é prova de runtime.
A busca atual encaminha a `/explorar` e pesquisa prestadores em
`/explorar/servicos`; isso não entrega a Busca global do frame atual.
O contexto de cidade existe, mas `/localidade` não comprova mudança persistida
de cidade nem substitui a intenção “Mudar”. Pedidos e respostas existem em
`/recommendations`, com RLS; precisam ser ligados às intenções atuais.

Imóveis tem loaders e ações no lote FIGMA-002. O enum `item` não comprova
Desapegos: não foram encontradas criação, catálogo e detalhe web equivalentes.
A Home não pode apresentar “Todos” como feed completo antes desse ciclo.
O ReturnStrip atual usa notificações; não entrega “Meu andamento” do Figma.
O Guia de chegada curado também não entrega o módulo Memória.
Conversas possui inbox e thread reais, mas não foi identificado mecanismo
de leitura que sustente contagem de mensagens não lidas.
Serviços e negócios pode reaproveitar pesquisa e ficha de prestadores;
a ligação com os cartões e destinos da Home ainda precisa ser entregue.

Estas dependências entram nos contratos do mesmo card de reconciliação.
Não preencher a Home com dados fictícios, notificação rebatizada como andamento
ou Guia rebatizado como Memória. A conclusão funcional de Imóveis exige revisão
e prova independente; as demais capacidades precisam de seus próprios ciclos.

### Desapegos: próximo lote preparado, não despachado — 06/10/2026

Inventário somente leitura do Luna, usando contexto Figma atual e reactions.
Destinos configurados não comprovam Player nem persistência em runtime.

| Estado | Web | Mobile |
|---|---|---|
| Catálogo Desapegos | 51:5158 | 58:35073 |
| Filtros | 57:33592 | 61:30797 |
| Publicar | 57:32834 | 61:29764 |
| Revisar sem persistir | 57:36347 | 61:32931 |
| Editar formulário | 57:36463 | 61:33050 |
| Detalhe de item | 55:16858 | 60:14482 |
| Meus anúncios | 52:7383 | 58:40270 |
| Confirmar encerramento | 64:38144 | 64:63115 |
| Estado encerrados | 64:38276 | 64:63248 |
| Salvos | 52:6561 | 58:39887 |

Catálogo: cidade, chips Todos/Móveis/Eletrodomésticos/Eletrônicos/Infantil/Lazer,
ordenação Mais recentes, cards com bairro/título/valor/condição/anunciante e Salvar.
Filtros têm valores mínimo/máximo e condição, Limpar e Aplicar reais.
Buscar está configurado para Busca global 9:84/10:59; não inventar busca local
como destino comprovado. Valores e nomes do canvas são exemplos, não seed.
Publicar coleta título, valor (zero significa doação), categoria, condição,
bairro de retirada, descrição, audiência e até 12 fotos; revisão não persiste
antes de confirmar. Detalhe inclui disponibilidade/retirada, contato, reportar
e compartilhar. Localização continua apenas cidade/bairro, sem endereço.

Banco reutilizável: listings kind=item, estados/audiência, mídia genérica,
interesse contextual e o ramo genérico de salvos/moderação em construção no 002.
Ainda faltam ciclo web de itens e rotas de catálogo/detalhe/Meus anúncios.
Loaders e actions atuais são específicos de property; enum item não entrega UI.
RECON-025/026 ajudam como guardrails, mas seus layouts antigos não governam o lote.
Antes de despachar, registrar rota Next e representação/constraints dos dados
de item (categoria/condição/preço-doação/retirada/disponibilidade), confrontando
ADRs aprovados e eventual adendo técnico R3; não reabrir estados ou cidade/bairro.
O zero autorizado para doação não se aplica aos custos ausentes de Imóveis.

Fechamento: publicar/buscar/filtros/detalhe/editar, falha que preserva formulário,
interesse idempotente com retorno à conversa, salvar/reportar/retorno Salvos,
encerrar e retorno ao estado correto. Negativas diretas de audiência/ator/estado,
moderação/mídia, inválidos de campos e 13ª foto precisam de prova real.
Preparação no mesmo card; nenhum segundo escritor, migration ou teste iniciou
por este inventário enquanto Spacebunny integra o lote 002.
