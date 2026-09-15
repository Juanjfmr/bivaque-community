-- O rótulo do convite familiar não cabe no próprio CHECK quando o domínio tem
-- mais de um ponto.
--
-- Medido em runtime em 15/09/2026: criar convite para
-- 'familiar@bivaque.example.invalid' falha com
-- `violates check constraint "family_invitations_invitee_email_hint"` — a
-- função guardava TODOS os rótulos depois do primeiro ponto
-- ('bi***.example.invalid') e o CHECK exige um único ponto seguido do TLD.
-- O mesmo valia para qualquer domínio brasileiro de dois níveis
-- ('@exemplo.com.br'), ou seja: o caminho de convite quebrava para e-mails
-- reais.
--
-- A correção usa o ÚLTIMO ponto: o rótulo mostra no máximo dois caracteres do
-- domínio e o TLD, que é o que o CHECK sempre exigiu.
create or replace function private.family_invite_email_hint(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
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

revoke all on function private.family_invite_email_hint(text) from public;
revoke all on function private.family_invite_email_hint(text) from anon;
revoke all on function private.family_invite_email_hint(text) from authenticated;
