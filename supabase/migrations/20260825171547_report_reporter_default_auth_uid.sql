-- O insert do cliente omite reporter_user_id e a coluna nao tem default:
-- todo insert de denuncia pela interface quebrava com violacao de RLS
-- (reporter_user_id = auth.uid() nunca bate com NULL). Nenhum membro
-- conseguiu denunciar pela UI; o painel do operador so via denuncias
-- inseridas com privilegio pelo seed, o que mascarou o buraco.
--
-- Ficou fora do lote de defaults de 20260818022411 porque a coluna se chama
-- reporter_user_id, nao user_id. Mesmo padrao daquele lote:

alter table public.reports
  alter column reporter_user_id set default auth.uid();
