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

- [ ] **Step 1: medir antes de mexer**

  Escreva um caso que exercite `joinGroupAction` com sessão válida e **observe**. Registre o
  resultado no próprio commit. Não pule — a correção é diferente nos dois desfechos, e o
  `PRODUCT_STATUS.md` §4 pede explicitamente esta medição.

- [ ] **Step 2: ler o usuário do cliente autenticado**

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

- [ ] **Step 3: `desiredStatus` sai do formulário**

  O status é derivado no servidor, da visibilidade do grupo: público → `approved`; privado →
  `pending`. Nunca do corpo da requisição.

- [ ] **Step 4: testes**

  - pgTAP em `supabase/tests/group-join-status.sql`: entrar em grupo público dá `approved`;
    entrar em grupo privado dá `pending`; **tentar gravar `approved` direto em grupo privado é
    negado pela RLS** (negativo obrigatório — é o teste que prova o Step 3).
  - pgTAP: `transfer_group_ownership` chamada por não-dono é negada.
  - pgTAP: dono do RSVP apaga o próprio; **não apaga o de outro** (negativo).
  - E2E `tests/e2e/group-join.spec.ts`: entrar em grupo público funciona de ponta a ponta. É a
    prova de que o caminho feliz voltou a existir.

- [ ] **Step 5: gate e commit**

  `fix(authz): stop authenticating on the service-role client in six server actions`.

---

## Task 2: RSVP completo, e o organizador sabe quem desistiu

`20260802001200_events_rsvp.sql:8` define
`event_rsvp_status as enum ('interested', 'going')`. Falta "não vou", e a mudança de RSVP não
avisa ninguém — o organizador de um churrasco descobre a desistência ao contar as cadeiras.

- [ ] **Step 1: o valor novo**

  `alter type public.event_rsvp_status add value 'not_going';`

  **Armadilha do Postgres, e ela já custou tempo em outros projetos:** um valor de enum
  adicionado numa transação **não pode ser usado na mesma transação**. Se esta migration
  adicionar o valor e, no mesmo arquivo, escrever uma policy, um `check` ou um `default` que o
  referencie, ela falha. Duas migrations timestamped, na ordem. O precedente no repositório é
  `20260809184316_notify_report_resolved.sql:18`, que adiciona e não usa.

- [ ] **Step 2: a UI**

  Três estados, mutuamente exclusivos, com o atual visível antes do clique. "Cancelar RSVP"
  (`events/[id]/page.tsx:47-62`) continua existindo e significa outra coisa: apagar a resposta,
  não responder "não vou".

- [ ] **Step 3: o organizador é avisado**

  Trigger enfileira no `outbox` — e **respeita `notification_preferences`**, que é onde a regra
  mora (Task 3 da D1, Step 2). Não replique a checagem de preferência no trigger.

  `notification_type` já tem `event_rsvp` (`20260802001400:15`). Não crie tipo novo se o
  existente serve; se criar, `alter type ... add value` com o mesmo cuidado do Step 1.

  Um aviso por mudança, não por clique: quem alterna três vezes gera um aviso, não três. Sem
  isso o produto ensina o organizador a silenciar a notificação, que é exatamente a dor da §1.1.

- [ ] **Step 4: testes**

  pgTAP em `supabase/tests/event-rsvp-not-going.sql`: os três estados gravam; mudar para
  `not_going` enfileira uma linha para o organizador; **preferência desligada não enfileira**
  (negativo); alternar duas vezes em um minuto não gera dois avisos.

- [ ] **Step 5: gate e commit**

  `feat(events): complete RSVP with "not going" and notify the organiser`.

---

## Task 3: convite de evento — falta só o envio

Migration, RLS e UI de aceitar/recusar existem (`20260806171204_event_invites.sql`,
`events/event-invites-section.tsx:26-120`). **Não existe caminho para o organizador convidar
ninguém.** O comentário em `events/page.tsx:334` diz que o mecanismo não existe e está
desatualizado — metade dele existe.

- [ ] **Step 1: a tela do organizador**

  Na página do evento, para o organizador: escolher entre quem ele pode convidar e enviar.

  **Quem ele pode convidar é a pergunta de fronteira**, e a resposta é a D43: **não existe busca
  de pessoas no piloto.** O convite não abre um diretório. As origens legítimas são membros da
  comunidade do evento e membros dos grupos do organizador. Se a tela precisar de um campo de
  busca livre de pessoas, o desenho está errado — **pare e reporte**.

- [ ] **Step 2: fan-out**

  Convidar N pessoas cria N linhas em `event_invites` e N linhas no `outbox`. A policy
  `event_invites_insert_organizer` (`:59`) já confere quem insere — passe pelo cliente
  autenticado e deixe ela trabalhar.

  Teto por evento e por janela, pela cota do Upstash da D1. Convite de evento é o vetor de spam
  mais barato que este produto vai ter.

- [ ] **Step 3: o comentário obsoleto sai**

  `events/page.tsx:334`. Comentário que mente é pior que comentário ausente: foi ele que fez
  esta capability ficar parada.

- [ ] **Step 4: testes**

  pgTAP em `supabase/tests/event-invite-fanout.sql`: organizador convida e as linhas nascem;
  **não-organizador convidando é negado** (negativo); convidar alguém que não alcança o evento é
  negado; convite duplicado não cria segunda linha.

- [ ] **Step 5: gate e commit**

  `feat(events): organiser-driven event invitations with fan-out`.

---

## Task 4: encontro recorrente

Não existe nada. É a tese central do produto (§6.3, ciclo mensal) e o que diferencia de uma
rede nacional.

- [ ] **Step 1: o modelo mais simples que resolve**

  Recorrência é **coluna no evento**, não tabela nova de série com instâncias materializadas.
  Comece com o mínimo que cobre "toda primeira sexta" e "todo dia 15": um padrão declarado e a
  próxima ocorrência calculada.

  Materializar N ocorrências futuras cria N linhas para moderar, N conjuntos de RSVP e um
  problema de edição em cascata. Se depois ficar apertado, materializar é migração para frente;
  o contrário não é.

- [ ] **Step 2: a próxima ocorrência**

  Job de `pg_cron` que avança a data quando a ocorrência passa. O agendador existe desde a D1
  (`20260814074813_enable_pg_cron.sql`) — reuse, não crie um segundo mecanismo.

- [ ] **Step 3: o RSVP é da ocorrência**

  Marcar presença em "o churrasco de setembro" não marca presença em outubro. Se o modelo do
  Step 1 não distinguir as duas, ele está errado — **pare e reporte antes de escrever a
  migration**, porque isto decide o desenho inteiro.

- [ ] **Step 4: o feriado é avisado, não corrigido**

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

- [ ] **Step 5: lembrete**

  Enfileirar no `outbox` antes da ocorrência, respeitando preferência. Encontro que ninguém
  lembra não é ciclo mensal — é uma linha na tabela.

- [ ] **Step 6: testes**

  pgTAP em `supabase/tests/recurring-events.sql`: padrão mensal produz a data certa na virada do
  mês; **dia 31 em mês de 30 não produz data inválida** (é o caso que quebra implementação
  ingênua); evento concluído não avança; o lembrete respeita opt-out (negativo).

  Unitário sobre o aviso de feriado: recorrência que cai em 2026-02-16 é sinalizada como
  Carnaval; recorrência em dia útil não é sinalizada (positivo e negativo); **a data não é
  alterada em nenhum dos dois casos**.

- [ ] **Step 7: gate e commit**

  `feat(events): recurring meetups as a first-class pattern`.

---

## Task 5: a resposta chega a quem perguntou

O banco fechou o ciclo em 2026-08-15 (`20260815220000_recommendation_reply_cycle.sql`:
`group_id` com FK real, escopo validado por membership, `update`/`delete` da própria resposta).
Faltam as três coisas que fazem a pessoa **saber** que foi respondida.

- [ ] **Step 1: o autor é avisado**

  Resposta nova enfileira no `outbox` para o autor do pedido, com destino que abre o pedido. É o
  elo que falta no ciclo semanal inteiro — sem ele o produto tem exatamente o defeito que existe
  para corrigir.

  `notification_type` não tem valor para isto. Adicione com o cuidado do enum da Task 2.

- [ ] **Step 2: a UI expõe editar e excluir a própria resposta**

  A migration concedeu `update`/`delete` ao autor (`:105`, `:112`) e
  `recommendation-requests.tsx` não mostra nenhum dos dois. Capability sem tela é a regra 3 da
  §12 sendo quebrada de novo, três dias depois.

- [ ] **Step 3: o Explorar leva ao detalhe**

  `recommendations/page.tsx:519-565` — card de grupo não abre `/groups/[id]`; `:588-615` —
  evento aponta para a lista genérica. Dois `href`. Faça os dois.

- [ ] **Step 4: resolvido**

  O autor marca o pedido como resolvido, e isso aparece. É o fechamento do ciclo da §6.3 e o que
  alimenta a curadoria do guia (Task 8 da onda E).

- [ ] **Step 5: testes**

  pgTAP em `supabase/tests/recommendation-reply-notify.sql`: resposta enfileira exatamente uma
  linha para o autor; **responder ao próprio pedido não gera aviso para si** (negativo); autor
  edita a própria resposta e **não** edita a de outro (positivo e negativo).

  E2E: responder um pedido faz a notificação aparecer para o autor.

- [ ] **Step 6: gate e commit**

  `feat(recommendations): close the ask-and-answer loop with notification`.

---

## Task 6: salvar com destino, e quem salvou também é avisado

`recommendation-requests.tsx` tem Salvar/Salvo e a aba Salvas lê os salvos. Falta o motivo de
salvar existir: **quem salvou um pedido quer saber quando alguém responder.**

- [ ] **Step 1: notificação para quem salvou**

  Mesmo caminho da Task 5, outra lista de destinatários. Uma linha por pessoa, respeitando
  preferência — o worker é quem checa (D1).

- [ ] **Step 2: a aba Salvas leva a algum lugar**

  Cada item abre o pedido, na resposta certa quando houver.

- [ ] **Step 3: testes**

  pgTAP: pessoa que salvou recebe; pessoa que **des-salvou** não recebe (negativo); o autor não
  recebe duas linhas por ter salvo o próprio pedido.

- [ ] **Step 4: gate e commit**

  `feat(recommendations): saved requests notify their followers`.

---

## Task 7: Saúde começa em grupo

O formulário já escolhe entre Manaus e um grupo do autor, e envia `locality_id`/`group_id`
conforme (`recommendations/page.tsx`, `recommendation-requests.tsx`). Falta a regra: pedido de
Saúde **não** pode nascer em Manaus.

- [ ] **Step 1: a regra no banco, não só na tela**

  `check` ou policy que rejeita categoria de saúde com `group_id` nulo. Validação só no cliente
  não é validação — a inserção é feita pelo próprio navegador, sob RLS.

- [ ] **Step 2: a tela explica antes de bloquear**

  Escolher Saúde restringe o seletor de escopo aos grupos do autor, com uma linha dizendo por
  quê. Erro depois do submit é a pior forma de ensinar uma regra.

- [ ] **Step 3: teste**

  pgTAP em `supabase/tests/recommendations-health-scope.sql`: pedido de saúde com grupo passa;
  **sem grupo é rejeitado com o código esperado** (negativo). Cuidado: `recommendations-scope-denials.sql`
  já asserta códigos de erro específicos e `20260816001059` existe justamente para devolver o
  `23514` que o teste 10 exige. Não quebre esse contrato.

- [ ] **Step 4: gate e commit**

  `feat(recommendations): health requests must start inside a group`.

---

## Task 8: o ciclo do administrador de grupo

`groups/page.tsx:441-496` faz entrar, sair, aprovar e transferir posse. Faltam cancelar o
próprio pedido, rejeitar pedido alheio, remover membro e excluir o grupo. Todo administrador
que precisar de uma dessas quatro descobre que a única saída é abandonar o grupo que ele criou.

- [ ] **Step 1: as quatro ações**

  Pelo cliente autenticado, com a RLS decidindo — Task 1 é pré-requisito e não deve ser
  contornada aqui.

- [ ] **Step 2: excluir é `is_deleted`, não `delete`**

  O schema já usa exclusão lógica em `groups` e `posts`. Manter o padrão preserva o rastro de
  moderação, que a onda H vai precisar.

- [ ] **Step 3: testes**

  pgTAP em `supabase/tests/group-admin-cycle.sql`: dono remove membro; **membro não remove
  membro** (negativo); autor cancela o próprio pedido; **não cancela o de outro** (negativo);
  grupo excluído some do feed e do Explorar.

- [ ] **Step 4: gate e commit**

  `feat(groups): complete the group administrator cycle`.

---

## Task 9: "Foto" faz upload de foto

`feed-composer.tsx:58-86` e `feed-post.tsx:660-666` abrem um campo de **texto** pedindo o
caminho da imagem ("Caminho da foto (event-photos/...)"). Nenhuma pessoa real digita um caminho
de storage. A affordance está lá e o fluxo não fecha — regra 4 da §12.

- [ ] **Step 1: upload de verdade**

  Bucket privado com política de leitura por escopo. O modelo é
  `20260815132000_verification_documents.sql:7-26` e `supabase/tests/storage-policies.sql` — os
  dois estão prontos e testados; siga-os em vez de inventar.

- [ ] **Step 2: limites nas bordas**

  Tipo e tamanho conferidos **no servidor**, não só no `accept` do input. `image/jpeg`,
  `image/png`, `image/webp`; teto explícito.

- [ ] **Step 3: sem EXIF**

  Foto de celular carrega coordenada de GPS. Este produto se recusa a persistir endereço
  residencial (D11) e não pode aceitá-lo por dentro de um JPEG. Remova a metadata no servidor,
  antes de gravar.

  **Este step é a task.** Sem ele, o upload é uma superfície nova de vazamento de localização de
  militar — exatamente o dado que a §4.3 protege.

- [ ] **Step 4: testes**

  - Unitário: arquivo com EXIF de GPS sai sem EXIF; tipo não permitido é rejeitado no servidor
    mesmo com o cliente adulterado (negativo).
  - pgTAP: objeto do bucket não é legível por quem não alcança o post (negativo).

- [ ] **Step 5: gate e commit**

  `feat(composer): real photo upload with EXIF stripping`.

---

## Task 10: E2E, auditoria visual e reconciliação

- [ ] **Step 1: rodar o lote de E2E**

  Um `db:reset` com seed, pedido ao dono, uma vez, no fim. Inclui o que D2 e E tiverem deixado.

- [ ] **Step 2: auditoria visual**

  `node scripts/visual/loop.mjs` sobre `/recommendations`, `/events`, `/events/[id]`, `/groups`,
  `/groups/[id]` e o modal de publicação.

- [ ] **Step 3: veredito**

  `docs/agents/VISUAL_AUDIT-2026-08-XX-onda-f.md`.

- [ ] **Step 4: reconciliar o `PRODUCT_STATUS.md`**

  A linha **"Server Actions de grupo e evento"** ganha o resultado da medição da Task 1 — o que
  de fato acontecia, não o que se supunha. É a única linha da tabela cuja coluna de evidência
  hoje diz `[A] comportamento`, e ela existe para ser resolvida por esta onda.

- [ ] **Step 5: commit**

  `docs(status): reconcile the weekly loop after wave F`.

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
