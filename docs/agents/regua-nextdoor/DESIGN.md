# DESIGN — contrato de construção de telas (11/11/2026)

Este é o documento que o agente lê antes de desenhar ou mexer em qualquer tela do `apps/app`. O dono
entregou esta etapa ao agente em 11/11/2026, com liberdade para mudar tudo. Ele absorve o antigo
`PADRAO-DE-TELA.md` e acrescenta o que faltava para o Bivaque sair de "correto" para "bem feito":
composição por tipo de trabalho, primeira dobra, cidade nova, movimento e aceite demonstrável.

**Quem manda em quê**

| Assunto | Fonte |
|---|---|
| Como compor, mover, provar e aceitar uma tela | este documento |
| Cor, forma, texto, ícone, imagem e comportamento de cada peça | [IDENTIDADE-DAS-PECAS.md](IDENTIDADE-DAS-PECAS.md) e `apps/app/src/pecas/` |
| Como avaliar uma jornada contra o Nextdoor (quatro dimensões) | [HANDOFF.md](HANDOFF.md) §3 a §5 |
| Escopo e definição de pronto | `docs/LANCAMENTO.md` |
| Histórico, pranchas, Figma, HTML antigo | `docs/historico/` — nunca é instrução |

Se este documento e uma peça da biblioteca discordarem, a peça está errada ou o documento está: corrija
um dos dois no mesmo lote. Não desenhe uma terceira versão na tela.

## 1. O princípio

> O sistema garante que toda tela **pertence** ao Bivaque. Ele não exige que toda tela **se pareça**.

| Fixo (não se discute por tela) | Aberto (decide-se por tela, com referência) |
|---|---|
| Peças, cores, tipos, ícones, ilustrações | Disposição: lista, grade, trilho, mapa, linha do tempo |
| Texto que fala com a pessoa | Densidade e o que entra na primeira dobra |
| Cinco estados de toda superfície assíncrona | Cabeçalho: curto, com busca, com contexto, ou nenhum |
| Vocabulário de movimento (§8) | Qual gesto a tela oferece |
| Acessibilidade, privacidade, alvos de 44 px | Como o computador usa o espaço extra |
| Uma ação principal por tela, sempre no mesmo lugar | Ordem e agrupamento do conteúdo |

Duas telas com a mesma anatomia e conteúdo trocado são um defeito, a não ser que façam o mesmo trabalho.

## 2. Antes de desenhar: a ficha da tela

Vai no cartão do quadro, em cinco linhas. Sem ficha, não há tela.

1. **Trabalho.** O que a pessoa veio fazer, numa frase com verbo ("comparar anúncios perto de casa").
2. **Tipo de trabalho.** Um dos sete da §4.
3. **Referências.** Duas a quatro telas do Mobbin, com link, e o que se aproveita de cada uma (uma
   interação específica, nunca "o estilo"). Nextdoor primeiro; outro app maduro quando o Nextdoor não
   tem ou é fraco.
4. **Primeira dobra.** O que aparece em 375 × 812 sem rolar (§6).
5. **Pior caso.** Como a tela fica com um item, com nenhum e com dados ruins (§7).

Blocos do 21st.dev são matéria-prima de estrutura e interação. Entram despidos: cor, fonte, raio,
sombra e ícone do bloco saem; ficam as peças e os tokens do Bivaque. Se o bloco traz algo reutilizável
que a biblioteca não tem, vira peça na biblioteca e na galeria antes de entrar na tela.

## 3. Texto

- O título é a pergunta ou a afirmação para a pessoa. O apoio tem no máximo uma linha. Explicação longa
  vai para um "Por que…?" que abre e fecha.
- A tela fala com a pessoa, nunca descreve o sistema. Ficam fora: mecanismo, nome de função, "consulta",
  URL, regra de privacidade (ela vale no código), métrica da plataforma.
- O momento de valor é conteúdo concreto da vida da pessoa: a pergunta de quem chegou antes, o próximo
  encontro. Nunca "mais de 1.000 membros".
- O botão diz o que acontece: "Enviar código", "Continuar com 2 grupos".
- Todo erro diz como sair. Todo vazio oferece o próximo passo real.
- Dado de demonstração é crível: nomes variados, bairros reais da cidade, preços plausíveis, texto com
  a irregularidade de gente de verdade. Nada de "Lorem", "Usuário 1" ou cinco itens com o mesmo tamanho.

## 4. Composição por tipo de trabalho

Regras que valem em todas:

- Lista com divisória no lugar de cartão. Cartão só onde agrupa uma ação e em cada publicação do feed.
- Barra de ação fixa no rodapé do celular, sempre no mesmo lugar. No máximo uma ação principal visível.
- Espaço em múltiplos de 8 (8, 16, 24, 32, 48). Entre blocos de uma lista densa, 16; 32 ou mais só para
  separar assuntos.
- Nenhum ícone decorativo que pareça ação. Item feito fica marcado, sem riscado.
- O rótulo fica dentro do campo e sobe ao digitar.

Cada tela escolhe **um** tipo. A coluna "Forma" é o ponto de partida, não um molde: desvie com referência.

| Tipo | A pessoa quer | Forma de partida | Primeira dobra (375) | Evite |
|---|---|---|---|---|
| **Acompanhar** (Início, grupo, perguntas) | ver o que há de novo | feed de cartões, com um trilho horizontal de contexto no topo quando houver algo com data | 1 trilho curto + 1 publicação inteira + começo da segunda | cabeçalho de boas-vindas ocupando a dobra; métricas |
| **Comparar** (Mercado, imóveis, negócios, agenda) | escolher entre vários | grade de 2 colunas com foto, ou linhas densas quando o texto decide; filtros em chips que rolam de lado; mapa quando distância decide | 4 itens em grade ou 5 linhas | um item por tela; filtro escondido em folha quando há só 3 |
| **Decidir** (detalhe de anúncio, evento, negócio, pergunta) | saber se serve e agir | mídia no topo, fatos que decidem logo abaixo (preço, distância, data), ação fixa no rodapé | mídia + título + os 3 fatos + ação | descrição antes dos fatos; ação no fim da página |
| **Fazer** (criar, editar, entrada, pedido) | terminar sem errar | uma decisão por etapa; folha para o que é curto, tela cheia para o que tem foto ou texto longo; rascunho automático | o campo ativo e a ação, com o teclado aberto | formulário inteiro de uma vez; botão desligado sem dizer o porquê |
| **Conversar** (caixa, conversa, comentários) | responder rápido | linhas densas com avatar; na conversa, o contexto (anúncio, evento) preso no topo; campo fixo embaixo | 6 conversas, ou as 4 últimas mensagens + campo | caixa de escrever no fim da rolagem |
| **Gerir** (Você, privacidade, avisos, meus anúncios) | achar um ajuste e mudar | seções com título e linhas planas; o valor atual à direita; mudança salva na hora, com Desfazer | identidade + 2 seções | tudo numa folha só; botão "Salvar" para um interruptor |
| **Aprender** (guia, ajuda, regras) | ler e guardar | coluna de leitura de 60 a 70 caracteres; sumário que acompanha no computador; salvar no topo | título + primeiro parágrafo | cartões no lugar de texto corrido |

## 5. Assinatura: o que só o Bivaque tem

Três ideias do produto aparecem como desenho, não só como filtro. Uma tela que pode usar uma delas e não
usa está genérica.

- **O momento da pessoa** (chegando, morando, saindo). O Início e a Comunidade mudam de ordem e de
  convite conforme o momento. Quem chega vê perguntas de quem chegou antes e o próximo encontro; quem
  sai vê desapego, despedida e a cidade de destino.
- **A distância a partir da sua origem.** Anúncio, negócio e encontro mostram "a 1,2 km de você" como
  fato de primeira linha. A origem é privada: aparece só para a própria pessoa e nunca vira ponto no
  mapa de outro membro.
- **A data de transferência.** Onde houver prazo (retirada, despedida, chegada), a data organiza a
  tela: "sai em 12 dias" pesa mais que a data de publicação.

**Tela-assinatura.** Quatro telas carregam a cara do app: Início, Comunidade, Mercado e Você. Para
essas, e só para essas, o lote produz dois candidatos com disposição de fato diferente (não variação de
cor) e os submete ao `experiment-judge` às cegas, pela skill `visual-system-experiment`. As demais telas
seguem a ficha e uma revisão.

## 6. Primeira dobra

Medida em 375 × 812, tema claro, com dados de demonstração críveis, sem rolar.

1. A pessoa sabe onde está sem ler um título grande: a barra e o conteúdo bastam.
2. A ação principal está alcançável pelo polegar.
3. O conteúdo real cumpre o mínimo do tipo (coluna "Primeira dobra" da §4).
4. Barra do topo, título, busca e filtros somam no máximo 35% da altura.
5. Nada de ilustração, saudação ou explicação acima do primeiro conteúdo numa tela que a pessoa abre
   todo dia. Ilustração de cena fica na porta, nas boas-vindas e nos vazios.

Em 320 px a tela pode perder um item, nunca a ação. Os números 3 e 4 são o ponto de partida: mude com
captura que mostre a tela melhor, e registre no cartão.

## 7. Cidade nova e dados difíceis

No lançamento, a maior parte das cidades terá pouco conteúdo. Vazio não é exceção: é a primeira tela de
muita gente.

**Três faixas, três desenhos** (por superfície, a partir da contagem que o servidor devolve):

| Faixa | Itens | A tela |
|---|---|---|
| Vazia | 0 | cena ilustrada pequena, uma frase, **uma** ação que cria o primeiro item, e conteúdo que não depende da cidade (guia, grupos nacionais por momento) logo abaixo |
| Rala | 1 a 5 | os itens em tamanho normal, sem grade esburacada nem "ver todos"; abaixo, um convite a contribuir em linha plana, não um banner |
| Viva | 6 ou mais | a composição normal |

- Nunca preencha com conteúdo inventado, contagem falsa ou "em alta" sem volume.
- Seção sem item some inteira. Título de seção sobre o vazio é defeito.
- Quem cria o primeiro item recebe um retorno à altura (§9).

**Dados difíceis.** Toda prévia e todo teste visual incluem, na mesma tela: título de 120 caracteres;
nome de 40; item sem foto; foto escura e foto em pé; preço de 7 dígitos e "grátis"; bairro de nome
longo; texto com emoji e sem pontuação; um item com todos os campos opcionais vazios. Texto corta com
reticências em linha definida; nada transborda nem empurra a ação para fora.

## 8. Movimento e comportamento nativo

Movimento explica de onde algo veio e para onde foi. Se não explica, não entra.

**Estado em 11/11/2026.** A biblioteca já tem toque (encolhe 3%), folha que sobe e arrasta, aviso com
Desfazer, esqueleto e movimento reduzido. Transição entre telas, gesto de voltar, elemento
compartilhado e restauração de rolagem **ainda não existem**: são o card `DS-MOVIMENTO`. Até ele
fechar, tela nova usa só o que existe e não inventa animação local.

**Vocabulário** (tokens em `pecas.css`; os dois primeiros existem, os demais nascem no card):

| Token | Valor | Uso |
|---|---|---|
| `--pc-toque` | 120 ms | resposta ao dedo: encolher, ligar, marcar |
| `--pc-entrada` | 280 ms | folha, aviso, conteúdo que entra |
| `--pc-saida` | 200 ms | o que sai é mais rápido do que o que entra |
| `--pc-tela` | 320 ms | troca de tela e elemento compartilhado |
| curva | `cubic-bezier(0.2, 0, 0, 1)` | uma só, para tudo; sem quique em interface de trabalho |

**Padrões**

| Situação | Movimento |
|---|---|
| Avançar na hierarquia (lista → detalhe) | a tela nova entra da direita; a anterior recua e escurece um pouco |
| Voltar | o inverso, e o gesto de arrastar da borda acompanha o dedo |
| Trocar de aba da barra | troca seca com esmaecer curto; aba não desliza |
| Abrir item com foto (anúncio, evento, capa de grupo) | a foto é elemento compartilhado: cresce da miniatura até o topo do detalhe |
| Tarefa curta sobre a tela | folha de baixo; arrastar fecha; voltar fecha a folha antes da tela |
| Lista que recebe item | o item abre espaço e entra; nunca a lista inteira pisca |
| Lista que perde item | o item recolhe; aviso com Desfazer |
| Atualizar | puxar para baixo no topo de feed e caixa |
| Carregar | esqueleto com a forma do que vem; sem girador no meio da tela |

**Regras**

- Só `transform` e `opacity`. Nada que mude medida de caixa durante a animação.
- Nada se move sozinho em laço, fora o esqueleto e o girador dentro do botão.
- Sem entrada em cascata de itens de lista, sem paralaxe, sem animação ao rolar.
- Voltar e avançar restauram rolagem, filtros, aba ativa e foco de cada entrada do histórico.
- Com movimento reduzido: durações zeram, deslize vira esmaecer, elemento compartilhado vira corte.
- Retorno tátil só no app de loja (Capacitor) e só em quatro momentos: ação principal concluída, ligar
  ou desligar, erro de envio, fim do puxar para atualizar.

**Técnica.** Troca de tela e elemento compartilhado usam a View Transitions API do navegador, ligada
no roteador (confirme a opção na versão fixada do TanStack Router antes de usar). Onde o navegador não
suporta, a troca é imediata e nada quebra. Gesto e folha continuam em CSS e eventos de ponteiro. Não
entra biblioteca de animação sem card que prove que o navegador não resolve.

## 9. Momentos de recompensa

Quatro momentos recebem cuidado a mais. Fora deles, o app é quieto.

| Momento | O que acontece |
|---|---|
| Vínculo confirmado | a cena `vinculo` com um movimento único e curto; em seguida o conteúdo da cidade, não um "Continuar" vazio |
| Primeira publicação, pergunta ou anúncio | o item aparece no topo da lista, já no lugar; aviso com Desfazer; na cidade vazia, uma linha "Você abriu a conversa em {cidade}" |
| Pergunta resolvida | a marca de feito (`--success`) desenha uma vez; quem respondeu é avisado |
| Entrou num grupo | o botão vira "Entrou" no lugar; o grupo sobe para "Seus grupos"; boas-vindas com um primeiro passo |

Sem confete, sem som, sem contagem de sequência, sem medalha.

## 10. Acabamento percebido

- Ação que dá para desfazer grava na hora e mostra o resultado antes do servidor responder; se falhar,
  volta ao estado anterior e diz como tentar de novo. Escrita nunca é repetida sozinha.
- Imagem reserva o espaço pela proporção antes de carregar; nada pula. Foto de membro entra com
  esmaecer; sem foto, o selo ou as iniciais.
- O teclado nunca cobre o campo ativo nem a ação. A barra fixa sobe com ele.
- Áreas seguras do aparelho respeitadas em cima e embaixo.
- Texto do sistema em 200% não quebra a tela.
- Foco visível só por teclado (`:focus-visible`); foco programático ao trocar de tela não desenha
  contorno no título.
- Rascunho de tudo que leva mais de uma etapa.

## 11. Estados

Toda superfície assíncrona distingue cinco estados, e cada um tem desenho próprio: carregando
(esqueleto), vazio verdadeiro (§7), negado (por que e o que fazer), erro recuperável (tentar de novo no
lugar) e com conteúdo. Consulta que falhou e aparece como lista vazia é bug.

## 12. Tablet e computador

- 768: a composição do celular com mais respiro lateral, ou duas colunas quando o tipo é Comparar.
- 1440: a tela usa o espaço para **contexto**, nunca para esticar. Lista e detalhe lado a lado em
  Comparar e Conversar; sumário ou painel de fases em Fazer e Aprender; coluna de leitura limitada em
  Acompanhar, com o que é secundário à direita.
- A coluna do celular solta no meio do monitor é defeito.
- Passar o ponteiro revela ações secundárias; nenhuma ação existe só no ponteiro.

## 13. Prova e aceite

Uma tela fecha quando o cartão tem tudo isto, com captura ou saída de comando, não com afirmação:

1. Ficha da §2 preenchida, com os links do Mobbin.
2. Capturas em 375, 768 e 1440, claro e escuro, nas três faixas da §7 e com os dados difíceis.
3. Primeira dobra conferida contra a §6, com os números medidos.
4. Percurso por robô com a interação principal e a falha principal: sem erro de console, sem
   transbordo horizontal, voltar restaura a tela anterior.
5. Teclado e leitor de tela no caminho principal; contraste AA; alvos de 44 px; movimento reduzido.
6. Revisão às cegas por outro modelo contra as referências, pela régua do HANDOFF: sem "Pior" em
   interface e clareza.
7. **Fidelidade de porte.** Se a tela substitui uma aprovada (prévia, protótipo ou tela antiga), uma
   tabela no cartão lista cada elemento e interação da aprovada e o destino: mantido, mudado com
   motivo, ou retirado com motivo. Elemento que some sem linha na tabela reprova o lote.

O revisor recusa a tela quando encontra qualquer item desta lista observável:

- duas telas vizinhas com a mesma anatomia e trabalhos diferentes;
- cartão em volta de item de lista, ou cartão dentro de cartão;
- mais de uma ação principal visível, ou a ação principal fora do lugar habitual;
- parágrafo de apoio com mais de uma linha, ou texto que descreve o sistema;
- seção com título e sem conteúdo; contagem ou selo inventado;
- ilustração ou saudação acima do conteúdo numa tela de uso diário;
- cor usada para enfeitar rótulo; ícone que parece ação e não é;
- animação que não está na §8;
- peça redesenhada no CSS da tela.

## 14. Referências por tipo (Mobbin)

Ponto de partida. A ficha da tela cita as suas, buscadas para o trabalho específico.

| Tipo | Referência | O que aproveitar |
|---|---|---|
| Acompanhar | [Nextdoor, feed](https://mobbin.com/screens/ed9fc5ab-889d-45e3-81bf-015ad6b46c69) · [topo do Início](https://mobbin.com/screens/ed239926-f476-46ca-87ec-e897ff20028b) | publicação inteira na dobra; cidade na barra; trilho com "ver mais" |
| Comparar | [Nextdoor, For Sale](https://mobbin.com/screens/e20e764b-bd26-4adb-b8d9-e7ecb2ecb0ed) · [Nextdoor, grupos](https://mobbin.com/screens/d14c2272-ea7e-43e9-a46d-b8269e9b8163) · [Airbnb, lista com mapa](https://mobbin.com/screens/df8fc9ee-d109-458b-812e-f8621a15c314) | grade 2 colunas com preço e distância; linha densa com ação à direita; botão de mapa flutuante |
| Decidir | [Airbnb, detalhe](https://mobbin.com/screens/df3523e0-6209-461c-af3a-8b2ee4cbb8ba) · [Partiful, evento](https://mobbin.com/screens/9b48b0a7-b832-48c5-8284-24d435c12c6a) | fatos e ação presos no rodapé; presença em dois toques |
| Fazer | [Nextdoor, novo anúncio](https://mobbin.com/screens/dcf5ee8f-c4ae-42df-9dd8-cb6cf6960eec) | foto primeiro; rótulo dentro do campo; local aproximado no mapa |
| Conversar | [Nextdoor, publicação e comentários](https://mobbin.com/screens/f86feba8-42ec-4fd4-8ace-fcad7d7d52f6) · [LinkedIn, caixa](https://mobbin.com/screens/80d1c0f3-eb69-4b8f-856e-8a509aabeefa) | campo de comentar fixo; filtros em chips sobre linhas densas |
| Gerir | [Nextdoor, perfil](https://mobbin.com/screens/9fa1c528-5530-4f11-bc24-0244ea7279fe) | seções com "ver tudo" e linhas planas |
| Buscar | [Nextdoor, resultados](https://mobbin.com/screens/db95e37d-f921-4133-a0eb-5abf3ed1823f) | resultados agrupados por tipo, com abas |
| Cidade nova | [Reddit, comunidade recém-criada](https://mobbin.com/screens/44c08e47-f74d-46ba-a267-aa7aafe05540) · [Nextdoor, boas-vindas do grupo](https://mobbin.com/screens/1d6df29b-09ab-4f98-b492-744947320e26) · [TradingView, vazio com sugestões](https://mobbin.com/screens/09448182-a68c-4455-8f69-20d7f09c87b8) | primeiros passos contados; vazio que já oferece o que seguir |

Armadilhas da busca no Mobbin: [HANDOFF.md](HANDOFF.md) §3.5.

## 15. O que é regra e o que é hipótese

- **Regra:** §1, §3, §8 (regras e movimento reduzido), §11, §13 e tudo em IDENTIDADE-DAS-PECAS.
- **Ponto de partida, muda com evidência no cartão:** formas da §4, números da §6, faixas da §7,
  durações da §8.
- **Do dono:** trocar família de fonte, conjunto de ícones ou paleta; qualquer coisa fora do
  `LANCAMENTO.md`.

Regra nova entra aqui só quando um defeito real apareceu duas vezes. Este documento não deve crescer:
o que vira peça sai do texto e vai para a biblioteca.
