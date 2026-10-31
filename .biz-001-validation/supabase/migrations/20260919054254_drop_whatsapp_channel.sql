-- DECISAO DO RESPONSAVEL, 18/09/2026: o canal WhatsApp SAI do MVP.
--
-- O estado era ambiguo e por isso o card nao fechava: o banco tinha
-- outbox_channel com 'whatsapp', duas colunas de fallback e uma tabela de
-- opt-out por canal — enquanto o adaptador era unavailableAdapter('whatsapp')
-- (apps/web/lib/outbox/adapters.ts) e o app nao oferecia controle nenhum ao
-- usuario. Estrutura dizendo uma coisa e produto dizendo outra e o tipo de
-- confusao que ja custou caro aqui: o proximo leitor conclui que o canal
-- funciona. O card dizia, com todas as letras, que remover oficialmente do
-- lancamento era o caminho aceitavel — foi o escolhido.
--
-- O que sai, porque existia SO para o WhatsApp:
--   * o valor 'whatsapp' de public.outbox_channel;
--   * outbox.fallback_channel e outbox.fallback_reason — o fallback era
--     'e-mail falhou, cai para WhatsApp'. Sem segundo canal nao ha para onde
--     cair, e a coluna passa a mentir;
--   * os parametros correspondentes em private.outbox_apply_delivery.
--
-- O que FICA: notification_opt_outs. Ela e chaveada por canal e continua
-- fazendo sentido com um canal so (opt-out de e-mail e exigencia real), e
-- apagar tabela e mais destrutivo que tirar valor de enum. Ela esta vazia hoje.
--
-- REMOVER VALOR DE ENUM no Postgres nao tem ALTER TYPE ... DROP VALUE: o tipo
-- e recriado. A ordem importa e cada passo esta comentado abaixo, porque
-- errar a ordem aqui deixa coluna orfa apontando para tipo inexistente.

-- 1. Dados: so existe 'email'. Nenhuma linha usa 'whatsapp' — verificado por
--    select channel, count(*) from public.outbox group by channel (8 linhas,
--    todas email) e public.notification_opt_outs vazia. A guarda abaixo falha
--    alto se isso deixar de ser verdade, em vez de apagar dado em silencio.
do $$
begin
  if exists (select 1 from public.outbox where channel = 'whatsapp')
     or exists (select 1 from public.notification_opt_outs where channel = 'whatsapp')
     or exists (select 1 from public.outbox where fallback_channel = 'whatsapp') then
    raise exception 'existem linhas no canal whatsapp; a remocao exigiria migrar dado antes';
  end if;
end;
$$;

-- 2. As colunas de fallback primeiro: elas usam o tipo que vai ser recriado, e
--    recriar o tipo com elas no lugar exigiria recria-las de qualquer forma.
alter table public.outbox
  drop column fallback_channel,
  drop column fallback_reason;

-- 3. private.outbox_apply_delivery perde os dois parametros. A assinatura
--    antiga e removida explicitamente: create or replace nao resolve mudanca de
--    assinatura, deixaria as duas versoes vivas e a chamada viraria ambigua.
drop function if exists private.outbox_apply_delivery(uuid, public.outbox_status, integer, text, public.outbox_channel, text, timestamptz);

create function private.outbox_apply_delivery(
  p_id uuid,
  p_status public.outbox_status,
  p_attempts integer,
  p_last_error text,
  p_updated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.outbox
  set status = p_status,
      attempts = p_attempts,
      last_error = p_last_error,
      updated_at = p_updated_at
  where id = p_id;
end;
$$;

comment on function private.outbox_apply_delivery(uuid, public.outbox_status, integer, text, timestamptz) is
  'Persiste a mutacao produzida pelos adaptadores. O fallback por canal saiu junto com o WhatsApp (decisao de 18/09/2026): sem segundo canal nao ha para onde cair.';

-- 4. Recriar o tipo com um valor so. O tipo novo nasce com outro nome porque o
--    Postgres nao permite alterar o tipo de uma coluna para um tipo que ainda
--    esta sendo criado no mesmo comando, e porque reaproveitar o nome exigiria
--    dropar o antigo antes de as colunas migrarem.
create type public.outbox_channel_v2 as enum ('email');

alter table public.outbox
  alter column channel type public.outbox_channel_v2
  using channel::text::public.outbox_channel_v2;

alter table public.notification_opt_outs
  alter column channel type public.outbox_channel_v2
  using channel::text::public.outbox_channel_v2;

-- 5. As FUNCOES tambem dependem do tipo, e o drop falha alto se elas ficarem:
--    'cannot drop type outbox_channel because other objects depend on it'. Eram
--    duas alem da que ja ajustei no passo 3 — outbox_preference_user_id e
--    outbox_delivery_allowed. Recriar as duas apontando para o tipo novo e o que
--    libera o drop; a assinatura continua a mesma (o enum segue se chamando
--    outbox_channel, so com um valor), entao nada que as chama precisa mudar.
-- Dropar as versoes antigas PRIMEIRO: create or replace com tipo diferente NAO
-- substitui a funcao, cria uma sobrecarga. Sem isto ficariam duas versoes vivas
-- (uma por tipo) e a chamada viraria ambigua assim que o tipo antigo sumisse.
drop function if exists private.outbox_preference_user_id(public.outbox_channel, text, jsonb);
drop function if exists private.outbox_delivery_allowed(public.outbox_channel, text, text, jsonb);

create function private.outbox_preference_user_id(
  p_channel public.outbox_channel_v2,
  p_recipient text,
  p_payload jsonb
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  -- O 'else null' que existia aqui era o caminho do WhatsApp: sem canal, sem
  -- preferencia a checar. Com um canal so, o unico caso e email.
  select nullif(p_payload ->> 'user_id', '')::uuid;
$$;

create function private.outbox_delivery_allowed(
  p_channel public.outbox_channel_v2,
  p_recipient text,
  p_type text,
  p_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
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

comment on function private.outbox_delivery_allowed(public.outbox_channel_v2, text, text, jsonb) is
  'Decide se a linha pode ser entregue. Com um canal so (email), o ramo generico de tipo que existia para o WhatsApp saiu — nao ha segundo canal para o qual a preferencia pudesse diferir.';

-- 6. So agora o tipo antigo pode sair, e o novo assume o nome canonico: o
--    schema final tem um tipo chamado outbox_channel com um valor so, e nenhum
--    residuo de nome _v2.
drop type public.outbox_channel;
alter type public.outbox_channel_v2 rename to outbox_channel;

comment on type public.outbox_channel is
  'Canal de entrega do outbox. Um valor so (email) desde 18/09/2026: o WhatsApp saiu do MVP por decisao do responsavel, e o enum diz a verdade em vez de guardar um canal que o adaptador recusa.';
