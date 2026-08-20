# F4 (Onda F Task 4) — design question, parked

> Status: **not implemented.** Pending a decision from the owner on the
> recurrence model. The plan F4 Step 3 explicitly says: "Se o modelo do Step 1
> nao distinguir as duas [ocorrencias], ele esta errado — **pare e reporte antes
> de escrever a migration, porque isto decide o desenho inteiro.**" AGENTS.md echoes
> the same rule for design calls in general.

## The conflict

Step 1 mandates: **recorrencia is a column on the event, not a new series table with
materialized instances** — explicit anti-pattern. Materializing creates N rows to
moderate, N sets of RSVPs, and a cascade-edit problem.

Step 3 mandates: **the RSVP is of the occurrence** — RSVPs from September must not
bleed into October.

If the model is virtual (one row per recurring event, no materialization), the
existing `event_rsvps (event_id, user_id)` PK cannot distinguish occurrences: every
RSVP applies to whatever the next-up occurrence is. RSVPs from September silently
become RSVPs for October. **This is exactly the bug Step 3 calls out.**

## The two real options

**A — Materialize occurrences.** Each occurrence becomes its own row in `events`,
linked to a parent via a new `series_id`. RSVPs keep `(event_id, user_id)` PK and
naturally key per occurrence. Pro: zero migration of `event_rsvps`. Con: violates
Step 1 ("no tabela nova"); the plan's own critique applies.

**B — Virtual occurrences + `occurrence_date` on `event_rsvps`.** The recurring
event stays a single row; RSVPs get a new `occurrence_date date NOT NULL` column
and the PK becomes `(event_id, user_id, occurrence_date)`. A SQL function
`private.next_occurrence(p_event_id)` computes the next date from the rule; the
pg_cron job (already running since D1) advances it. Pro: matches Step 1 exactly.
Con: requires a small migration of an operational table.

## Recommended path

Option **B** satisfies both Steps 1 and 3. The PK migration is small:

- Add `occurrence_date date` (nullable initially).
- Backfill from `next_occurrence(events.id)` for every existing RSVP.
- Set NOT NULL, replace PK.
- Rewrite RLS policies if any reference the PK (none currently do).

## Status

- Migration: not written.
- Tests: not written.
- UI: not written.
- Holiday guard: not implemented.
- Reminder job: not implemented.

F4 remains open until the owner picks A or B.