-- Leitura do convite de prestador pelo PRÓPRIO token.
--
-- A prancha 79 (painel 2) desenha o nome da comunidade que indicou e o link
-- de volta para ela. O token é o único segredo do convite e já dá o direito de
-- aceitá-lo, então quem o tem pode saber para onde foi convidado: o que não
-- pode sair daqui é o digest do e-mail convidado, que é dado pessoal derivado.
--
-- Devolve zero linhas para token ausente, malformado ou desconhecido — sem
-- distinguir os casos, para não virar oráculo de existência. Convite expirado,
-- revogado ou já aceito devolve a linha com o status, porque o portador
-- legítimo precisa entender por que não consegue entrar. `expired` é derivado
-- de `expires_at`, como faz `accept_provider_invitation` (P0004) — a coluna
-- sozinha ainda diz `pending`.
create function public.read_provider_invitation(p_token text)
returns table (
  community_id uuid,
  community_name text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
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
$$;

-- Sem sessão: quem abre o link do convite ainda não tem conta.
revoke all on function public.read_provider_invitation(text) from public;
grant execute on function public.read_provider_invitation(text) to anon, authenticated;
