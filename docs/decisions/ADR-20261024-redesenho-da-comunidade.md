---
id: ADR-20261024-redesenho-da-comunidade
status: proposed
risk: R3
owner: Juan
approved_at:
accepted_at:
expires_at:
linked_plan: docs/decisions/ADR-20261023-comunidade-do-prototipo.md
critic_verdict: pending
critic_review: >
  Primeira crítica do Codex (gpt-6.1-sol) em 24/10/2026: NÃO PRONTO, com seis pontos. (1) A vila também está presa a
  prestadores e anúncios, e a exclusão de conta lê essas tabelas. (2) pg_depend não enxerga o corpo das funções nem
  vínculo sem FK. (3) A matriz deixava de fora suspensão, membro só leitura, permissão por coluna, transições e
  conteúdo moderado, e travar nome de policy não pega USING (true). (4) "Também perguntar à cidade" mexe nas
  Indicações. (5) O bloqueio não cabe num booleano. (6) Branch única não protege o deploy. Esta versão incorpora os
  seis.
---

# O domínio da Comunidade é redesenhado a partir do protótipo

## Problem

O ADR-20261023-comunidade-do-prototipo levou a Comunidade e os grupos para o protótipo tarefa a tarefa, remendando o
banco que existia. O inventário de 24/10/2026 (`docs/agents/inventario/2026-10-24-banco-codigo-testes.md`, branch
`codex/inventario-legado`) e a crítica deste ADR mostraram por que isso não fecha:

- **O grupo está preso à vila.** `groups`, publicações e eventos apontam para `communities`, que é a vila. Vila não
  existe nesta versão do produto. Enquanto o grupo depender dela, a vila não sai do banco, e cada regra nova de grupo
  é escrita em cima dela.
- **A vila também está presa a parte da fundação:**
  - o prestador é atestado e convidado pela vila (`provider_accounts.community_id` e
    `provider_invitations.community_id`, obrigatórios);
  - o anúncio pode ter a vila como audiência, no lugar da cidade (`listings.community_id`);
  - o alcance de prestador aponta para a vila por id solto (`provider_reach.scope_id`);
  - a exclusão de conta lê essas tabelas (`finalize_account_deletion`).
- **As regras estão em camadas.** As policies, triggers e funções do domínio foram criadas e recriadas em dezenas
  de migrations desde agosto. A última versão de cada uma só se descobre lendo o histórico inteiro.
- **Os defeitos do lote 5 vieram dessas camadas**, não das regras novas:
  - o moderador podia se promover a dono por uma policy antiga (corrigido na COM-003);
  - uma migration nova deixou cair a proteção de conta em exclusão, que estava numa policy antiga (corrigido na
    COM-001);
  - o limite de pedidos se contornava por uma via de inserção antiga (achado na COM-005).
- As tarefas que faltam no lote 5 (sair e encerrar, conteúdo do grupo, bloqueio) continuariam remendando esse grupo.

O banco de produção não tem uso real (dono, 23/10/2026). Não há dado do domínio para preservar.

## Decision

O domínio da Comunidade é redesenhado: **as regras são escritas do zero, a partir do protótipo; as tabelas ficam
no lugar; a vila sai na mesma leva**, inclusive dos pontos da fundação que dependem dela.

### 1. O que é o domínio

**Entra:**
- grupos e participação em grupo, com pedido de entrada, motivo e tentativas;
- publicações, comentários, reações ("Útil"), salvar e seguir publicação, publicação fixada e ocultar publicação
  (`hidden_posts`);
- o vínculo opcional do evento com um grupo;
- "Também perguntar à cidade": a pergunta feita num grupo Aberto aparece também nas Indicações da cidade, com o
  nome do grupo. Isso muda o CHECK de origem de `recommendation_requests` e as leituras que dependem dele. O resto
  das Indicações, portado na COM-002, fica como está.

**Muda só onde a vila toca:**
- **Anúncio:** a audiência passa a ser só a cidade. Sai `listings.community_id`, com o CHECK de audiência exclusiva e
  as leituras que olham a vila.
- **Prestador:** sai a vila como atestadora, como dona do convite e como alcance. A regra nova de quem convida está
  na seção 6, como decisão do dono.
- **Exclusão de conta:** `finalize_account_deletion` deixa de ler as tabelas e colunas que saem, com teste.

**Não entra, e fica como está:**
- o resto da fundação: cidade e bairros, perfil, entrada, verificação, família, notificações, mensagens, denúncias,
  mercado, imóveis, pedidos de serviço e Guia;
- **o evento da cidade.** O encontro existe fora de grupo, na agenda da cidade, como no protótipo
  (`prototypes/bivaque-html/src/features/events/editor.js`; dono, 24/10/2026). O redesenho só cobre o evento ligado
  a um grupo, que tem a visibilidade do grupo.

### 2. O grupo pertence à cidade

- O grupo pertence a uma cidade (`locality_id`), como no protótipo, onde os grupos ficam nos dados de cada cidade.
  Não há nível entre a cidade e o grupo.
- Os estados são:
  - **Aberto:** qualquer membro verificado da cidade lê e entra;
  - **Fechado:** quem não é membro vê nome, descrição e regras; o conteúdo é só dos membros; entra-se por pedido;
  - **Encerrado:** só leitura para quem participava, fora da busca e das listas.
- As decisões de grupo do ADR-20261023 continuam valendo, salvo o que este ADR muda: regras, aviso por grupo,
  publicação fixada, motivo do pedido, convite, encerrar sem prazo e sair passando a administração.

### 3. Como se escreve

1. **Retrato do estado atual.** Antes de escrever, tira-se o estado final de cada objeto do domínio e de tudo que
   toca a vila, por três fontes, porque nenhuma basta sozinha:
   - **o catálogo do Postgres**, num banco local resetado: colunas, FKs, CHECKs, policies com o texto de `USING` e
     `WITH CHECK`, triggers, grants por tabela e por coluna, funções, buckets e valores de enum. O `pg_depend` entra
     só para o que ele rastreia;
   - **a busca nas definições**: o corpo de cada função e de cada policy, procurando as tabelas e colunas do domínio
     e da vila. O `pg_depend` não enxerga o que está dentro de `AS $$ ... $$`;
   - **os vínculos sem FK** e os consumidores: ids soltos (`provider_reach.scope_id`, `reports.target_id`, contexto
     das mensagens, destino das notificações, caminhos de storage), o app (`apps/web/`, `apps/mobile/`), o seed
     (`supabase/seed.sql`) e os testes.
2. **Matriz de permissão.** É a especificação dos testes e precisa da aprovação do dono antes da migration. Cobre,
   para cada objeto do domínio:
   - **quem:** dono, moderador, membro, membro só leitura, membro com pedido, membro da cidade fora do grupo, pessoa
     de outra cidade, conta suspensa, conta em exclusão, operador e anônimo;
   - **o quê:** ler, criar, editar, excluir e moderar, **por coluna** onde a permissão é por coluna (o aviso por
     grupo é privado da própria pessoa; papel e status só mudam pelas RPCs);
   - **em que estado:** Aberto, Fechado e Encerrado;
   - **as transições:** o que um UPDATE pode mudar de um valor para outro (ninguém se promove; publicação não troca
     nem perde o grupo; conteúdo removido pela moderação não volta pelo autor e guarda a evidência para o operador);
   - **o bloqueio:** a seção 4.
   Cada regra do retrato é marcada na matriz como mantida, mudada ou removida, com o motivo. As regras já entregues
   no lote 5 entram nela: publicação só em grupo, base do grupo, motivo e limite de pedido.
3. **Uma migration de redesenho**, numa transação só.
   - Remove todas as policies, triggers e funções do domínio pela lista do retrato, nome a nome, nunca por padrão
     de nome.
   - Ajusta as colunas: sai `community_id`, entra `locality_id` onde faltar.
   - Recria as regras a partir da matriz.
   - Os nomes de tabela ficam, para o app não ser reescrito de uma vez.
   - RLS ligado e forçado em toda tabela do domínio, e grants mínimos.
4. **A vila sai na mesma leva.**
   - Saem `communities`, `community_memberships`, `community_invitations` e `community_join_reasons`, com as funções,
     triggers, policies, buckets e valores de enum que só servem a elas.
   - Saem as colunas e os ramos de vila da fundação, conforme a seção 1.
   - No app, saem as rotas, as bibliotecas e os testes de vila. Os redirecionamentos da COM-004 ficam.
   - O seed deixa de criar vila e participação de vila.
5. **Testes:**
   - **Os testes negativos do domínio não são jogados fora.** Cada um é adaptado ao esquema novo e continua rodando
     até a suíte nova provar a mesma proteção. Só sai o teste que testa a vila.
   - Cada célula da matriz vira um teste pgTAP positivo e um negativo.
   - **Um teste trava a definição das regras, não só o nome:** compara o texto normalizado de `USING` e `WITH CHECK`
     de cada policy, a lista de triggers e os grants de cada tabela do domínio com o aprovado. Policy nova, policy
     afrouxada (`USING (true)`) ou grant a mais falham o teste.
   - **Os testes da fundação continuam e precisam seguir verdes:** são eles que provam que o redesenho não quebrou o
     resto.
6. **As telas de grupo e de publicação** são refeitas na pele do ADR-20261022-porte-visual-material-web, sobre o
   esquema novo, com comparação de captura com o protótipo.

### 4. O bloqueio: o contrato fica definido agora, o efeito vem depois

As regras do domínio não chamam um booleano genérico. O contrato da função de bloqueio é fixado na matriz (R2), com:

- **a direção:** quem bloqueou e quem foi bloqueado, e o que cada lado deixa de ver ou de fazer, como no ADR-20261023
  (seção 5);
- **a ação:** ler, responder, comentar, reagir, entrar em contato;
- **as exceções:** quem bloqueou continua denunciando; o operador não é afetado; "Ver mesmo assim" é um parâmetro da
  leitura de detalhe, usado só por quem bloqueou;
- **os consumidores:** as policies e RPCs de leitura e escrita do domínio **e os triggers que geram notificação**
  (`notify_group_post`, `notify_group_pin`, `notify_comment` e os que vierem), que consultam o bloqueio antes de
  emitir.

Nesta leva a função tem a assinatura final e não bloqueia ninguém. A frente de bloqueio (D1 e D2 do ADR-20261023)
implementa o corpo, generaliza `dm_blocks`, corta o que está na fila e prova cada consumidor, sem reescrever as
regras do domínio.

### 5. O que acontece com o lote 5

- **COM-001** (publicação só em grupo), **COM-003** (base do grupo) e **COM-005** (motivo e limite do pedido) ficam
  na base do lote como estão. As regras deles entram na matriz; os testes deles são adaptados e mantidos; a migration
  de redesenho substitui as regras deles.
- **COM-002** (perguntas) e **COM-004** (navegação) seguem. A COM-002 recebe só a mudança de "Também perguntar à
  cidade".
- **B3** (sair e encerrar), **B4** (conduta e denúncia no grupo) e **C1 a C3** (conteúdo do grupo) deixam de ser
  tarefas de remendo. O comportamento deles entra na matriz e no redesenho. Os contratos COM-006 e COM-007 são
  cancelados.
- **D1 e D2** (bloqueio) viram a frente que implementa o corpo da função de bloqueio, depois do redesenho. **D3**
  (`hidden_posts`) entra no redesenho.

### 6. Quem convida prestador

Sem a vila, o prestador continua preso à cidade (`provider_accounts.locality_id` já é obrigatório). **Só o operador
convida e atesta prestador** (dono, 24/10/2026). Os membros deixam de convidar. A indicação de negócio por membros
volta com o lote 6 (Negócios), com regra própria.

### 7. Frentes

| Tarefa | Escopo | Quem | Depende de |
|---|---|---|---|
| R1 | Retrato do domínio e de tudo que toca a vila, pelas três fontes | modelo barato, sem decisão | — |
| R2 | Matriz de permissão, com colunas, transições e o contrato do bloqueio | rascunho por modelo, revisão do coordenador, aprovação do dono | R1 |
| R3 | Migration de redesenho e saída da vila no banco, testes negativos adaptados, suíte nova, teste que trava as definições, seed | implementador, revisor diferente e revisão de segurança | R2 |
| R4 | Saída da vila no app: rotas, bibliotecas, tipos, prestador e anúncio | implementador | R3 |
| R5 | Telas de grupo e de publicação na pele Material, sobre o esquema novo | implementador, por tela | R3 |
| R6 | Integração e ensaio de deploy | coordenador | R4, R5 |

R4 e R5 podem correr em paralelo depois de R3. A migration de redesenho usa a faixa `20261025100000`.

### 8. Integração e deploy

- R3, R4 e R5 integram numa branch só. **O merge na main só acontece depois de R6.**
- R6 prova:
  - **o upgrade:** a migration aplicada sobre um banco no estado da main atual, com o seed antigo aplicado antes,
    sem erro e com a suíte inteira verde depois;
  - **o reset:** banco do zero, com o seed novo, e a suíte inteira verde;
  - **a transação:** a migration é uma transação só; se uma parte falha, nada fica aplicado;
  - o e2e nos três tamanhos, a captura comparada ao protótipo e o medidor de alcance.
- **Deploy:** banco e app vão juntos. Entre a migration rodar em produção e o app novo subir, o app antigo quebra nas
  telas do domínio. Como produção não tem uso real, a janela é aceita, desde que o dono confira antes que as tabelas
  do domínio, da vila, de prestador e de anúncio estejam vazias em produção. Com uso real, isso vira uma janela de
  manutenção anunciada.

### 9. Fora deste ADR

- **Consolidar as migrations numa base limpa** (hoje são 213). Exige refazer o banco de produção e fica para uma
  decisão própria do dono, depois do redesenho.
- O corpo do bloqueio (D1 e D2), que vem depois, pela função de contrato fixo.
- Os itens que o ADR-20261023 já deixou fora do lote 5: enquete, Oferta, aba Negócios, indicação de negócio, Turma
  de chegada, seletor de interesses e "Útil" que ordena.

## Alternatives considered

- **Continuar remendando** (B3, B4, C1 a C3). Rejeitada: o grupo continua preso à vila, e cada regra nova fica em cima
  de policies antigas, onde os três defeitos do lote apareceram.
- **Tabelas novas com outro nome e corte no fim** (`groups_v2` e similares). Rejeitada: dobra o código durante a
  transição, e sem dado para preservar não há o que proteger com o paralelo.
- **Redesenhar o banco inteiro agora**, com base limpa de migrations. Rejeitada por ora: joga fora a fundação, que
  segue o protótipo e está testada, e exige refazer o banco de produção. A consolidação fica para depois.
- **Só tirar a vila e manter as regras do grupo como estão.** Rejeitada: tira a dependência, mas mantém as camadas de
  policies.
- **Deixar a vila na fundação e tirar só do domínio.** Rejeitada: prestador e anúncio continuariam presos a uma
  entidade que não existe no produto, e a vila não sairia do banco.

## Market or reference baseline

Grupos presos ao lugar, com estados Aberto e Fechado e arquivamento, são o modelo de Grupos do Facebook, Comunidades
do WhatsApp e Nextdoor (grupos do bairro). Nenhum deles tem um nível intermediário como a vila.

## Proposed divergence from baseline

Nenhuma nova. As divergências do protótipo e do mercado continuam as do ADR-20261023.

## Evidence and sources

- Inventários de 23 e 24/10/2026: `docs/agents/inventario/2026-10-23-documentos.md` e
  `docs/agents/inventario/2026-10-24-banco-codigo-testes.md` (branch `codex/inventario-legado`).
- Crítica do Codex de 24/10/2026, resumida em `critic_review`.
- Revisões independentes do lote 5: COM-001, COM-003 e COM-005 (Codex, 23 e 24/10/2026), com os três defeitos de
  camada.
- Vila na fundação: `20260822014934_provider_accounts.sql:23`, `20260825181742_provider_invitations.sql:17`,
  `20260911043053_listings_market_and_homes.sql:50,57`, `20260825185327_provider_showcase.sql:40`,
  `20261023110000_member_entry_moments.sql:243`, `supabase/seed.sql:871`.
- Protótipo: `prototypes/bivaque-html/src/data/demo/source.js` (grupos por cidade, `comms`; encontros por cidade,
  `events`), `src/features/groups/` ("Também perguntar à cidade" em `handlers.js:30`), `src/features/events/editor.js`.
- Limite do `pg_depend` para corpo de função: documentação do PostgreSQL, "Dependency Tracking".
- Estado de produção: dono, 23/10/2026.

## Benefits

- As regras do domínio ficam num lugar só, legíveis e travadas por teste, inclusive no texto.
- A vila sai do banco, do app, do seed e dos testes, inclusive de prestador e anúncio.
- O bloqueio entra depois sem reescrever o domínio.
- O que o lote 5 já entregou é aproveitado como especificação e como teste.

## Risks

- **Uma regra útil sumir no redesenho**, por estar numa policy antiga ou no corpo de uma função. Mitigação: o retrato
  pelas três fontes; cada regra antiga marcada na matriz; os testes negativos antigos adaptados e mantidos.
- **Uma policy sobrar ou ficar frouxa.** Mitigação: o teste que trava o texto das regras e os grants, e RLS forçado.
- **Quebrar a fundação** por dependência cruzada: notificações, denúncias, mensagens, exclusão de conta, prestador e
  anúncio. Mitigação: o retrato inclui os consumidores, e a suíte da fundação precisa seguir verde.
- **O upgrade falhar em produção** mesmo passando no reset. Mitigação: o ensaio de upgrade sobre o estado da main com
  o seed antigo, e a migration numa transação.
- **A migration rodar em produção com dado real**, se o uso começar antes do deploy. Mitigação: a conferência de
  produção vazia, pelo dono, antes do deploy.

## Reversal cost

Alto depois do deploy, porque a vila é apagada. Antes do deploy, baixo: é uma branch. Por isso o deploy depende da
conferência de produção vazia e do ensaio de upgrade.

## Success metric

- Nenhuma referência a `communities` no banco, no app, no seed e nos testes, salvo os redirecionamentos.
- Cada célula da matriz tem teste positivo e negativo, e o texto das regras de cada tabela é exatamente o aprovado.
- Os testes negativos antigos do domínio, adaptados, continuam verdes.
- A suíte da fundação continua verde.
- Upgrade e reset ensaiados, os dois verdes.
- O e2e de grupo e de publicação passa nos três tamanhos, com captura comparada ao protótipo.

## Reopen condition

Reabrir se o retrato mostrar dependência da vila que não caiba nesta leva, ou se o banco de produção tiver dado real
antes do deploy.
