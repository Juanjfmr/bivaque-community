-- 042: novo valor admission_rejected em notification_type (H-Task 6)
--
-- A rejeicao definitiva de uma admissao (reject_pending_user, migration 041)
-- notifica a pessoa. O enum notification_type ja carrega report_resolved,
-- group_admission, recommendation_reply — todos os caminhos pelos quais
-- uma acao de operador chega ao destinatario. admission_rejected entra no
-- mesmo grupo.
--
-- Regra do projeto: adicionar valor de enum em migration separada da que
-- usa. Esta migration so adiciona o valor.

alter type public.notification_type add value if not exists 'admission_rejected';
