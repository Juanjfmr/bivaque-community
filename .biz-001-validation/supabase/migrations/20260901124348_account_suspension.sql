-- ADR-20260901-account-suspension (aprovado em 2026-09-01, commit 7532aea).
--
-- Idempotente: aplica somente o que ainda nao existe, e recria as
-- policies de INSERT com a restricao AND NOT is_account_suspended().
--
-- Comportamento esperado em re-run:
--   - coluna / indice / funcao: NOTICES, no-op
--   - policies: DROP IF EXISTS + CREATE

-- 1) Coluna + indice (ja podem existir do apply parcial)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_suspended_true_idx
  ON public.profiles (user_id)
  WHERE is_suspended = true;

-- 2) Helper (pode ja existir)
CREATE OR REPLACE FUNCTION public.is_account_suspended(p_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  -- Padrao canonico do repo para SECURITY DEFINER: search_path vazio, e todo
  -- objeto qualificado no corpo. `public, pg_temp` deixa pg_temp resolvivel e
  -- e superficie desnecessaria numa funcao que le RLS por baixo.
  SET search_path = ''
AS $$
  -- So o proprio dono recebe o status real. Restringir o EXECUTE a
  -- `authenticated` fecha o anonimo, mas nao o membro: sem esta guarda,
  -- qualquer conta autenticada chama /rpc/is_account_suspended com o uuid de
  -- um terceiro (que e publico no perfil) e enumera quem esta suspenso --
  -- exatamente o que o ADR-20260901 proibe em "Exposicao ao membro"
  -- (§4.3 anti-enumeracao: outro membro nao pode saber se um terceiro esta
  -- suspenso). Para terceiros a funcao responde `false`, nunca a verdade.
  --
  -- O uso em RLS e preservado: as policies chamam
  -- `is_account_suspended(auth.uid())`, entao p_user_id = auth.uid() e o veto
  -- continua valendo para o proprio autor.
  SELECT p_user_id = (SELECT auth.uid())
     AND COALESCE(
       (SELECT is_suspended FROM public.profiles WHERE user_id = p_user_id),
       false
     );
$$;

-- Os grants rodam INCONDICIONALMENTE, e sao idempotentes.
--
-- Antes viviam dentro de um `DO ... IF NOT EXISTS (proname =
-- 'is_account_suspended')`, logo depois do CREATE OR REPLACE acima. A funcao
-- sempre existe nesse ponto, entao a condicao era sempre falsa e o bloco nunca
-- executava: a funcao ficava com o grant default do CREATE FUNCTION, que e
-- EXECUTE para PUBLIC. Como ela e SECURITY DEFINER e le profiles.is_suspended
-- por baixo da RLS, `anon` conseguia enumerar o status de suspensao de
-- qualquer conta sem autenticar.
REVOKE ALL ON FUNCTION public.is_account_suspended(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_account_suspended(uuid) TO authenticated;

-- 3) Policies de INSERT vetam conta suspensa. Recria com a restricao.

-- posts.insert
DROP POLICY IF EXISTS posts_insert_locality_member ON public.posts;
CREATE POLICY posts_insert_locality_member ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    private.can_access_post_scope(locality_id, community_id, group_id)
    AND NOT public.is_account_suspended(auth.uid())
  );

-- comments.insert
DROP POLICY IF EXISTS comments_insert_member ON public.comments;
CREATE POLICY comments_insert_member ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid() AS uid)
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = comments.post_id
        AND private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
    )
    AND NOT public.is_account_suspended(auth.uid())
  );

-- post_reactions.insert (tabela correta e post_reactions, nao reactions)
DROP POLICY IF EXISTS post_reactions_insert_locality_member ON public.post_reactions;
CREATE POLICY post_reactions_insert_locality_member ON public.post_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid() AS uid)
    AND private.can_access_post(post_id)
    AND NOT public.is_account_suspended(auth.uid())
  );

DROP POLICY IF EXISTS post_reactions_insert_self ON public.post_reactions;
CREATE POLICY post_reactions_insert_self ON public.post_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid() AS uid)
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_reactions.post_id
        AND private.can_write_post_to(p.locality_id, p.community_id, p.group_id)
    )
    AND NOT public.is_account_suspended(auth.uid())
  );

-- reports.insert
DROP POLICY IF EXISTS reports_insert_authenticated ON public.reports;
CREATE POLICY reports_insert_authenticated ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_user_id = (SELECT auth.uid() AS uid)
    AND (
      EXISTS (
        SELECT 1 FROM locality_memberships
        WHERE locality_memberships.user_id = (SELECT auth.uid() AS uid)
      )
      OR (private.is_provider_account((SELECT auth.uid() AS uid)) AND target_type = 'message'::report_target_type)
    )
    AND NOT public.is_account_suspended(auth.uid())
  );
