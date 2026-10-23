---
id: ADR-20261023-comunidade-do-prototipo
status: proposed
risk: R3
owner: Juan
approved_at:
accepted_at:
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md (seção 6, lote 5)
critic_verdict:
critic_review: Quatro escolhas de produto respondidas pelo dono em 23/10/2026 (vilas, escopo, resolução, local do encontro); o texto aguarda aprovação.
---

# A Comunidade e os grupos do Next seguem o protótipo

## Problem

O protótipo é a especificação do Bivaque (opção A, 19/10/2026). O mapa protótipo × Next da Comunidade e dos grupos
(`docs/agents/mapas/lote5-comunidade.md`, 23/10/2026, com arquivo e linha dos dois lados) achou 14 divergências de
regra de negócio. As principais:

1. **Navegação e estrutura.**
   - A barra de baixo do Next é Início, Explorar, Comunidades e Perfil. No protótipo, é Início, Comunidade, Conversas
     e Você.
   - O Next tem um produto inteiro de "Comunidades" no plural (as vilas), que o protótipo não tem: lá existe uma
     Comunidade por cidade.
   - A Comunidade do Next tem uma vista "Conversa" (o feed). No protótipo, o feed da cidade fica no Início.
2. **Pergunta e resposta.**
   - A pergunta aceita de 3 a 200 caracteres; no protótipo, de 8 a 300, com pelo menos 2 termos.
   - Faltam os filtros "Para ajudar" e "Minhas". O filtro "Sem resposta" inclui pedidos já respondidos.
   - A autora não edita nem exclui a própria pergunta, embora o banco já autorize. Também não dá para editar a própria
     resposta.
   - Só se resolve marcando uma resposta.
   - O conteúdo removido pela moderação some, em vez de virar um aviso no lugar.
3. **Grupos.**
   - O Next fala em Público e Privado; o protótipo, em Aberto e Fechado.
   - Faltam, em relação ao protótipo:
     - regras, aviso fixado e motivo no pedido de entrada;
     - aviso por grupo (Tudo, Destaques, Nada) e convite por link;
     - sugestões e populares na lista.
   - O admin sai sem nomear moderador, e o grupo pode ficar sem dono.
   - O único fim de um grupo é excluir; o protótipo encerra, com 30 dias de leitura e possibilidade de reabrir.
4. **Conteúdo do grupo.**
   - Não há tipos de publicação (Publicação, Pergunta, Evento, Enquete) nem enquete.
   - O encontro não aparece no feed do grupo.
   - Falta "também perguntar à cidade".
   - O card usa "curtir" no lugar de "Útil".
   - Não dá para excluir publicação nem editar ou excluir comentário.
5. **Bloqueio e ocultação.**
   - Bloquear só fecha a conversa privada: o conteúdo da pessoa bloqueada continua aparecendo.
   - "Ocultar" pergunta já existe no banco (com pgTAP) e nenhuma tela usa.
   - O "Ocultar publicação" da tela volta no recarregar.
   - Não há a tela "Ocultados".

## Decision

A Comunidade e os grupos do Next são portados do protótipo, na pele do ADR-20261022-porte-visual-material-web, com
comparação de captura em cada tela.

1. **Navegação e estrutura.**
   - A barra de baixo segue o protótipo: Início, Comunidade, Conversas e Você.
   - A Comunidade tem as abas do protótipo. A aba Negócios entra com o lote 6.
   - As vilas ("Comunidades" no plural) saem da tela: as rotas redirecionam para a Comunidade da cidade. As tabelas e
     os dados ficam intactos. Remover de vez exige um ADR próprio (escolha do dono, 23/10/2026).
   - A vista "Conversa" sai da Comunidade, e o feed da cidade fica no Início, como no protótipo.
2. **Pergunta e resposta.**
   - A pergunta tem de 8 a 300 caracteres, com pelo menos 2 termos. O CHECK do banco acompanha a regra.
   - Os filtros são Para ajudar (padrão), Resolvidas e Minhas, como no protótipo.
   - A autora edita e exclui a própria pergunta; quem respondeu edita e exclui a própria resposta.
   - **Resolução dos dois jeitos** (escolha do dono): quem perguntou marca "resolvida" sem escolher resposta, ou marca
     a resposta que ajudou, que segue alimentando o Guia. Reabrir limpa as marcas.
   - O conteúdo removido pela moderação vira um aviso no lugar ("Resposta removida pela moderação"), sem expor o
     texto removido.
   - "Seguir respostas" é o rótulo do salvar, que já avisa quem salvou.
3. **Grupos.**
   - Os rótulos passam a ser Aberto e Fechado.
   - Entram, como no protótipo:
     - regras e aviso fixado;
     - motivo no pedido de entrada do grupo fechado;
     - aviso por grupo (Tudo, Destaques ou Nada);
     - convite por link;
     - sugestões e populares na lista, usando o `suggest_groups_for_user` que já existe.
   - O admin só sai depois de nomear um moderador.
   - **Encerrar** substitui excluir: o grupo fica só para leitura por 30 dias, pode ser reaberto nesse prazo e depois
     some.
4. **Conteúdo do grupo.**
   - Os tipos de publicação são Publicação, Pergunta, Evento e Enquete.
   - A enquete tem voto único, e as porcentagens só aparecem depois de votar.
   - O encontro aparece no feed do grupo e usa a tabela `events` com `group_id`, que já existe.
   - **O local do encontro é texto livre** (escolha do dono): sai a trava que recusava palavras como "quadra", "rua" e
     "bairro", como já acontece nos anúncios (ADR-20260925-endereco-por-escolha). A proteção do Bivaque continua na
     entrada (ADR-20261022-localizacao-padrao-de-mercado).
   - A pergunta do grupo pode ser feita também à cidade, com o vínculo nos dois sentidos.
   - O card usa "Útil", como no protótipo.
   - O autor exclui a própria publicação e edita ou exclui o próprio comentário.
5. **Bloqueio e ocultação.**
   - Bloquear uma pessoa esconde, para quem bloqueou, as perguntas, respostas, publicações e comentários dela, em
     listas, busca e detalhe, com "Ver mesmo assim", e fecha a conversa.
   - A pessoa bloqueada não é avisada, e desbloquear devolve tudo.
   - Ocultar pergunta e ocultar publicação ficam gravados no banco.
   - A tela "Ocultados" lista o que foi ocultado e permite mostrar de novo.

**Fica no Next, porque é extensão autorizada:**

- o Guia no fluxo de pedir (a "memória" do ADR de 25/09);
- o "Complementar o pedido" pela autora;
- transferir dono, remover membro e rebaixar moderador.

**Fora do lote 5** (escolha do dono):

- a Oferta do negócio no grupo, com a revisão das travas anticomerciais, vai para o lote 6;
- a Turma de chegada automática vai para o lote 8;
- a aba Negócios vai para o lote 6.

**Não muda:**

- a fila de denúncias e a decisão do operador;
- a RLS de visibilidade de grupo fechado;
- `list_indications`, `hidden_questions` e o ciclo de resolução por resposta, que são reaproveitados.

## Frentes

As frentes têm caminhos separados e migrations em faixas de horário próprias. Toda frente fecha com teste positivo e
negativo por via de permissão.

| Frente | Escopo | Migration |
|---|---|---|
| N, navegação | Barra de baixo, abas da Comunidade, redirecionamento das vilas, feed no Início | Sem migration |
| A, pergunta | Regras de texto, filtros, edição e exclusão pela autoria, resolução dos dois jeitos, aviso de removido | CHECK do título, estado de resolvida |
| B, grupo | Rótulos, regras, aviso fixado, motivo do pedido, aviso por grupo, convite, sugestões, sair com moderador, encerrar | Colunas de `groups` e `group_memberships` |
| C, conteúdo do grupo | Tipos, enquete, encontro no feed, local livre, "também à cidade", Útil, excluir e editar | `poll_votes`, vínculo post e pergunta, CHECK do local |
| D, bloqueio e ocultação | Bloqueio que esconde conteúdo, ocultar persistido, tela Ocultados | Bloqueio entre contas e filtros de leitura |

A frente C lê as colunas de encerramento da frente B, mas não edita os arquivos dela. A ordem de merge é B, depois C.

## Alternatives considered

- **Manter as vilas visíveis ao lado da Comunidade da cidade.** Rejeitada: duas noções de comunidade confundem, e o
  protótipo tem uma.
- **Resolver só como no protótipo.** Rejeitada: perde qual resposta resolveu, que alimenta o Guia.
- **Fazer Oferta e Turma de chegada agora.** Rejeitada: a Oferta depende das travas anticomerciais (lote 6), e a
  Turma de chegada, do momento da pessoa (lote 8).

## Market or reference baseline

- Comunidade por cidade com perguntas, grupos abertos e fechados, enquetes e eventos: padrão de grupos de vizinhança e
  de apps de comunidade local.
- Bloqueio que esconde conteúdo e ocultação pessoal: padrão de redes sociais.
- Local de evento em texto livre: padrão do Meetup e do Facebook Eventos.

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

- Mapa protótipo × Next: `docs/agents/mapas/lote5-comunidade.md` (23/10/2026).
- Protótipo: `prototypes/bivaque-html/src/features/community/`, `groups/` e `profile/` (`hidden.js`, `blocks.js`).
- Plano: `docs/AUDITORIA_ADERENCIA_2026-10-19.md`, seção 6, lote 5.

## Benefits

- A Comunidade igual à especificação.
- O bloqueio passa a proteger de verdade.
- O ocultar deixa de ser enganoso.
- O grupo deixa de ficar sem dono.

## Risks

- **O bloqueio precisa filtrar todas as leituras.** Uma superfície esquecida vaza o conteúdo. Mitigação: pgTAP por
  superfície (lista, busca, detalhe e feed) e e2e com duas contas.
- **O aviso de "removido" pode vazar o texto removido.** Mitigação: a leitura devolve só o estado, nunca o conteúdo,
  com prova negativa.
- **Esconder as vilas quebra links antigos.** Mitigação: o redirecionamento cobre todas as rotas de vila, e o
  rastreador de links prova.
- **A regra de 8 caracteres e 2 termos não vale para perguntas antigas.** Mitigação: o CHECK novo usa `not valid` para
  as linhas existentes, ou a migration documenta as que não passam.

## Reversal cost

Médio: telas novas e migrations aditivas (colunas, `poll_votes`, bloqueio). Esconder as vilas é reversível, porque os
dados ficam.

## Success metric

- Por frente, o caminho entrada, ação, retorno e resolução funciona: pergunta, grupo e publicação, ocultar e bloquear,
  e remoção moderada.
- Acesso negado e remoção moderada comprovados diretamente, com teste por permissão.
- Comparação de captura com o protótipo em cada tela, nos dois temas.

## Reopen condition

Reabrir se as vilas tiverem uso real em produção que a Comunidade da cidade não cubra, ou se o bloqueio por conteúdo
pesar demais nas leituras.
