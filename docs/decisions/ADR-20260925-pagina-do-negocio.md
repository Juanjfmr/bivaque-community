---
id: ADR-20260925-pagina-do-negocio
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-25
accepted_at: 2026-09-25
expires_at:
linked_plan:
critic_verdict: pass
critic_review: PASS independente em 26/09/2026 após explicitar ownership, preservação do prestador civil, baseline, métrica de sucesso e condição de reabertura.
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

### Contrato de autorização da primeira fatia

A primeira implementação de D3 abre a ficha existente para **membro já admitido**, sem abrir
ainda o cadastro civil de D3 nem reescrever o alcance legado dos prestadores civis:

- membro elegível é o usuário autenticado que possui uma `locality_memberships` atual e ativa;
  a localidade dessa linha é derivada no servidor e nunca aceita do cliente;
- possuir uma página **não cria `provider_accounts`**, não muda `my_account_kind()` e não move o
  membro para o shell de prestador;
- `provider_profiles` pode pertencer a um membro elegível ou a uma conta civil de prestador
  ativa. Catálogo, portfólio e upload de foto usam o mesmo ownership e nunca permitem escrita
  cross-user;
- o formulário do membro altera apenas nome, categoria e descrição por RPC; telefone e sua
  visibilidade ficam fora desta primeira fatia, pois a leitura por coluna ainda precisa de um
  contrato que diferencie dono e público. A RPC de criação deixa esses campos vazios e a política
  não permite que o membro os altere diretamente;
- para o membro, a criação da ficha e do alcance gratuito da sua cidade atual é uma operação
  atômica. Uma falha não deixa ficha órfã nem permite escolher outra localidade;
- o prestador civil existente mantém nesta fatia seu convite, shell, alcance comunitário e
  revogação atuais. A reconciliação do alcance civil legado para a cidade inteira, exigida por D5,
  é uma mudança separada para não misturar duas fronteiras de autorização no mesmo lote;
- a visibilidade pública continua dependendo de `provider_reach` ativo. Revogar o prestador civil
  continua desativando seu alcance; ser dono da ficha não concede visibilidade fora do alcance;
- **a página do membro segue o dono na mudança de cidade** (decisão do dono, 27/09/2026, reaberta
  pela revisão do PR #86): quando a filiação atual e ativa do dono muda de cidade, o alcance
  gratuito da página vai com ela. A página passa a aparecer na cidade nova, some da antiga, e o
  dono continua editando e apagando. Uma página que tenha ficado presa se acerta quando o dono
  pede para criá-la de novo. O alcance do prestador civil não é movido.
  Migration `20260927005841_member_business_page_follows_owner`; prova em
  `supabase/tests/provider-member-business-transfer.sql`.

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

Referências de interface consultadas em 26/09/2026 no Mobbin: [Nextdoor — perfil de negócio](https://mobbin.com/flows/3c5a68e8-7886-4458-ad9f-403304ed73ec), [Fresha — criação de perfil no marketplace](https://mobbin.com/flows/2246ab8a-c605-47ff-ac30-45c2e3fb3d17), [Fresha — prévia do perfil](https://mobbin.com/flows/ef0e19c8-6f36-4f5a-8fc7-bfddff4943cc) e [Airtasker — cadastrar serviços](https://mobbin.com/flows/a88dcee0-07d7-4a93-aafe-fe4ac56e1072). Elas orientam a apresentação pública, a criação pelo dono, a prévia e a descoberta de serviços; vínculo à identidade admitida e alcance derivado da localidade são decisões próprias do Bivaque.

**Divergência deliberada do baseline:** o Bivaque não usa claim de ficha de terceiro nem converte
o membro em uma conta comercial separada. A página nasce vinculada à identidade autenticada já
admitida; o alcance inicial do membro é derivado da sua cidade atual.

## Risks

- **Cadastro aberto de prestador civil.** Sem convite, a confiança passa a vir das indicações. O
  processo de cadastro (verificação de CNPJ ou CPF, termos, moderação) precisa de desenho próprio
  antes de abrir.
- **Destaque virar anúncio disfarçado.** O bloco "Patrocinado" fica fora das listas e das buscas,
  com rótulo sempre visível; o pgTAP de ordenação de 20/08 continua valendo.
- **Receita menor por negócio.** Compensada pela entrada barata; é hipótese a medir.

## Reversal cost

Médio. Voltar a cobrar alcance exigiria tirar de quem já tem. Por isso D5 vale como compromisso.

## Success metric and reopen condition

Esta primeira fatia passa quando um membro elegível cria uma página, ela nasce com alcance
gratuito somente na cidade atual, aparece na busca para outro membro dessa cidade, pode ser
editada apenas pelo próprio dono e o fluxo civil existente continua passando seus testes de
convite, edição e revogação. O caminho negativo deve provar que outro membro não assume, edita,
publica catálogo nem envia foto na ficha alheia.

Reabrir o contrato de autorização se a página precisar sobreviver sem um membro atual, operar em
múltiplas cidades, ser transferida entre pessoas, ou se a abertura do cadastro civil exigir uma
identidade comercial diferente da conta autenticada. A migração do alcance civil de comunidade
para cidade inteira permanece necessária para concluir D5 e não é considerada fechada por esta
fatia.

## Approval

Dono (Juan), sessão de 25/09/2026. Respostas: "A cidade, por intenção"; "pense na monetização
também, o mercado e serviços devem ter uma página para cada usuário, com os detalhes do negócio";
"Manter separados"; "1, mas o prestador não pode chegar só por convite"; "Rever preço e pacote";
"Sim, indicações reais"; "1, mas com uma correção, o mercado já é para toda a cidade, para todos";
"Quem responde marca o negócio"; "Sim, alcance grátis para todos". Em 26/09: "Mercado e
Serviços" (onde nasce a página); "Sim, pedido aberto aos negócios"; sem preferência sobre a porta
única. Ainda em 26/09: "Incluso no plano"; "Separada, com transferência"; "Só externos; desconto
local para todos".
