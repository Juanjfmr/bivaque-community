# Lote 2 — Admin/Operação (RT-66..70)

Varredura feita em 2026-08-10 contra as rotas `(admin)`, handlers
`api/admin`, contratos C1/C2/C4/C10 e Ondas 0/1/8 do MAP. As dez dimensões da
rubrica foram avaliadas; abaixo aparecem somente as dimensões em que houve
falha. Inferências estão marcadas explicitamente.

---

## RT-66 — Admissions

### F175 · A fila permite observar a admissão, mas não agir sobre ela

- **Promessa:** o operador “monitora a fila de verificação e age quando ela
  falha ou estagna”, inclusive reemitindo a verificação em `TIMEOUT` ou
  `INVALID_KEY`.
- **Comportamento:** a página chama `list_verification_queue` e apenas renderiza
  uma lista. Não há ação de retry, reconsideração, correção de estado ou
  encaminhamento para diagnóstico. A RPC confirma que a origem é
  `private.verification_outcomes`, mas é estritamente de leitura; o write path
  service-role existente (`upsert_verification_outcome`) não é exposto ao
  operador. Logo, o painel informa quem está parado sem permitir cumprir a
  operação prometida.
- **Evidência:** `docs/PILOT_RUNBOOK.md:87-105`;
  `apps/web/app/(admin)/admissions/page.tsx:24-80`;
  `supabase/migrations/20260809171022_list_verification_queue.sql:30-57`;
  `supabase/migrations/20260802000400_trust_invitation_helpers.sql:153-196`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — o dono precisa decidir se o operador pode reprocessar,
  reconsiderar ou apenas encaminhar o usuário para uma nova tentativa; o
  painel atual não implementa nenhuma dessas operações.
- **Dimensões que falham:** Happy path, Sad paths, Operação, Valor.

### F176 · A fila mistura backlog, falha técnica e rejeição definitiva com SLA enganoso

- **Promessa:** o painel destaca admissões estagnadas para que o operador
  priorize quem precisa de intervenção.
- **Comportamento:** a RPC inclui indefinidamente `pending`, `temporary_error`
  e `rejected` na mesma fila, ordena por `created_at` e não retorna
  `updated_at`, código de erro ou estado de triagem. A página calcula `+Nh` a
  partir desse `created_at`, inclusive para uma rejeição definitiva ou um
  outcome reprocessado, e descreve todas as linhas como pessoas “aguardando ou
  bloqueadas”. Como o registro é um upsert por usuário, `created_at` não muda
  nas novas tentativas. **[inferência]** Com o tempo, rejeições legítimas
  permanecem vermelhas e competem por atenção com falhas recuperáveis, fazendo
  o operador priorizar idade de conta em vez de urgência operacional.
- **Evidência:** `apps/web/app/(admin)/admissions/page.tsx:39-74`;
  `supabase/migrations/20260809171022_list_verification_queue.sql:20-28,42-50`;
  `supabase/migrations/20260802000200_private_trust_family_foundation.sql:25-35`;
  `supabase/migrations/20260802000400_trust_invitation_helpers.sql:173-185`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** B — separar “caso encerrado” de “fila acionável” e definir quando
  o SLA reinicia são decisões de operação do piloto.
- **Dimensões que falham:** Modelo mental, Coerência, Operação, Valor.

---

## RT-67 — Reports como ferramenta operacional

### F177 · A ação destrutiva é oferecida sem evidência suficiente para julgar

- **Promessa:** o operador abre os detalhes, classifica conteúdo proibido ou
  falsa denúncia e então decide entre ocultar e resolver.
- **Comportamento:** cada cartão mostra apenas tipo do alvo, texto livre do
  denunciante, horário e UUID do alvo. Não mostra conteúdo denunciado, autor,
  contexto, estado atual do alvo, identidade/histórico do denunciante nem
  quantidade de denúncias sobre o mesmo alvo. Mesmo assim, “Ocultar conteúdo”
  aparece como submissão direta, sem tela de detalhes ou confirmação. O banco
  permite repetição por denunciantes diferentes, mas a página não agrupa nem
  conta essas ocorrências. Um operador não técnico não consegue conferir a
  acusação antes da ação que remove conteúdo para todos.
- **Evidência:** `docs/PILOT_RUNBOOK.md:195-209`;
  `apps/web/app/(admin)/reports/page.tsx:148-210`;
  `supabase/migrations/20260802001600_reports.sql:25-50`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** A — uma ação destrutiva precisa mostrar o alvo e pedir confirmação;
  hoje a própria promessa operacional já define essa inspeção.
- **Dimensões que falham:** Modelo mental, Happy path, Privacidade, Abuso,
  Operação.

### F178 · O painel não entrega filtros, SLA visível nem consolidação de repetição

- **Promessa:** o desenho operacional do MAP pede filtros por tipo, idade e
  repetição; o runbook afirma que idade acima de 48h fica em destaque e que
  clicar no item abre detalhes.
- **Comportamento:** a consulta só filtra `status = open` e ordena do mais
  antigo para o mais novo. Não há filtro, busca, paginação, agrupamento por
  alvo, contagem de repetição, badge de SLA ou página de detalhe. Sob pressão,
  um pico vira uma sequência plana de UUIDs, sem mecanismo para reunir várias
  denúncias do mesmo incidente ou destacar o prazo vencido.
- **Evidência:** `docs/journeys/MAP.md:563-571`;
  `docs/PILOT_RUNBOOK.md:197-202`;
  `apps/web/app/(admin)/reports/page.tsx:148-185`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — o comportamento documentado já escolheu filtros, detalhe e
  destaque de SLA; falta fazê-lo corresponder à ferramenta.
- **Dimensões que falham:** Coerência, Sad paths, Operação, Valor.

### F179 · O painel principal e a API executam “resolver” com efeitos diferentes

- **Promessa:** ao resolver pelo painel, o sistema registra o desfecho e emite
  `report_resolved` ao denunciante sem revelar a ação tomada.
- **Comportamento:** a página, indicada pelo runbook como caminho principal,
  usa Server Actions inline que atualizam `reports` e revalidam a rota, mas não
  criam notificação. A API paralela cria `report_resolved` apenas no branch
  `resolve`. Assim, o retorno ao denunciante depende de qual caminho técnico
  acionou a mesma operação, algo invisível ao operador.
- **Evidência:** `docs/PILOT_RUNBOOK.md:193-201`;
  `apps/web/app/(admin)/reports/page.tsx:116-146,197-210`;
  `apps/web/app/api/admin/reports/[id]/route.ts:71-119`.
- **Severidade:** P1.
- **Veredicto:** MERGE.
- **Balde:** A — a mesma ação operacional deve ter um único efeito canônico.
- **Dimensões que falham:** Coerência, Happy path, Operação, Valor.

---

## RT-68 — Portal health

### F180 · Chave inválida pode virar rejeição de elegibilidade antes que o operador perceba

- **Promessa:** o health check diferencia chave inválida, rate limit, timeout,
  erro HTTP e drift; “sem match” deve continuar sendo uma rejeição de
  elegibilidade, não falha de infraestrutura.
- **Comportamento:** o probe classifica HTTP 401 como `invalid_key`, mas o
  cliente usado na admissão transforma o mesmo 401 em array vazio. O
  classificador transforma array vazio em `rejected`. Esse outcome persiste no
  schema `private` sem `errorCode`, e a fila mostra somente “Rejeitado”. Logo,
  uma chave expirada pode rejeitar candidatos como se o Portal tivesse
  respondido “sem match”; a distinção existe no probe, mas não no caminho que
  decide a admissão.
- **Evidência:** `apps/web/lib/portal/probe.ts:35-40`;
  `apps/web/lib/portal/client.ts:40-44,82-95`;
  `apps/web/lib/portal/classify.ts:115-121`;
  `supabase/migrations/20260809171022_list_verification_queue.sql:25-28`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** A — erro de autenticação da API não pode ser classificado como
  decisão de elegibilidade.
- **Dimensões que falham:** Coerência, Happy path, Sad paths, Permissões,
  Operação.

### F181 · O “check do operador” não é acessível pela sessão do painel

- **Promessa:** o runbook manda o operador autenticado “acessar”
  `/api/admin/portal-health` e confirmar o status sem manipular a chave.
- **Comportamento:** o endpoint não lê a sessão por cookie; exige header
  `Authorization: Bearer ...` e responde 401 quando ele não existe. Não há
  página, botão, fetch ou navegação admin que obtenha o token e apresente os
  estados em português; o layout apenas valida a sessão e renderiza o filho.
  Abrir a URL no navegador já autenticado no painel não satisfaz o gate. O
  retorno bem-sucedido também é apenas o enum técnico e timestamp.
- **Evidência:** `docs/PILOT_RUNBOOK.md:294-299`;
  `apps/web/app/api/admin/portal-health/route.ts:20-35,53-60`;
  `apps/web/app/(admin)/layout.tsx:7-46`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — ou a sessão existente precisa acionar o probe por uma
  superfície operacional, ou o runbook precisa fornecer um procedimento
  realmente executável; “acessar autenticado” não funciona como escrito.
- **Dimensões que falham:** Modelo mental, Happy path, Coerência, Operação.

---

## RT-69 — RLS health

### F182 · O check de autopromoção usa coluna inexistente e pode dar falso verde

- **Promessa:** `operators_insert` prova que um usuário comum não consegue se
  promover porque a RLS rejeita o insert.
- **Comportamento:** o probe insere `{ user_id: ... }`, mas a tabela se chama
  `public.operators` e sua coluna é `auth_user_id`. Qualquer execução falha por
  schema antes de testar a policy; o código interpreta todo erro como `pass`.
  Portanto, mesmo uma regressão que abrisse INSERT para `authenticated` poderia
  continuar reportando esse check como saudável. Os testes unitários exercitam
  somente o classificador com checks já fabricados, não a asserção real.
- **Evidência:** `apps/web/lib/rls-probe.ts:195-206`;
  `supabase/migrations/20260806040949_operator_authorization.sql:22-29`;
  `supabase/tests/operator-authorization.sql:88-96`;
  `tests/unit/admin/rls-probe.test.ts:16-46,49-73`.
- **Severidade:** P0.
- **Veredicto:** MODIFY.
- **Balde:** A — o probe precisa atingir a policy que afirma testar e provar
  que a rejeição ocorreu pelo motivo esperado.
- **Dimensões que falham:** Coerência, Permissões, Privacidade, Operação.

### F183 · Várias asserções confundem erro técnico com proteção de RLS

- **Promessa:** sete checks ao vivo permitem ao operador distinguir fronteira
  íntegra (`ok`) de falha de privacidade (`degraded`) e falha de execução
  (`error`).
- **Comportamento:** `self_profile` seleciona qualquer perfil visível com
  `limit(1)`, não o perfil do usuário autenticado que a descrição promete;
  probes do schema private aceitam qualquer 4xx como proteção válida;
  `foreign_notifications` considera qualquer erro um `pass`; e
  `admissions_queue` também considera qualquer erro um `pass`. Ausência de
  função/coluna, permissão incorreta, erro do PostgREST e negação esperada
  colapsam no mesmo verde. Além disso, o endpoint repete o problema de acesso
  do Portal: exige Bearer explícito e expõe IDs técnicos em inglês, sem
  superfície que traduza o resultado para o operador não técnico.
- **Evidência:** `apps/web/lib/rls-probe.ts:21-35,143-151,154-191,241-271`;
  `apps/web/app/api/admin/rls-health/route.ts:22-37,55-66`;
  `docs/PILOT_RUNBOOK.md:296-301`.
- **Severidade:** P1.
- **Veredicto:** MODIFY.
- **Balde:** A — erro de execução deve falhar fechado e ser distinguido de uma
  negação esperada antes que o agregado possa ser chamado de health check.
- **Dimensões que falham:** Modelo mental, Coerência, Sad paths, Permissões,
  Privacidade, Operação.

---

## RT-70 — Gestão de operador

### F184 · A governança do operador não está provada e o runbook contradiz o modelo de revogação

- **Promessa:** `public.operators` é a allowlist auditável; promoção e
  revogação determinam quem acessa o painel, sem expor a service role ao
  operador cotidiano.
- **Comportamento:** não existe UI nem route handler para listar, promover ou
  revogar operadores. O runbook manda fazer INSERT direto e sugere DELETE,
  embora a migration declare `private.promote_operator_by_email` como caminho
  sancionado de promoção e modele revogação por `revoked_at`/`revoked_by`; a
  própria correção de repromoção só funciona por esse RPC. O runbook também diz
  que “quem autoriza” ainda é decisão não definida e cita uma rota
  `apps/web/app/api/admin/route.ts` inexistente. **[inferência]** Como não há
  regra de último operador ativo, quorum, proteção contra autorrevogação nem
  recuperação documentada, uma operação SQL errada pode deixar zero operadores;
  no extremo oposto, não executar a revogação manual mantém privilégio por
  tempo indefinido.
- **Evidência:** `docs/PILOT_RUNBOOK.md:211-221`;
  `supabase/migrations/20260806040949_operator_authorization.sql:22-32,86-131`;
  `supabase/migrations/20260806095803_fix_operator_repromotion.sql:19-50`;
  `supabase/migrations/20260806111744_is_current_user_operator.sql:19-31`.
- **Severidade:** P1.
- **Veredicto:** UNPROVEN.
- **Balde:** B — o dono precisa definir autoridade de concessão, revogação,
  continuidade e recuperação antes de escolher a superfície de gestão.
- **Dimensões que falham:** Necessidade, Modelo mental, Coerência, Permissões,
  Abuso, Operação.

---

## Resposta à pergunta central

**Não.** O operador não técnico consegue ver filas, mas não recebe contexto
suficiente para decidir admissões ou denúncias, não dispõe de ações de
recuperação de admissão, não consegue executar os health checks pela sessão do
painel como o runbook promete e depende de SQL contraditório para gerir o
próprio acesso. A situação é agravada por dois falsos verdes objetivos: chave
do Portal inválida convertida em rejeição e `operators_insert` testando uma
coluna inexistente.

## Placar

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F177, F178, F179, F180, F181, F182, F183 (7) | Corrigir coerência e segurança operacional sem decidir produto novo |
| B — decisão do dono | F175, F176, F184 (3) | Definir poder de intervenção, semântica da fila e governança de operadores |
