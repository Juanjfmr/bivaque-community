---
id: ADR-20260901-account-suspension
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-01
expires_at:
linked_plan:
critic_verdict:
critic_review:
---

# Suspensão de conta — flag, RLS helper, persona de seed e caminho denied E2E

## Problem

O fluxo de denúncia (Wave H Task 8) está implementado em `apps/web` e
provado pelo spec `tests/e2e/reports-member-flow.spec.ts` (caminho
feliz + caminho de erro + caminho de operador). Falta **um caminho** que
o product-critic do ciclo 2026-08-31 (item 10 do verdict) apontou
como falha de cobertura:

> Sem prova negativa automatizada de denúncia negada. Persona suspensa
> ou não-membro tenta publicar / denunciar e recebe RLS 42501 → copy
> genérica. Sem esta prova, o estado "denied" não fecha.

Esse caminho depende de **uma flag de suspensão na tabela `profiles`**.
Sem a flag:
- `auth.users` pode estar deletado/desabilitado, mas o `profiles` continua
  ativo — o que confunde a UI (mostra conta "ativa" para quem foi banido).
- Não há como RLS em `public.reports` (e nas demais tabelas que
  autorizam ação por membro) rejeitar inserts/update da persona suspensa.
- A migration do flag é R3 (privacidade + autorização) e exige ADR
  aprovado antes de ser aplicada.

O escopo desta ADR é:
1. Adicionar coluna `is_suspended boolean not null default false` em
   `public.profiles` (ou tabela equivalente de identidade pública).
2. Adicionar helper SQL `public.is_account_suspended(user_id uuid)
   returns boolean` que RLS policies possam chamar.
3. Atualizar RLS de `public.reports`, `public.posts` (insert),
   `public.comments`, `public.reactions` para vetar a persona suspensa
   com erro genérico (42501, sem enumerar).
4. Adicionar uma persona suspensa ao seed (`supabase/seed.sql`) para
   servir de negativo no spec E2E.
5. Expor `is_suspended` na API que o `apps/web` consulta para mostrar
   estado da conta (header "sua conta está suspensa" com link para
   recurso de recurso, sem expor motivo).

## Decision (proposed — pendente de aprovação humana)

| Item | Escolha | Por quê |
|---|---|---|
| Coluna | `is_suspended boolean NOT NULL DEFAULT false` em `public.profiles` | Mesma tabela que já carrega identidade pública; sem nova tabela. |
| Fonte da verdade | coluna em `profiles`, **não** flag em `auth.users` | `auth.users` é gerenciado pelo GoTrue; tocar lá exige SQL direto + risco de drift com a camada de auth. `profiles` é o espelho público do membro. |
| Trigger | ao suspender, setar `is_suspended=true`; ao reabilitar, setar `false`. Trilha de auditoria em tabela separada `public.suspension_events` (timestamp, motivo_code, actor_id). | §4.3 privacidade + BIVAQUE.md §6.3 ciclo de moderação exige trilha auditável. |
| Exposição ao membro | `is_suspended` visível apenas para o próprio dono via JWT claim custom `app_metadata.is_suspended`. UI lê do JWT, **não** de query em `profiles`. | §4.3 anti-enumeração: outro membro não pode saber se um terceiro está suspenso. |
| Helper SQL | `public.is_account_suspended(user_id uuid) returns boolean language sql stable security definer`. Marca como `STABLE` (mesma resposta na mesma transação) e `SECURITY DEFINER` (checa como owner do schema). | RLS chama isso em cada policy — precisa ser barato e index-friendly. |
| RLS impact | `public.posts` (insert), `public.reactions` (insert), `public.comments` (insert), `public.reports` (insert) ganham `AND NOT public.is_account_suspended(auth.uid())`. Read permanece permitido (transparência do conteúdo já publicado é mais importante que esconder). | Moderado. Read aberto preserva utilidade do conteúdo existente. |
| Sinal de erro | PostgREST retorna `42501` (insufficient_privilege). UI classifica como `server` no `lib/composer/publish-error.ts` (já existente) — copy idêntica à falha genérica ("Não foi possível criar a publicação") sem distinguir entre "suspenso", "sem comunidade", "post deletado". | Anti-enumeração §4.3: copy idêntica para qualquer negação. |
| Persona de seed | adicionar `auth.users` + `public.profiles` de `membro-suspenso@bivaque.example.invalid` com `is_suspended=true`, sem comunidade aprovada. Senha segue padrão `bivaque-e2e-local`. | Spec E2E precisa de negativo estável entre runs. |
| Backfill | zero — `DEFAULT false` cobre todos os membros existentes. Nenhum é suspenso retroativamente. | Não há histórico de suspensões a migrar; hoje a feature não existe. |
| Reversibilidade | alta antes de publicar (rollback = drop column); média depois de publicar (rollback = drop column mas membros suspensos ficam sem UI de recurso). | Antes do primeiro uso real, reversão é trivial. |

## Alternatives considered

1. **Flag em `auth.users.banned_until`** (Supabase Auth) — Rejeitado:
   requer mexer no schema do GoTrue via service_role; Bivaque não toca
   em `auth.*` por convenção (ver `RISK_MATRIX.md` e AGENTS.md §Supabase).
2. **Soft delete no `profiles`** (setar `deleted_at`) — Rejeitado:
   soft delete implica remover o membro do feed de descoberta, o que
   é diferente de suspender (suspenso não desaparece, fica
   congelado com UI de recurso). Confundir os dois estados é uma
   regressão de UX.
3. **Status `suspended` em vez de boolean** — Rejeitado: não temos
   workflow de suspensões parciais ou graduais; boolean é o mínimo
   suficiente. Se aparecer necessidade futura, expandimos.
4. **Permitir ler conteúdo mas bloquear só insert/update/delete** —
   Adotado. Read aberto preserva utilidade dos posts antigos;
   suspensão é **freeze de ação**, não apagão retroativo.

## Market or reference baseline

Discord/Slack/Reddit: todos usam coluna `is_suspended` ou
`banned_at` no perfil público, com RLS que veta writes enquanto a
flag está setada. Supabase Auth oferece `banned_until` no nível de
auth, mas é gerenciado pelo dashboard — Bivaque precisa de controle
fino (admin pode suspender com motivo específico, com trilha).

## Proposed divergence from baseline

Em vez de usar `auth.users.banned_until` (que seria a forma
"oficial Supabase"), usamos `public.profiles.is_suspended`. Isso
coloca a gestão no app, não no dashboard do Supabase — coerente com
o princípio "Bivaque não toca em `auth.*`".

## Evidence and sources

- BIVAQUE.md §4.3 Privacidade + §6.3 ciclos de moderação + §7.3 Proibidos
- AGENTS.md §Supabase: nunca tocar `auth.users` schema
- Wave H Task 8 (`docs/superpowers/plans/2026-08-05-onda-h.md`) — denúncia
  por membro (já implementado) + caminho denied (este ADR cobre)
- product-critic verdict 2026-08-31 (item 10: denied sem prova negativa)
- `RISK_MATRIX.md` — R3 exige ADR aprovado

## Benefits

Fecha o caminho denied da golden slice do compositor (W1) e o
caminho denied da denúncia. Sem esta migration, o spec
`reports-member-flow.spec.ts` cobre feliz + erro de transporte, mas
não cobre o terceiro estado que o produto promete: "se a sua conta
está suspensa, o app não te deixa agir".

## Risks

- Drift entre a flag e a verdade do `auth.users.banned_until` se o
  dashboard do Supabase for usado em paralelo. Mitigação: documentar
  que toda suspensão passa por `private.admin_suspend_member` ou
  similar; nunca mexer no dashboard.
- Performance: a função `is_account_suspended` é chamada em cada RLS
  evaluation. `STABLE` + `SECURITY DEFINER` evita re-execução
  dentro da mesma query, mas cada policy ainda chama. Mitigação:
  medir com `EXPLAIN ANALYZE` antes do rollout; índice parcial em
  `profiles(is_suspended) WHERE is_suspended = true` cobre o caso
  comum (a maioria é `false`).
- Vazamento por timing: se o membro suspenso perceber que toda
  mutation dele retorna imediatamente com 42501, pode inferir que
  está suspenso. Mitigação: copy genérica idêntica à falha de
  servidor (já implementado em `lib/composer/publish-error.ts`).
- Reprodução de UI inconsistente: a UI mostra "sua conta está
  suspensa" via claim JWT. Se o JWT demorar a atualizar após
  reabilitação, o membro vê UI errada por alguns minutos. Mitigação:
  aceitar no MVP; melhorar com refresh explícito depois.

## Reversal cost

- Antes de publicar para usuários: trivial — `ALTER TABLE profiles
  DROP COLUMN is_suspended; DROP FUNCTION is_account_suspended`.
- Depois de publicar: média — precisa lidar com membros suspensos
  que já tinham UI de recurso; re-habilitar manualmente antes do
  rollback.

## Success metric

1. Migration aplicada sem erro; `pnpm test:db` passa com a policy
   nova (incluindo o caso da persona suspensa).
2. E2E `denied-publish.spec.ts` (a escrever) passa: persona suspensa
   tenta publicar em cidade-reach → FeedbackAlert danger com copy
   genérica → post NÃO chegou ao DB. Persona suspensa tenta denunciar
   post de outro → mesmo caminho.
3. E2E `denied-publish.spec.ts` cobre os 3 viewports.
4. UI mostra "conta suspensa" para o próprio membro, **não** para
   terceiros.
5. Após reabilitação, o membro consegue publicar novamente.

## Reopen condition

Reabrir se (a) houver vazamento confirmado do status de suspensão
para terceiros, (b) a performance da função for inaceitável (> 5ms
por policy), (c) aparecer caso de suspensão parcial (ex: "pode
denunciar mas não publicar") que boolean não cobre.

## Approval

**Aprovado por Juan em 2026-09-01** (registro no commit `7532aea` —
"ADRs 20260901-mobile-session e account-suspension aprovados em 2026-09-01";
frontmatter `status: approved`). O texto desta seção ficou desatualizado
quando o frontmatter foi atualizado; reconciliado em 2026-09-05.

Nota de implementação (2026-09-05): a migration `20260901124348` divergiu
do exemplo deste ADR ao recriar `posts_insert_locality_member` sem a
cláusula de identidade (`user_id = auth.uid()`) e com read scope no lugar
de write scope; corrigido pela migration `20260905152703`. Conflito aberto
com o ADR-20260820-suspensao-de-conta (D54 preserva a escrita "denunciar"
durante suspensão; esta ADR veta `reports` insert) registrado para decisão
do dono — enquanto não resolvido, vale o texto mais recente (veto).

## Anexo técnico (adicionado 2026-09-01)

- Migração de exemplo (a ser refinado quando aprovada):

```sql
-- supabase/migrations/<ts>_account_suspension.sql
ALTER TABLE public.profiles
  ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;

CREATE INDEX profiles_suspended_true_idx
  ON public.profiles (user_id)
  WHERE is_suspended = true;

CREATE OR REPLACE FUNCTION public.is_account_suspended(p_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_suspended FROM public.profiles WHERE user_id = p_user_id),
    false
  );
$$;

ALTER FUNCTION public.is_account_suspended(uuid) OWNER TO postgres;

-- Trilha de auditoria
CREATE TABLE public.suspension_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  reason_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz
);

ALTER TABLE public.suspension_events ENABLE ROW LEVEL SECURITY;
-- Apenas o próprio dono vê seus próprios eventos; admin via service_role.
CREATE POLICY suspension_events_select_self ON public.suspension_events
  FOR SELECT USING (user_id = auth.uid());
```

- Atualizar RLS das tabelas de ação (exemplo para `posts.insert`):

```sql
CREATE POLICY posts_insert_authenticated_not_suspended ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_account_suspended(auth.uid())
  );
```

- Seed da persona suspensa (em `supabase/seed.sql`):

```sql
INSERT INTO auth.users (instance_id, id, aud, role, email, ...)
  VALUES (..., '30000000-0000-4000-8000-000000000099', 'authenticated',
          'authenticated', 'membro-suspenso@bivaque.example.invalid', ...);

INSERT INTO public.profiles (user_id, display_name, locality_id, is_suspended)
  VALUES ('30000000-0000-4000-8000-000000000099', 'Membro Suspenso',
          (SELECT id FROM public.localities WHERE name = 'Manaus'),
          true);
```

- Spec E2E a escrever (`tests/e2e/denied-publish.spec.ts`): persona
  suspensa → /community → tenta publicar → FeedbackAlert danger com
  copy genérica → reload → post NÃO chegou ao DB. Reutiliza o
  `publish-error.ts` já existente.

- App hook para UI: claim JWT custom `app_metadata.is_suspended`.
  Implementação em `apps/web/app/(shell)/layout.tsx` ou em
  `middleware.ts`, lendo de `getSession()` do Supabase Auth.