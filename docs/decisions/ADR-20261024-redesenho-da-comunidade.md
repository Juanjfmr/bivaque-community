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
critic_review:
---

# O domínio da Comunidade é redesenhado a partir do protótipo

## Problem

O ADR-20261023-comunidade-do-prototipo levou a Comunidade e os grupos para o protótipo tarefa a tarefa, remendando o
banco que existia. O inventário de 24/10/2026 (`docs/agents/inventario/2026-10-24-banco-codigo-testes.md`, branch
`codex/inventario-legado`) mostrou por que isso não fecha:

- **O grupo está preso à vila.** `groups`, publicações, eventos, o alcance de prestador e o contexto das mensagens
  apontam para `communities`, que é a vila. Vila não existe nesta versão do produto. Enquanto o grupo depender
  dela, a vila não sai do banco, e cada regra nova de grupo é escrita em cima dela.
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
no lugar; a vila sai na mesma leva.**

### 1. O que é o domínio

**Entra:**
- grupos e participação em grupo, com pedido de entrada, motivo e tentativas;
- publicações, comentários, reações ("Útil"), salvar e seguir publicação, publicação fixada e ocultar publicação
  (`hidden_posts`);
- o vínculo opcional do evento com um grupo.

**Não entra, e fica como está:**
- a fundação: cidade e bairros, perfil, entrada, verificação, família, notificações, mensagens, denúncias,
  exclusão de conta, mercado, imóveis, prestadores, pedidos de serviço e Guia;
- as perguntas e respostas da cidade (Indicações), já portadas na COM-002;
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

1. **Retrato do estado atual, tirado do banco.** Antes de escrever, extrai-se de um banco local resetado o estado
   final de cada objeto do domínio: colunas, FKs, policies, triggers, funções, grants e valores de enum. Também a
   lista de tudo que depende de `communities`, tirada do próprio Postgres (`pg_depend`), e não de busca por nome.
   O inventário de 24/10 agrupou por domínio e não serve para isso.
2. **Matriz de permissão.** Para cada objeto do domínio: quem (dono, moderador, membro, membro com pedido, membro
   da cidade fora do grupo, pessoa de outra cidade, conta em exclusão, anônimo) faz o quê (ler, criar, editar,
   excluir, moderar) em cada estado do grupo (Aberto, Fechado, Encerrado).
   - A matriz vem do protótipo, deste ADR e do ADR-20261023.
   - As regras já entregues no lote 5 entram nela: publicação só em grupo, base do grupo, motivo e limite de pedido.
   - A matriz é a especificação dos testes e precisa da aprovação do dono antes da migration.
3. **Uma migration de redesenho.**
   - Remove todas as policies, triggers e funções do domínio pela lista do retrato, nome a nome, nunca por padrão
     de nome.
   - Ajusta as colunas: sai `community_id`, entra `locality_id` onde faltar.
   - Recria as regras a partir da matriz.
   - Os nomes de tabela ficam, para o app não ser reescrito de uma vez.
   - RLS ligado e forçado em toda tabela do domínio, e grants mínimos.
4. **O bloqueio passa por uma porta só.** Toda leitura e escrita do domínio que depende de quem é o autor consulta
   uma função única de bloqueio. Nesta leva ela não bloqueia ninguém. A frente de bloqueio (D1 e D2 do ADR-20261023)
   implementa essa função depois, sem reescrever as policies do domínio de novo.
5. **A vila sai na mesma leva.**
   - Saem `communities`, `community_memberships`, `community_invitations` e `community_join_reasons`, com as funções,
     triggers, policies, buckets e valores de enum que só servem a elas.
   - O alcance de prestador e o contexto das mensagens perdem o ramo de vila.
   - No app, saem as rotas, as bibliotecas e os testes de vila. Os redirecionamentos da COM-004 ficam.
6. **Uma suíte de testes nova.**
   - Cada célula da matriz vira um teste pgTAP positivo e um negativo.
   - Um teste trava o conjunto exato de policies e funções de cada tabela do domínio: policy que não está na matriz
     falha o teste.
   - Os testes antigos do domínio saem na mesma leva.
   - **Os testes da fundação continuam e precisam seguir verdes:** são eles que provam que o redesenho não quebrou o
     resto.
7. **As telas de grupo e de publicação** são refeitas na pele do ADR-20261022-porte-visual-material-web, sobre o
   esquema novo, com comparação de captura com o protótipo.

### 4. O que acontece com o lote 5

- **COM-001** (publicação só em grupo), **COM-003** (base do grupo) e **COM-005** (motivo e limite do pedido) ficam
  na base do lote como estão. As regras deles entram na matriz; os testes viram casos da suíte nova; a migration de
  redesenho substitui as regras deles.
- **COM-002** (perguntas) e **COM-004** (navegação) estão fora do domínio e seguem.
- **B3** (sair e encerrar), **B4** (conduta e denúncia no grupo) e **C1 a C3** (conteúdo do grupo) deixam de ser
  tarefas de remendo. O comportamento deles entra na matriz e no redesenho. Os contratos COM-006 e COM-007 são
  cancelados.
- **D1 e D2** (bloqueio) viram a frente que implementa a função única de bloqueio, depois do redesenho. **D3**
  (`hidden_posts`) entra no redesenho.

### 5. Frentes

| Tarefa | Escopo | Quem | Depende de |
|---|---|---|---|
| R1 | Retrato do domínio e dependências de `communities`, tirados do banco | modelo barato, sem decisão | — |
| R2 | Matriz de permissão | rascunho por modelo, revisão do coordenador, aprovação do dono | R1 |
| R3 | Migration de redesenho, função de bloqueio vazia, suíte pgTAP nova | implementador, revisor diferente e revisão de segurança | R2 |
| R4 | Saída da vila no app: rotas, bibliotecas, testes, tipos | implementador | R3 |
| R5 | Telas de grupo e de publicação na pele Material, sobre o esquema novo | implementador, por tela | R3 |
| R6 | Integração: suíte inteira, e2e nos três tamanhos, captura e medidor de alcance | coordenador | R4, R5 |

R4 e R5 podem correr em paralelo depois de R3. A migration de redesenho usa a faixa `20261025100000`.

### 6. Fora deste ADR

- **Consolidar as migrations numa base limpa** (hoje são 213). Exige refazer o banco de produção e fica para uma
  decisão própria do dono, depois do redesenho.
- O bloqueio de verdade (D1 e D2), que vem depois, pela função única.
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

## Market or reference baseline

Grupos presos ao lugar, com estados Aberto e Fechado e arquivamento, são o modelo de Grupos do Facebook, Comunidades
do WhatsApp e Nextdoor (grupos do bairro). Nenhum deles tem um nível intermediário como a vila.

## Proposed divergence from baseline

Nenhuma nova. As divergências do protótipo e do mercado continuam as do ADR-20261023.

## Evidence and sources

- Inventários de 23 e 24/10/2026: `docs/agents/inventario/2026-10-23-documentos.md` e
  `docs/agents/inventario/2026-10-24-banco-codigo-testes.md` (branch `codex/inventario-legado`).
- Revisões independentes do lote 5: COM-001, COM-003 e COM-005 (Codex, 23 e 24/10/2026), com os três defeitos de
  camada.
- Protótipo: `prototypes/bivaque-html/src/data/demo/source.js` (grupos por cidade, `comms`; encontros por cidade,
  `events`), `src/features/groups/`, `src/features/events/editor.js`.
- Estado de produção: dono, 23/10/2026.

## Benefits

- As regras do domínio ficam num lugar só, legíveis e travadas por teste.
- A vila sai do banco, do app e dos testes.
- O bloqueio entra depois sem reescrever o domínio.
- O que o lote 5 já entregou é aproveitado como especificação.

## Risks

- **Uma regra útil sumir no redesenho**, por estar numa policy antiga que ninguém lembrava. Mitigação: o retrato vem
  do banco; cada regra antiga é marcada na matriz como mantida, mudada ou removida, com o motivo.
- **Uma policy sobrar**, ou o redesenho deixar uma tabela sem regra. Mitigação: o teste que trava o conjunto exato
  de policies por tabela, e RLS forçado.
- **Quebrar a fundação** por dependência cruzada: notificações, denúncias, mensagens, exclusão de conta. Mitigação:
  as dependências vêm do `pg_depend`, e a suíte da fundação precisa seguir verde.
- **A migration rodar em produção com dado real**, se o uso começar antes do deploy. Mitigação: antes do deploy, o
  dono confere que as tabelas do domínio e da vila estão vazias em produção.
- **O app ficar quebrado entre R3 e R5.** Mitigação: R3, R4 e R5 integram numa branch só e vão juntos para a main.

## Reversal cost

Alto depois do deploy, porque a vila é apagada. Antes do deploy, baixo: é uma branch. Por isso o deploy depende da
conferência de produção vazia.

## Success metric

- Nenhuma referência a `communities` no banco, no app e nos testes, salvo os redirecionamentos.
- Cada célula da matriz tem teste positivo e negativo, e o conjunto de policies de cada tabela é exatamente o da
  matriz.
- A suíte da fundação continua verde.
- O e2e de grupo e de publicação passa nos três tamanhos, com captura comparada ao protótipo.

## Reopen condition

Reabrir se o retrato mostrar dependência da vila fora do domínio que não caiba nesta leva, ou se o banco de produção
tiver dado real do domínio antes do deploy.
