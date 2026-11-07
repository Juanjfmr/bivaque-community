-- RUN-026 / ADR-20261107 item 2: opt-in, fila existente e descadastro sem sessão.
begin;

create type public.city_digest_frequency as enum ('off', 'daily', 'weekly');
alter table public.notification_preferences
  add column city_digest_frequency public.city_digest_frequency not null default 'off';
create index notification_preferences_city_digest_idx
  on public.notification_preferences(city_digest_frequency,user_id)
  where city_digest_frequency <> 'off';
-- As policies existentes já restringem SELECT/INSERT/UPDATE ao dono da sessão.

create table private.city_digest_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_period_at timestamptz not null,
  last_enqueued_at timestamptz,
  unsubscribe_hash bytea,
  unsubscribe_expires_at timestamptz
);
create unique index city_digest_unsubscribe_hash_idx on private.city_digest_state(unsubscribe_hash)
  where unsubscribe_hash is not null;
alter table private.city_digest_state enable row level security;
alter table private.city_digest_state force row level security;
revoke all on private.city_digest_state from public, anon, authenticated;

-- Só alcance cidade. Conteúdo de grupo/comunidade não entra por associação indireta.
-- Sem corpo, mídia ou endereço: autoria é apenas o nome que já aparece no app.
create function private.city_digest_content(p_user_id uuid, p_since timestamptz, p_until timestamptz)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with member as (
    select m.locality_id, l.city_name
    from public.locality_memberships m
    join public.localities l on l.id = m.locality_id
    join auth.users u on u.id = m.user_id
    where m.user_id = p_user_id and m.kind = 'current'
      and not private.account_unavailable(p_user_id)
      and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())
      and (private.is_verified_holder(p_user_id) or public.has_verified_family_holder(p_user_id))
  ), questions as (
    select r.id, r.title, r.created_at
    from public.recommendation_requests r join member m on m.locality_id = r.locality_id
    join auth.users a on a.id = r.author_id
    where r.group_id is null and not r.is_deleted
      and not private.account_unavailable(r.author_id)
      and a.deleted_at is null and (a.banned_until is null or a.banned_until <= now())
      and not exists (select 1 from public.hidden_questions h where h.user_id = p_user_id and h.request_id = r.id)
  ), new_questions as (
    select q.id, q.title from questions q
    where q.created_at > p_since and q.created_at <= p_until
    order by q.created_at, q.id limit 20
  ), next_events as (
    select e.id, e.title, e.starts_at
    from public.events e join member m on m.locality_id = e.locality_id
    join auth.users a on a.id = e.organizer_id
    where e.group_id is null and e.community_id is null and e.status = 'upcoming'
      and e.starts_at > greatest(p_until, now()) and e.starts_at <= p_until + interval '7 days'
      and not private.account_unavailable(e.organizer_id)
      and a.deleted_at is null and (a.banned_until is null or a.banned_until <= now())
    order by e.starts_at, e.id limit 20
  ), new_replies as (
    select q.id, q.title, coalesce(p.display_name, 'Membro') as author
    from public.recommendation_replies r
    join questions q on q.id = r.request_id
    join public.recommendation_requests own on own.id = q.id and own.author_id = p_user_id
    join auth.users a on a.id = r.author_id
    left join public.profiles p on p.user_id = r.author_id
    where not r.is_deleted and r.created_at > p_since and r.created_at <= p_until
      and r.author_id <> p_user_id and not private.account_unavailable(r.author_id)
      and a.deleted_at is null and (a.banned_until is null or a.banned_until <= now())
    order by r.created_at, r.id limit 20
  )
  select jsonb_build_object(
    'city', m.city_name,
    'questions', coalesce((select jsonb_agg(to_jsonb(q)) from new_questions q), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e)) from next_events e), '[]'::jsonb),
    'replies', coalesce((select jsonb_agg(to_jsonb(r)) from new_replies r), '[]'::jsonb)
  ) from member m;
$$;
revoke all on function private.city_digest_content(uuid,timestamptz,timestamptz) from public, anon, authenticated;

create function private.city_digest_has_news(p_content jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_array_length(p_content->'questions') + jsonb_array_length(p_content->'events')
    + jsonb_array_length(p_content->'replies') > 0, false);
$$;
revoke all on function private.city_digest_has_news(jsonb) from public, anon, authenticated;

create function public.enqueue_city_digests()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  member record;
  v_since timestamptz;
  v_period timestamptz;
  v_content jsonb;
  v_token text;
  v_count integer := 0;
begin
  -- Teto menor que o limite global de 5.000 do outbox; o dispatcher não muda.
  -- Trava a preferência: concorrência e descadastro não avançam a mesma pessoa.
  for member in
    select np.user_id, np.city_digest_frequency, u.email, s.last_enqueued_at,
      case when np.city_digest_frequency = 'daily' then date_trunc('day',now(),'UTC')
        else date_trunc('week',now(),'UTC') end as period_at
    from public.notification_preferences np
    join auth.users u on u.id = np.user_id
    left join private.city_digest_state s on s.user_id = np.user_id
    where np.city_digest_frequency <> 'off' and u.email is not null
      and not private.account_unavailable(np.user_id)
      and (s.last_period_at is null or s.last_period_at <
        case when np.city_digest_frequency = 'daily' then date_trunc('day',now(),'UTC')
          else date_trunc('week',now(),'UTC') end)
      and not exists (select 1 from public.notification_opt_outs o where o.channel = 'email' and o.recipient = u.email)
    order by s.last_period_at nulls first, np.user_id
    limit 100 for update of np skip locked
  loop
    v_period := member.period_at;
    v_since := greatest(coalesce(member.last_enqueued_at, '-infinity'::timestamptz),
      now() - case when member.city_digest_frequency = 'daily' then interval '1 day' else interval '7 days' end);
    v_content := private.city_digest_content(member.user_id, v_since, now());
    insert into private.city_digest_state(user_id,last_period_at)
      values(member.user_id,v_period)
      on conflict(user_id) do update set last_period_at = excluded.last_period_at;
    if not private.city_digest_has_news(v_content) then continue; end if;
    v_token := encode(extensions.gen_random_bytes(32),'hex');
    update private.city_digest_state set last_enqueued_at=now(),
      unsubscribe_hash=extensions.digest(v_token,'sha256'), unsubscribe_expires_at=now()+interval '30 days'
      where user_id=member.user_id;
    insert into public.outbox(recipient,channel,type,payload)
    values(member.email,'email','city_digest',jsonb_build_object(
      'user_id',member.user_id,'since',v_since,'until',now(),'content',v_content,
      'unsubscribe_token',v_token));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.enqueue_city_digests() from public, anon, authenticated;
grant execute on function public.enqueue_city_digests() to service_role;

-- Reconsulta antes da entrega: remoção, suspensão, mudança de cidade e opt-out
-- após enfileirar não podem transformar um snapshot antigo em divulgação.
create function public.city_digest_for_delivery(p_outbox_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_row public.outbox%rowtype;
  v_content jsonb;
  v_user_id uuid;
begin
  select * into v_row from public.outbox where id=p_outbox_id and type='city_digest' and status='pending';
  if not found then return null; end if;
  v_user_id := (v_row.payload->>'user_id')::uuid;
  if not exists (
    select 1 from public.notification_preferences np join auth.users u on u.id=np.user_id
    join private.city_digest_state s on s.user_id=np.user_id
    where np.user_id=v_user_id and np.city_digest_frequency <> 'off' and u.email=v_row.recipient
      and s.unsubscribe_hash=extensions.digest(v_row.payload->>'unsubscribe_token','sha256')
      and s.unsubscribe_expires_at > now()
  ) or exists (select 1 from public.notification_opt_outs o where o.channel='email' and o.recipient=v_row.recipient)
    then return null; end if;
  v_content := private.city_digest_content(v_user_id,(v_row.payload->>'since')::timestamptz,(v_row.payload->>'until')::timestamptz);
  -- Só os itens originalmente enfileirados; outra cidade ou edição posterior não cria novidade retroativa.
  select jsonb_set(jsonb_set(jsonb_set(v_content,
    '{questions}',coalesce((select jsonb_agg(x) from jsonb_array_elements(v_content->'questions') x where exists(select 1 from jsonb_array_elements(v_row.payload->'content'->'questions') old where old->>'id'=x->>'id')), '[]'::jsonb)),
    '{events}',coalesce((select jsonb_agg(x) from jsonb_array_elements(v_content->'events') x where exists(select 1 from jsonb_array_elements(v_row.payload->'content'->'events') old where old->>'id'=x->>'id')), '[]'::jsonb)),
    '{replies}',coalesce((select jsonb_agg(x) from jsonb_array_elements(v_content->'replies') x where exists(select 1 from jsonb_array_elements(v_row.payload->'content'->'replies') old where old->>'id'=x->>'id')), '[]'::jsonb)) into v_content;
  if not private.city_digest_has_news(v_content) then return null; end if;
  return v_content;
end;
$$;
revoke all on function public.city_digest_for_delivery(uuid) from public, anon, authenticated;
grant execute on function public.city_digest_for_delivery(uuid) to service_role;

create function public.unsubscribe_city_digest(p_token text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  select s.user_id into v_user_id from private.city_digest_state s
    where s.unsubscribe_hash=extensions.digest(p_token,'sha256') and s.unsubscribe_expires_at > now();
  if v_user_id is null then return false; end if;
  -- Mesma ordem de travas do job (preferência, estado).
  perform 1 from public.notification_preferences where user_id=v_user_id for update;
  update private.city_digest_state set unsubscribe_hash=null,unsubscribe_expires_at=null
    where user_id=v_user_id and unsubscribe_hash=extensions.digest(p_token,'sha256')
      and unsubscribe_expires_at > now();
  if not found then return false; end if;
  update public.notification_preferences set city_digest_frequency='off',updated_at=now() where user_id=v_user_id;
  update public.outbox set status='skipped',reserved_by=null,reserved_until=null,updated_at=now()
    where type='city_digest' and status='pending' and payload->>'user_id'=v_user_id::text;
  return true;
end;
$$;
revoke all on function public.unsubscribe_city_digest(text) from public, anon, authenticated;
grant execute on function public.unsubscribe_city_digest(text) to service_role;

create function private.dispatch_city_digests()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_endpoint text; v_secret text;
begin
  select decrypted_secret into v_endpoint from vault.decrypted_secrets where name='resumo-worker-endpoint';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='outbox-worker-secret';
  if coalesce(v_endpoint,'')='' or coalesce(v_secret,'')='' then return; end if;
  perform net.http_post(url:=rtrim(v_endpoint,'/')||'/api/internal/resumo',body:='{}'::jsonb,
    headers:=jsonb_build_object('Content-Type','application/json','x-outbox-secret',v_secret),timeout_milliseconds:=30000);
end;
$$;
revoke all on function private.dispatch_city_digests() from public, anon, authenticated;
select cron.schedule('bivaque-resumo-cidade','*/10 * * * *','select private.dispatch_city_digests()');
commit;
