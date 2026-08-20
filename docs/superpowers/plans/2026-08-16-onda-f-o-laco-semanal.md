# Onda F — o laço semanal

> Plano de execução. Escrito em **2026-08-16**. Marque `- [x]` conforme avança e **commite por
> task**.
>
> Leia [`README.md`](README.md) deste diretório inteiro antes de abrir qualquer task.

## Aviso sobre a idade deste plano

Escrito antes de D2 e E fecharem. As referências de linha em `groups/`, `events/` e
`recommendations/` são de 2026-08-16 e **a onda E toca `feed-post.tsx` e `profile/`** — reconfira
antes de editar esses dois. O resto desta onda vive em arquivos que E não abre.

## Precedência: quatro ondas vêm antes desta

Emendado em **2026-08-16**, depois da sessão de treze decisões que produziu quatro ADRs. Esta é
a onda **menos afetada** — uma única chamada a `PILOT_LOCALITY_ID`, em `events/page.tsx:252`, na
criação de evento. Ainda assim:

**Execute nesta ordem, antes desta onda:**
[`P0 — localidades nacionais`](2026-08-16-p0-localidades-nacionais.md) →
[`Onda T — a transferência`](2026-08-16-onda-t-transferencia.md) →
[`Onda D2 — a porta`](2026-08-16-onda-d2-a-porta.md) →
[`Onda E — a vila`](2026-08-16-onda-e-a-vila.md).

1. Evento criado com localidade fixa numa plataforma nacional é conteúdo que nasce na cidade
   errada, e isso não tem correção barata depois que existir dado real.
2. **A Task 4 ganhou um insumo novo** — a tabela de feriados nacionais que a P0 gera na Task 1,
   Step 5. Ver a task.
3. **A Task 8 muda de casa parcialmente.** O ciclo do administrador de grupo passa a viver dentro
   do **console do fundador** e do **console do dono**, criados na D2 Task 9 — não como telas
   novas. As ações são as mesmas; o lugar é outro.
4. **A Task 3 tem um cuidado a mais.** Convidar para evento continua sem abrir diretório de
   pessoas (D43), e agora há um caso novo: alguém com transferência declarada está no nível
   municipal do destino sem pertencer a vila nenhuma de lá. Ele **pode** ser convidado para
   evento da cidade; **não** pode ser convidado para evento de vila da qual não é membro.
   Teste os dois.

## A onda é a tese do produto

O §6.3 chama isto de os dois ciclos. O **semanal** é pedir e responder: alguém pergunta, alguém
responde, **o autor é avisado**, marca como resolvido, e quem respondeu acumula isso no perfil.
O **mensal** é o encontro presencial recorrente — o que deu identidade ao Military App e o que
uma rede nacional não entrega.

Hoje o produto tem as duas metades erradas do mesmo ciclo: o pedido existe e a resposta existe,
mas **ninguém é avisado de nada**, e o encontro recorrente não existe em lugar nenhum do
código — nem tabela, nem coluna, nem tela. `grep -ri "recurring\|recorrente"` em `supabase/` e
`apps/web/` volta vazio.

Comece pela Task 1. Ela não é a mais visível; é a que decide se as outras nove estão sendo
construídas sobre chão firme.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §6.3 e §6.4, e as decisões D18, D19 e D43 na tabela §9.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) §4, §5 e §6 — especialmente a linha
   **"Server Actions de grupo e evento"**, que é a Task 1.
3. As duas lições do E2E, no `README.md`: `notFound()` responde 200 no Next 16, e o PostgREST
   não resolve embed onde não há FK.

---

## Task 1: as seis Server Actions com `service_role` — medir, depois corrigir

Seis ações fazem a mesma coisa: `createServiceClient()` e, **no mesmo cliente `service_role`**,
`supabase.auth.getUser()`.

| Arquivo | Linhas | Ação |
|---|---|---|
| `groups/[id]/page.tsx` | 35-39, 60-64, 81-85 | entrar, sair, transferir posse |
| `events/[id]/page.tsx` | 33-37, 52-56, 69-73 | RSVP, cancelar RSVP, concluir evento |

`lib/supabase/server.ts:12-17` cria esse cliente **sem cookie** e com `persistSession: false`.
A leitura do código diz que `getUser()` sem argumento não tem sessão para ler, devolve nulo, e
as seis ações lançam `"unauthenticated"` sempre — ou seja, **entrar em grupo e marcar presença
em evento estão quebrados hoje, para todo mundo.**

Isso é leitura, não medição. E há um segundo desfecho possível, muito pior: se `getUser()`
resolver algum usuário, `transfer_group_ownership` está sendo chamada com `service_role` a
partir de um formulário.

E há um terceiro problema que **independe dos outros dois**: `joinGroupAction`
(`groups/[id]/page.tsx:29-33,41-49`) aceita `desiredStatus` **vindo do formulário** e grava
`status: "approved"` se o cliente mandar isso. Com `service_role`, nenhuma policy segura. No dia
em que a autenticação for consertada sem consertar isto, qualquer pessoa entra aprovada em
qualquer grupo privado digitando um campo escondido.

- [x] **Step 1: medir antes de mexer**

  Escreva um caso que exercite `joinGroupAction` com sessão válida e **observe**. Registre o
  resultado no próprio commit. Não pule — a correção é diferente nos dois desfechos, e o
  `PRODUCT_STATUS.md` §4 pede explicitamente esta medição.

- [x] **Step 2: ler o usuário do cliente autenticado**

  As seis ações passam a autenticar pelo cliente com cookies — o mesmo padrão que
  `communities/actions.ts:8-24` já usa e que está a uma pasta de distância. Depois de ter o
  usuário, a escrita usa **o cliente autenticado**, deixando a RLS decidir.

  Duas exceções reais, e só duas:

  - `complete_event` é RPC concedida só a `service_role`;
  - `event_rsvps` não tem policy de `delete` para `authenticated`.

  Nos dois casos a saída **não** é manter `service_role` no caminho: é migration nova que
  conceda o que falta com a checagem no banco (a RPC confere que quem chama é o organizador; a
  policy de delete confere `user_id = auth.uid()`). O comentário atual em
  `events/[id]/page.tsx:18-24` diz que "as razões vivem em supabase/migrations" — as razões
  descrevem uma ausência, não uma decisão.

  Se você concluir que uma delas precisa mesmo de `service_role`, **pare e reporte** com o
  motivo. A regra 1 da §12 não tem exceção implícita.

- [x] **Step 3: `desiredStatus` sai do formulário** (RPC join_group deriva)

  O status é derivado no servidor, da visibilidade do grupo: público → `approved`; privado →
  `pending`. Nunca do corpo da requisição.

- [x] **Step 4: testes**

  - pgTAP em `supabase/tests/group-join-status.sql`: entrar em grupo público dá `approved`;
    entrar em grupo privado dá `pending`; **tentar gravar `approved` direto em grupo privado é
    negado pela RLS** (negativo obrigatório — é o teste que prova o Step 3).
  - pgTAP: `transfer_group_ownership` chamada por não-dono é negada.
  - pgTAP: dono do RSVP apaga o próprio; **não apaga o de outro** (negativo).
  - E2E `tests/e2e/group-join.spec.ts`: entrar em grupo público funciona de ponta a ponta. É a
    prova de que o caminho feliz voltou a existir.

- [x] **Step 5: gate e commit**

  `fix(authz): stop authenticating on the service-role client in six server actions` (`24b8c1b` + `b3c192b`).

---

## Task 2: RSVP completo, e o organizador sabe quem desistiu

`20260802001200_events_rsvp.sql:8` define
`event_rsvp_status as enum ('interested', 'going')`. Falta "não vou", e a mudança de RSVP não
avisa ninguém — o organizador de um churrasco descobre a desistência ao contar as cadeiras.

- [x] **Step 1: o valor novo** (`20260821000007_event_rsvp_not_going.sql`)

  `alter type public.event_rsvp_status add value 'not_going';`

  **Armadilha do Postgres, e ela já custou tempo em outros projetos:** um valor de enum
  adicionado numa transação **não pode ser usado na mesma transação**. Se esta migration
  adicionar o valor e, no mesmo arquivo, escrever uma policy, um `check` ou um `default` que o
  referencie, ela falha. Duas migrations timestamped, na ordem. O precedente no repositório é
  `20260809184316_notify_report_resolved.sql:18`, que adiciona e não usa.

- [x] **Step 2: a UI**

  Três estados, mutuamente exclusivos, com o atual visível antes do clique. "Cancelar RSVP"
  (`events/[id]/page.tsx:47-62`) continua existindo e significa outra coisa: apagar a resposta,
  não responder "não vou".

- [x] **Step 3: o organizador é avisado** (`20260821000008_event_rsvp_change_notification.sql`)

  Trigger enfileira no `outbox` — e **respeita `notification_preferences`**, que é onde a regra
  mora (Task 3 da D1, Step 2). Não replique a checagem de preferência no trigger.

  `notification_type` já tem `event_rsvp` (`20260802001400:15`). Não crie tipo novo se o
  existente serve; se criar, `alter type ... add value` com o mesmo cuidado do Step 1.

  Um aviso por mudança, não por clique: quem alterna três vezes gera um aviso, não três. Sem
  isso o produto ensina o organizador a silenciar a notificação, que é exatamente a dor da §1.1.

- [x] **Step 4: testes**

  pgTAP em `supabase/tests/event-rsvp-not-going.sql`: os três estados gravam; mudar para
  `not_going` enfileira uma linha para o organizador; **preferência desligada não enfileira**
  (negativo); alternar duas vezes em um minuto não gera dois avisos.

- [x] **Step 5: gate e commit** (`7c5e0e0`)

---

## Task 3: convite de evento — falta só o envio

Migration, RLS e UI de aceitar/recusar existem (`20260806171204_event_invites.sql`,
`events/event-invites-section.tsx:26-120`). **Não existe caminho para o organizador convidar
ninguém.** O comentário em `events/page.tsx:334` diz que o mecanismo não existe e está
desatualizado — metade dele existe.

- [x] **Step 1: a tela do organizador** (`89a0cd4`)

  Na página do evento, para o organizador: escolher entre quem ele pode convidar e enviar.

  **Quem ele pode convidar é a pergunta de fronteira**, e a resposta é a D43: **não existe busca
  de pessoas no piloto.** O convite não abre um diretório. As origens legítimas são membros da
  comunidade do evento e membros dos grupos do organizador. Se a tela precisar de um campo de
  busca livre de pessoas, o desenho está errado — **pare e reporte**.

- [x] **Step 2: fan-out** (`89a0cd4`, correção de duplicata em `46bb8fb`)

  Convidar N pessoas cria N linhas em `event_invites` e N linhas no `outbox`. A policy
  `event_invites_insert_organizer` (`:59`) já confere quem insere — passe pelo cliente
  autenticado e deixe ela trabalhar.

  Teto por evento e por janela, pela cota do Upstash da D1. Convite de evento é o vetor de spam
  mais barato que este produto vai ter.

- [x] **Step 3: o comentário obsoleto sai** (confirmado: `events/page.tsx:334` não contém mais o comentário)

  `events/page.tsx:334`. Comentário que mente é pior que comentário ausente: foi ele que fez
  esta capability ficar parada.

- [x] **Step 4: testes**

  pgTAP em `supabase/tests/event-invite-fanout.sql`: organizador convida e as linhas nascem;
  **não-organizador convidando é negado** (negativo); convidar alguém que não alcança o evento é
  negado; convite duplicado não cria segunda linha.

- [x] **Step 5: gate e commit** (`89a0cd4`)

---

## Task 4: encontro recorrente

Não existe nada. É a tese central do produto (§6.3, ciclo mensal) e o que diferencia de uma
rede nacional.

- [x] **Step 1: o modelo mais simples que resolve** (opção B do owner call registrado em `docs/agents/F4-design-question.md` — virtual, `occurrence_date` em `event_rsvps`)

  Recorrência é **coluna no evento**, não tabela nova de série com instâncias materializadas.
  Comece com o mínimo que cobre "toda primeira sexta" e "todo dia 15": um padrão declarado e a
  próxima ocorrência calculada.

  Materializar N ocorrências futuras cria N linhas para moderar, N conjuntos de RSVP e um
  problema de edição em cascata. Se depois ficar apertado, materializar é migração para frente;
  o contrário não é.

- [x] **Step 2: a próxima ocorrência** (`advance_recurring_events`, cron `bivaque-advance-recurring-events`, `0 6 * * *`)

  Job de `pg_cron` que avança a data quando a ocorrência passa. O agendador existe desde a D1
  (`20260814074813_enable_pg_cron.sql`) — reuse, não crie um segundo mecanismo.

- [x] **Step 3: o RSVP é da ocorrência** (`event_rsvps.occurrence_date`, PK `(event_id, user_id, occurrence_date)`)

  Marcar presença em "o churrasco de setembro" não marca presença em outubro. Se o modelo do
  Step 1 não distinguir as duas, ele está errado — **pare e reporte antes de escrever a
  migration**, porque isto decide o desenho inteiro.

- [x] **Step 4: o feriado é avisado, não corrigido**

  Insumo novo, vindo da P0. A P0 gera uma tabela de **feriados nacionais** versionada, a partir
  de `GET https://brasilapi.com.br/api/feriados/v1/{ano}` — `{date, name, type, weekday}`, 14
  entradas em 2026 — pelo mesmo script e sob a mesma regra: **geração, nunca runtime**.

  O caso que quebra o encontro recorrente não é só "dia 31 em mês de 30". É a reunião de toda
  primeira sexta caindo no Carnaval. A tela **avisa o organizador** no momento de publicar a
  recorrência, e ele decide: manter, pular a ocorrência, ou mover.

  **Não mova a data sozinho.** Churrasco de vila em feriado costuma ser o ponto, não o problema —
  e um algoritmo que "conserta" a data do encontro de outra pessoa erra de um jeito que ninguém
  entende depois.

  Limitação a registrar na UI: a rota devolve só feriado **nacional**. Feriado municipal e
  estadual não estão lá e **não devem ser inventados** — a tela diz que confere só os nacionais.

- [x] **Step 5: lembrete** (`private.send_recurring_event_reminders`, cron `bivaque-recurring-event-reminders`, `0 12 * * *` — `notifications` + `outbox`, mesmo par que `recommendation_reply_notify`)

  Enfileirar no `outbox` antes da ocorrência, respeitando preferência. Encontro que ninguém
  lembra não é ciclo mensal — é uma linha na tabela.

- [x] **Step 6: testes** (`supabase/tests/recurring-events.sql`, 14 asserts)

  pgTAP em `supabase/tests/recurring-events.sql`: padrão mensal produz a data certa na virada do
  mês; **dia 31 em mês de 30 não produz data inválida** (é o caso que quebra implementação
  ingênua); evento concluído não avança; o lembrete respeita opt-out (negativo).

  Unitário sobre o aviso de feriado: recorrência que cai em 2026-02-16 é sinalizada como
  Carnaval; recorrência em dia útil não é sinalizada (positivo e negativo); **a data não é
  alterada em nenhum dos dois casos**. A checagem vive no banco (`check_recurrence_holiday`),
  não em JS — o teste fica em pgTAP em vez de `tests/unit` por isso, mas é a mesma asserção que
  o plano pede, na mesma data que o plano nomeia (`2026-02-16`, Carnaval, do catálogo da P0).

  **QA manual no navegador** (checklist real, não só pgTAP): logado como conta com transferência
  declarada, criei um evento recorrente ponta a ponta pela UI real — checkbox, seletor de
  padrão, aviso de feriado ao vivo (mudei o dia para 16/fev e o banner "cai em Carnaval"
  apareceu antes do submit), snap para a data real (1ª sexta de setembro → 4/set, conferido
  contra `generate_series` independente), evento aparecendo na referência da cidade. A QA achou
  e corrigiu dois bugs reais no caminho, nenhum deles no código desta task:
  - `Checkbox` do HeroUI v3 (`@heroui/react`) é composto — `<Checkbox>texto</Checkbox>` sozinho
    renderiza só um `<div>` sem controle clicável algum. Corrigido aqui com
    `Checkbox.Content`/`Control`/`Indicator`; as outras quatro telas com o mesmo padrão quebrado
    (preferências de notificação, fila de aprovação em lote, convite de evento, interesses do
    perfil) foram sinalizadas à parte, não corrigidas nesta task.
  - `events_select_locality_member` (`20260805214709_community_scope.sql`) fazia
    `is_event_locality_member(id)` — uma função STABLE que re-consulta `events` pelo próprio id
    da linha sendo inserida. `insert ... returning` (o que `.insert().select()` do supabase-js
    gera) não enxerga a própria linha dentro da mesma transação sob esse snapshot, e a RLS nega
    com `42501` mesmo para um membro verificado e ativo. Corrigido em
    `20260820060533_fix_events_insert_returning_rls.sql`, trocando pela checagem direta em
    `locality_id` (sem auto-referência); regressão coberta em
    `supabase/tests/events-insert-returning.sql`.

- [x] **Step 7: gate e commit**

  `feat(events): recurring meetups as a first-class pattern`.

---

## Task 5: a resposta chega a quem perguntou

O banco fechou o ciclo em 2026-08-15 (`20260815220000_recommendation_reply_cycle.sql`:
`group_id` com FK real, escopo validado por membership, `update`/`delete` da própria resposta).
Faltam as três coisas que fazem a pessoa **saber** que foi respondida.

- [x] **Step 1: o autor é avisado** (`3928064`)

  Resposta nova enfileira no `outbox` para o autor do pedido, com destino que abre o pedido. É o
  elo que falta no ciclo semanal inteiro — sem ele o produto tem exatamente o defeito que existe
  para corrigir.

  `notification_type` não tem valor para isto. Adicione com o cuidado do enum da Task 2.

- [x] **Step 2: a UI expõe editar e excluir a própria resposta** (`3928064`)

  A migration concedeu `update`/`delete` ao autor (`:105`, `:112`) e
  `recommendation-requests.tsx` não mostra nenhum dos dois. Capability sem tela é a regra 3 da
  §12 sendo quebrada de novo, três dias depois.

- [x] **Step 3: o Explorar leva ao detalhe** (`3928064`)

  `recommendations/page.tsx:519-565` — card de grupo não abre `/groups/[id]`; `:588-615` —
  evento aponta para a lista genérica. Dois `href`. Faça os dois.

- [x] **Step 4: resolvido** (`3928064`)

  O autor marca o pedido como resolvido, e isso aparece. É o fechamento do ciclo da §6.3 e o que
  alimenta a curadoria do guia (Task 8 da onda E).

- [ ] **Step 5: testes**

  pgTAP em `supabase/tests/recommendation-reply-notify.sql`: resposta enfileira exatamente uma
  linha para o autor; **responder ao próprio pedido não gera aviso para si** (negativo); autor
  edita a própria resposta e **não** edita a de outro (positivo e negativo).

  E2E: responder um pedido faz a notificação aparecer para o autor.

- [x] **Step 6: gate e commit** (`3928064`)

---

## Task 6: salvar com destino, e quem salvou também é avisado

`recommendation-requests.tsx` tem Salvar/Salvo e a aba Salvas lê os salvos. Falta o motivo de
salvar existir: **quem salvou um pedido quer saber quando alguém responder.**

- [x] **Step 1: notificação para quem salvou** (`76c7fdc`)

  Mesmo caminho da Task 5, outra lista de destinatários. Uma linha por pessoa, respeitando
  preferência — o worker é quem checa (D1).

- [x] **Step 2: a aba Salvas leva a algum lugar** (`76c7fdc`)

  Cada item abre o pedido, na resposta certa quando houver.

- [ ] **Step 3: testes**

  pgTAP: pessoa que salvou recebe; pessoa que **des-salvou** não recebe (negativo); o autor não
  recebe duas linhas por ter salvo o próprio pedido.

- [x] **Step 4: gate e commit** (`76c7fdc`)

---

## Task 7: Saúde começa em grupo

O formulário já escolhe entre Manaus e um grupo do autor, e envia `locality_id`/`group_id`
conforme (`recommendations/page.tsx`, `recommendation-requests.tsx`). Falta a regra: pedido de
Saúde **não** pode nascer em Manaus.

- [x] **Step 1: a regra no banco, não só na tela** (`9419dc4`)

  `check` ou policy que rejeita categoria de saúde com `group_id` nulo. Validação só no cliente
  não é validação — a inserção é feita pelo próprio navegador, sob RLS.

- [x] **Step 2: a tela explica antes de bloquear** (`9419dc4`)

  Escolher Saúde restringe o seletor de escopo aos grupos do autor, com uma linha dizendo por
  quê. Erro depois do submit é a pior forma de ensinar uma regra.

- [ ] **Step 3: teste**

  pgTAP em `supabase/tests/recommendations-health-scope.sql`: pedido de saúde com grupo passa;
  **sem grupo é rejeitado com o código esperado** (negativo). Cuidado: `recommendations-scope-denials.sql`
  já asserta códigos de erro específicos e `20260816001059` existe justamente para devolver o
  `23514` que o teste 10 exige. Não quebre esse contrato.

- [x] **Step 4: gate e commit** (`9419dc4`)

---

## Task 8: o ciclo do administrador de grupo

`groups/page.tsx:441-496` faz entrar, sair, aprovar e transferir posse. Faltam cancelar o
próprio pedido, rejeitar pedido alheio, remover membro e excluir o grupo. Todo administrador
que precisar de uma dessas quatro descobre que a única saída é abandonar o grupo que ele criou.

- [x] **Step 1: as quatro ações** (`67a393d`)

  Pelo cliente autenticado, com a RLS decidindo — Task 1 é pré-requisito e não deve ser
  contornada aqui.

- [x] **Step 2: excluir é `is_deleted`, não `delete`** (`67a393d`; botão corrigido em `6f2ccbc` — o trigger `block_soft_delete_groups` rejeitava o toggle vindo do cliente `authenticated`, corrigido com a RPC `delete_group`)

  O schema já usa exclusão lógica em `groups` e `posts`. Manter o padrão preserva o rastro de
  moderação, que a onda H vai precisar.

- [x] **Step 3: testes**

  pgTAP em `supabase/tests/group-admin-cycle.sql`: dono remove membro; **membro não remove
  membro** (negativo); autor cancela o próprio pedido; **não cancela o de outro** (negativo);
  grupo excluído some do feed e do Explorar.

- [x] **Step 4: gate e commit** (`67a393d`, `6f2ccbc`)

---

## Task 9: "Foto" faz upload de foto

`feed-composer.tsx:58-86` e `feed-post.tsx:660-666` abrem um campo de **texto** pedindo o
caminho da imagem ("Caminho da foto (event-photos/...)"). Nenhuma pessoa real digita um caminho
de storage. A affordance está lá e o fluxo não fecha — regra 4 da §12.

- [x] **Step 1: upload de verdade** (`2ecbf63`)

  Bucket privado com política de leitura por escopo. O modelo é
  `20260815132000_verification_documents.sql:7-26` e `supabase/tests/storage-policies.sql` — os
  dois estão prontos e testados; siga-os em vez de inventar.

- [x] **Step 2: limites nas bordas** (`2ecbf63`; RLS de storage por localidade em `8d3cb4f`)

  Tipo e tamanho conferidos **no servidor**, não só no `accept` do input. `image/jpeg`,
  `image/png`, `image/webp`; teto explícito.

- [x] **Step 3: sem EXIF** (`2ecbf63`)

  Foto de celular carrega coordenada de GPS. Este produto se recusa a persistir endereço
  residencial (D11) e não pode aceitá-lo por dentro de um JPEG. Remova a metadata no servidor,
  antes de gravar.

  **Este step é a task.** Sem ele, o upload é uma superfície nova de vazamento de localização de
  militar — exatamente o dado que a §4.3 protege.

- [x] **Step 4: testes**

  - Unitário: arquivo com EXIF de GPS sai sem EXIF; tipo não permitido é rejeitado no servidor
    mesmo com o cliente adulterado (negativo).
  - pgTAP: objeto do bucket não é legível por quem não alcança o post (negativo).

- [x] **Step 5: gate e commit** (`2ecbf63`)

---

## Task 10: E2E, auditoria visual e reconciliação

- [x] **Step 1: rodar o lote de E2E**

  `db:reset` com seed rodado nesta sessão (o pedido único ao dono que o plano previa). Primeira
  execução real do lote completo contra seed de verdade: 492 casos, 3 viewports, `--workers=1`
  → **394 passaram, 94 falharam, 4 pulados**. Duas classes de bug de infraestrutura que
  bloqueavam a suíte inteira foram corrigidas no caminho (nenhuma do código de F): o `next build`
  de produção falhava por completo (path de `docs/legal/`, e um helper síncrono num arquivo
  `"use server"`), e o cookie de sessão injetado pelos specs estava num formato que o
  `@supabase/ssr` instalado não lê (JSON puro em vez de `base64-<base64url>`), deixando
  `session.user.id` `undefined` em qualquer escrita client-side. As 94 falhas restantes são
  pré-existentes: ~18 specs (a maioria de ondas anteriores, não desta) navegam para UUIDs fixos
  que nunca corresponderam ao `seed.sql` real — escritos contra a convenção das fixtures pgTAP,
  um esquema de UUID diferente e não relacionado. Detalhe em `PRODUCT_STATUS.md` "O que não foi
  verificado"; realinhamento sinalizado à parte, fora do escopo de fechar esta onda.

- [x] **Step 2: auditoria visual**

  `node scripts/visual/loop.mjs` sobre `/recommendations`, `/events`, `/events/[id]`, `/groups`,
  `/groups/[id]`. Achou e corrigiu um bug real desta onda: o card de grupo em "Grupos para
  descobrir" (F5 Step 3) linkava só o texto truncado do título, sem `min-h-11` — 18 achados
  `high` (6 grupos × 3 viewports). O modal de publicação e o formulário de recorrência (F4) não
  entram na captura estática por rota (o script visita URLs, não interage com formulários) —
  F4 foi verificado manualmente no navegador nesta sessão, registrado na linha "Encontro
  recorrente" do `PRODUCT_STATUS.md`.

- [x] **Step 3: veredito**

  `docs/agents/VISUAL_AUDIT-2026-08-20-onda-f.md` — **high = 0** depois da correção.

- [x] **Step 4: reconciliar o `PRODUCT_STATUS.md`**

  A linha **"Server Actions de grupo e evento"** já tinha o resultado da medição da Task 1
  (sessão de 2026-08-19, commit `411904f`). Esta sessão reconciliou o restante da tabela que
  ainda descrevia estado pré-onda F: RSVP (Task 2), Convite de evento já estava (Task 3),
  Encontro recorrente (Task 4, "não existe" → fechado), Explorar/Pedir indicação/Controle do
  autor/Escopo do pedido/Salvas (Tasks 5-7), e a fila de aprovação ganhou a menção do sinal de
  chegada da onda T (Task 5 de T, não de F, mas a mesma tela).

- [x] **Step 5: commit**

  `docs(status): reconcile the weekly loop after wave F` (commits `0a4f5c9`, `c3c116a`, e este).

---

## Definição de pronto

- Gate verde após cada task.
- Nenhuma Server Action lê o usuário de um cliente `service_role`.
- Nenhum status de membership vem do corpo de um formulário.
- Quem pergunta é avisado quando respondem — provado por teste, não por leitura de código.
- O encontro recorrente existe, avança sozinho, e o RSVP é da ocorrência.
- Toda foto que entra sai sem EXIF.
- Todo caminho de permissão desta onda tem teste positivo **e** negativo.

## O que esta onda não faz

Não constrói a vitrine, a conta de prestador nem a conversa membro↔prestador (G). Não faz
suspensão de conta, denúncia unificada nem PostHog (H). Não abre DM entre membros — segue
adiada pela §8. Não liga a IA do guia: o ADR está `proposed` e a governança LGPD é
pré-requisito.
