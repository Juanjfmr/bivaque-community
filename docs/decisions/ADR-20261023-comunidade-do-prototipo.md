---
id: ADR-20261023-comunidade-do-prototipo
status: proposed
risk: R3
owner: Juan
approved_at:
accepted_at:
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md (seção 6, lote 5)
critic_verdict: REVISE
critic_review: >
  Crítica do DeepSeek V4.1 Flash (23/10/2026), comparando com Nextdoor, Grupos do Facebook, Reddit, Comunidades do
  WhatsApp, Discord, Meetup e Stack Overflow. Os riscos de privacidade, abuso e controle de acesso apontados foram
  incorporados. Os desvios do protótipo sugeridos foram decididos pelo dono em 23/10/2026.
---

# A Comunidade e os grupos do Next seguem o protótipo

## Problem

O protótipo é a especificação do Bivaque (opção A, 19/10/2026). O mapa protótipo × Next da Comunidade e dos grupos
(`docs/agents/mapas/lote5-comunidade.md`, 23/10/2026, com arquivo e linha dos dois lados) achou 14 divergências de
regra de negócio. As principais:

1. **Navegação e estrutura.**
   - A barra de baixo do Next é Início, Explorar, Comunidades e Perfil. No protótipo, é Início, Comunidade, Conversas
     e Você.
   - O Next tem um produto inteiro de "Comunidades" no plural (as vilas), que o protótipo não tem.
   - A Comunidade do Next tem uma vista "Conversa" (o feed). No protótipo, o feed fica no Início.
2. **Pergunta e resposta.**
   - A pergunta aceita de 3 a 200 caracteres; no protótipo, de 8 a 300.
   - Faltam os filtros "Para ajudar" e "Minhas". O filtro "Sem resposta" inclui pedidos já respondidos.
   - A autoria não edita nem exclui a própria pergunta ou resposta, embora o banco já autorize.
   - Só se resolve marcando uma resposta.
   - O conteúdo removido pela moderação some, em vez de virar um aviso no lugar.
3. **Grupos.**
   - O Next fala em Público e Privado; o protótipo, em Aberto e Fechado.
   - Faltam regras, aviso fixado, motivo no pedido de entrada, aviso por grupo e convite.
   - O admin sai sem passar a administração, e o grupo pode ficar sem quem o administre.
   - O único fim de um grupo é excluir.
4. **Conteúdo do grupo.**
   - Não há tipos de publicação.
   - O encontro não aparece no feed do grupo.
   - Falta "também perguntar à cidade".
   - O card usa "curtir" no lugar de "Útil".
   - Não dá para excluir publicação nem editar ou excluir comentário.
5. **Bloqueio e ocultação.**
   - Bloquear só fecha a conversa privada: o conteúdo da pessoa bloqueada continua aparecendo, e ela continua podendo
     interagir.
   - "Ocultar" pergunta existe no banco e nenhuma tela usa.
   - O "Ocultar publicação" da tela volta no recarregar.

## Decision

A Comunidade e os grupos do Next são portados do protótipo, na pele do ADR-20261022-porte-visual-material-web, com
comparação de captura em cada tela. Os itens marcados **[crítica]** vieram da revisão crítica e protegem
privacidade, controle de acesso ou a memória da comunidade.

### 1. Navegação e estrutura

- A barra de baixo segue o protótipo: Início, Comunidade, Conversas e Você.
- A frente N publica o destino de cada entrada que sai da barra atual (Explorar, `/mercado`, `/negocio`, Guia,
  Agenda, Salvos) antes de mudar a barra. Nenhum destino pode ficar sem porta. **[crítica]**
- A Comunidade tem as abas do protótipo. A aba Negócios entra com o lote 6.
- As vilas ("Comunidades" no plural) saem da tela: as rotas redirecionam para a Comunidade da cidade, com uma lista
  fechada de caminhos internos (nunca destino vindo da URL). As tabelas e os dados ficam intactos. Remover de vez
  exige um ADR próprio (escolha do dono, 23/10/2026).
- Antes de esconder as vilas, a frente N entrega o **mapa do conteúdo das vilas**: o que passa a aparecer na cidade, o
  que fica só arquivado e o que o membro da vila deixa de ver. Esse mapa precisa da aprovação do dono. **[crítica]**
- A vista "Conversa" sai da Comunidade, e o feed da cidade fica no Início, como no protótipo. Se o feed da cidade não
  existir como leitura própria no banco, a frente N ganha uma migration para criá-lo.

### 2. Pergunta e resposta

- A pergunta tem de 8 a 300 caracteres. A regra de "pelo menos 2 termos" do protótipo não entra: nenhum líder a usa, e
  a pessoa não sabe como os termos são contados (escolha do dono). O CHECK do banco acompanha a regra.
- Os filtros são Para ajudar (padrão), Resolvidas e Minhas, como no protótipo.
- A autora edita e exclui a própria pergunta; quem respondeu edita e exclui a própria resposta.
- Conteúdo editado mostra a marca "editada", como no protótipo, e guarda a data da edição. **[crítica]**
- **Resolução dos dois jeitos** (escolha do dono): quem perguntou marca "resolvida" sem escolher resposta, ou marca a
  resposta que ajudou.
- Reabrir desmarca a resolução, mas o registro de qual resposta já resolveu fica guardado. O Guia não perde a origem
  de um conteúdo já promovido. **[crítica]**
- O conteúdo removido pela moderação vira um aviso no lugar ("Resposta removida pela moderação"):
  - o aviso não mostra o texto removido nem o nome de quem escreveu. Num grupo de cidade pequena, nomear quem foi
    moderado é exposição. **[crítica]**
  - o aviso não vale para quem exclui o próprio conteúdo: isso continua sumindo, como no protótipo.
- "Seguir respostas" é o rótulo do salvar, que já avisa quem salvou.

### 3. Grupos

- Os rótulos passam a ser Aberto e Fechado. A tela de criação explica que "Aberto" quer dizer "qualquer membro
  verificado da cidade entra", como no protótipo. "Aberto" nunca significa "sem verificação". **[crítica]**
- Entram, como no protótipo, regras, aviso fixado e aviso por grupo (Tudo, Destaques ou Nada).
- **Motivo no pedido de entrada** do grupo Fechado, com as proteções abaixo: **[crítica]**
  - a tela avisa "não inclua endereço, telefone, CPF ou dados de saúde";
  - só quem aprova lê o motivo;
  - o motivo é apagado quando o pedido é decidido;
  - os pedidos têm limite de tentativas.
- **Convite** é um link que leva à tela do grupo. No grupo Fechado, a pessoa ainda pede para entrar: o link nunca dá
  entrada direta nem fura a aprovação. **[crítica]**
- A lista de grupos mostra "Próximos de você" e "Populares", ordenados por atividade recente. O seletor de 3
  interesses e a seção "Sugeridos" ficam fora deste lote: o que existe no banco liga a pessoa a grupos, não a temas.
  **[crítica]**
- Para o admin sair, ele precisa **passar a administração** para outro membro, usando o `transfer_group_ownership`
  que já existe. Nomear só um moderador não basta, porque moderador não aprova entradas nem administra. **[crítica]**
- **Encerrar** substitui excluir: o grupo fica só para leitura, **sem prazo** (escolha do dono). A memória do grupo
  continua disponível para quem chega depois na cidade. O admin pode reabrir.
- Grupos com famílias e crianças seguem uma regra de conteúdo (por exemplo, foto de criança só com autorização dos
  pais), registrada no código de conduta. A denúncia de publicação e de comentário funciona de dentro do grupo, como
  no feed da cidade. **[crítica]**

### 4. Conteúdo do grupo

- Os tipos de publicação são Publicação, Pergunta e Evento.
- A **enquete sai do lote 5** (escolha do dono). Quando voltar, o voto será secreto: só a contagem aparece, nunca quem
  votou em quê, com prazo opcional.
- O encontro aparece no feed do grupo, na tabela `events` com `group_id`, que já existe.
- **O evento de grupo tem a visibilidade do grupo.** Quem não é membro de um grupo Fechado não lê o local, a data nem
  as confirmações, em nenhuma superfície (agenda, Início, busca). Há prova negativa. **[crítica]**
- **O local do encontro é texto livre** (escolha do dono): sai a trava que recusava palavras como "quadra", "rua" e
  "bairro", como já acontece nos anúncios (ADR-20260925-endereco-por-escolha). A proteção do Bivaque continua na
  entrada (ADR-20261022-localizacao-padrao-de-mercado).
- **"Também perguntar à cidade"** só existe em grupo Aberto, com o aviso "sua pergunta aparecerá na cidade com o nome
  do grupo". Em grupo Fechado, a opção não aparece, para não revelar quem participa dele. **[crítica]**
- O card usa "Útil", e o número de "Útil" ordena as respostas no Guia e no filtro "Para ajudar".
- O autor exclui a própria publicação e edita ou exclui o próprio comentário.

### 5. Bloqueio e ocultação

- **Bloquear uma pessoa faz três coisas:** **[crítica]**
  1. esconde, para quem bloqueou, as perguntas, respostas, publicações e comentários dela, em listas, busca, detalhe
     e feed, com "Ver mesmo assim";
  2. impede que ela responda, comente ou reaja ao conteúdo de quem bloqueou, e fecha a conversa;
  3. corta as notificações que ela geraria, inclusive as que já estavam na fila.
- A pessoa bloqueada não é avisada, e desbloquear devolve tudo.
- Quem bloqueou continua podendo denunciar o conteúdo escondido.
- Ocultar pergunta e ocultar publicação ficam gravados no banco.
- A tela "Ocultados" lista o que foi ocultado e permite mostrar de novo.

### Fica no Next, porque é extensão autorizada

- O Guia no fluxo de pedir (a "memória" do ADR de 25/09).
- O "Complementar o pedido" pela autora.
- Transferir a administração, remover membro e rebaixar moderador.

### Fora do lote 5 (escolhas do dono)

- A Oferta do negócio no grupo, com a revisão das travas anticomerciais, e a aba Negócios vão para o lote 6.
- A Turma de chegada automática vai para o lote 8.
- A enquete vai para um lote seguinte, com voto secreto.
- O seletor de interesses e os "Sugeridos" ficam para quando houver interesse por tema no banco.
- O registro das ações dos admins de grupo, para o operador auditar, vai para o lote 8 (Painel).

### O que muda em decisões anteriores

- **A visibilidade de grupo muda:** grupo encerrado passa a ser só leitura. A coluna e as policies que a leem entram
  na mesma migration.
- **O ciclo de resolução muda:** passa a ter a resolução sem resposta, e reabrir guarda o histórico. As RPCs de marcar
  por resposta continuam.
- **Excluir grupo vira encerrar.** O `delete_group` deixa de aparecer na tela.
- **A trava de local de evento sai**, como já saiu nos anúncios.
- **A regra "o produto não tem enquete" (prancha 44)** continua valendo neste lote. A enquete volta com voto secreto.

## Frentes

As frentes têm caminhos separados e migrations em faixas de horário próprias. Toda frente:
- anexa `docs/agents/LICOES.md`;
- roda as próprias provas pela fila (`scripts/agents/prova-fila.mjs`);
- fecha com teste positivo e negativo por via de permissão.

| Frente | Escopo | Migration |
|---|---|---|
| N, navegação | Barra de baixo com o destino de cada entrada, abas da Comunidade, mapa do conteúdo das vilas, redirecionamento, feed no Início | O feed da cidade, se faltar |
| A, pergunta | 8 a 300 caracteres, filtros, edição com marca, exclusão, resolução dos dois jeitos com histórico, aviso de removido sem autor | CHECK do título, estado de resolvida, histórico da resolução |
| B, grupo | Rótulos, regras, aviso fixado, motivo do pedido com proteções, aviso por grupo, convite que não fura aprovação, listas, sair passando a administração, encerrar sem prazo, regra de conteúdo e denúncia | Colunas de `groups` e `group_memberships`, policies de encerrado |
| C, conteúdo do grupo | Tipos de publicação, encontro no feed com visibilidade do grupo, local livre, "também à cidade" só em grupo Aberto, Útil, excluir e editar | Vínculo post e pergunta, CHECK do local, RLS de evento de grupo |
| D, bloqueio e ocultação | Bloqueio que esconde, impede interação e corta notificações; ocultar persistido; tela Ocultados | Bloqueio entre contas, filtros de leitura e de escrita |

**Ordem de merge:** B, depois C, depois D. A frente C lê as colunas de encerramento da B. A frente D filtra os mesmos
caminhos de leitura do feed que a C muda, então ela entra por último, sobre o feed já portado.

## Alternatives considered

- **Manter as vilas visíveis ao lado da Comunidade da cidade.** Rejeitada: duas noções de comunidade confundem, e o
  protótipo tem uma.
- **Resolver só como no protótipo.** Rejeitada: perde qual resposta resolveu, que alimenta o Guia.
- **Encerrar com 30 dias e sumir, como no protótipo.** Rejeitada pelo dono: nenhum líder apaga histórico por prazo, e
  a memória do grupo ajuda quem chega depois.
- **Bloqueio só visual**, como no Discord. Rejeitada: mantém o assediador engajado e notificando.
- **Fazer Oferta, Turma de chegada e enquete agora.** Rejeitada: encolhe o lote ao essencial da Comunidade.

## Market or reference baseline

Comparação feita na crítica de 23/10/2026, com Nextdoor, Grupos do Facebook, Reddit, Comunidades do WhatsApp,
Discord, Meetup e Stack Overflow:

| Tema | Referência de mercado |
|---|---|
| Bloqueio que esconde e corta interação | Facebook, Reddit |
| Ocultar com lista de ocultos | Reddit, Facebook |
| Aviso no lugar do conteúdo removido | Reddit, Stack Overflow |
| Arquivar sem apagar | Reddit (restrito), Facebook (arquivado) |
| Resposta marcada por quem perguntou | Stack Overflow |
| Convite que pode ser revogado e nunca fura a aprovação | Facebook, WhatsApp, Discord |
| Local do evento em texto livre | Discord |

## Proposed divergence from baseline

Nenhuma de mercado. As divergências em relação ao protótipo (encerrar sem prazo, sem a regra dos 2 termos, enquete
fora do lote, "também à cidade" só em grupo Aberto, aviso de removido sem o autor) estão registradas na decisão, com a
escolha do dono ou a marca **[crítica]**.

## Evidence and sources

- Mapa protótipo × Next: `docs/agents/mapas/lote5-comunidade.md` (23/10/2026).
- Crítica de mercado: DeepSeek V4.1 Flash, 23/10/2026 (resumida em `critic_review`).
- Protótipo: `prototypes/bivaque-html/src/features/community/`, `groups/` e `profile/` (`hidden.js`, `blocks.js`).
- Plano: `docs/AUDITORIA_ADERENCIA_2026-10-19.md`, seção 6, lote 5.

## Benefits

- A Comunidade igual à especificação, onde ela não expõe ninguém.
- O bloqueio passa a proteger de verdade.
- O ocultar deixa de ser enganoso.
- O grupo nunca fica sem quem o administre.
- A memória dos grupos encerrados fica.

## Risks

- **O bloqueio precisa filtrar todas as leituras e escritas.** Uma superfície esquecida vaza. Mitigação: pgTAP por
  superfície (lista, busca, detalhe, feed, resposta, comentário e notificação) e e2e com duas contas.
- **O aviso de removido pode vazar o texto ou o autor.** Mitigação: a leitura devolve só o estado, com prova
  negativa.
- **O evento de grupo Fechado pode vazar por outra superfície.** Mitigação: RLS no evento, com prova de não-membro
  em cada superfície.
- **Texto livre é um canal novo de dado pessoal** (motivo do pedido, local do encontro, pergunta com bairro).
  Mitigação: avisos na tela, leitura restrita e apagar o motivo depois da decisão.
- **Esconder as vilas quebra links antigos** e pode esconder conteúdo. Mitigação: o mapa do conteúdo das vilas,
  aprovado antes, mais o redirecionamento de lista fechada e o rastreador de links.
- **A regra de 8 caracteres não vale para perguntas antigas.** Mitigação: o CHECK novo usa `not valid` para as linhas
  existentes.

## Reversal cost

Médio. Telas novas e migrations aditivas: colunas, bloqueio, histórico da resolução. Esconder as vilas é reversível,
porque os dados ficam. Encerrar sem prazo não apaga nada.

## Success metric

- Por frente, o caminho entrada, ação, retorno e resolução funciona: pergunta, grupo, publicação e encontro, ocultar e
  bloquear, e remoção moderada.
- Acesso negado e remoção moderada comprovados diretamente, com teste por permissão: não-membro, bloqueado e removido.
- Comparação de captura com o protótipo em cada tela, nos dois temas.

## Reopen condition

Reabrir se as vilas tiverem uso real em produção que a Comunidade da cidade não cubra, se o bloqueio por conteúdo
pesar demais nas leituras, ou se aparecer abuso pelo motivo do pedido ou pelo convite.
