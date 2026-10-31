-- Sugestão de referência do guia pelo membro (prancha 12/61: "Sugerir referência").
--
-- A curadoria continua humana e operacional: quem sugere NÃO publica. O membro
-- grava uma linha `pending` na mesma tabela que o operador já revisa em
-- /guide-queue, e é lá que ela vira `approved` ou `rejected`.
--
-- Por que uma função e não uma policy de INSERT: o default de `status` é
-- `approved` (a curadoria entrou depois, em 20260815210000). Um INSERT direto de
-- membro publicaria sozinho. A função força status='pending', source='manual',
-- locality da PRÓPRIA associação (nunca do cliente) e registra quem sugeriu.

-- Quem sugeriu: sem esta coluna o operador revisa uma linha anônima e ninguém
-- consegue aplicar cota. `on delete set null` mantém a sugestão (conteúdo)
-- quando a conta é apagada, sem guardar o vínculo — mesma linha do ADR de
-- exclusão para conteúdo de moderação.
alter table public.arrival_guide_entries
  add column submitted_by uuid references auth.users (id) on delete set null;

create index arrival_guide_entries_submitted_by_idx
  on public.arrival_guide_entries (submitted_by)
  where submitted_by is not null;

create function public.suggest_guide_entry(
  p_category public.arrival_guide_category,
  p_name text,
  p_description text,
  p_website_url text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_website text := nullif(btrim(coalesce(p_website_url, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_locality_id uuid;
  v_pending integer;
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select membership.locality_id
    into v_locality_id
    from public.locality_memberships membership
   where membership.user_id = v_user_id
     and membership.kind = 'current'
   order by membership.joined_at desc
   limit 1;

  if v_locality_id is null then
    raise exception 'only locality members can suggest guide references'
      using errcode = '42501';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'reference name must have between 2 and 120 characters'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 500 then
    raise exception 'reference description must have up to 500 characters'
      using errcode = '22023';
  end if;

  if v_website is not null and v_website !~ '^https?://' then
    raise exception 'reference website must start with http:// or https://'
      using errcode = '22023';
  end if;

  if v_phone is not null and v_phone !~ '^\+?[0-9() -]{8,30}$' then
    raise exception 'invalid reference phone' using errcode = '22023';
  end if;

  -- Cota: a fila é humana. Cinco sugestões pendentes por pessoa na mesma
  -- cidade é o teto; a série trava para duas requisições concorrentes não
  -- passarem juntas.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || v_locality_id::text, 0)
  );

  select count(*)::integer
    into v_pending
    from public.arrival_guide_entries entry
   where entry.submitted_by = v_user_id
     and entry.locality_id = v_locality_id
     and entry.status = 'pending';

  if v_pending >= 5 then
    raise exception 'maximum 5 pending guide suggestions per member'
      using errcode = '54000';
  end if;

  insert into public.arrival_guide_entries (
    locality_id,
    category,
    name,
    description,
    website_url,
    phone,
    status,
    source,
    submitted_by
  )
  values (
    v_locality_id,
    p_category,
    v_name,
    v_description,
    v_website,
    v_phone,
    'pending',
    'manual',
    v_user_id
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.suggest_guide_entry(
  public.arrival_guide_category,
  text,
  text,
  text,
  text
) from public, anon;
grant execute on function public.suggest_guide_entry(
  public.arrival_guide_category,
  text,
  text,
  text,
  text
) to authenticated;
