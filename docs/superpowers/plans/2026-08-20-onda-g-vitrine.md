# Onda G â€” a vitrine

> Plano de execuÃ§Ã£o. Escrito em **2026-08-20**. Marque `- [x]` conforme avanÃ§a e **commite por
> task**.
>
> Leia [`README.md`](README.md) deste diretÃ³rio inteiro antes de abrir qualquer task.

## O que esta onda Ã©

A vitrine Ã© uma das quatro coisas que o nÃ­vel municipal Ã© (`BIVAQUE.md` Â§6.2) e Ã© **o
comportamento que o grupo de WhatsApp de 630 pessoas jÃ¡ demonstra hoje** â€” peixe, marmita,
ar-condicionado, despachante. Ã‰ tambÃ©m a **Ãºnica onda com receita** (Â§10.2).

Entrega, na ordem: a conta do prestador civil, a ficha, o painel dele, a busca, a conversa
membro â†” prestador e o alcance pago.

## O que esta onda nÃ£o Ã©

- **NÃ£o intermedia pagamento de serviÃ§o.** D26 e Â§7.3 regra 1: o dinheiro do corte de cabelo
  nunca passa pelo Bivaque. O que se cobra Ã© produto da plataforma (Â§7.2), nunca a transaÃ§Ã£o
  alheia. Se alguma task levar vocÃª a escrever "checkout do serviÃ§o", **pare e reporte**.
- **NÃ£o ordena por dinheiro.** D29 e Â§7.3 regra 3. A ordenaÃ§Ã£o Ã© relevÃ¢ncia e reputaÃ§Ã£o. A
  Task 7 tem um teste que existe sÃ³ para provar isso.
- **NÃ£o entrega prova social nem avisos.** D45 adia os dois: prova social depende do ciclo de
  indicaÃ§Ã£o rodando (onda F), avisos dependem de moderaÃ§Ã£o (onda H).
- **NÃ£o abre DM entre membros.** D31 mantÃ©m adiada. O que abre Ã© **membro â†” prestador** (D36).

## Dois blocos, e o segundo pode virar onda prÃ³pria

| Bloco | Tasks | Depende de CNPJ | O que entrega |
|---|---|---|---|
| **G1 â€” a vitrine** | 1 a 6 | nÃ£o | conta, ficha, painel, busca, conversa |
| **G2 â€” o alcance pago** | 7 e 8 | **sim** | assinatura, webhook, alcance alÃ©m da vila |

O `README.md` jÃ¡ previa "G â€” provavelmente dividida em duas". EstÃ¡ dividida aqui. Se dezembro
apertar, **o corte Ã© entre a Task 6 e a Task 7**, e o G1 sozinho entrega o Â§6.2 inteiro. A
ordem de corte sugerida pela Â§9.1 Ã© a mesma: monetizaÃ§Ã£o primeiro.

---

## PortÃ£o humano â€” dois ADRs antes da Task 1

A [`RISK_MATRIX.md`](../../decisions/RISK_MATRIX.md) eleva automaticamente qualquer plano que
contenha `marketplace`, `monetizaÃ§Ã£o`, `pricing`, `privacidade`, `visibilidade` ou `acesso` â€”
esta onda contÃ©m os seis. E qualquer plano que toque RLS, dado pessoal ou pagamento **Ã© R3**,
o que exige **ADR aprovado, `critic_verdict: PASS` e aprovaÃ§Ã£o humana registrada**.

Hoje **nÃ£o existe ADR nenhum para a vitrine**. As decisÃµes D20, D28, D37, D41, D44 e D45 vivem
na tabela do Â§9 do `BIVAQUE.md`, que Ã© onde moram as decisÃµes **nÃ£o-R3**. Isso Ã© uma lacuna de
governanÃ§a, nÃ£o um detalhe de forma: a onda G cria um **tipo de conta civil dentro de uma rede
de militares identificÃ¡veis** e depois liga um meio de cobranÃ§a nela.

**Os dois ADRs foram aprovados pelo dono em 2026-08-20** â€” `status: accepted`,
`critic_verdict: PASS`, aprovaÃ§Ã£o registrada na seÃ§Ã£o `Approval` de cada um:

| ADR | Cobre | Estado |
|---|---|---|
| [`ADR-20260820-conta-de-prestador`](../../decisions/ADR-20260820-conta-de-prestador.md) | entrada por indicaÃ§Ã£o, o que o prestador vÃª, quem inicia conversa, telefone opt-in, o prestador como titular de dados | **aprovado** â€” Tasks 1 a 6 destravadas |
| [`ADR-20260820-alcance-pago`](../../decisions/ADR-20260820-alcance-pago.md) | o que o pagante compra, preÃ§o, tolerÃ¢ncia de atraso, o rÃ³tulo, Asaas | **aprovado**, mas as Tasks 7 e 8 seguem paradas pelo CNPJ |

A revisÃ£o que precedeu a aprovaÃ§Ã£o achou e corrigiu seis defeitos de implementabilidade neste
plano â€” o `critic_review` de cada ADR os lista. **O crÃ­tico nÃ£o foi independente** (foi quem
escreveu os ADRs), e isso estÃ¡ registrado lÃ¡ em vez de omitido: se durante a execuÃ§Ã£o alguma
decisÃ£o se mostrar errada, ela Ã© reabrÃ­vel.

**As sete decisÃµes do ADR 1 que este plano executa**, para vocÃª reconhecer quando estiver
escrevendo o cÃ³digo: indicaÃ§Ã£o por membro **aprovado** da comunidade, com cota de cinco (Task
2); a ficha sobrevive Ã  saÃ­da de quem indicou, e revogar Ã© ato do dono da comunidade (Task 3);
o prestador vÃª a prÃ³pria ficha e as conversas que recebeu, e dentro delas sÃ³ o `display_name`
(Task 6); **sÃ³ o membro inicia conversa** (Task 6); o prestador pode denunciar **mensagem, e sÃ³
mensagem** (Ã© a resposta Ã  pergunta que a onda H deixa aberta na Task 1 dela); telefone Ã©
opt-in e a ficha funciona sem ele (Task 3); e a seÃ§Ã£o do prestador em `legal/PRIVACIDADE.md`
entra antes da primeira ficha real.

**As sete do ADR 2:** o escopo Ã© a unidade vendida; **R$ 49/mÃªs** cobrindo todas as vilas da
localidade mais o nÃ­vel municipal; **7 dias de tolerÃ¢ncia** em `past_due`; a ordenaÃ§Ã£o nunca lÃª
o dinheiro, com teste guardando; rÃ³tulo "Alcance patrocinado" visÃ­vel; checkout hospedado com
cartÃ£o fora do Bivaque; e a lista fechada do que nunca entra na venda.

Se vocÃª discordar de alguma delas durante a execuÃ§Ã£o, **pare e reporte** â€” a discordÃ¢ncia vai
para o ADR, nÃ£o para o cÃ³digo.

**Bloqueios humanos que nenhum agente resolve:**

- **CNPJ** â€” trava o Bloco 2 inteiro (Â§7.6 depende de parecer jurÃ­dico).
- **Resend com domÃ­nio verificado** â€” a Task 2 manda e-mail para um civil que nÃ£o tem conta.
  Sem o adaptador real da D1, o convite fica no `outbox` e ninguÃ©m recebe.
- **O parÃ¡grafo do prestador em `legal/PRIVACIDADE.md`.**

As Tasks 1, 3, 4, 5 e 6 nÃ£o dependem do CNPJ e podem correr enquanto ele nÃ£o existe. **A Task 1
pode comeÃ§ar agora.**

---

## PrecedÃªncia: esta onda vem depois de cinco

```
P0 â†’ T â†’ D2 â†’ E â†’ F â†’ G
```

E Ã© dependÃªncia real, nÃ£o ordem administrativa:

1. **A onda E define onde a vitrine aterrissa.** O `ADR-20260816-shells-e-navegacao` Ã©
   explÃ­cito e o cÃ³digo jÃ¡ registra a decisÃ£o em
   `apps/web/app/components/bivaque/bottom-nav.tsx:33-34`: *"vitrine e busca de prestador caem
   AQUI"* â€” no container **"cidade"**, `/localidade`. NÃ£o crie aba nova. Se um destino desta
   onda nÃ£o couber em "cidade", **pare e reporte** (regra falsificÃ¡vel do ADR).
2. **A onda E jÃ¡ deixou o buraco pronto.** `apps/web/app/components/bivaque/city-reference.tsx`
   tem um `EmptyState` honesto que diz *"Isso Ã© trabalho da onda G"* â€” a Task 5 o substitui.
3. **A onda D1 entrega o `outbox`**, que Ã© como o convite da Task 2 sai.
4. **A onda F mexe na mÃ¡quina de indicaÃ§Ã£o**, que compartilha o `can_dm_between` com a Task 6.

## Contexto obrigatÃ³rio antes de comeÃ§ar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) Â§1.3 (a linha do prestador), Â§6.2, Â§7.1 a Â§7.4
   (a linha da monetizaÃ§Ã£o, as categorias, os cinco proibidos, o filtro de trÃªs perguntas),
   Â§12 (as oito regras permanentes) e as decisÃµes D17, D20, D26 a D29, D36, D37, D41, D44, D45.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) Â§7 inteiro (cinco linhas, todas
   "**nÃ£o existe**") e Â§8, a linha **"Conversa membro â†” prestador"**, que lista os trÃªs
   defeitos que a Task 6 corrige.
3. As duas liÃ§Ãµes do E2E no `README.md`: `notFound()` responde **200** no Next 16, e o
   PostgREST **nÃ£o resolve embed onde nÃ£o hÃ¡ foreign key** â€” e esta onda cria tabelas novas
   que precisam de FK explÃ­cita para `profiles` se vocÃª quiser embutir o nome.

## O que jÃ¡ existe e vocÃª nÃ£o deve reimplementar

| PeÃ§a | Onde | Use como |
|---|---|---|
| Shell do operador e do dono | `app/(admin)/layout.tsx`, `app/(owner)/` | modelo do shell do prestador (Task 1) |
| Gate de papel por RPC | `20260806111744_is_current_user_operator.sql` | modelo exato de `is_provider_account` |
| Convite atado ao e-mail | `private.family_invitations` + `public.create_family_invitation` | modelo do convite de prestador (Task 2) |
| Bucket privado com policies | `20260821000015_event_photos_bucket.sql` | modelo do bucket de fotos da ficha |
| MÃ¡quina de DM | `20260802001500_dm_contextual.sql` | Ã© a mÃ¡quina que a Task 6 corrige e estende |
| Placeholder da vitrine | `city-reference.tsx` (seÃ§Ã£o `city-vitrine-heading`) | Ã© o que a Task 5 substitui |

---

## Task 1: a fronteira do prestador nasce antes da ficha

O prestador Ã© **usuÃ¡rio do Auth com papel e sem membership** (D37). O motivo estÃ¡ escrito na
prÃ³pria decisÃ£o: *"sem membership nenhuma policy de conteÃºdo casa: falha fechado por
construÃ§Ã£o"*. Toda policy de leitura de conteÃºdo deste schema pergunta por
`locality_memberships` ou `community_memberships`; um usuÃ¡rio sem nenhuma das duas nÃ£o lÃª nada,
por construÃ§Ã£o, e Ã© isso que queremos.

**Mas hÃ¡ um obstÃ¡culo estrutural que o `PRODUCT_STATUS.md` nÃ£o registra e que vocÃª vai bater
de frente jÃ¡ no primeiro login:** `apps/web/middleware.ts:135-153` manda **qualquer**
autenticado sem `locality_memberships` para o funil de onboarding do membro. Um prestador que
fizer login hoje cai em `/onboarding`, Ã© convidado a digitar CPF, e nÃ£o existe saÃ­da. A
fronteira e o roteamento nascem juntos ou o tipo de conta nÃ£o existe.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_accounts.sql`
  (`npx pnpm@11.18.0 exec supabase migration new provider_accounts`)
- Criar: `supabase/tests/provider-account-boundary.sql`
- Modificar: `apps/web/middleware.ts:135-153`
- Criar: `apps/web/app/(provider)/layout.tsx`
- Criar: `apps/web/app/(provider)/prestador/page.tsx`

**Interfaces que as tasks seguintes consomem:**
- `public.provider_accounts(auth_user_id, invited_by, community_id, locality_id, created_at, revoked_at)`
- `public.is_provider_account(p_user_id uuid) returns boolean` â€” `service_role` apenas, mesmo
  contrato de `is_current_user_operator`
- `private.is_provider_account(p_user_id uuid) returns boolean` â€” o mesmo predicado para uso
  **dentro de policy**, concedido a `authenticated`
- `public.my_account_kind() returns text` â€” `'member' | 'provider' | null`, escopada por
  `auth.uid()` (sem parÃ¢metro para errar), concedida a `authenticated`

- [ ] **Step 1: a migration â€” tabela, RLS e os dois helpers**

```sql
-- A conta do prestador civil. D37: usuÃ¡rio do Auth com papel, sem membership.
-- Quem atesta "Ã© bom prestador" Ã© a comunidade que o indicou (Â§4.1), por isso
-- community_id Ã© NOT NULL: uma ficha Ã³rfÃ£ de comunidade nÃ£o tem quem a atestou.
create table public.provider_accounts (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete restrict,
  community_id uuid not null references public.communities (id) on delete cascade,
  locality_id uuid not null references public.localities (id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id)
);

create index provider_accounts_active_idx
  on public.provider_accounts (auth_user_id) where revoked_at is null;

create index provider_accounts_community_idx
  on public.provider_accounts (community_id) where revoked_at is null;

alter table public.provider_accounts enable row level security;
alter table public.provider_accounts force row level security;

revoke all on table public.provider_accounts from anon, authenticated;
grant select on table public.provider_accounts to authenticated;
grant select, insert, update on table public.provider_accounts to service_role;

-- O prestador enxerga a prÃ³pria linha. NinguÃ©m mais lÃª a lista: o roster de
-- prestadores de uma vila Ã© informaÃ§Ã£o de operaÃ§Ã£o, nÃ£o de membro â€” mesmo
-- motivo do 20260806100231_restrict_operator_roster.sql.
create policy provider_accounts_select_self
on public.provider_accounts
for select
to authenticated
using (auth_user_id = (select auth.uid()));

-- Espelha is_current_user_operator: o chamador roda como service_role (que
-- bypassa RLS), entÃ£o auth.uid() Ã© NULL dentro da funÃ§Ã£o e o id vem explÃ­cito.
create function public.is_provider_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_accounts
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;

revoke all on function public.is_provider_account(uuid) from public, anon, authenticated;
grant execute on function public.is_provider_account(uuid) to service_role;

-- O mesmo predicado, alcanÃ§Ã¡vel de dentro de uma policy. A decisÃ£o 5 do ADR da
-- conta de prestador manda a policy de insert de `reports` perguntar se quem
-- escreve Ã© prestador, e policy Ã© avaliada como `authenticated` â€” que nÃ£o tem
-- EXECUTE na funÃ§Ã£o acima e nunca vai ter. O par public/private Ã© o mesmo
-- desenho de `private.is_locality_member` (20260802000300).
create function private.is_provider_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_accounts
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;

revoke all on function private.is_provider_account(uuid) from public, anon;
grant execute on function private.is_provider_account(uuid) to authenticated, service_role;

-- O middleware roda com o cliente anÃ´nimo do usuÃ¡rio, nÃ£o com service_role.
-- Por isso este segundo helper escopa por auth.uid() e NÃƒO aceita parÃ¢metro â€”
-- mesmo desenho de public.my_verification_status (20260820000002).
create function public.my_account_kind()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.locality_memberships where user_id = (select auth.uid())
    ) then 'member'
    when exists (
      select 1 from public.provider_accounts
      where auth_user_id = (select auth.uid()) and revoked_at is null
    ) then 'provider'
    else null
  end;
$$;

revoke all on function public.my_account_kind() from public, anon;
grant execute on function public.my_account_kind() to authenticated, service_role;
```

- [ ] **Step 2: o pgTAP da fronteira â€” positivo e negativo**

  A regra 7 da Â§12 nÃ£o tem exceÃ§Ã£o: todo caminho de permissÃ£o tem os dois. Crie
  `supabase/tests/provider-account-boundary.sql` no formato de
  `supabase/tests/reports-denials.sql` (fixtures incluÃ­das dentro da transaÃ§Ã£o, rollback no
  fim). O prestador de fixture Ã© um `auth.users` novo, **sem** `locality_memberships`.

  As asserÃ§Ãµes que precisam existir, todas com `set local role authenticated` e o
  `request.jwt.claim.sub` do prestador:

  - `is_empty('select 1 from public.posts', 'prestador nao le post nenhum')`
  - `is_empty('select 1 from public.profiles', 'prestador nao le perfil nenhum')`
  - `is_empty('select 1 from public.groups', 'prestador nao le grupo nenhum')`
  - `is_empty('select 1 from public.communities', 'prestador nao le comunidade nenhuma')`
  - `is_empty('select 1 from public.events', 'prestador nao le evento nenhum')`
  - `throws_ok` no `insert into public.posts (...)` â€” 42501
  - a linha prÃ³pria em `provider_accounts` **Ã©** visÃ­vel: `isnt_empty(...)`
  - a linha de **outro** prestador nÃ£o Ã©: `is_empty(...)`
  - `select is(public.my_account_kind(), 'provider', ...)` para o prestador
  - `select is(public.my_account_kind(), 'member', ...)` para `member-one`

  Rode: `npx pnpm@11.18.0 exec supabase test db`. **Sem dev server e sem captura visual
  rodando** â€” a armadilha do perfil fantasma quebra seis asserts alheios e vocÃª vai passar uma
  hora procurando no lugar errado.

- [ ] **Step 3: o middleware para de empurrar o prestador para o CPF**

  Em `apps/web/middleware.ts`, o bloco que hoje comeÃ§a em `const isMember = await supabase`
  (linha 135) faz uma consulta a `locality_memberships` e, no `null`, chama
  `my_verification_status`. Troque a consulta pelo `my_account_kind()`, que responde as duas
  perguntas numa ida sÃ³:

```ts
const { data: kindRows, error: kindError } = await supabase.rpc("my_account_kind")
if (kindError) {
  // NÃ£o dÃ¡ para rotear com seguranÃ§a. Falha fechado no onboarding do membro,
  // que Ã© a tela determinÃ­stica â€” mesmo critÃ©rio do bloco que este substitui.
  return NextResponse.redirect(new URL("/onboarding", request.url))
}
const kind = (kindRows ?? null) as "member" | "provider" | null

if (kind === "provider") {
  // O prestador vive fora do shell do membro. Deixe-o passar em /prestador e
  // mande de volta para lÃ¡ em qualquer outra rota â€” ele nÃ£o tem membership e
  // toda policy de conteÃºdo jÃ¡ o nega; o redirect evita a tela vazia.
  return pathname.startsWith("/prestador")
    ? supabaseResponse
    : NextResponse.redirect(new URL("/prestador", request.url))
}

if (kind === null) {
  // ... aqui entra, sem alteraÃ§Ã£o, o bloco de my_verification_status que jÃ¡ existe
}
```

  Cuidado com a ordem: o bloco de `/onboarding` (linhas 102-110) vem **antes** e continua
  antes â€” um prestador nunca chega lÃ¡ porque o redirect acima o intercepta.

- [ ] **Step 4: o shell do prestador**

  `apps/web/app/(provider)/layout.tsx`, no molde de `app/(admin)/layout.tsx`: lÃª o usuÃ¡rio pelo
  cliente com cookies, chama `is_provider_account` pelo `service_role`, e **redireciona o
  membro para `/community`** se ele cair ali. Sem `AppShell`, sem `bottom-nav` â€” a navegaÃ§Ã£o do
  membro espelha o modelo de pertencimento (ADR de shells, regra 2) e o prestador nÃ£o pertence
  a nada disso.

  `apps/web/app/(provider)/prestador/page.tsx` nesta task Ã© **honesto e mÃ­nimo**: nome da
  comunidade que o indicou e a frase de que a ficha chega na prÃ³xima task. Regra 4 da Â§12 â€” UI
  sÃ³ mostra affordance se o fluxo fecha hoje. NÃ£o desenhe botÃ£o de "criar ficha" ainda.

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git add supabase/migrations supabase/tests/provider-account-boundary.sql apps/web/middleware.ts "apps/web/app/(provider)"
git commit -m "feat(providers): conta de prestador com fronteira de acesso e roteamento proprio"
```

---

## Task 2: o convite de prestador â€” quem atesta Ã© a comunidade

`BIVAQUE.md` Â§1.3: o prestador entra por **indicaÃ§Ã£o de membro verificado**, e quem atesta Ã©
**a comunidade que o indicou**. NÃ£o Ã© auto-cadastro. NÃ£o Ã© o operador.

O modelo existe e estÃ¡ pronto para copiar: o convite familiar (D16) jÃ¡ resolve o problema
difÃ­cil â€” **link encaminhado nÃ£o pode provisionar quem abrir**, entÃ£o o aceite confere o
e-mail-alvo. O prestador tem exatamente a mesma propriedade.

**DiferenÃ§a de semÃ¢ntica que o cÃ³digo nÃ£o pode confundir** (Â§5.4): o convite familiar concede
**acesso de membro sem CPF**; o de prestador **nÃ£o concede acesso a nada** â€” cria uma conta que
sÃ³ enxerga a prÃ³pria ficha. SÃ£o vias distintas e nunca compartilham tabela.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_invitations.sql`
- Criar: `supabase/tests/provider-invitation.sql`
- Criar: `apps/web/app/(shell)/communities/[id]/indicar-prestador/page.tsx`
- Criar: `apps/web/app/(shell)/prestador-convite/[token]/page.tsx`
- Modificar: `apps/web/lib/outbox/adapters.ts` (novo tipo de mensagem)

**Interfaces:**
- `public.create_provider_invitation(p_community_id uuid, p_email text, p_display_name text) returns uuid`
- `public.accept_provider_invitation(p_token text, p_email text) returns uuid` (devolve o
  `auth_user_id` do prestador provisionado)

- [x] **Step 1: a migration** — fechado em 2026-08-25 (`20260825181742_provider_invitations.sql`: tabela privada em digests, RLS forçada, cota de cinco, RPCs `create_provider_invitation`/`accept_provider_invitation`, outbox `provider_invite`)

  Espelhe `private.family_invitations` (`20260802000200_private_trust_family_foundation.sql:38-58`):
  tabela em **`private`**, `token_digest bytea` e `invitee_email_digest bytea` de 32 bytes â€”
  **nunca o e-mail em claro, nunca o token em claro** â€”, `status`, `expires_at`,
  `accepted_by_user_id`, e o `check` que amarra os trÃªs campos de aceite.

  TrÃªs regras prÃ³prias desta tabela:

```sql
-- Cota: cinco convites de prestador ativos por membro, mesma ordem de grandeza
-- do convite familiar (Â§5.4). Sem cota, um membro sozinho enche a vitrine.
create index provider_invitations_inviter_pending_idx
  on private.provider_invitations (inviter_user_id) where status = 'pending';

-- SÃ³ membro APROVADO da comunidade indica. Ser da cidade nÃ£o basta: quem
-- atesta o prestador Ã© a vila (Â§4.1), e a vila Ã© community_memberships.
-- Esta checagem vive dentro de create_provider_invitation, nÃ£o numa policy,
-- porque a tabela Ã© private e authenticated nÃ£o tem privilÃ©gio nenhum nela.
```

  `public.create_provider_invitation` Ã© `security definer`, valida que
  `auth.uid()` tem `community_memberships.status = 'approved'` na `p_community_id`, valida a
  cota, grava os digests e **enfileira no `outbox`** (a fila da D1 Ã© o Ãºnico caminho de envio â€”
  ela Ã© quem confere preferÃªncia e opt-out).

  `public.accept_provider_invitation` valida token + e-mail (comparando digests), cria a linha
  em `public.provider_accounts` com `invited_by`, `community_id` e `locality_id` copiados do
  convite, e marca o convite como `accepted`. **NÃ£o** cria `locality_memberships`. **NÃ£o** cria
  `profiles`.

- [x] **Step 2: o pgTAP â€” positivo e negativo** — 16 asserts em `supabase/tests/provider-invitation.sql`; suíte completa 91 arquivos / 1068 PASS

  `supabase/tests/provider-invitation.sql`, no molde de
  `supabase/tests/family-invite-email-binding.sql`:

  - membro aprovado da vila cria convite â†’ **ok**
  - membro da cidade **sem** `community_memberships` aprovada â†’ **negado**
  - prestador tentando criar convite â†’ **negado**
  - aceite com e-mail divergente do `invitee_email_digest` â†’ **negado** (este Ã© o teste que o
    convite familiar existe para ter; nÃ£o o copie pela metade)
  - aceite com token expirado â†’ **negado**
  - aceite duas vezes â†’ o segundo Ã© **negado**
  - depois do aceite, `provider_accounts` tem a linha e `locality_memberships` **nÃ£o** tem

- [x] **Step 3: as duas telas** — `/communities/[id]/indicar-prestador` no shell e aceite em `/prestador-convite/[token]`; DESVIO registrado: o aceite vive em `(preauth)` porque `(shell)` exige membership e redirecionaria o civil sem conta (URL preservada)

  **Indicar** (`(shell)/communities/[id]/indicar-prestador/page.tsx`): formulÃ¡rio com nome e
  e-mail, Server Action autenticada pelo **cliente com cookies** (regra 1 da Â§12 â€” o padrÃ£o a
  seguir estÃ¡ em `app/(shell)/communities/actions.ts:8-24`), feedback por `showToast`, e o
  aviso de que o prestador vai ver e nÃ£o ver.

  **Aceitar** (`(shell)/prestador-convite/[token]/page.tsx`): a rota precisa entrar em
  `PUBLIC_PATHS` do middleware â€” quem abre o link ainda nÃ£o tem conta. Confira o e-mail antes
  de provisionar, exatamente como `app/(shell)/invite/[token]/`.

- [x] **Step 4: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): convite de prestador atado ao e-mail, indicado pela comunidade"
```

---

## Task 3: a ficha â€” identidade, catÃ¡logo e portfÃ³lio

D45 fecha o escopo em trÃªs blocos, e o motivo estÃ¡ na prÃ³pria decisÃ£o: *"sÃ£o os trÃªs blocos que
o prestador preenche sozinho no dia um"*. Prova social e avisos ficam fora.

**A coluna de escopo e as policies que a leem nascem nesta mesma migration.** Regra 6 da Â§12,
que o `AGENTS.md` chama de "a falha que este repositÃ³rio insiste em repetir â€” quatro vazamentos
de privacidade atÃ© aqui". O alcance da ficha (`provider_reach`) nasce aqui, com as policies,
mesmo que sÃ³ a linha grÃ¡tis exista atÃ© a Task 7.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_showcase.sql`
- Criar: `supabase/tests/provider-showcase-scope.sql`
- Modificar: `packages/domain/src/index.ts` (as doze categorias)
- Criar: `apps/web/app/(shell)/prestadores/[id]/page.tsx` (a ficha vista pelo membro)

**Interfaces:**
- `public.provider_profiles(id, owner_user_id, display_name, category, bio, contact_phone, contact_is_public, created_at, updated_at, is_deleted)`
- `public.provider_catalog_items(id, provider_id, title, description, price_cents, photo_path, position)`
- `public.provider_portfolio_photos(id, provider_id, photo_path, caption, position)`
- `public.provider_reach(provider_id, scope_type, scope_id, source, active)`
- `private.can_see_provider(p_provider_id uuid) returns boolean`

- [x] **Step 1: as doze categorias, em um lugar sÃ³**

  Â§7.2.1 Ã© uma **lista fechada** com trÃªs regras que o cÃ³digo precisa carregar. Em
  `packages/domain/src/index.ts`:

```ts
// BIVAQUE.md Â§7.2.1 â€” lista fechada. NÃƒO existe "Outros": vira depÃ³sito, chega
// a metade das fichas e mata o filtro. O que nÃ£o couber Ã© sinal para criar
// categoria por decisÃ£o, nunca por usuÃ¡rio. Categoria sÃ³ se divide acima de
// ~15 fichas ativas.
export const PROVIDER_CATEGORIES = [
  "alimentacao",
  "casa_e_reformas",
  "assistencia_tecnica",
  "mudanca_e_transporte",
  "imoveis",
  "documentacao_e_financas",
  "saude_e_bem_estar",
  "beleza",
  "educacao_e_aulas",
  "automotivo",
  "eventos_e_festas",
  "pets",
] as const

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number]

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  alimentacao: "AlimentaÃ§Ã£o",
  casa_e_reformas: "Casa e reformas",
  assistencia_tecnica: "AssistÃªncia tÃ©cnica",
  mudanca_e_transporte: "MudanÃ§a e transporte",
  imoveis: "ImÃ³veis",
  documentacao_e_financas: "DocumentaÃ§Ã£o e finanÃ§as",
  saude_e_bem_estar: "SaÃºde e bem-estar",
  beleza: "Beleza",
  educacao_e_aulas: "EducaÃ§Ã£o e aulas",
  automotivo: "Automotivo",
  eventos_e_festas: "Eventos e festas",
  pets: "Pets",
}
```

  O enum do banco carrega os mesmos doze valores, na mesma ordem. Escreva um teste em
  `tests/unit/` que compare o array com o enum lido de `supabase/database.generated.ts` â€” Ã© o
  tipo de divergÃªncia que sÃ³ aparece em produÃ§Ã£o.

- [x] **Step 2: a migration da ficha e do alcance**

```sql
create type public.provider_category as enum (
  'alimentacao', 'casa_e_reformas', 'assistencia_tecnica', 'mudanca_e_transporte',
  'imoveis', 'documentacao_e_financas', 'saude_e_bem_estar', 'beleza',
  'educacao_e_aulas', 'automotivo', 'eventos_e_festas', 'pets'
);

create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique
    references public.provider_accounts (auth_user_id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  category public.provider_category not null,
  bio text check (bio is null or char_length(bio) between 1 and 800),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9]{10,15}$'),
  -- O telefone Ã© dado pessoal de um civil publicado para centenas de militares.
  -- Ele sÃ³ aparece quando o prestador escolhe publicÃ¡-lo (ADR da conta de
  -- prestador). Em branco Ã© estado vÃ¡lido e a ficha continua funcionando.
  contact_is_public boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O alcance. Nasce aqui, com as policies que o leem (regra 6 da Â§12).
-- 'free'  = a prÃ³pria vila, sempre grÃ¡tis e completa (D28).
-- 'paid'  = alÃ©m dela. A Task 7 insere estas linhas; nenhuma existe hoje.
create type public.provider_reach_scope as enum ('community', 'locality');
create type public.provider_reach_source as enum ('free', 'paid');

create table public.provider_reach (
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  scope_type public.provider_reach_scope not null,
  scope_id uuid not null,
  source public.provider_reach_source not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (provider_id, scope_type, scope_id)
);

create index provider_reach_scope_idx
  on public.provider_reach (scope_type, scope_id) where active;

create table public.provider_catalog_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text check (description is null or char_length(description) between 1 and 600),
  -- Â§7.2.1 regra 3: produto e serviÃ§o convivem na mesma taxonomia. Item com
  -- foto, descriÃ§Ã£o e preÃ§o serve para corte de peixe e para limpeza pÃ³s-obra.
  -- PreÃ§o Ã© opcional: "sob orÃ§amento" Ã© a resposta honesta de metade delas.
  price_cents integer check (price_cents is null or price_cents between 0 and 100000000),
  photo_path text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.provider_portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  photo_path text not null,
  caption text check (caption is null or char_length(caption) between 1 and 200),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
```

  O helper de visibilidade, e as policies que o usam:

```sql
-- Quem vÃª a ficha: o dono dela, e quem pertence a algum escopo ativo do
-- alcance. Nada mais. Um membro de outra vila NÃƒO vÃª, e Ã© exatamente essa
-- fronteira que a Task 7 vende.
create function private.can_see_provider(p_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.provider_profiles p
    where p.id = p_provider_id and p.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.provider_reach r
    where r.provider_id = p_provider_id
      and r.active
      and (
        (r.scope_type = 'community' and exists (
          select 1 from public.community_memberships cm
          where cm.community_id = r.scope_id
            and cm.user_id = (select auth.uid())
            and cm.status = 'approved'
        ))
        or (r.scope_type = 'locality' and exists (
          select 1 from public.locality_memberships lm
          where lm.locality_id = r.scope_id
            and lm.user_id = (select auth.uid())
        ))
      )
  );
$$;
```

  Aplique `private.can_see_provider(...)` no `select` das **quatro** tabelas (`provider_profiles`
  pelo `id`, as outras trÃªs pelo `provider_id`), sempre com `and is_deleted = false` onde a
  coluna existe. `insert`/`update`/`delete` sÃ³ para o dono
  (`owner_user_id = (select auth.uid())`). `enable` **e** `force` RLS nas quatro; `revoke all`
  antes dos grants mÃ­nimos.

  E o alvo de denÃºncia, porque ele nasce com a tabela e nÃ£o depois:

```sql
alter type public.report_target_type add value if not exists 'provider_profile';
```

  > Se a **onda H** jÃ¡ tiver aterrissado, ela jÃ¡ roteia a ocultaÃ§Ã£o por tipo de alvo â€” adicione
  > o ramo `provider_profile` ao RPC de resoluÃ§Ã£o dela nesta mesma migration. Se a H ainda nÃ£o
  > rodou, pare aqui: o valor do enum existe, a Task 1 da H cobre o resto.

- [x] **Step 3: o bucket das fotos**

  `provider-photos`, privado, 5 MB, `image/jpeg|png|webp`, no molde exato de
  `20260821000015_event_photos_bucket.sql`. `insert` sÃ³ do dono
  (`owner = auth.uid()` **e** existe `provider_accounts` ativo); `select` gated por
  `private.can_see_provider` a partir do prefixo do caminho.

- [x] **Step 4: o pgTAP do escopo â€” os dois lados**

  `supabase/tests/provider-showcase-scope.sql`. Fixture: duas vilas na mesma cidade, um
  prestador com `reach` grÃ¡tis sÃ³ na vila A.

  - membro **aprovado** da vila A vÃª a ficha, o catÃ¡logo e o portfÃ³lio â†’ `isnt_empty` Ã— 3
  - membro da vila B **nÃ£o vÃª** â†’ `is_empty` Ã— 3
  - membro da vila A com `status = 'pending'` **nÃ£o vÃª** (aprovado â‰  pedinte)
  - membro da cidade sem vila nenhuma **nÃ£o vÃª** â€” este Ã© o teste que a Task 7 vai inverter
    quando existir alcance pago de `locality`; ele precisa estar vermelho de propÃ³sito lÃ¡
  - o dono vÃª a prÃ³pria ficha mesmo sem alcance ativo
  - outro prestador **nÃ£o vÃª** a ficha alheia
  - o dono edita a prÃ³pria ficha; **nÃ£o** edita a alheia (`throws_ok`, 42501)

- [x] **Step 5: a ficha vista pelo membro**

  `(shell)/prestadores/[id]/page.tsx`, Server Component, lendo pelo **cliente autenticado**
  (regra 1 da Â§12: nada de `service_role` aqui â€” a RLS Ã© quem decide). TrÃªs blocos na ordem da
  D45: identidade, catÃ¡logo, portfÃ³lio. Quem nÃ£o pode ver recebe `notFound()` â€” e lembre da
  liÃ§Ã£o do README: **no Next 16 isso responde 200**, entÃ£o a asserÃ§Ã£o do E2E Ã© sobre a UI
  ("nÃ£o encontrado" presente, conteÃºdo protegido ausente), nunca sobre o status.

  BotÃ£o "Conversar" existe mas fica desabilitado com explicaÃ§Ã£o atÃ© a Task 6 â€” ou, melhor pela
  regra 4 da Â§12, **nÃ£o existe ainda**. Prefira nÃ£o existir.

- [x] **Step 6: revogar a ficha Ã© ato do dono da comunidade**

  A decisÃ£o 2 do ADR diz que a ficha **sobrevive** Ã  saÃ­da de quem indicou, e que revogar Ã© ato
  do dono da comunidade. Isso sÃ³ Ã© verdade se existir o ato â€” sem ele a decisÃ£o Ã© prosa e a
  vila fica sem saÃ­da para uma ficha que virou problema.

  O console do dono jÃ¡ existe (`app/(owner)/communities/[id]/`, entregue pela D2 Task 9). Ele
  ganha a lista de fichas ativas da comunidade e a aÃ§Ã£o de revogar, com motivo:

```sql
-- RevogaÃ§Ã£o pelo dono da comunidade que atestou. NÃ£o apaga a conta nem a
-- ficha: desliga o alcance e marca a data. ReversÃ­vel, auditÃ¡vel, e Ã© o
-- mesmo desenho de suspensÃ£o que a onda H usa para pessoa.
create function public.revoke_provider_account(
  p_provider_user_id uuid,
  p_owner_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_community_id uuid;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a revogaÃ§Ã£o exige motivo' using errcode = '22023';
  end if;

  select community_id into v_community_id
  from public.provider_accounts
  where auth_user_id = p_provider_user_id and revoked_at is null;

  if v_community_id is null then
    raise exception 'provider not found or already revoked' using errcode = '02000';
  end if;

  if not exists (
    select 1 from public.communities
    where id = v_community_id and owner_user_id = p_owner_user_id and is_deleted = false
  ) then
    raise exception 'only the community owner revokes' using errcode = '42501';
  end if;

  update public.provider_accounts
     set revoked_at = now(), revoked_by = p_owner_user_id
   where auth_user_id = p_provider_user_id;

  update public.provider_reach r
     set active = false
    from public.provider_profiles p
   where p.id = r.provider_id and p.owner_user_id = p_provider_user_id;
end;
$$;

revoke all on function public.revoke_provider_account(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_provider_account(uuid, uuid, text) to service_role;
```

  Testes: o dono revoga e a ficha some da busca **de todas as vilas**; o dono de **outra**
  comunidade nÃ£o revoga (42501); um membro comum nÃ£o revoga; revogar sem motivo levanta; o
  prestador revogado continua conseguindo entrar e ver a prÃ³pria ficha (ele nÃ£o foi banido â€” a
  vitrine dele Ã© que saiu do ar), e **nÃ£o** consegue reativar o alcance sozinho.

- [x] **Step 7: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): ficha com identidade, catalogo, portfolio, alcance e revogacao pelo dono"
```

---

## Task 4: o painel do prestador

D37 diz o que ele tem: **anÃºncio, mÃ©trica e caixa de pedidos**. Duas das trÃªs dependem de
outras ondas, e o painel precisa dizer isso em vez de fingir.

| Bloco | Estado nesta task |
|---|---|
| Ficha, catÃ¡logo, portfÃ³lio | **entrega completa** â€” criar, editar, reordenar, remover |
| Caixa de pedidos | **chega na Task 6** â€” nÃ£o desenhe caixa vazia antes |
| MÃ©trica | **depende do PostHog, que Ã© onda H** â€” estado vazio honesto, nunca nÃºmero inventado |
| Alcance | mostra o alcance atual (vila prÃ³pria, grÃ¡tis); o upgrade chega na Task 7 |

**Arquivos:**
- Modificar: `apps/web/app/(provider)/prestador/page.tsx`
- Criar: `apps/web/app/(provider)/prestador/actions.ts`
- Criar: `apps/web/app/(provider)/prestador/ficha/page.tsx`
- Criar: `apps/web/app/(provider)/prestador/catalogo/page.tsx`
- Criar: `tests/unit/providers/showcase-form.test.ts`

- [ ] **Step 1: as Server Actions, autenticadas pelo cliente com cookies**

  Todas em `actions.ts` com `"use server"` no topo do arquivo. O padrÃ£o correto estÃ¡ em
  `app/(shell)/communities/actions.ts:8-24`. **Nenhuma delas usa `service_role`** â€” a RLS da
  Task 3 jÃ¡ decide, e usar `service_role` aqui Ã© a regra 1 da Â§12 quebrada.

  Um cuidado que a onda F pagou caro (`README.md`, liÃ§Ã£o do PostgREST): **leia o `error` de
  toda consulta**. A tela renderizando vazia porque o `error` foi descartado Ã© como a lista de
  membros de grupo ficou quebrada em produÃ§Ã£o sem ninguÃ©m notar.

- [ ] **Step 2: a validaÃ§Ã£o na borda**

  `title` 2-120, `bio` atÃ© 800, `price_cents` inteiro nÃ£o-negativo, `contact_phone` no formato
  do `check` da migration. Valide **no servidor**, nÃ£o sÃ³ no formulÃ¡rio â€” a regra do
  `CLAUDE.md` Ã© "valide input nas bordas do sistema". Testes unitÃ¡rios em
  `tests/unit/providers/showcase-form.test.ts` cobrindo os limites e o preÃ§o negativo.

- [ ] **Step 3: os estados honestos**

  MÃ©trica: `EmptyState` dizendo que a mediÃ§Ã£o chega com a onda H â€” nÃ£o um "0 visualizaÃ§Ãµes",
  que Ã© nÃºmero inventado com cara de fato. Caixa de pedidos: idem, atÃ© a Task 6.

- [ ] **Step 4: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): painel do prestador com ficha, catalogo e portfolio editaveis"
```

---

## Task 5: a busca â€” filtro exato mais `pg_trgm` (D44)

D44 Ã© especÃ­fica sobre o mecanismo e sobre o motivo: **nativo do Postgres, sem serviÃ§o novo
onde dado pessoal passe a viver**. NÃ£o introduza Ã­ndice externo, nÃ£o introduza serviÃ§o de
busca. E lembre da D43: **nÃ£o existe busca de pessoas**. Isto busca **ficha**, e a fronteira
entre as duas coisas Ã© o que o produto vende.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_search.sql`
- Criar: `supabase/tests/provider-search-scope.sql`
- Modificar: `apps/web/app/components/bivaque/city-reference.tsx` (a seÃ§Ã£o `city-vitrine-heading`)
- Criar: `apps/web/app/(shell)/prestadores/page.tsx`

- [ ] **Step 1: extensÃ£o, Ã­ndice e o RPC**

```sql
create extension if not exists pg_trgm with schema extensions;

create index provider_profiles_name_trgm_idx
  on public.provider_profiles using gin (display_name extensions.gin_trgm_ops)
  where is_deleted = false;

-- Filtro exato por categoria e escopo; pg_trgm apenas no nome (D44).
-- security definer com o filtro de alcance DENTRO da funÃ§Ã£o: quem chama nunca
-- escolhe o escopo que enxerga.
create function public.search_providers(
  p_category public.provider_category default null,
  p_community_id uuid default null,
  p_query text default null
)
returns table (
  id uuid,
  display_name text,
  category public.provider_category,
  bio text,
  reach_source public.provider_reach_source
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (p.id)
    p.id, p.display_name, p.category, p.bio, r.source
  from public.provider_profiles p
  join public.provider_reach r on r.provider_id = p.id and r.active
  where p.is_deleted = false
    and private.can_see_provider(p.id)
    and (p_category is null or p.category = p_category)
    and (
      p_community_id is null
      or (r.scope_type = 'community' and r.scope_id = p_community_id)
    )
    and (
      p_query is null
      or extensions.similarity(p.display_name, p_query) > 0.2
      or p.display_name ilike '%' || p_query || '%'
    )
  -- D29 e Â§7.2: a ordenaÃ§Ã£o NUNCA olha para r.source. RelevÃ¢ncia e nada mais.
  order by p.id, extensions.similarity(p.display_name, coalesce(p_query, '')) desc,
           p.display_name asc;
$$;

revoke all on function public.search_providers(public.provider_category, uuid, text)
  from public, anon;
grant execute on function public.search_providers(public.provider_category, uuid, text)
  to authenticated;
```

- [ ] **Step 2: o pgTAP da busca â€” e o teste que existe sÃ³ para a D29**

  `supabase/tests/provider-search-scope.sql`:

  - membro da vila A busca sem filtro â†’ vÃª a ficha do prestador da vila A
  - o mesmo membro **nÃ£o** vÃª a ficha de um prestador cujo alcance Ã© sÃ³ a vila B
  - filtro por categoria devolve sÃ³ aquela categoria
  - busca por nome parcial ("clima" achando "Climatiza Manaus") funciona
  - **o teste da D29:** duas fichas na mesma categoria, uma com `source = 'paid'` e outra
    `'free'`, com nomes escolhidos para que a ordem alfabÃ©tica coloque a grÃ¡tis primeiro. A
    busca **tem que** devolver a grÃ¡tis primeiro. Se um dia alguÃ©m "otimizar" a ordenaÃ§Ã£o para
    priorizar o pagante, este teste fica vermelho, e Ã© para isso que ele existe.

- [ ] **Step 3: a vitrine entra em "cidade"**

  Substitua o `EmptyState` de `city-reference.tsx` (seÃ§Ã£o `city-vitrine-heading`, o bloco que
  hoje diz *"Isso Ã© trabalho da onda G"*) por: filtro de categoria (as doze), campo de busca
  por nome, e a lista de resultados com link para `/prestadores/[id]`.

  O estado vazio continua existindo e continua honesto â€” vila sem prestador cadastrado Ã© o
  estado normal no dia um, e a Â§3.4 avisa que categoria demais com prestador de menos faz tudo
  parecer vazio ao mesmo tempo. **NÃ£o abra as doze categorias como abas vazias**; mostre o
  filtro sÃ³ quando houver ficha.

- [ ] **Step 4: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): busca por categoria e nome com pg_trgm, dentro do alcance"
```

---

## Task 6: a conversa membro â†” prestador â€” trÃªs defeitos antes do contexto novo

D36 reaproveita a mÃ¡quina de DM em vez de reconstruÃ­-la, e o `BIVAQUE.md` Â§8 Ã© explÃ­cito sobre
a consequÃªncia: *"as correÃ§Ãµes de bloqueio e contexto passam a ser prÃ©-requisito da onda G"*.

O `PRODUCT_STATUS.md` Â§8 lista os trÃªs defeitos. Todos confirmados na leitura de
`supabase/migrations/20260802001500_dm_contextual.sql`:

| # | Defeito | Onde | Efeito |
|---|---|---|---|
| 1 | **CriaÃ§Ã£o por ordem de UUID** | `dm_conversations_ordered check (participant_a < participant_b)` (linha 26) somado a `participant_a = (select auth.uid())` na policy de insert (linha ~229) | sÃ³ quem tem o UUID menor consegue abrir conversa. O outro recebe violaÃ§Ã£o de constraint. Metade dos pares estÃ¡ quebrada, e qual metade Ã© sorteio |
| 2 | **Bloqueio contornÃ¡vel pelo bloqueador** | `dm_messages_insert_sender` checa apenas `private.is_dm_blocked_by_other` | quem bloqueia continua podendo escrever para quem bloqueou. Bloqueio que nÃ£o protege Ã© pior que bloqueio nenhum |
| 3 | **Contexto declarado nÃ£o validado** | `private.can_dm_between` confere que existe *alguma* relaÃ§Ã£o; `context_type` e `context_id` entram como o cliente mandar | a conversa alega uma origem que ninguÃ©m conferiu, e a moderaÃ§Ã£o da onda H vai ler esse campo como se fosse fato |

**Arquivos:**
- Criar: `supabase/migrations/<ts>_dm_provider_context.sql`
- Modificar: `supabase/tests/dm-context-denials.sql`, `supabase/tests/dm-context-allowed.sql`
- Modificar: `apps/web/app/components/bivaque/chat-thread.tsx`
- Modificar: `apps/web/app/(shell)/prestadores/[id]/page.tsx` (o botÃ£o "Conversar")
- Modificar: `apps/web/app/(provider)/prestador/page.tsx` (a caixa de pedidos)

- [ ] **Step 1: corrigir o defeito 1 â€” o par Ã© ordenado no servidor**

  Mantenha o `check (participant_a < participant_b)`: ele Ã© o que garante uma conversa por par.
  O que muda Ã© **quem ordena**. Um RPC passa a ser o Ãºnico caminho de criaÃ§Ã£o.

  > **Ordem dentro da migration importa:** este RPC chama `private.dm_context_valid`, que o
  > Step 3 define. Escreva os quatro steps num arquivo sÃ³, com o helper **antes** da funÃ§Ã£o
  > que o usa â€” plpgsql nÃ£o valida a referÃªncia na criaÃ§Ã£o, mas `create function` que chama
  > SQL inexistente falha no primeiro uso, e vocÃª vai descobrir isso no pgTAP em vez de no
  > `db:reset`.

```sql
create function public.open_conversation(
  p_other_user_id uuid,
  p_context_type public.dm_context_type,
  p_context_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null or v_me = p_other_user_id then
    raise exception 'invalid conversation' using errcode = '22023';
  end if;

  if not private.dm_context_valid(v_me, p_other_user_id, p_context_type, p_context_id) then
    raise exception 'no valid context between these users' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = p_other_user_id)
       or (blocker_user_id = p_other_user_id and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A ordenaÃ§Ã£o Ã© aqui, e sÃ³ aqui. O cliente nunca escolhe quem Ã© A.
  v_a := least(v_me, p_other_user_id);
  v_b := greatest(v_me, p_other_user_id);

  -- O `do update` nÃ£o muda nada: Ã© o idioma para conseguir RETURNING quando a
  -- linha jÃ¡ existe. Reabrir conversa Ã© devolver a mesma, nÃ£o criar outra.
  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, p_context_type, p_context_id)
  on conflict (participant_a, participant_b) do update set participant_a = excluded.participant_a
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.open_conversation(uuid, public.dm_context_type, uuid)
  from public, anon;
grant execute on function public.open_conversation(uuid, public.dm_context_type, uuid)
  to authenticated;

-- E o caminho antigo fecha: sem policy de insert, a tabela sÃ³ aceita o RPC.
drop policy dm_conversations_insert_context_gated on public.dm_conversations;
revoke insert on table public.dm_conversations from authenticated;
```

- [ ] **Step 2: corrigir o defeito 2 â€” bloqueio nos dois sentidos**

```sql
create or replace function private.is_dm_blocked_either_way(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dm_conversations c
    join public.dm_blocks b
      on (b.blocker_user_id = c.participant_a and b.blocked_user_id = c.participant_b)
      or (b.blocker_user_id = c.participant_b and b.blocked_user_id = c.participant_a)
    where c.id = p_conversation_id
  );
$$;

grant execute on function private.is_dm_blocked_either_way(uuid) to authenticated;

drop policy dm_messages_insert_sender on public.dm_messages;
create policy dm_messages_insert_sender
on public.dm_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_dm_participant(conversation_id)
  and not private.is_dm_blocked_either_way(conversation_id)
);
```

- [ ] **Step 3: corrigir o defeito 3 â€” o contexto declarado Ã© conferido**

  `private.dm_context_valid(a, b, context_type, context_id)` substitui o
  `can_dm_between` no caminho de criaÃ§Ã£o. Cada ramo confere **aquele** contexto:
  `shared_group` â†’ os dois tÃªm `group_memberships` aprovada **naquele** `group_id`;
  `shared_event` â†’ os dois tÃªm `event_rsvps` **naquele** `event_id`;
  `recommendation_thread` â†’ os dois participam **daquela** `request_id`;
  `accepted_family` â†’ existe `private.family_account_links` entre os dois;
  `provider` â†’ o `context_id` Ã© uma `provider_profiles.id`, um dos dois Ã© o
  `owner_user_id` dela, e o outro pode vÃª-la (`private.can_see_provider`).

  Mantenha `can_dm_between` no schema: outras chamadas podem existir e removÃª-la nÃ£o Ã© o
  escopo desta task. Se ela ficar Ã³rfÃ£ ao fim da onda, remova aÃ­.

- [ ] **Step 4: o contexto novo, e quem pode iniciar**

```sql
alter type public.dm_context_type add value if not exists 'provider';
```

  **SÃ³ o membro inicia.** O prestador responde dentro de conversa existente, nunca abre uma.
  O motivo Ã© a fronteira do produto: uma conta civil abrindo conversa com militar
  identificÃ¡vel Ã© contato nÃ£o solicitado, e Ã© a porta que a rede fecha na entrada. O
  `dm_context_valid` do ramo `provider` exige que **quem chama** (`v_me`) nÃ£o seja o dono da
  ficha.

- [ ] **Step 5: os testes â€” cada defeito tem positivo e negativo**

  Em `supabase/tests/dm-context-denials.sql` e `dm-context-allowed.sql`:

  - defeito 1: o participante de **UUID maior** abre conversa com sucesso (hoje falha)
  - defeito 2: quem bloqueou **nÃ£o** consegue enviar mensagem (hoje consegue); quem foi
    bloqueado tambÃ©m nÃ£o (continua)
  - defeito 3: `open_conversation` com `context_type = 'shared_group'` e um `context_id` de
    grupo do qual os dois **nÃ£o** participam â†’ negado, mesmo existindo outra relaÃ§Ã£o entre eles
  - contexto novo: membro que vÃª a ficha abre conversa com o prestador â†’ **ok**
  - membro que **nÃ£o** vÃª a ficha (outra vila) â†’ **negado**
  - prestador tentando abrir conversa com membro â†’ **negado**
  - prestador respondendo dentro de conversa aberta pelo membro â†’ **ok**

- [ ] **Step 6: as trÃªs telas**

  `chat-thread.tsx` passa a chamar `open_conversation` em vez de inserir direto. A ficha ganha
  o botÃ£o "Conversar". O painel do prestador ganha a caixa de pedidos, que Ã© a lista de
  conversas com contexto `provider`.

  **O que o prestador vÃª do membro:** o `display_name` do perfil e nada mais. NÃ£o o e-mail, nÃ£o
  a vila, nÃ£o a afiliaÃ§Ã£o. Escreva isso como comentÃ¡rio na consulta, porque Ã© a linha que um
  refactor futuro vai atravessar sem perceber.

  > **E ele nÃ£o consegue ler isso pelo caminho normal.** `profiles_select_visible_in_locality`
  > (`20260817031237_belonging_multi_membership.sql:102-109`) devolve o perfil quando Ã© o do
  > prÃ³prio usuÃ¡rio **ou** quando `private.shares_locality_with(user_id)` Ã© verdadeiro. O
  > prestador nÃ£o tem `locality_memberships` por construÃ§Ã£o (D37), entÃ£o **nenhuma linha de
  > `profiles` Ã© visÃ­vel para ele** â€” a caixa de pedidos renderizaria "sem nome" para todo
  > mundo. Isso nÃ£o Ã© bug a corrigir afrouxando a policy; Ã© a fronteira funcionando.
  >
  > A saÃ­da Ã© um RPC estreito, no molde dos que jÃ¡ existem em `apps/web/lib/profile-rpcs.ts`:

```sql
-- Devolve o display_name do OUTRO participante de uma conversa em que quem
-- chama participa. Uma coluna, uma linha, e sÃ³ dentro de conversa existente:
-- nÃ£o Ã© diretÃ³rio de pessoas (D43), Ã© o nome de quem jÃ¡ estÃ¡ falando com vocÃª.
create function public.conversation_counterpart_name(p_conversation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pr.display_name
  from public.dm_conversations c
  join public.profiles pr
    on pr.user_id = case
      when c.participant_a = (select auth.uid()) then c.participant_b
      else c.participant_a
    end
  where c.id = p_conversation_id
    and ((select auth.uid()) in (c.participant_a, c.participant_b));
$$;

revoke all on function public.conversation_counterpart_name(uuid) from public, anon;
grant execute on function public.conversation_counterpart_name(uuid) to authenticated;
```

  Teste negativo obrigatÃ³rio: quem **nÃ£o** participa da conversa recebe nulo, nÃ£o o nome.

- [ ] **Step 7: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "fix(dm): ordem do par, bloqueio bidirecional e contexto conferido; abre contexto provider"
```

---

# Bloco 2 â€” o alcance pago

> **NÃ£o comece sem o ADR do alcance pago e sem o CNPJ.** As duas tasks abaixo sÃ£o R3 por dois
> motivos independentes (monetizaÃ§Ã£o e pagamento), e a segunda depende de uma conta Asaas que
> sÃ³ existe com pessoa jurÃ­dica (Â§7.6).

---

## Task 7: o alcance pago â€” o produto antes do dinheiro

Esta task **nÃ£o toca em cobranÃ§a**. Ela entrega o que o pagante compra e as trÃªs garantias que
o Â§7.4 exige, com o dinheiro ainda desligado. Ã‰ deliberado: se o produto nÃ£o estiver certo sem
dinheiro, ele nÃ£o fica certo com dinheiro.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_paid_reach.sql`
- Criar: `supabase/tests/provider-paid-reach.sql`
- Modificar: `apps/web/app/(shell)/prestadores/page.tsx` e `[id]/page.tsx` (o rÃ³tulo)
- Modificar: `apps/web/app/(provider)/prestador/page.tsx` (o bloco de alcance)

- [ ] **Step 1: a assinatura, como estado do produto**

```sql
create type public.provider_subscription_status as enum (
  'inactive', 'pending_payment', 'active', 'past_due', 'canceled'
);

create table public.provider_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  status public.provider_subscription_status not null default 'inactive',
  -- ReferÃªncia opaca ao Asaas. NUNCA cartÃ£o, NUNCA CPF/CNPJ do prestador:
  -- Â§7.3 e D41 â€” o checkout Ã© hospedado e o cartÃ£o nunca toca o Bivaque.
  external_reference text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 2: ligar e desligar o alcance Ã© uma funÃ§Ã£o sÃ³**

```sql
-- O Ãºnico caminho que escreve provider_reach com source='paid'. Assinatura
-- ativa liga; qualquer outro estado desliga. Sem esta concentraÃ§Ã£o, "past_due"
-- vira alcance eterno na primeira falha de webhook.
create function public.sync_paid_reach(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active boolean;
begin
  -- A decisÃ£o 3 do ADR do alcance pago dÃ¡ SETE DIAS de tolerÃ¢ncia em `past_due`:
  -- falha de cobranÃ§a nÃ£o pode apagar a ficha das outras vilas no mesmo minuto,
  -- porque a maioria das falhas Ã© boleto que atrasou, nÃ£o cliente que sumiu.
  -- Sem esta janela a funÃ§Ã£o contradiz o ADR â€” e o teste da Task 7 pega isso.
  select exists (
    select 1 from public.provider_subscriptions
    where provider_id = p_provider_id
      and (
        status = 'active'
        or (
          status = 'past_due'
          and current_period_end is not null
          and current_period_end > now() - interval '7 days'
        )
      )
  ) into v_active;

  update public.provider_reach
     set active = v_active
   where provider_id = p_provider_id
     and source = 'paid';
end;
$$;

revoke all on function public.sync_paid_reach(uuid) from public, anon, authenticated;
grant execute on function public.sync_paid_reach(uuid) to service_role;
```

- [ ] **Step 3: o que o pagante comprou fica declarado**

  Â§7.4 filtro 2: *"O que o pagante comprou estÃ¡ declarado como pago, visivelmente? Se nÃ£o, Ã©
  engano."* Toda ficha que aparece num escopo por `source = 'paid'` exibe um `Chip` com
  **"Alcance patrocinado"** â€” na busca e na prÃ³pria ficha. O `search_providers` jÃ¡ devolve
  `reach_source`; use-o para o rÃ³tulo e **nunca** para a ordem.

- [ ] **Step 4: os testes que protegem as trÃªs regras**

  `supabase/tests/provider-paid-reach.sql`:

  - assinatura `active` â†’ o membro da vila B **passa** a ver a ficha do prestador da vila A
  - assinatura `past_due` com `current_period_end` de ontem â†’ **ainda vÃª** (a tolerÃ¢ncia de
    7 dias da decisÃ£o 3 do ADR)
  - assinatura `past_due` com `current_period_end` de dez dias atrÃ¡s â†’ **deixa de ver**
  - assinatura cancelada â†’ o alcance **grÃ¡tis na vila prÃ³pria continua intacto** (D28: a ficha
    na prÃ³pria vila Ã© grÃ¡tis, sempre, completa â€” cancelar assinatura nÃ£o pode enterrar ninguÃ©m,
    que Ã© o proibido nÂº 2 do Â§7.3)
  - a ordenaÃ§Ã£o da busca continua ignorando `source` (repita a asserÃ§Ã£o da Task 5 aqui, com
    assinatura ativa â€” Ã© o mesmo invariante em outro estado do mundo)
  - `authenticated` chamando `sync_paid_reach` diretamente â†’ **negado**

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): alcance pago como estado do produto, declarado e fora da ordenacao"
```

---

## Task 8: Asaas â€” checkout hospedado e webhook

D41: **checkout hospedado, o cartÃ£o nunca toca o Bivaque**. O Bivaque guarda uma referÃªncia
opaca e reage a webhook. Nada mais.

**Arquivos:**
- Criar: `apps/web/app/api/webhooks/asaas/route.ts`
- Criar: `apps/web/lib/billing/asaas.ts`
- Criar: `tests/unit/billing/asaas-webhook.test.ts`
- Criar: `tests/unit/billing/fixtures/asaas-*.json`
- Modificar: `apps/web/app/(provider)/prestador/page.tsx` (o botÃ£o de assinar)

- [ ] **Step 1: o cliente, server-side e sÃ³**

  `apps/web/lib/billing/asaas.ts` lÃª a chave de `process.env["ASAAS_API_KEY"]`. **Nunca**
  `NEXT_PUBLIC_*` â€” o Next inclina qualquer `NEXT_PUBLIC_` no bundle do cliente, e isso
  publicaria a chave. O mesmo cuidado que `apps/web/lib/portal/client.ts` jÃ¡ toma com a chave
  do Portal. Nenhum log ecoa a chave nem o payload; o scrub de PII de
  `packages/domain/src/pii-scrub.ts` roda antes de qualquer `log.error`.

- [ ] **Step 2: o webhook, com assinatura e idempotÃªncia**

  A rota valida o segredo do webhook **antes** de ler o corpo, rejeita com 401 sem detalhe,
  grava o evento numa tabela de eventos processados com `unique (external_event_id)` e ignora
  repetido â€” provedor de pagamento reentrega, e reentrega Ã© o caso normal, nÃ£o o excepcional.
  Depois atualiza `provider_subscriptions.status` e chama `public.sync_paid_reach`.

  **Proibido retry automÃ¡tico em laÃ§o** (Â§7.9 estabeleceu a regra contra o Portal; ela vale
  para qualquer terceiro): responda 200 ao que jÃ¡ processou, 5xx ao que falhou, e deixe o
  provedor reentregar.

- [ ] **Step 3: os testes, com fixture e sem rede**

  `tests/unit/billing/asaas-webhook.test.ts`. Como no Portal, **nenhuma chamada real** e
  nenhum dado real: fixtures JSON com identificadores fictÃ­cios.

  - assinatura invÃ¡lida â†’ 401, e **nada** muda no banco
  - evento de pagamento confirmado â†’ `status = 'active'` e `sync_paid_reach` chamado
  - o **mesmo** evento entregue duas vezes â†’ segundo Ã© no-op
  - evento de atraso â†’ `past_due`
  - corpo malformado â†’ 400, sem exceÃ§Ã£o vazando para o log

- [ ] **Step 4: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(billing): webhook Asaas com assinatura, idempotencia e sincronizacao de alcance"
```

---

## Task 9: fechamento da onda

- [ ] **Step 1: os E2E â€” escritos, commitados, possivelmente nÃ£o rodados**

  EspecificaÃ§Ãµes novas em `tests/e2e/`: o membro acha um prestador pela busca da cidade e abre
  a ficha; o prestador entra pelo convite e publica um item de catÃ¡logo; o membro de outra vila
  nÃ£o acha a ficha.

  **Sem credencial inline** (`AGENTS.md`): leia do ambiente com fallback em
  `apps/web/.env.local` e lance erro quando nenhum dos dois fornecer â€” o modelo Ã©
  `tests/e2e/persistent-login.spec.ts`. E **`import.meta` nÃ£o existe** nos specs: eles sÃ£o
  transpilados para CJS e um `import.meta.dirname` aborta a coleta da suÃ­te inteira com
  `Total: 0 tests in 0 files`. Resolva caminho a partir de `process.cwd()`.

  Se o banco estiver sem seed, **commite sem executar** e registre no `PRODUCT_STATUS.md` como
  "cÃ³digo feito" â€” Ã© o terceiro estado documentado lÃ¡, e o `README.md` explica por que essa Ã© a
  Ãºnica saÃ­da honesta numa execuÃ§Ã£o autÃ´noma.

- [ ] **Step 2: a auditoria visual â€” ela bloqueia a onda seguinte**

```bash
node scripts/visual/loop.mjs
```

  Telas tocadas: `/localidade` (a vitrine), `/prestadores`, `/prestadores/[id]`, `/prestador` e
  as filhas, e as duas telas de convite. Veredito escrito em
  `docs/agents/VISUAL_AUDIT-2026-08-<dd>-onda-g.md`, no formato dos que jÃ¡ existem em
  `docs/agents/`.

  Depois da captura, **antes de qualquer `test:db`**: `db:reset` limpo. A captura insere o
  perfil fantasma "Visual Capture" e seis asserts de pgTAP quebram parecendo regressÃ£o real.

- [ ] **Step 3: reconciliar o `PRODUCT_STATUS.md`**

  As cinco linhas do Â§7 e a linha "Conversa membro â†” prestador" do Â§8. Uma linha sÃ³ sai quando
  o ciclo do usuÃ¡rio fecha â€” entrada, aÃ§Ã£o, feedback, acompanhamento e o sad path principal.
  Capacidade no banco nÃ£o fecha linha. Troque `[A]` por `[V]` no que vocÃª reconferiu.

- [ ] **Step 4: commit final**

```bash
git commit -m "docs(status): reconciliar vitrine e conversa membro-prestador apos a onda G"
```

---

## Se alguma coisa aqui estiver errada

Um plano errado Ã© informaÃ§Ã£o, nÃ£o obstÃ¡culo. **Pare e reporte** em vez de improvisar,
especialmente nestes quatro pontos:

1. Qualquer coisa que exija o Bivaque intermediar pagamento de serviÃ§o (D26).
2. Qualquer ordenaÃ§Ã£o que olhe para `provider_reach.source` (D29).
3. Qualquer `service_role` num caminho de usuÃ¡rio sem helper de acesso antes (regra 1 da Â§12).
4. Qualquer coluna de escopo que nasÃ§a sem a policy que a lÃª (regra 6 da Â§12) â€” sÃ£o quatro
   vazamentos de privacidade neste repositÃ³rio com essa mesma origem.
