-- RECON-052: o convite de evento passa a ter tipo proprio em notification_type.
--
-- O outbox ja carrega `event_invite` como tipo de e-mail (adapters.ts, RECON-037),
-- mas o enum `public.notification_type` nao tinha o valor: a notificacao in-app do
-- convite nao existia. Estas duas migrations dao o valor e o produtor.
--
-- Regra do projeto (precedente em 20260820052738): valor de enum em migration
-- separada da que o usa. `ALTER TYPE ... ADD VALUE` nao pode ser usado na mesma
-- transacao em que o valor foi criado, e cada arquivo de migration roda numa
-- transacao. Por isso este arquivo SO adiciona o valor; o gatilho que o usa esta
-- em 20260924090100_event_invite_notification.sql.
--
-- O timestamp deste arquivo e posterior ao ultimo de main (20260923200000) de
-- proposito: o relogio da maquina no momento da criacao (2026-09-23 19:10 UTC)
-- geraria um prefixo anterior a ele, fora de ordem cronologica.

alter type public.notification_type add value if not exists 'event_invite';