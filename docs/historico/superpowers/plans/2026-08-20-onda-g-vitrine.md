# Onda G — a vitrine

> Plano de execução. Escrito em **2026-08-20**. Marque `- [x]` conforme avança e **commite por
> task**.
>
> Leia [`README.md`](README.md) deste diretório inteiro antes de abrir qualquer task.

## O que esta onda é

A vitrine é uma das quatro coisas que o nível municipal é (`BIVAQUE.md` §6.2) e é **o
comportamento que o grupo de WhatsApp de 630 pessoas já demonstra hoje** — peixe, marmita,
ar-condicionado, despachante. Ã‰ também a **única onda com receita** (§10.2).

Entrega, na ordem: a conta do prestador civil, a ficha, o painel dele, a busca, a conversa
membro â†” prestador e o alcance pago.

## O que esta onda não é

- **Não intermedia pagamento de serviço.** D26 e §7.3 regra 1: o dinheiro do corte de cabelo
  nunca passa pelo Bivaque. O que se cobra é produto da plataforma (§7.2), nunca a transação
  alheia. Se alguma task levar você a escrever "checkout do serviço", **pare e reporte**.
- **Não ordena por dinheiro.** D29 e §7.3 regra 3. A ordenação é relevância e reputação. A
  Task 7 tem um teste que existe só para provar isso.
- **Não entrega prova social nem avisos.** D45 adia os dois: prova social depende do ciclo de
  indicação rodando (onda F), avisos dependem de moderação (onda H).
- **Não abre DM entre membros.** D31 mantém adiada. O que abre é **membro â†” prestador** (D36).

## Dois blocos, e o segundo pode virar onda própria

| Bloco | Tasks | Depende de CNPJ | O que entrega |
|---|---|---|---|
| **G1 — a vitrine** | 1 a 6 | não | conta, ficha, painel, busca, conversa |
| **G2 — o alcance pago** | 7 e 8 | **sim** | assinatura, webhook, alcance além da vila |

O `README.md` já previa "G — provavelmente dividida em duas". Está dividida aqui. Se dezembro
apertar, **o corte é entre a Task 6 e a Task 7**, e o G1 sozinho entrega o §6.2 inteiro. A
ordem de corte sugerida pela §9.1 é a mesma: monetização primeiro.

---

## Portão humano — dois ADRs antes da Task 1

A [`RISK_MATRIX.md`](../../decisions/RISK_MATRIX.md) eleva automaticamente qualquer plano que
contenha `marketplace`, `monetização`, `pricing`, `privacidade`, `visibilidade` ou `acesso` —
esta onda contém os seis. E qualquer plano que toque RLS, dado pessoal ou pagamento **é R3**,
o que exige **ADR aprovado, `critic_verdict: PASS` e aprovação humana registrada**.

Hoje **não existe ADR nenhum para a vitrine**. As decisões D20, D28, D37, D41, D44 e D45 vivem
na tabela do §9 do `BIVAQUE.md`, que é onde moram as decisões **não-R3**. Isso é uma lacuna de
governança, não um detalhe de forma: a onda G cria um **tipo de conta civil dentro de uma rede
de militares identificáveis** e depois liga um meio de cobrança nela.

**Os dois ADRs foram aprovados pelo dono em 2026-08-20** — `status: accepted`,
`critic_verdict: PASS`, aprovação registrada na seção `Approval` de cada um:

| ADR | Cobre | Estado |
|---|---|---|
| [`ADR-20260820-conta-de-prestador`](../../decisions/ADR-20260820-conta-de-prestador.md) | entrada por indicação, o que o prestador vê, quem inicia conversa, telefone opt-in, o prestador como titular de dados | **aprovado** — Tasks 1 a 6 destravadas |
| [`ADR-20260820-alcance-pago`](../../decisions/ADR-20260820-alcance-pago.md) | o que o pagante compra, preço, tolerância de atraso, o rótulo, Asaas | **aprovado**, mas as Tasks 7 e 8 seguem paradas pelo CNPJ |

A revisão que precedeu a aprovação achou e corrigiu seis defeitos de implementabilidade neste
plano — o `critic_review` de cada ADR os lista. **O crítico não foi independente** (foi quem
escreveu os ADRs), e isso está registrado lá em vez de omitido: se durante a execução alguma
decisão se mostrar errada, ela é reabrível.

**As sete decisões do ADR 1 que este plano executa**, para você reconhecer quando estiver
escrevendo o código: indicação por membro **aprovado** da comunidade, com cota de cinco (Task
2); a ficha sobrevive à saída de quem indicou, e revogar é ato do dono da comunidade (Task 3);
o prestador vê a própria ficha e as conversas que recebeu, e dentro delas só o `display_name`
(Task 6); **só o membro inicia conversa** (Task 6); o prestador pode denunciar **mensagem, e só
mensagem** (é a resposta à pergunta que a onda H deixa aberta na Task 1 dela); telefone é
opt-in e a ficha funciona sem ele (Task 3); e a seção do prestador em `legal/PRIVACIDADE.md`
entra antes da primeira ficha real.

**As sete do ADR 2:** o escopo é a unidade vendida; **R$ 49/mês** cobrindo todas as vilas da
localidade mais o nível municipal; **7 dias de tolerância** em `past_due`; a ordenação nunca lê
o dinheiro, com teste guardando; rótulo "Alcance patrocinado" visível; checkout hospedado com
cartão fora do Bivaque; e a lista fechada do que nunca entra na venda.

Se você discordar de alguma delas durante a execução, **pare e reporte** — a discordância vai
para o ADR, não para o código.

**Bloqueios humanos que nenhum agente resolve:**

- **CNPJ** — trava o Bloco 2 inteiro (§7.6 depende de parecer jurídico).
- **Resend com domínio verificado** — a Task 2 manda e-mail para um civil que não tem conta.
  Sem o adaptador real da D1, o convite fica no `outbox` e ninguém recebe.
- **O parágrafo do prestador em `legal/PRIVACIDADE.md`.**

As Tasks 1, 3, 4, 5 e 6 não dependem do CNPJ e podem correr enquanto ele não existe. **A Task 1
pode começar agora.**

---

## Precedência: esta onda vem depois de cinco

```
P0 â†’ T â†’ D2 â†’ E â†’ F â†’ G
```

E é dependência real, não ordem administrativa:

1. **A onda E define onde a vitrine aterrissa.** O `ADR-20260816-shells-e-navegacao` é
   explícito e o código já registra a decisão em
   `apps/web/app/components/bivaque/bottom-nav.tsx:33-34`: *"vitrine e busca de prestador caem
   AQUI"* — no container **"cidade"**, `/localidade`. Não crie aba nova. Se um destino desta
   onda não couber em "cidade", **pare e reporte** (regra falsificável do ADR).
2. **A onda E já deixou o buraco pronto.** `apps/web/app/components/bivaque/city-reference.tsx`
   tem um `EmptyState` honesto que diz *"Isso é trabalho da onda G"* — a Task 5 o substitui.
3. **A onda D1 entrega o `outbox`**, que é como o convite da Task 2 sai.
4. **A onda F mexe na máquina de indicação**, que compartilha o `can_dm_between` com a Task 6.

## Contexto obrigatório antes de começar

1. [`docs/BIVAQUE.md`](../../BIVAQUE.md) §1.3 (a linha do prestador), §6.2, §7.1 a §7.4
   (a linha da monetização, as categorias, os cinco proibidos, o filtro de três perguntas),
   §12 (as oito regras permanentes) e as decisões D17, D20, D26 a D29, D36, D37, D41, D44, D45.
2. [`docs/PRODUCT_STATUS.md`](../../PRODUCT_STATUS.md) §7 inteiro (cinco linhas, todas
   "**não existe**") e §8, a linha **"Conversa membro â†” prestador"**, que lista os três
   defeitos que a Task 6 corrige.
3. As duas lições do E2E no `README.md`: `notFound()` responde **200** no Next 16, e o
   PostgREST **não resolve embed onde não há foreign key** — e esta onda cria tabelas novas
   que precisam de FK explícita para `profiles` se você quiser embutir o nome.

## O que já existe e você não deve reimplementar

| Peça | Onde | Use como |
|---|---|---|
| Shell do operador e do dono | `app/(admin)/layout.tsx`, `app/(owner)/` | modelo do shell do prestador (Task 1) |
| Gate de papel por RPC | `20260806111744_is_current_user_operator.sql` | modelo exato de `is_provider_account` |
| Convite atado ao e-mail | `private.family_invitations` + `public.create_family_invitation` | modelo do convite de prestador (Task 2) |
| Bucket privado com policies | `20260821000015_event_photos_bucket.sql` | modelo do bucket de fotos da ficha |
| Máquina de DM | `20260802001500_dm_contextual.sql` | é a máquina que a Task 6 corrige e estende |
| Placeholder da vitrine | `city-reference.tsx` (seção `city-vitrine-heading`) | é o que a Task 5 substitui |

---

## Task 1: a fronteira do prestador nasce antes da ficha

O prestador é **usuário do Auth com papel e sem membership** (D37). O motivo está escrito na
própria decisão: *"sem membership nenhuma policy de conteúdo casa: falha fechado por
construção"*. Toda policy de leitura de conteúdo deste schema pergunta por
`locality_memberships` ou `community_memberships`; um usuário sem nenhuma das duas não lê nada,
por construção, e é isso que queremos.

**Mas há um obstáculo estrutural que o `PRODUCT_STATUS.md` não registra e que você vai bater
de frente já no primeiro login:** `apps/web/middleware.ts:135-153` manda **qualquer**
autenticado sem `locality_memberships` para o funil de onboarding do membro. Um prestador que
fizer login hoje cai em `/onboarding`, é convidado a digitar CPF, e não existe saída. A
fronteira e o roteamento nascem juntos ou o tipo de conta não existe.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_accounts.sql`
  (`npx pnpm@11.18.0 exec supabase migration new provider_accounts`)
- Criar: `supabase/tests/provider-account-boundary.sql`
- Modificar: `apps/web/middleware.ts:135-153`
- Criar: `apps/web/app/(provider)/layout.tsx`
- Criar: `apps/web/app/(provider)/prestador/page.tsx`

**Interfaces que as tasks seguintes consomem:**
- `public.provider_accounts(auth_user_id, invited_by, community_id, locality_id, created_at, revoked_at)`
- `public.is_provider_account(p_user_id uuid) returns boolean` — `service_role` apenas, mesmo
  contrato de `is_current_user_operator`
- `private.is_provider_account(p_user_id uuid) returns boolean` — o mesmo predicado para uso
  **dentro de policy**, concedido a `authenticated`
- `public.my_account_kind() returns text` — `'member' | 'provider' | null`, escopada por
  `auth.uid()` (sem parâmetro para errar), concedida a `authenticated`

- [ ] **Step 1: a migration — tabela, RLS e os dois helpers**

```sql
-- A conta do prestador civil. D37: usuário do Auth com papel, sem membership.
-- Quem atesta "é bom prestador" é a comunidade que o indicou (§4.1), por isso
-- community_id é NOT NULL: uma ficha órfã de comunidade não tem quem a atestou.
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

-- O prestador enxerga a própria linha. Ninguém mais lê a lista: o roster de
-- prestadores de uma vila é informação de operação, não de membro — mesmo
-- motivo do 20260806100231_restrict_operator_roster.sql.
create policy provider_accounts_select_self
on public.provider_accounts
for select
to authenticated
using (auth_user_id = (select auth.uid()));

-- Espelha is_current_user_operator: o chamador roda como service_role (que
-- bypassa RLS), então auth.uid() é NULL dentro da função e o id vem explícito.
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

-- O mesmo predicado, alcançável de dentro de uma policy. A decisão 5 do ADR da
-- conta de prestador manda a policy de insert de `reports` perguntar se quem
-- escreve é prestador, e policy é avaliada como `authenticated` — que não tem
-- EXECUTE na função acima e nunca vai ter. O par public/private é o mesmo
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

-- O middleware roda com o cliente anônimo do usuário, não com service_role.
-- Por isso este segundo helper escopa por auth.uid() e NÃƒO aceita parâmetro —
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

- [ ] **Step 2: o pgTAP da fronteira — positivo e negativo**

  A regra 7 da §12 não tem exceção: todo caminho de permissão tem os dois. Crie
  `supabase/tests/provider-account-boundary.sql` no formato de
  `supabase/tests/reports-denials.sql` (fixtures incluídas dentro da transação, rollback no
  fim). O prestador de fixture é um `auth.users` novo, **sem** `locality_memberships`.

  As asserções que precisam existir, todas com `set local role authenticated` e o
  `request.jwt.claim.sub` do prestador:

  - `is_empty('select 1 from public.posts', 'prestador nao le post nenhum')`
  - `is_empty('select 1 from public.profiles', 'prestador nao le perfil nenhum')`
  - `is_empty('select 1 from public.groups', 'prestador nao le grupo nenhum')`
  - `is_empty('select 1 from public.communities', 'prestador nao le comunidade nenhuma')`
  - `is_empty('select 1 from public.events', 'prestador nao le evento nenhum')`
  - `throws_ok` no `insert into public.posts (...)` — 42501
  - a linha própria em `provider_accounts` **é** visível: `isnt_empty(...)`
  - a linha de **outro** prestador não é: `is_empty(...)`
  - `select is(public.my_account_kind(), 'provider', ...)` para o prestador
  - `select is(public.my_account_kind(), 'member', ...)` para `member-one`

  Rode: `npx pnpm@11.18.0 exec supabase test db`. **Sem dev server e sem captura visual
  rodando** — a armadilha do perfil fantasma quebra seis asserts alheios e você vai passar uma
  hora procurando no lugar errado.

- [ ] **Step 3: o middleware para de empurrar o prestador para o CPF**

  Em `apps/web/middleware.ts`, o bloco que hoje começa em `const isMember = await supabase`
  (linha 135) faz uma consulta a `locality_memberships` e, no `null`, chama
  `my_verification_status`. Troque a consulta pelo `my_account_kind()`, que responde as duas
  perguntas numa ida só:

```ts
const { data: kindRows, error: kindError } = await supabase.rpc("my_account_kind")
if (kindError) {
  // Não dá para rotear com segurança. Falha fechado no onboarding do membro,
  // que é a tela determinística — mesmo critério do bloco que este substitui.
  return NextResponse.redirect(new URL("/onboarding", request.url))
}
const kind = (kindRows ?? null) as "member" | "provider" | null

if (kind === "provider") {
  // O prestador vive fora do shell do membro. Deixe-o passar em /prestador e
  // mande de volta para lá em qualquer outra rota — ele não tem membership e
  // toda policy de conteúdo já o nega; o redirect evita a tela vazia.
  return pathname.startsWith("/prestador")
    ? supabaseResponse
    : NextResponse.redirect(new URL("/prestador", request.url))
}

if (kind === null) {
  // ... aqui entra, sem alteração, o bloco de my_verification_status que já existe
}
```

  Cuidado com a ordem: o bloco de `/onboarding` (linhas 102-110) vem **antes** e continua
  antes — um prestador nunca chega lá porque o redirect acima o intercepta.

- [ ] **Step 4: o shell do prestador**

  `apps/web/app/(provider)/layout.tsx`, no molde de `app/(admin)/layout.tsx`: lê o usuário pelo
  cliente com cookies, chama `is_provider_account` pelo `service_role`, e **redireciona o
  membro para `/community`** se ele cair ali. Sem `AppShell`, sem `bottom-nav` — a navegação do
  membro espelha o modelo de pertencimento (ADR de shells, regra 2) e o prestador não pertence
  a nada disso.

  `apps/web/app/(provider)/prestador/page.tsx` nesta task é **honesto e mínimo**: nome da
  comunidade que o indicou e a frase de que a ficha chega na próxima task. Regra 4 da §12 — UI
  só mostra affordance se o fluxo fecha hoje. Não desenhe botão de "criar ficha" ainda.

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git add supabase/migrations supabase/tests/provider-account-boundary.sql apps/web/middleware.ts "apps/web/app/(provider)"
git commit -m "feat(providers): conta de prestador com fronteira de acesso e roteamento proprio"
```

---

## Task 2: o convite de prestador — quem atesta é a comunidade

`BIVAQUE.md` §1.3: o prestador entra por **indicação de membro verificado**, e quem atesta é
**a comunidade que o indicou**. Não é auto-cadastro. Não é o operador.

O modelo existe e está pronto para copiar: o convite familiar (D16) já resolve o problema
difícil — **link encaminhado não pode provisionar quem abrir**, então o aceite confere o
e-mail-alvo. O prestador tem exatamente a mesma propriedade.

**Diferença de semântica que o código não pode confundir** (§5.4): o convite familiar concede
**acesso de membro sem CPF**; o de prestador **não concede acesso a nada** — cria uma conta que
só enxerga a própria ficha. São vias distintas e nunca compartilham tabela.

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
  tabela em **`private`**, `token_digest bytea` e `invitee_email_digest bytea` de 32 bytes —
  **nunca o e-mail em claro, nunca o token em claro** —, `status`, `expires_at`,
  `accepted_by_user_id`, e o `check` que amarra os três campos de aceite.

  Três regras próprias desta tabela:

```sql
-- Cota: cinco convites de prestador ativos por membro, mesma ordem de grandeza
-- do convite familiar (§5.4). Sem cota, um membro sozinho enche a vitrine.
create index provider_invitations_inviter_pending_idx
  on private.provider_invitations (inviter_user_id) where status = 'pending';

-- Só membro APROVADO da comunidade indica. Ser da cidade não basta: quem
-- atesta o prestador é a vila (§4.1), e a vila é community_memberships.
-- Esta checagem vive dentro de create_provider_invitation, não numa policy,
-- porque a tabela é private e authenticated não tem privilégio nenhum nela.
```

  `public.create_provider_invitation` é `security definer`, valida que
  `auth.uid()` tem `community_memberships.status = 'approved'` na `p_community_id`, valida a
  cota, grava os digests e **enfileira no `outbox`** (a fila da D1 é o único caminho de envio —
  ela é quem confere preferência e opt-out).

  `public.accept_provider_invitation` valida token + e-mail (comparando digests), cria a linha
  em `public.provider_accounts` com `invited_by`, `community_id` e `locality_id` copiados do
  convite, e marca o convite como `accepted`. **Não** cria `locality_memberships`. **Não** cria
  `profiles`.

- [x] **Step 2: o pgTAP — positivo e negativo** — 16 asserts em `supabase/tests/provider-invitation.sql`; suíte completa 91 arquivos / 1068 PASS

  `supabase/tests/provider-invitation.sql`, no molde de
  `supabase/tests/family-invite-email-binding.sql`:

  - membro aprovado da vila cria convite â†’ **ok**
  - membro da cidade **sem** `community_memberships` aprovada â†’ **negado**
  - prestador tentando criar convite â†’ **negado**
  - aceite com e-mail divergente do `invitee_email_digest` â†’ **negado** (este é o teste que o
    convite familiar existe para ter; não o copie pela metade)
  - aceite com token expirado â†’ **negado**
  - aceite duas vezes â†’ o segundo é **negado**
  - depois do aceite, `provider_accounts` tem a linha e `locality_memberships` **não** tem

- [x] **Step 3: as duas telas** — `/communities/[id]/indicar-prestador` no shell e aceite em `/prestador-convite/[token]`; DESVIO registrado: o aceite vive em `(preauth)` porque `(shell)` exige membership e redirecionaria o civil sem conta (URL preservada)

  **Indicar** (`(shell)/communities/[id]/indicar-prestador/page.tsx`): formulário com nome e
  e-mail, Server Action autenticada pelo **cliente com cookies** (regra 1 da §12 — o padrão a
  seguir está em `app/(shell)/communities/actions.ts:8-24`), feedback por `showToast`, e o
  aviso de que o prestador vai ver e não ver.

  **Aceitar** (`(shell)/prestador-convite/[token]/page.tsx`): a rota precisa entrar em
  `PUBLIC_PATHS` do middleware — quem abre o link ainda não tem conta. Confira o e-mail antes
  de provisionar, exatamente como `app/(shell)/invite/[token]/`.

- [x] **Step 4: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): convite de prestador atado ao e-mail, indicado pela comunidade"
```

---

## Task 3: a ficha — identidade, catálogo e portfólio

D45 fecha o escopo em três blocos, e o motivo está na própria decisão: *"são os três blocos que
o prestador preenche sozinho no dia um"*. Prova social e avisos ficam fora.

**A coluna de escopo e as policies que a leem nascem nesta mesma migration.** Regra 6 da §12,
que o `AGENTS.md` chama de "a falha que este repositório insiste em repetir — quatro vazamentos
de privacidade até aqui". O alcance da ficha (`provider_reach`) nasce aqui, com as policies,
mesmo que só a linha grátis exista até a Task 7.

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

- [x] **Step 1: as doze categorias, em um lugar só**

  §7.2.1 é uma **lista fechada** com três regras que o código precisa carregar. Em
  `packages/domain/src/index.ts`:

```ts
// BIVAQUE.md §7.2.1 — lista fechada. NÃƒO existe "Outros": vira depósito, chega
// a metade das fichas e mata o filtro. O que não couber é sinal para criar
// categoria por decisão, nunca por usuário. Categoria só se divide acima de
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
  alimentacao: "Alimentação",
  casa_e_reformas: "Casa e reformas",
  assistencia_tecnica: "Assistência técnica",
  mudanca_e_transporte: "Mudança e transporte",
  imoveis: "Imóveis",
  documentacao_e_financas: "Documentação e finanças",
  saude_e_bem_estar: "Saúde e bem-estar",
  beleza: "Beleza",
  educacao_e_aulas: "Educação e aulas",
  automotivo: "Automotivo",
  eventos_e_festas: "Eventos e festas",
  pets: "Pets",
}
```

  O enum do banco carrega os mesmos doze valores, na mesma ordem. Escreva um teste em
  `tests/unit/` que compare o array com o enum lido de `supabase/database.generated.ts` — é o
  tipo de divergência que só aparece em produção.

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
  -- O telefone é dado pessoal de um civil publicado para centenas de militares.
  -- Ele só aparece quando o prestador escolhe publicá-lo (ADR da conta de
  -- prestador). Em branco é estado válido e a ficha continua funcionando.
  contact_is_public boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O alcance. Nasce aqui, com as policies que o leem (regra 6 da §12).
-- 'free'  = a própria vila, sempre grátis e completa (D28).
-- 'paid'  = além dela. A Task 7 insere estas linhas; nenhuma existe hoje.
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
  -- §7.2.1 regra 3: produto e serviço convivem na mesma taxonomia. Item com
  -- foto, descrição e preço serve para corte de peixe e para limpeza pós-obra.
  -- Preço é opcional: "sob orçamento" é a resposta honesta de metade delas.
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
-- Quem vê a ficha: o dono dela, e quem pertence a algum escopo ativo do
-- alcance. Nada mais. Um membro de outra vila NÃƒO vê, e é exatamente essa
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
  pelo `id`, as outras três pelo `provider_id`), sempre com `and is_deleted = false` onde a
  coluna existe. `insert`/`update`/`delete` só para o dono
  (`owner_user_id = (select auth.uid())`). `enable` **e** `force` RLS nas quatro; `revoke all`
  antes dos grants mínimos.

  E o alvo de denúncia, porque ele nasce com a tabela e não depois:

```sql
alter type public.report_target_type add value if not exists 'provider_profile';
```

  > Se a **onda H** já tiver aterrissado, ela já roteia a ocultação por tipo de alvo — adicione
  > o ramo `provider_profile` ao RPC de resolução dela nesta mesma migration. Se a H ainda não
  > rodou, pare aqui: o valor do enum existe, a Task 1 da H cobre o resto.

- [x] **Step 3: o bucket das fotos**

  `provider-photos`, privado, 5 MB, `image/jpeg|png|webp`, no molde exato de
  `20260821000015_event_photos_bucket.sql`. `insert` só do dono
  (`owner = auth.uid()` **e** existe `provider_accounts` ativo); `select` gated por
  `private.can_see_provider` a partir do prefixo do caminho.

- [x] **Step 4: o pgTAP do escopo — os dois lados**

  `supabase/tests/provider-showcase-scope.sql`. Fixture: duas vilas na mesma cidade, um
  prestador com `reach` grátis só na vila A.

  - membro **aprovado** da vila A vê a ficha, o catálogo e o portfólio â†’ `isnt_empty` Ã— 3
  - membro da vila B **não vê** â†’ `is_empty` Ã— 3
  - membro da vila A com `status = 'pending'` **não vê** (aprovado â‰  pedinte)
  - membro da cidade sem vila nenhuma **não vê** — este é o teste que a Task 7 vai inverter
    quando existir alcance pago de `locality`; ele precisa estar vermelho de propósito lá
  - o dono vê a própria ficha mesmo sem alcance ativo
  - outro prestador **não vê** a ficha alheia
  - o dono edita a própria ficha; **não** edita a alheia (`throws_ok`, 42501)

- [x] **Step 5: a ficha vista pelo membro**

  `(shell)/prestadores/[id]/page.tsx`, Server Component, lendo pelo **cliente autenticado**
  (regra 1 da §12: nada de `service_role` aqui — a RLS é quem decide). Três blocos na ordem da
  D45: identidade, catálogo, portfólio. Quem não pode ver recebe `notFound()` — e lembre da
  lição do README: **no Next 16 isso responde 200**, então a asserção do E2E é sobre a UI
  ("não encontrado" presente, conteúdo protegido ausente), nunca sobre o status.

  Botão "Conversar" existe mas fica desabilitado com explicação até a Task 6 — ou, melhor pela
  regra 4 da §12, **não existe ainda**. Prefira não existir.

- [x] **Step 6: revogar a ficha é ato do dono da comunidade**

  A decisão 2 do ADR diz que a ficha **sobrevive** à saída de quem indicou, e que revogar é ato
  do dono da comunidade. Isso só é verdade se existir o ato — sem ele a decisão é prosa e a
  vila fica sem saída para uma ficha que virou problema.

  O console do dono já existe (`app/(owner)/communities/[id]/`, entregue pela D2 Task 9). Ele
  ganha a lista de fichas ativas da comunidade e a ação de revogar, com motivo:

```sql
-- Revogação pelo dono da comunidade que atestou. Não apaga a conta nem a
-- ficha: desliga o alcance e marca a data. Reversível, auditável, e é o
-- mesmo desenho de suspensão que a onda H usa para pessoa.
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
    raise exception 'a revogação exige motivo' using errcode = '22023';
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
  comunidade não revoga (42501); um membro comum não revoga; revogar sem motivo levanta; o
  prestador revogado continua conseguindo entrar e ver a própria ficha (ele não foi banido — a
  vitrine dele é que saiu do ar), e **não** consegue reativar o alcance sozinho.

- [x] **Step 7: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): ficha com identidade, catalogo, portfolio, alcance e revogacao pelo dono"
```

---

## Task 4: o painel do prestador

D37 diz o que ele tem: **anúncio, métrica e caixa de pedidos**. Duas das três dependem de
outras ondas, e o painel precisa dizer isso em vez de fingir.

| Bloco | Estado nesta task |
|---|---|
| Ficha, catálogo, portfólio | **entrega completa** — criar, editar, reordenar, remover |
| Caixa de pedidos | **chega na Task 6** — não desenhe caixa vazia antes |
| Métrica | **depende do PostHog, que é onda H** — estado vazio honesto, nunca número inventado |
| Alcance | mostra o alcance atual (vila própria, grátis); o upgrade chega na Task 7 |

**Arquivos:**
- Modificar: `apps/web/app/(provider)/prestador/page.tsx`
- Criar: `apps/web/app/(provider)/prestador/actions.ts`
- Criar: `apps/web/app/(provider)/prestador/ficha/page.tsx`
- Criar: `apps/web/app/(provider)/prestador/catalogo/page.tsx`
- Criar: `tests/unit/providers/showcase-form.test.ts`

- [x] **Step 1: as Server Actions, autenticadas pelo cliente com cookies** — actions autenticadas por cookies, zero service_role; todo `error` de consulta é lido

  Todas em `actions.ts` com `"use server"` no topo do arquivo. O padrão correto está em
  `app/(shell)/communities/actions.ts:8-24`. **Nenhuma delas usa `service_role`** — a RLS da
  Task 3 já decide, e usar `service_role` aqui é a regra 1 da §12 quebrada.

  Um cuidado que a onda F pagou caro (`README.md`, lição do PostgREST): **leia o `error` de
  toda consulta**. A tela renderizando vazia porque o `error` foi descartado é como a lista de
  membros de grupo ficou quebrada em produção sem ninguém notar.

- [x] **Step 2: a validação na borda** — validadores em apps/web/lib/providers/showcase.ts espelham os checks da migration

  `title` 2-120, `bio` até 800, `price_cents` inteiro não-negativo, `contact_phone` no formato
  do `check` da migration. Valide **no servidor**, não só no formulário — a regra do
  `CLAUDE.md` é "valide input nas bordas do sistema". Testes unitários em
  `tests/unit/providers/showcase-form.test.ts` cobrindo os limites e o preço negativo.

- [x] **Step 3: os estados honestos** — métrica sem número inventado; caixa de pedidos não desenhada

  Métrica: `EmptyState` dizendo que a medição chega com a onda H — não um "0 visualizações",
  que é número inventado com cara de fato. Caixa de pedidos: idem, até a Task 6.

- [x] **Step 4: gate e commit** — fechado em 2026-08-25

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): painel do prestador com ficha, catalogo e portfolio editaveis"
```

---

## Task 5: a busca — filtro exato mais `pg_trgm` (D44)

D44 é específica sobre o mecanismo e sobre o motivo: **nativo do Postgres, sem serviço novo
onde dado pessoal passe a viver**. Não introduza índice externo, não introduza serviço de
busca. E lembre da D43: **não existe busca de pessoas**. Isto busca **ficha**, e a fronteira
entre as duas coisas é o que o produto vende.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_search.sql`
- Criar: `supabase/tests/provider-search-scope.sql`
- Modificar: `apps/web/app/components/bivaque/city-reference.tsx` (a seção `city-vitrine-heading`)
- Criar: `apps/web/app/(shell)/prestadores/page.tsx`

- [x] **Step 1: extensão, índice e o RPC** — pg_trgm + índice parcial + `search_providers` security definer (20260825203815)

```sql
create extension if not exists pg_trgm with schema extensions;

create index provider_profiles_name_trgm_idx
  on public.provider_profiles using gin (display_name extensions.gin_trgm_ops)
  where is_deleted = false;

-- Filtro exato por categoria e escopo; pg_trgm apenas no nome (D44).
-- security definer com o filtro de alcance DENTRO da função: quem chama nunca
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
  -- D29 e §7.2: a ordenação NUNCA olha para r.source. Relevância e nada mais.
  order by p.id, extensions.similarity(p.display_name, coalesce(p_query, '')) desc,
           p.display_name asc;
$$;

revoke all on function public.search_providers(public.provider_category, uuid, text)
  from public, anon;
grant execute on function public.search_providers(public.provider_category, uuid, text)
  to authenticated;
```

- [x] **Step 2: o pgTAP da busca — e o teste que existe só para a D29** — 9 asserts em provider-search-scope.sql, incluindo a guarda D29 (grátis antes de paga por relevância igual)

  `supabase/tests/provider-search-scope.sql`:

  - membro da vila A busca sem filtro â†’ vê a ficha do prestador da vila A
  - o mesmo membro **não** vê a ficha de um prestador cujo alcance é só a vila B
  - filtro por categoria devolve só aquela categoria
  - busca por nome parcial ("clima" achando "Climatiza Manaus") funciona
  - **o teste da D29:** duas fichas na mesma categoria, uma com `source = 'paid'` e outra
    `'free'`, com nomes escolhidos para que a ordem alfabética coloque a grátis primeiro. A
    busca **tem que** devolver a grátis primeiro. Se um dia alguém "otimizar" a ordenação para
    priorizar o pagante, este teste fica vermelho, e é para isso que ele existe.

- [x] **Step 3: a vitrine entra em "cidade"** — filtros só quando há ficha; vazio honesto sem promessa de onda

  Substitua o `EmptyState` de `city-reference.tsx` (seção `city-vitrine-heading`, o bloco que
  hoje diz *"Isso é trabalho da onda G"*) por: filtro de categoria (as doze), campo de busca
  por nome, e a lista de resultados com link para `/prestadores/[id]`.

  O estado vazio continua existindo e continua honesto — vila sem prestador cadastrado é o
  estado normal no dia um, e a §3.4 avisa que categoria demais com prestador de menos faz tudo
  parecer vazio ao mesmo tempo. **Não abra as doze categorias como abas vazias**; mostre o
  filtro só quando houver ficha.

- [x] **Step 4: gate e commit** — fechado em 2026-08-25

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): busca por categoria e nome com pg_trgm, dentro do alcance"
```

---

## Task 6: a conversa membro â†” prestador — três defeitos antes do contexto novo

D36 reaproveita a máquina de DM em vez de reconstruí-la, e o `BIVAQUE.md` §8 é explícito sobre
a consequência: *"as correções de bloqueio e contexto passam a ser pré-requisito da onda G"*.

O `PRODUCT_STATUS.md` §8 lista os três defeitos. Todos confirmados na leitura de
`supabase/migrations/20260802001500_dm_contextual.sql`:

| # | Defeito | Onde | Efeito |
|---|---|---|---|
| 1 | **Criação por ordem de UUID** | `dm_conversations_ordered check (participant_a < participant_b)` (linha 26) somado a `participant_a = (select auth.uid())` na policy de insert (linha ~229) | só quem tem o UUID menor consegue abrir conversa. O outro recebe violação de constraint. Metade dos pares está quebrada, e qual metade é sorteio |
| 2 | **Bloqueio contornável pelo bloqueador** | `dm_messages_insert_sender` checa apenas `private.is_dm_blocked_by_other` | quem bloqueia continua podendo escrever para quem bloqueou. Bloqueio que não protege é pior que bloqueio nenhum |
| 3 | **Contexto declarado não validado** | `private.can_dm_between` confere que existe *alguma* relação; `context_type` e `context_id` entram como o cliente mandar | a conversa alega uma origem que ninguém conferiu, e a moderação da onda H vai ler esse campo como se fosse fato |

**Arquivos:**
- Criar: `supabase/migrations/<ts>_dm_provider_context.sql`
- Modificar: `supabase/tests/dm-context-denials.sql`, `supabase/tests/dm-context-allowed.sql`
- Modificar: `apps/web/app/components/bivaque/chat-thread.tsx`
- Modificar: `apps/web/app/(shell)/prestadores/[id]/page.tsx` (o botão "Conversar")
- Modificar: `apps/web/app/(provider)/prestador/page.tsx` (a caixa de pedidos)

- [ ] **Step 1: corrigir o defeito 1 — o par é ordenado no servidor**

  Mantenha o `check (participant_a < participant_b)`: ele é o que garante uma conversa por par.
  O que muda é **quem ordena**. Um RPC passa a ser o único caminho de criação.

  > **Ordem dentro da migration importa:** este RPC chama `private.dm_context_valid`, que o
  > Step 3 define. Escreva os quatro steps num arquivo só, com o helper **antes** da função
  > que o usa — plpgsql não valida a referência na criação, mas `create function` que chama
  > SQL inexistente falha no primeiro uso, e você vai descobrir isso no pgTAP em vez de no
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

  -- A ordenação é aqui, e só aqui. O cliente nunca escolhe quem é A.
  v_a := least(v_me, p_other_user_id);
  v_b := greatest(v_me, p_other_user_id);

  -- O `do update` não muda nada: é o idioma para conseguir RETURNING quando a
  -- linha já existe. Reabrir conversa é devolver a mesma, não criar outra.
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

-- E o caminho antigo fecha: sem policy de insert, a tabela só aceita o RPC.
drop policy dm_conversations_insert_context_gated on public.dm_conversations;
revoke insert on table public.dm_conversations from authenticated;
```

- [x] **Step 2: corrigir o defeito 2 — bloqueio nos dois sentidos**

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

- [x] **Step 3: corrigir o defeito 3 — o contexto declarado é conferido**

  `private.dm_context_valid(a, b, context_type, context_id)` substitui o
  `can_dm_between` no caminho de criação. Cada ramo confere **aquele** contexto:
  `shared_group` â†’ os dois têm `group_memberships` aprovada **naquele** `group_id`;
  `shared_event` â†’ os dois têm `event_rsvps` **naquele** `event_id`;
  `recommendation_thread` â†’ os dois participam **daquela** `request_id`;
  `accepted_family` â†’ existe `private.family_account_links` entre os dois;
  `provider` â†’ o `context_id` é uma `provider_profiles.id`, um dos dois é o
  `owner_user_id` dela, e o outro pode vê-la (`private.can_see_provider`).

  Mantenha `can_dm_between` no schema: outras chamadas podem existir e removê-la não é o
  escopo desta task. Se ela ficar órfã ao fim da onda, remova aí.

- [x] **Step 4: o contexto novo, e quem pode iniciar**

```sql
alter type public.dm_context_type add value if not exists 'provider';
```

  **Só o membro inicia.** O prestador responde dentro de conversa existente, nunca abre uma.
  O motivo é a fronteira do produto: uma conta civil abrindo conversa com militar
  identificável é contato não solicitado, e é a porta que a rede fecha na entrada. O
  `dm_context_valid` do ramo `provider` exige que **quem chama** (`v_me`) não seja o dono da
  ficha.

- [x] **Step 5: os testes — cada defeito tem positivo e negativo**

  Em `supabase/tests/dm-context-denials.sql` e `dm-context-allowed.sql`:

  - defeito 1: o participante de **UUID maior** abre conversa com sucesso (hoje falha)
  - defeito 2: quem bloqueou **não** consegue enviar mensagem (hoje consegue); quem foi
    bloqueado também não (continua)
  - defeito 3: `open_conversation` com `context_type = 'shared_group'` e um `context_id` de
    grupo do qual os dois **não** participam â†’ negado, mesmo existindo outra relação entre eles
  - contexto novo: membro que vê a ficha abre conversa com o prestador â†’ **ok**
  - membro que **não** vê a ficha (outra vila) â†’ **negado**
  - prestador tentando abrir conversa com membro â†’ **negado**
  - prestador respondendo dentro de conversa aberta pelo membro â†’ **ok**

- [x] **Step 6: as três telas**

  `chat-thread.tsx` passa a chamar `open_conversation` em vez de inserir direto. A ficha ganha
  o botão "Conversar". O painel do prestador ganha a caixa de pedidos, que é a lista de
  conversas com contexto `provider`.

  **O que o prestador vê do membro:** o `display_name` do perfil e nada mais. Não o e-mail, não
  a vila, não a afiliação. Escreva isso como comentário na consulta, porque é a linha que um
  refactor futuro vai atravessar sem perceber.

  > **E ele não consegue ler isso pelo caminho normal.** `profiles_select_visible_in_locality`
  > (`20260817031237_belonging_multi_membership.sql:102-109`) devolve o perfil quando é o do
  > próprio usuário **ou** quando `private.shares_locality_with(user_id)` é verdadeiro. O
  > prestador não tem `locality_memberships` por construção (D37), então **nenhuma linha de
  > `profiles` é visível para ele** — a caixa de pedidos renderizaria "sem nome" para todo
  > mundo. Isso não é bug a corrigir afrouxando a policy; é a fronteira funcionando.
  >
  > A saída é um RPC estreito, no molde dos que já existem em `apps/web/lib/profile-rpcs.ts`:

```sql
-- Devolve o display_name do OUTRO participante de uma conversa em que quem
-- chama participa. Uma coluna, uma linha, e só dentro de conversa existente:
-- não é diretório de pessoas (D43), é o nome de quem já está falando com você.
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

  Teste negativo obrigatório: quem **não** participa da conversa recebe nulo, não o nome.

- [x] **Step 7: gate e commit** — fechado em 2026-08-25

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "fix(dm): ordem do par, bloqueio bidirecional e contexto conferido; abre contexto provider"
```

---

# Bloco 2 — o alcance pago

> **Não comece sem o ADR do alcance pago e sem o CNPJ.** As duas tasks abaixo são R3 por dois
> motivos independentes (monetização e pagamento), e a segunda depende de uma conta Asaas que
> só existe com pessoa jurídica (§7.6).

---

## Task 7: o alcance pago — o produto antes do dinheiro

Esta task **não toca em cobrança**. Ela entrega o que o pagante compra e as três garantias que
o §7.4 exige, com o dinheiro ainda desligado. Ã‰ deliberado: se o produto não estiver certo sem
dinheiro, ele não fica certo com dinheiro.

**Arquivos:**
- Criar: `supabase/migrations/<ts>_provider_paid_reach.sql`
- Criar: `supabase/tests/provider-paid-reach.sql`
- Modificar: `apps/web/app/(shell)/prestadores/page.tsx` e `[id]/page.tsx` (o rótulo)
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
  -- Referência opaca ao Asaas. NUNCA cartão, NUNCA CPF/CNPJ do prestador:
  -- §7.3 e D41 — o checkout é hospedado e o cartão nunca toca o Bivaque.
  external_reference text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 2: ligar e desligar o alcance é uma função só**

```sql
-- O único caminho que escreve provider_reach com source='paid'. Assinatura
-- ativa liga; qualquer outro estado desliga. Sem esta concentração, "past_due"
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
  -- A decisão 3 do ADR do alcance pago dá SETE DIAS de tolerância em `past_due`:
  -- falha de cobrança não pode apagar a ficha das outras vilas no mesmo minuto,
  -- porque a maioria das falhas é boleto que atrasou, não cliente que sumiu.
  -- Sem esta janela a função contradiz o ADR — e o teste da Task 7 pega isso.
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

  §7.4 filtro 2: *"O que o pagante comprou está declarado como pago, visivelmente? Se não, é
  engano."* Toda ficha que aparece num escopo por `source = 'paid'` exibe um `Chip` com
  **"Alcance patrocinado"** — na busca e na própria ficha. O `search_providers` já devolve
  `reach_source`; use-o para o rótulo e **nunca** para a ordem.

- [ ] **Step 4: os testes que protegem as três regras**

  `supabase/tests/provider-paid-reach.sql`:

  - assinatura `active` â†’ o membro da vila B **passa** a ver a ficha do prestador da vila A
  - assinatura `past_due` com `current_period_end` de ontem â†’ **ainda vê** (a tolerância de
    7 dias da decisão 3 do ADR)
  - assinatura `past_due` com `current_period_end` de dez dias atrás â†’ **deixa de ver**
  - assinatura cancelada â†’ o alcance **grátis na vila própria continua intacto** (D28: a ficha
    na própria vila é grátis, sempre, completa — cancelar assinatura não pode enterrar ninguém,
    que é o proibido nº 2 do §7.3)
  - a ordenação da busca continua ignorando `source` (repita a asserção da Task 5 aqui, com
    assinatura ativa — é o mesmo invariante em outro estado do mundo)
  - `authenticated` chamando `sync_paid_reach` diretamente â†’ **negado**

- [ ] **Step 5: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(providers): alcance pago como estado do produto, declarado e fora da ordenacao"
```

---

## Task 8: Asaas — checkout hospedado e webhook

D41: **checkout hospedado, o cartão nunca toca o Bivaque**. O Bivaque guarda uma referência
opaca e reage a webhook. Nada mais.

**Arquivos:**
- Criar: `apps/web/app/api/webhooks/asaas/route.ts`
- Criar: `apps/web/lib/billing/asaas.ts`
- Criar: `tests/unit/billing/asaas-webhook.test.ts`
- Criar: `tests/unit/billing/fixtures/asaas-*.json`
- Modificar: `apps/web/app/(provider)/prestador/page.tsx` (o botão de assinar)

- [ ] **Step 1: o cliente, server-side e só**

  `apps/web/lib/billing/asaas.ts` lê a chave de `process.env["ASAAS_API_KEY"]`. **Nunca**
  `NEXT_PUBLIC_*` — o Next inclina qualquer `NEXT_PUBLIC_` no bundle do cliente, e isso
  publicaria a chave. O mesmo cuidado que `apps/web/lib/portal/client.ts` já toma com a chave
  do Portal. Nenhum log ecoa a chave nem o payload; o scrub de PII de
  `packages/domain/src/pii-scrub.ts` roda antes de qualquer `log.error`.

- [ ] **Step 2: o webhook, com assinatura e idempotência**

  A rota valida o segredo do webhook **antes** de ler o corpo, rejeita com 401 sem detalhe,
  grava o evento numa tabela de eventos processados com `unique (external_event_id)` e ignora
  repetido — provedor de pagamento reentrega, e reentrega é o caso normal, não o excepcional.
  Depois atualiza `provider_subscriptions.status` e chama `public.sync_paid_reach`.

  **Proibido retry automático em laço** (§7.9 estabeleceu a regra contra o Portal; ela vale
  para qualquer terceiro): responda 200 ao que já processou, 5xx ao que falhou, e deixe o
  provedor reentregar.

- [ ] **Step 3: os testes, com fixture e sem rede**

  `tests/unit/billing/asaas-webhook.test.ts`. Como no Portal, **nenhuma chamada real** e
  nenhum dado real: fixtures JSON com identificadores fictícios.

  - assinatura inválida â†’ 401, e **nada** muda no banco
  - evento de pagamento confirmado â†’ `status = 'active'` e `sync_paid_reach` chamado
  - o **mesmo** evento entregue duas vezes â†’ segundo é no-op
  - evento de atraso â†’ `past_due`
  - corpo malformado â†’ 400, sem exceção vazando para o log

- [ ] **Step 4: gate e commit**

```bash
npx pnpm@11.18.0 gate
```

```bash
git commit -m "feat(billing): webhook Asaas com assinatura, idempotencia e sincronizacao de alcance"
```

---

## Task 9: fechamento da onda

- [x] **Step 1: os E2E — escritos, commitados, possivelmente não rodados** — provider-vitrine.spec.ts com os três ciclos; prestador semeado no seed (prestador-seed@/Climatiza Manaus); vila-home ganhou teto de cold start

  Especificações novas em `tests/e2e/`: o membro acha um prestador pela busca da cidade e abre
  a ficha; o prestador entra pelo convite e publica um item de catálogo; o membro de outra vila
  não acha a ficha.

  **Sem credencial inline** (`AGENTS.md`): leia do ambiente com fallback em
  `apps/web/.env.local` e lance erro quando nenhum dos dois fornecer — o modelo é
  `tests/e2e/persistent-login.spec.ts`. E **`import.meta` não existe** nos specs: eles são
  transpilados para CJS e um `import.meta.dirname` aborta a coleta da suíte inteira com
  `Total: 0 tests in 0 files`. Resolva caminho a partir de `process.cwd()`.

  Se o banco estiver sem seed, **commite sem executar** e registre no `PRODUCT_STATUS.md` como
  "código feito" — é o terceiro estado documentado lá, e o `README.md` explica por que essa é a
  única saída honesta numa execução autônoma.

- [ ] **Step 2: a auditoria visual — ela bloqueia a onda seguinte**

```bash
node scripts/visual/loop.mjs
```

  Telas tocadas: `/localidade` (a vitrine), `/prestadores`, `/prestadores/[id]`, `/prestador` e
  as filhas, e as duas telas de convite. Veredito escrito em
  `docs/agents/VISUAL_AUDIT-2026-08-<dd>-onda-g.md`, no formato dos que já existem em
  `docs/agents/`.

  Depois da captura, **antes de qualquer `test:db`**: `db:reset` limpo. A captura insere o
  perfil fantasma "Visual Capture" e seis asserts de pgTAP quebram parecendo regressão real.

- [x] **Step 3: reconciliar o `PRODUCT_STATUS.md`** — §7 cinco linhas e §8 conversa reconciliadas em 2026-08-25

  As cinco linhas do §7 e a linha "Conversa membro â†” prestador" do §8. Uma linha só sai quando
  o ciclo do usuário fecha — entrada, ação, feedback, acompanhamento e o sad path principal.
  Capacidade no banco não fecha linha. Troque `[A]` por `[V]` no que você reconferiu.

- [ ] **Step 4: commit final**

```bash
git commit -m "docs(status): reconciliar vitrine e conversa membro-prestador apos a onda G"
```

---

## Se alguma coisa aqui estiver errada

Um plano errado é informação, não obstáculo. **Pare e reporte** em vez de improvisar,
especialmente nestes quatro pontos:

1. Qualquer coisa que exija o Bivaque intermediar pagamento de serviço (D26).
2. Qualquer ordenação que olhe para `provider_reach.source` (D29).
3. Qualquer `service_role` num caminho de usuário sem helper de acesso antes (regra 1 da §12).
4. Qualquer coluna de escopo que nasça sem a policy que a lê (regra 6 da §12) — são quatro
   vazamentos de privacidade neste repositório com essa mesma origem.
