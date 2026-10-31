-- 035: a triagem mostra o caso que o operador precisa decidir (H-Task 4)
--
-- F164: o card da fila exibe tipo, data absoluta, motivo e um UUID. O operador
-- nao ve o conteudo denunciado nem quem o escreveu, e o runbook §6 pede as duas
-- coisas. Sobre um UUID ninguem decide: abre outra aba, procura, desiste, e a
-- fila cresce.
--
-- Tres coisas que o card precisa e que so o banco sabe montar:
--
--   1. o trecho do conteudo, por tipo de alvo;
--   2. o nome de quem escreveu;
--   3. quantas denuncias ABERTAS o mesmo alvo ja tem — o sinal mais barato de
--      campanha coordenada, e que hoje nao existe em lugar nenhum. E sinal
--      para o operador, nunca gatilho: suspensao automatica por volume
--      transforma denuncia em arma (ADR-20260820-suspensao-de-conta, alt. D).
--
-- Por que RPC e nao embed no cliente: PostgREST so resolve embed onde existe
-- foreign key, e `reports.target_id` e polimorfico — nao ha FK para lugar
-- nenhum. Um `select("*, profiles(display_name)")` falharia em silencio e a
-- tela renderizaria vazia. E a licao que o README registra a partir da lista de
-- membros de grupo, que ficou quebrada em producao sem ninguem notar.
--
-- Desvio deliberado do plano: o plano previa a coluna `target_href`. Montar URL
-- em SQL espalha rota por duas camadas — o RPC devolve tipo e id, e a UI monta
-- o link. Se a rota mudar, muda num lugar so.

create function public.list_open_reports()
returns table (
  id uuid,
  target_type public.report_target_type,
  target_id uuid,
  reason text,
  created_at timestamptz,
  target_excerpt text,
  target_author_name text,
  open_reports_on_target integer
)
language sql
stable
security definer
set search_path = ''
as $$
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

revoke all on function public.list_open_reports() from public, anon, authenticated;
grant execute on function public.list_open_reports() to service_role;
