---
id: ADR-20260925-memoria-de-indicacoes
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-25
accepted_at: 2026-09-25
expires_at:
linked_plan:
critic_verdict: pending
critic_review: Decisões do dono na sessão de 25/09/2026. Revisão independente ainda não rodou.
---

# Indicações com memória: o pedido não some dez minutos depois

## Problem

As comunidades do Bivaque existem para substituir o grupo de WhatsApp, com uma memória que o
WhatsApp não tem. Nas palavras do dono: "hoje as pessoas pedem indicação pelo whatsapp e 10
minutos depois ninguem mais acha".

O banco já tinha quase todo o mecanismo: o pedido de indicação (`recommendation_requests`), as
respostas, "salvar", o aviso a quem segue o pedido, "resolvido" e a marca de qual resposta
resolveu (ADR-20260909-resposta-que-resolveu). Faltavam três coisas:

1. **O pedido morava longe da conversa.** Ele só existia dentro de `/recommendations`, misturado
   com grupos e eventos. A Comunidade, onde o membro passa o tempo, nunca mostrava um pedido.
2. **Não havia como achar o que já foi respondido.** A busca do cabeçalho procura no Guia, em
   Serviços e em Eventos, e deixa pedidos e respostas de fora. A decisão D5 da resposta que
   resolveu proibia usar a marca em busca.
3. **O pedido mais procurado era o mais travado.** "Saúde começa em grupo" (migration
   20260821000013) proibia pedir pediatra ou dentista para a cidade, e o formulário exigia pelo
   menos 10 caracteres de descrição.

## Decision

Decisões do dono em 25/09/2026, respondendo às perguntas da sessão:

- **D1 — Saúde sem trava e sem aviso.** A constraint `recommendation_health_needs_group` sai. O
  pedido de saúde pode ir para a cidade ou para um grupo, à escolha de quem pede. O dono recusou
  a trava ("retirar trava") e depois também o aviso ("retire também o aviso"). Mesma linha do
  ADR-20260925-endereco-por-escolha: o que se publica é escolha de quem publica.
- **D2 — A marca de resolvido alimenta busca e ordenação.** Altera a D5 do
  ADR-20260909-resposta-que-resolveu, que dizia que a marca "não é insumo de busca ou de
  recomendação". Agora ela é: na busca, o pedido resolvido vem antes do não resolvido, e a
  resposta marcada aparece junto do pedido. **Continua proibido** virar reputação, ranking de
  pessoa, selo ou contagem no perfil de alguém.
- **D3 — Nomes.** O que se pergunta à comunidade se chama **Indicações** (rota `/indicacoes`).
  O pedido de orçamento a um prestador (`/pedidos`) passa a se chamar **Orçamentos** na tela; a
  rota não muda.
- **D4 — O filtro comercial já tinha saído.** A pergunta de retirar o filtro de palavras
  (telefone, WhatsApp, preço) foi aprovada, mas o levantamento mostrou que ele já saíra do banco
  em 20260814070858. Nada a fazer.

Consequências técnicas, na migration `20260926004501_memoria_de_indicacoes`:

- O pedido cabe numa frase: o detalhe (`body`) passa a aceitar vazio; o teto de 2000 continua.
- `public.list_indications(localidade, busca, categoria, resolvido, limite, deslocamento)`:
  **SECURITY INVOKER**. Quem chama só alcança o que as policies de SELECT já deixam ler. Não há
  acesso novo. Sem busca, a lista vai por data. Com busca, o texto vira termos sem acento e sem
  palavras de pergunta ("alguém indica", "procuro"). A busca olha o pedido e as respostas, e
  ordena por termos casados, depois o resolvido, depois o mais novo. Um termo que só aparece em
  resposta conta quando cobre pelo menos metade da busca.
- Configuração de busca `public.bivaque_pt`: português com `unaccent`, extensão instalada no
  schema `extensions`.

Na interface:

- **`/indicacoes`**: pedir começa por procurar. Enquanto se escreve, aparece o que a cidade já
  perguntou. Se nada serve, "Pedir à cidade" publica a frase, com categoria sugerida pelo texto e
  detalhe opcional. Abaixo ficam Recentes, Sem resposta e Resolvidas, com filtro por assunto.
- **`/indicacoes/[id]`** é o endereço único do pedido. Notificação, salvos, denúncia, origem de
  um item do Guia, Início e compartilhamento apontam para ele. "Isso resolveu" é o gesto que
  guarda a resposta.
- **A Comunidade** ganha as vistas Conversa e Indicações, com a vista na URL
  (`/community?vista=indicacoes`). Indicações acende a aba Comunidades.

Segunda rodada, no mesmo dia, a pedido do dono ("vamos fazer"):

- **`/recommendations` aposentada.** Cada aba tinha outra casa: Explorar em `/groups` e
  `/events`, Pedir e Pedidos nas Indicações, Salvas em `/salvos`. O endereço redireciona:
  `?focus=<id>` vai ao pedido, `?aba=request` à caixa de pedir, `?aba=saved` aos salvos, e o
  resto à vista Indicações. `/indicacoes` também só redireciona.
- **Indicações moram na Comunidade.** "Pedir uma indicação" (botão de criar e Início) abre
  `/community?vista=indicacoes&pedir=1`, com a caixa focada. Quem ainda não tem comunidade
  vê a mesma vista, abaixo do convite para entrar numa.
- **O Guia antes de pedir.** A caixa mostra também "No Guia da cidade", que era o que a
  página antiga fazia de bom antes do formulário.
- **Busca do topo.** Indicações entra como primeiro grupo, com a resposta que resolveu no
  trecho. "Ver todos" leva o termo para a caixa de pedir.
- **Rótulos da decisão de 09/09.** "Ajudou a resolver", "Resolvida pela autora" e "Remover
  marca", como o dono escolheu no ADR-20260909-resposta-que-resolveu. A primeira rodada tinha
  usado "Isso resolveu".
- **Moderação no menu de mais opções** (DS-006), com nome acessível por item. O menu
  compartilhado deixa de mostrar "Ocultar" e "Denunciar" quando não há ação.

## Alternatives considered

- **Tipo de publicação "pedido" no feed.** Duplicaria respostas, resolvido, salvos e avisos, que
  já existem em `recommendation_requests`. Recusado.
- **Manter "saúde começa em grupo" com aviso.** Era a recomendação da sessão; o dono recusou.
- **Contagem "indicado por N membros".** Depende de extrair o nome do lugar das respostas, que é
  o job de curadoria do Guia (ADR-20260921, P3b ainda não construído). Fica para depois.

## Risks

- **Pedido de saúde expõe quem pergunta.** Aceito pelo dono. O grupo continua disponível no
  formulário antigo; o novo publica na cidade.
- **Busca com ruído.** Mitigado pela regra de metade dos termos para casamento só em resposta, e
  provado em pgTAP.
- **Link antigo de `/recommendations`**: redireciona. O endereço fica enquanto houver
  notificação ou favorito apontando para ele.

## Reversal cost

Baixo. Recriar a constraint de saúde exige limpar os pedidos de saúde sem grupo. A função e a
configuração de busca saem com `drop`. As rotas antigas continuam de pé.

## Evidence

- pgTAP `supabase/tests/memoria-de-indicacoes.sql`, 12/12. Prova: saúde na cidade; pedido sem
  detalhe; busca sem acento e sem palavras de pergunta; resposta marcada devolvida; achar pela
  resposta; termo minoritário descartado; mais termos primeiro; filtros; data sem busca; outra
  cidade sem acesso; anônimo recusado.
- `supabase/tests/recommendations-health-scope.sql` agora prova o contrário da trava.
- Navegador a 375 e 1440, em três contas:
  - busca antes de pedir;
  - publicar;
  - outro membro achar pela busca e responder;
  - "Isso resolveu";
  - um terceiro ver a resposta na busca sem abrir a conversa;
  - vista Indicações dentro da Comunidade.

## Approval

Dono (Juan), sessão de 25/09/2026. Respostas: "Retirar tudo", "Pode alimentar a busca",
"Indicações + Orçamentos", "retirar trava", "retire também o aviso".
