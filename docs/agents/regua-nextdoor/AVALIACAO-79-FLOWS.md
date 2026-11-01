# Régua Nextdoor — avaliação dos 79 flows

Gerado a partir dos dados do artefato https://claude.ai/artifact/MRGjLpXK2Pyf7L2sJkkort (versão 2, 01/11/2026). O artefato é a fonte viva: as respostas do dono (Aceito/Rebato, argumento e decisão) ficam na coleção `respostas`, com o id `f-<8 primeiros caracteres do id do flow>`.

Base do lado Bivaque: protótipo HTML R72 (`prototypes/bivaque-html`), não o `apps/app`. Dimensões na ordem Funcionalidade · Praticidade · Interface · Clareza.

Placar: 14 no nível · 29 abaixo da régua · 36 ausentes.

## Entrada e conta

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Onboarding](https://mobbin.com/flows/68adea93-572d-468c-b5ce-ec9663370485) `f-68adea93` | Abaixo da régua | pior · igual · igual · igual | Conta, aceite (Google), CPF, resultado, cidade e momento, boas-vindas. | Termina com sugestões de grupos e fontes para seguir, e um checklist de primeiros passos com progresso no Início. | Verificação por CPF e o “momento” (chegando, morando, saindo) dão mais confiança e contexto. | **Implementar**: Sugerir grupos e o encontro de boas-vindas no fim do cadastro, e um checklist de primeiros passos no Início. |
| [Logging in](https://mobbin.com/flows/51617ea5-3575-4676-86bd-e3a8caa7ae52) `f-51617ea5` | No nível | igual · igual · igual · igual | Google ou e-mail e senha. A tela não foi capturada (o protótipo abre já logado); avaliado pelo código. | Mais opções (Apple, Facebook) e entrada por código no e-mail, sem senha. | — | **—** |
| [Logging out](https://mobbin.com/flows/3680731d-ca7a-462e-99f3-4cae268f4280) `f-3680731d` | No nível | igual · igual · igual · igual | Sair, em Você. | — | — | **—** |
| [Requesting notifications](https://mobbin.com/flows/503b73f0-3f69-49d2-95cf-c19b835640f4) `f-503b73f0` | No nível | igual · igual · igual · melhor | Pedido de permissão com explicação, Ativar e Agora não. | — | Explica para que servem os avisos antes de pedir. | **—** |
| [Inviting a neighbor](https://mobbin.com/flows/9656f8b2-d139-4902-a8ab-9bdc9538f506) `f-9656f8b2` | Ausente | — | Só existe convite de família e link para grupo. | Lista de endereços próximos, cada um com Convidar. | — | **Decisão sua**: Acelera o crescimento, e todo convidado ainda passa pela verificação. Decidir se abre convite para colegas. |

## Início e feed

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Home](https://mobbin.com/flows/f3c0a105-1443-4497-9f1c-20aa376762aa) `f-f3c0a105` | Ausente | — | O Início é uma central de necessidades: busca, atalhos, contratar, serviços recomendados. | Feed do bairro com notícias, publicações, eventos e itens à venda. | — | **Implementar**: Seção “Acontecendo na cidade”: perguntas sem resposta, próximos encontros, desapegos novos e novidades dos seus grupos. Sem timeline social aberta. |
| [Filtering posts (home)](https://mobbin.com/flows/b82c0a79-d438-4145-9d9e-84f788ca0304) `f-b82c0a79` | Ausente | — | Sem feed, não há o que filtrar. | Ordenar o feed por Para você, Recentes, Perto e Em alta. | — | **Implementar**: Junto com a seção acima: Recentes e Perto de você. |
| [Post detail](https://mobbin.com/flows/f2e0310e-3db2-4ff5-94bf-c056533b7d79) `f-f2e0310e` | Abaixo da régua | pior · pior · pior · igual | Publicação no grupo com “Útil” e comentários em lista. A caixa de comentar fica no fim da página. | Barra de comentário fixa no rodapé, curtir e responder cada comentário, reações rápidas, foto, local e @ no comentário. | Selo do tipo de publicação (Pergunta, Enquete, Oferta) e marcar o comentário que resolveu. | **Implementar**: Barra de comentário fixa, responder e marcar “Útil” em comentário, foto na publicação e no comentário. |
| [See more local news](https://mobbin.com/flows/d5de0a4b-fabf-4bce-974c-fd4b58b705cd) `f-d5de0a4b` | Ausente | — | Não há notícias locais. | Notícias de veículos locais verificados, com comentários. | — | **Não implementar**: Exige parceria com veículos e curadoria. Fora do foco do produto. |
| [Watching a video](https://mobbin.com/flows/53b07942-ab9f-4776-9e28-44c274711d35) `f-53b07942` | Ausente | — | Não há vídeo. | Vídeo no feed e no Faves. | — | **Não implementar**: Custo de armazenamento e de moderação sem ganho claro para este público. |

## Publicar e interagir

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Creating a post (poll)](https://mobbin.com/flows/5bff685e-bf8a-4f10-8f58-601cec9e82ce) `f-5bff685e` | Abaixo da régua | pior · igual · igual · igual | Enquete só dentro de grupo, numa folha com os tipos de publicação. | A enquete vai para o bairro inteiro pelo botão Publicar e aparece no feed, com estatísticas. | Mostra “Quem vê” antes de publicar. | **Implementar**: Prazo de encerramento e resultado ao fim. Publicar enquete para a cidade inteira, fora de grupo, fica para você decidir. |
| [Creating a post (event)](https://mobbin.com/flows/e258bc98-834d-4cce-b62a-cbc96c477653) `f-e258bc98` | Abaixo da régua | pior · igual · igual · igual | Nome, data, horário, local, vagas e descrição, numa folha. | Foto de capa, horário de término e link de chamada de vídeo. | Limite de vagas. | **Implementar**: Foto de capa e horário de término. |
| [Creating a post (sell or give away)](https://mobbin.com/flows/e1bd32fb-c68c-4ae7-8b65-16e47d05571c) `f-e1bd32fb` | Abaixo da régua | pior · pior · igual · igual | Folha longa: título, preço obrigatório, bairro, categoria, estado, retirada, descrição e fotos. | Começa pela foto (até 10, arrastar para ordenar, escolher capa), interruptor Grátis e local de retirada no mapa. | Rascunho, data de retirada (transferência) e só o bairro aparece. | **Implementar**: Fotos como primeiro passo, interruptor Grátis (doação) e filtro Grátis em Desapegos. |
| [Deleting a post](https://mobbin.com/flows/92b018a9-3858-488e-8ef4-4640552b3ac2) `f-92b018a9` | No nível | igual · igual · igual · igual | Apagar pelo menu da publicação. | — | — | **—** |
| [Adding a comment](https://mobbin.com/flows/a0263dfd-ec72-4a91-b9b1-d9bce04e99ba) `f-a0263dfd` | Abaixo da régua | pior · pior · pior · igual | Campo de texto no fim da publicação, só texto. | Barra fixa sempre visível, reações rápidas, foto, local e @. | — | **Implementar**: Junto com Post detail: barra fixa e foto no comentário. |
| [Deleting a comment](https://mobbin.com/flows/d6a56a7b-75f8-40b7-ac92-49fbe029b067) `f-d6a56a7b` | No nível | melhor · igual · igual · igual | Editar e apagar o próprio comentário. | — | Também permite editar o comentário. | **—** |
| [Hiding comments (fechar discussão)](https://mobbin.com/flows/df4ba9c2-fd5f-439f-8e8a-0afa6fb17c0c) `f-df4ba9c2` | Ausente | — | Só o admin fecha o grupo inteiro. | O autor fecha a discussão da própria publicação. | — | **Implementar**: Barato e reduz conflito quando uma publicação vira discussão. |
| [Reacting to a post](https://mobbin.com/flows/81bee0bc-d660-43bb-9c77-0ccbcda6af6c) `f-81bee0bc` | Abaixo da régua | pior · igual · igual · igual | Só “Útil”. | Seis reações rápidas. | “Útil” comunica o que importa nesta comunidade. | **Não implementar**: Reações variadas puxam para rede de entretenimento. |
| [View reactions](https://mobbin.com/flows/4c5648a8-7bdb-45d8-8c19-ae2705655b8b) `f-4c5648a8` | Ausente | — | Só aparece a contagem de “Útil”. | Lista de quem reagiu, por tipo de reação. | — | **Não implementar**: Listar quem reagiu expõe membros de uma base sensível. |
| [Saving a post](https://mobbin.com/flows/1a62552c-0bf1-40ec-b63a-c3acc0f40085) `f-1a62552c` | No nível | igual · igual · igual · igual | Salvar publicação, com lista em Salvos. | — | — | **—** |
| [Sharing a post (com vizinhos)](https://mobbin.com/flows/b278d4f1-98e7-4915-91c2-264f86cff9c6) `f-b278d4f1` | Ausente | — | Compartilhar por link, imagem ou WhatsApp existe. Enviar para vizinhos pelo endereço, não. | Enviar a publicação para vizinhos próximos pelo endereço. | — | **Não implementar**: Exige base de endereços de quem não é membro. Problema de LGPD. |
| [Hiding a post](https://mobbin.com/flows/eaeeddd3-e48a-463a-b4d0-335e069e26a5) `f-eaeeddd3` | Abaixo da régua | pior · igual · igual · igual | Ocultar só existe para perguntas de indicação. | Ocultar qualquer publicação, com confirmação e aviso. | Lista de Ocultados para desfazer. | **Implementar**: Ocultar publicações de grupo, com Desfazer. |
| [Post insights](https://mobbin.com/flows/93013330-f721-4986-b3f2-7d8db74e69e4) `f-93013330` | Abaixo da régua | pior · igual · pior · igual | Visitas e interessados em anúncio e negócio, só como número. | Gráfico de visitas nas primeiras 48 h, reações, comentários e dicas para alcançar mais. | Interessados ligados às conversas. | **Implementar**: Visitas por dia no anúncio. Não levar para publicações. |
| [Post insights information](https://mobbin.com/flows/a181243d-1c12-4f6d-8e43-38a9adc05745) `f-a181243d` | Ausente | — | Não explica como as visitas são contadas. | Explicação de quais publicações têm estatísticas. | — | **Implementar**: Texto curto junto das visitas do anúncio. |

## Busca

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Searching Nextdoor](https://mobbin.com/flows/38269015-73f4-4a4c-ba3e-302cfb18a394) `f-38269015` | Abaixo da régua | pior · igual · pior · igual | Chips por tipo, categorias com contagem em “Explorar em Manaus” e sugestões fixas. | “Em alta” real, atalhos com foto para cada área e resultados em abas (Publicações, Negócios, Páginas, Eventos). | Contagem por categoria na cidade. | **Implementar**: “Em alta” com as buscas da cidade e abas de resultado por tipo. |
| [Filtering posts](https://mobbin.com/flows/e5cd0cb4-aadc-4bff-ac71-48357a69d47b) `f-e5cd0cb4` | Ausente | — | Os resultados não filtram por relevância, distância ou período. | Ordem, distância (barra deslizante) e período nos resultados. | — | **Implementar**: Ordem, distância (calculada em privado) e período na busca geral. |

## Recomendações e negócios

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Neighborhood faves](https://mobbin.com/flows/7e5e34e5-47e7-4247-9b4a-642c0b04235b) `f-7e5e34e5` | Ausente | — | Negócios locais é um diretório por número de indicações. | Ranking anual votado pelos vizinhos, por categoria, com selo. | — | **Implementar**: “Favoritos da cidade”: voto de membro verificado, ranking anual por categoria com mínimo de votos e selo na ficha. Só a contagem é pública. |
| [View awards](https://mobbin.com/flows/61263e93-33d7-49b3-b561-c87e1e1de96c) `f-61263e93` | Ausente | — | Não há histórico de selos. | Selos de cada ano na página do negócio. | — | **Implementar**: Junto com Favoritos: os anos em que o negócio foi premiado. |
| [Adding a business to favorites](https://mobbin.com/flows/834af714-0c3f-4c89-8ea4-d08423159566) `f-834af714` | Ausente | — | Salvar negócio é pessoal e não conta como voto. | Botão Fave na página do negócio, que soma no ranking. | — | **Implementar**: Botão Favorito na ficha. Um voto por conta; conta de prestador não vota. |
| [Faves (IA)](https://mobbin.com/flows/0c96cbd5-83ca-4918-82eb-609a60b65a1e) `f-0c96cbd5` | Ausente | — | Não há assistente de IA nas indicações. | Coleções temáticas e campo “Pergunte aos vizinhos” respondido por IA. | — | **Decisão sua**: Depende da decisão de LGPD (D49). Se ligar, mostrar “resumido de N membros · ver fontes”. |
| [Asking AI for local favorites](https://mobbin.com/flows/80e874ae-f568-4ad3-b0f9-9c91213c3f86) `f-80e874ae` | Ausente | — | Não há pergunta respondida por IA. | Resposta resumida de N vizinhos, com fontes. | — | **Decisão sua**: Segue a decisão do Faves. |
| [Giving response feedback](https://mobbin.com/flows/c9ec26a2-98c2-4b1b-a9f6-1a23450c30e0) `f-c9ec26a2` | Ausente | — | Sem IA, sem avaliação de resposta. | Gostei e não gostei na resposta da IA. | — | **Decisão sua**: Segue a decisão do Faves. |
| [Business profile](https://mobbin.com/flows/67458713-279c-4f5f-aafa-d6f2a3c7d7f9) `f-67458713` | Abaixo da régua | pior · pior · igual · igual | Foto, categoria, benefício para a comunidade, serviços, horário em texto, WhatsApp e site, indicações, Pedir orçamento. | “Aberto até 22h”, distância e Como chegar, ligar e mensagem em um toque, galeria, prêmios, recomendações na página e negócios parecidos. | Benefício para a comunidade e Pedir orçamento. | **Implementar**: Horário estruturado com “Aberto agora”, distância e Como chegar, e negócios parecidos. |
| [Posting a recommendation](https://mobbin.com/flows/b12a50ef-727e-4be2-92d3-85ab55730c2d) `f-b12a50ef` | No nível | igual · igual · igual · igual | Indicar um negócio pelo menu Criar e pela ficha. A tela não foi capturada; avaliado pelo código. | Escrever a recomendação direto na página do negócio, com o cartão anexado. | Indicação ligada a uma pergunta da comunidade. | **—** |

## Desapegos

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [For sale](https://mobbin.com/flows/2e56bb20-11fc-4c42-862e-4390ebaf1bff) `f-2e56bb20` | Abaixo da régua | igual · pior · pior · igual | Lista com um anúncio grande por tela, filtros, mapa e ordenação. | Grade de duas colunas (quatro itens por tela), seções Novos e Destaques, chips de Grátis e distância. | Mapa, selo “Em transferência” e alerta de busca. | **Implementar**: Grade em duas colunas (ou alternar lista e grade) e seção de novos anúncios. |
| [Filtering listings](https://mobbin.com/flows/7f69f331-a88e-4af2-8c21-d6b67c36a026) `f-7f69f331` | No nível | melhor · igual · igual · igual | Categoria, faixas de preço, estado de uso e retirada, com o total no botão. | Filtro de distância. | Mais filtros, e “Ver 7 desapegos” mostra o resultado antes de aplicar. | **—** |
| [Listing detail](https://mobbin.com/flows/ccf893e0-67f1-4e69-8f47-45f2546782ec) `f-ccf893e0` | Abaixo da régua | pior · igual · igual · igual | Fotos, preço, estado, localização aproximada e Tenho interesse. | Mais deste vendedor, mais perto de você e selo de desconto. | Data de retirada e foto ilustrativa sinalizada. | **Implementar**: Mais deste vendedor, perto de você e selo de queda de preço no fim do anúncio. |
| [Saving a listing](https://mobbin.com/flows/a61ad7ba-f633-4916-ad5d-f6f8438a43e7) `f-a61ad7ba` | No nível | melhor · igual · igual · igual | Salvar anúncio; Salvos compara anúncios. | — | Comparar anúncios salvos. | **—** |
| [Sending a message (listing)](https://mobbin.com/flows/6e6683e5-c65c-43c8-b194-4d6119853e59) `f-6e6683e5` | Abaixo da régua | igual · pior · igual · igual | Tenho interesse abre a conversa; a pergunta pronta aparece como sugestão. | Mensagem pronta enviada direto do anúncio, com “Mensagem enviada · Ver conversa”. | Aviso de segurança e cartão do anúncio dentro da conversa. | **Implementar**: Enviar a pergunta pronta direto do anúncio, sem abrir a conversa. |

## Encontros

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Events](https://mobbin.com/flows/831a12d2-ff06-45cd-a591-c83c133b9293) `f-831a12d2` | Abaixo da régua | pior · igual · pior · igual | Agenda agrupada por data, filtro por momento e botão Vou. | Busca de eventos, “Seus eventos” e cartões com foto. | Filtro por momento e lista mais densa. | **Implementar**: Busca, capa nos cartões e “Meus encontros”. |
| [Event detail](https://mobbin.com/flows/fb6f0649-f5b6-4272-9354-acc9453cb22a) `f-fb6f0649` | Abaixo da régua | pior · igual · pior · igual | Local, horário, descrição, confirmados e Confirmar presença. | Capa, quem organiza, comentários, curtir e compartilhar, e outros eventos próximos. | Vagas e “sua presença” em destaque. | **Implementar**: Perguntas e comentários no encontro (o Next já tem uma rota de perguntas), quem organiza e outros encontros. |
| [Marking (an event) as going](https://mobbin.com/flows/0ccb99a7-bba4-4c39-a849-bf5f56f8c27b) `f-0ccb99a7` | Abaixo da régua | pior · igual · igual · igual | Só “Vou”. | Vou, Tenho interesse e Não tenho interesse. | — | **Implementar**: Estado “Tenho interesse”: compromisso menor e sinal para quem organiza. |
| [Your events](https://mobbin.com/flows/205d8d62-981e-4062-9a2b-464341f10fda) `f-205d8d62` | Ausente | — | Não há lista dos meus encontros. | Abas Organizo, Vou, Tenho interesse e Convidado. | — | **Implementar**: “Meus encontros” em Você. |

## Grupos

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Groups](https://mobbin.com/flows/cbd432a3-a0f2-47c9-9517-234431697fd9) `f-cbd432a3` | No nível | melhor · igual · igual · igual | Seus grupos com última mensagem e não lidas, interesses, sugeridos e populares com Entrar ou Pedir. | — | Sugestões por interesse e por momento (ex.: Chegadas 2027) e grupos fechados com pedido de entrada. | **—** |
| [Group detail](https://mobbin.com/flows/ff57021e-199a-43a0-94a5-1062718afb49) `f-ff57021e` | Abaixo da régua | pior · pior · pior · igual | Capa, regras, aviso fixado, nível de aviso, filtro por tipo. Publicações só com texto; o ícone de câmera no campo de escrever não anexa nada. | Publicações com foto, curtir e responder comentários, botão de publicar sempre visível. | Regras, aviso fixado, filtro por tipo e “Quem vê” ao publicar. | **Implementar**: Foto nas publicações, responder e marcar “Útil” em comentário, botão de publicar fixo. |
| [Joining a group](https://mobbin.com/flows/88ee2616-ba57-4ea9-a45f-5944cfeb116d) `f-88ee2616` | Abaixo da régua | pior · igual · igual · igual | Entrar ou Pedir, sem boas-vindas. | Cartões “Diga olá” e “Divulgue o grupo”, dica “Apresente-se” e progresso de 0 a 3. | Pedido de entrada em grupo fechado. | **Implementar**: Boas-vindas com “Diga olá” e “Apresente-se” para quem acabou de entrar. |

## Conversas e pessoas

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Messages](https://mobbin.com/flows/dbf00d5a-2e3e-4d28-88a2-1e0a8998c74d) `f-dbf00d5a` | Abaixo da régua | pior · igual · igual · igual | Conversas ligadas a anúncio ou serviço, fixar, marcar não lida e apagar deslizando. | Filtros Todas, Diretas e À venda, e foto na mensagem. | Contexto do anúncio, aviso de segurança e respostas rápidas. | **Implementar**: Filtro por tipo e envio de foto na conversa. |
| [Sending a message (direto)](https://mobbin.com/flows/a74bd1cb-cb4d-422e-a518-36b4a8e7aae1) `f-a74bd1cb` | Ausente | — | Não dá para abrir conversa direta com um membro. | Mensagem direta a partir do perfil de qualquer vizinho. | — | **Não implementar**: A conversa nascer de um contexto protege contra assédio. |
| [User profile (outro membro)](https://mobbin.com/flows/c71d7ad9-c6de-46a0-87e3-2369e4cade13) `f-c71d7ad9` | Ausente | — | Não há perfil público de outro membro. | Perfil do vizinho com bairro, bio, grupos e publicações. | — | **Decisão sua**: Ligado ao BLOCK-AFFILIATION. Um perfil mínimo (nome, bairro se permitido, indicações dadas) ajuda a confiança. |
| [Following a user](https://mobbin.com/flows/be6a576a-fa53-40b1-9c68-b5bfa27a75ca) `f-be6a576a` | Ausente | — | Não há seguir. | Seguir pessoas e veículos. | — | **Não implementar**: Puxa para rede de influência, não de ajuda. |

## Avisos

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Notifications](https://mobbin.com/flows/4d73dab8-e88a-4d2e-b51a-aedaf9ba6189) `f-4d73dab8` | Abaixo da régua | pior · igual · pior · igual | Folha sobre a tela com Todos e Não lidos. | Página própria com abas Vizinhança, Minha atividade e Alertas. | Marcar todos como lidos. | **Implementar**: Página própria de avisos. Separar por origem fica para você decidir. |
| [Enabling notification settings](https://mobbin.com/flows/7f794b5d-5455-4725-b461-c174ad1b501d) `f-7f794b5d` | Ausente | — | Só liga ou desliga o push. | Liga e desliga por tipo de aviso e por canal (Nextdoor, e-mail, push). | — | **Implementar**: Preferências por tipo de aviso e por canal. |
| [Notifications (business)](https://mobbin.com/flows/b256a82d-2a1b-4156-92a4-4d8e9e50693e) `f-b256a82d` | Ausente | — | O negócio não tem caixa de avisos própria. | Caixa de avisos do negócio, com convite para clientes recomendarem. | — | **Não implementar**: Pedidos recebidos já cobre o que o negócio precisa. |

## Alertas e clima

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Alerts](https://mobbin.com/flows/6b4f645a-feed-47a4-9c48-e6dbb4b24f9a) `f-6b4f645a` | Ausente | — | Os alertas do Bivaque são alertas de busca. | Mapa de alertas da cidade (segurança, falta de luz, clima, incêndio). | — | **Decisão sua**: Não no lançamento. Avaliar depois, só com fontes oficiais como a Defesa Civil. |
| [View alert](https://mobbin.com/flows/b4aa8013-89af-41d4-8412-af2ac0b42c59) `f-b4aa8013` | Ausente | — | Não há detalhe de alerta. | Detalhe do alerta com área no mapa e comentários. | — | **Decisão sua**: Segue a decisão de Alerts. |
| [Weather](https://mobbin.com/flows/c17d627d-d0a7-42a4-9bb4-3c500f691ac5) `f-c17d627d` | Ausente | — | Não há clima. | Previsão do tempo no mapa. | — | **Não implementar**: Qualquer celular já resolve. |

## Perfil, conta e privacidade

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Profile](https://mobbin.com/flows/9f0849d5-33bd-4f55-a5a8-029905f54369) `f-9f0849d5` | Abaixo da régua | pior · igual · pior · igual | Cartão com iniciais, contadores e atalhos. | Capa, foto, bio, minhas publicações, Favoritos, grupos e eventos no próprio perfil. | “Seu momento” e contadores úteis. | **Implementar**: Minha atividade (publicações e respostas) e atalho para encontros. Foto fica para sua decisão. |
| [Editing profile](https://mobbin.com/flows/ecd727b2-4a17-4616-bcd5-66e4fe3383c9) `f-ecd727b2` | Abaixo da régua | pior · igual · igual · igual | Só nome e bairro. | Foto, capa, bio, pronomes e site. | Bairro ligado à distância nos filtros. | **Implementar**: Bio curta opcional. Capa não. |
| [Uploading a profile photo](https://mobbin.com/flows/4f08e539-4f28-4b88-ae8d-3cb674a95940) `f-4f08e539` | Ausente | — | Só iniciais. | Foto de perfil com recorte. | — | **Decisão sua**: Aumenta a confiança, mas foto de militar é risco. Se fizer: opcional e visível só para membros verificados. |
| [Account](https://mobbin.com/flows/a62b0fc5-d33f-4724-a880-17f3192fc9f3) `f-a62b0fc5` | Abaixo da régua | pior · igual · igual · igual | Nome, apagar conta e sair. | E-mail, senha, telefone, 2FA, idioma, perfis e baixar meus dados. | Apagar a conta tem fluxo próprio. | **Implementar**: Baixar meus dados (direito de acesso da LGPD). O momento do 2FA fica para você decidir. Idioma não. |
| [Changing password](https://mobbin.com/flows/1089247a-1e6d-4b39-8c25-8d67593e11a6) `f-1089247a` | Ausente | — | Não há troca de senha nas configurações. | Trocar senha com “manter conectado em outros aparelhos”. | — | **Implementar**: Para quem entra com e-mail e senha. |
| [Changing privacy settings](https://mobbin.com/flows/a4c7eb25-70ff-4c0c-8246-1e4bc959150c) `f-a4c7eb25` | Abaixo da régua | pior · igual · igual · igual | Dois interruptores: mostrar bairro e convites de família. | Visibilidade por campo (todos, bairros próximos, meu bairro, ninguém), quem pode me encontrar e me mencionar. | — | **Implementar**: Visibilidade por campo: quem vê o nome completo, o bairro e quem pode me encontrar. |
| [Settings](https://mobbin.com/flows/7407183b-7428-4163-b031-5f28fe3ec6d9) `f-7407183b` | Abaixo da régua | igual · igual · pior · pior | Uma folha que mistura nome, aparência, bairro, privacidade e ocultados. | Página em seções: Conta, Privacidade, Avisos, Preferências, Aparência, Ajuda e termos. | — | **Implementar**: Organizar Configurações em seções, numa página. |
| [Switching to dark mode](https://mobbin.com/flows/8e1f4f8b-f715-4b10-8a25-aab4042119a7) `f-8e1f4f8b` | No nível | igual · igual · igual · igual | Aparência automática, clara ou escura. | — | — | **—** |
| [Help center](https://mobbin.com/flows/2d9d5305-45ca-450b-9866-620803076932) `f-2d9d5305` | Abaixo da régua | pior · igual · igual · igual | Tópicos, Fale com a gente e Meus chamados. | Busca na ajuda, buscas mais comuns e artigos em destaque. | Chamados com acompanhamento. | **Implementar**: Busca na ajuda, mais tarde. |

## Lado do negócio

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Setting up a business page](https://mobbin.com/flows/d39e37f1-84dd-40b5-8867-1c42e343f0f1) `f-d39e37f1` | No nível | igual · igual · igual · igual | Divulgar meu negócio, em etapas. A tela não foi capturada; avaliado pelo código. | Busca de categoria com sugestões, até 10 categorias. | Recebe pedidos de orçamento desde o início. | **—** |
| [Editing business profile](https://mobbin.com/flows/36decad0-cc2f-4dcb-bd9a-7628143f3585) `f-36decad0` | Abaixo da régua | pior · igual · igual · igual | Horário em texto livre, WhatsApp, Instagram e site. | Horário por dia da semana, status aberto ou fechado e licenças. | WhatsApp e Instagram. | **Implementar**: Horário por dia da semana, que alimenta o “Aberto agora”. |
| [Verifying a business](https://mobbin.com/flows/6a63c7a5-d003-4c2f-bd3a-cd4ee4104a10) `f-6a63c7a5` | No nível | igual · igual · igual · igual | Reivindicar a página, com confirmação. | — | — | **—** |
| [Page](https://mobbin.com/flows/905c9174-312d-4b42-8b8e-1677d1919854) `f-905c9174` | Abaixo da régua | pior · igual · igual · igual | Minha página com visitas e pedidos. | Checklist de configuração em 5 passos com barra e painel com favoritos, menções, visitas e recomendações. | Pedidos recebidos. | **Implementar**: Checklist de configuração e painel com indicações e favoritos do período. |
| [Post (business)](https://mobbin.com/flows/16df750e-cf09-407d-ab58-85177acc4d58) `f-16df750e` | Ausente | — | O negócio não publica novidades. | Publicações do negócio para os vizinhos. | — | **Não implementar**: Vira anúncio disfarçado dentro da comunidade. |

## Anúncios pagos

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Ads](https://mobbin.com/flows/ce3c1f0e-19cc-4cdb-8c0d-da7f9ff1d7c6) `f-ce3c1f0e` | Ausente | — | Não há anúncios pagos. | Área de anúncios do negócio. | — | **Não implementar**: Lançamento sem cobrança. |
| [Create an ad](https://mobbin.com/flows/11610f8a-9fa1-4f27-827a-b8915e602407) `f-11610f8a` | Ausente | — | Não há criação de anúncio pago. | Criar anúncio com objetivo, texto por IA e recorte de imagem. | — | **Não implementar**: Lançamento sem cobrança. |
| [View ad preview](https://mobbin.com/flows/3fbe7255-8235-4d60-81f6-1fcbb0d7ecd6) `f-3fbe7255` | Ausente | — | Não há prévia de anúncio pago. | Prévia do anúncio no feed. | — | **Não implementar**: Lançamento sem cobrança. |
| [Setting budget](https://mobbin.com/flows/675f7edb-c789-4cfc-bab8-5d4af1225b92) `f-675f7edb` | Ausente | — | Não há orçamento de anúncio. | Orçamento diário com previsão de alcance. | — | **Não implementar**: Lançamento sem cobrança. |
| [Setting demographic targets](https://mobbin.com/flows/1d82029c-dddf-4bd6-a667-f20dfa6429db) `f-1d82029c` | Ausente | — | Não há segmentação de público. | Segmentação por gênero e idade. | — | **Não implementar**: Lançamento sem cobrança, e segmentar militares por perfil é sensível. |
| [Setting location targets](https://mobbin.com/flows/a3367659-ca82-4279-aaa5-3f77e186b293) `f-a3367659` | Ausente | — | Não há segmentação por local. | Segmentação por cidade ou região. | — | **Não implementar**: Lançamento sem cobrança. |
| [Add a payment method](https://mobbin.com/flows/47cb6f0d-88bf-43c2-b2b9-bd669836ce2b) `f-47cb6f0d` | Ausente | — | Não há pagamento. | Cadastro de cartão, com erro de cartão recusado. | — | **Não implementar**: Lançamento sem cobrança. |

## Moderação pessoal

| Flow (Mobbin) | Avaliação | F · P · I · C | No Bivaque | Onde o Nextdoor ganha / o que tem | Onde o Bivaque ganha | Proposta |
|---|---|---|---|---|---|---|
| [Reporting a post](https://mobbin.com/flows/867693ef-fafa-46de-ae50-a84d3edcce7b) `f-867693ef` | No nível | melhor · igual · igual · igual | Denunciar com motivo e acompanhar a denúncia. | — | Acompanhamento da denúncia. | **—** |
| [Muting a publisher](https://mobbin.com/flows/54b63712-891b-47e0-aec8-487a8a0bf6f4) `f-54b63712` | Ausente | — | Não há veículos publicando para silenciar. | Silenciar um veículo de notícias. | — | **Não implementar**: Bloquear e ocultar já cobrem pessoas e conteúdo. |
