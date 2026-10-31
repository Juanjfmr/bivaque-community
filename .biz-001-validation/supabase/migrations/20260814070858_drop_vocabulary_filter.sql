-- D21 (BIVAQUE.md): remove the vocabulary filter from the database. The CHECK
-- constraints rejected words the community actually uses ("patente", "OM",
-- "CPF", "plano", "telefone"...) as Postgres constraint violations, with no
-- product message. Abuse is now handled by reporting and moderation.

alter table public.posts drop constraint if exists post_no_forbidden_terms;
alter table public.comments drop constraint if exists comment_no_forbidden_terms;

alter table public.recommendation_requests drop constraint if exists recommendation_no_commercial_title;
alter table public.recommendation_requests drop constraint if exists recommendation_no_commercial_body;
alter table public.recommendation_replies drop constraint if exists recommendation_reply_no_commercial;
