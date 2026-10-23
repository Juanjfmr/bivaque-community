---
id: ADR-20261023-comunidade-do-prototipo
status: accepted
risk: R3
owner: Juan
approved_at: 2026-10-23
accepted_at: 2026-10-23
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md (seção 6, lote 5)
critic_verdict: PASS
critic_review: >
  Duas críticas do DeepSeek V4.1 Flash em 23/10/2026. A primeira comparou com Nextdoor, Grupos do Facebook, Reddit,
  Comunidades do WhatsApp, Discord, Meetup e Stack Overflow. A segunda conferiu o texto contra o banco real e deu NÃO
  PRONTO, com quatro bloqueios: a regra de leitura do feed da cidade, a resolução em dois campos, o bloqueio único e
  não descobrível, e os artefatos de processo. Esta versão fecha os quatro e os pontos parciais. Os desvios do
  protótipo foram decididos pelo dono.
---

# A Comunidade e os grupos do Next seguem o protótipo

## Problem

O protótipo é a especificação do Bivaque (opção A, 19/10/2026). O mapa protótipo × Next da Comunidade e dos grupos
(`docs/agents/mapas/lote5-comunidade.md`, 23/10/2026, com arquivo e linha dos dois lados) achou 14 divergências de
regra de negócio:

1. **Navegação e estrutura.**
   - A barra de baixo do Next é Início, Explorar, Comunidades e Perfil; no protótipo, Início, Comunidade, Conversas e
     Você.
   - O Next ainda tem código de uma versão antiga do produto, as vilas ("Comunidades" no plural, tabela
     `communities`). Vila não existe nesta versão do produto (dono, 23/10/2026).
   - O Next tem publicação solta para a cidade inteira (um feed na Comunidade). O protótipo não tem: na cidade só há
     perguntas e respostas, e publicação só existe dentro de um grupo (`prototypes/bivaque-html/src/features/home/`
     não tem feed; conferido em 23/10/2026, depois que o mapa afirmou o contrário).
2. **Pergunta e resposta.**
   - O tamanho da pergunta difere.
   - Faltam filtros.
   - A autoria não edita nem exclui o que escreveu.
   - Só se resolve marcando uma resposta.
   - O conteúdo removido some, em vez de virar um aviso.
3. **Grupos.**
   - Os rótulos são Público e Privado.
   - Faltam regras, fixado, motivo do pedido, aviso por grupo e convite.
   - O admin sai sem passar a administração.
   - O único fim de um grupo é excluir.
4. **Conteúdo do grupo.**
   - Não há tipos de publicação.
   - O encontro não aparece no feed do grupo.
   - Falta "também perguntar à cidade".
   - O card usa "curtir".
   - Falta excluir e editar.
5. **Bloqueio e ocultação.**
   - O bloqueio só fecha a conversa privada.
   - "Ocultar" pergunta existe no banco sem tela.
   - O "Ocultar publicação" volta no recarregar.

**Estado de produção (dono, 23/10/2026):** vila não existe nesta versão, não há ninguém nem conteúdo nas tabelas
dela, e o banco de produção ainda não tem uso real. As migrations deste lote não precisam tratar dados antigos.

## Decision

A Comunidade e os grupos do Next são portados do protótipo, na pele do ADR-20261022-porte-visual-material-web, com
comparação de captura em cada tela. **[crítica]** marca o que veio das revisões críticas.

### 1. Navegação e estrutura

- A barra de baixo segue o protótipo: Início, Comunidade, Conversas e Você.
- "Conversas" abre as mensagens privadas, que já existem no Next (`/messages`). O comentário de `bottom-nav.tsx` que
  diz "não há inbox" fica desatualizado e é corrigido junto.
- Cada entrada que sai da barra atual ganha destino antes da troca: Explorar, Comunidades (código das vilas), `/groups` (vira
  aba), Perfil (vira Você), `/mercado`, `/negocio`, Guia, Agenda e Salvos. A prova é o medidor de alcance que já
  existe (`scripts/visual/flows/reachability.mjs`, card `NAV-BECOS-SEM-SAIDA`): nenhum destino fica sem porta.
  **[crítica]**
- A Comunidade tem as abas do protótipo. A aba Negócios entra com o lote 6.
- **O código das vilas sai da tela**, porque vila não existe nesta versão: as rotas antigas redirecionam para a
  Comunidade da cidade, por uma lista fechada de caminhos internos (nunca destino vindo da URL). Nada é movido. As
  tabelas ficam no banco, vazias, até um ADR de remoção.
- **Sem publicação para a cidade inteira** (escolha do dono, 23/10/2026, seguindo o protótipo):
  - na cidade, a conversa é feita de perguntas e respostas (Indicações);
  - publicar só existe dentro de um grupo;
  - a vista "Conversa" sai da Comunidade, e o Início não ganha feed;
  - o compositor deixa de oferecer as audiências cidade e vila;
  - o banco passa a recusar publicação sem grupo (`group_id` obrigatório na inserção), com pgTAP do negativo. Como o
    banco de produção não tem uso real, não há publicação antiga de cidade para migrar.

### 2. Pergunta e resposta

- A pergunta tem de 8 a 300 caracteres, sem a regra de "2 termos" (escolha do dono). O CHECK do banco acompanha.
- Os filtros são Para ajudar (padrão), Resolvidas e Minhas. "Minhas" ganha parâmetro novo em `list_indications`.
- A autora edita e exclui a própria pergunta; quem respondeu edita e exclui a própria resposta.
- Conteúdo editado mostra "editada" e guarda a data. A coluna `edited_at` entra onde falta: `recommendation_replies`,
  `posts` e `comments`. **[crítica]**
- **Resolução dos dois jeitos** (escolha do dono), com dois campos: **[crítica]**
  - `resolved_reply_id` é a resolução **atual**;
  - `last_resolved_reply_id` guarda a **última** resposta que resolveu;
  - marcar "resolvida sem resposta" põe a pergunta como resolvida, com a resolução atual vazia;
  - reabrir esvazia a resolução atual e mantém a última. `reopen_recommendation` é reescrita para isso;
  - toda leitura que mostra "resolvida" passa a ler o estado da pergunta, e não a presença de `resolved_reply_id`.
- **Rótulos:** "Resolvida" quando há resposta marcada, e "Resolvida por quem perguntou" quando não há. **[crítica]**
- O Guia não depende da resolução: a origem de um conteúdo promovido fica gravada na promoção
  (`arrival_guide_entries`).
- O conteúdo removido pela moderação vira um aviso no lugar ("Resposta removida pela moderação"):
  - o aviso nunca mostra o texto removido nem o nome de quem escreveu;
  - quem exclui o próprio conteúdo continua sumindo com ele, como no protótipo;
  - excluir a própria pergunta leva as respostas junto, como já faz o banco (cascade) e como no protótipo. A tela
    avisa isso antes de excluir.
- **Retenção do removido pela moderação:** o texto fica disponível só para o operador, enquanto a denúncia puder ser
  revista, e depois é apagado. O prazo exato entra na política de privacidade, com decisão do dono. **[crítica]**
- "Seguir respostas" é o rótulo do salvar, que já avisa quem salvou.

### 3. Grupos

- Os rótulos passam a ser Aberto e Fechado. A tela de criação explica que "Aberto" quer dizer "qualquer membro
  verificado da cidade entra". "Aberto" nunca significa "sem verificação".
- Entram regras e aviso por grupo (Tudo, Destaques ou Nada).
- **O aviso fixado é uma publicação fixada** (escolha do dono): o admin fixa uma publicação do grupo no topo, com
  autor, data, comentários e denúncia, como no Facebook e no Reddit.
- **Motivo no pedido de entrada** do grupo Fechado: **[crítica]**
  - a tela avisa "não inclua endereço, telefone, CPF ou dados de saúde";
  - o motivo tem até 300 caracteres e só quem aprova e a própria pessoa o leem;
  - o motivo é apagado quando o pedido é decidido ou depois de 30 dias sem decisão;
  - cada pessoa faz no máximo 3 pedidos ao mesmo grupo em 30 dias. As tentativas ficam numa tabela própria,
    porque recusar o pedido apaga a linha de participação.
- **Convite** é um link para a tela do grupo. No grupo Fechado, a pessoa ainda pede para entrar. Como o link não dá
  entrada, não há o que revogar.
- A lista de grupos mostra "Próximos de você" e "Populares", ordenados por atividade recente. O seletor de
  interesses e os "Sugeridos" ficam fora deste lote.
- Para sair, o admin passa a administração para outro membro (`transfer_group_ownership`, que já existe).
- **Encerrar** substitui excluir (sem prazo, escolha do dono):
  - o grupo fica só para leitura;
  - os pedidos pendentes são descartados, e não se pede entrada num grupo encerrado;
  - ele sai da busca e da lista, mas continua em "Meus grupos" de quem participa, como no protótipo;
  - quem já participava continua lendo;
  - o admin pode reabrir.
- **Regra de conteúdo:** o código de conduta ganha uma regra sobre crianças e menores (não publicar foto, nome ou
  escola de criança de outra família sem autorização). A denúncia de publicação e de comentário funciona de dentro do
  grupo, como no feed da cidade. Não há marcação de "grupo com crianças": a regra vale para todos os grupos.
  **[crítica]**

### 4. Conteúdo do grupo

- Os tipos de publicação são Publicação, Pergunta e Evento. A enquete sai do lote 5; quando voltar, o voto será
  secreto, com prazo opcional.
- O encontro aparece no feed do grupo, na tabela `events` com `group_id`.
- **O evento de grupo tem a visibilidade do grupo.** Quem não é membro de um grupo Fechado não lê local, data nem
  confirmações em nenhuma superfície (agenda, Início, busca, notificação). Quem sai ou é removido do grupo perde a
  leitura do evento e sai das confirmações. O aviso de mudança no evento não leva o local no corpo. **[crítica]**
- O local do encontro é texto livre (escolha do dono): sai a trava de "quadra", "rua" e "bairro".
- **"Também perguntar à cidade"** só existe em grupo Aberto, com o aviso "sua pergunta aparecerá na cidade com o nome
  do grupo". O CHECK que hoje exige pergunta de cidade **ou** de grupo passa a aceitar o vínculo entre as duas.
- O card usa "Útil" no lugar de curtir. **Por ora é só o rótulo** (escolha do dono): nada ordena por ele. Ordenar
  respostas e o Guia por "Útil" é uma tarefa futura, com tabela própria.
- O autor exclui a própria publicação e edita ou exclui o próprio comentário.

### 5. Bloqueio e ocultação

- **Uma relação de bloqueio só:** a tabela de bloqueio das mensagens (`dm_blocks`) é generalizada para valer em
  todo o produto, com uma tela só (`/configuracoes/bloqueados`). **[crítica]**
- A pessoa bloqueada **não descobre** o bloqueio: a policy que hoje deixa o bloqueado ler a própria linha
  (`dm_blocks_select_self`) passa a mostrar a linha só a quem bloqueou. **[crítica]**
- **Bloquear faz três coisas:**
  1. esconde, para quem bloqueou, as perguntas, respostas, publicações, comentários, eventos, **anúncios e página de
     negócio** da pessoa, em listas, busca, detalhe e feed. **[crítica]**
  2. impede que ela responda, comente ou reaja ao conteúdo de quem bloqueou, e fecha a conversa;
  3. corta as notificações que ela geraria, inclusive as que estavam na fila: o envio confere o bloqueio na hora.
- **"Ver mesmo assim"** é um parâmetro explícito da leitura de detalhe, usado só por quem bloqueou, sem reverter o
  bloqueio. **[crítica]**
- Quem bloqueou continua podendo denunciar o conteúdo escondido. Desbloquear devolve tudo.
- **Ocultar** fica gravado no banco: `hidden_questions` (já existe) e uma tabela nova `hidden_posts` para
  publicações. A tela "Ocultados" lista os dois. **[crítica]**

### Fica no Next, porque é extensão autorizada

- O Guia no fluxo de pedir.
- O "Complementar o pedido".
- Transferir a administração, remover membro e rebaixar moderador.

### Fora do lote 5 (escolhas do dono)

- A Oferta do negócio no grupo, a aba Negócios e a **indicação de negócio** vão para o lote 6. Com isso, o critério de
  saída do lote 5 da auditoria deixa de incluir a indicação de negócio.
- A Turma de chegada automática vai para o lote 8.
- A enquete vai para um lote seguinte, com voto secreto.
- O seletor de interesses e os "Sugeridos" ficam para quando houver interesse por tema no banco.
- "Útil" que ordena respostas e o Guia fica para uma tarefa futura.
- O registro das ações dos admins de grupo, para o operador auditar, vai para o lote 8 (Painel).

### O que muda em decisões anteriores

- A visibilidade de grupo muda: o grupo encerrado passa a ser só leitura e sai da busca. A coluna e as policies que a
  leem entram na mesma migration.
- O ciclo de resolução muda: dois campos, resolução sem resposta e reabrir que guarda a última.
  `reopen_recommendation` é reescrita.
- Excluir grupo vira encerrar. O `delete_group` deixa de aparecer na tela.
- A trava de local de evento sai, como saiu nos anúncios.
- A publicação para a cidade inteira deixa de existir: publicar passa a ser só dentro de um grupo.
- A regra "o produto não tem enquete" (prancha 44) continua valendo neste lote.
- O bloqueio deixa de ser só das mensagens e deixa de ser visível ao bloqueado.
- O critério de saída do lote 5 perde a indicação de negócio (lote 6).

## Frentes

Toda frente:
- anexa `docs/agents/LICOES.md`;
- roda as próprias provas pela fila (`scripts/agents/prova-fila.mjs`). Os dois artefatos entram com o PR #110, que
  precisa estar na main antes do despacho;
- fecha com teste positivo e negativo por via de permissão;
- usa a faixa de horário de migration indicada abaixo;
- ganha um card no quadro (`tools/backend-kanban`), com as dependências.

| Tarefa | Escopo | Migration (faixa) | Depende de |
|---|---|---|---|
| N1 | Barra de baixo, destino de cada entrada, abas da Comunidade, "Conversas" para as mensagens, redirecionamento das rotas antigas de vila, prova de alcance | Sem migration | — |
| N2 | Sem publicação para a cidade: sai a vista "Conversa", o compositor só publica em grupo, o banco recusa publicação sem grupo | `20261024100000` | — |
| A1 | 8 a 300 caracteres, filtros (com "Minhas"), editar e excluir com marca e `edited_at`, resolução em dois campos com os rótulos, aviso de removido sem autor | `20261024110000` | — |
| B1 | Rótulos, regras, aviso por grupo, publicação fixada, listas | `20261024120000` | — |
| B2 | Motivo do pedido com as proteções e o limite, convite | `20261024121000` | B1 |
| B3 | Sair passando a administração, encerrar e reabrir com as policies de encerrado | `20261024122000` | B1 |
| B4 | Regra de crianças no código de conduta e denúncia de dentro do grupo | Sem migration | — |
| C1 | Tipos de publicação, encontro no feed do grupo com a visibilidade do grupo, local livre, "Útil" como rótulo | `20261024130000` | N2, B3 |
| C2 | "Também perguntar à cidade" (só em grupo Aberto), com o CHECK de origem revisto | `20261024131000` | A1 |
| C3 | Excluir publicação, editar e excluir comentário | `20261024132000` | C1 |
| D1 | Bloqueio único generalizado, não descobrível, com veto de escrita e corte de notificação | `20261024140000` | — |
| D2 | Filtros de leitura do bloqueio por superfície e "Ver mesmo assim", com a matriz de pgTAP | `20261024141000` | D1, N2, C1, C3 |
| D3 | `hidden_posts`, ocultar persistido e a tela "Ocultados" | `20261024142000` | N2 |

**Ordem de merge:** N1, N2 e A1 primeiro, junto com B1. Depois B2, B3 e B4. Depois C1, C2 e C3. Por último D1, D2 e
D3. A frente D filtra os caminhos de leitura que N2 e C criam, então entra depois deles e reescreve essas policies na
própria migration, com teste para cada uma.

## Alternatives considered

- **Manter as telas de vila.** Rejeitada: vila não existe nesta versão do produto.
- **Resolver só como no protótipo.** Rejeitada: perde qual resposta resolveu.
- **Encerrar com 30 dias e sumir.** Rejeitada pelo dono: a memória do grupo ajuda quem chega depois.
- **Bloqueio só visual, como no Discord.** Rejeitada: mantém o assediador engajado.
- **Duas tabelas de bloqueio** (mensagens e conteúdo). Rejeitada: duas fontes de verdade.
- **Aviso fixado como texto, como no protótipo.** Rejeitada pelo dono: sem autor, data nem denúncia.
- **Enquete, Oferta e Turma de chegada agora.** Rejeitada: encolhe o lote ao essencial.

## Market or reference baseline

Comparação das críticas de 23/10/2026:

| Tema | Referência de mercado |
|---|---|
| Bloqueio que esconde, corta interação, inclui anúncios e não avisa o bloqueado | Facebook, Reddit |
| Ocultar com lista de ocultos | Reddit, Facebook |
| Aviso no lugar do conteúdo removido | Reddit, Stack Overflow |
| Arquivar sem apagar | Reddit (restrito), Facebook (arquivado) |
| Resposta marcada por quem perguntou | Stack Overflow |
| Publicação fixada | Facebook, Reddit |
| Local do evento em texto livre | Discord |

## Proposed divergence from baseline

**Do mercado:** guardar a última resposta que resolveu depois de reabrir é invenção do Bivaque (não há referência
conhecida), e por isso tem estado explícito em dois campos.

**Do protótipo** (escolhas do dono ou marca **[crítica]**):
- encerrar sem prazo;
- sem a regra dos 2 termos;
- enquete fora do lote;
- "também à cidade" só em grupo Aberto;
- aviso de removido sem o autor;
- publicação fixada no lugar do texto fixado;
- "Útil" só como rótulo.

## Evidence and sources

- Mapa protótipo × Next: `docs/agents/mapas/lote5-comunidade.md` (23/10/2026).
- Críticas: DeepSeek V4.1 Flash, duas rodadas em 23/10/2026 (resumidas em `critic_review`).
- Protótipo: `prototypes/bivaque-html/src/features/community/`, `groups/` e `profile/` (`hidden.js`, `blocks.js`).
- Banco: `20260805214709_community_scope.sql` (escopo de leitura de posts), `20260911025357` (resolução),
  `20260802001500` (`dm_blocks`), `20261022130511` (`hidden_questions`).
- Plano: `docs/AUDITORIA_ADERENCIA_2026-10-19.md`, seção 6, lote 5.

## Benefits

- A Comunidade igual à especificação, onde ela não expõe ninguém.
- O bloqueio passa a proteger de verdade, e numa fonte só.
- O ocultar deixa de ser enganoso.
- O grupo nunca fica sem quem o administre.
- A memória dos grupos encerrados e das resoluções fica.

## Risks

- **O bloqueio precisa filtrar todas as leituras e escritas.** Mitigação: matriz de pgTAP por superfície e por
  operação, e e2e com duas contas.
- **Publicação sem grupo pode continuar entrando por outro caminho** (RPC antiga, compositor de outra tela).
  Mitigação: a recusa fica no banco, com pgTAP do negativo, e não só na tela.
- **O aviso de removido pode vazar o texto ou o autor.** Mitigação: a leitura devolve só o estado, com prova
  negativa.
- **O evento de grupo Fechado pode vazar por outra superfície** ou por notificação. Mitigação: RLS no evento, aviso
  sem local e prova por superfície.
- **Texto livre é um canal novo de dado pessoal.** Mitigação: aviso na tela, leitura restrita, prazo para apagar o
  motivo e limite de pedidos.
- **Reescrever a resolução** pode fazer telas antigas mostrarem "resolvida" errado. Mitigação: toda leitura passa a
  usar o estado da pergunta, com teste de reabrir.
- **Notificações já entregues antes do bloqueio** continuam na caixa de quem bloqueou. Fica assim, como no mercado.
  O que estava na fila é cortado.

## Reversal cost

Médio. Telas novas e migrations aditivas. Reescrever `reopen_recommendation` e as policies de `dm_blocks` são as
mudanças mais sensíveis, cobertas por pgTAP. Tirar as telas de vila é reversível.

## Success metric

- Por tarefa, o caminho entrada, ação, retorno e resolução funciona.
- Acesso negado e remoção moderada comprovados diretamente: não-membro, bloqueado, removido e pessoa de outra cidade.
- Nenhum destino sem porta, pelo medidor de alcance.
- Comparação de captura com o protótipo em cada tela, nos dois temas.

## Reopen condition

Reabrir se o bloqueio por conteúdo pesar demais nas leituras ou se aparecer abuso pelo motivo do pedido.
