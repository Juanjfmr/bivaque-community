-- PORT-005, segunda correção do achado P2 — o familiar admitido não é um
-- membro sem verificação: é um membro admitido por outra via.
--
-- O convite familiar é a única porta de entrada sem CPF (D16): o aceite grava
-- `private.family_account_links` e o vínculo, e NÃO grava linha em
-- `private.verification_outcomes`. Uma guarda que exija `verified` da própria
-- pessoa recusa exatamente quem o produto admitiu.
--
-- Por que uma função nova, e não uma leitura no cliente de serviço:
--   * `family_account_links` vive no schema `private`, que o Data API nunca
--     expõe (`supabase/config.toml` lista só `public` e `graphql_public`). Um
--     `.from("family_account_links")` do cliente de serviço responde erro de
--     schema, não a linha — e ler esse erro como "não é familiar" é o mesmo
--     defeito silencioso que a leitura da cidade de destino teve nesta frente
--     (a lista voltava vazia e a tela caía no bloco errado).
--   * A regra de "titular verificado" já existe e não foi duplicada:
--     `private.is_verified_holder` (20260802000700) é chamada aqui como está.
--   * O par public/private é o mesmo desenho de `public.is_verified_holder`
--     (20260806160942), que existe só para o service_role e delega o predicado
--     ao private: o wrapper público é a superfície do servidor, o predicado
--     mora embaixo.
--
-- O que esta função responde: "esta pessoa é dependente de um titular
-- verificado por um vínculo familiar ativo?" Ela NÃO responde por verificação
-- própria — essa continua sendo `read_verification_status`/`my_verification_status`,
-- e a guarda dos interesses continua checando as duas coisas.

create function public.has_verified_family_holder(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.family_account_links link
    where link.family_user_id = p_user_id
      and private.is_verified_holder(link.holder_user_id)
  );
$$;

revoke all on function public.has_verified_family_holder(uuid) from public;
revoke all on function public.has_verified_family_holder(uuid) from anon;
revoke all on function public.has_verified_family_holder(uuid) from authenticated;

grant execute on function public.has_verified_family_holder(uuid) to service_role;
