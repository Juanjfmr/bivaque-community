# Lote 2 — Denúncia e moderação (RT-58..65)

Varredura feita em 2026-08-10 contra a Camada 0 C10, as linhas 4b/4c e
10a/10b do `docs/journeys/MAP.md`, o runbook do piloto, as superfícies de
denúncia e o painel do operador. Foram avaliadas as dez dimensões da rubrica;
abaixo aparecem somente dimensões em que há falha comprovada ou risco ainda
sem decisão.

## Cobertura dos cenários

| RT | Fluxo | Falhas encontradas |
|---|---|---|
| RT-58 | Denunciar post | F160, F161, F170 |
| RT-59 | Denunciar grupo | F161, F166, F170 |
| RT-60 | Denunciar DM | F162, F163, F170 |
| RT-61 | Triagem | F164, F172, F173, F174 |
| RT-62 | Ocultar | F165, F166, F167 |
| RT-63 | Resolver | F167, F168, F169 |
| RT-64 | Feedback ao denunciante | F170 |
| RT-65 | Recurso/apelação | F171 |

---

## Findings

### F160 · O post não tem ação de denúncia — P0 · MODIFY · Balde A

- **Promessa:** o MAP marca 4b como Corrigida e a jornada §9 descreve
  “...” → “Denunciar”; `ReportButton` declara suporte a `targetType="post"`.
- **Comportamento:** o menu do post contém apenas ocultar localmente, salvar e
  compartilhar. O único `ReportButton` dentro de `FeedPost` pertence ao
  comentário; não há uso com `targetType="post"` no app. Portanto o happy path,
  duplicate e self-report de post não são alcançáveis pela UI.
- **Evidência:** `apps/web/app/components/bivaque/feed-post.tsx:51-52,119-129`;
  `apps/web/app/components/bivaque/report-button.tsx:9-12`;
  `docs/journeys/MAP.md:242,515-527`.
- **Severidade:** P0 — o alvo central do fluxo de moderação não pode ser
  denunciado por um membro, reabrindo o risco que fez 4b ser tratado como P0.
- **Veredicto:** MODIFY.
- **Balde:** A — a capacidade e o destino já existem; falta a affordance
  prometida, sem decisão de produto a tomar.
- **Dimensões:** happy path, coerência, valor, operação.

### F161 · O componente genérico envia uma denúncia inválida — P0 · MODIFY · Balde A

- **Promessa:** grupo e comentário exibem “Denunciar”; o componente promete
  confirmação, mensagem específica para duplicata e bloqueio de auto-denúncia.
- **Comportamento:** o `insert` envia apenas `target_type`, `target_id` e
  `reason`, mas `reports.reporter_user_id` é obrigatório, não tem default e a
  policy exige que seja igual a `auth.uid()`. O cast silencia o campo obrigatório
  no TypeScript. Assim, as denúncias de grupo e comentário falham antes do happy
  path; as mensagens de duplicate/self-report ficam, na prática, inalcançáveis e
  o usuário recebe o erro bruto do banco.
- **Evidência:** `apps/web/app/components/bivaque/report-button.tsx:33-50`;
  `apps/web/app/(shell)/groups/page.tsx:374-389`;
  `apps/web/app/components/bivaque/feed-post.tsx:43-52`;
  `supabase/migrations/20260802001600_reports.sql:25-30,132-142`;
  `supabase/database.generated.ts:886-897`.
- **Severidade:** P0 — duas superfícies aparentam aceitar denúncia, mas não
  entregam nenhum item à fila operacional.
- **Veredicto:** MODIFY.
- **Balde:** A — o payload precisa satisfazer o contrato já definido.
- **Dimensões:** happy path, sad paths, coerência, valor.

### F162 · Denúncias de DM entram numa fila sem consumidor — P0 · MODIFY · Balde A

- **Promessa:** o usuário denuncia uma mensagem e o runbook afirma que
  denúncias de DM são revisadas pelo painel e recebem retorno in-app.
- **Comportamento:** a UI grava em `dm_reports`, tabela separada sem `status`,
  `operator_note`, `resolved_by` ou `resolved_at`. O painel consulta somente
  `reports`; não existe leitura de `dm_reports` em código de aplicação fora do
  próprio insert. A denúncia fecha o formulário, mas não chega à triagem nem
  pode ser resolvida pelo fluxo existente.
- **Evidência:** `apps/web/app/components/bivaque/chat-thread.tsx:163-181`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:64-76`;
  `apps/web/app/(admin)/reports/page.tsx:148-155`;
  `docs/PILOT_RUNBOOK.md:191-201`.
- **Severidade:** P0 — assédio em canal privado gera registro sem operador,
  resolução ou feedback.
- **Veredicto:** MODIFY.
- **Balde:** A — independentemente da arquitetura escolhida, uma denúncia
  oferecida ao usuário precisa chegar a uma operação real.
- **Dimensões:** necessidade, happy path, operação, valor, abuso.

### F163 · A fila de DM aceita auto-denúncia e spam repetido — P1 · MODIFY · Balde A

- **Promessa:** C10 apresenta auto-denúncia e duplicata aberta como controles
  anti-abuso do domínio.
- **Comportamento:** esses controles existem apenas em `reports`. Em
  `dm_reports`, a policy verifica participação na conversa, mas não exige que a
  mensagem seja da outra pessoa; a tabela tem apenas índices não únicos. A UI
  esconde “Denunciar” em mensagem própria, porém uma chamada direta à Data API
  pode denunciar mensagem própria e repetir a mesma mensagem sem limite.
- **Evidência:** `apps/web/app/components/bivaque/chat-thread.tsx:255-286`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:64-76,297-322`;
  `supabase/migrations/20260802001600_reports.sql:47-50,58-94`.
- **Severidade:** P1 — o atacante pode inflar uma fila já invisível e fabricar
  sinal de abuso sem sair de uma conversa da qual participa.
- **Veredicto:** MODIFY.
- **Balde:** A — os controles declarados para o domínio precisam cobrir a
  superfície de DM.
- **Dimensões:** permissões, abuso, operação.

### F164 · A triagem não mostra o caso que o operador precisa decidir — P1 · MODIFY · Balde A

- **Promessa:** o runbook exige idade destacada, detalhe clicável, conteúdo,
  autor e classificação entre conteúdo proibido e falsa denúncia; o MAP §9 pede
  filtros por tipo, idade e repetição.
- **Comportamento:** cada card mostra apenas tipo, data absoluta, motivo e UUID
  do alvo. Não mostra conteúdo alvo, autor, denunciante, contexto de grupo/DM,
  quantidade de denúncias, estado do alvo, indicador de mais de 48h, filtro ou
  link de detalhe. Sob pressão, o operador precisa sair para SQL antes de
  decidir, exatamente o workaround que o painel prometia remover.
- **Evidência:** `apps/web/app/(admin)/reports/page.tsx:148-155,170-211`;
  `docs/PILOT_RUNBOOK.md:195-209`; `docs/journeys/MAP.md:565-568`.
- **Severidade:** P1 — degrada a operação visivelmente e desloca a decisão
  sensível para consulta manual.
- **Veredicto:** MODIFY.
- **Balde:** A — é divergência direta entre checklist operacional e painel.
- **Dimensões:** modelo mental, operação, abuso, sad paths.

### F165 · “Ocultar” comentário não o remove da leitura — P0 · MODIFY · Balde A

- **Promessa:** o painel promete “Ocultar conteúdo” e o runbook afirma que a UI
  some para todos após `is_deleted=true`.
- **Comportamento:** a ação grava `comments.is_deleted=true`, mas a policy
  vigente de SELECT verifica apenas acesso ao post e a UI busca todos os
  comentários sem filtrar `is_deleted`. O contador dos feeds exclui apagados,
  porém abrir os comentários continua renderizando o texto ocultado.
- **Evidência:** `apps/web/app/(admin)/reports/page.tsx:78-83,187-195`;
  `apps/web/app/components/bivaque/feed-post.tsx:164-170,491-500`;
  `supabase/migrations/20260805214709_community_scope.sql:286-292`;
  `docs/PILOT_RUNBOOK.md:197-201`.
- **Severidade:** P0 — conteúdo potencialmente abusivo ou com dados privados
  permanece exposto depois de uma ação que afirma removê-lo para todos.
- **Veredicto:** MODIFY.
- **Balde:** A — o filtro de soft delete é uma garantia inequívoca da ação.
- **Dimensões:** coerência, privacidade, abuso, valor.

### F166 · “Ocultar” grupo mantém o grupo descobrível — P1 · MODIFY · Balde A

- **Promessa:** a mesma ação de ocultação cobre `group` e o runbook afirma que o
  alvo desaparece da UI.
- **Comportamento:** o detalhe do grupo filtra `is_deleted=false`, mas a policy
  de descoberta e as consultas das listas não filtram o campo. O grupo ocultado
  continua aparecendo na página de grupos, nas recomendações e no rail do feed;
  apenas o detalhe redireciona.
- **Evidência:** `apps/web/app/(admin)/reports/page.tsx:85-90`;
  `apps/web/app/(shell)/groups/page.tsx:166-170`;
  `apps/web/app/(shell)/groups/[id]/page.tsx:115-125`;
  `apps/web/app/components/bivaque/feed-right-rail.tsx:52-60`;
  `supabase/migrations/20260805214709_community_scope.sql:331-343`.
- **Severidade:** P1 — a ação de moderação produz um objeto residual e
  publicamente descobrível.
- **Veredicto:** MODIFY.
- **Balde:** A — a semântica já escolhida é ocultar, não manter metadata ativa.
- **Dimensões:** coerência, happy path, valor.

### F167 · Alvo ausente pode ser registrado como “conteúdo oculto” — P1 · MODIFY · Balde A

- **Promessa:** ocultar significa alterar o alvo e, só depois, resolver a
  denúncia com trilha correta.
- **Comportamento:** autores podem apagar posts, comentários e grupos; `reports`
  não tem FK para o alvo. No painel, UPDATE com zero linhas não é erro e
  `softDeleteTarget` considera sucesso apenas pela ausência de erro; em seguida,
  `markResolved` ignora o resultado do UPDATE do report. Um alvo apagado antes da
  análise pode, portanto, gerar a nota “content hidden” sem ter sido encontrado,
  e falhas parciais podem deixar alvo e status divergentes. Não há transação.
- **Evidência:** `supabase/migrations/20260802000900_community_feed.sql:184-189,230-235`;
  `supabase/migrations/20260802001000_groups_moderation.sql:149-154`;
  `supabase/migrations/20260802001600_reports.sql:25-36`;
  `apps/web/app/(admin)/reports/page.tsx:55-67,69-93,106-113`.
- **Severidade:** P1 — a trilha pode afirmar uma ação que não ocorreu e não
  permite ao operador distinguir “já apagado” de “ocultado agora”.
- **Veredicto:** MODIFY.
- **Balde:** A — sucesso precisa depender de alvo afetado e resolução persistida
  como uma única operação coerente.
- **Dimensões:** sad paths, operação, coerência.

### F168 · “Resolver” permite trilha sem nota de decisão — P1 · MODIFY · Balde A

- **Promessa:** C10 chama a resolução de auditável e o runbook exige
  `operator_note`, `resolved_by` e `resolved_at`.
- **Comportamento:** `resolved_by` e `resolved_at` são gravados, mas a coluna
  aceita `NULL`; o formulário chama a nota de opcional e a Server Action resolve
  com `operator_note=null`. O estado final registra quem/quando, mas pode não
  registrar por quê.
- **Evidência:** `supabase/migrations/20260802001600_reports.sql:31-35`;
  `apps/web/app/(admin)/reports/page.tsx:126-145,197-210`;
  `docs/PILOT_RUNBOOK.md:195-201`.
- **Severidade:** P1 — decisões de moderação e falsa denúncia podem ficar sem
  justificativa operacional.
- **Veredicto:** MODIFY.
- **Balde:** A — o próprio runbook já definiu a nota como parte da resolução.
- **Dimensões:** operação, coerência, abuso.

### F169 · A trilha guarda só o estado final, não múltiplas ações — P2 · UNPROVEN · Balde B

- **Promessa:** `reports` é append-only e o MAP considera isso suficiente para
  o piloto, deixando histórico multi-ação como YAGNI condicional.
- **Comportamento:** cada denúncia tem um único `operator_note`, um resolvedor e
  um timestamp; a UI oferece somente uma ação final por item aberto. Não há
  histórico de tentativa, reabertura, reversão, segunda revisão ou troca de
  operador. Logs de erro não formam uma trilha de produto.
- **Evidência:** `supabase/migrations/20260802001600_reports.sql:25-35,144-149`;
  `apps/web/app/(admin)/reports/page.tsx:55-67,116-145`;
  `docs/journeys/MAP.md:262-263,746-751`.
- **Severidade:** P2 — a limitação surge em reanálise, recurso ou incidente, não
  no primeiro tratamento simples.
- **Veredicto:** UNPROVEN — a necessidade de múltiplas ações ainda não foi
  demonstrada no piloto.
- **Balde:** B — manter o YAGNI ou criar log é decisão de governança e custo do
  dono do produto.
- **Dimensões:** operação, valor.

### F170 · O feedback prometido não é emitido pelo painel real — P1 · MODIFY · Balde A

- **Promessa:** após enviar, o componente diz que “o resultado chega como
  notificação no app”; o runbook afirma que resolver emite `report_resolved`.
- **Comportamento:** a notificação existe apenas no branch `resolve` do route
  handler. A UI do operador não chama essa rota: usa Server Actions inline que
  atualizam `reports` sem inserir notificação. `hide` também resolve sem
  notificar. A UI de notificações sabe renderizar `report_resolved`, mas o fluxo
  operacional exposto não o produz. Para DM, nem há resolução. O denunciante
  também não tem página de acompanhamento dos próprios reports.
- **Evidência:** `apps/web/app/components/bivaque/report-button.tsx:62-66`;
  `apps/web/app/(admin)/reports/page.tsx:55-67,95-145,187-211`;
  `apps/web/app/api/admin/reports/[id]/route.ts:71-119,122-182`;
  `apps/web/app/(shell)/notifications/page.tsx:81-100,121-144`;
  `docs/PILOT_RUNBOOK.md:191-201`.
- **Severidade:** P1 — o produto promete fechamento explícito e volta ao
  silêncio depois da triagem.
- **Veredicto:** MODIFY.
- **Balde:** A — o contrato de feedback já foi decidido e documentado; falta
  executá-lo no caminho usado.
- **Dimensões:** coerência, acompanhamento, valor, operação.

### F171 · Não existe recurso nem canal de suporte para moderação — P1 · UNPROVEN · Balde B

- **Promessa:** uma decisão de moderação deveria ter saída para erro, falsa
  denúncia ou contestação pelo acusado/denunciante.
- **Comportamento:** `report_status` tem apenas `open` e `resolved`; a
  notificação de resolução não navega para detalhe e não oferece ação. O único
  canal externo do piloto é deliberadamente reservado aos fluxos de quem está
  fora da plataforma; usuários internos deveriam ser atendidos pela própria
  plataforma, que não possui recurso, reconsideração ou página de suporte para
  moderação.
- **Evidência:** `supabase/migrations/20260802001600_reports.sql:18-21`;
  `apps/web/app/(shell)/notifications/page.tsx:95-100,121-144`;
  `apps/web/lib/support.ts:1-11`;
  `apps/web/app/(admin)/reports/page.tsx:186-211`.
- **Severidade:** P1 — uma decisão errada não tem sad path observável, inclusive
  quando o próprio operador ou uma falsa denúncia estão envolvidos.
- **Veredicto:** UNPROVEN — é necessário definir quem pode recorrer, prazo,
  efeito e quem julga; o Red Team não toma essa decisão.
- **Balde:** B — desenho de devido processo é decisão do dono do produto.
- **Dimensões:** sad paths, modelo mental, operação, valor.

### F172 · Um membro pode fabricar e pulverizar denúncias por UUID — P1 · MODIFY · Balde A

- **Promessa:** o índice parcial impede spam e o trigger impede denúncias
  falsas contra o próprio conteúdo.
- **Comportamento:** `reports.target_id` não tem FK e a policy de INSERT exige
  apenas identidade do reporter e alguma membership de localidade; não valida
  existência, localidade, escopo ou acesso ao alvo. O trigger deixa passar alvo
  inexistente porque o owner fica `NULL`, e `message` cai sempre no branch sem
  owner. A unicidade limita somente reporter × mesmo UUID × report aberto; UUIDs
  diferentes permitem volume ilimitado e poluem a fila.
- **Evidência:** `supabase/migrations/20260802001600_reports.sql:25-30,47-50,60-88,130-142`;
  `apps/web/app/(admin)/reports/page.tsx:150-155,170-184`.
- **Severidade:** P1 — a fila pode ser degradada por alvos falsos ou fora do
  contexto que o denunciante viu.
- **Veredicto:** MODIFY.
- **Balde:** A — uma denúncia precisa referenciar um alvo existente e acessível;
  a escolha técnica do vínculo pode variar, a garantia não.
- **Dimensões:** permissões, abuso, operação.

### F173 · O motivo da denúncia permite persistir PII proibida — P0 · MODIFY · Balde A

- **Promessa:** o contrato global C13 diz que CPF, endereço, patente,
  organização militar e documentos nunca são persistidos; o runbook classifica
  exposição de dados privados como incidente.
- **Comportamento:** `reports.reason` valida apenas 1–1000 caracteres e
  `dm_reports.reason`, 10–500. Ambos os formulários aceitam texto livre sem o
  filtro de PII aplicado ao conteúdo de DM, e o painel renderiza o motivo. **É
  inferência de exploração, sustentada pelos constraints:** um denunciante pode
  copiar CPF/endereço do conteúdo para o motivo e criar uma segunda cópia
  persistente do dado proibido, mesmo que o alvo seja ocultado ou apagado.
- **Evidência:** `supabase/migrations/20260802001600_reports.sql:25-35`;
  `supabase/migrations/20260802001500_contextual_dm_abuse_controls.sql:36-44,64-70`;
  `apps/web/app/components/bivaque/report-button.tsx:23-37,90-100`;
  `apps/web/app/components/bivaque/chat-thread.tsx:163-172,290-307`;
  `apps/web/app/(admin)/reports/page.tsx:183-184`.
- **Severidade:** P0 — cria risco direto de privacidade e contradiz uma regra
  absoluta de persistência antes do piloto com membros não técnicos.
- **Veredicto:** MODIFY.
- **Balde:** A — campos de denúncia não podem virar armazenamento alternativo
  de PII proibida.
- **Dimensões:** privacidade, abuso, coerência.

### F174 · Denúncia contra operador não tem regra de conflito de interesse — P1 · UNPROVEN · Balde B

- **Promessa:** denúncias devem ser triadas de modo confiável inclusive quando o
  alvo pertence a um moderador/operador.
- **Comportamento:** não existe imunidade do operador, o que é correto, mas o
  painel não carrega autor do alvo nem indica que ele é operador e qualquer
  operador ativo pode ocultar/resolver qualquer item. **Inferência marcada:** um
  operador pode tratar denúncia contra o próprio conteúdo sem que a superfície
  revele o conflito ou exija segunda revisão.
- **Evidência:** `supabase/migrations/20260806040949_operator_authorization.sql:22-32,44-78`;
  `apps/web/app/(admin)/layout.tsx:29-46`;
  `apps/web/app/(admin)/reports/page.tsx:44-53,95-145,148-155`.
- **Severidade:** P1 — fragiliza governança e contestação, sobretudo com poucos
  operadores no piloto.
- **Veredicto:** UNPROVEN — recusa, dupla revisão ou transparência são opções;
  não há evidência para o Red Team escolher uma.
- **Balde:** B — política de conflito e autoridade é decisão do dono.
- **Dimensões:** permissões, abuso, operação.

---

## Placar

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F160, F161, F162, F163, F164, F165, F166, F167, F168, F170, F172, F173 (12) | Corrigir contratos já prometidos e fechar os caminhos operacionais. |
| B — decisão do dono | F169, F171, F174 (3) | Decidir governança de histórico, recurso e conflito de interesse. |

## Síntese do domínio

O fluxo de post não começa; grupo/comentário exibem uma ação que não consegue
inserir; DM grava em uma fila sem consumidor. A triagem existente autoriza o
operador, mas não entrega contexto para decidir, e “ocultar” funciona para post,
mas não retira comentário nem metadata de grupo de todas as superfícies. Os
campos de resolução registram resolvedor e data, porém nota é opcional e o
painel real não emite o feedback prometido. Recurso, histórico multi-ação e
conflito de interesse permanecem decisões explícitas do dono do produto.
