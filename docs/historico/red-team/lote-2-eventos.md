# Lote 2 — Red Team de produto: Eventos (RT-24 a RT-30)

Auditoria feita em 2026-08-10 contra a Camada 0 (C6 e C9), o Lote 1 e o código
atual. Foram avaliadas as dez dimensões da rubrica; abaixo aparecem somente as
dimensões em que houve falha. F10 não é repetido: este lote não reabre a ausência
da UI de envio nem a ausência do fan-out de notificação de convite.

## Cobertura

| Cenário | Fluxo | Dimensões com falha | Findings |
|---|---|---|---|
| RT-24 | Explorar eventos | Modelo mental, coerência, happy path | F75–F76 |
| RT-25 | Criar evento | Coerência, sad paths, permissões, abuso | F77–F79 |
| RT-26 | RSVP e participantes | Happy path, sad paths, privacidade, operação | F80–F83 |
| RT-27 | Atualizar evento | Coerência, valor | F84 |
| RT-28 | Cancelar evento | Sad paths, operação | F85–F86 |
| RT-29 | Pós-evento | Coerência, valor | F88 |
| RT-30 | Convites e comentários | Coerência, happy path, permissões, abuso, valor | F86–F87, F89 |

---

## RT-24 — Explorar eventos

### F75 · Passado, presente e estados terminais são misturados como se fossem a mesma lista

- **Promessa:** 6a está marcada como “criar/listar” corrigida; a página “Eventos”
  deve permitir entender o que há para participar agora e onde reencontrar o
  histórico.
- **Comportamento:** a consulta traz todos os eventos, em ordem crescente de
  `starts_at`, sem filtro temporal ou de status. A tela não oferece “Próximos” e
  “Passados”; as únicas abas são “Organizando”, “Confirmado”, “Interessado” e
  “Convidado”, e todas reutilizam o conjunto sem recorte temporal. O card só
  identifica `cancelled`; um `completed` ou um evento cuja data já passou parece
  um evento aberto comum. O primeiro item da lista tende a ser o mais antigo.
- **Evidência:** `docs/journeys/MAP.md:251`; `apps/web/app/(shell)/events/page.tsx:210-213`;
  `apps/web/app/(shell)/events/page.tsx:317-337`;
  `apps/web/app/(shell)/events/page.tsx:413-423`;
  `apps/web/app/(shell)/events/page.tsx:93-112`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — separar agenda de histórico, ocultar estados terminais ou adotar
  outra arquitetura temporal é decisão do dono; a lista indiferenciada não
  sustenta o estado “Corrigida”.

### F76 · A listagem não oferece caminho para o detalhe do evento

- **Promessa:** o usuário explora um card e chega ao detalhe descrito em 6c.
- **Comportamento:** `EventCard` renderiza uma `div`, sem `Link`, `href`,
  `router.push` ou handler de abertura. Suas únicas ações visíveis são RSVP ou
  cancelamento. A rota `/events/[id]` existe, mas a navegação para ela aparece
  somente ao clicar numa notificação de RSVP/mudança; explorar `/events` não
  leva ao detalhe, à lista de confirmados nem ao suposto espaço de comentários.
- **Evidência:** `apps/web/app/(shell)/events/page.tsx:95-176`;
  `apps/web/app/(shell)/events/page.tsx:384-405`;
  `apps/web/app/(shell)/notifications/page.tsx:121-138`;
  `apps/web/app/(shell)/events/[id]/page.tsx:138-238`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o destino já existe; deixar o card/título sem navegação é
  affordance fraud por omissão do happy path.

---

## RT-25 — Criar evento

### F77 · É possível criar evento no passado

- **Promessa:** o formulário cria um encontro futuro que membros poderão
  descobrir e confirmar.
- **Comportamento:** o campo de data é obrigatório, mas não tem `min` nem
  validação contra o relógio atual. A action client-side envia o valor diretamente
  e a tabela exige apenas `starts_at not null`; não há `CHECK` temporal. Título
  vazio, por outro lado, está corretamente bloqueado por `required`, `minLength=2`
  e pelo `CHECK` de 2 a 200 caracteres no banco.
- **Evidência:** `apps/web/app/(shell)/events/page.tsx:250-257`;
  `apps/web/app/(shell)/events/page.tsx:557-579`;
  `supabase/migrations/20260802001200_events_rsvp.sql:15-18`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o estado inválido é inequívoco para o fluxo de criação de um
  evento futuro.

### F78 · A capacidade de evento de grupo/comunidade não existe na superfície

- **Promessa:** C6 define evento com escopo único de localidade, grupo ou
  comunidade; eventos internos também fazem parte do modelo de comunidades.
- **Comportamento:** a copy promete apenas “evento para sua localidade” e o
  `insert` fixa `PILOT_LOCALITY_ID`, sem seletor nem envio de `group_id` ou
  `community_id`. `ends_at`, embora exista no contrato, também não é coletado.
  A copy sobre quem cria está coerente: somente membros verificados, regra que
  a policy também impõe.
- **Evidência:** `docs/red-team/camada-0-contratos.md:111-115`;
  `apps/web/app/(shell)/events/page.tsx:250-257`;
  `apps/web/app/(shell)/events/page.tsx:544-594`;
  `supabase/migrations/20260805214709_community_scope.sql:37-47`;
  `supabase/migrations/20260802001200_events_rsvp.sql:122-132`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — expor os escopos e horário final, ou deliberadamente reduzir o
  contrato do produto à localidade, exige decisão do dono.

### F79 · A escrita de evento escopado não exige pertencimento ao grupo/comunidade

- **Promessa:** um evento de grupo ou comunidade pertence àquele contêiner e
  respeita a mesma fronteira de acesso de C6.
- **Comportamento:** a policy de `INSERT` verifica somente que o ator é o
  organizador e membro verificado da localidade. Ela não chama
  `can_access_event` nem exige membership no `group_id`/`community_id`. A policy
  de `UPDATE` também confere apenas ownership. Assim, pela Data API, um membro
  verificado pode criar ou mover evento para comunidade da qual não participa;
  `community_same_locality` e XOR garantem consistência estrutural, não
  autorização de pertencimento. **Inferência:** o abuso depende de conhecer um
  UUID de contêiner, mas a falta da condição está explícita na policy.
- **Evidência:** `supabase/migrations/20260802001200_events_rsvp.sql:125-141`;
  `supabase/migrations/20260805214709_community_scope.sql:37-47`;
  `supabase/migrations/20260805214709_community_scope.sql:354-384`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — policy de escrita e policy de leitura precisam impor a mesma
  fronteira de escopo; não há trade-off de produto que justifique injetar
  conteúdo no contêiner alheio.

---

## RT-26 — RSVP e participantes

### F80 · O detalhe ignora C6 e lê evento/perfis com `service_role`

- **Promessa:** `can_access_event` protege eventos de grupo/comunidade; perfis
  ocultos não devem ser expostos por uma leitura acidental.
- **Comportamento:** a página autentica o visitante com cookies, mas depois cria
  o cliente de `service_role` e busca o evento apenas por `id`, sem reaplicar
  `can_access_event`. O mesmo cliente lê todos os RSVPs e faz join direto em
  `profiles`, contornando RLS de evento e de visibilidade de perfil. Qualquer
  autenticado que obtenha/acerte o UUID pode ler título, descrição, horário,
  local e até 20 nomes confirmados de evento ao qual não tem acesso.
- **Evidência:** `apps/web/app/(shell)/events/[id]/page.tsx:87-109`;
  `apps/web/app/(shell)/events/[id]/page.tsx:116-132`;
  `apps/web/lib/supabase/server.ts:4-17`;
  `supabase/migrations/20260805214709_community_scope.sql:354-384`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** A — é bypass direto de autorização e privacidade, não decisão de
  produto.

### F81 · Os três comandos do detalhe procuram a sessão no cliente errado

- **Promessa:** “Vou”, “Talvez”, “Não vou”/“Cancelar” e “Encerrar evento”
  executam as ações às quais estão ligados.
- **Comportamento:** cada server action cria o helper de `service_role` e chama
  `supabase.auth.getUser()` nele. Esse helper foi criado sem sessão persistida e
  não recebe os cookies usados pela página; a sessão real foi lida em outro
  cliente local ao render. Quando `user` não existe, as três actions lançam
  `unauthenticated` antes da mutação. **Inferência técnica:** decorre da
  separação explícita entre o auth client cookie-bound da página e o helper
  stateless de `service_role`; não houve execução em ambiente para este lote
  read-only.
- **Evidência:** `apps/web/app/(shell)/events/[id]/page.tsx:15-34`;
  `apps/web/app/(shell)/events/[id]/page.tsx:36-69`;
  `apps/web/app/(shell)/events/[id]/page.tsx:87-101`;
  `apps/web/lib/supabase/server.ts:4-17`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — botões ligados a actions incapazes de identificar a sessão são
  affordances falsas.

### F82 · O ciclo de RSVP muda de estado, mas não fecha nem informa a mudança

- **Promessa:** o membro controla “vou/talvez/não vou” e o organizador acompanha
  a intenção atual.
- **Comportamento:** na listagem, os únicos comandos são upserts para
  `interested` e `going`; tocar no estado já selecionado não o desfaz. A exclusão
  só aparece no detalhe, que não é alcançável pela lista (F76) e cujas actions
  estão comprometidas por F81. Além disso, a notificação do organizador dispara
  somente em `AFTER INSERT`: troca por upsert (`UPDATE`) e desistência (`DELETE`)
  não geram evento correspondente. O enum realmente só persiste `interested` e
  `going`; “não vou” significa apagar a linha, não um terceiro estado.
- **Evidência:** `apps/web/app/(shell)/events/page.tsx:147-165`;
  `apps/web/app/(shell)/events/page.tsx:274-294`;
  `apps/web/app/(shell)/events/[id]/page.tsx:161-194`;
  `supabase/migrations/20260802001200_events_rsvp.sql:8,30-36`;
  `supabase/migrations/20260802001400_personal_notifications.sql:167-197`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o membro precisa conseguir desfazer pelo mesmo caminho e o
  feedback do ciclo não pode representar só a primeira intenção como atual.

### F83 · A gestão de presença mostra no máximo 20 como se fosse o total e não tem capacidade

- **Promessa:** “Quem vai (N)” dá ao organizador uma leitura confiável de
  comparecimento; a pergunta operacional sobre lotação deve ter resposta
  explícita.
- **Comportamento:** a consulta aplica `.limit(20)` e o cabeçalho imprime
  `attendees.length`, portanto “Quem vai (20)” também significa 21, 80 ou 500.
  Não há paginação nem total separado. Também não há campo de capacidade na
  tabela, no formulário ou no RSVP, então confirmações são ilimitadas. A lista
  não é exclusiva do organizador: qualquer visitante do detalhe a recebe, o que
  amplifica F80.
- **Evidência:** `apps/web/app/(shell)/events/[id]/page.tsx:125-132`;
  `apps/web/app/(shell)/events/[id]/page.tsx:216-230`;
  `apps/web/app/(shell)/events/page.tsx:544-594`;
  `supabase/database.generated.ts:299-344`.
- **Severidade:** P2.
- **Veredicto:** SPLIT.
- **Balde:** B — corrigir o total falso é inequívoco, mas decidir se o produto
  precisa só de paginação/contagem ou também de lotação, fila e fechamento de
  vagas pertence ao dono.

---

## RT-27 — Atualizar evento

### F84 · O banco notifica alterações que o organizador não consegue fazer

- **Promessa:** o trigger `event_change` avisa participantes quando título,
  data, local, descrição ou status mudam.
- **Comportamento:** não existe rota `events/[id]/edit` nem formulário de edição.
  Na aplicação, o único `.update()` em `events` é cancelamento por status; a
  outra mutação é a RPC de conclusão, também de status. Portanto o trigger
  **pode** disparar por cancelar (e pretende disparar por concluir), mas nunca é
  alcançado pela UI para corrigir título, remarcar horário, trocar local ou
  atualizar descrição. Isso corrige a premissa “nunca dispara”: o problema real
  é capacidade de notificar mudança substantiva sem mecanismo de mudar.
- **Evidência:** `apps/web/app/(shell)/events/page.tsx:296-309`;
  `apps/web/app/(shell)/events/[id]/page.tsx:53-69`;
  `supabase/migrations/20260802001400_personal_notifications.sql:199-232`;
  ausência de rota confirmada pelo conjunto `apps/web/app/(shell)/events/`
  (`page.tsx`, `[id]/page.tsx`, invites e fallbacks apenas).
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — expor edição completa, limitar quais campos são mutáveis ou
  retirar essa promessa do ciclo exige decisão do dono.

---

## RT-28 — Cancelar evento

### F85 · “Cancelar evento” é imediato e não tem confirmação nem recuperação

- **Promessa:** somente o organizador cancela e entende o impacto antes de uma
  mudança que notifica participantes e encerra ações.
- **Comportamento:** o botão chama diretamente `handleCancelEvent`, que atualiza
  o status para `cancelled`; não há confirmação, motivo, undo nem caminho de
  restauração. O controle aparece em cada duplicata do card do organizador. A
  policy restringe o update ao owner e o trigger notifica quem tem RSVP, mas a
  proteção contra acionamento acidental é inexistente.
- **Evidência:** `apps/web/app/(shell)/events/page.tsx:168-173`;
  `apps/web/app/(shell)/events/page.tsx:296-309`;
  `apps/web/app/(shell)/events/page.tsx:448-457`;
  `supabase/migrations/20260802001200_events_rsvp.sql:134-141`;
  `supabase/migrations/20260802001400_personal_notifications.sql:217-232`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — confirmação explícita para uma transição irreversível na UI é
  correção inequívoca.

### F86 · Convite cancelado continua acionável e “Aceitar” não confirma presença

- **Promessa:** aceitar um convite vigente produz o estado mostrado como
  “Confirmado”; evento cancelado não deve continuar aceitando resposta como se
  estivesse aberto.
- **Comportamento:** a consulta de convites não seleciona nem filtra o status do
  evento. Um convite `pending` de evento `cancelled` continua com “Aceitar” e
  “Recusar”. A response action atualiza somente `event_invites`; não cria nem
  atualiza `event_rsvps`. Mesmo assim, a UI troca `accepted` por “Confirmado”.
  RSVPs e convites são preservados no cancelamento porque ele é `UPDATE`; os
  `on delete cascade` só atuariam numa exclusão real.
- **Evidência:** `apps/web/app/(shell)/events/event-invites-actions.ts:37-75`;
  `apps/web/app/(shell)/events/event-invites-actions.ts:78-94`;
  `apps/web/app/(shell)/events/event-invites-section.tsx:85-115`;
  `supabase/migrations/20260806171204_event_invites.sql:19-28`;
  `supabase/migrations/20260802001200_events_rsvp.sql:30-37`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — status terminal do evento deve bloquear resposta e “Confirmado”
  não pode ser exibido sem RSVP correspondente.

---

## RT-30 — Convites

### F87 · A policy de convite não impõe a relação social prometida pela migration

- **Promessa:** a própria migration define que o organizador pode convidar quem
  compartilha grupo, comunidade ou vínculo familiar.
- **Comportamento:** `event_invites_insert_organizer` verifica apenas
  `invited_by = auth.uid()` e ownership do evento. Não há condição sobre o
  convidado, grupo, comunidade, família, localidade ou acesso ao evento. Embora
  a UI de envio ausente já seja F10 e não seja repetida aqui, a Data API concede
  `INSERT` a `authenticated`: um organizador pode inserir convite para qualquer
  UUID de usuário conhecido. É uma fronteira de abuso latente que permaneceria
  mesmo após implementar F10.
- **Evidência:** `supabase/migrations/20260806171204_event_invites.sql:3-7`;
  `supabase/migrations/20260806171204_event_invites.sql:33-36`;
  `supabase/migrations/20260806171204_event_invites.sql:58-70`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — a policy deve cumprir a relação que o próprio contrato declara;
  não é decisão de produto permitir convite arbitrário silenciosamente.

---

## RT-29 — Pós-evento

### F88 · “Encerrado” não é um estado coerente nem produz valor pós-evento

- **Promessa:** a migration diz que o organizador encerra o evento “once it
  happened” e que eventos concluídos “are no longer actionable”; o MAP marca 6d
  como corrigida.
- **Comportamento:** o botão aparece para qualquer evento que não esteja
  cancelado/concluído, sem comparar `starts_at` com agora, e a RPC também não
  faz essa comparação; um evento futuro pode ser encerrado imediatamente. No
  sentido oposto, o bloco de RSVP só verifica `!isCancelled`, então um evento
  `completed` continua exibindo “Vou” e “Talvez”. Encerrar apenas muda `status`
  e mostra “Evento encerrado”; não abre fotos, discussão, presença realizada,
  retrospectiva ou qualquer outro resultado pós-evento. F81 ainda compromete a
  execução concreta do botão, mas não é repetido como causa aqui.
- **Evidência:** `docs/journeys/MAP.md:254`;
  `supabase/migrations/20260806173535_event_completion.sql:1-9`;
  `supabase/migrations/20260806173535_event_completion.sql:13-32`;
  `apps/web/app/(shell)/events/[id]/page.tsx:134-136`;
  `apps/web/app/(shell)/events/[id]/page.tsx:161-212`.
- **Severidade:** P1.
- **Veredicto:** SPLIT.
- **Balde:** B — tornar o estado terminal não acionável é coerência mínima; o
  valor que justifica existir um produto pós-evento (ou a remoção de 6d como
  feature separada) exige decisão do dono.

---

## RT-30 — Comentários no detalhe

### F89 · O MAP promete comentários, mas o detalhe contém apenas “Em breve”

- **Promessa:** 6c está marcada como corrigida com “descrição completa,
  comentários e confirmados”; a seção “Comentários” sugere um espaço existente.
- **Comportamento:** a seção renderiza somente o texto “Em breve.” Não há lista,
  composer, action, tabela `event_comments` ou herança dos comentários de post.
  Como F76 já impede chegar ao detalhe pela exploração normal, o placeholder é
  uma segunda camada de promessa sem produto.
- **Evidência:** `docs/journeys/MAP.md:253`;
  `apps/web/app/(shell)/events/[id]/page.tsx:233-238`;
  ausência de `event_comments` nas migrations e nos tipos gerados; comentários
  existentes pertencem a posts, conforme C6
  (`docs/red-team/camada-0-contratos.md:102-109`).
- **Severidade:** P1.
- **Veredicto:** REMOVE.
- **Balde:** A — remover a seção placeholder e corrigir o estado do MAP é a
  resposta honesta enquanto nenhum fluxo de comentário de evento existe; criar
  a feature no futuro permanece decisão separada.

---

## Placar do lote

| Severidade | Findings |
|---|---|
| P0 | F80 (1) |
| P1 | F75–F79, F81–F82, F84–F89 (13) |
| P2 | F83 (1) |

| Balde | Findings |
|---|---|
| A — correção inequívoca | F76, F77, F79–F82, F85–F87, F89 (10) |
| B — decisão do dono | F75, F78, F83, F84, F88 (5) |
