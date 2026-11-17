-- SEC-014 / A1 (MEDIUM) da auditoria independente de 16/11 sobre 2bb231d8:
-- a leitura por alvo da afiliação sai do alcance de quem não é o dono.
--
-- public.profile_affiliations_for é SECURITY DEFINER e executa como o dono, então
-- quem chama não passa por RLS: enquanto houver grant para authenticated, qualquer
-- membro da mesma cidade lê Força Armada e OM que o titular marcou "Exibir" no
-- período do toggle web (09/09 a 16/11). A porta do app grava is_visible = false
-- sempre, mas linha legada com is_visible = true continua no banco, e é exatamente
-- a exibição a terceiros que o BLOCK-AFFILIATION tira do lançamento.
--
-- Decisão do coordenador de 16/11, por delegação: revogar até o dono resolver a
-- governança da exposição. Revogar é reversível e não apaga dado — nenhuma linha
-- de profile_affiliations é tocada aqui, nem is_visible.
--
-- Reabrir é decisão do BLOCK-AFFILIATION (cartão no quadro), que é onde a
-- governança da exposição mora: um `grant execute on function
-- public.profile_affiliations_for(uuid) to authenticated` nesta função. A função
-- fica de pé, com o corpo e os vetos intactos, para o dia em que essa decisão
-- vier; o que morre hoje é a porta.

revoke all on function public.profile_affiliations_for(uuid) from public;
revoke all on function public.profile_affiliations_for(uuid) from anon;
revoke all on function public.profile_affiliations_for(uuid) from authenticated;

comment on function public.profile_affiliations_for(uuid) is
  'Leitura por alvo das declaracoes VISIVEIS (Forca Armada e OM). SEM PORTA no lancamento: execute revogado de public/anon/authenticated por SEC-014 (auditoria de 16/11, A1), porque exibir Forca/OM a terceiros esta fora do escopo (BLOCK-AFFILIATION). O corpo e os vetos seguem validos e provados no pgTAP; reabrir e decisao do BLOCK-AFFILIATION, com grant execute to authenticated.';