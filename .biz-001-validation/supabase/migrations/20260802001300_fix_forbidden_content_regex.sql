-- 013: fix forbidden-content CHECK regexes in posts/comments
-- The original 009 regex combined \m...\M with inner \b word boundaries.
-- In PostgreSQL ARE this combination fails to match short all-caps tokens
-- such as "OM", "CPF", "CEP", leaving prohibited content persistable.
-- \m and \M already delimit whole words; the inner \b must not be used.
-- No data or policy change; constraints are recreated with identical
-- names so grants and triggers are unaffected.

alter table public.posts drop constraint post_no_forbidden_terms;
alter table public.comments drop constraint comment_no_forbidden_terms;

alter table public.posts
  add constraint post_no_forbidden_terms
  check (
    content !~* '\m(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|OM|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|CEP|CPF)\M'
  );

alter table public.comments
  add constraint comment_no_forbidden_terms
  check (
    content !~* '\m(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|OM|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|CEP|CPF)\M'
  );
