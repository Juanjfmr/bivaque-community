-- complete_event confiava na identidade informada por quem chama.
--
-- 20260822015000 trocou auth.uid() por p_caller_user_id e liberou a função a
-- authenticated. A checagem passou a comparar o organizador com um valor que o
-- próprio chamador escolhe: qualquer conta autenticada encerrava o evento de
-- outra pessoa passando o id do organizador.
--
-- A assinatura fica igual (o app já passa o id da sessão), mas o parâmetro só é
-- aceito quando é a própria sessão, e o organizador é conferido contra
-- auth.uid().

create or replace function public.complete_event(
  p_event_id uuid,
  p_caller_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
begin
  if v_caller is null or p_caller_user_id is distinct from v_caller then
    raise exception 'only the event organizer can complete the event';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = v_caller
  ) then
    raise exception 'only the event organizer can complete the event';
  end if;

  update public.events
  set status = 'completed', updated_at = now()
  where id = p_event_id;
end;
$$;
