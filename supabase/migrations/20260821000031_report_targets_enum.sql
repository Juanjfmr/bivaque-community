-- 031: os alvos de denuncia que faltavam (H-Task 1)
--
-- `report_target_type` nasceu com post, comment, group e message
-- (20260802001600). A onda F transformou a resposta de indicacao no ciclo
-- central do produto — o §6.3 chama de ciclo semanal — e ela nao e denunciavel.
-- Pedido e resposta entram como alvos.
--
-- Esta migration NAO faz mais nada. `alter type ... add value` nao pode ser
-- usado na mesma transacao que o adiciona, e a Supabase CLI roda um arquivo
-- por transacao: o valor precisa existir num arquivo e ser usado no seguinte.
-- O 20260809184316_notify_report_resolved.sql documenta a mesma armadilha.
--
-- `provider_profile` NAO entra aqui. Quem cria a tabela cria o alvo: a Task 3
-- da onda G (vitrine) adiciona o valor junto de `provider_profiles`, na mesma
-- migration, conforme o ADR-20260820-conta-de-prestador.

alter type public.report_target_type add value if not exists 'recommendation_request';
alter type public.report_target_type add value if not exists 'recommendation_reply';
