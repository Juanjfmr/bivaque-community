# Lote 2 — Perfil (RT-48 a RT-57)

Auditoria feita em 2026-08-10 contra a UI, as actions e os contratos de banco atuais. A régua é
`camada-0-contratos.md`, em especial C3, C9 e C12. F14 é premissa já fechada: este lote não
revalida a policy; apenas confronta com ela a copy mostrada ao usuário.

Foram avaliadas as dez dimensões da rubrica. Abaixo aparecem somente os pontos em que alguma
dimensão falha. Inferências estão marcadas como `[inferência]`.

## RT-49 — Visualizar outro usuário

### F45 · O produto fala em visibilidade de perfil, mas não oferece perfil de outro membro

- **Promessa:** a configuração diz que o usuário controla “quem pode ver seu perfil” e que
  membros da comunidade podem vê-lo.
- **Comportamento:** `/profile` sempre obtém o usuário da sessão e consulta apenas
  `profiles.user_id = user.id`; não lê id da URL. No feed, avatar e nome são elementos sem link ou
  ação. Na lista de membros do grupo, o nome também é texto puro. Não existe superfície funcional
  para abrir o perfil de outra pessoa, embora a própria copy pressuponha essa visualização.
- **Evidência:** `apps/web/app/(shell)/profile/page.tsx:117-133,368-395`;
  `apps/web/app/components/bivaque/feed-post.tsx:273-283`;
  `apps/web/app/(shell)/groups/[id]/page.tsx:193-208`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — o dono precisa decidir entre expor uma superfície de perfil alheio compatível
  com C3 ou remover a promessa de visibilidade e manter nomes/avatares sem navegação.
- **Dimensões que falham:** necessidade, modelo mental, coerência, happy path e valor.

### F46 · Notificação de aceite familiar aponta para o ator, mas abre o perfil do próprio titular

- **Promessa:** clicar em “aceitou seu convite de família” navega para
  `/profile?user=<actor_user_id>`, isto é, para a pessoa que aceitou.
- **Comportamento:** o item inteiro é acionável e executa essa navegação, mas a página de perfil
  ignora `user` e recarrega o usuário da sessão. O titular termina no próprio perfil.
- **Evidência:** `apps/web/app/(shell)/notifications/page.tsx:81-89,121-134,357-367`;
  `apps/web/app/(shell)/profile/page.tsx:117-133`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — é affordance fraud com destino objetivamente errado.
- **Dimensões que falham:** coerência, happy path e valor.

## RT-50 — Nome de exibição

### F47 · Nome aceita qualquer caractere desde que tenha de 2 a 80 posições

- **Promessa:** a UI apresenta o campo como nome de exibição visível a outros membros e informa
  apenas o limite de 2 a 80 caracteres.
- **Comportamento:** cliente e banco validam somente comprimento. Não há regra de caracteres,
  normalização ou bloqueio de controles direcionais/invisíveis. `[inferência]` Isso permite nomes
  visualmente enganosos ou difíceis de moderar; React evita injeção HTML, mas não resolve
  homógrafos, bidi ou caracteres de controle.
- **Evidência:** `apps/web/app/(shell)/profile/page.tsx:169-182,332-356`;
  `supabase/migrations/20260802000100_locality_profile_foundation.sql:31-40`.
- **Severidade:** P2.
- **Veredicto:** UNPROVEN.
- **Balde:** B — falta uma decisão de política de nomes; não cabe ao agente definir se o produto
  exige nome civil, apelido ou apenas um conjunto mínimo seguro.
- **Dimensões que falham:** abuso e operação.

## RT-51 — Avatar

### F48 · A foto enviada não aparece no cabeçalho do próprio perfil

- **Promessa:** a seção se chama “Foto de perfil”, e o cabeçalho é a representação principal do
  perfil do usuário.
- **Comportamento:** a seção de upload resolve e mostra a URL assinada, mas o cabeçalho usa outro
  `Avatar`, sem `src`, e sempre renderiza só a inicial. A mesma foto aparece no feed, criando três
  representações diferentes do mesmo usuário: foto na seção/feed, inicial no cabeçalho e “M” no
  fallback da seção (`name="me"`).
- **Evidência:** `apps/web/app/(shell)/profile/page.tsx:245-272`;
  `apps/web/app/(shell)/profile/avatar-section.tsx:14-20,35-47`;
  `apps/web/app/components/bivaque/feed-post.tsx:273-283`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o destino visual da foto já existe; falta usar a mesma fonte no cabeçalho e um
  fallback derivado do nome real.
- **Dimensões que falham:** coerência, happy path e valor.

### F49 · “A foto é privada por padrão” não descreve quem realmente pode vê-la

- **Promessa:** “A foto é privada por padrão.”
- **Comportamento:** o bucket não é público na internet, mas sua policy permite SELECT a qualquer
  usuário `authenticated`, inclusive quem não é membro da localidade. O endpoint de avatar apenas
  exige uma sessão e, usando `service_role`, gera URL para qualquer `userId`; não consulta
  localidade nem `profiles.visibility`. Portanto, “privada” não informa que qualquer conta
  autenticada que conheça o id pode obter a foto, inclusive quando o perfil está `hidden`.
- **Evidência:** `apps/web/app/(shell)/profile/avatar-section.tsx:56-74`;
  `supabase/migrations/20260802000500_storage_buckets.sql:1-10,57-63`;
  `apps/web/app/api/avatar/[userId]/route.ts:11-38,44-52`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — copy, alcance do endpoint e semântica de `hidden` precisam convergir; o dono deve
  decidir se avatar é visível a todo autenticado, só a membros autorizados pelo perfil ou apenas
  ao titular.
- **Dimensões que falham:** modelo mental, coerência, permissões e privacidade.

## RT-52 — Privacidade

### F50 · A decisão “Oculto” é tomada com uma promessa absoluta que F14 já invalidou

- **Promessa:** o estado `hidden` diz exatamente “Seu perfil fica oculto para outros membros.” e
  a seção conclui “Controle quem pode ver seu perfil dentro da comunidade.”
- **Comportamento:** conforme F14/C3 já fechados, co-membros aprovados de uma comunidade continuam
  vendo o perfil `hidden`. A tela não apresenta essa exceção, então o usuário não tem informação
  suficiente para decidir. Este finding confronta a copy com F14; não revalida a policy.
- **Evidência:** `apps/web/app/(shell)/profile/page.tsx:368-395`;
  `docs/red-team/camada-0-contratos.md:35-53`;
  `docs/red-team/lote-1-ancoras.md:194-207`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — é a tensão T1: o dono deve escolher a semântica; o agente não decide entre mudar
  policy, restringir a promessa ou remover `hidden` como conceito absoluto.
- **Dimensões que falham:** modelo mental, coerência e privacidade.

## RT-53 — Publicações no perfil

### F51 · A aba “Publicações” do próprio perfil mostra o feed da localidade, não as publicações do usuário

- **Promessa:** dentro do perfil pessoal, a aba “Publicações” usa o vazio “Você ainda não publicou
  nada”, atribuindo a lista ao titular.
- **Comportamento:** a página chama `feed_posts(PILOT_LOCALITY_ID, recent)`, corta os 20 primeiros
  resultados e não filtra `user_id`. A RPC retorna todos os posts acessíveis da localidade/grupos
  visíveis. Assim, o usuário vê conteúdo de terceiros como se fosse seu histórico. Os itens também
  são `<li>` sem navegação para o post.
- **Evidência:** `apps/web/app/(shell)/profile/page.tsx:38-45,127-161,274-308`;
  `supabase/migrations/20260805215020_community_feeds.sql:9-27,56-82`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o filtro pelo titular e a navegação para o post são correções inequívocas da aba
  já existente.
- **Dimensões que falham:** coerência, happy path e valor.

## RT-54 — Eventos no perfil

### F52 · A aba “Eventos” mostra os dez primeiros eventos acessíveis, sem relação com o usuário

- **Promessa:** dentro do perfil pessoal, a aba “Eventos” e o vazio “Nenhum evento cadastrado”
  fazem a lista parecer composta pelos eventos do titular.
- **Comportamento:** a consulta lê `events`, ordena por data e limita a dez, sem filtro por
  `organizer_id`, RSVP ou convite. A tela principal de eventos já sabe derivar “Seus eventos” por
  organizador e RSVP, mas essa lógica não é reutilizada no perfil. Os itens do perfil também não
  navegam para `/events/[id]`.
- **Evidência:** `apps/web/app/(shell)/profile/page.tsx:47-52,127-161,274-328`;
  `apps/web/app/(shell)/events/page.tsx:315-337`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — a relação do evento com o titular já tem definição funcional na página de
  eventos; a aba do perfil deve usar a mesma regra e o detalhe existente.
- **Dimensões que falham:** coerência, happy path e valor.

## RT-55 — Preferências de notificação

### F53 · Quatro controles são persistidos, mas nenhum controla a produção de notificações

- **Promessa:** “Escolha que alertas você quer receber”, com opções para mensagens diretas,
  comentários, eventos e menções.
- **Comportamento:** salvar faz apenas `upsert` dos quatro booleanos. Nenhum outro código da
  aplicação lê `notification_preferences`. No banco, os triggers de comentário, RSVP e mudança
  de evento inserem notificações sem consultar preferências; `direct_message` existe no enum, mas
  não tem trigger, e “menção” nem é um tipo de notificação. A divergência foi verificada nos dois
  lados, como exige C9.
- **Evidência:** `apps/web/app/(shell)/profile/notification-preferences-section.tsx:49-86`;
  `apps/web/app/(shell)/profile/notification-preferences-actions.ts:36-47,50-68`;
  `supabase/migrations/20260802001400_personal_notifications.sql:1-18,70-100,167-232`;
  `docs/red-team/camada-0-contratos.md:137-144`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — é affordance fraud: controles apresentados como efetivos não alteram o que o
  usuário recebe. Canais sem produtor não podem permanecer como preferências funcionais.
- **Dimensões que falham:** coerência, happy path, operação e valor.

## RT-56 — Família

### F54 · “Enviar” cria um convite irrecuperável, mas não o entrega ao familiar

- **Promessa:** o titular informa o e-mail do familiar e aciona “Enviar”.
- **Comportamento:** a action gera um token, calcula e grava seu digest e termina em
  `revalidatePath`. Ela não envia e-mail, não retorna link e não mostra o token ao titular. O token
  bruto deixa de existir ao fim da action. Do outro lado, a aceitação só começa quando alguém já
  chega a `/onboarding?invite=<token>` e envia esse token à API. Portanto, o registro fica
  `pending`, mas o familiar não recebe caminho utilizável para aceitá-lo.
- **Evidência:** `apps/web/app/(shell)/profile/family-invite-section.tsx:59-78`;
  `apps/web/app/(shell)/profile/family-invite-section-actions.ts:57-92`;
  `apps/web/app/(preauth)/onboarding/page.tsx:90-107,209-248`;
  `apps/web/app/api/onboarding/route.ts:67-79`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o ciclo não fecha; o convite precisa produzir um canal de entrega utilizável e
  observável, sem expor o digest persistido.
- **Dimensões que falham:** happy path, sad paths, operação e valor.

### F55 · A copy explica limites do convite, mas não o que o vínculo familiar concede

- **Promessa:** “Convites de família” informa somente limite de cinco e validade de sete dias.
- **Comportamento:** aceitar cria um vínculo permanente e o contrato `accepted_family` habilita DM
  entre titular e familiar. Nada disso é explicado antes do envio. Além disso, o seletor de nova
  conversa enumera apenas co-membros de grupos e cria conversas `shared_group`; logo, o benefício
  de DM familiar permitido pelo banco não é descobrível por essa superfície. A lacuna de contextos
  de DM já foi registrada em F11; aqui o problema é a decisão de família sem proposta de valor.
- **Evidência:** `apps/web/app/(shell)/profile/family-invite-section.tsx:59-83`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:101-152`;
  `apps/web/app/(shell)/messages/page.tsx:320-347,381-428`;
  `docs/red-team/lote-1-ancoras.md:151-163`.
- **Severidade:** P2.
- **Veredicto:** UNPROVEN.
- **Balde:** B — o dono precisa dizer qual valor “família” entrega e se DM familiar será exposta;
  sem essa decisão, a copy não permite consentimento informado nem demonstra utilidade.
- **Dimensões que falham:** necessidade, modelo mental, coerência e valor.

### F56 · O titular não consegue distinguir os convites pendentes que administra

- **Promessa:** o titular pode manter até cinco convites ativos e revogar cada um individualmente.
- **Comportamento:** a lista mostra apenas data de envio e expiração; não mostra destinatário nem
  identificador compreensível. Como o e-mail é guardado somente como digest, dois convites criados
  no mesmo dia ficam visualmente indistinguíveis e o titular pode revogar o registro errado.
- **Evidência:** `apps/web/app/(shell)/profile/family-invite-section.tsx:11-21,85-104`;
  `apps/web/app/(shell)/profile/family-invite-section-actions.ts:74-83`;
  `supabase/migrations/20260802000400_trust_invitation_helpers.sql:23-27,58-69`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** B — identificar o convite sem reintroduzir e-mail em claro no schema privado exige
  decisão de modelo e privacidade.
- **Dimensões que falham:** modelo mental, sad paths e operação.

## Cenários sem finding novo

- **RT-48 — visualizar o próprio perfil:** fora os achados F48, F51 e F52, a tela mostra somente
  nome, localidade, tempo de membership e configurações. Não promete bio, cargo, posto, patente ou
  organização militar (`apps/web/app/(shell)/profile/page.tsx:26-52,245-417`).
- **RT-57 — logout:** a ação pede confirmação, chama `supabase.auth.signOut()`, mantém o usuário na
  tela se houver erro e, no sucesso, navega para `/login`. O cliente Supabase armazena a sessão em
  cookies; é essa sessão gerida pelo SDK que a ação encerra
  (`apps/web/app/(shell)/profile/page.tsx:109-111,212-223,419-445`;
  `apps/web/lib/supabase/client.ts:7-22,36-42`). Não foi encontrada divergência de produto nesse
  recorte.

## Placar do lote

| Balde | Findings | Leitura |
|---|---|---|
| A — correção inequívoca | F46, F48, F51, F52, F53, F54 | Destino errado, dados errados ou controle sem efeito |
| B — decisão do dono | F45, F47, F49, F50, F55, F56 | Semântica de perfil/privacidade, política de nomes e valor de família |
