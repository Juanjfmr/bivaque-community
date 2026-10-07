-- FIGMA-002 — `listing` entra como alvo de denúncia.
--
-- ADR-20261006-anuncios-salvos-e-moderacao: "Adicionar listing ao enum em
-- migration separada quando necessário para uso seguro do enum, e depois
-- atualizar conjuntamente validação do alvo, RLS/guard, bloqueio de
-- autorrelato, listagem, rótulos, resolução e consumidores web."
--
-- Esta migration SÓ adiciona o valor. A mesma armadilha documentada em
-- 20260821000031_report_targets_enum.sql e 20260809184316 vale aqui:
-- `alter type ... add value` não pode ser usado na transação que o consome, e
-- a CLI roda um arquivo por transação. Toda a integração (policy de insert,
-- private.reports_block_self, list_open_reports, resolve_listing_report e os
-- consumidores web) entra em 20261006162757_listing_saves_and_moderation.sql.
--
-- O valor não é substituto de post_saves/recommendation_saves nem do alvo
-- `post`: anúncios são alvo próprio porque a ocultação é decisão de moderação
-- separada do status do anunciante.

alter type public.report_target_type add value if not exists 'listing';