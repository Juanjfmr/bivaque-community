# Onda H — a operação

> Plano de execução. Escrito em **2026-08-20**. Marque `- [x]` conforme avança e **commite por
> task**.
>
> Leia [`README.md`](README.md) deste diretório inteiro antes de abrir qualquer task.

## Por que esta é a onda que não deveria escorregar

O `BIVAQUE.md` §10.2 diz o que custa cada atraso, e as duas ondas que sobram custam coisas
diferentes: *"Sem G, falta a vitrine (…). Sem H, abre-se para centenas de militares
identificáveis com moderação parcial: denúncia de DM e de indicação não chegam ao painel, e
não existe suspensão. **H é a que não deveria escorregar**, porque o custo não é feature, é o
primeiro incidente."*

Some a isso o §5.1 — **um tiro por vila**: o link vai para centenas de pessoas de uma vez, e
os administradores das outras vilas se conhecem. Um incidente sem ferramenta para agir não é
um bug; é a vila inteira, e a notícia chega nas outras em vinte e quatro horas.

## O que esta onda entrega

Denúncia unificada em todos os alvos; ocultação que funciona por tipo; ação sobre **pessoa**,
não só sobre conteúdo; retorno ao denunciante; admissões que decidem; e medição de produto.

## O que ela não entrega

- **Não constrói moderação por voluntário sem regra escrita.** §2, "o que não copiar do
  Nextdoor". As camadas da D25 são operador, dono de comunidade e moderador delegado — os três
  com ato registrado e autor.
- **Não cria IA de moderação.** A D31 reabriu a IA num escopo estreito e explícito: curadoria
  do Guia de Chegada, e só. *"a IA sai do adiamento num escopo estreito, **sem tocar feed,
  moderação ou DM**"*.
- **Não persiste dado que o produto se recusa a guardar.** O motivo da denúncia é texto que um
  terceiro escreve sobre outra pessoa — é o campo mais provável de carregar CPF e endereço no
  schema inteiro. A Task 2 existe por isso.

---

## Portão humano — o que trava, e por quê

A [`RISK_MATRIX.md`](../../decisions/RISK_MATRIX.md) eleva automaticamente `notificação`,
`retenção`, `privacidade`, `visibilidade`, `acesso` e `exclusão de escopo` — todos aqui. E
**suspensão é R3 por três motivos somados**: mexe em RLS de escrita, é decisão irreversível do
ponto de vista de quem a sofre no momento em que a sofre, e é ato que precisa de base
contratual.

**Um ADR, obrigatório antes da Task 5, e ele foi aprovado pelo dono em 2026-08-20:**
[`ADR-20260820-suspensao-de-conta`](../../decisions/ADR-20260820-suspensao-de-conta.md) está
`accepted`, com `critic_verdict: PASS`. A D38 decidia só o *mecanismo* — flag em `profiles`
mais helper na RLS; o ADR decide o *devido processo*.

**A aprovação do ADR não é suficiente para a Task 5.** A decisão 9 dele exige a assinatura do
código de conduta, e ela continua pendente. As Tasks 1 a 4 e 6 correm sem isso.

**As decisões que a Task 5 executa**, para você reconhecê-las no código:

1. **suspende o operador, e só ele** — o dono da comunidade remove da vila, poder que já tem
   (D14); a conta atravessa localidades e o poder dele para na vila;
2. **prazos fechados**: 7 dias, 30 dias, ou indeterminado — este último só para conduta que o
   código de conduta nomeie como grave;
3. **tira escrita, não leitura** — o suspenso continua vendo a vila;
4. **três escritas sobrevivem**: denunciar, bloquear, e excluir a própria conta;
5. **o conteúdo já publicado permanece** — ocultar é outro ato (D24);
6. **o suspenso vê quatro coisas**, e o texto livre do denunciante não é nenhuma delas;
7. **um recurso por suspensão, resposta em 48h**, julgada pelo operador — não há segunda
   instância, e a tela diz isso;
8. **toda suspensão e todo levantamento viram linha em `moderation_actions`**, retenção de 2
   anos (§4.4);
9. **base contratual é o código de conduta assinado** — sem ele a Task 5 não sobe;
10. e a revisão acrescentou a **quarta** escrita que sobrevive à suspensão: o próprio
    recurso, que precisa de tabela e de fila — ver a Task 5, Step 4.

Se você discordar de alguma delas durante a execução, **pare e reporte** — a discordância vai
para o ADR, não para o código.

**Bloqueios humanos que nenhum agente resolve:**

1. **A assinatura do código de conduta.** A D12 é explícita: consentimento e código de conduta
   com aceite versionado são **a base contratual da suspensão**. O §4.4 e o §11.11 registram
   que [`legal/CODIGO_DE_CONDUTA.md`](../../legal/CODIGO_DE_CONDUTA.md) espera a assinatura do
   dono — *"porque é ele que justifica suspender alguém"*. **Suspender sem esse texto assinado
   é suspender sem regra escrita**, que é exatamente o erro do Nextdoor que o §2 manda não
   copiar.
2. **A revisão jurídica de [`legal/PRIVACIDADE.md`](../../legal/PRIVACIDADE.md)** com as três
   lacunas que só o dono fecha: controlador, canal oficial e encarregado. Trava a Task 7
   (PostHog manda dado comportamental para terceiro e a D40 exige base legal declarada) e o
   prazo de dois anos de registro de moderação que a Task 5 vai implementar.
3. **Conta PostHog** e a decisão de região do dado.

As Tasks 1 a 4 e 6 **não** dependem de nada disso e podem correr enquanto a espera acontece.

---

## Precedência: o que vem antes, e o que não vem

```
D1 → D2 → H          (o caminho do §10.1)
```

- **A D2 já entregou os dois consoles** — `app/(admin)/` e `app/(owner)/` existem, com o gate
  de operador no layout. Esta onda **mora dentro deles**; não crie shell novo.
- **A onda G não é pré-requisito.** As duas correm em ramos paralelos do §10.1. Onde as duas se
  tocam — o alvo de denúncia "ficha de prestador" — a regra é: **quem criar a tabela cria o
  alvo**. Se a G já aterrissou quando você chegar aqui, o valor `provider_profile` já existe no
  enum e você acrescenta o ramo dele no RPC da Task 3. Se não, o `else` do RPC levanta
  `unknown target type` e está correto assim.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §4.4 (governança LGPD e os três prazos), §7.7 (a linha
   do PostHog), §12 (as oito regras), e as decisões **D11, D12, D21, D24, D25, D38, D40**.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) §9 inteiro — as oito linhas de moderação
   — e a linha "Métrica de produto" do §11.
3. [`docs/red-team/lote-2-moderacao.md`](../../red-team/lote-2-moderacao.md), achados **F160 a
   F165**. Três deles continuam abertos e este plano os cita por número.
4. [`docs/PILOT_RUNBOOK.md`](../../PILOT_RUNBOOK.md) §6 (resolução de denúncia) e §10 cenário B
   (dado privado exposto em post público). O runbook é o checklist que o painel precisa
   conseguir cumprir — se o painel não cumpre, um dos dois está errado.
5. As duas lições do E2E no `README.md`.

---

## O estado real hoje, conferido em 2026-08-20

Leia esta tabela antes da Task 1. Ela é o motivo de a onda existir e algumas linhas contrariam
o que o `PRODUCT_STATUS.md` sugere.

| # | O que está quebrado | Evidência |
|---|---|---|
| 1 | **O post não tem "Denunciar".** O menu oferece "Ocultar publicação" e "Compartilhar" e nada mais. O comentário tem; o post, que é o alvo central, não | `feed-post.tsx:119-126` versus `:60` — F160, ainda aberto |
| 2 | **A denúncia de DM cai numa fila sem consumidor.** A UI grava em `dm_reports`, tabela separada, sem `status`, que **nenhum painel lê** — enquanto `report_target_type` já tem o valor `'message'` desde o dia um | `chat-thread.tsx:165-181`; `20260802001500:64-76`; `20260802001600:11-16` — F162 |
| 3 | **Indicação não é alvo de denúncia.** `recommendation_requests` e `recommendation_replies` não estão no enum, e a onda F acabou de transformar a resposta de indicação no ciclo central do produto | `20260802001600:11-16` |
| 4 | **Duas superfícies de resolução, com comportamentos diferentes.** O painel que o operador usa é uma Server Action que **nunca notifica o denunciante**; a rota de API notifica, mas **só no `resolve`** — no `hide` não notifica ninguém | `(admin)/reports/page.tsx:116-146` versus `api/admin/reports/[id]/route.ts:102-117` |
| 5 | **A triagem não mostra o caso.** O card exibe tipo, data absoluta, motivo e um UUID. O operador não vê o conteúdo denunciado nem quem o escreveu, e o runbook §6 pede as duas coisas | `(admin)/reports/page.tsx:170-211` — F164 |
| 6 | **Não existe ação sobre pessoa.** `grep -ri "suspend" supabase/ apps/web/` só encontra `Suspense` do React e `PORTAL_SUSPENSION_MS` | — |
| 7 | **O motivo da denúncia é texto livre de 1 a 1000 caracteres**, sem qualquer tratamento | `20260802001600:29` |
| 8 | **Admissões só observa.** A página lista a fila e não tem um único botão | `(admin)/admissions/page.tsx:24-80` |
| 9 | **Não há medição de produto.** Nenhuma dependência de PostHog em `apps/web/package.json` | — |

---

## Task 1: um modelo de denúncia, todos os alvos

D24 e o `PRODUCT_STATUS.md` §9: *"um modelo, todos os alvos"*. Hoje são dois modelos e alvos
faltando.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_unified_reports.sql`
  (`npx pnpm@11.18.0 exec supabase migration new unified_reports`)
- Criar: `supabase/tests/reports-unified-targets.sql`
- Modificar: `apps/web/app/components/bivaque/feed-post.tsx:119-126`
- Modificar: `apps/web/app/components/bivaque/chat-thread.tsx:165-181`
- Modificar: `apps/web/app/components/bivaque/report-button.tsx:10`
- Modificar: `apps/web/app/(shell)/recommendations/` (a affordance nos dois alvos)

**Interfaces que as tasks seguintes consomem:**
- `public.report_target_type` ganha `'recommendation_request'` e `'recommendation_reply'`
- `public.reports` passa a ser a **única** tabela de denúncia

- [ ] **Step 1: a migration — enum, migração das linhas, e a tabela duplicada sai**

```sql
alter type public.report_target_type add value if not exists 'recommendation_request';
alter type public.report_target_type add value if not exists 'recommendation_reply';
```

  > `alter type … add value` não pode rodar na mesma transação que **usa** o valor novo. Esta
  > migration precisa de dois arquivos, ou de `commit` entre as partes. O
  > `20260809184316_notify_report_resolved.sql` documenta a mesma armadilha — leia o comentário
  > dele antes de escrever o seu.

  Na segunda parte, a migração das linhas de `dm_reports` para `reports`, e só então o `drop`:

```sql
-- F162: dm_reports é uma fila sem consumidor. As linhas viram denúncias de
-- verdade, com status, e a tabela duplicada sai. O 'message' já existe no enum
-- desde 20260802001600 — nunca foi usado.
insert into public.reports (reporter_user_id, target_type, target_id, reason, created_at)
select r.reporter_user_id, 'message', r.message_id, r.reason, r.created_at
from public.dm_reports r
on conflict do nothing;

-- Destrutivo e deliberado: as linhas acima já estão copiadas nesta mesma
-- transação. Se o insert falhar, o drop não acontece.
drop table public.dm_reports;
```

  > **O `drop table` é destrutivo, e a `RISK_MATRIX.md` classifica migration destrutiva como
  > R3 — por isso ele exigia autorização explícita, e ela foi dada.**
  > **Autorizado pelo dono (Juan) em 2026-08-20, em sessão:** *"autorizo apagar a linha
  > dm_reports"*. Execute o `drop` como está escrito acima, **com o `insert … select` de cópia
  > na mesma transação** — se a cópia falhar, o `drop` não acontece.
  >
  > A alternativa que ficou para trás, registrada porque a escolha foi real: manter a tabela e
  > cortar o acesso com `revoke insert on public.dm_reports from authenticated`, deixando as
  > linhas como arquivo morto.

  E o gatilho de auto-denúncia (`private.reports_block_self`, `20260802001600:60-88`) ganha os
  ramos novos — hoje o `case` cobre post, comment e group, e cai no `else v_owner_id := null`
  para todo o resto, o que significa que **auto-denúncia de mensagem e de indicação passa**
  (F163). Acrescente:

```sql
    when 'message' then
      select sender_id into v_owner_id
      from public.dm_messages where id = new.target_id;
    when 'recommendation_request' then
      select author_id into v_owner_id
      from public.recommendation_requests where id = new.target_id;
    when 'recommendation_reply' then
      select author_id into v_owner_id
      from public.recommendation_replies where id = new.target_id;
```

  > **A policy de insert de `reports` exige `locality_memberships`** (`20260802001600:126-136`).
  > Isso é correto para membro e para dependente. Se a **onda G** já tiver aterrissado, um
  > prestador **não consegue denunciar** um membro — ele não tem membership por construção
  > (D37). A decisão 5 do
  > [`ADR-20260820-conta-de-prestador`](../../decisions/ADR-20260820-conta-de-prestador.md)
  > resolve isso: o prestador pode denunciar **mensagem, e só mensagem**. Se a G já aterrissou,
  > acrescente à policy `or (public.is_provider_account((select auth.uid())) and target_type =
  > 'message')`, com teste positivo (denuncia mensagem) e negativo (não denuncia post). Se a G
  > ainda não rodou, a Task 3 dela faz isso ao criar a conta.

- [ ] **Step 2: o post ganha "Denunciar" (F160)**

  Em `feed-post.tsx`, o `Dropdown.Menu` das linhas 119-126 tem dois itens. Falta o terceiro. O
  componente `ReportButton` já existe e já sabe o que fazer; o que falta é o alvo `post` estar
  alcançável. Use o mesmo caminho do comentário (`:60`), adaptado ao menu.

  Amplie o tipo em `report-button.tsx:10` para incluir os dois alvos novos.

- [ ] **Step 3: a denúncia de DM passa a ter destino (F162)**

  `chat-thread.tsx:165-181` insere em `dm_reports`. Troque por `reports` com
  `target_type: "message"`. Ganha de graça o que a tabela nova tem e a antiga não tinha:
  `status`, bloqueio de auto-denúncia, bloqueio de duplicata (o índice parcial
  `reports_one_open_per_reporter_target_idx`) e um painel que lê.

  O mínimo de 10 caracteres do `dm_reports` some — `reports` aceita de 1 a 1000. Mantenha a
  validação de 10 no cliente se ela ajuda o operador; **não** recrie o `check` no banco.

- [ ] **Step 4: os testes — cada alvo com positivo e negativo**

  Amplie `supabase/tests/reports-denials.sql` e crie
  `supabase/tests/reports-unified-targets.sql`. Para **cada** um dos cinco alvos
  (post, comment, group, message, recommendation_request, recommendation_reply):

  - membro da localidade denuncia → **ok**
  - o **autor** do alvo denunciando o próprio conteúdo → **negado** pelo gatilho
  - a **segunda** denúncia aberta do mesmo autor no mesmo alvo → **negada** (23505)
  - não-membro → **negado** (42501)
  - o denunciante lê a própria denúncia; **não** lê a alheia

  E uma asserção de migração: depois da migration, `select count(*) from public.reports where
  target_type = 'message'` bate com o que havia em `dm_reports`. Escreva-a como
  `has_table`/`hasnt_table` mais a contagem sobre fixture.

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(moderation): um modelo de denuncia para todos os alvos; dm_reports sai"
```

---

## Task 2: o motivo não guarda o que o produto se recusa a guardar

`reports.reason` é o campo mais perigoso do schema: um terceiro escrevendo sobre outra pessoa,
com 1000 caracteres livres, guardado por dois anos (§4.4). É onde o CPF alheio e o endereço
alheio entram no banco. A D11 proíbe persistir os dois.

**A armadilha desta task tem nome e data.** A resposta óbvia — um `check` com regex de
vocabulário — é **exatamente o que a onda C desfez**. A D21 derrubou o filtro de vocabulário
porque ele *"proíbe palavras que a comunidade real usa, inclusive 'patente' e 'OM'"*, e a
remedição escolhida foi **aviso de PII na UI**, não rejeição. Um `check` aqui bloquearia o
denunciante que escreve "ele publicou o CPF dele no grupo" — a frase mais útil que a fila pode
receber.

**A saída é a terceira:** avisar na UI, e **redigir no servidor** apenas o que é
inequivocamente identificador — sequência com forma de CPF. Nunca rejeitar, nunca proibir
palavra.

**Arquivos:**
- Modificar: `packages/domain/src/pii-scrub.ts`
- Criar: `tests/unit/security/report-reason-scrub.test.ts`
- Modificar: `apps/web/app/components/bivaque/report-button.tsx`
- Criar: `supabase/migrations/<ts>_report_reason_guard.sql`

- [ ] **Step 1: reaproveitar o scrub que já existe**

  `packages/domain/src/pii-scrub.ts` já é o filtro que roda antes de qualquer envio ao Sentry, e
  já tem teste em `tests/unit/security/pii-scrub.test.ts`. Exporte dele uma função de uso
  explícito para este caso:

```ts
// A denúncia é o único texto do produto escrito por um terceiro SOBRE outra
// pessoa. O CPF alheio não pode entrar no banco (D11), mas a frase precisa
// continuar legível para o operador — por isso redige, não rejeita, e por isso
// NÃO existe filtro de vocabulário aqui (D21 derrubou o anterior por proibir
// "patente" e "OM", que é como a comunidade real fala).
export function scrubReportReason(reason: string): string {
  return reason
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento removido]")
    .replace(/\b\d{11}\b/g, "[documento removido]")
}
```

- [ ] **Step 2: o aviso na UI, no molde da onda C**

  Em `report-button.tsx`, acima do `TextArea`: uma linha dizendo que documento e endereço não
  devem ser digitados, que o motivo fica registrado, e por quanto tempo. É o mesmo padrão de
  aviso que a onda C entregou para o compositor.

  Aplique `scrubReportReason` **antes** do `insert`.

- [ ] **Step 3: o cinto de segurança no banco**

  O cliente pode ser contornado — o `insert` é direto do browser via PostgREST. Um trigger
  `before insert or update` em `reports` aplica a mesma redação server-side. Um trigger, não um
  `check`: ele **corrige**, não recusa.

- [ ] **Step 4: os testes**

  `tests/unit/security/report-reason-scrub.test.ts`: CPF formatado, CPF sem formatação, número
  de 11 dígitos que não é CPF (é redigido mesmo assim — falso positivo aceito de propósito, e o
  teste registra a escolha), e — **o teste que protege a D21** — a frase
  `"ele falou da patente e da OM dele"` sai **intacta**.

  pgTAP: `insert` com CPF no motivo, e o `select` seguinte não contém os dígitos.

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(moderation): motivo de denuncia redige documento sem proibir vocabulario"
```

---

## Task 3: resolver é um ato só — ocultar, registrar e avisar

Hoje resolver uma denúncia acontece em dois lugares que fazem coisas diferentes (linha 4 da
tabela de estado). O resultado prático é o pior possível: **o caminho que o operador usa de
verdade — o formulário do painel — nunca avisa o denunciante**, e o `PRODUCT_STATUS.md`
registra "Retorno ao denunciante: não existe" sem registrar que existe metade dele na rota de
API que ninguém chama.

A saída não é notificar nos dois lugares. É **um RPC**, transacional, que os dois chamam.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_resolve_report_rpc.sql`
- Criar: `supabase/tests/report-resolution-unified.sql`
- Modificar: `apps/web/app/(admin)/reports/page.tsx:55-146`
- Modificar: `apps/web/app/api/admin/reports/[id]/route.ts:70-182`

**Interfaces:**
- `public.resolve_report(p_report_id uuid, p_operator_user_id uuid, p_action text, p_note text) returns void`
  — `p_action` ∈ `('hide', 'dismiss')`; `service_role` apenas

- [ ] **Step 1: os alvos que ainda não sabem ser ocultados**

  `posts`, `comments` e `groups` têm `is_deleted`. `recommendation_requests`,
  `recommendation_replies` e `dm_messages` **não têm**. Acrescente a coluna nas três, com o
  mesmo par de gatilhos que o `20260802001600` já usa
  (`private.block_authenticated_soft_delete`), e o grant de
  `update (is_deleted)` para `service_role`.

  **E corrija o caminho de leitura junto** — este é o F165, e ele reapareceu em 2026-08-20 numa
  variante nova (a rota falhava com "permission denied" porque `service_role` tinha `UPDATE` e
  não tinha `SELECT`). Ocultar que não some da tela não é ocultar. Para cada um dos três alvos
  novos, encontre **todas** as funções e policies de leitura e acrescente `is_deleted = false`:

```bash
grep -rn "recommendation_requests\|recommendation_replies\|dm_messages" supabase/migrations/*.sql | grep -i "create function\|create policy"
```

- [ ] **Step 2: o RPC**

```sql
create function public.resolve_report(
  p_report_id uuid,
  p_operator_user_id uuid,
  p_action text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
begin
  if p_action not in ('hide', 'dismiss') then
    raise exception 'action must be hide or dismiss' using errcode = '22023';
  end if;

  -- Mesmo contrato de is_current_user_operator: quem chama roda como
  -- service_role, auth.uid() é NULL aqui, e o operador vem explícito.
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators resolve reports' using errcode = '42501';
  end if;

  select * into v_report from public.reports
   where id = p_report_id and status = 'open' for update;

  if not found then
    raise exception 'report not found or already resolved' using errcode = '02000';
  end if;

  if p_action = 'hide' then
    case v_report.target_type
      when 'post' then
        update public.posts set is_deleted = true where id = v_report.target_id;
      when 'comment' then
        update public.comments set is_deleted = true where id = v_report.target_id;
      when 'group' then
        update public.groups set is_deleted = true where id = v_report.target_id;
      when 'message' then
        update public.dm_messages set is_deleted = true where id = v_report.target_id;
      when 'recommendation_request' then
        update public.recommendation_requests set is_deleted = true where id = v_report.target_id;
      when 'recommendation_reply' then
        update public.recommendation_replies set is_deleted = true where id = v_report.target_id;
      else
        raise exception 'unknown target type: %', v_report.target_type using errcode = '22023';
    end case;
  end if;

  update public.reports
     set status = 'resolved',
         operator_note = coalesce(p_note, p_action),
         resolved_by = p_operator_user_id,
         resolved_at = now()
   where id = p_report_id;

  -- O retorno ao denunciante (D24), nos DOIS caminhos. O runbook §6 exige
  -- "sem revelar a ação tomada": a notificação confirma a análise e nada mais.
  -- A tabela só carrega referência estrutural, então não há coluna por onde
  -- vazar o conteúdo, o autor ou o desfecho.
  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_report.reporter_user_id, p_operator_user_id, 'report_resolved',
    'resolved', 'report', p_report_id
  );
end;
$$;

revoke all on function public.resolve_report(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_report(uuid, uuid, text, text) to service_role;
```

  > Se a **onda G** já tiver aterrissado, acrescente o ramo
  > `when 'provider_profile' then update public.provider_profiles set is_deleted = true …`.
  > Se não, o `else` cobre — e cobrir levantando exceção é o comportamento certo.

- [ ] **Step 3: as duas superfícies passam a chamar o RPC**

  Em `(admin)/reports/page.tsx`, apague `markResolved` (55-67), `softDeleteTarget` (69-93) e a
  lógica duplicada dentro das duas Server Actions: elas passam a autenticar o operador e chamar
  `resolve_report`. Em `api/admin/reports/[id]/route.ts`, o mesmo — o corpo de 70 a 182 vira
  uma chamada.

  **O ganho não é estético.** Enquanto forem dois códigos, um deles vai divergir de novo, e a
  divergência atual custou o retorno ao denunciante inteiro.

- [ ] **Step 4: os testes**

  `supabase/tests/report-resolution-unified.sql`, ampliando
  `supabase/tests/reports-resolution.sql`:

  - `hide` em cada um dos seis alvos → o alvo some da leitura do membro comum
  - `hide` e `dismiss` → **os dois** criam a notificação para o denunciante
  - a notificação **não** carrega o `target_id` do conteúdo denunciado (só o `report_id`)
  - resolver duas vezes → o segundo levanta exceção e **não** cria segunda notificação
  - não-operador chamando `resolve_report` → **negado**
  - `authenticated` com `execute` → **negado** (o grant não existe)

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(moderation): resolver denuncia vira ato unico com ocultacao por tipo e retorno ao denunciante"
```

---

## Task 4: a triagem mostra o caso que o operador precisa decidir

F164, ainda aberto. O card mostra tipo, data absoluta, motivo e um UUID
(`(admin)/reports/page.tsx:170-211`). O runbook §6 pede idade destacada, conteúdo e detalhe
clicável. Um operador não decide sobre um UUID — ele abre outra aba, procura, desiste, e a
fila cresce.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_list_open_reports.sql`
- Modificar: `apps/web/app/(admin)/reports/page.tsx:148-216`
- Modificar: `apps/web/app/components/bivaque/report-button.tsx` (o prazo público)
- Criar: `supabase/tests/list-open-reports.sql`

**Interfaces:**
- `public.list_open_reports() returns table (id, target_type, target_id, reason, created_at,
  target_excerpt, target_author_name, open_reports_on_target, target_href)` — `service_role`

- [ ] **Step 1: o RPC que monta o caso**

  Uma função `security definer` que, por `target_type`, busca o trecho do conteúdo (240
  caracteres), o `display_name` do autor e quantas denúncias abertas o **mesmo alvo** já tem —
  esse último número é o sinal mais barato de campanha coordenada e hoje não existe em lugar
  nenhum.

  Lembre da lição do PostgREST no `README.md`: **não tente resolver isso com embed no cliente**.
  `posts`, `comments` e `profiles` referenciam `auth.users` separadamente, sem FK entre si, e o
  embed falha em silêncio devolvendo tela vazia. É por isso que isto é um RPC com `join`
  explícito.

- [ ] **Step 2: o card que o runbook pede**

  Idade **relativa** com destaque quando passa do SLA — a constante já existe
  (`apps/web/lib/support.ts:12`, `SUPPORT_SLA_HOURS = 48`) e a página de admissões já a usa
  desse jeito (`(admin)/admissions/page.tsx:44-72`); copie o padrão. Trecho do conteúdo, nome
  do autor, contador de denúncias no mesmo alvo, e link para o alvo.

  Mantenha o UUID visível em texto pequeno — o runbook §12 usa os comandos com id.

- [ ] **Step 3: o prazo público (D25)**

  A D25 é "moderação em três camadas, **com prazo público**", copiado do Nextdoor. Hoje o
  denunciante lê *"A analise acontece e o resultado chega como notificacao no app"*
  (`report-button.tsx:65-66`), sem prazo. Troque por uma frase com o número real —
  `SUPPORT_SLA_HOURS` — e repita o prazo no código de conduta. Prometer prazo que o operador
  não cumpre é pior que não prometer: use o mesmo número em ambos e não invente um segundo.

- [ ] **Step 4: os testes**

  pgTAP: o RPC devolve o trecho certo por tipo de alvo; **não** devolve alvo já oculto; o
  contador de denúncias no alvo bate; `authenticated` não tem `execute`.

  Teste de unidade para o cálculo de "passou do SLA", com data fixa.

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(moderation): triagem mostra conteudo, autor, idade e reincidencia do alvo"
```

---

## Task 5: ação sobre pessoa — a suspensão

**Não comece sem o ADR e sem o código de conduta assinado.** Ver o portão humano.

D24: *"Operador age sobre conteúdo **e** pessoa, com motivo e retorno ao denunciante"*, porque
*"ação sobre conteúdo não resolve quando o problema é a pessoa"*. D38 decide o mecanismo:
**flag em `profiles` mais helper na RLS**, porque é reversível, auditável e permite suspensão
temporária — e a decisão termina com a frase que define esta task inteira: *"**Entra em toda
policy de escrita na mesma migration**"*.

### A armadilha desta task tem precedente exato neste repositório

A onda T fez o mesmo movimento com `private.is_active_locality_member` e **esqueceu uma
tabela**. O comentário de `20260820045749_locality_switcher_write_guard.sql:1-7` conta:
*"a T3 (20260820000000) only added the active-membership check to posts/comments/post_reactions,
never to events. A degraded (read_only) origin holder could still organize a new event there
through direct API access"*. A correção veio dias depois.

**Consequência prática: não enumere as policies pelo diff nem pelos arquivos de migration.**
Muitas foram substituídas várias vezes e o arquivo antigo mente. Enumere do banco:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE')
order by tablename, policyname;
```

**Arquivos:**
- Criar: `supabase/migrations/<ts>_account_suspension.sql`
- Criar: `supabase/tests/suspension-write-denials.sql`
- Criar: `supabase/tests/suspension-allowed.sql`
- Modificar: `apps/web/app/(admin)/reports/page.tsx` (a ação)
- Criar: `apps/web/app/(shell)/conta/suspensa/page.tsx`
- Modificar: `apps/web/middleware.ts`

**Interfaces:**
- `public.profiles` ganha `suspended_at`, `suspended_until`, `suspension_reason`, `suspended_by`
- `private.is_suspended(p_user_id uuid) returns boolean`
- `public.suspend_member(p_user_id, p_operator_user_id, p_reason, p_until) returns void`
- `public.lift_suspension(p_user_id, p_operator_user_id, p_note) returns void`
- `public.moderation_actions` — o registro de dois anos (§4.4)

- [ ] **Step 1: a flag, o helper e o registro**

```sql
alter table public.profiles
  add column suspended_at timestamptz,
  add column suspended_until timestamptz,
  add column suspension_reason text,
  add column suspended_by uuid references auth.users (id),
  add constraint profiles_suspension_coherent check (
    (suspended_at is null and suspension_reason is null and suspended_by is null)
    or (suspended_at is not null and suspension_reason is not null and suspended_by is not null)
  );

-- suspended_until NULL com suspended_at preenchido = suspensão sem prazo.
-- É estado válido e o ADR decide quando ele é permitido.
create function private.is_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = p_user_id
      and suspended_at is not null
      and (suspended_until is null or suspended_until > now())
  );
$$;

grant execute on function private.is_suspended(uuid) to authenticated;

-- O registro de moderação. §4.4 fixa a retenção em 2 anos; a purga é um job
-- pg_cron, no molde do TTL de verification_documents (20260820000007).
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete set null,
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('suspend', 'lift', 'hide', 'dismiss')),
  reason text not null,
  report_id uuid references public.reports (id) on delete set null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: o helper entra em toda policy de escrita — e a exceção deliberada**

  Para **cada** linha do `select` do `pg_policies` acima, refaça a policy acrescentando
  `and not private.is_suspended((select auth.uid()))`.

  **Três exceções, e elas são decisão, não esquecimento — escreva-as como comentário na
  migration:**

  1. **`reports` continua aceitando insert de suspenso.** Quem foi suspenso pode ser alvo de
     assédio também, e tirar dele o canal de denúncia transforma suspensão em desproteção.
  2. **`dm_blocks` continua aceitando insert e delete.** Bloquear é ato de autodefesa.
  3. **As policies de `delete` da própria conta** (`20260819010000_self_delete_policies.sql`)
     continuam. Suspensão não pode virar cárcere de dado: o §4.4 promete 30 dias para exclusão
     de conta e a LGPD dá o direito de eliminação independentemente de estar suspenso.

- [ ] **Step 3: os dois RPCs e o console**

  `suspend_member` exige operador (mesmo contrato de `resolve_report`), grava a flag **e** a
  linha em `moderation_actions` na mesma transação, e notifica o suspenso. `lift_suspension`
  desfaz e registra.

  No card de denúncia da Task 4, uma segunda ação ao lado de "Ocultar": "Suspender autor", com
  motivo obrigatório e prazo. **Motivo obrigatório** é a metade da D24 que a UI atual não tem.

- [ ] **Step 4: o que o suspenso vê — o ciclo fecha ou a linha não sai do `PRODUCT_STATUS`**

  Regra 3 da §12: entrada, ação, feedback, acompanhamento, sad path. Sem isso, a suspensão é
  capacidade no banco e a linha não fecha.

  - o middleware redireciona o suspenso para `/conta/suspensa` em qualquer rota de escrita;
  - a tela diz **que** está suspenso, **até quando**, e **qual regra** do código de conduta
    fundamenta — nunca o texto livre do motivo, que pode conter o que o denunciante escreveu;
  - leitura continua funcionando: a decisão 3 do ADR é explícita — tira escrita, não leitura.

  **O recurso precisa de onde morar, e é aqui que ele nasce.** A decisão 7 do ADR fixou um
  recurso por suspensão, resposta em 48 horas, julgado pelo operador. Sem tabela e sem fila,
  "a tela oferece o recurso" é um botão que escreve num lugar que ninguém lê — que é
  exatamente o defeito do `dm_reports` que a Task 1 desta onda existe para apagar. Não repita
  o erro na mesma onda que o corrige:

```sql
create type public.appeal_status as enum ('open', 'upheld', 'denied');

create table public.suspension_appeals (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  -- Amarra o recurso à suspensão que ele contesta: um por suspensão (decisão 7).
  moderation_action_id uuid not null unique
    references public.moderation_actions (id) on delete cascade,
  body text not null check (char_length(body) between 10 and 2000),
  status public.appeal_status not null default 'open',
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

alter table public.suspension_appeals enable row level security;
alter table public.suspension_appeals force row level security;

revoke all on table public.suspension_appeals from anon, authenticated;
grant select, insert on table public.suspension_appeals to authenticated;
grant select, update on table public.suspension_appeals to service_role;

-- O suspenso lê e escreve o próprio recurso. É a QUARTA escrita que sobrevive à
-- suspensão, e ela não estava na lista da decisão 4 do ADR por um motivo bobo:
-- a lista foi escrita antes de o recurso ter tabela. Sem esta policy, o guard
-- de suspensão da Step 2 bloquearia o único ato que o ADR promete ao suspenso.
create policy suspension_appeals_select_own
on public.suspension_appeals
for select
to authenticated
using (subject_user_id = (select auth.uid()));

create policy suspension_appeals_insert_own
on public.suspension_appeals
for insert
to authenticated
with check (
  subject_user_id = (select auth.uid())
  and private.is_suspended((select auth.uid()))
);
```

  A fila do recurso entra no console do operador, ao lado da fila de denúncias, com a mesma
  marca de SLA de 48h da Task 4 — e deferir o recurso chama `lift_suspension`, não um segundo
  caminho paralelo.

  > **Atenção à ordem da Step 2:** `suspension_appeals` é a **quarta** exceção ao guard de
  > suspensão, junto de `reports`, `dm_blocks` e o caminho de exclusão de conta. Se você
  > aplicar o guard antes de criar esta tabela, cuide para não incluí-la depois por
  > "coerência" — o teste positivo dela é obrigatório.

- [ ] **Step 5: os testes — este é o maior conjunto da onda**

  `suspension-write-denials.sql` e `suspension-allowed.sql`. Para **cada tabela** que a
  enumeração devolveu:

  - membro não suspenso escreve → **ok**
  - o mesmo membro, suspenso → **negado** (42501)
  - suspensão vencida (`suspended_until` no passado) → escreve de novo, **sem** intervenção
    manual
  - as três exceções do Step 2 → **continuam funcionando sob suspensão** (três asserções
    positivas explícitas; sem elas, um refactor futuro fecha as três "por coerência")
  - `authenticated` chamando `suspend_member` → **negado**
  - `moderation_actions` não é legível por membro comum

  Acrescente as asserções da suspensão a `supabase/tests/full-regression.sql` e às matrizes
  `authz-allowed-matrix.sql` / `authz-denied-matrix.sql` — é onde este repositório guarda a
  verdade sobre quem pode o quê.

- [ ] **Step 6: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(moderation): suspensao de conta com flag na RLS, registro auditavel e recurso"
```

---

## Task 6: admissões que decidem

Hoje o painel observa (`(admin)/admissions/page.tsx:24-80`: um `map` sem um único botão). O
`PRODUCT_STATUS.md` chama isso de "observação sem ação".

**Cuidado que vale mais que a task inteira:** aprovar admissão à mão é **conceder
elegibilidade que o Estado não atestou**. O §4.1 é a espinha do produto — cada fato é atestado
por quem consegue atestá-lo, e "é militar, veterano ou pensionista" é atestado pelo Portal.
Portanto:

> **O operador nunca sobrepõe um `rejected` do Portal digitando "aprovar".** O caminho de
> exceção é o documento, ele já existe (`public.decide_verification_document`,
> `20260820000007`), e ele é auditado. O que esta task entrega é **ligar o que existe** e dar
> ao operador as ações que **não** atravessam essa fronteira.

**Arquivos:**
- Modificar: `apps/web/app/(admin)/admissions/page.tsx`
- Criar: `apps/web/app/(admin)/admissions/actions.ts`
- Modificar: `apps/web/app/api/internal/verification-reconcile/route.ts` (reuso)
- Criar: `supabase/tests/admissions-decision.sql`

- [ ] **Step 1: as três ações que não atravessam a fronteira**

  1. **Reprocessar `pending`** — chama a reconciliação que a D2 já entregou
     (`20260820000003_verification_reconcile.sql`). É o desfecho correto para a queda do Portal
     (D08): `pending` tem produtor real, e o operador precisa de um botão para drenar a fila
     quando o Portal volta.
  2. **Decidir documento** — aprovar ou rejeitar pelo `decide_verification_document`, com o
     motivo obrigatório na rejeição (a função já exige) e a URL assinada emitida sob demanda
     por `read_verification_document_path`, **nunca persistida**.
  3. **Rejeitar definitivamente com motivo** — encerra o caso, notifica, e a pessoa vê o
     estado em `/onboarding/status`, que a D2 já construiu.

- [ ] **Step 2: a fila mostra o que decide**

  Idade relativa com o destaque de SLA já existe ali. Falta: qual o estado exato
  (`pending` por timeout do Portal é diferente de `rejected`), se há documento anexado
  aguardando, e há quanto tempo. Sem isso o operador não sabe qual botão é o certo.

- [ ] **Step 3: os testes**

  - operador aprova documento → `verification_outcomes` fica `verified` e
    `locality_memberships` ganha a linha
  - operador rejeita sem motivo → **negado** (a função já levanta; garanta que a UI não
    contorna)
  - não-operador chamando qualquer uma das três → **negado**
  - documento expirado → decisão **negada**, com a mensagem certa
  - reprocessar `pending` que o Portal agora atesta → vira `verified`; que o Portal recusa →
    vira `rejected`, e a pessoa vê o estado

- [ ] **Step 4: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(admissions): fila de admissao decide, sem sobrepor o que o Estado atesta"
```

---

## Task 7: PostHog — medir sem virar o oitavo terceiro que ninguém declarou

**Não comece sem a governança LGPD publicada.** D40 é explícita: *"Sai dado comportamental
para terceiro: exige base legal declarada na governança LGPD"*, e o §4.4 registra que
`legal/PRIVACIDADE.md` já lista "os oito terceiros que recebem dado" — o PostHog precisa estar
nessa lista **antes** do primeiro evento, não depois.

**Arquivos:**
- Modificar: `apps/web/package.json`
- Criar: `apps/web/lib/analytics/posthog.ts`
- Criar: `apps/web/lib/analytics/events.ts`
- Criar: `tests/unit/analytics/no-pii-in-events.test.ts`
- Modificar: `docs/legal/PRIVACIDADE.md`

- [ ] **Step 1: a lista fechada de eventos, antes do SDK**

  `events.ts` define um `as const` com os eventos e as propriedades permitidas. **Nenhuma
  propriedade livre.** O motivo é a mesma regra do Sentry: o que sai daqui sai para fora do
  produto.

  Os eventos derivam das perguntas de 90 dias que o §7.7 diz que o PostHog existe para
  responder — não invente métrica de vaidade. O mínimo:
  admissão iniciada / concluída / rejeitada; vila pedida / aprovada; post publicado com
  alcance; indicação pedida / respondida / resolvida; evento criado / RSVP; ficha de prestador
  vista (é o que alimenta a métrica do painel da onda G); denúncia aberta / resolvida.

- [ ] **Step 2: o que nunca entra**

  Nada de CPF, nome, e-mail, telefone, endereço, OM, posto, conteúdo de post, conteúdo de
  mensagem, motivo de denúncia. Identificação por `user_id` opaco, e nada mais. O
  `distinct_id` **não** é o e-mail.

- [ ] **Step 3: o teste que impede a regressão**

  `tests/unit/analytics/no-pii-in-events.test.ts` percorre o catálogo de `events.ts` e falha se
  alguma propriedade tiver nome em uma lista negra (`cpf`, `email`, `phone`, `name`, `address`,
  `content`, `reason`, `om`, `rank`, `patente`). É um teste sobre o **catálogo**, não sobre a
  chamada — assim ele pega o evento novo que alguém adicionar em seis meses.

- [ ] **Step 4: opt-out honrado**

  A `notification_preferences` já é o lugar onde o produto guarda "não quero". Analytics segue
  a mesma porta: uma preferência, verificada antes de qualquer envio, no molde do que o worker
  do `outbox` já faz.

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(analytics): PostHog com catalogo fechado de eventos, sem PII e com opt-out"
```

---

## Task 8: fechamento da onda

- [ ] **Step 1: o runbook precisa bater com o painel**

  `docs/PILOT_RUNBOOK.md` §6 descreve a resolução de denúncia como ela era. Reescreva-o para o
  painel que existe ao fim desta onda, e acrescente uma seção de **suspensão e recurso** — o
  operador vai executá-la sob pressão, no meio de um incidente, e é o único momento em que
  ninguém lê documentação nova.

  Confira também o §10 cenário B ("dados privados expostos em post público"): com a Task 3, o
  passo de ocultar deixou de ser manual em três lugares.

- [ ] **Step 2: os E2E — escritos, commitados, possivelmente não rodados**

  Denunciar um post e ver a confirmação com o prazo; o operador resolve e o denunciante recebe
  a notificação; o membro suspenso tenta publicar e vê a tela de suspensão.

  Sem credencial inline; **`import.meta` não existe nos specs** — resolva caminho por
  `process.cwd()`, senão a coleta da suíte inteira aborta com `Total: 0 tests in 0 files`. Se o
  banco estiver sem seed, commite sem executar e registre como "código feito" no
  `PRODUCT_STATUS.md`.

- [ ] **Step 3: a auditoria visual — ela bloqueia o que vier depois**

```bash
node scripts/visual/loop.mjs
```

  Telas tocadas: `/reports`, `/admissions`, `/conta/suspensa`, o modal de denúncia no feed, no
  chat e nas indicações. Veredito em `docs/agents/VISUAL_AUDIT-2026-08-<dd>-onda-h.md`.

  Depois da captura, **antes de qualquer `test:db`**: `db:reset` limpo, sem dev server e sem
  captura rodando. O perfil fantasma "Visual Capture" quebra seis asserts alheios e parece
  regressão real.

- [ ] **Step 4: reconciliar o `PRODUCT_STATUS.md`**

  As oito linhas do §9 e a linha "Métrica de produto" do §11. Uma linha só sai quando o ciclo
  fecha — e nesta onda o ciclo tem duas pontas: a do operador **e** a do denunciante, ou do
  suspenso. Capacidade no banco não fecha linha. `[A]` vira `[V]` no que você reconferiu.

- [ ] **Step 5: commit final**

```bash
git commit -m "docs(status): reconciliar moderacao, admissao e medicao apos a onda H"
```

---

## Se alguma coisa aqui estiver errada

Um plano errado é informação, não obstáculo. **Pare e reporte** em vez de improvisar,
especialmente nestes cinco pontos:

1. Qualquer `check` de vocabulário em conteúdo de usuário — a D21 derrubou o anterior e a onda
   C mudou os pgTAP que afirmavam a rejeição. Repetir isso é desfazer uma onda inteira.
2. Qualquer aprovação de admissão que sobreponha o que o Portal atestou (§4.1).
3. Qualquer policy de escrita que fique sem `private.is_suspended` — e a enumeração vem do
   `pg_policies`, não do diff. A onda T errou exatamente aqui.
4. Qualquer notificação que revele ao denunciante **qual** ação foi tomada (runbook §6).
5. Qualquer evento de analytics com propriedade livre.
