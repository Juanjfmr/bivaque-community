# Lote 2 — Notificações (RT-38..42)

Varredura feita em 2026-08-10 contra a UI, as rotas de destino e as migrations.
As dez dimensões da rubrica foram aplicadas; abaixo aparecem somente dimensões
com falha confirmada. F12 não é repetido: categorização heurística e tipos sem
origem continuam pertencendo ao lote de âncoras.

---

## Inventário RT-38 — tipo, origem e tratamento

O enum original tem `comment`, `group_admission`, `invitation_accepted`,
`event_rsvp`, `event_change` e `direct_message`
(`supabase/migrations/20260802001400_personal_notifications.sql:11-18`). A
migration posterior adiciona `report_resolved`
(`supabase/migrations/20260809184316_notify_report_resolved.sql:18`).

| Tipo | Origem atual | Aba | Texto | Destino |
|---|---|---|---|---|
| `comment` | trigger em `comments` (`supabase/migrations/20260802001400_personal_notifications.sql:72-100`) | Minha atividade (`apps/web/app/(shell)/notifications/page.tsx:56-59`) | tratado (`apps/web/app/(shell)/notifications/page.tsx:83-84`) | `/community?post=<target_id>` (`apps/web/app/(shell)/notifications/page.tsx:126-128`) |
| `group_admission` | trigger em `group_memberships` (`supabase/migrations/20260802001400_personal_notifications.sql:104-135`) | Vizinhança (`apps/web/app/(shell)/notifications/page.tsx:52-55`) | tratado (`apps/web/app/(shell)/notifications/page.tsx:85-86`) | `/groups/<target_id>` (`apps/web/app/(shell)/notifications/page.tsx:129-131`) |
| `invitation_accepted` | trigger em `family_invitations` (`supabase/migrations/20260802001400_personal_notifications.sql:139-165`) | Minha atividade (`apps/web/app/(shell)/notifications/page.tsx:56-59`) | tratado (`apps/web/app/(shell)/notifications/page.tsx:87-88`) | `/profile?user=<actor_user_id>` (`apps/web/app/(shell)/notifications/page.tsx:132-134`) |
| `event_rsvp` | trigger em `event_rsvps` (`supabase/migrations/20260802001400_personal_notifications.sql:169-197`) | Vizinhança (`apps/web/app/(shell)/notifications/page.tsx:52-55`) | tratado (`apps/web/app/(shell)/notifications/page.tsx:89-90`) | `/events/<target_id>` (`apps/web/app/(shell)/notifications/page.tsx:135-138`) |
| `event_change` | trigger em `events` (`supabase/migrations/20260802001400_personal_notifications.sql:201-232`) | Vizinhança (`apps/web/app/(shell)/notifications/page.tsx:52-55`) | tratado (`apps/web/app/(shell)/notifications/page.tsx:91-92`) | `/events/<target_id>` (`apps/web/app/(shell)/notifications/page.tsx:135-138`) |
| `direct_message` | sem origem; já coberto por F12 | Minha atividade (`apps/web/app/(shell)/notifications/page.tsx:56-59`) | tratado (`apps/web/app/(shell)/notifications/page.tsx:93-94`) | `/messages?conversation=<target_id>` (`apps/web/app/(shell)/notifications/page.tsx:139-141`) |
| `report_resolved` | inserção server-side na resolução (`apps/web/app/api/admin/reports/[id]/route.ts:98-109`) | Alertas (`apps/web/app/(shell)/notifications/page.tsx:60-61`) | tratado (`apps/web/app/(shell)/notifications/page.tsx:95-98`) | nenhum (`apps/web/app/(shell)/notifications/page.tsx:142-144`) |

Nenhum tipo hoje produzido fica sem aba ou sem texto. Um valor desconhecido
cai em **Alertas**, recebe “nova notificação” e não navega
(`apps/web/app/(shell)/notifications/page.tsx:62-64,99-101,142-144`): é degradação por
mal-classificação, não invisibilidade. A lacuna de origem de DM permanece
exclusivamente em F12.

## Matriz RT-40 — destino real e sad path

| Tipo | A rota existe e consome o parâmetro? | Alvo removido ou acesso perdido |
|---|---|---|
| `comment` | `/community` existe e lê `?post=` (`apps/web/app/(shell)/community/page.tsx:31-35`) | Se o post não estiver no feed carregado, a busca retorna sem mensagem (`apps/web/app/(shell)/community/page.tsx:191-215`). Post apagado é excluído do feed (`supabase/migrations/20260805215020_community_feeds.sql:75-79`). Conteúdo de comunidade também é excluído do feed da cidade (`:78`) — F107. |
| `group_admission` | `/groups/[id]` existe e lê `params.id` (`apps/web/app/(shell)/groups/[id]/page.tsx:88-90`) | Grupo inexistente redireciona silenciosamente para `/groups` (`apps/web/app/(shell)/groups/[id]/page.tsx:115-125`). Após sair, metadata continua descobrível por contrato, mas a rota também expõe a lista privada via `service_role` — F109. |
| `invitation_accepted` | `/profile` existe, mas **não lê** `?user=`; carrega `auth.getUser()` e o próprio perfil (`apps/web/app/(shell)/profile/page.tsx:85-133`) | O clique abre o perfil do destinatário, não o ator nem o vínculo aceito — F108. |
| `event_rsvp` / `event_change` | `/events/[id]` existe e lê `params.id` (`apps/web/app/(shell)/events/[id]/page.tsx:78-79`) | Evento inexistente redireciona para `/events` (`apps/web/app/(shell)/events/[id]/page.tsx:105-114`). Acesso perdido é ignorado pelo cliente `service_role` — F110. |
| `direct_message` | `/messages` existe e lê `?conversation=` (`apps/web/app/(shell)/messages/page.tsx:94-96`) | Se a conversa não pertence à lista carregada, a busca retorna sem feedback (`apps/web/app/(shell)/messages/page.tsx:107-115`). Sem origem de notificação: F12. |
| `report_resolved` | Não há `router.push` para o tipo | O item continua visualmente acionável, mas clicar só o marca como lido — F111. |

---

## Findings

### F105 · A notificação omite ator e objeto em todos os tipos — P1 · MODIFY · Balde B

- **Promessa:** uma notificação deve permitir entender quem fez o quê e sobre
  qual publicação, grupo, evento, convite ou denúncia.
- **Comportamento:** a consulta traz apenas a linha estrutural da notificação;
  a UI não resolve perfil nem objeto e renderiza literalmente “Alguém” + uma
  ação genérica. Dois comentários em posts diferentes, por exemplo, ficam
  indistinguíveis pelo texto.
- **Evidência:** `apps/web/app/(shell)/notifications/page.tsx:160-169`
  (`select("*")` só em `notifications`); `:81-101` (labels sem objeto);
  `:372-379` (“Alguém” + label + tempo).
- **Severidade:** P1 — a incompreensão aparece na primeira notificação e força
  o usuário a clicar para descobrir contexto.
- **Veredicto:** MODIFY — identificar ator e objeto sem inserir conteúdo livre
  no payload. A forma de representar ator oculto/removido é decisão de
  privacidade do dono.
- **Balde:** B — decisão do dono sobre identidade, anonimização e nível de
  detalhe.
- **Dimensões com falha:** modelo mental, coerência, happy path e valor.

### F106 · “Bloquear usuário” não bloqueia notificações produzidas por esse ator — P1 · UNPROVEN · Balde B

- **Promessa:** a UI confirma “Usuário bloqueado”, formulação ampla que sugere
  interrupção de contato da pessoa.
- **Comportamento:** o bloqueio é consultado para criar conversa e enviar DM,
  mas nenhum trigger de comentário, admissão, convite ou RSVP consulta
  `dm_blocks` antes de inserir. Assim, um ator bloqueado ainda pode originar
  notificações por interações fora da DM, desde que a ação-base seja permitida.
  **Inferência:** o código prova a ausência do filtro; o alcance pretendido da
  palavra “bloquear” não está documentado.
- **Evidência:** `apps/web/app/(shell)/messages/page.tsx:252-270` (grava
  `dm_blocks` e confirma “Usuário bloqueado”);
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:225-269`
  (bloqueio aplicado a conversa/mensagem);
  `supabase/migrations/20260802001400_personal_notifications.sql:81-90,118-125,146-154,178-187,217-223`
  (inserções sem consulta a bloqueio).
- **Severidade:** P1 — pode reabrir contato indesejado e expõe a ambiguidade
  assim que a pessoa bloqueada volta a interagir.
- **Veredicto:** UNPROVEN — é preciso decidir se bloquear significa “bloquear
  DM” ou “bloquear a pessoa no produto”; copy e fan-out devem refletir a mesma
  decisão.
- **Balde:** B — decisão do dono sobre a semântica e o alcance do bloqueio.
- **Dimensões com falha:** modelo mental, coerência, privacidade e abuso.

### F107 · Notificação de comentário aponta para um feed que não contém todo post notificável — P1 · MODIFY · Balde B

- **Promessa:** clicar em “comentou na sua publicação” abre a publicação alvo.
- **Comportamento:** todo comentário gera `target_id = post_id`, sem distinguir
  escopo, e a UI sempre abre o feed da cidade. Esse feed exclui posts de
  comunidade e grupos internos a comunidade. Mesmo em escopo compatível, se o
  alvo não estiver na coleção carregada (apagado/inacessível), o deep link
  retorna silenciosamente sem estado “não disponível”.
- **Evidência:** `supabase/migrations/20260802001400_personal_notifications.sql:81-90`;
  `apps/web/app/(shell)/notifications/page.tsx:125-128`;
  `supabase/migrations/20260805215020_community_feeds.sql:40-55,75-82`;
  `apps/web/app/(shell)/community/page.tsx:191-215`.
- **Severidade:** P1 — há uma classe inteira de notificações cujo clique não
  alcança o objeto prometido.
- **Veredicto:** MODIFY — o destino precisa ser derivado do escopo do post e o
  alvo indisponível precisa de saída explícita. A rota de Comunidade depende
  da decisão arquitetural F150/F152.
- **Balde:** B — a correção definitiva depende da decisão do dono sobre a
  superfície de Comunidades.
- **Dimensões com falha:** coerência, happy path, sad paths e valor.

### F108 · Aceite de convite familiar navega para o próprio perfil — P1 · MODIFY · Balde A

- **Promessa:** clicar na notificação de convite aceito abre o ator ou o
  contexto do vínculo recém-aceito.
- **Comportamento:** a página monta `/profile?user=<actor>`, mas `/profile` não
  lê `searchParams`; autentica o visitante e consulta somente `user.id`.
  Resultado: o destinatário abre o próprio perfil sem indicação do aceite.
- **Evidência:** `apps/web/app/(shell)/notifications/page.tsx:132-134`;
  `apps/web/app/(shell)/profile/page.tsx:85-133`.
- **Severidade:** P1 — o destino é factualmente errado em todo aceite.
- **Veredicto:** MODIFY — remover a navegação enganosa até existir destino que
  trate o ator/vínculo, ou apontar para esse destino quando ele existir.
- **Balde:** A — link que ignora o próprio parâmetro é correção inequívoca; não
  decide qual nova feature de família criar.
- **Dimensões com falha:** coerência, happy path e valor.

### F109 · Destino de grupo ignora RLS e expõe membros de grupo privado após a saída — P0 · MODIFY · Balde A

- **Promessa:** a notificação de admissão abre o grupo, respeitando o acesso
  atual; a policy permite lista de membros de grupo privado apenas a membro
  aprovado.
- **Comportamento:** a rota valida que existe sessão, mas lê grupo,
  memberships e perfis com `SUPABASE_SERVICE_ROLE_KEY`. Após o usuário sair
  de um grupo privado, o link antigo continua abrindo a página e a lista de
  membros, contornando a policy. Grupo apagado apenas redireciona para a lista.
- **Evidência:** `apps/web/lib/supabase/server.ts:4-17` (cliente
  `service_role`); `apps/web/app/(shell)/groups/[id]/page.tsx:88-125,127-146,193-208`;
  `supabase/migrations/20260802001000_groups_moderation.sql:156-174`
  (lista privada só para membro); `apps/web/app/(shell)/notifications/page.tsx:129-131`.
- **Severidade:** P0 — exposição direta de nomes de membros de grupo privado
  além da permissão vigente.
- **Veredicto:** MODIFY — o destino deve consultar sob a sessão do usuário e
  renderizar estado sem acesso; `service_role` não pode substituir RLS em
  leitura de página.
- **Balde:** A — restauração de fronteira de autorização inequívoca.
- **Dimensões com falha:** sad paths, permissões, privacidade e abuso.

### F110 · Mudança de evento notifica ex-participante e o destino revela o evento fora do escopo — P0 · MODIFY · Balde A

- **Promessa:** somente quem ainda pode acessar o evento recebe a atualização
  e abre seus detalhes.
- **Comportamento:** o fan-out seleciona todos os RSVPs sem revalidar
  membership. Se alguém sair do grupo/comunidade, o RSVP pode permanecer e
  ainda gerar notificação. A rota de detalhe então lê evento e lista de
  participantes com `service_role`, contornando a policy que exige o escopo
  atual. **Inferência:** não há FK/cascata entre membership e RSVP; o RSVP só
  referencia evento e usuário.
- **Evidência:** `supabase/migrations/20260802001400_personal_notifications.sql:217-223`;
  `supabase/migrations/20260802001200_events_rsvp.sql:31-32`;
  `supabase/migrations/20260805214709_community_scope.sql:354-384,409-443`;
  `apps/web/lib/supabase/server.ts:4-17`;
  `apps/web/app/(shell)/events/[id]/page.tsx:78-114,116-132`;
  `apps/web/app/(shell)/notifications/page.tsx:135-138`.
- **Severidade:** P0 — a combinação cria entrega ativa e leitura de conteúdo
  de evento depois da perda de permissão.
- **Veredicto:** MODIFY — revalidar acesso no fan-out e ler o destino sob a
  sessão/RLS, com estado explícito para acesso perdido.
- **Balde:** A — fan-out e leitura devem obedecer à mesma autorização vigente.
- **Dimensões com falha:** coerência, sad paths, permissões, privacidade e abuso.

### F111 · Notificação de denúncia resolvida parece clicável, mas não tem destino — P1 · MODIFY · Balde A

- **Promessa:** todo item da lista tem cursor e `onAction`, portanto aparenta
  abrir o contexto da notificação.
- **Comportamento:** `report_resolved` é renderizada na mesma `ListBox.Item`,
  mas o switch de navegação cai no `default` e retorna. O clique apenas dispara
  a marcação como lida, sem feedback nem destino.
- **Evidência:** `apps/web/app/(shell)/notifications/page.tsx:95-101,121-145,350-393`;
  `apps/web/app/api/admin/reports/[id]/route.ts:98-109` (o alvo é um `report`).
- **Severidade:** P1 — a affordance morta aparece na conclusão de um fluxo de
  confiança/moderação.
- **Veredicto:** MODIFY — enquanto não houver página de acompanhamento, esse
  tipo deve ser informativo e não acionável.
- **Balde:** A — remover affordance sem ação é correção inequívoca; criar uma
  nova área de acompanhamento seria decisão separada.
- **Dimensões com falha:** modelo mental, coerência e happy path.

### F112 · Preferências salvas não controlam nenhum fan-out — P0 · MODIFY · Balde A

- **Promessa:** “Escolha que alertas você quer receber”; o usuário pode
  desligar mensagens, comentários, eventos e menções.
- **Comportamento:** a UI salva os quatro booleanos em
  `notification_preferences`, mas nenhum produtor de notificação lê essa
  tabela. Comentários e eventos continuam inserindo para o destinatário mesmo
  quando desativados. Mensagens/menções não têm produtor correspondente; essa
  ausência de origem continua coberta por F12, não por um finding novo aqui.
- **Evidência:** `apps/web/app/(shell)/profile/notification-preferences-section.tsx:49-85`
  (promessa e controles); `apps/web/app/(shell)/profile/notification-preferences-actions.ts:50-68`
  (persistência); `supabase/migrations/20260806165606_notification_preferences.sql:8-15`
  (dados); `supabase/migrations/20260802001400_personal_notifications.sql:81-90,118-125,146-154,178-187,217-223`
  (todos os inserts sem consulta a preferências). A busca de
  `notification_preferences` no repositório encontrou apenas migration,
  teste, tipos gerados e essas actions; nenhum trigger a consulta.
- **Severidade:** P0 — affordance fraud de privacidade: o produto coleta uma
  escolha explícita e a ignora na entrega.
- **Veredicto:** MODIFY — produtores devem aplicar as preferências antes de
  inserir; controles sem efeito não podem continuar prometendo opt-out.
- **Balde:** A — honrar escolha persistida é correção inequívoca.
- **Dimensões com falha:** modelo mental, coerência, privacidade, abuso e valor.

### F113 · “Marcar todas” inclui notificações que a tela nunca carregou — P1 · MODIFY · Balde A

- **Promessa:** o contador e “Marcar todas como lidas” operam sobre as
  notificações apresentadas ao usuário.
- **Comportamento:** a lista carrega no máximo 50 e não tem paginação. A ação
  calcula IDs não lidos apenas dessa janela, mas executa `update` por
  `read_at is null`, sem filtrar os IDs. RLS restringe ao destinatário, porém
  todas as notificações antigas e não exibidas também viram lidas.
- **Evidência:** `apps/web/app/(shell)/notifications/page.tsx:156-165`
  (`limit(50)`); `:203-219` (IDs calculados, mas não usados no `update`);
  `supabase/migrations/20260802001400_personal_notifications.sql:55-68`
  (escopo por destinatário, não pela janela carregada).
- **Severidade:** P1 — em uma caixa com mais de 50 itens, o produto apaga o
  estado de não lida de conteúdo nunca visto.
- **Veredicto:** MODIFY — paginar/explicitar o alcance e alinhar o filtro do
  update ao conjunto prometido.
- **Balde:** A — estado lido não pode ser alterado fora do alcance apresentado.
- **Dimensões com falha:** modelo mental, coerência, sad paths e valor.

### F114 · Policy de leitura permite reescrever o conteúdo estrutural da própria notificação — P2 · MODIFY · Balde A

- **Promessa:** a policy é descrita como “update read_at only”; ao usuário cabe
  marcar como lida, não reescrever ator, tipo, ação ou destino.
- **Comportamento:** o grant é `update` sobre a tabela inteira e a policy só
  verifica que `recipient_user_id = auth.uid()`. Um cliente autenticado pode
  alterar `actor_user_id`, `type`, `action`, `target_type`, `target_id` e
  `created_at` das próprias linhas. Os testes positivos exercitam apenas
  `read_at` e não provam negação das demais colunas.
- **Evidência:** `supabase/migrations/20260802001400_personal_notifications.sql:48-50,62-68`;
  `supabase/tests/notifications-approved-events.sql:296-317`;
  `supabase/tests/notification-denials.sql:162-197`.
- **Severidade:** P2 — não cruza contas, mas permite forjar/corromper o próprio
  histórico por acesso direto à Data API.
- **Veredicto:** MODIFY — conceder update apenas de `read_at` e testar caminho
  positivo e negação de mutação estrutural.
- **Balde:** A — o contrato declarado já determina a correção.
- **Dimensões com falha:** coerência, permissões e abuso.

---

## Verificações sem finding novo

- **RT-39, conteúdo privado:** não há trecho de DM, nome de grupo/evento nem
  conteúdo reportado no payload ou no texto. A tabela carrega só referências
  estruturais (`supabase/tests/notification-denials.sql:238-268`) e a UI usa
  labels fixos (`apps/web/app/(shell)/notifications/page.tsx:81-101`). O custo é a perda de contexto
  de F105, não vazamento de conteúdo.
- **RT-41, leitura individual:** o botão e o clique no item persistem
  `read_at` no banco e atualizam a UI após sucesso
  (`apps/web/app/(shell)/notifications/page.tsx:179-201,362-391`).
- **RT-41, leitura em massa:** existe e persiste no banco
  (`apps/web/app/(shell)/notifications/page.tsx:203-222`), com o erro de alcance F113.
- **RT-41, badge:** o contador existe somente no cabeçalho da própria página
  (`apps/web/app/(shell)/notifications/page.tsx:252-285`). O sino global sem link/badge já é F6 e
  não foi duplicado.

## Placar

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F108, F109, F110, F111, F112, F113, F114 (7) | Corrigir sem decisão de produto |
| B — decisão do dono | F105, F106, F107 (3) | Definir identidade, alcance do bloqueio e arquitetura de Comunidades |
