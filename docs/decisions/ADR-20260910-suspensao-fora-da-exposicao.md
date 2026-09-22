---
id: ADR-20260910-suspensao-fora-da-exposicao
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-10
expires_at:
linked_plan:
critic_verdict:
critic_review:
---

# Suspensão fora da exposição: tabela própria com RLS owner-only

## Problem

O ADR-20260901-account-suspension introduziu `is_suspended` como coluna de
`public.profiles` para servir de veto de publicação no RLS. A escolha tinha um
defeito que só apareceu em runtime:

> RLS é por linha, não por coluna. `profiles_select_visible_in_locality` e
> `profiles_select_community_comember` liberam a LINHA INTEIRA a qualquer
> membro que compartilha cidade ou comunidade.

Consequência medida em 10/09/2026 no stack local: um membro autenticado lia o
status de suspensão de terceiros direto na Data API.

```
GET /rest/v1/profiles?select=user_id,is_suspended&user_id=eq.<terceiro>
→ {"is_suspended": true}
```

Isso contraria a §4.3 anti-enumeração do próprio ADR-20260901 — "outro membro
não pode saber se um terceiro está suspenso". Os commits `42c055d` e `3acaadd`
fecharam as duas vias de `/rpc` (anon e terceiro passaram a receber `false`),
mas **não** fecharam a coluna. O vazamento está na `main` desde o merge do PR
#54 e é o card `BLOCK-SUSPENSION-EXPOSURE` (Launch blocker).

## Decision

O estado de suspensão passa a viver em **`public.profile_suspensions`**, tabela
própria com RLS **owner-only**, no padrão já provado de
`public.profile_affiliations`. A coluna `is_suspended` é removida de
`public.profiles`.

Uma linha presente em `profile_suspensions` significa conta suspensa. O dono lê
a própria linha; ninguém lê a de terceiro. Nenhum papel de aplicação escreve a
tabela: somente `service_role` (operação) suspende ou reabilita — conceder
INSERT/UPDATE ao `authenticated` deixaria a conta suspensa se reabilitar.

O helper `public.is_account_suspended(uuid)` mantém assinatura, `STABLE
SECURITY DEFINER`, `search_path` vazio e a guarda de autoleitura (`p_user_id =
auth.uid()`), apenas trocando `profiles.is_suspended` por `profile_suspensions`.
As cinco policies de INSERT que o consomem **não são reescritas**: elas
referenciam a função por nome, não a coluna.

## Alternatives considered

1. **Revogar o SELECT de tabela em `profiles` e conceder SELECT por coluna
   (view).** Não move dado, mas espalha a exposição por grants de coluna em
   várias tabelas e policies; mais frágil de manter do que uma tabela com uma
   policy. Rejeitada.
2. **Tirar a coluna e carregar o estado em `app_metadata.is_suspended` (claim do
   JWT).** Zero coluna exposta, mas exige hook de Auth para sincronizar o claim,
   invalidação de sessão e reintroduz o estado em todo token. Mais peças móveis
   para o mesmo resultado. Rejeitada nesta entrega.
3. **Manter a coluna em `profiles` e aceitar a exposição.** Rejeitada: contraria
   a §4.3 e é o próprio defeito.

## Consequences

- Terceiro não lê suspensão: o teste negativo `profile-suspensions.sql` falha se
  a leitura por vizinho de cidade voltar a retornar 1.
- O dono continua lendo o próprio status (linha própria; helper `true`).
- O veto de publicação continua: as policies chamam o helper, que devolve `true`
  para o dono suspenso. Provado por pgTAP; o E2E `denied-publish.spec.ts` passa
  a alternar a suspensão via `profile_suspensions` (service_role) em vez de
  `profiles.is_suspended`.
- `supabase/seed.sql` grava a persona suspensa em `profile_suspensions`.
- `database.generated.ts` é regerado: `profiles` perde `is_suspended` e o cliente
  ganha o tipo da tabela nova.
- Nenhuma UI lê a flag hoje (verificado: só o helper RLS a consome), então não há
  tela a adaptar.

## Evidence

- Migration: `supabase/migrations/20260911033327_move_suspension_out_of_profiles.sql`.
- pgTAP: `supabase/tests/profile-suspensions.sql` (positivo do dono, negativos
  de terceiro/anon, estrutura, privilégios da função).
- E2E: `tests/e2e/denied-publish.spec.ts` (veto de publicação preservado).
- Decisão do dono em 2026-09-10, tomada com autoridade declarada de decidir o R3
  e de rodar `db:reset`; esta ADR é o registro rastreável.
