# Lote 2 — Mensagens/DM (RT-31..37)

Varredura feita em 2026-08-10 contra a tela completa de mensagens, o thread de
chat, a superfície de denúncias e as policies SQL. A auditoria percorreu as 10
dimensões da rubrica; abaixo aparecem somente as dimensões em que houve falha.

Não se repete o **F11**: a exposição de apenas `shared_group` entre os quatro
contextos possíveis já está registrada em
`docs/red-team/lote-1-ancoras.md:151-163`. Também
não se abre novo número para a ausência do trigger de DM, já coberta pelo
**F12**. Este lote registra os efeitos adicionais dessa ausência no fluxo de
conversa. A migration confirma que `direct_message` foi declarado como futuro
e que os triggers implementados terminam em comentário, grupo, família e
evento, sem trigger sobre `dm_messages`
(`supabase/migrations/20260802001400_personal_notifications.sql:1-4,70-232`).

---

## RT-31 — Descobrir contato

### F90 · O seletor fica vazio depois que todos os contatos elegíveis já têm conversa

- **Promessa:** “Nova conversa” abre uma lista de pessoas elegíveis ou explica
  por que não há ninguém disponível.
- **Comportamento:** a página só trata “nenhum membro encontrado” antes de
  remover parceiros que já têm conversa. Se todos forem removidos por esse
  filtro, `contactList` fica vazio, mas não há `pickerError`; o modal mostra
  apenas a introdução e “Cancelar”, sem lista nem estado vazio.
- **Evidência:** `apps/web/app/(shell)/messages/page.tsx:355-359,375-400,651-707`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

### F91 · A descoberta não tem ordenação estável e inventa um “primeiro grupo”

- **Promessa:** a pessoa encontra um contato pela identidade e entende qual
  contexto compartilhado autoriza a conversa.
- **Comportamento:** a consulta de memberships não define ordenação; a lista
  preserva essa ordem indeterminada e, quando duas pessoas compartilham mais de
  um grupo, o código mantém o primeiro resultado recebido. Busca por nome/grupo
  existe, mas a listagem inicial e o grupo exibido podem variar entre cargas.
- **Evidência:** `apps/web/app/(shell)/messages/page.tsx:341-347,381-399,403-409,683-703`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

---

## RT-32 — Criar conversa

### F92 · Quem tem o UUID maior não consegue iniciar a conversa

- **Promessa:** qualquer pessoa elegível pode iniciar uma DM com o contato
  apresentado no seletor.
- **Comportamento:** a UI ordena o par para satisfazer
  `participant_a < participant_b`. Porém a policy de INSERT exige que o usuário
  autenticado seja sempre `participant_a`. Se o iniciador tiver UUID maior, a
  UI corretamente o grava como `participant_b` e a policy rejeita a criação.
  A capacidade de iniciar fica determinada por ordenação técnica de UUID, não
  pela relação entre as pessoas.
- **Evidência:** `apps/web/app/(shell)/messages/page.tsx:63-66,417-430`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:19-28,225-240`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

### F93 · A policy valida que existe algum vínculo, não o contexto declarado

- **Promessa:** `context_type` e `context_id` explicam o vínculo concreto que
  autorizou a conversa (“Grupo em comum”, “Evento em comum”, “Recomendação” ou
  “Família”).
- **Comportamento:** `can_dm_between(a,b)` retorna verdadeiro se existir
  qualquer um dos quatro vínculos, mas o INSERT nunca verifica se
  `context_type/context_id` correspondem ao vínculo encontrado. Um cliente pode
  declarar `shared_group` com UUID arbitrário usando apenas um vínculo familiar
  ou de evento; a UI depois transforma esse dado em sinal de confiança falso.
- **Evidência:** `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:101-159,225-240`;
  `apps/web/app/components/bivaque/chat-thread.tsx:18-23,185-186,213-216`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

### F94 · As copies de erro dependem de mensagens que a policy não emite

- **Promessa:** falhas por conversa duplicada, falta de contexto ou bloqueio
  recebem explicação acionável em português.
- **Comportamento:** o frontend procura as substrings `can_dm_between` e
  `block`, mas as policies falham pelo `WITH CHECK`, sem `raise exception` de
  domínio. Os testes fixam SQLSTATE `42501` para falta de contexto e bloqueio,
  não uma mensagem contratada; qualquer texto que não contenha essas
  substrings cai diretamente em `insertError.message`. **Inferência marcada:**
  nesses sad paths, o usuário tende a receber a mensagem técnica de RLS em vez
  das copies preparadas.
- **Evidência:** `apps/web/app/(shell)/messages/page.tsx:432-443`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:227-240`;
  `supabase/tests/dm-context-denials.sql:22-37,82-123`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

---

## RT-33 — Conversar

### F95 · O “chat” não recebe mensagens novas sem recarregar

- **Promessa:** duas pessoas conversam e percebem a chegada de uma nova
  mensagem, inclusive com duas abas já abertas.
- **Comportamento:** as mensagens são carregadas uma vez ao montar o thread e
  recarregadas apenas depois do envio feito naquela própria instância. Não há
  subscription Realtime nem polling. A lista de conversas também só carrega na
  primeira autenticação. Portanto, uma mensagem enviada na aba A não aparece na
  aba B nem para o destinatário enquanto a tela permanecer aberta. Não existe
  unread de DM ou badge em “Mensagens”; e, conforme F12/C9, também não existe
  trigger de notificação de DM.
- **Evidência:** `apps/web/app/components/bivaque/chat-thread.tsx:69-91,120-140`;
  `apps/web/app/(shell)/messages/page.tsx:133-230`;
  `apps/web/app/components/bivaque/bottom-nav.tsx:63-69,120-133`;
  `supabase/migrations/20260802001400_personal_notifications.sql:1-4,70-232`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

### F96 · A lista é ordenada pela criação da conversa, não pela atividade

- **Promessa:** a inbox ajuda a reencontrar a conversa mais recente e mostra a
  última mensagem atual.
- **Comportamento:** conversas são ordenadas por `dm_conversations.created_at`.
  As últimas mensagens são buscadas depois apenas para preview, sem reordenar.
  Além disso, o envio acontece dentro de `ChatThread` e não atualiza o mapa
  `lastMessages` da página. Uma conversa antiga ativa permanece enterrada e o
  preview do próprio envio fica desatualizado até recarregar.
- **Evidência:** `apps/web/app/(shell)/messages/page.tsx:139-142,178-200,554-580`;
  `apps/web/app/components/bivaque/chat-thread.tsx:120-140`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

### F97 · O thread baixa o histórico inteiro sem paginação

- **Promessa:** uma conversa continua utilizável conforme o histórico cresce.
- **Comportamento:** cada abertura faz `select("*")`, ordena todo o histórico e
  não aplica `limit`, cursor ou carregamento incremental. O banco possui índice
  por conversa/data, mas a UI materializa todas as mensagens de uma vez.
- **Evidência:** `apps/web/app/components/bivaque/chat-thread.tsx:69-87`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:47-51`.
- **Severidade:** P2.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

---

## RT-34/35 — Bloquear e desbloquear

### F98 · O bloqueio bilateral é apenas de UI; o bloqueador pode continuar enviando

- **Promessa:** C8 define bloqueio direcional com efeito bilateral no envio; ao
  bloquear, nenhum dos dois lados deve conseguir continuar a abordagem.
- **Comportamento:** `is_dm_blocked_by_other` só pergunta se **o outro** bloqueou
  o usuário atual. Assim, o bloqueado não envia, mas o bloqueador continua
  autorizado pela RLS. A UI honesta esconde o composer dos dois lados, porém um
  cliente direto pode inserir mensagens como bloqueador. O próprio teste SQL
  afirma explicitamente “blocker can still send”.
- **Evidência:** `apps/web/app/components/bivaque/chat-thread.tsx:99-101,336-370`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:185-211,259-269`;
  `supabase/tests/dm-context-denials.sql:389-451`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

### F99 · O produto revela ao potencial assediador que ele foi bloqueado

- **Promessa:** bloquear protege o usuário sem criar um novo vetor de pressão
  ou retaliação.
- **Comportamento:** a pessoa bloqueada pode ler a própria linha direcional em
  `dm_blocks`; a lista mostra “Bloqueado(a)” e o thread diz explicitamente
  “Você foi bloqueado”. A conversa continua visível. Essa transparência pode
  ser deliberada, mas hoje é uma decisão de segurança implícita.
- **Evidência:** `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:271-281`;
  `apps/web/app/(shell)/messages/page.tsx:202-220,581-585`;
  `apps/web/app/components/bivaque/chat-thread.tsx:217-227,336-343`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — decisão do dono do produto.

---

## RT-36 — Denunciar DM

### F100 · A denúncia de DM entra numa fila que nenhum operador consome

- **Promessa:** “Denunciar” envia o caso de assédio para análise operacional.
- **Comportamento:** o chat grava em `dm_reports`, tabela sem status, resolução
  ou integração com o painel. O painel administrativo lê exclusivamente
  `reports`. Paralelamente, `reports` aceita `target_type = 'message'`, mas o
  chat não usa essa tabela e as ações de ocultação do painel só suportam post,
  comentário e grupo. Há dois modelos de denúncia incompatíveis; a DM fica fora
  do workflow que de fato é operado.
- **Evidência:** `apps/web/app/components/bivaque/chat-thread.tsx:163-182`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:64-76,297-322`;
  `supabase/migrations/20260802001600_reports.sql:11-16,25-50,52-56`;
  `apps/web/app/(admin)/reports/page.tsx:44-93,148-156`.
- **Severidade:** P1.
- **Veredicto:** MERGE.
- **Balde:** B — decisão do dono do produto.

### F101 · Denunciar não confirma sucesso e aceita repetição ou auto-denúncia via API

- **Promessa:** o usuário envia uma denúncia uma vez, recebe confirmação e o
  sistema evita ruído deliberado na fila.
- **Comportamento:** após o INSERT, o formulário apenas fecha; não há toast nem
  estado de sucesso, e “Denunciar” reaparece. `dm_reports` não tem unicidade por
  repórter/mensagem. A UI oculta a ação nas mensagens próprias, mas a policy só
  exige participação na conversa, logo um cliente direto pode denunciar a
  própria mensagem e repetir a mesma denúncia indefinidamente.
- **Evidência:** `apps/web/app/components/bivaque/chat-thread.tsx:163-182,255-320`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:64-76,306-322`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — correção inequívoca.

---

## RT-37 — Perder o contexto compartilhado

### F102 · Sair ou ser expulso do grupo não encerra a autorização da DM

- **Promessa:** a DM é contextual: o vínculo compartilhado autoriza o contato.
- **Comportamento:** o contexto é consultado apenas ao criar a conversa. Depois,
  SELECT e INSERT de mensagens verificam somente participação na conversa e
  bloqueio; não chamam `can_dm_between` novamente. Sair do grupo ou ser removido
  apaga a membership, mas não a conversa. Os dois continuam lendo e enviando
  indefinidamente, enquanto a UI ainda diz “Grupo em comum”. Isso também vale
  quando a perda do grupo é uma expulsão por moderação.
- **Evidência:** `supabase/migrations/20260802001000_groups_moderation.sql:202-222`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:19-28,101-159,242-269`;
  `apps/web/app/(shell)/groups/[id]/page.tsx:46-60`;
  `apps/web/app/components/bivaque/chat-thread.tsx:18-23,213-216`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — decisão do dono do produto.

---

## Abuso transversal

### F103 · Não há limite de criação ou envio contra spam

- **Promessa:** “DM contextual com controles de abuso” limita contato não
  solicitado e oferece proteção proporcional ao canal privado.
- **Comportamento:** a unicidade limita uma conversa por par e a mensagem a
  2.000 caracteres, mas não existe cota temporal de conversas nem de mensagens.
  Um membro pode abrir uma conversa com cada pessoa elegível e inserir mensagens
  sem limite. **Inferência marcada:** como as policies de INSERT só testam
  relação/participação/bloqueio, nenhuma delas impõe frequência ou volume.
- **Evidência:** `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:19-28,36-51,225-240,259-269`;
  `apps/web/app/components/bivaque/chat-thread.tsx:99-151,345-368`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — decisão do dono do produto.

---

## Dimensões com falha

| Dimensão | Findings |
|---|---|
| Modelo mental | F90, F91, F93, F99, F102 |
| Coerência | F93, F94, F95, F98, F100, F102 |
| Happy path | F92, F95, F96 |
| Sad paths | F90, F94, F101 |
| Permissões | F92, F93, F98, F101, F102 |
| Privacidade | F99, F102 |
| Abuso | F98, F99, F101, F103 |
| Operação | F97, F100, F103 |
| Valor | F95, F96, F100 |

## Placar

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F90, F91, F92, F93, F94, F95, F96, F97, F98, F101 (10) | Corrigir contrato/fluxo sem decisão de produto |
| B — decisão do dono | F99, F100, F102, F103 (4) | Decidir semântica de segurança, operação e limites |

**Severidade:** 1 P0 (F98), 11 P1 (F90, F92-F96, F99-F103) e 2 P2
(F91, F97). O P0 é quebra direta do controle de bloqueio prometido; os P1
atingem o ciclo principal ou o canal de segurança/moderação.
