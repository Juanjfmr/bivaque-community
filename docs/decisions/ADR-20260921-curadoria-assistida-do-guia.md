---
id: ADR-20260921-curadoria-assistida-do-guia
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-21
expires_at:
linked_plan: docs/superpowers/specs/2026-09-20-resposta-candidata-guia-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e escolha explicita do dono (Juan) na sessao de 21/09/2026 — ver a secao Approval.
---

# O Guia se alimenta por um job, nao pela mao de quem respondeu

## Problem

A direcao desenhada em 20/09/2026 fazia a resposta de uma indicacao alimentar o Guia: a
resposta publicava na hora, a referencia inexistente virava candidata com a etiqueta
`Ainda nao esta no Guia`, e a aprovacao posterior religava a resposta ao item canonico.

Duas coisas derrubam esse desenho.

A primeira e de servidor. A unica policy de leitura de `arrival_guide_entries` para membro
exige `status = 'approved'` — a permissiva anterior foi derrubada em `20260815210000`. Logo o
membro nao consegue ler a propria candidata pendente, e a etiqueta seria a interface afirmando
o que o servidor nao sabe. E exatamente o que o `forbidden` do DS-006 proibe.

A segunda e de produto e de operacao. Curadoria e humana por decisao (prancha 74: "Nada e
publicado automaticamente"), e `public.operators` nao tem `locality_id` — operador e papel
global. Num produto nacional, a carga cresce com cidades x usuarios. Pior: o valor esta em
lugares unicos e a carga vem de submissoes, entao a mesma transportadora indicada por dezenas
de pessoas viraria dezenas de itens de fila.

Na vida real alguem pergunta, outro responde, e acabou. Pedir que quem respondeu pense em fila
de curadoria e colocar maquinaria operacional dentro de uma conversa.

## Decision

**1. O fluxo voltado ao membro nao sera construido.** Pergunta, resposta, fim. Sem etiqueta
`Ainda nao esta no Guia`, sem candidata vinculada a resposta, sem cota exposta e sem tela de
"minhas sugestoes". O membro nunca precisa pensar em curadoria.

**2. O Guia continua alimentado pelos dois caminhos que ja existem.** Sugestao deliberada em
`/guide/sugerir` (prancha 12/61, ja construida, chama `suggest_guide_entry`), e promocao de uma
resposta boa pelo operador via `promote_reply_to_guide_entry`.

**3. Entra um job agendado que prepara a fila.** E o **nono** job do padrao ja estabelecido no
repositorio — `pg_cron` manda, o banco prepara as linhas devidas e entrega ao endpoint interno
do Next por `pg_net`, a aplicacao e dona do adaptador. O job:

- le respostas com sinal de qualidade, comecando por `recommendation_requests.resolved_reply_id`;
- extrai nome e categoria do lugar;
- deduplica contra o Guia daquela localidade **antes** de escrever;
- grava `pending` com `source = 'ai'`, `confidence` e `source_reply_id`.

**4. A religacao sai de graca.** `arrival_guide_entries.source_reply_id` ja existe e ja e o que
move o `Ver no Guia`. Quando o operador aprova, a resposta que originou a candidata passa a
exibir o vinculo sozinha, sem uma linha de interface nova e sem acao do membro.

**5. A migration acompanha duas coisas.** O agendamento do `pg_cron` e um **indice unico
parcial** em `source_reply_id` — hoje ele nao existe, apesar de o comentario de
`20260821000006:16-17` afirmar que existe. Sem ele, job e promocao manual podem gravar duas
entradas para a mesma resposta.

**6. O job envia o minimo.** Manda o corpo da resposta, que e o que a extracao usa, e **nao
manda `author_id`**. Nao por sigilo — o corpo ja e visivel a todo membro verificado da cidade —
mas porque nao ha razao para enviar identidade junto de um trabalho que nao a usa.

**7. Limites contra fila de maquina.** Teto por localidade por execucao e piso de `confidence`
abaixo do qual nada entra na fila. A pressao de fila saiu do membro e nao pode voltar pela
maquina em escala maior.

**8. A tela do operador e desenhada contra o carimbo.** O texto original da resposta aparece ao
lado da candidata — sem ele o operador nao julga sentimento, e "nao usem a Transmuda" vira
entrada no Guia. Recusar tem de ser tao barato quanto aprovar, e a fila amostra itens ja
conhecidos como ruins para medir se a revisao continua acontecendo de fato.

## Alternatives considered

**Coluna de vinculo na resposta.** `recommendation_replies` ganharia `guide_entry_id`.
Recusada: apontaria para uma linha `pending` que o membro nao pode ler, entao a interface teria
de inferir o estado a partir de uma FK que nao resolve — e ilegivel tambem significa excluida ou
de outra localidade.

**Tabela de vinculo resposta-candidata.** Resolve a forma do dado e a cardinalidade, mas mantem
a maquinaria de curadoria no caminho do membro e faz a fila crescer com o volume de conversa.
Foi a recomendacao do contrato funcional; e recusada aqui por produto, nao por tecnica.

**Escrever `source_reply_id` no momento da sugestao.** Recusada por cardinalidade:
`source_reply_id` e uma coluna unica na entrada, entao uma entrada credita no maximo uma
resposta. A relacao real e muitas respostas para um lugar.

## Market or reference baseline

A revisao no Mobbin (Nextdoor, 20/09/2026) mostra recomendacao tratada como conversa, com a
curadoria do diretorio separada e invisivel ao leitor. O leitor nunca ve estado de fila.

## Proposed divergence from baseline

Nenhuma divergencia material do baseline externo. A divergencia e das nossas proprias pranchas:
**o painel 2 da prancha 80 nao sera construido** e a nota de 20/09 em
`MOBBIN-INDICACOES-2026-09-20.md` descreve um fluxo que este ADR decide nao fazer. As duas
precisam registrar a divergencia em vez de continuar prometendo.

Fica em aberto, e **nao e decidido aqui**, o conflito de redacao entre `Ajudou a resolver`
(ADR-20260909, aprovado, R3) e `Resolveu meu pedido` (pranchas de 20/09). E decisao separada.

## Evidence and sources

- Policy unica de leitura para membro: `arrival_guide_select_approved_locality_member`
  (`status = 'approved'` + `private.is_locality_member`); a permissiva anterior foi derrubada
  em `20260815210000_arrival_guide_curation.sql:24`.
- `public.operators` tem `auth_user_id`, `granted_by`, `revoked_at` e **nao** tem `locality_id`
  (`20260806040949_operator_authorization.sql:22`) — operador e global.
- `arrival_guide_entries.source` aceita `'manual'` e `'ai'`, e existe `confidence smallint 0-100`
  (`20260815210000:9-14`). O seed ja traz uma entrada `pending` com `source = 'ai'`.
- `pg_cron` habilitado em `20260814074813`; padrao de worker em `20260814174705_outbox_worker.sql`;
  **oito jobs ja agendados** em `cron.job` (`bivaque-account-deletion-purge`,
  `bivaque-advance-recurring-events`, `bivaque-heartbeat`, `bivaque-listing-alerts`,
  `bivaque-outbox-worker`, `bivaque-recurring-event-reminders`,
  `bivaque-verification-document-ttl-purge`, `bivaque-verification-reconcile`) — verificado por
  consulta ao banco local em 21/09/2026. Uma revisao anterior desta secao dizia "quatro"; a
  contagem estava errada e o job desta decisao e o **nono**, nao o quinto.
- `promote_reply_to_guide_entry` cria o item `approved` com `source_reply_id` e a linha em
  `recommendation_reply_promotions` (`20260821000006:43-103`), service_role apenas.
- Caminho positivo provado em runtime no ciclo DS-006: entrada `224b9819` "Eletricista Nivaldo",
  `approved`, `source_reply_id=7de625a3`, com `Ver no Guia` lido pelo membro apos recarga.
- **Nao existe** indice unico em `source_reply_id` — verificado em `pg_indexes` no banco local,
  contra o que afirma o comentario em `20260821000006:16-17`.
- `/guide/sugerir` ja construida e chamando `suggest_guide_entry`; nenhuma tela consulta
  `submitted_by`, entao hoje a sugestao nao tem acompanhamento.

## Benefits

- O membro nao ve nada de curadoria: pergunta, resposta, fim.
- A fila deixa de crescer com o volume de conversa e passa a crescer com lugares novos.
- A deduplicacao acontece antes da fila, nao dentro dela.
- A religacao ao item canonico sai de graca, reusando coluna que ja existe.
- Nada do que o DS-006 entregou precisa ser refeito.

## Risks

- **Carimbo.** Fila pre-aprovada com IA que acerta quase sempre faz o operador parar de ler, e
  "a aprovacao e humana" vira verdade no papel e falsa na pratica. Mitigado pelo desenho da
  tela e pela amostragem da decisao 8.
- **Falso positivo de sentimento.** Recomendacao negativa virando entrada. Mitigado pelo texto
  original ao lado da candidata.
- **Fila de maquina.** Mitigado pelo teto por localidade e pelo piso de confianca.
- **Operador global.** A carga continua concentrada. Operador por localidade fica registrado
  como decisao futura propria, nao resolvida aqui.

## Reversal cost

Baixo. O job se desagenda com um `cron.unschedule`, e **nenhuma interface do membro depende
dele** — por construcao, o membro nao ve nada disso. As entradas ja criadas permanecem validas
porque sao entradas normais do Guia, distinguidas apenas por `source = 'ai'`.

## Success metric

Proporcao de itens da fila aprovados sem edicao, e proporcao de recusados. Se a recusa tender a
zero, a revisao virou carimbo e a decisao 8 falhou. Tambem: numero de candidatas duplicadas que
chegam a fila, que deve tender a zero se a deduplicacao estiver antes dela.

## Reopen condition

Reabrir se o uso mostrar que o leitor sente falta de saber que um lugar esta a caminho do Guia,
ou se a recusa na fila tender a zero de forma sustentada. Reabrir tambem quando operador por
localidade for decidido, porque muda quem ve qual fila.

## Approval

Aprovado em 21/09/2026 pelo dono do produto (Juan), na sessao em que a alternativa voltada ao
membro foi construida, criticada e descartada por ele. A formulacao "para o usuario, um pergunta
o outro responde e fim; para o sistema, um job com IA le, cura e entrega pre-aprovado ao
operador" e dele.

Registrado tambem por ele que o conteudo de uma resposta **nao e sigiloso** — ja e visivel a
todo membro verificado da cidade — e que passar esse texto por um modelo nao e problema de
privacidade. A classificacao R3 desta decisao vem da regra operavel da `RISK_MATRIX.md`, que
torna R3 qualquer mudanca que toque `supabase/migrations`, nao de sensibilidade do dado.
