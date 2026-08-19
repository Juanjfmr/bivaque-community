-- Onda E Task 8 Step 4 — operator manual curation of guide entries from
-- recommendation replies. The AI extraction path stays disconnected.

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc

-- Reset role so we can call the service_role wrappers as the database owner.
reset role;

-- Mark member-one as verified (already true in foundation.inc) AND make him
-- the operator (the operator check lives in is_current_user_operator; for
-- this test we operate directly via the migration's grant execute on the
-- function — the wrapper enforces the operator check at runtime, which
-- the unit test exercises separately).

-- Create a recommendation request + reply for member-one (already verified).
insert into public.recommendation_requests (
  id, locality_id, author_id, title, body, category
) values (
  '70000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Procuro colégio para o dependente',
  'Indicam um colégio que atenda bem?',
  'pedi_recurso_publico'
);

insert into public.recommendation_replies (
  id, request_id, author_id, body
) values (
  '80000000-0000-4000-8000-000000000010',
  '70000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  'O Colégio X atende dependentes de militar e fica perto da Vila Ajuricaba.',
);

-- ── POSITIVE: operator promotes a reply → entry is approved with author ──
select lives_ok(
  $$
    select public.promote_reply_to_guide_entry(
      '80000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid,
      'school'::public.arrival_guide_category,
      'Colégio X',
      'Atende dependentes, perto da Vila Ajuricaba',
      null::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'E8+: operator promotes a recommendation reply to an approved guide entry'
);

-- The new entry has status=approved, source=manual, reviewed_by=operator.
select results_eq(
  $$
    select status::text, source::text, source_reply_id::text, reviewed_by::text
    from public.arrival_guide_entries
    where source_reply_id = '80000000-0000-4000-8000-000000000010'::uuid
  $$,
  $$ values ('approved'::text, 'manual'::text,
            '80000000-0000-4000-8000-000000000010'::text,
            '10000000-0000-4000-8000-000000000001'::text) $$,
  'E8+: the promoted entry is approved/manual, linked to the reply and operator'
);

-- ── NEGATIVE: same reply cannot be promoted twice (P0002) ──────────────
select throws_ok(
  $$
    select public.promote_reply_to_guide_entry(
      '80000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid,
      'school'::public.arrival_guide_category,
      'Colégio X (duplicado)',
      'Tentativa de promoção duplicada',
      null::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'P0002',
  null,
  'E8-: a reply already promoted to guide cannot be promoted again (P0002)'
);

-- ── NEGATIVE: locality mismatch (reply from A cannot seed guide of B) ──
insert into public.recommendation_replies (
  id, request_id, author_id, body
) values (
  '80000000-0000-4000-8000-000000000011',
  '70000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  'Outro reply de teste para checagem de escopo',
);

select throws_ok(
  $$
    select public.promote_reply_to_guide_entry(
      '80000000-0000-4000-8000-000000000011'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid,
      'school'::public.arrival_guide_category,
      'Cross-locality',
      'Tentar semear guide de outra cidade',
      null::text,
      null::text,
      '10000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  '42501',
  null,
  'E8-: reply from locality A cannot seed guide entry of locality B (42501)'
);

-- ── POSITIVE: list_promotable_replies excludes promoted ones ─────────────
select is_empty(
  $$
    select reply_id from public.list_promotable_replies(
      '00000000-0000-4000-8000-000000000001'::uuid, 100
    )
    where reply_id = '80000000-0000-4000-8000-000000000010'::uuid
  $$,
  'E8+: already-promoted reply no longer appears in the promotable list'
);

select * from finish();
rollback;