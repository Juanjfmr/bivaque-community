-- FIGMA-002 — reposição de duas garantias do ADR-20261006 que a migration
-- 20261006162757 deixou decorativas. Append-only: a migration aplicada não se
-- edita e a história de `supabase_migrations` continua linear.
--
-- Defeito 1 — a trilha era legível pelo DONO do anúncio.
-- `listing_moderation_events_select_authorized` aceitava
-- `l.owner_user_id = auth.uid()`, entregando ao anunciante o operador, o
-- report_id e a nota de cada decisão. O ADR pede o contrário: "RLS forçada
-- permite leitura somente à operação autorizada; o dono recebe o estado/aviso
-- do anúncio, sem identidade do denunciante". O estado já chega ao dono pela
-- própria linha de `public.listings` (`moderation_hidden`, legível no ramo
-- `owner_user_id` de `listings_select_audience`), que é o que a tela de edição
-- usa para o aviso — a trilha inteira não é o estado do anúncio, é o diário da
-- operação.
--
-- Defeito 2 — a escrita da marca aceitava UPDATE direto do próprio operador.
-- O guard antigo exigia só `private.is_operator()`. Um operador que também é o
-- DONO do anúncio passava: `update listings set moderation_hidden = ...`
-- direto pelo PostgREST mudava o estado SEM evento, SEM atomicidade com a
-- denúncia e sem passar pela verificação in-transação do papel. O ADR exige o
-- oposto: "caminho servidor interno de RPC autorizado cuja identidade e papel são
-- verificados na transação", e "nenhum argumento de identidade do operador".
--
-- A barreira agora é o PAPEL em execução (`current_user`), não uma GUC: nenhum
-- papel de Data API (anon, authenticated, service_role) escreve a marca, e o
-- único caminho que passa é `public.moderate_listing` — SECURITY DEFINER, cujo
-- ator vem de `auth.uid()` e cujo papel é conferido por `private.is_operator()`
-- dentro da transação. Um GUC seria spoofável pelo cliente; `current_user` não
-- é, porque vem do JWT da requisição, não de um valor que o cliente escolhe.
-- Note que o service_role também fica de fora: o RPC tem EXECUTE revogado para
-- ele, então ninguém contorna a regra pelo cliente privilegiado.
--
-- Defeito 3 — o guard de INSERT só rejeitava `moderation_hidden = true`.
-- Bastava `moderation_hidden_at`/`moderation_hidden_by` à mão, com a marca
-- falsa, para fabricar uma ocultação que nunca passou por decisão de operador.
-- INSERT agora recusa QUALQUER metadado de moderação — e continua aceitando o
-- rascunho legítimo, que não escreve nenhum desses campos.

-- ── 1. Trilha append-only: leitura só da operação autorizada ─────────────────

drop policy if exists listing_moderation_events_select_authorized on public.listing_moderation_events;

create policy listing_moderation_events_select_operator
on public.listing_moderation_events
for select
to authenticated
using (private.is_operator());

-- Sem-branch para o dono, de propósito: o conjunto de linhas devolvido é a
-- diferença entre "a operação pode auditar" e "o anunciante pode auditar". As
-- negativas do pgTAP travam as duas.

-- ── 2. Escrita da marca: só o mecanismo servidor interno ─────────────────────

create or replace function private.listings_moderation_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Nenhum metadado de moderação entra na criação. Um anúncio nasce rascunho
    -- ou ativo com a marca zerada; a ocultação só existe depois de uma decisão
    -- de operador registrada em `listing_moderation_events`.
    if NEW.moderation_hidden
       or NEW.moderation_hidden_at is not null
       or NEW.moderation_hidden_by is not null then
      raise exception 'listing moderation metadata is set only by moderation'
        using errcode = '42501';
    end if;
    return NEW;
  end if;

  if NEW.moderation_hidden is distinct from OLD.moderation_hidden
     or NEW.moderation_hidden_at is distinct from OLD.moderation_hidden_at
     or NEW.moderation_hidden_by is distinct from OLD.moderation_hidden_by then
    -- current_user é o papel que executa a instrução: anon/authenticated/
    -- service_role vêm do JWT da requisição e não podem se declarar outro.
    -- Dentro de public.moderate_listing (SECURITY DEFINER) o papel em execução
    -- é o dono da função, e é lá dentro que o ator e o papel do operador já
    -- foram conferidos. Fora dela, não há caminho.
    if current_user in ('anon', 'authenticated', 'service_role') then
      raise exception 'listing moderation flag is set only by the moderation RPC'
        using errcode = '42501';
    end if;
  end if;

  return NEW;
end;
$$;

revoke all on function private.listings_moderation_guard() from public, anon, authenticated;