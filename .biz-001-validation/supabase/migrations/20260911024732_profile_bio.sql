-- Bio do perfil (prancha 51) — ADR-20260909-perfil-bio, decisões D1–D4.
--
-- D1 — onde mora: coluna `bio text` em `public.profiles`, anulável, teto de
-- 300 caracteres. É o número que o contador 146/300 da prancha mostra; o
-- limite da tela e o do banco são o mesmo número.
-- D2 — quem lê: a bio segue a visibilidade do perfil. Ela NÃO ganha controle
-- "Exibir no perfil" próprio: quem pode ler a LINHA passa a ler a bio. A
-- fronteira já existe e é a policy `profiles_select_visible_in_locality`
-- (visibilidade 'locality_members' + mesma cidade). Não há policy nova porque
-- a bio não tem escopo próprio — a policy que a lê é a da linha, e ela é
-- exercitada nos dois sentidos pelo pgTAP desta entrega.
-- D3 — como some: esvaziar grava NULL, e apagar apaga. Diferente do D3 do
-- ADR-20260908 (afiliação), onde desligar preserva a linha para religar: não
-- há o que religar numa bio.
-- D4 — superfície de texto livre: limite de tamanho E varredura de conteúdo
-- proibido. A expressão é a MESMA da migration 20260802001300, que já guarda
-- `posts.content` e `comments.content`; a bio não pode virar depósito de
-- endereço, telefone, patente, posto ou dado de terceiro.

alter table public.profiles
  add column bio text;

alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 300);

alter table public.profiles
  add constraint profiles_bio_no_forbidden_terms
  check (
    bio is null
    or bio !~* '\m(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|OM|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|CEP|CPF)\M'
  );

comment on column public.profiles.bio is
  'Apresentação curta do perfil (ADR-20260909-perfil-bio). Máx. 300 caracteres; segue a visibilidade da linha; esvaziar grava NULL.';

-- Leitura da bio. `security invoker` é deliberado: a função roda como o
-- chamador, então a RLS de `profiles` decide o que volta — dono sempre lê a
-- própria; terceiro lê só quando compartilha a cidade E a visibilidade é
-- 'locality_members'. Para quem não pode ver a linha, a função devolve NULL,
-- que é exatamente o que "não existe para mim" significa. Nada de
-- `security definer` aqui: seria transformar uma RPC em bypass de RLS.
create function public.get_profile_bio(p_user_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select p.bio
  from public.profiles p
  where p.user_id = p_user_id;
$$;

revoke all on function public.get_profile_bio(uuid) from public;
revoke all on function public.get_profile_bio(uuid) from anon;
grant execute on function public.get_profile_bio(uuid) to authenticated;

-- Escrita da própria bio. `security invoker` + `auth.uid()` fazem a policy
-- `profiles_update_self` governar a operação; não há como escrever a bio de
-- outra pessoa. Texto vazio ou só espaços grava NULL (D3): apagar apaga. Se
-- nenhuma linha for atingida, a função levanta erro em vez de devolver
-- sucesso silencioso — sessão sem perfil não pode parecer "salvo".
create function public.set_profile_bio(p_bio text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
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

revoke all on function public.set_profile_bio(text) from public;
revoke all on function public.set_profile_bio(text) from anon;
grant execute on function public.set_profile_bio(text) to authenticated;
