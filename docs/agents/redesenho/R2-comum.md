# R2 — Matriz de permissão: parte comum

Fixada pelo coordenador em 24/10/2026, a partir do `docs/decisions/ADR-20261024-redesenho-da-comunidade.md`. Os
quatro rascunhos da matriz (`R2-matriz-grupos.md`, `R2-matriz-publicacoes.md`, `R2-matriz-evento-pergunta.md` e
`R2-matriz-vila-fundacao.md`) usam esta parte comum e não a redefinem.

## 1. Atores

Toda célula da matriz diz o que cada ator pode, nesta ordem e com estes nomes:

| Ator | Quem é |
|---|---|
| `dono` | membro com papel de dono do grupo |
| `moderador` | membro com papel de moderador do grupo |
| `membro` | membro ativo do grupo, sem papel |
| `membro-so-leitura` | quem participava de um grupo que foi encerrado, ou membro com vínculo só de leitura, se existir |
| `pedido-pendente` | quem pediu para entrar num grupo Fechado e ainda não foi decidido |
| `cidade` | membro verificado da cidade do grupo que não participa dele |
| `outra-cidade` | membro verificado de outra cidade |
| `suspenso` | conta com suspensão ativa |
| `em-exclusao` | conta com pedido de exclusão aberto |
| `operador` | operador do Bivaque (`private.operators`) |
| `anonimo` | sem sessão |

Quando a regra depende de quem escreveu o conteúdo, a célula diz `autor` ou `nao-autor`.

## 2. Estados do grupo

`aberto`, `fechado` e `encerrado`, como na seção 2 do ADR. Toda célula de objeto de grupo diz o resultado nos três.

## 3. Valores de célula

- `sim`: permitido.
- `nao`: negado. Todo `nao` vira teste negativo.
- `sim se <condição>`: permitido com condição escrita em português simples, por exemplo "sim se o grupo for o da
  própria cidade".
- `so-rpc`: não há escrita direta na tabela; a ação existe só pela função indicada.

## 4. Formato de cada rascunho

Cada `R2-matriz-<grupo>.md` tem, nesta ordem:

1. **Objetos do grupo:** as tabelas que ele cobre.
2. **Matriz por objeto:** uma tabela por objeto, com uma linha por ação (`ler`, `criar`, `editar`, `excluir`,
   `moderar` e as ações próprias do objeto, como `fixar`, `aprovar`, `encerrar`) e uma coluna por ator. Objeto de
   grupo leva o estado na célula, por exemplo `aberto: sim / fechado: nao / encerrado: nao`.
3. **Permissão por coluna:** as colunas que só certos atores leem ou escrevem, como o nível de aviso por grupo.
4. **Transições:** o que um UPDATE pode mudar de um valor para outro, e quem. Exemplo: "papel só muda por
   `transfer_group_ownership` e por promover e rebaixar moderador; ninguém promove a si mesmo".
5. **Bloqueio:** para cada ação, se ela consulta `private.block_allows` e com qual ação (seção 5 abaixo).
6. **Regras do retrato:** uma linha para **cada** id `R1-xxx` das tabelas do grupo e das funções que só elas
   usam, no formato exato

   `| R1-xxx | <objeto> | <o que protege, em uma linha> | mantida | <motivo> |`

   com a decisão sendo uma de `mantida`, `mudada` ou `removida`. Quando é `mudada`, o motivo diz o que vira. O
   teste `scripts/redesenho/conferir-matriz.test.mjs` exige que todo id do retrato tenha decisão, e que a mesma
   decisão apareça quando o id está em mais de um rascunho.
7. **Testes negativos existentes:** os pgTAP e e2e de hoje que provam alguma regra do grupo, com o id da regra.
   Pelo ADR, eles são adaptados e mantidos.
8. **Consumidores:** os arquivos do app, do seed e dos testes que leem ou escrevem cada objeto (`rg`).
9. **Perguntas ao dono:** o que o protótipo, o ADR-20261023 e o ADR-20261024 não decidem. Cada pergunta com uma
   recomendação. **Não invente regra de produto: na dúvida, pergunte.**

## 5. Contrato do bloqueio

Função única, com a assinatura final já nesta leva e corpo que sempre devolve `true`. A frente de bloqueio implementa
o corpo depois, sem mudar a assinatura nem as policies que a chamam.

```sql
private.block_allows(p_actor uuid, p_author uuid, p_action text) returns boolean
-- stable, security definer, search_path = ''
```

- `p_actor`: quem quer agir ou ler. `p_author`: dono do conteúdo, ou destinatário quando a ação é `notificar`.
- `p_action`, um de:
  - `ler`: `p_actor` ver o conteúdo de `p_author` em lista, busca, detalhe e feed;
  - `responder`, `comentar`, `reagir`: `p_actor` interagir com o conteúdo de `p_author`;
  - `contatar`: abrir ou continuar conversa privada;
  - `notificar`: gerar notificação de `p_actor` para `p_author`.
- **Direção**, como no ADR-20261023, seção 5:
  - quem bloqueou deixa de `ler` o conteúdo de quem bloqueou;
  - quem foi bloqueado deixa de `responder`, `comentar`, `reagir` e `contatar` quem o bloqueou, e as notificações
    que geraria para quem o bloqueou são cortadas (`notificar`);
  - quem foi bloqueado **continua lendo** o conteúdo de quem o bloqueou, para não descobrir o bloqueio.
- **Exceções, fora da função:**
  - denunciar nunca consulta o bloqueio;
  - o operador nunca é afetado;
  - "Ver mesmo assim" é um parâmetro da leitura de detalhe, usado só por quem bloqueou, e não passa pela policy.
- **Quem chama:** as policies e as RPCs de leitura e escrita do domínio, e os triggers que geram notificação
  (`notify_group_post`, `notify_group_pin`, `notify_comment` e os que vierem).

## 6. Grupos de tabelas

| Rascunho | Tabelas do retrato |
|---|---|
| `R2-matriz-grupos.md` | `groups`, `group_memberships`, `group_join_reasons`, `group_join_attempts` |
| `R2-matriz-publicacoes.md` | `posts`, `comments`, `post_reactions`, `post_saves`, `post_follows`, e a tabela nova `hidden_posts` (sem id no retrato) |
| `R2-matriz-evento-pergunta.md` | `events`, `event_rsvps`, `recommendation_requests` |
| `R2-matriz-vila-fundacao.md` | `communities`, `community_memberships`, `community_invitations`, `community_join_reasons`, `provider_accounts`, `provider_invitations`, `provider_reach`, `listings`, `dm_conversations`, `notifications`, `reports`, as policies de `storage.objects` e as duas funções que o gerador não pegou (`private.notification_type_enabled` e `private.notification_type_key`, que citam `comments` e `events` como tipo de notificação) |

Uma função que cita tabelas de mais de um rascunho é decidida em cada um deles, com a mesma decisão. Se dois
rascunhos discordarem, o teste falha e o coordenador decide.
