# Auditoria de autorização — linha de base (2026-11-13)

> Escopo: leitura de catálogo no projeto Supabase `bivaque-community` e inspeção da `main`; sem leitura de dados de usuários, sem DDL, sem alteração no banco. As constatações sobre comportamento ainda dependem de pgTAP/E2E local. Este documento **não** autoriza mudar políticas em produção.
>
> Estado: **diagnóstico inicial, não correção**. Fonte operacional: `supabase/migrations/`, políticas efetivamente instaladas, `supabase/tests/`, ADRs aceitos. Mudanças de autorização são R3.

## 1. Resumo verificável

Consultas somente de leitura em 2026-11-13 (UTC, projeto `bivaque-community`):

| Indicador | Observado | Interpretação |
| --- | ---: | --- |
| Tabelas em `public` + `private` | 68 | Escopo do inventário |
| Tabelas de `public` sem RLS | 0 | Boa cobertura de RLS |
| Tabelas de `public` sem FORCE RLS | 0 | Boa cobertura de FORCE RLS |
| Políticas em `public` + `private` | 136 | Superfície de autorização |
| Políticas permissivas nesse conjunto | 136 | Regras aplicáveis podem ser combinadas por OR; isso **não** é, isoladamente, falha |
| Tabelas com alguma policy | 53 | As outras exigem avaliação de grants e finalidade |

O Supabase Security Advisor reportou 15 tabelas com RLS mas sem policy (INFO), 4 funções `SECURITY DEFINER` executáveis por `anon` (WARN), 58 executáveis por `authenticated` (WARN), `pg_net` no schema `public` (WARN) e proteção contra senhas vazadas desativada (WARN). Nem todo aviso é vulnerabilidade: tabelas internas sem policy e RPCs públicas deliberadas podem ser corretas. Referências: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/database/postgres/row-level-security.

## 2. Achados com prioridade

### AUTHZ-001 — Suspensão não é aplicada a UPDATE/DELETE de conteúdo (P0, hipótese forte)

**Evidência no banco:** `posts_insert_locality_member` e `comments_insert_member` verificam suspensão; `posts_update_own`, `comments_update_own`, `posts_delete_own` e `comments_delete_own` não contêm essa condição. `authenticated` possui privilégios de UPDATE e DELETE em `posts` e `comments`. Não foram encontrados triggers gerais de bloqueio dessas operações nos dois objetos (os triggers de soft delete só atuam quando `is_deleted` muda). O `WITH CHECK` do UPDATE também não contém o veto de suspensão.

**Contrato:** `docs/decisions/ADR-20260901-account-suspension.md` registra suspensão como bloqueio de escrita (insert/update/delete) com leitura permitida; revisar ADRs posteriores para exceções (denúncia, autodefesa, recurso, exclusão de conta).

**Risco:** um membro suspenso que continue satisfazendo as condições de autoria e escopo pode alterar/excluir conteúdo próprio via acesso direto ao banco. **Ainda não reproduzido com uma sessão suspensa**.

**Teste de aceitação:** com fixture de autor suspenso e conteúdo previamente criado, UPDATE e DELETE devem ser negados pelo banco; SELECT do conteúdo legível deve permanecer permitido. Usuário ativo equivalente deve conseguir operações permitidas. Cobrir suspensão com prazo vencido e pedido de exclusão. Validar SQLSTATE e persistência, não somente o comportamento de botões.

### AUTHZ-002 — Permissões de UPDATE de grupos e vínculos amplas demais (P0, hipótese forte)

**Evidência no banco:** `groups_update_owner` permite UPDATE a quem seja membro e moderador, sem restrição explícita de colunas; `authenticated` tem UPDATE nas colunas `owner_user_id`, `locality_id` e `created_by` de `groups`. Os triggers identificados bloqueiam alteração de `community_id` e soft delete, não mudança de titularidade ou localidade. `group_memberships_update_moderator` verifica apenas `private.is_group_moderator(group_id)`, tanto em `USING` quanto em `WITH CHECK`; `authenticated` tem UPDATE nas colunas `role` e `user_id`. O trigger `private.enforce_group_community_membership` verifica participação em comunidade, não autorização de mudança de papel.

**Risco:** alterações sensíveis de titularidade, papel e escopo podem ser feitas por um moderador via escrita direta, em desacordo com a matriz de transições que prevê operações específicas para promoção/rebaixamento e transferência de propriedade. **A exploração depende de teste de banco com fixtures.** Revisar também constraints e funções de mudança existentes antes de decidir a correção.

**Teste de aceitação:** moderador NÃO pode elevar o próprio papel a `owner`, reassociar uma linha de membro a outra pessoa, trocar `owner_user_id`, `created_by` ou `locality_id` diretamente. Mudanças autorizadas por RPC específica devem funcionar; permissões ordinárias de edição (nome/descrição, aprovações quando previstas) devem continuar funcionando. Cobrir dono, moderador, membro e outra cidade.

### AUTHZ-003 — Duas políticas idênticas em `post_reactions.INSERT` (P1, duplicação comprovada)

`post_reactions_insert_locality_member` e `post_reactions_insert_self` têm o mesmo `WITH CHECK` no catálogo consultado. Mantê-las em paralelo não acrescenta restrição e aumenta a chance de deriva futura, porque são combinadas por OR.

**Correção proposta:** consolidar em uma policy depois de registrar testes positivos e negativos para autoria, suspensão, exclusão, escopo ativo, post encerrado e post apagado. Não remover uma delas até a equivalência comportamental ser demonstrada.

### AUTHZ-004 — Grants de funções privilegiadas: revisar intenção e drift (P1)

Security Advisor aponta 4 RPCs `SECURITY DEFINER` invocáveis por `anon`: `add_to_waitlist`, `complete_event`, `is_account_suspended`, `read_provider_invitation`. `complete_event` verifica `auth.uid()` e titularidade no corpo; `is_account_suspended` responde `false` para terceiros/ausência de sessão. A possibilidade de invocar não prova bypass. Há aparente divergência entre a migration de 07/11 (`REVOKE ... anon`) e o grant atualmente observado em `is_account_suspended`; auditar privilégios efetivos e sequência de migrations antes de qualquer mudança.

**Teste de aceitação:** toda RPC privilegiada deve ter contrato explícito de chamador e teste `anon`/`authenticated`/`service_role`, incluindo tentativa de fornecer ID de terceiro. Remover grants desnecessários sem quebrar waitlist ou convites públicos intencionais.

### AUTHZ-005 — Alteração de regra afeta múltiplas camadas (P1, dívida arquitetural)

`apps/app` (React SPA) e `apps/web` (API/Next + telas legadas) coexistem. A ADR `ADR-20261024-front-react-spa.md` prevê migrar jornadas sem duplicar validação em Server Actions e API. O inventário deve ligar cada ação de UI a rota/RPC/tabela e sua policy, incluindo consultas diretas do cliente Supabase, e marcar quais validações são apenas UX. Não iniciar um segundo “motor” que contradiga RLS.

## 3. Matriz mínima para a primeira correção

| Ator/estado | Ler post permitido | Criar post | Editar próprio post | Excluir próprio post | Promover a si próprio em grupo |
| --- | --- | --- | --- | --- | --- |
| Membro ativo e autorizado | Sim | Sim | Sim | Sim, conforme contrato | Não |
| Suspenso com conteúdo anterior | Sim, se escopo permite | Não | Não | Não | Não |
| Membro da cidade sem acesso ao grupo | Conforme visibilidade | Não no grupo fechado | Não | Não | Não |
| Moderador de grupo | Conforme escopo | Conforme escopo | Apenas próprio conteúdo | Apenas próprio conteúdo | Não |
| Anônimo | Conteúdo público específico, se existir | Não | Não | Não | Não |

A matriz cobre o mínimo; confrontar com `docs/agents/redesenho/R2-comum.md` e as quatro matrizes R2 antes de editar banco, sobretudo exceções de denúncia, bloqueio e exclusão da própria conta.

## 4. Execução recomendada (sem quebra)

1. Capturar baseline de migrations, policy definitions, grants e cobertura de pgTAP contra um **banco local limpo**, separado de dados reais; consultar `scripts/security/audit-authorization.sql` para inventário somente de leitura.
2. Criar fixtures e **testes negativos que reproduzam** AUTHZ-001 e AUTHZ-002. Não aceitar somente inspeção estática.
3. Escrever ADR R3 com as transições permitidas, exceções e responsabilidades de validação (RPC/API/RLS). Revisão independente obrigatória.
4. Corrigir cada caso em migration **nova**, preservando histórico e o contrato de roteamento atual. Nunca editar migration aplicada nem usar `service_role` como atalho.
5. Rodar pgTAP, typecheck, testes de API e E2E relevantes, Supabase advisors e uma nova auditoria. Só considerar merge quando testes negativos provarem bloqueio e fluxos autorizados não regredirem.

## 5. Fronteiras e limites desta etapa

- Nenhum dado de conta, CPF, post ou usuário foi consultado: somente catálogo e metadados de segurança.
- Não houve SQL de escrita, alteração de RLS, grant/revoke, migration, deploy ou merge.
- A análise de triggers e constraints cobriu os objetos nucleares, não necessariamente **todas** as rotas e RPCs do produto.
- Os dois P0 são achados sustentados por catálogo, **não** testes exploratórios executados; confirmar com banco descartável.
- O frontend não é o ponto confiável de enforcement; ocultar ações não substitui autorização no backend e RLS.

## 6. Fontes

- `AGENTS.md` e `supabase/AGENTS.md`
- `docs/LANCAMENTO.md`
- `docs/decisions/ADR-20261024-front-react-spa.md`
- `docs/decisions/ADR-20260901-account-suspension.md`
- `docs/agents/redesenho/R2-comum.md`
- `supabase/migrations/20260905152703_fix_posts_insert_write_scope.sql`
- `supabase/migrations/20261107045155_operator_account_suspensions.sql`
- `supabase/migrations/20261107053256_account_unavailable_suspension_expiry.sql`
- Catálogos Postgres `pg_policies`, `pg_proc`, `pg_trigger`, `pg_constraint`, `has_table_privilege`, `has_column_privilege` e avisos do Supabase Security Advisor, consultados em 2026-11-13.
