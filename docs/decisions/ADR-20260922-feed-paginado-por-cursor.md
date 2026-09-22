---
id: ADR-20260922-feed-paginado-por-cursor
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-22
expires_at:
linked_plan:
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A forma da decisao e escolha explicita do dono; os parametros numericos foram fixados pelo coordenador dentro dela.
---

# O feed da Home para de carregar tudo: cursor em Recentes, lista limitada em Relevantes

## Autoria desta decisao — registrada com honestidade

**O dono decidiu a FORMA.** Sao duas: `Recentes` vira fluxo paginado por cursor, e `Relevantes` vira
**lista limitada, sem rolagem infinita**. Ele **rejeitou explicitamente** a janela de 30 dias que o
coordenador propos, com a razao: e um feed **local**, e 30 dias num feed de bairro e tempo demais.

**Os numeros sao do coordenador, dentro da forma que o dono escolheu, e sao parametros REVERSIVEIS:**
janela de **7 dias**, no maximo **20 posts**, e so entra post com **pelo menos 1 comentario**.

O piso de 1 comentario tem razao de produto, e nao estetica: sem ele, numa semana quieta `Relevantes`
mostraria posts **sem nenhuma interacao** em ordem de data — que e `Recentes` com rotulo falso. O
nome prometeria curadoria e entregaria cronologia.

Os tres numeros vivem em **funcoes SQL no schema `private`**, no padrao de
`guide_candidate_max_per_locality`, para que o pgTAP possa provar o valor em vigor e mudar qualquer um
deles seja **uma linha**.

## Problem

A Home carrega **372 cartoes** e produz `main.scrollHeight` de **129.980 px** a 1440. Medido:

- `public.feed_community` (ultima definicao em `20260915013344_post_follows.sql:79`) recebe apenas
  `p_community_id` e `p_order` — **sem `limit`, sem `offset`, sem cursor**;
- roda **quatro subconsultas laterais por post** (contagem de comentarios, contagem de reacoes,
  `my_reaction`, `my_follow`) **antes** de ordenar;
- e chamada sem limite em **tres lugares**: `(shell)/inicio/home-loaders.ts:125`,
  `(shell)/community/page.tsx:121` e `(shell)/communities/[id]/community-detail-loaders.ts:231`;
- **nao existe "carregar mais" em nenhum componente do feed.**

O custo nao e so de banda: o e2e da rodada anterior rodou 35 minutos contra o `:3210` e foi morto, com
**4 specs** abrindo a Home repetidas vezes. A hipotese a medir — nao a aceitar — e que o proprio feed
sem limite e a causa.

## Decision

**1. `Recentes` passa a ser paginado por cursor.** O cursor e o **par `created_at` + `id`**, porque os
ids de post sao `gen_random_uuid()` — **aleatorios, sem ordem** — e sozinhos nao paginam nada. O `id`
desempata posts gravados no mesmo instante.

**2. O servidor impoe o teto.** A funcao ganha `p_limit` com default 20 e o servidor **recusa acima de
50**. Sem teto, qualquer cliente pede 100 mil linhas e recria o problema que esta decisao resolve.

**3. A assinatura antiga de dois argumentos e APAGADA na mesma migration.** No Postgres, acrescentar
parametros cria **sobrecarga**: a versao sem limite continuaria existindo e chamavel, e a correcao
seria decorativa.

**4. As tres origens viram tres ramos em `UNION ALL`,** cada um com seu cursor e seu limite pelo proprio
indice, juntando e cortando no fim. O `OR` atual impede o uso de indice; com tres ramos, cada pagina le
umas 60 linhas mesmo com um mes ou dez anos de historico — os posts da comunidade, os de grupos
visiveis, e os da cidade inteira sem comunidade nem grupo.

**5. Indices.** Hoje existem `posts (community_id, created_at desc)` e `posts (locality_id, created_at
desc)`, **sem `id`**. Falta `group_id + created_at`, e os tres ganham `id` para casar com o cursor.

**6. Onde as laterais rodam.** Em `Recentes`, as quatro subconsultas passam a rodar **depois do
corte**, sobre os 20 escolhidos. Em `Relevantes` a contagem de comentarios **e o criterio de ordem**,
entao ali ela roda sobre a janela de 7 dias — que ja e pequena por construcao.

**7. A autorizacao atual e preservada INTEGRALMENTE:** `security definer`, `search_path` vazio, a
checagem `am_member`, a visibilidade de grupo privado, e os mesmos `revoke`/`grant`. Esta decisao muda
**quanto** se le, nunca **quem** pode ler.

## Consequencias

- **`Relevantes` nao tem rolagem infinita.** E lista limitada: 7 dias, 20 posts, minimo 1 comentario.
  Quando vazia, diz que nao ha nada em destaque nesta semana e leva para `Recentes`.
- **`Carregar mais` e botao, nao rolagem automatica.** Funciona por teclado e deixa o rodape
  alcancavel — rolagem infinita automatica cria uma armadilha de foco que esta decisao evita.
- **Falha ao carregar a pagina seguinte MANTEM o que ja esta na tela** e oferece tentar de novo. Nunca
  apaga o feed.
- **Trocar entre `Recentes` e `Relevantes` recomeca do zero.**
- A migracao de tipos (`database.generated.ts`) cobre **apenas o schema `public`**.

## Evidencia e fontes

- Achado **A1** da adjudicacao r6: feed da Home sem paginacao, `main.scrollHeight` de **129.980 px** a
  1440 com **372 cartoes** e 372 campos de comentario.
- `20260915013344_post_follows.sql:79` — ultima definicao de `feed_community`.
- `(shell)/inicio/home-loaders.ts:125`, `(shell)/community/page.tsx:121`,
  `(shell)/communities/[id]/community-detail-loaders.ts:231` — os tres chamadores sem limite.
- **24 chamadas** a `feed_community` em **quatro** arquivos pgTAP (`community-feed-locality-reach.sql`,
  `community-feeds.sql`, `post-follows.sql`, `transfer-scope-denials.sql`) e **dois** e2e que dependem
  do feed (`inicio-phone-typography.spec.ts`, `two-localities.spec.ts`). Com pagina default de 20, uma
  assercao que espera ver um post **antigo** pode quebrar — a intencao tem de ser preservada paginando
  ate ele ou ajustando a fixture, **nunca** trocando contagem exata por "maior que zero".