# R3 — evidências

> Coordenação, 25/10: R3 bloqueada por orçamento, sem PASS. Ver
> `R3-HUMAN-DECISION.md` para provas confrontadas, limites e decisão necessária.
> As notas do produtor abaixo descrevem rascunho; não constituem aceite da revisão.

Base de partida: `66eda09b` (25/10/2026). Worktree `redesenho-r3/bivaque-community`.
Executor único; as provas de banco e o gate final são do coordenador pela fila.

## Arquivos entregues

| Arquivo | O que é |
|---|---|
| `supabase/migrations/20261025113717_redesenho_comunidade.sql` | migration do redesenho (uma transação, `begin;`/`commit;`) |
| `supabase/tests/redesenho-grupos.sql` | 42 asserções |
| `supabase/tests/redesenho-publicacoes.sql` | 26 asserções |
| `supabase/tests/redesenho-evento-pergunta.sql` | 24 asserções |
| `supabase/tests/redesenho-vila.sql` | 28 asserções |
| `supabase/tests/redesenho-bloqueio.sql` | 12 asserções |
| `supabase/tests/redesenho-definicoes.sql` | 12 asserções (golden + self-check) |
| `supabase/tests/redesenho-seguranca.sql` | 27 asserções (negativos da revisão) |
| `supabase/tests/fixtures/redesenho.inc` | fixtures do esquema novo |
| `supabase/seed.sql` | seed sem vila, grupos/publicações no esquema novo |
| `docs/agents/redesenho/R3-cobertura.md` | mapa célula → teste |

## Nome da migration e faixa reservada

A CLI 2.107.0 gerou `20261025113717_redesenho_comunidade.sql`. A faixa reservada pelo
ADR-20261024 §7 é `20261025100000`. A data gerada é diferente e foi **conservada**
(regra da RED-003); a equivalência está no cabeçalho do arquivo. Não houve colisão:
nenhuma outra migration começa com `2026102511`.

## Prova do contrato (executada nesta sessão, sem banco)

```
$ node scripts/agents/task-contract.mjs docs/agents/tasks/RED-003.task.yml
  ok  docs/agents/tasks/RED-003.task.yml (R3, retry 3)
1 contrato(s) válido(s).

$ node --test scripts/redesenho/conferir-matriz.test.mjs
✔ toda regra do retrato tem uma decisão só na matriz (50.7606ms)
ℹ tests 1  ℹ pass 1  ℹ fail 0
```

```
$ node --test scripts/redesenho/conferir-matriz.test.mjs
✔ toda regra do retrato tem uma decisão só na matriz
```

`conferir-retrato.test.mjs` não foi executado (não está na lista de provas da tarefa).

## Decisões onde a matriz divergia do ADR (registradas, não escondidas)

A parte `R2-matriz-vila-fundacao` gerou, por modelo mecânico, linhas `R1-003`,
`R1-108` e `R1-155` (as **colunas** `community_id` de `provider_invitations`,
`listings` e `provider_accounts`) com decisão **“mantida”** e motivo genérico, enquanto
o ADR-20261024 §1 e a própria prosa §3 dessa matriz dizem que `community_id` **sai**, e
as linhas das FKs (`R1-517`, `R1-608`, `R1-621`) decidem **“removida”**.
Prevaleceu o ADR + a prosa: as três colunas foram removidas. A coluna da matriz não foi
editada (proibido). Isto é um drift de documento, não um afrouxamento.

**E3 (R2-decisoes) supersede R1-232/R1-428.** As duas linhas decidiam “mantida” para o
gatilho que proibia o organizador de confirmar o próprio evento; a decisão do dono (E3)
aprova o organizador contando uma vez, sem se notificar. Nesta leva o gatilho
`event_rsvps_block_self_trigger` e a função `private.event_rsvps_block_self()` são
removidos; `redesenho-evento-pergunta.sql` prova positivo (confirma), unicidade (conta
uma vez) e ausência de autonotificação.

## Achados da revisão de segurança e reparo

`docs/agents/redesenho/R3-revisao-seguranca-1.md` (FAIL estático) tratado:

1. conta suspensa/em exclusão — helper `private.current_account_can_act()` aplicado às
   RPCs de grupo; `create_group`/`join_group` recusam conta indisponível.
2. não membro escreve em Aberto — `can_write_post_to` passou a exigir participação
   aprovada, mesmo em grupo Aberto.
3. escopo de evento — trigger `guard_event_scope_immutable` congela `organizer_id`,
   `locality_id`, `group_id`, `status`, recorrência e `created_at` ao caller
   `authenticated`.
4. transplante de comentário/metadados — triggers `guard_post_immutable` e
   `guard_comment_immutable`.
5. identidade de reagentes — `classgrant` de coluna em `post_reactions` sem `user_id`.
6. consumidores de bloqueio — adicionados a `profile_posts_for`, `profile_events_for`,
   `list_indications`, `event_rsvps` (select), `open_conversation` (contatar), foto de
   evento e aos triggers de notificação.
7. notificação após perder grupo — `leave_group`/`remove_group_member` apagam as
   confirmações de eventos do grupo; `notify_event_change` e os lembretes revalidam
   acesso ao grupo por destinatário.
8. Encerrado aceita mutação — RPCs administrativas checam `status='active'`; RSVP usa
   `private.event_accepts_interaction`.
9. **replay** — dependentes de `DROP TYPE`/`ALTER COLUMN` foram derrubados **antes**,
   nome a nome (`feed_*`, `create_group`, `list_available_groups_for_interests`,
   `suggest_groups_for_user`, `profile_posts_for`, `can_access_*`, `can_read_listing`,
   `can_see_provider`, `dm_context_valid`, `search_providers`, `get_profile_neighborhood`,
   `list_group_activity`), e recriados depois. Nenhum `CASCADE` cego. Os CHECKs que citam
   `post_type` são removidos antes da troca de enum e recriados depois.

## Limites (o que NÃO foi provado)

- **Nada de banco foi executado aqui.** Migration e pgTAP não foram aplicados/rodados;
  a prova é do coordenador pela fila (`prova-sequencia.mjs banco`). Nenhum PASS é
  possível só com o que está escrito.
- **Suíte antiga não reconciliada.** Dezenas de `supabase/tests/*.sql` ainda referenciam
  `communities`/`community_memberships`/`community_id` e vão falhar contra o esquema novo
  até serem adaptados. Isto é trabalho pendente desta leva, não feito — declarado, não
  escondido.
- **`database.generated.ts`** não regenerado (precisa do banco).
- **Golden textual das policies com subconsulta** ainda não fixado (ver R3-cobertura).
- `R4/R5/R6` (app, telas, integração/deploy) não foram tocados.
