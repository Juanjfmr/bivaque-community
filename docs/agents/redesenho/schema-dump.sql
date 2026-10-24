


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "private"."eligibility_class" AS ENUM (
    'active_federal_military',
    'veteran',
    'military_pensioner'
);


ALTER TYPE "private"."eligibility_class" OWNER TO "postgres";


CREATE TYPE "private"."family_invitation_status" AS ENUM (
    'pending',
    'accepted',
    'revoked',
    'expired'
);


ALTER TYPE "private"."family_invitation_status" OWNER TO "postgres";


CREATE TYPE "private"."provider_invitation_status" AS ENUM (
    'pending',
    'accepted',
    'revoked',
    'expired'
);


ALTER TYPE "private"."provider_invitation_status" OWNER TO "postgres";


CREATE TYPE "private"."verification_document_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "private"."verification_document_status" OWNER TO "postgres";


CREATE TYPE "private"."verification_status" AS ENUM (
    'pending',
    'verified',
    'rejected',
    'temporary_error'
);


ALTER TYPE "private"."verification_status" OWNER TO "postgres";


CREATE TYPE "public"."arrival_guide_category" AS ENUM (
    'school',
    'hospital',
    'transporter',
    'courier'
);


ALTER TYPE "public"."arrival_guide_category" OWNER TO "postgres";


CREATE TYPE "public"."community_invitation_status" AS ENUM (
    'pending',
    'accepted',
    'revoked',
    'expired'
);


ALTER TYPE "public"."community_invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."community_membership_role" AS ENUM (
    'member',
    'moderator',
    'owner'
);


ALTER TYPE "public"."community_membership_role" OWNER TO "postgres";


CREATE TYPE "public"."community_membership_status" AS ENUM (
    'pending',
    'approved'
);


ALTER TYPE "public"."community_membership_status" OWNER TO "postgres";


CREATE TYPE "public"."dm_context_type" AS ENUM (
    'shared_group',
    'shared_event',
    'recommendation_thread',
    'accepted_family',
    'provider',
    'listing',
    'event_question',
    'service_request'
);


ALTER TYPE "public"."dm_context_type" OWNER TO "postgres";


CREATE TYPE "public"."entry_moment" AS ENUM (
    'arriving',
    'resident',
    'leaving'
);


ALTER TYPE "public"."entry_moment" OWNER TO "postgres";


CREATE TYPE "public"."event_invite_status" AS ENUM (
    'pending',
    'accepted',
    'declined'
);


ALTER TYPE "public"."event_invite_status" OWNER TO "postgres";


CREATE TYPE "public"."event_rsvp_status" AS ENUM (
    'interested',
    'going',
    'not_going'
);


ALTER TYPE "public"."event_rsvp_status" OWNER TO "postgres";


CREATE TYPE "public"."event_status" AS ENUM (
    'upcoming',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."event_status" OWNER TO "postgres";


CREATE TYPE "public"."group_membership_role" AS ENUM (
    'member',
    'moderator',
    'owner'
);


ALTER TYPE "public"."group_membership_role" OWNER TO "postgres";


CREATE TYPE "public"."group_membership_status" AS ENUM (
    'pending',
    'approved'
);


ALTER TYPE "public"."group_membership_status" OWNER TO "postgres";


CREATE TYPE "public"."group_notify_level" AS ENUM (
    'all',
    'highlights',
    'none'
);


ALTER TYPE "public"."group_notify_level" OWNER TO "postgres";


CREATE TYPE "public"."group_visibility" AS ENUM (
    'public',
    'private'
);


ALTER TYPE "public"."group_visibility" OWNER TO "postgres";


CREATE TYPE "public"."listing_condition" AS ENUM (
    'new',
    'used'
);


ALTER TYPE "public"."listing_condition" OWNER TO "postgres";


CREATE TYPE "public"."listing_deal" AS ENUM (
    'rent',
    'sale'
);


ALTER TYPE "public"."listing_deal" OWNER TO "postgres";


CREATE TYPE "public"."listing_kind" AS ENUM (
    'item',
    'property'
);


ALTER TYPE "public"."listing_kind" OWNER TO "postgres";


CREATE TYPE "public"."listing_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'reserved',
    'sold',
    'closed'
);


ALTER TYPE "public"."listing_status" OWNER TO "postgres";


CREATE TYPE "public"."locality_admission_mode" AS ENUM (
    'invite_only',
    'waitlist_only',
    'verification_gated'
);


ALTER TYPE "public"."locality_admission_mode" OWNER TO "postgres";


CREATE TYPE "public"."locality_membership_access" AS ENUM (
    'active',
    'read_only'
);


ALTER TYPE "public"."locality_membership_access" OWNER TO "postgres";


CREATE TYPE "public"."locality_membership_kind" AS ENUM (
    'current',
    'leaving'
);


ALTER TYPE "public"."locality_membership_kind" OWNER TO "postgres";


CREATE TYPE "public"."notification_channel" AS ENUM (
    'in_app',
    'email'
);


ALTER TYPE "public"."notification_channel" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'comment',
    'group_admission',
    'invitation_accepted',
    'event_rsvp',
    'event_change',
    'direct_message',
    'report_resolved',
    'event_reminder',
    'recommendation_reply',
    'admission_rejected',
    'listing_alert',
    'service_request',
    'recommendation_request',
    'support_answered',
    'group_post'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."outbox_channel" AS ENUM (
    'email'
);


ALTER TYPE "public"."outbox_channel" OWNER TO "postgres";


COMMENT ON TYPE "public"."outbox_channel" IS 'Canal de entrega do outbox. Um valor so (email) desde 18/09/2026: o WhatsApp saiu do MVP por decisao do responsavel, e o enum diz a verdade em vez de guardar um canal que o adaptador recusa.';



CREATE TYPE "public"."outbox_status" AS ENUM (
    'pending',
    'sent',
    'failed',
    'skipped'
);


ALTER TYPE "public"."outbox_status" OWNER TO "postgres";


CREATE TYPE "public"."post_type" AS ENUM (
    'text',
    'photo',
    'link',
    'poll'
);


ALTER TYPE "public"."post_type" OWNER TO "postgres";


CREATE TYPE "public"."profile_visibility" AS ENUM (
    'locality_members'
);


ALTER TYPE "public"."profile_visibility" OWNER TO "postgres";


CREATE TYPE "public"."property_type" AS ENUM (
    'apartment',
    'house',
    'studio',
    'room',
    'land',
    'commercial'
);


ALTER TYPE "public"."property_type" OWNER TO "postgres";


CREATE TYPE "public"."provider_category" AS ENUM (
    'alimentacao',
    'casa_e_reformas',
    'assistencia_tecnica',
    'mudanca_e_transporte',
    'imoveis',
    'documentacao_e_financas',
    'saude_e_bem_estar',
    'beleza',
    'educacao_e_aulas',
    'automotivo',
    'eventos_e_festas',
    'pets'
);


ALTER TYPE "public"."provider_category" OWNER TO "postgres";


CREATE TYPE "public"."provider_reach_scope" AS ENUM (
    'community',
    'locality'
);


ALTER TYPE "public"."provider_reach_scope" OWNER TO "postgres";


CREATE TYPE "public"."provider_reach_source" AS ENUM (
    'free',
    'paid'
);


ALTER TYPE "public"."provider_reach_source" OWNER TO "postgres";


CREATE TYPE "public"."recommendation_category" AS ENUM (
    'servicos_locais',
    'saude_bem_estar',
    'educacao',
    'esporte_lazer',
    'alimentacao',
    'transporte',
    'moradia',
    'outros'
);


ALTER TYPE "public"."recommendation_category" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'open',
    'resolved'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


CREATE TYPE "public"."report_target_type" AS ENUM (
    'post',
    'comment',
    'group',
    'message',
    'recommendation_request',
    'recommendation_reply',
    'provider_profile'
);


ALTER TYPE "public"."report_target_type" OWNER TO "postgres";


CREATE TYPE "public"."service_request_status" AS ENUM (
    'open',
    'in_conversation',
    'closed',
    'cancelled'
);


ALTER TYPE "public"."service_request_status" OWNER TO "postgres";


CREATE TYPE "public"."support_ticket_status" AS ENUM (
    'open',
    'answered'
);


ALTER TYPE "public"."support_ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."support_ticket_topic" AS ENUM (
    'conta',
    'comunidade',
    'anuncios',
    'seguranca',
    'outro'
);


ALTER TYPE "public"."support_ticket_topic" OWNER TO "postgres";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "private"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_invitation private.family_invitations;
  v_invitee_email_digest bytea;
  v_link_id uuid;
begin
  select *
    into v_invitation
    from private.family_invitations
    where token_digest = p_token_digest;

  if not found then
    raise exception 'family_invitation_not_found' using errcode = 'P0001';
  end if;

  if v_invitation.status = 'accepted' then
    raise exception 'family_invitation_already_used' using errcode = 'P0003';
  end if;

  if v_invitation.status = 'revoked' then
    raise exception 'family_invitation_revoked' using errcode = 'P0004';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'family_invitation_expired' using errcode = 'P0002';
  end if;

  -- v_invitation.status must be 'pending' here.

  select extensions.digest(lower(trim(email)), 'sha256')
    into v_invitee_email_digest
    from auth.users
    where id = p_accepted_by_user_id;

  if v_invitee_email_digest is null then
    raise exception 'accepting user not found' using errcode = 'P0001';
  end if;

  -- E-mail divergente: responde EXATAMENTE como "não existe". Quem
  -- encaminhou o link não pode distinguir "token errado" de "token certo,
  -- pessoa errada" — caso contrário, o único caminho sem CPF vira
  -- enumeração. Por isso reusa o P0001, não um código próprio.
  if v_invitee_email_digest <> v_invitation.invitee_email_digest then
    raise exception 'family_invitation_not_found' using errcode = 'P0001';
  end if;

  update private.family_invitations
    set status = 'accepted',
        accepted_by_user_id = p_accepted_by_user_id,
        accepted_at = now()
    where id = v_invitation.id;

  insert into private.family_account_links (
    invitation_id,
    holder_user_id,
    family_user_id
  )
  values (
    v_invitation.id,
    v_invitation.inviter_user_id,
    p_accepted_by_user_id
  )
  returning id into v_link_id;

  return v_link_id;
end;
$$;


ALTER FUNCTION "private"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."account_deletion_batch_size"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select 20::integer;
$$;


ALTER FUNCTION "private"."account_deletion_batch_size"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."account_deletion_claim_due"("p_limit" integer) RETURNS SETOF "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ids uuid[];
begin
  select array_agg(due.user_id) into v_ids
  from (
    select r.user_id
    from public.account_deletion_requests r
    where r.finalized_at is null
      and r.due_at <= now()
      and (
        r.purge_attempted_at is null
        or r.purge_attempted_at + least(
             private.account_deletion_retry_interval() * power(2, r.purge_attempts),
             private.account_deletion_retry_ceiling()
           ) <= now()
      )
    order by r.due_at asc
    limit greatest(p_limit, 0)
    for update skip locked
  ) as due;

  if v_ids is null then
    return;
  end if;

  update public.account_deletion_requests
     set purge_attempts = purge_attempts + 1,
         purge_attempted_at = now()
   where user_id = any (v_ids);

  return query select unnest(v_ids);
end;
$$;


ALTER FUNCTION "private"."account_deletion_claim_due"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."account_deletion_dispatch_due"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_endpoint text;
  v_secret text;
  v_ids jsonb;
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'account-deletion-endpoint';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'account-deletion-secret';

  -- Sem os dois segredos do Vault é um no-op: o job pode ser instalado antes
  -- de existir URL de deploy.
  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return 0;
  end if;

  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_ids
  from private.account_deletion_claim_due(private.account_deletion_batch_size()) as id;

  if v_ids = '[]'::jsonb then
    return 0;
  end if;

  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/internal/account-deletion',
    body := jsonb_build_object('user_ids', v_ids),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-account-deletion-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );

  return jsonb_array_length(v_ids);
end;
$$;


ALTER FUNCTION "private"."account_deletion_dispatch_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."account_deletion_requested"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.account_deletion_requests where user_id = p_user_id
  );
$$;


ALTER FUNCTION "private"."account_deletion_requested"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."account_deletion_retry_ceiling"() RETURNS interval
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select interval '1 day';
$$;


ALTER FUNCTION "private"."account_deletion_retry_ceiling"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."account_deletion_retry_interval"() RETURNS interval
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select interval '1 hour';
$$;


ALTER FUNCTION "private"."account_deletion_retry_interval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."account_deletion_window"() RETURNS interval
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select interval '15 days';
$$;


ALTER FUNCTION "private"."account_deletion_window"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."block_authenticated_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if current_user = 'authenticated' then
    raise exception 'only service_role can toggle is_deleted';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."block_authenticated_soft_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."block_group_community_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception 'groups.community_id is immutable';
end;
$$;


ALTER FUNCTION "private"."block_group_community_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_event"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and private.is_locality_member(e.locality_id)
      and (
        e.community_id is null
        or private.is_community_member(e.community_id)
      )
      and (
        e.group_id is null
        or private.is_group_member(e.group_id)
        or exists (
          select 1
          from public.groups g
          where g.id = e.group_id
            and g.visibility = 'public'
            and (
              g.community_id is null
              or private.is_community_member(g.community_id)
            )
        )
      )
  );
$$;


ALTER FUNCTION "private"."can_access_event"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_post"("p_post_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and private.can_access_post_scope(p.locality_id, p.community_id, p.group_id)
  );
$$;


ALTER FUNCTION "private"."can_access_post"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_post_scope"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    private.is_locality_member(p_locality_id)
    and (
      p_community_id is null
      or private.is_community_member(p_community_id)
    )
    and (
      p_group_id is null
      or private.is_group_member(p_group_id)
      or exists (
        select 1
        from public.groups g
        where g.id = p_group_id
          and g.visibility = 'public'
          and (
            g.community_id is null
            or private.is_community_member(g.community_id)
          )
      )
    );
$$;


ALTER FUNCTION "private"."can_access_post_scope"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_dm_between"("p_user_a" "uuid", "p_user_b" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    exists (
      select 1
      from public.group_memberships a
      join public.group_memberships b
        on b.group_id = a.group_id
       and b.user_id = p_user_b
      where a.user_id = p_user_a
        and a.status = 'approved'
        and b.status = 'approved'
    )
    or exists (
      select 1
      from public.event_rsvps a
      join public.event_rsvps b
        on b.event_id = a.event_id
       and b.user_id = p_user_b
      where a.user_id = p_user_a
    )
    or exists (
      select 1
      from public.recommendation_replies ra
      join public.recommendation_replies rb
        on rb.request_id = ra.request_id
       and rb.author_id = p_user_b
      where ra.author_id = p_user_a
      union
      select 1
      from public.recommendation_requests r
      join public.recommendation_replies rep
        on rep.request_id = r.id
      where (r.author_id = p_user_a and rep.author_id = p_user_b)
         or (r.author_id = p_user_b and rep.author_id = p_user_a)
    )
    or exists (
      select 1
      from private.family_account_links
      where (holder_user_id = p_user_a and family_user_id = p_user_b)
         or (holder_user_id = p_user_b and family_user_id = p_user_a)
    );
$$;


ALTER FUNCTION "private"."can_dm_between"("p_user_a" "uuid", "p_user_b" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_read_listing"("p_listing_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
      from public.listings l
     where l.id = p_listing_id
       and (
         l.owner_user_id = (select auth.uid())
         or (
           l.status = 'active'
           and (
             (
               l.community_id is not null
               and exists (
                 select 1
                   from public.community_memberships cm
                  where cm.community_id = l.community_id
                    and cm.user_id = (select auth.uid())
                    and cm.status = 'approved'
               )
             )
             or (
               l.locality_id is not null
               and (
                 exists (
                   select 1
                     from public.locality_memberships lm
                    where lm.locality_id = l.locality_id
                      and lm.user_id = (select auth.uid())
                 )
                 or private.has_current_locality()
               )
             )
           )
         )
       )
  );
$$;


ALTER FUNCTION "private"."can_read_listing"("p_listing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_read_service_request"("p_request_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
      from public.service_requests r
     where r.id = p_request_id
       and (
         r.requester_user_id = (select auth.uid())
         or r.provider_user_id = (select auth.uid())
       )
  );
$$;


ALTER FUNCTION "private"."can_read_service_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_event public.events%rowtype;
  v_in_locality boolean;
begin
  select * into v_event from public.events e where e.id = p_event_id;
  if not found then
    return false;
  end if;

  -- Invitee must be a member of the event's locality.
  select exists (
    select 1 from public.locality_memberships lm
    where lm.locality_id = v_event.locality_id
      and lm.user_id = p_user_id
  ) into v_in_locality;

  if not v_in_locality then
    return false;
  end if;

  -- Community scope: if the event is community-bound, invitee must be an
  -- approved member of that community.
  if v_event.community_id is not null then
    if not exists (
      select 1 from public.community_memberships cm
      where cm.community_id = v_event.community_id
        and cm.user_id = p_user_id
        and cm.status = 'approved'
    ) then
      return false;
    end if;
  end if;

  -- Group scope: if the event is group-bound, invitee must be an approved
  -- group member OR the group is public and the invitee is a locality member
  -- (already established above).
  if v_event.group_id is not null then
    if not exists (
      select 1 from public.groups g
      where g.id = v_event.group_id and g.visibility = 'public'
    ) then
      -- private group: must be approved member
      if not exists (
        select 1 from public.group_memberships gm
        where gm.group_id = v_event.group_id
          and gm.user_id = p_user_id
          and gm.status = 'approved'
      ) then
        return false;
      end if;
    end if;
  end if;

  return true;
end;
$$;


ALTER FUNCTION "private"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_see_locality_recommendation"("target_locality_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.locality_memberships
    where user_id = (select auth.uid())
      and locality_id = target_locality_id
  );
$$;


ALTER FUNCTION "private"."can_see_locality_recommendation"("target_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_see_provider"("p_provider_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
      from public.provider_profiles p
     where p.id = p_provider_id
       and p.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
      from public.provider_profiles p
      join public.provider_reach r
        on r.provider_id = p.id
       and r.active
     where p.id = p_provider_id
       and p.is_deleted = false
       and (
         (
           exists (
             select 1
               from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
                and pa.revoked_at is null
           )
           and (
             (
               r.scope_type = 'community'
               and exists (
                 select 1
                   from public.community_memberships cm
                  where cm.community_id = r.scope_id
                    and cm.user_id = (select auth.uid())
                    and cm.status = 'approved'
               )
             )
             or (
               r.scope_type = 'locality'
               and exists (
                 select 1
                   from public.locality_memberships lm
                  where lm.locality_id = r.scope_id
                    and lm.user_id = (select auth.uid())
               )
             )
           )
         )
         or (
           not exists (
             select 1 from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
           )
           and r.scope_type = 'locality'
           and r.source = 'free'
           and exists (
             select 1
               from public.locality_memberships owner_membership
              where owner_membership.user_id = p.owner_user_id
                and owner_membership.locality_id = r.scope_id
                and owner_membership.kind = 'current'
                and owner_membership.access = 'active'
           )
           and exists (
           select 1
               from public.locality_memberships viewer_membership
              where viewer_membership.user_id = (select auth.uid())
                and viewer_membership.locality_id = r.scope_id
                and viewer_membership.kind = 'current'
                and viewer_membership.access = 'active'
         )
         )
       )
  );
$$;


ALTER FUNCTION "private"."can_see_provider"("p_provider_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_user_read_listing"("p_user_id" "uuid", "p_listing_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
      from public.listings l
     where l.id = p_listing_id
       and (
         l.owner_user_id = p_user_id
         or (
           l.status = 'active'
           and (
             (
               l.community_id is not null
               and exists (
                 select 1
                   from public.community_memberships cm
                  where cm.community_id = l.community_id
                    and cm.user_id = p_user_id
                    and cm.status = 'approved'
               )
             )
             or (
               l.locality_id is not null
               and exists (
                 select 1
                   from public.locality_memberships lm
                  where lm.locality_id = l.locality_id
                    and lm.user_id = p_user_id
               )
             )
           )
         )
       )
  );
$$;


ALTER FUNCTION "private"."can_user_read_listing"("p_user_id" "uuid", "p_listing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_write_post_to"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.is_active_locality_member(p_locality_id)
    and private.can_access_post_scope(p_locality_id, p_community_id, p_group_id);
$$;


ALTER FUNCTION "private"."can_write_post_to"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."canonicalize_profile_neighborhood"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_text text := nullif(
    pg_catalog.regexp_replace(
      pg_catalog.btrim(coalesce(new.neighborhood, '')), '\s+', ' ', 'g'
    ),
    ''
  );
  v_canonical text;
begin
  new.neighborhood := v_text;

  if v_text is null then
    return new;
  end if;

  select n.name
    into v_canonical
    from public.neighborhoods n
    join public.locality_memberships m
      on m.locality_id = n.locality_id
   where m.user_id = new.user_id
     and m.kind = 'current'
     and n.name_key = private.neighborhood_name_key(v_text)
   limit 1;

  if v_canonical is not null then
    new.neighborhood := v_canonical;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."canonicalize_profile_neighborhood"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cascade_community_membership_downgrade"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  delete from public.group_memberships gm
  using public.groups g
  where gm.group_id = g.id
    and g.community_id = new.community_id
    and gm.user_id = new.user_id;

  return new;
end;
$$;


ALTER FUNCTION "private"."cascade_community_membership_downgrade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cascade_community_membership_loss"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_owner_user_id uuid;
begin
  select owner_user_id into v_owner_user_id
  from public.communities
  where id = old.community_id;

  if old.user_id = v_owner_user_id then
    raise exception 'transfer community ownership before removing the owner';
  end if;

  update public.groups g
  set owner_user_id = v_owner_user_id
  where g.community_id = old.community_id
    and g.owner_user_id = old.user_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  select g.id, v_owner_user_id, 'owner', 'approved'
  from public.groups g
  where g.community_id = old.community_id
    and g.owner_user_id = v_owner_user_id
  on conflict (group_id, user_id)
  do update set role = 'owner', status = 'approved';

  delete from public.group_memberships gm
  using public.groups g
  where gm.group_id = g.id
    and g.community_id = old.community_id
    and gm.user_id = old.user_id;

  return old;
end;
$$;


ALTER FUNCTION "private"."cascade_community_membership_loss"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."check_verified_holder"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from private.verification_outcomes
    where user_id = p_user_id
      and status = 'verified'
  );
$$;


ALTER FUNCTION "private"."check_verified_holder"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."consume_group_join_attempt"("p_group_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_group_id::text || ':' || p_user_id::text, 0)
  );

  select count(*)::integer
  into v_count
  from public.group_join_attempts
  where group_id = p_group_id
    and user_id = p_user_id
    and attempted_at >= now() - interval '30 days';

  if v_count >= 3 then
    return false;
  end if;

  insert into public.group_join_attempts (group_id, user_id)
  values (p_group_id, p_user_id);

  return true;
end;
$$;


ALTER FUNCTION "private"."consume_group_join_attempt"("p_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."consume_verification_attempt"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_last_attempt timestamptz;
  v_attempt_count integer;
begin
  select last_attempt_at, attempt_count
  into v_last_attempt, v_attempt_count
  from private.verification_outcomes
  where user_id = p_user_id
  for update;

  if not found then
    insert into private.verification_outcomes (
      user_id,
      status,
      attempt_count,
      first_attempt_at,
      last_attempt_at
    )
    values (
      p_user_id,
      'pending',
      1,
      now(),
      now()
    );
    return true;
  end if;

  if v_last_attempt is null or v_last_attempt < now() - interval '1 hour' then
    update private.verification_outcomes
    set
      attempt_count = 1,
      first_attempt_at = now(),
      last_attempt_at = now()
    where user_id = p_user_id;
    return true;
  end if;

  if v_attempt_count >= 3 then
    return false;
  end if;

  update private.verification_outcomes
  set
    attempt_count = v_attempt_count + 1,
    last_attempt_at = now()
  where user_id = p_user_id;

  return true;
end;
$$;


ALTER FUNCTION "private"."consume_verification_attempt"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_verified boolean;
  v_active_count integer;
  v_invitation_id uuid;
begin
  select status = 'verified'
  into v_verified
  from private.verification_outcomes
  where user_id = p_inviter_user_id;

  if v_verified is not true then
    raise exception 'only verified holders can create invitations';
  end if;

  select count(*)::integer
  into v_active_count
  from private.family_invitations
  where inviter_user_id = p_inviter_user_id
    and status = 'pending'
    and expires_at > now();

  if v_active_count >= 5 then
    raise exception 'maximum 5 active invitations per holder';
  end if;

  insert into private.family_invitations (
    inviter_user_id,
    token_digest,
    invitee_email_digest,
    expires_at
  )
  values (
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;


ALTER FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_verified boolean;
  v_active_count integer;
  v_invitation_id uuid;
begin
  select status = 'verified'
  into v_verified
  from private.verification_outcomes
  where user_id = p_inviter_user_id;

  if v_verified is not true then
    raise exception 'only verified holders can create invitations';
  end if;

  select count(*)::integer
  into v_active_count
  from private.family_invitations
  where inviter_user_id = p_inviter_user_id
    and status = 'pending'
    and expires_at > now();

  if v_active_count >= 5 then
    raise exception 'maximum 5 active invitations per holder';
  end if;

  insert into private.family_invitations (
    inviter_user_id,
    token_digest,
    invitee_email_digest,
    invitee_email_hint,
    expires_at
  )
  values (
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint,
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;


ALTER FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_invitation_id uuid;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  v_invitation_id := private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint
  );

  update private.family_invitations
     set code_hash = p_code_hash
   where id = v_invitation_id;

  return v_invitation_id;
end;
$$;


ALTER FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."default_event_rsvp_occurrence"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.occurrence_date is null then
    select e.starts_at::date into new.occurrence_date
    from public.events e
    where e.id = new.event_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."default_event_rsvp_occurrence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."dispatch_indication_alerts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_request record;
  v_user uuid;
  v_count integer := 0;
begin
  -- Pedido novo.
  for v_request in
    select r.id, coalesce(r.locality_id, g.locality_id) as locality_id
      from public.recommendation_requests r
      left join public.groups g on g.id = r.group_id
     where not r.is_deleted
       and not r.is_resolved
       and r.created_at > now() - interval '2 hours'
  loop
    for v_user in select rr.user_id from private.indication_recipients(v_request.id) rr loop
      if private.notify_indication(v_user, v_request.id, 'new', v_request.locality_id) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  -- Parado 24 h sem nenhuma resposta.
  for v_request in
    select r.id, coalesce(r.locality_id, g.locality_id) as locality_id
      from public.recommendation_requests r
      left join public.groups g on g.id = r.group_id
     where not r.is_deleted
       and not r.is_resolved
       and r.created_at <= now() - interval '24 hours'
       and r.created_at > now() - interval '26 hours'
       and not exists (
         select 1 from public.recommendation_replies rep
          where rep.request_id = r.id and not rep.is_deleted
       )
  loop
    for v_user in select rr.user_id from private.indication_recipients(v_request.id) rr loop
      if private.notify_indication(v_user, v_request.id, 'unanswered', v_request.locality_id) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  -- "Alguma resposta ajudou a resolver?" para quem pediu: 3 dias depois da
  -- primeira resposta, se nada foi marcado. A faixa até 10 dias evita perguntar
  -- sobre pedidos antigos quando o job entra no ar.
  for v_request in
    select r.id, r.author_id
      from public.recommendation_requests r
     where not r.is_deleted
       and not r.is_resolved
       and (
         select min(rep.created_at)
           from public.recommendation_replies rep
          where rep.request_id = r.id and not rep.is_deleted
       ) between now() - interval '10 days' and now() - interval '3 days'
       and not private.account_deletion_requested(r.author_id)
       and private.notification_channel_allows('recommendation_request', 'in_app', r.author_id)
  loop
    if private.notify_indication(v_request.author_id, v_request.id, 'resolve_prompt', null) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "private"."dispatch_indication_alerts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."dispatch_indication_digest"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select u.id as user_id,
           u.email,
           lm.locality_id,
           loc.city_name,
           count(r.id)::integer as open_count,
           (array_agg(r.title order by r.created_at desc))[1:5] as titles
      from public.notification_channel_preferences ncp
      join auth.users u on u.id = ncp.user_id
      join public.locality_memberships lm
        on lm.user_id = u.id and lm.access = 'active'
      join public.localities loc on loc.id = lm.locality_id
      join public.recommendation_requests r
        on r.locality_id = lm.locality_id
       and r.author_id <> u.id
       and not r.is_deleted
       and not r.is_resolved
       and r.created_at > now() - interval '24 hours'
       and not exists (
         select 1 from public.recommendation_replies rep
          where rep.request_id = r.id and not rep.is_deleted
       )
     where ncp.notification_type = 'indications'
       and ncp.channel = 'email'
       and ncp.enabled
       and u.email is not null
       and not private.account_deletion_requested(u.id)
       and private.notification_channel_allows('indications_digest', 'email', u.id)
       and not exists (
         select 1 from public.outbox o
          where o.type = 'indications_digest'
            and o.payload ->> 'user_id' = u.id::text
            and o.created_at > now() - interval '20 hours'
       )
     group by u.id, u.email, lm.locality_id, loc.city_name
  loop
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_row.email,
      'email',
      'indications_digest',
      jsonb_build_object(
        'user_id', v_row.user_id,
        'locality_id', v_row.locality_id,
        'city_name', v_row.city_name,
        'open_count', v_row.open_count,
        'titles', to_jsonb(v_row.titles)
      )
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;


ALTER FUNCTION "private"."dispatch_indication_digest"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."dispatch_listing_alerts"("p_limit" integer DEFAULT 200) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    with candidates as (
      select a.id as alert_id,
             a.owner_user_id,
             a.name as alert_name,
             l.id as listing_id,
             l.title as listing_title
        from public.listing_alerts a
        join public.listings l
          on l.kind = a.kind
         and l.status = 'active'
         and l.published_at is not null
         and l.published_at > a.created_at
        join public.property_details pd
          on pd.listing_id = l.id
       where a.is_active
         and (a.locality_id is null or l.locality_id = a.locality_id)
         and (a.neighborhood is null or lower(l.neighborhood) = lower(a.neighborhood))
         and (a.deal is null or pd.deal = a.deal)
         and (
           a.max_value_cents is null
           or coalesce(pd.rent_cents, pd.sale_price_cents) <= a.max_value_cents
         )
         and (a.min_bedrooms is null or pd.bedrooms >= a.min_bedrooms)
         and private.can_user_read_listing(a.owner_user_id, l.id)
         and not exists (
           select 1
             from public.listing_alert_deliveries d
            where d.alert_id = a.id
              and d.listing_id = l.id
         )
       order by l.published_at
       limit greatest(p_limit, 0)
    ),
    inserted as (
      insert into public.listing_alert_deliveries (alert_id, listing_id)
      select c.alert_id, c.listing_id
        from candidates c
      on conflict (alert_id, listing_id) do nothing
      returning alert_id, listing_id
    )
    select i.alert_id,
           i.listing_id,
           a.owner_user_id,
           a.name as alert_name,
           l.title as listing_title
      from inserted i
      join public.listing_alerts a on a.id = i.alert_id
      join public.listings l on l.id = i.listing_id
  loop
    -- Aviso in-app.
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_row.owner_user_id, null, 'listing_alert', 'created', 'listing', v_row.listing_id);

    -- Aviso por e-mail pelo outbox existente. O despachante é quem checa
    -- opt-out e preferência — o produtor não duplica essa decisão.
    insert into public.outbox (recipient, channel, type, payload)
    select u.email,
           'email',
           'listing_alert',
           jsonb_build_object(
             'user_id', v_row.owner_user_id,
             'alert_id', v_row.alert_id,
             'listing_id', v_row.listing_id,
             'alert_name', v_row.alert_name,
             'listing_title', v_row.listing_title
           )
      from auth.users u
     where u.id = v_row.owner_user_id
       and u.email is not null;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "private"."dispatch_listing_alerts"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."display_name_ok"("p_name" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select
    p_name is not null
    and pg_catalog.char_length(p_name) between 2 and 80
    and p_name = pg_catalog.normalize(p_name, 'NFC')
    and p_name !~ '[[:cntrl:]]'
    and position(pg_catalog.chr(8234) in p_name) = 0
    and position(pg_catalog.chr(8235) in p_name) = 0
    and position(pg_catalog.chr(8236) in p_name) = 0
    and position(pg_catalog.chr(8237) in p_name) = 0
    and position(pg_catalog.chr(8238) in p_name) = 0
    and position(pg_catalog.chr(8239) in p_name) = 0
    and position(pg_catalog.chr(1564) in p_name) = 0
    and position(pg_catalog.chr(8206) in p_name) = 0
    and position(pg_catalog.chr(8207) in p_name) = 0;
$$;


ALTER FUNCTION "private"."display_name_ok"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."dm_context_valid"("p_a" "uuid", "p_b" "uuid", "p_type" "public"."dm_context_type", "p_context_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case p_type
    when 'shared_group' then exists (
      select 1
        from public.group_memberships gm
       where gm.group_id = p_context_id
         and gm.user_id in (p_a, p_b)
         and gm.status = 'approved'
       having count(distinct gm.user_id) = 2
    )
    when 'shared_event' then exists (
      select 1
        from public.event_rsvps e
       where e.event_id = p_context_id
         and e.user_id in (p_a, p_b)
       having count(distinct e.user_id) = 2
    )
    when 'recommendation_thread' then (
      exists (
        select 1 from public.recommendation_requests r
         where r.id = p_context_id and r.author_id in (p_a, p_b)
      )
      and exists (
        select 1 from public.recommendation_replies rep
         where rep.request_id = p_context_id and rep.author_id in (p_a, p_b)
      )
    )
    when 'accepted_family' then exists (
      select 1 from private.family_account_links l
       where l.holder_user_id in (p_a, p_b)
         and l.family_user_id in (p_a, p_b)
         and l.holder_user_id <> l.family_user_id
    )
    when 'provider' then (
      p_context_id is not null
      and exists (
        select 1 from public.provider_profiles pp
         where pp.id = p_context_id
           and pp.owner_user_id in (p_a, p_b)
           and pp.owner_user_id <> (select auth.uid())
      )
      and private.can_see_provider(p_context_id)
    )
    when 'listing' then (
      p_context_id is not null
      and exists (
        select 1 from public.listings l
         where l.id = p_context_id
           and l.status = 'active'
           and l.owner_user_id in (p_a, p_b)
           and l.owner_user_id <> (select auth.uid())
      )
      and exists (
        select 1 from public.listings l
         where l.id = p_context_id
           and private.can_read_listing(l.id)
      )
    )
    else false
  end;
$$;


ALTER FUNCTION "private"."dm_context_valid"("p_a" "uuid", "p_b" "uuid", "p_type" "public"."dm_context_type", "p_context_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_group_community_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_community_id uuid;
begin
  select community_id into v_community_id
  from public.groups
  where id = new.group_id;

  if v_community_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.community_memberships
    where community_id = v_community_id
      and user_id = new.user_id
      and status = 'approved'
  ) then
    raise exception 'group belongs to a community the user is not an approved member of';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_group_community_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_group_join_attempt_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.status = 'pending' then
    if exists (
      select 1 from public.groups
      where id = new.group_id and visibility = 'private'
    ) then
      if not private.consume_group_join_attempt(new.group_id, new.user_id) then
        raise exception 'maximum 3 join requests per group in 30 days'
          using errcode = '54000';
      end if;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."enforce_group_join_attempt_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."event_rsvps_block_self"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if exists (
    select 1
    from public.events e
    where e.id = new.event_id
      and e.organizer_id = new.user_id
  ) then
    raise exception 'organizer cannot RSVP to their own event';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."event_rsvps_block_self"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) RETURNS TABLE("status" "text", "link_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_invitation private.family_invitations;
  v_email_digest bytea;
  v_link_id uuid;
  v_holder_user_id uuid;
  v_locality_id uuid;
  v_gate text;
  v_resumed boolean := false;
begin
  if p_origin_digest is null or octet_length(p_origin_digest) <> 32 then
    raise exception 'origin digest must be 32 bytes' using errcode = '22023';
  end if;

  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  -- Mesma política de nome do perfil (20260817040043): recusar aqui evita um
  -- 23514 vindo do CHECK, que o servidor teria de traduzir sem contexto.
  if not private.display_name_ok(p_display_name) then
    raise exception 'display name is not valid' using errcode = '22023';
  end if;

  if p_consent_version is null or p_consent_version < 1 then
    raise exception 'consent version must be positive' using errcode = '22023';
  end if;

  select extensions.digest(lower(trim(u.email)), 'sha256')
  into v_email_digest
  from auth.users u
  where u.id = p_accepted_by_user_id;

  -- A linha do convite é travada ANTES de qualquer decisão, qualquer que seja o
  -- status. Dois aceites simultâneos do mesmo código ficam em série: o segundo
  -- espera aqui e, em Read Committed, cada comando seguinte enxerga o que o
  -- primeiro confirmou — ele cai na retomada abaixo, em vez de achar só um
  -- convite `accepted` e responder `unavailable`. Código inexistente não trava
  -- nada, e a resposta não muda: a trava não vira oráculo.
  perform 1
    from private.family_invitations fi
   where fi.code_hash = p_code_hash
   for update;

  -- Retomada: este convite já foi aceito por esta mesma pessoa e o vínculo
  -- existe. Devolver o vínculo é idempotente, não é um segundo uso — o uso é o
  -- vínculo, e ele é único por convite.
  select link.id, fi.inviter_user_id
  into v_link_id, v_holder_user_id
  from private.family_account_links link
  join private.family_invitations fi on fi.id = link.invitation_id
  where fi.code_hash = p_code_hash
    and fi.status = 'accepted'
    and fi.accepted_by_user_id = p_accepted_by_user_id
    and link.family_user_id = p_accepted_by_user_id;

  v_resumed := v_link_id is not null;

  if v_link_id is null then
    -- A tentativa é contada com o e-mail do aceitante quando existe: é o limite
    -- por e-mail que impede adivinhar o código de um convite de outra pessoa.
    v_gate := private.family_invite_code_attempt_gate(p_origin_digest, v_email_digest);

    if v_gate = 'rate_limited' then
      status := 'rate_limited';
      return next;
      return;
    end if;

    if v_email_digest is null then
      -- Sem e-mail não há convite a aceitar; a resposta é a mesma dos outros
      -- casos para não dizer nada sobre o convite.
      perform private.record_family_invite_code_failure(
        p_origin_digest,
        null,
        p_code_hash
      );

      status := 'unavailable';
      return next;
      return;
    end if;

    -- `for update` segura a linha: sem ele, dois aceites simultâneos do mesmo
    -- código passariam os dois pela leitura antes de qualquer update.
    select fi.*
    into v_invitation
    from private.family_invitations fi
    where fi.code_hash = p_code_hash
      and fi.status = 'pending'
      and fi.expires_at > now()
    for update;

    if not found then
      perform private.record_family_invite_code_failure(
        p_origin_digest,
        v_email_digest,
        p_code_hash
      );

      status := 'unavailable';
      return next;
      return;
    end if;

    begin
      v_link_id := private.accept_family_invitation(
        v_invitation.token_digest,
        p_accepted_by_user_id
      );
    exception
      -- E-mail diferente, corrida perdida, revogação no meio: a resposta é a
      -- mesma do código inexistente. O bloco é uma subtransação: desfaz só o
      -- vínculo, nunca o insert da tentativa.
      when sqlstate 'P0001' or sqlstate 'P0002' or sqlstate 'P0003' or sqlstate 'P0004' then
        v_link_id := null;
    end;

    if v_link_id is null then
      perform private.record_family_invite_code_failure(
        p_origin_digest,
        v_email_digest,
        p_code_hash
      );

      status := 'unavailable';
      return next;
      return;
    end if;

    v_holder_user_id := v_invitation.inviter_user_id;
  end if;

  -- Retomada de quem já tem localidade corrente: o acesso já existe e é dele.
  -- Repetir o código não consulta de novo a cidade do titular — se o titular
  -- se mudou depois do aceite, a retomada não pode mover o familiar sem uma
  -- declaração de mudança.
  if not (
    v_resumed
    and exists (
      select 1
      from public.locality_memberships m
      where m.user_id = p_accepted_by_user_id
        and m.kind = 'current'
    )
  ) then
    -- A localidade do dependente é a corrente do TITULAR no momento do aceite:
    -- o dependente nunca escolhe a própria localidade. Titular sem localidade
    -- corrente é falha de contrato, e falha aqui desfaz o aceite inteiro.
    select m.locality_id
    into v_locality_id
    from public.locality_memberships m
    where m.user_id = v_holder_user_id
      and m.kind = 'current'
    order by m.joined_at desc
    limit 1;

    if v_locality_id is null then
      raise exception 'the inviting holder has no current locality' using errcode = 'P0005';
    end if;

    -- Quem já está corrente NA localidade do titular não é provisionado de
    -- novo: `provision_member_locality` fecha a corrente antes de inserir a
    -- nova, então repetir moveria a pessoa — e, na mesma localidade, a deixaria
    -- sem corrente nenhuma (o insert conflita e não vira `current`).
    if not exists (
      select 1
      from public.locality_memberships m
      where m.user_id = p_accepted_by_user_id
        and m.locality_id = v_locality_id
        and m.kind = 'current'
    ) then
      perform public.provision_member_locality(p_accepted_by_user_id, v_locality_id);
    end if;
  end if;

  -- O mesmo perfil que a rota de provisionamento grava: nome informado, aceite
  -- na versão que chegou. `consent_version` e `consented_at` só avançam — uma
  -- retomada não rebaixa o que a pessoa já aceitou.
  insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
  values (
    p_accepted_by_user_id,
    p_display_name,
    'locality_members'::public.profile_visibility,
    p_consent_version,
    now()
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        visibility = 'locality_members'::public.profile_visibility,
        consent_version = greatest(profiles.consent_version, excluded.consent_version),
        consented_at = coalesce(profiles.consented_at, excluded.consented_at);

  status := 'ok';
  link_id := v_link_id;

  return next;
  return;
end;
$$;


ALTER FUNCTION "private"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."family_invite_code_attempt_gate"("p_origin_digest" "bytea", "p_email_digest" "bytea") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_window interval;
  v_origin_max integer;
  v_email_max integer;
  v_count integer;
begin
  if p_origin_digest is null or octet_length(p_origin_digest) <> 32 then
    raise exception 'origin digest must be 32 bytes' using errcode = '22023';
  end if;

  if p_email_digest is not null and octet_length(p_email_digest) <> 32 then
    raise exception 'email digest must be 32 bytes' using errcode = '22023';
  end if;

  perform private.lock_family_invite_code_attempts(p_origin_digest, p_email_digest);

  select window_interval, origin_max, email_max
  into v_window, v_origin_max, v_email_max
  from private.family_invite_code_rate_limit();

  -- A tabela de tentativas é descartável por desenho: só a janela importa, e
  -- um dia de histórico é folga suficiente para auditar abuso recente. A poda
  -- é por origem, que é o índice disponível — varrer a tabela inteira a cada
  -- tentativa seria um preço alto para limpar linhas que ninguém lê.
  delete from private.family_invite_code_attempts
  where origin_digest = p_origin_digest
    and created_at < now() - interval '1 day';

  select count(*)::integer
  into v_count
  from private.family_invite_code_attempts
  where origin_digest = p_origin_digest
    and created_at > now() - v_window;

  if v_count >= v_origin_max then
    return 'rate_limited';
  end if;

  if p_email_digest is not null then
    select count(*)::integer
    into v_count
    from private.family_invite_code_attempts
    where email_digest = p_email_digest
      and created_at > now() - v_window;

    if v_count >= v_email_max then
      return 'rate_limited';
    end if;
  end if;

  return 'ok';
end;
$$;


ALTER FUNCTION "private"."family_invite_code_attempt_gate"("p_origin_digest" "bytea", "p_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea" DEFAULT NULL::"bytea") RETURNS TABLE("status" "text", "inviter_name" "text", "invitee_email_hint" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_invitation private.family_invitations;
  v_gate text;
begin
  v_gate := private.family_invite_code_attempt_gate(p_origin_digest, p_email_digest);

  if v_gate = 'rate_limited' then
    status := 'rate_limited';
    return next;
    return;
  end if;

  select fi.*
  into v_invitation
  from private.family_invitations fi
  where fi.code_hash = p_code_hash
    and fi.status = 'pending'
    and fi.expires_at > now();

  -- Errado, vencido, revogado ou usado: uma resposta só — e a falha fica
  -- gravada, porque é ela que o limite conta.
  if not found then
    perform private.record_family_invite_code_failure(
      p_origin_digest,
      p_email_digest,
      p_code_hash
    );

    status := 'unavailable';
    return next;
    return;
  end if;

  -- O convite vale para um e-mail só. Quando a tela já sabe o endereço — a
  -- pessoa digitou no formulário de criar conta —, conferir aqui evita criar
  -- a conta para depois descobrir que ela não pode ser vinculada.
  -- `email_mismatch` é distinto de propósito: só chega nele quem já tem o
  -- código certo, então a frase não vira oráculo de convites. O aceite
  -- continua com a resposta genérica, porque lá o código já é a credencial.
  if p_email_digest is not null and p_email_digest <> v_invitation.invitee_email_digest then
    perform private.record_family_invite_code_failure(
      p_origin_digest,
      p_email_digest,
      p_code_hash
    );

    status := 'email_mismatch';
    return next;
    return;
  end if;

  -- O nome de exibição de quem convidou é o que o protótipo mostra na faixa do
  -- convite. Possuir o código já prova conhecimento do convite; o nome não
  -- acrescenta dado que o convite não carregue.
  select p.display_name
  into inviter_name
  from public.profiles p
  where p.user_id = v_invitation.inviter_user_id;

  status := 'ok';
  inviter_name := coalesce(inviter_name, 'Alguém da família');
  invitee_email_hint := v_invitation.invitee_email_hint;
  expires_at := v_invitation.expires_at;

  return next;
  return;
end;
$$;


ALTER FUNCTION "private"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."family_invite_code_rate_limit"() RETURNS TABLE("window_interval" interval, "origin_max" integer, "email_max" integer)
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select interval '1 hour', 15, 10;
$$;


ALTER FUNCTION "private"."family_invite_code_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."family_invite_email_hint"("p_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
  v_email text := lower(btrim(p_email));
  v_local text;
  v_domain text;
  v_last_dot integer;
begin
  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  if length(v_local) <= 2 then
    v_local := left(v_local, 1) || '***';
  else
    v_local := left(v_local, 2) || '***';
  end if;

  v_last_dot := length(v_domain) - strpos(reverse(v_domain), '.');

  if v_last_dot > 2 then
    v_domain := left(v_domain, 2) || '***' || right(v_domain, length(v_domain) - v_last_dot);
  else
    v_domain := left(v_domain, 2) || '***';
  end if;

  return v_local || '@' || v_domain;
end;
$$;


ALTER FUNCTION "private"."family_invite_email_hint"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."group_notify_allows"("p_group_id" "uuid", "p_kind" "text", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    (
      select case
        when gm.notify_level = 'all' then true
        when gm.notify_level = 'highlights' then p_kind <> 'post'
        else false
      end
      from public.group_memberships gm
      where gm.group_id = p_group_id
        and gm.user_id = p_user_id
        and gm.status = 'approved'
    ),
    false
  );
$$;


ALTER FUNCTION "private"."group_notify_allows"("p_group_id" "uuid", "p_kind" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guard_group_pinned_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_post_group uuid;
  v_post_deleted boolean;
begin
  if new.pinned_post_id is null then
    return new;
  end if;

  select group_id, is_deleted
  into v_post_group, v_post_deleted
  from public.posts
  where id = new.pinned_post_id;

  if not found then
    raise exception 'pinned publication does not exist';
  end if;

  if v_post_group is distinct from new.id then
    raise exception 'pinned publication does not belong to this group';
  end if;

  if v_post_deleted then
    raise exception 'cannot pin a removed publication';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."guard_group_pinned_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guide_candidate_min_confidence"() RETURNS smallint
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select 60::smallint;
$$;


ALTER FUNCTION "private"."guide_candidate_min_confidence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guide_candidate_enqueue"("p_reply_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_confidence" smallint, "p_min_confidence" smallint DEFAULT "private"."guide_candidate_min_confidence"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_locality_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_description text := pg_catalog.btrim(coalesce(p_description, ''));
  v_entry_id uuid;
begin
  select request.locality_id
    into v_locality_id
    from public.recommendation_requests request
    join public.recommendation_replies reply
      on reply.id = request.resolved_reply_id
     and reply.is_deleted = false
   where request.resolved_reply_id = p_reply_id
     and request.locality_id is not null
   limit 1;

  if v_locality_id is null then
    raise exception 'reply is not a resolved reply of a locality request'
      using errcode = 'P0002';
  end if;

  -- Piso de confidence (decisão 7). Sem confidence não há sinal de qualidade,
  -- então também não entra.
  if p_confidence is null or p_confidence < p_min_confidence then
    return null;
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'guide candidate name must have between 2 and 120 characters'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 500 then
    raise exception 'guide candidate description must have up to 500 characters'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.arrival_guide_entries entry
    where entry.source_reply_id = p_reply_id
  ) then
    return null;
  end if;

  if private.guide_candidate_locality_has_name(v_locality_id, v_name) then
    return null;
  end if;

  insert into public.arrival_guide_entries (
    locality_id,
    category,
    name,
    description,
    status,
    source,
    confidence,
    source_reply_id
  )
  values (
    v_locality_id,
    p_category,
    v_name,
    v_description,
    'pending',
    'ai',
    p_confidence,
    p_reply_id
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;


ALTER FUNCTION "private"."guide_candidate_enqueue"("p_reply_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_confidence" smallint, "p_min_confidence" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guide_candidate_locality_has_name"("p_locality_id" "uuid", "p_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.arrival_guide_entries entry
    where entry.locality_id = p_locality_id
      and private.guide_candidate_name_key(entry.name)
          = private.guide_candidate_name_key(p_name)
  );
$$;


ALTER FUNCTION "private"."guide_candidate_locality_has_name"("p_locality_id" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guide_candidate_max_per_locality"() RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select 10::integer;
$$;


ALTER FUNCTION "private"."guide_candidate_max_per_locality"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guide_candidate_name_key"("p_name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select nullif(
    pg_catalog.regexp_replace(
      pg_catalog.translate(
        pg_catalog.lower(pg_catalog.btrim(coalesce(p_name, ''))),
        'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
        'aaaaaaeeeeiiiiooooouuuucnyy'
      ),
      '\s+', ' ', 'g'
    ),
    ''
  );
$$;


ALTER FUNCTION "private"."guide_candidate_name_key"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guide_candidate_prepare"("p_max_per_locality" integer DEFAULT "private"."guide_candidate_max_per_locality"()) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'reply_id', due.reply_id,
        'locality_id', due.locality_id,
        'body', due.body
      )
      order by due.locality_id, due.reply_id
    ),
    '[]'::jsonb
  )
  from private.guide_candidate_select_due(p_max_per_locality) as due;
$$;


ALTER FUNCTION "private"."guide_candidate_prepare"("p_max_per_locality" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."guide_candidate_select_due"("p_max_per_locality" integer DEFAULT "private"."guide_candidate_max_per_locality"()) RETURNS TABLE("reply_id" "uuid", "request_id" "uuid", "locality_id" "uuid", "request_category" "public"."recommendation_category", "body" "text", "resolved_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with eligible as (
    select
      reply.id as reply_id,
      request.id as request_id,
      request.locality_id as locality_id,
      request.category as request_category,
      reply.body as body,
      request.resolved_at as resolved_at,
      row_number() over (
        partition by request.locality_id
        order by request.resolved_at desc nulls last,
                 reply.created_at desc,
                 reply.id
      ) as locality_rank
    from public.recommendation_requests request
    join public.recommendation_replies reply
      on reply.id = request.resolved_reply_id
     and reply.is_deleted = false
    where request.resolved_reply_id is not null
      and request.locality_id is not null
      and not exists (
        select 1
        from public.arrival_guide_entries entry
        where entry.source_reply_id = reply.id
      )
  )
  select
    eligible.reply_id,
    eligible.request_id,
    eligible.locality_id,
    eligible.request_category,
    eligible.body,
    eligible.resolved_at
  from eligible
  where eligible.locality_rank <= greatest(p_max_per_locality, 0)
  order by eligible.locality_id, eligible.locality_rank;
$$;


ALTER FUNCTION "private"."guide_candidate_select_due"("p_max_per_locality" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_accepted_family"("p_holder_user_id" "uuid", "p_family_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from private.family_account_links
    where holder_user_id = p_holder_user_id
      and family_user_id = p_family_user_id
  );
$$;


ALTER FUNCTION "private"."has_accepted_family"("p_holder_user_id" "uuid", "p_family_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_current_locality"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.locality_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.kind = 'current'
  );
$$;


ALTER FUNCTION "private"."has_current_locality"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."holder_locality_at_acceptance"("p_link_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select m.locality_id
  from private.family_account_links link
  join public.locality_memberships m
    on m.user_id = link.holder_user_id
  where link.id = p_link_id
  order by m.joined_at asc
  limit 1;
$$;


ALTER FUNCTION "private"."holder_locality_at_acceptance"("p_link_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."indication_alert_daily_cap"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select 3::integer;
$$;


ALTER FUNCTION "private"."indication_alert_daily_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."indication_recipients"("p_request_id" "uuid") RETURNS TABLE("user_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with req as (
    select r.id, r.author_id, r.locality_id, r.group_id
      from public.recommendation_requests r
     where r.id = p_request_id
       and not r.is_deleted
  ),
  audience as (
    select lm.user_id
      from req
      join public.locality_memberships lm
        on lm.locality_id = req.locality_id
       and lm.access = 'active'
     where req.locality_id is not null
    union
    select gm.user_id
      from req
      join public.group_memberships gm
        on gm.group_id = req.group_id
       and gm.status = 'approved'
     where req.group_id is not null
  )
  select a.user_id
    from audience a
    cross join req
   where a.user_id <> req.author_id
     and not private.account_deletion_requested(a.user_id)
     and not exists (
       select 1
         from public.dm_blocks b
        where (b.blocker_user_id = a.user_id and b.blocked_user_id = req.author_id)
           or (b.blocker_user_id = req.author_id and b.blocked_user_id = a.user_id)
     )
     and private.notification_channel_allows('recommendation_request', 'in_app', a.user_id);
$$;


ALTER FUNCTION "private"."indication_recipients"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."indication_terms"("p_text" "text") RETURNS "text"[]
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select coalesce(array_agg(distinct word), '{}')
  from (
    select word
    from regexp_split_to_table(
      lower(extensions.unaccent(coalesce(p_text, ''))),
      '[^a-z0-9]+'
    ) as word
    where char_length(word) >= 2
      and word <> all (array[
        'alguem', 'algum', 'alguma', 'indica', 'indicam', 'indicar', 'indique',
        'indicacao', 'indicacoes', 'recomenda', 'recomendam', 'recomendacao',
        'procuro', 'procurando', 'preciso', 'precisando', 'conhece', 'conhecem',
        'sabe', 'sabem', 'bom', 'boa', 'bons', 'boas', 'onde', 'quem', 'qual',
        'quais', 'tem', 'pra', 'pro', 'favor', 'aqui', 'gente', 'pessoal', 'algo'
      ])
      and numnode(to_tsquery('public.bivaque_pt', word)) > 0
    limit 8
  ) words;
$$;


ALTER FUNCTION "private"."indication_terms"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_active_locality_member"("target_locality_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.locality_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.locality_id = target_locality_id
      and membership.access = 'active'
  );
$$;


ALTER FUNCTION "private"."is_active_locality_member"("target_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_cep_like"("p_text" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  -- Um dígito, quatro repetições de "separador opcional + dígito": cinco
  -- dígitos no mínimo, contando o primeiro.
  select coalesce(p_text, '') ~ '[0-9]([0-9.[:space:]-]*[0-9]){4}';
$$;


ALTER FUNCTION "private"."is_cep_like"("p_text" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "private"."is_cep_like"("p_text" "text") IS 'Verdadeiro quando o texto carrega uma sequência de 5+ dígitos (CEP). Usado nos CHECKs de campo de bairro.';



CREATE OR REPLACE FUNCTION "private"."is_community_image_owner"("p_path" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.communities
    where id::text = split_part(p_path, '/', 1)
      and owner_user_id = (select auth.uid())
      and is_deleted = false
  );
$$;


ALTER FUNCTION "private"."is_community_image_owner"("p_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_community_member"("p_community_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
  );
$$;


ALTER FUNCTION "private"."is_community_member"("p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_dm_blocked_by_other"("p_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.dm_conversations c
    join public.dm_blocks b
      on b.blocker_user_id = case
        when c.participant_a = (select auth.uid()) then c.participant_b
        else c.participant_a
      end
     and b.blocked_user_id = (select auth.uid())
    where c.id = p_conversation_id
  );
$$;


ALTER FUNCTION "private"."is_dm_blocked_by_other"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_dm_blocked_either_way"("p_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.dm_conversations c
    join public.dm_blocks b
      on (b.blocker_user_id = c.participant_a and b.blocked_user_id = c.participant_b)
      or (b.blocker_user_id = c.participant_b and b.blocked_user_id = c.participant_a)
    where c.id = p_conversation_id
  );
$$;


ALTER FUNCTION "private"."is_dm_blocked_either_way"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_dm_participant"("p_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.dm_conversations c
    where c.id = p_conversation_id
      and (c.participant_a = (select auth.uid())
           or c.participant_b = (select auth.uid()))
  );
$$;


ALTER FUNCTION "private"."is_dm_participant"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_event_locality_member"("target_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.events e
    join public.locality_memberships m
      on m.locality_id = e.locality_id
     and m.user_id = (select auth.uid())
    where e.id = target_event_id
  );
$$;


ALTER FUNCTION "private"."is_event_locality_member"("target_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_group_member"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and status = 'approved'
  );
$$;


ALTER FUNCTION "private"."is_group_member"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_group_moderator"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role in ('moderator', 'owner')
      and status = 'approved'
  );
$$;


ALTER FUNCTION "private"."is_group_moderator"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_group_owner"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role = 'owner'
      and status = 'approved'
  );
$$;


ALTER FUNCTION "private"."is_group_owner"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_locality_member"("target_locality_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.locality_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.locality_id = target_locality_id
  );
$$;


ALTER FUNCTION "private"."is_locality_member"("target_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_operator"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.operators
    where auth_user_id = (select auth.uid())
      and revoked_at is null
  );
$$;


ALTER FUNCTION "private"."is_operator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_operator"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.operators
    where auth_user_id = target_user_id
      and revoked_at is null
  );
$$;


ALTER FUNCTION "private"."is_operator"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_provider_account"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.provider_accounts
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;


ALTER FUNCTION "private"."is_provider_account"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_verified_holder"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from private.verification_outcomes
    where user_id = target_user_id
      and status = 'verified'
  );
$$;


ALTER FUNCTION "private"."is_verified_holder"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_verified_locality_member"("target_locality_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from private.verification_outcomes v
    join public.locality_memberships m
      on m.user_id = v.user_id
     and m.locality_id = target_locality_id
    where v.user_id = (select auth.uid())
      and v.status = 'verified'
  );
$$;


ALTER FUNCTION "private"."is_verified_locality_member"("target_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."list_pending_invites"("p_inviter_user_id" "uuid") RETURNS TABLE("id" "uuid", "invitee_email_digest" "bytea", "created_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    fi.id,
    fi.invitee_email_digest,
    fi.created_at,
    fi.expires_at
  from private.family_invitations fi
  where fi.inviter_user_id = p_inviter_user_id
    and fi.status = 'pending'
    and fi.expires_at > now()
  order by fi.created_at asc;
$$;


ALTER FUNCTION "private"."list_pending_invites"("p_inviter_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."list_pending_invites_with_hint"("p_inviter_user_id" "uuid") RETURNS TABLE("id" "uuid", "invitee_email_digest" "bytea", "invitee_email_hint" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    fi.id,
    fi.invitee_email_digest,
    fi.invitee_email_hint,
    fi.created_at,
    fi.expires_at
  from private.family_invitations fi
  where fi.inviter_user_id = p_inviter_user_id
    and fi.status = 'pending'
    and fi.expires_at > now()
  order by fi.created_at asc;
$$;


ALTER FUNCTION "private"."list_pending_invites_with_hint"("p_inviter_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."listing_alert_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  delete from public.outbox o
   where o.type = 'listing_alert'
     and o.status = 'pending'
     and o.payload ->> 'alert_id' = old.id::text;

  return old;
end;
$$;


ALTER FUNCTION "private"."listing_alert_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."listing_audience_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.locality_id is distinct from old.locality_id
     or new.community_id is distinct from old.community_id
     or new.kind is distinct from old.kind then
    raise exception 'listing audience and kind are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."listing_audience_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."listings_guard_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.status is distinct from old.status then
    if coalesce(current_setting('bivaque.listing_transition', true), '') <> 'on' then
      raise exception 'listing status changes only through transition_listing'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."listings_guard_status_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lock_family_invite_code_attempts"("p_origin_digest" "bytea", "p_email_digest" "bytea") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'family_invite_code:origin:' || pg_catalog.encode(p_origin_digest, 'hex'),
      0
    )
  );

  if p_email_digest is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'family_invite_code:email:' || pg_catalog.encode(p_email_digest, 'hex'),
        0
      )
    );
  end if;
end;
$$;


ALTER FUNCTION "private"."lock_family_invite_code_attempts"("p_origin_digest" "bytea", "p_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."mark_recommendation_reply_edited"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.edited_at = case
    when new.body is distinct from old.body then now()
    else old.edited_at
  end;
  return new;
end;
$$;


ALTER FUNCTION "private"."mark_recommendation_reply_edited"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."mark_recommendation_request_edited"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  -- Sempre recalcula. Só o CONTEUDO marca edicao; resolver, reabrir, trocar o
  -- marcador ou tentar zerar `edited_at` preservam o instante que ja estava.
  if new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.category is distinct from old.category
  then
    new.edited_at = now();
  else
    new.edited_at = old.edited_at;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."mark_recommendation_request_edited"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."member_business_reach_follows_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.kind = 'current' and new.access = 'active' then
    perform private.move_member_business_reach(new.user_id, new.locality_id);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."member_business_reach_follows_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."move_member_business_reach"("p_user_id" "uuid", "p_locality_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = p_user_id
  ) then
    return;
  end if;

  update public.provider_reach r
     set scope_id = p_locality_id
    from public.provider_profiles p
   where p.id = r.provider_id
     and p.owner_user_id = p_user_id
     and r.scope_type = 'locality'
     and r.source = 'free'
     and r.scope_id <> p_locality_id;
end;
$$;


ALTER FUNCTION "private"."move_member_business_reach"("p_user_id" "uuid", "p_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."neighborhood_name_key"("p_name" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select nullif(
    pg_catalog.regexp_replace(
      pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(coalesce(p_name, '')))),
      '\s+', ' ', 'g'
    ),
    ''
  );
$$;


ALTER FUNCTION "private"."neighborhood_name_key"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notification_channel_allows"("p_type" "text", "p_channel" "public"."notification_channel", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when p_user_id is null then true
    when private.notification_type_key(p_type) is null then true
    else private.notification_type_enabled(p_type, p_user_id)
      and coalesce(
        (
          select ncp.enabled
          from public.notification_channel_preferences ncp
          where ncp.user_id = p_user_id
            and ncp.notification_type = private.notification_type_key(p_type)
            and ncp.channel = p_channel
        ),
        case
          when private.notification_type_key(p_type) = 'indications' and p_channel = 'email'
            then false
          else private.notification_type_enabled(p_type, p_user_id)
        end
      )
  end;
$$;


ALTER FUNCTION "private"."notification_channel_allows"("p_type" "text", "p_channel" "public"."notification_channel", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notification_type_enabled"("p_type" "text", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when p_user_id is null then true
    when private.notification_type_key(p_type) is null then true
    when private.notification_type_key(p_type) = 'comments' then coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'events' then coalesce(
      (select np.events from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'messages' then coalesce(
      (select np.messages from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'mentions' then coalesce(
      (select np.mentions from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'product_news' then coalesce(
      (select np.product_news from public.notification_preferences np where np.user_id = p_user_id),
      false
    )
    when private.notification_type_key(p_type) = 'indications' then coalesce(
      (select np.indications from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    else true
  end;
$$;


ALTER FUNCTION "private"."notification_type_enabled"("p_type" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notification_type_key"("p_type" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case
    when p_type = 'comment' then 'comments'
    when p_type in ('event_rsvp', 'event_change', 'event_reminder') then 'events'
    when p_type = 'direct_message' then 'messages'
    when p_type = 'product_news' then 'product_news'
    when p_type in ('recommendation_request', 'indications_digest') then 'indications'
    else null
  end;
$$;


ALTER FUNCTION "private"."notification_type_key"("p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_post_author uuid;
  v_post_group uuid;
begin
  select p.user_id, p.group_id into v_post_author, v_post_group
  from public.posts p
  where p.id = new.post_id;

  -- Actor must not self-notify.
  if v_post_author is null or v_post_author = new.user_id then
    return new;
  end if;

  if v_post_group is not null
     and not private.group_notify_allows(v_post_group, 'highlight', v_post_author) then
    return new;
  end if;

  if private.notification_channel_allows('comment', 'in_app', v_post_author) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_post_author, new.user_id, 'comment', 'created', 'post', new.post_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_event_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Skip if no meaningful column changed.
  if old.title is not distinct from new.title
     and old.starts_at is not distinct from new.starts_at
     and old.status is not distinct from new.status
     and old.venue is not distinct from new.venue
     and old.description is not distinct from new.description then
    return new;
  end if;

  -- Notify every RSVP'd user except the organizer, each recipient checked by
  -- the same channel helper.
  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select r.user_id, new.organizer_id, 'event_change', 'updated', 'event', new.id
  from public.event_rsvps r
  where r.event_id = new.id
    and r.user_id <> new.organizer_id
    and private.notification_channel_allows('event_change', 'in_app', r.user_id);

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_event_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_event_question_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_conversation public.dm_conversations%rowtype;
  v_recipient uuid;
begin
  select * into v_conversation
  from public.dm_conversations c
  where c.id = new.conversation_id;

  -- Só a conversa de pergunta notifica; as outras primitivas de DM têm o seu ciclo.
  if not found or v_conversation.context_type <> 'event_question' then
    return new;
  end if;

  v_recipient := case
    when v_conversation.participant_a = new.sender_id then v_conversation.participant_b
    else v_conversation.participant_a
  end;

  if v_recipient is null or v_recipient = new.sender_id then
    return new;
  end if;

  if coalesce(
    (select np.messages from public.notification_preferences np where np.user_id = v_recipient),
    true
  ) is false then
    return new;
  end if;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  values
    (v_recipient, new.sender_id, 'direct_message', 'question', 'conversation', new.conversation_id);

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_event_question_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_event_rsvp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_organizer uuid;
begin
  select e.organizer_id into v_organizer
  from public.events e
  where e.id = new.event_id;

  -- Actor must not self-notify (organizer cannot RSVP to own event).
  if v_organizer is null or v_organizer = new.user_id then
    return new;
  end if;

  -- Debouncing on UPDATE: a status that did not change does not notify. The
  -- INSERT path has no old row and skips this check (preserved from
  -- 20260821000008_event_rsvp_change_notification.sql).
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  -- The in-app producer asks the single helper, which resolves the 'events'
  -- type preference and the in_app matrix row together.
  if private.notification_channel_allows('event_rsvp', 'in_app', v_organizer) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_organizer, new.user_id, 'event_rsvp', new.status::text, 'event', new.event_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_event_rsvp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_group_admission"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid;
begin
  -- Only fire when transitioning from pending to approved.
  if old.status <> 'pending' or new.status <> 'approved' then
    return new;
  end if;

  v_actor := (select auth.uid());

  -- Actor must not self-notify (skip if moderator IS the user, or if actor is null).
  if v_actor is not null and v_actor <> new.user_id then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (new.user_id, v_actor, 'group_admission', 'approved', 'group', new.group_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_group_admission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_group_pin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid;
begin
  if new.pinned_post_id is null
     or new.pinned_post_id is not distinct from old.pinned_post_id then
    return new;
  end if;

  v_actor := (select auth.uid());

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select gm.user_id, v_actor, 'group_post', 'pinned', 'group', new.id
  from public.group_memberships gm
  where gm.group_id = new.id
    and gm.status = 'approved'
    and gm.user_id is distinct from v_actor
    and private.group_notify_allows(new.id, 'highlight', gm.user_id)
    and private.notification_channel_allows('group_post', 'in_app', gm.user_id);

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_group_pin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_group_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.group_id is null or new.is_deleted then
    return new;
  end if;

  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select gm.user_id, new.user_id, 'group_post', 'created', 'group', new.group_id
  from public.group_memberships gm
  where gm.group_id = new.group_id
    and gm.status = 'approved'
    and gm.user_id <> new.user_id
    and private.group_notify_allows(new.group_id, 'post', gm.user_id)
    and private.notification_channel_allows('group_post', 'in_app', gm.user_id);

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_group_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_indication"("p_user_id" "uuid", "p_request_id" "uuid", "p_kind" "text", "p_locality_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_recent integer;
  v_suppressed boolean := false;
  v_inserted integer;
begin
  if p_kind in ('new', 'unanswered') then
    select count(*)
      into v_recent
      from public.indication_alert_deliveries d
     where d.user_id = p_user_id
       and d.kind in ('new', 'unanswered')
       and not d.suppressed
       and d.created_at > now() - interval '24 hours';
    v_suppressed := v_recent >= private.indication_alert_daily_cap();
  end if;

  insert into public.indication_alert_deliveries (request_id, user_id, kind, suppressed)
  values (p_request_id, p_user_id, p_kind, v_suppressed)
  on conflict (request_id, user_id, kind) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  if not v_suppressed then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (p_user_id, null, 'recommendation_request', p_kind, 'recommendation_request', p_request_id);
    return true;
  end if;

  -- Passou do limite: um aviso único por dia, apontando para a cidade.
  if p_locality_id is not null and not exists (
    select 1
      from public.notifications n
     where n.recipient_user_id = p_user_id
       and n.type = 'recommendation_request'
       and n.action = 'digest'
       and n.created_at > now() - interval '24 hours'
  ) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (p_user_id, null, 'recommendation_request', 'digest', 'locality', p_locality_id);
  end if;
  return true;
end;
$$;


ALTER FUNCTION "private"."notify_indication"("p_user_id" "uuid", "p_request_id" "uuid", "p_kind" "text", "p_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_invitation_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if old.status = 'pending' and new.status = 'accepted' and new.accepted_by_user_id is not null then
    -- The accepter is the actor; the inviter is the recipient.
    -- Actor must not self-notify (not possible in practice since inviter ≠ accepter).
    if new.inviter_user_id <> new.accepted_by_user_id then
      insert into public.notifications
        (recipient_user_id, actor_user_id, type, action, target_type, target_id)
      values
        (new.inviter_user_id, new.accepted_by_user_id,
         'invitation_accepted', 'accepted', 'family_invitation', new.id);
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_invitation_accepted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_recommendation_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_author uuid;
  v_prefs_enabled boolean;
  v_email text;
begin
  select r.author_id, u.email into v_author, v_email
  from public.recommendation_requests r
  join auth.users u on u.id = r.author_id
  where r.id = new.request_id;

  -- Actor must not self-notify: replying to your own request produces no
  -- notification (the §F5 negative case).
  if v_author is null or v_author = new.author_id then
    return new;
  end if;

  -- Honours notification_preferences.comments (the "reply to my thing"
  -- channel). Default true if no row exists.
  select coalesce(np.comments, true) into v_prefs_enabled
  from public.notification_preferences np
  where np.user_id = v_author;

  if v_prefs_enabled is false then
    return new;
  end if;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_author, new.author_id, 'recommendation_reply', 'replied', 'recommendation_request', new.request_id
  );

  -- Outbox: enqueue an email to the author so the reply reaches them even if
  -- they are not in the app right now. The email is from auth.users via the
  -- service context (this function is security definer with search_path='').
  if v_email is not null and v_email <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email, 'email', 'recommendation_reply',
      jsonb_build_object('request_id', new.request_id, 'reply_id', new.id)
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_recommendation_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_recommendation_reply_followers"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_request_author uuid;
  v_follower record;
begin
  select r.author_id into v_request_author
  from public.recommendation_requests r
  where r.id = new.request_id;

  -- Iterate every follower who saved this request. The request author and
  -- the reply author are excluded (the author is notified by the F5 trigger;
  -- the replier is the actor). For each follower, respect their preference.
  for v_follower in
    select s.user_id
    from public.recommendation_saves s
    where s.request_id = new.request_id
      and s.user_id <> new.author_id
      and s.user_id <> coalesce(v_request_author, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    if coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = v_follower.user_id),
      true
    ) then
      insert into public.notifications (
        recipient_user_id, actor_user_id, type, action, target_type, target_id
      ) values (
        v_follower.user_id, new.author_id, 'recommendation_reply', 'replied_to_saved', 'recommendation_request', new.request_id
      );

      insert into public.outbox (recipient, channel, type, payload)
      values (
        concat('saved-notify:', v_follower.user_id::text),
        'email', 'recommendation_reply',
        jsonb_build_object('request_id', new.request_id, 'reply_id', new.id, 'follower_id', v_follower.user_id)
      );
    end if;
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "private"."notify_recommendation_reply_followers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."outbox_apply_delivery"("p_id" "uuid", "p_status" "public"."outbox_status", "p_attempts" integer, "p_last_error" "text", "p_updated_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.outbox
  set status = p_status,
      attempts = p_attempts,
      last_error = p_last_error,
      updated_at = p_updated_at
  where id = p_id;
end;
$$;


ALTER FUNCTION "private"."outbox_apply_delivery"("p_id" "uuid", "p_status" "public"."outbox_status", "p_attempts" integer, "p_last_error" "text", "p_updated_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "private"."outbox_apply_delivery"("p_id" "uuid", "p_status" "public"."outbox_status", "p_attempts" integer, "p_last_error" "text", "p_updated_at" timestamp with time zone) IS 'Persiste a mutacao produzida pelos adaptadores. O fallback por canal saiu junto com o WhatsApp (decisao de 18/09/2026): sem segundo canal nao ha para onde cair.';



CREATE OR REPLACE FUNCTION "private"."outbox_base_retry_interval"() RETURNS interval
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select interval '60 seconds';
$$;


ALTER FUNCTION "private"."outbox_base_retry_interval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."outbox_delivery_allowed"("p_channel" "public"."outbox_channel", "p_recipient" "text", "p_type" "text", "p_payload" "jsonb") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select not exists (
    select 1
    from public.notification_opt_outs o
    where o.channel::text = p_channel::text
      and o.recipient = p_recipient
  )
  and private.notification_channel_allows(
    p_type,
    'email',
    private.outbox_preference_user_id(p_channel, p_recipient, p_payload)
  );
$$;


ALTER FUNCTION "private"."outbox_delivery_allowed"("p_channel" "public"."outbox_channel", "p_recipient" "text", "p_type" "text", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "private"."outbox_delivery_allowed"("p_channel" "public"."outbox_channel", "p_recipient" "text", "p_type" "text", "p_payload" "jsonb") IS 'Decide se a linha pode ser entregue. Com um canal so (email), o ramo generico de tipo que existia para o WhatsApp saiu — nao ha segundo canal para o qual a preferencia pudesse diferir.';



CREATE OR REPLACE FUNCTION "private"."outbox_dispatch_due"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_endpoint text;
  v_secret text;
  v_ids jsonb;
  v_reservation uuid;
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'outbox-worker-endpoint';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'outbox-worker-secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return 0;
  end if;

  select coalesce(jsonb_agg(prepared.id), '[]'::jsonb), (array_agg(prepared.reservation))[1]
    into v_ids, v_reservation
  from private.outbox_prepare_due() as prepared;

  if v_ids = '[]'::jsonb then
    return 0;
  end if;

  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/internal/outbox',
    body := jsonb_build_object('ids', v_ids, 'reservation', v_reservation),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-outbox-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );

  return jsonb_array_length(v_ids)::integer;
end;
$$;


ALTER FUNCTION "private"."outbox_dispatch_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."outbox_is_due"("p_updated_at" timestamp with time zone, "p_attempts" integer, "p_at" timestamp with time zone DEFAULT "now"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select p_at >= p_updated_at + private.outbox_base_retry_interval() * power(2::double precision, p_attempts)::double precision;
$$;


ALTER FUNCTION "private"."outbox_is_due"("p_updated_at" timestamp with time zone, "p_attempts" integer, "p_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."outbox_max_attempts"() RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select 5::integer;
$$;


ALTER FUNCTION "private"."outbox_max_attempts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."outbox_preference_allows"("p_type" "text", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when p_user_id is null then true
    when p_type = 'comment' then coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when p_type in ('event_rsvp', 'event_change') then coalesce(
      (select np.events from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when p_type = 'direct_message' then coalesce(
      (select np.messages from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    else true
  end;
$$;


ALTER FUNCTION "private"."outbox_preference_allows"("p_type" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."outbox_preference_user_id"("p_channel" "public"."outbox_channel", "p_recipient" "text", "p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  -- O 'else null' que existia aqui era o caminho do WhatsApp: sem canal, sem
  -- preferencia a checar. Com um canal so, o unico caso e email.
  select nullif(p_payload ->> 'user_id', '')::uuid;
$$;


ALTER FUNCTION "private"."outbox_preference_user_id"("p_channel" "public"."outbox_channel", "p_recipient" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."outbox_prepare_due"() RETURNS TABLE("id" "uuid", "reservation" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_reservation uuid := gen_random_uuid();
begin
  -- Itens vencidos sem permissao de entrega sao terminais: nao entram no lote
  -- HTTP e nao precisam esperar a proxima chamada. A reserva de outro worker
  -- tambem protege esta transicao.
  update public.outbox o
     set status = 'skipped',
         updated_at = now(),
         reserved_until = null,
         reserved_by = null
   where o.status = 'pending'
     and o.attempts < private.outbox_max_attempts()
     and (o.reserved_until is null or o.reserved_until <= now())
     and private.outbox_is_due(o.updated_at, o.attempts)
     and not private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload);

  -- 5.000 e o teto de seguranca da rota (`MAX_TOTAL_BATCH`). A reserva de 5
  -- minutos cobre o envio de um bloco e impede que outro worker pegue a mesma
  -- linha enquanto ela esta em voo; `SKIP LOCKED` evita espera entre workers.
  -- Todas as linhas do lote levam o mesmo token, que o consumidor devolve ao
  -- gravar cada resultado.
  return query
    with due as (
      select o.id
        from public.outbox o
       where o.status = 'pending'
         and o.attempts < private.outbox_max_attempts()
         and (o.reserved_until is null or o.reserved_until <= now())
         and private.outbox_is_due(o.updated_at, o.attempts)
         and private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload)
       order by o.updated_at asc, o.id asc
       for update skip locked
       limit 5000
    )
    update public.outbox o
       set updated_at = now(),
           reserved_until = now() + interval '5 minutes',
           reserved_by = v_reservation
      from due
     where o.id = due.id
    returning o.id, v_reservation;
end;
$$;


ALTER FUNCTION "private"."outbox_prepare_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."post_accepts_interaction"("p_post_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select not exists (
    select 1
    from public.posts p
    join public.account_deletion_requests r on r.user_id = p.user_id
    where p.id = p_post_id
  );
$$;


ALTER FUNCTION "private"."post_accepts_interaction"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."prevent_post_group_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.group_id is distinct from old.group_id then
    raise exception 'o grupo de uma publicacao nao pode mudar depois de criada'
      using errcode = '42501';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."prevent_post_group_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."promote_operator_by_email"("target_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where email = target_email;

  if target_id is null then
    raise exception 'no auth.users row with email %', target_email;
  end if;

  insert into public.operators (auth_user_id, granted_by, notes)
  values (
    target_id,
    (select auth.uid()),
    'promoted by private.promote_operator_by_email'
  )
  on conflict (auth_user_id) do update
    set revoked_at = null,
        revoked_by = null,
        granted_by = (select auth.uid()),
        granted_at = now();

  return target_id;
end;
$$;


ALTER FUNCTION "private"."promote_operator_by_email"("target_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."property_details_require_property"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1 from public.listings l
     where l.id = new.listing_id
       and l.kind = 'property'
  ) then
    raise exception 'property_details requires a property listing' using errcode = '23514';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."property_details_require_property"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."purge_stale_group_join_reasons"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_deleted integer;
begin
  delete from public.group_join_reasons r
  using public.group_memberships gm
  where gm.group_id = r.group_id
    and gm.user_id = r.user_id
    and gm.status = 'pending'
    and r.created_at < now() - interval '30 days';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


ALTER FUNCTION "private"."purge_stale_group_join_reasons"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."record_family_invite_code_failure"("p_origin_digest" "bytea", "p_email_digest" "bytea", "p_code_hash" "bytea") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_origin_digest is null or octet_length(p_origin_digest) <> 32 then
    raise exception 'origin digest must be 32 bytes' using errcode = '22023';
  end if;

  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  if p_email_digest is not null and octet_length(p_email_digest) <> 32 then
    raise exception 'email digest must be 32 bytes' using errcode = '22023';
  end if;

  perform private.lock_family_invite_code_attempts(p_origin_digest, p_email_digest);

  insert into private.family_invite_code_attempts (origin_digest, email_digest, code_hash)
  values (p_origin_digest, p_email_digest, p_code_hash);
end;
$$;


ALTER FUNCTION "private"."record_family_invite_code_failure"("p_origin_digest" "bytea", "p_email_digest" "bytea", "p_code_hash" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."renumber_listing_photos"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with ranked as (
    select
      lp.id,
      row_number() over (
        partition by lp.listing_id
        order by lp.position, lp.created_at, lp.id
      ) - 1 as new_position
    from public.listing_photos lp
  )
  update public.listing_photos lp
     set position = ranked.new_position
    from ranked
   where lp.id = ranked.id
     and lp.position <> ranked.new_position;
$$;


ALTER FUNCTION "private"."renumber_listing_photos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."reopen_request_on_resolved_reply_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.recommendation_requests
  set is_resolved = false,
      resolved_at = null,
      resolved_by = null,
      resolved_reply_id = null
  where id = old.request_id
    and resolved_reply_id = old.id;
  return old;
end;
$$;


ALTER FUNCTION "private"."reopen_request_on_resolved_reply_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."reports_block_self"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_owner_id uuid;
begin
  case new.target_type
    when 'post' then
      select user_id into v_owner_id
      from public.posts where id = new.target_id;
    when 'comment' then
      select user_id into v_owner_id
      from public.comments where id = new.target_id;
    when 'group' then
      select owner_user_id into v_owner_id
      from public.groups where id = new.target_id;
    when 'message' then
      select sender_id into v_owner_id
      from public.dm_messages where id = new.target_id;
    when 'recommendation_request' then
      select author_id into v_owner_id
      from public.recommendation_requests where id = new.target_id;
    when 'recommendation_reply' then
      select author_id into v_owner_id
      from public.recommendation_replies where id = new.target_id;
    else
      v_owner_id := null;
  end case;

  if v_owner_id is not null and v_owner_id = new.reporter_user_id then
    raise exception 'cannot report your own content';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."reports_block_self"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_updated integer;
begin
  update private.family_invitations
     set token_digest = p_token_digest,
         expires_at = now() + interval '7 days'
   where id = p_invitation_id
     and inviter_user_id = p_inviter_user_id
     and status = 'pending'
     and invitee_email_digest = p_invitee_email_digest;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'invitation not found or not resendable';
  end if;

  return p_invitation_id;
end;
$$;


ALTER FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_invitation_id uuid;
begin
  if p_code_hash is null or octet_length(p_code_hash) <> 32 then
    raise exception 'code hash must be 32 bytes' using errcode = '22023';
  end if;

  v_invitation_id := private.resend_family_invitation(
    p_invitation_id,
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest
  );

  update private.family_invitations
     set code_hash = p_code_hash
   where id = v_invitation_id;

  return v_invitation_id;
end;
$$;


ALTER FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update private.family_invitations
  set status = 'revoked'
  where id = p_invitation_id
    and inviter_user_id = p_inviter_user_id
    and status = 'pending';

  if not found then
    raise exception 'invitation not found or not revocable';
  end if;
end;
$$;


ALTER FUNCTION "private"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."scrub_report_reason"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_scrubbed text;
begin
  v_scrubbed := new.reason;

  -- Sequencia com formato de CPF (com ou sem pontuacao, inclusive 529.982.247.25)
  v_scrubbed := regexp_replace(
    v_scrubbed,
    '[[:<:]][0-9]{3}[.\s-]?[0-9]{3}[.\s-]?[0-9]{3}[.\s-]?[0-9]{2}[[:>:]]',
    '[documento removido]',
    'gi'
  );

  -- Sequencia de 11 digitos sem pontuacao (CPF cru ou falso positivo aceito)
  v_scrubbed := regexp_replace(
    v_scrubbed,
    '[[:<:]][0-9]{11}[[:>:]]',
    '[documento removido]',
    'gi'
  );

  -- "[documento removido]" tem 20 caracteres e substitui de 11 a 14. O CHECK de
  -- 1000 caracteres de public.reports roda DEPOIS deste trigger, entao um motivo
  -- perto do limite passa a ser rejeitado por reports_reason_check com um erro
  -- que nao explica nada a quem denunciou. E alcancavel pela UI normal, nao so
  -- pelo bypass: o cliente redige antes do insert, entao quem digita perto do
  -- limite ja sai do scrubReportReason acima de 1000. Perder o fim de um motivo
  -- abarrotado de documento e melhor que perder a denuncia inteira.
  new.reason := left(v_scrubbed, 1000);
  return new;
end;
$$;


ALTER FUNCTION "private"."scrub_report_reason"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."send_recurring_event_reminders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_event record;
  v_recipient record;
  v_prefs_enabled boolean;
  v_count integer := 0;
begin
  for v_event in
    select id, title, starts_at, organizer_id
    from public.events
    where recurrence_type is not null
      and status = 'upcoming'
      and starts_at::date = current_date + 1
      and (last_reminder_sent_for is null or last_reminder_sent_for <> starts_at::date)
  loop
    for v_recipient in
      select r.user_id, u.email
      from public.event_rsvps r
      join auth.users u on u.id = r.user_id
      where r.event_id = v_event.id
        and r.occurrence_date = v_event.starts_at::date
        and r.status in ('going', 'interested')
    loop
      select coalesce(np.events, true) into v_prefs_enabled
      from public.notification_preferences np
      where np.user_id = v_recipient.user_id;

      if v_prefs_enabled is not false then
        insert into public.notifications (
          recipient_user_id, actor_user_id, type, action, target_type, target_id
        ) values (
          v_recipient.user_id, null, 'event_reminder', 'upcoming', 'event', v_event.id
        );

        if v_recipient.email is not null and v_recipient.email <> '' then
          insert into public.outbox (recipient, channel, type, payload)
          values (
            v_recipient.email, 'email', 'event_reminder',
            jsonb_build_object('event_id', v_event.id, 'title', v_event.title, 'starts_at', v_event.starts_at)
          );
        end if;

        v_count := v_count + 1;
      end if;
    end loop;

    update public.events
      set last_reminder_sent_for = v_event.starts_at::date
      where id = v_event.id;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "private"."send_recurring_event_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."service_request_mark_first_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.status = 'in_conversation'
     and old.status = 'open'
     and new.first_responded_at is null then
    new.first_responded_at := now();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."service_request_mark_first_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_neighborhood_name_key"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  -- A grafia guardada é a da carga (e a que o perfil copia): sem espaço
  -- sobrando e com espaço interno colapsado. A caixa e o acento são mantidos.
  new.name := pg_catalog.regexp_replace(
    pg_catalog.btrim(new.name), '\s+', ' ', 'g'
  );
  new.name_key := private.neighborhood_name_key(new.name);
  return new;
end;
$$;


ALTER FUNCTION "private"."set_neighborhood_name_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."shares_locality_with"("p_target_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.locality_memberships mine
    where mine.user_id = (select auth.uid())
      and exists (
        select 1
        from public.locality_memberships theirs
        where theirs.user_id = p_target_user_id
          and theirs.locality_id = mine.locality_id
      )
  );
$$;


ALTER FUNCTION "private"."shares_locality_with"("p_target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."snap_recurring_event_start"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_next date;
begin
  if new.recurrence_type is not null then
    v_next := public.next_occurrence(
      new.starts_at::date,
      new.recurrence_type,
      new.recurrence_weekday,
      new.recurrence_ordinal,
      new.recurrence_day_of_month
    );
    new.starts_at := (v_next::text || ' ' || to_char(new.starts_at, 'HH24:MI:SS'))::timestamptz;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "private"."snap_recurring_event_start"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "private"."verification_status", "p_eligibility_class" "private"."eligibility_class" DEFAULT NULL::"private"."eligibility_class") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_status = 'verified' and p_eligibility_class is null then
    raise exception 'verified status requires an eligibility class';
  end if;

  if p_status <> 'verified' and p_eligibility_class is not null then
    raise exception 'non-verified status must not carry an eligibility class';
  end if;

  insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
  values (
    p_user_id,
    p_status,
    p_eligibility_class,
    case when p_status = 'verified' then now() else null end
  )
  on conflict (user_id) do update
  set
    status = excluded.status,
    eligibility_class = excluded.eligibility_class,
    checked_at = case when excluded.status = 'verified' then now() else null end,
    updated_at = now();
end;
$$;


ALTER FUNCTION "private"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "private"."verification_status", "p_eligibility_class" "private"."eligibility_class") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_event_cover_path"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.cover_path is null or btrim(new.cover_path) = '' then
    new.cover_path := null;
    return new;
  end if;

  if split_part(new.cover_path, '/', 1) <> new.organizer_id::text then
    raise exception 'cover path must live under the organizer folder'
      using errcode = '22023';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."validate_event_cover_path"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_recommendation_resolved_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_matches boolean;
begin
  -- Limpar (null) e sempre valido — inclusive no ON DELETE SET NULL disparado
  -- quando a resposta apagada e removida.
  if new.resolved_reply_id is not null then
    select exists (
      select 1
      from public.recommendation_replies reply
      where reply.id = new.resolved_reply_id
        and reply.request_id = new.id
        and reply.is_deleted = false
    ) into v_matches;

    if not v_matches then
      raise exception 'resolved reply must belong to the request'
        using errcode = '23514';
    end if;
  end if;

  -- A memoria da ultima resolucao aceita a resposta removida pela moderacao: o
  -- que importa e que ela pertence a esta pergunta. A validacao olha so uma
  -- TROCA de valor: o ON DELETE SET NULL esvazia o campo no mesmo instante em
  -- que a resposta apagada deixa de existir, e revalidar ali seria falso
  -- positivo.
  if new.last_resolved_reply_id is not null
    and new.last_resolved_reply_id is distinct from old.last_resolved_reply_id
  then
    select exists (
      select 1
      from public.recommendation_replies reply
      where reply.id = new.last_resolved_reply_id
        and reply.request_id = new.id
    ) into v_matches;

    if not v_matches then
      raise exception 'last resolved reply must belong to the request'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."validate_recommendation_resolved_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."verification_dispatch_reconcile"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_endpoint text;
  v_secret text;
  v_ids uuid[];
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'verification-reconcile-endpoint';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'verification-reconcile-secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return 0;
  end if;

  select array_agg(user_id) into v_ids
  from private.verification_reconcile_candidates(20);

  if v_ids is null or cardinality(v_ids) = 0 then
    return 0;
  end if;

  perform private.verification_reconcile_lease(v_ids);

  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/internal/verification-reconcile',
    body := jsonb_build_object('user_ids', to_jsonb(v_ids)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reconcile-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );

  return cardinality(v_ids);
end;
$$;


ALTER FUNCTION "private"."verification_dispatch_reconcile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."verification_documents_purge_expired"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_count integer;
begin
  update private.verification_documents
    set purge_state = 'purged'
    where expires_at <= now()
      and (purge_state is null or purge_state <> 'purged');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "private"."verification_documents_purge_expired"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."verification_max_reconcile_attempts"() RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select 5::integer;
$$;


ALTER FUNCTION "private"."verification_max_reconcile_attempts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."verification_reconcile_candidates"("p_limit" integer DEFAULT 20) RETURNS TABLE("user_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select v.user_id
  from private.verification_outcomes v
  where v.status in ('pending', 'temporary_error')
    and v.updated_at < now() - interval '30 minutes'
    and v.reconcile_attempts < private.verification_max_reconcile_attempts()
  order by v.updated_at asc
  limit greatest(1, p_limit);
$$;


ALTER FUNCTION "private"."verification_reconcile_candidates"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."verification_reconcile_lease"("p_user_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_count integer;
begin
  update private.verification_outcomes
  set reconcile_attempts = reconcile_attempts + 1,
      updated_at = now()
  where user_id = any(p_user_ids)
    and status in ('pending', 'temporary_error');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "private"."verification_reconcile_lease"("p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."verified_holder_active_invitations"("holder_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select count(*)::integer
  from private.family_invitations
  where inviter_user_id = holder_user_id
    and status = 'pending'
    and expires_at > now();
$$;


ALTER FUNCTION "private"."verified_holder_active_invitations"("holder_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_community_invitation"("p_token_digest" "bytea", "p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_invite public.community_invitations;
  v_community_id uuid;
begin
  select * into v_invite
  from public.community_invitations
  where token_digest = p_token_digest
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'invitation already %', v_invite.status using errcode = 'P0003';
  end if;

  if v_invite.expires_at <= now() then
    update public.community_invitations
    set status = 'expired'
    where id = v_invite.id;
    raise exception 'invitation expired' using errcode = 'P0004';
  end if;

  if not private.is_verified_holder(p_user_id) then
    raise exception 'verification required' using errcode = '42501';
  end if;

  v_community_id := v_invite.community_id;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (v_community_id, p_user_id, 'member', 'pending')
  on conflict (community_id, user_id) do nothing;

  update public.community_invitations
  set status = 'accepted',
      accepted_by_user_id = p_user_id,
      accepted_at = now()
  where id = v_invite.id;

  return v_community_id;
end;
$$;


ALTER FUNCTION "public"."accept_community_invitation"("p_token_digest" "bytea", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  return private.accept_family_invitation(
    p_token_digest,
    p_accepted_by_user_id
  );
end;
$$;


ALTER FUNCTION "public"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_provider_invitation"("p_token" "text", "p_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_invitation private.provider_invitations;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_token !~ '^[0-9A-Fa-f]{64}$' then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  -- O e-mail não vem da confiança do formulário: ele precisa ser o e-mail
  -- autenticado do caller e também casar com o digest do convite.
  if not exists (
    select 1
      from auth.users u
     where u.id = v_user_id
       and lower(u.email) = v_email
  ) then
    raise exception 'authenticated e-mail does not match' using errcode = '42501';
  end if;

  select pi.*
    into v_invitation
    from private.provider_invitations pi
   where pi.token_digest = extensions.digest(decode(lower(p_token), 'hex'), 'sha256')
   for update;

  if not found then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  if v_invitation.status = 'accepted' then
    raise exception 'provider invitation already accepted' using errcode = 'P0003';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'provider invitation is not pending' using errcode = 'P0003';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'provider invitation expired' using errcode = 'P0004';
  end if;

  if v_invitation.invitee_email_digest <> extensions.digest(v_email, 'sha256') then
    raise exception 'provider invitation not found' using errcode = 'P0002';
  end if;

  -- Prestador é papel sem membership (D37), nunca um segundo papel anexado
  -- a uma conta de membro existente.
  if exists (
    select 1 from public.locality_memberships lm where lm.user_id = v_user_id
  ) or exists (
    select 1 from public.community_memberships cm where cm.user_id = v_user_id
  ) then
    raise exception 'member accounts cannot accept provider invitations'
      using errcode = '42501';
  end if;

  insert into public.provider_accounts (
    auth_user_id,
    invited_by,
    community_id,
    locality_id
  )
  values (
    v_user_id,
    v_invitation.inviter_user_id,
    v_invitation.community_id,
    v_invitation.locality_id
  );

  update private.provider_invitations
     set status = 'accepted',
         accepted_by_user_id = v_user_id,
         accepted_at = now()
   where id = v_invitation.id;

  return v_user_id;
end;
$_$;


ALTER FUNCTION "public"."accept_provider_invitation"("p_token" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = p_caller_user_id
  ) then
    raise exception 'only the owner can add moderators';
  end if;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'approved'
    and role = 'member';
end;
$$;


ALTER FUNCTION "public"."add_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can add co-moderators';
  end if;

  update public.group_memberships
  set role = 'moderator'
  where group_id = p_group_id
    and user_id = p_user_id
    and status = 'approved'
    and role = 'member';

  if not found then
    raise exception 'user is not an approved member of this group';
  end if;
end;
$$;


ALTER FUNCTION "public"."add_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_to_waitlist"("p_email" "text", "p_city_name" "text", "p_state_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_city text := btrim(p_city_name);
  v_state text := upper(btrim(coalesce(p_state_code, '')));
begin
  if v_city = '' then
    raise exception 'city_name is required';
  end if;

  if v_state <> '' and v_state !~ '^[A-Z]{2}$' then
    raise exception 'state_code must have two letters';
  end if;

  insert into public.waitlist (email, locality_id, city_name, state_code)
  values (lower(btrim(p_email)), null, v_city, nullif(v_state, ''))
  on conflict do nothing;
end;
$_$;


ALTER FUNCTION "public"."add_to_waitlist"("p_email" "text", "p_city_name" "text", "p_state_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_recurring_events"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_count integer := 0;
  v_row record;
  v_next date;
  v_day_delta integer;
begin
  alter table public.events disable trigger notify_event_change_trigger;

  for v_row in
    select id, starts_at, ends_at, recurrence_type, recurrence_weekday, recurrence_ordinal,
           recurrence_day_of_month
    from public.events
    where recurrence_type is not null
      and status = 'upcoming'
      and starts_at < now()
  loop
    v_next := public.next_occurrence(
      (v_row.starts_at::date + 1),
      v_row.recurrence_type,
      v_row.recurrence_weekday,
      v_row.recurrence_ordinal,
      v_row.recurrence_day_of_month
    );
    v_day_delta := v_next - v_row.starts_at::date;

    update public.events
      set starts_at = (v_next::text || ' ' || to_char(v_row.starts_at, 'HH24:MI:SS'))::timestamptz,
          ends_at = case
            when v_row.ends_at is not null then v_row.ends_at + (v_day_delta || ' days')::interval
            else null
          end,
          last_reminder_sent_for = null,
          updated_at = now()
      where id = v_row.id;

    v_count := v_count + 1;
  end loop;

  alter table public.events enable trigger notify_event_change_trigger;

  return v_count;
exception
  when others then
    alter table public.events enable trigger notify_event_change_trigger;
    raise;
end;
$$;


ALTER FUNCTION "public"."advance_recurring_events"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "topic" "public"."support_ticket_topic" NOT NULL,
    "body" "text" NOT NULL,
    "status" "public"."support_ticket_status" DEFAULT 'open'::"public"."support_ticket_status" NOT NULL,
    "reply" "text",
    "answered_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "answered_at" timestamp with time zone,
    CONSTRAINT "support_tickets_answered_consistency" CHECK (((("status" = 'open'::"public"."support_ticket_status") AND ("reply" IS NULL) AND ("answered_at" IS NULL) AND ("answered_by" IS NULL)) OR (("status" = 'answered'::"public"."support_ticket_status") AND ("reply" IS NOT NULL) AND ("answered_at" IS NOT NULL)))),
    CONSTRAINT "support_tickets_body_check" CHECK ((("char_length"("body") >= 10) AND ("char_length"("body") <= 1000))),
    CONSTRAINT "support_tickets_email_check" CHECK (((("char_length"("email") >= 3) AND ("char_length"("email") <= 320)) AND (POSITION(('@'::"text") IN ("email")) > 1))),
    CONSTRAINT "support_tickets_reply_check" CHECK ((("reply" IS NULL) OR (("char_length"("reply") >= 1) AND ("char_length"("reply") <= 4000))))
);

ALTER TABLE ONLY "public"."support_tickets" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."answer_support_ticket"("p_ticket_id" "uuid", "p_reply" "text") RETURNS "public"."support_tickets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_operator uuid := (select auth.uid());
  v_reply text := btrim(coalesce(p_reply, ''));
  v_row public.support_tickets%rowtype;
  v_email text;
begin
  if v_operator is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- O gate vem antes de qualquer leitura: quem não é operador não descobre nem
  -- se o chamado existe.
  if not public.is_current_user_operator(v_operator) then
    raise exception 'only operators answer support tickets' using errcode = '42501';
  end if;

  if char_length(v_reply) < 1 then
    raise exception 'support ticket reply is required' using errcode = '22023';
  end if;

  if char_length(v_reply) > 4000 then
    raise exception 'support ticket reply is too long' using errcode = '22023';
  end if;

  select * into v_row
  from public.support_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'support ticket not found' using errcode = 'P0002';
  end if;

  if v_row.status = 'answered' then
    raise exception 'support ticket already answered' using errcode = '55000';
  end if;

  update public.support_tickets
     set reply = v_reply,
         status = 'answered',
         answered_at = now(),
         answered_by = v_operator
   where id = p_ticket_id
   returning * into v_row;

  -- Aviso no app para o dono. O ator é NULO de propósito: a identidade de quem
  -- responde é da operação e não vira dado visível (mesma regra de
  -- report_resolved em deep-links.ts).
  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_row.user_id, null, 'support_answered', 'answered', 'support_ticket', v_row.id
  );

  -- E-mail na fila que já existe. O endereço é o do chamado: é para lá que a
  -- pessoa pediu a resposta, mesmo que tenha trocado o e-mail da conta depois.
  select u.email into v_email
  from auth.users u
  where u.id = v_row.user_id;

  if v_email is not null and btrim(v_email) <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      btrim(v_email),
      'email',
      'support_answered',
      jsonb_build_object('ticket_id', v_row.id, 'topic', v_row.topic, 'reply', v_row.reply)
    );
  end if;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."answer_support_ticket"("p_ticket_id" "uuid", "p_reply" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text", "p_section_title" "text", "p_section_body" "text", "p_summary" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_request public.guide_correction_requests;
  v_article public.guide_articles;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can decide guide corrections' using errcode = '42501';
  end if;

  select * into v_request
  from public.guide_correction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'correction request not found' using errcode = 'P0002';
  end if;

  if v_request.status not in ('received', 'in_review') then
    raise exception 'correction request already decided' using errcode = '55000';
  end if;

  select * into v_article
  from public.guide_articles
  where id = v_request.article_id
  for update;

  if not found then
    raise exception 'guide article not found' using errcode = 'P0002';
  end if;

  insert into public.guide_article_revisions (article_id, snapshot, revised_by)
  values (
    v_article.id,
    jsonb_build_object(
      'title', v_article.title,
      'subtitle', v_article.subtitle,
      'cover_image_url', v_article.cover_image_url,
      'summary', v_article.summary,
      'reviewed_at', v_article.reviewed_at,
      'sections', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'position', s.position,
            'anchor', s.anchor,
            'title', s.title,
            'body', s.body
          )
          order by s.position
        )
        from public.guide_article_sections s
        where s.article_id = v_article.id
      ), '[]'::jsonb)
    ),
    p_operator_user_id
  );

  if v_request.section_id is not null and p_section_body is not null then
    update public.guide_article_sections
    set title = coalesce(nullif(btrim(p_section_title), ''), title),
        body = p_section_body,
        updated_at = now()
    where id = v_request.section_id
      and article_id = v_article.id;
  elsif p_summary is not null then
    update public.guide_articles
    set summary = p_summary,
        updated_at = now()
    where id = v_article.id;
  end if;

  update public.guide_articles
  set reviewed_at = now(),
      curated_by = p_operator_user_id,
      updated_at = now()
  where id = v_article.id;

  update public.guide_correction_requests
  set status = 'applied',
      decision_note = p_note,
      decided_by = p_operator_user_id,
      decided_at = now(),
      updated_at = now()
  where id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."apply_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text", "p_section_title" "text", "p_section_body" "text", "p_summary" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_current_user_community_moderator(p_community_id, p_caller_user_id) then
    raise exception 'only moderators can approve members';
  end if;

  update public.community_memberships
  set status = 'approved'
  where community_id = p_community_id
    and user_id = p_user_id
    and status = 'pending';
end;
$$;


ALTER FUNCTION "public"."approve_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_group_member"("p_group_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can approve members';
  end if;

  update public.group_memberships
  set status = 'approved'
  where group_id = p_group_id
    and user_id = p_user_id
    and status = 'pending';

  if not found then
    raise exception 'pending membership not found for this user';
  end if;

  -- O motivo pertence ao pedido que acabou de ser decidido (ADR §3: apagado
  -- quando o pedido é decidido).
  delete from public.group_join_reasons
  where group_id = p_group_id
    and user_id = p_user_id;
end;
$$;


ALTER FUNCTION "public"."approve_group_member"("p_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_provider_profile"("p_provider_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
      from public.provider_profiles p
     where p.id = p_provider_id
       and p.owner_user_id = (select auth.uid())
       and (
         exists (
           select 1
             from public.provider_accounts pa
            where pa.auth_user_id = p.owner_user_id
              and pa.revoked_at is null
         )
         or (
           not exists (
             select 1 from public.provider_accounts pa
              where pa.auth_user_id = p.owner_user_id
           )
           and exists (
             select 1
               from public.provider_reach r
               join public.locality_memberships lm
                 on lm.user_id = p.owner_user_id
                and lm.locality_id = r.scope_id
              where r.provider_id = p.id
                and r.scope_type = 'locality'
                and r.source = 'free'
                and r.active
                and lm.kind = 'current'
                and lm.access = 'active'
           )
         )
       )
  );
$$;


ALTER FUNCTION "public"."can_manage_provider_profile"("p_provider_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.can_receive_invite_to_event(p_event_id, p_user_id);
$$;


ALTER FUNCTION "public"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_community_request"("p_community_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = (select auth.uid())
    and status = 'pending';
end;
$$;


ALTER FUNCTION "public"."cancel_community_request"("p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_service_request"("p_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  if v_req.requester_user_id <> v_me then
    raise exception 'only the requester cancels' using errcode = '42501';
  end if;

  if v_req.status not in ('open', 'in_conversation') then
    raise exception 'request already finished' using errcode = '22023';
  end if;

  update public.service_requests
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by_user_id = v_me
   where id = p_request_id
   returning * into v_req;

  return to_jsonb(v_req);
end;
$$;


ALTER FUNCTION "public"."cancel_service_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_recurrence_holiday"("p_date" "date") RETURNS TABLE("is_holiday" boolean, "holiday_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    exists (select 1 from public.national_holidays h where h.date = p_date),
    (select h.name from public.national_holidays h where h.date = p_date limit 1);
$$;


ALTER FUNCTION "public"."check_recurrence_holiday"("p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_recommendation_resolved_reply"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.recommendation_requests
  set resolved_reply_id = null
  where id = p_request_id
    and author_id = v_uid;

  if not found then
    raise exception 'request not found or you are not the author' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."clear_recommendation_resolved_reply"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_service_request"("p_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'request not found' using errcode = '42501';
  end if;
  if v_me <> v_req.requester_user_id and v_me <> v_req.provider_user_id then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  -- Idempotente e a prova do conflito concorrente: quem chega depois le o
  -- estado ja encerrado, com o ator e o instante da primeira vez.
  if v_req.status <> 'closed' then
    update public.service_requests
       set status = 'closed',
           closed_at = now(),
           closed_by_user_id = v_me
     where id = p_request_id
     returning * into v_req;
  end if;

  return to_jsonb(v_req);
end;
$$;


ALTER FUNCTION "public"."close_service_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_event"("p_event_id" "uuid", "p_caller_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = p_caller_user_id
  ) then
    raise exception 'only the event organizer can complete the event';
  end if;

  update public.events
  set status = 'completed', updated_at = now()
  where id = p_event_id;
end;
$$;


ALTER FUNCTION "public"."complete_event"("p_event_id" "uuid", "p_caller_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_verification_document_removal"("p_storage_object_path" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_storage_object_path is null or btrim(p_storage_object_path) = '' then
    raise exception 'storage_object_path is required';
  end if;

  delete from private.verification_document_removals r
   where r.storage_object_path = p_storage_object_path;
end;
$$;


ALTER FUNCTION "public"."complete_verification_document_removal"("p_storage_object_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_verification_attempt"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.consume_verification_attempt(p_user_id);
$$;


ALTER FUNCTION "public"."consume_verification_attempt"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."conversation_counterpart_name"("p_conversation_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."conversation_counterpart_name"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_locality_id" "uuid", "p_owner_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_community_id uuid;
begin
  if not exists (
    select 1 from public.locality_memberships
    where user_id = p_owner_user_id and locality_id = p_locality_id
  ) then
    raise exception 'owner must be a member of the locality';
  end if;

  insert into public.communities (
    locality_id, name, description, created_by, owner_user_id
  )
  values (
    p_locality_id, p_name, p_description, p_owner_user_id, p_owner_user_id
  )
  returning id into v_community_id;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (v_community_id, p_owner_user_id, 'owner', 'approved');

  return v_community_id;
end;
$$;


ALTER FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_locality_id" "uuid", "p_owner_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_community_invitation"("p_community_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_expires_at" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_id uuid;
begin
  if octet_length(p_token_digest) <> 32 then
    raise exception 'token_digest must be 32 bytes (sha256)' using errcode = '22023';
  end if;

  if p_expires_at <= now() then
    raise exception 'expires_at must be in the future' using errcode = '22023';
  end if;

  if not private.is_verified_holder(p_inviter_user_id) then
    raise exception 'only verified members can invite' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.community_memberships
    where community_id = p_community_id
      and user_id = p_inviter_user_id
      and status = 'approved'
  ) then
    raise exception 'only approved members can invite to this community' using errcode = '42501';
  end if;

  insert into public.community_invitations (
    community_id, inviter_user_id, token_digest, expires_at
  ) values (
    p_community_id, p_inviter_user_id, p_token_digest, p_expires_at
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_community_invitation"("p_community_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest
  );
$$;


ALTER FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  return private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint
  );
end;
$$;


ALTER FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.create_family_invitation(
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_invitee_email_hint,
    p_code_hash
  );
$$;


ALTER FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group"("p_name" "text", "p_visibility" "public"."group_visibility", "p_locality_id" "uuid", "p_description" "text" DEFAULT NULL::"text", "p_rules" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_group_id uuid;
begin
  if not private.is_verified_locality_member(p_locality_id) then
    raise exception 'only verified locality members can create groups';
  end if;

  insert into public.groups (
    name, description, rules, visibility, locality_id, created_by, owner_user_id
  )
  values (
    p_name,
    p_description,
    nullif(btrim(coalesce(p_rules, '')), ''),
    p_visibility,
    p_locality_id,
    auth.uid(),
    auth.uid()
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, auth.uid(), 'owner', 'approved');

  return v_group_id;
end;
$$;


ALTER FUNCTION "public"."create_group"("p_name" "text", "p_visibility" "public"."group_visibility", "p_locality_id" "uuid", "p_description" "text", "p_rules" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_in_community"("p_name" "text", "p_description" "text", "p_visibility" "public"."group_visibility", "p_community_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_group_id uuid;
  v_locality_id uuid;
begin
  if not private.is_community_member(p_community_id) then
    raise exception 'only approved community members can create groups here';
  end if;

  select locality_id into v_locality_id
  from public.communities
  where id = p_community_id and is_deleted = false;

  insert into public.groups (
    name, description, visibility, locality_id, community_id, created_by, owner_user_id
  )
  values (
    p_name, p_description, p_visibility, v_locality_id, p_community_id,
    (select auth.uid()), (select auth.uid())
  )
  returning id into v_group_id;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, (select auth.uid()), 'owner', 'approved');

  return v_group_id;
end;
$$;


ALTER FUNCTION "public"."create_group_in_community"("p_name" "text", "p_description" "text", "p_visibility" "public"."group_visibility", "p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_member_business_page"("p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := (select auth.uid());
  v_locality_id uuid;
  v_provider_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = v_user_id
  ) then
    raise exception 'civil provider accounts use the existing profile flow'
      using errcode = '42501';
  end if;

  select lm.locality_id
    into v_locality_id
    from public.locality_memberships lm
   where lm.user_id = v_user_id
     and lm.kind = 'current'
     and lm.access = 'active'
   for update;

  if v_locality_id is null then
    raise exception 'an active current locality membership is required'
      using errcode = '42501';
  end if;

  if p_display_name is null
     or char_length(btrim(p_display_name)) not between 2 and 80
     or p_category is null
     or (p_bio is not null and char_length(btrim(p_bio)) not between 1 and 800)
  then
    raise exception 'invalid business profile fields' using errcode = '22023';
  end if;

  select p.id into v_provider_id
    from public.provider_profiles p
   where p.owner_user_id = v_user_id;

  if v_provider_id is not null then
    perform private.move_member_business_reach(v_user_id, v_locality_id);
    insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
    select v_provider_id, 'locality', v_locality_id, 'free', true
     where not exists (
       select 1 from public.provider_reach r
        where r.provider_id = v_provider_id
          and r.scope_type = 'locality'
          and r.source = 'free'
     );
    return v_provider_id;
  end if;

  insert into public.provider_profiles (
    owner_user_id, display_name, category, bio
  ) values (
    v_user_id,
    btrim(p_display_name),
    p_category,
    nullif(btrim(p_bio), '')
  )
  returning id into v_provider_id;

  insert into public.provider_reach (provider_id, scope_type, scope_id, source, active)
  values (v_provider_id, 'locality', v_locality_id, 'free', true);

  return v_provider_id;
end;
$$;


ALTER FUNCTION "public"."create_member_business_page"("p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_property_listing"("p_listing" "jsonb", "p_details" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_listing uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  insert into public.listings (
    owner_user_id,
    kind,
    status,
    title,
    description,
    neighborhood,
    address,
    published_at,
    locality_id,
    community_id
  ) values (
    v_me,
    'property',
    coalesce((p_listing ->> 'status')::public.listing_status, 'draft'),
    p_listing ->> 'title',
    nullif(btrim(coalesce(p_listing ->> 'description', '')), ''),
    nullif(btrim(coalesce(p_listing ->> 'neighborhood', '')), ''),
    nullif(btrim(coalesce(p_listing ->> 'address', '')), ''),
    nullif(p_listing ->> 'published_at', '')::timestamptz,
    nullif(p_listing ->> 'locality_id', '')::uuid,
    nullif(p_listing ->> 'community_id', '')::uuid
  )
  returning id into v_listing;

  insert into public.property_details (
    listing_id,
    deal,
    property_type,
    rent_cents,
    condo_fee_cents,
    iptu_cents,
    sale_price_cents,
    bedrooms,
    suites,
    parking_spots,
    area_m2,
    available_from
  ) values (
    v_listing,
    (p_details ->> 'deal')::public.listing_deal,
    (p_details ->> 'property_type')::public.property_type,
    (p_details ->> 'rent_cents')::integer,
    (p_details ->> 'condo_fee_cents')::integer,
    (p_details ->> 'iptu_cents')::integer,
    (p_details ->> 'sale_price_cents')::integer,
    (p_details ->> 'bedrooms')::integer,
    (p_details ->> 'suites')::integer,
    (p_details ->> 'parking_spots')::integer,
    (p_details ->> 'area_m2')::numeric,
    nullif(p_details ->> 'available_from', '')::date
  );

  return v_listing;
end;
$$;


ALTER FUNCTION "public"."create_property_listing"("p_listing" "jsonb", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_provider_invitation"("p_community_id" "uuid", "p_email" "text", "p_display_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_inviter_user_id uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_display_name text := btrim(p_display_name);
  v_locality_id uuid;
  v_active_count integer;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_invitation_id uuid;
begin
  if v_inviter_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid provider e-mail' using errcode = '22023';
  end if;

  if char_length(v_display_name) not between 2 and 80 then
    raise exception 'provider display name must have between 2 and 80 characters'
      using errcode = '22023';
  end if;

  select c.locality_id
    into v_locality_id
    from public.communities c
    join public.community_memberships cm
      on cm.community_id = c.id
     and cm.user_id = v_inviter_user_id
     and cm.status = 'approved'
   where c.id = p_community_id
     and c.is_deleted = false;

  if v_locality_id is null then
    raise exception 'only approved community members can invite providers'
      using errcode = '42501';
  end if;

  -- Serializa a cota por autor para que duas requisições concorrentes não
  -- consigam criar o sexto convite.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_inviter_user_id::text, 0)
  );

  select count(*)::integer
    into v_active_count
    from private.provider_invitations pi
   where pi.inviter_user_id = v_inviter_user_id
     and pi.status = 'pending'
     and pi.expires_at > now();

  if v_active_count >= 5 then
    raise exception 'maximum 5 active provider invitations per member'
      using errcode = '54000';
  end if;

  insert into private.provider_invitations (
    inviter_user_id,
    community_id,
    locality_id,
    display_name,
    token_digest,
    invitee_email_digest,
    expires_at
  )
  values (
    v_inviter_user_id,
    p_community_id,
    v_locality_id,
    v_display_name,
    extensions.digest(decode(v_token, 'hex'), 'sha256'),
    extensions.digest(v_email, 'sha256'),
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  -- O token em claro existe apenas na mensagem operacional que precisa
  -- entregá-lo. A tabela de convites persiste somente o digest.
  insert into public.outbox (recipient, channel, type, payload)
  values (
    v_email,
    'email',
    'provider_invite',
    jsonb_build_object(
      'display_name', v_display_name,
      'invite_path', '/prestador-convite/' || v_token
    )
  );

  return v_invitation_id;
end;
$_$;


ALTER FUNCTION "public"."create_provider_invitation"("p_community_id" "uuid", "p_email" "text", "p_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_service_request"("p_provider_id" "uuid", "p_description" "text", "p_when_text" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_provider_user uuid;
  v_category public.provider_category;
  v_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_existing uuid;
  v_open_count integer;
  v_a uuid;
  v_b uuid;
  v_conv uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_description is null or btrim(p_description) = '' then
    raise exception 'description required' using errcode = '22023';
  end if;
  if char_length(btrim(p_description)) > 500 then
    raise exception 'description too long' using errcode = '22023';
  end if;
  if p_when_text is not null and char_length(btrim(p_when_text)) > 120 then
    raise exception 'when too long' using errcode = '22023';
  end if;

  select pp.owner_user_id, pp.category
    into v_provider_user, v_category
    from public.provider_profiles pp
   where pp.id = p_provider_id
     and pp.is_deleted = false;

  if v_provider_user is null then
    raise exception 'provider not found' using errcode = 'P0002';
  end if;

  if v_provider_user = v_me then
    raise exception 'cannot request from the own profile' using errcode = '42501';
  end if;

  if not private.can_see_provider(p_provider_id) then
    raise exception 'provider not visible' using errcode = '42501';
  end if;

  -- ADR-20260922-conversa-por-pedido diz que bloqueios valem para as duas
  -- conversas, e cada pedido agora abre uma conversa nova: sem estas
  -- conferencias, quem foi bloqueado pelo prestador seguia mandando pedidos, e
  -- cada um criava uma conversa na caixa dele (auditoria de 22/09/2026, MEDIUM).
  -- Mesmas regras de open_conversation.
  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;
  if private.account_deletion_requested(v_provider_user) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = v_provider_user)
       or (blocker_user_id = v_provider_user and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A idempotencia vem ANTES do teto: reenviar o mesmo pedido devolve o pedido
  -- que ja existe, e nao pode virar recusa por estar na quinta vaga que ele
  -- mesmo ocupa.
  if v_key is not null then
    select r.id into v_existing
      from public.service_requests r
     where r.requester_user_id = v_me
       and r.idempotency_key = v_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- ADR-20260923-teto-de-pedidos-por-par: cinco em aberto por par.
  --
  -- O lock e sobre o PAR (quem pede + quem recebe), como no teto de convites,
  -- porque sem ele dois envios simultaneos contam quatro os dois e passam os
  -- dois na quinta vaga. Ele nao serializa o prestador inteiro nem a pessoa
  -- inteira: so o par.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_me::text || ':' || v_provider_user::text, 0)
  );

  select count(*)::integer
    into v_open_count
    from public.service_requests r
   where r.requester_user_id = v_me
     and r.provider_user_id = v_provider_user
     and r.status in ('open', 'in_conversation');

  if v_open_count >= 5 then
    raise exception 'maximum 5 open service requests per requester and provider'
      using errcode = '54000';
  end if;

  -- A ordenacao do par e do servidor e a conversa nasce com contexto fixo.
  v_a := least(v_me, v_provider_user);
  v_b := greatest(v_me, v_provider_user);

  -- ADR-20260922-conversa-por-pedido: cada pedido nasce com a sua conversa, de
  -- contexto service_request e context_id = id do pedido. Antes a conversa do
  -- par era reaproveitada, e todos os pedidos do par se misturavam.
  v_id := gen_random_uuid();

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, 'service_request', v_id)
  returning id into v_conv;

  insert into public.service_requests (
    id,
    requester_user_id,
    provider_id,
    provider_user_id,
    category,
    description,
    when_text,
    conversation_id,
    idempotency_key
  )
  values (
    v_id,
    v_me,
    p_provider_id,
    v_provider_user,
    v_category,
    btrim(p_description),
    nullif(btrim(coalesce(p_when_text, '')), ''),
    v_conv,
    v_key
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_service_request"("p_provider_id" "uuid", "p_description" "text", "p_when_text" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_verification_document"("p_document_id" "uuid", "p_decision" "text", "p_reason" "text", "p_operator_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_row private.verification_documents;
  v_locality_id uuid;
  v_email text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  if p_decision = 'rejected' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'a rejection requires a reason';
  end if;

  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can decide verification documents';
  end if;

  select * into v_row
    from private.verification_documents
    where id = p_document_id
    for update;

  if not found then
    raise exception 'document not found';
  end if;

  if v_row.review_status <> 'pending' then
    raise exception 'document already reviewed';
  end if;

  if v_row.expires_at <= now() then
    raise exception 'document already expired; no decision possible';
  end if;

  if p_decision = 'approved' then
    select locality_id into v_locality_id
    from public.locality_memberships
    where user_id = v_row.user_id
    order by locality_id asc
    limit 1;

    -- ADR-20260922-aprovacao-por-identidade-sem-cidade: sem cidade a aprovacao
    -- NAO falha mais. O documento e aprovado com reviewed_locality_id nulo, o
    -- resultado vira verified, e membership e perfil ficam para
    -- provision_member_locality, quando a pessoa escolher a cidade — o mesmo
    -- caminho do CPF aprovado.

    update private.verification_documents
      set review_status = 'approved',
          reviewed_by = p_operator_user_id,
          reviewed_at = now(),
          reviewed_locality_id = v_locality_id,
          purge_state = null
      where id = p_document_id;

    perform private.upsert_verification_outcome(
      v_row.user_id,
      'verified'::private.verification_status,
      'active_federal_military'::private.eligibility_class
    );

    if v_locality_id is not null then
      insert into public.locality_memberships (user_id, locality_id)
      values (v_row.user_id, v_locality_id)
      on conflict (user_id, locality_id) do nothing;

      insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
      values (
        v_row.user_id,
        'Membro',
        'locality_members'::public.profile_visibility,
        1,
        now()
      )
      on conflict (user_id) do update
        set visibility = 'locality_members'::public.profile_visibility,
            consent_version = greatest(profiles.consent_version, excluded.consent_version),
            consented_at = coalesce(profiles.consented_at, excluded.consented_at);
    end if;

    select u.email into v_email
    from auth.users u
    where u.id = v_row.user_id;

    if v_email is not null and v_email <> '' then
      insert into public.outbox (recipient, channel, type, payload)
      values (
        v_email,
        'email',
        'verification_decision',
        jsonb_build_object(
          'user_id', v_row.user_id,
          'status', 'approved'
        )
      );
    end if;
  else
    update private.verification_documents
      set review_status = 'rejected',
          reviewed_by = p_operator_user_id,
          reviewed_at = now(),
          reviewed_locality_id = (select locality_id from public.locality_memberships where user_id = v_row.user_id limit 1),
          rejection_reason = p_reason
      where id = p_document_id;

    perform private.upsert_verification_outcome(
      v_row.user_id,
      'rejected'::private.verification_status
    );

    select u.email into v_email
    from auth.users u
    where u.id = v_row.user_id;

    if v_email is not null and v_email <> '' then
      insert into public.outbox (recipient, channel, type, payload)
      values (
        v_email,
        'email',
        'verification_decision',
        jsonb_build_object(
          'user_id', v_row.user_id,
          'status', 'rejected'
        )
      );
    end if;
  end if;
end;
$$;


ALTER FUNCTION "public"."decide_verification_document"("p_document_id" "uuid", "p_decision" "text", "p_reason" "text", "p_operator_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."declare_locality_transfer"("p_destination_locality_id" "uuid", "p_term_date" "date") RETURNS TABLE("current_locality_id" "uuid", "leaving_locality_id" "uuid", "leaving_at" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_current_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.localities where id = p_destination_locality_id
  ) then
    raise exception 'destination not in catalog' using errcode = '23514';
  end if;

  select locality_id into v_current_id
    from public.locality_memberships
    where user_id = v_user_id and kind = 'current'
    limit 1;

  if v_current_id is null then
    raise exception 'no current locality to leave' using errcode = '23514';
  end if;

  if v_current_id = p_destination_locality_id then
    raise exception 'destination equals current' using errcode = '23514';
  end if;

  update public.locality_memberships
    set kind = 'leaving', leaving_at = p_term_date, access = 'active'
    where user_id = v_user_id and kind = 'current';

  insert into public.locality_memberships (user_id, locality_id, kind, access)
    values (v_user_id, p_destination_locality_id, 'current', 'active');

  return query
    select
      p_destination_locality_id,
      v_current_id,
      p_term_date;
end;
$$;


ALTER FUNCTION "public"."declare_locality_transfer"("p_destination_locality_id" "uuid", "p_term_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."degrade_locality_origins"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_count integer;
begin
  update public.locality_memberships
    set access = 'read_only'
    where kind = 'leaving'
      and access = 'active'
      and leaving_at is not null
      and leaving_at < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."degrade_locality_origins"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_group"("p_group_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can delete the group';
  end if;

  update public.groups
  set is_deleted = true
  where id = p_group_id;
end;
$$;


ALTER FUNCTION "public"."delete_group"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."family_accept_holder_locality"("p_link_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.holder_locality_at_acceptance(p_link_id);
$$;


ALTER FUNCTION "public"."family_accept_holder_locality"("p_link_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) RETURNS TABLE("status" "text", "link_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select * from private.family_invite_code_accept(
    p_code_hash,
    p_accepted_by_user_id,
    p_origin_digest,
    p_display_name,
    p_consent_version
  );
$$;


ALTER FUNCTION "public"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea" DEFAULT NULL::"bytea") RETURNS TABLE("status" "text", "inviter_name" "text", "invitee_email_hint" "text", "expires_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select * from private.family_invite_code_preview(
    p_code_hash,
    p_origin_digest,
    p_email_digest
  );
$$;


ALTER FUNCTION "public"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."feed_community"("p_community_id" "uuid", "p_order" "text" DEFAULT 'recent'::"text", "p_limit" integer DEFAULT NULL::integer, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "community_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with am_member as (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = (select auth.uid())
      and status = 'approved'
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.community_id = p_community_id
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  ),
  community_locality as (
    select locality_id
    from public.communities
    where id = p_community_id
  ),
  -- 1. A página, escolhida só pelo que decide a ordem.
  page as (
    select
      p.id,
      p.created_at,
      case
        when p_order = 'recent' then 0
        else (
          select count(*)
          from public.comments c
          where c.post_id = p.id and c.is_deleted = false
        )
      end as rank_count
    from public.posts p
    where exists (select 1 from am_member)
      and p.is_deleted = false
      and (
        p.community_id = p_community_id
        or p.group_id in (select vg.id from visible_groups vg)
        or (
          p.community_id is null
          and p.group_id is null
          and exists (
            select 1 from community_locality cl
            where cl.locality_id = p.locality_id
          )
        )
      )
    order by rank_count desc, p.created_at desc, p.id desc
    limit p_limit
    offset greatest(coalesce(p_offset, 0), 0)
  )
  -- 2. As contagens e o estado da pessoa, só para a página.
  select
    p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from page
  join public.posts p on p.id = page.id
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join lateral (
    select true as has_followed from public.post_follows f
    where f.post_id = p.id and f.user_id = (select auth.uid()) limit 1
  ) my_f on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  order by page.rank_count desc, page.created_at desc, page.id desc;
$$;


ALTER FUNCTION "public"."feed_community"("p_community_id" "uuid", "p_order" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."feed_following"() RETURNS TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "community_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    p.id, p.locality_id, p.user_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false), true, pr.display_name
  from public.post_follows f
  join public.posts p on p.id = f.post_id
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  where f.user_id = (select auth.uid())
    and p.is_deleted = false
    and (
      (
        p.community_id is null
        and p.group_id is null
        and private.is_locality_member(p.locality_id)
      )
      or (
        p.community_id is not null
        and p.group_id is null
        and exists (
          select 1
          from public.community_memberships cm
          where cm.community_id = p.community_id
            and cm.user_id = (select auth.uid())
            and cm.status = 'approved'
        )
      )
      or (
        p.group_id is not null
        and exists (
          select 1
          from public.groups g
          where g.id = p.group_id
            and (
              g.visibility = 'public'
              or exists (
                select 1
                from public.group_memberships gm
                where gm.group_id = g.id
                  and gm.user_id = (select auth.uid())
                  and gm.status = 'approved'
              )
            )
        )
      )
    )
  order by p.created_at desc;
$$;


ALTER FUNCTION "public"."feed_following"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."feed_group"("p_group_id" "uuid", "p_order" "text" DEFAULT 'recent'::"text") RETURNS TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with can_see as (
    select 1
    from public.groups g
    where g.id = p_group_id
      and private.is_locality_member(g.locality_id)
      and (g.community_id is null or private.is_community_member(g.community_id))
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join lateral (
    select true as has_followed from public.post_follows f
    where f.post_id = p.id and f.user_id = (select auth.uid()) limit 1
  ) my_f on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  where exists (select 1 from can_see)
    and p.group_id = p_group_id
    and p.is_deleted = false
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;


ALTER FUNCTION "public"."feed_group"("p_group_id" "uuid", "p_order" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."feed_posts"("p_locality_id" "uuid", "p_order" "text" DEFAULT 'recent'::"text") RETURNS TABLE("id" "uuid", "locality_id" "uuid", "user_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone, "comment_count" bigint, "reaction_count" bigint, "my_reaction" boolean, "my_follow" boolean, "display_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with am_member as (
    select 1
    from public.locality_memberships
    where user_id = (select auth.uid())
      and locality_id = p_locality_id
  ),
  visible_groups as (
    select g.id
    from public.groups g
    where g.locality_id = p_locality_id
      and g.community_id is null
      and (
        g.visibility = 'public'
        or exists (
          select 1
          from public.group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = (select auth.uid())
            and gm.status = 'approved'
        )
      )
  )
  select
    p.id, p.locality_id, p.user_id, p.group_id, p.post_type, p.content,
    p.photo_path, p.link_url, p.poll_options, p.created_at,
    coalesce(c_counts.cnt, 0), coalesce(r_counts.cnt, 0),
    coalesce(my_r.has_reacted, false),
    coalesce(my_f.has_followed, false),
    pr.display_name
  from public.posts p
  left join lateral (
    select count(*) as cnt from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ) c_counts on true
  left join lateral (
    select count(*) as cnt from public.post_reactions r where r.post_id = p.id
  ) r_counts on true
  left join lateral (
    select true as has_reacted from public.post_reactions r2
    where r2.post_id = p.id and r2.user_id = (select auth.uid()) limit 1
  ) my_r on true
  left join lateral (
    select true as has_followed from public.post_follows f
    where f.post_id = p.id and f.user_id = (select auth.uid()) limit 1
  ) my_f on true
  left join public.profiles pr
    on pr.user_id = p.user_id
  where exists (select 1 from am_member)
    and p.locality_id = p_locality_id
    and p.is_deleted = false
    and p.community_id is null
    and (p.group_id is null or p.group_id in (select id from visible_groups))
  order by
    case when p_order = 'recent' then 0 else coalesce(c_counts.cnt, 0) end desc,
    p.created_at desc;
$$;


ALTER FUNCTION "public"."feed_posts"("p_locality_id" "uuid", "p_order" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_account_deletion"("p_user_id" "uuid", "p_error" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_due_at timestamptz;
  v_finalized_at timestamptz;
begin
  select due_at, finalized_at into v_due_at, v_finalized_at
  from public.account_deletion_requests
  where user_id = p_user_id
  for update;

  if not found then
    return 'not_found';
  end if;

  -- Uma purga já concluída não volta a ser "falhou": a resposta perdida de uma
  -- chamada bem-sucedida não pode reescrever o estado de uma linha finalizada.
  if v_finalized_at is not null then
    return 'already_purged';
  end if;

  if p_error is not null then
    update public.account_deletion_requests
       set purge_last_error = left(p_error, 500)
     where user_id = p_user_id;
    return 'failed';
  end if;

  -- O prazo é o da tabela aprovada; o chamador não escolhe.
  if v_due_at > now() then
    return 'not_due';
  end if;

  -- Mídias pessoais: as referências saem aqui, os objetos do bucket saem na
  -- rota (única que fala com o Storage). Documentos de verificação nunca
  -- ficaram no schema público.
  delete from private.verification_documents where user_id = p_user_id;

  -- Perfil: o mínimo necessário para atribuir o conteúdo público permanece —
  -- display_name — porque o item 4 do ADR manda o conteúdo continuar atribuído
  -- a ele. Todo o resto do perfil é dado pessoal.
  update public.profiles
     set bio = null,
         -- DATA-001 (20261022120200): o bairro do perfil é dado pessoal e sai na purga.
         neighborhood = null,
         consent_version = 0,
         consented_at = null,
         updated_at = now()
   where user_id = p_user_id;

  delete from public.profile_affiliations where user_id = p_user_id;
  delete from public.profile_suspensions where user_id = p_user_id;
  delete from public.consent_acceptances where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.notification_channel_preferences where user_id = p_user_id;
  delete from public.notifications where recipient_user_id = p_user_id;
  delete from public.dm_read_states where user_id = p_user_id;
  delete from public.dm_blocks
   where blocker_user_id = p_user_id or blocked_user_id = p_user_id;
  delete from public.post_saves where user_id = p_user_id;
  delete from public.post_reactions where user_id = p_user_id;
  delete from public.post_follows where user_id = p_user_id;
  delete from public.listing_saves where user_id = p_user_id;
  delete from public.listing_alerts where owner_user_id = p_user_id;
  delete from public.recommendation_saves where user_id = p_user_id;
  delete from public.user_group_interests where user_id = p_user_id;
  delete from public.event_rsvps where user_id = p_user_id;

  -- Entidades novas do ADR-20261022 que a purga precisa conhecer. A conta nao e
  -- apagada de verdade: o GoTrue faz soft delete em auth.users, entao o ON
  -- DELETE CASCADE da FK nunca dispara aqui. Sem estas duas linhas, ocultacoes
  -- e chamados ficariam para sempre depois da exclusao.
  delete from public.hidden_questions where user_id = p_user_id;

  -- PORT-005: o momento declarado (cidade, datas e destino) é dado pessoal e
  -- some junto. O protótipo descarta o rascunho ao concluir a entrada; a linha
  -- do banco é o que a Início e as boas-vindas leem, e por isso é apagada aqui.
  delete from public.member_entry_moments where user_id = p_user_id;

  -- A resposta do chamado tambem foi para a fila de envio, endereçada ao e-mail
  -- da epoca. Se a pessoa trocou o endereco antes de excluir a conta,
  -- purge_account_contact_data (que limpa POR ENDERECO) nao acha essa linha, e
  -- ela sobreviveria com assunto e texto da resposta. O vinculo e o ticket_id no
  -- payload, nao o destinatario; por isso a remocao vem antes do chamado.
  delete from public.outbox o
   where o.type = 'support_answered'
     and exists (
       select 1
       from public.support_tickets t
       where t.user_id = p_user_id
         and t.id::text = o.payload ->> 'ticket_id'
     );

  delete from public.support_tickets where user_id = p_user_id;

  -- A pessoa pode ter respondido chamados de terceiros antes de sair. A resposta
  -- fica (e dela que o destinatario depende), mas a autoria sai: o ON DELETE SET
  -- NULL da FK nao dispara, porque a exclusao real e soft delete.
  update public.support_tickets
     set answered_by = null
   where answered_by = p_user_id;

  -- Participação sai; posse NÃO é dissolvida (ver rodapé). O trigger
  -- cascade_community_membership_loss recusa remover a linha do dono, e este
  -- caminho não passa por cima dele: a mesma regra vale para a purga.
  delete from public.community_memberships cm
   where cm.user_id = p_user_id
     and not exists (
       select 1 from public.communities c
       where c.id = cm.community_id and c.owner_user_id = p_user_id
     );

  delete from public.group_memberships gm
   where gm.user_id = p_user_id
     and not exists (
       select 1 from public.groups g
       where g.id = gm.group_id and g.owner_user_id = p_user_id
     );

  delete from public.locality_memberships where user_id = p_user_id;

  -- Privilégio de operação morre com a conta; a auditoria da concessão fica.
  update public.operators
     set revoked_at = coalesce(revoked_at, now())
   where auth_user_id = p_user_id
     and revoked_at is null;

  update public.arrival_guide_entries set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports set resolved_by = null where resolved_by = p_user_id;

  -- Convites familiares dos DOIS lados: como convidante (já revogados no
  -- pedido) e como convidado aceito. A linha guarda o digest e o palpite do
  -- e-mail de quem foi convidado — dado do titular, não do produto. Os vínculos
  -- (family_account_links) já saíram no pedido, então a FK de RESTRICT não
  -- segura nada aqui.
  delete from private.family_invitations
   where inviter_user_id = p_user_id or accepted_by_user_id = p_user_id;

  update public.account_deletion_requests
     set finalized_at = now(),
         purge_last_error = null
   where user_id = p_user_id;

  return 'purged';
end;
$$;


ALTER FUNCTION "public"."finalize_account_deletion"("p_user_id" "uuid", "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_bio"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select p.bio
  from public.profiles p
  where p.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_profile_bio"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_neighborhood"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.neighborhood
  from public.profiles p
  where p.user_id = p_user_id
    and (select auth.uid()) is not null
    and (
      p.user_id = (select auth.uid())
      or (
        p.show_neighborhood
        and not private.account_deletion_requested(p_user_id)
        and (
          private.shares_locality_with(p_user_id)
          or exists (
            select 1
            from public.community_memberships mine
            join public.community_memberships theirs
              on theirs.community_id = mine.community_id
            where mine.user_id = (select auth.uid())
              and mine.status = 'approved'
              and theirs.user_id = p_user_id
              and theirs.status = 'approved'
          )
        )
      )
    );
$$;


ALTER FUNCTION "public"."get_profile_neighborhood"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_profile_neighborhood"("p_user_id" "uuid") IS 'Bairro de um perfil: dono sempre; terceiro só com show_neighborhood e visibilidade atual do perfil. NULL quando não pode ver.';



CREATE OR REPLACE FUNCTION "public"."get_provider_contact_phone"("p_provider_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.contact_phone
    from public.provider_profiles p
   where p.id = p_provider_id
     and (select auth.uid()) is not null
     and not p.is_deleted
     and private.can_see_provider(p.id)
     and (p.contact_is_public or p.owner_user_id = (select auth.uid()));
$$;


ALTER FUNCTION "public"."get_provider_contact_phone"("p_provider_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_accepted_consent"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.consent_acceptances
    where user_id = p_user_id
      and consent_version = p_consent_version
      and code_of_conduct_version = p_code_of_conduct_version
  );
$$;


ALTER FUNCTION "public"."has_accepted_consent"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_verified_family_holder"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from private.family_account_links link
    where link.family_user_id = p_user_id
      and private.is_verified_holder(link.holder_user_id)
  );
$$;


ALTER FUNCTION "public"."has_verified_family_holder"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_account_deletion_pending"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.account_deletion_requests
    where user_id = (select auth.uid())
      and finalized_at is null
  );
$$;


ALTER FUNCTION "public"."is_account_deletion_pending"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_account_suspended"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p_user_id = (select auth.uid())
     and exists (
       select 1 from public.profile_suspensions where user_id = p_user_id
     );
$$;


ALTER FUNCTION "public"."is_account_suspended"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_community_member"("p_community_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = p_user_id
      and status = 'approved'
  );
$$;


ALTER FUNCTION "public"."is_community_member"("p_community_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.community_memberships
    where community_id = p_community_id
      and user_id = p_user_id
      and status = 'approved'
      and role in ('moderator', 'owner')
  );
$$;


ALTER FUNCTION "public"."is_current_user_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_operator"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.operators
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;


ALTER FUNCTION "public"."is_current_user_operator"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_provider_account"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.provider_accounts
    where auth_user_id = p_user_id
      and revoked_at is null
  );
$$;


ALTER FUNCTION "public"."is_provider_account"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_verified_holder"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.check_verified_holder(p_user_id);
$$;


ALTER FUNCTION "public"."is_verified_holder"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_group"("p_group_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_locality_id uuid;
  v_visibility public.group_visibility;
  v_me uuid := (select auth.uid());
  v_reason text;
begin
  select locality_id, visibility
  into v_locality_id, v_visibility
  from public.groups
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'must be a locality member to join groups';
  end if;

  if v_visibility = 'public' then
    insert into public.group_memberships (group_id, user_id, role, status)
    values (p_group_id, v_me, 'member', 'approved')
    on conflict (group_id, user_id) do nothing;
    return;
  end if;

  -- Grupo Fechado. Um pedido já aberto (pendente) ou uma participação já
  -- aprovada não é um novo pedido: nada muda e nenhuma tentativa é consumida.
  if exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = v_me
  ) then
    return;
  end if;

  insert into public.group_memberships (group_id, user_id, role, status)
  values (p_group_id, v_me, 'member', 'pending');

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is not null then
    insert into public.group_join_reasons (group_id, user_id, reason)
    values (p_group_id, v_me, left(v_reason, 300));
  end if;
end;
$$;


ALTER FUNCTION "public"."join_group"("p_group_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_community"("p_community_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = (select auth.uid())
    and status = 'approved';
end;
$$;


ALTER FUNCTION "public"."leave_community"("p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_available_groups_for_interests"("p_user_id" "uuid", "p_locality_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "visibility" "public"."group_visibility", "already_member" boolean, "already_interest" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    g.id,
    g.name,
    g.description,
    g.visibility,
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = g.id
        and gm.user_id = p_user_id
        and gm.status = 'approved'
    ) as already_member,
    exists (
      select 1 from public.user_group_interests ugi
      where ugi.group_id = g.id and ugi.user_id = p_user_id
    ) as already_interest
  from public.groups g
  where g.locality_id = p_locality_id
    and (
      g.visibility = 'public'
      or exists (
        select 1 from public.group_memberships gm
        where gm.group_id = g.id
          and gm.user_id = p_user_id
          and gm.status = 'approved'
      )
    )
  order by g.name;
$$;


ALTER FUNCTION "public"."list_available_groups_for_interests"("p_user_id" "uuid", "p_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_community_pending_arrivals"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer DEFAULT 500) RETURNS TABLE("user_id" "uuid", "display_name" "text", "requested_at" timestamp with time zone, "arriving_from_locality_name" "text", "arriving_at" "date")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_current_user_community_moderator(p_community_id, p_user_id) then
    raise exception 'not a moderator of this community' using errcode = '42501';
  end if;

  return query
    select
      cm.user_id,
      p.display_name,
      cm.joined_at,
      origin.city_name,
      origin_row.leaving_at
    from public.community_memberships cm
    left join public.profiles p on p.user_id = cm.user_id
    left join public.locality_memberships origin_row
      on origin_row.user_id = cm.user_id
     and origin_row.kind = 'leaving'
    left join public.localities origin
      on origin.id = origin_row.locality_id
    where cm.community_id = p_community_id
      and cm.status = 'pending'
    order by cm.joined_at asc
    limit p_limit;
end;
$$;


ALTER FUNCTION "public"."list_community_pending_arrivals"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_community_providers"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer DEFAULT 200) RETURNS TABLE("provider_user_id" "uuid", "display_name" "text", "category" "public"."provider_category", "revoked_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select pa.auth_user_id, pr.display_name, pr.category, pa.revoked_at
    from public.provider_accounts pa
    join public.provider_profiles pr on pr.owner_user_id = pa.auth_user_id
   where pa.community_id = p_community_id
     and exists (
       select 1 from public.communities c
        where c.id = pa.community_id
          and c.owner_user_id = p_user_id
          and c.is_deleted = false
     )
     and not pr.is_deleted
   order by pa.revoked_at nulls first, pr.display_name
   limit least(greatest(p_limit, 1), 500);
$$;


ALTER FUNCTION "public"."list_community_providers"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_group_activity"("p_locality_id" "uuid") RETURNS TABLE("group_id" "uuid", "recent_post_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    g.id,
    coalesce(count(p.id), 0)::bigint
  from public.groups g
  left join public.posts p
    on p.group_id = g.id
   and p.is_deleted = false
   and p.created_at >= now() - interval '30 days'
  where g.locality_id = p_locality_id
    and g.is_deleted = false
    and private.is_locality_member(p_locality_id)
  group by g.id;
$$;


ALTER FUNCTION "public"."list_group_activity"("p_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_hidden_questions"() RETURNS TABLE("id" "uuid", "title" "text", "body" "text", "category" "public"."recommendation_category", "created_at" timestamp with time zone, "hidden_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select r.id, r.title, r.body, r.category, r.created_at, h.hidden_at
  from public.hidden_questions h
  join public.recommendation_requests r on r.id = h.request_id
  where h.user_id = (select auth.uid())
    and r.is_deleted = false
  order by h.hidden_at desc, r.id desc;
$$;


ALTER FUNCTION "public"."list_hidden_questions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_indications"("p_locality_id" "uuid", "p_query" "text" DEFAULT NULL::"text", "p_category" "public"."recommendation_category" DEFAULT NULL::"public"."recommendation_category", "p_resolved" boolean DEFAULT NULL::boolean, "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_mine" boolean DEFAULT NULL::boolean) RETURNS TABLE("id" "uuid", "title" "text", "body" "text", "category" "public"."recommendation_category", "created_at" timestamp with time zone, "is_resolved" boolean, "group_id" "uuid", "group_name" "text", "reply_count" integer, "resolved_reply_body" "text", "matched_reply_body" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  with terms as (
    select t.term, to_tsquery('public.bivaque_pt', t.term || ':*') as tsq
    from unnest(private.indication_terms(p_query)) as t(term)
  ),
  candidates as (
    select r.*, g.name as group_name
    from public.recommendation_requests r
    left join public.groups g on g.id = r.group_id
    where (r.locality_id = p_locality_id or g.locality_id = p_locality_id)
      and (p_category is null or r.category = p_category)
      and (p_resolved is null or r.is_resolved = p_resolved)
      -- Minhas / Para ajudar: a autoria entra no filtro, no servidor.
      and (p_mine is null or (r.author_id = (select auth.uid())) = p_mine)
      -- Ocultar e pessoal: some so da lista de quem ocultou.
      and not exists (
        select 1
        from public.hidden_questions h
        where h.request_id = r.id
          and h.user_id = (select auth.uid())
      )
  ),
  scored as (
    select
      c.*,
      (
        select count(*)::integer
        from terms t
        where to_tsvector('public.bivaque_pt', c.title || ' ' || c.body) @@ t.tsq
      ) as hits_question,
      (
        select count(*)::integer
        from terms t
        where to_tsvector('public.bivaque_pt', c.title || ' ' || c.body) @@ t.tsq
          or exists (
            select 1
            from public.recommendation_replies rep
            where rep.request_id = c.id
              and to_tsvector('public.bivaque_pt', rep.body) @@ t.tsq
          )
      ) as hits,
      (
        select rep.body
        from public.recommendation_replies rep
        where rep.request_id = c.id
          and exists (
            select 1 from terms t
            where to_tsvector('public.bivaque_pt', rep.body) @@ t.tsq
          )
        order by (rep.id = c.resolved_reply_id) desc, rep.created_at
        limit 1
      ) as matched_reply_body,
      (
        select count(*)::integer
        from public.recommendation_replies rep
        where rep.request_id = c.id
      ) as reply_count
    from candidates c
  )
  select
    s.id,
    s.title,
    s.body,
    s.category,
    s.created_at,
    s.is_resolved,
    s.group_id,
    s.group_name,
    s.reply_count,
    -- A resposta que resolveu so aparece quando a PERGUNTA diz que esta
    -- resolvida: a leitura olha o estado da pergunta, nunca so o ponteiro
    -- (contrato do ADR-20261023, secao 2).
    (
      select rep.body
      from public.recommendation_replies rep
      where s.is_resolved
        and rep.id = s.resolved_reply_id
    ),
    s.matched_reply_body
  from scored s
  -- Entra quem tem termo na propria pergunta, ou quem casa pelo menos metade
  -- dos termos nas respostas: "fonoaudiologo infantil" nao traz a natacao so
  -- porque uma resposta fala em "turma infantil".
  where not exists (select 1 from terms)
    or s.hits_question > 0
    or s.hits * 2 >= (select count(*) from terms)
  order by
    s.hits desc,
    (s.is_resolved and exists (select 1 from terms)) desc,
    -- "Para ajudar": perguntas sem resposta aparecem primeiro, como no
    -- prototipo. Nos outros filtros a expressao e nula e nada muda.
    case when p_mine is false and p_resolved is false then s.reply_count end asc nulls last,
    s.created_at desc,
    s.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;


ALTER FUNCTION "public"."list_indications"("p_locality_id" "uuid", "p_query" "text", "p_category" "public"."recommendation_category", "p_resolved" boolean, "p_limit" integer, "p_offset" integer, "p_mine" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_invitable_members_for_event"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "display_name" "text", "is_already_invited" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_organizer_id uuid;
  v_locality_id uuid;
begin
  select e.organizer_id, e.locality_id
    into v_organizer_id, v_locality_id
    from public.events e
    where e.id = p_event_id;

  if v_organizer_id is null or v_organizer_id <> p_user_id then
    return;
  end if;

  return query
    select
      lm.user_id,
      p.display_name,
      exists (
        select 1 from public.event_invites ei
        where ei.event_id = p_event_id and ei.invitee_user_id = lm.user_id
      )
    from public.locality_memberships lm
    left join public.profiles p on p.user_id = lm.user_id
    where lm.locality_id = v_locality_id
      and lm.user_id <> v_organizer_id
      and private.can_receive_invite_to_event(p_event_id, lm.user_id)
    order by p.display_name nulls last;
end;
$$;


ALTER FUNCTION "public"."list_invitable_members_for_event"("p_event_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_locality_arrivals_volume"("p_user_id" "uuid") RETURNS TABLE("locality_id" "uuid", "city_name" "text", "arrivals_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_current_user_operator(p_user_id) then
    raise exception 'not an operator' using errcode = '42501';
  end if;

  return query
    select
      destination.locality_id,
      l.city_name,
      count(*)::bigint
    from public.locality_memberships destination
    join public.localities l on l.id = destination.locality_id
    where destination.kind = 'current'
      and exists (
        select 1
        from public.locality_memberships origin
        where origin.user_id = destination.user_id
          and origin.kind = 'leaving'
      )
    group by destination.locality_id, l.city_name
    order by count(*) desc;
end;
$$;


ALTER FUNCTION "public"."list_locality_arrivals_volume"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_locality_state_codes"() RETURNS TABLE("state_code" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select distinct l.state_code
  from public.localities as l
  order by l.state_code
$$;


ALTER FUNCTION "public"."list_locality_state_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_open_reports"() RETURNS TABLE("id" "uuid", "target_type" "public"."report_target_type", "target_id" "uuid", "reason" "text", "created_at" timestamp with time zone, "target_excerpt" "text", "target_author_name" "text", "open_reports_on_target" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    r.id,
    r.target_type,
    r.target_id,
    r.reason,
    r.created_at,
    left(t.excerpt, 240) as target_excerpt,
    pr.display_name as target_author_name,
    (
      select count(*)::int
      from public.reports dup
      where dup.target_type = r.target_type
        and dup.target_id = r.target_id
        and dup.status = 'open'
    ) as open_reports_on_target
  from public.reports r
  left join lateral (
    select
      case r.target_type
        when 'post' then
          (select p.content from public.posts p where p.id = r.target_id)
        when 'comment' then
          (select c.content from public.comments c where c.id = r.target_id)
        when 'group' then
          (select g.name from public.groups g where g.id = r.target_id)
        when 'message' then
          (select m.content from public.dm_messages m where m.id = r.target_id)
        when 'recommendation_request' then
          (select q.title from public.recommendation_requests q where q.id = r.target_id)
        when 'recommendation_reply' then
          (select y.body from public.recommendation_replies y where y.id = r.target_id)
        else null
      end as excerpt,
      case r.target_type
        when 'post' then
          (select p.user_id from public.posts p where p.id = r.target_id)
        when 'comment' then
          (select c.user_id from public.comments c where c.id = r.target_id)
        when 'group' then
          (select g.owner_user_id from public.groups g where g.id = r.target_id)
        when 'message' then
          (select m.sender_id from public.dm_messages m where m.id = r.target_id)
        when 'recommendation_request' then
          (select q.author_id from public.recommendation_requests q where q.id = r.target_id)
        when 'recommendation_reply' then
          (select y.author_id from public.recommendation_replies y where y.id = r.target_id)
        else null
      end as author_id
  ) t on true
  left join public.profiles pr on pr.user_id = t.author_id
  where r.status = 'open'
  order by r.created_at asc;
$$;


ALTER FUNCTION "public"."list_open_reports"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_pending_community_invitations"("p_inviter_user_id" "uuid", "p_community_id" "uuid") RETURNS TABLE("id" "uuid", "community_id" "uuid", "expires_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select id, community_id, expires_at, created_at
  from public.community_invitations
  where inviter_user_id = p_inviter_user_id
    and community_id = p_community_id
    and status = 'pending'
    and expires_at > now()
  order by created_at desc;
$$;


ALTER FUNCTION "public"."list_pending_community_invitations"("p_inviter_user_id" "uuid", "p_community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_pending_invites"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "invitee_email_digest" "bytea", "created_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select * from private.list_pending_invites(p_user_id);
$$;


ALTER FUNCTION "public"."list_pending_invites"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_pending_invites_with_hint"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "invitee_email_digest" "bytea", "invitee_email_hint" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select * from private.list_pending_invites_with_hint(p_user_id);
$$;


ALTER FUNCTION "public"."list_pending_invites_with_hint"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_promotable_replies"("p_locality_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("reply_id" "uuid", "body" "text", "created_at" timestamp with time zone, "request_title" "text", "request_category" "public"."recommendation_category", "author_display_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    rr.id,
    rr.body,
    rr.created_at,
    r.title,
    r.category,
    p.display_name
  from public.recommendation_replies rr
  join public.recommendation_requests r on r.id = rr.request_id
  -- user_id-only: profiles.locality_id was dropped by P0 Task 3
  -- (20260817031237_belonging_multi_membership.sql) — one profile per person.
  left join public.profiles p
    on p.user_id = rr.author_id
  where r.locality_id = p_locality_id
    and rr.is_deleted = false
    and r.is_deleted = false
    and not exists (
      select 1 from public.recommendation_reply_promotions rp
      where rp.reply_id = rr.id
    )
  order by rr.created_at desc
  limit greatest(p_limit, 1);
$$;


ALTER FUNCTION "public"."list_promotable_replies"("p_locality_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_question_replies"("p_request_id" "uuid") RETURNS TABLE("id" "uuid", "author_id" "uuid", "body" "text", "created_at" timestamp with time zone, "edited_at" timestamp with time zone, "is_removed" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.recommendation_requests request
    where request.id = p_request_id
      and request.is_deleted = false
      and (
        request.author_id = v_uid
        or (
          request.locality_id is not null
          and private.can_see_locality_recommendation(request.locality_id)
        )
        or (request.group_id is not null and private.is_group_member(request.group_id))
      )
  ) then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  return query
    select
      reply.id,
      case when reply.is_deleted then null else reply.author_id end,
      case when reply.is_deleted then null else reply.body end,
      reply.created_at,
      reply.edited_at,
      reply.is_deleted
    from public.recommendation_replies reply
    where reply.request_id = p_request_id
    order by reply.created_at, reply.id;
end;
$$;


ALTER FUNCTION "public"."list_question_replies"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_user_group_interests"("p_user_id" "uuid") RETURNS TABLE("group_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select group_id, created_at
  from public.user_group_interests
  where user_id = p_user_id
  order by created_at desc;
$$;


ALTER FUNCTION "public"."list_user_group_interests"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_verification_documents"() RETURNS TABLE("document_id" "uuid", "user_id" "uuid", "mime_type" "text", "review_status" "text", "uploaded_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    id,
    user_id,
    mime_type,
    review_status::text,
    uploaded_at,
    expires_at
  from private.verification_documents
  where review_status = 'pending'
    and expires_at > now()
  order by uploaded_at asc;
$$;


ALTER FUNCTION "public"."list_verification_documents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_verification_queue"() RETURNS TABLE("user_id" "uuid", "display_name" "text", "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    v.user_id,
    p.display_name,
    v.status::text,
    v.created_at
  from private.verification_outcomes v
  left join public.profiles p on p.user_id = v.user_id
  where v.status in ('pending', 'temporary_error', 'rejected')
  order by v.created_at asc;
$$;


ALTER FUNCTION "public"."list_verification_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_seen_at" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_seen timestamptz := least(coalesce(p_seen_at, now()), now());
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1
      from public.dm_conversations c
     where c.id = p_conversation_id
       and (c.participant_a = v_me or c.participant_b = v_me)
  ) then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  insert into public.dm_read_states (conversation_id, user_id, last_read_at)
  values (p_conversation_id, v_me, v_seen)
  on conflict (conversation_id, user_id)
  do update set last_read_at = greatest(public.dm_read_states.last_read_at, excluded.last_read_at);
end;
$$;


ALTER FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_seen_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_recommendation_reply_resolved"("p_request_id" "uuid", "p_reply_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.recommendation_requests request
    join public.recommendation_replies reply
      on reply.id = p_reply_id
     and reply.request_id = request.id
     and reply.is_deleted = false
    where request.id = p_request_id
      and request.author_id = v_uid
  ) then
    raise exception 'request not found, reply does not belong to it, or you are not the author'
      using errcode = 'P0002';
  end if;

  update public.recommendation_requests
  set is_resolved = true,
      -- Trocar a resposta marcada atualiza o instante; repetir a mesma marca
      -- preserva resolved_at (idempotencia).
      resolved_at = case
        when resolved_reply_id is distinct from p_reply_id then now()
        else coalesce(resolved_at, now())
      end,
      resolved_by = v_uid,
      resolved_reply_id = p_reply_id,
      last_resolved_reply_id = p_reply_id
  where id = p_request_id
    and author_id = v_uid;
end;
$$;


ALTER FUNCTION "public"."mark_recommendation_reply_resolved"("p_request_id" "uuid", "p_reply_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_recommendation_resolved"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.recommendation_requests
  set is_resolved = true,
      -- Primeira resolucao guarda o instante; repetir preserva (idempotencia).
      resolved_at = coalesce(resolved_at, now()),
      resolved_by = v_uid,
      resolved_reply_id = null
  where id = p_request_id
    and author_id = v_uid;

  if not found then
    raise exception 'request not found or you are not the author' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."mark_recommendation_resolved"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_account_kind"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."my_account_kind"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_group_notify_level"("p_group_id" "uuid") RETURNS "public"."group_notify_level"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select gm.notify_level
  from public.group_memberships gm
  where gm.group_id = p_group_id
    and gm.user_id = (select auth.uid())
    and gm.status = 'approved';
$$;


ALTER FUNCTION "public"."my_group_notify_level"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_verification_document"("p_user_id" "uuid") RETURNS TABLE("document_id" "uuid", "review_status" "text", "uploaded_at" timestamp with time zone, "needs_replacement" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    d.id,
    d.review_status::text,
    d.uploaded_at,
    (d.review_status = 'rejected') as needs_replacement
  from private.verification_documents d
  where d.user_id = p_user_id
  order by d.uploaded_at desc, d.id desc
  limit 1;
$$;


ALTER FUNCTION "public"."my_verification_document"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_verification_document_paths"("p_user_id" "uuid") RETURNS TABLE("storage_object_path" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select d.storage_object_path
  from private.verification_documents d
  where d.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."my_verification_document_paths"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_verification_status"() RETURNS TABLE("status" "text", "eligibility_class" "text", "checked_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    status::text,
    eligibility_class::text,
    checked_at,
    updated_at
  from private.verification_outcomes
  where user_id = (select auth.uid());
$$;


ALTER FUNCTION "public"."my_verification_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_occurrence"("p_from" "date", "p_recurrence_type" "text", "p_recurrence_weekday" smallint DEFAULT NULL::smallint, "p_recurrence_ordinal" smallint DEFAULT NULL::smallint, "p_recurrence_day_of_month" smallint DEFAULT NULL::smallint) RETURNS "date"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_month_start date := date_trunc('month', p_from)::date;
  v_candidate date;
  v_days_in_month int;
  v_first_weekday_offset int;
  v_first_occurrence date;
  v_iterations int := 0;
begin
  if p_recurrence_type = 'monthly_day_of_month' then
    if p_recurrence_day_of_month is null then
      raise exception 'recurrence_day_of_month is required' using errcode = '23514';
    end if;
    loop
      v_iterations := v_iterations + 1;
      exit when v_iterations > 24;
      v_days_in_month := extract(day from (v_month_start + interval '1 month' - interval '1 day'))::int;
      v_candidate := v_month_start + (least(p_recurrence_day_of_month, v_days_in_month) - 1);
      if v_candidate >= p_from then
        return v_candidate;
      end if;
      v_month_start := v_month_start + interval '1 month';
    end loop;
  elsif p_recurrence_type = 'monthly_weekday_ordinal' then
    if p_recurrence_weekday is null or p_recurrence_ordinal is null then
      raise exception 'recurrence_weekday and recurrence_ordinal are required' using errcode = '23514';
    end if;
    loop
      v_iterations := v_iterations + 1;
      exit when v_iterations > 24;
      v_first_weekday_offset := (p_recurrence_weekday - extract(dow from v_month_start)::int + 7) % 7;
      v_first_occurrence := v_month_start + v_first_weekday_offset;
      v_candidate := v_first_occurrence + (p_recurrence_ordinal - 1) * 7;
      -- An ordinal that does not exist this month (its Nth weekday rolls
      -- into the next month) skips the month rather than return a date the
      -- pattern never asked for.
      if extract(month from v_candidate) = extract(month from v_month_start)
         and v_candidate >= p_from then
        return v_candidate;
      end if;
      v_month_start := v_month_start + interval '1 month';
    end loop;
  else
    raise exception 'unknown recurrence_type: %', p_recurrence_type using errcode = '23514';
  end if;

  raise exception 'could not compute next occurrence' using errcode = 'P0001';
end;
$$;


ALTER FUNCTION "public"."next_occurrence"("p_from" "date", "p_recurrence_type" "text", "p_recurrence_weekday" smallint, "p_recurrence_ordinal" smallint, "p_recurrence_day_of_month" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_conversation"("p_other_user_id" "uuid", "p_context_type" "public"."dm_context_type", "p_context_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null or v_me = p_other_user_id then
    raise exception 'invalid conversation' using errcode = '22023';
  end if;

  -- Quem está saindo também não abre conversa: a sessão morreu, mas um access
  -- token ainda aceito pelo Data API não pode virar conversa nova.
  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  if private.account_deletion_requested(p_other_user_id) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  -- ADR-20260922-conversa-por-pedido: conversa de pedido so nasce com o pedido,
  -- em create_service_request. Aqui ela nunca e aberta nem reaproveitada.
  if p_context_type = 'service_request' then
    raise exception 'service request conversations are created with the request'
      using errcode = '42501';
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

  -- O "do update" não muda nada: é o idioma para conseguir RETURNING quando a
  -- linha já existe. Reabrir conversa é devolver a mesma, não criar outra.
  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, p_context_type, p_context_id)
  on conflict (participant_a, participant_b) where context_type <> 'service_request'
  do update set participant_a = excluded.participant_a
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."open_conversation"("p_other_user_id" "uuid", "p_context_type" "public"."dm_context_type", "p_context_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_event_question"("p_event_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_organizer uuid;
  v_a uuid;
  v_b uuid;
  v_existing public.dm_conversations%rowtype;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select e.organizer_id into v_organizer
  from public.events e
  where e.id = p_event_id;

  if v_organizer is null then
    raise exception 'event not found' using errcode = '42501';
  end if;

  if v_organizer = v_me then
    raise exception 'organizer cannot ask about own event' using errcode = '42501';
  end if;

  -- Quem pergunta precisa enxergar o evento; a mesma regua da policy de leitura.
  if not private.can_access_event(p_event_id) then
    raise exception 'cannot access event' using errcode = '42501';
  end if;

  -- Bloqueio vale nos dois sentidos, inclusive para abrir conversa nova.
  if exists (
    select 1
    from public.dm_blocks
    where (blocker_user_id = v_me and blocked_user_id = v_organizer)
       or (blocker_user_id = v_organizer and blocked_user_id = v_me)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- A ordenacao e do servidor, e so dele - o cliente nunca escolhe quem e A.
  v_a := least(v_me, v_organizer);
  v_b := greatest(v_me, v_organizer);

  -- Conversas de pedido nao contam: o par pode ter varias, uma por pedido.
  select * into v_existing
  from public.dm_conversations c
  where c.participant_a = v_a
    and c.participant_b = v_b
    and c.context_type <> 'service_request';

  if found then
    if v_existing.context_type = 'event_question' and v_existing.context_id = p_event_id then
      return v_existing.id;
    end if;
    raise exception 'pair already has a conversation with another context'
      using errcode = '42501';
  end if;

  insert into public.dm_conversations (participant_a, participant_b, context_type, context_id)
  values (v_a, v_b, 'event_question', p_event_id)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."open_event_question"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_support_ticket"("p_topic" "public"."support_ticket_topic", "p_body" "text") RETURNS "public"."support_tickets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  v_email text;
  v_open integer;
  v_recent integer;
  v_row public.support_tickets%rowtype;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if p_topic is null then
    raise exception 'support ticket topic is required' using errcode = '22023';
  end if;

  if char_length(v_body) < 10 then
    raise exception 'support ticket body is too short' using errcode = '22023';
  end if;

  if char_length(v_body) > 1000 then
    raise exception 'support ticket body is too long' using errcode = '22023';
  end if;

  -- O endereço de resposta é o da conta. Sem e-mail não existe resposta.
  select u.email into v_email
  from auth.users u
  where u.id = v_user;

  if v_email is null or btrim(v_email) = '' then
    raise exception 'account has no e-mail' using errcode = 'P0002';
  end if;

  -- Limite por pessoa. 54000 é o código da casa para teto de abertura
  -- (20260825181742:113, 20260923120000:116), e a tela o traduz em frase.
  -- Serializa as aberturas da mesma pessoa: sem isso, duas chamadas simultâneas contam o mesmo
  -- total e as duas passam pelo limite.
  perform pg_advisory_xact_lock(hashtextextended('support_ticket:' || v_user::text, 0));

  select count(*) into v_open
  from public.support_tickets
  where user_id = v_user
    and status = 'open';

  if v_open >= 5 then
    raise exception 'maximum 5 open support tickets per person'
      using errcode = '54000';
  end if;

  select count(*) into v_recent
  from public.support_tickets
  where user_id = v_user
    and created_at > now() - interval '24 hours';

  if v_recent >= 10 then
    raise exception 'maximum 10 support tickets per person in 24 hours'
      using errcode = '54000';
  end if;

  insert into public.support_tickets (user_id, email, topic, body)
  values (v_user, btrim(v_email), p_topic, v_body)
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."open_support_ticket"("p_topic" "public"."support_ticket_topic", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pin_group_post"("p_group_id" "uuid", "p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can pin publications';
  end if;

  -- O gatilho guard_group_pinned_post confere que a publicação é do grupo e
  -- não está removida; a checagem aqui é para devolver erro claro antes dele.
  if not exists (
    select 1
    from public.posts
    where id = p_post_id
      and group_id = p_group_id
      and is_deleted = false
  ) then
    raise exception 'publication is not an active publication of this group';
  end if;

  update public.groups
  set pinned_post_id = p_post_id
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;


ALTER FUNCTION "public"."pin_group_post"("p_group_id" "uuid", "p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profile_affiliations_for"("p_target_user_id" "uuid") RETURNS TABLE("field" "text", "value" "text", "is_visible" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select a.field, a.value, true
  from public.profile_affiliations a
  where a.user_id = p_target_user_id
    -- So o que o dono marcou como visivel. Oculto nao vira linha nula: nao vira
    -- linha nenhuma, e e indistinguivel de "nunca declarado" (ver o pgTAP).
    and a.is_visible
    -- Quem pergunta precisa ser gente: sem sessao nao ha perfil para ler.
    and (select auth.uid()) is not null
    -- A3: conta suspensa nao le. O veto existia so em WITH CHECK de INSERT, o
    -- que deixava um suspenso com JWT valido (1h) enumerando normalmente.
    and not public.is_account_suspended((select auth.uid()))
    -- A4: titular que pediu exclusao e ainda nao foi purgado nao e exposto. A
    -- policy de profiles ja tinha esta guarda; a de afiliacao nao tinha.
    and not exists (
      select 1
      from public.account_deletion_requests r
      where r.user_id = p_target_user_id
        and r.finalized_at is null
    )
    -- O mesmo alcance de sempre: o proprio dono, ou quem compartilha cidade.
    and (
      p_target_user_id = (select auth.uid())
      or private.shares_locality_with(p_target_user_id)
    );
$$;


ALTER FUNCTION "public"."profile_affiliations_for"("p_target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."profile_affiliations_for"("p_target_user_id" "uuid") IS 'Leitura por alvo das declaracoes VISIVEIS (Forca Armada e OM). Substitui a varredura da tabela: aplica visibilidade por campo, veto de conta suspensa no leitor e guarda de exclusao pendente no alvo.';



CREATE OR REPLACE FUNCTION "public"."profile_events_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "starts_at" timestamp with time zone, "locality_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  return query
  select e.id, e.title, e.starts_at, e.locality_id
  from public.events e
  where e.organizer_id = p_target_user_id
    and e.status = 'upcoming'
    and exists (
      select 1 from public.locality_memberships lm
      where lm.locality_id = e.locality_id
        and lm.user_id = p_viewer_user_id
    )
  order by e.starts_at asc
  limit 20;
end;
$$;


ALTER FUNCTION "public"."profile_events_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profile_is_visible_to_viewer"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  -- Perfil oculto vale para QUALQUER leitor, inclusive o caminho de serviço que
  -- a página usa.
  if private.account_deletion_requested(p_target_user_id) then
    return false;
  end if;

  return exists (
    select 1
    from public.locality_memberships lm_target
    where lm_target.user_id = p_target_user_id
      and exists (
        select 1 from public.locality_memberships lm_viewer
        where lm_viewer.locality_id = lm_target.locality_id
          and lm_viewer.user_id = p_viewer_user_id
      )
  );
end;
$$;


ALTER FUNCTION "public"."profile_is_visible_to_viewer"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profile_posts_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") RETURNS TABLE("id" "uuid", "locality_id" "uuid", "community_id" "uuid", "group_id" "uuid", "post_type" "public"."post_type", "content" "text", "photo_path" "text", "link_url" "text", "poll_options" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> p_viewer_user_id then
    raise exception 'p_viewer_user_id must match the caller for authenticated requests';
  end if;

  return query
  select
    p.id, p.locality_id, p.community_id, p.group_id, p.post_type,
    p.content, p.photo_path, p.link_url, p.poll_options, p.created_at
  from public.posts p
  where p.user_id = p_target_user_id
    and p.is_deleted = false
    -- Sem grupo, a publicação não se mostra no perfil: cidade inteira e vila
    -- deixaram de ser destinos (mesma regra da policy de insert).
    and p.group_id is not null
    and exists (
      select 1 from public.group_memberships gm
      where gm.group_id = p.group_id
        and gm.user_id = p_viewer_user_id
        and gm.status = 'approved'
    )
  order by p.created_at desc
  limit 50;
end;
$$;


ALTER FUNCTION "public"."profile_posts_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."promote_reply_to_guide_entry"("p_reply_id" "uuid", "p_locality_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text", "p_operator_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_entry_id uuid;
  v_request_locality uuid;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can promote replies' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.recommendation_reply_promotions
    where reply_id = p_reply_id
  ) then
    raise exception 'reply already promoted to guide' using errcode = 'P0002';
  end if;

  select r.locality_id into v_request_locality
  from public.recommendation_replies rr
  join public.recommendation_requests r on r.id = rr.request_id
  where rr.id = p_reply_id;

  if v_request_locality is null then
    raise exception 'reply not found' using errcode = 'P0002';
  end if;

  if v_request_locality <> p_locality_id then
    raise exception 'reply locality does not match target guide locality' using errcode = '42501';
  end if;

  insert into public.arrival_guide_entries (
    locality_id, category, name, description, website_url, phone,
    status, source, source_reply_id, reviewed_by, reviewed_at
  ) values (
    p_locality_id, p_category, p_name, p_description, p_website_url, p_phone,
    'approved', 'manual', p_reply_id, p_operator_user_id, now()
  )
  returning id into v_entry_id;

  insert into public.recommendation_reply_promotions (
    reply_id, guide_entry_id, promoted_by
  ) values (
    p_reply_id, v_entry_id, p_operator_user_id
  );

  return v_entry_id;
end;
$$;


ALTER FUNCTION "public"."promote_reply_to_guide_entry"("p_reply_id" "uuid", "p_locality_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text", "p_operator_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_member_entry"("p_user_id" "uuid", "p_locality_id" "uuid", "p_display_name" "text", "p_consent_version" integer, "p_moment" "public"."entry_moment" DEFAULT NULL::"public"."entry_moment", "p_arrival_date" "date" DEFAULT NULL::"date", "p_departure_date" "date" DEFAULT NULL::"date", "p_destination_locality_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- 1. O vínculo. Reuso literal: `provision_member_locality` confere o catálogo,
  --    transforma a corrente em saída e cria a nova corrente.
  perform public.provision_member_locality(p_user_id, p_locality_id);

  -- 2. O perfil, como a rota fazia pelo cliente privilegiado.
  insert into public.profiles (
    user_id, display_name, visibility, consent_version, consented_at
  )
  values (
    p_user_id,
    p_display_name,
    'locality_members'::public.profile_visibility,
    p_consent_version,
    now()
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        visibility = excluded.visibility,
        consent_version = excluded.consent_version,
        consented_at = excluded.consented_at;

  -- 3. O momento declarado. Sem momento (convite familiar), nada é escrito.
  --    O CHECK de coerência e a FK do destino valem aqui dentro: se qualquer um
  --    recusar, a transação inteira volta atrás — inclusive o vínculo e o perfil.
  if p_moment is not null then
    insert into public.member_entry_moments (
      user_id, moment, arrival_date, departure_date, destination_locality_id
    )
    values (
      p_user_id,
      p_moment,
      p_arrival_date,
      p_departure_date,
      p_destination_locality_id
    )
    on conflict (user_id) do update
      set moment = excluded.moment,
          arrival_date = excluded.arrival_date,
          departure_date = excluded.departure_date,
          destination_locality_id = excluded.destination_locality_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."provision_member_entry"("p_user_id" "uuid", "p_locality_id" "uuid", "p_display_name" "text", "p_consent_version" integer, "p_moment" "public"."entry_moment", "p_arrival_date" "date", "p_departure_date" "date", "p_destination_locality_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."provision_member_entry"("p_user_id" "uuid", "p_locality_id" "uuid", "p_display_name" "text", "p_consent_version" integer, "p_moment" "public"."entry_moment", "p_arrival_date" "date", "p_departure_date" "date", "p_destination_locality_id" "uuid") IS 'Provisiona a entrada numa transação: vínculo (provision_member_locality), perfil e momento declarado. service_role apenas; a rota de provisionamento é a chamadora.';



CREATE OR REPLACE FUNCTION "public"."provision_member_locality"("p_user_id" "uuid", "p_locality_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_term_date date := current_date + interval '30 days';
begin
  if not exists (
    select 1 from public.localities where id = p_locality_id
  ) then
    raise exception 'locality not in catalog' using errcode = '23514';
  end if;

  update public.locality_memberships
    set kind = 'leaving', leaving_at = v_term_date, access = 'active'
    where user_id = p_user_id and kind = 'current';

  insert into public.locality_memberships (user_id, locality_id, kind, access)
    values (p_user_id, p_locality_id, 'current', 'active')
    on conflict (user_id, locality_id) do nothing;
end;
$$;


ALTER FUNCTION "public"."provision_member_locality"("p_user_id" "uuid", "p_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_account_contact_data"("p_user_id" "uuid", "p_contact_email" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_email text := nullif(btrim(coalesce(p_contact_email, '')), '');
  v_total integer := 0;
  v_rows integer := 0;
begin
  if p_user_id is null or v_email is null then
    return 0;
  end if;

  delete from public.notification_opt_outs where recipient = v_email;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  delete from public.outbox where recipient = v_email;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  delete from public.waitlist where email = v_email;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  return v_total;
end;
$$;


ALTER FUNCTION "public"."purge_account_contact_data"("p_user_id" "uuid", "p_contact_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."read_provider_invitation"("p_token" "text") RETURNS TABLE("community_id" "uuid", "community_name" "text", "status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select
    c.id,
    c.name,
    case
      when pi.status = 'pending' and pi.expires_at <= now() then 'expired'
      else pi.status::text
    end
  from private.provider_invitations pi
  join public.communities c on c.id = pi.community_id and c.is_deleted = false
  where p_token ~ '^[0-9A-Fa-f]{64}$'
    and pi.token_digest = extensions.digest(decode(lower(p_token), 'hex'), 'sha256');
$_$;


ALTER FUNCTION "public"."read_provider_invitation"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."read_verification_document_path"("p_document_id" "uuid") RETURNS TABLE("document_id" "uuid", "storage_object_path" "text", "mime_type" "text", "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    id,
    storage_object_path,
    mime_type,
    expires_at
  from private.verification_documents
  where id = p_document_id
    and review_status = 'pending'
    and expires_at > now();
$$;


ALTER FUNCTION "public"."read_verification_document_path"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."read_verification_status"("p_user_id" "uuid") RETURNS TABLE("status" "text", "eligibility_class" "text", "checked_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    status::text,
    eligibility_class::text,
    checked_at,
    updated_at
  from private.verification_outcomes
  where user_id = p_user_id;
$$;


ALTER FUNCTION "public"."read_verification_status"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_consent_acceptance"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_consent_version < 1 then
    raise exception 'consent_version must be positive';
  end if;

  if p_code_of_conduct_version < 1 then
    raise exception 'code_of_conduct_version must be positive';
  end if;

  insert into public.consent_acceptances (
    user_id,
    consent_version,
    code_of_conduct_version
  )
  values (
    p_user_id,
    p_consent_version,
    p_code_of_conduct_version
  )
  on conflict (user_id, consent_version, code_of_conduct_version) do nothing;
end;
$$;


ALTER FUNCTION "public"."record_consent_acceptance"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_user_group_interests"("p_user_id" "uuid", "p_locality_id" "uuid", "p_group_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Refuse groups outside the caller's locality. This is the §3.3 / §6.2
  -- boundary: the interest is a locality-scoped concept; persisting an
  -- interest in a group the caller is not a locality member of would
  -- silently leak the suggestion across localities.
  if exists (
    select 1 from unnest(p_group_ids) as g(id)
    where not exists (
      select 1 from public.groups
      where id = g.id and locality_id = p_locality_id
    )
  ) then
    raise exception 'group not in caller locality' using errcode = '42501';
  end if;

  delete from public.user_group_interests where user_id = p_user_id;

  if p_group_ids is null or array_length(p_group_ids, 1) is null then
    return;
  end if;

  insert into public.user_group_interests (user_id, group_id)
  select p_user_id, g.id from unnest(p_group_ids) as g(id);
end;
$$;


ALTER FUNCTION "public"."record_user_group_interests"("p_user_id" "uuid", "p_locality_id" "uuid", "p_group_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_service_request_photo"("p_request_id" "uuid", "p_path" "text", "p_position" integer) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_previous text;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_position is null or p_position < 0 or p_position >= 6 then
    raise exception 'photo position out of range' using errcode = '22023';
  end if;

  if p_path is null
     or p_path = ''
     or left(p_path, char_length(p_request_id::text) + 1) <> p_request_id::text || '/' then
    raise exception 'photo path does not belong to the request' using errcode = '22023';
  end if;

  -- `service_role` não é identidade: a função roda como definer, mas confere o
  -- solicitante real e serializa as chamadas concorrentes na linha do pedido.
  perform 1
     from public.service_requests r
    where r.id = p_request_id
      and r.requester_user_id = v_me
    for update;

  if not found then
    raise exception 'request not found or not owned' using errcode = '42501';
  end if;

  select photo_path into v_previous
    from public.service_request_photos
   where request_id = p_request_id
     and position = p_position
   for update;

  if found then
    update public.service_request_photos
       set photo_path = p_path
     where request_id = p_request_id
       and position = p_position;
  else
    insert into public.service_request_photos (request_id, photo_path, position)
    values (p_request_id, p_path, p_position);
  end if;

  return v_previous;
end;
$$;


ALTER FUNCTION "public"."register_service_request_photo"("p_request_id" "uuid", "p_path" "text", "p_position" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_request public.guide_correction_requests;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can decide guide corrections' using errcode = '42501';
  end if;

  if p_note is null or btrim(p_note) = '' then
    raise exception 'a justification is required to reject' using errcode = '22023';
  end if;

  select * into v_request
  from public.guide_correction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'correction request not found' using errcode = 'P0002';
  end if;

  if v_request.status not in ('received', 'in_review') then
    raise exception 'correction request already decided' using errcode = '55000';
  end if;

  update public.guide_correction_requests
  set status = 'rejected',
      decision_note = p_note,
      decided_by = p_operator_user_id,
      decided_at = now(),
      updated_at = now()
  where id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."reject_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_pending_user"("p_user_id" "uuid", "p_operator_user_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_status private.verification_status;
  v_email text;
begin
  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators can reject admissions' using errcode = '42501';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a rejection requires a reason' using errcode = '22023';
  end if;

  select status into v_status
    from private.verification_outcomes
    where user_id = p_user_id;

  if not found then
    raise exception 'no verification outcome for user' using errcode = '02000';
  end if;

  if v_status = 'verified' then
    raise exception 'user already verified; nothing to reject' using errcode = '22023';
  end if;

  if v_status = 'rejected' then
    raise exception 'user already rejected; nothing to reject' using errcode = '22023';
  end if;

  perform private.upsert_verification_outcome(
    p_user_id,
    'rejected'::private.verification_status
  );

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    p_user_id, p_operator_user_id, 'admission_rejected', 'rejected', 'user', p_user_id
  );

  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is not null and v_email <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email,
      'email',
      'verification_decision',
      jsonb_build_object(
        'user_id', p_user_id,
        'status', 'rejected'
      )
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."reject_pending_user"("p_user_id" "uuid", "p_operator_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_current_user_community_moderator(p_community_id, p_caller_user_id) then
    raise exception 'only moderators can remove members';
  end if;

  delete from public.community_memberships
  where community_id = p_community_id
    and user_id = p_user_id;
end;
$$;


ALTER FUNCTION "public"."remove_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = p_caller_user_id
  ) then
    raise exception 'only the owner can remove moderators';
  end if;

  update public.community_memberships
  set role = 'member'
  where community_id = p_community_id
    and user_id = p_user_id
    and role = 'moderator';
end;
$$;


ALTER FUNCTION "public"."remove_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_moderator(p_group_id) then
    raise exception 'only group moderators can remove co-moderators';
  end if;

  -- Cannot remove the owner.
  if exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = p_user_id
      and role = 'owner'
  ) then
    raise exception 'cannot demote the group owner';
  end if;

  update public.group_memberships
  set role = 'member'
  where group_id = p_group_id
    and user_id = p_user_id
    and role = 'moderator';

  if not found then
    raise exception 'user is not a moderator of this group';
  end if;
end;
$$;


ALTER FUNCTION "public"."remove_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reopen_recommendation"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.recommendation_requests
  set is_resolved = false,
      resolved_at = null,
      resolved_by = null,
      resolved_reply_id = null
  where id = p_request_id
    and author_id = v_uid;

  if not found then
    raise exception 'request not found or you are not the author' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."reopen_recommendation"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_listing_photo"("p_listing_id" "uuid", "p_path" "text", "p_position" integer DEFAULT 0) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_previous text[];
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_position is null or p_position < 0 or p_position >= 12 then
    raise exception 'photo position out of range' using errcode = '22023';
  end if;

  if p_path is null
     or p_path = ''
     or left(p_path, char_length(p_listing_id::text) + 1) <> p_listing_id::text || '/' then
    raise exception 'photo path does not belong to the listing' using errcode = '22023';
  end if;

  -- A linha do anúncio é o lock da troca: duas substituições concorrentes se
  -- serializam, e o `FOR UPDATE` também reconfere a posse que a policy exigia.
  perform 1
     from public.listings l
    where l.id = p_listing_id
      and l.owner_user_id = v_me
    for update;

  if not found then
    raise exception 'listing not found or not owned' using errcode = '42501';
  end if;

  with deleted as (
    delete from public.listing_photos
     where listing_id = p_listing_id
    returning path
  )
  select coalesce(array_agg(path), '{}'::text[]) into v_previous
    from deleted;

  insert into public.listing_photos (listing_id, path, position)
  values (p_listing_id, p_path, p_position);

  return v_previous;
end;
$$;


ALTER FUNCTION "public"."replace_listing_photo"("p_listing_id" "uuid", "p_path" "text", "p_position" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") RETURNS TABLE("document_id" "uuid", "replaced_storage_object_path" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_document_id uuid;
  v_replaced_path text;
  v_status private.verification_status;
begin
  if p_storage_object_path is null or btrim(p_storage_object_path) = '' then
    raise exception 'storage_object_path is required';
  end if;

  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'unsupported document mime type';
  end if;

  -- Trava consultiva por pessoa: a primeira instrução que toca o banco.
  --
  -- Ela põe as trocas da MESMA pessoa em fila. Sem ela, a segunda troca
  -- esperava a linha do documento antigo, que a primeira já tinha apagado, e
  -- logo depois pedia a linha do resultado — enquanto o operador segurava a
  -- linha do documento novo e esperava a do resultado. As duas transações
  -- ficavam esperando uma pela outra (40P01). Com a trava aqui, a segunda troca
  -- espera o commit da primeira sem segurar linha nenhuma, encontra o documento
  -- NOVO pendente e segue a mesma ordem da decisão: documento, depois resultado.
  --
  -- A chave (`verification_document:<uuid>`) é por pessoa, então trocas de
  -- pessoas diferentes continuam em paralelo. A trava é de transação e sai no
  -- commit/rollback; nada de estado é lido antes dela.
  perform pg_advisory_xact_lock(
    hashtextextended('verification_document:' || p_user_id::text, 0)
  );

  -- Serialização com a decisão do operador.
  --
  -- decide_verification_document (20260821000040, revisada em 20260922153901)
  -- trava primeiro a linha do documento pendente e grava `verified` em
  -- private.verification_outcomes na mesma transação, pelo upsert de
  -- private.upsert_verification_outcome. As duas transações tomam as travas na
  -- MESMA ordem — documento, depois resultado — e nenhuma decisão de estado é
  -- lida antes da trava do resultado, que é o ponto de serialização.
  --
  -- A ordem importa: travar o resultado primeiro (o caminho natural, já que é
  -- a linha da decisão) fecha um deadlock (40P01) com o operador, que segura a
  -- linha do documento enquanto espera a do resultado. A ordem adotada não tem
  -- ciclo: quem chega depois encontra o estado já commitado. A trava consultiva
  -- acima é anterior às duas e não cria ciclo com a decisão, que não a toma.
  perform 1
    from private.verification_documents d
   where d.user_id = p_user_id
     and d.review_status = 'pending'
   for update;

  -- A linha do resultado pode não existir (primeiro envio, sem documento em
  -- análise). O insert garante uma linha para travar, com o mesmo `pending` que
  -- esta função gravaria no fim; `do nothing` preserva a decisão já existente.
  insert into private.verification_outcomes (user_id, status)
  values (p_user_id, 'pending')
  on conflict (user_id) do nothing;

  select o.status into v_status
    from private.verification_outcomes o
   where o.user_id = p_user_id
   for update;

  if v_status = 'verified' then
    raise exception 'user is already verified';
  end if;

  -- O arquivo anterior ainda não recebeu decisão: a linha sai e o caminho
  -- entra na fila de remoção na MESMA transação. Antes, quem enfileirava era a
  -- action, depois de duas tentativas de `storage.remove`; se o processo
  -- morresse entre o commit da troca e o enqueue, o caminho não ficava nem em
  -- linha nem em fila. A action continua apagando o objeto na hora e, quando o
  -- `storage.remove` funciona, apaga a linha da fila por
  -- complete_verification_document_removal; se a remoção falha, a linha
  -- simplesmente fica para o processador da fila (VERIF-REMOVAL-WORKER). Sem
  -- pendente (a análise já terminou ou nunca começou), a função só registra o
  -- arquivo novo.
  delete from private.verification_documents d
   where d.user_id = p_user_id
     and d.review_status = 'pending'
  returning d.storage_object_path into v_replaced_path;

  if v_replaced_path is not null then
    insert into private.verification_document_removals (storage_object_path)
    values (v_replaced_path)
    on conflict (storage_object_path) do nothing;
  end if;

  insert into private.verification_documents (
    user_id,
    storage_object_path,
    mime_type,
    expires_at
  )
  values (
    p_user_id,
    p_storage_object_path,
    p_mime_type,
    now() + interval '7 days'
  )
  returning id into v_document_id;

  perform private.upsert_verification_outcome(p_user_id, 'pending');

  return query select v_document_id, v_replaced_path;
end;
$$;


ALTER FUNCTION "public"."replace_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_account_deletion"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user uuid := (select auth.uid());
  v_requested_at timestamptz;
  v_due_at timestamptz;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  -- Idempotente: repetir o pedido não estende o prazo nem duplica efeito.
  insert into public.account_deletion_requests (user_id, due_at)
  values (v_user, now() + private.account_deletion_window())
  on conflict (user_id) do nothing;

  select requested_at, due_at into v_requested_at, v_due_at
  from public.account_deletion_requests
  where user_id = v_user;

  -- 1. Moderação anonimizada já (tabela aprovada: "anonimização imediata").
  update public.reports set reporter_user_id = null where reporter_user_id = v_user;

  -- 2. Família: o vínculo é encerrado, o outro lado permanece intacto.
  delete from private.family_account_links
  where holder_user_id = v_user or family_user_id = v_user;

  update private.family_invitations
     set status = 'revoked'
   where inviter_user_id = v_user
     and status = 'pending';

  -- 3. Sessão revogada e login bloqueado (as duas medições do cabeçalho).
  delete from auth.sessions where user_id = v_user;
  update auth.users
     set banned_until = now() + interval '100 years'
   where id = v_user;

  return jsonb_build_object('requested_at', v_requested_at, 'due_at', v_due_at);
end;
$$;


ALTER FUNCTION "public"."request_account_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_community_membership"("p_community_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_locality_id uuid;
  v_reason text;
  v_inserted boolean;
begin
  select locality_id into v_locality_id
  from public.communities
  where id = p_community_id and is_deleted = false;

  if v_locality_id is null then
    raise exception 'community not found';
  end if;

  if not private.is_locality_member(v_locality_id) then
    raise exception 'not a member of this locality';
  end if;

  insert into public.community_memberships (community_id, user_id, role, status)
  values (p_community_id, (select auth.uid()), 'member', 'pending')
  on conflict (community_id, user_id) do nothing;

  -- Pedido já existente não tem o motivo reescrito: o texto pertence ao pedido
  -- que foi feito, e uma segunda chamada não é uma segunda candidatura.
  v_inserted := found;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_inserted and v_reason is not null then
    insert into public.community_join_reasons (community_id, user_id, reason)
    values (p_community_id, (select auth.uid()), left(v_reason, 500))
    on conflict (community_id, user_id) do nothing;
  end if;
end;
$$;


ALTER FUNCTION "public"."request_community_membership"("p_community_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  return private.resend_family_invitation(
    p_invitation_id,
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest
  );
end;
$$;


ALTER FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.resend_family_invitation(
    p_invitation_id,
    p_inviter_user_id,
    p_token_digest,
    p_invitee_email_digest,
    p_code_hash
  );
$$;


ALTER FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_report"("p_report_id" "uuid", "p_operator_user_id" "uuid", "p_action" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_report public.reports;
begin
  if p_action not in ('hide', 'dismiss') then
    raise exception 'action must be hide or dismiss' using errcode = '22023';
  end if;

  if not public.is_current_user_operator(p_operator_user_id) then
    raise exception 'only operators resolve reports' using errcode = '42501';
  end if;

  select * into v_report
    from public.reports
   where id = p_report_id and status = 'open'
     for update;

  if not found then
    raise exception 'report not found or already resolved' using errcode = 'P0002';
  end if;

  if p_action = 'hide' then
    case v_report.target_type
      when 'post' then
        update public.posts set is_deleted = true where id = v_report.target_id;
      when 'comment' then
        update public.comments set is_deleted = true where id = v_report.target_id;
      when 'group' then
        update public.groups set is_deleted = true where id = v_report.target_id;
      when 'message' then
        update public.dm_messages set is_deleted = true where id = v_report.target_id;
      when 'recommendation_request' then
        update public.recommendation_requests set is_deleted = true where id = v_report.target_id;
      when 'recommendation_reply' then
        update public.recommendation_replies set is_deleted = true where id = v_report.target_id;
      when 'provider_profile' then
        update public.provider_profiles set is_deleted = true where id = v_report.target_id;
      else
        raise exception 'unknown target type: %', v_report.target_type using errcode = '22023';
    end case;
  end if;

  update public.reports
     set status = 'resolved',
         operator_note = coalesce(p_note, p_action),
         resolved_by = p_operator_user_id,
         resolved_at = now()
   where id = p_report_id;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_report.reporter_user_id, p_operator_user_id, 'report_resolved',
    'resolved', 'report', p_report_id
  );
end;
$$;


ALTER FUNCTION "public"."resolve_report"("p_report_id" "uuid", "p_operator_user_id" "uuid", "p_action" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_locality_transfer"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1
    from public.locality_memberships
    where user_id = p_user_id and kind = 'leaving'
  ) then
    raise exception 'no leaving row to reverse' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.locality_memberships
    where user_id = p_user_id and kind = 'current'
  ) then
    raise exception 'no current row to reverse' using errcode = '23514';
  end if;

  delete from public.locality_memberships
    where user_id = p_user_id and kind = 'current';

  update public.locality_memberships
    set kind = 'current', leaving_at = null, access = 'active'
    where user_id = p_user_id and kind = 'leaving';
end;
$$;


ALTER FUNCTION "public"."reverse_locality_transfer"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_community_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.community_invitations
    set status = 'revoked'
  where id = p_invitation_id
    and inviter_user_id = p_inviter_user_id
    and status = 'pending';

  if not found then
    raise exception 'invitation not found or not revocable' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."revoke_community_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.revoke_family_invitation(
    p_invitation_id,
    p_inviter_user_id
  );
$$;


ALTER FUNCTION "public"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_provider_account"("p_provider_user_id" "uuid", "p_owner_user_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a revogação exige motivo' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.provider_accounts pa
      join public.communities c on c.id = pa.community_id
     where pa.auth_user_id = p_provider_user_id
       and pa.revoked_at is null
       and c.owner_user_id = p_owner_user_id
       and c.is_deleted = false
  ) then
    raise exception 'only the community owner revokes' using errcode = '42501';
  end if;

  update public.provider_accounts
     set revoked_at = now(), revoked_by = p_owner_user_id
   where auth_user_id = p_provider_user_id;

  update public.provider_reach r
     set active = false
    from public.provider_profiles p
   where p.id = r.provider_id
     and p.owner_user_id = p_provider_user_id;
end;
$$;


ALTER FUNCTION "public"."revoke_provider_account"("p_provider_user_id" "uuid", "p_owner_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_neighborhoods"("p_locality_id" "uuid", "p_query" "text" DEFAULT ''::"text") RETURNS TABLE("id" "uuid", "name" "text", "zone" "text", "center_lat" numeric, "center_lng" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  with term as (
    select coalesce(private.neighborhood_name_key(p_query), '') as value
  )
  select n.id, n.name, n.zone, n.center_lat, n.center_lng
  from public.neighborhoods n
  cross join term t
  where n.locality_id = p_locality_id
    and (t.value = '' or n.name_key like '%' || t.value || '%')
  order by
    case
      when t.value = '' then 0
      when n.name_key like t.value || '%' then 0
      else 1
    end,
    n.name_key
  limit 6;
$$;


ALTER FUNCTION "public"."search_neighborhoods"("p_locality_id" "uuid", "p_query" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_neighborhoods"("p_locality_id" "uuid", "p_query" "text") IS 'Busca de bairros da cidade por nome, sem acento. Até 6, prefixo primeiro, ordem alfabética por name_key.';



CREATE OR REPLACE FUNCTION "public"."search_providers"("p_category" "public"."provider_category" DEFAULT NULL::"public"."provider_category", "p_community_id" "uuid" DEFAULT NULL::"uuid", "p_query" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "display_name" "text", "category" "public"."provider_category", "bio" "text", "reach_source" "public"."provider_reach_source")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  -- D29 e §7.2: a ordenação NUNCA olha para r.source. Relevância e nada mais;
  -- com consulta vazia a similaridade empata e o desempate é alfabético.
  order by p.id, extensions.similarity(p.display_name, coalesce(p_query, '')) desc,
           p.display_name asc;
$$;


ALTER FUNCTION "public"."search_providers"("p_category" "public"."provider_category", "p_community_id" "uuid", "p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_conversation_message"("p_conversation_id" "uuid", "p_content" "text", "p_client_key" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_content text := btrim(coalesce(p_content, ''));
  v_key text := nullif(btrim(coalesce(p_client_key, '')), '');
  v_conv public.dm_conversations%rowtype;
  v_msg public.dm_messages%rowtype;
  v_other uuid;
  v_status public.service_request_status;
  v_provider uuid;
  v_request_id uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_content = '' then
    raise exception 'message required' using errcode = '22023';
  end if;
  if char_length(v_content) > 2000 then
    raise exception 'message too long' using errcode = '22023';
  end if;

  select * into v_conv from public.dm_conversations where id = p_conversation_id;
  if not found then
    raise exception 'conversation not found' using errcode = '42501';
  end if;
  if v_me <> v_conv.participant_a and v_me <> v_conv.participant_b then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  if private.account_deletion_requested(v_me) then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  v_other := case
    when v_conv.participant_a = v_me then v_conv.participant_b
    else v_conv.participant_a
  end;
  if private.account_deletion_requested(v_other) then
    raise exception 'recipient unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.dm_blocks b
     where (b.blocker_user_id = v_conv.participant_a
            and b.blocked_user_id = v_conv.participant_b)
        or (b.blocker_user_id = v_conv.participant_b
            and b.blocked_user_id = v_conv.participant_a)
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  -- Reenvio repetido devolve a linha ja gravada em vez de criar outra.
  if v_key is not null then
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    if found then
      return to_jsonb(v_msg);
    end if;
  end if;

  insert into public.dm_messages (conversation_id, sender_id, content, client_key)
  values (p_conversation_id, v_me, v_content, v_key)
  on conflict (conversation_id, sender_id, client_key) where client_key is not null
  do nothing
  returning * into v_msg;

  if v_msg.id is null then
    -- Corrida: outra transacao gravou a mesma chave primeiro.
    select * into v_msg
      from public.dm_messages
     where conversation_id = p_conversation_id
       and sender_id = v_me
       and client_key = v_key;
    return to_jsonb(v_msg);
  end if;

  -- A situacao muda na PRIMEIRA resposta do PRESTADOR, na mesma transacao em
  -- que a mensagem e gravada. Depois disso a coluna permanece. Enquanto o
  -- pedido nao esta encerrado, a mensagem tambem move a "ultima atualizacao"
  -- que a lista mostra.
  -- ADR-20260922-conversa-por-pedido: conversa nova tem UM pedido. Nos pedidos
  -- antigos, que dividem a conversa do par, a escolha deixa de ser qualquer uma:
  -- vale o pedido aberto mais recente, e depois o mais recente ainda ativo.
  select r.id, r.status, r.provider_user_id
    into v_request_id, v_status, v_provider
    from public.service_requests r
   where r.conversation_id = p_conversation_id
   order by (r.status = 'open') desc, r.created_at desc
   limit 1
   for update;
  if found then
    if v_status = 'open' and v_me = v_provider then
      update public.service_requests
         set status = 'in_conversation'
       where id = v_request_id;

      -- ADR-20260922-aviso-da-primeira-resposta: a primeira resposta do
      -- prestador avisa QUEM PEDIU, uma unica vez, na mesma transacao da
      -- transicao. Sem texto da mensagem e com ator nulo (o prestador nao tem
      -- perfil de membro); o nome exibido vem da ficha, pelo pedido. Honra
      -- notification_preferences.messages, como os avisos de mensagem.
      insert into public.notifications
        (recipient_user_id, actor_user_id, type, action, target_type, target_id)
      select r.requester_user_id, null, 'service_request', 'provider_first_reply',
             'service_request', r.id
        from public.service_requests r
       where r.id = v_request_id
         and coalesce(
           (select np.messages from public.notification_preferences np
             where np.user_id = r.requester_user_id),
           true
         );
    elsif v_status <> 'closed' and v_status <> 'cancelled' then
      update public.service_requests
         set updated_at = now()
       where id = v_request_id;
    end if;
  end if;

  return to_jsonb(v_msg);
end;
$$;


ALTER FUNCTION "public"."send_conversation_message"("p_conversation_id" "uuid", "p_content" "text", "p_client_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_community_image"("p_community_id" "uuid", "p_kind" "text", "p_path" "text", "p_caller_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_community_id text := p_community_id::text;
begin
  if p_kind not in ('banner', 'thumbnail') then
    raise exception 'invalid community image kind' using errcode = '22023';
  end if;

  -- O caminho tem que viver na pasta da própria comunidade: um dono não escreve
  -- ponteiro para objeto de outra.
  if p_path is not null and split_part(p_path, '/', 1) <> v_community_id then
    raise exception 'image path must live under the community folder' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.communities
    where id = p_community_id
      and owner_user_id = p_caller_user_id
      and is_deleted = false
  ) then
    raise exception 'not allowed to change this community image' using errcode = '42501';
  end if;

  if p_kind = 'banner' then
    update public.communities set banner_path = p_path where id = p_community_id;
  else
    update public.communities set thumbnail_path = p_path where id = p_community_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."set_community_image"("p_community_id" "uuid", "p_kind" "text", "p_path" "text", "p_caller_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_group_notify_level"("p_group_id" "uuid", "p_level" "public"."group_notify_level") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.group_memberships
  set notify_level = p_level
  where group_id = p_group_id
    and user_id = (select auth.uid())
    and status = 'approved';

  if not found then
    raise exception 'only approved members can set their notification level';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_group_notify_level"("p_group_id" "uuid", "p_level" "public"."group_notify_level") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_group_rules"("p_group_id" "uuid", "p_rules" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can change the rules';
  end if;

  update public.groups
  set rules = nullif(btrim(coalesce(p_rules, '')), '')
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_group_rules"("p_group_id" "uuid", "p_rules" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profile_bio"("p_bio" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_updated integer;
begin
  update public.profiles
     set bio = nullif(btrim(coalesce(p_bio, '')), '')
   where user_id = (select auth.uid());

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'profile not found for session user' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_profile_bio"("p_bio" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."settle_account_possessions"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_successor uuid;
  v_operations uuid;
  v_community uuid;
  v_group uuid;
begin
  select o.auth_user_id
    into v_operations
    from public.operators o
   where o.revoked_at is null
   order by o.granted_at
   limit 1;

  for v_community in
    select c.id
      from public.communities c
     where c.owner_user_id = p_user_id
       and c.is_deleted = false
  loop
    select m.user_id
      into v_successor
      from public.community_memberships m
     where m.community_id = v_community
       and m.role = 'moderator'
       and m.status = 'approved'
       and m.user_id <> p_user_id
     order by m.joined_at
     limit 1;

    update public.communities
       set owner_user_id = coalesce(v_successor, v_operations, p_user_id)
     where id = v_community;

    v_successor := null;
  end loop;

  for v_group in
    select g.id from public.groups g where g.owner_user_id = p_user_id
  loop
    select m.user_id
      into v_successor
      from public.group_memberships m
     where m.group_id = v_group
       and m.role = 'moderator'
       and m.status = 'approved'
       and m.user_id <> p_user_id
     order by m.joined_at
     limit 1;

    update public.groups
       set owner_user_id = coalesce(v_successor, v_operations, p_user_id)
     where id = v_group;

    v_successor := null;
  end loop;

  perform set_config('bivaque.listing_transition', 'on', true);
  update public.listings
     set status = 'closed',
         closed_at = now(),
         updated_at = now()
   where owner_user_id = p_user_id
     and status <> 'closed';
  perform set_config('bivaque.listing_transition', '', true);

  update public.provider_accounts
     set revoked_at = now(),
         revoked_by = null
   where auth_user_id = p_user_id
     and revoked_at is null;

  -- 4. Pedidos de servico abertos: cancelam, e a OUTRA PONTA e avisada.
  --
  -- A notificacao nasce das linhas realmente canceladas (CTE), nao de uma
  -- segunda varredura: se nada casar, ninguem e avisado. O destinatario e quem
  -- NAO foi purgado. O CASE cobre as duas posicoes: pedinte e prestador.
  with cancelados as (
    update public.service_requests
       set status = 'cancelled',
           updated_at = now()
     where (requester_user_id = p_user_id or provider_user_id = p_user_id)
       and status in ('open', 'in_conversation')
    returning id, requester_user_id, provider_user_id
  )
  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  )
  select
    case
      when c.requester_user_id = p_user_id then c.provider_user_id
      else c.requester_user_id
    end,
    null,
    'service_request',
    'cancelled_counterpart_left',
    'service_request',
    c.id
  from cancelados c;
end;
$$;


ALTER FUNCTION "public"."settle_account_possessions"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."settle_account_possessions"("p_user_id" "uuid") IS 'Aplica as tres regras de posse da purga (decisoes de 18/09/2026): comunidade e grupo passam a moderador ou a operacao; vitrine e anuncios encerram; pedidos de servico abertos cancelam, com aviso neutro a outra ponta (tipo service_request). Chamada pela rota de purga ANTES do soft delete da credencial.';



CREATE OR REPLACE FUNCTION "public"."submit_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_document_id uuid;
begin
  if p_storage_object_path is null or btrim(p_storage_object_path) = '' then
    raise exception 'storage_object_path is required';
  end if;

  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'unsupported document mime type';
  end if;

  if exists (
    select 1
    from private.verification_outcomes
    where user_id = p_user_id
      and status = 'verified'
  ) then
    raise exception 'user is already verified';
  end if;

  insert into private.verification_documents (
    user_id,
    storage_object_path,
    mime_type,
    expires_at
  )
  values (
    p_user_id,
    p_storage_object_path,
    p_mime_type,
    now() + interval '7 days'
  )
  returning id into v_document_id;

  perform private.upsert_verification_outcome(p_user_id, 'pending');

  return v_document_id;
end;
$$;


ALTER FUNCTION "public"."submit_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suggest_groups_for_user"("p_user_id" "uuid", "p_locality_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "visibility" "public"."group_visibility")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select g.id, g.name, g.description, g.visibility
  from public.groups g
  where g.locality_id = p_locality_id
    and (
      g.visibility = 'public'
      or exists (
        select 1 from public.group_memberships gm
        where gm.group_id = g.id
          and gm.user_id = p_user_id
          and gm.status = 'approved'
      )
    )
    and not exists (
      select 1 from public.user_group_interests ugi
      where ugi.group_id = g.id and ugi.user_id = p_user_id
    )
    and not exists (
      select 1 from public.group_memberships gm
      where gm.group_id = g.id
        and gm.user_id = p_user_id
        and gm.status = 'approved'
    )
  order by g.name;
$$;


ALTER FUNCTION "public"."suggest_groups_for_user"("p_user_id" "uuid", "p_locality_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suggest_guide_entry"("p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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
$_$;


ALTER FUNCTION "public"."suggest_guide_entry"("p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_community_ownership"("p_community_id" "uuid", "p_new_owner_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1 from public.communities
    where id = p_community_id and owner_user_id = (select auth.uid())
  ) then
    raise exception 'only the owner can transfer ownership';
  end if;

  if not exists (
    select 1 from public.community_memberships
    where community_id = p_community_id
      and user_id = p_new_owner_user_id
      and status = 'approved'
  ) then
    raise exception 'new owner must be an approved member';
  end if;

  update public.communities
  set owner_user_id = p_new_owner_user_id
  where id = p_community_id;

  update public.community_memberships
  set role = 'moderator'
  where community_id = p_community_id
    and user_id = (select auth.uid());

  update public.community_memberships
  set role = 'owner'
  where community_id = p_community_id
    and user_id = p_new_owner_user_id;
end;
$$;


ALTER FUNCTION "public"."transfer_community_ownership"("p_community_id" "uuid", "p_new_owner_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_group_ownership"("p_group_id" "uuid", "p_new_owner_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can transfer ownership';
  end if;

  if not exists (
    select 1
    from public.group_memberships
    where group_id = p_group_id
      and user_id = p_new_owner_user_id
      and status = 'approved'
  ) then
    raise exception 'new owner must be an approved member of this group';
  end if;

  -- Demote current owner to moderator.
  update public.group_memberships
  set role = 'moderator'
  where group_id = p_group_id
    and user_id = (select auth.uid());

  -- Promote new owner.
  update public.group_memberships
  set role = 'owner'
  where group_id = p_group_id
    and user_id = p_new_owner_user_id;

  -- Update the owner_user_id column on the group.
  update public.groups
  set owner_user_id = p_new_owner_user_id
  where id = p_group_id;
end;
$$;


ALTER FUNCTION "public"."transfer_group_ownership"("p_group_id" "uuid", "p_new_owner_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_listing"("p_listing_id" "uuid", "p_action" "text") RETURNS "public"."listing_status"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_listing public.listings;
  v_target public.listing_status;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
    into v_listing
    from public.listings
   where id = p_listing_id
     for update;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_listing.owner_user_id <> v_uid then
    raise exception 'only the listing owner can change its status' using errcode = '42501';
  end if;

  v_target := case p_action
    when 'publish' then 'active'::public.listing_status
    when 'pause' then 'paused'::public.listing_status
    when 'reactivate' then 'active'::public.listing_status
    when 'reserve' then 'reserved'::public.listing_status
    when 'sell' then 'sold'::public.listing_status
    when 'close' then 'closed'::public.listing_status
    else null
  end;

  if v_target is null then
    raise exception 'unknown listing action: %', p_action using errcode = '22023';
  end if;

  if v_target = 'sold' and v_listing.kind <> 'item' then
    raise exception 'only an item can be marked sold' using errcode = '22023';
  end if;

  -- idempotente: já está no destino, nada muda e nada novo é auditado.
  if v_listing.status = v_target then
    return v_listing.status;
  end if;

  if not (
    (v_listing.status = 'draft' and v_target = 'active')
    or (v_listing.status = 'active' and v_target in ('paused', 'reserved', 'sold', 'closed'))
    or (v_listing.status = 'paused' and v_target in ('active', 'closed'))
    or (v_listing.status = 'reserved' and v_target in ('active', 'sold', 'closed'))
    or (v_listing.status = 'sold' and v_target in ('active', 'closed'))
  ) then
    raise exception 'cannot move listing from % to %', v_listing.status, v_target
      using errcode = '22023';
  end if;

  -- Tornar o anuncio visivel exige que o dono alcance o publico escolhido.
  if v_target = 'active' then
    if v_listing.locality_id is not null
       and not private.is_locality_member(v_listing.locality_id) then
      raise exception 'listing audience requires locality membership' using errcode = '42501';
    end if;

    if v_listing.community_id is not null
       and not private.is_community_member(v_listing.community_id) then
      raise exception 'listing audience requires community membership' using errcode = '42501';
    end if;
  end if;

  perform set_config('bivaque.listing_transition', 'on', true);

  update public.listings
     set status = v_target,
         published_at = case
           when v_target = 'active' and published_at is null then now()
           else published_at
         end
   where id = p_listing_id;

  perform set_config('bivaque.listing_transition', '', true);

  insert into public.listing_status_events (listing_id, actor_id, from_status, to_status)
  values (p_listing_id, v_uid, v_listing.status, v_target);

  return v_target;
end;
$$;


ALTER FUNCTION "public"."transition_listing"("p_listing_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unpin_group_post"("p_group_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_group_owner(p_group_id) then
    raise exception 'only the group owner can unpin publications';
  end if;

  update public.groups
  set pinned_post_id = null
  where id = p_group_id;

  if not found then
    raise exception 'group not found';
  end if;
end;
$$;


ALTER FUNCTION "public"."unpin_group_post"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_member_business_page"("p_provider_id" "uuid", "p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.provider_accounts pa where pa.auth_user_id = v_user_id
  ) or not public.can_manage_provider_profile(p_provider_id) then
    raise exception 'only the active member owner may update this page'
      using errcode = '42501';
  end if;

  perform 1
    from public.locality_memberships lm
   where lm.user_id = v_user_id
     and lm.kind = 'current'
     and lm.access = 'active'
   for update;
  if not found then
    raise exception 'an active current locality membership is required'
      using errcode = '42501';
  end if;

  if p_display_name is null
     or char_length(btrim(p_display_name)) not between 2 and 80
     or p_category is null
     or (p_bio is not null and char_length(btrim(p_bio)) not between 1 and 800)
  then
    raise exception 'invalid business profile fields' using errcode = '22023';
  end if;

  update public.provider_profiles
     set display_name = btrim(p_display_name),
         category = p_category,
         bio = nullif(btrim(p_bio), '')
   where id = p_provider_id
     and owner_user_id = v_user_id;

  if not found then
    raise exception 'business page not found' using errcode = '42501';
  end if;
end;
$$;


ALTER FUNCTION "public"."update_member_business_page"("p_provider_id" "uuid", "p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_service_request"("p_request_id" "uuid", "p_description" "text", "p_when_text" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_me uuid := (select auth.uid());
  v_desc text := btrim(coalesce(p_description, ''));
  v_when text := nullif(btrim(coalesce(p_when_text, '')), '');
  v_req public.service_requests%rowtype;
begin
  if v_me is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_desc = '' then
    raise exception 'description required' using errcode = '22023';
  end if;
  if char_length(v_desc) > 500 then
    raise exception 'description too long' using errcode = '22023';
  end if;
  if v_when is not null and char_length(v_when) > 120 then
    raise exception 'when too long' using errcode = '22023';
  end if;

  select * into v_req
    from public.service_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'request not found' using errcode = '42501';
  end if;

  -- Só o solicitante edita, e não depois de encerrado/cancelado. O
  -- destinatario NÃO é parâmetro: permanece fixo na criação.
  if v_req.requester_user_id <> v_me then
    raise exception 'only the requester can edit' using errcode = '42501';
  end if;
  if v_req.status in ('closed', 'cancelled') then
    raise exception 'request not editable' using errcode = '42501';
  end if;

  update public.service_requests
     set description = v_desc,
         when_text = v_when
   where id = p_request_id
   returning * into v_req;

  return to_jsonb(v_req);
end;
$$;


ALTER FUNCTION "public"."update_service_request"("p_request_id" "uuid", "p_description" "text", "p_when_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "text", "p_eligibility_class" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform private.upsert_verification_outcome(
    p_user_id,
    p_status::private.verification_status,
    case when p_eligibility_class is null then null
         else p_eligibility_class::private.eligibility_class
    end
  );
end;
$$;


ALTER FUNCTION "public"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "text", "p_eligibility_class" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verification_reconcile_step"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_status private.verification_status;
  v_reconcile_attempts integer;
  v_email text;
begin
  select status, reconcile_attempts
  into v_status, v_reconcile_attempts
  from private.verification_outcomes
  where user_id = p_user_id;

  if not found then
    return 'resolved';
  end if;

  if v_status not in ('pending', 'temporary_error') then
    return 'resolved';
  end if;

  if v_reconcile_attempts < private.verification_max_reconcile_attempts() then
    return 'deferred';
  end if;

  update private.verification_outcomes
  set status = 'rejected',
      updated_at = now()
  where user_id = p_user_id;

  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is not null and v_email <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email,
      'email',
      'verification_resolved',
      jsonb_build_object(
        'user_id', p_user_id,
        'status', 'rejected',
        'reason', 'reconcile_capped'
      )
    );
  end if;

  return 'rejected';
end;
$$;


ALTER FUNCTION "public"."verification_reconcile_step"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."allow_only_operation"("expected_operation" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION "storage"."allow_only_operation"("expected_operation" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";


CREATE TEXT SEARCH CONFIGURATION "public"."bivaque_pt" (
    PARSER = "pg_catalog"."default" );

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "asciiword" WITH "portuguese_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "word" WITH "extensions"."unaccent", "portuguese_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "numword" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "email" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "url" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "host" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "sfloat" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "version" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "hword_numpart" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "hword_part" WITH "extensions"."unaccent", "portuguese_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "hword_asciipart" WITH "portuguese_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "numhword" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "asciihword" WITH "portuguese_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "hword" WITH "extensions"."unaccent", "portuguese_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "url_path" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "file" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "float" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "int" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt"
    ADD MAPPING FOR "uint" WITH "simple";


ALTER TEXT SEARCH CONFIGURATION "public"."bivaque_pt" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."family_account_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invitation_id" "uuid" NOT NULL,
    "holder_user_id" "uuid" NOT NULL,
    "family_user_id" "uuid" NOT NULL,
    "linked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "family_account_links_check" CHECK (("holder_user_id" <> "family_user_id"))
);

ALTER TABLE ONLY "private"."family_account_links" FORCE ROW LEVEL SECURITY;


ALTER TABLE "private"."family_account_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."family_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inviter_user_id" "uuid" NOT NULL,
    "token_digest" "bytea" NOT NULL,
    "invitee_email_digest" "bytea" NOT NULL,
    "status" "private"."family_invitation_status" DEFAULT 'pending'::"private"."family_invitation_status" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_by_user_id" "uuid",
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invitee_email_hint" "text",
    "code_hash" "bytea",
    CONSTRAINT "family_invitations_check" CHECK (((("status" = 'accepted'::"private"."family_invitation_status") AND ("accepted_by_user_id" IS NOT NULL) AND ("accepted_at" IS NOT NULL)) OR (("status" <> 'accepted'::"private"."family_invitation_status") AND ("accepted_by_user_id" IS NULL) AND ("accepted_at" IS NULL)))),
    CONSTRAINT "family_invitations_check1" CHECK ((("accepted_by_user_id" IS NULL) OR ("accepted_by_user_id" <> "inviter_user_id"))),
    CONSTRAINT "family_invitations_code_hash_check" CHECK ((("code_hash" IS NULL) OR ("octet_length"("code_hash") = 32))),
    CONSTRAINT "family_invitations_invitee_email_digest_check" CHECK (("octet_length"("invitee_email_digest") = 32)),
    CONSTRAINT "family_invitations_invitee_email_hint_check" CHECK ((("invitee_email_hint" IS NULL) OR ("invitee_email_hint" ~ '^[^@\s]{1,2}\*{3}@[^@\s]{1,2}\*{3}\.[a-z]{2,}$'::"text"))),
    CONSTRAINT "family_invitations_token_digest_check" CHECK (("octet_length"("token_digest") = 32))
);

ALTER TABLE ONLY "private"."family_invitations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "private"."family_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."family_invite_code_attempts" (
    "id" bigint NOT NULL,
    "origin_digest" "bytea" NOT NULL,
    "email_digest" "bytea",
    "code_hash" "bytea" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "family_invite_code_attempts_code_hash_check" CHECK (("octet_length"("code_hash") = 32)),
    CONSTRAINT "family_invite_code_attempts_email_digest_check" CHECK ((("email_digest" IS NULL) OR ("octet_length"("email_digest") = 32))),
    CONSTRAINT "family_invite_code_attempts_origin_digest_check" CHECK (("octet_length"("origin_digest") = 32))
);

ALTER TABLE ONLY "private"."family_invite_code_attempts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "private"."family_invite_code_attempts" OWNER TO "postgres";


ALTER TABLE "private"."family_invite_code_attempts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "private"."family_invite_code_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "private"."provider_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inviter_user_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "token_digest" "bytea" NOT NULL,
    "invitee_email_digest" "bytea" NOT NULL,
    "status" "private"."provider_invitation_status" DEFAULT 'pending'::"private"."provider_invitation_status" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_by_user_id" "uuid",
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_invitations_check" CHECK (((("status" = 'accepted'::"private"."provider_invitation_status") AND ("accepted_by_user_id" IS NOT NULL) AND ("accepted_at" IS NOT NULL)) OR (("status" <> 'accepted'::"private"."provider_invitation_status") AND ("accepted_by_user_id" IS NULL) AND ("accepted_at" IS NULL)))),
    CONSTRAINT "provider_invitations_check1" CHECK ((("accepted_by_user_id" IS NULL) OR ("accepted_by_user_id" <> "inviter_user_id"))),
    CONSTRAINT "provider_invitations_display_name_check" CHECK ((("char_length"("display_name") >= 2) AND ("char_length"("display_name") <= 80))),
    CONSTRAINT "provider_invitations_invitee_email_digest_check" CHECK (("octet_length"("invitee_email_digest") = 32)),
    CONSTRAINT "provider_invitations_token_digest_check" CHECK (("octet_length"("token_digest") = 32))
);

ALTER TABLE ONLY "private"."provider_invitations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "private"."provider_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."verification_document_removals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "storage_object_path" "text" NOT NULL,
    "enqueued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "verification_document_removals_storage_object_path_check" CHECK (("char_length"("storage_object_path") > 0))
);

ALTER TABLE ONLY "private"."verification_document_removals" FORCE ROW LEVEL SECURITY;


ALTER TABLE "private"."verification_document_removals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."verification_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "storage_object_path" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "review_status" "private"."verification_document_status" DEFAULT 'pending'::"private"."verification_document_status" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "reviewed_locality_id" "uuid",
    "purge_state" "text",
    CONSTRAINT "verification_documents_check" CHECK (("expires_at" > "uploaded_at")),
    CONSTRAINT "verification_documents_check1" CHECK (((("review_status" = 'pending'::"private"."verification_document_status") AND ("reviewed_by" IS NULL) AND ("reviewed_at" IS NULL)) OR (("review_status" <> 'pending'::"private"."verification_document_status") AND ("reviewed_by" IS NOT NULL) AND ("reviewed_at" IS NOT NULL)))),
    CONSTRAINT "verification_documents_check2" CHECK (((("review_status" = 'rejected'::"private"."verification_document_status") AND ("rejection_reason" IS NOT NULL)) OR ("review_status" <> 'rejected'::"private"."verification_document_status"))),
    CONSTRAINT "verification_documents_mime_type_check" CHECK (("mime_type" = ANY (ARRAY['application/pdf'::"text", 'image/jpeg'::"text", 'image/png'::"text"]))),
    CONSTRAINT "verification_documents_purge_state_check" CHECK ((("purge_state" = 'purged'::"text") OR ("purge_state" IS NULL))),
    CONSTRAINT "verification_documents_storage_object_path_check" CHECK (("char_length"("storage_object_path") > 0))
);

ALTER TABLE ONLY "private"."verification_documents" FORCE ROW LEVEL SECURITY;


ALTER TABLE "private"."verification_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."verification_outcomes" (
    "user_id" "uuid" NOT NULL,
    "status" "private"."verification_status" DEFAULT 'pending'::"private"."verification_status" NOT NULL,
    "eligibility_class" "private"."eligibility_class",
    "checked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "first_attempt_at" timestamp with time zone,
    "last_attempt_at" timestamp with time zone,
    "reconcile_attempts" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "verification_outcomes_check" CHECK (((("status" = 'verified'::"private"."verification_status") AND ("eligibility_class" IS NOT NULL) AND ("checked_at" IS NOT NULL)) OR (("status" <> 'verified'::"private"."verification_status") AND ("eligibility_class" IS NULL))))
);

ALTER TABLE ONLY "private"."verification_outcomes" FORCE ROW LEVEL SECURITY;


ALTER TABLE "private"."verification_outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."account_deletion_requests" (
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_at" timestamp with time zone NOT NULL,
    "finalized_at" timestamp with time zone,
    "purge_attempts" integer DEFAULT 0 NOT NULL,
    "purge_attempted_at" timestamp with time zone,
    "purge_last_error" "text",
    CONSTRAINT "account_deletion_requests_due_after_request" CHECK (("due_at" > "requested_at"))
);

ALTER TABLE ONLY "public"."account_deletion_requests" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."account_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."arrival_guide_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "category" "public"."arrival_guide_category" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "website_url" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "source_reply_id" "uuid",
    "confidence" smallint,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_note" "text",
    "submitted_by" "uuid",
    CONSTRAINT "arrival_guide_entries_confidence_check" CHECK ((("confidence" IS NULL) OR (("confidence" >= 0) AND ("confidence" <= 100)))),
    CONSTRAINT "arrival_guide_entries_description_check" CHECK (("char_length"("description") <= 500)),
    CONSTRAINT "arrival_guide_entries_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 120))),
    CONSTRAINT "arrival_guide_entries_phone_check" CHECK ((("phone" IS NULL) OR ("phone" ~ '^\+?[0-9() -]{8,30}$'::"text"))),
    CONSTRAINT "arrival_guide_entries_review_note_check" CHECK ((("review_note" IS NULL) OR ("char_length"("review_note") <= 500))),
    CONSTRAINT "arrival_guide_entries_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'ai'::"text"]))),
    CONSTRAINT "arrival_guide_entries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "arrival_guide_entries_website_url_check" CHECK ((("website_url" IS NULL) OR ("website_url" ~ '^https?://'::"text")))
);

ALTER TABLE ONLY "public"."arrival_guide_entries" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."arrival_guide_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "comments_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 1000)))
);

ALTER TABLE ONLY "public"."comments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "banner_path" "text",
    "thumbnail_path" "text",
    CONSTRAINT "communities_banner_path_length" CHECK ((("banner_path" IS NULL) OR (("char_length"("banner_path") >= 1) AND ("char_length"("banner_path") <= 500)))),
    CONSTRAINT "communities_description_check" CHECK ((("description" IS NULL) OR (("char_length"("description") >= 1) AND ("char_length"("description") <= 500)))),
    CONSTRAINT "communities_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 80))),
    CONSTRAINT "communities_thumbnail_path_length" CHECK ((("thumbnail_path" IS NULL) OR (("char_length"("thumbnail_path") >= 1) AND ("char_length"("thumbnail_path") <= 500))))
);

ALTER TABLE ONLY "public"."communities" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "inviter_user_id" "uuid" NOT NULL,
    "token_digest" "bytea" NOT NULL,
    "status" "public"."community_invitation_status" DEFAULT 'pending'::"public"."community_invitation_status" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_by_user_id" "uuid",
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_invitations_check" CHECK (((("status" = 'accepted'::"public"."community_invitation_status") AND ("accepted_by_user_id" IS NOT NULL) AND ("accepted_at" IS NOT NULL)) OR (("status" <> 'accepted'::"public"."community_invitation_status") AND ("accepted_by_user_id" IS NULL) AND ("accepted_at" IS NULL)))),
    CONSTRAINT "community_invitations_token_digest_check" CHECK (("octet_length"("token_digest") = 32))
);

ALTER TABLE ONLY "public"."community_invitations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_join_reasons" (
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_join_reasons_reason_check" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 500)))
);

ALTER TABLE ONLY "public"."community_join_reasons" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_join_reasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_memberships" (
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."community_membership_role" DEFAULT 'member'::"public"."community_membership_role" NOT NULL,
    "status" "public"."community_membership_status" DEFAULT 'pending'::"public"."community_membership_status" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."community_memberships" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_acceptances" (
    "user_id" "uuid" NOT NULL,
    "consent_version" integer NOT NULL,
    "code_of_conduct_version" integer NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consent_acceptances_code_of_conduct_version_check" CHECK (("code_of_conduct_version" > 0)),
    CONSTRAINT "consent_acceptances_consent_version_check" CHECK (("consent_version" > 0))
);

ALTER TABLE ONLY "public"."consent_acceptances" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."consent_acceptances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_blocks" (
    "blocker_user_id" "uuid" NOT NULL,
    "blocked_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dm_blocks_no_self" CHECK (("blocker_user_id" <> "blocked_user_id"))
);

ALTER TABLE ONLY "public"."dm_blocks" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "participant_a" "uuid" NOT NULL,
    "participant_b" "uuid" NOT NULL,
    "context_type" "public"."dm_context_type" NOT NULL,
    "context_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dm_conversations_ordered" CHECK (("participant_a" < "participant_b"))
);

ALTER TABLE ONLY "public"."dm_conversations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "client_key" "text",
    CONSTRAINT "dm_messages_client_key_length" CHECK ((("client_key" IS NULL) OR (("char_length"("client_key") >= 1) AND ("char_length"("client_key") <= 120)))),
    CONSTRAINT "dm_messages_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 2000)))
);

ALTER TABLE ONLY "public"."dm_messages" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_read_states" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."dm_read_states" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_read_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "invitee_user_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "public"."event_invite_status" DEFAULT 'pending'::"public"."event_invite_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."event_invites" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_rsvps" (
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."event_rsvp_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "occurrence_date" "date" NOT NULL
);

ALTER TABLE ONLY "public"."event_rsvps" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_rsvps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "group_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone,
    "venue" "text",
    "status" "public"."event_status" DEFAULT 'upcoming'::"public"."event_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "community_id" "uuid",
    "recurrence_type" "text",
    "recurrence_weekday" smallint,
    "recurrence_ordinal" smallint,
    "recurrence_day_of_month" smallint,
    "last_reminder_sent_for" "date",
    "cover_path" "text",
    CONSTRAINT "events_cover_path_length" CHECK ((("cover_path" IS NULL) OR (("char_length"("cover_path") >= 1) AND ("char_length"("cover_path") <= 300)))),
    CONSTRAINT "events_description_check" CHECK (("char_length"("description") <= 2000)),
    CONSTRAINT "events_recurrence_day_of_month_check" CHECK ((("recurrence_day_of_month" IS NULL) OR (("recurrence_day_of_month" >= 1) AND ("recurrence_day_of_month" <= 31)))),
    CONSTRAINT "events_recurrence_ordinal_check" CHECK ((("recurrence_ordinal" IS NULL) OR (("recurrence_ordinal" >= 1) AND ("recurrence_ordinal" <= 4)))),
    CONSTRAINT "events_recurrence_shape_check" CHECK (((("recurrence_type" IS NULL) AND ("recurrence_weekday" IS NULL) AND ("recurrence_ordinal" IS NULL) AND ("recurrence_day_of_month" IS NULL)) OR (("recurrence_type" = 'monthly_weekday_ordinal'::"text") AND ("recurrence_weekday" IS NOT NULL) AND ("recurrence_ordinal" IS NOT NULL) AND ("recurrence_day_of_month" IS NULL)) OR (("recurrence_type" = 'monthly_day_of_month'::"text") AND ("recurrence_day_of_month" IS NOT NULL) AND ("recurrence_weekday" IS NULL) AND ("recurrence_ordinal" IS NULL)))),
    CONSTRAINT "events_recurrence_type_check" CHECK ((("recurrence_type" IS NULL) OR ("recurrence_type" = ANY (ARRAY['monthly_weekday_ordinal'::"text", 'monthly_day_of_month'::"text"])))),
    CONSTRAINT "events_recurrence_weekday_check" CHECK ((("recurrence_weekday" IS NULL) OR (("recurrence_weekday" >= 0) AND ("recurrence_weekday" <= 6)))),
    CONSTRAINT "events_single_scope" CHECK (("num_nonnulls"("group_id", "community_id") <= 1)),
    CONSTRAINT "events_title_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 200))),
    CONSTRAINT "events_venue_check" CHECK ((("venue" IS NULL) OR ("char_length"("venue") <= 200)))
);

ALTER TABLE ONLY "public"."events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."cover_path" IS 'Caminho do objeto no bucket privado event-photos. Sempre sob a pasta do organizador.';



CREATE TABLE IF NOT EXISTS "public"."group_join_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."group_join_attempts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_join_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_join_reasons" (
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "group_join_reasons_reason_check" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 300)))
);

ALTER TABLE ONLY "public"."group_join_reasons" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_join_reasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_memberships" (
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."group_membership_role" DEFAULT 'member'::"public"."group_membership_role" NOT NULL,
    "status" "public"."group_membership_status" DEFAULT 'approved'::"public"."group_membership_status" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notify_level" "public"."group_notify_level" DEFAULT 'highlights'::"public"."group_notify_level" NOT NULL
);

ALTER TABLE ONLY "public"."group_memberships" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "visibility" "public"."group_visibility" DEFAULT 'public'::"public"."group_visibility" NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "community_id" "uuid",
    "rules" "text",
    "pinned_post_id" "uuid",
    CONSTRAINT "groups_description_check" CHECK ((("description" IS NULL) OR (("char_length"("description") >= 1) AND ("char_length"("description") <= 500)))),
    CONSTRAINT "groups_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 80))),
    CONSTRAINT "groups_rules_check" CHECK ((("rules" IS NULL) OR (("char_length"("rules") >= 1) AND ("char_length"("rules") <= 600))))
);

ALTER TABLE ONLY "public"."groups" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guide_article_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "revised_by" "uuid",
    "revised_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."guide_article_revisions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."guide_article_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guide_article_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "anchor" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guide_article_sections_anchor_check" CHECK ((("anchor" ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'::"text") AND ("char_length"("anchor") <= 80))),
    CONSTRAINT "guide_article_sections_body_check" CHECK ((("char_length"("body") >= 1) AND ("char_length"("body") <= 4000))),
    CONSTRAINT "guide_article_sections_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "guide_article_sections_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 160)))
);

ALTER TABLE ONLY "public"."guide_article_sections" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."guide_article_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guide_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "cover_image_url" "text",
    "summary" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "curated_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guide_articles_cover_image_url_check" CHECK ((("cover_image_url" IS NULL) OR ("cover_image_url" ~ '^(https?://|/)[^[:space:]]+$'::"text"))),
    CONSTRAINT "guide_articles_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'withdrawn'::"text"]))),
    CONSTRAINT "guide_articles_subtitle_check" CHECK ((("subtitle" IS NULL) OR ("char_length"("subtitle") <= 200))),
    CONSTRAINT "guide_articles_summary_check" CHECK ((("summary" IS NULL) OR ("char_length"("summary") <= 1000))),
    CONSTRAINT "guide_articles_title_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 160)))
);

ALTER TABLE ONLY "public"."guide_articles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."guide_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guide_correction_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "section_id" "uuid",
    "requester_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "reference_text" "text",
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "decision_note" "text",
    "decided_by" "uuid",
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guide_correction_requests_decision_note_check" CHECK ((("decision_note" IS NULL) OR ("char_length"("decision_note") <= 1000))),
    CONSTRAINT "guide_correction_requests_description_check" CHECK ((("char_length"("description") >= 1) AND ("char_length"("description") <= 2000))),
    CONSTRAINT "guide_correction_requests_reference_text_check" CHECK ((("reference_text" IS NULL) OR ("char_length"("reference_text") <= 500))),
    CONSTRAINT "guide_correction_requests_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'in_review'::"text", 'applied'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."guide_correction_requests" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."guide_correction_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guide_entry_saves" (
    "user_id" "uuid" NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."guide_entry_saves" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."guide_entry_saves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hidden_questions" (
    "user_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "hidden_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."hidden_questions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."hidden_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."indication_alert_deliveries" (
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "suppressed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "indication_alert_deliveries_kind_check" CHECK (("kind" = ANY (ARRAY['new'::"text", 'unanswered'::"text", 'resolve_prompt'::"text"])))
);

ALTER TABLE ONLY "public"."indication_alert_deliveries" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."indication_alert_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_alert_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."listing_alert_deliveries" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_alert_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "kind" "public"."listing_kind" DEFAULT 'property'::"public"."listing_kind" NOT NULL,
    "locality_id" "uuid",
    "neighborhood" "text",
    "deal" "public"."listing_deal",
    "max_value_cents" integer,
    "min_bedrooms" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "listing_alerts_max_value_cents_check" CHECK ((("max_value_cents" IS NULL) OR (("max_value_cents" >= 0) AND ("max_value_cents" <= 100000000)))),
    CONSTRAINT "listing_alerts_min_bedrooms_check" CHECK ((("min_bedrooms" IS NULL) OR (("min_bedrooms" >= 0) AND ("min_bedrooms" <= 20)))),
    CONSTRAINT "listing_alerts_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 80))),
    CONSTRAINT "listing_alerts_neighborhood_check" CHECK ((("neighborhood" IS NULL) OR (("char_length"("neighborhood") >= 1) AND ("char_length"("neighborhood") <= 80)))),
    CONSTRAINT "listing_alerts_neighborhood_no_cep" CHECK ((("neighborhood" IS NULL) OR (NOT "private"."is_cep_like"("neighborhood"))))
);

ALTER TABLE ONLY "public"."listing_alerts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "path" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."listing_photos" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_saves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."listing_saves" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_saves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_status_events" (
    "id" bigint NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "from_status" "public"."listing_status" NOT NULL,
    "to_status" "public"."listing_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."listing_status_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_status_events" OWNER TO "postgres";


ALTER TABLE "public"."listing_status_events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."listing_status_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "kind" "public"."listing_kind" NOT NULL,
    "status" "public"."listing_status" DEFAULT 'draft'::"public"."listing_status" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "condition" "public"."listing_condition",
    "price_cents" integer,
    "locality_id" "uuid",
    "community_id" "uuid",
    "neighborhood" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "available_until" "date",
    "pickup_note" "text",
    "address" "text",
    CONSTRAINT "listings_address_check" CHECK ((("address" IS NULL) OR (("char_length"("address") >= 3) AND ("char_length"("address") <= 200)))),
    CONSTRAINT "listings_audience_exclusive" CHECK ((("locality_id" IS NULL) <> ("community_id" IS NULL))),
    CONSTRAINT "listings_category_check" CHECK ((("category" IS NULL) OR (("char_length"("category") >= 1) AND ("char_length"("category") <= 60)))),
    CONSTRAINT "listings_condition_item_only" CHECK ((("kind" = 'item'::"public"."listing_kind") OR ("condition" IS NULL))),
    CONSTRAINT "listings_description_check" CHECK ((("description" IS NULL) OR (("char_length"("description") >= 1) AND ("char_length"("description") <= 2000)))),
    CONSTRAINT "listings_item_required_fields" CHECK ((("kind" <> 'item'::"public"."listing_kind") OR (("category" IS NOT NULL) AND ("description" IS NOT NULL) AND ("price_cents" IS NOT NULL) AND ("neighborhood" IS NOT NULL) AND ("condition" IS NOT NULL)))),
    CONSTRAINT "listings_neighborhood_check" CHECK ((("neighborhood" IS NULL) OR (("char_length"("neighborhood") >= 1) AND ("char_length"("neighborhood") <= 80)))),
    CONSTRAINT "listings_neighborhood_no_cep" CHECK ((("neighborhood" IS NULL) OR (NOT "private"."is_cep_like"("neighborhood")))),
    CONSTRAINT "listings_pickup_note_check" CHECK ((("pickup_note" IS NULL) OR (("char_length"("pickup_note") >= 1) AND ("char_length"("pickup_note") <= 120)))),
    CONSTRAINT "listings_price_cents_check" CHECK ((("price_cents" IS NULL) OR (("price_cents" >= 0) AND ("price_cents" <= 100000000)))),
    CONSTRAINT "listings_title_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 120)))
);

ALTER TABLE ONLY "public"."listings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."listings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."listings"."address" IS 'Endereço opcional, publicado por escolha de quem anuncia. Lido por quem lê o anúncio.';



CREATE TABLE IF NOT EXISTS "public"."localities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "city_name" "text" NOT NULL,
    "state_code" "text" NOT NULL,
    "country_code" "text" DEFAULT 'BR'::"text" NOT NULL,
    "admission_mode" "public"."locality_admission_mode" DEFAULT 'verification_gated'::"public"."locality_admission_mode" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ibge_code" "text" NOT NULL,
    CONSTRAINT "localities_city_name_check" CHECK ((("char_length"("city_name") >= 2) AND ("char_length"("city_name") <= 80))),
    CONSTRAINT "localities_country_code_check" CHECK (("country_code" ~ '^[A-Z]{2}$'::"text")),
    CONSTRAINT "localities_ibge_code_check" CHECK (("ibge_code" ~ '^[0-9]{7}$'::"text")),
    CONSTRAINT "localities_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "localities_state_code_check" CHECK (("state_code" ~ '^[A-Z]{2}$'::"text"))
);

ALTER TABLE ONLY "public"."localities" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."localities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locality_memberships" (
    "user_id" "uuid" NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "public"."locality_membership_kind" DEFAULT 'current'::"public"."locality_membership_kind" NOT NULL,
    "leaving_at" "date",
    "access" "public"."locality_membership_access" DEFAULT 'active'::"public"."locality_membership_access" NOT NULL,
    CONSTRAINT "locality_memberships_leaving_at_kind_check" CHECK (((("kind" = 'leaving'::"public"."locality_membership_kind") AND ("leaving_at" IS NOT NULL)) OR (("kind" = 'current'::"public"."locality_membership_kind") AND ("leaving_at" IS NULL))))
);

ALTER TABLE ONLY "public"."locality_memberships" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."locality_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_entry_moments" (
    "user_id" "uuid" NOT NULL,
    "moment" "public"."entry_moment" NOT NULL,
    "arrival_date" "date",
    "departure_date" "date",
    "destination_locality_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "member_entry_moments_coherence" CHECK (((("moment" = 'resident'::"public"."entry_moment") AND ("arrival_date" IS NULL) AND ("departure_date" IS NULL) AND ("destination_locality_id" IS NULL)) OR (("moment" = 'arriving'::"public"."entry_moment") AND ("arrival_date" IS NOT NULL) AND ("departure_date" IS NULL) AND ("destination_locality_id" IS NULL)) OR (("moment" = 'leaving'::"public"."entry_moment") AND ("departure_date" IS NOT NULL) AND ("arrival_date" IS NULL) AND ("destination_locality_id" IS NOT NULL))))
);

ALTER TABLE ONLY "public"."member_entry_moments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_entry_moments" OWNER TO "postgres";


COMMENT ON TABLE "public"."member_entry_moments" IS 'Momento declarado na entrada (ADR-20261022, item 3): chegando, moro aqui ou saindo, com as datas e o destino. Uma linha por pessoa; escrita só pela rota de provisionamento.';



COMMENT ON COLUMN "public"."member_entry_moments"."moment" IS 'Chegando, moro aqui ou saindo. Decide quais dos outros campos existem (ver member_entry_moments_coherence).';



COMMENT ON COLUMN "public"."member_entry_moments"."arrival_date" IS 'Data de chegada. Só no momento arriving.';



COMMENT ON COLUMN "public"."member_entry_moments"."departure_date" IS 'Data de saída. Só no momento leaving. Não é o leaving_at do vínculo: a pessoa ainda mora na cidade atual.';



COMMENT ON COLUMN "public"."member_entry_moments"."destination_locality_id" IS 'Cidade de destino da saída, do catálogo canônico. Não cria vínculo nenhum — a transferência de verdade é declare_locality_transfer.';



CREATE TABLE IF NOT EXISTS "public"."national_holidays" (
    "date" "date" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    CONSTRAINT "national_holidays_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 80))),
    CONSTRAINT "national_holidays_type_check" CHECK ((("char_length"("type") >= 1) AND ("char_length"("type") <= 40)))
);

ALTER TABLE ONLY "public"."national_holidays" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."national_holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."neighborhoods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "name_key" "text" NOT NULL,
    "zone" "text",
    "center_lat" numeric(9,6) NOT NULL,
    "center_lng" numeric(9,6) NOT NULL,
    CONSTRAINT "neighborhoods_center_lat_check" CHECK ((("center_lat" >= ('-90'::integer)::numeric) AND ("center_lat" <= (90)::numeric))),
    CONSTRAINT "neighborhoods_center_lng_check" CHECK ((("center_lng" >= ('-180'::integer)::numeric) AND ("center_lng" <= (180)::numeric))),
    CONSTRAINT "neighborhoods_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 80))),
    CONSTRAINT "neighborhoods_zone_check" CHECK ((("zone" IS NULL) OR (("char_length"("zone") >= 1) AND ("char_length"("zone") <= 60))))
);

ALTER TABLE ONLY "public"."neighborhoods" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."neighborhoods" OWNER TO "postgres";


COMMENT ON TABLE "public"."neighborhoods" IS 'Catálogo de bairros por cidade (ADR-20261022, seção 1). Ponto central público do bairro; nunca endereço ou CEP de pessoa.';



COMMENT ON COLUMN "public"."neighborhoods"."name_key" IS 'Chave sem acento e em minúsculas, única por cidade. Mantida pelo trigger neighborhoods_set_name_key.';



CREATE TABLE IF NOT EXISTS "public"."notification_channel_preferences" (
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "channel" "public"."notification_channel" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_channel_preferences_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['comments'::"text", 'events'::"text", 'mentions'::"text", 'messages'::"text", 'product_news'::"text", 'indications'::"text"])))
);

ALTER TABLE ONLY "public"."notification_channel_preferences" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_channel_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_opt_outs" (
    "channel" "public"."outbox_channel" NOT NULL,
    "recipient" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."notification_opt_outs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_opt_outs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "messages" boolean DEFAULT true NOT NULL,
    "comments" boolean DEFAULT true NOT NULL,
    "events" boolean DEFAULT true NOT NULL,
    "mentions" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_news" boolean DEFAULT false NOT NULL,
    "indications" boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY "public"."notification_preferences" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_user_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "type" "public"."notification_type" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_action_check" CHECK ((("char_length"("action") >= 1) AND ("char_length"("action") <= 50))),
    CONSTRAINT "notifications_target_type_check" CHECK ((("char_length"("target_type") >= 1) AND ("char_length"("target_type") <= 50)))
);

ALTER TABLE ONLY "public"."notifications" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_release_notices" (
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."onboarding_release_notices" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_release_notices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operators" (
    "auth_user_id" "uuid" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_by" "uuid",
    "notes" "text"
);

ALTER TABLE ONLY "public"."operators" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."operators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient" "text" NOT NULL,
    "channel" "public"."outbox_channel" NOT NULL,
    "type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "public"."outbox_status" DEFAULT 'pending'::"public"."outbox_status" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reserved_until" timestamp with time zone,
    "reserved_by" "uuid",
    CONSTRAINT "outbox_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "outbox_type_check" CHECK ((("char_length"("type") >= 1) AND ("char_length"("type") <= 50)))
);

ALTER TABLE ONLY "public"."outbox" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."outbox" OWNER TO "postgres";


COMMENT ON COLUMN "public"."outbox"."reserved_until" IS 'Prazo da reserva feita por outbox_prepare_due(); nulo quando livre.';



COMMENT ON COLUMN "public"."outbox"."reserved_by" IS 'Token da reserva feita por outbox_prepare_due(); nulo quando livre ou ja gravado.';



CREATE TABLE IF NOT EXISTS "public"."post_follows" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."post_follows" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."post_reactions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_saves" (
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."post_saves" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_saves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "group_id" "uuid",
    "post_type" "public"."post_type" NOT NULL,
    "content" "text" NOT NULL,
    "photo_path" "text",
    "link_url" "text",
    "poll_options" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "community_id" "uuid",
    CONSTRAINT "post_link_requires_link_type" CHECK ((("link_url" IS NULL) OR ("post_type" = 'link'::"public"."post_type"))),
    CONSTRAINT "post_link_type_requires_url" CHECK ((("post_type" <> 'link'::"public"."post_type") OR ("link_url" IS NOT NULL))),
    CONSTRAINT "post_photo_requires_photo_type" CHECK ((("photo_path" IS NULL) OR ("post_type" = 'photo'::"public"."post_type"))),
    CONSTRAINT "post_poll_requires_poll_type" CHECK ((("poll_options" IS NULL) OR ("post_type" = 'poll'::"public"."post_type"))),
    CONSTRAINT "posts_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 2000))),
    CONSTRAINT "posts_link_url_check" CHECK ((("link_url" IS NULL) OR ("link_url" ~ '^https?://[^\s/$.?#].[^\s]*$'::"text"))),
    CONSTRAINT "posts_single_scope" CHECK (("num_nonnulls"("group_id", "community_id") <= 1))
);

ALTER TABLE ONLY "public"."posts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_affiliations" (
    "user_id" "uuid" NOT NULL,
    "field" "text" NOT NULL,
    "value" "text" NOT NULL,
    "is_visible" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_affiliations_field_check" CHECK (("field" = ANY (ARRAY['armed_force'::"text", 'om'::"text"]))),
    CONSTRAINT "profile_affiliations_value_by_field" CHECK (
CASE "field"
    WHEN 'armed_force'::"text" THEN ("value" = ANY (ARRAY['marinha'::"text", 'exercito'::"text", 'aeronautica'::"text"]))
    WHEN 'om'::"text" THEN (("char_length"("value") >= 1) AND ("char_length"("value") <= 80))
    ELSE NULL::boolean
END)
);

ALTER TABLE ONLY "public"."profile_affiliations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_affiliations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_suspensions" (
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."profile_suspensions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_suspensions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "visibility" "public"."profile_visibility" DEFAULT 'locality_members'::"public"."profile_visibility" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consent_version" integer DEFAULT 0 NOT NULL,
    "consented_at" timestamp with time zone,
    "bio" "text",
    "neighborhood" "text",
    "show_neighborhood" boolean DEFAULT true NOT NULL,
    CONSTRAINT "profiles_bio_length" CHECK ((("bio" IS NULL) OR ("char_length"("bio") <= 300))),
    CONSTRAINT "profiles_bio_no_forbidden_terms" CHECK ((("bio" IS NULL) OR ("bio" !~* '\m(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|OM|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|CEP|CPF)\M'::"text"))),
    CONSTRAINT "profiles_display_name_check" CHECK ("private"."display_name_ok"("display_name")),
    CONSTRAINT "profiles_neighborhood_length" CHECK ((("neighborhood" IS NULL) OR (("char_length"("neighborhood") >= 1) AND ("char_length"("neighborhood") <= 80)))),
    CONSTRAINT "profiles_neighborhood_no_cep" CHECK ((("neighborhood" IS NULL) OR (NOT "private"."is_cep_like"("neighborhood"))))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."bio" IS 'Apresentação curta do perfil (ADR-20260909-perfil-bio). Máx. 300 caracteres; segue a visibilidade da linha; esvaziar grava NULL.';



COMMENT ON COLUMN "public"."profiles"."neighborhood" IS 'Bairro opcional do perfil. Grafia canônica do catálogo quando o texto bate. Fora do SELECT de authenticated; leitura por public.get_profile_neighborhood().';



COMMENT ON COLUMN "public"."profiles"."show_neighborhood" IS 'Chave "Mostrar meu bairro". Desligada, ninguém além do dono recebe o bairro. O dado continua guardado: religar mostra de novo.';



CREATE TABLE IF NOT EXISTS "public"."property_details" (
    "listing_id" "uuid" NOT NULL,
    "deal" "public"."listing_deal" NOT NULL,
    "property_type" "public"."property_type" NOT NULL,
    "rent_cents" integer,
    "condo_fee_cents" integer,
    "iptu_cents" integer,
    "sale_price_cents" integer,
    "bedrooms" integer,
    "suites" integer,
    "parking_spots" integer,
    "area_m2" numeric(6,2),
    "amenities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "available_from" "date",
    CONSTRAINT "property_details_area_m2_check" CHECK ((("area_m2" IS NULL) OR (("area_m2" >= (1)::numeric) AND ("area_m2" <= (100000)::numeric)))),
    CONSTRAINT "property_details_bedrooms_check" CHECK ((("bedrooms" IS NULL) OR (("bedrooms" >= 0) AND ("bedrooms" <= 20)))),
    CONSTRAINT "property_details_condo_fee_cents_check" CHECK ((("condo_fee_cents" IS NULL) OR (("condo_fee_cents" >= 0) AND ("condo_fee_cents" <= 100000000)))),
    CONSTRAINT "property_details_deal_costs" CHECK (((("deal" = 'rent'::"public"."listing_deal") AND ("sale_price_cents" IS NULL)) OR (("deal" = 'sale'::"public"."listing_deal") AND ("rent_cents" IS NULL)))),
    CONSTRAINT "property_details_iptu_cents_check" CHECK ((("iptu_cents" IS NULL) OR (("iptu_cents" >= 0) AND ("iptu_cents" <= 100000000)))),
    CONSTRAINT "property_details_parking_spots_check" CHECK ((("parking_spots" IS NULL) OR (("parking_spots" >= 0) AND ("parking_spots" <= 20)))),
    CONSTRAINT "property_details_rent_cents_check" CHECK ((("rent_cents" IS NULL) OR (("rent_cents" >= 0) AND ("rent_cents" <= 100000000)))),
    CONSTRAINT "property_details_sale_price_cents_check" CHECK ((("sale_price_cents" IS NULL) OR (("sale_price_cents" >= 0) AND ("sale_price_cents" <= 100000000)))),
    CONSTRAINT "property_details_suites_check" CHECK ((("suites" IS NULL) OR (("suites" >= 0) AND ("suites" <= 20))))
);

ALTER TABLE ONLY "public"."property_details" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_accounts" (
    "auth_user_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "locality_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_by" "uuid"
);

ALTER TABLE ONLY "public"."provider_accounts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_catalog_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "price_cents" integer,
    "photo_path" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_catalog_items_description_check" CHECK ((("description" IS NULL) OR (("char_length"("description") >= 1) AND ("char_length"("description") <= 600)))),
    CONSTRAINT "provider_catalog_items_price_cents_check" CHECK ((("price_cents" IS NULL) OR (("price_cents" >= 0) AND ("price_cents" <= 100000000)))),
    CONSTRAINT "provider_catalog_items_title_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 120)))
);

ALTER TABLE ONLY "public"."provider_catalog_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_catalog_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_portfolio_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "photo_path" "text" NOT NULL,
    "caption" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_portfolio_photos_caption_check" CHECK ((("caption" IS NULL) OR (("char_length"("caption") >= 1) AND ("char_length"("caption") <= 200))))
);

ALTER TABLE ONLY "public"."provider_portfolio_photos" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_portfolio_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "category" "public"."provider_category" NOT NULL,
    "bio" "text",
    "contact_phone" "text",
    "contact_is_public" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_profiles_bio_check" CHECK ((("bio" IS NULL) OR (("char_length"("bio") >= 1) AND ("char_length"("bio") <= 800)))),
    CONSTRAINT "provider_profiles_contact_phone_check" CHECK ((("contact_phone" IS NULL) OR ("contact_phone" ~ '^\+?[0-9]{10,15}$'::"text"))),
    CONSTRAINT "provider_profiles_display_name_check" CHECK ((("char_length"("display_name") >= 2) AND ("char_length"("display_name") <= 80)))
);

ALTER TABLE ONLY "public"."provider_profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_reach" (
    "provider_id" "uuid" NOT NULL,
    "scope_type" "public"."provider_reach_scope" NOT NULL,
    "scope_id" "uuid" NOT NULL,
    "source" "public"."provider_reach_source" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."provider_reach" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_reach" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "edited_at" timestamp with time zone,
    CONSTRAINT "recommendation_replies_body_check" CHECK ((("char_length"("body") >= 5) AND ("char_length"("body") <= 2000)))
);

ALTER TABLE ONLY "public"."recommendation_replies" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_reply_promotions" (
    "reply_id" "uuid" NOT NULL,
    "guide_entry_id" "uuid" NOT NULL,
    "promoted_by" "uuid" NOT NULL,
    "promoted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."recommendation_reply_promotions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_reply_promotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "locality_id" "uuid",
    "group_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "category" "public"."recommendation_category" DEFAULT 'outros'::"public"."recommendation_category" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_resolved" boolean DEFAULT false NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "resolved_reply_id" "uuid",
    "edited_at" timestamp with time zone,
    "last_resolved_reply_id" "uuid",
    CONSTRAINT "recommendation_origin_scope" CHECK (((("locality_id" IS NOT NULL) AND ("group_id" IS NULL)) OR (("locality_id" IS NULL) AND ("group_id" IS NOT NULL)))),
    CONSTRAINT "recommendation_requests_body_check" CHECK (("char_length"("body") <= 2000)),
    CONSTRAINT "recommendation_requests_title_check" CHECK ((("char_length"("title") >= 8) AND ("char_length"("title") <= 300)))
);

ALTER TABLE ONLY "public"."recommendation_requests" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_saves" (
    "user_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."recommendation_saves" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_saves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_user_id" "uuid" DEFAULT "auth"."uid"(),
    "target_type" "public"."report_target_type" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "public"."report_status" DEFAULT 'open'::"public"."report_status" NOT NULL,
    "operator_note" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reports_operator_note_check" CHECK ((("operator_note" IS NULL) OR ("char_length"("operator_note") > 0))),
    CONSTRAINT "reports_reason_check" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 1000)))
);

ALTER TABLE ONLY "public"."reports" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_request_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "photo_path" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."service_request_photos" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_request_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_user_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "provider_user_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "when_text" "text",
    "status" "public"."service_request_status" DEFAULT 'open'::"public"."service_request_status" NOT NULL,
    "conversation_id" "uuid",
    "idempotency_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "closed_by_user_id" "uuid",
    "cancelled_at" timestamp with time zone,
    "cancelled_by_user_id" "uuid",
    "category" "public"."provider_category" NOT NULL,
    "region" "text",
    "first_responded_at" timestamp with time zone,
    CONSTRAINT "service_requests_closed_consistency" CHECK ((("status" = 'closed'::"public"."service_request_status") = ("closed_at" IS NOT NULL))),
    CONSTRAINT "service_requests_description_check" CHECK ((("char_length"("description") >= 1) AND ("char_length"("description") <= 500))),
    CONSTRAINT "service_requests_idempotency_key_check" CHECK ((("idempotency_key" IS NULL) OR (("char_length"("idempotency_key") >= 1) AND ("char_length"("idempotency_key") <= 120)))),
    CONSTRAINT "service_requests_region_check" CHECK ((("region" IS NULL) OR (("char_length"("region") >= 1) AND ("char_length"("region") <= 120)))),
    CONSTRAINT "service_requests_region_no_cep" CHECK ((("region" IS NULL) OR (NOT "private"."is_cep_like"("region")))),
    CONSTRAINT "service_requests_when_text_check" CHECK ((("when_text" IS NULL) OR (("char_length"("when_text") >= 1) AND ("char_length"("when_text") <= 120))))
);

ALTER TABLE ONLY "public"."service_requests" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_group_interests" (
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."user_group_interests" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_group_interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "locality_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "city_name" "text",
    "state_code" "text",
    CONSTRAINT "waitlist_city_check" CHECK ((("city_name" IS NULL) OR (("char_length"("btrim"("city_name")) >= 2) AND ("char_length"("btrim"("city_name")) <= 80)))),
    CONSTRAINT "waitlist_email_check" CHECK (("email" ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::"text")),
    CONSTRAINT "waitlist_state_check" CHECK ((("state_code" IS NULL) OR ("state_code" ~ '^[A-Z]{2}$'::"text")))
);

ALTER TABLE ONLY "public"."waitlist" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."iceberg_namespaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_name" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "catalog_id" "uuid" NOT NULL
);


ALTER TABLE "storage"."iceberg_namespaces" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."iceberg_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "namespace_id" "uuid" NOT NULL,
    "bucket_name" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "location" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "remote_table_id" "text",
    "shard_key" "text",
    "shard_id" "text",
    "catalog_id" "uuid" NOT NULL
);


ALTER TABLE "storage"."iceberg_tables" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "private"."family_account_links"
    ADD CONSTRAINT "family_account_links_family_user_id_key" UNIQUE ("family_user_id");



ALTER TABLE ONLY "private"."family_account_links"
    ADD CONSTRAINT "family_account_links_invitation_id_key" UNIQUE ("invitation_id");



ALTER TABLE ONLY "private"."family_account_links"
    ADD CONSTRAINT "family_account_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."family_invitations"
    ADD CONSTRAINT "family_invitations_id_inviter_user_id_accepted_by_user_id_key" UNIQUE ("id", "inviter_user_id", "accepted_by_user_id");



ALTER TABLE ONLY "private"."family_invitations"
    ADD CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."family_invitations"
    ADD CONSTRAINT "family_invitations_token_digest_key" UNIQUE ("token_digest");



ALTER TABLE ONLY "private"."family_invite_code_attempts"
    ADD CONSTRAINT "family_invite_code_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."provider_invitations"
    ADD CONSTRAINT "provider_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."provider_invitations"
    ADD CONSTRAINT "provider_invitations_token_digest_key" UNIQUE ("token_digest");



ALTER TABLE ONLY "private"."verification_document_removals"
    ADD CONSTRAINT "verification_document_removals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."verification_document_removals"
    ADD CONSTRAINT "verification_document_removals_storage_object_path_key" UNIQUE ("storage_object_path");



ALTER TABLE ONLY "private"."verification_documents"
    ADD CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."verification_outcomes"
    ADD CONSTRAINT "verification_outcomes_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."arrival_guide_entries"
    ADD CONSTRAINT "arrival_guide_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_id_locality_id_key" UNIQUE ("id", "locality_id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_invitations"
    ADD CONSTRAINT "community_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_invitations"
    ADD CONSTRAINT "community_invitations_token_digest_key" UNIQUE ("token_digest");



ALTER TABLE ONLY "public"."community_join_reasons"
    ADD CONSTRAINT "community_join_reasons_pkey" PRIMARY KEY ("community_id", "user_id");



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("community_id", "user_id");



ALTER TABLE ONLY "public"."consent_acceptances"
    ADD CONSTRAINT "consent_acceptances_pkey" PRIMARY KEY ("user_id", "consent_version", "code_of_conduct_version");



ALTER TABLE ONLY "public"."dm_blocks"
    ADD CONSTRAINT "dm_blocks_pkey" PRIMARY KEY ("blocker_user_id", "blocked_user_id");



ALTER TABLE ONLY "public"."dm_conversations"
    ADD CONSTRAINT "dm_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_messages"
    ADD CONSTRAINT "dm_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_read_states"
    ADD CONSTRAINT "dm_read_states_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_event_id_invitee_user_id_key" UNIQUE ("event_id", "invitee_user_id");



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("event_id", "user_id", "occurrence_date");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_join_attempts"
    ADD CONSTRAINT "group_join_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_join_reasons"
    ADD CONSTRAINT "group_join_reasons_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guide_article_revisions"
    ADD CONSTRAINT "guide_article_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guide_article_sections"
    ADD CONSTRAINT "guide_article_sections_article_id_anchor_key" UNIQUE ("article_id", "anchor");



ALTER TABLE ONLY "public"."guide_article_sections"
    ADD CONSTRAINT "guide_article_sections_article_id_position_key" UNIQUE ("article_id", "position");



ALTER TABLE ONLY "public"."guide_article_sections"
    ADD CONSTRAINT "guide_article_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guide_articles"
    ADD CONSTRAINT "guide_articles_entry_id_key" UNIQUE ("entry_id");



ALTER TABLE ONLY "public"."guide_articles"
    ADD CONSTRAINT "guide_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guide_correction_requests"
    ADD CONSTRAINT "guide_correction_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guide_entry_saves"
    ADD CONSTRAINT "guide_entry_saves_pkey" PRIMARY KEY ("user_id", "entry_id");



ALTER TABLE ONLY "public"."hidden_questions"
    ADD CONSTRAINT "hidden_questions_pkey" PRIMARY KEY ("user_id", "request_id");



ALTER TABLE ONLY "public"."indication_alert_deliveries"
    ADD CONSTRAINT "indication_alert_deliveries_pkey" PRIMARY KEY ("request_id", "user_id", "kind");



ALTER TABLE ONLY "public"."listing_alert_deliveries"
    ADD CONSTRAINT "listing_alert_deliveries_alert_id_listing_id_key" UNIQUE ("alert_id", "listing_id");



ALTER TABLE ONLY "public"."listing_alert_deliveries"
    ADD CONSTRAINT "listing_alert_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_alerts"
    ADD CONSTRAINT "listing_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_photos"
    ADD CONSTRAINT "listing_photos_listing_position_unique" UNIQUE ("listing_id", "position");



ALTER TABLE ONLY "public"."listing_photos"
    ADD CONSTRAINT "listing_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."listing_photos"
    ADD CONSTRAINT "listing_photos_position_range" CHECK ((("position" >= 0) AND ("position" < 12))) NOT VALID;



ALTER TABLE ONLY "public"."listing_saves"
    ADD CONSTRAINT "listing_saves_listing_id_user_id_key" UNIQUE ("listing_id", "user_id");



ALTER TABLE ONLY "public"."listing_saves"
    ADD CONSTRAINT "listing_saves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_status_events"
    ADD CONSTRAINT "listing_status_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."localities"
    ADD CONSTRAINT "localities_ibge_code_key" UNIQUE ("ibge_code");



ALTER TABLE ONLY "public"."localities"
    ADD CONSTRAINT "localities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."localities"
    ADD CONSTRAINT "localities_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."locality_memberships"
    ADD CONSTRAINT "locality_memberships_pkey" PRIMARY KEY ("user_id", "locality_id");



ALTER TABLE ONLY "public"."member_entry_moments"
    ADD CONSTRAINT "member_entry_moments_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."national_holidays"
    ADD CONSTRAINT "national_holidays_pkey" PRIMARY KEY ("date", "name");



ALTER TABLE ONLY "public"."neighborhoods"
    ADD CONSTRAINT "neighborhoods_locality_name_key_unique" UNIQUE ("locality_id", "name_key");



ALTER TABLE ONLY "public"."neighborhoods"
    ADD CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_channel_preferences"
    ADD CONSTRAINT "notification_channel_preferences_pkey" PRIMARY KEY ("user_id", "notification_type", "channel");



ALTER TABLE ONLY "public"."notification_opt_outs"
    ADD CONSTRAINT "notification_opt_outs_pkey" PRIMARY KEY ("channel", "recipient");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_release_notices"
    ADD CONSTRAINT "onboarding_release_notices_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_pkey" PRIMARY KEY ("auth_user_id");



ALTER TABLE ONLY "public"."outbox"
    ADD CONSTRAINT "outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_follows"
    ADD CONSTRAINT "post_follows_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_saves"
    ADD CONSTRAINT "post_saves_pkey" PRIMARY KEY ("user_id", "post_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."profile_affiliations"
    ADD CONSTRAINT "profile_affiliations_om_no_rank_or_address" CHECK ((("field" <> 'om'::"text") OR (("value" !~* '\m(CPF|CEP|rua|avenida|alameda|travessa|rodovia|estrada|bairro|n[ºo]|numero|número|km)\M'::"text") AND ("value" !~* '\m(capit[ãa]o|tenente|coronel|major|sargento|subtenente|cabo|soldado|almirante|brigadeiro|aspirante|cel|sgt|ten|cap)\M'::"text")))) NOT VALID;



COMMENT ON CONSTRAINT "profile_affiliations_om_no_rank_or_address" ON "public"."profile_affiliations" IS 'A D2 mantem fora do produto os dados de hierarquia militar e de localizacao residencial. "general" fica de fora da lista de proposito: "Quartel General" e nome legitimo de OM, e falso positivo aqui recusa uma declaracao verdadeira.';



ALTER TABLE ONLY "public"."profile_affiliations"
    ADD CONSTRAINT "profile_affiliations_pkey" PRIMARY KEY ("user_id", "field");



ALTER TABLE ONLY "public"."profile_suspensions"
    ADD CONSTRAINT "profile_suspensions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."property_details"
    ADD CONSTRAINT "property_details_pkey" PRIMARY KEY ("listing_id");



ALTER TABLE ONLY "public"."provider_accounts"
    ADD CONSTRAINT "provider_accounts_pkey" PRIMARY KEY ("auth_user_id");



ALTER TABLE ONLY "public"."provider_catalog_items"
    ADD CONSTRAINT "provider_catalog_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_portfolio_photos"
    ADD CONSTRAINT "provider_portfolio_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_profiles"
    ADD CONSTRAINT "provider_profiles_owner_user_id_key" UNIQUE ("owner_user_id");



ALTER TABLE ONLY "public"."provider_profiles"
    ADD CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_reach"
    ADD CONSTRAINT "provider_reach_pkey" PRIMARY KEY ("provider_id", "scope_type", "scope_id");



ALTER TABLE ONLY "public"."recommendation_replies"
    ADD CONSTRAINT "recommendation_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_reply_promotions"
    ADD CONSTRAINT "recommendation_reply_promotions_pkey" PRIMARY KEY ("reply_id");



ALTER TABLE ONLY "public"."recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_saves"
    ADD CONSTRAINT "recommendation_saves_pkey" PRIMARY KEY ("user_id", "request_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_request_photos"
    ADD CONSTRAINT "service_request_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."service_request_photos"
    ADD CONSTRAINT "service_request_photos_position_range" CHECK ((("position" >= 0) AND ("position" < 6))) NOT VALID;



ALTER TABLE ONLY "public"."service_request_photos"
    ADD CONSTRAINT "service_request_photos_position_unique" UNIQUE ("request_id", "position");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_requester_key_unique" UNIQUE ("requester_user_id", "idempotency_key");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_group_interests"
    ADD CONSTRAINT "user_group_interests_pkey" PRIMARY KEY ("user_id", "group_id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_email_locality_id_key" UNIQUE ("email", "locality_id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."iceberg_namespaces"
    ADD CONSTRAINT "iceberg_namespaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "family_invitations_code_hash_idx" ON "private"."family_invitations" USING "btree" ("code_hash") WHERE ("code_hash" IS NOT NULL);



CREATE INDEX "family_invitations_inviter_status_idx" ON "private"."family_invitations" USING "btree" ("inviter_user_id", "status", "expires_at");



CREATE INDEX "family_invite_code_attempts_email_idx" ON "private"."family_invite_code_attempts" USING "btree" ("email_digest", "created_at" DESC) WHERE ("email_digest" IS NOT NULL);



CREATE INDEX "family_invite_code_attempts_origin_idx" ON "private"."family_invite_code_attempts" USING "btree" ("origin_digest", "created_at" DESC);



CREATE INDEX "provider_invitations_inviter_pending_idx" ON "private"."provider_invitations" USING "btree" ("inviter_user_id") WHERE ("status" = 'pending'::"private"."provider_invitation_status");



CREATE UNIQUE INDEX "verification_documents_one_pending_per_user" ON "private"."verification_documents" USING "btree" ("user_id") WHERE ("review_status" = 'pending'::"private"."verification_document_status");



CREATE INDEX "verification_documents_user_uploaded_idx" ON "private"."verification_documents" USING "btree" ("user_id", "uploaded_at" DESC);



CREATE INDEX "account_deletion_requests_due_idx" ON "public"."account_deletion_requests" USING "btree" ("due_at") WHERE ("finalized_at" IS NULL);



CREATE INDEX "arrival_guide_entries_locality_category_idx" ON "public"."arrival_guide_entries" USING "btree" ("locality_id", "category");



CREATE UNIQUE INDEX "arrival_guide_entries_source_reply_id_key" ON "public"."arrival_guide_entries" USING "btree" ("source_reply_id") WHERE ("source_reply_id" IS NOT NULL);



CREATE INDEX "arrival_guide_entries_status_idx" ON "public"."arrival_guide_entries" USING "btree" ("status", "created_at");



CREATE INDEX "arrival_guide_entries_submitted_by_idx" ON "public"."arrival_guide_entries" USING "btree" ("submitted_by") WHERE ("submitted_by" IS NOT NULL);



CREATE INDEX "comments_post_id_created_idx" ON "public"."comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "comments_user_id_idx" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "communities_locality_idx" ON "public"."communities" USING "btree" ("locality_id") WHERE ("is_deleted" = false);



CREATE INDEX "community_invitations_community_idx" ON "public"."community_invitations" USING "btree" ("community_id", "created_at" DESC) WHERE ("status" = 'pending'::"public"."community_invitation_status");



CREATE INDEX "community_invitations_inviter_idx" ON "public"."community_invitations" USING "btree" ("inviter_user_id", "created_at" DESC) WHERE ("status" = 'pending'::"public"."community_invitation_status");



CREATE INDEX "community_memberships_user_idx" ON "public"."community_memberships" USING "btree" ("user_id") WHERE ("status" = 'approved'::"public"."community_membership_status");



CREATE INDEX "dm_blocks_blocked_idx" ON "public"."dm_blocks" USING "btree" ("blocked_user_id");



CREATE INDEX "dm_conversations_participant_a_idx" ON "public"."dm_conversations" USING "btree" ("participant_a", "created_at" DESC);



CREATE INDEX "dm_conversations_participant_b_idx" ON "public"."dm_conversations" USING "btree" ("participant_b", "created_at" DESC);



CREATE UNIQUE INDEX "dm_conversations_unique_pair" ON "public"."dm_conversations" USING "btree" ("participant_a", "participant_b") WHERE ("context_type" <> 'service_request'::"public"."dm_context_type");



CREATE UNIQUE INDEX "dm_conversations_unique_service_request" ON "public"."dm_conversations" USING "btree" ("context_id") WHERE ("context_type" = 'service_request'::"public"."dm_context_type");



CREATE INDEX "dm_messages_conversation_idx" ON "public"."dm_messages" USING "btree" ("conversation_id", "created_at");



CREATE UNIQUE INDEX "dm_messages_sender_client_key_unique" ON "public"."dm_messages" USING "btree" ("conversation_id", "sender_id", "client_key") WHERE ("client_key" IS NOT NULL);



CREATE INDEX "dm_messages_sender_idx" ON "public"."dm_messages" USING "btree" ("sender_id", "created_at");



CREATE INDEX "event_rsvps_event_id_idx" ON "public"."event_rsvps" USING "btree" ("event_id");



CREATE INDEX "events_community_idx" ON "public"."events" USING "btree" ("community_id");



CREATE INDEX "events_group_id_idx" ON "public"."events" USING "btree" ("group_id") WHERE ("group_id" IS NOT NULL);



CREATE INDEX "events_locality_id_idx" ON "public"."events" USING "btree" ("locality_id");



CREATE INDEX "events_organizer_id_idx" ON "public"."events" USING "btree" ("organizer_id");



CREATE INDEX "events_starts_at_idx" ON "public"."events" USING "btree" ("starts_at");



CREATE INDEX "group_join_attempts_window_idx" ON "public"."group_join_attempts" USING "btree" ("group_id", "user_id", "attempted_at" DESC);



CREATE INDEX "group_memberships_user_idx" ON "public"."group_memberships" USING "btree" ("user_id");



CREATE INDEX "groups_community_idx" ON "public"."groups" USING "btree" ("community_id");



CREATE INDEX "groups_locality_visibility_idx" ON "public"."groups" USING "btree" ("locality_id", "visibility");



CREATE INDEX "groups_pinned_post_idx" ON "public"."groups" USING "btree" ("pinned_post_id") WHERE ("pinned_post_id" IS NOT NULL);



CREATE INDEX "guide_article_revisions_article_idx" ON "public"."guide_article_revisions" USING "btree" ("article_id", "revised_at" DESC);



CREATE INDEX "guide_article_sections_article_idx" ON "public"."guide_article_sections" USING "btree" ("article_id", "position");



CREATE INDEX "guide_articles_status_idx" ON "public"."guide_articles" USING "btree" ("status", "reviewed_at" DESC);



CREATE INDEX "guide_correction_requests_article_status_idx" ON "public"."guide_correction_requests" USING "btree" ("article_id", "status", "created_at");



CREATE INDEX "guide_correction_requests_requester_idx" ON "public"."guide_correction_requests" USING "btree" ("requester_id", "created_at" DESC);



CREATE INDEX "guide_entry_saves_user_idx" ON "public"."guide_entry_saves" USING "btree" ("user_id", "saved_at" DESC);



CREATE INDEX "hidden_questions_request_idx" ON "public"."hidden_questions" USING "btree" ("request_id", "user_id");



CREATE INDEX "indication_alert_deliveries_user_idx" ON "public"."indication_alert_deliveries" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "listing_alert_deliveries_alert_idx" ON "public"."listing_alert_deliveries" USING "btree" ("alert_id", "created_at" DESC);



CREATE INDEX "listing_alerts_owner_idx" ON "public"."listing_alerts" USING "btree" ("owner_user_id", "created_at" DESC);



CREATE INDEX "listing_photos_listing_idx" ON "public"."listing_photos" USING "btree" ("listing_id", "position", "created_at");



CREATE INDEX "listing_saves_user_idx" ON "public"."listing_saves" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "listing_status_events_listing_idx" ON "public"."listing_status_events" USING "btree" ("listing_id", "created_at" DESC);



CREATE INDEX "listings_owner_idx" ON "public"."listings" USING "btree" ("owner_user_id", "created_at" DESC);



CREATE INDEX "listings_search_idx" ON "public"."listings" USING "btree" ("kind", "status", "locality_id", "created_at" DESC);



CREATE INDEX "locality_memberships_locality_id_idx" ON "public"."locality_memberships" USING "btree" ("locality_id");



CREATE UNIQUE INDEX "locality_memberships_one_current_per_user_idx" ON "public"."locality_memberships" USING "btree" ("user_id") WHERE ("kind" = 'current'::"public"."locality_membership_kind");



CREATE UNIQUE INDEX "locality_memberships_one_leaving_per_user_idx" ON "public"."locality_memberships" USING "btree" ("user_id") WHERE ("kind" = 'leaving'::"public"."locality_membership_kind");



CREATE INDEX "notifications_recipient_created_idx" ON "public"."notifications" USING "btree" ("recipient_user_id", "created_at" DESC);



CREATE INDEX "notifications_recipient_unread_idx" ON "public"."notifications" USING "btree" ("recipient_user_id", "created_at" DESC) WHERE ("read_at" IS NULL);



CREATE INDEX "operators_active_idx" ON "public"."operators" USING "btree" ("auth_user_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "outbox_pending_created_idx" ON "public"."outbox" USING "btree" ("created_at") WHERE ("status" = 'pending'::"public"."outbox_status");



CREATE INDEX "post_follows_user_id_idx" ON "public"."post_follows" USING "btree" ("user_id");



CREATE INDEX "post_reactions_post_id_idx" ON "public"."post_reactions" USING "btree" ("post_id");



CREATE INDEX "post_reactions_user_id_idx" ON "public"."post_reactions" USING "btree" ("user_id");



CREATE INDEX "post_saves_post_id_idx" ON "public"."post_saves" USING "btree" ("post_id");



CREATE INDEX "post_saves_user_id_idx" ON "public"."post_saves" USING "btree" ("user_id", "saved_at" DESC);



CREATE INDEX "posts_community_idx" ON "public"."posts" USING "btree" ("community_id", "created_at" DESC);



CREATE INDEX "posts_group_created_idx" ON "public"."posts" USING "btree" ("group_id", "created_at" DESC) WHERE ("group_id" IS NOT NULL);



CREATE INDEX "posts_locality_created_idx" ON "public"."posts" USING "btree" ("locality_id", "created_at" DESC);



CREATE INDEX "posts_user_id_idx" ON "public"."posts" USING "btree" ("user_id");



CREATE INDEX "provider_accounts_active_idx" ON "public"."provider_accounts" USING "btree" ("auth_user_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "provider_accounts_community_idx" ON "public"."provider_accounts" USING "btree" ("community_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "provider_catalog_items_provider_idx" ON "public"."provider_catalog_items" USING "btree" ("provider_id", "position", "created_at");



CREATE INDEX "provider_portfolio_photos_provider_idx" ON "public"."provider_portfolio_photos" USING "btree" ("provider_id", "position", "created_at");



CREATE INDEX "provider_profiles_name_trgm_idx" ON "public"."provider_profiles" USING "gin" ("display_name" "extensions"."gin_trgm_ops") WHERE ("is_deleted" = false);



CREATE INDEX "provider_reach_scope_idx" ON "public"."provider_reach" USING "btree" ("scope_type", "scope_id") WHERE "active";



CREATE INDEX "recommendation_replies_author_idx" ON "public"."recommendation_replies" USING "btree" ("author_id", "created_at");



CREATE INDEX "recommendation_replies_request_idx" ON "public"."recommendation_replies" USING "btree" ("request_id", "created_at");



CREATE INDEX "recommendation_requests_author_idx" ON "public"."recommendation_requests" USING "btree" ("author_id", "created_at" DESC);



CREATE INDEX "recommendation_requests_group_idx" ON "public"."recommendation_requests" USING "btree" ("group_id", "created_at" DESC);



CREATE INDEX "recommendation_requests_last_resolved_reply_idx" ON "public"."recommendation_requests" USING "btree" ("last_resolved_reply_id") WHERE ("last_resolved_reply_id" IS NOT NULL);



CREATE INDEX "recommendation_requests_locality_idx" ON "public"."recommendation_requests" USING "btree" ("locality_id", "created_at" DESC);



CREATE INDEX "recommendation_requests_resolved_reply_idx" ON "public"."recommendation_requests" USING "btree" ("resolved_reply_id") WHERE ("resolved_reply_id" IS NOT NULL);



CREATE INDEX "recommendation_saves_user_idx" ON "public"."recommendation_saves" USING "btree" ("user_id", "saved_at" DESC);



CREATE UNIQUE INDEX "reports_one_open_per_reporter_target_idx" ON "public"."reports" USING "btree" ("reporter_user_id", "target_type", "target_id") WHERE ("status" = 'open'::"public"."report_status");



CREATE INDEX "reports_reporter_idx" ON "public"."reports" USING "btree" ("reporter_user_id", "created_at" DESC);



CREATE INDEX "reports_status_idx" ON "public"."reports" USING "btree" ("status") WHERE ("status" = 'open'::"public"."report_status");



CREATE INDEX "reports_target_idx" ON "public"."reports" USING "btree" ("target_type", "target_id");



CREATE INDEX "service_request_photos_request_idx" ON "public"."service_request_photos" USING "btree" ("request_id", "position");



CREATE INDEX "service_requests_provider_status_idx" ON "public"."service_requests" USING "btree" ("provider_id", "status", "created_at" DESC);



CREATE INDEX "service_requests_provider_user_idx" ON "public"."service_requests" USING "btree" ("provider_user_id", "created_at" DESC);



CREATE INDEX "service_requests_requester_idx" ON "public"."service_requests" USING "btree" ("requester_user_id", "created_at" DESC);



CREATE INDEX "support_tickets_user_created_idx" ON "public"."support_tickets" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "support_tickets_user_open_idx" ON "public"."support_tickets" USING "btree" ("user_id") WHERE ("status" = 'open'::"public"."support_ticket_status");



CREATE INDEX "user_group_interests_group_idx" ON "public"."user_group_interests" USING "btree" ("group_id");



CREATE UNIQUE INDEX "waitlist_email_city_state_idx" ON "public"."waitlist" USING "btree" ("email", "city_name", "state_code") WHERE ("locality_id" IS NULL);



CREATE INDEX "waitlist_locality_email_idx" ON "public"."waitlist" USING "btree" ("locality_id", "email");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_iceberg_namespaces_bucket_id" ON "storage"."iceberg_namespaces" USING "btree" ("catalog_id", "name");



CREATE UNIQUE INDEX "idx_iceberg_tables_location" ON "storage"."iceberg_tables" USING "btree" ("location");



CREATE UNIQUE INDEX "idx_iceberg_tables_namespace_id" ON "storage"."iceberg_tables" USING "btree" ("catalog_id", "namespace_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "notify_invitation_accepted_trigger" AFTER UPDATE ON "private"."family_invitations" FOR EACH ROW EXECUTE FUNCTION "private"."notify_invitation_accepted"();



CREATE OR REPLACE TRIGGER "verification_outcomes_set_updated_at" BEFORE UPDATE ON "private"."verification_outcomes" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "block_group_community_change_trigger" BEFORE UPDATE OF "community_id" ON "public"."groups" FOR EACH ROW WHEN (("new"."community_id" IS DISTINCT FROM "old"."community_id")) EXECUTE FUNCTION "private"."block_group_community_change"();



CREATE OR REPLACE TRIGGER "block_soft_delete_comments" BEFORE UPDATE OF "is_deleted" ON "public"."comments" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();



CREATE OR REPLACE TRIGGER "block_soft_delete_dm_messages" BEFORE UPDATE OF "is_deleted" ON "public"."dm_messages" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();



CREATE OR REPLACE TRIGGER "block_soft_delete_groups" BEFORE UPDATE OF "is_deleted" ON "public"."groups" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();



CREATE OR REPLACE TRIGGER "block_soft_delete_posts" BEFORE UPDATE OF "is_deleted" ON "public"."posts" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();



CREATE OR REPLACE TRIGGER "block_soft_delete_recommendation_replies" BEFORE UPDATE OF "is_deleted" ON "public"."recommendation_replies" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();



CREATE OR REPLACE TRIGGER "block_soft_delete_recommendation_requests" BEFORE UPDATE OF "is_deleted" ON "public"."recommendation_requests" FOR EACH ROW WHEN (("new"."is_deleted" IS DISTINCT FROM "old"."is_deleted")) EXECUTE FUNCTION "private"."block_authenticated_soft_delete"();



CREATE OR REPLACE TRIGGER "cascade_community_membership_downgrade_trigger" AFTER UPDATE OF "status" ON "public"."community_memberships" FOR EACH ROW WHEN ((("old"."status" = 'approved'::"public"."community_membership_status") AND ("new"."status" <> 'approved'::"public"."community_membership_status"))) EXECUTE FUNCTION "private"."cascade_community_membership_downgrade"();



CREATE OR REPLACE TRIGGER "cascade_community_membership_loss_trigger" AFTER DELETE ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."cascade_community_membership_loss"();



CREATE OR REPLACE TRIGGER "dm_read_states_set_updated_at" BEFORE UPDATE ON "public"."dm_read_states" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_group_community_membership_trigger" BEFORE INSERT OR UPDATE ON "public"."group_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_group_community_membership"();



CREATE OR REPLACE TRIGGER "event_rsvps_block_self_trigger" BEFORE INSERT OR UPDATE ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "private"."event_rsvps_block_self"();



CREATE OR REPLACE TRIGGER "event_rsvps_default_occurrence_date" BEFORE INSERT ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "private"."default_event_rsvp_occurrence"();



CREATE OR REPLACE TRIGGER "group_join_attempt_limit_before_insert" BEFORE INSERT ON "public"."group_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_group_join_attempt_limit"();



CREATE OR REPLACE TRIGGER "guard_group_pinned_post" BEFORE INSERT OR UPDATE OF "pinned_post_id" ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "private"."guard_group_pinned_post"();



CREATE OR REPLACE TRIGGER "listing_alerts_cleanup_deliveries" AFTER DELETE ON "public"."listing_alerts" FOR EACH ROW EXECUTE FUNCTION "private"."listing_alert_cleanup"();



CREATE OR REPLACE TRIGGER "listing_alerts_set_updated_at" BEFORE UPDATE ON "public"."listing_alerts" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "listings_audience_immutable" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "private"."listing_audience_immutable"();



CREATE OR REPLACE TRIGGER "listings_guard_status_transition" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "private"."listings_guard_status_transition"();



CREATE OR REPLACE TRIGGER "listings_set_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "member_business_reach_follows_owner" AFTER INSERT OR UPDATE OF "kind", "locality_id", "access" ON "public"."locality_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."member_business_reach_follows_owner"();



CREATE OR REPLACE TRIGGER "member_entry_moments_set_updated_at" BEFORE UPDATE ON "public"."member_entry_moments" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "neighborhoods_set_name_key" BEFORE INSERT OR UPDATE OF "name" ON "public"."neighborhoods" FOR EACH ROW EXECUTE FUNCTION "private"."set_neighborhood_name_key"();



CREATE OR REPLACE TRIGGER "notify_comment_trigger" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "private"."notify_comment"();



CREATE OR REPLACE TRIGGER "notify_event_change_trigger" AFTER UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "private"."notify_event_change"();



CREATE OR REPLACE TRIGGER "notify_event_question_message_trigger" AFTER INSERT ON "public"."dm_messages" FOR EACH ROW EXECUTE FUNCTION "private"."notify_event_question_message"();



CREATE OR REPLACE TRIGGER "notify_event_rsvp_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "private"."notify_event_rsvp"();



CREATE OR REPLACE TRIGGER "notify_group_admission_trigger" AFTER UPDATE ON "public"."group_memberships" FOR EACH ROW EXECUTE FUNCTION "private"."notify_group_admission"();



CREATE OR REPLACE TRIGGER "notify_group_pin_trigger" AFTER UPDATE OF "pinned_post_id" ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "private"."notify_group_pin"();



CREATE OR REPLACE TRIGGER "notify_group_post_trigger" AFTER INSERT ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "private"."notify_group_post"();



CREATE OR REPLACE TRIGGER "notify_recommendation_reply_followers_trigger" AFTER INSERT ON "public"."recommendation_replies" FOR EACH ROW EXECUTE FUNCTION "private"."notify_recommendation_reply_followers"();



CREATE OR REPLACE TRIGGER "notify_recommendation_reply_trigger" AFTER INSERT ON "public"."recommendation_replies" FOR EACH ROW EXECUTE FUNCTION "private"."notify_recommendation_reply"();



CREATE OR REPLACE TRIGGER "posts_group_immutable" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "private"."prevent_post_group_change"();



CREATE OR REPLACE TRIGGER "profiles_canonicalize_neighborhood" BEFORE INSERT OR UPDATE OF "neighborhood" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."canonicalize_profile_neighborhood"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "property_details_require_property" BEFORE INSERT OR UPDATE ON "public"."property_details" FOR EACH ROW EXECUTE FUNCTION "private"."property_details_require_property"();



CREATE OR REPLACE TRIGGER "provider_profiles_set_updated_at" BEFORE UPDATE ON "public"."provider_profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "recommendation_replies_mark_edited" BEFORE UPDATE ON "public"."recommendation_replies" FOR EACH ROW EXECUTE FUNCTION "private"."mark_recommendation_reply_edited"();



CREATE OR REPLACE TRIGGER "recommendation_replies_reopen_on_delete" BEFORE DELETE ON "public"."recommendation_replies" FOR EACH ROW EXECUTE FUNCTION "private"."reopen_request_on_resolved_reply_delete"();



CREATE OR REPLACE TRIGGER "recommendation_requests_mark_edited" BEFORE UPDATE ON "public"."recommendation_requests" FOR EACH ROW EXECUTE FUNCTION "private"."mark_recommendation_request_edited"();



CREATE OR REPLACE TRIGGER "reports_block_self_trigger" BEFORE INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "private"."reports_block_self"();



CREATE OR REPLACE TRIGGER "reports_scrub_reason_before_insert_or_update" BEFORE INSERT OR UPDATE OF "reason" ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "private"."scrub_report_reason"();



CREATE OR REPLACE TRIGGER "service_requests_mark_first_response" BEFORE UPDATE ON "public"."service_requests" FOR EACH ROW EXECUTE FUNCTION "private"."service_request_mark_first_response"();



CREATE OR REPLACE TRIGGER "service_requests_set_updated_at" BEFORE UPDATE ON "public"."service_requests" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "snap_recurring_event_start_trigger" BEFORE INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "private"."snap_recurring_event_start"();



CREATE OR REPLACE TRIGGER "validate_event_cover_path_trigger" BEFORE INSERT OR UPDATE OF "cover_path" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "private"."validate_event_cover_path"();



CREATE OR REPLACE TRIGGER "validate_recommendation_resolved_reply" BEFORE INSERT OR UPDATE OF "resolved_reply_id", "last_resolved_reply_id" ON "public"."recommendation_requests" FOR EACH ROW EXECUTE FUNCTION "private"."validate_recommendation_resolved_reply"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "private"."family_account_links"
    ADD CONSTRAINT "family_account_links_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."family_account_links"
    ADD CONSTRAINT "family_account_links_holder_user_id_fkey" FOREIGN KEY ("holder_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."family_account_links"
    ADD CONSTRAINT "family_account_links_invitation_id_holder_user_id_family_u_fkey" FOREIGN KEY ("invitation_id", "holder_user_id", "family_user_id") REFERENCES "private"."family_invitations"("id", "inviter_user_id", "accepted_by_user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "private"."family_invitations"
    ADD CONSTRAINT "family_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "private"."family_invitations"
    ADD CONSTRAINT "family_invitations_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."provider_invitations"
    ADD CONSTRAINT "provider_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "private"."provider_invitations"
    ADD CONSTRAINT "provider_invitations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."provider_invitations"
    ADD CONSTRAINT "provider_invitations_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "private"."provider_invitations"
    ADD CONSTRAINT "provider_invitations_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "private"."verification_documents"
    ADD CONSTRAINT "verification_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "private"."verification_documents"
    ADD CONSTRAINT "verification_documents_reviewed_locality_id_fkey" FOREIGN KEY ("reviewed_locality_id") REFERENCES "public"."localities"("id");



ALTER TABLE ONLY "private"."verification_documents"
    ADD CONSTRAINT "verification_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."verification_outcomes"
    ADD CONSTRAINT "verification_outcomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."arrival_guide_entries"
    ADD CONSTRAINT "arrival_guide_entries_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."arrival_guide_entries"
    ADD CONSTRAINT "arrival_guide_entries_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."arrival_guide_entries"
    ADD CONSTRAINT "arrival_guide_entries_source_reply_id_fkey" FOREIGN KEY ("source_reply_id") REFERENCES "public"."recommendation_replies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."arrival_guide_entries"
    ADD CONSTRAINT "arrival_guide_entries_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_invitations"
    ADD CONSTRAINT "community_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_invitations"
    ADD CONSTRAINT "community_invitations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_invitations"
    ADD CONSTRAINT "community_invitations_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_join_reasons"
    ADD CONSTRAINT "community_join_reasons_community_id_user_id_fkey" FOREIGN KEY ("community_id", "user_id") REFERENCES "public"."community_memberships"("community_id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consent_acceptances"
    ADD CONSTRAINT "consent_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_blocks"
    ADD CONSTRAINT "dm_blocks_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_blocks"
    ADD CONSTRAINT "dm_blocks_blocker_user_id_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_conversations"
    ADD CONSTRAINT "dm_conversations_participant_a_fkey" FOREIGN KEY ("participant_a") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_conversations"
    ADD CONSTRAINT "dm_conversations_participant_b_fkey" FOREIGN KEY ("participant_b") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_messages"
    ADD CONSTRAINT "dm_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_messages"
    ADD CONSTRAINT "dm_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_read_states"
    ADD CONSTRAINT "dm_read_states_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_read_states"
    ADD CONSTRAINT "dm_read_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_invitee_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_community_same_locality" FOREIGN KEY ("community_id", "locality_id") REFERENCES "public"."communities"("id", "locality_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_join_attempts"
    ADD CONSTRAINT "group_join_attempts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_join_attempts"
    ADD CONSTRAINT "group_join_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_join_reasons"
    ADD CONSTRAINT "group_join_reasons_group_id_user_id_fkey" FOREIGN KEY ("group_id", "user_id") REFERENCES "public"."group_memberships"("group_id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_memberships"
    ADD CONSTRAINT "group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_community_same_locality" FOREIGN KEY ("community_id", "locality_id") REFERENCES "public"."communities"("id", "locality_id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pinned_post_id_fkey" FOREIGN KEY ("pinned_post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guide_article_revisions"
    ADD CONSTRAINT "guide_article_revisions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."guide_articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guide_article_revisions"
    ADD CONSTRAINT "guide_article_revisions_revised_by_fkey" FOREIGN KEY ("revised_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guide_article_sections"
    ADD CONSTRAINT "guide_article_sections_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."guide_articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guide_articles"
    ADD CONSTRAINT "guide_articles_curated_by_fkey" FOREIGN KEY ("curated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guide_articles"
    ADD CONSTRAINT "guide_articles_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."arrival_guide_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guide_correction_requests"
    ADD CONSTRAINT "guide_correction_requests_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."guide_articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guide_correction_requests"
    ADD CONSTRAINT "guide_correction_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guide_correction_requests"
    ADD CONSTRAINT "guide_correction_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guide_correction_requests"
    ADD CONSTRAINT "guide_correction_requests_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."guide_article_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guide_entry_saves"
    ADD CONSTRAINT "guide_entry_saves_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."arrival_guide_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guide_entry_saves"
    ADD CONSTRAINT "guide_entry_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hidden_questions"
    ADD CONSTRAINT "hidden_questions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."recommendation_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hidden_questions"
    ADD CONSTRAINT "hidden_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."indication_alert_deliveries"
    ADD CONSTRAINT "indication_alert_deliveries_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."recommendation_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."indication_alert_deliveries"
    ADD CONSTRAINT "indication_alert_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_alert_deliveries"
    ADD CONSTRAINT "listing_alert_deliveries_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."listing_alerts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_alert_deliveries"
    ADD CONSTRAINT "listing_alert_deliveries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_alerts"
    ADD CONSTRAINT "listing_alerts_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."listing_alerts"
    ADD CONSTRAINT "listing_alerts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_photos"
    ADD CONSTRAINT "listing_photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_saves"
    ADD CONSTRAINT "listing_saves_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_saves"
    ADD CONSTRAINT "listing_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_status_events"
    ADD CONSTRAINT "listing_status_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_status_events"
    ADD CONSTRAINT "listing_status_events_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locality_memberships"
    ADD CONSTRAINT "locality_memberships_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."locality_memberships"
    ADD CONSTRAINT "locality_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_entry_moments"
    ADD CONSTRAINT "member_entry_moments_destination_locality_id_fkey" FOREIGN KEY ("destination_locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."member_entry_moments"
    ADD CONSTRAINT "member_entry_moments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."neighborhoods"
    ADD CONSTRAINT "neighborhoods_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_channel_preferences"
    ADD CONSTRAINT "notification_channel_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_release_notices"
    ADD CONSTRAINT "onboarding_release_notices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."post_follows"
    ADD CONSTRAINT "post_follows_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_follows"
    ADD CONSTRAINT "post_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_saves"
    ADD CONSTRAINT "post_saves_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_saves"
    ADD CONSTRAINT "post_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_community_same_locality" FOREIGN KEY ("community_id", "locality_id") REFERENCES "public"."communities"("id", "locality_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_affiliations"
    ADD CONSTRAINT "profile_affiliations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_suspensions"
    ADD CONSTRAINT "profile_suspensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_details"
    ADD CONSTRAINT "property_details_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_accounts"
    ADD CONSTRAINT "provider_accounts_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_accounts"
    ADD CONSTRAINT "provider_accounts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_accounts"
    ADD CONSTRAINT "provider_accounts_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."provider_accounts"
    ADD CONSTRAINT "provider_accounts_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."provider_accounts"
    ADD CONSTRAINT "provider_accounts_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."provider_catalog_items"
    ADD CONSTRAINT "provider_catalog_items_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_portfolio_photos"
    ADD CONSTRAINT "provider_portfolio_photos_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_profiles"
    ADD CONSTRAINT "provider_profiles_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_reach"
    ADD CONSTRAINT "provider_reach_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_replies"
    ADD CONSTRAINT "recommendation_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_replies"
    ADD CONSTRAINT "recommendation_replies_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."recommendation_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_reply_promotions"
    ADD CONSTRAINT "recommendation_reply_promotions_guide_entry_id_fkey" FOREIGN KEY ("guide_entry_id") REFERENCES "public"."arrival_guide_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_reply_promotions"
    ADD CONSTRAINT "recommendation_reply_promotions_promoted_by_fkey" FOREIGN KEY ("promoted_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_reply_promotions"
    ADD CONSTRAINT "recommendation_reply_promotions_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."recommendation_replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_last_resolved_reply_id_fkey" FOREIGN KEY ("last_resolved_reply_id") REFERENCES "public"."recommendation_replies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_resolved_reply_id_fkey" FOREIGN KEY ("resolved_reply_id") REFERENCES "public"."recommendation_replies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recommendation_saves"
    ADD CONSTRAINT "recommendation_saves_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."recommendation_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_saves"
    ADD CONSTRAINT "recommendation_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_request_photos"
    ADD CONSTRAINT "service_request_photos_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_provider_user_id_fkey" FOREIGN KEY ("provider_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_answered_by_fkey" FOREIGN KEY ("answered_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_group_interests"
    ADD CONSTRAINT "user_group_interests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_group_interests"
    ADD CONSTRAINT "user_group_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_locality_id_fkey" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "storage"."iceberg_namespaces"
    ADD CONSTRAINT "iceberg_namespaces_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_namespace_id_fkey" FOREIGN KEY ("namespace_id") REFERENCES "storage"."iceberg_namespaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



ALTER TABLE "private"."family_account_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."family_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."family_invite_code_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."provider_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."verification_document_removals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."verification_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."verification_outcomes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."account_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."arrival_guide_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "arrival_guide_select_approved_locality_member" ON "public"."arrival_guide_entries" FOR SELECT TO "authenticated" USING ((("status" = 'approved'::"text") AND ("private"."is_locality_member"("locality_id") OR "private"."has_current_locality"())));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comments_delete_own" ON "public"."comments" FOR DELETE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "comments_insert_member" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id")))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "comments_select_via_post" ON "public"."comments" FOR SELECT TO "authenticated" USING (((NOT "is_deleted") AND "private"."can_access_post"("post_id") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND (NOT "p"."is_deleted"))))));



CREATE POLICY "comments_update_own" ON "public"."comments" FOR UPDATE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id"))))));



ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communities_select_authenticated" ON "public"."communities" FOR SELECT TO "authenticated" USING (("is_deleted" = false));



ALTER TABLE "public"."community_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_join_reasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_join_reasons_select_author_or_moderator" ON "public"."community_join_reasons" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."community_memberships" "m"
  WHERE (("m"."community_id" = "community_join_reasons"."community_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."status" = 'approved'::"public"."community_membership_status") AND ("m"."role" = ANY (ARRAY['moderator'::"public"."community_membership_role", 'owner'::"public"."community_membership_role"])))))));



ALTER TABLE "public"."community_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_memberships_select_comember" ON "public"."community_memberships" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_community_member"("community_id")));



ALTER TABLE "public"."consent_acceptances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consent_acceptances_service_role_all" ON "public"."consent_acceptances" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."dm_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_blocks_delete_self" ON "public"."dm_blocks" FOR DELETE TO "authenticated" USING (("blocker_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "dm_blocks_insert_self" ON "public"."dm_blocks" FOR INSERT TO "authenticated" WITH CHECK (("blocker_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "dm_blocks_select_self" ON "public"."dm_blocks" FOR SELECT TO "authenticated" USING ((("blocker_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("blocked_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."dm_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_conversations_select_participant" ON "public"."dm_conversations" FOR SELECT TO "authenticated" USING ((("participant_a" = ( SELECT "auth"."uid"() AS "uid")) OR ("participant_b" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."dm_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_messages_insert_sender" ON "public"."dm_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_dm_participant"("conversation_id") AND (NOT "private"."is_dm_blocked_either_way"("conversation_id"))));



CREATE POLICY "dm_messages_select_participant" ON "public"."dm_messages" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."dm_conversations" "c"
  WHERE (("c"."id" = "dm_messages"."conversation_id") AND (("c"."participant_a" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."participant_b" = ( SELECT "auth"."uid"() AS "uid")))))) AND ("is_deleted" = false)));



ALTER TABLE "public"."dm_read_states" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_read_states_select_own" ON "public"."dm_read_states" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_dm_participant"("conversation_id")));



ALTER TABLE "public"."event_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_invites_insert_organizer" ON "public"."event_invites" FOR INSERT TO "authenticated" WITH CHECK ((("invited_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND "private"."can_receive_invite_to_event"("event_id", "invitee_user_id")));



CREATE POLICY "event_invites_select_invitee" ON "public"."event_invites" FOR SELECT TO "authenticated" USING (("invitee_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "event_invites_select_organizer" ON "public"."event_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "event_invites_update_participant" ON "public"."event_invites" FOR UPDATE TO "authenticated" USING ((("invitee_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("invitee_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."event_rsvps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_rsvps_delete_self" ON "public"."event_rsvps" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "event_rsvps_insert_self" ON "public"."event_rsvps" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."can_access_event"("event_id")));



CREATE POLICY "event_rsvps_select_locality_member" ON "public"."event_rsvps" FOR SELECT TO "authenticated" USING ("private"."can_access_event"("event_id"));



CREATE POLICY "event_rsvps_update_self" ON "public"."event_rsvps" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_insert_verified_member" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ((("organizer_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_verified_locality_member"("locality_id") AND "private"."is_active_locality_member"("locality_id")));



CREATE POLICY "events_select_locality_member" ON "public"."events" FOR SELECT TO "authenticated" USING (((("community_id" IS NOT NULL) AND "private"."is_community_member"("community_id")) OR (("community_id" IS NULL) AND ("group_id" IS NULL) AND ("private"."is_locality_member"("locality_id") OR "private"."has_current_locality"())) OR (("community_id" IS NULL) AND ("group_id" IS NOT NULL) AND ("private"."is_group_member"("group_id") OR (EXISTS ( SELECT 1
   FROM "public"."groups" "g"
  WHERE (("g"."id" = "events"."group_id") AND ("g"."visibility" = 'public'::"public"."group_visibility") AND (("g"."community_id" IS NULL) OR "private"."is_community_member"("g"."community_id")) AND "private"."is_locality_member"("g"."locality_id"))))))));



CREATE POLICY "events_update_organizer" ON "public"."events" FOR UPDATE TO "authenticated" USING (("organizer_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("organizer_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."group_join_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_join_reasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_join_reasons_select_author_or_moderator" ON "public"."group_join_reasons" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_group_moderator"("group_id")));



ALTER TABLE "public"."group_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_memberships_delete_moderator" ON "public"."group_memberships" FOR DELETE TO "authenticated" USING ("private"."is_group_moderator"("group_id"));



CREATE POLICY "group_memberships_delete_self" ON "public"."group_memberships" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "group_memberships_select" ON "public"."group_memberships" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."groups" "g"
  WHERE (("g"."id" = "group_memberships"."group_id") AND (("g"."visibility" = 'public'::"public"."group_visibility") OR "private"."is_group_member"("g"."id")))))));



ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_delete_owner" ON "public"."groups" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "groups_insert_verified_member" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_verified_locality_member"("locality_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "groups_select_locality_member" ON "public"."groups" FOR SELECT TO "authenticated" USING (("private"."is_locality_member"("locality_id") AND (("community_id" IS NULL) OR "private"."is_community_member"("community_id")) AND ("is_deleted" = false)));



CREATE POLICY "groups_update_owner" ON "public"."groups" FOR UPDATE TO "authenticated" USING ("private"."is_group_owner"("id"));



ALTER TABLE "public"."guide_article_revisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guide_article_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guide_article_sections_select_published_locality_member" ON "public"."guide_article_sections" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."guide_articles" "a"
     JOIN "public"."arrival_guide_entries" "e" ON (("e"."id" = "a"."entry_id")))
  WHERE (("a"."id" = "guide_article_sections"."article_id") AND ("a"."status" = 'published'::"text") AND ("e"."status" = 'approved'::"text") AND "private"."is_locality_member"("e"."locality_id")))));



ALTER TABLE "public"."guide_articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guide_articles_select_published_locality_member" ON "public"."guide_articles" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."arrival_guide_entries" "e"
  WHERE (("e"."id" = "guide_articles"."entry_id") AND ("e"."status" = 'approved'::"text") AND ("private"."is_locality_member"("e"."locality_id") OR "private"."has_current_locality"()))))));



ALTER TABLE "public"."guide_correction_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guide_correction_requests_insert_own" ON "public"."guide_correction_requests" FOR INSERT TO "authenticated" WITH CHECK ((("requester_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."guide_articles" "a"
     JOIN "public"."arrival_guide_entries" "e" ON (("e"."id" = "a"."entry_id")))
  WHERE (("a"."id" = "guide_correction_requests"."article_id") AND ("a"."status" = 'published'::"text") AND ("e"."status" = 'approved'::"text") AND "private"."is_locality_member"("e"."locality_id")))) AND (("section_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."guide_article_sections" "s"
  WHERE (("s"."id" = "guide_correction_requests"."section_id") AND ("s"."article_id" = "guide_correction_requests"."article_id")))))));



CREATE POLICY "guide_correction_requests_select_own" ON "public"."guide_correction_requests" FOR SELECT TO "authenticated" USING (("requester_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."guide_entry_saves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guide_entry_saves_delete_own" ON "public"."guide_entry_saves" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "guide_entry_saves_insert_own" ON "public"."guide_entry_saves" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."arrival_guide_entries" "entry"
  WHERE (("entry"."id" = "guide_entry_saves"."entry_id") AND ("entry"."status" = 'approved'::"text") AND "private"."is_locality_member"("entry"."locality_id"))))));



CREATE POLICY "guide_entry_saves_select_own" ON "public"."guide_entry_saves" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."hidden_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hidden_questions_delete_own" ON "public"."hidden_questions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "hidden_questions_insert_own" ON "public"."hidden_questions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."recommendation_requests" "r"
  WHERE ("r"."id" = "hidden_questions"."request_id")))));



CREATE POLICY "hidden_questions_select_own" ON "public"."hidden_questions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."indication_alert_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_alert_deliveries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_alert_deliveries_select_owner" ON "public"."listing_alert_deliveries" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."listing_alerts" "a"
  WHERE (("a"."id" = "listing_alert_deliveries"."alert_id") AND ("a"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."listing_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_alerts_delete_owner" ON "public"."listing_alerts" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "listing_alerts_insert_owner" ON "public"."listing_alerts" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "listing_alerts_select_owner" ON "public"."listing_alerts" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "listing_alerts_update_owner" ON "public"."listing_alerts" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."listing_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_photos_delete_owner" ON "public"."listing_photos" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "listing_photos_insert_owner" ON "public"."listing_photos" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "listing_photos_select_scoped" ON "public"."listing_photos" FOR SELECT TO "authenticated" USING ("private"."can_read_listing"("listing_id"));



CREATE POLICY "listing_photos_update_owner" ON "public"."listing_photos" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_photos"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."listing_saves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_saves_delete_owner" ON "public"."listing_saves" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "listing_saves_insert_reader" ON "public"."listing_saves" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."can_read_listing"("listing_id")));



CREATE POLICY "listing_saves_select_owner" ON "public"."listing_saves" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."listing_status_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_status_events_select_owner" ON "public"."listing_status_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_status_events"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listings_delete_owner" ON "public"."listings" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "listings_insert_owner" ON "public"."listings" FOR INSERT TO "authenticated" WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid"))) AND (("community_id" IS NULL) OR "private"."is_community_member"("community_id")) AND (("locality_id" IS NULL) OR "private"."is_locality_member"("locality_id"))));



CREATE POLICY "listings_select_scoped" ON "public"."listings" FOR SELECT TO "authenticated" USING ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."can_read_listing"("id")));



CREATE POLICY "listings_update_owner" ON "public"."listings" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("community_id" IS NULL) OR "private"."is_community_member"("community_id")) AND (("locality_id" IS NULL) OR "private"."is_locality_member"("locality_id"))));



ALTER TABLE "public"."localities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "localities_select_same_membership" ON "public"."localities" FOR SELECT TO "authenticated" USING (("private"."is_locality_member"("id") OR "private"."has_current_locality"()));



ALTER TABLE "public"."locality_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locality_memberships_select_self" ON "public"."locality_memberships" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."member_entry_moments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member_entry_moments_select_self" ON "public"."member_entry_moments" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."national_holidays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."neighborhoods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "neighborhoods_select_authenticated" ON "public"."neighborhoods" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."notification_channel_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_channel_preferences_insert_own" ON "public"."notification_channel_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notification_channel_preferences_select_own" ON "public"."notification_channel_preferences" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notification_channel_preferences_update_own" ON "public"."notification_channel_preferences" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notification_opt_outs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_preferences_insert_own" ON "public"."notification_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notification_preferences_select_own" ON "public"."notification_preferences" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notification_preferences_update_own" ON "public"."notification_preferences" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select_recipient" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("recipient_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notifications_update_recipient" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("recipient_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."onboarding_release_notices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "onboarding_release_notices_insert_own" ON "public"."onboarding_release_notices" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "onboarding_release_notices_select_own" ON "public"."onboarding_release_notices" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "onboarding_release_notices_update_own" ON "public"."onboarding_release_notices" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."operators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_follows_delete_own" ON "public"."post_follows" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "post_follows_insert_own" ON "public"."post_follows" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "post_follows_select_own" ON "public"."post_follows" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_follows"."post_id") AND (NOT "p"."is_deleted"))))));



ALTER TABLE "public"."post_reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_reactions_delete_own" ON "public"."post_reactions" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "post_reactions_insert_locality_member" ON "public"."post_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_reactions"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id")))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "post_reactions_insert_self" ON "public"."post_reactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_reactions"."post_id") AND "private"."can_write_post_to"("p"."locality_id", "p"."community_id", "p"."group_id")))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "post_reactions_select_locality_member" ON "public"."post_reactions" FOR SELECT TO "authenticated" USING (("private"."can_access_post"("post_id") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_reactions"."post_id") AND (NOT "p"."is_deleted"))))));



ALTER TABLE "public"."post_saves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_saves_delete_own" ON "public"."post_saves" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "post_saves_insert_own" ON "public"."post_saves" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."can_access_post"("post_id") AND "private"."post_accepts_interaction"("post_id") AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "post_saves_select_own" ON "public"."post_saves" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_saves"."post_id") AND (NOT "p"."is_deleted"))))));



ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "posts_delete_own" ON "public"."posts" FOR DELETE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "posts_insert_locality_member" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("group_id" IS NOT NULL) AND "private"."can_write_post_to"("locality_id", "community_id", "group_id") AND (NOT "public"."is_account_suspended"("auth"."uid"())) AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "posts_select_locality_member" ON "public"."posts" FOR SELECT TO "authenticated" USING (((NOT "is_deleted") AND "private"."can_access_post_scope"("locality_id", "community_id", "group_id")));



CREATE POLICY "posts_update_own" ON "public"."posts" FOR UPDATE TO "authenticated" USING (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((NOT "is_deleted") AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."can_write_post_to"("locality_id", "community_id", "group_id")));



ALTER TABLE "public"."profile_affiliations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_affiliations_delete_self" ON "public"."profile_affiliations" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profile_affiliations_insert_self" ON "public"."profile_affiliations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profile_affiliations_select_own" ON "public"."profile_affiliations" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



COMMENT ON POLICY "profile_affiliations_select_own" ON "public"."profile_affiliations" IS 'O dono le as proprias linhas (inclusive as ocultas, para poder editar). Terceiro nao lista a tabela: a leitura de outra pessoa passa por public.profile_affiliations_for(). A policy nao consegue expressar "so este alvo", e era exatamente isso que permitia a enumeracao em lote.';



CREATE POLICY "profile_affiliations_update_self" ON "public"."profile_affiliations" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."profile_suspensions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_suspensions_select_own" ON "public"."profile_suspensions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_select_community_comember" ON "public"."profiles" FOR SELECT TO "authenticated" USING (((NOT "private"."account_deletion_requested"("user_id")) AND (EXISTS ( SELECT 1
   FROM ("public"."community_memberships" "mine"
     JOIN "public"."community_memberships" "theirs" ON (("theirs"."community_id" = "mine"."community_id")))
  WHERE (("mine"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("mine"."status" = 'approved'::"public"."community_membership_status") AND ("theirs"."user_id" = "profiles"."user_id") AND ("theirs"."status" = 'approved'::"public"."community_membership_status"))))));



CREATE POLICY "profiles_select_visible_in_locality" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ((NOT "private"."account_deletion_requested"("user_id")) AND "private"."shares_locality_with"("user_id"))));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."property_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_details_delete_owner" ON "public"."property_details" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "property_details"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "property_details_insert_owner" ON "public"."property_details" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "property_details"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "property_details_select_scoped" ON "public"."property_details" FOR SELECT TO "authenticated" USING ("private"."can_read_listing"("listing_id"));



CREATE POLICY "property_details_update_owner" ON "public"."property_details" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "property_details"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "property_details"."listing_id") AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."provider_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_accounts_select_self" ON "public"."provider_accounts" FOR SELECT TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."provider_catalog_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_catalog_items_delete_owner" ON "public"."provider_catalog_items" FOR DELETE TO "authenticated" USING ("public"."can_manage_provider_profile"("provider_id"));



CREATE POLICY "provider_catalog_items_insert_owner" ON "public"."provider_catalog_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_provider_profile"("provider_id"));



CREATE POLICY "provider_catalog_items_select_scoped" ON "public"."provider_catalog_items" FOR SELECT TO "authenticated" USING ("private"."can_see_provider"("provider_id"));



CREATE POLICY "provider_catalog_items_update_owner" ON "public"."provider_catalog_items" FOR UPDATE TO "authenticated" USING ("public"."can_manage_provider_profile"("provider_id")) WITH CHECK ("public"."can_manage_provider_profile"("provider_id"));



ALTER TABLE "public"."provider_portfolio_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_portfolio_photos_delete_owner" ON "public"."provider_portfolio_photos" FOR DELETE TO "authenticated" USING ("public"."can_manage_provider_profile"("provider_id"));



CREATE POLICY "provider_portfolio_photos_insert_owner" ON "public"."provider_portfolio_photos" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_provider_profile"("provider_id"));



CREATE POLICY "provider_portfolio_photos_select_scoped" ON "public"."provider_portfolio_photos" FOR SELECT TO "authenticated" USING ("private"."can_see_provider"("provider_id"));



CREATE POLICY "provider_portfolio_photos_update_owner" ON "public"."provider_portfolio_photos" FOR UPDATE TO "authenticated" USING ("public"."can_manage_provider_profile"("provider_id")) WITH CHECK ("public"."can_manage_provider_profile"("provider_id"));



ALTER TABLE "public"."provider_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_profiles_delete_owner" ON "public"."provider_profiles" FOR DELETE TO "authenticated" USING ("public"."can_manage_provider_profile"("id"));



CREATE POLICY "provider_profiles_insert_owner" ON "public"."provider_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_provider_account"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "provider_profiles_select_scoped" ON "public"."provider_profiles" FOR SELECT TO "authenticated" USING (((NOT "is_deleted") AND "private"."can_see_provider"("id")));



CREATE POLICY "provider_profiles_update_owner" ON "public"."provider_profiles" FOR UPDATE TO "authenticated" USING ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_provider_account"(( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_provider_account"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."provider_reach" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_reach_delete_owner_free_community" ON "public"."provider_reach" FOR DELETE TO "authenticated" USING ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id"))))));



CREATE POLICY "provider_reach_insert_owner_free_community" ON "public"."provider_reach" FOR INSERT TO "authenticated" WITH CHECK ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id"))))));



CREATE POLICY "provider_reach_select_scoped" ON "public"."provider_reach" FOR SELECT TO "authenticated" USING ("private"."can_see_provider"("provider_id"));



CREATE POLICY "provider_reach_update_owner_free_community" ON "public"."provider_reach" FOR UPDATE TO "authenticated" USING ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id")))))) WITH CHECK ((("source" = 'free'::"public"."provider_reach_source") AND ("scope_type" = 'community'::"public"."provider_reach_scope") AND (EXISTS ( SELECT 1
   FROM ("public"."provider_profiles" "p"
     JOIN "public"."provider_accounts" "pa" ON (("pa"."auth_user_id" = "p"."owner_user_id")))
  WHERE (("p"."id" = "provider_reach"."provider_id") AND ("p"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."revoked_at" IS NULL) AND ("pa"."community_id" = "provider_reach"."scope_id"))))));



ALTER TABLE "public"."recommendation_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recommendation_replies_delete_own" ON "public"."recommendation_replies" FOR DELETE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "recommendation_replies_insert" ON "public"."recommendation_replies" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."recommendation_requests" "req"
  WHERE (("req"."id" = "recommendation_replies"."request_id") AND ((("req"."locality_id" IS NOT NULL) AND "private"."can_see_locality_recommendation"("req"."locality_id")) OR (("req"."group_id" IS NOT NULL) AND "private"."is_group_member"("req"."group_id"))))))));



CREATE POLICY "recommendation_replies_select" ON "public"."recommendation_replies" FOR SELECT TO "authenticated" USING (((("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."recommendation_requests" "req"
  WHERE (("req"."id" = "recommendation_replies"."request_id") AND ((("req"."locality_id" IS NOT NULL) AND "private"."can_see_locality_recommendation"("req"."locality_id")) OR (("req"."group_id" IS NOT NULL) AND "private"."is_group_member"("req"."group_id"))))))) AND ("is_deleted" = false)));



CREATE POLICY "recommendation_replies_update_own" ON "public"."recommendation_replies" FOR UPDATE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."recommendation_reply_promotions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recommendation_requests_delete_own" ON "public"."recommendation_requests" FOR DELETE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "recommendation_requests_insert_locality" ON "public"."recommendation_requests" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((("locality_id" IS NOT NULL) AND ("group_id" IS NULL) AND "private"."is_locality_member"("locality_id")) OR (("locality_id" IS NULL) AND ("group_id" IS NOT NULL) AND "private"."is_group_member"("group_id")) OR (("locality_id" IS NOT NULL) AND ("group_id" IS NOT NULL)))));



CREATE POLICY "recommendation_requests_select_locality" ON "public"."recommendation_requests" FOR SELECT TO "authenticated" USING (((("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("locality_id" IS NOT NULL) AND "private"."can_see_locality_recommendation"("locality_id")) OR (("group_id" IS NOT NULL) AND "private"."is_group_member"("group_id"))) AND ("is_deleted" = false)));



CREATE POLICY "recommendation_requests_update_own" ON "public"."recommendation_requests" FOR UPDATE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."recommendation_saves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recommendation_saves_delete_own" ON "public"."recommendation_saves" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "recommendation_saves_insert_own" ON "public"."recommendation_saves" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."recommendation_requests" "req"
  WHERE (("req"."id" = "recommendation_saves"."request_id") AND (("req"."locality_id" IS NOT NULL) AND "private"."can_see_locality_recommendation"("req"."locality_id")))))));



CREATE POLICY "recommendation_saves_select_own" ON "public"."recommendation_saves" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_insert_authenticated" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK ((("reporter_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((EXISTS ( SELECT 1
   FROM "public"."locality_memberships"
  WHERE ("locality_memberships"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("private"."is_provider_account"(( SELECT "auth"."uid"() AS "uid")) AND ("target_type" = 'message'::"public"."report_target_type"))) AND (NOT "public"."is_account_suspended"(( SELECT "auth"."uid"() AS "uid"))) AND (NOT "private"."account_deletion_requested"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "reports_select_reporter_only" ON "public"."reports" FOR SELECT TO "authenticated" USING (("reporter_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."service_request_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_request_photos_insert_requester" ON "public"."service_request_photos" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_requests" "r"
  WHERE (("r"."id" = "service_request_photos"."request_id") AND ("r"."requester_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "service_request_photos_select_participant" ON "public"."service_request_photos" FOR SELECT TO "authenticated" USING ("private"."can_read_service_request"("request_id"));



ALTER TABLE "public"."service_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_requests_select_participant" ON "public"."service_requests" FOR SELECT TO "authenticated" USING ((("requester_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("provider_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_select_own" ON "public"."support_tickets" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_group_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waitlist_service_role_all" ON "public"."waitlist" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "avatars_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND ("owner" = "auth"."uid"())));



CREATE POLICY "avatars_select_authenticated" ON "storage"."objects" FOR SELECT TO "authenticated" USING (("bucket_id" = 'avatars'::"text"));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_images_delete_owner" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'community-images'::"text") AND ("owner" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_community_image_owner"("name")));



CREATE POLICY "community_images_select_reachable" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'community-images'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."is_deleted" = false) AND (("c"."banner_path" = "objects"."name") OR ("c"."thumbnail_path" = "objects"."name")) AND "private"."is_locality_member"("c"."locality_id"))))));



CREATE POLICY "event_photos_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'event-photos'::"text") AND ("owner" = "auth"."uid"())));



CREATE POLICY "event_photos_select_scoped" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'event-photos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."photo_path" = "objects"."name") AND "private"."is_locality_member"("p"."locality_id"))))));



ALTER TABLE "storage"."iceberg_namespaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."iceberg_tables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_photos_storage_delete_owner" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'listing-photos'::"text") AND ("owner" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE ((("l"."id")::"text" = ("storage"."foldername"("objects"."name"))[1]) AND ("l"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "listing_photos_storage_select_scoped" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'listing-photos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE ((("l"."id")::"text" = ("storage"."foldername"("objects"."name"))[1]) AND "private"."can_read_listing"("l"."id"))))));



ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_photos_select_scoped" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'provider-photos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."provider_profiles" "p"
  WHERE ((("p"."id")::"text" = ("storage"."foldername"("objects"."name"))[1]) AND "private"."can_see_provider"("p"."id"))))));



ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_request_photos_storage_select_participant" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'service-request-photos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."service_requests" "r"
  WHERE ((("r"."id")::"text" = ("storage"."foldername"("objects"."name"))[1]) AND "private"."can_read_service_request"("r"."id"))))));



ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "private" TO "authenticated";
GRANT USAGE ON SCHEMA "private" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



REVOKE ALL ON FUNCTION "private"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."account_deletion_batch_size"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."account_deletion_claim_due"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."account_deletion_dispatch_due"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."account_deletion_requested"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."account_deletion_requested"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."account_deletion_retry_ceiling"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."account_deletion_retry_interval"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."account_deletion_window"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."can_access_event"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_event"("p_event_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_access_post"("p_post_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_post"("p_post_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_access_post_scope"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_post_scope"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_dm_between"("p_user_a" "uuid", "p_user_b" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_dm_between"("p_user_a" "uuid", "p_user_b" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_read_listing"("p_listing_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_read_listing"("p_listing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."can_read_listing"("p_listing_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."can_read_service_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_read_service_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."can_read_service_request"("p_request_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_see_locality_recommendation"("target_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_see_locality_recommendation"("target_locality_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_see_provider"("p_provider_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_see_provider"("p_provider_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."can_see_provider"("p_provider_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."can_user_read_listing"("p_user_id" "uuid", "p_listing_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_user_read_listing"("p_user_id" "uuid", "p_listing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."can_user_read_listing"("p_user_id" "uuid", "p_listing_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."can_write_post_to"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_write_post_to"("p_locality_id" "uuid", "p_community_id" "uuid", "p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."check_verified_holder"("p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."consume_group_join_attempt"("p_group_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."consume_verification_attempt"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."consume_verification_attempt"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."dispatch_indication_alerts"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."dispatch_indication_digest"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."dispatch_listing_alerts"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."display_name_ok"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."display_name_ok"("p_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "private"."display_name_ok"("p_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."dm_context_valid"("p_a" "uuid", "p_b" "uuid", "p_type" "public"."dm_context_type", "p_context_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."dm_context_valid"("p_a" "uuid", "p_b" "uuid", "p_type" "public"."dm_context_type", "p_context_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."enforce_group_join_attempt_limit"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "private"."family_invite_code_attempt_gate"("p_origin_digest" "bytea", "p_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."family_invite_code_attempt_gate"("p_origin_digest" "bytea", "p_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."family_invite_code_rate_limit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."family_invite_code_rate_limit"() TO "service_role";



REVOKE ALL ON FUNCTION "private"."family_invite_email_hint"("p_email" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."group_notify_allows"("p_group_id" "uuid", "p_kind" "text", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guide_candidate_min_confidence"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guide_candidate_enqueue"("p_reply_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_confidence" smallint, "p_min_confidence" smallint) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guide_candidate_locality_has_name"("p_locality_id" "uuid", "p_name" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guide_candidate_max_per_locality"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guide_candidate_name_key"("p_name" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guide_candidate_prepare"("p_max_per_locality" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."guide_candidate_select_due"("p_max_per_locality" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."has_accepted_family"("p_holder_user_id" "uuid", "p_family_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_accepted_family"("p_holder_user_id" "uuid", "p_family_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."has_current_locality"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_current_locality"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."holder_locality_at_acceptance"("p_link_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."holder_locality_at_acceptance"("p_link_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."indication_alert_daily_cap"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."indication_recipients"("p_request_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."indication_terms"("p_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."indication_terms"("p_text" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_active_locality_member"("target_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_active_locality_member"("target_locality_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_cep_like"("p_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_cep_like"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "private"."is_cep_like"("p_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "private"."is_community_image_owner"("p_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_community_image_owner"("p_path" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_community_member"("p_community_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_community_member"("p_community_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_dm_blocked_by_other"("p_conversation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_dm_blocked_by_other"("p_conversation_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "private"."is_dm_blocked_either_way"("p_conversation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_dm_participant"("p_conversation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_dm_participant"("p_conversation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_event_locality_member"("target_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_event_locality_member"("target_event_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_group_member"("p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_group_member"("p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_group_moderator"("p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_group_moderator"("p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_group_owner"("p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_group_owner"("p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_locality_member"("target_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_locality_member"("target_locality_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_operator"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_operator"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_operator"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_operator"("target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_provider_account"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_provider_account"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."is_provider_account"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."is_verified_holder"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_verified_holder"("target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_verified_locality_member"("target_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_verified_locality_member"("target_locality_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."list_pending_invites"("p_inviter_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."list_pending_invites"("p_inviter_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."list_pending_invites_with_hint"("p_inviter_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."list_pending_invites_with_hint"("p_inviter_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."listing_alert_cleanup"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."listings_guard_status_transition"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."lock_family_invite_code_attempts"("p_origin_digest" "bytea", "p_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."lock_family_invite_code_attempts"("p_origin_digest" "bytea", "p_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."mark_recommendation_reply_edited"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."mark_recommendation_request_edited"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."member_business_reach_follows_owner"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."move_member_business_reach"("p_user_id" "uuid", "p_locality_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."neighborhood_name_key"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."neighborhood_name_key"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "private"."neighborhood_name_key"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "private"."notification_channel_allows"("p_type" "text", "p_channel" "public"."notification_channel", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notification_type_enabled"("p_type" "text", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notification_type_key"("p_type" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notify_indication"("p_user_id" "uuid", "p_request_id" "uuid", "p_kind" "text", "p_locality_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notify_recommendation_reply"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."notify_recommendation_reply"() TO "service_role";



REVOKE ALL ON FUNCTION "private"."notify_recommendation_reply_followers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."notify_recommendation_reply_followers"() TO "service_role";



REVOKE ALL ON FUNCTION "private"."outbox_base_retry_interval"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."outbox_dispatch_due"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."outbox_is_due"("p_updated_at" timestamp with time zone, "p_attempts" integer, "p_at" timestamp with time zone) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."outbox_max_attempts"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."outbox_preference_allows"("p_type" "text", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."outbox_prepare_due"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."post_accepts_interaction"("p_post_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."post_accepts_interaction"("p_post_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."promote_operator_by_email"("target_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."promote_operator_by_email"("target_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "private"."purge_stale_group_join_reasons"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."record_family_invite_code_failure"("p_origin_digest" "bytea", "p_email_digest" "bytea", "p_code_hash" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."record_family_invite_code_failure"("p_origin_digest" "bytea", "p_email_digest" "bytea", "p_code_hash" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."renumber_listing_photos"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."renumber_listing_photos"() TO "service_role";



REVOKE ALL ON FUNCTION "private"."reopen_request_on_resolved_reply_delete"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "private"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."service_request_mark_first_response"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."set_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."shares_locality_with"("p_target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."shares_locality_with"("p_target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "private"."verification_status", "p_eligibility_class" "private"."eligibility_class") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "private"."verification_status", "p_eligibility_class" "private"."eligibility_class") TO "service_role";



REVOKE ALL ON FUNCTION "private"."validate_event_cover_path"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_recommendation_resolved_reply"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."validate_recommendation_resolved_reply"() TO "service_role";



REVOKE ALL ON FUNCTION "private"."verification_dispatch_reconcile"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."verification_documents_purge_expired"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."verification_max_reconcile_attempts"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."verification_reconcile_candidates"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."verification_reconcile_lease"("p_user_ids" "uuid"[]) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."verified_holder_active_invitations"("holder_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."verified_holder_active_invitations"("holder_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_community_invitation"("p_token_digest" "bytea", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_community_invitation"("p_token_digest" "bytea", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_family_invitation"("p_token_digest" "bytea", "p_accepted_by_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_provider_invitation"("p_token" "text", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_provider_invitation"("p_token" "text", "p_email" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."add_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."add_to_waitlist"("p_email" "text", "p_city_name" "text", "p_state_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_to_waitlist"("p_email" "text", "p_city_name" "text", "p_state_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."advance_recurring_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."advance_recurring_events"() TO "service_role";



GRANT SELECT ON TABLE "public"."support_tickets" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("user_id") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("email") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("topic") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("body") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("reply") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."support_tickets" TO "authenticated";



GRANT SELECT("answered_at") ON TABLE "public"."support_tickets" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."answer_support_ticket"("p_ticket_id" "uuid", "p_reply" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."answer_support_ticket"("p_ticket_id" "uuid", "p_reply" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."apply_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text", "p_section_title" "text", "p_section_body" "text", "p_summary" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text", "p_section_title" "text", "p_section_body" "text", "p_summary" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_group_member"("p_group_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_group_member"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."can_manage_provider_profile"("p_provider_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_provider_profile"("p_provider_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_provider_profile"("p_provider_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_receive_invite_to_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_community_request"("p_community_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_community_request"("p_community_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."cancel_service_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_service_request"("p_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."check_recurrence_holiday"("p_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_recurrence_holiday"("p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_recurrence_holiday"("p_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."clear_recommendation_resolved_reply"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clear_recommendation_resolved_reply"("p_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."close_service_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."close_service_request"("p_request_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."complete_event"("p_event_id" "uuid", "p_caller_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_event"("p_event_id" "uuid", "p_caller_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_verification_document_removal"("p_storage_object_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_verification_document_removal"("p_storage_object_path" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_verification_attempt"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_verification_attempt"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."conversation_counterpart_name"("p_conversation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."conversation_counterpart_name"("p_conversation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_locality_id" "uuid", "p_owner_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_community"("p_name" "text", "p_description" "text", "p_locality_id" "uuid", "p_owner_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_community_invitation"("p_community_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_expires_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_community_invitation"("p_community_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_expires_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_family_invitation"("p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_invitee_email_hint" "text", "p_code_hash" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_group"("p_name" "text", "p_visibility" "public"."group_visibility", "p_locality_id" "uuid", "p_description" "text", "p_rules" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_group"("p_name" "text", "p_visibility" "public"."group_visibility", "p_locality_id" "uuid", "p_description" "text", "p_rules" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_group_in_community"("p_name" "text", "p_description" "text", "p_visibility" "public"."group_visibility", "p_community_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_group_in_community"("p_name" "text", "p_description" "text", "p_visibility" "public"."group_visibility", "p_community_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_member_business_page"("p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_member_business_page"("p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_property_listing"("p_listing" "jsonb", "p_details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_property_listing"("p_listing" "jsonb", "p_details" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_provider_invitation"("p_community_id" "uuid", "p_email" "text", "p_display_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_provider_invitation"("p_community_id" "uuid", "p_email" "text", "p_display_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_service_request"("p_provider_id" "uuid", "p_description" "text", "p_when_text" "text", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_service_request"("p_provider_id" "uuid", "p_description" "text", "p_when_text" "text", "p_idempotency_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."decide_verification_document"("p_document_id" "uuid", "p_decision" "text", "p_reason" "text", "p_operator_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decide_verification_document"("p_document_id" "uuid", "p_decision" "text", "p_reason" "text", "p_operator_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."declare_locality_transfer"("p_destination_locality_id" "uuid", "p_term_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."declare_locality_transfer"("p_destination_locality_id" "uuid", "p_term_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."declare_locality_transfer"("p_destination_locality_id" "uuid", "p_term_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."degrade_locality_origins"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."degrade_locality_origins"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_group"("p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_group"("p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."family_accept_holder_locality"("p_link_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."family_accept_holder_locality"("p_link_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."family_invite_code_accept"("p_code_hash" "bytea", "p_accepted_by_user_id" "uuid", "p_origin_digest" "bytea", "p_display_name" "text", "p_consent_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."family_invite_code_preview"("p_code_hash" "bytea", "p_origin_digest" "bytea", "p_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "public"."feed_community"("p_community_id" "uuid", "p_order" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."feed_community"("p_community_id" "uuid", "p_order" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."feed_following"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."feed_following"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."feed_group"("p_group_id" "uuid", "p_order" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."feed_group"("p_group_id" "uuid", "p_order" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."feed_posts"("p_locality_id" "uuid", "p_order" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."feed_posts"("p_locality_id" "uuid", "p_order" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."finalize_account_deletion"("p_user_id" "uuid", "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_account_deletion"("p_user_id" "uuid", "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_profile_bio"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_profile_bio"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_profile_neighborhood"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_profile_neighborhood"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_provider_contact_phone"("p_provider_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_provider_contact_phone"("p_provider_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."has_accepted_consent"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_accepted_consent"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_verified_family_holder"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_verified_family_holder"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_account_deletion_pending"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_account_deletion_pending"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_account_suspended"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_account_suspended"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_community_member"("p_community_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_community_member"("p_community_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_current_user_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_current_user_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_current_user_operator"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_current_user_operator"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_provider_account"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_provider_account"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_verified_holder"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_verified_holder"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."join_group"("p_group_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_group"("p_group_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."leave_community"("p_community_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."leave_community"("p_community_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_available_groups_for_interests"("p_user_id" "uuid", "p_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_available_groups_for_interests"("p_user_id" "uuid", "p_locality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_community_pending_arrivals"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_community_pending_arrivals"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_community_providers"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_community_providers"("p_community_id" "uuid", "p_user_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_group_activity"("p_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_group_activity"("p_locality_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_hidden_questions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_hidden_questions"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_indications"("p_locality_id" "uuid", "p_query" "text", "p_category" "public"."recommendation_category", "p_resolved" boolean, "p_limit" integer, "p_offset" integer, "p_mine" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_indications"("p_locality_id" "uuid", "p_query" "text", "p_category" "public"."recommendation_category", "p_resolved" boolean, "p_limit" integer, "p_offset" integer, "p_mine" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_invitable_members_for_event"("p_event_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_invitable_members_for_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_locality_arrivals_volume"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_locality_arrivals_volume"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_locality_state_codes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_locality_state_codes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_open_reports"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_open_reports"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_pending_community_invitations"("p_inviter_user_id" "uuid", "p_community_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_pending_community_invitations"("p_inviter_user_id" "uuid", "p_community_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_pending_invites"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_pending_invites"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_pending_invites_with_hint"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_pending_invites_with_hint"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_promotable_replies"("p_locality_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_promotable_replies"("p_locality_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_question_replies"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_question_replies"("p_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_user_group_interests"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_user_group_interests"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_verification_documents"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_verification_documents"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_verification_queue"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_verification_queue"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_seen_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_conversation_read"("p_conversation_id" "uuid", "p_seen_at" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mark_recommendation_reply_resolved"("p_request_id" "uuid", "p_reply_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_recommendation_reply_resolved"("p_request_id" "uuid", "p_reply_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mark_recommendation_resolved"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_recommendation_resolved"("p_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."my_account_kind"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_account_kind"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_account_kind"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_group_notify_level"("p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_group_notify_level"("p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."my_verification_document"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_verification_document"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_verification_document_paths"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_verification_document_paths"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_verification_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_verification_status"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."next_occurrence"("p_from" "date", "p_recurrence_type" "text", "p_recurrence_weekday" smallint, "p_recurrence_ordinal" smallint, "p_recurrence_day_of_month" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."next_occurrence"("p_from" "date", "p_recurrence_type" "text", "p_recurrence_weekday" smallint, "p_recurrence_ordinal" smallint, "p_recurrence_day_of_month" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_occurrence"("p_from" "date", "p_recurrence_type" "text", "p_recurrence_weekday" smallint, "p_recurrence_ordinal" smallint, "p_recurrence_day_of_month" smallint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."open_conversation"("p_other_user_id" "uuid", "p_context_type" "public"."dm_context_type", "p_context_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."open_conversation"("p_other_user_id" "uuid", "p_context_type" "public"."dm_context_type", "p_context_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."open_event_question"("p_event_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."open_event_question"("p_event_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."open_support_ticket"("p_topic" "public"."support_ticket_topic", "p_body" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."open_support_ticket"("p_topic" "public"."support_ticket_topic", "p_body" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."pin_group_post"("p_group_id" "uuid", "p_post_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pin_group_post"("p_group_id" "uuid", "p_post_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."profile_affiliations_for"("p_target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."profile_affiliations_for"("p_target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."profile_events_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."profile_events_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."profile_events_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."profile_is_visible_to_viewer"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."profile_is_visible_to_viewer"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."profile_is_visible_to_viewer"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."profile_posts_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."profile_posts_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."profile_posts_for"("p_target_user_id" "uuid", "p_viewer_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."promote_reply_to_guide_entry"("p_reply_id" "uuid", "p_locality_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text", "p_operator_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."promote_reply_to_guide_entry"("p_reply_id" "uuid", "p_locality_id" "uuid", "p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text", "p_operator_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_member_entry"("p_user_id" "uuid", "p_locality_id" "uuid", "p_display_name" "text", "p_consent_version" integer, "p_moment" "public"."entry_moment", "p_arrival_date" "date", "p_departure_date" "date", "p_destination_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_member_entry"("p_user_id" "uuid", "p_locality_id" "uuid", "p_display_name" "text", "p_consent_version" integer, "p_moment" "public"."entry_moment", "p_arrival_date" "date", "p_departure_date" "date", "p_destination_locality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_member_locality"("p_user_id" "uuid", "p_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_member_locality"("p_user_id" "uuid", "p_locality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_account_contact_data"("p_user_id" "uuid", "p_contact_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_account_contact_data"("p_user_id" "uuid", "p_contact_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."read_provider_invitation"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."read_provider_invitation"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."read_provider_invitation"("p_token" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."read_verification_document_path"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."read_verification_document_path"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."read_verification_status"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."read_verification_status"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_consent_acceptance"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_consent_acceptance"("p_user_id" "uuid", "p_consent_version" integer, "p_code_of_conduct_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_user_group_interests"("p_user_id" "uuid", "p_locality_id" "uuid", "p_group_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_user_group_interests"("p_user_id" "uuid", "p_locality_id" "uuid", "p_group_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_service_request_photo"("p_request_id" "uuid", "p_path" "text", "p_position" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_service_request_photo"("p_request_id" "uuid", "p_path" "text", "p_position" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reject_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_guide_correction"("p_request_id" "uuid", "p_operator_user_id" "uuid", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_pending_user"("p_user_id" "uuid", "p_operator_user_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_pending_user"("p_user_id" "uuid", "p_operator_user_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_community_member"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_community_moderator"("p_community_id" "uuid", "p_user_id" "uuid", "p_caller_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_group_moderator"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reopen_recommendation"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reopen_recommendation"("p_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."replace_listing_photo"("p_listing_id" "uuid", "p_path" "text", "p_position" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_listing_photo"("p_listing_id" "uuid", "p_path" "text", "p_position" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."replace_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_account_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_account_deletion"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."request_community_membership"("p_community_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_community_membership"("p_community_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resend_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid", "p_token_digest" "bytea", "p_invitee_email_digest" "bytea", "p_code_hash" "bytea") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_report"("p_report_id" "uuid", "p_operator_user_id" "uuid", "p_action" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_report"("p_report_id" "uuid", "p_operator_user_id" "uuid", "p_action" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reverse_locality_transfer"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reverse_locality_transfer"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_community_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_community_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_family_invitation"("p_invitation_id" "uuid", "p_inviter_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_provider_account"("p_provider_user_id" "uuid", "p_owner_user_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_provider_account"("p_provider_user_id" "uuid", "p_owner_user_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_neighborhoods"("p_locality_id" "uuid", "p_query" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_neighborhoods"("p_locality_id" "uuid", "p_query" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."search_providers"("p_category" "public"."provider_category", "p_community_id" "uuid", "p_query" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_providers"("p_category" "public"."provider_category", "p_community_id" "uuid", "p_query" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."send_conversation_message"("p_conversation_id" "uuid", "p_content" "text", "p_client_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."send_conversation_message"("p_conversation_id" "uuid", "p_content" "text", "p_client_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_community_image"("p_community_id" "uuid", "p_kind" "text", "p_path" "text", "p_caller_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_community_image"("p_community_id" "uuid", "p_kind" "text", "p_path" "text", "p_caller_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_group_notify_level"("p_group_id" "uuid", "p_level" "public"."group_notify_level") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_group_notify_level"("p_group_id" "uuid", "p_level" "public"."group_notify_level") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_group_rules"("p_group_id" "uuid", "p_rules" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_group_rules"("p_group_id" "uuid", "p_rules" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_profile_bio"("p_bio" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_profile_bio"("p_bio" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."settle_account_possessions"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."settle_account_possessions"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_verification_document"("p_user_id" "uuid", "p_storage_object_path" "text", "p_mime_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."suggest_groups_for_user"("p_user_id" "uuid", "p_locality_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."suggest_groups_for_user"("p_user_id" "uuid", "p_locality_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."suggest_guide_entry"("p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."suggest_guide_entry"("p_category" "public"."arrival_guide_category", "p_name" "text", "p_description" "text", "p_website_url" "text", "p_phone" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."transfer_community_ownership"("p_community_id" "uuid", "p_new_owner_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transfer_community_ownership"("p_community_id" "uuid", "p_new_owner_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."transfer_group_ownership"("p_group_id" "uuid", "p_new_owner_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transfer_group_ownership"("p_group_id" "uuid", "p_new_owner_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."transition_listing"("p_listing_id" "uuid", "p_action" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_listing"("p_listing_id" "uuid", "p_action" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."unpin_group_post"("p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unpin_group_post"("p_group_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_member_business_page"("p_provider_id" "uuid", "p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_member_business_page"("p_provider_id" "uuid", "p_display_name" "text", "p_category" "public"."provider_category", "p_bio" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_service_request"("p_request_id" "uuid", "p_description" "text", "p_when_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_service_request"("p_request_id" "uuid", "p_description" "text", "p_when_text" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "text", "p_eligibility_class" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_verification_outcome"("p_user_id" "uuid", "p_status" "text", "p_eligibility_class" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."verification_reconcile_step"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verification_reconcile_step"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "private"."family_account_links" TO "service_role";



GRANT ALL ON TABLE "private"."family_invitations" TO "service_role";



GRANT ALL ON TABLE "private"."family_invite_code_attempts" TO "service_role";



GRANT ALL ON TABLE "private"."verification_document_removals" TO "service_role";



GRANT ALL ON TABLE "private"."verification_documents" TO "service_role";



GRANT ALL ON TABLE "private"."verification_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."account_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."arrival_guide_entries" TO "service_role";
GRANT SELECT ON TABLE "public"."arrival_guide_entries" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comments" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."comments" TO "authenticated";



GRANT UPDATE("is_deleted") ON TABLE "public"."comments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."communities" TO "service_role";
GRANT SELECT ON TABLE "public"."communities" TO "authenticated";



GRANT ALL ON TABLE "public"."community_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."community_join_reasons" TO "service_role";
GRANT SELECT ON TABLE "public"."community_join_reasons" TO "authenticated";



GRANT ALL ON TABLE "public"."community_memberships" TO "service_role";
GRANT SELECT ON TABLE "public"."community_memberships" TO "authenticated";



GRANT ALL ON TABLE "public"."consent_acceptances" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dm_blocks" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."dm_blocks" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dm_conversations" TO "service_role";
GRANT SELECT ON TABLE "public"."dm_conversations" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dm_messages" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."dm_messages" TO "authenticated";



GRANT UPDATE("is_deleted") ON TABLE "public"."dm_messages" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dm_read_states" TO "service_role";
GRANT SELECT ON TABLE "public"."dm_read_states" TO "authenticated";



GRANT ALL ON TABLE "public"."event_invites" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."event_invites" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."event_rsvps" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_rsvps" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."events" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."events" TO "authenticated";



GRANT UPDATE("cover_path") ON TABLE "public"."events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."group_join_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."group_join_reasons" TO "service_role";
GRANT SELECT ON TABLE "public"."group_join_reasons" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."group_memberships" TO "service_role";
GRANT DELETE ON TABLE "public"."group_memberships" TO "authenticated";



GRANT SELECT("group_id") ON TABLE "public"."group_memberships" TO "authenticated";



GRANT SELECT("user_id") ON TABLE "public"."group_memberships" TO "authenticated";



GRANT SELECT("role") ON TABLE "public"."group_memberships" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."group_memberships" TO "authenticated";



GRANT SELECT("joined_at") ON TABLE "public"."group_memberships" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."groups" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."groups" TO "authenticated";



GRANT UPDATE("is_deleted") ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."guide_article_revisions" TO "service_role";



GRANT ALL ON TABLE "public"."guide_article_sections" TO "service_role";
GRANT SELECT ON TABLE "public"."guide_article_sections" TO "authenticated";



GRANT ALL ON TABLE "public"."guide_articles" TO "service_role";
GRANT SELECT ON TABLE "public"."guide_articles" TO "authenticated";



GRANT ALL ON TABLE "public"."guide_correction_requests" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."guide_correction_requests" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."guide_entry_saves" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."guide_entry_saves" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hidden_questions" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."hidden_questions" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."indication_alert_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."listing_alert_deliveries" TO "service_role";
GRANT SELECT ON TABLE "public"."listing_alert_deliveries" TO "authenticated";



GRANT ALL ON TABLE "public"."listing_alerts" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."listing_alerts" TO "authenticated";



GRANT ALL ON TABLE "public"."listing_photos" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."listing_photos" TO "authenticated";



GRANT ALL ON TABLE "public"."listing_saves" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."listing_saves" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."listing_status_events" TO "service_role";
GRANT SELECT ON TABLE "public"."listing_status_events" TO "authenticated";



GRANT UPDATE ON SEQUENCE "public"."listing_status_events_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."listing_status_events_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."listing_status_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."listings" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."localities" TO "service_role";
GRANT SELECT ON TABLE "public"."localities" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."locality_memberships" TO "service_role";
GRANT SELECT ON TABLE "public"."locality_memberships" TO "authenticated";



GRANT ALL ON TABLE "public"."member_entry_moments" TO "service_role";
GRANT SELECT ON TABLE "public"."member_entry_moments" TO "authenticated";



GRANT ALL ON TABLE "public"."national_holidays" TO "service_role";



GRANT ALL ON TABLE "public"."neighborhoods" TO "service_role";
GRANT SELECT ON TABLE "public"."neighborhoods" TO "authenticated";



GRANT ALL ON TABLE "public"."notification_channel_preferences" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."notification_channel_preferences" TO "authenticated";



GRANT ALL ON TABLE "public"."notification_opt_outs" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."notification_preferences" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."notifications" TO "authenticated";



GRANT ALL ON TABLE "public"."onboarding_release_notices" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."onboarding_release_notices" TO "authenticated";



GRANT ALL ON TABLE "public"."operators" TO "service_role";
GRANT SELECT ON TABLE "public"."operators" TO "authenticated";



GRANT ALL ON TABLE "public"."outbox" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_follows" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_follows" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_reactions" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_reactions" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_saves" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."post_saves" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."posts" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."posts" TO "authenticated";



GRANT UPDATE("is_deleted") ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."profile_affiliations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profile_affiliations" TO "authenticated";



GRANT ALL ON TABLE "public"."profile_suspensions" TO "service_role";
GRANT SELECT ON TABLE "public"."profile_suspensions" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "service_role";
GRANT INSERT,UPDATE ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("user_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("visibility") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("consent_version") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("consented_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("bio") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT("show_neighborhood") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."property_details" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."property_details" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."provider_accounts" TO "service_role";
GRANT SELECT ON TABLE "public"."provider_accounts" TO "authenticated";



GRANT ALL ON TABLE "public"."provider_catalog_items" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."provider_catalog_items" TO "authenticated";



GRANT ALL ON TABLE "public"."provider_portfolio_photos" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."provider_portfolio_photos" TO "authenticated";



GRANT ALL ON TABLE "public"."provider_profiles" TO "service_role";
GRANT INSERT,DELETE,UPDATE ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("owner_user_id") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("display_name") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("category") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("bio") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("contact_is_public") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("is_deleted") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."provider_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."provider_reach" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."provider_reach" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_replies" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."recommendation_replies" TO "authenticated";



GRANT UPDATE("body") ON TABLE "public"."recommendation_replies" TO "authenticated";



GRANT UPDATE("is_deleted") ON TABLE "public"."recommendation_replies" TO "service_role";



GRANT ALL ON TABLE "public"."recommendation_reply_promotions" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_requests" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."recommendation_requests" TO "authenticated";



GRANT UPDATE("title") ON TABLE "public"."recommendation_requests" TO "authenticated";



GRANT UPDATE("body") ON TABLE "public"."recommendation_requests" TO "authenticated";



GRANT UPDATE("is_deleted") ON TABLE "public"."recommendation_requests" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_saves" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."recommendation_saves" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."reports" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."reports" TO "authenticated";



GRANT ALL ON TABLE "public"."service_request_photos" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."service_request_photos" TO "authenticated";



GRANT ALL ON TABLE "public"."service_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."service_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."user_group_interests" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."waitlist" TO "service_role";



GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "anon";



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";



GRANT ALL ON TABLE "storage"."iceberg_namespaces" TO "service_role";
GRANT SELECT ON TABLE "storage"."iceberg_namespaces" TO "authenticated";
GRANT SELECT ON TABLE "storage"."iceberg_namespaces" TO "anon";



GRANT ALL ON TABLE "storage"."iceberg_tables" TO "service_role";
GRANT SELECT ON TABLE "storage"."iceberg_tables" TO "authenticated";
GRANT SELECT ON TABLE "storage"."iceberg_tables" TO "anon";



GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




