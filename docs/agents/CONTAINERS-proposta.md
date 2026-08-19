# Proposta de containers — shell do membro

> **Status: proposta.** Alimenta a task de arquitetura de informação da **onda E**, que o
> [`ADR-20260816-shells-e-navegacao`](../decisions/ADR-20260816-shells-e-navegacao.md)
> deixou explicitamente em aberto: *"O desenho final dos containers e seus rótulos — é
> trabalho de IA na onda E, sob esta regra."* Não substitui o plano da onda E; dá a ele um
> ponto de partida testado contra o que já está decidido.

## De onde os containers derivam

O ADR proíbe derivar navegação da lista de features. Os containers têm de ter a forma do
modelo do produto, e o modelo já está escrito:

| Fonte | O que impõe |
|---|---|
| `BIVAQUE.md` §3.1 | Três níveis **aditivos**: Localidade (Manaus), Comunidade (vila), Grupo. Ninguém sai de um para entrar no outro |
| `BIVAQUE.md` §6.2 | Manaus é **quatro coisas, nenhuma delas linha do tempo**: alcance de post, eventos da cidade, vitrine, guia de chegada. *"Manaus é uma configuração no momento de postar, não uma sala que se visita"* |
| `BIVAQUE.md` §6.3 | Dois ciclos: semanal (pedir↔responder) e mensal (encontro). *"Pedidos abertos e próximo encontro vivem **dentro do feed da vila**, em posição fixa e alta"* |
| `D48` vigente | *"A vila é a sala; Manaus não é."* O nível municipal nunca é feed |
| `ADR-20260816` | Papéis são shells; todo destino novo aterrissa dentro de um container; se não couber, **pare e reporte** |

## Antes dos containers: são quatro shells, não um

Metade dos "destinos" que disputariam vaga não disputam nada — estão em outro shell.

| Shell | Quem | Alcança |
|---|---|---|
| **Membro** | membro, dependente | os containers abaixo |
| **Console do fundador** | operador | moderação, aprovação, pendências, denúncias, financeiro, delegação |
| **Console do dono** | dono de comunidade, moderador | moderação e aprovação da própria comunidade |
| **Prestador** | prestador civil | apenas a própria ficha (D37) — não lê feed, perfil nem grupo |

## Os containers do shell do membro

Quatro destinos e uma ação. Cada nível da §3.1 tem casa, e nenhum ciclo da §6.3 sai da sala
onde ele gera conversa.

| Container | Nível §3.1 | O que é | O que **não** é |
|---|---|---|---|
| **Minha vila** | Comunidade + Grupo | A única sala. Feed da vila; grupos vivem dentro; pedidos abertos e próximo encontro em **posição fixa e alta** (§6.3) | Não é "todas as vilas". Grupo não é aba |
| **Manaus** | Localidade | Referência permanente, três superfícies: **guia de chegada**, **eventos da cidade**, **vitrine** | **Nunca linha do tempo** (D48). O quarto item da §6.2 — alcance de post — não mora aqui |
| **Eu** | — | Perfil, afiliação declarada, convites, salvos, contribuições, consentimento | Não é configuração enterrada |
| **Conversas** | atravessa | DM, notificações, solicitações acionáveis. D36 manda manter a DM: a onda G a reaproveita para membro↔prestador | Não é feed |
| **+ Criar** | ação | Compositor. **É aqui que o alcance vila ↔ Manaus é escolhido** — a §6.2 diz que esse seletor precisa existir de qualquer forma, e a regra 2 da §12 já exige mostrar a audiência antes do submit | Não é destino |

**Por que Eventos deixa de ser aba.** O ADR nomeia Eventos como o item hoje fora do lugar.
Aqui ele volta para o nível a que pertence: evento de vila é ciclo mensal, em posição fixa
dentro de Minha vila; evento que atravessa as três forças é quadro de avisos, em Manaus.
Evento deixa de ser um tipo de conteúdo com aba própria e volta a ser conteúdo de um nível.

## Mapa — as 11 seções do `PRODUCT_STATUS.md`

| # | Seção | Container | Observação |
|---|---|---|---|
| 1 | Entrada e admissão | **fora do shell** (pré-auth) + Console do fundador | Onboarding e login antecedem o shell; o painel de admissão é do operador |
| 2 | Convites | **Eu** | O ADR diz literalmente: *"convite de membro cai em 'eu'"* |
| 3 | Perfil e identidade | **Eu** | Inclui a afiliação declarada (ver §Afiliação abaixo) |
| 4 | Comunidade, grupos e feed | **Minha vila** | Grupos dentro, nunca como aba |
| 5 | Eventos | **dividido por nível** | Vila → Minha vila (ciclo mensal, posição fixa). Cidade → Manaus |
| 6 | Indicações | **Minha vila**, posição fixa e alta | É o ciclo semanal da §6.3. Sem resposta em 48h, sobe para Manaus por alcance — não por mudar de lugar |
| 7 | Vitrine | **Manaus** (consumo) + **shell Prestador** (produção) | O ADR: *"Vitrine e busca de prestador caem na camada da cidade"*. Ficha, conta e dashboard são do outro shell |
| 8 | Mensagens e notificações | **Conversas** | |
| 9 | Moderação e operação | **Console do fundador** + **Console do dono** | Zero disputa de vaga no shell do membro |
| 10 | Conteúdo | **sem superfície própria** | Filtro de vocabulário removido (D21); o aviso de PII vive no compositor, em **+ Criar** |
| 11 | Infraestrutura | **sem superfície** | |

## Teste de absorção — ondas E, F, G e H

Este é o teste que responde "não redesenhar a cada funcionalidade". O ADR o torna
falsificável: *"se um destino novo não couber em nenhum container, o destino está confuso —
não falta vaga. Nesse caso, pare e reporte."*

| Onda | Destino | Aterrissa em | Aba nova? |
|---|---|---|---|
| **E** | Feed da vila | Minha vila | não |
| **E** | Municipal deixa de ser sala | Manaus (referência) | não |
| **E** | Seletor de audiência no compositor | + Criar | não |
| **E** | Guia de chegada | Manaus | não |
| **E** | Fila de aprovação em lote | Console do dono | não |
| **E** | Convite de membro com escopo | Eu | não |
| **E** | Perfil de outro membro | abre de qualquer lugar | não é destino |
| **E** | Afiliação declarada | Eu | não |
| **F** | Resposta de indicação com detalhe + controles do autor | Minha vila (ciclo semanal) | não |
| **F** | Escopo explícito e FK do `group_id` | Minha vila | não |
| **F** | Salvar com destino | Eu (salvos) | não |
| **F** | RSVP completo | onde o evento vive (vila ou Manaus) | não |
| **F** | Convite de evento com fan-out | Conversas + o evento | não |
| **F** | Encontro recorrente | Minha vila (ciclo mensal) | não |
| **G** | Ficha de prestador | **shell Prestador** | outro shell |
| **G** | Conta e dashboard de prestador | **shell Prestador** | outro shell |
| **G** | Conversa membro↔prestador | Conversas (D36 reaproveita a DM) | não |
| **G** | Asaas, alcance pago | Console do fundador (financeiro) + shell Prestador | outro shell |
| **G** | Busca de prestador | Manaus | não |
| **H** | Denúncia unificada | ação contextual sobre o alvo | não é destino |
| **H** | Ocultação por tipo, suspensão | Console do fundador / do dono | outro shell |
| **H** | Retorno ao denunciante | Conversas | não |
| **H** | Admissões que decide | Console do fundador | outro shell |
| **H** | PostHog | sem superfície | — |

**Nenhuma onda pede aba nova.** É esse resultado — não a estética — que sustenta a premissa
de absorver o que existe sem redesenhar a cada feature. Se uma onda futura falhar aqui, o
ADR manda parar e reportar em vez de abrir vaga.

## O que isso diz sobre o pacote `bivaque_redesign_10_10`

O instinto do pacote está certo e coincide com a Alternativa A do ADR: shell por container em
vez de lista de features. Três dos cinco containers propostos, porém, conflitam com estrutura
já decidida — e sempre pelo mesmo defeito: **achatam os níveis aditivos da §3.1 em fluxos
transversais**.

| Container do pacote | Veredito | Razão |
|---|---|---|
| **Agora** | conflita | Digest transversal aos níveis. Achatar Localidade e Comunidade num fluxo só reintroduz exatamente a linha do tempo municipal que a `D48` removeu |
| **Descobrir** | parcial | Aproxima-se de Manaus, mas enquadrado como descoberta de *features*, não como as três superfícies de referência nomeadas na §6.2. É o risco de "gaveta" que o próprio `CRITIQUE_BRIEF` levanta no item 3 |
| **Agenda** | conflita | Tira o temporal de dentro dos níveis. A §6.3 exige que pedidos abertos e próximo encontro fiquem **dentro do feed da vila**, em posição fixa e alta — mover para uma aba própria quebra os dois ciclos, porque eles geram conversa na sala, não num calendário |
| **Inbox** | alinhado | Corresponde a Conversas. `D36` sustenta manter a DM |
| **+ Criar** | alinhado | E a §6.2 confirma: o seletor de audiência precisa existir de qualquer forma |

Falta ainda o que nenhum ajuste de container resolve: o pacote desenhou **um dos quatro
shells**. Console do fundador, console do dono e prestador não existem nele — e é por isso
que a vitrine não tem onde morar, não por esquecimento de tela.

## Afiliação declarada

O dono informou em sessão que a **OM declarada está aceita** e não deve ser removida — ela dá
pertencimento. Esta proposta assume isso: força, situação, OM e turma declarados pelo membro
vivem em **Eu**, e aparecem no perfil.

**O registro no repositório ainda não reflete isso.**
[`ADR-20260811-om-declarada`](../decisions/ADR-20260811-om-declarada.md) está
`status: proposed`, `critic_verdict: pending`, `approved_at:` vazio, e o `AGENTS.md` continua
mandando não implementar afiliação declarada. Enquanto os dois não forem atualizados, toda
sessão futura vai reabrir esse conflito — como esta reabriu.

O próprio ADR delimita o que **continua proibido**, e isso não muda com a aprovação:

- payload do Portal, CPF em claro, endereço residencial, documento além do TTL;
- **selo público de verificação** — e a linha decisiva: *"Nada declarado é exibido como
  verificado pelo sistema."*

Por isso o selo **"✓ Membro verificado"** de `12_perfil.png` continua sendo P0. Ele não cai com
a aprovação da OM declarada: cai **por causa** dela, já que a OM é declarada justamente sob a
condição de o sistema não chancelar o que o membro diz.

A afiliação é **exibida, não buscável** (sem busca de pessoas no piloto), o que tem
consequência direta de IA: nenhum container pode oferecer filtro "todos da OM X".

## Em aberto

- Rótulos definitivos. "Minha vila" e "Manaus" descrevem o piloto; a segunda vila e a
  transferência ([`ADR-20260816-transferencia-e-pertencimento`](../decisions/ADR-20260816-transferencia-e-pertencimento.md))
  vão pressionar esses nomes.
- Densidade de **Manaus** no dia um: três superfícies de referência quase vazias numa cidade
  recém-aberta. A Alternativa B do ADR (busca como escape) volta a valer quando houver densidade.
- Reconciliar o `VISUAL_GUIDE.md` §0/§9, que já diverge do código na navegação — o ADR aponta
  isso como parte da mesma task da onda E.
