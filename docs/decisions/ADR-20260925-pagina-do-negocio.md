---
id: ADR-20260925-pagina-do-negocio
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-25
accepted_at: 2026-09-25
expires_at:
linked_plan:
critic_verdict: pending
critic_review: Decisões do dono na sessão de 25/09/2026. Revisão independente ainda não rodou.
supersedes_in_part: ADR-20260820-alcance-pago (D1 e D2 — o que se vende); ADR-20260820-conta-de-prestador (entrada só por convite)
---

# Página do negócio, Explorar por intenção e o que se cobra

## Problem

O Explorar virou um menu de seis verticais, e três delas respondem à mesma pergunta — "quem ou
onde para X?": Indicações (conversa e memória), Guia (referência revisada) e Serviços (ficha de
prestador). A pessoa não sabe em qual procurar.

O comércio real da vila — peixe, marmita, bolo, ar-condicionado — é feito por membros e
familiares, não por prestadores civis convidados. Hoje essa pessoa não tem onde existir como
negócio: anuncia item por item no Mercado, e nada junta os anúncios, o contato e o que ela faz.
O prestador civil, por outro lado, só entra por convite de uma comunidade.

A monetização aprovada em 20/08 vendia uma assinatura única de R$ 49/mês para levar a ficha à
cidade inteira. O Mercado, porém, já alcança a cidade inteira para todos, de graça.

## Decision

Decisões do dono em 25/09/2026:

- **D1 — O Explorar é a cidade, por intenção.** Portas: "Preciso de alguém ou de um lugar" (uma
  busca sobre indicações resolvidas, Guia e negócios, com a porta de D9 quando nada serve),
  Mercado, Moradia e Encontros. **Mercado e Moradia continuam separados.**
- **D2 — Página do negócio, uma só para Mercado e Serviços.** Nome, categoria (a lista fechada da
  §7.2.1), bairro e área de atendimento, contato escolhido pelo dono, horário, fotos, catálogo,
  anúncios ativos no Mercado e "Pedir orçamento". É a ficha de prestador que já existe
  (`provider_profiles`), aberta a mais donos.
- **D3 — Quem pode ter página: membro e prestador civil.** O membro cria a página a partir do
  perfil. O prestador civil **não chega só por convite**: o cadastro passa a ser aberto.
- **D4 — Reputação por indicação real.** A página mostra "Indicado em N conversas da cidade", com
  link para cada uma. A ligação nasce de **quem responde**: ao responder um pedido de indicação,
  a pessoa pode marcar o negócio. A contagem é de marcações feitas por membros e nunca entra em
  ordenação por dinheiro.
- **D5 — Alcance é grátis para todos.** Anúncio, serviço e página do negócio aparecem na cidade
  toda, para todos, sem pagar. Substitui a unidade vendida em ADR-20260820-alcance-pago (D1/D2).
- **D6 — O que se cobra, em três degraus.**

  | Degrau | Preço | O que inclui |
  |---|---|---|
  | Grátis | R$ 0 | Página completa, na cidade toda, marcável em indicações |
  | Destaque de momento | R$ 9,90/semana | Bloco "Patrocinado" da categoria no Explorar, sempre rotulado |
  | Plano do negócio | R$ 39/mês | Estatísticas da página, 4 destaques de momento por mês e, depois, ferramentas (agendamento) |

Complemento do dono em 26/09/2026, depois de perguntar por que a página nascia no Perfil e por
que Mercado e Serviços ficavam separados:

- **D7 — A página do negócio nasce onde a vontade nasce.** Em Serviços ("Ofereça seus serviços")
  e no Mercado ("Vende com frequência? Crie a página do seu negócio", inclusive ao publicar). O
  Perfil só mostra o atalho "Seu negócio" depois que ele existe.
- **D8 — Mercado e Serviços são fluxos opostos, unidos pela página do negócio.** Mercado é oferta:
  quem vende publica, quem compra procura. Serviços é o **GetNinjas do Bivaque**, como no plano
  original: quem precisa publica o pedido, e ele chega a **todos os negócios da categoria na
  cidade**, que respondem com orçamento; a pessoa compara e escolhe. O pedido direto a um
  negócio (o `/pedidos` de hoje) continua, a partir da página dele. A cobrança por contato do
  GetNinjas segue recusada; o limite de respostas está em D10.
- **D9 — Uma porta, duas saídas.** "O que você precisa?" oferece "Perguntar à cidade" (indicação,
  respondida por vizinhos, vira memória) e "Receber orçamentos de negócios" (pedido de serviço),
  marcáveis juntos. Os negócios já indicados aparecem ali com "Pedir orçamento". Sem preferência
  do dono; decisão reversível, porque os dois fluxos continuam separados por baixo.

Complemento do dono em 26/09/2026, depois de separar as verticais (desapegos, negócios locais,
orçamentos, moradia, benefícios e encontros):

- **D10 — Responder a pedidos aberto entra no plano, não em créditos.** No degrau grátis, o
  negócio responde a até **5 pedidos abertos por mês**; o Plano do negócio tira o limite. Não há
  pacote de créditos nem cobrança por resposta. O pedido continua chegando a todos os negócios da
  categoria, pagantes ou não; o limite é de resposta, nunca de recebimento. Pedido direto feito
  na página do negócio não conta no limite. O número 5 é valor inicial, a calibrar com uso.
- **D11 — Mercado reúne desapegos e o que as páginas de negócio vendem.** Desapego é o anúncio
  de membro, típico de quem é transferido (modelo OLX). Produto de negócio aparece no Mercado com
  o nome da página.
- **D12 — Moradia continua separada, no espírito do MilitaryByOwner.** Compra e aluguel entre
  quem é da comunidade, com filtros próprios. O Explorar ganha as entradas "Chegando na cidade" e
  "Saindo da cidade", que cruzam Moradia, desapegos, indicações e negócios em torno da
  transferência, sem fundir as abas.
- **D13 — Desconto para a comunidade é parte grátis da página.** O negócio pode oferecer um
  desconto a quem é da comunidade; ele vale para **todos os membros** e nunca fica restrito a quem
  paga algo ao Bivaque. Benefícios pagos são outro produto:
  [ADR-20260926-bivaque-mais](ADR-20260926-bivaque-mais.md).

**Continua proibido** (§7.3 e ADR-20260820-alcance-pago D7): posição dentro de resultados,
prioridade em indicação, ausência do rótulo, anúncio no feed, cobrar para não ser enterrado,
intermediar o pagamento do serviço, crédito consignado militar. O destaque aparece num bloco
separado e rotulado; ele nunca muda a ordem de uma busca nem de uma lista de indicações.

## Alternatives considered

- **Uma assinatura só, de R$ 49** (20/08). Porta cara para quem vende bolo, e vendia um alcance que
  o Mercado já dá de graça.
- **Cobrança por lead (GetNinjas).** Recusada em 20/08: incentiva gerar conversa. Revista em
  26/09 com pacote de créditos e com modelo híbrido; ficou o limite no grátis (D10), porque a
  receita vem da assinatura e não do volume de pedidos.
- **Moradia dentro do Mercado.** Recusada em 26/09: esconde os filtros de imóvel um nível abaixo.
- **Desconto local só para pagantes.** Recusado em 26/09: deixaria a cidade pior para quem não
  paga.
- **Juntar Mercado e Moradia.** Recusada: Moradia tem filtros próprios (quartos, valor, bairro).
- **Reconhecer o negócio nas respostas por IA.** Fica para depois; a marcação por quem responde é a
  fonte da contagem.

## Market or reference baseline

Nextdoor: página de negócio grátis; o pago são ofertas locais em unidades pequenas (a partir de
US$ 1/dia, média de US$ 75 por campanha). OLX: planos mensais por perfil, com saldo de destaques.
GetNinjas: cadastro grátis, cobrança por contato.

## Risks

- **Cadastro aberto de prestador civil.** Sem convite, a confiança passa a vir das indicações. O
  processo de cadastro (verificação de CNPJ ou CPF, termos, moderação) precisa de desenho próprio
  antes de abrir.
- **Destaque virar anúncio disfarçado.** O bloco "Patrocinado" fica fora das listas e das buscas,
  com rótulo sempre visível; o pgTAP de ordenação de 20/08 continua valendo.
- **Receita menor por negócio.** Compensada pela entrada barata; é hipótese a medir.

## Reversal cost

Médio. Voltar a cobrar alcance exigiria tirar de quem já tem. Por isso D5 vale como compromisso.

## Approval

Dono (Juan), sessão de 25/09/2026. Respostas: "A cidade, por intenção"; "pense na monetização
também, o mercado e serviços devem ter uma página para cada usuário, com os detalhes do negócio";
"Manter separados"; "1, mas o prestador não pode chegar só por convite"; "Rever preço e pacote";
"Sim, indicações reais"; "1, mas com uma correção, o mercado já é para toda a cidade, para todos";
"Quem responde marca o negócio"; "Sim, alcance grátis para todos". Em 26/09: "Mercado e
Serviços" (onde nasce a página); "Sim, pedido aberto aos negócios"; sem preferência sobre a porta
única. Ainda em 26/09: "Incluso no plano"; "Separada, com transferência"; "Só externos; desconto
local para todos".
